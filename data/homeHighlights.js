const BASE_HERO_BRIDGE_HIGHLIGHTS = Object.freeze([
  {
    key: 'individual-design',
    label: 'Individuelles Design',
    labelEn: 'Custom design',
    iconClass: 'fa-pen-ruler'
  },
  {
    key: 'no-standard-templates',
    label: 'Keine Standard-Templates',
    labelEn: 'No generic templates',
    iconClass: 'fa-ban'
  },
  {
    key: 'experience',
    label: 'Seit 5 Jahren Webdesign',
    labelEn: '5 years of web design',
    iconClass: 'fa-award'
  },
  {
    key: 'no-plugin-updates',
    label: 'Keine Plugin-Updates',
    labelEn: 'No plugin updates',
    iconClass: 'fa-shield-halved'
  },
  {
    key: 'edit-texts',
    label: 'Texte auf Wunsch selbst ändern',
    labelEn: 'Edit texts yourself if you like',
    iconClass: 'fa-pen'
  },
  {
    key: 'hosting-from',
    label: 'Hosting ab 5 € im Monat',
    labelEn: 'Hosting from 5 EUR a month',
    iconClass: 'fa-server'
  },
  {
    key: 'packages-from',
    label: 'Pakete ab {{lowestPackagePriceLabel}}',
    labelEn: 'Packages from {{lowestPackagePriceLabel}}',
    iconClass: 'fa-euro-sign'
  },
  {
    key: 'personal-support',
    label: 'Persönliche Betreuung',
    labelEn: 'Personal support',
    iconClass: 'fa-user-check'
  },
  {
    key: 'local-seo-foundation',
    label: 'Local-SEO-Grundlage',
    labelEn: 'Local SEO foundation',
    iconClass: 'fa-map-marker-alt'
  },
  {
    key: 'inquiry-structure',
    label: 'Struktur für Anfragen',
    labelEn: 'Inquiry structure',
    iconClass: 'fa-envelope'
  },
  {
    key: 'performance-goal',
    label: 'Schnelle Ladezeiten',
    labelEn: 'Fast loading',
    iconClass: 'fa-stopwatch'
  },
  {
    key: 'mobile-optimized',
    label: 'Mobile optimiert',
    labelEn: 'Mobile optimized',
    iconClass: 'fa-mobile-alt'
  },
  {
    key: 'transparent-addons',
    label: 'Transparente Zusatzleistungen',
    labelEn: 'Transparent add-ons',
    iconClass: 'fa-plus-circle'
  },
  {
    key: 'optional-maintenance',
    label: 'Wartung zu festen Monatspreisen',
    labelEn: 'Maintenance at fixed monthly prices',
    iconClass: 'fa-tools'
  },
  {
    key: 'berlin-brandenburg',
    label: 'Berlin & Brandenburg',
    labelEn: 'Berlin & Brandenburg',
    iconClass: 'fa-location-dot'
  }
]);

function normalizePriceLabel(label, lng = 'de') {
  const fallback = lng === 'en' ? 'a scoped estimate' : 'klarer Kalkulation';
  const normalizedLabel = String(label || '').trim();
  return normalizedLabel || fallback;
}

export function buildHomeHeroBridgeHighlights({ lng = 'de', lowestPackagePriceLabel = '' } = {}) {
  const priceLabel = normalizePriceLabel(lowestPackagePriceLabel, lng);

  return BASE_HERO_BRIDGE_HIGHLIGHTS.map((item) => {
    const rawLabel = lng === 'en' ? item.labelEn : item.label;
    return Object.freeze({
      ...item,
      label: rawLabel.replace('{{lowestPackagePriceLabel}}', priceLabel)
    });
  });
}

export const heroBridgeHighlights = BASE_HERO_BRIDGE_HIGHLIGHTS;
