import { createHash } from 'node:crypto';

import pool from '../util/db.js';
import {
  buildExistingPostDiff,
  revertExistingPostChange
} from '../services/contentAgent/existingPostDiffService.js';
import {
  classifyLearningIssueLocally,
  getLearningCategory,
  sanitizeLearningText
} from '../services/contentAgent/contentLearningTaxonomy.js';
import { createContentAuditRepository } from './contentAuditRepository.js';
import { createContentLearningRepository } from './contentLearningRepository.js';
import { trustedValidationContext } from './contentRevisionRepository.js';

const HASH = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SNAPSHOT_BYTES = 1_000_000;
const MAX_REPORT_BYTES = 512_000;
const MAX_FEEDBACK_DETAILS_BYTES = 64_000;
const MAX_OUTCOME_JSON_BYTES = 256_000;
const MAX_PG_INT32 = 2_147_483_647;
const MAX_MANUAL_FEEDBACK_ITEMS = 24;
const SAFE_CHANGE_KINDS = new Set(['field', 'faq', 'html']);
const SAFE_CHANGE_FIELDS = new Set([
  'title', 'shortDescription', 'metaTitle', 'metaDescription', 'ogTitle',
  'ogDescription', 'imageAlt', 'faqJson', 'contentHtml'
]);
const EDITABLE_FIELDS = Object.freeze([
  'title', 'excerpt', 'content', 'meta_title', 'meta_description',
  'og_title', 'og_description', 'faq_json', 'image_url', 'image_alt'
]);
const POST_COLUMNS = `
  p.id, p.title, p.slug, p.excerpt, p.content, p.content_format,
  p.meta_title, p.meta_description, p.og_title, p.og_description,
  p.faq_json, p.image_url, p.image_alt, p.published, p.workflow_status,
  p.scheduled_at, p.published_at, p.created_at, p.updated_at
`;
const TIMESTAMP_FIELDS = Object.freeze([
  'scheduled_at', 'published_at', 'created_at', 'updated_at'
]);

function repositoryError(code, message) {
  return Object.assign(new Error(message), { code });
}

function validationError(message) {
  return repositoryError('CONTENT_ACTION_VALIDATION_FAILED', message);
}

function conflict(message = 'Die Optimierungsrevision wurde zwischenzeitlich verändert.') {
  return repositoryError('CONTENT_REVISION_CONFLICT', message);
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw validationError(`${label} ist ungültig.`);
  }
  return normalized;
}

function postgresInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > MAX_PG_INT32) {
    throw validationError(`${label} ist ungültig.`);
  }
  return normalized;
}

function normalizeAdmin(value) {
  const id = postgresInteger(value?.id, 'Die Administrator-ID');
  const username = typeof value?.username === 'string' ? value.username.trim() : '';
  if (!username || username.length > 180) {
    throw validationError('Der Administratorname ist ungültig.');
  }
  return { id, username };
}

function normalizeHash(value, label = 'Der Livehash') {
  const normalized = typeof value === 'string' ? value : '';
  if (!HASH.test(normalized)) throw validationError(`${label} ist ungültig.`);
  return normalized;
}

function plainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(`${label} muss ein Objekt sein.`);
  }
  return value;
}

function jsonString(value, label, maxBytes) {
  let json;
  try {
    json = JSON.stringify(value);
  } catch {
    throw validationError(`${label} ist nicht als JSON speicherbar.`);
  }
  if (typeof json !== 'string' || Buffer.byteLength(json, 'utf8') > maxBytes) {
    throw validationError(`${label} überschreitet die zulässige Größe.`);
  }
  return json;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizedTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toISOString();
}

function canonicalLiveState(post) {
  return {
    slug: String(post?.slug || ''),
    content_format: String(post?.content_format || 'legacy_ejs'),
    updated_at: normalizedTimestamp(post?.updated_at),
    fields: Object.fromEntries(EDITABLE_FIELDS.map((key) => [
      key,
      post?.[key] ?? (key === 'faq_json' ? [] : '')
    ]))
  };
}

function liveHashForPost(post) {
  return createHash('sha256').update(stableJson(canonicalLiveState(post))).digest('hex');
}

function normalizePostRow(row) {
  if (!row) return null;
  const normalized = { ...row };
  for (const field of TIMESTAMP_FIELDS) {
    if (normalized[field] != null) normalized[field] = normalizedTimestamp(normalized[field]);
  }
  return normalized;
}

function sameBase(left, right) {
  return left?.slug === right?.slug
    && left?.content_format === right?.content_format
    && normalizedTimestamp(left?.updated_at) === normalizedTimestamp(right?.updated_at)
    && left?.live_hash === right?.live_hash;
}

function assertLiveBase(post, base, expectedHash) {
  const current = canonicalLiveState(post);
  if (post?.published !== true
      || base?.slug !== current.slug
      || base?.content_format !== current.content_format
      || normalizedTimestamp(base?.updated_at) !== current.updated_at
      || base?.live_hash !== expectedHash
      || liveHashForPost(post) !== expectedHash) {
    throw repositoryError(
      'CONTENT_REVISION_STALE',
      'Der Liveartikel wurde seit Beginn der Optimierung verändert.'
    );
  }
}

function normalizeRevisionPayload(input = {}) {
  const baseLiveHash = normalizeHash(input.baseLiveHash);
  const snapshot = plainObject(input.snapshot, 'Der Revisionssnapshot');
  const report = plainObject(input.report, 'Der Optimierungsbericht');
  plainObject(snapshot.base, 'Die Basis des Revisionssnapshots');
  plainObject(snapshot.fields, 'Die Felder des Revisionssnapshots');
  if (snapshot.base.live_hash !== baseLiveHash || report.baseLiveHash !== baseLiveHash) {
    throw validationError('Livehash, Snapshot und Optimierungsbericht sind widersprüchlich.');
  }
  return {
    postId: positiveInteger(input.postId, 'Die Artikel-ID'),
    auditId: positiveInteger(input.auditId, 'Die Audit-ID'),
    jobId: positiveInteger(input.jobId, 'Die Auftrags-ID'),
    baseLiveHash,
    snapshot,
    report,
    snapshotJson: jsonString(snapshot, 'Der Revisionssnapshot', MAX_SNAPSHOT_BYTES),
    reportJson: jsonString(report, 'Der Optimierungsbericht', MAX_REPORT_BYTES),
    admin: normalizeAdmin(input.admin)
  };
}

function normalizeCalendarDate(value, label, { nullable = true } = {}) {
  if (value == null && nullable) return null;
  if (typeof value !== 'string' || !DATE.test(value)) {
    throw validationError(`${label} ist ungültig.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw validationError(`${label} ist ungültig.`);
  }
  return value;
}

function normalizeTimestampInput(value, label) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw validationError(`${label} ist ungültig.`);
  return parsed.toISOString();
}

function normalizeTimezone(value) {
  const timezone = typeof value === 'string' && value.trim() ? value.trim() : 'Europe/Berlin';
  try {
    new Intl.DateTimeFormat('de-DE', { timeZone: timezone }).format(new Date(0));
  } catch {
    throw validationError('Die Zeitzone ist ungültig.');
  }
  if (timezone.length > 80) throw validationError('Die Zeitzone ist ungültig.');
  return timezone;
}

async function rollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Der ursprüngliche Fehler bleibt maßgeblich.
  }
}

function requireTransactionClient(client) {
  if (!client || typeof client.query !== 'function') {
    throw validationError('Eine aktive Freigabetransaktion wird benötigt.');
  }
  return client;
}

function normalizeFeedbackDetails(value = {}) {
  const details = plainObject(value, 'Die Feedbackdetails');
  return jsonString(details, 'Die Feedbackdetails', MAX_FEEDBACK_DETAILS_BYTES);
}

function safeChangeKind(change) {
  return SAFE_CHANGE_KINDS.has(change?.kind) ? change.kind : 'field';
}

function safeChangeField(change) {
  return SAFE_CHANGE_FIELDS.has(change?.field) ? change.field : 'unknown';
}

function changeLearningClassification(change) {
  const reasons = Array.isArray(change?.reasons) ? change.reasons : [];
  const explicitCategory = reasons
    .flatMap((reason) => Array.isArray(reason?.auditCodes) ? reason.auditCodes : [])
    .map((code) => sanitizeLearningText(code, 80))
    .find((code) => getLearningCategory(code));
  const reason = sanitizeLearningText(
    reasons.map((item) => item?.reason).filter(Boolean).join(' '),
    500
  ) || 'Die KI-Änderung wurde durch eine administrative Entscheidung korrigiert.';
  if (explicitCategory) {
    return { categoryKey: explicitCategory, confidence: 1, source: 'local', reason };
  }
  const local = classifyLearningIssueLocally({
    code: reasons.flatMap((item) => item?.auditCodes || []).join(' '),
    reason
  });
  return local
    ? { ...local, reason }
    : { categoryKey: 'unclassified', confidence: null, source: 'unclassified', reason };
}

function feedbackDetails(change, event, revisionVersion) {
  return {
    event,
    kind: safeChangeKind(change),
    field: safeChangeField(change),
    revisionVersion
  };
}

function learningObservation(change, event, revisionId) {
  const classification = changeLearningClassification(change);
  const instructions = {
    reverted: 'Prüfe künftig, ob diese Änderung fachlich nötig ist, bevor du sie vorschlägst.',
    manual_edit: 'Prüfe künftig die fachliche und sprachliche Passung genauer, bevor du diese Änderung vorschlägst.'
  };
  return {
    categoryKey: classification.categoryKey,
    fingerprint: normalizeHash(change?.id, 'Die Änderungs-ID'),
    reason: classification.reason,
    instruction: instructions[event],
    section: safeChangeField(change),
    anchor: `revision-${revisionId}-change-${change.id.slice(0, 12)}`,
    classificationSource: classification.source,
    confidence: classification.confidence
  };
}

function snapshotFieldsForDiff(snapshot) {
  return {
    ...structuredClone(snapshot?.fields || {}),
    contentFormat: snapshot?.base?.content_format
  };
}

function matchingActiveOptimizationChange(changes, manualChange) {
  return changes.find((change) => (
    change?.status === 'active'
      && change?.kind === manualChange.kind
      && change?.field === manualChange.field
      && change?.afterFingerprint === manualChange.beforeFingerprint
  )) || null;
}

function acceptedFeedbackSummary(report, revisionVersion) {
  const changes = Array.isArray(report?.changes) ? report.changes.slice(0, 2_000) : [];
  return {
    event: 'accepted',
    revisionVersion,
    activeChanges: changes.filter(({ status }) => status === 'active').length,
    revertedChanges: changes.filter(({ status }) => status === 'reverted').length,
    manualChanges: changes.filter(({ status }) => status === 'manual_edit').length
  };
}

export function createContentExistingPostOptimizationRepository(
  db = pool,
  { learningRepository = createContentLearningRepository(db) } = {}
) {
  const auditRepository = createContentAuditRepository(db);

  return {
    async getPublishedPostSnapshot(postId) {
      const normalizedPostId = positiveInteger(postId, 'Die Artikel-ID');
      const { rows } = await db.query(`
        SELECT ${POST_COLUMNS}
        FROM posts p
        WHERE p.id = $1::integer AND p.published = TRUE
        LIMIT 1
      `, [normalizedPostId]);
      return normalizePostRow(rows[0]);
    },

    async getTrustedContext(postId) {
      const normalizedPostId = positiveInteger(postId, 'Die Artikel-ID');
      const [slugs, links, metadata, rules] = await Promise.all([
        db.query(`
          SELECT p.slug FROM posts p
          WHERE p.id <> $1::integer
          ORDER BY p.id
          LIMIT 5000
        `, [normalizedPostId]),
        db.query(`
          SELECT url FROM (
            SELECT '/kontakt'::text AS url
            UNION SELECT '/pakete'
            UNION SELECT '/webdesign-berlin'
            UNION SELECT '/blog/' || slug FROM posts WHERE published = TRUE
            UNION SELECT '/ratgeber/' || slug FROM ratgeber WHERE published = TRUE
            UNION SELECT '/leistungen/' || slug FROM leistungen_pages WHERE is_published = TRUE
            UNION SELECT '/branchen/' || slug FROM industries
          ) trusted_urls
          ORDER BY url
          LIMIT 5000
        `),
        db.query(`
          SELECT post_id, primary_keyword, secondary_keywords, search_intent,
                 target_audience, region_focus, content_cluster, business_goal,
                 cta_type, internal_links_json, source_references_json,
                 quality_score, quality_report_json
          FROM content_post_metadata
          WHERE post_id = $1::integer
          LIMIT 1
        `, [normalizedPostId]),
        db.query(`
          SELECT r.id, r.category_key, r.current_version AS version,
                 v.rule_text, v.target_stages, v.rule_hash
          FROM content_learning_rules r
          JOIN content_learning_rule_versions v
            ON v.rule_id = r.id AND v.version = r.current_version
          WHERE r.status = 'active'
          ORDER BY r.id, r.current_version
          LIMIT 100
        `)
      ]);
      return {
        existingSlugs: slugs.rows.map(({ slug }) => slug).filter(Boolean),
        allowedInternalLinks: links.rows.map(({ url }) => url).filter(Boolean),
        metadata: metadata.rows[0] || null,
        activeLearningRules: rules.rows
      };
    },

    async createAuditIdempotent(input) {
      return auditRepository.createAuditIdempotent(input);
    },

    async createOptimizedRevision(input) {
      const normalized = normalizeRevisionPayload(input);
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const postResult = await client.query(`
          SELECT ${POST_COLUMNS}
          FROM posts p
          WHERE p.id = $1::integer AND p.published = TRUE
          FOR UPDATE OF p
        `, [normalized.postId]);
        const post = postResult.rows[0];
        if (!post) {
          throw repositoryError('CONTENT_POST_NOT_FOUND', 'Veröffentlichter Artikel nicht gefunden.');
        }
        assertLiveBase(post, normalized.snapshot.base, normalized.baseLiveHash);

        const draftResult = await client.query(`
          SELECT r.*
          FROM content_post_revisions r
          WHERE r.post_id = $1::integer AND r.status = 'draft'
          ORDER BY r.id
          FOR UPDATE OF r
        `, [normalized.postId]);
        const auditResult = await client.query(`
          SELECT a.*
          FROM content_post_audits a
          WHERE a.id = $1::bigint
            AND a.post_id = $2::integer
            AND a.job_id = $3::bigint
            AND a.status IN ('open', 'revision_created')
          FOR UPDATE OF a
        `, [normalized.auditId, normalized.postId, normalized.jobId]);
        if (!auditResult.rows[0]) {
          throw repositoryError(
            'CONTENT_AUDIT_NOT_FOUND',
            'Passender offener Auditbefund nicht gefunden.'
          );
        }

        const drafts = draftResult.rows;
        if (drafts.length > 0) {
          const existing = drafts.length === 1 ? drafts[0] : null;
          const safelyResumed = existing
            && Number(existing.optimization_job_id) === normalized.jobId
            && Number(existing.audit_id) === normalized.auditId
            && stableJson(existing.snapshot_json) === stableJson(normalized.snapshot)
            && stableJson(existing.optimization_report_json) === stableJson(normalized.report);
          if (!safelyResumed) {
            throw conflict('Für diesen Artikel besteht bereits eine aktive Draft-Revision.');
          }
          await client.query('COMMIT');
          return existing;
        }

        const revisionResult = await client.query(`
          INSERT INTO content_post_revisions (
            post_id, audit_id, snapshot_json, status, admin_id, admin_username,
            optimization_job_id, optimization_report_json
          ) VALUES (
            $1::integer, $2::bigint, $3::jsonb, 'draft', $4::integer,
            $5::varchar(255), $6::bigint, $7::jsonb
          )
          RETURNING *
        `, [
          normalized.postId,
          normalized.auditId,
          normalized.snapshotJson,
          normalized.admin.id,
          normalized.admin.username,
          normalized.jobId,
          normalized.reportJson
        ]);
        const revision = revisionResult.rows[0];
        if (!revision) throw conflict('Die Optimierungsrevision konnte nicht gespeichert werden.');
        const auditUpdate = await client.query(`
          UPDATE content_post_audits
          SET status = 'revision_created'
          WHERE id = $1::bigint
            AND post_id = $2::integer
            AND job_id = $3::bigint
            AND status IN ('open', 'revision_created')
          RETURNING id, status
        `, [normalized.auditId, normalized.postId, normalized.jobId]);
        if (!auditUpdate.rows[0]) throw conflict('Der Auditstatus konnte nicht sicher aktualisiert werden.');
        await client.query('COMMIT');
        return revision;
      } catch (error) {
        await rollback(client);
        if (error?.code === '23505') {
          throw conflict('Für diesen Artikel besteht bereits eine aktive Draft-Revision.');
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async getLatestOptimizationState(postId) {
      const normalizedPostId = positiveInteger(postId, 'Die Artikel-ID');
      const { rows } = await db.query(`
        SELECT j.id AS job_id, j.status AS job_status, j.attempts, j.max_attempts,
               j.created_at AS job_created_at, j.updated_at AS job_updated_at,
               run.id AS run_id, run.status AS run_status, run.current_stage,
               audit.id AS audit_id, audit.status AS audit_status, audit.score AS audit_score,
               revision.id AS revision_id, revision.status AS revision_status,
               revision.revision_version
        FROM content_jobs j
        LEFT JOIN LATERAL (
          SELECT r.id, r.status, r.current_stage
          FROM content_runs r
          WHERE r.job_id = j.id
          ORDER BY r.id DESC
          LIMIT 1
        ) run ON TRUE
        LEFT JOIN LATERAL (
          SELECT a.id, a.status, a.score
          FROM content_post_audits a
          WHERE a.job_id = j.id AND a.post_id = $1::integer
          ORDER BY a.created_at DESC, a.id DESC
          LIMIT 1
        ) audit ON TRUE
        LEFT JOIN LATERAL (
          SELECT r.id, r.status, r.revision_version
          FROM content_post_revisions r
          WHERE r.optimization_job_id = j.id AND r.post_id = $1::integer
          ORDER BY r.created_at DESC, r.id DESC
          LIMIT 1
        ) revision ON TRUE
        WHERE j.job_type = 'optimize_existing_post'
          AND (j.payload_json ->> 'post_id') = ($1::integer)::text
        ORDER BY j.created_at DESC, j.id DESC
        LIMIT 1
      `, [normalizedPostId]);
      return rows[0] || null;
    },

    async getRevisionComparison(revisionId) {
      const normalizedRevisionId = positiveInteger(revisionId, 'Die Revisions-ID');
      const { rows } = await db.query(`
        SELECT r.id, r.post_id, r.audit_id, r.optimization_job_id, r.status,
               r.revision_version, r.snapshot_json, r.optimization_report_json,
               r.admin_id, r.admin_username, r.created_at, r.updated_at, r.approved_at,
               p.title AS live_title, p.slug AS live_slug, p.excerpt AS live_excerpt,
               p.content AS live_content, p.content_format AS live_content_format,
               p.meta_title AS live_meta_title,
               p.meta_description AS live_meta_description,
               p.og_title AS live_og_title, p.og_description AS live_og_description,
               p.faq_json AS live_faq_json, p.image_url AS live_image_url,
               p.image_alt AS live_image_alt, p.published AS live_published,
               p.updated_at AS live_updated_at,
               a.audit_type, a.score AS audit_score, a.findings_json,
               a.recommended_actions_json, a.status AS audit_status,
               outcome.baseline_metrics_json, outcome.followup_metrics_json,
               outcome.feedback_json AS outcome_feedback_json,
               outcome.evaluation_status, outcome.followup_start_date,
               outcome.followup_end_date, outcome.evaluated_at
        FROM content_post_revisions r
        JOIN posts p ON p.id = r.post_id
        LEFT JOIN content_post_audits a ON a.id = r.audit_id
        LEFT JOIN content_revision_optimization_outcomes outcome
          ON outcome.revision_id = r.id
        WHERE r.id = $1::bigint AND r.optimization_job_id IS NOT NULL
        LIMIT 1
      `, [normalizedRevisionId]);
      return rows[0] || null;
    },

    async updateRevisionAfterRevert(input = {}) {
      const revisionId = postgresInteger(input.revisionId, 'Die Revisions-ID');
      const expectedVersion = postgresInteger(input.expectedVersion, 'Die erwartete Revisionsversion');
      const admin = normalizeAdmin(input.admin);
      const changeId = normalizeHash(input.changeId, 'Die Änderungs-ID');
      if (typeof input.validateSnapshot !== 'function') {
        throw validationError('Für die Rücknahme wird eine vollständige Snapshot-Prüfung benötigt.');
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const identity = await client.query(`
          SELECT r.post_id FROM content_post_revisions r WHERE r.id = $1::bigint
        `, [revisionId]);
        if (!identity.rows[0]) throw repositoryError('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
        const postResult = await client.query(`
          SELECT ${POST_COLUMNS}
          FROM posts p
          WHERE p.id = $1::integer AND p.published = TRUE
          FOR UPDATE OF p
        `, [identity.rows[0].post_id]);
        const post = postResult.rows[0];
        if (!post) throw conflict('Der Liveartikel ist nicht mehr veröffentlicht.');
        const revisionResult = await client.query(`
          SELECT r.* FROM content_post_revisions r
          WHERE r.id = $1::bigint
          FOR UPDATE OF r
        `, [revisionId]);
        const revision = revisionResult.rows[0];
        if (!revision || revision.status !== 'draft'
            || revision.optimization_job_id == null
            || Number(revision.revision_version) !== expectedVersion) {
          throw conflict();
        }
        assertLiveBase(post, revision.snapshot_json?.base, revision.snapshot_json?.base?.live_hash);
        if (revision.optimization_report_json?.baseLiveHash !== revision.snapshot_json?.base?.live_hash) {
          throw conflict('Die Ausgangsbasis der Revision wurde verändert.');
        }
        const auditResult = await client.query(`
          SELECT a.id
          FROM content_post_audits a
          WHERE a.id = $1::bigint
            AND a.post_id = $2::integer
            AND a.job_id = $3::bigint
            AND a.status = 'revision_created'
          FOR UPDATE OF a
        `, [revision.audit_id, revision.post_id, revision.optimization_job_id]);
        if (!auditResult.rows[0]) {
          throw conflict('Die Auditbindung der Revision ist nicht mehr gültig.');
        }
        const originalChange = revision.optimization_report_json?.changes?.find(
          (change) => change?.id === changeId
        );
        const reverted = revertExistingPostChange({
          snapshot: {
            snapshot_json: revision.snapshot_json,
            optimization_report_json: revision.optimization_report_json,
            revision_version: Number(revision.revision_version)
          },
          changeId,
          expectedVersion
        });
        const snapshot = plainObject(reverted.snapshot_json, 'Der Revisionssnapshot');
        const report = plainObject(reverted.optimization_report_json, 'Der Optimierungsbericht');
        if (!sameBase(revision.snapshot_json?.base, snapshot.base)
            || report.baseLiveHash !== revision.snapshot_json?.base?.live_hash
            || Number(reverted.revision_version) !== expectedVersion + 1) {
          throw conflict('Die Rücknahme hat die Revisionsbasis unerwartet verändert.');
        }
        await input.validateSnapshot(snapshot, {
          post,
          revision,
          report,
          validationContext: await trustedValidationContext(revision.post_id, client)
        });
        const snapshotJson = jsonString(snapshot, 'Der Revisionssnapshot', MAX_SNAPSHOT_BYTES);
        const reportJson = jsonString(report, 'Der Optimierungsbericht', MAX_REPORT_BYTES);
        const updateResult = await client.query(`
          UPDATE content_post_revisions
          SET snapshot_json = $2::jsonb,
              optimization_report_json = $3::jsonb,
              revision_version = revision_version + 1,
              admin_id = $5::integer,
              admin_username = $6::varchar(255),
              updated_at = NOW()
          WHERE id = $1::bigint
            AND status = 'draft'
            AND revision_version = $4::integer
            AND optimization_job_id IS NOT NULL
          RETURNING *
        `, [revisionId, snapshotJson, reportJson, expectedVersion, admin.id, admin.username]);
        const updated = updateResult.rows[0];
        if (!updated) throw conflict();
        const classification = changeLearningClassification(originalChange);
        const detailsJson = normalizeFeedbackDetails(
          feedbackDetails(originalChange, 'reverted', expectedVersion + 1)
        );
        await client.query(`
          INSERT INTO content_revision_optimization_feedback (
            revision_id, post_id, change_id, event_type, category_key,
            details_json, admin_id, admin_name
          ) VALUES (
            $1::bigint, $2::integer, $3::char(64), 'reverted',
            $4::varchar(80), $5::jsonb, $6::integer, $7::varchar(180)
          )
        `, [
          revisionId,
          revision.post_id,
          changeId,
          classification.categoryKey,
          detailsJson,
          admin.id,
          admin.username
        ]);
        await learningRepository.recordObservationsAndMaybeProposals({
          postId: revision.post_id,
          reviewVersion: expectedVersion + 1,
          observations: [learningObservation(originalChange, 'reverted', revisionId)]
        }, client);
        await client.query('COMMIT');
        return updated;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async updateRevisionAfterManualEdit(input = {}) {
      const revisionId = postgresInteger(input.revisionId, 'Die Revisions-ID');
      const expectedVersion = postgresInteger(input.expectedVersion, 'Die erwartete Revisionsversion');
      const admin = normalizeAdmin(input.admin);
      if (typeof input.buildValidatedUpdate !== 'function') {
        throw validationError('Für die manuelle Bearbeitung wird eine vollständige Snapshot-Prüfung benötigt.');
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const identity = await client.query(`
          SELECT r.post_id FROM content_post_revisions r WHERE r.id = $1::bigint
        `, [revisionId]);
        if (!identity.rows[0]) throw repositoryError('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
        const postResult = await client.query(`
          SELECT ${POST_COLUMNS}
          FROM posts p
          WHERE p.id = $1::integer AND p.published = TRUE
          FOR UPDATE OF p
        `, [identity.rows[0].post_id]);
        const post = postResult.rows[0];
        if (!post) throw conflict('Der Liveartikel ist nicht mehr veröffentlicht.');
        const revisionResult = await client.query(`
          SELECT r.* FROM content_post_revisions r
          WHERE r.id = $1::bigint
          FOR UPDATE OF r
        `, [revisionId]);
        const revision = revisionResult.rows[0];
        if (!revision || revision.status !== 'draft'
            || revision.optimization_job_id == null
            || Number(revision.revision_version) !== expectedVersion) {
          throw conflict();
        }
        assertLiveBase(post, revision.snapshot_json?.base, revision.snapshot_json?.base?.live_hash);
        if (revision.optimization_report_json?.baseLiveHash !== revision.snapshot_json?.base?.live_hash) {
          throw conflict('Die Ausgangsbasis der Revision wurde verändert.');
        }
        const auditResult = await client.query(`
          SELECT a.id
          FROM content_post_audits a
          WHERE a.id = $1::bigint
            AND a.post_id = $2::integer
            AND a.job_id = $3::bigint
            AND a.status = 'revision_created'
          FOR UPDATE OF a
        `, [revision.audit_id, revision.post_id, revision.optimization_job_id]);
        if (!auditResult.rows[0]) {
          throw conflict('Die Auditbindung der Revision ist nicht mehr gültig.');
        }

        const previousSnapshot = plainObject(
          structuredClone(revision.snapshot_json),
          'Der Revisionssnapshot'
        );
        const report = plainObject(
          structuredClone(revision.optimization_report_json),
          'Der Optimierungsbericht'
        );
        const nextSnapshot = plainObject(await input.buildValidatedUpdate(
          structuredClone(previousSnapshot),
          {
            post,
            revision,
            report,
            validationContext: await trustedValidationContext(revision.post_id, client)
          }
        ), 'Der Revisionssnapshot');
        if (!sameBase(previousSnapshot.base, nextSnapshot.base)
            || report.baseLiveHash !== previousSnapshot.base?.live_hash) {
          throw conflict('Die manuelle Bearbeitung hat die Revisionsbasis unerwartet verändert.');
        }

        const manualChanges = buildExistingPostDiff({
          before: snapshotFieldsForDiff(previousSnapshot),
          after: snapshotFieldsForDiff(nextSnapshot),
          reasons: []
        }).changes;
        if (manualChanges.length > MAX_MANUAL_FEEDBACK_ITEMS) {
          throw validationError('Die manuelle Bearbeitung enthält zu viele einzelne Änderungen.');
        }
        const feedbackItems = manualChanges.map((manualChange) => {
          const originalChange = matchingActiveOptimizationChange(report.changes || [], manualChange);
          if (originalChange) originalChange.status = 'manual_edit';
          return { manualChange, sourceChange: originalChange || manualChange };
        });

        const snapshotJson = jsonString(nextSnapshot, 'Der Revisionssnapshot', MAX_SNAPSHOT_BYTES);
        const reportJson = jsonString(report, 'Der Optimierungsbericht', MAX_REPORT_BYTES);
        const updateResult = await client.query(`
          UPDATE content_post_revisions
          SET snapshot_json = $2::jsonb,
              optimization_report_json = $3::jsonb,
              revision_version = revision_version + 1,
              admin_id = $5::integer,
              admin_username = $6::varchar(255),
              updated_at = NOW()
          WHERE id = $1::bigint
            AND status = 'draft'
            AND revision_version = $4::integer
            AND optimization_job_id IS NOT NULL
          RETURNING *
        `, [revisionId, snapshotJson, reportJson, expectedVersion, admin.id, admin.username]);
        const updated = updateResult.rows[0];
        if (!updated) throw conflict();

        for (const { manualChange, sourceChange } of feedbackItems) {
          const classification = changeLearningClassification(sourceChange);
          await client.query(`
            INSERT INTO content_revision_optimization_feedback (
              revision_id, post_id, change_id, event_type, category_key,
              details_json, admin_id, admin_name
            ) VALUES (
              $1::bigint, $2::integer, $3::char(64), 'manual_edit',
              $4::varchar(80), $5::jsonb, $6::integer, $7::varchar(180)
            )
          `, [
            revisionId,
            revision.post_id,
            sourceChange.id,
            classification.categoryKey,
            normalizeFeedbackDetails(
              feedbackDetails(manualChange, 'manual_edit', expectedVersion + 1)
            ),
            admin.id,
            admin.username
          ]);
        }
        if (feedbackItems.length > 0) {
          await learningRepository.recordObservationsAndMaybeProposals({
            postId: revision.post_id,
            reviewVersion: expectedVersion + 1,
            observations: feedbackItems.map(({ sourceChange }) => (
              learningObservation(sourceChange, 'manual_edit', revisionId)
            ))
          }, client);
        }
        await client.query('COMMIT');
        return updated;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async rejectRevision(input = {}) {
      const revisionId = postgresInteger(input.revisionId, 'Die Revisions-ID');
      const expectedVersion = postgresInteger(input.expectedVersion, 'Die erwartete Revisionsversion');
      const admin = normalizeAdmin(input.admin);
      const detailsJson = normalizeFeedbackDetails({
        event: 'rejected',
        revisionVersion: expectedVersion + 1
      });
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const identity = await client.query(`
          SELECT r.post_id
          FROM content_post_revisions r
          WHERE r.id = $1::bigint AND r.optimization_job_id IS NOT NULL
        `, [revisionId]);
        if (!identity.rows[0]) {
          throw repositoryError('CONTENT_REVISION_NOT_FOUND', 'Optimierungsrevision nicht gefunden.');
        }
        const postResult = await client.query(`
          SELECT p.id
          FROM posts p
          WHERE p.id = $1::integer
          FOR UPDATE OF p
        `, [identity.rows[0].post_id]);
        if (!postResult.rows[0]) throw conflict('Der zugehörige Artikel ist nicht mehr vorhanden.');
        const locked = await client.query(`
          SELECT r.* FROM content_post_revisions r
          WHERE r.id = $1::bigint AND r.optimization_job_id IS NOT NULL
          FOR UPDATE OF r
        `, [revisionId]);
        const revision = locked.rows[0];
        if (!revision) throw repositoryError('CONTENT_REVISION_NOT_FOUND', 'Optimierungsrevision nicht gefunden.');
        if (revision.status !== 'draft' || Number(revision.revision_version) !== expectedVersion) {
          throw conflict();
        }
        const updateResult = await client.query(`
          UPDATE content_post_revisions
          SET status = 'rejected',
              revision_version = revision_version + 1,
              admin_id = $3::integer,
              admin_username = $4::varchar(255),
              updated_at = NOW()
          WHERE id = $1::bigint
            AND status = 'draft'
            AND revision_version = $2::integer
            AND optimization_job_id IS NOT NULL
          RETURNING *
        `, [revisionId, expectedVersion, admin.id, admin.username]);
        const updated = updateResult.rows[0];
        if (!updated) throw conflict();
        await client.query(`
          INSERT INTO content_revision_optimization_feedback (
            revision_id, post_id, event_type, details_json, admin_id, admin_name
          ) VALUES (
            $1::bigint, $2::integer, 'rejected', $3::jsonb,
            $4::integer, $5::varchar(180)
          )
        `, [revisionId, revision.post_id, detailsJson, admin.id, admin.username]);
        await client.query('COMMIT');
        return updated;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async recordAcceptedRevisionFeedback(input = {}, transactionClient) {
      const client = requireTransactionClient(transactionClient);
      const revisionId = postgresInteger(input.revisionId, 'Die Revisions-ID');
      const postId = postgresInteger(input.postId, 'Die Artikel-ID');
      const expectedVersion = postgresInteger(
        input.expectedVersion,
        'Die erwartete Revisionsversion'
      );
      const admin = normalizeAdmin(input.admin);
      const summary = acceptedFeedbackSummary(input.report, expectedVersion);
      const summaryJson = normalizeFeedbackDetails(summary);
      const feedbackResult = await client.query(`
        INSERT INTO content_revision_optimization_feedback (
          revision_id, post_id, event_type, details_json, admin_id, admin_name
        )
        SELECT r.id, r.post_id, 'accepted', $4::jsonb, $5::integer, $6::varchar(180)
        FROM content_post_revisions r
        WHERE r.id = $1::bigint
          AND r.post_id = $2::integer
          AND r.revision_version = $3::integer
          AND r.status = 'approved'
          AND r.optimization_job_id IS NOT NULL
        RETURNING id
      `, [revisionId, postId, expectedVersion, summaryJson, admin.id, admin.username]);
      if (!feedbackResult.rows[0]) {
        throw conflict('Das Übernahmefeedback konnte nicht an die freigegebene Revision gebunden werden.');
      }
      await client.query(`
        UPDATE content_revision_optimization_outcomes AS outcome
        SET feedback_json = outcome.feedback_json || $4::jsonb,
            updated_at = NOW()
        FROM content_post_revisions r
        WHERE outcome.revision_id = $1::bigint
          AND outcome.post_id = $2::integer
          AND r.id = outcome.revision_id
          AND r.revision_version = $3::integer
          AND r.status = 'approved'
          AND r.optimization_job_id IS NOT NULL
          AND jsonb_typeof(outcome.feedback_json) = 'array'
          AND jsonb_array_length(outcome.feedback_json) < 100
          AND octet_length((outcome.feedback_json || $4::jsonb)::text) <= $5::integer
      `, [
        revisionId,
        postId,
        expectedVersion,
        jsonString([summary], 'Die Feedbackzusammenfassung', MAX_FEEDBACK_DETAILS_BYTES),
        MAX_OUTCOME_JSON_BYTES
      ]);
      return summary;
    },

    async createOutcomeBaseline(input = {}, transactionClient) {
      const client = requireTransactionClient(transactionClient);
      const revisionId = positiveInteger(input.revisionId, 'Die Revisions-ID');
      const postId = positiveInteger(input.postId, 'Die Artikel-ID');
      const expectedVersion = positiveInteger(input.expectedVersion, 'Die erwartete Revisionsversion');
      const appliedAt = normalizeTimestampInput(input.appliedAt, 'Der Übernahmezeitpunkt');
      const baselineStartDate = normalizeCalendarDate(input.baselineStartDate, 'Der Beginn des Basiszeitraums');
      const baselineEndDate = normalizeCalendarDate(input.baselineEndDate, 'Das Ende des Basiszeitraums');
      if ((baselineStartDate == null) !== (baselineEndDate == null)
          || (baselineStartDate && baselineStartDate > baselineEndDate)) {
        throw validationError('Der GSC-Basiszeitraum ist widersprüchlich.');
      }
      const baselineMetrics = plainObject(input.baselineMetrics, 'Die GSC-Basismetriken');
      const baselineMetricsJson = jsonString(
        baselineMetrics,
        'Die GSC-Basismetriken',
        MAX_OUTCOME_JSON_BYTES
      );
      const timezone = normalizeTimezone(input.timezone);
      const { rows } = await client.query(`
        WITH inserted AS (
          INSERT INTO content_revision_optimization_outcomes (
            revision_id, post_id, applied_at, baseline_start_date,
            baseline_end_date, baseline_metrics_json,
            followup_start_date, followup_end_date, feedback_json
          )
          SELECT r.id, $2::integer, $3::timestamptz, $5::date,
                 $6::date, $7::jsonb,
                 (($3::timestamptz AT TIME ZONE $8::text)::date + 1),
                 (($3::timestamptz AT TIME ZONE $8::text)::date + 28),
                 COALESCE((
                   SELECT jsonb_agg(feedback.details_json ORDER BY feedback.created_at, feedback.id)
                   FROM content_revision_optimization_feedback feedback
                   WHERE feedback.revision_id = r.id
                     AND feedback.post_id = r.post_id
                     AND feedback.event_type = 'accepted'
                 ), '[]'::jsonb)
          FROM content_post_revisions r
          WHERE r.id = $1::bigint
            AND r.post_id = $2::integer
            AND r.revision_version = $4::integer
            AND r.status = 'approved'
            AND r.optimization_job_id IS NOT NULL
          ON CONFLICT (revision_id) DO NOTHING
          RETURNING *
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT outcome.*
        FROM content_revision_optimization_outcomes outcome
        JOIN content_post_revisions r ON r.id = outcome.revision_id
        WHERE outcome.revision_id = $1::bigint
          AND outcome.post_id = $2::integer
          AND r.revision_version = $4::integer
        LIMIT 1
      `, [
        revisionId,
        postId,
        appliedAt,
        expectedVersion,
        baselineStartDate,
        baselineEndDate,
        baselineMetricsJson,
        timezone
      ]);
      if (!rows[0]) throw conflict('Die GSC-Basis konnte nicht atomar angelegt werden.');
      return rows[0];
    },

    async listDueOutcomes({ throughDate = null, limit = 50 } = {}) {
      const normalizedDate = normalizeCalendarDate(throughDate, 'Der Stichtag');
      const normalizedLimit = Math.min(50, positiveInteger(limit, 'Das Outcome-Limit'));
      const { rows } = await db.query(`
        SELECT outcome.*, r.revision_version, p.slug
        FROM content_revision_optimization_outcomes outcome
        JOIN content_post_revisions r ON r.id = outcome.revision_id
        JOIN posts p ON p.id = outcome.post_id
        WHERE outcome.evaluation_status IN ('waiting', 'ready', 'failed')
          AND outcome.followup_end_date <= COALESCE($1::date, CURRENT_DATE)
        ORDER BY outcome.followup_end_date, outcome.revision_id
        LIMIT $2::integer
      `, [normalizedDate, normalizedLimit]);
      return rows;
    },

    async completeOutcome(input = {}) {
      const revisionId = positiveInteger(input.revisionId, 'Die Revisions-ID');
      const expectedRevisionVersion = positiveInteger(
        input.expectedRevisionVersion,
        'Die erwartete Revisionsversion'
      );
      const allowedExistingStatuses = new Set(['waiting', 'ready', 'failed']);
      const expectedStatuses = Array.isArray(input.expectedStatuses)
        ? [...new Set(input.expectedStatuses)]
        : [];
      if (expectedStatuses.length < 1
          || expectedStatuses.some((status) => !allowedExistingStatuses.has(status))) {
        throw validationError('Die erwarteten Outcome-Statuswerte sind ungültig.');
      }
      const evaluationStatus = String(input.evaluationStatus || '');
      if (!['evaluated', 'insufficient_data', 'failed'].includes(evaluationStatus)) {
        throw validationError('Der neue Outcome-Status ist ungültig.');
      }
      const followupMetrics = input.followupMetrics == null
        ? null
        : plainObject(input.followupMetrics, 'Die GSC-Folgemetriken');
      if (evaluationStatus !== 'failed' && followupMetrics == null) {
        throw validationError('Für den Outcome-Abschluss fehlen GSC-Folgemetriken.');
      }
      const feedback = input.feedback ?? [];
      if (!Array.isArray(feedback) || feedback.length > 100) {
        throw validationError('Das Outcome-Feedback ist ungültig.');
      }
      const followupMetricsJson = followupMetrics == null
        ? null
        : jsonString(followupMetrics, 'Die GSC-Folgemetriken', MAX_OUTCOME_JSON_BYTES);
      const feedbackJson = jsonString(feedback, 'Das Outcome-Feedback', MAX_OUTCOME_JSON_BYTES);
      const { rows } = await db.query(`
        UPDATE content_revision_optimization_outcomes AS outcome
        SET followup_metrics_json = $5::jsonb,
            feedback_json = $6::jsonb,
            evaluation_status = $4::varchar(24),
            evaluated_at = CASE
              WHEN $4::varchar(24) IN ('evaluated', 'insufficient_data') THEN NOW()
              ELSE outcome.evaluated_at
            END,
            updated_at = NOW()
        FROM content_post_revisions r
        WHERE outcome.revision_id = $1::bigint
          AND r.id = outcome.revision_id
          AND r.revision_version = $2::integer
          AND outcome.evaluation_status = ANY($3::varchar[])
        RETURNING outcome.*
      `, [
        revisionId,
        expectedRevisionVersion,
        expectedStatuses,
        evaluationStatus,
        followupMetricsJson,
        feedbackJson
      ]);
      return rows[0] || null;
    }
  };
}
