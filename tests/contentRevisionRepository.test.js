import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentRevisionRepository } from '../repositories/contentRevisionRepository.js';
import { createRevisionSnapshot, liveHashForPost } from '../services/contentAgent/contentRevisionService.js';

const validFaq = Array.from({ length: 5 }, (_, index) => ({ question: `Frage ${index + 1}?`, answer: 'Antwort' }));
const livePost = {
  id: 7,
  title: 'Titel', slug: 'artikel', excerpt: 'Kurz', content: '<p>Inhalt</p>',
  content_format: 'legacy_ejs', meta_title: 'Meta', meta_description: 'Beschreibung',
  og_title: 'OG', og_description: 'OG-Beschreibung', faq_json: validFaq,
  image_url: 'https://example.test/bild.webp', image_alt: 'Alt', published: true,
  updated_at: new Date('2026-07-12T10:00:00.000Z')
};

function approvalHarness({ revisionStatus = 'draft', changedPost = null } = {}) {
  const calls = [];
  const post = changedPost || livePost;
  const revision = {
    id: 3, post_id: 7, audit_id: 5, status: revisionStatus, revision_version: 4,
    optimization_job_id: 44,
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
      if (normalized.startsWith('SELECT * FROM content_post_audits')) return { rows: [{ id: 5, post_id: 7, job_id: 44, status: 'revision_created' }] };
      if (normalized.startsWith('SELECT slug FROM posts')) return { rows: [] };
      if (normalized.startsWith('SELECT url FROM (')) return { rows: [{ url: '/kontakt' }, { url: '/blog/artikel' }] };
      if (normalized.startsWith('UPDATE posts SET')) return { rows: [{ ...post, ...revision.snapshot_json.fields, slug: post.slug, published: true }] };
      if (normalized.startsWith('UPDATE content_post_revisions')) return { rows: [{ id: 3 }] };
      if (normalized.startsWith('UPDATE content_post_audits')) return { rows: [{ id: 5 }] };
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
  expectedVersion: 4,
  admin: { id: 1, username: 'admin' },
  currentHash: liveHashForPost,
  validateSnapshot: async () => true
};

function revisionCreationHarness(existingDraft, { activeOptimization = false } = {}) {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)
          || normalized.startsWith('LOCK TABLE posts')) return { rows: [] };
      if (normalized.startsWith('SELECT id, published FROM posts')) {
        return { rows: [{ id: 7, published: true }] };
      }
      if (normalized.startsWith('SELECT id, title, slug')) return { rows: [livePost] };
      if (normalized.startsWith('SELECT id FROM content_jobs')) {
        return { rows: activeOptimization ? [{ id: 44 }] : [] };
      }
      if (normalized.startsWith('SELECT * FROM content_post_revisions')) {
        return { rows: existingDraft ? [existingDraft] : [] };
      }
      if (normalized.startsWith('SELECT * FROM content_post_audits')) {
        return { rows: [{ id: 5, post_id: 7, status: 'open' }] };
      }
      if (normalized.startsWith('INSERT INTO content_post_revisions')) {
        return { rows: [{ id: 9, post_id: 7, audit_id: 5, status: 'draft' }] };
      }
      if (normalized.startsWith('UPDATE content_post_audits')) return { rows: [] };
      throw new Error(`Unerwartetes SQL: ${normalized}`);
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); }
  };
  return {
    calls,
    repository: createContentRevisionRepository({ async connect() { return client; } })
  };
}

test('Revisionsanlage nimmt ausschließlich den postweiten Draft desselben Audits idempotent wieder auf', async () => {
  const existing = { id: 8, post_id: 7, audit_id: 5, status: 'draft', revision_version: 2 };
  const { calls, repository } = revisionCreationHarness(existing);

  const result = await repository.createRevisionFromAudit({
    postId: 7,
    auditId: 5,
    admin: { id: 1, username: 'admin' },
    createSnapshot: createRevisionSnapshot
  });

  assert.equal(result.id, 8);
  const draftLock = calls.find(({ sql }) => sql.startsWith('SELECT * FROM content_post_revisions'));
  assert.match(draftLock.sql, /WHERE post_id = \$1 AND status = 'draft'/i);
  assert.deepEqual(draftLock.params, [7]);
  assert.equal(calls.some(({ sql }) => sql.startsWith('INSERT INTO content_post_revisions')), false);
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
});

test('Revisionsanlage weist einen postweiten Draft eines anderen Audits fail-closed zurück', async () => {
  const existing = { id: 8, post_id: 7, audit_id: 6, status: 'draft', revision_version: 2 };
  const { calls, repository } = revisionCreationHarness(existing);

  await assert.rejects(repository.createRevisionFromAudit({
    postId: 7,
    auditId: 5,
    admin: { id: 1, username: 'admin' },
    createSnapshot: createRevisionSnapshot
  }), { code: 'CONTENT_REVISION_CONFLICT' });

  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(calls.some(({ sql }) => sql.startsWith('INSERT INTO content_post_revisions')), false);
  assert.equal(calls.some(({ sql }) => sql === 'COMMIT'), false);
});

test('manuelle Revisionsanlage wird nach dem Post-Lock bei aktiver KI-Optimierung geschlossen abgewiesen', async () => {
  const { calls, repository } = revisionCreationHarness(null, { activeOptimization: true });

  await assert.rejects(repository.createRevisionFromAudit({
    postId: 7,
    auditId: 5,
    admin: { id: 1, username: 'admin' },
    createSnapshot: createRevisionSnapshot
  }), { code: 'CONTENT_REVISION_CONFLICT' });

  const postLock = calls.findIndex(({ sql }) => sql.startsWith('SELECT id, published FROM posts'));
  const activeJobCheck = calls.findIndex(({ sql }) => sql.startsWith('SELECT id FROM content_jobs'));
  assert.ok(postLock > 0 && activeJobCheck > postLock);
  assert.match(calls[postLock].sql, /FOR UPDATE/i);
  assert.match(calls[activeJobCheck].sql, /job_type = 'optimize_existing_post'/i);
  assert.match(calls[activeJobCheck].sql, /status IN \('queued', 'running', 'needs_manual_attention'\)/i);
  assert.equal(calls.some(({ sql }) => sql.startsWith('INSERT INTO content_post_revisions')), false);
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
});

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
  const auditLock = calls.find((sql) => sql.startsWith('SELECT * FROM content_post_audits'));
  const auditUpdate = calls.find((sql) => sql.startsWith('UPDATE content_post_audits'));
  for (const sql of [auditLock, auditUpdate]) {
    assert.match(sql, /id = \$1::bigint/i);
    assert.match(sql, /post_id = \$2::integer/i);
    assert.match(sql, /job_id = \$3::bigint/i);
    assert.match(sql, /status = 'revision_created'/i);
  }
  assert.match(auditUpdate, /RETURNING id/i);
  assert.match(
    calls.find((sql) => sql.startsWith('SELECT url FROM (')),
    /'\/branchen\/'\s*\|\|\s*CASE\s+WHEN\s+slug\s+LIKE\s+'webdesign-%'/i
  );
  assert.ok(calls.includes('COMMIT'));
  assert.equal(calls.includes('ROLLBACK'), false);
});

test('älterer Tab darf nach einer Speicherung nicht mehr freigeben und schreibt nichts live', async () => {
  const { repository, calls } = approvalHarness();
  await assert.rejects(
    repository.approveRevisionTransaction({ ...approvalInput, expectedVersion: 3 }),
    (error) => error.code === 'CONTENT_REVISION_CONFLICT'
  );
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.some((sql) => sql.startsWith('UPDATE posts SET')), false);
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

test('Revisionsspeicherung verwendet einen atomaren Versionsvergleich', async () => {
  const calls = [];
  const repository = createContentRevisionRepository({
    async query(sql, params) {
      calls.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params });
      return { rows: [{ id: 3, revision_version: 5 }] };
    }
  });
  const result = await repository.updateDraftRevision({
    revisionId: 3,
    snapshot: createRevisionSnapshot(livePost),
    expectedVersion: 4
  });
  assert.equal(result.revision_version, 5);
  assert.match(calls[0].sql, /revision_version = revision_version \+ 1/i);
  assert.match(calls[0].sql, /status = 'draft' AND revision_version = \$3/i);
  assert.equal(calls[0].params[2], 4);
});

test('Übernahmefeedback läuft vor dem Commit in derselben Freigabetransaktion und rollt bei Fehlern live zurück', async () => {
  const { repository, calls } = approvalHarness();
  let callbackClient;
  await assert.rejects(repository.approveRevisionTransaction({
    ...approvalInput,
    afterApproval: async (_context, client) => {
      callbackClient = client;
      throw Object.assign(new Error('Feedback konnte nicht gespeichert werden.'), {
        code: 'CONTENT_REVISION_FEEDBACK_FAILED'
      });
    }
  }), { code: 'CONTENT_REVISION_FEEDBACK_FAILED' });

  assert.ok(callbackClient);
  const revisionUpdate = calls.findIndex((sql) => sql.startsWith('UPDATE content_post_revisions'));
  const auditUpdate = calls.findIndex((sql) => sql.startsWith('UPDATE content_post_audits'));
  const rollback = calls.indexOf('ROLLBACK');
  assert.ok(revisionUpdate >= 0 && auditUpdate > revisionUpdate && rollback > auditUpdate);
  assert.equal(calls.includes('COMMIT'), false);
});
