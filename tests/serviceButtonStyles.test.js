import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const filesWithoutCustomButtons = Object.freeze([
  'views/index.ejs',
  'views/leistungen/show.ejs',
  'views/package_detail.ejs',
  'views/packages_list.ejs',
  'views/seo_landing/show.ejs',
  'views/static/local-seo-berlin.ejs',
  'views/static/website-wartung-berlin.ejs',
  'views/static/zusatzleistungen-webdesign.ejs',
  'views/static/laufende-kosten-website.ejs',
  'views/bereiche/webdesign-berlin.ejs',
  'views/bereiche/webdesign-berlin-en.ejs',
  'views/bereiche/webdesign-berlin-district.ejs',
  'views/references/index.ejs',
  'views/references/show.ejs',
  'views/ratgeber/index.ejs',
  'views/ratgeber/show.ejs',
  'views/blog/index.ejs',
  'views/blog/show.ejs',
  'public/extra.css',
  'public/unified-hero.css',
  'public/leistungen.css',
  'public/references.css',
  'public/district-berlin.css',
  'public/website-tester.css',
  'public/ratgeber.css',
  'public/branchen.css'
]);

const oldButtonClassPattern = /\b(?:seo-landing__button|maintenance-btn|running-costs-btn|add-ons-btn|local-seo-btn|district-btn|wd-btn|btn-hero|btn-soft-outline|references-button|wt-button|hero-cta-button|cost-package-button|cost-package-link|cta-button|btn-accent|btn-white|btn-ghost|unified-hero__button|btn-outline-light|btn-outline-secondary|btn-outline-dark|btn-outline-primary|btn-tertiary|ctaButton|hero-button)\b/;

function source(file) {
  return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ruleFor(css, selector) {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

function assertDeclaration(rule, property, expected) {
  const pattern = new RegExp(`${escapeRegExp(property)}\\s*:\\s*${escapeRegExp(expected)}\\s*;`);
  assert.match(rule, pattern, `Expected ${property}: ${expected}`);
}

test('public pages no longer keep custom button class systems', () => {
  for (const file of filesWithoutCustomButtons) {
    assert.doesNotMatch(source(file), oldButtonClassPattern, `${file} still contains a legacy button class`);
  }
});

test('global button contract is defined once in main CSS', () => {
  const css = source('public/css/main.css');
  const baseRule = ruleFor(css, '.btn');
  const primaryRule = ruleFor(css, '.btn-primary');
  const primaryHoverRule = ruleFor(css, '.btn-primary:hover,\n.btn-primary:focus-visible');
  const secondaryRule = ruleFor(css, '.btn-secondary');
  const secondaryHoverRule = ruleFor(css, '.btn-secondary:hover,\n.btn-secondary:focus-visible');

  assertDeclaration(baseRule, 'display', 'inline-flex');
  assertDeclaration(baseRule, 'align-items', 'center');
  assertDeclaration(baseRule, 'justify-content', 'center');
  assertDeclaration(baseRule, 'min-height', '48px');
  assertDeclaration(baseRule, 'padding', '0 20px');
  assertDeclaration(baseRule, 'border-radius', 'var(--radius)');
  assertDeclaration(baseRule, 'box-shadow', 'none');
  assertDeclaration(primaryRule, 'background-color', 'var(--color-accent)');
  assertDeclaration(primaryRule, 'border-color', 'var(--color-accent)');
  assertDeclaration(primaryRule, 'color', 'var(--color-white)');
  assertDeclaration(primaryHoverRule, 'background-color', '#c13a2b');
  assertDeclaration(primaryHoverRule, 'color', 'var(--color-white)');
  assertDeclaration(secondaryRule, 'background-color', 'var(--color-primary)');
  assertDeclaration(secondaryRule, 'color', 'var(--color-white)');
  assertDeclaration(secondaryRule, 'border-color', 'rgba(255, 255, 255, 0.34)');
  assertDeclaration(secondaryHoverRule, 'background-color', '#24455f');
  assertDeclaration(secondaryHoverRule, 'border-color', 'rgba(255, 255, 255, 0.5)');
  assertDeclaration(secondaryHoverRule, 'color', 'var(--color-white)');
});

test('footer color fallback only targets shared variants and skips interactive states', () => {
  const footer = source('public/footer.css');
  const blocks = footer.match(/:where\([\s\S]*?\):not\(:hover\):not\(:focus\):not\(:focus-visible\):not\(:active\)\s*\{[\s\S]*?\}/g) || [];
  const primaryBlock = blocks.find((block) => block.includes('.btn-primary') && block.includes('color: #ffffff !important;'));
  const secondaryBlock = blocks.find((block) => block.includes('.btn-secondary') && block.includes('color: #ffffff !important;'));

  assert.ok(primaryBlock, 'Missing guarded primary fallback');
  assert.ok(secondaryBlock, 'Missing guarded secondary fallback');
  assert.doesNotMatch(primaryBlock, oldButtonClassPattern);
  assert.doesNotMatch(secondaryBlock, oldButtonClassPattern);
});
