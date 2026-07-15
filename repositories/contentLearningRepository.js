import { createHash } from 'node:crypto';

import pool from '../util/db.js';
import {
  CONTENT_LEARNING_TAXONOMY_VERSION,
  PERFORMANCE_LEARNING_CATEGORY_KEYS,
  getLearningCategory,
  sanitizeLearningText,
  validateLearningRuleText
} from '../services/contentAgent/contentLearningTaxonomy.js';

const FINGERPRINT = /^[0-9a-f]{64}$/;
const CLASSIFICATION_SOURCES = new Set(['local', 'provider', 'unclassified']);
const TARGET_STAGE_ORDER = Object.freeze(['seo_brief', 'writer', 'reviewer']);
const TARGET_STAGES = new Set(TARGET_STAGE_ORDER);
const RULE_STATUS_TRANSITIONS = Object.freeze({
  active: new Set(['paused', 'disabled']),
  paused: new Set(['active', 'disabled']),
  disabled: new Set()
});
const PERFORMANCE_EVIDENCE_CODE = /^[a-z0-9_]{1,80}$/;

function inputError(message) {
  return Object.assign(new TypeError(message), { code: 'CONTENT_LEARNING_INPUT_INVALID' });
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) throw inputError(`${label} muss positiv sein.`);
  return normalized;
}

function normalizeAdmin(value) {
  const id = positiveInteger(value?.id, 'Die Admin-ID');
  const username = sanitizeLearningText(value?.username, 180);
  if (!username) throw inputError('Der Adminname fehlt.');
  return { id, username };
}

function normalizeTargetStages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw inputError('Die Zielstufen der Lernregel sind ungültig.');
  }
  const unique = new Set(value.map((stage) => sanitizeLearningText(stage, 30)));
  if (unique.size !== value.length || [...unique].some((stage) => !TARGET_STAGES.has(stage))) {
    throw inputError('Die Zielstufen der Lernregel sind ungültig.');
  }
  return TARGET_STAGE_ORDER.filter((stage) => unique.has(stage));
}

function hashRule({ ruleText, targetStages }) {
  return createHash('sha256').update(JSON.stringify({
    ruleText,
    targetStages
  })).digest('hex');
}

function learningError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function inTransaction(db, callback) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
    throw error;
  } finally {
    client.release();
  }
}

function normalizeObservation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw inputError('Eine Lernbeobachtung muss ein Objekt sein.');
  }
  const categoryKey = sanitizeLearningText(value.categoryKey, 80);
  if (categoryKey !== 'unclassified' && !getLearningCategory(categoryKey)) {
    throw inputError('Die Lernbeobachtung verwendet keine bekannte Kategorie.');
  }
  const fingerprint = sanitizeLearningText(value.fingerprint, 64);
  if (!FINGERPRINT.test(fingerprint)) throw inputError('Der Lernfingerabdruck ist ungültig.');
  const classificationSource = sanitizeLearningText(value.classificationSource, 20);
  if (!CLASSIFICATION_SOURCES.has(classificationSource)) {
    throw inputError('Die Klassifizierungsquelle ist ungültig.');
  }
  const confidence = value.confidence == null ? null : Number(value.confidence);
  if (confidence != null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
    throw inputError('Die Klassifizierungskonfidenz ist ungültig.');
  }
  const reason = sanitizeLearningText(value.reason, 500);
  const instruction = sanitizeLearningText(value.instruction, 500);
  if (!reason || !instruction) throw inputError('Begründung und Prüfanweisung sind erforderlich.');
  return {
    categoryKey,
    fingerprint,
    reason,
    instruction,
    section: sanitizeLearningText(value.section, 180) || null,
    anchor: sanitizeLearningText(value.anchor, 220) || null,
    classificationSource,
    confidence,
    taxonomyVersion: sanitizeLearningText(value.taxonomyVersion, 80)
      || CONTENT_LEARNING_TAXONOMY_VERSION
  };
}

function normalizeClassification(value) {
  const observation = normalizeObservation({
    ...value,
    reason: value?.reason,
    instruction: value?.reason,
    section: null,
    anchor: null
  });
  return {
    fingerprint: observation.fingerprint,
    categoryKey: observation.categoryKey,
    classificationSource: observation.classificationSource,
    confidence: observation.confidence,
    reason: observation.reason,
    taxonomyVersion: observation.taxonomyVersion
  };
}

export function createContentLearningRepository(db = pool) {
  return {
    async listPerformanceEvidence({ categoryKeys } = {}) {
      if (!Array.isArray(categoryKeys) || categoryKeys.length < 1
          || categoryKeys.some((key) => !PERFORMANCE_LEARNING_CATEGORY_KEYS.includes(key))) {
        throw inputError('Die Performance-Lernkategorien sind ungültig.');
      }
      const uniqueKeys = [...new Set(categoryKeys)];
      const { rows } = await db.query(`
        WITH latest_snapshot AS (
          SELECT DISTINCT ON (post_id)
                 post_id, id AS snapshot_id, evaluated_through_date,
                 windows_json, diagnoses_json, positive_signals_json
          FROM content_article_performance_snapshots
          WHERE learning_eligible = TRUE
          ORDER BY post_id, evaluated_through_date DESC, id DESC
        ), evidence AS (
          SELECT post_id, snapshot_id, evaluated_through_date, windows_json,
                 item ->> 'categoryKey' AS category_key,
                 item ->> 'code' AS evidence_code,
                 'diagnosis' AS evidence_kind
          FROM latest_snapshot
          CROSS JOIN LATERAL jsonb_array_elements(diagnoses_json) item
          UNION ALL
          SELECT post_id, snapshot_id, evaluated_through_date, windows_json,
                 item ->> 'categoryKey', item ->> 'code', 'positive'
          FROM latest_snapshot
          CROSS JOIN LATERAL jsonb_array_elements(positive_signals_json) item
        )
        SELECT DISTINCT ON (post_id, category_key)
               post_id AS "postId", snapshot_id AS "snapshotId",
               evaluated_through_date AS "evaluatedThroughDate",
               windows_json AS windows, category_key AS "categoryKey",
               evidence_code AS "evidenceCode", evidence_kind AS "evidenceKind"
        FROM evidence
        WHERE category_key = ANY($1::text[])
        ORDER BY post_id, category_key, evaluated_through_date DESC
      `, [uniqueKeys]);
      return rows;
    },

    async upsertPerformanceRuleProposal(input) {
      const categoryKey = sanitizeLearningText(input?.categoryKey, 80);
      if (!PERFORMANCE_LEARNING_CATEGORY_KEYS.includes(categoryKey)) {
        throw inputError('Der Performancevorschlag verwendet keine kontrollierte Kategorie.');
      }
      const suggestedRuleText = validateLearningRuleText(input?.suggestedRuleText);
      const targetStages = normalizeTargetStages(input?.targetStages);
      const evidenceCount = positiveInteger(input?.evidenceCount, 'Die Anzahl der Performancebelege');
      if (evidenceCount < 3 || !Array.isArray(input?.evidenceJson)
          || input.evidenceJson.length < 3 || input.evidenceJson.length > 5) {
        throw inputError('Ein Performancevorschlag benötigt Belege aus mindestens drei Artikeln.');
      }
      const seenPosts = new Set();
      const evidenceJson = input.evidenceJson.map((row) => {
        const postId = positiveInteger(row?.post_id, 'Die Performance-Artikel-ID');
        const snapshotId = positiveInteger(row?.snapshot_id, 'Die Performance-Snapshot-ID');
        const date = sanitizeLearningText(row?.evaluated_through_date, 10);
        const evidenceCode = sanitizeLearningText(row?.evidence_code, 80);
        const evidenceKind = sanitizeLearningText(row?.evidence_kind, 20);
        if (seenPosts.has(postId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)
            || !PERFORMANCE_EVIDENCE_CODE.test(evidenceCode)
            || !['diagnosis', 'positive'].includes(evidenceKind)) {
          throw inputError('Die Performancebelege sind ungültig oder doppelt.');
        }
        seenPosts.add(postId);
        const metrics = row?.windows?.[28] ?? row?.windows?.['28'] ?? {};
        const safeMetric = (value) => Math.max(0, Number(value) || 0);
        return {
          post_id: postId,
          snapshot_id: snapshotId,
          evaluated_through_date: date,
          evidence_code: evidenceCode,
          evidence_kind: evidenceKind,
          windows: { 28: {
            impressions: safeMetric(metrics.impressions),
            clicks: safeMetric(metrics.clicks),
            ctaClicks: safeMetric(metrics.ctaClicks),
            contactSubmits: safeMetric(metrics.contactSubmits)
          } }
        };
      });
      if (seenPosts.size < 3 || evidenceCount < seenPosts.size) {
        throw inputError('Die Zahl unterschiedlicher Performanceartikel ist nicht plausibel.');
      }
      const expectedEffect = sanitizeLearningText(input?.expectedEffect, 500);
      const overfitWarning = sanitizeLearningText(input?.overfitWarning, 500);
      if (!expectedEffect || !overfitWarning) {
        throw inputError('Erwartete Wirkung und Hinweis gegen Überanpassung fehlen.');
      }

      return inTransaction(db, async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('content-learning:' || $1::text))",
          [categoryKey]
        );
        const result = await client.query(`
          INSERT INTO content_learning_rule_proposals (
            category_key, suggested_rule_text, target_stages, evidence_count,
            evidence_json, expected_effect, overfit_warning
          )
          SELECT $1::varchar(80), $2::varchar(800), $3::text[], $4::integer,
                 $5::jsonb, $6::varchar(500), $7::varchar(500)
          WHERE NOT EXISTS (
            SELECT 1 FROM content_learning_rules WHERE category_key = $1::varchar(80)
          )
          ON CONFLICT (category_key) WHERE status = 'pending' DO NOTHING
          RETURNING *
        `, [
          categoryKey,
          suggestedRuleText,
          targetStages,
          evidenceCount,
          JSON.stringify(evidenceJson),
          expectedEffect,
          overfitWarning
        ]);
        const proposal = result.rows[0] || null;
        if (proposal) {
          await client.query(`
            INSERT INTO content_learning_events (
              category_key, proposal_id, event_type, details_json
            ) VALUES ($1, $2, 'proposal_created', $3::jsonb)
          `, [categoryKey, proposal.id, JSON.stringify({
            evidenceCount,
            source: 'performance'
          })]);
        }
        return proposal;
      });
    },

    async loadReview({ postId, reviewVersion }) {
      const normalizedPostId = positiveInteger(postId, 'Die Artikel-ID');
      const normalizedReviewVersion = positiveInteger(reviewVersion, 'Die Review-Version');
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.review_version, p.generation_run_id,
               m.quality_score, m.quality_report_json
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.id = $1
          AND p.review_version = $2
          AND p.generated_by_ai = TRUE
          AND p.published = FALSE
          AND p.content_format = 'static_html'
        LIMIT 1
      `, [normalizedPostId, normalizedReviewVersion]);
      return rows[0] || null;
    },

    async loadCachedClassifications(fingerprints) {
      if (!Array.isArray(fingerprints) || fingerprints.length > 12
          || fingerprints.some((value) => !FINGERPRINT.test(value))) {
        throw inputError('Die Liste der Lernfingerabdrücke ist ungültig.');
      }
      if (fingerprints.length === 0) return [];
      const { rows } = await db.query(`
        SELECT fingerprint, category_key, classification_source, confidence,
               reason, taxonomy_version, provider_run_id
        FROM content_learning_classifications
        WHERE fingerprint = ANY($1::char(64)[])
      `, [fingerprints]);
      return rows;
    },

    async storeClassifications({ classifications, providerRunId = null }) {
      if (!Array.isArray(classifications) || classifications.length < 1 || classifications.length > 12) {
        throw inputError('Mindestens eine und höchstens zwölf Klassifizierungen sind erforderlich.');
      }
      const normalized = classifications.map(normalizeClassification);
      const runId = providerRunId == null ? null : positiveInteger(providerRunId, 'Die Provider-Run-ID');
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const rows = [];
        for (const item of normalized) {
          const result = await client.query(`
            INSERT INTO content_learning_classifications (
              fingerprint, category_key, classification_source, confidence,
              reason, taxonomy_version, provider_run_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (fingerprint) DO UPDATE
            SET category_key = EXCLUDED.category_key,
                classification_source = EXCLUDED.classification_source,
                confidence = EXCLUDED.confidence,
                reason = EXCLUDED.reason,
                taxonomy_version = EXCLUDED.taxonomy_version,
                provider_run_id = COALESCE(EXCLUDED.provider_run_id, content_learning_classifications.provider_run_id),
                updated_at = NOW()
            RETURNING *
          `, [
            item.fingerprint,
            item.categoryKey,
            item.classificationSource,
            item.confidence,
            item.reason,
            item.taxonomyVersion,
            runId
          ]);
          rows.push(result.rows[0]);
        }
        await client.query('COMMIT');
        return rows;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async recordObservationsAndMaybeProposals(
      { postId, reviewVersion, observations },
      transactionClient = null
    ) {
      const normalizedPostId = positiveInteger(postId, 'Die Artikel-ID');
      const normalizedReviewVersion = positiveInteger(reviewVersion, 'Die Review-Version');
      if (!Array.isArray(observations) || observations.length < 1 || observations.length > 24) {
        throw inputError('Mindestens eine und höchstens 24 Lernbeobachtungen sind erforderlich.');
      }
      const normalized = observations.map(normalizeObservation);
      const classifiedCategories = [...new Set(normalized
        .map(({ categoryKey }) => categoryKey)
        .filter((categoryKey) => categoryKey !== 'unclassified'))].sort();
      const ownsTransaction = transactionClient == null;
      const client = transactionClient || await db.connect();
      try {
        if (ownsTransaction) await client.query('BEGIN');
        for (const categoryKey of classifiedCategories) {
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtext('content-learning:' || $1::text))",
            [categoryKey]
          );
        }
        const persistedObservations = [];
        for (const item of normalized) {
          const conflict = item.categoryKey === 'unclassified'
            ? `(post_id, fingerprint) WHERE category_key = 'unclassified'`
            : `(post_id, category_key) WHERE category_key <> 'unclassified'`;
          const result = await client.query(`
            INSERT INTO content_learning_observations (
              post_id, review_version, category_key, fingerprint, reason,
              instruction, section_name, anchor, classification_source,
              confidence, taxonomy_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT ${conflict} DO UPDATE
            SET review_version = GREATEST(
                  content_learning_observations.review_version,
                  EXCLUDED.review_version
                ),
                fingerprint = EXCLUDED.fingerprint,
                reason = EXCLUDED.reason,
                instruction = EXCLUDED.instruction,
                section_name = EXCLUDED.section_name,
                anchor = EXCLUDED.anchor,
                classification_source = EXCLUDED.classification_source,
                confidence = EXCLUDED.confidence,
                taxonomy_version = EXCLUDED.taxonomy_version,
                last_seen_at = NOW()
            RETURNING *
          `, [
            normalizedPostId,
            normalizedReviewVersion,
            item.categoryKey,
            item.fingerprint,
            item.reason,
            item.instruction,
            item.section,
            item.anchor,
            item.classificationSource,
            item.confidence,
            item.taxonomyVersion
          ]);
          persistedObservations.push(result.rows[0]);
        }

        const proposals = [];
        for (const categoryKey of classifiedCategories) {
          const countResult = await client.query(`
            SELECT COUNT(DISTINCT post_id)::text AS article_count
            FROM content_learning_observations
            WHERE category_key = $1
          `, [categoryKey]);
          const articleCount = Number(countResult.rows[0]?.article_count || 0);
          if (articleCount < 3) continue;
          const evidenceResult = await client.query(`
            SELECT post_id, review_version, reason, instruction, section_name, anchor
            FROM content_learning_observations
            WHERE category_key = $1
            ORDER BY last_seen_at DESC, id DESC
            LIMIT 5
          `, [categoryKey]);
          const definition = getLearningCategory(categoryKey);
          const proposalResult = await client.query(`
            INSERT INTO content_learning_rule_proposals (
              category_key, suggested_rule_text, target_stages, evidence_count,
              evidence_json, expected_effect, overfit_warning
            )
            SELECT $1::varchar(80), $2::varchar(800), $3::text[], $4::integer,
                   $5::jsonb, $6::varchar(500), $7::varchar(500)
            WHERE NOT EXISTS (
              SELECT 1
              FROM content_learning_rules
              WHERE category_key = $1::varchar(80)
            )
            ON CONFLICT (category_key) WHERE status = 'pending' DO NOTHING
            RETURNING *
          `, [
            categoryKey,
            definition.defaultRule,
            definition.targetStages,
            articleCount,
            JSON.stringify(evidenceResult.rows),
            definition.expectedEffect,
            definition.overfitWarning
          ]);
          const proposal = proposalResult.rows[0];
          if (!proposal) continue;
          proposals.push(proposal);
          await client.query(`
            INSERT INTO content_learning_events (
              category_key, proposal_id, event_type, details_json
            ) VALUES ($1, $2, 'proposal_created', $3::jsonb)
          `, [categoryKey, proposal.id, JSON.stringify({ evidenceCount: articleCount })]);
        }
        if (ownsTransaction) await client.query('COMMIT');
        return { observations: persistedObservations, proposals };
      } catch (error) {
        if (ownsTransaction) {
          try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        }
        throw error;
      } finally {
        if (ownsTransaction) client.release();
      }
    },

    async listActiveRuleVersions() {
      const { rows } = await db.query(`
        SELECT r.id, r.category_key, r.current_version AS version,
               v.rule_text, v.target_stages, v.rule_hash
        FROM content_learning_rules r
        JOIN content_learning_rule_versions v
          ON v.rule_id = r.id AND v.version = r.current_version
        WHERE r.status = 'active'
        ORDER BY r.id, r.current_version
      `);
      return rows;
    },

    async getAdminDashboard() {
      const [proposals, rules, observations, unclassified, events, effectiveness] = await Promise.all([
        db.query(`
          SELECT id, category_key, status, proposal_version, suggested_rule_text,
                 target_stages, evidence_count, evidence_json, expected_effect,
                 overfit_warning, decided_by_admin_name, decided_at, created_at, updated_at
          FROM content_learning_rule_proposals
          ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC, id DESC
          LIMIT 100
        `),
        db.query(`
          SELECT r.id, r.category_key, r.status, r.current_version, r.rule_revision,
                 r.created_by_admin_name, r.updated_by_admin_name, r.created_at, r.updated_at,
                 v.rule_text, v.target_stages, v.rule_hash, v.created_at AS version_created_at
          FROM content_learning_rules r
          JOIN content_learning_rule_versions v
            ON v.rule_id = r.id AND v.version = r.current_version
          ORDER BY CASE r.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
                   r.updated_at DESC, r.id DESC
          LIMIT 100
        `),
        db.query(`
          SELECT category_key, COUNT(DISTINCT post_id)::integer AS article_count,
                 COUNT(*)::integer AS observation_count, MAX(last_seen_at) AS last_seen_at,
                 ARRAY_AGG(DISTINCT post_id ORDER BY post_id) AS post_ids
          FROM content_learning_observations
          WHERE category_key <> 'unclassified'
          GROUP BY category_key
          ORDER BY MAX(last_seen_at) DESC, category_key
        `),
        db.query(`
          SELECT COUNT(DISTINCT post_id)::integer AS article_count,
                 COUNT(*)::integer AS observation_count, MAX(last_seen_at) AS last_seen_at
          FROM content_learning_observations
          WHERE category_key = 'unclassified'
        `),
        db.query(`
          SELECT id, event_type, proposal_id, rule_id, rule_version, category_key,
                 details_json, admin_id, admin_name, created_at
          FROM content_learning_events
          ORDER BY created_at DESC, id DESC
          LIMIT 100
        `),
        db.query(`
          WITH current_rule_versions AS (
            SELECT r.id AS rule_id, r.category_key, v.version AS rule_version,
                   v.created_at AS rule_version_created_at
            FROM content_learning_rules r
            JOIN content_learning_rule_versions v
              ON v.rule_id = r.id AND v.version = r.current_version
          ), snapshotted_articles AS (
            SELECT rv.rule_id, rv.rule_version, rv.category_key, p.id AS post_id,
                   m.quality_score,
                   CASE WHEN observation.post_id IS NULL THEN 0 ELSE 1 END AS recurred
            FROM current_rule_versions rv
            JOIN content_runs run ON TRUE
            JOIN LATERAL jsonb_array_elements(
              COALESCE(run.runtime_snapshot_json #> '{learningRuleSnapshot,rules}', '[]'::jsonb)
            ) AS snapshot_rule ON
              (snapshot_rule ->> 'id')::bigint = rv.rule_id
              AND (snapshot_rule ->> 'version')::integer = rv.rule_version
            JOIN posts p ON p.generation_run_id = run.id
            JOIN content_post_metadata m ON m.post_id = p.id
            LEFT JOIN content_learning_observations observation
              ON observation.post_id = p.id
             AND observation.category_key = rv.category_key
          ), article_gsc AS (
            SELECT post_id, SUM(clicks)::double precision AS clicks,
                   SUM(impressions)::double precision AS impressions,
                   (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
                   (
                     SUM(average_position * impressions)
                     / NULLIF(SUM(impressions), 0)
                   )::double precision AS average_position
            FROM content_search_metrics
            WHERE post_id IS NOT NULL
            GROUP BY post_id
          ), rule_metrics AS (
            SELECT article.rule_id, article.rule_version,
                   COUNT(DISTINCT article.post_id)::integer AS article_count,
                   SUM(article.recurred)::integer AS recurrence_count,
                   AVG(article.quality_score)::double precision AS average_quality_score,
                   SUM(gsc.clicks)::double precision AS clicks,
                   SUM(gsc.impressions)::double precision AS impressions,
                   (SUM(gsc.clicks) / NULLIF(SUM(gsc.impressions), 0))::double precision AS ctr,
                   (
                     SUM(gsc.average_position * gsc.impressions)
                     / NULLIF(SUM(gsc.impressions), 0)
                   )::double precision AS average_position
            FROM snapshotted_articles article
            LEFT JOIN article_gsc gsc ON gsc.post_id = article.post_id
            GROUP BY article.rule_id, article.rule_version
          )
          SELECT rv.rule_id, rv.rule_version,
                 COALESCE(metrics.article_count, 0)::integer AS article_count,
                 COALESCE(metrics.recurrence_count, 0)::integer AS recurrence_count,
                 baseline.article_count::integer AS baseline_article_count,
                 baseline.recurrence_count::integer AS baseline_recurrence_count,
                 metrics.average_quality_score, metrics.clicks, metrics.impressions,
                 metrics.ctr, metrics.average_position
          FROM current_rule_versions rv
          LEFT JOIN rule_metrics metrics
            ON metrics.rule_id = rv.rule_id AND metrics.rule_version = rv.rule_version
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS article_count,
                   COUNT(observation.post_id)::integer AS recurrence_count
            FROM (
              SELECT prior.id
              FROM posts prior
              WHERE prior.generated_by_ai = TRUE
                AND prior.content_format = 'static_html'
                AND prior.created_at < rv.rule_version_created_at
              ORDER BY prior.created_at DESC, prior.id DESC
              LIMIT 20
            ) baseline_post
            LEFT JOIN content_learning_observations observation
              ON observation.post_id = baseline_post.id
             AND observation.category_key = rv.category_key
          ) baseline ON TRUE
          ORDER BY rv.rule_id, rv.rule_version
        `)
      ]);
      return {
        proposals: proposals.rows,
        rules: rules.rows,
        observations: observations.rows,
        unclassified: unclassified.rows[0] || {
          article_count: 0,
          observation_count: 0,
          last_seen_at: null
        },
        events: events.rows,
        effectiveness: effectiveness.rows
      };
    },

    async activateProposal(input) {
      const proposalId = positiveInteger(input?.proposalId, 'Die Vorschlags-ID');
      const expectedVersion = positiveInteger(input?.expectedVersion, 'Die erwartete Version');
      const ruleText = validateLearningRuleText(input?.ruleText);
      const targetStages = normalizeTargetStages(input?.targetStages);
      const admin = normalizeAdmin(input?.admin);
      return inTransaction(db, async (client) => {
        const proposalResult = await client.query(`
          SELECT * FROM content_learning_rule_proposals
          WHERE id = $1
          FOR UPDATE
        `, [proposalId]);
        const proposal = proposalResult.rows[0];
        if (!proposal) throw learningError('CONTENT_LEARNING_PROPOSAL_NOT_FOUND', 'Der Lernregelvorschlag wurde nicht gefunden.');
        if (proposal.status !== 'pending' || Number(proposal.proposal_version) !== expectedVersion) {
          throw learningError('CONTENT_LEARNING_VERSION_CONFLICT', 'Der Lernregelvorschlag ist veraltet.');
        }
        const ruleResult = await client.query(`
          INSERT INTO content_learning_rules (
            category_key, status, current_version, rule_revision,
            created_by_admin_id, created_by_admin_name,
            updated_by_admin_id, updated_by_admin_name
          ) VALUES ($1, 'active', 1, 1, $2, $3, $2, $3)
          ON CONFLICT (category_key) DO NOTHING
          RETURNING *
        `, [proposal.category_key, admin.id, admin.username]);
        const rule = ruleResult.rows[0];
        if (!rule) throw learningError('CONTENT_LEARNING_STATE_CONFLICT', 'Für diese Kategorie existiert bereits eine Lernregel.');
        const ruleHash = hashRule({ ruleText, targetStages });
        await client.query(`
          INSERT INTO content_learning_rule_versions (
            rule_id, version, rule_text, target_stages, rule_hash,
            source_proposal_id, created_by_admin_id, created_by_admin_name
          ) VALUES ($1, 1, $2, $3::text[], $4, $5, $6, $7)
        `, [rule.id, ruleText, targetStages, ruleHash, proposalId, admin.id, admin.username]);
        const decisionResult = await client.query(`
          UPDATE content_learning_rule_proposals
          SET status = 'approved', proposal_version = proposal_version + 1,
              suggested_rule_text = $3, target_stages = $4::text[],
              decided_by_admin_id = $5, decided_by_admin_name = $6,
              decided_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND proposal_version = $2 AND status = 'pending'
          RETURNING *
        `, [proposalId, expectedVersion, ruleText, targetStages, admin.id, admin.username]);
        if (!decisionResult.rows[0]) {
          throw learningError('CONTENT_LEARNING_VERSION_CONFLICT', 'Der Lernregelvorschlag ist veraltet.');
        }
        await client.query(`
          INSERT INTO content_learning_events (
            event_type, proposal_id, rule_id, rule_version, category_key,
            details_json, admin_id, admin_name
          ) VALUES ('proposal_approved', $1, $2, 1, $3, $4::jsonb, $5, $6)
        `, [proposalId, rule.id, proposal.category_key, JSON.stringify({ targetStages }), admin.id, admin.username]);
        return { proposal: decisionResult.rows[0], rule: { ...rule, rule_hash: ruleHash } };
      });
    },

    async rejectProposal(input) {
      const proposalId = positiveInteger(input?.proposalId, 'Die Vorschlags-ID');
      const expectedVersion = positiveInteger(input?.expectedVersion, 'Die erwartete Version');
      const admin = normalizeAdmin(input?.admin);
      return inTransaction(db, async (client) => {
        const result = await client.query(`
          UPDATE content_learning_rule_proposals
          SET status = 'rejected', proposal_version = proposal_version + 1,
              decided_by_admin_id = $3, decided_by_admin_name = $4,
              decided_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND proposal_version = $2 AND status = 'pending'
          RETURNING *
        `, [proposalId, expectedVersion, admin.id, admin.username]);
        const proposal = result.rows[0];
        if (!proposal) throw learningError('CONTENT_LEARNING_VERSION_CONFLICT', 'Der Lernregelvorschlag ist veraltet.');
        await client.query(`
          INSERT INTO content_learning_events (
            event_type, proposal_id, category_key, details_json, admin_id, admin_name
          ) VALUES ('proposal_rejected', $1, $2, '{}'::jsonb, $3, $4)
        `, [proposalId, proposal.category_key, admin.id, admin.username]);
        return proposal;
      });
    },

    async reviseRule(input) {
      const ruleId = positiveInteger(input?.ruleId, 'Die Regel-ID');
      const expectedVersion = positiveInteger(input?.expectedVersion, 'Die erwartete Version');
      const ruleText = validateLearningRuleText(input?.ruleText);
      const targetStages = normalizeTargetStages(input?.targetStages);
      const admin = normalizeAdmin(input?.admin);
      return inTransaction(db, async (client) => {
        const currentResult = await client.query(`
          SELECT * FROM content_learning_rules
          WHERE id = $1
          FOR UPDATE
        `, [ruleId]);
        const current = currentResult.rows[0];
        if (!current) throw learningError('CONTENT_LEARNING_RULE_NOT_FOUND', 'Die Lernregel wurde nicht gefunden.');
        if (Number(current.rule_revision) !== expectedVersion || !['active', 'paused'].includes(current.status)) {
          throw learningError('CONTENT_LEARNING_VERSION_CONFLICT', 'Die Lernregel ist veraltet oder dauerhaft deaktiviert.');
        }
        const nextVersion = Number(current.current_version) + 1;
        const ruleHash = hashRule({ ruleText, targetStages });
        await client.query(`
          INSERT INTO content_learning_rule_versions (
            rule_id, version, rule_text, target_stages, rule_hash,
            created_by_admin_id, created_by_admin_name
          ) VALUES ($1, $2, $3, $4::text[], $5, $6, $7)
        `, [ruleId, nextVersion, ruleText, targetStages, ruleHash, admin.id, admin.username]);
        const updateResult = await client.query(`
          UPDATE content_learning_rules
          SET status = 'active', current_version = $2, rule_revision = rule_revision + 1,
              updated_by_admin_id = $3, updated_by_admin_name = $4, updated_at = NOW()
          WHERE id = $1 AND rule_revision = $5
          RETURNING *
        `, [ruleId, nextVersion, admin.id, admin.username, expectedVersion]);
        if (!updateResult.rows[0]) throw learningError('CONTENT_LEARNING_VERSION_CONFLICT', 'Die Lernregel ist veraltet.');
        await client.query(`
          INSERT INTO content_learning_events (
            event_type, rule_id, rule_version, category_key, details_json, admin_id, admin_name
          ) VALUES ('rule_revised', $1, $2, $3, $4::jsonb, $5, $6)
        `, [ruleId, nextVersion, current.category_key, JSON.stringify({ previousStatus: current.status, targetStages }), admin.id, admin.username]);
        return { ...updateResult.rows[0], rule_text: ruleText, target_stages: targetStages, rule_hash: ruleHash };
      });
    },

    async changeRuleStatus(input) {
      const ruleId = positiveInteger(input?.ruleId, 'Die Regel-ID');
      const expectedVersion = positiveInteger(input?.expectedVersion, 'Die erwartete Version');
      const currentStatus = sanitizeLearningText(input?.currentStatus, 20);
      const nextStatus = sanitizeLearningText(input?.nextStatus, 20);
      const admin = normalizeAdmin(input?.admin);
      if (!RULE_STATUS_TRANSITIONS[currentStatus]?.has(nextStatus)) {
        throw inputError('Dieser Statusübergang ist nicht erlaubt.');
      }
      return inTransaction(db, async (client) => {
        const result = await client.query(`
          UPDATE content_learning_rules
          SET status = $4, rule_revision = rule_revision + 1,
              updated_by_admin_id = $5, updated_by_admin_name = $6, updated_at = NOW()
          WHERE id = $1 AND rule_revision = $2 AND status = $3
          RETURNING *
        `, [ruleId, expectedVersion, currentStatus, nextStatus, admin.id, admin.username]);
        const rule = result.rows[0];
        if (!rule) throw learningError('CONTENT_LEARNING_VERSION_CONFLICT', 'Die Lernregel ist veraltet.');
        const eventType = nextStatus === 'paused'
          ? 'rule_paused'
          : nextStatus === 'active' ? 'rule_reactivated' : 'rule_disabled';
        await client.query(`
          INSERT INTO content_learning_events (
            event_type, rule_id, rule_version, category_key, details_json, admin_id, admin_name
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        `, [eventType, ruleId, rule.current_version, rule.category_key, JSON.stringify({ previousStatus: currentStatus, nextStatus }), admin.id, admin.username]);
        return rule;
      });
    }
  };
}
