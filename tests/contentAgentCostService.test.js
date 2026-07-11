import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertMonthlyBudget,
  estimateTextCost,
  getMonthlyContentCost,
  reserveMonthlyBudget,
  settleMonthlyBudget
} from '../services/contentAgent/contentCostService.js';

function createConcurrentBudgetDb(initialCosts = {}) {
  const runs = new Map(Object.entries(initialCosts).map(([id, cost]) => [Number(id), {
    id: Number(id),
    cost_estimate: Number(cost),
    stage_results_json: {}
  }]));
  const events = [];
  let lockOwner = null;
  const waiters = [];

  function releaseLock(clientId) {
    if (lockOwner !== clientId) return;
    lockOwner = null;
    waiters.shift()?.();
  }

  return {
    runs,
    events,
    async connect() {
      const clientId = Symbol('client');
      return {
        async query(sql, params = []) {
          const normalized = sql.replace(/\s+/g, ' ').trim();
          events.push({ clientId, sql: normalized, params });
          if (/^BEGIN$/i.test(normalized)) return { rows: [] };
          if (/pg_advisory_xact_lock/i.test(normalized)) {
            if (lockOwner !== null) await new Promise((resolve) => waiters.push(resolve));
            lockOwner = clientId;
            return { rows: [{}] };
          }
          if (/SELECT stage_results_json, cost_estimate FROM content_runs/i.test(normalized)) {
            const row = runs.get(Number(params[0]));
            return { rows: row ? [{ ...row, stage_results_json: { ...row.stage_results_json } }] : [] };
          }
          if (/SELECT COALESCE\(SUM\(cost_estimate\)/i.test(normalized)) {
            return { rows: [{ spent: Array.from(runs.values()).reduce((sum, run) => sum + run.cost_estimate, 0) }] };
          }
          if (/cost_estimate = cost_estimate \+ \$4/i.test(normalized)) {
            const [runId, reservationKey, reservation, amount] = params;
            const row = runs.get(Number(runId));
            if (!row.stage_results_json[reservationKey]) {
              row.stage_results_json[reservationKey] = reservation;
              row.cost_estimate += Number(amount);
            }
            return { rows: [{ ...row, stage_results_json: { ...row.stage_results_json } }] };
          }
          if (/cost_estimate = GREATEST\(0, cost_estimate - \$4 \+ \$5\)/i.test(normalized)) {
            const [runId, reservationKey, settled, reservedCost, actualCost] = params;
            const row = runs.get(Number(runId));
            row.stage_results_json[reservationKey] = settled;
            row.cost_estimate = Math.max(0, row.cost_estimate - Number(reservedCost) + Number(actualCost));
            return { rows: [{ ...row, stage_results_json: { ...row.stage_results_json } }] };
          }
          if (/^(?:COMMIT|ROLLBACK)$/i.test(normalized)) {
            releaseLock(clientId);
            return { rows: [] };
          }
          throw new Error(`Unerwartete Testquery: ${normalized}`);
        },
        release() { releaseLock(clientId); }
      };
    }
  };
}

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

test('reserveMonthlyBudget serialisiert konkurrierende Reservierungen monatsbezogen', async () => {
  const db = createConcurrentBudgetDb({ 1: 0, 2: 0, 99: 24.8 });
  const common = {
    stageId: 'article_generation',
    estimatedCost: 0.15,
    limit: 25,
    now: new Date('2026-07-11T09:00:00.000Z'),
    db
  };

  const results = await Promise.allSettled([
    reserveMonthlyBudget({ ...common, runId: 1 }),
    reserveMonthlyBudget({ ...common, runId: 2 })
  ]);

  assert.deepEqual(results.map(({ status }) => status).sort(), ['fulfilled', 'rejected']);
  assert.match(results.find(({ status }) => status === 'rejected').reason.message, /Monatliches Content-Agent-Budget erreicht\./);
  assert.equal(db.runs.get(1).cost_estimate + db.runs.get(2).cost_estimate, 0.15);
  assert.equal(db.events.filter(({ sql }) => /pg_advisory_xact_lock/.test(sql)).length, 2);
  assert.equal(db.events.every(({ sql, params }) => !/pg_advisory_xact_lock/.test(sql) || params[0] === 'content-agent-budget:2026-07'), true);
});

test('Reservierung und Abrechnung sind pro runId und stageId idempotent', async () => {
  const db = createConcurrentBudgetDb({ 7: 0 });
  const reservation = {
    runId: 7,
    stageId: 'review:1',
    estimatedCost: 0.5,
    limit: 25,
    now: new Date('2026-07-11T09:00:00.000Z'),
    db
  };

  await reserveMonthlyBudget(reservation);
  await reserveMonthlyBudget(reservation);
  await settleMonthlyBudget({ runId: 7, stageId: 'review:1', actualCost: 0.1, now: reservation.now, db });
  await settleMonthlyBudget({ runId: 7, stageId: 'review:1', actualCost: 0.1, now: reservation.now, db });

  const run = db.runs.get(7);
  assert.equal(run.cost_estimate, 0.1);
  assert.deepEqual(run.stage_results_json['budget:review:1'], {
    status: 'settled',
    reservedCost: 0.5,
    actualCost: 0.1
  });
});

test('ein Advisory-Lockfehler rollt zurück und gibt den Client frei', async () => {
  const events = [];
  const db = {
    async connect() {
      return {
        async query(sql) {
          const normalized = sql.replace(/\s+/g, ' ').trim();
          events.push(normalized);
          if (/pg_advisory_xact_lock/i.test(normalized)) throw new Error('Lock fehlgeschlagen');
          return { rows: [] };
        },
        release() { events.push('RELEASE'); }
      };
    }
  };

  await assert.rejects(reserveMonthlyBudget({
    runId: 1,
    stageId: 'review',
    estimatedCost: 0.1,
    limit: 25,
    db
  }), /Lock fehlgeschlagen/);

  assert.deepEqual(events.slice(-2), ['ROLLBACK', 'RELEASE']);
});
