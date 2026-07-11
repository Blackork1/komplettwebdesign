import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDraftRegenerationRepository,
  runDraftRegenerationJob
} from '../services/contentAgent/draftRegenerationService.js';

const faq = Array.from({ length: 5 }, (_, index) => ({
  question: `Frage ${index + 1}?`,
  answer: `Antwort ${index + 1}.`
}));

function article(overrides = {}) {
  return {
    title: 'Neuer Titel',
    shortDescription: 'Neue Kurzbeschreibung',
    metaTitle: 'Neuer Meta Title mit ausreichender Länge für Google',
    metaDescription: 'Eine neue Meta Description mit ausreichender Länge für die sichere Validierung des unveröffentlichten Artikels im Adminbereich.',
    ogTitle: 'Neuer OG-Titel',
    ogDescription: 'Neue OG-Beschreibung',
    slug: 'bestehender-entwurf',
    contentHtml: '<section><h2>Neu</h2><p>Sanitisiert</p></section>',
    faqJson: faq,
    category: 'Webdesign',
    imagePrompt: 'Professionelle Webdesign-Arbeitsszene',
    imageAlt: 'Professionelle Webdesign-Arbeitsszene',
    imageFilename: 'bestehender-entwurf.webp',
    seo: {
      primaryKeyword: 'Webdesign Berlin',
      secondaryKeywords: ['Website erstellen lassen'],
      searchIntent: 'commercial',
      targetAudience: 'Unternehmen in Berlin',
      contentCluster: 'Webdesign'
    },
    lead: {
      businessGoal: 'Anfragen',
      ctaType: 'contact',
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

function draft(overrides = {}) {
  return {
    post: {
      id: 19,
      title: 'Bestehender Titel',
      excerpt: 'Bestehende Kurzbeschreibung',
      slug: 'bestehender-entwurf',
      content: '<section><h2>Alt</h2><p>Bestehend</p></section>',
      category: 'Webdesign',
      faq_json: faq,
      meta_title: 'Bestehender Meta Title mit ausreichender Länge',
      meta_description: 'Eine bestehende Meta Description mit ausreichender Länge für die sichere Validierung des unveröffentlichten Artikels.',
      og_title: 'Bestehender OG-Titel',
      og_description: 'Bestehende OG-Beschreibung',
      image_url: 'https://example.test/alt.webp',
      hero_public_id: 'blog_images/alt',
      image_alt: 'Bestehendes Bild',
      generated_by_ai: true,
      published: false,
      workflow_status: 'needs_review',
      content_format: 'static_html',
      ...overrides
    },
    metadata: {
      primary_keyword: 'Webdesign Berlin',
      secondary_keywords: ['Website erstellen lassen'],
      search_intent: 'commercial',
      target_audience: 'Unternehmen in Berlin',
      content_cluster: 'Webdesign',
      business_goal: 'Anfragen',
      cta_type: 'contact',
      internal_links_json: [],
      source_references_json: [],
      seo_brief_json: {
        imageIdea: {
          prompt: 'Professionelle Webdesign-Arbeitsszene',
          altText: 'Professionelle Webdesign-Arbeitsszene',
          filename: 'bestehender-entwurf.webp'
        }
      },
      quality_report_json: { risks: {} }
    }
  };
}

function input(jobType, overrides = {}) {
  return {
    claim: {
      id: 7,
      job_type: jobType,
      payload_json: { post_id: 19, forced_mode: 'review', source: 'admin_regeneration' }
    },
    run: { id: 12, stage_results_json: {}, runtime_snapshot_json: {} },
    runtimeSnapshot: {
      operatingMode: 'auto_publish',
      monthlyCostLimitEur: 25,
      contentStageReservationEur: 0.5,
      contentInputCostPerMtok: 2.5,
      contentOutputCostPerMtok: 15,
      imageCostEur: 0.041,
      timezone: 'Europe/Berlin'
    },
    ...overrides
  };
}

function dependencies(overrides = {}) {
  const calls = [];
  const current = draft();
  const generated = article();
  const deps = {
    calls,
    draftRepository: {
      async getDraftWithMetadata(postId) {
        calls.push(['getDraft', postId]);
        return structuredClone(current);
      },
      async getValidationContext(postId) {
        calls.push(['context', postId]);
        return { existingSlugs: [], allowedInternalLinks: [], sourceReferences: [] };
      },
      async updateGeneratedFields(payload) {
        calls.push(['updateFields', payload]);
        return {
          post: {
            ...current.post,
            published: false,
            workflow_status: 'needs_review'
          },
          metadata: current.metadata
        };
      },
      async updateGeneratedImage(payload) {
        calls.push(['updateImage', payload]);
        return {
          committed: true,
          oldPublicId: current.post.hero_public_id,
          post: {
            ...current.post,
            image_url: payload.imageUrl,
            hero_public_id: payload.publicId,
            image_alt: payload.imageAlt
          }
        };
      },
      async reconcileGeneratedImage() { return null; }
    },
    openaiService: {
      async repairArticle(payload) {
        calls.push(['repair', payload]);
        return {
          value: structuredClone(generated),
          responseId: 'resp-regeneration',
          usage: { input_tokens: 1000, output_tokens: 2000 },
          promptVersion: 'repair-v1'
        };
      }
    },
    costService: {
      async getPersistedStageResult(payload) {
        calls.push(['persisted', payload]);
        return null;
      },
      async reserveMonthlyBudget(payload) {
        calls.push(['reserve', payload]);
        return { created: true, status: 'reserved', reservationMonth: '2026-07' };
      },
      async settleMonthlyBudget(payload) { calls.push(['settle', payload]); },
      async releaseMonthlyBudgetReservation(payload) { calls.push(['release', payload]); },
      estimateTextCost() { return 0.04; }
    },
    runRepository: {
      async updateRunStage(runId, payload) { calls.push(['stage', runId, payload]); },
      async finishRun(runId, payload) { calls.push(['finish', runId, payload]); }
    },
    validateArticle(candidate) {
      calls.push(['validate', candidate]);
      return { passed: true, sanitizedHtml: '<section><h2>Neu</h2><p>Sicher</p></section>', issues: [] };
    },
    imageService: {
      async generateAndUploadImage(payload) {
        calls.push(['generateImage', payload]);
        return {
          imageUrl: 'https://example.test/neu.webp',
          publicId: 'blog_images/neu',
          bytes: 123,
          audit: {
            imageGeneration: { status: 'completed' },
            upload: { status: 'completed' }
          }
        };
      },
      async deleteImage(payload) {
        calls.push(['deleteImage', payload]);
        return { status: 'completed', publicId: payload.publicId };
      }
    },
    ...overrides
  };
  return deps;
}

test('drei Textregenerationen erzwingen Review und aktualisieren ausschließlich ihre Feldfreigabe', async () => {
  const expectedFields = {
    regenerate_article: [
      'title', 'shortDescription', 'metaTitle', 'metaDescription',
      'ogTitle', 'ogDescription', 'contentHtml', 'faqJson'
    ],
    regenerate_metadata: [
      'shortDescription', 'metaTitle', 'metaDescription', 'ogTitle', 'ogDescription'
    ],
    regenerate_faq: ['contentHtml', 'faqJson']
  };

  for (const [jobType, allowedFields] of Object.entries(expectedFields)) {
    const deps = dependencies();
    const result = await runDraftRegenerationJob(input(jobType), deps);
    const update = deps.calls.find(([type]) => type === 'updateFields')[1];

    assert.equal(result.status, 'completed');
    assert.equal(result.post.published, false);
    assert.equal(result.post.workflow_status, 'needs_review');
    assert.deepEqual(update.allowedFields, allowedFields);
    assert.equal(update.article.contentHtml, '<section><h2>Neu</h2><p>Sicher</p></section>');
    assert.equal(Object.hasOwn(update.article, 'published'), false);
    assert.deepEqual(
      deps.calls.find(([type]) => type === 'stage')[2].stageId,
      `${jobType}:19`
    );
  }
});

test('Regeneration akzeptiert ausschließlich die vier Jobtypen und forced review', async () => {
  await assert.rejects(
    runDraftRegenerationJob(input('generate_manual_draft'), dependencies()),
    (error) => error.retryable === false && error.code === 'CONTENT_REGENERATION_TYPE_UNSUPPORTED'
  );
  await assert.rejects(
    runDraftRegenerationJob(input('regenerate_article', {
      claim: {
        id: 7,
        job_type: 'regenerate_article',
        payload_json: { post_id: 19, forced_mode: 'auto_publish' }
      }
    }), dependencies()),
    (error) => error.retryable === false && error.code === 'CONTENT_REGENERATION_REVIEW_REQUIRED'
  );
});

test('persistiertes Textresultat wird vor Budget und Provider wiederverwendet', async () => {
  const deps = dependencies();
  const generated = article({ title: 'Persistierter Titel' });
  deps.costService.getPersistedStageResult = async (payload) => {
    deps.calls.push(['persisted', payload]);
    return {
      value: generated,
      responseId: 'resp-persisted',
      usage: { input_tokens: 100, output_tokens: 200 },
      promptVersion: 'repair-v1',
      actualCost: 0.04,
      reservationMonth: '2026-07'
    };
  };
  deps.costService.reserveMonthlyBudget = async (payload) => {
    deps.calls.push(['reserve', payload]);
    return { created: false, status: 'reserved', reservationMonth: '2026-07' };
  };

  await runDraftRegenerationJob(input('regenerate_article'), deps);

  assert.equal(deps.calls.filter(([type]) => type === 'repair').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'reserve').length, 1);
  assert.equal(deps.calls.filter(([type]) => type === 'settle').length, 1);
  assert.equal(deps.calls.find(([type]) => type === 'updateFields')[1].article.title, 'Persistierter Titel');
});

test('Textproviderresultat wird vor Leaseprüfung und Settlement dauerhaft gespeichert', async () => {
  let deps;
  deps = dependencies({
    async recordProviderResult(payload) { deps.calls.push(['provider', payload]); }
  });

  await runDraftRegenerationJob(input('regenerate_article'), deps);

  const order = deps.calls.map(([type]) => type);
  assert.ok(order.indexOf('repair') < order.indexOf('stage'));
  assert.ok(order.indexOf('stage') < order.indexOf('settle'));
  assert.ok(order.indexOf('settle') < order.indexOf('provider'));
});

test('Stufenpersistenzfehler nach Textprovider stoppt manuell ohne Settlement oder Zweitaufruf', async () => {
  const deps = dependencies();
  deps.runRepository.updateRunStage = async () => {
    throw new Error('Stufenergebnis nicht speicherbar');
  };

  const result = await runDraftRegenerationJob(input('regenerate_article'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_stage_persistence_uncertain');
  assert.equal(deps.calls.filter(([type]) => type === 'repair').length, 1);
  assert.equal(deps.calls.filter(([type]) => type === 'settle').length, 0);
});

test('Leaseverlust nach persistiertem Textresultat wird ohne Settlement fortsetzbar', async () => {
  const leaseError = Object.assign(new Error('Lease verloren'), {
    code: 'CONTENT_JOB_LEASE_LOST',
    retryable: false
  });
  let persisted = null;
  let guards = 0;
  const first = dependencies();
  first.costService.getPersistedStageResult = async () => persisted;
  first.runRepository.updateRunStage = async (_runId, payload) => {
    first.calls.push(['stage', _runId, payload]);
    persisted = payload.stageResult;
  };

  await assert.rejects(runDraftRegenerationJob(input('regenerate_article', {
    leaseGuard: async () => {
      guards += 1;
      if (guards >= 4) throw leaseError;
      return true;
    }
  }), first), leaseError);
  assert.ok(persisted?.value);
  assert.equal(first.calls.filter(([type]) => type === 'settle').length, 0);

  const retry = dependencies();
  retry.costService.getPersistedStageResult = async () => persisted;
  retry.costService.reserveMonthlyBudget = async (payload) => {
    retry.calls.push(['reserve', payload]);
    return { created: false, status: 'reserved', reservationMonth: persisted.reservationMonth };
  };
  await runDraftRegenerationJob(input('regenerate_article'), retry);
  assert.equal(retry.calls.filter(([type]) => type === 'repair').length, 0);
  assert.equal(retry.calls.filter(([type]) => type === 'settle').length, 1);
});

test('offene oder abgerechnete Reservierung ohne Ergebnis stoppt ohne zweiten Provideraufruf', async () => {
  for (const reservation of [
    { created: false, status: 'reserved', reservationMonth: '2026-07' },
    { created: false, status: 'settled', reservationMonth: '2026-07' }
  ]) {
    const deps = dependencies();
    deps.costService.reserveMonthlyBudget = async (payload) => {
      deps.calls.push(['reserve', payload]);
      return reservation;
    };

    const result = await runDraftRegenerationJob(input('regenerate_metadata'), deps);

    assert.equal(result.status, 'needs_manual_attention');
    assert.equal(deps.calls.filter(([type]) => type === 'repair').length, 0);
    assert.equal(deps.calls.filter(([type]) => type === 'updateFields').length, 0);
  }
});

test('vorhandenes aber ungültiges Stufenergebnis sperrt einen zweiten Provideraufruf', async () => {
  const deps = dependencies();
  deps.costService.getPersistedStageResult = async () => ({ responseId: 'resp-ohne-value' });

  const result = await runDraftRegenerationJob(input('regenerate_article'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(deps.calls.filter(([type]) => type === 'reserve').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'repair').length, 0);
});

test('Budgetgrenze pausiert den Regenerationsjob zur manuellen Prüfung', async () => {
  const deps = dependencies();
  deps.costService.reserveMonthlyBudget = async () => {
    throw Object.assign(new Error('Budget erreicht'), {
      code: 'CONTENT_BUDGET_LIMIT_REACHED',
      retryable: false
    });
  };

  const result = await runDraftRegenerationJob(input('regenerate_metadata'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'CONTENT_BUDGET_LIMIT_REACHED');
  assert.equal(deps.calls.filter(([type]) => type === 'repair').length, 0);
});

test('Leaseverlust stoppt vor Provider und Postupdate ohne Runabschluss', async () => {
  const leaseError = Object.assign(new Error('Lease verloren'), {
    code: 'CONTENT_JOB_LEASE_LOST',
    retryable: false
  });
  const deps = dependencies();

  await assert.rejects(
    runDraftRegenerationJob(input('regenerate_faq', {
      leaseGuard: async () => { throw leaseError; }
    }), deps),
    leaseError
  );

  assert.equal(deps.calls.filter(([type]) => type === 'reserve').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'repair').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'updateFields').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'finish').length, 0);
});

test('ungültiges Regenerationsergebnis bleibt unveröffentlicht und benötigt manuelle Prüfung', async () => {
  const deps = dependencies({
    validateArticle() {
      return { passed: false, sanitizedHtml: '', issues: [{ code: 'script_forbidden' }] };
    }
  });

  const result = await runDraftRegenerationJob(input('regenerate_faq'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'regenerated_draft_invalid');
  assert.equal(deps.calls.filter(([type]) => type === 'updateFields').length, 0);
  assert.deepEqual(deps.calls.find(([type]) => type === 'finish')[2], {
    status: 'needs_manual_attention',
    postId: 19,
    errorReport: {
      code: 'regenerated_draft_invalid',
      message: 'Das Regenerationsergebnis hat die deterministische Validierung nicht bestanden.',
      issues: [{ code: 'script_forbidden' }]
    }
  });
});

test('Bildregeneration persistiert vor dem Postupdate und löscht das alte Bild erst nach Commit', async () => {
  const deps = dependencies();

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'completed');
  assert.equal(result.post.published, false);
  const order = deps.calls.map(([type]) => type);
  assert.ok(order.indexOf('stage') < order.indexOf('settle'));
  assert.ok(order.indexOf('settle') < order.indexOf('updateImage'));
  assert.ok(order.indexOf('updateImage') < order.indexOf('deleteImage'));
  assert.deepEqual(deps.calls.find(([type]) => type === 'deleteImage')[1], { publicId: 'blog_images/alt' });
  assert.equal(deps.calls.find(([type]) => type === 'stage')[2].stageId, 'regenerate_image:19');
});

test('Bildfehlerpfad prüft die Lease unmittelbar vor dem Settlement', async () => {
  const leaseError = Object.assign(new Error('Lease verloren'), {
    code: 'CONTENT_JOB_LEASE_LOST',
    retryable: false
  });
  const deps = dependencies();
  deps.imageService.generateAndUploadImage = async () => {
    throw Object.assign(new Error('Bildprovider fehlgeschlagen'), {
      code: 'IMAGE_GENERATION_FAILED',
      audit: { imageGeneration: { status: 'failed', code: 'IMAGE_GENERATION_FAILED' } }
    });
  };
  let guards = 0;

  await assert.rejects(runDraftRegenerationJob(input('regenerate_image', {
    leaseGuard: async () => {
      guards += 1;
      if (guards >= 4) throw leaseError;
      return true;
    }
  }), deps), leaseError);

  assert.equal(deps.calls.filter(([type]) => type === 'settle').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'finish').length, 0);
});

test('Bildstufen-Persistenzfehler lässt die Reservierung offen und verhindert das Postupdate', async () => {
  const deps = dependencies();
  deps.runRepository.updateRunStage = async () => {
    throw new Error('Bildstufe nicht speicherbar');
  };

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_stage_persistence_uncertain');
  assert.equal(deps.calls.filter(([type]) => type === 'generateImage').length, 1);
  assert.equal(deps.calls.filter(([type]) => type === 'settle').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'updateImage').length, 0);
});

test('erfolgreiche Bildregeneration aktualisiert OpenAI- und Cloudinary-Status getrennt', async () => {
  const deps = dependencies({
    async recordProviderResult(input) { deps.calls.push(['provider', input]); }
  });

  await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.deepEqual(
    deps.calls.filter(([type]) => type === 'provider').map(([, value]) => value),
    [
      { providerName: 'openai', success: true },
      { providerName: 'cloudinary', success: true }
    ]
  );
});

test('Bild-Retry verwendet persistiertes Uploadresultat und erzeugt kein zweites Bild', async () => {
  const deps = dependencies();
  deps.costService.getPersistedStageResult = async ({ stageId }) => (
    stageId === 'regenerate_image:19'
      ? {
        imageUrl: 'https://example.test/persistiert.webp',
        publicId: 'blog_images/persistiert',
        bytes: 456,
        imageAlt: 'Persistiertes Bild',
        previousPublicId: 'blog_images/alt',
        actualCost: 0.041,
        reservationMonth: '2026-07'
      }
      : null
  );
  deps.costService.reserveMonthlyBudget = async (payload) => {
    deps.calls.push(['reserve', payload]);
    return { created: false, status: 'reserved', reservationMonth: '2026-07' };
  };

  await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(deps.calls.filter(([type]) => type === 'generateImage').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'reserve').length, 1);
  assert.equal(deps.calls.filter(([type]) => type === 'settle').length, 1);
  assert.equal(deps.calls.find(([type]) => type === 'updateImage')[1].publicId, 'blog_images/persistiert');
});

test('unklarer Bildcommit löscht weder altes noch neues Bild', async () => {
  const commitError = Object.assign(new Error('COMMIT-Ausgang unklar'), {
    code: 'CONTENT_IMAGE_COMMIT_UNCERTAIN'
  });
  const deps = dependencies();
  deps.draftRepository.updateGeneratedImage = async () => { throw commitError; };
  deps.draftRepository.reconcileGeneratedImage = async () => null;

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'image_commit_uncertain');
  assert.equal(deps.calls.filter(([type]) => type === 'deleteImage').length, 0);
});

test('konkurrierendes Bildupdate überschreibt nichts und bereinigt nur den eindeutigen neuen Orphan', async () => {
  const deps = dependencies();
  deps.draftRepository.updateGeneratedImage = async () => ({
    committed: false,
    casMismatch: true,
    currentPublicId: 'blog_images/konkurrenz',
    post: null
  });

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'image_concurrent_update');
  assert.deepEqual(
    deps.calls.filter(([type]) => type === 'deleteImage').map(([, value]) => value.publicId),
    ['blog_images/neu']
  );
  assert.equal(deps.calls.some(([type, value]) => (
    type === 'deleteImage' && ['blog_images/alt', 'blog_images/konkurrenz'].includes(value.publicId)
  )), false);
});

test('ambiger aber bestätigter Bildcommit verwendet die gelockte Cleanup-Intention', async () => {
  const commitError = Object.assign(new Error('COMMIT-Ausgang unklar'), {
    code: 'CONTENT_IMAGE_COMMIT_UNCERTAIN',
    lockedOldPublicId: 'blog_images/tatsaechlich-alt'
  });
  const deps = dependencies();
  deps.draftRepository.updateGeneratedImage = async () => { throw commitError; };
  deps.draftRepository.reconcileGeneratedImage = async () => ({
    state: 'committed',
    post: { ...draft().post, hero_public_id: 'blog_images/neu' }
  });

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'completed');
  assert.deepEqual(
    deps.calls.filter(([type]) => type === 'deleteImage').map(([, value]) => value.publicId),
    ['blog_images/tatsaechlich-alt']
  );
});

test('ambiger nicht erfolgter Bildcommit bereinigt nur den neuen Orphan', async () => {
  const commitError = Object.assign(new Error('COMMIT-Ausgang unklar'), {
    code: 'CONTENT_IMAGE_COMMIT_UNCERTAIN',
    lockedOldPublicId: 'blog_images/alt'
  });
  const deps = dependencies();
  deps.draftRepository.updateGeneratedImage = async () => { throw commitError; };
  deps.draftRepository.reconcileGeneratedImage = async () => ({
    state: 'not_committed',
    currentPublicId: 'blog_images/alt'
  });

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.deepEqual(
    deps.calls.filter(([type]) => type === 'deleteImage').map(([, value]) => value.publicId),
    ['blog_images/neu']
  );
});

function retryableImageScenario({
  currentPublicId = 'blog_images/alt',
  concurrentPublicId = 'blog_images/konkurrenz',
  commitState = 'cas_mismatch',
  deleteFailures = 0,
  failAfterCleanupIntent = false,
  uncertainCleanupIntent = false
} = {}) {
  const deps = dependencies();
  const stages = new Map();
  let remainingDeleteFailures = deleteFailures;
  let cleanupIntentFailurePending = failAfterCleanupIntent;
  let uncertainCleanupIntentPending = uncertainCleanupIntent;
  let actualCurrentPublicId = currentPublicId;
  let concurrencyPending = commitState === 'cas_mismatch';

  deps.draftRepository.getDraftWithMetadata = async () => draft({
    hero_public_id: actualCurrentPublicId,
    image_url: `https://example.test/${actualCurrentPublicId.split('/').at(-1)}.webp`
  });
  deps.costService.getPersistedStageResult = async ({ stageId }) => stages.get(stageId) ?? null;
  deps.costService.reserveMonthlyBudget = async (payload) => {
    deps.calls.push(['reserve', payload]);
    return {
      created: !stages.has('regenerate_image:19'),
      status: stages.has('regenerate_image:19') ? 'settled' : 'reserved',
      reservationMonth: '2026-07'
    };
  };
  deps.runRepository.updateRunStage = async (runId, payload) => {
    deps.calls.push(['stage', runId, payload]);
    if (payload.stageId === 'regenerate_image:19:orphan_cleanup' && uncertainCleanupIntentPending) {
      uncertainCleanupIntentPending = false;
      throw new Error('Cleanup-Intent-Commit unklar');
    }
    if (!stages.has(payload.stageId)) stages.set(payload.stageId, structuredClone(payload.stageResult));
    if (payload.stageId === 'regenerate_image:19:orphan_cleanup' && cleanupIntentFailurePending) {
      cleanupIntentFailurePending = false;
      throw Object.assign(new Error('Crash nach Cleanup-Intent'), {
        code: 'CONTENT_JOB_LEASE_LOST',
        retryable: false
      });
    }
  };
  deps.draftRepository.updateGeneratedImage = async (payload) => {
    deps.calls.push(['updateImage', payload]);
    if (commitState === 'not_committed') {
      throw Object.assign(new Error('COMMIT nicht ausgeführt'), {
        code: 'CONTENT_IMAGE_COMMIT_UNCERTAIN',
        lockedOldPublicId: 'blog_images/alt'
      });
    }
    if (concurrencyPending) {
      concurrencyPending = false;
      actualCurrentPublicId = concurrentPublicId;
    }
    if (payload.expectedOldPublicId !== actualCurrentPublicId) {
      return {
        committed: false,
        casMismatch: true,
        currentPublicId: actualCurrentPublicId,
        post: null
      };
    }
    actualCurrentPublicId = payload.publicId;
    return {
      committed: true,
      oldPublicId: payload.expectedOldPublicId,
      post: draft({ hero_public_id: actualCurrentPublicId }).post
    };
  };
  deps.draftRepository.reconcileGeneratedImage = async () => ({
    state: 'not_committed',
    currentPublicId: actualCurrentPublicId,
    post: draft({ hero_public_id: actualCurrentPublicId }).post
  });
  deps.imageService.deleteImage = async (payload) => {
    deps.calls.push(['deleteImage', payload]);
    if (remainingDeleteFailures > 0) {
      remainingDeleteFailures -= 1;
      throw Object.assign(new Error('Orphan-Cleanup fehlgeschlagen'), {
        code: 'IMAGE_CLEANUP_FAILED'
      });
    }
    return { status: 'completed', publicId: payload.publicId };
  };

  return { deps, stages, currentPublicId: () => actualCurrentPublicId };
}

test('derselbe CAS-Mismatch-Retry behält Basis A und wendet Upload B niemals auf Konkurrenzbild C an', async () => {
  const scenario = retryableImageScenario();

  const first = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);
  const second = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);

  assert.equal(first.code, 'image_concurrent_update');
  assert.equal(second.code, 'image_concurrent_update');
  assert.equal(scenario.currentPublicId(), 'blog_images/konkurrenz');
  assert.deepEqual(
    scenario.deps.calls.filter(([type]) => type === 'updateImage').map(([, value]) => value.expectedOldPublicId),
    ['blog_images/alt']
  );
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'generateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'settle').length, 1);
  assert.equal(scenario.deps.calls.some(([type, value]) => (
    type === 'deleteImage' && value.publicId === 'blog_images/konkurrenz'
  )), false);
});

test('derselbe image_commit_not_applied-Retry bleibt invalidiert und wendet Upload B nie nachträglich an', async () => {
  const scenario = retryableImageScenario({
    currentPublicId: 'blog_images/alt',
    commitState: 'not_committed'
  });

  const first = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);
  const second = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);

  assert.equal(first.code, 'image_commit_not_applied');
  assert.equal(second.code, 'image_commit_not_applied');
  assert.equal(scenario.currentPublicId(), 'blog_images/alt');
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'updateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'generateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'settle').length, 1);
});

test('Retry nach Crash hinter durable Cleanup-Intent führt ausschließlich Orphan-Cleanup fort', async () => {
  const scenario = retryableImageScenario({ failAfterCleanupIntent: true });

  await assert.rejects(
    runDraftRegenerationJob(input('regenerate_image'), scenario.deps),
    (error) => error.code === 'CONTENT_JOB_LEASE_LOST'
  );
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'deleteImage').length, 0);

  const retry = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);

  assert.equal(retry.code, 'image_concurrent_update');
  assert.equal(scenario.currentPublicId(), 'blog_images/konkurrenz');
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'updateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'generateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'settle').length, 1);
  assert.deepEqual(
    scenario.deps.calls.filter(([type]) => type === 'deleteImage').map(([, value]) => value.publicId),
    ['blog_images/neu']
  );
});

test('Retry nach Orphan-Deletefehler wiederholt nur das Cleanup und behält Konkurrenzbild C', async () => {
  const scenario = retryableImageScenario({ deleteFailures: 1 });

  const first = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);
  const second = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);

  assert.equal(first.code, 'image_concurrent_update');
  assert.equal(second.code, 'image_concurrent_update');
  assert.equal(scenario.currentPublicId(), 'blog_images/konkurrenz');
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'updateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'generateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'settle').length, 1);
  assert.deepEqual(
    scenario.deps.calls.filter(([type]) => type === 'deleteImage').map(([, value]) => value.publicId),
    ['blog_images/neu', 'blog_images/neu']
  );
});

test('unklarer Cleanup-Intent-Commit löscht und appliziert nichts; Retry bleibt durch CAS-Basis A sicher', async () => {
  const scenario = retryableImageScenario({ uncertainCleanupIntent: true });

  const first = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);

  assert.equal(first.code, 'image_cleanup_invalidation_uncertain');
  assert.equal(scenario.currentPublicId(), 'blog_images/konkurrenz');
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'deleteImage').length, 0);

  const second = await runDraftRegenerationJob(input('regenerate_image'), scenario.deps);

  assert.equal(second.code, 'image_concurrent_update');
  assert.equal(scenario.currentPublicId(), 'blog_images/konkurrenz');
  assert.deepEqual(
    scenario.deps.calls.filter(([type]) => type === 'updateImage').map(([, value]) => value.expectedOldPublicId),
    ['blog_images/alt', 'blog_images/alt']
  );
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'generateImage').length, 1);
  assert.equal(scenario.deps.calls.filter(([type]) => type === 'settle').length, 2);
});

test('fehlgeschlagener Bildabgleich bleibt manuell und löscht keine Cloudinarydatei', async () => {
  const commitError = Object.assign(new Error('COMMIT-Ausgang unklar'), {
    code: 'CONTENT_IMAGE_COMMIT_UNCERTAIN'
  });
  const deps = dependencies();
  deps.draftRepository.updateGeneratedImage = async () => { throw commitError; };
  deps.draftRepository.reconcileGeneratedImage = async () => {
    throw new Error('Datenbank beim Abgleich nicht erreichbar');
  };

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'image_commit_uncertain');
  assert.equal(deps.calls.filter(([type]) => type === 'deleteImage').length, 0);
});

test('Cleanupfehler macht den bestätigten neuen Bildzustand nicht rückgängig', async () => {
  const deps = dependencies();
  deps.imageService.deleteImage = async (payload) => {
    deps.calls.push(['deleteImage', payload]);
    throw Object.assign(new Error('Cloudinary Cleanup fehlgeschlagen'), {
      code: 'IMAGE_CLEANUP_FAILED'
    });
  };

  const result = await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(result.status, 'completed');
  assert.equal(result.post.hero_public_id, 'blog_images/neu');
  assert.equal(deps.calls.some(([type, , payload]) => (
    type === 'stage' && payload.stageId === 'regenerate_image:19:cleanup'
  )), true);
});

test('Repository prüft Eignung im Update-Transaction erneut und verwendet feste Feldallowlists', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (normalized === 'BEGIN' || normalized === 'COMMIT') return { rows: [] };
      if (normalized === 'ROLLBACK') return { rows: [] };
      if (normalized === 'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE') return { rows: [] };
      if (/SELECT p\.\*, to_jsonb\(m\)/i.test(normalized)) return { rows: [] };
      if (/SELECT (?:p\.)?id(?:, (?:p\.)?hero_public_id)?/i.test(normalized) && /FOR UPDATE/i.test(normalized)) {
        return { rows: [{ id: 19, hero_public_id: 'blog_images/alt' }] };
      }
      if (/UPDATE posts/i.test(normalized)) {
        return { rows: [{ id: 19, published: false, workflow_status: 'needs_review', content_format: 'static_html' }] };
      }
      if (/SELECT \* FROM content_post_metadata/i.test(normalized)) return { rows: [{ post_id: 19 }] };
      throw new Error(`Unerwartete Query: ${normalized}`);
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); }
  };
  const repository = createDraftRegenerationRepository({
    async connect() { return client; },
    async query() { return { rows: [] }; }
  });

  await repository.updateGeneratedFields({
    postId: 19,
    allowedFields: ['metaTitle'],
    article: article({ published: true, slug: 'darf-nicht-geschrieben-werden' })
  });

  const lock = calls.find(({ sql }) => /FOR UPDATE/i.test(sql));
  const update = calls.find(({ sql }) => /^UPDATE posts/i.test(sql));
  assert.deepEqual(calls.slice(0, 3).map(({ sql }) => sql), [
    'BEGIN',
    'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE',
    lock.sql
  ]);
  assert.match(lock.sql, /generated_by_ai = TRUE/i);
  assert.match(lock.sql, /published = FALSE/i);
  assert.match(lock.sql, /content_format = 'static_html'/i);
  assert.match(update.sql, /meta_title =/i);
  const setClause = update.sql.match(/SET (.+) WHERE/i)?.[1] || '';
  assert.doesNotMatch(setClause, /published\s*=|slug\s*=|content_format\s*=/i);
});

test('Bildrepository aktualisiert nur mit NULL-sicherem Altbild-CAS unter Lock', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
      if (normalized === 'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE') return { rows: [] };
      if (/SELECT p\.id, p\.hero_public_id/i.test(normalized)) {
        return { rows: [{ id: 19, hero_public_id: 'blog_images/konkurrenz' }] };
      }
      throw new Error(`Unerwartete Query: ${normalized}`);
    },
    release() {}
  };
  const repository = createDraftRegenerationRepository({
    async connect() { return client; },
    async query() { return { rows: [] }; }
  });

  const result = await repository.updateGeneratedImage({
    postId: 19,
    imageUrl: 'https://example.test/neu.webp',
    publicId: 'blog_images/neu',
    imageAlt: 'Neu',
    expectedOldPublicId: 'blog_images/alt'
  });

  assert.equal(result.casMismatch, true);
  assert.equal(result.currentPublicId, 'blog_images/konkurrenz');
  const rowLock = calls.find(({ sql }) => /FOR UPDATE/i.test(sql));
  assert.deepEqual(calls.slice(0, 3).map(({ sql }) => sql), [
    'BEGIN',
    'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE',
    rowLock.sql
  ]);
  assert.equal(calls.some(({ sql }) => /^UPDATE posts/i.test(sql)), false);
});

test('Bildrepository führt das passende NULL-CAS zusätzlich im UPDATE-Prädikat aus', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
      if (normalized === 'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE') return { rows: [] };
      if (/SELECT p\.id, p\.hero_public_id/i.test(normalized)) {
        return { rows: [{ id: 19, hero_public_id: null }] };
      }
      if (/^UPDATE posts/i.test(normalized)) {
        return { rows: [{ id: 19, hero_public_id: 'blog_images/neu', published: false }] };
      }
      throw new Error(`Unerwartete Query: ${normalized}`);
    },
    release() {}
  };
  const repository = createDraftRegenerationRepository({
    async connect() { return client; },
    async query() { return { rows: [] }; }
  });

  const result = await repository.updateGeneratedImage({
    postId: 19,
    imageUrl: 'https://example.test/neu.webp',
    publicId: 'blog_images/neu',
    imageAlt: 'Neu',
    expectedOldPublicId: null
  });

  const update = calls.find(({ sql }) => /^UPDATE posts/i.test(sql));
  assert.equal(result.committed, true);
  assert.match(update.sql, /hero_public_id IS NOT DISTINCT FROM \$5/i);
  assert.equal(update.params[4], null);
});
