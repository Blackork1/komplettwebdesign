const DEFAULT_OFFERS = [
  {
    name: 'Basis',
    price: '499.00',
    url: '/pakete/basis',
    description: 'Onepager mit Design, Texten und SEO-Grundoptimierung.'
  },
  {
    name: 'Business',
    price: '899.00',
    url: '/pakete/business',
    description: 'Mehrseitige Unternehmenswebsite mit Kontaktformular und On-Page-SEO.'
  },
  {
    name: 'Premium',
    price: '1499.00',
    url: '/pakete/premium',
    description: 'Umfangreiche Website mit Strategie, SEO und optionalen Funktionen.'
  }
];

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const base = normalizeBaseUrl(baseUrl);
  return `${base}${String(url).startsWith('/') ? '' : '/'}${url}`;
}

function toIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function decodeBasicEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function stripHtml(value) {
  return decodeBasicEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildIndustrySchemas({ industry = {}, url, baseUrl }) {
  const base = normalizeBaseUrl(baseUrl);
  const pageUrl = url || `${base}/branchen/webdesign-${industry.slug || ''}`;
  const orgId = `${base}/#organization`;
  const websiteId = `${base}/#website`;
  const pageId = `${pageUrl}#webpage`;
  const serviceId = `${pageUrl}#service`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const faqId = `${pageUrl}#faq`;
  const title = industry.title || `Webdesign für ${industry.name || 'Branchen'}`;
  const description = industry.description || `Website-Erstellung und SEO für ${industry.name || 'lokale Unternehmen'}.`;
  const image = toAbsoluteUrl(industry.og_image_url || industry.hero_image_url, base);
  const dateModified = toIsoDate(industry.updated_at);
  const faqItems = Array.isArray(industry.faq_items) ? industry.faq_items : [];

  const graph = [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: 'Komplett Webdesign',
      url: base,
      logo: `${base}/images/LogoTransparent.webp`
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: 'Komplett Webdesign',
      url: base,
      publisher: { '@id': orgId },
      inLanguage: 'de-DE'
    },
    {
      '@type': 'WebPage',
      '@id': pageId,
      url: pageUrl,
      name: title,
      description,
      isPartOf: { '@id': websiteId },
      about: { '@id': serviceId },
      breadcrumb: { '@id': breadcrumbId },
      inLanguage: 'de-DE',
      ...(dateModified ? { dateModified } : {}),
      ...(image ? { image: [image] } : {})
    },
    {
      '@type': 'Service',
      '@id': serviceId,
      name: `Webdesign für ${industry.name || 'lokale Unternehmen'}`,
      serviceType: `Website-Erstellung, SEO und Lead-Generierung für ${industry.name || 'lokale Unternehmen'}`,
      description,
      url: pageUrl,
      provider: { '@id': orgId },
      areaServed: {
        '@type': 'City',
        name: 'Berlin'
      },
      audience: {
        '@type': 'BusinessAudience',
        audienceType: industry.name || 'Kleine Unternehmen'
      },
      ...(image ? { image } : {}),
      offers: {
        '@type': 'OfferCatalog',
        name: 'Webdesign-Pakete',
        itemListElement: DEFAULT_OFFERS.map((offer) => ({
          '@type': 'Offer',
          name: offer.name,
          price: offer.price,
          priceCurrency: 'EUR',
          url: toAbsoluteUrl(offer.url, base),
          description: offer.description,
          availability: 'https://schema.org/InStock'
        }))
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: 'Branchen', item: `${base}/branchen` },
        { '@type': 'ListItem', position: 3, name: industry.name || title, item: pageUrl }
      ]
    }
  ];

  if (faqItems.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': faqId,
      mainEntity: faqItems
        .filter((item) => item && item.q && item.a)
        .map((item) => ({
          '@type': 'Question',
          name: stripHtml(item.q),
          acceptedAnswer: {
            '@type': 'Answer',
            text: stripHtml(item.a)
          }
        }))
    });
  }

  return [
    {
      '@context': 'https://schema.org',
      '@graph': graph
    }
  ];
}
