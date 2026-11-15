import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import ejs from 'ejs';

import { footerNavigation } from '../data/siteNavigation.js';
import { loadSwipeAndCookLegalPage } from '../services/swipeAndCookLegalContentService.js';

const iconFiles = [
  'public/cookavoli/cookavoli-icon-light.svg',
  'public/cookavoli/cookavoli-icon-dark.svg'
];

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function renderLocals() {
  return {
    title: 'Cookavoli Support',
    description: 'Cookavoli Support',
    legalPage: loadSwipeAndCookLegalPage('support'),
    canonicalBaseUrl: 'https://www.komplettwebdesign.de',
    canonicalUrl: 'https://www.komplettwebdesign.de/swipeandcook-support',
    assetVersion: 'test',
    asset: (assetPath) => `/${assetPath}`,
    cssAsset: (assetPath) => `/${assetPath}`,
    jsAsset: (assetPath) => `/${assetPath}`,
    csrfToken: 'csrf-test',
    currentPathname: '/swipeandcook-support',
    currentSearch: '',
    headerNavigation: [],
    footerNavigation,
    lng: 'de',
    robots: 'noindex',
    disableTracking: true,
    disableInteractionPolish: true,
    trackingContext: {},
    escapeJsonForHtml: (value) => JSON.stringify(value)
  };
}

test('liefert zwei eigenständige Cookavoli-Icons als echte, zugängliche Vektorgrafiken aus', () => {
  const documents = iconFiles.map((file) => load(read(file), { xmlMode: true }));

  for (const [index, $] of documents.entries()) {
    assert.equal($('svg').attr('viewBox'), '0 0 1024 1024', iconFiles[index]);
    assert.equal($('svg title').text().trim(), 'Cookavoli App-Icon', iconFiles[index]);
    assert.ok($('svg path').length >= 4, iconFiles[index]);
    assert.equal($('svg image').length, 0, iconFiles[index]);
    assert.doesNotMatch(read(iconFiles[index]), /data:image|base64/i, iconFiles[index]);
  }

  assert.notEqual(read(iconFiles[0]), read(iconFiles[1]));
});

test('zeigt Cookavoli als einzige, zentrierte H1 und behält den Seitentitel in der Überschriftenhierarchie', async () => {
  const template = fileURLToPath(new URL(
    '../views/static/swipeandcook-support.ejs',
    import.meta.url
  ));
  const html = await ejs.renderFile(template, renderLocals());
  const $ = load(html);

  assert.equal($('h1').length, 1);
  assert.equal($('h1.cookavoli-wordmark').text().replace(/\s+/g, ' ').trim(), 'Cookavoli Swipe•Cook•Enjoy');
  assert.equal($('h1.cookavoli-wordmark').attr('id'), 'cookavoli-brand-title');
  assert.equal($('h1.cookavoli-wordmark').attr('aria-label'), 'Cookavoli');
  assert.equal($('#swipe-legal-title').prop('tagName'), 'H2');
  assert.equal($('.swipe-privacy-hero').attr('aria-labelledby'), 'cookavoli-brand-title swipe-legal-title');
});

test('verwendet das dunkle Cookavoli-SVG in der App-Navigation', async () => {
  const template = fileURLToPath(new URL(
    '../views/static/swipeandcook-support.ejs',
    import.meta.url
  ));
  const html = await ejs.renderFile(template, renderLocals());
  const $ = load(html);

  assert.equal($('.swipe-site-brand__icon').attr('src'), '/cookavoli/cookavoli-icon-dark.svg');
  assert.equal($('.swipe-site-brand__copy strong').text().trim(), 'Cookavoli');
  assert.equal($('.swipe-site-nav').attr('aria-label'), 'Cookavoli');
});
