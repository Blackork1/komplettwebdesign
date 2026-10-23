import { SITE_FACTS } from './siteFacts.js';

const baseOf = baseUrl => String(baseUrl || SITE_FACTS.baseUrlFallback).replace(/\/+$/, '');

export function buildOrganizationSchema(baseUrl) {
  const base = baseOf(baseUrl);
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ProfessionalService'],
    '@id': `${base}/#organization`,
    name: SITE_FACTS.brandName,
    legalName: SITE_FACTS.legalName,
    url: `${base}/`,
    logo: { '@type': 'ImageObject', url: `${base}/images/LogoTransparent.webp` },
    telephone: SITE_FACTS.phone,
    email: SITE_FACTS.email,
    address: { '@type': 'PostalAddress', ...SITE_FACTS.address },
    hasMap: SITE_FACTS.addressMapUrl,
    sameAs: [SITE_FACTS.googleProfileUrl, ...SITE_FACTS.socialProfiles],
    founder: { '@id': `${base}/#person` },
    areaServed: [{ '@type': 'City', name: 'Berlin' }, { '@type': 'State', name: 'Brandenburg' }],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: SITE_FACTS.phone,
      email: SITE_FACTS.email,
      contactType: 'customer service',
      availableLanguage: ['de', 'en']
    }
  };
}

export function buildPersonSchema(baseUrl) {
  const base = baseOf(baseUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${base}/#person`,
    name: SITE_FACTS.founderName,
    url: `${base}/about`,
    image: `${base}/images/meinAvatar.webp`,
    jobTitle: 'Webdesigner und Webentwickler',
    worksFor: { '@id': `${base}/#organization` },
    knowsAbout: ['Webdesign', 'Webentwicklung', 'technische SEO', 'Local SEO'],
    knowsLanguage: ['de', 'en']
  };
}
