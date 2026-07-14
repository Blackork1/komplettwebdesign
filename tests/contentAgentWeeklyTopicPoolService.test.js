import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getWeeklyTopicPoolIdentity,
  listAvailableWeeklyCandidates,
  findWeeklyCandidateForRun
} from '../services/contentAgent/weeklyTopicPoolService.js';

const candidates = [
  { slug: 'thema-eins', topic: 'Thema eins' },
  { slug: 'thema-zwei', topic: 'Thema zwei' },
  { slug: 'thema-drei', topic: 'Thema drei' }
];

test('Wochenidentität beginnt in Europe/Berlin am Montag und bleibt bis Sonntag stabil', () => {
  assert.deepEqual(
    getWeeklyTopicPoolIdentity({ currentDate: '2026-07-14', timezone: 'Europe/Berlin' }),
    { weekStart: '2026-07-13', timezone: 'Europe/Berlin' }
  );
  assert.deepEqual(
    getWeeklyTopicPoolIdentity({ currentDate: '2026-07-19', timezone: 'Europe/Berlin' }),
    { weekStart: '2026-07-13', timezone: 'Europe/Berlin' }
  );
  assert.deepEqual(
    getWeeklyTopicPoolIdentity({ currentDate: '2026-07-20', timezone: 'Europe/Berlin' }),
    { weekStart: '2026-07-20', timezone: 'Europe/Berlin' }
  );
});

test('bereits beanspruchte Kandidaten werden ausgeschlossen, die Auswahl eines Retries bleibt aber auffindbar', () => {
  const pool = {
    candidates,
    selections: [
      { candidateSlug: 'thema-eins', generationRunId: 41 },
      { candidateSlug: 'thema-zwei', generationRunId: 42 }
    ]
  };

  assert.deepEqual(listAvailableWeeklyCandidates(pool), [candidates[2]]);
  assert.deepEqual(findWeeklyCandidateForRun(pool, 42), candidates[1]);
  assert.equal(findWeeklyCandidateForRun(pool, 99), null);
});

test('ungültige Zeitzonen und Lauf-IDs werden vor der Verarbeitung abgelehnt', () => {
  assert.throws(
    () => getWeeklyTopicPoolIdentity({ currentDate: '2026-07-14', timezone: 'Unbekannt/Berlin' }),
    /Zeitzone/i
  );
  assert.throws(
    () => findWeeklyCandidateForRun({ candidates, selections: [] }, '42'),
    /generationRunId/i
  );
});
