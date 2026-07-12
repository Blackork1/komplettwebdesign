import assert from 'node:assert/strict';
import test from 'node:test';

import { runDraftPipeline } from '../services/contentAgent/draftPipeline.js';

const faq = Array.from({ length: 5 }, (_, index) => ({
  question: `Wie funktioniert Schritt ${index + 1}?`,
  answer: `Schritt ${index + 1} wird nachvollziehbar erklärt.`
}));
const risks = {
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
};
const focusedReview = { blocked: false, items: [], riskFlags: [], sourceCount: 0 };
const review = {
  passed: true,
  score: 94,
  summary: 'Der Artikel erfüllt alle Prüfungen.',
  strengths: ['Konkreter Kundennutzen'],
  issues: [],
  recommendedActions: [],
  requiresManualReview: false,
  risks,
  focusedReview
};
const publicationAt = '2026-07-13T16:00:00.000Z';
const draft = {
  post: {
    id: 41,
    slug: 'sicherer-artikel',
    title: 'Sicherer Artikel',
    excerpt: 'Eine konkrete Kurzbeschreibung für kleine Unternehmen.',
    meta_title: 'Sicherer Webdesign-Artikel für kleine Unternehmen',
    meta_description: 'Der Artikel erklärt kleinen Unternehmen konkret, wie sie ihr Webdesign sicher und strukturiert planen.',
    og_title: 'Sicherer Webdesign-Artikel',
    og_description: 'Konkrete Webdesign-Hinweise für kleine Unternehmen.',
    faq_json: faq,
    image_url: 'https://example.test/image.webp',
    image_alt: 'Unternehmerin plant ihre Website',
    content: '<section><h2>Sicher</h2></section>',
    scheduled_at: publicationAt,
    published: false,
    workflow_status: 'needs_review',
    content_format: 'static_html',
    generated_by_ai: true
  },
  metadata: {
    post_id: 41,
    quality_score: 94,
    internal_links_json: [
      { url: '/kontakt', label: 'Kontakt', purpose: 'Beratung' },
      { url: '/pakete', label: 'Pakete', purpose: 'Angebot' }
    ],
    source_references_json: [],
    quality_report_json: review
  },
  topicId: 17,
  qualityScore: 94
};

const snapshot = {
  operatingMode: 'auto_publish',
  forcedMode: null,
  autoPublishEffective: true,
  manualApprovalsCount: 8,
  autoPublishMinScore: 90,
  publicationAt,
  startedAt: '2026-07-12T10:00:00.000Z'
};

function harness({
  approvalResult,
  approvalError,
  completed,
  autoStage,
  nullStageIds = [],
  runtimeSnapshot = snapshot
} = {}) {
  const calls = [];
  const nullStages = new Set(nullStageIds);
  const stages = new Map([['draft_creation', draft]]);
  if (autoStage) stages.set('auto_schedule:auto-v1', autoStage);
  if (completed) stages.set('completed', completed);
  const dependencies = {
    config: runtimeSnapshot,
    inventoryService: { async buildSiteInventory() { assert.fail('Inventar darf beim Draft-Retry nicht laufen.'); } },
    openaiService: {},
    topicScoringService: {},
    topicRepository: {
      async createTopic() { assert.fail('Thema darf nicht neu angelegt werden.'); },
      async markTopicUsed(topicId) { calls.push(['topic', topicId]); }
    },
    runRepository: {
      async updateRunStage(runId, input) {
        calls.push(['stage', runId, input]);
        if (nullStages.has(input.stageId)) return null;
        if (!stages.has(input.stageId)) stages.set(input.stageId, structuredClone(input.stageResult));
        return input;
      },
      async finishRun(runId, input) { calls.push(['finish', runId, input]); return input; }
    },
    costService: {
      async getPersistedStageResult({ stageId }) { return stages.get(stageId) ?? null; },
      async reserveMonthlyBudget() { assert.fail('Budget darf beim Draft-Retry nicht erneut reserviert werden.'); },
      async settleMonthlyBudget() { assert.fail('Budget darf beim Draft-Retry nicht erneut abgerechnet werden.'); },
      estimateTextCost() { return 0; }
    },
    validateArticle() { return { passed: true, issues: [], sanitizedHtml: draft.post.content }; },
    imageService: {
      async generateAndUploadImage() { assert.fail('Bild darf nicht neu erzeugt werden.'); },
      async deleteImage() { assert.fail('Bild darf nicht gelöscht werden.'); }
    },
    draftRepository: { async createAIDraft() { assert.fail('Draft darf nicht neu angelegt werden.'); } },
    publicationService: {
      async approveAutomaticallyForSchedule(input) {
        calls.push(['approval', input]);
        if (approvalError) throw approvalError;
        return approvalResult;
      }
    }
  };
  return { dependencies, calls, stages, nullStages };
}

function blockedResult(reasons = ['forced_review'], eventId = 71) {
  return {
    post: draft.post,
    event: { id: eventId, decision: 'blocked', policy_version: 'auto-v1' },
    decision: { allowed: false, policyVersion: 'auto-v1', reasons },
    reviewRequired: true,
    job: null
  };
}

function allowedResult(eventId = 72) {
  return {
    post: { ...draft.post, workflow_status: 'approved_scheduled', approved_by_admin_id: null },
    event: { id: eventId, decision: 'allowed', policy_version: 'auto-v1' },
    decision: { allowed: true, policyVersion: 'auto-v1', reasons: [] },
    reviewRequired: false,
    job: { id: 91, job_type: 'publish_approved_post', run_after: publicationAt }
  };
}

test('blockierte Auto-Entscheidung bleibt needs_review und persistiert ihre Gründe', async () => {
  const current = harness({ approvalResult: blockedResult() });

  const result = await runDraftPipeline({ runId: 88, publication_at: publicationAt }, current.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(result.reviewRequired, true);
  assert.equal(result.post.workflow_status, 'needs_review');
  assert.equal(result.post.published, false);
  const approvalInput = current.calls.find(([type]) => type === 'approval')[1];
  assert.deepEqual({
    postId: approvalInput.postId,
    runId: approvalInput.runId,
    scheduledAt: approvalInput.scheduledAt,
    snapshot: approvalInput.snapshot
  }, { postId: 41, runId: 88, scheduledAt: publicationAt, snapshot });
  assert.equal(typeof approvalInput.leaseGuard, 'function');
  assert.deepEqual(current.stages.get('auto_schedule:auto-v1').reasons, ['forced_review']);
});

test('erlaubte Auto-Entscheidung plant den Zielslot, veröffentlicht aber am Generierungszeitpunkt nie', async () => {
  const current = harness({ approvalResult: allowedResult() });

  const result = await runDraftPipeline({ runId: 89, publication_at: publicationAt }, current.dependencies);

  assert.equal(result.post.published, false);
  assert.equal(result.post.workflow_status, 'approved_scheduled');
  assert.equal(result.reviewRequired, false);
  assert.equal(current.stages.get('completed').published, false);
  assert.equal(current.calls.filter(([type]) => type === 'approval').length, 1);
});

test('Pipeline verwendet bei einem veränderten Retry-Payload ausschließlich den unveränderlichen Snapshot-Termin', async () => {
  const current = harness({ approvalResult: allowedResult() });

  await runDraftPipeline({
    runId: 90,
    publication_at: '2026-07-20T16:00:00.000Z'
  }, current.dependencies);

  assert.equal(current.calls.find(([type]) => type === 'approval')[1].scheduledAt, publicationAt);
});

test('Fehler oder unklarer Ausgang der Auto-Planung erzeugt keine completed-Stage', async () => {
  const error = Object.assign(new Error('Auto-Freigabe unklar'), { code: 'CONTENT_AUTO_EVENT_UNCERTAIN' });
  const current = harness({ approvalError: error });

  await assert.rejects(runDraftPipeline({ runId: 91, publication_at: publicationAt }, current.dependencies), error);

  assert.equal(current.stages.has('auto_schedule:auto-v1'), false);
  assert.equal(current.stages.has('completed'), false);
  assert.equal(current.calls.find(([type]) => type === 'finish')[2].status, 'failed');
});

test('Retry nach persistierter Auto-Stage reconciled idempotent ohne Provideraufruf', async () => {
  const autoStage = {
    post: draft.post,
    eventId: 73,
    jobId: null,
    decision: 'blocked',
    policyVersion: 'auto-v1',
    reasons: ['risk_privacyClaims'],
    reviewRequired: true,
    scheduledAt: publicationAt
  };
  const current = harness({ autoStage, approvalResult: blockedResult(['risk_privacyClaims'], 73) });

  const result = await runDraftPipeline({ runId: 92, publication_at: publicationAt }, current.dependencies);

  assert.equal(result.reviewRequired, true);
  assert.equal(current.calls.filter(([type]) => type === 'approval').length, 1);
  assert.equal(current.calls.filter((entry) => (
    entry[0] === 'stage' && entry[2]?.stageId === 'auto_schedule:auto-v1'
  )).length, 0);
});

test('completed-Recovery verwendet den geplanten, weiterhin unveröffentlichten Post', async () => {
  const approved = allowedResult();
  const autoStage = {
    post: approved.post,
    eventId: 74,
    jobId: 91,
    decision: 'allowed',
    policyVersion: 'auto-v1',
    reasons: [],
    reviewRequired: false,
    scheduledAt: publicationAt
  };
  const completed = {
    postId: 41,
    slug: draft.post.slug,
    topicId: 17,
    qualityScore: 94,
    published: false,
    reviewRequired: false,
    policyVersion: 'auto-v1'
  };
  const current = harness({ autoStage, completed });

  const result = await runDraftPipeline({ runId: 93, publication_at: publicationAt }, current.dependencies);

  assert.equal(result.post.published, false);
  assert.equal(result.post.workflow_status, 'approved_scheduled');
  assert.equal(current.calls.some(([type]) => type === 'approval'), false);
});

test('null beim Auto-Stage-Write verhindert completed und wird idempotent reconciled', async () => {
  const current = harness({
    approvalResult: allowedResult(75),
    nullStageIds: ['auto_schedule:auto-v1']
  });

  await assert.rejects(
    runDraftPipeline({ runId: 94, publication_at: publicationAt }, current.dependencies),
    (error) => error.code === 'CONTENT_STAGE_PERSISTENCE_FAILED'
  );
  assert.equal(current.stages.has('auto_schedule:auto-v1'), false);
  assert.equal(current.stages.has('completed'), false);

  current.nullStages.delete('auto_schedule:auto-v1');
  const result = await runDraftPipeline({ runId: 94, publication_at: publicationAt }, current.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(result.post.published, false);
  assert.equal(current.calls.filter(([type]) => type === 'approval').length, 2);
});

test('null beim completed-Stage-Write ist ein technischer Fehler und kein erfolgreicher Runabschluss', async () => {
  const current = harness({
    nullStageIds: ['completed'],
    approvalResult: allowedResult(76)
  });

  await assert.rejects(
    runDraftPipeline({ runId: 95, publication_at: publicationAt }, current.dependencies),
    (error) => error.code === 'CONTENT_STAGE_PERSISTENCE_FAILED'
  );

  assert.equal(current.stages.has('auto_schedule:auto-v1'), true);
  assert.equal(current.stages.has('completed'), false);
  assert.equal(current.calls.some(([type, , input]) => type === 'finish' && input?.status === 'completed'), false);
});
