import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

import { runContentAgentMigration } from '../scripts/runContentAgentMigration.js';
import {
  claimNextJob,
  completeJob,
  enqueueJob,
  failJob,
  markJobNeedsManualAttention,
  recoverExpiredJobs,
  renewJobLease,
  retryOrFailJob,
  upsertWorkerHeartbeat
} from '../repositories/contentJobRepository.js';
import { createRun, updateRunStage } from '../repositories/contentRunRepository.js';
import {
  releaseMonthlyBudgetReservation,
  reserveMonthlyBudget,
  settleMonthlyBudget
} from '../services/contentAgent/contentCostService.js';
import { createContentWorker } from '../services/contentAgent/workerService.js';
import BlogPostModel from '../models/BlogPostModel.js';

const connectionString = process.env.CONTENT_AGENT_PG_TEST_URL;
const resetAllowed = process.env.CONTENT_AGENT_PG_TEST_ALLOW_RESET === 'true';

test('echtes PostgreSQL: Bestandsmigration und Worker-Retry verwenden genau einen Run', {
  skip: !connectionString || !resetAllowed
}, async () => {
  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query('DROP TABLE IF EXISTS content_provider_state, content_post_revisions, content_post_audits, content_publish_events, content_agent_setting_revisions, content_worker_state, content_agent_settings, content_post_metadata, content_topics, content_runs, content_jobs, posts, admins, users CASCADE');
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
      INSERT INTO posts (title, slug, content, published)
      VALUES ('Alt veröffentlicht', 'alt-veroeffentlicht', '<p>Alt</p>', TRUE),
             ('Alter Entwurf', 'alter-entwurf', '<p>Entwurf</p>', FALSE);
      INSERT INTO admins (username) VALUES ('migration-admin');
    `);

    await runContentAgentMigration(pool);
    await runContentAgentMigration(pool);

    const settings = await pool.query('SELECT * FROM content_agent_settings WHERE id = 1');
    assert.equal(settings.rows[0].agent_enabled, false);
    assert.equal(settings.rows[0].operating_mode, 'review');
    assert.deepEqual(settings.rows[0].schedule_weekdays, [1, 4]);

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
    assert.ok(await renewJobLease(firstClaim, pool));
    assert.equal((await retryOrFailJob(firstClaim, new Error('temporär'), { backoffSeconds: 1 }, pool)).status, 'queued');
    await pool.query('UPDATE content_jobs SET run_after = NOW() WHERE id = $1', [job.id]);

    const secondClaim = await claimNextJob('pg-worker', pool);
    const resumedRun = await createRun({ jobId: job.id }, pool);
    assert.equal(resumedRun.id, firstRun.id);
    assert.deepEqual(resumedRun.stage_results_json.article_generation, { responseId: 'resp-einmalig' });
    assert.equal((await completeJob(secondClaim, pool)).status, 'completed');
    const counts = await pool.query('SELECT COUNT(*)::int AS count FROM content_runs WHERE job_id = $1', [job.id]);
    assert.equal(counts.rows[0].count, 1);

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
  } finally {
    await pool.end();
  }
});
