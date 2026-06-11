import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatCurrencyCents,
  formatPackageOptionLabel,
  getPriceLabel
} from '../util/priceFormatter.js';
import { mapPublicPackage } from '../util/packageMapper.js';
import { createPricingRepository } from '../repositories/pricingRepository.js';
import { createPricingService } from '../services/pricingService.js';

function createQueryRecorder(rowsByCall = []) {
  const calls = [];

  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      const nextRows = rowsByCall.shift() || [];
      return { rows: nextRows };
    }
  };
}

test('formats package prices from cents with German public labels', () => {
  assert.equal(formatCurrencyCents(79900, 'EUR'), '799 €');
  assert.equal(formatCurrencyCents(149900, 'EUR'), '1.499 €');
  assert.equal(formatCurrencyCents(249900, 'EUR'), '2.499 €');
  assert.equal(formatCurrencyCents(350000, 'EUR'), '3.500 €');

  assert.equal(getPriceLabel({
    priceAmountCents: 79900,
    priceCurrency: 'EUR',
    pricePrefix: 'ab'
  }), 'ab 799 €');
  assert.equal(getPriceLabel({
    priceAmountCents: 350000,
    priceCurrency: 'EUR',
    pricePrefix: 'ab',
    priceSuffix: 'oder nach Aufwand'
  }), 'ab 3.500 € oder nach Aufwand');
  assert.equal(getPriceLabel({
    priceAmountCents: 350000,
    priceLabelOverride: 'ab 3.500 € oder nach Aufwand'
  }), 'ab 3.500 € oder nach Aufwand');
  assert.equal(formatPackageOptionLabel({
    name: 'Business',
    priceAmountCents: 149900,
    priceCurrency: 'EUR',
    pricePrefix: 'ab'
  }), 'Business ab 1.499 €');
});

test('repository public package queries apply visibility and archive rules', async () => {
  const db = createQueryRecorder([
    [{ package_key: 'start', slug: 'start', price_amount_cents: 79900 }],
    [{ package_key: 'business', slug: 'business', price_amount_cents: 149900 }],
    [{ package_key: 'wachstum', slug: 'wachstum', price_amount_cents: 249900 }],
    [{ package_key: 'start', slug: 'start', price_amount_cents: 79900 }]
  ]);
  const repository = createPricingRepository(db);

  await repository.getVisiblePackages();
  await repository.getPackagesForContactForm();
  await repository.getPackagesForComparison();
  await repository.getPackageBySlug('start');

  assert.match(db.calls[0].sql, /is_active = TRUE/i);
  assert.match(db.calls[0].sql, /is_visible = TRUE/i);
  assert.match(db.calls[0].sql, /archived_at IS NULL/i);
  assert.match(db.calls[0].sql, /ORDER BY sort_order ASC/i);
  assert.match(db.calls[1].sql, /show_in_contact_form = TRUE/i);
  assert.match(db.calls[2].sql, /show_in_comparison = TRUE/i);
  assert.match(db.calls[3].sql, /allow_detail_page = TRUE/i);
  assert.deepEqual(db.calls[3].params, ['start']);
});

test('repository redirect lookup is parameterized and only resolves direct active redirects to visible detail pages', async () => {
  const db = createQueryRecorder([
    [{ old_path: '/pakete/basis', target_path: '/pakete/start', status_code: 301 }]
  ]);
  const repository = createPricingRepository(db);
  const redirect = await repository.getPackageRedirectByOldPath('/pakete/basis');

  assert.equal(redirect.targetPath, '/pakete/start');
  assert.equal(redirect.statusCode, 301);
  assert.match(db.calls[0].sql, /old_path = \$1/i);
  assert.match(db.calls[0].sql, /is_active = TRUE/i);
  assert.match(db.calls[0].sql, /JOIN pricing_packages/i);
  assert.match(db.calls[0].sql, /target_package\.canonical_path = redirect_data\.target_path/i);
  assert.match(db.calls[0].sql, /target_package\.allow_detail_page = TRUE/i);
  assert.match(db.calls[0].sql, /target_package\.archived_at IS NULL/i);
  assert.match(db.calls[0].sql, /redirect_data\.status_code = 301/i);
  assert.match(db.calls[0].sql, /redirect_data\.old_path <> redirect_data\.target_path/i);
  assert.deepEqual(db.calls[0].params, ['/pakete/basis']);
});

test('repository detail queries hide non-visible detail content', async () => {
  const db = createQueryRecorder([[], [], [], [], [], []]);
  const repository = createPricingRepository(db);

  await repository.getPackageFeatures(42);
  await repository.getPackageNotIncluded(42);
  await repository.getPackageUseCases(42);
  await repository.getPackageFaqs(42, { detailOnly: true });
  await repository.getPackageFaqs(42, { schemaOnly: true });
  await repository.getPackageComparisonRows();

  assert.match(db.calls[0].sql, /FROM pricing_package_features/i);
  assert.match(db.calls[0].sql, /is_visible = TRUE/i);
  assert.match(db.calls[0].sql, /package_data\.is_active = TRUE/i);
  assert.match(db.calls[0].sql, /package_data\.archived_at IS NULL/i);
  assert.deepEqual(db.calls[0].params, [42]);
  assert.match(db.calls[1].sql, /FROM pricing_package_not_included/i);
  assert.match(db.calls[1].sql, /is_visible = TRUE/i);
  assert.match(db.calls[1].sql, /package_data\.is_active = TRUE/i);
  assert.match(db.calls[2].sql, /FROM pricing_package_use_cases/i);
  assert.match(db.calls[2].sql, /is_visible = TRUE/i);
  assert.match(db.calls[2].sql, /package_data\.archived_at IS NULL/i);
  assert.match(db.calls[3].sql, /FROM pricing_package_faqs/i);
  assert.match(db.calls[3].sql, /faq_data\.show_on_detail = TRUE/i);
  assert.match(db.calls[3].sql, /package_data\.is_visible = TRUE/i);
  assert.match(db.calls[4].sql, /faq_data\.schema_eligible = TRUE/i);
  assert.match(db.calls[4].sql, /faq_data\.is_visible = TRUE/i);
  assert.match(db.calls[5].sql, /show_in_comparison = TRUE/i);
  assert.match(db.calls[5].sql, /archived_at IS NULL/i);
});

test('repository admin create uses whitelisted package columns and audit log', async () => {
  const db = createQueryRecorder([
    [{ id: 7, package_key: 'start', name: 'Start' }],
    []
  ]);
  const repository = createPricingRepository(db);

  await repository.adminCreatePackage(
    {
      packageKey: 'start',
      name: 'Start',
      ignoredColumn: 'darf nicht in SQL erscheinen'
    },
    { id: 99 }
  );

  assert.match(db.calls[0].sql, /INSERT INTO pricing_packages/i);
  assert.match(db.calls[0].sql, /package_key/i);
  assert.match(db.calls[0].sql, /created_by/i);
  assert.match(db.calls[0].sql, /updated_by/i);
  assert.doesNotMatch(db.calls[0].sql, /ignoredColumn/i);
  assert.deepEqual(db.calls[0].params, ['start', 'Start', 99, 99]);
  assert.match(db.calls[1].sql, /INSERT INTO pricing_audit_log/i);
});

test('service maps public package rows without admin notes and creates form labels', async () => {
  const repository = {
    async getPackagesForContactForm() {
      return [
        {
          id: 2,
          package_key: 'business',
          name: 'Business',
          display_name: 'Business-Paket',
          slug: 'business',
          canonical_path: '/pakete/business',
          price_amount_cents: 149900,
          price_currency: 'EUR',
          price_prefix: 'ab',
          price_type: 'from',
          short_description: 'Unternehmenswebsite',
          admin_note: 'nicht öffentlich'
        }
      ];
    }
  };
  const service = createPricingService(repository);
  const options = await service.getPackagesForContactForm();

  assert.deepEqual(options, [
    {
      value: 'business',
      label: 'Business ab 1.499 €',
      hint: 'Unternehmenswebsite',
      packageKey: 'business',
      slug: 'business',
      canonicalPath: '/pakete/business'
    }
  ]);
});

test('service invalidates cached public package data after admin package writes', async () => {
  let visibleCalls = 0;
  const repository = {
    async getVisiblePackages() {
      visibleCalls += 1;
      return [
        visibleCalls === 1
          ? {
              id: 1,
              package_key: 'start',
              name: 'Start',
              slug: 'start',
              canonical_path: '/pakete/start',
              price_amount_cents: 79900,
              is_active: true,
              is_visible: true
            }
          : {
              id: 2,
              package_key: 'business',
              name: 'Business',
              slug: 'business',
              canonical_path: '/pakete/business',
              price_amount_cents: 149900,
              is_active: true,
              is_visible: true
            }
      ];
    },
    async adminUpdatePackage() {
      return { id: 1, name: 'Business' };
    }
  };
  const service = createPricingService(repository, { cache: true });

  assert.equal((await service.getVisiblePackages())[0].packageKey, 'start');
  assert.equal((await service.getVisiblePackages())[0].packageKey, 'start');
  assert.equal(visibleCalls, 1);

  await service.adminUpdatePackage(1, { name: 'Business' }, { id: 99 });

  assert.equal((await service.getVisiblePackages())[0].packageKey, 'business');
  assert.equal(visibleCalls, 2);
});

test('public mapper omits admin-only fields', () => {
  const mapped = mapPublicPackage({
    id: 1,
    package_key: 'start',
    name: 'Start',
    display_name: 'Start-Paket',
    slug: 'start',
    canonical_path: '/pakete/start',
    price_amount_cents: 79900,
    price_currency: 'EUR',
    price_prefix: 'ab',
    admin_note: 'interner Hinweis'
  });

  assert.equal(mapped.packageKey, 'start');
  assert.equal(mapped.priceLabel, 'ab 799 €');
  assert.equal(Object.hasOwn(mapped, 'adminNote'), false);
});

test('public mapper synchronizes package meta price text with current DB price', () => {
  const mapped = mapPublicPackage({
    id: 1,
    package_key: 'start',
    name: 'Start',
    display_name: 'Start-Paket',
    slug: 'start',
    canonical_path: '/pakete/start',
    price_amount_cents: 88800,
    price_currency: 'EUR',
    price_prefix: 'ab',
    meta_title: 'Start-Paket Webdesign ab 799 € | Berlin',
    meta_description: 'Kompakte individuelle Website ab 799 € für Selbstständige.',
    h1: 'Start-Paket für kompakte Websites ab 799 €'
  });

  assert.equal(mapped.priceLabel, 'ab 888 €');
  assert.equal(mapped.metaTitle, 'Start-Paket Webdesign ab 888 € | Berlin');
  assert.equal(mapped.metaDescription, 'Kompakte individuelle Website ab 888 € für Selbstständige.');
  assert.equal(mapped.h1, 'Start-Paket für kompakte Websites ab 888 €');
});
