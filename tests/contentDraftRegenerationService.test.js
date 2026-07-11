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
      promptVersion: 'repair-v1'
    };
  };

  await runDraftRegenerationJob(input('regenerate_article'), deps);

  assert.equal(deps.calls.filter(([type]) => type === 'repair').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'reserve').length, 0);
  assert.equal(deps.calls.find(([type]) => type === 'updateFields')[1].article.title, 'Persistierter Titel');
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
  assert.ok(order.indexOf('settle') < order.indexOf('stage'));
  assert.ok(order.indexOf('stage') < order.indexOf('updateImage'));
  assert.ok(order.indexOf('updateImage') < order.indexOf('deleteImage'));
  assert.deepEqual(deps.calls.find(([type]) => type === 'deleteImage')[1], { publicId: 'blog_images/alt' });
  assert.equal(deps.calls.find(([type]) => type === 'stage')[2].stageId, 'regenerate_image:19');
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
  deps.costService.getPersistedStageResult = async () => ({
    imageUrl: 'https://example.test/persistiert.webp',
    publicId: 'blog_images/persistiert',
    bytes: 456,
    imageAlt: 'Persistiertes Bild'
  });

  await runDraftRegenerationJob(input('regenerate_image'), deps);

  assert.equal(deps.calls.filter(([type]) => type === 'generateImage').length, 0);
  assert.equal(deps.calls.filter(([type]) => type === 'reserve').length, 0);
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
  assert.match(lock.sql, /generated_by_ai = TRUE/i);
  assert.match(lock.sql, /published = FALSE/i);
  assert.match(lock.sql, /content_format = 'static_html'/i);
  assert.match(update.sql, /meta_title =/i);
  const setClause = update.sql.match(/SET (.+) WHERE/i)?.[1] || '';
  assert.doesNotMatch(setClause, /published\s*=|slug\s*=|content_format\s*=/i);
});
