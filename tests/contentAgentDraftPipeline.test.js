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
      async reserveMonthlyBudget(input) { budgetReservations.push(input); return { status: 'reserved' }; },
      async settleMonthlyBudget(input) { budgetSettlements.push(input); return { status: 'settled' }; },
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
          metadata: { ...input.metadata }
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

  assert.deepEqual(result, { post: postRow, metadata: metadataRow });
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
  assert.match(db.events[2].sql, /false, false, \$8, \$9, 'needs_review'/i);
  assert.match(db.events[2].sql, /'static_html', true, NOW\(\), NOW\(\)/i);
  assert.equal(db.events[2].params.includes(article.metaDescription), true);
  assert.match(db.events[3].sql, /INSERT INTO content_post_metadata/i);
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
    post: { title: article.title, content: article.contentHtml, meta_description: article.metaDescription },
    metadata: {}
  }, db), error);

  assert.deepEqual(db.events.map(({ sql }) => sql).slice(-2), ['ROLLBACK', 'RELEASE']);
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
  const budgetError = new Error('Monatliches Content-Agent-Budget erreicht.');
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

  await assert.rejects(runDraftPipeline({ runId: 10 }, harness.dependencies), budgetError);

  assert.equal(topicCalls, 0);
  assert.equal(harness.imageCalls.length, 0);
  assert.equal(harness.createdDrafts.length, 0);
  assert.equal(harness.finishCalls.at(-1).status, 'failed');
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
