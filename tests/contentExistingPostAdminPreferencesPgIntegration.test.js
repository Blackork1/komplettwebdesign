import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

import { createContentAgentAdminRepository } from '../repositories/contentAgentAdminRepository.js';
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

const completeZeroWindow = {
  28: {
    complete: true,
    coverageDayCount: 28,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    averagePosition: 0
  }
};

test('echtes PostgreSQL: Null-Impressions-Ausblendung bleibt idempotent und leistungsabhängig', {
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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const [performanceMigration, preferenceMigration] = await Promise.all([
      readFile(new URL('../scripts/migrations/013_create_article_performance_learning.sql', import.meta.url), 'utf8'),
      readFile(new URL('../scripts/migrations/014_create_existing_content_admin_preferences.sql', import.meta.url), 'utf8')
    ]);
    await pool.query(performanceMigration);
    await pool.query(preferenceMigration);

    const post = (await pool.query(`
      INSERT INTO posts (title, slug, published)
      VALUES ('Ohne Impressionen', 'ohne-impressionen', TRUE)
      RETURNING id
    `)).rows[0];
    await pool.query(`
      INSERT INTO content_article_performance_snapshots (
        post_id, evaluated_through_date, article_age_days, windows_json,
        status, evidence_hash
      ) VALUES ($1, '2026-07-13', 40, $2::jsonb, 'stable', $3)
    `, [post.id, JSON.stringify(completeZeroWindow), 'a'.repeat(64)]);

    const repository = createContentAgentAdminRepository(pool);
    assert.deepEqual(
      await repository.setExistingContentZeroImpressionHidden({ postId: post.id, hidden: true }),
      { status: 'updated' }
    );
    assert.equal((await pool.query(`
      SELECT hidden_from_zero_impression_list
      FROM content_existing_post_admin_preferences
      WHERE post_id = $1
    `, [post.id])).rows[0].hidden_from_zero_impression_list, true);

    assert.deepEqual(
      await repository.setExistingContentZeroImpressionHidden({ postId: post.id, hidden: true }),
      { status: 'updated' }
    );
    assert.equal((await pool.query(`
      SELECT COUNT(*)::integer AS count
      FROM content_existing_post_admin_preferences
      WHERE post_id = $1
    `, [post.id])).rows[0].count, 1);

    await pool.query(`
      INSERT INTO content_article_performance_snapshots (
        post_id, evaluated_through_date, article_age_days, windows_json,
        status, evidence_hash
      ) VALUES ($1, '2026-07-14', 41, $2::jsonb, 'stable', $3)
    `, [
      post.id,
      JSON.stringify({
        28: { ...completeZeroWindow[28], impressions: 1 }
      }),
      'b'.repeat(64)
    ]);
    assert.deepEqual(
      await repository.setExistingContentZeroImpressionHidden({ postId: post.id, hidden: true }),
      { status: 'not_eligible' }
    );

    await pool.query('DELETE FROM posts WHERE id = $1', [post.id]);
    assert.equal((await pool.query(`
      SELECT COUNT(*)::integer AS count
      FROM content_existing_post_admin_preferences
    `)).rows[0].count, 0);
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
