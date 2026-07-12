import pool from '../util/db.js';
import { sanitizeErrorMessage } from './contentErrorSanitizer.js';

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
  return (jobType === 'generate_weekly_draft' && payload?.source === 'weekly-schedule')
    || (jobType === 'generate_manual_draft' && payload?.source === 'admin_manual')
    || (
      ['regenerate_article', 'regenerate_metadata', 'regenerate_faq', 'regenerate_image'].includes(jobType)
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
      SET idempotency_key = content_jobs.idempotency_key
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
    maxAttempts: 5
  }, db);
}

export async function retryContentJobForAdmin({ jobId, hardMaxAttempts }, db = pool) {
  const cap = Math.min(5, Math.max(1, Number(hardMaxAttempts) || 1));
  const { rows } = await db.query(
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
        AND status IN ('failed', 'needs_manual_attention')
        AND attempts < $2
      RETURNING *
    `,
    [jobId, cap]
  );
  return rows[0] || null;
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
  backoffSeconds = 30
} = {}, db = pool) {
  const lease = leaseParameters(claim);
  const normalizedBackoff = Math.min(86_400, Math.max(1, Number(backoffSeconds) || 30));
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET status = CASE WHEN attempts < max_attempts THEN 'queued' ELSE 'failed' END,
          last_error = $4,
          run_after = CASE
            WHEN attempts < max_attempts THEN NOW() + ($5 * INTERVAL '1 second')
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
    [...lease, sanitizeErrorMessage(error), normalizedBackoff]
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
      UPDATE content_jobs
      SET status = CASE
            WHEN attempts < max_attempts THEN 'queued'
            ELSE 'failed'
          END,
          locked_at = NULL,
          locked_by = NULL,
          finished_at = CASE
            WHEN attempts < max_attempts THEN NULL
            ELSE NOW()
          END,
          updated_at = NOW()
      WHERE status = 'running'
        AND locked_at < NOW() - ($1 * INTERVAL '1 minute')
      RETURNING *
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
