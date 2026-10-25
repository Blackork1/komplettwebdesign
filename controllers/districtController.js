import { buildOrganizationSchema } from '../helpers/entitySchema.js';
// controllers/districtController.js
import { DISTRICTS, getDistrictBySlug } from "../models/districtModel.js";
import { SEO_GUIDE_CLUSTER } from "../data/seoGuideCluster.js";
import { webdesignBerlinPage } from "../data/webdesignBerlinPage.js";
import { SITE_FACTS, formatGoogleRating } from "../helpers/siteFacts.js";
import { interpolatePricingTokens } from "../util/pricingViewModel.js";
import { DISTRICT_PAGES, DISTRICT_CONTENT_UPDATED_ISO } from "../data/districtPages.js";

export async function renderDistrictPage(req, res, next) {
  try {
    const lng = req.baseUrl?.startsWith("/en/") ? "en" : "de";
    const isEn = lng === "en";
    const { slug } = req.params;
    const district = getDistrictBySlug(slug);
    if (!district) return next(); // 404 → geht in dein NotFound-Handler
    const pricing = res.locals.packagePricing || {};
    const priceLabel = (packageKey) => (
      typeof pricing.priceLabel === "function" ? pricing.priceLabel(packageKey, lng) : ""
    );
    const districtPage = interpolatePricingTokens(buildGermanDistrictPage(slug, district), pricing, { lng });
    const districtPackageCards = buildDistrictPackageCards(priceLabel, lng);

    // Optional: Meta für Head-Partial (dein Hauptcontent enthält bereits JSON-LD)
    const metaTitle = isEn
      ? `Web Design ${district.name} | Professional Website Development`
      : districtPage.metaTitle;
    const metaDescription =
      isEn
        ? `Web design in ${district.name} (Berlin) - landing pages and relaunches for freelancers and SMEs. CMS, SEO, hosting and maintenance. Call now: ${SITE_FACTS.phoneDisplay}.`
        : districtPage.metaDescription;
    const pagePrefix = req.baseUrl?.startsWith("/en/") ? "/en/webdesign-berlin" : "/webdesign-berlin";
    const canonicalUrl = `${SITE_URL}${pagePrefix}/${slug}`;
    const districtCssHref = isEn ? req.app.locals.cssAsset("district-berlin.css") : "";
    // Die englischen Bezirksseiten sind noindex: keine hreflang-Verweise darauf.
    // Die deutschen Seiten nutzen das Design von /webdesign-berlin (webdesign-berlin.css im Template).
    const ogImage = !isEn && districtPage.heroImage ? districtPage.heroImage : `${SITE_URL}/images/heroBg.webp`;

    res.locals.title = metaTitle;
    res.locals.description = metaDescription;
    res.locals.seoExtra = `
      <link rel="canonical" href="${canonicalUrl}">
      ${isEn ? `<link rel="preload" href="${districtCssHref}" as="style">
      <link rel="stylesheet" href="${districtCssHref}">` : ""}
      <meta property="og:title" content="${metaTitle}">
      <meta property="og:description" content="${metaDescription}">
      <meta property="og:url" content="${canonicalUrl}">
      <meta property="og:type" content="website">
      <meta property="og:image" content="${ogImage}">
    `;

    if (isEn) {
      const districtCopyBySlug = {
        "friedrichshain": {
          lead: "Friedrichshain is highly competitive, with hospitality, services, and creative businesses fighting for attention. A strong website helps you stand out and convert visitors into real inquiries.",
          caption: "Friedrichshain: local web design focused on visibility and leads",
          localFocus: "We optimize for district-specific search intent in Friedrichshain and nearby areas."
        },
        "prenzlauer-berg": {
          lead: "Prenzlauer Berg is quality-driven and trust-focused. Your website needs a premium look, clear positioning, and strong performance to match your audience.",
          caption: "Prenzlauer Berg: premium web presence for local businesses",
          localFocus: "We align messaging and SEO with how customers search in Prenzlauer Berg."
        },
        "kreuzberg": {
          lead: "Kreuzberg is diverse and fast-moving. Your website should communicate value instantly and guide users directly to contact or booking.",
          caption: "Kreuzberg: conversion-first web design for local companies",
          localFocus: "We build local SEO structures around Kreuzberg service searches."
        },
        "charlottenburg": {
          lead: "Charlottenburg combines established businesses with modern service providers. A professional website builds trust and supports higher-value inquiries.",
          caption: "Charlottenburg: professional websites for established brands",
          localFocus: "We optimize for high-intent local searches around Charlottenburg."
        },
        "lichtenberg": {
          lead: "Lichtenberg is growing quickly, and digital competition keeps increasing. A modern website helps you capture demand before competitors do.",
          caption: "Lichtenberg: modern website setup for long-term growth",
          localFocus: "We target local ranking opportunities in and around Lichtenberg."
        },
        "mitte": {
          lead: "Berlin Mitte is one of the most visible and competitive districts. Your website has to be fast, clear, and professional to win trust quickly.",
          caption: "Mitte: high-performance web design for high-competition markets",
          localFocus: "We focus on local SEO strategy for Mitte and central Berlin searches."
        }
      };
      const districtCopy = districtCopyBySlug[slug] || {
        lead: `In ${district.name}, competition is high and first impressions happen online. A modern website is your digital storefront and a clear path for inquiries outside regular opening hours.`,
        caption: `Web design for local businesses in ${district.name}`,
        localFocus: `We optimize for district-specific search intent in ${district.name}.`
      };

      return res.render("bereiche/webdesign-berlin-district-en", {
        title: metaTitle,
        description: metaDescription,
        lng,
        district,
        company: "Komplett Webdesign",
        phone: SITE_FACTS.phone,
        phoneDisplay: SITE_FACTS.phoneDisplay,
        hubPath: "/en",
        districtPath: `/en/webdesign-berlin/${slug}`,
        contactPath: "/en/kontakt",
        districtCopy,
        packageCards: districtPackageCards,
        processSteps: [
          { title: "1) Analysis & Strategy", text: `We define goals, positioning, and priorities for your business in ${district.name}.` },
          { title: "2) UX & Design", text: "You get a clear, modern layout aligned with your offer and audience." },
          { title: "3) Content & SEO", text: "We create clear copy and local SEO structure from day one." },
          { title: "4) Development", text: "Fast implementation, clean code, mobile-first, and privacy-aware setup." },
          { title: "5) Launch & Tracking", text: "Go live with analytics and Search Console where agreed, so visibility and inquiry paths remain traceable." },
          { title: "6) Ongoing Support", text: "Optional maintenance and SEO support for long-term growth." }
        ],
        faqItems: [
          {
            q: `How much does web design in ${district.name} cost?`,
            a: `Packages: Start ${priceLabel("start") || "scoped offer"}, Business ${priceLabel("business") || "scoped offer"}, Growth ${priceLabel("wachstum") || "scoped offer"}. Hosting, domain, email and maintenance are agreed separately.`
          },
          {
            q: `How long does a website project in ${district.name} take?`,
            a: "Typical delivery time is 4 to 6 weeks, depending on feedback speed and project complexity."
          },
          {
            q: "Is local SEO included?",
            a: "Yes. We include local SEO basics such as structure, metadata, internal links, and Google Business support."
          },
          {
            q: "Can you also write content?",
            a: "Yes. We provide copywriting support for service pages, homepage messaging, and conversion-focused request paths."
          },
          {
            q: "Do you also work outside this district?",
            a: "Yes, we work across all Berlin districts and also support clients outside Berlin."
          }
        ]
      });
    }

    return res.render("bereiche/webdesign-berlin-district", {
      title: metaTitle,
      description: metaDescription,
      company: "Komplett Webdesign",
      phone: SITE_FACTS.phone,
      phoneDisplay: SITE_FACTS.phoneDisplay,
      googleProfileUrl: SITE_FACTS.googleProfileUrl,
      lng,
      district,
      districtPage,
      hubPath: "/",
      districtPath: `/webdesign-berlin/${slug}`,
      contactPath: "/kontakt",
      packageCards: districtPackageCards,
      faqItems: interpolatePricingTokens(
        [...(districtPage.faq || []), buildDistrictPriceFaq(district.name)],
        pricing,
        { lng }
      ),
      districtServiceLinks: buildDistrictServiceLinks(slug),
      otherDistricts: DISTRICTS
        .filter((item) => item.slug !== slug)
        .map((item) => ({ name: item.name, href: `/webdesign-berlin/${item.slug}` })),
      districtLastUpdatedIso: DISTRICT_CONTENT_UPDATED_ISO,
      seoGuides: interpolatePricingTokens(SEO_GUIDE_CLUSTER, pricing, { lng }).slice(0, 6).map((guide) => ({
        title: guide.title,
        excerpt: guide.excerpt,
        href: `/ratgeber/${guide.slug}`
      }))
    });
  } catch (err) {
    next(err);
  }
}

const SITE_URL = (process.env.CANONICAL_BASE_URL || process.env.BASE_URL || "https://www.komplettwebdesign.de").replace(/\/$/, "");
const YOUTUBE_ID = "M_fYtNuPcGg";
const VIDEO_UPLOAD_ISO = "2025-11-02T12:00:00+01:00";
const CONTENT_LAST_UPDATED_ISO = "2026-04-23";

const DISTRICT_PACKAGE_CARDS = [
  {
    name: "Start",
    priceKey: "start",
    href: "/pakete/start",
    short: "Für eine kompakte Website als professionellen Einstieg.",
    features: ["1 bis 3 Seiten", "gelieferte Inhalte", "technische SEO-Grundlagen", "klare Feedbackrunde"]
  },
  {
    name: "Business",
    priceKey: "business",
    href: "/pakete/business",
    short: "Für kleine Unternehmen mit mehreren Leistungen und Kontaktformular.",
    features: ["ca. 4 bis 7 Seiten", "Kontaktformular", "OnPage-SEO", "zwei Feedbackrunden"],
    featured: true
  },
  {
    name: "Wachstum",
    priceKey: "wachstum",
    href: "/pakete/wachstum",
    short: "Für umfangreichere Onlineangebote mit Strategie, Content-Tiefe und SEO-Struktur.",
    features: ["ca. 8 bis 12 Seiten", "Strategie", "SEO-Struktur", "Add-ons nach Umfang"]
  }
];

function buildDistrictPackageCards(priceLabel, lng = 'de') {
  return DISTRICT_PACKAGE_CARDS.map((card) => ({
    ...card,
    href: lng === 'en' ? `/en${card.href}` : card.href,
    price: priceLabel(card.priceKey) || "nach Angebot"
  }));
}

function buildDistrictHubCards(lng = 'de') {
  const basePath = lng === 'en' ? '/en/webdesign-berlin' : '/webdesign-berlin';

  return DISTRICTS.map((district) => {
    const page = buildGermanDistrictPage(district.slug, district);
    return {
      name: district.name,
      slug: district.slug,
      href: `${basePath}/${district.slug}`,
      label: page.label,
      title: `Webdesign ${district.name}`,
      text: page.proof,
      image: page.heroImage,
      imageAlt: page.imageAlt,
      neighborhoods: page.neighborhoods.slice(0, 3)
    };
  });
}

const DISTRICT_FALLBACK_IMAGE = "https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194839/admin_gallery/rvkdyvpwrd25fcm9v3av.webp";

// Eigenständige Inhalte je Bezirk stehen in data/districtPages.js.
function buildGermanDistrictPage(slug, district) {
  const content = DISTRICT_PAGES[slug] || {};
  const neighborhoodDetails = Array.isArray(content.neighborhoods) ? content.neighborhoods : [];
  return {
    ...content,
    slug,
    name: district.name,
    h1: content.h1 || `Webdesign in ${district.name}`,
    metaTitle: content.metaTitle || `Webdesign ${district.name} | Komplett Webdesign`,
    metaDescription: content.metaDescription || `Websites für kleine Unternehmen in ${district.name}.`,
    heroImage: content.heroImage || DISTRICT_FALLBACK_IMAGE,
    imageAlt: content.imageAlt || `Webdesign für Unternehmen in ${district.name}`,
    imageSize: content.imageSize || [720, 540],
    // Für die Bezirkskarten auf /webdesign-berlin
    proof: content.hubTeaser || `Websites für kleine Unternehmen in ${district.name}.`,
    neighborhoods: neighborhoodDetails.map((area) => area.name),
    neighborhoodDetails,
    googleRating: {
      label: "★★★★★ 5,0/5 · 4 Google-Rezensionen",
      href: SITE_FACTS.googleProfileUrl
    },
    references: [
      { name: "Zur alten Backstube", href: "/referenzen/zur-alten-backstube", text: "Website für ein lokales Café mit klarer Angebotsstruktur, stimmiger Bildsprache und einfachen Kontaktwegen." },
      { name: "TM Sauber & Mehr", href: "/referenzen/tm-sauber-mehr", text: "Website-Relaunch für einen Reinigungsbetrieb mit klaren Leistungen, Team-Seite und direktem Anfrageweg." }
    ]
  };
}

function buildDistrictPriceFaq(name) {
  return {
    q: `Was kostet eine Website in ${name}?`,
    a: "Die Pakete: Start {{price.start}}, Business {{price.business}}, Wachstum {{price.wachstum}}, individuelle Projekte {{price.individuell}}. Hosting, Domain, E-Mail und Wartung kommen bei Bedarf separat dazu."
  };
}

function buildDistrictServiceLinks(slug) {
  const defaults = [
    { label: "Local SEO Berlin", href: "/leistungen/local-seo" },
    { label: "Responsives Design & Mobile", href: "/leistungen/responsives-design-mobile" },
    { label: "Business-Paket ansehen", href: "/pakete/business" }
  ];

  const byDistrict = {
    mitte: [
      { label: "Website-Relaunch", href: "/leistungen/website-relaunch" },
      { label: "Local SEO Berlin", href: "/leistungen/local-seo" },
      { label: "Wachstum-Paket ansehen", href: "/pakete/wachstum" }
    ],
    friedrichshain: [
      { label: "Inhalte & Texte (Content)", href: "/leistungen/inhalte-texte-content" },
      { label: "Local SEO Berlin", href: "/leistungen/local-seo" },
      { label: "Business-Paket ansehen", href: "/pakete/business" }
    ],
    "prenzlauer-berg": [
      { label: "Website-Relaunch", href: "/leistungen/website-relaunch" },
      { label: "Rechtliches, Sicherheit & Vertrauen", href: "/leistungen/rechtliches-sicherheit" },
      { label: "Wachstum-Paket ansehen", href: "/pakete/wachstum" }
    ],
    kreuzberg: [
      { label: "Responsives Design & Mobile", href: "/leistungen/responsives-design-mobile" },
      { label: "Inhalte & Texte (Content)", href: "/leistungen/inhalte-texte-content" },
      { label: "Start-Paket ansehen", href: "/pakete/start" }
    ],
    charlottenburg: [
      { label: "Rechtliches, Sicherheit & Vertrauen", href: "/leistungen/rechtliches-sicherheit" },
      { label: "Laufende Website-Kosten", href: "/leistungen/laufende-kosten-website" },
      { label: "Wachstum-Paket ansehen", href: "/pakete/wachstum" }
    ],
    lichtenberg: [
      { label: "Responsives Design & Mobile", href: "/leistungen/responsives-design-mobile" },
      { label: "Website-Kosten und Beispielrechnungen", href: "/webdesign-berlin/kosten-preise-pakete" },
      { label: "Business-Paket ansehen", href: "/pakete/business" }
    ]
  };

  return byDistrict[slug] || defaults;
}


export function renderWebdesignBerlinHub(req, res) {
  const lng = req.baseUrl?.startsWith("/en/") ? "en" : "de";
  const isEn = lng === "en";
  const pagePath = isEn ? "/en/webdesign-berlin" : "/webdesign-berlin";
  const pageBaseUrl = (res.locals.canonicalBaseUrl || SITE_URL).replace(/\/$/, "");
  const webdesignBerlinUrl = `${pageBaseUrl}${pagePath}`;
  const contactPath = isEn ? "/en/kontakt" : "/kontakt";
  const pricing = res.locals.packagePricing || {};
  const priceLabel = (packageKey) => (
    typeof pricing.priceLabel === "function" ? pricing.priceLabel(packageKey, lng) : ""
  );
  const lowestPackagePriceLabel = typeof pricing.lowestLabel === "function"
    ? pricing.lowestLabel(lng)
    : "";
  const dbPackageTeasers = Array.isArray(res.locals.visiblePackages)
    ? res.locals.visiblePackages.map((pkg) => ({
      id: pkg.packageKey,
      name: pkg.name,
      priceLabel: pkg.priceLabel,
      path: pkg.canonicalPath,
      scope: pkg.pageScopeShort || pkg.pageScope,
      description: pkg.shortDescription,
      highlights: [
        pkg.pageScopeShort || pkg.pageScope,
        pkg.feedbackRounds ? `Feedbackrunden: ${pkg.feedbackRounds}` : null,
        'technische SEO-Grundlagen'
      ].filter(Boolean),
      recommended: Boolean(pkg.isRecommended),
      recommendationLabel: pkg.recommendationLabel,
      ctaLabel: pkg.ctaLabel || 'Paket anfragen'
    }))
    : [];

  if (!isEn) {
    const page = interpolatePricingTokens(webdesignBerlinPage, res.locals.packagePricing || {}, { lng });
    if (dbPackageTeasers.length) {
      page.packageTeaser = {
        ...page.packageTeaser,
        packages: dbPackageTeasers
      };
    }
    res.locals.title = page.title;
    res.locals.description = page.description;
    res.locals.seoExtra = `
      <meta property="og:title" content="${page.title}">
      <meta property="og:description" content="${page.description}">
      <meta property="og:url" content="${webdesignBerlinUrl}">
      <meta property="og:image" content="${pageBaseUrl}/images/heroImageH.webp">
    `;

    return res.render("bereiche/webdesign-berlin", {
      lng,
      page,
      pagePath,
      contactPath,
      districtCards: buildDistrictHubCards(lng),
      canonical: webdesignBerlinUrl,
      canonicalUrl: webdesignBerlinUrl,
      alternateUrls: {
        de: `${pageBaseUrl}/webdesign-berlin`,
        en: `${pageBaseUrl}/en/webdesign-berlin`,
        xDefault: `${pageBaseUrl}/webdesign-berlin`
      }
    });
  }

  let metaTitle = "Webdesign Berlin für kleine Unternehmen | Komplett Webdesign";
  let metaDescription =
    `Webdesign Berlin für kleine Unternehmen, Selbstständige und lokale Dienstleister: persönliche Websites ${lowestPackagePriceLabel || "nach Angebot"} mit SEO-Grundlage, mobiler Optimierung und klaren Anfragewegen.`;

  const hero = {
    title: "Webdesign Berlin für kleine Unternehmen, die online Anfragen gewinnen wollen",
    description:
      `Persönliches Webdesign ${lowestPackagePriceLabel || "nach Angebot"}, inklusive SEO-Grundlage, mobiler Optimierung und klarer Anfrageführung. Ideal für lokale Dienstleister, Handwerker, Cafés, Restaurants, Praxen und Selbstständige in Berlin.`,
    // answerBlock:
    //   "Wenn du eine Website in Berlin erstellen lassen willst, brauchst du nicht nur Design, sondern eine klare Struktur für Sichtbarkeit und Abschluss. Genau darauf ist diese Seite gebaut: lokale Suchintention treffen, Vertrauen aufbauen und Besucher zielgerichtet in Erstgespräch, Kontakt oder Website-Check führen.",
     ctaPrimary: { label: "Kostenlose Ersteinschätzung anfragen", href: "/kontakt" },
    ctaSecondary: { label: "Preise und Pakete ansehen", href: "/pakete" },
    ctaTertiary: { label: "Website-Tester starten", href: "/website-tester" },
    rating: { label: formatGoogleRating(lng), href: SITE_FACTS.googleProfileUrl },
    image: {
      src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194839/admin_gallery/rvkdyvpwrd25fcm9v3av.webp",
      alt: "Sören Blocksdorf – Webdesigner Berlin"
    },
    trustBadges: [
      "Persönliche Betreuung statt Agentur-Ping-Pong",
      `Pakete ${lowestPackagePriceLabel || "nach Angebot"}`,
      "Antwort innerhalb von 24 Stunden"
    ]
  };

  const audience = {
    title: "Webdesign für Berliner Selbstständige, Handwerk und KMU",
    description:
      "Viele Berliner Websites sehen zwar gut aus, bringen aber zu wenig Anfragen. Wir kombinieren Design, Technik und Local SEO, damit du für Suchanfragen wie <strong>\"Webdesign Berlin\"</strong> oder <strong>\"Webseite erstellen lassen Berlin\"</strong> besser sichtbar wirst. Wenn du möchtest, findest du im <a href='/ratgeber'>Ratgeber</a> zusätzliche SEO-Tipps für lokale Unternehmen.",
    painPoints: [
      "Zu wenig Anfragen über Google trotz vorhandener Website",
      "Langsame Ladezeiten und schwache mobile Darstellung",
      "Unklare Inhalte ohne klare Conversion-Ziele"
    ],
    highlights: [
      "<strong>Messbar</strong>: klare KPI- und Conversion-Tracking-Grundlage",
      "<strong>Lokal</strong>: Fokus auf Berlin und relevante Bezirke",
      "<strong>Wartungsarm</strong>: Updates, Backups und Support inklusive"
    ]
  };

  const services = [
    {
      name: "<a href='/leistungen/website-relaunch' class='wd-link--accent'>Webdesign & UX</a>",
      description: "Individuelle Layouts mit klarer Nutzerführung, damit Besucher schneller zu Anfragen werden.",
      features: [
        "<strong><a href='/leistungen/responsives-design-mobile' class='wd-link--accent'>Responsive Design</a></strong> für Desktop, Tablet & Smartphone",
        "<strong>Core Web Vitals</strong> mit Performance-Fokus",
        "<strong>Klare UX</strong> für bessere Conversion-Raten",
        "<strong>CMS</strong> für eigenständige Pflege"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761232178/admin_gallery/zpajf67i0zah0c3r4eti.webp",
        alt: "Webdesign Beispiel für Berliner Unternehmen"
      }
    },
    {
      name: "<a href='/leistungen/local-seo' class='wd-link--accent'>SEO & Local SEO</a>",
      description: "Wir verbinden Keyword-Strategie mit lokalem Fokus, damit deine Inhalte besser verständlich und auffindbar werden.",
      features: [
        "<strong>OnPage-SEO</strong> für Titles, H1, Struktur und interne Links",
        "<strong>Local SEO</strong> inkl. Google Business Profil",
        "<strong>Schema.org</strong> für bessere Suchergebnis-Darstellung",
        "<strong>Keyword-Mapping</strong> für Bezirke und Leistungen"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761068306/admin_gallery/evjinprnbjqf6dfznqsh.webp",
        alt: "SEO & Local SEO Bild"
      }
    },
    {
      name: "<a href='/leistungen/laufende-kosten-website' class='wd-link--accent'>Hosting & Wartung</a>",
      description: "Stabile Technik für schnelle Ladezeiten, technische Sicherheit und weniger vermeidbare Probleme.",
      features: [
        "<strong>Hosting</strong> in ISO-zertifizierten Rechenzentren",
        "<strong>Backups</strong> & Recovery täglich",
        "<strong>Monitoring</strong> für Sicherheit & Uptime",
        "<strong>Regelmäßige Checks</strong> für Performance"
      ],
      image: {
        src: "/images/hosting.webp",
        alt: "Hosting & Wartung"
      }
    },
    {
      name: "E-Commerce & Buchungen",
      description: "Wir integrieren Buchungs- und Zahlungsprozesse, die im Alltag wirklich genutzt werden.",
      features: [
        "<strong>Stripe & PayPal</strong> Payment-Flows",
        "<strong>Online-Buchungen</strong> mit Kalender und Erinnerungen",
        "<strong>Sauber dokumentierte Grundlagen</strong> für Buchungsstrecken",
        "<strong>Tracking</strong> für Anfragen und Conversions"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761069237/admin_gallery/bupxdaaopyjco898drrl.webp",
        alt: "E-Commerce und Buchungssysteme für Websites in Berlin"
      }
    },
    {
      name: "<a href='/leistungen/rechtliches-sicherheit' class='wd-link--accent'>Rechtliches und Sicherheit</a>",
      description: "Datenschutzbewusste technische Grundlage und Sicherheit für Vertrauen bei Besuchern.",
      features: [
        "<strong>Impressum</strong> und Datenschutzseiten technisch einbindbar",
        "<strong>Datenschutz-Grundlagen</strong> bei der technischen Umsetzung berücksichtigt",
        "<strong>Cookie-/Consent-Hinweise</strong> je nach eingesetzten Tools vorbereitet",
        "<strong>Schutz</strong> vor Spam und Bots"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1762705635/admin_gallery/swxxej4dyupgnp7vzzds.webp",
        alt: "Rechtliches und Sicherheit Grafik"
      }
    },
    {
      name: "<a href='/leistungen/inhalte-texte-content' class='wd-link--accent'>Inhalte & Texte</a>",
      description: "Klare, verständliche Inhalte mit Fokus auf Nutzen und Anfrage.",
      features: [
        "<strong>Startseiten-Must-haves</strong> für lokale Sichtbarkeit",
        "<strong>Vertrauensseiten</strong> wie Über uns und Referenzen",
        "<strong>Keyword-optimierte Texte</strong> ohne Überoptimierung",
        "<strong>Ratgeber/Blog</strong> für langfristige Reichweite"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1756655275/admin_gallery/hjvleomny0wd8xxtjnzi.webp",
        alt: "Inhalte & Texte Grafik"
      }
    }
  ];

  const packages = [
    {
      name: "Start",
      price: priceLabel("start") || "nach Angebot",
      anchor: "start",
      tagline: "Kompakt starten",
      image: "/images/basis.webp",
      description: "Ideal für kleine Unternehmen, die einen professionellen Einstieg mit klar begrenztem Umfang brauchen.",
      features: [
        "1 bis 3 Seiten oder klarer Onepager",
        "Gelieferte Inhalte strukturiert eingebunden",
        "SEO-Grundlagen für Title, H1, Meta Description und Struktur",
        "Rechtstexte technisch einbindbar, keine Rechtsberatung",
        "Eine Feedbackrunde"
      ]
    },
    {
      name: "Business",
      price: priceLabel("business") || "nach Angebot",
      anchor: "business",
      tagline: "Beliebt bei KMU",
      image: "/images/business.webp",
      popular: true,
      description: "Für kleine Unternehmen, die mehrere Leistungen erklären und den Start in die Berufswelt professionell abbilden wollen.",
      features: [
        "Ca. 4 bis 7 Seiten inklusive Leistungen und Über-uns-/Team-Seite",
        "Kontaktformular für qualifizierte Anfragen enthalten",
        "<strong>OnPage-SEO</strong> für Struktur, interne Links und Meta-Daten",
        "Blog optional gegen Mehrkosten möglich",
        "Zwei Feedbackrunden"
      ]
    },
    {
      name: "Wachstum",
      price: priceLabel("wachstum") || "nach Angebot",
      anchor: "wachstum",
      tagline: "Mehr Struktur",
      image: "/images/premium.webp",
      description: "Für umfangreichere Onlineangebote, lokale Kampagnen und Unternehmen in Berlin mit mehr Content-Tiefe.",
      features: [
        "Ca. 8 bis 12 Seiten mit Strategie und SEO-Struktur",
        "Buchung, Shop und Portale nach Umfang als Add-on",
        "Erweiterte Content-Struktur für lokale Sichtbarkeit",
        "Erweiterte Seitenstruktur für lokale Sichtbarkeit",
        "Individuelle Module separat kalkuliert"
      ]
    }
  ];

  const caseStudies = [
    {
      name: "Zur alten Backstube · Café in Rosenthal",
      summary:
        "Eine warme Referenz-Website für ein lokales Café mit klarer Angebotsstruktur, stimmiger Bildsprache und einfachen Kontaktwegen.",
      bullets: [
        "Ruhige Seitenstruktur für Angebot, Atmosphäre und Kontakt",
        "Bildsprache und Texte auf die lokale Positionierung abgestimmt",
        "Besuchsinformationen und Anfragewege sichtbar eingebunden"
      ],
      quote: "Das Ergebnis sieht einfach super aus. Es ist jetzt viel einfacher Tische zu reservieren.",
      link: "/referenzen/zur-alten-backstube",
      image: "/images/review-bg.webp"
    },
    {
      name: "TM Sauber & Mehr · lokaler Dienstleister",
      summary:
        "Ein sachlicher Webauftritt für einen lokalen Dienstleister mit klar geordneten Leistungen und direktem Anfrageweg.",
      bullets: [
        "Leistungsbereiche verständlich und übersichtlich geordnet",
        "Vertrauenssignale an wichtigen Stellen platziert",
        "Anfragewege prominent in den Seitenfluss eingebunden"
      ],
      quote: "Super Service und top Preis-Leistung. Alle unsere Wünsche wurden schnell, professionell und unkompliziert umgesetzt.",
      link: "/referenzen/tm-sauber-mehr",
      image: "/images/default-blog.webp"
    }

  ];

  const processSteps = [
    {
      name: "Analyse & Ziele",
      description: "Wir analysieren Angebot, Zielgruppe und Wettbewerb in Berlin. Daraus entsteht eine klare SEO- und Inhaltsstrategie für deine Website."
    },
    {
      name: "Wireframe & Inhalte",
      description: "Wir planen Seitenstruktur, Texte, Anfragewege und Designrichtung. So entsteht ein belastbares Konzept statt einer austauschbaren Standardseite."
    },
    {
      name: "Design & Entwicklung",
      description: "Wir entwickeln deine Seite mobil optimiert, schnell und technisch sauber. Danach folgt eine Testphase mit Feedbackschleifen und finalen Anpassungen."
    },
    {
      name: "Launch & Tracking",
      description: "Nach Freigabe geht die Website live. Tracking und Search Console können im vereinbarten Umfang eingerichtet werden, damit Sichtbarkeit, Klicks und Anfragewege nachvollziehbar bleiben."

    },
    {
      name: "Wartung & Wachstum",
      description: "Nach dem Launch können Inhalte, Technik und lokale Sichtbarkeit weiterentwickelt werden. So bleibt deine Website eine belastbare Grundlage für Anfragen."
    }
  ];

  const districts = [
    "Mitte",
    "Friedrichshain",
    "Prenzlauer Berg",
    "Kreuzberg",
    "Charlottenburg",
    // "Schöneberg",
    // "Neukölln",
    "Lichtenberg"
    // "Treptow"
  ];

  const industries = [
    {
      name: "Cafés & Gastronomie",
      description: "Reservierungen, Menüs und Events mit Conversion-Fokus.",
      link: "/branchen/webdesign-cafe",
      image: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1758977436/admin_gallery/vycov9ggowbm7ql3ad3t.webp"
    },
    {
      name: "Handwerk & Dienstleistung",
      description: "Leistungsseiten mit Referenzen, Formularen und Angebotsanfrage.",
      link: "/branchen",
      image: "/images/handwerker-min.webp"
    },
    {
      name: "Immobilien & Beratung",
      description: "Exposés, Lead-Formulare und vertrauensstarke Profile.",
      link: "/branchen/webdesign-immobilienmakler",
      image: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1760635862/admin_gallery/xpwedho5napbohiqr2gp.webp"
    },
    {
      name: "Gesundheit, Coaching & Beratung",
      description: "Corporate Design, Terminbuchungen und sichere Kommunikation.",
      link: "/branchen/webdesign-fitnesscoach",
      image: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761068980/admin_gallery/s1kcjikrig0zeuv2jgdq.webp"
    },
    {
      name: "Online-Shops & E-Commerce",
      description: "Produktdarstellung, Checkout-Optimierung und klare Conversion-Wege.",
      link: "/pakete/wachstum",
      image: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761847762/admin_gallery/fqq4ofor4dmsbszhoqqs.webp"
    },
    {
      name: "Weitere Branchen",
      description: "Wir bieten noch viele weitere Branchenlösungen an. Schau gerne vorbei!",
      link: "/branchen",
      image: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1760635311/admin_gallery/kgfq7wwg6aqh8ikxhce6.webp"
    }
  ];

  const faqs = [
    {
      question: "Was kostet es, eine Webseite in Berlin erstellen zu lassen?",
      answer:
        `Je nach Umfang startet eine professionelle Website bei <strong>${lowestPackagePriceLabel || "einem klar eingeordneten Paketumfang"}</strong>. Start, Business, Wachstum und individuelle Projekte sind auf der Seite <a href='/pakete'>Pakete</a> transparent beschrieben.`
    },
    {
      question: "Wie lange dauert eine Website-Erstellung in Berlin?",
      answer:
        "Typischerweise <strong>4 bis 6 Wochen</strong>, je nach Umfang und Feedbackgeschwindigkeit. Onepager gehen oft schneller, größere Projekte brauchen mehr Abstimmung."
    },
    {
      question: "Ist SEO bei der Website-Erstellung direkt dabei?",
      answer:
        "Ja. Wir setzen eine saubere SEO-Grundlage mit strukturierten Seiten, optimierten Meta-Daten, interner Verlinkung und Local-SEO-Grundlagen für Berlin."
    },
    {
      question: "Erstellt ihr auch Inhalte und Texte?",
      answer:
        "Ja. Wir unterstützen bei Seitentexten, Leistungsbeschreibungen und Conversion-Texten, damit deine Website nicht nur gut aussieht, sondern Anfragewege klarer macht."
    },
    {
      question: "Ist meine Website nachher mobil optimiert?",
      answer:
        "Ja. Jede Seite wird für Smartphone, Tablet und Desktop optimiert. Mobile UX und Ladezeit sind bei lokalem SEO ein zentraler Rankingfaktor."
    },
    {
      question: "Unterstützt ihr beim Google-Unternehmensprofil?",
      answer:
        "Ja. Wir helfen bei Struktur, Leistungen, Kategorien und lokalen Signalen, damit du für relevante Suchanfragen in Berlin besser sichtbar bist."
    },
    {
      question: "Was passiert nach dem Launch der Website?",
      answer:
        "Nach dem Livegang kannst du optional Wartung und SEO-Betreuung buchen. So bleiben Technik, Inhalte und Rankings dauerhaft auf Kurs."
    },
    {
      question: "Wie läuft ein Erstgespräch ab?",
      answer:
        "Kostenlos und unverbindlich: Wir analysieren dein aktuelles Setup und zeigen dir konkrete Hebel für mehr Sichtbarkeit und Anfragen."
    },
    {
      question: "Warum mit einem Webdesigner aus Berlin arbeiten?",
      answer: "Ein lokaler Anbieter kennt Markt, Wettbewerb und Suchverhalten vor Ort. Das hilft bei Content, Local SEO und schnelleren Entscheidungen in der Umsetzung."
    },
    {
      question: "Welche Berliner Bezirke betreut ihr?",
      answer: "Wir betreuen Kunden in Mitte, Kreuzberg, Friedrichshain, Prenzlauer Berg, Charlottenburg, Lichtenberg und weiteren Bezirken. Alle Bezirksseiten findest du unter <a href='/webdesign-berlin'>Webdesign Berlin</a>."
    }
  ];

  const trust = [
    "<strong>Datenschutz und technische Stabilität</strong> gehören zur technischen Grundlage. Externe Dienste, Formulare, Logins und Cookie-/Consent-Hinweise werden bewusst geplant und technisch vorbereitet. Das ersetzt keine rechtliche Prüfung; bei Bedarf sollten Rechtstexte und Datenschutzfragen extern geprüft werden.",
    "Weiterhin werden Seiten mit <strong>TLS-Verschlüsselung</strong> ausgeliefert. Das schützt die Übertragung zwischen Browser und Server und reduziert Risiken beim Versand von Formular- oder Login-Daten. Je nach eingesetzten Tools können weitere technische und organisatorische Maßnahmen nötig sein.",
    "Weiterhin bieten wir auf Wunsch <strong>Backups für deine Webseite</strong> an. Dabei kannst du eigene Intervalle festlegen. Die Preise richten sich dabei an der Menge der Daten und der Häufigkeit der Datensicherungen.",
    "Falls Probleme auftreten, erhältst du <strong>persönlichen Support im vereinbarten Rahmen</strong>. Updates und zusätzliche Funktionen werden abgestimmt geplant, damit deine Kunden möglichst wenig beeinträchtigt werden.",
    "Wenn du nach der Fertigstellung des Webdesigns und der Website weitere <strong>Unterstützung für deine Sichtbarkeit bei Google</strong> benötigst, stehen wir dir gerne zur Seite.",
    "Der Support für deine Website endet nicht mit der Fertigstellung des Webdesigns und auch nicht, wenn zum jetzigen Zeitpunkt keine Probleme bestehen. Wir stehen dir als <strong>verlässlicher Webdesigner in Berlin auch in Zukunft zur Seite</strong>."
  ];

  const resources = [
    { label: "Webdesign Berlin", href: "/webdesign-berlin" },
    { label: "Website Relaunch Berlin", href: "/leistungen/website-relaunch" },
    { label: "Ablauf Webdesign Berlin", href: "/ablauf" },
    { label: "Was kostet eine Website in Berlin?", href: "/ratgeber/website-kosten-berlin" },
    { label: "Ablauf, Dauer und Kosten", href: "/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten" },
    { label: "Baukasten vs. professionelle Website", href: "/ratgeber/baukasten-vs-professionelle-website" }
  ];

  const seoGuides = interpolatePricingTokens(SEO_GUIDE_CLUSTER, res.locals.packagePricing || {}, { lng }).map((guide) => ({
    title: guide.title,
    excerpt: guide.excerpt,
    slug: guide.slug,
    href: `/ratgeber/${guide.slug}`
  }));

  const pageCopy = isEn
    ? {
      homeLabel: "Home",
      googleProfile: "Google Profile",
      videoTitle: "What to expect in your first consultation:",
      videoIntro: "In this short video I explain how we align your website for visibility, performance, and qualified leads.",
      videoGroupLabel: "YouTube video placeholder",
      videoPreviewAlt: "Preview image: What to expect in your first consultation",
      videoLoadLabel: "Load video",
      videoHint: "When you play the video, data is transmitted to YouTube (Google). More details are available in our",
      videoPolicyLabel: "privacy policy",
      videoConsentBtn: "Load and play video",
      videoNoscript: "Watch on YouTube",
      servicesTitle: "What is included in our web design service in Berlin?",
      packagesBadge: "Our packages",
      packagesTitle: "How much does a website in Berlin cost in 2026?",
      packagesText1: `If you want to have a website built in Berlin, pricing depends mainly on scope, features, and content. Start: ${priceLabel("start") || "scoped offer"}, Business: ${priceLabel("business") || "scoped offer"}, Growth: ${priceLabel("wachstum") || "scoped offer"}, individual projects: ${priceLabel("individuell") || "custom estimate"}.`,
      packagesText2: "More complex projects with shop functionality, booking systems, multilingual setup, or custom integrations can be higher. What matters most: your website should not only look good, but generate measurable inquiries and be technically clean for Google.",
      packagesText3: "Choose the package that fits your current stage and business goal:",
      packageBtnPrimary: "Choose package",
      packageBtnSecondary: "Request details",
      packageIncludedTitle: "What is actually included in a web design package?",
      packageIncludedText1: `Already in the <a href='/en/pakete/start'>Start package ${priceLabel("start") || ""}</a>, you get a professionally designed compact website with mobile optimization, clear user flows and technical SEO fundamentals.`,
      packageIncludedText2: `In the <a href='/en/pakete/business'>Business package ${priceLabel("business") || ""}</a>, the focus is on multiple service pages and stronger Google visibility. For larger projects with shop or booking features, <a href='/en/pakete/wachstum'>Growth ${priceLabel("wachstum") || ""}</a> or an individual estimate is the cleaner fit.`,
      casesTitle: "Berlin web design references",
      caseLinkLabel: "View reference",
      processTitle: "Website development in Berlin - how the process works",
      processLead: "From briefing to launch, most projects take just 4 to 6 weeks - with clear feedback loops and transparent milestones.",
      berlinTitle: "Web design across all Berlin districts",
      berlinLead: "If you want to have a website built in Berlin, local relevance matters. We work across all districts and optimize content, structure, and local SEO signals so you are visible where your customers actually search.",
      districtsLabel: "Berlin districts",
      industriesTitle: "Web design in Berlin for different industries",
      industryMore: "Learn more",
      faqTitle: "Frequently asked questions about web design in Berlin",
      trustTitle: "Secure, privacy-aware, and continuously supported",
      trustLead: "With Komplett Webdesign, your website stays stable, privacy-aware, and supported long-term - without technical stress.",
      resourcesTitle: "Additional resources for web design and SEO in Berlin",
      resourcesLead: "These guides help you improve your digital presence strategically, instead of only maintaining it.",
      contactNameLabel: "Name",
      contactNamePlaceholder: "Max Mustermann",
      contactEmailLabel: "Email",
      contactEmailPlaceholder: "hello@company.com",
      contactGoalLabel: "Project goal",
      contactGoalPlaceholder: "e.g. relaunch, landing page, SEO",
      contactTimelineLabel: "Preferred timeline",
      contactTimelinePlaceholder: "e.g. immediately, Q3 2026",
      contactMessageLabel: "What should we know?",
      contactMessagePlaceholder: "Briefly describe your project",
      contactFileLabel: "Upload files (optional)",
      contactFileHint: "You can upload up to 10 files (max. 15 MB total). The confirmation email includes all file names as an overview.",
      contactSubmit: "Book a free initial consultation",
      contactTitle: "Ready to get started?",
      contactLead: "If you want to have your website built professionally in Berlin, let's talk. We will show you concrete steps for stronger visibility, better rankings, and more inquiries.<br>You are looking for general information about <a href='/en'>professional website development</a>? On our homepage you can find all services at a glance - including for clients outside Berlin.",
      directCallLabel: "Or call us directly"
    }
    : {
      homeLabel: "Startseite",
      googleProfile: "Google Profil",
      videoTitle: "Was dich im Erstgespräch erwartet:",
      videoIntro: "In diesem Video erkläre ich in wenigen Minuten, wie wir gemeinsam deine Website auf Sichtbarkeit, Performance und Anfragen trimmen.",
      videoGroupLabel: "YouTube Video Platzhalter",
      videoPreviewAlt: "Vorschaubild: Was dich im Erstgespräch erwartet",
      videoLoadLabel: "Video laden",
      videoHint: "Beim Abspielen des Videos werden Daten an YouTube (Google) übertragen. Mehr Informationen findest du in unserer",
      videoPolicyLabel: "Datenschutzerklärung",
      videoConsentBtn: "Video laden und abspielen",
      videoNoscript: "auf YouTube ansehen",
      servicesTitle: "Was beinhaltet unser Webdesign in Berlin?",
      packagesBadge: "Unsere Pakete",
      packagesTitle: "Was kostet eine Website 2026 in Berlin?",
      packagesText1: `Wenn du eine <strong>Webseite in Berlin erstellen lassen</strong> möchtest, hängen die Kosten vor allem von Umfang, Funktionen und Content ab. Start beginnt bei ${priceLabel("start") || "einem klaren Angebot"}, Business bei ${priceLabel("business") || "einem klaren Angebot"}, Wachstum bei ${priceLabel("wachstum") || "einem klaren Angebot"} und individuelle Projekte bei ${priceLabel("individuell") || "einem individuellen Angebot"}.`,
      packagesText2: "Komplexe Projekte mit Shop, Buchungssystem, Mehrsprachigkeit oder individuellen Integrationen können deutlich darüber liegen. Wichtig ist: Eine Website sollte nicht nur gut aussehen, sondern Anfragewege nachvollziehbar unterstützen und für Google sauber vorbereitet sein.",
      packagesText3: "Wähle das Paket, das zu deiner Ausgangslage und deinem Ziel passt:",
      packageBtnPrimary: "Paket wählen",
      packageBtnSecondary: "Details anfragen",
      packageIncludedTitle: "Was ist im Webdesign-Paket konkret enthalten?",
      packageIncludedText1: `Bereits im <a href='/pakete/start'>Start-Paket ${priceLabel("start") || ""}</a> bekommst du eine professionell gestaltete kompakte Website mit mobiloptimiertem Aufbau, klarer Nutzerführung und technischen SEO-Grundlagen.`,
      packageIncludedText2: `Im <a href='/pakete/business'>Business-Paket ${priceLabel("business") || ""}</a> liegt der Fokus auf mehreren Leistungsseiten und besserer Sichtbarkeit bei Google. Für größere Vorhaben mit Shop oder Buchungssystem ist <a href='/pakete/wachstum'>Wachstum ${priceLabel("wachstum") || ""}</a> oder ein individuelles Angebot die sauberere Wahl.`,
      casesTitle: "Erste echte Webdesign-Projekte aus Berlin",
      caseLinkLabel: "Referenz ansehen",
      processTitle: "Website in Berlin erstellen lassen - so läuft der Prozess ab",
      processLead: "Vom Briefing bis zum Livegang vergehen meist nur 4 bis 6 Wochen - mit klaren Feedbackschleifen und transparenten Milestones.",
      berlinTitle: "Webdesign in Berlin und allen Bezirken",
      berlinLead: "Wenn du eine Website in Berlin erstellen lassen willst, ist lokaler Bezug entscheidend. Wir arbeiten in allen Berliner Bezirken und optimieren Inhalte, Struktur und lokale Signale so, dass du dort sichtbar bist, wo deine Kunden tatsächlich suchen.",
      districtsLabel: "Berliner Bezirke",
      industriesTitle: "Webdesign Berlin für verschiedene Branchen",
      industryMore: "Mehr erfahren",
      faqTitle: "Häufige Fragen zu Webdesign in Berlin",
      trustTitle: "Sicher, datenschutzbewusst & betreut",
      trustLead: "Mit Komplett Webdesign bleibt dein Auftritt stabil, technisch sauber und dauerhaft betreut - ohne Technikstress.",
      resourcesTitle: "Weiterführende Ressourcen zu Webdesign und SEO in Berlin",
      resourcesLead: "Diese Guides helfen dir, deinen digitalen Auftritt strategisch weiterzuentwickeln - statt nur zu verwalten.",
      contactNameLabel: "Name",
      contactNamePlaceholder: "Max Mustermann",
      contactEmailLabel: "E-Mail",
      contactEmailPlaceholder: "hallo@unternehmen.de",
      contactGoalLabel: "Projektziel",
      contactGoalPlaceholder: "z. B. Relaunch, Landingpage, SEO",
      contactTimelineLabel: "Wunsch-Timing",
      contactTimelinePlaceholder: "z. B. sofort, Q3 2026",
      contactMessageLabel: "Was sollen wir wissen?",
      contactMessagePlaceholder: "Beschreibe kurz dein Projekt",
      contactFileLabel: "Dateien hochladen (optional)",
      contactFileHint: "Du kannst bis zu 10 Dateien (max. 15 MB insgesamt) hinzufügen. In der Bestätigungsmail erhältst du die Dateinamen als Übersicht.",
      contactSubmit: "Kostenloses Erstgespräch sichern",
      contactTitle: "Bereit, loszulegen?",
      contactLead: "Wenn du deine Webseite in Berlin professionell erstellen lassen willst, lass uns sprechen. Wir zeigen dir konkrete Schritte für bessere Struktur, lokale Sichtbarkeit und klare Anfragewege.<br>Du suchst allgemeine Informationen zur <a href='/'>professionellen Websiteerstellung</a>? Auf unserer Hauptseite findest du alle Leistungen im Überblick - auch für Kunden außerhalb von Berlin.",
      directCallLabel: "Oder direkt anrufen"
    };

  if (isEn) {
    metaTitle = "Web Design Berlin: Professional Websites | Komplett Webdesign";
    metaDescription =
      `Get a website built in Berlin: modern web design, local SEO, hosting, and ongoing support for freelancers and SMEs ${lowestPackagePriceLabel || "by quote"}.`;

    hero.title = "Web Design in Berlin: Get a website that wins customers";
    hero.description =
      "Want to be found more easily in Berlin? We build your website professionally, mobile-first, and focused on qualified inquiries. Including SEO basics, hosting, and support.";
    // hero.answerBlock =
    //   "If you want stronger local visibility in Berlin, your website needs more than visual polish. We combine structure, search intent, and conversion copy so visitors quickly understand your offer and move into consultation, contact, or a technical website check.";
     hero.ctaPrimary = { label: "Book a free initial consultation", href: contactPath };
    hero.ctaSecondary = { label: "View web design packages", href: "/en/pakete" };
    hero.ctaTertiary = { label: "Run website tester", href: "/en/website-tester" };
    hero.rating.label = formatGoogleRating(lng);
    hero.image.alt = "Sören Blocksdorf - Web Designer Berlin";
    hero.trustBadges = [
      `Professional website in Berlin ${lowestPackagePriceLabel || "by quote"}`,
      "Custom design instead of website builder templates",
      "Response within 24 hours"
    ];

    audience.title = "Web design for Berlin freelancers, local businesses, and SMEs";
    audience.description =
      "Many Berlin websites look good but generate too few inquiries. We combine design, technology, and local SEO so you become more visible for searches like <strong>\"web design Berlin\"</strong> or <strong>\"website development Berlin\"</strong>. You can find additional practical SEO tips in our <a href='/ratgeber'>guides</a>.";
    audience.painPoints = [
      "Too few Google inquiries despite an existing website",
      "Slow loading times and weak mobile experience",
      "Unclear messaging without clear conversion goals"
    ];

    services.splice(0, services.length,
      {
        name: "<a href='/leistungen/website-relaunch' class='wd-link--accent'>Web Design & UX</a>",
        description: "Custom layouts with clear user journeys so visitors turn into leads faster.",
        features: [
          "<strong><a href='/leistungen/responsives-design-mobile' class='wd-link--accent'>Responsive design</a></strong> for desktop, tablet, and smartphone",
          "<strong>Core Web Vitals</strong> with performance focus",
          "<strong>Clear UX</strong> for better conversion rates",
          "<strong>CMS</strong> for easy content management"
        ],
        image: services[0].image
      },
      {
        name: "<a href='/leistungen/local-seo' class='wd-link--accent'>SEO & Local SEO</a>",
        description: "We combine keyword strategy with local intent so you rank better in Berlin.",
        features: [
          "<strong>On-page SEO</strong> for titles, H1, structure, and internal links",
          "<strong>Local SEO</strong> including Google Business Profile",
          "<strong>Schema.org</strong> for stronger search result presentation",
          "<strong>Keyword mapping</strong> for districts and services"
        ],
        image: services[1].image
      },
      {
        name: "<a href='/leistungen/laufende-kosten-website' class='wd-link--accent'>Hosting & Maintenance</a>",
        description: "Stable infrastructure for speed, security, and fewer outages.",
        features: [
          "<strong>Hosting</strong> in ISO-certified data centers",
          "<strong>Daily backups</strong> and recovery",
          "<strong>Monitoring</strong> for security and uptime",
          "<strong>Regular checks</strong> for performance"
        ],
        image: services[2].image
      },
      {
        name: "E-commerce & Booking",
        description: "We integrate booking and payment flows that are practical for daily operations.",
        features: [
          "<strong>Stripe & PayPal</strong> payment flows",
          "<strong>Online booking</strong> with calendar and reminders",
          "<strong>Documented technical setup</strong> for booking journeys",
          "<strong>Tracking</strong> for inquiries and conversions"
        ],
        image: services[3].image
      },
      {
        name: "<a href='/leistungen/rechtliches-sicherheit' class='wd-link--accent'>Compliance & Security</a>",
        description: "Privacy-conscious technical setup and security basics to build trust.",
        features: [
          "<strong>Legal notice</strong> and privacy pages technically integrated",
          "<strong>Privacy basics</strong> considered during implementation",
          "<strong>Cookie/consent notices</strong> prepared depending on the tools used",
          "<strong>Protection</strong> against spam and bots"
        ],
        image: services[4].image
      },
      {
        name: "<a href='/leistungen/inhalte-texte-content' class='wd-link--accent'>Content & Copy</a>",
        description: "Clear and persuasive content focused on customer value and inquiries.",
        features: [
          "<strong>Homepage essentials</strong> for local visibility",
          "<strong>Trust pages</strong> such as About and References",
          "<strong>Keyword-optimized content</strong> without over-optimization",
          "<strong>Guides/blog</strong> for long-term reach"
        ],
        image: services[5].image
      }
    );

    packages.splice(0, packages.length,
      {
        name: "Start",
        price: priceLabel("start") || "by quote",
        anchor: "start",
        tagline: "Compact launch",
        image: "/images/basis.webp",
        description: "Ideal for solo professionals who want a compact professional website with clear scope.",
        features: [
          "1 to 3 pages or a clear one-pager",
          "<strong>Mobile-first</strong> layout including performance checks",
          "Technical SEO fundamentals",
          "Legal pages can be technically integrated",
          "One feedback round"
        ]
      },
      {
        name: "Business",
        price: priceLabel("business") || "by quote",
        anchor: "business",
        tagline: "Most popular for SMEs",
        image: "/images/business.webp",
        popular: true,
        description: "For companies with multiple services and a clear local SEO focus.",
        features: [
          "Multiple service pages with keyword strategy",
          "<strong>Blog/news</strong> for ongoing content growth",
          "<strong>Local SEO</strong> and Google Business optimization",
          "Conversion-focused contact journeys",
          "Optional maintenance and SEO reporting"
        ]
      },
      {
        name: "Growth",
        price: priceLabel("wachstum") || "by quote",
        anchor: "wachstum",
        tagline: "More structure",
        image: "/images/premium.webp",
        description: "For larger websites with strategy, content depth and scoped expansion modules.",
        features: [
          "Strategy workshop and customer-journey mapping",
          "Custom design systems and animations",
          "<strong>Content production</strong> (text, photo, video) as needed",
          "Booking, shop and portals scoped as add-ons",
          "Ongoing optimization available separately"
        ]
      }
    );

    caseStudies.splice(0, caseStudies.length,
      {
        name: "Zur alten Backstube · cafe in Rosenthal",
        summary: "A warm reference website for a local cafe with clear offer structure, fitting imagery, and simple contact paths.",
        bullets: [
          "Calm page structure for offer, atmosphere, and contact",
          "Imagery and copy aligned with the local positioning",
          "Visit information and inquiry paths placed clearly"
        ],
        quote: "The result looks great. It is now much easier to reserve tables.",
        link: "/referenzen/zur-alten-backstube",
        image: "/images/review-bg.webp"
      },
      {
        name: "TM Sauber & Mehr · local service provider",
        summary: "A clear website for a local service provider with well-structured services and a direct inquiry path.",
        bullets: [
          "Service areas organized clearly and understandably",
          "Trust signals placed at important decision points",
          "Inquiry paths integrated prominently into the page flow"
        ],
        quote: "Great service and excellent value for money. All our requests were implemented quickly, professionally, and without complications.",
        link: "/referenzen/tm-sauber-mehr",
        image: "/images/default-blog.webp"
      }
    );

    processSteps.splice(0, processSteps.length,
      { name: "Analysis & Goals", description: "We analyze your offer, target audience, and local competition in Berlin. This creates a clear SEO and content strategy for your website." },
      { name: "Wireframe & Content", description: "We define page structure, messaging, calls to action, and design direction. The result is a robust concept instead of a generic template site." },
      { name: "Design & Development", description: "We build your site mobile-first, fast, and technically clean. Then we run a testing phase with feedback loops and final refinements." },
      { name: "Launch & Tracking", description: "After approval, your website goes live. Tracking and Search Console can be configured within the agreed scope so visibility, clicks, and inquiry paths remain traceable." },
      { name: "Maintenance & Growth", description: "After launch, content, technology, and local visibility can be developed further. This keeps your website a reliable foundation for inquiries." }
    );

    industries.splice(0, industries.length,
      { ...industries[0], name: "Cafes & Hospitality", description: "Reservations, menus, and events with a conversion focus." },
      { ...industries[1], name: "Trades & Local Services", description: "Service pages with references, forms, and quote requests." },
      { ...industries[2], name: "Real Estate & Consulting", description: "Property showcases, lead forms, and trust-building profiles." },
      { ...industries[3], name: "Health, Coaching & Consulting", description: "Brand-driven design, appointment booking, and secure communication." },
      { ...industries[4], name: "Online Shops & E-commerce", description: "Product presentation, checkout optimization, and clear conversion paths." },
      { ...industries[5], name: "More industries", description: "We offer many additional industry solutions - have a look." }
    );

    faqs.splice(0, faqs.length,
      {
        question: "How much does it cost to get a website built in Berlin?",
        answer: `Depending on scope, a professional website starts at <strong>${lowestPackagePriceLabel || "a scoped offer"}</strong>. Start, Business, Growth and individual projects are described transparently on our <a href='/en/pakete'>packages</a> page.`
      },
      {
        question: "How long does website development in Berlin take?",
        answer: "Typically <strong>4 to 6 weeks</strong>, depending on scope and feedback speed. One-page projects are often faster, larger websites require more alignment."
      },
      {
        question: "Is SEO included from the start?",
        answer: "Yes. We set up a clean SEO foundation with structured pages, optimized meta data, internal linking, and local SEO basics for Berlin."
      },
      {
        question: "Do you also create content and copy?",
        answer: "Yes. We support website copy, service descriptions, and conversion-focused content so your site not only looks good but also generates inquiries."
      },
      {
        question: "Will my website be mobile optimized?",
        answer: "Yes. Every page is optimized for smartphone, tablet, and desktop. Mobile UX and performance are central ranking factors in local SEO."
      },
      {
        question: "Do you support Google Business Profile setup?",
        answer: "Yes. We help with structure, services, categories, and local signals so you become more visible for relevant searches in Berlin."
      },
      {
        question: "What happens after launch?",
        answer: "After go-live, you can optionally book maintenance and SEO support. This keeps your technology, content, and rankings on track."
      },
      {
        question: "How does the first consultation work?",
        answer: "Free and non-binding: we analyze your current setup and show concrete levers for better visibility and more inquiries."
      },
      {
        question: "Why work with a Berlin-based web designer?",
        answer: "A local provider understands market dynamics, competition, and search intent on-site. That helps with content quality, local SEO, and faster implementation decisions."
      },
      {
        question: "Which Berlin districts do you cover?",
        answer: `We support clients in Mitte, Kreuzberg, Friedrichshain, Prenzlauer Berg, Charlottenburg, Lichtenberg, and other districts. All district pages are listed under <a href='${pagePath}'>Webdesign Berlin</a>.`
      }
    );

    trust.splice(0, trust.length,
      "<strong>Privacy and technical stability</strong> are part of the technical baseline. External services, forms, login areas and cookie/consent notices are planned deliberately and prepared technically. This does not replace legal review when needed.",
      "Websites are delivered with <strong>TLS encryption</strong>. This protects data transmission between browser and server and reduces risks when forms or login data are sent. Depending on the tools used, additional technical and organizational measures may be needed.",
      "On request, we provide <strong>regular backups</strong> with custom intervals. Pricing depends on data volume and backup frequency.",
      "If issues arise, we provide <strong>personal support within the agreed scope</strong>. Updates and feature releases are scheduled to minimize impact on your users.",
      "If you need further <strong>support for visibility on Google</strong> after launch, we can continue with structured SEO support.",
      "Support does not end at launch. We stay available as your <strong>reliable web design partner in Berlin</strong> for the long term."
    );

    resources.splice(0, resources.length,
      { label: "Website costs in Berlin", href: "/ratgeber/website-kosten-berlin" },
      { label: "Process, timeline, and costs", href: "/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten" },
      { label: "Website builder vs. professional website", href: "/ratgeber/baukasten-vs-professionelle-website" }
    );
  }

  // ---------- helpers ----------
  const stripHtml = (s = "") =>
    String(s)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const toAbsUrl = (url = "") => {
    const u = String(url).trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("//")) return `https:${u}`;
    return `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  // ---------- Schema Blocks ----------
  const schema = {
    organization: buildOrganizationSchema(SITE_URL),

    website: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      "url": `${SITE_URL}/`,
      "name": "Komplett Webdesign",
      "publisher": { "@id": `${SITE_URL}/#organization` },
      "inLanguage": isEn ? "en-US" : "de-DE"
    },

    breadcrumbList: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${webdesignBerlinUrl}#breadcrumbs`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": isEn ? "Home" : "Startseite",
          "item": `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Webdesign Berlin",
          "item": webdesignBerlinUrl
        }
      ]
    },

    service: {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${webdesignBerlinUrl}#service`,
      "name": isEn ? "Web Design Berlin" : "Webdesign Berlin",
      "serviceType": isEn ? "Web design and website development" : "Webdesign und Website-Erstellung",
      "description":
        isEn
          ? "Custom websites for small companies, self-employed people and local service providers in Berlin and Brandenburg."
          : "Individuelle Websites für kleine Unternehmen, Selbstständige und lokale Dienstleister in Berlin und Brandenburg.",
      "url": webdesignBerlinUrl,
      "inLanguage": isEn ? "en-US" : "de-DE",
      "image": toAbsUrl("/images/heroBg.webp"),
      "provider": { "@id": `${SITE_URL}/#organization` },
      "areaServed": [{ "@type": "City", "name": "Berlin" }],
      "audience": {
        "@type": "BusinessAudience",
        "audienceType": isEn ? "Small businesses and local service providers" : "Kleine Unternehmen und lokale Dienstleister"
      }
    },

    webPage: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${webdesignBerlinUrl}#webpage`,
      "name": isEn ? "Web Design Berlin - Professional Website Development" : "Webdesign Berlin – Website erstellen lassen vom Berliner Webdesigner",
      "description": metaDescription,
      "url": webdesignBerlinUrl,
      "inLanguage": isEn ? "en-US" : "de-DE",

      "isPartOf": { "@id": `${SITE_URL}/#website` },
      "publisher": { "@id": `${SITE_URL}/#organization` },

      // saubere Verknüpfung
      "breadcrumb": { "@id": `${webdesignBerlinUrl}#breadcrumbs` },
      "about": { "@id": `${webdesignBerlinUrl}#service` },
      "mainEntity": { "@id": `${webdesignBerlinUrl}#service` },

      "primaryImageOfPage": {
        "@type": "ImageObject",
        "@id": `${webdesignBerlinUrl}#primaryimage`,
        "url": toAbsUrl("/images/heroBg.webp")
      }
    },

    faqPage: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${webdesignBerlinUrl}#faq`,
      "url": webdesignBerlinUrl,
      "mainEntity": faqs.map(({ question, answer }) => ({
        "@type": "Question",
        "name": stripHtml(question),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": stripHtml(answer)
        }
      }))
    },

    videoObject: {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "@id": `${webdesignBerlinUrl}#video`,
      "name": isEn ? "What to expect in your first consultation" : "Was dich im Erstgespräch erwartet",
      "description": isEn ? "Short overview: process, outcomes, and what to expect in your first consultation." : "Kurz erklärt: Ablauf, Ergebnisse und was dich im Erstgespräch erwartet.",
      "thumbnailUrl": `https://i.ytimg.com/vi/${YOUTUBE_ID}/hqdefault.jpg`,
      "uploadDate": VIDEO_UPLOAD_ISO,
      "duration": "PT3M",
      "embedUrl": `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}`,
      "contentUrl": `https://www.youtube.com/watch?v=${YOUTUBE_ID}`,
      "publisher": { "@id": `${SITE_URL}/#organization` },
      "isPartOf": { "@id": `${webdesignBerlinUrl}#webpage` }
    }
  };

  res.locals.title = metaTitle;
  res.locals.description = metaDescription;
  const districtCssHref = req.app.locals.cssAsset("district-berlin.css");
  res.locals.seoExtra = `
    <link rel="preload" href="${districtCssHref}" as="style">
    <link rel="stylesheet" href="${districtCssHref}">
    <meta property="og:title" content="${metaTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="${webdesignBerlinUrl}">
    <meta property="og:image" content="${SITE_URL}/images/heroBg.webp">
  `;

  return res.render("bereiche/webdesign-berlin-en", {
    lng,
    pageCopy,
    pagePath,
    contactPath,
    hero,
    contentLastUpdatedIso: CONTENT_LAST_UPDATED_ISO,
    audience,
    services,
    packages,
    caseStudies,
    processSteps,
    districts,
    industries,
    faqs,
    trust,
    resources,
    seoGuides,
    schema,
    metaTitle,
    metaDescription,
    canonical: webdesignBerlinUrl,
    alternateUrls: {
      de: `${pageBaseUrl}/webdesign-berlin`,
      en: `${pageBaseUrl}/en/webdesign-berlin`,
      xDefault: `${pageBaseUrl}/webdesign-berlin`
    },
    contact: {
      phone: SITE_FACTS.phone,
      phoneDisplay: SITE_FACTS.phoneDisplay,
      email: SITE_FACTS.email
    }
  });
}
