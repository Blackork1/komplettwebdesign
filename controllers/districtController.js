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
      `Komplett Webdesign: Webdesign in ${district.name} (Berlin) – Landingpages & Relaunch für Freelancer & KMU. ` +
      `Eigenes CMS, SEO, Hosting, Wartung & Chatbot. Melde dich jetzt: +49 1551 1245048.`;

    res.locals.title = metaTitle;
    res.locals.metaDescription = metaDescription;

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

const WEBDESIGN_BERLIN_URL = "https://www.komplettwebdesign.de/webdesign-berlin";

export function renderWebdesignBerlinHub(req, res) {
  const metaTitle = "Webdesign in Berlin – professionelle Website erstellen lassen";
  const metaDescription =
    "Professionelles Webdesign Berlin: Wir erstellen schnelle, suchmaschinenoptimierte Websites, die Sichtbarkeit, Anfragen und messbare Ergebnisse bringen.";

  const hero = {
    title: "Webdesign in Berlin: Professionelle Website erstellen lassen",
    description:
      "Wir entwickeln schnelle, professionelle und SEO-optimierte Websites für Berliner Unternehmen, damit Leads planbar werden, Inhalte verkaufen und Technik nicht ausbremst.",
    ctaPrimary: { label: "Kostenloses Erstgespräch", href: "/kontakt" },
    ctaSecondary: { label: "Pakete ansehen", href: "/pakete" },
    rating: { label: "★★★★★ 5,0/5 · 1 Google-Rezensionen", href: "https://share.google/6NAPsubZRs6yeSOrg" },
    image: {
      src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194839/admin_gallery/rvkdyvpwrd25fcm9v3av.webp",
      alt: "Portrait Platzhalter für Webdesign Berlin"
    },
    trustBadges: [
      "Festpreise ab 499 € zzgl. Hosting",
      "Individuelles Design für deine Website",
      "Support innerhalb von 24 Stunden"
    ]
  };

  const audience = {
    title: "Webdesign für Berliner Einzel- und Kleinunternehmer",
    description:
      "Viele Websites aus Berlin bleiben unsichtbar. Wir räumen typische Bremsen aus dem Weg und sorgen dafür, dass Marketing, Technik und Inhalte zusammenspielen. Dazu optimieren wird deine Website mittels SEO für Google, damit du gefunden wirst. Einige Tipps zu <a href='blog/Lokale-SEO-Hacks-fuer-Berlin'>Local SEO in Berlin</a> findest du auch in unserem Blog.",
    painPoints: [
      "Du hast keine konstanten Leads aus Google oder Empfehlungen?",
      "Langsame Seiten & technische Fehler schrecken Besucher ab!",
      "DIY-Websites kosten Zeit, wirken unprofessionell und lassen Conversions liegen."
    ],
    highlights: [
      "<strong>Schnell</strong> dank sauberem Code & Hosting in DE",
      "<strong>Messbar</strong> mit Tracking, KPIs & klaren Dashboards",
      "<strong>Wartungsarm</strong> durch Updates, Backups & Support"
    ]
  };

  const services = [
    {
      name: "<a href='/webdesign-berlin/design-ux-ui' style='color:var(--wd-accent)'>Webdesign & UX</a>",
      description: "Maßgeschneiderte Layouts, die Markenwerte transportieren und Nutzer sicher zur Anfrage führen.",
      features: [
        "<strong>Responsive</strong> für Desktop, Tablet & Smartphone",
        "<strong>Core Web Vitals</strong> und Performance-Fokus",
        "<strong>Barrierearme UX</strong> mit klaren Journeys",
        "<strong>CMS</strong> für eigenständige Pflege (WordPress, Kirby)"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761232178/admin_gallery/zpajf67i0zah0c3r4eti.webp",
        alt: "Tatto Shop Design Beispiel"
      }
    },
    {
      name: "<a href='/ratgeber/seo-zielgruppen-content-marketing' style='color:var(--wd-accent)'>SEO & Local SEO</a>",
      description: "Wir verbinden Keyword-Strategie mit lokalem Relevance-Boost für Berlin und deine Bezirke.",
      features: [
        "<strong>OnPage</strong> Texte, Meta-Daten & Struktur",
        "<strong>Local SEO</strong> inkl. Google Business Profil",
        "<strong>Schema.org</strong> & Snippet-Optimierung",
        "<strong>Backlinks</strong> aus Berliner Branchen-Netzwerken"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761068306/admin_gallery/evjinprnbjqf6dfznqsh.webp",
        alt: "SEO & Local SEO Bild"
      }
    },
    {
      name: "Hosting & Wartung",
      description: "Sichere Infrastruktur, automatisierte Updates und Monitoring – alles aus einer Hand.",
      features: [
        "<strong>Hosting</strong> in ISO-zertifizierten Rechenzentren",
        "<strong>Backups</strong> & Recovery täglich",
        "<strong>Monitoring</strong> für Sicherheit & Uptime",
        "<strong>Performance-Reports</strong> jeden Monat"
      ],
      image: {
        src: "/images/hosting.webp",
        alt: "Hosting & Wartung"
      }
    },
    {
      name: "E-Commerce & Buchungen",
      description: "Von Stripe bis WooCommerce: wir integrieren Systeme, die Umsatz bringen.",
      features: [
        "<strong>Stripe & PayPal</strong> Payment-Flows",
        "<strong>Online-Buchungen</strong> mit Kalender & Erinnerungen",
        "<strong>Mehrsprachigkeit</strong> & rechtssichere Texte",
        "<strong>Tracking</strong> für Conversions & Funnels"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1761069237/admin_gallery/bupxdaaopyjco898drrl.webp",
        alt: "E-Commerce & Buchungensysteme Grafik "
      }
    },
    {
      name: "<a href='/webdesign-berlin/rechtliches-sicherheit' style='color:var(--wd-accent)'>Rechtliches und Sicherheit</a>",
      description: "Rechtlich einwandfrei, technisch geschützt, vertrauenswürdig",
      features: [
        "<strong>Impressumspflicht</strong> ist erfüllt",
        "<strong>Datenschutzerklärung</strong> nach DSGVO",
        "<strong>Coockie-Banner</strong> rechtssichere",
        "<strong>Schutz</strong> vor Spam & Bots"
      ],
      image: {
        src: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1762705635/admin_gallery/swxxej4dyupgnp7vzzds.webp",
        alt: "Rechtliches und Sicherheit Grafik"
      }
    },
    {
      name: "<a href='/webdesign-berlin/inhalte-texte-content' style='color:var(--wd-accent)'>Inhalte & Texte</a>",
      description: "überzeugend, verständlich, authentisch",
      features: [
        "<strong>Must-haves</strong> auf der Startseite",
        "<strong>Vertrauenswürdig</strong> über mich Seite",
        "<strong>Textlänge</strong> richtig Wählen",
        "<strong>Blog</strong> wichtig oder nicht?"
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
      description: "Ideal für Solo-Selbstständige & lokale Dienstleister, die schnell sichtbar sein wollen.",
      features: [
        "One-Pager mit klarer Story & Call-to-Action",
        "<strong>Mobile-First</strong> Layout & Performance-Check",
        "Kontaktformular + DSGVO-konforme Grundseiten",
        "Setup von Tracking & Google Search Console",
        "Einrichtung Hosting, SSL & Wartungs-Startpaket"
      ]
    },
    {
      name: "Business",
      price: "899 €",
      anchor: "business",
      tagline: "Beliebt bei KMU",
      image: "/images/business.webp",
      popular: true,
      description: "Für KMU mit mehreren Leistungen und lokalem SEO-Fokus.",
      features: [
        "Mehrere Leistungsseiten inkl. Keyword-Strategie",
        "<strong>Blog/News</strong> zur Content-Erweiterung",
        "<strong>Local SEO</strong> + Google Business Optimierung",
        "Conversion-Optimierte Kontaktstrecken",
        "Optional: laufende Wartung & SEO-Reporting"
      ]
    },
    {
      name: "Premium",
      price: "1.499 €",
      anchor: "premium",
      tagline: "Alles drin",
      image: "/images/premium.webp",
      description: "Relaunch oder komplexe Projekte mit individueller UX und Content-Produktion.",
      features: [
        "Strategie-Workshop & Customer-Journey-Mapping",
        "Individuelle Design-Systeme & Animationen",
        "<strong>Content-Produktion</strong> (Text, Foto, Video)",
        "E-Commerce / Buchungssysteme integriert",
        "Laufende Optimierung mit KPI-Dashboards"
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
    // {
    //   name: "Schneider & Co. · Kreuzberg",
    //   summary: "Local-SEO-Relaunch für den Handwerksbetrieb mit klaren Angebotsseiten.",
    //   bullets: ["+120 % qualifizierte Anfragen", "Top-5 Platzierung bei \"Webdesign Kreuzberg\"", "3x mehr Bewertungen im GBP"],
    //   quote: "Wir sind in Berlin Kreuzberg endlich sichtbar und bekommen planbar neue Aufträge.",
    //   link: "/cases/schneider-co",
    //   image: "/images/webdesign-berlin-placeholder.svg"
    // },
    // {
    //   name: "Praxis Dr. Meier · Charlottenburg",
    //   summary: "Barrierefreier Relaunch mit Terminmodul für eine moderne Patientenreise.",
    //   bullets: ["+60 % Online-Buchungen", "Absprungrate um 35 % gesenkt", "Automatische Erinnerungen reduzieren No-Shows"],
    //   quote: "Unsere Praxis wirkt digital so persönlich wie vor Ort – das Feedback ist großartig.",
    //   link: "/cases/praxis-dr-meier",
    //   image: "/images/webdesign-berlin-placeholder.svg"
    // }
  ];

  const processSteps = [
    {
      name: "Analyse & Ziele",
      description: "Zuerst schauen wir uns deine eigene Firma oder Branche genauer an. Was bietest du an? Welche Waren oder Dienstleistungen sprechen deine Kunden besonders an? Was zeichnet dich im Vergleich zum Wettbewerb aus? Wir schauen uns genau an, was wir unternehmen müssen, damit wir deine neue Website und das Webdesign richtig ausrichten und planen können. Wir gehen auf deine Kunden und Wettbewerb ein, damit wir deine Website von anderen hervorheben können."
    },
    {
      name: "Wireframe & Inhalte",
      description: "Nachdem wir uns einen Plan erstellt haben, wie wir die Website auf dem Markt platzieren wollen, gehen wir auf das Webdesign und die Inhalte genauer ein. Wie soll die Website aufgebaut sein? Welche Texte und Inhalte benötigen wir? Wie soll das Design aussehen? Farben, Schriftarten, Style, Emotionen und vieles mehr. Webdesign ist nicht einfach ein paar schöne Vorlagen zusammenfügen und irgendwelche Texte zusammenwerfen. Alles muss auf den Kunden abgestimmt und geplant werden. Hier nutzen wir zunächst einmal Platzhalter für Texte und Bilder, damit wir das Grundgerüst für das Webdesign erstellen können."
    },
    {
      name: "Design & Entwicklung",
      description: "Haben wir unsere Ideen und Texte fertig, erstellen wir nun das tatsächliche Design für die Website. Mit echten Bildern und Texten erstellen wir nun deine Seite, diese dann auch direkt online erreicht und gefunden werden kann. Dabei bestücken wir die Seite mit Animationen und Logik, damit aus dem Webdesign eine nutzbare Seite wird. Jetzt kannst du diese Testversion der Website deinen Kunden präsentieren und wir können noch kleine Änderungen und Anpassungen vornehmen. Dabei steht dir bereits im Basis-Paket eine kostenlose Änderung zur Verfügung."
    },
    {
      name: "Launch & Tracking",
      description: "Bist du zufrieden mit der Website und passt alles? Dann wird deine Seite nun offiziell veröffentlicht und in Google sichtbar. Ab jetzt kannst du täglich Veränderungen tracken und sehen, wie viele Kunden auf deine Seite kommen und wie diese deine Seite nutzen. Du kannst live verfolgen, auf welche Buttons diese klicken und wonach diese suchen. Somit kannst du deinen Inhalt auf deiner Website an deine Besucher anpassen, was dir somit mehr Kunden und Umsatz über deine Website erhält somit mehr Besucher auf deiner Website."

    },
    {
      name: "Wartung & Wachstum",
      description: "Jeden Monat stelle ich dir auf Wunsch einen Auswertung deiner Bersucherzahlen zur Verfügung. Damit können wir dann gemeinsam deine Website verbessern und SEO optimieren. Das Ziel ist es ja, dass du auf Google gefunden werden sollst. Keiner braucht nur eine schöne Website die niemand sieht. Wenn du etwas geändert oder hinzugefügt haben möchtest, stehe ich dir auch in der Zukunft gerne zur Seite."
    }
    // "Analyse & Ziele",
    // "Wireframe & Inhalte",
    // "Design & Entwicklung",
    // "Launch & Tracking",
    // "Wartung & Wachstum"
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
      description: "Reservierungen, Menüs & Events mit Conversion-Fokus.",
      link: "/branchen/webdesign-cafe",
      image: "https://res.cloudinary.com/dvd2cd2be/image/upload/v1758977436/admin_gallery/vycov9ggowbm7ql3ad3t.webp"
    },
    {
      name: "Handwerk & Dienstleistung",
      description: "Leistungsseiten mit Referenzen, Formularen & Angebots-Tools.",
      link: "/handwerker",
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
      description: "Produktdarstellung, Checkout-Optimierung und rechtssichere Prozesse.",
      link: "/",
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
      question: "+ Was kostet eine Website in Berlin?",
      answer:
        "Je nach Umfang zwischen <strong>499 und 2.000 Euro</strong>. Wir arbeiten mit festen Paketpreisen – ohne versteckte Kosten."
    },
    {
      question: "+ Wie lange dauert die Erstellung?",
      answer:
        "In der Regel <strong>vier bis sechs Wochen</strong> inklusive Feedback-Schleifen und Launch-Checkliste."
    },
    {
      question: "+ Sind Inhalte oder Texte inklusive?",
      answer:
        "Texte können nach Wunsch mit erstellt werden. Diese werden dann passen an Suchmaschinen ausgerichtet, dass du auf Google gefunden wirst."
    },
    // {
    //   question: "+ Arbeitet ihr mit WordPress?",
    //   answer:
    //     "Ja, zusätzlich mit Kirby oder Craft. Wir wählen das CMS, das am besten zu deinen Zielen passt."
    // },
    {
      question: "+ Wie sichert ihr meine Website?",
      answer:
        "Hosting in Deutschland, tägliche Backups nach Wunsch, Monitoring und Sicherheitsupdates laufen automatisch."
    },
    {
      question: "+ Brauche ich Hosting bei euch?",
      answer:
        "Empfehlung: ja – für Performance & Sicherheit. Auf Wunsch migrieren wir bestehendes Hosting."
    },
    {
      question: "+ Optimiert ihr für Google Maps und Mobile?",
      answer:
        "Local SEO und Mobile-First Design gehören zum Standardumfang jedes Projekts."
    },
    {
      question: "+ Was passiert nach dem Launch?",
      answer:
        "Wir betreuen, pflegen und optimieren monatlich weiter – inklusive Reports und Handlungsempfehlungen."
    },
    {
      question: "+ Wie läuft ein Erstgespräch ab?",
      answer:
        "Kostenfrei & unverbindlich: Wir analysieren deine Website in 15 Minuten und geben konkrete Empfehlungen."
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

  const YOUTUBE_ID = "M_fYtNuPcGg"; // Beispiel-ID
  const SITE_URL = "https://www.komplettwebdesign.de";
  const DEFAULT_PACKAGE_IMAGE = SITE_URL + "/images/heroImageH.webp"; // Fallback
  const VIDEO_UPLOAD_ISO = "2025-11-02T12:00:00+01:00"; // 02.11.2025 (Berlin)

  const schema = {
    breadcrumbList: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Startseite", item: "https://www.komplettwebdesign.de/" },
        { "@type": "ListItem", position: 2, name: "Webdesign Berlin", item: WEBDESIGN_BERLIN_URL }
      ]
    },
    localBusiness: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Komplett Webdesign Berlin",
      url: WEBDESIGN_BERLIN_URL,
      telephone: "+493012345678",
      areaServed: "Berlin",
      sameAs: [
        "https://www.instagram.com/komplettwebdesign",
        "https://www.linkedin.com/company/komplettwebdesign"
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Berlin",
        addressCountry: "DE"
      }
    },
    faqPage: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer.replace(/<strong>|<\/strong>/g, "") }
      }))
    },
    offers: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: packages.map((pkg, index) => {
        const normalizedPrice = pkg.price
          .replace(/\./g, "")
          .replace(/[^0-9,]/g, "")
          .replace(",", ".");

        // Bildquelle priorisieren: pkg.image.src → pkg.image → Fallback
        const imageUrl =
          pkg.image ||
          DEFAULT_PACKAGE_IMAGE;

        const pkgUrl = SITE_URL + "/pakete/" + (pkg.anchor || (pkg.slug || ("pkg-" + (index + 1))));


        return {
          "@type": "Product",
          name: `${pkg.name} Paket`,
          description: pkg.description.replace(/<[^>]*>/g, ""),
          image: imageUrl,                     // <-- WICHTIG: Pflichtfeld
          url: pkgUrl,                         // optional, aber sinnvoll
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: normalizedPrice || "0",
            availability: "https://schema.org/InStock",
            url: pkgUrl,                       // optional
            // Optional: Saubere Rückgaberichtlinie (für Dienstleistungen i. d. R. nicht möglich)
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "DE",
              returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted"
            }
            // shippingDetails ist für physische Produkte gedacht → für Services weglassen
          },
          position: index + 1
        };
      })
    },
    videoObject: {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: (typeof video !== "undefined" && video.name) || "Was dich im Erstgespräch erwartet",
      description: (typeof video !== "undefined" && video.description) || "Kurz erklärt: Ablauf, Ergebnisse und was dich im Erstgespräch erwartet.",
      thumbnailUrl: (typeof video !== "undefined" && video.thumbnailUrl) || `https://i.ytimg.com/vi/${YOUTUBE_ID}/hqdefault.jpg`,
      uploadDate: VIDEO_UPLOAD_ISO, // <-- hinzugefügt
      embedUrl: `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}`,
      contentUrl: `https://www.youtube.com/watch?v=${YOUTUBE_ID}`,
      publisher: {
        "@type": "Organization",
        name: "Komplett Webdesign",
        logo: {
          "@type": "ImageObject",
          url: "https://www.komplettwebdesign.de/images/LogoTransparent.webp"
        }
      }
    }
  };

  res.locals.title = metaTitle;
  res.locals.description = metaDescription;
  res.locals.seoExtra = `
    <link rel="canonical" href="${WEBDESIGN_BERLIN_URL}">
    <meta property="og:title" content="${metaTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="${WEBDESIGN_BERLIN_URL}">
    <meta property="og:image" content="https://www.komplettwebdesign.de/images/webdesign-berlin-hero.webp">
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
