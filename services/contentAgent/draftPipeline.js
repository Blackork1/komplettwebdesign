import { resolvePricingToken } from '../../util/pricingTokenRenderer.js';
import {
  ArticleOutputSchema,
  ReviewOutputSchema,
  SeoBriefSchema,
  TopicCandidateSchema,
  TopicCandidatesSchema
} from './articleSchemas.js';
import { ContentBudgetLimitError } from './contentCostService.js';

const CURRENT_RISK_FIELDS = [
  'currentClaims',
  'legalClaims',
  'privacyClaims',
  'softwareVersionClaims'
];
const PRICING_TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const STATIC_PRICE_PATTERN = /(?:\b\d(?:[\d.,\s\u00A0_-]|&nbsp;|&#160;)*(?:\b(?:EUR|Euro)\b|€|&euro;|&#8364;)|(?:\b(?:EUR|Euro)\b|€|&euro;|&#8364;)(?:[\s\u00A0_-]|&nbsp;|&#160;)*\d(?:[\d.,\s\u00A0_-]|&nbsp;|&#160;)*)/i;

class ManualAttentionStop extends Error {
  constructor(result) {
    super(result.code);
    this.result = result;
  }
}

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

function persistedPricingText(value) {
  return JSON.stringify(value ?? {});
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
  const persistedText = persistedPricingText(article);
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

function parseProviderEnvelope(value, stage) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!Object.hasOwn(value, 'value') || !value.usage || typeof value.usage !== 'object') return false;
  if (typeof value.promptVersion !== 'string' || value.promptVersion.trim() === '') return false;
  if (value.responseId != null && typeof value.responseId !== 'string') return false;

  const payload = value.value;
  let parsed;
  if (stage === 'topic_research') parsed = TopicCandidatesSchema.safeParse(payload);
  else if (stage === 'seo_brief') parsed = SeoBriefSchema.safeParse(payload);
  else if (stage === 'article_generation' || stage === 'repair') parsed = ArticleOutputSchema.safeParse(payload);
  else if (stage === 'review') parsed = ReviewOutputSchema.safeParse(payload);
  else if (stage === 'source_research') {
    const sources = inspectSourceReferences(payload, { required: true });
    return sources.valid ? { ...value, value: sources.sources } : null;
  } else return null;
  return parsed.success ? { ...value, value: parsed.data } : null;
}

function isPersistedImageResult(imageGeneration, upload) {
  if (imageGeneration?.status !== 'completed' || upload?.status !== 'completed') return false;
  if (typeof upload.imageUrl !== 'string' || !upload.imageUrl.startsWith('https://')) return false;
  if (typeof upload.publicId !== 'string' || !upload.publicId.startsWith('blog_images/')) return false;
  return Number.isFinite(Number(upload.bytes)) && Number(upload.bytes) > 0;
}

function isPersistedTopicResult(value) {
  const parsedTopic = TopicCandidateSchema.passthrough().safeParse(value?.topic);
  return Boolean(
    value
    && typeof value === 'object'
    && parsedTopic.success
    && Number.isInteger(Number(value.topic.id))
    && Number(value.topic.id) > 0
    && typeof value.topic.slug === 'string'
    && value.topic.slug.trim() !== ''
  );
}

function isPersistedDraftResult(value) {
  const post = value?.post;
  const topicId = Number(value?.topicId);
  const qualityScore = Number(value?.qualityScore);
  const metadataQualityScore = Number(value?.metadata?.quality_score);
  return Boolean(
    value
    && typeof value === 'object'
    && post
    && Number.isInteger(Number(post.id))
    && Number(post.id) > 0
    && typeof post.slug === 'string'
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)
    && post.published === false
    && post.workflow_status === 'needs_review'
    && post.content_format === 'static_html'
    && post.generated_by_ai === true
    && Number.isInteger(topicId)
    && topicId > 0
    && Number.isFinite(qualityScore)
    && qualityScore >= 80
    && value.metadata
    && typeof value.metadata === 'object'
    && !Array.isArray(value.metadata)
    && Number(value.metadata.post_id) === Number(post.id)
    && Number.isFinite(metadataQualityScore)
    && metadataQualityScore >= 80
  );
}

function isPersistedCompletedResult(value, draft) {
  return Boolean(
    value
    && typeof value === 'object'
    && Number(value.postId) === Number(draft?.post?.id)
    && value.slug === draft?.post?.slug
    && Number(value.topicId) === Number(draft?.topicId)
    && Number(value.qualityScore) === Number(draft?.qualityScore)
  );
}

function providerFailureIsSafeToRetry(error) {
  return error?.safeToRetry === true
    || Number(error?.status ?? error?.statusCode ?? error?.response?.status) === 429;
}

function markSafeProviderRetry(error) {
  if (!error || typeof error !== 'object') return error;
  error.code = 'CONTENT_PROVIDER_SAFE_RETRY';
  error.retryable = true;
  return error;
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
  const providerResultRecorder = typeof dependencies.recordProviderResult === 'function'
    ? dependencies.recordProviderResult
    : null;
  required(imageService.generateAndUploadImage, 'imageService.generateAndUploadImage');
  required(imageService.deleteImage, 'imageService.deleteImage');

  const runId = input.runId;
  const leaseGuard = typeof input.leaseGuard === 'function' ? input.leaseGuard : async () => true;
  const modelResults = [];
  const auditWarnings = [];
  let uploadedImage = null;
  let imageCreatedThisRun = false;
  let draftPersisted = false;
  let referencedDraftPublicId = null;

  async function assertLease() {
    return leaseGuard();
  }

  async function updateStage(currentStage, stageResult = {}, extra = {}) {
    await assertLease();
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

  function recordAuditWarning(primaryError, code, details = {}) {
    const warning = { code, ...details };
    auditWarnings.push(warning);
    if (primaryError && typeof primaryError === 'object') {
      primaryError.auditWarnings = auditWarnings;
    }
    return warning;
  }

  async function recordProviderOutcome(providerName, success, errorCode = null, primaryError = null) {
    if (!providerResultRecorder) return null;
    try {
      return await providerResultRecorder({ providerName, success, errorCode });
    } catch {
      recordAuditWarning(primaryError, 'PROVIDER_STATE_UPDATE_FAILED', { providerName });
      return null;
    }
  }

  async function recordImageProviderOutcomes(audit = {}, primaryError = null) {
    const imageGeneration = audit.imageGeneration || {};
    const upload = audit.upload || {};
    if (imageGeneration.status === 'completed') {
      await recordProviderOutcome('openai', true, null, primaryError);
    } else if (imageGeneration.status === 'failed') {
      await recordProviderOutcome(
        'openai',
        false,
        imageGeneration.code || 'IMAGE_GENERATION_FAILED',
        primaryError
      );
    }
    if (upload.status === 'completed') {
      await recordProviderOutcome('cloudinary', true, null, primaryError);
    } else if (upload.status === 'failed') {
      await recordProviderOutcome(
        'cloudinary',
        false,
        upload.code || 'IMAGE_UPLOAD_FAILED',
        primaryError
      );
    }
  }

  async function safeUpdateStage(currentStage, stageResult, extra, primaryError) {
    try {
      return await updateStage(currentStage, stageResult, extra);
    } catch {
      recordAuditWarning(primaryError, 'STAGE_AUDIT_FAILED', {
        stageId: extra?.stageId || currentStage
      });
      return null;
    }
  }

  async function safeFinishRun(
    payload,
    primaryError,
    failureCode = 'RUN_FINISH_AUDIT_FAILED'
  ) {
    try {
      await assertLease();
      const result = await runRepository.finishRun(runId, payload);
      if (result) return result;
      recordAuditWarning(primaryError, failureCode, { status: payload.status });
      return null;
    } catch {
      recordAuditWarning(primaryError, failureCode, { status: payload.status });
      return null;
    }
  }

  async function readPersistedStage(stageId) {
    if (typeof costService.getPersistedStageResult !== 'function') return null;
    return costService.getPersistedStageResult({ runId, stageId });
  }

  async function reserve(stageId, stage) {
    await assertLease();
    return costService.reserveMonthlyBudget({
      runId,
      stageId,
      estimatedCost: reservationAmount(config, stage),
      limit: config.monthlyCostLimitEur
    });
  }

  async function stopForRecovery(code, message) {
    const result = await finishManual(code, message);
    throw new ManualAttentionStop(result);
  }

  async function recoverProviderStage(stageId, stage, reservation) {
    if (reservation.status === 'reserved') {
      return stopForRecovery(
        'provider_recovery_reserved',
        'Für diese Providerstufe existiert bereits eine offene Reservierung; ein erneuter Aufruf ist gesperrt.'
      );
    }
    if (reservation.status !== 'settled' || typeof costService.getPersistedStageResult !== 'function') {
      return stopForRecovery(
        'provider_recovery_result_missing',
        'Die bereits abgerechnete Providerstufe kann ohne dauerhaftes Ergebnis nicht sicher fortgesetzt werden.'
      );
    }
    const persisted = parseProviderEnvelope(
      await costService.getPersistedStageResult({ runId, stageId }),
      stage
    );
    if (!persisted) {
      return stopForRecovery(
        'provider_recovery_result_missing',
        'Das dauerhafte Ergebnis der bereits abgerechneten Providerstufe fehlt oder ist vertragswidrig.'
      );
    }
    modelResults.push(persisted);
    return persisted.value;
  }

  async function paidTextOperation({ stage, stageId = stage, operation, input: operationInput }) {
    const reservation = await reserve(stageId, stage);
    if (reservation.created !== true) {
      return recoverProviderStage(stageId, stage, reservation);
    }
    await assertLease();
    let result;
    try {
      result = await operation(operationInput);
    } catch (error) {
      if (error?.code === 'dry_run_external_call') throw error;
      await assertLease();
      if (!providerFailureIsSafeToRetry(error)) {
        return stopForRecovery(
          'provider_execution_uncertain',
          'Der Providerfehler lässt nicht sicher erkennen, ob der kostenpflichtige Aufruf ausgeführt wurde.'
        );
      }
      await recordProviderOutcome('openai', false, error?.code || 'OPENAI_REQUEST_FAILED', error);
      if (typeof costService.releaseMonthlyBudgetReservation !== 'function') {
        return stopForRecovery(
          'provider_retry_release_failed',
          'Die sichere Providerwiederholung konnte ihre Budgetreservierung nicht freigeben.'
        );
      }
      try {
        await costService.releaseMonthlyBudgetReservation({
          runId,
          stageId,
          reservationMonth: reservation.reservationMonth
        });
      } catch {
        return stopForRecovery(
          'provider_retry_release_failed',
          'Die sichere Providerwiederholung konnte ihre Budgetreservierung nicht atomar freigeben.'
        );
      }
      throw markSafeProviderRetry(error);
    }
    await recordProviderOutcome('openai', true, null);
    await assertLease();
    const actualCost = costService.estimateTextCost({ usage: result.usage, ...textRates(config, stage) });
    await costService.settleMonthlyBudget({
      runId,
      stageId,
      reservationMonth: reservation.reservationMonth,
      actualCost
    });
    modelResults.push(result);
    await updateStage(stage, {
      value: result.value,
      responseId: result.responseId ?? null,
      usage: result.usage || {},
      promptVersion: result.promptVersion
    }, {
      stageId,
      tokenUsage: result.usage,
      responseIds: result.responseId ? [result.responseId] : []
    });
    return result.value;
  }

  async function finishManual(code, message) {
    await assertLease();
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
    await assertLease();
    const persistedCompleted = await readPersistedStage('completed');
    const persistedDraft = await readPersistedStage('draft_creation');
    if (persistedCompleted) {
      if (!isPersistedDraftResult(persistedDraft)
        || !isPersistedCompletedResult(persistedCompleted, persistedDraft)) {
        await stopForRecovery(
          'side_effect_recovery_result_missing',
          'Der abgeschlossene Lauf kann ohne gültiges dauerhaftes Draft-Ergebnis nicht sicher wiederaufgenommen werden.'
        );
      }
      draftPersisted = true;
      const completedRun = await safeFinishRun(
        { status: 'completed', postId: persistedDraft.post.id },
        null,
        'RUN_COMPLETION_PERSIST_FAILED'
      );
      return {
        status: 'completed',
        post: persistedDraft.post,
        metadata: persistedDraft.metadata,
        ...(completedRun ? {} : { auditWarnings })
      };
    }
    if (persistedDraft) {
      if (!isPersistedDraftResult(persistedDraft)) {
        await stopForRecovery(
          'side_effect_recovery_result_missing',
          'Das dauerhafte Draft-Ergebnis ist unvollständig oder widerspricht dem Entwurfsvertrag.'
        );
      }
      draftPersisted = true;
      if (persistedDraft.topicId != null) await topicRepository.markTopicUsed(persistedDraft.topicId);
      const completedResult = {
        postId: persistedDraft.post.id,
        slug: persistedDraft.post.slug,
        topicId: persistedDraft.topicId,
        qualityScore: persistedDraft.qualityScore ?? persistedDraft.metadata.quality_score ?? null
      };
      await updateStage('completed', completedResult);
      const completedRun = await safeFinishRun(
        { status: 'completed', postId: persistedDraft.post.id },
        null,
        'RUN_COMPLETION_PERSIST_FAILED'
      );
      return {
        status: 'completed',
        post: persistedDraft.post,
        metadata: persistedDraft.metadata,
        ...(completedRun ? {} : { auditWarnings })
      };
    }

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

    const persistedTopic = await readPersistedStage('topic_persistence');
    let storedTopic;
    if (persistedTopic) {
      if (!isPersistedTopicResult(persistedTopic)) {
        await stopForRecovery(
          'side_effect_recovery_result_missing',
          'Das dauerhafte Topic-Ergebnis ist unvollständig; eine doppelte Themenanlage wird verhindert.'
        );
      }
      storedTopic = persistedTopic.topic;
    } else {
      await assertLease();
      const createdTopic = await topicRepository.createTopic({
        ...selectedTopic,
        generationRunId: runId
      });
      storedTopic = { ...selectedTopic, ...createdTopic };
      if (!isPersistedTopicResult({ topic: storedTopic })) {
        await stopForRecovery(
          'side_effect_persistence_failed',
          'Das neu angelegte Topic lieferte kein vollständig persistierbares Ergebnis.'
        );
      }
      await updateStage('topic_persistence', { topic: storedTopic });
    }
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
    const briefingPricing = inspectPricing(briefing, pricingContext, [], false);
    if (briefingPricing.issues.length > 0) {
      return finishManual(
        'pricing_integrity_failed',
        'Das SEO-Briefing enthält statische Preise oder nicht freigegebene Pricing-Tokens.'
      );
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
      && currentReview.requiresManualReview !== true
      && currentReview.risks?.staticPrices !== true;

    while (!approved() && revision < config.maxRevisions) {
      revision += 1;
      const issues = validation.passed ? [...(currentReview?.issues || [])] : [...validation.issues];
      if (currentReview?.risks?.staticPrices === true) {
        issues.push(pricingIssue(
          'review_static_price_risk',
          'Das Review meldet weiterhin statische Preise.',
          'Entferne alle statischen Preisangaben aus sämtlichen persistierten Artikelfeldern.'
        ));
      }
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

    await assertLease();
    const imageReservation = await costService.reserveMonthlyBudget({
      runId,
      stageId: 'image_generation',
      estimatedCost: config.imageCostEur,
      limit: config.monthlyCostLimitEur
    });
    if (imageReservation.created !== true) {
      if (imageReservation.status === 'reserved') {
        await stopForRecovery(
          'provider_recovery_reserved',
          'Für die Bildstufe existiert bereits eine offene Reservierung; ein erneuter Provideraufruf ist gesperrt.'
        );
      }
      if (imageReservation.status !== 'settled' || typeof costService.getPersistedStageResult !== 'function') {
        await stopForRecovery(
          'provider_recovery_result_missing',
          'Das bereits abgerechnete Bild kann ohne dauerhaftes Uploadergebnis nicht sicher verwendet werden.'
        );
      }
      const persistedGeneration = await costService.getPersistedStageResult({
        runId,
        stageId: 'image_generation'
      });
      const persistedUpload = await costService.getPersistedStageResult({
        runId,
        stageId: 'cloudinary_upload'
      });
      if (!isPersistedImageResult(persistedGeneration, persistedUpload)) {
        await stopForRecovery(
          'provider_recovery_result_missing',
          'Das dauerhafte Ergebnis der bereits abgerechneten Bildstufe fehlt oder ist vertragswidrig.'
        );
      }
      uploadedImage = {
        imageUrl: persistedUpload.imageUrl,
        publicId: persistedUpload.publicId,
        bytes: Number(persistedUpload.bytes),
        audit: {
          imageGeneration: persistedGeneration,
          upload: persistedUpload,
          cleanup: { status: 'not_required', publicId: persistedUpload.publicId }
        }
      };
    } else {
      try {
        await assertLease();
        uploadedImage = await imageService.generateAndUploadImage({
          prompt: currentArticle.imagePrompt,
          filename: currentArticle.imageFilename,
          runId
        });
        await recordImageProviderOutcomes(uploadedImage.audit || {
          imageGeneration: { status: 'completed' },
          upload: { status: 'completed' }
        });
        imageCreatedThisRun = true;
        await assertLease();
        await costService.settleMonthlyBudget({
          runId,
          stageId: 'image_generation',
          reservationMonth: imageReservation.reservationMonth,
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
        await recordImageProviderOutcomes(error.audit || {}, error);
        try {
          await costService.settleMonthlyBudget({
            runId,
            stageId: 'image_generation',
            reservationMonth: imageReservation.reservationMonth,
            actualCost: config.imageCostEur
          });
        } catch {
          recordAuditWarning(error, 'BUDGET_SETTLEMENT_FAILED', { stageId: 'image_generation' });
        }
        const audit = error.audit || {};
        await safeUpdateStage('image_generation', audit.imageGeneration || {
          status: 'failed',
          costIncurred: true,
          code: 'IMAGE_GENERATION_FAILED'
        }, {}, error);
        await safeUpdateStage(
          'cloudinary_upload',
          audit.upload || { status: 'not_started' },
          {},
          error
        );
        if (audit.cleanup) await safeUpdateStage('image_cleanup', audit.cleanup, {}, error);
        await stopForRecovery(
          'image_provider_uncertain',
          'Ein Bildproviderfehler wird nicht automatisch wiederholt, weil Ausführung oder Upload unklar sein können.'
        );
      }
    }

    const existingDraft = await readPersistedStage('draft_creation');
    let draft;
    const topicId = storedTopic?.id || selectedTopic.id;
    if (existingDraft) {
      if (!isPersistedDraftResult(existingDraft)) {
        await stopForRecovery(
          'side_effect_recovery_result_missing',
          'Das unmittelbar vor der Anlage gefundene Draft-Ergebnis ist unvollständig.'
        );
      }
      draft = existingDraft;
      if (imageCreatedThisRun && uploadedImage?.publicId !== draft.post.hero_public_id) {
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
        await safeUpdateStage('image_cleanup', cleanupResult, {}, null);
      }
    } else {
      await assertLease();
      const draftInput = {
        generationRunId: runId,
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
      };
      try {
        draft = await draftRepository.createAIDraft(draftInput);
        draftPersisted = Boolean(draft?.post?.id);
        referencedDraftPublicId = draft?.referencedImagePublicId || draft?.post?.hero_public_id || null;
      } catch (draftError) {
        if (typeof draftRepository.findAIDraftByGenerationRunId !== 'function') throw draftError;
        let recovered;
        try {
          recovered = await draftRepository.findAIDraftByGenerationRunId(runId);
        } catch (reconciliationError) {
          reconciliationError.code = 'DRAFT_RECONCILIATION_UNCERTAIN';
          reconciliationError.cause ??= draftError;
          throw reconciliationError;
        }
        if (!recovered?.post?.id || !recovered?.metadata) throw draftError;
        draft = {
          ...recovered,
          topicId: recovered.topicId ?? topicId,
          qualityScore: recovered.qualityScore ?? recovered.metadata.quality_score ?? currentReview.score,
          created: false,
          referencedImagePublicId: recovered.post.hero_public_id || null
        };
        draftPersisted = true;
        referencedDraftPublicId = draft.referencedImagePublicId;
      }
      await assertLease();
    }
    draftPersisted = true;
    referencedDraftPublicId ||= draft.referencedImagePublicId || draft.post?.hero_public_id || null;
    const referencedPublicId = referencedDraftPublicId;
    if (imageCreatedThisRun && uploadedImage?.publicId !== referencedPublicId && draft.created === false) {
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
      await safeUpdateStage('image_cleanup', cleanupResult, {}, null);
    }
    const persistedDraftResult = {
      post: draft.post,
      metadata: draft.metadata,
      topicId,
      qualityScore: currentReview.score
    };
    if (!isPersistedDraftResult(persistedDraftResult)) {
      await stopForRecovery(
        'side_effect_persistence_failed',
        'Das KI-Draft-Repository lieferte kein vollständig persistierbares Ergebnis.'
      );
    }
    if (!existingDraft) await updateStage('draft_creation', persistedDraftResult);
    await assertLease();
    await topicRepository.markTopicUsed(topicId);
    await updateStage('completed', {
      postId: draft.post.id,
      slug: draft.post.slug,
      topicId,
      qualityScore: currentReview.score
    });
    const completedRun = await safeFinishRun(
      { status: 'completed', postId: draft.post.id },
      null,
      'RUN_COMPLETION_PERSIST_FAILED'
    );

    return {
      status: 'completed',
      ...draft,
      ...(completedRun ? {} : { auditWarnings })
    };
  } catch (error) {
    if (error instanceof ManualAttentionStop) return error.result;
    if (uploadedImage?.publicId && imageCreatedThisRun && !draftPersisted) {
      let reconciliationKnown = false;
      let reconciledDraft = null;
      if (typeof draftRepository.findAIDraftByGenerationRunId === 'function') {
        try {
          reconciledDraft = await draftRepository.findAIDraftByGenerationRunId(runId);
          reconciliationKnown = true;
          if (reconciledDraft?.post?.id) {
            draftPersisted = true;
            referencedDraftPublicId = reconciledDraft.post.hero_public_id || null;
          }
        } catch {
          reconciliationKnown = false;
        }
      }
      if (!reconciliationKnown) {
        const deferred = {
          status: 'deferred_uncertain',
          publicId: uploadedImage.publicId,
          code: 'DRAFT_RECONCILIATION_UNCERTAIN'
        };
        await safeUpdateStage('image_cleanup', deferred, {}, error);
        recordAuditWarning(error, 'IMAGE_CLEANUP_DEFERRED_UNCERTAIN', {
          publicId: uploadedImage.publicId
        });
        if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
        return finishManual(
          'draft_reconciliation_uncertain',
          'Der Draftstatus ist unklar; das Bild bleibt bis zur manuellen Klärung erhalten.'
        );
      }
      const uploadedImageIsUnreferenced = !reconciledDraft?.post?.id
        || referencedDraftPublicId !== uploadedImage.publicId;
      if (!uploadedImageIsUnreferenced) {
        if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
        await safeFinishRun({
          status: 'failed',
          errorReport: { code: 'pipeline_failed', message: error.message }
        }, error);
        throw error;
      }
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
      await safeUpdateStage('image_cleanup', cleanupResult, {}, error);
    }
    if (error instanceof ContentBudgetLimitError || error?.code === 'CONTENT_BUDGET_LIMIT_REACHED') {
      return finishManual('budget_limit_reached', 'Das konfigurierte Monatsbudget ist erreicht.');
    }
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    await safeFinishRun({
      status: 'failed',
      errorReport: { code: 'pipeline_failed', message: error.message }
    }, error);
    if (auditWarnings.length > 0) error.auditWarnings = auditWarnings;
    throw error;
  }
}
