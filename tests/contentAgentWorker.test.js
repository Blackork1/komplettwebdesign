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
  createWeeklyScheduler,
  startContentWorker
} from '../scripts/contentWorker.js';
import {
  checkWorkerHeartbeat,
  runWorkerHealthcheck
} from '../scripts/contentWorkerHealthcheck.js';
import {
  createDryRunAdapterMonitor,
  runContentAgentDryRun
} from '../scripts/contentAgentDryRun.js';

const execFileAsync = promisify(execFile);

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

test('der Wochenplan enqueued idempotent genau den Berliner Wochen-Draft', async () => {
  const scheduled = [];
  const enqueued = [];
  const scheduler = createWeeklyScheduler({
    enabled: true,
    schedule: '0 9 * * 1',
    timezone: 'Europe/Berlin',
    maxAttempts: 4,
    now: () => new Date('2026-01-04T23:30:00.000Z'),
    cronClient: {
      schedule(expression, callback, options) {
        scheduled.push({ expression, callback, options });
        return { stop() { scheduled.push({ stopped: true }); } };
      }
    },
    async enqueueJob(input) { enqueued.push(input); }
  });

  assert.equal(scheduled.length, 1);
  assert.deepEqual(scheduled[0].options, { timezone: 'Europe/Berlin' });
  await scheduled[0].callback();
  assert.deepEqual(enqueued, [{
    jobType: 'generate_weekly_draft',
    idempotencyKey: 'weekly-draft:2026-01-05',
    payload: { source: 'weekly-schedule' },
    maxAttempts: 4
  }]);
  scheduler.stop();
  assert.equal(scheduled.at(-1).stopped, true);
});

test('der Wochenplan startet bei deaktiviertem Worker nicht', () => {
  let scheduleCalls = 0;
  const scheduler = createWeeklyScheduler({
    enabled: false,
    cronClient: { schedule() { scheduleCalls += 1; } },
    enqueueJob: async () => {}
  });

  assert.equal(scheduler, null);
  assert.equal(scheduleCalls, 0);
});

test('Shutdown schließt den Pool nach vollständig geleertem Worker sofort und idempotent', async () => {
  const events = [];
  const shutdown = createShutdownController({
    scheduler: { stop() { events.push('scheduler.stop'); } },
    worker: {
      async stop() { events.push('worker.stop'); return { drained: true }; },
      async whenIdle() { events.push('worker.whenIdle'); }
    },
    pool: { async end() { events.push('pool.end'); } },
    logger: { error(message) { events.push(message); } }
  });

  await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);

  assert.deepEqual(events, ['scheduler.stop', 'worker.stop', 'pool.end']);
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

test('Worker- und Healthcheck-Import laden weder globalen Pool noch Cron, Repositories oder Models', async () => {
  const workerSource = await readFile(new URL('../scripts/contentWorker.js', import.meta.url), 'utf8');
  const healthSource = await readFile(new URL('../scripts/contentWorkerHealthcheck.js', import.meta.url), 'utf8');
  const staticWorkerImports = workerSource.split('\n').filter((line) => /^import\s/.test(line)).join('\n');
  const staticHealthImports = healthSource.split('\n').filter((line) => /^import\s/.test(line)).join('\n');

  assert.doesNotMatch(staticWorkerImports, /node-cron|openai|cloudinary|repositories\/|models\/|util\/db|pricingService|contentCostService/);
  assert.doesNotMatch(staticHealthImports, /util\/db|repositories\/|models\/|node-cron/);
});

test('die Produktionsruntime bindet sämtliche Datenbankadapter an genau den injizierten Pool', async () => {
  const database = {
    queries: [],
    async query(sql) { this.queries.push(sql); return { rows: [] }; },
    async end() {}
  };
  const dbArguments = [];
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
    costService: {
      estimateTextCost: () => 0,
      assertMonthlyBudget() {},
      getMonthlyContentCost: async ({ db }) => { dbArguments.push(db); return 0; },
      reserveMonthlyBudget: async ({ db }) => { dbArguments.push(db); return {}; },
      settleMonthlyBudget: async ({ db }) => { dbArguments.push(db); return {}; },
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
  await runtime.pipelineDependencies.costService.getPersistedStageResult({});
  await runtime.pipelineDependencies.draftRepository.createAIDraft({});
  await runtime.pipelineDependencies.draftRepository.findAIDraftByGenerationRunId(1);
  await runtime.pipelineDependencies.inventoryService.buildSiteInventory();
  await runtime.worker.processOnce();
  await runtime.jobRepository.enqueueJob({});

  assert.ok(dbArguments.length >= 15);
  assert.equal(dbArguments.every((value) => value === database), true);
  assert.ok(database.queries.length >= 4);
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
  let cronCalls = 0;
  let databaseCalls = 0;
  const result = await startContentWorker({
    env: {},
    cronClient: { schedule() { cronCalls += 1; } },
    database: {
      query() { databaseCalls += 1; },
      connect() { databaseCalls += 1; },
      end() { databaseCalls += 1; }
    },
    logger: { log() {}, error() {} },
    processTarget: { on() {}, off() {} }
  });

  assert.equal(result.enabled, false);
  assert.equal(cronCalls, 0);
  assert.equal(databaseCalls, 0);
});

test('package.json stellt Worker, Dry-Run und Healthcheck als npm-Skripte bereit', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts['start:content-worker'], 'node scripts/contentWorker.js');
  assert.equal(packageJson.scripts['content-agent:dry-run'], 'node scripts/contentAgentDryRun.js');
  assert.equal(packageJson.scripts['content-agent:healthcheck'], 'node scripts/contentWorkerHealthcheck.js');
});
