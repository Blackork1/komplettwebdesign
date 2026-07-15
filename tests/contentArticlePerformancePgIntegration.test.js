import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

import { createContentArticlePerformanceRepository } from '../repositories/contentArticlePerformanceRepository.js';
import {
  createContentAgentPgTestSchemaName,
  evaluateContentAgentPgResetGuard
} from './helpers/contentAgentPostgresTestGuard.js';

const connectionString = process.env.CONTENT_AGENT_PG_TEST_URL;
const resetGuard = evaluateContentAgentPgResetGuard({
  connectionString,
  allowReset: process.env.CONTENT_AGENT_PG_TEST_ALLOW_RESET === 'true',
  resetToken: process.env.CONTENT_AGENT_PG_TEST_TOKEN
});

test('echtes PostgreSQL: Artikelereignisse und Snapshots bleiben idempotent', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  const schemaName = createContentAgentPgTestSchemaName();
  const adminPool = new pg.Pool({ connectionString, statement_timeout: 5_000, query_timeout: 7_000 });
  let pool;
  let schemaCreated = false;

  try {
    await adminPool.query(`CREATE SCHEMA "${schemaName}"`);
    schemaCreated = true;
    pool = new pg.Pool({
      connectionString,
      options: `-c search_path=${schemaName},pg_catalog`,
      statement_timeout: 5_000,
      query_timeout: 7_000
    });
    await pool.query(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        published BOOLEAN NOT NULL DEFAULT TRUE,
        published_at TIMESTAMPTZ
      );
      CREATE TABLE content_post_metadata (
        post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
        content_cluster TEXT NOT NULL
      );
      CREATE TABLE content_search_metric_sync_days (
        metric_date DATE PRIMARY KEY,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const [metricsMigration, performanceMigration] = await Promise.all([
      readFile(new URL('../scripts/migrations/007_create_content_search_metrics.sql', import.meta.url), 'utf8'),
      readFile(new URL('../scripts/migrations/013_create_article_performance_learning.sql', import.meta.url), 'utf8')
    ]);
    await pool.query(metricsMigration);
    await pool.query(performanceMigration);
    const post = (await pool.query(`
      INSERT INTO posts (title, slug, published, published_at)
      VALUES ('Performance', 'performance', TRUE, '2026-06-01T10:00:00Z')
      RETURNING id
    `)).rows[0];
    await pool.query(`
      INSERT INTO content_post_metadata (post_id, content_cluster)
      VALUES ($1, 'webdesign')
    `, [post.id]);
    const candidates = (await pool.query(`
      INSERT INTO posts (title, slug, published, published_at)
      VALUES
        ('Kohorte 1', 'kohorte-1', TRUE, '2026-06-01T10:00:00Z'),
        ('Kohorte 2', 'kohorte-2', TRUE, '2026-06-01T10:00:00Z'),
        ('Kohorte 3', 'kohorte-3', TRUE, '2026-06-01T10:00:00Z'),
        ('Kohorte 4', 'kohorte-4', TRUE, '2026-06-01T10:00:00Z')
      RETURNING id
    `)).rows;
    for (const candidate of candidates) {
      await pool.query(`
        INSERT INTO content_post_metadata (post_id, content_cluster)
        VALUES ($1, 'webdesign')
      `, [candidate.id]);
    }
    await pool.query(`
      INSERT INTO content_search_metric_sync_days (metric_date)
      SELECT day::date
      FROM generate_series('2026-05-18'::date, '2026-07-12'::date, '1 day') day
      ON CONFLICT DO NOTHING
    `);
    await pool.query(`
      INSERT INTO content_search_metrics (
        post_id, metric_date, page_url, query, device,
        clicks, impressions, ctr, average_position
      )
      SELECT $1::integer, day::date, 'https://www.komplettwebdesign.de/blog/performance',
             'alpha', 'DESKTOP', 1, 10, 0.1, 10
      FROM generate_series('2026-06-15'::date, '2026-07-12'::date, '1 day') day
      UNION ALL
      SELECT $1::integer, day::date, 'https://www.komplettwebdesign.de/blog/performance',
             'beta', 'MOBILE', 0, 5, 0, 20
      FROM generate_series('2026-06-15'::date, '2026-07-12'::date, '1 day') day
      UNION ALL
      SELECT $1::integer, day::date, 'https://www.komplettwebdesign.de/blog/performance',
             'vorher', 'DESKTOP', 0, 2, 0, 30
      FROM generate_series('2026-05-18'::date, '2026-06-14'::date, '1 day') day
    `, [post.id]);
    for (let index = 0; index < candidates.length; index += 1) {
      await pool.query(`
        INSERT INTO content_search_metrics (
          post_id, metric_date, page_url, query, device,
          clicks, impressions, ctr, average_position
        ) VALUES ($1, '2026-07-12', $2, 'kohorte', 'ALL', 1, $3, 0.01, 15)
      `, [
        candidates[index].id,
        `https://www.komplettwebdesign.de/blog/kohorte-${index + 1}`,
        (index + 1) * 200
      ]);
    }
    const repository = createContentArticlePerformanceRepository(pool);
    const event = {
      postId: post.id,
      eventType: 'cta_click',
      occurredAt: '2026-07-12T10:00:00Z',
      ctaLocation: 'blog_final',
      ctaTarget: '/kontakt',
      eventKeyHash: 'c'.repeat(64)
    };

    const firstEvent = await repository.recordArticleEvent(event);
    const duplicateEvent = await repository.recordArticleEvent(event);
    assert.ok(firstEvent?.id);
    assert.equal(duplicateEvent, null);
    await repository.recordArticleEvent({
      ...event,
      eventType: 'contact_submit',
      eventKeyHash: 'e'.repeat(64)
    });

    const inputs = await repository.getPerformanceInputs({
      postId: post.id,
      evaluatedThroughDate: '2026-07-12'
    });
    assert.equal(inputs.current['28'].coverageDayCount, 28);
    assert.equal(inputs.current['28'].complete, true);
    assert.equal(inputs.current['28'].impressions, 420);
    assert.equal(inputs.current['28'].clicks, 28);
    assert.ok(Math.abs(inputs.current['28'].averagePosition - (400 / 30)) < 0.001);
    assert.equal(inputs.current['28'].ctaClicks, 1);
    assert.equal(inputs.current['28'].contactSubmits, 1);
    assert.equal(inputs.previous['28'].impressions, 56);
    assert.equal(inputs.current['28'].queries.length, 2);
    assert.equal(inputs.cohort.available, true);
    assert.equal(inputs.cohort.source, 'cluster');
    assert.equal(inputs.cohort.size, 4);
    assert.equal(inputs.cohort.medianImpressions, 500);

    const snapshot = {
      postId: post.id,
      evaluatedThroughDate: '2026-07-14',
      articleAgeDays: 43,
      windows: { 7: {}, 14: {}, 28: {} },
      status: 'stable',
      evidenceHash: 'd'.repeat(64)
    };
    const firstSnapshot = await repository.upsertPerformanceSnapshot(snapshot);
    const repeatedSnapshot = await repository.upsertPerformanceSnapshot({
      ...snapshot,
      positiveSignals: [{ code: 'ctr_improved' }]
    });
    assert.equal(firstSnapshot.id, repeatedSnapshot.id);
    assert.deepEqual(repeatedSnapshot.positive_signals_json, [{ code: 'ctr_improved' }]);
  } finally {
    try {
      if (pool) await pool.end();
    } finally {
      try {
        if (schemaCreated) await adminPool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      } finally {
        await adminPool.end();
      }
    }
  }
});
