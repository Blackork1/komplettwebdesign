import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  INDEXABLE_STATIC_ROUTES,
  PRIORITY_INDUSTRY_SLUGS,
  REVIEWED_DISTRICT_SLUGS,
  shouldIncludeDistrictInSitemap,
  shouldIncludeIndustryInSitemap
} from '../helpers/seoPagePolicy.js';

test('static sitemap policy keeps important existing marketing, legal, FAQ, blog, and reference routes', () => {
  const routes = INDEXABLE_STATIC_ROUTES.map((route) => route.path);

  [
    '/',
    '/webdesign-berlin',
    '/website-erstellen-lassen-berlin',
    '/leistungen/website-relaunch',
    '/leistungen/website-audit',
    '/leistungen/landingpage-erstellen-lassen',
    '/leistungen/local-seo',
    '/webdesign-kleine-unternehmen-berlin',
    '/webdesign-berlin/kosten-preise-pakete',
    '/pakete',
    '/pakete/start',
    '/pakete/business',
    '/pakete/wachstum',
    '/pakete/individuell',
    '/referenzen',
    '/referenzen/zur-alten-backstube',
    '/referenzen/tm-sauber-mehr',
    '/ablauf',
    '/website-tester',
    '/website-tester/broken-links',
    '/website-tester/geo',
    '/website-tester/seo',
    '/website-tester/meta',
    '/kontakt',
    '/about',
    '/ratgeber',
    '/branchen',
    '/blog',
    '/faq',
    '/datenschutz',
    '/hinweise-rechtstexte-seo-datenschutz',
    '/impressum'
  ].forEach((path) => assert.ok(routes.includes(path), `${path} missing from static sitemap policy`));
});

test('industry sitemap policy only includes reviewed priority industries and excludes schools and daycare', () => {
  assert.deepEqual(
    PRIORITY_INDUSTRY_SLUGS,
    ['handwerker', 'restaurant', 'cafe', 'reinigungsfirma', 'reinigung', 'blumenladen', 'immobilienmakler']
  );

  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'webdesign-handwerker' }), true);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'restaurant' }), true);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'webdesign-reinigung' }), true);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'webdesign-blumenladen' }), true);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'webdesign-kita', name: 'Kita' }), false);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'schule', title: 'Webdesign Schule' }), false);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'daycare', description: 'Daycare website' }), false);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'zahnarzt' }), false);
});

test('district sitemap policy only includes reviewed Berlin district slugs', () => {
  assert.deepEqual(
    REVIEWED_DISTRICT_SLUGS,
    ['lichtenberg', 'mitte', 'kreuzberg', 'friedrichshain', 'charlottenburg', 'prenzlauer-berg']
  );

  assert.equal(shouldIncludeDistrictInSitemap('lichtenberg'), true);
  assert.equal(shouldIncludeDistrictInSitemap('prenzlauer-berg'), true);
  assert.equal(shouldIncludeDistrictInSitemap('spandau'), false);
});

test('sitemap controller uses the shared SEO page policy for static, district, and industry URLs', async () => {
  const source = await readFile(new URL('../controllers/sitemapController.js', import.meta.url), 'utf8');

  assert.match(source, /INDEXABLE_STATIC_ROUTES/);
  assert.match(source, /shouldIncludeDistrictInSitemap/);
  assert.match(source, /shouldIncludeIndustryInSitemap/);
  assert.doesNotMatch(source, /function isExcludedIndustry/);
});

test('sitemap cms pages query only references columns present in the pages table', async () => {
  const source = await readFile(new URL('../controllers/sitemapController.js', import.meta.url), 'utf8');
  const pagesQuery = source.match(/const pages = await querySafe\(\s*`([\s\S]*?)`\s*,\s*\[\]\s*,\s*"pages"\s*\)/);

  assert.ok(pagesQuery, 'pages sitemap query not found');
  assert.match(pagesQuery[1], /COALESCE\(created_at, now\(\)\) AS updated_at/);
  assert.doesNotMatch(pagesQuery[1], /COALESCE\(updated_at/);
});
