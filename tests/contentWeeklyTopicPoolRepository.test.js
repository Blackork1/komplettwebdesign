import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentWeeklyTopicPoolRepository } from '../repositories/contentWeeklyTopicPoolRepository.js';

function createDb(responses = []) {
  const calls = [];
  let index = 0;
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return responses[index++] || { rows: [] };
    }
  };
}

const poolRow = {
  id: 7,
  week_start: '2026-07-13',
  timezone: 'Europe/Berlin',
  candidates_json: [{ slug: 'aktuelles-webdesign', topic: 'Aktuelles Webdesign' }],
  source_references_json: [
    { title: 'Quelle', url: 'https://example.com/quelle' },
    { title: 'Zweite Quelle', url: 'https://example.org/zweite-quelle' }
  ],
  response_id: 'response-1',
  prompt_version: '2026-07-14.1',
  created_at: '2026-07-14T12:00:00.000Z'
};

const attemptRow = {
  week_start: '2026-07-13',
  timezone: 'Europe/Berlin',
  owner_generation_run_id: 41,
  status: 'reserved',
  response_id: null,
  error_code: null,
  created_at: '2026-07-14T12:00:00.000Z',
  updated_at: '2026-07-14T12:00:00.000Z'
};

test('Wochenpool wird eindeutig angelegt und mit seinen Beanspruchungen zurückgegeben', async () => {
  const db = createDb([
    { rows: [poolRow] },
    { rows: [{ candidate_slug: 'anderes-thema', generation_run_id: 8, selected_at: 'jetzt' }] }
  ]);
  const repository = createContentWeeklyTopicPoolRepository(db);

  const result = await repository.createPool({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin',
    candidates: poolRow.candidates_json,
    sourceReferences: poolRow.source_references_json,
    responseId: 'response-1',
    promptVersion: '2026-07-14.1'
  });

  assert.match(db.calls[0].sql, /ON CONFLICT \(week_start, timezone\) DO NOTHING/i);
  assert.doesNotMatch(db.calls[0].sql, /UNION ALL/i);
  assert.deepEqual(db.calls[0].params, [
    '2026-07-13',
    'Europe/Berlin',
    JSON.stringify(poolRow.candidates_json),
    JSON.stringify(poolRow.source_references_json),
    'response-1',
    '2026-07-14.1'
  ]);
  assert.equal(result.id, 7);
  assert.deepEqual(result.candidates, poolRow.candidates_json);
  assert.deepEqual(result.selections, [{
    candidateSlug: 'anderes-thema',
    generationRunId: 8,
    selectedAt: 'jetzt'
  }]);
});

test('Wochenpool liest einen parallel angelegten Konfliktdatensatz in einer neuen Abfrage', async () => {
  const db = createDb([
    { rows: [] },
    { rows: [poolRow] },
    { rows: [] }
  ]);
  const repository = createContentWeeklyTopicPoolRepository(db);

  const result = await repository.createPool({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin',
    candidates: poolRow.candidates_json,
    sourceReferences: poolRow.source_references_json,
    promptVersion: '2026-07-14.1'
  });

  assert.equal(db.calls.length, 3);
  assert.match(db.calls[0].sql, /^INSERT INTO content_weekly_topic_pools/i);
  assert.match(db.calls[1].sql, /^SELECT \*/i);
  assert.deepEqual(db.calls[1].params, ['2026-07-13', 'Europe/Berlin']);
  assert.equal(result.id, 7);
});

test('wochenweiter Erstellungs-Lock umschließt den Callback und wird zuverlässig freigegeben', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [] };
    },
    release(error) { calls.push({ release: true, error }); }
  };
  const db = {
    async query() { assert.fail('Der Pool-Client muss für den Lock verwendet werden.'); },
    async connect() { calls.push({ connect: true }); return client; }
  };
  const repository = createContentWeeklyTopicPoolRepository(db);

  const result = await repository.withPoolCreationLock({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin'
  }, async (lockedRepository) => {
    calls.push({ callback: true });
    assert.equal(typeof lockedRepository.findPool, 'function');
    return 'erstellt';
  });

  assert.equal(result, 'erstellt');
  assert.deepEqual(calls.map((entry) => (
    entry.connect ? 'connect'
      : entry.callback ? 'callback'
        : entry.release ? 'release'
          : /advisory_unlock/i.test(entry.sql) ? 'unlock'
            : /advisory_lock/i.test(entry.sql) ? 'lock'
              : 'query'
  )), ['connect', 'lock', 'callback', 'unlock', 'release']);
  assert.deepEqual(calls[1].params, ['2026-07-13|Europe/Berlin']);
  assert.deepEqual(calls[3].params, ['2026-07-13|Europe/Berlin']);
});

test('wochenweiter Erstellungs-Lock wird auch nach einem Callback-Fehler freigegeben', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [] };
    },
    release(error) { calls.push({ release: true, error }); }
  };
  const db = {
    async query() { return { rows: [] }; },
    async connect() { return client; }
  };
  const repository = createContentWeeklyTopicPoolRepository(db);

  await assert.rejects(
    repository.withPoolCreationLock({
      weekStart: '2026-07-13',
      timezone: 'Europe/Berlin'
    }, async () => {
      throw new Error('Provider fehlgeschlagen');
    }),
    /Provider fehlgeschlagen/
  );

  assert.match(calls[1].sql, /advisory_unlock/i);
  assert.equal(calls[2].release, true);
  assert.equal(calls[2].error, undefined);
});

test('dauerhafter Rechercheversuch wird atomar beansprucht und blockiert einen anderen Lauf', async () => {
  const ownDb = createDb([{ rows: [] }, { rows: [attemptRow] }]);
  const ownRepository = createContentWeeklyTopicPoolRepository(ownDb);
  const own = await ownRepository.claimResearchAttempt({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin',
    generationRunId: 41
  });

  assert.equal(own.acquired, true);
  assert.equal(own.ownerGenerationRunId, 41);
  assert.match(ownDb.calls[0].sql, /ON CONFLICT \(week_start, timezone\) DO NOTHING/i);
  assert.match(ownDb.calls[1].sql, /FROM content_weekly_topic_research_attempts/i);

  const otherDb = createDb([{ rows: [] }, { rows: [{ ...attemptRow, owner_generation_run_id: 42 }] }]);
  const otherRepository = createContentWeeklyTopicPoolRepository(otherDb);
  const other = await otherRepository.claimResearchAttempt({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin',
    generationRunId: 41
  });

  assert.equal(other.acquired, false);
  assert.equal(other.ownerGenerationRunId, 42);
});

test('Rechercheversuch wird nur vom Eigentümer abgeschlossen oder nach sicherem Fehler freigegeben', async () => {
  const markedRow = {
    ...attemptRow,
    status: 'needs_manual_attention',
    error_code: 'weekly_topic_pool_invalid'
  };
  const markDb = createDb([{ rows: [markedRow] }]);
  const markRepository = createContentWeeklyTopicPoolRepository(markDb);
  const marked = await markRepository.markResearchAttempt({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin',
    generationRunId: 41,
    status: 'needs_manual_attention',
    errorCode: 'weekly_topic_pool_invalid'
  });

  assert.equal(marked.status, 'needs_manual_attention');
  assert.match(markDb.calls[0].sql, /owner_generation_run_id = \$3/i);

  const releaseDb = createDb([{ rows: [{ owner_generation_run_id: 41 }] }]);
  const releaseRepository = createContentWeeklyTopicPoolRepository(releaseDb);
  assert.equal(await releaseRepository.releaseResearchAttempt({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin',
    generationRunId: 41
  }), true);
  assert.match(releaseDb.calls[0].sql, /DELETE FROM content_weekly_topic_research_attempts/i);
  assert.match(releaseDb.calls[0].sql, /status = 'reserved'/i);
});

test('bestehender Wochenpool wird mit parametrisierter Kalenderwoche gelesen', async () => {
  const db = createDb([{ rows: [poolRow] }, { rows: [] }]);
  const repository = createContentWeeklyTopicPoolRepository(db);

  const result = await repository.findPool({
    weekStart: '2026-07-13',
    timezone: 'Europe/Berlin'
  });

  assert.deepEqual(db.calls[0].params, ['2026-07-13', 'Europe/Berlin']);
  assert.equal(result.weekStart, '2026-07-13');
  assert.deepEqual(result.selections, []);
});

test('Kandidatenbeanspruchung ist für denselben Lauf idempotent und für andere Läufe gesperrt', async () => {
  const insertedDb = createDb([{ rows: [{ candidate_slug: 'aktuelles-webdesign' }] }]);
  const insertedRepository = createContentWeeklyTopicPoolRepository(insertedDb);
  assert.equal(await insertedRepository.claimCandidate({
    poolId: 7,
    candidateSlug: 'aktuelles-webdesign',
    generationRunId: 41
  }), true);
  assert.match(insertedDb.calls[0].sql, /ON CONFLICT \(pool_id, candidate_slug\) DO NOTHING/i);

  const sameRunDb = createDb([{ rows: [] }, { rows: [{ generation_run_id: 41 }] }]);
  const sameRunRepository = createContentWeeklyTopicPoolRepository(sameRunDb);
  assert.equal(await sameRunRepository.claimCandidate({
    poolId: 7,
    candidateSlug: 'aktuelles-webdesign',
    generationRunId: 41
  }), true);

  const otherRunDb = createDb([{ rows: [] }, { rows: [{ generation_run_id: 42 }] }]);
  const otherRunRepository = createContentWeeklyTopicPoolRepository(otherRunDb);
  assert.equal(await otherRunRepository.claimCandidate({
    poolId: 7,
    candidateSlug: 'aktuelles-webdesign',
    generationRunId: 41
  }), false);
});

test('Repository lehnt unsichere Identifikatoren und JSON-Werte ohne Abfrage ab', async () => {
  const db = createDb();
  const repository = createContentWeeklyTopicPoolRepository(db);

  await assert.rejects(
    repository.findPool({ weekStart: '14.07.2026', timezone: 'Europe/Berlin' }),
    /weekStart/i
  );
  await assert.rejects(
    repository.claimCandidate({ poolId: 7, candidateSlug: '../falsch', generationRunId: 41 }),
    /candidateSlug/i
  );
  await assert.rejects(
    repository.createPool({
      weekStart: '2026-07-13',
      timezone: 'Europe/Berlin',
      candidates: [{ slug: 'gueltig' }],
      sourceReferences: [{ title: 'Nur eine Quelle', url: 'https://example.com/a' }],
      promptVersion: '2026-07-14.1'
    }),
    /sourceReferences/i
  );
  await assert.rejects(
    repository.createPool({
      weekStart: '2026-07-13',
      timezone: 'Europe/Berlin',
      candidates: [{ unsafe() {} }],
      sourceReferences: poolRow.source_references_json,
      promptVersion: '2026-07-14.1'
    }),
    /JSON/i
  );
  assert.equal(db.calls.length, 0);
});

test('Repository lehnt Proxy-JSON ab, ohne dessen Fallen auszuführen', async () => {
  let executed = false;
  const proxy = new Proxy({}, {
    ownKeys() {
      executed = true;
      return [];
    }
  });
  const db = createDb();
  const repository = createContentWeeklyTopicPoolRepository(db);

  await assert.rejects(
    repository.createPool({
      weekStart: '2026-07-13',
      timezone: 'Europe/Berlin',
      candidates: [proxy],
      sourceReferences: poolRow.source_references_json,
      promptVersion: '2026-07-14.1'
    }),
    /JSON/i
  );

  assert.equal(executed, false);
  assert.equal(db.calls.length, 0);
});
