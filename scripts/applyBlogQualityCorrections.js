// Wendet die Blog-Textkorrekturen aus services/blogQualityCorrections.js an.
// Ohne --apply: nur Vorschau, nichts wird geschrieben. Mit --apply: Sicherung der alten Fassung in
// .superpowers/blog-quality-backups/, dann ein Update je Artikel. Bricht vor dem ersten Schreiben ab,
// wenn eine Ersetzung nicht passt, und je Artikel, wenn sich der Text seit dem Lesen geändert hat.
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BLOG_QUALITY_SLUGS, correctBlogQuality } from '../services/blogQualityCorrections.js';

const FIELDS = ['title', 'description', 'excerpt', 'meta_title', 'meta_description', 'og_title', 'og_description', 'content', 'faq_json'];

// jsonb speichert Schlüssel in eigener Reihenfolge; verglichen wird deshalb unabhängig davon.
const canonical = (value) => JSON.stringify(value, (key, item) => (item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map((name) => [name, item[name]]))
  : item));

export async function applyBlogQualityCorrections(db, { apply = false, backupDirectory = resolve('.superpowers/blog-quality-backups'), pauseMs = 20 } = {}) {
  const client = await db.connect();
  let backupPath;
  let inTransaction = false;
  try {
    const { rows } = await client.query('SELECT * FROM posts WHERE slug = ANY($1::text[]) ORDER BY id', [BLOG_QUALITY_SLUGS]);
    const results = rows.map((post) => ({ before: post, ...correctBlogQuality(post) }));
    const unmatched = results.flatMap(({ before, unmatched: list }) => list.map((item) => ({ slug: before.slug, ...item })));
    if (unmatched.length) {
      const error = new Error('Mindestens eine Ersetzung passt nicht mehr zum gespeicherten Text.');
      error.code = 'CORRECTION_UNMATCHED';
      error.unmatched = unmatched;
      throw error;
    }
    const changes = results.map(({ before, post }) => ({
      before,
      after: post,
      fields: FIELDS.filter((field) => canonical(before[field]) !== canonical(post[field]))
    })).filter((change) => change.fields.length);
    if (apply && changes.length) {
      await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
      backupPath = resolve(backupDirectory, `posts-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), posts: changes.map(({ before }) => before) }, null, 2), { mode: 0o600, flag: 'wx' });
      // Eine Transaktion je Artikel: Der Trigger trg_posts_set_updated_at setzt updated_at = now(), also den
      // Start der Transaktion. Gleiche Zeitstempel bei mehreren Artikeln gelten in helpers/contentDates.js
      // als Sammel-Migration, dann zeigte die Seite kein „Aktualisiert am“.
      for (const { before, after, fields } of changes) {
        await client.query('BEGIN');
        inTransaction = true;
        const { rows: [current] } = await client.query('SELECT * FROM posts WHERE id = $1 FOR UPDATE', [before.id]);
        if (!current || FIELDS.some((field) => canonical(current[field]) !== canonical(before[field]))) {
          const error = new Error(`Artikel ${before.slug} wurde seit dem Lesen geändert.`);
          error.code = 'CORRECTION_CONFLICT';
          throw error;
        }
        const values = fields.map((field) => (field === 'faq_json' ? JSON.stringify(after[field]) : after[field]));
        values.push(before.id);
        const set = fields.map((field, index) => `${field} = $${index + 1}${field === 'faq_json' ? '::jsonb' : ''}`);
        const result = await client.query(`UPDATE posts SET ${set.join(', ')} WHERE id = $${values.length}`, values);
        if (result.rowCount !== 1) throw new Error('Unerwartete Anzahl geänderter Artikel.');
        await client.query('COMMIT');
        inTransaction = false;
        await new Promise((done) => setTimeout(done, pauseMs));
      }
    }
    return {
      applied: apply,
      found: rows.map((row) => row.slug),
      missing: BLOG_QUALITY_SLUGS.filter((slug) => !rows.some((row) => row.slug === slug)),
      changes: changes.map(({ before, fields }) => ({ slug: before.slug, fields })),
      ...(backupPath ? { backupPath } : {})
    };
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: pool } = await import('../util/db.js');
  try { console.log(JSON.stringify(await applyBlogQualityCorrections(pool, { apply: process.argv.includes('--apply') }), null, 2)); }
  catch (error) { console.error(JSON.stringify({ error: 'Blog-Textkorrektur fehlgeschlagen.', code: error.code || 'CORRECTION_FAILED', unmatched: error.unmatched })); process.exitCode = 1; }
  finally { await pool.end(); }
}
