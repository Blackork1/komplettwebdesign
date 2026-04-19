// util/seoSchemas.js
/**
 * Erzeugt JSON-LD für Paket-Detailseiten:
 *  - BreadcrumbList
 *  - Product (+Offer)
 *  - Service (zusätzliche Entity-Verankerung für GEO/Google Rich Results)
 *  - FAQPage (aus DB, fallback auf umfangreiche Defaults je Paket / Sprache)
 */
const ORG = {
  "@type": "Organization",
  name: "Komplett Webdesign",
  url: "https://www.komplettwebdesign.de/",
  telephone: "+49 1551 1245048",
  areaServed: [
    { "@type": "City", name: "Berlin" },
    { "@type": "State", name: "Brandenburg" },
    { "@type": "Country", name: "Germany" }
  ],
  sameAs: [
    "https://www.komplettwebdesign.de/"
  ]
};

const COMMON_FAQ_DE = [
  {
    name: "Wie schnell ist meine Website online?",
    answer: "Je nach Paket und vorhandenem Material zwischen 1 und 8 Wochen. Der Basis-Onepager geht meist innerhalb von 1 bis 2 Wochen live, das Business-Paket in 2 bis 4 Wochen, Premium-Projekte werden typischerweise in 4 bis 8 Wochen realisiert. Express-Umsetzung ist nach Absprache möglich."
  },
  {
    name: "Sind Hosting, SSL und DSGVO inklusive?",
    answer: "Ja. Hosting auf deutschen Servern, SSL-Zertifikat, DSGVO-konforme Einbindung sowie Impressum, Datenschutzerklärung und Cookie-Hinweise sind in jedem Paket berücksichtigt. Laufende Wartung ist im Premium-Paket enthalten und in Basis und Business optional zubuchbar."
  },
  {
    name: "Wie transparent sind die Kosten?",
    answer: "Du erhältst transparente Paketpreise plus optionale Add-ons wie SEO-Ausbau, Content oder Wartung. Dadurch kannst du mit einem klaren Budget starten und später ohne Relaunch schrittweise ausbauen."
  },
  {
    name: "Wem gehören Website und Inhalte nach Abschluss?",
    answer: "Dir gehören sowohl die Website als auch die erstellten Inhalte. Du erhältst vollen Zugang zum CMS, deinen Dateien und deiner Domain - es gibt kein Lock-in."
  }
];

const COMMON_FAQ_EN = [
  {
    name: "How quickly can my website go live?",
    answer: "Depending on the package and existing material, between 1 and 8 weeks. The Basic one-pager usually goes live within 1 to 2 weeks, the Business package in 2 to 4 weeks, and Premium projects are typically delivered in 4 to 8 weeks. Express delivery is available on request."
  },
  {
    name: "Are hosting, SSL and GDPR setup included?",
    answer: "Yes. Hosting on German servers, an SSL certificate, GDPR-compliant integrations and legal pages like imprint, privacy policy and cookie notices are handled in every package. Ongoing maintenance is included in Premium and optionally available for Basic and Business."
  },
  {
    name: "How transparent are the costs?",
    answer: "You receive transparent package prices plus optional add-ons such as SEO expansion, content or maintenance. That way you can start with a predictable budget and still grow step by step without a relaunch."
  },
  {
    name: "Who owns the website and content after launch?",
    answer: "You own the website and the content. You get full access to the CMS, your files and your domain - there is no lock-in."
  }
];

function defaultFaq(slug, lng = "de") {
  const isEn = lng === "en";

  const perSlugDE = {
    basis: [
      {
        name: "Für wen eignet sich das Basis-Paket in Berlin?",
        answer: "Für Selbstständige, kleine Teams, Handwerks- und Dienstleistungsbetriebe sowie neu gegründete Unternehmen in Berlin, die schnell einen professionellen Onepager brauchen - ohne komplexe Mehrseitenstruktur."
      },
      {
        name: "Was ist im Basis-Paket konkret enthalten?",
        answer: "Individueller Onepager bzw. bis zu 3 Unterseiten, responsives Design, rechtliche Seiten, DSGVO-Grundlagen, OnPage-SEO, Kontaktformular mit Spam-Schutz, SSL und Hosting sowie eine Korrekturschleife."
      },
      {
        name: "Ist das Basis-Paket SEO-tauglich?",
        answer: "Ja. Der Basis-Onepager enthält saubere Metadaten, strukturierte Überschriften, schema.org-Markup und eine klare Answer-First-Struktur - damit die Seite in Google-Suche und KI-Antworten (GEO) auffindbar ist."
      },
      {
        name: "Kann ich später vom Basis-Paket auf Business oder Premium wechseln?",
        answer: "Ja. Alle Pakete sind modular aufeinander aufgebaut. Ein Upgrade auf Business oder Premium ist jederzeit möglich - wir rechnen die Differenz fair an und erweitern die Seite ohne vollständigen Relaunch."
      }
    ],
    business: [
      {
        name: "Für wen eignet sich das Business-Paket in Berlin?",
        answer: "Für wachsende Unternehmen, Agenturen und KMU in Berlin mit mehreren Dienstleistungen, Standorten oder Zielgruppen, die eine mehrseitige Website mit Conversion-Fokus benötigen und messbare Anfragen erzeugen wollen."
      },
      {
        name: "Was ist im Business-Paket enthalten?",
        answer: "4 bis 8 Seiten inklusive Leistungs- und Referenzseiten, Conversion-orientierte Textproduktion, erweitertes OnPage-SEO, Google-Analytics- und Tracking-Setup, Integrationen wie Terminbuchung, Newsletter oder CRM sowie zwei Korrekturschleifen."
      },
      {
        name: "Wie verbessert das Business-Paket meine Google-Sichtbarkeit?",
        answer: "Durch Keyword-Recherche, semantisch strukturierte Inhalte, Schema-Markup (Organization, Service, FAQ), lokale SEO-Signale für Berlin und performante Ladezeiten positioniert sich die Website für relevante Suchanfragen deutlich stärker."
      },
      {
        name: "Sind Tracking und DSGVO-konforme Analyse enthalten?",
        answer: "Ja. Wir richten Google Analytics 4 bzw. alternative Tools mit Consent Mode v2 ein, binden das Cookie-Banner datenschutzkonform ein und konfigurieren Conversion-Events für Formulare, Anrufe und Terminbuchungen."
      }
    ],
    premium: [
      {
        name: "Für wen eignet sich das Premium-Paket in Berlin?",
        answer: "Für ambitionierte Marken, B2B-Unternehmen und Dienstleister mit hohem Wachstumsanspruch, die Strategie, individuelles UX, Content-Produktion und langfristige SEO-Betreuung aus einer Hand wünschen."
      },
      {
        name: "Was unterscheidet das Premium-Paket?",
        answer: "Individuelle UX-Workshops, maßgeschneidertes Design, vollständige Content-Produktion (Text, Visuals, optional Video), strategisches SEO inklusive Themencluster, strukturierte Daten, Performance-Optimierung sowie laufende Betreuung mit Monitoring und KPI-Reports."
      },
      {
        name: "Welche SEO- und GEO-Leistungen sind im Premium-Paket enthalten?",
        answer: "Keyword- und Entity-Recherche, topische Content-Cluster, Answer-First-Strukturen für KI-Suche, umfangreiches Schema-Markup (Organization, Service, FAQ, HowTo, Article), technische SEO-Prüfungen, Core-Web-Vitals-Optimierung und regelmäßige Ranking-Reports."
      },
      {
        name: "Wie läuft die Betreuung nach dem Launch ab?",
        answer: "Nach dem Livegang folgt ein fester Betreuungsrhythmus mit Monitoring, Performance-Analysen, A/B-Tests, Wartung, Sicherheitsupdates, Content-Refreshes und priorisiertem Support - damit die Website kontinuierlich Ergebnisse liefert."
      }
    ]
  };

  const perSlugEN = {
    basis: [
      {
        name: "Who is the Basic package in Berlin for?",
        answer: "For freelancers, small teams, trade and service businesses, and newly founded companies in Berlin that need a professional one-pager quickly - without a complex multi-page structure."
      },
      {
        name: "What is included in the Basic package?",
        answer: "A custom one-pager or up to 3 subpages, responsive design, legal pages, GDPR basics, on-page SEO, a contact form with spam protection, SSL and hosting, plus one revision round."
      },
      {
        name: "Is the Basic package SEO-ready?",
        answer: "Yes. The Basic one-pager ships with clean metadata, structured headings, schema.org markup and a clear answer-first structure so the page is findable in Google search and in AI answers (GEO)."
      },
      {
        name: "Can I upgrade from Basic to Business or Premium later?",
        answer: "Yes. All packages are modular. Upgrading to Business or Premium is possible at any time - we fairly apply the difference and extend the site without a full relaunch."
      }
    ],
    business: [
      {
        name: "Who is the Business package in Berlin for?",
        answer: "For growing companies, agencies and SMEs in Berlin with multiple services, locations or audiences that need a multi-page website with a conversion focus and want to generate measurable inquiries."
      },
      {
        name: "What is included in the Business package?",
        answer: "4 to 8 pages including service and case pages, conversion-focused copywriting, extended on-page SEO, Google Analytics and tracking setup, integrations like booking, newsletter or CRM, plus two revision rounds."
      },
      {
        name: "How does the Business package improve my Google visibility?",
        answer: "Through keyword research, semantically structured content, schema markup (Organization, Service, FAQ), local SEO signals for Berlin and strong page performance, the website is positioned clearly for relevant search queries."
      },
      {
        name: "Is tracking and GDPR-compliant analytics included?",
        answer: "Yes. We set up Google Analytics 4 or alternative tools with Consent Mode v2, integrate the cookie banner in a GDPR-compliant way, and configure conversion events for forms, calls and bookings."
      }
    ],
    premium: [
      {
        name: "Who is the Premium package in Berlin for?",
        answer: "For ambitious brands, B2B companies and service providers with strong growth goals who want strategy, custom UX, content production and long-term SEO support from one source."
      },
      {
        name: "What makes the Premium package different?",
        answer: "Custom UX workshops, tailored design, full content production (copy, visuals, optional video), strategic SEO including topic clusters, structured data, performance optimization, plus ongoing care with monitoring and KPI reports."
      },
      {
        name: "Which SEO and GEO services are included in Premium?",
        answer: "Keyword and entity research, topical content clusters, answer-first structures for AI search, extensive schema markup (Organization, Service, FAQ, HowTo, Article), technical SEO audits, Core Web Vitals optimization and regular ranking reports."
      },
      {
        name: "How does post-launch support work?",
        answer: "After go-live we follow a fixed support cadence with monitoring, performance analytics, A/B testing, maintenance, security updates, content refreshes and priority support so the website keeps producing results."
      }
    ]
  };

  const perSlug = isEn ? perSlugEN : perSlugDE;
  const common = isEn ? COMMON_FAQ_EN : COMMON_FAQ_DE;
  const merged = [...(perSlug[slug] || []), ...common];

  return merged.map(q => ({
    "@type": "Question",
    name: q.name,
    acceptedAnswer: { "@type": "Answer", text: q.answer }
  }));
}

function buildServiceSchema({ pack, url, baseUrl, lng, price, currency }) {
  const isEn = lng === "en";
  const name = String(pack.name || "").trim();
  const slug = name.toLowerCase();

  const serviceNameMap = {
    basis: isEn ? "Basic Website Package" : "Basis-Website-Paket",
    business: isEn ? "Business Website Package" : "Business-Website-Paket",
    premium: isEn ? "Premium Website Package" : "Premium-Website-Paket"
  };

  const serviceDescMap = {
    basis: isEn
      ? "Fast professional website launch in Berlin: onepager design, legal pages, on-page SEO, hosting and launch support."
      : "Schneller professioneller Website-Start in Berlin: Onepager-Design, rechtliche Seiten, OnPage-SEO, Hosting und Launch-Support.",
    business: isEn
      ? "Multi-page website in Berlin with conversion copy, extended on-page SEO, tracking and integrations for lead generation."
      : "Mehrseitige Website in Berlin mit Conversion-Texten, erweitertem OnPage-SEO, Tracking und Integrationen zur Lead-Gewinnung.",
    premium: isEn
      ? "Strategic website in Berlin with UX workshops, full content production, strong SEO and ongoing optimization."
      : "Strategische Website in Berlin mit UX-Workshops, kompletter Content-Produktion, starkem SEO und laufender Optimierung."
  };

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceNameMap[slug] || (isEn ? `${name} package` : `${name}-Paket`),
    description: serviceDescMap[slug] || (pack.description || ""),
    serviceType: isEn ? "Website design and development" : "Webdesign und Entwicklung",
    provider: ORG,
    areaServed: [
      { "@type": "City", name: "Berlin" },
      { "@type": "State", name: "Brandenburg" }
    ],
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: url,
      servicePhone: "+49 1551 1245048",
      availableLanguage: ["de-DE", "en"]
    },
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
}

function normalizePrice(pack) {
  if (pack.price != null) return Number(pack.price);
  if (pack.price_amount_cents != null) return Math.round(Number(pack.price_amount_cents) / 100);
  return undefined;
}

export function buildPackageSchemas({ pack, url, baseUrl, lng = "de" }) {
  const isEn = lng === "en";
  const name = String(pack.name || "").trim();
  const slug = name.toLowerCase();
  const image = pack.image && pack.image.startsWith('http')
    ? pack.image
    : `${baseUrl}/images/paket-${slug}.webp`;
  const price = normalizePrice(pack);
  const currency = (pack.currency || "EUR").toUpperCase();

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Startseite", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: isEn ? "Packages" : "Pakete", item: `${baseUrl}${isEn ? "/en" : ""}/pakete` },
      { "@type": "ListItem", position: 3, name,              item: url }
    ]
  };

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: isEn ? `${name} package` : `${name}-Paket`,
    url,
    description: pack.description || (isEn
      ? `${name} website package by Komplett Webdesign in Berlin - transparent scope and timeline.`
      : `${name}-Website-Paket von Komplett Webdesign in Berlin - mit transparentem Leistungsumfang und Zeitrahmen.`),
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

  const service = buildServiceSchema({ pack, url, baseUrl, lng, price, currency });

  // FAQ aus DB bevorzugen, ansonsten umfangreiche Defaults:
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

  return [breadcrumbs, product, service, faq];
}
