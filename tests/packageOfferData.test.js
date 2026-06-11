import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PACKAGE_GLOBAL_NOTES,
  budgetOptions,
  getPackageBySlug,
  optionalFeatureOptions,
  packageComparisonRows,
  packageOptionsForForm,
  packageRedirects,
  packageSeoMeta,
  packages,
  projectTypeOptions
} from '../data/packages.js';
import { addOns } from '../data/addOns.js';
import { ctas } from '../data/ctas.js';
import { packageFaqs } from '../data/faqs.js';
import { maintenancePlans } from '../data/maintenancePlans.js';

test('canonical package data exposes the four new offer tiers without legacy active packages', () => {
  assert.deepEqual(packages.map((pkg) => pkg.id), [
    'start',
    'business',
    'wachstum',
    'individuell'
  ]);
  assert.deepEqual(packages.map((pkg) => pkg.slug), [
    'start',
    'business',
    'wachstum',
    'individuell'
  ]);
  assert.deepEqual(packages.map((pkg) => pkg.canonicalPath), [
    '/pakete/start',
    '/pakete/business',
    '/pakete/wachstum',
    '/pakete/individuell'
  ]);
  assert.deepEqual(packages.map((pkg) => pkg.priceFrom), [799, 1499, 2499, 3500]);
  assert.deepEqual(packages.map((pkg) => pkg.image), [
    'paket-start.webp',
    'paket-business.webp',
    'paket-wachstum.webp',
    'paket-individuell.webp'
  ]);
  assert.equal(getPackageBySlug('business').priceLabel, 'ab 1.499 €');
  assert.equal(getPackageBySlug('premium'), null);
  assert.equal(getPackageBySlug('basis'), null);
  assert.deepEqual(packageRedirects, [
    { from: '/pakete/basis', to: '/pakete/start' },
    { from: '/pakete/premium', to: '/pakete/wachstum' }
  ]);
});

test('package comparison and form options are prepared for later EJS rendering', () => {
  assert.deepEqual(packageComparisonRows.map((row) => row.id), [
    'price',
    'targetGroup',
    'pageScope',
    'textSupport',
    'seoScope',
    'technicalImplementation',
    'feedbackRounds',
    'contactOption',
    'localSeoFoundation',
    'relaunchSuitable',
    'specialFeatures',
    'runningCosts',
    'bestFor'
  ]);

  const priceRow = packageComparisonRows.find((row) => row.id === 'price');
  assert.equal(priceRow.values.start, 'ab 799 €');
  assert.equal(priceRow.values.business, 'ab 1.499 €');
  assert.equal(priceRow.values.wachstum, 'ab 2.499 €');
  assert.equal(priceRow.values.individuell, 'ab 3.500 € oder nach Aufwand');

  assert.deepEqual(packageOptionsForForm.map((option) => option.value), [
    'start',
    'business',
    'wachstum',
    'individuell',
    'unsure'
  ]);
  assert.deepEqual(budgetOptions.map((option) => option.value), [
    '799-1499',
    '1500-2499',
    '2500-4000',
    '4000-plus',
    'open'
  ]);
  assert.ok(projectTypeOptions.some((option) => option.value === 'audit'));
  assert.ok(projectTypeOptions.some((option) => option.value === 'custom-feature'));
  assert.ok(optionalFeatureOptions.some((option) => option.value === 'booking-system'));
  assert.ok(optionalFeatureOptions.some((option) => option.value === 'shop-feature'));
});

test('supporting offer data keeps add-ons, maintenance, SEO metadata, FAQs and CTAs reusable', () => {
  assert.ok(addOns.length >= 18);
  assert.ok(addOns.every((item) => item.notIncludedInPackages === true));
  assert.deepEqual(maintenancePlans.map((plan) => plan.priceFrom), [39, 79, 129]);
  assert.equal(packageSeoMeta['/pakete/start'].title, 'Start-Paket Webdesign ab 799 € | Berlin');
  assert.equal(ctas.startPackage.url, '/kontakt?paket=start');
  assert.ok(packageFaqs.some((faq) => faq.id === 'start-rechtstexte' && faq.schemaEligible));
  assert.match(PACKAGE_GLOBAL_NOTES.legalNote, /keine Rechtsberatung/);
  assert.match(PACKAGE_GLOBAL_NOTES.seoNote, /nicht garantiert/);
});

test('supporting offer labels do not reuse retired or package-specific prices', () => {
  const labels = [
    ...addOns.map((item) => item.priceLabel),
    ...maintenancePlans.map((plan) => plan.priceLabel),
    ...budgetOptions.map((option) => option.label)
  ];
  const addOnAndMaintenanceLabels = [
    ...addOns.map((item) => item.priceLabel),
    ...maintenancePlans.map((plan) => plan.priceLabel)
  ];

  assert.deepEqual(labels.filter((label) => /(?:^|[^.\d])(499|899)\s*€/.test(label)), []);
  assert.deepEqual(addOnAndMaintenanceLabels.filter((label) => /(?:^|[^–\d])1\.499\s*€/.test(label)), []);
  assert.deepEqual(labels.filter((label) => /ab\s*5\s*€|Wartung ab 5/i.test(label)), []);
});

test('package offer copy does not expose retired page-count or included-feature promises', () => {
  const publicOfferData = JSON.stringify({ packages, packageFaqs });

  assert.doesNotMatch(publicOfferData, /bis zu\s*(?:20|25)\s*Seiten|20 oder 25 Seiten/i);
  assert.doesNotMatch(publicOfferData, /Buchungssystem\s+(?:inklusive|enthalten|im Paket enthalten)/i);
  assert.doesNotMatch(publicOfferData, /Shop\s+optional/i);
  assert.doesNotMatch(publicOfferData, /CMS\s+(?:inklusive|enthalten)/i);
  assert.doesNotMatch(publicOfferData, /rechtssicher|rechtlich abgesichert|DSGVO-konform/i);
  assert.doesNotMatch(publicOfferData, /Ranking garantiert|garantiert mehr Kunden|alles inklusive|keine versteckten Kosten/i);
});

test('legacy package URLs are explicit 301 redirect routes before dynamic package routes', () => {
  const source = readFileSync(new URL('../routes/packages.js', import.meta.url), 'utf8');
  const basisRouteIndex = source.indexOf("router.get('/pakete/basis'");
  const premiumRouteIndex = source.indexOf("router.get('/pakete/premium'");
  const dynamicRouteIndex = source.indexOf("router.get('/pakete/:slug'");

  assert.ok(basisRouteIndex !== -1, 'missing explicit /pakete/basis redirect route');
  assert.ok(premiumRouteIndex !== -1, 'missing explicit /pakete/premium redirect route');
  assert.ok(dynamicRouteIndex !== -1, 'missing dynamic package detail route');
  assert.ok(basisRouteIndex < dynamicRouteIndex, '/pakete/basis redirect must be before /pakete/:slug');
  assert.ok(premiumRouteIndex < dynamicRouteIndex, '/pakete/premium redirect must be before /pakete/:slug');
  assert.match(source, /res\.redirect\(301,\s*`\$\{req\.baseUrl\s*===\s*['"]\/en['"]/);
});
