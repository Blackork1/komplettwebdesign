import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../util/db.js';
import pricingService from '../services/pricingService.js';
import { sitemapXml } from '../controllers/sitemapController.js';

test('sitemap only publishes known modification dates and indexable canonical URLs', async () => {
  const originalQuery = pool.query;
  const originalPackages = pricingService.getVisiblePackages;
  pool.query = async sql => ({ rows: /FROM posts/.test(sql) ? [
    { slug: 'known', updated_at: '2026-01-02T12:00:00Z' }, { slug: 'unknown', updated_at: null }, { slug: 'invalid', updated_at: 'invalid' }
  ] : /FROM pages/.test(sql) ? [{ slug: 'de', updated_at: null }, { slug: 'booking', updated_at: null }, { slug: 'handwerker', updated_at: null }] : /FROM ratgeber/.test(sql) ? [{ slug: 'website-kosten-berlin', updated_at: '2026-05-01T12:00:00Z' }] : [] });
  pricingService.getVisiblePackages = async () => [{ packageKey: 'start', allowDetailPage: true, canonicalPath: '/pakete/start', updatedAt: '2026-01-03T12:00:00Z' }];
  let body;
  try {
    await sitemapXml({ headers: {}, protocol: 'https', get: () => 'www.komplettwebdesign.de' }, { set() {}, status() { return this; }, send(xml) { body = xml; } }, e => { throw e; });
  } finally { pool.query = originalQuery; pricingService.getVisiblePackages = originalPackages; }
  const entries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]);
  assert.match(entries.find(x => x.includes('/ratgeber/website-kosten-berlin</loc>')), /<lastmod>2026-05-01T12:00:00\.000Z<\/lastmod>/);
  const known = entries.find(x => x.includes('/blog/known</loc>'));
  assert.match(known, /<lastmod>2026-01-02T12:00:00\.000Z<\/lastmod>/);
  for (const slug of ['unknown', 'invalid']) assert.doesNotMatch(entries.find(x => x.includes(`/blog/${slug}</loc>`)), /<lastmod>/);
  assert.doesNotMatch(body, /\/en\/webdesign-berlin\/|\/swipeandcook-|\/de<\/loc>|\/booking<\/loc>/);
  assert.ok(entries.some(x => x.includes('/handwerker</loc>')));
  assert.doesNotMatch(entries.find(x => /<loc>[^<]+\/<\/loc>/.test(x)), /<lastmod>/);
});
