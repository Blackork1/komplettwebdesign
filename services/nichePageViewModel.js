// Branchenseiten mit eigenem Inhalt statt der Datenbank-Vorlage (Reinigung, Blumenladen, Fitness,
// Immobilienmakler, Restaurant, Café). Die Adresse bleibt
// /branchen/webdesign-<slug>; die Datenbankeinträge bleiben unverändert erhalten.
import { interpolatePricingTokens } from '../util/pricingViewModel.js';
import { buildNichePageSchemas } from '../helpers/pageSchema.js';
import { SITE_FACTS, formatGoogleRating } from '../helpers/siteFacts.js';
import { REINIGUNG_PAGE, REINIGUNG_FAQ, REINIGUNG_CONTENT_UPDATED_ISO } from '../data/reinigungPage.js';
import { BLUMENLADEN_PAGE, BLUMENLADEN_FAQ, BLUMENLADEN_CONTENT_UPDATED_ISO } from '../data/blumenladenPage.js';
import { FITNESS_PAGE, FITNESS_FAQ, FITNESS_CONTENT_UPDATED_ISO } from '../data/fitnessPage.js';
import { IMMOBILIENMAKLER_PAGE, IMMOBILIENMAKLER_FAQ, IMMOBILIENMAKLER_CONTENT_UPDATED_ISO } from '../data/immobilienmaklerPage.js';
import { RESTAURANT_PAGE, RESTAURANT_FAQ, RESTAURANT_CONTENT_UPDATED_ISO } from '../data/restaurantPage.js';
import { CAFE_PAGE, CAFE_FAQ, CAFE_CONTENT_UPDATED_ISO } from '../data/cafePage.js';

export const NICHE_PAGES = Object.freeze({
  reinigung: Object.freeze({ page: REINIGUNG_PAGE, faq: REINIGUNG_FAQ, updatedIso: REINIGUNG_CONTENT_UPDATED_ISO }),
  blumenladen: Object.freeze({ page: BLUMENLADEN_PAGE, faq: BLUMENLADEN_FAQ, updatedIso: BLUMENLADEN_CONTENT_UPDATED_ISO }),
  fitnesscoach: Object.freeze({ page: FITNESS_PAGE, faq: FITNESS_FAQ, updatedIso: FITNESS_CONTENT_UPDATED_ISO }),
  immobilienmakler: Object.freeze({ page: IMMOBILIENMAKLER_PAGE, faq: IMMOBILIENMAKLER_FAQ, updatedIso: IMMOBILIENMAKLER_CONTENT_UPDATED_ISO }),
  restaurant: Object.freeze({ page: RESTAURANT_PAGE, faq: RESTAURANT_FAQ, updatedIso: RESTAURANT_CONTENT_UPDATED_ISO }),
  cafe: Object.freeze({ page: CAFE_PAGE, faq: CAFE_FAQ, updatedIso: CAFE_CONTENT_UPDATED_ISO })
});

const PACKAGE_KEYS = ['start', 'business', 'wachstum'];

export function getNichePage(slug) {
  const key = String(slug || '').toLowerCase().replace(/^webdesign-/, '');
  return Object.hasOwn(NICHE_PAGES, key) ? NICHE_PAGES[key] : null;
}

export function buildNichePageViewModel(niche, locals = {}) {
  const pricing = locals.packagePricing || {};
  const nichePage = interpolatePricingTokens(niche.page, pricing, { lng: 'de' });
  const nicheFaq = interpolatePricingTokens(niche.faq, pricing, { lng: 'de' });
  // Ohne Preiskatalog bleiben keine leeren Platzhalter oder Satzreste stehen.
  const title = nichePage.metaTitle.replace(/\s*\|\s*$/, '');
  const description = nichePage.metaDescription.replace(/,\s*\./, '.').replace(/\s+\./g, '.').trim();
  const pricingSection = nichePage.sections.find((section) => section.type === 'pricing') || { fits: {} };
  const visiblePackages = Array.isArray(locals.visiblePackages) ? locals.visiblePackages : [];
  const priceLabel = (key) => (typeof pricing.priceLabel === 'function' ? pricing.priceLabel(key, 'de') : '');
  const packageCards = PACKAGE_KEYS.map((key) => {
    const pkg = visiblePackages.find((item) => String(item?.packageKey || item?.slug || '').toLowerCase() === key);
    if (!pkg) return null;
    return {
      key,
      name: pkg.name,
      price: priceLabel(key) || pkg.priceLabel || '',
      fit: pricingSection.fits[key],
      href: pkg.canonicalPath || `/pakete/${key}`,
      featured: key === 'business'
    };
  }).filter(Boolean);

  return {
    title,
    description,
    ogImage: /^https?:\/\//.test(nichePage.hero.image)
      ? nichePage.hero.image
      : `${String(locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '')}${nichePage.hero.image}`,
    packages: visiblePackages,
    packageCards,
    nichePage,
    nicheFaq,
    googleRating: { label: formatGoogleRating('de'), href: SITE_FACTS.googleProfileUrl },
    phone: SITE_FACTS.phone,
    phoneDisplay: SITE_FACTS.phoneDisplay,
    contentUpdatedIso: niche.updatedIso,
    structuredDataBlocks: [buildNichePageSchemas({
      nichePage,
      title,
      description,
      url: locals.canonicalUrl,
      baseUrl: locals.canonicalBaseUrl,
      faq: nicheFaq,
      updatedIso: niche.updatedIso
    })]
  };
}
