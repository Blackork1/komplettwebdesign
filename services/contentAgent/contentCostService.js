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
