// controllers/adminLeistungenPagesController.js
import pool from '../util/db.js';

// ------------------------------------------------------------
// Konstanten / Helpers
// ------------------------------------------------------------

// JSONB-Felder in leistungen_pages
const JSONB_COLS = new Set([
  'hero_icons',
  'description',
  'services',
  'risks_items',
  'risks_conclusion'
]);

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'seite';
}

// JSONB-Werte in sauberes Format bringen
function normalizeFieldValue(key, val) {
  if (JSONB_COLS.has(key)) {
    if (val == null || val === '') return '[]';
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return '[]';
      try {
        JSON.parse(trimmed);
        return trimmed; // gültiger JSON-Text
      } catch {
        throw new Error(`Feld "${key}" enthält keinen gültigen JSON-Text.`);
      }
    }
    try {
      return JSON.stringify(val);
    } catch {
      throw new Error(`Feld "${key}" konnte nicht in JSON serialisiert werden.`);
    }
  }

  return val;
}

// Mappt dein JSON-Schema (page/hero/intro/...) auf Spalten von leistungen_pages
function mapPageJsonToRow(input = {}) {
  const page = input.page || input;

  if (!page) {
    throw new Error('Eintrag benötigt ein "page"-Objekt.');
  }

  const hero = page.hero || {};
  const intro = page.intro || {};
  const risks = page.risks || {};
  const cta = page.cta || {};

  const problem = intro.problem || {};
  const solution = intro.solution || {};

  const row = {
    slug: page.slug || slugify(page.title || hero.title),
    title: page.title || hero.title || '',
    subtitle: page.subtitle || '',
    is_published: page.is_published !== false, // default true
    meta_description: page.meta_description || '',

    hero_title: hero.title || page.title || '',
    hero_subtitle: hero.subtitle || '',
    hero_icons: hero.icons || [],

    intro_problem_title: problem.title || '',
    intro_problem_text: problem.text || '',
    intro_solution_title: solution.title || '',
    intro_solution_text: solution.text || '',

    description: page.description || [],

    services: page.services || [],

    risks_title: risks.title || '',
    risks_intro: risks.intro || '',
    risks_items: risks.items || [],
    risks_conclusion: risks.conclusion || [],

    cta_title: cta.title || '',
    cta_text: cta.text || '',
    cta_button_text: cta.buttonText || '',
    cta_button_link: cta.buttonLink || ''
  };

  if (!row.slug) {
    throw new Error('Eintrag benötigt einen slug oder title/hero.title.');
  }

  return row;
}

// Alle Felder normalisieren (inkl. JSONB)
function normalizeLeistungPayload(raw = {}) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined) {
      out[k] = normalizeFieldValue(k, v);
    }
  }
  if (!out.slug && (out.title || out.hero_title)) {
    out.slug = slugify(out.title || out.hero_title);
  }
  return out;
}

/**
 * Dynamisches UPSERT in leistungen_pages (Konflikt auf slug).
 * - id wird nie gesetzt
 * - JSONB-Felder ::jsonb
 */
async function upsertLeistungPage(rawObj) {
  if (!rawObj) {
    throw new Error('Leistungsseite: leeres Objekt.');
  }

  const obj = normalizeLeistungPayload(rawObj);
  if (!obj.slug) {
    throw new Error('Leistungsseite benötigt einen slug.');
  }

  const keysAll = Object.keys(obj);
  const keys = keysAll.filter(k => k !== 'id');
  if (!keys.length) throw new Error('Keine Felder zum Speichern vorhanden.');

  const columns = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((k, i) => {
    const p = `$${i + 1}`;
    if (JSONB_COLS.has(k)) return `${p}::jsonb`;
    return p;
  }).join(', ');

  const updates = keys
    .filter(k => k !== 'slug')
    .map(k => `"${k}" = EXCLUDED."${k}"`)
    .concat(['"updated_at" = NOW()'])
    .join(', ');

  const sql = `
    INSERT INTO leistungen_pages (${columns})
    VALUES (${placeholders})
    ON CONFLICT (slug) DO UPDATE SET ${updates}
    RETURNING *;
  `;

  const values = keys.map(k => obj[k]);
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function rowExistsBySlug(slug) {
  const { rows } = await pool.query(
    'SELECT 1 FROM leistungen_pages WHERE slug = $1',
    [slug]
  );
  return !!rows.length;
}

// ------------------------------------------------------------
// VIEW: Import-Form
// ------------------------------------------------------------
export async function importForm(req, res) {
  res.render('admin/leistungen_import', {
    title: 'Leistungsseiten-Import',
    description: '',
    ogImage: ''
  });
}

// ------------------------------------------------------------
// API: JSON-Import (per XHR/Fetch)
// Erwartet z.B.:
// { "items": [ { "page": { ... } }, { "page": { ... } } ] }
// oder ein einzelnes { "page": { ... } }
// ------------------------------------------------------------
export async function importJSON(req, res) {
  try {
    let { items } = req.body || {};

    // Flexibel sein:
    if (!items) {
      if (req.body.page) {
        items = [req.body];
      } else if (Array.isArray(req.body.pages)) {
        items = req.body.pages.map(p => ({ page: p }));
      } else if (Array.isArray(req.body)) {
        items = req.body;
      } else if (Object.keys(req.body || {}).length) {
        items = [req.body];
      }
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        ok: false,
        error: 'Payload muss entweder { items:[...]} oder { page:{...} } sein.'
      });
    }

    const results = [];
    for (const input of items) {
      const rowData = mapPageJsonToRow(input);
      const existed = await rowExistsBySlug(rowData.slug);
      const row = await upsertLeistungPage(rowData);

      results.push({
        slug: row.slug,
        title: row.title,
        action: existed ? 'updated' : 'inserted'
      });
    }

    return res.json({ ok: true, count: results.length, results });
  } catch (e) {
    console.error('❌ leistungen importJSON:', e);
    return res.status(500).json({
      ok: false,
      error: e.message || 'Import fehlgeschlagen'
    });
  }
}

// ------------------------------------------------------------
// Import per Datei-Upload (Form / Drag&Drop-Fallback)
// ------------------------------------------------------------
export async function importFile(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).render('admin/leistungen_import_result', {
        title: 'Import – Fehler',
        results: [],
        error: 'Keine Datei erhalten.'
      });
    }

    const text = req.file.buffer.toString('utf8').trim();
    const data = JSON.parse(text);

    let items;
    if (Array.isArray(data)) {
      items = data;
    } else if (data.items) {
      items = data.items;
    } else if (data.page) {
      items = [data];
    } else {
      items = [data];
    }

    if (!Array.isArray(items) || !items.length) {
      throw new Error('JSON enthält keine gültigen items/page-Einträge.');
    }

    const results = [];
    for (const input of items) {
      const rowData = mapPageJsonToRow(input);
      const existed = await rowExistsBySlug(rowData.slug);
      const row = await upsertLeistungPage(rowData);

      results.push({
        slug: row.slug,
        title: row.title,
        action: existed ? 'updated' : 'inserted'
      });
    }

    return res.render('admin/leistungen_import_result', {
      title: 'Import – Ergebnis',
      results,
      error: null
    });
  } catch (e) {
    console.error('❌ leistungen importFile:', e);
    return res.status(400).render('admin/leistungen_import_result', {
      title: 'Import – Fehler',
      results: [],
      error: e.message || 'Ungültige JSON-Datei.'
    });
  }
}
