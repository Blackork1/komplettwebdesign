import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function blockAfter(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing overflow guard marker: ${marker}`);
  const end = source.indexOf('}', start);
  assert.notEqual(end, -1, `Missing overflow guard block end: ${marker}`);
  return source.slice(start, end + 1);
}

function assertTextWrapGuard(source, marker) {
  const block = blockAfter(source, marker);
  assert.match(block, /min-width:\s*0;/);
  assert.match(block, /overflow-wrap:\s*break-word;/);
  assert.match(block, /word-break:\s*normal;/);
  assert.match(block, /hyphens:\s*none;/);
  assert.doesNotMatch(block, /overflow-wrap:\s*anywhere;/);
  assert.doesNotMatch(block, /hyphens:\s*auto;/);
}

function simpleCssRules(source) {
  return source.match(/[^{}]+\{[^{}]*\}/g) ?? [];
}

function selectorPattern(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^-_a-zA-Z0-9])${escaped}(?![-_a-zA-Z0-9])`);
}

function assertNoLayoutMaxWidthOverride(source, ownerSelector, layoutSelector) {
  const ownerPattern = selectorPattern(ownerSelector);
  const layoutPattern = selectorPattern(layoutSelector);
  const offenders = simpleCssRules(source).filter((rule) => (
    ownerPattern.test(rule)
    && layoutPattern.test(rule)
    && /max-width:\s*100%;/.test(rule)
  ));

  assert.deepEqual(
    offenders,
    [],
    `${layoutSelector} must keep its page layout width instead of being capped by ${ownerSelector}`
  );
}

function assertNoFullBleedLayoutRule(source, layoutSelector) {
  function selectorList(rule) {
    return rule.slice(0, rule.indexOf('{')).split(',').map((selector) => selector.trim());
  }

  const offenders = simpleCssRules(source).filter((rule) => (
    selectorList(rule).some((selector) => selector === layoutSelector || selector.endsWith(` ${layoutSelector}`))
    && /(?:max-width:\s*none\b|width:\s*100%;)/.test(rule)
  ));

  assert.deepEqual(
    offenders,
    [],
    `${layoutSelector} must not re-expand a page container to full bleed`
  );
}

test('new marketing pages protect long German words from text overflow', () => {
  [
    ['public/package-list.css', 'Package text overflow safety'],
    ['public/extra.css', 'Webdesign Berlin text overflow safety'],
    ['public/package-detail.css', 'Final text overflow safety'],
    ['public/references.css', 'Reference text overflow safety'],
    ['public/leistungen.css', 'Leistungen text overflow safety'],
    ['public/website-tester.css', 'Website tester text overflow safety'],
    ['public/unified-hero.css', 'Shared hero text overflow safety'],
    ['public/ratgeber.css', 'Ratgeber text overflow safety'],
    ['public/district-berlin.css', 'District text overflow safety'],
    ['public/about.css', 'About text overflow safety'],
    ['public/kontakt.css', 'Contact text overflow safety'],
    ['public/home.css', 'Homepage mobile text overflow safety']
  ].forEach(([path, marker]) => {
    assertTextWrapGuard(read(path), marker);
  });
});

test('public marketing text avoids aggressive automatic hyphenation rules', () => {
  [
    'public/package-list.css',
    'public/extra.css',
    'public/package-detail.css',
    'public/references.css',
    'public/leistungen.css',
    'public/website-tester.css',
    'public/unified-hero.css',
    'public/ratgeber.css',
    'public/district-berlin.css',
    'public/about.css',
    'public/kontakt.css',
    'public/home.css',
    'public/seo-landing.css'
  ].forEach((path) => {
    const source = read(path);

    assert.doesNotMatch(source, /hyphens:\s*auto;/, `${path} must not auto-hyphenate text`);
    assert.doesNotMatch(
      source,
      /overflow-wrap:\s*anywhere;/,
      `${path} must not create arbitrary text break opportunities`
    );
  });
});

test('overflow guards do not override page layout container widths', () => {
  const extraCss = read('public/extra.css');
  const districtCss = read('public/district-berlin.css');
  const referencesCss = read('public/references.css');
  const seoLandingCss = read('public/leistungen.css');
  const ratgeberCss = read('public/ratgeber.css');
  const websiteTesterCss = read('public/website-tester.css');

  assertNoLayoutMaxWidthOverride(extraCss, '.webdesign-berlin-page', '.wd-container');
  assertNoLayoutMaxWidthOverride(districtCss, '.district-page', '.district-hero');
  assertNoLayoutMaxWidthOverride(districtCss, '.district-page', '.district-metrics');
  assertNoLayoutMaxWidthOverride(districtCss, '.district-page', '.district-section');
  assertNoLayoutMaxWidthOverride(districtCss, '.district-page', '.district-final');
  assertNoLayoutMaxWidthOverride(referencesCss, '.references-page', '.references-container');
  assertNoLayoutMaxWidthOverride(seoLandingCss, '.seo-landing', '.seo-landing__container');
  assertNoLayoutMaxWidthOverride(ratgeberCss, '.rg-page', '.container');
  assertNoLayoutMaxWidthOverride(ratgeberCss, '.rg-page', '.rg-detail-hero-inner');
  assertNoLayoutMaxWidthOverride(ratgeberCss, '.rg-page', '.rg-detail-layout');
  assertNoLayoutMaxWidthOverride(websiteTesterCss, '.website-tester-page', '.wt-shell');

  assert.match(websiteTesterCss, /\.wt-shell\s*\{[\s\S]*?max-width:\s*1160px;/);
  assert.match(ratgeberCss, /\.rg-article-body\s+\.row\s*>\s*\[class\*="col-md-"\]\s*\{[\s\S]*?min-width:\s*min\(100%,\s*16rem\)/);
});

test('page section container variants do not re-expand to full viewport width', () => {
  const districtCss = read('public/district-berlin.css');
  const seoLandingCss = read('public/leistungen.css');

  assertNoFullBleedLayoutRule(districtCss, '.district-metrics');
  assertNoFullBleedLayoutRule(districtCss, '.district-section--dark');
  assertNoFullBleedLayoutRule(seoLandingCss, '.seo-landing__faq');
});
