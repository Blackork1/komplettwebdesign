import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLegacyContentMigrationAnalysisService
} from '../services/contentAgent/legacyContentMigrationAnalysisService.js';
import {
  normalizeLegacyStaticHtml
} from '../services/contentAgent/legacyStaticHtmlNormalizer.js';
import {
  buildLegacyRenderLocals,
  renderLegacyEjsStrict
} from '../services/contentAgent/legacyEjsRenderService.js';

function post(overrides = {}) {
  return {
    id: 9,
    title: 'Legacy',
    slug: 'legacy',
    excerpt: 'Kurz',
    content: '<section><h2>Inhalt</h2><p>Text</p></section>',
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
    has_draft_revision: false,
    has_active_optimization: false,
    ...overrides
  };
}

const service = createLegacyContentMigrationAnalysisService({
  normalizer: normalizeLegacyStaticHtml,
  strictRenderer: renderLegacyEjsStrict,
  buildRenderLocals: buildLegacyRenderLocals
});

test('EJS-freies Legacy-HTML wird als ready static_legacy klassifiziert', () => {
  const result = service.analyzePost({
    post: post(),
    pricing: {},
    allowedInternalLinks: []
  });

  assert.equal(result.migrationClass, 'static_legacy');
  assert.equal(result.status, 'ready');
  assert.match(result.baseLiveHash, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(result.renderedStaticHtml, /<%|%>/);
});

test('aktives EJS wird gerendert und als active_ejs gespeichert', () => {
  const result = service.analyzePost({
    post: post({ content: '<p><%= post.title %></p>' }),
    pricing: {},
    allowedInternalLinks: []
  });

  assert.equal(result.migrationClass, 'active_ejs');
  assert.equal(result.status, 'ready');
  assert.equal(result.renderedStaticHtml, '<p>Legacy</p>');
});

test('offene Revision und laufende Optimierung blockieren den Kandidaten', () => {
  const result = service.analyzePost({
    post: post({ has_draft_revision: true, has_active_optimization: true }),
    pricing: {},
    allowedInternalLinks: []
  });

  assert.equal(result.status, 'blocked');
  assert.deepEqual(
    result.blockingIssues.map(({ code }) => code).sort(),
    ['legacy_active_optimization', 'legacy_open_revision']
  );
});

test('Preis-Tokens bleiben im gespeicherten Kandidaten erhalten', () => {
  const result = service.analyzePost({
    post: post({ content: '<p>Ab {{package.basic.price}} Euro</p>' }),
    pricing: { package: { basic: { price: '999' } } },
    allowedInternalLinks: []
  });

  assert.match(result.renderedStaticHtml, /\{\{package\.basic\.price\}\}/);
});

for (const code of [
  'legacy_visible_text_loss',
  'legacy_link_loss',
  'legacy_image_loss',
  'legacy_id_loss',
  'legacy_faq_loss',
  'legacy_price_token_loss'
]) {
  test(`${code} blockiert die Sammelmigration`, () => {
    const blockingService = createLegacyContentMigrationAnalysisService({
      normalizer: ({ html }) => ({
        html,
        report: {
          version: 1,
          transforms: [],
          warnings: [],
          blockers: [{ code, message: 'Absichtlicher Verlusttest.', details: {} }],
          before: {},
          after: {}
        }
      }),
      strictRenderer: renderLegacyEjsStrict,
      buildRenderLocals: buildLegacyRenderLocals
    });

    const result = blockingService.analyzePost({
      post: post(),
      pricing: {},
      allowedInternalLinks: []
    });

    assert.equal(result.status, 'blocked');
    assert.ok(result.blockingIssues.some((item) => item.code === code));
  });
}

test('nicht veröffentlichte oder bereits statische Artikel sind nicht verfügbar', () => {
  assert.throws(
    () => service.analyzePost({ post: post({ published: false }) }),
    { code: 'CONTENT_LEGACY_MIGRATION_NOT_AVAILABLE' }
  );
  assert.throws(
    () => service.analyzePost({ post: post({ content_format: 'static_html' }) }),
    { code: 'CONTENT_LEGACY_MIGRATION_NOT_AVAILABLE' }
  );
});
