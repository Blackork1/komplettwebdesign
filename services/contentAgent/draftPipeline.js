import { resolvePricingToken } from '../../util/pricingTokenRenderer.js';

const CURRENT_RISK_FIELDS = [
  'currentClaims',
  'legalClaims',
  'privacyClaims',
  'softwareVersionClaims'
];
const PRICING_TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const STATIC_PRICE_PATTERN = /(?:\b\d[\d.,\s]*\s*(?:EUR|€)(?!\w)|\bEUR\s*\d[\d.,\s]*)/i;

function required(value, name) {
  if (!value) throw new TypeError(`Die Abhängigkeit ${name} wird benötigt.`);
  return value;
}

function textRates(config, stage) {
  return stage === 'review'
    ? { inputRate: config.reviewInputCostPerMtok, outputRate: config.reviewOutputCostPerMtok }
    : { inputRate: config.contentInputCostPerMtok, outputRate: config.contentOutputCostPerMtok };
}

function reservationAmount(config, stage) {
  return stage === 'review'
    ? Number(config.reviewStageReservationEur ?? 0.25)
    : Number(config.contentStageReservationEur ?? 0.50);
}

function generationMetadata(results) {
  return {
    promptVersions: results.map(({ promptVersion }) => promptVersion).filter(Boolean),
    responseIds: results.map(({ responseId }) => responseId).filter(Boolean)
  };
}

function inspectSourceReferences(sources, { required: sourcesRequired = false } = {}) {
  const raw = Array.isArray(sources) ? sources : [];
  if (raw.length > 6) {
    return { valid: false, code: 'too_many_sources', sources: [] };
  }

  const validated = [];
  const seenUrls = new Set();
  let malformed = false;
  for (const source of raw) {
    const title = typeof source?.title === 'string' ? source.title.replace(/\s+/g, ' ').trim() : '';
    try {
      const url = new URL(source?.url);
      if (!title || url.protocol !== 'https:') {
        malformed = true;
        continue;
      }
      url.hash = '';
      const normalizedUrl = url.toString();
      if (seenUrls.has(normalizedUrl)) {
        malformed = true;
        continue;
      }
      seenUrls.add(normalizedUrl);
      validated.push({ ...source, title, url: normalizedUrl });
    } catch {
      malformed = true;
    }
  }

  const validCount = validated.length >= 2 && validated.length <= 6;
  return {
    valid: !malformed && (!sourcesRequired || validCount),
    code: malformed ? 'invalid_sources' : (!validCount && sourcesRequired ? 'insufficient_sources' : null),
    sources: validated
  };
}

function articleRequiresSources(article) {
  return CURRENT_RISK_FIELDS.some((field) => article?.risk?.[field] === true);
}

function briefingRequiresSources(briefing) {
  return briefing?.sourceRequirements?.requiresCurrentSources === true;
}

function reviewRequiresSources(review) {
  return CURRENT_RISK_FIELDS.some((field) => review?.risks?.[field] === true);
}

function articlePricingText(article) {
  return JSON.stringify({
    title: article?.title,
    shortDescription: article?.shortDescription,
    metaTitle: article?.metaTitle,
    metaDescription: article?.metaDescription,
    ogTitle: article?.ogTitle,
    ogDescription: article?.ogDescription,
    contentHtml: article?.contentHtml,
    faqJson: article?.faqJson,
    imageAlt: article?.imageAlt
  });
}

function extractPricingTokens(html, pricingContext) {
  const known = [];
  const unknown = [];
  for (const match of String(html || '').matchAll(PRICING_TOKEN_PATTERN)) {
    const token = match[1].trim();
    const normalized = `{{${token}}}`;
    if (resolvePricingToken(token, { visiblePackages: pricingContext }).known) known.push(normalized);
    else unknown.push(normalized);
  }
  return { known: known.sort(), unknown: unknown.sort() };
}

function pricingIssue(code, message, repairInstruction) {
  return { code, severity: 'error', message, repairInstruction, blocking: true };
}

function pricingLockIssue(tokens) {
  return {
    code: 'pricing_tokens_locked',
    severity: 'info',
    message: `Zentrale Pricing-Tokens sind unveränderlich: ${tokens.join(', ') || 'keine'}.`,
    repairInstruction: 'Bewahre exakt dieselben zentral freigegebenen Pricing-Tokens; erfinde, entferne oder ersetze keine Pricing-Tokens.',
    blocking: false
  };
}

function inspectPricing(article, pricingContext, lockedTokens, enforceLock) {
  const issues = [];
  const persistedText = articlePricingText(article);
  const tokens = extractPricingTokens(persistedText, pricingContext);
  if (STATIC_PRICE_PATTERN.test(persistedText) || article?.risk?.staticPrices === true) {
    issues.push(pricingIssue(
      'static_price_forbidden',
      'Artikel dürfen keine statischen Euro- oder EUR-Preise enthalten.',
      'Entferne statische Preise und nutze ausschließlich bereits vorhandene zentrale Pricing-Tokens.'
    ));
  }
  if (tokens.unknown.length > 0) {
    issues.push(pricingIssue(
      'pricing_token_unknown',
      'Der Artikel enthält nicht freigegebene oder erfundene Pricing-Tokens.',
      'Entferne unbekannte Tokens; nutze ausschließlich die im Ausgangsartikel vorhandenen zentralen Pricing-Tokens.'
    ));
  }
  if (enforceLock && JSON.stringify(tokens.known) !== JSON.stringify(lockedTokens)) {
    issues.push(pricingIssue(
      'pricing_tokens_changed',
      'Eine Reparatur hat zentrale Pricing-Tokens erfunden, entfernt oder verändert.',
      'Stelle exakt die zentralen Pricing-Tokens des Ausgangsartikels wieder her.'
    ));
  }
  return { issues, knownTokens: tokens.known };
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
  required(imageService.generateAndUploadImage, 'imageService.generateAndUploadImage');
  required(imageService.deleteImage, 'imageService.deleteImage');

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
      costEstimate: 0,
      responseIds: extra.responseIds || [],
      selectedTopicId: extra.selectedTopicId || null
    });
  }

  async function reserve(stageId, stage) {
    return costService.reserveMonthlyBudget({
      runId,
      stageId,
      estimatedCost: reservationAmount(config, stage),
      limit: config.monthlyCostLimitEur
    });
  }

  async function paidTextOperation({ stage, stageId = stage, operation, input: operationInput }) {
    await reserve(stageId, stage);
    const result = await operation(operationInput);
    const actualCost = costService.estimateTextCost({ usage: result.usage, ...textRates(config, stage) });
    await costService.settleMonthlyBudget({ runId, stageId, actualCost });
    modelResults.push(result);
    await updateStage(stage, result.value, {
      stageId,
      tokenUsage: result.usage,
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

  async function requireValidSources(sources, code = 'insufficient_sources') {
    const inspection = inspectSourceReferences(sources, { required: true });
    if (inspection.valid) return { ok: true, sources: inspection.sources };
    return {
      ok: false,
      result: await finishManual(
        inspection.code || code,
        inspection.code === 'too_many_sources'
          ? 'Aktuelle Themen dürfen höchstens sechs validierte Quellen verwenden.'
          : 'Aktuelle Themen benötigen zwei bis sechs eindeutige validierte HTTPS-Quellen.'
      )
    };
  }

  async function validateOptionalSourceBoundary(sources, authoritativeSources) {
    if (!Array.isArray(sources) || sources.length === 0) return null;
    const inspection = inspectSourceReferences(sources, { required: true });
    if (inspection.valid) {
      const authoritativeUrls = new Set(authoritativeSources.map(({ url }) => url));
      const allResearched = inspection.sources.every(({ url }) => authoritativeUrls.has(url));
      if (allResearched) return null;
      return finishManual(
        'invented_sources',
        'Modellquellen müssen aus der validierten Quellenrecherche stammen.'
      );
    }
    return finishManual(
      inspection.code || 'invalid_sources',
      inspection.code === 'too_many_sources'
        ? 'Am Pipeline-Rand sind höchstens sechs Quellen zulässig.'
        : 'Quellen am Pipeline-Rand müssen eindeutig, benannt und per HTTPS erreichbar sein.'
    );
  }

  try {
    const inventory = await inventoryService.buildSiteInventory();
    const pricingContext = inventory.packages || [];
    await updateStage('inventory', {
      counts: {
        blogPosts: inventory.blogPosts?.length || 0,
        guides: inventory.guides?.length || 0,
        servicePages: inventory.servicePages?.length || 0,
        industries: inventory.industries?.length || 0,
        packages: pricingContext.length
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
      const requiredSources = await requireValidSources(sourceReferences);
      if (!requiredSources.ok) return requiredSources.result;
      sourceReferences = requiredSources.sources;
    }

    const briefing = await paidTextOperation({
      stage: 'seo_brief',
      operation: openaiService.createSeoBrief,
      input: {
        topic: selectedTopic,
        inventory,
        internalLinks: inventory.approvedLinks || [],
        sourceReferences,
        pricingContext
      }
    });
    const invalidBriefSources = await validateOptionalSourceBoundary(briefing.sourceReferences, sourceReferences);
    if (invalidBriefSources) return invalidBriefSources;
    if (briefingRequiresSources(briefing)) {
      const requiredSources = await requireValidSources(sourceReferences);
      if (!requiredSources.ok) return requiredSources.result;
      sourceReferences = requiredSources.sources;
    }

    let currentArticle = await paidTextOperation({
      stage: 'article_generation',
      operation: openaiService.generateArticle,
      input: { briefing, pricingContext }
    });
    const invalidArticleSources = await validateOptionalSourceBoundary(currentArticle.sourceReferences, sourceReferences);
    if (invalidArticleSources) return invalidArticleSources;
    if (articleRequiresSources(currentArticle)) {
      const requiredSources = await requireValidSources(sourceReferences);
      if (!requiredSources.ok) return requiredSources.result;
      sourceReferences = requiredSources.sources;
    }

    const validationContext = {
      existingSlugs: inventory.blogPosts || [],
      allowedInternalLinks: inventory.approvedLinks || [],
      sourceReferences
    };
    const initialPricing = inspectPricing(currentArticle, pricingContext, [], false);
    const lockedPricingTokens = initialPricing.knownTokens;

    function validateCurrentArticle({ enforcePricingLock }) {
      const base = validateArticle(currentArticle, validationContext);
      const pricing = inspectPricing(currentArticle, pricingContext, lockedPricingTokens, enforcePricingLock);
      return {
        ...base,
        passed: base.passed && pricing.issues.length === 0,
        issues: [...base.issues, ...pricing.issues]
      };
    }

    let validation = validateCurrentArticle({ enforcePricingLock: false });
    await updateStage('validation', { passed: validation.passed, issues: validation.issues });

    const reviewableArticle = () => ({ ...currentArticle, contentHtml: validation.sanitizedHtml });
    let currentReview = null;
    if (validation.passed) {
      currentReview = await paidTextOperation({
        stage: 'review',
        operation: openaiService.reviewArticle,
        input: { briefing, article: reviewableArticle(), sourceReferences }
      });
      if (reviewRequiresSources(currentReview)) {
        const requiredSources = await requireValidSources(sourceReferences);
        if (!requiredSources.ok) return requiredSources.result;
      }
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
        input: {
          briefing,
          article: reviewableArticle(),
          issues: [...issues, pricingLockIssue(lockedPricingTokens)]
        }
      });
      const invalidRepairSources = await validateOptionalSourceBoundary(currentArticle.sourceReferences, sourceReferences);
      if (invalidRepairSources) return invalidRepairSources;
      if (articleRequiresSources(currentArticle)) {
        const requiredSources = await requireValidSources(sourceReferences);
        if (!requiredSources.ok) return requiredSources.result;
      }

      validation = validateCurrentArticle({ enforcePricingLock: true });
      await updateStage('validation', {
        passed: validation.passed,
        issues: validation.issues
      }, { stageId: `validation:${revision}` });

      if (validation.passed) {
        currentReview = await paidTextOperation({
          stage: 'review',
          stageId: `review:${revision}`,
          operation: openaiService.reviewArticle,
          input: { briefing, article: reviewableArticle(), sourceReferences }
        });
        if (reviewRequiresSources(currentReview)) {
          const requiredSources = await requireValidSources(sourceReferences);
          if (!requiredSources.ok) return requiredSources.result;
        }
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

    await costService.reserveMonthlyBudget({
      runId,
      stageId: 'image_generation',
      estimatedCost: config.imageCostEur,
      limit: config.monthlyCostLimitEur
    });
    try {
      uploadedImage = await imageService.generateAndUploadImage({
        prompt: currentArticle.imagePrompt,
        filename: currentArticle.imageFilename,
        runId
      });
      await costService.settleMonthlyBudget({
        runId,
        stageId: 'image_generation',
        actualCost: config.imageCostEur
      });
      await updateStage('image_generation', uploadedImage.audit?.imageGeneration || {
        status: 'completed',
        costIncurred: true
      });
      await updateStage('cloudinary_upload', {
        ...(uploadedImage.audit?.upload || { status: 'completed' }),
        imageUrl: uploadedImage.imageUrl,
        publicId: uploadedImage.publicId,
        bytes: uploadedImage.bytes
      });
    } catch (error) {
      await costService.settleMonthlyBudget({
        runId,
        stageId: 'image_generation',
        actualCost: config.imageCostEur
      });
      const audit = error.audit || {};
      await updateStage('image_generation', audit.imageGeneration || {
        status: 'failed',
        costIncurred: true,
        code: 'IMAGE_GENERATION_FAILED'
      });
      await updateStage('cloudinary_upload', audit.upload || { status: 'not_started' });
      if (audit.cleanup) await updateStage('image_cleanup', audit.cleanup);
      throw error;
    }

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
    await updateStage('draft_creation', { postId: draft.post.id, qualityScore: currentReview.score });
    await topicRepository.markTopicUsed(storedTopic?.id || selectedTopic.id);
    await updateStage('completed', { postId: draft.post.id, qualityScore: currentReview.score });
    await runRepository.finishRun(runId, { status: 'completed', postId: draft.post.id });

    return { status: 'completed', ...draft };
  } catch (error) {
    if (uploadedImage?.publicId && !draftPersisted) {
      let cleanupResult;
      try {
        cleanupResult = await imageService.deleteImage({ publicId: uploadedImage.publicId });
      } catch (cleanupError) {
        cleanupResult = cleanupError.audit?.cleanup || {
          status: 'failed',
          publicId: uploadedImage.publicId,
          code: 'IMAGE_CLEANUP_FAILED'
        };
      }
      await updateStage('image_cleanup', cleanupResult);
    }
    await runRepository.finishRun(runId, {
      status: 'failed',
      errorReport: { code: 'pipeline_failed', message: error.message }
    });
    throw error;
  }
}
