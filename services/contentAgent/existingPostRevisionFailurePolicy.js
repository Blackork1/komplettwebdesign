const EXISTING_POST_REVISION_FAILURE_CODES = new Set([
  'CONTENT_BUDGET_LIMIT_REACHED',
  'CONTENT_JOB_LEASE_LOST',
  'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID',
  'CONTENT_REVISION_REVALIDATION_FENCE_LOST',
  'CONTENT_REVISION_REVALIDATION_PAYLOAD_INVALID',
  'CONTENT_REVISION_REVALIDATION_QUALITY_FAILED',
  'CONTENT_REVISION_REVALIDATION_SCOPE_FAILED',
  'CONTENT_REVISION_REVALIDATION_TECHNICAL_FAILED',
  'provider_execution_uncertain',
  'provider_stage_cost_invalid',
  'provider_stage_persistence_uncertain',
  'provider_stage_result_invalid',
  'provider_stage_schema_invalid'
]);

export function isExistingPostRevisionFailureCode(value) {
  return typeof value === 'string' && EXISTING_POST_REVISION_FAILURE_CODES.has(value);
}
