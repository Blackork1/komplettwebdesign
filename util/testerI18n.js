/**
 * Tiny, dependency-free i18n helper for the tester controller's inline error
 * messages.
 *
 * Motivation: `testController.js` had a dozen inline `locale === 'en' ? ... : ...`
 * ternaries for things like "The X audit could not be completed." / "Das X-Audit
 * konnte nicht durchgeführt werden." — each one is a small string but they
 * multiplied the risk of a typo asymmetry between DE and EN. A lookup table
 * centralises them.
 *
 * Not a replacement for the rich I18N bundles in the individual lead services
 * (those are large enough to justify their own structure). This helper only
 * covers the common short error / fallback strings shared by the tester
 * controller endpoints.
 */

const MESSAGES = Object.freeze({
  'audit.website.failed': {
    de: 'Das Website-Audit konnte nicht durchgeführt werden.',
    en: 'The website audit could not be completed.'
  },
  'audit.seo.failed': {
    de: 'Das SEO-Audit konnte nicht durchgeführt werden.',
    en: 'The SEO audit could not be completed.'
  },
  'audit.geo.failed': {
    de: 'Das GEO-Audit konnte nicht durchgeführt werden.',
    en: 'The GEO audit could not be completed.'
  },
  'audit.meta.failed': {
    de: 'Der Meta-Audit konnte nicht durchgeführt werden.',
    en: 'The meta audit could not be completed.'
  },
  'audit.brokenLinks.failed': {
    de: 'Der Broken-Link-Scan konnte nicht durchgeführt werden.',
    en: 'The broken-link scan could not be completed.'
  },
  'report.request.failed': {
    de: 'Die Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The report request could not be processed.'
  },
  'report.geo.request.failed': {
    de: 'Die GEO-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The GEO report request could not be processed.'
  },
  'report.seo.request.failed': {
    de: 'Die SEO-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The SEO report request could not be processed.'
  },
  'report.meta.request.failed': {
    de: 'Die Meta-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The meta report request could not be processed.'
  },
  'report.brokenLinks.request.failed': {
    de: 'Die Broken-Links-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The broken-links report request could not be processed.'
  }
});

/**
 * Look up a translated string by key. Falls back to the key itself in
 * development (so missing-translation bugs are obvious) and to the German
 * string in production (so users never see raw keys).
 *
 * @param {string} key     - dotted key into MESSAGES, e.g. 'audit.seo.failed'
 * @param {'de'|'en'} locale
 * @returns {string}
 */
export function t(key, locale) {
  const entry = MESSAGES[key];
  if (!entry) {
    if (process.env.NODE_ENV !== 'production') return `[missing:${key}]`;
    return '';
  }
  const lng = locale === 'en' ? 'en' : 'de';
  return entry[lng] || entry.de || '';
}

/**
 * Normalize an arbitrary input to a supported locale string.
 * @param {unknown} raw
 * @returns {'de'|'en'}
 */
export function toLocale(raw) {
  return raw === 'en' ? 'en' : 'de';
}

export const __testables = { MESSAGES };
