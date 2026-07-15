import pool from '../util/db.js';

const EVENT_TYPES = new Set(['cta_click', 'contact_submit']);
const PERFORMANCE_STATUSES = new Set([
  'collecting_data',
  'insufficient_impressions',
  'positive',
  'stable',
  'opportunity'
]);
const EXPLANATION_STATUSES = new Set(['not_needed', 'pending', 'ready', 'failed']);
const SHA256 = /^[0-9a-f]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WINDOWS = ['7', '14', '28'];

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${label} muss eine positive Ganzzahl sein.`);
  }
  return normalized;
}

function nonNegativeInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${label} muss eine nichtnegative Ganzzahl sein.`);
  }
  return normalized;
}

function isoDate(value, label) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new TypeError(`${label} muss ein gültiges ISO-Datum sein.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${label} muss ein gültiges ISO-Datum sein.`);
  }
  return value;
}

function normalizePostIds(postIds) {
  if (!Array.isArray(postIds)) throw new TypeError('postIds muss ein Array sein.');
  return [...new Set(postIds.map((postId) => positiveInteger(postId, 'postId')))];
}

function validateSnapshot(input) {
  const postId = positiveInteger(input?.postId, 'postId');
  const evaluatedThroughDate = isoDate(input?.evaluatedThroughDate, 'evaluatedThroughDate');
  const articleAgeDays = nonNegativeInteger(input?.articleAgeDays, 'articleAgeDays');
  if (!WINDOWS.every((days) => input?.windows?.[days] && typeof input.windows[days] === 'object')) {
    throw new TypeError('Ein Snapshot benötigt 7, 14 und 28 Tage.');
  }
  if (!PERFORMANCE_STATUSES.has(input?.status)) {
    throw new TypeError('Unzulässiger Performance-Status.');
  }
  if (!SHA256.test(String(input?.evidenceHash || ''))) {
    throw new TypeError('Ungültiger Evidenzhash.');
  }
  const explanationStatus = input?.explanationStatus || 'not_needed';
  if (!EXPLANATION_STATUSES.has(explanationStatus)) {
    throw new TypeError('Unzulässiger Erklärungsstatus.');
  }
  return { postId, evaluatedThroughDate, articleAgeDays, explanationStatus };
}

export function createContentArticlePerformanceRepository(db = pool) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('Eine Datenbank mit query-Funktion wird benötigt.');
  }

  return {
    async recordArticleEvent(input) {
      const postId = positiveInteger(input?.postId, 'postId');
      if (!EVENT_TYPES.has(input?.eventType)) {
        throw new TypeError('Unzulässiger Ereignistyp.');
      }
      if (!SHA256.test(String(input?.eventKeyHash || ''))) {
        throw new TypeError('Ungültiger Ereignishash.');
      }

      const { rows } = await db.query(`
        INSERT INTO content_article_events (
          post_id, event_type, occurred_at, cta_location, cta_target, event_key_hash
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (event_key_hash) DO NOTHING
        RETURNING id
      `, [
        postId,
        input.eventType,
        input.occurredAt || new Date(),
        input.ctaLocation || null,
        input.ctaTarget || null,
        input.eventKeyHash
      ]);
      return rows[0] || null;
    },

    async getPerformanceInputs({ postId, evaluatedThroughDate } = {}) {
      const normalizedDate = isoDate(evaluatedThroughDate, 'evaluatedThroughDate');
      const params = postId === undefined
        ? [normalizedDate]
        : [normalizedDate, positiveInteger(postId, 'postId')];
      const postFilter = postId === undefined ? '' : 'AND p.id = $2';
      const { rows } = await db.query(`
        SELECT p.id AS "postId",
               p.title,
               p.slug,
               p.published_at AS "publishedAt",
               COUNT(DISTINCT metric.id)::integer AS "metricRowCount",
               COUNT(DISTINCT event.id)::integer AS "eventCount"
        FROM posts p
        LEFT JOIN content_search_metrics metric
          ON metric.post_id = p.id
         AND metric.metric_date <= $1::date
        LEFT JOIN content_article_events event
          ON event.post_id = p.id
         AND event.occurred_at < ($1::date + INTERVAL '1 day')
        WHERE p.published = TRUE
          AND p.published_at::date <= $1::date
          ${postFilter}
        GROUP BY p.id, p.title, p.slug, p.published_at
        ORDER BY p.id ASC
      `, params);
      return postId === undefined ? rows : (rows[0] || null);
    },

    async upsertPerformanceSnapshot(input) {
      const normalized = validateSnapshot(input);
      const { rows } = await db.query(`
        INSERT INTO content_article_performance_snapshots (
          post_id, evaluated_through_date, article_age_days, windows_json,
          previous_windows_json, cohort_json, status, diagnoses_json,
          positive_signals_json, data_eligible, learning_eligible,
          evidence_hash, explanation_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (post_id, evaluated_through_date) DO UPDATE SET
          article_age_days = EXCLUDED.article_age_days,
          windows_json = EXCLUDED.windows_json,
          previous_windows_json = EXCLUDED.previous_windows_json,
          cohort_json = EXCLUDED.cohort_json,
          status = EXCLUDED.status,
          diagnoses_json = EXCLUDED.diagnoses_json,
          positive_signals_json = EXCLUDED.positive_signals_json,
          data_eligible = EXCLUDED.data_eligible,
          learning_eligible = EXCLUDED.learning_eligible,
          evidence_hash = EXCLUDED.evidence_hash,
          explanation_status = CASE
            WHEN content_article_performance_snapshots.evidence_hash = EXCLUDED.evidence_hash
              THEN content_article_performance_snapshots.explanation_status
            ELSE EXCLUDED.explanation_status
          END,
          explanation_json = CASE
            WHEN content_article_performance_snapshots.evidence_hash = EXCLUDED.evidence_hash
              THEN content_article_performance_snapshots.explanation_json
            ELSE '{}'::jsonb
          END,
          updated_at = NOW()
        RETURNING *
      `, [
        normalized.postId,
        normalized.evaluatedThroughDate,
        normalized.articleAgeDays,
        input.windows,
        input.previousWindows || {},
        input.cohort || {},
        input.status,
        Array.isArray(input.diagnoses) ? input.diagnoses : [],
        Array.isArray(input.positiveSignals) ? input.positiveSignals : [],
        Boolean(input.dataEligible),
        Boolean(input.learningEligible),
        input.evidenceHash,
        normalized.explanationStatus
      ]);
      return rows[0] || null;
    },

    async getLatestSnapshot(postId) {
      const { rows } = await db.query(`
        SELECT *
        FROM content_article_performance_snapshots
        WHERE post_id = $1
        ORDER BY evaluated_through_date DESC
        LIMIT 1
      `, [positiveInteger(postId, 'postId')]);
      return rows[0] || null;
    },

    async listLatestSnapshots(postIds) {
      const ids = normalizePostIds(postIds);
      if (ids.length === 0) return [];
      const { rows } = await db.query(`
        SELECT DISTINCT ON (post_id) *
        FROM content_article_performance_snapshots
        WHERE post_id = ANY($1::integer[])
        ORDER BY post_id, evaluated_through_date DESC
      `, [ids]);
      return rows;
    },

    async pruneArticleEvents({ beforeDate } = {}) {
      const { rows } = await db.query(`
        DELETE FROM content_article_events
        WHERE occurred_at < $1::date
        RETURNING id
      `, [isoDate(beforeDate, 'beforeDate')]);
      return rows.length;
    }
  };
}
