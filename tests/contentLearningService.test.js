import assert from 'node:assert/strict';
import test from 'node:test';

import { enqueueLearningObservationJob } from '../repositories/contentJobRepository.js';
import {
  buildPerformanceLearningCandidates,
  processPerformanceLearningEvidence,
  runContentLearningJob
} from '../services/contentAgent/contentLearningService.js';

function reviewRow(items, overrides = {}) {
  return {
    id: 41,
    review_version: 3,
    quality_report_json: {
      focusedReview: {
        blocked: false,
        items,
        riskFlags: [],
        sourceCount: 0
      }
    },
    ...overrides
  };
}

function issue(overrides = {}) {
  return {
    code: 'review_issue_1',
    reason: 'Mehrere Kontaktaufforderungen sind inhaltlich sehr ähnlich formuliert.',
    instruction: 'Formuliere mindestens einen CTA spezifischer.',
    section: 'Relaunch planen',
    anchor: 'pruefung-relaunch-planen',
    verificationType: 'none',
    sourceRequired: false,
    ...overrides
  };
}

function context() {
  return {
    claim: { id: 9, payload_json: { postId: 41, reviewVersion: 3 } },
    run: { id: 12, stage_results_json: {} },
    runtimeSnapshot: {
      monthlyCostLimitEur: 20,
      timezone: 'Europe/Berlin',
      reviewStageReservationEur: 0.1,
      reviewInputCostPerMtok: 0.2,
      reviewOutputCostPerMtok: 0.8
    },
    async leaseGuard() {}
  };
}

function dependencies(row) {
  const calls = { recorded: [], stored: [], finished: [], classified: 0, reserved: 0, settled: 0 };
  return {
    calls,
    learningRepository: {
      async loadReview() { return structuredClone(row); },
      async loadCachedClassifications() { return []; },
      async storeClassifications(input) { calls.stored.push(input); return input.classifications; },
      async recordObservationsAndMaybeProposals(input) {
        calls.recorded.push(input);
        return { observations: input.observations, proposals: [] };
      }
    },
    openaiService: {
      async classifyLearningIssues() { calls.classified += 1; throw new Error('nicht erwartet'); }
    },
    costService: {
      async getPersistedStageResult() { return null; },
      async reserveMonthlyBudget() { calls.reserved += 1; return { created: true, reservationMonth: '2026-07' }; },
      async settleMonthlyBudget() { calls.settled += 1; },
      async releaseMonthlyBudgetReservation() {},
      estimateTextCost() { return 0.01; }
    },
    runRepository: {
      async updateRunStage() {},
      async finishRun(runId, input) { calls.finished.push({ runId, ...input }); return { id: runId, ...input }; }
    }
  };
}

test('bekannte Hinweise werden lokal und ohne Providerkosten gespeichert', async () => {
  const deps = dependencies(reviewRow([issue()]));
  const result = await runContentLearningJob(context(), deps);
  assert.equal(result.status, 'completed');
  assert.equal(deps.calls.classified, 0);
  assert.equal(deps.calls.reserved, 0);
  assert.equal(deps.calls.recorded.length, 1);
  assert.equal(deps.calls.recorded[0].observations[0].categoryKey, 'cta_repetition_or_fit');
  assert.equal(deps.calls.finished[0].status, 'completed');
});

test('gecachte Providerklassifizierung verhindert einen zweiten OpenAI-Aufruf', async () => {
  const unknown = issue({
    reason: 'Ein ungewöhnlicher Sonderfall benötigt eine individuelle Bewertung.',
    instruction: 'Prüfe den Sonderfall ohne weitere Standardannahmen.'
  });
  const deps = dependencies(reviewRow([unknown]));
  deps.learningRepository.loadCachedClassifications = async ([fingerprint]) => [{
    fingerprint,
    category_key: 'technical_precision',
    classification_source: 'provider',
    confidence: 0.88,
    taxonomy_version: 'content-learning-taxonomy-v1'
  }];
  await runContentLearningJob(context(), deps);
  assert.equal(deps.calls.classified, 0);
  assert.equal(deps.calls.reserved, 0);
  assert.equal(deps.calls.recorded[0].observations[0].categoryKey, 'technical_precision');
});

test('persistierte Providerklassifizierung wird ohne Doppelaufruf sicher abgerechnet', async () => {
  const unknown = issue({
    reason: 'Ein ungewöhnlicher Sonderfall benötigt eine individuelle Bewertung.',
    instruction: 'Prüfe den Sonderfall ohne weitere Standardannahmen.'
  });
  const deps = dependencies(reviewRow([unknown]));
  let expectedFingerprint;
  deps.learningRepository.loadCachedClassifications = async ([fingerprint]) => {
    expectedFingerprint = fingerprint;
    return [];
  };
  deps.costService.getPersistedStageResult = async () => ({
    value: {
      classifications: [{
        fingerprint: expectedFingerprint,
        categoryKey: 'technical_precision',
        confidence: 0.89,
        reason: 'Fachliche Präzision ist die passendste Kategorie.'
      }]
    },
    reviewVersion: 3,
    reservationMonth: '2026-07',
    actualCost: 0.01,
    responseId: 'persisted-learning-response'
  });
  const result = await runContentLearningJob(context(), deps);
  assert.equal(result.status, 'completed');
  assert.equal(deps.calls.classified, 0);
  assert.equal(deps.calls.reserved, 1);
  assert.equal(deps.calls.settled, 1);
});

test('unbekannte Hinweise werden höchstens in einem kostenkontrollierten Batch klassifiziert', async () => {
  const unknown = issue({
    reason: 'Ein ungewöhnlicher Sonderfall benötigt eine individuelle Bewertung.',
    instruction: 'Prüfe den Sonderfall ohne weitere Standardannahmen.'
  });
  const deps = dependencies(reviewRow([unknown]));
  deps.openaiService.classifyLearningIssues = async ({ issues }) => {
    deps.calls.classified += 1;
    return {
      value: {
        classifications: issues.map(({ fingerprint }) => ({
          fingerprint,
          categoryKey: 'technical_precision',
          confidence: 0.89,
          reason: 'Fachliche Präzision ist die passendste Kategorie.'
        }))
      },
      responseId: 'learning-response-1',
      usage: { input_tokens: 20, output_tokens: 10 },
      promptVersion: '2026-07-14.1'
    };
  };
  await runContentLearningJob(context(), deps);
  assert.equal(deps.calls.classified, 1);
  assert.equal(deps.calls.reserved, 1);
  assert.equal(deps.calls.stored.length, 1);
  assert.equal(deps.calls.recorded[0].observations[0].classificationSource, 'provider');
});

test('identische unbekannte Hinweise werden im Providerbatch dedupliziert', async () => {
  const unknown = issue({
    reason: 'Ein ungewöhnlicher Sonderfall benötigt eine individuelle Bewertung.',
    instruction: 'Prüfe den Sonderfall ohne weitere Standardannahmen.'
  });
  const deps = dependencies(reviewRow([unknown, structuredClone(unknown)]));
  deps.openaiService.classifyLearningIssues = async ({ issues }) => {
    deps.calls.classified += 1;
    assert.equal(issues.length, 1);
    return {
      value: {
        classifications: [{
          fingerprint: issues[0].fingerprint,
          categoryKey: 'technical_precision',
          confidence: 0.89,
          reason: 'Fachliche Präzision ist die passendste Kategorie.'
        }]
      },
      responseId: 'learning-response-deduplicated',
      usage: {},
      promptVersion: '2026-07-14.1'
    };
  };
  const result = await runContentLearningJob(context(), deps);
  assert.equal(result.status, 'completed');
  assert.equal(deps.calls.classified, 1);
  assert.equal(deps.calls.recorded[0].observations.length, 2);
});

test('blockierter oder veralteter Prüfbericht beendet den Lernjob ohne Beobachtung', async () => {
  const blocked = dependencies(reviewRow([issue()]));
  blocked.learningRepository.loadReview = async () => reviewRow([issue()], {
    quality_report_json: { focusedReview: { blocked: true, items: [issue()] } }
  });
  await runContentLearningJob(context(), blocked);
  assert.equal(blocked.calls.recorded.length, 0);
  assert.equal(blocked.calls.finished[0].status, 'completed');

  const stale = dependencies(null);
  await runContentLearningJob(context(), stale);
  assert.equal(stale.calls.recorded.length, 0);
  assert.equal(stale.calls.finished[0].status, 'completed');
});

test('offene ungeklärte Providerreservierung wird nicht erneut ausgeführt', async () => {
  const unknown = issue({ reason: 'Sonderfall ohne lokale Kategorie.', instruction: 'Individuell prüfen.' });
  const deps = dependencies(reviewRow([unknown]));
  deps.costService.reserveMonthlyBudget = async () => ({ created: false, reservationMonth: '2026-07' });
  const result = await runContentLearningJob(context(), deps);
  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_execution_uncertain');
  assert.equal(deps.calls.classified, 0);
  assert.equal(deps.calls.recorded.length, 0);
});

test('Lernjob-Payload wird streng validiert und idempotent eingereiht', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ id: 7, payload_json: params[2] }] };
    }
  };
  const job = await enqueueLearningObservationJob({ postId: 41, reviewVersion: 3 }, db);
  assert.equal(job.id, 7);
  assert.deepEqual(calls[0].params.slice(0, 3), [
    'process_learning_observations',
    'learning-observation:41:3',
    { postId: 41, reviewVersion: 3, source: 'internal_learning' }
  ]);
  await assert.rejects(
    enqueueLearningObservationJob({ postId: 0, reviewVersion: 3 }, db),
    { code: 'CONTENT_LEARNING_JOB_PAYLOAD_INVALID' }
  );
});

test('Performancevorschlag entsteht erst aus drei unterschiedlichen Artikeln', () => {
  const row = (postId, evaluatedThroughDate = '2026-07-15') => ({
    postId,
    snapshotId: postId * 10,
    evaluatedThroughDate,
    categoryKey: 'performance_snippet_intent',
    evidenceCode: 'snippet_or_intent_opportunity',
    evidenceKind: 'diagnosis',
    windows: { 28: { impressions: 80, clicks: 0 } }
  });
  assert.deepEqual(buildPerformanceLearningCandidates([
    row(1), row(1, '2026-07-14'), row(2)
  ]), []);
  const candidates = buildPerformanceLearningCandidates([row(1), row(2), row(3)]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].categoryKey, 'performance_snippet_intent');
  assert.equal(candidates[0].evidenceCount, 3);
  assert.equal(candidates[0].evidenceJson.length, 3);
});

test('Performance-Lernbelege werden lokal und ohne Provider ausgewertet', async () => {
  const proposals = [];
  const rows = [1, 2, 3].map((postId) => ({
    postId,
    snapshotId: postId,
    evaluatedThroughDate: '2026-07-15',
    categoryKey: 'performance_ranking',
    evidenceCode: 'ranking_opportunity',
    evidenceKind: 'diagnosis',
    windows: { 28: { impressions: 100, clicks: 4 } }
  }));
  const result = await processPerformanceLearningEvidence({
    repository: {
      async listPerformanceEvidence({ categoryKeys }) {
        assert.ok(categoryKeys.includes('performance_ranking'));
        return rows;
      },
      async upsertPerformanceRuleProposal(candidate) {
        proposals.push(candidate);
        return { id: 7, ...candidate };
      }
    }
  });
  assert.equal(result.length, 1);
  assert.equal(proposals.length, 1);
  assert.match(proposals[0].suggestedRuleText, /interne Links/);
});
