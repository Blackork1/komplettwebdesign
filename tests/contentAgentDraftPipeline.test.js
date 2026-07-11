import test from 'node:test';
import assert from 'node:assert/strict';

import BlogPostModel from '../models/BlogPostModel.js';
import { generateAndUploadImage } from '../services/contentAgent/contentImageService.js';
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
  sourceReferences: []
};

const review = {
  passed: true,
  score: 91,
  summary: 'Freigabefähiger Entwurf.',
  strengths: ['Klare Struktur'],
  issues: [],
  recommendedActions: [],
  requiresManualReview: false,
  risks: {}
};

function operation(value, responseId) {
  return async () => ({ value, responseId, usage, promptVersion: '2026-07-10.1' });
}

function createDependencies(overrides = {}) {
  const stageUpdates = [];
  const finishCalls = [];
  const budgetChecks = [];
  const createdDrafts = [];
  const imageCalls = [];

  const dependencies = {
    config: {
      maxRevisions: 2,
      monthlyCostLimitEur: 25,
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
          packages: [{ name: 'Start', priceLabel: 'ab 1.000 €' }],
          approvedLinks: [{ url: '/kontakt' }]
        };
      }
    },
    openaiService: {
      createTopicCandidates: operation({ candidates: [topic] }, 'resp-topic'),
      researchCurrentSources: operation([], 'resp-sources'),
      createSeoBrief: operation(seoBrief, 'resp-brief'),
      generateArticle: operation(article, 'resp-article'),
      reviewArticle: operation(review, 'resp-review'),
      repairArticle: operation(article, 'resp-repair')
    },
    topicScoringService: { selectBestTopic: (candidates) => candidates[0] },
    topicRepository: {
      async createTopic(value) { return { ...value, id: 17 }; },
      async markTopicUsed() {}
    },
    runRepository: {
      async updateRunStage(runId, update) {
        stageUpdates.push({ runId, ...update });
        return update;
      },
      async finishRun(runId, update) {
        finishCalls.push({ runId, ...update });
        return update;
      }
    },
    costService: {
      async getMonthlyContentCost() { return 0; },
      assertMonthlyBudget(input) { budgetChecks.push(input); },
      estimateTextCost() { return 0.01; }
    },
    validateArticle(value) {
      return { passed: true, sanitizedHtml: `${value.contentHtml}<!-- sanitized -->`, issues: [] };
    },
    imageService: {
      async generateAndUploadImage(input) {
        imageCalls.push(input);
        return { imageUrl: 'https://cdn.example.test/article.webp', publicId: 'blog_images/article', bytes: 321 };
      }
    },
    async deleteUploadedImage() {},
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

  return { dependencies, stageUpdates, finishCalls, budgetChecks, createdDrafts, imageCalls };
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
      }
    }
  };

  const result = await generateAndUploadImage({
    prompt: 'Professionelle Arbeitsszene',
    filename: '../../Üble Datei!!.webp',
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
    public_id: 'uble-datei'
  });
  assert.deepEqual(result, {
    imageUrl: 'https://cdn.example.test/sicher.webp',
    publicId: 'blog_images/uble-datei',
    bytes: Buffer.byteLength('bilddaten')
  });
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
    'draft_creation'
  ]);
  assert.equal(new Set(harness.stageUpdates.map(({ stageId }) => stageId)).size, harness.stageUpdates.length);
  assert.equal(harness.budgetChecks.length, 5);
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

test('jede kostenpflichtige Stufe prüft vor dem Aufruf das Monatsbudget', async () => {
  let topicCalls = 0;
  const budgetError = new Error('Monatliches Content-Agent-Budget erreicht.');
  const harness = createDependencies({
    openaiService: {
      ...createDependencies().dependencies.openaiService,
      async createTopicCandidates() { topicCalls += 1; return operation({ candidates: [topic] }, 'resp-topic')(); }
    },
    costService: {
      async getMonthlyContentCost() { return 24.95; },
      assertMonthlyBudget() { throw budgetError; },
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
    async deleteUploadedImage(publicId) { deleted.push(publicId); },
    draftRepository: {
      async createAIDraft() { throw draftError; }
    }
  });

  await assert.rejects(runDraftPipeline({ runId: 11 }, harness.dependencies), draftError);

  assert.deepEqual(deleted, ['blog_images/article']);
  assert.equal(harness.finishCalls.at(-1).status, 'failed');
});

test('ein Fehler nach erfolgreicher Draftanlage löscht das weiterhin referenzierte Bild nicht', async () => {
  const deleted = [];
  const topicError = new Error('Themenstatus konnte nicht aktualisiert werden');
  const harness = createDependencies({
    async deleteUploadedImage(publicId) { deleted.push(publicId); },
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
