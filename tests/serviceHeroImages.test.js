import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const expectedHeroImages = Object.freeze({
  '/leistungen': '/images/leistungen/leistungen-uebersicht-hero.webp',
  '/website-erstellen-lassen-berlin': '/images/leistungen/landingpage-erstellen-lassen-hero.webp',
  '/leistungen/website-relaunch': '/images/leistungen/website-relaunch-hero.webp',
  '/leistungen/local-seo': '/images/leistungen/local-seo-hero.webp',
  '/leistungen/landingpage-erstellen-lassen': '/images/leistungen/landingpage-erstellen-lassen-hero.webp',
  '/leistungen/website-audit': '/images/leistungen/website-audit-hero.webp',
  '/leistungen/website-wartung': '/images/leistungen/website-wartung-hero.webp',
  '/leistungen/zusatzleistungen-webdesign': '/images/leistungen/zusatzleistungen-webdesign-hero.webp',
  '/leistungen/laufende-kosten-website': '/images/leistungen/laufende-kosten-website-hero.webp',
  '/leistungen/responsives-design-mobile': '/images/leistungen/responsives-design-mobile-hero.webp',
  '/leistungen/inhalte-texte-content': '/images/leistungen/inhalte-texte-content-hero.webp',
  '/leistungen/rechtliches-sicherheit': '/images/leistungen/rechtliches-sicherheit-hero.webp'
});

test('service hero image map covers every requested Leistungsseite', async () => {
  const moduleUrl = new URL('../data/serviceHeroImages.js', import.meta.url);
  assert.equal(existsSync(moduleUrl), true, 'data/serviceHeroImages.js is missing');

  const { SERVICE_HERO_IMAGES, heroImageForPath } = await import(moduleUrl.href);

  for (const [path, src] of Object.entries(expectedHeroImages)) {
    assert.equal(SERVICE_HERO_IMAGES[path]?.src, src, `${path} uses the wrong hero image`);
    assert.equal(heroImageForPath(path)?.src, src, `${path} is not resolved by heroImageForPath`);
  }
});

test('compressed service hero images exist and stay small enough for hero backgrounds', () => {
  for (const src of Object.values(expectedHeroImages)) {
    const imageUrl = new URL(`../public${src}`, import.meta.url);
    assert.equal(existsSync(imageUrl), true, `${src} is missing`);
    assert.ok(statSync(imageUrl).size < 260_000, `${src} should stay below 260 KB`);
  }
});

test('landing page service hero uses the supplied artwork', () => {
  const imageUrl = new URL('../public/images/leistungen/landingpage-erstellen-lassen-hero.webp', import.meta.url);
  const hash = createHash('sha256').update(readFileSync(imageUrl)).digest('hex');

  assert.equal(hash, 'ff13873fcff4ede35e7ca0b5827669454b090fd62cfacc09665e0d9d9ab5e146');
});

test('seo landing hero CSS applies service images with browser-safe longhands', () => {
  const source = readFileSync(new URL('../public/leistungen.css', import.meta.url), 'utf8');

  assert.match(source, /\.seo-landing__hero\.has-service-hero-image\s*{[^}]*background-image:[^}]*var\(--service-hero-image\)/s);
  assert.match(source, /\.seo-landing__hero\.has-service-hero-image\s*{[^}]*background-size:\s*cover,\s*cover/s);
  assert.match(source, /\.seo-landing\s+\.seo-landing__hero\.unified-hero\.has-service-hero-image\s*{[^}]*background-image:[^}]*!important/s);
});

test('generic Leistung hero CSS overrides the shared unified hero background for service images', () => {
  const source = readFileSync(new URL('../public/leistungen.css', import.meta.url), 'utf8');

  assert.match(source, /\.leistungen-page\s+\.leistungen-service-hero\.unified-hero\[style\*="--service-hero-image"\]\s*{[^}]*background-image:[^}]*var\(--service-hero-image\)[^}]*!important/s);
  assert.match(source, /\.leistungen-page\s+\.leistungen-service-hero\.unified-hero\[style\*="--service-hero-image"\]\s*{[^}]*background-size:\s*cover,\s*cover/s);
});

test('service templates render a dynamic hero background image hook', () => {
  const templatePaths = [
    '../views/static/leistungen.ejs',
    '../views/seo_landing/show.ejs',
    '../views/leistungen/show.ejs',
    '../views/static/local-seo-berlin.ejs',
    '../views/static/website-wartung-berlin.ejs',
    '../views/static/zusatzleistungen-webdesign.ejs',
    '../views/static/laufende-kosten-website.ejs'
  ];

  for (const templatePath of templatePaths) {
    const source = readFileSync(new URL(templatePath, import.meta.url), 'utf8');
    assert.match(source, /heroImage/, `${templatePath} does not receive or render heroImage`);
    assert.match(source, /--service-hero-image/, `${templatePath} does not expose the hero background CSS variable`);
  }
});
