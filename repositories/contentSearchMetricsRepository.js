import pool from '../util/db.js';
import { DateTime } from 'luxon';

const CANONICAL_BLOG_PATH = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function blogPathsBySlug(paths) {
  const result = new Map();

  for (const path of Array.isArray(paths) ? paths : []) {
    const match = typeof path === 'string' ? CANONICAL_BLOG_PATH.exec(path) : null;
    if (match && !result.has(match[1])) {
      result.set(match[1], path);
    }
  }

  return result;
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null) return null;

  const normalized = Number(limit);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('limit muss eine positive Ganzzahl sein.');
  }
  return normalized;
}

function normalizeTopicSignalLimit(limit) {
  const normalized = Number(limit ?? 300);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('limit muss eine positive Ganzzahl sein.');
  }
  return Math.min(normalized, 500);
}

function normalizePositiveId(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${label} muss eine positive Ganzzahl sein.`);
  }
  return normalized;
}

function normalizeOptionalDate(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new TypeError(`${label} muss ein gültiges ISO-Datum sein.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${label} muss ein gültiges ISO-Datum sein.`);
  }
  return value;
}

function normalizePageSignalLimit(value) {
  const normalized = Number(value ?? 20);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('limit muss eine positive Ganzzahl sein.');
  }
  return Math.min(normalized, 100);
}

function normalizeOutcomeDays(value) {
  const normalized = Number(value ?? 28);
  if (!Number.isSafeInteger(normalized) || normalized <= 0 || normalized > 28) {
    throw new TypeError('days muss zwischen 1 und 28 liegen.');
  }
  return normalized;
}

function normalizeOutcomeQueryLimit(value) {
  const normalized = Number(value ?? 10);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('queryLimit muss eine positive Ganzzahl sein.');
  }
  return Math.min(normalized, 10);
}

function requireQueryClient(value) {
  if (!value || typeof value.query !== 'function') {
    throw new TypeError('Eine Datenbanktransaktion mit query-Funktion wird benötigt.');
  }
  return value;
}

const OUTCOME_METRICS_CTES = `
  coverage_summary AS (
    SELECT outcome_window.start_date,
           outcome_window.end_date,
           COUNT(coverage.metric_date)::integer AS coverage_day_count
    FROM outcome_window
    LEFT JOIN content_search_metric_sync_days coverage
      ON coverage.metric_date BETWEEN outcome_window.start_date AND outcome_window.end_date
    GROUP BY outcome_window.start_date, outcome_window.end_date
  ),
  metric_totals AS (
    SELECT outcome_window.start_date,
           outcome_window.end_date,
           COUNT(metric.id)::integer AS metric_row_count,
           COALESCE(SUM(metric.clicks), 0)::double precision AS clicks,
           COALESCE(SUM(metric.impressions), 0)::double precision AS impressions,
           (
             COALESCE(SUM(metric.clicks), 0)
             / NULLIF(COALESCE(SUM(metric.impressions), 0), 0)
           )::double precision AS ctr,
           (
             SUM(metric.average_position * metric.impressions)
             / NULLIF(SUM(metric.impressions), 0)
           )::double precision AS average_position
    FROM outcome_window
    LEFT JOIN content_search_metrics metric
      ON metric.post_id = $1::integer
     AND metric.metric_date BETWEEN outcome_window.start_date AND outcome_window.end_date
    GROUP BY outcome_window.start_date, outcome_window.end_date
  ),
  query_metrics AS (
    SELECT metric.query,
           SUM(metric.clicks)::double precision AS clicks,
           SUM(metric.impressions)::double precision AS impressions,
           (
             SUM(metric.clicks) / NULLIF(SUM(metric.impressions), 0)
           )::double precision AS ctr,
           (
             SUM(metric.average_position * metric.impressions)
             / NULLIF(SUM(metric.impressions), 0)
           )::double precision AS average_position
    FROM outcome_window
    JOIN content_search_metrics metric
      ON metric.post_id = $1::integer
     AND metric.metric_date BETWEEN outcome_window.start_date AND outcome_window.end_date
    GROUP BY metric.query
  ),
  limited_queries AS (
    SELECT query, clicks, impressions, ctr, average_position
    FROM query_metrics
    ORDER BY impressions DESC, query ASC
    LIMIT __QUERY_LIMIT__::integer
  ),
  query_list AS (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object(
        'query', query,
        'clicks', clicks,
        'impressions', impressions,
        'ctr', ctr,
        'averagePosition', average_position
      ) ORDER BY impressions DESC, query ASC),
      '[]'::jsonb
    ) AS queries
    FROM limited_queries
  )
`;

function outcomeMetricsSelect() {
  return `
    SELECT coverage_summary.start_date::text AS "startDate",
           coverage_summary.end_date::text AS "endDate",
           coverage_summary.coverage_day_count AS "coverageDayCount",
           (metric_totals.metric_row_count > 0) AS "hasData",
           metric_totals.clicks,
           metric_totals.impressions,
           COALESCE(metric_totals.ctr, 0)::double precision AS ctr,
           metric_totals.average_position AS "averagePosition",
           query_list.queries
    FROM coverage_summary
    JOIN metric_totals
      ON metric_totals.start_date = coverage_summary.start_date
     AND metric_totals.end_date = coverage_summary.end_date
    CROSS JOIN query_list
  `;
}

export function createContentSearchMetricsRepository(db = pool) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('Eine Datenbank mit query-Funktion wird benötigt.');
  }

  return {
    async findPostIdsByCanonicalPaths(paths) {
      const pathsBySlug = blogPathsBySlug(paths);
      const slugs = [...pathsBySlug.keys()];
      if (slugs.length === 0) return new Map();

      const { rows } = await db.query(
        'SELECT id, slug FROM posts WHERE slug = ANY($1::text[])',
        [slugs]
      );
      const postIdBySlug = new Map(rows.map((row) => [row.slug, row.id]));

      return new Map(
        [...pathsBySlug].flatMap(([slug, path]) => (
          postIdBySlug.has(slug) ? [[path, postIdBySlug.get(slug)]] : []
        ))
      );
    },

    async upsertSearchMetrics(rows) {
      const metrics = Array.isArray(rows) ? rows : [];
      if (metrics.length === 0) return [];

      const params = [
        metrics.map((row) => row.postId ?? null),
        metrics.map((row) => row.metricDate),
        metrics.map((row) => row.pageUrl),
        metrics.map((row) => row.query),
        metrics.map((row) => row.device),
        metrics.map((row) => row.clicks),
        metrics.map((row) => row.impressions),
        metrics.map((row) => row.ctr),
        metrics.map((row) => row.averagePosition)
      ];
      const result = await db.query(
        `
          INSERT INTO content_search_metrics (
            post_id,
            metric_date,
            page_url,
            query,
            device,
            clicks,
            impressions,
            ctr,
            average_position
          )
          SELECT *
          FROM UNNEST(
            $1::integer[],
            $2::date[],
            $3::text[],
            $4::text[],
            $5::varchar[],
            $6::numeric[],
            $7::numeric[],
            $8::numeric[],
            $9::numeric[]
          )
          ON CONFLICT (metric_date, page_url, query, device) DO UPDATE
          SET post_id = COALESCE(EXCLUDED.post_id, content_search_metrics.post_id),
              clicks = EXCLUDED.clicks,
              impressions = EXCLUDED.impressions,
              ctr = EXCLUDED.ctr,
              average_position = EXCLUDED.average_position,
              fetched_at = NOW()
          RETURNING *
        `,
        params
      );

      return result.rows;
    },

    async recordSyncCoverage({ startDate, endDate } = {}) {
      const normalizedStartDate = normalizeOptionalDate(startDate, 'startDate');
      const normalizedEndDate = normalizeOptionalDate(endDate, 'endDate');
      if (!normalizedStartDate || !normalizedEndDate || normalizedStartDate > normalizedEndDate) {
        throw new TypeError('Für die Sync-Abdeckung wird ein gültiger Zeitraum benötigt.');
      }
      const { rows } = await db.query(`
        INSERT INTO content_search_metric_sync_days (metric_date, synced_at)
        SELECT day::date, NOW()
        FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS day
        ON CONFLICT (metric_date) DO UPDATE
        SET synced_at = NOW()
        RETURNING metric_date
      `, [normalizedStartDate, normalizedEndDate]);
      return rows;
    },

    async listAggregatedMetrics({ startDate, endDate, limit } = {}) {
      const normalizedLimit = normalizeLimit(limit);
      const params = [startDate, endDate];
      const limitClause = normalizedLimit === null ? '' : 'LIMIT $3';
      if (normalizedLimit !== null) params.push(normalizedLimit);

      const { rows } = await db.query(
        `
          SELECT
            post_id AS "postId",
            page_url AS "pageUrl",
            query,
            SUM(clicks)::double precision AS clicks,
            SUM(impressions)::double precision AS impressions,
            (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
            (
              SUM(average_position * impressions)
              / NULLIF(SUM(impressions), 0)
            )::double precision AS "averagePosition"
          FROM content_search_metrics
          WHERE metric_date BETWEEN $1::date AND $2::date
          GROUP BY post_id, page_url, query
          ORDER BY SUM(impressions) DESC, page_url ASC, query ASC
          ${limitClause}
        `,
        params
      );

      return rows;
    },

    async getLatestTopicSignals({ limit } = {}) {
      const normalizedLimit = normalizeTopicSignalLimit(limit);
      const rangeResult = await db.query(`
        SELECT
          (MAX(metric_date) - INTERVAL '27 days')::date AS start_date,
          MAX(metric_date)::date AS end_date
        FROM content_search_metrics
      `);
      const range = rangeResult.rows[0];
      if (!range?.start_date || !range?.end_date) {
        return { range: null, pages: [], metrics: [] };
      }

      const [pagesResult, metricsResult] = await Promise.all([
        db.query(`
          SELECT page_url,
                 SUM(clicks)::double precision AS clicks,
                 SUM(impressions)::double precision AS impressions,
                 (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
                 (
                   SUM(average_position * impressions)
                   / NULLIF(SUM(impressions), 0)
                 )::double precision AS average_position
          FROM content_search_metrics
          WHERE metric_date BETWEEN $1::date AND $2::date
          GROUP BY page_url
          ORDER BY SUM(impressions) DESC, page_url ASC
        `, [range.start_date, range.end_date]),
        db.query(`
          SELECT page_url, query,
                 SUM(clicks)::double precision AS clicks,
                 SUM(impressions)::double precision AS impressions,
                 (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
                 (
                   SUM(average_position * impressions)
                   / NULLIF(SUM(impressions), 0)
                 )::double precision AS average_position
          FROM content_search_metrics
          WHERE metric_date BETWEEN $1::date AND $2::date
          GROUP BY page_url, query
          ORDER BY SUM(impressions) DESC, page_url ASC, query ASC
          LIMIT $3
        `, [range.start_date, range.end_date, normalizedLimit])
      ]);

      return {
        range,
        pages: pagesResult.rows,
        metrics: metricsResult.rows
      };
    },

    async getPageSignals({ postId, startDate = null, endDate = null, limit = 20 } = {}) {
      const normalizedPostId = normalizePositiveId(postId, 'postId');
      const normalizedStartDate = normalizeOptionalDate(startDate, 'startDate');
      const normalizedEndDate = normalizeOptionalDate(endDate, 'endDate');
      if (normalizedStartDate && normalizedEndDate && normalizedStartDate > normalizedEndDate) {
        throw new TypeError('startDate darf nicht nach endDate liegen.');
      }
      const normalizedLimit = normalizePageSignalLimit(limit);
      const { rows } = await db.query(`
        SELECT query,
               SUM(clicks)::double precision AS clicks,
               SUM(impressions)::double precision AS impressions,
               (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
               (
                 SUM(average_position * impressions)
                 / NULLIF(SUM(impressions), 0)
               )::double precision AS average_position,
               MIN(metric_date)::date AS start_date,
               MAX(metric_date)::date AS end_date
        FROM content_search_metrics
        WHERE post_id = $1::integer
          AND ($2::date IS NULL OR metric_date >= $2::date)
          AND ($3::date IS NULL OR metric_date <= $3::date)
        GROUP BY query
        ORDER BY SUM(impressions) DESC, query ASC
        LIMIT $4::integer
      `, [normalizedPostId, normalizedStartDate, normalizedEndDate, normalizedLimit]);
      return rows;
    },

    async getLatestCompletePageMetrics({
      postId,
      throughDate,
      days = 28,
      queryLimit = 10
    } = {}, queryClient) {
      const normalizedPostId = normalizePositiveId(postId, 'postId');
      const normalizedThroughDate = normalizeOptionalDate(throughDate, 'throughDate');
      if (!normalizedThroughDate) throw new TypeError('throughDate wird benötigt.');
      const normalizedDays = normalizeOutcomeDays(days);
      const normalizedQueryLimit = normalizeOutcomeQueryLimit(queryLimit);
      const client = requireQueryClient(queryClient);
      const ctes = OUTCOME_METRICS_CTES.replace('__QUERY_LIMIT__', '$4');
      const { rows } = await client.query(`
        WITH outcome_window AS (
          SELECT candidate_end.metric_date - ($3::integer - 1) AS start_date,
                 candidate_end.metric_date AS end_date
          FROM content_search_metric_sync_days candidate_end
          WHERE candidate_end.metric_date <= $2::date
            AND (
              SELECT COUNT(*)
              FROM content_search_metric_sync_days covered_day
              WHERE covered_day.metric_date BETWEEN
                candidate_end.metric_date - ($3::integer - 1)
                AND candidate_end.metric_date
            ) = $3::integer
          ORDER BY candidate_end.metric_date DESC
          LIMIT 1
        ),
        ${ctes}
        ${outcomeMetricsSelect()}
      `, [normalizedPostId, normalizedThroughDate, normalizedDays, normalizedQueryLimit]);
      return rows[0] || null;
    },

    async getPageOutcomeMetrics({
      postId,
      startDate,
      endDate,
      days = 28,
      queryLimit = 10
    } = {}) {
      const normalizedPostId = normalizePositiveId(postId, 'postId');
      const normalizedStartDate = normalizeOptionalDate(startDate, 'startDate');
      const normalizedEndDate = normalizeOptionalDate(endDate, 'endDate');
      const normalizedDays = normalizeOutcomeDays(days);
      if (!normalizedStartDate || !normalizedEndDate || normalizedStartDate > normalizedEndDate) {
        throw new TypeError('Für die Nachmessung wird ein gültiger Zeitraum benötigt.');
      }
      const expectedEndDate = DateTime.fromISO(normalizedStartDate, { zone: 'UTC' })
        .plus({ days: normalizedDays - 1 })
        .toISODate();
      if (expectedEndDate !== normalizedEndDate) {
        throw new TypeError('Der Nachmessungszeitraum stimmt nicht mit days überein.');
      }
      const normalizedQueryLimit = normalizeOutcomeQueryLimit(queryLimit);
      const ctes = OUTCOME_METRICS_CTES.replace('__QUERY_LIMIT__', '$5');
      const { rows } = await db.query(`
        WITH outcome_window AS (
          SELECT $2::date AS start_date, $3::date AS end_date
          WHERE ($3::date - $2::date + 1) = $4::integer
        ),
        ${ctes}
        ${outcomeMetricsSelect()}
      `, [
        normalizedPostId,
        normalizedStartDate,
        normalizedEndDate,
        normalizedDays,
        normalizedQueryLimit
      ]);
      return rows[0] || null;
    }
  };
}
