import pool from '../util/db.js';
import { sanitizeErrorMessage } from './contentErrorSanitizer.js';

const CLAIM_NEXT_JOB_SQL = `
  WITH candidate AS (
    SELECT id
    FROM content_jobs
    WHERE status = 'queued' AND run_after <= NOW()
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
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 3;
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
      VALUES ($1, $2, $3, COALESCE($4, NOW()), COALESCE($5, 3))
      ON CONFLICT (idempotency_key) DO UPDATE
      SET idempotency_key = content_jobs.idempotency_key
      RETURNING content_jobs.*
    `,
    [jobType, idempotencyKey, payload, runAfter, normalizeMaxAttempts(maxAttempts)]
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
