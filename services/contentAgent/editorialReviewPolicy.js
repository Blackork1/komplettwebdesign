const TECHNICAL_ISSUE_CODE_PATTERNS = Object.freeze([
  /^cta_(?:count|locations?|tracking|contact_target|structure)/i,
  /^faq_(?:count|structure|structural|visibility|visible|markup|json|mismatch)/i,
  /^html_/i,
  /^bootstrap_/i,
  /^class_/i,
  /^h1_/i,
  /^meta_(?:title|description)/i,
  /^slug_/i,
  /^image_alt/i,
  /^internal_link_(?:count|target|href|validity)/i
]);

function technicalIssue(issue) {
  const code = typeof issue?.code === 'string' ? issue.code.trim() : '';
  return TECHNICAL_ISSUE_CODE_PATTERNS.some((pattern) => pattern.test(code));
}

function blocksEditorialApproval(issue) {
  return issue?.blocking === true || issue?.autoPublishBlocking === true;
}

function hasActiveRisk(risks) {
  return Boolean(
    risks
    && typeof risks === 'object'
    && !Array.isArray(risks)
    && Object.values(risks).some((value) => value === true)
  );
}

export function normalizeEditorialReview(review = {}) {
  const rawIssues = Array.isArray(review.issues) ? review.issues : [];
  const editorialIssues = rawIssues.filter((issue) => !technicalIssue(issue));
  const hasEditorialBlocker = editorialIssues.some(blocksEditorialApproval);
  const activeRisk = hasActiveRisk(review.risks);
  const approvalBlocked = hasEditorialBlocker || activeRisk;

  return {
    ...review,
    issues: editorialIssues,
    passed: !approvalBlocked,
    score: approvalBlocked ? review.score : Math.max(80, Number(review.score) || 0),
    requiresManualReview: approvalBlocked
  };
}

export function reviewHasOnlyTechnicalBlockingIssues(review = {}) {
  const issues = Array.isArray(review.issues) ? review.issues : [];
  const blockingIssues = issues.filter(blocksEditorialApproval);
  return blockingIssues.length > 0
    && blockingIssues.every(technicalIssue)
    && !hasActiveRisk(review.risks);
}
