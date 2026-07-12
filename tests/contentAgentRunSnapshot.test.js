import test from 'node:test';
import assert from 'node:assert/strict';

import { createRun, findRunByJobId } from '../repositories/contentRunRepository.js';

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
