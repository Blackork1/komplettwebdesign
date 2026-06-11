import { formatCurrencyCents, getPriceLabel, getPublicPackageLabel } from './priceFormatter.js';

function value(row, camelName, snakeName) {
  return row?.[camelName] ?? row?.[snakeName] ?? null;
}

const packagePriceTextPatterns = {
  start: [/ab(?:\s|\u00a0|&nbsp;)*799(?:\s|\u00a0|&nbsp;)*€/gi],
  business: [/ab(?:\s|\u00a0|&nbsp;)*1\.499(?:\s|\u00a0|&nbsp;)*€/gi],
  wachstum: [/ab(?:\s|\u00a0|&nbsp;)*2\.499(?:\s|\u00a0|&nbsp;)*€/gi],
  individuell: [/ab(?:\s|\u00a0|&nbsp;)*3\.500(?:\s|\u00a0|&nbsp;)*€(?:\s+oder\s+nach\s+Aufwand)?/gi]
};

function syncPackagePriceText(text, packageKey, priceLabel) {
  if (typeof text !== 'string' || !text || !packageKey || !priceLabel) return text;

  let output = text.replace(/\{\{\s*(?:priceLabel|package\.priceLabel)\s*\}\}/gi, priceLabel);
  for (const pattern of packagePriceTextPatterns[packageKey] || []) {
    output = output.replace(pattern, priceLabel);
  }
  return output;
}

export function mapPublicPackage(row) {
  if (!row) return null;

  const mapped = {
    id: value(row, 'id', 'id'),
    packageKey: value(row, 'packageKey', 'package_key'),
    name: value(row, 'name', 'name'),
    displayName: value(row, 'displayName', 'display_name'),
    slug: value(row, 'slug', 'slug'),
    canonicalPath: value(row, 'canonicalPath', 'canonical_path'),
    priceAmountCents: value(row, 'priceAmountCents', 'price_amount_cents'),
    priceCurrency: value(row, 'priceCurrency', 'price_currency') || 'EUR',
    pricePrefix: value(row, 'pricePrefix', 'price_prefix'),
    priceSuffix: value(row, 'priceSuffix', 'price_suffix'),
    priceLabelOverride: value(row, 'priceLabelOverride', 'price_label_override'),
    priceType: value(row, 'priceType', 'price_type'),
    vatNote: value(row, 'vatNote', 'vat_note'),
    shortDescription: value(row, 'shortDescription', 'short_description'),
    longDescription: value(row, 'longDescription', 'long_description'),
    positioning: value(row, 'positioning', 'positioning'),
    targetGroup: value(row, 'targetGroup', 'target_group'),
    notFor: value(row, 'notFor', 'not_for'),
    pageScope: value(row, 'pageScope', 'page_scope'),
    textScope: value(row, 'textScope', 'text_scope'),
    seoScope: value(row, 'seoScope', 'seo_scope'),
    techScope: value(row, 'techScope', 'tech_scope'),
    feedbackRounds: value(row, 'feedbackRounds', 'feedback_rounds'),
    timeline: value(row, 'timeline', 'timeline'),
    ctaLabel: value(row, 'ctaLabel', 'cta_label'),
    ctaUrl: value(row, 'ctaUrl', 'cta_url'),
    secondaryCtaLabel: value(row, 'secondaryCtaLabel', 'secondary_cta_label'),
    secondaryCtaUrl: value(row, 'secondaryCtaUrl', 'secondary_cta_url'),
    isRecommended: Boolean(value(row, 'isRecommended', 'is_recommended')),
    recommendationLabel: value(row, 'recommendationLabel', 'recommendation_label'),
    sortOrder: value(row, 'sortOrder', 'sort_order') ?? 0,
    isActive: Boolean(value(row, 'isActive', 'is_active')),
    isVisible: Boolean(value(row, 'isVisible', 'is_visible')),
    showInComparison: Boolean(value(row, 'showInComparison', 'show_in_comparison')),
    showInContactForm: Boolean(value(row, 'showInContactForm', 'show_in_contact_form')),
    allowDetailPage: Boolean(value(row, 'allowDetailPage', 'allow_detail_page')),
    metaTitle: value(row, 'metaTitle', 'meta_title'),
    metaDescription: value(row, 'metaDescription', 'meta_description'),
    h1: value(row, 'h1', 'h1'),
    schemaType: value(row, 'schemaType', 'schema_type')
  };

  mapped.priceLabel = getPriceLabel(mapped);
  mapped.publicLabel = getPublicPackageLabel(mapped);
  mapped.metaTitle = syncPackagePriceText(mapped.metaTitle, mapped.packageKey, mapped.priceLabel);
  mapped.metaDescription = syncPackagePriceText(mapped.metaDescription, mapped.packageKey, mapped.priceLabel);
  mapped.h1 = syncPackagePriceText(mapped.h1, mapped.packageKey, mapped.priceLabel);

  return mapped;
}

export function mapAdminPackage(row) {
  const mapped = mapPublicPackage(row);
  if (!mapped) return null;

  return {
    ...mapped,
    adminNote: value(row, 'adminNote', 'admin_note'),
    createdAt: value(row, 'createdAt', 'created_at'),
    updatedAt: value(row, 'updatedAt', 'updated_at'),
    archivedAt: value(row, 'archivedAt', 'archived_at'),
    createdBy: value(row, 'createdBy', 'created_by'),
    updatedBy: value(row, 'updatedBy', 'updated_by')
  };
}

export function mapPackageFeature(item) {
  return {
    id: item.id,
    text: item.feature_text,
    group: item.feature_group,
    sortOrder: item.sort_order,
    isVisible: item.is_visible
  };
}

export function mapPackageNotIncluded(item) {
  return {
    id: item.id,
    text: item.item_text,
    group: item.item_group,
    sortOrder: item.sort_order,
    isVisible: item.is_visible
  };
}

export function mapPackageUseCase(item) {
  return {
    id: item.id,
    text: item.use_case_text,
    sortOrder: item.sort_order,
    isVisible: item.is_visible
  };
}

export function mapPackageFaq(item) {
  return {
    id: item.id,
    question: item.question,
    answer: item.answer,
    category: item.category,
    showOnOverview: item.show_on_overview,
    showOnDetail: item.show_on_detail,
    schemaEligible: item.schema_eligible,
    sortOrder: item.sort_order,
    isVisible: item.is_visible
  };
}

export function mapGlobalPricingNote(row) {
  return {
    id: row.id,
    noteKey: row.note_key,
    title: row.title,
    body: row.body,
    context: row.context,
    sortOrder: row.sort_order
  };
}

function addOnPriceLabel(row) {
  if (value(row, 'priceLabel', 'price_label')) return value(row, 'priceLabel', 'price_label');

  const from = value(row, 'priceFromCents', 'price_from_cents');
  const to = value(row, 'priceToCents', 'price_to_cents');
  if (Number.isInteger(from) && Number.isInteger(to)) {
    return `ab ${formatCurrencyCents(from, 'EUR').replace(/\s€$/, '')}–${formatCurrencyCents(to, 'EUR')}`;
  }
  if (Number.isInteger(from)) return `ab ${formatCurrencyCents(from, 'EUR')}`;
  return 'nach Aufwand';
}

export function mapPricingAddOn(row) {
  if (!row) return null;

  return {
    id: value(row, 'addonKey', 'addon_key'),
    dbId: value(row, 'id', 'id'),
    addonKey: value(row, 'addonKey', 'addon_key'),
    name: value(row, 'name', 'name'),
    category: value(row, 'category', 'category'),
    priceFromCents: value(row, 'priceFromCents', 'price_from_cents'),
    priceToCents: value(row, 'priceToCents', 'price_to_cents'),
    priceLabel: addOnPriceLabel(row),
    shortDescription: value(row, 'shortDescription', 'short_description'),
    longDescription: value(row, 'longDescription', 'long_description'),
    whenUseful: value(row, 'longDescription', 'long_description'),
    thirdPartyNote: value(row, 'thirdPartyNote', 'third_party_note'),
    thirdPartyCostNote: value(row, 'thirdPartyNote', 'third_party_note'),
    ctaLabel: value(row, 'ctaLabel', 'cta_label') || 'Zusatzleistung anfragen',
    ctaUrl: value(row, 'ctaUrl', 'cta_url') || '/kontakt?projektart=zusatzleistung',
    isActive: Boolean(value(row, 'isActive', 'is_active')),
    isVisible: Boolean(value(row, 'isVisible', 'is_visible')),
    sortOrder: value(row, 'sortOrder', 'sort_order') ?? 0,
    archivedAt: value(row, 'archivedAt', 'archived_at'),
    createdAt: value(row, 'createdAt', 'created_at'),
    updatedAt: value(row, 'updatedAt', 'updated_at')
  };
}

export function mapMaintenancePlan(row) {
  if (!row) return null;

  const planKey = value(row, 'planKey', 'plan_key');
  const priceLabel = value(row, 'priceLabel', 'price_label')
    || (Number.isInteger(value(row, 'priceFromCents', 'price_from_cents'))
      ? `ab ${formatCurrencyCents(value(row, 'priceFromCents', 'price_from_cents'), 'EUR')}/Monat`
      : 'nach Angebot');

  return {
    id: planKey,
    dbId: value(row, 'id', 'id'),
    planKey,
    name: value(row, 'name', 'name'),
    priceFromCents: value(row, 'priceFromCents', 'price_from_cents'),
    priceLabel,
    billingCycle: value(row, 'billingCycle', 'billing_cycle'),
    shortDescription: value(row, 'shortDescription', 'short_description'),
    included: value(row, 'included', 'included') || [],
    notIncluded: value(row, 'notIncluded', 'not_included') || [],
    responseTime: value(row, 'responseTime', 'response_time'),
    contentChangeAllowance: value(row, 'contentChangeAllowance', 'content_change_allowance'),
    emergencyNote: value(row, 'emergencyNote', 'emergency_note')
      || 'Akute Probleme werden nach Verfügbarkeit und vereinbartem Umfang eingeordnet.',
    thirdPartyNote: value(row, 'thirdPartyNote', 'third_party_note'),
    cancellationNote: value(row, 'cancellationNote', 'cancellation_note'),
    ctaLabel: value(row, 'ctaLabel', 'cta_label') || `${value(row, 'name', 'name') || 'Wartung'} anfragen`,
    ctaUrl: value(row, 'ctaUrl', 'cta_url') || '/kontakt?projektart=maintenance',
    isRecommended: Boolean(value(row, 'isRecommended', 'is_recommended')),
    isActive: Boolean(value(row, 'isActive', 'is_active')),
    isVisible: Boolean(value(row, 'isVisible', 'is_visible')),
    sortOrder: value(row, 'sortOrder', 'sort_order') ?? 0,
    archivedAt: value(row, 'archivedAt', 'archived_at'),
    createdAt: value(row, 'createdAt', 'created_at'),
    updatedAt: value(row, 'updatedAt', 'updated_at')
  };
}

export function mapComparisonRows(rows = []) {
  const rowsByKey = new Map();

  for (const row of rows) {
    const rowId = row.row_id;
    if (!rowsByKey.has(rowId)) {
      rowsByKey.set(rowId, {
        id: row.row_id,
        rowKey: row.row_key,
        label: row.label,
        description: row.description,
        sortOrder: row.row_sort_order,
        values: []
      });
    }

    if (row.package_key) {
      rowsByKey.get(rowId).values.push({
        id: row.value_id,
        packageKey: row.package_key,
        slug: row.slug,
        packageName: row.package_name,
        value: row.value,
        highlight: row.highlight,
        sortOrder: row.value_sort_order
      });
    }
  }

  return [...rowsByKey.values()];
}

export function mapPackageDetails({ packageRow, features = [], notIncluded = [], useCases = [], faqs = [] }) {
  const mappedPackage = mapPublicPackage(packageRow);
  if (!mappedPackage) return null;

  return {
    ...mappedPackage,
    features: features.map(mapPackageFeature),
    notIncluded: notIncluded.map(mapPackageNotIncluded),
    useCases: useCases.map(mapPackageUseCase),
    faqs: faqs.map(mapPackageFaq)
  };
}
