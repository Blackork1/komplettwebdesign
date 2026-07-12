import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildScheduledJobIdentity,
  createDynamicContentScheduler,
  getLocalScheduleContext,
  runContentSchedulerTick
} from '../services/contentAgent/contentSchedulerService.js';

const berlinSettings = Object.freeze({
  agent_enabled: true,
  schedule_weekdays: [1, 4],
  schedule_time: '18:00',
  timezone: 'Europe/Berlin',
  generation_lead_hours: 4,
  maximum_attempts: 3
});

test('Veröffentlichungsslots erhalten eine kanonische Identität', () => {
  assert.equal(
    buildScheduledJobIdentity({
      localDate: '2026-07-16',
      localTime: '18:00',
      timezone: 'Europe/Berlin'
    }),
    'weekly:2026-07-16:18:00:Europe/Berlin'
  );
});

test('der lokale Kontext validiert die IANA-Zeitzone und liefert den UTC-Minutenanfang', () => {
  assert.deepEqual(getLocalScheduleContext({
    now: new Date('2026-07-13T16:00:20.000Z'),
    timezone: 'Europe/Berlin'
  }), {
    date: '2026-07-13',
    weekday: 1,
    time: '18:00',
    minuteStart: '2026-07-13T16:00:00.000Z'
  });
  assert.throws(
    () => getLocalScheduleContext({ timezone: 'Keine/Zeitzone' }),
    /Ungültige IANA-Zeitzone/
  );
});

test('ein Scheduler-Tick respektiert die operative Pause und aktualisiert trotzdem den Zustand', async () => {
  const enqueued = [];
  const states = [];
  const instant = new Date('2026-07-13T16:00:20.000Z');
  const result = await runContentSchedulerTick({
    getSettings: async () => ({ ...berlinSettings, agent_enabled: false }),
    enqueueJob: async (input) => { enqueued.push(input); return input; },
    updateSchedulerState: async (state) => { states.push(state); },
    now: () => instant
  });

  assert.equal(result, null);
  assert.deepEqual(enqueued, []);
  assert.deepEqual(states, [{
    lastSchedulerTickAt: instant,
    lastScheduledSlot: null,
    lastSchedulerError: null
  }]);
});

test('ein fälliger Scheduler-Tick enqueued den vollständigen Veröffentlichungsslot', async () => {
  const enqueued = [];
  const result = await runContentSchedulerTick({
    getSettings: async () => berlinSettings,
    enqueueJob: async (input) => { enqueued.push(input); return { id: 41, ...input }; },
    updateSchedulerState: async () => {},
    now: () => new Date('2026-07-13T12:02:20.000Z')
  });

  assert.equal(result.id, 41);
  assert.deepEqual(enqueued, [{
    jobType: 'generate_weekly_draft',
    idempotencyKey: 'generate:weekly:2026-07-06:18:00:Europe/Berlin',
    payload: {
      source: 'weekly-schedule',
      schedule_slot: 'weekly:2026-07-06:18:00:Europe/Berlin',
      publication_at: '2026-07-06T16:00:00.000Z',
      publication_local_date: '2026-07-06',
      publication_local_time: '18:00',
      publication_timezone: 'Europe/Berlin'
    },
    maxAttempts: 3
  }, {
    jobType: 'generate_weekly_draft',
    idempotencyKey: 'generate:weekly:2026-07-09:18:00:Europe/Berlin',
    payload: {
      source: 'weekly-schedule',
      schedule_slot: 'weekly:2026-07-09:18:00:Europe/Berlin',
      publication_at: '2026-07-09T16:00:00.000Z',
      publication_local_date: '2026-07-09',
      publication_local_time: '18:00',
      publication_timezone: 'Europe/Berlin'
    },
    maxAttempts: 3
  }, {
    jobType: 'generate_weekly_draft',
    idempotencyKey: 'generate:weekly:2026-07-13:18:00:Europe/Berlin',
    payload: {
      source: 'weekly-schedule',
      schedule_slot: 'weekly:2026-07-13:18:00:Europe/Berlin',
      publication_at: '2026-07-13T16:00:00.000Z',
      publication_local_date: '2026-07-13',
      publication_local_time: '18:00',
      publication_timezone: 'Europe/Berlin'
    },
    maxAttempts: 3
  }]);
});

test('wiederholte Ticks verwenden denselben Idempotenzschlüssel', async () => {
  const enqueued = [];
  const dependencies = {
    getSettings: async () => berlinSettings,
    enqueueJob: async (input) => { enqueued.push(input); return input; },
    updateSchedulerState: async () => {},
    now: () => new Date('2026-07-13T12:02:20.000Z')
  };

  await runContentSchedulerTick(dependencies);
  await runContentSchedulerTick(dependencies);

  assert.equal(enqueued.length, 6);
  assert.deepEqual(enqueued.slice(0, 3).map(({ idempotencyKey }) => idempotencyKey),
    enqueued.slice(3).map(({ idempotencyKey }) => idempotencyKey));
  assert.equal(enqueued[2].idempotencyKey, 'generate:weekly:2026-07-13:18:00:Europe/Berlin');
});

test('ein Ausfall von Montag bis Freitag holt Montag und Donnerstag chronologisch nach', async () => {
  const enqueued = [];
  await runContentSchedulerTick({
    getSettings: async () => berlinSettings,
    enqueueJob: async (input) => { enqueued.push(input); return input; },
    updateSchedulerState: async () => {},
    now: () => new Date('2026-07-17T10:00:00.000Z')
  });

  assert.deepEqual(enqueued.map((job) => job.payload.publication_local_date), [
    '2026-07-13',
    '2026-07-16'
  ]);
});

test('ein wöchentlicher Slot wird auch kurz vor dem Folgeslot nach sieben Kalendertagen nachgeholt', async () => {
  const enqueued = [];
  await runContentSchedulerTick({
    getSettings: async () => ({ ...berlinSettings, schedule_weekdays: [1] }),
    enqueueJob: async (input) => { enqueued.push(input); return input; },
    updateSchedulerState: async () => {},
    now: () => new Date('2026-07-20T11:00:00.000Z')
  });
  assert.deepEqual(enqueued.map((job) => job.payload.publication_local_date), ['2026-07-13']);
});

test('wiederholte Catch-up-Ticks und Teilkonflikte lassen ältere Slots nicht verhungern', async () => {
  const attempts = [];
  const dependencies = {
    getSettings: async () => berlinSettings,
    enqueueJob: async (input) => {
      attempts.push(input.idempotencyKey);
      return input.payload.publication_local_date === '2026-07-16' ? null : input;
    },
    updateSchedulerState: async () => {},
    now: () => new Date('2026-07-17T10:00:00.000Z')
  };

  await runContentSchedulerTick(dependencies);
  await runContentSchedulerTick(dependencies);

  assert.deepEqual(attempts, [
    'generate:weekly:2026-07-13:18:00:Europe/Berlin',
    'generate:weekly:2026-07-16:18:00:Europe/Berlin',
    'generate:weekly:2026-07-13:18:00:Europe/Berlin',
    'generate:weekly:2026-07-16:18:00:Europe/Berlin'
  ]);
});

test('ein fehlgeschlagener Scheduler-Tick persistiert einen knappen Fehlerzustand und wirft weiter', async () => {
  const states = [];
  const failure = new Error('Datenbank vorübergehend nicht erreichbar');
  await assert.rejects(runContentSchedulerTick({
    getSettings: async () => berlinSettings,
    enqueueJob: async () => { throw failure; },
    updateSchedulerState: async (state) => { states.push(state); },
    now: () => new Date('2026-07-13T12:00:20.000Z')
  }), failure);

  assert.equal(states.length, 2);
  assert.equal(states[0].lastSchedulerError, null);
  assert.equal(states[1].lastScheduledSlot, 'weekly:2026-07-06:18:00:Europe/Berlin');
  assert.equal(states[1].lastSchedulerError, failure);
});

test('der dynamische Scheduler startet sofort und hält genau einen Minutentimer', async () => {
  const events = [];
  const scheduler = createDynamicContentScheduler({
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
