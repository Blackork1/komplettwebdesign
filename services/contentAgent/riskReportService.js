import * as cheerio from 'cheerio';
import slugify from 'slugify';

const GENERAL_SECTION = 'Gesamter Artikel';
const GENERAL_ANCHOR = 'pruefung-gesamter-artikel';
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
    verificationType: 'date',
    sourceRequired: true,
    reason: 'Der Artikel enthält zeitbezogene oder aktuelle Aussagen.',
    instruction: 'Aktualität und zeitbezogene Aussagen im gesamten Artikel anhand aktueller Quellen prüfen.'
  },
  {
    key: 'legalClaims',
    code: 'risk_legal_claims',
    verificationType: 'legal',
    sourceRequired: true,
    reason: 'Der Artikel enthält rechtliche Aussagen.',
    instruction: 'Rechtliche Aussagen im gesamten Artikel anhand einer belastbaren aktuellen Quelle fachlich prüfen.'
  },
  {
    key: 'privacyClaims',
    code: 'risk_privacy_claims',
    verificationType: 'privacy',
    sourceRequired: true,
    reason: 'Der Artikel enthält Datenschutz- oder Einwilligungsaussagen.',
    instruction: 'Datenschutz- und Einwilligungsaussagen im gesamten Artikel anhand einer aktuellen Quelle prüfen.'
  },
  {
    key: 'softwareVersionClaims',
    code: 'risk_software_version_claims',
    verificationType: 'version',
    sourceRequired: true,
    reason: 'Der Artikel enthält Aussagen zu Softwareversionen oder aktuellen Funktionen.',
    instruction: 'Jede Softwareversion und aktuelle Funktion im gesamten Artikel beim jeweiligen Hersteller prüfen.'
  },
  {
    key: 'staticPrices',
    code: 'risk_static_prices',
    verificationType: 'price',
    sourceRequired: false,
    reason: 'Der Artikel enthält einen deterministischen Preishinweis.',
    instruction: 'Preisangaben im gesamten Artikel entfernen oder gegen freigegebene zentrale Pricing-Tokens prüfen.'
  }
]);

const RISK_BY_KEY = new Map(RISK_DEFINITIONS.map((definition) => [definition.key, definition]));

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeCode(value, fallback) {
  const code = normalizeText(value);
  return /^[A-Za-z0-9_.:-]{1,120}$/.test(code) ? code : fallback;
}

function sectionSlug(heading, index) {
  const withoutMarkupDelimiters = heading.replace(/[<>]/g, ' ');
  return slugify(withoutMarkupDelimiters, { lower: true, strict: true, locale: 'de' }) || `abschnitt-${index + 1}`;
}

function extractArticleSections(html) {
  const $ = cheerio.load(typeof html === 'string' ? html : '', null, false);
  const counts = new Map();
  const sections = [];

  $('h2, h3').each((index, element) => {
    const heading = normalizeText($(element).text());
    if (!heading) return;
    const base = sectionSlug(heading, index);
    const occurrence = (counts.get(base) || 0) + 1;
    counts.set(base, occurrence);
    const body = normalizeText(`${heading} ${$(element).nextUntil('h2, h3').text()}`);
    sections.push({
      heading,
      body,
      anchor: `pruefung-${base}${occurrence > 1 ? `-${occurrence}` : ''}`
    });
  });

  return {
    visibleText: normalizeText($.root().text()),
    sections
  };
}

function inferVerificationType(code) {
  const normalized = String(code || '').toLowerCase();
  if (/privacy|datenschutz|cookie|consent|einwilligung/.test(normalized)) return 'privacy';
  if (/legal|recht|gesetz/.test(normalized)) return 'legal';
  if (/price|preis|pricing|cost/.test(normalized)) return 'price';
  if (/version|software|product/.test(normalized)) return 'version';
  if (/date|current|aktuell|year|jahr/.test(normalized)) return 'date';
  if (/source|quelle|citation|beleg/.test(normalized)) return 'source';
  return 'none';
}

function resolveSection({ requestedHeading, evidence, articleSections }) {
  const candidates = articleSections.sections.filter(({ heading }) => heading === requestedHeading);
  if (candidates.length === 0) return { section: GENERAL_SECTION, anchor: GENERAL_ANCHOR };
  const matchingEvidence = evidence
    ? candidates.find(({ body }) => body.includes(evidence))
    : null;
  const match = matchingEvidence || candidates[0];
  return { section: match.heading, anchor: match.anchor };
}

function normalizeIssue(rawIssue, index, origin, articleSections) {
  const issue = rawIssue && typeof rawIssue === 'object' && !Array.isArray(rawIssue)
    ? rawIssue
    : {};
  const fallbackCode = `${origin}_issue_${index + 1}`;
  const code = normalizeCode(issue.code, fallbackCode);
  const message = normalizeText(issue.message);
  const instruction = normalizeText(issue.repairInstruction)
    || message
    || 'Prüfstelle redaktionell bewerten und die erforderliche Korrektur festlegen.';
  const requestedHeading = normalizeText(issue.sectionHeading);
  const candidateExcerpt = normalizeText(issue.evidenceExcerpt).slice(0, 280).trimEnd();
  const excerpt = candidateExcerpt && articleSections.visibleText.includes(candidateExcerpt)
    ? candidateExcerpt
    : null;
  const location = resolveSection({
    requestedHeading,
    evidence: excerpt,
    articleSections
  });
  const explicitVerificationType = normalizeText(issue.verificationType);
  const verificationType = VERIFICATION_TYPES.has(explicitVerificationType)
    ? explicitVerificationType
    : inferVerificationType(code);
  const severity = ['info', 'warning', 'error'].includes(issue.severity)
    ? issue.severity
    : origin === 'validation' ? 'error' : 'warning';

  return {
    code,
    severity,
    section: location.section,
    excerpt,
    reason: message || instruction,
    instruction,
    verificationType,
    sourceRequired: issue.sourceRequired === true,
    blocking: origin === 'validation'
      || issue.autoPublishBlocking === true
      || issue.blocking === true,
    anchor: location.anchor
  };
}

function humanizeRiskKey(key) {
  return normalizeText(String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2'))
    .toLowerCase() || 'unbekannt';
}

function unknownRiskDefinition(key) {
  const label = humanizeRiskKey(key);
  return {
    key,
    code: `risk_${slugify(String(key), { lower: true, strict: true }) || 'unknown'}`,
    verificationType: 'none',
    sourceRequired: false,
    reason: `Der Artikel meldet das zusätzliche Risiko „${label}“.`,
    instruction: `Das allgemeine Risiko „${label}“ im gesamten Artikel fachlich prüfen und dokumentieren.`
  };
}

function activeRiskDefinitions(risk) {
  if (!risk || typeof risk !== 'object' || Array.isArray(risk)) return [];
  const activeKeys = Object.keys(risk).filter((key) => risk[key] === true);
  const known = RISK_DEFINITIONS.filter(({ key }) => activeKeys.includes(key));
  const unknown = activeKeys
    .filter((key) => !RISK_BY_KEY.has(key))
    .sort((left, right) => left.localeCompare(right, 'de'))
    .map(unknownRiskDefinition);
  return [...known, ...unknown];
}

export function buildFocusedRiskReport({ article = {}, review = {}, validation = {}, sources = [] } = {}) {
  const articleSections = extractArticleSections(article?.contentHtml);
  const reviewIssues = Array.isArray(review?.issues) ? review.issues : [];
  const validationIssues = Array.isArray(validation?.issues) ? validation.issues : [];
  const items = [
    ...reviewIssues.map((issue, index) => normalizeIssue(issue, index, 'review', articleSections)),
    ...validationIssues.map((issue, index) => normalizeIssue(issue, index, 'validation', articleSections))
  ];
  const riskDefinitions = activeRiskDefinitions(article?.risk);

  for (const definition of riskDefinitions) {
    const locatedItem = definition.verificationType === 'none'
      ? null
      : items.find((item) => (
        item.verificationType === definition.verificationType
        && item.section !== GENERAL_SECTION
      ));
    if (locatedItem) {
      locatedItem.blocking = true;
      locatedItem.sourceRequired ||= definition.sourceRequired;
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
