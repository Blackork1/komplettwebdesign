import * as cheerio from 'cheerio';

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

const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/u;
const STATIC_PRICE_PATTERN = /(?:\b\d[\d.\s]*(?:,\d{1,2})?\s*(?:€|eur\b|euro\b)|(?:€|eur\b|euro\b)\s*\d)/iu;
const NUMERIC_COST_CLAIM_PATTERN = /\b(?:preis(?:e|en|es)?|kosten(?:punkt)?|kostet|tarif)\b.{0,40}\b\d[\d.\s]*(?:,\d{1,2})?\b/iu;
const SEARCH_CHANGE_SUBJECT = '(?:\\b(?:google|seo|geo|ki)\\b|\\bsuchmaschinenoptimierung\\b|\\bgenerative engine optimization\\b|\\bkünstliche intelligenz\\b)';
const CHANGE_MARKER = '(?:änder\\w*|update\\w*|aktuell\\w*|neu(?:e|en|er|es)?|algorithm\\w*|rankingfaktor\\w*|rollout\\w*)';
const SEARCH_CHANGE_PATTERN = new RegExp(`(?:${SEARCH_CHANGE_SUBJECT}.{0,80}${CHANGE_MARKER}|${CHANGE_MARKER}.{0,80}${SEARCH_CHANGE_SUBJECT})`, 'iu');
const AI_OR_TOOL_PATTERN = /\b(?:chatgpt|gpt[-\s]?[1-9]\w*|openai|claude|gemini|copilot|midjourney|dall-e|wordpress|yoast|rank\s*math|semrush|ahrefs|screaming\s*frog|node\.js|next\.js)\b/iu;
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
  if (YEAR_PATTERN.test(text)) reasons.add('stale_year');
  if (STATIC_PRICE_PATTERN.test(text) || NUMERIC_COST_CLAIM_PATTERN.test(text)) reasons.add('static_price');
  if (SEARCH_CHANGE_PATTERN.test(text)) reasons.add('google_or_seo_change');
  if (AI_OR_TOOL_PATTERN.test(text) || VERSION_CLAIM_PATTERN.test(text)) reasons.add('ai_or_tool_version');
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
