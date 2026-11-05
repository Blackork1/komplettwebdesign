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
    description: `Webdesign aus Berlin-Lichtenberg für kleine Unternehmen, Selbstständige und lokale Dienstleister: individuell programmierte Websites ohne Baukasten, Website-Pakete ${SITE_FACTS.priceRange}, persönlich umgesetzt von Inhaber ${SITE_FACTS.founderName}.`,
    url: `${base}/`,
    logo: { '@type': 'ImageObject', url: `${base}/images/LogoTransparent.webp` },
    image: `${base}/images/home-hero-sauber-desktop.webp`,
    foundingDate: SITE_FACTS.foundingYear,
    numberOfEmployees: { '@type': 'QuantitativeValue', value: 1 },
    knowsAbout: ['Webdesign', 'Webentwicklung', 'Website-Relaunch', 'Local SEO', 'Technische Suchmaschinenoptimierung', 'Barrierefreie Websites'],
    telephone: SITE_FACTS.phone,
    email: SITE_FACTS.email,
    address: { '@type': 'PostalAddress', ...SITE_FACTS.address },
    geo: { '@type': 'GeoCoordinates', ...SITE_FACTS.geo },
    hasMap: SITE_FACTS.googleProfileUrl,
    priceRange: SITE_FACTS.priceRange,
    openingHoursSpecification: SITE_FACTS.openingHours.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.days.map((day) => `https://schema.org/${day}`),
      opens: slot.opens,
      closes: slot.closes
    })),
    sameAs: [SITE_FACTS.googleProfileUrl, ...SITE_FACTS.socialProfiles],
    founder: { '@id': `${base}/#person` },
    // Angebotskatalog mit allen Paketen und Mindestpreisen auf /pakete (views/packages_list.ejs).
    hasOfferCatalog: { '@id': `${base}/pakete#katalog` },
    areaServed: [
      { '@type': 'City', name: 'Berlin' },
      ...SITE_FACTS.servedDistricts.map((district) => ({
        '@type': 'AdministrativeArea',
        name: `Berlin-${district.replace(' ', '-')}`,
        containedInPlace: { '@type': 'City', name: 'Berlin' }
      })),
      { '@type': 'State', name: 'Brandenburg' }
    ],
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
    givenName: 'Sören',
    familyName: 'Blocksdorf',
    url: `${base}/about`,
    mainEntityOfPage: `${base}/about`,
    image: `${base}/images/meinAvatar.webp`,
    description: `Webdesigner und Webentwickler aus Berlin, seit ${SITE_FACTS.workingSinceYear} im Webdesign tätig. Gründete ${SITE_FACTS.foundingYear} ${SITE_FACTS.brandName} und plant, gestaltet und programmiert Websites für kleine Unternehmen, Selbstständige und lokale Dienstleister persönlich, vom Erstgespräch bis nach dem Launch.`,
    jobTitle: 'Webdesigner und Webentwickler',
    worksFor: { '@id': `${base}/#organization` },
    knowsAbout: ['Webdesign', 'Webentwicklung', 'Website-Relaunch', 'technische SEO', 'Local SEO', 'Google-Unternehmensprofil', 'Barrierefreie Websites'],
    knowsLanguage: ['de', 'en'],
    sameAs: [...SITE_FACTS.founderProfiles]
  };
}
