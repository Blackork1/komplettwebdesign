import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentPublicationService } from '../services/contentAgent/contentPublicationService.js';

const admin = { id: 7, username: 'redaktion' };
const faqItems = Array.from({ length: 5 }, (_, index) => ({
  question: `Wie funktioniert Schritt ${index + 1}?`,
  answer: `Schritt ${index + 1} wird verständlich erklärt.`
}));
const safeRisks = {
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
};
const internalLinks = [
  { url: '/kontakt', label: 'Kontakt', purpose: 'Beratung' },
  { url: '/pakete', label: 'Pakete', purpose: 'Angebot' }
];
const autoSnapshot = {
  operatingMode: 'auto_publish',
  forcedMode: null,
  autoPublishEffective: true,
  manualApprovalsCount: 8,
  autoPublishMinScore: 90,
  settingsVersion: 4,
  source: 'manual'
};
const autoContext = {
  action: 'auto_publish_policy',
  settingsVersion: 4,
  source: 'manual',
  forcedMode: null
};

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
      internal_links_json: internalLinks,
      source_references_json: [],
      quality_report_json: {
        passed: true,
        score: 92,
        summary: 'Der Entwurf hat die Prüfung bestanden.',
        strengths: ['Klare Struktur'],
        issues: [],
        recommendedActions: [],
        requiresManualReview: false,
        risks: safeRisks,
        focusedReview: { blocked: false, items: [], riskFlags: [], sourceCount: 0 }
      }
    }
  };
  return {
    post: { ...base.post, ...(overrides.post || {}) },
    metadata: { ...base.metadata, ...(overrides.metadata || {}) }
  };
}

function harness({ draft = validDraft(), validation, failAt, existingAutoEvent = null } = {}) {
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
      return { existingSlugs: ['anderer-slug'], allowedInternalLinks: current.metadata.internal_links_json, sourceReferences: [] };
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
    },
    async getAutoEvent(input, transaction) {
      calls.push(['auto-event-read', input, transaction]);
      return existingAutoEvent;
    },
    async insertAutoEvent(input, transaction) {
      calls.push(['auto-event', input, transaction]);
      if (failAt === 'auto-event') throw new Error('Auto-Event fehlgeschlagen');
      return {
        id: 41,
        post_id: input.postId,
        run_id: input.runId,
        decision: input.decision,
        policy_version: input.policyVersion,
        quality_score: input.qualityScore,
        reasons_json: input.reasons,
        context_json: input.context
      };
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
  assert.deepEqual(inspectedContext.allowedInternalLinks, internalLinks);
  assert.equal(result.post.published, true);
  assert.equal(result.settings.manual_approvals_count, 1);
  assert.equal(calls.includes('COMMIT'), true);
  assert.equal(calls.includes('ROLLBACK'), false);
});

test('Veröffentlichung blockiert falschen Zustand, fehlende Bilddaten und Score', async () => {
  const variants = [
    validDraft({ post: { published: true, workflow_status: 'published' } }),
    validDraft({ post: { generated_by_ai: false } }),
    validDraft({ post: { content_format: 'legacy_ejs' } }),
    validDraft({ post: { workflow_status: 'rejected' } }),
    validDraft({ post: { image_url: 'javascript:alert(1)' } }),
    validDraft({ post: { image_alt: '' } }),
    validDraft({ metadata: { quality_score: 79 } })
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

test('unvollständige oder widersprüchliche Quality-Reports blockieren fail-closed', async () => {
  const validReport = validDraft().metadata.quality_report_json;
  const variants = [
    { ...validReport, passed: false },
    { ...validReport, score: 91 },
    { ...validReport, requiresManualReview: true },
    { ...validReport, risks: { ...safeRisks, staticPrices: true } },
    { ...validReport, risks: { ...safeRisks, staticPrices: undefined } },
    { ...validReport, risks: { currentClaims: false } },
    { ...validReport, focusedReview: { blocked: false, items: [], riskFlags: [] } },
    { ...validReport, focusedReview: { ...validReport.focusedReview, blocked: true } },
    { ...validReport, focusedReview: { ...validReport.focusedReview, items: 'ungültig' } },
    {
      ...validReport,
      issues: [{
        code: 'fachliche_pruefung',
        severity: 'warning',
        message: 'Aussage prüfen.',
        repairInstruction: 'Aussage anhand einer Quelle prüfen.',
        blocking: true,
        sectionHeading: null,
        evidenceExcerpt: null,
        verificationType: 'source',
        sourceRequired: true,
        autoPublishBlocking: true
      }],
      focusedReview: { ...validReport.focusedReview, blocked: false, items: [] }
    }
  ];

  for (const report of variants) {
    const { service, calls } = harness({
      draft: validDraft({ metadata: { quality_report_json: report } })
    });
    await assert.rejects(
      service.publishDraftManually({ postId: 9, admin, confirmed: true }),
      (error) => error.code === 'CONTENT_DRAFT_VALIDATION_FAILED'
    );
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
    assert.equal(calls.includes('ROLLBACK'), true);
  }
});

test('fehlende, leere oder malformed persistierte Internal-Link-Allowlists blockieren ohne globalen Fallback', async () => {
  for (const allowedLinks of [undefined, null, [], ['/kontakt'], [{ url: '/nicht-freigegeben' }]]) {
    const { service, calls } = harness({
      draft: validDraft({ metadata: { internal_links_json: allowedLinks } })
    });
    await assert.rejects(
      service.publishDraftManually({ postId: 9, admin, confirmed: true }),
      (error) => error.code === 'CONTENT_DRAFT_VALIDATION_FAILED'
    );
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'context'), false);
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
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

test('ein bereits vorhandenes manuelles Ereignis bei needs_review ist ein Konflikt und rollt den Post zurück', async () => {
  const { service, repository, calls } = harness();
  repository.insertManualEvent = async (input, transaction) => {
    calls.push(['manual-event-existing', input, transaction]);
    return null;
  };

  await assert.rejects(
    service.publishDraftManually({ postId: 9, admin, confirmed: true }),
    (error) => error.code === 'CONTENT_DRAFT_NOT_PUBLISHABLE'
  );

  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'settings'), false);
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(calls.includes('COMMIT'), false);
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

test('automatische Veröffentlichung verlangt gültige Post-, Run- und Snapshotdaten', async () => {
  const { service, calls } = harness();

  await assert.rejects(
    service.publishDraftAutomatically({ postId: 9 }),
    (error) => error.code === 'CONTENT_ACTION_VALIDATION_FAILED'
  );
  assert.equal(calls.includes('CONNECT'), false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
});

test('automatische Veröffentlichung revalidiert unter Lock, speichert allowed vor Publish und zählt nie manuell', async () => {
  const { service, calls } = harness();

  const result = await service.publishDraftAutomatically({
    postId: 9,
    runId: 21,
    snapshot: autoSnapshot
  });

  assert.equal(result.post.published, true);
  assert.equal(result.reviewRequired, false);
  assert.equal(result.event.decision, 'allowed');
  const names = calls.filter(Array.isArray).map(([name]) => name);
  assert.ok(names.indexOf('lock') < names.indexOf('auto-event'));
  assert.ok(names.indexOf('auto-event') < names.indexOf('publish'));
  assert.equal(names.includes('increment'), false);
  assert.equal(calls.includes('COMMIT'), true);
});

test('forced review und spätere Revalidierungsblocker speichern blocked und lassen den Post unveröffentlicht', async () => {
  const cases = [
    { snapshot: { ...autoSnapshot, forcedMode: 'review', operatingMode: 'review' } },
    { validation: () => ({ passed: false, sanitizedHtml: '', issues: [{ code: 'link_invalid' }] }) }
  ];
  for (const current of cases) {
    const { service, calls } = harness({ validation: current.validation });
    const result = await service.publishDraftAutomatically({
      postId: 9,
      runId: 21,
      snapshot: current.snapshot || autoSnapshot
    });

    assert.equal(result.reviewRequired, true);
    assert.equal(result.post.published, false);
    assert.equal(result.event.decision, 'blocked');
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
    assert.equal(calls.includes('COMMIT'), true);
  }
});

test('Auto-Eventfehler rollt vor jeder öffentlichen Änderung vollständig zurück', async () => {
  const { service, calls } = harness({ failAt: 'auto-event' });

  await assert.rejects(
    service.publishDraftAutomatically({ postId: 9, runId: 21, snapshot: autoSnapshot }),
    /Auto-Event fehlgeschlagen/
  );

  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(calls.includes('COMMIT'), false);
});

test('bestehendes blockiertes Auto-Event wird beim Retry weder dupliziert noch veröffentlicht', async () => {
  const forcedSnapshot = { ...autoSnapshot, forcedMode: 'review', operatingMode: 'review' };
  const existingAutoEvent = {
    id: 55,
    post_id: 9,
    run_id: 21,
    decision: 'blocked',
    policy_version: 'auto-v1',
    quality_score: 92,
    reasons_json: ['forced_review', 'mode_review'],
    context_json: { ...autoContext, forcedMode: 'review' }
  };
  const { service, calls } = harness({ existingAutoEvent });

  const result = await service.publishDraftAutomatically({
    postId: 9,
    runId: 21,
    snapshot: forcedSnapshot
  });

  assert.equal(result.event.id, 55);
  assert.equal(result.reviewRequired, true);
  assert.equal(calls.filter((entry) => Array.isArray(entry) && entry[0] === 'auto-event').length, 0);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
});

test('Retry nach unklarem Commit erkennt vorhandenes allowed-Event und bereits veröffentlichten Post', async () => {
  const existingAutoEvent = {
    id: 56,
    post_id: 9,
    run_id: 21,
    decision: 'allowed',
    policy_version: 'auto-v1',
    quality_score: 92,
    reasons_json: [],
    context_json: autoContext
  };
  const publishedDraft = validDraft({
    post: { published: true, workflow_status: 'published' }
  });
  const { service, calls } = harness({ draft: publishedDraft, existingAutoEvent });

  const result = await service.publishDraftAutomatically({
    postId: 9,
    runId: 21,
    snapshot: autoSnapshot
  });

  assert.equal(result.event.id, 56);
  assert.equal(result.post.published, true);
  assert.equal(result.reviewRequired, false);
  assert.equal(calls.filter((entry) => Array.isArray(entry) && entry[0] === 'auto-event').length, 0);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  assert.equal(calls.includes('COMMIT'), true);
});

test('automatische Veröffentlichung verweigert einen Draft aus einem anderen Generation-Run vor Event und Update', async () => {
  const { service, calls } = harness();

  await assert.rejects(
    service.publishDraftAutomatically({ postId: 9, runId: 22, snapshot: autoSnapshot }),
    (error) => error.code === 'CONTENT_AUTO_RUN_CONFLICT'
  );

  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'auto-event'), false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  assert.equal(calls.includes('ROLLBACK'), true);
});

test('bestehende Auto-Events müssen vollständig zu Run, Policy, Post, Score, Kontext und Postzustand passen', async () => {
  const baseEvent = {
    id: 57,
    post_id: 9,
    run_id: 21,
    decision: 'allowed',
    policy_version: 'auto-v1',
    quality_score: 92,
    reasons_json: [],
    context_json: autoContext
  };
  const publishedDraft = validDraft({ post: { published: true, workflow_status: 'published' } });
  const variants = [
    { event: { ...baseEvent, post_id: 10 }, draft: publishedDraft },
    { event: { ...baseEvent, run_id: 20 }, draft: publishedDraft },
    { event: { ...baseEvent, policy_version: 'auto-v0' }, draft: publishedDraft },
    { event: { ...baseEvent, quality_score: 91 }, draft: publishedDraft },
    { event: { ...baseEvent, reasons_json: ['unexpected'] }, draft: publishedDraft },
    { event: { ...baseEvent, context_json: { ...autoContext, settingsVersion: 3 } }, draft: publishedDraft },
    { event: baseEvent, draft: validDraft() },
    {
      event: { ...baseEvent, decision: 'blocked', reasons_json: ['forced_review'] },
      draft: publishedDraft
    }
  ];

  for (const { event, draft: currentDraft } of variants) {
    const { service, calls } = harness({ draft: currentDraft, existingAutoEvent: event });
    await assert.rejects(
      service.publishDraftAutomatically({ postId: 9, runId: 21, snapshot: autoSnapshot }),
      (error) => error.code === 'CONTENT_AUTO_EVENT_CONFLICT'
    );
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'auto-event'), false);
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  }
});
