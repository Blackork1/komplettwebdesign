import axios from 'axios';
import { randomUUID } from 'crypto';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';
import { createAuditCache } from '../util/testerAuditCache.js';

const USER_AGENT = 'KomplettWebdesign Website Tester/2.0 (+https://komplettwebdesign.de)';
const DEFAULT_MAX_SUBPAGES = 5;
const MIN_MAX_SUBPAGES = 1;
const MAX_MAX_SUBPAGES = 20;
const AUDIT_TIMEOUT_MS = 45_000;
const MAX_RESPONSE_BYTES = 1_500_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_CAP_MS = 12_000;

const auditCache = createAuditCache({ ttlMs: CACHE_TTL_MS, label: 'website' });

const I18N = {
  de: {
    errors: {
      emptyUrl: 'Bitte gib eine Website-Adresse ein.',
      invalidUrl: 'Die eingegebene URL ist ungültig. Bitte prüfe die Domain.',
      invalidProtocol: 'Bitte nutze eine URL mit http oder https.',
      privateTarget: 'Diese Zieladresse kann aus Sicherheitsgründen nicht geprüft werden.',
      unreachable: 'Die Website konnte nicht geladen werden. Bitte prüfe Domain, SSL oder Erreichbarkeit.',
      timeout: 'Die Analyse hat das Zeitlimit erreicht. Bitte versuche es erneut.',
      missingContext: 'Bitte ergänze Branche, Hauptleistung und Zielregion, damit wir die Seite realistisch bewerten können.'
    },
    labels: {
      ok: 'Okay',
      review: 'Prüfen',
      yes: 'Ja',
      no: 'Nein',
      unknown: 'Unbekannt',
      notFound: 'Nicht gefunden',
      notAvailable: 'Nicht verfügbar',
      notSpecified: 'Nicht ausgezeichnet',
      riskLow: 'Niedrig',
      riskMedium: 'Mittel',
      riskHigh: 'Hoch',
      scoreBand: {
        gut: 'Modern',
        mittel: 'Ausbaufähig',
        kritisch: 'Kritisch'
      }
    },
    categories: {
      seo: 'SEO & GEO-Relevanz',
      value: 'Mehrwert & Modernität',
      accessibility: 'Barrierefreiheit & UX',
      technical: 'Technik & Performance',
      legal: 'Recht & Consent',
      trust: 'Vertrauen & Sicherheit'
    },
    cta: {
      good: {
        headline: 'Starkes Fundament. Hol noch mehr Anfragen aus deiner Website heraus.',
        text: 'Mit gezielten Optimierungen holen wir mehr Sichtbarkeit, Vertrauen und Leads heraus.',
        primaryLabel: 'Optimierung besprechen',
        secondaryLabel: 'Pakete ansehen'
      },
      medium: {
        headline: 'Deine Website hat Potenzial. Jetzt die wichtigsten Hebel umsetzen.',
        text: 'Wir priorisieren die größten Bremsen und machen daraus einen klaren Verbesserungsplan.',
        primaryLabel: 'Website-Check besprechen',
        secondaryLabel: 'Termin buchen'
      },
      critical: {
        headline: 'Deine Website braucht ein klares Modernisierungs-Upgrade.',
        text: 'Ich erstelle dir eine moderne, schnelle und conversionstarke Website inklusive sauberer SEO-Basis.',
        primaryLabel: 'Neue Website anfragen',
        secondaryLabel: 'Beratungstermin buchen'
      }
    },
    summary: {
      good: 'Die Website wirkt insgesamt modern und solide aufgestellt.',
      medium: 'Die Website ist nutzbar, verliert aber Potenzial bei wichtigen Hebeln.',
      critical: 'Die Website hat deutlichen Modernisierungsbedarf und verschenkt Sichtbarkeit oder Vertrauen.'
    },
    limitations: {
      base: 'Dieser Schnelltest bewertet automatisiert öffentlich erreichbare Signale und ersetzt kein vollständiges Experten-Audit.',
      a11y: 'Barrierefreiheit wird in Version 1 als Hinweis-Screening bewertet, nicht als rechtliche Konformitätszusage.',
      legal: 'Rechtliche Ergebnisse sind automatisierte Risikohinweise und ersetzen keine individuelle Rechtsberatung.',
      partial: 'Einige Unterseiten konnten nicht vollständig analysiert werden. Das Ergebnis basiert auf den erreichbaren Seiten.',
      timeout: 'Das Zeitlimit von 45 Sekunden wurde erreicht. Einige Prüfungen wurden als Teil-Ergebnis abgeschlossen.',
      psiUnavailable: 'PageSpeed-Daten konnten nicht geladen werden. Das Ergebnis basiert auf internen Techniksignalen.'
    }
  },
  en: {
    errors: {
      emptyUrl: 'Please enter a website URL.',
      invalidUrl: 'The provided URL is invalid. Please check the domain.',
      invalidProtocol: 'Please use an http or https URL.',
      privateTarget: 'This target address cannot be analyzed for security reasons.',
      unreachable: 'The website could not be loaded. Please check domain, SSL, or availability.',
      timeout: 'The analysis reached its time limit. Please try again.',
      missingContext: 'Please provide business type, primary service, and target region for realistic scoring.'
    },
    labels: {
      ok: 'Okay',
      review: 'Review',
      yes: 'Yes',
      no: 'No',
      unknown: 'Unknown',
      notFound: 'Not found',
      notAvailable: 'Not available',
      notSpecified: 'Not specified',
      riskLow: 'Low',
      riskMedium: 'Medium',
      riskHigh: 'High',
      scoreBand: {
        gut: 'Modern',
        mittel: 'Needs work',
        kritisch: 'Critical'
      }
    },
    categories: {
      seo: 'SEO & GEO relevance',
      value: 'Value & Modernity',
      accessibility: 'Accessibility & UX',
      technical: 'Technical & Performance',
      legal: 'Legal & Consent',
      trust: 'Trust & Security'
    },
    cta: {
      good: {
        headline: 'Great foundation. Let’s unlock more leads from your website.',
        text: 'With targeted improvements we can increase visibility, trust, and conversions.',
        primaryLabel: 'Discuss optimization',
        secondaryLabel: 'View packages'
      },
      medium: {
        headline: 'Your website has potential. Let’s fix the biggest blockers first.',
        text: 'We prioritize the highest-impact issues and turn them into an actionable roadmap.',
        primaryLabel: 'Discuss website check',
        secondaryLabel: 'Book appointment'
      },
      critical: {
        headline: 'Your website likely needs a modern relaunch.',
        text: 'I can build you a modern, fast, conversion-focused website with a clean SEO baseline.',
        primaryLabel: 'Request new website',
        secondaryLabel: 'Book consultation'
      }
    },
    summary: {
      good: 'The website appears modern overall and has a solid baseline.',
      medium: 'The website is usable but loses potential on key levers.',
      critical: 'The website needs significant modernization and likely loses trust or visibility.'
    },
    limitations: {
      base: 'This rapid test evaluates public signals automatically and does not replace a full expert audit.',
      a11y: 'Accessibility in V1 is a signal-based screening, not a legal compliance certification.',
      legal: 'Legal results are automated risk hints and do not replace individual legal advice.',
      partial: 'Some subpages could not be analyzed completely. The result is based on reachable pages.',
      timeout: 'The 45-second time limit was reached. The audit was returned as a partial result.',
      psiUnavailable: 'PageSpeed data could not be fetched. The result is based on internal performance signals.'
    }
  }
};

const CATEGORY_META = [
  { id: 'seo', icon: 'fa-magnifying-glass', weight: 0.35 },
  { id: 'value', icon: 'fa-sparkles', weight: 0.20 },
  { id: 'accessibility', icon: 'fa-universal-access', weight: 0.15 },
  { id: 'technical', icon: 'fa-gauge-high', weight: 0.15 },
  { id: 'legal', icon: 'fa-scale-balanced', weight: 0.10 },
  { id: 'trust', icon: 'fa-shield-heart', weight: 0.05 }
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  'metadata.google.internal'
]);

const SKIP_LINK_EXTENSIONS = /\.(pdf|zip|rar|7z|tar|gz|mp4|mp3|webm|avi|mov|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2?|ttf|eot|xml|json)(\?|#|$)/i;
const GENERIC_TITLE_PATTERNS = /\b(home|startseite|welcome|website|webseite|untitled|index)\b/i;
const TRACKING_SCRIPT_PATTERNS = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /gtag\s*\(/i,
  /clarity\.ms\/tag/i,
  /matomo/i,
  /facebook\.net\/.*fbevents/i,
  /connect\.facebook\.net/i
];
const EMBED_PATTERNS = {
  youtube: /youtube(?:-nocookie)?\.com|youtu\.be/i,
  maps: /maps\.google|mapbox|openstreetmap/i,
  recaptcha: /recaptcha|gstatic\.com\/recaptcha/i
};
const CONSENT_PATTERNS = {
  banner: /cookie[-_\s]?banner|cookie-consent|consent[-_\s]?manager|cookie[-_\s]?einstellungen|cookies?\s+widerrufen/i,
  acceptAction: /accept[-_\s]?all|alles\s+akzeptieren|consent/i,
  rejectAction: /reject|deny|only\s+necessary|nur\s+notwendig|nur\s+notwendiges/i,
  settingsAction: /cookie[-_\s]?settings|cookie[-_\s]?preferences|consent[-_\s]?settings|einstellungen/i
};
const CONTEXT_STOPWORDS = new Set([
  'und', 'oder', 'fur', 'fuer', 'mit', 'von', 'vom', 'im', 'in', 'an', 'am', 'zu', 'zum', 'zur', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einem', 'einer', 'eines',
  'for', 'and', 'the', 'with', 'to', 'from', 'in', 'on', 'at', 'a', 'an', 'of', 'by'
]);
const TOKEN_SYNONYMS = {
  webseite: ['website', 'internetseite', 'homepage', 'webauftritt', 'webdesign'],
  website: ['webseite', 'internetseite', 'homepage', 'webauftritt', 'webdesign'],
  webdesign: ['webseite', 'website', 'internetseite', 'homepage'],
  homepage: ['website', 'webseite', 'landingpage'],
  erstellen: ['erstellung', 'bauen', 'entwickeln', 'build', 'create', 'develop'],
  erstellung: ['erstellen', 'bauen', 'entwickeln', 'build', 'create', 'develop'],
  seo: ['suchmaschinenoptimierung', 'searchengineoptimization'],
  suchmaschinenoptimierung: ['seo'],
  geo: ['generativeengineoptimization', 'llm-seo', 'ai-seo'],
  berlin: ['berlin', 'berliner']
};
const LEGAL_PAGE_CANDIDATES = {
  impressum: [
    '/impressum',
    '/impressum/',
    '/imprint',
    '/imprint/',
    '/legal-notice',
    '/legal-notice/',
    '/legal',
    '/legal/'
  ],
  privacy: [
    '/datenschutz',
    '/datenschutz/',
    '/datenschutz-erklaerung',
    '/datenschutz-erklaerung/',
    '/datenschutzerklaerung',
    '/datenschutzerklaerung/',
    '/datenschutzerklärung',
    '/datenschutzerklärung/',
    '/privacy',
    '/privacy/',
    '/privacy-policy',
    '/privacy-policy/',
    '/data-protection',
    '/data-protection/'
  ]
};
const LEGAL_SIGNAL_PATTERNS = {
  impressum: /impressum|imprint|legal-notice|anbieterkennzeichnung|responsible|verantwortlich/i,
  privacy: /datenschutz|datenschutzerklaerung|datenschutzerklärung|privacy|privacy-policy|data-protection|gdpr|dsgvo/i
};

class Deadline {
  constructor(totalMs = AUDIT_TIMEOUT_MS) {
    this.endsAt = Date.now() + totalMs;
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

  requestTimeoutMs() {
    const remaining = this.remainingMs() - 300;
    if (remaining <= 0) return 1200;
    return Math.max(1200, Math.min(REQUEST_TIMEOUT_CAP_MS, remaining));
  }
}

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function clampMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function copyFor(locale) {
  return I18N[localeFrom(locale)];
}

function normalizeContextText(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function tokenizeContextText(value = '') {
  const normalized = normalizeComparableText(value);
  if (!normalized) return [];

  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !CONTEXT_STOPWORDS.has(token));

  return [...new Set(tokens)];
}

function validateAuditContext(rawContext = {}, locale = 'de') {
  const copy = copyFor(locale);
  const context = {
    businessType: normalizeContextText(rawContext.businessType),
    primaryService: normalizeContextText(rawContext.primaryService),
    targetRegion: normalizeContextText(rawContext.targetRegion)
  };

  if (!context.businessType || !context.primaryService || !context.targetRegion) {
    const error = new Error(copy.errors.missingContext);
    error.status = 400;
    throw error;
  }

  return context;
}

function setCachedResult(result) {
  auditCache.set(result.auditId, result);
}

export function getCachedAuditResult(auditId) {
  return auditCache.get(auditId);
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
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' '));
}

function firstMatch(html, regex, group = 1) {
  const match = regex.exec(html);
  return match ? decodeHtml(match[group] || '') : '';
}

function countMatches(html, regex) {
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

function normalizeHost(hostname = '') {
  return String(hostname || '').trim().toLowerCase().replace(/^www\./, '');
}

function isValidProtocol(url) {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function ensureUrl(rawUrl, locale) {
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

async function assertSafeTarget(url, locale) {
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

function isHtmlResponse(contentType = '') {
  return /text\/html|application\/xhtml\+xml/i.test(contentType || '');
}

async function fetchPage(url, deadline, locale) {
  deadline.assertTime(500, 'timeout');
  const started = Date.now();

  let currentUrl = url;
  let redirectCount = 0;
  while (redirectCount <= 5) {
    await assertSafeTarget(currentUrl, locale);
    const response = await axios.get(currentUrl, {
      timeout: deadline.requestTimeoutMs(),
      maxRedirects: 0,
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
      redirectCount += 1;
      continue;
    }

    const contentType = response.headers?.['content-type'] || '';
    const finalUrl = response.config?.url || currentUrl;
    const buffer = Buffer.isBuffer(response.data)
      ? response.data
      : Buffer.from(response.data || '', 'utf8');

    const html = isHtmlResponse(contentType)
      ? buffer.toString('utf8').slice(0, MAX_RESPONSE_BYTES)
      : '';

    return {
      requestedUrl: url,
      finalUrl,
      status: response.status,
      headers: response.headers || {},
      contentType,
      html,
      htmlSizeKb: Math.round((buffer.byteLength / 1024) * 10) / 10,
      loadTimeMs: Date.now() - started
    };
  }

  const err = new Error(locale === 'en' ? 'Too many redirects.' : 'Zu viele Weiterleitungen.');
  err.status = 502;
  throw err;
}

async function fetchOptionalText(url, deadline, locale) {
  try {
    deadline.assertTime(400, 'timeout');
    let currentUrl = url;
    let redirects = 0;
    while (redirects <= 2) {
      await assertSafeTarget(currentUrl, locale);
      const response = await axios.get(currentUrl, {
        timeout: deadline.requestTimeoutMs(),
        maxRedirects: 0,
        responseType: 'text',
        maxContentLength: 200_000,
        validateStatus: () => true,
        headers: { 'User-Agent': USER_AGENT }
      });

      if (response.status >= 300 && response.status < 400 && response.headers?.location) {
        currentUrl = new URL(response.headers.location, currentUrl).toString();
        redirects += 1;
        continue;
      }

      return response;
    }
    return null;
  } catch {
    return null;
  }
}

function findLegalPageFromList(pages = [], type = 'impressum') {
  if (type === 'privacy') {
    return pages.find((page) => hasLegalSignal(page.url, 'privacy')) || null;
  }
  return pages.find((page) => hasLegalSignal(page.url, 'impressum')) || null;
}

function looksLikeLegalPage(page, type = 'impressum') {
  const haystack = `${page.url} ${page.title} ${page.h1First} ${page.bodyTextLower || ''}`.toLowerCase();
  if (type === 'privacy') {
    return hasLegalSignal(haystack, 'privacy') || /cookie|einwilligung|consent/i.test(haystack);
  }
  return hasLegalSignal(haystack, 'impressum');
}

async function fetchLegalPageByCandidates({ finalOrigin, candidates, type, deadline, locale }) {
  let fallbackPage = null;
  const scannedPages = [];
  const failedTargets = [];
  const seenScannedUrls = new Set();

  for (const candidate of candidates) {
    if (!deadline.hasTime(1_600)) break;

    try {
      const targetUrl = new URL(candidate, finalOrigin).toString();
      const page = await fetchPage(targetUrl, deadline, locale);

      if (!page || page.status >= 400 || !page.html) {
        failedTargets.push({
          url: targetUrl,
          message: page ? `HTTP ${page.status}` : 'failed'
        });
        continue;
      }

      const parsed = parsePageSignals(page);
      if (!seenScannedUrls.has(parsed.url)) {
        seenScannedUrls.add(parsed.url);
        scannedPages.push({
          url: parsed.url,
          status: parsed.status,
          loadTimeMs: parsed.loadTimeMs,
          title: parsed.title || '',
          source: 'legal_forced',
          legalType: type
        });
      }

      if (looksLikeLegalPage(parsed, type)) {
        return {
          page: parsed,
          scannedPages,
          failedTargets
        };
      }

      if (!fallbackPage) {
        fallbackPage = parsed;
      }
    } catch (error) {
      const targetUrl = (() => {
        try {
          return new URL(candidate, finalOrigin).toString();
        } catch {
          return String(candidate || '');
        }
      })();
      failedTargets.push({
        url: targetUrl,
        message: error?.message || 'failed'
      });
    }
  }

  return {
    page: fallbackPage,
    scannedPages,
    failedTargets
  };
}

function collectLegalCandidates({ finalOrigin, analyzedPages, type }) {
  const originHost = normalizeHost(new URL(finalOrigin).hostname);
  const seen = new Set();
  const collected = [];

  const addCandidate = (rawCandidate, baseUrl = finalOrigin) => {
    const raw = String(rawCandidate || '').trim();
    if (!raw) return;

    let resolved;
    try {
      resolved = new URL(raw, baseUrl);
    } catch {
      return;
    }

    if (!isValidProtocol(resolved)) return;
    if (normalizeHost(resolved.hostname) !== originHost) return;

    resolved.hash = '';
    const asString = resolved.toString();
    if (seen.has(asString)) return;
    seen.add(asString);
    collected.push(asString);
  };

  for (const fallbackPath of (LEGAL_PAGE_CANDIDATES[type] || [])) {
    addCandidate(fallbackPath, finalOrigin);
  }

  for (const page of analyzedPages) {
    if (hasLegalSignal(page.url, type)) {
      addCandidate(page.url, page.url);
    }

    for (const link of (page.links || [])) {
      const linkSignal = `${link.href || ''} ${link.text || ''}`;
      if (hasLegalSignal(linkSignal, type)) {
        addCandidate(link.href, page.url);
      }
    }
  }

  return collected;
}

async function resolveLegalPages({ finalOrigin, analyzedPages, deadline, locale }) {
  const legalPages = {
    impressum: findLegalPageFromList(analyzedPages, 'impressum'),
    privacy: findLegalPageFromList(analyzedPages, 'privacy')
  };
  const forcedScannedPages = [];
  const forcedFailedTargets = [];

  const impressumFetch = await fetchLegalPageByCandidates({
    finalOrigin,
    candidates: collectLegalCandidates({
      finalOrigin,
      analyzedPages,
      type: 'impressum'
    }),
    type: 'impressum',
    deadline,
    locale
  });
  if (!legalPages.impressum) {
    legalPages.impressum = impressumFetch.page || null;
  }
  forcedScannedPages.push(...(impressumFetch.scannedPages || []));
  forcedFailedTargets.push(...(impressumFetch.failedTargets || []));

  const privacyFetch = await fetchLegalPageByCandidates({
    finalOrigin,
    candidates: collectLegalCandidates({
      finalOrigin,
      analyzedPages,
      type: 'privacy'
    }),
    type: 'privacy',
    deadline,
    locale
  });
  if (!legalPages.privacy) {
    legalPages.privacy = privacyFetch.page || null;
  }
  forcedScannedPages.push(...(privacyFetch.scannedPages || []));
  forcedFailedTargets.push(...(privacyFetch.failedTargets || []));

  return {
    ...legalPages,
    forcedScannedPages,
    forcedFailedTargets
  };
}

function extractInternalLinks(html, baseUrl, baseHost) {
  if (!html) return [];
  const links = [];
  const seen = new Set();
  const matches = [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>/gi)];

  for (const match of matches) {
    const href = decodeHtml(match[1] || '').trim();
    if (!href || href.startsWith('#')) continue;
    if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    if (SKIP_LINK_EXTENSIONS.test(href)) continue;

    let resolved;
    try {
      resolved = new URL(href, baseUrl);
    } catch {
      continue;
    }

    if (!isValidProtocol(resolved)) continue;
    if (normalizeHost(resolved.hostname) !== baseHost) continue;

    resolved.hash = '';
    const normalized = resolved.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(normalized);
  }

  return links;
}

function decodeUrlForMatch(value = '') {
  const raw = String(value || '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function hasLegalSignal(value = '', type = 'impressum') {
  const pattern = LEGAL_SIGNAL_PATTERNS[type] || LEGAL_SIGNAL_PATTERNS.impressum;
  const target = `${String(value || '')} ${decodeUrlForMatch(value)}`;
  return pattern.test(target);
}

function parsePageSignals(page) {
  const html = page.html || '';
  const htmlLower = html.toLowerCase();
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)
    || firstMatch(html, /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1] || ''));
  const viewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const canonical = /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+["'][^>]*>/i.test(html);
  const jsonLdScripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => String(m[1] || '').trim())
    .filter(Boolean);
  const hasSchema = jsonLdScripts.length > 0;
  const schemaText = jsonLdScripts.join('\n').toLowerCase();
  const schemaTypes = [];
  const schemaTypeMatches = [...schemaText.matchAll(/"@type"\s*:\s*"?([a-z0-9]+)"?/gi)];
  for (const match of schemaTypeMatches) {
    const rawType = String(match[1] || '').trim();
    if (!rawType) continue;
    const type = rawType.toLowerCase();
    if (!schemaTypes.includes(type)) schemaTypes.push(type);
  }
  const hasOrganizationSchema = schemaTypes.includes('organization');
  const hasLocalBusinessSchema = schemaTypes.includes('localbusiness');
  const hasFaqSchema = schemaTypes.includes('faqpage');
  const hasAddressInSchema = /"address"\s*:/i.test(schemaText);
  const hasContactInSchema = /"telephone"\s*:|"email"\s*:|"contactpoint"\s*:/i.test(schemaText);
  const hasOpenGraph = /<meta[^>]+property=["']og:title["'][^>]*>/i.test(html);
  const hasTwitterCard = /<meta[^>]+name=["']twitter:card["'][^>]*>/i.test(html);
  const lang = firstMatch(html, /<html[^>]+lang=["']([^"']+)["'][^>]*>/i);
  const favicon = /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i.test(html);

  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imageAltValues = images.map((tag) => {
    const attr = /alt\s*=\s*(["'])(.*?)\1/i.exec(tag);
    return attr ? decodeHtml(attr[2]) : '';
  });
  const imagesWithoutAlt = imageAltValues.filter((value) => !value).length;
  // Core Web Vitals proxies — CLS correlates with <img> without explicit width/height,
  // LCP/INP with over-eager eager-loading of offscreen images. We don't render the page,
  // so this is necessarily an approximation — but these attributes are strongly advised
  // by web.dev for the respective metrics and are cheap to measure from raw HTML.
  const imagesWithDimensions = images.filter((tag) => /\bwidth\s*=/i.test(tag) && /\bheight\s*=/i.test(tag)).length;
  const imagesWithLazyLoading = images.filter((tag) => /\bloading\s*=\s*["']?lazy["']?/i.test(tag)).length;

  const labels = countMatches(html, /<label\b[^>]*>/gi);
  const inputs = countMatches(html, /<(input|textarea|select)\b/gi);
  const buttons = countMatches(html, /<button\b/gi);
  const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
  const scripts = scriptTags.length;
  // Render-blocking-script proxy: external <script src="..."> tags in <head> without
  // async OR defer will block the HTML parser. We approximate the "in head" locator
  // by extracting the <head>...</head> slice — a few false negatives (scripts injected
  // via JS after load) are acceptable since we're measuring initial-render hazards only.
  const headHtml = firstMatch(html, /<head[^>]*>([\s\S]*?)<\/head>/i) || '';
  const headScripts = [...headHtml.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
  const scriptsWithAsync = scriptTags.filter((tag) => /\basync\b/i.test(tag)).length;
  const scriptsWithDefer = scriptTags.filter((tag) => /\bdefer\b/i.test(tag)).length;
  const renderBlockingScripts = headScripts.filter((tag) => (
    /\bsrc\s*=/i.test(tag) && !/\basync\b/i.test(tag) && !/\bdefer\b/i.test(tag) && !/\btype\s*=\s*["']?module["']?/i.test(tag)
  )).length;
  const stylesheets = countMatches(html, /<link[^>]+rel=["']stylesheet["'][^>]*>/gi);
  const scriptSources = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => decodeHtml(m[1] || ''))
    .filter(Boolean);

  const hasMain = /<main\b[^>]*>/i.test(html);
  const hasHeader = /<header\b[^>]*>/i.test(html);
  const hasFooter = /<footer\b[^>]*>/i.test(html);
  const hasNav = /<nav\b[^>]*>/i.test(html);

  const links = [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: decodeHtml(match[1] || ''),
    text: stripTags(match[2] || '')
  }));

  const hasContactLink = links.some((link) => /kontakt|contact|anfrage|request|termin|booking|beratung|consult/i.test(`${link.href} ${link.text}`));
  const hasLegalLink = links.some((link) => hasLegalSignal(`${link.href} ${link.text}`, 'impressum') || hasLegalSignal(`${link.href} ${link.text}`, 'privacy'));
  const hasPhone = /(tel:|\+\d[\d\s\/-]{5,})/.test(html);
  const hasEmail = /(mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(html);
  const hasAddressSignal = /\b\d{5}\s+[A-Za-zÄÖÜäöüß-]{2,}\b/.test(html) || /straße|str\.|platz|allee|weg|berlin|hamburg|münchen/i.test(html);
  const hasLegalBasicsSignal = /verantwortlich|art\.\s*6|dsgvo|datenschutzerklärung|impressum|betroffenenrechte/i.test(htmlLower);
  const hasCookieHintSignal = /cookie|consent|ttdsg|einwilligung|cookies widerrufen/i.test(htmlLower);
  const hasCookieBannerSignal = CONSENT_PATTERNS.banner.test(htmlLower);
  const hasConsentAcceptSignal = CONSENT_PATTERNS.acceptAction.test(htmlLower);
  const hasConsentRejectSignal = CONSENT_PATTERNS.rejectAction.test(htmlLower);
  const hasConsentSettingsSignal = CONSENT_PATTERNS.settingsAction.test(htmlLower);
  const hasImpressumPathSignal = hasLegalSignal(page.finalUrl, 'impressum') || links.some((link) => hasLegalSignal(link.href, 'impressum'));
  const hasPrivacyPathSignal = hasLegalSignal(page.finalUrl, 'privacy') || links.some((link) => hasLegalSignal(link.href, 'privacy'));
  const hasTrackingScript = TRACKING_SCRIPT_PATTERNS.some((pattern) => pattern.test(html))
    || scriptSources.some((src) => TRACKING_SCRIPT_PATTERNS.some((pattern) => pattern.test(src)));
  const hasYoutubeEmbed = EMBED_PATTERNS.youtube.test(html);
  const hasMapsEmbed = EMBED_PATTERNS.maps.test(html);
  const hasRecaptchaEmbed = EMBED_PATTERNS.recaptcha.test(html);
  const hasEmbedNeedsConsent = hasYoutubeEmbed || hasMapsEmbed || hasRecaptchaEmbed;
  const hasFaqContent = /\bfaq\b|häufige fragen|frequently asked/i.test(htmlLower);

  const bodyText = stripTags(firstMatch(html, /<body[^>]*>([\s\S]*?)<\/body>/i) || html);
  const bodyTextLower = bodyText.toLowerCase();
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  const securityHeaders = {
    csp: !!page.headers['content-security-policy'],
    hsts: !!page.headers['strict-transport-security'],
    xfo: !!page.headers['x-frame-options']
  };

  return {
    url: page.finalUrl,
    status: page.status,
    loadTimeMs: page.loadTimeMs,
    htmlSizeKb: page.htmlSizeKb,
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    h1Count: h1Matches.length,
    h1First: h1Matches[0] || '',
    h1All: h1Matches,
    viewport,
    canonical,
    hasSchema,
    hasOrganizationSchema,
    hasLocalBusinessSchema,
    hasFaqSchema,
    hasAddressInSchema,
    hasContactInSchema,
    hasOpenGraph,
    hasTwitterCard,
    lang,
    favicon,
    lastModified: page.headers['last-modified'] || '',
    images: images.length,
    imagesWithoutAlt,
    imagesWithDimensions,
    imagesWithLazyLoading,
    labels,
    inputs,
    buttons,
    scripts,
    scriptsWithAsync,
    scriptsWithDefer,
    renderBlockingScripts,
    stylesheets,
    hasMain,
    hasHeader,
    hasFooter,
    hasNav,
    hasContactLink,
    hasLegalLink,
    hasPhone,
    hasEmail,
    hasAddressSignal,
    hasLegalBasicsSignal,
    hasCookieHintSignal,
    hasCookieBannerSignal,
    hasConsentAcceptSignal,
    hasConsentRejectSignal,
    hasConsentSettingsSignal,
    hasImpressumPathSignal,
    hasPrivacyPathSignal,
    hasTrackingScript,
    hasYoutubeEmbed,
    hasMapsEmbed,
    hasRecaptchaEmbed,
    hasEmbedNeedsConsent,
    hasFaqContent,
    links: links.slice(0, 200),
    scriptSources: scriptSources.slice(0, 80),
    wordCount,
    bodyText,
    bodyTextLower,
    securityHeaders
  };
}

function ratio(value, total) {
  if (!total) return 0;
  return value / total;
}

function createDetail({ label, passed, explanation, value = '', action = '', severity = 2, qualityScore = null, critical = false, categoryHints = [] }) {
  const normalizedQuality = Number.isFinite(qualityScore)
    ? Math.max(0, Math.min(1, Number(qualityScore)))
    : (passed ? 1 : 0);
  const effectivePassed = passed ?? (normalizedQuality >= 0.75);
  return {
    label,
    status: effectivePassed ? 'ok' : 'warn',
    value,
    explanation,
    action,
    severity,
    qualityScore: normalizedQuality,
    passed: !!effectivePassed,
    critical: !!critical,
    // categoryHints lets downstream consumers (e.g. seoAuditService.buildCategoryScores)
    // route a detail to one or more SEO categories without brittle label-regex matching.
    // Accepted values: 'seo.onpage', 'seo.indexing', 'seo.technical', 'seo.content',
    // 'seo.internalLinking', 'seo.structuredData'. Back-compat: regex fallback still
    // applies when hints are empty.
    categoryHints: Array.isArray(categoryHints) ? categoryHints.filter(Boolean) : []
  };
}

function scoreFromChecks(checks) {
  if (!checks.length) return 0;
  const achieved = checks.reduce((sum, check) => sum + (Number.isFinite(check.qualityScore) ? check.qualityScore : (check.passed ? 1 : 0)), 0);
  return Math.round((achieved / checks.length) * 100);
}

function toneForScore(score) {
  if (score >= 80) return 'gut';
  if (score >= 55) return 'mittel';
  return 'kritisch';
}

function badgeForScore(score, locale) {
  const copy = copyFor(locale);
  const tone = toneForScore(score);
  if (tone === 'gut') return copy.labels.scoreBand.gut;
  if (tone === 'mittel') return copy.labels.scoreBand.mittel;
  return copy.labels.scoreBand.kritisch;
}

function summarizeCategory(title, score, checks, locale) {
  const failed = checks.find((detail) => !detail.passed);
  if (score >= 80) {
    return locale === 'en'
      ? `${title} is in a strong state.`
      : `${title} ist in einem starken Zustand.`;
  }
  if (score >= 55) {
    return locale === 'en'
      ? `${title} is okay but has clear optimization potential.`
      : `${title} ist okay, hat aber klares Optimierungspotenzial.`;
  }
  return locale === 'en'
    ? `${title} is currently a weak area.${failed ? ` ${failed.explanation}` : ''}`
    : `${title} ist aktuell ein Schwachpunkt.${failed ? ` ${failed.explanation}` : ''}`;
}

function pickTop(items, limit = 6) {
  return [...items].sort((a, b) => b.priority - a.priority).slice(0, limit);
}

function buildOverallSummary(overallScore, locale) {
  const copy = copyFor(locale);
  if (overallScore >= 85) return copy.summary.good;
  if (overallScore >= 60) return copy.summary.medium;
  return copy.summary.critical;
}

function buildCta({ overallScore, locale, auditId, domain, scoreBand, topIssues }) {
  const copy = copyFor(locale);
  const band = overallScore >= 85 ? 'good' : overallScore >= 60 ? 'medium' : 'critical';
  const ctaCopy = copy.cta[band];

  const contactBase = locale === 'en' ? '/en/kontakt' : '/kontakt';
  const secondaryHref = '/booking';

  const params = new URLSearchParams({
    source: 'website-tester',
    auditId,
    domain,
    scoreBand,
    topIssues: topIssues.join(' | ')
  });

  return {
    headline: ctaCopy.headline,
    text: ctaCopy.text,
    primaryLabel: ctaCopy.primaryLabel,
    primaryHref: `${contactBase}?${params.toString()}`,
    secondaryLabel: ctaCopy.secondaryLabel,
    secondaryHref
  };
}

function normalizeScoreBand(score) {
  if (score >= 85) return 'gut';
  if (score >= 60) return 'mittel';
  return 'kritisch';
}

function applyScoreCaps(rawScore, caps = []) {
  if (!Array.isArray(caps) || !caps.length) {
    return {
      finalScore: rawScore,
      appliedCaps: [],
      penalty: 0
    };
  }

  const sorted = [...caps]
    .filter((item) => Number.isFinite(item.maxScore))
    .sort((a, b) => a.maxScore - b.maxScore);

  if (!sorted.length) {
    return {
      finalScore: rawScore,
      appliedCaps: [],
      penalty: 0
    };
  }

  const strictest = sorted[0];
  const finalScore = Math.min(rawScore, strictest.maxScore);
  const appliedCaps = sorted.filter((item) => rawScore > item.maxScore);
  return {
    finalScore,
    appliedCaps,
    penalty: Math.max(0, rawScore - finalScore)
  };
}

function normalizeScoreBandWithBlockers(score, criticalBlockers = []) {
  if (score >= 85 && (!criticalBlockers || criticalBlockers.length === 0)) return 'gut';
  if (score < 60 || (criticalBlockers && criticalBlockers.length >= 2)) return 'kritisch';
  return 'mittel';
}

async function fetchPageSpeedData(targetUrl, deadline) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return { available: false, reason: 'missing_key' };
  }

  if (!deadline.hasTime(8_000)) {
    return { available: false, reason: 'time_budget' };
  }

  try {
    const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
      timeout: Math.max(2_000, Math.min(9_000, deadline.requestTimeoutMs())),
      params: {
        url: targetUrl,
        strategy: 'mobile',
        key: apiKey,
        category: ['performance', 'seo', 'accessibility', 'best-practices']
      },
      validateStatus: (status) => status >= 200 && status < 500
    });

    if (response.status >= 400) {
      return { available: false, reason: `http_${response.status}` };
    }

    const categories = response.data?.lighthouseResult?.categories || {};
    const normalized = {
      performance: Number.isFinite(categories.performance?.score) ? Math.round(categories.performance.score * 100) : null,
      seo: Number.isFinite(categories.seo?.score) ? Math.round(categories.seo.score * 100) : null,
      accessibility: Number.isFinite(categories.accessibility?.score) ? Math.round(categories.accessibility.score * 100) : null,
      bestPractices: Number.isFinite(categories['best-practices']?.score) ? Math.round(categories['best-practices'].score * 100) : null
    };

    return { available: true, scores: normalized };
  } catch {
    return { available: false, reason: 'request_failed' };
  }
}

function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeComparableText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeComparableText(value = '') {
  const normalized = normalizeComparableText(value);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function expandTokenVariants(token = '') {
  const normalized = normalizeComparableText(token);
  if (!normalized) return [];

  const variants = new Set([normalized]);
  const mapped = TOKEN_SYNONYMS[normalized] || [];
  mapped.forEach((entry) => {
    const value = normalizeComparableText(entry);
    if (value) variants.add(value);
  });

  if (normalized.length >= 7) {
    variants.add(normalized.slice(0, -1));
  }
  if (normalized.endsWith('en') && normalized.length >= 6) {
    variants.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith('ung') && normalized.length >= 7) {
    variants.add(normalized.slice(0, -3));
  }

  return [...variants].filter(Boolean);
}

function tokenMatchesWordSet(wordSet, tokenVariant) {
  if (!tokenVariant) return false;
  if (wordSet.has(tokenVariant)) return true;

  for (const word of wordSet) {
    if (word.length < 5 || tokenVariant.length < 5) continue;
    if (word.startsWith(tokenVariant) || tokenVariant.startsWith(word)) {
      return true;
    }
  }

  return false;
}

function tokenCoverage(text, tokens) {
  const list = [...new Set(asArray(tokens).map((token) => normalizeComparableText(token)).filter(Boolean))];
  if (!list.length) return 0;
  const words = new Set(tokenizeComparableText(text));
  if (!words.size) return 0;

  const matched = list.filter((token) => {
    const variants = expandTokenVariants(token);
    return variants.some((variant) => tokenMatchesWordSet(words, variant));
  }).length;

  return ratio(matched, list.length);
}

function rangeScore(value, min, max, near = 12) {
  if (!Number.isFinite(value)) return 0;
  if (value >= min && value <= max) return 1;
  if (value >= min - near && value <= max + near) return 0.5;
  return 0;
}

function boolScore(value) {
  return value ? 1 : 0;
}

function averageScore(values = []) {
  const valid = values.filter((entry) => Number.isFinite(entry));
  if (!valid.length) return 0;
  return valid.reduce((sum, entry) => sum + entry, 0) / valid.length;
}

function weightedScore(entries = []) {
  const normalized = entries
    .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.weight) && entry.weight > 0);
  if (!normalized.length) return 0;
  const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  return normalized.reduce((sum, entry) => sum + (entry.score * (entry.weight / totalWeight)), 0);
}

function qualityLabel(locale, score) {
  const lng = localeFrom(locale);
  if (score >= 0.75) return lng === 'en' ? 'Strong' : 'Stark';
  if (score >= 0.45) return lng === 'en' ? 'Partial' : 'Teilweise';
  return lng === 'en' ? 'Weak' : 'Schwach';
}

function findTrackedSignalPages(analyzedPages = []) {
  return analyzedPages.filter((page) => page.hasTrackingScript);
}

function buildCategoryResults({ locale, context, homepage, analyzedPages, robotsResponse, sitemapResponse, psi, crawlMeta, legalPagesResolved = null }) {
  const copy = copyFor(locale);
  const pageCount = analyzedPages.length || 1;
  const businessTokens = tokenizeContextText(context.businessType);
  const serviceTokens = tokenizeContextText(context.primaryService);
  const regionTokens = tokenizeContextText(context.targetRegion);
  const coreServiceTokens = serviceTokens.length ? serviceTokens : businessTokens;
  const serviceOrBusinessTokens = [...new Set([...coreServiceTokens, ...businessTokens])];
  const coreIntentTokens = [...new Set([...coreServiceTokens, ...regionTokens])];
  const allIntentTokens = [...new Set([...coreIntentTokens, ...businessTokens])];

  const pagesWithTitle = analyzedPages.filter((p) => !!p.title).length;
  const pagesWithMeta = analyzedPages.filter((p) => !!p.metaDescription).length;
  const pagesWithSingleH1 = analyzedPages.filter((p) => p.h1Count === 1).length;
  const pagesWithCanonical = analyzedPages.filter((p) => p.canonical).length;
  const pagesWithLang = analyzedPages.filter((p) => !!p.lang).length;
  const pagesWithSemantics = analyzedPages.filter((p) => p.hasMain && p.hasHeader && p.hasFooter && p.hasNav).length;
  const pagesWithContactSignal = analyzedPages.filter((p) => p.hasContactLink || p.hasPhone || p.hasEmail).length;
  const pagesWithLegalSignal = analyzedPages.filter((p) => p.hasLegalLink).length;
  const pagesWithViewport = analyzedPages.filter((p) => p.viewport).length;
  const pagesWithRegionSignal = analyzedPages.filter((p) => {
    const combined = `${p.title} ${p.metaDescription} ${p.h1First} ${p.bodyText}`;
    return tokenCoverage(combined, regionTokens) >= 0.4;
  }).length;
  const pagesWithServiceSignal = analyzedPages.filter((p) => {
    const combined = `${p.title} ${p.metaDescription} ${p.h1First} ${p.bodyText}`;
    return tokenCoverage(combined, serviceOrBusinessTokens) >= 0.4;
  }).length;
  const pagesWithFaqSignal = analyzedPages.filter((p) => p.hasFaqContent || p.hasFaqSchema).length;

  const totalImages = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.images), 0);
  const totalMissingAlt = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.imagesWithoutAlt), 0);
  const totalInputs = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.inputs), 0);
  const totalLabels = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.labels), 0);
  const totalWords = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.wordCount), 0);
  const avgLoadTime = Math.round(analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.loadTimeMs), 0) / pageCount);
  const avgHtmlSizeKb = Math.round(analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.htmlSizeKb), 0) / pageCount);
  const avgScripts = Math.round(analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.scripts), 0) / pageCount);
  const avgStylesheets = Math.round(analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.stylesheets), 0) / pageCount);

  // Core Web Vitals proxy aggregates. We only render HTML so this is a correlated
  // heuristic, not a Lighthouse measurement — but the attributes we count here are
  // exactly what web.dev recommends as first-pass audits for CLS/LCP/render-blocking.
  const totalImagesWithDimensions = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.imagesWithDimensions), 0);
  const totalImagesWithLazyLoading = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.imagesWithLazyLoading), 0);
  const totalRenderBlockingScripts = analyzedPages.reduce((sum, p) => sum + toSafeNumber(p.renderBlockingScripts), 0);
  // Note: per-page `scriptsWithAsync` / `scriptsWithDefer` are emitted on the
  // analyzedPages objects and therefore available to downstream consumers, but not
  // aggregated here — the render-blocking-scripts metric already captures the
  // actionable signal.
  const dimensionsCoverage = totalImages ? totalImagesWithDimensions / totalImages : 1;
  // Lazy-loading "above-the-fold" hazard: LCP best-practice is that the *hero* image
  // should NOT be lazy-loaded. We can't identify the hero without rendering, so we
  // target the opposite: pages with many images where ~zero use lazy loading. That
  // points to a missing perf optimization without the above-the-fold false positive.
  const lazyLoadingAdoption = totalImages ? totalImagesWithLazyLoading / totalImages : 0;
  const avgRenderBlockingScripts = Math.round(totalRenderBlockingScripts / pageCount);

  const robotsOk = !!robotsResponse && robotsResponse.status < 400;
  const sitemapOk = !!sitemapResponse && sitemapResponse.status < 400;
  const usesHttps = new URL(homepage.url).protocol === 'https:';

  const securityHeaderHits = ['csp', 'hsts', 'xfo'].reduce((sum, key) => sum + (homepage.securityHeaders[key] ? 1 : 0), 0);

  const altMissingRatio = totalImages ? ratio(totalMissingAlt, totalImages) : 0;
  const labelCoverage = totalInputs ? ratio(totalLabels, totalInputs) : 1;
  const homepageTitleIntentCoverage = tokenCoverage(homepage.title, coreIntentTokens);
  const homepageMetaIntentCoverage = tokenCoverage(homepage.metaDescription, coreIntentTokens);
  const homepageH1IntentCoverage = tokenCoverage(homepage.h1First, coreIntentTokens);
  const homepageBodyIntentCoverage = weightedScore([
    { score: tokenCoverage(homepage.bodyText, coreIntentTokens), weight: 0.8 },
    { score: tokenCoverage(homepage.bodyText, businessTokens), weight: 0.2 }
  ]);
  const hasBenefitSignal = /(vorteil|nutzen|mehrwert|effizient|individuell|professionell|erfahrung|qualit|schnell|zuverlass|vertrauen|kompetenz|nachhaltig|mobiloptimiert|support|transparen|effective|benefit|quality|trusted|expert|optimized|support)/i.test(`${homepage.bodyText} ${homepage.metaDescription}`);
  const hasCtaSignal = /(kontakt|anfrage|termin|jetzt|angebot|rufen sie|write us|book|request|contact us|call us|pakete|preise|ab\s*\d+\s*(eur|€)|starten|loslegen)/i.test(`${homepage.bodyText} ${homepage.metaDescription} ${homepage.h1First}`);
  const titleLengthScore = rangeScore(homepage.titleLength, 45, 65, 12);
  const metaLengthScore = rangeScore(homepage.metaDescriptionLength, 130, 165, 20);
  const titleGenericPenalty = GENERIC_TITLE_PATTERNS.test(homepage.title || '');
  const titleLooksGeneric = titleGenericPenalty && homepageTitleIntentCoverage < 0.35 && homepage.titleLength < 38;
  const schemaQualityScore = weightedScore([
    { score: boolScore(homepage.hasSchema), weight: 0.25 },
    { score: boolScore(homepage.hasOrganizationSchema || homepage.hasLocalBusinessSchema), weight: 0.35 },
    { score: boolScore(homepage.hasAddressInSchema), weight: 0.20 },
    { score: boolScore(homepage.hasContactInSchema), weight: 0.20 }
  ]);
  const localRelevanceScore = weightedScore([
    { score: ratio(pagesWithRegionSignal, pageCount), weight: 0.45 },
    { score: ratio(pagesWithServiceSignal, pageCount), weight: 0.35 },
    { score: boolScore(homepage.hasAddressSignal || homepage.hasPhone), weight: 0.20 }
  ]);
  const geoReadinessScore = weightedScore([
    { score: boolScore(homepage.hasSchema), weight: 0.35 },
    { score: ratio(pagesWithFaqSignal, pageCount), weight: 0.35 },
    { score: boolScore(homepage.hasOpenGraph && homepage.hasTwitterCard), weight: 0.30 }
  ]);
  const intentMatchScore = weightedScore([
    { score: homepageTitleIntentCoverage, weight: 0.28 },
    { score: homepageMetaIntentCoverage, weight: 0.28 },
    { score: homepageH1IntentCoverage, weight: 0.22 },
    { score: homepageBodyIntentCoverage, weight: 0.22 }
  ]);

  const seoIntentFailures = [
    titleLengthScore < 0.5 || titleLooksGeneric,
    metaLengthScore < 0.5,
    homepageTitleIntentCoverage < 0.5,
    homepageMetaIntentCoverage < 0.5,
    localRelevanceScore < 0.45,
    intentMatchScore < 0.5
  ].filter(Boolean).length;

  const seoChecks = [
    createDetail({
      label: locale === 'en' ? 'Title quality (length + intent)' : 'Title-Qualität (Länge + Intent)',
      passed: titleLengthScore >= 0.75 && homepageTitleIntentCoverage >= 0.5 && !titleLooksGeneric,
      explanation: locale === 'en'
        ? 'The homepage title should be specific, non-generic, and aligned with service + region.'
        : 'Der Startseiten-Title sollte spezifisch, nicht generisch und auf Leistung + Region ausgerichtet sein.',
      value: homepage.title
        ? `${homepage.title} (len: ${homepage.titleLength}, intent: ${Math.round(homepageTitleIntentCoverage * 100)}%)`
        : copy.labels.notFound,
      action: locale === 'en'
        ? `Use a 45-65 char title with service "${context.primaryService}" and region "${context.targetRegion}".`
        : `Nutze einen 45-65 Zeichen Title mit Leistung "${context.primaryService}" und Region "${context.targetRegion}".`,
      severity: 3,
      qualityScore: weightedScore([
        { score: titleLengthScore, weight: 0.45 },
        { score: homepageTitleIntentCoverage, weight: 0.45 },
        { score: titleLooksGeneric ? 0 : 1, weight: 0.10 }
      ]),
      critical: true,
      categoryHints: ['seo.onpage']
    }),
    createDetail({
      label: locale === 'en' ? 'Title coverage across pages' : 'Title-Abdeckung über alle Seiten',
      passed: ratio(pagesWithTitle, pageCount) >= 0.85,
      explanation: locale === 'en'
        ? 'Most analyzed pages should include a unique title.'
        : 'Die meisten analysierten Seiten sollten einen eindeutigen Title besitzen.',
      value: `${pagesWithTitle}/${pageCount}`,
      action: locale === 'en' ? 'Add unique page titles to uncovered pages.' : 'Ergänze fehlende Seitentitel auf allen relevanten Seiten.',
      severity: 2,
      qualityScore: ratio(pagesWithTitle, pageCount),
      categoryHints: ['seo.onpage']
    }),
    createDetail({
      label: locale === 'en' ? 'Meta description quality' : 'Meta-Description-Qualität',
      passed: metaLengthScore >= 0.75 && homepageMetaIntentCoverage >= 0.5 && hasBenefitSignal && hasCtaSignal,
      explanation: locale === 'en'
        ? 'Description should communicate value, include intent terms, and trigger action.'
        : 'Die Description sollte Mehrwert kommunizieren, Intent-Terme enthalten und zur Handlung führen.',
      value: homepage.metaDescription
        ? `${homepage.metaDescription} (len: ${homepage.metaDescriptionLength}, intent: ${Math.round(homepageMetaIntentCoverage * 100)}%, benefit: ${hasBenefitSignal ? 'yes' : 'no'}, cta: ${hasCtaSignal ? 'yes' : 'no'})`
        : copy.labels.notFound,
      action: locale === 'en'
        ? 'Use 130-165 chars with clear benefit + call to action + service/region terms.'
        : 'Nutze 130-165 Zeichen mit klarem Nutzen + Handlungsimpuls + Leistungs-/Regionsbezug.',
      severity: 3,
      qualityScore: weightedScore([
        { score: metaLengthScore, weight: 0.30 },
        { score: homepageMetaIntentCoverage, weight: 0.35 },
        { score: boolScore(hasBenefitSignal), weight: 0.20 },
        { score: boolScore(hasCtaSignal), weight: 0.15 }
      ]),
      critical: true,
      categoryHints: ['seo.onpage']
    }),
    createDetail({
      label: locale === 'en' ? 'H1 structure + topic fit' : 'H1-Struktur + Themenfit',
      passed: ratio(pagesWithSingleH1, pageCount) >= 0.8,
      explanation: locale === 'en'
        ? 'A clean heading hierarchy supports SEO and readability.'
        : 'Eine saubere Überschriftenstruktur unterstützt SEO und Lesbarkeit.',
      value: `${pagesWithSingleH1}/${pageCount}`,
      action: locale === 'en' ? 'Use exactly one H1 per page and nest H2/H3 logically.' : 'Nutze pro Seite genau eine H1 und ordne H2/H3 logisch.',
      severity: 2,
      qualityScore: weightedScore([
        { score: ratio(pagesWithSingleH1, pageCount), weight: 0.55 },
        { score: homepageH1IntentCoverage, weight: 0.45 }
      ]),
      categoryHints: ['seo.onpage']
    }),
    createDetail({
      label: locale === 'en' ? 'Canonical coverage' : 'Canonical-Abdeckung',
      passed: ratio(pagesWithCanonical, pageCount) >= 0.7,
      explanation: locale === 'en'
        ? 'Canonical tags reduce duplicate-content ambiguity.'
        : 'Canonical-Tags reduzieren Unsicherheit bei Duplicate Content.',
      value: `${pagesWithCanonical}/${pageCount}`,
      action: locale === 'en' ? 'Set canonical tags on indexable pages.' : 'Setze Canonical-Tags auf indexierbaren Seiten.',
      severity: 2,
      qualityScore: ratio(pagesWithCanonical, pageCount),
      categoryHints: ['seo.onpage']
    }),
    createDetail({
      label: locale === 'en' ? 'Schema quality (business + contact)' : 'Schema-Qualität (Unternehmen + Kontakt)',
      passed: schemaQualityScore >= 0.6,
      explanation: locale === 'en'
        ? 'Quality schema should include business type and key contact/address fields.'
        : 'Qualitatives Schema sollte Unternehmenstyp sowie zentrale Kontakt-/Adressfelder enthalten.',
      value: `${qualityLabel(locale, schemaQualityScore)} (${Math.round(schemaQualityScore * 100)}/100)`,
      action: locale === 'en' ? 'Implement Organization/LocalBusiness schema with address and contact fields.' : 'Implementiere Organization/LocalBusiness-Schema mit Adresse und Kontaktfeldern.',
      severity: 2,
      qualityScore: schemaQualityScore,
      categoryHints: ['seo.structuredData']
    }),
    createDetail({
      label: locale === 'en' ? 'Local relevance' : 'Lokale Relevanz',
      passed: localRelevanceScore >= 0.55,
      explanation: locale === 'en'
        ? 'Service and region should be visible beyond the homepage.'
        : 'Leistung und Region sollten über die Startseite hinaus sichtbar sein.',
      value: `${qualityLabel(locale, localRelevanceScore)} (${Math.round(localRelevanceScore * 100)}/100)`,
      action: locale === 'en'
        ? `Reference "${context.targetRegion}" and "${context.primaryService}" consistently on key pages.`
        : `Verankere "${context.targetRegion}" und "${context.primaryService}" konsistent auf Kernseiten.`,
      severity: 3,
      qualityScore: localRelevanceScore,
      critical: true,
      categoryHints: ['seo.content']
    }),
    createDetail({
      label: locale === 'en' ? 'Intent coherence (title/meta/h1/body)' : 'Intent-Kohärenz (Title/Meta/H1/Body)',
      passed: intentMatchScore >= 0.55,
      explanation: locale === 'en'
        ? 'Core page elements should communicate one clear topic and search intent.'
        : 'Die Kernelemente der Seite sollten ein klares Thema und Such-Intent transportieren.',
      value: `${qualityLabel(locale, intentMatchScore)} (${Math.round(intentMatchScore * 100)}/100) | T:${Math.round(homepageTitleIntentCoverage * 100)} M:${Math.round(homepageMetaIntentCoverage * 100)} H1:${Math.round(homepageH1IntentCoverage * 100)} B:${Math.round(homepageBodyIntentCoverage * 100)}`,
      action: locale === 'en'
        ? 'Align title, meta, H1, and core body copy around one primary service intent.'
        : 'Richte Title, Meta, H1 und Hauptinhalt auf einen primären Leistungs-Intent aus.',
      severity: 3,
      qualityScore: intentMatchScore,
      critical: true,
      categoryHints: ['seo.content']
    }),
    createDetail({
      label: locale === 'en' ? 'GEO readiness (entity + FAQ/snippets)' : 'GEO-Readiness (Entity + FAQ/Snippets)',
      passed: geoReadinessScore >= 0.5,
      explanation: locale === 'en'
        ? 'Entity clarity, FAQ structure, and snippet-friendly blocks improve AI visibility.'
        : 'Entity-Klarheit, FAQ-Struktur und snippet-fähige Blöcke verbessern AI-Sichtbarkeit.',
      value: `${qualityLabel(locale, geoReadinessScore)} (${Math.round(geoReadinessScore * 100)}/100)`,
      action: locale === 'en' ? 'Add FAQ blocks and strengthen entity signals with structured data.' : 'Ergänze FAQ-Blöcke und stärke Entity-Signale mit strukturierten Daten.',
      severity: 2,
      qualityScore: geoReadinessScore,
      categoryHints: ['seo.structuredData']
    }),
    createDetail({
      label: locale === 'en' ? 'robots.txt reachable' : 'robots.txt erreichbar',
      passed: robotsOk,
      explanation: locale === 'en'
        ? (robotsOk ? 'robots.txt is reachable.' : 'robots.txt could not be reached.')
        : (robotsOk ? 'Die robots.txt ist erreichbar.' : 'Die robots.txt ist nicht erreichbar.'),
      value: robotsOk ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Provide a valid robots.txt with crawl directives.' : 'Hinterlege eine gültige robots.txt mit Crawl-Regeln.',
      severity: 1,
      qualityScore: boolScore(robotsOk),
      categoryHints: ['seo.indexing']
    }),
    createDetail({
      label: locale === 'en' ? 'sitemap.xml reachable' : 'sitemap.xml erreichbar',
      passed: sitemapOk,
      explanation: locale === 'en'
        ? (sitemapOk ? 'sitemap.xml is reachable.' : 'sitemap.xml could not be reached.')
        : (sitemapOk ? 'Die sitemap.xml ist erreichbar.' : 'Die sitemap.xml ist nicht erreichbar.'),
      value: sitemapOk ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Generate and submit a sitemap in Search Console.' : 'Erzeuge eine Sitemap und reiche sie in der Search Console ein.',
      severity: 1,
      qualityScore: boolScore(sitemapOk),
      categoryHints: ['seo.indexing']
    })
  ];

  if (psi.available && Number.isFinite(psi.scores?.seo)) {
    seoChecks.push(createDetail({
      label: locale === 'en' ? 'Google PSI SEO score' : 'Google PSI SEO-Score',
      passed: psi.scores.seo >= 80,
      explanation: locale === 'en'
        ? 'Google Lighthouse SEO score from PageSpeed API.'
        : 'Google-Lighthouse-SEO-Score aus der PageSpeed API.',
      value: `${psi.scores.seo}/100`,
      action: locale === 'en' ? 'Improve Lighthouse SEO opportunities and rerun.' : 'Setze Lighthouse-SEO-Hinweise um und prüfe erneut.',
      severity: 1,
      qualityScore: Math.max(0, Math.min(1, psi.scores.seo / 100)),
      categoryHints: ['seo.technical']
    }));
  }

  const valueChecks = [
    createDetail({
      label: locale === 'en' ? 'Content depth and substance' : 'Inhaltstiefe und Substanz',
      passed: totalWords >= 700,
      explanation: locale === 'en'
        ? 'Thin content usually underperforms for users and search visibility.'
        : 'Dünner Inhalt performt meist schlechter bei Nutzern und in der Suche.',
      value: `${totalWords}`,
      action: locale === 'en' ? 'Expand service pages with concrete use cases, benefits, and examples.' : 'Erweitere Leistungsseiten um konkrete Use-Cases, Nutzen und Beispiele.',
      severity: 3,
      qualityScore: rangeScore(totalWords, 700, 4500, 250),
      critical: totalWords < 320,
      categoryHints: ['seo.content']
    }),
    createDetail({
      label: locale === 'en' ? 'Service clarity' : 'Leistungsklarheit',
      passed: ratio(pagesWithServiceSignal, pageCount) >= 0.5,
      explanation: locale === 'en'
        ? 'Users should quickly understand what exactly is offered.'
        : 'Nutzer sollten schnell verstehen, was konkret angeboten wird.',
      value: `${pagesWithServiceSignal}/${pageCount}`,
      action: locale === 'en'
        ? `State "${context.primaryService}" clearly on key pages and headlines.`
        : `Nenne "${context.primaryService}" klar auf Kernseiten und in Überschriften.`,
      severity: 3,
      qualityScore: ratio(pagesWithServiceSignal, pageCount),
      critical: ratio(pagesWithServiceSignal, pageCount) < 0.3,
      categoryHints: ['seo.content']
    }),
    createDetail({
      label: locale === 'en' ? 'Benefit communication' : 'Nutzenkommunikation',
      passed: hasBenefitSignal,
      explanation: locale === 'en'
        ? 'Value proposition should be explicit, not generic.'
        : 'Das Nutzenversprechen sollte explizit und nicht generisch sein.',
      value: hasBenefitSignal ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Add concrete value statements (time, cost, quality, outcomes).' : 'Ergänze konkrete Nutzenaussagen (Zeit, Kosten, Qualität, Ergebnis).',
      severity: 2,
      qualityScore: boolScore(hasBenefitSignal),
      categoryHints: ['seo.content']
    }),
    createDetail({
      label: locale === 'en' ? 'Clear next step / CTA' : 'Klarer nächster Schritt / CTA',
      passed: hasCtaSignal && pagesWithContactSignal > 0,
      explanation: locale === 'en'
        ? 'A clear next step is required for conversion.'
        : 'Für gute Conversion ist ein klarer nächster Schritt nötig.',
      value: `${pagesWithContactSignal}/${pageCount}`,
      action: locale === 'en' ? 'Place visible CTA blocks above the fold and on key service pages.' : 'Setze sichtbare CTA-Blöcke above the fold und auf Kernleistungsseiten.',
      severity: 2,
      qualityScore: weightedScore([
        { score: boolScore(hasCtaSignal), weight: 0.5 },
        { score: ratio(pagesWithContactSignal, pageCount), weight: 0.5 }
      ])
    }),
    createDetail({
      label: locale === 'en' ? 'Trust elements present' : 'Vertrauenselemente vorhanden',
      passed: homepage.hasPhone || homepage.hasEmail || homepage.hasAddressSignal,
      explanation: locale === 'en'
        ? 'Trust markers improve perceived quality and conversion.'
        : 'Vertrauenselemente verbessern Qualitätswahrnehmung und Conversion.',
      value: homepage.hasPhone || homepage.hasEmail || homepage.hasAddressSignal ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Add visible trust markers (address, contact, references, guarantees).' : 'Ergänze sichtbare Vertrauenselemente (Adresse, Kontakt, Referenzen, Garantien).',
      severity: 2,
      qualityScore: weightedScore([
        { score: boolScore(homepage.hasPhone), weight: 0.3 },
        { score: boolScore(homepage.hasEmail), weight: 0.3 },
        { score: boolScore(homepage.hasAddressSignal), weight: 0.4 }
      ])
    })
  ];

  const accessibilityChecks = [
    createDetail({
      label: locale === 'en' ? 'HTML language set' : 'HTML-Sprache gesetzt',
      passed: ratio(pagesWithLang, pageCount) >= 0.8,
      explanation: locale === 'en'
        ? 'Language attributes help assistive technologies.'
        : 'Sprachattribute helfen assistiven Technologien.',
      value: `${pagesWithLang}/${pageCount}`,
      action: locale === 'en' ? 'Set a valid lang attribute on every page.' : 'Setze auf jeder Seite ein gültiges lang-Attribut.',
      severity: 3,
      qualityScore: ratio(pagesWithLang, pageCount)
    }),
    createDetail({
      label: locale === 'en' ? 'Image ALT quality' : 'Bild-ALT-Qualität',
      passed: totalImages === 0 || altMissingRatio <= 0.1,
      explanation: locale === 'en'
        ? 'Most images should include meaningful ALT text.'
        : 'Die meisten Bilder sollten sinnvolle ALT-Texte besitzen.',
      value: totalImages ? `${totalMissingAlt}/${totalImages}` : copy.labels.notAvailable,
      action: locale === 'en' ? 'Add ALT text to informative images.' : 'Ergänze ALT-Texte bei inhaltlich relevanten Bildern.',
      severity: 3,
      qualityScore: totalImages ? Math.max(0, 1 - altMissingRatio) : 1
    }),
    createDetail({
      label: locale === 'en' ? 'Form label coverage' : 'Formular-Label-Abdeckung',
      passed: labelCoverage >= 0.7,
      explanation: locale === 'en'
        ? 'Inputs should have visible labels for better accessibility.'
        : 'Eingabefelder sollten sichtbare Labels für bessere Barrierefreiheit haben.',
      value: `${totalLabels}/${Math.max(totalInputs, 1)}`,
      action: locale === 'en' ? 'Attach explicit labels to all form controls.' : 'Verknüpfe alle Formularelemente mit eindeutigen Labels.',
      severity: 2,
      qualityScore: Math.max(0, Math.min(1, labelCoverage))
    }),
    createDetail({
      label: locale === 'en' ? 'Semantic layout coverage' : 'Semantische Struktur-Abdeckung',
      passed: ratio(pagesWithSemantics, pageCount) >= 0.7,
      explanation: locale === 'en'
        ? 'Header/Main/Nav/Footer improve navigation for assistive tech.'
        : 'Header/Main/Nav/Footer verbessern die Orientierung für assistive Technologien.',
      value: `${pagesWithSemantics}/${pageCount}`,
      action: locale === 'en' ? 'Use semantic regions consistently on key pages.' : 'Nutze semantische Bereiche konsistent auf Kernseiten.',
      severity: 2,
      qualityScore: ratio(pagesWithSemantics, pageCount)
    }),
    createDetail({
      label: locale === 'en' ? 'Interactive controls present' : 'Interaktive Elemente vorhanden',
      passed: analyzedPages.some((p) => p.buttons > 0),
      explanation: locale === 'en'
        ? 'Buttons and clear controls support usable journeys.'
        : 'Buttons und klare Bedienelemente unterstützen nutzbare Journeys.',
      value: `${analyzedPages.reduce((sum, p) => sum + p.buttons, 0)}`,
      action: locale === 'en' ? 'Ensure clear and accessible CTA controls.' : 'Stelle klare und zugängliche CTA-Bedienelemente sicher.',
      severity: 1,
      qualityScore: analyzedPages.some((p) => p.buttons > 0) ? 1 : 0
    })
  ];

  if (psi.available && Number.isFinite(psi.scores?.accessibility)) {
    accessibilityChecks.push(createDetail({
      label: locale === 'en' ? 'Google PSI accessibility score' : 'Google PSI Accessibility-Score',
      passed: psi.scores.accessibility >= 80,
      explanation: locale === 'en'
        ? 'Lighthouse accessibility score from PageSpeed API.'
        : 'Lighthouse-Barrierefreiheits-Score aus der PageSpeed API.',
      value: `${psi.scores.accessibility}/100`,
      action: locale === 'en' ? 'Address high-impact Lighthouse accessibility issues.' : 'Behebe die wichtigsten Lighthouse-Barrierefreiheits-Hinweise.',
      severity: 2,
      qualityScore: Math.max(0, Math.min(1, psi.scores.accessibility / 100))
    }));
  }

  const technicalChecks = [
    createDetail({
      label: locale === 'en' ? 'Homepage first fetch under 3s' : 'Startseiten-Abruf unter 3 Sekunden',
      passed: homepage.loadTimeMs < 3000,
      explanation: locale === 'en'
        ? 'Initial responsiveness strongly impacts user perception.'
        : 'Die initiale Reaktionsgeschwindigkeit prägt den Ersteindruck stark.',
      value: `${homepage.loadTimeMs} ms`,
      action: locale === 'en' ? 'Reduce blocking resources and server latency.' : 'Reduziere blockierende Ressourcen und Server-Latenz.',
      severity: 3,
      qualityScore: rangeScore(homepage.loadTimeMs, 0, 3000, 1200),
      categoryHints: ['seo.technical']
    }),
    createDetail({
      label: locale === 'en' ? 'Average load time under 3.5s' : 'Ø Ladezeit unter 3,5 Sekunden',
      passed: avgLoadTime < 3500,
      explanation: locale === 'en'
        ? 'Average page speed should stay in an acceptable range.'
        : 'Die durchschnittliche Seitenladezeit sollte im guten Bereich liegen.',
      value: `${avgLoadTime} ms`,
      action: locale === 'en' ? 'Optimize media, caching, and script loading.' : 'Optimiere Medien, Caching und Script-Ladevorgang.',
      severity: 2,
      qualityScore: rangeScore(avgLoadTime, 0, 3500, 1400),
      categoryHints: ['seo.technical']
    }),
    createDetail({
      label: locale === 'en' ? 'Average HTML size under 350 KB' : 'Ø HTML-Größe unter 350 KB',
      passed: avgHtmlSizeKb < 350,
      explanation: locale === 'en'
        ? 'Lean HTML helps the browser render faster.'
        : 'Schlankes HTML hilft beim schnelleren Rendern.',
      value: `${avgHtmlSizeKb} KB`,
      action: locale === 'en' ? 'Reduce excessive markup and inline payload.' : 'Reduziere überflüssiges Markup und Inline-Last.',
      severity: 1,
      qualityScore: rangeScore(avgHtmlSizeKb, 0, 350, 180),
      categoryHints: ['seo.technical']
    }),
    createDetail({
      label: locale === 'en' ? 'Script load complexity' : 'Script-Komplexität',
      passed: avgScripts <= 15,
      explanation: locale === 'en'
        ? 'Too many scripts often hurt performance and stability.'
        : 'Zu viele Scripts schaden oft Performance und Stabilität.',
      value: `${avgScripts} avg`,
      action: locale === 'en' ? 'Defer non-critical scripts and remove unused JS.' : 'Lade nicht-kritische Scripts verzögert und entferne ungenutztes JS.',
      severity: 2,
      qualityScore: rangeScore(avgScripts, 0, 15, 8),
      categoryHints: ['seo.technical']
    }),
    createDetail({
      label: locale === 'en' ? 'Stylesheet count' : 'Stylesheet-Anzahl',
      passed: avgStylesheets <= 8,
      explanation: locale === 'en'
        ? 'A compact CSS delivery improves render start.'
        : 'Kompakte CSS-Auslieferung verbessert den Render-Start.',
      value: `${avgStylesheets} avg`,
      action: locale === 'en' ? 'Bundle and trim CSS where possible.' : 'Bündle und verschlanke CSS, wo möglich.',
      severity: 1,
      qualityScore: rangeScore(avgStylesheets, 0, 8, 6),
      categoryHints: ['seo.technical']
    }),
    // --- Core Web Vitals proxies (P2-2) ----------------------------------
    // We approximate CLS/LCP/render-blocking from static HTML signals because the
    // audit cannot run a real browser. Numeric thresholds chosen to flag issues
    // *likely* to move CWV metrics without generating noise on well-optimized sites.
    createDetail({
      label: locale === 'en' ? 'Image dimensions set (CLS proxy)' : 'Bildmaße gesetzt (CLS-Proxy)',
      // web.dev: explicit width/height on <img> prevents layout shift. We want >=80%
      // of images to carry both attributes; responsive images with aspect-ratio CSS
      // are still fine under this rule since they also set width/height on the tag.
      passed: dimensionsCoverage >= 0.8 || totalImages === 0,
      explanation: locale === 'en'
        ? 'Setting width and height on images reduces Cumulative Layout Shift (CLS).'
        : 'Explizite Breite und Höhe auf <img>-Tags reduziert Layout-Verschiebungen (CLS).',
      value: totalImages === 0
        ? (locale === 'en' ? 'no images' : 'keine Bilder')
        : `${Math.round(dimensionsCoverage * 100)}%`,
      action: locale === 'en'
        ? 'Add explicit width/height (or aspect-ratio) to <img> tags, especially above the fold.'
        : 'Ergänze width/height (oder aspect-ratio) auf <img>-Tags, besonders above-the-fold.',
      severity: 2,
      qualityScore: totalImages === 0 ? 1 : Math.max(0, Math.min(1, dimensionsCoverage)),
      categoryHints: ['seo.technical']
    }),
    createDetail({
      label: locale === 'en' ? 'Lazy-loading adopted for below-fold images' : 'Lazy-Loading für Bilder unterhalb des Faltbereichs',
      // If there are 5+ images total and 0 are lazy-loaded, there's near-certain
      // wasted bandwidth for offscreen images. Threshold is intentionally lenient:
      // 1 lazy image out of many is already enough to signal awareness.
      passed: totalImages < 5 || totalImagesWithLazyLoading >= 1,
      explanation: locale === 'en'
        ? 'loading="lazy" on below-the-fold images improves LCP and saves bandwidth.'
        : 'loading="lazy" auf Bildern unterhalb des Faltbereichs verbessert LCP und spart Bandbreite.',
      value: totalImages === 0
        ? (locale === 'en' ? 'no images' : 'keine Bilder')
        : `${Math.round(lazyLoadingAdoption * 100)}% lazy`,
      action: locale === 'en'
        ? 'Add loading="lazy" to <img> tags that are not in the initial viewport.'
        : 'Setze loading="lazy" auf <img>-Tags, die nicht im Startbildschirm sichtbar sind.',
      severity: 1,
      // The scoring curve is asymmetric: 0% adoption caps at 0.3 when there are 5+
      // images, but once any adoption exists we reward it strongly (0.6 minimum).
      qualityScore: totalImages < 5
        ? 1
        : (totalImagesWithLazyLoading === 0
          ? 0.3
          : Math.max(0.6, Math.min(1, lazyLoadingAdoption + 0.5))),
      categoryHints: ['seo.technical']
    }),
    createDetail({
      label: locale === 'en' ? 'Render-blocking scripts in <head>' : 'Render-blockierende Scripts im <head>',
      // In-head external <script> without async/defer/type=module blocks HTML parsing.
      // Under 2 avg per page is acceptable (main app script + analytics); 4+ is a red flag.
      passed: avgRenderBlockingScripts <= 2,
      explanation: locale === 'en'
        ? 'External <script> tags in <head> without async/defer block HTML parsing and delay LCP.'
        : 'Externe <script>-Tags im <head> ohne async/defer blockieren das HTML-Parsing und verzögern LCP.',
      value: `${avgRenderBlockingScripts} avg`,
      action: locale === 'en'
        ? 'Add defer (or async) to non-critical scripts, or move them to the end of <body>.'
        : 'Ergänze defer (oder async) an nicht-kritischen Scripts oder verschiebe sie ans Ende des <body>.',
      severity: 2,
      // 0-2 blocking scripts: full score. 3-5 scripts: linear decay. 6+: near zero.
      qualityScore: avgRenderBlockingScripts <= 2
        ? 1
        : Math.max(0, 1 - ((avgRenderBlockingScripts - 2) / 4)),
      categoryHints: ['seo.technical']
    }),
    createDetail({
      label: locale === 'en' ? 'Crawl depth reached' : 'Crawl-Tiefe erreicht',
      passed: crawlMeta.visitedPages >= 3,
      explanation: locale === 'en'
        ? 'Multiple reachable pages indicate usable internal linking.'
        : 'Mehrere erreichbare Seiten sprechen für nutzbare interne Verlinkung.',
      value: `${crawlMeta.visitedPages}/${crawlMeta.plannedPages}`,
      action: locale === 'en' ? 'Strengthen internal links from the homepage.' : 'Stärke die interne Verlinkung von der Startseite aus.',
      severity: 1,
      qualityScore: ratio(crawlMeta.visitedPages, Math.max(1, crawlMeta.plannedPages)),
      categoryHints: ['seo.internalLinking']
    })
  ];

  if (psi.available && Number.isFinite(psi.scores?.performance)) {
    technicalChecks.push(createDetail({
      label: locale === 'en' ? 'Google PSI performance score' : 'Google PSI Performance-Score',
      passed: psi.scores.performance >= 70,
      explanation: locale === 'en'
        ? 'Lighthouse performance score from PageSpeed API.'
        : 'Lighthouse-Performance-Score aus der PageSpeed API.',
      value: `${psi.scores.performance}/100`,
      action: locale === 'en' ? 'Address LCP/CLS opportunities highlighted by Lighthouse.' : 'Setze LCP/CLS-Optimierungen aus Lighthouse um.',
      severity: 3,
      qualityScore: Math.max(0, Math.min(1, psi.scores.performance / 100)),
      categoryHints: ['seo.technical']
    }));
  }

  const legalPages = {
    impressum: legalPagesResolved?.impressum || findLegalPageFromList(analyzedPages, 'impressum') || null,
    privacy: legalPagesResolved?.privacy || findLegalPageFromList(analyzedPages, 'privacy') || null
  };
  const hasImpressum = !!legalPages.impressum;
  const hasPrivacy = !!legalPages.privacy;
  const consentSignalPages = [
    ...analyzedPages,
    ...(legalPages.impressum ? [legalPages.impressum] : []),
    ...(legalPages.privacy ? [legalPages.privacy] : [])
  ];
  const trackingPages = findTrackedSignalPages(consentSignalPages);
  const trackingDetected = trackingPages.length > 0;
  const consentBannerDetected = consentSignalPages.some((page) => page.hasCookieBannerSignal);
  const consentAcceptDetected = consentSignalPages.some((page) => page.hasConsentAcceptSignal);
  const consentRejectDetected = consentSignalPages.some((page) => page.hasConsentRejectSignal);
  const consentSettingsDetected = consentSignalPages.some((page) => page.hasConsentSettingsSignal);
  const consentHintDetected = consentSignalPages.some((page) => page.hasCookieHintSignal);
  const consentRobustSignal = consentBannerDetected
    && consentAcceptDetected
    && (consentRejectDetected || consentSettingsDetected);
  const embedNeedsConsent = consentSignalPages.some((page) => page.hasEmbedNeedsConsent);
  const hasEmbedConsentSignal = consentSignalPages.some((page) => page.hasCookieBannerSignal || page.hasConsentSettingsSignal || page.hasCookieHintSignal);

  const impressumQualityScore = !hasImpressum
    ? 0
    : weightedScore([
      { score: boolScore(legalPages.impressum.hasAddressSignal), weight: 0.4 },
      { score: boolScore(legalPages.impressum.hasPhone || legalPages.impressum.hasEmail), weight: 0.35 },
      { score: boolScore(/inhaber|verantwortlich|firma|gmbh|ug|ag|e\.k|owner|company/i.test(legalPages.impressum.bodyText || '')), weight: 0.25 }
    ]);

  const privacyQualityScore = !hasPrivacy
    ? 0
    : weightedScore([
      { score: boolScore(/verantwortlich|controller/i.test(legalPages.privacy.bodyText || '')), weight: 0.25 },
      { score: boolScore(/art\.\s*6|rechtsgrundlage|legal basis/i.test(legalPages.privacy.bodyText || '')), weight: 0.25 },
      { score: boolScore(/betroffenenrechte|auskunft|löschung|widerruf|erasure|access/i.test(legalPages.privacy.bodyText || '')), weight: 0.25 },
      { score: boolScore(/cookie|tracking|analytics|consent/i.test(legalPages.privacy.bodyText || '')), weight: 0.25 }
    ]);

  const consentQualityScore = weightedScore([
    { score: boolScore(consentBannerDetected), weight: 0.3 },
    { score: boolScore(consentAcceptDetected), weight: 0.2 },
    { score: boolScore(consentRejectDetected), weight: 0.25 },
    { score: boolScore(consentSettingsDetected || consentHintDetected), weight: 0.25 }
  ]);
  const trackingWithoutConsent = trackingDetected && !consentRobustSignal;
  const embedWithoutConsent = embedNeedsConsent && !hasEmbedConsentSignal;

  const legalChecks = [
    createDetail({
      label: locale === 'en' ? 'Imprint page available' : 'Impressum vorhanden',
      passed: hasImpressum,
      explanation: locale === 'en'
        ? 'German websites should provide a clearly reachable imprint page.'
        : 'Für deutsche Websites sollte ein klar erreichbares Impressum vorhanden sein.',
      value: hasImpressum ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Create and link an imprint page from header/footer.' : 'Erstelle ein Impressum und verlinke es sichtbar in Header/Footer.',
      severity: 3,
      qualityScore: boolScore(hasImpressum),
      critical: true
    }),
    createDetail({
      label: locale === 'en' ? 'Privacy policy available' : 'Datenschutzerklärung vorhanden',
      passed: hasPrivacy,
      explanation: locale === 'en'
        ? 'A privacy policy page should be reachable and linked clearly.'
        : 'Eine Datenschutzerklärung sollte erreichbar und klar verlinkt sein.',
      value: hasPrivacy ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Create and link a privacy policy page from header/footer.' : 'Erstelle eine Datenschutzerklärung und verlinke sie sichtbar in Header/Footer.',
      severity: 3,
      qualityScore: boolScore(hasPrivacy),
      critical: true
    }),
    createDetail({
      label: locale === 'en' ? 'Imprint completeness signals' : 'Impressum-Vollständigkeit (Signale)',
      passed: impressumQualityScore >= 0.6,
      explanation: locale === 'en'
        ? 'Imprint should contain identity, contact, and address signals.'
        : 'Das Impressum sollte Identität, Kontakt und Adresssignale enthalten.',
      value: `${qualityLabel(locale, impressumQualityScore)} (${Math.round(impressumQualityScore * 100)}/100)`,
      action: locale === 'en' ? 'Add full identity, address, and contact details to imprint.' : 'Ergänze im Impressum vollständige Identitäts-, Adress- und Kontaktdaten.',
      severity: 2,
      qualityScore: impressumQualityScore
    }),
    createDetail({
      label: locale === 'en' ? 'Privacy policy completeness signals' : 'Datenschutz-Vollständigkeit (Signale)',
      passed: privacyQualityScore >= 0.6,
      explanation: locale === 'en'
        ? 'Privacy page should include legal basis, rights, and tracking/cookie references.'
        : 'Die Datenschutzseite sollte Rechtsgrundlagen, Betroffenenrechte und Tracking-/Cookie-Hinweise enthalten.',
      value: `${qualityLabel(locale, privacyQualityScore)} (${Math.round(privacyQualityScore * 100)}/100)`,
      action: locale === 'en' ? 'Expand privacy policy with legal basis, rights, and service-specific processing notes.' : 'Erweitere die Datenschutzerklärung um Rechtsgrundlagen, Betroffenenrechte und dienstspezifische Verarbeitungshinweise.',
      severity: 2,
      qualityScore: privacyQualityScore
    }),
    createDetail({
      label: locale === 'en' ? 'Cookie banner / consent controls' : 'Cookie-Banner / Consent-Steuerung',
      passed: consentQualityScore >= 0.6,
      explanation: locale === 'en'
        ? 'Consent setup should provide accept and reject/settings options.'
        : 'Das Consent-Setup sollte Akzeptieren sowie Ablehnen/Einstellen ermöglichen.',
      value: `${qualityLabel(locale, consentQualityScore)} (${Math.round(consentQualityScore * 100)}/100)`,
      action: locale === 'en' ? 'Implement robust consent controls with accept/reject/settings and revocation access.' : 'Implementiere robuste Consent-Steuerung mit Akzeptieren/Ablehnen/Einstellen und Widerrufsmöglichkeit.',
      severity: 3,
      qualityScore: consentQualityScore
    }),
    createDetail({
      label: locale === 'en' ? 'Tracking guarded by consent' : 'Tracking durch Consent abgesichert',
      passed: !trackingWithoutConsent,
      explanation: locale === 'en'
        ? 'Tracking scripts on initial load without consent signal are a high legal risk.'
        : 'Tracking-Skripte beim Erstaufruf ohne erkennbares Consent-Signal sind ein hohes Rechtsrisiko.',
      value: trackingDetected ? (trackingWithoutConsent ? copy.labels.no : copy.labels.yes) : copy.labels.notAvailable,
      action: locale === 'en' ? 'Load analytics/marketing scripts only after explicit consent.' : 'Lade Analytics-/Marketing-Skripte erst nach expliziter Einwilligung.',
      severity: 3,
      qualityScore: trackingWithoutConsent ? 0 : (trackingDetected ? 1 : 0.7),
      critical: trackingWithoutConsent
    }),
    createDetail({
      label: locale === 'en' ? 'Embeds with consent gate' : 'Einbettungen mit Consent-Gate',
      passed: !embedWithoutConsent,
      explanation: locale === 'en'
        ? 'Third-party embeds should be blocked until user consent (2-click pattern).'
        : 'Drittanbieter-Einbettungen sollten bis zur Einwilligung blockiert sein (2-Klick-Prinzip).',
      value: embedNeedsConsent ? (embedWithoutConsent ? copy.labels.no : copy.labels.yes) : copy.labels.notAvailable,
      action: locale === 'en' ? 'Add consent blocker/placeholder before loading external embeds.' : 'Setze Consent-Blocker/Platzhalter vor dem Laden externer Einbettungen.',
      severity: 2,
      qualityScore: embedWithoutConsent ? 0 : (embedNeedsConsent ? 1 : 0.7)
    })
  ];

  const trustChecks = [
    createDetail({
      label: locale === 'en' ? 'HTTPS enabled' : 'HTTPS aktiv',
      passed: usesHttps,
      explanation: locale === 'en'
        ? (usesHttps ? 'Website is served via HTTPS.' : 'Website is not served via HTTPS.')
        : (usesHttps ? 'Die Website wird über HTTPS ausgeliefert.' : 'Die Website wird nicht über HTTPS ausgeliefert.'),
      value: usesHttps ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Force HTTPS and redirect all HTTP traffic.' : 'Erzwinge HTTPS und leite HTTP vollständig weiter.',
      severity: 3,
      qualityScore: boolScore(usesHttps)
    }),
    createDetail({
      label: locale === 'en' ? 'Contact visibility' : 'Kontaktmöglichkeit sichtbar',
      passed: pagesWithContactSignal > 0,
      explanation: locale === 'en'
        ? 'Visitors should quickly find a contact path.'
        : 'Besucher sollten schnell einen Kontaktweg finden.',
      value: `${pagesWithContactSignal}/${pageCount}`,
      action: locale === 'en' ? 'Add a prominent contact CTA in main navigation and hero.' : 'Platziere einen klaren Kontakt-CTA in Navigation und Hero.',
      severity: 2,
      qualityScore: ratio(pagesWithContactSignal, pageCount)
    }),
    createDetail({
      label: locale === 'en' ? 'Legal pages linked' : 'Rechtstexte verlinkt',
      passed: pagesWithLegalSignal > 0,
      explanation: locale === 'en'
        ? 'Legal pages support trust and compliance expectations.'
        : 'Rechtstexte stützen Vertrauen und Compliance-Erwartungen.',
      value: `${pagesWithLegalSignal}/${pageCount}`,
      action: locale === 'en' ? 'Link privacy and legal pages prominently.' : 'Verlinke Impressum und Datenschutz gut sichtbar.',
      severity: 2,
      qualityScore: ratio(pagesWithLegalSignal, pageCount)
    }),
    createDetail({
      label: locale === 'en' ? 'Security headers' : 'Security Header',
      passed: securityHeaderHits >= 1,
      explanation: locale === 'en'
        ? 'At least one of CSP/HSTS/X-Frame-Options should be present.'
        : 'Mindestens einer von CSP/HSTS/X-Frame-Options sollte gesetzt sein.',
      value: securityHeaderHits ? `${securityHeaderHits}/3` : copy.labels.no,
      action: locale === 'en' ? 'Add baseline security headers at the server/proxy.' : 'Setze grundlegende Security-Header auf Server/Proxy-Ebene.',
      severity: 2,
      qualityScore: ratio(securityHeaderHits, 3)
    }),
    createDetail({
      label: locale === 'en' ? 'Favicon available' : 'Favicon vorhanden',
      passed: homepage.favicon,
      explanation: locale === 'en'
        ? 'A favicon supports brand trust and recognition.'
        : 'Ein Favicon unterstützt Markenwahrnehmung und Vertrauen.',
      value: homepage.favicon ? copy.labels.yes : copy.labels.no,
      action: locale === 'en' ? 'Provide a favicon across devices and platforms.' : 'Stelle ein konsistentes Favicon für alle Plattformen bereit.',
      severity: 1,
      qualityScore: boolScore(homepage.favicon)
    })
  ];

  if (psi.available && Number.isFinite(psi.scores?.bestPractices)) {
    valueChecks.push(createDetail({
      label: locale === 'en' ? 'Google PSI best-practices score' : 'Google PSI Best-Practices-Score',
      passed: psi.scores.bestPractices >= 80,
      explanation: locale === 'en'
        ? 'Lighthouse best-practices score from PageSpeed API.'
        : 'Lighthouse-Best-Practices-Score aus der PageSpeed API.',
      value: `${psi.scores.bestPractices}/100`,
      action: locale === 'en' ? 'Resolve best-practice warnings flagged by Lighthouse.' : 'Behebe Best-Practice-Hinweise aus Lighthouse.',
      severity: 1,
      qualityScore: Math.max(0, Math.min(1, psi.scores.bestPractices / 100))
    }));
  }

  const categoryChecks = {
    seo: seoChecks,
    value: valueChecks,
    accessibility: accessibilityChecks,
    technical: technicalChecks,
    legal: legalChecks,
    trust: trustChecks
  };

  const categories = CATEGORY_META.map((meta) => {
    const checks = asArray(categoryChecks[meta.id]);
    const score = scoreFromChecks(checks);
    return {
      id: meta.id,
      title: copy.categories[meta.id],
      icon: meta.icon,
      weight: meta.weight,
      score,
      badge: badgeForScore(score, locale),
      tone: toneForScore(score),
      summary: summarizeCategory(copy.categories[meta.id], score, checks, locale),
      details: checks
    };
  });

  const legalReasons = [];
  const legalBlockers = [];
  const abmahnFlags = [];
  const scoringCaps = [];

  if (!hasImpressum) {
    const reason = locale === 'en' ? 'Imprint page missing' : 'Impressum fehlt';
    legalReasons.push(reason);
    legalBlockers.push('missing_impressum');
    abmahnFlags.push('missing_impressum');
  }
  if (!hasPrivacy) {
    const reason = locale === 'en' ? 'Privacy policy missing' : 'Datenschutzerklärung fehlt';
    legalReasons.push(reason);
    legalBlockers.push('missing_privacy');
    abmahnFlags.push('missing_datenschutz');
  }
  if (!hasImpressum || !hasPrivacy) {
    scoringCaps.push({
      key: 'missing_legal_pages',
      maxScore: 59,
      reason: locale === 'en'
        ? 'Missing imprint/privacy pages creates high legal exposure.'
        : 'Fehlende Pflichtseiten (Impressum/Datenschutz) erzeugen hohes Rechtsrisiko.'
    });
  }
  if (trackingWithoutConsent) {
    legalReasons.push(locale === 'en' ? 'Tracking appears active without robust consent signal' : 'Tracking wirkt aktiv ohne belastbares Consent-Signal');
    legalBlockers.push('tracking_without_consent');
    abmahnFlags.push('tracking_without_consent');
    scoringCaps.push({
      key: 'tracking_without_consent',
      maxScore: 49,
      reason: locale === 'en'
        ? 'Tracking without consent signal is a critical legal risk.'
        : 'Tracking ohne Consent-Signal ist ein kritisches Rechtsrisiko.'
    });
  }
  if (embedWithoutConsent) {
    legalReasons.push(locale === 'en' ? 'Third-party embeds without clear consent gate detected' : 'Drittanbieter-Einbettungen ohne klares Consent-Gate erkannt');
    abmahnFlags.push('embed_without_consent');
  }
  if (seoIntentFailures >= 2) {
    scoringCaps.push({
      key: 'weak_seo_geo_intent',
      maxScore: 69,
      reason: locale === 'en'
        ? 'Multiple severe SEO/GEO intent quality gaps detected.'
        : 'Mehrere starke SEO/GEO-Intent-Qualitätslücken erkannt.'
    });
  }

  let legalRiskLevel = 'low';
  if (legalBlockers.length > 0) legalRiskLevel = 'high';
  else if (legalReasons.length > 0 || legalChecks.filter((check) => !check.passed).length >= 2) legalRiskLevel = 'medium';

  return {
    categories,
    relevance: {
      seoGeoScore: Math.round(scoreFromChecks(seoChecks)),
      valueScore: Math.round(scoreFromChecks(valueChecks)),
      intentMatchScore: Math.round(intentMatchScore * 100)
    },
    signals: {
      trackingDetected,
      consentBannerDetected,
      consentSettingsDetected: consentSettingsDetected || consentHintDetected
    },
    legalRisk: {
      level: legalRiskLevel,
      label: legalRiskLevel === 'high'
        ? copy.labels.riskHigh
        : legalRiskLevel === 'medium'
          ? copy.labels.riskMedium
          : copy.labels.riskLow,
      reasons: legalReasons,
      blockers: legalBlockers,
      abmahnFlags
    },
    scoringCaps,
    seoIntentFailures
  };
}

function buildHighlights(categories) {
  const allFailures = [];
  const allStrengths = [];

  for (const category of categories) {
    const categoryWeightScore = Math.round(category.weight * 100);
    for (const detail of category.details) {
      if (detail.passed) {
        allStrengths.push({
          category: category.title,
          text: detail.explanation,
          label: detail.label,
          priority: categoryWeightScore + 10
        });
      } else {
        const priority = (detail.severity || 1) * 20 + categoryWeightScore;
        allFailures.push({
          category: category.title,
          label: detail.label,
          text: detail.explanation,
          action: detail.action,
          priority
        });
      }
    }
  }

  const topFindings = pickTop(allFailures.map((item) => ({
    category: item.category,
    label: item.label,
    text: item.text,
    priority: item.priority
  })), 6);

  const topActions = pickTop(allFailures.map((item) => ({
    category: item.category,
    label: item.label,
    text: item.action || item.text,
    priority: item.priority
  })), 6);

  const strengths = pickTop(allStrengths, 4).map((item) => ({
    category: item.category,
    text: item.text,
    label: item.label
  }));

  return {
    topFindings,
    topActions,
    strengths
  };
}

function buildSiteFacts({ homepage, context, robotsResponse, sitemapResponse, crawlMeta, categories, psi, locale, legalRisk, signals = {} }) {
  const copy = copyFor(locale);
  const usesHttps = new URL(homepage.url).protocol === 'https:';
  return {
    businessType: context.businessType,
    primaryService: context.primaryService,
    targetRegion: context.targetRegion,
    title: homepage.title || copy.labels.notFound,
    metaDescription: homepage.metaDescription || copy.labels.notFound,
    h1: homepage.h1First || copy.labels.notFound,
    words: homepage.wordCount,
    images: homepage.images,
    imagesWithoutAlt: homepage.imagesWithoutAlt,
    scripts: homepage.scripts,
    usesHttps,
    hasSchema: homepage.hasSchema,
    hasRobots: !!robotsResponse && robotsResponse.status < 400,
    hasSitemap: !!sitemapResponse && sitemapResponse.status < 400,
    lang: homepage.lang || copy.labels.notSpecified,
    lastModified: homepage.lastModified || copy.labels.notAvailable,
    pagesCrawled: crawlMeta.visitedPages,
    crawlTarget: crawlMeta.plannedPages,
    psiAvailable: !!psi.available,
    psiPerformance: psi.available ? (psi.scores?.performance ?? copy.labels.notAvailable) : copy.labels.notAvailable,
    trackingDetected: !!signals.trackingDetected,
    cookieBannerSignal: !!signals.consentBannerDetected,
    consentSettingsSignal: !!signals.consentSettingsDetected,
    legalRiskLevel: legalRisk?.level || 'low',
    legalRiskLabel: legalRisk?.label || copy.labels.riskLow,
    categoryScores: categories.map((c) => ({ id: c.id, title: c.title, score: c.score }))
  };
}

function buildLimitations({ locale, partial, timedOut, psiAvailable }) {
  const copy = copyFor(locale);
  const limitations = [copy.limitations.base, copy.limitations.a11y, copy.limitations.legal];
  if (partial) limitations.push(copy.limitations.partial);
  if (timedOut) limitations.push(copy.limitations.timeout);
  if (!psiAvailable) limitations.push(copy.limitations.psiUnavailable);
  return limitations;
}

function aggregateOverallScore(categories) {
  return Math.round(categories.reduce((sum, category) => sum + (category.score * category.weight), 0));
}

function mergeScannedPages(crawlPages = [], forcedPages = []) {
  const merged = [];
  const seen = new Set();

  for (const page of crawlPages) {
    const url = String(page?.url || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    merged.push({
      url,
      status: page.status,
      loadTimeMs: page.loadTimeMs,
      title: page.title || '',
      source: 'crawl',
      legalType: hasLegalSignal(url, 'impressum')
        ? 'impressum'
        : (hasLegalSignal(url, 'privacy') ? 'privacy' : null)
    });
  }

  for (const page of forcedPages) {
    const url = String(page?.url || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    merged.push({
      url,
      status: page.status,
      loadTimeMs: page.loadTimeMs,
      title: page.title || '',
      source: page.source || 'legal_forced',
      legalType: page.legalType || null
    });
  }

  return merged;
}

function mergeFailedTargets(crawlFailures = [], forcedFailures = []) {
  const merged = [];
  const seen = new Set();

  for (const entry of crawlFailures) {
    const url = String(entry?.url || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    merged.push({
      url,
      message: entry?.message || 'failed'
    });
  }

  for (const entry of forcedFailures) {
    const url = String(entry?.url || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    merged.push({
      url,
      message: entry?.message || 'failed'
    });
  }

  return merged;
}

function clampGuideText(value = '', maxChars = 12000) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars)}...` : cleaned;
}

function buildInternalGuideInput({ analyzedPages = [] } = {}) {
  return {
    pageAnalyses: analyzedPages.map((page) => ({
      url: page.url,
      status: page.status,
      title: page.title || '',
      metaDescription: page.metaDescription || '',
      h1: page.h1First || '',
      h1Count: page.h1Count || 0,
      wordCount: page.wordCount || 0,
      bodyText: clampGuideText(page.bodyText || ''),
      hasSchema: !!page.hasSchema,
      hasFaqSchema: !!page.hasFaqSchema,
      hasOrganizationSchema: !!page.hasOrganizationSchema,
      hasLocalBusinessSchema: !!page.hasLocalBusinessSchema,
      hasOpenGraph: !!page.hasOpenGraph,
      hasTwitterCard: !!page.hasTwitterCard,
      hasContactLink: !!page.hasContactLink,
      hasPhone: !!page.hasPhone,
      hasEmail: !!page.hasEmail,
      hasAddressSignal: !!page.hasAddressSignal,
      hasMain: !!page.hasMain,
      hasHeader: !!page.hasHeader,
      hasFooter: !!page.hasFooter,
      hasNav: !!page.hasNav,
      images: page.images || 0,
      imagesWithoutAlt: page.imagesWithoutAlt || 0,
      labels: page.labels || 0,
      inputs: page.inputs || 0,
      buttons: page.buttons || 0,
      scripts: page.scripts || 0,
      stylesheets: page.stylesheets || 0,
      loadTimeMs: page.loadTimeMs || 0
    }))
  };
}

export function toPublicAuditResult(result = {}) {
  if (!result || typeof result !== 'object') return result;
  const {
    internalGuideInput,
    ...publicResult
  } = result;
  return publicResult;
}

async function crawlWebsite(startUrl, locale, deadline, maxCrawlPages) {
  const pages = [];
  const queue = [];
  const queuedSet = new Set();
  const visited = new Set();
  const failures = [];

  const firstPage = await fetchPage(startUrl, deadline, locale);
  const normalizedHost = normalizeHost(new URL(firstPage.finalUrl).hostname);

  pages.push(firstPage);
  visited.add(firstPage.finalUrl);

  const firstLinks = extractInternalLinks(firstPage.html, firstPage.finalUrl, normalizedHost)
    .filter((link) => !visited.has(link));

  for (const link of firstLinks) {
    if (queue.length >= maxCrawlPages) break;
    if (!queuedSet.has(link)) {
      queuedSet.add(link);
      queue.push(link);
    }
  }

  while (pages.length < maxCrawlPages && queue.length && deadline.hasTime(1_000)) {
    const nextUrl = queue.shift();
    if (!nextUrl || visited.has(nextUrl)) continue;

    try {
      const nextPage = await fetchPage(nextUrl, deadline, locale);
      visited.add(nextPage.finalUrl);
      pages.push(nextPage);

      const links = extractInternalLinks(nextPage.html, nextPage.finalUrl, normalizedHost);
      for (const link of links) {
        if (pages.length + queue.length >= maxCrawlPages) break;
        if (!visited.has(link) && !queuedSet.has(link)) {
          queuedSet.add(link);
          queue.push(link);
        }
      }
    } catch (error) {
      failures.push({ url: nextUrl, message: error.message || 'failed' });
    }
  }

  return {
    pages,
    failures,
    timedOut: !deadline.hasTime(250),
    plannedPages: maxCrawlPages,
    visitedPages: pages.length
  };
}

export async function auditWebsite({ url, locale = 'de', mode = 'deep', maxSubpages = DEFAULT_MAX_SUBPAGES, context = {} }) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);
  const deadline = new Deadline(AUDIT_TIMEOUT_MS);
  const clampedMaxSubpages = clampMaxSubpages(maxSubpages);
  const maxCrawlPages = clampedMaxSubpages + 1;
  const safeContext = validateAuditContext(context, lng);

  const normalizedUrl = ensureUrl(url, lng);
  const auditId = randomUUID();

  let crawl;
  try {
    crawl = await crawlWebsite(normalizedUrl, lng, deadline, maxCrawlPages);
  } catch (error) {
    const status = error.status || 502;
    const message = error.code === 'AUDIT_TIMEOUT'
      ? copy.errors.timeout
      : (error.message || copy.errors.unreachable);
    const wrapped = new Error(message);
    wrapped.status = status;
    throw wrapped;
  }

  if (!crawl.pages.length) {
    const error = new Error(copy.errors.unreachable);
    error.status = 502;
    throw error;
  }

  const homepageRaw = crawl.pages[0];
  const homepage = parsePageSignals(homepageRaw);
  const analyzedPages = crawl.pages.map(parsePageSignals);

  const finalUrl = homepageRaw.finalUrl;
  const finalOrigin = `${new URL(finalUrl).protocol}//${new URL(finalUrl).host}`;

  const [robotsResponse, sitemapResponse, psi] = await Promise.all([
    fetchOptionalText(`${finalOrigin}/robots.txt`, deadline, lng),
    fetchOptionalText(`${finalOrigin}/sitemap.xml`, deadline, lng),
    fetchPageSpeedData(finalUrl, deadline)
  ]);
  const resolvedLegalPages = await resolveLegalPages({
    finalOrigin,
    analyzedPages,
    deadline,
    locale: lng
  });

  const categoryResult = buildCategoryResults({
    locale: lng,
    context: safeContext,
    homepage,
    analyzedPages,
    robotsResponse,
    sitemapResponse,
    psi,
    crawlMeta: crawl,
    legalPagesResolved: resolvedLegalPages
  });
  const categories = categoryResult.categories;
  const rawOverallScore = aggregateOverallScore(categories);
  const cappedScore = applyScoreCaps(rawOverallScore, categoryResult.scoringCaps);
  const overallScore = cappedScore.finalScore;
  const criticalBlockers = [...(categoryResult.legalRisk?.blockers || [])];
  if (categoryResult.seoIntentFailures >= 3) {
    criticalBlockers.push('critical_seo_geo_intent_gap');
  }
  const scoreBand = normalizeScoreBandWithBlockers(overallScore, criticalBlockers);
  const highlights = buildHighlights(categories);

  const topIssues = highlights.topActions.slice(0, 3).map((item) => item.label || item.text).filter(Boolean);
  const domain = normalizeHost(new URL(finalUrl).hostname);
  const scannedPages = mergeScannedPages(analyzedPages, resolvedLegalPages.forcedScannedPages || []);
  const failedScanTargets = mergeFailedTargets(crawl.failures || [], resolvedLegalPages.forcedFailedTargets || []);

  const result = {
    auditId,
    mode: mode === 'deep' ? 'deep' : 'deep',
    locale: lng,
    inputUrl: url,
    context: safeContext,
    normalizedUrl,
    finalUrl,
    fetchedAt: new Date().toISOString(),
    httpStatus: homepageRaw.status,
    loadTimeMs: homepageRaw.loadTimeMs,
    crawlStats: {
      visitedPages: crawl.visitedPages,
      plannedPages: crawl.plannedPages,
      failedPages: crawl.failures.length,
      timeoutReached: crawl.timedOut
    },
    scannedPages,
    failedScanTargets,
    config: {
      maxSubpages: clampedMaxSubpages
    },
    overallScore,
    scoreBand,
    overallTone: scoreBand,
    overallBadge: badgeForScore(overallScore, lng),
    summary: buildOverallSummary(overallScore, lng),
    scoring: {
      rawScore: rawOverallScore,
      finalScore: overallScore,
      penalty: cappedScore.penalty,
      caps: (categoryResult.scoringCaps || []).map((cap) => ({
        key: cap.key,
        maxScore: cap.maxScore,
        reason: cap.reason,
        applied: rawOverallScore > cap.maxScore
      })),
      penalties: (categoryResult.scoringCaps || [])
        .filter((cap) => rawOverallScore > cap.maxScore)
        .map((cap) => ({
          key: cap.key,
          type: 'cap',
          reason: cap.reason,
          impact: Math.max(0, rawOverallScore - Math.min(rawOverallScore, cap.maxScore))
        }))
    },
    relevance: categoryResult.relevance,
    legalRisk: {
      ...categoryResult.legalRisk,
      criticalBlockers
    },
    categories,
    topFindings: highlights.topFindings,
    topActions: highlights.topActions,
    strengths: highlights.strengths,
    priorities: highlights.topActions,
    siteFacts: buildSiteFacts({
      homepage,
      context: safeContext,
      robotsResponse,
      sitemapResponse,
      crawlMeta: crawl,
      categories,
      psi,
      locale: lng,
      legalRisk: categoryResult.legalRisk,
      signals: categoryResult.signals
    }),
    limitations: buildLimitations({
      locale: lng,
      partial: crawl.failures.length > 0,
      timedOut: crawl.timedOut,
      psiAvailable: psi.available
    }),
    cta: buildCta({
      overallScore,
      locale: lng,
      auditId,
      domain,
      scoreBand,
      topIssues
    }),
    internalGuideInput: buildInternalGuideInput({
      analyzedPages
    }),
    // Raw robots.txt body, surfaced for downstream tester-specific checks
    // (e.g. GEO tester parses it for LLM user-agent directives). null when
    // the file was unreachable.
    rawRobotsText: typeof robotsResponse?.data === 'string' ? robotsResponse.data : null,
    finalOrigin
  };

  setCachedResult(result);
  return result;
}

export const __testables = {
  ensureUrl,
  clampMaxSubpages,
  validateAuditContext,
  applyScoreCaps,
  normalizeScoreBand,
  normalizeScoreBandWithBlockers,
  aggregateOverallScore,
  toneForScore,
  localeFrom,
  tokenCoverage,
  rangeScore
};
