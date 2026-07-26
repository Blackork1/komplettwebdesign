import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../controllers/testController.js', import.meta.url), 'utf8');
const seoView = readFileSync(new URL('../views/seo_tester.ejs', import.meta.url), 'utf8');
const websiteView = readFileSync(new URL('../views/test.ejs', import.meta.url), 'utf8');

test('deutsche Tester besitzen klickbare Titel im Zielkorridor', () => {
  assert.match(controller, /Kostenloser Website-Test: SEO, Technik und Sichtbarkeit/);
  assert.match(controller, /Kostenloser SEO-Test für Websites \| Komplett Webdesign/);
});

test('Tester erklären Methodik und führen passend zum Audit', () => {
  assert.match(seoView, /Was der Test prüft/);
  assert.match(seoView, /Beispielauswertung/);
  assert.match(seoView, /\/leistungen\/website-audit/);
  assert.match(websiteView, /\/leistungen\/website-audit/);
  assert.doesNotMatch(seoView, /sechsstelligen monatlichen Traffic/i);
});
