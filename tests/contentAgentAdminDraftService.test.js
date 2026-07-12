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
      workflow_status: 'needs_review',
      review_version: 2,
      approved_review_version: null,
      approved_at: null,
      approved_by_admin_id: null
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

test('Repository aktualisiert Post und Metadata atomar, auditiert den Admin und widerruft jede Freigabe', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (/^SELECT id FROM posts WHERE id = \$1/i.test(normalized)) return { rows: [{ id: 3 }] };
      if (/^SELECT id FROM posts WHERE slug = \$1/i.test(normalized)) return { rows: [] };
      if (/^UPDATE posts/i.test(normalized)) {
        return { rows: [{
          id: 3,
          published: false,
          workflow_status: 'needs_review',
          review_version: 3,
          approved_review_version: null,
          approved_at: null,
          approved_by_admin_id: null
        }] };
      }
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
  const setClause = postUpdate.sql.split(/\sWHERE\s/i)[0];
  assert.doesNotMatch(setClause, /published\s*=|generated_by_ai\s*=/i);
  assert.match(setClause, /review_version\s*=\s*review_version\s*\+\s*1/i);
  assert.match(setClause, /workflow_status\s*=\s*'needs_review'/i);
  assert.match(setClause, /approved_review_version\s*=\s*NULL/i);
  assert.match(setClause, /approved_at\s*=\s*NULL/i);
  assert.match(setClause, /approved_by_admin_id\s*=\s*NULL/i);
  assert.equal(result.post.workflow_status, 'needs_review');
  assert.equal(result.post.review_version, 3);
  assert.equal(result.post.approved_review_version, null);
  assert.equal(result.post.approved_at, null);
  assert.equal(result.post.approved_by_admin_id, null);
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

test('getDraftForReview leitet Aktionen ausschließlich aus dem serverseitigen Zustand ab', async () => {
  const current = draft({
    post: {
      ...draft().post,
      workflow_status: 'needs_review',
      scheduled_at: new Date('2026-07-12T09:00:00.000Z')
    },
    notification: { status: 'failed', attempts: 6, last_error_code: 'smtp_etimedout' }
  });
  const { service } = harness({ current });

  const result = await service.getDraftForReview(3);

  assert.deepEqual(result.actions, {
    canApproveScheduled: false,
    canPublishNow: true,
    canReschedule: true,
    canRetryNotification: true
  });
});

test('ein nicht terminierter Entwurf wird nicht als verpasster Slot behandelt', async () => {
  const current = draft({
    post: { ...draft().post, scheduled_at: null }
  });
  const { service } = harness({ current });

  const result = await service.getDraftForReview(3);

  assert.deepEqual(result.actions, {
    canApproveScheduled: false,
    canPublishNow: false,
    canReschedule: false,
    canRetryNotification: false
  });
});

test('ein exakt fälliger Termin gilt serverseitig noch nicht als verpasst', async () => {
  const current = draft({
    post: {
      ...draft().post,
      scheduled_at: new Date('2026-07-12T10:00:00.000Z')
    }
  });
  const service = createAdminDraftService({
    repository: {
      async getDraftWithMetadata() { return current; }
    },
    now: () => new Date('2026-07-12T10:00:00.000Z')
  });

  const result = await service.getDraftForReview(3);

  assert.equal(result.actions.canPublishNow, false);
  assert.equal(result.actions.canReschedule, false);
});

test('zukünftiger Reviewentwurf kann alternativ freigegeben und neu terminiert werden', async () => {
  const current = draft({
    post: {
      ...draft().post,
      scheduled_at: new Date('2026-07-13T16:00:00.000Z')
    }
  });
  const service = createAdminDraftService({
    repository: { async getDraftWithMetadata() { return current; } },
    now: () => new Date('2026-07-12T10:00:00.000Z')
  });

  const result = await service.getDraftForReview(3);

  assert.equal(result.actions.canApproveScheduled, true);
  assert.equal(result.actions.canReschedule, true);
});

test('Mailretry-Flag erlaubt nur ausgeschöpfte, eindeutig temporäre SMTP-Fehler', async () => {
  const basePost = { ...draft().post, scheduled_at: null };
  const cases = [
    [{ status: 'failed', attempts: 6, last_error_code: 'smtp_etimedout' }, true],
    [{ status: 'failed', attempts: 6, last_error_code: 'outcome_uncertain' }, false],
    [{ status: 'failed', attempts: 6, last_error_code: 'smtp_outcome_uncertain' }, false],
    [{ status: 'failed', attempts: 6, last_error_code: 'smtp_rejected' }, false],
    [{ status: 'failed', attempts: 5, last_error_code: 'smtp_etimedout' }, false],
    [{ status: 'sent', attempts: 1, last_error_code: null }, false],
    [{ status: 'sending', attempts: 1, last_error_code: null }, false]
  ];

  for (const [notification, expected] of cases) {
    const service = createAdminDraftService({
      repository: {
        async getDraftWithMetadata() {
          return draft({ post: basePost, notification });
        }
      }
    });
    const result = await service.getDraftForReview(3);
    assert.equal(result.actions.canRetryNotification, expected, JSON.stringify(notification));
  }
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

test('manueller Admin-Mailretry setzt Zustellung und passenden Job atomar zurück', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (/^WITH candidate_delivery/i.test(normalized)) {
        return { rows: [{ id: 41, delivery_id: 9, status: 'queued', attempts: 0 }] };
      }
      return { rows: [] };
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); }
  };
  const repository = createAdminDraftRepository({ async connect() { return client; } });

  const result = await repository.retryAdminReviewNotificationTransaction({ postId: 3 });

  assert.equal(result.delivery_id, 9);
  const retry = calls.find(({ sql }) => /^WITH candidate_delivery/i.test(sql));
  assert.deepEqual(retry.params, [3]);
  assert.match(retry.sql, /notification_type = 'admin_review'/i);
  const candidateSql = retry.sql.match(/candidate_delivery AS \((.*?)\), reset_delivery AS/is)?.[1] || '';
  assert.doesNotMatch(candidateSql, /status = 'failed'/i);
  assert.match(retry.sql, /reset_delivery AS[\s\S]*delivery\.status = 'failed'/i);
  assert.match(retry.sql, /delivery\.attempts\s*=\s*6/i);
  assert.match(retry.sql, /last_error_code\s*~\s*'\^smtp_\[a-z0-9_\]\+\$'/i);
  assert.match(retry.sql, /last_error_code\s*<>\s*'smtp_rejected'/i);
  assert.match(retry.sql, /last_error_code\s+NOT LIKE\s+'%uncertain%'/i);
  assert.match(retry.sql, /UPDATE content_notification_deliveries/i);
  assert.match(retry.sql, /UPDATE content_jobs/i);
  assert.match(retry.sql, /job_type = 'send_admin_review_notification'/i);
  assert.match(retry.sql, /payload_json\s*->>\s*'deliveryId'/i);
  assert.equal(calls.some(({ sql }) => sql === 'COMMIT'), true);
});

test('manueller Admin-Mailretry verlangt vor dem Transaktionsstart die literale Bestätigung', async () => {
  let connects = 0;
  const repository = createAdminDraftRepository({
    async connect() { connects += 1; throw new Error('darf nicht verbinden'); }
  });
  const service = createAdminDraftService({ repository, validateArticle: () => ({}) });

  for (const confirmed of [undefined, false, 'true', 'on', 1]) {
    await assert.rejects(
      service.retryAdminReviewNotification({ postId: 3, confirmed }),
      (error) => error.code === 'CONTENT_CONFIRMATION_REQUIRED'
    );
  }
  assert.equal(connects, 0);
});

test('Mailretry-Service blockiert outcome_uncertain, sent und sending vor jeder Mutation', async () => {
  for (const notification of [
    { status: 'failed', attempts: 6, last_error_code: 'outcome_uncertain' },
    { status: 'sent', attempts: 1, last_error_code: null },
    { status: 'sending', attempts: 1, last_error_code: null }
  ]) {
    let mutations = 0;
    const repository = {
      async getDraftWithMetadata() {
        return draft({ notification });
      },
      async retryAdminReviewNotificationTransaction() {
        mutations += 1;
        return { id: 1 };
      }
    };
    const service = createAdminDraftService({ repository });

    await assert.rejects(
      service.retryAdminReviewNotification({ postId: 3, confirmed: true }),
      (error) => error.code === 'CONTENT_DRAFT_NOTIFICATION_NOT_RETRYABLE'
    );
    assert.equal(mutations, 0, JSON.stringify(notification));
  }
});
