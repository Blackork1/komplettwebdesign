import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SEO_RECOVERY_TARGETS, findActiveIntentCollisions } from '../data/seoIntentRegistry.js';
import { footerNavigation } from '../data/siteNavigation.js';
import { SHORT_SEO_TITLES } from '../data/seoMetaOverrides.js';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const PRICE_PAGE = '/pakete';
const COST_PAGE = '/webdesign-berlin/kosten-preise-pakete';

test('jede aktive Seite in der Registry besetzt eine eigene Hauptsuchanfrage', () => {
  const active = SEO_RECOVERY_TARGETS.filter((entry) => entry.state === 'active');
  const queries = active.map((entry) => entry.primaryQuery);
  assert.equal(new Set(queries).size, queries.length, 'zwei Seiten zielen auf dieselbe Suchanfrage');
  assert.deepEqual(findActiveIntentCollisions(), []);
});

test('„Webdesign Preise Berlin“ gehört zu /pakete, die Kostenseite erklärt Kosten', async () => {
  const packages = await read('controllers/packagesController.js');
  const services = await read('controllers/leistungenController.js');
  assert.match(packages, /title: `Webdesign-Pakete & Preise Berlin: Websites\$\{deLowest\}`/);
  const costBlock = services.slice(services.indexOf("'kosten-preise-pakete': {"));
  for (const field of ['metaTitle', 'metaDescription', 'h1']) {
    const value = costBlock.match(new RegExp(`${field}: '([^']+)'`))?.[1];
    assert.ok(value, `${field} der Kostenseite fehlt`);
    assert.doesNotMatch(value, /Webdesign Preise|Webdesign-Preise/, field);
  }
  assert.equal(SEO_RECOVERY_TARGETS.find((entry) => entry.path === PRICE_PAGE)?.primaryQuery, 'webdesign preise berlin');
  assert.equal(SEO_RECOVERY_TARGETS.find((entry) => entry.path === COST_PAGE)?.primaryQuery, 'website kosten berlin');
});

test('Links mit „Preise“ oder „Pakete“ im Text führen nicht zur Kostenseite', async () => {
  const navLinks = footerNavigation.flatMap((group) => group.links);
  for (const link of navLinks.filter((item) => item.href === COST_PAGE)) {
    assert.doesNotMatch(link.label, /Preise|Pakete/, link.label);
  }
  const sources = await Promise.all([
    'controllers/districtController.js',
    'controllers/leistungenController.js',
    'data/webdesignBerlinPage.js',
    'data/runningCostsPage.js',
    'data/addOnsPage.js'
  ].map(read));
  for (const source of sources) {
    for (const [, label] of source.matchAll(/label: ['"]([^'"]+)['"],\s*href: ['"]\/webdesign-berlin\/kosten-preise-pakete['"]/g)) {
      assert.doesNotMatch(label, /Preise|Pakete/, label);
    }
  }
});

test('alte Preis- und Kosten-URLs leiten auf die jeweils zuständige Seite', async () => {
  const routes = await read('routes/staticPages.js');
  assert.match(routes, /router\.get\('\/webdesign-preise', \(_req, res\) => \{\s*res\.redirect\(301, '\/pakete'\);/);
  assert.match(routes, /router\.get\('\/website-kosten-berlin', \(_req, res\) => \{\s*res\.redirect\(301, '\/webdesign-berlin\/kosten-preise-pakete'\);/);
});

test('der Tester-Hub überlässt „SEO-Test“ dem SEO-Tester, der Ratgeber ist eine Checkliste', async () => {
  const testers = await read('controllers/testController.js');
  const hubTitle = testers.match(/^\s*title: '(Webseite testen kostenlos[^']*)'/m)?.[1];
  assert.ok(hubTitle, 'Titel des Tester-Hubs fehlt');
  assert.doesNotMatch(hubTitle, /SEO/);
  assert.match(SHORT_SEO_TITLES['/ratgeber/homepage-checker-website-check'], /Checkliste/);
  assert.doesNotMatch(SHORT_SEO_TITLES['/ratgeber/homepage-checker-website-check'], /Checker/);
});
