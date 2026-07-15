import test from 'node:test';
import assert from 'node:assert/strict';

import {
  enqueuePerformanceRevisionJob,
  claimNextJob,
  completeJob,
  discardDeterministicExistingOptimizationJobForAdmin,
  enqueueAdminReviewNotificationJob,
  enqueueLearningObservationJob,
  enqueueManualSearchConsoleSyncJob,
  enqueuePerformanceExplanationJob,
  enqueueJob,
  enqueueReviewOptimizationJob,
  failJob,
  getLatestReviewOptimizationJob,
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

test('Performance-Erklärjob verwendet Snapshot und Evidenz als Idempotenzschlüssel', async () => {
  const row = { id: 91, job_type: 'explain_article_performance' };
  const db = createQueryRecorder([{ rows: [row] }]);

  assert.equal(await enqueuePerformanceExplanationJob({
    snapshotId: 12,
    evidenceHash: 'a'.repeat(64)
  }, db), row);
  assert.deepEqual(db.calls[0].params.slice(0, 5), [
    'explain_article_performance',
    `article-performance-explanation:12:${'a'.repeat(64)}`,
    { snapshot_id: 12, evidence_hash: 'a'.repeat(64) },
    null,
    3
  ]);
});

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

test('Performance-Revision lehnt veraltete Evidenz atomar und ohne Job ab', async () => {
  const db = createTransactionalRecorder([
    { rows: [] },
    { rows: [{ id: 19, published: true }] },
    { rows: [{ has_draft_revision: false }] },
    { rows: [{ id: 92, evidence_hash: 'b'.repeat(64), data_eligible: true, status: 'opportunity', diagnoses_json: [{ code: 'ranking_opportunity' }] }] },
    { rows: [] }
  ]);

  await assert.rejects(enqueuePerformanceRevisionJob({
    postId: 19,
    adminId: 7,
    baseLiveHash: 'c'.repeat(64),
    snapshotId: 91,
    evidenceHash: 'a'.repeat(64),
    maxAttempts: 3
  }, db), (error) => error?.code === 'CONTENT_PERFORMANCE_EVIDENCE_STALE');

  assert.equal(db.client.calls.some(({ sql }) => /INSERT INTO content_jobs/i.test(sql)), false);
  assert.equal(db.events.at(-1).type, 'release');
});

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

test('Prüfhinweis-Optimierungen werden atomar durch den operativen Agentschalter geschützt', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 72, status: 'queued' }] }]);
  await enqueueJob({
    jobType: 'optimize_review_issues',
    idempotencyKey: 'optimize_review_issues:19:3:uuid',
    payload: {
      source: 'admin_regeneration',
      post_id: 19,
      forced_mode: 'review',
      expected_review_version: 3,
      issue_mode: 'all'
    }
  }, db);
  assert.equal(db.calls[0].params.at(-1), true);
});

test('Prüfhinweis-Optimierungen verwenden pro Entwurf und Reviewversion denselben Job', async () => {
  const existingJob = {
    id: 41,
    status: 'queued',
    idempotency_key: 'optimize_review_issues:19:3'
  };
  const db = createQueryRecorder([
    { rows: [existingJob] },
    { rows: [existingJob] }
  ]);
  const input = {
    postId: 19,
    expectedReviewVersion: 3,
    issueMode: 'all',
    maxAttempts: 3
  };

  const first = await enqueueReviewOptimizationJob(input, db);
  const second = await enqueueReviewOptimizationJob(input, db);

  assert.deepEqual(first, existingJob);
  assert.deepEqual(second, existingJob);
  assert.equal(db.calls.length, 2);
  for (const call of db.calls) {
    assert.match(call.sql, /ON CONFLICT \(idempotency_key\)/i);
    assert.equal(call.params[1], 'optimize_review_issues:19:3');
    assert.deepEqual(call.params[2], {
      source: 'admin_regeneration',
      post_id: 19,
      forced_mode: 'review',
      expected_review_version: 3,
      issue_mode: 'all'
    });
  }
});

test('Optimierungsstatus liest nur den jüngsten passenden Job ohne vollständige Payload', async () => {
  const row = {
    id: 41,
    status: 'running',
    attempts: 1,
    max_attempts: 3,
    expected_review_version: 3,
    created_at: '2026-07-14T10:00:00.000Z',
    updated_at: '2026-07-14T10:01:00.000Z',
    finished_at: null
  };
  const db = createQueryRecorder([{ rows: [row] }]);

  const result = await getLatestReviewOptimizationJob({ postId: 19 }, db);

  assert.deepEqual(result, row);
  assert.match(db.calls[0].sql, /job_type = 'optimize_review_issues'/i);
  assert.match(db.calls[0].sql, /payload_json ->> 'post_id'/i);
  assert.match(db.calls[0].sql, /ORDER BY created_at DESC, id DESC LIMIT 1/i);
  assert.doesNotMatch(db.calls[0].sql, /SELECT\s+\*/i);
  assert.doesNotMatch(db.calls[0].sql, /payload_json\s+AS/i);
  assert.doesNotMatch(db.calls[0].sql, /last_error/i);
  assert.deepEqual(db.calls[0].params, [19]);
});

test('manueller GSC-Sync wird atomar gegated und verwendet ausschließlich einen manuellen Tages-Key', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 72, status: 'queued' }] }]);
  const payload = { startDate: '2026-06-16', endDate: '2026-07-13' };

  const result = await enqueueManualSearchConsoleSyncJob({
    localDate: '2026-07-14',
    payload,
    maxAttempts: 4
  }, db);

  assert.deepEqual(result, { id: 72, status: 'queued' });
  assert.deepEqual(db.calls[0].params, [
    'gsc-manual-sync:2026-07-14',
    payload,
    4
  ]);
  assert.match(db.calls[0].sql, /INSERT INTO content_jobs/i);
  assert.match(db.calls[0].sql, /WHERE EXISTS \([\s\S]*agent_enabled = TRUE/i);
  assert.match(db.calls[0].sql, /ON CONFLICT \(idempotency_key\) DO UPDATE/i);
  assert.match(db.calls[0].sql, /content_jobs\.job_type = 'sync_search_console'/i);
  assert.match(db.calls[0].sql, /content_jobs\.idempotency_key LIKE 'gsc-manual-sync:%'/i);
  assert.doesNotMatch(db.calls[0].sql, /gsc-sync:/i);
});

test('manueller GSC-Sync lässt aktive Duplikate aktiv und setzt terminale Jobs kontrolliert zurück', async () => {
  const db = createQueryRecorder([
    { rows: [{ id: 73, status: 'running', attempts: 2 }] },
    { rows: [{ id: 73, status: 'queued', attempts: 0 }] }
  ]);
  const input = {
    localDate: '2026-07-14',
    payload: { startDate: '2026-06-16', endDate: '2026-07-13' },
    maxAttempts: 3
  };

  assert.equal((await enqueueManualSearchConsoleSyncJob(input, db)).status, 'running');
  assert.equal((await enqueueManualSearchConsoleSyncJob(input, db)).status, 'queued');

  for (const call of db.calls) {
    assert.match(call.sql, /status IN \('completed', 'failed', 'needs_manual_attention'\)/i);
    assert.match(call.sql, /THEN 'queued'/i);
    assert.match(call.sql, /attempts = CASE[\s\S]*THEN 0/i);
    assert.match(call.sql, /locked_at = CASE[\s\S]*THEN NULL/i);
    assert.match(call.sql, /locked_by = CASE[\s\S]*THEN NULL/i);
    assert.match(call.sql, /finished_at = CASE[\s\S]*THEN NULL/i);
    assert.match(call.sql, /last_error = CASE[\s\S]*THEN NULL/i);
    assert.match(call.sql, /payload_json = CASE[\s\S]*EXCLUDED\.payload_json/i);
    assert.match(call.sql, /max_attempts = CASE[\s\S]*EXCLUDED\.max_attempts/i);
    assert.match(call.sql, /status IN \(\s*'queued', 'running', 'completed', 'failed', 'needs_manual_attention'\s*\)/i);
  }
});

test('manueller GSC-Sync meldet bei deaktiviertem Gate oder unpassendem Konflikt keinen Job', async () => {
  const db = createQueryRecorder([{ rows: [] }, { rows: [] }]);
  const input = {
    localDate: '2026-07-14',
    payload: { startDate: '2026-06-16', endDate: '2026-07-13' },
    maxAttempts: 3
  };

  assert.equal(await enqueueManualSearchConsoleSyncJob(input, db), null);
  assert.equal(await enqueueManualSearchConsoleSyncJob(input, db), null);
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

test('Lernjobs werden pro Artikel und Reviewversion genau einmal idempotent eingereiht', async () => {
  const row = { id: 13, job_type: 'process_learning_observations', max_attempts: 3 };
  const db = createQueryRecorder([{ rows: [row] }]);
  assert.equal(await enqueueLearningObservationJob({ postId: 51, reviewVersion: 4 }, db), row);
  assert.deepEqual(db.calls[0].params.slice(0, 5), [
    'process_learning_observations',
    'learning-observation:51:4',
    { postId: 51, reviewVersion: 4, source: 'internal_learning' },
    null,
    3
  ]);
  await assert.rejects(
    enqueueLearningObservationJob({ postId: 51, reviewVersion: 0 }, db),
    { code: 'CONTENT_LEARNING_JOB_PAYLOAD_INVALID' }
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
  assert.match(db.calls[0].sql, /^WITH locked_job AS MATERIALIZED/i);
  assert.match(db.calls[0].sql, /SELECT \* FROM content_jobs WHERE id = \$1 FOR UPDATE/i);
  assert.match(db.calls[0].sql, /locked_run AS MATERIALIZED[\s\S]*FOR UPDATE OF run/i);
  assert.match(db.calls[0].sql, /job_type <> 'send_admin_review_notification'/i);
  assert.match(db.calls[0].sql, /NOT EXISTS[\s\S]*jsonb_each[\s\S]*status[^=]*=[^']*'reserved'/i);
  assert.doesNotMatch(db.calls[0].sql, /^SELECT|;\s*SELECT/i);
});

test('Admin-Retry lässt Bestandsoptimierungen nur nach sicheren Fehlern ohne offene Reservierung zu', async () => {
  const db = createQueryRecorder([{ rows: [{
    id: 24,
    job_type: 'optimize_existing_post',
    status: 'queued'
  }] }]);

  const result = await retryContentJobForAdmin({ jobId: 24 }, db);

  assert.equal(result.status, 'queued');
  assert.match(
    db.calls[0].sql,
    /job_type NOT IN \('optimize_existing_post', 'revalidate_existing_post_revision'\)[\s\S]*last_error IN \('CONTENT_PROVIDER_SAFE_RETRY', 'CONTENT_JOB_LEASE_LOST'\)/i
  );
  assert.match(
    db.calls[0].sql,
    /job\.last_error IN \('CONTENT_PROVIDER_SAFE_RETRY', 'CONTENT_JOB_LEASE_LOST'\)[\s\S]*run\.status = 'running'/i
  );
  assert.match(
    db.calls[0].sql,
    /NOT EXISTS \( SELECT 1 FROM locked_run AS reservation_run[\s\S]*jsonb_each[\s\S]*status[^=]*=[^']*'reserved'/i
  );
  assert.match(
    db.calls[0].sql,
    /UPDATE content_runs AS run SET status = 'running',[\s\S]*candidate\.job_type NOT IN \('optimize_existing_post', 'revalidate_existing_post_revision'\)[\s\S]*candidate\.run_status IN \('failed', 'needs_manual_attention'\)/i
  );
  assert.match(
    db.calls[0].sql,
    /candidate\.run_id IS NULL[\s\S]*candidate\.run_status = 'running'[\s\S]*EXISTS \( SELECT 1 FROM reopened_run/i
  );
});

test('Admin-Retry öffnet nur zulässige terminale Nicht-Bestandsruns unter demselben Reservierungszaun', async () => {
  const db = createQueryRecorder([{ rows: [] }]);

  assert.equal(await retryContentJobForAdmin({ jobId: 25 }, db), null);

  const { sql } = db.calls[0];
  assert.match(sql, /eligible_retry AS MATERIALIZED/i);
  assert.match(sql, /COALESCE\(job\.last_error, ''\) <> 'provider_execution_uncertain'/i);
  assert.match(sql, /stage_result\.value ->> 'status' = 'reserved'/i);
  assert.match(sql, /candidate\.job_type NOT IN \('optimize_existing_post', 'revalidate_existing_post_revision'\)/i);
  assert.match(sql, /candidate\.run_status IN \('failed', 'needs_manual_attention'\)/i);
  assert.match(sql, /UPDATE content_jobs AS job[\s\S]*FROM eligible_retry AS candidate/i);
});

test('manueller Admin-Retry gewährt nach ausgeschöpften automatischen Versuchen einen kontrollierten Zusatzversuch', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 23, status: 'queued', attempts: 3, max_attempts: 4 }] }]);

  const result = await retryContentJobForAdmin({ jobId: 23, hardMaxAttempts: 3 }, db);

  assert.equal(result.status, 'queued');
  assert.deepEqual(db.calls[0].params, [23, 5]);
  assert.match(db.calls[0].sql, /max_attempts = LEAST\(\$2, GREATEST\(max_attempts, attempts \+ 1\)\)/i);
  assert.match(db.calls[0].sql, /attempts < \$2/i);
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

test('Revalidierungs-Cleanup persistiert ausschließlich den allowlisteten Resume-Intent', async () => {
  const { rescheduleJobWithoutAttemptConsumption } = await import('../repositories/contentJobRepository.js');
  const retryAt = new Date('2026-07-13T10:00:00.000Z');
  const db = createQueryRecorder([{ rows: [{ id: 10, status: 'queued' }] }]);
  const error = Object.assign(new Error('Interne Ursache darf nicht persistiert werden.'), {
    code: 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY',
    cleanupToken: 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:fail:CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED'
  });

  await rescheduleJobWithoutAttemptConsumption({
    id: 10,
    locked_by: 'worker-cleanup',
    attempts: 3
  }, error, { retryAt }, db);

  assert.equal(
    db.calls[0].params[3],
    'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:fail:CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED'
  );
  assert.equal(db.calls[0].params[3].includes('Interne Ursache'), false);
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

test('beide GSC-Jobtypen prüfen die operative Pause atomar beim Enqueue', async () => {
  const db = createQueryRecorder([
    { rows: [{ id: 72, status: 'queued' }] },
    { rows: [{ id: 73, status: 'queued' }] }
  ]);

  for (const jobType of ['sync_search_console', 'analyze_search_opportunities']) {
    await enqueueJob({
      jobType,
      idempotencyKey: `${jobType}:2026-06-21:2026-07-18`,
      payload: { startDate: '2026-06-21', endDate: '2026-07-18' }
    }, db);
  }

  assert.deepEqual(db.calls.map((call) => call.params.at(-1)), [true, true]);
  for (const call of db.calls) {
    assert.match(call.sql, /WHERE \$6 = FALSE OR EXISTS/i);
  }
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
  assert.match(db.calls[0].sql, /LEFT JOIN content_runs AS run ON run\.job_id = job\.id/i);
  assert.match(
    db.calls[0].sql,
    /WHEN expired\.run_status IN \('completed', 'failed', 'needs_manual_attention'\)[\s\S]*THEN expired\.run_status/i
  );
  assert.match(
    db.calls[0].sql,
    /expired\.run_status = 'completed'[\s\S]*THEN NULL[\s\S]*expired\.run_status IN \('failed', 'needs_manual_attention'\)/i
  );
  assert.match(db.calls[0].sql, /job\.locked_at < NOW\(\) - \(\$1 \* INTERVAL '1 minute'\)/i);
  assert.match(db.calls[0].sql, /WHEN job\.attempts < job\.max_attempts THEN 'queued'[\s\S]*ELSE 'failed'/i);
  assert.match(db.calls[0].sql, /locked_at = NULL/i);
  assert.match(db.calls[0].sql, /locked_by = NULL/i);
  assert.match(db.calls[0].sql, /finished_at = CASE[\s\S]*WHEN job\.attempts < job\.max_attempts THEN NULL[\s\S]*ELSE NOW\(\)/i);
  assert.deepEqual(db.calls[0].params, [30]);
});

test('Recovery übernimmt einen terminalen Run auch nach dem letzten Jobversuch atomar', async () => {
  const recovered = {
    id: 5,
    status: 'completed',
    attempts: 3,
    max_attempts: 3,
    last_error: null,
    locked_at: null,
    locked_by: null
  };
  const db = createQueryRecorder([{ rows: [recovered] }]);

  assert.deepEqual(await recoverExpiredJobs(30, db), [recovered]);

  const sql = db.calls[0].sql;
  const terminalBranch = sql.indexOf("expired.run_status IN ('completed', 'failed', 'needs_manual_attention')");
  const exhaustedBranch = sql.indexOf('job.attempts < job.max_attempts');
  assert.ok(terminalBranch >= 0 && terminalBranch < exhaustedBranch);
  assert.match(sql, /COALESCE\(expired\.run_finished_at, NOW\(\)\)/i);
  assert.match(sql, /COALESCE\(expired\.run_error_code, 'CONTENT_RUN_FAILED'\)/i);
});

test('Recovery hält Revalidierungs-Cleanups auch mit terminalem Run wiederaufnehmbar', async () => {
  const recovered = {
    id: 6,
    job_type: 'revalidate_existing_post_revision',
    status: 'queued',
    attempts: 2,
    max_attempts: 3,
    locked_at: null,
    locked_by: null,
    finished_at: null
  };
  const db = createQueryRecorder([{ rows: [recovered] }]);

  assert.deepEqual(await recoverExpiredJobs(30, db), [recovered]);

  const sql = db.calls[0].sql;
  const terminalBranch = sql.indexOf("expired.run_status IN ('completed', 'failed', 'needs_manual_attention')");
  const cleanupBranch = sql.indexOf("job.job_type = 'revalidate_existing_post_revision'");
  assert.ok(cleanupBranch >= 0 && terminalBranch > cleanupBranch);
  assert.match(
    sql,
    /job\.job_type = 'revalidate_existing_post_revision'[\s\S]*THEN 'queued'/i
  );
  assert.match(
    sql,
    /job\.job_type = 'revalidate_existing_post_revision'[\s\S]*job\.attempts >= job\.max_attempts[\s\S]*CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:/i
  );
  assert.match(
    sql,
    /attempts = CASE[\s\S]*job\.job_type = 'revalidate_existing_post_revision'[\s\S]*GREATEST\(job\.attempts - 1, 0\)/i
  );
  assert.match(
    sql,
    /attempts = CASE[\s\S]*job\.job_type = 'revalidate_existing_post_revision'[\s\S]*GREATEST\(job\.attempts - 1, 0\)[\s\S]*expired\.run_status IN \('completed', 'failed', 'needs_manual_attention'\)[\s\S]*THEN job\.attempts/i
  );
  assert.match(
    sql,
    /last_error = CASE[\s\S]*job\.job_type = 'revalidate_existing_post_revision'[\s\S]*expired\.run_status IN \('completed', 'failed', 'needs_manual_attention'\)[\s\S]*THEN 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY'/i
  );
  assert.match(
    sql,
    /finished_at = CASE[\s\S]*job\.job_type = 'revalidate_existing_post_revision'[\s\S]*THEN NULL/i
  );
  assert.match(
    sql,
    /job\.job_type = 'revalidate_existing_post_revision'[\s\S]*job\.attempts >= job\.max_attempts[\s\S]*THEN 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:fail:CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED'/i
  );
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

test('Recovery behandelt Newsletter-Deliveries delivery-basiert und lässt Admin- sowie normale Jobs unverändert', async () => {
  const recovered = [
    { id: 79, job_type: 'send_blog_newsletter_delivery', status: 'queued', attempts: 5 },
    { id: 80, job_type: 'send_admin_review_notification', status: 'queued', attempts: 5 },
    { id: 81, job_type: 'send_blog_newsletter', status: 'failed', attempts: 3 }
  ];
  const db = createQueryRecorder([{ rows: recovered }]);

  assert.deepEqual(await recoverExpiredJobs(30, db), recovered);

  const sql = db.calls[0].sql;
  assert.match(
    sql,
    /job\.job_type IN \('send_admin_review_notification', 'send_blog_newsletter_delivery'\)/i
  );
  assert.match(
    sql,
    /job\.job_type = 'send_admin_review_notification'[\s\S]*delivery\.notification_type = 'admin_review'/i
  );
  assert.match(
    sql,
    /job\.job_type = 'send_blog_newsletter_delivery'[\s\S]*delivery\.notification_type = 'newsletter_article'/i
  );
  assert.match(
    sql,
    /job\.job_type IN \('send_admin_review_notification', 'send_blog_newsletter_delivery'\)[\s\S]*expired\.delivery_status IN \('queued', 'sending'\)[\s\S]*THEN 'queued'/i
  );
  assert.match(sql, /delivery_status = 'queued'[\s\S]*delivery_next_attempt_at/i);
  assert.match(sql, /delivery_status = 'sending'[\s\S]*THEN NOW\(\)/i);
  assert.match(sql, /ELSE CASE[\s\S]*job\.attempts < job\.max_attempts[\s\S]*ELSE 'failed'/i);
});

test('Recovery vergleicht malformed Delivery-IDs ohne riskanten numerischen Cast', async () => {
  const db = createQueryRecorder([{ rows: [] }]);

  await recoverExpiredJobs(30, db);

  const sql = db.calls[0].sql;
  assert.match(sql, /delivery\.id::text = job\.payload_json\s*->>\s*'deliveryId'/i);
  assert.doesNotMatch(sql, /\(job\.payload_json\s*->>\s*'deliveryId'\)::(?:bigint|integer|numeric)/i);
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

test('finishRun typisiert den Status für PostgreSQL in Zuweisung und Vergleich eindeutig', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 21, status: 'failed' }] }]);

  await finishRun(21, { status: 'failed', errorReport: { code: 'TOPIC_FAILED' } }, db);

  assert.match(db.calls[0].sql, /SET status = \$2::varchar\(32\)/i);
  assert.match(db.calls[0].sql, /WHEN \$2::varchar\(32\) = 'completed'/i);
  assert.match(db.calls[0].sql, /THEN 'completed'::varchar\(64\)/i);
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

test('createTopic speichert für KI-Themen ausschließlich die kontrollierte serverseitige Quelle', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 32, source: 'ai_topic_research' }] }]);
  const descriptiveAiSource = 'Automatisch aus Zielgruppenproblemen, bestehendem Seiteninventar und kaufnaher Suchintention abgeleitet';

  const result = await createTopic({
    topic: 'Warum bringt meine Website keine Anfragen?',
    suggestedTitle: 'Warum deine Website keine Anfragen bringt',
    primaryKeyword: 'Website bringt keine Anfragen',
    secondaryKeywords: ['Website optimieren'],
    contentCluster: 'Conversion',
    searchIntent: 'problem-aware',
    targetAudience: 'Kleine Unternehmen in Berlin',
    source: descriptiveAiSource
  }, db);

  assert.equal(result.source, 'ai_topic_research');
  assert.equal(db.calls[0].params[7], 'ai_topic_research');
  assert.ok(descriptiveAiSource.length > 64);
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

test('retryOrFailJob persistiert für sichere Bestandswiederholungen einen stabilen Fehlercode', async () => {
  const row = { id: 12, status: 'failed', attempts: 3, max_attempts: 3 };
  const db = createQueryRecorder([{ rows: [row] }, { rows: [row] }]);
  const error = Object.assign(new Error('Sicher vor Providerausführung fehlgeschlagen.'), {
    code: 'CONTENT_PROVIDER_SAFE_RETRY',
    retryable: true
  });

  assert.equal(await retryOrFailJob({
    id: 12,
    job_type: 'optimize_existing_post',
    locked_by: 'worker-1',
    attempts: 3
  }, error, {}, db), row);
  assert.equal(db.calls[0].params[3], 'CONTENT_PROVIDER_SAFE_RETRY');
  assert.equal(await retryOrFailJob({
    id: 13,
    job_type: 'revalidate_existing_post_revision',
    locked_by: 'worker-1',
    attempts: 3
  }, error, {}, db), row);
  assert.equal(db.calls[1].params[3], 'CONTENT_PROVIDER_SAFE_RETRY');
});

test('Lease-Recovery kennzeichnet verlorene Leases eindeutig und plant sichere Versuche normal neu ein', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 19, status: 'queued' }] }]);

  await recoverExpiredJobs(30, db);

  assert.match(
    db.calls[0].sql,
    /last_error = CASE[\s\S]*CONTENT_JOB_LEASE_LOST/i
  );
  assert.match(
    db.calls[0].sql,
    /WHEN job\.attempts < job\.max_attempts THEN 'queued'/i
  );
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

test('bestätigte deterministische Bestandsfehler werden atomar, protokolliert und ohne Liveartikelmutation geschlossen', async () => {
  const discarded = { id: 44, status: 'cancelled' };
  const db = createTransactionalRecorder([
    { rows: [] },
    { rows: [{ id: 19, published: true }] },
    { rows: [discarded] },
    { rows: [] }
  ]);

  assert.equal(await discardDeterministicExistingOptimizationJobForAdmin({
    jobId: 44,
    postId: 19,
    adminId: 7
  }, db), discarded);

  const calls = db.client.calls;
  assert.equal(calls[0].sql, 'BEGIN');
  assert.match(calls[1].sql, /SELECT id, published FROM posts[\s\S]*FOR UPDATE/i);
  assert.deepEqual(calls[1].params, [19]);
  assert.deepEqual(calls[2].params.slice(0, 3), [44, 19, 7]);
  assert.match(calls[2].sql, /^WITH locked_job AS MATERIALIZED/i);
  assert.match(calls[2].sql, /job\.job_type = 'optimize_existing_post'/i);
  assert.match(calls[2].sql, /job\.status = 'needs_manual_attention'/i);
  assert.match(calls[2].sql, /run\.status = 'needs_manual_attention'/i);
  assert.match(calls[2].sql, /payload_json ->> 'post_id' = \$2::text/i);
  assert.match(calls[2].sql, /NOT EXISTS[\s\S]*content_post_revisions[\s\S]*status = 'draft'/i);
  assert.match(calls[2].sql, /jsonb_each[\s\S]*value ->> 'status' = 'reserved'/i);
  assert.match(calls[2].sql, /existing_optimization_discard:admin/i);
  assert.match(calls[2].sql, /jsonb_build_object[\s\S]*'adminId',[\s\S]*\$3::integer/i);
  assert.match(calls[2].sql, /UPDATE content_jobs AS job[\s\S]*status = 'cancelled'/i);
  assert.doesNotMatch(calls[2].sql, /UPDATE posts|DELETE FROM posts/i);
  assert.equal(calls[3].sql, 'COMMIT');
  assert.equal(db.events.at(-1).type, 'release');
});

test('Schließaktion bleibt bei Doppelklick idempotent und verwirft keine ungeklärte Providerreservierung', async () => {
  const db = createTransactionalRecorder([
    { rows: [] },
    { rows: [{ id: 19, published: true }] },
    { rows: [{ id: 44, status: 'cancelled' }] },
    { rows: [] }
  ]);
  await discardDeterministicExistingOptimizationJobForAdmin({
    jobId: 44,
    postId: 19,
    adminId: 7
  }, db);

  assert.match(db.client.calls[2].sql, /already_discarded/i);
  assert.match(db.client.calls[2].sql, /provider_execution_uncertain/i);
  assert.match(db.client.calls[2].sql, /provider_stage_persistence_uncertain/i);
});

test('createRun liefert pro job_id atomar denselben wiederaufnehmbaren Lauf', async () => {
  const existing = { id: 88, job_id: 7, stage_results_json: { article_generation: { ok: true } } };
  const db = createQueryRecorder([{ rows: [existing] }, { rows: [existing] }]);

  assert.equal(await createRun({ jobId: 7 }, db), existing);
  assert.equal(await createRun({ jobId: 7 }, db), existing);
  assert.match(db.calls[0].sql, /ON CONFLICT \(job_id\) DO UPDATE/i);
  assert.match(db.calls[0].sql, /stage_results_json = content_runs\.stage_results_json/i);
});
