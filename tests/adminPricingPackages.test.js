import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { __testables } from '../controllers/adminPricingController.js';

const routeSource = fs.readFileSync(new URL('../routes/adminPricingRoutes.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const controllerSource = fs.readFileSync(new URL('../controllers/adminPricingController.js', import.meta.url), 'utf8');
const listView = fs.readFileSync(new URL('../views/admin/pricing_packages_list.ejs', import.meta.url), 'utf8');
const formView = fs.readFileSync(new URL('../views/admin/pricing_package_form.ejs', import.meta.url), 'utf8');
const adminHeader = fs.readFileSync(new URL('../views/partials/admin_header.ejs', import.meta.url), 'utf8');

function readAdminView(path) {
  return fs.readFileSync(new URL(`../views/admin/${path}`, import.meta.url), 'utf8');
}

test('admin pricing routes are admin-only and protect every write action with CSRF', () => {
  assert.match(routeSource, /import \{ isAdmin \}/);
  assert.match(routeSource, /import \{ verifyCsrfToken \}/);
  assert.match(routeSource, /router\.get\('\/admin\/pricing\/packages',\s*isAdmin/);
  assert.match(routeSource, /router\.get\('\/admin\/pricing\/packages\/new',\s*isAdmin/);

  const writeRoutes = [
    /router\.post\('\/admin\/pricing\/packages',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/reorder',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/:id',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/:id\/archive',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/:id\/restore',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/:id\/toggle-visibility',\s*isAdmin,\s*verifyCsrfToken/
  ];

  for (const pattern of writeRoutes) {
    assert.match(routeSource, pattern);
  }

  assert.doesNotMatch(routeSource, /router\.get\([^)]*archive/);
  assert.doesNotMatch(routeSource, /router\.get\([^)]*restore/);
  assert.doesNotMatch(routeSource, /router\.get\([^)]*toggle-visibility/);

  assert.ok(
    appSource.indexOf('app.use(adminPricingRoutes)') > -1
      && appSource.indexOf('app.use(adminPricingRoutes)') < appSource.indexOf('app.use(slugRoutes)'),
    'admin pricing routes must be mounted before the slug fallback route'
  );
});

test('admin pricing controller writes through the central pricing service', () => {
  const serviceCalls = [
    'adminListPackages',
    'adminGetPackage',
    'adminCreatePackage',
    'adminUpdatePackage',
    'adminArchivePackage',
    'adminRestorePackage',
    'adminToggleVisibility',
    'adminUpdateSortOrder'
  ];

  for (const call of serviceCalls) {
    assert.match(controllerSource, new RegExp(`pricingService\\.${call}\\(`));
  }

  assert.doesNotMatch(controllerSource, /DELETE\s+FROM\s+pricing_packages/i);
  assert.match(controllerSource, /err\.message/);
  assert.doesNotMatch(controllerSource, /err\.stack/);
});

test('package form body normalizes price, booleans and admin fields for the service layer', () => {
  const payload = __testables.normalizePackageFormBody({
    package_key: 'business',
    name: 'Business',
    display_name: 'Business-Paket',
    slug: 'business',
    canonical_path: '/pakete/business',
    sort_order: '2',
    price_amount_euro: '1.499',
    price_currency: 'EUR',
    price_prefix: 'ab',
    price_type: 'from',
    is_active: 'on',
    is_visible: 'on',
    show_in_contact_form: 'on',
    show_in_comparison: 'on',
    allow_detail_page: 'on',
    admin_note: 'Nur intern'
  });

  assert.equal(payload.packageKey, 'business');
  assert.equal(payload.priceAmountCents, 149900);
  assert.equal(payload.sortOrder, 2);
  assert.equal(payload.isActive, true);
  assert.equal(payload.isVisible, true);
  assert.equal(payload.showInContactForm, true);
  assert.equal(payload.showInComparison, true);
  assert.equal(payload.allowDetailPage, true);
  assert.equal(payload.adminNote, 'Nur intern');
});

test('package validation rejects unsafe slugs, paths and CTA URLs', () => {
  const payload = __testables.normalizePackageFormBody({
    package_key: 'Bad Key',
    name: 'Test',
    display_name: 'Test',
    slug: '../bad',
    canonical_path: 'pakete/test',
    sort_order: 'abc',
    price_amount_euro: '-1',
    price_currency: 'EURO',
    price_type: 'from',
    cta_url: 'javascript:alert(1)'
  });

  const result = __testables.validatePackagePayload(payload);

  assert.ok(result.errors.some((error) => error.includes('Paket-Key')));
  assert.ok(result.errors.some((error) => error.includes('Slug')));
  assert.ok(result.errors.some((error) => error.includes('Canonical')));
  assert.ok(result.errors.some((error) => error.includes('Sortierung')));
  assert.ok(result.errors.some((error) => error.includes('Preis')));
  assert.ok(result.errors.some((error) => error.includes('CTA')));
});

test('package validation warns about retired pricing and risky public claims', () => {
  const payload = __testables.normalizePackageFormBody({
    package_key: 'start',
    name: 'Basis',
    display_name: 'Basis ab 499 €',
    slug: 'start',
    canonical_path: '/pakete/start',
    sort_order: '1',
    price_amount_euro: '799',
    price_currency: 'EUR',
    price_type: 'from',
    short_description: 'DSGVO-konform, rechtssicher und keine versteckten Kosten.'
  });

  const result = __testables.validatePackagePayload(payload);

  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some((warning) => warning.includes('499')));
  assert.ok(result.warnings.some((warning) => warning.includes('Basis')));
  assert.ok(result.warnings.some((warning) => warning.includes('DSGVO-konform')));
  assert.ok(result.warnings.some((warning) => warning.includes('rechtssicher')));
  assert.equal(__testables.warningConfirmationRequired({ body: {} }, result.warnings), true);
  assert.deepEqual(
    __testables.warningConfirmationErrors(result.warnings),
    ['Bitte prüfe die Warnhinweise und bestätige sie, bevor du dieses Paket speicherst.']
  );
});

test('admin pricing views expose package management fields without raw HTML output', () => {
  assert.match(adminHeader, /Pakete &amp; Preise|Pakete & Preise/);
  assert.match(listView, /Pakete &amp; Preise|Pakete & Preise/);
  assert.match(listView, /name="package_ids\[\]"/);
  assert.match(listView, /name="sort_orders\[\]"/);
  assert.match(listView, /name="_csrf"/);
  assert.match(listView, /toggle-visibility/);
  assert.match(listView, /archive/);
  assert.match(listView, /restore/);

  const fields = [
    'package_key',
    'name',
    'display_name',
    'slug',
    'canonical_path',
    'price_amount_euro',
    'price_currency',
    'price_prefix',
    'price_suffix',
    'price_label_override',
    'price_type',
    'vat_note',
    'short_description',
    'long_description',
    'positioning',
    'target_group',
    'not_for',
    'page_scope',
    'text_scope',
    'seo_scope',
    'tech_scope',
    'feedback_rounds',
    'timeline',
    'cta_label',
    'cta_url',
    'secondary_cta_label',
    'secondary_cta_url',
    'meta_title',
    'meta_description',
    'h1',
    'schema_type',
    'admin_note'
  ];

  for (const field of fields) {
    assert.match(formView, new RegExp(`name="${field}"`));
  }

  assert.match(formView, /name="_csrf"/);
  assert.match(formView, /name="confirm_warnings"/);
  assert.doesNotMatch(formView, /<%-\s*row\./);
});

test('admin pricing DB-5 routes expose protected content subareas', () => {
  const readRoutes = [
    /router\.get\('\/admin\/pricing\/packages\/:id\/content',\s*isAdmin/,
    /router\.get\('\/admin\/pricing\/comparison',\s*isAdmin/,
    /router\.get\('\/admin\/pricing\/notes',\s*isAdmin/,
    /router\.get\('\/admin\/pricing\/redirects',\s*isAdmin/
  ];

  for (const pattern of readRoutes) {
    assert.match(routeSource, pattern);
  }

  const writeRoutes = [
    /router\.post\('\/admin\/pricing\/packages\/:id\/features',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/features\/:featureId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/features\/:featureId\/delete',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/:id\/not-included',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/not-included\/:itemId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/not-included\/:itemId\/delete',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/:id\/use-cases',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/use-cases\/:useCaseId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/use-cases\/:useCaseId\/delete',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/packages\/:id\/faqs',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/faqs\/:faqId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/faqs\/:faqId\/delete',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/comparison\/rows',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/comparison\/rows\/:rowId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/comparison\/values',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/notes\/:noteId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/redirects',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/redirects\/:redirectId',\s*isAdmin,\s*verifyCsrfToken/
  ];

  for (const pattern of writeRoutes) {
    assert.match(routeSource, pattern);
  }

  assert.doesNotMatch(routeSource, /router\.get\([^)]*(delete|features|not-included|use-cases|faqs|notes|redirects)[^)]*,\s*isAdmin,\s*verifyCsrfToken/);
});

test('admin pricing DB-5 controller writes subareas through service and keeps audit-backed methods centralized', () => {
  const serviceCalls = [
    'adminListPackageContent',
    'adminAddFeature',
    'adminUpdateFeature',
    'adminDeleteFeature',
    'adminAddNotIncluded',
    'adminUpdateNotIncluded',
    'adminDeleteNotIncluded',
    'adminAddUseCase',
    'adminUpdateUseCase',
    'adminDeleteUseCase',
    'adminAddFaq',
    'adminUpdateFaq',
    'adminDeleteFaq',
    'adminListComparisonAdmin',
    'adminAddComparisonRow',
    'adminUpdateComparisonRow',
    'adminUpsertComparisonValue',
    'adminListGlobalNotes',
    'adminUpdateGlobalNote',
    'adminListRedirects',
    'adminCreateRedirect',
    'adminUpdateRedirect'
  ];

  for (const call of serviceCalls) {
    assert.match(controllerSource, new RegExp(`pricingService\\.${call}\\(`));
  }

  assert.match(controllerSource, /Buchungssystem inklusive/);
  assert.match(controllerSource, /unbegrenzte Änderungen/);
  assert.match(controllerSource, /javascript:/i);
  assert.doesNotMatch(controllerSource, /err\.stack/);
});

test('admin pricing DB-5 validation warns about risky included promises and blocks unsafe redirects', () => {
  assert.ok(
    __testables.buildRiskWarnings({ shortDescription: 'Buchungssystem inklusive und unbegrenzte Änderungen.' })
      .some((warning) => warning.includes('Buchungssystem inklusive'))
  );

  const badRedirect = __testables.validateRedirectPayload({
    oldPath: '/pakete/alt',
    targetPath: 'javascript:alert(1)',
    statusCode: 301,
    packageId: 1
  });

  assert.ok(badRedirect.errors.some((error) => error.includes('Zielpfad')));

  const tooFastTicker = __testables.validateGlobalNotePayload({
    noteKey: 'addons_ticker_duration_seconds',
    title: 'Add-ons-Ticker-Laufzeit',
    body: '4',
    context: 'package_detail_addons_config',
    sortOrder: 0
  });
  assert.ok(tooFastTicker.errors.some((error) => error.includes('Add-ons-Ticker-Laufzeit')));

  const validTicker = __testables.validateGlobalNotePayload({
    noteKey: 'addons_ticker_duration_seconds',
    title: 'Add-ons-Ticker-Laufzeit',
    body: '35',
    context: 'package_detail_addons_config',
    sortOrder: 0
  });
  assert.equal(validTicker.errors.length, 0);
});

test('admin pricing DB-5 views expose content subareas without raw data output', () => {
  const contentView = readAdminView('pricing_package_content.ejs');
  const comparisonView = readAdminView('pricing_comparison.ejs');
  const notesView = readAdminView('pricing_notes.ejs');
  const redirectsView = readAdminView('pricing_redirects.ejs');

  assert.match(listView, /Inhalte/);
  assert.match(contentView, /Enthaltene Leistungen/);
  assert.match(contentView, /Nicht enthaltene Leistungen/);
  assert.match(contentView, /Einsatzfälle/);
  assert.match(contentView, /Paket-FAQ/);
  assert.match(contentView, /name="feature_text"/);
  assert.match(contentView, /name="item_text"/);
  assert.match(contentView, /name="use_case_text"/);
  assert.match(contentView, /name="question"/);
  assert.match(contentView, /name="answer"/);
  assert.match(comparisonView, /Paketvergleich/);
  assert.match(comparisonView, /name="row_key"/);
  assert.match(comparisonView, /name="value"/);
  assert.match(notesView, /Globale Hinweise/);
  assert.match(notesView, /Diese Hinweise erscheinen öffentlich/);
  assert.match(notesView, /addons_ticker_duration_seconds/);
  assert.match(notesView, /Laufzeit in Sekunden/);
  assert.match(notesView, /type="number"[\s\S]*?min="8"[\s\S]*?max="180"/);
  assert.match(redirectsView, /Paket-Redirects/);
  assert.match(redirectsView, /URL-Änderungen/);

  for (const view of [contentView, comparisonView, notesView, redirectsView]) {
    assert.match(view, /name="_csrf"/);
    assert.doesNotMatch(view, /<%-\s*(feature|item|useCase|faq|row|value|note|redirect|pkg)\./);
  }
});
