import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLegacyContentMigrationService
} from '../services/contentAgent/legacyContentMigrationService.js';
import { liveHashForContentPost } from '../services/contentAgent/contentPostLiveState.js';

function post(overrides = {}) {
  return {
    id: 9,
    title: 'Legacy',
    slug: 'legacy',
    excerpt: 'Kurz',
    content: '<p>Aktueller Legacy-Stand</p>',
    content_format: 'legacy_ejs',
    meta_title: 'Meta',
    meta_description: 'Beschreibung',
    og_title: 'OG',
    og_description: 'OG Beschreibung',
    faq_json: [],
    image_url: '/images/legacy.webp',
    image_alt: 'Alt',
    published: true,
    published_at: '2026-07-01T10:00:00.000Z',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-16T10:00:00.000Z',
    ...overrides
  };
}

test('Scan analysiert jeden Legacy-Artikel und verändert keinen Livepost', async () => {
  const saved = [];
  const service = createLegacyContentMigrationService({
    repository: {
      async listScanCandidates() { return [{ id: 1 }, { id: 2 }]; },
      async saveScanResult(input) { saved.push(input); return input.result; }
    },
    analysisService: {
      analyzePost({ post: currentPost }) {
        return {
          postId: currentPost.id,
          migrationClass: 'static_legacy',
          status: 'ready'
        };
      }
    },
    blogPostPresentation: {}
  });

  const result = await service.scan({
    admin: { id: 3, username: 'admin' },
    pricing: {},
    allowedInternalLinks: []
  });

  assert.deepEqual(result, { scanned: 2, ready: 2, blocked: 0 });
  assert.equal(saved.length, 2);
});

test('Sammelmigration verarbeitet nur serverseitig gelistete ready static_legacy-IDs', async () => {
  const migrated = [];
  const service = createLegacyContentMigrationService({
    repository: {
      async listReadyStaticLegacyIds() { return [4, 5]; },
      async migrateOne({ migrationId }) {
        migrated.push(migrationId);
        return migrationId === 4 ? { status: 'migrated' } : { status: 'stale' };
      }
    },
    analysisService: {},
    blogPostPresentation: {}
  });

  const result = await service.migrateSafeBatch({
    admin: { id: 3, username: 'admin' }
  });

  assert.deepEqual(migrated, [4, 5]);
  assert.deepEqual(result, {
    migrated: 1,
    skipped: 1,
    blocked: 0,
    failed: 0
  });
});

test('Vorschau zeigt aktuellen Legacy-Stand und sicheren statischen Kandidaten', async () => {
  const currentPost = post();
  const service = createLegacyContentMigrationService({
    repository: {
      async getMigrationForPreview() {
        return {
          id: 8,
          post_id: 9,
          post: currentPost,
          status: 'ready',
          migration_class: 'static_legacy',
          base_live_hash: liveHashForContentPost(currentPost),
          rendered_static_html: '<p>Statischer Kandidat</p>',
          analysis_json: { candidateHash: 'a'.repeat(64) },
          blocking_issues_json: [],
          sanitizer_report_json: { version: 1 }
        };
      }
    },
    analysisService: {},
    blogPostPresentation: {
      buildBlogPostPageModel() {
        return { renderedContent: '<p>Aktueller Legacy-Stand</p>' };
      }
    }
  });

  const preview = await service.getPreview({
    migrationId: 8,
    pricing: {},
    canonicalBaseUrl: 'https://www.komplettwebdesign.de'
  });

  assert.equal(preview.canMigrate, true);
  assert.doesNotMatch(preview.candidateHtml, /<%|%>/);
  assert.equal(preview.currentHtml, '<p>Aktueller Legacy-Stand</p>');
});

test('Vorschau wird bei abweichendem Livehash als stale markiert', async () => {
  const currentPost = post({ title: 'Zwischenzeitlich geändert' });
  const service = createLegacyContentMigrationService({
    repository: {
      async getMigrationForPreview() {
        return {
          id: 8,
          post_id: 9,
          post: currentPost,
          status: 'ready',
          migration_class: 'static_legacy',
          base_live_hash: 'a'.repeat(64),
          rendered_static_html: '<p>Statischer Kandidat</p>',
          analysis_json: {},
          blocking_issues_json: [],
          sanitizer_report_json: {}
        };
      }
    },
    analysisService: {},
    blogPostPresentation: {
      buildBlogPostPageModel() {
        return { renderedContent: '<p>Aktueller Legacy-Stand</p>' };
      }
    }
  });

  const preview = await service.getPreview({
    migrationId: 8,
    pricing: {},
    canonicalBaseUrl: 'https://www.komplettwebdesign.de'
  });

  assert.equal(preview.status, 'stale');
  assert.equal(preview.canMigrate, false);
});

test('Vorschau führt gespeicherte EJS-Syntax niemals aus', async () => {
  const currentPost = post();
  const service = createLegacyContentMigrationService({
    repository: {
      async getMigrationForPreview() {
        return {
          id: 8,
          post_id: 9,
          post: currentPost,
          status: 'ready',
          migration_class: 'active_ejs',
          base_live_hash: liveHashForContentPost(currentPost),
          rendered_static_html: '<p><%= post.title %></p>',
          analysis_json: {},
          blocking_issues_json: [],
          sanitizer_report_json: {}
        };
      }
    },
    analysisService: {},
    blogPostPresentation: {
      buildBlogPostPageModel() {
        return { renderedContent: '<p>Aktueller Legacy-Stand</p>' };
      }
    }
  });

  await assert.rejects(
    service.getPreview({
      migrationId: 8,
      pricing: {},
      canonicalBaseUrl: 'https://www.komplettwebdesign.de'
    }),
    { code: 'CONTENT_LEGACY_MIGRATION_INVALID' }
  );
});

test('Dashboard trennt sichere statische, aktive, blockierte und migrierte Einträge', async () => {
  const service = createLegacyContentMigrationService({
    repository: {
      async listDashboardRows() {
        return [
          { post_id: 1, status: 'ready', migration_class: 'static_legacy', created_at: '2026-07-16T10:00:00Z' },
          { post_id: 2, status: 'ready', migration_class: 'active_ejs', created_at: '2026-07-16T11:00:00Z' },
          { post_id: 3, status: 'blocked', migration_class: 'static_legacy', created_at: '2026-07-16T12:00:00Z' },
          { post_id: 4, status: 'migrated', migration_class: 'static_legacy', created_at: '2026-07-16T09:00:00Z' }
        ];
      }
    },
    analysisService: {},
    blogPostPresentation: {}
  });

  const dashboard = await service.getDashboard();

  assert.equal(dashboard.totalCount, 4);
  assert.equal(dashboard.readyStatic.length, 1);
  assert.equal(dashboard.reviewRequired.length, 1);
  assert.equal(dashboard.blocked.length, 1);
  assert.equal(dashboard.migrated.length, 1);
  assert.equal(dashboard.lastScanAt, '2026-07-16T12:00:00Z');
});
