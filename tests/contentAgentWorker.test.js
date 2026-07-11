import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import {
  createContentWorker,
  isHeartbeatFresh
} from '../services/contentAgent/workerService.js';
import {
  berlinDateKey,
  createProductionJobHandler,
  createShutdownController,
  createWeeklyScheduler,
  startContentWorker
} from '../scripts/contentWorker.js';
import {
  checkWorkerHeartbeat,
  runWorkerHealthcheck
} from '../scripts/contentWorkerHealthcheck.js';
import { runContentAgentDryRun } from '../scripts/contentAgentDryRun.js';

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
    leaseMinutes: 30,
    setIntervalFn(callback, milliseconds) {
      calls.push(['interval', milliseconds]);
      return { callback };
    },
    clearIntervalFn(timer) { calls.push(['clear', timer]); },
    async upsertHeartbeat(input) { calls.push(['heartbeat', input]); },
    async recoverExpiredJobs(minutes) { calls.push(['recover', minutes]); },
    async claimNextJob(workerId) { calls.push(['claim', workerId]); return claim; },
    async handleJob(job) { calls.push(['handle', job]); return { status: 'completed' }; },
    async completeJob(job) { calls.push(['complete', job]); },
    async failJob(job, error) { calls.push(['fail', job, error]); },
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

test('Shutdown stoppt Scheduler und Worker vor dem Pool und ist idempotent', async () => {
  const events = [];
  const shutdown = createShutdownController({
    scheduler: { stop() { events.push('scheduler.stop'); } },
    worker: { async stop() { events.push('worker.stop'); } },
    pool: { async end() { events.push('pool.end'); } },
    logger: { error(message) { events.push(message); } }
  });

  await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);

  assert.deepEqual(events, ['scheduler.stop', 'worker.stop', 'pool.end']);
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

test('der Produktions-Jobhandler markiert Pipelinefehler sicher im Run und wirft weiter', async () => {
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
  assert.equal(finishCalls[0].runId, 21);
  assert.deepEqual(finishCalls[0].input, {
    status: 'failed',
    errorReport: { code: 'pipeline_failed', message: secretError.message }
  });
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

  assert.deepEqual(result, {
    mode: 'dry-run',
    externalCalls: 0,
    articleValid: true,
    qualityScore: 90,
    publishMode: 'draft'
  });
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
  assert.deepEqual(JSON.parse(stdout), {
    mode: 'dry-run',
    externalCalls: 0,
    articleValid: true,
    qualityScore: 90,
    publishMode: 'draft'
  });
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
