import pool from '../util/db.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Review from '../models/Review.js';
import pricingService from '../services/pricingService.js';
import {
  buildPricingViewModel,
  interpolatePricingTokens
} from '../util/pricingViewModel.js';
import { buildHomeHeroBridgeHighlights } from '../data/homeHighlights.js';

// Öffentliches Google-Profil (aus sameAs im JSON-LD) – zentral hier gepflegt,
// damit Trust-Sektion und "Alle Bewertungen"-Button konsistent bleiben.
const GOOGLE_PROFILE_URL = 'https://www.google.com/maps/place/Komplett+Webdesign/@52.451726,11.6969877,8z/data=!3m1!4b1!4m6!3m5!1s0x40da1c9a5b81fab7:0x71f65ccfd1ed06f0!8m2!3d52.45906!4d13.0157992!16s%2Fg%2F11xs7y9j31?entry=ttu';
const GOOGLE_REVIEW_URL  = 'https://g.page/r/CfAG7dHPXPZxEAE/review';
const MIN_REVIEWS_FOR_AGGREGATE = 3;

const HOMEPAGE_FAQ = {
  de: [
    {
      q: 'Was kostet eine Website bei Komplett Webdesign?',
      a: 'Website-Pakete starten bei {{lowestPackagePriceLabel}} mit klar definiertem Umfang. Business-Websites starten bei {{price.business}}, Wachstum-Projekte bei {{price.wachstum}} und individuelle Anforderungen bei {{price.individuell}}.'
    },
    {
      q: 'Warum starten die Pakete bei {{lowestPackagePriceLabel}}?',
      a: 'Die Website wird individuell mit Node.js, EJS, CSS und JavaScript umgesetzt. Du bekommst keine Baukasten-Website und kein Standard-Theme, sondern serverseitig gerendertes HTML mit klarer technischer Grundlage.'
    },
    {
      q: 'Welches Paket passt für mich?',
      a: 'Start passt für kompakte Websites, Business für mehrere Leistungen und Wachstum für Relaunches oder stärkere Seitenstruktur. Sonderfunktionen wie Buchungssystem, CMS, Mehrsprachigkeit oder Shop-Funktionen werden individuell geprüft.'
    },
    {
      q: 'Gibt es laufende Kosten nach dem Launch?',
      a: 'Domain, E-Mail, Hosting, Wartung und Drittanbieter-Tools können separat anfallen. Diese laufenden Kosten werden nicht automatisch in den einmaligen Projektpreis eingerechnet.'
    },
    {
      q: 'Sind Texte und SEO enthalten?',
      a: 'Gelieferte Inhalte werden je nach Paket eingebunden und strukturiert. Technische SEO-Grundlagen sind im vereinbarten Umfang enthalten; umfangreiche Texterstellung, Local SEO und zusätzliche SEO-Seiten sind separate Leistungen.'
    },
    {
      q: 'Gibt es eine Ranking-Garantie?',
      a: 'Nein. Ich setze technische SEO-Grundlagen um und achte auf saubere Struktur, Metadaten und Ladezeit. Bestimmte Platzierungen bei Google können nicht garantiert werden.'
    },
    {
      q: 'Sind Impressum und Datenschutzerklärung enthalten?',
      a: 'Impressum, Datenschutzerklärung und Cookie-Hinweise können technisch eingebunden werden. Die Erstellung oder rechtliche Prüfung dieser Texte ist keine Rechtsberatung und sollte bei Bedarf über spezialisierte Anbieter oder eine Rechtsberatung erfolgen.'
    },
    {
      q: 'Sind Buchungssysteme, CMS oder Shops möglich?',
      a: 'Ja, aber nicht als pauschales Standardpaket. Buchungssysteme, CMS, Mehrsprachigkeit und kleine Shop-Funktionen sind als Zusatzleistung oder individuelles Projekt möglich.'
    },
    {
      q: 'Wie viele Feedbackrunden sind enthalten?',
      a: 'Feedbackrunden richten sich nach dem gewählten Paket und dem vereinbarten Umfang. Zusätzliche Änderungswünsche nach Freigabe werden vor der Umsetzung besprochen und separat kalkuliert.'
    },
    {
      q: 'Wie lange dauert ein Projekt?',
      a: 'Kompakte Start-Websites dauern häufig 2 bis 4 Wochen, Business-Projekte meist 4 bis 6 Wochen. Wachstum- und individuelle Projekte hängen stärker von Inhalten, Feedback, Funktionen und technischen Zugängen ab.'
    }
  ],
  en: [
    {
      q: 'How much does it cost to have a website built?',
      a: 'Website packages start at {{lowestPackagePriceLabel.en}} for clearly defined scope. Business projects start at {{price.business.en}}, larger websites or relaunches at {{price.wachstum.en}}. Custom functionality is estimated individually.'
    },
    {
      q: 'How long until my website goes live?',
      a: 'Compact Start websites often take 2 to 4 weeks, Business projects usually 4 to 6 weeks and Growth projects longer depending on scope. Content, feedback, access and add-ons affect the timeline.'
    },
    {
      q: 'What is included in the price?',
      a: 'Depending on the package, scope includes custom web design, responsive implementation, technical SEO basics, structuring supplied content and one personal point of contact. Legal pages can be integrated technically; legal review is not included.'
    },
    {
      q: 'Do you also handle hosting and maintenance?',
      a: 'Yes. Hosting, domain, email, maintenance, backups or monitoring can be agreed separately. Running costs are kept separate from the one-time project price.'
    },
    {
      q: 'Will my website be visible on Google?',
      a: 'The site is built with technical SEO basics, clean HTML, fast loading and proper metadata. Specific Google rankings cannot be guaranteed.'
    },
    {
      q: 'Can I edit my website myself later?',
      a: 'Simple CMS or content-management functionality can be planned as a custom add-on. Alternatively, ongoing content updates can be agreed separately.'
    },
    {
      q: 'Which industries do you build websites for?',
      a: 'Focus areas are local service providers, restaurants and cafés, trades, real estate agents, beauty and wellness providers, practices, small shops and local retailers. I know the practical needs of these industries - menus, project galleries, listings, opening hours and clear inquiry paths - and implement them with focus.'
    },
    {
      q: 'Do you only work with clients in Berlin?',
      a: 'I am based in Berlin-Lichtenberg, most of my clients come from Berlin and Brandenburg, but I serve clients across Germany. Meetings run via video call; on-site meetings in Berlin are always possible.'
    },
    {
      q: 'How are privacy and legal pages handled?',
      a: 'Technical privacy basics are considered. Imprint, privacy policy and cookie notices can be integrated technically; legal creation or review is not legal advice.'
    },
    {
      q: 'How does the collaboration actually work?',
      a: 'A 20-minute intro call to clarify goals and budget. Then I prepare a concept and draft which we refine together. After approval: implementation, live test, launch. You always have one fixed contact and replies within 24 hours.'
    }
  ]
};

const HOMEPAGE_I18N = {
  de: {
    seoTitle: 'Website erstellen lassen Berlin | Webdesign ab {{lowestPackagePriceLabel}}',
    seoDescription: 'Professionelles Webdesign aus Berlin für Selbstständige, kleine Unternehmen und lokale Dienstleister. Ohne Baukasten, mit klaren Paketen ab {{lowestPackagePriceLabel}} und Fokus auf Kontaktanfragen.',
    seoKeywords: 'website erstellen lassen berlin, webdesign berlin, webdesigner berlin, website für kleine unternehmen berlin, webdesign preise berlin, website pakete berlin, webdesign brandenburg, local seo berlin',
    ogTitle: 'Website erstellen lassen Berlin | Webdesign ab {{lowestPackagePriceLabel}}',
    ogDescription: 'Professionelles Webdesign aus Berlin für Selbstständige, kleine Unternehmen und lokale Dienstleister. Ohne Baukasten, mit klaren Paketen ab {{lowestPackagePriceLabel}}.',
    heroBadge: 'Webdesign aus Berlin · ohne Baukasten',
    heroTitle: 'Website erstellen lassen in Berlin',
    heroTitle2: 'klar, modern und auf Anfragen optimiert',
    heroSubline: 'Ich erstelle Websites für Selbstständige, kleine Unternehmen und lokale Dienstleister in Berlin & Brandenburg – technisch sauber, verständlich kalkuliert und ohne Standard-Theme.',
    heroBullet1: 'Maßgeschneidert statt Baukasten oder Template-Look',
    heroBullet2: 'Klare Pakete ab {{lowestPackagePriceLabel}} mit transparentem Leistungsumfang',
    heroBullet3: 'Struktur, Design und Entwicklung mit Fokus auf Kontaktanfragen',
    heroCtaPrimary: 'Website-Projekt anfragen',
    heroCtaSecondary: 'Pakete ansehen',
    heroTrustNote: 'Kostenlose Ersteinschätzung',
    heroBadge1: 'Start {{price.start}}',
    heroBadge2: 'Business {{price.business}}',
    heroBadge3: 'Wachstum {{price.wachstum}}',
    introTitleStrong: 'Website erstellen lassen in Berlin',
    introTitleRest: 'mit persönlicher Betreuung bei',
    featuresTitle: 'Warum Komplett Webdesign anders arbeitet',
    timelineTitle: 'So läuft dein Website-Projekt ab',
    timelineNote: 'Klare Einschätzung, abgegrenztes Angebot, individuelle Umsetzung und Feedbackrunden im vereinbarten Umfang.',
    servicesTitle: 'Webdesign-Leistungen im Überblick',
    blogSectionTitle: 'Aktuelles zum Thema Webseiten und bisherige Kundenstimmen',
    blogCardTitle: 'Aktueller Blog-Artikel',
    blogSoon: '(Demnächst mehr...)',
    blogDaysAgo: 'Tagen',
    blogToArticle: 'Zum Artikel',
    blogToOverview: 'Zum Blog',
    reviewCardTitle: 'Kundenstimme',
    reviewSoon: '(Demnächst echte Stimmen...)',
    pricingTitle: 'Website-Pakete ab {{lowestPackagePriceLabel}}',
    pricingTagline: 'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer. Zusatzwünsche und laufende Kosten werden separat ausgewiesen.',
    industryTitle: 'Für wen Komplett Webdesign passt',
    trustTitle: 'Persönlich, transparent und lokal ausgerichtet',
    trustSubline: 'Hier siehst du ein echtes Projektbeispiel von mir sowie echte Bewertungen von Kunden, die bereits mit Komplett Webdesign zusammengearbeitet haben.',
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
    seoTitle: 'Website Development Berlin – Packages from {{lowestPackagePriceLabel.en}} | Komplett Webdesign',
    seoDescription: 'Have your website built in Berlin: custom web design, responsive implementation, technical SEO basics and clear packages from {{lowestPackagePriceLabel.en}}.',
    seoKeywords: 'website development berlin, web design berlin, berlin web designer, local seo berlin, website creation berlin',
    ogTitle: 'Website Development in Berlin – packages from {{lowestPackagePriceLabel.en}}',
    ogDescription: 'Custom web design, technical SEO basics and clear website packages from {{lowestPackagePriceLabel.en}} for small businesses in Berlin.',
    heroBadge: 'Komplett Webdesign from Berlin',
    heroTitle: 'Get a custom website built in Berlin',
    heroTitle2: '',
    heroSubline: 'Individual web design for small businesses, solo professionals and local service providers.',
    heroBullet1: 'Built with Node.js, EJS, CSS and JavaScript',
    heroBullet2: 'No builder website and no standard theme',
    heroBullet3: 'Packages from {{lowestPackagePriceLabel.en}} with clear scope boundaries',
    heroCtaPrimary: 'Request website project',
    heroCtaSecondary: 'View packages',
    heroTrustNote: 'Free initial assessment',
    heroBadge1: 'Start {{price.start.en}}',
    heroBadge2: 'Business {{price.business.en}}',
    heroBadge3: 'Growth {{price.wachstum.en}}',
    introTitleStrong: 'Custom website from Berlin',
    introTitleRest: 'with personal support at',
    featuresTitle: 'Why Komplett Webdesign works differently',
    timelineTitle: 'How your website project works',
    timelineNote: 'Clear recommendation, scoped offer, custom implementation and feedback rounds in the agreed scope.',
    servicesTitle: 'Web design services at a glance',
    blogSectionTitle: 'Latest website topics and client feedback',
    blogCardTitle: 'Latest blog post',
    blogSoon: '(More coming soon...)',
    blogDaysAgo: 'days',
    blogToArticle: 'Read article',
    blogToOverview: 'Go to blog',
    reviewCardTitle: 'Client feedback',
    reviewSoon: '(Real feedback coming soon...)',
    pricingTitle: 'Website packages from {{lowestPackagePriceLabel.en}}',
    pricingTagline: 'All prices are listed under § 19 UStG without VAT shown. Add-ons and running costs are shown separately.',
    industryTitle: 'Websites for local service providers, restaurants, trades and small retailers in Berlin',
    trustTitle: 'Personal, transparent and locally focused',
    trustSubline: 'Here you can see a real project example from Komplett Webdesign and verified client reviews from people who have already worked with me.',
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

async function localizeHomepagePackages(packages, lng) {
  const isEn = lng === 'en';
  const legacySlugMap = {
    basis: 'start',
    basic: 'start',
    premium: 'wachstum'
  };

  const englishNames = {
    start: 'Start',
    business: 'Business',
    wachstum: 'Growth',
    individuell: 'Individual'
  };

  const englishDescriptions = {
    start: 'For founders, solo professionals and local providers that need a compact custom website with clear scope.',
    business: 'For small businesses that need multiple content pages, clear offer structure and technical SEO basics.',
    wachstum: 'For larger websites, relaunches and stronger page structures with several service pages.',
    individuell: 'For custom functionality such as booking flows, CMS, multilingual setup or small shop features after review.'
  };

  const englishFeatures = {
    start: [
      '1 to 3 content pages or one clearly structured one-pager',
      'Responsive web design for mobile, tablet and desktop',
      'Technical SEO basics and supplied-content integration'
    ],
    business: [
      'Approx. 4 to 7 content pages',
      'Clear inquiry flow and technical SEO structure',
      'Additional pages and local SEO add-ons available separately'
    ],
    wachstum: [
      'Approx. 8 to 12 content pages in the agreed scope',
      'Stronger structure for relaunches and several service pages',
      'Booking, CMS or shop functionality treated as add-ons or custom work'
    ],
    individuell: [
      'Custom scope after feasibility review',
      'Suitable for booking, CMS, multilingual setup or special features',
      'Third-party and running costs clarified separately'
    ]
  };

  return Promise.all(packages.map(async (pkg) => {
    const rawSlug = String(pkg.slug || pkg.name || '').toLowerCase();
    const slug = legacySlugMap[rawSlug] || rawSlug;
    const features = await pricingService.getPackageFeatures(pkg.id).catch(() => []);
    const featureTexts = features.map((item) => item.text).filter(Boolean);

    return {
      ...pkg,
      id: pkg.id || slug,
      display: true,
      name: isEn ? (englishNames[slug] || pkg.name) : pkg.name,
      description: isEn
        ? (englishDescriptions[slug] || pkg.shortDescription || pkg.description)
        : (pkg.shortDescription || pkg.description),
      features: isEn
        ? (englishFeatures[slug] || featureTexts)
        : featureTexts,
      price: isEn ? pkg.priceLabel?.replace(/^ab\s+/i, 'from ').replace(/\s*€\b/g, ' EUR').replace(/(\d)\.(\d{3})/g, '$1,$2').replace(/oder nach Aufwand/i, 'or by effort') : pkg.priceLabel,
      priceLabel: isEn ? pkg.priceLabel?.replace(/^ab\s+/i, 'from ').replace(/\s*€\b/g, ' EUR').replace(/(\d)\.(\d{3})/g, '$1,$2').replace(/oder nach Aufwand/i, 'or by effort') : pkg.priceLabel
    };
  }));
}

export async function getIndex(req, res) {
  try {
    const lng = resolveHomeLanguage(req);
    const pagePath = lng === 'en' ? '/en' : '/';
    const base = (res.locals.canonicalBaseUrl || process.env.BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
    const visiblePackages = res.locals.visiblePackages || await pricingService.getPackagesForHome();
    const packagePriceMap = res.locals.packagePriceMap || await pricingService.getPackagePriceMap();
    const lowestPackagePriceLabel = res.locals.lowestPackagePriceLabel || await pricingService.getLowestVisiblePackagePriceLabel();
    const pricing = res.locals.packagePricing || buildPricingViewModel({
      visiblePackages,
      packagePriceMap,
      lowestPackagePriceLabel,
      contactPackageOptions: res.locals.packageContactOptions || []
    });
    const copy = interpolatePricingTokens(HOMEPAGE_I18N[lng], pricing, { lng });
    const homepageFaq = interpolatePricingTokens(HOMEPAGE_FAQ[lng] || HOMEPAGE_FAQ.de, pricing, { lng });
    const localizedLowestPackagePriceLabel = pricing.lowestLabel(lng);
    const heroBridgeHighlights = buildHomeHeroBridgeHighlights({
      lng,
      lowestPackagePriceLabel: localizedLowestPackagePriceLabel
    });

    // URLs für hreflang (de = default, en = /en)
    const alternateUrls = {
      de: `${base}/`,
      en: `${base}/en`,
      xDefault: `${base}/`
    };

    const users = await User.fetchAll();
    const packages = await localizeHomepagePackages(visiblePackages, lng);
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

    // Bewertungen bleiben sichtbar im Seiteninhalt. Bewertungs-Markup wird bewusst
    // nicht ausgegeben, weil selbst kontrollierte LocalBusiness-Reviews laut
    // Google nicht für Review-Sterne geeignet sind.

    res.render('index', {
      title: copy.seoTitle,
      description: copy.seoDescription,
      keywords: copy.seoKeywords,
      seoExtra: `
  <meta property="og:title" content="${copy.ogTitle}">
  <meta property="og:site_name" content="Komplett Webdesign">
  <meta property="og:description" content="${copy.ogDescription}">
  <meta property="og:image" content="${base}/images/home-hero-klarblick-desktop.webp">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${lng === 'en' ? 'Komplett Webdesign – professional websites from Berlin' : 'Komplett Webdesign – professionelle Websites aus Berlin'}">
  <meta property="og:url" content="${base}${pagePath}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${lng === 'en' ? 'en_US' : 'de_DE'}">
  <meta property="og:locale:alternate" content="${lng === 'en' ? 'de_DE' : 'en_US'}">`,
      alternateUrls,
      users,
      packages,
      latestPost: latestPostLocalized,
      review: reviewLocalized,
      trustReviews,
      reviewAggregate,
      googleProfileUrl: GOOGLE_PROFILE_URL,
      googleReviewUrl: GOOGLE_REVIEW_URL,
      faq: homepageFaq,
      heroBridgeHighlights,
      lowestPackagePriceLabel: localizedLowestPackagePriceLabel,
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
  res.render('branchen-tempaltes', {
    title: 'Branchen-Websites erstellen lassen – Komplett Webdesign',
    description: 'Professionelles Webdesign für verschiedene Branchen: Lass deine Website von Experten erstellen. Maßgeschneiderte Lösungen für deinen Erfolg.',
    keywords: 'Webdesign,Branchen-Websites,Webentwicklung',
    packages: res.locals.visiblePackages || []
  });
}


export async function getPolicy(req, res) {
  res.render('return_policy', {
    title: 'Return Policy / Rückgaberegelung – Komplett Webdesign',
    description: 'Unsere rechtlich verbindliche Rückgaberegelung für individuell erstellte Software-Projekte. Keine Rückgabe möglich.',
  });
}
