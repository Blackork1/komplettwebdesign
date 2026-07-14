import * as cheerio from 'cheerio';
import { calculateCannibalizationRisk } from './cannibalizationService.js';
import { buildTrustedInternalPaths, normalizeInternalHref } from './trustedInternalLinkService.js';

export const EXISTING_CONTENT_AUDIT_TYPE = 'local_content_v2';
const MAX_AUDIT_POSTS = 500;
const MAX_CONTENT_LENGTH = 250_000;
const EXISTING_CONTENT_FINDING_POLICY = Object.freeze({
  unsupported_content_format: { severity: 'error', blocking: true },
  missing_meta_title: { severity: 'warning', blocking: false },
  missing_meta_description: { severity: 'warning', blocking: false },
  missing_image_alt: { severity: 'warning', blocking: false },
  missing_structured_faq: { severity: 'warning', blocking: false },
  stale_year: { severity: 'warning', blocking: true },
  static_price: { severity: 'error', blocking: true },
  missing_contact_cta: { severity: 'info', blocking: false },
  missing_internal_links: { severity: 'info', blocking: false },
  broken_internal_link: { severity: 'error', blocking: true },
  unknown_internal_link: { severity: 'error', blocking: true },
  cannibalization_risk: { severity: 'warning', blocking: false }
});

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeExistingContentAuditFinding(value = {}) {
  const code = typeof value?.code === 'string' ? value.code : '';
  const policy = EXISTING_CONTENT_FINDING_POLICY[code] || {
    severity: 'error',
    blocking: true
  };
  return { ...value, code, ...policy };
}

function finding(code, message, details = {}) {
  return normalizeExistingContentAuditFinding({ code, message, ...details });
}

export function evaluateExistingContentReaudit({
  originalFindings = [],
  currentFindings = []
} = {}) {
  const originalCodes = [...new Set((Array.isArray(originalFindings) ? originalFindings : [])
    .map((item) => typeof item?.code === 'string' ? item.code : '')
    .filter(Boolean))].slice(0, 100);
  const normalizedCurrent = (Array.isArray(currentFindings) ? currentFindings : [])
    .map(normalizeExistingContentAuditFinding)
    .filter(({ code }) => code);
  const currentCodes = new Set(normalizedCurrent.map(({ code }) => code));
  const originalCodeSet = new Set(originalCodes);
  const unresolvedOriginalCodes = originalCodes.filter((code) => currentCodes.has(code));
  const newBlockingCodes = [...new Set(normalizedCurrent
    .filter(({ code, blocking }) => blocking === true && !originalCodeSet.has(code))
    .map(({ code }) => code))].slice(0, 100);
  return {
    passed: unresolvedOriginalCodes.length === 0 && newBlockingCodes.length === 0,
    unresolvedOriginalCodes,
    newBlockingCodes
  };
}

function faqItems(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isSchemaType(value, expectedType) {
  const types = Array.isArray(value) ? value : [value];
  return types.some((type) => String(type || '').trim() === expectedType);
}

function faqItemsFromSchema(value) {
  if (Array.isArray(value)) return value.flatMap(faqItemsFromSchema);
  if (!value || typeof value !== 'object') return [];
  const nested = Array.isArray(value['@graph']) ? faqItemsFromSchema(value['@graph']) : [];
  if (!isSchemaType(value['@type'], 'FAQPage')) return nested;
  return [...nested, ...(Array.isArray(value.mainEntity) ? value.mainEntity : [])];
}

function inlineFaqItems($) {
  return $('script[type="application/ld+json"]').toArray().flatMap((node) => {
    try {
      return faqItemsFromSchema(JSON.parse($(node).text()));
    } catch {
      return [];
    }
  });
}

function faqQuestion(item) {
  if (!item || typeof item !== 'object') return '';
  return text(item.name || item.question).replace(/\s+/g, ' ');
}

function faqAnswer(item) {
  if (!item || typeof item !== 'object') return '';
  const acceptedAnswer = item.acceptedAnswer;
  return text(item.answer || (acceptedAnswer && typeof acceptedAnswer === 'object' ? acceptedAnswer.text : ''))
    .replace(/\s+/g, ' ');
}

function structuredFaqQuestions(post, $, { includeInline = false } = {}) {
  const questions = new Set();
  const inlineItems = includeInline ? inlineFaqItems($) : [];
  for (const item of [...faqItems(post.faq_json), ...inlineItems]) {
    const question = faqQuestion(item);
    if (question && faqAnswer(item)) questions.add(question.toLocaleLowerCase('de-DE'));
  }
  return questions;
}

function visibleFaqQuestions($) {
  const questions = new Set();
  $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    const headingText = $(heading).text().replace(/\s+/g, ' ').trim();
    if (!/^(?:häufige fragen|faq(?:s)?)(?:\b|\s|:)/iu.test(headingText)) return;
    const headingLevel = Number(String(heading.tagName || '').slice(1));
    let sibling = heading.nextSibling;
    while (sibling) {
      const siblingTag = String(sibling.tagName || '').toLocaleLowerCase('de-DE');
      if (/^h[1-6]$/.test(siblingTag) && Number(siblingTag.slice(1)) <= headingLevel) break;
      const scope = $(sibling);
      const candidates = /^h[1-6]$/.test(siblingTag)
        ? scope
        : scope.find('h1, h2, h3, h4, h5, h6, summary, .accordion-button');
      candidates.each((__, candidate) => {
        const candidateText = $(candidate).text().replace(/\s+/g, ' ').trim();
        if (candidateText && candidateText !== headingText) {
          questions.add(candidateText.toLocaleLowerCase('de-DE'));
        }
      });
      sibling = sibling.nextSibling;
    }
  });
  return questions;
}

function keywordOf(post) {
  return post?.primary_keyword || text(post?.title).toLocaleLowerCase('de-DE');
}

function titleOverlap(left, right) {
  const words = (value) => new Set((String(value || '').toLocaleLowerCase('de-DE').match(/[\p{L}\p{N}]+/gu) || [])
    .map((word) => word.replace(/(?:en|er|es|e|et|t)$/u, ''))
    .filter((word) => word.length > 2));
  const a = words(left);
  const b = words(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter((word) => b.has(word)).length / Math.min(a.size, b.size);
}

export function auditExistingPost({ post, inventory = [], currentYear = new Date().getFullYear() } = {}) {
  if (!post || !Number.isSafeInteger(Number(post.id))) {
    throw new TypeError('Für die Bestandsprüfung wird ein persistierter Beitrag benötigt.');
  }
  const rawContent = String(post.content || '').slice(0, MAX_CONTENT_LENGTH);
  const $ = cheerio.load(rawContent, null, false);
  const visibleText = `${post.title || ''} ${post.excerpt || ''} ${$.root().text()}`.replace(/\s+/g, ' ').trim();
  const findings = [];
  const contentFormat = text(post.content_format) || 'legacy_ejs';

  if (!['legacy_ejs', 'static_html'].includes(contentFormat)) {
    findings.push(finding('unsupported_content_format', 'Das Inhaltsformat kann nicht sicher überarbeitet werden.'));
  }
  if (!text(post.meta_title) && !text(post.title)) {
    findings.push(finding('missing_meta_title', 'Für die öffentliche Seite kann kein Meta Title gebildet werden.'));
  }
  if (!text(post.meta_description) && !text(post.description) && !text(post.excerpt) && !text($.root().text())) {
    findings.push(finding('missing_meta_description', 'Für die öffentliche Seite kann keine Meta Description gebildet werden.'));
  }
  const contentImagesWithoutAlt = contentFormat === 'legacy_ejs'
    ? $('img').toArray().filter((node) => $(node).attr('alt') === undefined)
    : [];
  const heroAltMissing = !text(post.image_alt) && !text(post.title);
  if (heroAltMissing || contentImagesWithoutAlt.length > 0) {
    findings.push(finding(
      'missing_image_alt',
      heroAltMissing
        ? 'Für das Hero-Bild kann kein Alt-Text gebildet werden.'
        : 'Mindestens ein Inhaltsbild besitzt kein Alt-Attribut.',
      { affectedContentImages: contentImagesWithoutAlt.length }
    ));
  }
  const visibleFaqs = visibleFaqQuestions($);
  const structuredFaqs = structuredFaqQuestions(post, $, { includeInline: contentFormat === 'legacy_ejs' });
  if (visibleFaqs.size > structuredFaqs.size) {
    findings.push(finding(
      'missing_structured_faq',
      'Die sichtbaren FAQ sind nicht vollständig als strukturierte FAQ-Daten hinterlegt.',
      { visibleFaqCount: visibleFaqs.size, structuredFaqCount: structuredFaqs.size }
    ));
  }

  const yearMatches = [...visibleText.matchAll(/\b(?:19|20)\d{2}\b/g)];
  const years = [...new Set(yearMatches.filter((match) => {
    const year = Number(match[0]);
    if (year >= Number(currentYear)) return false;
    const before = visibleText.slice(Math.max(0, match.index - 30), match.index).toLocaleLowerCase('de-DE');
    const after = visibleText.slice(match.index + 4, match.index + 35).toLocaleLowerCase('de-DE');
    return !(/(?:seit|gegründet|gegruendet|eröffnet|eroeffnet)\s*$/u.test(before)
      || /^\s*(?:gegründet|gegruendet|eröffnet|eroeffnet)\b/u.test(after)
      || /^\s*(?:bis|[-–])\s*(?:19|20)\d{2}\b/u.test(after)
      || /(?:19|20)\d{2}\s*(?:bis|[-–])\s*$/u.test(before));
  }).map((match) => Number(match[0])))]
    .sort((a, b) => a - b);
  if (years.length) findings.push(finding('stale_year', 'Der Artikel enthält möglicherweise veraltete Jahresangaben.', { years: years.slice(0, 10) }));
  if (/(?:\b\d[\d.\s]*(?:,\d{1,2})?\s*(?:€|EUR\b|Euro\b)|(?:€|EUR\b|Euro\b)\s*\d)/i.test(visibleText)) {
    findings.push(finding('static_price', 'Der Artikel enthält eine statische Preisangabe.'));
  }

  const hrefs = [...new Set($('a[href]').toArray().map((node) => text($(node).attr('href'))))].slice(0, 100);
  const inspectedLinks = hrefs.map(normalizeInternalHref);
  const trustedPaths = new Set(buildTrustedInternalPaths(inventory));
  if (!inspectedLinks.some((item) => item.kind === 'internal' && item.path === '/kontakt')) {
    findings.push(finding('missing_contact_cta', 'Ein klarer Kontakt-CTA fehlt.'));
  }
  if (!inspectedLinks.some((item) => item.kind === 'internal' && trustedPaths.has(item.path))) {
    findings.push(finding('missing_internal_links', 'Der Artikel enthält keine gültigen internen Links.'));
  }
  const brokenHrefs = inspectedLinks.filter((item) => item.kind === 'unsafe' || item.kind === 'invalid').map(({ href }) => href).slice(0, 20);
  if (brokenHrefs.length) findings.push(finding('broken_internal_link', 'Der Artikel enthält unsichere oder ungültige Linkziele.', { hrefs: brokenHrefs }));
  const unknownHrefs = inspectedLinks.filter((item) => item.kind === 'internal' && !trustedPaths.has(item.path)).map(({ href }) => href).slice(0, 20);
  if (unknownHrefs.length) findings.push(finding('unknown_internal_link', 'Der Artikel enthält nicht im Website-Inventar gefundene interne Ziele.', { hrefs: unknownHrefs }));

  const comparableInventory = (Array.isArray(inventory) ? inventory : [])
    .filter((entry) => Number(entry?.id) !== Number(post.id))
    .slice(0, MAX_AUDIT_POSTS);
  const risk = calculateCannibalizationRisk({
    ...post,
    primary_keyword: keywordOf(post)
  }, comparableInventory) || (comparableInventory.some((entry) => titleOverlap(post.title, entry.title) >= 0.66) ? 6 : 0);
  if (risk > 0) findings.push(finding('cannibalization_risk', 'Ein anderer Inhalt behandelt ein sehr ähnliches Thema.', { risk }));

  const score = Math.max(0, 100 - Math.min(100, findings.length * 8));
  return {
    auditType: EXISTING_CONTENT_AUDIT_TYPE,
    score,
    findings,
    recommendedActions: findings.map(({ code }) => ({ code, action: `Befund „${code}“ prüfen und gegebenenfalls in einer Revision korrigieren.` }))
  };
}

export async function runExistingContentAuditJob(input = {}, dependencies = {}) {
  const { auditRepository } = dependencies;
  if (typeof auditRepository?.listPublishedPosts !== 'function'
      || typeof auditRepository?.createAuditIdempotent !== 'function') {
    throw new TypeError('Das Audit-Repository ist unvollständig.');
  }
  const leaseGuard = typeof input.leaseGuard === 'function' ? input.leaseGuard : async () => {};
  await leaseGuard();
  const posts = (await auditRepository.listPublishedPosts({ limit: MAX_AUDIT_POSTS })).slice(0, MAX_AUDIT_POSTS);
  const trustedUrls = typeof auditRepository.listTrustedInternalUrls === 'function'
    ? (await auditRepository.listTrustedInternalUrls()).slice(0, 5_000)
    : [];
  const inventory = [...posts, ...trustedUrls];
  let audited = 0;
  for (const post of posts) {
    await leaseGuard();
    const audit = auditExistingPost({ post, inventory, currentYear: input.currentYear });
    await auditRepository.createAuditIdempotent({
      postId: Number(post.id),
      jobId: Number(input.claim?.id),
      runId: Number(input.run?.id),
      ...audit
    });
    audited += 1;
  }
  await leaseGuard();
  return { status: 'completed', audited };
}
