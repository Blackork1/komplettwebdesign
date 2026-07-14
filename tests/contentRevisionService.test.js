import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRevisionSnapshot,
  createContentRevisionService,
  liveHashForPost
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
    service.approveRevision({ revisionId: 3, expectedVersion: 1, confirmed: false, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_CONFIRMATION_REQUIRED'
  );
  assert.equal(approvals.length, 0);
  await service.approveRevision({ revisionId: 3, expectedVersion: 1, confirmed: true, admin: { id: 1, username: 'admin' } });
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].expectedVersion, 1);
});

test('Vorbereitung einer KI-Optimierung liefert ausschließlich den serverseitigen Livehash', async () => {
  const service = createContentRevisionService({
    optimizationRepository: {
      async getPublishedPostSnapshot(postId) {
        assert.equal(postId, 7);
        return post;
      }
    }
  });

  assert.deepEqual(await service.prepareExistingPostOptimization(7), {
    baseLiveHash: liveHashForPost(post)
  });
});

test('Vorbereitung lehnt fehlende oder unveröffentlichte Artikel ab', async () => {
  for (const repositoryPost of [null, { ...post, published: false }]) {
    const service = createContentRevisionService({
      optimizationRepository: {
        async getPublishedPostSnapshot() { return repositoryPost; }
      }
    });

    await assert.rejects(
      service.prepareExistingPostOptimization(7),
      { code: 'CONTENT_POST_NOT_FOUND' }
    );
  }
});

test('KI-Optimierung baut denselben Snapshotvertrag und delegiert nur eine Draft-Revision', async () => {
  const staticPost = { ...post, content_format: 'static_html', content: '<p>Inhalt</p>' };
  const baseLiveHash = liveHashForPost(staticPost);
  const persisted = [];
  const validationContexts = [];
  const fields = {
    title: 'Gezielt optimierter Titel',
    shortDescription: 'Gezielt optimierte Kurzbeschreibung',
    metaTitle: 'Gezielt optimierter Meta-Titel',
    metaDescription: 'Eine gezielt optimierte und ausreichend konkrete Meta-Beschreibung für den bestehenden Beitrag.',
    ogTitle: 'Gezielt optimierter OG-Titel',
    ogDescription: 'Gezielt optimierte OG-Beschreibung',
    contentHtml: '<p>Gezielt optimierter Inhalt</p>',
    faqJson: validFaq,
    imageAlt: 'Gezielt optimierter Alt-Text',
    changeReasons: [{
      field: 'contentHtml', auditCodes: ['missing_internal_links'],
      reason: 'Konkreter formuliert.', sourceUrls: []
    }]
  };
  const diff = { changes: [{ id: 'change-1', field: 'contentHtml' }] };
  const service = createContentRevisionService({
    optimizationRepository: {
      async createOptimizedRevision(input) {
        persisted.push(input);
        return { id: 71, status: 'draft' };
      }
    },
    validateArticle: async (article, context) => {
      validationContexts.push(context);
      return { passed: true, sanitizedHtml: article.contentHtml, issues: [] };
    }
  });

  const result = await service.createOptimizedRevision({
    post: staticPost,
    fields,
    auditId: 31,
    jobId: 44,
    baseLiveHash,
    diff,
    report: { baseLiveHash, beforeScore: 72, afterScore: 92 },
    validationContext: { existingSlugs: [], allowedInternalLinks: ['/kontakt'] },
    admin: { id: 7, username: 'Content-Agent' }
  });

  assert.deepEqual(result, { id: 71, status: 'draft' });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].snapshot.base.live_hash, baseLiveHash);
  assert.equal(persisted[0].snapshot.base.slug, staticPost.slug);
  assert.equal(persisted[0].snapshot.base.content_format, 'static_html');
  assert.equal(persisted[0].snapshot.fields.content, fields.contentHtml);
  assert.equal(persisted[0].snapshot.fields.image_url, staticPost.image_url);
  assert.deepEqual(persisted[0].report.changes, diff.changes);
  assert.deepEqual(validationContexts[0].allowedInternalLinks, ['/kontakt']);
});

test('KI-Revisionsservice verwirft ungültige Providerfelder und einen veralteten Basishash vor dem Repository', async () => {
  const writes = [];
  const service = createContentRevisionService({
    optimizationRepository: {
      async createOptimizedRevision(input) { writes.push(input); }
    }
  });
  const validFields = {
    title: 'Titel', shortDescription: 'Kurzbeschreibung', metaTitle: 'Meta-Titel',
    metaDescription: 'Meta-Beschreibung', ogTitle: 'OG-Titel', ogDescription: 'OG-Beschreibung',
    contentHtml: post.content, faqJson: validFaq, imageAlt: 'Alt-Text',
    changeReasons: [{ field: 'metaTitle', auditCodes: [], reason: 'Präzisiert.', sourceUrls: [] }]
  };
  const base = {
    post,
    fields: validFields,
    auditId: 31,
    jobId: 44,
    diff: { changes: [] },
    report: { baseLiveHash: liveHashForPost(post) },
    admin: { id: 7, username: 'Content-Agent' }
  };

  await assert.rejects(service.createOptimizedRevision({
    ...base,
    fields: { ...validFields, slug: 'unerlaubt' },
    baseLiveHash: liveHashForPost(post)
  }), { code: 'CONTENT_REVISION_VALIDATION_FAILED' });
  await assert.rejects(service.createOptimizedRevision({
    ...base,
    baseLiveHash: 'b'.repeat(64)
  }), { code: 'CONTENT_REVISION_STALE' });
  assert.equal(writes.length, 0);
});
