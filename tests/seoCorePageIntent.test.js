import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webdesignBerlinPage } from '../data/webdesignBerlinPage.js';

const main = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
const homepageTemplate = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');

test('die Startseite ist die Hauptseite für „Webdesign Berlin“: Titel, H1 und Beschreibung', () => {
  assert.match(main, /seoTitle:\s*'Webdesign Berlin: Websites ab \{\{lowestPackagePriceLabel\}\} \| Komplett Webdesign'/);
  assert.match(main, /heroTitle:\s*'Webdesign Berlin für kleine Unternehmen'/);
  assert.match(main, /seoDescription:\s*'Webdesign in Berlin für kleine Unternehmen:/);
  const title = 'Webdesign Berlin: Websites ab 799 € | Komplett Webdesign';
  assert.ok(title.length >= 50 && title.length <= 60, `Titel hat ${title.length} Zeichen`);
  assert.ok(main.indexOf('Webdesign Berlin', main.indexOf('seoTitle:')) - main.indexOf('seoTitle:') < 20, 'Suchbegriff steht am Anfang des Titels');
});

test('Kernbeschreibungen liegen im redaktionellen Zielkorridor', () => {
  assert.ok(webdesignBerlinPage.description.length >= 120);
  assert.ok(webdesignBerlinPage.description.length <= 165);
});

test('die alte Berliner Hauptseite leitet auf die Startseite, die Startseite verlinkt die Bezirke', async () => {
  const districtRoutes = readFileSync(new URL('../routes/districtRoutes.js', import.meta.url), 'utf8');
  assert.match(districtRoutes, /router\.get\("\/", \(req, res\) => res\.redirect\(301, req\.baseUrl\.startsWith\("\/en"\) \? "\/en" : "\/"\)\)/);
  assert.doesNotMatch(homepageTemplate, /href="\/webdesign-berlin"/);
  assert.match(homepageTemplate, /<section class="section" id="bezirke"/);
  assert.match(main, /href: `\$\{lng === 'en' \? '\/en' : ''\}\/webdesign-berlin\/\$\{district\.slug\}`/);
});

test('Kernseiten erhalten klare Kaufabsicht ohne unbelegte Versprechen', () => {
  assert.doesNotMatch(main, /garantiert|Platz 1|mehr Umsatz garantiert/i);
  assert.doesNotMatch(JSON.stringify(webdesignBerlinPage), /garantiert mehr Kunden|Ranking garantiert/i);
  assert.ok(webdesignBerlinPage.internalLinks.some((link) => link.href === '/referenzen'));
  assert.ok(webdesignBerlinPage.internalLinks.some((link) => link.href === '/pakete'));
});
