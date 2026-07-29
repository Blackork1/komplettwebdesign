import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import express from 'express';

import { footerNavigation } from '../data/siteNavigation.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';
import staticPagesRouter from '../routes/staticPages.js';
import {
  loadSwipeAndCookLegalPage
} from '../services/swipeAndCookLegalContentService.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const routes = read('routes/staticPages.js');

test('registers the canonical Swipe & Cook privacy route with its own CSS', () => {
  assert.match(routes, /router\.get\('\/swipeandcook-datenschutz'/);
  assert.match(routes, /res\.render\('static\/swipeandcook-datenschutz'/);
  assert.match(routes, /Swipe & Cook Datenschutz \| Komplett Webdesign/);
  assert.match(routes, /currentPathname:\s*'\/swipeandcook-datenschutz'/);
  assert.match(routes, /extraCssAssets:\s*\['swipeandcook-privacy\.css'\]/);
});

test('publishes the full approved privacy information without internal paths', () => {
  const view = read('views/static/swipeandcook-datenschutz.ejs');
  const source = read('content/swipeandcook/s2-datenschutzerklaerung.md');
  const page = loadSwipeAndCookLegalPage('privacy');

  assert.match(view, /swipeandcook-legal-body/);
  assert.match(source, /Stand: 29\. Juli 2026/);
  assert.match(source, /Konto, Anmeldung und Appnutzung/);
  assert.match(source, /Allergien, Unverträglichkeiten und andere Safety-Angaben/);
  assert.match(source, /Premiumabonnements, Käufe und Wiederherstellung/);
  assert.match(source, /RevenueCat/);
  assert.match(source, /Optionale Produktanalyse/);
  assert.match(source, /Kontolöschung und weiterlaufendes Storeabo/);
  assert.match(source, /kontakt@komplettwebdesign\.de/);
  assert.doesNotMatch(
    page.html,
    /Vorgesehene öffentliche Adresse|Interner Status|S2-Nachweismatrix|Status:\s*Entwurf/i
  );
});

test('serves both privacy routes successfully over HTTP', async () => {
  const app = express();
  app.use((_req, res, next) => {
    res.render = (view, locals = {}) => res.status(200).json({ view, locals });
    next();
  });
  app.use(staticPagesRouter);

  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();

    const swipeResponse = await fetch(`http://127.0.0.1:${port}/swipeandcook-datenschutz`);
    assert.equal(swipeResponse.status, 200);
    assert.equal((await swipeResponse.json()).view, 'static/swipeandcook-datenschutz');

    const generalResponse = await fetch(`http://127.0.0.1:${port}/datenschutz`);
    assert.equal(generalResponse.status, 200);
    assert.equal((await generalResponse.json()).view, 'static/datenschutz');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test('links the page from the legal footer and static sitemap', () => {
  const legal = footerNavigation.find((column) => column.label === 'Rechtliches');
  assert.ok(legal);
  assert.ok(legal.links.some((link) => (
    link.label === 'Swipe & Cook Datenschutz'
    && link.href === '/swipeandcook-datenschutz'
  )));
  assert.ok(INDEXABLE_STATIC_ROUTES.some((route) => (
    route.path === '/swipeandcook-datenschutz'
    && route.changefreq === 'yearly'
    && route.priority === 0.2
  )));
});

test('provides responsive readable styling without third-party assets', () => {
  const css = read('public/swipeandcook-privacy.css');

  assert.match(css, /\.swipe-privacy-hero/);
  assert.match(css, /\.swipe-privacy-summary/);
  assert.match(css, /\.swipe-privacy-provider-grid/);
  assert.match(css, /\.swipe-privacy-contact/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.doesNotMatch(css, /https?:\/\//);
});
