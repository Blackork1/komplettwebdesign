import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentPublicationService } from '../services/contentAgent/contentPublicationService.js';

const admin = { id: 7, username: 'redaktion' };
const faqItems = Array.from({ length: 5 }, (_, index) => ({
  question: `Wie funktioniert Schritt ${index + 1}?`,
  answer: `Schritt ${index + 1} wird verständlich erklärt.`
}));

function validDraft(overrides = {}) {
  const base = {
    post: {
      id: 9,
      title: 'Sicherer KI-Entwurf',
      excerpt: 'Eine sichere Kurzbeschreibung',
      slug: 'sicherer-ki-entwurf',
      content: '<section><h2>Inhalt</h2><p>Sicherer Inhalt</p></section>',
      faq_json: faqItems,
      meta_title: 'Sicherer Meta Title mit passender Länge für Berlin',
      meta_description: 'Diese Meta Description erklärt kleinen Unternehmen verständlich und konkret den sicheren Inhalt dieses Blogartikels.',
      og_title: 'Sicherer OG-Titel',
      og_description: 'Sichere OG-Beschreibung',
      image_url: 'https://res.cloudinary.com/demo/image/upload/sicher.webp',
      image_alt: 'Sicheres Beitragsbild',
      content_format: 'static_html',
      generated_by_ai: true,
      published: false,
      workflow_status: 'needs_review',
      generation_run_id: 21
    },
    metadata: {
      quality_score: 92,
      internal_links_json: ['/kontakt'],
      source_references_json: [],
      quality_report_json: {
        risks: {},
        focusedReview: { blocked: false, items: [], riskFlags: [] }
      }
    }
  };
  return {
    post: { ...base.post, ...(overrides.post || {}) },
    metadata: { ...base.metadata, ...(overrides.metadata || {}) }
  };
}

function harness({ draft = validDraft(), validation, failAt } = {}) {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql === 'COMMIT' && failAt === 'commit') throw new Error('Commit fehlgeschlagen');
      return { rows: [] };
    },
    release() { calls.push('RELEASE'); }
  };
  const db = { async connect() { calls.push('CONNECT'); return client; } };
  const repository = {
    async getDraftWithMetadataForUpdate(postId, transaction) {
      calls.push(['lock', postId, transaction]);
      return draft;
    },
    async getValidationContext(postId, current, transaction) {
      calls.push(['context', postId, current, transaction]);
      return { existingSlugs: ['anderer-slug'], allowedInternalLinks: ['/kontakt'], sourceReferences: [] };
    },
    async publishDraft(postId, transaction) {
      calls.push(['publish', postId, transaction]);
      if (failAt === 'publish') throw new Error('Publish fehlgeschlagen');
      return { ...draft.post, published: true, workflow_status: 'published' };
    },
    async insertManualEvent(input, transaction) {
      calls.push(['manual-event', input, transaction]);
      if (failAt === 'event') throw new Error('Event fehlgeschlagen');
      return { id: 31, decision: 'manual' };
    },
    async incrementManualApprovals(transaction) {
      calls.push(['increment', transaction]);
      if (failAt === 'count') throw new Error('Zähler fehlgeschlagen');
      return { id: 1, manual_approvals_count: 1 };
    },
    async getSettings(transaction) {
      calls.push(['settings', transaction]);
      return { id: 1, manual_approvals_count: 0 };
    },
    async rejectDraft(postId, transaction) {
      calls.push(['reject', postId, transaction]);
      if (failAt === 'reject') throw new Error('Ablehnung fehlgeschlagen');
      return { ...draft.post, published: false, workflow_status: 'rejected' };
    },
    async insertRejectionEvent(input, transaction) {
      calls.push(['reject-event', input, transaction]);
      if (failAt === 'event') throw new Error('Event fehlgeschlagen');
      return { id: 32, decision: 'blocked' };
    }
  };
  const validateArticle = validation || ((article) => ({
    passed: true,
    sanitizedHtml: article.contentHtml,
    issues: []
  }));
  return {
    service: createContentPublicationService({ db, repository, validateArticle }),
    calls,
    repository
  };
}

test('manuelle Veröffentlichung verlangt die exakte Bestätigung und gültige begrenzte Admindaten', async () => {
  for (const confirmed of [undefined, false, 'true', 'on', 1]) {
    const { service, calls } = harness();
    await assert.rejects(
      service.publishDraftManually({ postId: 9, admin, confirmed }),
      (error) => error.code === 'CONTENT_CONFIRMATION_REQUIRED'
    );
    assert.equal(calls.includes('CONNECT'), false);
  }

  for (const invalidAdmin of [
    null,
    { id: 0, username: 'redaktion' },
    { id: Number.MAX_SAFE_INTEGER, username: 'redaktion' },
    { id: 7, username: '   ' }
  ]) {
    const { service, calls } = harness();
    await assert.rejects(
      service.publishDraftManually({ postId: 9, admin: invalidAdmin, confirmed: true }),
      (error) => error.code === 'CONTENT_ACTION_VALIDATION_FAILED'
    );
    assert.equal(calls.includes('CONNECT'), false);
  }
});

test('persistierter Draft wird vollständig revalidiert und erst danach veröffentlicht', async () => {
  let inspectedArticle;
  let inspectedContext;
  const { service, calls } = harness({
    validation(article, context) {
      inspectedArticle = article;
      inspectedContext = context;
      return { passed: true, sanitizedHtml: article.contentHtml, issues: [] };
    }
  });

  const result = await service.publishDraftManually({ postId: 9, admin, confirmed: true });

  assert.deepEqual(inspectedArticle, {
    title: 'Sicherer KI-Entwurf',
    shortDescription: 'Eine sichere Kurzbeschreibung',
    slug: 'sicherer-ki-entwurf',
    metaTitle: 'Sicherer Meta Title mit passender Länge für Berlin',
    metaDescription: 'Diese Meta Description erklärt kleinen Unternehmen verständlich und konkret den sicheren Inhalt dieses Blogartikels.',
    ogTitle: 'Sicherer OG-Titel',
    ogDescription: 'Sichere OG-Beschreibung',
    imageAlt: 'Sicheres Beitragsbild',
    faqJson: faqItems,
    contentHtml: '<section><h2>Inhalt</h2><p>Sicherer Inhalt</p></section>'
  });
  assert.deepEqual(inspectedContext.existingSlugs, ['anderer-slug']);
  assert.equal(result.post.published, true);
  assert.equal(result.settings.manual_approvals_count, 1);
  assert.equal(calls.includes('COMMIT'), true);
  assert.equal(calls.includes('ROLLBACK'), false);
});

test('Veröffentlichung blockiert falschen Zustand, fehlende Bilddaten, Score und persistierte Risiken', async () => {
  const variants = [
    validDraft({ post: { published: true, workflow_status: 'published' } }),
    validDraft({ post: { generated_by_ai: false } }),
    validDraft({ post: { content_format: 'legacy_ejs' } }),
    validDraft({ post: { workflow_status: 'rejected' } }),
    validDraft({ post: { image_url: 'javascript:alert(1)' } }),
    validDraft({ post: { image_alt: '' } }),
    validDraft({ metadata: { quality_score: 79 } }),
    validDraft({ metadata: { quality_report_json: { focusedReview: { blocked: true, items: [] } } } }),
    validDraft({ metadata: { quality_report_json: { focusedReview: { blocked: false, items: [{ blocking: true }] } } } }),
    validDraft({ metadata: { quality_report_json: { risks: { legalClaims: true }, focusedReview: { blocked: false, items: [], riskFlags: [] } } } }),
    validDraft({ metadata: { quality_report_json: { risks: {}, focusedReview: { blocked: false, items: 'ungültig', riskFlags: [] } } } }),
    validDraft({ metadata: { quality_report_json: { risks: {}, focusedReview: { items: [], riskFlags: [] } } } })
  ];

  for (const current of variants) {
    const { service, calls } = harness({ draft: current });
    await assert.rejects(
      service.publishDraftManually({ postId: 9, admin, confirmed: true }),
      (error) => ['CONTENT_DRAFT_NOT_PUBLISHABLE', 'CONTENT_DRAFT_VALIDATION_FAILED'].includes(error.code)
    );
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
    assert.equal(calls.includes('ROLLBACK'), true);
  }
});

test('abweichendes Sanitizer-Ergebnis oder Validatorfehler verhindern die Veröffentlichung', async () => {
  for (const validation of [
    () => ({ passed: false, sanitizedHtml: '', issues: [{ code: 'script_forbidden' }] }),
    (article) => ({ passed: true, sanitizedHtml: article.contentHtml.replace(' onclick="x"', ''), issues: [] })
  ]) {
    const current = validation.length === 0
      ? validDraft()
      : validDraft({ post: { content: '<section onclick="x"><h2>Inhalt</h2></section>' } });
    const { service, calls } = harness({ draft: current, validation });
    await assert.rejects(
      service.publishDraftManually({ postId: 9, admin, confirmed: true }),
      (error) => error.code === 'CONTENT_DRAFT_VALIDATION_FAILED'
    );
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  }
});

test('Event- oder Zählerfehler rollt die manuelle Veröffentlichung vollständig zurück', async () => {
  for (const failAt of ['event', 'count']) {
    const { service, calls } = harness({ failAt });
    await assert.rejects(
      service.publishDraftManually({ postId: 9, admin, confirmed: true }),
      new RegExp(failAt === 'event' ? 'Event' : 'Zähler')
    );
    assert.equal(calls.includes('ROLLBACK'), true);
    assert.equal(calls.includes('COMMIT'), false);
    assert.equal(calls.at(-1), 'RELEASE');
  }
});

test('ein bereits vorhandenes manuelles Ereignis veröffentlicht ohne zweite Zählung', async () => {
  const { service, repository, calls } = harness();
  repository.insertManualEvent = async (input, transaction) => {
    calls.push(['manual-event-existing', input, transaction]);
    return null;
  };

  const result = await service.publishDraftManually({ postId: 9, admin, confirmed: true });

  assert.equal(result.post.published, true);
  assert.equal(result.event, null);
  assert.equal(result.settings.manual_approvals_count, 0);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'settings'), true);
});

test('Ablehnung verlangt Bestätigung, bleibt unveröffentlicht und speichert nur einen bereinigten begrenzten Grund', async () => {
  const { service, calls } = harness();
  await assert.rejects(
    service.rejectDraft({ postId: 9, admin, reason: 'nicht passend', confirmed: 'true' }),
    (error) => error.code === 'CONTENT_CONFIRMATION_REQUIRED'
  );

  const unsafeReason = `  Fachlich\n\tnoch prüfen\u0000 ${'x'.repeat(800)} `;
  const result = await service.rejectDraft({ postId: 9, admin, reason: unsafeReason, confirmed: true });
  const eventCall = calls.find((entry) => Array.isArray(entry) && entry[0] === 'reject-event');

  assert.equal(result.post.published, false);
  assert.equal(result.post.workflow_status, 'rejected');
  assert.equal(eventCall[1].reason.length <= 500, true);
  assert.doesNotMatch(eventCall[1].reason, /[\u0000-\u001f\u007f]/);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
  assert.equal(calls.includes('COMMIT'), true);
});

test('fehlgeschlagenes Ablehnungsereignis rollt die Statusänderung zurück', async () => {
  const { service, calls } = harness({ failAt: 'event' });

  await assert.rejects(
    service.rejectDraft({ postId: 9, admin, reason: 'Fachlich nicht passend', confirmed: true }),
    /Event fehlgeschlagen/
  );

  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'reject'), true);
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(calls.includes('COMMIT'), false);
});

test('automatische Veröffentlichung bleibt als sichere Task-11-Basis inaktiv und zählt nie manuell', async () => {
  const { service, calls } = harness();

  await assert.rejects(
    service.publishDraftAutomatically({ postId: 9 }),
    (error) => error.code === 'CONTENT_AUTOPUBLISH_NOT_READY'
  );
  assert.equal(calls.includes('CONNECT'), false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
});
