import pool from '../util/db.js';

const PUBLIC_PACKAGE_COLUMNS = `
  id, package_key, name, display_name, slug, canonical_path,
  price_amount_cents, price_currency, price_prefix, price_suffix,
  price_label_override, price_type, vat_note, short_description,
  long_description, positioning, target_group, not_for, page_scope,
  text_scope, seo_scope, tech_scope, feedback_rounds, timeline,
  cta_label, cta_url, secondary_cta_label, secondary_cta_url,
  is_recommended, recommendation_label, sort_order, is_active,
  is_visible, show_in_comparison, show_in_contact_form,
  allow_detail_page, meta_title, meta_description, h1, schema_type
`;

const ADMIN_PACKAGE_COLUMNS = `
  ${PUBLIC_PACKAGE_COLUMNS},
  admin_note, created_at, updated_at, archived_at, created_by, updated_by
`;

const PUBLIC_PACKAGE_WHERE = `
  is_active = TRUE
  AND is_visible = TRUE
  AND archived_at IS NULL
`;

const PUBLIC_ADDON_COLUMNS = `
  id, addon_key, name, category, price_from_cents, price_to_cents,
  price_label, short_description, long_description, third_party_note,
  cta_label, cta_url, is_active, is_visible, sort_order, created_at,
  updated_at, archived_at
`;

const PUBLIC_MAINTENANCE_PLAN_COLUMNS = `
  id, plan_key, name, price_from_cents, price_label, billing_cycle,
  short_description, included, not_included, response_time,
  content_change_allowance, emergency_note, third_party_note,
  cancellation_note, cta_label, cta_url, is_recommended,
  is_active, is_visible, sort_order, created_at, updated_at, archived_at
`;

const PUBLIC_ADDON_WHERE = `
  is_active = TRUE
  AND is_visible = TRUE
  AND archived_at IS NULL
`;

const PUBLIC_MAINTENANCE_PLAN_WHERE = `
  is_active = TRUE
  AND is_visible = TRUE
  AND archived_at IS NULL
`;

const adminPackageColumns = {
  packageKey: 'package_key',
  name: 'name',
  displayName: 'display_name',
  slug: 'slug',
  canonicalPath: 'canonical_path',
  priceAmountCents: 'price_amount_cents',
  priceCurrency: 'price_currency',
  pricePrefix: 'price_prefix',
  priceSuffix: 'price_suffix',
  priceLabelOverride: 'price_label_override',
  priceType: 'price_type',
  vatNote: 'vat_note',
  shortDescription: 'short_description',
  longDescription: 'long_description',
  positioning: 'positioning',
  targetGroup: 'target_group',
  notFor: 'not_for',
  pageScope: 'page_scope',
  textScope: 'text_scope',
  seoScope: 'seo_scope',
  techScope: 'tech_scope',
  feedbackRounds: 'feedback_rounds',
  timeline: 'timeline',
  ctaLabel: 'cta_label',
  ctaUrl: 'cta_url',
  secondaryCtaLabel: 'secondary_cta_label',
  secondaryCtaUrl: 'secondary_cta_url',
  isRecommended: 'is_recommended',
  recommendationLabel: 'recommendation_label',
  sortOrder: 'sort_order',
  isActive: 'is_active',
  isVisible: 'is_visible',
  showInComparison: 'show_in_comparison',
  showInContactForm: 'show_in_contact_form',
  allowDetailPage: 'allow_detail_page',
  metaTitle: 'meta_title',
  metaDescription: 'meta_description',
  h1: 'h1',
  schemaType: 'schema_type',
  adminNote: 'admin_note',
  createdBy: 'created_by',
  updatedBy: 'updated_by'
};

const comparisonRowColumns = {
  rowKey: 'row_key',
  label: 'label',
  description: 'description',
  sortOrder: 'sort_order',
  isVisible: 'is_visible'
};

const globalNoteColumns = {
  noteKey: 'note_key',
  title: 'title',
  body: 'body',
  context: 'context',
  isActive: 'is_active',
  sortOrder: 'sort_order'
};

const redirectColumns = {
  packageId: 'package_id',
  oldPath: 'old_path',
  targetPath: 'target_path',
  statusCode: 'status_code',
  isActive: 'is_active'
};

const addonColumns = {
  addonKey: 'addon_key',
  name: 'name',
  category: 'category',
  priceFromCents: 'price_from_cents',
  priceToCents: 'price_to_cents',
  priceLabel: 'price_label',
  shortDescription: 'short_description',
  longDescription: 'long_description',
  thirdPartyNote: 'third_party_note',
  ctaLabel: 'cta_label',
  ctaUrl: 'cta_url',
  isActive: 'is_active',
  isVisible: 'is_visible',
  sortOrder: 'sort_order'
};

const maintenancePlanColumns = {
  planKey: 'plan_key',
  name: 'name',
  priceFromCents: 'price_from_cents',
  priceLabel: 'price_label',
  billingCycle: 'billing_cycle',
  shortDescription: 'short_description',
  included: 'included',
  notIncluded: 'not_included',
  responseTime: 'response_time',
  contentChangeAllowance: 'content_change_allowance',
  emergencyNote: 'emergency_note',
  thirdPartyNote: 'third_party_note',
  cancellationNote: 'cancellation_note',
  ctaLabel: 'cta_label',
  ctaUrl: 'cta_url',
  isRecommended: 'is_recommended',
  isActive: 'is_active',
  isVisible: 'is_visible',
  sortOrder: 'sort_order'
};

function adminUserId(adminUser) {
  return adminUser?.id || adminUser?.userId || null;
}

function updateParts(data, startIndex = 1) {
  const fields = Object.entries(data || {})
    .filter(([key, value]) => adminPackageColumns[key] && value !== undefined);

  return {
    fields,
    setSql: fields.map(([key], index) => `${adminPackageColumns[key]} = $${startIndex + index}`),
    values: fields.map(([, value]) => value)
  };
}

function genericUpdateParts(data, columns, startIndex = 1) {
  const fields = Object.entries(data || {})
    .filter(([key, value]) => columns[key] && value !== undefined);

  return {
    fields,
    setSql: fields.map(([key], index) => `${columns[key]} = $${startIndex + index}`),
    values: fields.map(([, value]) => value)
  };
}

async function writeAudit(db, adminUser, entityType, entityId, action, beforeData, afterData) {
  await db.query(
    `
      INSERT INTO pricing_audit_log (
        admin_user_id, entity_type, entity_id, action, before_data, after_data
      )
      VALUES ($1, $2, $3, $4, $5::JSONB, $6::JSONB)
    `,
    [
      adminUserId(adminUser),
      entityType,
      String(entityId),
      action,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null
    ]
  );
}

export function createPricingRepository(db = pool) {
  async function getVisiblePackages() {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_PACKAGE_COLUMNS}
        FROM pricing_packages
        WHERE ${PUBLIC_PACKAGE_WHERE}
        ORDER BY sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function getPackagesForOverview() {
    return getVisiblePackages();
  }

  async function getPackagesForHome() {
    return getVisiblePackages();
  }

  async function getPackagesForComparison() {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_PACKAGE_COLUMNS}
        FROM pricing_packages
        WHERE ${PUBLIC_PACKAGE_WHERE}
          AND show_in_comparison = TRUE
        ORDER BY sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function getPackagesForContactForm() {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_PACKAGE_COLUMNS}
        FROM pricing_packages
        WHERE ${PUBLIC_PACKAGE_WHERE}
          AND show_in_contact_form = TRUE
        ORDER BY sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function getPackageBySlug(slug) {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_PACKAGE_COLUMNS}
        FROM pricing_packages
        WHERE ${PUBLIC_PACKAGE_WHERE}
          AND allow_detail_page = TRUE
          AND slug = $1
        LIMIT 1
      `,
      [slug]
    );
    return rows[0] || null;
  }

  async function getPackageByKey(packageKey) {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_PACKAGE_COLUMNS}
        FROM pricing_packages
        WHERE ${PUBLIC_PACKAGE_WHERE}
          AND package_key = $1
        LIMIT 1
      `,
      [packageKey]
    );
    return rows[0] || null;
  }

  async function getPackageFeatures(packageId) {
    const { rows } = await db.query(
      `
        SELECT feature_data.id, feature_data.feature_text, feature_data.feature_group,
               feature_data.sort_order, feature_data.is_visible
        FROM pricing_package_features feature_data
        JOIN pricing_packages package_data
          ON package_data.id = feature_data.package_id
        WHERE feature_data.package_id = $1
          AND feature_data.is_visible = TRUE
          AND package_data.is_active = TRUE
          AND package_data.is_visible = TRUE
          AND package_data.archived_at IS NULL
        ORDER BY feature_data.sort_order ASC, feature_data.id ASC
      `,
      [packageId]
    );
    return rows;
  }

  async function getPackageNotIncluded(packageId) {
    const { rows } = await db.query(
      `
        SELECT item_data.id, item_data.item_text, item_data.item_group,
               item_data.sort_order, item_data.is_visible
        FROM pricing_package_not_included item_data
        JOIN pricing_packages package_data
          ON package_data.id = item_data.package_id
        WHERE item_data.package_id = $1
          AND item_data.is_visible = TRUE
          AND package_data.is_active = TRUE
          AND package_data.is_visible = TRUE
          AND package_data.archived_at IS NULL
        ORDER BY item_data.sort_order ASC, item_data.id ASC
      `,
      [packageId]
    );
    return rows;
  }

  async function getPackageUseCases(packageId) {
    const { rows } = await db.query(
      `
        SELECT use_case_data.id, use_case_data.use_case_text,
               use_case_data.sort_order, use_case_data.is_visible
        FROM pricing_package_use_cases use_case_data
        JOIN pricing_packages package_data
          ON package_data.id = use_case_data.package_id
        WHERE use_case_data.package_id = $1
          AND use_case_data.is_visible = TRUE
          AND package_data.is_active = TRUE
          AND package_data.is_visible = TRUE
          AND package_data.archived_at IS NULL
        ORDER BY use_case_data.sort_order ASC, use_case_data.id ASC
      `,
      [packageId]
    );
    return rows;
  }

  async function getPackageFaqs(packageId, options = {}) {
    const detailFilter = options.detailOnly ? 'AND faq_data.show_on_detail = TRUE' : '';
    const overviewFilter = options.overviewOnly ? 'AND faq_data.show_on_overview = TRUE' : '';
    const schemaFilter = options.schemaOnly ? 'AND faq_data.schema_eligible = TRUE' : '';

    const { rows } = await db.query(
      `
        SELECT faq_data.id, faq_data.question, faq_data.answer, faq_data.category,
               faq_data.show_on_overview, faq_data.show_on_detail,
               faq_data.schema_eligible, faq_data.sort_order, faq_data.is_visible
        FROM pricing_package_faqs faq_data
        JOIN pricing_packages package_data
          ON package_data.id = faq_data.package_id
        WHERE faq_data.package_id = $1
          AND faq_data.is_visible = TRUE
          AND package_data.is_active = TRUE
          AND package_data.is_visible = TRUE
          AND package_data.archived_at IS NULL
          ${detailFilter}
          ${overviewFilter}
          ${schemaFilter}
        ORDER BY faq_data.sort_order ASC, faq_data.id ASC
      `,
      [packageId]
    );
    return rows;
  }

  async function getPackageWithDetailsBySlug(slug) {
    const packageRow = await getPackageBySlug(slug);
    if (!packageRow) return null;

    const [features, notIncluded, useCases, faqs] = await Promise.all([
      getPackageFeatures(packageRow.id),
      getPackageNotIncluded(packageRow.id),
      getPackageUseCases(packageRow.id),
      getPackageFaqs(packageRow.id, { detailOnly: true })
    ]);

    return {
      packageRow,
      features,
      notIncluded,
      useCases,
      faqs
    };
  }

  async function getPackageComparisonRows() {
    const { rows } = await db.query(
      `
        SELECT
          row_data.id AS row_id,
          row_data.row_key,
          row_data.label,
          row_data.description,
          row_data.sort_order AS row_sort_order,
          value_data.id AS value_id,
          value_data.value,
          value_data.highlight,
          value_data.sort_order AS value_sort_order,
          package_data.package_key,
          package_data.slug,
          package_data.name AS package_name
        FROM pricing_comparison_rows row_data
        LEFT JOIN pricing_comparison_values value_data
          ON value_data.row_id = row_data.id
        LEFT JOIN pricing_packages package_data
          ON package_data.id = value_data.package_id
          AND package_data.is_active = TRUE
          AND package_data.is_visible = TRUE
          AND package_data.show_in_comparison = TRUE
          AND package_data.archived_at IS NULL
        WHERE row_data.is_visible = TRUE
        ORDER BY row_data.sort_order ASC, row_data.id ASC,
                 package_data.sort_order ASC, value_data.sort_order ASC
      `
    );
    return rows;
  }

  async function getPackageRedirectByOldPath(path) {
    const { rows } = await db.query(
      `
        SELECT redirect_data.old_path, redirect_data.target_path, redirect_data.status_code
        FROM pricing_package_redirects redirect_data
        JOIN pricing_packages target_package
          ON target_package.canonical_path = redirect_data.target_path
          AND target_package.is_active = TRUE
          AND target_package.is_visible = TRUE
          AND target_package.allow_detail_page = TRUE
          AND target_package.archived_at IS NULL
        WHERE redirect_data.old_path = $1
          AND redirect_data.is_active = TRUE
          AND redirect_data.status_code = 301
          AND redirect_data.old_path <> redirect_data.target_path
        LIMIT 1
      `,
      [path]
    );
    const row = rows[0];
    if (!row) return null;

    return {
      oldPath: row.old_path,
      targetPath: row.target_path,
      statusCode: row.status_code
    };
  }

  async function getGlobalPricingNotes(context = null) {
    const params = [];
    const contextFilter = context ? 'AND context = $1' : '';
    if (context) params.push(context);

    const { rows } = await db.query(
      `
        SELECT id, note_key, title, body, context, sort_order
        FROM pricing_global_notes
        WHERE is_active = TRUE
          ${contextFilter}
        ORDER BY sort_order ASC, id ASC
      `,
      params
    );
    return rows;
  }

  async function getLowestVisiblePackagePrice() {
    const { rows } = await db.query(
      `
        SELECT MIN(price_amount_cents) AS lowest_price_amount_cents
        FROM pricing_packages
        WHERE ${PUBLIC_PACKAGE_WHERE}
          AND price_amount_cents IS NOT NULL
      `
    );
    return rows[0]?.lowest_price_amount_cents ?? null;
  }

  async function getPackagePriceMap() {
    const { rows } = await db.query(
      `
        SELECT package_key, price_amount_cents, price_currency, price_prefix,
               price_suffix, price_label_override, price_type
        FROM pricing_packages
        WHERE ${PUBLIC_PACKAGE_WHERE}
        ORDER BY sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function adminListPackages() {
    const { rows } = await db.query(
      `
        SELECT ${ADMIN_PACKAGE_COLUMNS}
        FROM pricing_packages
        ORDER BY sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function adminGetPackage(id) {
    const { rows } = await db.query(
      `
        SELECT ${ADMIN_PACKAGE_COLUMNS}
        FROM pricing_packages
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    return rows[0] || null;
  }

  async function adminCreatePackage(data, adminUser) {
    const payload = {
      ...data,
      createdBy: adminUserId(adminUser),
      updatedBy: adminUserId(adminUser)
    };
    const columns = Object.entries(payload)
      .filter(([key, value]) => adminPackageColumns[key] && value !== undefined);
    const sqlColumns = columns.map(([key]) => adminPackageColumns[key]);
    const values = columns.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const { rows } = await db.query(
      `
        INSERT INTO pricing_packages (${sqlColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${ADMIN_PACKAGE_COLUMNS}
      `,
      values
    );
    await writeAudit(db, adminUser, 'pricing_package', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdatePackage(id, data, adminUser) {
    const before = await adminGetPackage(id);
    const parts = updateParts({ ...data, updatedBy: adminUserId(adminUser) });

    if (!parts.fields.length) return before;

    const idPlaceholder = `$${parts.values.length + 1}`;
    const { rows } = await db.query(
      `
        UPDATE pricing_packages
        SET ${parts.setSql.join(', ')}
        WHERE id = ${idPlaceholder}
        RETURNING ${ADMIN_PACKAGE_COLUMNS}
      `,
      [...parts.values, id]
    );
    await writeAudit(db, adminUser, 'pricing_package', id, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminArchivePackage(id, adminUser) {
    const before = await adminGetPackage(id);
    const { rows } = await db.query(
      `
        UPDATE pricing_packages
        SET archived_at = NOW(), is_active = FALSE, updated_by = $2
        WHERE id = $1
        RETURNING ${ADMIN_PACKAGE_COLUMNS}
      `,
      [id, adminUserId(adminUser)]
    );
    await writeAudit(db, adminUser, 'pricing_package', id, 'archive', before, rows[0]);
    return rows[0] || null;
  }

  async function adminRestorePackage(id, adminUser) {
    const before = await adminGetPackage(id);
    const { rows } = await db.query(
      `
        UPDATE pricing_packages
        SET archived_at = NULL, is_active = TRUE, updated_by = $2
        WHERE id = $1
        RETURNING ${ADMIN_PACKAGE_COLUMNS}
      `,
      [id, adminUserId(adminUser)]
    );
    await writeAudit(db, adminUser, 'pricing_package', id, 'restore', before, rows[0]);
    return rows[0] || null;
  }

  async function adminToggleVisibility(id, adminUser) {
    const before = await adminGetPackage(id);
    const { rows } = await db.query(
      `
        UPDATE pricing_packages
        SET is_visible = NOT is_visible, updated_by = $2
        WHERE id = $1
        RETURNING ${ADMIN_PACKAGE_COLUMNS}
      `,
      [id, adminUserId(adminUser)]
    );
    await writeAudit(db, adminUser, 'pricing_package', id, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminUpdateSortOrder(orderData, adminUser) {
    const updated = [];

    for (const item of orderData || []) {
      const { rows } = await db.query(
        `
          UPDATE pricing_packages
          SET sort_order = $2, updated_by = $3
          WHERE id = $1
          RETURNING ${ADMIN_PACKAGE_COLUMNS}
        `,
        [item.id, item.sortOrder, adminUserId(adminUser)]
      );
      if (rows[0]) updated.push(rows[0]);
    }

    await writeAudit(db, adminUser, 'pricing_package', 'sort_order', 'update', null, updated);
    return updated;
  }

  async function adminAddFeature(packageId, data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_package_features (
          package_id, feature_text, feature_group, sort_order, is_visible
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
        RETURNING *
      `,
      [packageId, data.featureText, data.featureGroup || null, data.sortOrder || 0, data.isVisible]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_feature', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateFeature(featureId, data) {
    const before = await adminGetFeature(featureId);
    const { rows } = await db.query(
      `
        UPDATE pricing_package_features
        SET feature_text = COALESCE($2, feature_text),
            feature_group = COALESCE($3, feature_group),
            sort_order = COALESCE($4, sort_order),
            is_visible = COALESCE($5, is_visible)
        WHERE id = $1
        RETURNING *
      `,
      [featureId, data.featureText, data.featureGroup, data.sortOrder, data.isVisible]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_feature', featureId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminDeleteFeature(featureId, adminUser) {
    const before = await adminGetFeature(featureId);
    const { rows } = await db.query(
      'DELETE FROM pricing_package_features WHERE id = $1 RETURNING *',
      [featureId]
    );
    await writeAudit(db, adminUser, 'pricing_package_feature', featureId, 'delete', before, rows[0]);
    return rows[0] || null;
  }

  async function adminAddNotIncluded(packageId, data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_package_not_included (
          package_id, item_text, item_group, sort_order, is_visible
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
        RETURNING *
      `,
      [packageId, data.itemText, data.itemGroup || null, data.sortOrder || 0, data.isVisible]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_not_included', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateNotIncluded(itemId, data) {
    const before = await adminGetNotIncluded(itemId);
    const { rows } = await db.query(
      `
        UPDATE pricing_package_not_included
        SET item_text = COALESCE($2, item_text),
            item_group = COALESCE($3, item_group),
            sort_order = COALESCE($4, sort_order),
            is_visible = COALESCE($5, is_visible)
        WHERE id = $1
        RETURNING *
      `,
      [itemId, data.itemText, data.itemGroup, data.sortOrder, data.isVisible]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_not_included', itemId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminDeleteNotIncluded(itemId, adminUser) {
    const before = await adminGetNotIncluded(itemId);
    const { rows } = await db.query(
      'DELETE FROM pricing_package_not_included WHERE id = $1 RETURNING *',
      [itemId]
    );
    await writeAudit(db, adminUser, 'pricing_package_not_included', itemId, 'delete', before, rows[0]);
    return rows[0] || null;
  }

  async function adminGetFeature(featureId) {
    const { rows } = await db.query('SELECT * FROM pricing_package_features WHERE id = $1 LIMIT 1', [featureId]);
    return rows[0] || null;
  }

  async function adminGetNotIncluded(itemId) {
    const { rows } = await db.query('SELECT * FROM pricing_package_not_included WHERE id = $1 LIMIT 1', [itemId]);
    return rows[0] || null;
  }

  async function adminGetUseCase(useCaseId) {
    const { rows } = await db.query('SELECT * FROM pricing_package_use_cases WHERE id = $1 LIMIT 1', [useCaseId]);
    return rows[0] || null;
  }

  async function adminGetFaq(faqId) {
    const { rows } = await db.query('SELECT * FROM pricing_package_faqs WHERE id = $1 LIMIT 1', [faqId]);
    return rows[0] || null;
  }

  async function adminListPackageContent(packageId) {
    const [packageRow, features, notIncluded, useCases, faqs] = await Promise.all([
      adminGetPackage(packageId),
      db.query(
        'SELECT * FROM pricing_package_features WHERE package_id = $1 ORDER BY sort_order ASC, id ASC',
        [packageId]
      ),
      db.query(
        'SELECT * FROM pricing_package_not_included WHERE package_id = $1 ORDER BY sort_order ASC, id ASC',
        [packageId]
      ),
      db.query(
        'SELECT * FROM pricing_package_use_cases WHERE package_id = $1 ORDER BY sort_order ASC, id ASC',
        [packageId]
      ),
      db.query(
        'SELECT * FROM pricing_package_faqs WHERE package_id = $1 ORDER BY sort_order ASC, id ASC',
        [packageId]
      )
    ]);

    return {
      packageRow,
      features: features.rows,
      notIncluded: notIncluded.rows,
      useCases: useCases.rows,
      faqs: faqs.rows
    };
  }

  async function adminAddUseCase(packageId, data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_package_use_cases (
          package_id, use_case_text, sort_order, is_visible
        )
        VALUES ($1, $2, $3, COALESCE($4, TRUE))
        RETURNING *
      `,
      [packageId, data.useCaseText, data.sortOrder || 0, data.isVisible]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_use_case', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateUseCase(useCaseId, data) {
    const before = await adminGetUseCase(useCaseId);
    const { rows } = await db.query(
      `
        UPDATE pricing_package_use_cases
        SET use_case_text = COALESCE($2, use_case_text),
            sort_order = COALESCE($3, sort_order),
            is_visible = COALESCE($4, is_visible)
        WHERE id = $1
        RETURNING *
      `,
      [useCaseId, data.useCaseText, data.sortOrder, data.isVisible]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_use_case', useCaseId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminDeleteUseCase(useCaseId, adminUser) {
    const before = await adminGetUseCase(useCaseId);
    const { rows } = await db.query(
      'DELETE FROM pricing_package_use_cases WHERE id = $1 RETURNING *',
      [useCaseId]
    );
    await writeAudit(db, adminUser, 'pricing_package_use_case', useCaseId, 'delete', before, rows[0]);
    return rows[0] || null;
  }

  async function adminAddFaq(packageId, data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_package_faqs (
          package_id, question, answer, category, show_on_overview,
          show_on_detail, schema_eligible, sort_order, is_visible
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, FALSE), COALESCE($6, TRUE), COALESCE($7, TRUE), $8, COALESCE($9, TRUE))
        RETURNING *
      `,
      [
        packageId,
        data.question,
        data.answer,
        data.category || null,
        data.showOnOverview,
        data.showOnDetail,
        data.schemaEligible,
        data.sortOrder || 0,
        data.isVisible
      ]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_faq', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateFaq(faqId, data) {
    const before = await adminGetFaq(faqId);
    const { rows } = await db.query(
      `
        UPDATE pricing_package_faqs
        SET question = COALESCE($2, question),
            answer = COALESCE($3, answer),
            category = COALESCE($4, category),
            show_on_overview = COALESCE($5, show_on_overview),
            show_on_detail = COALESCE($6, show_on_detail),
            schema_eligible = COALESCE($7, schema_eligible),
            sort_order = COALESCE($8, sort_order),
            is_visible = COALESCE($9, is_visible)
        WHERE id = $1
        RETURNING *
      `,
      [
        faqId,
        data.question,
        data.answer,
        data.category,
        data.showOnOverview,
        data.showOnDetail,
        data.schemaEligible,
        data.sortOrder,
        data.isVisible
      ]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_faq', faqId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminDeleteFaq(faqId, adminUser) {
    const before = await adminGetFaq(faqId);
    const { rows } = await db.query('DELETE FROM pricing_package_faqs WHERE id = $1 RETURNING *', [faqId]);
    await writeAudit(db, adminUser, 'pricing_package_faq', faqId, 'delete', before, rows[0]);
    return rows[0] || null;
  }

  async function adminListComparisonAdmin() {
    const [packages, rows, values] = await Promise.all([
      adminListPackages(),
      db.query('SELECT * FROM pricing_comparison_rows ORDER BY sort_order ASC, id ASC'),
      db.query('SELECT * FROM pricing_comparison_values ORDER BY row_id ASC, sort_order ASC, id ASC')
    ]);
    return { packages, rows: rows.rows, values: values.rows };
  }

  async function adminGetComparisonRow(rowId) {
    const { rows } = await db.query('SELECT * FROM pricing_comparison_rows WHERE id = $1 LIMIT 1', [rowId]);
    return rows[0] || null;
  }

  async function adminAddComparisonRow(data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_comparison_rows (row_key, label, description, sort_order, is_visible)
        VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
        RETURNING *
      `,
      [data.rowKey, data.label, data.description || null, data.sortOrder || 0, data.isVisible]
    );
    await writeAudit(db, data.adminUser, 'pricing_comparison_row', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateComparisonRow(rowId, data) {
    const before = await adminGetComparisonRow(rowId);
    const parts = genericUpdateParts(data, comparisonRowColumns);
    if (!parts.fields.length) return before;

    const idPlaceholder = `$${parts.values.length + 1}`;
    const { rows } = await db.query(
      `
        UPDATE pricing_comparison_rows
        SET ${parts.setSql.join(', ')}
        WHERE id = ${idPlaceholder}
        RETURNING *
      `,
      [...parts.values, rowId]
    );
    await writeAudit(db, data.adminUser, 'pricing_comparison_row', rowId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminUpsertComparisonValue(data) {
    const existing = await db.query(
      'SELECT * FROM pricing_comparison_values WHERE row_id = $1 AND package_id = $2 LIMIT 1',
      [data.rowId, data.packageId]
    );
    const before = existing.rows[0] || null;
    const { rows } = await db.query(
      `
        INSERT INTO pricing_comparison_values (row_id, package_id, value, highlight, sort_order)
        VALUES ($1, $2, $3, COALESCE($4, FALSE), $5)
        ON CONFLICT (row_id, package_id)
        DO UPDATE SET value = EXCLUDED.value,
                      highlight = EXCLUDED.highlight,
                      sort_order = EXCLUDED.sort_order,
                      updated_at = NOW()
        RETURNING *
      `,
      [data.rowId, data.packageId, data.value, data.highlight, data.sortOrder || 0]
    );
    await writeAudit(
      db,
      data.adminUser,
      'pricing_comparison_value',
      rows[0].id,
      before ? 'update' : 'create',
      before,
      rows[0]
    );
    return rows[0];
  }

  async function adminListGlobalNotes() {
    const { rows } = await db.query('SELECT * FROM pricing_global_notes ORDER BY sort_order ASC, id ASC');
    return rows;
  }

  async function adminGetGlobalNote(noteId) {
    const { rows } = await db.query('SELECT * FROM pricing_global_notes WHERE id = $1 LIMIT 1', [noteId]);
    return rows[0] || null;
  }

  async function adminUpdateGlobalNote(noteId, data) {
    const before = await adminGetGlobalNote(noteId);
    const parts = genericUpdateParts(data, globalNoteColumns);
    if (!parts.fields.length) return before;

    const idPlaceholder = `$${parts.values.length + 1}`;
    const { rows } = await db.query(
      `
        UPDATE pricing_global_notes
        SET ${parts.setSql.join(', ')}
        WHERE id = ${idPlaceholder}
        RETURNING *
      `,
      [...parts.values, noteId]
    );
    await writeAudit(db, data.adminUser, 'pricing_global_note', noteId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminListRedirects() {
    const { rows } = await db.query(
      `
        SELECT redirect_data.*, package_data.package_key, package_data.display_name
        FROM pricing_package_redirects redirect_data
        LEFT JOIN pricing_packages package_data
          ON package_data.id = redirect_data.package_id
        ORDER BY redirect_data.old_path ASC, redirect_data.id ASC
      `
    );
    return rows;
  }

  async function adminGetRedirect(redirectId) {
    const { rows } = await db.query('SELECT * FROM pricing_package_redirects WHERE id = $1 LIMIT 1', [redirectId]);
    return rows[0] || null;
  }

  async function adminCreateRedirect(data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_package_redirects (
          package_id, old_path, target_path, status_code, is_active
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
        RETURNING *
      `,
      [data.packageId, data.oldPath, data.targetPath, data.statusCode || 301, data.isActive]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_redirect', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateRedirect(redirectId, data) {
    const before = await adminGetRedirect(redirectId);
    const parts = genericUpdateParts(data, redirectColumns);
    if (!parts.fields.length) return before;

    const idPlaceholder = `$${parts.values.length + 1}`;
    const { rows } = await db.query(
      `
        UPDATE pricing_package_redirects
        SET ${parts.setSql.join(', ')}
        WHERE id = ${idPlaceholder}
        RETURNING *
      `,
      [...parts.values, redirectId]
    );
    await writeAudit(db, data.adminUser, 'pricing_package_redirect', redirectId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function getVisibleAddOns() {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_ADDON_COLUMNS}
        FROM pricing_addons
        WHERE ${PUBLIC_ADDON_WHERE}
        ORDER BY sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function getVisibleMaintenancePlans() {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
        FROM pricing_maintenance_plans
        WHERE ${PUBLIC_MAINTENANCE_PLAN_WHERE}
        ORDER BY sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function adminListAddOns() {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_ADDON_COLUMNS}
        FROM pricing_addons
        ORDER BY COALESCE(archived_at, 'infinity'::timestamptz) ASC,
                 sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function adminGetAddOn(addonId) {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_ADDON_COLUMNS}
        FROM pricing_addons
        WHERE id = $1
        LIMIT 1
      `,
      [addonId]
    );
    return rows[0] || null;
  }

  async function adminCreateAddOn(data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_addons (
          addon_key, name, category, price_from_cents, price_to_cents,
          price_label, short_description, long_description, third_party_note,
          cta_label, cta_url, is_active, is_visible, sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, TRUE), COALESCE($13, TRUE), $14)
        RETURNING ${PUBLIC_ADDON_COLUMNS}
      `,
      [
        data.addonKey,
        data.name,
        data.category,
        data.priceFromCents,
        data.priceToCents,
        data.priceLabel,
        data.shortDescription,
        data.longDescription,
        data.thirdPartyNote,
        data.ctaLabel,
        data.ctaUrl,
        data.isActive,
        data.isVisible,
        data.sortOrder || 0
      ]
    );
    await writeAudit(db, data.adminUser, 'pricing_addon', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateAddOn(addonId, data) {
    const before = await adminGetAddOn(addonId);
    const parts = genericUpdateParts(data, addonColumns);
    if (!parts.fields.length) return before;

    const idPlaceholder = `$${parts.values.length + 1}`;
    const { rows } = await db.query(
      `
        UPDATE pricing_addons
        SET ${parts.setSql.join(', ')}
        WHERE id = ${idPlaceholder}
        RETURNING ${PUBLIC_ADDON_COLUMNS}
      `,
      [...parts.values, addonId]
    );
    await writeAudit(db, data.adminUser, 'pricing_addon', addonId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminArchiveAddOn(addonId, adminUser) {
    const before = await adminGetAddOn(addonId);
    const { rows } = await db.query(
      `
        UPDATE pricing_addons
        SET is_active = FALSE,
            is_visible = FALSE,
            archived_at = NOW()
        WHERE id = $1
        RETURNING ${PUBLIC_ADDON_COLUMNS}
      `,
      [addonId]
    );
    await writeAudit(db, adminUser, 'pricing_addon', addonId, 'archive', before, rows[0]);
    return rows[0] || null;
  }

  async function adminRestoreAddOn(addonId, adminUser) {
    const before = await adminGetAddOn(addonId);
    const { rows } = await db.query(
      `
        UPDATE pricing_addons
        SET is_active = TRUE,
            is_visible = TRUE,
            archived_at = NULL
        WHERE id = $1
        RETURNING ${PUBLIC_ADDON_COLUMNS}
      `,
      [addonId]
    );
    await writeAudit(db, adminUser, 'pricing_addon', addonId, 'restore', before, rows[0]);
    return rows[0] || null;
  }

  async function adminToggleAddOnVisibility(addonId, adminUser) {
    const before = await adminGetAddOn(addonId);
    const { rows } = await db.query(
      `
        UPDATE pricing_addons
        SET is_visible = NOT is_visible
        WHERE id = $1
        RETURNING ${PUBLIC_ADDON_COLUMNS}
      `,
      [addonId]
    );
    await writeAudit(db, adminUser, 'pricing_addon', addonId, rows[0]?.is_visible ? 'publish' : 'unpublish', before, rows[0]);
    return rows[0] || null;
  }

  async function adminUpdateAddOnSortOrder(orderData = [], adminUser) {
    const updated = [];
    for (const item of orderData) {
      const before = await adminGetAddOn(item.id);
      const { rows } = await db.query(
        `
          UPDATE pricing_addons
          SET sort_order = $2
          WHERE id = $1
          RETURNING ${PUBLIC_ADDON_COLUMNS}
        `,
        [item.id, item.sortOrder]
      );
      if (rows[0]) {
        await writeAudit(db, adminUser, 'pricing_addon', item.id, 'update', before, rows[0]);
        updated.push(rows[0]);
      }
    }
    return updated;
  }

  async function adminListMaintenancePlans() {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
        FROM pricing_maintenance_plans
        ORDER BY COALESCE(archived_at, 'infinity'::timestamptz) ASC,
                 sort_order ASC, id ASC
      `
    );
    return rows;
  }

  async function adminGetMaintenancePlan(planId) {
    const { rows } = await db.query(
      `
        SELECT ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
        FROM pricing_maintenance_plans
        WHERE id = $1
        LIMIT 1
      `,
      [planId]
    );
    return rows[0] || null;
  }

  async function adminCreateMaintenancePlan(data) {
    const { rows } = await db.query(
      `
        INSERT INTO pricing_maintenance_plans (
          plan_key, name, price_from_cents, price_label, billing_cycle,
          short_description, included, not_included, response_time,
          content_change_allowance, emergency_note, third_party_note,
          cancellation_note, cta_label, cta_url, is_recommended,
          is_active, is_visible, sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::TEXT[], $8::TEXT[], $9, $10, $11, $12, $13, $14, $15, COALESCE($16, FALSE), COALESCE($17, TRUE), COALESCE($18, TRUE), $19)
        RETURNING ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
      `,
      [
        data.planKey,
        data.name,
        data.priceFromCents,
        data.priceLabel,
        data.billingCycle,
        data.shortDescription,
        data.included || [],
        data.notIncluded || [],
        data.responseTime,
        data.contentChangeAllowance,
        data.emergencyNote,
        data.thirdPartyNote,
        data.cancellationNote,
        data.ctaLabel,
        data.ctaUrl,
        data.isRecommended,
        data.isActive,
        data.isVisible,
        data.sortOrder || 0
      ]
    );
    await writeAudit(db, data.adminUser, 'pricing_maintenance_plan', rows[0].id, 'create', null, rows[0]);
    return rows[0];
  }

  async function adminUpdateMaintenancePlan(planId, data) {
    const before = await adminGetMaintenancePlan(planId);
    const parts = genericUpdateParts(data, maintenancePlanColumns);
    if (!parts.fields.length) return before;

    const idPlaceholder = `$${parts.values.length + 1}`;
    const { rows } = await db.query(
      `
        UPDATE pricing_maintenance_plans
        SET ${parts.setSql.join(', ')}
        WHERE id = ${idPlaceholder}
        RETURNING ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
      `,
      [...parts.values, planId]
    );
    await writeAudit(db, data.adminUser, 'pricing_maintenance_plan', planId, 'update', before, rows[0]);
    return rows[0] || null;
  }

  async function adminArchiveMaintenancePlan(planId, adminUser) {
    const before = await adminGetMaintenancePlan(planId);
    const { rows } = await db.query(
      `
        UPDATE pricing_maintenance_plans
        SET is_active = FALSE,
            is_visible = FALSE,
            archived_at = NOW()
        WHERE id = $1
        RETURNING ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
      `,
      [planId]
    );
    await writeAudit(db, adminUser, 'pricing_maintenance_plan', planId, 'archive', before, rows[0]);
    return rows[0] || null;
  }

  async function adminRestoreMaintenancePlan(planId, adminUser) {
    const before = await adminGetMaintenancePlan(planId);
    const { rows } = await db.query(
      `
        UPDATE pricing_maintenance_plans
        SET is_active = TRUE,
            is_visible = TRUE,
            archived_at = NULL
        WHERE id = $1
        RETURNING ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
      `,
      [planId]
    );
    await writeAudit(db, adminUser, 'pricing_maintenance_plan', planId, 'restore', before, rows[0]);
    return rows[0] || null;
  }

  async function adminToggleMaintenancePlanVisibility(planId, adminUser) {
    const before = await adminGetMaintenancePlan(planId);
    const { rows } = await db.query(
      `
        UPDATE pricing_maintenance_plans
        SET is_visible = NOT is_visible
        WHERE id = $1
        RETURNING ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
      `,
      [planId]
    );
    await writeAudit(db, adminUser, 'pricing_maintenance_plan', planId, rows[0]?.is_visible ? 'publish' : 'unpublish', before, rows[0]);
    return rows[0] || null;
  }

  async function adminUpdateMaintenancePlanSortOrder(orderData = [], adminUser) {
    const updated = [];
    for (const item of orderData) {
      const before = await adminGetMaintenancePlan(item.id);
      const { rows } = await db.query(
        `
          UPDATE pricing_maintenance_plans
          SET sort_order = $2
          WHERE id = $1
          RETURNING ${PUBLIC_MAINTENANCE_PLAN_COLUMNS}
        `,
        [item.id, item.sortOrder]
      );
      if (rows[0]) {
        await writeAudit(db, adminUser, 'pricing_maintenance_plan', item.id, 'update', before, rows[0]);
        updated.push(rows[0]);
      }
    }
    return updated;
  }

  return {
    getVisiblePackages,
    getPackagesForOverview,
    getPackagesForHome,
    getPackagesForComparison,
    getPackagesForContactForm,
    getPackageBySlug,
    getPackageByKey,
    getPackageFeatures,
    getPackageNotIncluded,
    getPackageUseCases,
    getPackageFaqs,
    getPackageWithDetailsBySlug,
    getPackageComparisonRows,
    getPackageRedirectByOldPath,
    getGlobalPricingNotes,
    getVisibleAddOns,
    getVisibleMaintenancePlans,
    getLowestVisiblePackagePrice,
    getPackagePriceMap,
    adminListPackages,
    adminGetPackage,
    adminCreatePackage,
    adminUpdatePackage,
    adminArchivePackage,
    adminRestorePackage,
    adminToggleVisibility,
    adminUpdateSortOrder,
    adminListPackageContent,
    adminAddFeature,
    adminUpdateFeature,
    adminDeleteFeature,
    adminAddNotIncluded,
    adminUpdateNotIncluded,
    adminDeleteNotIncluded,
    adminAddUseCase,
    adminUpdateUseCase,
    adminDeleteUseCase,
    adminAddFaq,
    adminUpdateFaq,
    adminDeleteFaq,
    adminListComparisonAdmin,
    adminAddComparisonRow,
    adminUpdateComparisonRow,
    adminUpsertComparisonValue,
    adminListGlobalNotes,
    adminUpdateGlobalNote,
    adminListRedirects,
    adminCreateRedirect,
    adminUpdateRedirect,
    adminListAddOns,
    adminGetAddOn,
    adminCreateAddOn,
    adminUpdateAddOn,
    adminArchiveAddOn,
    adminRestoreAddOn,
    adminToggleAddOnVisibility,
    adminUpdateAddOnSortOrder,
    adminListMaintenancePlans,
    adminGetMaintenancePlan,
    adminCreateMaintenancePlan,
    adminUpdateMaintenancePlan,
    adminArchiveMaintenancePlan,
    adminRestoreMaintenancePlan,
    adminToggleMaintenancePlanVisibility,
    adminUpdateMaintenancePlanSortOrder
  };
}

export default createPricingRepository();
