import { buildWebsiteTesterReport } from './websiteTesterPdfService.js';

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function slugifyDomain(rawValue = '') {
  return String(rawValue || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'website';
}

function extractDomain(lead = {}, result = {}) {
  if (lead?.domain) return lead.domain;
  const candidate = result?.finalUrl || result?.normalizedUrl || '';
  try {
    return new URL(candidate).hostname || candidate;
  } catch {
    return String(candidate || '').slice(0, 180);
  }
}

function normalizeScoreBand(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'gut' || raw === 'good' || raw === 'strong') return 'gut';
  if (raw === 'mittel' || raw === 'medium' || raw.includes('optimization')) return 'mittel';
  return 'kritisch';
}

function toCategoryDetails(checks = []) {
  return checks.map((check) => ({
    label: check.label,
    status: check.status === 'good' ? 'ok' : 'review',
    explanation: check.detail,
    action: '',
    value: check.detail
  }));
}

function mapPage(page = {}) {
  return {
    url: page.url,
    title: page.title,
    metaDescription: page.metaDescription || page.description || '',
    h1: page.h1,
    bodyText: page.pageGuideInput?.bodyText || '',
    wordCount: page.pageGuideInput?.wordCount || 0,
    checks: page.checks || [],
    categories: page.categories || []
  };
}

function normalizeMetaResult(rawResult = {}) {
  const homepage = rawResult.homepage || {};
  const scannedPages = Array.isArray(rawResult.scannedPages) ? rawResult.scannedPages : [];
  const pages = [homepage, ...scannedPages].filter(Boolean).map(mapPage);

  const categories = Array.isArray(rawResult.categories) && rawResult.categories.length
    ? rawResult.categories
    : [
      {
        id: 'header_meta',
        title: 'Header Meta Checks',
        score: rawResult.metaScore?.overall || homepage.score || 0,
        details: toCategoryDetails(homepage.checks || [])
      }
    ];

  const topActionsSource = rawResult.topActions
    || (homepage.recommendations || []).map((entry) => ({
      category: 'Meta-Optimierung',
      label: entry,
      text: entry
    }));

  const topFindingsSource = rawResult.topFindings
    || (homepage.checks || [])
      .filter((entry) => entry.status !== 'good')
      .map((entry) => ({
        category: 'Header Meta',
        label: entry.label,
        text: entry.detail
      }));

  return {
    reportProfile: 'meta',
    source: 'meta',
    finalUrl: rawResult.finalUrl,
    normalizedUrl: rawResult.normalizedUrl,
    context: rawResult.context || {},
    summary: rawResult.summary || (rawResult.locale === 'en'
      ? 'Header metadata optimization potential detected.'
      : 'Optimierungspotenzial bei Header-Metadaten erkannt.'),
    overallScore: rawResult.metaScore?.overall || homepage.score || 0,
    scoreBand: normalizeScoreBand(rawResult.scoreBand || rawResult.metaScore?.tone || homepage.tone || 'mittel'),
    topActions: topActionsSource,
    topFindings: topFindingsSource,
    categories,
    strengths: (homepage.checks || [])
      .filter((entry) => entry.status === 'good')
      .slice(0, 6)
      .map((entry) => ({
        category: 'Header Meta',
        label: entry.label,
        text: entry.detail
      })),
    crawlStats: rawResult.crawlStats || {},
    siteFacts: {
      pagesCrawled: rawResult.crawlStats?.visitedPages || pages.length,
      crawlTarget: rawResult.crawlStats?.requestedPages || 5,
      domain: extractDomain({}, rawResult)
    },
    relevance: {
      seoGeoScore: homepage.contextFit?.score || 0,
      valueScore: rawResult.metaScore?.overall || homepage.score || 0,
      intentMatchScore: homepage.contextFit?.score || 0
    },
    scoring: {
      rawScore: rawResult.metaScore?.overall || homepage.score || 0,
      finalScore: rawResult.metaScore?.overall || homepage.score || 0,
      penalty: 0,
      caps: [],
      penalties: []
    },
    legalRisk: {
      level: rawResult.locale === 'en' ? 'Not included' : 'Nicht enthalten',
      label: rawResult.locale === 'en' ? 'No legal audit in meta test' : 'Kein Rechtsaudit im Meta-Test',
      reasons: [],
      blockers: []
    },
    scannedPages: pages
  };
}

export function buildMetaTesterReport({ lead = {}, result = {}, locale = 'de' } = {}) {
  const lng = localeFrom(locale || lead.locale);
  const normalizedResult = normalizeMetaResult(result);
  const report = buildWebsiteTesterReport({
    lead,
    result: normalizedResult,
    locale: lng
  });

  const domainSlug = slugifyDomain(extractDomain(lead, normalizedResult));
  return {
    ...report,
    filename: `${domainSlug}-meta-header-report.pdf`
  };
}
