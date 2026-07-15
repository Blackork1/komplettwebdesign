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

    async listPublishedArticles({ evaluatedThroughDate } = {}) {
      const { rows } = await db.query(`
        SELECT p.id,
               p.title,
               p.slug,
               p.published_at AS "publishedAt",
               metadata.content_cluster AS "contentCluster"
        FROM posts p
        LEFT JOIN content_post_metadata metadata ON metadata.post_id = p.id
        WHERE p.published = TRUE
          AND p.published_at IS NOT NULL
          AND p.published_at::date <= $1::date
        ORDER BY p.published_at ASC, p.id ASC
      `, [isoDate(evaluatedThroughDate, 'evaluatedThroughDate')]);
      return rows;
    },

    async getPerformanceInputs({ postId, evaluatedThroughDate } = {}) {
      const normalizedPostId = positiveInteger(postId, 'postId');
      const normalizedDate = isoDate(evaluatedThroughDate, 'evaluatedThroughDate');
      const { rows } = await db.query(`
        WITH target AS (
          SELECT p.id,
                 p.published_at,
                 ($2::date - p.published_at::date)::integer AS article_age_days,
                 metadata.content_cluster,
                 CASE
                   WHEN ($2::date - p.published_at::date) < 28 THEN 'collecting'
                   WHEN ($2::date - p.published_at::date) < 60 THEN '28-59'
                   WHEN ($2::date - p.published_at::date) < 120 THEN '60-119'
                   WHEN ($2::date - p.published_at::date) < 240 THEN '120-239'
                   ELSE '240-plus'
                 END AS age_bucket
          FROM posts p
          LEFT JOIN content_post_metadata metadata ON metadata.post_id = p.id
          WHERE p.id = $1
            AND p.published = TRUE
            AND p.published_at IS NOT NULL
            AND p.published_at::date <= $2::date
        ),
        window_bounds AS (
          SELECT 'current'::text AS kind,
                 days,
                 ($2::date - (days - 1))::date AS start_date,
                 $2::date AS end_date
          FROM (VALUES (7), (14), (28)) AS requested(days)
          UNION ALL
          SELECT 'previous'::text AS kind,
                 days,
                 ($2::date - ((days * 2) - 1))::date AS start_date,
                 ($2::date - days)::date AS end_date
          FROM (VALUES (7), (14), (28)) AS requested(days)
        ),
        window_aggregates AS (
          SELECT bounds.kind,
                 bounds.days,
                 bounds.start_date,
                 bounds.end_date,
                 coverage.coverage_day_count,
                 metrics.impressions,
                 metrics.clicks,
                 metrics.ctr,
                 metrics.average_position,
                 events.cta_clicks,
                 events.contact_submits,
                 CASE WHEN bounds.kind = 'current' THEN queries.items ELSE '[]'::jsonb END AS queries
          FROM window_bounds bounds
          LEFT JOIN LATERAL (
            SELECT COUNT(DISTINCT sync_day.metric_date)::integer AS coverage_day_count
            FROM content_search_metric_sync_days sync_day
            WHERE sync_day.metric_date BETWEEN bounds.start_date AND bounds.end_date
          ) coverage ON TRUE
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(metric.impressions), 0)::double precision AS impressions,
                   COALESCE(SUM(metric.clicks), 0)::double precision AS clicks,
                   COALESCE(
                     SUM(metric.clicks) / NULLIF(SUM(metric.impressions), 0),
                     0
                   )::double precision AS ctr,
                   (
                     SUM(metric.average_position * metric.impressions)
                     / NULLIF(SUM(metric.impressions), 0)
                   )::double precision AS average_position
            FROM content_search_metrics metric
            WHERE metric.post_id = $1
              AND metric.metric_date BETWEEN bounds.start_date AND bounds.end_date
          ) metrics ON TRUE
          LEFT JOIN LATERAL (
            SELECT COUNT(*) FILTER (WHERE event.event_type = 'cta_click')::integer AS cta_clicks,
                   COUNT(*) FILTER (WHERE event.event_type = 'contact_submit')::integer AS contact_submits
            FROM content_article_events event
            WHERE event.post_id = $1
              AND event.occurred_at >= bounds.start_date::timestamptz
              AND event.occurred_at < (bounds.end_date + 1)::timestamptz
          ) events ON TRUE
          LEFT JOIN LATERAL (
            SELECT COALESCE(
              jsonb_agg(jsonb_build_object(
                'query', query_row.query,
                'clicks', query_row.clicks,
                'impressions', query_row.impressions,
                'ctr', query_row.ctr,
                'averagePosition', query_row.average_position
              ) ORDER BY query_row.impressions DESC, query_row.query ASC),
              '[]'::jsonb
            ) AS items
            FROM (
              SELECT metric.query,
                     SUM(metric.clicks)::double precision AS clicks,
                     SUM(metric.impressions)::double precision AS impressions,
                     COALESCE(
                       SUM(metric.clicks) / NULLIF(SUM(metric.impressions), 0),
                       0
                     )::double precision AS ctr,
                     (
                       SUM(metric.average_position * metric.impressions)
                       / NULLIF(SUM(metric.impressions), 0)
                     )::double precision AS average_position
              FROM content_search_metrics metric
              WHERE bounds.kind = 'current'
                AND metric.post_id = $1
                AND metric.metric_date BETWEEN bounds.start_date AND bounds.end_date
              GROUP BY metric.query
              ORDER BY SUM(metric.impressions) DESC, metric.query ASC
              LIMIT 10
            ) query_row
          ) queries ON TRUE
        ),
        packed_windows AS (
          SELECT COALESCE(
                   jsonb_object_agg(days::text, jsonb_build_object(
                     'startDate', start_date,
                     'endDate', end_date,
                     'coverageDayCount', coverage_day_count,
                     'complete', coverage_day_count = days,
                     'impressions', impressions,
                     'clicks', clicks,
                     'ctr', ctr,
                     'averagePosition', average_position,
                     'ctaClicks', cta_clicks,
                     'contactSubmits', contact_submits,
                     'queries', queries
                   )) FILTER (WHERE kind = 'current'),
                   '{}'::jsonb
                 ) AS current_windows,
                 COALESCE(
                   jsonb_object_agg(days::text, jsonb_build_object(
                     'startDate', start_date,
                     'endDate', end_date,
                     'coverageDayCount', coverage_day_count,
                     'complete', coverage_day_count = days,
                     'impressions', impressions,
                     'clicks', clicks,
                     'ctr', ctr,
                     'averagePosition', average_position,
                     'ctaClicks', cta_clicks,
                     'contactSubmits', contact_submits,
                     'queries', queries
                   )) FILTER (WHERE kind = 'previous'),
                   '{}'::jsonb
                 ) AS previous_windows
          FROM window_aggregates
        ),
        cohort_candidates AS (
          SELECT candidate.id,
                 candidate_metadata.content_cluster,
                 CASE
                   WHEN ($2::date - candidate.published_at::date) < 28 THEN 'collecting'
                   WHEN ($2::date - candidate.published_at::date) < 60 THEN '28-59'
                   WHEN ($2::date - candidate.published_at::date) < 120 THEN '60-119'
                   WHEN ($2::date - candidate.published_at::date) < 240 THEN '120-239'
                   ELSE '240-plus'
                 END AS age_bucket,
                 COALESCE(SUM(metric.impressions), 0)::double precision AS impressions,
                 COALESCE(SUM(metric.clicks), 0)::double precision AS clicks,
                 COALESCE(SUM(metric.clicks) / NULLIF(SUM(metric.impressions), 0), 0)::double precision AS ctr
          FROM posts candidate
          LEFT JOIN content_post_metadata candidate_metadata ON candidate_metadata.post_id = candidate.id
          LEFT JOIN content_search_metrics metric
            ON metric.post_id = candidate.id
           AND metric.metric_date BETWEEN ($2::date - 27) AND $2::date
          WHERE candidate.published = TRUE
            AND candidate.published_at IS NOT NULL
            AND candidate.published_at::date <= $2::date
            AND candidate.id <> $1
          GROUP BY candidate.id, candidate.published_at, candidate_metadata.content_cluster
        ),
        cohort_stats AS (
          SELECT target.id,
                 COUNT(*) FILTER (
                   WHERE candidate.age_bucket = target.age_bucket
                     AND target.content_cluster IS NOT NULL
                     AND candidate.content_cluster = target.content_cluster
                 )::integer AS cluster_size,
                 PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY candidate.impressions) FILTER (
                   WHERE candidate.age_bucket = target.age_bucket
                     AND target.content_cluster IS NOT NULL
                     AND candidate.content_cluster = target.content_cluster
                 )::double precision AS cluster_median_impressions,
                 COUNT(*) FILTER (WHERE candidate.age_bucket = target.age_bucket)::integer AS fallback_size,
                 PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY candidate.impressions) FILTER (
                   WHERE candidate.age_bucket = target.age_bucket
                 )::double precision AS fallback_median_impressions
          FROM target
          LEFT JOIN cohort_candidates candidate ON TRUE
          GROUP BY target.id
        )
        SELECT target.id AS "postId",
               target.article_age_days AS "articleAgeDays",
               target.age_bucket AS "ageBucket",
               packed_windows.current_windows AS current,
               packed_windows.previous_windows AS previous,
               jsonb_build_object(
                 'available', CASE
                   WHEN cohort_stats.cluster_size >= 3 THEN TRUE
                   WHEN cohort_stats.fallback_size >= 3 THEN TRUE
                   ELSE FALSE
                 END,
                 'source', CASE
                   WHEN cohort_stats.cluster_size >= 3 THEN 'cluster'
                   WHEN cohort_stats.fallback_size >= 3 THEN 'age_fallback'
                   ELSE 'unavailable'
                 END,
                 'size', CASE
                   WHEN cohort_stats.cluster_size >= 3 THEN cohort_stats.cluster_size
                   ELSE cohort_stats.fallback_size
                 END,
                 'medianImpressions', CASE
                   WHEN cohort_stats.cluster_size >= 3 THEN cohort_stats.cluster_median_impressions
                   ELSE cohort_stats.fallback_median_impressions
                 END
               ) AS cohort
        FROM target
        CROSS JOIN packed_windows
        JOIN cohort_stats ON cohort_stats.id = target.id
      `, [normalizedPostId, normalizedDate]);
      return rows[0] || null;
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
        JSON.stringify(Array.isArray(input.diagnoses) ? input.diagnoses : []),
        JSON.stringify(Array.isArray(input.positiveSignals) ? input.positiveSignals : []),
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

    async getSnapshotForExplanation(snapshotId) {
      const { rows } = await db.query(`
        SELECT snapshot.id,
               snapshot.post_id AS "postId",
               snapshot.evidence_hash AS "evidenceHash",
               snapshot.windows_json AS windows,
               snapshot.previous_windows_json AS "previousWindows",
               snapshot.cohort_json AS cohort,
               snapshot.diagnoses_json AS diagnoses,
               snapshot.positive_signals_json AS "positiveSignals",
               snapshot.explanation_status AS "explanationStatus",
               post.title,
               COALESCE(post.excerpt, post.description, '') AS "shortDescription",
               metadata.content_cluster AS "contentCluster",
               metadata.search_intent AS "searchIntent"
        FROM content_article_performance_snapshots snapshot
        JOIN posts post ON post.id = snapshot.post_id
        LEFT JOIN content_post_metadata metadata ON metadata.post_id = post.id
        WHERE snapshot.id = $1
        LIMIT 1
      `, [positiveInteger(snapshotId, 'snapshotId')]);
      return rows[0] || null;
    },

    async saveSnapshotExplanation({ snapshotId, expectedEvidenceHash, explanation } = {}) {
      const normalizedHash = String(expectedEvidenceHash || '');
      if (!SHA256.test(normalizedHash)) throw new TypeError('Ungültiger Evidenzhash.');
      if (!explanation || typeof explanation !== 'object' || Array.isArray(explanation)) {
        throw new TypeError('Die Erklärung muss ein Objekt sein.');
      }
      const { rows } = await db.query(`
        UPDATE content_article_performance_snapshots
        SET explanation_json = $3::jsonb,
            explanation_status = 'ready',
            updated_at = NOW()
        WHERE id = $1
          AND evidence_hash = $2
          AND explanation_status = 'pending'
        RETURNING id
      `, [
        positiveInteger(snapshotId, 'snapshotId'),
        normalizedHash,
        explanation
      ]);
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
        WHERE occurred_at < $1::timestamptz
        RETURNING id
      `, [beforeDate]);
      return rows.length;
    }
  };
}
