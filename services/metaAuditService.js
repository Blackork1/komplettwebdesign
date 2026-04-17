import axios from 'axios';
import { randomUUID } from 'crypto';

const USER_AGENT = 'KomplettWebdesign Meta Tester/2.0 (+https://komplettwebdesign.de)';
const DEFAULT_MAX_SUBPAGES = 5;
const MIN_MAX_SUBPAGES = 1;
const MAX_MAX_SUBPAGES = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONTEXT_LENGTH = 140;

const metaAuditCache = new Map();

const I18N = {
  de: {
    errors: {
      emptyUrl: 'Bitte gib eine Website-Adresse ein.',
      invalidUrl: 'Die eingegebene URL ist ungültig. Bitte prüfe die Domain.',
      invalidProtocol: 'Bitte nutze eine URL mit http oder https.',
      unreachable: 'Die Website konnte nicht geladen werden. Bitte prüfe Domain, SSL oder Erreichbarkeit.',
      contextRequired: 'Bitte ergänze Branche, Hauptleistung und Zielregion für den Meta-Check.'
    },
    labels: {
      good: 'gut',
      medium: 'mittel',
      critical: 'kritisch'
    },
    badges: {
      strong: 'Stark',
      medium: 'Optimierung nötig',
      critical: 'Kritisch'
    }
  },
  en: {
    errors: {
      emptyUrl: 'Please enter a website URL.',
      invalidUrl: 'The provided URL is invalid. Please check the domain.',
      invalidProtocol: 'Please use an http or https URL.',
      unreachable: 'The website could not be loaded. Please check domain, SSL, or availability.',
      contextRequired: 'Please provide business type, primary service, and target region for the meta check.'
    },
    labels: {
      good: 'good',
      medium: 'medium',
      critical: 'critical'
    },
    badges: {
      strong: 'Strong',
      medium: 'Needs optimization',
      critical: 'Critical'
    }
  }
};

const SERP_CHAR_WIDTH_PX = {
  a: 7.4,
  b: 7.6,
  c: 7,
  d: 7.6,
  e: 7.2,
  f: 4.4,
  g: 7.6,
  h: 7.4,
  i: 3.2,
  j: 3.4,
  k: 7,
  l: 3.2,
  m: 11.2,
  n: 7.4,
  o: 7.4,
  p: 7.6,
  q: 7.6,
  r: 4.6,
  s: 6.8,
  t: 4.4,
  u: 7.4,
  v: 6.9,
  w: 10.2,
  x: 6.8,
  y: 6.8,
  z: 6.6,
  '0': 7.4,
  '1': 6.1,
  '2': 7.1,
  '3': 7.1,
  '4': 7.4,
  '5': 7.1,
  '6': 7.2,
  '7': 6.9,
  '8': 7.2,
  '9': 7.2,
  ' ': 3.4,
  '-': 4.5,
  '|': 3.2,
  '/': 4.4,
  '&': 7.7,
  ':': 3.6,
  '.': 3.1,
  ',': 3.1,
  '+': 7,
  '?': 6.9,
  '!': 3.6,
  '(': 4.2,
  ')': 4.2
};

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function copyFor(locale) {
  return I18N[localeFrom(locale)];
}

function clampMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function normalizeContext(rawContext = {}) {
  return {
    businessType: String(rawContext?.businessType || '').trim().slice(0, MAX_CONTEXT_LENGTH),
    primaryService: String(rawContext?.primaryService || '').trim().slice(0, MAX_CONTEXT_LENGTH),
    targetRegion: String(rawContext?.targetRegion || '').trim().slice(0, MAX_CONTEXT_LENGTH)
  };
}

function ensureContext(context = {}, locale = 'de') {
  const normalized = normalizeContext(context);
  if (!normalized.businessType || !normalized.primaryService || !normalized.targetRegion) {
    const copy = copyFor(locale);
    const error = new Error(copy.errors.contextRequired);
    error.status = 400;
    throw error;
  }
  return normalized;
}

function sanitizeText(value = '') {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    const error = new Error(copy.errors.invalidProtocol);
    error.status = 400;
    throw error;
  }

  parsed.hash = '';
  parsed.search = '';
  parsed.pathname = '/';
  return parsed.toString();
}

function firstMatch(html = '', regex, group = 1) {
  const match = regex.exec(html);
  return match ? sanitizeText(match[group] || '') : '';
}

function allMatches(html = '', regex, mapper = (match) => match[1]) {
  const output = [];
  let match = regex.exec(html);
  while (match) {
    output.push(mapper(match));
    match = regex.exec(html);
  }
  return output;
}

function headPart(html = '') {
  const match = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  return match ? match[1] : '';
}

function bodyPart(html = '') {
  const match = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return match ? match[1] : html;
}

function tokenize(value = '') {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function tokenCoverage(text = '', tokens = []) {
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) return 0;
  const haystack = new Set(tokenize(text));
  if (!haystack.size) return 0;
  const hits = uniqueTokens.filter((token) => haystack.has(token)).length;
  return hits / uniqueTokens.length;
}

function average(values = []) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function textLengthInfo(value = '', { idealMin = 0, idealMax = Number.MAX_SAFE_INTEGER, softMin = idealMin, softMax = idealMax } = {}) {
  const length = String(value || '').trim().length;
  if (!length) {
    return { length: 0, status: 'critical' };
  }
  if (length >= idealMin && length <= idealMax) {
    return { length, status: 'good' };
  }
  if (length >= softMin && length <= softMax) {
    return { length, status: 'medium' };
  }
  return { length, status: 'critical' };
}

function estimatePixels(text = '') {
  return Math.round(
    [...String(text || '')].reduce((sum, char) => {
      const lower = char.toLowerCase();
      if (SERP_CHAR_WIDTH_PX[char] != null) return sum + SERP_CHAR_WIDTH_PX[char];
      if (SERP_CHAR_WIDTH_PX[lower] != null) return sum + SERP_CHAR_WIDTH_PX[lower];
      if (/[A-Z]/.test(char)) return sum + 8.3;
      return sum + 7.2;
    }, 0)
  );
}

function pixelStatus(pixels = 0, { idealMax = Number.MAX_SAFE_INTEGER, softMax = idealMax + 80 } = {}) {
  if (!Number.isFinite(pixels) || pixels <= 0) return 'critical';
  if (pixels <= idealMax) return 'good';
  if (pixels <= softMax) return 'medium';
  return 'critical';
}

function toTone(score = 0) {
  if (score >= 80) return 'good';
  if (score >= 55) return 'medium';
  return 'critical';
}

function absoluteUrl(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function normalizeForCompare(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return String(url || '').replace(/\/$/, '');
  }
}

function sameHost(a, b) {
  try {
    return new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, '');
  } catch {
    return false;
  }
}

function extractLinks(html = '', pageUrl = '', rootUrl = '') {
  const links = allMatches(html, /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>/gi, (match) => match[1]);
  const filtered = links
    .map((href) => absoluteUrl(pageUrl, href))
    .filter(Boolean)
    .filter((href) => /^https?:/i.test(href))
    .filter((href) => sameHost(href, rootUrl))
    .filter((href) => !/\.(pdf|jpg|jpeg|png|svg|webp|gif|zip|js|css|xml|json)(\?|$)/i.test(href));

  return [...new Set(filtered)];
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 12000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml'
    },
    validateStatus: (status) => status >= 200 && status < 400
  });

  const html = typeof response.data === 'string' ? response.data : '';
  return {
    html,
    finalUrl: response.request?.res?.responseUrl || url,
    status: response.status
  };
}

function statusScore(status = 'critical') {
  if (status === 'good') return 100;
  if (status === 'medium') return 62;
  return 20;
}

function evaluateTextIntentFit({ title = '', description = '', h1 = '', context = {} }) {
  const tokens = [
    ...tokenize(context.businessType),
    ...tokenize(context.primaryService),
    ...tokenize(context.targetRegion)
  ];

  const uniqueTokens = [...new Set(tokens)];
  if (!uniqueTokens.length) {
    return {
      score: 0,
      status: 'medium',
      detail: 'n/a',
      titleCoverage: 0,
      descriptionCoverage: 0,
      h1Coverage: 0
    };
  }

  const titleCoverage = tokenCoverage(title, uniqueTokens);
  const descriptionCoverage = tokenCoverage(description, uniqueTokens);
  const h1Coverage = tokenCoverage(h1, uniqueTokens);
  const weighted = average([
    titleCoverage * 1.25,
    descriptionCoverage,
    h1Coverage * 0.9
  ]) / 1.05;
  const score = Math.max(0, Math.min(100, Math.round(weighted * 100)));

  if (score >= 58) {
    return {
      score,
      status: 'good',
      detail: `${score}/100`,
      titleCoverage,
      descriptionCoverage,
      h1Coverage
    };
  }
  if (score >= 34) {
    return {
      score,
      status: 'medium',
      detail: `${score}/100`,
      titleCoverage,
      descriptionCoverage,
      h1Coverage
    };
  }

  return {
    score,
    status: 'critical',
    detail: `${score}/100`,
    titleCoverage,
    descriptionCoverage,
    h1Coverage
  };
}

function normalizeStatus(status = '') {
  if (status === 'good' || status === 'medium' || status === 'critical') return status;
  return 'critical';
}

function relCount(headHtml = '', relValue = '') {
  if (!relValue) return 0;
  const regex = new RegExp(`<link\\s+[^>]*rel=["'][^"']*${relValue}[^"']*["'][^>]*>`, 'gi');
  return allMatches(headHtml, regex, () => 1).length;
}

function parseHeadSignals({ html = '', url = '', locale = 'de', context = {} }) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);
  const normalizedContext = normalizeContext(context);
  const headHtml = headPart(html);
  const bodyHtml = bodyPart(html);
  const bodyText = stripHtml(bodyHtml);

  const title = firstMatch(headHtml, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = firstMatch(
    headHtml,
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
  ) || firstMatch(
    headHtml,
    /<meta\s+[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i
  );

  const h1 = firstMatch(bodyHtml, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Count = allMatches(bodyHtml, /<h1\b[^>]*>/gi, () => 1).length;
  const canonical = firstMatch(headHtml, /<link\s+[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const robots = firstMatch(headHtml, /<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const charset = firstMatch(headHtml, /<meta\s+[^>]*charset=["']?([^"'\s>]+)["']?[^>]*>/i);
  const viewport = firstMatch(headHtml, /<meta\s+[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const themeColor = firstMatch(headHtml, /<meta\s+[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["'][^>]*>/i);

  const ogTitle = firstMatch(headHtml, /<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i);
  const ogDescription = firstMatch(headHtml, /<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i);
  const ogImage = firstMatch(headHtml, /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogUrl = firstMatch(headHtml, /<meta\s+[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogType = firstMatch(headHtml, /<meta\s+[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogSiteName = firstMatch(headHtml, /<meta\s+[^>]*property=["']og:site_name["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i);
  const ogLocale = firstMatch(headHtml, /<meta\s+[^>]*property=["']og:locale["'][^>]*content=["']([^"']+)["'][^>]*>/i);

  const twitterCard = firstMatch(headHtml, /<meta\s+[^>]*name=["']twitter:card["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const twitterTitle = firstMatch(headHtml, /<meta\s+[^>]*name=["']twitter:title["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i);
  const twitterDescription = firstMatch(headHtml, /<meta\s+[^>]*name=["']twitter:description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i);
  const twitterImage = firstMatch(headHtml, /<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const twitterSite = firstMatch(headHtml, /<meta\s+[^>]*name=["']twitter:site["'][^>]*content=["']([^"']+)["'][^>]*>/i);

  const iconHref = firstMatch(headHtml, /<link\s+[^>]*rel=["'](?:shortcut\s+icon|icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const appleTouchIcon = firstMatch(headHtml, /<link\s+[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const manifest = firstMatch(headHtml, /<link\s+[^>]*rel=["']manifest["'][^>]*href=["']([^"']+)["'][^>]*>/i);

  const jsonLdCount = allMatches(headHtml, /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>/gi, () => 1).length;
  const hreflangCount = allMatches(headHtml, /<link\s+[^>]*hreflang=["'][^"']+["'][^>]*>/gi, () => 1).length;
  const preloadCount = relCount(headHtml, 'preload');
  const preconnectCount = relCount(headHtml, 'preconnect');

  const titleInfo = textLengthInfo(title, {
    idealMin: 55,
    idealMax: 60,
    softMin: 50,
    softMax: 65
  });
  const descriptionInfo = textLengthInfo(description, {
    idealMin: 120,
    idealMax: 155,
    softMin: 100,
    softMax: 170
  });
  const h1Info = textLengthInfo(h1, {
    idealMin: 50,
    idealMax: 70,
    softMin: 1,
    softMax: 80
  });

  const titlePixels = estimatePixels(title);
  const descriptionPixels = estimatePixels(description);
  const titlePixelStatus = pixelStatus(titlePixels, { idealMax: 600, softMax: 680 });
  const descriptionPixelStatus = pixelStatus(descriptionPixels, { idealMax: 920, softMax: 1020 });

  const intentFit = evaluateTextIntentFit({
    title,
    description,
    h1,
    context: normalizedContext
  });

  const checks = [
    {
      id: 'title_length',
      label: 'Title Length',
      status: titleInfo.status,
      detail: lng === 'en'
        ? `${titleInfo.length} chars (ideal 55-60, acceptable 50-60)`
        : `${titleInfo.length} Zeichen (ideal 55-60, akzeptabel 50-60)`
    },
    {
      id: 'title_pixels',
      label: 'Title Pixel Width',
      status: normalizeStatus(titlePixelStatus),
      detail: `${titlePixels}px / 600px`
    },
    {
      id: 'meta_description',
      label: 'Meta Description',
      status: descriptionInfo.status,
      detail: lng === 'en'
        ? `${descriptionInfo.length} chars (recommended 120-155)`
        : `${descriptionInfo.length} Zeichen (empfohlen 120-155)`
    },
    {
      id: 'description_pixels',
      label: 'Description Pixel Width',
      status: normalizeStatus(descriptionPixelStatus),
      detail: `${descriptionPixels}px / 920px`
    },
    {
      id: 'h1',
      label: 'H1 Heading',
      status: h1Count === 1 && h1Info.status !== 'critical'
        ? h1Info.status
        : h1Count > 1
          ? 'critical'
          : h1Info.status,
      detail: lng === 'en'
        ? `${h1Info.length} chars, ${h1Count} H1 (ideal 50-70, max 80)`
        : `${h1Info.length} Zeichen, ${h1Count}x H1 (ideal 50-70, max 80)`
    },
    {
      id: 'directives',
      label: 'Directives & Canonical',
      status: canonical && robots && viewport && charset ? 'good' : canonical && viewport ? 'medium' : 'critical',
      detail: [
        canonical ? 'canonical' : '',
        robots ? 'robots' : '',
        viewport ? 'viewport' : '',
        charset ? 'charset' : ''
      ].filter(Boolean).join(' + ') || '-'
    },
    {
      id: 'open_graph',
      label: 'Open Graph',
      status: ogTitle && ogDescription && ogImage && ogUrl && ogType ? 'good' : (ogTitle || ogDescription || ogImage ? 'medium' : 'critical'),
      detail: [
        ogTitle ? 'title' : '',
        ogDescription ? 'description' : '',
        ogImage ? 'image' : '',
        ogUrl ? 'url' : '',
        ogType ? 'type' : ''
      ].filter(Boolean).join(', ') || '-'
    },
    {
      id: 'twitter',
      label: 'Twitter Cards',
      status: twitterCard && (twitterTitle || ogTitle) && (twitterDescription || ogDescription) && (twitterImage || ogImage)
        ? 'good'
        : (twitterCard || twitterTitle || twitterDescription ? 'medium' : 'critical'),
      detail: [
        twitterCard ? `card:${twitterCard}` : '',
        twitterTitle ? 'title' : '',
        twitterDescription ? 'description' : '',
        twitterImage ? 'image' : ''
      ].filter(Boolean).join(', ') || '-'
    },
    {
      id: 'icons',
      label: 'Icons & Manifest',
      status: iconHref && appleTouchIcon && manifest ? 'good' : (iconHref || appleTouchIcon ? 'medium' : 'critical'),
      detail: [
        iconHref ? 'favicon' : '',
        appleTouchIcon ? 'apple-touch-icon' : '',
        manifest ? 'manifest' : ''
      ].filter(Boolean).join(', ') || '-'
    },
    {
      id: 'structured_data',
      label: 'Structured Data',
      status: jsonLdCount >= 1 ? 'good' : 'medium',
      detail: lng === 'en' ? `${jsonLdCount} JSON-LD block(s)` : `${jsonLdCount} JSON-LD Block/Blöcke`
    },
    {
      id: 'hreflang',
      label: 'International Tags',
      status: hreflangCount >= 1 ? 'good' : 'medium',
      detail: hreflangCount >= 1
        ? (lng === 'en' ? `${hreflangCount} hreflang link(s)` : `${hreflangCount} hreflang-Link(s)`)
        : (lng === 'en' ? 'No hreflang links found' : 'Keine hreflang-Links gefunden')
    },
    {
      id: 'intent_fit',
      label: lng === 'en' ? 'Industry/Region Fit' : 'Branchen-/Regions-Fit',
      status: intentFit.status,
      detail: lng === 'en'
        ? `Title/Description/H1 fit score: ${intentFit.score}/100`
        : `Title/Description/H1-Fit-Score: ${intentFit.score}/100`
    },
    {
      id: 'head_tech',
      label: 'Head Technical Completeness',
      status: themeColor && preconnectCount >= 1 && preloadCount >= 1 ? 'good' : (preconnectCount >= 1 || preloadCount >= 1 ? 'medium' : 'critical'),
      detail: lng === 'en'
        ? `theme-color:${themeColor ? 'yes' : 'no'}, preconnect:${preconnectCount}, preload:${preloadCount}`
        : `theme-color:${themeColor ? 'ja' : 'nein'}, preconnect:${preconnectCount}, preload:${preloadCount}`
    }
  ];

  const weightedChecks = [
    ['title_length', 1.1],
    ['title_pixels', 0.9],
    ['meta_description', 1.1],
    ['description_pixels', 0.8],
    ['h1', 0.9],
    ['directives', 1],
    ['open_graph', 1],
    ['twitter', 0.8],
    ['icons', 0.8],
    ['structured_data', 0.6],
    ['hreflang', 0.45],
    ['intent_fit', 1.25],
    ['head_tech', 0.7]
  ];

  const score = Math.max(
    0,
    Math.round(
      weightedChecks.reduce((sum, [id, weight]) => {
        const check = checks.find((item) => item.id === id);
        return sum + (statusScore(check?.status) * weight);
      }, 0) / weightedChecks.reduce((sum, [, weight]) => sum + weight, 0)
    )
  );

  const recommendations = [];
  const pushRecommendation = (condition, deText, enText) => {
    if (!condition) return;
    recommendations.push(lng === 'en' ? enText : deText);
  };

  pushRecommendation(
    titleInfo.status !== 'good' || titlePixelStatus !== 'good',
    'Title auf 55-60 Zeichen und maximal 600px bringen. Wichtigstes Keyword möglichst am Anfang platzieren.',
    'Adjust title to 55-60 characters and max 600px. Put the primary keyword near the beginning.'
  );
  pushRecommendation(
    descriptionInfo.status !== 'good' || descriptionPixelStatus !== 'good',
    'Meta-Description auf 120-155 Zeichen und max. 920px optimieren. Nutzenversprechen + klare Handlungsaufforderung ergänzen.',
    'Optimize the meta description to 120-155 characters and max 920px. Add value proposition and clear CTA.'
  );
  pushRecommendation(
    h1Count !== 1 || h1Info.status === 'critical',
    'Genau eine prägnante H1 verwenden (ideal 50-70 Zeichen, maximal 80).',
    'Use exactly one concise H1 (ideal 50-70 chars, max 80).'
  );
  pushRecommendation(
    !canonical || !robots || !viewport || !charset,
    'Canonical, Robots, Viewport und Charset im Head vollständig setzen, damit Suchmaschinen und Browser eindeutige Signale erhalten.',
    'Add complete canonical, robots, viewport, and charset tags in the head for clear crawler and browser signals.'
  );
  pushRecommendation(
    !(ogTitle && ogDescription && ogImage && ogUrl && ogType),
    'Open Graph vollständig ergänzen (og:title, og:description, og:image, og:url, og:type) für stabile Social Snippets.',
    'Complete Open Graph tags (og:title, og:description, og:image, og:url, og:type) for reliable social previews.'
  );
  pushRecommendation(
    !(twitterCard && (twitterTitle || ogTitle) && (twitterDescription || ogDescription) && (twitterImage || ogImage)),
    'Twitter/X Cards ergänzen (twitter:card, twitter:title, twitter:description, twitter:image).',
    'Add Twitter/X card tags (twitter:card, twitter:title, twitter:description, twitter:image).'
  );
  pushRecommendation(
    !(iconHref && appleTouchIcon && manifest),
    'Favicon, Apple-Touch-Icon und Manifest ergänzen, damit Browser, PWA und Geräte-Icons korrekt angezeigt werden.',
    'Add favicon, apple-touch-icon, and manifest to improve browser/PWA/device icon rendering.'
  );
  pushRecommendation(
    jsonLdCount < 1,
    'Mindestens einen JSON-LD-Block ergänzen (z. B. Organization oder WebPage), damit Suchmaschinen Entitäten besser verstehen.',
    'Add at least one JSON-LD block (e.g., Organization or WebPage) for stronger entity understanding.'
  );
  pushRecommendation(
    intentFit.status !== 'good',
    'Title, Description und H1 stärker auf Branche, Hauptleistung und Zielregion ausrichten, damit Suchintents klar getroffen werden.',
    'Align title, description, and H1 more strongly with industry, primary service, and target region.'
  );

  const topFindings = checks
    .filter((item) => item.status !== 'good')
    .slice(0, 8)
    .map((item) => ({
      category: lng === 'en' ? 'Header Meta' : 'Header Meta',
      label: item.label,
      text: item.detail
    }));

  const topActions = recommendations.slice(0, 8).map((entry) => ({
    category: lng === 'en' ? 'Meta Optimization' : 'Meta-Optimierung',
    label: entry,
    text: entry
  }));

  const categoryMap = [
    {
      id: 'snippet',
      title: lng === 'en' ? 'SERP snippet fit' : 'SERP-Snippet-Fit',
      weight: 1,
      detailIds: ['title_length', 'title_pixels', 'meta_description', 'description_pixels', 'h1']
    },
    {
      id: 'directives',
      title: lng === 'en' ? 'Directives & crawl control' : 'Direktiven & Crawl-Steuerung',
      weight: 1,
      detailIds: ['directives', 'hreflang', 'structured_data']
    },
    {
      id: 'social',
      title: lng === 'en' ? 'Social preview tags' : 'Social-Preview-Tags',
      weight: 1,
      detailIds: ['open_graph', 'twitter']
    },
    {
      id: 'assets',
      title: lng === 'en' ? 'Icons and technical head assets' : 'Icons und technische Head-Assets',
      weight: 1,
      detailIds: ['icons', 'head_tech']
    },
    {
      id: 'intent',
      title: lng === 'en' ? 'Industry/region relevance' : 'Branchen-/Regions-Relevanz',
      weight: 1,
      detailIds: ['intent_fit']
    }
  ];

  const categories = categoryMap.map((group) => {
    const groupChecks = checks.filter((item) => group.detailIds.includes(item.id));
    const groupScore = Math.round(average(groupChecks.map((item) => statusScore(item.status))));
    return {
      id: group.id,
      title: group.title,
      score: Number.isFinite(groupScore) ? groupScore : 0,
      tone: copy.labels[toTone(groupScore)] || toTone(groupScore),
      badge: Number.isFinite(groupScore)
        ? groupScore >= 80
          ? (lng === 'en' ? 'Strong' : 'Stark')
          : groupScore >= 55
            ? (lng === 'en' ? 'Needs optimization' : 'Optimierung nötig')
            : (lng === 'en' ? 'Critical' : 'Kritisch')
        : (lng === 'en' ? 'N/A' : 'k. A.'),
      details: groupChecks.map((item) => ({
        label: item.label,
        status: item.status === 'good' ? 'ok' : 'review',
        explanation: item.detail,
        action: topActions.find((action) => action.label.includes(item.label) || action.text.includes(item.label))?.text || '',
        value: item.detail
      }))
    };
  });

  const wordCount = stripHtml(bodyText).split(/\s+/).filter(Boolean).length;

  const pageGuideInput = {
    url,
    title,
    metaDescription: description,
    h1,
    bodyText: bodyText.slice(0, 5000),
    wordCount,
    h1Count,
    hasMain: /<main\b/i.test(bodyHtml),
    hasHeader: /<header\b/i.test(bodyHtml),
    hasFooter: /<footer\b/i.test(bodyHtml),
    hasNav: /<nav\b/i.test(bodyHtml),
    hasSchema: jsonLdCount > 0,
    hasContactLink: /(href=["'][^"']*(kontakt|contact|anfrage|booking|termin)[^"']*["'])/i.test(bodyHtml),
    hasPhone: /(\+\d[\d\s()/.-]{6,}|tel:)/i.test(bodyHtml),
    hasEmail: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(bodyHtml),
    buttons: allMatches(bodyHtml, /<(button|a)\b[^>]*(class=["'][^"']*(btn|button)[^"']*["'])?[^>]*>/gi, () => 1).length,
    scripts: allMatches(html, /<script\b[^>]*>/gi, () => 1).length,
    stylesheets: allMatches(headHtml, /<link\s+[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi, () => 1).length
  };

  return {
    url,
    score,
    tone: copy.labels[toTone(score)] || toTone(score),
    title,
    titleLength: titleInfo.length,
    titlePixels,
    description,
    metaDescription: description,
    descriptionLength: descriptionInfo.length,
    descriptionPixels,
    h1,
    h1Length: h1Info.length,
    h1Count,
    canonical,
    robots,
    meta: {
      charset,
      viewport,
      themeColor,
      hreflangCount,
      jsonLdCount,
      preloadCount,
      preconnectCount
    },
    og: {
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      url: ogUrl,
      type: ogType,
      siteName: ogSiteName,
      locale: ogLocale
    },
    twitter: {
      card: twitterCard,
      title: twitterTitle,
      description: twitterDescription,
      image: twitterImage,
      site: twitterSite
    },
    icons: {
      favicon: iconHref,
      appleTouchIcon,
      manifest
    },
    contextFit: {
      score: intentFit.score,
      status: intentFit.status,
      titleCoverage: Math.round(intentFit.titleCoverage * 100),
      descriptionCoverage: Math.round(intentFit.descriptionCoverage * 100),
      h1Coverage: Math.round(intentFit.h1Coverage * 100)
    },
    checks,
    categories,
    topFindings,
    topActions,
    recommendations,
    pageGuideInput
  };
}

function toScoreBand(score = 0) {
  if (score >= 80) return 'good';
  if (score >= 55) return 'medium';
  return 'critical';
}

function toLegacyBand(scoreBand = 'critical') {
  if (scoreBand === 'good') return 'gut';
  if (scoreBand === 'medium') return 'mittel';
  return 'kritisch';
}

function buildPublicResult({
  auditId,
  locale,
  requestedUrl,
  finalUrl,
  homepage,
  crawl,
  maxSubpages,
  discoveredSubpages,
  context
}) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);
  const scoreBand = toScoreBand(homepage.score);
  return {
    auditId,
    locale: lng,
    requestedUrl,
    finalUrl,
    fetchedAt: new Date().toISOString(),
    context: normalizeContext(context),
    metaScore: {
      overall: homepage.score,
      tone: copy.labels[scoreBand] || scoreBand,
      badge: scoreBand === 'good' ? copy.badges.strong : scoreBand === 'medium' ? copy.badges.medium : copy.badges.critical
    },
    homepage,
    categories: homepage.categories || [],
    topFindings: homepage.topFindings || [],
    topActions: homepage.topActions || [],
    crawlStats: {
      requestedPages: maxSubpages,
      visitedPages: crawl.visitedPages,
      failedPages: crawl.failedPages
    },
    discoveredSubpages: discoveredSubpages.slice(0, 5),
    lockedDetailedReport: true
  };
}

function buildDetailedResult({
  publicResult,
  normalizedUrl,
  finalUrl,
  context,
  requestedMaxSubpages,
  homepage,
  scannedPages
}) {
  const scoreBand = toScoreBand(publicResult.metaScore?.overall || homepage.score || 0);
  return {
    source: 'meta',
    reportProfile: 'meta',
    auditId: publicResult.auditId,
    locale: publicResult.locale,
    normalizedUrl,
    finalUrl,
    requestedMaxSubpages,
    context: normalizeContext(context),
    summary: publicResult.homepage?.recommendations?.[0]
      || (publicResult.locale === 'en'
        ? 'Header metadata has optimization potential for SEO and social snippets.'
        : 'Die Header-Metadaten haben Optimierungspotenzial für SEO und Social Snippets.'),
    overallScore: publicResult.metaScore?.overall || homepage.score || 0,
    scoreBand: toLegacyBand(scoreBand),
    homepage,
    scannedPages,
    topFindings: publicResult.topFindings || [],
    topActions: publicResult.topActions || [],
    categories: publicResult.categories || [],
    strengths: (homepage.checks || [])
      .filter((item) => item.status === 'good')
      .slice(0, 8)
      .map((item) => ({
        category: publicResult.locale === 'en' ? 'Header Meta' : 'Header Meta',
        label: item.label,
        text: item.detail
      })),
    crawlStats: publicResult.crawlStats,
    metaScore: publicResult.metaScore,
    siteFacts: {
      pagesCrawled: publicResult.crawlStats?.visitedPages || 0,
      crawlTarget: publicResult.crawlStats?.requestedPages || requestedMaxSubpages,
      domain: (() => {
        try {
          return new URL(finalUrl).hostname;
        } catch {
          return finalUrl;
        }
      })()
    },
    relevance: {
      seoGeoScore: homepage.contextFit?.score || 0,
      valueScore: homepage.score || 0,
      intentMatchScore: homepage.contextFit?.score || 0
    },
    scoring: {
      rawScore: homepage.score || 0,
      finalScore: homepage.score || 0,
      penalty: 0,
      caps: [],
      penalties: []
    },
    legalRisk: {
      level: publicResult.locale === 'en' ? 'No legal analysis in Meta tester' : 'Keine Rechtsanalyse im Meta-Tester',
      label: publicResult.locale === 'en' ? 'Not included in this test' : 'In diesem Test nicht enthalten',
      reasons: [],
      blockers: []
    },
    internalGuideInput: {
      pageAnalyses: [homepage.pageGuideInput, ...scannedPages.map((page) => page.pageGuideInput)].filter(Boolean)
    },
    fetchedAt: publicResult.fetchedAt
  };
}

function cleanupCache(now = Date.now()) {
  for (const [key, value] of metaAuditCache.entries()) {
    if (!value || value.expiresAt <= now) {
      metaAuditCache.delete(key);
    }
  }
}

function setCached(auditId, publicResult, detailedResult) {
  cleanupCache();
  metaAuditCache.set(auditId, {
    publicResult,
    detailedResult,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

export function getCachedMetaAuditResult(auditId) {
  if (!auditId) return null;
  cleanupCache();
  const cached = metaAuditCache.get(auditId);
  return cached?.detailedResult || null;
}

export async function auditMetaWebsite({
  url,
  locale = 'de',
  maxSubpages = DEFAULT_MAX_SUBPAGES,
  context = {}
} = {}) {
  const lng = localeFrom(locale);
  const normalizedUrl = ensureUrl(url, lng);
  const normalizedContext = ensureContext(context, lng);
  const effectiveMaxSubpages = clampMaxSubpages(maxSubpages);
  const auditId = randomUUID();

  let homepageResponse;
  try {
    homepageResponse = await fetchHtml(normalizedUrl);
  } catch (_error) {
    const copy = copyFor(lng);
    const error = new Error(copy.errors.unreachable);
    error.status = 502;
    throw error;
  }

  const fetchedRoot = ensureUrl(homepageResponse.finalUrl || normalizedUrl, lng);
  let homepageResponseRoot = homepageResponse;

  if (normalizeForCompare(homepageResponse.finalUrl || normalizedUrl) !== normalizeForCompare(fetchedRoot)) {
    homepageResponseRoot = await fetchHtml(fetchedRoot);
  }

  const homepageAnalysis = parseHeadSignals({
    html: homepageResponseRoot.html,
    url: fetchedRoot,
    locale: lng,
    context: normalizedContext
  });

  const queue = extractLinks(homepageResponseRoot.html, fetchedRoot, fetchedRoot);
  const visited = new Set([normalizeForCompare(fetchedRoot)]);
  const scannedSubpages = [];
  let failedPages = 0;

  while (queue.length && scannedSubpages.length < effectiveMaxSubpages) {
    const next = queue.shift();
    const key = normalizeForCompare(next);
    if (visited.has(key)) continue;
    visited.add(key);

    try {
      const page = await fetchHtml(next);
      const parsed = parseHeadSignals({
        html: page.html,
        url: page.finalUrl || next,
        locale: lng,
        context: normalizedContext
      });
      scannedSubpages.push(parsed);

      const links = extractLinks(page.html, page.finalUrl || next, fetchedRoot);
      links.forEach((link) => {
        const linkKey = normalizeForCompare(link);
        if (!visited.has(linkKey) && queue.length < effectiveMaxSubpages * 10) {
          queue.push(link);
        }
      });
    } catch {
      failedPages += 1;
    }
  }

  const publicResult = buildPublicResult({
    auditId,
    locale: lng,
    requestedUrl: normalizedUrl,
    finalUrl: fetchedRoot,
    homepage: homepageAnalysis,
    crawl: {
      visitedPages: scannedSubpages.length + 1,
      failedPages
    },
    maxSubpages: effectiveMaxSubpages,
    discoveredSubpages: scannedSubpages.map((item) => ({
      url: item.url,
      score: item.score,
      title: item.title
    })),
    context: normalizedContext
  });

  const detailedResult = buildDetailedResult({
    publicResult,
    normalizedUrl,
    finalUrl: fetchedRoot,
    context: normalizedContext,
    requestedMaxSubpages: effectiveMaxSubpages,
    homepage: homepageAnalysis,
    scannedPages: scannedSubpages
  });

  setCached(auditId, publicResult, detailedResult);
  return publicResult;
}

export const __testables = {
  localeFrom,
  clampMaxSubpages,
  ensureUrl,
  normalizeContext,
  textLengthInfo,
  estimatePixels,
  evaluateTextIntentFit,
  parseHeadSignals
};
