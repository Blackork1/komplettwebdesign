import * as cheerio from 'cheerio';
import { SEO_RECOVERY_REDIRECTS, SEO_RECOVERY_TARGETS } from '../data/seoIntentRegistry.js';

const ERROR_CODES = new Set([
  'sitemap_status',
  'page_status',
  'canonical_missing',
  'canonical_mismatch',
  'h1_count',
  'redirect_chain',
  'redirect_target_status',
  'indexable_redirect_source',
  'noindex_active_target',
  'missing_required_link',
  'orphan_priority_page'
]);

const WARNING_CODES = new Set([
  'title_length',
  'description_length',
  'mixed_language',
  'low_inlink_count'
]);

const TITLE_MIN_LENGTH = 30;
const TITLE_MAX_LENGTH = 60;
const DESCRIPTION_MIN_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 165;
const LEGAL_PATH_PATTERN = /^\/(impressum|datenschutz|agb|widerruf|cookie|cookies|haftungsausschluss)(\/|$)/i;
const ENGLISH_PACKAGE_PATH_PATTERN = /^\/en\/pakete(?:\/|$)/;
const GERMAN_CONTENT_MARKERS = new Set([
  'unsere', 'pakete', 'sind', 'für', 'kleine', 'unternehmen', 'gedacht',
  'wir', 'erstellen', 'deine', 'klaren', 'preisen', 'persönlicher', 'beratung'
]);
const ENGLISH_CONTENT_MARKERS = new Set([
  'clear', 'packages', 'for', 'small', 'businesses', 'website', 'websites',
  'pricing', 'prices', 'consultation', 'your', 'our', 'with'
]);

function normalizeUrl(rawUrl, baseUrl) {
  const url = new URL(String(rawUrl), baseUrl);
  url.hash = '';
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function normalizePath(rawPath, baseUrl) {
  return new URL(String(rawPath), baseUrl).pathname.replace(/\/+$/, '') || '/';
}

function isSuccessfulStatus(status) {
  return status >= 200 && status < 300;
}

function isDirectPermanentRedirect(status) {
  return status === 301;
}

function isLegalPath(pathname) {
  return LEGAL_PATH_PATTERN.test(pathname);
}

function robotsIncludesNoindex(robots = '') {
  return String(robots)
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .includes('noindex');
}

function isEnglishPackagePath(pathname) {
  return ENGLISH_PACKAGE_PATH_PATTERN.test(pathname);
}

function markerCount(text, markers) {
  return (String(text).toLowerCase().match(/\p{L}+/gu) || [])
    .filter((word) => markers.has(word))
    .length;
}

function hasMixedLanguageContent(lang, bodyText) {
  const language = String(lang).split('-')[0];
  if (language !== 'de' && language !== 'en') return false;

  const germanMarkers = markerCount(bodyText, GERMAN_CONTENT_MARKERS);
  const englishMarkers = markerCount(bodyText, ENGLISH_CONTENT_MARKERS);
  if (language === 'en') return germanMarkers >= 4 && germanMarkers >= englishMarkers;
  return englishMarkers >= 4 && englishMarkers >= germanMarkers;
}

function extractPageDetails(html, url, siteOrigin) {
  const $ = cheerio.load(html || '');
  const text = (selector) => $(selector).first().text().replace(/\s+/g, ' ').trim();
  const attribute = (selector, name) => ($(selector).first().attr(name) || '').trim();
  const internalLinks = new Set();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href || href.startsWith('#')) return;
    try {
      const linkedUrl = normalizeUrl(href, url);
      if (new URL(linkedUrl).origin === siteOrigin) internalLinks.add(linkedUrl);
    } catch {
      // Ungültige Anker sind für diesen SEO-Recovery-Audit nicht auswertbar.
    }
  });

  const htmlLanguage = ($('html').attr('lang') || '').trim().toLowerCase();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  return {
    title: text('title'),
    description: attribute('meta[name="description"]', 'content'),
    robots: attribute('meta[name="robots"]', 'content'),
    canonical: attribute('link[rel="canonical"]', 'href'),
    lang: htmlLanguage,
    mixedLanguage: hasMixedLanguageContent(htmlLanguage, bodyText),
    h1Count: $('h1').length,
    internalLinks: [...internalLinks].sort()
  };
}

function pageRecord(url, response, html, siteOrigin) {
  const details = extractPageDetails(html, url, siteOrigin);
  return {
    url,
    path: new URL(url).pathname,
    status: Number(response?.status) || 0,
    ...details
  };
}

function violation(code, page, detail = {}) {
  const severity = ERROR_CODES.has(code) ? 'error' : 'warning';
  return {
    code,
    severity,
    url: page?.url || detail.url || '',
    path: page?.path || detail.path || '',
    ...detail
  };
}

function validatePage(page, violations, siteOrigin) {
  if (!isSuccessfulStatus(page.status)) {
    violations.push(violation('page_status', page, { status: page.status }));
    return;
  }

  if (!page.canonical) {
    violations.push(violation('canonical_missing', page));
  } else {
    try {
      if (normalizeUrl(page.canonical, page.url) !== normalizeUrl(page.url, siteOrigin)) {
        violations.push(violation('canonical_mismatch', page, { canonical: page.canonical }));
      }
    } catch {
      violations.push(violation('canonical_mismatch', page, { canonical: page.canonical }));
    }
  }

  if (page.h1Count !== 1) violations.push(violation('h1_count', page, { h1Count: page.h1Count }));

  if (!isLegalPath(page.path)) {
    if (page.title.length < TITLE_MIN_LENGTH || page.title.length > TITLE_MAX_LENGTH) {
      violations.push(violation('title_length', page, { length: page.title.length }));
    }
    if (page.description.length < DESCRIPTION_MIN_LENGTH || page.description.length > DESCRIPTION_MAX_LENGTH) {
      violations.push(violation('description_length', page, { length: page.description.length }));
    }
  }

  const language = page.lang.split('-')[0];
  if ((language && language !== 'de' && language !== 'en') || page.mixedLanguage) {
    violations.push(violation('mixed_language', page, { lang: page.lang }));
  }
}

function redirectEntries(targets, useRegistryRedirects) {
  if (useRegistryRedirects) {
    return Object.entries(SEO_RECOVERY_REDIRECTS).map(([path, redirectTo]) => ({ path, redirectTo }));
  }
  return targets
    .filter((target) => target?.state === 'redirect' && target.redirectTo)
    .map((target) => ({ path: target.path, redirectTo: target.redirectTo }));
}

function buildSummary(pages, redirects, violations) {
  const errors = violations.filter((item) => item.severity === 'error').length;
  const warnings = violations.filter((item) => item.severity === 'warning').length;
  return {
    pages: pages.length,
    redirects: redirects.length,
    errors,
    warnings,
    status: errors > 0 ? 'error' : (warnings > 0 ? 'warning' : 'ok')
  };
}

/**
 * Prüft die im Sitemap dokumentierten Seiten und die SEO-Recovery-Registry.
 * `fetchImpl` ist bewusst injizierbar, damit Tests keinen Netzwerkzugriff benötigen.
 */
export async function auditSeoRecoverySite({
  baseUrl,
  fetchImpl = globalThis.fetch,
  targets
} = {}) {
  if (!baseUrl) throw new Error('baseUrl ist erforderlich.');
  if (typeof fetchImpl !== 'function') throw new Error('fetchImpl muss eine Funktion sein.');

  const normalizedBaseUrl = normalizeUrl(baseUrl);
  const siteOrigin = new URL(normalizedBaseUrl).origin;
  const effectiveTargets = Array.isArray(targets) ? targets : SEO_RECOVERY_TARGETS;
  const useRegistryRedirects = !Array.isArray(targets);
  const violations = [];
  const pages = [];
  const redirects = [];
  const inlinks = [];
  const cachedLoads = new Map();

  async function load(url) {
    const normalizedUrl = normalizeUrl(url, normalizedBaseUrl);
    if (cachedLoads.has(normalizedUrl)) return cachedLoads.get(normalizedUrl);
    const promise = (async () => {
      try {
        const response = await fetchImpl(normalizedUrl, { redirect: 'manual' });
        const html = response && typeof response.text === 'function' ? await response.text() : '';
        return { response, html, page: pageRecord(normalizedUrl, response, html, siteOrigin) };
      } catch (error) {
        return {
          response: { status: 0, ok: false, headers: new Headers() },
          html: '',
          page: pageRecord(normalizedUrl, { status: 0 }, '', siteOrigin),
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })();
    cachedLoads.set(normalizedUrl, promise);
    return promise;
  }

  const sitemapUrl = normalizeUrl('/sitemap.xml', normalizedBaseUrl);
  let sitemapResponse;
  let sitemapXml = '';
  try {
    sitemapResponse = await fetchImpl(sitemapUrl, { redirect: 'manual' });
    sitemapXml = sitemapResponse && typeof sitemapResponse.text === 'function' ? await sitemapResponse.text() : '';
  } catch (error) {
    sitemapResponse = { status: 0, ok: false };
    sitemapXml = '';
  }

  const sitemapStatus = Number(sitemapResponse?.status) || 0;
  if (!isSuccessfulStatus(sitemapStatus)) {
    violations.push(violation('sitemap_status', null, { url: sitemapUrl, path: '/sitemap.xml', status: sitemapStatus }));
    return { summary: buildSummary(pages, redirects, violations), pages, redirects, inlinks, violations };
  }

  const sitemap = cheerio.load(sitemapXml, { xmlMode: true });
  const sitemapUrls = [...new Set(sitemap('loc').toArray().map((element) => {
    try {
      return normalizeUrl(sitemap(element).text().trim(), normalizedBaseUrl);
    } catch {
      return null;
    }
  }).filter(Boolean))];

  const sitemapUrlSet = new Set(sitemapUrls);
  const sitemapPages = new Map();
  for (const url of sitemapUrls) {
    const result = await load(url);
    const page = result.page;
    pages.push(page);
    sitemapPages.set(url, page);
    validatePage(page, violations, siteOrigin);
  }

  const incomingSources = new Map(sitemapUrls.map((url) => [url, new Set()]));
  for (const page of pages) {
    for (const linkedUrl of page.internalLinks) {
      if (linkedUrl !== page.url && sitemapUrlSet.has(linkedUrl)) incomingSources.get(linkedUrl).add(page.url);
    }
  }
  for (const url of sitemapUrls) {
    const sources = [...incomingSources.get(url)].sort();
    const page = sitemapPages.get(url);
    page.inlinkCount = sources.length;
    inlinks.push({ path: page.path, url, count: sources.length, sources });
  }

  for (const target of effectiveTargets.filter((item) => item?.state === 'active')) {
    const targetPath = normalizePath(target.path, normalizedBaseUrl);
    const targetPage = pages.find((page) => page.path === targetPath);
    const requiredLinks = Array.isArray(target.requiredLinks) ? target.requiredLinks : [];
    if (targetPage && isSuccessfulStatus(targetPage.status)) {
      if (robotsIncludesNoindex(targetPage.robots) && !isEnglishPackagePath(targetPath)) {
        violations.push(violation('noindex_active_target', targetPage));
      }
      const linkedPaths = new Set(targetPage.internalLinks.map((url) => normalizePath(url, normalizedBaseUrl)));
      for (const requiredLink of requiredLinks) {
        const requiredPath = normalizePath(requiredLink, normalizedBaseUrl);
        if (!linkedPaths.has(requiredPath)) {
          violations.push(violation('missing_required_link', targetPage, { requiredLink: requiredPath }));
        }
      }
    }

    if (target.priority === 'A') {
      const count = targetPage?.inlinkCount || 0;
      if (count === 0) {
        violations.push(violation('orphan_priority_page', targetPage, { path: targetPath, url: targetPage?.url || '' }));
      }
      if (count < 2) {
        violations.push(violation('low_inlink_count', targetPage, { path: targetPath, url: targetPage?.url || '', inlinkCount: count }));
      }
    }
  }

  for (const entry of redirectEntries(effectiveTargets, useRegistryRedirects)) {
    const sourceUrl = normalizeUrl(entry.path, normalizedBaseUrl);
    const targetUrl = normalizeUrl(entry.redirectTo, normalizedBaseUrl);
    const source = await load(sourceUrl);
    const sourcePage = source.page;
    const location = source.response?.headers?.get?.('location') || '';
    let resolvedLocation = '';
    if (location) {
      try {
        resolvedLocation = normalizeUrl(location, sourceUrl);
      } catch {
        resolvedLocation = '';
      }
    }

    redirects.push({
      path: sourcePage.path,
      source: sourceUrl,
      target: targetUrl,
      status: sourcePage.status,
      location: resolvedLocation || location
    });

    if (isDirectPermanentRedirect(sourcePage.status)) {
      if (resolvedLocation !== targetUrl) {
        violations.push(violation('redirect_chain', sourcePage, { expectedTarget: targetUrl, location: resolvedLocation || location }));
      }
    } else if (isSuccessfulStatus(sourcePage.status) && !robotsIncludesNoindex(sourcePage.robots)) {
      violations.push(violation('indexable_redirect_source', sourcePage, { expectedTarget: targetUrl }));
    } else {
      violations.push(violation('redirect_chain', sourcePage, { expectedTarget: targetUrl, location: resolvedLocation || location }));
    }

    const target = await load(targetUrl);
    if (!isSuccessfulStatus(target.page.status)) {
      violations.push(violation('redirect_target_status', sourcePage, {
        expectedTarget: targetUrl,
        targetStatus: target.page.status
      }));
    }
  }

  return { summary: buildSummary(pages, redirects, violations), pages, redirects, inlinks, violations };
}

export const __testables = {
  ERROR_CODES,
  WARNING_CODES,
  normalizeUrl,
  normalizePath,
  extractPageDetails,
  isLegalPath,
  robotsIncludesNoindex,
  isEnglishPackagePath,
  hasMixedLanguageContent
};
