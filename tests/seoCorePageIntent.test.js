import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webdesignBerlinPage } from '../data/webdesignBerlinPage.js';

const main = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
const homepageTemplate = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');

test('Startseite und Berliner Hauptseite besitzen getrennte H1 und Titel', () => {
  assert.match(main, /Komplett Webdesign Berlin \| Websites für kleine Unternehmen/);
  assert.match(main, /Komplett Webdesign für kleine Unternehmen in Berlin/);
  assert.equal(webdesignBerlinPage.title, 'Website erstellen lassen Berlin | Webdesign & Preise');
  assert.equal(webdesignBerlinPage.h1, 'Website erstellen lassen in Berlin');
  assert.notEqual(webdesignBerlinPage.h1, 'Komplett Webdesign für kleine Unternehmen in Berlin');
});

test('Kernbeschreibungen liegen im redaktionellen Zielkorridor', () => {
  assert.ok(webdesignBerlinPage.description.length >= 120);
  assert.ok(webdesignBerlinPage.description.length <= 165);
});

test('Startseite verlinkt die Berliner Kaufabsicht im ersten Inhaltsabschnitt', () => {
  const link = '<a href="/webdesign-berlin">Website erstellen lassen in Berlin</a>';
  const uspStart = homepageTemplate.indexOf('<section class="section" id="usp-strip">');
  const uspEnd = homepageTemplate.indexOf('</section>', uspStart);
  const fitStart = homepageTemplate.indexOf('<section class="section" id="passt">');
  const linkIndex = homepageTemplate.indexOf(link);

  assert.notEqual(uspStart, -1);
  assert.notEqual(uspEnd, -1);
  assert.notEqual(fitStart, -1);
  assert.ok(linkIndex > uspStart && linkIndex < uspEnd);
  assert.equal(homepageTemplate.indexOf(link, fitStart), -1);
});

test('Kernseiten erhalten klare Kaufabsicht ohne unbelegte Versprechen', () => {
  assert.doesNotMatch(main, /garantiert|Platz 1|mehr Umsatz garantiert/i);
  assert.doesNotMatch(JSON.stringify(webdesignBerlinPage), /garantiert mehr Kunden|Ranking garantiert/i);
  assert.ok(webdesignBerlinPage.internalLinks.some((link) => link.href === '/referenzen'));
  assert.ok(webdesignBerlinPage.internalLinks.some((link) => link.href === '/pakete'));
});
