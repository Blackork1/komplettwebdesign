// helpers/testerI18n.js
//
// Minimaler i18n-Helper für Fehler-Messages der Tester-Controller.
// Ersetzt verstreute Ternary-Operatoren à la
//   locale === 'en' ? 'The SEO audit...' : 'Das SEO-Audit...'
// und macht Texte wartbar.

const DICTIONARY = {
  'tester.website.error': {
    de: 'Die Analyse konnte nicht durchgeführt werden.',
    en: 'The website audit could not be completed.'
  },
  'tester.seo.error': {
    de: 'Das SEO-Audit konnte nicht durchgeführt werden.',
    en: 'The SEO audit could not be completed.'
  },
  'tester.geo.error': {
    de: 'Das GEO-Audit konnte nicht durchgeführt werden.',
    en: 'The GEO audit could not be completed.'
  },
  'tester.meta.error': {
    de: 'Der Meta-Audit konnte nicht durchgeführt werden.',
    en: 'The meta audit could not be completed.'
  },
  'tester.brokenLinks.error': {
    de: 'Der Broken-Link-Scan konnte nicht durchgeführt werden.',
    en: 'The broken-link scan could not be completed.'
  },
  'tester.website.lead.error': {
    de: 'Die Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The report request could not be processed.'
  },
  'tester.seo.lead.error': {
    de: 'Die SEO-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The SEO report request could not be processed.'
  },
  'tester.geo.lead.error': {
    de: 'Die GEO-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The GEO report request could not be processed.'
  },
  'tester.meta.lead.error': {
    de: 'Die Meta-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The meta report request could not be processed.'
  },
  'tester.brokenLinks.lead.error': {
    de: 'Die Broken-Link-Report-Anfrage konnte nicht verarbeitet werden.',
    en: 'The broken-link report request could not be processed.'
  },
  'tester.cachedNotFound': {
    de: 'Audit wurde nicht gefunden oder ist abgelaufen.',
    en: 'Audit was not found or has expired.'
  },
  'tester.consent': {
    de: 'Ich stimme zu, den angeforderten Report per E-Mail zu erhalten, den Newsletter zu abonnieren und habe die Datenschutzerklärung zur Kenntnis genommen.',
    en: 'I agree to receive the requested report by email, subscribe to the newsletter, and I have read the privacy policy.'
  }
};

export function t(key, locale = 'de') {
  const lng = locale === 'en' ? 'en' : 'de';
  const entry = DICTIONARY[key];
  if (!entry) return key;
  return entry[lng] || entry.de || key;
}

export default t;
