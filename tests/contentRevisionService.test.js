import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRevisionSnapshot,
  createContentRevisionService
} from '../services/contentAgent/contentRevisionService.js';

const validFaq = Array.from({ length: 5 }, (_, index) => ({ question: `Frage ${index + 1}?`, answer: 'Eine vollständige Antwort.' }));
const post = {
  id: 7,
  title: 'Titel',
  slug: 'unveraendert',
  excerpt: 'Kurzbeschreibung',
  content: '<p>Inhalt</p>',
  content_format: 'legacy_ejs',
  meta_title: 'Meta Titel',
  meta_description: 'Meta Beschreibung',
  og_title: 'OG Titel',
  og_description: 'OG Beschreibung',
  faq_json: validFaq,
  image_url: 'https://example.test/bild.webp',
  image_alt: 'Alt-Text',
  published: true,
  updated_at: '2026-07-12T10:00:00.000Z'
};

test('Revisionssnapshot hat eine explizite Feldfreigabe und unveränderliche Basisdaten', () => {
  const snapshot = createRevisionSnapshot(post);
  assert.deepEqual(Object.keys(snapshot.fields).sort(), [
    'content', 'excerpt', 'faq_json', 'image_alt', 'image_url', 'meta_description',
    'meta_title', 'og_description', 'og_title', 'title'
  ]);
  assert.equal(snapshot.base.slug, post.slug);
  assert.equal(snapshot.base.content_format, post.content_format);
  assert.equal(snapshot.base.updated_at, post.updated_at);
  assert.match(snapshot.base.live_hash, /^[a-f0-9]{64}$/);
  assert.equal(snapshot.fields.slug, undefined);
  assert.equal(snapshot.fields.published, undefined);
});

test('Legacy-Inhalt bleibt bei der Bearbeitung konservativ unveränderlich', async () => {
  const saved = [];
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 3, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(post) }),
      updateDraftRevision: async (input) => { saved.push(input); return input; }
    }
  });

  await assert.rejects(
    service.updateRevision({ revisionId: 3, input: { revision_version: '1', content: '<p>Neu</p>' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
  );
  assert.equal(saved.length, 0);
});

test('Slug und Veröffentlichungsfelder sind auch im Revisionspayload gesperrt', async () => {
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 3, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(post) }),
      updateDraftRevision: async () => assert.fail('gesperrtes Feld darf nicht gespeichert werden')
    }
  });
  await assert.rejects(
    service.updateRevision({ revisionId: 3, input: { revision_version: '1', slug: 'neu', published: 'true' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
  );
});

test('statisches Revisions-HTML wird vor Speicherung fail-closed bereinigt', async () => {
  const staticPost = { ...post, content_format: 'static_html', content: '<p>Sicher</p>' };
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 4, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(staticPost) }),
      updateDraftRevision: async () => assert.fail('aktive Inhalte dürfen nicht gespeichert werden')
    },
    validateArticle: async () => ({ passed: true, sanitizedHtml: '<p>Sicher</p>', issues: [] })
  });
  await assert.rejects(
    service.updateRevision({ revisionId: 4, input: { revision_version: '1', content: '<script>alert(1)</script><p>Sicher</p>' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
  );
});

test('Revisionen validieren FAQ und Bild-URL auch für unverändertes Legacy-EJS streng', async () => {
  for (const invalid of [
    { faq_json: validFaq.slice(0, 4) },
    { image_url: 'javascript:alert(1)' },
    { image_url: '//evil.example/bild.webp' },
    { image_url: 'http://example.test/bild.webp' }
  ]) {
    const invalidPost = { ...post, ...invalid };
    const service = createContentRevisionService({
      repository: {
        getRevisionForEdit: async () => ({ id: 6, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(invalidPost) }),
        updateDraftRevision: async () => assert.fail('ungültige Revision darf nicht gespeichert werden')
      }
    });
    await assert.rejects(
      service.updateRevision({ revisionId: 6, input: { revision_version: '1', meta_title: 'Neu' }, admin: { id: 1, username: 'admin' } }),
      (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
    );
  }
});

test('statisches HTML erhält ausschließlich das vertrauenswürdige Linkinventar des Repositorys', async () => {
  const contexts = [];
  const staticPost = { ...post, content_format: 'static_html', content: '<p><a href="/unbekannt">Link</a></p>' };
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({
        id: 7, status: 'draft', revision_version: 2,
        snapshot_json: createRevisionSnapshot(staticPost),
        validation_context: { existingSlugs: [], allowedInternalLinks: ['/kontakt'] }
      }),
      updateDraftRevision: async (input) => input
    },
    validateArticle: async (article, context) => {
      contexts.push(context);
      return { passed: true, sanitizedHtml: article.contentHtml, issues: [] };
    }
  });
  await service.updateRevision({ revisionId: 7, input: { revision_version: '2', meta_title: 'Neu' }, admin: { id: 1, username: 'admin' } });
  assert.deepEqual(contexts[0].allowedInternalLinks, ['/kontakt']);
  assert.equal(contexts[0].allowedInternalLinks.includes('/unbekannt'), false);
});

test('optimistische Versionsprüfung verhindert verlorene Änderungen aus parallelen Tabs', async () => {
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 8, status: 'draft', revision_version: 3, snapshot_json: createRevisionSnapshot(post) }),
      updateDraftRevision: async () => assert.fail('stale Version darf nicht schreiben')
    }
  });
  await assert.rejects(
    service.updateRevision({ revisionId: 8, input: { revision_version: '2', meta_title: 'Parallel' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_CONFLICT'
  );
});

test('Freigabe benötigt Bestätigung und delegiert die atomare Sperrtransaktion', async () => {
  const approvals = [];
  const service = createContentRevisionService({
    repository: {
      approveRevisionTransaction: async (input) => { approvals.push(input); return { id: 3, status: 'approved' }; }
    }
  });

  await assert.rejects(
    service.approveRevision({ revisionId: 3, confirmed: false, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_CONFIRMATION_REQUIRED'
  );
  assert.equal(approvals.length, 0);
  await service.approveRevision({ revisionId: 3, confirmed: true, admin: { id: 1, username: 'admin' } });
  assert.equal(approvals.length, 1);
});
