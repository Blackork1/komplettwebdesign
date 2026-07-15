export const ADMIN_CONTENT_JOB_RETRY_CAP = 5;
export const PROVIDER_SCHEMA_REPAIR_RETRY_CAP = 6;
export const REJECTED_PROVIDER_SCHEMA_REPAIR_RETRY_CAP = 7;
export const QUALITY_GATE_RECOVERY_RETRY_CAP = 8;
export const QUALITY_GATE_RECOVERY_AUDIT_KEY = 'quality_gate_recovery:structure_contract:attempt-7';
export const QUALITY_GATE_RULE_MANIFEST_RECOVERY_RETRY_CAP = 9;
export const QUALITY_GATE_RULE_MANIFEST_RECOVERY_AUDIT_KEY =
  'rule_manifest_recovery:quality_gate:attempt-8';
export const EDITORIAL_REVIEW_RECOVERY_RETRY_CAP = 10;
export const EDITORIAL_REVIEW_RECOVERY_AUDIT_KEY =
  'editorial_review_recovery:review_scope:attempt-9';
export const DRAFT_PERSISTENCE_RECOVERY_RETRY_CAP = 11;
export const DRAFT_PERSISTENCE_RECOVERY_AUDIT_KEY =
  'draft_persistence_recovery:metadata_contract:attempt-10';

const RETRYABLE_JOB_STATUSES = new Set(['failed', 'needs_manual_attention']);
const ADMIN_REVIEW_NOTIFICATION_JOB = 'send_admin_review_notification';
const JOBS_WITH_DEDICATED_RECOVERY = new Set([
  'optimize_existing_post',
  'revalidate_existing_post_revision'
]);

export function canRetryContentJobManually({ jobType, status, attempts, lastError } = {}) {
  const normalizedAttempts = Number(attempts);
  return lastError !== 'provider_execution_uncertain'
    && jobType !== ADMIN_REVIEW_NOTIFICATION_JOB
    && !JOBS_WITH_DEDICATED_RECOVERY.has(jobType)
    && RETRYABLE_JOB_STATUSES.has(status)
    && Number.isSafeInteger(normalizedAttempts)
    && normalizedAttempts >= 0
    && normalizedAttempts < ADMIN_CONTENT_JOB_RETRY_CAP;
}

export function canRecoverUncertainProviderJob({
  jobType,
  status,
  attempts,
  lastError,
  postId,
  openReservationCount,
  preExecutionSchemaRejection = false
} = {}) {
  const normalizedAttempts = Number(attempts);
  const retryCap = preExecutionSchemaRejection === true
    ? PROVIDER_SCHEMA_REPAIR_RETRY_CAP
    : ADMIN_CONTENT_JOB_RETRY_CAP;
  return jobType !== ADMIN_REVIEW_NOTIFICATION_JOB
    && status === 'needs_manual_attention'
    && lastError === 'provider_execution_uncertain'
    && postId == null
    && Number.isSafeInteger(normalizedAttempts)
    && normalizedAttempts >= 0
    && normalizedAttempts < retryCap
    && Number(openReservationCount) === 1;
}

export function isKnownPreExecutionSchemaRejection(errorReport) {
  const diagnostic = errorReport?.providerDiagnostic;
  return errorReport?.code === 'provider_execution_uncertain'
    && diagnostic?.provider === 'openai'
    && diagnostic?.code === 'invalid_json_schema'
    && Number(diagnostic?.httpStatus) === 400;
}

export function providerRecoveryRetryCap(errorReport) {
  return isKnownPreExecutionSchemaRejection(errorReport)
    ? PROVIDER_SCHEMA_REPAIR_RETRY_CAP
    : ADMIN_CONTENT_JOB_RETRY_CAP;
}

export function canRecoverRejectedProviderJob({
  jobType,
  status,
  attempts,
  lastError,
  currentStage,
  providerStage,
  postId,
  openReservationCount,
  schemaRepairable = false
} = {}) {
  const normalizedAttempts = Number(attempts);
  return ['generate_weekly_draft', 'generate_manual_draft'].includes(jobType)
    && status === 'needs_manual_attention'
    && lastError === 'provider_request_rejected'
    && currentStage === 'seo_brief'
    && providerStage === 'article_generation'
    && postId == null
    && schemaRepairable === true
    && Number(openReservationCount) === 0
    && normalizedAttempts === PROVIDER_SCHEMA_REPAIR_RETRY_CAP;
}

export function canRecoverQualityGateJob({
  jobType,
  status,
  attempts,
  lastError,
  currentStage,
  postId,
  openReservationCount,
  structureRepairable = false
} = {}) {
  return ['generate_weekly_draft', 'generate_manual_draft'].includes(jobType)
    && status === 'needs_manual_attention'
    && Number(attempts) === QUALITY_GATE_RECOVERY_RETRY_CAP - 1
    && lastError === 'quality_gate_failed'
    && currentStage === 'validation'
    && postId == null
    && Number(openReservationCount) === 0
    && structureRepairable === true;
}

export function canRecoverQualityGateRuleManifest({
  jobType,
  status,
  attempts,
  lastError,
  currentStage,
  postId,
  openReservationCount,
  manifestRepairable = false
} = {}) {
  return ['generate_weekly_draft', 'generate_manual_draft'].includes(jobType)
    && status === 'needs_manual_attention'
    && Number(attempts) === QUALITY_GATE_RULE_MANIFEST_RECOVERY_RETRY_CAP - 1
    && lastError === 'CONTENT_RULE_MANIFEST_MISMATCH'
    && currentStage === 'validation'
    && postId == null
    && Number(openReservationCount) === 0
    && manifestRepairable === true;
}

export function canRecoverEditorialReview({
  jobType,
  status,
  attempts,
  lastError,
  currentStage,
  postId,
  openReservationCount,
  editorialReviewRecoverable = false
} = {}) {
  return ['generate_weekly_draft', 'generate_manual_draft'].includes(jobType)
    && status === 'needs_manual_attention'
    && Number(attempts) === EDITORIAL_REVIEW_RECOVERY_RETRY_CAP - 1
    && lastError === 'quality_gate_failed'
    && currentStage === 'review'
    && postId == null
    && Number(openReservationCount) === 0
    && editorialReviewRecoverable === true;
}

export function canRecoverDraftPersistence({
  jobType,
  status,
  attempts,
  lastError,
  currentStage,
  postId,
  openReservationCount,
  draftPersistenceRecoverable = false
} = {}) {
  return ['generate_weekly_draft', 'generate_manual_draft'].includes(jobType)
    && status === 'failed'
    && Number(attempts) === DRAFT_PERSISTENCE_RECOVERY_RETRY_CAP - 1
    && lastError === 'value too long for type character varying(80)'
    && currentStage === 'image_cleanup'
    && postId == null
    && Number(openReservationCount) === 0
    && draftPersistenceRecoverable === true;
}
