import pool from '../util/db.js';
import { buildHandwerkerPageSchemas, HANDWERKER_FAQ } from '../helpers/pageSchema.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';
import { interpolatePricingTokens } from '../util/pricingViewModel.js';
import { HANDWERKER_PAGE, HANDWERKER_CONTENT_UPDATED_ISO } from '../data/handwerkerPage.js';
import { SITE_FACTS, formatGoogleRating } from '../helpers/siteFacts.js';

export async function getPageBySlug(req, res, next) {
  const slug = req.params.slug;
  const db = req.app.get('db');
  try {
    // Lade Seite nach Slug
    const { rows: pages } = await db.query(
      'SELECT * FROM pages WHERE slug = $1 AND display = TRUE',
      [slug]
    );
    if (!pages.length) return next(); // keine Seite -> weiter zu 404

    const page = normalizeLegacyPublicCopy(renderPricingTokens(pages[0], res.locals.packagePricing || {}), res.locals.packagePricing || {});

    if (page.slug === 'handwerker') {
      return res.render('handwerker', buildHandwerkerViewModel(page, res.locals));
    }

    // Lade alle Komponenten der Seite
    const { rows: rawComps } = await db.query(
      'SELECT * FROM components WHERE page_id = $1 ORDER BY order_index',
      [page.id]
    );
    const comps = normalizeLegacyPublicCopy(renderPricingTokens(rawComps, res.locals.packagePricing || {}), res.locals.packagePricing || {});

    // Baumstruktur für Komponenten
    const map = {};
    comps.forEach(c => {
      c.children = [];
      map[c.id] = c;
    });
    const roots = [];
    comps.forEach(c => {
      if (c.parent_id) {
        map[c.parent_id]?.children.push(c);
      } else {
        roots.push(c);
      }
    });
    roots.forEach(c => {
      c.children.sort((a, b) => a.order_index - b.order_index);
    });

    const structuredDataBlocks =
      page.slug === 'handwerker'
        ? [
            buildHandwerkerPageSchemas({
              page,
              url: res.locals.canonicalUrl,
              baseUrl: res.locals.canonicalBaseUrl
            })
          ]
        : [];

    // Rendern der Public-Seite mit Komponenten
    res.render('page_view', {
      page,
      components: roots,
      structuredDataBlocks
    });
  } catch (err) {
    console.error('Fehler beim Slug-Routing:', err);
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    res.status(500).send('Interner Serverfehler');
  }
}

const HANDWERKER_PACKAGE_KEYS = ['start', 'business', 'wachstum'];

// Seite „Website für Handwerker in Berlin“: Inhalte aus data/handwerkerPage.js, Preise aus dem Katalog.
export function buildHandwerkerViewModel(page = {}, locals = {}) {
  const pricing = locals.packagePricing || {};
  const handwerkerPage = interpolatePricingTokens(HANDWERKER_PAGE, pricing, { lng: 'de' });
  const handwerkerFaq = interpolatePricingTokens(HANDWERKER_FAQ, pricing, { lng: 'de' });
  // Ohne Preiskatalog bleibt kein leeres „| “ am Ende des Titels stehen.
  const title = handwerkerPage.metaTitle.replace(/\s*\|\s*$/, '');
  const description = handwerkerPage.metaDescription.replace(/\s*Pakete\s*\.\s*/, ' ').trim();
  const visiblePackages = Array.isArray(locals.visiblePackages) ? locals.visiblePackages : [];
  const priceLabel = (key) => (typeof pricing.priceLabel === 'function' ? pricing.priceLabel(key, 'de') : '');
  const packageCards = HANDWERKER_PACKAGE_KEYS.map((key) => {
    const pkg = visiblePackages.find((item) => String(item?.packageKey || item?.slug || '').toLowerCase() === key);
    if (!pkg) return null;
    return {
      key,
      name: pkg.name,
      price: priceLabel(key) || pkg.priceLabel || '',
      fit: handwerkerPage.pricing.fits[key],
      href: pkg.canonicalPath || `/pakete/${key}`,
      featured: key === 'business'
    };
  }).filter(Boolean);
  const reviewedPage = { ...page, title, description, updated_at: HANDWERKER_CONTENT_UPDATED_ISO };

  return {
    title,
    description,
    packages: visiblePackages,
    packageCards,
    handwerkerPage,
    handwerkerFaq,
    googleRating: { label: formatGoogleRating('de'), href: SITE_FACTS.googleProfileUrl },
    phone: SITE_FACTS.phone,
    phoneDisplay: SITE_FACTS.phoneDisplay,
    contentUpdatedIso: HANDWERKER_CONTENT_UPDATED_ISO,
    structuredDataBlocks: [buildHandwerkerPageSchemas({
      page: reviewedPage,
      url: locals.canonicalUrl,
      baseUrl: locals.canonicalBaseUrl,
      faq: handwerkerFaq
    })]
  };
}
