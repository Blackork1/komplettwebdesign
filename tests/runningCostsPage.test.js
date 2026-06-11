import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { runningCostsPage } from '../data/runningCostsPage.js';
import { ctas } from '../data/ctas.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';

const routeSource = readFileSync(new URL('../routes/staticPages.js', import.meta.url), 'utf8');
const templateSource = readFileSync(new URL('../views/static/laufende-kosten-website.ejs', import.meta.url), 'utf8');
const pageText = JSON.stringify(runningCostsPage);

test('running costs page has canonical URL, SEO metadata and required content blocks', () => {
  assert.equal(runningCostsPage.slug, 'laufende-kosten-website');
  assert.equal(runningCostsPage.canonicalPath, '/leistungen/laufende-kosten-website');
  assert.equal(runningCostsPage.h1, 'Laufende Website-Kosten nach dem Launch');
  assert.match(runningCostsPage.title, /Laufende Website-Kosten/i);
  assert.match(runningCostsPage.description, /Hosting, Domain, E-Mail, Wartung, Tools und Drittanbieter/i);

  const requiredSectionIds = [
    'intro',
    'one-time-vs-running',
    'cost-overview',
    'hosting',
    'domain',
    'email',
    'maintenance',
    'backups-monitoring',
    'third-party-tools',
    'consent-tools',
    'booking-tools',
    'newsletter-tools',
    'payment-providers',
    'tracking',
    'handled-by-komplettwebdesign',
    'handled-by-client',
    'examples',
    'not-included',
    'legal-notes',
    'faq'
  ];

  assert.deepEqual(
    requiredSectionIds.filter((id) => !runningCostsPage.sections.some((section) => section.id === id)),
    []
  );
});

test('running costs copy separates project, hosting, domain, email, maintenance and third-party costs safely', () => {
  [
    'Der Website-Paketpreis deckt die Erstellung im vereinbarten Umfang ab.',
    'Hosting ist nicht automatisch in jedem Website-Paket enthalten.',
    'Domainkosten hängen vom Anbieter und der Domainendung ab.',
    'E-Mail-Postfächer sind ein eigener Dienst.',
    'Wartung ist optional und wird separat vereinbart.',
    'Drittanbieter-Kosten sind nicht automatisch im Website-Paket enthalten.',
    'Die Angaben dienen zur Orientierung.'
  ].forEach((snippet) => assert.match(pageText, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));

  assert.ok(runningCostsPage.examples.length >= 4);
  assert.ok(runningCostsPage.faq.length >= 20);
});

test('running costs page avoids legacy prices, guarantee language and false all-inclusive claims', () => {
  assert.doesNotMatch(pageText, /(?:^|[^.\d])(499|899)\s*€/);
  assert.doesNotMatch(pageText, /Wartung ab 5|ab\s*5\s*€|keine laufenden Kosten|keine monatlichen Kosten/i);
  assert.doesNotMatch(pageText, /Hosting inklusive|Wartung inklusive|Domain inklusive|E-Mail inklusive|alles inklusive|keine versteckten Kosten/i);
  assert.doesNotMatch(pageText, /rechtssicher|rechtlich abgesichert|rechtskonform|abmahnsicher|DSGVO-konform/i);
  assert.doesNotMatch(pageText, /Ranking garantiert|garantiert mehr Kunden|100 % sicher|garantiert erreichbar|24\/7-Support/i);
});

test('running costs route, template, CTA and sitemap policy are wired to the canonical URL', () => {
  assert.match(routeSource, /router\.get\('\/laufende-kosten-website'/);
  assert.match(routeSource, /router\.get\('\/leistungen\/laufende-kosten-website'/);
  assert.match(templateSource, /running-costs-page/);
  assert.match(templateSource, /FAQPage/);
  assert.match(templateSource, /BreadcrumbList/);
  assert.match(templateSource, /<h1 class="home-hero-reveal home-hero-reveal--h1 animate-on-scroll"><%=\s*page\.h1\s*%><\/h1>/);
  assert.doesNotMatch(templateSource, /running-costs-btn/);
  assert.match(templateSource, /class="btn btn-secondary"/);
  assert.equal(ctas.runningCosts.url, '/leistungen/laufende-kosten-website');
  assert.ok(
    INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/leistungen/laufende-kosten-website'),
    'running costs page missing from sitemap policy'
  );
});
