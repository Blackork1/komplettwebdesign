import { buildOrganizationSchema } from './entitySchema.js';
import { stripHtml } from './industrySchema.js';

import { HANDWERKER_FAQ } from '../data/handwerkerPage.js';

// Die FAQ liegt bei den Seiteninhalten, damit Seite und strukturierte Daten identisch bleiben.
export { HANDWERKER_FAQ };

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '');
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

export function buildHandwerkerPageSchemas({ page = {}, url, baseUrl, faq = HANDWERKER_FAQ }) {
  const base = normalizeBaseUrl(baseUrl);
  return buildServiceLandingSchemas({
    base,
    pageUrl: url || `${base}/handwerker`,
    title: page.title || 'Website für Handwerker in Berlin erstellen lassen',
    description: page.description || 'Webdesign für Handwerksbetriebe in Berlin: Leistungen, Einsatzgebiet, Projektbilder und Anfragewege klar zeigen.',
    image: toAbsoluteUrl('/images/handwerker-min.webp', base),
    dateModified: toIsoDate(page.updated_at || page.created_at),
    serviceName: 'Webdesign für Handwerker',
    serviceType: ['Website für Handwerker', 'Webdesign für Handwerksbetriebe', 'Homepage für Handwerker', 'Local SEO für Handwerker'],
    audienceType: 'Handwerksbetriebe',
    breadcrumbName: 'Handwerker',
    faq
  });
}

// Branchenseiten mit eigenem Inhalt (data/reinigungPage.js, data/blumenladenPage.js).
export function buildNichePageSchemas({ nichePage, title, description, url, baseUrl, faq = [], updatedIso }) {
  const base = normalizeBaseUrl(baseUrl);
  return buildServiceLandingSchemas({
    base,
    pageUrl: url || `${base}${nichePage.path}`,
    title,
    description,
    image: toAbsoluteUrl(nichePage.hero.image, base),
    dateModified: toIsoDate(updatedIso),
    serviceName: nichePage.schema.serviceName,
    serviceType: nichePage.schema.serviceType,
    audienceType: nichePage.schema.audienceType,
    breadcrumbName: nichePage.breadcrumb,
    faq
  });
}

function buildServiceLandingSchemas({ base, pageUrl, title, description, image, dateModified, serviceName, serviceType, audienceType, breadcrumbName, faq }) {
  const orgId = `${base}/#organization`;
  const websiteId = `${base}/#website`;
  const pageId = `${pageUrl}#webpage`;
  const serviceId = `${pageUrl}#service`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const faqId = `${pageUrl}#faq`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationSchema(base),
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
        name: serviceName,
        serviceType,
        description,
        url: pageUrl,
        provider: { '@id': orgId },
        areaServed: {
          '@type': 'City',
          name: 'Berlin'
        },
        audience: {
          '@type': 'BusinessAudience',
          audienceType
        },
        image
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Branchen', item: `${base}/branchen` },
          { '@type': 'ListItem', position: 3, name: breadcrumbName, item: pageUrl }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': faqId,
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: stripHtml(item.q),
          acceptedAnswer: {
            '@type': 'Answer',
            text: stripHtml(item.a)
          }
        }))
      }
    ]
  };
}
