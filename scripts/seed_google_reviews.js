/**
 * Seed-Script für Google-Bewertungen.
 *
 * Nutzung:
 *   1. Migration ausführen:
 *      psql "$DATABASE_URL" -f scripts/alter_reviews_add_rating_created_at.sql
 *
 *   2. JSON-Datei pflegen: data/google-reviews.json
 *      (Array aus Review-Objekten – siehe Schema unten)
 *
 *   3. Seed ausführen:
 *      node scripts/seed_google_reviews.js
 *
 * Schema (pro Review):
 *   {
 *     "external_id": "gmb_001",          // eindeutig, frei wählbar (z.B. Google-Review-ID oder Slug)
 *     "author":      "Max Mustermann",
 *     "rating":      5,                  // 1..5
 *     "content":     "Bewertungstext...",
 *     "created_at":  "2025-09-14",       // ISO-Datum (YYYY-MM-DD)
 *     "avatar_url":  "https://..."       // optional
 *   }
 *
 * Re-Seeds sind idempotent: dank UNIQUE(source, external_id) werden bestehende
 * Einträge per UPSERT aktualisiert.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../util/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'data', 'google-reviews.json');

function assertReview(r, idx) {
  const missing = [];
  if (!r.author || typeof r.author !== 'string') missing.push('author');
  if (!r.content || typeof r.content !== 'string') missing.push('content');
  if (typeof r.rating !== 'number' || r.rating < 1 || r.rating > 5) missing.push('rating (1..5)');
  if (missing.length) {
    throw new Error(`Review #${idx} (${r.author || '?'}) – Pflichtfelder fehlen: ${missing.join(', ')}`);
  }
}

async function upsertReview(r) {
  const sql = `
    INSERT INTO reviews (author, content, rating, avatar_url, approved, source, external_id, created_at)
    VALUES ($1, $2, $3, $4, true, 'google', $5, COALESCE($6::timestamptz, NOW()))
    ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL
    DO UPDATE SET
      author     = EXCLUDED.author,
      content    = EXCLUDED.content,
      rating     = EXCLUDED.rating,
      avatar_url = EXCLUDED.avatar_url,
      approved   = true,
      created_at = EXCLUDED.created_at
    RETURNING id, author, rating;
  `;
  const params = [
    r.author.trim(),
    r.content.trim(),
    r.rating,
    r.avatar_url || null,
    r.external_id || null,
    r.created_at || null
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function main() {
  let raw;
  try {
    raw = await fs.readFile(JSON_PATH, 'utf8');
  } catch (err) {
    console.error(`❌ Konnte Datei nicht lesen: ${JSON_PATH}`);
    console.error('Lege data/google-reviews.json mit deinen Google-Bewertungen an (siehe Scripts-Header).');
    process.exit(1);
  }

  let reviews;
  try {
    reviews = JSON.parse(raw);
  } catch (err) {
    console.error('❌ JSON ist ungültig:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(reviews)) {
    console.error('❌ JSON muss ein Array sein.');
    process.exit(1);
  }

  console.log(`→ ${reviews.length} Review(s) werden verarbeitet…`);

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < reviews.length; i++) {
    const r = reviews[i];
    try {
      assertReview(r, i + 1);
      const row = await upsertReview(r);
      console.log(`  ✓ #${row.id}  ${row.author}  (${row.rating}★)`);
      inserted++;
    } catch (err) {
      console.error(`  ✗ Review #${i + 1}:`, err.message);
      failed++;
    }
  }

  // Aggregat-Check (für Schema.org Gating)
  const { rows: agg } = await pool.query(`
    SELECT COUNT(*)::int AS count,
           ROUND(AVG(NULLIF(rating,0))::numeric, 1) AS avg
    FROM reviews
    WHERE approved = true AND rating IS NOT NULL AND rating > 0
  `);

  console.log('\n── Zusammenfassung ───────────────────────────');
  console.log(`Verarbeitet : ${reviews.length}`);
  console.log(`Erfolgreich : ${inserted}`);
  console.log(`Fehler      : ${failed}`);
  console.log(`\nAggregat (approved + rating > 0):`);
  console.log(`  count = ${agg[0].count}, avg = ${agg[0].avg ?? '–'}`);
  if (agg[0].count < 3) {
    console.log('  ⚠  <3 Reviews → AggregateRating-Schema wird noch NICHT ausgeliefert.');
  } else {
    console.log('  ✓  ≥3 Reviews → AggregateRating wird auf der Startseite ausgespielt.');
  }

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('💥 Unerwarteter Fehler:', err);
  pool.end().finally(() => process.exit(1));
});
