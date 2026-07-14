import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRun,
  findRunByJobId,
  finishRun
} from '../repositories/contentRunRepository.js';

function createRunDb() {
  let stored = null;
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (!stored) {
        stored = {
          id: 51,
          job_id: params[0],
          current_stage: params[1],
          runtime_snapshot_json: structuredClone(params[2])
        };
      }
      return { rows: [structuredClone(stored)] };
    }
  };
}

test('Retry bewahrt den ersten Runtime-Snapshot', async () => {
  const db = createRunDb();
  const first = await createRun({
    jobId: 12,
    runtimeSnapshot: { settingsVersion: 3, timezone: 'Europe/Berlin' }
  }, db);
  const resumed = await createRun({
    jobId: 12,
    runtimeSnapshot: { settingsVersion: 4, timezone: 'UTC' }
  }, db);

  assert.deepEqual(resumed.runtime_snapshot_json, first.runtime_snapshot_json);
  assert.deepEqual(first.runtime_snapshot_json, {
    settingsVersion: 3,
    timezone: 'Europe/Berlin'
  });
  assert.deepEqual(db.calls[0].params, [
    12,
    'inventory',
    { settingsVersion: 3, timezone: 'Europe/Berlin' }
  ]);
  assert.match(db.calls[0].sql, /runtime_snapshot_json/i);
  assert.doesNotMatch(
    db.calls[0].sql,
    /DO UPDATE[\s\S]*runtime_snapshot_json\s*=/i
  );
  assert.doesNotMatch(
    db.calls[0].sql,
    /DO UPDATE[\s\S]*(?:status\s*=\s*'running'|finished_at\s*=\s*NULL)/i
  );
});

test('createRun öffnet einen bereits terminalen Lauf beim Konflikt nicht erneut', async () => {
  const terminal = {
    id: 52,
    job_id: 13,
    status: 'completed',
    current_stage: 'completed',
    finished_at: '2026-07-14T10:00:00.000Z',
    runtime_snapshot_json: { settingsVersion: 3 }
  };
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [structuredClone(terminal)] };
    }
  };

  const resumed = await createRun({
    jobId: 13,
    runtimeSnapshot: { settingsVersion: 4 }
  }, db);

  assert.deepEqual(resumed, terminal);
  assert.doesNotMatch(calls[0].sql, /status\s*=\s*'running'/i);
  assert.doesNotMatch(calls[0].sql, /finished_at\s*=\s*NULL/i);
});

test('finishRun schreibt genau einmal von running in einen terminalen Status', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [{ id: 52, status: params[1] }] };
    }
  };

  await finishRun(52, { status: 'failed', errorReport: { code: 'TEST' } }, db);

  assert.match(calls[0].sql, /WHERE id = \$1 AND status = 'running'/i);
  await assert.rejects(
    finishRun(52, { status: 'running' }, db),
    (error) => error?.code === 'CONTENT_RUN_TERMINAL_STATUS_INVALID'
  );
  assert.equal(calls.length, 1);
});

test('Run-Lookup bindet job_id ausschließlich an die injizierte Produktionsdatenbank', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ id: 9, job_id: params[0], runtime_snapshot_json: { immutable: true } }] };
    }
  };
  const run = await findRunByJobId(77, db);
  assert.equal(run.job_id, 77);
  assert.deepEqual(calls[0].params, [77]);
  assert.match(calls[0].sql, /WHERE job_id = \$1/);
});
