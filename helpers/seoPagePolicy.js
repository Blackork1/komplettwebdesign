export const INDEXABLE_STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/llms.txt', changefreq: 'weekly', priority: 0.6 },
  { path: '/pricing.md', changefreq: 'monthly', priority: 0.6 },
  { path: '/en', changefreq: 'weekly', priority: 0.9 },
  { path: '/kontakt', changefreq: 'monthly', priority: 0.8 },
  { path: '/en/kontakt', changefreq: 'monthly', priority: 0.8 },
  { path: '/pakete', changefreq: 'monthly', priority: 0.8 },
  { path: '/pakete/basis', changefreq: 'monthly', priority: 0.7 },
  { path: '/pakete/business', changefreq: 'monthly', priority: 0.7 },
  { path: '/pakete/premium', changefreq: 'monthly', priority: 0.7 },
  { path: '/en/pakete', changefreq: 'monthly', priority: 0.8 },
  { path: '/en/pakete/basis', changefreq: 'monthly', priority: 0.7 },
  { path: '/en/pakete/business', changefreq: 'monthly', priority: 0.7 },
  { path: '/en/pakete/premium', changefreq: 'monthly', priority: 0.7 },
  { path: '/about', changefreq: 'monthly', priority: 0.6 },
  { path: '/blog', changefreq: 'weekly', priority: 0.8 },
  { path: '/website-tester', changefreq: 'weekly', priority: 1.0 },
  { path: '/en/website-tester', changefreq: 'weekly', priority: 0.95 },
  { path: '/website-tester/broken-links', changefreq: 'weekly', priority: 0.9 },
  { path: '/en/website-tester/broken-links', changefreq: 'weekly', priority: 0.85 },
  { path: '/website-tester/geo', changefreq: 'weekly', priority: 0.9 },
  { path: '/en/website-tester/geo', changefreq: 'weekly', priority: 0.85 },
  { path: '/website-tester/seo', changefreq: 'weekly', priority: 0.9 },
  { path: '/en/website-tester/seo', changefreq: 'weekly', priority: 0.85 },
  { path: '/website-tester/meta', changefreq: 'weekly', priority: 0.9 },
  { path: '/en/website-tester/meta', changefreq: 'weekly', priority: 0.85 },
  { path: '/ratgeber', changefreq: 'weekly', priority: 0.8 },
  { path: '/faq', changefreq: 'monthly', priority: 0.7 },
  { path: '/datenschutz', changefreq: 'yearly', priority: 0.2 },
  { path: '/impressum', changefreq: 'yearly', priority: 0.2 },
  { path: '/webdesign-cafe/kosten', changefreq: 'yearly', priority: 0.4 },
  { path: '/webdesign-blumenladen/kosten', changefreq: 'yearly', priority: 0.4 },
  { path: '/ratgeber/website-kosten-zeitplan', changefreq: 'monthly', priority: 0.7 },
  { path: '/ratgeber/kosten-einfache-website', changefreq: 'monthly', priority: 0.7 },
  { path: '/webdesign-berlin', changefreq: 'weekly', priority: 1.0 },
  { path: '/website-erstellen-lassen-berlin', changefreq: 'monthly', priority: 0.9 },
  { path: '/website-relaunch-berlin', changefreq: 'monthly', priority: 0.9 },
  { path: '/webdesign-kleine-unternehmen-berlin', changefreq: 'monthly', priority: 0.9 },
  { path: '/webdesign-berlin/kosten-preise-pakete', changefreq: 'monthly', priority: 0.9 },
  { path: '/referenzen', changefreq: 'monthly', priority: 0.8 },
  { path: '/referenzen/zur-alten-backstube', changefreq: 'monthly', priority: 0.7 },
  { path: '/referenzen/tm-sauber-mehr', changefreq: 'monthly', priority: 0.7 },
  { path: '/ablauf', changefreq: 'monthly', priority: 0.8 },
  { path: '/en/webdesign-berlin', changefreq: 'weekly', priority: 0.9 }
];

export const PRIORITY_INDUSTRY_SLUGS = [
  'handwerker',
  'restaurant',
  'cafe',
  'reinigungsfirma',
  'immobilienmakler'
];

export const REVIEWED_DISTRICT_SLUGS = [
  'lichtenberg',
  'mitte',
  'kreuzberg',
  'friedrichshain',
  'charlottenburg',
  'prenzlauer-berg'
];

const EXCLUDED_INDUSTRY_TERMS = [
  'kita',
  'kitas',
  'schule',
  'schulen',
  'school',
  'schools',
  'daycare',
  'daycares',
  'kindergarten'
];

export function normalizeIndustrySlug(slug = '') {
  return String(slug).trim().toLowerCase().replace(/^webdesign-/, '');
}

export function shouldIncludeIndustryInSitemap(row = {}) {
  const text = [row.slug, row.name, row.title, row.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (EXCLUDED_INDUSTRY_TERMS.some((term) => text.includes(term))) {
    return false;
  }

  return PRIORITY_INDUSTRY_SLUGS.includes(normalizeIndustrySlug(row.slug));
}

export function shouldIncludeDistrictInSitemap(slug = '') {
  return REVIEWED_DISTRICT_SLUGS.includes(String(slug).trim().toLowerCase());
}
