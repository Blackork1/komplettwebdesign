import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const serviceTemplates = [
  'views/leistungen/show.ejs',
  'views/static/leistungen.ejs',
  'views/static/laufende-kosten-website.ejs',
  'views/static/zusatzleistungen-webdesign.ejs',
  'views/static/website-wartung-berlin.ejs',
  'views/static/local-seo-berlin.ejs',
  'views/seo_landing/show.ejs'
];

test('Leistungsseiten load the shared leistungen.css asset instead of page-local CSS blocks', () => {
  for (const template of serviceTemplates) {
    const source = read(template);

    assert.match(
      source,
      /extraCssAssets:\s*\[\s*['"]leistungen\.css['"]\s*\]/,
      `${template} must load leistungen.css through the shared head asset pipeline`
    );
    assert.doesNotMatch(source, /<style\b/i, `${template} must not contain inline CSS blocks`);
    assert.doesNotMatch(source, /seo-landing\.css/, `${template} must not load a separate service CSS file`);
  }
});

test('shared leistungen.css is registered, minified and contains the service style families', () => {
  assert.equal(existsSync(new URL('../public/leistungen.css', import.meta.url)), true);
  assert.equal(existsSync(new URL('../public/leistungen.min.css', import.meta.url)), true);

  const index = read('index.js');
  const css = read('public/leistungen.css');

  assert.match(index, /['"]leistungen\.css['"]/);
  assert.match(css, /Leistungsseiten shared design system/);
  assert.match(css, /\.service-page\b/);
  assert.match(css, /\.service-hero\b/);
  assert.match(css, /\.leistungen-overview-card\b/);
  assert.match(css, /\.leistungen-service-hero\b/);
  assert.match(css, /\.seo-landing__hero\b/);
  assert.match(css, /\.running-costs-hero\b/);
  assert.match(css, /\.add-ons-hero\b/);
  assert.match(css, /\.maintenance-hero\b/);
  assert.match(css, /\.local-seo-hero\b/);
});
