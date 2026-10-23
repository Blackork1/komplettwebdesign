import test from 'node:test';
import assert from 'node:assert/strict';
import { interpolatePricingTokens, tidyPricePhrases } from '../util/pricingViewModel.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';

const pricing = {
  visiblePackages: [],
  lowestPackagePriceLabel: '799 €',
  packagePriceMap: {
    start: { label: 'ab 799 €' },
    business: { label: 'ab 1.499 €' },
    wachstum: { label: 'ab 2.499 €' },
    individuell: { label: 'ab 3.500 € oder nach Aufwand' }
  }
};

test('doppelte Präpositionen vor Preis-Labels werden entfernt', () => {
  assert.equal(tidyPricePhrases('Pakete starten bei ab 799 €.'), 'Pakete starten bei 799 €.');
  assert.equal(tidyPricePhrases('liegt häufig bei ab 120–250 €'), 'liegt häufig bei 120–250 €');
  assert.equal(tidyPricePhrases('Start begins at from 1,499 EUR'), 'Start begins from 1,499 EUR');
  assert.equal(tidyPricePhrases('ab ab 799 €'), 'ab 799 €');
});

test('ohne Preis dahinter bleibt der Text unverändert', () => {
  assert.equal(tidyPricePhrases('Rabatt bei ab 10 Seiten'), 'Rabatt bei ab 10 Seiten');
  assert.equal(tidyPricePhrases('at from home'), 'at from home');
});

test('beide Platzhalter-Renderer erzeugen kein „bei ab“ mehr', () => {
  const text = 'Die Pakete starten bei {{price.start}}, Business bei {{price.business}}.';
  assert.equal(interpolatePricingTokens(text, pricing), 'Die Pakete starten bei 799 €, Business bei 1.499 €.');
  const rendered = renderPricingTokens(text, { packagePriceMap: pricing.packagePriceMap, lowestPackagePriceLabel: '799 €' }, { escape: false });
  assert.doesNotMatch(rendered, /bei ab/);
});

test('Altbestand: „1.499 € und 1.499 €“ wird zu Business und Wachstum', () => {
  const out = normalizeLegacyPublicCopy('Unsere Pakete starten bei 799 €, ab 1.499 € und 1.499 €.', pricing);
  assert.equal(out, 'Unsere Pakete starten bei 799 €, ab 1.499 € und ab 2.499 €.');
});
