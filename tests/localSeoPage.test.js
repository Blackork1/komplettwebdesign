import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { getAddOnById } from '../data/addOns.js';
import { localSeoPage } from '../data/localSeoPage.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';

const templateUrl = new URL('../views/static/local-seo-berlin.ejs', import.meta.url);
const routeSource = readFileSync(new URL('../routes/staticPages.js', import.meta.url), 'utf8');
const templateSource = existsSync(templateUrl) ? readFileSync(templateUrl, 'utf8') : '';
const pageText = JSON.stringify(localSeoPage);

function collectText(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, out));
    return out;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectText(item, out));
  }

  return out;
}

test('local SEO page exposes canonical URL, SEO metadata, hero and requested section model', () => {
  assert.equal(localSeoPage.slug, 'local-seo');
  assert.equal(localSeoPage.canonicalPath, '/leistungen/local-seo');
  assert.equal(localSeoPage.title, 'Local SEO Berlin | Lokale Sichtbarkeit verbessern');
  assert.equal(
    localSeoPage.description,
    'Local SEO für kleine Unternehmen in Berlin: technische SEO-Grundlagen, Google Business Profile, lokale Seitenstruktur und klare Optimierung ohne Ranking-Garantie.'
  );
  assert.equal(localSeoPage.h1, 'Local SEO Berlin für kleine Unternehmen');
  assert.equal(localSeoPage.primaryKeyword, 'Local SEO Berlin');
  assert.equal(localSeoPage.hero.primaryCta.url, '/kontakt?projektart=local-seo');
  assert.equal(localSeoPage.hero.secondaryCta.url, '/website-tester');

  assert.deepEqual(localSeoPage.sections, [
    'hero',
    'intro',
    'targetGroups',
    'localSeoMeaning',
    'technicalFoundation',
    'googleBusinessProfile',
    'localLandingPages',
    'structuredData',
    'trustSignals',
    'limitations',
    'packageConnection',
    'pricing',
    'process',
    'seoBoundary',
    'faq',
    'cta',
    'finalCta'
  ]);
});

test('local SEO page uses central add-on pricing and separates Local SEO from packages', () => {
  assert.deepEqual(
    localSeoPage.pricing.addOns.map((item) => [item.id, item.priceLabel]),
    [
      ['local-seo-basis', getAddOnById('local-seo-basis').priceLabel],
      ['google-business-profil', getAddOnById('google-business-profil').priceLabel],
      ['seo-leistungsseite', getAddOnById('seo-leistungsseite').priceLabel]
    ]
  );
  assert.match(pageText, /Local SEO ist nicht automatisch kostenloser Bestandteil jedes Website-Pakets/);
  assert.match(pageText, /Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer/);
  assert.match(pageText, /Drittanbieter-Tools/);
  assert.deepEqual(
    localSeoPage.packageConnection.packages.map((pkg) => [pkg.name, pkg.priceLabel, pkg.path]),
    [
      ['Start', '{{price.start}}', '/pakete/start'],
      ['Business', '{{price.business}}', '/pakete/business'],
      ['Wachstum', '{{price.wachstum}}', '/pakete/wachstum'],
      ['Individuell', '{{price.individuell}}', '/pakete/individuell']
    ]
  );
  assert.match(routeSource, /buildLocalSeoPage/);
  assert.match(routeSource, /interpolatePricingTokens/);
});

test('local SEO page avoids prohibited ranking, review, legal and cost promises', () => {
  const text = collectText(localSeoPage).join('\n');
  const forbiddenPatterns = [
    /Ranking garantiert/i,
    /Platz 1/i,
    /Google-Garantie/i,
    /garantiert mehr Kunden/i,
    /garantiert mehr Anfragen/i,
    /SEO-Garantie/i,
    /Local SEO Garantie/i,
    /Bewertungen kaufen/i,
    /DSGVO-konform/i,
    /rechtssicher/i,
    /rechtlich abgesichert/i,
    /alles inklusive/i,
    /keine versteckten Kosten/i
  ];

  forbiddenPatterns.forEach((pattern) => {
    assert.doesNotMatch(text, pattern);
  });

  assert.match(text, /keine Zusage für Google-Maps-Positionen/i);
  assert.match(text, /keine erfundenen Bewertungen oder manipulierte Bewertungsprozesse/i);
  assert.match(text, /Bestimmte Platzierungen, Anfragen oder Umsätze können nicht zugesagt werden/i);
});

test('local SEO FAQ, internal links, route, template and sitemap are wired safely', () => {
  assert.equal(localSeoPage.faq.length, 18);
  assert.ok(localSeoPage.faq.every((item) => item.question && item.answer));

  const links = new Set([
    ...localSeoPage.internalLinks.map((link) => link.href),
    localSeoPage.hero.primaryCta.url,
    localSeoPage.hero.secondaryCta.url,
    localSeoPage.cta.primary.url,
    localSeoPage.cta.secondary.url,
    localSeoPage.finalCta.primary.url,
    localSeoPage.finalCta.secondary.url
  ]);

  [
    '/webdesign-berlin',
    '/pakete',
    '/leistungen/zusatzleistungen-webdesign',
    '/website-tester',
    '/leistungen/website-relaunch',
    '/kontakt?projektart=local-seo',
    '/leistungen/laufende-kosten-website'
  ].forEach((href) => assert.equal(links.has(href), true, `${href} fehlt`));
  assert.equal(links.has('/website-audit'), false, '/website-audit ist lokal keine Canonical-URL');

  assert.match(routeSource, /router\.get\('\/local-seo-berlin'/);
  assert.match(routeSource, /router\.get\('\/leistungen\/local-seo'/);
  assert.match(templateSource, /local-seo-page/);
  assert.match(templateSource, /FAQPage/);
  assert.match(templateSource, /BreadcrumbList/);
  assert.match(templateSource, /['"]@type['"]:\s*['"]Service['"]/);
  assert.doesNotMatch(templateSource, /AggregateRating|OfferCatalog|openingHours|priceSpecification/);
  assert.match(templateSource, /page\.faq\.forEach/);
  assert.ok(
    INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/leistungen/local-seo'),
    'local SEO page missing from sitemap policy'
  );
});
