import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getPackageSearchIntent, mergePackageFaqs, PACKAGE_SEARCH_INTENT_SLUGS } from '../data/packageSearchIntent.js';
import { getSeoRecoveryTarget } from '../data/seoIntentRegistry.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Start, Business und Wachstum haben Zusatzinhalte zu ihren Suchanfragen', () => {
  assert.deepEqual([...PACKAGE_SEARCH_INTENT_SLUGS].sort(), ['business', 'start', 'wachstum']);
  const business = getPackageSearchIntent('business', { priceLabel: 'ab 1.499 €' });
  assert.match(business.title, /Business-Website/);
  assert.ok(business.paragraphs.join(' ').includes('Unternehmens- oder Firmenwebsite'));
  assert.ok(business.faqs.some((faq) => faq.question === 'Was ist eine Business-Website?'));
  assert.match(getPackageSearchIntent('start', { priceLabel: 'ab 799 €' }).title, /Starter-Paket/);
  assert.match(getPackageSearchIntent('wachstum', { priceLabel: 'ab 2.499 €' }).title, /Premium-Website/);
  assert.equal(getPackageSearchIntent('individuell'), null);
  assert.equal(getPackageSearchIntent('business', { priceLabel: 'ab 1.499 €', isEn: true }), null);
});

test('der Preis kommt aus der Datenbank und wird sauber eingesetzt', () => {
  const business = getPackageSearchIntent('business', { priceLabel: 'ab 1.499 €' });
  const all = JSON.stringify(business);
  assert.doesNotMatch(all, /\{\{price\}\}/);
  assert.ok(business.paragraphs[0].endsWith('des Business-Pakets (ab 1.499 €).'));
  assert.ok(business.faqs[1].answer.includes('Seiten ab 1.499 €.'));
  const withoutPrice = JSON.stringify(getPackageSearchIntent('wachstum', { priceLabel: '' }));
  assert.doesNotMatch(withoutPrice, /\{\{price\}\}| \.|, \./);
});

test('zusätzliche Fragen ergänzen die gespeicherten, ohne Doppelungen', () => {
  const merged = mergePackageFaqs(
    [{ question: 'Was ist eine Business-Website?', answer: 'A' }, { question: 'Neue Frage', answer: 'B' }],
    [{ question: 'was ist eine business-website?', answer: 'Alt' }, { question: 'Gespeichert', answer: 'C' }]
  );
  assert.deepEqual(merged.map((faq) => faq.question), ['Neue Frage', 'was ist eine business-website?', 'Gespeichert']);
});

test('Paketseiten zeigen den Abschnitt und liefern die Fragen auch strukturiert aus', () => {
  const template = read('views/package_detail.ejs');
  assert.match(template, /class="package-detail-sections package-intent"/);
  assert.match(template, /intent\.compare\.columns\.forEach/);
  const controller = read('controllers/packagesController.js');
  assert.equal((controller.match(/const searchIntent = applyPackageSearchIntent\(pack, isEn\)/g) || []).length, 2, 'Detailseite und Erfolgsseite');
  assert.equal((controller.match(/\.\.\.intentSchemaFaqs\(searchIntent\)/g) || []).length, 2);
});

test('jede Paketseite besitzt eine eigene Hauptsuchanfrage', () => {
  assert.equal(getSeoRecoveryTarget('/pakete')?.primaryQuery, 'webdesign preise berlin');
  assert.equal(getSeoRecoveryTarget('/pakete/business')?.primaryQuery, 'business website erstellen lassen');
  assert.equal(getSeoRecoveryTarget('/pakete/start')?.primaryQuery, 'website starter paket');
  assert.equal(getSeoRecoveryTarget('/pakete/wachstum')?.primaryQuery, 'premium webdesign');
  assert.match(read('views/packages_list.ejs'), /Webdesign-Pakete für dein Unternehmen/);
});
