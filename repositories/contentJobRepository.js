import pool from '../util/db.js';

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

const REDACTED = '[ZUGANGSDATEN ENTFERNT]';

function sanitizeErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unbekannter Fehler');
  const [message] = rawMessage.split(/\r?\n/, 1);

  return message
    .replace(/\bsk-[a-z0-9_-]{8,}\b/gi, REDACTED)
    .replace(/\b(postgres(?:ql)?):\/\/([^:\s/@]+):([^@\s/]+)@/gi, `$1://$2:${REDACTED}@`)
    .replace(/\b(authorization\s*:\s*bearer)\s+[^\s,;]+/gi, `$1 ${REDACTED}`)
    .replace(/\b(password|passwd|secret|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi, `$1=${REDACTED}`)
    .slice(0, 2000);
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
    [jobType, idempotencyKey, payload, runAfter, maxAttempts]
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

export async function completeJob(jobId, db = pool) {
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
      RETURNING *
    `,
    [jobId]
  );

  return rows[0] || null;
}

export async function failJob(jobId, error, db = pool) {
  const { rows } = await db.query(
    `
      UPDATE content_jobs
      SET status = 'failed',
          last_error = $2,
          locked_at = NULL,
          locked_by = NULL,
          finished_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [jobId, sanitizeErrorMessage(error)]
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
