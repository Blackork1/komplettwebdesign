import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

import {
  buildIndustryGroups,
  getIndustryCommercialGuide,
  getIndustryContextLinks,
  getIndustryPrimaryCta
} from '../controllers/industriesController.js';
import { footerNavigation, headerCta, headerNavigation } from '../data/siteNavigation.js';
import { escapeJsonForHtml, safeUrl, sanitizeHtml } from '../util/security.js';

const template = readFileSync(new URL('../views/industries/show.ejs', import.meta.url), 'utf8');
const viewPath = fileURLToPath(new URL('../views/industries/show.ejs', import.meta.url));
const branchenCss = readFileSync(new URL('../public/branchen.css', import.meta.url), 'utf8');

function buildIndustryRenderLocals(slug) {
  const isFlowerShop = slug === 'blumenladen';
  return {
    title: `Webdesign für ${isFlowerShop ? 'Blumenläden' : 'Restaurants'}`,
    description: 'Eine vollständige Beschreibung der Branchenleistung für den echten EJS-Render-Smoke-Test.',
    ogImage: null,
    canonicalBaseUrl: 'https://www.komplettwebdesign.de',
    canonicalUrl: `https://www.komplettwebdesign.de/branchen/webdesign-${slug}`,
    assetVersion: 'test',
    robots: 'index,follow',
    alternateUrls: null,
    currentPathname: `/branchen/webdesign-${slug}`,
    currentSearch: '',
    trackingContext: {},
    lng: 'de',
    cssAsset: (assetPath) => `/${assetPath}`,
    asset: (assetPath) => `/${assetPath}?v=test`,
    jsAsset: (assetPath) => `/${assetPath}?v=test`,
    escapeJsonForHtml,
    safeUrl,
    sanitizeHtml,
    footerNavigation,
    headerCta,
    headerNavigation,
    industry: {
      slug,
      name: isFlowerShop ? 'Blumenladen' : 'Restaurant',
      hero_h1: isFlowerShop ? 'Webdesign für Blumenläden' : 'Webdesign für Restaurants',
      hero_h2: '',
      hero_checks: [],
      carousel_items: [],
      stats_cards: [],
      seo_items: [],
      funktionen_items: [],
      tipps_items: [],
      faq_items: [],
      vorteile: { pros: [], cons: [] },
      blocks: [],
      cta_headline: '',
      cta_text: ''
    },
    industryContextLinks: [],
    industryCommercialGuide: getIndustryCommercialGuide(slug),
    industryPrimaryCta: getIndustryPrimaryCta(slug),
    industryPricingCta: getIndustryPrimaryCta(slug, { placement: 'pricing' }),
    packages: [],
    jsonLd: []
  };
}

test('industry template uses dynamic, page-specific CTA and current-year pricing copy', () => {
  assert.match(template, /industry\.cta_headline/);
  assert.match(template, /new Date\(\)\.getFullYear\(\)/);
  assert.doesNotMatch(template, /professionelle <%= industry\.name %> Website 2025/);
  assert.doesNotMatch(template, /individual1|bereate|erh[aä]lst du/);
});

test('industry template keeps stat card labels below the section heading level', () => {
  assert.match(template, /<h3 class="itemLabel"><%- safeHtml\(c\.label\) %><\/h3>/);
  assert.doesNotMatch(template, /<h2 class="itemLabel"><%- c\.label %><\/h2>/);
});

test('industry template avoids wrapping trusted HTML fields in nested paragraphs', () => {
  assert.match(template, /renderHtmlBlock/);
  assert.doesNotMatch(template, /<p><%- industry\.warum_upper %><\/p>/);
  assert.doesNotMatch(template, /<p><%- industry\.warum_lower %><\/p>/);
  assert.doesNotMatch(template, /<p><%- c\.body %><\/p>/);
  assert.doesNotMatch(template, /<p><%- f\.a %><\/p>/);
});

test('industry CTA uses current package images with readable package titles', () => {
  assert.match(template, /href="\/pakete\/start"[\s\S]+packageCtaImageTitle">Start-Paket/);
  assert.match(template, /src="\/images\/paket-start\.webp"/);
  assert.match(template, /href="\/pakete\/business"[\s\S]+packageCtaImageTitle">Business-Paket/);
  assert.match(template, /src="\/images\/paket-business\.webp"/);
  assert.doesNotMatch(template, /v17588135|BasisPaket|basis\.webp/);
});

test('industry template can use a page-specific primary next step', () => {
  assert.match(template, /primaryIndustryCta\.href/);
  assert.match(template, /primaryIndustryCta\.label/);
});

test('Branchenübersicht gruppiert nur vorhandene Seiten nach Nutzungssituation', () => {
  const groups = buildIndustryGroups([
    { slug: 'webdesign-fitnesscoach', name: 'Fitnesscoach', description: 'Termine gewinnen' },
    { slug: 'webdesign-reinigungsfirma', name: 'Reinigungsfirma', description: 'Lokale Aufträge' },
    { slug: 'webdesign-cafe', name: 'Café', description: 'Speisekarte und Besuch' },
    { slug: 'webdesign-immobilienmakler', name: 'Immobilienmakler', description: 'Beratung und Objekte' }
  ]);

  assert.deepEqual(groups.map((group) => group.title), [
    'Termine und Buchungen',
    'Lokale Dienstleistungen',
    'Gastronomie und Verkauf',
    'Beratung und Immobilien'
  ]);
  assert.equal(groups.flatMap((group) => group.items).length, 5);
  assert.ok(groups.flatMap((group) => group.items).every((item) => item.href.startsWith('/branchen/') || item.href === '/handwerker'));
  assert.ok(groups.flatMap((group) => group.items).every((item) => item.image?.src && item.image?.alt));
});

test('Blumenladen und Immobilienmakler verbinden Leistung und bestehenden Ratgeber', () => {
  assert.deepEqual(getIndustryContextLinks('webdesign-blumenladen'), [{
    label: 'SEO für Blumenläden im Blog',
    href: '/blog/seo-fuer-blumenladen'
  }]);
  assert.deepEqual(getIndustryContextLinks('webdesign-immobilienmakler'), [{
    label: 'Immobilienmakler-Website im Blog planen',
    href: '/blog/immobilienmakler-website-erstelle'
  }]);

  const flowerGuide = getIndustryCommercialGuide('blumenladen');
  const realEstateGuide = getIndustryCommercialGuide('webdesign-immobilienmakler');
  assert.deepEqual(flowerGuide.sections.map((section) => section.title), [
    'Produkte, Öffnungszeiten und lokale Auffindbarkeit',
    'Saisonale Angebote ohne Seitenchaos',
    'Anfrage, Vorbestellung oder Abholung',
    'Geeignete Paketgröße',
    'Local-SEO-Grundlagen für Blumenläden'
  ]);
  assert.deepEqual(realEstateGuide.sections.map((section) => section.title), [
    'Vertrauen und lokales Einsatzgebiet',
    'Leistungen für Verkäufer, Käufer und Vermieter',
    'Objektdarstellung und Kontaktwege',
    'Technische und rechtliche Abgrenzung',
    'Geeignete Paketgröße'
  ]);
  assert.match(template, /industryCommercialGuide/);
  assert.match(template, /industry-guide__media[\s\S]*alt="<%= renderedIndustryGuide\.image\.alt %>"/);
  assert.match(template, /class="industry-context-links"/);
  assert.doesNotMatch(template, /<nav aria-label="Passende Branchenartikel">/);
});

test('price CTA keeps the legacy contact action outside the Blumenladen package journey', () => {
  const blumenladenPricingCta = getIndustryPrimaryCta('blumenladen', { placement: 'pricing' });
  const restaurantPricingCta = getIndustryPrimaryCta('restaurant', { placement: 'pricing' });

  assert.equal(blumenladenPricingCta.href, '/pakete');
  assert.equal(blumenladenPricingCta.trackingName, 'blumenladen_pakete_ansehen');
  assert.equal(restaurantPricingCta.label, 'Kostenlose Einschätzung anfragen');
  assert.equal(restaurantPricingCta.href, '/kontakt');
  assert.equal(restaurantPricingCta.trackingName, 'pricing_contact');
  assert.match(template, /resolvedIndustryPricingCta\.href/);
  assert.match(template, /resolvedIndustryPricingCta\.trackingName/);
});

test('Standard-Branchenseite rendert den Preis-CTA vollständig mit EJS', async () => {
  const html = await ejs.renderFile(viewPath, buildIndustryRenderLocals('restaurant'));

  assert.match(html, /href="\/kontakt" class="primaryColor"/);
  assert.match(html, /data-cta-name="pricing_contact"/);
  assert.match(html, />Kostenlose Einschätzung anfragen<\/a>/);
});

test('Blumenladen-Branchenseite rendert den Paket-CTA vollständig mit EJS', async () => {
  const html = await ejs.renderFile(viewPath, buildIndustryRenderLocals('blumenladen'));

  assert.match(html, /href="\/pakete" class="primaryColor"/);
  assert.match(html, /data-cta-name="blumenladen_pakete_ansehen"/);
  assert.match(html, />Pakete ansehen<\/a>/);
});

test('industry CTA package images rotate toward the opposite side', () => {
  assert.match(template, /class="imageCTALeft animate-on-scroll-right"/);
  assert.match(template, /class="imageCTARight animate-on-scroll-left"/);
  assert.match(branchenCss, /\.animate-on-scroll-right\.visible\s*\{[\s\S]*?transform:\s*translateX\(50%\)\s+translateY\(-50%\)\s+rotateZ\(15deg\)\s*!important;/);
  assert.match(branchenCss, /\.animate-on-scroll-left\.visible\s*\{[\s\S]*?transform:\s*translateX\(-50%\)\s+translateY\(-50%\)\s+rotateZ\(-15deg\)\s*!important;/);
  assert.match(branchenCss, /\.imageCTALeft,\s*\.imageCTARight\s*\{[\s\S]*?transform-origin:\s*bottom right;/);
  assert.match(branchenCss, /\.imageCTALeft:hover\s*\{[\s\S]*?transform:\s*translateX\(50%\)\s+translateY\(-40%\)\s+rotateZ\(0deg\)\s*!important;/);
  assert.match(branchenCss, /\.imageCTARight:hover\s*\{[\s\S]*?transform:\s*translateX\(-50%\)\s+translateY\(-40%\)\s+rotateZ\(0deg\)\s*!important;/);
  assert.match(branchenCss, /@media\s*\(max-width:\s*470px\)[\s\S]*?\.animate-on-scroll-left\.visible\s*\{[\s\S]*?rotateZ\(-15deg\)\s*!important/);
  assert.match(branchenCss, /@media\s*\(max-width:\s*470px\)[\s\S]*?\.animate-on-scroll-right\.visible\s*\{[\s\S]*?rotateZ\(15deg\)\s*!important/);
});
