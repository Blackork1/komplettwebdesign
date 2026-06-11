import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPricingTokenDryRun,
  getKnownPricingTokens,
  renderPricingTokens
} from '../util/pricingTokenRenderer.js';

function pricingContext(overrides = {}) {
  return {
    lowestPackagePriceLabel: 'ab 799 €',
    packageByKey: {
      start: {
        packageKey: 'start',
        name: 'Start',
        displayName: 'Start-Paket',
        priceLabel: 'ab 799 €',
        canonicalPath: '/pakete/start',
        slug: 'start'
      },
      business: {
        packageKey: 'business',
        name: 'Business',
        displayName: 'Business-Paket',
        priceLabel: 'ab 1.499 €',
        canonicalPath: '/pakete/business',
        slug: 'business'
      },
      wachstum: {
        packageKey: 'wachstum',
        name: 'Wachstum',
        displayName: 'Wachstum-Paket',
        priceLabel: 'ab 2.499 €',
        canonicalPath: '/pakete/wachstum',
        slug: 'wachstum'
      },
      individuell: {
        packageKey: 'individuell',
        name: 'Individuell',
        displayName: 'Individuelles Projekt',
        priceLabel: 'ab 3.500 € oder nach Aufwand',
        canonicalPath: '/pakete/individuell',
        slug: 'individuell'
      },
      ...(overrides.packageByKey || {})
    },
    ...(overrides || {})
  };
}

test('renderPricingTokens replaces DB package tokens and global pricing tokens', () => {
  const input = [
    '{{package:start.name}}',
    '{{package:start.displayName}}',
    '{{package:start.priceLabel}}',
    '{{package:start.url}}',
    '{{package:business.priceLabel}}',
    '{{package:wachstum.priceLabel}}',
    '{{package:individuell.priceLabel}}',
    '{{lowestPackagePriceLabel}}',
    '{{packages.overviewUrl}}'
  ].join(' | ');

  assert.equal(
    renderPricingTokens(input, pricingContext()),
    [
      'Start',
      'Start-Paket',
      'ab 799 €',
      '/pakete/start',
      'ab 1.499 €',
      'ab 2.499 €',
      'ab 3.500 € oder nach Aufwand',
      'ab 799 €',
      '/pakete'
    ].join(' | ')
  );
});

test('renderPricingTokens supports arrays and nested objects', () => {
  const result = renderPricingTokens({
    title: '{{package:business.displayName}}',
    rows: ['{{package:start.priceLabel}}', { href: '{{package:wachstum.url}}' }]
  }, pricingContext());

  assert.deepEqual(result, {
    title: 'Business-Paket',
    rows: ['ab 799 €', { href: '/pakete/wachstum' }]
  });
});

test('renderPricingTokens documents unknown tokens without exposing raw HTML', () => {
  const result = renderPricingTokens(
    'Bekannt: {{package:start.priceLabel}}. Unbekannt: {{unknown:<script>alert(1)</script>}}.',
    pricingContext(),
    { report: true }
  );

  assert.equal(result.value, 'Bekannt: ab 799 €. Unbekannt: {{unknown:&lt;script&gt;alert(1)&lt;/script&gt;}}.');
  assert.deepEqual(result.unknownTokens, ['unknown:<script>alert(1)</script>']);
});

test('renderPricingTokens escapes replacement values for raw public content', () => {
  const result = renderPricingTokens(
    '{{package:start.name}} {{package:start.url}}',
    pricingContext({
      packageByKey: {
        start: {
          name: '<script>alert(1)</script>',
          displayName: 'Start',
          priceLabel: 'ab 799 €',
          canonicalPath: '/pakete/start?x=1&y=2',
          slug: 'start'
        }
      }
    })
  );

  assert.equal(result, '&lt;script&gt;alert(1)&lt;/script&gt; /pakete/start?x=1&amp;y=2');
});

test('renderPricingTokens reflects changed DB price labels through context', () => {
  const input = 'Business kostet {{package:business.priceLabel}}.';

  assert.equal(renderPricingTokens(input, pricingContext()), 'Business kostet ab 1.499 €.');
  assert.equal(
    renderPricingTokens(input, pricingContext({
      packageByKey: {
        business: {
          name: 'Business',
          displayName: 'Business-Paket',
          priceLabel: 'ab 1.799 €',
          canonicalPath: '/pakete/business',
          slug: 'business'
        }
      }
    })),
    'Business kostet ab 1.799 €.'
  );
});

test('renderPricingTokens keeps legacy token compatibility for older content', () => {
  assert.equal(
    renderPricingTokens('{{price.start}} und {{package.business.optionLabel}}', pricingContext()),
    'ab 799 € und Business ab 1.499 €'
  );
});

test('getKnownPricingTokens exposes the supported editorial token set', () => {
  const tokens = getKnownPricingTokens();
  assert.ok(tokens.includes('{{package:start.priceLabel}}'));
  assert.ok(tokens.includes('{{package:business.priceLabel}}'));
  assert.ok(tokens.includes('{{lowestPackagePriceLabel}}'));
  assert.ok(tokens.includes('{{packages.overviewUrl}}'));
});

test('createPricingTokenDryRun reports hardcoded price candidates without changing content', () => {
  const report = createPricingTokenDryRun({
    blog: 'Start ab 799 €, Business ab 1.499 € und früher ab 499 €.',
    ratgeber: ['Wachstum ab 2.499 €', 'Individuell ab 3.500 € oder nach Aufwand', 'Business 899 €']
  });

  assert.deepEqual(
    report.map((entry) => ({
      source: entry.source,
      match: entry.match,
      recommendedToken: entry.recommendedToken,
      manualReviewRequired: entry.manualReviewRequired
    })),
    [
      {
        source: 'blog',
        match: 'ab 799 €',
        recommendedToken: '{{package:start.priceLabel}}',
        manualReviewRequired: false
      },
      {
        source: 'blog',
        match: 'ab 1.499 €',
        recommendedToken: '{{package:business.priceLabel}}',
        manualReviewRequired: false
      },
      {
        source: 'blog',
        match: 'ab 499 €',
        recommendedToken: null,
        manualReviewRequired: true
      },
      {
        source: 'ratgeber[0]',
        match: 'ab 2.499 €',
        recommendedToken: '{{package:wachstum.priceLabel}}',
        manualReviewRequired: false
      },
      {
        source: 'ratgeber[1]',
        match: 'ab 3.500 €',
        recommendedToken: '{{package:individuell.priceLabel}}',
        manualReviewRequired: false
      },
      {
        source: 'ratgeber[2]',
        match: '899 €',
        recommendedToken: null,
        manualReviewRequired: true
      }
    ]
  );
});
