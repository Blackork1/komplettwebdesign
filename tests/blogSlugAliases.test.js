import test from 'node:test';
import assert from 'node:assert/strict';
import BlogPostModel from '../models/BlogPostModel.js';

test('clean public blog slugs resolve the stored legacy article without a database rename', async () => {
  const oldSlug = 'Scoll-Snapp-Galery-&-Zoom‑on‑View';
  const db = { async query(_sql, params) {
    assert.equal(params[0], oldSlug);
    return { rows: [{ id: 3, slug: oldSlug, title: 'Scroll Snap' }] };
  } };
  const result = await BlogPostModel.findBySlug('scroll-snap-galerie-zoom-on-view', db);
  assert.equal(result.id, 3);
  assert.equal(result.slug, 'scroll-snap-galerie-zoom-on-view');
});

test('blog lists publish canonical ASCII links for legacy articles', async () => {
  const rows = [{ id: 1, slug: 'website-checkliste-für-selbstandige' }];
  const result = await BlogPostModel.findPage({}, { query: async () => ({ rows }) });
  assert.equal(result[0].slug, 'website-checkliste-fuer-selbststaendige');
});
