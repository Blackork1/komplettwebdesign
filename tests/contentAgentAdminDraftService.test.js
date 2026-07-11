import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdminDraftRepository,
  createAdminDraftService
} from '../services/contentAgent/adminDraftService.js';
import * as adminDraftModule from '../services/contentAgent/adminDraftService.js';

const admin = { id: 7, username: 'redaktion' };
const faqItems = Array.from({ length: 5 }, (_, index) => ({
  question: `Wie funktioniert Schritt ${index + 1}?`,
  answer: `Schritt ${index + 1} wird verständlich erklärt.`
}));

function draft(overrides = {}) {
  return {
    post: {
      id: 3,
      title: 'Sicherer Entwurf',
      excerpt: 'Kurze Beschreibung',
      slug: 'sicherer-entwurf',
      content: '<section><h2>Inhalt</h2><p>Text</p></section>',
      faq_json: faqItems,
      meta_title: 'Sicherer Meta Title mit passender Länge für Berlin',
      meta_description: 'Diese Meta Description erklärt kleinen Unternehmen verständlich und konkret den sicheren Inhalt dieses Blogartikels.',
      og_title: 'Sicherer OG-Titel',
      og_description: 'Sichere OG-Beschreibung',
      image_alt: 'Sicheres Beitragsbild',
      content_format: 'static_html',
      generated_by_ai: true,
      published: false,
      workflow_status: 'needs_review'
    },
    metadata: {
      internal_links_json: ['/kontakt'],
      source_references_json: [],
      quality_report_json: { focusedReview: { items: [] } },
      generation_metadata_json: {}
    },
    ...overrides
  };
}

function validInput(overrides = {}) {
  return {
    title: 'Sicherer Entwurf',
    shortDescription: 'Kurze Beschreibung',
    slug: 'sicherer-entwurf',
    metaTitle: 'Sicherer Meta Title mit passender Länge für Berlin',
    metaDescription: 'Diese Meta Description erklärt kleinen Unternehmen verständlich und konkret den sicheren Inhalt dieses Blogartikels.',
    ogTitle: 'Sicherer OG-Titel',
    ogDescription: 'Sichere OG-Beschreibung',
    imageAlt: 'Sicheres Beitragsbild',
    faqJson: JSON.stringify(faqItems),
    contentHtml: '<section><h2>Inhalt</h2><p>Text</p></section>',
    ...overrides
  };
}

function harness({ current = draft(), validation } = {}) {
  const updates = [];
  const repository = {
    async getDraftWithMetadata() { return current; },
    async getValidationContext(postId) {
      assert.equal(postId, 3);
      return { existingSlugs: ['anderer-entwurf'], allowedInternalLinks: ['/kontakt'], sourceReferences: [] };
    },
    async updateDraftTransaction(input) { updates.push(input); return { ...current, saved: true }; }
  };
  const validateArticle = validation || ((article, context) => ({
    passed: !article.contentHtml.includes('<script>') && !context.existingSlugs.includes(article.slug),
    sanitizedHtml: article.contentHtml.replace(/ onclick="[^"]*"/g, ''),
    issues: article.contentHtml.includes('<script>') ? [{ code: 'script_forbidden' }] : []
  }));
  return { service: createAdminDraftService({ repository, validateArticle }), repository, updates };
}

test('Entwurfseditor speichert ausschließlich validiertes statisches HTML', async () => {
  const { service, updates } = harness();

  await assert.rejects(
    service.updateDraft({ postId: 3, input: validInput({ contentHtml: '<script>alert(1)</script>' }), admin }),
    (error) => error.code === 'CONTENT_DRAFT_VALIDATION_FAILED'
      && error.issues.some(({ code }) => code === 'script_forbidden')
  );
  assert.equal(updates.length, 0);
});

test('ungültiges FAQ-JSON wird als sicherer 400-Validierungsfehler behandelt', async () => {
  const { service, updates } = harness();

  await assert.rejects(
    service.updateDraft({ postId: 3, input: validInput({ faqJson: '{nicht-json' }), admin }),
    (error) => error.code === 'CONTENT_DRAFT_VALIDATION_FAILED'
      && !String(error.message).includes('Unexpected token')
  );
  assert.equal(updates.length, 0);
});

test('nur unveröffentlichte, KI-generierte static_html-Posts sind bearbeitbar', async () => {
  for (const postPatch of [
    { published: true },
    { generated_by_ai: false },
    { content_format: 'legacy_ejs' }
  ]) {
    const current = draft({ post: { ...draft().post, ...postPatch } });
    const { service, updates } = harness({ current });
    await assert.rejects(
      service.updateDraft({ postId: 3, input: validInput(), admin }),
      (error) => error.code === 'CONTENT_DRAFT_NOT_FOUND'
    );
    assert.equal(updates.length, 0);
  }
});

test('Slugprüfung schließt den aktuellen Post aus und die Schreib-API verwendet eine Allowlist', async () => {
  let validationContext;
  const { service, updates } = harness({
    validation(article, context) {
      validationContext = context;
      return { passed: true, sanitizedHtml: article.contentHtml, issues: [] };
    }
  });
  const input = validInput({
    published: 'true',
    workflow_status: 'published',
    generated_by_ai: 'false',
    generation_run_id: '999',
    quality_score: '100'
  });

  await service.updateDraft({ postId: 3, input, admin });

  assert.deepEqual(validationContext.existingSlugs, ['anderer-entwurf']);
  assert.equal(updates.length, 1);
  assert.deepEqual(Object.keys(updates[0].article).sort(), [
    'contentHtml', 'faqJson', 'imageAlt', 'metaDescription', 'metaTitle',
    'ogDescription', 'ogTitle', 'shortDescription', 'slug', 'title'
  ].sort());
  assert.deepEqual(updates[0].admin, admin);
  assert.equal('published' in updates[0].article, false);
});

test('getDraftForReview liefert Editorwerte und serialisiertes FAQ ohne Roh-Mass-Assignment', async () => {
  const { service } = harness();
  const result = await service.getDraftForReview(3);

  assert.equal(result.title, 'Sicherer Entwurf');
  assert.equal(result.shortDescription, 'Kurze Beschreibung');
  assert.equal(JSON.parse(result.faqJsonText).length, 5);
  assert.deepEqual(result.riskReview, { items: [] });
  assert.equal(Object.hasOwn(result, 'published'), false);
});

test('Repository aktualisiert Post und Metadata atomar, auditiert den Admin und publiziert nie', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (/^SELECT id FROM posts WHERE id = \$1/i.test(normalized)) return { rows: [{ id: 3 }] };
      if (/^SELECT id FROM posts WHERE slug = \$1/i.test(normalized)) return { rows: [] };
      if (/^UPDATE posts/i.test(normalized)) return { rows: [{ id: 3, published: false }] };
      if (/^UPDATE content_post_metadata/i.test(normalized)) return { rows: [{ post_id: 3 }] };
      return { rows: [] };
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); }
  };
  const repository = createAdminDraftRepository({ async connect() { return client; } });
  const article = validInput({ faqJson: faqItems });

  const result = await repository.updateDraftTransaction({ postId: 3, article, admin });

  assert.equal(result.post.published, false);
  assert.deepEqual(calls.slice(0, 3).map(({ sql }) => sql), [
    'BEGIN',
    'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE',
    calls[2].sql
  ]);
  const postUpdate = calls.find(({ sql }) => /^UPDATE posts/i.test(sql));
  const metadataUpdate = calls.find(({ sql }) => /^UPDATE content_post_metadata/i.test(sql));
  assert.ok(postUpdate);
  assert.ok(metadataUpdate);
  assert.doesNotMatch(postUpdate.sql.split(/\sWHERE\s/i)[0], /published\s*=|workflow_status\s*=|generated_by_ai\s*=/i);
  assert.match(metadataUpdate.sql, /lastAdminEdit/);
  assert.match(metadataUpdate.sql, /adminEditHistory/);
  assert.deepEqual(JSON.parse(metadataUpdate.params[1]), {
    adminId: 7,
    adminUsername: 'redaktion',
    changedFields: [
      'title', 'shortDescription', 'slug', 'metaTitle', 'metaDescription',
      'ogTitle', 'ogDescription', 'imageAlt', 'faqJson', 'contentHtml'
    ],
    editedAt: JSON.parse(metadataUpdate.params[1]).editedAt
  });
  assert.equal(calls.some(({ sql }) => sql === 'COMMIT'), true);
  assert.equal(calls.some(({ sql }) => sql === 'ROLLBACK'), false);
});

test('Repository rollt Poständerung zurück, wenn das Metadata-Update fehlschlägt', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (/^SELECT id FROM posts WHERE id = \$1/i.test(normalized)) return { rows: [{ id: 3 }] };
      if (/^SELECT id FROM posts WHERE slug = \$1/i.test(normalized)) return { rows: [] };
      if (/^UPDATE posts/i.test(normalized)) return { rows: [{ id: 3 }] };
      if (/^UPDATE content_post_metadata/i.test(normalized)) throw new Error('Metadata kaputt');
      return { rows: [] };
    },
    release() {}
  };
  const repository = createAdminDraftRepository({ async connect() { return client; } });

  await assert.rejects(
    repository.updateDraftTransaction({ postId: 3, article: validInput({ faqJson: faqItems }), admin }),
    /Metadata kaputt/
  );
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(calls.includes('COMMIT'), false);
});

test('Admin-Edit-Historie behält höchstens die letzten 49 alten Einträge und hängt den neuen chronologisch an', () => {
  assert.equal(typeof adminDraftModule.capAdminEditHistory, 'function');
  const existing = Array.from({ length: 75 }, (_, index) => ({ sequence: index + 1 }));
  const current = { sequence: 76 };

  const bounded = adminDraftModule.capAdminEditHistory(existing, current);

  assert.equal(bounded.length, 50);
  assert.deepEqual(bounded.map(({ sequence }) => sequence), Array.from({ length: 50 }, (_, index) => index + 27));
});

test('Metadata-UPDATE begrenzt auch eine bestehende übergroße JSONB-Historie mit einer bounded Indexserie', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (/^SELECT id FROM posts WHERE id = \$1/i.test(normalized)) return { rows: [{ id: 3 }] };
      if (/^SELECT id FROM posts WHERE slug = \$1/i.test(normalized)) return { rows: [] };
      if (/^UPDATE posts/i.test(normalized)) return { rows: [{ id: 3, published: false }] };
      if (/^UPDATE content_post_metadata/i.test(normalized)) return { rows: [{ post_id: 3 }] };
      return { rows: [] };
    },
    release() {}
  };
  const repository = createAdminDraftRepository({ async connect() { return client; } });

  await repository.updateDraftTransaction({ postId: 3, article: validInput({ faqJson: faqItems }), admin });

  const metadataUpdate = calls.find(({ sql }) => /^UPDATE content_post_metadata/i.test(sql));
  assert.deepEqual(metadataUpdate.params.slice(2), [50]);
  assert.match(metadataUpdate.sql, /generate_series/i);
  assert.match(metadataUpdate.sql, /jsonb_array_length/i);
  assert.match(metadataUpdate.sql, /ORDER BY[^)]*position/i);
});

test('Adminname wird für Auditdaten kontrollzeichenfrei normalisiert und auf 255 Zeichen begrenzt', async () => {
  const { service, updates } = harness({
    validation(article) { return { passed: true, sanitizedHtml: article.contentHtml, issues: [] }; }
  });
  const unsafeAdmin = { id: 7, username: `  Redaktion\n\t${'x'.repeat(300)}\u0000  ` };

  await service.updateDraft({ postId: 3, input: validInput(), admin: unsafeAdmin });

  assert.equal(updates[0].admin.username.length, 255);
  assert.doesNotMatch(updates[0].admin.username, /[\u0000-\u001f\u007f]/);
  assert.match(updates[0].admin.username, /^Redaktion x+/);
});
