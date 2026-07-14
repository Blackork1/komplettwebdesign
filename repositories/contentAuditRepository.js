import pool from '../util/db.js';

const MAX_AUDIT_ITEMS = 100;
const MAX_AUDIT_JSON_BYTES = 256_000;
const AUDIT_TYPE = /^[a-z0-9_:-]{1,64}$/;

function auditError(message) {
  return Object.assign(new TypeError(message), { code: 'CONTENT_AUDIT_VALIDATION_FAILED' });
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw auditError(`${label} ist ungültig.`);
  }
  return normalized;
}

function nullablePositiveInteger(value, label) {
  return value == null ? null : positiveInteger(value, label);
}

function boundedJsonArray(value, label) {
  if (!Array.isArray(value) || value.length > MAX_AUDIT_ITEMS) {
    throw auditError(`${label} ist ungültig oder enthält zu viele Einträge.`);
  }
  let json;
  try {
    json = JSON.stringify(value);
  } catch {
    throw auditError(`${label} ist nicht als JSON speicherbar.`);
  }
  if (Buffer.byteLength(json, 'utf8') > MAX_AUDIT_JSON_BYTES) {
    throw auditError(`${label} überschreitet die zulässige Größe.`);
  }
  return json;
}

function normalizeAuditInput(input = {}) {
  const auditType = typeof input.auditType === 'string' ? input.auditType.trim() : '';
  const score = Number(input.score);
  if (!AUDIT_TYPE.test(auditType)) throw auditError('Der Audittyp ist ungültig.');
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw auditError('Der Auditscore ist ungültig.');
  }
  return {
    postId: positiveInteger(input.postId, 'Die Artikel-ID'),
    jobId: positiveInteger(input.jobId, 'Die Auftrags-ID'),
    runId: nullablePositiveInteger(input.runId, 'Die Lauf-ID'),
    auditType,
    score,
    findingsJson: boundedJsonArray(input.findings ?? [], 'Die Auditbefunde'),
    recommendedActionsJson: boundedJsonArray(
      input.recommendedActions ?? [],
      'Die empfohlenen Maßnahmen'
    )
  };
}

export function createContentAuditRepository(db = pool) {
  return {
    async listPublishedPosts({ limit = 500 } = {}) {
      const boundedLimit = Math.min(500, Math.max(1, Number(limit) || 500));
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.content, p.content_format,
               p.meta_title, p.meta_description, p.og_title, p.og_description,
               p.faq_json, p.image_url, p.image_alt, p.updated_at,
               m.primary_keyword, m.content_cluster
        FROM posts p
        LEFT JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.published = TRUE
        ORDER BY p.id
        LIMIT $1
      `, [boundedLimit]);
      return rows;
    },

    async listTrustedInternalUrls() {
      const { rows } = await db.query(`
        SELECT url, type FROM (
          SELECT '/blog/' || slug AS url, 'blog' AS type FROM posts WHERE published = TRUE
          UNION SELECT '/ratgeber/' || slug, 'guide' FROM ratgeber WHERE published = TRUE
          UNION SELECT '/leistungen/' || slug, 'service' FROM leistungen_pages WHERE is_published = TRUE
          UNION SELECT '/branchen/' || slug, 'industry' FROM industries
        ) trusted_urls
        ORDER BY url LIMIT 5000
      `);
      return rows;
    },

    async createAuditIdempotent(input) {
      const normalized = normalizeAuditInput(input);
      const { rows } = await db.query(`
        WITH inserted AS (
          INSERT INTO content_post_audits (
            post_id, job_id, run_id, audit_type, score,
            findings_json, recommended_actions_json, status
          )
          VALUES (
            $1::integer, $2::bigint, $3::bigint, $4::varchar(64),
            $5::integer, $6::jsonb, $7::jsonb, 'open'
          )
          ON CONFLICT (job_id, post_id, audit_type) WHERE job_id IS NOT NULL DO NOTHING
          RETURNING *
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT * FROM content_post_audits
        WHERE job_id = $2::bigint
          AND post_id = $1::integer
          AND audit_type = $4::varchar(64)
        LIMIT 1
      `, [
        normalized.postId,
        normalized.jobId,
        normalized.runId,
        normalized.auditType,
        normalized.score,
        normalized.findingsJson,
        normalized.recommendedActionsJson
      ]);
      return rows[0] || null;
    }
  };
}
