const EUR_SYMBOL = '€';

function normalizeCurrency(currency = 'EUR') {
  return String(currency || 'EUR').toUpperCase();
}

function readField(record, camelName, snakeName) {
  return record?.[camelName] ?? record?.[snakeName] ?? null;
}

export function formatCurrencyCents(amountCents, currency = 'EUR') {
  if (amountCents === null || amountCents === undefined) return null;

  if (!Number.isInteger(amountCents)) {
    throw new TypeError('amountCents muss ein Integer sein.');
  }

  const normalizedCurrency = normalizeCurrency(currency);
  const sign = amountCents < 0 ? '-' : '';
  const absolute = Math.abs(amountCents);
  const euros = Math.floor(absolute / 100);
  const cents = absolute % 100;
  const euroPart = euros.toLocaleString('de-DE');
  const decimalPart = cents > 0 ? `,${String(cents).padStart(2, '0')}` : '';
  const suffix = normalizedCurrency === 'EUR' ? EUR_SYMBOL : normalizedCurrency;

  return `${sign}${euroPart}${decimalPart} ${suffix}`;
}

export function getPriceLabel(packageRecord) {
  const override = readField(packageRecord, 'priceLabelOverride', 'price_label_override');
  if (override) return override;

  const amountCents = readField(packageRecord, 'priceAmountCents', 'price_amount_cents');
  const currency = readField(packageRecord, 'priceCurrency', 'price_currency') || 'EUR';
  const priceType = readField(packageRecord, 'priceType', 'price_type');
  const prefix = readField(packageRecord, 'pricePrefix', 'price_prefix');
  const suffix = readField(packageRecord, 'priceSuffix', 'price_suffix');

  if (amountCents === null || amountCents === undefined) {
    if (suffix) return String(suffix);
    if (priceType === 'on_request' || priceType === 'custom') return 'nach Aufwand';
    return '';
  }

  return [prefix, formatCurrencyCents(amountCents, currency), suffix]
    .filter(Boolean)
    .join(' ');
}

export function getPublicPackageLabel(packageRecord) {
  const displayName = readField(packageRecord, 'displayName', 'display_name') || packageRecord?.name || '';
  const priceLabel = getPriceLabel(packageRecord);
  return [displayName, priceLabel].filter(Boolean).join(' ');
}

export function formatPackageOptionLabel(packageRecord) {
  const name = packageRecord?.name || readField(packageRecord, 'displayName', 'display_name') || '';
  const priceLabel = getPriceLabel(packageRecord);
  return [name, priceLabel].filter(Boolean).join(' ');
}
