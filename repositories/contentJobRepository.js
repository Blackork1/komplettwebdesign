import pool from '../util/db.js';
import {
  ADMIN_CONTENT_JOB_RETRY_CAP,
  providerRecoveryRetryCap,
  PROVIDER_SCHEMA_REPAIR_RETRY_CAP,
  REJECTED_PROVIDER_SCHEMA_REPAIR_RETRY_CAP,
  QUALITY_GATE_RECOVERY_AUDIT_KEY,
  QUALITY_GATE_RECOVERY_RETRY_CAP
} from '../services/contentAgent/contentJobRetryPolicy.js';
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
  return ['sync_search_console', 'analyze_search_opportunities'].includes(jobType)
    || (jobType === 'generate_weekly_draft' && payload?.source === 'weekly-schedule')
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
        AND job_type <> 'send_admin_review_notification'
        AND status IN ('failed', 'needs_manual_attention')
        AND COALESCE(last_error, '') <> 'provider_execution_uncertain'
        AND attempts < $2
      RETURNING *
    `,
    [jobId, cap]
  );
  return rows[0] || null;
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
        SET stage_results_json =
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
        SET stage_results_json = stage_results_json || jsonb_build_object(
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
    const runResult = await client.query(
      `
        UPDATE content_runs
        SET stage_results_json = stage_results_json || jsonb_build_object(
              $2::text,
              jsonb_build_object(
                'status', 'authorized_after_quality_gate',
                'stageId', $3::text,
                'baseMaxRevisions', $4::integer,
                'additionalRevisionCount', 1,
                'adminId', $5::bigint,
                'authorizedAt', NOW()
              )
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
        RETURNING id
      `,
      [state.run_id, QUALITY_GATE_RECOVERY_AUDIT_KEY, recoveredStage, baseMaxRevisions, adminId]
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
    [...lease, sanitizeErrorMessage(error), normalizedBackoff, normalizedRetryAt]
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
    [...lease, sanitizeErrorMessage(error), retryAt]
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
               delivery.next_attempt_at AS delivery_next_attempt_at
        FROM content_jobs AS job
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
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status IN ('queued', 'sending')
              THEN 'queued'
            ELSE CASE
              WHEN job.attempts < job.max_attempts THEN 'queued'
              ELSE 'failed'
            END
          END,
          attempts = CASE
            WHEN job.job_type IN ('send_admin_review_notification', 'send_blog_newsletter_delivery')
              AND expired.delivery_status IN ('queued', 'sending')
              THEN GREATEST(job.attempts - 1, 0)
            ELSE job.attempts
          END,
          run_after = CASE
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
          finished_at = CASE
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
