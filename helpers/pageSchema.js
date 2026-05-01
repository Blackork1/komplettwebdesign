import { stripHtml } from './industrySchema.js';

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

const HANDWERKER_FAQ = [
  {
    q: 'Was kostet eine Handwerker-Website?',
    a: 'Eine professionelle Handwerker-Website startet bei Komplett Webdesign ab 499 EUR. Für Betriebe mit mehreren Leistungen, Referenzen, Einsatzgebieten und SEO-Struktur ist meist das Business-Paket ab 899 EUR sinnvoll.'
  },
  {
    q: 'Welche Inhalte braucht eine gute Handwerker-Website?',
    a: 'Wichtig sind klare Leistungen, Einsatzgebiet, Referenzen, Bewertungen, ein verständlicher Ablauf, schnelle Kontaktwege und ein Anfrageformular, das Projektart, Ort, Zeitraum und Fotos abfragen kann.'
  },
  {
    q: 'Hilft Local SEO Handwerksbetrieben bei neuen Aufträgen?',
    a: 'Ja. Local SEO hilft, wenn die Website konkrete Leistungen, Berliner Bezirke, Projektbeispiele, Kontaktwege und strukturierte Daten sauber verbindet. Das macht die Seite für Suchmaschinen und Interessenten leichter verständlich.'
  },
  {
    q: 'Wie schnell kann eine Handwerker-Website online gehen?',
    a: 'Ein kompakter Onepager ist oft innerhalb von 2 bis 4 Wochen realistisch. Eine mehrseitige Website mit Leistungsseiten, Referenzen, FAQ und SEO-Struktur braucht je nach Umfang meist 4 bis 6 Wochen.'
  },
  {
    q: 'Kann ich Referenzen und Projektbilder später ergänzen?',
    a: 'Ja. Referenzen, Vorher-Nachher-Bilder, Projektfotos und neue Leistungen können später ergänzt werden. Das ist besonders wichtig, weil echte Projekte Vertrauen aufbauen und lokale Suchbegriffe stärken.'
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

export function buildHandwerkerPageSchemas({ page = {}, url, baseUrl }) {
  const base = normalizeBaseUrl(baseUrl);
  const pageUrl = url || `${base}/handwerker`;
  const orgId = `${base}/#organization`;
  const websiteId = `${base}/#website`;
  const pageId = `${pageUrl}#webpage`;
  const serviceId = `${pageUrl}#service`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const faqId = `${pageUrl}#faq`;
  const title = page.title || 'Handwerker Website Berlin | Webdesign, SEO & Anfragen';
  const description = page.description || 'Webdesign für Handwerker in Berlin mit klaren Leistungen, Referenzen, Local SEO und Anfragewegen.';
  const image = toAbsoluteUrl('/images/handwerker-min.webp', base);
  const dateModified = toIsoDate(page.updated_at || page.created_at);

  return {
    '@context': 'https://schema.org',
    '@graph': [
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
        name: 'Webdesign für Handwerker',
        serviceType: 'Website-Erstellung, Local SEO und Lead-Generierung für Handwerksbetriebe',
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
        image,
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
          { '@type': 'ListItem', position: 3, name: 'Handwerker', item: pageUrl }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': faqId,
        mainEntity: HANDWERKER_FAQ.map((item) => ({
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
