import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pool from '../util/db.js';
import BlogPostModel from '../models/BlogPostModel.js';
import { BLOG_REDIRECTS, REDIRECTED_BLOG_SLUGS, UNLISTED_BLOG_SLUGS } from '../data/blogRedirects.js';
import { SEO_RECOVERY_REDIRECTS } from '../data/seoIntentRegistry.js';

const REDIRECT_SOURCE_SLUG = 'website-kosten-2026-berlin-vergleich-2025';

function queryDb(rows = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({
        sql: sql.replace(/\s+/g, ' ').trim(),
        params
      });
      return { rows };
    }
  };
}

test('Kostenartikel besitzt eine einzige kanonische öffentliche URL', () => {
  assert.equal(
    BLOG_REDIRECTS['website-kosten-2026-berlin-vergleich-2025'],
    '/blog/website-kosten-2025-einfach-erklaert'
  );
  assert.ok(REDIRECTED_BLOG_SLUGS.includes(REDIRECT_SOURCE_SLUG));
  assert.equal(Object.isFrozen(BLOG_REDIRECTS), true);
  assert.equal(Object.isFrozen(REDIRECTED_BLOG_SLUGS), true);
  assert.equal(
    SEO_RECOVERY_REDIRECTS['/blog/website-kosten-2026-berlin-vergleich-2025'],
    BLOG_REDIRECTS['website-kosten-2026-berlin-vergleich-2025']
  );
});

test('Blogroute prüft Weiterleitungen vor der Artikelanzeige', () => {
  const source = readFileSync(new URL('../routes/blogRoutes.js', import.meta.url), 'utf8');
  assert.match(source, /router\.get\('\/blog\/:slug', \(req, res, next\) => \{[\s\S]*?resolveBlogRedirect\(req\.params\.slug\)[\s\S]*?\}, showPost\);/);
});

test('alle öffentlichen Blogqueries filtern Redirectquellen mit korrekten SQL-Parametern', async () => {
  const unexpectedPoolCalls = [];
  const originalPoolQuery = pool.query;
  pool.query = async (sql, params = []) => {
    unexpectedPoolCalls.push({ sql, params });
    return { rows: [] };
  };

  const allDb = queryDb([]);
  const pageDb = queryDb([]);
  const countDb = queryDb([{ count: 0 }]);
  const featuredDb = queryDb([]);
  const slugDb = queryDb([]);

  try {
    await BlogPostModel.findAll(allDb);
    await BlogPostModel.findPage({ limit: 7, offset: 3 }, pageDb);
    await BlogPostModel.countPublished(countDb);
    await BlogPostModel.findFeatured(4, featuredDb);
    await BlogPostModel.findBySlug(REDIRECT_SOURCE_SLUG, slugDb);
  } finally {
    pool.query = originalPoolQuery;
  }

  assert.equal(unexpectedPoolCalls.length, 0, 'optionale DB-Injektion wurde umgangen');

  [allDb, pageDb, countDb, featuredDb, slugDb].forEach((db) => {
    assert.match(db.calls[0].sql, /slug <> ALL\(\$\d::text\[\]\)/);
  });
  // Listen zeigen weder weitergeleitete noch noindex-Artikel, die Einzelseite nur keine weitergeleiteten.
  assert.deepEqual(allDb.calls[0].params, [UNLISTED_BLOG_SLUGS]);
  assert.deepEqual(pageDb.calls[0].params, [UNLISTED_BLOG_SLUGS, 7, 3]);
  assert.deepEqual(countDb.calls[0].params, [UNLISTED_BLOG_SLUGS]);
  assert.deepEqual(featuredDb.calls[0].params, [UNLISTED_BLOG_SLUGS, 4]);
  assert.deepEqual(slugDb.calls[0].params, [REDIRECT_SOURCE_SLUG, REDIRECTED_BLOG_SLUGS]);
});

test('Adminliste bleibt vollständig und filtert Redirectquellen nicht heraus', async () => {
  const db = queryDb([{ slug: REDIRECT_SOURCE_SLUG }]);

  const posts = await BlogPostModel.findAllAdmin(db);

  assert.equal(posts[0].slug, REDIRECT_SOURCE_SLUG);
  assert.doesNotMatch(db.calls[0].sql, /slug <> ALL/);
  assert.deepEqual(db.calls[0].params, []);
});

test('Sitemapquery schließt Redirectquellen über die zentrale Registry aus', () => {
  const source = readFileSync(new URL('../controllers/sitemapController.js', import.meta.url), 'utf8');
  const postsQuery = source.match(
    /const posts = await querySafe\(\s*`([\s\S]*?)`\s*,\s*\[UNLISTED_BLOG_SLUGS\]\s*,\s*"posts"\s*\)/
  );

  assert.ok(postsQuery, 'parametrisierte Posts-Sitemapquery nicht gefunden');
  assert.match(postsQuery[1], /WHERE published = true\s+AND slug <> ALL\(\$1::text\[\]\)/);
  assert.match(source, /import \{ UNLISTED_BLOG_SLUGS(?:, canonicalBlogSlug)? \} from ["']\.\.\/data\/blogRedirects\.js["']/);
});
