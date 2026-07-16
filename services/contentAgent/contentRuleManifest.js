import { createHash } from 'node:crypto';

import { ARTICLE_SCHEMA_VERSION } from './articleSchemas.js';
import { ARTICLE_VALIDATOR_VERSION } from './articleValidator.js';
import { AUTO_PUBLISH_POLICY_VERSION } from './autoPublishPolicy.js';
import { promptVersion as articleRepairPrompt } from './prompts/articleRepairPrompt.js';
import { promptVersion as articleReviewerPrompt } from './prompts/articleReviewerPrompt.js';
import { promptVersion as articleWriterPrompt } from './prompts/articleWriterPrompt.js';
import { promptVersion as brandPolicyPrompt } from './prompts/brandPolicy.js';
import { promptVersion as seoBriefPrompt } from './prompts/seoBriefPrompt.js';
import { promptVersion as topicResearchPrompt } from './prompts/topicResearchPrompt.js';
import { promptVersion as webResearchPrompt } from './prompts/webResearchPrompt.js';
import { promptVersion as contentLearningClassifierPrompt } from './prompts/contentLearningClassifierPrompt.js';
import { promptVersion as existingPostOptimizationPrompt } from './prompts/existingPostOptimizationPrompt.js';
import { promptVersion as existingPostSourceResearchPrompt } from './prompts/existingPostSourceResearchPrompt.js';
import { EXISTING_POST_DIFF_POLICY_VERSION } from './existingPostDiffService.js';
import { EXISTING_POST_FRESHNESS_POLICY_VERSION } from './existingPostFreshnessService.js';
import { EXISTING_POST_OPTIMIZATION_SCHEMA_VERSION } from './existingPostOptimizationSchemas.js';
import { RISK_REPORT_VERSION } from './riskReportService.js';
import { CONTENT_LEARNING_TAXONOMY_VERSION } from './contentLearningTaxonomy.js';
import {
  CONTENT_LEARNING_SNAPSHOT_VERSION,
  buildLearningRuleSnapshot,
  validateLearningRuleSnapshot
} from './contentLearningSnapshotService.js';
import { REVIEW_ISSUE_OPTIMIZATION_POLICY_VERSION } from './reviewIssueOptimizationService.js';
import { TOPIC_SCORING_VERSION } from './topicScoringService.js';
import { EDITORIAL_REVIEW_POLICY_VERSION } from './editorialReviewPolicy.js';
import {
  INTERNAL_LINK_NORMALIZATION_VERSION,
  buildTrustedInternalPaths,
  normalizeTrustedInternalPaths
} from './trustedInternalLinkService.js';

export const MAX_SNAPSHOT_INTERNAL_LINKS = 5000;
export const MAX_RUNTIME_SNAPSHOT_BYTES = 250_000;
export const EXISTING_POST_TRUSTED_CONTEXT_VERSION = 1;
export const MAX_EXISTING_POST_TRUSTED_CONTEXT_BYTES = 96_000;
const MAX_INTERNAL_LINK_LENGTH = 2048;
const MAX_EXISTING_SLUG_LENGTH = 255;
const EXISTING_POST_METADATA_FIELDS = Object.freeze([
  'post_id',
  'primary_keyword',
  'secondary_keywords',
  'search_intent',
  'target_audience',
  'region_focus',
  'content_cluster',
  'business_goal',
  'cta_type',
  'internal_links_json',
  'source_references_json',
  'quality_score',
  'quality_report_json'
]);

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function canonicalSha256(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export const CONTENT_AGENT_RULE_MANIFEST = Object.freeze({
  articleRepairPrompt,
  articleReviewerPrompt,
  articleSchema: ARTICLE_SCHEMA_VERSION,
  articleValidator: ARTICLE_VALIDATOR_VERSION,
  articleWriterPrompt,
  autoPublishPolicy: AUTO_PUBLISH_POLICY_VERSION,
  brandPolicyPrompt,
  contentLearningClassifierPrompt,
  contentLearningSnapshot: CONTENT_LEARNING_SNAPSHOT_VERSION,
  contentLearningTaxonomy: CONTENT_LEARNING_TAXONOMY_VERSION,
  editorialReviewPolicy: EDITORIAL_REVIEW_POLICY_VERSION,
  existingPostDiffPolicy: EXISTING_POST_DIFF_POLICY_VERSION,
  existingPostFreshnessPolicy: EXISTING_POST_FRESHNESS_POLICY_VERSION,
  existingPostOptimizationPrompt,
  existingPostOptimizationSchema: EXISTING_POST_OPTIMIZATION_SCHEMA_VERSION,
  existingPostSourceResearchPrompt,
  internalLinkNormalization: INTERNAL_LINK_NORMALIZATION_VERSION,
  riskReport: RISK_REPORT_VERSION,
  reviewIssueOptimizationPolicy: REVIEW_ISSUE_OPTIMIZATION_POLICY_VERSION,
  seoBriefPrompt,
  topicResearchPrompt,
  topicScoring: TOPIC_SCORING_VERSION,
  webResearchPrompt
});

export const CONTENT_AGENT_RULE_MANIFEST_HASH = canonicalSha256(CONTENT_AGENT_RULE_MANIFEST);

function canonicalInternalLinks(values) {
  const links = [...normalizeTrustedInternalPaths(values)].sort();
  if (links.length > MAX_SNAPSHOT_INTERNAL_LINKS) {
    throw new RangeError('Der Runtime-Snapshot enthält zu viele vertrauenswürdige interne Links.');
  }
  if (links.some((link) => link.length > MAX_INTERNAL_LINK_LENGTH)) {
    throw new RangeError('Ein vertrauenswürdiger interner Link ist für den Runtime-Snapshot zu lang.');
  }
  return links;
}

function trustedContextError(code, message, ErrorType = TypeError) {
  return Object.assign(new ErrorType(message), { code });
}

function assertJsonSafe(value, depth = 0) {
  if (depth > 12) throw trustedContextError(
    'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
    'Der Trusted Context ist zu tief verschachtelt.'
  );
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    if (value.length > 5_000) throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Eine Liste im Trusted Context enthält zu viele Einträge.'
    );
    for (const entry of value) assertJsonSafe(entry, depth + 1);
    return;
  }
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Der Trusted Context enthält einen nicht unterstützten Wert.'
    );
  }
  const entries = Object.entries(value);
  if (entries.length > 5_000) throw trustedContextError(
    'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
    'Ein Objekt im Trusted Context enthält zu viele Felder.'
  );
  for (const [key, entry] of entries) {
    if (!key || key.length > 160 || entry === undefined) throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Der Trusted Context enthält ein ungültiges Feld.'
    );
    assertJsonSafe(entry, depth + 1);
  }
}

function canonicalExistingSlugs(values) {
  if (!Array.isArray(values) || values.length > MAX_SNAPSHOT_INTERNAL_LINKS) {
    throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Die gespeicherten Slugs des Trusted Context sind ungültig.'
    );
  }
  const slugs = [];
  for (const value of values) {
    if (typeof value !== 'string') throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Ein gespeicherter Slug des Trusted Context ist ungültig.'
    );
    const slug = value.trim();
    if (!slug || slug.length > MAX_EXISTING_SLUG_LENGTH) throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Ein gespeicherter Slug des Trusted Context ist ungültig.'
    );
    slugs.push(slug);
  }
  return [...new Set(slugs)].sort();
}

export function buildExistingPostTrustedContext(value, allowedInternalLinks) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Der Trusted Context der Bestandsoptimierung fehlt.'
    );
  }
  const metadata = value.metadata === null || value.metadata === undefined
    ? null
    : Object.fromEntries(EXISTING_POST_METADATA_FIELDS.flatMap((field) => (
      Object.hasOwn(value.metadata || {}, field) ? [[field, value.metadata[field]]] : []
    )));
  if (metadata !== null
      && (!value.metadata || typeof value.metadata !== 'object' || Array.isArray(value.metadata))) {
    throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID',
      'Die Metadaten des Trusted Context sind ungültig.'
    );
  }
  assertJsonSafe(metadata);
  const context = {
    version: EXISTING_POST_TRUSTED_CONTEXT_VERSION,
    existingSlugs: canonicalExistingSlugs(value.existingSlugs),
    allowedInternalLinks: canonicalInternalLinks(allowedInternalLinks),
    metadata: metadata === null ? null : canonicalValue(metadata)
  };
  if (Buffer.byteLength(canonicalJson(context), 'utf8') > MAX_EXISTING_POST_TRUSTED_CONTEXT_BYTES) {
    throw trustedContextError(
      'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_TOO_LARGE',
      'Der Trusted Context der Bestandsoptimierung ist zu groß.',
      RangeError
    );
  }
  return Object.freeze({
    ...context,
    existingSlugs: Object.freeze(context.existingSlugs),
    allowedInternalLinks: Object.freeze(context.allowedInternalLinks),
    metadata: context.metadata === null ? null : Object.freeze(context.metadata)
  });
}

export function readExistingPostTrustedContextSnapshot(snapshot) {
  try {
    const context = buildExistingPostTrustedContext(
      snapshot?.existingPostTrustedContext,
      snapshot?.allowedInternalLinks
    );
    if (canonicalJson(context) !== canonicalJson(snapshot.existingPostTrustedContext)
        || snapshot.existingPostTrustedContextHash !== canonicalSha256(context)) return null;
    return context;
  } catch {
    return null;
  }
}

export function buildAllowedInternalLinksFromInventory(inventory = {}) {
  const entries = [
    ...(Array.isArray(inventory.approvedLinks) ? inventory.approvedLinks : []),
    ...(Array.isArray(inventory.blogPosts) ? inventory.blogPosts.map((item) => ({ ...item, type: 'blog' })) : []),
    ...(Array.isArray(inventory.guides) ? inventory.guides.map((item) => ({ ...item, type: 'guide' })) : []),
    ...(Array.isArray(inventory.servicePages) ? inventory.servicePages.map((item) => ({ ...item, type: 'service' })) : []),
    ...(Array.isArray(inventory.industries) ? inventory.industries.map((item) => ({ ...item, type: 'industry' })) : [])
  ];
  const links = buildTrustedInternalPaths(entries);
  if (links.length > MAX_SNAPSHOT_INTERNAL_LINKS) {
    throw new RangeError('Das Produktionsinventar enthält zu viele vertrauenswürdige interne Links.');
  }
  return links;
}

export function bindContentRulesToSnapshot({
  baseSnapshot = {},
  allowedInternalLinks,
  requireAllowedInternalLinks = false,
  existingPostTrustedContext,
  requireExistingPostTrustedContext = false
} = {}) {
  const snapshot = {
    ...baseSnapshot,
    learningRuleSnapshot: baseSnapshot.learningRuleSnapshot || buildLearningRuleSnapshot([]),
    ruleManifest: Object.freeze({ ...CONTENT_AGENT_RULE_MANIFEST }),
    ruleManifestHash: CONTENT_AGENT_RULE_MANIFEST_HASH
  };
  if (requireAllowedInternalLinks || allowedInternalLinks !== undefined) {
    const links = canonicalInternalLinks(allowedInternalLinks);
    snapshot.allowedInternalLinks = Object.freeze(links);
    snapshot.allowedInternalLinksHash = canonicalSha256(links);
  }
  if (requireExistingPostTrustedContext || existingPostTrustedContext !== undefined) {
    const context = buildExistingPostTrustedContext(
      existingPostTrustedContext,
      snapshot.allowedInternalLinks
    );
    snapshot.existingPostTrustedContext = context;
    snapshot.existingPostTrustedContextHash = canonicalSha256(context);
  }
  if (Buffer.byteLength(canonicalJson(snapshot), 'utf8') > MAX_RUNTIME_SNAPSHOT_BYTES) {
    throw new RangeError('Der Runtime-Snapshot ist zu groß.');
  }
  return Object.freeze(snapshot);
}

export function validateContentRuleSnapshot(snapshot, {
  requireAllowedInternalLinks = false,
  requireExistingPostTrustedContext = false
} = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)
      || !snapshot.ruleManifest || typeof snapshot.ruleManifestHash !== 'string') {
    return { valid: false, code: 'CONTENT_RUNTIME_SNAPSHOT_RULES_MISSING' };
  }
  if (Buffer.byteLength(canonicalJson(snapshot), 'utf8') > MAX_RUNTIME_SNAPSHOT_BYTES) {
    return { valid: false, code: 'CONTENT_RUNTIME_SNAPSHOT_TOO_LARGE' };
  }
  if (canonicalJson(snapshot.ruleManifest) !== canonicalJson(CONTENT_AGENT_RULE_MANIFEST)
      || snapshot.ruleManifestHash !== CONTENT_AGENT_RULE_MANIFEST_HASH
      || canonicalSha256(snapshot.ruleManifest) !== snapshot.ruleManifestHash) {
    return { valid: false, code: 'CONTENT_RULE_MANIFEST_MISMATCH' };
  }
  const learningValidation = validateLearningRuleSnapshot(snapshot.learningRuleSnapshot);
  if (!learningValidation.valid) {
    return { valid: false, code: learningValidation.code };
  }
  if (requireAllowedInternalLinks || snapshot.allowedInternalLinks !== undefined) {
    if (!Array.isArray(snapshot.allowedInternalLinks)
        || snapshot.allowedInternalLinks.length > MAX_SNAPSHOT_INTERNAL_LINKS) {
      return { valid: false, code: 'CONTENT_RUNTIME_SNAPSHOT_LINKS_INVALID' };
    }
    let canonical;
    try {
      canonical = canonicalInternalLinks(snapshot.allowedInternalLinks);
    } catch {
      return { valid: false, code: 'CONTENT_RUNTIME_SNAPSHOT_LINKS_INVALID' };
    }
    if (canonicalJson(canonical) !== canonicalJson(snapshot.allowedInternalLinks)
        || snapshot.allowedInternalLinksHash !== canonicalSha256(canonical)) {
      return { valid: false, code: 'CONTENT_RUNTIME_SNAPSHOT_LINKS_INVALID' };
    }
  }
  if (requireExistingPostTrustedContext || snapshot.existingPostTrustedContext !== undefined) {
    const context = readExistingPostTrustedContextSnapshot(snapshot);
    if (!context) {
      return { valid: false, code: 'CONTENT_EXISTING_OPTIMIZATION_TRUSTED_CONTEXT_INVALID' };
    }
  }
  return { valid: true, code: null };
}
