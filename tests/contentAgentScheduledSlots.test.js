import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPublicationSlot,
  findDueGenerationSlot
} from '../services/contentAgent/contentSchedulerService.js';

function settings(overrides = {}) {
  return {
    agent_enabled: true,
    schedule_weekdays: [1],
    schedule_time: '18:00',
    timezone: 'Europe/Berlin',
    generation_lead_hours: 4,
    maximum_attempts: 3,
    ...overrides
  };
}

test('18:00 Uhr Veröffentlichung mit vier Stunden Vorlauf wird um 14:00 Uhr erzeugt', () => {
  const slot = findDueGenerationSlot({
    settings: settings(),
    now: new Date('2026-07-13T12:00:00.000Z')
  });

  assert.equal(slot.localTime, '18:00');
  assert.equal(slot.publicationAt, '2026-07-13T16:00:00.000Z');
  assert.equal(slot.generationAt, '2026-07-13T12:00:00.000Z');
});

test('der Vorlauf kann in den vorherigen lokalen Tag reichen', () => {
  const slot = buildPublicationSlot({
    settings: settings({ schedule_time: '02:00' }),
    localDate: '2026-07-13'
  });

  assert.equal(slot.publicationAt, '2026-07-13T00:00:00.000Z');
  assert.equal(slot.generationAt, '2026-07-12T20:00:00.000Z');
});

test('eine Uhrzeit in der Sommerzeitlücke verwendet die erste gültige lokale Minute', () => {
  const slot = buildPublicationSlot({
    settings: settings({ schedule_weekdays: [7], schedule_time: '02:30' }),
    localDate: '2026-03-29'
  });

  assert.equal(slot.localTime, '02:30');
  assert.equal(slot.publicationAt, '2026-03-29T01:00:00.000Z');
  assert.equal(slot.generationAt, '2026-03-28T21:00:00.000Z');
});

test('eine doppelte Herbststunde verwendet einen stabilen Slot mit dem früheren Zeitpunkt', () => {
  const slot = buildPublicationSlot({
    settings: settings({ schedule_weekdays: [7], schedule_time: '02:30' }),
    localDate: '2026-10-25'
  });
  const firstTick = findDueGenerationSlot({
    settings: settings({ schedule_weekdays: [7], schedule_time: '02:30', generation_lead_hours: 1 }),
    now: new Date('2026-10-25T00:30:20.000Z')
  });
  const secondTick = findDueGenerationSlot({
    settings: settings({ schedule_weekdays: [7], schedule_time: '02:30', generation_lead_hours: 1 }),
    now: new Date('2026-10-25T01:30:20.000Z')
  });

  assert.equal(slot.publicationAt, '2026-10-25T00:30:00.000Z');
  assert.equal(firstTick.key, 'weekly:2026-10-25:02:30:Europe/Berlin');
  assert.equal(secondTick.key, firstTick.key);
});

test('ein Neustart holt den zuletzt fälligen Slot mitsamt vergangenem Veröffentlichungstermin nach', () => {
  const slot = findDueGenerationSlot({
    settings: settings(),
    now: new Date('2026-07-14T10:00:00.000Z')
  });

  assert.equal(slot.localDate, '2026-07-13');
  assert.equal(slot.generationAt, '2026-07-13T12:00:00.000Z');
  assert.equal(slot.publicationAt, '2026-07-13T16:00:00.000Z');
});

test('ein deaktivierter Agent liefert keinen fälligen Generierungsslot', () => {
  assert.equal(findDueGenerationSlot({
    settings: settings({ agent_enabled: false }),
    now: new Date('2026-07-13T12:00:00.000Z')
  }), null);
});
