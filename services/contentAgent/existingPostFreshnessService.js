import * as cheerio from 'cheerio';

export const EXISTING_POST_FRESHNESS_POLICY_VERSION = 'existing-post-freshness-policy-v1';

const MAX_CONTENT_LENGTH = 250_000;
const MAX_METADATA_LENGTH = 1_000;

const AUDIT_CODE_REASONS = new Map([
  ['stale_year', 'stale_year'],
  ['current_claim', 'stale_year'],
  ['current_claims', 'stale_year'],
  ['current_statement', 'stale_year'],
  ['time_sensitive_claim', 'stale_year'],
  ['risk_current_claims', 'stale_year'],
  ['static_price', 'static_price'],
  ['static_prices', 'static_price'],
  ['static_price_forbidden', 'static_price'],
  ['price_claim', 'static_price'],
  ['pricing_claim', 'static_price'],
  ['review_static_price_risk', 'static_price'],
  ['risk_static_prices', 'static_price'],
  ['google_change', 'google_or_seo_change'],
  ['google_update', 'google_or_seo_change'],
  ['seo_change', 'google_or_seo_change'],
  ['seo_update', 'google_or_seo_change'],
  ['geo_change', 'google_or_seo_change'],
  ['geo_update', 'google_or_seo_change'],
  ['algorithm_change', 'google_or_seo_change'],
  ['search_algorithm_change', 'google_or_seo_change'],
  ['ai_change', 'google_or_seo_change'],
  ['ai_update', 'google_or_seo_change'],
  ['software_version_claim', 'ai_or_tool_version'],
  ['software_version_claims', 'ai_or_tool_version'],
  ['version_claim', 'ai_or_tool_version'],
  ['product_version_claim', 'ai_or_tool_version'],
  ['current_feature_claim', 'ai_or_tool_version'],
  ['tool_claim', 'ai_or_tool_version'],
  ['product_claim', 'ai_or_tool_version'],
  ['model_claim', 'ai_or_tool_version'],
  ['risk_software_version_claims', 'ai_or_tool_version'],
  ['legal_claim', 'legal_or_privacy'],
  ['legal_claims', 'legal_or_privacy'],
  ['legal_statement', 'legal_or_privacy'],
  ['legal_compliance_claim', 'legal_or_privacy'],
  ['privacy_claim', 'legal_or_privacy'],
  ['privacy_claims', 'legal_or_privacy'],
  ['privacy_statement', 'legal_or_privacy'],
  ['cookie_claim', 'legal_or_privacy'],
  ['consent_claim', 'legal_or_privacy'],
  ['data_protection_claim', 'legal_or_privacy'],
  ['risk_legal_claims', 'legal_or_privacy'],
  ['risk_privacy_claims', 'legal_or_privacy'],
  ['technical_standard', 'technical_standard'],
  ['technical_standard_claim', 'technical_standard'],
  ['standard_claim', 'technical_standard'],
  ['accessibility_standard', 'technical_standard']
]);

const STATIC_PRICE_PATTERN = /(?:\b\d[\d.\s]*(?:,\d{1,2})?\s*(?:€|eur\b|euro\b)|(?:€|eur\b|euro\b)\s*\d)/iu;
const EXPLICIT_AMOUNT_PATTERN = /\b(?:preis|kosten|kostenpunkt)\s*(?::|beträgt|betragen|belaufen sich auf|liegt bei)\s*(?:rund|etwa|circa|ca\.?|ab)?\s*\d[\d.\s]*(?:,\d{1,2})?\b/iu;
const SEARCH_CHANGE_SUBJECT = '(?:\\b(?:google|seo|geo|ki)\\b|\\bsuchmaschinenoptimierung\\b|\\bgenerative engine optimization\\b|\\bkünstliche intelligenz\\b)';
const INTRODUCTION_OBJECT = '(?:(?:ein(?:e|en|em|er|es)?|den|die|das)\\s+)?(?:neu(?:e|en|em|er|es)?\\s+)?(?:rankingfaktor\\w*|(?:such)?algorithm\\w*|regel\\w*|richtlinie\\w*|anforderung\\w*|funktion\\w*|feature\\w*)';
const SEARCH_CHANGE_MARKER = `(?:änder\\w*|update\\w*|aktualisier\\w*|rollout\\w*|ein(?:ge)?führ\\w*|führ\\w*\\s+${INTRODUCTION_OBJECT}\\s+ein\\b|neu(?:e|en|er|es)?\\s+(?:anforderung\\w*|richtlinie\\w*|funktion\\w*|feature\\w*|regel\\w*)|aktuell\\w*\\s+(?:anforderung\\w*|richtlinie\\w*|funktion\\w*|feature\\w*|stand\\w*))`;
const SEARCH_CHANGE_PATTERN = new RegExp(`(?:${SEARCH_CHANGE_SUBJECT}[^.!?]{0,60}${SEARCH_CHANGE_MARKER}|${SEARCH_CHANGE_MARKER}[^.!?]{0,60}${SEARCH_CHANGE_SUBJECT})`, 'iu');
const TOOL_PRODUCT = '(?:\\b(?:chatgpt|openai|claude|gemini|copilot|midjourney|wordpress|yoast|semrush|ahrefs)\\b|\\brank\\s*math\\b|\\bscreaming\\s*frog\\b|\\b(?:node|next)\\.js\\b|\\bdall-e\\b)';
const TOOL_CHANGE_MARKER = '(?:update\\w*|aktualisier\\w*|release\\w*|neu(?:e|en|er|es)?\\s+(?:funktion\\w*|feature\\w*)|aktuell\\w*\\s+(?:funktion\\w*|feature\\w*|funktionsumfang\\w*|version\\w*|stand\\w*))';
const TOOL_CHANGE_PATTERN = new RegExp(`(?:${TOOL_PRODUCT}[^.!?]{0,48}${TOOL_CHANGE_MARKER}|${TOOL_CHANGE_MARKER}[^.!?]{0,48}${TOOL_PRODUCT})`, 'iu');
const TOOL_VERSION_PATTERN = new RegExp(`(?:${TOOL_PRODUCT}(?:\\s+|-)(?:version\\s*)?v?\\d+(?:\\.\\d+){0,3}\\b|\\bversion\\s+v?\\d+(?:\\.\\d+){0,3}\\s+(?:von|für)\\s+${TOOL_PRODUCT}|\\bgpt[-\\s]?[1-9][\\w.-]*\\b)`, 'iu');
const VERSION_CLAIM_PATTERN = /\b(?:version|modell|software|tool|produkt)\s+[\p{L}\p{N}_.-]*\d+(?:\.\d+){0,3}\b/iu;
const LEGAL_OR_PRIVACY_PATTERN = /\b(?:dsgvo|gdpr|tdddg|ttdsg|datenschutz(?:recht)?|cookies?|consent|einwilligung|urheberrecht|barrierefreiheitsstärkungsgesetz|bfsg|impressumspflicht|rechtsgrundlage|rechtlich|gesetzlich|verordnung|zulässig|unzulässig|verboten)\b/iu;
const TECHNICAL_STANDARD_PATTERN = /(?:\b(?:wcag|bitv|din(?:\s+en)?|iso|iec|rfc|w3c|ecmascript)\b|\bschema\.org\b|\b(?:html|css|http)\s*\d(?:\.\d+)?\b|\btechnisch(?:e|en|er|es)?\s+(?:norm|standard)\b)/iu;

function boundedText(value, maxLength) {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function visiblePostText(post) {
  const content = boundedText(post?.contentHtml ?? post?.content, MAX_CONTENT_LENGTH);
  const $ = cheerio.load(content, null, false);
  $('script, style, template, noscript, svg').remove();
  $('[hidden], [aria-hidden], [style]').filter((_, element) => {
    const node = $(element);
    if (node.attr('hidden') !== undefined) return true;
    if (String(node.attr('aria-hidden') || '').trim().toLocaleLowerCase('de-DE') === 'true') return true;
    return /(?:^|;)\s*display\s*:\s*none(?:\s*!important)?\s*(?:;|$)/iu.test(node.attr('style') || '');
  }).remove();
  return [
    boundedText(post?.title, MAX_METADATA_LENGTH),
    boundedText(post?.excerpt, MAX_METADATA_LENGTH),
    boundedText(post?.shortDescription, MAX_METADATA_LENGTH),
    $.root().text()
  ].join(' ').replace(/\s+/gu, ' ').trim();
}

function addAuditReasons(reasons, audit) {
  const findings = Array.isArray(audit?.findings) ? audit.findings : [];
  for (const finding of findings) {
    const code = typeof finding?.code === 'string' ? finding.code.trim().toLocaleLowerCase('de-DE') : '';
    const reason = AUDIT_CODE_REASONS.get(code);
    if (reason) reasons.add(reason);
  }
}

function addTextReasons(reasons, text) {
  if (STATIC_PRICE_PATTERN.test(text) || EXPLICIT_AMOUNT_PATTERN.test(text)) reasons.add('static_price');
  if (SEARCH_CHANGE_PATTERN.test(text)) reasons.add('google_or_seo_change');
  if (TOOL_CHANGE_PATTERN.test(text) || TOOL_VERSION_PATTERN.test(text) || VERSION_CLAIM_PATTERN.test(text)) {
    reasons.add('ai_or_tool_version');
  }
  if (LEGAL_OR_PRIVACY_PATTERN.test(text)) reasons.add('legal_or_privacy');
  if (TECHNICAL_STANDARD_PATTERN.test(text)) reasons.add('technical_standard');
}

export function classifyExistingPostFreshness({ post, audit } = {}) {
  const reasons = new Set();
  addAuditReasons(reasons, audit);
  addTextReasons(reasons, visiblePostText(post));
  const sortedReasons = [...reasons].sort();
  return {
    requiresResearch: sortedReasons.length > 0,
    reasons: sortedReasons
  };
}
