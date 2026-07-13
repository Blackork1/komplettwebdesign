import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentSearchMetricsRepository } from '../repositories/contentSearchMetricsRepository.js';

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

test('Blogzuordnung fragt ausschließlich kanonische ASCII-Blogslugs ab', async () => {
  const db = createQueryRecorder([{
    rows: [
      { id: 41, slug: 'technisches-seo' },
      { id: 42, slug: 'webdesign-2026' }
    ]
  }]);
  const repository = createContentSearchMetricsRepository(db);

  const result = await repository.findPostIdsByCanonicalPaths([
    '/blog/technisches-seo',
    '/leistungen/webdesign',
    '/blog/webdesign-2026',
    '/blog/technisches-seo',
    '/blog/Technisches-SEO',
    '/blog/ueber-uns/',
    '/blog/zwei/segmente',
    '/blog/kein--kanonischer-slug',
    '/blog/ümlaut'
  ]);

  assert.deepEqual([...result], [
    ['/blog/technisches-seo', 41],
    ['/blog/webdesign-2026', 42]
  ]);
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /SELECT id, slug FROM posts WHERE slug = ANY\(\$1::text\[\]\)/i);
  assert.deepEqual(db.calls[0].params, [['technisches-seo', 'webdesign-2026']]);
});

test('Nicht-Blogpfade lösen keine Datenbankabfrage aus', async () => {
  const db = createQueryRecorder();
  const repository = createContentSearchMetricsRepository(db);

  const result = await repository.findPostIdsByCanonicalPaths([
    '/',
    '/leistungen',
    '/blog',
    '/blog/',
    null
  ]);

  assert.deepEqual([...result], []);
  assert.equal(db.calls.length, 0);
});

test('Suchmetriken werden gebündelt und idempotent gespeichert', async () => {
  const persistedRows = [{ id: 91 }, { id: 92 }];
  const db = createQueryRecorder([{ rows: persistedRows }]);
  const repository = createContentSearchMetricsRepository(db);
  const rows = [
    {
      postId: 41,
      metricDate: '2026-07-01',
      pageUrl: 'https://komplettwebdesign.de/blog/technisches-seo',
      query: 'technisches seo',
      device: 'DESKTOP',
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      averagePosition: 8.5
    },
    {
      postId: null,
      metricDate: '2026-07-02',
      pageUrl: 'https://komplettwebdesign.de/leistungen',
      query: '',
      device: 'MOBILE',
      clicks: 1,
      impressions: 40,
      ctr: 0.025,
      averagePosition: 12.25
    }
  ];

  const result = await repository.upsertSearchMetrics(rows);

  assert.deepEqual(result, persistedRows);
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /INSERT INTO content_search_metrics/i);
  assert.match(
    db.calls[0].sql,
    /ON CONFLICT \(metric_date, page_url, query, device\) DO UPDATE/i
  );
  assert.match(
    db.calls[0].sql,
    /post_id\s*=\s*COALESCE\(EXCLUDED\.post_id, content_search_metrics\.post_id\)/i
  );
  assert.match(db.calls[0].sql, /fetched_at\s*=\s*NOW\(\)/i);
  assert.deepEqual(db.calls[0].params, [
    [41, null],
    ['2026-07-01', '2026-07-02'],
    [
      'https://komplettwebdesign.de/blog/technisches-seo',
      'https://komplettwebdesign.de/leistungen'
    ],
    ['technisches seo', ''],
    ['DESKTOP', 'MOBILE'],
    [3, 1],
    [120, 40],
    [0.025, 0.025],
    [8.5, 12.25]
  ]);
});

test('Leere Suchmetriken überspringen die Schreibabfrage', async () => {
  const db = createQueryRecorder();
  const repository = createContentSearchMetricsRepository(db);

  const result = await repository.upsertSearchMetrics([]);

  assert.deepEqual(result, []);
  assert.equal(db.calls.length, 0);
});

test('Aggregation berechnet CTR aus Summen und Position impressionsgewichtet', async () => {
  const aggregateRows = [{
    postId: 41,
    pageUrl: 'https://komplettwebdesign.de/blog/technisches-seo',
    query: 'technisches seo',
    clicks: 10,
    impressions: 500,
    ctr: 0.02,
    averagePosition: 9.2
  }];
  const db = createQueryRecorder([{ rows: aggregateRows }]);
  const repository = createContentSearchMetricsRepository(db);

  const result = await repository.listAggregatedMetrics({
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    limit: 25
  });

  assert.deepEqual(result, aggregateRows);
  assert.deepEqual(db.calls[0].params, ['2026-06-01', '2026-06-30', 25]);
  assert.match(db.calls[0].sql, /SUM\(clicks\)/i);
  assert.match(db.calls[0].sql, /SUM\(impressions\)/i);
  assert.match(
    db.calls[0].sql,
    /SUM\(clicks\)\s*\/\s*NULLIF\(SUM\(impressions\),\s*0\)/i
  );
  assert.match(
    db.calls[0].sql,
    /SUM\(average_position\s*\*\s*impressions\)\s*\/\s*NULLIF\(SUM\(impressions\),\s*0\)/i
  );
  assert.match(db.calls[0].sql, /GROUP BY post_id, page_url, query/i);
  assert.match(db.calls[0].sql, /LIMIT \$3/i);
});

test('Aggregation ohne Limit lässt die serverseitige Begrenzung weg', async () => {
  const db = createQueryRecorder();
  const repository = createContentSearchMetricsRepository(db);

  await repository.listAggregatedMetrics({
    startDate: '2026-06-01',
    endDate: '2026-06-30'
  });

  assert.deepEqual(db.calls[0].params, ['2026-06-01', '2026-06-30']);
  assert.doesNotMatch(db.calls[0].sql, /\bLIMIT\b/i);
});
