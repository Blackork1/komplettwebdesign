import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AUDITED_LEGACY_BLOG_SLUGS, AUDITED_BLOG_META, correctAuditedPost } from '../services/seoAuditContentCorrections.js';

const FIELDS = ['title', 'description', 'excerpt', 'meta_title', 'meta_description', 'og_title', 'og_description', 'content', 'faq_json'];

export async function fixSeoAuditContent(db, { apply = false, backupDirectory = resolve('.superpowers/seo-audit-backups') } = {}) {
  const client = await db.connect();
  let backupPath;
  try {
    await client.query('BEGIN');
    const slugs = [...new Set([...AUDITED_LEGACY_BLOG_SLUGS, ...Object.keys(AUDITED_BLOG_META)])];
    const { rows } = await client.query('SELECT * FROM posts WHERE published = true AND slug = ANY($1::text[]) ORDER BY id FOR UPDATE', [slugs]);
    const changes = rows.map(post => {
      const corrected = correctAuditedPost(post);
      const fields = FIELDS.filter(field => JSON.stringify(post[field]) !== JSON.stringify(corrected[field]));
      return { post, corrected, fields };
    }).filter(change => change.fields.length);
    if (apply && changes.length) {
      await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
      backupPath = resolve(backupDirectory, `posts-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), posts: changes.map(({ post }) => post) }, null, 2), { mode: 0o600, flag: 'wx' });
      for (const { post, corrected, fields } of changes) {
        const values = fields.map(field => field === 'faq_json' ? JSON.stringify(corrected[field]) : corrected[field]);
        values.push(post.id);
        const set = fields.map((field, index) => `${field} = $${index + 1}${field === 'faq_json' ? '::jsonb' : ''}`);
        const result = await client.query(`UPDATE posts SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
        if (result.rowCount !== 1) throw new Error('Unerwartete Anzahl geänderter Artikel.');
      }
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { applied: apply, found: rows.length, missing: slugs.filter(slug => !rows.some(row => row.slug === slug)), changed: changes.length, changes: changes.map(({ post, fields }) => ({ slug: post.slug, fields })), ...(backupPath ? { backupPath } : {}) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: pool } = await import('../util/db.js');
  try { console.log(JSON.stringify(await fixSeoAuditContent(pool, { apply: process.argv.includes('--apply') }), null, 2)); }
  catch (error) { console.error(JSON.stringify({ error: 'SEO-Inhaltskorrektur fehlgeschlagen.', code: error.code || 'CORRECTION_FAILED' })); process.exitCode = 1; }
  finally { await pool.end(); }
}
