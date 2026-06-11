import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { mapMaintenancePlan, mapPricingAddOn } from '../util/packageMapper.js';
import { createPricingRepository } from '../repositories/pricingRepository.js';
import { createPricingService } from '../services/pricingService.js';
import { __testables } from '../controllers/adminPricingController.js';

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), 'utf8');
}

function createQueryRecorder(rowsByCall = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: rowsByCall.shift() || [] };
    }
  };
}

const repositorySource = read('../repositories/pricingRepository.js');
const serviceSource = read('../services/pricingService.js');
const staticPagesSource = read('../routes/staticPages.js');
const leistungenSource = read('../controllers/leistungenController.js');
const packagesControllerSource = read('../controllers/packagesController.js');
const packageDetailView = read('../views/package_detail.ejs');
const adminRoutesSource = read('../routes/adminPricingRoutes.js');
const adminAddOnsView = read('../views/admin/pricing_addons.ejs');
const adminMaintenanceView = read('../views/admin/pricing_maintenance.ejs');
const migrationSource = read('../scripts/migrations/001_create_pricing_catalog.sql');
const seedSource = read('../scripts/seed_pricing_catalog.js');

test('DB-8 repository loads public add-ons and maintenance plans with visibility and archive filters', async () => {
  const db = createQueryRecorder([[], []]);
  const repository = createPricingRepository(db);

  await repository.getVisibleAddOns();
  await repository.getVisibleMaintenancePlans();

  assert.match(db.calls[0].sql, /FROM pricing_addons/i);
  assert.match(db.calls[0].sql, /is_active = TRUE/i);
  assert.match(db.calls[0].sql, /is_visible = TRUE/i);
  assert.match(db.calls[0].sql, /archived_at IS NULL/i);
  assert.match(db.calls[0].sql, /ORDER BY sort_order ASC/i);
  assert.match(db.calls[1].sql, /FROM pricing_maintenance_plans/i);
  assert.match(db.calls[1].sql, /is_active = TRUE/i);
  assert.match(db.calls[1].sql, /is_visible = TRUE/i);
  assert.match(db.calls[1].sql, /archived_at IS NULL/i);
});

test('DB-8 service maps add-on and maintenance DB rows to public page models', async () => {
  const repository = {
    async getVisibleAddOns() {
      return [{
        id: 1,
        addon_key: 'tracking-einrichtung',
        name: 'Tracking und Analytics',
        category: 'Messung',
        price_from_cents: 15000,
        price_to_cents: 40000,
        short_description: 'Events und Consent-Anforderungen vorbereiten',
        long_description: 'Sinnvoll für spätere Auswertung',
        third_party_note: 'Externe Toolkosten separat',
        cta_url: '/kontakt?projektart=zusatzleistung',
        is_active: true,
        is_visible: true
      }];
    },
    async getVisibleMaintenancePlans() {
      return [{
        id: 2,
        plan_key: 'wartung-standard',
        name: 'Wartung Standard',
        price_from_cents: 7900,
        billing_cycle: 'monthly',
        short_description: 'Regelmäßige technische Betreuung',
        included: ['Backups', 'Monitoring'],
        not_included: ['24/7-Bereitschaft'],
        response_time: 'priorisiert im Rahmen der Möglichkeiten',
        content_change_allowance: 'kleine Änderungen im definierten Zeitrahmen',
        emergency_note: 'Akute Probleme werden eingeordnet',
        cta_url: '/kontakt?projektart=maintenance',
        is_recommended: true,
        is_active: true,
        is_visible: true
      }];
    }
  };
  const service = createPricingService(repository);

  const [addOn] = await service.getVisibleAddOns();
  const [plan] = await service.getVisibleMaintenancePlans();

  assert.equal(addOn.id, 'tracking-einrichtung');
  assert.equal(addOn.priceLabel, 'ab 150–400 €');
  assert.equal(addOn.whenUseful, 'Sinnvoll für spätere Auswertung');
  assert.equal(plan.id, 'wartung-standard');
  assert.equal(plan.priceLabel, 'ab 79 €/Monat');
  assert.equal(plan.contentChangeAllowance, 'kleine Änderungen im definierten Zeitrahmen');
  assert.equal(plan.isRecommended, true);
});

test('DB-8 mapper keeps German price labels and public defaults for add-ons and maintenance', () => {
  assert.deepEqual(mapPricingAddOn({
    addon_key: 'seo-leistungsseite',
    name: 'SEO-Leistungsseite',
    price_from_cents: 25000,
    price_to_cents: 45000,
    is_active: true,
    is_visible: true
  }).priceLabel, 'ab 250–450 €');

  assert.deepEqual(mapMaintenancePlan({
    plan_key: 'wartung-plus',
    name: 'Wartung Plus',
    price_from_cents: 12900,
    billing_cycle: 'monthly',
    is_active: true,
    is_visible: true
  }).priceLabel, 'ab 129 €/Monat');
});

test('DB-8 schema and seeds include add-on and maintenance admin fields without old low-price logic', () => {
  assert.match(migrationSource, /ALTER TABLE IF EXISTS pricing_addons[\s\S]*archived_at/i);
  assert.match(migrationSource, /ALTER TABLE IF EXISTS pricing_maintenance_plans[\s\S]*content_change_allowance/i);
  assert.match(migrationSource, /ALTER TABLE IF EXISTS pricing_maintenance_plans[\s\S]*is_recommended/i);
  assert.match(seedSource, /cta_label,\s*cta_url/);
  assert.match(seedSource, /content_change_allowance,\s*emergency_note,\s*third_party_note/);
  assert.match(seedSource, /addons_ticker_duration_seconds/);
  assert.match(seedSource, /package_detail_addons_config/);
  assert.doesNotMatch(seedSource, /Wartung ab 5|ab 5 €|Business 899|Basis ab 499|Premium ab 1\.499/);
});

test('DB-8 admin routes and views expose add-on and maintenance CRUD with CSRF and escaped output', () => {
  const protectedRoutes = [
    /router\.get\('\/admin\/pricing\/add-ons',\s*isAdmin/,
    /router\.post\('\/admin\/pricing\/add-ons',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/add-ons\/:addonId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/add-ons\/:addonId\/archive',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/add-ons\/:addonId\/restore',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.get\('\/admin\/pricing\/maintenance',\s*isAdmin/,
    /router\.post\('\/admin\/pricing\/maintenance',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/maintenance\/:planId',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/maintenance\/:planId\/archive',\s*isAdmin,\s*verifyCsrfToken/,
    /router\.post\('\/admin\/pricing\/maintenance\/:planId\/restore',\s*isAdmin,\s*verifyCsrfToken/
  ];

  for (const pattern of protectedRoutes) assert.match(adminRoutesSource, pattern);

  for (const view of [adminAddOnsView, adminMaintenanceView]) {
    assert.match(view, /name="_csrf"/);
    assert.doesNotMatch(view, /<%-\s*(addon|plan)\./);
  }

  assert.match(adminMaintenanceView, /name="content_change_allowance"/);
  assert.match(adminMaintenanceView, /name="emergency_note"/);
  assert.match(adminMaintenanceView, /name="third_party_note"/);
  assert.match(adminMaintenanceView, /Diese Daten erscheinen auf Wartungs-, Kosten- und Laufende-Kosten-Seiten/);
});

test('DB-8 admin validators reject unsafe URLs and risky maintenance/add-on values', () => {
  const badAddOn = __testables.validateAddOnPayload(__testables.normalizeAddOnBody({
    addon_key: 'tracking',
    name: 'Tracking',
    price_from_euro: '400',
    price_to_euro: '150',
    cta_url: 'javascript:alert(1)'
  }));
  assert.ok(badAddOn.errors.some((error) => error.includes('Preis von')));
  assert.ok(badAddOn.errors.some((error) => error.includes('CTA-URL')));

  const badPlan = __testables.validateMaintenancePlanPayload(__testables.normalizeMaintenancePlanBody({
    plan_key: 'wartung-test',
    name: 'Wartung Test',
    price_from_euro: '5',
    billing_cycle: 'weekly',
    cta_url: 'javascript:alert(1)',
    emergency_note: 'Wartung ab 5 und 24/7'
  }));
  assert.ok(badPlan.errors.some((error) => error.includes('Abrechnungsrhythmus')));
  assert.ok(badPlan.errors.some((error) => error.includes('CTA-URL')));
  assert.ok(badPlan.warnings.some((warning) => warning.includes('Wartung ab 5')));
});

test('DB-8 public pages prefer DB add-ons, maintenance plans and global notes over static fallback data', () => {
  assert.match(staticPagesSource, /pricingService\.getVisibleAddOns\(/);
  assert.match(staticPagesSource, /pricingService\.getVisibleMaintenancePlans\(/);
  assert.match(staticPagesSource, /mergeAddOnsPage/);
  assert.match(staticPagesSource, /mergeMaintenancePage/);
  assert.match(staticPagesSource, /mergeRunningCostsPage/);
  assert.match(staticPagesSource, /RUNNING_COSTS_ADD_ON_IDS/);
  assert.match(staticPagesSource, /buchungssystem-integration/);
  assert.match(staticPagesSource, /tracking-einrichtung/);

  assert.match(leistungenSource, /pricingService\.getVisibleAddOns\(/);
  assert.match(leistungenSource, /pricingService\.getVisibleMaintenancePlans\(/);
  assert.match(leistungenSource, /buildDynamicCostPageAddOns/);
  assert.match(leistungenSource, /buildDynamicCostPageMaintenance/);

  assert.match(packagesControllerSource, /pricingService\.getVisibleAddOns\(\)/);
  assert.match(packagesControllerSource, /optionalAddOns/);
  assert.match(packageDetailView, /optionalAddOnItems/);
  assert.match(packageDetailView, /addOn\.priceLabel/);
});

test('DB-8 repository and service expose admin methods for add-ons and maintenance', () => {
  const methods = [
    'adminListAddOns',
    'adminGetAddOn',
    'adminCreateAddOn',
    'adminUpdateAddOn',
    'adminArchiveAddOn',
    'adminRestoreAddOn',
    'adminToggleAddOnVisibility',
    'adminUpdateAddOnSortOrder',
    'adminListMaintenancePlans',
    'adminGetMaintenancePlan',
    'adminCreateMaintenancePlan',
    'adminUpdateMaintenancePlan',
    'adminArchiveMaintenancePlan',
    'adminRestoreMaintenancePlan',
    'adminToggleMaintenancePlanVisibility',
    'adminUpdateMaintenancePlanSortOrder'
  ];

  for (const method of methods) {
    assert.match(repositorySource, new RegExp(`async function ${method}\\(`));
    assert.match(serviceSource, new RegExp(`${method}: (?:invalidateAfter\\()?repository\\.${method}`));
  }

  assert.match(repositorySource, /INSERT INTO pricing_audit_log/);
});
