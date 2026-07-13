import pool from '../util/db.js';

const DEFAULT_LIST_LIMIT = 100;

function normalizeLimit(limit) {
  const normalized = limit === undefined ? DEFAULT_LIST_LIMIT : limit;
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('limit muss eine positive sichere Ganzzahl sein.');
  }
  return normalized;
}

function isStructuredJsonValue(value, seen = new Set()) {
  if (value === null) return true;
  if (['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;

  seen.add(value);
  const isValid = Array.isArray(value)
    ? value.every((entry) => isStructuredJsonValue(entry, seen))
    : (
      [Object.prototype, null].includes(Object.getPrototypeOf(value))
      && Object.values(value).every((entry) => isStructuredJsonValue(entry, seen))
    );
  seen.delete(value);
  return isValid;
}

function serializeStructuredJson(value, fieldName) {
  if (!isStructuredJsonValue(value)) {
    throw new TypeError(`${fieldName} muss ein strukturierter JSON-Wert sein.`);
  }
  return JSON.stringify(value);
}

function uniqueByAnalysisKey(opportunities) {
  const unique = new Map();
  for (const opportunity of opportunities) {
    unique.set(opportunity.analysisKey, opportunity);
  }
  return [...unique.values()];
}

export function createContentSearchOpportunityRepository(db = pool) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('Eine Datenbank mit query-Funktion wird benötigt.');
  }

  return {
    async upsertOpenOpportunities(opportunities) {
      const rows = uniqueByAnalysisKey(
        Array.isArray(opportunities) ? opportunities : []
      );
      if (rows.length === 0) return [];

      const params = [
        rows.map((opportunity) => opportunity.postId),
        rows.map((opportunity) => opportunity.analysisKey),
        rows.map((opportunity) => opportunity.opportunityType),
        rows.map((opportunity) => opportunity.primaryQuery),
        rows.map((opportunity) => opportunity.score),
        rows.map((opportunity) => (
          serializeStructuredJson(opportunity.evidenceJson, 'evidenceJson')
        )),
        rows.map((opportunity) => (
          serializeStructuredJson(opportunity.recommendationJson, 'recommendationJson')
        ))
      ];
      const { rows: persistedRows } = await db.query(
        `
          INSERT INTO content_opportunities (
            post_id,
            analysis_key,
            opportunity_type,
            primary_query,
            score,
            evidence_json,
            recommendation_json
          )
          SELECT *
          FROM UNNEST(
            $1::integer[],
            $2::varchar[],
            $3::varchar[],
            $4::text[],
            $5::numeric[],
            $6::jsonb[],
            $7::jsonb[]
          )
          ON CONFLICT (analysis_key) DO UPDATE
          SET score = EXCLUDED.score,
              evidence_json = EXCLUDED.evidence_json,
              recommendation_json = EXCLUDED.recommendation_json,
              status = 'open',
              resolved_at = NULL
          RETURNING *
        `,
        params
      );

      return persistedRows;
    },

    async listOpenOpportunities(limit) {
      const normalizedLimit = normalizeLimit(limit);
      const { rows } = await db.query(
        `
          SELECT *
          FROM content_opportunities
          WHERE status = 'open'
          ORDER BY score DESC, created_at DESC, id DESC
          LIMIT $1
        `,
        [normalizedLimit]
      );

      return rows;
    }
  };
}
