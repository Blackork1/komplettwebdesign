import { createHash } from 'node:crypto';

import {
  ReviewOutputSchema,
  SourceReferenceSchema
} from './articleSchemas.js';
import {
  createContentRevisionService,
  liveHashForPost
} from './contentRevisionService.js';
import { learningRulesForStage } from './contentLearningSnapshotService.js';
import {
  buildExistingPostDiff,
  validateTargetedOptimizationScope
} from './existingPostDiffService.js';
import { classifyExistingPostFreshness } from './existingPostFreshnessService.js';
import { ExistingPostOptimizationOutputSchema } from './existingPostOptimizationSchemas.js';
import { auditExistingPost } from './legacyAuditService.js';
import { executePaidStructuredTextStage } from './providerTextStageService.js';
import { readExistingPostTrustedContextSnapshot } from './contentRuleManifest.js';

const SourceResearchOutputSchema = SourceReferenceSchema.array().max(6);
const HASH = /^[0-9a-f]{64}$/;
const MAX_OPTIMIZATION_REPORT_BYTES = 512_000;
const MAX_GSC_SIGNALS = 10;
const MAX_GSC_QUERY_LENGTH = 180;
const VERIFICATION_TYPES = new Set(['none', 'source', 'date', 'price', 'version', 'legal', 'privacy']);
const PERMANENT_ASSESSMENT_ERRORS = new Set([
  'EXISTING_POST_DIFF_FAILED',
  'EXISTING_POST_DIFF_INPUT_INVALID',
  'EXISTING_POST_IMMUTABLE_FIELD_CHANGE_FORBIDDEN',
  'LEGACY_EJS_CONTENT_CHANGE_FORBIDDEN'
]);
const DETERMINISTIC_OPTIMIZATION_FAILURE_CODES = Object.freeze([
  'OPENAI_LEGACY_EJS_CONTENT_CHANGED'
]);

function pipelineError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function positiveInteger(value) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Die Bestandsoptimierung benötigt ${name}.`);
  }
  return value;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableJson(value[key])}`
  )).join(',')}}`;
}

function optimizationFingerprint(fields) {
  return createHash('sha256').update(stableJson(fields)).digest('hex');
}

function parseLiveSnapshotStage(value, postId) {
  if (!plainObject(value) || !plainObject(value.post)
      || positiveInteger(value.post.id) !== postId
      || value.post.published !== true
      || !HASH.test(String(value.baseLiveHash || ''))) return null;
  try {
    if (liveHashForPost(value.post) !== value.baseLiveHash) return null;
  } catch {
    return null;
  }
  return { post: structuredClone(value.post), baseLiveHash: value.baseLiveHash };
}

function versionedStage(value, baseLiveHash, candidateFingerprint = null) {
  if (!plainObject(value) || value.baseLiveHash !== baseLiveHash) return false;
  return candidateFingerprint === null || value.candidateFingerprint === candidateFingerprint;
}

function parseAuditStage(value, baseLiveHash) {
  if (!versionedStage(value, baseLiveHash)
      || !positiveInteger(value.auditId)
      || !Number.isFinite(value.score)
      || !Array.isArray(value.findings)
      || !Array.isArray(value.recommendedActions)) return null;
  return {
    auditId: positiveInteger(value.auditId),
    score: value.score,
    findings: structuredClone(value.findings),
    recommendedActions: structuredClone(value.recommendedActions)
  };
}

function normalizeGscDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function normalizeGscQuery(value) {
  if (typeof value !== 'string') return null;
  const query = value
    .replace(/[\u0000-\u001f\u007f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, MAX_GSC_QUERY_LENGTH)
    .trim();
  return query || null;
}

function normalizeGscSignal(value) {
  if (!plainObject(value)) return null;
  const query = normalizeGscQuery(value.query);
  if (!query) return null;
  const numericFields = ['clicks', 'impressions', 'ctr', 'average_position'];
  if (numericFields.some((field) => (
    typeof value[field] !== 'number'
    || !Number.isFinite(value[field])
    || value[field] < 0
  )) || value.ctr > 1) return null;

  const normalized = {
    query,
    clicks: value.clicks,
    impressions: value.impressions,
    ctr: value.ctr,
    average_position: value.average_position
  };
  for (const field of ['start_date', 'end_date']) {
    if (value[field] === undefined) continue;
    const date = normalizeGscDate(value[field]);
    if (!date) return null;
    normalized[field] = date;
  }
  if (normalized.start_date && normalized.end_date
      && normalized.start_date > normalized.end_date) return null;
  return normalized;
}

function normalizeGscSignals(values) {
  const signals = [];
  for (const value of Array.isArray(values) ? values : []) {
    if (signals.length >= MAX_GSC_SIGNALS) break;
    const signal = normalizeGscSignal(value);
    if (signal) signals.push(signal);
  }
  return signals;
}

function parseGscStage(value, baseLiveHash) {
  if (!versionedStage(value, baseLiveHash)
      || typeof value.available !== 'boolean'
      || !Array.isArray(value.signals)) return null;
  return { available: value.available, signals: normalizeGscSignals(value.signals) };
}

function parseFreshnessStage(value, baseLiveHash) {
  if (!versionedStage(value, baseLiveHash)
      || typeof value.requiresResearch !== 'boolean'
      || !Array.isArray(value.reasons)
      || value.reasons.some((reason) => typeof reason !== 'string')) return null;
  return {
    requiresResearch: value.requiresResearch,
    reasons: [...value.reasons]
  };
}

function validPersistedChange(change) {
  return plainObject(change)
    && HASH.test(String(change.id || ''))
    && HASH.test(String(change.beforeFingerprint || ''))
    && HASH.test(String(change.afterFingerprint || ''))
    && typeof change.field === 'string'
    && typeof change.changeType === 'string'
    && change.status === 'active';
}

function parseDiffStage(value, baseLiveHash, candidateFingerprint) {
  if (!versionedStage(value, baseLiveHash, candidateFingerprint)
      || !Array.isArray(value.changes)
      || !value.changes.every(validPersistedChange)) return null;
  return { changes: structuredClone(value.changes) };
}

function parseScopeStage(value, baseLiveHash, candidateFingerprint) {
  if (!versionedStage(value, baseLiveHash, candidateFingerprint)
      || typeof value.passed !== 'boolean'
      || !(value.code === null || typeof value.code === 'string')
      || !Number.isFinite(value.changedBlockRatio)
      || value.changedBlockRatio < 0
      || value.changedBlockRatio > 1
      || !Number.isFinite(value.wordCountDeltaRatio)
      || value.wordCountDeltaRatio < 0) return null;
  const semanticallyPassed = value.changedBlockRatio <= 0.35
    && value.wordCountDeltaRatio <= 0.25;
  if (value.passed !== semanticallyPassed
      || value.code !== (semanticallyPassed ? null : 'TARGETED_SCOPE_EXCEEDED')) return null;
  return {
    passed: value.passed,
    code: value.code,
    changedBlockRatio: value.changedBlockRatio,
    wordCountDeltaRatio: value.wordCountDeltaRatio
  };
}

function validValidationIssue(issue) {
  if (!plainObject(issue)) return false;
  const allowedKeys = new Set(['code', 'message', 'href', 'actualLength', 'className']);
  const keys = Object.keys(issue);
  return keys.length <= allowedKeys.size
    && keys.every((key) => allowedKeys.has(key))
    && typeof issue.code === 'string'
    && issue.code.length > 0
    && issue.code.length <= 80
    && typeof issue.message === 'string'
    && issue.message.length > 0
    && issue.message.length <= 2_000
    && (issue.href === undefined || (typeof issue.href === 'string' && issue.href.length <= 2_048))
    && (issue.className === undefined
      || (typeof issue.className === 'string' && issue.className.length <= 200))
    && (issue.actualLength === undefined
      || (Number.isSafeInteger(issue.actualLength) && issue.actualLength >= 0));
}

function parseValidationStage(value, baseLiveHash, candidateFingerprint) {
  if (!versionedStage(value, baseLiveHash, candidateFingerprint)
      || typeof value.passed !== 'boolean'
      || !Array.isArray(value.issues)
      || value.issues.length > 100
      || !value.issues.every(validValidationIssue)
      || value.passed !== (value.issues.length === 0)) return null;
  return { passed: value.passed, issues: structuredClone(value.issues) };
}

function serializedReportBytes(report, diff) {
  return Buffer.byteLength(JSON.stringify({
    ...report,
    changes: Array.isArray(diff?.changes) ? diff.changes : []
  }), 'utf8');
}

function articleFromPost(post) {
  return {
    id: Number(post.id),
    title: post.title,
    slug: post.slug,
    shortDescription: post.excerpt,
    contentHtml: post.content,
    contentFormat: post.content_format,
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    ogTitle: post.og_title,
    ogDescription: post.og_description,
    faqJson: Array.isArray(post.faq_json) ? post.faq_json : [],
    imageUrl: post.image_url,
    imageAlt: post.image_alt,
    published: post.published,
    status: post.workflow_status,
    publishedAt: post.published_at ?? null,
    scheduledPublishAt: post.scheduled_at ?? null,
    updatedAt: post.updated_at
  };
}

function optimizedArticle(post, fields) {
  return {
    ...articleFromPost(post),
    title: fields.title,
    shortDescription: fields.shortDescription,
    metaTitle: fields.metaTitle,
    metaDescription: fields.metaDescription,
    ogTitle: fields.ogTitle,
    ogDescription: fields.ogDescription,
    contentHtml: fields.contentHtml,
    faqJson: fields.faqJson,
    imageAlt: fields.imageAlt
  };
}

function reviewApproved(review) {
  const risks = review?.risks && typeof review.risks === 'object'
    ? Object.values(review.risks).some((value) => value === true)
    : true;
  const blockingIssue = Array.isArray(review?.issues)
    && review.issues.some((issue) => issue?.blocking === true || issue?.autoPublishBlocking === true);
  return review?.passed === true
    && Number(review.score) >= 80
    && review.requiresManualReview !== true
    && !risks
    && !blockingIssue;
}

function safeIssues(issues = []) {
  return (Array.isArray(issues) ? issues : []).slice(0, 24).map((issue) => ({
    code: typeof issue?.code === 'string' ? issue.code.slice(0, 80) : 'optimization_issue',
    severity: ['info', 'warning', 'error'].includes(issue?.severity) ? issue.severity : 'error',
    message: typeof issue?.message === 'string'
      ? issue.message.slice(0, 2_000)
      : 'Die gezielte Optimierung hat eine Prüfung nicht bestanden.',
    field: typeof issue?.field === 'string' ? issue.field.slice(0, 80) : 'contentHtml',
    evidence: typeof issue?.evidenceExcerpt === 'string'
      ? issue.evidenceExcerpt.slice(0, 280)
      : undefined,
    repairInstruction: typeof issue?.repairInstruction === 'string'
      ? issue.repairInstruction.slice(0, 2_000)
      : undefined,
    sectionHeading: typeof issue?.sectionHeading === 'string'
      ? issue.sectionHeading.slice(0, 180)
      : undefined,
    verificationType: VERIFICATION_TYPES.has(issue?.verificationType)
      ? issue.verificationType
      : undefined,
    sourceRequired: typeof issue?.sourceRequired === 'boolean'
      ? issue.sourceRequired
      : undefined
  }));
}

function repairFindings(assessment, review) {
  const findings = [];
  if (assessment?.scope?.passed === false) {
    findings.push({
      code: 'targeted_scope_exceeded',
      severity: 'error',
      field: 'contentHtml',
      message: `Die Änderung überschreitet den gezielten Umfang (Blöcke: ${assessment.scope.changedBlockRatio}, Wörter: ${assessment.scope.wordCountDeltaRatio}).`
    });
  }
  findings.push(...safeIssues(assessment?.validation?.issues));
  findings.push(...safeIssues(review?.issues));
  if (review && findings.length === 0) {
    findings.push({
      code: 'editorial_review_failed',
      severity: 'error',
      field: 'contentHtml',
      message: typeof review.summary === 'string'
        ? review.summary.slice(0, 2_000)
        : 'Die redaktionelle Prüfung wurde nicht bestanden.'
    });
  }
  return findings;
}

function affectedExcerpts(audit) {
  return (Array.isArray(audit?.findings) ? audit.findings : []).slice(0, 8).map((finding) => ({
    field: typeof finding?.field === 'string' ? finding.field : 'contentHtml',
    heading: '',
    text: String(finding?.evidence || finding?.message || finding?.code || '').slice(0, 1_200)
  })).filter(({ text }) => text.length > 0);
}

function snapshotLearningRules(runtimeSnapshot, stage) {
  if (Object.hasOwn(runtimeSnapshot, 'learningRuleSnapshot')) {
    return learningRulesForStage(runtimeSnapshot.learningRuleSnapshot, stage);
  }
  return [];
}

function snapshotInternalLinks(runtimeSnapshot, fallbackLinks) {
  if (Object.hasOwn(runtimeSnapshot, 'allowedInternalLinks')) {
    if (!Array.isArray(runtimeSnapshot.allowedInternalLinks)) {
      throw pipelineError(
        'CONTENT_ALLOWED_INTERNAL_LINKS_INVALID',
        'Der persistierte Link-Snapshot ist ungültig.'
      );
    }
    return [...runtimeSnapshot.allowedInternalLinks];
  }
  return Array.isArray(fallbackLinks) ? [...fallbackLinks] : [];
}

function snapshotCurrentYear(runtimeSnapshot) {
  const explicitYear = Number(runtimeSnapshot.currentYear);
  if (Number.isSafeInteger(explicitYear) && explicitYear >= 2000 && explicitYear <= 3000) {
    return explicitYear;
  }
  const startedAt = new Date(runtimeSnapshot.startedAt);
  if (!Number.isNaN(startedAt.getTime())) {
    try {
      const yearPart = new Intl.DateTimeFormat('de-DE', {
        timeZone: runtimeSnapshot.timezone || 'Europe/Berlin',
        year: 'numeric'
      }).formatToParts(startedAt).find(({ type }) => type === 'year')?.value;
      const localizedYear = Number(yearPart);
      if (Number.isSafeInteger(localizedYear)) return localizedYear;
    } catch {
      return startedAt.getUTCFullYear();
    }
  }
  return new Date().getFullYear();
}

export async function runExistingPostOptimizationJob({
  claim,
  run,
  runtimeSnapshot,
  leaseGuard
} = {}, dependencies = {}) {
  const payload = claim?.payload_json;
  const postId = positiveInteger(payload?.post_id);
  const jobId = positiveInteger(claim?.id);
  const runId = positiveInteger(run?.id);
  const adminId = positiveInteger(payload?.admin_id);
  const trustedContext = readExistingPostTrustedContextSnapshot(runtimeSnapshot);
  if (!postId || !jobId || !runId || !adminId || !HASH.test(String(payload?.base_live_hash || ''))
      || !runtimeSnapshot || typeof runtimeSnapshot !== 'object' || Array.isArray(runtimeSnapshot)
      || typeof runtimeSnapshot.webSearchCostPerCallEur !== 'number'
      || !Number.isFinite(runtimeSnapshot.webSearchCostPerCallEur)
      || runtimeSnapshot.webSearchCostPerCallEur < 0
      || !trustedContext) {
    throw pipelineError(
      'CONTENT_EXISTING_OPTIMIZATION_INPUT_INVALID',
      'Die Eingabe der Bestandsoptimierung ist ungültig.'
    );
  }

  const optimizationRepository = dependencies.optimizationRepository;
  const auditRepository = dependencies.auditRepository || optimizationRepository;
  const searchMetricsRepository = dependencies.searchMetricsRepository;
  const openaiService = dependencies.openaiService;
  const costService = dependencies.costService;
  const runRepository = dependencies.runRepository;
  const validateArticle = requiredFunction(dependencies.validateArticle, 'validateArticle');
  const assertLease = typeof leaseGuard === 'function' ? leaseGuard : async () => true;
  requiredFunction(optimizationRepository?.getPublishedPostSnapshot, 'optimizationRepository.getPublishedPostSnapshot');
  requiredFunction(auditRepository?.createAuditIdempotent, 'auditRepository.createAuditIdempotent');
  requiredFunction(searchMetricsRepository?.getPageSignals, 'searchMetricsRepository.getPageSignals');
  requiredFunction(openaiService?.optimizeExistingPost, 'openaiService.optimizeExistingPost');
  requiredFunction(openaiService?.reviewArticle, 'openaiService.reviewArticle');
  requiredFunction(costService?.getPersistedStageResult, 'costService.getPersistedStageResult');
  requiredFunction(runRepository?.updateRunStage, 'runRepository.updateRunStage');
  requiredFunction(runRepository?.finishRun, 'runRepository.finishRun');

  const providerDependencies = { ...dependencies, assertLease };
  const revisionService = dependencies.revisionService || createContentRevisionService({
    optimizationRepository,
    validateArticle
  });

  async function updateStage(currentStage, stageResult = {}, stageId = currentStage) {
    await assertLease();
    const persisted = await runRepository.updateRunStage(runId, {
      currentStage,
      stageId,
      stageResult,
      tokenUsage: {},
      costEstimate: 0,
      responseIds: []
    });
    if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) {
      throw pipelineError(
        'CONTENT_STAGE_PERSISTENCE_FAILED',
        `Die Bestandsoptimierungsstufe ${stageId} konnte nicht sicher gespeichert werden.`,
        { retryable: true }
      );
    }
    return persisted;
  }

  async function finish(status, code = null, message = '', details = {}) {
    await assertLease();
    const result = await runRepository.finishRun(runId, {
      status,
      postId,
      errorReport: code ? { code, message, ...details } : {}
    });
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw pipelineError(
        'CONTENT_RUN_FINISH_FAILED',
        'Der Lauf der Bestandsoptimierung konnte nicht sicher abgeschlossen werden.',
        { retryable: true }
      );
    }
    return result;
  }

  async function finishManual(code, message, details = {}) {
    await finish('needs_manual_attention', code, message, details);
    return { status: 'needs_manual_attention', revisionId: null, postId, code };
  }

  async function finishFailed(code, message, details = {}) {
    await finish('failed', code, message, details);
    return { status: 'failed', revisionId: null, postId, code };
  }

  async function loadValidatedStage(stageId, parse) {
    await assertLease();
    const persisted = await costService.getPersistedStageResult({ runId, stageId });
    if (persisted === null || persisted === undefined) return { reused: false };
    let value;
    try {
      value = parse(persisted);
    } catch {
      value = null;
    }
    if (value === null || value === undefined) {
      return {
        terminal: await finishManual(
          'persisted_stage_result_invalid',
          'Ein gespeichertes Stufenergebnis ist ungültig oder gehört zu einer anderen Ausgangsversion.',
          { stageId }
        )
      };
    }
    return { reused: true, value };
  }

  async function paidStage({
    stageId,
    schema,
    kind = 'content',
    execute,
    calculateAdditionalCost,
    deterministicFailureCodes
  }) {
    const reviewStage = kind === 'review';
    const result = await executePaidStructuredTextStage({
      run,
      stageId,
      versionFence: { key: 'baseLiveHash', value: payload.base_live_hash },
      runtimeSnapshot,
      reservationCost: Number(reviewStage
        ? runtimeSnapshot.reviewStageReservationEur ?? runtimeSnapshot.contentStageReservationEur
        : runtimeSnapshot.contentStageReservationEur),
      inputRate: Number(reviewStage
        ? runtimeSnapshot.reviewInputCostPerMtok ?? runtimeSnapshot.contentInputCostPerMtok
        : runtimeSnapshot.contentInputCostPerMtok),
      outputRate: Number(reviewStage
        ? runtimeSnapshot.reviewOutputCostPerMtok ?? runtimeSnapshot.contentOutputCostPerMtok
        : runtimeSnapshot.contentOutputCostPerMtok),
      schema,
      execute,
      calculateAdditionalCost,
      deterministicFailureCodes
    }, providerDependencies);
    if (result.manual) {
      return {
        terminal: await finishManual(
          result.manual.code,
          result.manual.message,
          Array.isArray(result.manual.issues) ? { issues: result.manual.issues } : {}
        )
      };
    }
    if (result.failed) {
      return {
        terminal: await finishFailed(result.failed.code, result.failed.message)
      };
    }
    return { value: result.value, envelope: result.envelope };
  }

  const liveStage = await loadValidatedStage(
    'live_snapshot',
    (value) => parseLiveSnapshotStage(value, postId)
  );
  if (liveStage.terminal) return liveStage.terminal;
  let post;
  let baseLiveHash;
  if (liveStage.reused) {
    ({ post, baseLiveHash } = liveStage.value);
  } else {
    await assertLease();
    post = await optimizationRepository.getPublishedPostSnapshot(postId);
    if (!post || post.published !== true) {
      return finishFailed('CONTENT_POST_NOT_FOUND', 'Veröffentlichter Beitrag nicht gefunden.');
    }
    baseLiveHash = liveHashForPost(post);
    await updateStage('live_snapshot', { post, baseLiveHash });
  }
  if (baseLiveHash !== payload.base_live_hash) {
    return finishManual(
      'CONTENT_REVISION_STALE',
      'Der Liveartikel wurde seit dem Start der Optimierung verändert.'
    );
  }

  const allowedInternalLinks = snapshotInternalLinks(
    runtimeSnapshot,
    trustedContext.allowedInternalLinks
  );
  const writerLearningRules = snapshotLearningRules(
    runtimeSnapshot,
    'writer'
  );
  const reviewerLearningRules = snapshotLearningRules(
    runtimeSnapshot,
    'reviewer'
  );
  const inventory = allowedInternalLinks.map((url) => ({ url }));
  const auditStage = await loadValidatedStage(
    'existing_content_audit',
    (value) => parseAuditStage(value, baseLiveHash)
  );
  if (auditStage.terminal) return auditStage.terminal;
  let audit;
  let auditId;
  if (auditStage.reused) {
    ({ auditId, ...audit } = auditStage.value);
  } else {
    audit = (dependencies.auditExistingPost || auditExistingPost)({
      post: { ...post, ...(trustedContext?.metadata || {}) },
      inventory,
      currentYear: snapshotCurrentYear(runtimeSnapshot)
    });
    await assertLease();
    const persistedAudit = await auditRepository.createAuditIdempotent({
      postId,
      jobId,
      runId,
      auditType: 'existing_post_optimization',
      score: audit.score,
      findings: audit.findings,
      recommendedActions: audit.recommendedActions
    });
    auditId = positiveInteger(persistedAudit?.id);
    if (!auditId) {
      return finishFailed(
        'CONTENT_AUDIT_PERSISTENCE_FAILED',
        'Der Bestandsaudit konnte nicht sicher gespeichert werden.'
      );
    }
    await updateStage('existing_content_audit', { baseLiveHash, auditId, ...audit });
  }

  let gscSignals = [];
  let gscAvailable = true;
  const gscStage = await loadValidatedStage(
    'gsc_page_signals',
    (value) => parseGscStage(value, baseLiveHash)
  );
  if (gscStage.terminal) return gscStage.terminal;
  if (gscStage.reused) {
    gscAvailable = gscStage.value.available;
    gscSignals = gscStage.value.signals;
  } else {
    try {
      await assertLease();
      const signals = await searchMetricsRepository.getPageSignals({ postId });
      gscSignals = normalizeGscSignals(signals);
    } catch (error) {
      if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
      gscAvailable = false;
      try {
        dependencies.recordAuditWarning?.(error, 'GSC_PAGE_SIGNALS_UNAVAILABLE');
      } catch {
        // Der persistierte Stage-Hinweis bleibt die maßgebliche Warnung.
      }
    }
    await updateStage('gsc_page_signals', {
      baseLiveHash,
      available: gscAvailable,
      signals: gscSignals
    });
  }

  const freshnessStage = await loadValidatedStage(
    'freshness_classification',
    (value) => parseFreshnessStage(value, baseLiveHash)
  );
  if (freshnessStage.terminal) return freshnessStage.terminal;
  const freshness = freshnessStage.reused
    ? freshnessStage.value
    : classifyExistingPostFreshness({ post, audit });
  if (!freshnessStage.reused) {
    await updateStage('freshness_classification', { baseLiveHash, ...freshness });
  }

  let sources = [];
  if (freshness.requiresResearch === true) {
    requiredFunction(
      openaiService?.researchExistingPostSources,
      'openaiService.researchExistingPostSources'
    );
    const research = await paidStage({
      stageId: 'source_research',
      schema: SourceResearchOutputSchema,
      calculateAdditionalCost: (providerResult) => {
        const callCount = providerResult?.webSearchCallCount;
        if (!Number.isSafeInteger(callCount) || callCount < 0) return Number.NaN;
        return callCount * runtimeSnapshot.webSearchCostPerCallEur;
      },
      execute: () => openaiService.researchExistingPostSources({
        post: articleFromPost(post),
        freshness,
        affectedExcerpts: affectedExcerpts(audit)
      })
    });
    if (research.terminal) return research.terminal;
    sources = research.value;
    if (sources.length < 2) {
      return finishManual(
        'insufficient_existing_post_sources',
        'Für die erforderliche Aktualitätsprüfung liegen weniger als zwei belastbare Quellen vor.',
        { sourceCount: sources.length }
      );
    }
  }

  const optimizationInput = (extraFindings = []) => ({
    ...(runtimeSnapshot.brand !== undefined ? { brand: runtimeSnapshot.brand } : {}),
    ...(runtimeSnapshot.targetAudience !== undefined
      ? { targetAudience: runtimeSnapshot.targetAudience }
      : {}),
    post: articleFromPost(post),
    audit: {
      score: audit.score,
      findings: [...audit.findings, ...extraFindings]
    },
    gscSignals,
    sources,
    allowedInternalLinks,
    learningRules: writerLearningRules
  });

  const optimization = await paidStage({
    stageId: 'targeted_optimization',
    schema: ExistingPostOptimizationOutputSchema,
    deterministicFailureCodes: DETERMINISTIC_OPTIMIZATION_FAILURE_CODES,
    execute: () => openaiService.optimizeExistingPost(optimizationInput())
  });
  if (optimization.terminal) return optimization.terminal;

  async function assess(fields, suffix = '') {
    const after = optimizedArticle(post, fields);
    const candidateFingerprint = optimizationFingerprint(fields);
    const expectedDiff = buildExistingPostDiff({
      before: articleFromPost(post),
      after,
      reasons: fields.changeReasons
    });
    const diffStageId = `existing_post_diff${suffix}`;
    const persistedDiff = await loadValidatedStage(
      diffStageId,
      (value) => {
        const parsed = parseDiffStage(value, baseLiveHash, candidateFingerprint);
        return parsed && stableJson(parsed) === stableJson(expectedDiff) ? parsed : null;
      }
    );
    if (persistedDiff.terminal) return { terminal: persistedDiff.terminal };
    const diff = persistedDiff.reused
      ? persistedDiff.value
      : expectedDiff;
    if (!persistedDiff.reused) {
      await updateStage('existing_post_diff', {
        baseLiveHash,
        candidateFingerprint,
        changes: diff.changes
      }, diffStageId);
    }

    const scopeStageId = `targeted_scope_validation${suffix}`;
    const expectedScope = validateTargetedOptimizationScope({
      before: articleFromPost(post),
      after
    });
    const persistedScope = await loadValidatedStage(
      scopeStageId,
      (value) => {
        const parsed = parseScopeStage(value, baseLiveHash, candidateFingerprint);
        return parsed && stableJson(parsed) === stableJson(expectedScope) ? parsed : null;
      }
    );
    if (persistedScope.terminal) return { terminal: persistedScope.terminal };
    const scope = persistedScope.reused
      ? persistedScope.value
      : expectedScope;
    if (!persistedScope.reused) {
      await updateStage('targeted_scope_validation', {
        baseLiveHash,
        candidateFingerprint,
        ...scope
      }, scopeStageId);
    }

    let validation;
    const validationStageId = `article_validation${suffix}`;
    const persistedValidation = await loadValidatedStage(
      validationStageId,
      (value) => parseValidationStage(value, baseLiveHash, candidateFingerprint)
    );
    if (persistedValidation.terminal) return { terminal: persistedValidation.terminal };
    if (persistedValidation.reused) {
      validation = {
        ...persistedValidation.value,
        sanitizedHtml: fields.contentHtml
      };
    } else if (post.content_format === 'legacy_ejs') {
      validation = { passed: true, sanitizedHtml: fields.contentHtml, issues: [] };
    } else {
      validation = await validateArticle(after, {
        existingSlugs: Array.isArray(trustedContext?.existingSlugs)
          ? trustedContext.existingSlugs.filter((slug) => slug !== post.slug)
          : [],
        allowedInternalLinks,
        sourceReferences: sources
      });
    }
    const sanitizationChanged = validation?.sanitizedHtml !== fields.contentHtml;
    const normalizedValidation = persistedValidation.reused
      ? validation
      : {
        passed: validation?.passed === true && !sanitizationChanged,
        sanitizedHtml: validation?.sanitizedHtml,
        issues: [
          ...(Array.isArray(validation?.issues) ? validation.issues : []),
          ...(sanitizationChanged ? [{
            code: 'sanitized_html_changed',
            message: 'Die HTML-Bereinigung würde den Optimierungsvorschlag verändern.'
          }] : [])
        ]
      };
    if (!persistedValidation.reused) {
      await updateStage('article_validation', {
        baseLiveHash,
        candidateFingerprint,
        passed: normalizedValidation.passed,
        issues: normalizedValidation.issues
      }, validationStageId);
    }
    return {
      after,
      diff,
      scope,
      validation: normalizedValidation,
      passed: scope.passed === true && normalizedValidation.passed === true
    };
  }

  async function assessSafely(fields, suffix = '') {
    try {
      return await assess(fields, suffix);
    } catch (error) {
      if (!PERMANENT_ASSESSMENT_ERRORS.has(error?.code)) throw error;
      return { terminal: await finishFailed(error.code, error.message) };
    }
  }

  async function editorialReview(fields, assessment, stageId) {
    return paidStage({
      stageId,
      kind: 'review',
      schema: ReviewOutputSchema,
      execute: () => openaiService.reviewArticle({
        briefing: {
          type: 'existing_post_targeted_optimization',
          audit,
          freshness,
          targetedScope: assessment.scope
        },
        article: optimizedArticle(post, fields),
        sourceReferences: sources,
        learningRules: reviewerLearningRules
      })
    });
  }

  function buildReport(fields, assessment, review) {
    return {
      baseLiveHash,
      beforeScore: audit.score,
      afterScore: Number.isFinite(review?.score) ? review.score : null,
      freshness,
      sources,
      gscSignals,
      targetedScope: assessment.scope,
      validation: {
        passed: assessment.validation.passed,
        issues: assessment.validation.issues
      },
      review,
      changeReasons: fields.changeReasons
    };
  }

  async function stopForOversizedReport(fields, assessment, review = null) {
    const report = buildReport(fields, assessment, review);
    const sizeBytes = serializedReportBytes(report, assessment.diff);
    if (sizeBytes <= MAX_OPTIMIZATION_REPORT_BYTES) return null;
    return finishManual(
      'existing_post_optimization_report_too_large',
      'Der UTF-8-Optimierungsbericht überschreitet die sichere Speichergrenze.',
      { sizeBytes, maximumBytes: MAX_OPTIMIZATION_REPORT_BYTES }
    );
  }

  let fields = optimization.value;
  let assessment = await assessSafely(fields);
  if (assessment.terminal) return assessment.terminal;
  const initialReportSizeTerminal = await stopForOversizedReport(fields, assessment);
  if (initialReportSizeTerminal) return initialReportSizeTerminal;
  let review = null;
  if (assessment.passed) {
    const reviewStage = await editorialReview(fields, assessment, 'editorial_review');
    if (reviewStage.terminal) return reviewStage.terminal;
    review = reviewStage.value;
  }

  if (!assessment.passed || !reviewApproved(review)) {
    const findings = repairFindings(assessment, review);
    const repair = await paidStage({
      stageId: 'repair',
      schema: ExistingPostOptimizationOutputSchema,
      deterministicFailureCodes: DETERMINISTIC_OPTIMIZATION_FAILURE_CODES,
      execute: () => openaiService.optimizeExistingPost(optimizationInput(findings))
    });
    if (repair.terminal) return repair.terminal;
    fields = repair.value;
    assessment = await assessSafely(fields, ':repair');
    if (assessment.terminal) return assessment.terminal;
    const repairedReportSizeTerminal = await stopForOversizedReport(fields, assessment);
    if (repairedReportSizeTerminal) return repairedReportSizeTerminal;
    if (!assessment.passed) {
      return finishManual(
        'existing_post_optimization_repair_failed',
        'Die einzige automatische Reparatur hat Umfang oder Inhaltsprüfung nicht bestanden.',
        { issues: safeIssues(assessment.validation.issues), scope: assessment.scope }
      );
    }
    const repairedReview = await editorialReview(
      fields,
      assessment,
      'editorial_review:repair'
    );
    if (repairedReview.terminal) return repairedReview.terminal;
    review = repairedReview.value;
    if (!reviewApproved(review)) {
      return finishManual(
        'existing_post_editorial_review_failed',
        'Die einzige automatische Reparatur hat die redaktionelle Prüfung nicht bestanden.',
        { issues: safeIssues(review.issues), reviewScore: review.score }
      );
    }
  }

  const report = buildReport(fields, assessment, review);
  const finalReportSizeTerminal = await stopForOversizedReport(fields, assessment, review);
  if (finalReportSizeTerminal) return finalReportSizeTerminal;

  let revision;
  try {
    await assertLease();
    revision = await revisionService.createOptimizedRevision({
      post,
      fields,
      auditId,
      jobId,
      baseLiveHash,
      diff: assessment.diff,
      report,
      validationContext: {
        existingSlugs: trustedContext?.existingSlugs || [],
        allowedInternalLinks,
        sourceReferences: sources
      },
      admin: { id: adminId, username: 'Content-Agent' }
    });
  } catch (error) {
    if (['CONTENT_REVISION_STALE', 'CONTENT_REVISION_CONFLICT'].includes(error?.code)) {
      return finishManual(error.code, error.message);
    }
    if (error?.code === 'CONTENT_POST_NOT_FOUND') {
      return finishManual(
        'CONTENT_REVISION_STALE',
        'Der veröffentlichte Beitrag fehlt oder ist nicht mehr veröffentlicht.'
      );
    }
    if ([
      'CONTENT_AUDIT_NOT_FOUND',
      'CONTENT_REVISION_VALIDATION_FAILED',
      'CONTENT_ACTION_VALIDATION_FAILED',
      'LEGACY_EJS_CONTENT_CHANGE_FORBIDDEN'
    ].includes(error?.code)) {
      return finishFailed(error.code, error.message);
    }
    throw error;
  }
  const revisionId = positiveInteger(revision?.id);
  if (!revisionId || revision.status !== 'draft') {
    return finishFailed(
      'CONTENT_REVISION_PERSISTENCE_FAILED',
      'Die geprüfte Optimierung konnte nicht sicher als Draft-Revision gespeichert werden.'
    );
  }
  await updateStage('revision_creation', { revisionId, postId });
  await finish('completed');
  return { status: 'completed', revisionId, postId };
}
