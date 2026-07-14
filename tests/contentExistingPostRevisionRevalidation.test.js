import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSnapshotFingerprint,
  snapshotFingerprint
} from '../services/contentAgent/revisionSnapshotFingerprint.js';
import {
  evaluateExistingPostRevisionApproval
} from '../services/contentAgent/existingPostRevisionApprovalPolicy.js';
import { runExistingPostRevisionRevalidationJob } from '../services/contentAgent/existingPostRevisionRevalidationService.js';
import { createContentAgentJobSnapshot } from '../services/contentAgent/runtimeConfigService.js';

function approvedReview(score = 92) {
  return {
    passed: true,
    score,
    summary: 'Die Revision ist fachlich und technisch freigabefähig.',
    strengths: ['Nachvollziehbare Aktualisierung'],
    issues: [],
    recommendedActions: [],
    requiresManualReview: false,
    risks: {
      currentClaims: false,
      legalClaims: false,
      privacyClaims: false,
      softwareVersionClaims: false,
      staticPrices: false
    }
  };
}

function approvedRevision(overrides = {}) {
  const snapshot = {
    version: 1,
    base: { slug: 'beispiel', content_format: 'static_html' },
    fields: { title: 'Aktueller Stand', content: '<p>Inhalt</p>' }
  };
  const fingerprint = snapshotFingerprint(snapshot);
  return {
    revision: {
      id: 17,
      status: 'draft',
      revision_version: 4,
      snapshot_json: snapshot,
      optimization_report_json: {
        beforeScore: 88,
        afterScore: 90,
        review: approvedReview(99),
        revalidation: {
          status: 'passed',
          revisionVersion: 4,
          snapshotFingerprint: fingerprint,
          review: approvedReview(92),
          score: 92,
          minimumScore: 90,
          unresolvedAuditCodes: []
        }
      },
      ...overrides
    },
    fingerprint
  };
}

test('Snapshot-Fingerprint ist kanonisch, kleingeschrieben und streng validiert', () => {
  const left = snapshotFingerprint({ z: 1, nested: { b: 2, a: [3, { y: true, x: null }] } });
  const right = snapshotFingerprint({ nested: { a: [3, { x: null, y: true }], b: 2 }, z: 1 });

  assert.equal(left, right);
  assert.match(left, /^[0-9a-f]{64}$/);
  assert.equal(isSnapshotFingerprint(left), true);
  assert.equal(isSnapshotFingerprint(left.toUpperCase()), false);
  assert.equal(isSnapshotFingerprint('a'.repeat(63)), false);
});

test('nur die aktuelle version- und fingerprintgebundene Revalidierung erlaubt die Freigabe', () => {
  const { revision, fingerprint } = approvedRevision();
  assert.deepEqual(
    evaluateExistingPostRevisionApproval({ revision, snapshotFingerprint: fingerprint }),
    { allowed: true, reasonCode: 'approved', reasonLabel: 'Aktueller Revisionsstand vollständig geprüft' }
  );

  for (const status of ['pending', 'failed']) {
    const candidate = structuredClone(revision);
    candidate.optimization_report_json.revalidation.status = status;
    assert.equal(evaluateExistingPostRevisionApproval({ revision: candidate }).allowed, false);
  }

  const wrongVersion = structuredClone(revision);
  wrongVersion.optimization_report_json.revalidation.revisionVersion = 3;
  assert.equal(evaluateExistingPostRevisionApproval({ revision: wrongVersion }).allowed, false);

  const wrongFingerprint = structuredClone(revision);
  wrongFingerprint.optimization_report_json.revalidation.snapshotFingerprint = 'a'.repeat(64);
  assert.equal(evaluateExistingPostRevisionApproval({ revision: wrongFingerprint }).allowed, false);

  const oldReviewOnly = structuredClone(revision);
  delete oldReviewOnly.optimization_report_json.revalidation.review;
  assert.equal(evaluateExistingPostRevisionApproval({ revision: oldReviewOnly }).allowed, false);
});

test('Freigabepolicy erzwingt höheren Originalscore, Risikofreiheit und gelöste Auditbefunde', () => {
  const cases = [
    (revision) => { revision.optimization_report_json.afterScore = 94; },
    (revision) => { revision.optimization_report_json.revalidation.review.risks.legal = true; },
    (revision) => { revision.optimization_report_json.revalidation.review.requiresManualReview = true; },
    (revision) => { revision.optimization_report_json.revalidation.review.issues.push({ blocking: true }); },
    (revision) => { revision.optimization_report_json.revalidation.unresolvedAuditCodes = ['missing_meta_title']; },
    (revision) => { revision.optimization_report_json.revalidation.review.passed = false; },
    (revision) => { revision.status = 'approved'; }
  ];

  for (const mutate of cases) {
    const { revision } = approvedRevision();
    mutate(revision);
    assert.equal(evaluateExistingPostRevisionApproval({ revision }).allowed, false);
  }
});

function runnerFixture() {
  const post = {
    id: 19,
    title: 'Website-Relaunch planen',
    slug: 'website-relaunch',
    excerpt: 'Ein sicherer Relaunch.',
    content: '<section><h2>Planung</h2><p>Bestehender Inhalt.</p></section>',
    content_format: 'static_html',
    meta_title: 'Website-Relaunch planen',
    meta_description: 'Relaunch ohne SEO-Verluste planen.',
    og_title: 'Website-Relaunch planen',
    og_description: 'Planung für einen sicheren Relaunch.',
    faq_json: Array.from({ length: 5 }, (_, index) => ({
      question: `Frage ${index + 1}?`, answer: `Antwort ${index + 1}.`
    })),
    image_url: '/uploads/relaunch.webp',
    image_alt: 'Plan für einen Website-Relaunch',
    published: true,
    workflow_status: 'published',
    published_at: '2025-01-10T09:00:00.000Z',
    scheduled_at: null,
    updated_at: '2026-07-14T10:00:00.000Z'
  };
  const snapshot = {
    version: 1,
    base: {
      slug: post.slug,
      content_format: post.content_format,
      updated_at: post.updated_at,
      live_hash: 'a'.repeat(64)
    },
    fields: {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      meta_title: 'Website-Relaunch sicher planen',
      meta_description: post.meta_description,
      og_title: post.og_title,
      og_description: post.og_description,
      faq_json: post.faq_json,
      image_url: post.image_url,
      image_alt: post.image_alt
    }
  };
  const fingerprint = snapshotFingerprint(snapshot);
  const runtimeSnapshot = createContentAgentJobSnapshot({
    runtimeConfig: {
      operatingMode: 'review', timezone: 'Europe/Berlin', monthlyCostLimitEur: 25,
      maxAttempts: 3, contentStageReservationEur: 0.5, reviewStageReservationEur: 0.25,
      contentInputCostPerMtok: 2.5, contentOutputCostPerMtok: 15,
      reviewInputCostPerMtok: 0.75, reviewOutputCostPerMtok: 4.5,
      webSearchCostPerCallEur: 0.01, settingsVersion: 4
    },
    claim: { job_type: 'optimize_existing_post', payload_json: { source: 'admin_existing_content' } },
    now: new Date('2026-07-14T10:30:00.000Z'),
    allowedInternalLinks: ['/kontakt'],
    existingPostTrustedContext: { existingSlugs: [], metadata: null },
    activeLearningRules: []
  });
  const context = {
    post,
    revision: {
      id: 71,
      post_id: 19,
      status: 'draft',
      revision_version: 4,
      snapshot_json: snapshot,
      optimization_report_json: {
        baseLiveHash: snapshot.base.live_hash,
        beforeScore: 88,
        afterScore: 90,
        sources: [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }],
        changes: [],
        revalidation: {
          status: 'pending',
          revisionVersion: 4,
          snapshotFingerprint: fingerprint
        }
      }
    },
    audit: {
      id: 31,
      score: 88,
      findings_json: [],
      recommended_actions_json: []
    },
    runtimeSnapshot
  };
  const claim = {
    id: 52,
    job_type: 'revalidate_existing_post_revision',
    payload_json: {
      source: 'revision_revalidation',
      revision_id: 71,
      revision_version: 4,
      snapshot_fingerprint: fingerprint
    }
  };
  return { post, snapshot, fingerprint, runtimeSnapshot, context, claim };
}

function runnerDependencies(fixture, overrides = {}) {
  const state = {
    providerCalls: 0,
    completeCalls: [],
    failedCalls: [],
    finishCalls: [],
    storedStage: null,
    reviewInputs: []
  };
  const dependencies = {
    optimizationRepository: {
      async loadRevisionRevalidationContext() { return structuredClone(fixture.context); },
      async completeRevisionRevalidation(input) { state.completeCalls.push(input); return { id: 71 }; },
      async failRevisionRevalidation(input) { state.failedCalls.push(input); return { id: 71 }; }
    },
    validateArticle: async (article) => ({
      passed: true, sanitizedHtml: article.contentHtml, issues: []
    }),
    openaiService: {
      async reviewArticle(input) {
        state.providerCalls += 1;
        state.reviewInputs.push(input);
        return {
          value: approvedReview(92),
          usage: { input_tokens: 100, output_tokens: 40 },
          responseId: 'resp-revalidation',
          promptVersion: 'review-v1'
        };
      }
    },
    costService: {
      async getPersistedStageResult() { return state.storedStage; },
      async reserveMonthlyBudget() { return { created: true, reservationMonth: '2026-07' }; },
      estimateTextCost() { return 0.01; },
      async settleMonthlyBudget() {},
      async releaseMonthlyBudgetReservation() {}
    },
    runRepository: {
      async updateRunStage(_runId, input) {
        state.storedStage = structuredClone(input.stageResult);
        return { stage_results_json: { revision_editorial_review: state.storedStage } };
      },
      async finishRun(runId, input) {
        state.finishCalls.push({ runId, input });
        return { id: runId, status: input.status };
      }
    },
    async recordProviderResult() {},
    ...overrides
  };
  return { dependencies, state };
}

test('Revalidierungsworker bindet Quellen und Review an Version/Fingerprint und nutzt Providerresultat beim Resume erneut', async () => {
  const fixture = runnerFixture();
  const { dependencies, state } = runnerDependencies(fixture);
  const input = {
    claim: fixture.claim,
    run: { id: 90, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  };

  assert.equal((await runExistingPostRevisionRevalidationJob(input, dependencies)).status, 'completed');
  assert.equal((await runExistingPostRevisionRevalidationJob(input, dependencies)).status, 'completed');

  assert.equal(state.providerCalls, 1);
  assert.equal(state.completeCalls.length, 2);
  assert.equal(state.completeCalls[0].revisionVersion, 4);
  assert.equal(state.completeCalls[0].snapshotFingerprint, fixture.fingerprint);
  assert.equal(state.completeCalls[0].minimumScore, 90);
  assert.deepEqual(state.completeCalls[0].unresolvedAuditCodes, []);
  assert.deepEqual(state.reviewInputs[0].sourceReferences, fixture.context.revision.optimization_report_json.sources);
  assert.equal(state.storedStage.revisionFence, `71:4:${fixture.fingerprint}`);
});

test('Budgetfehler markiert nur den aktuellen Fence als fehlgeschlagen und ruft keinen Provider auf', async () => {
  const fixture = runnerFixture();
  const { dependencies, state } = runnerDependencies(fixture);
  dependencies.costService.reserveMonthlyBudget = async () => {
    throw Object.assign(new Error('Budget ausgeschöpft'), { code: 'CONTENT_BUDGET_LIMIT_REACHED' });
  };

  const result = await runExistingPostRevisionRevalidationJob({
    claim: fixture.claim,
    run: { id: 91, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  }, dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(state.providerCalls, 0);
  assert.equal(state.completeCalls.length, 0);
  assert.deepEqual(state.failedCalls[0], {
    revisionId: 71,
    revisionVersion: 4,
    snapshotFingerprint: fixture.fingerprint,
    failureCode: 'CONTENT_BUDGET_LIMIT_REACHED'
  });
});

test('Leaseverlust nach Providerantwort verhindert Revisions- und Runabschluss', async () => {
  const fixture = runnerFixture();
  const { dependencies, state } = runnerDependencies(fixture);
  let leaseCalls = 0;
  const leaseGuard = async () => {
    leaseCalls += 1;
    if (leaseCalls >= 5) {
      throw Object.assign(new Error('Lease verloren'), { code: 'CONTENT_JOB_LEASE_LOST' });
    }
    return true;
  };

  await assert.rejects(runExistingPostRevisionRevalidationJob({
    claim: fixture.claim,
    run: { id: 92, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard
  }, dependencies), { code: 'CONTENT_JOB_LEASE_LOST' });

  assert.equal(state.providerCalls, 1);
  assert.equal(state.completeCalls.length, 0);
  assert.equal(state.failedCalls.length, 0);
  assert.equal(state.finishCalls.length, 0);
});

test('Versionsrace nach persistierter Providerantwort überschreibt keinen neueren Entwurf und erzeugt keinen zweiten Provideraufruf', async () => {
  const fixture = runnerFixture();
  const { dependencies, state } = runnerDependencies(fixture);
  let contextLoads = 0;
  dependencies.optimizationRepository.loadRevisionRevalidationContext = async () => {
    contextLoads += 1;
    if (contextLoads === 1) return structuredClone(fixture.context);
    throw Object.assign(new Error('Fence verloren'), {
      code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST'
    });
  };
  dependencies.optimizationRepository.completeRevisionRevalidation = async (input) => {
    state.completeCalls.push(input);
    throw Object.assign(new Error('Fence verloren'), {
      code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST'
    });
  };
  const input = {
    claim: fixture.claim,
    run: { id: 93, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  };

  await assert.rejects(
    runExistingPostRevisionRevalidationJob(input, dependencies),
    { code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST' }
  );
  const resumed = await runExistingPostRevisionRevalidationJob(input, dependencies);

  assert.equal(resumed.status, 'needs_manual_attention');
  assert.equal(state.providerCalls, 1);
  assert.equal(state.completeCalls.length, 1);
  assert.equal(state.failedCalls.length, 0);
  assert.equal(state.finishCalls.at(-1).input.errorReport.code, 'CONTENT_REVISION_REVALIDATION_FENCE_LOST');
});

test('unsichere oder nicht gebundene Quellen stoppen vor Provideraufruf fail-closed', async () => {
  const fixture = runnerFixture();
  fixture.context.revision.optimization_report_json.sources = [{
    title: 'Unsichere Quelle',
    url: 'https://user:pass@example.com/geheim'
  }];
  const { dependencies, state } = runnerDependencies(fixture);

  const result = await runExistingPostRevisionRevalidationJob({
    claim: fixture.claim,
    run: { id: 94, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  }, dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(state.providerCalls, 0);
  assert.equal(state.failedCalls[0].failureCode, 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
});
