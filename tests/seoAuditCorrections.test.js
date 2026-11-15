import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';
import { renderDistrictPage } from '../controllers/districtController.js';

const pricing = buildPricingViewModel({
  visiblePackages: [
    { packageKey: 'start', name: 'Start', priceLabel: 'ab 999 €' },
    { packageKey: 'business', name: 'Business', priceLabel: 'ab 1.799 €' },
    { packageKey: 'wachstum', name: 'Wachstum', priceLabel: 'ab 2.899 €' },
    { packageKey: 'individuell', name: 'Individuell', priceLabel: 'ab 3.999 € oder nach Aufwand' }
  ],
  lowestPackagePriceLabel: 'ab 999 €'
});

// Catches missing, incorrectly ordered or stale price replacements in public CMS content.
test('legacy prices resolve to the current catalog without editorial placeholders', () => {
  const samples = [
    ['Café Website erstellen lassen Berlin - günstig ab 499€ ☕', 'ab 999 €'],
    ['Blumenladen Website erstellen - Webdesign für Floristen Berlin ab 499€', 'ab 999 €'],
    ['Basis ab 499 €, mit Reservierung & SEO ab 899 €, individuell ab 1.499 €.', 'ab 3.999 €'],
    ['Ein professioneller Einstieg ist ab 499 EUR möglich.', 'ab 999 €'],
    ['Basis ab 799 €', 'Start ab 999 €'],
    ['Business ab 899 €', 'Business ab 1.799 €'],
    ['Premium ab 1.499 €', 'Wachstum ab 2.899 €'],
    ['499 / 899 / 1.499 €', 'ab 2.899 €'],
    ['<td>Komplett Webdesign Premium</td><td>1.499 €</td>', 'ab 2.899 €']
  ];
  for (const [source, expected] of samples) {
    const result = normalizeLegacyPublicCopy(source, pricing);
    assert.ok(result.includes(expected), `${source} → ${result}`);
    assert.doesNotMatch(result, /nach aktueller Paketlogik|aktueller Paketpreis|aktueller Business-Paketrahmen|nach aktuellem Paketumfang|aktuelle Paketlogik|\{\{/i);
  }
});

test('legacy cleanup preserves current prices, market comparisons and dates', () => {
  assert.equal(normalizeLegacyPublicCopy('Business ab 1.499 €; Wachstum ab 2.499 €; Marktpreis 1.499 €.'), 'Business ab 1.499 €; Wachstum ab 2.499 €; Marktpreis 1.499 €.');
  const date = new Date('2026-01-01');
  assert.equal(normalizeLegacyPublicCopy({ date }).date, date);
});

test('German district models contain resolved German prices including guide teasers', async () => {
  let model;
  const res = {
    locals: { packagePricing: pricing },
    render(_view, values) { model = values; }
  };
  await renderDistrictPage({ params: { slug: 'lichtenberg' }, baseUrl: '/webdesign-berlin', app: { locals: { cssAsset: x => `/${x}` } } }, res, error => { if (error) throw error; });
  assert.ok(model);
  const text = JSON.stringify([model.faqItems, model.seoGuides, model.districtPage]);
  assert.doesNotMatch(text, /\{\{|\bfrom\b|\bEUR\b/);
  assert.match(text, /ab 999 €/);
  assert.match(text, /ab 1\.799 €/);
});

test('legacy blog output uses the confirmed phone and removes stale embedded schema', async () => {
  const { buildBlogPostPageModel } = await import('../services/blogPostPresentationService.js');
  const model = buildBlogPostPageModel({
    post: { id: 1, slug: 'full-service-webdesign-in-berlin', title: 'Full Service', content_format: 'legacy_ejs', created_at: '2026-01-01', updated_at: '2026-01-01', content: `<p>Ab 499 €: <a href="tel:+4915254350378">+49 1525 4350378</a></p><script type="application/ld+json">{"telephone":"+4915254350378"}</script>` },
    pricing,
    canonicalBaseUrl: 'https://www.komplettwebdesign.de'
  });
  assert.match(model.renderedContent, /tel:\+4915511245048/);
  assert.match(model.renderedContent, /\+49 155 11245048/);
  assert.match(model.renderedContent, /ab 999 €/i);
  assert.doesNotMatch(model.renderedContent, /application\/ld\+json|1525|499/);
});
