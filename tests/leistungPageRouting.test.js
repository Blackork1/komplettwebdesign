import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function readIfExists(path) {
  const url = new URL(`../${path}`, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
}

const routingPolicy = readIfExists('helpers/leistungPageRouting.js');
const routes = read('routes/leistungenRoutes.js');
const sitemap = read('controllers/sitemapController.js');
const leistungenController = read('controllers/leistungenController.js');
const districtController = read('controllers/districtController.js');

test('old overlapping DB leistung pages redirect to their canonical service pages', () => {
  assert.ok(routingPolicy, 'routing policy helper is missing');
  assert.match(routingPolicy, /'design-ux-ui':\s*'\/leistungen\/website-relaunch'/);
  assert.match(routingPolicy, /'seo-sichtbarkeit-einsteiger':\s*'\/leistungen\/local-seo'/);
  assert.match(routingPolicy, /'domain-hosting-technik':\s*'\/leistungen\/laufende-kosten-website'/);
  assert.match(routingPolicy, /res\.redirect\(301,\s*target\)/);
  assert.match(routes, /router\.get\('\/leistungen\/:slug'/);
  assert.match(routes, /router\.get\('\/webdesign-berlin\/:slug'/);
  assert.match(routes, /redirectLegacyLeistungPage/);
  assert.match(routes, /redirectLegacyLeistungSection,\s*showLeistungPage/);
});

test('kept old DB leistung pages remain explicitly documented as retained pages', () => {
  ['kosten-preise-pakete', 'responsives-design-mobile', 'inhalte-texte-content', 'rechtliches-sicherheit'].forEach((slug) => {
    assert.match(routingPolicy, new RegExp(`'${slug}'`));
  });
});

test('redirected old leistung slugs are excluded from sitemap and internal service links', () => {
  assert.match(sitemap, /REDIRECTED_LEISTUNG_SLUGS/);
  assert.match(sitemap, /slug\s*<>\s*ALL\(\$1::text\[\]\)/);

  [
    '/webdesign-berlin/design-ux-ui',
    '/webdesign-berlin/seo-sichtbarkeit-einsteiger',
    '/webdesign-berlin/domain-hosting-technik'
  ].forEach((href) => {
    assert.doesNotMatch(leistungenController, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(districtController, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('rechtliches und sicherheit page is framed as technical support, not legal advice', () => {
  assert.doesNotMatch(leistungenController, /DSGVO Website Berlin/);
  assert.doesNotMatch(leistungenController, /rechtlich relevante Inhalte/);
  assert.match(leistungenController, /Technische Website-Sicherheit/);
  assert.match(leistungenController, /keine Rechtsberatung/);
  assert.match(leistungenController, /rechtliche Prüfung sollte.*separat/i);
});
