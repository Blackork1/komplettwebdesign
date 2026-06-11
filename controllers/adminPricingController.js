import pricingService from '../services/pricingService.js';
import { formatCurrencyCents, getPriceLabel } from '../util/priceFormatter.js';

const PRICE_TYPES = new Set(['from', 'fixed', 'range', 'custom', 'on_request']);
const BILLING_CYCLES = new Set(['monthly', 'yearly', 'one_time', 'custom']);
const INTERNAL_URL_PATTERN = /^\/(?!\/)[^\s]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY_PATTERN = /^[a-z0-9_-]+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

const RISK_TERMS = [
  '499',
  '899',
  'Basis',
  'Premium',
  'Wartung ab 5',
  'Buchungssystem inklusive',
  'Shop inklusive',
  'CMS inklusive',
  'unbegrenzte Änderungen',
  'rechtssicher',
  'DSGVO-konform',
  'Ranking garantiert',
  'alles inklusive',
  'keine versteckten Kosten'
];

const DEFAULT_PACKAGE = {
  packageKey: '',
  name: '',
  displayName: '',
  slug: '',
  canonicalPath: '',
  sortOrder: 0,
  priceAmountCents: null,
  priceCurrency: 'EUR',
  pricePrefix: 'ab',
  priceSuffix: '',
  priceLabelOverride: '',
  priceType: 'from',
  vatNote: 'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
  isActive: true,
  isVisible: true,
  showInContactForm: true,
  showInComparison: true,
  allowDetailPage: true,
  isRecommended: false,
  recommendationLabel: '',
  shortDescription: '',
  longDescription: '',
  positioning: '',
  targetGroup: '',
  notFor: '',
  pageScope: '',
  textScope: '',
  seoScope: '',
  techScope: '',
  feedbackRounds: '',
  timeline: '',
  ctaLabel: '',
  ctaUrl: '',
  secondaryCtaLabel: '',
  secondaryCtaUrl: '',
  metaTitle: '',
  metaDescription: '',
  h1: '',
  schemaType: 'Service',
  adminNote: ''
};

function firstValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function textValue(value) {
  return String(firstValue(value) ?? '').trim();
}

function boolValue(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function parseInteger(value, fallback = 0) {
  const raw = textValue(value);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parsePriceAmountCents(value) {
  const raw = textValue(value);
  if (!raw) return null;
  const normalized = raw
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100);
}

function centsToEuroInput(amountCents) {
  if (amountCents === null || amountCents === undefined || amountCents === '') return '';
  if (!Number.isInteger(Number(amountCents))) return '';
  const cents = Number(amountCents);
  const euros = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100);
  return rest ? `${euros},${String(rest).padStart(2, '0')}` : String(euros);
}

function rowValue(row, camelName, snakeName) {
  return row?.[camelName] ?? row?.[snakeName] ?? DEFAULT_PACKAGE[camelName] ?? '';
}

function packageToFormRow(row = {}) {
  return {
    id: rowValue(row, 'id', 'id'),
    packageKey: rowValue(row, 'packageKey', 'package_key'),
    name: rowValue(row, 'name', 'name'),
    displayName: rowValue(row, 'displayName', 'display_name'),
    slug: rowValue(row, 'slug', 'slug'),
    canonicalPath: rowValue(row, 'canonicalPath', 'canonical_path'),
    sortOrder: rowValue(row, 'sortOrder', 'sort_order'),
    priceAmountCents: rowValue(row, 'priceAmountCents', 'price_amount_cents'),
    priceAmountEuro: centsToEuroInput(rowValue(row, 'priceAmountCents', 'price_amount_cents')),
    priceCurrency: rowValue(row, 'priceCurrency', 'price_currency') || 'EUR',
    pricePrefix: rowValue(row, 'pricePrefix', 'price_prefix'),
    priceSuffix: rowValue(row, 'priceSuffix', 'price_suffix'),
    priceLabelOverride: rowValue(row, 'priceLabelOverride', 'price_label_override'),
    priceType: rowValue(row, 'priceType', 'price_type') || 'from',
    vatNote: rowValue(row, 'vatNote', 'vat_note'),
    isActive: Boolean(rowValue(row, 'isActive', 'is_active')),
    isVisible: Boolean(rowValue(row, 'isVisible', 'is_visible')),
    showInContactForm: Boolean(rowValue(row, 'showInContactForm', 'show_in_contact_form')),
    showInComparison: Boolean(rowValue(row, 'showInComparison', 'show_in_comparison')),
    allowDetailPage: Boolean(rowValue(row, 'allowDetailPage', 'allow_detail_page')),
    isRecommended: Boolean(rowValue(row, 'isRecommended', 'is_recommended')),
    recommendationLabel: rowValue(row, 'recommendationLabel', 'recommendation_label'),
    shortDescription: rowValue(row, 'shortDescription', 'short_description'),
    longDescription: rowValue(row, 'longDescription', 'long_description'),
    positioning: rowValue(row, 'positioning', 'positioning'),
    targetGroup: rowValue(row, 'targetGroup', 'target_group'),
    notFor: rowValue(row, 'notFor', 'not_for'),
    pageScope: rowValue(row, 'pageScope', 'page_scope'),
    textScope: rowValue(row, 'textScope', 'text_scope'),
    seoScope: rowValue(row, 'seoScope', 'seo_scope'),
    techScope: rowValue(row, 'techScope', 'tech_scope'),
    feedbackRounds: rowValue(row, 'feedbackRounds', 'feedback_rounds'),
    timeline: rowValue(row, 'timeline', 'timeline'),
    ctaLabel: rowValue(row, 'ctaLabel', 'cta_label'),
    ctaUrl: rowValue(row, 'ctaUrl', 'cta_url'),
    secondaryCtaLabel: rowValue(row, 'secondaryCtaLabel', 'secondary_cta_label'),
    secondaryCtaUrl: rowValue(row, 'secondaryCtaUrl', 'secondary_cta_url'),
    metaTitle: rowValue(row, 'metaTitle', 'meta_title'),
    metaDescription: rowValue(row, 'metaDescription', 'meta_description'),
    h1: rowValue(row, 'h1', 'h1'),
    schemaType: rowValue(row, 'schemaType', 'schema_type'),
    adminNote: rowValue(row, 'adminNote', 'admin_note'),
    updatedAt: rowValue(row, 'updatedAt', 'updated_at'),
    archivedAt: rowValue(row, 'archivedAt', 'archived_at')
  };
}

export function normalizePackageFormBody(body = {}) {
  return {
    packageKey: textValue(body.package_key),
    name: textValue(body.name),
    displayName: textValue(body.display_name),
    slug: textValue(body.slug),
    canonicalPath: textValue(body.canonical_path),
    sortOrder: parseInteger(body.sort_order, 0),
    priceAmountCents: parsePriceAmountCents(body.price_amount_cents || body.price_amount_euro),
    priceCurrency: textValue(body.price_currency || 'EUR').toUpperCase(),
    pricePrefix: textValue(body.price_prefix),
    priceSuffix: textValue(body.price_suffix),
    priceLabelOverride: textValue(body.price_label_override),
    priceType: textValue(body.price_type || 'from'),
    vatNote: textValue(body.vat_note),
    isActive: boolValue(body.is_active),
    isVisible: boolValue(body.is_visible),
    showInContactForm: boolValue(body.show_in_contact_form),
    showInComparison: boolValue(body.show_in_comparison),
    allowDetailPage: boolValue(body.allow_detail_page),
    isRecommended: boolValue(body.is_recommended),
    recommendationLabel: textValue(body.recommendation_label),
    shortDescription: textValue(body.short_description),
    longDescription: textValue(body.long_description),
    positioning: textValue(body.positioning),
    targetGroup: textValue(body.target_group),
    notFor: textValue(body.not_for),
    pageScope: textValue(body.page_scope),
    textScope: textValue(body.text_scope),
    seoScope: textValue(body.seo_scope),
    techScope: textValue(body.tech_scope),
    feedbackRounds: textValue(body.feedback_rounds),
    timeline: textValue(body.timeline),
    ctaLabel: textValue(body.cta_label),
    ctaUrl: textValue(body.cta_url),
    secondaryCtaLabel: textValue(body.secondary_cta_label),
    secondaryCtaUrl: textValue(body.secondary_cta_url),
    metaTitle: textValue(body.meta_title),
    metaDescription: textValue(body.meta_description),
    h1: textValue(body.h1),
    schemaType: textValue(body.schema_type),
    adminNote: textValue(body.admin_note)
  };
}

function validInternalUrl(value) {
  if (!value) return true;
  if (/^\s*javascript:/i.test(value)) return false;
  return INTERNAL_URL_PATTERN.test(value);
}

function buildRiskWarnings(payload) {
  const searchable = Object.values(payload || {})
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .join('\n');

  return RISK_TERMS
    .filter((term) => searchable.toLowerCase().includes(term.toLowerCase()))
    .map((term) => `Bitte prüfen: riskanter oder alter Begriff gefunden („${term}“).`);
}

function warningConfirmationRequired(req, warnings) {
  return warnings.length > 0 && !boolValue(req.body?.confirm_warnings);
}

function warningConfirmationErrors(warnings) {
  return warnings.length
    ? ['Bitte prüfe die Warnhinweise und bestätige sie, bevor du dieses Paket speicherst.']
    : [];
}

export function validatePackagePayload(payload, options = {}) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!payload.packageKey) errors.push('Paket-Key ist erforderlich.');
  if (payload.packageKey && !KEY_PATTERN.test(payload.packageKey)) {
    errors.push('Paket-Key darf nur Kleinbuchstaben, Zahlen, Unterstriche und Bindestriche enthalten.');
  }

  if (!payload.name) errors.push('Name ist erforderlich.');
  if (!payload.displayName) errors.push('Anzeigename ist erforderlich.');
  if (!payload.slug) errors.push('Slug ist erforderlich.');
  if (payload.slug && !SLUG_PATTERN.test(payload.slug)) {
    errors.push('Slug ist ungültig. Nutze Kleinbuchstaben, Zahlen und Bindestriche.');
  }

  if (!payload.canonicalPath) errors.push('Canonical Path ist erforderlich.');
  if (payload.canonicalPath && !INTERNAL_URL_PATTERN.test(payload.canonicalPath)) {
    errors.push('Canonical Path muss eine interne URL mit führendem Slash sein.');
  }

  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');
  if (!CURRENCY_PATTERN.test(payload.priceCurrency)) errors.push('Preiswährung muss ein ISO-Code mit drei Großbuchstaben sein.');
  if (!PRICE_TYPES.has(payload.priceType)) errors.push('Preistyp ist ungültig.');
  if (Number.isNaN(payload.priceAmountCents) || (payload.priceAmountCents !== null && payload.priceAmountCents < 0)) {
    errors.push('Preis muss leer oder ein gültiger, nicht negativer Betrag sein.');
  }

  if (!validInternalUrl(payload.ctaUrl)) errors.push('CTA-URL muss intern sein und darf kein javascript:-Schema verwenden.');
  if (!validInternalUrl(payload.secondaryCtaUrl)) {
    errors.push('Sekundäre CTA-URL muss intern sein und darf kein javascript:-Schema verwenden.');
  }

  if (options.originalPackage) {
    const originalSlug = rowValue(options.originalPackage, 'slug', 'slug');
    const originalCanonical = rowValue(options.originalPackage, 'canonicalPath', 'canonical_path');
    if (originalSlug && originalSlug !== payload.slug) {
      warnings.push('Slug wurde geändert. Bitte Redirect-/Canonical-Folgen manuell prüfen.');
    }
    if (originalCanonical && originalCanonical !== payload.canonicalPath) {
      warnings.push('Canonical Path wurde geändert. Bitte interne Links, Sitemap und Redirects prüfen.');
    }
  }

  return { errors, warnings };
}

function renderForm(res, { mode, row, errors = [], warnings = [], successMessages = [], status = 200 }) {
  return res.status(status).render('admin/pricing_package_form', {
    title: mode === 'create' ? 'Paket erstellen' : 'Paket bearbeiten',
    currentPathname: '/admin/pricing/packages',
    mode,
    row,
    errors,
    warnings,
    successMessages,
    priceTypes: [...PRICE_TYPES]
  });
}

async function buildUniquenessErrors(payload, currentId = null) {
  const rows = await pricingService.adminListPackages();
  const id = currentId ? Number(currentId) : null;
  const errors = [];

  for (const row of rows || []) {
    if (id && Number(row.id) === id) continue;
    if (row.package_key === payload.packageKey) errors.push('Paket-Key ist bereits vergeben.');
    if (row.slug === payload.slug) errors.push('Slug ist bereits vergeben.');
    if (row.canonical_path === payload.canonicalPath) errors.push('Canonical Path ist bereits vergeben.');
  }

  return errors;
}

function requestAdminUser(req) {
  return {
    id: req.session?.user?.id || req.session?.user?.is || null,
    username: req.session?.user?.username || null
  };
}

function sendAdminError(res, message, status = 500) {
  return res.status(status).send(message);
}

function redirectToPackageContent(packageId, suffix = '') {
  return `/admin/pricing/packages/${packageId}/content${suffix}`;
}

function validationResponse(res, errors) {
  return sendAdminError(res, errors.join(' '), 400);
}

function contentPayload(textField, groupField, body = {}) {
  return {
    [textField]: textValue(body[textField]),
    [groupField]: groupField ? textValue(body[groupField]) : undefined,
    sortOrder: parseInteger(body.sort_order, 0),
    isVisible: boolValue(body.is_visible)
  };
}

function validateContentPayload(payload, requiredField) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!payload[requiredField]) errors.push('Text ist erforderlich.');
  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');

  return { errors, warnings };
}

function normalizeFeatureBody(body = {}) {
  return {
    featureText: textValue(body.feature_text),
    featureGroup: textValue(body.feature_group),
    sortOrder: parseInteger(body.sort_order, 0),
    isVisible: boolValue(body.is_visible)
  };
}

function normalizeNotIncludedBody(body = {}) {
  return {
    itemText: textValue(body.item_text),
    itemGroup: textValue(body.item_group),
    sortOrder: parseInteger(body.sort_order, 0),
    isVisible: boolValue(body.is_visible)
  };
}

function normalizeUseCaseBody(body = {}) {
  return {
    useCaseText: textValue(body.use_case_text),
    sortOrder: parseInteger(body.sort_order, 0),
    isVisible: boolValue(body.is_visible)
  };
}

function normalizeFaqBody(body = {}) {
  return {
    question: textValue(body.question),
    answer: textValue(body.answer),
    category: textValue(body.category),
    showOnOverview: boolValue(body.show_on_overview),
    showOnDetail: boolValue(body.show_on_detail),
    schemaEligible: boolValue(body.schema_eligible),
    sortOrder: parseInteger(body.sort_order, 0),
    isVisible: boolValue(body.is_visible)
  };
}

function validateFaqPayload(payload) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!payload.question) errors.push('FAQ-Frage ist erforderlich.');
  if (!payload.answer) errors.push('FAQ-Antwort ist erforderlich.');
  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');

  return { errors, warnings };
}

function normalizeComparisonRowBody(body = {}) {
  return {
    rowKey: textValue(body.row_key),
    label: textValue(body.label),
    description: textValue(body.description),
    sortOrder: parseInteger(body.sort_order, 0),
    isVisible: boolValue(body.is_visible)
  };
}

function validateComparisonRowPayload(payload) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!payload.rowKey) errors.push('Row-Key ist erforderlich.');
  if (payload.rowKey && !KEY_PATTERN.test(payload.rowKey)) {
    errors.push('Row-Key darf nur Kleinbuchstaben, Zahlen, Unterstriche und Bindestriche enthalten.');
  }
  if (!payload.label) errors.push('Label ist erforderlich.');
  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');

  return { errors, warnings };
}

function normalizeComparisonValueBody(body = {}) {
  return {
    rowId: parseInteger(body.row_id, Number.NaN),
    packageId: parseInteger(body.package_id, Number.NaN),
    value: textValue(body.value),
    highlight: boolValue(body.highlight),
    sortOrder: parseInteger(body.sort_order, 0)
  };
}

function validateComparisonValuePayload(payload) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!Number.isInteger(payload.rowId)) errors.push('Vergleichszeile ist erforderlich.');
  if (!Number.isInteger(payload.packageId)) errors.push('Paket ist erforderlich.');
  if (!payload.value) errors.push('Wert ist erforderlich.');
  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');

  return { errors, warnings };
}

function normalizeGlobalNoteBody(body = {}) {
  return {
    noteKey: textValue(body.note_key),
    title: textValue(body.title),
    body: textValue(body.body),
    context: textValue(body.context),
    isActive: boolValue(body.is_active),
    sortOrder: parseInteger(body.sort_order, 0)
  };
}

function validateGlobalNotePayload(payload) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!payload.noteKey) errors.push('Hinweis-Key ist erforderlich.');
  if (!payload.body) errors.push('Hinweistext ist erforderlich.');
  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');
  if (payload.noteKey === 'addons_ticker_duration_seconds') {
    const seconds = Number.parseFloat(String(payload.body).replace(',', '.'));
    if (!Number.isFinite(seconds) || seconds < 8 || seconds > 180) {
      errors.push('Die Add-ons-Ticker-Laufzeit muss zwischen 8 und 180 Sekunden liegen.');
    }
  }

  return { errors, warnings };
}

function normalizeRedirectBody(body = {}) {
  return {
    packageId: parseInteger(body.package_id, Number.NaN),
    oldPath: textValue(body.old_path),
    targetPath: textValue(body.target_path),
    statusCode: parseInteger(body.status_code, 301),
    isActive: boolValue(body.is_active)
  };
}

export function validateRedirectPayload(payload) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!Number.isInteger(payload.packageId)) errors.push('Paket ist erforderlich.');
  if (!payload.oldPath || !validInternalUrl(payload.oldPath)) {
    errors.push('Alter Pfad muss eine interne URL mit führendem Slash sein.');
  }
  if (!payload.targetPath || !validInternalUrl(payload.targetPath)) {
    errors.push('Zielpfad muss eine interne URL mit führendem Slash sein.');
  }
  if (payload.oldPath && payload.targetPath && payload.oldPath === payload.targetPath) {
    errors.push('Alter Pfad und Zielpfad dürfen nicht identisch sein.');
  }
  if (![301, 302, 307, 308].includes(payload.statusCode)) {
    errors.push('Statuscode muss 301, 302, 307 oder 308 sein.');
  }

  return { errors, warnings };
}

function linesValue(value) {
  const raw = textValue(value);
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAddOnBody(body = {}) {
  return {
    addonKey: textValue(body.addon_key),
    name: textValue(body.name),
    category: textValue(body.category),
    priceFromCents: parsePriceAmountCents(body.price_from_euro || body.price_from_cents),
    priceToCents: parsePriceAmountCents(body.price_to_euro || body.price_to_cents),
    priceLabel: textValue(body.price_label),
    shortDescription: textValue(body.short_description),
    longDescription: textValue(body.long_description),
    thirdPartyNote: textValue(body.third_party_note),
    ctaLabel: textValue(body.cta_label),
    ctaUrl: textValue(body.cta_url),
    isActive: boolValue(body.is_active),
    isVisible: boolValue(body.is_visible),
    sortOrder: parseInteger(body.sort_order, 0)
  };
}

function validateAddOnPayload(payload) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!payload.addonKey) errors.push('Add-on-Key ist erforderlich.');
  if (payload.addonKey && !KEY_PATTERN.test(payload.addonKey)) {
    errors.push('Add-on-Key darf nur Kleinbuchstaben, Zahlen, Unterstriche und Bindestriche enthalten.');
  }
  if (!payload.name) errors.push('Name ist erforderlich.');
  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');
  if (Number.isNaN(payload.priceFromCents) || (payload.priceFromCents !== null && payload.priceFromCents < 0)) {
    errors.push('Preis von muss leer oder ein gültiger, nicht negativer Betrag sein.');
  }
  if (Number.isNaN(payload.priceToCents) || (payload.priceToCents !== null && payload.priceToCents < 0)) {
    errors.push('Preis bis muss leer oder ein gültiger, nicht negativer Betrag sein.');
  }
  if (
    payload.priceFromCents !== null &&
    payload.priceToCents !== null &&
    !Number.isNaN(payload.priceFromCents) &&
    !Number.isNaN(payload.priceToCents) &&
    payload.priceFromCents > payload.priceToCents
  ) {
    errors.push('Preis von darf nicht höher als Preis bis sein.');
  }
  if (!validInternalUrl(payload.ctaUrl)) errors.push('CTA-URL muss intern sein und darf kein javascript:-Schema verwenden.');

  return { errors, warnings };
}

function normalizeMaintenancePlanBody(body = {}) {
  return {
    planKey: textValue(body.plan_key),
    name: textValue(body.name),
    priceFromCents: parsePriceAmountCents(body.price_from_euro || body.price_from_cents),
    priceLabel: textValue(body.price_label),
    billingCycle: textValue(body.billing_cycle || 'monthly'),
    shortDescription: textValue(body.short_description),
    included: linesValue(body.included),
    notIncluded: linesValue(body.not_included),
    responseTime: textValue(body.response_time),
    contentChangeAllowance: textValue(body.content_change_allowance),
    emergencyNote: textValue(body.emergency_note),
    thirdPartyNote: textValue(body.third_party_note),
    cancellationNote: textValue(body.cancellation_note),
    ctaLabel: textValue(body.cta_label),
    ctaUrl: textValue(body.cta_url),
    isRecommended: boolValue(body.is_recommended),
    isActive: boolValue(body.is_active),
    isVisible: boolValue(body.is_visible),
    sortOrder: parseInteger(body.sort_order, 0)
  };
}

function validateMaintenancePlanPayload(payload) {
  const errors = [];
  const warnings = buildRiskWarnings(payload);

  if (!payload.planKey) errors.push('Plan-Key ist erforderlich.');
  if (payload.planKey && !KEY_PATTERN.test(payload.planKey)) {
    errors.push('Plan-Key darf nur Kleinbuchstaben, Zahlen, Unterstriche und Bindestriche enthalten.');
  }
  if (!payload.name) errors.push('Name ist erforderlich.');
  if (!Number.isInteger(payload.sortOrder)) errors.push('Sortierung muss eine ganze Zahl sein.');
  if (!BILLING_CYCLES.has(payload.billingCycle)) errors.push('Abrechnungsrhythmus ist ungültig.');
  if (Number.isNaN(payload.priceFromCents) || (payload.priceFromCents !== null && payload.priceFromCents < 0)) {
    errors.push('Preis muss leer oder ein gültiger, nicht negativer Betrag sein.');
  }
  if (!validInternalUrl(payload.ctaUrl)) errors.push('CTA-URL muss intern sein und darf kein javascript:-Schema verwenden.');

  return { errors, warnings };
}

export async function listPackages(req, res) {
  try {
    const packages = await pricingService.adminListPackages();
    return res.render('admin/pricing_packages_list', {
      title: 'Pakete & Preise',
      currentPathname: '/admin/pricing/packages',
      packages,
      query: req.query || {},
      csrfToken: res.locals.csrfToken,
      formatCurrencyCents,
      getPriceLabel
    });
  } catch (err) {
    console.error('Fehler beim Laden der Paketverwaltung:', err.message);
    return res.status(500).send('Paketverwaltung konnte nicht geladen werden.');
  }
}

export function newPackageForm(_req, res) {
  return renderForm(res, {
    mode: 'create',
    row: packageToFormRow(DEFAULT_PACKAGE)
  });
}

export async function createPackage(req, res) {
  try {
    const payload = normalizePackageFormBody(req.body);
    const validation = validatePackagePayload(payload);
    validation.errors.push(...await buildUniquenessErrors(payload));
    if (!validation.errors.length && warningConfirmationRequired(req, validation.warnings)) {
      validation.errors.push(...warningConfirmationErrors(validation.warnings));
    }

    if (validation.errors.length) {
      return renderForm(res, {
        mode: 'create',
        row: { ...packageToFormRow(payload), priceAmountEuro: textValue(req.body.price_amount_euro || req.body.price_amount_cents) },
        errors: validation.errors,
        warnings: validation.warnings,
        status: 400
      });
    }

    const created = await pricingService.adminCreatePackage(payload, requestAdminUser(req));
    return res.redirect(`/admin/pricing/packages/${created.id}/edit?saved=1`);
  } catch (err) {
    console.error('Fehler beim Erstellen eines Pakets:', err.message);
    return sendAdminError(res, 'Paket konnte nicht erstellt werden.');
  }
}

export async function editPackageForm(req, res) {
  try {
    const row = await pricingService.adminGetPackage(req.params.id);
    if (!row) return sendAdminError(res, 'Paket nicht gefunden.', 404);

    return renderForm(res, {
      mode: 'edit',
      row: packageToFormRow(row),
      successMessages: req.query.saved ? ['Paket wurde gespeichert.'] : []
    });
  } catch (err) {
    console.error('Fehler beim Laden eines Pakets:', err.message);
    return sendAdminError(res, 'Paket konnte nicht geladen werden.');
  }
}

export async function updatePackage(req, res) {
  try {
    const existing = await pricingService.adminGetPackage(req.params.id);
    if (!existing) return sendAdminError(res, 'Paket nicht gefunden.', 404);

    const payload = normalizePackageFormBody(req.body);
    const validation = validatePackagePayload(payload, { originalPackage: existing });
    validation.errors.push(...await buildUniquenessErrors(payload, req.params.id));
    if (!validation.errors.length && warningConfirmationRequired(req, validation.warnings)) {
      validation.errors.push(...warningConfirmationErrors(validation.warnings));
    }

    if (validation.errors.length) {
      return renderForm(res, {
        mode: 'edit',
        row: {
          ...packageToFormRow({ ...payload, id: req.params.id }),
          priceAmountEuro: textValue(req.body.price_amount_euro || req.body.price_amount_cents)
        },
        errors: validation.errors,
        warnings: validation.warnings,
        status: 400
      });
    }

    await pricingService.adminUpdatePackage(req.params.id, payload, requestAdminUser(req));
    return res.redirect(`/admin/pricing/packages/${req.params.id}/edit?saved=1`);
  } catch (err) {
    console.error('Fehler beim Aktualisieren eines Pakets:', err.message);
    return sendAdminError(res, 'Paket konnte nicht gespeichert werden.');
  }
}

export async function archivePackage(req, res) {
  try {
    await pricingService.adminArchivePackage(req.params.id, requestAdminUser(req));
    return res.redirect('/admin/pricing/packages?archived=1');
  } catch (err) {
    console.error('Fehler beim Archivieren eines Pakets:', err.message);
    return sendAdminError(res, 'Paket konnte nicht archiviert werden.');
  }
}

export async function restorePackage(req, res) {
  try {
    await pricingService.adminRestorePackage(req.params.id, requestAdminUser(req));
    return res.redirect('/admin/pricing/packages?restored=1');
  } catch (err) {
    console.error('Fehler beim Wiederherstellen eines Pakets:', err.message);
    return sendAdminError(res, 'Paket konnte nicht wiederhergestellt werden.');
  }
}

export async function togglePackageVisibility(req, res) {
  try {
    await pricingService.adminToggleVisibility(req.params.id, requestAdminUser(req));
    return res.redirect('/admin/pricing/packages?visibility=1');
  } catch (err) {
    console.error('Fehler beim Ändern der Sichtbarkeit:', err.message);
    return sendAdminError(res, 'Sichtbarkeit konnte nicht geändert werden.');
  }
}

export async function reorderPackages(req, res) {
  try {
    const ids = Array.isArray(req.body.package_ids) ? req.body.package_ids : [req.body.package_ids].filter(Boolean);
    const sortOrders = Array.isArray(req.body.sort_orders) ? req.body.sort_orders : [req.body.sort_orders].filter(Boolean);
    const orderData = ids.map((id, index) => ({
      id,
      sortOrder: parseInteger(sortOrders[index], index + 1)
    })).filter((item) => item.id && Number.isInteger(item.sortOrder));

    if (!orderData.length) return res.redirect('/admin/pricing/packages?sort=empty');

    await pricingService.adminUpdateSortOrder(orderData, requestAdminUser(req));
    return res.redirect('/admin/pricing/packages?sorted=1');
  } catch (err) {
    console.error('Fehler beim Speichern der Paketsortierung:', err.message);
    return sendAdminError(res, 'Paketsortierung konnte nicht gespeichert werden.');
  }
}

export async function packageContent(req, res) {
  try {
    const content = await pricingService.adminListPackageContent(req.params.id);
    if (!content.packageRow) return sendAdminError(res, 'Paket nicht gefunden.', 404);

    return res.render('admin/pricing_package_content', {
      title: `Paketinhalte: ${content.packageRow.display_name || content.packageRow.name}`,
      currentPathname: '/admin/pricing/packages',
      csrfToken: res.locals.csrfToken,
      query: req.query || {},
      pkg: content.packageRow,
      features: content.features,
      notIncluded: content.notIncluded,
      useCases: content.useCases,
      faqs: content.faqs
    });
  } catch (err) {
    console.error('Fehler beim Laden der Paketinhalte:', err.message);
    return sendAdminError(res, 'Paketinhalte konnten nicht geladen werden.');
  }
}

export async function addFeature(req, res) {
  try {
    const payload = normalizeFeatureBody(req.body);
    const validation = validateContentPayload(payload, 'featureText');
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminAddFeature(req.params.id, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(req.params.id, '?feature=created'));
  } catch (err) {
    console.error('Fehler beim Speichern einer enthaltenen Leistung:', err.message);
    return sendAdminError(res, 'Enthaltene Leistung konnte nicht gespeichert werden.');
  }
}

export async function updateFeature(req, res) {
  try {
    const payload = normalizeFeatureBody(req.body);
    const validation = validateContentPayload(payload, 'featureText');
    if (validation.errors.length) return validationResponse(res, validation.errors);

    const row = await pricingService.adminUpdateFeature(req.params.featureId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?feature=updated'));
  } catch (err) {
    console.error('Fehler beim Aktualisieren einer enthaltenen Leistung:', err.message);
    return sendAdminError(res, 'Enthaltene Leistung konnte nicht aktualisiert werden.');
  }
}

export async function deleteFeature(req, res) {
  try {
    const row = await pricingService.adminDeleteFeature(req.params.featureId, requestAdminUser(req));
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?feature=deleted'));
  } catch (err) {
    console.error('Fehler beim Löschen einer enthaltenen Leistung:', err.message);
    return sendAdminError(res, 'Enthaltene Leistung konnte nicht gelöscht werden.');
  }
}

export async function addNotIncluded(req, res) {
  try {
    const payload = normalizeNotIncludedBody(req.body);
    const validation = validateContentPayload(payload, 'itemText');
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminAddNotIncluded(req.params.id, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(req.params.id, '?not_included=created'));
  } catch (err) {
    console.error('Fehler beim Speichern einer ausgeschlossenen Leistung:', err.message);
    return sendAdminError(res, 'Nicht enthaltene Leistung konnte nicht gespeichert werden.');
  }
}

export async function updateNotIncluded(req, res) {
  try {
    const payload = normalizeNotIncludedBody(req.body);
    const validation = validateContentPayload(payload, 'itemText');
    if (validation.errors.length) return validationResponse(res, validation.errors);

    const row = await pricingService.adminUpdateNotIncluded(req.params.itemId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?not_included=updated'));
  } catch (err) {
    console.error('Fehler beim Aktualisieren einer ausgeschlossenen Leistung:', err.message);
    return sendAdminError(res, 'Nicht enthaltene Leistung konnte nicht aktualisiert werden.');
  }
}

export async function deleteNotIncluded(req, res) {
  try {
    const row = await pricingService.adminDeleteNotIncluded(req.params.itemId, requestAdminUser(req));
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?not_included=deleted'));
  } catch (err) {
    console.error('Fehler beim Löschen einer ausgeschlossenen Leistung:', err.message);
    return sendAdminError(res, 'Nicht enthaltene Leistung konnte nicht gelöscht werden.');
  }
}

export async function addUseCase(req, res) {
  try {
    const payload = normalizeUseCaseBody(req.body);
    const validation = validateContentPayload(payload, 'useCaseText');
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminAddUseCase(req.params.id, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(req.params.id, '?use_case=created'));
  } catch (err) {
    console.error('Fehler beim Speichern eines Einsatzfalls:', err.message);
    return sendAdminError(res, 'Einsatzfall konnte nicht gespeichert werden.');
  }
}

export async function updateUseCase(req, res) {
  try {
    const payload = normalizeUseCaseBody(req.body);
    const validation = validateContentPayload(payload, 'useCaseText');
    if (validation.errors.length) return validationResponse(res, validation.errors);

    const row = await pricingService.adminUpdateUseCase(req.params.useCaseId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?use_case=updated'));
  } catch (err) {
    console.error('Fehler beim Aktualisieren eines Einsatzfalls:', err.message);
    return sendAdminError(res, 'Einsatzfall konnte nicht aktualisiert werden.');
  }
}

export async function deleteUseCase(req, res) {
  try {
    const row = await pricingService.adminDeleteUseCase(req.params.useCaseId, requestAdminUser(req));
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?use_case=deleted'));
  } catch (err) {
    console.error('Fehler beim Löschen eines Einsatzfalls:', err.message);
    return sendAdminError(res, 'Einsatzfall konnte nicht gelöscht werden.');
  }
}

export async function addFaq(req, res) {
  try {
    const payload = normalizeFaqBody(req.body);
    const validation = validateFaqPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminAddFaq(req.params.id, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(req.params.id, '?faq=created'));
  } catch (err) {
    console.error('Fehler beim Speichern einer Paket-FAQ:', err.message);
    return sendAdminError(res, 'Paket-FAQ konnte nicht gespeichert werden.');
  }
}

export async function updateFaq(req, res) {
  try {
    const payload = normalizeFaqBody(req.body);
    const validation = validateFaqPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    const row = await pricingService.adminUpdateFaq(req.params.faqId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?faq=updated'));
  } catch (err) {
    console.error('Fehler beim Aktualisieren einer Paket-FAQ:', err.message);
    return sendAdminError(res, 'Paket-FAQ konnte nicht aktualisiert werden.');
  }
}

export async function deleteFaq(req, res) {
  try {
    const row = await pricingService.adminDeleteFaq(req.params.faqId, requestAdminUser(req));
    return res.redirect(redirectToPackageContent(row?.package_id || req.body.package_id, '?faq=deleted'));
  } catch (err) {
    console.error('Fehler beim Löschen einer Paket-FAQ:', err.message);
    return sendAdminError(res, 'Paket-FAQ konnte nicht gelöscht werden.');
  }
}

export async function comparisonPage(_req, res) {
  try {
    const comparison = await pricingService.adminListComparisonAdmin();
    return res.render('admin/pricing_comparison', {
      title: 'Paketvergleich',
      currentPathname: '/admin/pricing/packages',
      csrfToken: res.locals.csrfToken,
      packages: comparison.packages,
      rows: comparison.rows,
      values: comparison.values
    });
  } catch (err) {
    console.error('Fehler beim Laden des Paketvergleichs:', err.message);
    return sendAdminError(res, 'Paketvergleich konnte nicht geladen werden.');
  }
}

export async function addComparisonRow(req, res) {
  try {
    const payload = normalizeComparisonRowBody(req.body);
    const validation = validateComparisonRowPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminAddComparisonRow({ ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/comparison?row=created');
  } catch (err) {
    console.error('Fehler beim Speichern einer Vergleichszeile:', err.message);
    return sendAdminError(res, 'Vergleichszeile konnte nicht gespeichert werden.');
  }
}

export async function updateComparisonRow(req, res) {
  try {
    const payload = normalizeComparisonRowBody(req.body);
    const validation = validateComparisonRowPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminUpdateComparisonRow(req.params.rowId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/comparison?row=updated');
  } catch (err) {
    console.error('Fehler beim Aktualisieren einer Vergleichszeile:', err.message);
    return sendAdminError(res, 'Vergleichszeile konnte nicht aktualisiert werden.');
  }
}

export async function upsertComparisonValue(req, res) {
  try {
    const payload = normalizeComparisonValueBody(req.body);
    const validation = validateComparisonValuePayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminUpsertComparisonValue({ ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/comparison?value=saved');
  } catch (err) {
    console.error('Fehler beim Speichern eines Vergleichswerts:', err.message);
    return sendAdminError(res, 'Vergleichswert konnte nicht gespeichert werden.');
  }
}

export async function notesPage(_req, res) {
  try {
    const notes = await pricingService.adminListGlobalNotes();
    return res.render('admin/pricing_notes', {
      title: 'Globale Hinweise',
      currentPathname: '/admin/pricing/packages',
      csrfToken: res.locals.csrfToken,
      notes
    });
  } catch (err) {
    console.error('Fehler beim Laden der globalen Hinweise:', err.message);
    return sendAdminError(res, 'Globale Hinweise konnten nicht geladen werden.');
  }
}

export async function updateGlobalNote(req, res) {
  try {
    const payload = normalizeGlobalNoteBody(req.body);
    const validation = validateGlobalNotePayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminUpdateGlobalNote(req.params.noteId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/notes?note=saved');
  } catch (err) {
    console.error('Fehler beim Speichern eines globalen Hinweises:', err.message);
    return sendAdminError(res, 'Globaler Hinweis konnte nicht gespeichert werden.');
  }
}

export async function redirectsPage(_req, res) {
  try {
    const [redirects, packages] = await Promise.all([
      pricingService.adminListRedirects(),
      pricingService.adminListPackages()
    ]);
    return res.render('admin/pricing_redirects', {
      title: 'Paket-Redirects',
      currentPathname: '/admin/pricing/packages',
      csrfToken: res.locals.csrfToken,
      redirects,
      packages
    });
  } catch (err) {
    console.error('Fehler beim Laden der Paket-Redirects:', err.message);
    return sendAdminError(res, 'Paket-Redirects konnten nicht geladen werden.');
  }
}

export async function createRedirect(req, res) {
  try {
    const payload = normalizeRedirectBody(req.body);
    const validation = validateRedirectPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminCreateRedirect({ ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/redirects?redirect=created');
  } catch (err) {
    console.error('Fehler beim Speichern eines Paket-Redirects:', err.message);
    return sendAdminError(res, 'Paket-Redirect konnte nicht gespeichert werden.');
  }
}

export async function updateRedirect(req, res) {
  try {
    const payload = normalizeRedirectBody(req.body);
    const validation = validateRedirectPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminUpdateRedirect(req.params.redirectId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/redirects?redirect=updated');
  } catch (err) {
    console.error('Fehler beim Aktualisieren eines Paket-Redirects:', err.message);
    return sendAdminError(res, 'Paket-Redirect konnte nicht aktualisiert werden.');
  }
}

export async function addOnsPage(req, res) {
  try {
    const addOns = await pricingService.adminListAddOns();
    return res.render('admin/pricing_addons', {
      title: 'Zusatzleistungen',
      currentPathname: '/admin/pricing/packages',
      csrfToken: res.locals.csrfToken,
      query: req.query || {},
      addOns,
      centsToEuroInput
    });
  } catch (err) {
    console.error('Fehler beim Laden der Zusatzleistungen:', err.message);
    return sendAdminError(res, 'Zusatzleistungen konnten nicht geladen werden.');
  }
}

export async function createAddOn(req, res) {
  try {
    const payload = normalizeAddOnBody(req.body);
    const validation = validateAddOnPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminCreateAddOn({ ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/add-ons?addon=created');
  } catch (err) {
    console.error('Fehler beim Speichern einer Zusatzleistung:', err.message);
    return sendAdminError(res, 'Zusatzleistung konnte nicht gespeichert werden.');
  }
}

export async function updateAddOn(req, res) {
  try {
    const payload = normalizeAddOnBody(req.body);
    const validation = validateAddOnPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminUpdateAddOn(req.params.addonId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/add-ons?addon=updated');
  } catch (err) {
    console.error('Fehler beim Aktualisieren einer Zusatzleistung:', err.message);
    return sendAdminError(res, 'Zusatzleistung konnte nicht aktualisiert werden.');
  }
}

export async function archiveAddOn(req, res) {
  try {
    await pricingService.adminArchiveAddOn(req.params.addonId, requestAdminUser(req));
    return res.redirect('/admin/pricing/add-ons?addon=archived');
  } catch (err) {
    console.error('Fehler beim Archivieren einer Zusatzleistung:', err.message);
    return sendAdminError(res, 'Zusatzleistung konnte nicht archiviert werden.');
  }
}

export async function restoreAddOn(req, res) {
  try {
    await pricingService.adminRestoreAddOn(req.params.addonId, requestAdminUser(req));
    return res.redirect('/admin/pricing/add-ons?addon=restored');
  } catch (err) {
    console.error('Fehler beim Wiederherstellen einer Zusatzleistung:', err.message);
    return sendAdminError(res, 'Zusatzleistung konnte nicht wiederhergestellt werden.');
  }
}

export async function toggleAddOnVisibility(req, res) {
  try {
    await pricingService.adminToggleAddOnVisibility(req.params.addonId, requestAdminUser(req));
    return res.redirect('/admin/pricing/add-ons?addon=visibility');
  } catch (err) {
    console.error('Fehler beim Ändern der Zusatzleistungs-Sichtbarkeit:', err.message);
    return sendAdminError(res, 'Sichtbarkeit konnte nicht geändert werden.');
  }
}

export async function reorderAddOns(req, res) {
  try {
    const ids = Array.isArray(req.body.addon_ids) ? req.body.addon_ids : [req.body.addon_ids].filter(Boolean);
    const orders = Array.isArray(req.body.sort_orders) ? req.body.sort_orders : [req.body.sort_orders].filter(Boolean);
    const orderData = ids.map((id, index) => ({
      id,
      sortOrder: parseInteger(orders[index], index + 1)
    })).filter((item) => item.id && Number.isInteger(item.sortOrder));

    if (!orderData.length) return res.redirect('/admin/pricing/add-ons?sort=empty');
    await pricingService.adminUpdateAddOnSortOrder(orderData, requestAdminUser(req));
    return res.redirect('/admin/pricing/add-ons?sorted=1');
  } catch (err) {
    console.error('Fehler beim Sortieren der Zusatzleistungen:', err.message);
    return sendAdminError(res, 'Zusatzleistungen konnten nicht sortiert werden.');
  }
}

export async function maintenancePlansPage(req, res) {
  try {
    const plans = await pricingService.adminListMaintenancePlans();
    return res.render('admin/pricing_maintenance', {
      title: 'Wartungspläne',
      currentPathname: '/admin/pricing/packages',
      csrfToken: res.locals.csrfToken,
      query: req.query || {},
      plans,
      centsToEuroInput,
      billingCycles: [...BILLING_CYCLES]
    });
  } catch (err) {
    console.error('Fehler beim Laden der Wartungspläne:', err.message);
    return sendAdminError(res, 'Wartungspläne konnten nicht geladen werden.');
  }
}

export async function createMaintenancePlan(req, res) {
  try {
    const payload = normalizeMaintenancePlanBody(req.body);
    const validation = validateMaintenancePlanPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminCreateMaintenancePlan({ ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/maintenance?plan=created');
  } catch (err) {
    console.error('Fehler beim Speichern eines Wartungsplans:', err.message);
    return sendAdminError(res, 'Wartungsplan konnte nicht gespeichert werden.');
  }
}

export async function updateMaintenancePlan(req, res) {
  try {
    const payload = normalizeMaintenancePlanBody(req.body);
    const validation = validateMaintenancePlanPayload(payload);
    if (validation.errors.length) return validationResponse(res, validation.errors);

    await pricingService.adminUpdateMaintenancePlan(req.params.planId, { ...payload, adminUser: requestAdminUser(req) });
    return res.redirect('/admin/pricing/maintenance?plan=updated');
  } catch (err) {
    console.error('Fehler beim Aktualisieren eines Wartungsplans:', err.message);
    return sendAdminError(res, 'Wartungsplan konnte nicht aktualisiert werden.');
  }
}

export async function archiveMaintenancePlan(req, res) {
  try {
    await pricingService.adminArchiveMaintenancePlan(req.params.planId, requestAdminUser(req));
    return res.redirect('/admin/pricing/maintenance?plan=archived');
  } catch (err) {
    console.error('Fehler beim Archivieren eines Wartungsplans:', err.message);
    return sendAdminError(res, 'Wartungsplan konnte nicht archiviert werden.');
  }
}

export async function restoreMaintenancePlan(req, res) {
  try {
    await pricingService.adminRestoreMaintenancePlan(req.params.planId, requestAdminUser(req));
    return res.redirect('/admin/pricing/maintenance?plan=restored');
  } catch (err) {
    console.error('Fehler beim Wiederherstellen eines Wartungsplans:', err.message);
    return sendAdminError(res, 'Wartungsplan konnte nicht wiederhergestellt werden.');
  }
}

export async function toggleMaintenancePlanVisibility(req, res) {
  try {
    await pricingService.adminToggleMaintenancePlanVisibility(req.params.planId, requestAdminUser(req));
    return res.redirect('/admin/pricing/maintenance?plan=visibility');
  } catch (err) {
    console.error('Fehler beim Ändern der Wartungsplan-Sichtbarkeit:', err.message);
    return sendAdminError(res, 'Sichtbarkeit konnte nicht geändert werden.');
  }
}

export async function reorderMaintenancePlans(req, res) {
  try {
    const ids = Array.isArray(req.body.plan_ids) ? req.body.plan_ids : [req.body.plan_ids].filter(Boolean);
    const orders = Array.isArray(req.body.sort_orders) ? req.body.sort_orders : [req.body.sort_orders].filter(Boolean);
    const orderData = ids.map((id, index) => ({
      id,
      sortOrder: parseInteger(orders[index], index + 1)
    })).filter((item) => item.id && Number.isInteger(item.sortOrder));

    if (!orderData.length) return res.redirect('/admin/pricing/maintenance?sort=empty');
    await pricingService.adminUpdateMaintenancePlanSortOrder(orderData, requestAdminUser(req));
    return res.redirect('/admin/pricing/maintenance?sorted=1');
  } catch (err) {
    console.error('Fehler beim Sortieren der Wartungspläne:', err.message);
    return sendAdminError(res, 'Wartungspläne konnten nicht sortiert werden.');
  }
}

export const __testables = {
  buildRiskWarnings,
  centsToEuroInput,
  normalizeAddOnBody,
  normalizeMaintenancePlanBody,
  normalizePackageFormBody,
  parsePriceAmountCents,
  validateAddOnPayload,
  validateGlobalNotePayload,
  validateMaintenancePlanPayload,
  validatePackagePayload,
  validateRedirectPayload,
  warningConfirmationErrors,
  warningConfirmationRequired
};
