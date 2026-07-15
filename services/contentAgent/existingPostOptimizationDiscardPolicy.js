export const DETERMINISTIC_EXISTING_OPTIMIZATION_DISCARD_CODES = Object.freeze([
  'CONTENT_BUDGET_LIMIT_REACHED',
  'CONTENT_EXISTING_OPTIMIZATION_INPUT_INVALID',
  'CONTENT_EXISTING_OPTIMIZATION_PAYLOAD_INVALID',
  'CONTENT_EXISTING_OPTIMIZATION_RUNTIME_SNAPSHOT_INVALID',
  'CONTENT_POST_NOT_FOUND',
  'CONTENT_REVISION_STALE',
  'CONTENT_RULE_MANIFEST_MISMATCH',
  'CONTENT_RUNTIME_SNAPSHOT_INVALID',
  'article_validation_failed',
  'editorial_review_failed',
  'existing_post_editorial_review_failed',
  'existing_post_optimization_repair_failed',
  'existing_post_optimization_report_too_large',
  'insufficient_existing_post_sources',
  'live_post_hash_mismatch',
  'persisted_stage_result_invalid',
  'sanitized_html_changed',
  'targeted_scope_exceeded'
]);

const DETERMINISTIC_DISCARD_CODES = new Set(
  DETERMINISTIC_EXISTING_OPTIMIZATION_DISCARD_CODES
);

export function canDiscardDeterministicExistingPostOptimization({
  jobType,
  jobStatus,
  runStatus,
  errorCode,
  openProviderReservationCount,
  hasDraftRevision
} = {}) {
  return jobType === 'optimize_existing_post'
    && jobStatus === 'needs_manual_attention'
    && runStatus === 'needs_manual_attention'
    && DETERMINISTIC_DISCARD_CODES.has(errorCode)
    && Number(openProviderReservationCount) === 0
    && hasDraftRevision !== true;
}
