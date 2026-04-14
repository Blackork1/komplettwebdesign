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

function normalizeSeoResult(rawResult = {}) {
  const sourceResult = (rawResult?.sourceResult && typeof rawResult.sourceResult === 'object')
    ? rawResult.sourceResult
    : rawResult;

  return {
    ...sourceResult,
    reportProfile: 'seo',
    seoCategoryScores: Array.isArray(rawResult?.categoryScores) ? rawResult.categoryScores : [],
    seoPotentialSummary: rawResult?.potentialSummary || null
  };
}

export function buildSeoTesterReport({ lead = {}, result = {}, locale = 'de' } = {}) {
  const lng = localeFrom(locale || lead.locale);
  const normalizedResult = normalizeSeoResult(result);
  const report = buildWebsiteTesterReport({
    lead,
    result: normalizedResult,
    locale: lng
  });

  const domainSlug = slugifyDomain(extractDomain(lead, normalizedResult));
  const suffix = lng === 'en' ? 'seo-audit-report' : 'seo-audit-report';

  return {
    ...report,
    filename: `${domainSlug}-${suffix}.pdf`
  };
}

export const __testables = {
  localeFrom,
  slugifyDomain,
  normalizeSeoResult
};
