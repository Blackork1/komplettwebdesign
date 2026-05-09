import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_FACTS, formatGoogleRating, getPackageBySlug } from '../helpers/siteFacts.js';

test('site facts expose current package prices and recurring costs', () => {
  assert.equal(getPackageBySlug('basis').price, 499);
  assert.equal(getPackageBySlug('business').price, 899);
  assert.equal(getPackageBySlug('premium').price, 1499);
  assert.deepEqual(SITE_FACTS.recurringCosts.map((item) => item.priceLabel), [
    'ab 10 EUR/Monat',
    '10 EUR/Monat',
    '5 EUR/Monat'
  ]);
});

test('google rating label is generated from one source of truth', () => {
  assert.equal(formatGoogleRating('de'), '★★★★★ 5,0/5 · 4 Google-Rezensionen');
  assert.equal(formatGoogleRating('en'), '★★★★★ 5.0/5 · 4 Google reviews');
});
