import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

import { runContentAgentMigration } from '../scripts/runContentAgentMigration.js';
import {
  claimNextJob,
  completeJob,
  enqueueJob,
  renewJobLease,
  retryOrFailJob
} from '../repositories/contentJobRepository.js';
import { createRun, updateRunStage } from '../repositories/contentRunRepository.js';
import BlogPostModel from '../models/BlogPostModel.js';

const connectionString = process.env.CONTENT_AGENT_PG_TEST_URL;
const resetAllowed = process.env.CONTENT_AGENT_PG_TEST_ALLOW_RESET === 'true';

test('echtes PostgreSQL: Bestandsmigration und Worker-Retry verwenden genau einen Run', {
  skip: !connectionString || !resetAllowed
}, async () => {
  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query('DROP TABLE IF EXISTS content_worker_state, content_agent_settings, content_post_metadata, content_topics, content_runs, content_jobs, posts, users CASCADE');
    await pool.query(`
      CREATE TABLE users (id SERIAL PRIMARY KEY);
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
    `);

    await runContentAgentMigration(pool);
    await runContentAgentMigration(pool);

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
  } finally {
    await pool.end();
  }
});
