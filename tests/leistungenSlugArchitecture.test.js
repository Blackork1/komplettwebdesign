import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addOnsPage } from '../data/addOnsPage.js';
import { ctas } from '../data/ctas.js';
import { localSeoPage } from '../data/localSeoPage.js';
import { maintenancePage } from '../data/maintenancePage.js';
import { runningCostsPage } from '../data/runningCostsPage.js';
import { headerNavigation, footerNavigation } from '../data/siteNavigation.js';
import { getSeoLandingPage } from '../data/seoLandingPages.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';
import { REDIRECTED_LEISTUNG_PAGES, KEPT_LEISTUNG_SLUGS } from '../helpers/leistungPageRouting.js';

const staticRoutes = readFileSync(new URL('../routes/staticPages.js', import.meta.url), 'utf8');
const seoLandingRoutes = readFileSync(new URL('../routes/seoLandingRoutes.js', import.meta.url), 'utf8');
const leistungenRoutes = readFileSync(new URL('../routes/leistungenRoutes.js', import.meta.url), 'utf8');

test('service pages use the /leistungen URL hierarchy while the Berlin price page keeps its pricing URL', () => {
  assert.equal(addOnsPage.canonicalPath, '/leistungen/zusatzleistungen-webdesign');
  assert.equal(localSeoPage.canonicalPath, '/leistungen/local-seo');
  assert.equal(maintenancePage.canonicalPath, '/leistungen/website-wartung');
  assert.equal(runningCostsPage.canonicalPath, '/leistungen/laufende-kosten-website');
  assert.equal(ctas.addOns.url, '/leistungen/zusatzleistungen-webdesign');
  assert.equal(ctas.runningCosts.url, '/leistungen/laufende-kosten-website');

  assert.equal(getSeoLandingPage('website-relaunch-berlin')?.path, '/leistungen/website-relaunch');
  assert.equal(getSeoLandingPage('website-audit')?.path, '/leistungen/website-audit');
  assert.equal(getSeoLandingPage('landingpage-erstellen-lassen')?.path, '/leistungen/landingpage-erstellen-lassen');

  assert.ok(INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/webdesign-berlin/kosten-preise-pakete'));
  assert.ok(INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/leistungen/local-seo'));
  assert.ok(INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/leistungen/website-relaunch'));
  assert.ok(!INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/local-seo-berlin'));
});

test('Leistungen navigation points to the Leistungen overview and no longer to root-level service URLs', () => {
  const servicesNav = headerNavigation.find((item) => item.label === 'Leistungen');
  assert.equal(servicesNav?.href, '/leistungen/');
  assert.deepEqual(
    servicesNav.children.map((item) => item.href),
    [
      '/leistungen/',
      '/leistungen/website-relaunch',
      '/leistungen/local-seo',
      '/leistungen/landingpage-erstellen-lassen',
      '/leistungen/website-audit',
      '/leistungen/responsives-design-mobile',
      '/leistungen/inhalte-texte-content',
      '/leistungen/rechtliches-sicherheit',
      '/leistungen/website-wartung',
      '/leistungen/zusatzleistungen-webdesign',
      '/leistungen/laufende-kosten-website'
    ]
  );

  servicesNav.children.slice(1).forEach((link) => {
    assert.match(link.href, /^\/leistungen\//, `${link.label} should live below /leistungen`);
  });

  const footerServiceLinks = footerNavigation.flatMap((group) => group.links).filter((link) =>
    /Relaunch|Landingpage|Audit|Wartung|Zusatzleistungen|Local SEO|Laufende Website-Kosten/.test(link.label)
  );
  footerServiceLinks.forEach((link) => {
    if (link.label === 'Webdesign Preise') return;
    assert.match(link.href, /^\/leistungen\//, `${link.label} should live below /leistungen`);
  });
});

test('legacy service URLs redirect to the new /leistungen canonicals', () => {
  [
    ['/local-seo-berlin', '/leistungen/local-seo'],
    ['/website-wartung-berlin', '/leistungen/website-wartung'],
    ['/zusatzleistungen-webdesign', '/leistungen/zusatzleistungen-webdesign'],
    ['/laufende-kosten-website', '/leistungen/laufende-kosten-website']
  ].forEach(([from, to]) => {
    assert.match(staticRoutes, new RegExp(`router\\.get\\('${from.replace(/\//g, '\\/')}'[\\s\\S]*?res\\.redirect\\(301,\\s*'${to.replace(/\//g, '\\/')}'\\)`));
  });

  [
    ['/website-relaunch-berlin', '/leistungen/website-relaunch'],
    ['/website-audit', '/leistungen/website-audit'],
    ['/landingpage-erstellen-lassen', '/leistungen/landingpage-erstellen-lassen']
  ].forEach(([from, to]) => {
    assert.match(seoLandingRoutes, new RegExp(`router\\.get\\('${from.replace(/\//g, '\\/')}'[\\s\\S]*?res\\.redirect\\(301,\\s*'${to.replace(/\//g, '\\/')}'\\)`));
  });

  assert.equal(REDIRECTED_LEISTUNG_PAGES['seo-sichtbarkeit-einsteiger'], '/leistungen/local-seo');
  assert.equal(REDIRECTED_LEISTUNG_PAGES['domain-hosting-technik'], '/leistungen/laufende-kosten-website');
  assert.equal(REDIRECTED_LEISTUNG_PAGES['design-ux-ui'], '/leistungen/website-relaunch');
  assert.ok(KEPT_LEISTUNG_SLUGS.includes('kosten-preise-pakete'));
  assert.match(leistungenRoutes, /router\.get\('\/leistungen\/:slug'/);
  assert.match(leistungenRoutes, /router\.get\('\/webdesign-berlin\/:slug'/);
});
