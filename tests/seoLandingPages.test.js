import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { SEO_LANDING_PAGES, getSeoLandingPage } from '../data/seoLandingPages.js';

const EXPECTED_SLUGS = [
  'website-erstellen-lassen-berlin',
  'website-relaunch-berlin',
  'webdesign-kleine-unternehmen-berlin',
  'ablauf'
];

function uniqueValues(items, field) {
  return new Set(items.map((item) => item[field]));
}

test('seo landing pages expose exactly the planned static money pages', () => {
  assert.deepEqual(SEO_LANDING_PAGES.map((page) => page.slug), EXPECTED_SLUGS);
  assert.deepEqual(SEO_LANDING_PAGES.map((page) => page.path), [
    '/website-erstellen-lassen-berlin',
    '/website-relaunch-berlin',
    '/webdesign-kleine-unternehmen-berlin',
    '/ablauf'
  ]);
});

test('seo landing pages have unique primary keyword title h1 and path', () => {
  ['primaryKeyword', 'title', 'h1', 'path'].forEach((field) => {
    assert.equal(
      uniqueValues(SEO_LANDING_PAGES, field).size,
      SEO_LANDING_PAGES.length,
      `${field} must be unique`
    );
  });
});

test('seo landing pages include complete metadata content faq internal links and ctas', () => {
  SEO_LANDING_PAGES.forEach((page) => {
    assert.ok(page.title.length >= 35 && page.title.length <= 65, `${page.slug} title length`);
    assert.ok(page.description.length >= 120 && page.description.length <= 160, `${page.slug} description length`);
    assert.ok(page.h1.length >= 20, `${page.slug} h1`);
    assert.ok(page.intro.length >= 120, `${page.slug} intro`);
    assert.ok(Array.isArray(page.sections) && page.sections.length >= 3, `${page.slug} sections`);
    assert.ok(page.sections.every((section) => section.heading && section.body), `${page.slug} section copy`);
    assert.ok(page.cta?.label && page.cta?.href, `${page.slug} primary cta`);
    assert.ok(page.secondaryCta?.label && page.secondaryCta?.href, `${page.slug} secondary cta`);
    assert.ok(Array.isArray(page.faq) && page.faq.length >= 3, `${page.slug} faq`);
    assert.ok(page.faq.every((item) => item.question && item.answer), `${page.slug} faq copy`);
    assert.ok(Array.isArray(page.internalLinks) && page.internalLinks.length >= 3, `${page.slug} internal links`);
    assert.ok(page.internalLinks.every((link) => link.label && link.href), `${page.slug} internal link copy`);
  });
});

test('website-erstellen-lassen page is distinct from the webdesign berlin hub', () => {
  const page = getSeoLandingPage('website-erstellen-lassen-berlin');
  assert.ok(page);
  assert.equal(page.path, '/website-erstellen-lassen-berlin');
  assert.notEqual(page.path, '/webdesign-berlin');
  assert.notEqual(page.primaryKeyword, 'webdesign berlin');
  assert.doesNotMatch(page.h1, /^Webdesign Berlin$/i);
  assert.match(page.h1, /Website erstellen lassen/i);
});

test('website relaunch page is available as a distinct seo landing page', () => {
  const page = getSeoLandingPage('website-relaunch-berlin');
  assert.ok(page);
  assert.equal(page.path, '/website-relaunch-berlin');
  assert.equal(page.primaryKeyword, 'website relaunch berlin');
  assert.match(page.h1, /Website Relaunch/i);
  assert.ok(page.sections.length >= 4);
  assert.ok(page.internalLinks.some((link) => link.href === '/website-erstellen-lassen-berlin'));
});

test('website intent landing pages use webdesign berlin as breadcrumb parent', () => {
  ['website-erstellen-lassen-berlin', 'website-relaunch-berlin', 'ablauf'].forEach((slug) => {
    const page = getSeoLandingPage(slug);
    assert.equal(page.parentBreadcrumb?.label, 'Webdesign Berlin');
    assert.equal(page.parentBreadcrumb?.href, '/webdesign-berlin');
  });
});

test('ablauf page has berlin-specific project process intent', () => {
  const page = getSeoLandingPage('ablauf');

  assert.equal(page.primaryKeyword, 'website projekt ablauf berlin');
  assert.match(page.title, /Berlin/);
  assert.match(page.description, /Berlin/);
  assert.match(page.h1, /Berlin/);
  assert.match(page.intro, /Berlin/);
  assert.ok(page.internalLinks.some((link) => link.href === '/website-relaunch-berlin'));
});

test('seo landing route lookup returns known pages and null for missing slugs', () => {
  assert.equal(getSeoLandingPage('website-erstellen-lassen-berlin')?.path, '/website-erstellen-lassen-berlin');
  assert.equal(getSeoLandingPage('website-relaunch-berlin')?.primaryKeyword, 'website relaunch berlin');
  assert.equal(getSeoLandingPage('webdesign-kleine-unternehmen-berlin')?.primaryKeyword, 'webdesign kleine unternehmen berlin');
  assert.equal(getSeoLandingPage('ablauf')?.primaryKeyword, 'website projekt ablauf berlin');
  assert.equal(getSeoLandingPage('webdesign-berlin'), null);
  assert.equal(getSeoLandingPage(''), null);
});

test('index.js mounts seoLandingRoutes before slugRoutes', () => {
  const indexSource = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const importIndex = indexSource.indexOf("import seoLandingRoutes from './routes/seoLandingRoutes.js';");
  const seoMountIndex = indexSource.indexOf('app.use(seoLandingRoutes);');
  const slugMountIndex = indexSource.indexOf('app.use(slugRoutes);');

  assert.notEqual(importIndex, -1, 'index.js must import seoLandingRoutes');
  assert.notEqual(seoMountIndex, -1, 'index.js must mount seoLandingRoutes');
  assert.notEqual(slugMountIndex, -1, 'index.js must still mount slugRoutes');
  assert.ok(seoMountIndex < slugMountIndex, 'seoLandingRoutes must be mounted before slugRoutes');
});

test('seo landing routes expose the relaunch page before slug fallback', () => {
  const routeSource = fs.readFileSync(new URL('../routes/seoLandingRoutes.js', import.meta.url), 'utf8');

  assert.match(routeSource, /router\.get\('\/website-relaunch-berlin'/);
  assert.match(routeSource, /req\.params\.slug = 'website-relaunch-berlin'/);
});

test('sitemap includes the static seo landing routes', () => {
  const sitemapSource = fs.readFileSync(new URL('../controllers/sitemapController.js', import.meta.url), 'utf8');

  EXPECTED_SLUGS.forEach((slug) => {
    assert.match(sitemapSource, new RegExp(`\\$\\{base\\}/${slug}`), `missing sitemap route for ${slug}`);
  });
});

test('seo landing metadata and template render breadcrumb hierarchy through webdesign berlin', () => {
  const controllerSource = fs.readFileSync(new URL('../controllers/seoLandingController.js', import.meta.url), 'utf8');
  const templateSource = fs.readFileSync(new URL('../views/seo_landing/show.ejs', import.meta.url), 'utf8');

  assert.match(controllerSource, /isPartOf/);
  assert.match(controllerSource, /parentBreadcrumb/);
  assert.match(controllerSource, /BreadcrumbList/);
  assert.match(templateSource, /breadcrumbs \|\| \[\]/);
  assert.match(templateSource, /aria-current="page"/);
});
