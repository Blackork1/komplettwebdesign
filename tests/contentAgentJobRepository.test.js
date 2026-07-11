import test from 'node:test';
import assert from 'node:assert/strict';

import {
  claimNextJob,
  completeJob,
  enqueueJob,
  failJob,
  recoverExpiredJobs,
  upsertWorkerHeartbeat
} from '../repositories/contentJobRepository.js';
import {
  createRun,
  finishRun,
  updateRunStage
} from '../repositories/contentRunRepository.js';
import {
  createTopic,
  markTopicUsed
} from '../repositories/contentTopicRepository.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function createQueryRecorder(rowsByCall = []) {
  const calls = [];

  return {
    calls,
    async query(sql, params = []) {
      const call = { sql: normalizeSql(sql), params };
      calls.push(call);
      const response = rowsByCall.shift() || {};
      if (response.error) {
        throw response.error;
      }
      return {
        rows: response.rows || [],
        rowCount: response.rowCount ?? response.rows?.length ?? 0
      };
    }
  };
}

function createTransactionalRecorder(rowsByCall = []) {
  const events = [];
  const client = createQueryRecorder(rowsByCall);
  const originalQuery = client.query.bind(client);

  client.query = async (sql, params = []) => {
    events.push({ type: 'query', sql: normalizeSql(sql), params });
    return originalQuery(sql, params);
  };
  client.release = () => events.push({ type: 'release' });

  return {
    events,
    client,
    async connect() {
      events.push({ type: 'connect' });
      return client;
    }
  };
}

test('claimNextJob reserviert atomar genau einen Job in derselben Transaktion', async () => {
  const claimed = { id: 17, status: 'running', locked_by: 'worker-1', attempts: 1 };
  const db = createTransactionalRecorder([
    {},
    { rows: [claimed] },
    {}
  ]);

  const result = await claimNextJob('worker-1', db);

  assert.equal(result, claimed);
  assert.deepEqual(db.events.map((event) => event.type), [
    'connect',
    'query',
    'query',
    'query',
    'release'
  ]);
  assert.equal(db.events[1].sql, 'BEGIN');
  assert.equal(db.events[3].sql, 'COMMIT');

  const claimCall = db.events[2];
  assert.match(claimCall.sql, /^WITH candidate AS \(/i);
  assert.match(claimCall.sql, /WHERE status = 'queued' AND run_after <= NOW\(\)/i);
  assert.match(claimCall.sql, /ORDER BY run_after, created_at/i);
  assert.match(claimCall.sql, /FOR UPDATE SKIP LOCKED/i);
  assert.match(claimCall.sql, /LIMIT 1\s*\) UPDATE content_jobs AS job/i);
  assert.match(claimCall.sql, /SET status = 'running', attempts = attempts \+ 1, locked_at = NOW\(\), locked_by = \$1, updated_at = NOW\(\)/i);
  assert.match(claimCall.sql, /FROM candidate WHERE job\.id = candidate\.id RETURNING job\.\*;?$/i);
  assert.deepEqual(claimCall.params, ['worker-1']);
});

test('claimNextJob rollt bei einem Claimfehler vor dem Release zurück', async () => {
  const claimError = new Error('Claim fehlgeschlagen');
  const db = createTransactionalRecorder([
    {},
    { error: claimError },
    {}
  ]);

  await assert.rejects(claimNextJob('worker-2', db), claimError);

  assert.deepEqual(db.events.map((event) => event.type), [
    'connect',
    'query',
    'query',
    'query',
    'release'
  ]);
  assert.equal(db.events[1].sql, 'BEGIN');
  assert.equal(db.events[3].sql, 'ROLLBACK');
});

test('Queue-Schreibfunktionen sind parameterisiert und räumen Sperrfelder auf', async () => {
  const payload = { source: 'admin', options: { locale: 'de-DE' } };
  const db = createQueryRecorder([
    { rows: [{ id: 1, status: 'queued' }] },
    { rows: [{ id: 1, status: 'completed' }] },
    { rows: [{ id: 2, status: 'failed' }] }
  ]);

  await enqueueJob({
    jobType: 'generate_manual_draft',
    idempotencyKey: 'manual:42',
    payload,
    runAfter: '2026-07-11T09:00:00.000Z',
    maxAttempts: 4
  }, db);
  await completeJob(1, db);
  await failJob(2, new Error('API antwortet nicht'), db);

  assert.match(db.calls[0].sql, /INSERT INTO content_jobs/i);
  assert.match(db.calls[0].sql, /ON CONFLICT \(idempotency_key\)/i);
  assert.equal(db.calls[0].params[2], payload);
  assert.match(db.calls[1].sql, /status = 'completed'/i);
  assert.match(db.calls[1].sql, /locked_at = NULL/i);
  assert.match(db.calls[1].sql, /locked_by = NULL/i);
  assert.match(db.calls[2].sql, /status = 'failed'/i);
  assert.match(db.calls[2].sql, /last_error = \$2/i);
  assert.deepEqual(db.calls[2].params, [2, 'API antwortet nicht']);
});

test('failJob speichert eine begrenzte Fehlermeldung ohne Stack oder Credentials', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 9, status: 'failed' }] }]);
  const error = new Error(
    'OpenAI sk-test-1234567890 und postgres://user:secret@db/app\n'
      + '    at internerStack (/srv/worker.js:42:1)'
  );

  await failJob(9, error, db);

  const storedError = db.calls[0].params[1];
  assert.doesNotMatch(storedError, /sk-test/i);
  assert.doesNotMatch(storedError, /secret/i);
  assert.doesNotMatch(storedError, /internerStack/i);
  assert.ok(storedError.length <= 2000);
});

test('recoverExpiredJobs trennt Wiederholungen von endgültigen Fehlern und löst Leases', async () => {
  const recovered = [
    { id: 3, status: 'queued', locked_at: null, locked_by: null },
    { id: 4, status: 'failed', locked_at: null, locked_by: null }
  ];
  const db = createQueryRecorder([{ rows: recovered }]);

  const result = await recoverExpiredJobs(30, db);

  assert.equal(result, recovered);
  assert.match(db.calls[0].sql, /WHERE status = 'running'/i);
  assert.match(db.calls[0].sql, /locked_at < NOW\(\) - \(\$1 \* INTERVAL '1 minute'\)/i);
  assert.match(db.calls[0].sql, /CASE WHEN attempts < max_attempts THEN 'queued' ELSE 'failed' END/i);
  assert.match(db.calls[0].sql, /locked_at = NULL/i);
  assert.match(db.calls[0].sql, /locked_by = NULL/i);
  assert.match(db.calls[0].sql, /finished_at = CASE WHEN attempts < max_attempts THEN NULL ELSE NOW\(\) END/i);
  assert.deepEqual(db.calls[0].params, [30]);
});

test('Laufprotokoll übergibt JSON als Objekte und gibt gespeicherte Zeilen zurück', async () => {
  const stageResult = { review: { score: 91 } };
  const tokenUsage = { input_tokens: 120, output_tokens: 80 };
  const responseIds = ['resp_1'];
  const errorReport = { code: 'quality_gate' };
  const rows = [
    { id: 21, current_stage: 'inventory' },
    { id: 21, current_stage: 'review' },
    { id: 21, status: 'needs_manual_attention' }
  ];
  const db = createQueryRecorder(rows.map((row) => ({ rows: [row] })));

  assert.equal(await createRun({ jobId: 7 }, db), rows[0]);
  assert.equal(await updateRunStage(21, {
    currentStage: 'review',
    stageResult,
    tokenUsage,
    costEstimate: 0.12,
    responseIds,
    selectedTopicId: 5
  }, db), rows[1]);
  assert.equal(await finishRun(21, {
    status: 'needs_manual_attention',
    postId: 11,
    errorReport
  }, db), rows[2]);

  assert.equal(db.calls[1].params[2], stageResult);
  assert.equal(db.calls[1].params[3], tokenUsage);
  assert.equal(db.calls[1].params[5], responseIds);
  assert.match(db.calls[1].sql, /to_jsonb\(\$6::text\[\]\)/i);
  assert.equal(db.calls[2].params[3], errorReport);
});

test('Themenfunktionen speichern JSON-Arrays als Parameter und markieren die Nutzung', async () => {
  const secondaryKeywords = ['Webdesign Berlin', 'Website erstellen'];
  const rows = [
    { id: 31, primary_keyword: 'Webdesign Kosten' },
    { id: 31, status: 'used' }
  ];
  const db = createQueryRecorder(rows.map((row) => ({ rows: [row] })));

  assert.equal(await createTopic({
    topic: 'Was kostet Webdesign?',
    suggestedTitle: 'Webdesign-Kosten verständlich erklärt',
    primaryKeyword: 'Webdesign Kosten',
    secondaryKeywords,
    contentCluster: 'Webdesign',
    searchIntent: 'commercial',
    targetAudience: 'KMU',
    source: 'agent'
  }, db), rows[0]);
  assert.equal(await markTopicUsed(31, db), rows[1]);

  assert.equal(db.calls[0].params[3], secondaryKeywords);
  assert.match(db.calls[0].sql, /to_jsonb\(\$4::text\[\]\)/i);
  assert.match(db.calls[1].sql, /status = 'used'/i);
  assert.match(db.calls[1].sql, /used_at = NOW\(\)/i);
});

test('upsertWorkerHeartbeat aktualisiert den benannten Worker und gibt dessen Zeile zurück', async () => {
  const heartbeat = {
    worker_name: 'content-worker',
    worker_id: 'worker-1',
    version: '1.0.0'
  };
  const db = createQueryRecorder([{ rows: [heartbeat] }]);

  const result = await upsertWorkerHeartbeat({
    workerName: 'content-worker',
    workerId: 'worker-1',
    startedAt: '2026-07-11T08:00:00.000Z',
    lastJobAt: '2026-07-11T08:45:00.000Z',
    version: '1.0.0'
  }, db);

  assert.equal(result, heartbeat);
  assert.match(db.calls[0].sql, /INSERT INTO content_worker_state/i);
  assert.match(db.calls[0].sql, /ON CONFLICT \(worker_name\) DO UPDATE/i);
  assert.match(db.calls[0].sql, /heartbeat_at = NOW\(\)/i);
  assert.deepEqual(db.calls[0].params, [
    'content-worker',
    'worker-1',
    '2026-07-11T08:00:00.000Z',
    '2026-07-11T08:45:00.000Z',
    '1.0.0'
  ]);
});
