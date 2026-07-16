import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import pg from 'pg';

import {
  createContentLegacyMigrationRepository
} from '../repositories/contentLegacyMigrationRepository.js';
import { liveHashForContentPost } from '../services/contentAgent/contentPostLiveState.js';
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

const admin = Object.freeze({ id: 7, username: 'migration-admin' });

function sha256(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

async function createBaseSchema(pool) {
  await pool.query(`
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      content_format VARCHAR(32) NOT NULL DEFAULT 'legacy_ejs',
      meta_title TEXT,
      meta_description TEXT,
      og_title TEXT,
      og_description TEXT,
      faq_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_url TEXT,
      image_alt TEXT,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      workflow_status VARCHAR(32) NOT NULL DEFAULT 'published',
      scheduled_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE content_jobs (
      id BIGSERIAL PRIMARY KEY,
      job_type VARCHAR(80) NOT NULL,
      status VARCHAR(32) NOT NULL,
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE content_post_revisions (
      id BIGSERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id),
      status VARCHAR(32) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function runLegacyMigrationSql(pool) {
  const sql = await readFile(
    new URL('../scripts/migrations/015_create_legacy_content_migrations.sql', import.meta.url),
    'utf8'
  );
  await pool.query(sql);
}

async function insertLegacyPost(pool, suffix) {
  const { rows } = await pool.query(`
    INSERT INTO posts (
      title, slug, excerpt, content, content_format,
      meta_title, meta_description, og_title, og_description,
      faq_json, image_url, image_alt, published, workflow_status,
      published_at, created_at, updated_at
    )
    VALUES (
      $1, $2, 'Kurzbeschreibung', '<section><p>Legacy-Inhalt</p></section>', 'legacy_ejs',
      'Meta-Titel', 'Meta-Beschreibung', 'OG-Titel', 'OG-Beschreibung',
      '[]'::jsonb, '/uploads/legacy.webp', 'Legacy-Beitragsbild', TRUE, 'published',
      '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z',
      '2026-07-16T10:00:00.000Z'
    )
    RETURNING *
  `, [`Legacy ${suffix}`, `legacy-${suffix}`]);
  return rows[0];
}

async function insertReadyMigration(pool, post, candidateHtml = '<section><p>Statischer Inhalt</p></section>') {
  const { rows } = await pool.query(`
    INSERT INTO content_legacy_migrations (
      post_id, status, migration_class, base_live_hash,
      source_content_format, source_content, rendered_static_html,
      render_context_json, analysis_json, blocking_issues_json,
      sanitizer_report_json, created_by
    )
    VALUES (
      $1, 'ready', 'static_legacy', $2,
      'legacy_ejs', $3, $4,
      '{}'::jsonb, $5::jsonb, '[]'::jsonb,
      '{"version":1}'::jsonb, $6
    )
    RETURNING *
  `, [
    post.id,
    liveHashForContentPost(post),
    post.content,
    candidateHtml,
    JSON.stringify({ candidateHash: sha256(candidateHtml) }),
    admin.id
  ]);
  return rows[0];
}

test('echtes PostgreSQL: Legacy-Migration ist atomar, idempotent und rücknehmbar', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  const schemaName = createContentAgentPgTestSchemaName();
  const adminPool = new pg.Pool({
    connectionString,
    statement_timeout: 5_000,
    query_timeout: 7_000
  });
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
    await createBaseSchema(pool);
    await runLegacyMigrationSql(pool);
    await runLegacyMigrationSql(pool);

    assert.equal(
      (await pool.query(`
        SELECT to_regclass('content_legacy_migrations')::text AS relation
      `)).rows[0].relation,
      'content_legacy_migrations'
    );

    const repository = createContentLegacyMigrationRepository(pool);
    const original = await insertLegacyPost(pool, 'grundpfad');
    const originalPublishedAt = new Date(original.published_at).toISOString();
    const migration = await insertReadyMigration(pool, original);

    const migrated = await repository.migrateOne({
      migrationId: migration.id,
      admin
    });
    assert.equal(migrated.status, 'migrated');

    const live = (await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [original.id]
    )).rows[0];
    assert.equal(live.content_format, 'static_html');
    assert.equal(live.slug, original.slug);
    assert.equal(live.published, true);
    assert.equal(new Date(live.published_at).toISOString(), originalPublishedAt);

    const repeated = await repository.migrateOne({
      migrationId: migration.id,
      admin
    });
    assert.equal(repeated.status, 'already_migrated');

    const rolledBack = await repository.rollbackOne({
      migrationId: migration.id,
      admin
    });
    assert.equal(rolledBack.status, 'rolled_back');
    const restored = (await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [original.id]
    )).rows[0];
    assert.equal(restored.content_format, 'legacy_ejs');
    assert.equal(restored.content, original.content);

    const stalePost = await insertLegacyPost(pool, 'stale');
    const staleMigration = await insertReadyMigration(pool, stalePost);
    await pool.query(`
      UPDATE posts
      SET content = '<section><p>Zwischenzeitlich geändert</p></section>',
          updated_at = updated_at + INTERVAL '1 second'
      WHERE id = $1
    `, [stalePost.id]);
    assert.equal((await repository.migrateOne({
      migrationId: staleMigration.id,
      admin
    })).status, 'stale');
    assert.equal((await pool.query(
      'SELECT content_format FROM posts WHERE id = $1',
      [stalePost.id]
    )).rows[0].content_format, 'legacy_ejs');

    const draftPost = await insertLegacyPost(pool, 'draft-konflikt');
    const draftMigration = await insertReadyMigration(pool, draftPost);
    await pool.query(`
      INSERT INTO content_post_revisions (post_id, status)
      VALUES ($1, 'draft')
    `, [draftPost.id]);
    await assert.rejects(repository.migrateOne({
      migrationId: draftMigration.id,
      admin
    }), { code: 'CONTENT_LEGACY_MIGRATION_CONFLICT' });
    assert.equal((await pool.query(
      'SELECT status FROM content_legacy_migrations WHERE id = $1',
      [draftMigration.id]
    )).rows[0].status, 'ready');

    const jobPost = await insertLegacyPost(pool, 'job-konflikt');
    const jobMigration = await insertReadyMigration(pool, jobPost);
    await pool.query(`
      INSERT INTO content_jobs (job_type, status, payload_json)
      VALUES (
        'optimize_existing_post',
        'needs_manual_attention',
        jsonb_build_object('post_id', $1::integer)
      )
    `, [jobPost.id]);
    await assert.rejects(repository.migrateOne({
      migrationId: jobMigration.id,
      admin
    }), { code: 'CONTENT_LEGACY_MIGRATION_CONFLICT' });

    const concurrentPost = await insertLegacyPost(pool, 'parallel');
    const concurrentMigration = await insertReadyMigration(pool, concurrentPost);
    const parallel = await Promise.all([
      repository.migrateOne({ migrationId: concurrentMigration.id, admin }),
      repository.migrateOne({ migrationId: concurrentMigration.id, admin })
    ]);
    assert.deepEqual(
      parallel.map(({ status }) => status).sort(),
      ['already_migrated', 'migrated']
    );
    assert.equal((await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM content_legacy_migrations
      WHERE id = $1 AND status = 'migrated'
    `, [concurrentMigration.id])).rows[0].count, 1);

    const rollbackConflictPost = await insertLegacyPost(pool, 'rollback-konflikt');
    const rollbackConflictMigration = await insertReadyMigration(pool, rollbackConflictPost);
    const rollbackConflictResult = await repository.migrateOne({
      migrationId: rollbackConflictMigration.id,
      admin
    });
    await pool.query(`
      INSERT INTO content_post_revisions (post_id, status, created_at)
      VALUES ($1, 'draft', $2::timestamptz + INTERVAL '1 second')
    `, [rollbackConflictPost.id, rollbackConflictResult.migration.migrated_at]);
    await assert.rejects(repository.rollbackOne({
      migrationId: rollbackConflictMigration.id,
      admin
    }), { code: 'CONTENT_LEGACY_ROLLBACK_CONFLICT' });
    assert.equal((await pool.query(
      'SELECT content_format FROM posts WHERE id = $1',
      [rollbackConflictPost.id]
    )).rows[0].content_format, 'static_html');
  } finally {
    try {
      if (pool) await pool.end();
    } finally {
      try {
        if (schemaCreated) {
          await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        }
      } finally {
        await adminPool.end();
      }
    }
  }
});
