// models/industryModel.js
import pool from '../util/db.js';

/**
 * Welche Spalten sind JSON/JSONB in der DB?
 * (pg liefert bei jsonb meist bereits Objekte/Arrays zurück; falls als Text, parsen wir.)
 */
const JSONB_COLS = [
  'carousel_items',     // Array
  'stats_cards',        // Array
  'seo_items',          // Array
  'funktionen_items',   // Array
  'vorteile',           // Objekt { pros:[], cons:[] }
  'tipps_items',        // Array
  'faq_items',          // Array
  'blocks'              // Array [{ type, position, ... }]
];

// text[]-Spalten
const TEXT_ARRAY_COLS = ['hero_checks'];

/* ---------- Helpers ---------- */
function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }
  return [];
}
function ensureObject(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (v == null || v === '') return {};
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {}; }
    catch { return {}; }
  }
  return {};
}

/**
 * Normalisiert/Parst eine DB-Zeile in die Strukturen,
 * die dein View erwartet (Arrays/Objekte statt Strings).
 */
function parseRow(row) {
  if (!row) return row;

  for (const col of JSONB_COLS) {
    if (!(col in row)) continue;
    // Sonderfall vorteile (Objekt) vs. die restlichen Arrays:
    if (col === 'vorteile') {
      const obj = ensureObject(row[col]);
      row[col] = {
        pros: Array.isArray(obj.pros) ? obj.pros : [],
        cons: Array.isArray(obj.cons) ? obj.cons : []
      };
    } else if (col === 'blocks') {
      row[col] = ensureArray(row[col]); // [{type, position, ...}]
    } else {
      row[col] = ensureArray(row[col]);
    }
  }

  // text[] → Array<string>
  for (const col of TEXT_ARRAY_COLS) {
    if (!(col in row) || Array.isArray(row[col])) continue;
    // Falls als einzelner String kam:
    if (typeof row[col] === 'string') row[col] = [row[col]];
    else if (row[col] == null) row[col] = [];
    else row[col] = [String(row[col])];
  }

  return row;
}

/* ---------- Public API ---------- */

export async function getIndustryBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT
       id, slug, name, title, description, og_image_url,
       hero_h1, hero_h2, hero_checks, hero_image_url, hero_image_alt,
       warum_image_url, warum_image_alt, warum_upper, warum_lower,
       unverzichtbar_intro, unverzichtbar_h3,
       carousel_items, stats_cards, seo_items,
       funktionen_items, vorteile, tipps_items,
       cta_headline, cta_text, cta_left_image, cta_right_image,
       faq_items,
       blocks,                -- ✨ wichtig für deine Partials
       updated_at
     FROM industries
     WHERE slug = $1
     LIMIT 1`,
    [String(slug || '').toLowerCase()]
  );
  if (!rows.length) return null;
  return parseRow(rows[0]);
}

export async function listIndustries() {
  // Für die Übersicht reichen meist Basisfelder. Wenn du dort JSON brauchst, kannst du parseRow auf jedes row anwenden.
  const { rows } = await pool.query(`
    SELECT
      id, slug, name, title, description,
      hero_image_url, og_image_url,
      COALESCE(featured, false) AS featured
    FROM industries
    ORDER BY featured DESC, name ASC
  `);
  return rows;
}
