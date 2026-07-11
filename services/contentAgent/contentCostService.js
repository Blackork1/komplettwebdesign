import pool from '../../util/db.js';

function nonNegativeNumber(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${name} muss eine nichtnegative Zahl sein.`);
  }
  return number;
}

export function estimateTextCost({ usage = {}, inputRate = 0, outputRate = 0 }) {
  const inputTokens = nonNegativeNumber(usage.input_tokens ?? usage.inputTokens, 'input_tokens');
  const outputTokens = nonNegativeNumber(usage.output_tokens ?? usage.outputTokens, 'output_tokens');
  const normalizedInputRate = nonNegativeNumber(inputRate, 'inputRate');
  const normalizedOutputRate = nonNegativeNumber(outputRate, 'outputRate');
  return (inputTokens * normalizedInputRate + outputTokens * normalizedOutputRate) / 1_000_000;
}

export function assertMonthlyBudget({ spent = 0, estimatedNext = 0, limit }) {
  const normalizedSpent = nonNegativeNumber(spent, 'spent');
  const normalizedNext = nonNegativeNumber(estimatedNext, 'estimatedNext');
  const normalizedLimit = nonNegativeNumber(limit, 'limit');
  if (normalizedSpent + normalizedNext > normalizedLimit + Number.EPSILON) {
    throw new Error('Monatliches Content-Agent-Budget erreicht.');
  }
}

function monthContext(now) {
  const current = new Date(now ?? Date.now());
  if (Number.isNaN(current.getTime())) throw new TypeError('now muss ein gültiges Datum sein.');
  const reservationMonth = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    reservationMonth,
    lockKey: `content-agent-budget:${reservationMonth}`
  };
}

function contextFromReservationMonth(reservationMonth) {
  if (typeof reservationMonth !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(reservationMonth)) {
    throw new TypeError('reservationMonth muss das Format YYYY-MM verwenden.');
  }
  return {
    reservationMonth,
    lockKey: `content-agent-budget:${reservationMonth}`
  };
}

function normalizeStageId(stageId) {
  const normalized = typeof stageId === 'string' ? stageId.trim() : '';
  if (!normalized) throw new TypeError('stageId muss eine nichtleere Zeichenfolge sein.');
  return normalized;
}

function reservationKey(reservationMonth, stageId) {
  return `budget:${reservationMonth}:${normalizeStageId(stageId)}`;
}

function existingReservationEntry(stageResults, stageId) {
  const normalizedStageId = normalizeStageId(stageId);
  const matches = Object.entries(stageResults || {}).filter(([key]) => {
    const match = /^budget:(\d{4}-(?:0[1-9]|1[0-2])):(.+)$/.exec(key);
    return match?.[2] === normalizedStageId;
  });
  if (matches.length > 1) {
    throw new Error('Für diese Content-Agent-Stufe existieren mehrere Budgetreservierungen.');
  }
  return matches[0] || null;
}

const MONTHLY_SPEND_SQL = `
  SELECT COALESCE(SUM(
    CASE
      WHEN budget.value->>'status' = 'settled'
        THEN COALESCE((budget.value->>'actualCost')::numeric, 0)
      ELSE COALESCE((budget.value->>'reservedCost')::numeric, 0)
    END
  ), 0) AS spent
  FROM content_runs
  CROSS JOIN LATERAL jsonb_each(stage_results_json) AS budget(key, value)
  WHERE budget.key LIKE $1
    AND budget.value->>'reservationMonth' = $2
`;

export async function getMonthlyContentCost({ now = new Date(), db = pool } = {}) {
  const context = monthContext(now);
  const { rows } = await db.query(
    MONTHLY_SPEND_SQL,
    [`budget:${context.reservationMonth}:%`, context.reservationMonth]
  );
  return Number(rows[0]?.spent || 0);
}

async function rollbackQuietly(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Der ursprüngliche Transaktionsfehler bleibt maßgeblich.
  }
}

async function beginBudgetTransaction(db, context) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [context.lockKey]);
    return client;
  } catch (error) {
    await rollbackQuietly(client);
    client.release();
    throw error;
  }
}

export async function reserveMonthlyBudget({
  runId,
  stageId,
  estimatedCost,
  limit,
  now = new Date(),
  db = pool
}) {
  const cost = nonNegativeNumber(estimatedCost, 'estimatedCost');
  const normalizedLimit = nonNegativeNumber(limit, 'limit');
  const context = monthContext(now);
  const key = reservationKey(context.reservationMonth, stageId);
  const client = await beginBudgetTransaction(db, context);
  try {
    const { rows: runRows } = await client.query(
      'SELECT stage_results_json, cost_estimate FROM content_runs WHERE id = $1 FOR UPDATE',
      [runId]
    );
    const run = runRows[0];
    if (!run) throw new Error('Content-Agent-Lauf wurde nicht gefunden.');
    const existingEntry = existingReservationEntry(run.stage_results_json, stageId);
    if (existingEntry) {
      const [existingKey, existing] = existingEntry;
      await client.query('COMMIT');
      return {
        ...existing,
        created: false,
        reservationKey: existingKey
      };
    }

    const { rows: sumRows } = await client.query(
      MONTHLY_SPEND_SQL,
      [`budget:${context.reservationMonth}:%`, context.reservationMonth]
    );
    const spent = Number(sumRows[0]?.spent || 0);
    assertMonthlyBudget({ spent, estimatedNext: cost, limit: normalizedLimit });

    const reservation = {
      status: 'reserved',
      reservationMonth: context.reservationMonth,
      reservedCost: cost
    };
    await client.query(
      `
        UPDATE content_runs
        SET stage_results_json = stage_results_json || jsonb_build_object($2, $3::jsonb),
            cost_estimate = cost_estimate + $4
        WHERE id = $1 AND NOT stage_results_json ? $2
        RETURNING *
      `,
      [runId, key, reservation, cost]
    );
    await client.query('COMMIT');
    return {
      created: true,
      reservationKey: key,
      ...reservation
    };
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function settleMonthlyBudget({
  runId,
  stageId,
  reservationMonth,
  actualCost,
  db = pool
}) {
  const cost = nonNegativeNumber(actualCost, 'actualCost');
  const context = contextFromReservationMonth(reservationMonth);
  const key = reservationKey(context.reservationMonth, stageId);
  const client = await beginBudgetTransaction(db, context);
  try {
    const { rows: runRows } = await client.query(
      'SELECT stage_results_json, cost_estimate FROM content_runs WHERE id = $1 FOR UPDATE',
      [runId]
    );
    const reservation = runRows[0]?.stage_results_json?.[key];
    if (!reservation) throw new Error('Für diese Content-Agent-Stufe existiert keine Budgetreservierung.');
    if (reservation.status === 'settled') {
      await client.query('COMMIT');
      return { reservationKey: key, ...reservation, idempotent: true };
    }
    if (reservation.reservationMonth !== context.reservationMonth) {
      throw new Error('Die Budgetreservierung gehört zu einem anderen Monat.');
    }

    const reservedCost = nonNegativeNumber(reservation.reservedCost, 'reservedCost');
    const settled = {
      status: 'settled',
      reservationMonth: context.reservationMonth,
      reservedCost,
      actualCost: cost
    };
    await client.query(
      `
        UPDATE content_runs
        SET stage_results_json = stage_results_json || jsonb_build_object($2, $3::jsonb),
            cost_estimate = GREATEST(0, cost_estimate - $4 + $5)
        WHERE id = $1
        RETURNING *
      `,
      [runId, key, settled, reservedCost, cost]
    );
    await client.query('COMMIT');
    return { reservationKey: key, ...settled };
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function getPersistedStageResult({ runId, stageId, db = pool }) {
  const normalizedStageId = normalizeStageId(stageId);
  const { rows } = await db.query(
    'SELECT stage_results_json -> $2 AS stage_result FROM content_runs WHERE id = $1',
    [runId, normalizedStageId]
  );
  return rows[0]?.stage_result ?? null;
}
