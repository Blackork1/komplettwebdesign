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
      )
    `);
    const migration = await readFile(
      new URL('../scripts/migrations/013_create_article_performance_learning.sql', import.meta.url),
      'utf8'
    );
    await pool.query(migration);
    const post = (await pool.query(`
      INSERT INTO posts (title, slug, published, published_at)
      VALUES ('Performance', 'performance', TRUE, '2026-06-01T10:00:00Z')
      RETURNING id
    `)).rows[0];
    const repository = createContentArticlePerformanceRepository(pool);
    const event = {
      postId: post.id,
      eventType: 'cta_click',
      occurredAt: '2026-07-14T10:00:00Z',
      ctaLocation: 'blog_final',
      ctaTarget: '/kontakt',
      eventKeyHash: 'c'.repeat(64)
    };

    const firstEvent = await repository.recordArticleEvent(event);
    const duplicateEvent = await repository.recordArticleEvent(event);
    assert.ok(firstEvent?.id);
    assert.equal(duplicateEvent, null);

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
      positiveSignals: [{ code: 'growing_visibility' }]
    });
    assert.equal(firstSnapshot.id, repeatedSnapshot.id);
    assert.deepEqual(repeatedSnapshot.positive_signals_json, [{ code: 'growing_visibility' }]);
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
