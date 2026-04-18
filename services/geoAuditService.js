import { auditWebsite } from './websiteAuditService.js';
import { createAuditCache } from '../util/testerAuditCache.js';
import { runGeoSpecificChecks } from './geoSpecificChecks.js';

const DEFAULT_MAX_SUBPAGES = 5;
const MIN_MAX_SUBPAGES = 1;
const MAX_MAX_SUBPAGES = 20;
const DEFAULT_SCAN_MODE = 'maximal';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const GEO_SCAN_MODE_PROFILES = {
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

const I18N = {
  de: {
    potential: {
      strongHeadline: 'Solide GEO-Basis erkannt',
      mediumHeadline: 'GEO-Potenzial deutlich erkennbar',
      weakHeadline: 'Hohes GEO-Optimierungspotenzial',
      strongText: 'Deine Seite hat bereits gute Signale für GEO. Mit gezielten Maßnahmen kannst du die Sichtbarkeit in generativen Suchsystemen weiter ausbauen.',
      mediumText: 'Es gibt klare Verbesserungsfelder für GEO-Reichweite und semantische Auffindbarkeit.',
      weakText: 'Aktuell fehlen wichtige GEO-Signale. Mit einer strukturierten Umsetzung lässt sich die Sichtbarkeit deutlich steigern.'
    },
    potentialAreas: {
      seo: 'Semantische Auffindbarkeit und Entity-Signale',
      trust: 'Vertrauens- und Autoritätssignale',
      performance: 'Technische Auslieferung und Performance',
      accessibility: 'Struktur, Verständlichkeit und Zugänglichkeit',
      conversion: 'Intent-Fit und Handlungsführung',
      geo: 'GEO-Relevanz über zentrale Unterseiten'
    },
    genericAreaLabel: 'Hier besteht klares Optimierungspotenzial.'
  },
  en: {
    potential: {
      strongHeadline: 'Solid GEO baseline detected',
      mediumHeadline: 'Clear GEO optimization potential',
      weakHeadline: 'High GEO optimization potential',
      strongText: 'Your site already shows strong GEO signals. Focused improvements can further increase visibility in generative search experiences.',
      mediumText: 'There are clear opportunities to improve GEO reach and semantic discoverability.',
      weakText: 'Important GEO signals are currently missing. A structured implementation can significantly improve visibility.'
    },
    potentialAreas: {
      seo: 'Semantic discoverability and entity signals',
      trust: 'Trust and authority signals',
      performance: 'Technical delivery and performance',
      accessibility: 'Structure, clarity, and accessibility',
      conversion: 'Intent fit and user guidance',
      geo: 'GEO relevance across key subpages'
    },
    genericAreaLabel: 'This area shows clear optimization potential.'
  }
};

const geoAuditCache = createAuditCache({ ttlMs: CACHE_TTL_MS, label: 'geo' });

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function clampMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function clampGeoScanMode(rawValue) {
  const mode = String(rawValue || '').trim().toLowerCase();
  return GEO_SCAN_MODE_PROFILES[mode] ? mode : DEFAULT_SCAN_MODE;
}

function modeProfile(mode) {
  const effectiveMode = clampGeoScanMode(mode);
  return {
    mode: effectiveMode,
    profile: GEO_SCAN_MODE_PROFILES[effectiveMode]
  };
}

function setCachedGeoAudit(auditId, publicResult, detailedResult) {
  geoAuditCache.set(auditId, { publicResult, detailedResult });
}

export function getCachedGeoAuditResult(auditId) {
  const cached = geoAuditCache.get(auditId);
  return cached?.detailedResult || null;
}

function categoryScore(result, id) {
  const entry = (result.categories || []).find((item) => item.id === id);
  return Number.isFinite(entry?.score) ? entry.score : 0;
}

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function ratioPercent(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return clampPercent((part / total) * 100);
}

function signalQualityLabel(score, locale = 'de') {
  const lng = localeFrom(locale);
  if (score >= 75) return lng === 'en' ? 'strong' : 'stark';
  if (score >= 45) return lng === 'en' ? 'medium' : 'mittel';
  return lng === 'en' ? 'weak' : 'schwach';
}

function normalizeAreaKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildGeoSignals(result, locale = 'de', geoExtras = null) {
  const relevance = result.relevance || {};
  const facts = result.siteFacts || {};
  const crawlStats = result.crawlStats || {};

  const entitySchemaScore = clampPercent(
    ((facts.hasSchema ? 45 : 0)
      + (facts.hasRobots ? 20 : 0)
      + (facts.hasSitemap ? 20 : 0)
      + (facts.usesHttps ? 15 : 0))
  );

  const intentCoherenceScore = clampPercent(relevance.intentMatchScore);
  const faqSnippetReadinessScore = clampPercent(relevance.seoGeoScore);
  const trustCitationScore = clampPercent(categoryScore(result, 'trust'));
  const internalLinkingScore = ratioPercent(crawlStats.visitedPages || 0, crawlStats.plannedPages || 0);

  const signals = {
    entitySchema: {
      score: entitySchemaScore,
      quality: signalQualityLabel(entitySchemaScore, locale)
    },
    intentCoherence: {
      score: intentCoherenceScore,
      quality: signalQualityLabel(intentCoherenceScore, locale)
    },
    faqSnippetReadiness: {
      score: faqSnippetReadinessScore,
      quality: signalQualityLabel(faqSnippetReadinessScore, locale)
    },
    trustCitations: {
      score: trustCitationScore,
      quality: signalQualityLabel(trustCitationScore, locale)
    },
    internalLinking: {
      score: internalLinkingScore,
      quality: signalQualityLabel(internalLinkingScore, locale)
    }
  };

  // GEO-native signals derived from geoSpecificChecks. These replace what was
  // previously pure SEO-signal rebranding with actual AI-crawler / LLM-answer
  // readiness measurements.
  if (geoExtras) {
    // LLM access readiness — mix of llms.txt presence and how many of the tracked
    // LLM user agents are explicitly allowed (or not disallowed) by robots.txt.
    const llmAgents = geoExtras.llmAgents || {};
    const totalTracked = llmAgents.totalTracked || 1;
    const disallowed = llmAgents.disallowed || 0;
    const disallowRatio = Math.min(1, disallowed / totalTracked);
    const llmAccessBase = geoExtras.llmsTxt?.present ? 55 : 35;
    const llmAccessScore = clampPercent(Math.round(llmAccessBase + (1 - disallowRatio) * 45));
    signals.llmAccess = {
      score: llmAccessScore,
      quality: signalQualityLabel(llmAccessScore, locale),
      llmsTxtPresent: !!geoExtras.llmsTxt?.present,
      disallowedAgents: llmAgents.disallowedAgents || []
    };

    // Structured Q&A / Organization coverage across crawled pages — direct input
    // for how easily an LLM can cite or quote the site verbatim.
    const pages = Math.max(1, geoExtras.pagesAnalyzed || 0);
    const faqCoverage = Math.min(1, (geoExtras.perPageFaqCount || 0) / pages);
    const orgCoverage = Math.min(1, (geoExtras.orgSchemaCount || 0) / pages);
    const structuredQaScore = clampPercent(Math.round((faqCoverage * 60) + (orgCoverage * 40)));
    signals.structuredQa = {
      score: structuredQaScore,
      quality: signalQualityLabel(structuredQaScore, locale),
      faqPages: geoExtras.perPageFaqCount || 0,
      orgSchemaPages: geoExtras.orgSchemaCount || 0,
      totalPages: geoExtras.pagesAnalyzed || 0
    };
  }

  return signals;
}

function buildPotentialSummary(result, locale = 'de') {
  const lng = localeFrom(locale);
  const copy = I18N[lng];
  const score = Number.isFinite(result.overallScore) ? result.overallScore : 0;

  let headline = copy.potential.mediumHeadline;
  let text = copy.potential.mediumText;
  if (score >= 75) {
    headline = copy.potential.strongHeadline;
    text = copy.potential.strongText;
  } else if (score < 45) {
    headline = copy.potential.weakHeadline;
    text = copy.potential.weakText;
  }

  const categories = Array.isArray(result.categories) ? result.categories : [];
  const topActions = Array.isArray(result.topActions) ? result.topActions : [];
  const areaMap = copy.potentialAreas || {};
  const genericAreaLabel = copy.genericAreaLabel || '';
  const dedupe = new Set();

  const source = [];

  for (const category of categories
    .filter((item) => Number.isFinite(item?.score))
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))) {
    const key = normalizeAreaKey(category?.id || category?.category || '');
    if (!key) continue;
    const mapped = areaMap[key];
    if (!mapped || dedupe.has(mapped)) continue;
    dedupe.add(mapped);
    source.push({
      category: mapped,
      label: genericAreaLabel
    });
    if (source.length >= 5) break;
  }

  if (source.length < 5) {
    for (const action of topActions) {
      const key = normalizeAreaKey(action?.category || action?.categoryId || '');
      if (!key) continue;
      const mapped = areaMap[key] || String(action?.category || '').slice(0, 120);
      if (!mapped || dedupe.has(mapped)) continue;
      dedupe.add(mapped);
      source.push({
        category: mapped,
        label: genericAreaLabel
      });
      if (source.length >= 5) break;
    }
  }

  return {
    headline,
    text,
    topPotentials: source
  };
}

function buildPublicGeoResult({ sourceResult, locale, scanMode, requestedMaxSubpages, effectiveMaxSubpages, geoExtras = null }) {
  const crawl = sourceResult.crawlStats || {};
  const partial = !!crawl.timeoutReached
    || (Number.isFinite(crawl.failedPages) && crawl.failedPages > 0)
    || (Number.isFinite(crawl.visitedPages)
      && Number.isFinite(crawl.plannedPages)
      && crawl.visitedPages < crawl.plannedPages);

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
    geoScore: {
      overall: sourceResult.overallScore,
      band: sourceResult.scoreBand,
      badge: sourceResult.overallBadge
    },
    geoSignals: buildGeoSignals(sourceResult, locale, geoExtras),
    potentialSummary: buildPotentialSummary(sourceResult, locale),
    limitations: (sourceResult.limitations || []).slice(0, 6),
    lockedDetailedReport: true,
    geoExtras: geoExtras
      ? {
          llmsTxt: geoExtras.llmsTxt || { present: false },
          llmAgents: geoExtras.llmAgents || null,
          perPageFaqCount: geoExtras.perPageFaqCount || 0,
          orgSchemaCount: geoExtras.orgSchemaCount || 0,
          pagesAnalyzed: geoExtras.pagesAnalyzed || 0
        }
      : null,
    config: {
      requestedMaxSubpages,
      effectiveMaxSubpages
    }
  };
}

export async function auditGeoWebsite({
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

  // GEO-native checks: llms.txt presence + robots.txt LLM-UA parsing + per-page
  // FAQ / Organization schema coverage. Runs after the main audit so it can reuse
  // the already-fetched robots.txt body and analyzed-pages list. Failure here is
  // non-fatal — we fall back to the base SEO-style signals.
  let geoExtras = null;
  try {
    const analyzedPages = Array.isArray(sourceResult?.internalGuideInput?.pageAnalyses)
      ? sourceResult.internalGuideInput.pageAnalyses
      : [];
    geoExtras = await runGeoSpecificChecks({
      origin: sourceResult.finalOrigin || null,
      robotsText: sourceResult.rawRobotsText || null,
      analyzedPages
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[geoAudit] specific checks failed, falling back', err?.message);
  }

  const publicResult = buildPublicGeoResult({
    sourceResult,
    locale: lng,
    scanMode: mode,
    requestedMaxSubpages,
    effectiveMaxSubpages,
    geoExtras
  });

  const detailedResult = {
    source: 'geo',
    scanMode: mode,
    requestedMaxSubpages,
    effectiveMaxSubpages,
    geoSignals: publicResult.geoSignals,
    geoScore: publicResult.geoScore,
    sourceResult
  };

  setCachedGeoAudit(sourceResult.auditId, publicResult, detailedResult);
  return publicResult;
}

export const __testables = {
  localeFrom,
  clampMaxSubpages,
  clampGeoScanMode,
  modeProfile,
  buildGeoSignals,
  buildPotentialSummary,
  normalizeAreaKey
};
