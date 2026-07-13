import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSearchConsoleScheduler,
  runSearchConsoleSchedulerTick
} from '../services/contentAgent/searchConsoleSchedulerService.js';

test('ein unkonfigurierter Search-Console-Scheduler bleibt ohne Job und Fehler', async () => {
  const enqueued = [];

  const result = await runSearchConsoleSchedulerTick({
    configured: false,
    schedule: 'kein gültiger Zeitplan',
    timezone: 'Keine/Zeitzone',
    enqueueJob: async (job) => { enqueued.push(job); return job; },
    now: () => new Date('2026-07-19T04:00:20.000Z')
  });

  assert.equal(result, null);
  assert.deepEqual(enqueued, []);
});

test('ein operativ pausierter Agent enqueued keinen Search-Console-Job', async () => {
  const enqueued = [];
  let settingsCalls = 0;

  const result = await runSearchConsoleSchedulerTick({
    configured: true,
    schedule: '0 6 * * 0',
    timezone: 'Europe/Berlin',
    async getSettings() {
      settingsCalls += 1;
      return { agent_enabled: false };
    },
    enqueueJob: async (job) => { enqueued.push(job); return job; },
    now: () => new Date('2026-07-19T04:00:20.000Z')
  });

  assert.equal(result, null);
  assert.equal(settingsCalls, 1);
  assert.deepEqual(enqueued, []);
});

test('der Sonntagstermin enqueued das 28-Tage-Fenster bis zum Vortag', async () => {
  const enqueued = [];

  const result = await runSearchConsoleSchedulerTick({
    configured: true,
    schedule: '0 6 * * 0',
    timezone: 'Europe/Berlin',
    enqueueJob: async (job) => { enqueued.push(job); return { id: 91, ...job }; },
    now: () => new Date('2026-07-19T04:00:20.000Z')
  });

  assert.equal(result.id, 91);
  assert.deepEqual(enqueued, [{
    jobType: 'sync_search_console',
    idempotencyKey: 'gsc-sync:2026-07-19',
    payload: {
      startDate: '2026-06-21',
      endDate: '2026-07-18'
    }
  }]);
});

test('außerhalb der konfigurierten lokalen Minute entsteht kein Job', async () => {
  const enqueued = [];

  const result = await runSearchConsoleSchedulerTick({
    configured: true,
    schedule: '0 6 * * 0',
    timezone: 'Europe/Berlin',
    enqueueJob: async (job) => { enqueued.push(job); return job; },
    now: () => new Date('2026-07-19T04:01:00.000Z')
  });

  assert.equal(result, null);
  assert.deepEqual(enqueued, []);
});

test('am falschen lokalen Wochentag entsteht kein Job', async () => {
  const enqueued = [];

  const result = await runSearchConsoleSchedulerTick({
    configured: true,
    schedule: '0 6 * * 0',
    timezone: 'Europe/Berlin',
    enqueueJob: async (job) => { enqueued.push(job); return job; },
    now: () => new Date('2026-07-20T04:00:00.000Z')
  });

  assert.equal(result, null);
  assert.deepEqual(enqueued, []);
});

test('der Search-Console-Zeitplan akzeptiert nur das enge Fünf-Feld-Schema', async () => {
  const invalidSchedules = [
    '* 6 * * 0',
    '60 6 * * 0',
    '0 24 * * 0',
    '0 6 1 * 0',
    '0 6 * 1 0',
    '0 6 * * 7',
    '0 6 * *',
    '0 6 * * 0 zusätzlich'
  ];

  for (const schedule of invalidSchedules) {
    await assert.rejects(
      runSearchConsoleSchedulerTick({
        configured: true,
        schedule,
        timezone: 'Europe/Berlin',
        enqueueJob: async () => null,
        now: () => new Date('2026-07-19T04:00:00.000Z')
      }),
      /Ungültiger Search-Console-Zeitplan/,
      schedule
    );
  }
});

test('ein konfigurierter Scheduler lehnt eine ungültige IANA-Zeitzone ab', async () => {
  await assert.rejects(
    runSearchConsoleSchedulerTick({
      configured: true,
      schedule: '0 6 * * 0',
      timezone: 'Keine/Zeitzone',
      enqueueJob: async () => null,
      now: () => new Date('2026-07-19T04:00:00.000Z')
    }),
    /Ungültige IANA-Zeitzone/
  );
});

test('wiederholte Ticks verwenden denselben lokalen Idempotenzschlüssel', async () => {
  const keys = [];
  const existing = new Set();
  const dependencies = {
    configured: true,
    schedule: '0 6 * * 0',
    timezone: 'Europe/Berlin',
    enqueueJob: async (job) => {
      keys.push(job.idempotencyKey);
      if (existing.has(job.idempotencyKey)) return null;
      existing.add(job.idempotencyKey);
      return job;
    },
    now: () => new Date('2026-07-19T04:00:40.000Z')
  };

  const first = await runSearchConsoleSchedulerTick(dependencies);
  const second = await runSearchConsoleSchedulerTick(dependencies);

  assert.equal(first.idempotencyKey, 'gsc-sync:2026-07-19');
  assert.equal(second, null);
  assert.deepEqual(keys, ['gsc-sync:2026-07-19', 'gsc-sync:2026-07-19']);
});

test('der Search-Console-Scheduler startet sofort und hält genau einen Minutentimer', async () => {
  const events = [];
  const scheduler = createSearchConsoleScheduler({
    async tick() { events.push('tick'); },
    setIntervalFn(callback, milliseconds) {
      events.push(['interval', milliseconds]);
      return { callback };
    },
    clearIntervalFn(timer) { events.push(['clear', timer]); }
  });

  assert.equal(scheduler.start(), true);
  assert.equal(scheduler.start(), false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(events.filter((event) => event === 'tick').length, 1);
  assert.deepEqual(events.find(Array.isArray), ['interval', 60_000]);
  assert.equal(scheduler.stop(), true);
  assert.equal(scheduler.stop(), false);
  assert.equal(events.filter((event) => Array.isArray(event) && event[0] === 'clear').length, 1);
});
