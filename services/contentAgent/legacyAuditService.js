import * as cheerio from 'cheerio';
import { calculateCannibalizationRisk } from './cannibalizationService.js';
import { buildTrustedInternalPaths, normalizeInternalHref } from './trustedInternalLinkService.js';

export const EXISTING_CONTENT_AUDIT_TYPE = 'local_content_v1';
const MAX_AUDIT_POSTS = 500;
const MAX_CONTENT_LENGTH = 250_000;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function finding(code, message, details = {}) {
  return { code, message, ...details };
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
  if ($('h1').length > 0) findings.push(finding('duplicate_h1', 'Der Artikel enthält eine zusätzliche H1.'));
  if (!text(post.meta_title)) findings.push(finding('missing_meta_title', 'Der Meta Title fehlt.'));
  if (!text(post.meta_description)) findings.push(finding('missing_meta_description', 'Die Meta Description fehlt.'));
  if (!text(post.image_alt)) findings.push(finding('missing_image_alt', 'Der Bild-Alt-Text fehlt.'));
  if (faqItems(post.faq_json).length < 5) findings.push(finding('missing_faq', 'Es sind weniger als fünf strukturierte FAQ hinterlegt.'));

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
