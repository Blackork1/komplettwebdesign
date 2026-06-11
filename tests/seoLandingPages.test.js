import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { SEO_LANDING_PAGES, getSeoLandingPage } from '../data/seoLandingPages.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';

const EXPECTED_SLUGS = [
  'website-erstellen-lassen-berlin',
  'website-relaunch-berlin',
  'website-audit',
  'landingpage-erstellen-lassen',
  'webdesign-kleine-unternehmen-berlin',
  'ablauf'
];

function uniqueValues(items, field) {
  return new Set(items.map((item) => item[field]));
}

test('seo landing pages expose exactly the planned static money pages', () => {
  assert.deepEqual(SEO_LANDING_PAGES.map((page) => page.slug), EXPECTED_SLUGS);
  assert.deepEqual(SEO_LANDING_PAGES.map((page) => page.path), [
    '/website-erstellen-lassen-berlin',
    '/leistungen/website-relaunch',
    '/leistungen/website-audit',
    '/leistungen/landingpage-erstellen-lassen',
    '/webdesign-kleine-unternehmen-berlin',
    '/ablauf'
  ]);
});

test('seo landing pages have unique primary keyword title h1 and path', () => {
  ['primaryKeyword', 'title', 'h1', 'path'].forEach((field) => {
    assert.equal(
      uniqueValues(SEO_LANDING_PAGES, field).size,
      SEO_LANDING_PAGES.length,
      `${field} must be unique`
    );
  });
});

test('seo landing pages include complete metadata content faq internal links and ctas', () => {
  SEO_LANDING_PAGES.forEach((page) => {
    assert.ok(page.title.length >= 35 && page.title.length <= 65, `${page.slug} title length`);
    assert.ok(page.description.length >= 120 && page.description.length <= 160, `${page.slug} description length`);
    assert.ok(page.h1.length >= 20, `${page.slug} h1`);
    assert.ok(page.intro.length >= 120, `${page.slug} intro`);
    assert.ok(Array.isArray(page.sections) && page.sections.length >= 3, `${page.slug} sections`);
    assert.ok(page.sections.every((section) => section.heading && section.body), `${page.slug} section copy`);
    assert.ok(page.cta?.label && page.cta?.href, `${page.slug} primary cta`);
    assert.ok(page.secondaryCta?.label && page.secondaryCta?.href, `${page.slug} secondary cta`);
    assert.ok(Array.isArray(page.faq) && page.faq.length >= 3, `${page.slug} faq`);
    assert.ok(page.faq.every((item) => item.question && item.answer), `${page.slug} faq copy`);
    assert.ok(Array.isArray(page.internalLinks) && page.internalLinks.length >= 3, `${page.slug} internal links`);
    assert.ok(page.internalLinks.every((link) => link.label && link.href), `${page.slug} internal link copy`);
  });
});

test('website-erstellen-lassen page is distinct from the webdesign berlin hub', () => {
  const page = getSeoLandingPage('website-erstellen-lassen-berlin');
  assert.ok(page);
  assert.equal(page.path, '/website-erstellen-lassen-berlin');
  assert.notEqual(page.path, '/webdesign-berlin');
  assert.notEqual(page.primaryKeyword, 'webdesign berlin');
  assert.doesNotMatch(page.h1, /^Webdesign Berlin$/i);
  assert.match(page.h1, /Website erstellen lassen/i);
});

test('website relaunch page is available as a distinct seo landing page', () => {
  const page = getSeoLandingPage('website-relaunch-berlin');
  assert.ok(page);
  assert.equal(page.path, '/leistungen/website-relaunch');
  assert.equal(page.primaryKeyword, 'website relaunch berlin');
  assert.match(page.h1, /Website Relaunch/i);
  assert.ok(page.sections.length >= 14);
  assert.ok(page.internalLinks.some((link) => link.href === '/website-erstellen-lassen-berlin'));
});

test('website relaunch phase 10b contains required sections, cautious pricing and safe links', () => {
  const page = getSeoLandingPage('website-relaunch-berlin');

  assert.equal(page.title, 'Website Relaunch Berlin | Website modernisieren');
  assert.equal(
    page.description,
    'Website-Relaunch in Berlin: veraltete Website modernisieren, Struktur verbessern, Weiterleitungen beachten und technisch sauber mit Node.js/EJS umsetzen.'
  );
  assert.equal(page.h1, 'Website Relaunch Berlin für moderne Unternehmenswebsites');
  assert.deepEqual(
    page.sections.map((section) => section.id),
    [
      'intro',
      'relaunchReasons',
      'risks',
      'seoSafeMigration',
      'redirects',
      'contentMigration',
      'newStructure',
      'techImplementation',
      'performance',
      'pricing',
      'audit',
      'localSeo',
      'process',
      'notIncluded'
    ]
  );

  const pageText = JSON.stringify(page);
  [
    'Business {{price.business}}',
    'Wachstum {{price.wachstum}}',
    'Individuell {{price.individuell}}',
    'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    'Ziel ist eine möglichst SEO-schonende Umstellung',
    'Weiterleitungen im vereinbarten Umfang',
    'Website-Audit als vertiefte Relaunch-Analyse'
  ].forEach((snippet) => assert.match(pageText, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));

  [
    '/webdesign-berlin',
    '/pakete',
    '/pakete/business',
    '/pakete/wachstum',
    '/pakete/individuell',
    '/leistungen/website-audit',
    '/website-tester',
    '/kontakt?projektart=audit',
    '/leistungen/local-seo',
    '/leistungen/laufende-kosten-website',
    '/leistungen/website-wartung',
    '/kontakt?projektart=relaunch'
  ].forEach((href) => assert.ok(page.internalLinks.some((link) => link.href === href), `${href} missing`));

  assert.ok(page.internalLinks.some((link) => link.href === '/leistungen/website-audit'), '/leistungen/website-audit must be linked once the page exists');
});

test('website relaunch phase 10b avoids risky relaunch, SEO, performance and legal promises', () => {
  const page = getSeoLandingPage('website-relaunch-berlin');
  const pageText = JSON.stringify(page);

  [
    /Ranking bleibt/i,
    /kein Rankingverlust/i,
    /Relaunch ohne Risiko/i,
    /garantiert schneller/i,
    /PageSpeed garantiert/i,
    /garantiert mehr Kunden/i,
    /SEO inklusive/i,
    /alle Weiterleitungen inklusive/i,
    /komplette Migration inklusive/i,
    /rechtssicher/i,
    /DSGVO-konform/i,
    /alles inklusive/i,
    /keine versteckten Kosten/i,
    /Relaunch ab 799/i
  ].forEach((pattern) => assert.doesNotMatch(pageText, pattern));

  assert.match(pageText, /Bestimmte Rankings oder ein vollständiger Ranking-Erhalt können aber nicht garantiert werden/);
  assert.match(pageText, /Konkrete Scores werden nicht zugesagt/);
  assert.match(pageText, /Die Erstellung oder rechtliche Prüfung dieser Texte ist keine Rechtsberatung/);
});

test('website audit phase 10d contains required sections, cautious pricing and safe links', () => {
  const page = getSeoLandingPage('website-audit');

  assert.ok(page);
  assert.equal(page.path, '/leistungen/website-audit');
  assert.equal(page.title, 'Website Audit | SEO, Technik & Conversion prüfen');
  assert.equal(
    page.description,
    'Website-Audit für SEO, Technik, Ladezeit, UX, Trust, Conversion und Local SEO. Mit konkreten Empfehlungen für Optimierung oder Relaunch.'
  );
  assert.equal(page.h1, 'Website Audit: Website prüfen und gezielt verbessern');
  assert.deepEqual(
    page.sections.map((section) => section.id),
    [
      'intro',
      'freeVsPaid',
      'targetGroups',
      'auditAreas',
      'seo',
      'technology',
      'performance',
      'ux',
      'trust',
      'conversion',
      'localSeo',
      'legalBoundary',
      'deliverables',
      'relaunchConnection',
      'pricing',
      'process',
      'notIncluded'
    ]
  );

  const pageText = JSON.stringify(page);
  [
    'kostenlose Schnellcheck',
    'bezahlte Audit',
    'Website-Audit ab 199–699 €',
    'Kurz-Audit ab 199 €',
    'Standard-Audit ab 399 €',
    'Relaunch-Audit ab 699 €',
    'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    'Bitte sende keine Passwörter oder vertraulichen Zugangsdaten über das Formular.'
  ].forEach((snippet) => assert.match(pageText, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));

  [
    '/kontakt?projektart=audit',
    '/website-tester',
    '/leistungen/website-relaunch',
    '/leistungen/local-seo',
    '/webdesign-berlin',
    '/pakete',
    '/leistungen/zusatzleistungen-webdesign',
    '/leistungen/laufende-kosten-website'
  ].forEach((href) => assert.ok(page.internalLinks.some((link) => link.href === href), `${href} missing`));
});

test('website audit phase 10d avoids legal, SEO, conversion and completeness promises', () => {
  const page = getSeoLandingPage('website-audit');
  const pageText = JSON.stringify(page);

  [
    /vollständige Prüfung/i,
    /alle Fehler/i,
    /rechtssicherer Check/i,
    /DSGVO-konform/i,
    /Ranking-Garantie/i,
    /garantiert bessere Rankings/i,
    /garantiert mehr Kunden/i,
    /100 % Analyse/i,
    /vollständiges Audit automatisch/i,
    /alles inklusive/i,
    /Conversion-Garantie/i,
    /Umsatzgarantie/i
  ].forEach((pattern) => assert.doesNotMatch(pageText, pattern));

  assert.match(pageText, /ersetzt keine Rechtsberatung/);
  assert.match(pageText, /keine Zusage für bestimmte Rankings/);
  assert.match(pageText, /keine Zusage für mehr Anfragen, Leads oder Umsatz/);
});

test('landingpage phase 10c contains required sections, cautious pricing and safe links', () => {
  const page = getSeoLandingPage('landingpage-erstellen-lassen');

  assert.ok(page);
  assert.equal(page.path, '/leistungen/landingpage-erstellen-lassen');
  assert.equal(page.title, 'Landingpage erstellen lassen | Individuell & klar');
  assert.equal(
    page.description,
    'Individuelle Landingpage erstellen lassen: klare Struktur, überzeugende Inhalte, CTA-Führung und technische Umsetzung mit Node.js/EJS.'
  );
  assert.equal(page.h1, 'Landingpage erstellen lassen');
  assert.deepEqual(
    page.sections.map((section) => section.id),
    [
      'intro',
      'useCases',
      'landingpageVsWebsite',
      'targetGroups',
      'structure',
      'copyStructure',
      'conversionElements',
      'formsAndCtas',
      'techImplementation',
      'tracking',
      'seo',
      'pricing',
      'packageConnection',
      'notIncluded',
      'process'
    ]
  );

  const pageText = JSON.stringify(page);
  [
    'Landingpage ab 699–1.499 €',
    'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    'Tracking kann optional',
    'Ob und wie gut sie konvertiert, hängt von Angebot, Zielgruppe, Traffic und weiteren Faktoren ab'
  ].forEach((snippet) => assert.match(pageText, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));

  [
    '/kontakt?projektart=landingpage',
    '/leistungen/zusatzleistungen-webdesign',
    '/pakete',
    '/webdesign-berlin',
    '/leistungen/website-audit',
    '/website-tester',
    '/leistungen/local-seo',
    '/leistungen/website-relaunch'
  ].forEach((href) => assert.ok(page.internalLinks.some((link) => link.href === href), `${href} missing`));

  assert.ok(page.internalLinks.some((link) => link.href === '/leistungen/website-audit'), '/leistungen/website-audit must be linked once the page exists');
});

test('landingpage phase 10c avoids conversion, ads, tracking and legal guarantees', () => {
  const page = getSeoLandingPage('landingpage-erstellen-lassen');
  const pageText = JSON.stringify(page);

  [
    /Conversion garantiert/i,
    /garantiert mehr Leads/i,
    /mehr Umsatz garantiert/i,
    /verkauft automatisch/i,
    /Ads-Erfolg garantiert/i,
    /Tracking inklusive/i,
    /rechtssicher/i,
    /DSGVO-konform/i,
    /alles inklusive/i,
    /keine versteckten Kosten/i
  ].forEach((pattern) => assert.doesNotMatch(pageText, pattern));

  assert.match(pageText, /keine Garantie für Leads, Verkäufe oder Umsatz/);
  assert.match(pageText, /keine Rechtsberatung/);
});

test('website intent landing pages use leistungen as breadcrumb parent', () => {
  ['website-erstellen-lassen-berlin', 'website-relaunch-berlin', 'website-audit', 'landingpage-erstellen-lassen', 'ablauf'].forEach((slug) => {
    const page = getSeoLandingPage(slug);
    assert.equal(page.parentBreadcrumb?.label, 'Leistungen');
    assert.equal(page.parentBreadcrumb?.href, '/leistungen');
  });
});

test('ablauf page has berlin-specific project process intent', () => {
  const page = getSeoLandingPage('ablauf');

  assert.equal(page.primaryKeyword, 'website projekt ablauf berlin');
  assert.match(page.title, /Berlin/);
  assert.match(page.description, /Berlin/);
  assert.match(page.h1, /Berlin/);
  assert.match(page.intro, /Berlin/);
  assert.equal(page.visual.image.src, '/images/webdesign-ablauf.webp');
  assert.match(page.visual.heading, /Anfrage bis zum sauberen Livegang/);
  assert.ok(page.internalLinks.some((link) => link.href === '/leistungen/website-relaunch'));
});

test('seo landing route lookup returns known pages and null for missing slugs', () => {
  assert.equal(getSeoLandingPage('website-erstellen-lassen-berlin')?.path, '/website-erstellen-lassen-berlin');
  assert.equal(getSeoLandingPage('website-relaunch-berlin')?.primaryKeyword, 'website relaunch berlin');
  assert.equal(getSeoLandingPage('website-audit')?.primaryKeyword, 'website audit');
  assert.equal(getSeoLandingPage('landingpage-erstellen-lassen')?.primaryKeyword, 'landingpage erstellen lassen');
  assert.equal(getSeoLandingPage('webdesign-kleine-unternehmen-berlin')?.primaryKeyword, 'webdesign kleine unternehmen berlin');
  assert.equal(getSeoLandingPage('ablauf')?.primaryKeyword, 'website projekt ablauf berlin');
  assert.equal(getSeoLandingPage('webdesign-berlin'), null);
  assert.equal(getSeoLandingPage(''), null);
});

test('index.js mounts seoLandingRoutes before slugRoutes', () => {
  const indexSource = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const importIndex = indexSource.indexOf("import seoLandingRoutes from './routes/seoLandingRoutes.js';");
  const seoMountIndex = indexSource.indexOf('app.use(seoLandingRoutes);');
  const slugMountIndex = indexSource.indexOf('app.use(slugRoutes);');

  assert.notEqual(importIndex, -1, 'index.js must import seoLandingRoutes');
  assert.notEqual(seoMountIndex, -1, 'index.js must mount seoLandingRoutes');
  assert.notEqual(slugMountIndex, -1, 'index.js must still mount slugRoutes');
  assert.ok(seoMountIndex < slugMountIndex, 'seoLandingRoutes must be mounted before slugRoutes');
});

test('seo landing routes expose the relaunch page before slug fallback', () => {
  const routeSource = fs.readFileSync(new URL('../routes/seoLandingRoutes.js', import.meta.url), 'utf8');

  assert.match(routeSource, /router\.get\('\/website-relaunch-berlin'[\s\S]*?res\.redirect\(301,\s*'\/leistungen\/website-relaunch'\)/);
  assert.match(routeSource, /router\.get\('\/leistungen\/website-relaunch',\s*renderLanding\('website-relaunch-berlin'\)\)/);
  assert.match(routeSource, /router\.get\('\/website-audit'[\s\S]*?res\.redirect\(301,\s*'\/leistungen\/website-audit'\)/);
  assert.match(routeSource, /router\.get\('\/leistungen\/website-audit',\s*renderLanding\('website-audit'\)\)/);
  assert.match(routeSource, /router\.get\('\/landingpage-erstellen-lassen'[\s\S]*?res\.redirect\(301,\s*'\/leistungen\/landingpage-erstellen-lassen'\)/);
  assert.match(routeSource, /router\.get\('\/leistungen\/landingpage-erstellen-lassen',\s*renderLanding\('landingpage-erstellen-lassen'\)\)/);
});

test('sitemap includes the static seo landing routes', () => {
  const routes = INDEXABLE_STATIC_ROUTES.map((route) => route.path);

  [
    '/website-erstellen-lassen-berlin',
    '/leistungen/website-relaunch',
    '/leistungen/website-audit',
    '/leistungen/landingpage-erstellen-lassen',
    '/webdesign-kleine-unternehmen-berlin',
    '/ablauf'
  ].forEach((path) => assert.ok(routes.includes(path), `missing sitemap route for ${path}`));
});

test('seo landing metadata and template render breadcrumb hierarchy through leistungen', () => {
  const controllerSource = fs.readFileSync(new URL('../controllers/seoLandingController.js', import.meta.url), 'utf8');
  const templateSource = fs.readFileSync(new URL('../views/seo_landing/show.ejs', import.meta.url), 'utf8');

  assert.match(controllerSource, /isPartOf/);
  assert.match(controllerSource, /'@type': 'Service'/);
  assert.match(controllerSource, /parentBreadcrumb/);
  assert.match(controllerSource, /BreadcrumbList/);
  assert.match(templateSource, /breadcrumbs \|\| \[\]/);
  assert.match(templateSource, /aria-current="page"/);
  assert.match(templateSource, /seo-landing__visual-feature/);
  assert.match(templateSource, /page\.finalCta/);
});
