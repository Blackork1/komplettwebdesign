import pool from '../util/db.js';
import {
  ADMIN_CONTENT_JOB_RETRY_CAP,
  providerRecoveryRetryCap,
  PROVIDER_SCHEMA_REPAIR_RETRY_CAP,
  REJECTED_PROVIDER_SCHEMA_REPAIR_RETRY_CAP,
  QUALITY_GATE_RECOVERY_AUDIT_KEY,
  QUALITY_GATE_RECOVERY_RETRY_CAP,
  QUALITY_GATE_RULE_MANIFEST_RECOVERY_AUDIT_KEY,
  QUALITY_GATE_RULE_MANIFEST_RECOVERY_RETRY_CAP,
  EDITORIAL_REVIEW_RECOVERY_AUDIT_KEY,
  EDITORIAL_REVIEW_RECOVERY_RETRY_CAP,
  DRAFT_PERSISTENCE_RECOVERY_AUDIT_KEY,
  DRAFT_PERSISTENCE_RECOVERY_RETRY_CAP
} from '../services/contentAgent/contentJobRetryPolicy.js';
import {
  CONTENT_AGENT_RULE_MANIFEST,
  CONTENT_AGENT_RULE_MANIFEST_HASH,
  canonicalSha256
} from '../services/contentAgent/contentRuleManifest.js';
import { sanitizeErrorMessage } from './contentErrorSanitizer.js';
import { reviewHasOnlyTechnicalBlockingIssues } from '../services/contentAgent/editorialReviewPolicy.js';
import {
  DETERMINISTIC_EXISTING_OPTIMIZATION_DISCARD_CODES
} from '../services/contentAgent/existingPostOptimizationDiscardPolicy.js';
import {
  hasDraftContentRevision,
  lockContentPostRevisionInvariant
} from './contentPostRevisionInvariant.js';

const CLAIM_NEXT_JOB_SQL = `
  WITH candidate AS (
    SELECT id
    FROM content_jobs
    WHERE status = 'queued' AND run_after <= NOW()
      AND EXISTS (
        SELECT 1
        FROM content_agent_settings settings
        WHERE settings.id = 1 AND settings.agent_enabled = TRUE
      )
    ORDER BY run_after, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE content_jobs AS job
  SET status = 'running',
      attempts = attempts + 1,
      locked_at = NOW(),
      locked_by = $1,
      updated_at = NOW()
  FROM candidate
  WHERE job.id = candidate.id
  RETURNING job.*;
`;

const POSTGRES_INTEGER_MAX = 2147483647;

function leaseParameters(claim) {
  if (
    !claim
    || typeof claim !== 'object'
    || claim.id === null
    || claim.id === undefined
    || typeof claim.locked_by !== 'string'
    || claim.locked_by.length === 0
    || !Number.isInteger(claim.attempts)
    || claim.attempts < 1
  ) {
    throw new TypeError('Für den Jobabschluss ist ein vollständiger Lease-Claim erforderlich.');
  }

  return [claim.id, claim.locked_by, claim.attempts];
}

function attemptNeutralLastError(error) {
  if (error?.code !== 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY') {
    return sanitizeErrorMessage(error);
  }
  const token = typeof error.cleanupToken === 'string' ? error.cleanupToken : '';
  return /^CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY(?::(?:complete|finish)|:fail:[A-Za-z0-9_]+)?$/.test(token)
    ? token
    : 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY';
}

function normalizeMaxAttempts(value) {
  if (value === null || value === undefined) {
    return 3;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return 3;
  }
  return Math.min(POSTGRES_INTEGER_MAX, Math.max(1, parsed));
}

function requiresEnabledAgent(jobType, payload) {
  return [
    'sync_search_console',
    'analyze_search_opportunities',
    'evaluate_revision_outcomes',
    'evaluate_article_performance',
    'explain_article_performance'
  ].includes(jobType)
    || (jobType === 'generate_weekly_draft' && payload?.source === 'weekly-schedule')
    || (jobType === 'generate_manual_draft' && payload?.source === 'admin_manual')
    || (
      [
        'regenerate_article',
        'regenerate_metadata',
        'regenerate_faq',
        'regenerate_image',
        'optimize_review_issues'
      ].includes(jobType)
      && payload?.source === 'admin_regeneration'
    );
}

export async function enqueueJob({
  jobType,
  idempotencyKey,
  payload = {},
  runAfter = null,
  maxAttempts = null
}, db = pool) {
  const { rows } = await db.query(
    `
      INSERT INTO content_jobs (
        job_type,
        idempotency_key,
        payload_json,
        run_after,
        max_attempts
      )
      SELECT $1, $2, $3, COALESCE($4, NOW()), COALESCE($5, 3)
      WHERE $6 = FALSE OR EXISTS (
        SELECT 1
        FROM content_agent_settings settings
        WHERE settings.id = 1 AND settings.agent_enabled = TRUE
      )
      ON CONFLICT (idempotency_key) DO UPDATE
      SET max_attempts = CASE
            WHEN content_jobs.job_type = 'send_admin_review_notification'
              AND EXCLUDED.job_type = 'send_admin_review_notification'
              THEN GREATEST(content_jobs.max_attempts, EXCLUDED.max_attempts)
            ELSE content_jobs.max_attempts
          END,
          idempotency_key = content_jobs.idempotency_key
      RETURNING content_jobs.*
    `,
    [
      jobType,
      idempotencyKey,
      payload,
      runAfter,
      normalizeMaxAttempts(maxAttempts),
      requiresEnabledAgent(jobType, payload)
    ]
  );

  return rows[0] || null;
}

export function enqueuePerformanceExplanationJob({ snapshotId, evidenceHash }, db = pool) {
  const normalizedSnapshotId = Number(snapshotId);
  const normalizedHash = String(evidenceHash || '');
  if (!Number.isSafeInteger(normalizedSnapshotId) || normalizedSnapshotId <= 0 ||
      !/^[0-9a-f]{64}$/.test(normalizedHash)) {
    throw new TypeError('Der Performance-Erklärjob benötigt Snapshot-ID und Evidenz-Hash.');
  }
  return enqueueJob({
    jobType: 'explain_article_performance',
    idempotencyKey: `article-performance-explanation:${normalizedSnapshotId}:${normalizedHash}`,
    payload: { snapshot_id: normalizedSnapshotId, evidence_hash: normalizedHash },
    maxAttempts: 3
  }, db);
}

const PERFORMANCE_DIAGNOSIS_CODES = new Set([
  'visibility_opportunity',
  'snippet_or_intent_opportunity',
  'ranking_opportunity',
  'content_or_cta_opportunity',
  'contact_path_opportunity'
]);

function performanceRevisionError(code, message) {
  return Object.assign(new Error(message), { code });
}

export async function enqueuePerformanceRevisionJob({
  postId,
  adminId,
  baseLiveHash,
  snapshotId,
  evidenceHash,
  maxAttempts = null
} = {}, db = pool) {
  const normalizedPostId = positiveJobInteger(postId, 'postId');
  const normalizedAdminId = positiveJobInteger(adminId, 'adminId');
  const normalizedSnapshotId = positiveJobInteger(snapshotId, 'snapshotId');
  const normalizedLiveHash = String(baseLiveHash || '');
  const normalizedEvidenceHash = String(evidenceHash || '');
  if (!/^[0-9a-f]{64}$/.test(normalizedLiveHash)
      || !/^[0-9a-f]{64}$/.test(normalizedEvidenceHash)) {
    throw new TypeError('Die Performance-Revision benötigt gültige Live- und Evidenz-Hashes.');
  }
  if (!db || typeof db.connect !== 'function') {
    throw new TypeError('Die Performance-Revision benötigt eine transaktionsfähige Datenbank.');
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const post = await lockContentPostRevisionInvariant(client, normalizedPostId);
    if (!post || post.published !== true) {
      throw performanceRevisionError(
        'CONTENT_POST_NOT_FOUND',
        'Der veröffentlichte Artikel wurde nicht gefunden.'
      );
    }
    if (await hasDraftContentRevision(client, normalizedPostId)) {
      throw performanceRevisionError(
        'CONTENT_REVISION_CONFLICT',
        'Für diesen Artikel ist bereits eine Draft-Revision vorhanden.'
      );
    }
    const snapshotResult = await client.query(`
      SELECT id, evidence_hash, data_eligible, status, diagnoses_json
      FROM content_article_performance_snapshots
      WHERE post_id = $1
      ORDER BY evaluated_through_date DESC, id DESC
      LIMIT 1
      FOR SHARE
    `, [normalizedPostId]);
    const snapshot = snapshotResult.rows[0] || null;
    const diagnosisCodes = [...new Set(
      (Array.isArray(snapshot?.diagnoses_json) ? snapshot.diagnoses_json : [])
        .map((item) => String(item?.code || ''))
        .filter((code) => PERFORMANCE_DIAGNOSIS_CODES.has(code))
    )].sort();
    if (!snapshot
        || Number(snapshot.id) !== normalizedSnapshotId
        || snapshot.evidence_hash !== normalizedEvidenceHash
        || snapshot.data_eligible !== true
        || snapshot.status !== 'opportunity'
        || diagnosisCodes.length === 0) {
      throw performanceRevisionError(
        'CONTENT_PERFORMANCE_EVIDENCE_STALE',
        'Die Performance-Evidenz ist nicht mehr aktuell oder noch nicht belastbar.'
      );
    }
    const payload = {
      source: 'article_performance',
      post_id: normalizedPostId,
      admin_id: normalizedAdminId,
      base_live_hash: normalizedLiveHash,
      snapshot_id: normalizedSnapshotId,
      evidence_hash: normalizedEvidenceHash,
      diagnosis_codes: diagnosisCodes
    };
    const idempotencyKey = `article-performance-revision:${normalizedPostId}:${normalizedSnapshotId}:${normalizedEvidenceHash}`;
    const inserted = await client.query(`
      INSERT INTO content_jobs (
        job_type, idempotency_key, payload_json, max_attempts
      )
      SELECT 'optimize_existing_post', $1, $2::jsonb, $3
      FROM content_agent_settings settings
      WHERE settings.id = 1 AND settings.agent_enabled = TRUE
      ON CONFLICT DO NOTHING
      RETURNING id, status, attempts, max_attempts, created_at, updated_at
    `, [idempotencyKey, payload, normalizeMaxAttempts(maxAttempts)]);
    let job = inserted.rows[0] || null;
    if (!job) {
      const active = await client.query(`
        SELECT id, status, attempts, max_attempts, created_at, updated_at
        FROM content_jobs
        WHERE job_type = 'optimize_existing_post'
          AND payload_json ->> 'post_id' = $1::text
          AND status IN ('queued', 'running', 'needs_manual_attention')
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        FOR SHARE
      `, [normalizedPostId]);
      job = active.rows[0] || null;
    }
    await client.query('COMMIT');
    return job;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Der ursprüngliche Fehler bleibt maßgeblich.
    }
    throw error;
  } finally {
    client.release();
  }
}

function positiveJobInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${field} muss eine positive Ganzzahl sein.`);
  }
  return normalized;
}

export async function enqueueReviewOptimizationJob({
  postId,
  expectedReviewVersion,
  issueMode,
  issueIndex = null,
  maxAttempts = null
} = {}, db = pool) {
  const normalizedPostId = positiveJobInteger(postId, 'postId');
  const normalizedReviewVersion = positiveJobInteger(
    expectedReviewVersion,
    'expectedReviewVersion'
  );
  if (!['single', 'all'].includes(issueMode)) {
    throw new TypeError('issueMode muss single oder all sein.');
  }
  const normalizedIssueIndex = issueMode === 'single' ? Number(issueIndex) : null;
  if (issueMode === 'single'
      && (!Number.isSafeInteger(normalizedIssueIndex) || normalizedIssueIndex < 0)) {
    throw new TypeError('issueIndex muss eine nicht negative Ganzzahl sein.');
  }

  return enqueueJob({
    jobType: 'optimize_review_issues',
    idempotencyKey: `optimize_review_issues:${normalizedPostId}:${normalizedReviewVersion}`,
    payload: {
      source: 'admin_regeneration',
      post_id: normalizedPostId,
      forced_mode: 'review',
      expected_review_version: normalizedReviewVersion,
      issue_mode: issueMode,
      ...(issueMode === 'single' ? { issue_index: normalizedIssueIndex } : {})
    },
    maxAttempts
  }, db);
}

export async function getLatestReviewOptimizationJob({ postId } = {}, db = pool) {
  const normalizedPostId = positiveJobInteger(postId, 'postId');
  const { rows } = await db.query(
    `
      SELECT id,
             status,
             attempts,
             max_attempts,
             CASE
               WHEN payload_json ->> 'expected_review_version' ~ '^[1-9][0-9]*$'
                 THEN (payload_json ->> 'expected_review_version')::INTEGER
               ELSE NULL
             END AS expected_review_version,
             created_at,
             updated_at,
             finished_at
      FROM content_jobs
      WHERE job_type = 'optimize_review_issues'
        AND payload_json ->> 'post_id' = $1::TEXT
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [normalizedPostId]
  );
  return rows[0] || null;
}

function canonicalIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

export async function enqueueManualSearchConsoleSyncJob({
  localDate,
  payload,
  maxAttempts = null
}, db = pool) {
  const normalizedLocalDate = canonicalIsoDate(localDate);
  const startDate = canonicalIsoDate(payload?.startDate);
  const endDate = canonicalIsoDate(payload?.endDate);
  if (
    !normalizedLocalDate
    || !payload
    || typeof payload !== 'object'
    || Array.isArray(payload)
    || Object.keys(payload).length !== 2
    || !startDate
    || !endDate
    || startDate > endDate
  ) {
    throw new TypeError('Für den manuellen Search-Console-Sync wird ein gültiger Zeitraum benötigt.');
  }
  const normalizedPayload = { startDate, endDate };
  const { rows } = await db.query(
    `
      INSERT INTO content_jobs (
        job_type,
        idempotency_key,
        payload_json,
        run_after,
        max_attempts
      )
      SELECT 'sync_search_console', $1, $2, NOW(), $3
      WHERE EXISTS (
        SELECT 1
        FROM content_agent_settings settings
        WHERE settings.id = 1 AND settings.agent_enabled = TRUE
      )
      ON CONFLICT (idempotency_key) DO UPDATE
      SET status = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN 'queued'
            ELSE content_jobs.status
          END,
          attempts = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN 0
            ELSE content_jobs.attempts
          END,
          payload_json = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN EXCLUDED.payload_json
            ELSE content_jobs.payload_json
          END,
          run_after = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN NOW()
            ELSE content_jobs.run_after
          END,
          max_attempts = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN EXCLUDED.max_attempts
            ELSE content_jobs.max_attempts
          END,
          locked_at = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN NULL
            ELSE content_jobs.locked_at
          END,
          locked_by = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN NULL
            ELSE content_jobs.locked_by
          END,
          last_error = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN NULL
            ELSE content_jobs.last_error
          END,
          finished_at = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN NULL
            ELSE content_jobs.finished_at
          END,
          updated_at = CASE
            WHEN content_jobs.status IN ('completed', 'failed', 'needs_manual_attention')
              THEN NOW()
            ELSE content_jobs.updated_at
          END
      WHERE content_jobs.job_type = 'sync_search_console'
        AND content_jobs.idempotency_key LIKE 'gsc-manual-sync:%'
        AND content_jobs.status IN (
          'queued', 'running', 'completed', 'failed', 'needs_manual_attention'
        )
        AND EXISTS (
          SELECT 1
          FROM content_agent_settings settings
          WHERE settings.id = 1 AND settings.agent_enabled = TRUE
        )
      RETURNING content_jobs.*
    `,
    [
      `gsc-manual-sync:${normalizedLocalDate}`,
      normalizedPayload,
      normalizeMaxAttempts(maxAttempts)
    ]
  );

  return rows[0] || null;
}

export async function enqueueAdminReviewNotificationJob({
  deliveryId,
  postId,
  generationRunId,
  reviewVersion
}, db = pool) {
  const normalizedDeliveryId = Number(deliveryId);
  const normalizedPostId = Number(postId);
  const normalizedGenerationRunId = Number(generationRunId);
  const normalizedReviewVersion = Number(reviewVersion);
  if (
    !Number.isSafeInteger(normalizedDeliveryId) || normalizedDeliveryId <= 0
    || !Number.isSafeInteger(normalizedPostId) || normalizedPostId <= 0
    || !Number.isSafeInteger(normalizedGenerationRunId) || normalizedGenerationRunId <= 0
    || !Number.isSafeInteger(normalizedReviewVersion) || normalizedReviewVersion <= 0
  ) {
    throw new TypeError('Für den Admin-Mailjob werden positive IDs und eine positive Reviewversion benötigt.');
  }

  return enqueueJob({
    jobType: 'send_admin_review_notification',
    idempotencyKey: `send-admin-review:${normalizedGenerationRunId}:${normalizedReviewVersion}`,
    payload: {
      deliveryId: normalizedDeliveryId,
      postId: normalizedPostId,
      generationRunId: normalizedGenerationRunId
    },
    maxAttempts: 6
  }, db);
}

export async function enqueueLearningObservationJob({
  postId,
  reviewVersion
}, db = pool) {
  const normalizedPostId = Number(postId);
  const normalizedReviewVersion = Number(reviewVersion);
  if (
    !Number.isSafeInteger(normalizedPostId) || normalizedPostId <= 0
    || !Number.isSafeInteger(normalizedReviewVersion) || normalizedReviewVersion <= 0
  ) {
    throw Object.assign(
      new TypeError('Für den Lernjob werden eine positive Artikel-ID und Reviewversion benötigt.'),
      { code: 'CONTENT_LEARNING_JOB_PAYLOAD_INVALID' }
    );
  }

  return enqueueJob({
    jobType: 'process_learning_observations',
    idempotencyKey: `learning-observation:${normalizedPostId}:${normalizedReviewVersion}`,
    payload: {
      postId: normalizedPostId,
      reviewVersion: normalizedReviewVersion,
      source: 'internal_learning'
    },
    maxAttempts: 3
  }, db);
}

export async function enqueueApprovedPublicationJob({
  postId,
  approvalVersion,
  publicationVersion,
  runAfter
}, db = pool) {
  const normalizedPostId = Number(postId);
  const normalizedApprovalVersion = Number(approvalVersion);
  const normalizedPublicationVersion = Number(publicationVersion);
  const normalizedRunAfter = runAfter instanceof Date ? runAfter : new Date(runAfter);
  if (
    !Number.isSafeInteger(normalizedPostId) || normalizedPostId <= 0
    || !Number.isSafeInteger(normalizedApprovalVersion) || normalizedApprovalVersion <= 0
    || !Number.isSafeInteger(normalizedPublicationVersion) || normalizedPublicationVersion <= 0
    || Number.isNaN(normalizedRunAfter.getTime())
  ) {
    throw new TypeError('Für den Veröffentlichungsjob werden positive IDs, Versionen und ein gültiger Termin benötigt.');
  }

  return enqueueJob({
    jobType: 'publish_approved_post',
    idempotencyKey: `publish-approved:${normalizedPostId}:${normalizedApprovalVersion}:${normalizedPublicationVersion}:${normalizedRunAfter.getTime()}`,
    payload: {
      postId: normalizedPostId,
      approvalVersion: normalizedApprovalVersion,
      publicationVersion: normalizedPublicationVersion,
      scheduledAt: normalizedRunAfter.toISOString()
    },
    runAfter: normalizedRunAfter,
    maxAttempts: 3
  }, db);
}

export async function retryContentJobForAdmin({ jobId }, db = pool) {
  const cap = ADMIN_CONTENT_JOB_RETRY_CAP;
  const { rows } = await db.query(
    `
      WITH locked_job AS MATERIALIZED (
        SELECT *
        FROM content_jobs
        WHERE id = $1
        FOR UPDATE
      ),
      locked_run AS MATERIALIZED (
        SELECT run.id,
               run.job_id,
               run.status,
               run.current_stage,
               run.post_id,
               run.stage_results_json
        FROM content_runs AS run
        JOIN locked_job AS job ON job.id = run.job_id
        FOR UPDATE OF run
      ),
      eligible_retry AS MATERIALIZED (
        SELECT job.id,
               job.job_type,
               run.id AS run_id,
               run.status AS run_status,
               (
                 job.job_type = 'optimize_existing_post'
                 AND job.last_error = 'existing_post_editorial_review_failed'
                 AND run.status = 'needs_manual_attention'
                 AND run.current_stage = 'editorial_review:repair'
                 AND run.post_id IS NOT NULL
                 AND run.stage_results_json ? 'targeted_optimization'
                 AND run.stage_results_json ? 'repair'
                 AND run.stage_results_json ? 'editorial_review:repair'
                 AND EXISTS (
                   SELECT 1
                   FROM jsonb_each(COALESCE(run.stage_results_json, '{}'::jsonb))
                     AS settled(key, value)
                   WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:targeted_optimization$'
                     AND settled.value ->> 'status' = 'settled'
                 )
                 AND EXISTS (
                   SELECT 1
                   FROM jsonb_each(COALESCE(run.stage_results_json, '{}'::jsonb))
                     AS settled(key, value)
                   WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair$'
                     AND settled.value ->> 'status' = 'settled'
                 )
                 AND EXISTS (
                   SELECT 1
                   FROM jsonb_each(COALESCE(run.stage_results_json, '{}'::jsonb))
                     AS settled(key, value)
                   WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:editorial_review:repair$'
                     AND settled.value ->> 'status' = 'settled'
                 )
               ) AS existing_editorial_policy_retry
        FROM locked_job AS job
        LEFT JOIN locked_run AS run ON run.job_id = job.id
        WHERE job.job_type <> 'send_admin_review_notification'
          AND job.status IN ('failed', 'needs_manual_attention')
          AND COALESCE(job.last_error, '') <> 'provider_execution_uncertain'
          AND (
            job.job_type NOT IN ('optimize_existing_post', 'revalidate_existing_post_revision')
            OR (
              job.last_error IN ('CONTENT_PROVIDER_SAFE_RETRY', 'CONTENT_JOB_LEASE_LOST')
              AND run.status = 'running'
            )
            OR (
              job.job_type = 'optimize_existing_post'
              AND job.last_error = 'existing_post_editorial_review_failed'
              AND run.status = 'needs_manual_attention'
              AND run.current_stage = 'editorial_review:repair'
            )
          )
          AND NOT EXISTS (
            SELECT 1
            FROM locked_run AS reservation_run
            CROSS JOIN LATERAL jsonb_each(
              COALESCE(reservation_run.stage_results_json, '{}'::jsonb)
            ) AS stage_result(key, value)
            WHERE reservation_run.job_id = job.id
              AND stage_result.key LIKE 'budget:%'
              AND stage_result.value ->> 'status' = 'reserved'
          )
          AND job.attempts < $2
      ),
      reopened_run AS (
        UPDATE content_runs AS run
        SET status = 'running',
            finished_at = NULL
        FROM eligible_retry AS candidate
        WHERE run.id = candidate.run_id
          AND (
            candidate.job_type NOT IN ('optimize_existing_post', 'revalidate_existing_post_revision')
            OR candidate.existing_editorial_policy_retry = TRUE
          )
          AND candidate.run_status IN ('failed', 'needs_manual_attention')
        RETURNING run.id, run.job_id
      )
      UPDATE content_jobs AS job
      SET status = 'queued',
          max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
          run_after = NOW(),
          locked_at = NULL,
          locked_by = NULL,
          last_error = NULL,
          finished_at = NULL,
          updated_at = NOW()
      FROM eligible_retry AS candidate
      WHERE job.id = candidate.id
        AND (
          candidate.run_id IS NULL
          OR candidate.run_status = 'running'
          OR EXISTS (
            SELECT 1
            FROM reopened_run
            WHERE reopened_run.job_id = job.id
          )
        )
      RETURNING job.*
    `,
    [jobId, cap]
  );
  return rows[0] || null;
}

function positivePostgresInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0 || normalized > POSTGRES_INTEGER_MAX) {
    throw new TypeError(`${fieldName} muss eine positive PostgreSQL-Integer-ID sein.`);
  }
  return normalized;
}

export async function discardDeterministicExistingOptimizationJobForAdmin({
  jobId,
  postId,
  adminId
} = {}, db = pool) {
  const normalizedJobId = positivePostgresInteger(jobId, 'jobId');
  const normalizedPostId = positivePostgresInteger(postId, 'postId');
  const normalizedAdminId = positivePostgresInteger(adminId, 'adminId');
  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const lockedPost = await lockContentPostRevisionInvariant(client, normalizedPostId);
    if (!lockedPost || lockedPost.published !== true) {
      await client.query('COMMIT');
      transactionStarted = false;
      return null;
    }
    const { rows } = await client.query(`
    WITH locked_job AS MATERIALIZED (
      SELECT job.*
      FROM content_jobs AS job
      WHERE job.id = $1::bigint
      FOR UPDATE
    ),
    locked_run AS MATERIALIZED (
      SELECT run.*
      FROM content_runs AS run
      JOIN locked_job AS job ON job.id = run.job_id
      FOR UPDATE OF run
    ),
    eligible AS MATERIALIZED (
      SELECT job.id AS job_id,
             run.id AS run_id,
             COALESCE(run.error_report_json ->> 'code', job.last_error) AS error_code
      FROM locked_job AS job
      JOIN locked_run AS run ON run.job_id = job.id
      WHERE job.job_type = 'optimize_existing_post'
        AND job.status = 'needs_manual_attention'
        AND run.status = 'needs_manual_attention'
        AND job.payload_json ->> 'post_id' = $2::text
        AND job.payload_json ->> 'source' = 'admin_existing_content'
        AND COALESCE(run.error_report_json ->> 'code', job.last_error) = ANY($4::text[])
        AND COALESCE(run.error_report_json ->> 'code', job.last_error) NOT IN (
          'provider_execution_uncertain',
          'provider_stage_persistence_uncertain'
        )
        AND EXISTS (
          SELECT 1
          FROM posts AS live_post
          WHERE live_post.id = $2::integer
            AND live_post.published = TRUE
        )
        AND NOT EXISTS (
          SELECT 1
          FROM content_post_revisions AS revision
          WHERE revision.post_id = $2::integer
            AND revision.status = 'draft'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_each(COALESCE(run.stage_results_json, '{}'::jsonb)) AS stage(key, value)
          WHERE stage.key LIKE 'budget:%'
            AND stage.value ->> 'status' = 'reserved'
        )
    ),
    audited_run AS (
      UPDATE content_runs AS run
      SET status = 'failed',
          finished_at = COALESCE(run.finished_at, NOW()),
          stage_results_json = jsonb_set(
            COALESCE(run.stage_results_json, '{}'::jsonb),
            ARRAY['existing_optimization_discard:admin'],
            jsonb_build_object(
              'status', 'discarded',
              'jobId', eligible.job_id,
              'postId', $2::integer,
              'errorCode', eligible.error_code,
              'adminId', $3::integer,
              'discardedAt', to_jsonb(NOW())
            ),
            TRUE
          )
      FROM eligible
      WHERE run.id = eligible.run_id
      RETURNING run.id, run.job_id
    ),
    cancelled_job AS (
      UPDATE content_jobs AS job
      SET status = 'cancelled',
          locked_at = NULL,
          locked_by = NULL,
          finished_at = COALESCE(job.finished_at, NOW()),
          updated_at = NOW()
      FROM eligible
      WHERE job.id = eligible.job_id
        AND EXISTS (
          SELECT 1
          FROM audited_run
          WHERE audited_run.job_id = job.id
        )
      RETURNING job.*
    ),
    already_discarded AS (
      SELECT job.*
      FROM locked_job AS job
      JOIN locked_run AS run ON run.job_id = job.id
      WHERE job.job_type = 'optimize_existing_post'
        AND job.status = 'cancelled'
        AND job.payload_json ->> 'post_id' = $2::text
        AND run.stage_results_json #>> ARRAY['existing_optimization_discard:admin', 'status'] = 'discarded'
        AND run.stage_results_json #>> ARRAY['existing_optimization_discard:admin', 'jobId'] = $1::text
        AND run.stage_results_json #>> ARRAY['existing_optimization_discard:admin', 'postId'] = $2::text
    )
    SELECT * FROM cancelled_job
    UNION ALL
    SELECT * FROM already_discarded
    WHERE NOT EXISTS (SELECT 1 FROM cancelled_job)
    LIMIT 1
    `, [
      normalizedJobId,
      normalizedPostId,
      normalizedAdminId,
      DETERMINISTIC_EXISTING_OPTIMIZATION_DISCARD_CODES
    ]);
    await client.query('COMMIT');
    transactionStarted = false;
    return rows[0] || null;
  } catch (error) {
    if (transactionStarted) await rollbackRecoveryQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

const PROVIDER_RECOVERY_RESERVATION_KEY = /^budget:(\d{4}-(?:0[1-9]|1[0-2])):(.+)$/;

function singleOpenProviderReservation(stageResults) {
  if (!stageResults || typeof stageResults !== 'object' || Array.isArray(stageResults)) {
    return null;
  }
  const openEntries = Object.entries(stageResults).filter(([key, value]) => (
    key.startsWith('budget:') && value?.status === 'reserved'
  ));
  if (openEntries.length !== 1) return null;
  const [key, value] = openEntries[0];
  const match = PROVIDER_RECOVERY_RESERVATION_KEY.exec(key);
  const reservationMonth = match?.[1];
  const stageId = match?.[2]?.trim();
  const reservedCost = Number(value.reservedCost);
  if (
    !reservationMonth
    || !stageId
    || value.reservationMonth !== reservationMonth
    || !Number.isFinite(reservedCost)
    || reservedCost < 0
  ) {
    return null;
  }
  return { key, reservationMonth, stageId, reservedCost };
}

function validProviderRecoveryState(row) {
  const retryCap = providerRecoveryRetryCap(row?.error_report_json);
  return row
    && row.job_type !== 'send_admin_review_notification'
    && row.job_status === 'needs_manual_attention'
    && row.last_error === 'provider_execution_uncertain'
    && Number.isSafeInteger(Number(row.attempts))
    && Number(row.attempts) >= 0
    && Number(row.attempts) < retryCap
    && row.run_status === 'needs_manual_attention'
    && row.post_id == null
    && row.error_report_json?.code === 'provider_execution_uncertain';
}

async function rollbackRecoveryQuietly(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Der ursprüngliche Transaktionsfehler bleibt maßgeblich.
  }
}

export async function recoverUncertainProviderJobForAdmin({ jobId, adminId } = {}, db = pool) {
  if (
    !Number.isSafeInteger(jobId) || jobId <= 0
    || !Number.isSafeInteger(adminId) || adminId <= 0
  ) {
    throw new TypeError('Für die Providerwiederherstellung werden positive sichere Ganzzahlen benötigt.');
  }

  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { rows } = await client.query(
      `
        SELECT j.id AS job_id,
               j.job_type,
               j.status AS job_status,
               j.attempts,
               j.max_attempts,
               j.last_error,
               r.id AS run_id,
               r.status AS run_status,
               r.post_id,
               r.error_report_json,
               r.stage_results_json,
               r.cost_estimate
        FROM content_jobs AS j
        JOIN content_runs AS r ON r.job_id = j.id
        WHERE j.id = $1
        FOR UPDATE OF j, r
      `,
      [jobId]
    );
    const state = rows[0];
    const retryCap = providerRecoveryRetryCap(state?.error_report_json);
    const reservation = validProviderRecoveryState(state)
      ? singleOpenProviderReservation(state.stage_results_json)
      : null;
    if (!reservation) {
      await client.query('COMMIT');
      return null;
    }

    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [`content-agent-budget:${reservation.reservationMonth}`]
    );

    const attempts = Number(state.attempts);
    const auditKey = `provider_recovery:${reservation.reservationMonth}:${reservation.stageId}:attempt-${attempts}`;
    const runResult = await client.query(
      `
        UPDATE content_runs
        SET status = 'running',
            stage_results_json =
              (stage_results_json - $2::text)
              || jsonb_build_object(
                $3::text,
                jsonb_build_object(
                  'status', 'abandoned_uncertain',
                  'stageId', $4::text,
                  'reservationMonth', $5::text,
                  'reservedCost', $6::numeric,
                  'adminId', $7::bigint,
                  'abandonedAt', NOW()
                )
              ),
            cost_estimate = GREATEST(0, cost_estimate - $6::numeric),
            error_report_json = jsonb_build_object(
              'code', 'provider_recovery_authorized',
              'stage', $4::text,
              'message', 'Die unklare Providerreservierung wurde durch einen Administrator zur Wiederholung freigegeben.'
            ),
            finished_at = NULL
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND post_id IS NULL
          AND stage_results_json -> $2::text ->> 'status' = 'reserved'
        RETURNING id
      `,
      [
        state.run_id,
        reservation.key,
        auditKey,
        reservation.stageId,
        reservation.reservationMonth,
        reservation.reservedCost,
        adminId
      ]
    );
    if (!runResult.rows[0]) {
      throw new Error('Die offene Providerreservierung konnte nicht atomar verworfen werden.');
    }

    const jobResult = await client.query(
      `
        UPDATE content_jobs
        SET status = 'queued',
            max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
            run_after = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            finished_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND last_error = 'provider_execution_uncertain'
          AND attempts = $3
          AND attempts < $2
        RETURNING *
      `,
      [jobId, retryCap, attempts]
    );
    if (!jobResult.rows[0]) {
      throw new Error('Der Content-Job konnte nicht atomar erneut eingereiht werden.');
    }

    await client.query('COMMIT');
    return {
      job: jobResult.rows[0],
      runId: state.run_id,
      recoveredStage: reservation.stageId,
      reservationMonth: reservation.reservationMonth,
      reservedCost: reservation.reservedCost,
      auditKey
    };
  } catch (error) {
    if (transactionStarted) await rollbackRecoveryQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

function hasOpenProviderReservation(stageResults) {
  return Boolean(
    stageResults
    && typeof stageResults === 'object'
    && !Array.isArray(stageResults)
    && Object.entries(stageResults).some(([key, value]) => (
      key.startsWith('budget:') && value?.status === 'reserved'
    ))
  );
}

function hasSettledStage(stageResults, stageId) {
  return Boolean(
    stageResults?.[stageId]
    && Object.entries(stageResults).some(([key, value]) => (
      key.startsWith('budget:')
      && key.endsWith(`:${stageId}`)
      && value?.status === 'settled'
    ))
  );
}

function validRejectedProviderRecoveryState(row) {
  const diagnostic = row?.error_report_json?.providerDiagnostic;
  return row
    && ['generate_weekly_draft', 'generate_manual_draft'].includes(row.job_type)
    && row.job_status === 'needs_manual_attention'
    && row.last_error === 'provider_request_rejected'
    && Number(row.attempts) === PROVIDER_SCHEMA_REPAIR_RETRY_CAP
    && row.run_status === 'needs_manual_attention'
    && row.current_stage === 'seo_brief'
    && row.post_id == null
    && row.error_report_json?.code === 'provider_request_rejected'
    && diagnostic?.provider === 'openai'
    && diagnostic?.stage === 'article_generation'
    && diagnostic?.code === 'invalid_json_schema'
    && Number(diagnostic?.httpStatus) === 400
    && !hasOpenProviderReservation(row.stage_results_json)
    && hasSettledStage(row.stage_results_json, 'seo_brief');
}

export async function recoverRejectedProviderJobForAdmin({ jobId, adminId } = {}, db = pool) {
  if (
    !Number.isSafeInteger(jobId) || jobId <= 0
    || !Number.isSafeInteger(adminId) || adminId <= 0
  ) {
    throw new TypeError('Für die Schemawiederaufnahme werden positive sichere Ganzzahlen benötigt.');
  }

  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { rows } = await client.query(
      `
        SELECT j.id AS job_id,
               j.job_type,
               j.status AS job_status,
               j.attempts,
               j.max_attempts,
               j.last_error,
               r.id AS run_id,
               r.status AS run_status,
               r.current_stage,
               r.post_id,
               r.error_report_json,
               r.stage_results_json
        FROM content_jobs AS j
        JOIN content_runs AS r ON r.job_id = j.id
        WHERE j.id = $1
        FOR UPDATE OF j, r
      `,
      [jobId]
    );
    const state = rows[0];
    if (!validRejectedProviderRecoveryState(state)) {
      await client.query('COMMIT');
      return null;
    }

    const attempts = Number(state.attempts);
    const recoveredStage = 'article_generation';
    const auditKey = `provider_schema_recovery:${recoveredStage}:attempt-${attempts}`;
    if (Object.hasOwn(state.stage_results_json, auditKey)) {
      await client.query('COMMIT');
      return null;
    }

    const runResult = await client.query(
      `
        UPDATE content_runs
        SET status = 'running',
            stage_results_json = stage_results_json || jsonb_build_object(
              $2::text,
              jsonb_build_object(
                'status', 'authorized_after_rejection',
                'stageId', $3::text,
                'adminId', $4::bigint,
                'authorizedAt', NOW()
              )
            ),
            error_report_json = jsonb_build_object(
              'code', 'provider_schema_recovery_authorized',
              'stage', $3::text,
              'message', 'Die vorab abgelehnte Providerstufe wurde nach der Schema-Korrektur zur Wiederaufnahme freigegeben.'
            ),
            finished_at = NULL
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND post_id IS NULL
          AND NOT (stage_results_json ? $2::text)
        RETURNING id
      `,
      [state.run_id, auditKey, recoveredStage, adminId]
    );
    if (!runResult.rows[0]) {
      throw new Error('Die Schemawiederaufnahme konnte nicht atomar protokolliert werden.');
    }

    const jobResult = await client.query(
      `
        UPDATE content_jobs
        SET status = 'queued',
            max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
            run_after = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            finished_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND last_error = 'provider_request_rejected'
          AND attempts = $3
          AND attempts < $2
        RETURNING *
      `,
      [jobId, REJECTED_PROVIDER_SCHEMA_REPAIR_RETRY_CAP, attempts]
    );
    if (!jobResult.rows[0]) {
      throw new Error('Der abgelehnte Content-Job konnte nicht atomar erneut eingereiht werden.');
    }

    await client.query('COMMIT');
    return {
      job: jobResult.rows[0],
      runId: state.run_id,
      recoveredStage,
      auditKey
    };
  } catch (error) {
    if (transactionStarted) await rollbackRecoveryQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

const QUALITY_STRUCTURE_ISSUE_CODES = new Set([
  'cta_count_invalid',
  'cta_locations_invalid',
  'cta_tracking_invalid',
  'cta_contact_target_invalid',
  'faq_count_invalid',
  'faq_mismatch',
  'bootstrap_class_unknown',
  'class_forbidden'
]);

function hasOnlyRepairableQualityIssues(stageResults, validationStageId) {
  const validation = stageResults?.[validationStageId];
  const issues = validation?.issues;
  return validation?.passed === false
    && Array.isArray(issues)
    && issues.length > 0
    && issues.every(({ code }) => QUALITY_STRUCTURE_ISSUE_CODES.has(code));
}

function hasSelfConsistentRuleManifest(snapshot) {
  return Boolean(
    snapshot
    && typeof snapshot === 'object'
    && !Array.isArray(snapshot)
    && snapshot.ruleManifest
    && typeof snapshot.ruleManifest === 'object'
    && !Array.isArray(snapshot.ruleManifest)
    && typeof snapshot.ruleManifestHash === 'string'
    && canonicalSha256(snapshot.ruleManifest) === snapshot.ruleManifestHash
  );
}

function validQualityGateRecoveryState(row, baseMaxRevisions) {
  const lastRepairStageId = `repair:${baseMaxRevisions}`;
  const lastValidationStageId = `validation:${baseMaxRevisions}`;
  return row
    && ['generate_weekly_draft', 'generate_manual_draft'].includes(row.job_type)
    && row.job_status === 'needs_manual_attention'
    && row.last_error === 'quality_gate_failed'
    && Number(row.attempts) === QUALITY_GATE_RECOVERY_RETRY_CAP - 1
    && row.run_status === 'needs_manual_attention'
    && row.current_stage === 'validation'
    && row.post_id == null
    && row.error_report_json?.code === 'quality_gate_failed'
    && hasSelfConsistentRuleManifest(row.runtime_snapshot_json)
    && !hasOpenProviderReservation(row.stage_results_json)
    && hasSettledStage(row.stage_results_json, 'article_generation')
    && hasSettledStage(row.stage_results_json, lastRepairStageId)
    && hasOnlyRepairableQualityIssues(row.stage_results_json, lastValidationStageId);
}

export async function recoverQualityGateJobForAdmin({
  jobId,
  adminId,
  baseMaxRevisions
} = {}, db = pool) {
  if (
    !Number.isSafeInteger(jobId) || jobId <= 0
    || !Number.isSafeInteger(adminId) || adminId <= 0
    || !Number.isSafeInteger(baseMaxRevisions) || baseMaxRevisions <= 0 || baseMaxRevisions > 4
  ) {
    throw new TypeError('Für die Qualitätswiederaufnahme werden positive sichere Ganzzahlen benötigt.');
  }

  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { rows } = await client.query(
      `
        SELECT j.id AS job_id,
               j.job_type,
               j.status AS job_status,
               j.attempts,
               j.max_attempts,
               j.last_error,
               r.id AS run_id,
               r.status AS run_status,
               r.current_stage,
               r.post_id,
               r.error_report_json,
               r.runtime_snapshot_json,
               r.stage_results_json
        FROM content_jobs AS j
        JOIN content_runs AS r ON r.job_id = j.id
        WHERE j.id = $1
        FOR UPDATE OF j, r
      `,
      [jobId]
    );
    const state = rows[0];
    if (!validQualityGateRecoveryState(state, baseMaxRevisions)
        || Object.hasOwn(state.stage_results_json, QUALITY_GATE_RECOVERY_AUDIT_KEY)) {
      await client.query('COMMIT');
      return null;
    }

    const attempts = Number(state.attempts);
    const recoveredStage = `repair:${baseMaxRevisions + 1}`;
    const previousManifestHash = state.runtime_snapshot_json.ruleManifestHash;
    const runResult = await client.query(
      `
        UPDATE content_runs
        SET status = 'running',
            stage_results_json = stage_results_json || jsonb_build_object(
              $2::text,
              jsonb_build_object(
                'status', 'authorized_after_quality_gate',
                'stageId', $3::text,
                'baseMaxRevisions', $4::integer,
                'additionalRevisionCount', 1,
                'adminId', $5::bigint,
                'previousManifestHash', $8::text,
                'currentManifestHash', $7::text,
                'authorizedAt', NOW()
              )
            ),
            runtime_snapshot_json = runtime_snapshot_json || jsonb_build_object(
              'ruleManifest', $6::jsonb,
              'ruleManifestHash', $7::text
            ),
            error_report_json = jsonb_build_object(
              'code', 'quality_gate_recovery_authorized',
              'stage', $3::text,
              'message', 'Die gezielte zusätzliche HTML-Strukturreparatur wurde durch einen Administrator freigegeben.'
            ),
            finished_at = NULL
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND post_id IS NULL
          AND NOT (stage_results_json ? $2::text)
          AND runtime_snapshot_json ->> 'ruleManifestHash' = $8::text
        RETURNING id
      `,
      [
        state.run_id,
        QUALITY_GATE_RECOVERY_AUDIT_KEY,
        recoveredStage,
        baseMaxRevisions,
        adminId,
        CONTENT_AGENT_RULE_MANIFEST,
        CONTENT_AGENT_RULE_MANIFEST_HASH,
        previousManifestHash
      ]
    );
    if (!runResult.rows[0]) {
      throw new Error('Die Qualitätswiederaufnahme konnte nicht atomar protokolliert werden.');
    }

    const jobResult = await client.query(
      `
        UPDATE content_jobs
        SET status = 'queued',
            max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
            run_after = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            finished_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND last_error = 'quality_gate_failed'
          AND attempts = $3
          AND attempts < $2
        RETURNING *
      `,
      [jobId, QUALITY_GATE_RECOVERY_RETRY_CAP, attempts]
    );
    if (!jobResult.rows[0]) {
      throw new Error('Der Qualitätsjob konnte nicht atomar erneut eingereiht werden.');
    }

    await client.query('COMMIT');
    return {
      job: jobResult.rows[0],
      runId: state.run_id,
      recoveredStage,
      auditKey: QUALITY_GATE_RECOVERY_AUDIT_KEY
    };
  } catch (error) {
    if (transactionStarted) await rollbackRecoveryQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

function hasAnyBudgetStage(stageResults, stageId) {
  return Object.keys(stageResults || {}).some((key) => (
    key.startsWith('budget:') && key.endsWith(`:${stageId}`)
  ));
}

function validQualityGateRuleManifestRecoveryState(row) {
  const qualityRecovery = row?.stage_results_json?.[QUALITY_GATE_RECOVERY_AUDIT_KEY];
  return row
    && ['generate_weekly_draft', 'generate_manual_draft'].includes(row.job_type)
    && row.job_status === 'needs_manual_attention'
    && row.last_error === 'CONTENT_RULE_MANIFEST_MISMATCH'
    && Number(row.attempts) === QUALITY_GATE_RULE_MANIFEST_RECOVERY_RETRY_CAP - 1
    && row.run_status === 'needs_manual_attention'
    && row.current_stage === 'validation'
    && row.post_id == null
    && row.error_report_json?.code === 'CONTENT_RULE_MANIFEST_MISMATCH'
    && hasSelfConsistentRuleManifest(row.runtime_snapshot_json)
    && row.runtime_snapshot_json.ruleManifestHash !== CONTENT_AGENT_RULE_MANIFEST_HASH
    && !hasOpenProviderReservation(row.stage_results_json)
    && hasSettledStage(row.stage_results_json, 'article_generation')
    && hasSettledStage(row.stage_results_json, 'repair:2')
    && hasOnlyRepairableQualityIssues(row.stage_results_json, 'validation:2')
    && qualityRecovery?.status === 'authorized_after_quality_gate'
    && qualityRecovery?.stageId === 'repair:3'
    && Number(qualityRecovery?.baseMaxRevisions) === 2
    && Number(qualityRecovery?.additionalRevisionCount) === 1
    && !Object.hasOwn(row.stage_results_json, 'repair:3')
    && !hasAnyBudgetStage(row.stage_results_json, 'repair:3');
}

export async function recoverQualityGateRuleManifestForAdmin({
  jobId,
  adminId
} = {}, db = pool) {
  if (
    !Number.isSafeInteger(jobId) || jobId <= 0
    || !Number.isSafeInteger(adminId) || adminId <= 0
  ) {
    throw new TypeError('Für die Regelstand-Wiederaufnahme werden positive sichere Ganzzahlen benötigt.');
  }

  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { rows } = await client.query(
      `
        SELECT j.id AS job_id,
               j.job_type,
               j.status AS job_status,
               j.attempts,
               j.max_attempts,
               j.last_error,
               r.id AS run_id,
               r.status AS run_status,
               r.current_stage,
               r.post_id,
               r.cost_estimate,
               r.error_report_json,
               r.runtime_snapshot_json,
               r.stage_results_json
        FROM content_jobs AS j
        JOIN content_runs AS r ON r.job_id = j.id
        WHERE j.id = $1
        FOR UPDATE OF j, r
      `,
      [jobId]
    );
    const state = rows[0];
    if (!validQualityGateRuleManifestRecoveryState(state)
        || Object.hasOwn(
          state.stage_results_json,
          QUALITY_GATE_RULE_MANIFEST_RECOVERY_AUDIT_KEY
        )) {
      await client.query('COMMIT');
      return null;
    }

    const previousManifestHash = state.runtime_snapshot_json.ruleManifestHash;
    const recoveredStage = 'repair:3';
    const runResult = await client.query(
      `
        UPDATE content_runs
        SET status = 'running',
            runtime_snapshot_json = runtime_snapshot_json || jsonb_build_object(
              'ruleManifest', $3::jsonb,
              'ruleManifestHash', $4::text
            ),
            stage_results_json = stage_results_json || jsonb_build_object(
              $2::text,
              jsonb_build_object(
                'status', 'authorized_after_manifest_mismatch',
                'stageId', 'repair:3',
                'previousManifestHash', $5::text,
                'currentManifestHash', $4::text,
                'adminId', $6::bigint,
                'authorizedAt', NOW()
              )
            ),
            error_report_json = jsonb_build_object(
              'code', 'content_rule_manifest_recovery_authorized',
              'stage', 'repair:3',
              'message', 'Der aktuelle signierte Regelstand wurde für die ausstehende Strukturreparatur freigegeben.'
            ),
            finished_at = NULL
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND post_id IS NULL
          AND runtime_snapshot_json ->> 'ruleManifestHash' = $5::text
          AND NOT (stage_results_json ? $2::text)
        RETURNING id
      `,
      [
        state.run_id,
        QUALITY_GATE_RULE_MANIFEST_RECOVERY_AUDIT_KEY,
        CONTENT_AGENT_RULE_MANIFEST,
        CONTENT_AGENT_RULE_MANIFEST_HASH,
        previousManifestHash,
        adminId
      ]
    );
    if (!runResult.rows[0]) {
      throw new Error('Die Regelstand-Übernahme konnte nicht atomar protokolliert werden.');
    }

    const attempts = Number(state.attempts);
    const jobResult = await client.query(
      `
        UPDATE content_jobs
        SET status = 'queued',
            max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
            run_after = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            finished_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND last_error = 'CONTENT_RULE_MANIFEST_MISMATCH'
          AND attempts = $3
          AND attempts < $2
        RETURNING *
      `,
      [jobId, QUALITY_GATE_RULE_MANIFEST_RECOVERY_RETRY_CAP, attempts]
    );
    if (!jobResult.rows[0]) {
      throw new Error('Der Manifestjob konnte nicht atomar erneut eingereiht werden.');
    }

    await client.query('COMMIT');
    return {
      job: jobResult.rows[0],
      runId: state.run_id,
      recoveredStage,
      auditKey: QUALITY_GATE_RULE_MANIFEST_RECOVERY_AUDIT_KEY
    };
  } catch (error) {
    if (transactionStarted) await rollbackRecoveryQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

function validEditorialReviewRecoveryState(row) {
  const stageResults = row?.stage_results_json;
  const qualityRecovery = stageResults?.[QUALITY_GATE_RECOVERY_AUDIT_KEY];
  const validation = stageResults?.['validation:3'];
  const review = stageResults?.['review:3']?.value;
  return row
    && ['generate_weekly_draft', 'generate_manual_draft'].includes(row.job_type)
    && row.job_status === 'needs_manual_attention'
    && row.last_error === 'quality_gate_failed'
    && Number(row.attempts) === EDITORIAL_REVIEW_RECOVERY_RETRY_CAP - 1
    && row.run_status === 'needs_manual_attention'
    && row.current_stage === 'review'
    && row.post_id == null
    && row.error_report_json?.code === 'quality_gate_failed'
    && hasSelfConsistentRuleManifest(row.runtime_snapshot_json)
    && row.runtime_snapshot_json.ruleManifestHash !== CONTENT_AGENT_RULE_MANIFEST_HASH
    && !hasOpenProviderReservation(stageResults)
    && hasSettledStage(stageResults, 'article_generation')
    && hasSettledStage(stageResults, 'repair:3')
    && hasSettledStage(stageResults, 'review:3')
    && validation?.passed === true
    && Array.isArray(validation?.issues)
    && validation.issues.length === 0
    && reviewHasOnlyTechnicalBlockingIssues(review)
    && qualityRecovery?.status === 'authorized_after_quality_gate'
    && qualityRecovery?.stageId === 'repair:3'
    && !Object.hasOwn(stageResults, 'review:4')
    && !hasAnyBudgetStage(stageResults, 'review:4');
}

export async function recoverEditorialReviewForAdmin({
  jobId,
  adminId
} = {}, db = pool) {
  if (
    !Number.isSafeInteger(jobId) || jobId <= 0
    || !Number.isSafeInteger(adminId) || adminId <= 0
  ) {
    throw new TypeError('Für die redaktionelle Wiederaufnahme werden positive sichere Ganzzahlen benötigt.');
  }

  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { rows } = await client.query(
      `
        SELECT j.id AS job_id,
               j.job_type,
               j.status AS job_status,
               j.attempts,
               j.max_attempts,
               j.last_error,
               r.id AS run_id,
               r.status AS run_status,
               r.current_stage,
               r.post_id,
               r.error_report_json,
               r.runtime_snapshot_json,
               r.stage_results_json
        FROM content_jobs AS j
        JOIN content_runs AS r ON r.job_id = j.id
        WHERE j.id = $1
        FOR UPDATE OF j, r
      `,
      [jobId]
    );
    const state = rows[0];
    if (!validEditorialReviewRecoveryState(state)
        || Object.hasOwn(state.stage_results_json, EDITORIAL_REVIEW_RECOVERY_AUDIT_KEY)) {
      await client.query('COMMIT');
      return null;
    }

    const previousManifestHash = state.runtime_snapshot_json.ruleManifestHash;
    const recoveredStage = 'review:4';
    const runResult = await client.query(
      `
        UPDATE content_runs
        SET status = 'running',
            runtime_snapshot_json = runtime_snapshot_json || jsonb_build_object(
              'ruleManifest', $3::jsonb,
              'ruleManifestHash', $4::text
            ),
            stage_results_json = stage_results_json || jsonb_build_object(
              $2::text,
              jsonb_build_object(
                'status', 'authorized_after_editorial_scope_change',
                'stageId', 'review:4',
                'previousReviewStageId', 'review:3',
                'previousManifestHash', $5::text,
                'currentManifestHash', $4::text,
                'adminId', $6::bigint,
                'authorizedAt', NOW()
              )
            ),
            error_report_json = jsonb_build_object(
              'code', 'editorial_review_recovery_authorized',
              'stage', 'review:4',
              'message', 'Die neue rein redaktionelle Prüfung wurde durch einen Administrator freigegeben.'
            ),
            finished_at = NULL
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND post_id IS NULL
          AND runtime_snapshot_json ->> 'ruleManifestHash' = $5::text
          AND NOT (stage_results_json ? $2::text)
        RETURNING id
      `,
      [
        state.run_id,
        EDITORIAL_REVIEW_RECOVERY_AUDIT_KEY,
        CONTENT_AGENT_RULE_MANIFEST,
        CONTENT_AGENT_RULE_MANIFEST_HASH,
        previousManifestHash,
        adminId
      ]
    );
    if (!runResult.rows[0]) {
      throw new Error('Die redaktionelle Wiederaufnahme konnte nicht atomar protokolliert werden.');
    }

    const attempts = Number(state.attempts);
    const jobResult = await client.query(
      `
        UPDATE content_jobs
        SET status = 'queued',
            max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
            run_after = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            finished_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'needs_manual_attention'
          AND last_error = 'quality_gate_failed'
          AND attempts = $3
          AND attempts < $2
        RETURNING *
      `,
      [jobId, EDITORIAL_REVIEW_RECOVERY_RETRY_CAP, attempts]
    );
    if (!jobResult.rows[0]) {
      throw new Error('Der Job konnte nicht atomar zur redaktionellen Neuprüfung eingereiht werden.');
    }

    await client.query('COMMIT');
    return {
      job: jobResult.rows[0],
      runId: state.run_id,
      recoveredStage,
      auditKey: EDITORIAL_REVIEW_RECOVERY_AUDIT_KEY
    };
  } catch (error) {
    if (transactionStarted) await rollbackRecoveryQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

function reviewHasNoActiveRisk(review) {
  const risks = review?.risks;
  return !risks || typeof risks !== 'object' || Array.isArray(risks)
    ? false
    : Object.values(risks).every((value) => value === false);
}

function validDraftPersistenceRecoveryState(row) {
  const stageResults = row?.stage_results_json;
  const validation = stageResults?.['validation:3'];
  const review = stageResults?.['review:4']?.value;
  const upload = stageResults?.cloudinary_upload;
  const cleanup = stageResults?.image_cleanup;
  return row
    && ['generate_weekly_draft', 'generate_manual_draft'].includes(row.job_type)
    && row.job_status === 'failed'
    && row.last_error === 'value too long for type character varying(80)'
    && Number(row.attempts) === DRAFT_PERSISTENCE_RECOVERY_RETRY_CAP - 1
    && row.run_status === 'failed'
    && row.current_stage === 'image_cleanup'
    && row.post_id == null
    && row.error_report_json?.code === 'pipeline_failed'
    && row.error_report_json?.message === 'value too long for type character varying(80)'
    && hasSelfConsistentRuleManifest(row.runtime_snapshot_json)
    && row.runtime_snapshot_json.ruleManifestHash !== CONTENT_AGENT_RULE_MANIFEST_HASH
    && !hasOpenProviderReservation(stageResults)
    && hasSettledStage(stageResults, 'article_generation')
    && hasSettledStage(stageResults, 'repair:3')
    && hasSettledStage(stageResults, 'review:4')
    && validation?.passed === true
    && Array.isArray(validation?.issues)
    && validation.issues.length === 0
    && review?.passed === true
    && Number(review?.score) >= 80
    && review?.requiresManualReview === false
    && reviewHasNoActiveRisk(review)
    && hasSettledStage(stageResults, 'image_generation')
    && upload?.status === 'completed'
    && typeof upload.publicId === 'string'
    && upload.publicId.startsWith('blog_images/')
    && cleanup?.status === 'completed'
    && cleanup.publicId === upload.publicId
    && !Object.hasOwn(stageResults, 'draft_creation')
    && !Object.hasOwn(stageResults, DRAFT_PERSISTENCE_RECOVERY_AUDIT_KEY)
    && !Object.hasOwn(stageResults, 'image_generation:2')
    && !Object.hasOwn(stageResults, 'cloudinary_upload:2')
    && !hasAnyBudgetStage(stageResults, 'image_generation:2');
}

export async function recoverDraftPersistenceForAdmin({
  jobId,
  adminId
} = {}, db = pool) {
  if (
    !Number.isSafeInteger(jobId) || jobId <= 0
    || !Number.isSafeInteger(adminId) || adminId <= 0
  ) {
    throw new TypeError('Für die Entwurfsfertigstellung werden positive sichere Ganzzahlen benötigt.');
  }

  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { rows } = await client.query(
      `
        SELECT j.id AS job_id,
               j.job_type,
               j.status AS job_status,
               j.attempts,
               j.max_attempts,
               j.last_error,
               r.id AS run_id,
               r.status AS run_status,
               r.current_stage,
               r.post_id,
               r.cost_estimate,
               r.error_report_json,
               r.runtime_snapshot_json,
               r.stage_results_json
        FROM content_jobs AS j
        JOIN content_runs AS r ON r.job_id = j.id
        WHERE j.id = $1
        FOR UPDATE OF j, r
      `,
      [jobId]
    );
    const state = rows[0];
    if (!validDraftPersistenceRecoveryState(state)) {
      await client.query('COMMIT');
      return null;
    }

    const previousManifestHash = state.runtime_snapshot_json.ruleManifestHash;
    const recoveredStage = 'image_generation:2';
    const runResult = await client.query(
      `
        UPDATE content_runs
        SET status = 'running',
            runtime_snapshot_json = runtime_snapshot_json || jsonb_build_object(
              'ruleManifest', $3::jsonb,
              'ruleManifestHash', $4::text
            ),
            stage_results_json = stage_results_json || jsonb_build_object(
              $2::text,
              jsonb_build_object(
                'status', 'authorized_after_metadata_contract_fix',
                'imageGenerationStageId', 'image_generation:2',
                'cloudinaryUploadStageId', 'cloudinary_upload:2',
                'previousImageCleanupStageId', 'image_cleanup',
                'previousManifestHash', $5::text,
                'currentManifestHash', $4::text,
                'adminId', $6::bigint,
                'authorizedAt', NOW()
              )
            ),
            error_report_json = jsonb_build_object(
              'code', 'draft_persistence_recovery_authorized',
              'stage', 'image_generation:2',
              'message', 'Die Entwurfsfertigstellung mit einem neuen Bild wurde durch einen Administrator freigegeben.'
            ),
            finished_at = NULL
        WHERE id = $1
          AND status = 'failed'
          AND post_id IS NULL
          AND error_report_json ->> 'message' = 'value too long for type character varying(80)'
          AND runtime_snapshot_json ->> 'ruleManifestHash' = $5::text
          AND NOT (stage_results_json ? $2::text)
        RETURNING id
      `,
      [
        state.run_id,
        DRAFT_PERSISTENCE_RECOVERY_AUDIT_KEY,
        CONTENT_AGENT_RULE_MANIFEST,
        CONTENT_AGENT_RULE_MANIFEST_HASH,
        previousManifestHash,
        adminId
      ]
    );
    if (!runResult.rows[0]) {
      throw new Error('Die Entwurfsfertigstellung konnte nicht atomar protokolliert werden.');
    }

    const attempts = Number(state.attempts);
    const jobResult = await client.query(
      `
        UPDATE content_jobs
        SET status = 'queued',
            max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
            run_after = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL,
            finished_at = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'failed'
          AND last_error = 'value too long for type character varying(80)'
          AND attempts = $3
          AND attempts < $2
        RETURNING *
      `,
      [jobId, DRAFT_PERSISTENCE_RECOVERY_RETRY_CAP, attempts]
    );
    if (!jobResult.rows[0]) {
      throw new Error('Der Job konnte nicht atomar zur Entwurfsfertigstellung eingereiht werden.');
    }

    await client.query('COMMIT');
    return {
      job: jobResult.rows[0],
      runId: state.run_id,
      recoveredStage,
      auditKey: DRAFT_PERSISTENCE_RECOVERY_AUDIT_KEY
    };
  } catch (error) {
    if (transactionStarted) await rollbackRecoveryQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function claimNextJob(workerId, db = pool) {
  const client = await db.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const { rows } = await client.query(CLAIM_NEXT_JOB_SQL, [workerId]);
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Der ursprüngliche Transaktionsfehler bleibt für den Aufrufer maßgeblich.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function completeJob(claim, db = pool) {
  const lease = leaseParameters(claim);
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET status = 'completed',
          locked_at = NULL,
          locked_by = NULL,
          last_error = NULL,
          finished_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND locked_by = $2
        AND attempts = $3
        AND status = 'running'
      RETURNING *
    `,
    lease
  );

  return rows[0] || null;
}

export async function renewJobLease(claim, db = pool) {
  const lease = leaseParameters(claim);
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET locked_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND locked_by = $2
        AND attempts = $3
        AND status = 'running'
      RETURNING *
    `,
    lease
  );
  return rows[0] || null;
}

export async function failJob(claim, error, db = pool) {
  const lease = leaseParameters(claim);
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET status = 'failed',
          last_error = $4,
          locked_at = NULL,
          locked_by = NULL,
          finished_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND locked_by = $2
        AND attempts = $3
        AND status = 'running'
      RETURNING *
    `,
    [...lease, sanitizeErrorMessage(error)]
  );

  return rows[0] || null;
}

export async function retryOrFailJob(claim, error, {
  retryAt = null,
  backoffSeconds = 30
} = {}, db = pool) {
  const lease = leaseParameters(claim);
  const normalizedBackoff = Math.min(86_400, Math.max(1, Number(backoffSeconds) || 30));
  const normalizedRetryAt = retryAt instanceof Date && !Number.isNaN(retryAt.getTime())
    ? retryAt
    : null;
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET status = CASE WHEN attempts < max_attempts THEN 'queued' ELSE 'failed' END,
          last_error = $4,
          run_after = CASE
            WHEN attempts < max_attempts THEN COALESCE(
              $6::timestamptz,
              NOW() + ($5 * INTERVAL '1 second')
            )
            ELSE run_after
          END,
          locked_at = NULL,
          locked_by = NULL,
          finished_at = CASE WHEN attempts < max_attempts THEN NULL ELSE NOW() END,
          updated_at = NOW()
      WHERE id = $1
        AND locked_by = $2
        AND attempts = $3
        AND status = 'running'
      RETURNING *
    `,
    [
      ...lease,
      ['optimize_existing_post', 'revalidate_existing_post_revision'].includes(claim?.job_type)
        && error?.code === 'CONTENT_PROVIDER_SAFE_RETRY'
        ? 'CONTENT_PROVIDER_SAFE_RETRY'
        : sanitizeErrorMessage(error),
      normalizedBackoff,
      normalizedRetryAt
    ]
  );
  return rows[0] || null;
}

export async function rescheduleJobWithoutAttemptConsumption(claim, error, {
  retryAt
} = {}, db = pool) {
  const lease = leaseParameters(claim);
  if (!(retryAt instanceof Date) || Number.isNaN(retryAt.getTime())) {
    throw new TypeError('Für die versuchsneutrale Neueinplanung wird eine gültige Retryzeit benötigt.');
  }
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET status = 'queued',
          attempts = attempts - 1,
          last_error = $4,
          run_after = $5,
          locked_at = NULL,
          locked_by = NULL,
          finished_at = NULL,
          updated_at = NOW()
      WHERE id = $1
        AND locked_by = $2
        AND attempts = $3
        AND status = 'running'
        AND attempts > 0
      RETURNING *
    `,
    [...lease, attemptNeutralLastError(error), retryAt]
  );
  return rows[0] || null;
}

export async function markJobNeedsManualAttention(claim, reason = {}, db = pool) {
  const lease = leaseParameters(claim);
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET status = 'needs_manual_attention',
          last_error = $4,
          locked_at = NULL,
          locked_by = NULL,
          finished_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND locked_by = $2
        AND attempts = $3
        AND status = 'running'
      RETURNING *
    `,
    [...lease, sanitizeErrorMessage(reason?.message || reason?.code || reason)]
  );
  return rows[0] || null;
}

export async function recoverExpiredJobs(leaseMinutes, db = pool) {
  const { rows } = await db.query(
    `
      WITH expired AS (
        SELECT job.id,
               delivery.status AS delivery_status,
               delivery.next_attempt_at AS delivery_next_attempt_at,
               run.status AS run_status,
               run.finished_at AS run_finished_at,
               run.error_report_json ->> 'code' AS run_error_code
        FROM content_jobs AS job
        LEFT JOIN content_runs AS run ON run.job_id = job.id
        LEFT JOIN content_notification_deliveries AS delivery
          ON job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
          AND delivery.id::text = job.payload_json ->> 'deliveryId'
          AND (
            (job.job_type = 'send_admin_review_notification'
              AND delivery.notification_type = 'admin_review')
            OR
            (job.job_type = 'send_blog_newsletter_delivery'
              AND delivery.notification_type = 'newsletter_article')
          )
        WHERE job.status = 'running'
          AND job.locked_at < NOW() - ($1 * INTERVAL '1 minute')
        FOR UPDATE OF job
      )
      UPDATE content_jobs AS job
      SET status = CASE
            WHEN job.job_type = 'revalidate_existing_post_revision'
              AND (
                expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
                OR
                job.attempts >= job.max_attempts
                OR job.last_error ~ '^CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY(:complete|:finish|:fail:[A-Za-z0-9_]+)?$'
              )
              THEN 'queued'
            WHEN expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
              THEN expired.run_status
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status IN ('queued', 'sending')
              THEN 'queued'
            ELSE CASE
              WHEN job.attempts < job.max_attempts THEN 'queued'
              ELSE 'failed'
            END
          END,
          attempts = CASE
            WHEN job.job_type = 'revalidate_existing_post_revision'
              AND (
                expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
                OR
                job.attempts >= job.max_attempts
                OR job.last_error ~ '^CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY(:complete|:finish|:fail:[A-Za-z0-9_]+)?$'
              )
              THEN GREATEST(job.attempts - 1, 0)
            WHEN expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
              THEN job.attempts
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status IN ('queued', 'sending')
              THEN GREATEST(job.attempts - 1, 0)
            ELSE job.attempts
          END,
          run_after = CASE
            WHEN job.job_type = 'revalidate_existing_post_revision'
              AND (
                expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
                OR
                job.attempts >= job.max_attempts
                OR job.last_error ~ '^CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY(:complete|:finish|:fail:[A-Za-z0-9_]+)?$'
              )
              THEN NOW()
            WHEN expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
              THEN job.run_after
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status = 'queued'
              THEN GREATEST(job.run_after, expired.delivery_next_attempt_at)
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status = 'sending'
              THEN NOW()
            ELSE job.run_after
          END,
          locked_at = NULL,
          locked_by = NULL,
          last_error = CASE
            WHEN job.job_type = 'revalidate_existing_post_revision'
              AND job.last_error ~ '^CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY(:complete|:finish|:fail:[A-Za-z0-9_]+)?$'
              THEN job.last_error
            WHEN job.job_type = 'revalidate_existing_post_revision'
              AND expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
              THEN 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY'
            WHEN expired.run_status = 'completed'
              THEN NULL
            WHEN expired.run_status IN ('failed', 'needs_manual_attention')
              THEN COALESCE(expired.run_error_code, 'CONTENT_RUN_FAILED')
            WHEN job.job_type = 'revalidate_existing_post_revision'
              AND job.attempts >= job.max_attempts
              THEN 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY:fail:CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED'
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status IN ('queued', 'sending')
              THEN job.last_error
            ELSE 'CONTENT_JOB_LEASE_LOST'
          END,
          finished_at = CASE
            WHEN job.job_type = 'revalidate_existing_post_revision'
              AND (
                expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
                OR
                job.attempts >= job.max_attempts
                OR job.last_error ~ '^CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY(:complete|:finish|:fail:[A-Za-z0-9_]+)?$'
              )
              THEN NULL
            WHEN expired.run_status IN ('completed', 'failed', 'needs_manual_attention')
              THEN COALESCE(expired.run_finished_at, NOW())
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status IN ('queued', 'sending')
              THEN NULL
            ELSE CASE
              WHEN job.attempts < job.max_attempts THEN NULL
              ELSE NOW()
            END
          END,
          updated_at = NOW()
      FROM expired
      WHERE job.id = expired.id
      RETURNING job.*
    `,
    [leaseMinutes]
  );

  return rows;
}

export async function upsertWorkerHeartbeat({
  workerName,
  workerId,
  startedAt,
  lastJobAt = null,
  version
}, db = pool) {
  const { rows } = await db.query(
    `
      INSERT INTO content_worker_state (
        worker_name,
        worker_id,
        heartbeat_at,
        started_at,
        last_job_at,
        version
      )
      VALUES ($1, $2, NOW(), $3, $4, $5)
      ON CONFLICT (worker_name) DO UPDATE
      SET worker_id = EXCLUDED.worker_id,
          heartbeat_at = NOW(),
          started_at = EXCLUDED.started_at,
          last_job_at = EXCLUDED.last_job_at,
          version = EXCLUDED.version
      RETURNING *
    `,
    [workerName, workerId, startedAt, lastJobAt, version]
  );

  return rows[0] || null;
}

export async function updateContentSchedulerState({
  lastSchedulerTickAt,
  lastScheduledSlot = null,
  lastSchedulerError = null,
  workerName = 'content-worker'
}, db = pool) {
  const { rows } = await db.query(
    `
      UPDATE content_worker_state
      SET last_scheduler_tick_at = $2,
          last_scheduled_slot = $3,
          last_scheduler_error = $4
      WHERE worker_name = $1
      RETURNING *
    `,
    [
      workerName,
      lastSchedulerTickAt,
      lastScheduledSlot,
      lastSchedulerError === null ? null : sanitizeErrorMessage(lastSchedulerError)
    ]
  );
  return rows[0] || null;
}
