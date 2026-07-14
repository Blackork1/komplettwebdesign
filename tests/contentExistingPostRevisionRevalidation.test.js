import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSnapshotFingerprint,
  snapshotFingerprint
} from '../services/contentAgent/revisionSnapshotFingerprint.js';
import {
  evaluateExistingPostRevisionApproval,
  minimumExistingPostRevisionScore
} from '../services/contentAgent/existingPostRevisionApprovalPolicy.js';
import { runExistingPostRevisionRevalidationJob } from '../services/contentAgent/existingPostRevisionRevalidationService.js';
import { createContentAgentJobSnapshot } from '../services/contentAgent/runtimeConfigService.js';
import * as revisionFailurePolicy from '../services/contentAgent/existingPostRevisionFailurePolicy.js';

const { isExistingPostRevisionFailureCode } = revisionFailurePolicy;

test('Revalidierungsfehlercodes sind fest allowgelistet', () => {
  assert.equal(isExistingPostRevisionFailureCode('CONTENT_REVISION_REVALIDATION_PAYLOAD_INVALID'), true);
  assert.equal(isExistingPostRevisionFailureCode('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'), true);
  assert.equal(isExistingPostRevisionFailureCode('provider_execution_uncertain'), true);
  assert.equal(isExistingPostRevisionFailureCode('FREIER_PROVIDER_CODE'), false);
});

test('gemeinsame Revalidierungsfehlerpolicy trennt permanent, transient, ausgeschöpft, Lease und Fence', () => {
  const classify = revisionFailurePolicy.classifyExistingPostRevisionError;
  assert.equal(typeof classify, 'function');
  assert.deepEqual(classify({ code: 'CONTENT_REVISION_STALE' }, {
    attempts: 1, max_attempts: 3
  }), {
    disposition: 'permanent',
    failureCode: 'CONTENT_REVISION_STALE',
    exhausted: false
  });
  assert.deepEqual(classify({ code: '40001' }, {
    attempts: 1, max_attempts: 3
  }), {
    disposition: 'transient',
    failureCode: null,
    exhausted: false
  });
  assert.deepEqual(classify({ code: 'ECONNRESET' }, {
    attempts: 3, max_attempts: 3
  }), {
    disposition: 'permanent',
    failureCode: 'CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED',
    exhausted: true
  });
  assert.deepEqual(classify(new Error('Invariante verletzt'), {
    attempts: 1, max_attempts: 3
  }), {
    disposition: 'permanent',
    failureCode: 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID',
    exhausted: false
  });
  assert.equal(classify({ code: 'CONTENT_JOB_LEASE_LOST' }).disposition, 'lease_lost');
  assert.equal(
    classify({ code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST' }).disposition,
    'fence_lost'
  );
});

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
          minimumScore: 88,
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
    (revision) => { revision.optimization_report_json.beforeScore = 94; },
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

test('Mindestscore stammt ausschließlich aus beforeScore und niemals aus afterScore', () => {
  assert.equal(minimumExistingPostRevisionScore({ beforeScore: 72, afterScore: 99 }), 80);
  assert.equal(minimumExistingPostRevisionScore({ beforeScore: 91, afterScore: 70 }), 91);
  assert.equal(minimumExistingPostRevisionScore({ beforeScore: null, afterScore: 99 }), null);
  assert.equal(minimumExistingPostRevisionScore({ beforeScore: '91', afterScore: 70 }), null);

  const belowEighty = approvedRevision().revision;
  belowEighty.optimization_report_json.beforeScore = 72;
  belowEighty.optimization_report_json.afterScore = 99;
  belowEighty.optimization_report_json.revalidation.minimumScore = 80;
  assert.equal(evaluateExistingPostRevisionApproval({ revision: belowEighty }).allowed, true);

  const aboveEighty = approvedRevision().revision;
  aboveEighty.optimization_report_json.beforeScore = 91;
  aboveEighty.optimization_report_json.afterScore = 70;
  aboveEighty.optimization_report_json.revalidation.minimumScore = 91;
  assert.equal(evaluateExistingPostRevisionApproval({ revision: aboveEighty }).allowed, true);
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
          snapshotFingerprint: fingerprint,
          minimumScore: 88
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
    budgetReservations: 0,
    stageWrites: 0,
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
      async reserveMonthlyBudget() {
        state.budgetReservations += 1;
        return { created: true, reservationMonth: '2026-07' };
      },
      estimateTextCost() { return 0.01; },
      async settleMonthlyBudget() {},
      async releaseMonthlyBudgetReservation() {}
    },
    runRepository: {
      async updateRunStage(_runId, input) {
        state.stageWrites += 1;
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

test('dauerhafte stale und ungültige Kontexte terminalisieren Revision und vorhandenen Run', async () => {
  for (const errorCode of [
    'CONTENT_REVISION_STALE',
    'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'
  ]) {
    const fixture = runnerFixture();
    fixture.claim.attempts = 1;
    fixture.claim.max_attempts = 3;
    const { dependencies, state } = runnerDependencies(fixture);
    dependencies.optimizationRepository.loadRevisionRevalidationContext = async () => {
      throw Object.assign(new Error('Dauerhafter Kontextfehler'), { code: errorCode });
    };

    const result = await runExistingPostRevisionRevalidationJob({
      claim: fixture.claim,
      run: { id: 89, status: 'running' },
      runtimeSnapshot: fixture.runtimeSnapshot,
      leaseGuard: async () => true
    }, dependencies);

    assert.equal(result.status, 'needs_manual_attention');
    assert.equal(result.code, errorCode);
    assert.equal(state.failedCalls[0].failureCode, errorCode);
    assert.equal(state.finishCalls[0].input.status, 'needs_manual_attention');
    assert.equal(state.providerCalls, 0);
  }
});

test('geladene ungültige Reports, Audits und Ursprungssnapshots scheitern nach Runanlage fail-closed', async () => {
  const cases = [
    {
      label: 'Report',
      mutate(fixture) {
        fixture.context.revision.optimization_report_json = null;
      }
    },
    {
      label: 'Audit',
      mutate(fixture) {
        fixture.context.audit.findings_json = null;
      }
    },
    {
      label: 'Audit-Score',
      mutate(fixture) {
        fixture.context.audit.score = null;
      }
    },
    {
      label: 'Ursprungssnapshot',
      mutate(fixture) {
        fixture.context.runtimeSnapshot = null;
      }
    }
  ];

  for (const currentCase of cases) {
    const fixture = runnerFixture();
    currentCase.mutate(fixture);
    const { dependencies, state } = runnerDependencies(fixture);

    const result = await runExistingPostRevisionRevalidationJob({
      claim: fixture.claim,
      run: { id: 89, status: 'running' },
      runtimeSnapshot: fixture.runtimeSnapshot,
      leaseGuard: async () => true
    }, dependencies);

    assert.equal(result.status, 'needs_manual_attention', currentCase.label);
    assert.equal(
      result.code,
      'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID',
      currentCase.label
    );
    assert.equal(
      state.failedCalls[0]?.failureCode,
      'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID',
      currentCase.label
    );
    assert.equal(state.finishCalls[0]?.input.status, 'needs_manual_attention', currentCase.label);
    assert.equal(state.providerCalls, 0, currentCase.label);
  }
});

test('transienter Kontextfehler nach Runanlage bleibt ohne Revisionsschreibzugriff retrybar', async () => {
  const fixture = runnerFixture();
  fixture.claim.attempts = 1;
  fixture.claim.max_attempts = 3;
  const { dependencies, state } = runnerDependencies(fixture);
  dependencies.optimizationRepository.loadRevisionRevalidationContext = async () => {
    throw Object.assign(new Error('Serialisierungskonflikt'), { code: '40001' });
  };

  await assert.rejects(runExistingPostRevisionRevalidationJob({
    claim: fixture.claim,
    run: { id: 89, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  }, dependencies), {
    code: 'CONTENT_REVISION_REVALIDATION_TRANSIENT',
    retryable: true
  });
  assert.equal(state.failedCalls.length, 0);
  assert.equal(state.finishCalls.length, 0);
});

test('ausgeschöpfter transienter Kontextfehler verlässt pending und terminalisiert den Run', async () => {
  const fixture = runnerFixture();
  fixture.claim.attempts = 3;
  fixture.claim.max_attempts = 3;
  const { dependencies, state } = runnerDependencies(fixture);
  dependencies.optimizationRepository.loadRevisionRevalidationContext = async () => {
    throw Object.assign(new Error('Verbindung zurückgesetzt'), { code: 'ECONNRESET' });
  };

  const result = await runExistingPostRevisionRevalidationJob({
    claim: fixture.claim,
    run: { id: 89, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  }, dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED');
  assert.equal(
    state.failedCalls[0].failureCode,
    'CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED'
  );
  assert.equal(state.finishCalls[0].input.status, 'needs_manual_attention');
});

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
  assert.equal(state.completeCalls[0].minimumScore, 88);
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

function markFixtureRevalidationPassed(fixture, review = approvedReview(92)) {
  fixture.context.revision.optimization_report_json.revalidation = {
    status: 'passed',
    revisionVersion: 4,
    snapshotFingerprint: fixture.fingerprint,
    review,
    score: review.score,
    minimumScore: 88,
    auditCodes: [],
    unresolvedAuditCodes: []
  };
}

test('Retry nach Leaseverlust hinter fachlichem Commit reconciled passed ohne zweite Paid-Stage', async () => {
  const fixture = runnerFixture();
  const { dependencies, state } = runnerDependencies(fixture);
  let loseLease = false;
  dependencies.optimizationRepository.completeRevisionRevalidation = async (input) => {
    state.completeCalls.push(input);
    markFixtureRevalidationPassed(fixture, input.review);
    loseLease = true;
    return { id: 71 };
  };
  const firstInput = {
    claim: fixture.claim,
    run: { id: 97, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => {
      if (loseLease) {
        throw Object.assign(new Error('Lease verloren'), { code: 'CONTENT_JOB_LEASE_LOST' });
      }
      return true;
    }
  };

  await assert.rejects(
    runExistingPostRevisionRevalidationJob(firstInput, dependencies),
    { code: 'CONTENT_JOB_LEASE_LOST' }
  );
  loseLease = false;
  const resumed = await runExistingPostRevisionRevalidationJob({
    ...firstInput,
    leaseGuard: async () => true
  }, dependencies);

  assert.equal(resumed.status, 'completed');
  assert.equal(state.providerCalls, 1);
  assert.equal(state.budgetReservations, 1);
  assert.equal(state.stageWrites, 1);
  assert.equal(state.completeCalls.length, 1);
  assert.equal(state.finishCalls.length, 1);
});

test('Retry nach null oder Fehler von finishRun reconciled passed ohne zweite fachliche Persistenz', async () => {
  for (const firstFinish of ['null', 'throw']) {
    const fixture = runnerFixture();
    const { dependencies, state } = runnerDependencies(fixture);
    dependencies.optimizationRepository.completeRevisionRevalidation = async (input) => {
      state.completeCalls.push(input);
      markFixtureRevalidationPassed(fixture, input.review);
      return { id: 71 };
    };
    let finishAttempts = 0;
    dependencies.runRepository.finishRun = async (runId, input) => {
      finishAttempts += 1;
      state.finishCalls.push({ runId, input });
      if (finishAttempts === 1) {
        if (firstFinish === 'null') return null;
        throw new Error('Datenbank vorübergehend nicht erreichbar');
      }
      return { id: runId, status: input.status };
    };
    const input = {
      claim: fixture.claim,
      run: { id: 98, status: 'running' },
      runtimeSnapshot: fixture.runtimeSnapshot,
      leaseGuard: async () => true
    };

    await assert.rejects(
      runExistingPostRevisionRevalidationJob(input, dependencies),
      { code: 'CONTENT_RUN_FINISH_FAILED' }
    );
    const resumed = await runExistingPostRevisionRevalidationJob(input, dependencies);

    assert.equal(resumed.status, 'completed');
    assert.equal(state.providerCalls, 1);
    assert.equal(state.budgetReservations, 1);
    assert.equal(state.stageWrites, 1);
    assert.equal(state.completeCalls.length, 1);
    assert.equal(state.finishCalls.length, 2);
  }
});

test('Retry übernimmt exakt gebundenes failed als manuellen Zustand ohne Vorprüfung oder Paid-Stage', async () => {
  const fixture = runnerFixture();
  fixture.context.revision.optimization_report_json.revalidation = {
    status: 'failed',
    revisionVersion: 4,
    snapshotFingerprint: fixture.fingerprint,
    failureCode: 'CONTENT_REVISION_REVALIDATION_QUALITY_FAILED'
  };
  const { dependencies, state } = runnerDependencies(fixture);

  const result = await runExistingPostRevisionRevalidationJob({
    claim: fixture.claim,
    run: { id: 99, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  }, dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  assert.equal(state.providerCalls, 0);
  assert.equal(state.budgetReservations, 0);
  assert.equal(state.completeCalls.length, 0);
  assert.equal(state.failedCalls.length, 0);
  assert.equal(state.finishCalls.length, 1);
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

  const raced = await runExistingPostRevisionRevalidationJob(input, dependencies);
  const resumed = await runExistingPostRevisionRevalidationJob(input, dependencies);

  assert.equal(raced.status, 'needs_manual_attention');
  assert.equal(raced.code, 'CONTENT_REVISION_REVALIDATION_FENCE_LOST');
  assert.equal(resumed.status, 'needs_manual_attention');
  assert.equal(state.providerCalls, 1);
  assert.equal(state.completeCalls.length, 1);
  assert.equal(state.failedCalls.length, 0);
  assert.equal(state.finishCalls.length, 2);
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

test('Re-Audit blockiert fortbestehende ursprüngliche sowie neue Preis- und Jahresbefunde vor dem Provider', async () => {
  for (const scenario of [
    {
      original: [{ code: 'stale_year' }],
      content: '<section><h2>Planung</h2><p>Bestehender Inhalt für 2024.</p></section>'
    },
    {
      original: [],
      content: '<section><h2>Planung</h2><p>Bestehender Inhalt für 900 Euro.</p></section>'
    }
  ]) {
    const fixture = runnerFixture();
    fixture.context.audit.findings_json = scenario.original;
    fixture.context.post.content = scenario.content;
    fixture.context.revision.snapshot_json.fields.content = scenario.content;
    fixture.fingerprint = snapshotFingerprint(fixture.context.revision.snapshot_json);
    fixture.context.revision.optimization_report_json.revalidation.snapshotFingerprint = fixture.fingerprint;
    fixture.claim.payload_json.snapshot_fingerprint = fixture.fingerprint;
    const { dependencies, state } = runnerDependencies(fixture);

    const result = await runExistingPostRevisionRevalidationJob({
      claim: fixture.claim,
      run: { id: 95, status: 'running' },
      runtimeSnapshot: fixture.runtimeSnapshot,
      leaseGuard: async () => true
    }, dependencies);

    assert.equal(result.status, 'needs_manual_attention');
    assert.equal(state.providerCalls, 0);
    assert.equal(state.failedCalls[0].failureCode, 'CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  }
});

test('Re-Audit erlaubt einen neuen nichtblockierenden lokalen Hinweis', async () => {
  const fixture = runnerFixture();
  fixture.context.audit.findings_json = [];
  const { dependencies, state } = runnerDependencies(fixture);

  const result = await runExistingPostRevisionRevalidationJob({
    claim: fixture.claim,
    run: { id: 96, status: 'running' },
    runtimeSnapshot: fixture.runtimeSnapshot,
    leaseGuard: async () => true
  }, dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(state.providerCalls, 1);
  assert.deepEqual(state.completeCalls[0].unresolvedAuditCodes, []);
});
