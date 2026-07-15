import * as cheerio from 'cheerio';
import { isLegacyStaticHtml } from './legacyContentPolicy.js';

const ACTIVE_CONTENT_PATTERN = /<\s*(?:script|style|iframe|object|embed|svg|math)\b|\s(?:on[a-z]+|style)\s*=|\b(?:href|src)\s*=\s*["']?\s*(?:javascript:|data\s*:\s*text\/html)|<%|%>/iu;
const SANITIZER_ALLOWED_TAGS = new Set([
  'section', 'div', 'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em',
  'blockquote', 'a', 'span', 'small', 'hr', 'table', 'thead', 'tbody', 'tr',
  'th', 'td'
]);
const SANITIZER_ALLOWED_ATTRIBUTES = new Set([
  'class', 'href', 'role', 'data-track', 'data-cta-name', 'data-cta-location',
  'data-faq-question', 'data-faq-answer'
]);
const ISSUE_IDENTITY_FIELDS = Object.freeze([
  'code',
  'href',
  'className',
  'field',
  'attribute',
  'tagName',
  'location'
]);

function articleContent(article) {
  return typeof article?.contentHtml === 'string' ? article.contentHtml : '';
}

function issueIdentity(issue) {
  const source = issue && typeof issue === 'object' ? issue : {};
  return JSON.stringify(ISSUE_IDENTITY_FIELDS.map((field) => source[field] ?? null));
}

function issueCounts(issues) {
  const counts = new Map();
  for (const issue of Array.isArray(issues) ? issues : []) {
    const key = issueIdentity(issue);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function sanitizerFeatureCounts(html) {
  const counts = new Map();
  const add = (key) => counts.set(key, (counts.get(key) || 0) + 1);
  const $ = cheerio.load(html, null, false);
  $('*').each((_, element) => {
    const tagName = String(element.tagName || element.name || '').toLowerCase();
    if (!SANITIZER_ALLOWED_TAGS.has(tagName)) add(`tag:${tagName}`);
    for (const [rawName, rawValue] of Object.entries(element.attribs || {})) {
      const name = String(rawName).toLowerCase();
      if (SANITIZER_ALLOWED_ATTRIBUTES.has(name) || name.startsWith('aria-')) continue;
      add(`attribute:${tagName}:${name}:${String(rawValue)}`);
    }
  });
  return counts;
}

function newSanitizerFeatures(beforeHtml, afterHtml) {
  const baseline = sanitizerFeatureCounts(beforeHtml);
  const candidate = sanitizerFeatureCounts(afterHtml);
  const additions = [];
  for (const [feature, count] of candidate) {
    const additionalCount = count - (baseline.get(feature) || 0);
    if (additionalCount <= 0) continue;
    additions.push({ feature, count: additionalCount });
  }
  return additions;
}

function newIssuesComparedWithBaseline(baselineIssues, candidateIssues) {
  const remaining = issueCounts(baselineIssues);
  return (Array.isArray(candidateIssues) ? candidateIssues : []).filter((issue) => {
    const key = issueIdentity(issue);
    const count = remaining.get(key) || 0;
    if (count <= 0) return true;
    remaining.set(key, count - 1);
    return false;
  });
}

export async function validateLegacyStaticOptimization({
  before,
  after,
  validateArticle,
  context = {}
} = {}) {
  if (!isLegacyStaticHtml({
    contentFormat: before?.contentFormat ?? before?.content_format,
    contentHtml: articleContent(before)
  })) {
    throw new TypeError('Die differenzielle Prüfung benötigt statischen Legacy-Inhalt.');
  }
  if (typeof validateArticle !== 'function') {
    throw new TypeError('Die differenzielle Prüfung benötigt einen Artikelvalidator.');
  }

  const candidateHtml = articleContent(after);
  if (ACTIVE_CONTENT_PATTERN.test(candidateHtml)) {
    return {
      passed: false,
      sanitizedHtml: candidateHtml,
      issues: [{
        code: 'legacy_active_content_forbidden',
        message: 'Der statische Altartikel enthält nach der Optimierung aktive oder ausführbare Syntax.'
      }]
    };
  }

  const sanitizerRegressions = newSanitizerFeatures(articleContent(before), candidateHtml);
  if (sanitizerRegressions.length > 0) {
    return {
      passed: false,
      sanitizedHtml: candidateHtml,
      issues: [{
        code: 'legacy_sanitizer_regression',
        message: 'Die Optimierung fügt HTML ein, das von der Artikelbereinigung entfernt würde.',
        features: sanitizerRegressions.slice(0, 20)
      }]
    };
  }

  const [baselineValidation, candidateValidation] = await Promise.all([
    validateArticle(before, context),
    validateArticle(after, context)
  ]);
  const issues = newIssuesComparedWithBaseline(
    baselineValidation?.issues,
    candidateValidation?.issues
  );
  return {
    passed: issues.length === 0,
    sanitizedHtml: candidateHtml,
    issues
  };
}
