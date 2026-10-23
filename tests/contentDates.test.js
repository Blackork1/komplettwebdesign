import test from 'node:test';
import assert from 'node:assert/strict';
import { createModifiedDateResolver } from '../helpers/contentDates.js';

test('Sammel-Zeitstempel einer Migration werden durch das Veröffentlichungsdatum ersetzt', () => {
  const bulk = '2026-07-11T18:14:17.479Z';
  const posts = [
    { slug: 'a', updated_at: bulk, published_at: '2025-09-10T07:46:34Z' },
    { slug: 'b', updated_at: bulk, published_at: '2026-03-18T16:23:31Z' },
    { slug: 'c', updated_at: bulk, published_at: '2025-08-10T18:06:49Z' },
    { slug: 'd', updated_at: '2026-10-01T10:00:00Z', published_at: '2026-09-01T10:00:00Z' }
  ];
  const resolve = createModifiedDateResolver(posts);
  assert.equal(resolve(posts[0]), '2025-09-10T07:46:34Z');
  assert.equal(resolve(posts[1]), '2026-03-18T16:23:31Z');
  assert.equal(resolve(posts[3]), '2026-10-01T10:00:00Z');
});

test('einzelne Änderungsdaten und fehlende Daten bleiben unverändert', () => {
  const posts = [{ updated_at: '2026-01-02T12:00:00Z' }, { updated_at: null }, { updated_at: 'invalid' }];
  const resolve = createModifiedDateResolver(posts);
  assert.equal(resolve(posts[0]), '2026-01-02T12:00:00Z');
  assert.equal(resolve(posts[1]), null);
  assert.equal(resolve(posts[2]), 'invalid');
  assert.equal(createModifiedDateResolver([])({ updated_at: '2026-01-01' }), '2026-01-01');
});
