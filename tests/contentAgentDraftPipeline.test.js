import test from 'node:test';
import assert from 'node:assert/strict';

import BlogPostModel from '../models/BlogPostModel.js';
import {
  ContentImageError,
  createContentImageService,
  generateAndUploadImage
} from '../services/contentAgent/contentImageService.js';
import { validateArticle as validateRealArticle } from '../services/contentAgent/articleValidator.js';
import { runDraftPipeline } from '../services/contentAgent/draftPipeline.js';
import { ContentBudgetLimitError } from '../services/contentAgent/contentCostService.js';

const usage = { input_tokens: 1_000, output_tokens: 500 };

const topic = {
  id: 17,
  topic: 'Webdesign für lokale Unternehmen',
  suggestedTitle: 'Webdesign für lokale Unternehmen planen',
  slug: 'webdesign-lokale-unternehmen',
  primaryKeyword: 'Webdesign lokale Unternehmen',
  secondaryKeywords: ['Website planen'],
  contentCluster: 'Webdesign',
  searchIntent: 'commercial',
  targetAudience: 'Lokale Unternehmen',
  source: 'seed',
  readerProblem: 'Die Planung ist unklar.',
  concreteReaderBenefit: 'Eine klare Prioritätenliste.',
  businessGoal: 'Beratungsanfragen',
  ctaType: 'contact',
  requiresCurrentSources: false,
  businessValue: 9,
  searchOpportunity: 8,
  problemPurchaseProximity: 8,
  internalLinkPotential: 8,
  clusterFit: 9,
  localRelevance: 8,
  cannibalizationRisk: 1,
  finalScore: 8.2,
  eligible: true
};

const seoBrief = {
  topic: topic.topic,
  workingTitle: topic.suggestedTitle,
  primaryKeyword: topic.primaryKeyword,
  secondaryKeywords: topic.secondaryKeywords,
  searchIntent: topic.searchIntent,
  targetAudience: topic.targetAudience,
  readerProblem: topic.readerProblem,
  contentCluster: topic.contentCluster,
  businessGoal: topic.businessGoal,
  ctaType: topic.ctaType,
  sourceRequirements: { requiresCurrentSources: false, requiredTopics: [] },
  internalLinks: [{ url: '/kontakt', label: 'Kontakt', purpose: 'CTA' }],
  sourceReferences: [],
  imageIdea: {
    prompt: 'Authentische Arbeitsszene in einem kleinen Berliner Unternehmen',
    altText: 'Unternehmerin plant ihre neue Website',
    filename: 'webdesign-lokale-unternehmen.webp'
  }
};

const article = {
  title: topic.suggestedTitle,
  shortDescription: 'Praxisnaher Leitfaden für die Website-Planung.',
  metaTitle: 'Webdesign für lokale Unternehmen richtig planen',
  metaDescription: 'Ein praxisnaher Leitfaden zeigt lokalen Unternehmen, wie sie ihre neue Website sinnvoll, strukturiert und zielgerichtet planen.',
  ogTitle: 'Webdesign für lokale Unternehmen planen',
  ogDescription: 'Konkrete Schritte für eine wirksame Unternehmenswebsite.',
  slug: topic.slug,
  contentHtml: '<section><h2>Planung</h2><p>Ursprünglicher Inhalt</p></section>',
  faqJson: [],
  category: 'Webdesign',
  imagePrompt: seoBrief.imageIdea.prompt,
  imageAlt: seoBrief.imageIdea.altText,
  imageFilename: seoBrief.imageIdea.filename,
  seo: {
    primaryKeyword: topic.primaryKeyword,
    secondaryKeywords: topic.secondaryKeywords,
    searchIntent: topic.searchIntent,
    targetAudience: topic.targetAudience,
    contentCluster: topic.contentCluster
  },
  lead: { businessGoal: topic.businessGoal, ctaType: topic.ctaType },
  sourceReferences: [],
  risk: {
    currentClaims: false,
    legalClaims: false,
    privacyClaims: false,
    softwareVersionClaims: false,
    staticPrices: false
  }
};

const review = {
  passed: true,
  score: 91,
  summary: 'Freigabefähiger Entwurf.',
  strengths: ['Klare Struktur'],
  issues: [],
  recommendedActions: [],
  requiresManualReview: false,
  risks: { ...article.risk }
};

const { id: _topicId, finalScore: _finalScore, eligible: _eligible, ...schemaTopic } = topic;
const schemaSeoBrief = {
  ...seoBrief,
  sourceReferences: undefined,
  targetWordCount: 1800,
  outline: Array.from({ length: 5 }, (_, index) => ({
    heading: `Abschnitt ${index + 1}`,
    level: index === 0 ? 'h2' : 'h3',
    purpose: `Zweck ${index + 1}`
  })),
  localExamples: ['Lokaler Betrieb in Berlin'],
  internalLinks: [
    seoBrief.internalLinks[0],
    { url: '/website-tester', label: 'Website prüfen', purpose: 'Selbsttest' }
  ],
  faqQuestions: Array.from({ length: 5 }, (_, index) => `Frage ${index + 1}?`)
};
const schemaArticle = {
  ...article,
  contentHtml: `<section><h2>Planung</h2><p>${'Hilfreicher konkreter Inhalt. '.repeat(210)}</p></section>`,
  faqJson: Array.from({ length: 5 }, (_, index) => ({
    question: `Frage ${index + 1}?`,
    answer: `Konkrete Antwort ${index + 1}.`
  })),
  lead: {
    ...article.lead,
    ctaPositions: ['blog_early', 'blog_mid', 'blog_final']
  },
  qualitySelfCheck: {
    searchIntentFulfilled: true,
    noH1: true,
    noOuterBootstrapContainer: true,
    noInventedPricesOrServices: true,
    faqMatchesHtml: true,
    approvedLinksOnly: true
  }
};

function persistedEnvelope(value, responseId = 'resp-persisted') {
  return { value, responseId, usage, promptVersion: '2026-07-10.1' };
}

const persistedDraft = {
  post: {
    id: 41,
    slug: article.slug,
    title: article.title,
    published: false,
    workflow_status: 'needs_review',
    content_format: 'static_html',
    generated_by_ai: true
  },
  metadata: { post_id: 41, quality_score: review.score },
  topicId: 17,
  qualityScore: review.score
};

function operation(value, responseId) {
  return async () => ({ value, responseId, usage, promptVersion: '2026-07-10.1' });
}

function createDependencies(overrides = {}) {
  const stageUpdates = [];
  const finishCalls = [];
  const budgetReservations = [];
  const budgetSettlements = [];
  const createdDrafts = [];
  const imageCalls = [];
  const reviewInputs = [];
  const repairInputs = [];
  const events = [];

  const dependencies = {
    config: {
      maxRevisions: 2,
      monthlyCostLimitEur: 25,
      contentStageReservationEur: 0.5,
      reviewStageReservationEur: 0.25,
      contentInputCostPerMtok: 2.5,
      contentOutputCostPerMtok: 15,
      reviewInputCostPerMtok: 0.75,
      reviewOutputCostPerMtok: 4.5,
      imageCostEur: 0.041
    },
    inventoryService: {
      async buildSiteInventory() {
        return {
          blogPosts: [],
          guides: [],
          servicePages: [],
          industries: [],
          packages: [
            { packageKey: 'start', name: 'Start', priceLabel: 'ab 1.000 €' },
            { packageKey: 'business', name: 'Business', priceLabel: 'ab 2.000 €' }
          ],
          approvedLinks: [{ url: '/kontakt' }]
        };
      }
    },
    openaiService: {
      createTopicCandidates: operation({ candidates: [topic] }, 'resp-topic'),
      researchCurrentSources: operation([], 'resp-sources'),
      createSeoBrief: operation(seoBrief, 'resp-brief'),
      generateArticle: operation(article, 'resp-article'),
      async reviewArticle(input) {
        reviewInputs.push(input);
        return operation(review, 'resp-review')();
      },
      async repairArticle(input) {
        repairInputs.push(input);
        return operation(article, 'resp-repair')();
      }
    },
    topicScoringService: { selectBestTopic: (candidates) => candidates[0] },
    topicRepository: {
      async createTopic(value) { return { ...value, id: 17 }; },
      async markTopicUsed() {}
    },
    runRepository: {
      async updateRunStage(runId, update) {
        stageUpdates.push({ runId, ...update });
        events.push({ type: 'stage', stageId: update.stageId });
        return update;
      },
      async finishRun(runId, update) {
        finishCalls.push({ runId, ...update });
        events.push({ type: 'finish', status: update.status });
        return update;
      }
    },
    costService: {
      async reserveMonthlyBudget(input) {
        budgetReservations.push(input);
        return {
          created: true,
          status: 'reserved',
          reservationMonth: '2026-07',
          reservationKey: `budget:2026-07:${input.stageId}`
        };
      },
      async settleMonthlyBudget(input) { budgetSettlements.push(input); return { status: 'settled' }; },
      async getPersistedStageResult() { return null; },
      estimateTextCost() { return 0.01; }
    },
    validateArticle(value) {
      return { passed: true, sanitizedHtml: `${value.contentHtml}<!-- sanitized -->`, issues: [] };
    },
    imageService: {
      async generateAndUploadImage(input) {
        imageCalls.push(input);
        return {
          imageUrl: 'https://cdn.example.test/article.webp',
          publicId: 'blog_images/article-run',
          bytes: 321,
          audit: {
            imageGeneration: { status: 'completed', costIncurred: true },
            upload: { status: 'completed' },
            cleanup: { status: 'not_required' }
          }
        };
      },
      async deleteImage({ publicId }) { return { status: 'completed', publicId }; }
    },
    draftRepository: {
      async createAIDraft(input) {
        const result = {
          post: {
            id: 41,
            ...input.post,
            published: false,
            workflow_status: 'needs_review',
            content_format: 'static_html',
            generated_by_ai: true
          },
          metadata: { post_id: 41, ...input.metadata }
        };
        createdDrafts.push(result);
        return result;
      }
    }
  };

  for (const [key, value] of Object.entries(overrides)) {
    dependencies[key] = value;
  }

  return {
    dependencies,
    stageUpdates,
    finishCalls,
    budgetReservations,
    budgetSettlements,
    createdDrafts,
    imageCalls,
    reviewInputs,
    repairInputs,
    events
  };
}

function createTransactionalDb(rowsByCall) {
  const events = [];
  let index = 0;
  const client = {
    async query(sql, params = []) {
      events.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      const result = rowsByCall[index++] || {};
      if (result.error) throw result.error;
      return { rows: result.rows || [] };
    },
    release() { events.push({ sql: 'RELEASE', params: [] }); }
  };
  return {
    events,
    async connect() { events.push({ sql: 'CONNECT', params: [] }); return client; }
  };
}

function createValidatorValidArticle(overrides = {}) {
  const faqs = Array.from({ length: 5 }, (_, index) => ({
    question: `Wie funktioniert Schritt ${index + 1}?`,
    answer: `Schritt ${index + 1} wird verständlich und konkret erklärt.`
  }));
  const cta = (location) => `<div class="alert alert-primary" data-track="cta" data-cta-name="${location}_contact" data-cta-location="${location}">`
    + '<a class="btn btn-primary" href="/kontakt">Beratung anfragen</a></div>';
  const faqHtml = faqs.map(({ question, answer }) => (
    `<div class="mb-3" data-faq-question="${question}" data-faq-answer="${answer}">`
      + `<h3>${question}</h3><p>${answer}</p></div>`
  )).join('');
  return {
    ...article,
    metaTitle: 'Website-Relaunch: Praktischer Leitfaden für Betriebe',
    metaDescription: 'Dieser Leitfaden erklärt kleinen Unternehmen verständlich und konkret, wie sie einen Website-Relaunch sinnvoll vorbereiten und umsetzen.',
    slug: 'website-relaunch-leitfaden',
    contentHtml: [
      '<section class="my-4"><h2>Ein verständlicher Einstieg</h2><p class="lead">Konkrete Hilfe für Unternehmen.</p>',
      cta('blog_early'),
      '<div class="row"><div class="col-lg-12"><h2>Die wichtigsten Schritte</h2><p>Der Hauptteil erklärt das Vorgehen.</p></div></div>',
      cta('blog_mid'),
      `<section class="my-5"><h2>Häufige Fragen</h2>${faqHtml}</section>`,
      cta('blog_final'),
      '</section>'
    ].join(''),
    faqJson: faqs,
    ...overrides
  };
}

test('generateAndUploadImage erzeugt ein mittleres Querformat und lädt einen sicheren WebP-Pfad hoch', async () => {
  const imageRequests = [];
  const uploadRequests = [];
  const openai = {
    images: {
      async generate(request) {
        imageRequests.push(request);
        return { data: [{ b64_json: Buffer.from('bilddaten').toString('base64') }] };
      }
    }
  };
  const cloudinary = {
    uploader: {
      upload_stream(options, callback) {
        uploadRequests.push(options);
        let bytes = 0;
        return {
          on() { return this; },
          end(buffer) {
            bytes = buffer.length;
            callback(null, {
              secure_url: 'https://cdn.example.test/sicher.webp',
              public_id: `blog_images/${options.public_id}`,
              bytes
            });
          }
        };
      },
      async destroy() { return { result: 'ok' }; }
    }
  };

  const result = await generateAndUploadImage({
    prompt: 'Professionelle Arbeitsszene',
    filename: '../../Üble Datei!!.webp',
    runId: 40,
    idFactory: () => 'fixed-suffix',
    config: { imageModel: 'gpt-image-test' },
    openai,
    cloudinary
  });

  assert.deepEqual(imageRequests[0], {
    model: 'gpt-image-test',
    prompt: 'Professionelle Arbeitsszene. Ohne Schrift, Buchstaben, Wörter, Logos, Wasserzeichen oder UI-Text.',
    size: '1536x1024',
    quality: 'medium'
  });
  assert.deepEqual(uploadRequests[0], {
    folder: 'blog_images',
    format: 'webp',
    public_id: 'uble-datei-run-40-fixed-suffix',
    overwrite: false,
    unique_filename: false
  });
  assert.equal(result.imageUrl, 'https://cdn.example.test/sicher.webp');
  assert.equal(result.publicId, 'blog_images/uble-datei-run-40-fixed-suffix');
  assert.equal(result.bytes, Buffer.byteLength('bilddaten'));
  assert.equal(result.audit.upload.status, 'completed');
});

test('Bildfactory erzeugt auch bei identischen Dateinamen kollisionssichere IDs ohne Überschreiben', async () => {
  const uploads = [];
  const suffixes = ['suffix-a', 'suffix-b'];
  const service = createContentImageService({
    config: { imageModel: 'gpt-image-test' },
    idFactory: () => suffixes.shift(),
    openai: {
      images: {
        async generate() {
          return { data: [{ b64_json: Buffer.from('bild').toString('base64') }] };
        }
      }
    },
    cloudinary: {
      uploader: {
        upload_stream(options, callback) {
          uploads.push(options);
          return {
            on() { return this; },
            end(buffer) {
              callback(null, {
                secure_url: `https://cdn.example.test/${options.public_id}.webp`,
                public_id: `blog_images/${options.public_id}`,
                bytes: buffer.length
              });
            }
          };
        },
        async destroy() { return { result: 'ok' }; }
      }
    }
  });

  const first = await service.generateAndUploadImage({ prompt: 'Szene', filename: 'gleich.webp', runId: 41 });
  const second = await service.generateAndUploadImage({ prompt: 'Szene', filename: 'gleich.webp', runId: 42 });

  assert.notEqual(first.publicId, second.publicId);
  assert.match(first.publicId, /^blog_images\/gleich-run-41-suffix-a$/);
  assert.match(second.publicId, /^blog_images\/gleich-run-42-suffix-b$/);
  assert.equal(uploads.every(({ overwrite, unique_filename }) => overwrite === false && unique_filename === false), true);
});

test('Bildfactory bereinigt die neue Public-ID bei Uploadcallbackfehler und liefert strukturiertes Audit', async () => {
  const destroyed = [];
  const service = createContentImageService({
    config: { imageModel: 'gpt-image-test' },
    idFactory: () => 'callback-error',
    openai: { images: { async generate() { return { data: [{ b64_json: Buffer.from('bild').toString('base64') }] }; } } },
    cloudinary: {
      uploader: {
        upload_stream(options, callback) {
          return { on() { return this; }, end() { callback(new Error('Konflikt')); } };
        },
        async destroy(publicId) { destroyed.push(publicId); return { result: 'ok' }; }
      }
    }
  });

  await assert.rejects(
    service.generateAndUploadImage({ prompt: 'Szene', filename: 'gleich.webp', runId: 43 }),
    (error) => {
      assert.equal(error instanceof ContentImageError, true);
      assert.equal(error.audit.imageGeneration.costIncurred, true);
      assert.equal(error.audit.upload.status, 'failed');
      assert.equal(error.audit.cleanup.status, 'completed');
      assert.doesNotMatch(JSON.stringify(error.audit), /Konflikt/);
      return true;
    }
  );
  assert.deepEqual(destroyed, ['blog_images/gleich-run-43-callback-error']);
});

test('Bildfactory meldet Stream- und Cleanupfehler sicher statt sie zu verschlucken', async () => {
  const service = createContentImageService({
    config: { imageModel: 'gpt-image-test' },
    idFactory: () => 'stream-error',
    openai: { images: { async generate() { return { data: [{ b64_json: Buffer.from('bild').toString('base64') }] }; } } },
    cloudinary: {
      uploader: {
        upload_stream() {
          let errorHandler;
          return {
            on(event, handler) { if (event === 'error') errorHandler = handler; return this; },
            end() { errorHandler(new Error('Stream intern')); }
          };
        },
        async destroy() { throw new Error('Cleanup intern'); }
      }
    }
  });

  await assert.rejects(
    service.generateAndUploadImage({ prompt: 'Szene', filename: 'gleich.webp', runId: 44 }),
    (error) => {
      assert.equal(error.audit.upload.status, 'failed');
      assert.equal(error.audit.cleanup.status, 'failed');
      assert.equal(error.audit.cleanup.code, 'IMAGE_CLEANUP_FAILED');
      assert.doesNotMatch(JSON.stringify(error.audit), /Stream intern|Cleanup intern/);
      return true;
    }
  );
});

test('Bildfactory führt synchrone upload_stream-Fehler durch denselben Cleanup-Auditpfad', async () => {
  const destroyed = [];
  const service = createContentImageService({
    config: { imageModel: 'gpt-image-test' },
    idFactory: () => 'sync-setup',
    openai: { images: { async generate() { return { data: [{ b64_json: Buffer.from('bild').toString('base64') }] }; } } },
    cloudinary: {
      uploader: {
        upload_stream() { throw new Error('Synchroner Setupfehler'); },
        async destroy(publicId) { destroyed.push(publicId); return { result: 'ok' }; }
      }
    }
  });

  await assert.rejects(
    service.generateAndUploadImage({ prompt: 'Szene', filename: 'bild.webp', runId: 45 }),
    (error) => {
      assert.equal(error instanceof ContentImageError, true);
      assert.equal(error.audit.upload.status, 'failed');
      assert.equal(error.audit.cleanup.status, 'completed');
      assert.doesNotMatch(JSON.stringify(error.audit), /Setupfehler/);
      return true;
    }
  );
  assert.deepEqual(destroyed, ['blog_images/bild-run-45-sync-setup']);
});

test('Bildfactory führt synchrone stream.end-Fehler durch denselben Cleanup-Auditpfad', async () => {
  const destroyed = [];
  const service = createContentImageService({
    config: { imageModel: 'gpt-image-test' },
    idFactory: () => 'sync-end',
    openai: { images: { async generate() { return { data: [{ b64_json: Buffer.from('bild').toString('base64') }] }; } } },
    cloudinary: {
      uploader: {
        upload_stream() {
          return { on() { return this; }, end() { throw new Error('Synchroner Endfehler'); } };
        },
        async destroy(publicId) { destroyed.push(publicId); return { result: 'ok' }; }
      }
    }
  });

  await assert.rejects(
    service.generateAndUploadImage({ prompt: 'Szene', filename: 'bild.webp', runId: 46 }),
    (error) => {
      assert.equal(error instanceof ContentImageError, true);
      assert.equal(error.audit.upload.status, 'failed');
      assert.equal(error.audit.cleanup.status, 'completed');
      assert.doesNotMatch(JSON.stringify(error.audit), /Endfehler/);
      return true;
    }
  );
  assert.deepEqual(destroyed, ['blog_images/bild-run-46-sync-end']);
});

test('deleteImage akzeptiert nur explizite ok- oder not-found-Ergebnisse', async () => {
  for (const destroyResult of [undefined, {}, { result: 'unknown' }]) {
    const service = createContentImageService({
      config: { imageModel: 'gpt-image-test' },
      openai: { images: { async generate() { throw new Error('nicht benötigt'); } } },
      cloudinary: {
        uploader: {
          upload_stream() { throw new Error('nicht benötigt'); },
          async destroy() { return destroyResult; }
        }
      }
    });

    await assert.rejects(service.deleteImage({ publicId: 'blog_images/explizit' }), (error) => {
      assert.equal(error.code, 'IMAGE_CLEANUP_FAILED');
      assert.equal(error.audit.cleanup.status, 'failed');
      return true;
    });
  }

  for (const explicit of [{ result: 'ok' }, { result: 'not found' }]) {
    const service = createContentImageService({
      config: { imageModel: 'gpt-image-test' },
      openai: { images: { async generate() { throw new Error('nicht benötigt'); } } },
      cloudinary: {
        uploader: {
          upload_stream() { throw new Error('nicht benötigt'); },
          async destroy() { return explicit; }
        }
      }
    });
    assert.equal((await service.deleteImage({ publicId: 'blog_images/explizit' })).status, 'completed');
  }
});

test('BlogPostModel.createAIDraft erzwingt unveränderliche KI-Entwurfsfelder und speichert atomar', async () => {
  const postRow = { id: 51, published: false, workflow_status: 'needs_review', content_format: 'static_html', generated_by_ai: true };
  const metadataRow = { post_id: 51, quality_score: 91 };
  const db = createTransactionalDb([
    {},
    { rows: [postRow] },
    { rows: [metadataRow] },
    {}
  ]);

  const result = await BlogPostModel.createAIDraft({
    generationRunId: 71,
    post: {
      title: article.title,
      slug: article.slug,
      excerpt: article.shortDescription,
      content: article.contentHtml,
      hero_image: 'https://cdn.example.test/article.webp',
      hero_public_id: 'blog_images/article',
      category: article.category,
      meta_title: article.metaTitle,
      meta_description: article.metaDescription,
      og_title: article.ogTitle,
      og_description: article.ogDescription,
      image_alt: article.imageAlt,
      faq_json: article.faqJson,
      published: true,
      workflow_status: 'published',
      content_format: 'legacy_ejs',
      generated_by_ai: false
    },
    metadata: {
      primary_keyword: topic.primaryKeyword,
      secondary_keywords: topic.secondaryKeywords,
      search_intent: topic.searchIntent,
      target_audience: topic.targetAudience,
      region_focus: 'Berlin',
      content_cluster: topic.contentCluster,
      business_goal: topic.businessGoal,
      cta_type: topic.ctaType,
      internal_links_json: seoBrief.internalLinks,
      source_references_json: [],
      seo_brief_json: seoBrief,
      quality_score: 91,
      quality_report_json: review,
      generation_metadata_json: { promptVersions: ['2026-07-10.1'] }
    }
  }, db);

  assert.deepEqual(result, {
    post: postRow,
    metadata: metadataRow,
    created: true,
    referencedImagePublicId: null
  });
  assert.deepEqual(db.events.map(({ sql }) => sql), [
    'CONNECT',
    'BEGIN',
    db.events[2].sql,
    db.events[3].sql,
    'COMMIT',
    'RELEASE'
  ]);
  assert.match(db.events[2].sql, /featured, published, description/i);
  assert.match(db.events[2].sql, /faq_json, workflow_status, meta_title/i);
  assert.match(db.events[2].sql, /image_alt, content_format, generated_by_ai/i);
  assert.match(db.events[2].sql, /generation_run_id/i);
  assert.match(db.events[2].sql, /ON CONFLICT \(generation_run_id\) DO UPDATE SET generation_run_id = EXCLUDED\.generation_run_id/i);
  assert.match(db.events[2].sql, /false, false, \$8, \$9, 'needs_review'/i);
  assert.equal(db.events[2].params.at(-1), 71);
  assert.equal(db.events[2].params.includes(article.metaDescription), true);
  assert.match(db.events[3].sql, /INSERT INTO content_post_metadata/i);
  assert.match(db.events[3].sql, /ON CONFLICT \(post_id\) DO UPDATE SET post_id = EXCLUDED\.post_id/i);
});

test('BlogPostModel.createAIDraft gibt bei derselben Run-ID denselben Post und geprüfte Metadaten zurück', async () => {
  const postRow = {
    id: 53,
    slug: article.slug,
    generation_run_id: 72,
    published: false,
    workflow_status: 'needs_review',
    content_format: 'static_html',
    generated_by_ai: true
  };
  const metadataRow = { post_id: 53, quality_score: 93, primary_keyword: topic.primaryKeyword };
  const db = createTransactionalDb([
    {}, { rows: [{ ...postRow, _created: true }] }, { rows: [metadataRow] }, {},
    {}, { rows: [{ ...postRow, _created: false }] }, { rows: [metadataRow] }, {}
  ]);
  const input = {
    generationRunId: 72,
    post: {
      title: article.title,
      slug: article.slug,
      content: article.contentHtml
    },
    metadata: {
      primary_keyword: topic.primaryKeyword,
      quality_score: 93
    }
  };

  const first = await BlogPostModel.createAIDraft(input, db);
  const second = await BlogPostModel.createAIDraft({
    ...input,
    post: { ...input.post, title: 'Schwächerer Retry-Titel' },
    metadata: { ...input.metadata, quality_score: 80 }
  }, db);

  assert.deepEqual(first, {
    post: postRow,
    metadata: metadataRow,
    created: true,
    referencedImagePublicId: null
  });
  assert.deepEqual(second, { ...first, created: false });
  const postCalls = db.events.filter(({ sql }) => /^INSERT INTO posts/i.test(sql));
  const metadataCalls = db.events.filter(({ sql }) => /^INSERT INTO content_post_metadata/i.test(sql));
  assert.equal(postCalls.length, 2);
  assert.equal(metadataCalls.length, 2);
  assert.equal(postCalls.every(({ sql }) => /ON CONFLICT \(generation_run_id\)/i.test(sql)), true);
  assert.equal(metadataCalls.every(({ sql }) => /ON CONFLICT \(post_id\)/i.test(sql)), true);
  assert.equal(metadataCalls.every(({ sql }) => !/quality_score = EXCLUDED\.quality_score/i.test(sql)), true);
});

test('BlogPostModel.createAIDraft verlangt eine positive generationRunId vor dem Connect', async () => {
  let connects = 0;
  const db = { async connect() { connects += 1; throw new Error('darf nicht verbinden'); } };

  await assert.rejects(
    BlogPostModel.createAIDraft({ post: { title: article.title }, metadata: {} }, db),
    /generationRunId/i
  );
  assert.equal(connects, 0);
});

test('BlogPostModel.createAIDraft rollt bei einem Metadatenfehler zurück', async () => {
  const error = new Error('Metadaten fehlgeschlagen');
  const db = createTransactionalDb([
    {},
    { rows: [{ id: 52 }] },
    { error },
    {}
  ]);

  await assert.rejects(BlogPostModel.createAIDraft({
    generationRunId: 73,
    post: { title: article.title, content: article.contentHtml, meta_description: article.metaDescription },
    metadata: {}
  }, db), error);

  assert.deepEqual(db.events.map(({ sql }) => sql).slice(-2), ['ROLLBACK', 'RELEASE']);
});

test('BlogPostModel kennzeichnet Insert oder Konflikt und liest KI-Drafts über generation_run_id', async () => {
  const postRow = {
    id: 54,
    generation_run_id: 74,
    hero_public_id: 'blog_images/referenziert',
    _created: false
  };
  const metadataRow = { post_id: 54, quality_score: 90 };
  const writeDb = createTransactionalDb([{}, { rows: [postRow] }, { rows: [metadataRow] }, {}]);
  const write = await BlogPostModel.createAIDraft({
    generationRunId: 74,
    post: { title: article.title, content: article.contentHtml },
    metadata: { quality_score: 90 }
  }, writeDb);

  assert.equal(write.created, false);
  assert.equal(write.referencedImagePublicId, 'blog_images/referenziert');
  assert.match(writeDb.events[2].sql, /\(xmax = 0\) AS _created/i);

  const readDb = {
    async query(sql, params) {
      assert.match(sql, /WHERE p\.generation_run_id = \$1/i);
      assert.deepEqual(params, [74]);
      return { rows: [{ ...postRow, metadata: metadataRow }] };
    }
  };
  const read = await BlogPostModel.findAIDraftByGenerationRunId(74, readDb);
  assert.equal(read.post.id, 54);
  assert.deepEqual(read.metadata, metadataRow);
});

test('unklarer Draft-Commit wird per generation_run_id aufgelöst ohne referenziertes Bild zu löschen', async () => {
  const commitError = new Error('Verbindung nach COMMIT unterbrochen');
  const deleted = [];
  const existing = {
    ...persistedDraft,
    post: { ...persistedDraft.post, hero_public_id: 'blog_images/article-run' }
  };
  const harness = createDependencies({
    draftRepository: {
      async createAIDraft() { throw commitError; },
      async findAIDraftByGenerationRunId() { return existing; }
    },
    imageService: {
      ...createDependencies().dependencies.imageService,
      async deleteImage({ publicId }) { deleted.push(publicId); return { status: 'completed', publicId }; }
    }
  });

  const result = await runDraftPipeline({ runId: 302 }, harness.dependencies);
  assert.equal(result.status, 'completed');
  assert.equal(result.post.id, existing.post.id);
  assert.deepEqual(deleted, []);
});

test('Konflikt-Draft mit anderer Public-ID bereinigt ausschließlich das neue unreferenzierte Bild', async () => {
  const deleted = [];
  const existing = {
    ...persistedDraft,
    created: false,
    referencedImagePublicId: 'blog_images/bestehend',
    post: { ...persistedDraft.post, hero_public_id: 'blog_images/bestehend' }
  };
  const harness = createDependencies({
    draftRepository: { async createAIDraft() { return existing; } },
    imageService: {
      ...createDependencies().dependencies.imageService,
      async deleteImage({ publicId }) { deleted.push(publicId); return { status: 'completed', publicId }; }
    }
  });

  const result = await runDraftPipeline({ runId: 303 }, harness.dependencies);
  assert.equal(result.status, 'completed');
  assert.deepEqual(deleted, ['blog_images/article-run']);
  assert.equal(result.post.hero_public_id, 'blog_images/bestehend');
});

test('Cleanupfehler beim Konflikt-Draft gefährdet den referenzierten Entwurf nicht und bleibt auditiert', async () => {
  const existing = {
    ...persistedDraft,
    created: false,
    referencedImagePublicId: 'blog_images/bestehend',
    post: { ...persistedDraft.post, hero_public_id: 'blog_images/bestehend' }
  };
  const harness = createDependencies({
    draftRepository: { async createAIDraft() { return existing; } },
    imageService: {
      ...createDependencies().dependencies.imageService,
      async deleteImage({ publicId }) {
        throw new ContentImageError('Cleanup fehlgeschlagen.', {
          code: 'IMAGE_CLEANUP_FAILED',
          audit: { cleanup: { status: 'failed', publicId, code: 'IMAGE_CLEANUP_FAILED' } }
        });
      }
    }
  });

  const result = await runDraftPipeline({ runId: 304 }, harness.dependencies);
  assert.equal(result.status, 'completed');
  assert.equal(result.post.hero_public_id, 'blog_images/bestehend');
  const cleanup = harness.stageUpdates.find(({ stageId }) => stageId === 'image_cleanup');
  assert.equal(cleanup.stageResult.status, 'failed');
  assert.equal(cleanup.stageResult.publicId, 'blog_images/article-run');
});

test('runDraftPipeline erstellt nach bestandener Validierung und Review einen unveröffentlichten KI-Entwurf', async () => {
  const harness = createDependencies();

  const result = await runDraftPipeline({ runId: 7, seedTopics: ['Webdesign Berlin'] }, harness.dependencies);

  const createdPost = harness.createdDrafts[0].post;
  const createdMetadata = harness.createdDrafts[0].metadata;
  assert.equal(createdPost.published, false);
  assert.equal(createdPost.workflow_status, 'needs_review');
  assert.equal(createdPost.content_format, 'static_html');
  assert.equal(createdPost.generated_by_ai, true);
  assert.equal(createdPost.content.endsWith('<!-- sanitized -->'), true);
  assert.equal(createdMetadata.quality_score >= 80, true);
  assert.equal(result.status, 'completed');
  assert.equal(harness.imageCalls.length, 1);
  assert.equal(harness.finishCalls.at(-1).status, 'completed');
  assert.deepEqual(harness.stageUpdates.map(({ currentStage }) => currentStage), [
    'inventory',
    'topic_research',
    'topic_persistence',
    'topic_scoring',
    'seo_brief',
    'article_generation',
    'validation',
    'review',
    'image_generation',
    'cloudinary_upload',
    'draft_creation',
    'completed'
  ]);
  assert.equal(new Set(harness.stageUpdates.map(({ stageId }) => stageId)).size, harness.stageUpdates.length);
  assert.deepEqual(harness.budgetReservations.map(({ stageId }) => stageId), [
    'topic_research', 'seo_brief', 'article_generation', 'review', 'image_generation'
  ]);
  assert.deepEqual(harness.budgetSettlements.map(({ stageId }) => stageId), [
    'topic_research', 'seo_brief', 'article_generation', 'review', 'image_generation'
  ]);
  assert.equal(harness.reviewInputs[0].article.contentHtml.endsWith('<!-- sanitized -->'), true);
  assert.equal(harness.events.at(-2).stageId, 'completed');
  assert.deepEqual(harness.events.at(-1), { type: 'finish', status: 'completed' });
});

test('aktuelle Themen ohne zwei validierte Quellen enden ohne Bild und Draft', async () => {
  const currentTopic = { ...topic, requiresCurrentSources: true };
  const harness = createDependencies({
    openaiService: {
      createTopicCandidates: operation({ candidates: [currentTopic] }, 'resp-topic'),
      researchCurrentSources: operation([{ title: 'Eine Quelle', url: 'https://example.test/1' }], 'resp-sources'),
      createSeoBrief: operation(seoBrief, 'resp-brief'),
      generateArticle: operation(article, 'resp-article'),
      reviewArticle: operation(review, 'resp-review'),
      repairArticle: operation(article, 'resp-repair')
    }
  });

  const result = await runDraftPipeline({ runId: 8 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
  assert.equal(harness.finishCalls.at(-1).status, 'needs_manual_attention');
  assert.equal(harness.stageUpdates.some(({ currentStage }) => currentStage === 'source_research'), true);
});

test('ein Mindestquellenfehler des Rechercheadapters endet ebenfalls manuell', async () => {
  const currentTopic = { ...topic, requiresCurrentSources: true };
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      createTopicCandidates: operation({ candidates: [currentTopic] }, 'resp-topic'),
      async researchCurrentSources() {
        throw new Error('Aktuelle Quellen reichen für einen Artikel nicht aus.');
      }
    }
  });

  const result = await runDraftPipeline({ runId: 81 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.finishCalls.at(-1).status, 'needs_manual_attention');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('nur zwei unterschiedliche HTTPS-Quellen mit Titel gelten als validiert', async () => {
  const currentTopic = { ...topic, requiresCurrentSources: true };
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      createTopicCandidates: operation({ candidates: [currentTopic] }, 'resp-topic'),
      researchCurrentSources: operation([
        { title: 'Quelle A', url: 'https://example.test/a' },
        { title: 'Duplikat', url: 'https://example.test/a#abschnitt' },
        { title: '', url: 'https://example.test/b' },
        { title: 'Unsicher', url: 'http://example.test/c' }
      ], 'resp-sources')
    }
  });

  const result = await runDraftPipeline({ runId: 82 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('topic_scoring wird auch ohne geeigneten Kandidaten protokolliert', async () => {
  const harness = createDependencies({
    topicScoringService: { selectBestTopic: () => null }
  });

  const result = await runDraftPipeline({ runId: 83 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.stageUpdates.some(({ currentStage }) => currentStage === 'topic_scoring'), true);
  assert.equal(harness.imageCalls.length, 0);
});

test('Reparaturen sind begrenzt und werden mit eindeutigen IDs erneut validiert und reviewt', async () => {
  let repairCalls = 0;
  const lowReview = { ...review, passed: false, score: 70, issues: [{ code: 'quality', repairInstruction: 'Konkreter werden' }] };
  const harness = createDependencies({
    config: {
      maxRevisions: 2,
      monthlyCostLimitEur: 25,
      contentInputCostPerMtok: 2.5,
      contentOutputCostPerMtok: 15,
      reviewInputCostPerMtok: 0.75,
      reviewOutputCostPerMtok: 4.5,
      imageCostEur: 0.041
    },
    openaiService: {
      createTopicCandidates: operation({ candidates: [topic] }, 'resp-topic'),
      researchCurrentSources: operation([], 'resp-sources'),
      createSeoBrief: operation(seoBrief, 'resp-brief'),
      generateArticle: operation(article, 'resp-article'),
      reviewArticle: operation(lowReview, 'resp-review'),
      async repairArticle() {
        repairCalls += 1;
        return { value: { ...article, contentHtml: `<p>Reparatur ${repairCalls}</p>` }, responseId: `resp-repair-${repairCalls}`, usage, promptVersion: '2026-07-10.1' };
      }
    }
  });

  const result = await runDraftPipeline({ runId: 9 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(repairCalls, 2);
  assert.equal(harness.imageCalls.length, 0);
  assert.deepEqual(
    harness.stageUpdates.filter(({ currentStage }) => currentStage === 'repair').map(({ stageId }) => stageId),
    ['repair:1', 'repair:2']
  );
  assert.deepEqual(
    harness.stageUpdates.filter(({ currentStage }) => currentStage === 'validation').map(({ stageId }) => stageId),
    ['validation', 'validation:1', 'validation:2']
  );
  assert.deepEqual(
    harness.stageUpdates.filter(({ currentStage }) => currentStage === 'review').map(({ stageId }) => stageId),
    ['review', 'review:1', 'review:2']
  );
});

test('jede kostenpflichtige Stufe reserviert vor dem Aufruf das Monatsbudget', async () => {
  let topicCalls = 0;
  const budgetError = new ContentBudgetLimitError();
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      async createTopicCandidates() { topicCalls += 1; return operation({ candidates: [topic] }, 'resp-topic')(); }
    },
    costService: {
      async reserveMonthlyBudget() { throw budgetError; },
      async settleMonthlyBudget() {},
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 10 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'budget_limit_reached');
  assert.equal(topicCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
  assert.equal(harness.finishCalls.at(-1).status, 'needs_manual_attention');
});

test('verlorene Lease stoppt vor dem ersten Provideraufruf und ohne Runabschluss', async () => {
  let topicCalls = 0;
  const leaseError = new Error('Lease verloren');
  leaseError.code = 'CONTENT_JOB_LEASE_LOST';
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      async createTopicCandidates() { topicCalls += 1; return operation({ candidates: [topic] }, 'resp-topic')(); }
    }
  });

  await assert.rejects(
    runDraftPipeline({ runId: 301, leaseGuard: async () => { throw leaseError; } }, harness.dependencies),
    leaseError
  );
  assert.equal(topicCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
  assert.equal(harness.finishCalls.length, 0);
});

test('ein Draftfehler nach erfolgreichem Upload bereinigt das injizierte Bild', async () => {
  const deleted = [];
  const draftError = new Error('Draft konnte nicht gespeichert werden');
  const harness = createDependencies({
    imageService: {
      ...createDependencies().dependencies.imageService,
      async deleteImage({ publicId }) { deleted.push(publicId); return { status: 'completed', publicId }; }
    },
    draftRepository: {
      async createAIDraft() { throw draftError; }
    }
  });

  await assert.rejects(runDraftPipeline({ runId: 11 }, harness.dependencies), draftError);

  assert.deepEqual(deleted, ['blog_images/article-run']);
  assert.equal(harness.stageUpdates.some(({ stageId }) => stageId === 'image_cleanup'), true);
  assert.equal(harness.finishCalls.at(-1).status, 'failed');
});

test('ein Fehler nach erfolgreicher Draftanlage löscht das weiterhin referenzierte Bild nicht', async () => {
  const deleted = [];
  const topicError = new Error('Themenstatus konnte nicht aktualisiert werden');
  const harness = createDependencies({
    imageService: {
      ...createDependencies().dependencies.imageService,
      async deleteImage({ publicId }) { deleted.push(publicId); return { status: 'completed', publicId }; }
    },
    topicRepository: {
      async createTopic(value) { return { ...value, id: 17 }; },
      async markTopicUsed() { throw topicError; }
    }
  });

  await assert.rejects(runDraftPipeline({ runId: 12 }, harness.dependencies), topicError);

  assert.equal(harness.createdDrafts.length, 1);
  assert.deepEqual(deleted, []);
  assert.equal(harness.finishCalls.at(-1).status, 'failed');
});

test('ein als Evergreen markiertes Thema wird nach aktuellem SEO-Briefing sicher gestoppt', async () => {
  let articleCalls = 0;
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      createSeoBrief: operation({
        ...seoBrief,
        sourceRequirements: { requiresCurrentSources: true, requiredTopics: ['Aktuelle Rechtslage'] }
      }, 'resp-brief-current'),
      async generateArticle() { articleCalls += 1; return operation(article, 'resp-article')(); }
    }
  });

  const result = await runDraftPipeline({ runId: 101 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(articleCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('spät erkanntes aktuelles Artikelrisiko benötigt Quellen und verhindert Bild sowie Draft', async () => {
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation({
        ...article,
        risk: { ...article.risk, currentClaims: true }
      }, 'resp-current-article')
    }
  });

  const result = await runDraftPipeline({ runId: 102 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('mehr als sechs Quellen werden am Pipeline-Rand abgelehnt', async () => {
  const currentTopic = { ...topic, requiresCurrentSources: true };
  const sources = Array.from({ length: 7 }, (_, index) => ({
    title: `Quelle ${index + 1}`,
    url: `https://example.test/quelle-${index + 1}`
  }));
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      createTopicCandidates: operation({ candidates: [currentTopic] }, 'resp-topic-current'),
      researchCurrentSources: operation(sources, 'resp-seven-sources')
    }
  });

  const result = await runDraftPipeline({ runId: 103 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('nichtleere Modellquellen benötigen zwei bis sechs Einträge und müssen aus der Recherche stammen', async () => {
  const oneSource = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation({
        ...article,
        sourceReferences: [{ title: 'Einzelnachweis', url: 'https://example.test/einzelnachweis' }]
      }, 'resp-one-invented-source')
    }
  });
  const inventedSources = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation({
        ...article,
        sourceReferences: [
          { title: 'Erfunden A', url: 'https://example.test/erfunden-a' },
          { title: 'Erfunden B', url: 'https://example.test/erfunden-b' }
        ]
      }, 'resp-two-invented-sources')
    }
  });

  const [oneResult, inventedResult] = await Promise.all([
    runDraftPipeline({ runId: 113 }, oneSource.dependencies),
    runDraftPipeline({ runId: 114 }, inventedSources.dependencies)
  ]);

  assert.equal(oneResult.status, 'needs_manual_attention');
  assert.equal(inventedResult.status, 'needs_manual_attention');
  assert.equal(oneSource.imageCalls.length + inventedSources.imageCalls.length, 0);
  assert.equal(oneSource.createdDrafts.length + inventedSources.createdDrafts.length, 0);
});

test('ein erst nach Repair erkanntes Rechts- oder Softwarerisiko erzwingt Quellen', async () => {
  let reviewCalls = 0;
  const lowReview = { ...review, passed: false, score: 70, issues: [{ code: 'quality', repairInstruction: 'Präzisieren' }] };
  const harness = createDependencies({
    config: { ...createDependencies().dependencies.config, maxRevisions: 1 },
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      async reviewArticle() {
        reviewCalls += 1;
        return operation(reviewCalls === 1 ? lowReview : review, `resp-review-${reviewCalls}`)();
      },
      repairArticle: operation({
        ...article,
        risk: { ...article.risk, legalClaims: true, softwareVersionClaims: true }
      }, 'resp-risk-repair')
    }
  });

  const result = await runDraftPipeline({ runId: 104 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(reviewCalls, 1);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('Review bewertet exakt die später speicherbare sanitizierte Fassung', async () => {
  const harness = createDependencies({
    validateArticle(value) {
      return { passed: true, sanitizedHtml: `<section>GESPEICHERT:${value.contentHtml}</section>`, issues: [] };
    }
  });

  await runDraftPipeline({ runId: 105 }, harness.dependencies);

  assert.equal(harness.reviewInputs[0].article.contentHtml, harness.createdDrafts[0].post.content);
});

test('statische Euro- und EUR-Preise scheitern am deterministischen Pricing-Gate', async () => {
  const harness = createDependencies({
    config: { ...createDependencies().dependencies.config, maxRevisions: 0 },
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation({
        ...article,
        contentHtml: '<p>Das Angebot kostet 999 EUR und danach 49 € monatlich.</p>',
        risk: { ...article.risk, staticPrices: true }
      }, 'resp-static-price')
    }
  });

  const result = await runDraftPipeline({ runId: 106 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.reviewInputs.length, 0);
  assert.equal(harness.imageCalls.length, 0);
});

test('das Pricing-Gate prüft auch Metadaten, Kurzbeschreibung und FAQ', async () => {
  const harness = createDependencies({
    config: { ...createDependencies().dependencies.config, maxRevisions: 0 },
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation({
        ...article,
        metaDescription: 'Der Einstieg kostet 799 € und diese statische Preisangabe darf nicht gespeichert werden.',
        faqJson: [{ question: 'Was kostet es?', answer: 'Der Preis beträgt EUR 799.' }]
      }, 'resp-static-metadata-price')
    }
  });

  const result = await runDraftPipeline({ runId: 115 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(harness.reviewInputs.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('Repair darf zentrale Pricing-Tokens weder erfinden noch verändern', async () => {
  let reviewCalls = 0;
  const lowReview = { ...review, passed: false, score: 72, issues: [{ code: 'quality', repairInstruction: 'Präzisieren' }] };
  const harness = createDependencies({
    config: { ...createDependencies().dependencies.config, maxRevisions: 1 },
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation({ ...article, contentHtml: '<p>Preis: {{price.start}}</p>' }, 'resp-price-token'),
      async reviewArticle() {
        reviewCalls += 1;
        return operation(reviewCalls === 1 ? lowReview : review, `resp-price-review-${reviewCalls}`)();
      },
      async repairArticle(input) {
        assert.equal(Object.hasOwn(input, 'pricingContext'), false);
        assert.equal(input.issues.some(({ code }) => code === 'pricing_tokens_locked'), true);
        return operation({ ...article, contentHtml: '<p>Preis: {{price.business}}</p>' }, 'resp-price-repair')();
      }
    }
  });

  const result = await runDraftPipeline({ runId: 107 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(reviewCalls, 1);
  assert.equal(harness.imageCalls.length, 0);
});

test('erfolgreicher Repair bewahrt Pricing-Tokens und persistiert erneut sanitiziertes HTML', async () => {
  let reviewCalls = 0;
  const lowReview = { ...review, passed: false, score: 74, issues: [{ code: 'quality', repairInstruction: 'Konkreter schreiben' }] };
  const initial = { ...article, contentHtml: '<p>Start {{price.start}}</p>' };
  const repaired = { ...article, contentHtml: '<p>Repariert {{price.start}}</p>' };
  const harness = createDependencies({
    config: { ...createDependencies().dependencies.config, maxRevisions: 1 },
    validateArticle(value) {
      return { passed: true, sanitizedHtml: `<section>SANITIZED:${value.contentHtml}</section>`, issues: [] };
    },
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation(initial, 'resp-initial-token'),
      async reviewArticle(input) {
        reviewCalls += 1;
        if (reviewCalls === 2) assert.match(input.article.contentHtml, /SANITIZED:.*Repariert/);
        return operation(reviewCalls === 1 ? lowReview : review, `resp-repair-review-${reviewCalls}`)();
      },
      async repairArticle(input) {
        assert.equal(input.issues.some(({ code }) => code === 'pricing_tokens_locked'), true);
        return operation(repaired, 'resp-successful-repair')();
      }
    }
  });

  const result = await runDraftPipeline({ runId: 108 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.match(harness.createdDrafts[0].post.content, /SANITIZED:.*Repariert/);
});

test('Pipelineintegration akzeptiert einen echten validatorgültigen Artikel ohne externe Dienste', async () => {
  const valid = createValidatorValidArticle();
  const harness = createDependencies({
    validateArticle: validateRealArticle,
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      generateArticle: operation(valid, 'resp-validator-valid')
    }
  });

  const result = await runDraftPipeline({ runId: 109 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(harness.createdDrafts[0].post.content.includes('data-cta-location="blog_final"'), true);
});

test('Uploadfehler auditiert Bildkosten, Upload und Service-Cleanup getrennt', async () => {
  const imageService = createContentImageService({
    config: { imageModel: 'gpt-image-test' },
    idFactory: () => 'pipeline-upload-error',
    openai: { images: { async generate() { return { data: [{ b64_json: Buffer.from('bild').toString('base64') }] }; } } },
    cloudinary: {
      uploader: {
        upload_stream(options, callback) { return { on() { return this; }, end() { callback(new Error('Upload intern')); } }; },
        async destroy() { return { result: 'ok' }; }
      }
    }
  });
  const harness = createDependencies({ imageService });

  await assert.rejects(runDraftPipeline({ runId: 110 }, harness.dependencies), ContentImageError);

  assert.equal(harness.budgetSettlements.some(({ stageId, actualCost }) => stageId === 'image_generation' && actualCost === 0.041), true);
  assert.deepEqual(
    harness.stageUpdates.filter(({ stageId }) => ['image_generation', 'cloudinary_upload', 'image_cleanup'].includes(stageId)).map(({ stageId }) => stageId),
    ['image_generation', 'cloudinary_upload', 'image_cleanup']
  );
  assert.equal(harness.stageUpdates.find(({ stageId }) => stageId === 'image_cleanup').stageResult.status, 'completed');
  assert.equal(harness.createdDrafts.length, 0);
});

test('Cleanupfehler nach Draftfehler wird sicher auditiert und verdeckt den Draftfehler nicht', async () => {
  const draftError = new Error('Draft fehlgeschlagen');
  const harness = createDependencies({
    draftRepository: { async createAIDraft() { throw draftError; } },
    imageService: {
      ...createDependencies().dependencies.imageService,
      async deleteImage({ publicId }) {
        throw new ContentImageError('Bildbereinigung fehlgeschlagen.', {
          code: 'IMAGE_CLEANUP_FAILED',
          audit: { cleanup: { status: 'failed', publicId, code: 'IMAGE_CLEANUP_FAILED' } }
        });
      }
    }
  });

  await assert.rejects(runDraftPipeline({ runId: 111 }, harness.dependencies), draftError);

  const cleanup = harness.stageUpdates.find(({ stageId }) => stageId === 'image_cleanup');
  assert.equal(cleanup.stageResult.status, 'failed');
  assert.equal(cleanup.stageResult.code, 'IMAGE_CLEANUP_FAILED');
  assert.doesNotMatch(JSON.stringify(cleanup.stageResult), /Draft fehlgeschlagen/);
});

test('Budgetreservierung umfasst Quellen-, Repair- und erneute Reviewstufen', async () => {
  const currentTopic = { ...topic, requiresCurrentSources: true };
  const sources = [
    { title: 'Quelle A', url: 'https://example.test/a' },
    { title: 'Quelle B', url: 'https://example.test/b' }
  ];
  let reviewCalls = 0;
  const lowReview = { ...review, passed: false, score: 73, issues: [{ code: 'quality', repairInstruction: 'Präzisieren' }] };
  const harness = createDependencies({
    config: { ...createDependencies().dependencies.config, maxRevisions: 1 },
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      createTopicCandidates: operation({ candidates: [currentTopic] }, 'resp-budget-topic'),
      researchCurrentSources: operation(sources, 'resp-budget-sources'),
      createSeoBrief: operation({ ...seoBrief, sourceRequirements: { requiresCurrentSources: true, requiredTopics: ['Aktuelles'] }, sourceReferences: sources }, 'resp-budget-brief'),
      generateArticle: operation({ ...article, sourceReferences: sources }, 'resp-budget-article'),
      async reviewArticle() {
        reviewCalls += 1;
        return operation(reviewCalls === 1 ? lowReview : review, `resp-budget-review-${reviewCalls}`)();
      },
      repairArticle: operation({ ...article, sourceReferences: sources }, 'resp-budget-repair')
    }
  });

  const result = await runDraftPipeline({ runId: 112 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.deepEqual(harness.budgetReservations.map(({ stageId }) => stageId), [
    'topic_research',
    'source_research',
    'seo_brief',
    'article_generation',
    'review',
    'repair:1',
    'review:1',
    'image_generation'
  ]);
  assert.deepEqual(
    harness.budgetSettlements.map(({ stageId }) => stageId),
    harness.budgetReservations.map(({ stageId }) => stageId)
  );
});

test('bestehende reservierte Textstufe ruft den Provider nicht erneut auf', async () => {
  let providerCalls = 0;
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      async createTopicCandidates() { providerCalls += 1; return operation({ candidates: [topic] }, 'resp-neu')(); }
    },
    costService: {
      async reserveMonthlyBudget() {
        return {
          created: false,
          status: 'reserved',
          reservationMonth: '2026-07',
          reservationKey: 'budget:2026-07:topic_research'
        };
      },
      async settleMonthlyBudget() { throw new Error('darf nicht abrechnen'); },
      async getPersistedStageResult() { return null; },
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 201 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_recovery_reserved');
  assert.equal(providerCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
});

test('bestehende abgerechnete Textstufe ohne dauerhaftes Ergebnis stoppt sicher', async () => {
  let providerCalls = 0;
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      async createTopicCandidates() { providerCalls += 1; return operation({ candidates: [topic] }, 'resp-neu')(); }
    },
    costService: {
      async reserveMonthlyBudget() {
        return {
          created: false,
          status: 'settled',
          reservationMonth: '2026-07',
          reservationKey: 'budget:2026-07:topic_research',
          actualCost: 0.01
        };
      },
      async settleMonthlyBudget() { throw new Error('darf nicht abrechnen'); },
      async getPersistedStageResult() { return null; },
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 202 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_recovery_result_missing');
  assert.equal(providerCalls, 0);
});

test('abgerechnete Textstufe verwendet nur ein dauerhaftes vertragsgültiges Ergebnis', async () => {
  let providerCalls = 0;
  const base = createDependencies();
  const harness = createDependencies({
    openaiService: {
      ...base.dependencies.openaiService,
      async createTopicCandidates() { providerCalls += 1; return operation({ candidates: [topic] }, 'resp-neu')(); }
    },
    costService: {
      async reserveMonthlyBudget(input) {
        if (input.stageId === 'topic_research') {
          return {
            created: false,
            status: 'settled',
            reservationMonth: '2026-07',
            reservationKey: 'budget:2026-07:topic_research',
            actualCost: 0.01
          };
        }
        return {
          created: true,
          status: 'reserved',
          reservationMonth: '2026-07',
          reservationKey: `budget:2026-07:${input.stageId}`
        };
      },
      async settleMonthlyBudget() { return { status: 'settled' }; },
      async getPersistedStageResult({ stageId }) {
        if (stageId !== 'topic_research') return null;
        return persistedEnvelope({ candidates: [schemaTopic] });
      },
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 203 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(providerCalls, 0);
});

test('vertragswidrige persistierte Task-6-Werte stoppen ohne erneuten Provideraufruf', async () => {
  const cases = [
    ['topic_research', 'createTopicCandidates', { candidates: [{ topic: 'Unvollständig' }] }],
    ['seo_brief', 'createSeoBrief', { sourceRequirements: { requiresCurrentSources: false } }],
    ['article_generation', 'generateArticle', { title: 'Unvollständig', contentHtml: '<p>Zu kurz</p>' }],
    ['review', 'reviewArticle', { passed: true, score: 95 }]
  ];

  for (const [index, [targetStage, method, invalidValue]] of cases.entries()) {
    let providerCalls = 0;
    const base = createDependencies();
    const harness = createDependencies({
      openaiService: {
        ...base.dependencies.openaiService,
        async [method](input) {
          providerCalls += 1;
          return base.dependencies.openaiService[method](input);
        }
      },
      costService: {
        async reserveMonthlyBudget(input) {
          return {
            created: input.stageId !== targetStage,
            status: input.stageId === targetStage ? 'settled' : 'reserved',
            reservationMonth: '2026-07',
            reservationKey: `budget:2026-07:${input.stageId}`
          };
        },
        async settleMonthlyBudget() { return { status: 'settled' }; },
        async getPersistedStageResult({ stageId }) {
          return stageId === targetStage ? persistedEnvelope(invalidValue) : null;
        },
        estimateTextCost() { return 0.01; }
      }
    });

    const result = await runDraftPipeline({ runId: 260 + index }, harness.dependencies);

    assert.equal(result.status, 'needs_manual_attention', `${targetStage} wurde nicht gestoppt.`);
    assert.equal(result.code, 'provider_recovery_result_missing');
    assert.equal(providerCalls, 0);
    assert.equal(harness.imageCalls.length, 0);
    assert.equal(harness.createdDrafts.length, 0);
  }
});

test('vollständig schemagültige persistierte Providerwerte bleiben wiederverwendbar', async () => {
  const providerCalls = {
    createTopicCandidates: 0,
    createSeoBrief: 0,
    generateArticle: 0,
    reviewArticle: 0
  };
  const base = createDependencies();
  const persisted = {
    topic_research: persistedEnvelope({ candidates: [schemaTopic] }, 'resp-persisted-topic'),
    seo_brief: persistedEnvelope(schemaSeoBrief, 'resp-persisted-brief'),
    article_generation: persistedEnvelope(schemaArticle, 'resp-persisted-article'),
    review: persistedEnvelope(review, 'resp-persisted-review')
  };
  const wrappedOpenai = { ...base.dependencies.openaiService };
  for (const method of Object.keys(providerCalls)) {
    wrappedOpenai[method] = async () => {
      providerCalls[method] += 1;
      throw new Error(`${method} darf nicht aufgerufen werden`);
    };
  }
  const harness = createDependencies({
    openaiService: wrappedOpenai,
    costService: {
      async reserveMonthlyBudget(input) {
        const isPersisted = Object.hasOwn(persisted, input.stageId);
        return {
          created: !isPersisted,
          status: isPersisted ? 'settled' : 'reserved',
          reservationMonth: '2026-07',
          reservationKey: `budget:2026-07:${input.stageId}`
        };
      },
      async settleMonthlyBudget() { return { status: 'settled' }; },
      async getPersistedStageResult({ stageId }) { return persisted[stageId] || null; },
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 264 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.deepEqual(providerCalls, {
    createTopicCandidates: 0,
    createSeoBrief: 0,
    generateArticle: 0,
    reviewArticle: 0
  });
});

test('Retry nach Topicanlage verwendet topic_persistence statt eine zweite Themenzeile anzulegen', async () => {
  let createTopicCalls = 0;
  const base = createDependencies();
  const harness = createDependencies({
    topicRepository: {
      async createTopic() { createTopicCalls += 1; throw new Error('Thema darf nicht erneut angelegt werden'); },
      async markTopicUsed() {}
    },
    costService: {
      ...base.dependencies.costService,
      async getPersistedStageResult({ stageId }) {
        if (stageId === 'topic_persistence') return { topic: { ...topic, id: 17 } };
        return null;
      }
    }
  });

  const result = await runDraftPipeline({ runId: 265 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(createTopicCalls, 0);
  assert.equal(
    harness.stageUpdates.filter(({ stageId }) => stageId === 'topic_persistence').length,
    0
  );
});

test('unvollständige topic_persistence stoppt sicher ohne doppelte Themenanlage', async () => {
  let createTopicCalls = 0;
  const base = createDependencies();
  const harness = createDependencies({
    topicRepository: {
      async createTopic() { createTopicCalls += 1; return { ...topic, id: 17 }; },
      async markTopicUsed() {}
    },
    costService: {
      ...base.dependencies.costService,
      async getPersistedStageResult({ stageId }) {
        if (stageId === 'topic_persistence') return { topic: { id: 17, slug: topic.slug } };
        return null;
      }
    }
  });

  const result = await runDraftPipeline({ runId: 269 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'side_effect_recovery_result_missing');
  assert.equal(createTopicCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('topic_persistence ergänzt das Datenbankergebnis um den vollständigen ausgewählten Topicvertrag', async () => {
  const harness = createDependencies({
    topicRepository: {
      async createTopic(value) {
        return {
          id: 17,
          topic: value.topic,
          primary_keyword: value.primaryKeyword,
          status: 'candidate'
        };
      },
      async markTopicUsed() {}
    }
  });

  const result = await runDraftPipeline({ runId: 270 }, harness.dependencies);
  const persisted = harness.stageUpdates.find(({ stageId }) => stageId === 'topic_persistence');

  assert.equal(result.status, 'completed');
  assert.equal(persisted.stageResult.topic.id, 17);
  assert.equal(persisted.stageResult.topic.slug, topic.slug);
  assert.equal(persisted.stageResult.topic.primaryKeyword, topic.primaryKeyword);
  assert.equal(persisted.stageResult.topic.readerProblem, topic.readerProblem);
});

test('Retry nach Draftanlage schließt den persistierten Draft ohne Provider und Neuanlage ab', async () => {
  let providerCalls = 0;
  let createTopicCalls = 0;
  let createDraftCalls = 0;
  const base = createDependencies();
  const openaiService = Object.fromEntries(Object.entries(base.dependencies.openaiService).map(([name, method]) => [
    name,
    async (...args) => { providerCalls += 1; return method(...args); }
  ]));
  const harness = createDependencies({
    openaiService,
    topicRepository: {
      async createTopic() { createTopicCalls += 1; return { ...topic, id: 17 }; },
      async markTopicUsed() {}
    },
    draftRepository: {
      async createAIDraft() { createDraftCalls += 1; return persistedDraft; }
    },
    costService: {
      ...base.dependencies.costService,
      async getPersistedStageResult({ stageId }) {
        if (stageId === 'draft_creation') return persistedDraft;
        return null;
      }
    }
  });

  const result = await runDraftPipeline({ runId: 266 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(result.post.id, 41);
  assert.equal(providerCalls, 0);
  assert.equal(createTopicCalls, 0);
  assert.equal(createDraftCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.stageUpdates.some(({ stageId }) => stageId === 'completed'), true);
});

test('unmittelbarer Guard vor createAIDraft verwendet einen inzwischen persistierten Draft', async () => {
  let draftReads = 0;
  let createDraftCalls = 0;
  const base = createDependencies();
  const harness = createDependencies({
    draftRepository: {
      async createAIDraft() { createDraftCalls += 1; return persistedDraft; }
    },
    costService: {
      ...base.dependencies.costService,
      async getPersistedStageResult({ stageId }) {
        if (stageId !== 'draft_creation') return null;
        draftReads += 1;
        return draftReads === 1 ? null : persistedDraft;
      }
    }
  });

  const result = await runDraftPipeline({ runId: 268 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(draftReads >= 2, true);
  assert.equal(createDraftCalls, 0);
});

test('Retry nach completed liefert den persistierten Draft ohne weitere Seiteneffekte', async () => {
  let providerCalls = 0;
  let createTopicCalls = 0;
  let createDraftCalls = 0;
  const base = createDependencies();
  const openaiService = Object.fromEntries(Object.entries(base.dependencies.openaiService).map(([name, method]) => [
    name,
    async (...args) => { providerCalls += 1; return method(...args); }
  ]));
  const harness = createDependencies({
    openaiService,
    topicRepository: {
      async createTopic() { createTopicCalls += 1; return { ...topic, id: 17 }; },
      async markTopicUsed() {}
    },
    draftRepository: {
      async createAIDraft() { createDraftCalls += 1; return persistedDraft; }
    },
    costService: {
      ...base.dependencies.costService,
      async getPersistedStageResult({ stageId }) {
        if (stageId === 'draft_creation') return persistedDraft;
        if (stageId === 'completed') {
          return { postId: 41, slug: article.slug, topicId: 17, qualityScore: review.score };
        }
        return null;
      }
    }
  });

  const result = await runDraftPipeline({ runId: 267 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(result.post.id, 41);
  assert.equal(providerCalls, 0);
  assert.equal(createTopicCalls, 0);
  assert.equal(createDraftCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.stageUpdates.length, 0);
  assert.equal(harness.finishCalls.length, 1);
  assert.equal(harness.finishCalls[0].status, 'completed');
});

test('unvollständige persistierte Draftdaten stoppen vor jeder neuen Arbeit', async () => {
  const cases = [
    { ...persistedDraft, topicId: 0 },
    { ...persistedDraft, qualityScore: 79 },
    { ...persistedDraft, metadata: { ...persistedDraft.metadata, quality_score: 79 } },
    { ...persistedDraft, metadata: { ...persistedDraft.metadata, post_id: 999 } }
  ];

  for (const [index, invalidDraft] of cases.entries()) {
    const base = createDependencies();
    const harness = createDependencies({
      costService: {
        ...base.dependencies.costService,
        async getPersistedStageResult({ stageId }) {
          return stageId === 'draft_creation' ? invalidDraft : null;
        }
      }
    });

    const result = await runDraftPipeline({ runId: 280 + index }, harness.dependencies);
    assert.equal(result.status, 'needs_manual_attention');
    assert.equal(result.code, 'side_effect_recovery_result_missing');
    assert.equal(harness.budgetReservations.length, 0);
    assert.equal(harness.imageCalls.length, 0);
    assert.equal(harness.createdDrafts.length, 0);
  }
});

test('completed-Recovery verlangt exakt passende Post-, Slug-, Topic- und Qualitätswerte', async () => {
  const cases = [
    { postId: 999, slug: article.slug, topicId: 17, qualityScore: review.score },
    { postId: 41, slug: 'anderer-slug', topicId: 17, qualityScore: review.score },
    { postId: 41, slug: article.slug, topicId: 999, qualityScore: review.score },
    { postId: 41, slug: article.slug, topicId: 17, qualityScore: 90 }
  ];

  for (const [index, invalidCompleted] of cases.entries()) {
    const base = createDependencies();
    const harness = createDependencies({
      costService: {
        ...base.dependencies.costService,
        async getPersistedStageResult({ stageId }) {
          if (stageId === 'draft_creation') return persistedDraft;
          if (stageId === 'completed') return invalidCompleted;
          return null;
        }
      }
    });

    const result = await runDraftPipeline({ runId: 284 + index }, harness.dependencies);
    assert.equal(result.status, 'needs_manual_attention');
    assert.equal(result.code, 'side_effect_recovery_result_missing');
    assert.equal(harness.budgetReservations.length, 0);
    assert.equal(harness.createdDrafts.length, 0);
  }
});

test('completed-Recovery versucht finishRun erneut und behält Fehler als Auditwarnung', async () => {
  const base = createDependencies();
  const finishCalls = [];
  const harness = createDependencies({
    costService: {
      ...base.dependencies.costService,
      async getPersistedStageResult({ stageId }) {
        if (stageId === 'draft_creation') return persistedDraft;
        if (stageId === 'completed') {
          return { postId: 41, slug: article.slug, topicId: 17, qualityScore: review.score };
        }
        return null;
      }
    },
    runRepository: {
      async updateRunStage() { throw new Error('darf nicht aktualisieren'); },
      async finishRun(runId, update) {
        finishCalls.push({ runId, ...update });
        throw new Error('Abschluss bleibt vorübergehend nicht speicherbar');
      }
    }
  });

  const result = await runDraftPipeline({ runId: 288 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.deepEqual(finishCalls.map(({ status }) => status), ['completed']);
  assert.equal(result.auditWarnings.some(({ code }) => code === 'RUN_COMPLETION_PERSIST_FAILED'), true);
  assert.equal(harness.budgetReservations.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('Pipeline übergibt die Run-ID an Topic- und Draft-Upserts', async () => {
  const generationRunIds = { topic: [], draft: [] };
  const base = createDependencies();
  const harness = createDependencies({
    topicRepository: {
      async createTopic(value) {
        generationRunIds.topic.push(value.generationRunId);
        return { ...value, id: 17 };
      },
      async markTopicUsed() {}
    },
    draftRepository: {
      async createAIDraft(input) {
        generationRunIds.draft.push(input.generationRunId);
        return base.dependencies.draftRepository.createAIDraft(input);
      }
    }
  });

  const result = await runDraftPipeline({ runId: 289 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.deepEqual(generationRunIds, { topic: [289], draft: [289] });
});

test('Crash vor Stage-Persistenz verwendet vorhandene Topic- und Draftzeilen derselben Run-ID', async () => {
  const topics = new Map([[290, { ...topic, id: 170, generation_run_id: 290 }]]);
  const drafts = new Map([[290, {
    post: { ...persistedDraft.post, id: 410, generation_run_id: 290 },
    metadata: { ...persistedDraft.metadata, post_id: 410 },
    topicId: 170,
    qualityScore: review.score
  }]]);
  const base = createDependencies();
  const harness = createDependencies({
    topicRepository: {
      async createTopic(value) {
        if (!topics.has(value.generationRunId)) topics.set(value.generationRunId, { ...value, id: 171 });
        return topics.get(value.generationRunId);
      },
      async markTopicUsed() {}
    },
    draftRepository: {
      async createAIDraft(input) {
        if (!drafts.has(input.generationRunId)) {
          drafts.set(input.generationRunId, base.dependencies.draftRepository.createAIDraft(input));
        }
        return drafts.get(input.generationRunId);
      }
    }
  });

  const result = await runDraftPipeline({ runId: 290 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(result.post.id, 410);
  assert.equal(topics.size, 1);
  assert.equal(drafts.size, 1);
  assert.equal(
    harness.stageUpdates.find(({ stageId }) => stageId === 'topic_persistence').stageResult.topic.id,
    170
  );
  assert.equal(
    harness.stageUpdates.find(({ stageId }) => stageId === 'draft_creation').stageResult.post.id,
    410
  );
});

test('bestehende Bildreservierung verhindert einen erneuten Bildprovideraufruf', async () => {
  const harness = createDependencies({
    costService: {
      async reserveMonthlyBudget(input) {
        return {
          created: input.stageId !== 'image_generation',
          status: 'reserved',
          reservationMonth: '2026-07',
          reservationKey: `budget:2026-07:${input.stageId}`
        };
      },
      async settleMonthlyBudget() { return { status: 'settled' }; },
      async getPersistedStageResult() { return null; },
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 204 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_recovery_reserved');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('abgerechnete Bildstufe nutzt ausschließlich dauerhaftes Uploadergebnis', async () => {
  const harness = createDependencies({
    costService: {
      async reserveMonthlyBudget(input) {
        return {
          created: input.stageId !== 'image_generation',
          status: input.stageId === 'image_generation' ? 'settled' : 'reserved',
          reservationMonth: '2026-07',
          reservationKey: `budget:2026-07:${input.stageId}`
        };
      },
      async settleMonthlyBudget() { return { status: 'settled' }; },
      async getPersistedStageResult({ stageId }) {
        if (stageId === 'image_generation') return { status: 'completed', costIncurred: true };
        if (stageId === 'cloudinary_upload') {
          return {
            status: 'completed',
            imageUrl: 'https://cdn.example.test/persisted.webp',
            publicId: 'blog_images/persisted',
            bytes: 123
          };
        }
        return null;
      },
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 205 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts[0].post.hero_public_id, 'blog_images/persisted');
});

test('Pricing-Integrity umfasst Kategorie, SEO, Lead, FAQ und sämtliche Bilddaten', async () => {
  const cases = [
    { category: 'Paket für 1 299 Euro' },
    { category: 'Paket für € 799' },
    { category: 'Paket für &euro; 799' },
    { category: 'Paket für &#8364; 799' },
    { seo: { ...article.seo, primaryKeyword: 'Website für 799&euro;' } },
    { lead: { ...article.lead, businessGoal: 'Projektwert 799&#8364;' } },
    { faqJson: [{ question: 'Preis?', answer: 'Der Aufwand liegt bei 1.299,00&nbsp;Euro.' }] },
    { imagePrompt: 'Arbeitsszene für ein Budget von 799 Euro' },
    { imageAlt: 'Projekt im Wert von 799&euro;' },
    { imageFilename: 'projekt-799-euro.webp' }
  ];

  for (const [index, overrides] of cases.entries()) {
    const harness = createDependencies({
      config: { ...createDependencies().dependencies.config, maxRevisions: 0 },
      openaiService: {
        ...createDependencies().dependencies.openaiService,
        generateArticle: operation({ ...article, ...overrides }, `resp-pricing-field-${index}`)
      }
    });
    const result = await runDraftPipeline({ runId: 220 + index }, harness.dependencies);
    assert.equal(result.status, 'needs_manual_attention', `Pricingfall ${index} wurde nicht blockiert.`);
    assert.equal(harness.createdDrafts.length, 0);
  }
});

test('statischer Preis im späteren seo_brief_json stoppt vor dem Writer', async () => {
  let articleCalls = 0;
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      createSeoBrief: operation({ ...seoBrief, businessGoal: 'Projekt für 1 299 Euro' }, 'resp-priced-brief'),
      async generateArticle() { articleCalls += 1; return operation(article, 'resp-article')(); }
    }
  });

  const result = await runDraftPipeline({ runId: 230 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'pricing_integrity_failed');
  assert.equal(articleCalls, 0);
});

test('Review-Risiko staticPrices blockiert auch passed=true vor und nach Repair', async () => {
  let reviewCalls = 0;
  let repairCalls = 0;
  const riskyReview = { ...review, passed: true, score: 95, risks: { ...review.risks, staticPrices: true } };
  const harness = createDependencies({
    config: { ...createDependencies().dependencies.config, maxRevisions: 1 },
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      async reviewArticle() { reviewCalls += 1; return operation(riskyReview, `resp-risky-review-${reviewCalls}`)(); },
      async repairArticle() { repairCalls += 1; return operation(article, 'resp-risky-repair')(); }
    }
  });

  const result = await runDraftPipeline({ runId: 231 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(reviewCalls, 2);
  assert.equal(repairCalls, 1);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});

test('Cleanup-Auditfehler verdeckt den Draftfehler nicht und Runabschluss wird versucht', async () => {
  for (const cleanupFails of [false, true]) {
    const draftError = new Error(`Primärer Draftfehler ${cleanupFails}`);
    const finishAttempts = [];
    const harness = createDependencies({
      draftRepository: { async createAIDraft() { throw draftError; } },
      imageService: {
        ...createDependencies().dependencies.imageService,
        async deleteImage({ publicId }) {
          if (cleanupFails) {
            throw new ContentImageError('Cleanup fehlgeschlagen.', {
              code: 'IMAGE_CLEANUP_FAILED',
              audit: { cleanup: { status: 'failed', publicId, code: 'IMAGE_CLEANUP_FAILED' } }
            });
          }
          return { status: 'completed', publicId };
        }
      },
      runRepository: {
        async updateRunStage(runId, update) {
          if (update.stageId === 'image_cleanup') throw new Error('Sekundärer Auditfehler');
          return { runId, ...update };
        },
        async finishRun(runId, update) { finishAttempts.push({ runId, ...update }); return update; }
      }
    });

    await assert.rejects(runDraftPipeline({ runId: cleanupFails ? 241 : 240 }, harness.dependencies), draftError);
    assert.equal(finishAttempts.some(({ status }) => status === 'failed'), true);
    assert.equal(Array.isArray(draftError.auditWarnings), true);
    assert.equal(draftError.auditWarnings.some(({ code }) => code === 'STAGE_AUDIT_FAILED'), true);
  }
});

test('Settlement- und Bildauditfehler verdecken den primären Providerfehler nicht', async () => {
  const providerError = new ContentImageError('Primärer Providerfehler.', {
    code: 'IMAGE_UPLOAD_FAILED',
    audit: {
      imageGeneration: { status: 'completed', costIncurred: true },
      upload: { status: 'failed', code: 'IMAGE_UPLOAD_FAILED' },
      cleanup: { status: 'failed', code: 'IMAGE_CLEANUP_FAILED' }
    }
  });
  const finishAttempts = [];
  const base = createDependencies();
  const harness = createDependencies({
    imageService: {
      ...base.dependencies.imageService,
      async generateAndUploadImage() { throw providerError; }
    },
    costService: {
      ...base.dependencies.costService,
      async settleMonthlyBudget(input) {
        if (input.stageId === 'image_generation') throw new Error('Sekundärer Settlementfehler');
        return { status: 'settled' };
      }
    },
    runRepository: {
      async updateRunStage(runId, update) {
        if (['image_generation', 'cloudinary_upload', 'image_cleanup'].includes(update.stageId)) {
          throw new Error('Sekundärer Bildauditfehler');
        }
        return { runId, ...update };
      },
      async finishRun(runId, update) { finishAttempts.push({ runId, ...update }); return update; }
    }
  });

  await assert.rejects(runDraftPipeline({ runId: 242 }, harness.dependencies), providerError);

  assert.equal(finishAttempts.some(({ status }) => status === 'failed'), true);
  assert.equal(providerError.auditWarnings.some(({ code }) => code === 'BUDGET_SETTLEMENT_FAILED'), true);
  assert.equal(providerError.auditWarnings.some(({ code }) => code === 'STAGE_AUDIT_FAILED'), true);
});

test('Fehler nach Draft und completed-Stage liefert erfolgreichen Status mit Auditwarnung', async () => {
  const finishCalls = [];
  const harness = createDependencies({
    runRepository: {
      async updateRunStage(runId, update) { return { runId, ...update }; },
      async finishRun(runId, update) {
        finishCalls.push({ runId, ...update });
        if (update.status === 'completed') throw new Error('Abschlusszeile nicht speicherbar');
        return update;
      }
    }
  });

  const result = await runDraftPipeline({ runId: 243 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(harness.createdDrafts.length, 1);
  assert.equal(result.auditWarnings.some(({ code }) => code === 'RUN_COMPLETION_PERSIST_FAILED'), true);
  assert.deepEqual(finishCalls.map(({ status }) => status), ['completed']);
});

test('fehlende Abschlusszeile liefert completed mit persistierter Warnung', async () => {
  const harness = createDependencies({
    runRepository: {
      async updateRunStage(runId, update) { return { runId, ...update }; },
      async finishRun() { return null; }
    }
  });

  const result = await runDraftPipeline({ runId: 244 }, harness.dependencies);

  assert.equal(result.status, 'completed');
  assert.equal(result.auditWarnings.some(({ code }) => code === 'RUN_COMPLETION_PERSIST_FAILED'), true);
});

test('persistierter Bildupload mit null Bytes wird nicht wiederverwendet', async () => {
  const harness = createDependencies({
    costService: {
      async reserveMonthlyBudget(input) {
        return {
          created: input.stageId !== 'image_generation',
          status: input.stageId === 'image_generation' ? 'settled' : 'reserved',
          reservationMonth: '2026-07',
          reservationKey: `budget:2026-07:${input.stageId}`
        };
      },
      async settleMonthlyBudget() { return { status: 'settled' }; },
      async getPersistedStageResult({ stageId }) {
        if (stageId === 'image_generation') return { status: 'completed', costIncurred: true };
        if (stageId === 'cloudinary_upload') {
          return {
            status: 'completed',
            imageUrl: 'https://cdn.example.test/leer.webp',
            publicId: 'blog_images/leer',
            bytes: 0
          };
        }
        return null;
      },
      estimateTextCost() { return 0.01; }
    }
  });

  const result = await runDraftPipeline({ runId: 245 }, harness.dependencies);

  assert.equal(result.status, 'needs_manual_attention');
  assert.equal(result.code, 'provider_recovery_result_missing');
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
});
