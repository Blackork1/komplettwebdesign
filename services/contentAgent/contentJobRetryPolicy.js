export const ADMIN_CONTENT_JOB_RETRY_CAP = 5;

const RETRYABLE_JOB_STATUSES = new Set(['failed', 'needs_manual_attention']);
const ADMIN_REVIEW_NOTIFICATION_JOB = 'send_admin_review_notification';

export function canRetryContentJobManually({ jobType, status, attempts, lastError } = {}) {
  const normalizedAttempts = Number(attempts);
  return lastError !== 'provider_execution_uncertain'
    && jobType !== ADMIN_REVIEW_NOTIFICATION_JOB
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
  openReservationCount
} = {}) {
  const normalizedAttempts = Number(attempts);
  return jobType !== ADMIN_REVIEW_NOTIFICATION_JOB
    && status === 'needs_manual_attention'
    && lastError === 'provider_execution_uncertain'
    && postId == null
    && Number.isSafeInteger(normalizedAttempts)
    && normalizedAttempts >= 0
    && normalizedAttempts < ADMIN_CONTENT_JOB_RETRY_CAP
    && Number(openReservationCount) === 1;
}
