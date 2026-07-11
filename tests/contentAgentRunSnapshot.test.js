import test from 'node:test';
import assert from 'node:assert/strict';

import { createRun } from '../repositories/contentRunRepository.js';

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
