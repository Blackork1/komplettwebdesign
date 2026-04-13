import { auditWebsite } from './websiteAuditService.js';

const DEFAULT_MAX_SUBPAGES = 5;
const MIN_MAX_SUBPAGES = 1;
const MAX_MAX_SUBPAGES = 20;
const DEFAULT_SCAN_MODE = 'maximal';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const SEO_SCAN_MODE_PROFILES = {
  schnell: {
    maxSubpagesCap: 4
  },
  balanced: {
    maxSubpagesCap: 9
  },
  maximal: {
    maxSubpagesCap: 20
  }
};

const CATEGORY_LABELS = {
  de: {
    onpage: 'OnPage-Struktur (Title, Meta, H1, Canonical)',
    indexing: 'Indexierungs-Signale (robots, sitemap, Statuscodes)',
    technical: 'Technik & Ladezeit',
    content: 'Content-Qualität und Intent-Fit',
    internal_linking: 'Interne Verlinkung und Crawl-Tiefe',
    structured_data: 'Strukturierte Daten und Snippet-Signale'
  },
  en: {
    onpage: 'On-page structure (title, meta, H1, canonical)',
    indexing: 'Indexing signals (robots, sitemap, status)',
    technical: 'Technical quality and speed',
    content: 'Content quality and intent fit',
    internal_linking: 'Internal linking and crawl depth',
    structured_data: 'Structured data and snippet signals'
  }
};

const I18N = {
  de: {
    potential: {
      strongHeadline: 'Sehr solide SEO-Basis erkannt',
      mediumHeadline: 'SEO-Potenzial klar erkennbar',
      weakHeadline: 'Hohes SEO-Optimierungspotenzial',
      strongText: 'Die wichtigsten SEO-Grundsignale sind bereits gut aufgestellt. Mit gezielten Optimierungen lässt sich die Sichtbarkeit weiter ausbauen.',
      mediumText: 'Es gibt mehrere Bereiche mit spürbarem SEO-Verbesserungspotenzial.',
      weakText: 'Aktuell fehlen wichtige SEO-Grundsignale. Eine strukturierte Umsetzung kann die Auffindbarkeit deutlich steigern.'
    }
  },
  en: {
    potential: {
      strongHeadline: 'Very solid SEO baseline detected',
      mediumHeadline: 'Clear SEO optimization potential',
      weakHeadline: 'High SEO optimization potential',
      strongText: 'Core SEO signals are already in good shape. Focused improvements can further increase discoverability.',
      mediumText: 'Several areas show clear SEO improvement potential.',
      weakText: 'Important SEO baseline signals are currently missing. Structured implementation can significantly improve discoverability.'
    }
  }
};

const seoAuditCache = new Map();

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function clampMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function clampSeoScanMode(rawValue) {
  const mode = String(rawValue || '').trim().toLowerCase();
  return SEO_SCAN_MODE_PROFILES[mode] ? mode : DEFAULT_SCAN_MODE;
}

function modeProfile(mode) {
  const effectiveMode = clampSeoScanMode(mode);
  return {
    mode: effectiveMode,
    profile: SEO_SCAN_MODE_PROFILES[effectiveMode]
  };
}

function cleanupSeoAuditCache(now = Date.now()) {
  for (const [key, value] of seoAuditCache.entries()) {
    if (!value || value.expiresAt <= now) {
      seoAuditCache.delete(key);
    }
  }
}

function setCachedSeoAudit(auditId, publicResult, detailedResult) {
  cleanupSeoAuditCache();
  seoAuditCache.set(auditId, {
    publicResult,
    detailedResult,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

export function getCachedSeoAuditResult(auditId) {
  if (!auditId) return null;
  cleanupSeoAuditCache();
  const cached = seoAuditCache.get(auditId);
  return cached?.detailedResult || null;
}

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function average(values = []) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function scoreFromDetailQuality(details = [], predicate) {
  const selected = details
    .filter((item) => predicate(String(item?.label || '').toLowerCase()))
    .map((item) => {
      if (Number.isFinite(item?.qualityScore)) return clampPercent(item.qualityScore * 100);
      return item?.passed ? 100 : 0;
    });
  return average(selected);
}

function categoryById(result = {}, id) {
  return (result.categories || []).find((item) => item.id === id);
}

function buildCategoryScores(sourceResult = {}) {
  const seoCategory = categoryById(sourceResult, 'seo');
  const technicalCategory = categoryById(sourceResult, 'technical');
  const valueCategory = categoryById(sourceResult, 'value');
  const crawl = sourceResult.crawlStats || {};
  const seoDetails = Array.isArray(seoCategory?.details) ? seoCategory.details : [];
  const technicalDetails = Array.isArray(technicalCategory?.details) ? technicalCategory.details : [];
  const valueDetails = Array.isArray(valueCategory?.details) ? valueCategory.details : [];

  const onpageScore = scoreFromDetailQuality(
    seoDetails,
    (label) => /title|meta|h1|canonical/.test(label)
  );

  const indexingScore = scoreFromDetailQuality(
    seoDetails,
    (label) => /robots|sitemap|index|statuscode|status code/.test(label)
  );

  const structuredDataScore = scoreFromDetailQuality(
    seoDetails,
    (label) => /schema|faq|snippet|structured/.test(label)
  );

  const internalLinkingScore = scoreFromDetailQuality(
    technicalDetails,
    (label) => /internal linking|interne verlinkung|crawl depth|crawl-tiefe|crawl depth/.test(label)
  );

  const contentScore = scoreFromDetailQuality(
    valueDetails,
    (label) => /content|service clarity|leistung|benefit|nutzen|intent/.test(label)
  );

  const crawlCoverage = Number.isFinite(crawl.visitedPages) && Number.isFinite(crawl.plannedPages) && crawl.plannedPages > 0
    ? clampPercent((crawl.visitedPages / crawl.plannedPages) * 100)
    : null;

  return [
    { id: 'onpage', score: clampPercent(onpageScore ?? seoCategory?.score ?? sourceResult.overallScore) },
    { id: 'indexing', score: clampPercent(indexingScore ?? sourceResult.relevance?.seoGeoScore ?? seoCategory?.score) },
    { id: 'technical', score: clampPercent(technicalCategory?.score ?? sourceResult.overallScore) },
    { id: 'content', score: clampPercent(contentScore ?? valueCategory?.score ?? sourceResult.overallScore) },
    { id: 'internal_linking', score: clampPercent(internalLinkingScore ?? crawlCoverage ?? technicalCategory?.score ?? sourceResult.overallScore) },
    { id: 'structured_data', score: clampPercent(structuredDataScore ?? sourceResult.relevance?.seoGeoScore ?? seoCategory?.score ?? sourceResult.overallScore) }
  ];
}

function buildPotentialSummary(sourceResult = {}, categoryScores = [], locale = 'de') {
  const lng = localeFrom(locale);
  const copy = I18N[lng];
  const labels = CATEGORY_LABELS[lng];
  const score = Number.isFinite(sourceResult.overallScore) ? sourceResult.overallScore : 0;

  let headline = copy.potential.mediumHeadline;
  let text = copy.potential.mediumText;
  if (score >= 75) {
    headline = copy.potential.strongHeadline;
    text = copy.potential.strongText;
  } else if (score < 45) {
    headline = copy.potential.weakHeadline;
    text = copy.potential.weakText;
  }

  const topPotentialAreas = [...categoryScores]
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
    .slice(0, 3)
    .map((entry) => labels[entry.id] || entry.id);

  return {
    headline,
    text,
    topPotentialAreas
  };
}

function buildPublicSeoResult({ sourceResult, locale, scanMode, requestedMaxSubpages, effectiveMaxSubpages }) {
  const crawl = sourceResult.crawlStats || {};
  const partial = !!crawl.timeoutReached
    || (Number.isFinite(crawl.failedPages) && crawl.failedPages > 0)
    || (Number.isFinite(crawl.visitedPages)
      && Number.isFinite(crawl.plannedPages)
      && crawl.visitedPages < crawl.plannedPages);

  const categoryScores = buildCategoryScores(sourceResult);
  return {
    auditId: sourceResult.auditId,
    locale,
    normalizedUrl: sourceResult.normalizedUrl,
    finalUrl: sourceResult.finalUrl,
    fetchedAt: sourceResult.fetchedAt,
    scanMode,
    crawlStats: {
      plannedPages: crawl.plannedPages,
      visitedPages: crawl.visitedPages,
      failedPages: crawl.failedPages,
      partial,
      timeoutReached: !!crawl.timeoutReached
    },
    seoScore: {
      overall: sourceResult.overallScore,
      band: sourceResult.scoreBand,
      badge: sourceResult.overallBadge
    },
    categoryScores,
    potentialSummary: buildPotentialSummary(sourceResult, categoryScores, locale),
    limitations: (sourceResult.limitations || []).slice(0, 6),
    lockedDetailedReport: true,
    config: {
      requestedMaxSubpages,
      effectiveMaxSubpages
    }
  };
}

export async function auditSeoWebsite({
  url,
  locale = 'de',
  maxSubpages = DEFAULT_MAX_SUBPAGES,
  scanMode = DEFAULT_SCAN_MODE,
  context = {}
} = {}) {
  const lng = localeFrom(locale);
  const requestedMaxSubpages = clampMaxSubpages(maxSubpages);
  const { mode, profile } = modeProfile(scanMode);
  const effectiveMaxSubpages = Math.max(1, Math.min(requestedMaxSubpages, profile.maxSubpagesCap));

  const sourceResult = await auditWebsite({
    url,
    locale: lng,
    mode: 'deep',
    maxSubpages: effectiveMaxSubpages,
    context
  });

  const publicResult = buildPublicSeoResult({
    sourceResult,
    locale: lng,
    scanMode: mode,
    requestedMaxSubpages,
    effectiveMaxSubpages
  });

  const detailedResult = {
    source: 'seo',
    scanMode: mode,
    requestedMaxSubpages,
    effectiveMaxSubpages,
    categoryScores: publicResult.categoryScores,
    seoScore: publicResult.seoScore,
    sourceResult
  };

  setCachedSeoAudit(sourceResult.auditId, publicResult, detailedResult);
  return publicResult;
}

export const __testables = {
  localeFrom,
  clampMaxSubpages,
  clampSeoScanMode,
  modeProfile,
  buildCategoryScores,
  buildPotentialSummary
};

