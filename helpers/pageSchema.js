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
  const pageUrl = url || `${base}/handwerker`;
  const orgId = `${base}/#organization`;
  const websiteId = `${base}/#website`;
  const pageId = `${pageUrl}#webpage`;
  const serviceId = `${pageUrl}#service`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const faqId = `${pageUrl}#faq`;
  const title = page.title || 'Website für Handwerker in Berlin erstellen lassen';
  const description = page.description || 'Webdesign für Handwerksbetriebe in Berlin: Leistungen, Einsatzgebiet, Projektbilder und Anfragewege klar zeigen.';
  const image = toAbsoluteUrl('/images/handwerker-min.webp', base);
  const dateModified = toIsoDate(page.updated_at || page.created_at);

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
        name: 'Webdesign für Handwerker',
        serviceType: ['Website für Handwerker', 'Webdesign für Handwerksbetriebe', 'Homepage für Handwerker', 'Local SEO für Handwerker'],
        description,
        url: pageUrl,
        provider: { '@id': orgId },
        areaServed: {
          '@type': 'City',
          name: 'Berlin'
        },
        audience: {
          '@type': 'BusinessAudience',
          audienceType: 'Handwerksbetriebe'
        },
        image
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Branchen', item: `${base}/branchen` },
          { '@type': 'ListItem', position: 3, name: 'Handwerker', item: pageUrl }
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
