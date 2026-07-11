function required(value, name) {
  if (!value) throw new TypeError(`Die Abhängigkeit ${name} wird benötigt.`);
  return value;
}

function textRates(config, stage) {
  if (stage === 'review') {
    return {
      inputRate: config.reviewInputCostPerMtok,
      outputRate: config.reviewOutputCostPerMtok
    };
  }
  return {
    inputRate: config.contentInputCostPerMtok,
    outputRate: config.contentOutputCostPerMtok
  };
}

function estimatedTextStageCost(config, stage) {
  if (stage === 'review') return Number(config.estimatedReviewStageCostEur ?? 0.25);
  return Number(config.estimatedContentStageCostEur ?? 0.50);
}

function generationMetadata(results) {
  return {
    promptVersions: results.map(({ promptVersion }) => promptVersion).filter(Boolean),
    responseIds: results.map(({ responseId }) => responseId).filter(Boolean)
  };
}

function validateSourceReferences(sources) {
  const validated = [];
  const seenUrls = new Set();
  for (const source of Array.isArray(sources) ? sources : []) {
    const title = typeof source?.title === 'string' ? source.title.replace(/\s+/g, ' ').trim() : '';
    if (!title) continue;
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:') continue;
      url.hash = '';
      const normalizedUrl = url.toString();
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);
      validated.push({ ...source, title, url: normalizedUrl });
    } catch {
      // Schemawidrige Quellen werden nicht in den Artikelkontext übernommen.
    }
  }
  return validated;
}

export async function runDraftPipeline(input = {}, dependencies = {}) {
  const config = required(dependencies.config, 'config');
  const inventoryService = required(dependencies.inventoryService, 'inventoryService');
  const openaiService = required(dependencies.openaiService, 'openaiService');
  const topicScoringService = required(dependencies.topicScoringService, 'topicScoringService');
  const topicRepository = required(dependencies.topicRepository, 'topicRepository');
  const runRepository = required(dependencies.runRepository, 'runRepository');
  const costService = required(dependencies.costService, 'costService');
  const validateArticle = required(dependencies.validateArticle, 'validateArticle');
  const imageService = required(dependencies.imageService, 'imageService');
  const draftRepository = required(dependencies.draftRepository, 'draftRepository');
  const deleteUploadedImage = required(dependencies.deleteUploadedImage, 'deleteUploadedImage');
  const runId = input.runId;
  const modelResults = [];
  let uploadedImage = null;
  let draftPersisted = false;

  async function updateStage(currentStage, stageResult = {}, extra = {}) {
    return runRepository.updateRunStage(runId, {
      currentStage,
      stageId: extra.stageId || currentStage,
      stageResult,
      tokenUsage: extra.tokenUsage || {},
      costEstimate: extra.costEstimate || 0,
      responseIds: extra.responseIds || [],
      selectedTopicId: extra.selectedTopicId || null
    });
  }

  async function checkBudget(estimatedNext) {
    const spent = await costService.getMonthlyContentCost();
    costService.assertMonthlyBudget({
      spent,
      estimatedNext,
      limit: config.monthlyCostLimitEur
    });
  }

  async function paidTextOperation({ stage, stageId = stage, operation, input: operationInput }) {
    await checkBudget(estimatedTextStageCost(config, stage));
    const result = await operation(operationInput);
    const costEstimate = costService.estimateTextCost({
      usage: result.usage,
      ...textRates(config, stage)
    });
    modelResults.push(result);
    await updateStage(stage, result.value, {
      stageId,
      tokenUsage: result.usage,
      costEstimate,
      responseIds: result.responseId ? [result.responseId] : []
    });
    return result.value;
  }

  async function finishManual(code, message) {
    await runRepository.finishRun(runId, {
      status: 'needs_manual_attention',
      errorReport: { code, message }
    });
    return { status: 'needs_manual_attention', post: null, code };
  }

  try {
    const inventory = await inventoryService.buildSiteInventory();
    await updateStage('inventory', {
      counts: {
        blogPosts: inventory.blogPosts?.length || 0,
        guides: inventory.guides?.length || 0,
        servicePages: inventory.servicePages?.length || 0,
        industries: inventory.industries?.length || 0,
        packages: inventory.packages?.length || 0
      }
    });

    const topicCandidates = await paidTextOperation({
      stage: 'topic_research',
      operation: openaiService.createTopicCandidates,
      input: {
        inventory,
        seedTopics: input.seedTopics || [],
        maxCandidates: config.maxTopicCandidates
      }
    });
    const selectedTopic = topicScoringService.selectBestTopic(topicCandidates.candidates, inventory);
    if (!selectedTopic) {
      await updateStage('topic_scoring', { selectedTopic: null });
      return finishManual('no_eligible_topic', 'Kein geeigneter Themenkandidat verfügbar.');
    }

    const storedTopic = await topicRepository.createTopic(selectedTopic);
    await updateStage('topic_scoring', selectedTopic, {
      selectedTopicId: storedTopic?.id || selectedTopic.id || null
    });

    let sourceReferences = [];
    if (selectedTopic.requiresCurrentSources) {
      try {
        sourceReferences = await paidTextOperation({
          stage: 'source_research',
          operation: openaiService.researchCurrentSources,
          input: {
            topic: selectedTopic,
            primaryKeyword: selectedTopic.primaryKeyword,
            currentDate: input.currentDate,
            regionFocus: input.regionFocus
          }
        });
      } catch (error) {
        if (!/Aktuelle Quellen reichen für einen Artikel nicht aus\./.test(error.message)) throw error;
        await updateStage('source_research', { passed: false, sourceCount: 0 });
        return finishManual('insufficient_sources', error.message);
      }
      sourceReferences = validateSourceReferences(sourceReferences);
      if (sourceReferences.length < 2) {
        return finishManual('insufficient_sources', 'Aktuelle Themen benötigen mindestens zwei validierte Quellen.');
      }
    }

    const briefing = await paidTextOperation({
      stage: 'seo_brief',
      operation: openaiService.createSeoBrief,
      input: {
        topic: selectedTopic,
        inventory,
        internalLinks: inventory.approvedLinks || [],
        sourceReferences,
        pricingContext: inventory.packages || []
      }
    });
    let currentArticle = await paidTextOperation({
      stage: 'article_generation',
      operation: openaiService.generateArticle,
      input: {
        briefing,
        pricingContext: inventory.packages || []
      }
    });

    const validationContext = {
      existingSlugs: inventory.blogPosts || [],
      allowedInternalLinks: inventory.approvedLinks || [],
      sourceReferences
    };
    let validation = validateArticle(currentArticle, validationContext);
    await updateStage('validation', {
      passed: validation.passed,
      issues: validation.issues
    });

    let currentReview = null;
    if (validation.passed) {
      currentReview = await paidTextOperation({
        stage: 'review',
        operation: openaiService.reviewArticle,
        input: { briefing, article: currentArticle, sourceReferences }
      });
    }

    let revision = 0;
    const approved = () => validation.passed
      && currentReview?.passed === true
      && currentReview.score >= 80
      && currentReview.requiresManualReview !== true;

    while (!approved() && revision < config.maxRevisions) {
      revision += 1;
      const issues = validation.passed ? (currentReview?.issues || []) : validation.issues;
      currentArticle = await paidTextOperation({
        stage: 'repair',
        stageId: `repair:${revision}`,
        operation: openaiService.repairArticle,
        input: { briefing, article: currentArticle, issues }
      });
      validation = validateArticle(currentArticle, validationContext);
      await updateStage('validation', {
        passed: validation.passed,
        issues: validation.issues
      }, { stageId: `validation:${revision}` });

      if (validation.passed) {
        currentReview = await paidTextOperation({
          stage: 'review',
          stageId: `review:${revision}`,
          operation: openaiService.reviewArticle,
          input: { briefing, article: currentArticle, sourceReferences }
        });
      } else {
        currentReview = null;
      }
    }

    if (!approved()) {
      return finishManual(
        'quality_gate_failed',
        currentReview?.score < 80
          ? 'Der Reviewscore liegt unter 80.'
          : 'Der Artikel hat die Qualitätsprüfung nicht bestanden.'
      );
    }

    await checkBudget(config.imageCostEur);
    uploadedImage = await imageService.generateAndUploadImage({
      prompt: currentArticle.imagePrompt,
      filename: currentArticle.imageFilename
    });
    await updateStage('image_generation', {
      bytes: uploadedImage.bytes
    }, { costEstimate: config.imageCostEur });
    await updateStage('cloudinary_upload', {
      imageUrl: uploadedImage.imageUrl,
      publicId: uploadedImage.publicId,
      bytes: uploadedImage.bytes
    });

    const draft = await draftRepository.createAIDraft({
      post: {
        title: currentArticle.title,
        slug: currentArticle.slug,
        excerpt: currentArticle.shortDescription,
        content: validation.sanitizedHtml,
        hero_image: uploadedImage.imageUrl,
        hero_public_id: uploadedImage.publicId,
        category: currentArticle.category,
        faq_json: currentArticle.faqJson,
        meta_title: currentArticle.metaTitle,
        meta_description: currentArticle.metaDescription,
        og_title: currentArticle.ogTitle,
        og_description: currentArticle.ogDescription,
        image_alt: currentArticle.imageAlt,
        published: false,
        workflow_status: 'needs_review',
        content_format: 'static_html',
        generated_by_ai: true
      },
      metadata: {
        primary_keyword: currentArticle.seo?.primaryKeyword || briefing.primaryKeyword,
        secondary_keywords: currentArticle.seo?.secondaryKeywords || briefing.secondaryKeywords || [],
        search_intent: currentArticle.seo?.searchIntent || briefing.searchIntent,
        target_audience: currentArticle.seo?.targetAudience || briefing.targetAudience,
        region_focus: input.regionFocus || null,
        content_cluster: currentArticle.seo?.contentCluster || briefing.contentCluster,
        business_goal: currentArticle.lead?.businessGoal || briefing.businessGoal,
        cta_type: currentArticle.lead?.ctaType || briefing.ctaType,
        internal_links_json: briefing.internalLinks || [],
        source_references_json: sourceReferences,
        seo_brief_json: briefing,
        quality_score: currentReview.score,
        quality_report_json: currentReview,
        generation_metadata_json: generationMetadata(modelResults)
      }
    });
    draftPersisted = true;
    await updateStage('draft_creation', {
      postId: draft.post.id,
      qualityScore: currentReview.score
    });
    await topicRepository.markTopicUsed(storedTopic?.id || selectedTopic.id);
    await runRepository.finishRun(runId, { status: 'completed', postId: draft.post.id });

    return { status: 'completed', ...draft };
  } catch (error) {
    if (uploadedImage?.publicId && !draftPersisted) {
      try {
        await deleteUploadedImage(uploadedImage.publicId);
      } catch {
        // Der ursprüngliche Pipelinefehler bleibt maßgeblich.
      }
    }
    await runRepository.finishRun(runId, {
      status: 'failed',
      errorReport: { code: 'pipeline_failed', message: error.message }
    });
    throw error;
  }
}
