import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildScheduledJobIdentity,
  createDynamicContentScheduler,
  findDueScheduleSlot,
  getLocalScheduleContext,
  runContentSchedulerTick
} from '../services/contentAgent/contentSchedulerService.js';

const berlinSettings = Object.freeze({
  agent_enabled: true,
  schedule_weekdays: [1, 4],
  schedule_time: '18:00',
  timezone: 'Europe/Berlin',
  maximum_attempts: 3
});

test('Montag und Donnerstag 18 Uhr erzeugen kanonische Berliner Slots', () => {
  assert.equal(
    findDueScheduleSlot({
      settings: berlinSettings,
      now: new Date('2026-07-13T16:00:20.000Z')
    }).key,
    'weekly:2026-07-13:18:00:Europe/Berlin'
  );
  assert.equal(findDueScheduleSlot({
    settings: berlinSettings,
    now: new Date('2026-07-14T16:00:20.000Z')
  }), null);
  assert.equal(
    buildScheduledJobIdentity({
      localDate: '2026-07-16',
      localTime: '18:00',
      timezone: 'Europe/Berlin'
    }),
    'weekly:2026-07-16:18:00:Europe/Berlin'
  );
});

test('das fünfminütige Nachholfenster schließt Minute fünf aus', () => {
  assert.ok(findDueScheduleSlot({
    settings: berlinSettings,
    now: new Date('2026-07-13T16:04:59.999Z')
  }));
  assert.equal(findDueScheduleSlot({
    settings: berlinSettings,
    now: new Date('2026-07-13T16:05:00.000Z')
  }), null);
});

test('eine nicht existente Frühlingszeit läuft am nächsten gültigen Zeitpunkt desselben Tages', () => {
  const settings = {
    ...berlinSettings,
    schedule_weekdays: [7],
    schedule_time: '02:30'
  };

  const slot = findDueScheduleSlot({
    settings,
    now: new Date('2026-03-29T01:00:20.000Z')
  });

  assert.equal(slot.key, 'weekly:2026-03-29:02:30:Europe/Berlin');
  assert.equal(slot.localTime, '02:30');
});

test('beide Vorkommen einer doppelten Herbstzeit ergeben denselben idempotenten Slot', () => {
  const settings = {
    ...berlinSettings,
    schedule_weekdays: [7],
    schedule_time: '02:30'
  };
  const first = findDueScheduleSlot({
    settings,
    now: new Date('2026-10-25T00:30:20.000Z')
  });
  const second = findDueScheduleSlot({
    settings,
    now: new Date('2026-10-25T01:30:20.000Z')
  });

  assert.equal(first.key, 'weekly:2026-10-25:02:30:Europe/Berlin');
  assert.equal(second.key, first.key);
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

test('ein fälliger Scheduler-Tick enqueued mit kanonischem Idempotenzschlüssel', async () => {
  const enqueued = [];
  const result = await runContentSchedulerTick({
    getSettings: async () => berlinSettings,
    enqueueJob: async (input) => { enqueued.push(input); return { id: 41, ...input }; },
    updateSchedulerState: async () => {},
    now: () => new Date('2026-07-13T16:02:20.000Z')
  });

  assert.equal(result.id, 41);
  assert.deepEqual(enqueued, [{
    jobType: 'generate_weekly_draft',
    idempotencyKey: 'weekly:2026-07-13:18:00:Europe/Berlin',
    payload: {
      source: 'weekly-schedule',
      schedule_slot: 'weekly:2026-07-13:18:00:Europe/Berlin'
    },
    maxAttempts: 3
  }]);
});

test('ein fehlgeschlagener Scheduler-Tick persistiert einen knappen Fehlerzustand und wirft weiter', async () => {
  const states = [];
  const failure = new Error('Datenbank vorübergehend nicht erreichbar');
  await assert.rejects(runContentSchedulerTick({
    getSettings: async () => berlinSettings,
    enqueueJob: async () => { throw failure; },
    updateSchedulerState: async (state) => { states.push(state); },
    now: () => new Date('2026-07-13T16:00:20.000Z')
  }), failure);

  assert.equal(states.length, 2);
  assert.equal(states[0].lastSchedulerError, null);
  assert.equal(states[1].lastScheduledSlot, 'weekly:2026-07-13:18:00:Europe/Berlin');
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
