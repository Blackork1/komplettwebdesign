import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { createContentExistingPostOptimizationRepository } from '../repositories/contentExistingPostOptimizationRepository.js';
import { createContentSearchMetricsRepository } from '../repositories/contentSearchMetricsRepository.js';
import {
  captureRevisionBaseline,
  evaluateDueRevisionOutcomes
} from '../services/contentAgent/contentRevisionOutcomeService.js';
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
const outcomeUpgradeMigrationUrl = new URL(
  '../scripts/migrations/012_upgrade_revision_outcome_claims.sql',
  import.meta.url
);

test('echtes PostgreSQL: lokale 28-Tage-Abdeckung, unveränderliche Basis und parallele Outcome-Claims', {
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
      query_timeout: 7_000,
      max: 8
    });
    await pool.query(`
      CREATE TABLE admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL
      );
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL DEFAULT '',
        published BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(80) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'completed',
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE content_post_audits (
        id BIGSERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id),
        job_id BIGINT REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL DEFAULT 'resolved'
      );
      CREATE TABLE content_post_revisions (
        id BIGSERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id),
        audit_id BIGINT REFERENCES content_post_audits(id),
        snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'approved',
        revision_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const [metricsMigration, outcomeMigration, outcomeUpgradeMigration] = await Promise.all([
      readFile(new URL('../scripts/migrations/007_create_content_search_metrics.sql', import.meta.url), 'utf8'),
      readFile(new URL('../scripts/migrations/011_create_existing_post_optimization.sql', import.meta.url), 'utf8'),
      readFile(outcomeUpgradeMigrationUrl, 'utf8')
    ]);
    await pool.query(metricsMigration);
    await pool.query(outcomeMigration);
    await pool.query(outcomeUpgradeMigration);

    const inserted = await pool.query(`
      INSERT INTO posts (title, slug, content, published, updated_at)
      VALUES
        ('Outcome-Artikel', 'outcome-artikel', '<p>Unverändert</p>', TRUE, '2026-07-14T16:00:00Z'),
        ('Fehler-Artikel', 'fehler-artikel', '<p>Unverändert</p>', TRUE, '2026-07-14T16:00:00Z'),
        ('Ohne Basis', 'ohne-basis', '<p>Unverändert</p>', TRUE, '2026-06-01T12:00:00Z')
      RETURNING id, slug
    `);
    const [outcomePost, failedPost, missingPost] = inserted.rows;
    const job = (await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key, payload_json)
      VALUES ('optimize_existing_post', 'completed', 'pg-outcome-job', '{"post_id": 1}'::jsonb)
      RETURNING id
    `)).rows[0];
    const revisionIds = [];
    for (const post of inserted.rows) {
      const audit = (await pool.query(`
        INSERT INTO content_post_audits (post_id, job_id, status)
        VALUES ($1, $2, 'resolved') RETURNING id
      `, [post.id, job.id])).rows[0];
      const revision = (await pool.query(`
        INSERT INTO content_post_revisions (
          post_id, audit_id, status, revision_version,
          optimization_job_id, optimization_report_json
        ) VALUES ($1, $2, 'approved', 3, $3, '{}'::jsonb)
        RETURNING id
      `, [post.id, audit.id, job.id])).rows[0];
      revisionIds.push(revision.id);
    }

    const metricsRepository = createContentSearchMetricsRepository(pool);
    const outcomeRepository = createContentExistingPostOptimizationRepository(pool);
    await metricsRepository.recordSyncCoverage({
      startDate: '2026-06-17',
      endDate: '2026-08-11'
    });
    await metricsRepository.upsertSearchMetrics([
      {
        postId: outcomePost.id, metricDate: '2026-06-17',
        pageUrl: 'https://komplettwebdesign.de/blog/outcome-artikel',
        query: 'alpha', device: 'DESKTOP', clicks: 2, impressions: 20,
        ctr: 0.1, averagePosition: 10
      },
      {
        postId: outcomePost.id, metricDate: '2026-06-17',
        pageUrl: 'https://komplettwebdesign.de/blog/outcome-artikel',
        query: 'alpha', device: 'MOBILE', clicks: 1, impressions: 30,
        ctr: 1 / 30, averagePosition: 20
      },
      {
        postId: outcomePost.id, metricDate: '2026-06-18',
        pageUrl: 'https://komplettwebdesign.de/blog/outcome-artikel',
        query: 'beta', device: 'DESKTOP', clicks: 7, impressions: 50,
        ctr: 0.14, averagePosition: 4
      },
      {
        postId: outcomePost.id, metricDate: '2026-07-15',
        pageUrl: 'https://komplettwebdesign.de/blog/outcome-artikel',
        query: 'gamma', device: 'DESKTOP', clicks: 10, impressions: 100,
        ctr: 0.1, averagePosition: 5
      }
    ]);

    const transaction = await pool.connect();
    try {
      await transaction.query('BEGIN');
      const baseline = await captureRevisionBaseline({
        revisionId: revisionIds[0],
        postId: outcomePost.id,
        expectedVersion: 3,
        appliedAt: '2026-07-14T16:00:00.000Z',
        timezone: 'Europe/Berlin',
        transactionClient: transaction
      }, { searchMetricsRepository: metricsRepository, outcomeRepository });
      assert.equal(
        [baseline.baseline_start_date.getFullYear(),
          String(baseline.baseline_start_date.getMonth() + 1).padStart(2, '0'),
          String(baseline.baseline_start_date.getDate()).padStart(2, '0')].join('-'),
        '2026-06-17'
      );
      assert.equal(
        [baseline.baseline_end_date.getFullYear(),
          String(baseline.baseline_end_date.getMonth() + 1).padStart(2, '0'),
          String(baseline.baseline_end_date.getDate()).padStart(2, '0')].join('-'),
        '2026-07-14'
      );
      assert.equal(Number(baseline.baseline_metrics_json.clicks), 10);
      assert.equal(Number(baseline.baseline_metrics_json.impressions), 100);
      assert.equal(Number(baseline.baseline_metrics_json.averagePosition), 10);

      const repeated = await outcomeRepository.createOutcomeBaseline({
        revisionId: revisionIds[0],
        postId: outcomePost.id,
        expectedVersion: 3,
        appliedAt: '2026-07-14T16:00:00.000Z',
        baselineStartDate: null,
        baselineEndDate: null,
        baselineMetrics: {
          hasData: false, clicks: 0, impressions: 0, ctr: 0,
          averagePosition: null, queries: []
        },
        timezone: 'Europe/Berlin'
      }, transaction);
      assert.equal(Number(repeated.baseline_metrics_json.impressions), 100);
      await transaction.query('COMMIT');
    } catch (error) {
      await transaction.query('ROLLBACK');
      throw error;
    } finally {
      transaction.release();
    }

    const summaries = await Promise.all([
      evaluateDueRevisionOutcomes({ endDate: '2026-08-11' }, {
        outcomeRepository,
        searchMetricsRepository: metricsRepository
      }),
      evaluateDueRevisionOutcomes({ endDate: '2026-08-11' }, {
        outcomeRepository,
        searchMetricsRepository: metricsRepository
      })
    ]);
    assert.equal(summaries.reduce((sum, item) => sum + item.claimed, 0), 1);
    assert.equal(summaries.reduce((sum, item) => sum + item.evaluated, 0), 1);
    assert.deepEqual(await evaluateDueRevisionOutcomes({ endDate: '2026-08-11' }, {
      outcomeRepository,
      searchMetricsRepository: metricsRepository
    }), { claimed: 0, evaluated: 0, insufficientData: 0, waiting: 0, failed: 0 });
    const completed = (await pool.query(`
      SELECT evaluation_status, baseline_metrics_json, followup_metrics_json
      FROM content_revision_optimization_outcomes
      WHERE revision_id = $1
    `, [revisionIds[0]])).rows[0];
    assert.equal(completed.evaluation_status, 'evaluated');
    assert.equal(Number(completed.followup_metrics_json.averagePosition), 5);

    const failedTransaction = await pool.connect();
    try {
      await failedTransaction.query('BEGIN');
      await captureRevisionBaseline({
        revisionId: revisionIds[1],
        postId: failedPost.id,
        expectedVersion: 3,
        appliedAt: '2026-07-14T16:00:00.000Z',
        timezone: 'Europe/Berlin',
        transactionClient: failedTransaction
      }, { searchMetricsRepository: metricsRepository, outcomeRepository });
      await failedTransaction.query('COMMIT');
    } catch (error) {
      await failedTransaction.query('ROLLBACK');
      throw error;
    } finally {
      failedTransaction.release();
    }
    const beforeFailure = (await pool.query(`
      SELECT p.title, p.content, r.status, r.revision_version
      FROM posts p JOIN content_post_revisions r ON r.post_id = p.id
      WHERE r.id = $1
    `, [revisionIds[1]])).rows[0];
    const failure = await evaluateDueRevisionOutcomes({ endDate: '2026-08-11' }, {
      outcomeRepository,
      searchMetricsRepository: {
        async getPageOutcomeMetrics() { throw new Error('lokaler Lesefehler'); }
      }
    });
    assert.equal(failure.failed, 1);
    assert.deepEqual((await pool.query(`
      SELECT p.title, p.content, r.status, r.revision_version
      FROM posts p JOIN content_post_revisions r ON r.post_id = p.id
      WHERE r.id = $1
    `, [revisionIds[1]])).rows[0], beforeFailure);

    const missingTransaction = await pool.connect();
    try {
      await missingTransaction.query('BEGIN');
      await captureRevisionBaseline({
        revisionId: revisionIds[2],
        postId: missingPost.id,
        expectedVersion: 3,
        appliedAt: '2026-06-01T12:00:00.000Z',
        timezone: 'Europe/Berlin',
        transactionClient: missingTransaction
      }, { searchMetricsRepository: metricsRepository, outcomeRepository });
      await missingTransaction.query('COMMIT');
    } catch (error) {
      await missingTransaction.query('ROLLBACK');
      throw error;
    } finally {
      missingTransaction.release();
    }
    const missing = (await pool.query(`
      SELECT baseline_start_date, baseline_end_date, baseline_metrics_json
      FROM content_revision_optimization_outcomes WHERE revision_id = $1
    `, [revisionIds[2]])).rows[0];
    assert.equal(missing.baseline_start_date, null);
    assert.equal(missing.baseline_end_date, null);
    assert.equal(missing.baseline_metrics_json.hasData, false);
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

test('echtes PostgreSQL: Migration 012 aktualisiert eine ausgeführte Legacy-011 zweimal sicher', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  assert.equal(
    existsSync(fileURLToPath(outcomeUpgradeMigrationUrl)),
    true,
    'Die Outcome-Upgrade-Migration 012 fehlt.'
  );
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
      query_timeout: 7_000,
      max: 4
    });
    await pool.query(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE
      );
      CREATE TABLE content_post_revisions (
        id BIGSERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id),
        revision_version INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(32) NOT NULL DEFAULT 'approved',
        optimization_job_id BIGINT
      );
      CREATE TABLE content_revision_optimization_outcomes (
        revision_id BIGINT PRIMARY KEY REFERENCES content_post_revisions(id),
        post_id INTEGER NOT NULL REFERENCES posts(id),
        applied_at TIMESTAMPTZ NOT NULL,
        baseline_start_date DATE,
        baseline_end_date DATE,
        baseline_metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        followup_start_date DATE NOT NULL,
        followup_end_date DATE NOT NULL,
        followup_metrics_json JSONB,
        feedback_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        evaluation_status VARCHAR(24) NOT NULL DEFAULT 'waiting',
        evaluated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (evaluation_status IN ('waiting', 'ready', 'evaluated', 'insufficient_data', 'failed')),
        CHECK (followup_end_date = followup_start_date + 27)
      );
    `);
    const post = (await pool.query(`
      INSERT INTO posts (slug) VALUES ('legacy-outcome') RETURNING id
    `)).rows[0];
    const revision = (await pool.query(`
      INSERT INTO content_post_revisions (post_id, revision_version, status, optimization_job_id)
      VALUES ($1, 4, 'approved', 91) RETURNING id
    `, [post.id])).rows[0];
    await pool.query(`
      INSERT INTO content_revision_optimization_outcomes (
        revision_id, post_id, applied_at, baseline_metrics_json,
        followup_start_date, followup_end_date, evaluation_status
      ) VALUES (
        $1, $2, '2026-07-14T16:00:00Z',
        '{"hasData":false,"clicks":0,"impressions":0,"ctr":0,"averagePosition":null,"queries":[]}'::jsonb,
        '2026-07-15', '2026-08-11', 'ready'
      )
    `, [revision.id, post.id]);

    const migration012 = await readFile(outcomeUpgradeMigrationUrl, 'utf8');
    await pool.query(migration012);
    await pool.query(migration012);

    const columns = (await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = 'content_revision_optimization_outcomes'
        AND column_name IN ('evaluation_claim_token', 'evaluation_claimed_at')
      ORDER BY column_name
    `, [schemaName])).rows.map(({ column_name: name }) => name);
    assert.deepEqual(columns, ['evaluation_claim_token', 'evaluation_claimed_at']);
    const constraints = (await pool.query(`
      SELECT conname, convalidated
      FROM pg_constraint
      WHERE conrelid = 'content_revision_optimization_outcomes'::regclass
        AND conname = 'content_revision_optimization_outcomes_claim_consistent'
    `)).rows;
    assert.deepEqual(constraints, [{
      conname: 'content_revision_optimization_outcomes_claim_consistent',
      convalidated: true
    }]);
    assert.deepEqual((await pool.query(`
      SELECT evaluation_status, evaluation_claim_token, evaluation_claimed_at
      FROM content_revision_optimization_outcomes WHERE revision_id = $1
    `, [revision.id])).rows[0], {
      evaluation_status: 'waiting',
      evaluation_claim_token: null,
      evaluation_claimed_at: null
    });

    const outcomeRepository = createContentExistingPostOptimizationRepository(pool);
    const claimed = await outcomeRepository.listDueOutcomes({
      throughDate: '2026-08-11',
      limit: 50,
      claimToken: '22222222-2222-4222-8222-222222222222'
    });
    assert.equal(claimed.length, 1);
    assert.equal(claimed[0].evaluation_status, 'ready');
    assert.equal(claimed[0].evaluation_claim_token, '22222222-2222-4222-8222-222222222222');
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
