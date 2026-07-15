import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentArticlePerformanceRepository } from '../repositories/contentArticlePerformanceRepository.js';

function createQueryRecorder(responses = []) {
  const calls = [];
  let responseIndex = 0;

  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      const response = responses[responseIndex] || { rows: [] };
      responseIndex += 1;
      return response;
    }
  };
}

function validSnapshot(overrides = {}) {
  return {
    postId: 7,
    evaluatedThroughDate: '2026-07-14',
    articleAgeDays: 31,
    windows: {
      7: { impressions: 10 },
      14: { impressions: 25 },
      28: { impressions: 60 }
    },
    previousWindows: {},
    cohort: {},
    status: 'stable',
    diagnoses: [],
    positiveSignals: [],
    dataEligible: true,
    learningEligible: false,
    evidenceHash: 'a'.repeat(64),
    explanationStatus: 'not_needed',
    ...overrides
  };
}

test('Repository lehnt unbekannte Ereignistypen und ungültige Hashes ab', async () => {
  const repository = createContentArticlePerformanceRepository({
    async query() {
      assert.fail('Ungültige Daten dürfen kein SQL ausführen.');
    }
  });

  await assert.rejects(
    repository.recordArticleEvent({ postId: 7, eventType: 'page_view', eventKeyHash: 'x' }),
    /Ereignistyp/
  );
  await assert.rejects(
    repository.recordArticleEvent({ postId: 7, eventType: 'cta_click', eventKeyHash: 'x' }),
    /Ereignishash/
  );
});

test('Snapshot verlangt 7-, 14- und 28-Tage-Fenster', async () => {
  const repository = createContentArticlePerformanceRepository({
    async query() {
      assert.fail('Unvollständige Snapshots dürfen kein SQL ausführen.');
    }
  });

  await assert.rejects(
    repository.upsertPerformanceSnapshot(validSnapshot({ windows: { 7: {} } })),
    /7, 14 und 28/
  );
});

test('Ereignisse werden idempotent gespeichert', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 17 }] }]);
  const repository = createContentArticlePerformanceRepository(db);

  const result = await repository.recordArticleEvent({
    postId: 7,
    eventType: 'cta_click',
    occurredAt: '2026-07-14T12:00:00.000Z',
    ctaLocation: 'blog_final',
    ctaTarget: '/kontakt',
    eventKeyHash: 'b'.repeat(64)
  });

  assert.deepEqual(result, { id: 17 });
  assert.match(db.calls[0].sql, /ON CONFLICT \(event_key_hash\) DO NOTHING/i);
  assert.deepEqual(db.calls[0].params, [
    7,
    'cta_click',
    '2026-07-14T12:00:00.000Z',
    'blog_final',
    '/kontakt',
    'b'.repeat(64)
  ]);
});

test('Snapshots behalten Erklärungen bei unveränderter Evidenz', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 23 }] }]);
  const repository = createContentArticlePerformanceRepository(db);

  await repository.upsertPerformanceSnapshot(validSnapshot());

  assert.match(db.calls[0].sql, /ON CONFLICT \(post_id, evaluated_through_date\) DO UPDATE/i);
  assert.match(db.calls[0].sql, /evidence_hash = EXCLUDED\.evidence_hash/i);
  assert.match(db.calls[0].sql, /THEN content_article_performance_snapshots\.explanation_json/i);
});

test('Neueste Snapshots können einzeln und gebündelt gelesen werden', async () => {
  const db = createQueryRecorder([
    { rows: [{ postId: 7 }] },
    { rows: [{ postId: 7 }, { postId: 8 }] }
  ]);
  const repository = createContentArticlePerformanceRepository(db);

  assert.deepEqual(await repository.getLatestSnapshot(7), { postId: 7 });
  assert.deepEqual(await repository.listLatestSnapshots([7, 8]), [
    { postId: 7 },
    { postId: 8 }
  ]);

  assert.match(db.calls[0].sql, /ORDER BY evaluated_through_date DESC LIMIT 1/i);
  assert.match(db.calls[1].sql, /DISTINCT ON \(post_id\)/i);
  assert.deepEqual(db.calls[1].params, [[7, 8]]);
});

test('Performance-Eingaben werden nur für veröffentlichte Artikel bis zum Stichtag geladen', async () => {
  const rows = [{ postId: 7, publishedAt: '2026-06-01T10:00:00.000Z' }];
  const db = createQueryRecorder([{ rows }]);
  const repository = createContentArticlePerformanceRepository(db);

  const result = await repository.getPerformanceInputs({
    evaluatedThroughDate: '2026-07-14'
  });

  assert.deepEqual(result, rows);
  assert.deepEqual(db.calls[0].params, ['2026-07-14']);
  assert.match(db.calls[0].sql, /FROM posts p/i);
  assert.match(db.calls[0].sql, /p\.published = TRUE/i);
  assert.match(db.calls[0].sql, /content_search_metrics/i);
  assert.match(db.calls[0].sql, /content_article_events/i);
});

test('Alte anonyme Ereignisse können mit einem ISO-Datum entfernt werden', async () => {
  const db = createQueryRecorder([{ rows: [{ id: 1 }, { id: 2 }] }]);
  const repository = createContentArticlePerformanceRepository(db);

  const result = await repository.pruneArticleEvents({ beforeDate: '2026-01-01' });

  assert.equal(result, 2);
  assert.match(db.calls[0].sql, /DELETE FROM content_article_events/i);
  assert.deepEqual(db.calls[0].params, ['2026-01-01']);
});
