import { types } from 'node:util';

import pool from '../util/db.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ASCII_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertNonEmptyString(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new TypeError(`${field} ist ungültig.`);
  }
}

function assertPositiveId(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} muss eine positive sichere Ganzzahl sein.`);
  }
}

function serializeJson(value, field) {
  const seen = new Set();
  function inspect(entry) {
    if (entry === null || ['string', 'boolean'].includes(typeof entry)) return true;
    if (typeof entry === 'number') return Number.isFinite(entry);
    if (typeof entry !== 'object' || types.isProxy(entry) || seen.has(entry)) return false;
    const prototype = Object.getPrototypeOf(entry);
    if (![Object.prototype, Array.prototype, null].includes(prototype)) return false;
    const descriptors = Object.getOwnPropertyDescriptors(entry);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key === 'symbol')) return false;
    seen.add(entry);
    for (const descriptor of Object.values(descriptors)) {
      if ('get' in descriptor || 'set' in descriptor || !inspect(descriptor.value)) {
        seen.delete(entry);
        return false;
      }
    }
    seen.delete(entry);
    return true;
  }

  if (!inspect(value)) throw new TypeError(`${field} muss ein strukturierter JSON-Wert sein.`);
  return JSON.stringify(value);
}

function validateIdentity({ weekStart, timezone }) {
  if (typeof weekStart !== 'string' || !ISO_DATE.test(weekStart)) {
    throw new TypeError('weekStart muss ein ISO-Datum sein.');
  }
  assertNonEmptyString(timezone, 'timezone', 64);
}

function mapSelection(row) {
  return {
    candidateSlug: row.candidate_slug,
    generationRunId: Number(row.generation_run_id),
    selectedAt: row.selected_at
  };
}

function mapPool(row, selections) {
  if (!row) return null;
  return {
    id: Number(row.id),
    weekStart: row.week_start instanceof Date
      ? row.week_start.toISOString().slice(0, 10)
      : String(row.week_start),
    timezone: row.timezone,
    candidates: row.candidates_json,
    sourceReferences: row.source_references_json,
    responseId: row.response_id,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    selections: selections.map(mapSelection)
  };
}

function mapResearchAttempt(row, generationRunId) {
  if (!row) return null;
  const ownerGenerationRunId = Number(row.owner_generation_run_id);
  return {
    weekStart: row.week_start instanceof Date
      ? row.week_start.toISOString().slice(0, 10)
      : String(row.week_start),
    timezone: row.timezone,
    ownerGenerationRunId,
    status: row.status,
    responseId: row.response_id,
    errorCode: row.error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acquired: ownerGenerationRunId === generationRunId && row.status === 'reserved'
  };
}

export function createContentWeeklyTopicPoolRepository(db = pool) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('Eine Datenbank mit query-Funktion wird benötigt.');
  }

  async function loadSelections(poolId) {
    const { rows } = await db.query(
      `
        SELECT candidate_slug, generation_run_id, selected_at
        FROM content_weekly_topic_pool_selections
        WHERE pool_id = $1
        ORDER BY selected_at ASC, candidate_slug ASC
      `,
      [poolId]
    );
    return rows;
  }

  return {
    async findPool(identity) {
      validateIdentity(identity);
      const { rows } = await db.query(
        `
          SELECT *
          FROM content_weekly_topic_pools
          WHERE week_start = $1
            AND timezone = $2
          LIMIT 1
        `,
        [identity.weekStart, identity.timezone]
      );
      if (!rows[0]) return null;
      return mapPool(rows[0], await loadSelections(rows[0].id));
    },

    async createPool({
      weekStart,
      timezone,
      candidates,
      sourceReferences,
      responseId = null,
      promptVersion
    }) {
      validateIdentity({ weekStart, timezone });
      if (!Array.isArray(candidates) || candidates.length === 0 || candidates.length > 20) {
        throw new TypeError('candidates muss ein JSON-Array mit einem bis 20 Einträgen sein.');
      }
      if (!Array.isArray(sourceReferences)
          || sourceReferences.length < 2
          || sourceReferences.length > 6) {
        throw new TypeError('sourceReferences muss zwei bis sechs Einträge enthalten.');
      }
      if (responseId !== null) assertNonEmptyString(responseId, 'responseId', 128);
      assertNonEmptyString(promptVersion, 'promptVersion', 80);

      const candidatesJson = serializeJson(candidates, 'candidates');
      const sourceReferencesJson = serializeJson(sourceReferences, 'sourceReferences');
      const inserted = await db.query(
        `
          INSERT INTO content_weekly_topic_pools (
            week_start,
            timezone,
            candidates_json,
            source_references_json,
            response_id,
            prompt_version
          )
          VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
          ON CONFLICT (week_start, timezone) DO NOTHING
          RETURNING *
        `,
        [
          weekStart,
          timezone,
          candidatesJson,
          sourceReferencesJson,
          responseId,
          promptVersion
        ]
      );
      let row = inserted.rows[0];
      if (!row) {
        const existing = await db.query(
          `
            SELECT *
            FROM content_weekly_topic_pools
            WHERE week_start = $1
              AND timezone = $2
            LIMIT 1
          `,
          [weekStart, timezone]
        );
        row = existing.rows[0];
      }
      if (!row) throw new Error('Der Wochenpool konnte nicht gespeichert werden.');
      return mapPool(row, await loadSelections(row.id));
    },

    async withPoolCreationLock(identity, callback) {
      validateIdentity(identity);
      if (typeof callback !== 'function') {
        throw new TypeError('callback muss eine Funktion sein.');
      }
      if (typeof db.connect !== 'function') {
        throw new TypeError('Die Datenbank muss für den Wochenlock connect unterstützen.');
      }

      const client = await db.connect();
      const lockIdentity = `${identity.weekStart}|${identity.timezone}`;
      let locked = false;
      let callbackError = null;
      let unlockError = null;
      try {
        await client.query(
          "SELECT pg_advisory_lock(hashtext('kwd_weekly_topic_pool'), hashtext($1))",
          [lockIdentity]
        );
        locked = true;
        return await callback(createContentWeeklyTopicPoolRepository(client));
      } catch (error) {
        callbackError = error;
        throw error;
      } finally {
        if (locked) {
          try {
            await client.query(
              "SELECT pg_advisory_unlock(hashtext('kwd_weekly_topic_pool'), hashtext($1))",
              [lockIdentity]
            );
          } catch (error) {
            unlockError = error;
          }
        }
        client.release(unlockError || undefined);
        if (unlockError && !callbackError) throw unlockError;
      }
    },

    async claimResearchAttempt({ weekStart, timezone, generationRunId }) {
      validateIdentity({ weekStart, timezone });
      assertPositiveId(generationRunId, 'generationRunId');
      await db.query(
        `
          INSERT INTO content_weekly_topic_research_attempts (
            week_start,
            timezone,
            owner_generation_run_id,
            status
          )
          VALUES ($1, $2, $3, 'reserved')
          ON CONFLICT (week_start, timezone) DO NOTHING
        `,
        [weekStart, timezone, generationRunId]
      );
      const { rows } = await db.query(
        `
          SELECT *
          FROM content_weekly_topic_research_attempts
          WHERE week_start = $1
            AND timezone = $2
          LIMIT 1
        `,
        [weekStart, timezone]
      );
      if (!rows[0]) throw new Error('Der dauerhafte Wochenrechercheversuch fehlt.');
      return mapResearchAttempt(rows[0], generationRunId);
    },

    async markResearchAttempt({
      weekStart,
      timezone,
      generationRunId,
      status,
      responseId = null,
      errorCode = null
    }) {
      validateIdentity({ weekStart, timezone });
      assertPositiveId(generationRunId, 'generationRunId');
      if (!['completed', 'needs_manual_attention'].includes(status)) {
        throw new TypeError('status ist für den Wochenrechercheversuch ungültig.');
      }
      if (responseId !== null) assertNonEmptyString(responseId, 'responseId', 128);
      if (errorCode !== null) assertNonEmptyString(errorCode, 'errorCode', 500);
      const { rows } = await db.query(
        `
          UPDATE content_weekly_topic_research_attempts
          SET status = $4,
              response_id = $5,
              error_code = $6,
              updated_at = NOW()
          WHERE week_start = $1
            AND timezone = $2
            AND owner_generation_run_id = $3
          RETURNING *
        `,
        [weekStart, timezone, generationRunId, status, responseId, errorCode]
      );
      if (!rows[0]) throw new Error('Der Wochenrechercheversuch konnte nicht aktualisiert werden.');
      return mapResearchAttempt(rows[0], generationRunId);
    },

    async releaseResearchAttempt({ weekStart, timezone, generationRunId }) {
      validateIdentity({ weekStart, timezone });
      assertPositiveId(generationRunId, 'generationRunId');
      const { rows } = await db.query(
        `
          DELETE FROM content_weekly_topic_research_attempts
          WHERE week_start = $1
            AND timezone = $2
            AND owner_generation_run_id = $3
            AND status = 'reserved'
          RETURNING owner_generation_run_id
        `,
        [weekStart, timezone, generationRunId]
      );
      return Number(rows[0]?.owner_generation_run_id) === generationRunId;
    },

    async claimCandidate({ poolId, candidateSlug, generationRunId }) {
      assertPositiveId(poolId, 'poolId');
      assertPositiveId(generationRunId, 'generationRunId');
      if (typeof candidateSlug !== 'string' || !ASCII_SLUG.test(candidateSlug)) {
        throw new TypeError('candidateSlug muss ein gültiger ASCII-Slug sein.');
      }

      const { rows } = await db.query(
        `
          INSERT INTO content_weekly_topic_pool_selections (
            pool_id,
            candidate_slug,
            generation_run_id
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (pool_id, candidate_slug) DO NOTHING
          RETURNING candidate_slug
        `,
        [poolId, candidateSlug, generationRunId]
      );
      if (rows[0]) return true;

      const existing = await db.query(
        `
          SELECT generation_run_id
          FROM content_weekly_topic_pool_selections
          WHERE pool_id = $1
            AND candidate_slug = $2
          LIMIT 1
        `,
        [poolId, candidateSlug]
      );
      return Number(existing.rows[0]?.generation_run_id) === generationRunId;
    }
  };
}
