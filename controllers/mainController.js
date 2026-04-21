import pool from '../util/db.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Review from '../models/Review.js';
import Package from '../models/Package.js';
import { mockPackages } from '../data/mockPackages.js';

// Öffentliches Google-Profil (aus sameAs im JSON-LD) – zentral hier gepflegt,
// damit Trust-Sektion und "Alle Bewertungen"-Button konsistent bleiben.
const GOOGLE_PROFILE_URL = 'https://www.google.com/maps/place/Komplett+Webdesign/@52.451726,11.6969877,8z/data=!3m1!4b1!4m6!3m5!1s0x40da1c9a5b81fab7:0x71f65ccfd1ed06f0!8m2!3d52.45906!4d13.0157992!16s%2Fg%2F11xs7y9j31?entry=ttu';
const GOOGLE_REVIEW_URL  = 'https://g.page/r/CfAG7dHPXPZxEAE/review';
const MIN_REVIEWS_FOR_AGGREGATE = 3;

const HOMEPAGE_FAQ = {
  de: [
    {
      q: 'Was kostet es, eine Website erstellen zu lassen?',
      a: 'Bei mir gibt es transparente Festpreise: Basis ab 499 €, Business ab 899 € und Premium ab 1.499 €. Domain und Mail starten ab 10 € pro Monat, Hosting kostet 10 € pro Monat und Wartung 5 € pro Monat. So bleibt klar, was einmalig ist und was laufend dazukommt.'
    },
    {
      q: 'Wie lange dauert es, bis meine Website online ist?',
      a: 'Das Basis-Paket dauert typischerweise 2 bis 4 Wochen, das Business-Paket 4 bis 6 Wochen und das Premium-Paket 6 bis 8 Wochen. Der genaue Zeitrahmen hängt davon ab, wie schnell Inhalte, Feedback und technische Zugänge vorliegen.'
    },
    {
      q: 'Welche Leistungen sind im Preis enthalten?',
      a: 'In jedem Paket enthalten: individuelles Webdesign, responsive Umsetzung für Handy/Tablet/Desktop, SEO-Grundoptimierung, DSGVO-konforme Rechtstexte (Impressum, Datenschutz, ggf. Cookie-Banner), SSL-Zertifikat und persönlicher Support über einen festen Ansprechpartner.'
    },
    {
      q: 'Kümmerst du dich auch um Hosting und Wartung?',
      a: 'Ja. Auf Wunsch übernehme ich Hosting auf sicheren deutschen Servern, Backups, Updates, Sicherheitspatches und laufenden Support. Du musst dich um nichts Technisches kümmern.'
    },
    {
      q: 'Bin ich mit meiner Website in Google sichtbar?',
      a: 'Ja, jede Website wird technisch sauber und SEO-freundlich gebaut: saubere HTML-Struktur, schnelle Ladezeiten, strukturierte Daten, mobile-first, Metadaten. Für lokale Sichtbarkeit in Berlin richte ich zusätzlich dein Google-Unternehmensprofil mit ein.'
    },
    {
      q: 'Kann ich meine Website später selbst pflegen?',
      a: 'Ja. Auf Wunsch bekommst du ein einfaches CMS-Backend, mit dem du Texte, Bilder, Blog-Artikel und Angebote selbst pflegen kannst. Alternativ übernehme ich die Pflege im Rahmen eines Wartungspakets.'
    },
    {
      q: 'Für welche Branchen erstellst du Websites?',
      a: 'Schwerpunkte sind lokale Dienstleister, Restaurants und Cafés, Handwerksbetriebe, Immobilienmakler, Beauty- und Wellness-Angebote, Praxen sowie kleine Shops und lokale Händler. Ich kenne die Anforderungen dieser Branchen und setze sie gezielt für Sichtbarkeit und Anfragen in Berlin um.'
    },
    {
      q: 'Arbeitest du nur mit Kunden aus Berlin?',
      a: 'Mein Sitz ist Berlin-Lichtenberg, der Großteil meiner Kunden kommt aus Berlin und Brandenburg. Ich betreue aber deutschlandweit – Termine laufen per Video-Call, Vor-Ort-Termine in Berlin sind jederzeit möglich.'
    },
    {
      q: 'Ist meine Website DSGVO- und rechtskonform?',
      a: 'Ja. Jede Website ist DSGVO-konform aufgesetzt: Cookie-Consent vor dem Laden von Google Analytics/Clarity, datensparsame Einbindungen, geprüfte Rechtstexte und ein klarer Datenverarbeitungs-Workflow. So bist du als Betreiber rechtlich abgesichert.'
    },
    {
      q: 'Wie läuft die Zusammenarbeit konkret ab?',
      a: 'In einem 20-minütigen Kennenlerngespräch kläre ich mit dir Ziele und Budget. Danach erstelle ich ein Konzept und einen Entwurf, den du mit mir gemeinsam anpasst. Nach Freigabe erfolgen Umsetzung, Live-Test und Launch. Du hast immer einen festen Ansprechpartner und schnelle Antworten innerhalb von 24 Stunden.'
    }
  ],
  en: [
    {
      q: 'How much does it cost to have a website built?',
      a: 'Transparent fixed prices: Basic from EUR 499, Business from EUR 899 and Premium from EUR 1,499. Domain and email start from EUR 10 per month, hosting is EUR 10 per month and maintenance is EUR 5 per month. One-time project costs and monthly services stay clearly separated.'
    },
    {
      q: 'How long until my website goes live?',
      a: 'A landing page typically launches within 30 days. First draft after 7 days, final design after 14, live test on day 21, launch on day 30. Larger projects are scheduled individually.'
    },
    {
      q: 'What is included in the price?',
      a: 'Every package includes: custom web design, responsive implementation (mobile, tablet, desktop), SEO basics, GDPR-compliant legal texts (imprint, privacy policy, cookie banner if needed), SSL certificate, and personal support via one fixed point of contact.'
    },
    {
      q: 'Do you also handle hosting and maintenance?',
      a: 'Yes. On request I take over hosting on secure German servers, backups, updates, security patches, and ongoing support. You do not have to deal with anything technical.'
    },
    {
      q: 'Will my website be visible on Google?',
      a: 'Yes, every site is built clean and SEO-friendly: semantic HTML, fast loading, structured data, mobile-first, proper metadata. For local visibility in Berlin I also help set up your Google Business Profile.'
    },
    {
      q: 'Can I edit my website myself later?',
      a: 'Yes. On request you get a simple CMS backend to edit text, images, blog posts, and offers yourself. Alternatively I handle content updates under a maintenance package.'
    },
    {
      q: 'Which industries do you build websites for?',
      a: 'Focus areas are restaurants and cafés, trades, real estate agents, daycares and schools, as well as self-employed professionals and small service providers. I know the specifics of these industries – digital menus, project galleries, listings, opening hours – and implement them with focus.'
    },
    {
      q: 'Do you only work with clients in Berlin?',
      a: 'I am based in Berlin-Lichtenberg, most of my clients come from Berlin and Brandenburg, but I serve clients across Germany. Meetings run via video call; on-site meetings in Berlin are always possible.'
    },
    {
      q: 'Is my website GDPR-compliant?',
      a: 'Yes. Every site is GDPR-ready: cookie consent before loading Google Analytics/Clarity, privacy-friendly embeds, reviewed legal texts, and a clear data processing workflow. You are legally covered as the operator.'
    },
    {
      q: 'How does the collaboration actually work?',
      a: 'A 20-minute intro call to clarify goals and budget. Then I prepare a concept and draft which we refine together. After approval: implementation, live test, launch. You always have one fixed contact and replies within 24 hours.'
    }
  ]
};

const HOMEPAGE_I18N = {
  de: {
    seoTitle: 'Website erstellen lassen Berlin – ab 499 € | Komplett Webdesign',
    seoDescription: 'Website erstellen lassen in Berlin: persönliches Webdesign, Texte, SEO, Hosting und Wartung aus einer Hand. Festpreis-Pakete ab 499 €.',
    seoKeywords: 'webseite erstellen lassen, webdesign in berlin, website in berlin erstellen lassen, webdesigner berlin, lokale seo berlin',
    ogTitle: 'Website erstellen lassen in Berlin – persönlich, SEO-freundlich und aus einer Hand',
    ogDescription: 'Webdesign, Texte, SEO, Hosting und Wartung für kleine Unternehmen in Berlin. Faire Festpreis-Pakete ab 499 €.',
    heroBadge: 'Komplett Webdesign aus Berlin',
    heroTitle: 'Website erstellen lassen in Berlin',
    heroTitle2: 'persönlich, SEO-freundlich und aus einer Hand',
    heroSubline: 'Design, Texte, SEO, Hosting und Wartung für kleine Unternehmen',
    heroBullet1: 'Persönliche Betreuung vom ersten Gespräch bis zum Livegang',
    heroBullet2: 'Faire Festpreis-Pakete ab 499 EUR ohne versteckte Projektkosten',
    heroBullet3: 'SEO-Grundlage, schnelle Ladezeiten und klare Anfragewege von Anfang an',
    heroCtaPrimary: 'Beratungsgespräch anfragen',
    heroCtaSecondary: 'Pakete ansehen',
    heroBadge1: 'Basis ab 499 EUR',
    heroBadge2: 'Business ab 899 EUR',
    heroBadge3: 'Premium ab 1.499 EUR',
    introTitleStrong: 'Deine professionelle Website aus Berlin',
    introTitleRest: 'aus einer Hand bei',
    featuresTitle: 'Was biete ich dir für deine Websiteerstellung?',
    timelineTitle: 'Dein Zeitplan – klar geplant vom Erstgespräch bis zum Livegang',
    timelineNote: 'Basis: 2 bis 4 Wochen, Business: 4 bis 6 Wochen, Premium: 6 bis 8 Wochen.',
    servicesTitle: 'Alles aus einer Hand – ich erstelle deine professionelle Website in Berlin',
    blogSectionTitle: 'Aktuelles zum Thema Webseiten und bisherige Kundenstimmen',
    blogCardTitle: 'Aktueller Blog-Artikel',
    blogSoon: '(Demnächst mehr...)',
    blogDaysAgo: 'Tagen',
    blogToArticle: 'Zum Artikel',
    blogToOverview: 'Zum Blog',
    reviewCardTitle: 'Kundenstimme',
    reviewSoon: '(Demnächst echte Stimmen...)',
    pricingTitle: 'Bereit für eine professionelle Website?',
    pricingTagline: '„Günstige Website erstellen lassen" heißt: sinnvoller Umfang, klare Leistungen und transparente laufende Kosten.',
    industryTitle: 'Webseiten für lokale Dienstleister, Restaurants, Handwerk und kleine Händler in Berlin',
    trustTitle: 'Das sagen meine Kunden',
    trustSubline: 'Echte Bewertungen von Projekten, die ich für Kunden in Berlin umgesetzt habe.',
    trustCtaAll: 'Alle Bewertungen bei Google ansehen',
    trustCtaWrite: 'Eigene Bewertung abgeben',
    trustAverageLabel: 'Durchschnittliche Bewertung auf Google',
    trustCountLabel: 'verifizierte Bewertungen',
    trustNoReviewsHeadline: 'Bald echte Stimmen an dieser Stelle',
    trustNoReviewsLead: 'Die ersten Kundenstimmen erscheinen hier, sobald sie im Google-Profil verifiziert sind. In der Zwischenzeit findest du mein öffentliches Profil direkt bei Google.',
    faqTitle: 'Häufige Fragen rund um die Websiteerstellung in Berlin',
    faqSubline: 'Antworten auf die Fragen, die mir Interessenten am häufigsten stellen.'
  },
  en: {
    seoTitle: 'Website Development Berlin – from €499 · live in 30 days | Komplett Webdesign',
    seoDescription: 'Have your website built in Berlin: modern web design, SEO, hosting, and support from one source. Fixed price from €499, live in 30 days.',
    seoKeywords: 'website development berlin, web design berlin, berlin web designer, local seo berlin, website creation berlin',
    ogTitle: 'Website Development in Berlin – from €499, live in 30 days',
    ogDescription: 'Web design, SEO, hosting, and support from one source. I build your professional website in Berlin with a fixed price and clear timeline.',
    heroBadge: 'Komplett Webdesign from Berlin',
    heroTitle: 'Get a website built in Berlin',
    heroTitle2: 'personal, SEO-friendly and from one source',
    heroSubline: 'design, copy, SEO, hosting and maintenance for small businesses',
    heroBullet1: 'Personal support from first call to launch',
    heroBullet2: 'Fair fixed-price packages from EUR 499 with clear scope',
    heroBullet3: 'SEO foundation, fast loading and clear inquiry paths from day one',
    heroCtaPrimary: 'Request consultation',
    heroCtaSecondary: 'View packages',
    heroBadge1: 'Basic from EUR 499',
    heroBadge2: 'Business from EUR 899',
    heroBadge3: 'Premium from EUR 1,499',
    introTitleStrong: 'Your professional website from Berlin',
    introTitleRest: 'from one source at',
    featuresTitle: 'What do I offer for your website project?',
    timelineTitle: 'Your timeline - clearly planned from first call to launch',
    timelineNote: 'Basic: 2 to 4 weeks, Business: 4 to 6 weeks, Premium: 6 to 8 weeks.',
    servicesTitle: 'Everything from one source – I build your professional website in Berlin',
    blogSectionTitle: 'Latest website topics and client feedback',
    blogCardTitle: 'Latest blog post',
    blogSoon: '(More coming soon...)',
    blogDaysAgo: 'days',
    blogToArticle: 'Read article',
    blogToOverview: 'Go to blog',
    reviewCardTitle: 'Client feedback',
    reviewSoon: '(Real feedback coming soon...)',
    pricingTitle: 'Ready for a professional website?',
    pricingTagline: '"Affordable website development" means: smart planning, modular implementation, no hidden costs.',
    industryTitle: 'Websites for local service providers, restaurants, trades and small retailers in Berlin',
    trustTitle: 'What my clients say',
    trustSubline: 'Real reviews from projects I have delivered for Berlin-based clients.',
    trustCtaAll: 'See all reviews on Google',
    trustCtaWrite: 'Write a review',
    trustAverageLabel: 'Average rating on Google',
    trustCountLabel: 'verified reviews',
    trustNoReviewsHeadline: 'Real feedback coming here soon',
    trustNoReviewsLead: 'The first client voices will appear here as soon as they are verified on my Google profile. In the meantime, you can find my public profile directly on Google.',
    faqTitle: 'Frequently asked questions about having a website built in Berlin',
    faqSubline: 'Answers to the questions prospective clients ask me most.'
  }
};

function resolveHomeLanguage(req) {
  return req.params?.lng === 'en' ? 'en' : 'de';
}

function localizeHomepagePackages(packages, lng) {
  const isEn = lng === 'en';
  const packageDefaults = new Map(
    (mockPackages || []).map((pkg) => [String(pkg.slug || '').toLowerCase(), pkg])
  );

  const nameMap = isEn
    ? { Basis: 'Basic', Business: 'Business', Premium: 'Premium' }
    : { Basis: 'Basis', Business: 'Business', Premium: 'Premium' };

  const englishDescriptions = {
    basis: 'For small businesses and local service providers that need a professional digital business card: 1 page including copy and basic SEO.',
    business: 'For small businesses that need more than a business card: up to 5 pages with contact form, service pages, about/team page and on-page SEO.',
    premium: 'For larger online offers in Berlin: up to 20 pages including copy, strategy, SEO and booking system. Shop features are optional depending on scope.'
  };

  const englishFeatures = {
    basis: [
      '1 professional page with clear offer, copy and contact option',
      'Responsive web design for mobile, tablet and desktop',
      'Basic SEO, technical foundation and legal pages'
    ],
    business: [
      'Up to 5 pages including homepage, services, about/team and contact',
      'Contact form, clear inquiry flow and on-page SEO',
      'Blog or additional content available as optional extension'
    ],
    premium: [
      'Up to 20 pages with strategy, copy and SEO structure',
      'Booking system included, shop optional depending on scope',
      'Ideal for small shops, local retailers and companies with larger offers'
    ]
  };

  return packages.map((pkg) => {
    const amount = Number(pkg.price_amount_cents || 0) / 100;
    const slug = String(pkg.slug || pkg.name || '').toLowerCase();
    const defaults = packageDefaults.get(slug);
    return {
      ...pkg,
      name: nameMap[pkg.name] || pkg.name,
      description: isEn
        ? (englishDescriptions[slug] || pkg.description)
        : (defaults?.description || pkg.description),
      features: isEn
        ? (englishFeatures[slug] || pkg.features || [])
        : (defaults?.features || pkg.features || []),
      price: isEn
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
        : pkg.price
    };
  });
}

export async function getIndex(req, res) {
  try {
    const lng = resolveHomeLanguage(req);
    const copy = HOMEPAGE_I18N[lng];
    const pagePath = lng === 'en' ? '/en' : '/';
    const base = (res.locals.canonicalBaseUrl || process.env.BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');

    // URLs für hreflang (de = default, en = /en)
    const alternateUrls = {
      de: `${base}/`,
      en: `${base}/en`,
      xDefault: `${base}/`
    };

    const users = await User.fetchAll();
    const packagesRaw = await Package.fetchAll();
    const packages = localizeHomepagePackages(packagesRaw, lng);
    const latestPostRaw = await Post.fetchLatest();

    // Reviews: Trust-Sektion zieht bis zu 3 echte Stimmen,
    // Blog-Bereich bekommt weiterhin einen zufälligen Einzel-Review.
    const [trustReviewsRaw, reviewRaw, reviewAggregate] = await Promise.all([
      Review.fetchTop(3).catch(() => []),
      Review.fetchRandom().catch(() => null),
      Review.fetchAggregate(MIN_REVIEWS_FOR_AGGREGATE).catch(() => null)
    ]);

    // Fallback bleibt als Objekt – der View blendet den Block komplett aus,
    // wenn `isDefault` gesetzt ist (kein Platzhaltertext mehr im HTML).
    const latestPostFallback = lng === 'en'
      ? { title: '', slug: '', excerpt: '', image_url: '', created_at: new Date(), isDefault: true }
      : { title: '', slug: '', excerpt: '', image_url: '', created_at: new Date(), isDefault: true };

    const reviewBlogFallback = lng === 'en'
      ? {
          author: 'Your review could appear here',
          content: 'Client feedback will be published here soon.',
          avatar_url: null,
          isDefault: true
        }
      : {
          author: 'Deine Meinung ist hier willkommen!',
          content: 'In Kürze findest du hier echte Kundenstimmen zu meinen Webdesign-Projekten.',
          avatar_url: null,
          isDefault: true
        };

    const latestPost = latestPostRaw || latestPostFallback;
    const review = reviewRaw || reviewBlogFallback;

    const latestPostLocalized = lng === 'en' && latestPostRaw
      ? {
          ...latestPost,
          title: 'Latest article from our blog',
          excerpt: 'Open the article to read the full update.',
          localizedSummary: true
        }
      : latestPost;

    const reviewLocalized = lng === 'en' && reviewRaw
      ? {
          ...review,
          content: 'Client feedback is currently available in the original language. Contact us for an English summary.',
          localizedSummary: true
        }
      : review;

    // Trust-Sektion: Arrays zuschneiden + Bewertung als Zahl normalisieren.
    // WICHTIG: avatar_url wird NICHT mit einem Default überschrieben - null/leer muss
    // durchgereicht werden, damit das Template den Initialen-Fallback ausspielt
    // (pro Review eigene Farbe + Buchstaben, statt überall das gleiche Bild).
    const trustReviews = (trustReviewsRaw || []).map((r) => ({
      author: r.author,
      content: r.content,
      avatar_url: r.avatar_url || null,
      rating: Number(r.rating || 5),
      created_at: r.created_at || null
    }));

    // AggregateRating nur ausliefern, wenn wirklich Bewertungen existieren -
    // Fake-Sterne in der SERP verstoßen gegen Googles Richtlinien.
    const aggregateRatingJsonLd = reviewAggregate
      ? `<script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    itemReviewed: { '@id': 'https://www.komplettwebdesign.de/#organization' },
    ratingValue: reviewAggregate.avg,
    reviewCount: reviewAggregate.count,
    bestRating: 5,
    worstRating: 1
  })}
</script>`
      : '';

    res.render('index', {
      title: copy.seoTitle,
      description: copy.seoDescription,
      keywords: copy.seoKeywords,
      seoExtra: `
  <meta property="og:title" content="${copy.ogTitle}">
  <meta property="og:site_name" content="Komplett Webdesign">
  <meta property="og:description" content="${copy.ogDescription}">
  <meta property="og:image" content="${base}/images/heroBg.webp">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${lng === 'en' ? 'Komplett Webdesign – professional websites from Berlin' : 'Komplett Webdesign – professionelle Websites aus Berlin'}">
  <meta property="og:url" content="${base}${pagePath}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${lng === 'en' ? 'en_US' : 'de_DE'}">
  <meta property="og:locale:alternate" content="${lng === 'en' ? 'de_DE' : 'en_US'}">
  ${aggregateRatingJsonLd}`,
      alternateUrls,
      users,
      packages,
      latestPost: latestPostLocalized,
      review: reviewLocalized,
      trustReviews,
      reviewAggregate,
      googleProfileUrl: GOOGLE_PROFILE_URL,
      googleReviewUrl: GOOGLE_REVIEW_URL,
      faq: HOMEPAGE_FAQ[lng] || HOMEPAGE_FAQ.de,
      lng,
      copy,
      stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY,
      YOUR_DOMAIN: process.env.YOUR_DOMAIN
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Abrufen der Daten.');
  }
}

export async function redirectIndex(req, res) {
  res.redirect('/');
}

export async function postAddUser(req, res) {
  await User.create(req.body.name);
  res.redirect('/');
}

export async function postDeleteUser(req, res) {
  await User.delete(req.body.id);
  res.redirect('/');
}

export async function getAbout(req, res) {
  res.render('about', {
    title: 'Über uns - Wer ist Komplett Webdesign?',
    description: 'Erfahren Sie mehr über Komplett Webdesign und mich. Ich bin ein leidenschaftlicher Webentwickler aus Berlin, der es liebt, kreative und funktionale Websites zu erstellen.',
    keywords: 'Webdesign,Webentwicklung,Über uns,Komplett Webdesign'
  });
}

export async function getBranchen(req, res) {
  const packages = await Package.fetchAll();

  res.render('branchen-tempaltes', {
    title: 'Branchen-Websites erstellen lassen – Komplett Webdesign',
    description: 'Professionelles Webdesign für verschiedene Branchen: Lass deine Website von Experten erstellen. Maßgeschneiderte Lösungen für deinen Erfolg.',
    keywords: 'Webdesign,Branchen-Websites,Webentwicklung',
    packages
  });
}


export async function getPolicy(req, res) {
  res.render('return_policy', {
    title: 'Return Policy / Rückgaberegelung – Komplett Webdesign',
    description: 'Unsere rechtlich verbindliche Rückgaberegelung für individuell erstellte Software-Projekte. Keine Rückgabe möglich.',
  });
}
