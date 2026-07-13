export const ADMIN_CONTENT_JOB_RETRY_CAP = 5;

const RETRYABLE_JOB_STATUSES = new Set(['failed', 'needs_manual_attention']);
const ADMIN_REVIEW_NOTIFICATION_JOB = 'send_admin_review_notification';

export function canRetryContentJobManually({ jobType, status, attempts } = {}) {
  const normalizedAttempts = Number(attempts);
  return jobType !== ADMIN_REVIEW_NOTIFICATION_JOB
    && RETRYABLE_JOB_STATUSES.has(status)
    && Number.isSafeInteger(normalizedAttempts)
    && normalizedAttempts >= 0
    && normalizedAttempts < ADMIN_CONTENT_JOB_RETRY_CAP;
}
