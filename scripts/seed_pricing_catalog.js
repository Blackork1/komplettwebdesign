import pool from '../util/db.js';
import { addOns } from '../data/addOns.js';
import { packageFaqs } from '../data/faqs.js';
import { maintenancePlans } from '../data/maintenancePlans.js';
import { PACKAGE_GLOBAL_NOTES, packageComparisonRows, packages } from '../data/packages.js';

const APPLY = process.argv.includes('--apply');
const MODE = 'insert-only';
const PRODUCTION_APPROVAL = 'I_HAVE_BACKUP_AND_APPROVAL';

const packageOverrides = {
  start: {
    display_name: 'Start-Paket',
    page_scope: '1 bis 3 Inhaltsseiten oder Onepager',
    recommendation_label: null
  },
  business: {
    display_name: 'Business-Paket',
    recommendation_label: 'Häufig passend'
  },
  wachstum: {
    display_name: 'Wachstum-Paket'
  },
  individuell: {
    display_name: 'Individuelles Projekt',
    price_suffix: 'oder nach Aufwand',
    price_type: 'custom',
    price_label_override: 'ab 3.500 € oder nach Aufwand',
    page_scope: 'nach Aufwand'
  }
};

const globalNotes = [
  {
    note_key: 'vat_note',
    title: 'Umsatzsteuer',
    body: PACKAGE_GLOBAL_NOTES.vatNote,
    context: 'pricing'
  },
  {
    note_key: 'running_costs_note',
    title: 'Laufende Kosten',
    body: 'Laufende Kosten für Domain, E-Mail, Hosting, Wartung oder externe Dienste können separat entstehen.',
    context: 'pricing'
  },
  {
    note_key: 'third_party_note',
    title: 'Drittanbieter-Kosten',
    body: 'Kosten für Drittanbieter-Tools, Lizenzen, Cookie-/Consent-Dienste oder externe Anbieter sind nicht automatisch enthalten.',
    context: 'pricing'
  },
  {
    note_key: 'legal_note',
    title: 'Rechtstexte',
    body: 'Rechtlich relevante Seiten können technisch eingebunden werden. Die Erstellung oder Prüfung von Rechtstexten ist keine Rechtsberatung.',
    context: 'legal'
  },
  {
    note_key: 'seo_note',
    title: 'SEO-Grundlagen',
    body: 'Technische SEO-Grundlagen können umgesetzt werden. Bestimmte Platzierungen bei Google können nicht garantiert werden.',
    context: 'seo'
  },
  {
    note_key: 'feedback_note',
    title: 'Feedbackrunden',
    body: PACKAGE_GLOBAL_NOTES.feedbackNote,
    context: 'scope'
  },
  {
    note_key: 'launch_note',
    title: 'Livegang',
    body: PACKAGE_GLOBAL_NOTES.launchNote,
    context: 'scope'
  },
  {
    note_key: 'addons_ticker_duration_seconds',
    title: 'Add-ons-Ticker-Laufzeit',
    body: '35',
    context: 'package_detail_addons_config'
  }
];

function textValue(value) {
  return Array.isArray(value) ? value.join('\n') : value || null;
}

function normalizePriceLabelNumber(rawNumber) {
  return Number(String(rawNumber).replace(/\./g, '').replace(',', '.'));
}

function parsePriceLabel(priceLabel) {
  const label = String(priceLabel || '');
  if (/nach Aufwand/i.test(label)) return { from: null, to: null };

  const matches = [...label.matchAll(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d+)?/g)]
    .map((match) => normalizePriceLabelNumber(match[0]))
    .filter(Number.isFinite);

  if (!matches.length) return { from: null, to: null };
  return {
    from: Math.round(matches[0] * 100),
    to: matches[1] ? Math.round(matches[1] * 100) : null
  };
}

function billingCycle(value) {
  if (value === 'monatlich') return 'monthly';
  if (value === 'jährlich') return 'yearly';
  return 'custom';
}

function priceTypeForPackage(pkg) {
  if (pkg.id === 'individuell') return 'custom';
  return 'from';
}

function priceSuffixForPackage(pkg) {
  if (pkg.id === 'individuell') return 'oder nach Aufwand';
  return null;
}

function priceOverrideForPackage(pkg) {
  if (pkg.id === 'individuell') return 'ab 3.500 € oder nach Aufwand';
  return null;
}

function buildPackageSeed(pkg) {
  const override = packageOverrides[pkg.id] || {};
  return {
    package_key: pkg.id,
    name: pkg.name,
    display_name: override.display_name || pkg.longName || pkg.displayName || pkg.name,
    slug: pkg.slug,
    canonical_path: pkg.canonicalPath,
    price_amount_cents: Number(pkg.priceFrom) * 100,
    price_currency: 'EUR',
    price_prefix: 'ab',
    price_suffix: override.price_suffix ?? priceSuffixForPackage(pkg),
    price_label_override: override.price_label_override ?? priceOverrideForPackage(pkg),
    price_type: override.price_type || priceTypeForPackage(pkg),
    vat_note: PACKAGE_GLOBAL_NOTES.vatNote,
    short_description: pkg.shortDescription,
    long_description: pkg.longDescription,
    positioning: textValue(pkg.positioning),
    target_group: textValue(pkg.targetGroup),
    not_for: textValue(pkg.notFor),
    page_scope: override.page_scope || pkg.pageScope,
    text_scope: textValue(pkg.textScope),
    seo_scope: textValue(pkg.seoScope),
    tech_scope: textValue(pkg.techScope),
    feedback_rounds: pkg.feedbackRounds,
    timeline: pkg.timeline,
    cta_label: pkg.ctaLabel,
    cta_url: pkg.ctaUrl,
    secondary_cta_label: pkg.secondaryCtaLabel,
    secondary_cta_url: pkg.compareUrl || '/pakete',
    is_recommended: pkg.id === 'business',
    recommendation_label: override.recommendation_label ?? pkg.recommendationLabel ?? null,
    sort_order: pkg.order || pkg.sortOrder || 0,
    is_active: true,
    is_visible: true,
    show_in_comparison: true,
    show_in_contact_form: true,
    allow_detail_page: true,
    meta_title: pkg.metaTitle,
    meta_description: pkg.metaDescription,
    h1: pkg.h1,
    schema_type: pkg.schemaType || 'Service',
    admin_note: null
  };
}

async function getOrInsertPackage(client, seed) {
  const { rows } = await client.query(
    `
      WITH inserted AS (
        INSERT INTO pricing_packages (
          package_key, name, display_name, slug, canonical_path,
          price_amount_cents, price_currency, price_prefix, price_suffix,
          price_label_override, price_type, vat_note, short_description,
          long_description, positioning, target_group, not_for, page_scope,
          text_scope, seo_scope, tech_scope, feedback_rounds, timeline,
          cta_label, cta_url, secondary_cta_label, secondary_cta_url,
          is_recommended, recommendation_label, sort_order, is_active,
          is_visible, show_in_comparison, show_in_contact_form,
          allow_detail_page, meta_title, meta_description, h1, schema_type,
          admin_note
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23,
          $24, $25, $26, $27,
          $28, $29, $30, $31,
          $32, $33, $34,
          $35, $36, $37, $38, $39,
          $40
        )
        ON CONFLICT (package_key) DO NOTHING
        RETURNING id
      )
      SELECT id FROM inserted
      UNION ALL
      SELECT id FROM pricing_packages WHERE package_key = $1
      LIMIT 1
    `,
    [
      seed.package_key,
      seed.name,
      seed.display_name,
      seed.slug,
      seed.canonical_path,
      seed.price_amount_cents,
      seed.price_currency,
      seed.price_prefix,
      seed.price_suffix,
      seed.price_label_override,
      seed.price_type,
      seed.vat_note,
      seed.short_description,
      seed.long_description,
      seed.positioning,
      seed.target_group,
      seed.not_for,
      seed.page_scope,
      seed.text_scope,
      seed.seo_scope,
      seed.tech_scope,
      seed.feedback_rounds,
      seed.timeline,
      seed.cta_label,
      seed.cta_url,
      seed.secondary_cta_label,
      seed.secondary_cta_url,
      seed.is_recommended,
      seed.recommendation_label,
      seed.sort_order,
      seed.is_active,
      seed.is_visible,
      seed.show_in_comparison,
      seed.show_in_contact_form,
      seed.allow_detail_page,
      seed.meta_title,
      seed.meta_description,
      seed.h1,
      seed.schema_type,
      seed.admin_note
    ]
  );
  return rows[0].id;
}

async function insertPackageFeature(client, packageId, featureText, featureGroup, sortOrder) {
  await client.query(
    `
      INSERT INTO pricing_package_features (package_id, feature_text, feature_group, sort_order, is_visible)
      SELECT $1, $2, $3, $4, TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM pricing_package_features
        WHERE package_id = $1
          AND feature_text = $2
          AND COALESCE(feature_group, '') = COALESCE($3::VARCHAR, '')
      )
    `,
    [packageId, featureText, featureGroup, sortOrder]
  );
}

async function insertNotIncluded(client, packageId, itemText, itemGroup, sortOrder) {
  await client.query(
    `
      INSERT INTO pricing_package_not_included (package_id, item_text, item_group, sort_order, is_visible)
      SELECT $1, $2, $3, $4, TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM pricing_package_not_included
        WHERE package_id = $1
          AND item_text = $2
          AND COALESCE(item_group, '') = COALESCE($3::VARCHAR, '')
      )
    `,
    [packageId, itemText, itemGroup, sortOrder]
  );
}

async function insertUseCase(client, packageId, useCaseText, sortOrder) {
  await client.query(
    `
      INSERT INTO pricing_package_use_cases (package_id, use_case_text, sort_order, is_visible)
      SELECT $1, $2, $3, TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM pricing_package_use_cases
        WHERE package_id = $1 AND use_case_text = $2
      )
    `,
    [packageId, useCaseText, sortOrder]
  );
}

async function insertRedirect(client, packageId, oldPath, targetPath) {
  await client.query(
    `
      INSERT INTO pricing_package_redirects (package_id, old_path, target_path, status_code, is_active)
      VALUES ($1, $2, $3, 301, TRUE)
      ON CONFLICT (old_path) WHERE is_active = TRUE DO NOTHING
    `,
    [packageId, oldPath, targetPath]
  );
}

async function insertFaq(client, packageId, faq, sortOrder) {
  await client.query(
    `
      INSERT INTO pricing_package_faqs (
        package_id, question, answer, category, show_on_overview,
        show_on_detail, schema_eligible, sort_order, is_visible
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM pricing_package_faqs
        WHERE package_id IS NOT DISTINCT FROM $1
          AND question = $2
      )
    `,
    [
      packageId,
      faq.question,
      faq.answer,
      faq.category,
      !faq.relatedPackage,
      Boolean(faq.relatedPackage),
      faq.schemaEligible !== false,
      sortOrder
    ]
  );
}

async function getOrInsertComparisonRow(client, row, sortOrder) {
  const { rows } = await client.query(
    `
      WITH inserted AS (
        INSERT INTO pricing_comparison_rows (row_key, label, description, sort_order, is_visible)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (row_key) DO NOTHING
        RETURNING id
      )
      SELECT id FROM inserted
      UNION ALL
      SELECT id FROM pricing_comparison_rows WHERE row_key = $1
      LIMIT 1
    `,
    [row.id, row.label, row.description || null, sortOrder]
  );
  return rows[0].id;
}

async function insertComparisonValue(client, rowId, packageId, value, sortOrder) {
  await client.query(
    `
      INSERT INTO pricing_comparison_values (row_id, package_id, value, highlight, sort_order)
      VALUES ($1, $2, $3, FALSE, $4)
      ON CONFLICT (row_id, package_id) DO NOTHING
    `,
    [rowId, packageId, value, sortOrder]
  );
}

async function insertAddon(client, addon, sortOrder) {
  const price = parsePriceLabel(addon.priceLabel);
  await client.query(
    `
      INSERT INTO pricing_addons (
        addon_key, name, category, price_from_cents, price_to_cents,
        price_label, short_description, long_description, third_party_note,
        cta_label, cta_url, is_active, is_visible, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, TRUE, $12)
      ON CONFLICT (addon_key) DO NOTHING
    `,
    [
      addon.id,
      addon.name,
      addon.category,
      price.from,
      price.to,
      addon.priceLabel,
      addon.shortDescription,
      addon.whenUseful || null,
      addon.thirdPartyCostNote || null,
      addon.ctaLabel || null,
      addon.ctaUrl || null,
      sortOrder
    ]
  );
}

async function insertMaintenancePlan(client, plan, sortOrder) {
  await client.query(
    `
      INSERT INTO pricing_maintenance_plans (
        plan_key, name, price_from_cents, price_label, billing_cycle,
        short_description, included, not_included, response_time,
        content_change_allowance, emergency_note, third_party_note,
        cancellation_note, cta_label, cta_url, is_recommended,
        is_active, is_visible, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::TEXT[], $8::TEXT[], $9, $10, $11, $12, $13, $14, $15, COALESCE($16, FALSE), TRUE, TRUE, $17)
      ON CONFLICT (plan_key) DO NOTHING
    `,
    [
      plan.id,
      plan.name,
      Number(plan.priceFrom) * 100,
      plan.priceLabel,
      billingCycle(plan.billingCycle),
      plan.shortDescription,
      plan.included || [],
      plan.notIncluded || [],
      plan.responseTime || null,
      plan.contentChangeAllowance || null,
      plan.emergencyNote || null,
      plan.thirdPartyNote || null,
      plan.cancellationNote || null,
      plan.ctaLabel || null,
      plan.ctaUrl || null,
      plan.isRecommended,
      sortOrder
    ]
  );
}

async function insertGlobalNote(client, note, sortOrder) {
  await client.query(
    `
      INSERT INTO pricing_global_notes (note_key, title, body, context, is_active, sort_order)
      VALUES ($1, $2, $3, $4, TRUE, $5)
      ON CONFLICT (note_key) DO NOTHING
    `,
    [note.note_key, note.title, note.body, note.context, sortOrder]
  );
}

function packageSummary() {
  return packages.map((pkg) => ({
    package_key: pkg.id,
    canonical_path: pkg.canonicalPath,
    price_amount_cents: Number(pkg.priceFrom) * 100
  }));
}

function plannedCounts() {
  return {
    packages: packages.length,
    package_features: packages.reduce((sum, pkg) => sum + (pkg.included?.length || 0), 0),
    package_not_included: packages.reduce((sum, pkg) => sum + (pkg.notIncluded?.length || 0), 0),
    package_use_cases: packages.reduce((sum, pkg) => sum + (pkg.useCases?.length || 0), 0),
    package_redirects: packages.reduce((sum, pkg) => sum + (pkg.redirectFrom?.length || 0), 0),
    package_faqs: packageFaqs.length,
    comparison_rows: packageComparisonRows.length,
    comparison_values: packageComparisonRows.length * packages.length,
    addons: addOns.length,
    maintenance_plans: maintenancePlans.length,
    global_notes: globalNotes.length
  };
}

async function seedPricingCatalog() {
  if (!APPLY) {
    console.log(JSON.stringify({
      mode: MODE,
      apply: false,
      note: 'Dry-Run: keine Datenbank-Schreibzugriffe. Mit --apply in lokaler Test-/Staging-DB ausführen.',
      packages: packageSummary(),
      counts: plannedCounts()
    }, null, 2));
    return;
  }

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PRODUCTION_PRICING_SEED !== PRODUCTION_APPROVAL
  ) {
    throw new Error('Production-Seed blockiert. Vor Production sind Backup und ausdrückliche Freigabe erforderlich.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const packageIds = new Map();

    for (const pkg of packages) {
      const packageId = await getOrInsertPackage(client, buildPackageSeed(pkg));
      packageIds.set(pkg.id, packageId);

      for (const [index, feature] of (pkg.included || []).entries()) {
        await insertPackageFeature(client, packageId, feature, 'included', index + 1);
      }

      for (const [index, item] of (pkg.notIncluded || []).entries()) {
        await insertNotIncluded(client, packageId, item, 'not_included', index + 1);
      }

      for (const [index, useCase] of (pkg.useCases || []).entries()) {
        await insertUseCase(client, packageId, useCase, index + 1);
      }

      for (const oldPath of (pkg.redirectFrom || [])) {
        await insertRedirect(client, packageId, oldPath, pkg.canonicalPath);
      }
    }

    for (const [index, faq] of packageFaqs.entries()) {
      const packageId = faq.relatedPackage ? packageIds.get(faq.relatedPackage) : null;
      await insertFaq(client, packageId || null, faq, index + 1);
    }

    for (const [rowIndex, row] of packageComparisonRows.entries()) {
      const rowId = await getOrInsertComparisonRow(client, row, rowIndex + 1);

      for (const [pkgIndex, pkg] of packages.entries()) {
        await insertComparisonValue(
          client,
          rowId,
          packageIds.get(pkg.id),
          row.values[pkg.id],
          pkgIndex + 1
        );
      }
    }

    for (const [index, addon] of addOns.entries()) {
      await insertAddon(client, addon, index + 1);
    }

    for (const [index, plan] of maintenancePlans.entries()) {
      await insertMaintenancePlan(client, plan, index + 1);
    }

    for (const [index, note] of globalNotes.entries()) {
      await insertGlobalNote(client, note, index + 1);
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({
      mode: MODE,
      apply: true,
      insertedOrExisting: plannedCounts(),
      note: 'Seed abgeschlossen. Bestehende Datensätze wurden im Insert-only-Modus nicht überschrieben.'
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedPricingCatalog().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
