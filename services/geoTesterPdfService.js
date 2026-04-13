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

function normalizeGeoResult(rawResult = {}) {
  if (rawResult?.sourceResult && typeof rawResult.sourceResult === 'object') {
    return rawResult.sourceResult;
  }
  return rawResult;
}

export function buildGeoTesterReport({ lead = {}, result = {}, locale = 'de' } = {}) {
  const lng = localeFrom(locale || lead.locale);
  const normalizedResult = normalizeGeoResult(result);
  const report = buildWebsiteTesterReport({
    lead,
    result: normalizedResult,
    locale: lng
  });

  const domainSlug = slugifyDomain(extractDomain(lead, normalizedResult));
  const suffix = lng === 'en' ? 'geo-optimization-report' : 'geo-optimierungsreport';

  return {
    ...report,
    filename: `${domainSlug}-${suffix}.pdf`
  };
}

export const __testables = {
  localeFrom,
  slugifyDomain,
  normalizeGeoResult
};
