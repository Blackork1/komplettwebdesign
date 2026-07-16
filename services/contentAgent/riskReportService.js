import * as cheerio from 'cheerio';
import slugify from 'slugify';

export const RISK_REPORT_VERSION = 'focused-risk-v2';

const GENERAL_SECTION = 'Gesamter Artikel';
const GENERAL_ANCHOR = 'pruefung-gesamter-artikel';
const MAX_HTML_LENGTH = 250_000;
const MAX_HEADINGS = 64;
const MAX_HEADING_LENGTH = 180;
const MAX_SECTION_LENGTH = 20_000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_INSTRUCTION_LENGTH = 500;
const MAX_RISK_KEY_LENGTH = 120;
const VERIFICATION_TYPES = new Set([
  'none',
  'source',
  'date',
  'price',
  'version',
  'legal',
  'privacy'
]);

const RISK_DEFINITIONS = Object.freeze([
  {
    key: 'currentClaims',
    code: 'risk_current_claims',
    issueCodes: ['current_claim', 'current_claims', 'current_statement', 'time_sensitive_claim'],
    issueVerificationTypes: ['date', 'source'],
    verificationType: 'date',
    sourceRequired: true,
    reason: 'Der Artikel enthält zeitbezogene oder aktuelle Aussagen.',
    instruction: 'Aktualität und zeitbezogene Aussagen im gesamten Artikel anhand aktueller Quellen prüfen.'
  },
  {
    key: 'legalClaims',
    code: 'risk_legal_claims',
    issueCodes: ['legal_claim', 'legal_claims', 'legal_statement', 'legal_compliance_claim'],
    issueVerificationTypes: ['legal'],
    verificationType: 'legal',
    sourceRequired: true,
    reason: 'Der Artikel enthält rechtliche Aussagen.',
    instruction: 'Rechtliche Aussagen im gesamten Artikel anhand einer belastbaren aktuellen Quelle fachlich prüfen.'
  },
  {
    key: 'privacyClaims',
    code: 'risk_privacy_claims',
    issueCodes: [
      'privacy_claim',
      'privacy_claims',
      'privacy_statement',
      'cookie_claim',
      'consent_claim',
      'data_protection_claim'
    ],
    issueVerificationTypes: ['privacy'],
    verificationType: 'privacy',
    sourceRequired: true,
    reason: 'Der Artikel enthält Datenschutz- oder Einwilligungsaussagen.',
    instruction: 'Datenschutz- und Einwilligungsaussagen im gesamten Artikel anhand einer aktuellen Quelle prüfen.'
  },
  {
    key: 'softwareVersionClaims',
    code: 'risk_software_version_claims',
    issueCodes: [
      'software_version_claim',
      'software_version_claims',
      'version_claim',
      'product_version_claim',
      'current_feature_claim'
    ],
    issueVerificationTypes: ['version'],
    verificationType: 'version',
    sourceRequired: true,
    reason: 'Der Artikel enthält Aussagen zu Softwareversionen oder aktuellen Funktionen.',
    instruction: 'Jede Softwareversion und aktuelle Funktion im gesamten Artikel beim jeweiligen Hersteller prüfen.'
  },
  {
    key: 'staticPrices',
    code: 'risk_static_prices',
    issueCodes: [
      'static_price',
      'static_prices',
      'static_price_forbidden',
      'price_claim',
      'pricing_claim',
      'review_static_price_risk'
    ],
    issueVerificationTypes: ['price'],
    verificationType: 'price',
    sourceRequired: false,
    reason: 'Der Artikel enthält einen deterministischen Preishinweis.',
    instruction: 'Preisangaben im gesamten Artikel entfernen oder gegen freigegebene zentrale Pricing-Tokens prüfen.'
  }
]);

const RISK_BY_KEY = new Map(RISK_DEFINITIONS.map((definition) => [definition.key, definition]));
const REVIEW_RISK_KEYS = Object.freeze(RISK_DEFINITIONS.map(({ key }) => key));

function normalizeText(value, maxLength = MAX_MESSAGE_LENGTH) {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength).replace(/\s+/g, ' ').trim();
}

function normalizeCode(value, fallback) {
  const code = normalizeText(value, 120);
  return /^[A-Za-z0-9_.:-]{1,120}$/.test(code) ? code : fallback;
}

function sectionSlug(heading, index) {
  const withoutMarkupDelimiters = heading.replace(/[<>]/g, ' ');
  return slugify(withoutMarkupDelimiters, { lower: true, strict: true, locale: 'de' }) || `abschnitt-${index + 1}`;
}

function extractArticleSections(html) {
  const boundedHtml = typeof html === 'string' ? html.slice(0, MAX_HTML_LENGTH) : '';
  const $ = cheerio.load(boundedHtml, null, false);
  const counts = new Map();
  const sections = [];

  $('h2, h3').each((index, element) => {
    if (sections.length >= MAX_HEADINGS) return false;
    const heading = normalizeText($(element).text(), MAX_HEADING_LENGTH);
    if (!heading) return;
    const base = sectionSlug(heading, index);
    const occurrence = (counts.get(base) || 0) + 1;
    counts.set(base, occurrence);
    const body = normalizeText(
      `${heading} ${$(element).nextUntil('h2, h3').text()}`,
      MAX_SECTION_LENGTH
    );
    sections.push({
      heading,
      body,
      anchor: `pruefung-${base}${occurrence > 1 ? `-${occurrence}` : ''}`
    });
  });

  return { sections };
}

function resolveSection({ requestedHeading, evidence, articleSections }) {
  const candidates = articleSections.sections.filter(({ heading }) => heading === requestedHeading);
  if (candidates.length === 0) {
    return { section: GENERAL_SECTION, anchor: GENERAL_ANCHOR, verified: false };
  }
  if (evidence) {
    const matches = candidates.filter(({ body }) => body.includes(evidence));
    if (matches.length !== 1) {
      return { section: GENERAL_SECTION, anchor: GENERAL_ANCHOR, verified: false };
    }
    return { section: matches[0].heading, anchor: matches[0].anchor, verified: true };
  }
  if (candidates.length !== 1) {
    return { section: GENERAL_SECTION, anchor: GENERAL_ANCHOR, verified: false };
  }
  return { section: candidates[0].heading, anchor: candidates[0].anchor, verified: false };
}

function normalizeIssue(rawIssue, index, origin, articleSections) {
  const issue = rawIssue && typeof rawIssue === 'object' && !Array.isArray(rawIssue)
    ? rawIssue
    : {};
  const fallbackCode = `${origin}_issue_${index + 1}`;
  const code = normalizeCode(issue.code, fallbackCode);
  const message = normalizeText(issue.message, MAX_MESSAGE_LENGTH);
  const instruction = normalizeText(issue.repairInstruction, MAX_INSTRUCTION_LENGTH)
    || message
    || 'Prüfstelle redaktionell bewerten und die erforderliche Korrektur festlegen.';
  const requestedHeading = normalizeText(issue.sectionHeading, MAX_HEADING_LENGTH);
  const candidateExcerpt = normalizeText(issue.evidenceExcerpt, 280);
  const location = resolveSection({
    requestedHeading,
    evidence: candidateExcerpt,
    articleSections
  });
  const explicitVerificationType = normalizeText(issue.verificationType);
  const verificationType = VERIFICATION_TYPES.has(explicitVerificationType)
    ? explicitVerificationType
    : 'none';
  const severity = ['info', 'warning', 'error'].includes(issue.severity)
    ? issue.severity
    : origin === 'validation' ? 'error' : 'warning';

  return {
    item: {
      code,
      severity,
      section: location.section,
      excerpt: location.verified ? candidateExcerpt : null,
      reason: message || instruction,
      instruction,
      verificationType,
      sourceRequired: issue.sourceRequired === true,
      blocking: origin === 'validation'
        || issue.autoPublishBlocking === true
        || issue.blocking === true,
      anchor: location.anchor
    },
    locationVerified: location.verified
  };
}

function humanizeRiskKey(key) {
  const humanized = String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return normalizeText(humanized, MAX_RISK_KEY_LENGTH) || 'unbekannt';
}

function unknownRiskDefinition(key) {
  const boundedKey = String(key).slice(0, MAX_RISK_KEY_LENGTH);
  const label = humanizeRiskKey(boundedKey);
  return {
    key,
    code: `risk_${slugify(boundedKey, { lower: true, strict: true }) || 'unknown'}`,
    issueCodes: [],
    issueVerificationTypes: [],
    verificationType: 'none',
    sourceRequired: false,
    reason: `Der Artikel meldet das zusätzliche Risiko „${label}“.`,
    instruction: `Das allgemeine Risiko „${label}“ im gesamten Artikel fachlich prüfen und dokumentieren.`
  };
}

function activeRiskDefinitions(...riskObjects) {
  const activeKeys = [...new Set(riskObjects.flatMap((risk) => (
    risk && typeof risk === 'object' && !Array.isArray(risk)
      ? Object.keys(risk).filter((key) => risk[key] === true)
      : []
  )))];
  const known = RISK_DEFINITIONS.filter(({ key }) => activeKeys.includes(key));
  const unknown = activeKeys
    .filter((key) => !RISK_BY_KEY.has(key))
    .sort((left, right) => left.localeCompare(right, 'de'))
    .map(unknownRiskDefinition);
  return [...known, ...unknown];
}

function hasCompleteReviewRisks(risks) {
  if (!risks || typeof risks !== 'object' || Array.isArray(risks)) return false;
  const keys = Object.keys(risks);
  return keys.length === REVIEW_RISK_KEYS.length
    && keys.every((key) => REVIEW_RISK_KEYS.includes(key))
    && REVIEW_RISK_KEYS.every((key) => typeof risks[key] === 'boolean');
}

export function buildFocusedRiskReport({ article = {}, review = {}, validation = {}, sources = [] } = {}) {
  const articleSections = extractArticleSections(article?.contentHtml);
  const reviewIssues = Array.isArray(review?.issues) ? review.issues : [];
  const validationIssues = Array.isArray(validation?.issues) ? validation.issues : [];
  const normalizedIssues = [
    ...reviewIssues.map((issue, index) => normalizeIssue(issue, index, 'review', articleSections)),
    ...validationIssues.map((issue, index) => normalizeIssue(issue, index, 'validation', articleSections))
  ];
  const items = normalizedIssues.map(({ item }) => item);
  const riskDefinitions = hasCompleteReviewRisks(review?.risks)
    ? activeRiskDefinitions(review.risks)
    : activeRiskDefinitions(article?.risk);

  for (const definition of riskDefinitions) {
    const locatedIssue = normalizedIssues.find(({ item, locationVerified }) => (
      locationVerified
      && definition.issueCodes.includes(item.code)
      && definition.issueVerificationTypes.includes(item.verificationType)
    ));
    if (locatedIssue) {
      locatedIssue.item.blocking = true;
      locatedIssue.item.sourceRequired ||= definition.sourceRequired;
      continue;
    }
    items.push({
      code: definition.code,
      severity: 'warning',
      section: GENERAL_SECTION,
      excerpt: null,
      reason: definition.reason,
      instruction: definition.instruction,
      verificationType: definition.verificationType,
      sourceRequired: definition.sourceRequired,
      blocking: true,
      anchor: GENERAL_ANCHOR
    });
  }

  return {
    blocked: items.some(({ blocking }) => blocking === true),
    items,
    riskFlags: riskDefinitions.map(({ key }) => key),
    sourceCount: Array.isArray(sources) ? sources.length : 0
  };
}
