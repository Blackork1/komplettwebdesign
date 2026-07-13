import { types } from 'node:util';

import pool from '../util/db.js';

const DEFAULT_LIST_LIMIT = 100;
const INVALID_JSON_VALUE = Symbol('invalid-json-value');

function normalizeLimit(limit) {
  const normalized = limit === undefined ? DEFAULT_LIST_LIMIT : limit;
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('limit muss eine positive sichere Ganzzahl sein.');
  }
  return normalized;
}

function hasExecutableToJSON(prototype) {
  let current = prototype;

  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, 'toJSON');
    if (
      descriptor
      && (
        typeof descriptor.value === 'function'
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
      )
    ) {
      return true;
    }
    current = Object.getPrototypeOf(current);
  }

  return false;
}

function isArrayIndex(key, length) {
  const index = Number(key);
  return Number.isInteger(index)
    && index >= 0
    && index < length
    && String(index) === key;
}

function cloneStructuredJsonValue(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : INVALID_JSON_VALUE;
  }
  if (typeof value !== 'object') {
    return INVALID_JSON_VALUE;
  }
  if (types.isProxy(value) || seen.has(value)) {
    return INVALID_JSON_VALUE;
  }

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  const allowedPrototypes = isArray
    ? [Array.prototype, null]
    : [Object.prototype, null];
  if (!allowedPrototypes.includes(prototype) || hasExecutableToJSON(prototype)) {
    return INVALID_JSON_VALUE;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key === 'symbol')) {
    return INVALID_JSON_VALUE;
  }
  const arrayLength = isArray ? descriptors.length?.value : null;
  if (isArray && !Number.isSafeInteger(arrayLength)) {
    return INVALID_JSON_VALUE;
  }

  seen.add(value);
  const clone = isArray ? new Array(arrayLength) : Object.create(null);
  if (isArray) Object.setPrototypeOf(clone, null);

  for (const key of keys) {
    const descriptor = descriptors[key];
    if ('get' in descriptor || 'set' in descriptor) {
      seen.delete(value);
      return INVALID_JSON_VALUE;
    }

    const clonedEntry = cloneStructuredJsonValue(descriptor.value, seen);
    if (clonedEntry === INVALID_JSON_VALUE) {
      seen.delete(value);
      return INVALID_JSON_VALUE;
    }

    if (isArray) {
      if (isArrayIndex(key, arrayLength)) clone[key] = clonedEntry;
    } else if (descriptor.enumerable) {
      Object.defineProperty(clone, key, {
        value: clonedEntry,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
  }

  seen.delete(value);
  return clone;
}

function serializeStructuredJson(value, fieldName) {
  const structuredClone = cloneStructuredJsonValue(value);
  if (structuredClone === INVALID_JSON_VALUE) {
    throw new TypeError(`${fieldName} muss ein strukturierter JSON-Wert sein.`);
  }
  return JSON.stringify(structuredClone);
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
