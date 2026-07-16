import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalContentPostLiveState,
  liveHashForContentPost
} from '../services/contentAgent/contentPostLiveState.js';

const post = {
  id: 7,
  slug: 'legacy-artikel',
  content_format: 'legacy_ejs',
  updated_at: '2026-07-16T08:00:00.000Z',
  title: 'Titel',
  excerpt: 'Kurz',
  content: '<p>Inhalt</p>',
  meta_title: 'Meta',
  meta_description: 'Beschreibung',
  og_title: 'OG',
  og_description: 'OG Beschreibung',
  faq_json: [{ question: 'Frage?', answer: 'Antwort.' }],
  image_url: '/uploads/bild.webp',
  image_alt: 'Alt'
};

test('Livezustand enthält nur migrationsrelevante Felder in kanonischer Form', () => {
  const state = canonicalContentPostLiveState(post);

  assert.equal(state.slug, 'legacy-artikel');
  assert.equal(state.content_format, 'legacy_ejs');
  assert.equal(state.fields.content, '<p>Inhalt</p>');
  assert.deepEqual(state.fields.faq_json, post.faq_json);
  assert.equal(Object.hasOwn(state, 'id'), false);
});

test('Livehash ist schlüsselreihenfolgeunabhängig und reagiert auf Inhaltsänderungen', () => {
  const reordered = Object.fromEntries(Object.entries(post).reverse());

  assert.equal(liveHashForContentPost(post), liveHashForContentPost(reordered));
  assert.notEqual(
    liveHashForContentPost(post),
    liveHashForContentPost({ ...post, content: '<p>Geändert</p>' })
  );
  assert.match(liveHashForContentPost(post), /^[0-9a-f]{64}$/);
});
