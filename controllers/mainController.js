import pool from '../util/db.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Review from '../models/Review.js';
import Package from '../models/Package.js';

const HOMEPAGE_I18N = {
  de: {
    seoTitle: 'Webseite erstellen lassen in Berlin | Webdesign, SEO & Hosting',
    seoDescription: 'Webdesign in Berlin: Website professionell erstellen lassen inkl. SEO, mobiloptimiertem Design, Hosting und Support. Transparente Pakete ab 499 EUR.',
    seoKeywords: 'webseite erstellen lassen, webdesign in berlin, website in berlin erstellen lassen, webdesigner berlin, lokale seo berlin',
    ogTitle: 'Webseite erstellen lassen in Berlin | Webdesign, SEO & Hosting',
    ogDescription: 'Webdesign in Berlin mit SEO, Hosting und persönlichem Support. Lass deine Website professionell erstellen und lokal besser gefunden werden.',
    heroBadge: 'Deine neue Website in nur 30 Tagen',
    heroTitle: 'Webseite in Berlin erstellen lassen',
    heroTitle2: 'Konzept bis Hosting',
    heroSubline: 'schnell, modern, ab 499,- EUR',
    heroBullet1: 'Optimiert für Handy, Tablet & Desktop',
    heroBullet2: 'Klarer Festpreis & fixer Zeitplan - 0 Technik-Stress',
    heroBullet3: 'SEO-Basis & schnelle Ladezeiten von Anfang an',
    heroCtaPrimary: 'Beratungstermin',
    heroCtaSecondary: 'Pakete ansehen',
    heroBadge1: 'Landingpage ab 499,99 EUR',
    heroBadge2: 'Mehrseiter ab 899,99 EUR',
    heroBadge3: 'All-in ab 1499,99 EUR',
    introTitleStrong: 'Website in Berlin erstellen lassen',
    introTitleRest: 'professionelles Webdesign aus einer Hand bei',
    featuresTitle: 'Was biete ich dir für deine Websiteerstellung?',
    timelineTitle: 'Dein Zeitplan - heute starten, in 30 Tagen live',
    timelineNote: 'Für größere Websites verlängern sich die Zeiten entsprechend.',
    servicesTitle: 'Alles aus einer Hand - Wir erstellen deine professionelle Website in Berlin',
    blogSectionTitle: 'Aktuelles zum Thema Webseiten und bisherige Kundenstimmen',
    blogCardTitle: 'Aktueller Blog-Artikel',
    blogSoon: '(Demnächst mehr...)',
    blogDaysAgo: 'Tagen',
    blogToArticle: 'Zum Artikel',
    blogToOverview: 'Zum Blog',
    reviewCardTitle: 'Kundenstimme',
    reviewSoon: '(Demnächst echte Stimmen...)',
    pricingTitle: 'Bereit für eine professionelle Website?',
    pricingTagline: '"Günstige Website erstellen lassen" heißt: smart geplant, modular umgesetzt, ohne versteckte Kosten.',
    industryTitle: 'Webseiten für Restaurants, Handwerksbetriebe, Cafés und Bildungseinrichtungen in Berlin'
  },
  en: {
    seoTitle: 'Website Development in Berlin | Web Design, SEO & Hosting',
    seoDescription: 'Professional web design in Berlin including SEO, mobile optimization, hosting, and support. Transparent packages from 499 EUR.',
    seoKeywords: 'website development berlin, web design berlin, berlin web designer, local seo berlin, website creation berlin',
    ogTitle: 'Website Development in Berlin | Web Design, SEO & Hosting',
    ogDescription: 'Web design in Berlin with SEO, hosting, and personal support. Get your website built professionally and improve local visibility.',
    heroBadge: 'Your new website in just 30 days',
    heroTitle: 'Get a website built in Berlin',
    heroTitle2: 'from concept to hosting',
    heroSubline: 'fast, modern, from 499 EUR',
    heroBullet1: 'Optimized for mobile, tablet and desktop',
    heroBullet2: 'Clear fixed pricing and timeline - zero technical stress',
    heroBullet3: 'SEO basics and fast loading times from day one',
    heroCtaPrimary: 'Book a consultation',
    heroCtaSecondary: 'View packages',
    heroBadge1: 'Landing page from 499.99 EUR',
    heroBadge2: 'Multi-page website from 899.99 EUR',
    heroBadge3: 'All-in from 1499.99 EUR',
    introTitleStrong: 'Get your website built in Berlin',
    introTitleRest: 'professional web design from one source at',
    featuresTitle: 'What do I offer for your website project?',
    timelineTitle: 'Your timeline - start today, go live in 30 days',
    timelineNote: 'For larger websites, timelines are adjusted accordingly.',
    servicesTitle: 'Everything from one source - We build your professional website in Berlin',
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
    industryTitle: 'Websites for restaurants, trades, cafes, and educational institutions in Berlin'
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
    const users = await User.fetchAll();
    const packagesRaw = await Package.fetchAll();
    const packages = localizeHomepagePackages(packagesRaw, lng);
    const latestPostRaw = await Post.fetchLatest();
    const reviewRaw = await Review.fetchRandom();

    const latestPostFallback = lng === 'en'
      ? {
          title: 'More blog content coming soon',
          slug: '',
          excerpt: 'Check back soon for website tips and practical guides.',
          image_url: '/images/default-blog.webp',
          created_at: new Date(),
          isDefault: true
        }
      : {
          title: 'Demnächst hier: Neue Blog-Artikel!',
          slug: '',
          excerpt: 'Schau bald wieder vorbei für spannende Tipps & Tricks zu Webdesign.',
          image_url: '/images/default-blog.webp',
          created_at: new Date(),
          isDefault: true
        };

    const reviewFallback = lng === 'en'
      ? {
          author: 'Your review could appear here',
          content: 'Client feedback will be published here soon.',
          avatar_url: '/images/avatar.webp',
          isDefault: true
        }
      : {
          author: 'Deine Meinung ist hier willkommen!',
          content: 'In Kürze findest du hier echte Kundenstimmen zu meinen Webdesign-Projekten.',
          avatar_url: '/images/avatar.webp',
          isDefault: true
        };

    const latestPost = latestPostRaw || latestPostFallback;
    const review = reviewRaw || reviewFallback;
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
  <meta property="og:type" content="website">`,
      users,
      packages,
      latestPost: latestPostLocalized,
      review: reviewLocalized,
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
