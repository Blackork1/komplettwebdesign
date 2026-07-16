import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createContentLegacyMigrationRepository
} from '../repositories/contentLegacyMigrationRepository.js';
import { liveHashForContentPost } from '../services/contentAgent/contentPostLiveState.js';

const livePost = {
  id: 9,
  title: 'Legacy',
  slug: 'legacy',
  excerpt: 'Kurz',
  content: '<p>Alt</p>',
  content_format: 'legacy_ejs',
  meta_title: 'Meta',
  meta_description: 'Beschreibung',
  og_title: 'OG',
  og_description: 'OG Beschreibung',
  faq_json: [],
  image_url: '/images/legacy.webp',
  image_alt: 'Alt',
  published: true,
  workflow_status: 'published',
  scheduled_at: null,
  published_at: new Date('2026-07-01T10:00:00.000Z'),
  created_at: new Date('2026-07-01T10:00:00.000Z'),
  updated_at: new Date('2026-07-16T10:00:00.000Z')
};

test('Scan lädt ausschließlich veröffentlichte legacy_ejs-Artikel mit Konfliktflags', async () => {
  const calls = [];
  const repository = createContentLegacyMigrationRepository({
    async query(sql, values) {
      calls.push({ sql, values });
      return { rows: [] };
    }
  });

  await repository.listScanCandidates();

  assert.match(calls[0].sql, /p\.published = TRUE/i);
  assert.match(calls[0].sql, /p\.content_format = 'legacy_ejs'/i);
  assert.match(calls[0].sql, /content_post_revisions/i);
  assert.match(calls[0].sql, /optimize_existing_post/i);
});

test('offener Scan wird vor dem neuen Datensatz als stale markiert', async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (/SELECT\s+p\.id[\s\S]+FROM posts p/i.test(sql)) {
        return { rows: [{ id: 9, published: true, content_format: 'legacy_ejs' }] };
      }
      if (/INSERT INTO content_legacy_migrations/i.test(sql)) {
        return { rows: [{ id: 12, status: 'ready' }] };
      }
      return { rows: [] };
    },
    release() {}
  };
  const repository = createContentLegacyMigrationRepository({
    async connect() { return client; }
  });

  const saved = await repository.saveScanResult({
    admin: { id: 4, username: 'admin' },
    result: {
      postId: 9,
      migrationClass: 'static_legacy',
      status: 'ready',
      baseLiveHash: 'a'.repeat(64),
      sourceContent: '<p>Alt</p>',
      renderedStaticHtml: '<p>Alt</p>',
      renderContext: { version: 1 },
      analysis: { candidateHash: 'b'.repeat(64) },
      blockingIssues: [],
      sanitizerReport: { version: 1 }
    }
  });

  assert.equal(saved.id, 12);
  assert.ok(calls.some(({ sql }) => /SET status = 'stale'/i.test(sql)));
  assert.ok(calls.some(({ sql }) => /INSERT INTO content_legacy_migrations/i.test(sql)));
  assert.ok(calls.some(({ sql }) => String(sql).trim() === 'COMMIT'));
});

test('bereits migrierter Datensatz wird idempotent beantwortet', async () => {
  const migration = { id: 12, post_id: 9, status: 'migrated' };
  const calls = [];
  const client = {
    async query(sql) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (normalized.startsWith('SELECT * FROM content_legacy_migrations')) {
        return { rows: [migration] };
      }
      return { rows: [] };
    },
    release() {}
  };
  const repository = createContentLegacyMigrationRepository({
    async connect() { return client; }
  });

  assert.deepEqual(await repository.migrateOne({
    migrationId: 12,
    admin: { id: 4, username: 'admin' }
  }), {
    status: 'already_migrated',
    migration
  });
  assert.ok(calls.includes('COMMIT'));
});

test('veränderte Livebasis markiert den Kandidaten stale und schreibt den Post nicht', async () => {
  const calls = [];
  const migration = {
    id: 12,
    post_id: 9,
    status: 'ready',
    base_live_hash: 'a'.repeat(64),
    rendered_static_html: '<p>Neu</p>',
    analysis_json: {
      candidateHash: '02ba914899320935249c51a68ca29c8ed1f43cbea2d758b49328c3bb08f10e22'
    }
  };
  const client = {
    async query(sql) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (normalized.startsWith('SELECT * FROM content_legacy_migrations')) {
        return { rows: [migration] };
      }
      if (normalized.startsWith('SELECT p.id')) return { rows: [livePost] };
      return { rows: [] };
    },
    release() {}
  };
  const repository = createContentLegacyMigrationRepository({
    async connect() { return client; }
  });

  const result = await repository.migrateOne({
    migrationId: 12,
    admin: { id: 4, username: 'admin' }
  });

  assert.deepEqual(result, { status: 'stale' });
  assert.ok(calls.some((sql) => /SET status = 'stale'/i.test(sql)));
  assert.equal(calls.some((sql) => sql.startsWith('UPDATE posts')), false);
  assert.ok(calls.includes('COMMIT'));
});

test('Rücknahme wird bei abweichender Livefassung gesperrt und schreibt nichts', async () => {
  const calls = [];
  const migration = {
    id: 12,
    post_id: 9,
    status: 'migrated',
    source_content: '<p>Alt</p>',
    migrated_live_hash: 'a'.repeat(64),
    migrated_at: new Date('2026-07-16T11:00:00.000Z')
  };
  const staticPost = {
    ...livePost,
    content: '<p>Neu und danach geändert</p>',
    content_format: 'static_html',
    updated_at: new Date('2026-07-16T12:00:00.000Z')
  };
  assert.notEqual(liveHashForContentPost(staticPost), migration.migrated_live_hash);
  const client = {
    async query(sql) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (normalized.startsWith('SELECT * FROM content_legacy_migrations')) {
        return { rows: [migration] };
      }
      if (normalized.startsWith('SELECT p.id')) return { rows: [staticPost] };
      return { rows: [] };
    },
    release() {}
  };
  const repository = createContentLegacyMigrationRepository({
    async connect() { return client; }
  });

  await assert.rejects(
    repository.rollbackOne({
      migrationId: 12,
      admin: { id: 4, username: 'admin' }
    }),
    { code: 'CONTENT_LEGACY_ROLLBACK_CONFLICT' }
  );

  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.some((sql) => sql.startsWith('UPDATE posts')), false);
});

test('Rücknahme prüft neue Revisionen und Optimierungen seit der Migration', async () => {
  const calls = [];
  const staticPost = {
    ...livePost,
    content: '<p>Neu</p>',
    content_format: 'static_html',
    updated_at: new Date('2026-07-16T11:00:00.000Z')
  };
  const migration = {
    id: 12,
    post_id: 9,
    status: 'migrated',
    source_content: '<p>Alt</p>',
    migrated_live_hash: liveHashForContentPost(staticPost),
    migrated_at: new Date('2026-07-16T11:00:00.000Z')
  };
  const client = {
    async query(sql) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (normalized.startsWith('SELECT * FROM content_legacy_migrations')) {
        return { rows: [migration] };
      }
      if (normalized.startsWith('SELECT p.id')) return { rows: [staticPost] };
      if (/AS has_new_work/i.test(normalized)) {
        return { rows: [{ has_new_work: true }] };
      }
      return { rows: [] };
    },
    release() {}
  };
  const repository = createContentLegacyMigrationRepository({
    async connect() { return client; }
  });

  await assert.rejects(
    repository.rollbackOne({
      migrationId: 12,
      admin: { id: 4, username: 'admin' }
    }),
    { code: 'CONTENT_LEGACY_ROLLBACK_CONFLICT' }
  );
  assert.equal(calls.some((sql) => sql.startsWith('UPDATE posts')), false);
});
