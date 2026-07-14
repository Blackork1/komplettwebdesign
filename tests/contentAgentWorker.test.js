import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import {
  createContentWorker,
  isHeartbeatFresh,
  LeaseLostError
} from '../services/contentAgent/workerService.js';
import {
  berlinDateKey,
  createProductionJobHandler,
  createProductionRuntime,
  createShutdownController,
  loadProductionModules,
  LEARNING_JOB_TYPES,
  REGENERATION_JOB_TYPES,
  SUPPORTED_JOB_TYPES,
  startContentWorker
} from '../scripts/contentWorker.js';
import * as contentWorkerModule from '../scripts/contentWorker.js';
import {
  checkWorkerHeartbeat,
  runWorkerHealthcheck
} from '../scripts/contentWorkerHealthcheck.js';
import {
  createDryRunAdapterMonitor,
  runContentAgentDryRun
} from '../scripts/contentAgentDryRun.js';
import {
  createContentAgentJobSnapshot,
  resolveContentAgentRuntimeConfig
} from '../services/contentAgent/runtimeConfigService.js';
import { runSearchConsoleSchedulerTick } from '../services/contentAgent/searchConsoleSchedulerService.js';
import { retryOrFailJob as persistRetryOrFailJob } from '../repositories/contentJobRepository.js';

const execFileAsync = promisify(execFile);
const { SEARCH_CONSOLE_JOB_TYPES } = contentWorkerModule;

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function createWorkerHarness(overrides = {}) {
  const calls = [];
  const claim = { id: 7, locked_by: 'worker-test', attempts: 1, payload_json: {} };
  const dependencies = {
    enabled: true,
    workerId: 'worker-test',
    workerName: 'content-worker',
    version: 'test',
    pollMs: 5_000,
    heartbeatMs: 30_000,
    leaseMinutes: 30,
    leaseRenewMs: 60_000,
    setIntervalFn(callback, milliseconds) {
      const timer = { callback };
      calls.push(['interval', milliseconds, timer]);
      return timer;
    },
    clearIntervalFn(timer) { calls.push(['clear', timer]); },
    async upsertHeartbeat(input) { calls.push(['heartbeat', input]); },
    async recoverExpiredJobs(minutes) { calls.push(['recover', minutes]); },
    async claimNextJob(workerId) { calls.push(['claim', workerId]); return claim; },
    async handleJob(job) { calls.push(['handle', job]); return { status: 'completed' }; },
    async renewJobLease(job) { calls.push(['renew', job]); return { id: job.id }; },
    async completeJob(job) { calls.push(['complete', job]); return { id: job.id }; },
    async failJob(job, error) { calls.push(['fail', job, error]); return { id: job.id }; },
    async rescheduleJobWithoutAttemptConsumption(job, error, options) {
      calls.push(['reschedule_without_attempt', job, error, options]);
      return { id: job.id, status: 'queued' };
    },
    async retryOrFailJob(job, error, options) { calls.push(['retry', job, error, options]); return { id: job.id, status: 'queued' }; },
    async markJobNeedsManualAttention(job, reason) { calls.push(['manual', job, reason]); return { id: job.id }; },
    ...overrides
  };
  return { worker: createContentWorker(dependencies), calls, claim };
}

test('isHeartbeatFresh unterscheidet 89 und 91 Sekunden alte Heartbeats', () => {
  const now = new Date('2026-07-11T10:00:00.000Z');

  assert.equal(isHeartbeatFresh(new Date(now.getTime() - 89_000), now, 90_000), true);
  assert.equal(isHeartbeatFresh(new Date(now.getTime() - 91_000), now, 90_000), false);
});

test('ein deaktivierter Worker claimt keine Jobs', async () => {
  const { worker, calls } = createWorkerHarness({ enabled: false });

  await worker.start();
  await worker.processOnce();

  assert.equal(calls.some(([type]) => type === 'claim'), false);
});

test('processOnce schreibt auch im Leerlauf Heartbeat, erholt Leases und claimt höchstens einen Job', async () => {
  const { worker, calls } = createWorkerHarness({
    async claimNextJob(workerId) { calls.push(['claim', workerId]); return null; }
  });

  await worker.processOnce();

  assert.deepEqual(calls.map(([type]) => type), ['heartbeat', 'recover', 'claim']);
});

test('start wartet den ersten Heartbeat ab, bevor der Scheduler sicher starten kann', async () => {
  const heartbeatGate = deferred();
  const { worker, calls } = createWorkerHarness({
    async upsertHeartbeat(input) {
      calls.push(['heartbeat', input]);
      await heartbeatGate.promise;
    },
    async claimNextJob(workerId) { calls.push(['claim', workerId]); return null; }
  });
  let started = false;
  const starting = worker.start().then((result) => {
    started = true;
    return result;
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, false);
  assert.equal(calls.filter(([type]) => type === 'heartbeat').length, 1);

  heartbeatGate.resolve();
  assert.equal(await starting, true);
  await worker.whenIdle();
  assert.equal(calls.filter(([type]) => type === 'heartbeat').length, 1);
  assert.equal(calls.filter(([type]) => type === 'claim').length, 1);
  await worker.stop();
});

test('processOnce verarbeitet und finalisiert genau einen Job mit dem vollständigen Claim', async () => {
  const { worker, calls, claim } = createWorkerHarness();

  const result = await worker.processOnce();

  assert.deepEqual(result, { status: 'completed' });
  assert.equal(calls.filter(([type]) => type === 'claim').length, 1);
  assert.deepEqual(calls.find(([type]) => type === 'complete')?.[1], claim);
});

test('parallele processOnce-Aufrufe starten niemals zwei Claims oder Handler', async () => {
  const gate = deferred();
  const { worker, calls } = createWorkerHarness({
    async handleJob(job) {
      calls.push(['handle', job]);
      await gate.promise;
      return { status: 'completed' };
    }
  });

  const first = worker.processOnce();
  const second = worker.processOnce();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(calls.filter(([type]) => type === 'claim').length, 1);
  assert.equal(calls.filter(([type]) => type === 'handle').length, 1);
  gate.resolve();
  assert.deepEqual(await Promise.all([first, second]), [
    { status: 'completed' },
    { status: 'completed' }
  ]);
});

test('ein unabhängiger Heartbeat läuft während langer Jobs weiter ohne erneut zu claimen', async () => {
  const gate = deferred();
  const { worker, calls } = createWorkerHarness({
    async handleJob(job) {
      calls.push(['handle', job]);
      await gate.promise;
      return { status: 'completed' };
    }
  });

  await worker.start();
  await new Promise((resolve) => setImmediate(resolve));
  const timers = calls.filter(([type]) => type === 'interval');
  const heartbeatTimer = timers.find(([, milliseconds]) => milliseconds === 30_000)?.[2];
  assert.ok(heartbeatTimer, 'Ein eigener Heartbeat-Timer fehlt.');

  await heartbeatTimer.callback();
  assert.equal(calls.filter(([type]) => type === 'heartbeat').length, 2);
  assert.equal(calls.filter(([type]) => type === 'claim').length, 1);
  assert.equal(calls.filter(([type]) => type === 'recover').length, 1);
  assert.equal(calls.filter(([type]) => type === 'handle').length, 1);

  gate.resolve();
  await worker.whenIdle();
  await worker.stop();
  assert.equal(calls.filter(([type]) => type === 'clear').length, 3);
});

test('langsame Heartbeats sind nicht reentrant und gehören zum Worker-Idle-Zustand', async () => {
  const heartbeatGate = deferred();
  let slowHeartbeat = false;
  const { worker, calls } = createWorkerHarness({
    async claimNextJob(workerId) { calls.push(['claim', workerId]); return null; },
    async upsertHeartbeat(input) {
      calls.push(['heartbeat', input]);
      if (slowHeartbeat) await heartbeatGate.promise;
      return { fresh: true };
    },
    setTimeoutFn(callback, milliseconds) {
      calls.push(['timeout', milliseconds]);
      queueMicrotask(callback);
      return 'stop-timeout';
    },
    clearTimeoutFn(timer) { calls.push(['clear-timeout', timer]); }
  });

  await worker.start();
  await worker.whenIdle();
  slowHeartbeat = true;
  const heartbeatTimer = calls.find(([, milliseconds]) => milliseconds === 30_000)?.[2];
  const firstTick = heartbeatTimer.callback();
  const secondTick = heartbeatTimer.callback();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(calls.filter(([type]) => type === 'heartbeat').length, 2);
  assert.deepEqual(await worker.stop(), { drained: false });
  let idle = false;
  const idlePromise = worker.whenIdle().then(() => { idle = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(idle, false);

  heartbeatGate.resolve();
  await Promise.all([firstTick, secondTick, idlePromise]);
  assert.equal(idle, true);
  assert.equal(calls.filter(([type]) => type === 'clear').length, 2);
});

test('stop verhindert neue Claims und wartet auf den laufenden Job', async () => {
  const gate = deferred();
  const { worker, calls } = createWorkerHarness({
    async handleJob(job) {
      calls.push(['handle', job]);
      await gate.promise;
      return { status: 'completed' };
    }
  });

  await worker.start();
  const running = worker.processOnce();
  await Promise.resolve();
  const stopping = worker.stop();
  await Promise.resolve();
  assert.equal(calls.some(([type]) => type === 'clear'), true);

  gate.resolve();
  await Promise.all([running, stopping]);
  const claimCount = calls.filter(([type]) => type === 'claim').length;
  await worker.processOnce();
  assert.equal(calls.filter(([type]) => type === 'claim').length, claimCount);
});

test('stop beendet sein Warten nach der konfigurierten Grenze sauber', async () => {
  const gate = deferred();
  const { worker, calls } = createWorkerHarness({
    stopTimeoutMs: 250,
    setTimeoutFn(callback, milliseconds) {
      calls.push(['timeout', milliseconds]);
      queueMicrotask(callback);
      return 'stop-timeout';
    },
    clearTimeoutFn(timer) { calls.push(['clear-timeout', timer]); },
    async handleJob(job) {
      calls.push(['handle', job]);
      await gate.promise;
      return { status: 'completed' };
    }
  });

  const running = worker.processOnce();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(await worker.stop(), { drained: false });
  assert.deepEqual(calls.find(([type]) => type === 'timeout'), ['timeout', 250]);

  gate.resolve();
  await running;
});

test('verlorene Lease beim erfolgreichen Handler liefert lease_lost ohne zweiten Abschlussversuch', async () => {
  const { worker, calls } = createWorkerHarness({
    async completeJob(job) { calls.push(['complete', job]); return null; }
  });

  assert.deepEqual(await worker.processOnce(), { status: 'lease_lost' });
  assert.equal(calls.filter(([type]) => type === 'complete').length, 1);
  assert.equal(calls.filter(([type]) => type === 'fail').length, 0);
});

test('verlorene Lease beim Fehlerpfad liefert lease_lost ohne unsicheren Wiederholungsabschluss', async () => {
  const { worker, calls } = createWorkerHarness({
    async handleJob(job) { calls.push(['handle', job]); throw new Error('Providerfehler'); },
    async retryOrFailJob(job, error, options) { calls.push(['retry', job, error, options]); return null; }
  });

  assert.deepEqual(await worker.processOnce(), { status: 'lease_lost' });
  assert.equal(calls.filter(([type]) => type === 'retry').length, 1);
  assert.equal(calls.filter(([type]) => type === 'complete').length, 0);
});

test('Worker erneuert die Job-Lease während handleJob und reicht einen Fence-Guard durch', async () => {
  const gate = deferred();
  let guard;
  const { worker, calls } = createWorkerHarness({
    async handleJob(job, context) {
      calls.push(['handle', job]);
      guard = context.leaseGuard;
      await gate.promise;
      await guard();
      return { status: 'completed' };
    }
  });

  const processing = worker.processOnce();
  await new Promise((resolve) => setImmediate(resolve));
  const leaseTimer = calls.find(([, milliseconds]) => milliseconds === 60_000)?.[2];
  assert.ok(leaseTimer);
  await leaseTimer.callback();
  assert.equal(calls.filter(([type]) => type === 'renew').length, 1);
  gate.resolve();
  assert.equal((await processing).status, 'completed');
  assert.equal(calls.some(([type]) => type === 'clear'), true);
});

test('jeder explizite Lease-Guard erneuert den DB-Fence aktuell und koalesziert parallele Aufrufe', async () => {
  const renewGate = deferred();
  let renewCalls = 0;
  const { worker } = createWorkerHarness({
    async renewJobLease(job) {
      renewCalls += 1;
      if (renewCalls === 1) await renewGate.promise;
      return { id: job.id };
    },
    async handleJob(_job, { leaseGuard }) {
      const first = leaseGuard();
      const second = leaseGuard();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(renewCalls, 1);
      renewGate.resolve();
      await Promise.all([first, second]);
      await leaseGuard();
      return { status: 'completed' };
    }
  });

  assert.equal((await worker.processOnce()).status, 'completed');
  assert.equal(renewCalls, 3, 'zwei Handler-Fences plus Abschluss-Fence müssen aktuell erneuern');
});

test('verlorene Lease stoppt den Guard und verhindert alle terminalen Queueupdates', async () => {
  const gate = deferred();
  const { worker, calls } = createWorkerHarness({
    async renewJobLease(job) { calls.push(['renew', job]); return null; },
    async handleJob(job, { leaseGuard }) {
      calls.push(['handle', job]);
      await gate.promise;
      await leaseGuard();
      return { status: 'completed' };
    }
  });

  const processing = worker.processOnce();
  await new Promise((resolve) => setImmediate(resolve));
  const leaseTimer = calls.find(([, milliseconds]) => milliseconds === 60_000)?.[2];
  await leaseTimer.callback();
  gate.resolve();

  assert.deepEqual(await processing, { status: 'lease_lost' });
  assert.equal(calls.some(([type]) => ['complete', 'fail', 'retry', 'manual'].includes(type)), false);
});

test('needs_manual_attention erhält einen eigenen Queuezustand statt completed', async () => {
  const { worker, calls } = createWorkerHarness({
    async handleJob(job) {
      calls.push(['handle', job]);
      return { status: 'needs_manual_attention', code: 'budget_limit_reached' };
    }
  });

  assert.equal((await worker.processOnce()).status, 'needs_manual_attention');
  assert.equal(calls.filter(([type]) => type === 'manual').length, 1);
  assert.equal(calls.filter(([type]) => type === 'complete').length, 0);
});

test('temporäre Handlerfehler werden gefenct mit Backoff erneut eingeplant', async () => {
  const { worker, calls } = createWorkerHarness({
    async handleJob(job) { calls.push(['handle', job]); throw new Error('ECONNRESET'); }
  });

  assert.equal((await worker.processOnce()).status, 'queued');
  assert.equal(calls.filter(([type]) => type === 'retry').length, 1);
  assert.equal(calls.filter(([type]) => type === 'fail').length, 0);
  assert.equal(calls.find(([type]) => type === 'retry')[3].backoffSeconds > 0, true);
});

test('Worker reicht eine explizite Retryzeit lease-sicher an das Repository weiter', async () => {
  const retryAt = new Date('2026-07-12T10:15:00.000Z');
  const retryable = Object.assign(new Error('SMTP vorübergehend nicht erreichbar'), {
    retryable: true,
    retryAt
  });
  const { worker, calls, claim } = createWorkerHarness({
    async handleJob(job) { calls.push(['handle', job]); throw retryable; }
  });

  assert.equal((await worker.processOnce()).status, 'queued');
  const retry = calls.find(([type]) => type === 'retry');
  assert.equal(retry[3].retryAt, retryAt);
  assert.equal(retry[3].backoffSeconds, 30);
  assert.deepEqual(retry[1], claim);
});

test('NOT_DUE wird lease-sicher ohne Verbrauch des Jobversuchs neu eingeplant', async () => {
  const retryAt = new Date('2026-07-12T22:00:00.000Z');
  const notDue = Object.assign(new Error('Zustellung noch nicht fällig'), {
    code: 'CONTENT_ADMIN_NOTIFICATION_NOT_DUE',
    retryable: true,
    doesNotConsumeAttempt: true,
    retryAt
  });
  const { worker, calls, claim } = createWorkerHarness({
    async handleJob(job) { calls.push(['handle', job]); throw notDue; }
  });

  assert.equal((await worker.processOnce()).status, 'queued');
  const reschedule = calls.find(([type]) => type === 'reschedule_without_attempt');
  assert.deepEqual(reschedule?.[1], claim);
  assert.equal(reschedule?.[2], notDue);
  assert.deepEqual(reschedule?.[3], { retryAt });
  assert.equal(calls.some(([type]) => type === 'retry'), false);
  assert.equal(calls.some(([type]) => type === 'fail'), false);
});

test('Newsletter-NOT_DUE wird nur mit exaktem Code, Boolean-Flags und Date versuchsneutral eingeplant', async () => {
  const retryAt = new Date('2026-07-12T22:00:00.000Z');
  const notDue = Object.assign(new Error('Newsletter-Zustellung noch nicht fällig'), {
    code: 'CONTENT_NEWSLETTER_NOT_DUE',
    retryable: true,
    doesNotConsumeAttempt: true,
    retryAt
  });
  const valid = createWorkerHarness({
    async handleJob(job) { valid.calls.push(['handle', job]); throw notDue; }
  });

  assert.equal((await valid.worker.processOnce()).status, 'queued');
  assert.deepEqual(valid.calls.find(([type]) => type === 'reschedule_without_attempt')?.[3], { retryAt });
  assert.equal(valid.calls.some(([type]) => type === 'retry'), false);

  for (const malformed of [
    { ...notDue, retryAt: retryAt.toISOString() },
    { ...notDue, retryable: 'true' },
    { ...notDue, doesNotConsumeAttempt: 1 },
    { ...notDue, code: 'CONTENT_NEWSLETTER_NOT_DUE_EXTRA' }
  ]) {
    const error = Object.assign(new Error('Malformed'), malformed);
    const current = createWorkerHarness({
      async handleJob(job) { current.calls.push(['handle', job]); throw error; }
    });
    assert.equal((await current.worker.processOnce()).status, 'queued');
    assert.equal(current.calls.some(([type]) => type === 'reschedule_without_attempt'), false);
    assert.equal(current.calls.filter(([type]) => type === 'retry').length, 1);
  }
});

test('nur explizites NOT_DUE darf einen Jobversuch zurückgeben', async () => {
  const retryAt = new Date('2026-07-12T22:00:00.000Z');
  const otherError = Object.assign(new Error('Anderer Fehler'), {
    code: 'CONTENT_OTHER_RETRY',
    retryable: true,
    doesNotConsumeAttempt: true,
    retryAt
  });
  const { worker, calls } = createWorkerHarness({
    async handleJob(job) { calls.push(['handle', job]); throw otherError; }
  });

  assert.equal((await worker.processOnce()).status, 'queued');
  assert.equal(calls.some(([type]) => type === 'reschedule_without_attempt'), false);
  assert.equal(calls.filter(([type]) => type === 'retry').length, 1);
});

test('Crash nach Delivery-Retry-Commit bewahrt den sechsten Jobclaim für den sechsten SMTP-Versuch', async () => {
  const retryAt = new Date('2026-07-13T10:00:00.000Z');
  let currentNow = new Date('2026-07-12T22:00:00.000Z');
  const delivery = { attempts: 5, nextAttemptAt: retryAt };
  const job = {
    id: 77,
    job_type: 'send_admin_review_notification',
    status: 'running',
    attempts: 5,
    max_attempts: 6,
    locked_by: 'abgestürzter-worker',
    run_after: new Date('2026-07-12T21:00:00.000Z'),
    payload_json: { deliveryId: 7 }
  };
  let reschedules = 0;
  let smtpCalls = 0;

  const worker = createContentWorker({
    enabled: true,
    workerId: 'recovery-worker',
    workerName: 'content-worker',
    version: 'test',
    leaseMinutes: 30,
    setIntervalFn(callback) { return { callback }; },
    clearIntervalFn() {},
    async upsertHeartbeat() {},
    async recoverExpiredJobs() {
      if (job.status === 'running' && job.locked_by === 'abgestürzter-worker') {
        job.status = 'queued';
        job.locked_by = null;
      }
      return [];
    },
    async claimNextJob(workerId) {
      if (job.status !== 'queued' || currentNow < job.run_after) return null;
      job.status = 'running';
      job.attempts += 1;
      job.locked_by = workerId;
      return { ...job };
    },
    async handleJob() {
      if (currentNow < delivery.nextAttemptAt) {
        throw Object.assign(new Error('Noch nicht fällig'), {
          code: 'CONTENT_ADMIN_NOTIFICATION_NOT_DUE',
          retryable: true,
          doesNotConsumeAttempt: true,
          retryAt: delivery.nextAttemptAt
        });
      }
      smtpCalls += 1;
      delivery.attempts += 1;
      return { status: 'completed' };
    },
    async renewJobLease(claim) { return claim.attempts === job.attempts ? { ...job } : null; },
    async completeJob() { job.status = 'completed'; job.locked_by = null; return { ...job }; },
    async failJob() { job.status = 'failed'; return { ...job }; },
    async retryOrFailJob() { job.status = 'queued'; job.locked_by = null; return { ...job }; },
    async rescheduleJobWithoutAttemptConsumption(claim, error, { retryAt: scheduledAt }) {
      assert.equal(claim.attempts, 6);
      assert.equal(error.doesNotConsumeAttempt, true);
      assert.equal(scheduledAt, retryAt);
      job.status = 'queued';
      job.attempts -= 1;
      job.locked_by = null;
      job.run_after = scheduledAt;
      reschedules += 1;
      return { ...job };
    },
    async markJobNeedsManualAttention() { throw new Error('nicht erwartet'); }
  });

  assert.equal((await worker.processOnce()).status, 'queued');
  assert.equal(job.attempts, 5);
  assert.equal(reschedules, 1);
  assert.equal(smtpCalls, 0);

  currentNow = retryAt;
  assert.deepEqual(await worker.processOnce(), { status: 'completed' });
  assert.equal(job.attempts, 6);
  assert.equal(delivery.attempts, 6);
  assert.equal(smtpCalls, 1);
});

test('Newsletter-Delivery-Crash bewahrt Claim sechs und verbraucht NOT_DUE nicht', async () => {
  const retryAt = new Date('2026-07-13T10:00:00.000Z');
  let currentNow = new Date('2026-07-12T22:00:00.000Z');
  const delivery = { attempts: 5, nextAttemptAt: retryAt };
  const job = {
    id: 79,
    job_type: 'send_blog_newsletter_delivery',
    status: 'running',
    attempts: 5,
    max_attempts: 6,
    locked_by: 'abgestürzter-worker',
    run_after: new Date('2026-07-12T21:00:00.000Z'),
    payload_json: { deliveryId: 9 }
  };
  let reschedules = 0;
  let smtpCalls = 0;

  const worker = createContentWorker({
    enabled: true,
    workerId: 'newsletter-recovery-worker',
    workerName: 'content-worker',
    version: 'test',
    leaseMinutes: 30,
    setIntervalFn(callback) { return { callback }; },
    clearIntervalFn() {},
    async upsertHeartbeat() {},
    async recoverExpiredJobs() {
      if (job.status === 'running' && job.locked_by === 'abgestürzter-worker') {
        job.status = 'queued';
        job.locked_by = null;
      }
      return [];
    },
    async claimNextJob(workerId) {
      if (job.status !== 'queued' || currentNow < job.run_after) return null;
      job.status = 'running';
      job.attempts += 1;
      job.locked_by = workerId;
      return { ...job };
    },
    async handleJob() {
      if (currentNow < delivery.nextAttemptAt) {
        throw Object.assign(new Error('Noch nicht fällig'), {
          code: 'CONTENT_NEWSLETTER_NOT_DUE',
          retryable: true,
          doesNotConsumeAttempt: true,
          retryAt: delivery.nextAttemptAt
        });
      }
      smtpCalls += 1;
      delivery.attempts += 1;
      return { status: 'completed' };
    },
    async renewJobLease(claim) { return claim.attempts === job.attempts ? { ...job } : null; },
    async completeJob() { job.status = 'completed'; job.locked_by = null; return { ...job }; },
    async failJob() { job.status = 'failed'; return { ...job }; },
    async retryOrFailJob() { job.status = 'queued'; job.locked_by = null; return { ...job }; },
    async rescheduleJobWithoutAttemptConsumption(claim, error, { retryAt: scheduledAt }) {
      assert.equal(claim.attempts, 6);
      assert.equal(error.code, 'CONTENT_NEWSLETTER_NOT_DUE');
      assert.equal(scheduledAt, retryAt);
      job.status = 'queued';
      job.attempts -= 1;
      job.locked_by = null;
      job.run_after = scheduledAt;
      reschedules += 1;
      return { ...job };
    },
    async markJobNeedsManualAttention() { throw new Error('nicht erwartet'); }
  });

  assert.equal((await worker.processOnce()).status, 'queued');
  assert.equal(job.attempts, 5);
  assert.equal(reschedules, 1);
  assert.equal(smtpCalls, 0);

  currentNow = retryAt;
  assert.deepEqual(await worker.processOnce(), { status: 'completed' });
  assert.equal(job.attempts, 6);
  assert.equal(delivery.attempts, 6);
  assert.equal(smtpCalls, 1);
});

test('LeaseLostError ist explizit nicht retrybar', () => {
  const error = new LeaseLostError();
  assert.equal(error.code, 'CONTENT_JOB_LEASE_LOST');
  assert.equal(error.retryable, false);
});

test('Worker-Retry verwendet denselben Run und setzt nach persistierter kostenpflichtiger Stufe ohne Doppelaufruf fort', async () => {
  const claims = [
    { id: 77, job_type: 'generate_weekly_draft', locked_by: 'worker-retry', attempts: 1, payload_json: {} },
    { id: 77, job_type: 'generate_weekly_draft', locked_by: 'worker-retry', attempts: 2, payload_json: {} }
  ];
  const runs = new Map();
  const runIds = [];
  let providerCalls = 0;
  let draftWrites = 0;
  const handler = createProductionJobHandler({
    async createRun({ jobId }) {
      if (!runs.has(jobId)) runs.set(jobId, { id: 501, stages: {} });
      const run = runs.get(jobId);
      runIds.push(run.id);
      return run;
    },
    async runPipeline({ runId, leaseGuard }) {
      await leaseGuard();
      const run = runs.get(77);
      if (!run.stages.article_generation) {
        providerCalls += 1;
        run.stages.article_generation = { responseId: 'resp-einmalig' };
        throw new Error('temporärer Datenbankfehler nach Stage-Persistenz');
      }
      await leaseGuard();
      draftWrites += 1;
      return { status: 'completed', post: { id: 901, published: false } };
    },
    pipelineDependencies: {}
  });
  const terminal = [];
  const worker = createContentWorker({
    enabled: true,
    workerId: 'worker-retry',
    leaseRenewMs: 60_000,
    setIntervalFn() { return {}; },
    clearIntervalFn() {},
    async upsertHeartbeat() {},
    async recoverExpiredJobs() {},
    async claimNextJob() { return claims.shift() || null; },
    async renewJobLease(claim) { return claim; },
    handleJob: handler,
    async completeJob(claim) { terminal.push(['completed', claim.attempts]); return { status: 'completed' }; },
    async failJob() { throw new Error('nicht erwartet'); },
    async retryOrFailJob(claim) { terminal.push(['queued', claim.attempts]); return { status: 'queued' }; },
    async markJobNeedsManualAttention() { throw new Error('nicht erwartet'); }
  });

  assert.equal((await worker.processOnce()).status, 'queued');
  assert.equal((await worker.processOnce()).status, 'completed');
  assert.deepEqual(runIds, [501, 501]);
  assert.equal(providerCalls, 1);
  assert.equal(draftWrites, 1);
  assert.deepEqual(terminal, [['queued', 1], ['completed', 2]]);
});

test('berlinDateKey verwendet das konfigurierte Ortsdatum statt Server-UTC', () => {
  const instant = new Date('2026-01-04T23:30:00.000Z');

  assert.equal(berlinDateKey(instant, 'Europe/Berlin'), '2026-01-05');
  assert.equal(berlinDateKey(instant, 'UTC'), '2026-01-04');
});

test('Shutdown schließt den Pool nach vollständig geleertem Worker sofort und idempotent', async () => {
  const events = [];
  const shutdown = createShutdownController({
    scheduler: { stop() { events.push('scheduler.stop'); } },
    searchConsoleScheduler: { stop() { events.push('search-console-scheduler.stop'); } },
    worker: {
      async stop() { events.push('worker.stop'); return { drained: true }; },
      async whenIdle() { events.push('worker.whenIdle'); }
    },
    pool: { async end() { events.push('pool.end'); } },
    logger: { error(message) { events.push(message); } }
  });

  await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);

  assert.deepEqual(events, [
    'scheduler.stop',
    'search-console-scheduler.stop',
    'worker.stop',
    'pool.end'
  ]);
});

test('Shutdown lässt den Pool nach Timeout offen und schließt ihn erst bei tatsächlichem Worker-Leerlauf', async () => {
  const idle = deferred();
  const events = [];
  const shutdown = createShutdownController({
    scheduler: { stop() { events.push('scheduler.stop'); } },
    worker: {
      async stop() { events.push('worker.stop'); return { drained: false }; },
      whenIdle() { events.push('worker.whenIdle'); return idle.promise; }
    },
    pool: { async end() { events.push('pool.end'); } },
    setIntervalFn() { events.push('keepalive.start'); return 'keepalive'; },
    clearIntervalFn(handle) { events.push(`keepalive.clear:${handle}`); },
    logger: { error(message) { events.push(message); } }
  });

  const pending = shutdown('SIGTERM');
  assert.equal(pending, shutdown('SIGINT'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ['scheduler.stop', 'worker.stop', 'keepalive.start', 'worker.whenIdle']);

  idle.resolve();
  await pending;
  assert.deepEqual(events, [
    'scheduler.stop',
    'worker.stop',
    'keepalive.start',
    'worker.whenIdle',
    'pool.end',
    'keepalive.clear:keepalive'
  ]);
});

test('verzögerter Shutdown hält einen Child-Prozess bis whenIdle und pool.end am Leben', async () => {
  const workerUrl = new URL('../scripts/contentWorker.js', import.meta.url).href;
  const script = `
    import { createShutdownController } from ${JSON.stringify(workerUrl)};
    const worker = {
      async stop() { return { drained: false }; },
      whenIdle() {
        return new Promise((resolve) => {
          const timer = setTimeout(() => { console.log('idle'); resolve(); }, 80);
          timer.unref();
        });
      }
    };
    const shutdown = createShutdownController({
      worker,
      pool: { async end() { console.log('pool.end'); } },
      logger: { error() {} }
    });
    void shutdown('SIGTERM');
  `;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    { timeout: 2_000 }
  );

  assert.equal(stderr, '');
  assert.equal(stdout, 'idle\npool.end\n');
});

test('Fehler beim verzögerten pool.end melden den Shutdown sicher als fehlgeschlagen', async () => {
  const failures = [];
  const logs = [];
  const shutdown = createShutdownController({
    worker: {
      async stop() { return { drained: false }; },
      async whenIdle() {}
    },
    pool: { async end() { throw new Error('postgres://user:secret@db/app'); } },
    setIntervalFn() { return 'keepalive'; },
    clearIntervalFn() {},
    onFailure() { failures.push('failed'); },
    logger: { error(message) { logs.push(message); } }
  });

  await shutdown('SIGTERM');
  assert.deepEqual(failures, ['failed']);
  assert.deepEqual(logs, ['Content-Worker konnte nicht sauber beendet werden.']);
});

test('der Produktions-Jobhandler akzeptiert completed und needs_manual_attention als sichere Pipelineabschlüsse', async () => {
  const results = [
    { status: 'completed', post: { id: 41 } },
    { status: 'needs_manual_attention', code: 'quality_gate_failed' }
  ];
  const calls = [];
  const handler = createProductionJobHandler({
    timezone: 'Europe/Berlin',
    now: () => new Date('2026-07-11T10:00:00.000Z'),
    async createRun(input) { calls.push(['run', input]); return { id: calls.length }; },
    async finishRun(...args) { calls.push(['finish', ...args]); },
    async runPipeline(input, dependencies) {
      calls.push(['pipeline', input, dependencies]);
      return results.shift();
    },
    pipelineDependencies: { direct: true }
  });

  assert.equal((await handler({ id: 7, job_type: 'generate_weekly_draft', payload_json: {} })).status, 'completed');
  assert.equal((await handler({ id: 8, job_type: 'generate_manual_draft', payload_json: {} })).status, 'needs_manual_attention');
  assert.equal(calls.filter(([type]) => type === 'finish').length, 0);
  assert.deepEqual(calls.filter(([type]) => type === 'pipeline').map((call) => call[1].currentDate), [
    '2026-07-11',
    '2026-07-11'
  ]);
});

test('der Produktions-Jobhandler überlässt Pipelinefehler ohne zweiten Runabschluss der Pipeline', async () => {
  const finishCalls = [];
  const secretError = new Error('OpenAI sk-test-1234567890\n    at geheimer Stack');
  const handler = createProductionJobHandler({
    timezone: 'Europe/Berlin',
    async createRun() { return { id: 21 }; },
    async finishRun(runId, input) { finishCalls.push({ runId, input }); },
    async runPipeline() { throw secretError; },
    pipelineDependencies: {}
  });

  await assert.rejects(
    handler({ id: 9, job_type: 'generate_weekly_draft', payload_json: {} }),
    secretError
  );
  assert.deepEqual(finishCalls, []);
});

test('der Produktions-Jobhandler reicht den Lease-Fence bis in die Pipeline durch', async () => {
  const leaseGuard = async () => true;
  let pipelineInput;
  const handler = createProductionJobHandler({
    async createRun() { return { id: 71 }; },
    async runPipeline(input) { pipelineInput = input; return { status: 'completed' }; },
    pipelineDependencies: {}
  });

  await handler(
    { id: 15, job_type: 'generate_weekly_draft', payload_json: {} },
    { leaseGuard }
  );
  assert.equal(pipelineInput.leaseGuard, leaseGuard);
});

test('der Produktions-Jobhandler bewahrt beim Retry den ersten Snapshot und baut Abhängigkeiten daraus', async () => {
  let persistedSnapshot = null;
  const createRunInputs = [];
  const pipelineCalls = [];
  const settings = [
    { settings_version: 3, timezone: 'Europe/Berlin' },
    { settings_version: 4, timezone: 'UTC' }
  ];
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    now: () => new Date('2026-07-31T22:30:00.000Z'),
    async getSettings() { return settings.shift(); },
    resolveRuntimeConfig({ settings: current }) {
      return { settingsVersion: current.settings_version, timezone: current.timezone };
    },
    createJobSnapshot({ runtimeConfig }) {
      return { ...runtimeConfig };
    },
    async createRun(input) {
      createRunInputs.push(input);
      persistedSnapshot ||= structuredClone(input.runtimeSnapshot);
      return { id: 91, runtime_snapshot_json: structuredClone(persistedSnapshot) };
    },
    createPipelineDependencies(snapshot) {
      return { snapshot: structuredClone(snapshot) };
    },
    async runPipeline(input, dependencies) {
      pipelineCalls.push({ input, dependencies });
      return { status: 'completed' };
    }
  });
  const claim = { id: 44, job_type: 'generate_weekly_draft', payload_json: {} };

  await handler({ ...claim, attempts: 1 });
  await handler({ ...claim, attempts: 2 });

  assert.deepEqual(createRunInputs.map(({ runtimeSnapshot }) => runtimeSnapshot), [
    { settingsVersion: 3, timezone: 'Europe/Berlin' },
    { settingsVersion: 4, timezone: 'UTC' }
  ]);
  assert.deepEqual(pipelineCalls.map(({ dependencies }) => dependencies.snapshot), [
    { settingsVersion: 3, timezone: 'Europe/Berlin' },
    { settingsVersion: 3, timezone: 'Europe/Berlin' }
  ]);
  assert.deepEqual(pipelineCalls.map(({ input }) => input.currentDate), ['2026-08-01', '2026-08-01']);
});

test('die Produktionsruntime verwendet nach Neustart ausschließlich die vollständige erste Jobconfig', async () => {
  const initialTechnicalConfig = {
    enabled: true,
    autoPublishEnabled: true,
    maxTopicCandidates: 8,
    maxRevisions: 2,
    maxAttempts: 4,
    monthlyCostLimitEur: 40,
    contentStageReservationEur: 0.51,
    reviewStageReservationEur: 0.26,
    contentInputCostPerMtok: 2.5,
    contentOutputCostPerMtok: 15,
    reviewInputCostPerMtok: 0.75,
    reviewOutputCostPerMtok: 4.5,
    imageCostEur: 0.041,
    contentModel: 'content-model-v1',
    reviewModel: 'review-model-v1',
    imageModel: 'image-model-v1',
    timezone: 'UTC',
    workerPollMs: 5_000,
    jobLeaseMinutes: 30
  };
  const changedTechnicalConfig = {
    maxTopicCandidates: 19,
    maxRevisions: 4,
    maxAttempts: 1,
    monthlyCostLimitEur: 5,
    contentStageReservationEur: 1.51,
    reviewStageReservationEur: 1.26,
    contentInputCostPerMtok: 12.5,
    contentOutputCostPerMtok: 115,
    reviewInputCostPerMtok: 10.75,
    reviewOutputCostPerMtok: 14.5,
    imageCostEur: 0.41,
    contentModel: 'content-model-v2',
    reviewModel: 'review-model-v2',
    imageModel: 'image-model-v2',
    timezone: 'America/New_York'
  };
  const settings = {
    agent_enabled: true,
    operating_mode: 'review',
    schedule_weekdays: [1, 4],
    schedule_time: '18:00',
    timezone: 'Europe/Berlin',
    monthly_budget_cents: 3500,
    auto_publish_min_score: 94,
    maximum_attempts: 3,
    manual_approvals_count: 8,
    settings_version: 7
  };
  const claims = [1, 2].map((attempts) => ({
    id: 404,
    job_type: 'generate_weekly_draft',
    locked_by: 'worker-snapshot',
    attempts,
    payload_json: { source: 'weekly-schedule' }
  }));
  let persistedSnapshot = null;
  const pipelineConfigs = [];
  const config = { ...initialTechnicalConfig };
  const database = { async query() { return { rows: [] }; } };
  const modules = {
    OpenAI: class {},
    cloudinary: { config() {} },
    jobRepository: {
      async upsertWorkerHeartbeat() {},
      async recoverExpiredJobs() {},
      async claimNextJob() { return claims.shift() || null; },
      async renewJobLease(claim) { return claim; },
      async completeJob(claim) { return claim; },
      async failJob(claim) { return claim; },
      async retryOrFailJob(claim) { return claim; },
      async markJobNeedsManualAttention(claim) { return claim; },
      async enqueueJob() { return null; },
      async updateContentSchedulerState() { return null; }
    },
    runRepository: {
      async createRun(input) {
        persistedSnapshot ||= structuredClone(input.runtimeSnapshot);
        return { id: 909, runtime_snapshot_json: structuredClone(persistedSnapshot) };
      },
      async updateRunStage() { return null; },
      async finishRun() { return null; }
    },
    settingsRepository: { async getContentAgentSettings() { return settings; } },
    runtimeConfigService: {
      createContentAgentJobSnapshot,
      resolveContentAgentRuntimeConfig
    },
    topicRepository: {
      async createTopic() { return null; },
      async markTopicUsed() { return null; }
    },
    costService: {
      estimateTextCost() { return 0; },
      assertMonthlyBudget() {},
      async getMonthlyContentCost() { return 0; },
      async reserveMonthlyBudget() { return {}; },
      async settleMonthlyBudget() { return {}; },
      async releaseMonthlyBudgetReservation() { return {}; },
      async getPersistedStageResult() { return null; }
    },
    BlogPostModel: {
      async createAIDraft() { return null; },
      async findAIDraftByGenerationRunId() { return null; }
    },
    createPricingRepository() { return {}; },
    createPricingService() { return { async getVisiblePackages() { return []; } }; },
    createOpenAIContentService() { return {}; },
    createContentImageService() { return {}; },
    buildSiteInventory: async () => ({}),
    selectBestTopic: () => null,
    validateArticle: () => ({ passed: true }),
    async runDraftPipeline(_input, dependencies) {
      pipelineConfigs.push(structuredClone(dependencies.config));
      return { status: 'completed' };
    }
  };
  const runtime = createProductionRuntime({
    config,
    env: { OPENAI_API_KEY: 'test-key' },
    database,
    modules
  });

  await runtime.worker.processOnce();
  Object.assign(config, changedTechnicalConfig);
  await runtime.worker.processOnce();

  const expectedJobConfig = {
    maxTopicCandidates: 8,
    maxRevisions: 2,
    maxAttempts: 3,
    monthlyCostLimitEur: 35,
    contentStageReservationEur: 0.51,
    reviewStageReservationEur: 0.26,
    contentInputCostPerMtok: 2.5,
    contentOutputCostPerMtok: 15,
    reviewInputCostPerMtok: 0.75,
    reviewOutputCostPerMtok: 4.5,
    imageCostEur: 0.041,
    contentModel: 'content-model-v1',
    reviewModel: 'review-model-v1',
    imageModel: 'image-model-v1',
    timezone: 'Europe/Berlin'
  };
  assert.equal(pipelineConfigs.length, 2);
  for (const pipelineConfig of pipelineConfigs) {
    assert.deepEqual(
      Object.fromEntries(Object.keys(expectedJobConfig).map((key) => [key, pipelineConfig[key]])),
      expectedJobConfig
    );
  }
});

test('nicht unterstützte Jobtypen sind permanente Fehler ohne Retry', async () => {
  const handler = createProductionJobHandler({
    async createRun() { throw new Error('darf nicht starten'); },
    async runPipeline() { throw new Error('darf nicht starten'); },
    pipelineDependencies: {}
  });
  await assert.rejects(
    handler({ id: 16, job_type: 'unbekannt', payload_json: {} }),
    (error) => error.retryable === false && error.code === 'CONTENT_JOB_TYPE_UNSUPPORTED'
  );
});

test('der Produktionshandler dispatcht Admin-Prüfmails ohne Generierungs- oder Veröffentlichungslogik', async () => {
  const calls = [];
  const leaseGuard = async () => true;
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Für eine Prüfmail darf kein Content-Run entstehen.'); },
    async runPipeline() { assert.fail('Für eine Prüfmail darf keine Generierung starten.'); },
    async sendAdminReviewNotification(input) {
      calls.push(input);
      return { status: 'completed', deliveryId: input.deliveryId };
    }
  });

  const result = await handler({
    id: 72,
    job_type: 'send_admin_review_notification',
    payload_json: { deliveryId: 81, postId: 51, generationRunId: 71 }
  }, { leaseGuard });

  assert.deepEqual(result, { status: 'completed', deliveryId: 81 });
  assert.deepEqual(calls, [{ deliveryId: 81, leaseGuard }]);
});

test('der Produktionshandler unterstützt alle geplanten Non-Generation-Jobtypen', () => {
  for (const jobType of [
    'send_admin_review_notification',
    'publish_approved_post',
    'send_blog_newsletter',
    'send_blog_newsletter_delivery'
  ]) {
    assert.equal(SUPPORTED_JOB_TYPES.has(jobType), true, jobType);
  }
});

test('der Produktionshandler unterstützt beide Search-Console-Jobtypen als eigene Gruppe', () => {
  assert.deepEqual([...SEARCH_CONSOLE_JOB_TYPES], [
    'sync_search_console',
    'analyze_search_opportunities'
  ]);
  for (const jobType of SEARCH_CONSOLE_JOB_TYPES) {
    assert.equal(SUPPORTED_JOB_TYPES.has(jobType), true, jobType);
  }
});

test('der Search-Console-Sync dispatcht vor Content-Run und Pipeline und enqueued die Analyse', async () => {
  const events = [];
  const leaseGuard = async () => { events.push('lease'); return true; };
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Für einen Search-Console-Sync darf kein Content-Run entstehen.'); },
    async runPipeline() { assert.fail('Für einen Search-Console-Sync darf keine Artikelpipeline starten.'); },
    async syncSearchConsoleRange(input) {
      events.push(['sync', input]);
      await input.leaseGuard();
    },
    async recordProviderResult(input) { events.push(['provider', input]); },
    async enqueueJob(input) { events.push(['enqueue', input]); return { id: 92 }; }
  });

  const result = await handler({
    id: 81,
    job_type: 'sync_search_console',
    payload_json: { startDate: '2026-06-21', endDate: '2026-07-18' }
  }, { leaseGuard });

  assert.deepEqual(result, { status: 'completed' });
  assert.deepEqual(events.filter(Array.isArray), [
    ['sync', {
      startDate: '2026-06-21',
      endDate: '2026-07-18',
      leaseGuard
    }],
    ['provider', { providerName: 'google_search_console', success: true }],
    ['enqueue', {
      jobType: 'analyze_search_opportunities',
      idempotencyKey: 'gsc-analysis:2026-06-21:2026-07-18',
      payload: { startDate: '2026-06-21', endDate: '2026-07-18' }
    }]
  ]);
  assert.equal(events.filter((event) => event === 'lease').length >= 3, true);
});

test('ein pausierter Analyse-Enqueue lässt den erfolgreichen Sync bereinigt retrybar', async () => {
  const events = [];
  const leaseGuard = async () => { events.push('lease'); return true; };
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('nicht erwartet'); },
    async runPipeline() { assert.fail('nicht erwartet'); },
    async syncSearchConsoleRange() { events.push('sync'); },
    async recordProviderResult(input) {
      assert.deepEqual(input, { providerName: 'google_search_console', success: true });
      events.push('provider-success');
    },
    async enqueueJob() {
      events.push('enqueue-paused');
      return null;
    }
  });

  await assert.rejects(handler({
    id: 85,
    job_type: 'sync_search_console',
    payload_json: { startDate: '2026-06-21', endDate: '2026-07-18' }
  }, { leaseGuard }), (error) => (
    error.code === 'CONTENT_GSC_ANALYSIS_ENQUEUE_DEFERRED'
      && error.retryable === true
      && !/2026|credentials|token|payload|\.json/i.test(error.message)
  ));

  assert.deepEqual(events, [
    'lease',
    'sync',
    'lease',
    'provider-success',
    'lease',
    'enqueue-paused'
  ]);
});

test('ein fehlgeschlagener Search-Console-Sync wirft nur einen stabilen retryfähigen Fehler', async () => {
  const providerResults = [];
  const syncError = new Error(
    'GOOGLE_APPLICATION_CREDENTIALS=/srv/google-search-console.json token=geheim'
  );
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('nicht erwartet'); },
    async runPipeline() { assert.fail('nicht erwartet'); },
    async syncSearchConsoleRange() { throw syncError; },
    async recordProviderResult(input) { providerResults.push(input); },
    async enqueueJob() { assert.fail('Nach einem Syncfehler darf keine Analyse entstehen.'); }
  });

  await assert.rejects(handler({
    id: 82,
    job_type: 'sync_search_console',
    payload_json: { startDate: '2026-06-21', endDate: '2026-07-18' }
  }, { leaseGuard: async () => true }), (error) => {
    assert.equal(error.code, 'CONTENT_SEARCH_CONSOLE_SYNC_FAILED');
    assert.equal(error.retryable, true);
    assert.equal(error.message, 'Die Search-Console-Synchronisierung ist vorübergehend fehlgeschlagen.');
    assert.equal(error.cause, syncError);
    assert.doesNotMatch(error.message, /GOOGLE_APPLICATION_CREDENTIALS|\.json|geheim|token/i);
    return true;
  });

  assert.deepEqual(providerResults, [{
    providerName: 'google_search_console',
    success: false,
    errorCode: 'SEARCH_CONSOLE_SYNC_FAILED'
  }]);
  assert.doesNotMatch(JSON.stringify(providerResults), /geheim|credentials|\.json/i);
});

test('der Worker persistiert bei einem GSC-Fehler ausschließlich die stabile Fehlermeldung', async () => {
  const persisted = [];
  const claim = {
    id: 820,
    locked_by: 'worker-gsc-test',
    attempts: 1,
    max_attempts: 3,
    job_type: 'sync_search_console',
    payload_json: { startDate: '2026-06-21', endDate: '2026-07-18' }
  };
  const externalError = new Error(
    "ENOENT: GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gsc-service-account.json token=secret-token-fragment"
  );
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('nicht erwartet'); },
    async runPipeline() { assert.fail('nicht erwartet'); },
    async syncSearchConsoleRange() { throw externalError; },
    async recordProviderResult() {},
    async enqueueJob() { assert.fail('nicht erwartet'); }
  });
  const db = {
    async query(_sql, params) {
      persisted.push(params[3]);
      return { rows: [{ id: claim.id, status: 'queued', last_error: params[3] }] };
    }
  };
  const { worker } = createWorkerHarness({
    async claimNextJob() { return claim; },
    handleJob: handler,
    async retryOrFailJob(job, error, options) {
      return persistRetryOrFailJob(job, error, options, db);
    }
  });

  const result = await worker.processOnce();

  assert.deepEqual(result, { status: 'queued' });
  assert.deepEqual(persisted, [
    'Die Search-Console-Synchronisierung ist vorübergehend fehlgeschlagen.'
  ]);
  assert.doesNotMatch(
    JSON.stringify(persisted),
    /GOOGLE_APPLICATION_CREDENTIALS|\/run\/secrets|gsc-service-account\.json|secret-token-fragment/i
  );
});

test('die Search-Opportunity-Analyse liest, baut und upsertet ohne Content-Run', async () => {
  const leaseGuard = async () => true;
  const metrics = [{ postId: 11, query: 'webdesign berlin' }];
  const opportunities = [{ postId: 11, analysisKey: 'chance-11' }];
  const calls = [];
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Für eine Search-Analyse darf kein Content-Run entstehen.'); },
    async runPipeline() { assert.fail('Für eine Search-Analyse darf keine Artikelpipeline starten.'); },
    async listAggregatedSearchMetrics(input) {
      calls.push(['metrics', input]);
      return metrics;
    },
    buildSearchOpportunities(rows, range) {
      calls.push(['build', rows, range]);
      return opportunities;
    },
    async upsertSearchOpportunities(rows) {
      calls.push(['upsert', rows]);
      return rows;
    }
  });

  const result = await handler({
    id: 83,
    job_type: 'analyze_search_opportunities',
    payload_json: { startDate: '2026-06-21', endDate: '2026-07-18' }
  }, { leaseGuard });

  assert.deepEqual(result, { status: 'completed' });
  assert.deepEqual(calls, [
    ['metrics', { startDate: '2026-06-21', endDate: '2026-07-18' }],
    ['build', metrics, { startDate: '2026-06-21', endDate: '2026-07-18' }],
    ['upsert', opportunities]
  ]);
});

test('Search-Console-Jobs verlangen einen aktiven Lease-Guard und exakt zwei kanonische Datumsfelder', async () => {
  const valid = { startDate: '2026-06-21', endDate: '2026-07-18' };
  const invalidPayloads = [
    null,
    [],
    { ...valid, startDate: new Date('2026-06-21T00:00:00.000Z') },
    { ...valid, startDate: '2026-6-21' },
    { ...valid, startDate: '2026-02-30' },
    { ...valid, endDate: '2026-07-18T00:00:00.000Z' },
    { startDate: '2026-07-19', endDate: '2026-07-18' },
    { ...valid, credentialsPath: '/srv/geheim.json' }
  ];
  let sideEffects = 0;
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('nicht erwartet'); },
    async runPipeline() { assert.fail('nicht erwartet'); },
    async syncSearchConsoleRange() { sideEffects += 1; },
    async recordProviderResult() { sideEffects += 1; },
    async enqueueJob() { sideEffects += 1; },
    async listAggregatedSearchMetrics() { sideEffects += 1; return []; },
    buildSearchOpportunities() { sideEffects += 1; return []; },
    async upsertSearchOpportunities() { sideEffects += 1; }
  });

  for (const job_type of SEARCH_CONSOLE_JOB_TYPES) {
    await assert.rejects(
      handler({ id: 84, job_type, payload_json: valid }),
      (error) => error.code === 'CONTENT_JOB_LEASE_REQUIRED' && error.retryable === false
    );
    for (const payload_json of invalidPayloads) {
      await assert.rejects(
        handler({ id: 84, job_type, payload_json }, { leaseGuard: async () => true }),
        (error) => error.code === 'CONTENT_SEARCH_CONSOLE_JOB_PAYLOAD_INVALID'
          && error.retryable === false
      );
    }
  }
  assert.equal(sideEffects, 0);
});

test('der Produktionshandler dispatcht fällige Veröffentlichungen ohne Generierungsrun mit vollständigem Snapshot', async () => {
  const calls = [];
  const leaseGuard = async () => true;
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Für eine fällige Veröffentlichung darf kein Content-Run entstehen.'); },
    async runPipeline() { assert.fail('Für eine fällige Veröffentlichung darf keine Generierung starten.'); },
    async publishApprovedPost(input) {
      calls.push(input);
      return { post: { id: input.postId, published: true } };
    }
  });

  const result = await handler({
    id: 73,
    job_type: 'publish_approved_post',
    payload_json: {
      postId: 51,
      approvalVersion: 4,
      publicationVersion: 2,
      scheduledAt: '2026-07-13T16:00:00.000Z'
    }
  }, { leaseGuard });

  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, [{
    postId: 51,
    approvalVersion: 4,
    publicationVersion: 2,
    scheduledAt: '2026-07-13T16:00:00.000Z',
    leaseGuard
  }]);
});

test('der Publish-Dispatch lehnt fehlende, typfalsche und nicht kanonische Snapshots permanent ab', async () => {
  const valid = {
    postId: 51,
    approvalVersion: 4,
    publicationVersion: 2,
    scheduledAt: '2026-07-13T16:00:00.000Z'
  };
  const invalidPayloads = [
    { ...valid, postId: undefined },
    { ...valid, postId: '51' },
    { ...valid, approvalVersion: 0 },
    { ...valid, publicationVersion: 2.5 },
    { ...valid, scheduledAt: new Date(valid.scheduledAt) },
    { ...valid, scheduledAt: '2026-07-13T18:00:00+02:00' },
    { ...valid, scheduledAt: 'ungültig' },
    { ...valid, postID: 51 }
  ];
  let publications = 0;
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Ein ungültiger Publish-Job darf keinen Run anlegen.'); },
    async runPipeline() { assert.fail('Ein ungültiger Publish-Job darf keine Pipeline starten.'); },
    async publishApprovedPost() { publications += 1; }
  });

  for (const payload_json of invalidPayloads) {
    await assert.rejects(
      handler(
        { id: 74, job_type: 'publish_approved_post', payload_json },
        { leaseGuard: async () => true }
      ),
      (error) => error.code === 'CONTENT_PUBLICATION_JOB_PAYLOAD_INVALID'
        && error.retryable === false
    );
  }
  assert.equal(publications, 0);
});

test('der Publish-Dispatch verlangt einen funktionsfähigen Lease-Guard', async () => {
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Publish-Jobs dürfen keinen Run anlegen.'); },
    async runPipeline() { assert.fail('Publish-Jobs dürfen keine Pipeline starten.'); },
    async publishApprovedPost() { assert.fail('Ohne Lease darf nicht publiziert werden.'); }
  });
  const claim = {
    id: 75,
    job_type: 'publish_approved_post',
    payload_json: {
      postId: 51,
      approvalVersion: 4,
      publicationVersion: 2,
      scheduledAt: '2026-07-13T16:00:00.000Z'
    }
  };

  for (const context of [undefined, {}, { leaseGuard: true }]) {
    await assert.rejects(
      handler(claim, context),
      (error) => error.code === 'CONTENT_JOB_LEASE_REQUIRED' && error.retryable === false
    );
  }
});

test('Newsletter-Jobtypen validieren strikte Payloads, verlangen eine Lease und erzeugen keinen Generierungsrun', async () => {
  const calls = [];
  const leaseGuard = async () => true;
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Newsletter-Jobs dürfen keinen Run anlegen.'); },
    async runPipeline() { assert.fail('Newsletter-Jobs dürfen keine Pipeline starten.'); },
    async sendBlogNewsletter(input) { calls.push(['newsletter', input]); return { newsletterId: 9 }; },
    async sendBlogNewsletterDelivery(input) { calls.push(['delivery', input]); return { deliveryId: 10 }; }
  });

  const first = await handler({
    id: 76,
    job_type: 'send_blog_newsletter',
    payload_json: { postId: 51, publicationVersion: 2, cursor: 0 }
  }, { leaseGuard });
  const second = await handler({
    id: 77,
    job_type: 'send_blog_newsletter_delivery',
    payload_json: { deliveryId: 10 }
  }, { leaseGuard });

  assert.equal(first.status, 'completed');
  assert.equal(second.status, 'completed');
  assert.deepEqual(calls, [
    ['newsletter', { postId: 51, publicationVersion: 2, cursor: 0, leaseGuard }],
    ['delivery', { deliveryId: 10, leaseGuard }]
  ]);

  for (const claim of [
    { job_type: 'send_blog_newsletter', payload_json: { postId: 51 } },
    { job_type: 'send_blog_newsletter', payload_json: { postId: 51, publicationVersion: 2, cursor: 0, extra: true } },
    { job_type: 'send_blog_newsletter_delivery', payload_json: { deliveryId: '10' } }
  ]) {
    await assert.rejects(
      handler({ id: 78, ...claim }, { leaseGuard }),
      (error) => error.code === 'CONTENT_NEWSLETTER_JOB_PAYLOAD_INVALID' && error.retryable === false
    );
  }
  await assert.rejects(
    handler({
      id: 79,
      job_type: 'send_blog_newsletter_delivery',
      payload_json: { deliveryId: 10 }
    }),
    (error) => error.code === 'CONTENT_JOB_LEASE_REQUIRED' && error.retryable === false
  );
});

test('der Produktionshandler führt Bestandsaudits im selben Run mit Lease-Fence aus', async () => {
  const calls = [];
  const leaseGuard = async () => calls.push('lease');
  const handler = createProductionJobHandler({
    async createRun() { return { id: 88, runtime_snapshot_json: { timezone: 'Europe/Berlin' } }; },
    async finishRun(runId, payload) { calls.push(['finish', runId, payload]); return { id: runId, ...payload }; },
    async runPipeline() { assert.fail('Audit darf keine Generierung starten.'); },
    createAuditDependencies() { return { auditRepository: true }; },
    async runAuditJob(context, dependencies) {
      calls.push(['audit', context, dependencies]);
      return { status: 'completed', audited: 2 };
    }
  });

  const result = await handler({ id: 51, job_type: 'audit_existing_posts', payload_json: {} }, { leaseGuard });
  assert.equal(result.audited, 2);
  assert.equal(calls.find(([type]) => type === 'audit')[1].run.id, 88);
  assert.equal(calls.find(([type]) => type === 'audit')[1].leaseGuard, leaseGuard);
  assert.deepEqual(calls.at(-1), ['finish', 88, { status: 'completed', postId: null }]);
});

test('Auditjob wird bei fehlendem Runabschluss technisch retrybar und nie erfolgreich abgeschlossen', async () => {
  const handler = createProductionJobHandler({
    async createRun() { return { id: 88 }; },
    async finishRun() { return null; },
    async runPipeline() { assert.fail('nicht erwartet'); },
    createAuditDependencies() { return {}; },
    async runAuditJob() { return { status: 'completed' }; }
  });
  await assert.rejects(
    handler({ id: 51, job_type: 'audit_existing_posts', payload_json: {} }),
    (error) => error.code === 'CONTENT_RUN_FINISH_FAILED' && error.retryable === true
  );
});

test('permanenter Auditfehler terminalisiert denselben Run gefenct als failed', async () => {
  const finishes = [];
  const permanent = Object.assign(new Error('Auditdaten ungültig'), { code: 'CONTENT_AUDIT_INVALID', retryable: false });
  const handler = createProductionJobHandler({
    async createRun() { return { id: 88 }; },
    async finishRun(id, input) { finishes.push([id, input]); return { id, ...input }; },
    async runPipeline() { assert.fail('nicht erwartet'); },
    createAuditDependencies() { return {}; },
    async runAuditJob() { throw permanent; }
  });
  await assert.rejects(handler({ id: 51, job_type: 'audit_existing_posts', payload_json: {} }), permanent);
  assert.deepEqual(finishes, [[88, {
    status: 'failed', postId: null,
    errorReport: { code: 'CONTENT_AUDIT_INVALID', message: 'Auditdaten ungültig' }
  }]]);
});

test('der Produktionshandler dispatcht vier Regenerationsjobtypen mit demselben Run und Snapshot', async () => {
  const persistedSnapshot = {
    operatingMode: 'review',
    monthlyCostLimitEur: 25,
    timezone: 'Europe/Berlin'
  };
  const calls = [];
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    async getSettings() { return { settings_version: 9 }; },
    resolveRuntimeConfig() { return { operatingMode: 'auto_publish', timezone: 'UTC' }; },
    createJobSnapshot() { return { operatingMode: 'auto_publish', timezone: 'UTC' }; },
    async createRun(input) {
      calls.push(['run', input]);
      return { id: 88, runtime_snapshot_json: persistedSnapshot, stage_results_json: {} };
    },
    async runPipeline() { assert.fail('Regenerationsjobs dürfen die Entwurfspipeline nicht ausführen'); },
    createPipelineDependencies() { return { pipeline: true }; },
    createRegenerationDependencies(snapshot) {
      calls.push(['dependencies', snapshot]);
      return { regeneration: true };
    },
    async runRegenerationJob(context, dependencies) {
      calls.push(['regeneration', context, dependencies]);
      return { status: 'completed', post: { id: 19, published: false } };
    }
  });

  for (const jobType of [
    'regenerate_article',
    'regenerate_metadata',
    'regenerate_faq',
    'regenerate_image'
  ]) {
    const result = await handler({
      id: 51,
      job_type: jobType,
      payload_json: { post_id: 19, forced_mode: 'review', source: 'admin_regeneration' }
    });
    assert.equal(result.post.published, false);
  }

  const dispatched = calls.filter(([type]) => type === 'regeneration');
  assert.equal(dispatched.length, 4);
  for (const [, context, dependencies] of dispatched) {
    assert.equal(context.run.id, 88);
    assert.equal(context.claim.payload_json.forced_mode, 'review');
    assert.equal(context.runtimeSnapshot, persistedSnapshot);
    assert.deepEqual(dependencies, { regeneration: true });
  }
});

test('der Produktionshandler dispatcht eine gültige Prüfhinweis-Optimierung separat', async () => {
  assert.equal(SUPPORTED_JOB_TYPES.has('optimize_review_issues'), true);
  assert.equal(REGENERATION_JOB_TYPES.has('optimize_review_issues'), true);
  const calls = [];
  const snapshot = { operatingMode: 'review', timezone: 'Europe/Berlin' };
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    async getSettings() { return { settings_version: 1 }; },
    resolveRuntimeConfig() { return snapshot; },
    createJobSnapshot() { return snapshot; },
    async createRun() { return { id: 88, runtime_snapshot_json: snapshot }; },
    async runPipeline() { assert.fail('nicht erwartet'); },
    async runRegenerationJob() { assert.fail('allgemeine Regeneration nicht erwartet'); },
    async createOptimizationDependencies(current) {
      calls.push(['dependencies', current]);
      return { optimization: true };
    },
    async runReviewIssueOptimizationJob(context, dependencies) {
      calls.push(['optimization', context, dependencies]);
      return { status: 'completed', post: { id: 19, published: false } };
    }
  });
  const result = await handler({
    id: 52,
    job_type: 'optimize_review_issues',
    payload_json: {
      source: 'admin_regeneration',
      post_id: 19,
      forced_mode: 'review',
      expected_review_version: 3,
      issue_mode: 'single',
      issue_index: 0
    }
  }, { leaseGuard: async () => true });
  assert.equal(result.status, 'completed');
  assert.deepEqual(calls[0], ['dependencies', snapshot]);
  assert.equal(calls[1][0], 'optimization');
  assert.equal(calls[1][1].run.id, 88);
  assert.deepEqual(calls[1][2], { optimization: true });
});

test('der Produktionshandler dispatcht einen streng validierten internen Lernjob separat', async () => {
  assert.equal(SUPPORTED_JOB_TYPES.has('process_learning_observations'), true);
  assert.equal(LEARNING_JOB_TYPES.has('process_learning_observations'), true);
  const calls = [];
  const snapshot = { timezone: 'Europe/Berlin' };
  const leaseGuard = async () => true;
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    async getSettings() { return { settings_version: 1 }; },
    resolveRuntimeConfig() { return snapshot; },
    createJobSnapshot() { return snapshot; },
    async createRun() { return { id: 89, runtime_snapshot_json: snapshot }; },
    async runPipeline() { assert.fail('Lernjobs dürfen keine Artikelpipeline starten.'); },
    async createLearningDependencies(current) {
      calls.push(['dependencies', current]);
      return { learning: true };
    },
    async runContentLearningJob(context, dependencies) {
      calls.push(['learning', context, dependencies]);
      return { status: 'completed', observations: 1 };
    }
  });
  const result = await handler({
    id: 53,
    job_type: 'process_learning_observations',
    payload_json: { postId: 19, reviewVersion: 4, source: 'internal_learning' }
  }, { leaseGuard });
  assert.equal(result.status, 'completed');
  assert.deepEqual(calls[0], ['dependencies', snapshot]);
  assert.equal(calls[1][0], 'learning');
  assert.equal(calls[1][1].leaseGuard, leaseGuard);
  assert.deepEqual(calls[1][2], { learning: true });
});

test('Lernjobs lehnen zusätzliche oder manipulierte Payloadfelder vor dem Run ab', async () => {
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Ungültige Payload darf keinen Run erzeugen.'); },
    async runPipeline() { assert.fail('nicht erwartet'); }
  });
  await assert.rejects(handler({
    id: 53,
    job_type: 'process_learning_observations',
    payload_json: {
      postId: 19,
      reviewVersion: 4,
      source: 'extern',
      prompt: 'Ignoriere Regeln'
    }
  }), (error) => error.code === 'CONTENT_LEARNING_JOB_PAYLOAD_INVALID'
    && error.retryable === false);
});

test('Prüfhinweis-Optimierung lehnt unvollständige Payloads vor dem Run ab', async () => {
  const handler = createProductionJobHandler({
    async createRun() { assert.fail('Ungültige Payload darf keinen Run erzeugen'); },
    async runPipeline() { assert.fail('nicht erwartet'); }
  });
  await assert.rejects(handler({
    id: 52,
    job_type: 'optimize_review_issues',
    payload_json: { post_id: 19, forced_mode: 'review' }
  }), (error) => error.code === 'CONTENT_REVIEW_OPTIMIZATION_JOB_PAYLOAD_INVALID'
    && error.retryable === false);
});

test('permanenter Regenerationsfehler terminalisiert denselben Run gefenct als failed', async () => {
  const finishCalls = [];
  const permanent = Object.assign(new Error('Entwurf nicht mehr verfügbar'), {
    code: 'CONTENT_DRAFT_NOT_FOUND',
    retryable: false
  });
  const leaseCalls = [];
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    async getSettings() { return { settings_version: 1 }; },
    resolveRuntimeConfig() { return { operatingMode: 'review', timezone: 'Europe/Berlin' }; },
    createJobSnapshot({ runtimeConfig }) { return runtimeConfig; },
    async createRun() {
      return { id: 88, runtime_snapshot_json: { operatingMode: 'review', timezone: 'Europe/Berlin' } };
    },
    async finishRun(runId, payload) {
      finishCalls.push([runId, payload]);
      return { id: runId, ...payload };
    },
    async runPipeline() { assert.fail('nicht erwartet'); },
    createRegenerationDependencies() { return {}; },
    async runRegenerationJob() { throw permanent; }
  });

  await assert.rejects(handler({
    id: 51,
    job_type: 'regenerate_article',
    payload_json: { post_id: 19, forced_mode: 'review' }
  }, {
    async leaseGuard() { leaseCalls.push('guard'); return true; }
  }), permanent);

  assert.deepEqual(leaseCalls, ['guard']);
  assert.deepEqual(finishCalls, [[88, {
    status: 'failed',
    postId: null,
    errorReport: {
      code: 'CONTENT_DRAFT_NOT_FOUND',
      message: 'Entwurf nicht mehr verfügbar'
    }
  }]]);
});

test('fehlender Abschluss eines permanenten Regenerationsfehlers wird technisch retrybar', async () => {
  const permanent = Object.assign(new Error('Entwurf nicht mehr verfügbar'), {
    code: 'CONTENT_DRAFT_NOT_FOUND',
    retryable: false
  });
  const handler = createProductionJobHandler({
    async createRun() { return { id: 88 }; },
    async finishRun() { return null; },
    async runPipeline() { assert.fail('nicht erwartet'); },
    createRegenerationDependencies() { return {}; },
    async runRegenerationJob() { throw permanent; }
  });

  await assert.rejects(
    handler({ id: 51, job_type: 'regenerate_article', payload_json: { post_id: 19 } }),
    (error) => error?.code === 'CONTENT_RUN_FINISH_FAILED'
      && error?.retryable === true
      && error !== permanent
  );
});

test('geworfener Abschlussfehler einer permanenten Regeneration wird redigiert technisch retrybar', async () => {
  const permanent = Object.assign(new Error('Entwurf nicht mehr verfügbar'), {
    code: 'CONTENT_DRAFT_NOT_FOUND',
    retryable: false
  });
  const databaseError = new Error('password=geheim host=intern');
  const handler = createProductionJobHandler({
    async createRun() { return { id: 88 }; },
    async finishRun() { throw databaseError; },
    async runPipeline() { assert.fail('nicht erwartet'); },
    createRegenerationDependencies() { return {}; },
    async runRegenerationJob() { throw permanent; }
  });

  await assert.rejects(
    handler({ id: 51, job_type: 'regenerate_article', payload_json: { post_id: 19 } }),
    (error) => error?.code === 'CONTENT_RUN_FINISH_FAILED'
      && error?.retryable === true
      && error?.cause === databaseError
      && !error.message.includes('geheim')
      && error !== permanent
  );
});

test('retrybarer Regenerationsfehler lässt den Run für denselben Retry offen', async () => {
  let finishCalls = 0;
  const retryable = Object.assign(new Error('Provider vor Ausführung nicht erreichbar'), {
    code: 'CONTENT_PROVIDER_SAFE_RETRY',
    retryable: true
  });
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    async getSettings() { return { settings_version: 1 }; },
    resolveRuntimeConfig() { return { operatingMode: 'review', timezone: 'Europe/Berlin' }; },
    createJobSnapshot({ runtimeConfig }) { return runtimeConfig; },
    async createRun() {
      return { id: 88, runtime_snapshot_json: { operatingMode: 'review', timezone: 'Europe/Berlin' } };
    },
    async finishRun() { finishCalls += 1; },
    async runPipeline() { assert.fail('nicht erwartet'); },
    createRegenerationDependencies() { return {}; },
    async runRegenerationJob() { throw retryable; }
  });

  await assert.rejects(handler({
    id: 51,
    job_type: 'regenerate_article',
    payload_json: { post_id: 19, forced_mode: 'review' }
  }), retryable);
  assert.equal(finishCalls, 0);
});

test('Produktionsruntime bindet Regenerationsrepository an die aktive Datenbank und dispatcht', async () => {
  const claim = {
    id: 61,
    job_type: 'regenerate_metadata',
    locked_by: 'worker-regeneration',
    attempts: 1,
    payload_json: { post_id: 19, forced_mode: 'review', source: 'admin_regeneration' }
  };
  const database = { async query() { return { rows: [] }; } };
  const boundDatabases = [];
  let regenerationDependencies;
  const modules = {
    OpenAI: class {},
    cloudinary: { config() {} },
    jobRepository: {
      async upsertWorkerHeartbeat() {}, async recoverExpiredJobs() {},
      async claimNextJob() { return claim; }, async renewJobLease(value) { return value; },
      async completeJob(value) { return value; }, async failJob(value) { return value; },
      async retryOrFailJob(value) { return value; }, async markJobNeedsManualAttention(value) { return value; },
      async enqueueJob() {}, async updateContentSchedulerState() {}
    },
    runRepository: {
      async createRun(input, db) {
        boundDatabases.push(db);
        return { id: 91, status: 'running', runtime_snapshot_json: input.runtimeSnapshot };
      },
      async updateRunStage() {}, async finishRun() {}
    },
    settingsRepository: { async getContentAgentSettings() { return { settings_version: 1 }; } },
    runtimeConfigService: {
      resolveContentAgentRuntimeConfig() { return { operatingMode: 'review', timezone: 'Europe/Berlin' }; },
      createContentAgentJobSnapshot
    },
    providerStateRepository: { async recordProviderResult() {} },
    topicRepository: { async createTopic() {}, async markTopicUsed() {} },
    costService: {
      estimateTextCost() { return 0; }, assertMonthlyBudget() {},
      async getMonthlyContentCost() {}, async reserveMonthlyBudget() {}, async settleMonthlyBudget() {},
      async releaseMonthlyBudgetReservation() {}, async getPersistedStageResult() {}
    },
    BlogPostModel: { async createAIDraft() {}, async findAIDraftByGenerationRunId() {} },
    createPricingRepository() { return {}; },
    createPricingService() { return { async getVisiblePackages() { return []; } }; },
    createOpenAIContentService() { return { repairArticle() {} }; },
    createContentImageService() { return { generateAndUploadImage() {}, deleteImage() {} }; },
    createDraftRegenerationRepository(db) {
      boundDatabases.push(db);
      return { bound: db };
    },
    async runDraftRegenerationJob(_context, dependencies) {
      regenerationDependencies = dependencies;
      return { status: 'completed', post: { id: 19, published: false } };
    },
    async runDraftPipeline() { assert.fail('nicht erwartet'); },
    buildSiteInventory: async () => ({}), selectBestTopic() {}, validateArticle() { return { passed: true }; }
  };
  const runtime = createProductionRuntime({
    config: { enabled: true, workerPollMs: 5000, jobLeaseMinutes: 30 },
    env: { OPENAI_API_KEY: 'test-key' },
    database,
    modules
  });

  await runtime.worker.processOnce();

  assert.equal(regenerationDependencies.draftRepository.bound, database);
  assert.equal(boundDatabases.every((db) => db === database), true);
});

test('Produktionsmodule laden den Regenerationsservice ausschließlich verzögert', async () => {
  const modules = await loadProductionModules();

  assert.equal(typeof modules.runDraftRegenerationJob, 'function');
  assert.equal(typeof modules.createDraftRegenerationRepository, 'function');
  assert.equal(typeof modules.runReviewIssueOptimizationJob, 'function');
  assert.equal(typeof modules.createContentReviewIssueOptimizationRepository, 'function');
  assert.equal(typeof modules.createContentPublicationService, 'function');
  assert.equal(typeof modules.createBlogNewsletterService, 'function');
  assert.equal(typeof modules.sendAdminReviewNotification, 'function');
  assert.equal(typeof modules.sendContentAgentReviewMail, 'function');
  assert.equal(typeof modules.createSearchConsoleClient, 'function');
  assert.equal(typeof modules.createSearchConsoleSyncService, 'function');
  assert.equal(typeof modules.createContentSearchMetricsRepository, 'function');
  assert.equal(typeof modules.createContentSearchOpportunityRepository, 'function');
  assert.equal(typeof modules.buildContentOpportunities, 'function');
  assert.equal(typeof modules.searchConsoleSchedulerService?.createSearchConsoleScheduler, 'function');
});

test('die Produktionsruntime verdrahtet GSC-Client, Repositories und beide frühen Dispatchpfade', async () => {
  const claims = [{
    id: 201,
    job_type: 'sync_search_console',
    locked_by: 'worker-gsc',
    attempts: 1,
    payload_json: { startDate: '2026-06-21', endDate: '2026-07-18' }
  }, {
    id: 202,
    job_type: 'analyze_search_opportunities',
    locked_by: 'worker-gsc',
    attempts: 1,
    payload_json: { startDate: '2026-06-21', endDate: '2026-07-18' }
  }];
  const events = [];
  const database = { async query() { return { rows: [] }; } };
  const metricRows = [{ postId: 11, query: 'webdesign berlin' }];
  const opportunities = [{ postId: 11, analysisKey: 'chance-11' }];
  const modules = {
    OpenAI: class {},
    cloudinary: { config() {} },
    jobRepository: {
      async upsertWorkerHeartbeat() {},
      async recoverExpiredJobs() {},
      async claimNextJob(_workerId, db) { assert.equal(db, database); return claims.shift() || null; },
      async renewJobLease(claim, db) { assert.equal(db, database); return claim; },
      async completeJob(claim, db) { assert.equal(db, database); return { ...claim, status: 'completed' }; },
      async failJob() { assert.fail('nicht erwartet'); },
      async retryOrFailJob() { assert.fail('nicht erwartet'); },
      async markJobNeedsManualAttention() { assert.fail('nicht erwartet'); },
      async enqueueJob(input, db) { events.push(['enqueue', input, db]); return { id: 203 }; }
    },
    runRepository: {
      async createRun() { assert.fail('GSC-Jobs dürfen keinen Content-Run anlegen.'); },
      async updateRunStage() {},
      async finishRun() {}
    },
    settingsRepository: { async getContentAgentSettings() { return { agent_enabled: true }; } },
    runtimeConfigService: {
      resolveContentAgentRuntimeConfig,
      createContentAgentJobSnapshot
    },
    providerStateRepository: {
      async recordProviderResult(input, db) { events.push(['provider', input, db]); }
    },
    topicRepository: { async createTopic() {}, async markTopicUsed() {} },
    costService: {
      estimateTextCost() { return 0; },
      assertMonthlyBudget() {},
      async getMonthlyContentCost() {},
      async reserveMonthlyBudget() {},
      async settleMonthlyBudget() {},
      async releaseMonthlyBudgetReservation() {},
      async getPersistedStageResult() {}
    },
    createPricingRepository() { return {}; },
    createPricingService() { return { async getVisiblePackages() { return []; } }; },
    async runDraftPipeline() { assert.fail('GSC-Jobs dürfen keine Artikelpipeline starten.'); },
    createSearchConsoleClient(input) {
      events.push(['client', input]);
      return { marker: 'client' };
    },
    createContentSearchMetricsRepository(db) {
      events.push(['metrics-repository', db]);
      return {
        async findPostIdsByCanonicalPaths() { return new Map(); },
        async upsertSearchMetrics() {},
        async listAggregatedMetrics(range) {
          events.push(['metrics', range]);
          return metricRows;
        }
      };
    },
    createContentSearchOpportunityRepository(db) {
      events.push(['opportunity-repository', db]);
      return {
        async upsertOpenOpportunities(rows) {
          events.push(['opportunities', rows]);
          return rows;
        }
      };
    },
    createSearchConsoleSyncService({ client, repository, allowedHosts }) {
      events.push(['sync-service', client, repository, allowedHosts]);
      return {
        async syncSearchConsoleRange(input) {
          events.push(['sync', input]);
          await input.leaseGuard();
        }
      };
    },
    buildContentOpportunities(rows, range) {
      events.push(['build', rows, range]);
      return opportunities;
    }
  };
  const runtime = createProductionRuntime({
    config: {
      enabled: true,
      timezone: 'Europe/Berlin',
      workerPollMs: 5_000,
      jobLeaseMinutes: 30,
      searchConsoleSiteUrl: 'sc-domain:komplettwebdesign.de',
      googleCredentialsPath: '/srv/google-search-console.json'
    },
    database,
    modules
  });

  assert.equal((await runtime.worker.processOnce()).status, 'completed');
  assert.equal((await runtime.worker.processOnce()).status, 'completed');

  assert.deepEqual(events.find(([type]) => type === 'client')?.[1], {
    siteUrl: 'sc-domain:komplettwebdesign.de',
    credentialsPath: '/srv/google-search-console.json'
  });
  assert.equal(events.find(([type]) => type === 'metrics-repository')?.[1], database);
  assert.equal(events.find(([type]) => type === 'opportunity-repository')?.[1], database);
  assert.equal(events.some(([type]) => type === 'sync'), true);
  assert.equal(events.some(([type]) => type === 'metrics'), true);
  assert.equal(events.some(([type]) => type === 'build'), true);
  assert.equal(events.some(([type]) => type === 'opportunities'), true);
  assert.equal(events.filter(([type]) => type === 'provider').length, 1);
  assert.equal(events.filter(([type]) => type === 'enqueue').length, 1);
});

test('der Entrypoint startet beide Scheduler erst beim aktiven Worker und stoppt beide sicher', async () => {
  const events = [];
  let searchConsoleTick;
  const database = { async end() { events.push('pool.end'); } };
  const inertJobRepository = {
    async upsertWorkerHeartbeat() { events.push('worker.heartbeat'); },
    async recoverExpiredJobs() {},
    async claimNextJob() { return null; },
    async renewJobLease(claim) { return claim; },
    async completeJob(claim) { return claim; },
    async failJob(claim) { return claim; },
    async retryOrFailJob(claim) { return claim; },
    async markJobNeedsManualAttention(claim) { return claim; },
    async enqueueJob(input) { events.push(['enqueue', input]); return input; },
    async updateContentSchedulerState() {}
  };
  const modules = {
    OpenAI: class {},
    cloudinary: { config() {} },
    jobRepository: inertJobRepository,
    runRepository: { async createRun() {}, async updateRunStage() {}, async finishRun() {} },
    settingsRepository: {
      async getContentAgentSettings() { return { agent_enabled: false }; }
    },
    runtimeConfigService: {
      resolveContentAgentRuntimeConfig,
      createContentAgentJobSnapshot
    },
    providerStateRepository: { async recordProviderResult() {} },
    topicRepository: { async createTopic() {}, async markTopicUsed() {} },
    costService: {
      estimateTextCost() { return 0; }, assertMonthlyBudget() {},
      async getMonthlyContentCost() {}, async reserveMonthlyBudget() {}, async settleMonthlyBudget() {},
      async releaseMonthlyBudgetReservation() {}, async getPersistedStageResult() {}
    },
    createPricingRepository() { return {}; },
    createPricingService() { return {}; },
    async runDraftPipeline() { return { status: 'completed' }; },
    createSearchConsoleClient() { return {}; },
    createContentSearchMetricsRepository() {
      return {
        async findPostIdsByCanonicalPaths() { return new Map(); },
        async upsertSearchMetrics() {},
        async listAggregatedMetrics() { return []; }
      };
    },
    createContentSearchOpportunityRepository() {
      return { async upsertOpenOpportunities() { return []; } };
    },
    createSearchConsoleSyncService() {
      return { async syncSearchConsoleRange() {} };
    },
    buildContentOpportunities() { return []; },
    schedulerService: {
      createDynamicContentScheduler() {
        return {
          start() { events.push('article-scheduler.start'); },
          stop() { events.push('article-scheduler.stop'); }
        };
      },
      async runContentSchedulerTick() {}
    },
    searchConsoleSchedulerService: {
      createSearchConsoleScheduler({ tick }) {
        searchConsoleTick = tick;
        return {
          start() { events.push('search-console-scheduler.start'); },
          stop() { events.push('search-console-scheduler.stop'); }
        };
      },
      runSearchConsoleSchedulerTick
    }
  };

  const result = await startContentWorker({
    env: {
      CONTENT_AGENT_ENABLED: 'true',
      SEARCH_CONSOLE_SITE_URL: 'sc-domain:komplettwebdesign.de',
      GOOGLE_APPLICATION_CREDENTIALS: '/srv/google-search-console.json'
    },
    database,
    modules,
    logger: { log() {}, error() {} },
    processTarget: { on() {}, off() {} }
  });

  try {
    assert.equal(typeof searchConsoleTick, 'function');
    assert.equal(await searchConsoleTick(), null);
    assert.equal(events.some((event) => Array.isArray(event) && event[0] === 'enqueue'), false);
    assert.deepEqual(events.filter((event) => typeof event === 'string' && event.endsWith('.start')), [
      'article-scheduler.start',
      'search-console-scheduler.start'
    ]);
  } finally {
    await result.shutdown();
  }
  assert.equal(events.indexOf('article-scheduler.stop') < events.indexOf('pool.end'), true);
  assert.equal(events.indexOf('search-console-scheduler.stop') < events.indexOf('pool.end'), true);
});

test('Worker- und Healthcheck-Import laden weder globalen Pool noch Cron, Repositories oder Models', async () => {
  const workerSource = await readFile(new URL('../scripts/contentWorker.js', import.meta.url), 'utf8');
  const healthSource = await readFile(new URL('../scripts/contentWorkerHealthcheck.js', import.meta.url), 'utf8');
  const staticWorkerImports = workerSource.split('\n').filter((line) => /^import\s/.test(line)).join('\n');
  const staticHealthImports = healthSource.split('\n').filter((line) => /^import\s/.test(line)).join('\n');

  assert.doesNotMatch(staticWorkerImports, /node-cron|openai|cloudinary|repositories\/|models\/|util\/db|pricingService|contentCostService/);
  assert.doesNotMatch(staticHealthImports, /util\/db|repositories\/|models\/|node-cron/);
});

test('Produktionsmodule laden den Providerstatus-Adapter ausschließlich im verzögerten Produktionspfad', async () => {
  const modules = await loadProductionModules();

  assert.equal(typeof modules.providerStateRepository?.recordProviderResult, 'function');
});

test('die Produktionsruntime bindet sämtliche Datenbankadapter an genau den injizierten Pool', async () => {
  const database = {
    queries: [],
    async query(sql) { this.queries.push(sql); return { rows: [] }; },
    async end() {}
  };
  const dbArguments = [];
  let publicationServiceDependencies;
  let scheduledPublicationServiceDependencies;
  let blogNewsletterServiceDependencies;
  const recordDb = (...args) => {
    dbArguments.push(args.at(-1));
    return { id: 1, locked_by: 'worker', attempts: 1 };
  };
  const modules = {
    OpenAI: class { constructor() { this.images = {}; } },
    cloudinary: { config() {}, uploader: {} },
    jobRepository: {
      upsertWorkerHeartbeat: async (...args) => recordDb(...args),
      recoverExpiredJobs: async (...args) => recordDb(...args),
      claimNextJob: async (...args) => { recordDb(...args); return null; },
      renewJobLease: async (...args) => recordDb(...args),
      completeJob: async (...args) => recordDb(...args),
      failJob: async (...args) => recordDb(...args),
      retryOrFailJob: async (...args) => recordDb(...args),
      markJobNeedsManualAttention: async (...args) => recordDb(...args),
      enqueueJob: async (...args) => recordDb(...args)
    },
    runRepository: {
      createRun: async (...args) => recordDb(...args),
      updateRunStage: async (...args) => recordDb(...args),
      finishRun: async (...args) => recordDb(...args)
    },
    topicRepository: {
      createTopic: async (...args) => recordDb(...args),
      markTopicUsed: async (...args) => recordDb(...args)
    },
    providerStateRepository: {
      recordProviderResult: async (...args) => recordDb(...args)
    },
    costService: {
      estimateTextCost: () => 0,
      assertMonthlyBudget() {},
      getMonthlyContentCost: async ({ db }) => { dbArguments.push(db); return 0; },
      reserveMonthlyBudget: async ({ db }) => { dbArguments.push(db); return {}; },
      settleMonthlyBudget: async ({ db }) => { dbArguments.push(db); return {}; },
      releaseMonthlyBudgetReservation: async ({ db }) => { dbArguments.push(db); return {}; },
      getPersistedStageResult: async ({ db }) => { dbArguments.push(db); return null; }
    },
    BlogPostModel: {
      async createAIDraft(_input, db) { dbArguments.push(db); return {}; },
      async findAIDraftByGenerationRunId(_runId, db) { dbArguments.push(db); return null; }
    },
    createPricingRepository(db) { dbArguments.push(db); return { bound: true }; },
    createPricingService(repository) { return { repository, getVisiblePackages: async () => [] }; },
    buildSiteInventory: async (loaders) => {
      await Promise.all([
        loaders.loadBlogPosts(),
        loaders.loadGuides(),
        loaders.loadServicePages(),
        loaders.loadIndustries(),
        loaders.getVisiblePackages()
      ]);
      return {};
    },
    createOpenAIContentService: () => ({}),
    createContentImageService: () => ({}),
    createContentPublicationService(dependencies) {
      publicationServiceDependencies = dependencies;
      return { revalidateDraftForPublication: async () => ({}) };
    },
    createBlogNewsletterService(dependencies) {
      blogNewsletterServiceDependencies = dependencies;
      return {
        queuePublishedArticleNewsletter: async () => ({ status: 'queued' }),
        preparePublishedArticleNewsletter: async () => ({ status: 'prepared' }),
        sendNewsletterDelivery: async () => ({ status: 'completed' })
      };
    },
    createScheduledPublicationService(dependencies) {
      scheduledPublicationServiceDependencies = dependencies;
      return {
        approveAutomaticallyForSchedule: async () => ({ decision: { allowed: false } }),
        publishApprovedPost: async () => ({ post: { published: true } })
      };
    },
    runDraftPipeline: async () => ({ status: 'completed' }),
    validateArticle: () => ({ passed: true }),
    selectBestTopic: () => null
  };
  const config = {
    enabled: true,
    timezone: 'Europe/Berlin',
    workerPollMs: 5_000,
    jobLeaseMinutes: 30
  };

  const runtime = createProductionRuntime({ config, env: { OPENAI_API_KEY: 'test-key' }, database, modules });
  await runtime.pipelineDependencies.runRepository.createRun({ jobId: 1 });
  await runtime.pipelineDependencies.runRepository.updateRunStage(1, { stageId: 'test' });
  await runtime.pipelineDependencies.runRepository.finishRun(1, {});
  await runtime.pipelineDependencies.topicRepository.createTopic({ topic: 'Test' });
  await runtime.pipelineDependencies.topicRepository.markTopicUsed(1);
  await runtime.pipelineDependencies.costService.getMonthlyContentCost({});
  await runtime.pipelineDependencies.costService.reserveMonthlyBudget({});
  await runtime.pipelineDependencies.costService.settleMonthlyBudget({});
  await runtime.pipelineDependencies.costService.releaseMonthlyBudgetReservation({});
  await runtime.pipelineDependencies.costService.getPersistedStageResult({});
  await runtime.pipelineDependencies.draftRepository.createAIDraft({});
  await runtime.pipelineDependencies.draftRepository.findAIDraftByGenerationRunId(1);
  await runtime.pipelineDependencies.recordProviderResult({ providerName: 'openai', success: true });
  await runtime.pipelineDependencies.inventoryService.buildSiteInventory();
  await runtime.worker.processOnce();
  await runtime.jobRepository.enqueueJob({});

  assert.ok(dbArguments.length >= 16);
  assert.equal(dbArguments.every((value) => value === database), true);
  assert.ok(database.queries.length >= 4);
  assert.equal(
    runtime.pipelineDependencies.publicationService.approveAutomaticallyForSchedule instanceof Function,
    true
  );
  assert.equal(publicationServiceDependencies.db, database);
  assert.equal(publicationServiceDependencies.validateArticle, modules.validateArticle);
  assert.equal(scheduledPublicationServiceDependencies.db, database);
  assert.equal(blogNewsletterServiceDependencies.database, database);
  assert.equal(typeof scheduledPublicationServiceDependencies.queuePublishedArticleNewsletter, 'function');
  assert.equal(
    scheduledPublicationServiceDependencies.publicationService.revalidateDraftForPublication instanceof Function,
    true
  );
});

test('der Healthcheck bewertet den Heartbeat mit Datenbankzeit', async () => {
  const calls = [];
  const database = {
    async query(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [{ fresh: true }] };
    }
  };

  assert.equal(await checkWorkerHeartbeat(database), true);
  assert.match(calls[0].sql, /heartbeat_at >= NOW\(\) - INTERVAL '90 seconds' AS fresh/i);
  assert.match(calls[0].sql, /WHERE worker_name = \$1/i);
  assert.deepEqual(calls[0].params, ['content-worker']);
});

test('der Healthcheck gibt für frischen und fehlenden Heartbeat knappe Exitcodes aus', async () => {
  const freshOutput = [];
  const staleOutput = [];
  const freshCode = await runWorkerHealthcheck({
    database: { async query() { return { rows: [{ fresh: true }] }; } },
    stdout: { write(value) { freshOutput.push(value); } },
    stderr: { write() {} }
  });
  const staleCode = await runWorkerHealthcheck({
    database: { async query() { return { rows: [] }; } },
    stdout: { write(value) { staleOutput.push(value); } },
    stderr: { write() {} }
  });

  assert.equal(freshCode, 0);
  assert.equal(staleCode, 1);
  assert.deepEqual(freshOutput, ['Content-Worker ist gesund.\n']);
  assert.deepEqual(staleOutput, ['Content-Worker-Heartbeat ist nicht aktuell.\n']);
});

test('der Healthcheck verbirgt Datenbank-Credentials und Stacks', async () => {
  const output = [];
  const code = await runWorkerHealthcheck({
    database: {
      async query() {
        throw new Error('postgres://user:passwort@db/app\n    at intern (/srv/check.js:1:1)');
      }
    },
    stdout: { write() {} },
    stderr: { write(value) { output.push(value); } }
  });

  assert.equal(code, 1);
  assert.deepEqual(output, ['Content-Worker-Healthcheck fehlgeschlagen.\n']);
  assert.doesNotMatch(output.join(''), /passwort|intern|postgres/i);
});

test('der Dry-Run verwendet reale Pipeline- und Validatorlogik ohne externe Aufrufe', async () => {
  const result = await runContentAgentDryRun();

  assert.equal(result.mode, 'dry-run');
  assert.equal(result.externalCalls, 0);
  assert.ok(result.simulatedAdapterCalls > 0);
  assert.equal(result.articleValid, true);
  assert.equal(result.qualityScore, 90);
  assert.equal(result.publishMode, 'draft');
});

test('ein tatsächlich verwendeter externer Dry-Run-Adapter erhöht den Zähler und bricht die Pipeline ab', async () => {
  const adapterMonitor = createDryRunAdapterMonitor();

  await assert.rejects(
    runContentAgentDryRun({
      adapterMonitor,
      configureAdapters(adapters, monitor) {
        adapters.openaiService.createTopicCandidates = monitor.forbidden('openai.createTopicCandidates');
      }
    }),
    (error) => error.code === 'dry_run_external_call'
      && error.dryRunMetrics.externalCalls === 1
  );
  assert.equal(adapterMonitor.externalCalls, 1);
});

test('das Dry-Run-Skript benötigt keine DB-, OpenAI- oder Cloudinary-Zugangsdaten', async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['scripts/contentAgentDryRun.js'],
    {
      cwd: new URL('..', import.meta.url),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        DB_HOST: 'darf-nicht-aufgerufen-werden.invalid'
      }
    }
  );

  assert.equal(stderr, '');
  const result = JSON.parse(stdout);
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.externalCalls, 0);
  assert.ok(result.simulatedAdapterCalls > 0);
  assert.equal(result.articleValid, true);
  assert.equal(result.qualityScore, 90);
  assert.equal(result.publishMode, 'draft');
});

test('der deaktivierte Entrypoint startet weder Scheduler noch Datenbankzugriff', async () => {
  let databaseCalls = 0;
  const result = await startContentWorker({
    env: {},
    database: {
      query() { databaseCalls += 1; },
      connect() { databaseCalls += 1; },
      end() { databaseCalls += 1; }
    },
    logger: { log() {}, error() {} },
    processTarget: { on() {}, off() {} }
  });

  assert.equal(result.enabled, false);
  assert.equal(databaseCalls, 0);
});

test('package.json stellt Worker, Dry-Run und Healthcheck als npm-Skripte bereit', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts['start:content-worker'], 'node scripts/contentWorker.js');
  assert.equal(packageJson.scripts['content-agent:dry-run'], 'node scripts/contentAgentDryRun.js');
  assert.equal(packageJson.scripts['content-agent:healthcheck'], 'node scripts/contentWorkerHealthcheck.js');
});
