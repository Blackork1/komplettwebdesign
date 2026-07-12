import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentRevisionRepository } from '../repositories/contentRevisionRepository.js';
import { createRevisionSnapshot, liveHashForPost } from '../services/contentAgent/contentRevisionService.js';

const livePost = {
  id: 7,
  title: 'Titel', slug: 'artikel', excerpt: 'Kurz', content: '<p>Inhalt</p>',
  content_format: 'legacy_ejs', meta_title: 'Meta', meta_description: 'Beschreibung',
  og_title: 'OG', og_description: 'OG-Beschreibung', faq_json: [],
  image_url: 'https://example.test/bild.webp', image_alt: 'Alt', published: true,
  updated_at: new Date('2026-07-12T10:00:00.000Z')
};

function approvalHarness({ revisionStatus = 'draft', changedPost = null } = {}) {
  const calls = [];
  const post = changedPost || livePost;
  const revision = {
    id: 3, post_id: 7, audit_id: 5, status: revisionStatus,
    snapshot_json: createRevisionSnapshot(livePost)
  };
  const client = {
    async query(sql) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') return { rows: [] };
      if (normalized.startsWith('SELECT post_id FROM content_post_revisions')) return { rows: [{ post_id: 7 }] };
      if (normalized.startsWith('LOCK TABLE posts')) return { rows: [] };
      if (normalized.startsWith('SELECT id, title, slug')) return { rows: [post] };
      if (normalized.startsWith('SELECT * FROM content_post_revisions')) return { rows: [revision] };
      if (normalized.startsWith('SELECT * FROM content_post_audits')) return { rows: [{ id: 5, post_id: 7, status: 'revision_created' }] };
      if (normalized.startsWith('SELECT slug FROM posts')) return { rows: [] };
      if (normalized.startsWith('UPDATE posts SET')) return { rows: [{ ...post, ...revision.snapshot_json.fields, slug: post.slug, published: true }] };
      if (normalized.startsWith('UPDATE content_post_')) return { rows: [] };
      throw new Error(`Unerwartetes SQL: ${normalized}`);
    },
    release() { calls.push('RELEASE'); }
  };
  return {
    calls,
    repository: createContentRevisionRepository({ async connect() { return client; } })
  };
}

const approvalInput = {
  revisionId: 3,
  admin: { id: 1, username: 'admin' },
  currentHash: liveHashForPost,
  validateSnapshot: async () => true
};

test('Freigabe sperrt Tabelle, Post, Revision und Audit in dieser Reihenfolge und ändert nur die Allowlist', async () => {
  const { repository, calls } = approvalHarness();
  const result = await repository.approveRevisionTransaction(approvalInput);
  assert.equal(result.post.slug, 'artikel');
  assert.equal(result.post.published, true);
  const positions = [
    calls.findIndex((sql) => sql.startsWith('LOCK TABLE posts')),
    calls.findIndex((sql) => sql.startsWith('SELECT id, title, slug')),
    calls.findIndex((sql) => sql.startsWith('SELECT * FROM content_post_revisions')),
    calls.findIndex((sql) => sql.startsWith('SELECT * FROM content_post_audits'))
  ];
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  const update = calls.find((sql) => sql.startsWith('UPDATE posts SET'));
  const assignments = update.slice(update.indexOf(' SET ') + 5, update.indexOf(' WHERE '));
  assert.doesNotMatch(assignments, /(?:^|,)\s*(?:slug|published|published_at)\s*=/i);
  assert.ok(calls.includes('COMMIT'));
  assert.equal(calls.includes('ROLLBACK'), false);
});

test('veraltete Livebasis rollt zurück, ohne den Post zu schreiben', async () => {
  const { repository, calls } = approvalHarness({ changedPost: { ...livePost, title: 'Parallel geändert' } });
  await assert.rejects(
    repository.approveRevisionTransaction(approvalInput),
    (error) => error.code === 'CONTENT_REVISION_STALE'
  );
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.some((sql) => sql.startsWith('UPDATE posts SET')), false);
  assert.equal(calls.includes('COMMIT'), false);
});

test('doppelte Freigabe wird als Konflikt vollständig zurückgerollt', async () => {
  const { repository, calls } = approvalHarness({ revisionStatus: 'approved' });
  await assert.rejects(
    repository.approveRevisionTransaction(approvalInput),
    (error) => error.code === 'CONTENT_REVISION_CONFLICT'
  );
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.some((sql) => sql.startsWith('UPDATE posts SET')), false);
});
