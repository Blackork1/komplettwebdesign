// helpers/testerSeoExtra.js
//
// Ersetzt die 5 quasi-identischen build*SeoExtra-Funktionen im testController.js.
// Erzeugt hreflang-Tags, Open-Graph-Tags, Twitter-Card-Tags und
// strukturierte Daten (WebSite, WebPage, WebApplication, Breadcrumb, FAQ,
// optional Organization) für die Tester-Landingpages.

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

/**
 * Erzeugt den SEO-Extra-HTML-Block für eine Tester-Seite.
 *
 * @param {Object}  args
 * @param {string}  args.base         Basis-URL, z.B. https://komplettwebdesign.de
 * @param {string}  args.canonical    Canonical der aktuellen Seite
 * @param {Object}  args.copy         i18n-Objekt mit pageName, ogTitle, ogDescription,
 *                                    schemaDescription, localeCode, inLanguage, altPath,
 *                                    breadcrumb, faq (Array von {q, a}), xDefault (string), ogImage (optional)
 * @param {'de'|'en'} args.locale     Aktueller Locale-Code
 * @param {string}  args.appName      Name der WebApplication (z.B. "Komplett Webdesign SEO Tester")
 * @returns {string} HTML-Fragment (Meta, Link, Script-Tags)
 */
export function buildTesterSeoExtra({ base, canonical, copy, locale, appName }) {
  const alternateUrl = `${base}${copy.altPath}`;
  const xDefault = copy.xDefault || canonical;
  const ogImage = copy.ogImage
    ? (copy.ogImage.startsWith('http') ? copy.ogImage : `${base}${copy.ogImage}`)
    : `${base}/images/heroBg.webp`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: copy.breadcrumb[0],
        item: base
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.breadcrumb[1],
        item: canonical
      }
    ]
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Komplett Webdesign',
    url: base,
    inLanguage: copy.inLanguage,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.pageName,
    description: copy.schemaDescription,
    url: canonical,
    inLanguage: copy.inLanguage,
    isPartOf: {
      '@type': 'WebSite',
      url: base,
      name: 'Komplett Webdesign'
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbSchema.itemListElement
    },
    primaryImageOfPage: ogImage
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: appName,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: copy.inLanguage,
    url: canonical,
    description: copy.schemaDescription,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR'
    }
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (copy.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Komplett Webdesign',
    url: base,
    logo: `${base}/images/logo.png`,
    sameAs: [
      'https://www.google.com/search?q=komplett+webdesign'
    ]
  };

  return `
    <link rel="alternate" hreflang="${copy.localeCode}" href="${canonical}">
    <link rel="alternate" hreflang="${locale === 'en' ? 'de-DE' : 'en-US'}" href="${alternateUrl}">
    <link rel="alternate" hreflang="x-default" href="${xDefault}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="${copy.localeCode}">
    <meta property="og:title" content="${copy.ogTitle}">
    <meta property="og:description" content="${copy.ogDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${copy.ogTitle}">
    <meta name="twitter:description" content="${copy.ogDescription}">
    ${jsonLd(websiteSchema)}
    ${jsonLd(webPageSchema)}
    ${jsonLd(appSchema)}
    ${jsonLd(breadcrumbSchema)}
    ${jsonLd(faqSchema)}
    ${jsonLd(orgSchema)}
  `;
}

export default buildTesterSeoExtra;
