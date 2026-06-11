import { getSeoLandingPage } from '../data/seoLandingPages.js';
import { withServiceHeroImage } from '../data/serviceHeroImages.js';
import { interpolatePricingTokens } from '../util/pricingViewModel.js';

const DEFAULT_HERO_KICKER = Object.freeze({
  icon: 'fa-layer-group',
  label: 'Leistung'
});

const HERO_KICKERS = Object.freeze({
  'website-erstellen-lassen-berlin': { icon: 'fa-pen-ruler', label: 'Website-Erstellung' },
  'website-relaunch-berlin': { icon: 'fa-arrows-rotate', label: 'Website-Relaunch' },
  'website-audit': { icon: 'fa-magnifying-glass-chart', label: 'Website-Prüfung' },
  'landingpage-erstellen-lassen': { icon: 'fa-bullseye', label: 'Landingpage-Fokus' },
  'webdesign-kleine-unternehmen-berlin': { icon: 'fa-store', label: 'Kleine Unternehmen' },
  ablauf: { icon: 'fa-route', label: 'Projektablauf' }
});

const HERO_PANELS = Object.freeze({
  'website-erstellen-lassen-berlin': {
    title: 'Was du realistisch bekommst',
    text: 'Die Website-Erstellung wird als Projekt mit klarer Struktur geplant. Ich kläre, welche Seiten, Inhalte und technischen Grundlagen für dein Unternehmen sinnvoll sind.',
    items: [
      { icon: 'fa-diagram-project', text: 'Ziele, Seitenstruktur und Inhalte zuerst klären.' },
      { icon: 'fa-pen-ruler', text: 'Design, Texte und Technik zusammenführen.' },
      { icon: 'fa-circle-check', text: 'Launch mit Prüfung und klaren Anfragewegen vorbereiten.' }
    ]
  },
  'website-relaunch-berlin': {
    title: 'Was du realistisch bekommst',
    text: 'Ein Relaunch wird als strukturierte Erneuerung geplant. Ich prüfe, welche Inhalte, Nutzerwege und technischen Schritte für deinen Umfang sinnvoll sind.',
    items: [
      { icon: 'fa-sitemap', text: 'Bestehende Struktur, Inhalte und Ziele sauber einordnen.' },
      { icon: 'fa-arrow-right-arrow-left', text: 'Weiterleitungen und wichtige URLs bewusst planen.' },
      { icon: 'fa-list-check', text: 'Design, Technik und SEO-Risiken vor dem Launch prüfen.' }
    ]
  },
  'website-audit': {
    title: 'Was du realistisch bekommst',
    text: 'Ein Website-Audit wird als strukturierte Prüfung geplant. Ich ordne sichtbare Schwachstellen, technische Signale und nächste Schritte nachvollziehbar ein.',
    items: [
      { icon: 'fa-magnifying-glass-chart', text: 'Technik, Inhalte und Nutzerführung zusammen prüfen.' },
      { icon: 'fa-list-ol', text: 'Prioritäten statt pauschaler Empfehlungen festlegen.' },
      { icon: 'fa-receipt', text: 'Kostenrahmen für sinnvolle nächste Schritte abgrenzen.' }
    ]
  },
  'landingpage-erstellen-lassen': {
    title: 'Was du realistisch bekommst',
    text: 'Eine Landingpage wird als fokussierte Seite geplant. Ich kläre, welches Ziel, welche Inhalte und welche Anfragewege für deinen Umfang sinnvoll sind.',
    items: [
      { icon: 'fa-bullseye', text: 'Ziel, Angebot und Anfrageweg aufeinander abstimmen.' },
      { icon: 'fa-layer-group', text: 'Inhalte auf eine klare Entscheidung ausrichten.' },
      { icon: 'fa-scale-balanced', text: 'Tracking, Rechtliches und Betrieb separat abgrenzen.' }
    ]
  },
  'webdesign-kleine-unternehmen-berlin': {
    title: 'Was du realistisch bekommst',
    text: 'Webdesign für kleine Unternehmen wird kompakt und ausbaufähig geplant. Ich prüfe, welche Seiten, Kontaktwege und Inhalte für den Start reichen.',
    items: [
      { icon: 'fa-location-dot', text: 'Leistungen, Einzugsgebiet und Kontaktwege sichtbar machen.' },
      { icon: 'fa-seedling', text: 'Kompakt starten und spätere Erweiterungen offen halten.' },
      { icon: 'fa-wallet', text: 'Pflegeaufwand und Budget realistisch einordnen.' }
    ]
  },
  ablauf: {
    title: 'Was du im Ablauf einordnen kannst',
    text: 'Der Projektablauf wird in klare Schritte gegliedert. Ich zeige, welche Entscheidungen vor Struktur, Design, Umsetzung und Launch nötig sind.',
    items: [
      { icon: 'fa-comments', text: 'Erstgespräch, Ziele und Umfang festhalten.' },
      { icon: 'fa-diagram-project', text: 'Struktur, Inhalte und Design nacheinander freigeben.' },
      { icon: 'fa-rocket', text: 'Prüfung, Launch und nächste Schritte planen.' }
    ]
  }
});

function baseUrlFrom(res) {
  return (res.locals.canonicalBaseUrl || process.env.CANONICAL_BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
}

function buildHeroPanel(page) {
  if (HERO_PANELS[page.slug]) return HERO_PANELS[page.slug];

  return {
    title: 'Was du realistisch bekommst',
    text: `${page.h1} wird mit klarem Umfang geplant. Ich ordne Ziele, Inhalte und technische Anforderungen vor der Umsetzung nachvollziehbar ein.`,
    items: (page.sections || []).slice(0, 3).map((section, index) => ({
      icon: ['fa-layer-group', 'fa-list-check', 'fa-receipt'][index] || 'fa-circle-check',
      text: section.heading
    }))
  };
}

function buildBreadcrumbs(page, baseUrl) {
  const items = [
    {
      label: 'Startseite',
      href: '/'
    }
  ];

  if (page.parentBreadcrumb?.label && page.parentBreadcrumb?.href) {
    items.push(page.parentBreadcrumb);
  }

  items.push({
    label: page.h1,
    href: page.path,
    current: true
  });

  return items.map((item) => ({
    ...item,
    absoluteUrl: item.href.startsWith('http') ? item.href : `${baseUrl}${item.href === '/' ? '/' : item.href}`
  }));
}

function buildStructuredData(page, baseUrl, canonicalUrl) {
  const breadcrumbs = buildBreadcrumbs(page, baseUrl);
  const parentUrl = page.parentBreadcrumb?.href ? `${baseUrl}${page.parentBreadcrumb.href}` : baseUrl;

  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.h1,
      headline: page.h1,
      description: page.description,
      url: canonicalUrl,
      inLanguage: 'de-DE',
      about: page.primaryKeyword,
      isPartOf: {
        '@type': 'WebPage',
        name: page.parentBreadcrumb?.label || 'Komplett Webdesign',
        url: parentUrl
      },
      publisher: {
        '@type': 'Organization',
        name: 'Komplett Webdesign',
        url: baseUrl
      }
    },
    page.service ? {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${canonicalUrl}#service`,
      name: page.service.name || page.h1,
      serviceType: page.service.serviceType || page.primaryKeyword,
      provider: {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'Komplett Webdesign',
        url: baseUrl
      },
      areaServed: (page.service.areaServed || ['Berlin']).map((name) => ({
        '@type': 'AdministrativeArea',
        name
      })),
      description: page.description
    } : null,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.current ? canonicalUrl : item.absoluteUrl
      }))
    },
    page.faq?.length ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    } : null
  ];

  return blocks.filter(Boolean);
}

export function showSeoLandingPage(req, res, next) {
  const rawPage = getSeoLandingPage(req.params.slug);
  if (!rawPage) return next();
  const page = withServiceHeroImage(interpolatePricingTokens(rawPage, res.locals.packagePricing || {}, { lng: 'de' }));

  const baseUrl = baseUrlFrom(res);
  const canonicalUrl = `${baseUrl}${page.path}`;
  const breadcrumbs = buildBreadcrumbs(page, baseUrl);
  const ogImage = page.heroImage?.src ? `${baseUrl}${page.heroImage.src}` : undefined;

  return res.render('seo_landing/show', {
    title: page.title,
    description: page.description,
    canonicalUrl,
    ogImage,
    page,
    breadcrumbs,
    heroKicker: HERO_KICKERS[page.slug] || DEFAULT_HERO_KICKER,
    heroPanel: buildHeroPanel(page),
    structuredDataBlocks: buildStructuredData(page, baseUrl, canonicalUrl)
  });
}
