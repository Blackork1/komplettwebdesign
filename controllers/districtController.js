// controllers/districtController.js
import { getDistrictBySlug } from "../models/districtModel.js";

export async function renderDistrictPage(req, res, next) {
  try {
    const { slug } = req.params;
    const district = getDistrictBySlug(slug);
    if (!district) return next(); // 404 → geht in dein NotFound-Handler

    // Optional: Meta für Head-Partial (dein Hauptcontent enthält bereits JSON-LD)
    const metaTitle = `Webdesign ${district.name} | Professionelle Website erstellen lassen`;
    const metaDescription =
      `Webdesign in ${district.name} (Berlin) – Landingpages & Relaunch für Freelancer & KMU. ` +
      `Eigenes CMS, SEO, Hosting, Wartung & Chatbot. Melde dich jetzt: +49 1551 1245048.`;
    const canonicalUrl = `${SITE_URL}/webdesign-berlin/${slug}`;

    res.locals.title = metaTitle;
    res.locals.description = metaDescription;
    res.locals.seoExtra = `
      <meta property="og:title" content="${metaTitle}">
      <meta property="og:description" content="${metaDescription}">
      <meta property="og:url" content="${canonicalUrl}">
      <meta property="og:type" content="website">
      <meta property="og:image" content="${SITE_URL}/images/heroBg.webp">
    `;

    // Ordnerstruktur: /views/districts/webdesign-berlin-<slug>.ejs
    return res.render(`bereiche/webdesign-berlin-${slug}`, {
      // Falls du noch Variablen im Template willst
      title: metaTitle,
      description: metaDescription,
      company: "Komplett Webdesign",
      phone: "+4915511245048"
    });
  } catch (err) {
    next(err);
  }
}

const SITE_URL = (process.env.CANONICAL_BASE_URL || process.env.BASE_URL || "https://komplettwebdesign.de").replace(/\/$/, "");
const WEBDESIGN_BERLIN_URL = `${SITE_URL}/webdesign-berlin`;
const DEFAULT_PACKAGE_IMAGE = SITE_URL + "/images/heroImageH.webp";
const YOUTUBE_ID = "M_fYtNuPcGg";
const VIDEO_UPLOAD_ISO = "2025-11-02T12:00:00+01:00";


export function renderWebdesignBerlinHub(req, res) {
  const metaTitle = "Webdesign Berlin: Webseite erstellen lassen | Komplett Webdesign";
  const metaDescription =
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
      "name": `${pkg.name} Paket`,
      "url": pkgUrl,
      "image": toAbsUrl(pkg.image || DEFAULT_PACKAGE_IMAGE),
      "description": stripHtml(pkg.description),
      "priceCurrency": "EUR",
      ...(price ? { "price": price } : {}),
      "availability": "https://schema.org/InStock",
      "itemOffered": {
        "@type": "Service",
        "name": `${pkg.name} Webdesign`,
        "serviceType": "Webdesign",
        "areaServed": [{ "@type": "City", "name": "Berlin" }],
        "provider": { "@id": `${WEBDESIGN_BERLIN_URL}#localbusiness` }
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
      "inLanguage": "de-DE"
    },

    breadcrumbList: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${WEBDESIGN_BERLIN_URL}#breadcrumbs`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Startseite",
          "item": `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Webdesign Berlin",
          "item": WEBDESIGN_BERLIN_URL
        }
      ]
    },

    // Tipp: ProfessionalService ist für Webdesign sauberer als "LocalBusiness" (ist aber weiterhin LocalBusiness-Kontext)
    localBusiness: {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${WEBDESIGN_BERLIN_URL}#localbusiness`,
      "name": "Komplett Webdesign Berlin",
      "description":
        "Webseite in Berlin erstellen lassen: modernes Design, schnelle Ladezeiten, Local SEO & Betreuung. Festpreise ab 499 €. Kostenloses Erstgespräch vereinbaren!",
      "url": WEBDESIGN_BERLIN_URL,
      "inLanguage": "de-DE",
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
        "Webdesign",
        "Website erstellen",
        "Landingpages",
        "Relaunch",
        "SEO",
        "Hosting",
        "Wartung"
      ],
      
      // Offers referenzieren (kein Duplicate Content im LocalBusiness)
      "makesOffer": offerNodes.map((o) => ({ "@id": o["@id"] }))
    },

    webPage: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${WEBDESIGN_BERLIN_URL}#webpage`,
      "name": "Webdesign Berlin – Website erstellen lassen vom Berliner Webdesigner",
      "description": metaDescription,
      "url": WEBDESIGN_BERLIN_URL,
      "inLanguage": "de-DE",

      "isPartOf": { "@id": `${SITE_URL}/#website` },
      "publisher": { "@id": `${SITE_URL}/#organization` },

      // saubere Verknüpfung
      "breadcrumb": { "@id": `${WEBDESIGN_BERLIN_URL}#breadcrumbs` },
      "about": { "@id": `${WEBDESIGN_BERLIN_URL}#localbusiness` },
      "mainEntity": { "@id": `${WEBDESIGN_BERLIN_URL}#localbusiness` },

      "primaryImageOfPage": {
        "@type": "ImageObject",
        "@id": `${WEBDESIGN_BERLIN_URL}#primaryimage`,
        "url": toAbsUrl("/images/heroBg.webp")
      }
    },

    faqPage: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${WEBDESIGN_BERLIN_URL}#faq`,
      "url": WEBDESIGN_BERLIN_URL,
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
      "@id": `${WEBDESIGN_BERLIN_URL}#offerlist`,
      "name": "Webdesign Pakete Berlin",
      "itemListElement": offerNodes.map((offer, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "item": offer
      }))
    },

    videoObject: {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "@id": `${WEBDESIGN_BERLIN_URL}#video`,
      "name": "Was dich im Erstgespräch erwartet",
      "description": "Kurz erklärt: Ablauf, Ergebnisse und was dich im Erstgespräch erwartet.",
      "thumbnailUrl": `https://i.ytimg.com/vi/${YOUTUBE_ID}/hqdefault.jpg`,
      "uploadDate": VIDEO_UPLOAD_ISO,
      "duration": "PT3M",
      "embedUrl": `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}`,
      "contentUrl": `https://www.youtube.com/watch?v=${YOUTUBE_ID}`,
      "publisher": { "@id": `${SITE_URL}/#organization` },
      "isPartOf": { "@id": `${WEBDESIGN_BERLIN_URL}#webpage` }
    }
  };

  res.locals.title = metaTitle;
  res.locals.description = metaDescription;
  res.locals.seoExtra = `
    <meta property="og:title" content="${metaTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="${WEBDESIGN_BERLIN_URL}">
    <meta property="og:image" content="${SITE_URL}/images/heroBg.webp">
  `;

  return res.render("bereiche/webdesign-berlin", {
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
    canonical: WEBDESIGN_BERLIN_URL,
    contact: {
      phone: "+4915511245048",
      phoneDisplay: "01551 1245048",
      email: "kontakt@komplettwebdesign.de"
    }
  });
}
