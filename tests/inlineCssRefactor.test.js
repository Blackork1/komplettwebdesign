import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(file) {
  return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

function assertNoInlineStyleAttributes(file, { allowCustomProperties = false } = {}) {
  const source = read(file);
  const styleAttrPattern = allowCustomProperties
    ? /\bstyle\s*=\s*["'](?!\s*--)/i
    : /\bstyle\s*=/i;

  assert.doesNotMatch(source, styleAttrPattern, `${file} must not contain avoidable style attributes`);
}

test('global public partials use CSS classes instead of inline CSS', () => {
  for (const file of [
    'views/partials/footer.ejs',
    'views/partials/cookie-banner.ejs',
    'views/partials/newsletter_form.ejs'
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /<style\b/i, `${file} must not contain embedded style blocks`);
    assertNoInlineStyleAttributes(file);
  }

  const mainCss = read('public/css/main.css');
  const footerCss = read('public/footer.css');

  assert.match(mainCss, /\.is-hidden\s*\{/);
  assert.match(mainCss, /\.visually-hidden\s*\{/);
  assert.match(mainCss, /\.form-honeypot\s*\{/);
  assert.match(mainCss, /\.cookie-banner\s*\{/);
  assert.match(footerCss, /\.footer\b/);
});

test('public JavaScript toggles state classes instead of display inline styles', () => {
  for (const file of [
    'public/js/navToggle.js',
    'public/js/cookie-consent.js',
    'public/js/chat.js'
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /\.style\.display\s*=/, `${file} must not set display through inline styles`);
    assert.doesNotMatch(source, /\.style\.setProperty\(\s*["'](?:transform|visibility)["']/, `${file} must not set layout state through inline styles`);
    assert.doesNotMatch(source, /Object\.assign\([^)]*\.style/, `${file} must not bulk-assign inline styles`);
  }
});

test('website tester result snippets keep layout spacing in CSS classes', () => {
  for (const file of [
    'public/js/website-tester.js',
    'public/js/broken-links-tester.js',
    'public/js/seo-tester.js',
    'public/js/geo-tester.js',
    'public/js/meta-tester.js'
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /\bstyle\s*=\s*["'][^"']*(?:margin|padding|display|opacity|width|height|transform)\s*:/i, `${file} must not inject avoidable layout style attributes`);
  }

  const testerCss = read('public/website-tester.css');
  assert.match(testerCss, /\.wt-stack-xs\b/);
  assert.match(testerCss, /\.wt-stack-sm\b/);
  assert.match(testerCss, /\.wt-score-ring\s*\{/);
});

test('key public EJS pages do not keep avoidable style attributes or local style blocks', () => {
  for (const file of [
    'views/bereiche/webdesign-berlin.ejs',
    'views/faq.ejs',
    'views/kontakt.ejs',
    'views/industries/show.ejs',
    'views/404.ejs',
    'views/error.ejs'
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /<style\b/i, `${file} must not contain embedded style blocks`);
    assertNoInlineStyleAttributes(file, { allowCustomProperties: true });
  }
});
