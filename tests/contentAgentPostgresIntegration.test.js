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
import { createProductionJobHandler } from '../scripts/contentWorker.js';
import { createContentPublicationService } from '../services/contentAgent/contentPublicationService.js';
import { sendAdminReviewNotification } from '../services/contentAgent/contentNotificationService.js';
import { createScheduledPublicationService } from '../services/contentAgent/scheduledPublicationService.js';
import { createContentPublishEventRepository } from '../repositories/contentPublishEventRepository.js';
import { createDraftRegenerationRepository } from '../services/contentAgent/draftRegenerationService.js';
import { evaluateContentAgentPgResetGuard } from './helpers/contentAgentPostgresTestGuard.js';
import BlogPostModel from '../models/BlogPostModel.js';

const connectionString = process.env.CONTENT_AGENT_PG_TEST_URL;
const resetGuard = evaluateContentAgentPgResetGuard({
  connectionString,
  allowReset: process.env.CONTENT_AGENT_PG_TEST_ALLOW_RESET === 'true',
  explicitMarker: process.env.CONTENT_AGENT_PG_TEST_DATABASE_MARKER
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

test('echtes PostgreSQL: Migrationen 002–004 und Generate→Notify→Approve→Publish laufen genau einmal', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  const pool = new pg.Pool({ connectionString, statement_timeout: 5_000, query_timeout: 7_000 });
  try {
    await pool.query('DROP TABLE IF EXISTS content_notification_deliveries, content_provider_state, content_post_revisions, content_post_audits, content_publish_events, content_agent_setting_revisions, content_worker_state, content_agent_settings, content_post_metadata, content_topics, content_runs, content_jobs, posts, admins, users CASCADE');
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
    assert.equal(settings.rows[0].generation_lead_hours, 4);
    assert.equal(settings.rows[0].admin_notification_email, 'kontakt@komplettwebdesign.de');
    assert.equal(settings.rows[0].newsletter_blog_notifications_enabled, false);

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
        AND indexname IN ('ux_content_post_audits_job_post_type', 'ux_content_post_revisions_draft_audit')
      ORDER BY indexname
    `);
    assert.deepEqual(preexistingIndexes.rows.map(({ indexname }) => indexname), [
      'ux_content_post_audits_job_post_type',
      'ux_content_post_revisions_draft_audit'
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
        AND indexname IN ('ux_content_post_audits_job_post_type', 'ux_content_post_revisions_draft_audit')
      ORDER BY indexname
    `);
    assert.equal(rebuiltIndexes.rows.length, 2);
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

    const nullJobAudit = await pool.query(`
      INSERT INTO content_post_audits (post_id, job_id, audit_type, score, status)
      VALUES ($1, NULL, 'legacy_null_job', 60, 'open') RETURNING id
    `, [publishedPost.rows[0].id]);
    await pool.query('DROP INDEX ux_content_post_revisions_draft_audit');
    await pool.query(`
      INSERT INTO content_post_revisions (
        post_id, audit_id, snapshot_json, status, created_at, updated_at, approved_at
      ) VALUES
        ($1, $2, $3::jsonb, 'draft', '2026-02-01T00:00:00Z', '2026-02-02T00:00:00Z', NULL),
        ($1, $2, $3::jsonb, 'draft', '2026-02-03T00:00:00Z', '2026-02-04T00:00:00Z', NULL),
        ($1, $2, $3::jsonb, 'approved', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')
    `, [publishedPost.rows[0].id, nullJobAudit.rows[0].id, snapshot]);
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
    const nullJobDraftIndex = await pool.query(`
      SELECT indexdef FROM pg_indexes
      WHERE schemaname = current_schema() AND indexname = 'ux_content_post_revisions_draft_audit'
    `);
    assert.match(nullJobDraftIndex.rows[0].indexdef, /CREATE UNIQUE INDEX/i);

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
      3
    );

    const regenerationRepository = createDraftRegenerationRepository(pool);
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
        expectedOldPublicId: null
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

    const approval = await scheduledPublicationService.approveForSchedule({
      postId: generated.post.id,
      scheduledAt,
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
    await pool.end();
  }
});
