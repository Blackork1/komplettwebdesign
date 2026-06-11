import ejs from 'ejs';
import { buildPricingViewModel, formatPriceLabelForLocale } from './pricingViewModel.js';

const TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

const PACKAGE_FIELD_ALIASES = {
  display_name: 'displayName',
  canonical_path: 'url',
  canonicalPath: 'url',
  href: 'url'
};

const PACKAGE_FIELDS = new Set([
  'name',
  'displayName',
  'priceLabel',
  'url',
  'slug',
  'optionLabel'
]);

const PRICE_DRY_RUN_PATTERNS = [
  {
    regex: /\bab\s+799\s*€/gi,
    recommendedToken: '{{package:start.priceLabel}}',
    manualReviewRequired: false
  },
  {
    regex: /\bab\s+1\.499\s*€/gi,
    recommendedToken: '{{package:business.priceLabel}}',
    manualReviewRequired: false
  },
  {
    regex: /\bab\s+2\.499\s*€/gi,
    recommendedToken: '{{package:wachstum.priceLabel}}',
    manualReviewRequired: false
  },
  {
    regex: /\bab\s+3\.500\s*€/gi,
    recommendedToken: '{{package:individuell.priceLabel}}',
    manualReviewRequired: false
  },
  {
    regex: /(?<![\d.])ab\s+499\s*€|(?<![\d.])499\s*€/gi,
    recommendedToken: null,
    manualReviewRequired: true
  },
  {
    regex: /(?<![\d.])ab\s+899\s*€|(?<![\d.])899\s*€/gi,
    recommendedToken: null,
    manualReviewRequired: true
  }
];

function escapeHtml(value) {
  return ejs.escapeXML(String(value ?? ''));
}

function normalizeTokenLanguage(token, fallbackLng = 'de') {
  const normalized = String(token || '').trim();
  if (normalized.endsWith('.en')) {
    return {
      token: normalized.slice(0, -3),
      lng: 'en'
    };
  }

  return {
    token: normalized,
    lng: fallbackLng
  };
}

function packageKeyOf(pkg = {}) {
  return String(pkg.packageKey || pkg.package_key || pkg.slug || pkg.name || '').toLowerCase();
}

function normalizePackageMap(pricingContext = {}) {
  if (pricingContext.priceLabel && pricingContext.packageByKey) {
    return pricingContext.packageByKey;
  }

  if (pricingContext.packageByKey) {
    return pricingContext.packageByKey;
  }

  const viewModel = buildPricingViewModel(pricingContext);
  return viewModel.packageByKey || {};
}

function normalizePricingContext(pricingInput = {}) {
  if (pricingInput.priceLabel) return pricingInput;

  if (pricingInput.packageByKey && !pricingInput.visiblePackages) {
    return buildPricingViewModel({
      ...pricingInput,
      visiblePackages: Object.values(pricingInput.packageByKey)
    });
  }

  return buildPricingViewModel(pricingInput);
}

function normalizePackage(pkg = {}) {
  return {
    ...pkg,
    packageKey: pkg.packageKey || pkg.package_key,
    displayName: pkg.displayName || pkg.display_name,
    canonicalPath: pkg.canonicalPath || pkg.canonical_path
  };
}

function packageUrl(pkg = {}) {
  const normalized = normalizePackage(pkg);
  if (normalized.url) return normalized.url;
  if (normalized.canonicalPath) return normalized.canonicalPath;
  if (normalized.slug) return `/pakete/${normalized.slug}`;
  return '';
}

function packagePriceLabel(pkg, packageKey, pricingContext, lng) {
  if (typeof pricingContext.priceLabel === 'function') {
    return pricingContext.priceLabel(packageKey, lng);
  }

  const normalized = normalizePackage(pkg);
  const directLabel = normalized.priceLabel || normalized.price_label;
  const mapLabel = pricingContext.packagePriceMap?.[packageKey]?.label;
  return formatPriceLabelForLocale(directLabel || mapLabel || '', lng);
}

function packageOptionLabel(pkg, packageKey, pricingContext, lng) {
  if (typeof pricingContext.packageOptionLabel === 'function') {
    return pricingContext.packageOptionLabel(packageKey, lng);
  }

  const normalized = normalizePackage(pkg);
  return [normalized.name, packagePriceLabel(pkg, packageKey, pricingContext, lng)]
    .filter(Boolean)
    .join(' ');
}

function resolvePackageField(pkg, packageKey, field, pricingContext, lng) {
  const normalizedField = PACKAGE_FIELD_ALIASES[field] || field;
  if (!PACKAGE_FIELDS.has(normalizedField)) {
    return { known: false };
  }

  const normalized = normalizePackage(pkg);
  if (normalizedField === 'name') return { known: true, value: normalized.name || '' };
  if (normalizedField === 'displayName') return { known: true, value: normalized.displayName || normalized.name || '' };
  if (normalizedField === 'priceLabel') return { known: true, value: packagePriceLabel(pkg, packageKey, pricingContext, lng) };
  if (normalizedField === 'url') return { known: true, value: packageUrl(pkg) };
  if (normalizedField === 'slug') return { known: true, value: normalized.slug || '' };
  if (normalizedField === 'optionLabel') return { known: true, value: packageOptionLabel(pkg, packageKey, pricingContext, lng) };

  return { known: false };
}

export function resolvePricingToken(token, pricingInput = {}, { lng = 'de' } = {}) {
  const pricingContext = normalizePricingContext(pricingInput);
  const { token: cleanToken, lng: tokenLng } = normalizeTokenLanguage(token, lng);

  if (cleanToken === 'lowestPackagePriceLabel') {
    const value = typeof pricingContext.lowestLabel === 'function'
      ? pricingContext.lowestLabel(tokenLng)
      : formatPriceLabelForLocale(pricingContext.lowestPackagePriceLabel || '', tokenLng);
    return { known: true, value };
  }

  if (cleanToken === 'packages.overviewUrl') {
    return { known: true, value: pricingContext.packagesOverviewUrl || pricingContext.overviewUrl || '/pakete' };
  }

  const packageColonMatch = cleanToken.match(/^package:([a-z0-9_-]+)\.([a-zA-Z0-9_]+)$/i);
  if (packageColonMatch) {
    const packageKey = packageColonMatch[1].toLowerCase();
    const field = packageColonMatch[2];
    const pkg = normalizePackageMap(pricingContext)[packageKey];
    if (!pkg) return { known: false };
    return resolvePackageField(pkg, packageKey, field, pricingContext, tokenLng);
  }

  const priceMatch = cleanToken.match(/^price\.([a-z0-9_-]+)$/i);
  if (priceMatch) {
    const packageKey = priceMatch[1].toLowerCase();
    const pkg = normalizePackageMap(pricingContext)[packageKey];
    if (!pkg && !pricingContext.packagePriceMap?.[packageKey]) return { known: false };
    return { known: true, value: packagePriceLabel(pkg || {}, packageKey, pricingContext, tokenLng) };
  }

  const legacyPackageMatch = cleanToken.match(/^package\.([a-z0-9_-]+)\.([a-zA-Z0-9_]+)$/i);
  if (legacyPackageMatch) {
    const packageKey = legacyPackageMatch[1].toLowerCase();
    const field = legacyPackageMatch[2];
    const pkg = normalizePackageMap(pricingContext)[packageKey];
    if (!pkg) return { known: false };
    return resolvePackageField(pkg, packageKey, field, pricingContext, tokenLng);
  }

  return { known: false };
}

export function renderPricingTokens(value, pricingContext = {}, options = {}) {
  const unknownTokens = new Set();
  const escape = options.escape !== false;
  const lng = options.lng || 'de';

  function renderString(input) {
    return String(input).replace(TOKEN_PATTERN, (match, token) => {
      const resolved = resolvePricingToken(token, pricingContext, { lng });
      if (!resolved.known) {
        unknownTokens.add(String(token || '').trim());
        return escape ? escapeHtml(match) : match;
      }

      return escape ? escapeHtml(resolved.value) : String(resolved.value ?? '');
    });
  }

  function renderEntry(entry) {
    if (typeof entry === 'string') return renderString(entry);
    if (Array.isArray(entry)) return entry.map((item) => renderEntry(item));
    if (entry instanceof Date) return entry;
    if (entry && typeof entry === 'object') {
      return Object.fromEntries(
        Object.entries(entry).map(([key, item]) => [key, renderEntry(item)])
      );
    }
    return entry;
  }

  const renderedValue = renderEntry(value);
  if (options.report) {
    return {
      value: renderedValue,
      unknownTokens: Array.from(unknownTokens)
    };
  }

  return renderedValue;
}

export function getKnownPricingTokens(packageKeys = ['start', 'business', 'wachstum', 'individuell']) {
  const packageTokens = packageKeys.flatMap((packageKey) => [
    `{{package:${packageKey}.name}}`,
    `{{package:${packageKey}.displayName}}`,
    `{{package:${packageKey}.priceLabel}}`,
    `{{package:${packageKey}.url}}`
  ]);

  return [
    ...packageTokens,
    '{{lowestPackagePriceLabel}}',
    '{{packages.overviewUrl}}'
  ];
}

function collectDryRunEntries(value, source, results) {
  if (typeof value === 'string') {
    PRICE_DRY_RUN_PATTERNS.forEach((pattern) => {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(value)) !== null) {
        const start = Math.max(0, match.index - 45);
        const end = Math.min(value.length, match.index + match[0].length + 45);
        results.push({
          source,
          match: match[0],
          recommendedToken: pattern.recommendedToken,
          manualReviewRequired: pattern.manualReviewRequired,
          context: value.slice(start, end).replace(/\s+/g, ' ').trim()
        });
      }
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDryRunEntries(item, `${source}[${index}]`, results));
    return;
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    Object.entries(value).forEach(([key, item]) => {
      collectDryRunEntries(item, source ? `${source}.${key}` : key, results);
    });
  }
}

export function createPricingTokenDryRun(sources = {}) {
  const results = [];
  Object.entries(sources || {}).forEach(([source, value]) => {
    collectDryRunEntries(value, source, results);
  });
  return results;
}
