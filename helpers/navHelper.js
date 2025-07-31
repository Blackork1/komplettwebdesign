// helpers/navHelper.js
import { fileURLToPath } from 'url';
import path              from 'path';


/**
 * Gibt eine Express-Middleware zurück, die aus der DB
 * die Seiten (title, slug) lädt und in res.locals.navPages ablegt.
 * @param {Pool} pool – deine PostgreSQL-Pool-Instanz
 */
export function navbarMiddleware(pool) {
  return async (req, res, next) => {
    try {
      const { rows: pages } = await pool.query(`
        SELECT title, slug, nav
        FROM pages WHERE display = true
        ORDER BY title 
      `);
      res.locals.navPages = pages;
    } catch (err) {
      console.error('⚠️ Fehler beim Laden der Navbar-Seiten:', err);
      res.locals.navPages = [];
    }
    next();
  };
}
