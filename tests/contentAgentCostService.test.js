import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertMonthlyBudget,
  estimateTextCost,
  getMonthlyContentCost
} from '../services/contentAgent/contentCostService.js';

test('estimateTextCost berechnet Ein- und Ausgabetokens pro einer Million', () => {
  assert.equal(estimateTextCost({
    usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
    inputRate: 2.5,
    outputRate: 15
  }), 17.5);
});

test('assertMonthlyBudget erlaubt die exakte Grenze und blockiert Überschreitungen', () => {
  assert.doesNotThrow(() => assertMonthlyBudget({ spent: 24.90, estimatedNext: 0.10, limit: 25 }));
  assert.throws(
    () => assertMonthlyBudget({ spent: 24.90, estimatedNext: 0.11, limit: 25 }),
    /Monatliches Content-Agent-Budget erreicht\./
  );
});

test('getMonthlyContentCost summiert Läufe ab dem ersten Kalendertag des Monats', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [{ spent: '12.345600' }] };
    }
  };

  const spent = await getMonthlyContentCost({
    now: new Date('2026-07-11T12:30:00.000Z'),
    db
  });

  assert.equal(spent, 12.3456);
  assert.match(calls[0].sql, /SUM\(cost_estimate\)/i);
  assert.match(calls[0].sql, /started_at >= \$1/i);
  assert.equal(calls[0].params[0].toISOString(), '2026-07-01T00:00:00.000Z');
});
