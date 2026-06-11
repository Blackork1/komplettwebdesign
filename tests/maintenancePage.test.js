import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { ctas } from '../data/ctas.js';
import { maintenancePlans } from '../data/maintenancePlans.js';
import { footerNavigation } from '../data/siteNavigation.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';

const pageModuleUrl = new URL('../data/maintenancePage.js', import.meta.url);
const templateUrl = new URL('../views/static/website-wartung-berlin.ejs', import.meta.url);
const routeSource = readFileSync(new URL('../routes/staticPages.js', import.meta.url), 'utf8');
const runningCostsSource = readFileSync(new URL('../data/runningCostsPage.js', import.meta.url), 'utf8');
const templateSource = existsSync(templateUrl) ? readFileSync(templateUrl, 'utf8') : '';
const maintenancePage = existsSync(pageModuleUrl) ? (await import(pageModuleUrl)).maintenancePage : null;
const pageText = JSON.stringify(maintenancePage || {});
const footerHrefs = footerNavigation.flatMap((column) => (column.links || []).map((link) => link.href));

test('maintenance page exposes canonical URL, SEO metadata and required sections', () => {
  assert.ok(maintenancePage, 'missing maintenancePage data module');
  assert.equal(maintenancePage.slug, 'website-wartung');
  assert.equal(maintenancePage.canonicalPath, '/leistungen/website-wartung');
  assert.equal(maintenancePage.title, 'Website Wartung Berlin | Support, Backups & Pflege');
  assert.equal(maintenancePage.h1, 'Website-Wartung und Support in Berlin');
  assert.match(maintenancePage.description, /Backups, Monitoring, Sicherheitschecks/i);

  const requiredSectionIds = [
    'hero',
    'intro',
    'whyMaintenance',
    'hostingVsMaintenance',
    'plans',
    'planComparison',
    'included',
    'notIncluded',
    'backups',
    'monitoring',
    'securityChecks',
    'contentChanges',
    'technicalSupport',
    'emergencyHelp',
    'responseTimes',
    'thirdPartyTools',
    'cancellation',
    'targetGroups',
    'hourlySupport',
    'faq',
    'cta',
    'finalCta'
  ];

  assert.deepEqual(
    requiredSectionIds.filter((id) => !maintenancePage.sections.some((section) => section.id === id)),
    []
  );
});

test('maintenance page uses central maintenance plans with current prices and scoped support wording', () => {
  assert.ok(maintenancePage, 'missing maintenancePage data module');
  assert.deepEqual(maintenancePage.plans.map((plan) => plan.id), maintenancePlans.map((plan) => plan.id));
  assert.deepEqual(maintenancePlans.map((plan) => plan.priceFrom), [39, 79, 129]);
  assert.ok(maintenancePlans.every((plan) => plan.ctaUrl === '/kontakt?projektart=maintenance'));
  assert.ok(maintenancePlans.every((plan) => plan.targetGroup?.length));
  assert.ok(maintenancePlans.every((plan) => plan.emergencyNote && plan.thirdPartyNote));

  [
    'Hosting sorgt dafür, dass die Website technisch erreichbar ist. Wartung sorgt dafür, dass sie betreut, geprüft und bei Bedarf angepasst wird.',
    'Wartung reduziert technische Risiken, kann aber keine vollständige Sicherheit, ständige Verfügbarkeit oder schnelle Hilfe in jedem Fall zusagen.',
    'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    'Probleme mit externen Tools oder Anbietern können zusätzlichen Aufwand verursachen und sind nicht automatisch vollständig im Wartungspaket enthalten.'
  ].forEach((snippet) => assert.match(pageText, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
});

test('maintenance page avoids retired maintenance prices and unrealistic promises', () => {
  assert.doesNotMatch(pageText, /Wartung ab 5|5\s*€\/Monat|5\s*EUR\/Monat/i);
  assert.doesNotMatch(pageText, /Wartung inklusive|unbegrenzte Wartung|unbegrenzter Support|alle Änderungen inklusive/i);
  assert.doesNotMatch(pageText, /24\/7|sofortige Hilfe|immer erreichbar|100 % sicher|garantiert erreichbar|tägliche Backups garantiert/i);
  assert.doesNotMatch(pageText, /Hosting inklusive|keine laufenden Kosten|rechtssicher|DSGVO-konform/i);
});

test('maintenance FAQ, route, template, CTA, footer and sitemap are wired to the canonical page', () => {
  assert.ok(maintenancePage, 'missing maintenancePage data module');
  assert.ok(maintenancePage.faq.length >= 20);
  assert.ok(maintenancePage.faq.every((item) => item.question && item.answer));

  assert.match(routeSource, /router\.get\('\/website-wartung-berlin'/);
  assert.match(routeSource, /router\.get\('\/leistungen\/website-wartung'/);
  assert.match(templateSource, /maintenance-page/);
  assert.match(templateSource, /FAQPage/);
  assert.match(templateSource, /BreadcrumbList/);
  assert.match(templateSource, /Service/);
  assert.match(templateSource, /<h1 class="home-hero-reveal home-hero-reveal--h1 animate-on-scroll"><%=\s*page\.h1\s*%><\/h1>/);
  assert.equal(ctas.maintenanceRequest.url, '/kontakt?projektart=maintenance');
  assert.ok(
    INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/leistungen/website-wartung'),
    'maintenance page missing from sitemap policy'
  );
  assert.ok(footerHrefs.includes('/leistungen/website-wartung'));
  assert.match(runningCostsSource, /href:\s*'\/leistungen\/website-wartung'/);
});
