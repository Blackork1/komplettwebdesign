// routes/staticPages.js
import { de } from 'date-fns/locale';
import express from 'express';
import { addOnsPage } from '../data/addOnsPage.js';
import { leistungenOverviewPage } from '../data/leistungenOverviewPage.js';
import { localSeoPage } from '../data/localSeoPage.js';
import { maintenancePage } from '../data/maintenancePage.js';
import { runningCostsPage } from '../data/runningCostsPage.js';
import { withServiceHeroImage } from '../data/serviceHeroImages.js';
import pricingService from '../services/pricingService.js';
import { interpolatePricingTokens } from '../util/pricingViewModel.js';
const router  = express.Router();

function packageScope(pkg = {}) {
  return pkg.pageScopeShort || pkg.pageScope || '';
}

function packageName(pkg = {}) {
  return pkg.name || pkg.displayName || '';
}

function packageTextByKey(packageKey) {
  return {
    start: {
      title: 'Start bleibt ein klar begrenzter Einstieg ohne Sonderfunktionen.',
      text: 'Geeignet für Onepager oder 1 bis 3 Inhaltsseiten. Zusätzliche Seiten, Texte, CMS, Buchung oder Tracking werden getrennt geprüft.',
      localSeoText: 'Start enthält technische SEO-Grundlagen im schlanken Umfang. Eine umfangreiche lokale Strategie gehört nicht automatisch dazu.'
    },
    business: {
      title: 'Business ist die häufig passende Unternehmenswebsite.',
      text: 'Geeignet für ca. 4 bis 7 Inhaltsseiten. Weitere Leistungsseiten oder Funktionen können als Zusatzleistung dazukommen.',
      localSeoText: 'Business ist für viele lokale Unternehmen passend, wenn mehrere Leistungen klar erklärt und lokal eingeordnet werden sollen.'
    },
    wachstum: {
      title: 'Wachstum eignet sich für größere Strukturen, Relaunches und mehrere Leistungsseiten.',
      text: 'Geeignet für ca. 8 bis 12 Inhaltsseiten. Migration, Local SEO, Landingpages oder komplexere Erweiterungen werden separat eingeordnet.',
      localSeoText: 'Wachstum eignet sich für mehrere Leistungsseiten, Relaunches und eine stärkere lokale Seitenstruktur.'
    },
    individuell: {
      title: 'Individuell ist sinnvoll, wenn mehrere Sonderfunktionen oder größere technische Anforderungen zusammenkommen.',
      text: 'Geeignet für Sonderfunktionen, CMS, Buchungssysteme, Mehrsprachigkeit, Shop-Funktionen oder größere technische Erweiterungen nach Aufwandsschätzung.',
      localSeoText: 'Individuell passt, wenn mehrere Standorte, komplexere Inhaltsstrukturen oder Sonderfunktionen zusammenkommen.'
    }
  }[packageKey] || {
    title: 'Paketumfang wird vor der Umsetzung eingeordnet.',
    text: 'Zusatzleistungen werden nur eingeplant, wenn sie zum vereinbarten Projektumfang passen.',
    localSeoText: 'Der konkrete Local-SEO-Umfang wird passend zum Paket und zur Ausgangslage eingeordnet.'
  };
}

function visiblePackagesFromLocals(res) {
  return Array.isArray(res.locals.visiblePackages) ? res.locals.visiblePackages : [];
}

function noteBodies(notes = []) {
  return notes.map((note) => note?.body).filter(Boolean);
}

function byId(items = []) {
  return new Map(items.filter(Boolean).map((item) => [item.id || item.addonKey || item.planKey, item]));
}

const RUNNING_COSTS_ADD_ON_IDS = new Set([
  'buchungssystem-integration',
  'newsletter-anbindung',
  'tracking-einrichtung',
  'cms-einfach',
  'mehrsprachigkeit',
  'inhaltsmigration'
]);

function mergeAddOnsPage(page, addOns = [], notes = []) {
  if (!addOns.length && !notes.length) return page;

  const addOnsById = byId(addOns);
  const dbLegalNotes = noteBodies(notes);
  const mergedSections = (page.detailSections || []).map((section) => {
    const originalIds = (section.addOns || []).map((item) => item.id).filter(Boolean);
    const sectionAddOns = originalIds.map((id) => addOnsById.get(id)).filter(Boolean);
    return {
      ...section,
      addOns: sectionAddOns.length ? sectionAddOns : section.addOns
    };
  });

  return {
    ...page,
    addOns: addOns.length ? addOns : page.addOns,
    detailSections: mergedSections,
    legalNotes: dbLegalNotes.length ? dbLegalNotes : page.legalNotes
  };
}

function maintenanceComparisonRows(page, plans = []) {
  if (!plans.length) return page.planComparisonRows;

  const staticRows = Array.isArray(page.planComparisonRows) ? page.planComparisonRows : [];
  return staticRows.map((row) => {
    const values = { ...(row.values || {}) };
    for (const plan of plans) {
      if (row.id === 'price') values[plan.id] = plan.priceLabel;
      if (row.id === 'bestFor') values[plan.id] = plan.shortDescription;
      if (row.id === 'contentChanges') values[plan.id] = plan.contentChangeAllowance || values[plan.id];
      if (row.id === 'responseTime') values[plan.id] = plan.responseTime || values[plan.id];
      if (row.id === 'emergency') values[plan.id] = plan.emergencyNote || values[plan.id];
      if (row.id === 'thirdParty') values[plan.id] = plan.thirdPartyNote || values[plan.id];
      if (row.id === 'cancellation') values[plan.id] = plan.cancellationNote || values[plan.id];
    }
    return { ...row, values };
  });
}

function mergeMaintenancePage(page, plans = [], notes = []) {
  if (!plans.length && !notes.length) return page;
  const dbLegalNotes = noteBodies(notes);
  const firstPlan = plans[0];

  return {
    ...page,
    hero: {
      ...page.hero,
      highlights: plans.length
        ? page.hero.highlights.map((item) =>
          item.includes('realistische Pakete ab')
            ? `realistische Pakete ${firstPlan.priceLabel}`
            : item
        )
        : page.hero.highlights
    },
    plans: plans.length ? plans : page.plans,
    planComparisonRows: maintenanceComparisonRows(page, plans),
    legalNotes: dbLegalNotes.length ? dbLegalNotes : page.legalNotes
  };
}

function mergeRunningCostsPage(page, plans = [], addOns = [], notes = []) {
  const dbLegalNotes = noteBodies(notes);
  const selectedAddOns = addOns
    .filter((item) => RUNNING_COSTS_ADD_ON_IDS.has(item.id))
    .map((item) => ({
      name: item.name,
      category: item.category,
      priceLabel: item.priceLabel,
      text: item.shortDescription,
      note: item.thirdPartyCostNote
    }));

  const maintenanceSummary = plans.map((plan) => ({
    name: plan.name,
    priceLabel: plan.priceLabel,
    text: plan.shortDescription,
    included: (plan.included || []).slice(0, 4),
    responseTime: String(plan.responseTime || '').replace(/,\s*ohne\s*24\/7-Zusage/i, '')
  }));

  return {
    ...page,
    maintenanceSummary: maintenanceSummary.length ? maintenanceSummary : page.maintenanceSummary,
    selectedAddOns: selectedAddOns.length ? selectedAddOns : page.selectedAddOns,
    legalNotes: dbLegalNotes.length ? dbLegalNotes : page.legalNotes
  };
}

async function safePricingData() {
  try {
    const [addOns, maintenancePlans, globalNotes] = await Promise.all([
      pricingService.getVisibleAddOns(),
      pricingService.getVisibleMaintenancePlans(),
      pricingService.getGlobalPricingNotes()
    ]);
    return { addOns, maintenancePlans, globalNotes };
  } catch (err) {
    console.error('Fehler beim Laden der DB-Preiszusatzdaten:', err.message);
    return { addOns: [], maintenancePlans: [], globalNotes: [] };
  }
}

function buildAddOnsPage(page, res, dbAddOns = [], dbNotes = []) {
  const pricingPage = interpolatePricingTokens(page, res.locals.packagePricing || {}, { lng: res.locals.lng || 'de' });
  const packageBoundary = visiblePackagesFromLocals(res).map((pkg) => {
    const copy = packageTextByKey(pkg.packageKey || pkg.id);
    return {
      id: pkg.packageKey || pkg.id,
      name: packageName(pkg),
      priceLabel: pkg.priceLabel,
      path: pkg.canonicalPath,
      ...copy
    };
  });

  return {
    ...mergeAddOnsPage(pricingPage, dbAddOns, dbNotes),
    packageBoundary: packageBoundary.length ? packageBoundary : pricingPage.packageBoundary
  };
}

function buildLocalSeoPage(page, res) {
  const pricingPage = interpolatePricingTokens(page, res.locals.packagePricing || {}, { lng: res.locals.lng || 'de' });
  const packages = visiblePackagesFromLocals(res).map((pkg) => {
    const copy = packageTextByKey(pkg.packageKey || pkg.id);
    return {
      id: pkg.packageKey || pkg.id,
      name: packageName(pkg),
      priceLabel: pkg.priceLabel,
      path: pkg.canonicalPath,
      scope: packageScope(pkg),
      text: copy.localSeoText
    };
  });

  return {
    ...pricingPage,
    packageConnection: {
      ...pricingPage.packageConnection,
      packages: packages.length ? packages : pricingPage.packageConnection.packages
    }
  };
}

/**
 *  GET /impressum
 *  static/legal imprint
 */
router.get('/impressum', (req, res) => {
  res.render('static/impressum', { 
    title: 'Impressum | Komplett Webdesign',
    description: 'Hier finden Sie unser Impressum mit den rechtlichen Informationen zu unserem Unternehmen.'
  });
});

/**
 *  GET /datenschutz
 *  static/privacy policy
 */
router.get('/datenschutz', (req, res) => {
  res.render('static/datenschutz', { 
    title: 'Datenschutzerklärung | Komplett Webdesign',
    description: 'Hier finden Sie unsere Datenschutzerklärung, die erklärt, wie wir Ihre Daten schützen und verwenden.'
  });
});

/**
 *  GET /swipeandcook-datenschutz
 *  app-specific privacy information
 */
router.get('/swipeandcook-datenschutz', (_req, res) => {
  res.render('static/swipeandcook-datenschutz', {
    title: 'Swipe & Cook Datenschutz | Komplett Webdesign',
    description: 'Datenschutzhinweise zur Verarbeitung von Konto-, Anmelde- und Rezeptdaten in der App Swipe & Cook.',
    currentPathname: '/swipeandcook-datenschutz',
    extraCssAssets: ['swipeandcook-privacy.css']
  });
});

/**
 *  GET /hinweise-rechtstexte-seo-datenschutz
 *  notes referenced by contact form consent
 */
router.get('/hinweise-rechtstexte-seo-datenschutz', (_req, res) => {
  res.render('static/hinweise-rechtstexte-seo-datenschutz', {
    title: 'Hinweise zu Rechtstexten, SEO und Datenschutz | Komplett Webdesign',
    description: 'Wichtige Hinweise zur technischen Einbindung von Rechtstexten, SEO-Grenzen, Drittanbieter-Kosten und Datenschutz bei Website-Anfragen.',
    currentPathname: '/hinweise-rechtstexte-seo-datenschutz'
  });
});

router.get('/leistungen', (_req, res) => {
  const page = withServiceHeroImage(leistungenOverviewPage);

  res.render('static/leistungen', {
    page,
    title: page.title,
    description: page.description,
    currentPathname: page.canonicalPath
  });
});

router.get('/laufende-kosten-website', (_req, res) => {
  res.redirect(301, '/leistungen/laufende-kosten-website');
});

router.get('/leistungen/laufende-kosten-website', async (req, res) => {
  const { addOns, maintenancePlans, globalNotes } = await safePricingData();
  const page = withServiceHeroImage(mergeRunningCostsPage(runningCostsPage, maintenancePlans, addOns, globalNotes));
  res.render('static/laufende-kosten-website', {
    page,
    title: page.title,
    description: page.description,
    ogImage: page.heroImage?.src || '/images/heroBg.webp',
    currentPathname: page.canonicalPath
  });
});

router.get('/zusatzleistungen-webdesign', (_req, res) => {
  res.redirect(301, '/leistungen/zusatzleistungen-webdesign');
});

router.get('/leistungen/zusatzleistungen-webdesign', async (req, res) => {
  const { addOns, globalNotes } = await safePricingData();
  const page = withServiceHeroImage(buildAddOnsPage(addOnsPage, res, addOns, globalNotes));
  res.render('static/zusatzleistungen-webdesign', {
    page,
    title: page.title,
    description: page.description,
    ogImage: page.heroImage?.src || '/images/heroBg.webp',
    currentPathname: page.canonicalPath
  });
});

router.get('/website-wartung-berlin', (_req, res) => {
  res.redirect(301, '/leistungen/website-wartung');
});

router.get('/leistungen/website-wartung', async (req, res) => {
  const { maintenancePlans, globalNotes } = await safePricingData();
  const page = withServiceHeroImage(mergeMaintenancePage(maintenancePage, maintenancePlans, globalNotes));
  res.render('static/website-wartung-berlin', {
    page,
    title: page.title,
    description: page.description,
    ogImage: page.heroImage?.src || '/images/heroBg.webp',
    currentPathname: page.canonicalPath
  });
});

router.get('/local-seo-berlin', (_req, res) => {
  res.redirect(301, '/leistungen/local-seo');
});

router.get('/leistungen/local-seo', (req, res) => {
  const page = withServiceHeroImage(buildLocalSeoPage(localSeoPage, res));
  res.render('static/local-seo-berlin', {
    page,
    title: page.title,
    description: page.description,
    ogImage: page.heroImage?.src || '/images/heroBg.webp',
    currentPathname: page.canonicalPath
  });
});

router.get('/webdesign-cafe', (_req, res) => {
  res.redirect(301, '/branchen/webdesign-cafe');
});

router.get('/webdesign-blumenladen', (_req, res) => {
  res.redirect(301, '/branchen/webdesign-blumenladen');
});

router.get(['/webdesign-preise', '/website-kosten-berlin'], (_req, res) => {
  res.redirect(301, '/webdesign-berlin/kosten-preise-pakete');
});

// router.get('/ratgeber/kosten-einfache-website', (req, res) => {
//   res.render('static/kosten/kosten-einfache-website', { 
//     title: 'Kosten einer einfachen Website – Beispiele & Checkliste',
//     description: 'Ehrliche Preisbeispiele und eine 8-Punkte-Checkliste für einen schnellen, sauberen Start – responsive, mobilfreundlich und klar strukturiert.'
//   });
// });

router.get('/webdesign-blumenladen/kosten', (req, res) => {
  res.render('static/kosten/webdesign-blumenladen', { 
    title: 'Blumenladen-Website: Kosten & 4-Wochen-Zeitplan (Sortiment, Lieferung, Saison)',
    description: 'Preisrahmen, Ablauf und Tipps zu Sortiment, Lieferanfrage & saisonalen Specials – für lokale Blumenläden in Berlin.'
  });
});

router.get('/webdesign-cafe/kosten', (req, res) => {
  res.render('static/kosten/webdesign-cafe', { 
    title: 'Café-Website: Kosten & 4-Wochen-Zeitplan (Speisekarte, Reservierung)',
    description: 'Preisrahmen, 4-Wochen-Plan und Tipps zu Speisekarte, Reservierung & Bildern.'
  });
});

// router.get('/ratgeber/website-kosten-zeitplan', (req, res) => {
//   res.render('static/kosten/website-kosten-zeitplan', { 
//     title: 'Website-Kosten 2025 & realistischer Zeitplan – einfach erklärt',
//     description: 'Was kostet eine Website 2025 – und wie lange dauert’s? Klare Preisbeispiele, 2/4/8-Wochen-Zeitpläne und Tipps für Selbstständige in Berlin.'
//   });
// });


export default router;
