const EXISTING_POST_REVISION_FAILURE_CODES = new Set([
  'CONTENT_BUDGET_LIMIT_REACHED',
  'CONTENT_JOB_LEASE_LOST',
  'CONTENT_ACTION_VALIDATION_FAILED',
  'CONTENT_REVISION_CONFLICT',
  'CONTENT_REVISION_NOT_FOUND',
  'CONTENT_REVISION_STALE',
  'CONTENT_REVISION_VALIDATION_FAILED',
  'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID',
  'CONTENT_REVISION_REVALIDATION_FENCE_LOST',
  'CONTENT_REVISION_REVALIDATION_PAYLOAD_INVALID',
  'CONTENT_REVISION_REVALIDATION_QUALITY_FAILED',
  'CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED',
  'CONTENT_REVISION_REVALIDATION_SCOPE_FAILED',
  'CONTENT_REVISION_REVALIDATION_TECHNICAL_FAILED',
  'provider_execution_uncertain',
  'provider_stage_cost_invalid',
  'provider_stage_persistence_uncertain',
  'provider_stage_result_invalid',
  'provider_stage_schema_invalid'
]);
const TRANSIENT_ERROR_CODES = new Set([
  'CONTENT_DATABASE_TEMPORARY',
  'CONTENT_JOB_LEASE_REQUIRED',
  'CONTENT_NETWORK_TEMPORARY',
  'CONTENT_PROVIDER_SAFE_RETRY',
  'CONTENT_REVISION_REVALIDATION_FAILURE_PERSIST_FAILED',
  'CONTENT_REVISION_REVALIDATION_TRANSIENT',
  'CONTENT_RUN_FINISH_FAILED',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETDOWN',
  'ENETUNREACH',
  'EPIPE',
  'ETIMEDOUT'
]);
const PERMANENT_CONTEXT_ERROR_CODES = new Set([
  'CONTENT_ACTION_VALIDATION_FAILED',
  'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
  'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_TOO_LARGE',
  'CONTENT_REVISION_CONFLICT',
  'CONTENT_REVISION_NOT_FOUND',
  'CONTENT_REVISION_STALE',
  'CONTENT_REVISION_VALIDATION_FAILED',
  'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID',
  'CONTENT_REVISION_REVALIDATION_PAYLOAD_INVALID',
  'CONTENT_RULE_MANIFEST_MISMATCH',
  'CONTENT_RUNTIME_SNAPSHOT_LINKS_INVALID',
  'CONTENT_RUNTIME_SNAPSHOT_RULES_MISSING',
  'CONTENT_RUNTIME_SNAPSHOT_TOO_LARGE'
]);

function persistedFailureCode(code) {
  return EXISTING_POST_REVISION_FAILURE_CODES.has(code)
    ? code
    : 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID';
}

function isTransientPostgresCode(code) {
  return typeof code === 'string' && (
    /^(?:08|40|53|58)[0-9A-Z]{3}$/.test(code)
    || /^(?:55P03|57014|57P0[123])$/.test(code)
  );
}

function retriesExhausted(claim = {}) {
  const attempts = Number(claim?.attempts);
  const maxAttempts = Number(claim?.max_attempts ?? claim?.maxAttempts);
  return Number.isSafeInteger(attempts)
    && Number.isSafeInteger(maxAttempts)
    && attempts > 0
    && maxAttempts > 0
    && attempts >= maxAttempts;
}

export function isExistingPostRevisionFailureCode(value) {
  return typeof value === 'string' && EXISTING_POST_REVISION_FAILURE_CODES.has(value);
}

export function classifyExistingPostRevisionError(error, claim = {}) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === 'CONTENT_JOB_LEASE_LOST') {
    return { disposition: 'lease_lost', failureCode: null, exhausted: false };
  }
  if (code === 'CONTENT_REVISION_REVALIDATION_FENCE_LOST') {
    return { disposition: 'fence_lost', failureCode: null, exhausted: false };
  }
  if (TRANSIENT_ERROR_CODES.has(code) || isTransientPostgresCode(code)) {
    if (retriesExhausted(claim)) {
      return {
        disposition: 'permanent',
        failureCode: 'CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED',
        exhausted: true
      };
    }
    return { disposition: 'transient', failureCode: null, exhausted: false };
  }
  if (EXISTING_POST_REVISION_FAILURE_CODES.has(code)) {
    return {
      disposition: 'permanent',
      failureCode: code,
      exhausted: false
    };
  }
  if (PERMANENT_CONTEXT_ERROR_CODES.has(code) || error?.retryable === false) {
    return {
      disposition: 'permanent',
      failureCode: persistedFailureCode(code),
      exhausted: false
    };
  }
  return {
    disposition: 'permanent',
    failureCode: 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID',
    exhausted: false
  };
}

export function existingPostRevisionTransientError(cause) {
  return Object.assign(
    new Error('Die Revalidierung konnte wegen eines vorübergehenden Datenbank- oder Netzwerkfehlers nicht fortgesetzt werden.', { cause }),
    { code: 'CONTENT_REVISION_REVALIDATION_TRANSIENT', retryable: true }
  );
}

export function existingPostRevisionCleanupRetryError(cause, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const retryAt = new Date(now.getTime() + 30_000);
  const action = ['complete', 'fail', 'finish'].includes(options.action)
    ? options.action
    : 'reconcile';
  const failureCode = action === 'fail' && isExistingPostRevisionFailureCode(options.failureCode)
    ? options.failureCode
    : null;
  const cleanupToken = action === 'reconcile'
    ? 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY'
    : [
      'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY',
      action,
      ...(failureCode ? [failureCode] : [])
    ].join(':');
  return Object.assign(
    new Error('Der terminale Abschluss der Revalidierung ist noch nicht vollständig gespeichert.', { cause }),
    {
      code: 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY',
      retryable: true,
      doesNotConsumeAttempt: true,
      retryAt,
      cleanupAction: action,
      cleanupFailureCode: failureCode,
      cleanupToken
    }
  );
}
