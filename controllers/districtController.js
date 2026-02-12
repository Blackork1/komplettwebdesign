// controllers/districtController.js
import { getDistrictBySlug } from "../models/districtModel.js";

export async function renderDistrictPage(req, res, next) {
  try {
    const lng = req.baseUrl?.startsWith("/en/") ? "en" : "de";
    const isEn = lng === "en";
    const { slug } = req.params;
    const district = getDistrictBySlug(slug);
    if (!district) return next(); // 404 → geht in dein NotFound-Handler

    // Optional: Meta für Head-Partial (dein Hauptcontent enthält bereits JSON-LD)
    const metaTitle = isEn
      ? `Web Design ${district.name} | Professional Website Development`
      : `Webdesign ${district.name} | Professionelle Website erstellen lassen`;
    const metaDescription =
      isEn
        ? `Web design in ${district.name} (Berlin) - landing pages and relaunches for freelancers and SMEs. CMS, SEO, hosting, maintenance, and chatbot support. Call now: +49 1551 1245048.`
        : `Webdesign in ${district.name} (Berlin) – Landingpages & Relaunch für Freelancer & KMU. Eigenes CMS, SEO, Hosting, Wartung & Chatbot. Melde dich jetzt: +49 1551 1245048.`;
    const pagePrefix = req.baseUrl?.startsWith("/en/") ? "/en/webdesign-berlin" : "/webdesign-berlin";
    const canonicalUrl = `${SITE_URL}${pagePrefix}/${slug}`;

    res.locals.title = metaTitle;
    res.locals.description = metaDescription;
    res.locals.seoExtra = `
      <meta property="og:title" content="${metaTitle}">
      <meta property="og:description" content="${metaDescription}">
      <meta property="og:url" content="${canonicalUrl}">
      <meta property="og:type" content="website">
      <meta property="og:image" content="${SITE_URL}/images/heroBg.webp">
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
        lead: `In ${district.name}, competition is high and first impressions happen online. A modern website is your digital storefront, sales assistant, and lead channel running 24/7.`,
        caption: `Web design for local businesses in ${district.name}`,
        localFocus: `We optimize for district-specific search intent in ${district.name}.`
      };

      return res.render("bereiche/webdesign-berlin-district-en", {
        title: metaTitle,
        description: metaDescription,
        lng,
        district,
        company: "Komplett Webdesign",
        phone: "+4915511245048",
        phoneDisplay: "01551 1245048",
        hubPath: "/en/webdesign-berlin",
        districtPath: `/en/webdesign-berlin/${slug}`,
        contactPath: "/en/kontakt",
        districtCopy,
        packageCards: [
          {
            name: "Starter",
            price: "499,00 €",
            description: "A fast launch package with a focused one-page setup.",
            features: ["One-page website", "Responsive design", "GDPR-ready setup"],
            href: "/pakete/Basis"
          },
          {
            name: "Business",
            price: "899,00 €",
            description: "For growing companies that need multiple pages and stronger visibility.",
            features: ["Multi-page website", "Custom layout", "SEO-optimized"],
            href: "/pakete/Business"
          },
          {
            name: "Premium",
            price: "1.499,00 €",
            description: "For ambitious projects with advanced features and full support.",
            features: ["Tailored solution", "E-commerce possible", "Advanced features"],
            href: "/pakete/Premium"
          }
        ],
        processSteps: [
          { title: "1) Analysis & Strategy", text: `We define goals, positioning, and priorities for your business in ${district.name}.` },
          { title: "2) UX & Design", text: "You get a clear, modern layout aligned with your offer and audience." },
          { title: "3) Content & SEO", text: "We create conversion-focused copy and local SEO structure from day one." },
          { title: "4) Development", text: "Fast implementation, clean code, mobile-first, and GDPR-ready setup." },
          { title: "5) Launch & Tracking", text: "Go live with analytics, Search Console, and measurable lead tracking." },
          { title: "6) Ongoing Support", text: "Optional maintenance and SEO support for long-term growth." }
        ],
        faqItems: [
          {
            q: `How much does web design in ${district.name} cost?`,
            a: "Most projects range between EUR 1,500 and EUR 4,500 depending on scope, content, and integrations."
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
            a: "Yes. We provide copywriting support for service pages, homepage messaging, and conversion-focused CTAs."
          },
          {
            q: "Do you also work outside this district?",
            a: "Yes, we work across all Berlin districts and also support clients outside Berlin."
          }
        ]
      });
    }

    // Ordnerstruktur: /views/districts/webdesign-berlin-<slug>.ejs
    return res.render(`bereiche/webdesign-berlin-${slug}`, {
      // Falls du noch Variablen im Template willst
      title: metaTitle,
      description: metaDescription,
      company: "Komplett Webdesign",
      phone: "+4915511245048",
      lng
    });
  } catch (err) {
    next(err);
  }
}

const SITE_URL = (process.env.CANONICAL_BASE_URL || process.env.BASE_URL || "https://komplettwebdesign.de").replace(/\/$/, "");
const DEFAULT_PACKAGE_IMAGE = SITE_URL + "/images/heroImageH.webp";
const YOUTUBE_ID = "M_fYtNuPcGg";
const VIDEO_UPLOAD_ISO = "2025-11-02T12:00:00+01:00";


export function renderWebdesignBerlinHub(req, res) {
  const lng = req.baseUrl?.startsWith("/en/") ? "en" : "de";
  const isEn = lng === "en";
  const pagePath = isEn ? "/en/webdesign-berlin" : "/webdesign-berlin";
  const webdesignBerlinUrl = `${SITE_URL}${pagePath}`;
  const contactPath = isEn ? "/en/kontakt" : "/kontakt";

  let metaTitle = "Webdesign Berlin: Webseite erstellen lassen | Komplett Webdesign";
  let metaDescription =
    "Webseite erstellen lassen in Berlin: modernes Webdesign, Local SEO, Hosting und laufende Betreuung. Für Selbstständige und KMU ab 499 €.";

  const hero = {
    title: "Webdesign in Berlin: Webseite erstellen lassen, die Kunden gewinnt",
    description:
      "Du willst in Berlin besser gefunden werden? Wir erstellen deine Website professionell, mobil optimiert und auf Anfragen ausgerichtet. Inklusive SEO-Basis, Hosting und Support.",
    ctaPrimary: { label: "Kostenloses Erstgespräch sichern", href: "/kontakt" },
    ctaSecondary: { label: "Webdesign-Pakete ansehen", href: "/pakete" },
    rating: { label: "★★★★★ 5,0/5 · 3 Google-Rezensionen", href: "https://share.google/6NAPsubZRs6yeSOrg" },
    image: {
      src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194839/admin_gallery/rvkdyvpwrd25fcm9v3av.webp",
      alt: "Sören Blocksdorf – Webdesigner Berlin"
    },
    trustBadges: [
      "Webseite erstellen lassen in Berlin ab 499 €",
      "Individuelles Design statt Baukasten-Template",
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
      "<strong>Messbar</strong>: klare KPI- und Conversion-Tracking-Basis",
      "<strong>Lokal</strong>: Fokus auf Berlin und relevante Bezirke",
      "<strong>Wartungsarm</strong>: Updates, Backups und Support inklusive"
    ]
  };

  const services = [
    {
      name: "<a href='/webdesign-berlin/design-ux-ui' style='color:var(--wd-accent)'>Webdesign & UX</a>",
      description: "Individuelle Layouts mit klarer Nutzerführung, damit Besucher schneller zu Anfragen werden.",
      features: [
        "<strong><a href='/webdesign-berlin/responsives-design-mobile' style='color:var(--wd-accent)'>Responsive Design</a></strong> für Desktop, Tablet & Smartphone",
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
      name: "<a href='/webdesign-berlin/seo-sichtbarkeit-einsteiger' style='color:var(--wd-accent)'>SEO & Local SEO</a>",
      description: "Wir verbinden Keyword-Strategie mit lokalem Fokus, damit du in Berlin besser rankst.",
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
      name: "<a href='/webdesign-berlin/domain-hosting-technik' style='color:var(--wd-accent)'>Hosting & Wartung</a>",
      description: "Stabile Technik für schnelle Ladezeiten, Sicherheit und weniger Ausfälle.",
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
        "<strong>Rechtssichere Grundlagen</strong> für Buchungsstrecken",
        "<strong>Tracking</strong> für Anfragen und Conversions"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761069237/admin_gallery/bupxdaaopyjco898drrl.webp",
        alt: "E-Commerce und Buchungssysteme für Websites in Berlin"
      }
    },
    {
      name: "<a href='/webdesign-berlin/rechtliches-sicherheit' style='color:var(--wd-accent)'>Rechtliches und Sicherheit</a>",
      description: "DSGVO-konforme Basis und technische Sicherheit für Vertrauen bei Besuchern.",
      features: [
        "<strong>Impressum</strong> und Datenschutzerklärung sauber eingebunden",
        "<strong>Datenschutzerklärung</strong> nach DSGVO",
        "<strong>Cookie-Banner</strong> datenschutzkonform eingerichtet",
        "<strong>Schutz</strong> vor Spam und Bots"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1762705635/admin_gallery/swxxej4dyupgnp7vzzds.webp",
        alt: "Rechtliches und Sicherheit Grafik"
      }
    },
    {
      name: "<a href='/webdesign-berlin/inhalte-texte-content' style='color:var(--wd-accent)'>Inhalte & Texte</a>",
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
      name: "Basis",
      price: "499 €",
      anchor: "basis",
      tagline: "Schnell startklar",
      image: "/images/basis.webp",
      description: "Ideal für Solo-Selbstständige, die schnell mit einer professionellen Website starten wollen.",
      features: [
        "Onepager mit klarer Story und Call-to-Action",
        "<strong>Mobile-First</strong> Layout inkl. Performance-Check",
        "Kontaktformular und DSGVO-Grundseiten",
        "Google Search Console und Tracking-Basis",
        "Hosting-, SSL- und Launch-Setup"
      ]
    },
    {
      name: "Business",
      price: "899 €",
      anchor: "business",
      tagline: "Beliebt bei KMU",
      image: "/images/business.webp",
      popular: true,
      description: "Für Unternehmen mit mehreren Leistungen und klarem Local-SEO-Fokus.",
      features: [
        "Mehrere Leistungsseiten mit Keyword-Strategie",
        "<strong>Blog/News</strong> zur Content-Erweiterung",
        "<strong>Local SEO</strong> und Google-Business-Optimierung",
        "Conversion-optimierte Kontaktstrecken",
        "Optional: laufende Wartung und SEO-Reporting"
      ]
    },
    {
      name: "Premium",
      price: "1.499 €",
      anchor: "premium",
      tagline: "Alles drin",
      image: "/images/premium.webp",
      description: "Für Relaunches oder komplexe Projekte mit individueller UX und Content-Produktion.",
      features: [
        "Strategie-Workshop & Customer-Journey-Mapping",
        "Individuelle Design-Systeme & Animationen",
        "<strong>Content-Produktion</strong> (Text, Foto, Video) nach Bedarf",
        "E-Commerce- und Buchungssysteme integriert",
        "Laufende Optimierung mit KPI-Reporting"
      ]
    }
  ];

  const caseStudies = [
    {
      name: "Zur alten Backstube · Café in Rosenthal",
      summary:
        "Neues Design, Online-Reservierung und ultraschnelle Ladezeiten führten zu signifikant mehr Gästen.",
      bullets: ["+70 % Reservierungen in 3 Monaten", "1,4 s Largest Contentful Paint", "50% mehr Buchungen von Feiern und Events"],
      quote: "Wir bekommen täglich neue Gäste über unsere Website. Endlich professionell und modern.",
      link: "http://www.zuraltenbackstube.de",
      image: "/images/review-bg.webp"
    }

  ];

  const processSteps = [
    {
      name: "Analyse & Ziele",
      description: "Wir analysieren Angebot, Zielgruppe und Wettbewerb in Berlin. Daraus entsteht eine klare SEO- und Inhaltsstrategie für deine Website."
    },
    {
      name: "Wireframe & Inhalte",
      description: "Wir planen Seitenstruktur, Texte, Call-to-Actions und Designrichtung. So entsteht ein belastbares Konzept statt einer austauschbaren Standardseite."
    },
    {
      name: "Design & Entwicklung",
      description: "Wir entwickeln deine Seite mobil optimiert, schnell und technisch sauber. Danach folgt eine Testphase mit Feedbackschleifen und finalen Anpassungen."
    },
    {
      name: "Launch & Tracking",
      description: "Nach Freigabe geht die Website live. Wir richten Tracking und Search Console ein, damit Sichtbarkeit, Klicks und Anfragen messbar werden."

    },
    {
      name: "Wartung & Wachstum",
      description: "Nach dem Launch optimieren wir Inhalte, Technik und lokale Rankings weiter. So wird aus deiner Website ein verlässlicher Lead-Kanal."
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
      link: "/pakete/premium",
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
        "Je nach Umfang liegt eine professionelle Website meist zwischen <strong>499 und 2.000 Euro</strong>. Auf unserer Seite <a href='/pakete'>Pakete</a> siehst du transparente Festpreise ohne versteckte Zusatzkosten."
    },
    {
      question: "Wie lange dauert eine Website-Erstellung in Berlin?",
      answer:
        "Typischerweise <strong>4 bis 6 Wochen</strong>, je nach Umfang und Feedbackgeschwindigkeit. Onepager gehen oft schneller, größere Projekte brauchen mehr Abstimmung."
    },
    {
      question: "Ist SEO bei der Website-Erstellung direkt dabei?",
      answer:
        "Ja. Wir setzen eine saubere SEO-Basis mit strukturierten Seiten, optimierten Meta-Daten, interner Verlinkung und Local-SEO-Grundlagen für Berlin."
    },
    {
      question: "Erstellt ihr auch Inhalte und Texte?",
      answer:
        "Ja. Wir unterstützen bei Seitentexten, Leistungsbeschreibungen und Conversion-Texten, damit deine Website nicht nur gut aussieht, sondern auch Anfragen erzeugt."
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
    "<strong>Datenschutz und technische Stabilität</strong> sind für uns die Basis neben einem einzigartigen Webdesign. Wir bieten ein verschlüsselte Log-In-System an, damit deine Daten und die Daten deiner Kunden immer sicher bleiben. <br> Bereits während der Planungsphase beschäftigen wir uns mit dem Cookie-Banner, dass deine Website beim Datenschutz auf der sicheren Seite ist. Somit erhält deine Website garantiert eine zuverlässige Datensicherheit und ein überzeugendes Webdesign in Berlin.",
    "Weiterhin sind alle unsere <strong>Seiten TLS</strong> verschlüsselt. Was heißt das? <br> Daten zwischen Browser und Server werden verschlüsselt. WLAN-Mithörer oder Provider können Inhalte (Formulardaten, Logins, Cookies) nicht mitlesen. Der Inhalt kann unterwegs nicht heimlich verändert werden (Schutz vor Injected Ads/Code). Das Zertifikat bestätigt, dass der Browser wirklich mit deiner Domain spricht – Schutz vor Man-in-the-Middle/Phishing.",
    "Weiterhin bieten wir auf Wunsch <strong>Backups für deine Webseite</strong> an. Dabei kannst du eigene Intervalle festlegen. Die Preise richten sich dabei an der Menge der Daten und der Häufigkeit der Datensicherungen.",
    "Falls nun doch Probleme auftreten, garantieren ich ein <strong>schnellen Support mit Antwort innerhalb von maximal 24 Stunden</strong>. Updates und extra Funktionieren nach deinen Wünschen werden entsprechend immer nachts veröffentlicht, damit deine Kunden so wenig wie möglich beeinträchtigt werden. ",
    "Wenn du nach der Fertigstellung des Webdesigns und der Website weitere <strong>Unterstützung für deine Googleplatzierung</strong> benötigst, stehen wir dir auch gerne zur Seite.",
    "Der Support für deine Website endet nicht mit der Fertigstellung des Webdesigns und auch nicht, wenn zum jetzigen Zeitpunkt keine Probleme bestehen. Wir stehen dir als <strong>verlässlicher Webdesigner in Berlin auch in Zukunft zur Seite</strong>."
  ];

  const resources = [
    { label: "Professionelles-Webdesign-vs-Baukasten", href: "/ratgeber/professionellen-website-vs-baukasten" },
    { label: "SEO-Grundlagen für Berlin", href: "/ratgeber/seo-zielgruppen-content-marketing" },
    { label: "Webdesign Checkliste für Selbstständige", href: "/blog/website-checkliste-für-selbstandige" }
  ];

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
      packagesText1: "If you want to have a website built in Berlin, pricing depends mainly on scope, features, and content. A clear one-page site usually starts around EUR 500, while larger company websites with multiple pages often range between EUR 1,500 and EUR 3,000.",
      packagesText2: "More complex projects with shop functionality, booking systems, multilingual setup, or custom integrations can be higher. What matters most: your website should not only look good, but generate measurable inquiries and be technically clean for Google.",
      packagesText3: "Choose the package that fits your current stage and business goal:",
      packageBtnPrimary: "Choose package",
      packageBtnSecondary: "Request details",
      packageIncludedTitle: "What is actually included in a web design package?",
      packageIncludedText1: "Already in the <a href='/pakete/basis'>Starter package from EUR 499</a>, you get a professionally designed website with mobile optimization, clear user flows, and core legal pages. Instead of template builders, we create a tailored design for your offer and target group.",
      packageIncludedText2: "In the <a href='/pakete/business'>Business package from EUR 899</a>, the focus is on multiple service pages and stronger Google visibility. For larger projects with shop or booking features, the <a href='/pakete/premium'>Premium package from EUR 1,499</a> is the right fit.",
      casesTitle: "Results from Berlin - real numbers",
      caseLinkLabel: "View website",
      processTitle: "Website development in Berlin - how the process works",
      processLead: "From briefing to launch, most projects take just 4 to 6 weeks - with clear feedback loops and transparent milestones.",
      berlinTitle: "Web design across all Berlin districts",
      berlinLead: "If you want to have a website built in Berlin, local relevance matters. We work across all districts and optimize content, structure, and local SEO signals so you are visible where your customers actually search.",
      districtsLabel: "Berlin districts",
      industriesTitle: "Web design in Berlin for different industries",
      industryMore: "Learn more",
      faqTitle: "Frequently asked questions about web design in Berlin",
      trustTitle: "Secure, GDPR-ready, and continuously supported",
      trustLead: "With Komplett Webdesign, your website stays stable, compliant, and supported long-term - without technical stress.",
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
      packagesText1: "Wenn du eine <strong>Webseite in Berlin erstellen lassen</strong> möchtest, hängen die Kosten vor allem von Umfang, Funktionen und Content ab. Ein klarer Onepager startet meist bei rund 500 €, umfangreichere Firmenwebsites mit mehreren Unterseiten liegen häufig im Bereich von 1.500 € bis 3.000 €.",
      packagesText2: "Komplexe Projekte mit Shop, Buchungssystem, Mehrsprachigkeit oder individuellen Integrationen können deutlich darüber liegen. Wichtig ist: Eine Website sollte nicht nur gut aussehen, sondern messbar Anfragen erzeugen und für Google sauber aufgesetzt sein.",
      packagesText3: "Wähle das Paket, das zu deiner Ausgangslage und deinem Ziel passt:",
      packageBtnPrimary: "Paket wählen",
      packageBtnSecondary: "Details anfragen",
      packageIncludedTitle: "Was ist im Webdesign-Paket konkret enthalten?",
      packageIncludedText1: "Bereits im <a href='/pakete/basis'>Basis-Paket ab 499 €</a> bekommst du eine professionell gestaltete Website mit mobiloptimiertem Aufbau, klarer Nutzerführung und den wichtigsten rechtlichen Grundlagen. Statt Baukasten-Lösungen setzen wir auf ein individuelles Design, das zu deinem Angebot und deiner Zielgruppe passt.",
      packageIncludedText2: "Im <a href='/pakete/business'>Business-Paket ab 899 €</a> liegt der Fokus auf mehreren Leistungsseiten und besserer Sichtbarkeit bei Google. Für größere Vorhaben mit Shop oder Buchungssystem ist das <a href='/pakete/premium'>Premium-Paket ab 1.499 €</a> die richtige Wahl. So entsteht eine Website, die nicht nur modern aussieht, sondern dir in Berlin planbar Anfragen bringt.",
      casesTitle: "Ergebnisse aus Berlin - echte Zahlen",
      caseLinkLabel: "Website ansehen",
      processTitle: "Website in Berlin erstellen lassen - so läuft der Prozess ab",
      processLead: "Vom Briefing bis zum Livegang vergehen meist nur 4 bis 6 Wochen - mit klaren Feedbackschleifen und transparenten Milestones.",
      berlinTitle: "Webdesign in Berlin und allen Bezirken",
      berlinLead: "Wenn du eine Website in Berlin erstellen lassen willst, ist lokaler Bezug entscheidend. Wir arbeiten in allen Berliner Bezirken und optimieren Inhalte, Struktur und lokale Signale so, dass du dort sichtbar bist, wo deine Kunden tatsächlich suchen.",
      districtsLabel: "Berliner Bezirke",
      industriesTitle: "Webdesign Berlin für verschiedene Branchen",
      industryMore: "Mehr erfahren",
      faqTitle: "Häufige Fragen zu Webdesign in Berlin",
      trustTitle: "Sicher, DSGVO-konform & betreut",
      trustLead: "Mit Komplett Webdesign bleibt dein Auftritt stabil, rechtssicher und dauerhaft betreut - ohne Technikstress.",
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
      contactLead: "Wenn du deine Webseite in Berlin professionell erstellen lassen willst, lass uns sprechen. Wir zeigen dir konkrete Schritte für mehr Sichtbarkeit, bessere Rankings und mehr Anfragen.<br>Du suchst allgemeine Informationen zur <a href='/'>professionellen Websiteerstellung</a>? Auf unserer Hauptseite findest du alle Leistungen im Überblick - auch für Kunden außerhalb von Berlin.",
      directCallLabel: "Oder direkt anrufen"
    };

  if (isEn) {
    metaTitle = "Web Design Berlin: Get a Professional Website | Komplett Webdesign";
    metaDescription =
      "Get a website built in Berlin: modern web design, local SEO, hosting, and ongoing support for freelancers and SMEs from EUR 499.";

    hero.title = "Web Design in Berlin: Get a website that wins customers";
    hero.description =
      "Want to be found more easily in Berlin? We build your website professionally, mobile-first, and focused on qualified inquiries. Including SEO basics, hosting, and support.";
    hero.ctaPrimary = { label: "Book a free initial consultation", href: contactPath };
    hero.ctaSecondary = { label: "View web design packages", href: "/pakete" };
    hero.rating.label = "★★★★★ 5.0/5 · 3 Google reviews";
    hero.image.alt = "Sören Blocksdorf - Web Designer Berlin";
    hero.trustBadges = [
      "Professional website in Berlin from EUR 499",
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
        name: "<a href='/webdesign-berlin/design-ux-ui' style='color:var(--wd-accent)'>Web Design & UX</a>",
        description: "Custom layouts with clear user journeys so visitors turn into leads faster.",
        features: [
          "<strong><a href='/webdesign-berlin/responsives-design-mobile' style='color:var(--wd-accent)'>Responsive design</a></strong> for desktop, tablet, and smartphone",
          "<strong>Core Web Vitals</strong> with performance focus",
          "<strong>Clear UX</strong> for better conversion rates",
          "<strong>CMS</strong> for easy content management"
        ],
        image: services[0].image
      },
      {
        name: "<a href='/webdesign-berlin/seo-sichtbarkeit-einsteiger' style='color:var(--wd-accent)'>SEO & Local SEO</a>",
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
        name: "<a href='/webdesign-berlin/domain-hosting-technik' style='color:var(--wd-accent)'>Hosting & Maintenance</a>",
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
          "<strong>Compliant setup</strong> for booking journeys",
          "<strong>Tracking</strong> for inquiries and conversions"
        ],
        image: services[3].image
      },
      {
        name: "<a href='/webdesign-berlin/rechtliches-sicherheit' style='color:var(--wd-accent)'>Compliance & Security</a>",
        description: "GDPR-ready setup and technical security to build trust.",
        features: [
          "<strong>Legal notice</strong> and privacy page integrated cleanly",
          "<strong>Privacy policy</strong> aligned with GDPR basics",
          "<strong>Cookie banner</strong> configured in a compliant way",
          "<strong>Protection</strong> against spam and bots"
        ],
        image: services[4].image
      },
      {
        name: "<a href='/webdesign-berlin/inhalte-texte-content' style='color:var(--wd-accent)'>Content & Copy</a>",
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
        name: "Starter",
        price: "499 €",
        anchor: "basis",
        tagline: "Fast launch",
        image: "/images/basis.webp",
        description: "Ideal for solo professionals who want to launch quickly with a professional website.",
        features: [
          "One-page site with clear story and call-to-action",
          "<strong>Mobile-first</strong> layout including performance checks",
          "Contact form and GDPR core pages",
          "Google Search Console and basic tracking",
          "Hosting, SSL, and launch setup"
        ]
      },
      {
        name: "Business",
        price: "899 €",
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
        name: "Premium",
        price: "1.499 €",
        anchor: "premium",
        tagline: "Everything included",
        image: "/images/premium.webp",
        description: "For relaunches or complex projects with custom UX and content production.",
        features: [
          "Strategy workshop and customer-journey mapping",
          "Custom design systems and animations",
          "<strong>Content production</strong> (text, photo, video) as needed",
          "Integrated e-commerce and booking systems",
          "Ongoing optimization with KPI reporting"
        ]
      }
    );

    caseStudies[0] = {
      ...caseStudies[0],
      name: "Zur alten Backstube · Cafe in Rosenthal",
      summary: "A new design, online reservations, and faster load times led to significantly more guests.",
      bullets: ["+70% reservations in 3 months", "1.4 s Largest Contentful Paint", "50% more bookings for events and private groups"],
      quote: "We now get new guests through our website every day. Finally modern and professional."
    };

    processSteps.splice(0, processSteps.length,
      { name: "Analysis & Goals", description: "We analyze your offer, target audience, and local competition in Berlin. This creates a clear SEO and content strategy for your website." },
      { name: "Wireframe & Content", description: "We define page structure, messaging, calls to action, and design direction. The result is a robust concept instead of a generic template site." },
      { name: "Design & Development", description: "We build your site mobile-first, fast, and technically clean. Then we run a testing phase with feedback loops and final refinements." },
      { name: "Launch & Tracking", description: "After approval, your website goes live. We configure tracking and Search Console so visibility, clicks, and inquiries are measurable." },
      { name: "Maintenance & Growth", description: "After launch, we continue optimizing content, technology, and local rankings. This turns your website into a reliable lead channel." }
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
        answer: "Depending on scope, a professional website usually ranges between <strong>EUR 499 and EUR 2,000</strong>. On our <a href='/pakete'>packages</a> page, you can find transparent fixed pricing without hidden costs."
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
      "<strong>Privacy and technical stability</strong> are our baseline for high-performing web design. We implement secure login systems so your data and your customers' data stay protected. We also handle cookie consent and data protection setup early in the planning phase.",
      "All websites are delivered with <strong>TLS encryption</strong>. This means data between browser and server is encrypted, cannot be read by third parties, and cannot be modified in transit. Certificates also confirm that visitors are connected to the correct domain.",
      "On request, we provide <strong>regular backups</strong> with custom intervals. Pricing depends on data volume and backup frequency.",
      "If issues arise, we provide <strong>fast support with replies within 24 hours</strong>. Updates and feature releases are scheduled to minimize impact on your users.",
      "If you need further <strong>support for your Google rankings</strong> after launch, we can continue with structured SEO support.",
      "Support does not end at launch. We stay available as your <strong>reliable web design partner in Berlin</strong> for the long term."
    );

    resources.splice(0, resources.length,
      { label: "Professional web design vs. website builders", href: "/ratgeber/professionellen-website-vs-baukasten" },
      { label: "SEO fundamentals for Berlin", href: "/ratgeber/seo-zielgruppen-content-marketing" },
      { label: "Web design checklist for self-employed professionals", href: "/blog/website-checkliste-für-selbstandige" }
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

  const normalizePrice = (priceStr = "") => {
    // "1.499 €" -> "1499"
    const cleaned = String(priceStr)
      .replace(/\./g, "")
      .replace(/[^0-9,]/g, "")
      .replace(",", ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? String(num) : "";
  };

  // ---------- Offers (korrekt modelliert) ----------
  const offerNodes = packages.map((pkg, index) => {
    const pkgUrl = `${SITE_URL}/pakete/${pkg.anchor || pkg.slug || `pkg-${index + 1}`}`;
    const price = normalizePrice(pkg.price);

    return {
      "@type": "Offer",
      "@id": `${pkgUrl}#offer`,
      "name": isEn ? `${pkg.name} package` : `${pkg.name} Paket`,
      "url": pkgUrl,
      "image": toAbsUrl(pkg.image || DEFAULT_PACKAGE_IMAGE),
      "description": stripHtml(pkg.description),
      "priceCurrency": "EUR",
      ...(price ? { "price": price } : {}),
      "availability": "https://schema.org/InStock",
      "itemOffered": {
        "@type": "Service",
        "name": isEn ? `${pkg.name} web design` : `${pkg.name} Webdesign`,
        "serviceType": "Webdesign",
        "areaServed": [{ "@type": "City", "name": "Berlin" }],
        "provider": { "@id": `${webdesignBerlinUrl}#localbusiness` }
      }
    };
  });

  // ---------- Schema Blocks ----------
  const schema = {
    organization: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      "name": "Komplett Webdesign",
      "url": `${SITE_URL}/`,
      "logo": {
        "@type": "ImageObject",
        "url": toAbsUrl("/images/LogoTransparent.webp")
      },
      "sameAs": [
        "https://www.linkedin.com/in/komplettwebdesign",
        "https://instagram.com/komplettwebdesign",
        "https://www.facebook.com/profile.php?id=61579580713573",
        "https://www.youtube.com/@komplettwebdesign",
        "https://www.tiktok.com/@komplett.webdesign"
      ]
    },

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

    // Tipp: ProfessionalService ist für Webdesign sauberer als "LocalBusiness" (ist aber weiterhin LocalBusiness-Kontext)
    localBusiness: {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${webdesignBerlinUrl}#localbusiness`,
      "name": "Komplett Webdesign Berlin",
      "description":
        isEn
          ? "Get a website built in Berlin: modern design, strong performance, local SEO, and continuous support. Fixed pricing from EUR 499."
          : "Webseite in Berlin erstellen lassen: modernes Design, schnelle Ladezeiten, Local SEO & Betreuung. Festpreise ab 499 €. Kostenloses Erstgespräch vereinbaren!",
      "url": webdesignBerlinUrl,
      "inLanguage": isEn ? "en-US" : "de-DE",
      "telephone": "+49 1551 1245048",
      "email": "kontakt@komplettwebdesign.de",

      // bitte nur 1x priceRange – und konkret
      "priceRange": "€499–€1499",

      "image": toAbsUrl("/images/heroBg.webp"),
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Möllendorffstr 26",
        "postalCode": "10367",
        "addressLocality": "Berlin",
        "addressRegion": "Berlin",
        "addressCountry": "DE"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 52.5163,
        "longitude": 13.4783
      },

      // besser als Array (konsistent, erweiterbar)
      "areaServed": [{ "@type": "City", "name": "Berlin" }],

      "hasMap": "https://www.google.com/maps?cid=8211653702753166064",
      "sameAs": [
        "https://www.google.com/maps?cid=8211653702753166064",
        "https://www.linkedin.com/in/komplettwebdesign",
        "https://instagram.com/komplettwebdesign",
        "https://www.facebook.com/profile.php?id=61579580713573",
        "https://www.youtube.com/@komplettwebdesign",
        "https://www.tiktok.com/@komplett.webdesign"
      ],

      "parentOrganization": {
        "@id": `${SITE_URL}/#organization`
      },

      "serviceType": [
        ...(isEn
          ? ["Web design", "Website development", "Landing pages", "Relaunch", "SEO", "Hosting", "Maintenance"]
          : ["Webdesign", "Website erstellen", "Landingpages", "Relaunch", "SEO", "Hosting", "Wartung"])
      ],
      
      // Offers referenzieren (kein Duplicate Content im LocalBusiness)
      "makesOffer": offerNodes.map((o) => ({ "@id": o["@id"] }))
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
      "about": { "@id": `${webdesignBerlinUrl}#localbusiness` },
      "mainEntity": { "@id": `${webdesignBerlinUrl}#localbusiness` },

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

    // OfferCatalog ersetzen wir durch ein sauberes ItemList + Offer Nodes
    // (Google zeigt dafür nicht zwingend Rich Results, aber es ist korrektes, konsistentes Markup)
    offerCatalog: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${webdesignBerlinUrl}#offerlist`,
      "name": isEn ? "Web design packages Berlin" : "Webdesign Pakete Berlin",
      "itemListElement": offerNodes.map((offer, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "item": offer
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
  res.locals.seoExtra = `
    <meta property="og:title" content="${metaTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="${webdesignBerlinUrl}">
    <meta property="og:image" content="${SITE_URL}/images/heroBg.webp">
  `;

  return res.render("bereiche/webdesign-berlin", {
    lng,
    pageCopy,
    pagePath,
    contactPath,
    hero,
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
    schema,
    metaTitle,
    metaDescription,
    canonical: webdesignBerlinUrl,
    contact: {
      phone: "+4915511245048",
      phoneDisplay: "01551 1245048",
      email: "kontakt@komplettwebdesign.de"
    }
  });
}
