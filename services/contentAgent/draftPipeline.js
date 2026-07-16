import { resolvePricingToken } from '../../util/pricingTokenRenderer.js';
import {
  ArticleOutputSchema,
  ReviewOutputSchema,
  SeoBriefSchema,
  TopicCandidateSchema,
  TopicCandidatesSchema,
  WeeklyTopicPoolResultSchema
} from './articleSchemas.js';
import { ContentBudgetLimitError } from './contentCostService.js';
import { buildFocusedRiskReport } from './riskReportService.js';
import { AUTO_PUBLISH_POLICY_VERSION } from './autoPublishPolicy.js';
import { normalizeInternalHref, normalizeTrustedInternalPaths } from './trustedInternalLinkService.js';
import {
  DRAFT_PERSISTENCE_RECOVERY_AUDIT_KEY,
  EDITORIAL_REVIEW_RECOVERY_AUDIT_KEY,
  QUALITY_GATE_RECOVERY_AUDIT_KEY
} from './contentJobRetryPolicy.js';
import { learningRulesForStage } from './contentLearningSnapshotService.js';
import {
  findWeeklyCandidateForRun,
  getWeeklyTopicPoolIdentity,
  listAvailableWeeklyCandidates
} from './weeklyTopicPoolService.js';
import { buildSearchConsoleTopicSignals } from './searchConsoleCategoryService.js';
import {
  providerFailureIsSafeToRetry,
  providerRequestWasRejectedBeforeExecution
} from './providerRetryPolicy.js';

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

function normalizeRunId(value) {
  const normalized = typeof value === 'string' && /^[1-9]\d*$/u.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('runId muss eine positive sichere Ganzzahl sein.');
  }
  return normalized;
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

function activeLearningRules(config, stage) {
  return config?.learningRuleSnapshot
    ? learningRulesForStage(config.learningRuleSnapshot, stage)
    : [];
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
  else if (stage === 'weekly_topic_research') parsed = WeeklyTopicPoolResultSchema.safeParse(payload);
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

function isPersistedInventoryResult(value) {
  const inventory = value?.inventory;
  const counts = value?.counts;
  const fields = ['blogPosts', 'guides', 'servicePages', 'industries', 'packages', 'approvedLinks'];
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)
      || !counts || typeof counts !== 'object' || Array.isArray(counts)
      || fields.some((field) => !Array.isArray(inventory[field]))) return false;
  if (JSON.stringify(value).length > 2_000_000) return false;
  return Number(counts.blogPosts) === inventory.blogPosts.length
    && Number(counts.guides) === inventory.guides.length
    && Number(counts.servicePages) === inventory.servicePages.length
    && Number(counts.industries) === inventory.industries.length
    && Number(counts.packages) === inventory.packages.length;
}

function normalizeWeeklyTopicPool(value) {
  const parsed = WeeklyTopicPoolResultSchema.safeParse({
    candidates: value?.candidates,
    sourceReferences: value?.sourceReferences
  });
  const selections = value?.selections;
  if (!parsed.success
      || !Number.isSafeInteger(Number(value?.id))
      || Number(value.id) <= 0
      || typeof value?.weekStart !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(value.weekStart)
      || !Array.isArray(selections)
      || selections.some((selection) => (
        typeof selection?.candidateSlug !== 'string'
        || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(selection.candidateSlug)
        || !Number.isSafeInteger(Number(selection.generationRunId))
        || Number(selection.generationRunId) <= 0
      ))) return null;

  return {
    ...value,
    id: Number(value.id),
    candidates: parsed.data.candidates,
    sourceReferences: parsed.data.sourceReferences,
    selections: selections.map((selection) => ({
      ...selection,
      generationRunId: Number(selection.generationRunId)
    }))
  };
}

function internalLinksWithinSnapshot(links, allowedInternalLinks) {
  const allowed = normalizeTrustedInternalPaths(allowedInternalLinks);
  return Array.isArray(links) && links.every((link) => {
    const normalized = normalizeInternalHref(link?.url);
    return normalized.kind === 'internal' && allowed.has(normalized.path);
  });
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

function isPersistedAutoScheduleResult(value, draft) {
  const post = value?.post;
  const allowed = value?.decision === 'allowed';
  const blocked = value?.decision === 'blocked';
  return Boolean(
    value
    && typeof value === 'object'
    && Number.isInteger(Number(value.eventId))
    && Number(value.eventId) > 0
    && ((allowed && Number.isInteger(Number(value.jobId)) && Number(value.jobId) > 0)
      || (blocked && value.jobId === null))
    && (allowed || blocked)
    && value.policyVersion === AUTO_PUBLISH_POLICY_VERSION
    && Array.isArray(value.reasons)
    && value.reasons.every((reason) => typeof reason === 'string' && reason.length > 0)
    && typeof value.reviewRequired === 'boolean'
    && post
    && Number(post.id) === Number(draft?.post?.id)
    && post.generated_by_ai === true
    && post.content_format === 'static_html'
    && (
      (allowed && value.reviewRequired === false
        && post.published === false && post.workflow_status === 'approved_scheduled'
        && post.approved_by_admin_id == null)
      || (blocked && value.reviewRequired === true
        && post.published === false && post.workflow_status === 'needs_review')
    )
  );
}

function isPersistedCompletedResult(value, draft, autoPublishResult = null) {
  const baseMatches = Boolean(
    value
    && typeof value === 'object'
    && Number(value.postId) === Number(draft?.post?.id)
    && value.slug === draft?.post?.slug
    && Number(value.topicId) === Number(draft?.topicId)
    && Number(value.qualityScore) === Number(draft?.qualityScore)
  );
  if (!baseMatches || !autoPublishResult) return baseMatches;
  return value.policyVersion === autoPublishResult.policyVersion
    && value.published === autoPublishResult.post.published
    && value.reviewRequired === autoPublishResult.reviewRequired;
}

function markSafeProviderRetry(error) {
  if (!error || typeof error !== 'object') return error;
  error.code = 'CONTENT_PROVIDER_SAFE_RETRY';
  error.retryable = true;
  return error;
}

function markProviderExecutionPhase(error, phase, responseId = null) {
  if (!error || typeof error !== 'object') return error;
  error.providerExecutionPhase = phase;
  if (responseId && !error.responseId) error.responseId = responseId;
  return error;
}

function authorizedQualityRecovery(value, baseMaxRevisions) {
  return Boolean(
    value
    && value.status === 'authorized_after_quality_gate'
    && value.stageId === `repair:${baseMaxRevisions + 1}`
    && Number(value.baseMaxRevisions) === Number(baseMaxRevisions)
    && Number(value.additionalRevisionCount) === 1
    && Number.isSafeInteger(Number(value.adminId))
    && Number(value.adminId) > 0
  );
}

function authorizedEditorialReviewRecovery(value, maximumRevisions) {
  return Boolean(
    value
    && value.status === 'authorized_after_editorial_scope_change'
    && value.stageId === `review:${maximumRevisions + 1}`
    && value.previousReviewStageId === `review:${maximumRevisions}`
    && Number.isSafeInteger(Number(value.adminId))
    && Number(value.adminId) > 0
  );
}

function authorizedDraftPersistenceRecovery(value) {
  return Boolean(
    value
    && value.status === 'authorized_after_metadata_contract_fix'
    && value.imageGenerationStageId === 'image_generation:2'
    && value.cloudinaryUploadStageId === 'cloudinary_upload:2'
    && Number.isSafeInteger(Number(value.adminId))
    && Number(value.adminId) > 0
  );
}

function safeQualityIssues(review) {
  return (Array.isArray(review?.issues) ? review.issues : []).slice(0, 8).map((issue) => ({
    code: typeof issue?.code === 'string' ? issue.code.slice(0, 120) : 'review_issue',
    severity: ['info', 'warning', 'error'].includes(issue?.severity) ? issue.severity : 'warning',
    message: typeof issue?.message === 'string' ? issue.message.slice(0, 500) : 'Redaktionelle Prüfung erforderlich.'
  }));
}

function providerErrorDiagnostic(error, stage) {
  const httpStatus = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  return {
    provider: 'openai',
    stage,
    errorName: error?.name || 'Error',
    code: error?.code || 'OPENAI_REQUEST_FAILED',
    ...(Number.isInteger(httpStatus) ? { httpStatus } : {}),
    requestId: error?.requestID ?? error?.request_id ?? null,
    responseId: error?.responseId ?? error?.response?.id ?? null
  };
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
  const publicationService = dependencies.publicationService || null;
  if (publicationService) {
    required(
      publicationService.approveAutomaticallyForSchedule,
      'publicationService.approveAutomaticallyForSchedule'
    );
  }
  required(imageService.generateAndUploadImage, 'imageService.generateAndUploadImage');
  required(imageService.deleteImage, 'imageService.deleteImage');

  const runId = normalizeRunId(input.runId);
  const snapshotInternalLinks = Array.isArray(config.allowedInternalLinks)
    ? config.allowedInternalLinks
    : [];
  const leaseGuard = typeof input.leaseGuard === 'function' ? input.leaseGuard : async () => true;
  const modelResults = [];
  const auditWarnings = [];
  let uploadedImage = null;
  let imageCreatedThisRun = false;
  let draftPersisted = false;
  let referencedDraftPublicId = null;
  let imageGenerationStageId = 'image_generation';
  let cloudinaryUploadStageId = 'cloudinary_upload';
  let imageCleanupStageId = 'image_cleanup';

  async function assertLease() {
    return leaseGuard();
  }

  async function updateStage(currentStage, stageResult = {}, extra = {}) {
    await assertLease();
    const persisted = await runRepository.updateRunStage(runId, {
      currentStage,
      stageId: extra.stageId || currentStage,
      stageResult,
      tokenUsage: extra.tokenUsage || {},
      costEstimate: 0,
      responseIds: extra.responseIds || [],
      selectedTopicId: extra.selectedTopicId || null
    });
    if (!persisted || typeof persisted !== 'object') {
      throw Object.assign(
        new Error(`Die Pipeline-Stage ${extra.stageId || currentStage} konnte nicht persistiert werden.`),
        { code: 'CONTENT_STAGE_PERSISTENCE_FAILED', retryable: true }
      );
    }
    return persisted;
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

  function runFinishError(payload, cause = null) {
    const error = Object.assign(
      new Error(`Der Content-Agent-Lauf konnte nicht als ${payload.status} abgeschlossen werden.`),
      { code: 'CONTENT_RUN_FINISH_FAILED', retryable: true }
    );
    if (cause) error.cause = cause;
    return error;
  }

  async function finishRunRequired(payload) {
    await assertLease();
    try {
      const result = await runRepository.finishRun(runId, payload);
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw runFinishError(payload);
      return result;
    } catch (error) {
      if (error?.code === 'CONTENT_JOB_LEASE_LOST'
        || (error?.code === 'CONTENT_RUN_FINISH_FAILED' && error?.retryable === true)) {
        throw error;
      }
      throw runFinishError(payload, error);
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

  async function stopForRecovery(code, message, details = {}) {
    const result = await finishManual(code, message, details);
    throw new ManualAttentionStop(result);
  }

  async function recoverWeeklyTopicPoolEnvelope(rawEnvelope) {
    if (!rawEnvelope || typeof rawEnvelope !== 'object' || Array.isArray(rawEnvelope)
        || typeof rawEnvelope.responseId !== 'string'
        || typeof openaiService.retrieveWeeklyTopicPoolSources !== 'function') return null;

    const recoveryStageId = 'weekly_topic_research_sources_recovery';
    const storedRecovery = parseProviderEnvelope(
      await readPersistedStage(recoveryStageId),
      'weekly_topic_research'
    );
    if (storedRecovery) return storedRecovery;

    let recoveredSources;
    try {
      recoveredSources = await openaiService.retrieveWeeklyTopicPoolSources(
        rawEnvelope.responseId
      );
    } catch (error) {
      recordAuditWarning(error, 'WEEKLY_TOPIC_SOURCE_RECOVERY_FAILED');
      return null;
    }
    const sourceInspection = inspectSourceReferences(recoveredSources, { required: true });
    if (!sourceInspection.valid) return null;

    const recoveredEnvelope = {
      ...rawEnvelope,
      value: {
        ...rawEnvelope.value,
        sourceReferences: sourceInspection.sources
      }
    };
    const parsed = parseProviderEnvelope(recoveredEnvelope, 'weekly_topic_research');
    if (!parsed) return null;
    await updateStage('weekly_topic_research', recoveredEnvelope, {
      stageId: recoveryStageId,
      responseIds: [rawEnvelope.responseId]
    });
    return parsed;
  }

  async function recoverProviderStage(stageId, stage, reservation, returnEnvelope = false) {
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
    const rawPersisted = await costService.getPersistedStageResult({ runId, stageId });
    let persisted = parseProviderEnvelope(rawPersisted, stage);
    if (!persisted && stage === 'weekly_topic_research') {
      persisted = await recoverWeeklyTopicPoolEnvelope(rawPersisted);
    }
    if (!persisted) {
      return stopForRecovery(
        'provider_recovery_result_missing',
        'Das dauerhafte Ergebnis der bereits abgerechneten Providerstufe fehlt oder ist vertragswidrig.'
      );
    }
    modelResults.push(persisted);
    return returnEnvelope ? persisted : persisted.value;
  }

  async function paidTextOperation({
    stage,
    stageId = stage,
    operation,
    input: operationInput,
    returnEnvelope = false,
    recoveryOnly = false
  }) {
    let providerExecutionPhase = 'not_started';
    let providerResponseId = null;

    try {
      const reservation = await reserve(stageId, stage);
      if (recoveryOnly && reservation.created === true) {
        if (typeof costService.releaseMonthlyBudgetReservation !== 'function') {
          return await stopForRecovery(
            'provider_retry_release_failed',
            'Die fehlende Providerstufe konnte ihre vorsorgliche Budgetreservierung nicht freigeben.'
          );
        }
        try {
          await costService.releaseMonthlyBudgetReservation({
            runId,
            stageId,
            reservationMonth: reservation.reservationMonth
          });
        } catch {
          return await stopForRecovery(
            'provider_retry_release_failed',
            'Die fehlende Providerstufe konnte ihre vorsorgliche Budgetreservierung nicht atomar freigeben.'
          );
        }
        return await stopForRecovery(
          'provider_recovery_result_missing',
          'Die als bezahlt markierte Wochenrecherche besitzt keine abgerechnete Providerstufe; ein neuer Aufruf bleibt gesperrt.'
        );
      }
      if (reservation.created !== true) {
        providerExecutionPhase = 'prior_attempt_present';
        return await recoverProviderStage(stageId, stage, reservation, returnEnvelope);
      }
      await assertLease();
      providerExecutionPhase = 'request_started';
      let result;
      try {
        result = await operation(operationInput);
      } catch (error) {
        if (error?.code === 'dry_run_external_call') throw error;
        await assertLease();
        if (providerRequestWasRejectedBeforeExecution(error)) {
          providerExecutionPhase = 'not_executed';
          if (error?.providerRequestStarted !== false) {
            await recordProviderOutcome('openai', false, error.code, error);
          }
          if (typeof costService.releaseMonthlyBudgetReservation !== 'function') {
            return await stopForRecovery(
              'provider_retry_release_failed',
              'Die vor Ausführung abgelehnte Provideranfrage konnte ihre Budgetreservierung nicht freigeben.'
            );
          }
          try {
            await costService.releaseMonthlyBudgetReservation({
              runId,
              stageId,
              reservationMonth: reservation.reservationMonth
            });
          } catch {
            return await stopForRecovery(
              'provider_retry_release_failed',
              'Die vor Ausführung abgelehnte Provideranfrage konnte ihre Budgetreservierung nicht atomar freigeben.'
            );
          }
          return await stopForRecovery(
            'provider_request_rejected',
            error?.providerRequestStarted === false
              ? 'Die Anfrage wurde vor dem OpenAI-Aufruf wegen eines inkompatiblen Ausgabeschemas gestoppt.'
              : 'OpenAI hat die Anfrage vor der kostenpflichtigen Ausführung wegen eines ungültigen Ausgabeschemas abgelehnt.',
            { providerDiagnostic: providerErrorDiagnostic(error, stageId) }
          );
        }
        if (!providerFailureIsSafeToRetry(error)) {
          return await stopForRecovery(
            'provider_execution_uncertain',
            'Der Providerfehler lässt nicht sicher erkennen, ob der kostenpflichtige Aufruf ausgeführt wurde.',
            { providerDiagnostic: providerErrorDiagnostic(error, stageId) }
          );
        }
        providerExecutionPhase = 'not_executed';
        await recordProviderOutcome('openai', false, error?.code || 'OPENAI_REQUEST_FAILED', error);
        if (typeof costService.releaseMonthlyBudgetReservation !== 'function') {
          return await stopForRecovery(
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
          return await stopForRecovery(
            'provider_retry_release_failed',
            'Die sichere Providerwiederholung konnte ihre Budgetreservierung nicht atomar freigeben.'
          );
        }
        throw markSafeProviderRetry(error);
      }
      providerExecutionPhase = 'response_received';
      providerResponseId = result.responseId ?? null;
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
      return returnEnvelope ? result : result.value;
    } catch (error) {
      throw markProviderExecutionPhase(error, providerExecutionPhase, providerResponseId);
    }
  }

  async function finishManual(code, message, details = {}) {
    await finishRunRequired({
      status: 'needs_manual_attention',
      errorReport: { code, message, ...details }
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

  async function applyAutoSchedule(draft, persistedAutoSchedule = null) {
    if (!publicationService) {
      return {
        post: draft.post,
        metadata: draft.metadata,
        reviewRequired: true,
        autoPublishResult: null
      };
    }
    await assertLease();
    const publication = await publicationService.approveAutomaticallyForSchedule({
      postId: draft.post.id,
      runId,
      scheduledAt: config.publicationAt,
      snapshot: config,
      leaseGuard: assertLease
    });
    const autoScheduleResult = {
      post: publication?.post,
      eventId: publication?.event?.id,
      jobId: publication?.job?.id ?? null,
      decision: publication?.event?.decision,
      policyVersion: publication?.decision?.policyVersion,
      reasons: publication?.decision?.reasons,
      reviewRequired: publication?.reviewRequired,
      scheduledAt: config.publicationAt ?? null
    };
    if (!isPersistedAutoScheduleResult(autoScheduleResult, draft)) {
      await stopForRecovery(
        'auto_schedule_result_invalid',
        'Die automatische Terminfreigabe ist unvollständig oder widersprüchlich.'
      );
    }
    if (persistedAutoSchedule) {
      if (!isPersistedAutoScheduleResult(persistedAutoSchedule, draft)
          || persistedAutoSchedule.eventId !== autoScheduleResult.eventId
          || persistedAutoSchedule.jobId !== autoScheduleResult.jobId
          || persistedAutoSchedule.decision !== autoScheduleResult.decision
          || persistedAutoSchedule.reviewRequired !== autoScheduleResult.reviewRequired
          || JSON.stringify(persistedAutoSchedule.reasons) !== JSON.stringify(autoScheduleResult.reasons)
          || persistedAutoSchedule.post.workflow_status !== autoScheduleResult.post.workflow_status
          || persistedAutoSchedule.post.published !== autoScheduleResult.post.published) {
        await stopForRecovery(
          'auto_schedule_recovery_conflict',
          'Die persistierte Terminfreigabe widerspricht dem aktuellen Retry-Ergebnis.'
        );
      }
    } else {
      await updateStage('auto_schedule', autoScheduleResult, {
        stageId: `auto_schedule:${AUTO_PUBLISH_POLICY_VERSION}`
      });
    }
    return {
      post: autoScheduleResult.post,
      metadata: draft.metadata,
      reviewRequired: autoScheduleResult.reviewRequired,
      autoPublishResult: autoScheduleResult
    };
  }

  async function completeDraft(draft, persistedAutoPublish = null) {
    const publication = await applyAutoSchedule(draft, persistedAutoPublish);
    if (draft.topicId != null) await topicRepository.markTopicUsed(draft.topicId);
    const completedResult = {
      postId: draft.post.id,
      slug: draft.post.slug,
      topicId: draft.topicId,
      qualityScore: draft.qualityScore ?? draft.metadata.quality_score ?? null,
      ...(publication.autoPublishResult ? {
        published: publication.post.published,
        reviewRequired: publication.reviewRequired,
        policyVersion: publication.autoPublishResult.policyVersion
      } : {})
    };
    await updateStage('completed', completedResult);
    await finishRunRequired({ status: 'completed', postId: draft.post.id });
    if (typeof dependencies.enqueueLearningObservationJob === 'function') {
      try {
        await dependencies.enqueueLearningObservationJob({
          postId: draft.post.id,
          reviewVersion: Number(draft.post.review_version || 1)
        });
      } catch {
        // Der interne Lernjob darf die fertige Entwurfserstellung niemals blockieren.
      }
    }
    return {
      status: 'completed',
      ...draft,
      post: publication.post,
      metadata: publication.metadata,
      ...(publication.autoPublishResult ? { reviewRequired: publication.reviewRequired } : {})
    };
  }

  try {
    await assertLease();
    const persistedCompleted = await readPersistedStage('completed');
    const persistedDraft = await readPersistedStage('draft_creation');
    const persistedAutoPublish = publicationService
      ? await readPersistedStage(`auto_schedule:${AUTO_PUBLISH_POLICY_VERSION}`)
      : null;
    if (persistedCompleted) {
      if (!isPersistedDraftResult(persistedDraft)
        || (publicationService && !isPersistedAutoScheduleResult(persistedAutoPublish, persistedDraft))
        || !isPersistedCompletedResult(persistedCompleted, persistedDraft, persistedAutoPublish)) {
        await stopForRecovery(
          'side_effect_recovery_result_missing',
          'Der abgeschlossene Lauf kann ohne gültiges dauerhaftes Draft-Ergebnis nicht sicher wiederaufgenommen werden.'
        );
      }
      draftPersisted = true;
      await finishRunRequired({ status: 'completed', postId: persistedDraft.post.id });
      return {
        status: 'completed',
        post: persistedAutoPublish?.post || persistedDraft.post,
        metadata: persistedDraft.metadata,
        ...(persistedAutoPublish ? { reviewRequired: persistedAutoPublish.reviewRequired } : {})
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
      return await completeDraft(persistedDraft, persistedAutoPublish);
    }

    const persistedInventory = await readPersistedStage('inventory');
    let inventoryResult = persistedInventory;
    if (persistedInventory && !isPersistedInventoryResult(persistedInventory)) {
      return finishManual(
        'inventory_recovery_invalid',
        'Die persistierte Inventarstage ist unvollständig oder zu groß.'
      );
    }
    if (!inventoryResult) {
      const liveInventory = await inventoryService.buildSiteInventory();
      const counts = {
        blogPosts: liveInventory.blogPosts?.length || 0,
        guides: liveInventory.guides?.length || 0,
        servicePages: liveInventory.servicePages?.length || 0,
        industries: liveInventory.industries?.length || 0,
        packages: liveInventory.packages?.length || 0
      };
      inventoryResult = { inventory: liveInventory, counts };
      if (!isPersistedInventoryResult(inventoryResult)) {
        return finishManual('inventory_invalid', 'Das geladene Seiteninventar ist unvollständig oder zu groß.');
      }
      await updateStage('inventory', inventoryResult);
    }
    const inventory = inventoryResult.inventory;
    const pricingContext = inventory.packages || [];

    const seedTopics = Array.isArray(input.seedTopics)
      ? input.seedTopics.filter((entry) => typeof entry === 'string' && entry.trim())
      : [];
    const useWeeklyTopicPool = seedTopics.length === 0
      && typeof openaiService.createWeeklyTopicPool === 'function';
    let selectedTopic = null;

    if (useWeeklyTopicPool) {
      const weeklyTopicPoolRepository = required(
        dependencies.weeklyTopicPoolRepository,
        'weeklyTopicPoolRepository'
      );
      const identity = getWeeklyTopicPoolIdentity({
        currentDate: input.currentDate,
        timezone: config.timezone
      });
      let weeklyPool = await weeklyTopicPoolRepository.findPool(identity);

      if (!weeklyPool) {
        required(
          weeklyTopicPoolRepository.withPoolCreationLock,
          'weeklyTopicPoolRepository.withPoolCreationLock'
        );
        const lockedResult = await weeklyTopicPoolRepository.withPoolCreationLock(
          identity,
          async (lockedRepository) => {
            await assertLease();
            const concurrentlyCreatedPool = await lockedRepository.findPool(identity);
            if (concurrentlyCreatedPool) {
              return { pool: concurrentlyCreatedPool, reused: true };
            }

            const researchAttempt = await lockedRepository.claimResearchAttempt({
              ...identity,
              generationRunId: runId
            });
            const recoverableInvalidPool = !researchAttempt?.acquired
              && researchAttempt?.ownerGenerationRunId === runId
              && researchAttempt?.status === 'needs_manual_attention'
              && researchAttempt?.errorCode === 'weekly_topic_pool_invalid'
              && typeof researchAttempt?.responseId === 'string'
              && researchAttempt.responseId.trim() !== '';
            if (!researchAttempt?.acquired && !recoverableInvalidPool) {
              return {
                manualResult: await finishManual(
                  'weekly_topic_research_already_attempted',
                  'Für diese Kalenderwoche existiert bereits ein nicht sicher wiederholbarer Rechercheversuch.',
                  {
                    ownerGenerationRunId: researchAttempt?.ownerGenerationRunId ?? null,
                    attemptStatus: researchAttempt?.status || 'unknown',
                    attemptErrorCode: researchAttempt?.errorCode || null
                  }
                )
              };
            }

            let weeklyResearch;
            try {
              let searchConsoleSignals = buildSearchConsoleTopicSignals();
              if (typeof dependencies.loadSearchConsoleTopicSignals === 'function') {
                try {
                  const rawSearchConsoleSignals = await dependencies.loadSearchConsoleTopicSignals();
                  searchConsoleSignals = buildSearchConsoleTopicSignals(rawSearchConsoleSignals);
                } catch (error) {
                  recordAuditWarning(error, 'GSC_TOPIC_SIGNALS_UNAVAILABLE');
                }
              }
              weeklyResearch = await paidTextOperation({
                stage: 'weekly_topic_research',
                operation: openaiService.createWeeklyTopicPool,
                input: {
                  inventory,
                  currentDate: input.currentDate,
                  regionFocus: input.regionFocus,
                  searchConsoleSignals,
                  maxCandidates: config.maxTopicCandidates || 9
                },
                returnEnvelope: true,
                recoveryOnly: recoverableInvalidPool
              });
            } catch (error) {
              const safelyNotExecuted = error?.providerExecutionPhase === 'not_started'
                || error?.providerExecutionPhase === 'not_executed';
              try {
                if (safelyNotExecuted) {
                  await lockedRepository.releaseResearchAttempt({
                    ...identity,
                    generationRunId: runId
                  });
                } else {
                  await lockedRepository.markResearchAttempt({
                    ...identity,
                    generationRunId: runId,
                    status: 'needs_manual_attention',
                    errorCode: error instanceof ManualAttentionStop
                      ? error.result?.code || 'provider_execution_uncertain'
                      : error?.code || 'weekly_topic_research_failed',
                    responseId: error?.responseId || null
                  });
                }
              } catch {
                recordAuditWarning(error, 'WEEKLY_RESEARCH_ATTEMPT_UPDATE_FAILED');
              }
              throw error;
            }
            const parsedWeeklyResearch = WeeklyTopicPoolResultSchema.safeParse(weeklyResearch.value);
            if (!parsedWeeklyResearch.success) {
              await lockedRepository.markResearchAttempt({
                ...identity,
                generationRunId: runId,
                status: 'needs_manual_attention',
                errorCode: 'weekly_topic_pool_invalid',
                responseId: weeklyResearch.responseId ?? null
              });
              return {
                manualResult: await finishManual(
                  'weekly_topic_pool_invalid',
                  'Die wöchentliche Webrecherche lieferte keinen vertragsgültigen Themenpool.'
                )
              };
            }
            const sourceInspection = inspectSourceReferences(
              parsedWeeklyResearch.data.sourceReferences,
              { required: true }
            );
            if (!sourceInspection.valid) {
              const errorCode = sourceInspection.code || 'weekly_topic_sources_insufficient';
              await lockedRepository.markResearchAttempt({
                ...identity,
                generationRunId: runId,
                status: 'needs_manual_attention',
                errorCode,
                responseId: weeklyResearch.responseId ?? null
              });
              return {
                manualResult: await finishManual(
                  errorCode,
                  sourceInspection.code === 'too_many_sources'
                    ? 'Die wöchentliche Themenrecherche darf höchstens sechs validierte Quellen verwenden.'
                    : 'Die wöchentliche Themenrecherche benötigt zwei bis sechs eindeutige validierte HTTPS-Quellen.'
                )
              };
            }
            const pool = await lockedRepository.createPool({
              ...identity,
              candidates: parsedWeeklyResearch.data.candidates,
              sourceReferences: sourceInspection.sources,
              responseId: weeklyResearch.responseId ?? null,
              promptVersion: weeklyResearch.promptVersion
            });
            await lockedRepository.markResearchAttempt({
              ...identity,
              generationRunId: runId,
              status: 'completed',
              responseId: weeklyResearch.responseId ?? null
            });
            return { pool, reused: false };
          }
        );
        if (lockedResult.manualResult) return lockedResult.manualResult;
        weeklyPool = lockedResult.pool;
        if (lockedResult.reused) {
          await updateStage('weekly_topic_pool_cache', {
            poolId: weeklyPool.id,
            weekStart: weeklyPool.weekStart,
            candidateCount: weeklyPool.candidates?.length || 0,
            sourceCount: weeklyPool.sourceReferences?.length || 0,
            reused: true
          }, {
            stageId: `weekly_topic_pool_cache:${identity.weekStart}`
          });
        }
      } else {
        weeklyPool = normalizeWeeklyTopicPool(weeklyPool);
        if (!weeklyPool) {
          return finishManual(
            'weekly_topic_pool_invalid',
            'Der gespeicherte Wochenpool ist unvollständig oder widersprüchlich.'
          );
        }
        await updateStage('weekly_topic_pool_cache', {
          poolId: weeklyPool.id,
          weekStart: weeklyPool.weekStart,
          candidateCount: weeklyPool.candidates.length,
          sourceCount: weeklyPool.sourceReferences.length,
          reused: true
        }, {
          stageId: `weekly_topic_pool_cache:${identity.weekStart}`
        });
      }

      weeklyPool = normalizeWeeklyTopicPool(weeklyPool);
      if (!weeklyPool) {
        return finishManual(
          'weekly_topic_pool_invalid',
          'Der gespeicherte Wochenpool ist unvollständig oder widersprüchlich.'
        );
      }

      selectedTopic = findWeeklyCandidateForRun(weeklyPool, runId);
      if (!selectedTopic) {
        let availableCandidates = listAvailableWeeklyCandidates(weeklyPool);
        while (availableCandidates.length > 0 && !selectedTopic) {
          const candidate = topicScoringService.selectBestTopic(availableCandidates, inventory);
          if (!candidate) break;
          await assertLease();
          const claimed = await weeklyTopicPoolRepository.claimCandidate({
            poolId: weeklyPool.id,
            candidateSlug: candidate.slug,
            generationRunId: runId
          });
          if (claimed) selectedTopic = candidate;
          else availableCandidates = availableCandidates.filter(({ slug }) => slug !== candidate.slug);
        }
      }
    } else {
      const topicCandidates = await paidTextOperation({
        stage: 'topic_research',
        operation: openaiService.createTopicCandidates,
        input: {
          inventory,
          seedTopics,
          maxCandidates: config.maxTopicCandidates
        }
      });
      selectedTopic = topicScoringService.selectBestTopic(topicCandidates.candidates, inventory);
    }

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
        internalLinks: snapshotInternalLinks,
        sourceReferences,
        pricingContext,
        learningRules: activeLearningRules(config, 'seo_brief')
      }
    });
    const invalidBriefSources = await validateOptionalSourceBoundary(briefing.sourceReferences, sourceReferences);
    if (invalidBriefSources) return invalidBriefSources;
    if (!internalLinksWithinSnapshot(briefing.internalLinks, snapshotInternalLinks)) {
      return finishManual(
        'brief_internal_links_invalid',
        'Das SEO-Briefing enthält interne Links außerhalb des unveränderlichen Jobsnapshots.'
      );
    }
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
      input: {
        briefing,
        pricingContext,
        learningRules: activeLearningRules(config, 'writer')
      }
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
      allowedInternalLinks: snapshotInternalLinks,
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
        input: {
          briefing,
          article: reviewableArticle(),
          sourceReferences,
          learningRules: activeLearningRules(config, 'reviewer')
        }
      });
      if (reviewRequiresSources(currentReview)) {
        const requiredSources = await requireValidSources(sourceReferences);
        if (!requiredSources.ok) return requiredSources.result;
      }
    }

    const qualityRecovery = await readPersistedStage(QUALITY_GATE_RECOVERY_AUDIT_KEY);
    const maximumRevisions = config.maxRevisions + (
      authorizedQualityRecovery(qualityRecovery, config.maxRevisions) ? 1 : 0
    );
    const editorialReviewRecovery = await readPersistedStage(EDITORIAL_REVIEW_RECOVERY_AUDIT_KEY);
    let revision = 0;
    const approved = () => validation.passed
      && currentReview?.passed === true
      && currentReview.score >= 80
      && currentReview.requiresManualReview !== true
      && currentReview.risks?.staticPrices !== true;

    while (!approved() && revision < maximumRevisions) {
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
          issues: [...issues, pricingLockIssue(lockedPricingTokens)],
          sourceReferences,
          learningRules: activeLearningRules(config, 'writer')
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
          input: {
            briefing,
            article: reviewableArticle(),
            sourceReferences,
            learningRules: activeLearningRules(config, 'reviewer')
          }
        });
        if (reviewRequiresSources(currentReview)) {
          const requiredSources = await requireValidSources(sourceReferences);
          if (!requiredSources.ok) return requiredSources.result;
        }
      } else {
        currentReview = null;
      }
    }

    if (!approved()
        && validation.passed
        && authorizedEditorialReviewRecovery(editorialReviewRecovery, maximumRevisions)) {
      currentReview = await paidTextOperation({
        stage: 'review',
        stageId: `review:${maximumRevisions + 1}`,
        operation: openaiService.reviewArticle,
        input: {
          briefing,
          article: reviewableArticle(),
          sourceReferences,
          learningRules: activeLearningRules(config, 'reviewer')
        }
      });
      if (reviewRequiresSources(currentReview)) {
        const requiredSources = await requireValidSources(sourceReferences);
        if (!requiredSources.ok) return requiredSources.result;
      }
    }

    if (!approved()) {
      return finishManual(
        'quality_gate_failed',
        currentReview?.score < 80
          ? 'Der Reviewscore liegt unter 80.'
          : 'Der Artikel hat die Qualitätsprüfung nicht bestanden.',
        { qualityIssues: safeQualityIssues(currentReview) }
      );
    }

    const draftPersistenceRecovery = await readPersistedStage(DRAFT_PERSISTENCE_RECOVERY_AUDIT_KEY);
    if (authorizedDraftPersistenceRecovery(draftPersistenceRecovery)) {
      imageGenerationStageId = draftPersistenceRecovery.imageGenerationStageId;
      cloudinaryUploadStageId = draftPersistenceRecovery.cloudinaryUploadStageId;
      imageCleanupStageId = 'image_cleanup:2';
    }

    await assertLease();
    const imageReservation = await costService.reserveMonthlyBudget({
      runId,
      stageId: imageGenerationStageId,
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
        stageId: imageGenerationStageId
      });
      const persistedUpload = await costService.getPersistedStageResult({
        runId,
        stageId: cloudinaryUploadStageId
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
          stageId: imageGenerationStageId,
          reservationMonth: imageReservation.reservationMonth,
          actualCost: config.imageCostEur
        });
        await updateStage('image_generation', uploadedImage.audit?.imageGeneration || {
          status: 'completed',
          costIncurred: true
        }, { stageId: imageGenerationStageId });
        await updateStage('cloudinary_upload', {
          ...(uploadedImage.audit?.upload || { status: 'completed' }),
          imageUrl: uploadedImage.imageUrl,
          publicId: uploadedImage.publicId,
          bytes: uploadedImage.bytes
        }, { stageId: cloudinaryUploadStageId });
      } catch (error) {
        await recordImageProviderOutcomes(error.audit || {}, error);
        try {
          await costService.settleMonthlyBudget({
            runId,
            stageId: imageGenerationStageId,
            reservationMonth: imageReservation.reservationMonth,
            actualCost: config.imageCostEur
          });
        } catch {
          recordAuditWarning(error, 'BUDGET_SETTLEMENT_FAILED', { stageId: imageGenerationStageId });
        }
        const audit = error.audit || {};
        await safeUpdateStage('image_generation', audit.imageGeneration || {
          status: 'failed',
          costIncurred: true,
          code: 'IMAGE_GENERATION_FAILED'
        }, { stageId: imageGenerationStageId }, error);
        await safeUpdateStage(
          'cloudinary_upload',
          audit.upload || { status: 'not_started' },
          { stageId: cloudinaryUploadStageId },
          error
        );
        if (audit.cleanup) {
          await safeUpdateStage('image_cleanup', audit.cleanup, { stageId: imageCleanupStageId }, error);
        }
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
        await safeUpdateStage('image_cleanup', cleanupResult, { stageId: imageCleanupStageId }, null);
      }
    } else {
      await assertLease();
      const focusedReview = buildFocusedRiskReport({
        article: reviewableArticle(),
        review: currentReview,
        validation,
        sources: sourceReferences
      });
      const draftInput = {
        generationRunId: runId,
        scheduledAt: config.publicationAt ?? input.publication_at ?? null,
        adminNotificationEmail: config.adminNotificationEmail,
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
          quality_report_json: {
            ...currentReview,
            focusedReview
          },
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
      await safeUpdateStage('image_cleanup', cleanupResult, { stageId: imageCleanupStageId }, null);
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
    return await completeDraft({
      ...draft,
      topicId,
      qualityScore: currentReview.score
    });
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
        await safeUpdateStage('image_cleanup', deferred, { stageId: imageCleanupStageId }, error);
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
        await finishRunRequired({
          status: 'failed',
          errorReport: { code: 'pipeline_failed', message: error.message }
        });
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
      await safeUpdateStage('image_cleanup', cleanupResult, { stageId: imageCleanupStageId }, error);
    }
    if (error instanceof ContentBudgetLimitError || error?.code === 'CONTENT_BUDGET_LIMIT_REACHED') {
      return finishManual('budget_limit_reached', 'Das konfigurierte Monatsbudget ist erreicht.');
    }
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    await finishRunRequired({
      status: 'failed',
      errorReport: { code: 'pipeline_failed', message: error.message }
    });
    if (auditWarnings.length > 0) error.auditWarnings = auditWarnings;
    throw error;
  }
}
