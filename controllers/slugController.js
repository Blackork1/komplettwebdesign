import pool from '../util/db.js';
import { buildHandwerkerPageSchemas, HANDWERKER_FAQ } from '../helpers/pageSchema.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';

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
      const reviewedPage = {
        ...page,
        title: 'Handwerker-Website Berlin: Leistungen und Referenzen',
        description: 'Webdesign für Handwerksbetriebe in Berlin: klare Leistungsseiten, Einsatzgebiet, Projektbilder und einfache Kontaktanfragen.',
        updated_at: '2026-10-23'
      };
      return res.render('handwerker', {
        title: reviewedPage.title,
        description: reviewedPage.description,
        packages: res.locals.visiblePackages || [],
        handwerkerFaq: HANDWERKER_FAQ,
        structuredDataBlocks: [buildHandwerkerPageSchemas({ page: reviewedPage, url: res.locals.canonicalUrl, baseUrl: res.locals.canonicalBaseUrl })]
      });
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
