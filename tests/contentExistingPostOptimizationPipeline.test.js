import test from 'node:test';
import assert from 'node:assert/strict';

import { liveHashForPost } from '../services/contentAgent/contentRevisionService.js';
import { runExistingPostOptimizationJob } from '../services/contentAgent/existingPostOptimizationPipeline.js';
import { auditExistingPost } from '../services/contentAgent/legacyAuditService.js';
import { createOpenAIContentService } from '../services/contentAgent/openaiContentService.js';
import {
  buildExistingPostTrustedContext,
  canonicalSha256
} from '../services/contentAgent/contentRuleManifest.js';

const validFaq = Array.from({ length: 5 }, (_, index) => ({
  question: `Frage ${index + 1}?`,
  answer: `Antwort ${index + 1}.`
}));

function originalHtml({ stale = false } = {}) {
  return [
    '<section>',
    '<h2>Planung</h2>',
    `<p>Alte Fassung.${stale ? ' Der beschriebene Stand stammt aus 2022.' : ''}</p>`,
    '<p>Der bestehende Ablauf bleibt erhalten.</p>',
    '<p><a href="/kontakt">Kontakt aufnehmen</a></p>',
    '</section>'
  ].join('');
}

function publishedPost(overrides = {}) {
  return {
    id: 19,
    published: true,
    workflow_status: 'published',
    slug: 'website-relaunch',
    content_format: 'static_html',
    title: 'Website-Relaunch planen',
    excerpt: 'Ein Website-Relaunch braucht einen klaren Ablauf.',
    content: originalHtml(),
    meta_title: 'Website-Relaunch sicher und strukturiert planen',
    meta_description: 'Website-Relaunch strukturiert planen und typische SEO-Risiken mit einem klaren Ablauf vermeiden.',
    og_title: 'Website-Relaunch sicher planen',
    og_description: 'Ein klarer Ablauf für die sichere Planung eines Website-Relaunchs.',
    faq_json: validFaq,
    image_url: '/uploads/website-relaunch.webp',
    image_alt: 'Planung eines Website-Relaunchs',
    published_at: '2025-01-10T09:00:00.000Z',
    updated_at: '2026-07-14T10:00:00.000Z',
    ...overrides
  };
}

function optimizedPost(post, overrides = {}) {
  return {
    title: 'Website-Relaunch sicher planen',
    shortDescription: post.excerpt,
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    ogTitle: post.og_title,
    ogDescription: post.og_description,
    contentHtml: post.content.replace('Alte Fassung.', 'Gezielt optimierte Fassung.'),
    faqJson: structuredClone(validFaq),
    imageAlt: post.image_alt,
    changeReasons: [{
      field: 'contentHtml',
      auditCodes: ['missing_internal_links'],
      reason: 'Die betroffene Passage wurde gezielt präzisiert.',
      sourceUrls: []
    }],
    ...overrides
  };
}

function reviewResult(overrides = {}) {
  return {
    passed: true,
    score: 92,
    summary: 'Die gezielte Überarbeitung ist redaktionell schlüssig.',
    strengths: ['Die bestehende Struktur bleibt erhalten.'],
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

function providerEnvelope(value, responseId, metadata = {}) {
  return {
    value,
    responseId,
    usage: { input_tokens: 12, output_tokens: 7 },
    promptVersion: 'test-v1',
    ...metadata
  };
}

function createJobInput(post, overrides = {}) {
  const existingPostTrustedContext = buildExistingPostTrustedContext({
    existingSlugs: [],
    metadata: null
  }, ['/kontakt']);
  return {
    claim: {
      id: 44,
      job_type: 'optimize_existing_post',
      payload_json: {
        source: 'admin_existing_content',
        post_id: post.id,
        admin_id: 7,
        base_live_hash: liveHashForPost(post)
      }
    },
    run: { id: 51, stage_results_json: {} },
    runtimeSnapshot: {
      timezone: 'Europe/Berlin',
      monthlyCostLimitEur: 25,
      contentStageReservationEur: 0.5,
      reviewStageReservationEur: 0.2,
      contentInputCostPerMtok: 1,
      contentOutputCostPerMtok: 2,
      reviewInputCostPerMtok: 1,
      reviewOutputCostPerMtok: 2,
      webSearchCostPerCallEur: 0.01,
      allowedInternalLinks: ['/kontakt'],
      existingPostTrustedContext,
      existingPostTrustedContextHash: canonicalSha256(existingPostTrustedContext)
    },
    leaseGuard: async () => true,
    ...overrides
  };
}

function createSuccessfulDependencies({
  post = publishedPost(),
  optimizationResults = [optimizedPost(post)],
  reviewResults = [reviewResult()],
  researchSources = [],
  gscSignals = [],
  validationResults = [],
  gscError = null,
  revisionError = null,
  trustedContext = {},
  webSearchCallCount = 0,
  budgetLimitStageId = null,
  auditPersistenceResult = undefined,
  revisionResult = undefined
} = {}) {
  const persistedStages = new Map();
  const calls = {
    stages: [],
    stageIds: [],
    finishes: [],
    warnings: [],
    leases: 0,
    research: 0,
    liveSnapshots: 0,
    trustedContexts: 0,
    audits: 0,
    auditWrites: 0,
    gsc: 0,
    optimization: 0,
    optimizationInputs: [],
    review: 0,
    reviewInputs: [],
    validation: 0,
    validationContexts: [],
    revisions: [],
    liveWrites: 0,
    reservations: [],
    settlements: []
  };
  const optimizationQueue = optimizationResults.map((value) => structuredClone(value));
  const reviewQueue = reviewResults.map((value) => structuredClone(value));
  const validationQueue = validationResults.map((value) => structuredClone(value));

  const dependencies = {
    calls,
    persistedStages,
    optimizationRepository: {
      async getPublishedPostSnapshot() {
        calls.liveSnapshots += 1;
        return structuredClone(post);
      },
      async getTrustedContext() {
        calls.trustedContexts += 1;
        return {
          existingSlugs: [],
          allowedInternalLinks: ['/vom-repository'],
          metadata: null,
          activeLearningRules: [],
          ...structuredClone(trustedContext)
        };
      },
      async createOptimizedRevision(input) {
        calls.revisions.push(structuredClone(input));
        if (revisionError) throw revisionError;
        return revisionResult === undefined
          ? { id: 71, post_id: post.id, status: 'draft' }
          : structuredClone(revisionResult);
      },
      async updatePublishedPost() {
        calls.liveWrites += 1;
        throw new Error('Live-Schreibzugriff ist nicht erlaubt.');
      }
    },
    auditRepository: {
      async createAuditIdempotent(input) {
        calls.auditWrites += 1;
        if (auditPersistenceResult !== undefined) return structuredClone(auditPersistenceResult);
        return { id: 31, post_id: post.id, score: input.score, findings_json: input.findings };
      }
    },
    searchMetricsRepository: {
      async getPageSignals() {
        calls.gsc += 1;
        if (gscError) throw gscError;
        return structuredClone(gscSignals);
      }
    },
    openaiService: {
      async researchExistingPostSources() {
        calls.research += 1;
        return providerEnvelope(
          structuredClone(researchSources),
          `resp_research_${calls.research}`,
          { webSearchCallCount }
        );
      },
      async optimizeExistingPost(input) {
        calls.optimization += 1;
        calls.optimizationInputs.push(structuredClone(input));
        const value = optimizationQueue.shift() ?? optimizationResults.at(-1);
        return providerEnvelope(structuredClone(value), `resp_opt_${calls.optimization}`);
      },
      async reviewArticle(input) {
        calls.review += 1;
        calls.reviewInputs.push(structuredClone(input));
        const value = reviewQueue.shift() ?? reviewResults.at(-1);
        return providerEnvelope(structuredClone(value), `resp_review_${calls.review}`);
      }
    },
    costService: {
      async getPersistedStageResult({ stageId }) {
        return persistedStages.get(stageId) ?? null;
      },
      async reserveMonthlyBudget(input) {
        calls.reservations.push(structuredClone(input));
        if (input.stageId === budgetLimitStageId) {
          throw Object.assign(new Error('Monatsbudget ausgeschöpft'), {
            code: 'CONTENT_BUDGET_LIMIT_REACHED'
          });
        }
        return { created: true, status: 'reserved', reservationMonth: '2026-07' };
      },
      async settleMonthlyBudget(input) {
        calls.settlements.push(structuredClone(input));
        return { status: 'settled' };
      },
      async releaseMonthlyBudgetReservation() { return { released: true }; },
      estimateTextCost() { return 0.01; }
    },
    runRepository: {
      async updateRunStage(runId, input) {
        calls.stages.push(input.currentStage);
        calls.stageIds.push(input.stageId);
        persistedStages.set(input.stageId, structuredClone(input.stageResult));
        return {
          id: runId,
          current_stage: input.currentStage,
          stage_results_json: Object.fromEntries(
            [...persistedStages].map(([stageId, value]) => [stageId, structuredClone(value)])
          )
        };
      },
      async finishRun(runId, input) {
        calls.finishes.push({ runId, ...structuredClone(input) });
        return { id: runId, ...input };
      }
    },
    async validateArticle(article, context) {
      calls.validation += 1;
      calls.validationContexts.push(structuredClone(context));
      return validationQueue.shift() ?? {
        passed: true,
        sanitizedHtml: article.contentHtml,
        issues: []
      };
    },
    auditExistingPost(input) {
      calls.audits += 1;
      return auditExistingPost(input);
    },
    recordAuditWarning(error, code) {
      calls.warnings.push({ code, message: error.message });
    },
    async recordProviderResult() {}
  };
  return dependencies;
}

test('statischer Artikel wird in fester Reihenfolge geprüft und ausschließlich als Draft-Revision gespeichert', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({ post });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.deepEqual(result, { status: 'completed', revisionId: 71, postId: 19 });
  assert.deepEqual(dependencies.calls.stages, [
    'live_snapshot',
    'existing_content_audit',
    'gsc_page_signals',
    'freshness_classification',
    'targeted_optimization',
    'existing_post_diff',
    'targeted_scope_validation',
    'article_validation',
    'editorial_review',
    'revision_creation'
  ]);
  assert.equal(dependencies.calls.revisions.length, 1);
  assert.equal(dependencies.calls.revisions[0].snapshot.fields.content.includes('Gezielt optimierte Fassung.'), true);
  assert.equal(dependencies.calls.revisions[0].snapshot.fields.image_url, post.image_url);
  assert.equal(dependencies.calls.revisions[0].snapshot.base.slug, post.slug);
  assert.equal(dependencies.calls.revisions[0].snapshot.base.content_format, post.content_format);
  assert.equal(dependencies.calls.liveWrites, 0);
  assert.equal(dependencies.calls.finishes.at(-1).status, 'completed');
});

test('Performanceoptimierung nutzt nur aktuelle begrenzte Evidenz und speichert ausschließlich eine Draft-Revision', async () => {
  const post = publishedPost();
  const evidenceHash = 'a'.repeat(64);
  const input = createJobInput(post);
  input.claim.payload_json = {
    source: 'article_performance',
    post_id: post.id,
    admin_id: 7,
    base_live_hash: liveHashForPost(post),
    snapshot_id: 91,
    evidence_hash: evidenceHash,
    diagnosis_codes: ['snippet_or_intent_opportunity']
  };
  const dependencies = createSuccessfulDependencies({ post });
  dependencies.performanceRepository = {
    async getLatestSnapshot(postId) {
      assert.equal(postId, post.id);
      return {
        id: 91,
        post_id: post.id,
        evidence_hash: evidenceHash,
        data_eligible: true,
        status: 'opportunity',
        diagnoses_json: [{ code: 'snippet_or_intent_opportunity' }],
        windows_json: { 28: { impressions: 70, clicks: 0, ctr: 0, averagePosition: 12, queries: Array.from({ length: 12 }, (_, index) => ({ query: `Query ${index}`, impressions: 10, clicks: 0, ctr: 0, averagePosition: 12 })) } },
        cohort_json: { available: true, source: 'cluster', size: 4, medianImpressions: 90 }
      };
    }
  };

  const result = await runExistingPostOptimizationJob(input, dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(dependencies.calls.liveWrites, 0);
  assert.equal(dependencies.calls.revisions[0].status, undefined);
  assert.equal(dependencies.calls.optimizationInputs[0].performanceEvidence.queries.length, 10);
  assert.deepEqual(dependencies.calls.optimizationInputs[0].performanceEvidence.diagnosisCodes, ['snippet_or_intent_opportunity']);
  assert.equal(dependencies.calls.revisions[0].report.performanceEvidence.evidenceHash, undefined);
});

test('GSC-Ausfall wird protokolliert und blockiert die Optimierung nicht', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({
    post,
    gscError: new Error('GSC nicht verfügbar')
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'completed');
  assert.deepEqual(dependencies.calls.warnings, [{
    code: 'GSC_PAGE_SIGNALS_UNAVAILABLE',
    message: 'GSC nicht verfügbar'
  }]);
});

test('begrenzte GSC-Seitensignale werden für die spätere Vergleichsansicht im Bericht gespeichert', async () => {
  const post = publishedPost();
  const gscSignals = [{
    query: 'website relaunch planen', clicks: 4, impressions: 120,
    ctr: 0.0333, average_position: 7.5
  }];
  const dependencies = createSuccessfulDependencies({ post, gscSignals });

  await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.deepEqual(dependencies.calls.revisions[0].report.gscSignals, gscSignals);
});

test('GSC-Seitensignale werden vor Stage, Providerinput und Bericht streng minimiert', async () => {
  const post = publishedPost();
  const gscSignals = [
    {
      query: `  ${'Website-Relaunch '.repeat(20)}  `,
      clicks: 4,
      impressions: 120,
      ctr: 0.0333,
      average_position: 7.5,
      start_date: '2026-06-16',
      end_date: '2026-07-13',
      privateDimension: 'darf nicht persistiert werden'
    },
    {
      query: 'Negative Werte', clicks: -1, impressions: 10,
      ctr: 0.1, average_position: 3
    },
    {
      query: 'Unendliche Werte', clicks: 1, impressions: Number.POSITIVE_INFINITY,
      ctr: 0.1, average_position: 3
    },
    {
      query: 'NaN-Werte', clicks: 1, impressions: 10,
      ctr: Number.NaN, average_position: 3
    },
    {
      query: 'Ungültiges Datum', clicks: 1, impressions: 10,
      ctr: 0.1, average_position: 3, start_date: '2026-02-30'
    },
    ...Array.from({ length: 14 }, (_, index) => ({
      query: `gültige Suchanfrage ${index + 1}`,
      clicks: index,
      impressions: index * 10,
      ctr: 0.1,
      average_position: index + 1,
      unexpected: { raw: true }
    }))
  ];
  const dependencies = createSuccessfulDependencies({ post, gscSignals });

  await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  const staged = dependencies.persistedStages.get('gsc_page_signals').signals;
  const providerInput = dependencies.calls.optimizationInputs[0].gscSignals;
  const reported = dependencies.calls.revisions[0].report.gscSignals;
  assert.equal(staged.length, 10);
  assert.deepEqual(providerInput, staged);
  assert.deepEqual(reported, staged);
  assert.equal(staged[0].query.length, 180);
  assert.deepEqual(Object.keys(staged[0]).sort(), [
    'average_position', 'clicks', 'ctr', 'end_date', 'impressions', 'query', 'start_date'
  ]);
  assert.equal(staged.some(({ query }) => /Negative|Unendliche|NaN|Ungültiges Datum/.test(query)), false);
  assert.equal(JSON.stringify(staged).includes('privateDimension'), false);
  assert.equal(JSON.stringify(staged).includes('unexpected'), false);
  assert.equal(staged.every((signal) => [
    signal.clicks, signal.impressions, signal.ctr, signal.average_position
  ].every((value) => Number.isFinite(value) && value >= 0)), true);
});

test('Webrecherche läuft ausschließlich bei Freshness-Bedarf und stoppt bei null oder einer Quelle manuell', async (t) => {
  for (const sourceCount of [0, 1]) {
    await t.test(`${sourceCount} belastbare Quellen`, async () => {
      const post = publishedPost({ content: originalHtml({ stale: true }) });
      const researchSources = Array.from({ length: sourceCount }, (_, index) => ({
        title: `Quelle ${index + 1}`,
        url: `https://example.com/quelle-${index + 1}`
      }));
      const dependencies = createSuccessfulDependencies({ post, researchSources });

      const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

      assert.equal(result.status, 'needs_manual_attention');
      assert.equal(result.code, 'insufficient_existing_post_sources');
      assert.equal(dependencies.calls.research, 1);
      assert.equal(dependencies.calls.optimization, 0);
      assert.equal(dependencies.calls.revisions.length, 0);
    });
  }

  const freshPost = publishedPost();
  const freshDependencies = createSuccessfulDependencies({ post: freshPost });
  await runExistingPostOptimizationJob(createJobInput(freshPost), freshDependencies);
  assert.equal(freshDependencies.calls.research, 0);
});

test('Web-Suchaufrufe werden mit dem streng validierten Snapshotpreis abgerechnet', async () => {
  const post = publishedPost({ content: originalHtml({ stale: true }) });
  const dependencies = createSuccessfulDependencies({
    post,
    researchSources: [
      { title: 'Primärquelle A', url: 'https://example.com/a' },
      { title: 'Primärquelle B', url: 'https://example.com/b' }
    ],
    webSearchCallCount: 3
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'completed');
  assert.deepEqual(
    dependencies.calls.settlements.find(({ stageId }) => stageId === 'source_research'),
    {
      runId: 51,
      stageId: 'source_research',
      reservationMonth: '2026-07',
      actualCost: 0.04
    }
  );
});

test('Web-Suchpreis akzeptiert keine implizit konvertierten oder negativen Snapshotwerte', async () => {
  const post = publishedPost();
  for (const webSearchCostPerCallEur of ['0.01', -0.01, Number.NaN]) {
    const dependencies = createSuccessfulDependencies({ post });
    const runtimeSnapshot = {
      ...createJobInput(post).runtimeSnapshot,
      webSearchCostPerCallEur
    };

    await assert.rejects(
      runExistingPostOptimizationJob(
        createJobInput(post, { runtimeSnapshot }),
        dependencies
      ),
      { code: 'CONTENT_EXISTING_OPTIMIZATION_INPUT_INVALID' }
    );
    assert.equal(dependencies.calls.optimization, 0);
  }
});

test('Budgetlimit beendet Recherche, Optimierung und Review jeweils genau einmal manuell', async (t) => {
  const cases = [
    {
      name: 'Recherche',
      stageId: 'source_research',
      post: publishedPost({ content: originalHtml({ stale: true }) })
    },
    { name: 'Optimierung', stageId: 'targeted_optimization', post: publishedPost() },
    { name: 'Review', stageId: 'editorial_review', post: publishedPost() }
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const dependencies = createSuccessfulDependencies({
        post: scenario.post,
        budgetLimitStageId: scenario.stageId,
        researchSources: [
          { title: 'Primärquelle A', url: 'https://example.com/a' },
          { title: 'Primärquelle B', url: 'https://example.com/b' }
        ]
      });

      const result = await runExistingPostOptimizationJob(
        createJobInput(scenario.post),
        dependencies
      );

      assert.equal(result.status, 'needs_manual_attention');
      assert.equal(result.code, 'CONTENT_BUDGET_LIMIT_REACHED');
      assert.equal(dependencies.calls.finishes.length, 1);
      assert.equal(dependencies.calls.finishes[0].status, 'needs_manual_attention');
      assert.equal(dependencies.calls.revisions.length, 0);
    });
  }
});

test('Wiederaufnahme verwendet alle versiongebundenen Stage-Ergebnisse trotz mutierter Fakes', async () => {
  const post = publishedPost({ content: originalHtml({ stale: true }) });
  const firstReview = reviewResult({
    passed: false,
    score: 70,
    requiresManualReview: true,
    issues: [{
      code: 'current_claim_unclear',
      severity: 'error',
      message: 'Die Jahresangabe ist nicht eindeutig belegt.',
      repairInstruction: 'Präzisiere die belegte Jahresangabe.',
      blocking: true,
      sectionHeading: 'Planung',
      evidenceExcerpt: 'Stand stammt aus 2022.',
      verificationType: 'date',
      sourceRequired: true,
      autoPublishBlocking: true
    }]
  });
  const dependencies = createSuccessfulDependencies({
    post,
    researchSources: [
      { title: 'Primärquelle A', url: 'https://example.com/a' },
      { title: 'Primärquelle B', url: 'https://example.com/b' }
    ],
    optimizationResults: [optimizedPost(post), optimizedPost(post, {
      metaTitle: 'Website-Relaunch 2026 sicher planen'
    })],
    reviewResults: [firstReview, reviewResult()]
  });
  const input = createJobInput(post);
  dependencies.revisionService = {
    async createOptimizedRevision() {
      return { id: 71, post_id: post.id, status: 'draft' };
    }
  };

  assert.equal((await runExistingPostOptimizationJob(input, dependencies)).status, 'completed');
  assert.deepEqual({
    research: dependencies.calls.research,
    optimization: dependencies.calls.optimization,
    review: dependencies.calls.review
  }, { research: 1, optimization: 2, review: 2 });

  const firstNonPaidCalls = {
    liveSnapshots: dependencies.calls.liveSnapshots,
    audits: dependencies.calls.audits,
    auditWrites: dependencies.calls.auditWrites,
    gsc: dependencies.calls.gsc,
    validation: dependencies.calls.validation
  };
  dependencies.optimizationRepository.getPublishedPostSnapshot = async () => {
    throw new Error('Der mutierte Live-Fake darf bei Recovery nicht aufgerufen werden.');
  };
  dependencies.auditExistingPost = () => {
    throw new Error('Der mutierte Audit-Fake darf bei Recovery nicht aufgerufen werden.');
  };
  dependencies.auditRepository.createAuditIdempotent = async () => {
    throw new Error('Der mutierte Audit-Repository-Fake darf bei Recovery nicht aufgerufen werden.');
  };
  dependencies.searchMetricsRepository.getPageSignals = async () => {
    throw new Error('Der mutierte GSC-Fake darf bei Recovery nicht aufgerufen werden.');
  };
  dependencies.validateArticle = async () => {
    throw new Error('Der mutierte Validator-Fake darf bei Recovery nicht aufgerufen werden.');
  };

  assert.equal((await runExistingPostOptimizationJob(input, dependencies)).status, 'completed');
  assert.deepEqual({
    research: dependencies.calls.research,
    optimization: dependencies.calls.optimization,
    review: dependencies.calls.review
  }, { research: 1, optimization: 2, review: 2 });
  assert.deepEqual({
    liveSnapshots: dependencies.calls.liveSnapshots,
    audits: dependencies.calls.audits,
    auditWrites: dependencies.calls.auditWrites,
    gsc: dependencies.calls.gsc,
    validation: dependencies.calls.validation
  }, firstNonPaidCalls);
  for (const stageId of [
    'live_snapshot',
    'existing_content_audit',
    'gsc_page_signals',
    'freshness_classification',
    'existing_post_diff',
    'targeted_scope_validation',
    'article_validation',
    'existing_post_diff:repair',
    'targeted_scope_validation:repair',
    'article_validation:repair'
  ]) {
    assert.equal(
      dependencies.calls.stageIds.filter((value) => value === stageId).length,
      1,
      `${stageId} darf bei Recovery nicht überschrieben werden`
    );
  }
  assert.equal(dependencies.calls.reservations.length, 5);
});

test('Wiederaufnahme überschreibt kein ungültiges oder versionsfremdes Stage-Ergebnis', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({ post });
  const input = createJobInput(post);

  assert.equal((await runExistingPostOptimizationJob(input, dependencies)).status, 'completed');
  dependencies.persistedStages.get('gsc_page_signals').baseLiveHash = 'b'.repeat(64);
  const gscWrites = dependencies.calls.stageIds
    .filter((stageId) => stageId === 'gsc_page_signals').length;

  const result = await runExistingPostOptimizationJob(input, dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'persisted_stage_result_invalid');
  assert.equal(
    dependencies.calls.stageIds.filter((stageId) => stageId === 'gsc_page_signals').length,
    gscWrites
  );
  assert.equal(dependencies.calls.optimization, 1);
});

test('Wiederaufnahme verwendet auch aus älteren GSC-Stages nur die kanonisch minimierte Form', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({ post });
  const input = createJobInput(post);
  assert.equal((await runExistingPostOptimizationJob(input, dependencies)).status, 'completed');
  const gscCalls = dependencies.calls.gsc;
  const optimizationCalls = dependencies.calls.optimization;
  dependencies.persistedStages.get('gsc_page_signals').signals = [
    {
      query: 'x'.repeat(500), clicks: 2, impressions: 20, ctr: 0.1,
      average_position: 4, start_date: '2026-06-01', end_date: '2026-06-30',
      providerPayload: { secret: true }
    },
    {
      query: 'Negativer Resume-Wert', clicks: -2, impressions: 20,
      ctr: 0.1, average_position: 4
    },
    ...Array.from({ length: 12 }, (_, index) => ({
      query: `Resume ${index + 1}`, clicks: index, impressions: index + 10,
      ctr: 0.1, average_position: index + 1, rawRank: index
    }))
  ];

  const result = await runExistingPostOptimizationJob(input, dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(dependencies.calls.gsc, gscCalls);
  assert.equal(dependencies.calls.optimization, optimizationCalls);
  const reported = dependencies.calls.revisions.at(-1).report.gscSignals;
  assert.equal(reported.length, 10);
  assert.equal(reported[0].query.length, 180);
  assert.equal(reported.some(({ query }) => query === 'Negativer Resume-Wert'), false);
  assert.equal(JSON.stringify(reported).includes('providerPayload'), false);
  assert.equal(JSON.stringify(reported).includes('rawRank'), false);
});

test('Wiederaufnahme verwirft semantisch manipulierte Diff-, Scope- und Validatorergebnisse', async (t) => {
  const scenarios = [
    {
      name: 'Diff',
      stageId: 'existing_post_diff',
      mutate(value) { value.changes[0].before = 'Manipulierter Ausgangswert'; }
    },
    {
      name: 'Scope',
      stageId: 'targeted_scope_validation',
      mutate(value) {
        value.passed = true;
        value.code = null;
        value.changedBlockRatio = 0.9;
      }
    },
    {
      name: 'Validator',
      stageId: 'article_validation',
      mutate(value) {
        value.passed = true;
        value.issues = [{ code: 'unsafe_html', message: 'HTML ist nicht freigegeben.' }];
      }
    }
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const post = publishedPost();
      const dependencies = createSuccessfulDependencies({ post });
      const input = createJobInput(post);
      assert.equal((await runExistingPostOptimizationJob(input, dependencies)).status, 'completed');
      const revisionCount = dependencies.calls.revisions.length;
      scenario.mutate(dependencies.persistedStages.get(scenario.stageId));

      const result = await runExistingPostOptimizationJob(input, dependencies);

      assert.equal(result.status, 'needs_manual_attention');
      assert.equal(result.code, 'persisted_stage_result_invalid');
      assert.equal(dependencies.calls.revisions.length, revisionCount);
      assert.equal(dependencies.calls.optimization, 1);
    });
  }
});

test('Leaseverlust beendet den Lauf vor Provider- und Revisionszugriff', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({ post });
  const leaseError = Object.assign(new Error('Lease verloren'), { code: 'CONTENT_JOB_LEASE_LOST' });

  await assert.rejects(
    runExistingPostOptimizationJob(createJobInput(post, {
      leaseGuard: async () => { throw leaseError; }
    }), dependencies),
    (error) => error === leaseError
  );
  assert.equal(dependencies.calls.optimization, 0);
  assert.equal(dependencies.calls.revisions.length, 0);
});

test('Legacy-EJS-Inhaltsänderung endet als dauerhafter Fehler mit Runabschluss', async () => {
  const post = publishedPost({
    content_format: 'legacy_ejs',
    content: '<p><%= post.title %></p>\n'
  });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [optimizedPost(post, { contentHtml: '<p>Geänderter Legacy-Inhalt</p>' })]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'failed');
  assert.equal(result.code, 'LEGACY_EJS_CONTENT_CHANGE_FORBIDDEN');
  assert.equal(dependencies.calls.finishes.length, 1);
  assert.equal(dependencies.calls.finishes[0].status, 'failed');
  assert.equal(dependencies.calls.revisions.length, 0);
  assert.equal(dependencies.calls.liveWrites, 0);
});

test('falsch klassifiziertes Legacy-HTML ohne EJS wird validiert und als geschützte Revision angelegt', async () => {
  const post = publishedPost({
    content_format: 'legacy_ejs',
    content: originalHtml()
  });
  const optimizedContent = post.content.replace('Alte Fassung.', 'Gezielt reparierte Fassung.');
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [optimizedPost(post, { contentHtml: optimizedContent })],
    validationResults: [{ passed: true, sanitizedHtml: optimizedContent, issues: [] }]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(dependencies.calls.validation, 2);
  assert.equal(dependencies.calls.revisions.length, 1);
  assert.equal(dependencies.calls.revisions[0].snapshot.fields.content, optimizedContent);
  assert.equal(dependencies.calls.liveWrites, 0);
});

test('Legacy-EJS wird aus der Provider-Ausgabe ausgeschlossen, serverseitig ergänzt und unverändert in die Revision übernommen', async () => {
  const originalContent = '<p><%= post.title %></p>\n';
  const post = publishedPost({
    content_format: 'legacy_ejs',
    content: originalContent
  });
  const providerValue = optimizedPost(post, {
    changeReasons: [{
      field: 'metaTitle',
      auditCodes: ['missing_meta_title'],
      reason: 'Der Meta-Titel wurde anhand des Auditbefunds konkretisiert.',
      sourceUrls: []
    }]
  });
  delete providerValue.contentHtml;
  const providerRequests = [];
  const dependencies = createSuccessfulDependencies({ post });
  const openaiService = createOpenAIContentService({
    config: {
      contentModel: 'gpt-test-content',
      reviewModel: 'gpt-test-review'
    },
    client: {
      responses: {
        async create(request) {
          providerRequests.push(request);
          return {
            id: 'resp-legacy-completed',
            status: 'completed',
            output: [{
              type: 'message',
              content: [{ type: 'output_text', text: JSON.stringify(providerValue) }]
            }],
            usage: { input_tokens: 120, output_tokens: 40 }
          };
        }
      }
    }
  });
  dependencies.openaiService.optimizeExistingPost = openaiService.optimizeExistingPost;
  dependencies.costService.estimateTextCost = ({ usage }) => {
    return usage.input_tokens === 120 && usage.output_tokens === 40 ? 0.037 : 0.01;
  };

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(providerRequests.length, 1);
  assert.equal(
    Object.hasOwn(providerRequests[0].text.format.schema.properties, 'contentHtml'),
    false
  );
  assert.equal(dependencies.calls.finishes.length, 1);
  assert.equal(dependencies.calls.finishes[0].status, 'completed');
  assert.equal(dependencies.calls.revisions.length, 1);
  assert.equal(dependencies.calls.revisions[0].snapshot.fields.content, originalContent);
  assert.equal(dependencies.calls.liveWrites, 0);
  assert.deepEqual(
    dependencies.calls.settlements.find(({ stageId }) => stageId === 'targeted_optimization'),
    {
      runId: 51,
      stageId: 'targeted_optimization',
      reservationMonth: '2026-07',
      actualCost: 0.037
    }
  );
  assert.deepEqual(dependencies.persistedStages.get('targeted_optimization'), {
    value: {
      ...providerValue,
      contentHtml: originalContent
    },
    responseId: 'resp-legacy-completed',
    usage: { input_tokens: 120, output_tokens: 40 },
    promptVersion: '2026-07-15.3',
    baseLiveHash: liveHashForPost(post),
    reservationMonth: '2026-07',
    actualCost: 0.037
  });
});

test('deterministisch zu großer Diff-Eingang endet ohne Worker-Wiederholungen als failed', async () => {
  const content = Array.from({ length: 2_001 }, () => '<p>Unveränderter Block</p>').join('');
  const post = publishedPost({ content });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [optimizedPost(post, { contentHtml: content })]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'failed');
  assert.equal(result.code, 'EXISTING_POST_DIFF_INPUT_INVALID');
  assert.equal(dependencies.calls.finishes.length, 1);
  assert.equal(dependencies.calls.review, 0);
  assert.equal(dependencies.calls.revisions.length, 0);
});

test('Scopeüberschreitung erhält genau eine erfolgreiche Reparatur mit serverseitiger Neuprüfung', async () => {
  const post = publishedPost();
  const excessive = optimizedPost(post, {
    contentHtml: '<section><h2>Komplett neu</h2><p>Vollständig anderer erster Absatz.</p><p>Vollständig anderer zweiter Absatz.</p><p>Vollständig anderer dritter Absatz.</p></section>'
  });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [excessive, optimizedPost(post)]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(dependencies.calls.optimization, 2);
  assert.equal(dependencies.calls.stages.includes('repair'), true);
  assert.equal(dependencies.calls.stageIds.includes('targeted_scope_validation:repair'), true);
  assert.equal(dependencies.calls.revisions.length, 1);
});

test('strukturelle Wrapperänderung wird gezielt repariert und als eigener Befund erklärt', async () => {
  const post = publishedPost();
  const withoutSectionWrapper = optimizedPost(post, {
    contentHtml: optimizedPost(post).contentHtml
      .replace(/^<section>/, '')
      .replace(/<\/section>$/, '')
  });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [withoutSectionWrapper, optimizedPost(post)]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(dependencies.calls.optimization, 2);
  assert.deepEqual(dependencies.calls.optimizationInputs[1].audit.findings.at(-1), {
    code: 'html_structure_changed',
    severity: 'error',
    field: 'contentHtml',
    message: 'Die bestehende HTML-Wrapperstruktur oder die Zuordnung eines Inhaltsblocks wurde verändert.'
  });
});

test('zweite Scopeüberschreitung endet fail-closed ohne weitere Reparatur', async () => {
  const post = publishedPost();
  const excessive = optimizedPost(post, {
    contentHtml: '<section><h2>Komplett neu</h2><p>Alles wurde ersetzt.</p><p>Auch dieser Teil ist neu.</p><p>Und dieser ebenfalls.</p></section>'
  });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [excessive, excessive]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(dependencies.calls.optimization, 2);
  assert.equal(dependencies.calls.revisions.length, 0);
});

test('Validatorfehler wird einmal repariert und vor Review und Revision erneut geprüft', async () => {
  const post = publishedPost();
  const invalid = {
    passed: false,
    sanitizedHtml: optimizedPost(post).contentHtml,
    issues: [{ code: 'unsafe_html', message: 'HTML ist nicht freigegeben.' }]
  };
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [optimizedPost(post), optimizedPost(post, { title: 'Website-Relaunch kontrolliert planen' })],
    validationResults: [invalid]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(dependencies.calls.optimization, 2);
  assert.equal(dependencies.calls.validation >= 3, true);
  assert.equal(dependencies.calls.review, 1);
  assert.equal(dependencies.calls.revisions.length, 1);
});

test('Reviewfehler löst höchstens eine Reparatur aus und bleibt danach terminal', async () => {
  const post = publishedPost();
  const failedReview = reviewResult({
    passed: false,
    score: 60,
    requiresManualReview: true,
    issues: [{
      code: 'editorial_gap',
      severity: 'error',
      message: 'Der redaktionelle Nutzen ist nicht ausreichend.',
      repairInstruction: 'Präzisiere den Nutzen.',
      blocking: true,
      sectionHeading: 'Planung',
      evidenceExcerpt: 'Gezielt optimierte Fassung.',
      verificationType: 'none',
      sourceRequired: false,
      autoPublishBlocking: true
    }]
  });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [optimizedPost(post), optimizedPost(post, { title: 'Website-Relaunch kontrolliert planen' })],
    reviewResults: [failedReview, failedReview]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(dependencies.calls.optimization, 2);
  assert.equal(dependencies.calls.review, 2);
  assert.equal(dependencies.calls.revisions.length, 0);
  assert.deepEqual(
    dependencies.calls.optimizationInputs[1].audit.findings.at(-1),
    {
      code: 'editorial_gap',
      severity: 'error',
      message: 'Der redaktionelle Nutzen ist nicht ausreichend.',
      field: 'contentHtml',
      evidence: 'Gezielt optimierte Fassung.',
      repairInstruction: 'Präzisiere den Nutzen.',
      sectionHeading: 'Planung',
      verificationType: 'none',
      sourceRequired: false
    }
  );
});

test('zu großer UTF-8-Optimierungsbericht stoppt vor Review und Revision', async () => {
  const beforeBlock = 'ä'.repeat(220_000);
  const afterBlock = 'ö'.repeat(220_000);
  const content = `<p>${beforeBlock}</p><p>Zweiter unveränderter Block.</p><p>Dritter unveränderter Block.</p>`;
  const post = publishedPost({ content });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [optimizedPost(post, {
      contentHtml: `<p>${afterBlock}</p><p>Zweiter unveränderter Block.</p><p>Dritter unveränderter Block.</p>`
    })]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'existing_post_optimization_report_too_large');
  assert.equal(dependencies.calls.review, 0);
  assert.equal(dependencies.calls.revisions.length, 0);
  assert.equal(dependencies.calls.finishes.length, 1);
});

test('erst nach Review zu großer UTF-8-Bericht stoppt bei der letzten Prüfung vor Revision', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({
    post,
    reviewResults: [reviewResult({ summary: 'ä'.repeat(260_000) })]
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'existing_post_optimization_report_too_large');
  assert.equal(dependencies.calls.review, 1);
  assert.equal(dependencies.calls.revisions.length, 0);
  assert.equal(dependencies.calls.finishes.length, 1);
});

test('Livehashkonflikt bei atomarer Revisionsanlage endet manuell und schreibt niemals live', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({
    post,
    revisionError: Object.assign(new Error('Liveartikel geändert'), {
      code: 'CONTENT_REVISION_STALE'
    })
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'CONTENT_REVISION_STALE');
  assert.equal(dependencies.calls.revisions.length, 1);
  assert.equal(dependencies.calls.liveWrites, 0);
});

test('Retry konsumiert ausschließlich den gespeicherten Trusted Context trotz geändertem Live-Inventar', async () => {
  const post = publishedPost();
  let optimizationInput = null;
  let auditedPrimaryKeyword = null;
  let liveContext = {
    existingSlugs: ['live-vorher'],
    allowedInternalLinks: ['/live-vorher'],
    metadata: { primary_keyword: 'Live vorher' }
  };
  const dependencies = createSuccessfulDependencies({ post });
  dependencies.optimizationRepository.getTrustedContext = async () => {
    dependencies.calls.trustedContexts += 1;
    return structuredClone(liveContext);
  };
  dependencies.auditExistingPost = ({ post: auditedPost, ...input }) => {
    auditedPrimaryKeyword = auditedPost.primary_keyword;
    return auditExistingPost({ post: auditedPost, ...input });
  };
  const originalOptimize = dependencies.openaiService.optimizeExistingPost;
  dependencies.openaiService.optimizeExistingPost = async (input) => {
    optimizationInput = structuredClone(input);
    return originalOptimize(input);
  };
  const existingPostTrustedContext = buildExistingPostTrustedContext({
    existingSlugs: ['aus-snapshot'],
    metadata: { post_id: 19, primary_keyword: 'Aus Snapshot' }
  }, ['/aus-snapshot']);
  const runtimeSnapshot = Object.freeze({
    ...createJobInput(post).runtimeSnapshot,
    allowedInternalLinks: Object.freeze(['/aus-snapshot']),
    existingPostTrustedContext,
    existingPostTrustedContextHash: canonicalSha256(existingPostTrustedContext)
  });

  await runExistingPostOptimizationJob(createJobInput(post, { runtimeSnapshot }), dependencies);
  liveContext = {
    existingSlugs: ['live-nachher'],
    allowedInternalLinks: ['/live-nachher'],
    metadata: { primary_keyword: 'Live nachher' }
  };
  await runExistingPostOptimizationJob(createJobInput(post, { runtimeSnapshot }), dependencies);

  assert.deepEqual(optimizationInput.allowedInternalLinks, ['/aus-snapshot']);
  assert.equal(dependencies.calls.trustedContexts, 0);
  assert.equal(auditedPrimaryKeyword, 'Aus Snapshot');
  assert.deepEqual(
    dependencies.calls.validationContexts[0].existingSlugs,
    ['aus-snapshot']
  );
  assert.deepEqual(optimizationInput.learningRules, []);
  assert.deepEqual(runtimeSnapshot.allowedInternalLinks, ['/aus-snapshot']);
});

test('Pipeline lehnt einen manipulierten Trusted-Context-Hash vor jedem Livezugriff ab', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({ post });
  const runtimeSnapshot = {
    ...createJobInput(post).runtimeSnapshot,
    existingPostTrustedContextHash: '0'.repeat(64)
  };

  await assert.rejects(
    runExistingPostOptimizationJob(createJobInput(post, { runtimeSnapshot }), dependencies),
    (error) => error?.code === 'CONTENT_EXISTING_OPTIMIZATION_INPUT_INVALID'
  );
  assert.equal(dependencies.calls.liveSnapshots, 0);
  assert.equal(dependencies.calls.trustedContexts, 0);
});

test('Auditjahr stammt aus dem unveränderlichen Startzeitpunkt des Runtime-Snapshots', async () => {
  const post = publishedPost();
  let auditYear = null;
  const dependencies = createSuccessfulDependencies({ post });
  dependencies.auditExistingPost = ({ currentYear }) => {
    auditYear = currentYear;
    return { score: 100, findings: [], recommendedActions: [] };
  };
  const runtimeSnapshot = {
    ...createJobInput(post).runtimeSnapshot,
    startedAt: '2025-06-30T12:00:00.000Z'
  };

  await runExistingPostOptimizationJob(
    createJobInput(post, { runtimeSnapshot }),
    dependencies
  );

  assert.equal(auditYear, 2025);
});

test('dauerhaft widersprüchliche interne Revisionsdaten beenden den Lauf als failed', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({ post });
  dependencies.revisionService = {
    async createOptimizedRevision() {
      throw Object.assign(new Error('Interner Snapshot widersprüchlich'), {
        code: 'CONTENT_REVISION_VALIDATION_FAILED'
      });
    }
  };

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'failed');
  assert.equal(result.code, 'CONTENT_REVISION_VALIDATION_FAILED');
  assert.equal(dependencies.calls.finishes.at(-1).status, 'failed');
  assert.equal(dependencies.calls.liveWrites, 0);
});

test('fehlender Audit bei der Revision ist ein dauerhaft fehlgeschlagener Terminalpfad', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({
    post,
    revisionError: Object.assign(new Error('Audit nicht gefunden'), {
      code: 'CONTENT_AUDIT_NOT_FOUND'
    })
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'failed');
  assert.equal(result.code, 'CONTENT_AUDIT_NOT_FOUND');
  assert.equal(dependencies.calls.finishes.length, 1);
  assert.equal(dependencies.calls.finishes[0].status, 'failed');
});

test('zwischenzeitlich fehlender Livebeitrag bei der Revision endet manuell als stale', async () => {
  const post = publishedPost();
  const dependencies = createSuccessfulDependencies({
    post,
    revisionError: Object.assign(new Error('Beitrag nicht mehr veröffentlicht'), {
      code: 'CONTENT_POST_NOT_FOUND'
    })
  });

  const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'CONTENT_REVISION_STALE');
  assert.equal(dependencies.calls.finishes.length, 1);
  assert.equal(dependencies.calls.finishes[0].status, 'needs_manual_attention');
});

test('ungültige Audit- und Revisionsergebnisse werden jeweils als failed abgeschlossen', async (t) => {
  const post = publishedPost();
  const cases = [
    {
      name: 'Audit-Ergebnis',
      options: { auditPersistenceResult: null },
      code: 'CONTENT_AUDIT_PERSISTENCE_FAILED'
    },
    {
      name: 'Revisions-Ergebnis',
      options: { revisionResult: { id: null, status: 'draft' } },
      code: 'CONTENT_REVISION_PERSISTENCE_FAILED'
    }
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const dependencies = createSuccessfulDependencies({ post, ...scenario.options });

      const result = await runExistingPostOptimizationJob(createJobInput(post), dependencies);

      assert.equal(result.status, 'failed');
      assert.equal(result.code, scenario.code);
      assert.equal(dependencies.calls.finishes.length, 1);
      assert.equal(dependencies.calls.finishes[0].status, 'failed');
    });
  }
});
