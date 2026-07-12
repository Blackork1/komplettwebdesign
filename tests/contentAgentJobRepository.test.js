import test from 'node:test';
import assert from 'node:assert/strict';

import {
  claimNextJob,
  completeJob,
  enqueueAdminReviewNotificationJob,
  enqueueJob,
  failJob,
  markJobNeedsManualAttention,
  renewJobLease,
  recoverExpiredJobs,
  retryContentJobForAdmin,
  retryOrFailJob,
  updateContentSchedulerState,
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
import {
  sanitizeErrorMessage,
  sanitizeErrorReport
} from '../repositories/contentErrorSanitizer.js';

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
  assert.match(
    claimCall.sql,
    /AND EXISTS \( SELECT 1 FROM content_agent_settings settings WHERE settings\.id = 1 AND settings\.agent_enabled = TRUE \)/i
  );
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
  const completedClaim = { id: 1, locked_by: 'worker-1', attempts: 2 };
  const failedClaim = { id: 2, locked_by: 'worker-2', attempts: 1 };
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
  await completeJob(completedClaim, db);
  await failJob(failedClaim, new Error('API antwortet nicht'), db);

  assert.match(db.calls[0].sql, /INSERT INTO content_jobs/i);
  assert.match(db.calls[0].sql, /ON CONFLICT \(idempotency_key\)/i);
  assert.equal(db.calls[0].params[2], payload);
  assert.match(db.calls[1].sql, /status = 'completed'/i);
  assert.match(db.calls[1].sql, /locked_at = NULL/i);
  assert.match(db.calls[1].sql, /locked_by = NULL/i);
  assert.match(db.calls[1].sql, /WHERE id = \$1 AND locked_by = \$2 AND attempts = \$3 AND status = 'running'/i);
  assert.deepEqual(db.calls[1].params, [1, 'worker-1', 2]);
  assert.match(db.calls[2].sql, /status = 'failed'/i);
  assert.match(db.calls[2].sql, /last_error = \$4/i);
  assert.match(db.calls[2].sql, /WHERE id = \$1 AND locked_by = \$2 AND attempts = \$3 AND status = 'running'/i);
  assert.deepEqual(db.calls[2].params, [2, 'worker-2', 1, 'API antwortet nicht']);
});

test('Admin-Regenerationsjobs werden atomar durch den operativen Agentschalter geschützt', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 71, status: 'queued' }] }]);

  await enqueueJob({
    jobType: 'regenerate_metadata',
    idempotencyKey: 'regenerate_metadata:19:uuid',
    payload: { source: 'admin_regeneration', post_id: 19, forced_mode: 'review' },
    maxAttempts: 3
  }, db);

  assert.equal(db.calls[0].params.at(-1), true);
  assert.match(db.calls[0].sql, /WHERE \$6 = FALSE OR EXISTS/i);
});

test('terminale Jobupdates akzeptieren keine veraltete oder unvollständige Lease', async () => {
  const staleClaim = { id: 7, locked_by: 'worker-alt', attempts: 1 };
  const db = createQueryRecorder([{ rows: [] }, { rows: [] }]);

  assert.equal(await completeJob(staleClaim, db), null);
  assert.equal(await failJob(staleClaim, new Error('veralteter Worker'), db), null);

  for (const call of db.calls) {
    assert.match(call.sql, /WHERE id = \$1 AND locked_by = \$2 AND attempts = \$3 AND status = 'running'/i);
    assert.match(call.sql, /RETURNING \*/i);
  }
  await assert.rejects(completeJob(7, db), /vollständiger Lease-Claim/i);
});

test('enqueueJob normalisiert maxAttempts als sicheren PostgreSQL-Integer', async () => {
  const db = createQueryRecorder([
    { rows: [{ id: 8, max_attempts: 1 }] },
    { rows: [{ id: 9, max_attempts: 3 }] },
    { rows: [{ id: 10, max_attempts: 2147483647 }] },
    { rows: [{ id: 11, max_attempts: 5 }] }
  ]);

  await enqueueJob({
    jobType: 'generate_manual_draft',
    idempotencyKey: 'manual:min-attempts',
    maxAttempts: 0
  }, db);
  await enqueueJob({
    jobType: 'generate_manual_draft',
    idempotencyKey: 'manual:partially-invalid-attempts',
    maxAttempts: '12jobs'
  }, db);
  await enqueueJob({
    jobType: 'generate_manual_draft',
    idempotencyKey: 'manual:too-many-attempts',
    maxAttempts: 3_000_000_000
  }, db);
  await enqueueJob({
    jobType: 'generate_manual_draft',
    idempotencyKey: 'manual:numeric-string-attempts',
    maxAttempts: '5'
  }, db);

  assert.deepEqual(db.calls.map((call) => call.params[4]), [1, 3, 2147483647, 5]);
});

test('Admin-Prüfmailjobs erlauben den initialen Versuch und fünf echte Wiederholungen', async () => {
  const row = { id: 12, job_type: 'send_admin_review_notification', max_attempts: 6 };
  const db = createQueryRecorder([{ rows: [row] }]);

  assert.equal(await enqueueAdminReviewNotificationJob({
    deliveryId: 81,
    postId: 51,
    generationRunId: 71,
    reviewVersion: 1
  }, db), row);

  assert.equal(db.calls[0].params[4], 6);
  assert.match(
    db.calls[0].sql,
    /ON CONFLICT \(idempotency_key\) DO UPDATE SET max_attempts = CASE[\s\S]*content_jobs\.job_type = 'send_admin_review_notification'[\s\S]*EXCLUDED\.job_type = 'send_admin_review_notification'[\s\S]*GREATEST\(content_jobs\.max_attempts, EXCLUDED\.max_attempts\)[\s\S]*ELSE content_jobs\.max_attempts END/i
  );
});

test('generischer Admin-Retry schließt Prüfmailjobs atomar im Update-CAS aus', async () => {
  const db = {
    calls: [],
    async query(sql, params) {
      const normalized = normalizeSql(sql);
      this.calls.push({ sql: normalized, params });
      return /job_type <> 'send_admin_review_notification'/i.test(normalized)
        ? { rows: [] }
        : { rows: [{ id: 23, job_type: 'send_admin_review_notification', status: 'queued' }] };
    }
  };

  const result = await retryContentJobForAdmin({ jobId: 23, hardMaxAttempts: 5 }, db);

  assert.equal(result, null);
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /^UPDATE content_jobs/i);
  assert.match(db.calls[0].sql, /job_type <> 'send_admin_review_notification'/i);
  assert.doesNotMatch(db.calls[0].sql, /^SELECT|;\s*SELECT/i);
});

test('NOT_DUE-Reschedule gibt exakt den gefencten Claimversuch ohne Unterlauf zurück', async () => {
  const { rescheduleJobWithoutAttemptConsumption } = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof rescheduleJobWithoutAttemptConsumption, 'function');
  const retryAt = new Date('2026-07-13T10:00:00.000Z');
  const row = { id: 9, status: 'queued', attempts: 5, run_after: retryAt };
  const db = createQueryRecorder([{ rows: [row] }]);
  const claim = { id: 9, locked_by: 'worker-not-due', attempts: 6 };

  assert.equal(await rescheduleJobWithoutAttemptConsumption(
    claim,
    new Error('Noch nicht fällig'),
    { retryAt },
    db
  ), row);

  assert.match(db.calls[0].sql, /SET status = 'queued', attempts = attempts - 1/i);
  assert.match(db.calls[0].sql, /run_after = \$5/i);
  assert.match(db.calls[0].sql, /locked_at = NULL[\s\S]*locked_by = NULL[\s\S]*finished_at = NULL/i);
  assert.match(
    db.calls[0].sql,
    /WHERE id = \$1[\s\S]*locked_by = \$2[\s\S]*attempts = \$3[\s\S]*status = 'running'[\s\S]*attempts > 0/i
  );
  assert.deepEqual(db.calls[0].params.slice(0, 3), [9, 'worker-not-due', 6]);
  assert.equal(db.calls[0].params[4], retryAt);
});

test('der Wochen-Scheduler prüft die operative Pause atomar im idempotenten Insert', async () => {
  const db = createQueryRecorder([{ rows: [] }]);

  assert.equal(await enqueueJob({
    jobType: 'generate_weekly_draft',
    idempotencyKey: 'weekly:2026-07-13:18:00:Europe/Berlin',
    payload: {
      source: 'weekly-schedule',
      schedule_slot: 'weekly:2026-07-13:18:00:Europe/Berlin'
    },
    maxAttempts: 3
  }, db), null);

  assert.match(
    db.calls[0].sql,
    /WHERE \$6 = FALSE OR EXISTS \( SELECT 1 FROM content_agent_settings settings WHERE settings\.id = 1 AND settings\.agent_enabled = TRUE \)/i
  );
  assert.match(db.calls[0].sql, /ON CONFLICT \(idempotency_key\)/i);
  assert.equal(db.calls[0].params[5], true);
});

test('auch manuelle Admin-Entwürfe prüfen die operative Pause atomar im Insert', async () => {
  const db = createQueryRecorder([{ rows: [] }]);

  assert.equal(await enqueueJob({
    jobType: 'generate_manual_draft',
    idempotencyKey: 'manual:admin-test',
    payload: { source: 'admin_manual', forced_mode: 'review' },
    maxAttempts: 3
  }, db), null);

  assert.equal(db.calls[0].params[5], true);
  assert.match(
    db.calls[0].sql,
    /WHERE \$6 = FALSE OR EXISTS \( SELECT 1 FROM content_agent_settings settings WHERE settings\.id = 1 AND settings\.agent_enabled = TRUE \)/i
  );
});

test('failJob speichert eine begrenzte Fehlermeldung ohne Stack oder Credentials', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 9, status: 'failed' }] }]);
  const claim = { id: 9, locked_by: 'worker-1', attempts: 3 };
  const error = new Error(
    'OpenAI sk-test-1234567890, {"api_key":"json-api-secret"}, '
      + 'Authorization: Basic dXNlcjpwYXNzd29ydA==, '
      + 'Authorization: Bearer bearer-secret und postgres://user:db-passwort@db/app\n'
      + '    at internerStack (/srv/worker.js:42:1)'
  );

  await failJob(claim, error, db);

  const storedError = db.calls[0].params[3];
  assert.doesNotMatch(storedError, /sk-test/i);
  assert.doesNotMatch(storedError, /json-api-secret|dXNlcjpwYXNzd29ydA|bearer-secret|db-passwort/i);
  assert.doesNotMatch(storedError, /Authorization:\s*(?:Basic|Bearer)\s+[^\[]/i);
  assert.doesNotMatch(storedError, /internerStack/i);
  assert.ok(storedError.length <= 2000);
});

test('Fehlerbereinigung redigiert JSON-Authorization, präfixierte API-Schlüssel und URL-Passwörter', () => {
  const samples = [
    {
      text: '{"Authorization":"Bearer JSON_BEARER_SECRET"}',
      secret: 'JSON_BEARER_SECRET'
    },
    {
      text: 'STRIPE_API_KEY=rk_live_EXAMPLESECRET',
      secret: 'rk_live_EXAMPLESECRET'
    },
    {
      text: 'https://user:HTTPS_PASSWORD@example.test/path',
      secret: 'HTTPS_PASSWORD'
    }
  ];

  for (const { text, secret } of samples) {
    const message = sanitizeErrorMessage(`${text}\nStack darf nicht bleiben`);
    const report = sanitizeErrorReport({ message: `${text}\nStack darf nicht bleiben` });

    assert.equal(message.includes(secret), false);
    assert.equal(report.message.includes(secret), false);
    assert.doesNotMatch(message, /\r|\n|Stack darf nicht bleiben/);
    assert.doesNotMatch(report.message, /\r|\n|Stack darf nicht bleiben/);
    assert.ok(message.length <= 2000);
    assert.ok(report.message.length <= 2000);
  }
});

test('recoverExpiredJobs trennt Wiederholungen von endgültigen Fehlern und löst Leases', async () => {
  const recovered = [
    { id: 3, status: 'queued', locked_at: null, locked_by: null },
    { id: 4, status: 'failed', locked_at: null, locked_by: null }
  ];
  const db = createQueryRecorder([{ rows: recovered }]);

  const result = await recoverExpiredJobs(30, db);

  assert.equal(result, recovered);
  assert.match(db.calls[0].sql, /WHERE job\.status = 'running'/i);
  assert.match(db.calls[0].sql, /job\.locked_at < NOW\(\) - \(\$1 \* INTERVAL '1 minute'\)/i);
  assert.match(db.calls[0].sql, /WHEN job\.attempts < job\.max_attempts THEN 'queued'[\s\S]*ELSE 'failed'/i);
  assert.match(db.calls[0].sql, /locked_at = NULL/i);
  assert.match(db.calls[0].sql, /locked_by = NULL/i);
  assert.match(db.calls[0].sql, /finished_at = CASE[\s\S]*WHEN job\.attempts < job\.max_attempts THEN NULL[\s\S]*ELSE NOW\(\)/i);
  assert.deepEqual(db.calls[0].params, [30]);
});

test('Recovery gibt Jobversuch sechs für eine künftig fällige queued Delivery zurück', async () => {
  const nextAttemptAt = new Date('2026-07-13T10:00:00.000Z');
  const recovered = {
    id: 77,
    job_type: 'send_admin_review_notification',
    status: 'queued',
    attempts: 5,
    max_attempts: 6,
    run_after: nextAttemptAt,
    locked_at: null,
    locked_by: null,
    payload_json: { deliveryId: 7 }
  };
  const db = createQueryRecorder([{ rows: [recovered] }]);

  assert.deepEqual(await recoverExpiredJobs(30, db), [recovered]);

  const sql = db.calls[0].sql;
  assert.match(sql, /LEFT JOIN content_notification_deliveries AS delivery/i);
  assert.match(sql, /delivery\.id::text = job\.payload_json\s*->>\s*'deliveryId'/i);
  assert.doesNotMatch(sql, /\(job\.payload_json\s*->>\s*'deliveryId'\)::(?:bigint|integer|numeric)/i);
  assert.match(sql, /expired\.delivery_status IN \('queued', 'sending'\)[\s\S]*THEN 'queued'/i);
  assert.match(sql, /attempts = CASE[\s\S]*GREATEST\(job\.attempts - 1, 0\)/i);
  assert.match(sql, /delivery_status = 'queued'[\s\S]*GREATEST\(job\.run_after, expired\.delivery_next_attempt_at\)/i);
  assert.match(sql, /locked_at = NULL[\s\S]*locked_by = NULL/i);
  assert.equal(recovered.run_after, nextAttemptAt);
});

test('Recovery lässt Jobversuch sechs für eine sending Delivery genau einmal zur Klärung laufen', async () => {
  const recovered = {
    id: 78,
    job_type: 'send_admin_review_notification',
    status: 'queued',
    attempts: 5,
    max_attempts: 6,
    locked_at: null,
    locked_by: null,
    payload_json: { deliveryId: 8 }
  };
  const db = createQueryRecorder([{ rows: [recovered] }]);

  assert.deepEqual(await recoverExpiredJobs(30, db), [recovered]);

  const sql = db.calls[0].sql;
  assert.match(sql, /delivery_status = 'sending'[\s\S]*THEN NOW\(\)/i);
  assert.match(sql, /finished_at = CASE[\s\S]*delivery_status IN \('queued', 'sending'\)[\s\S]*THEN NULL/i);
  assert.match(sql, /ELSE CASE[\s\S]*job\.attempts < job\.max_attempts[\s\S]*THEN 'queued'[\s\S]*ELSE 'failed'/i);
  assert.equal(recovered.attempts, 5);
});

test('Laufprotokoll übergibt JSON als Objekte und gibt gespeicherte Zeilen zurück', async () => {
  const stageResult = { score: 91 };
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
    stageId: 'review',
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

  assert.equal(db.calls[1].params[2], 'review');
  assert.equal(db.calls[1].params[3], stageResult);
  assert.equal(db.calls[1].params[4], tokenUsage);
  assert.equal(db.calls[1].params[6], responseIds);
  assert.match(db.calls[1].sql, /to_jsonb\(\$7::text\[\]\)/i);
  assert.deepEqual(db.calls[2].params[3], errorReport);
});

test('updateRunStage trennt Usage nach stageId und verbucht dieselbe ID höchstens einmal', async () => {
  const firstRepair = {
    id: 25,
    current_stage: 'repair',
    cost_estimate: '0.120000',
    openai_response_ids_json: ['resp_1'],
    stage_results_json: { 'repair:1': { score: 76 } },
    token_usage_json: {
      'repair:1': { input_tokens: 120, output_tokens: 80 }
    }
  };
  const secondRepair = {
    id: 25,
    current_stage: 'repair',
    cost_estimate: '0.240000',
    openai_response_ids_json: ['resp_1', 'resp_2'],
    stage_results_json: {
      'repair:1': { score: 76 },
      'repair:2': { score: 88 }
    },
    token_usage_json: {
      'repair:1': { input_tokens: 120, output_tokens: 80 },
      'repair:2': { input_tokens: 120, output_tokens: 80 }
    }
  };
  const db = createQueryRecorder([
    { rows: [firstRepair] },
    { rows: [firstRepair] },
    { rows: [secondRepair] }
  ]);
  const update = (stageId, responseId) => ({
    currentStage: 'repair',
    stageId,
    stageResult: { score: stageId === 'repair:1' ? 76 : 88 },
    tokenUsage: { input_tokens: 120, output_tokens: 80 },
    costEstimate: 0.12,
    responseIds: [responseId]
  });

  assert.equal(await updateRunStage(25, update('repair:1', 'resp_1'), db), firstRepair);
  assert.equal(await updateRunStage(25, update('repair:1', 'resp_1'), db), firstRepair);
  assert.equal(await updateRunStage(25, update('repair:2', 'resp_2'), db), secondRepair);

  for (const call of db.calls) {
    assert.match(call.sql, /stage_results_json \? \$3/i);
    assert.match(call.sql, /jsonb_build_object\(\$3, \$4::jsonb\)/i);
    assert.match(call.sql, /token_usage_json \|\| jsonb_build_object\(\$3, \$5::jsonb\)/i);
    assert.match(call.sql, /cost_estimate = CASE WHEN stage_results_json \? \$3 THEN cost_estimate ELSE cost_estimate \+ \$6 END/i);
    assert.match(call.sql, /openai_response_ids_json = CASE WHEN stage_results_json \? \$3 THEN openai_response_ids_json ELSE openai_response_ids_json \|\| to_jsonb\(\$7::text\[\]\) END/i);
  }
  assert.deepEqual(db.calls.map((call) => call.params[2]), ['repair:1', 'repair:1', 'repair:2']);
  assert.deepEqual(secondRepair.token_usage_json, {
    'repair:1': { input_tokens: 120, output_tokens: 80 },
    'repair:2': { input_tokens: 120, output_tokens: 80 }
  });
});

test('updateRunStage verlangt eine nichtleere explizite stageId vor der Query', async () => {
  const db = createQueryRecorder();

  await assert.rejects(
    updateRunStage(26, { currentStage: 'review' }, db),
    /stageId/i
  );
  await assert.rejects(
    updateRunStage(26, { currentStage: 'review', stageId: '   ' }, db),
    /stageId/i
  );
  assert.equal(db.calls.length, 0);
});

test('finishRun verwirft unbekannte und verschachtelte Secrets aus Fehlerberichten', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 22, status: 'failed' }] }]);
  const errorReport = {
    message: 'OpenAI {"api_key":"top-json-secret"} Authorization: Basic dXNlcjpwYXNz',
    code: 'OPENAI_ERROR',
    stage: 'article_generation',
    api_key: 'top-secret',
    stack: 'at internerStack (/srv/worker.js:42:1)',
    credentials: {
      password: 'nested-password',
      token: 'nested-token'
    },
    issues: [
      {
        message: 'Authorization: Bearer issue-bearer und postgres://user:issue-db-pass@db/app',
        code: 'UPSTREAM_ERROR',
        stage: 'request',
        api_key: 'issue-api-key',
        stack: 'at issueStack (/srv/worker.js:17:1)',
        nested: { secret: 'deep-secret' }
      },
      'API-Key: sk-issue-1234567890'
    ]
  };

  await finishRun(22, { status: 'failed', errorReport }, db);

  const storedReport = db.calls[0].params[3];
  assert.deepEqual(Object.keys(storedReport).sort(), ['code', 'issues', 'message', 'stage']);
  assert.deepEqual(Object.keys(storedReport.issues[0]).sort(), ['code', 'message', 'stage']);
  const serialized = JSON.stringify(storedReport);
  assert.doesNotMatch(serialized, /top-json-secret|dXNlcjpwYXNz|top-secret|nested-password|nested-token/i);
  assert.doesNotMatch(serialized, /issue-bearer|issue-db-pass|issue-api-key|issueStack|deep-secret|sk-issue/i);
  assert.doesNotMatch(serialized, /"stack"|"credentials"|"password"/i);
  assert.doesNotMatch(serialized, /ENTFERNT\]\s+ENTFERNT/i);
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

test('createTopic verwendet generation_run_id idempotent ohne bestehende Fachwerte zu überschreiben', async () => {
  const existing = { id: 31, generation_run_id: 77, topic: 'Erster Themenstand' };
  const db = createQueryRecorder([
    { rows: [existing] },
    { rows: [existing] }
  ]);
  const input = {
    topic: 'Erster Themenstand',
    suggestedTitle: 'Erster Titel',
    primaryKeyword: 'Webdesign Kosten',
    secondaryKeywords: ['Webdesign Berlin'],
    contentCluster: 'Webdesign',
    searchIntent: 'commercial',
    targetAudience: 'KMU',
    source: 'agent',
    generationRunId: 77
  };

  const first = await createTopic(input, db);
  const second = await createTopic({ ...input, topic: 'Schwächerer Retry-Stand' }, db);

  assert.equal(first.id, second.id);
  assert.equal(first.topic, 'Erster Themenstand');
  assert.equal(second.topic, 'Erster Themenstand');
  for (const call of db.calls) {
    assert.match(call.sql, /generation_run_id/i);
    assert.match(call.sql, /ON CONFLICT \(generation_run_id\) DO UPDATE SET generation_run_id = EXCLUDED\.generation_run_id/i);
    assert.doesNotMatch(call.sql, /DO UPDATE SET (?:topic|suggested_title|primary_keyword)/i);
    assert.equal(call.params.at(-1), 77);
  }
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

test('updateContentSchedulerState schreibt Tick, Slot und bereinigten Fehler zum Workerzustand', async () => {
  const row = { worker_name: 'content-worker', last_scheduled_slot: 'weekly:slot' };
  const db = createQueryRecorder([{ rows: [row] }]);
  const tickAt = new Date('2026-07-13T16:00:20.000Z');

  assert.equal(await updateContentSchedulerState({
    lastSchedulerTickAt: tickAt,
    lastScheduledSlot: 'weekly:slot',
    lastSchedulerError: null
  }, db), row);
  assert.match(db.calls[0].sql, /UPDATE content_worker_state/i);
  assert.match(db.calls[0].sql, /last_scheduler_tick_at = \$2/i);
  assert.match(db.calls[0].sql, /last_scheduled_slot = \$3/i);
  assert.match(db.calls[0].sql, /last_scheduler_error = \$4/i);
  assert.match(db.calls[0].sql, /WHERE worker_name = \$1/i);
  assert.deepEqual(db.calls[0].params, ['content-worker', tickAt, 'weekly:slot', null]);
});

test('renewJobLease erneuert ausschließlich den weiterhin gefencten laufenden Claim', async () => {
  const renewed = { id: 9, status: 'running', locked_by: 'worker-1', attempts: 2 };
  const db = createQueryRecorder([{ rows: [renewed] }]);

  assert.equal(await renewJobLease({ id: 9, locked_by: 'worker-1', attempts: 2 }, db), renewed);
  assert.match(db.calls[0].sql, /SET locked_at = NOW\(\), updated_at = NOW\(\)/i);
  assert.match(db.calls[0].sql, /id = \$1[\s\S]*locked_by = \$2[\s\S]*attempts = \$3[\s\S]*status = 'running'/i);
  assert.deepEqual(db.calls[0].params, [9, 'worker-1', 2]);
});

test('retryOrFailJob queued temporäre Fehler mit Backoff und exhausted Fehler terminal', async () => {
  const queued = { id: 9, status: 'queued', attempts: 2, max_attempts: 3 };
  const failed = { id: 10, status: 'failed', attempts: 3, max_attempts: 3 };
  const db = createQueryRecorder([{ rows: [queued] }, { rows: [failed] }]);

  assert.equal(await retryOrFailJob(
    { id: 9, locked_by: 'worker-1', attempts: 2 },
    new Error('temporär'),
    { backoffSeconds: 45 },
    db
  ), queued);
  assert.equal(await retryOrFailJob(
    { id: 10, locked_by: 'worker-1', attempts: 3 },
    new Error('weiterhin kaputt'),
    { backoffSeconds: 45 },
    db
  ), failed);
  assert.match(db.calls[0].sql, /status = CASE WHEN attempts < max_attempts THEN 'queued' ELSE 'failed' END/i);
  assert.match(db.calls[0].sql, /run_after = CASE[\s\S]*NOW\(\) \+ \(\$5 \* INTERVAL '1 second'\)/i);
  assert.deepEqual(db.calls[0].params.slice(0, 3), [9, 'worker-1', 2]);
});

test('retryOrFailJob bevorzugt eine gültige explizite Retryzeit und behält den Lease-Fence', async () => {
  const queued = { id: 9, status: 'queued', attempts: 2, max_attempts: 5 };
  const db = createQueryRecorder([{ rows: [queued] }]);
  const retryAt = new Date('2026-07-12T11:00:00.000Z');

  assert.equal(await retryOrFailJob(
    { id: 9, locked_by: 'worker-mail', attempts: 2 },
    new Error('SMTP vorübergehend nicht erreichbar'),
    { retryAt, backoffSeconds: 45 },
    db
  ), queued);

  assert.match(db.calls[0].sql, /COALESCE\(\s*\$6::timestamptz,\s*NOW\(\) \+ \(\$5 \* INTERVAL '1 second'\)\s*\)/i);
  assert.match(db.calls[0].sql, /id = \$1[\s\S]*locked_by = \$2[\s\S]*attempts = \$3[\s\S]*status = 'running'/i);
  assert.equal(db.calls[0].params[5], retryAt);
});

test('markJobNeedsManualAttention persistiert einen eigenen gefencten Terminalzustand', async () => {
  const row = { id: 11, status: 'needs_manual_attention' };
  const db = createQueryRecorder([{ rows: [row] }]);

  assert.equal(await markJobNeedsManualAttention(
    { id: 11, locked_by: 'worker-2', attempts: 1 },
    { code: 'budget_limit_reached', message: 'Budget erreicht' },
    db
  ), row);
  assert.match(db.calls[0].sql, /SET status = 'needs_manual_attention'/i);
  assert.deepEqual(db.calls[0].params.slice(0, 3), [11, 'worker-2', 1]);
});

test('createRun liefert pro job_id atomar denselben wiederaufnehmbaren Lauf', async () => {
  const existing = { id: 88, job_id: 7, stage_results_json: { article_generation: { ok: true } } };
  const db = createQueryRecorder([{ rows: [existing] }, { rows: [existing] }]);

  assert.equal(await createRun({ jobId: 7 }, db), existing);
  assert.equal(await createRun({ jobId: 7 }, db), existing);
  assert.match(db.calls[0].sql, /ON CONFLICT \(job_id\) DO UPDATE/i);
  assert.match(db.calls[0].sql, /stage_results_json = content_runs\.stage_results_json/i);
});
