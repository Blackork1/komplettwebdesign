import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOptimizationCandidate,
  runReviewIssueOptimizationJob,
  selectOptimizationIssues
} from '../services/contentAgent/reviewIssueOptimizationService.js';
import { buildLearningRuleSnapshot } from '../services/contentAgent/contentLearningSnapshotService.js';
import { buildFocusedRiskReport } from '../services/contentAgent/riskReportService.js';

const faq = Array.from({ length: 5 }, (_, index) => ({
  question: `Frage ${index + 1}?`,
  answer: `Antwort ${index + 1}.`
}));

function reviewIssue(index = 1) {
  return {
    code: `review_issue_${index}`,
    severity: 'warning',
    section: 'Relaunch planen',
    excerpt: 'Ein konkreter Absatz.',
    reason: `Mehrere Kontaktaufforderungen sind in Prüfhinweis ${index} inhaltlich ähnlich.`,
    instruction: `CTA aus Hinweis ${index} gezielt und passend zum Entscheidungsschritt formulieren.`,
    verificationType: 'none',
    sourceRequired: false,
    blocking: false,
    anchor: 'pruefung-relaunch-planen'
  };
}

function draft(overrides = {}) {
  return {
    post: {
      id: 19,
      title: 'Bestehender Titel',
      excerpt: 'Bestehende Kurzbeschreibung',
      slug: 'bestehender-entwurf',
      content: `<section><h2>Relaunch planen</h2><p>${'Alt '.repeat(1400)}</p></section>`,
      faq_json: faq,
      category: 'Webdesign',
      meta_title: 'Bestehender Meta Title',
      meta_description: 'Bestehende Meta Description',
      og_title: 'Bestehender OG-Titel',
      og_description: 'Bestehende OG-Beschreibung',
      image_alt: 'Bestehender Bild-Alt-Text',
      generated_by_ai: true,
      published: false,
      workflow_status: 'needs_review',
      review_version: 3,
      content_format: 'static_html',
      ...overrides
    },
    metadata: {
      primary_keyword: 'Website Relaunch',
      secondary_keywords: ['Webdesign Berlin'],
      search_intent: 'commercial',
      target_audience: 'Unternehmen in Berlin',
      content_cluster: 'Relaunch',
      business_goal: 'Anfragen',
      cta_type: 'contact',
      internal_links_json: ['/kontakt'],
      source_references_json: [],
      seo_brief_json: {
        imageIdea: {
          prompt: 'Professionelle Relaunch-Szene',
          altText: 'Professionelle Relaunch-Szene',
          filename: 'bestehender-entwurf.webp'
        }
      },
      quality_report_json: {
        risks: {},
        focusedReview: {
          blocked: false,
          items: [reviewIssue(1), reviewIssue(2)],
          riskFlags: [],
          sourceCount: 0
        }
      }
    }
  };
}

function repairedArticle(overrides = {}) {
  return {
    title: 'KI darf diesen Titel nicht übernehmen',
    shortDescription: 'KI darf diese Kurzbeschreibung nicht übernehmen',
    metaTitle: 'KI darf diesen Meta Title nicht übernehmen',
    metaDescription: 'KI darf diese Meta Description nicht übernehmen',
    ogTitle: 'KI darf diesen OG-Titel nicht übernehmen',
    ogDescription: 'KI darf diese OG-Beschreibung nicht übernehmen',
    slug: 'ki-slug-nicht-uebernehmen',
    contentHtml: `<section><h2>Relaunch planen</h2><p>${'Gezielt optimiert. '.repeat(380)}</p></section>`,
    faqJson: faq,
    category: 'SEO',
    imagePrompt: 'Nicht übernehmen',
    imageAlt: 'Nicht übernehmen',
    imageFilename: 'nicht-uebernehmen.webp',
    seo: {
      primaryKeyword: 'Anderes Keyword',
      secondaryKeywords: ['Anderes Nebenkeyword'],
      searchIntent: 'informational',
      targetAudience: 'Andere Zielgruppe',
      contentCluster: 'Andere Zuordnung'
    },
    lead: {
      businessGoal: 'Anderes Ziel',
      ctaType: 'other',
      ctaPositions: ['blog_early', 'blog_mid', 'blog_final']
    },
    sourceReferences: [],
    risk: {
      currentClaims: false,
      legalClaims: false,
      privacyClaims: false,
      softwareVersionClaims: false,
      staticPrices: false
    },
    qualitySelfCheck: {
      searchIntentFulfilled: true,
      noH1: true,
      noOuterBootstrapContainer: true,
      noInventedPricesOrServices: true,
      faqMatchesHtml: true,
      approvedLinksOnly: true
    },
    ...overrides
  };
}

function successfulReview(overrides = {}) {
  return {
    passed: true,
    score: 91,
    summary: 'Der konkrete Hinweis wurde behoben.',
    strengths: ['Die CTA-Formulierung ist jetzt spezifisch.'],
    issues: [],
    recommendedActions: [],
    requiresManualReview: false,
    risks: {
      currentClaims: false,
      legalClaims: false,
      privacyClaims: false,
      softwareVersionClaims: false,
      staticPrices: false
    },
    ...overrides
  };
}

function input(payload = {}) {
  return {
    claim: {
      id: 7,
      job_type: 'optimize_review_issues',
      payload_json: {
        source: 'admin_regeneration',
        post_id: 19,
        forced_mode: 'review',
        expected_review_version: 3,
        issue_mode: 'single',
        issue_index: 0,
        ...payload
      }
    },
    run: { id: 12 },
    runtimeSnapshot: {
      monthlyCostLimitEur: 25,
      contentStageReservationEur: 0.5,
      contentInputCostPerMtok: 2.5,
      contentOutputCostPerMtok: 15,
      timezone: 'Europe/Berlin'
    },
    leaseGuard: async () => true
  };
}

function dependencies(overrides = {}) {
  const calls = [];
  const reservations = [];
  const stageResults = {};
  const current = draft();
  const deps = {
    calls,
    reservations,
    optimizationRepository: {
      async getDraftWithMetadata() {
        calls.push(['load']);
        return structuredClone(current);
      },
      async getValidationContext() { return { existingSlugs: [], allowedInternalLinks: ['/kontakt'], sourceReferences: [] }; },
      async commitOptimization(payload) {
        calls.push(['commit', payload]);
        return { post: { ...current.post, content: payload.contentHtml, review_version: 4 } };
      },
      async reconcileOptimizationCommit() {
        return { state: 'not_committed', post: current.post, metadata: current.metadata };
      }
    },
    openaiService: {
      async repairArticle(payload) {
        calls.push(['repair', payload]);
        return { value: repairedArticle(), responseId: 'resp-repair', usage: {}, promptVersion: 'repair-v1' };
      },
      async reviewArticle(payload) {
        calls.push(['review', payload]);
        return { value: successfulReview(), responseId: 'resp-review', usage: {}, promptVersion: 'review-v1' };
      }
    },
    costService: {
      async getPersistedStageResult() { return null; },
      async reserveMonthlyBudget(payload) {
        reservations.push(payload);
        return { created: true, reservationMonth: '2026-07' };
      },
      async settleMonthlyBudget() {},
      async releaseMonthlyBudgetReservation() {},
      estimateTextCost() { return 0.02; }
    },
    runRepository: {
      async updateRunStage(runId, payload) {
        stageResults[payload.stageId] ??= structuredClone(payload.stageResult);
        return {
          id: runId,
          stage_results_json: structuredClone(stageResults)
        };
      },
      async finishRun(runId, payload) {
        calls.push(['finish', payload]);
        return { id: runId, ...payload };
      }
    },
    validateArticle(candidate) {
      calls.push(['validate', candidate]);
      return { passed: true, sanitizedHtml: candidate.contentHtml.replace('Gezielt', 'Sicher gezielt'), issues: [] };
    },
    buildFocusedRiskReport(payload) {
      calls.push(['focused-review', payload]);
      return { blocked: false, items: [], riskFlags: [], sourceCount: 0 };
    },
    ...overrides
  };
  return deps;
}

test('selektiert einzelne oder alle persistierten, nicht blockierenden Hinweise', () => {
  const current = draft();
  assert.deepEqual(selectOptimizationIssues(current, {
    expected_review_version: 3,
    issue_mode: 'single',
    issue_index: 0
  }), [current.metadata.quality_report_json.focusedReview.items[0]]);
  assert.deepEqual(selectOptimizationIssues(current, {
    expected_review_version: 3,
    issue_mode: 'all'
  }), current.metadata.quality_report_json.focusedReview.items);
});

test('Kandidat übernimmt ausschließlich repariertes HTML', () => {
  const current = draft();
  const candidate = buildOptimizationCandidate(current, repairedArticle());
  assert.equal(candidate.contentHtml, repairedArticle().contentHtml);
  assert.equal(candidate.metaTitle, current.post.meta_title);
  assert.equal(candidate.title, current.post.title);
  assert.equal(candidate.slug, current.post.slug);
  assert.deepEqual(candidate.faqJson, current.post.faq_json);
});

test('Selektionsvertrag lehnt stale, blockierte, leere und ungültige Anfragen ab', () => {
  assert.throws(() => selectOptimizationIssues(draft(), { expected_review_version: 2, issue_mode: 'all' }), /verändert/i);
  const blocked = draft();
  blocked.metadata.quality_report_json.focusedReview.blocked = true;
  assert.throws(() => selectOptimizationIssues(blocked, { expected_review_version: 3, issue_mode: 'all' }), /blockiert/i);
  const empty = draft();
  empty.metadata.quality_report_json.focusedReview.items = [];
  assert.throws(() => selectOptimizationIssues(empty, { expected_review_version: 3, issue_mode: 'all' }), /Hinweis/i);
  assert.throws(() => selectOptimizationIssues(draft(), { expected_review_version: 3, issue_mode: 'unknown' }), /Modus/i);
  assert.throws(() => selectOptimizationIssues(draft(), { expected_review_version: 3, issue_mode: 'single', issue_index: 9 }), /Index/i);
});

test('aktualisiert einen veralteten blockierten Prüfbericht vor der kostenpflichtigen Optimierung', async () => {
  const current = draft();
  current.metadata.quality_report_json = {
    ...successfulReview({
      issues: [{
        code: 'current-year-editorial-context',
        severity: 'warning',
        message: 'Der Jahresbezug sollte redaktionell klarer eingeordnet werden.',
        repairInstruction: 'Den Jahresbezug als redaktionelle Einordnung präzisieren.',
        blocking: false,
        sectionHeading: 'Relaunch planen',
        evidenceExcerpt: null,
        verificationType: 'source',
        sourceRequired: true,
        autoPublishBlocking: false
      }]
    }),
    focusedReview: {
      blocked: true,
      items: [{
        code: 'risk_current_claims',
        severity: 'warning',
        section: 'Gesamter Artikel',
        excerpt: null,
        reason: 'Der Artikel enthält zeitbezogene oder aktuelle Aussagen.',
        instruction: 'Aktualität und zeitbezogene Aussagen anhand aktueller Quellen prüfen.',
        verificationType: 'date',
        sourceRequired: true,
        blocking: true,
        anchor: 'pruefung-gesamter-artikel'
      }],
      riskFlags: ['currentClaims'],
      sourceCount: 0
    }
  };
  const deps = dependencies();
  deps.optimizationRepository.getDraftWithMetadata = async () => structuredClone(current);
  deps.buildFocusedRiskReport = buildFocusedRiskReport;

  const result = await runReviewIssueOptimizationJob(input({ issue_mode: 'all' }), deps);

  assert.equal(result.status, 'completed');
  assert.deepEqual(deps.reservations.map(({ stageId }) => stageId), [
    'optimize_review_issues:19:repair',
    'optimize_review_issues:19:review'
  ]);
  const repairCall = deps.calls.find(([name]) => name === 'repair');
  assert.deepEqual(repairCall[1].issues.map(({ code }) => code), [
    'current-year-editorial-context'
  ]);
});

test('führt Reparatur, deterministische Prüfung, Review und atomaren Commit aus', async () => {
  const deps = dependencies();
  let leaseCalls = 0;
  const result = await runReviewIssueOptimizationJob({
    ...input(),
    leaseGuard: async () => { leaseCalls += 1; }
  }, deps);

  assert.equal(result.status, 'completed');
  assert.ok(leaseCalls >= 4);
  assert.deepEqual(deps.reservations.map(({ stageId }) => stageId), [
    'optimize_review_issues:19:repair',
    'optimize_review_issues:19:review'
  ]);
  const repairCall = deps.calls.find(([name]) => name === 'repair');
  assert.equal(repairCall[1].issues.length, 1);
  const reviewCall = deps.calls.find(([name]) => name === 'review');
  assert.match(reviewCall[1].article.contentHtml, /Sicher gezielt/);
  const commitCall = deps.calls.find(([name]) => name === 'commit');
  assert.equal(commitCall[1].expectedReviewVersion, 3);
  assert.equal(commitCall[1].qualityScore, 91);
  assert.equal(commitCall[1].qualityReport.focusedReview.blocked, false);
  assert.equal(commitCall[1].commitKey, '12:optimize_review_issues:19');
});

test('reiht nach erfolgreichem Versionssprung einen nicht blockierenden Lernjob ein', async () => {
  const learningJobs = [];
  const deps = dependencies({
    async enqueueLearningObservationJob(payload) { learningJobs.push(payload); }
  });
  const result = await runReviewIssueOptimizationJob(input(), deps);
  assert.equal(result.status, 'completed');
  assert.deepEqual(learningJobs, [{ postId: 19, reviewVersion: 4 }]);

  const failing = dependencies({
    async enqueueLearningObservationJob() { throw new Error('Queue vorübergehend nicht verfügbar'); }
  });
  assert.equal((await runReviewIssueOptimizationJob(input(), failing)).status, 'completed');
});

test('gezielte Optimierung erhält nur Lernregeln der ausgewählten Hinweiskategorie', async () => {
  const deps = dependencies();
  const context = input();
  context.runtimeSnapshot.learningRuleSnapshot = buildLearningRuleSnapshot([
    {
      id: 4,
      version: 2,
      categoryKey: 'cta_repetition_or_fit',
      instruction: 'Formuliere jeden CTA passend zum konkreten Entscheidungsschritt und vermeide inhaltlich gleiche Kontaktaufforderungen.',
      targetStages: ['writer', 'reviewer']
    },
    {
      id: 5,
      version: 1,
      categoryKey: 'technical_precision',
      instruction: 'Erkläre technische Zusammenhänge so konkret, dass Unternehmer die nächste Entscheidung nachvollziehbar treffen können.',
      targetStages: ['writer', 'reviewer']
    }
  ]);
  assert.equal((await runReviewIssueOptimizationJob(context, deps)).status, 'completed');
  assert.deepEqual(
    deps.calls.find(([name]) => name === 'repair')[1].learningRules.map(({ id }) => id),
    [4]
  );
  assert.deepEqual(
    deps.calls.find(([name]) => name === 'review')[1].learningRules.map(({ id }) => id),
    [4]
  );
});

test('stoppt bei ungültigem reparierten Artikel vor Review und Commit', async () => {
  const deps = dependencies({
    validateArticle() { return { passed: false, sanitizedHtml: '', issues: [{ code: 'invalid_html' }] }; }
  });
  const result = await runReviewIssueOptimizationJob(input(), deps);
  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(deps.calls.some(([name]) => name === 'review'), false);
  assert.equal(deps.calls.some(([name]) => name === 'commit'), false);
});

test('speichert kein Ergebnis, wenn die redaktionelle Neuprüfung das Qualitäts-Gate verfehlt', async () => {
  for (const badReview of [
    successfulReview({ passed: false }),
    successfulReview({ score: 79 }),
    successfulReview({ requiresManualReview: true }),
    successfulReview({ risks: { ...successfulReview().risks, currentClaims: true } })
  ]) {
    const deps = dependencies({
      openaiService: {
        async repairArticle() { return { value: repairedArticle(), responseId: 'r1', usage: {}, promptVersion: 'v1' }; },
        async reviewArticle() { return { value: badReview, responseId: 'r2', usage: {}, promptVersion: 'v1' }; }
      }
    });
    const result = await runReviewIssueOptimizationJob(input(), deps);
    assert.equal(result.status, 'needs_manual_attention');
    assert.equal(deps.calls.some(([name]) => name === 'commit'), false);
  }
});

test('stoppt eine veraltete Reviewversion vor Budget und Provider', async () => {
  const deps = dependencies();
  const result = await runReviewIssueOptimizationJob(input({ expected_review_version: 2 }), deps);
  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(deps.reservations.length, 0);
  assert.equal(deps.calls.some(([name]) => name === 'repair'), false);
});

test('verwendet persistierte Providerergebnisse beim Retry ohne neue OpenAI-Aufrufe', async () => {
  const persisted = {
    'optimize_review_issues:19:repair': {
      value: repairedArticle(),
      responseId: 'persisted-repair',
      usage: {},
      promptVersion: 'repair-v1',
      reviewVersionBefore: 3,
      reservationMonth: '2026-07',
      actualCost: 0.02
    },
    'optimize_review_issues:19:review': {
      value: successfulReview(),
      responseId: 'persisted-review',
      usage: {},
      promptVersion: 'review-v1',
      reviewVersionBefore: 3,
      reservationMonth: '2026-07',
      actualCost: 0.02
    }
  };
  const deps = dependencies();
  deps.costService.getPersistedStageResult = async ({ stageId }) => persisted[stageId] || null;
  deps.openaiService.repairArticle = async () => { throw new Error('Darf nicht aufgerufen werden'); };
  deps.openaiService.reviewArticle = async () => { throw new Error('Darf nicht aufgerufen werden'); };

  const result = await runReviewIssueOptimizationJob(input(), deps);
  assert.equal(result.status, 'completed');
  assert.equal(deps.reservations.length, 0);
  assert.equal(deps.calls.some(([name]) => name === 'repair'), false);
  assert.equal(deps.calls.some(([name]) => name === 'review'), false);
});

test('führt eine offene, ungeklärte Providerreservierung nicht erneut aus', async () => {
  const deps = dependencies();
  deps.costService.reserveMonthlyBudget = async (payload) => {
    deps.reservations.push(payload);
    return { created: false, status: 'reserved', reservationMonth: '2026-07' };
  };
  const result = await runReviewIssueOptimizationJob(input(), deps);
  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_execution_uncertain');
  assert.equal(deps.calls.some(([name]) => name === 'repair'), false);
});

test('schließt einen bereits atomar committeden Retry ohne Provider oder zweiten Versionssprung ab', async () => {
  const committedDraft = draft({ review_version: 4 });
  const deps = dependencies({
    optimizationRepository: {
      async getDraftWithMetadata() { return committedDraft; },
      async getValidationContext() { assert.fail('nicht erwartet'); },
      async commitOptimization() { assert.fail('nicht erwartet'); },
      async reconcileOptimizationCommit(payload) {
        assert.equal(payload.commitKey, '12:optimize_review_issues:19');
        return { state: 'committed', post: committedDraft.post, metadata: committedDraft.metadata };
      }
    }
  });
  const result = await runReviewIssueOptimizationJob(input(), deps);
  assert.equal(result.status, 'completed');
  assert.equal(result.idempotent, true);
  assert.equal(deps.reservations.length, 0);
});
