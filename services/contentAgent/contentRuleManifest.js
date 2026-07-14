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
import { RISK_REPORT_VERSION } from './riskReportService.js';
import { REVIEW_ISSUE_OPTIMIZATION_POLICY_VERSION } from './reviewIssueOptimizationService.js';
import { TOPIC_SCORING_VERSION } from './topicScoringService.js';
import {
  INTERNAL_LINK_NORMALIZATION_VERSION,
  buildTrustedInternalPaths,
  normalizeTrustedInternalPaths
} from './trustedInternalLinkService.js';

export const MAX_SNAPSHOT_INTERNAL_LINKS = 5000;
export const MAX_RUNTIME_SNAPSHOT_BYTES = 250_000;
const MAX_INTERNAL_LINK_LENGTH = 2048;

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
  requireAllowedInternalLinks = false
} = {}) {
  const snapshot = {
    ...baseSnapshot,
    ruleManifest: Object.freeze({ ...CONTENT_AGENT_RULE_MANIFEST }),
    ruleManifestHash: CONTENT_AGENT_RULE_MANIFEST_HASH
  };
  if (requireAllowedInternalLinks || allowedInternalLinks !== undefined) {
    const links = canonicalInternalLinks(allowedInternalLinks);
    snapshot.allowedInternalLinks = Object.freeze(links);
    snapshot.allowedInternalLinksHash = canonicalSha256(links);
  }
  if (Buffer.byteLength(canonicalJson(snapshot), 'utf8') > MAX_RUNTIME_SNAPSHOT_BYTES) {
    throw new RangeError('Der Runtime-Snapshot ist zu groß.');
  }
  return Object.freeze(snapshot);
}

export function validateContentRuleSnapshot(snapshot, { requireAllowedInternalLinks = false } = {}) {
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
  return { valid: true, code: null };
}
