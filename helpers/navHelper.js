// helpers/navHelper.js
import { fileURLToPath } from 'url';
import path from 'path';


/**
 * Gibt eine Express-Middleware zurück, die aus der DB
 * die Seiten (title, slug) lädt und in res.locals.navPages ablegt.
 * @param {Pool} pool – deine PostgreSQL-Pool-Instanz
 */
export function navbarMiddleware(pool) {
  return async (req, res, next) => {
    try {
      const [{ rows: pages }, { rows: industries }] = await Promise.all([
        pool.query(`
          SELECT title, slug, nav
          FROM pages WHERE display = true
          ORDER BY title
        `),
        pool.query(`
          SELECT slug, name
          FROM industries
          ORDER BY name
        `)
      ]);
      res.locals.navPages = pages;
      res.locals.navIndustries = industries.map((industry) => ({
        name: industry.name,
        slug: industry.slug
      }));
    } catch (err) {
      console.error('⚠️ Fehler beim Laden der Navbar-Seiten:', err);
      res.locals.navPages = [];
      res.locals.navIndustries = [];
    }
    next();
  };
}
