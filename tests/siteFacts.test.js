import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_FACTS, formatGoogleRating, getPackageBySlug } from '../helpers/siteFacts.js';

test('site facts expose current package prices and recurring costs', () => {
  assert.equal(getPackageBySlug('start').price, 799);
  assert.equal(getPackageBySlug('business').price, 1499);
  assert.equal(getPackageBySlug('wachstum').price, 2499);
  assert.equal(getPackageBySlug('individuell').price, 3500);
  assert.deepEqual(SITE_FACTS.recurringCosts.map((item) => item.priceLabel), [
    'ab 39 €/Monat',
    'ab 79 €/Monat',
    'ab 129 €/Monat'
  ]);
});

test('google rating label is generated from one source of truth', () => {
  assert.equal(formatGoogleRating('de'), '★★★★★ 5,0/5 · 4 Google-Rezensionen');
  assert.equal(formatGoogleRating('en'), '★★★★★ 5.0/5 · 4 Google reviews');
});
