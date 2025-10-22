// controllers/adminIndustriesController.js
import pool from '../util/db.js';
import { rebuildIndustryEmbeddings } from '../scripts/embeddingsService.js';
import * as Industry from '../models/industryModel.js'; // optional in anderen Controllern genutzt

// ------------------------------------------------------------
// Konstanten / Helpers
// ------------------------------------------------------------
// JSONB-Felder (serverseitig als ::jsonb gespeichert)
// ✨ zentral: nur noch "blocks"
const JSONB_COLS = new Set([
  'carousel_items', 'stats_cards', 'seo_items',
  'funktionen_items', 'vorteile', 'tipps_items', 'faq_items',
  'blocks'
]);

// text[]-Felder
const TEXT_ARRAY_COLS = new Set(['hero_checks']);

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function normalizeFieldValue(key, val) {
  if (JSONB_COLS.has(key)) {
    if (val == null || val === '') return '[]';
    if (typeof val === 'string') {
      try { JSON.parse(val); return val; }
      catch { throw new Error(`Feld "${key}" enthält keinen gültigen JSON-Text.`); }
    }
    try { return JSON.stringify(val); }
    catch { throw new Error(`Feld "${key}" konnte nicht in JSON serialisiert werden.`); }
  }

  if (TEXT_ARRAY_COLS.has(key)) {
    if (Array.isArray(val)) return val.map(v => String(v));
    if (typeof val === 'string') {
      return val.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    if (val == null) return [];
    return [String(val)];
  }

  return val;
}

function normalizeIndustryPayload(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = normalizeFieldValue(k, v);
  if (!out.slug && out.name) out.slug = slugify(out.name);
  return out;
}

/**
 * Dynamisches UPSERT (Konflikt auf slug).
 * - 'id' wird nicht gesetzt
 * - JSONB-Felder ::jsonb, text[] ::text[]
 */
async function upsertIndustryDynamic(rawObj) {
  if (!rawObj || (!rawObj.slug && !rawObj.name)) {
    throw new Error('Eintrag benötigt mindestens "slug" oder "name".');
  }

  const obj = normalizeIndustryPayload(rawObj);
  if (!obj.slug) obj.slug = slugify(obj.name);

  const keysAll = Object.keys(obj);
  const keys = keysAll.filter(k => k !== 'id'); // id nie manuell setzen
  if (!keys.length) throw new Error('Keine Felder vorhanden.');

  const columns = keys.map(k => `"${k}"`).join(',');
  const placeholders = keys.map((k, i) => {
    const p = `$${i + 1}`;
    if (JSONB_COLS.has(k)) return `${p}::jsonb`;
    if (TEXT_ARRAY_COLS.has(k)) return `${p}::text[]`;
    return p;
  }).join(',');

  const updates = keys
    .filter(k => k !== 'slug')
    .map(k => `"${k}" = EXCLUDED."${k}"`)
    .join(', ');

  const sql = `
    INSERT INTO industries (${columns})
    VALUES (${placeholders})
    ON CONFLICT (slug) DO UPDATE SET ${updates}
    RETURNING *;
  `;

  const values = keys.map(k => obj[k]);
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function rowExistsBySlug(slug) {
  const { rows } = await pool.query('SELECT 1 FROM industries WHERE slug = $1', [slug]);
  return !!rows.length;
}

// ------------------------------------------------------------
// VIEWS
// ------------------------------------------------------------
export async function importForm(req, res) {
  res.render('admin/industries_import', {
    title: 'Branchen-Import',
    description: '',
    ogImage: ''
  });
}

// ------------------------------------------------------------
// API: JSON-Import
// ------------------------------------------------------------
export async function importJSON(req, res) {
  try {
    const { items, rebuild_embeddings } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ ok: false, error: 'Payload muss { items: [...] } sein.' });
    }

    const results = [];
    for (const input of items) {
      const data = { ...input };
      if (!data.slug) data.slug = slugify(data.name);

      const existed = await rowExistsBySlug(data.slug);
      const row = await upsertIndustryDynamic(data);

      if (rebuild_embeddings) {
        try { await rebuildIndustryEmbeddings(row); } catch (e) { console.error('Embeddings:', e.message); }
      }
      results.push({ slug: row.slug, name: row.name, action: existed ? 'updated' : 'inserted' });
    }
    return res.json({ ok: true, count: results.length, results });
  } catch (e) {
    console.error('❌ importJSON:', e);
    return res.status(500).json({ ok: false, error: e.message || 'Import fehlgeschlagen' });
  }
}

export async function importFile(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).render('admin/industries_import_result', {
        title: 'Import – Fehler',
        results: [],
        error: 'Keine Datei erhalten.'
      });
    }
    const text = req.file.buffer.toString('utf8').trim();
    const data = JSON.parse(text);
    const rebuild_embeddings = !!req.body.rebuild_embeddings;
    const items = Array.isArray(data) ? data : [data];

    const results = [];
    for (const input of items) {
      const obj = { ...input };
      if (!obj.slug) obj.slug = slugify(obj.name);
      const existed = await rowExistsBySlug(obj.slug);
      const row = await upsertIndustryDynamic(obj);
      if (rebuild_embeddings) {
        try { await rebuildIndustryEmbeddings(row); } catch (e) { console.error('Embeddings:', e.message); }
      }
      results.push({ slug: row.slug, name: row.name, action: existed ? 'updated' : 'inserted' });
    }

    return res.render('admin/industries_import_result', {
      title: 'Import – Ergebnis',
      results,
      error: null
    });
  } catch (e) {
    console.error('❌ importFile:', e);
    return res.status(400).render('admin/industries_import_result', {
      title: 'Import – Fehler',
      results: [],
      error: e.message || 'Ungültige JSON-Datei.'
    });
  }
}

// ------------------------------------------------------------
// Admin-CRUD (Form basiert)
// ------------------------------------------------------------
const JSON_FIELDS = [
  'carousel_items', 'stats_cards', 'seo_items',
  'funktionen_items', 'vorteile', 'tipps_items', 'faq_items',
  'blocks'
];

function parseJSONSafe(val, fallback) {
  if (val == null || val === '') return fallback;
  try { return JSON.parse(val); } catch { return { __error: true, raw: val }; }
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map(k => [k, obj[k]]));
}

export async function list(req, res) {
  const { rows } = await pool.query(`SELECT id, slug, name, updated_at FROM industries ORDER BY name`);
  res.render('admin/industries_list', { rows, title: 'Branchen – Admin' });
}

export async function newForm(req, res) {
  res.render('admin/industries_form', {
    title: 'Neue Branche',
    mode: 'create',
    row: {
      slug: '', name: '', title: '', description: '', og_image_url: '',
      hero_h1: '', hero_h2: '', hero_checks: [],
      hero_image_url: '', hero_image_alt: '',
      warum_image_url: '', warum_image_alt: '', warum_upper: '', warum_lower: '',
      unverzichtbar_intro: '',
      unverzichtbar_h3: '',
      carousel_items: [], stats_cards: [], seo_items: [],
      funktionen_items: [], vorteile: { pros: [], cons: [] }, tipps_items: [],
      cta_headline: '', cta_text: '', cta_left_image: '', cta_right_image: '',
      faq_items: [],
      // ✨ NEU – eine zentrale Liste:
      blocks: []
    },
    errors: null
  });
}

export function ensureUuid(req, res, next) {
  const { id } = req.params || {};
  if (!/^[0-9a-fA-F-]{36}$/.test(String(id || ''))) {
    return res.status(404).send('Nicht gefunden');
  }
  next();
}

export async function create(req, res) {
  const b = req.body;

  const hero_checks = normalizeFieldValue('hero_checks', b.hero_checks || '');
  const parsed = Object.fromEntries(
    JSON_FIELDS.map(f => [f, parseJSONSafe(b[f], f === 'vorteile' ? { pros: [], cons: [] } : [])])
  );

  const jsonError = Object.entries(parsed).find(([_, v]) => v && v.__error);
  if (jsonError) {
    return res.render('admin/industries_form', {
      title: 'Neue Branche',
      mode: 'create',
      row: {
        ...b,
        hero_checks,
        ...Object.fromEntries(JSON_FIELDS.map(f => [f, b[f]]))
      },
      errors: { message: `JSON-Feld "${jsonError[0]}" enthält ungültiges JSON.` }
    });
  }

  const keys = [
    'slug', 'name', 'title', 'description', 'og_image_url',
    'hero_h1', 'hero_h2', 'hero_image_url', 'hero_image_alt',
    'warum_image_url', 'warum_image_alt', 'warum_upper', 'warum_lower',
    'unverzichtbar_intro', 'unverzichtbar_h3',
    'cta_headline', 'cta_text', 'cta_left_image', 'cta_right_image'
  ];
  const simple = pick(b, keys);
  simple.slug = String(simple.slug || '').toLowerCase();

  const row = await upsertIndustryDynamic({
    ...simple,
    hero_checks,
    ...parsed // enthält auch "blocks"
  });

  if (b.rebuild_embeddings === 'on') {
    try { await rebuildIndustryEmbeddings(row); } catch (e) { console.error('Embeddings:', e.message); }
  }

  res.redirect('/admin/industries');
}

export async function editForm(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(`SELECT * FROM industries WHERE id = $1`, [id]);
  if (!rows.length) return res.status(404).send('Nicht gefunden');

  const row = rows[0];
  res.render('admin/industries_form', {
    title: `Branche bearbeiten – ${row.name}`,
    mode: 'edit',
    row,
    errors: null
  });
}

export async function update(req, res) {
  const { id } = req.params;
  const b = req.body;

  const hero_checks = normalizeFieldValue('hero_checks', b.hero_checks || '');
  const parsed = Object.fromEntries(
    JSON_FIELDS.map(f => [f, parseJSONSafe(b[f], f === 'vorteile' ? { pros: [], cons: [] } : [])])
  );

  const jsonError = Object.entries(parsed).find(([_, v]) => v && v.__error);
  if (jsonError) {
    return res.render('admin/industries_form', {
      title: 'Branche bearbeiten',
      mode: 'edit',
      row: {
        id,
        ...b,
        hero_checks,
        ...Object.fromEntries(JSON_FIELDS.map(f => [f, b[f]]))
      },
      errors: { message: `JSON-Feld "${jsonError[0]}" enthält ungültiges JSON.` }
    });
  }

  const { rows: exist } = await pool.query(`SELECT id, slug FROM industries WHERE id=$1`, [id]);
  if (!exist.length) return res.status(404).send('Nicht gefunden');

  const row = await upsertIndustryDynamic({
    ...b,
    slug: String(b.slug || exist[0].slug).toLowerCase(),
    hero_checks,
    ...parsed // enthält auch "blocks"
  });

  if (b.rebuild_embeddings === 'on') {
    try { await rebuildIndustryEmbeddings(row); } catch (e) { console.error('Embeddings:', e.message); }
  }

  res.redirect('/admin/industries');
}

export async function remove(req, res) {
  const { id } = req.params;
  await pool.query(`DELETE FROM industries WHERE id = $1`, [id]);
  res.redirect('/admin/industries');
}
