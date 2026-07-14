import test from 'node:test';
import assert from 'node:assert/strict';

import { liveHashForPost } from '../services/contentAgent/contentRevisionService.js';
import { runExistingPostOptimizationJob } from '../services/contentAgent/existingPostOptimizationPipeline.js';

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

function providerEnvelope(value, responseId) {
  return {
    value,
    responseId,
    usage: { input_tokens: 12, output_tokens: 7 },
    promptVersion: 'test-v1'
  };
}

function createJobInput(post, overrides = {}) {
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
      allowedInternalLinks: ['/kontakt']
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
  validationResults = [],
  gscError = null,
  revisionError = null,
  trustedContext = {}
} = {}) {
  const persistedPaidStages = new Map();
  const calls = {
    stages: [],
    stageIds: [],
    finishes: [],
    warnings: [],
    leases: 0,
    research: 0,
    optimization: 0,
    review: 0,
    validation: 0,
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
    optimizationRepository: {
      async getPublishedPostSnapshot() { return structuredClone(post); },
      async getTrustedContext() {
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
        return { id: 71, post_id: post.id, status: 'draft' };
      },
      async updatePublishedPost() {
        calls.liveWrites += 1;
        throw new Error('Live-Schreibzugriff ist nicht erlaubt.');
      }
    },
    auditRepository: {
      async createAuditIdempotent(input) {
        return { id: 31, post_id: post.id, score: input.score, findings_json: input.findings };
      }
    },
    searchMetricsRepository: {
      async getPageSignals() {
        if (gscError) throw gscError;
        return [];
      }
    },
    openaiService: {
      async researchExistingPostSources() {
        calls.research += 1;
        return providerEnvelope(structuredClone(researchSources), `resp_research_${calls.research}`);
      },
      async optimizeExistingPost() {
        calls.optimization += 1;
        const value = optimizationQueue.shift() ?? optimizationResults.at(-1);
        return providerEnvelope(structuredClone(value), `resp_opt_${calls.optimization}`);
      },
      async reviewArticle() {
        calls.review += 1;
        const value = reviewQueue.shift() ?? reviewResults.at(-1);
        return providerEnvelope(structuredClone(value), `resp_review_${calls.review}`);
      }
    },
    costService: {
      async getPersistedStageResult({ stageId }) {
        return persistedPaidStages.get(stageId) ?? null;
      },
      async reserveMonthlyBudget(input) {
        calls.reservations.push(structuredClone(input));
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
        if (input.stageResult?.reservationMonth) {
          persistedPaidStages.set(input.stageId, structuredClone(input.stageResult));
        }
        return { id: runId, current_stage: input.currentStage };
      },
      async finishRun(runId, input) {
        calls.finishes.push({ runId, ...structuredClone(input) });
        return { id: runId, ...input };
      }
    },
    async validateArticle(article) {
      calls.validation += 1;
      return validationQueue.shift() ?? {
        passed: true,
        sanitizedHtml: article.contentHtml,
        issues: []
      };
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

test('Wiederaufnahme verwendet jede persistierte kostenpflichtige Stufe ohne zweiten Provideraufruf', async () => {
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

  assert.equal((await runExistingPostOptimizationJob(input, dependencies)).status, 'completed');
  assert.deepEqual({
    research: dependencies.calls.research,
    optimization: dependencies.calls.optimization,
    review: dependencies.calls.review
  }, { research: 1, optimization: 2, review: 2 });

  assert.equal((await runExistingPostOptimizationJob(input, dependencies)).status, 'completed');
  assert.deepEqual({
    research: dependencies.calls.research,
    optimization: dependencies.calls.optimization,
    review: dependencies.calls.review
  }, { research: 1, optimization: 2, review: 2 });
  assert.equal(dependencies.calls.reservations.length, 5);
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

test('Legacy-EJS verwirft jede Inhaltsänderung bytegenau vor der Revision', async () => {
  const post = publishedPost({
    content_format: 'legacy_ejs',
    content: '<p><%= post.title %></p>\n'
  });
  const dependencies = createSuccessfulDependencies({
    post,
    optimizationResults: [optimizedPost(post, { contentHtml: '<p>Geänderter Legacy-Inhalt</p>' })]
  });

  await assert.rejects(
    runExistingPostOptimizationJob(createJobInput(post), dependencies),
    { code: 'LEGACY_EJS_CONTENT_CHANGE_FORBIDDEN' }
  );
  assert.equal(dependencies.calls.revisions.length, 0);
  assert.equal(dependencies.calls.liveWrites, 0);
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

test('persistierter Runtime-Snapshot wird nicht aus aktuellem Repository-Kontext rekonstruiert', async () => {
  const post = publishedPost();
  let optimizationInput = null;
  const dependencies = createSuccessfulDependencies({
    post,
    trustedContext: {
      activeLearningRules: [{
        id: 9,
        version: 1,
        categoryKey: 'internal_links',
        instruction: 'Diese aktuelle Repository-Regel darf nicht nachgeladen werden.',
        targetStages: ['writer']
      }]
    }
  });
  const originalOptimize = dependencies.openaiService.optimizeExistingPost;
  dependencies.openaiService.optimizeExistingPost = async (input) => {
    optimizationInput = structuredClone(input);
    return originalOptimize(input);
  };
  const runtimeSnapshot = Object.freeze({
    ...createJobInput(post).runtimeSnapshot,
    allowedInternalLinks: Object.freeze(['/aus-snapshot'])
  });

  await runExistingPostOptimizationJob(createJobInput(post, { runtimeSnapshot }), dependencies);

  assert.deepEqual(optimizationInput.allowedInternalLinks, ['/aus-snapshot']);
  assert.equal(optimizationInput.allowedInternalLinks.includes('/vom-repository'), false);
  assert.deepEqual(optimizationInput.learningRules, []);
  assert.deepEqual(runtimeSnapshot.allowedInternalLinks, ['/aus-snapshot']);
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
