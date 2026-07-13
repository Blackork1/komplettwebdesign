import pool from '../util/db.js';

const CANONICAL_BLOG_PATH = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

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
    }
  };
}
