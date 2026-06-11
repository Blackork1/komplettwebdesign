function toPackageMap(packages = []) {
  return Object.fromEntries(
    (Array.isArray(packages) ? packages : [])
      .filter(Boolean)
      .map((pkg) => [String(pkg.packageKey || pkg.slug || pkg.name || '').toLowerCase(), pkg])
      .filter(([key]) => key)
  );
}

export function toEnglishPriceLabel(label = '') {
  return String(label || '')
    .replace(/^ab\s+/i, 'from ')
    .replace(/\s*€\b/g, ' EUR')
    .replace(/(\d)\.(\d{3})/g, '$1,$2')
    .replace(/oder nach Aufwand/gi, 'or by effort')
    .trim();
}

export function formatPriceLabelForLocale(label = '', lng = 'de') {
  return lng === 'en' ? toEnglishPriceLabel(label) : String(label || '');
}

export function buildPricingViewModel({
  visiblePackages = [],
  packagePriceMap = {},
  lowestPackagePriceLabel = null,
  contactPackageOptions = []
} = {}) {
  const packageByKey = toPackageMap(visiblePackages);

  const priceLabel = (packageKey, lng = 'de') => {
    const key = String(packageKey || '').toLowerCase();
    const pkgLabel = packageByKey[key]?.priceLabel || packagePriceMap[key]?.label || '';
    return formatPriceLabelForLocale(pkgLabel, lng);
  };

  const packageOptionLabel = (packageKey, lng = 'de') => {
    const key = String(packageKey || '').toLowerCase();
    const pkg = packageByKey[key];
    if (!pkg) return '';
    return [pkg.name, priceLabel(key, lng)].filter(Boolean).join(' ');
  };

  const lowestLabel = (lng = 'de') => formatPriceLabelForLocale(lowestPackagePriceLabel, lng);

  return {
    visiblePackages,
    packagePriceMap,
    lowestPackagePriceLabel,
    contactPackageOptions,
    packageByKey,
    priceLabel,
    packageOptionLabel,
    lowestLabel
  };
}

function replaceToken(token, pricing, lng) {
  const normalized = String(token || '').trim();
  const explicitEnglish = normalized.endsWith('.en');
  const tokenLng = explicitEnglish ? 'en' : lng;
  const cleanToken = explicitEnglish ? normalized.slice(0, -3) : normalized;

  if (cleanToken === 'lowestPackagePriceLabel') {
    return pricing.lowestLabel(tokenLng);
  }

  const priceMatch = cleanToken.match(/^price\.([a-z0-9_-]+)$/i);
  if (priceMatch) {
    return pricing.priceLabel(priceMatch[1], tokenLng);
  }

  const optionMatch = cleanToken.match(/^package\.([a-z0-9_-]+)\.optionLabel$/i);
  if (optionMatch) {
    return pricing.packageOptionLabel(optionMatch[1], tokenLng);
  }

  return `{{${token}}}`;
}

export function interpolatePricingTokens(value, pricingInput = {}, { lng = 'de' } = {}) {
  const pricing = pricingInput.priceLabel
    ? pricingInput
    : buildPricingViewModel(pricingInput);

  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, token) => replaceToken(token, pricing, lng));
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolatePricingTokens(item, pricing, { lng }));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        interpolatePricingTokens(entry, pricing, { lng })
      ])
    );
  }

  return value;
}
