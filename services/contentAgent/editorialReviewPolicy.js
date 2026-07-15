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
  /^internal_link_(?:count|target|href|validity)/i,
  /(?:^|_)internal_link(?:_|$)/i
]);

const EXPLICIT_PRICE_AMOUNT_PATTERN = /(?:\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\s*(?:€|EUR\b|Euro\b)|(?:€|EUR\b|Euro\b)\s*\d)/iu;
const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/gu;
const YEAR_COMPARISON_PATTERN = /(?:vs\.?|versus|vergleich|gegenüber|vorjahr)/iu;
const EXISTING_POST_REVIEW_TYPE = 'existing_post_targeted_optimization';
const EMPTY_RISKS = Object.freeze({
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
});

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

function existingPostReview(context) {
  return context?.briefing?.type === EXISTING_POST_REVIEW_TYPE;
}

function issueEvidence(issue) {
  return typeof issue?.evidenceExcerpt === 'string' ? issue.evidenceExcerpt.trim() : '';
}

function priceIssue(issue) {
  const code = typeof issue?.code === 'string' ? issue.code : '';
  return issue?.verificationType === 'price'
    || /(?:^|_)(?:static_)?price(?:_|$)/iu.test(code);
}

function staleYearIssue(issue) {
  return /(?:^|_)(?:stale_year|year_mismatch|year_reference)(?:_|$)/iu.test(
    String(issue?.code || '')
  );
}

function unsubstantiatedExistingPostIssue(issue, context) {
  const evidence = issueEvidence(issue);
  if (priceIssue(issue) && !EXPLICIT_PRICE_AMOUNT_PATTERN.test(evidence)) return true;
  if (!staleYearIssue(issue)) return false;

  const currentYear = Number(context?.briefing?.currentYear);
  if (!Number.isSafeInteger(currentYear)) return false;
  const sectionHeading = typeof issue?.sectionHeading === 'string'
    ? issue.sectionHeading
    : '';
  const years = [...new Set(`${sectionHeading} ${evidence}`.match(YEAR_PATTERN) || [])]
    .map(Number);
  if (years.length === 0 || years.every((year) => year >= currentYear)) return true;
  return years.length >= 2
    && YEAR_COMPARISON_PATTERN.test(`${sectionHeading} ${evidence}`);
}

function existingPostRisks(issues) {
  const risks = { ...EMPTY_RISKS };
  for (const issue of issues) {
    if (!blocksEditorialApproval(issue)) continue;
    const verificationType = issue?.verificationType;
    const code = String(issue?.code || '');
    if (verificationType === 'date' || /(?:current|fresh|stale_year)/iu.test(code)) {
      risks.currentClaims = true;
    }
    if (verificationType === 'legal' || /legal/iu.test(code)) risks.legalClaims = true;
    if (verificationType === 'privacy' || /privacy|datenschutz/iu.test(code)) {
      risks.privacyClaims = true;
    }
    if (verificationType === 'version' || /version|software/iu.test(code)) {
      risks.softwareVersionClaims = true;
    }
    if (verificationType === 'price' || priceIssue(issue)) risks.staticPrices = true;
  }
  return risks;
}

export function normalizeEditorialReview(review = {}, context = {}) {
  const rawIssues = Array.isArray(review.issues) ? review.issues : [];
  const isExistingPostReview = existingPostReview(context);
  const editorialIssues = rawIssues
    .filter((issue) => !technicalIssue(issue))
    .filter((issue) => (
      !isExistingPostReview || !unsubstantiatedExistingPostIssue(issue, context)
    ));
  const hasEditorialBlocker = editorialIssues.some(blocksEditorialApproval);
  const risks = isExistingPostReview
    ? existingPostRisks(editorialIssues)
    : review.risks;
  const activeRisk = hasActiveRisk(risks);
  const approvalBlocked = hasEditorialBlocker || activeRisk;

  return {
    ...review,
    issues: editorialIssues,
    risks,
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
