import assert from 'node:assert/strict';
import test from 'node:test';

import { runDraftPipeline } from '../services/contentAgent/draftPipeline.js';

const draft = {
  post: {
    id: 41,
    slug: 'sicherer-artikel',
    title: 'Sicherer Artikel',
    published: false,
    workflow_status: 'needs_review',
    content_format: 'static_html',
    generated_by_ai: true
  },
  metadata: { post_id: 41, quality_score: 94 },
  topicId: 17,
  qualityScore: 94
};

const snapshot = {
  operatingMode: 'auto_publish',
  forcedMode: null,
  autoPublishEffective: true,
  manualApprovalsCount: 8,
  autoPublishMinScore: 90
};

function harness({ publicationResult, publicationError, completed, autoStage } = {}) {
  const calls = [];
  const stages = new Map([['draft_creation', draft]]);
  if (autoStage) stages.set('auto_publish:auto-v1', autoStage);
  if (completed) stages.set('completed', completed);
  const dependencies = {
    config: snapshot,
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
    validateArticle() { return { passed: true, issues: [], sanitizedHtml: '<section></section>' }; },
    imageService: {
      async generateAndUploadImage() { assert.fail('Bild darf nicht neu erzeugt werden.'); },
      async deleteImage() { assert.fail('Bild darf nicht gelöscht werden.'); }
    },
    draftRepository: { async createAIDraft() { assert.fail('Draft darf nicht neu angelegt werden.'); } },
    publicationService: {
      async publishDraftAutomatically(input) {
        calls.push(['publication', input]);
        if (publicationError) throw publicationError;
        return publicationResult;
      }
    }
  };
  return { dependencies, calls, stages };
}

test('blockierte Auto-Entscheidung ist erfolgreicher Review-Fallback mit persistierter Policy-Stage', async () => {
  const resultValue = {
    post: draft.post,
    event: { id: 71, decision: 'blocked', policy_version: 'auto-v1' },
    decision: { allowed: false, policyVersion: 'auto-v1', reasons: ['forced_review'] },
    reviewRequired: true
  };
  const current = harness({ publicationResult: resultValue });

  const result = await runDraftPipeline({ runId: 88 }, current.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(result.reviewRequired, true);
  assert.equal(result.post.published, false);
  const publicationInput = current.calls.find(([type]) => type === 'publication')[1];
  assert.equal(publicationInput.postId, 41);
  assert.equal(publicationInput.runId, 88);
  assert.equal(publicationInput.snapshot, snapshot);
  assert.equal(typeof publicationInput.leaseGuard, 'function');
  assert.equal(current.stages.get('auto_publish:auto-v1').eventId, 71);
  assert.equal(current.stages.get('completed').reviewRequired, true);
});

test('erlaubte Auto-Entscheidung liefert ausschließlich den atomar veröffentlichten Post zurück', async () => {
  const published = { ...draft.post, published: true, workflow_status: 'published' };
  const current = harness({ publicationResult: {
    post: published,
    event: { id: 72, decision: 'allowed', policy_version: 'auto-v1' },
    decision: { allowed: true, policyVersion: 'auto-v1', reasons: [] },
    reviewRequired: false
  } });

  const result = await runDraftPipeline({ runId: 89 }, current.dependencies);

  assert.equal(result.post.published, true);
  assert.equal(result.reviewRequired, false);
  assert.equal(current.stages.get('completed').published, true);
});

test('Fehler oder unklarer Ausgang beim Auto-Event erzeugt keine completed-Stage', async () => {
  const error = Object.assign(new Error('Auto-Event-Commit unklar'), { code: 'CONTENT_AUTO_EVENT_UNCERTAIN' });
  const current = harness({ publicationError: error });

  await assert.rejects(runDraftPipeline({ runId: 90 }, current.dependencies), error);

  assert.equal(current.stages.has('auto_publish:auto-v1'), false);
  assert.equal(current.stages.has('completed'), false);
  const finishCall = current.calls.find(([type]) => type === 'finish');
  assert.equal(finishCall[2].status, 'failed');
  assert.equal(finishCall[2].errorReport.code, 'pipeline_failed');
});

test('Retry nach persistierter Auto-Stage ruft den idempotenten Publikationsservice erneut, aber keine Provider auf', async () => {
  const autoStage = {
    post: draft.post,
    eventId: 73,
    decision: 'blocked',
    policyVersion: 'auto-v1',
    reasons: ['risk_privacyClaims'],
    reviewRequired: true
  };
  const current = harness({ autoStage, publicationResult: {
    post: draft.post,
    event: { id: 73, decision: 'blocked', policy_version: 'auto-v1' },
    decision: { allowed: false, policyVersion: 'auto-v1', reasons: ['risk_privacyClaims'] },
    reviewRequired: true
  } });

  const result = await runDraftPipeline({ runId: 91 }, current.dependencies);

  assert.equal(result.reviewRequired, true);
  assert.equal(current.calls.filter(([type]) => type === 'publication').length, 1);
  assert.equal(current.calls.filter((entry) => (
    entry[0] === 'stage' && entry[2]?.stageId === 'auto_publish:auto-v1'
  )).length, 0);
});

test('completed-Recovery verwendet den finalen Post der Auto-Stage', async () => {
  const published = { ...draft.post, published: true, workflow_status: 'published' };
  const autoStage = {
    post: published,
    eventId: 74,
    decision: 'allowed',
    policyVersion: 'auto-v1',
    reasons: [],
    reviewRequired: false
  };
  const completed = {
    postId: 41, slug: draft.post.slug, topicId: 17, qualityScore: 94,
    published: true, reviewRequired: false, policyVersion: 'auto-v1'
  };
  const current = harness({ autoStage, completed });

  const result = await runDraftPipeline({ runId: 92 }, current.dependencies);

  assert.equal(result.post.published, true);
  assert.equal(result.post.workflow_status, 'published');
  assert.equal(current.calls.some(([type]) => type === 'publication'), false);
});
