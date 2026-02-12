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

function defaultFaq(slug, lng = "de") {
  const isEn = lng === "en";

  const common = isEn ? [
    {
      "@type": "Question",
      name: "How quickly can my website go live?",
      acceptedAnswer: { "@type": "Answer", text: "Usually between 5 and 15 business days depending on scope. Express delivery is available on request." }
    },
    {
      "@type": "Question",
      name: "Are hosting and maintenance available?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Both can be booked optionally, and ongoing support is included in the Premium package." }
    },
    {
      "@type": "Question",
      name: "Can I upgrade later?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, upgrades are possible at any time. We fairly apply the package difference." }
    }
  ] : [
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

  const perSlug = isEn ? {
    basis: [
      {
        "@type": "Question",
        name: "What is included in the Basic package?",
        acceptedAnswer: { "@type": "Answer", text: "Design, responsive layout, GDPR basics, SEO fundamentals and a contact form." }
      }
    ],
    business: [
      {
        "@type": "Question",
        name: "Who is the Business package for?",
        acceptedAnswer: { "@type": "Answer", text: "For companies with multiple subpages, landing pages and advanced SEO or tracking requirements." }
      }
    ],
    premium: [
      {
        "@type": "Question",
        name: "What makes Premium different?",
        acceptedAnswer: { "@type": "Answer", text: "Custom design, content production, prioritized support and ongoing optimization." }
      }
    ]
  } : {
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

export function buildPackageSchemas({ pack, url, baseUrl, lng = "de" }) {
  const isEn = lng === "en";
  const name = String(pack.name || "").trim();
  const slug = name.toLowerCase();                   // dein Routing nutzt LOWER(name) als slug
  const image = pack.image || `${baseUrl}/images/paket-${slug}.webp`;
  const price = normalizePrice(pack);
  const currency = (pack.currency || "EUR").toUpperCase();

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Startseite", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: isEn ? "Packages" : "Pakete", item: `${baseUrl}/pakete${isEn ? "?lng=en" : ""}` },
      { "@type": "ListItem", position: 3, name,              item: url }
    ]
  };

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: isEn ? `${name} package` : `${name}-Paket`,
    url,
    description: pack.description || (isEn
      ? `${name} package by Komplett Webdesign in Berlin.`
      : `${name}-Paket von Komplett Webdesign in Berlin.`),
    image: [image],
    brand: { "@type": "Brand", name: "Komplett Webdesign" },
    category: isEn ? "Web design service" : "Webdesign-Service",
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
  if (isEn && pack.schema_faq_en) {
    try {
      const arr = Array.isArray(pack.schema_faq_en) ? pack.schema_faq_en : JSON.parse(pack.schema_faq_en);
      faqEntities = arr.filter(Boolean).map(q => ({
        "@type": "Question",
        name: q.name,
        acceptedAnswer: { "@type": "Answer", text: q.answer }
      }));
    } catch {
      faqEntities = defaultFaq(slug, lng);
    }
  } else if (!isEn && pack.schema_faq) {
    try {
      const arr = Array.isArray(pack.schema_faq) ? pack.schema_faq : JSON.parse(pack.schema_faq);
      faqEntities = arr.filter(Boolean).map(q => ({
        "@type": "Question",
        name: q.name,
        acceptedAnswer: { "@type": "Answer", text: q.answer }
      }));
    } catch {
      faqEntities = defaultFaq(slug, lng);
    }
  } else {
    faqEntities = defaultFaq(slug, lng);
  }

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntities
  };

  return [breadcrumbs, product, faq];
}
