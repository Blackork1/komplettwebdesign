import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

import { runContentAgentMigration } from '../scripts/runContentAgentMigration.js';
import {
  claimNextJob,
  completeJob,
  enqueueJob,
  failJob,
  markJobNeedsManualAttention,
  recoverDraftPersistenceForAdmin,
  recoverEditorialReviewForAdmin,
  recoverQualityGateJobForAdmin,
  recoverQualityGateRuleManifestForAdmin,
  recoverRejectedProviderJobForAdmin,
  recoverUncertainProviderJobForAdmin,
  recoverExpiredJobs,
  rescheduleJobWithoutAttemptConsumption,
  renewJobLease,
  retryContentJobForAdmin,
  retryOrFailJob,
  upsertWorkerHeartbeat
} from '../repositories/contentJobRepository.js';
import {
  createRun,
  findRunByJobId,
  finishRun,
  updateRunStage
} from '../repositories/contentRunRepository.js';
import {
  releaseMonthlyBudgetReservation,
  reserveMonthlyBudget,
  settleMonthlyBudget
} from '../services/contentAgent/contentCostService.js';
import { createContentWorker } from '../services/contentAgent/workerService.js';
import { createProductionJobHandler } from '../scripts/contentWorker.js';
import { createContentPublicationService } from '../services/contentAgent/contentPublicationService.js';
import { sendAdminReviewNotification } from '../services/contentAgent/contentNotificationService.js';
import { createScheduledPublicationService } from '../services/contentAgent/scheduledPublicationService.js';
import { createContentPublishEventRepository } from '../repositories/contentPublishEventRepository.js';
import { createContentAgentAdminRepository } from '../repositories/contentAgentAdminRepository.js';
import { createDraftRegenerationRepository } from '../services/contentAgent/draftRegenerationService.js';
import { createContentReviewIssueOptimizationRepository } from '../repositories/contentReviewIssueOptimizationRepository.js';
import { createContentLearningRepository } from '../repositories/contentLearningRepository.js';
import { createContentWeeklyTopicPoolRepository } from '../repositories/contentWeeklyTopicPoolRepository.js';
import {
  createContentAgentPgTestSchemaName,
  evaluateContentAgentPgResetGuard
} from './helpers/contentAgentPostgresTestGuard.js';
import BlogPostModel from '../models/BlogPostModel.js';
import {
  CONTENT_AGENT_RULE_MANIFEST,
  CONTENT_AGENT_RULE_MANIFEST_HASH,
  canonicalSha256
} from '../services/contentAgent/contentRuleManifest.js';
import { createContentAgentJobSnapshot } from '../services/contentAgent/runtimeConfigService.js';
import { learningRulesForStage } from '../services/contentAgent/contentLearningSnapshotService.js';
import { buildArticleWriterPrompt } from '../services/contentAgent/prompts/articleWriterPrompt.js';
import { createContentExistingPostOptimizationRepository } from '../repositories/contentExistingPostOptimizationRepository.js';
import { createRevisionSnapshot } from '../services/contentAgent/contentRevisionService.js';
import { buildExistingPostDiff } from '../services/contentAgent/existingPostDiffService.js';

const connectionString = process.env.CONTENT_AGENT_PG_TEST_URL;
const resetGuard = evaluateContentAgentPgResetGuard({
  connectionString,
  allowReset: process.env.CONTENT_AGENT_PG_TEST_ALLOW_RESET === 'true',
  resetToken: process.env.CONTENT_AGENT_PG_TEST_TOKEN
});

test('echtes PostgreSQL: Lease-Recovery übernimmt normale Runs und reconciliiert terminale Revalidierungsruns', {
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
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        idempotency_key VARCHAR(180) NOT NULL UNIQUE,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_notification_deliveries (
        id BIGSERIAL PRIMARY KEY,
        notification_type VARCHAR(64),
        status VARCHAR(32),
        next_attempt_at TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX ux_content_jobs_active_existing_optimization
        ON content_jobs ((payload_json ->> 'post_id'))
        WHERE job_type = 'optimize_existing_post'
          AND status IN ('queued', 'running', 'needs_manual_attention');

      WITH jobs AS (
        INSERT INTO content_jobs (
          job_type, status, idempotency_key, payload_json, attempts, max_attempts,
          locked_at, locked_by
        ) VALUES
          ('generate_manual_draft', 'running', 'completed-run', '{}'::jsonb, 3, 3, NOW() - INTERVAL '60 minutes', 'alter-worker'),
          ('optimize_existing_post', 'running', 'failed-run', '{"post_id":19}'::jsonb, 3, 3, NOW() - INTERVAL '60 minutes', 'alter-worker'),
          ('generate_manual_draft', 'running', 'manual-run', '{}'::jsonb, 3, 3, NOW() - INTERVAL '60 minutes', 'alter-worker'),
          ('generate_manual_draft', 'running', 'exhausted-running-run', '{}'::jsonb, 3, 3, NOW() - INTERVAL '60 minutes', 'alter-worker'),
          ('revalidate_existing_post_revision', 'running', 'revalidation-early-crash', '{}'::jsonb, 1, 3, NOW() - INTERVAL '60 minutes', 'alter-worker'),
          ('revalidate_existing_post_revision', 'running', 'revalidation-cleanup', '{}'::jsonb, 3, 3, NOW() - INTERVAL '60 minutes', 'alter-worker'),
          ('revalidate_existing_post_revision', 'running', 'revalidation-terminal', '{}'::jsonb, 3, 3, NOW() - INTERVAL '60 minutes', 'alter-worker')
        RETURNING id, idempotency_key
      )
      INSERT INTO content_runs (job_id, status, error_report_json, finished_at)
      SELECT id,
             CASE idempotency_key
               WHEN 'completed-run' THEN 'completed'
               WHEN 'failed-run' THEN 'failed'
               WHEN 'manual-run' THEN 'needs_manual_attention'
               WHEN 'revalidation-terminal' THEN 'failed'
               ELSE 'running'
             END,
             CASE idempotency_key
               WHEN 'failed-run' THEN '{"code":"existing_snapshot_invalid"}'::jsonb
               WHEN 'manual-run' THEN '{"code":"manual_check"}'::jsonb
               WHEN 'revalidation-terminal' THEN '{"code":"CONTENT_REVISION_REVALIDATION_QUALITY_FAILED"}'::jsonb
               ELSE '{}'::jsonb
             END,
             CASE
               WHEN idempotency_key IN ('exhausted-running-run', 'revalidation-cleanup') THEN NULL
               ELSE NOW()
             END
      FROM jobs;
    `);
    await pool.query(`
      WITH job AS (
        INSERT INTO content_jobs (
          job_type, status, idempotency_key, payload_json, attempts, max_attempts,
          locked_at, locked_by, last_error
        ) VALUES (
          'revalidate_existing_post_revision', 'running', 'revalidation-generic-cleanup',
          '{}'::jsonb, 3, 3, NOW() - INTERVAL '60 minutes', 'alter-worker',
          'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY'
        )
        RETURNING id
      )
      INSERT INTO content_runs (job_id, status, error_report_json)
      SELECT id, 'running', '{}'::jsonb FROM job
    `);
    await pool.query(`
      UPDATE content_jobs
      SET last_error = 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY'
      WHERE idempotency_key = 'revalidation-terminal'
    `);

    await recoverExpiredJobs(30, pool);
    const states = (await pool.query(`
      SELECT idempotency_key, status, last_error, locked_at, locked_by
      FROM content_jobs ORDER BY idempotency_key
    `)).rows;
    assert.deepEqual(states, [
      { idempotency_key: 'completed-run', status: 'completed', last_error: null, locked_at: null, locked_by: null },
      { idempotency_key: 'exhausted-running-run', status: 'failed', last_error: 'CONTENT_JOB_LEASE_LOST', locked_at: null, locked_by: null },
      { idempotency_key: 'failed-run', status: 'failed', last_error: 'existing_snapshot_invalid', locked_at: null, locked_by: null },
      { idempotency_key: 'manual-run', status: 'needs_manual_attention', last_error: 'manual_check', locked_at: null, locked_by: null },
      { idempotency_key: 'revalidation-cleanup', status: 'queued', last_error: 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:fail:CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED', locked_at: null, locked_by: null },
      { idempotency_key: 'revalidation-early-crash', status: 'queued', last_error: 'CONTENT_JOB_LEASE_LOST', locked_at: null, locked_by: null },
      { idempotency_key: 'revalidation-generic-cleanup', status: 'queued', last_error: 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY', locked_at: null, locked_by: null },
      { idempotency_key: 'revalidation-terminal', status: 'queued', last_error: 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY', locked_at: null, locked_by: null }
    ]);
    const cleanupState = (await pool.query(`
      SELECT attempts, finished_at, run_after <= NOW() AS due
      FROM content_jobs
      WHERE idempotency_key = 'revalidation-cleanup'
    `)).rows[0];
    assert.deepEqual(cleanupState, { attempts: 2, finished_at: null, due: true });
    const genericCleanupState = (await pool.query(`
      SELECT attempts, finished_at, run_after <= NOW() AS due
      FROM content_jobs
      WHERE idempotency_key = 'revalidation-generic-cleanup'
    `)).rows[0];
    assert.deepEqual(genericCleanupState, { attempts: 2, finished_at: null, due: true });
    const earlyCrashState = (await pool.query(`
      SELECT attempts, finished_at
      FROM content_jobs
      WHERE idempotency_key = 'revalidation-early-crash'
    `)).rows[0];
    assert.deepEqual(earlyCrashState, { attempts: 1, finished_at: null });
    const terminalRevalidationState = (await pool.query(`
      SELECT attempts, finished_at, run_after <= NOW() AS due
      FROM content_jobs
      WHERE idempotency_key = 'revalidation-terminal'
    `)).rows[0];
    assert.deepEqual(terminalRevalidationState, { attempts: 2, finished_at: null, due: true });

    const replacement = await pool.query(`
      INSERT INTO content_jobs (
        job_type, status, idempotency_key, payload_json, attempts, max_attempts
      ) VALUES (
        'optimize_existing_post', 'queued', 'replacement-run', '{"post_id":19}'::jsonb, 0, 3
      ) RETURNING id
    `);
    assert.equal(replacement.rowCount, 1);
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: mehrere Cleanup-Reschedules bewahren Intent, Versuch und Retryzeit', {
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
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        idempotency_key VARCHAR(180) NOT NULL UNIQUE,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      )
    `);
    const inserted = (await pool.query(`
      INSERT INTO content_jobs (
        job_type, status, idempotency_key, attempts, max_attempts,
        locked_at, locked_by, last_error, finished_at
      ) VALUES (
        'revalidate_existing_post_revision', 'running', 'complete-cleanup', 3, 3,
        NOW(), 'cleanup-worker',
        'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:complete', NOW()
      )
      RETURNING *
    `)).rows[0];
    const cleanupToken = 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:complete';
    const cleanupError = Object.assign(new Error('Interne Ursache bleibt verborgen.'), {
      code: 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY',
      retryable: true,
      doesNotConsumeAttempt: true,
      cleanupToken
    });
    const retryTimes = [
      new Date('2030-07-14T12:00:30.000Z'),
      new Date('2030-07-14T12:01:00.000Z')
    ];
    let claim = inserted;

    for (const retryAt of retryTimes) {
      const rescheduled = await rescheduleJobWithoutAttemptConsumption(
        claim,
        cleanupError,
        { retryAt },
        pool
      );
      assert.equal(rescheduled.status, 'queued');
      assert.equal(rescheduled.attempts, 2);
      assert.equal(rescheduled.last_error, cleanupToken);
      assert.equal(rescheduled.run_after.getTime(), retryAt.getTime());
      assert.equal(rescheduled.finished_at, null);

      claim = (await pool.query(`
        UPDATE content_jobs
        SET status = 'running',
            attempts = attempts + 1,
            locked_at = NOW(),
            locked_by = 'cleanup-worker'
        WHERE id = $1
        RETURNING *
      `, [inserted.id])).rows[0];
      assert.equal(claim.attempts, 3);
      assert.equal(claim.last_error, cleanupToken);
    }
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: Admin-Retry öffnet nur zulässige Generierungsruns für den Worker', {
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
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        idempotency_key VARCHAR(180) NOT NULL UNIQUE,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        current_stage VARCHAR(64) NOT NULL DEFAULT 'inventory',
        runtime_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );

      WITH jobs AS (
        INSERT INTO content_jobs (
          job_type, status, idempotency_key, payload_json, attempts, max_attempts,
          last_error, finished_at
        ) VALUES
          ('generate_manual_draft', 'failed', 'admin-retry-generation', '{"source":"admin_manual"}'::jsonb, 1, 3, 'CONTENT_VALIDATION_FAILED', NOW()),
          ('optimize_existing_post', 'failed', 'admin-retry-existing', '{"source":"admin_existing_content","post_id":19}'::jsonb, 1, 3, 'CONTENT_VALIDATION_FAILED', NOW()),
          ('generate_manual_draft', 'failed', 'admin-retry-reserved', '{"source":"admin_manual"}'::jsonb, 1, 3, 'CONTENT_VALIDATION_FAILED', NOW()),
          ('send_admin_review_notification', 'failed', 'admin-retry-mail', '{}'::jsonb, 1, 3, 'SMTP_FAILED', NOW())
        RETURNING id, idempotency_key
      )
      INSERT INTO content_runs (
        job_id, status, runtime_snapshot_json, stage_results_json, finished_at
      )
      SELECT id,
             'failed',
             '{"timezone":"Europe/Berlin"}'::jsonb,
             CASE idempotency_key
               WHEN 'admin-retry-reserved' THEN '{"budget:2026-07:article_generation":{"status":"reserved"}}'::jsonb
               ELSE '{}'::jsonb
             END,
             NOW()
      FROM jobs
      WHERE idempotency_key <> 'admin-retry-mail';
    `);

    const jobs = (await pool.query(`
      SELECT * FROM content_jobs ORDER BY idempotency_key
    `)).rows;
    const byKey = new Map(jobs.map((job) => [job.idempotency_key, job]));
    const generation = byKey.get('admin-retry-generation');

    const retried = await retryContentJobForAdmin({ jobId: Number(generation.id) }, pool);
    assert.equal(retried.status, 'queued');
    assert.equal((await findRunByJobId(generation.id, pool)).status, 'running');

    let pipelineCalls = 0;
    const handler = createProductionJobHandler({
      technicalConfig: { enabled: true },
      async getSettings() { assert.fail('Der geöffnete Run darf keine Live-Einstellungen laden.'); },
      resolveRuntimeConfig() { assert.fail('Der geöffnete Run darf keine Live-Konfiguration laden.'); },
      createJobSnapshot() { assert.fail('Der geöffnete Run darf keinen neuen Snapshot erzeugen.'); },
      findRunByJobId: (jobId) => findRunByJobId(jobId, pool),
      async createRun() { assert.fail('Der vorhandene Run darf nicht neu angelegt werden.'); },
      async runPipeline() {
        pipelineCalls += 1;
        return { status: 'completed', post: { id: 55, published: false } };
      }
    });
    assert.equal((await handler({ ...retried, status: 'running' })).status, 'completed');
    assert.equal(pipelineCalls, 1);

    for (const idempotencyKey of [
      'admin-retry-existing',
      'admin-retry-reserved',
      'admin-retry-mail'
    ]) {
      const blocked = byKey.get(idempotencyKey);
      assert.equal(
        await retryContentJobForAdmin({ jobId: Number(blocked.id) }, pool),
        null
      );
    }
    const blockedStates = (await pool.query(`
      SELECT job.idempotency_key, job.status AS job_status, run.status AS run_status
      FROM content_jobs AS job
      LEFT JOIN content_runs AS run ON run.job_id = job.id
      WHERE job.idempotency_key IN (
        'admin-retry-existing', 'admin-retry-reserved', 'admin-retry-mail'
      )
      ORDER BY job.idempotency_key
    `)).rows;
    assert.deepEqual(blockedStates, [
      { idempotency_key: 'admin-retry-existing', job_status: 'failed', run_status: 'failed' },
      { idempotency_key: 'admin-retry-mail', job_status: 'failed', run_status: null },
      { idempotency_key: 'admin-retry-reserved', job_status: 'failed', run_status: 'failed' }
    ]);
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: parallele Erstläufe erzeugen nur eine Wochenrecherche', {
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
      max: 4
    });
    await pool.query(`
      CREATE TABLE content_runs (id BIGINT PRIMARY KEY);
      INSERT INTO content_runs (id) VALUES (1), (2), (3), (4);
    `);
    const migration010 = await readFile(
      new URL('../scripts/migrations/010_create_weekly_topic_pools.sql', import.meta.url),
      'utf8'
    );
    await pool.query(migration010);

    const repository = createContentWeeklyTopicPoolRepository(pool);
    const identity = { weekStart: '2026-07-13', timezone: 'Europe/Berlin' };
    const candidates = [{ topic: 'Aktuelles Webdesign', slug: 'aktuelles-webdesign' }];
    const sourceReferences = [
      { title: 'Quelle A', url: 'https://example.com/a' },
      { title: 'Quelle B', url: 'https://example.org/b' }
    ];
    let initialReads = 0;
    let releaseInitialReads;
    const bothInitiallyRead = new Promise((resolve) => { releaseInitialReads = resolve; });
    let researchCalls = 0;

    async function createOrReusePool(generationRunId) {
      const existing = await repository.findPool(identity);
      initialReads += 1;
      if (initialReads === 2) releaseInitialReads();
      await bothInitiallyRead;
      if (existing) return existing;

      return repository.withPoolCreationLock(identity, async (lockedRepository) => {
        const concurrentPool = await lockedRepository.findPool(identity);
        if (concurrentPool) return concurrentPool;
        const attempt = await lockedRepository.claimResearchAttempt({
          ...identity,
          generationRunId
        });
        if (!attempt.acquired) return null;
        researchCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        const createdPool = await lockedRepository.createPool({
          ...identity,
          candidates,
          sourceReferences,
          responseId: 'response-parallel',
          promptVersion: '2026-07-14.1'
        });
        await lockedRepository.markResearchAttempt({
          ...identity,
          generationRunId,
          status: 'completed',
          responseId: 'response-parallel'
        });
        return createdPool;
      });
    }

    const [first, second] = await Promise.all([createOrReusePool(1), createOrReusePool(2)]);

    assert.equal(researchCalls, 1);
    assert.equal(first.id, second.id);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM content_weekly_topic_pools')).rows[0].count, 1);
    const completedAttempt = await pool.query(`
      SELECT owner_generation_run_id, status
      FROM content_weekly_topic_research_attempts
      WHERE week_start = '2026-07-13'
        AND timezone = 'Europe/Berlin'
    `);
    assert.equal(['1', '2'].includes(completedAttempt.rows[0].owner_generation_run_id), true);
    assert.equal(completedAttempt.rows[0].status, 'completed');

    const blockedIdentity = { weekStart: '2026-07-20', timezone: 'Europe/Berlin' };
    await repository.withPoolCreationLock(blockedIdentity, async (lockedRepository) => {
      const attempt = await lockedRepository.claimResearchAttempt({
        ...blockedIdentity,
        generationRunId: 3
      });
      assert.equal(attempt.acquired, true);
      await lockedRepository.markResearchAttempt({
        ...blockedIdentity,
        generationRunId: 3,
        status: 'needs_manual_attention',
        errorCode: 'provider_execution_uncertain'
      });
    });
    const blockedAttempt = await repository.withPoolCreationLock(
      blockedIdentity,
      async (lockedRepository) => lockedRepository.claimResearchAttempt({
        ...blockedIdentity,
        generationRunId: 4
      })
    );
    assert.equal(blockedAttempt.acquired, false);
    assert.equal(blockedAttempt.ownerGenerationRunId, 3);
    assert.equal(blockedAttempt.status, 'needs_manual_attention');
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: Migration 006 rekonstruiert bestehende Zeitplanänderungen ohne Doppelseed', {
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
      CREATE TABLE content_agent_settings (
        id SMALLINT PRIMARY KEY,
        agent_enabled BOOLEAN NOT NULL,
        schedule_weekdays SMALLINT[] NOT NULL,
        schedule_time TIME NOT NULL,
        timezone VARCHAR(80) NOT NULL,
        generation_lead_hours SMALLINT NOT NULL,
        schedule_revision BIGINT NOT NULL DEFAULT 1
      );
      CREATE TABLE content_agent_setting_revisions (
        id BIGSERIAL PRIMARY KEY,
        changed_keys TEXT[] NOT NULL,
        previous_values_json JSONB NOT NULL,
        new_values_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE content_notification_deliveries (
        id BIGSERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        notification_type VARCHAR(40) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE content_agent_schedule_revisions (
        revision BIGINT PRIMARY KEY,
        effective_at TIMESTAMPTZ NOT NULL,
        agent_enabled BOOLEAN NOT NULL,
        schedule_weekdays SMALLINT[] NOT NULL,
        schedule_time TIME NOT NULL,
        timezone VARCHAR(120) NOT NULL,
        generation_lead_hours SMALLINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO content_agent_settings
        (id, agent_enabled, schedule_weekdays, schedule_time, timezone, generation_lead_hours)
      VALUES (1, TRUE, ARRAY[1,4]::SMALLINT[], '19:00', 'Europe/Berlin', 4);
      INSERT INTO content_agent_setting_revisions
        (changed_keys, previous_values_json, new_values_json, created_at)
      VALUES (
        ARRAY['schedule_time'],
        '{"agent_enabled":true,"schedule_weekdays":[1,4],"schedule_time":"18:00","timezone":"Europe/Berlin","generation_lead_hours":4}',
        '{"agent_enabled":true,"schedule_weekdays":[1,4],"schedule_time":"19:00","timezone":"Europe/Berlin","generation_lead_hours":4}',
        NOW() - INTERVAL '2 days'
      );
      INSERT INTO content_agent_schedule_revisions
        (revision, effective_at, agent_enabled, schedule_weekdays, schedule_time, timezone, generation_lead_hours)
      VALUES (1, NOW(), TRUE, ARRAY[1,4]::SMALLINT[], '19:00', 'Europe/Berlin', 4);
    `);
    const migration006 = await readFile(
      new URL('../scripts/migrations/006_add_schedule_revisions_and_admin_review_lookup.sql', import.meta.url),
      'utf8'
    );
    await pool.query(migration006);
    await pool.query(`
      INSERT INTO content_agent_schedule_revisions
        (revision, effective_at, agent_enabled, schedule_weekdays, schedule_time, timezone, generation_lead_hours)
      VALUES
        (3, NOW() - INTERVAL '1 day', FALSE, ARRAY[1,4]::SMALLINT[], '19:00', 'Europe/Berlin', 4),
        (4, NOW() - INTERVAL '12 hours', TRUE, ARRAY[1,4]::SMALLINT[], '20:00', 'Europe/Berlin', 4);
      INSERT INTO content_agent_setting_revisions
        (changed_keys, previous_values_json, new_values_json, created_at)
      VALUES (
        ARRAY['agent_enabled', 'schedule_time'],
        '{"agent_enabled":false,"schedule_weekdays":[1,4],"schedule_time":"19:00","timezone":"Europe/Berlin","generation_lead_hours":4}',
        '{"agent_enabled":true,"schedule_weekdays":[1,4],"schedule_time":"20:00","timezone":"Europe/Berlin","generation_lead_hours":4}',
        NOW() - INTERVAL '12 hours'
      );
      UPDATE content_agent_settings
      SET agent_enabled = TRUE,
          schedule_time = '20:00',
          schedule_revision = 4
      WHERE id = 1;
    `);
    await pool.query(migration006);
    const revisions = await pool.query(`
      SELECT revision, effective_at, schedule_time::text, agent_enabled
      FROM content_agent_schedule_revisions
      ORDER BY revision
    `);
    assert.deepEqual(revisions.rows.map((row) => [row.revision, row.schedule_time]), [
      ['1', '18:00:00'],
      ['2', '19:00:00'],
      ['3', '19:00:00'],
      ['4', '20:00:00']
    ]);
    assert.equal(revisions.rows[2].agent_enabled, false);
    assert.ok(revisions.rows[0].effective_at.getTime() <= Date.now() - (9 * 24 * 60 * 60 * 1000));
    assert.equal((await pool.query(
      'SELECT schedule_revision FROM content_agent_settings WHERE id = 1'
    )).rows[0].schedule_revision, '4');
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: unklare Providerreservierung wird genau einmal verworfen', {
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
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        post_id INTEGER,
        cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );
    `);
    const inserted = await pool.query(`
      WITH job AS (
        INSERT INTO content_jobs (
          job_type, status, attempts, max_attempts, last_error, finished_at
        )
        VALUES (
          'generate_weekly_draft', 'needs_manual_attention', 4, 4,
          'provider_execution_uncertain', NOW()
        )
        RETURNING id
      )
      INSERT INTO content_runs (
        job_id, status, cost_estimate, error_report_json, stage_results_json, finished_at
      )
      SELECT id,
             'needs_manual_attention',
             0.586475,
             '{"code":"provider_execution_uncertain"}'::jsonb,
             '{
               "budget:2026-07:topic_research": {
                 "status":"settled", "reservationMonth":"2026-07",
                 "reservedCost":0.5, "actualCost":0.086475
               },
               "topic_research": {"value":{"candidates":[]}},
               "budget:2026-07:seo_brief": {
                 "status":"reserved", "reservationMonth":"2026-07", "reservedCost":0.5
               }
             }'::jsonb,
             NOW()
      FROM job
      RETURNING job_id, id AS run_id
    `);
    const jobId = Number(inserted.rows[0].job_id);

    const result = await recoverUncertainProviderJobForAdmin({ jobId, adminId: 7 }, pool);

    assert.equal(result.recoveredStage, 'seo_brief');
    assert.equal(result.reservationMonth, '2026-07');
    assert.equal(result.reservedCost, 0.5);
    const job = (await pool.query(
      'SELECT status, attempts, max_attempts, last_error FROM content_jobs WHERE id = $1',
      [jobId]
    )).rows[0];
    assert.deepEqual(job, {
      status: 'queued', attempts: 4, max_attempts: 5, last_error: null
    });
    const run = (await pool.query(
      'SELECT status, post_id, cost_estimate, error_report_json, stage_results_json FROM content_runs WHERE job_id = $1',
      [jobId]
    )).rows[0];
    assert.equal(run.status, 'running');
    assert.equal(run.post_id, null);
    assert.equal(Number(run.cost_estimate), 0.086475);
    assert.equal(run.error_report_json.code, 'provider_recovery_authorized');
    assert.deepEqual(run.stage_results_json.topic_research.value.candidates, []);
    assert.equal(run.stage_results_json['budget:2026-07:seo_brief'], undefined);
    assert.equal(
      run.stage_results_json['provider_recovery:2026-07:seo_brief:attempt-4'].status,
      'abandoned_uncertain'
    );

    assert.equal(
      await recoverUncertainProviderJobForAdmin({ jobId, adminId: 7 }, pool),
      null
    );
    const audits = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM content_runs
      CROSS JOIN LATERAL jsonb_each(stage_results_json) AS entry(key, value)
      WHERE job_id = $1 AND entry.key LIKE 'provider_recovery:%'
    `, [jobId]);
    assert.equal(audits.rows[0].count, 1);
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: abgelehntes Artikelschema wird genau einmal ab dem SEO-Briefing fortgesetzt', {
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
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        current_stage VARCHAR(64) NOT NULL,
        post_id INTEGER,
        cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );
    `);
    const inserted = await pool.query(`
      WITH job AS (
        INSERT INTO content_jobs (
          job_type, status, attempts, max_attempts, last_error, finished_at
        )
        VALUES (
          'generate_weekly_draft', 'needs_manual_attention', 6, 6,
          'provider_request_rejected', NOW()
        )
        RETURNING id
      )
      INSERT INTO content_runs (
        job_id, status, current_stage, cost_estimate,
        error_report_json, stage_results_json, finished_at
      )
      SELECT id,
             'needs_manual_attention',
             'seo_brief',
             0.171983,
             '{
               "code":"provider_request_rejected",
               "providerDiagnostic": {
                 "provider":"openai", "stage":"article_generation",
                 "code":"invalid_json_schema", "httpStatus":400
               }
             }'::jsonb,
             '{
               "budget:2026-07:topic_research": {"status":"settled"},
               "topic_research": {"value":{"candidates":[]}},
               "budget:2026-07:seo_brief": {"status":"settled"},
               "seo_brief": {"value":{"topic":"Gespeichertes Briefing"}}
             }'::jsonb,
             NOW()
      FROM job
      RETURNING job_id, id AS run_id
    `);
    const jobId = Number(inserted.rows[0].job_id);

    const result = await recoverRejectedProviderJobForAdmin({ jobId, adminId: 7 }, pool);

    assert.equal(result.recoveredStage, 'article_generation');
    const job = (await pool.query(
      'SELECT status, attempts, max_attempts, last_error FROM content_jobs WHERE id = $1',
      [jobId]
    )).rows[0];
    assert.deepEqual(job, {
      status: 'queued', attempts: 6, max_attempts: 7, last_error: null
    });
    const run = (await pool.query(
      'SELECT status, current_stage, post_id, cost_estimate, error_report_json, stage_results_json FROM content_runs WHERE job_id = $1',
      [jobId]
    )).rows[0];
    assert.equal(run.status, 'running');
    assert.equal(run.current_stage, 'seo_brief');
    assert.equal(run.post_id, null);
    assert.equal(Number(run.cost_estimate), 0.171983);
    assert.equal(run.error_report_json.code, 'provider_schema_recovery_authorized');
    assert.equal(run.stage_results_json.seo_brief.value.topic, 'Gespeichertes Briefing');
    assert.equal(
      run.stage_results_json['provider_schema_recovery:article_generation:attempt-6'].status,
      'authorized_after_rejection'
    );

    assert.equal(
      await recoverRejectedProviderJobForAdmin({ jobId, adminId: 7 }, pool),
      null
    );
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: Qualitätsfehler erhält genau eine zusätzliche Strukturreparatur', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  const schemaName = createContentAgentPgTestSchemaName();
  const adminPool = new pg.Pool({ connectionString, statement_timeout: 5_000, query_timeout: 7_000 });
  let pool;
  let schemaCreated = false;
  try {
    const previousManifest = {
      ...CONTENT_AGENT_RULE_MANIFEST,
      articleRepairPrompt: '2026-07-10.1',
      articleWriterPrompt: '2026-07-10.1'
    };
    const previousSnapshot = {
      timezone: 'Europe/Berlin',
      allowedInternalLinks: ['/kontakt'],
      allowedInternalLinksHash: canonicalSha256(['/kontakt']),
      ruleManifest: previousManifest,
      ruleManifestHash: canonicalSha256(previousManifest)
    };
    await adminPool.query(`CREATE SCHEMA "${schemaName}"`);
    schemaCreated = true;
    pool = new pg.Pool({
      connectionString,
      options: `-c search_path=${schemaName},pg_catalog`,
      statement_timeout: 5_000,
      query_timeout: 7_000
    });
    await pool.query(`
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        current_stage VARCHAR(64) NOT NULL,
        post_id INTEGER,
        cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        runtime_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );
    `);
    const inserted = await pool.query(`
      WITH job AS (
        INSERT INTO content_jobs (
          job_type, status, attempts, max_attempts, last_error, finished_at
        )
        VALUES (
          'generate_weekly_draft', 'needs_manual_attention', 7, 7,
          'quality_gate_failed', NOW()
        )
        RETURNING id
      )
      INSERT INTO content_runs (
        job_id, status, current_stage, cost_estimate,
        error_report_json, runtime_snapshot_json, stage_results_json, finished_at
      )
      SELECT id,
             'needs_manual_attention',
             'validation',
             0.483309,
             '{"code":"quality_gate_failed"}'::jsonb,
             $1::jsonb,
             '{
               "budget:2026-07:article_generation": {"status":"settled"},
               "article_generation": {"value":{"title":"Bezahlter Artikel"}},
               "budget:2026-07:repair:1": {"status":"settled"},
               "repair:1": {"value":{"title":"Erste Reparatur"}},
               "budget:2026-07:repair:2": {"status":"settled"},
               "repair:2": {"value":{"title":"Zweite Reparatur"}},
               "validation:2": {
                 "passed":false,
                 "issues":[
                   {"code":"cta_count_invalid","message":"CTA-Markierungen fehlen."},
                   {"code":"faq_mismatch","message":"FAQ-Markierungen fehlen."},
                   {"code":"bootstrap_class_unknown","message":"col-12 war nicht erlaubt."}
                 ]
               }
             }'::jsonb,
             NOW()
      FROM job
      RETURNING job_id
    `, [JSON.stringify(previousSnapshot)]);
    const jobId = Number(inserted.rows[0].job_id);

    const result = await recoverQualityGateJobForAdmin({
      jobId,
      adminId: 7,
      baseMaxRevisions: 2
    }, pool);

    assert.equal(result.recoveredStage, 'repair:3');
    const job = (await pool.query(
      'SELECT status, attempts, max_attempts, last_error FROM content_jobs WHERE id = $1',
      [jobId]
    )).rows[0];
    assert.deepEqual(job, {
      status: 'queued', attempts: 7, max_attempts: 8, last_error: null
    });
    const run = (await pool.query(`
      SELECT status, current_stage, post_id, cost_estimate, error_report_json,
             runtime_snapshot_json, stage_results_json
      FROM content_runs
      WHERE job_id = $1
    `, [jobId])).rows[0];
    assert.equal(run.status, 'running');
    assert.equal(run.current_stage, 'validation');
    assert.equal(run.post_id, null);
    assert.equal(Number(run.cost_estimate), 0.483309);
    assert.equal(run.error_report_json.code, 'quality_gate_recovery_authorized');
    assert.deepEqual(run.runtime_snapshot_json.ruleManifest, CONTENT_AGENT_RULE_MANIFEST);
    assert.equal(run.runtime_snapshot_json.ruleManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);
    assert.deepEqual(run.runtime_snapshot_json.allowedInternalLinks, ['/kontakt']);
    assert.equal(run.stage_results_json.article_generation.value.title, 'Bezahlter Artikel');
    assert.equal(run.stage_results_json['repair:2'].value.title, 'Zweite Reparatur');
    assert.equal(
      run.stage_results_json['quality_gate_recovery:structure_contract:attempt-7'].stageId,
      'repair:3'
    );

    assert.equal(await recoverQualityGateJobForAdmin({
      jobId,
      adminId: 7,
      baseMaxRevisions: 2
    }, pool), null);
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: vorzeitig gestoppter Manifestfehler wird ohne Inhaltsverlust fortgesetzt', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  const schemaName = createContentAgentPgTestSchemaName();
  const adminPool = new pg.Pool({ connectionString, statement_timeout: 5_000, query_timeout: 7_000 });
  let pool;
  let schemaCreated = false;
  try {
    const previousManifest = {
      ...CONTENT_AGENT_RULE_MANIFEST,
      articleRepairPrompt: '2026-07-10.1',
      articleWriterPrompt: '2026-07-10.1'
    };
    const previousHash = canonicalSha256(previousManifest);
    const previousSnapshot = {
      timezone: 'Europe/Berlin',
      allowedInternalLinks: ['/kontakt'],
      allowedInternalLinksHash: canonicalSha256(['/kontakt']),
      ruleManifest: previousManifest,
      ruleManifestHash: previousHash
    };
    await adminPool.query(`CREATE SCHEMA "${schemaName}"`);
    schemaCreated = true;
    pool = new pg.Pool({
      connectionString,
      options: `-c search_path=${schemaName},pg_catalog`,
      statement_timeout: 5_000,
      query_timeout: 7_000
    });
    await pool.query(`
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        current_stage VARCHAR(64) NOT NULL,
        post_id INTEGER,
        cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        runtime_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );
    `);
    const inserted = await pool.query(`
      WITH job AS (
        INSERT INTO content_jobs (
          job_type, status, attempts, max_attempts, last_error, finished_at
        )
        VALUES (
          'generate_weekly_draft', 'needs_manual_attention', 8, 8,
          'CONTENT_RULE_MANIFEST_MISMATCH', NOW()
        )
        RETURNING id
      )
      INSERT INTO content_runs (
        job_id, status, current_stage, cost_estimate, error_report_json,
        runtime_snapshot_json, stage_results_json, finished_at
      )
      SELECT id,
             'needs_manual_attention',
             'validation',
             0.483309,
             '{"code":"CONTENT_RULE_MANIFEST_MISMATCH"}'::jsonb,
             $1::jsonb,
             '{
               "budget:2026-07:article_generation":{"status":"settled"},
               "article_generation":{"value":{"title":"Bezahlter Artikel"}},
               "budget:2026-07:repair:2":{"status":"settled"},
               "repair:2":{"value":{"title":"Zweite Reparatur"}},
               "validation:2":{"passed":false,"issues":[{"code":"cta_count_invalid"}]},
               "quality_gate_recovery:structure_contract:attempt-7":{
                 "status":"authorized_after_quality_gate",
                 "stageId":"repair:3",
                 "baseMaxRevisions":2,
                 "additionalRevisionCount":1,
                 "adminId":7
               }
             }'::jsonb,
             NOW()
      FROM job
      RETURNING job_id
    `, [JSON.stringify(previousSnapshot)]);
    const jobId = Number(inserted.rows[0].job_id);

    const result = await recoverQualityGateRuleManifestForAdmin({ jobId, adminId: 9 }, pool);

    assert.equal(result.recoveredStage, 'repair:3');
    const job = (await pool.query(
      'SELECT status, attempts, max_attempts, last_error FROM content_jobs WHERE id = $1',
      [jobId]
    )).rows[0];
    assert.deepEqual(job, {
      status: 'queued', attempts: 8, max_attempts: 9, last_error: null
    });
    const run = (await pool.query(`
      SELECT cost_estimate, error_report_json, runtime_snapshot_json, stage_results_json
      FROM content_runs
      WHERE job_id = $1
    `, [jobId])).rows[0];
    assert.equal(Number(run.cost_estimate), 0.483309);
    assert.equal(run.error_report_json.code, 'content_rule_manifest_recovery_authorized');
    assert.equal(run.runtime_snapshot_json.ruleManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);
    assert.deepEqual(run.runtime_snapshot_json.allowedInternalLinks, ['/kontakt']);
    assert.equal(run.stage_results_json.article_generation.value.title, 'Bezahlter Artikel');
    assert.equal(run.stage_results_json['repair:2'].value.title, 'Zweite Reparatur');
    const audit = run.stage_results_json['rule_manifest_recovery:quality_gate:attempt-8'];
    assert.equal(audit.previousManifestHash, previousHash);
    assert.equal(audit.currentManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);

    assert.equal(await recoverQualityGateRuleManifestForAdmin({ jobId, adminId: 9 }, pool), null);
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: ausschließlich die korrigierte redaktionelle Prüfung wird fortgesetzt', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  const schemaName = createContentAgentPgTestSchemaName();
  const adminPool = new pg.Pool({ connectionString, statement_timeout: 5_000, query_timeout: 7_000 });
  let pool;
  let schemaCreated = false;
  try {
    const previousManifest = {
      ...CONTENT_AGENT_RULE_MANIFEST,
      articleReviewerPrompt: '2026-07-11.1'
    };
    const previousHash = canonicalSha256(previousManifest);
    const previousSnapshot = {
      timezone: 'Europe/Berlin',
      allowedInternalLinks: ['/kontakt'],
      allowedInternalLinksHash: canonicalSha256(['/kontakt']),
      ruleManifest: previousManifest,
      ruleManifestHash: previousHash
    };
    await adminPool.query(`CREATE SCHEMA "${schemaName}"`);
    schemaCreated = true;
    pool = new pg.Pool({
      connectionString,
      options: `-c search_path=${schemaName},pg_catalog`,
      statement_timeout: 5_000,
      query_timeout: 7_000
    });
    await pool.query(`
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        current_stage VARCHAR(64) NOT NULL,
        post_id INTEGER,
        cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        runtime_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );
    `);
    const inserted = await pool.query(`
      WITH job AS (
        INSERT INTO content_jobs (
          job_type, status, attempts, max_attempts, last_error, finished_at
        )
        VALUES (
          'generate_weekly_draft', 'needs_manual_attention', 9, 9,
          'quality_gate_failed', NOW()
        )
        RETURNING id
      )
      INSERT INTO content_runs (
        job_id, status, current_stage, cost_estimate, error_report_json,
        runtime_snapshot_json, stage_results_json, finished_at
      )
      SELECT id,
             'needs_manual_attention',
             'review',
             0.611075,
             '{"code":"quality_gate_failed","message":"Der Reviewscore liegt unter 80."}'::jsonb,
             $1::jsonb,
             '{
               "budget:2026-07:article_generation":{"status":"settled"},
               "article_generation":{"value":{"title":"Bezahlter Artikel"}},
               "budget:2026-07:repair:3":{"status":"settled"},
               "repair:3":{"value":{"title":"Validierte dritte Reparatur"}},
               "validation:3":{"passed":true,"issues":[]},
               "budget:2026-07:review:3":{"status":"settled"},
               "review:3":{"value":{
                 "passed":false,
                 "score":68,
                 "requiresManualReview":true,
                 "risks":{},
                 "issues":[
                   {"code":"cta_count_exceeds_briefing","blocking":true},
                   {"code":"faq_structural_check","blocking":true}
                 ]
               }},
               "quality_gate_recovery:structure_contract:attempt-7":{
                 "status":"authorized_after_quality_gate",
                 "stageId":"repair:3",
                 "baseMaxRevisions":2,
                 "additionalRevisionCount":1,
                 "adminId":7
               },
               "rule_manifest_recovery:quality_gate:attempt-8":{
                 "status":"authorized_after_manifest_mismatch",
                 "stageId":"repair:3",
                 "adminId":7
               }
             }'::jsonb,
             NOW()
      FROM job
      RETURNING job_id
    `, [JSON.stringify(previousSnapshot)]);
    const jobId = Number(inserted.rows[0].job_id);

    const result = await recoverEditorialReviewForAdmin({ jobId, adminId: 9 }, pool);

    assert.equal(result.recoveredStage, 'review:4');
    const job = (await pool.query(
      'SELECT status, attempts, max_attempts, last_error FROM content_jobs WHERE id = $1',
      [jobId]
    )).rows[0];
    assert.deepEqual(job, {
      status: 'queued', attempts: 9, max_attempts: 10, last_error: null
    });
    const run = (await pool.query(`
      SELECT cost_estimate, error_report_json, runtime_snapshot_json, stage_results_json
      FROM content_runs
      WHERE job_id = $1
    `, [jobId])).rows[0];
    assert.equal(Number(run.cost_estimate), 0.611075);
    assert.equal(run.error_report_json.code, 'editorial_review_recovery_authorized');
    assert.equal(run.runtime_snapshot_json.ruleManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);
    assert.equal(run.stage_results_json.article_generation.value.title, 'Bezahlter Artikel');
    assert.equal(run.stage_results_json['repair:3'].value.title, 'Validierte dritte Reparatur');
    assert.equal(run.stage_results_json['review:4'], undefined);
    const audit = run.stage_results_json['editorial_review_recovery:review_scope:attempt-9'];
    assert.equal(audit.stageId, 'review:4');
    assert.equal(audit.previousReviewStageId, 'review:3');
    assert.equal(audit.previousManifestHash, previousHash);
    assert.equal(audit.currentManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);

    assert.equal(await recoverEditorialReviewForAdmin({ jobId, adminId: 9 }, pool), null);
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

test('echtes PostgreSQL: Metadatenfehler bewahrt Textkosten und reiht nur das Ersatzbild ein', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  const schemaName = createContentAgentPgTestSchemaName();
  const adminPool = new pg.Pool({ connectionString, statement_timeout: 5_000, query_timeout: 7_000 });
  let pool;
  let schemaCreated = false;
  try {
    const previousManifest = {
      ...CONTENT_AGENT_RULE_MANIFEST,
      articleSchema: 'article-schema-v1'
    };
    const snapshot = {
      timezone: 'Europe/Berlin',
      allowedInternalLinks: ['/kontakt'],
      allowedInternalLinksHash: canonicalSha256(['/kontakt']),
      ruleManifest: previousManifest,
      ruleManifestHash: canonicalSha256(previousManifest)
    };
    await adminPool.query(`CREATE SCHEMA "${schemaName}"`);
    schemaCreated = true;
    pool = new pg.Pool({
      connectionString,
      options: `-c search_path=${schemaName},pg_catalog`,
      statement_timeout: 5_000,
      query_timeout: 7_000
    });
    await pool.query(`
      CREATE TABLE content_jobs (
        id BIGSERIAL PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMPTZ,
        locked_by VARCHAR(180),
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ
      );
      CREATE TABLE content_runs (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL UNIQUE REFERENCES content_jobs(id),
        status VARCHAR(32) NOT NULL,
        current_stage VARCHAR(64) NOT NULL,
        post_id INTEGER,
        cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
        error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        runtime_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        finished_at TIMESTAMPTZ
      );
    `);
    const inserted = await pool.query(`
      WITH job AS (
        INSERT INTO content_jobs (
          job_type, status, attempts, max_attempts, last_error, finished_at
        )
        VALUES (
          'generate_weekly_draft', 'failed', 10, 10,
          'value too long for type character varying(80)', NOW()
        )
        RETURNING id
      )
      INSERT INTO content_runs (
        job_id, status, current_stage, cost_estimate, error_report_json,
        runtime_snapshot_json, stage_results_json, finished_at
      )
      SELECT id,
             'failed',
             'image_cleanup',
             0.660000,
             '{"code":"pipeline_failed","message":"value too long for type character varying(80)"}'::jsonb,
             $1::jsonb,
             '{
               "budget:2026-07:article_generation":{"status":"settled"},
               "article_generation":{"value":{"title":"Bezahlter Artikel"}},
               "budget:2026-07:repair:3":{"status":"settled"},
               "repair:3":{"value":{"title":"Validierte dritte Reparatur"}},
               "validation:3":{"passed":true,"issues":[]},
               "budget:2026-07:review:4":{"status":"settled"},
               "review:4":{"value":{
                 "passed":true,
                 "score":90,
                 "requiresManualReview":false,
                 "issues":[{"code":"wording_repetition","blocking":false}],
                 "risks":{
                   "currentClaims":false,
                   "legalClaims":false,
                   "privacyClaims":false,
                   "softwareVersionClaims":false,
                   "staticPrices":false
                 }
               }},
               "budget:2026-07:image_generation":{"status":"settled"},
               "image_generation":{"status":"completed","costIncurred":true},
               "cloudinary_upload":{
                 "status":"completed",
                 "imageUrl":"https://cdn.example.test/deleted.webp",
                 "publicId":"blog_images/deleted-after-rollback",
                 "bytes":321
               },
               "image_cleanup":{
                 "status":"completed",
                 "publicId":"blog_images/deleted-after-rollback"
               }
             }'::jsonb,
             NOW()
      FROM job
      RETURNING job_id
    `, [JSON.stringify(snapshot)]);
    const jobId = Number(inserted.rows[0].job_id);

    const [presentedRow] = await createContentAgentAdminRepository(pool).listJobs(10);
    assert.equal(presentedRow.draft_persistence_recoverable, true);

    const result = await recoverDraftPersistenceForAdmin({ jobId, adminId: 9 }, pool);

    assert.equal(result.recoveredStage, 'image_generation:2');
    const job = (await pool.query(
      'SELECT status, attempts, max_attempts, last_error FROM content_jobs WHERE id = $1',
      [jobId]
    )).rows[0];
    assert.deepEqual(job, {
      status: 'queued', attempts: 10, max_attempts: 11, last_error: null
    });
    const run = (await pool.query(`
      SELECT cost_estimate, error_report_json, runtime_snapshot_json, stage_results_json
      FROM content_runs
      WHERE job_id = $1
    `, [jobId])).rows[0];
    assert.equal(Number(run.cost_estimate), 0.66);
    assert.equal(run.error_report_json.code, 'draft_persistence_recovery_authorized');
    assert.equal(run.runtime_snapshot_json.ruleManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);
    assert.equal(run.stage_results_json.article_generation.value.title, 'Bezahlter Artikel');
    assert.equal(run.stage_results_json['repair:3'].value.title, 'Validierte dritte Reparatur');
    assert.equal(run.stage_results_json['review:4'].value.score, 90);
    assert.equal(run.stage_results_json['image_generation:2'], undefined);
    const audit = run.stage_results_json['draft_persistence_recovery:metadata_contract:attempt-10'];
    assert.equal(audit.imageGenerationStageId, 'image_generation:2');
    assert.equal(audit.cloudinaryUploadStageId, 'cloudinary_upload:2');
    assert.equal(audit.adminId, 9);

    assert.equal(await recoverDraftPersistenceForAdmin({ jobId, adminId: 9 }, pool), null);
  } finally {
    await pool?.end().catch(() => {});
    if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminPool.end();
  }
});

const publishRisks = {
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
};

function publishableFaq() {
  return Array.from({ length: 5 }, (_, index) => ({
    question: `Wie funktioniert Schritt ${index + 1}?`,
    answer: `Schritt ${index + 1} wird verständlich erklärt.`
  }));
}

function publishableHtml(faqItems) {
  const faqHtml = faqItems.map(({ question, answer }) => (
    `<div data-faq-question="${question}" data-faq-answer="${answer}">${question} ${answer}</div>`
  )).join('');
  return `<section>
    <h2>Sicher veröffentlichen</h2>
    <p>Der Beitrag wurde vollständig redaktionell geprüft.</p>
    <a href="/kontakt" data-track="cta" data-cta-location="blog_early" data-cta-name="blog_early_contact">Früh beraten lassen</a>
    <p>Weitere Hinweise für die sichere Umsetzung.</p>
    <a href="/kontakt" data-track="cta" data-cta-location="blog_mid" data-cta-name="blog_mid_contact">Pakete ansehen</a>
    ${faqHtml}
    <a href="/kontakt" data-track="cta" data-cta-location="blog_final" data-cta-name="blog_final_contact">Abschlussberatung anfragen</a>
  </section>`;
}

function publishQualityReport(score) {
  return {
    passed: true,
    score,
    summary: 'Der Entwurf hat die Prüfung bestanden.',
    strengths: ['Klare Struktur'],
    issues: [],
    recommendedActions: [],
    requiresManualReview: false,
    risks: publishRisks,
    focusedReview: { blocked: false, items: [], riskFlags: [], sourceCount: 0 }
  };
}

async function insertPublishableDraft(pool, suffix, score = 92) {
  const faq = publishableFaq();
  const post = await pool.query(`
    INSERT INTO posts (
      title, slug, excerpt, content, image_url, category, published, description,
      faq_json, workflow_status, meta_title, meta_description, og_title,
      og_description, image_alt, content_format, generated_by_ai
    )
    VALUES (
      $1, $2, $3, $4, $5, 'Webdesign', FALSE, $6,
      $7::jsonb, 'needs_review', $8, $9, $10,
      $11, $12, 'static_html', TRUE
    )
    RETURNING *
  `, [
    `Sicherer KI-Entwurf ${suffix}`,
    `sicherer-ki-entwurf-${suffix}`,
    'Eine sichere Kurzbeschreibung des geprüften Artikels.',
    publishableHtml(faq),
    `https://example.test/${suffix}.webp`,
    'Eine sichere Beschreibung für Suchmaschinen und Leserinnen und Leser.',
    JSON.stringify(faq),
    'Sicherer Meta Title mit passender Länge für Berlin',
    'Diese Meta Description erklärt kleinen Unternehmen verständlich und konkret den sicheren Inhalt dieses Blogartikels.',
    'Sicherer OG-Titel',
    'Sichere OG-Beschreibung',
    'Sicheres Beitragsbild'
  ]);
  const internalLinks = [
    { url: '/kontakt', label: 'Kontakt', purpose: 'Beratung' },
    { url: '/pakete', label: 'Pakete', purpose: 'Angebot' }
  ];
  await pool.query(`
    INSERT INTO content_post_metadata (
      post_id, primary_keyword, secondary_keywords, search_intent, target_audience,
      content_cluster, business_goal, cta_type, internal_links_json,
      source_references_json, quality_score, quality_report_json
    )
    VALUES (
      $1, 'Sicher veröffentlichen', '[]'::jsonb, 'commercial', 'Kleine Unternehmen',
      'Webdesign', 'Beratungsanfragen', 'contact', $2::jsonb,
      '[]'::jsonb, $3, $4::jsonb
    )
  `, [post.rows[0].id, JSON.stringify(internalLinks), score, JSON.stringify(publishQualityReport(score))]);
  return post.rows[0];
}

async function settleWithoutPostLockFailure(operations, label, timeoutMs = 5_000) {
  let timeout;
  try {
    const outcomes = await Promise.race([
      Promise.allSettled(operations),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label}: Paralleloperationen haben das Zeitlimit überschritten.`)), timeoutMs);
      })
    ]);
    for (const outcome of outcomes) {
      if (outcome.status !== 'rejected') continue;
      assert.notEqual(outcome.reason?.code, '40P01', `${label}: PostgreSQL-Deadlock`);
      assert.notEqual(outcome.reason?.code, '55P03', `${label}: Lock-Timeout`);
      assert.notEqual(outcome.reason?.code, '57014', `${label}: Statement abgebrochen`);
    }
    return outcomes;
  } finally {
    clearTimeout(timeout);
  }
}

test('echtes PostgreSQL: Migrationen 002–011 und Generate→Notify→Approve→Publish laufen genau einmal', {
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
    const schemaCheck = await pool.query('SELECT current_schema() AS current_schema');
    assert.equal(schemaCheck.rows[0].current_schema, schemaName);
    await pool.query(`
      CREATE TABLE users (id SERIAL PRIMARY KEY);
      CREATE TABLE admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        excerpt TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        image_url TEXT,
        hero_public_id TEXT,
        category TEXT NOT NULL DEFAULT '',
        featured BOOLEAN NOT NULL DEFAULT FALSE,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        description TEXT NOT NULL DEFAULT '',
        faq_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE ratgeber (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        published BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE TABLE leistungen_pages (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        is_published BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE TABLE industries (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE
      );
      INSERT INTO posts (title, slug, content, published)
      VALUES ('Alt veröffentlicht', 'alt-veroeffentlicht', '<p>Alt</p>', TRUE),
             ('Alter Entwurf', 'alter-entwurf', '<p>Entwurf</p>', FALSE);
      INSERT INTO admins (username) VALUES ('migration-admin');
    `);

    await runContentAgentMigration(pool);
    await runContentAgentMigration(pool);

    const weeklyPoolTables = await pool.query(`
      SELECT
        to_regclass('content_weekly_topic_pools')::text AS pools,
        to_regclass('content_weekly_topic_pool_selections')::text AS selections
    `);
    assert.equal(weeklyPoolTables.rows[0].pools, 'content_weekly_topic_pools');
    assert.equal(weeklyPoolTables.rows[0].selections, 'content_weekly_topic_pool_selections');

    const learningPosts = await pool.query(`
      INSERT INTO posts (
        title, slug, content, published, generated_by_ai,
        content_format, workflow_status, review_version
      ) VALUES
        ('Lernartikel 1', 'lernartikel-1', '<p>Text 1</p>', FALSE, TRUE, 'static_html', 'needs_review', 1),
        ('Lernartikel 2', 'lernartikel-2', '<p>Text 2</p>', FALSE, TRUE, 'static_html', 'needs_review', 1),
        ('Lernartikel 3', 'lernartikel-3', '<p>Text 3</p>', FALSE, TRUE, 'static_html', 'needs_review', 1),
        ('Lernartikel 4', 'lernartikel-4', '<p>Text 4</p>', FALSE, TRUE, 'static_html', 'needs_review', 1)
      RETURNING id
    `);
    const learningRepository = createContentLearningRepository(pool);
    const ctaObservation = {
      categoryKey: 'cta_repetition_or_fit',
      fingerprint: 'a'.repeat(64),
      reason: 'Mehrere Kontaktaufforderungen wiederholen denselben Impuls.',
      instruction: 'Formuliere einen CTA passend zum konkreten Entscheidungsschritt.',
      section: 'Gesamter Artikel',
      anchor: 'pruefung-gesamter-artikel',
      classificationSource: 'local',
      confidence: 0.9,
      taxonomyVersion: 'content-learning-taxonomy-v1'
    };
    for (const row of learningPosts.rows.slice(0, 2)) {
      const result = await learningRepository.recordObservationsAndMaybeProposals({
        postId: row.id,
        reviewVersion: 1,
        observations: [ctaObservation]
      });
      assert.equal(result.proposals.length, 0);
    }
    await Promise.all(learningPosts.rows.slice(2).map((row) => (
      learningRepository.recordObservationsAndMaybeProposals({
        postId: row.id,
        reviewVersion: 1,
        observations: [ctaObservation]
      })
    )));
    const learningProposalCount = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM content_learning_rule_proposals
      WHERE category_key = 'cta_repetition_or_fit' AND status = 'pending'
    `);
    assert.equal(learningProposalCount.rows[0].count, 1);
    const learningObservationCount = await pool.query(`
      SELECT COUNT(DISTINCT post_id)::int AS count
      FROM content_learning_observations
      WHERE category_key = 'cta_repetition_or_fit'
    `);
    assert.equal(learningObservationCount.rows[0].count, 4);

    const learningAdmin = await pool.query("SELECT id, username FROM admins WHERE username = 'migration-admin'");
    const pendingProposal = (await pool.query(`
      SELECT id, proposal_version, suggested_rule_text, target_stages
      FROM content_learning_rule_proposals
      WHERE category_key = 'cta_repetition_or_fit' AND status = 'pending'
    `)).rows[0];
    const activated = await learningRepository.activateProposal({
      proposalId: Number(pendingProposal.id),
      expectedVersion: Number(pendingProposal.proposal_version),
      ruleText: pendingProposal.suggested_rule_text,
      targetStages: pendingProposal.target_stages,
      admin: { id: Number(learningAdmin.rows[0].id), username: learningAdmin.rows[0].username }
    });
    assert.equal(activated.rule.status, 'active');
    assert.equal(Number(activated.rule.rule_revision), 1);
    const activeLearningRules = await learningRepository.listActiveRuleVersions();
    assert.equal(activeLearningRules.length, 1);
    assert.deepEqual(
      [Number(activeLearningRules[0].id), Number(activeLearningRules[0].version)],
      [Number(activated.rule.id), 1]
    );

    const learningJob = await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key, payload_json)
      VALUES (
        'generate_manual_draft', 'queued', 'pg-learning-rule-snapshot',
        '{"source":"integration_learning","forced_mode":"review"}'::jsonb
      )
      RETURNING *
    `);
    const learningRuntimeSnapshot = createContentAgentJobSnapshot({
      runtimeConfig: {
        operatingMode: 'review', timezone: 'Europe/Berlin', monthlyCostLimitEur: 25,
        autoPublishMinScore: 90, maxAttempts: 3, generationLeadHours: 4,
        adminNotificationEmail: 'redaktion@example.de', newsletterBlogNotificationsEnabled: false,
        manualApprovalsCount: 0, autoPublishEffective: false, maxTopicCandidates: 8,
        maxRevisions: 2, contentStageReservationEur: 0.5, reviewStageReservationEur: 0.25,
        contentInputCostPerMtok: 2.5, contentOutputCostPerMtok: 15,
        reviewInputCostPerMtok: 0.75, reviewOutputCostPerMtok: 4.5,
        imageCostEur: 0.041, contentModel: 'content', reviewModel: 'review', imageModel: 'image',
        settingsVersion: 1
      },
      claim: learningJob.rows[0],
      now: new Date('2026-07-14T10:00:00.000Z'),
      allowedInternalLinks: ['/kontakt'],
      requireAllowedInternalLinks: true,
      activeLearningRules
    });
    const learningRun = await createRun({
      jobId: Number(learningJob.rows[0].id),
      runtimeSnapshot: learningRuntimeSnapshot
    }, pool);
    const persistedLearningRun = (await pool.query(`
      SELECT runtime_snapshot_json
      FROM content_runs
      WHERE id = $1
    `, [learningRun.id])).rows[0];
    assert.deepEqual(
      persistedLearningRun.runtime_snapshot_json.learningRuleSnapshot.rules
        .map(({ id, version }) => [id, version]),
      [[Number(activated.rule.id), 1]]
    );
    const writerRules = learningRulesForStage(
      persistedLearningRun.runtime_snapshot_json.learningRuleSnapshot,
      'writer'
    );
    const writerInput = JSON.parse(buildArticleWriterPrompt({
      briefing: { topic: 'Kontrolliertes Lernen' },
      pricingContext: {},
      learningRules: writerRules
    }).user);
    assert.deepEqual(writerInput.learningRules.map(({ id, version }) => [id, version]), [
      [Number(activated.rule.id), 1]
    ]);

    const untouchedLearningPosts = await pool.query(`
      SELECT COUNT(*)::integer AS count
      FROM posts
      WHERE id = ANY($1::integer[])
        AND published = FALSE
        AND workflow_status = 'needs_review'
        AND approved_at IS NULL
        AND approved_review_version IS NULL
    `, [learningPosts.rows.map(({ id }) => Number(id))]);
    assert.equal(untouchedLearningPosts.rows[0].count, 4);
    assert.equal((await pool.query(`
      SELECT COUNT(*)::integer AS count
      FROM content_learning_events
      WHERE event_type = 'proposal_approved'
        AND rule_id = $1
    `, [activated.rule.id])).rows[0].count, 1);

    const learningDashboard = await learningRepository.getAdminDashboard();
    assert.equal(learningDashboard.rules.length, 1);
    assert.equal(learningDashboard.effectiveness.length, 1);
    await pool.query(`
      WITH finished_learning_run AS (
        UPDATE content_runs
        SET status = 'completed', current_stage = 'completed', finished_at = NOW()
        WHERE id = $1
        RETURNING id
      )
      UPDATE content_jobs
      SET status = 'completed', finished_at = NOW(), updated_at = NOW()
      WHERE id = $2
        AND EXISTS (SELECT 1 FROM finished_learning_run)
    `, [learningRun.id, learningJob.rows[0].id]);

    const generatedMetadataTypes = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (table_name, column_name) IN (
          ('content_topics', 'search_intent'),
          ('content_topics', 'content_cluster'),
          ('content_post_metadata', 'search_intent'),
          ('content_post_metadata', 'content_cluster'),
          ('content_post_metadata', 'cta_type')
        )
      ORDER BY table_name, column_name
    `);
    assert.equal(generatedMetadataTypes.rows.length, 5);
    assert.equal(generatedMetadataTypes.rows.every(({ data_type }) => data_type === 'text'), true);

    const finishJob = await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key)
      VALUES ('generate_manual_draft', 'failed', 'pg-finish-run-casts')
      RETURNING id
    `);
    const failedRun = await createRun({ jobId: finishJob.rows[0].id }, pool);
    const terminalRun = await finishRun(failedRun.id, {
      status: 'failed',
      errorReport: { code: 'TOPIC_PERSISTENCE_FAILED' }
    }, pool);
    assert.equal(terminalRun.status, 'failed');
    assert.equal(terminalRun.current_stage, 'inventory');

    const settings = await pool.query('SELECT * FROM content_agent_settings WHERE id = 1');
    assert.equal(settings.rows[0].agent_enabled, false);
    assert.equal(settings.rows[0].operating_mode, 'review');
    assert.deepEqual(settings.rows[0].schedule_weekdays, [1, 4]);
    assert.equal(settings.rows[0].generation_lead_hours, 4);
    assert.equal(settings.rows[0].admin_notification_email, 'kontakt@komplettwebdesign.de');
    assert.equal(settings.rows[0].newsletter_blog_notifications_enabled, false);
    assert.equal(settings.rows[0].schedule_revision, '1');
    const scheduleRevisions = await pool.query(`
      SELECT revision, agent_enabled, schedule_weekdays, schedule_time::text, timezone,
             generation_lead_hours, effective_at
      FROM content_agent_schedule_revisions
      ORDER BY revision
    `);
    assert.equal(scheduleRevisions.rows.length, 1);
    assert.equal(scheduleRevisions.rows[0].revision, '1');
    assert.ok(scheduleRevisions.rows[0].effective_at instanceof Date);
    assert.ok(scheduleRevisions.rows[0].effective_at.getTime() <= Date.now() - (9 * 24 * 60 * 60 * 1000));
    const latestDeliveryIndex = await pool.query(`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = 'idx_content_notification_deliveries_post_type_latest'
    `);
    assert.equal(latestDeliveryIndex.rows.length, 1);
    assert.match(
      latestDeliveryIndex.rows[0].indexdef,
      /\(post_id, notification_type, created_at DESC, id DESC\)/i
    );

    const scheduledColumns = await pool.query(`
      SELECT review_version, approved_review_version, approved_at,
             approved_by_admin_id, publication_version
      FROM posts WHERE slug = 'alter-entwurf'
    `);
    assert.deepEqual(scheduledColumns.rows[0], {
      review_version: 1,
      approved_review_version: null,
      approved_at: null,
      approved_by_admin_id: null,
      publication_version: 1
    });

    await assert.rejects(
      pool.query('UPDATE content_agent_settings SET generation_lead_hours = 0 WHERE id = 1'),
      (error) => error.code === '23514'
        && error.constraint === 'content_agent_settings_generation_lead_hours_valid'
    );
    await assert.rejects(
      pool.query('UPDATE content_agent_settings SET newsletter_blog_notifications_enabled = TRUE WHERE id = 1'),
      (error) => error.code === '23514'
        && error.constraint === 'content_agent_settings_newsletter_gate_valid'
    );

    const reviewPost = await pool.query("SELECT id FROM posts WHERE slug = 'alter-entwurf'");
    const reviewAdmin = await pool.query("SELECT id FROM admins WHERE username = 'migration-admin'");
    await pool.query(`
      UPDATE posts
      SET workflow_status = 'approved_scheduled',
          scheduled_at = '2026-07-13T16:00:00Z',
          approved_review_version = review_version,
          approved_at = NOW(),
          approved_by_admin_id = $2
      WHERE id = $1
    `, [reviewPost.rows[0].id, reviewAdmin.rows[0].id]);
    await assert.rejects(
      pool.query('UPDATE posts SET scheduled_at = NULL WHERE id = $1', [reviewPost.rows[0].id]),
      (error) => error.code === '23514'
        && error.constraint === 'posts_publication_workflow_consistent'
    );
    await pool.query(`
      UPDATE posts
      SET workflow_status = 'draft',
          scheduled_at = NULL,
          approved_review_version = NULL,
          approved_at = NULL,
          approved_by_admin_id = NULL
      WHERE id = $1
    `, [reviewPost.rows[0].id]);

    const delivery = await pool.query(`
      INSERT INTO content_notification_deliveries (
        notification_type, post_id, recipient_email, idempotency_key, payload_json
      ) VALUES (
        'admin_review', $1, 'kontakt@komplettwebdesign.de',
        'admin-review:test:1', '{"reviewVersion": 1}'::jsonb
      )
      RETURNING id
    `, [reviewPost.rows[0].id]);
    assert.ok(delivery.rows[0].id);
    await pool.query('SET enable_seqscan = off');
    const latestDeliveryPlan = await pool.query(`
      EXPLAIN (COSTS OFF)
      SELECT id, status
      FROM content_notification_deliveries
      WHERE post_id = $1
        AND notification_type = 'admin_review'
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `, [reviewPost.rows[0].id]);
    await pool.query('RESET enable_seqscan');
    assert.match(
      latestDeliveryPlan.rows.map((row) => row['QUERY PLAN']).join('\n'),
      /idx_content_notification_deliveries_post_type_latest/i
    );
    await assert.rejects(
      pool.query(`
        INSERT INTO content_notification_deliveries (
          notification_type, post_id, recipient_email, idempotency_key, payload_json
        ) VALUES ('ungültig', $1, 'kontakt@komplettwebdesign.de', 'invalid-type:test:1', '{}'::jsonb)
      `, [reviewPost.rows[0].id]),
      (error) => error.code === '23514'
        && error.constraint === 'content_notification_deliveries_type_valid'
    );
    await assert.rejects(
      pool.query(`
        INSERT INTO content_notification_deliveries (
          notification_type, post_id, recipient_email, idempotency_key, payload_json
        ) VALUES (
          'admin_review', $1, 'kontakt@komplettwebdesign.de',
          'admin-review:test:1', '{"reviewVersion": 1}'::jsonb
        )
      `, [reviewPost.rows[0].id]),
      (error) => error.code === '23505'
    );
    await assert.rejects(
      pool.query(`
        INSERT INTO content_notification_deliveries (
          notification_type, post_id, recipient_email, idempotency_key, payload_json
        ) VALUES (
          'admin_review', $1, 'kontakt@komplettwebdesign.de',
          'admin-review:missing-version', '{}'::jsonb
        )
      `, [reviewPost.rows[0].id]),
      (error) => error.code === '23514'
        && error.constraint === 'content_notification_admin_payload_valid'
    );
    await assert.rejects(
      pool.query(`
        INSERT INTO content_notification_deliveries (
          notification_type, post_id, recipient_email, idempotency_key, payload_json
        ) VALUES (
          'admin_review', $1, 'kontakt@komplettwebdesign.de',
          'admin-review:non-positive-version', '{"reviewVersion": 0}'::jsonb
        )
      `, [reviewPost.rows[0].id]),
      (error) => error.code === '23514'
        && error.constraint === 'content_notification_admin_payload_valid'
    );
    await assert.rejects(
      pool.query(`
        INSERT INTO content_notification_deliveries (
          notification_type, post_id, recipient_email, idempotency_key, payload_json
        ) VALUES (
          'admin_review', $1, 'kontakt@komplettwebdesign.de',
          'admin-review:different-key', '{"reviewVersion": 1}'::jsonb
        )
      `, [reviewPost.rows[0].id]),
      (error) => error.code === '23505'
        && error.constraint === 'ux_content_notification_deliveries_admin_review'
    );
    await pool.query(`
      INSERT INTO content_notification_deliveries (
        notification_type, post_id, recipient_id, recipient_email,
        idempotency_key, payload_json
      ) VALUES (
        'newsletter_article', $1, 77, 'leser@example.test',
        'newsletter:test:1', '{"publicationVersion": 1}'::jsonb
      )
    `, [reviewPost.rows[0].id]);
    await assert.rejects(
      pool.query(`
        INSERT INTO content_notification_deliveries (
          notification_type, post_id, recipient_id, recipient_email,
          idempotency_key, payload_json
        ) VALUES (
          'newsletter_article', $1, 77, 'leser@example.test',
          'newsletter:different-key', '{"publicationVersion": 1}'::jsonb
        )
      `, [reviewPost.rows[0].id]),
      (error) => error.code === '23505'
        && error.constraint === 'ux_content_notification_deliveries_newsletter_article'
    );
    await assert.rejects(
      pool.query(`
        INSERT INTO content_notification_deliveries (
          notification_type, post_id, recipient_id, recipient_email,
          idempotency_key, payload_json
        ) VALUES (
          'newsletter_article', $1, 77, 'leser@example.test',
          'newsletter:missing-version', '{}'::jsonb
        )
      `, [reviewPost.rows[0].id]),
      (error) => error.code === '23514'
        && error.constraint === 'content_notification_newsletter_payload_valid'
    );

    await pool.query(`
      ALTER TABLE content_notification_deliveries
        DROP CONSTRAINT IF EXISTS content_notification_admin_payload_valid,
        DROP CONSTRAINT IF EXISTS content_notification_newsletter_payload_valid;
      DROP INDEX ux_content_notification_deliveries_admin_review;
      DROP INDEX ux_content_notification_deliveries_newsletter_article;
    `);
    await pool.query(`
      INSERT INTO content_notification_deliveries (
        notification_type, post_id, recipient_id, recipient_email,
        idempotency_key, payload_json, created_at
      ) VALUES
        ('admin_review', $1, NULL, 'kontakt@komplettwebdesign.de',
         'legacy-admin-invalid', '{}'::jsonb, '2026-01-01T00:00:00Z'),
        ('newsletter_article', $1, 78, 'alt@example.test',
         'legacy-newsletter-invalid', '{"publicationVersion": 0}'::jsonb, '2026-01-01T00:00:00Z'),
        ('admin_review', $1, NULL, 'kontakt@komplettwebdesign.de',
         'legacy-admin-duplicate-a', '{"reviewVersion": 2}'::jsonb, '2026-01-02T00:00:00Z'),
        ('admin_review', $1, NULL, 'kontakt@komplettwebdesign.de',
         'legacy-admin-duplicate-b', '{"reviewVersion": 2}'::jsonb, '2026-01-03T00:00:00Z'),
        ('newsletter_article', $1, 78, 'alt@example.test',
         'legacy-newsletter-duplicate-a', '{"publicationVersion": 2}'::jsonb, '2026-01-02T00:00:00Z'),
        ('newsletter_article', $1, 78, 'alt@example.test',
         'legacy-newsletter-duplicate-b', '{"publicationVersion": 2}'::jsonb, '2026-01-03T00:00:00Z')
    `, [reviewPost.rows[0].id]);
    await runContentAgentMigration(pool);
    const repairedDeliveries = await pool.query(`
      SELECT idempotency_key, status, last_error_code,
             payload_json ->> 'reviewVersion' AS review_version,
             payload_json ->> 'publicationVersion' AS publication_version
      FROM content_notification_deliveries
      WHERE idempotency_key LIKE 'legacy-%'
      ORDER BY idempotency_key
    `);
    assert.deepEqual(repairedDeliveries.rows, [
      {
        idempotency_key: 'legacy-admin-duplicate-a', status: 'queued', last_error_code: null,
        review_version: '2', publication_version: null
      },
      {
        idempotency_key: 'legacy-admin-duplicate-b', status: 'cancelled',
        last_error_code: 'migration_duplicate_delivery', review_version: '2', publication_version: null
      },
      {
        idempotency_key: 'legacy-admin-invalid', status: 'cancelled',
        last_error_code: 'migration_invalid_admin_review_payload', review_version: '1', publication_version: null
      },
      {
        idempotency_key: 'legacy-newsletter-duplicate-a', status: 'queued', last_error_code: null,
        review_version: null, publication_version: '2'
      },
      {
        idempotency_key: 'legacy-newsletter-duplicate-b', status: 'cancelled',
        last_error_code: 'migration_duplicate_delivery', review_version: null, publication_version: '2'
      },
      {
        idempotency_key: 'legacy-newsletter-invalid', status: 'cancelled',
        last_error_code: 'migration_invalid_newsletter_article_payload',
        review_version: null, publication_version: '1'
      }
    ]);

    const preexistingIndexes = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname IN (
          'ux_content_post_audits_job_post_type',
          'ux_content_post_revisions_draft_audit',
          'ux_content_post_revisions_draft_post'
        )
      ORDER BY indexname
    `);
    assert.deepEqual(preexistingIndexes.rows.map(({ indexname }) => indexname), [
      'ux_content_post_audits_job_post_type',
      'ux_content_post_revisions_draft_audit',
      'ux_content_post_revisions_draft_post'
    ]);
    const duplicateJob = await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key)
      VALUES ('audit_existing_posts', 'completed', 'pg-duplicate-audit-migration') RETURNING id
    `);
    const publishedPost = await pool.query("SELECT id FROM posts WHERE slug = 'alt-veroeffentlicht'");
    const firstAudit = await pool.query(`
      INSERT INTO content_post_audits (post_id, job_id, audit_type, score, status, created_at)
      VALUES ($1, $2, 'local_content_v1', 70, 'revision_created', '2026-01-02T00:00:00Z') RETURNING id
    `, [publishedPost.rows[0].id, duplicateJob.rows[0].id]);
    await pool.query('DROP INDEX ux_content_post_audits_job_post_type');
    const secondAudit = await pool.query(`
      INSERT INTO content_post_audits (post_id, job_id, audit_type, score, status, created_at)
      VALUES ($1, $2, 'local_content_v1', 80, 'open', '2026-01-01T00:00:00Z') RETURNING id
    `, [publishedPost.rows[0].id, duplicateJob.rows[0].id]);
    const snapshot = JSON.stringify({ base: {}, fields: {} });
    await pool.query('DROP INDEX ux_content_post_revisions_draft_post');
    await pool.query(`
      INSERT INTO content_post_revisions (post_id, audit_id, snapshot_json, status, created_at)
      VALUES
        ($1, $2, $4::jsonb, 'draft', '2026-01-01T00:00:00Z'),
        ($1, $3, $4::jsonb, 'draft', '2026-01-03T00:00:00Z')
    `, [publishedPost.rows[0].id, firstAudit.rows[0].id, secondAudit.rows[0].id, snapshot]);

    await runContentAgentMigration(pool);
    const deduplicated = await pool.query(`
      SELECT audit.id, audit.status,
             COUNT(revision.id)::int AS revision_count,
             COUNT(*) FILTER (WHERE revision.status = 'draft')::int AS draft_count,
             COUNT(*) FILTER (WHERE revision.status = 'rejected')::int AS rejected_count,
             COUNT(*) FILTER (WHERE revision.audit_id = audit.id)::int AS matching_fk_count
      FROM content_post_audits audit
      LEFT JOIN content_post_revisions revision ON revision.audit_id = audit.id
      WHERE audit.job_id = $1 AND audit.post_id = $2 AND audit.audit_type = 'local_content_v1'
      GROUP BY audit.id, audit.status
    `, [duplicateJob.rows[0].id, publishedPost.rows[0].id]);
    assert.equal(deduplicated.rows.length, 1);
    assert.deepEqual(deduplicated.rows[0], {
      id: String(secondAudit.rows[0].id),
      status: 'revision_created',
      revision_count: 2,
      draft_count: 1,
      rejected_count: 1,
      matching_fk_count: 2
    });
    const rebuiltIndexes = await pool.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname IN (
          'ux_content_post_audits_job_post_type',
          'ux_content_post_revisions_draft_audit',
          'ux_content_post_revisions_draft_post'
        )
      ORDER BY indexname
    `);
    assert.equal(rebuiltIndexes.rows.length, 3);
    assert.ok(rebuiltIndexes.rows.every(({ indexdef }) => /CREATE UNIQUE INDEX/i.test(indexdef)));
    await runContentAgentMigration(pool);
    const secondPass = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM content_post_audits WHERE job_id = $1) AS audit_count,
        (SELECT COUNT(*)::int FROM content_post_revisions revision
         JOIN content_post_audits audit ON audit.id = revision.audit_id
         WHERE audit.job_id = $1) AS revision_count
    `, [duplicateJob.rows[0].id]);
    assert.deepEqual(secondPass.rows[0], { audit_count: 1, revision_count: 2 });

    const nullJobPost = await pool.query(`
      INSERT INTO posts (
        title, slug, content, published, workflow_status, content_format
      ) VALUES (
        'Separater Revisionsentwurf', 'separater-revisionsentwurf', '<p>Entwurf</p>',
        FALSE, 'draft', 'legacy_ejs'
      )
      RETURNING id
    `);
    const nullJobAudit = await pool.query(`
      INSERT INTO content_post_audits (post_id, job_id, audit_type, score, status)
      VALUES ($1, NULL, 'legacy_null_job', 60, 'open') RETURNING id
    `, [nullJobPost.rows[0].id]);
    await pool.query('DROP INDEX ux_content_post_revisions_draft_audit');
    await pool.query('DROP INDEX ux_content_post_revisions_draft_post');
    await pool.query(`
      INSERT INTO content_post_revisions (
        post_id, audit_id, snapshot_json, status, created_at, updated_at, approved_at
      ) VALUES
        ($1, $2, $3::jsonb, 'draft', '2026-02-01T00:00:00Z', '2026-02-02T00:00:00Z', NULL),
        ($1, $2, $3::jsonb, 'draft', '2026-02-03T00:00:00Z', '2026-02-04T00:00:00Z', NULL),
        ($1, $2, $3::jsonb, 'approved', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')
    `, [nullJobPost.rows[0].id, nullJobAudit.rows[0].id, snapshot]);
    await runContentAgentMigration(pool);
    const nullJobState = await pool.query(`
      SELECT audit.status,
             COUNT(*) FILTER (WHERE revision.status = 'draft')::int AS draft_count,
             COUNT(*) FILTER (WHERE revision.status = 'rejected')::int AS rejected_count,
             COUNT(*) FILTER (WHERE revision.status = 'approved')::int AS approved_count,
             MIN(revision.revision_version) FILTER (WHERE revision.status = 'rejected')::int AS rejected_version,
             BOOL_AND(revision.audit_id = audit.id) AS all_repointed
      FROM content_post_audits audit
      JOIN content_post_revisions revision ON revision.audit_id = audit.id
      WHERE audit.id = $1
      GROUP BY audit.id, audit.status
    `, [nullJobAudit.rows[0].id]);
    assert.deepEqual(nullJobState.rows[0], {
      status: 'revision_created',
      draft_count: 1,
      rejected_count: 1,
      approved_count: 1,
      rejected_version: 2,
      all_repointed: true
    });
    const nullJobBeforeRerun = await pool.query(`
      SELECT id, status, revision_version, updated_at
      FROM content_post_revisions WHERE audit_id = $1 ORDER BY id
    `, [nullJobAudit.rows[0].id]);
    await runContentAgentMigration(pool);
    const nullJobAfterRerun = await pool.query(`
      SELECT id, status, revision_version, updated_at
      FROM content_post_revisions WHERE audit_id = $1 ORDER BY id
    `, [nullJobAudit.rows[0].id]);
    assert.deepEqual(nullJobAfterRerun.rows, nullJobBeforeRerun.rows);
    const nullJobDraftIndexes = await pool.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname IN (
          'ux_content_post_revisions_draft_audit',
          'ux_content_post_revisions_draft_post'
        )
      ORDER BY indexname
    `);
    assert.equal(nullJobDraftIndexes.rows.length, 2);
    assert.ok(nullJobDraftIndexes.rows.every(({ indexdef }) => /CREATE UNIQUE INDEX/i.test(indexdef)));

    const optimizationPost = await pool.query(`
      INSERT INTO posts (
        title, slug, excerpt, content, published, workflow_status, content_format,
        meta_title, meta_description, og_title, og_description, faq_json,
        image_url, image_alt, published_at
      ) VALUES (
        'Parallel geprüfter Artikel', 'parallel-gepruefter-artikel', 'Ausgangsfassung',
        '<section><h2>Ausgang</h2><p>Bestehender Text.</p></section>', TRUE,
        'published', 'static_html', 'Ausgangstitel', 'Ausgangsbeschreibung',
        'Ausgangstitel', 'Ausgangsbeschreibung', '[]'::jsonb,
        '/uploads/parallel.webp', 'Ausgangsbild', NOW()
      )
      RETURNING *
    `);
    const optimizationJob = await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key, payload_json)
      VALUES (
        'optimize_existing_post', 'completed', 'pg-existing-optimization-race',
        jsonb_build_object('post_id', $1::integer)
      )
      RETURNING id
    `, [optimizationPost.rows[0].id]);
    const originRuntimeSnapshot = createContentAgentJobSnapshot({
      runtimeConfig: {
        operatingMode: 'review', timezone: 'Europe/Berlin', monthlyCostLimitEur: 25,
        maxAttempts: 3, contentStageReservationEur: 0.5, reviewStageReservationEur: 0.25,
        contentInputCostPerMtok: 2.5, contentOutputCostPerMtok: 15,
        reviewInputCostPerMtok: 0.75, reviewOutputCostPerMtok: 4.5,
        webSearchCostPerCallEur: 0.01, settingsVersion: 4
      },
      claim: {
        job_type: 'optimize_existing_post',
        payload_json: { source: 'admin_existing_content' }
      },
      now: new Date('2026-07-14T10:30:00.000Z'),
      allowedInternalLinks: ['/kontakt'],
      existingPostTrustedContext: { existingSlugs: [], metadata: null },
      activeLearningRules: []
    });
    await createRun({
      jobId: Number(optimizationJob.rows[0].id),
      runtimeSnapshot: originRuntimeSnapshot
    }, pool);
    const optimizationRepository = createContentExistingPostOptimizationRepository(pool);
    const auditInput = {
      postId: Number(optimizationPost.rows[0].id),
      jobId: Number(optimizationJob.rows[0].id),
      runId: null,
      auditType: 'parallel_existing_post_v1',
      score: 72,
      findings: [{ code: 'metadata_quality' }],
      recommendedActions: [{ field: 'meta_title' }]
    };
    const concurrentAudits = await Promise.all([
      optimizationRepository.createAuditIdempotent(auditInput),
      optimizationRepository.createAuditIdempotent(auditInput)
    ]);
    assert.equal(concurrentAudits[0].id, concurrentAudits[1].id);
    assert.equal((await pool.query(`
      SELECT COUNT(*)::integer AS count
      FROM content_post_audits
      WHERE job_id = $1 AND post_id = $2 AND audit_type = $3
    `, [auditInput.jobId, auditInput.postId, auditInput.auditType])).rows[0].count, 1);

    const optimizationSnapshot = createRevisionSnapshot(optimizationPost.rows[0]);
    optimizationSnapshot.fields.meta_title = 'Verbesserter Metatitel';
    const optimizationReport = {
      ...buildExistingPostDiff({
        before: { metaTitle: optimizationPost.rows[0].meta_title },
        after: { metaTitle: optimizationSnapshot.fields.meta_title }
      }),
      baseLiveHash: optimizationSnapshot.base.live_hash,
      beforeScore: 72,
      afterScore: 92,
      sources: [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }]
    };
    const raceRevision = await pool.query(`
      INSERT INTO content_post_revisions (
        post_id, audit_id, snapshot_json, status, revision_version,
        optimization_job_id, optimization_report_json
      ) VALUES ($1, $2, $3::jsonb, 'draft', 3, $4, $5::jsonb)
      RETURNING id
    `, [
      auditInput.postId,
      concurrentAudits[0].id,
      JSON.stringify(optimizationSnapshot),
      auditInput.jobId,
      JSON.stringify(optimizationReport)
    ]);
    await pool.query(
      "UPDATE content_post_audits SET status = 'revision_created' WHERE id = $1",
      [concurrentAudits[0].id]
    );
    const optimizationAdmin = (await pool.query(
      "SELECT id, username FROM admins WHERE username = 'migration-admin'"
    )).rows[0];

    const mismatchedOptimizationJob = await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key, payload_json)
      VALUES (
        'optimize_existing_post', 'completed', 'pg-existing-optimization-mismatch',
        jsonb_build_object('post_id', $1::integer)
      )
      RETURNING id
    `, [auditInput.postId]);
    await pool.query(
      'UPDATE content_post_audits SET job_id = $2 WHERE id = $1',
      [concurrentAudits[0].id, mismatchedOptimizationJob.rows[0].id]
    );
    await assert.rejects(optimizationRepository.updateRevisionAfterRevert({
      revisionId: Number(raceRevision.rows[0].id),
      expectedVersion: 3,
      changeId: optimizationReport.changes[0].id,
      validateSnapshot: async () => {},
      admin: { id: Number(optimizationAdmin.id), username: optimizationAdmin.username }
    }), { code: 'CONTENT_REVISION_CONFLICT' });
    const mismatchState = (await pool.query(`
      SELECT revision_version,
             (SELECT COUNT(*)::integer
              FROM content_revision_optimization_feedback feedback
              WHERE feedback.revision_id = revision.id) AS feedback_count
      FROM content_post_revisions revision
      WHERE revision.id = $1
    `, [raceRevision.rows[0].id])).rows[0];
    assert.equal(mismatchState.revision_version, 3);
    assert.equal(mismatchState.feedback_count, 0);
    await pool.query(
      'UPDATE content_post_audits SET job_id = $2 WHERE id = $1',
      [concurrentAudits[0].id, auditInput.jobId]
    );

    const revisionRace = await settleWithoutPostLockFailure([
      optimizationRepository.updateRevisionAfterRevert({
        revisionId: Number(raceRevision.rows[0].id),
        expectedVersion: 3,
        changeId: optimizationReport.changes[0].id,
        validateSnapshot: async () => {},
        admin: { id: Number(optimizationAdmin.id), username: optimizationAdmin.username }
      }),
      optimizationRepository.updateRevisionAfterRevert({
        revisionId: Number(raceRevision.rows[0].id),
        expectedVersion: 3,
        changeId: optimizationReport.changes[0].id,
        validateSnapshot: async () => {},
        admin: { id: Number(optimizationAdmin.id), username: optimizationAdmin.username }
      })
    ], 'identische Rücknahme gegen identische Rücknahme');
    assert.equal(
      revisionRace.filter(({ status }) => status === 'fulfilled').length,
      1,
      JSON.stringify(revisionRace.map((outcome) => ({
        status: outcome.status,
        code: outcome.reason?.code,
        message: outcome.reason?.message
      })))
    );
    const raceFailure = revisionRace.find(({ status }) => status === 'rejected');
    assert.equal(raceFailure?.reason?.code, 'CONTENT_REVISION_CONFLICT');
    const persistedRaceRevision = (await pool.query(`
      SELECT status, revision_version, snapshot_json, optimization_report_json,
             (SELECT COUNT(*)::integer
              FROM content_revision_optimization_feedback feedback
              WHERE feedback.revision_id = revision.id) AS feedback_count
      FROM content_post_revisions revision
      WHERE revision.id = $1
    `, [raceRevision.rows[0].id])).rows[0];
    assert.equal(persistedRaceRevision.status, 'draft');
    assert.equal(persistedRaceRevision.revision_version, 4);
    assert.equal(persistedRaceRevision.feedback_count, 1);
    assert.equal(persistedRaceRevision.snapshot_json.fields.meta_title, 'Ausgangstitel');
    assert.equal(persistedRaceRevision.optimization_report_json.changes[0].status, 'reverted');
    assert.equal(persistedRaceRevision.optimization_report_json.revalidation.status, 'pending');
    assert.equal(persistedRaceRevision.optimization_report_json.revalidation.revisionVersion, 4);
    assert.equal(persistedRaceRevision.optimization_report_json.revalidation.minimumScore, 80);
    assert.match(
      persistedRaceRevision.optimization_report_json.revalidation.snapshotFingerprint,
      /^[0-9a-f]{64}$/
    );
    const revalidationJobs = await pool.query(`
      SELECT id, status, idempotency_key, payload_json
      FROM content_jobs
      WHERE job_type = 'revalidate_existing_post_revision'
        AND (payload_json ->> 'revision_id')::bigint = $1::bigint
      ORDER BY id
    `, [raceRevision.rows[0].id]);
    assert.equal(revalidationJobs.rows.length, 1);
    assert.deepEqual(revalidationJobs.rows[0].payload_json, {
      source: 'revision_revalidation',
      revision_id: Number(raceRevision.rows[0].id),
      revision_version: 4,
      snapshot_fingerprint:
        persistedRaceRevision.optimization_report_json.revalidation.snapshotFingerprint
    });
    assert.match(revalidationJobs.rows[0].idempotency_key, /^existing-post-revalidation:/);
    const revalidationContext = await optimizationRepository.loadRevisionRevalidationContext({
      revisionId: Number(raceRevision.rows[0].id),
      revisionVersion: 4,
      snapshotFingerprint:
        persistedRaceRevision.optimization_report_json.revalidation.snapshotFingerprint
    });
    assert.equal(Number(revalidationContext.audit.job_id), auditInput.jobId);
    assert.deepEqual(
      revalidationContext.runtimeSnapshot,
      JSON.parse(JSON.stringify(originRuntimeSnapshot))
    );
    await assert.rejects(optimizationRepository.loadRevisionRevalidationContext({
      revisionId: Number(raceRevision.rows[0].id),
      revisionVersion: 4,
      snapshotFingerprint: 'f'.repeat(64)
    }), { code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST' });
    const boundOriginRun = (await pool.query(`
      SELECT id, runtime_snapshot_json
      FROM content_runs
      WHERE job_id = $1::bigint
      ORDER BY id DESC
      LIMIT 1
    `, [auditInput.jobId])).rows[0];
    await pool.query(`
      UPDATE content_post_audits
      SET status = 'open'
      WHERE id = $1::bigint
    `, [revalidationContext.audit.id]);
    await pool.query(`
      UPDATE content_runs
      SET runtime_snapshot_json = '{}'::jsonb
      WHERE id = $1::bigint
    `, [boundOriginRun.id]);
    await optimizationRepository.failRevisionRevalidation({
      revisionId: Number(raceRevision.rows[0].id),
      revisionVersion: 4,
      snapshotFingerprint:
        persistedRaceRevision.optimization_report_json.revalidation.snapshotFingerprint,
      failureCode: 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'
    });
    await assert.rejects(optimizationRepository.failRevisionRevalidation({
      revisionId: Number(raceRevision.rows[0].id),
      revisionVersion: 4,
      snapshotFingerprint:
        persistedRaceRevision.optimization_report_json.revalidation.snapshotFingerprint,
      failureCode: 'CONTENT_REVISION_STALE'
    }), { code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST' });
    const failedRevalidation = await pool.query(`
      SELECT optimization_report_json -> 'revalidation' AS revalidation
      FROM content_post_revisions
      WHERE id = $1
    `, [raceRevision.rows[0].id]);
    assert.equal(failedRevalidation.rows[0].revalidation.status, 'failed');
    assert.equal(
      failedRevalidation.rows[0].revalidation.snapshotFingerprint,
      persistedRaceRevision.optimization_report_json.revalidation.snapshotFingerprint
    );
    assert.equal(
      failedRevalidation.rows[0].revalidation.failureCode,
      'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'
    );
    await pool.query(`
      UPDATE content_post_audits
      SET status = 'revision_created'
      WHERE id = $1::bigint
    `, [revalidationContext.audit.id]);
    await pool.query(`
      UPDATE content_runs
      SET runtime_snapshot_json = $1::jsonb
      WHERE id = $2::bigint
    `, [JSON.stringify(boundOriginRun.runtime_snapshot_json), boundOriginRun.id]);
    const failedRecoveryContext = await optimizationRepository.loadRevisionRevalidationContext({
      revisionId: Number(raceRevision.rows[0].id),
      revisionVersion: 4,
      snapshotFingerprint:
        persistedRaceRevision.optimization_report_json.revalidation.snapshotFingerprint
    });
    assert.equal(failedRecoveryContext.revalidationState, 'failed');
    assert.equal(
      failedRecoveryContext.revision.optimization_report_json.revalidation.failureCode,
      'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'
    );
    await pool.query(`
      UPDATE content_jobs
      SET status = 'completed', finished_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [revalidationJobs.rows[0].id]);

    await optimizationRepository.rejectRevision({
      revisionId: Number(raceRevision.rows[0].id),
      expectedVersion: 4,
      admin: { id: Number(optimizationAdmin.id), username: optimizationAdmin.username }
    });
    const rejectedRaceRevision = (await pool.query(`
      SELECT status, revision_version,
             (SELECT COUNT(*)::integer
              FROM content_revision_optimization_feedback feedback
              WHERE feedback.revision_id = revision.id) AS feedback_count
      FROM content_post_revisions revision
      WHERE revision.id = $1
    `, [raceRevision.rows[0].id])).rows[0];
    assert.equal(rejectedRaceRevision.status, 'rejected');
    assert.equal(rejectedRaceRevision.revision_version, 5);
    assert.equal(rejectedRaceRevision.feedback_count, 2);

    const adminForeignKeys = await pool.query(`
      SELECT tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'admin_id'
        AND ccu.table_name = 'admins'
        AND tc.table_name IN (
          'content_agent_setting_revisions',
          'content_publish_events',
          'content_post_revisions'
        )
      ORDER BY tc.table_name
    `);
    assert.deepEqual(adminForeignKeys.rows.map(({ table_name }) => table_name), [
      'content_agent_setting_revisions',
      'content_post_revisions',
      'content_publish_events'
    ]);

    await pool.query('ALTER TABLE content_jobs DROP CONSTRAINT content_jobs_status_valid');
    await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key)
      VALUES ('generate_manual_draft', 'cancelled', 'bestehend-abgebrochen')
    `);
    await runContentAgentMigration(pool);
    await runContentAgentMigration(pool);
    const cancelled = await pool.query("SELECT status FROM content_jobs WHERE idempotency_key = 'bestehend-abgebrochen'");
    assert.equal(cancelled.rows[0].status, 'cancelled');

    const migrated = await pool.query('SELECT slug, published, workflow_status, published_at FROM posts ORDER BY id');
    assert.equal(migrated.rows[0].workflow_status, 'published');
    assert.ok(migrated.rows[0].published_at);
    assert.equal(migrated.rows[1].workflow_status, 'draft');
    assert.equal(migrated.rows[1].published_at, null);

    const manual = await BlogPostModel.create({
      title: 'Manueller Artikel',
      slug: 'manueller-artikel',
      content: '<p>Manuell</p>',
      hero_image: '/manual.webp',
      published: true
    }, pool);
    assert.equal(manual.workflow_status, 'published');
    assert.ok(manual.published_at);
    const unpublished = await BlogPostModel.update(manual.id, { published: false }, pool);
    assert.equal(unpublished.workflow_status, 'draft');
    assert.equal(unpublished.published_at, null);
    const republished = await BlogPostModel.update(manual.id, { published: true }, pool);
    assert.equal(republished.workflow_status, 'published');
    assert.ok(republished.published_at);

    await pool.query('UPDATE content_agent_settings SET manual_approvals_count = 0 WHERE id = 1');
    const publicationAdmin = await pool.query("SELECT id, username FROM admins WHERE username = 'migration-admin'");
    const publishable = await insertPublishableDraft(pool, 'parallel');
    const publicationService = createContentPublicationService({ db: pool });
    const publicationOutcomes = await Promise.allSettled([
      publicationService.publishDraftManually({ postId: publishable.id, admin: publicationAdmin.rows[0], confirmed: true }),
      publicationService.publishDraftManually({ postId: publishable.id, admin: publicationAdmin.rows[0], confirmed: true })
    ]);
    assert.deepEqual(
      publicationOutcomes.map(({ status }) => status).sort(),
      ['fulfilled', 'rejected']
    );
    assert.equal(
      publicationOutcomes.find(({ status }) => status === 'rejected').reason.code,
      'CONTENT_DRAFT_NOT_PUBLISHABLE'
    );
    const publicationState = await pool.query(`
      SELECT p.published, p.workflow_status,
             (SELECT COUNT(*)::int FROM content_publish_events WHERE post_id = p.id AND decision = 'manual') AS event_count,
             (SELECT manual_approvals_count FROM content_agent_settings WHERE id = 1) AS approval_count
      FROM posts p WHERE p.id = $1
    `, [publishable.id]);
    assert.deepEqual(publicationState.rows[0], {
      published: true,
      workflow_status: 'published',
      event_count: 1,
      approval_count: 1
    });

    const rejectable = await insertPublishableDraft(pool, 'manual-reject-version');
    const rejected = await publicationService.rejectDraft({
      postId: rejectable.id,
      expectedReviewVersion: Number(rejectable.review_version),
      admin: publicationAdmin.rows[0],
      reason: 'Fachlich nicht passend',
      confirmed: true
    });
    assert.equal(rejected.post.workflow_status, 'rejected');
    assert.equal(rejected.post.published, false);
    assert.equal((await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM content_publish_events
      WHERE post_id = $1
        AND decision = 'blocked'
    `, [rejectable.id])).rows[0].count, 1);

    const autoJob = await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key)
      VALUES ('generate_manual_draft', 'completed', 'pg-auto-publish-once')
      RETURNING id
    `);
    const autoScheduledAt = new Date(Date.now() + 60_000);
    const autoStartedAt = new Date(Date.now() - 1_000);
    const autoSnapshot = {
      operatingMode: 'auto_publish',
      forcedMode: null,
      autoPublishEffective: true,
      manualApprovalsCount: 8,
      autoPublishMinScore: 90,
      settingsVersion: 1,
      publicationAt: autoScheduledAt.toISOString(),
      startedAt: autoStartedAt.toISOString(),
      source: 'postgres-integration'
    };
    const autoRun = await createRun({
      jobId: autoJob.rows[0].id,
      runtimeSnapshot: autoSnapshot
    }, pool);
    const autoDraft = await insertPublishableDraft(pool, 'auto-once');
    await pool.query(
      'UPDATE posts SET generation_run_id = $2, scheduled_at = $3 WHERE id = $1',
      [autoDraft.id, autoRun.id, autoScheduledAt]
    );

    const autoScheduledService = createScheduledPublicationService({ db: pool });
    const firstAuto = await autoScheduledService.approveAutomaticallyForSchedule({
      postId: autoDraft.id,
      runId: autoRun.id,
      scheduledAt: autoScheduledAt.toISOString(),
      snapshot: autoSnapshot,
      leaseGuard: async () => true
    });
    const retryAuto = await autoScheduledService.approveAutomaticallyForSchedule({
      postId: autoDraft.id,
      runId: autoRun.id,
      scheduledAt: autoScheduledAt.toISOString(),
      snapshot: autoSnapshot,
      leaseGuard: async () => true
    });
    assert.equal(firstAuto.event.id, retryAuto.event.id);
    assert.equal(firstAuto.post.published, false);
    assert.equal(firstAuto.post.workflow_status, 'approved_scheduled');
    assert.equal(retryAuto.post.published, false);
    assert.equal(retryAuto.job.id, firstAuto.job.id);

    const publishEventRepository = createContentPublishEventRepository(pool);
    const conflictingBlocked = await publishEventRepository.insertAutoEvent({
      postId: autoDraft.id,
      runId: autoRun.id,
      decision: 'blocked',
      policyVersion: 'auto-v1',
      qualityScore: 92,
      reasons: ['forced_review'],
      context: {
        action: 'auto_schedule_policy', settingsVersion: 1,
        source: 'postgres-integration', forcedMode: 'review',
        approvalVersion: 1, publicationVersion: 1,
        scheduledAt: autoScheduledAt.toISOString()
      }
    }, pool);
    assert.equal(conflictingBlocked, null);

    const autoState = await pool.query(`
      SELECT p.published, p.workflow_status,
             (SELECT COUNT(*)::int FROM content_publish_events
              WHERE run_id = $2 AND policy_version = 'auto-v1') AS event_count,
             (SELECT manual_approvals_count FROM content_agent_settings WHERE id = 1) AS approval_count
      FROM posts p WHERE p.id = $1
    `, [autoDraft.id, autoRun.id]);
    assert.deepEqual(autoState.rows[0], {
      published: false,
      workflow_status: 'approved_scheduled',
      event_count: 1,
      approval_count: 1
    });

    await assert.rejects(
      autoScheduledService.approveAutomaticallyForSchedule({
        postId: autoDraft.id,
        runId: autoRun.id,
        scheduledAt: autoScheduledAt.toISOString(),
        snapshot: { ...autoSnapshot, operatingMode: 'review', forcedMode: 'review' },
        leaseGuard: async () => true
      }),
      (error) => error.code === 'CONTENT_APPROVAL_STALE'
    );
    assert.equal(
      (await pool.query(`
        SELECT COUNT(*)::int AS count FROM content_publish_events
        WHERE run_id = $1 AND policy_version = 'auto-v1'
      `, [autoRun.id])).rows[0].count,
      1
    );

    await assert.rejects(
      pool.query("UPDATE content_publish_events SET policy_version = 'mutated' WHERE post_id = $1", [publishable.id]),
      /unveränderlich/i
    );
    await assert.rejects(
      pool.query('DELETE FROM content_publish_events WHERE post_id = $1', [publishable.id]),
      /unveränderlich/i
    );
    await assert.rejects(
      BlogPostModel.delete(publishable.id, pool),
      (error) => error.code === 'BLOG_POST_DELETE_RESTRICTED'
    );
    await assert.rejects(
      pool.query('DELETE FROM posts WHERE id = $1', [publishable.id]),
      (error) => error.code === '23503'
        && error.constraint === 'content_publish_events_post_id_fkey'
    );

    const inconsistent = await insertPublishableDraft(pool, 'existing-event');
    await pool.query(`
      INSERT INTO content_publish_events (
        post_id, decision, policy_version, quality_score, admin_id, admin_username
      ) VALUES ($1, 'manual', 'manual-v1', 92, $2, $3)
    `, [inconsistent.id, publicationAdmin.rows[0].id, publicationAdmin.rows[0].username]);
    await assert.rejects(
      publicationService.publishDraftManually({ postId: inconsistent.id, admin: publicationAdmin.rows[0], confirmed: true }),
      (error) => error.code === 'CONTENT_DRAFT_NOT_PUBLISHABLE'
    );
    const rolledBack = await pool.query(`
      SELECT published, workflow_status,
             (SELECT manual_approvals_count FROM content_agent_settings WHERE id = 1) AS approval_count
      FROM posts WHERE id = $1
    `, [inconsistent.id]);
    assert.deepEqual(rolledBack.rows[0], {
      published: false,
      workflow_status: 'needs_review',
      approval_count: 1
    });

    await runContentAgentMigration(pool);
    const publishEventDeleteRule = await pool.query(`
      SELECT rc.delete_rule
      FROM information_schema.referential_constraints rc
      WHERE rc.constraint_name = 'content_publish_events_post_id_fkey'
    `);
    assert.equal(publishEventDeleteRule.rows[0].delete_rule, 'RESTRICT');
    assert.equal(
      (await pool.query('SELECT COUNT(*)::int AS count FROM content_publish_events')).rows[0].count,
      4
    );

    const regenerationRepository = createDraftRegenerationRepository(pool);
    const reviewOptimizationRepository = createContentReviewIssueOptimizationRepository(pool);
    const optimizationDraft = await insertPublishableDraft(pool, 'review-optimization', 72);
    await pool.query(`
      UPDATE posts
      SET workflow_status = 'approved_scheduled',
          approved_review_version = review_version,
          approved_at = NOW(),
          approved_by_admin_id = $2,
          scheduled_at = NOW() + INTERVAL '1 day'
      WHERE id = $1
    `, [optimizationDraft.id, publicationAdmin.rows[0].id]);
    const optimizationVersion = Number(optimizationDraft.review_version);
    const optimizedHtml = publishableHtml(publishableFaq()).replace(
      'Abschlussberatung anfragen',
      'Go-live-Prüfung konkret anfragen'
    );
    const optimizedReport = publishQualityReport(93);
    const optimized = await reviewOptimizationRepository.commitOptimization({
      postId: optimizationDraft.id,
      contentHtml: optimizedHtml,
      qualityScore: 93,
      qualityReport: optimizedReport,
      expectedReviewVersion: optimizationVersion,
      commitKey: `987:optimize_review_issues:${optimizationDraft.id}`
    });
    assert.equal(optimized.post.review_version, optimizationVersion + 1);
    assert.equal(optimized.post.workflow_status, 'needs_review');
    assert.equal(optimized.post.approved_review_version, null);
    assert.equal(optimized.post.approved_at, null);
    assert.equal(optimized.post.approved_by_admin_id, null);
    assert.equal(optimized.post.content, optimizedHtml);
    assert.equal(optimized.metadata.quality_score, 93);
    assert.deepEqual(optimized.metadata.quality_report_json, optimizedReport);
    assert.equal(
      optimized.metadata.generation_metadata_json.lastReviewIssueOptimization.commitKey,
      `987:optimize_review_issues:${optimizationDraft.id}`
    );
    const optimizedRetry = await reviewOptimizationRepository.commitOptimization({
      postId: optimizationDraft.id,
      contentHtml: optimizedHtml,
      qualityScore: 93,
      qualityReport: optimizedReport,
      expectedReviewVersion: optimizationVersion,
      commitKey: `987:optimize_review_issues:${optimizationDraft.id}`
    });
    assert.equal(optimizedRetry.idempotent, true);
    assert.equal(optimizedRetry.post.review_version, optimizationVersion + 1);

    const textRaceDraft = await insertPublishableDraft(pool, 'text-race');
    const textRace = await settleWithoutPostLockFailure([
      publicationService.publishDraftManually({
        postId: textRaceDraft.id,
        admin: publicationAdmin.rows[0],
        confirmed: true
      }),
      regenerationRepository.updateGeneratedFields({
        postId: textRaceDraft.id,
        article: { metaTitle: 'Sicherer Meta Title mit passender Länge für Berlin' },
        allowedFields: ['metaTitle']
      })
    ], 'Publication gegen Textregeneration');
    assert.equal(textRace[0].status, 'fulfilled');
    assert.equal(
      (await pool.query('SELECT published FROM posts WHERE id = $1', [textRaceDraft.id])).rows[0].published,
      true
    );

    const imageRaceDraft = await insertPublishableDraft(pool, 'image-race');
    const imageRace = await settleWithoutPostLockFailure([
      publicationService.publishDraftManually({
        postId: imageRaceDraft.id,
        admin: publicationAdmin.rows[0],
        confirmed: true
      }),
      regenerationRepository.updateGeneratedImage({
        postId: imageRaceDraft.id,
        imageUrl: 'https://example.test/image-race-new.webp',
        publicId: 'blog_images/image-race-new',
        imageAlt: 'Neues sicheres Beitragsbild',
        expectedOldPublicId: null,
        expectedReviewVersion: Number(imageRaceDraft.review_version)
      })
    ], 'Publication gegen Bildregeneration');
    assert.equal(imageRace[0].status, 'fulfilled');
    assert.equal(
      (await pool.query('SELECT published FROM posts WHERE id = $1', [imageRaceDraft.id])).rows[0].published,
      true
    );

    await pool.query('UPDATE content_agent_settings SET agent_enabled = TRUE WHERE id = 1');
    const job = await enqueueJob({
      jobType: 'generate_manual_draft',
      idempotencyKey: 'pg-retry-einmalig',
      maxAttempts: 2
    }, pool);
    const firstClaim = await claimNextJob('pg-worker', pool);
    assert.equal(firstClaim.id, job.id);
    const firstRun = await createRun({ jobId: job.id }, pool);
    await updateRunStage(firstRun.id, {
      currentStage: 'article_generation',
      stageId: 'article_generation',
      stageResult: { responseId: 'resp-einmalig' }
    }, pool);
    const firstDraft = await BlogPostModel.createAIDraft({
      generationRunId: firstRun.id,
      adminNotificationEmail: 'redaktion@example.de',
      post: {
        title: 'KI-Entwurf',
        slug: 'ki-entwurf',
        content: '<section><h2>Entwurf</h2></section>',
        hero_image: 'https://example.test/erstes.webp',
        hero_public_id: 'blog_images/erstes'
      },
      metadata: { quality_score: 91 }
    }, pool);
    const sameDraft = await BlogPostModel.createAIDraft({
      generationRunId: firstRun.id,
      post: {
        title: 'Darf nicht überschreiben',
        slug: 'anderer-slug',
        content: '<p>Anders</p>',
        hero_image: 'https://example.test/zweites.webp',
        hero_public_id: 'blog_images/zweites'
      },
      metadata: { quality_score: 80 }
    }, pool);
    assert.equal(firstDraft.created, true);
    assert.equal(sameDraft.created, false);
    assert.equal(sameDraft.post.id, firstDraft.post.id);
    assert.equal(sameDraft.referencedImagePublicId, 'blog_images/erstes');
    assert.equal((await pool.query(
      "SELECT COUNT(*)::int AS count FROM content_notification_deliveries WHERE post_id = $1 AND notification_type = 'admin_review'",
      [firstDraft.post.id]
    )).rows[0].count, 1);
    assert.equal((await pool.query(
      "SELECT COUNT(*)::int AS count FROM content_jobs WHERE job_type = 'send_admin_review_notification' AND payload_json->>'postId' = $1",
      [String(firstDraft.post.id)]
    )).rows[0].count, 1);
    await pool.query(`
      UPDATE content_jobs
      SET run_after = NOW() + INTERVAL '1 hour'
      WHERE job_type = 'send_admin_review_notification'
        AND payload_json ->> 'postId' = $1
        AND status = 'queued'
    `, [String(firstDraft.post.id)]);
    assert.ok(await renewJobLease(firstClaim, pool));
    assert.equal((await retryOrFailJob(firstClaim, new Error('temporär'), { backoffSeconds: 1 }, pool)).status, 'queued');
    await pool.query('UPDATE content_jobs SET run_after = NOW() WHERE id = $1', [job.id]);

    const secondClaim = await claimNextJob('pg-worker', pool);
    assert.equal(secondClaim.id, job.id);
    const resumedRun = await createRun({ jobId: job.id }, pool);
    assert.equal(resumedRun.id, firstRun.id);
    assert.deepEqual(resumedRun.stage_results_json.article_generation, { responseId: 'resp-einmalig' });
    assert.equal((await completeJob(secondClaim, pool)).status, 'completed');
    const counts = await pool.query('SELECT COUNT(*)::int AS count FROM content_runs WHERE job_id = $1', [job.id]);
    assert.equal(counts.rows[0].count, 1);
    await pool.query(`
      UPDATE content_jobs
      SET status = 'completed', finished_at = NOW(), updated_at = NOW()
      WHERE job_type = 'send_admin_review_notification'
        AND payload_json ->> 'postId' = $1
        AND status = 'queued'
    `, [String(firstDraft.post.id)]);

    const safeJob = await enqueueJob({
      jobType: 'generate_manual_draft',
      idempotencyKey: 'pg-worker-safe-provider-retry',
      payload: { mode: 'safe-provider-retry' },
      maxAttempts: 2
    }, pool);
    const providerCalls = { safe: 0, ambiguous: 0 };
    const runIds = [];
    const timers = new Set();
    const worker = createContentWorker({
      enabled: true,
      workerId: 'pg-real-worker',
      workerName: 'pg-real-worker',
      version: 'test',
      leaseMinutes: 5,
      leaseRenewMs: 30_000,
      setIntervalFn(callback) {
        const handle = { callback };
        timers.add(handle);
        return handle;
      },
      clearIntervalFn(handle) { timers.delete(handle); },
      upsertHeartbeat: (input) => upsertWorkerHeartbeat(input, pool),
      recoverExpiredJobs: (minutes) => recoverExpiredJobs(minutes, pool),
      claimNextJob: (workerId) => claimNextJob(workerId, pool),
      renewJobLease: (claim) => renewJobLease(claim, pool),
      completeJob: (claim) => completeJob(claim, pool),
      failJob: (claim, error) => failJob(claim, error, pool),
      retryOrFailJob: (claim, error, options) => retryOrFailJob(claim, error, options, pool),
      markJobNeedsManualAttention: (claim, reason) => markJobNeedsManualAttention(claim, reason, pool),
      async handleJob(claim, { leaseGuard }) {
        let step = 'createRun';
        try {
          const run = await createRun({ jobId: claim.id }, pool);
          runIds.push(run.id);
          step = 'leaseGuard';
          await leaseGuard();
          const stageId = 'article_generation';
          step = 'reserve';
          const reservation = await reserveMonthlyBudget({
            runId: run.id,
            stageId,
            estimatedCost: 0.5,
            limit: 100,
            db: pool
          });
          if (claim.payload_json.mode === 'safe-provider-retry') {
            providerCalls.safe += 1;
            if (claim.attempts === 1) {
              step = 'release';
              await releaseMonthlyBudgetReservation({
                runId: run.id,
                stageId,
                reservationMonth: reservation.reservationMonth,
                db: pool
              });
              const error = new Error('429 vor Ausführung');
              error.code = 'CONTENT_PROVIDER_SAFE_RETRY';
              error.retryable = true;
              throw error;
            }
            step = 'settle';
            await settleMonthlyBudget({
              runId: run.id,
              stageId,
              reservationMonth: reservation.reservationMonth,
              actualCost: 0.01,
              db: pool
            });
            step = 'updateStage';
            await updateRunStage(run.id, {
              currentStage: stageId,
              stageId,
              stageResult: { responseId: 'resp-nach-retry' }
            }, pool);
            return { status: 'completed' };
          }
          providerCalls.ambiguous += 1;
          return { status: 'needs_manual_attention', code: 'provider_execution_uncertain' };
        } catch (error) {
          error.message = `${step}: ${error.message}`;
          throw error;
        }
      }
    });

    const dueJobIds = await pool.query(`
      SELECT id, job_type, payload_json
      FROM content_jobs
      WHERE status = 'queued' AND run_after <= NOW()
      ORDER BY run_after, id
    `);
    assert.deepEqual(dueJobIds.rows, [{
      id: safeJob.id,
      job_type: 'generate_manual_draft',
      payload_json: { mode: 'safe-provider-retry' }
    }]);
    assert.equal((await worker.processOnce()).status, 'queued');
    await pool.query('UPDATE content_jobs SET run_after = NOW() WHERE id = $1', [safeJob.id]);
    const secondWorkerResult = await worker.processOnce();
    const safeDiagnostic = await pool.query('SELECT status, last_error, attempts FROM content_jobs WHERE id = $1', [safeJob.id]);
    assert.equal(secondWorkerResult.status, 'completed', JSON.stringify(safeDiagnostic.rows[0]));
    assert.equal(providerCalls.safe, 2);
    assert.equal(runIds[0], runIds[1]);
    const safeState = await pool.query('SELECT status FROM content_jobs WHERE id = $1', [safeJob.id]);
    assert.equal(safeState.rows[0].status, 'completed');

    const ambiguousJob = await enqueueJob({
      jobType: 'generate_manual_draft',
      idempotencyKey: 'pg-worker-ambiguous-provider',
      payload: { mode: 'ambiguous-provider' },
      maxAttempts: 3
    }, pool);
    assert.equal((await worker.processOnce()).status, 'needs_manual_attention');
    assert.equal(await worker.processOnce(), null);
    assert.equal(providerCalls.ambiguous, 1);
    const ambiguousState = await pool.query('SELECT status FROM content_jobs WHERE id = $1', [ambiguousJob.id]);
    assert.equal(ambiguousState.rows[0].status, 'needs_manual_attention');
    assert.equal(timers.size, 0);

    await pool.query(`
      UPDATE content_agent_settings
      SET manual_approvals_count = 0,
          newsletter_blog_notifications_enabled = FALSE
      WHERE id = 1
    `);
    const scheduledGenerationJob = await pool.query(`
      INSERT INTO content_jobs (job_type, status, idempotency_key)
      VALUES ('generate_manual_draft', 'completed', 'pg-scheduled-review-e2e')
      RETURNING id
    `);
    const scheduledRun = await createRun({
      jobId: scheduledGenerationJob.rows[0].id,
      runtimeSnapshot: { operatingMode: 'review', source: 'postgres-scheduled-e2e' }
    }, pool);
    const scheduledAt = new Date(Date.now() + 1_500);
    const scheduledFaq = publishableFaq();
    const generated = await BlogPostModel.createAIDraft({
      generationRunId: scheduledRun.id,
      scheduledAt: scheduledAt.toISOString(),
      adminNotificationEmail: 'redaktion@example.de',
      post: {
        title: 'Terminierter PostgreSQL-End-to-End-Entwurf',
        slug: 'terminierter-postgresql-end-to-end-entwurf',
        excerpt: 'Dieser Entwurf belegt den gesamten terminierten Reviewablauf.',
        content: publishableHtml(scheduledFaq),
        hero_image: 'https://example.test/scheduled-e2e.webp',
        hero_public_id: 'blog_images/scheduled-e2e',
        category: 'Webdesign',
        faq_json: scheduledFaq,
        meta_title: 'Sicherer Meta Title mit passender Länge für Berlin',
        meta_description: 'Dieser kontrollierte Integrationstest belegt den sicheren terminierten Review- und Veröffentlichungsablauf vollständig.',
        og_title: 'Terminierter Reviewablauf',
        og_description: 'Integrationstest für die geplante Veröffentlichung.',
        image_alt: 'Terminierter redaktioneller Reviewablauf',
        published: false,
        workflow_status: 'needs_review',
        content_format: 'static_html',
        generated_by_ai: true
      },
      metadata: {
        primary_keyword: 'Terminierter Reviewablauf',
        secondary_keywords: [],
        search_intent: 'commercial',
        target_audience: 'Kleine Unternehmen',
        content_cluster: 'Webdesign',
        business_goal: 'Beratungsanfragen',
        cta_type: 'contact',
        internal_links_json: [
          { url: '/kontakt', label: 'Kontakt', purpose: 'Beratung' },
          { url: '/pakete', label: 'Pakete', purpose: 'Angebot' }
        ],
        source_references_json: [],
        quality_score: 92,
        quality_report_json: publishQualityReport(92)
      }
    }, pool);
    assert.equal(generated.post.workflow_status, 'needs_review');
    assert.equal(generated.post.published, false);

    let adminMailCalls = 0;
    const scheduledPublicationService = createScheduledPublicationService({ db: pool });
    const e2eHandler = createProductionJobHandler({
      createRun: (input) => createRun(input, pool),
      async runPipeline() {
        throw new Error('Im terminierten E2E-Pfad darf keine Generierung dispatcht werden.');
      },
      sendAdminReviewNotification: (input) => sendAdminReviewNotification(input, {
        database: pool,
        canonicalBaseUrl: 'https://www.komplettwebdesign.de',
        async sendReviewMail() {
          adminMailCalls += 1;
          return { messageId: 'pg-scheduled-review-e2e' };
        }
      }),
      publishApprovedPost: (input) => scheduledPublicationService.publishApprovedPost(input)
    });
    const e2eTimers = new Set();
    const e2eWorker = createContentWorker({
      enabled: true,
      workerId: 'pg-scheduled-e2e-worker',
      workerName: 'pg-scheduled-e2e-worker',
      version: 'test',
      leaseMinutes: 5,
      leaseRenewMs: 30_000,
      setIntervalFn(callback) {
        const handle = { callback };
        e2eTimers.add(handle);
        return handle;
      },
      clearIntervalFn(handle) { e2eTimers.delete(handle); },
      upsertHeartbeat: (input) => upsertWorkerHeartbeat(input, pool),
      recoverExpiredJobs: (minutes) => recoverExpiredJobs(minutes, pool),
      claimNextJob: (workerId) => claimNextJob(workerId, pool),
      renewJobLease: (claim) => renewJobLease(claim, pool),
      completeJob: (claim) => completeJob(claim, pool),
      failJob: (claim, error) => failJob(claim, error, pool),
      retryOrFailJob: (claim, error, options) => retryOrFailJob(claim, error, options, pool),
      markJobNeedsManualAttention: (claim, reason) => markJobNeedsManualAttention(claim, reason, pool),
      handleJob: e2eHandler
    });

    const notificationResult = await e2eWorker.processOnce();
    assert.equal(notificationResult.status, 'completed');
    assert.equal(adminMailCalls, 1);
    assert.equal((await pool.query(`
      SELECT status FROM content_jobs
      WHERE job_type = 'send_admin_review_notification'
        AND payload_json ->> 'postId' = $1
    `, [String(generated.post.id)])).rows[0].status, 'completed');
    assert.equal(await e2eWorker.processOnce(), null);

    const renderedReviewVersion = Number(generated.post.review_version);
    await pool.query(`
      UPDATE posts
      SET review_version = review_version + 1,
          updated_at = NOW()
      WHERE id = $1
    `, [generated.post.id]);
    await assert.rejects(publicationService.rejectDraft({
      postId: generated.post.id,
      expectedReviewVersion: renderedReviewVersion,
      admin: publicationAdmin.rows[0],
      reason: 'Veralteter Ablehnungstab',
      confirmed: true
    }), { code: 'CONTENT_REVIEW_VERSION_STALE' });
    await assert.rejects(scheduledPublicationService.approveForSchedule({
      postId: generated.post.id,
      scheduledAt,
      expectedScheduleRevision: Number(settings.rows[0].schedule_revision),
      expectedTimezone: settings.rows[0].timezone,
      expectedReviewVersion: renderedReviewVersion,
      admin: publicationAdmin.rows[0],
      confirmed: true
    }), { code: 'CONTENT_REVIEW_VERSION_STALE' });
    assert.equal((await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM content_jobs
      WHERE job_type = 'publish_approved_post'
        AND payload_json ->> 'postId' = $1
    `, [String(generated.post.id)])).rows[0].count, 0);
    assert.equal((await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM content_publish_events
      WHERE post_id = $1
    `, [generated.post.id])).rows[0].count, 0);

    const approval = await scheduledPublicationService.approveForSchedule({
      postId: generated.post.id,
      scheduledAt,
      expectedScheduleRevision: Number(settings.rows[0].schedule_revision),
      expectedTimezone: settings.rows[0].timezone,
      expectedReviewVersion: renderedReviewVersion + 1,
      admin: publicationAdmin.rows[0],
      confirmed: true
    });
    assert.equal(approval.post.workflow_status, 'approved_scheduled');
    assert.equal(approval.post.published, false);
    const beforeDue = await pool.query(
      'SELECT published, workflow_status FROM posts WHERE id = $1',
      [generated.post.id]
    );
    assert.deepEqual(beforeDue.rows[0], {
      published: false,
      workflow_status: 'approved_scheduled'
    });
    assert.equal(await e2eWorker.processOnce(), null);

    const publicationJob = await pool.query(`
      SELECT payload_json
      FROM content_jobs
      WHERE job_type = 'publish_approved_post'
        AND payload_json ->> 'postId' = $1
    `, [String(generated.post.id)]);
    await new Promise((resolve) => setTimeout(
      resolve,
      Math.max(0, scheduledAt.getTime() - Date.now() + 150)
    ));
    assert.deepEqual(Object.keys(publicationJob.rows[0].payload_json).sort(), [
      'approvalVersion', 'postId', 'publicationVersion', 'scheduledAt'
    ]);
    const publicationResult = await e2eWorker.processOnce();
    assert.equal(publicationResult.status, 'completed');
    assert.equal((await pool.query(`
      SELECT status FROM content_jobs
      WHERE job_type = 'publish_approved_post'
        AND payload_json ->> 'postId' = $1
    `, [String(generated.post.id)])).rows[0].status, 'completed');
    assert.equal(await e2eWorker.processOnce(), null);
    assert.equal(e2eTimers.size, 0);

    const scheduledState = await pool.query(`
      SELECT p.published, p.workflow_status,
             d.status AS notification_status,
             (SELECT COUNT(*)::int FROM content_publish_events e
              WHERE e.post_id = p.id AND e.decision = 'manual') AS event_count,
             (SELECT manual_approvals_count FROM content_agent_settings WHERE id = 1) AS approval_count,
             (SELECT COUNT(*)::int FROM content_jobs j
              WHERE j.job_type = 'send_blog_newsletter'
                AND j.payload_json ->> 'postId' = p.id::text) AS newsletter_job_count,
             (SELECT COUNT(*)::int FROM content_notification_deliveries n
              WHERE n.post_id = p.id AND n.notification_type = 'newsletter_article') AS newsletter_delivery_count
      FROM posts p
      JOIN content_notification_deliveries d
        ON d.post_id = p.id AND d.notification_type = 'admin_review'
      WHERE p.id = $1
    `, [generated.post.id]);
    assert.deepEqual(scheduledState.rows[0], {
      published: true,
      workflow_status: 'published',
      notification_status: 'sent',
      event_count: 1,
      approval_count: 1,
      newsletter_job_count: 0,
      newsletter_delivery_count: 0
    });
  } finally {
    try {
      if (pool) await pool.end();
    } finally {
      try {
        if (schemaCreated) {
          await adminPool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
          const cleanupCheck = await adminPool.query(
            'SELECT to_regnamespace($1) AS schema_oid',
            [schemaName]
          );
          assert.equal(cleanupCheck.rows[0].schema_oid, null);
        }
      } finally {
        await adminPool.end();
      }
    }
  }
});
