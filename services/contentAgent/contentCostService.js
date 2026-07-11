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

export async function getMonthlyContentCost({ now = new Date(), db = pool } = {}) {
  const current = new Date(now);
  if (Number.isNaN(current.getTime())) throw new TypeError('now muss ein gültiges Datum sein.');
  const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
  const { rows } = await db.query(
    `
      SELECT COALESCE(SUM(cost_estimate), 0) AS spent
      FROM content_runs
      WHERE started_at >= $1
    `,
    [monthStart]
  );
  return Number(rows[0]?.spent || 0);
}

function monthContext(now) {
  const current = new Date(now ?? Date.now());
  if (Number.isNaN(current.getTime())) throw new TypeError('now muss ein gültiges Datum sein.');
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  return {
    monthStart: new Date(Date.UTC(year, month, 1)),
    lockKey: `content-agent-budget:${year}-${String(month + 1).padStart(2, '0')}`
  };
}

function reservationKey(stageId) {
  const normalized = typeof stageId === 'string' ? stageId.trim() : '';
  if (!normalized) throw new TypeError('stageId muss eine nichtleere Zeichenfolge sein.');
  return `budget:${normalized}`;
}

async function beginBudgetTransaction(db, now) {
  const client = await db.connect();
  const context = monthContext(now);
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [context.lockKey]);
    return { client, ...context };
  } catch (error) {
    await rollbackQuietly(client);
    client.release();
    throw error;
  }
}

async function rollbackQuietly(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Der ursprüngliche Transaktionsfehler bleibt maßgeblich.
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
  const key = reservationKey(stageId);
  const { client, monthStart } = await beginBudgetTransaction(db, now);
  try {
    const { rows: runRows } = await client.query(
      'SELECT stage_results_json, cost_estimate FROM content_runs WHERE id = $1 FOR UPDATE',
      [runId]
    );
    const run = runRows[0];
    if (!run) throw new Error('Content-Agent-Lauf wurde nicht gefunden.');
    const existing = run.stage_results_json?.[key];
    if (existing) {
      await client.query('COMMIT');
      return { ...existing, idempotent: true };
    }

    const { rows: sumRows } = await client.query(
      'SELECT COALESCE(SUM(cost_estimate), 0) AS spent FROM content_runs WHERE started_at >= $1',
      [monthStart]
    );
    const spent = Number(sumRows[0]?.spent || 0);
    assertMonthlyBudget({ spent, estimatedNext: cost, limit: normalizedLimit });

    const reservation = { status: 'reserved', reservedCost: cost };
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
    return reservation;
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
  actualCost,
  now = new Date(),
  db = pool
}) {
  const cost = nonNegativeNumber(actualCost, 'actualCost');
  const key = reservationKey(stageId);
  const { client } = await beginBudgetTransaction(db, now);
  try {
    const { rows: runRows } = await client.query(
      'SELECT stage_results_json, cost_estimate FROM content_runs WHERE id = $1 FOR UPDATE',
      [runId]
    );
    const reservation = runRows[0]?.stage_results_json?.[key];
    if (!reservation) throw new Error('Für diese Content-Agent-Stufe existiert keine Budgetreservierung.');
    if (reservation.status === 'settled') {
      await client.query('COMMIT');
      return { ...reservation, idempotent: true };
    }

    const reservedCost = nonNegativeNumber(reservation.reservedCost, 'reservedCost');
    const settled = { status: 'settled', reservedCost, actualCost: cost };
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
    return settled;
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}
