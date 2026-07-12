import { isDeepStrictEqual } from 'node:util';

import {
  FaqItemSchema,
  InternalLinkSchema,
  ReviewOutputSchema,
  SourceReferenceSchema
} from './articleSchemas.js';

export const AUTO_PUBLISH_POLICY_VERSION = 'auto-v1';

const RISK_FIELDS = Object.freeze([
  'currentClaims',
  'legalClaims',
  'privacyClaims',
  'softwareVersionClaims',
  'staticPrices'
]);
const FOCUSED_KEYS = new Set(['blocked', 'items', 'riskFlags', 'sourceCount']);
const FOCUSED_ITEM_KEYS = new Set([
  'code', 'severity', 'section', 'excerpt', 'reason', 'instruction',
  'verificationType', 'sourceRequired', 'blocking', 'anchor'
]);
const VALIDATION_KEYS = new Set(['passed', 'issues', 'sanitizedHtml']);

function addReason(reasons, code) {
  if (!reasons.includes(code)) reasons.push(code);
}

function isNonEmptyString(value, maxLength = Infinity) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function hasOnlyKeys(value, allowed) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every((key) => allowed.has(key));
}

function validFocusedItem(item) {
  return hasOnlyKeys(item, FOCUSED_ITEM_KEYS)
    && isNonEmptyString(item.code, 120)
    && ['info', 'warning', 'error'].includes(item.severity)
    && isNonEmptyString(item.section, 180)
    && (item.excerpt === null || isNonEmptyString(item.excerpt, 280))
    && isNonEmptyString(item.reason, 600)
    && isNonEmptyString(item.instruction, 800)
    && ['none', 'source', 'date', 'price', 'version', 'legal', 'privacy'].includes(item.verificationType)
    && typeof item.sourceRequired === 'boolean'
    && typeof item.blocking === 'boolean'
    && isNonEmptyString(item.anchor, 240);
}

function validFocusedReport(report) {
  return hasOnlyKeys(report, FOCUSED_KEYS)
    && typeof report.blocked === 'boolean'
    && Array.isArray(report.items)
    && report.items.every(validFocusedItem)
    && Array.isArray(report.riskFlags)
    && report.riskFlags.every((flag) => isNonEmptyString(flag, 120))
    && Number.isInteger(report.sourceCount)
    && report.sourceCount >= 0;
}

function validValidation(validation, post) {
  return hasOnlyKeys(validation, VALIDATION_KEYS)
    && validation.passed === true
    && Array.isArray(validation.issues)
    && validation.issues.length === 0
    && isNonEmptyString(validation.sanitizedHtml)
    && isNonEmptyString(post?.content, 250_000)
    && validation.sanitizedHtml === post.content;
}

function validDraftState(post) {
  return post?.generated_by_ai === true
    && post.published === false
    && post.workflow_status === 'needs_review'
    && post.content_format === 'static_html';
}

function validImage(post) {
  if (!isNonEmptyString(post?.image_url, 2_048) || !isNonEmptyString(post?.image_alt, 500)) return false;
  try {
    const url = new URL(post.image_url);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validPostFields(post) {
  return isNonEmptyString(post?.title, 255)
    && isNonEmptyString(post?.excerpt, 500)
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post?.slug || '')
    && isNonEmptyString(post?.meta_title, 255)
    && isNonEmptyString(post?.meta_description, 160)
    && isNonEmptyString(post?.og_title, 255)
    && isNonEmptyString(post?.og_description, 500)
    && FaqItemSchema.array().min(5).max(7).safeParse(post?.faq_json).success;
}

function inspectSources(metadata, review, focusedReview) {
  const sources = metadata?.source_references_json;
  if (!Array.isArray(sources)) return { valid: false, required: false };
  const sourceRequired = review.issues.some((issue) => issue.sourceRequired === true)
    || focusedReview.items.some((item) => item.sourceRequired === true);
  if (sources.length === 0) {
    return {
      valid: !sourceRequired && focusedReview.sourceCount === 0,
      required: sourceRequired
    };
  }
  const parsed = SourceReferenceSchema.array().min(2).max(6).safeParse(sources);
  if (!parsed.success) return { valid: false, required: sourceRequired };
  const normalizedUrls = parsed.data.map(({ url }) => {
    const parsedUrl = new URL(url);
    parsedUrl.hash = '';
    return parsedUrl.toString();
  });
  const unique = new Set(normalizedUrls).size === normalizedUrls.length;
  return {
    valid: unique && focusedReview.sourceCount === parsed.data.length,
    required: sourceRequired
  };
}

export function evaluateAutoPublish({ snapshot, post, metadata, validation, riskReport } = {}) {
  const reasons = [];
  if (snapshot?.forcedMode === 'review') addReason(reasons, 'forced_review');
  if (snapshot?.operatingMode !== 'auto_publish') addReason(reasons, 'mode_review');
  if (snapshot?.autoPublishEffective !== true) addReason(reasons, 'technical_gate_disabled');
  if (!Number.isSafeInteger(Number(snapshot?.manualApprovalsCount))
      || Number(snapshot?.manualApprovalsCount) < 8) {
    addReason(reasons, 'manual_approvals_too_low');
  }

  const configuredScore = Number(snapshot?.autoPublishMinScore);
  const minimumScore = Number.isFinite(configuredScore) ? Math.max(90, configuredScore) : 90;
  const qualityScore = Number(metadata?.quality_score);
  if (!Number.isInteger(qualityScore) || qualityScore < minimumScore || qualityScore > 100) {
    addReason(reasons, 'quality_score_too_low');
  }
  if (!validDraftState(post)) addReason(reasons, 'draft_state_invalid');
  if (!validImage(post)) addReason(reasons, 'image_incomplete');
  if (!validPostFields(post)) addReason(reasons, 'article_fields_invalid');
  if (!InternalLinkSchema.array().min(2).max(8).safeParse(metadata?.internal_links_json).success) {
    addReason(reasons, 'internal_links_invalid');
  }
  if (!validValidation(validation, post)) addReason(reasons, 'validation_failed');

  const persistedReport = metadata?.quality_report_json;
  if (!persistedReport || typeof persistedReport !== 'object' || Array.isArray(persistedReport)) {
    addReason(reasons, 'review_incomplete');
    addReason(reasons, 'risk_report_incomplete');
    return { allowed: false, policyVersion: AUTO_PUBLISH_POLICY_VERSION, reasons };
  }
  const { focusedReview: persistedFocused, ...reviewCandidate } = persistedReport;
  const parsedReview = ReviewOutputSchema.safeParse(reviewCandidate);
  if (!parsedReview.success
      || parsedReview.data.passed !== true
      || parsedReview.data.requiresManualReview !== false
      || parsedReview.data.score !== qualityScore) {
    addReason(reasons, 'review_incomplete');
  }

  if (!validFocusedReport(riskReport)
      || !validFocusedReport(persistedFocused)
      || !isDeepStrictEqual(persistedFocused, riskReport)) {
    addReason(reasons, 'risk_report_incomplete');
  }

  if (parsedReview.success) {
    for (const field of RISK_FIELDS) {
      if (parsedReview.data.risks[field] !== false) addReason(reasons, `risk_${field}`);
    }
    if (parsedReview.data.issues.some((issue) => issue.blocking || issue.autoPublishBlocking)) {
      addReason(reasons, 'risk_review_required');
    }
  }
  if (validFocusedReport(riskReport) && (
    riskReport.blocked === true
    || riskReport.riskFlags.length > 0
    || riskReport.items.some((item) => item.blocking === true)
  )) {
    addReason(reasons, 'risk_review_required');
  }

  if (parsedReview.success && validFocusedReport(riskReport)) {
    const sourceInspection = inspectSources(metadata, parsedReview.data, riskReport);
    if (!sourceInspection.valid) {
      addReason(reasons, sourceInspection.required ? 'sources_required' : 'sources_invalid');
    }
  } else if (!Array.isArray(metadata?.source_references_json)) {
    addReason(reasons, 'sources_invalid');
  }

  return {
    allowed: reasons.length === 0,
    policyVersion: AUTO_PUBLISH_POLICY_VERSION,
    reasons
  };
}
