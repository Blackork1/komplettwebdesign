import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { footerNavigation } from '../data/siteNavigation.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';

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

  assert.match(view, /Datenschutzhinweise für die App/);
  assert.match(view, /Konto und Anmeldung/);
  assert.match(view, /Rezept- und Nutzungsdaten/);
  assert.match(view, /Sicherheits- und Betriebsprotokolle/);
  assert.match(view, /Supabase/);
  assert.match(view, /Google Ireland Limited/);
  assert.match(view, /Apple Distribution International Limited/);
  assert.match(view, /höchstens zwölf Monate/);
  assert.match(view, /grundsätzlich innerhalb von 30 Tagen/);
  assert.match(view, /kontakt@komplettwebdesign\.de/);
  assert.match(view, /href="\/datenschutz"/);
  assert.doesNotMatch(view, /docs\/privacy|s0-google-apple|Status:\s*Entwurf/i);
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
