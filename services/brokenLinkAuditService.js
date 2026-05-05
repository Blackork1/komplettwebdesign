import { randomUUID } from 'crypto';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';
import { createAuditCache } from '../util/testerAuditCache.js';
import { safeAxiosRequest } from '../util/safeHttpClient.js';

// TTL must outlast the DOI confirmation window so the detailed result is still
// available when the user clicks the confirm link. The seoAuditService uses a
// similar 30 minute envelope. For broken-links reports (which are large list
// payloads), we keep the same TTL and add a strict LRU cap via createAuditCache.
const CACHE_TTL_MS = 30 * 60 * 1000;
const PUBLIC_TOP_PAGES = 3;

const USER_AGENT = 'KomplettWebdesign Broken Links Tester/1.0 (+https://komplettwebdesign.de)';
const DEFAULT_MAX_SUBPAGES = 5;
const MIN_MAX_SUBPAGES = 1;
const MAX_MAX_SUBPAGES = 20;
const DEFAULT_SCAN_MODE = 'maximal';
const DEFAULT_REQUEST_TIMEOUT_CAP_MS = 9_000;
const MAX_RESPONSE_BYTES = 1_500_000;

const SCAN_MODE_PROFILES = {
  schnell: {
    timeoutMs: 20_000,
    maxLinks: 180,
    requestTimeoutCapMs: 4_500,
    validationConcurrency: 6
  },
  balanced: {
    timeoutMs: 35_000,
    maxLinks: 500,
    requestTimeoutCapMs: 7_000,
    validationConcurrency: 8
  },
  maximal: {
    timeoutMs: 60_000,
    maxLinks: 1_200,
    requestTimeoutCapMs: 10_000,
    validationConcurrency: 10
  }
};

const HEAD_FALLBACK_STATUSES = new Set([401, 403, 405, 429, 500, 501, 502, 503, 504]);
const WARNING_STATUSES = new Set([401, 403, 429]);
const BROKEN_STATUSES = new Set([404, 410, 451]);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  'metadata.google.internal'
]);

const SKIP_CRAWL_EXTENSIONS = /\.(pdf|zip|rar|7z|tar|gz|mp4|mp3|webm|avi|mov|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2?|ttf|eot|xml|json)(\?|#|$)/i;

const I18N = {
  de: {
    errors: {
      emptyUrl: 'Bitte gib eine Website-Adresse ein.',
      invalidUrl: 'Die eingegebene URL ist ungültig. Bitte prüfe die Domain.',
      invalidProtocol: 'Bitte nutze eine URL mit http oder https.',
      privateTarget: 'Diese Zieladresse kann aus Sicherheitsgründen nicht geprüft werden.',
      unreachable: 'Die Website konnte nicht geladen werden. Bitte prüfe Domain, SSL oder Erreichbarkeit.',
      timeout: 'Der Broken-Link-Scan hat das Zeitlimit erreicht. Bitte versuche es erneut.'
    },
    messages: {
      partialTimeout: 'Der Scan wurde wegen Zeitlimit als Teil-Ergebnis abgeschlossen.',
      partialPageLimit: 'Der Scan wurde durch das Seitenlimit begrenzt.',
      partialLinkLimit: 'Der Scan wurde durch das Link-Limit des Modus begrenzt.'
    }
  },
  en: {
    errors: {
      emptyUrl: 'Please enter a website URL.',
      invalidUrl: 'The provided URL is invalid. Please check the domain.',
      invalidProtocol: 'Please use an http or https URL.',
      privateTarget: 'This target address cannot be analyzed for security reasons.',
      unreachable: 'The website could not be loaded. Please check domain, SSL, or availability.',
      timeout: 'The broken-link scan reached its time limit. Please try again.'
    },
    messages: {
      partialTimeout: 'The scan reached the time limit and returned a partial result.',
      partialPageLimit: 'The scan was limited by the page cap.',
      partialLinkLimit: 'The scan was limited by the scan mode link cap.'
    }
  }
};

class Deadline {
  constructor(totalMs) {
    this.endsAt = Date.now() + Math.max(8_000, Number(totalMs) || 30_000);
  }

  remainingMs() {
    return this.endsAt - Date.now();
  }

  hasTime(bufferMs = 0) {
    return this.remainingMs() > bufferMs;
  }

  assertTime(bufferMs = 0, message = 'timeout') {
    if (!this.hasTime(bufferMs)) {
      const err = new Error(message);
      err.code = 'AUDIT_TIMEOUT';
      throw err;
    }
  }

  requestTimeoutMs(capMs = DEFAULT_REQUEST_TIMEOUT_CAP_MS) {
    const remaining = this.remainingMs() - 350;
    if (remaining <= 0) return 1_200;
    return Math.max(1_200, Math.min(capMs, remaining));
  }
}

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function copyFor(locale) {
  return I18N[localeFrom(locale)];
}

const brokenLinkAuditCache = createAuditCache({ ttlMs: CACHE_TTL_MS, label: 'broken-links' });

function setCachedBrokenLinkAudit(auditId, publicResult, detailedResult) {
  if (!auditId) return;
  brokenLinkAuditCache.set(auditId, { publicResult, detailedResult });
}

/**
 * Detailed result accessor used by the lead-gate DOI flow. Public `/api/broken-link-audit`
 * responses never include the full broken-link list — only a count + top-pages summary —
 * so the full list must be pulled from this cache at confirm time.
 */
export function getCachedBrokenLinkAuditResult(auditId) {
  const cached = brokenLinkAuditCache.get(auditId);
  return cached?.detailedResult || null;
}

/**
 * Aggregates broken/warning links by source page and returns the top N pages
 * by affected-link count. We also return the plain count per page and per class
 * so the view can render "Top 3 affected pages" without exposing target URLs.
 */
function summarizeAffectedPages(brokenLinks = [], warnings = [], limit = PUBLIC_TOP_PAGES) {
  const counts = new Map();
  for (const entry of brokenLinks) {
    const key = entry?.sourceUrl || '';
    if (!key) continue;
    const bucket = counts.get(key) || { sourceUrl: key, brokenCount: 0, warningCount: 0 };
    bucket.brokenCount += 1;
    counts.set(key, bucket);
  }
  for (const entry of warnings) {
    const key = entry?.sourceUrl || '';
    if (!key) continue;
    const bucket = counts.get(key) || { sourceUrl: key, brokenCount: 0, warningCount: 0 };
    bucket.warningCount += 1;
    counts.set(key, bucket);
  }
  return Array.from(counts.values())
    .sort((a, b) => {
      const byBroken = b.brokenCount - a.brokenCount;
      if (byBroken !== 0) return byBroken;
      return b.warningCount - a.warningCount;
    })
    .slice(0, Math.max(0, limit));
}

/**
 * Public result: counts + top affected source pages only. The full broken-links
 * and warnings arrays are stripped so the unguarded `/api/broken-link-audit`
 * JSON response cannot be abused to scrape the detailed report.
 */
export function toPublicBrokenLinkResult(result = {}) {
  if (!result || typeof result !== 'object') return result;
  const brokenLinks = Array.isArray(result.brokenLinks) ? result.brokenLinks : [];
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const topAffectedPages = summarizeAffectedPages(brokenLinks, warnings, PUBLIC_TOP_PAGES);
  return {
    auditId: result.auditId,
    locale: result.locale,
    inputUrl: result.inputUrl,
    normalizedUrl: result.normalizedUrl,
    finalUrl: result.finalUrl,
    fetchedAt: result.fetchedAt,
    scanMode: result.scanMode,
    crawlStats: result.crawlStats,
    linkStats: result.linkStats,
    limitations: result.limitations,
    config: result.config,
    topAffectedPages,
    // Explicit flag so the frontend can distinguish "gated" vs "full" payloads
    // without having to probe for the absence of fields.
    gated: true
  };
}

function clampMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function clampScanMode(rawValue) {
  const mode = String(rawValue || '').trim().toLowerCase();
  if (mode === 'schnell' || mode === 'balanced' || mode === 'maximal') {
    return mode;
  }
  return DEFAULT_SCAN_MODE;
}

function modeProfileFor(rawMode) {
  const mode = clampScanMode(rawMode);
  return {
    mode,
    profile: SCAN_MODE_PROFILES[mode]
  };
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value = '') {
  return decodeHtml(String(value || '').replace(/<[^>]*>/g, ' '));
}

function firstMatch(html, regex, group = 1) {
  const match = regex.exec(html);
  return match ? decodeHtml(match[group] || '') : '';
}

function normalizeHost(hostname = '') {
  return String(hostname || '').trim().toLowerCase().replace(/^www\./, '');
}

function isValidProtocol(url) {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function ensureUrl(rawUrl, locale = 'de') {
  const copy = copyFor(locale);
  const cleaned = String(rawUrl || '').trim();
  if (!cleaned) {
    const error = new Error(copy.errors.emptyUrl);
    error.status = 400;
    throw error;
  }

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    const error = new Error(copy.errors.invalidUrl);
    error.status = 400;
    throw error;
  }

  if (!isValidProtocol(parsed)) {
    const error = new Error(copy.errors.invalidProtocol);
    error.status = 400;
    throw error;
  }

  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    const error = new Error(copy.errors.invalidUrl);
    error.status = 400;
    throw error;
  }

  parsed.hash = '';
  return parsed.toString();
}

function isPublicIpAddress(ipString) {
  try {
    const parsed = ipaddr.parse(ipString);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

function isBlockedHostname(hostname) {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return true;
  return false;
}

async function assertSafeTarget(url, locale = 'de') {
  const copy = copyFor(locale);

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    const error = new Error(copy.errors.invalidUrl);
    error.status = 400;
    throw error;
  }

  if (!isValidProtocol(parsed)) {
    const error = new Error(copy.errors.invalidProtocol);
    error.status = 400;
    throw error;
  }

  const hostname = parsed.hostname;
  if (isBlockedHostname(hostname)) {
    const error = new Error(copy.errors.privateTarget);
    error.status = 400;
    throw error;
  }

  if (ipaddr.isValid(hostname) && !isPublicIpAddress(hostname)) {
    const error = new Error(copy.errors.privateTarget);
    error.status = 400;
    throw error;
  }

  try {
    const lookups = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!lookups.length) {
      const error = new Error(copy.errors.unreachable);
      error.status = 502;
      throw error;
    }

    const hasPrivate = lookups.some((entry) => !isPublicIpAddress(entry.address));
    if (hasPrivate) {
      const error = new Error(copy.errors.privateTarget);
      error.status = 400;
      throw error;
    }
  } catch (error) {
    if (error.status) throw error;
    const wrapped = new Error(copy.errors.unreachable);
    wrapped.status = 502;
    throw wrapped;
  }
}

function normalizeLink(rawHref, baseUrl) {
  const href = decodeHtml(rawHref || '').trim();
  if (!href || href.startsWith('#')) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) return null;

  let parsed;
  try {
    parsed = new URL(href, baseUrl);
  } catch {
    return null;
  }

  if (!isValidProtocol(parsed)) return null;

  parsed.hash = '';
  if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
    parsed.port = '';
  }

  return parsed.toString();
}

function extractLinksFromHtml(html = '', pageUrl = '') {
  const links = [];
  const seen = new Set();
  const matches = [...String(html || '').matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>/gi)];

  for (const match of matches) {
    const normalized = normalizeLink(match[1], pageUrl);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(normalized);
  }

  return links;
}

function isHtmlResponse(contentType = '') {
  return /text\/html|application\/xhtml\+xml/i.test(contentType || '');
}

function isLikelyHtmlTarget(url) {
  return !SKIP_CRAWL_EXTENSIONS.test(url || '');
}

function parseNetworkErrorReason(error) {
  if (!error) return 'request_failed';
  if (error.code === 'AUDIT_TIMEOUT') return 'timeout';

  const code = String(error.code || '').toUpperCase();
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return 'timeout';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'EHOSTUNREACH') return 'dns_unreachable';
  if (code === 'ECONNREFUSED') return 'connection_refused';
  if (code === 'EPROTO' || code === 'ERR_TLS_CERT_ALTNAME_INVALID' || code === 'CERT_HAS_EXPIRED') return 'ssl_error';
  return 'request_failed';
}

function classifyLinkResult({ status = null, error = null } = {}) {
  if (error) return 'broken';
  if (!Number.isFinite(status)) return 'broken';
  if (WARNING_STATUSES.has(status)) return 'warning';
  if (BROKEN_STATUSES.has(status) || status >= 500) return 'broken';
  return 'ok';
}

async function requestUrl({ method, url, locale, deadline, requestTimeoutCapMs }) {
  let currentUrl = url;

  for (let redirects = 0; redirects <= 5; redirects += 1) {
    deadline.assertTime(350, 'timeout');
    await assertSafeTarget(currentUrl, locale);

    const response = await safeAxiosRequest(currentUrl, {
      method,
      timeout: deadline.requestTimeoutMs(requestTimeoutCapMs),
      validateStatus: (status) => status >= 200 && status < 600,
      responseType: method === 'GET' ? 'stream' : 'text',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        ...(method === 'GET' ? { Range: 'bytes=0-1024' } : {})
      }
    });

    if (response.status >= 300 && response.status < 400 && response.headers?.location) {
      currentUrl = new URL(response.headers.location, currentUrl).toString();
      continue;
    }

    if (method === 'GET' && response.data && typeof response.data.destroy === 'function') {
      response.data.destroy();
    }

    return {
      status: response.status,
      finalUrl: currentUrl
    };
  }

  const err = new Error(locale === 'en' ? 'Too many redirects.' : 'Zu viele Weiterleitungen.');
  err.code = 'TOO_MANY_REDIRECTS';
  throw err;
}

async function fetchHtmlPage(url, locale, deadline, requestTimeoutCapMs) {
  deadline.assertTime(600, 'timeout');

  let currentUrl = url;
  const startedAt = Date.now();

  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertSafeTarget(currentUrl, locale);

    const response = await safeAxiosRequest(currentUrl, {
      method: 'GET',
      timeout: deadline.requestTimeoutMs(requestTimeoutCapMs),
      responseType: 'arraybuffer',
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: MAX_RESPONSE_BYTES,
      decompress: true,
      validateStatus: (status) => status >= 200 && status < 500,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8'
      },
      transformResponse: []
    });

    if (response.status >= 300 && response.status < 400 && response.headers?.location) {
      currentUrl = new URL(response.headers.location, currentUrl).toString();
      continue;
    }

    const contentType = response.headers?.['content-type'] || '';
    const finalUrl = response.finalUrl || response.config?.url || currentUrl;
    const buffer = Buffer.isBuffer(response.data)
      ? response.data
      : Buffer.from(response.data || '', 'utf8');

    const html = isHtmlResponse(contentType)
      ? buffer.toString('utf8').slice(0, MAX_RESPONSE_BYTES)
      : '';

    const title = html ? firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) : '';

    return {
      requestedUrl: url,
      finalUrl,
      status: response.status,
      headers: response.headers || {},
      contentType,
      html,
      title,
      loadTimeMs: Date.now() - startedAt
    };
  }

  const err = new Error(locale === 'en' ? 'Too many redirects.' : 'Zu viele Weiterleitungen.');
  err.status = 502;
  throw err;
}

async function crawlWebsite({ startUrl, locale, deadline, maxCrawlPages, profile }) {
  const pages = [];
  const failures = [];
  const queue = [];
  const queued = new Set();
  const visited = new Set();
  const discoveredTargets = new Map();

  let pageCapHit = false;
  let linkCapHit = false;

  const firstPage = await fetchHtmlPage(startUrl, locale, deadline, profile.requestTimeoutCapMs);
  if (!firstPage || firstPage.status >= 400 || !firstPage.html) {
    const err = new Error(copyFor(locale).errors.unreachable);
    err.status = 502;
    throw err;
  }

  const firstNormalized = normalizeLink(firstPage.finalUrl, firstPage.finalUrl);
  const originHost = normalizeHost(new URL(firstPage.finalUrl).hostname);

  const pushPage = (page, source = 'crawl') => {
    pages.push({
      url: normalizeLink(page.finalUrl, page.finalUrl) || page.finalUrl,
      status: page.status,
      loadTimeMs: page.loadTimeMs,
      title: page.title || '',
      source
    });
  };

  const collectTargets = (sourceUrl, html) => {
    const links = extractLinksFromHtml(html, sourceUrl);
    for (const link of links) {
      if (!discoveredTargets.has(link)) {
        if (discoveredTargets.size >= profile.maxLinks) {
          linkCapHit = true;
          continue;
        }

        const targetType = normalizeHost(new URL(link).hostname) === originHost ? 'internal' : 'external';
        discoveredTargets.set(link, {
          sourceUrl,
          targetUrl: link,
          targetType
        });
      }

      const isInternal = normalizeHost(new URL(link).hostname) === originHost;
      if (!isInternal || !isLikelyHtmlTarget(link)) continue;

      if (visited.has(link) || queued.has(link)) continue;
      if (pages.length + queue.length >= maxCrawlPages) {
        pageCapHit = true;
        continue;
      }

      queued.add(link);
      queue.push(link);
    }
  };

  if (firstNormalized) visited.add(firstNormalized);
  pushPage(firstPage);
  collectTargets(firstPage.finalUrl, firstPage.html);

  while (pages.length < maxCrawlPages && queue.length && deadline.hasTime(1_000)) {
    const nextUrl = queue.shift();
    if (!nextUrl || visited.has(nextUrl)) continue;

    try {
      const nextPage = await fetchHtmlPage(nextUrl, locale, deadline, profile.requestTimeoutCapMs);
      const normalizedFinal = normalizeLink(nextPage.finalUrl, nextPage.finalUrl) || nextPage.finalUrl;
      visited.add(nextUrl);
      visited.add(normalizedFinal);

      if (nextPage.status >= 400 || !nextPage.html) {
        failures.push({
          url: normalizedFinal,
          message: `HTTP ${nextPage.status}`
        });
        continue;
      }

      pushPage(nextPage);
      collectTargets(nextPage.finalUrl, nextPage.html);
    } catch (error) {
      failures.push({
        url: nextUrl,
        message: parseNetworkErrorReason(error)
      });
    }
  }

  if (queue.length > 0 && pages.length >= maxCrawlPages) {
    pageCapHit = true;
  }

  return {
    pages,
    failures,
    finalUrl: firstPage.finalUrl,
    discoveredTargets: [...discoveredTargets.values()],
    pageCapHit,
    linkCapHit,
    timedOut: !deadline.hasTime(350),
    plannedPages: maxCrawlPages,
    visitedPages: pages.length
  };
}

async function validateTarget(target, locale, deadline, profile) {
  let headResult;
  let effectiveResult;

  try {
    headResult = await requestUrl({
      method: 'HEAD',
      url: target.targetUrl,
      locale,
      deadline,
      requestTimeoutCapMs: profile.requestTimeoutCapMs
    });

    effectiveResult = {
      status: headResult.status,
      finalUrl: headResult.finalUrl,
      error: null,
      method: 'HEAD'
    };

    if (HEAD_FALLBACK_STATUSES.has(headResult.status)) {
      try {
        const getResult = await requestUrl({
          method: 'GET',
          url: target.targetUrl,
          locale,
          deadline,
          requestTimeoutCapMs: profile.requestTimeoutCapMs
        });

        effectiveResult = {
          status: getResult.status,
          finalUrl: getResult.finalUrl,
          error: null,
          method: 'GET'
        };
      } catch (getError) {
        effectiveResult = {
          status: Number.isFinite(headResult.status) ? headResult.status : null,
          finalUrl: headResult.finalUrl || target.targetUrl,
          error: parseNetworkErrorReason(getError),
          method: 'HEAD'
        };
      }
    }
  } catch (error) {
    effectiveResult = {
      status: null,
      finalUrl: target.targetUrl,
      error: parseNetworkErrorReason(error),
      method: 'HEAD'
    };
  }

  const classification = classifyLinkResult(effectiveResult);

  return {
    sourceUrl: target.sourceUrl,
    targetUrl: target.targetUrl,
    targetType: target.targetType,
    status: effectiveResult.status,
    error: effectiveResult.error,
    method: effectiveResult.method,
    classification
  };
}

async function validateTargets({ targets, locale, deadline, profile }) {
  if (!targets.length) return [];

  const results = new Array(targets.length);
  let cursor = 0;

  const workerCount = Math.max(1, Math.min(profile.validationConcurrency || 8, targets.length));

  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < targets.length && deadline.hasTime(300)) {
      const index = cursor;
      cursor += 1;
      const target = targets[index];
      results[index] = await validateTarget(target, locale, deadline, profile);
    }
  });

  await Promise.all(workers);

  return results.filter(Boolean);
}

function buildLimitations({ locale, timedOut, pageCapHit, linkCapHit }) {
  const copy = copyFor(locale);
  const limitations = [];
  if (timedOut) limitations.push(copy.messages.partialTimeout);
  if (pageCapHit) limitations.push(copy.messages.partialPageLimit);
  if (linkCapHit) limitations.push(copy.messages.partialLinkLimit);
  return limitations;
}

export async function auditBrokenLinks({ url, locale = 'de', maxSubpages = DEFAULT_MAX_SUBPAGES, scanMode = DEFAULT_SCAN_MODE } = {}) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);

  const normalizedUrl = ensureUrl(url, lng);
  const clampedMaxSubpages = clampMaxSubpages(maxSubpages);
  const { mode: effectiveScanMode, profile } = modeProfileFor(scanMode);

  const deadline = new Deadline(profile.timeoutMs);
  const maxCrawlPages = clampedMaxSubpages + 1;

  let crawl;
  try {
    crawl = await crawlWebsite({
      startUrl: normalizedUrl,
      locale: lng,
      deadline,
      maxCrawlPages,
      profile
    });
  } catch (error) {
    const status = error.status || 502;
    const message = error.code === 'AUDIT_TIMEOUT'
      ? copy.errors.timeout
      : (error.message || copy.errors.unreachable);

    const wrapped = new Error(message);
    wrapped.status = status;
    throw wrapped;
  }

  const targets = crawl.discoveredTargets || [];
  const checkedTargets = await validateTargets({
    targets,
    locale: lng,
    deadline,
    profile
  });

  const brokenLinks = checkedTargets
    .filter((item) => item.classification === 'broken')
    .map((item) => ({
      sourceUrl: item.sourceUrl,
      targetUrl: item.targetUrl,
      targetType: item.targetType,
      status: Number.isFinite(item.status) ? item.status : null,
      error: item.error || null
    }));

  const warnings = checkedTargets
    .filter((item) => item.classification === 'warning')
    .map((item) => ({
      sourceUrl: item.sourceUrl,
      targetUrl: item.targetUrl,
      targetType: item.targetType,
      status: Number.isFinite(item.status) ? item.status : null,
      error: item.error || null
    }));

  const okCount = checkedTargets.filter((item) => item.classification === 'ok').length;

  const partial = crawl.timedOut || crawl.pageCapHit || crawl.linkCapHit || checkedTargets.length < targets.length;

  const result = {
    auditId: randomUUID(),
    locale: lng,
    inputUrl: String(url || ''),
    normalizedUrl,
    finalUrl: crawl.finalUrl,
    fetchedAt: new Date().toISOString(),
    scanMode: effectiveScanMode,
    crawlStats: {
      plannedPages: crawl.plannedPages,
      visitedPages: crawl.visitedPages,
      failedPages: crawl.failures.length,
      timeoutReached: crawl.timedOut,
      partial,
      pageCapHit: crawl.pageCapHit,
      linkCapHit: crawl.linkCapHit
    },
    linkStats: {
      totalChecked: checkedTargets.length,
      brokenCount: brokenLinks.length,
      warningCount: warnings.length,
      okCount
    },
    scannedPages: crawl.pages,
    failedScanTargets: crawl.failures,
    brokenLinks,
    warnings,
    limitations: buildLimitations({
      locale: lng,
      timedOut: crawl.timedOut,
      pageCapHit: crawl.pageCapHit,
      linkCapHit: crawl.linkCapHit
    }),
    config: {
      maxSubpages: clampedMaxSubpages,
      maxLinks: profile.maxLinks
    }
  };

  // Cache both the detailed result (for the DOI-confirm path) and a compact
  // public projection (for quick lookups by id). toPublicBrokenLinkResult
  // strips broken-link/warning lists; the detailed result keeps everything.
  setCachedBrokenLinkAudit(result.auditId, toPublicBrokenLinkResult(result), result);

  return result;
}

export const __testables = {
  ensureUrl,
  clampMaxSubpages,
  clampScanMode,
  classifyLinkResult,
  extractLinksFromHtml,
  isLikelyHtmlTarget,
  summarizeAffectedPages
};
