// util/seoSchemas.js
/**
 * Erzeugt JSON-LD für Paket-Detailseiten:
 *  - BreadcrumbList
 *  - Product (+Offer)
 *  - FAQPage (aus DB, fallback auf Defaults)
 */
const ORG = {
  "@type": "Organization",
  name: "Komplett Webdesign",
  url: "https://www.komplettwebdesign.de/",
  telephone: "+49 1551 1245048"
};

function defaultFaq(slug) {
  const common = [
    {
      "@type": "Question",
      name: "Wie schnell ist meine Website online?",
      acceptedAnswer: { "@type": "Answer", text: "Je nach Umfang zwischen 5 und 15 Werktagen. Express nach Absprache." }
    },
    {
      "@type": "Question",
      name: "Sind Hosting und Wartung möglich?",
      acceptedAnswer: { "@type": "Answer", text: "Ja – optional zubuchbar. Im Premium-Paket ist laufende Betreuung enthalten." }
    },
    {
      "@type": "Question",
      name: "Kann ich später upgraden?",
      acceptedAnswer: { "@type": "Answer", text: "Ja, ein Upgrade ist jederzeit möglich. Wir rechnen die Differenz fair an." }
    }
  ];

  const perSlug = {
    basis: [
      {
        "@type": "Question",
        name: "Was ist im Basis-Paket enthalten?",
        acceptedAnswer: { "@type": "Answer", text: "Design, responsives Layout, DSGVO-Grundlagen, Basis-SEO, Kontaktformular." }
      }
    ],
    business: [
      {
        "@type": "Question",
        name: "Für wen eignet sich Business?",
        acceptedAnswer: { "@type": "Answer", text: "Für Firmen mit mehreren Unterseiten, Landingpages, erweiterten SEO/Tracking-Anforderungen." }
      }
    ],
    premium: [
      {
        "@type": "Question",
        name: "Was unterscheidet Premium?",
        acceptedAnswer: { "@type": "Answer", text: "Individuelles Design, Content-Produktion, priorisierter Support & laufende Optimierung." }
      }
    ]
  };

  return [...(perSlug[slug] || []), ...common];
}

function normalizePrice(pack) {
  // pack.price (z. B. 499) ODER pack.price_amount_cents (z. B. 49900)
  if (pack.price != null) return Number(pack.price);
  if (pack.price_amount_cents != null) return Math.round(Number(pack.price_amount_cents) / 100);
  return undefined;
}

export function buildPackageSchemas({ pack, url, baseUrl }) {
  const name = String(pack.name || "").trim();
  const slug = name.toLowerCase();                   // dein Routing nutzt LOWER(name) als slug
  const image = pack.image || `${baseUrl}/images/paket-${slug}.webp`;
  const price = normalizePrice(pack);
  const currency = (pack.currency || "EUR").toUpperCase();

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Pakete",    item: `${baseUrl}/pakete` },
      { "@type": "ListItem", position: 3, name,              item: url }
    ]
  };

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${name}-Paket`,
    url,
    description: pack.description || `${name}-Paket von Komplett Webdesign in Berlin.`,
    image: [image],
    brand: { "@type": "Brand", name: "Komplett Webdesign" },
    category: "Webdesign-Service",
    sku: pack.sku || `KW-PKG-${slug.toUpperCase()}`,
    offers: {
      "@type": "Offer",
      price: price != null ? String(price) : undefined,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      url,
      priceValidUntil: "2026-12-31",
      seller: ORG
    }
  };

  // FAQ aus DB (JSONB) bevorzugen, ansonsten Fallback:
  let faqEntities = [];
  if (pack.schema_faq) {
    try {
      const arr = Array.isArray(pack.schema_faq) ? pack.schema_faq : JSON.parse(pack.schema_faq);
      faqEntities = arr.filter(Boolean).map(q => ({
        "@type": "Question",
        name: q.name,
        acceptedAnswer: { "@type": "Answer", text: q.answer }
      }));
    } catch {
      faqEntities = defaultFaq(slug);
    }
  } else {
    faqEntities = defaultFaq(slug);
  }

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntities
  };

  return [breadcrumbs, product, faq];
}
