import test from 'node:test';
import assert from 'node:assert/strict';
import { correctAuditedPost, AUDITED_BLOG_META } from '../services/seoAuditContentCorrections.js';

test('targeted legacy repair stores reusable catalog tokens and removes obsolete embedded schema', () => {
  const source = { slug: 'full-service-webdesign-in-berlin', content: '<p>499 €, 899 €, 1.499 €</p><p><a href="tel:+4915254350378">+49 1525 4350378</a></p><script type="application/ld+json">{"price":499}</script>' };
  const post = correctAuditedPost(source);
  assert.match(post.content, /\{\{package:start.priceLabel\}\}/);
  assert.match(post.content, /\{\{package:business.priceLabel\}\}/);
  assert.match(post.content, /\{\{package:wachstum.priceLabel\}\}/);
  assert.match(post.content, /tel:\+4915511245048/);
  assert.doesNotMatch(post.content, /application\/ld\+json|1525|(?:499|899) €/);
  assert.deepEqual(correctAuditedPost(post), post);
});

test('content outside the audited articles remains unchanged', () => {
  const post = { slug: 'market-comparison', content: 'Marktpreis 1.499 €', updated_at: new Date() };
  assert.deepEqual(correctAuditedPost(post), post);
});

test('replacement metadata consists of complete text within search snippet budgets', () => {
  for (const meta of Object.values(AUDITED_BLOG_META)) {
    if (meta.meta_title) assert.ok(meta.meta_title.length <= 65);
    if (meta.meta_description) {
      assert.ok(meta.meta_description.length <= 155, `${meta.meta_description.length}`);
      assert.match(meta.meta_description, /[.!?]$/);
    }
  }
});
