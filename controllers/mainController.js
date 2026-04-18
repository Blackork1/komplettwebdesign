import pool from '../util/db.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Review from '../models/Review.js';
import Package from '../models/Package.js';

// Öffentliches Google-Profil (aus sameAs im JSON-LD) – zentral hier gepflegt,
// damit Trust-Sektion und "Alle Bewertungen"-Button konsistent bleiben.
const GOOGLE_PROFILE_URL = 'https://www.google.com/maps/place/Komplett+Webdesign/@52.451726,11.6969877,8z/data=!3m1!4b1!4m6!3m5!1s0x40da1c9a5b81fab7:0x71f65ccfd1ed06f0!8m2!3d52.45906!4d13.0157992!16s%2Fg%2F11xs7y9j31?entry=ttu';
const GOOGLE_REVIEW_URL  = 'https://g.page/r/CfAG7dHPXPZxEAE/review';
const MIN_REVIEWS_FOR_AGGREGATE = 3;

const HOMEPAGE_FAQ = {
  de: [
    {
      q: 'Was kostet es, eine Website erstellen zu lassen?',
      a: 'Bei mir gibt es transparente Festpreise: Landingpage ab 499,99 €, mehrseitige Website ab 899,99 €, Komplettlösung (bis 25 Seiten, Shop, Buchung) ab 1499,99 €. Laufende Kosten wie Hosting und Wartung rechne ich separat und nach Verbrauch ab – keine versteckten Kosten.'
    },
    {
      q: 'Wie lange dauert es, bis meine Website online ist?',
      a: 'Eine Landingpage geht typischerweise in 30 Tagen live. Bereits nach 7 Tagen steht der erste Entwurf, nach 14 Tagen das finale Design, Tag 21 ist Live-Test, Tag 30 Launch. Bei größeren Projekten plane ich den Zeitrahmen individuell.'
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
      a: 'Schwerpunkte sind Restaurants und Cafés, Handwerksbetriebe, Immobilienmakler, Kitas und Schulen sowie Selbstständige und kleine Dienstleister. Ich kenne die Anforderungen dieser Branchen – z. B. digitale Speisekarten, Referenzgalerien, Exposés, Betreuungszeiten – und setze sie gezielt um.'
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
      a: 'In einem 20-minütigen Kennenlernen klären wir Ziele und Budget. Danach erstelle ich ein Konzept und einen Entwurf, den wir gemeinsam anpassen. Nach Freigabe erfolgen Umsetzung, Live-Test und Launch. Du hast immer einen festen Ansprechpartner und schnelle Antworten innerhalb von 24 Stunden.'
    }
  ],
  en: [
    {
      q: 'How much does it cost to have a website built?',
      a: 'Transparent fixed prices: landing page from €499.99, multi-page website from €899.99, all-in solution (up to 25 pages, shop, booking) from €1,499.99. Hosting and maintenance are billed separately and based on usage – no hidden costs.'
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
    seoTitle: 'Website erstellen lassen Berlin – ab 499 € · in 30 Tagen live | Komplett Webdesign',
    seoDescription: 'Website erstellen lassen in Berlin: modernes Webdesign, SEO-Optimierung, Hosting und Support aus einer Hand. Festpreis ab 499 €, live in 30 Tagen.',
    seoKeywords: 'webseite erstellen lassen, webdesign in berlin, website in berlin erstellen lassen, webdesigner berlin, lokale seo berlin',
    ogTitle: 'Website erstellen lassen in Berlin – ab 499 €, live in 30 Tagen',
    ogDescription: 'Webdesign, SEO, Hosting und Support aus einer Hand. Ich erstelle deine professionelle Website in Berlin – mit Festpreis und klarem Zeitplan.',
    heroBadge: 'Deine neue Website in nur 30 Tagen',
    heroTitle: 'Webseite in Berlin erstellen lassen',
    heroTitle2: 'Konzept bis Hosting',
    heroSubline: 'schnell, modern, ab 499,- EUR',
    heroBullet1: 'Optimiert für Handy, Tablet & Desktop',
    heroBullet2: 'Klarer Festpreis & fixer Zeitplan – 0 Technik-Stress',
    heroBullet3: 'SEO-Basis & schnelle Ladezeiten von Anfang an',
    heroCtaPrimary: 'Beratungstermin',
    heroCtaSecondary: 'Pakete ansehen',
    heroBadge1: 'Landingpage ab 499,99 EUR',
    heroBadge2: 'Mehrseiter ab 899,99 EUR',
    heroBadge3: 'All-in ab 1499,99 EUR',
    introTitleStrong: 'Deine professionelle Website aus Berlin',
    introTitleRest: 'aus einer Hand bei',
    featuresTitle: 'Was biete ich dir für deine Websiteerstellung?',
    timelineTitle: 'Dein Zeitplan – heute starten, in 30 Tagen live',
    timelineNote: 'Für größere Websites verlängern sich die Zeiten entsprechend.',
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
    pricingTagline: '„Günstige Website erstellen lassen" heißt: smart geplant, modular umgesetzt, ohne versteckte Kosten.',
    industryTitle: 'Webseiten für Restaurants, Handwerksbetriebe, Cafés und Bildungseinrichtungen in Berlin',
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
    heroBadge: 'Your new website in just 30 days',
    heroTitle: 'Get a website built in Berlin',
    heroTitle2: 'from concept to hosting',
    heroSubline: 'fast, modern, from 499 EUR',
    heroBullet1: 'Optimized for mobile, tablet and desktop',
    heroBullet2: 'Clear fixed pricing and timeline – zero technical stress',
    heroBullet3: 'SEO basics and fast loading times from day one',
    heroCtaPrimary: 'Book a consultation',
    heroCtaSecondary: 'View packages',
    heroBadge1: 'Landing page from 499.99 EUR',
    heroBadge2: 'Multi-page website from 899.99 EUR',
    heroBadge3: 'All-in from 1499.99 EUR',
    introTitleStrong: 'Your professional website from Berlin',
    introTitleRest: 'from one source at',
    featuresTitle: 'What do I offer for your website project?',
    timelineTitle: 'Your timeline – start today, go live in 30 days',
    timelineNote: 'For larger websites, timelines are adjusted accordingly.',
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
    industryTitle: 'Websites for restaurants, trades, cafes, and educational institutions in Berlin',
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
  if (lng !== 'en') return packages;

  const nameMap = {
    Basis: 'Starter',
    Business: 'Business',
    Premium: 'Premium'
  };

  const descriptionBySlug = {
    basis: 'Starter website package for self-employed professionals: modern one-pager including design, legal pages, hosting, and GDPR support. Professional website in Berlin from 499 EUR.',
    business: 'For growing businesses: multi-page website with landing pages, SEO content, and booking flow. Business website in Berlin from 899 EUR.',
    premium: 'All-in solution for ambitious brands: strategy workshops, UX concept, content production, and ongoing support. Premium website in Berlin from 1,499 EUR.'
  };

  const featureMap = {
    'Onepage Website': 'One-page website',
    'Responsives Design': 'Responsive design',
    'DSGVO konform': 'GDPR compliant',
    'Mehrseitige Website': 'Multi-page website',
    'Individuelles Layout': 'Custom layout',
    'SEO-optimiert': 'SEO optimized',
    'Maßgeschneiderte Lösung': 'Tailored solution',
    'Online-Shop möglich': 'Online shop possible',
    'Erweiterte Funktionen': 'Advanced features'
  };

  return packages.map((pkg) => {
    const amount = Number(pkg.price_amount_cents || 0) / 100;
    return {
      ...pkg,
      name: nameMap[pkg.name] || pkg.name,
      description: descriptionBySlug[pkg.slug] || pkg.description,
      features: (pkg.features || []).map((feat) => featureMap[feat] || feat),
      price: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
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
  <meta property="og:url" content="${base}${pagePath}">
  <meta property="og:type" content="website">
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
