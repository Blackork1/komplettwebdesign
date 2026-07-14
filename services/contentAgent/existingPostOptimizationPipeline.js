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

const SourceResearchOutputSchema = SourceReferenceSchema.array().max(6);
const HASH = /^[0-9a-f]{64}$/;

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
  if (!postId || !jobId || !runId || !adminId || !HASH.test(String(payload?.base_live_hash || ''))
      || !runtimeSnapshot || typeof runtimeSnapshot !== 'object' || Array.isArray(runtimeSnapshot)) {
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
  requiredFunction(optimizationRepository?.getTrustedContext, 'optimizationRepository.getTrustedContext');
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

  async function paidStage({ stageId, schema, kind = 'content', execute }) {
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
      execute
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
    return { value: result.value, envelope: result.envelope };
  }

  await assertLease();
  const post = await optimizationRepository.getPublishedPostSnapshot(postId);
  if (!post || post.published !== true) {
    await finish('failed', 'CONTENT_POST_NOT_FOUND', 'Veröffentlichter Beitrag nicht gefunden.');
    return { status: 'failed', revisionId: null, postId, code: 'CONTENT_POST_NOT_FOUND' };
  }
  const baseLiveHash = liveHashForPost(post);
  await updateStage('live_snapshot', { post, baseLiveHash });
  if (baseLiveHash !== payload.base_live_hash) {
    return finishManual(
      'CONTENT_REVISION_STALE',
      'Der Liveartikel wurde seit dem Start der Optimierung verändert.'
    );
  }

  await assertLease();
  const trustedContext = await optimizationRepository.getTrustedContext(postId);
  const allowedInternalLinks = snapshotInternalLinks(
    runtimeSnapshot,
    trustedContext?.allowedInternalLinks
  );
  const writerLearningRules = snapshotLearningRules(
    runtimeSnapshot,
    'writer'
  );
  const reviewerLearningRules = snapshotLearningRules(
    runtimeSnapshot,
    'reviewer'
  );
  const inventory = Array.isArray(trustedContext?.inventory)
    ? trustedContext.inventory
    : allowedInternalLinks.map((url) => ({ url }));
  const audit = (dependencies.auditExistingPost || auditExistingPost)({
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
  const auditId = positiveInteger(persistedAudit?.id);
  if (!auditId) {
    throw pipelineError(
      'CONTENT_AUDIT_PERSISTENCE_FAILED',
      'Der Bestandsaudit konnte nicht sicher gespeichert werden.',
      { retryable: true }
    );
  }
  await updateStage('existing_content_audit', { auditId, ...audit });

  let gscSignals = [];
  let gscAvailable = true;
  try {
    await assertLease();
    const signals = await searchMetricsRepository.getPageSignals({ postId });
    gscSignals = Array.isArray(signals) ? signals : [];
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    gscAvailable = false;
    try {
      dependencies.recordAuditWarning?.(error, 'GSC_PAGE_SIGNALS_UNAVAILABLE');
    } catch {
      // Der persistierte Stage-Hinweis bleibt die maßgebliche Warnung.
    }
  }
  await updateStage('gsc_page_signals', { available: gscAvailable, signals: gscSignals });

  const freshness = classifyExistingPostFreshness({ post, audit });
  await updateStage('freshness_classification', freshness);

  let sources = [];
  if (freshness.requiresResearch === true) {
    requiredFunction(
      openaiService?.researchExistingPostSources,
      'openaiService.researchExistingPostSources'
    );
    const research = await paidStage({
      stageId: 'source_research',
      schema: SourceResearchOutputSchema,
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
    execute: () => openaiService.optimizeExistingPost(optimizationInput())
  });
  if (optimization.terminal) return optimization.terminal;

  async function assess(fields, suffix = '') {
    const after = optimizedArticle(post, fields);
    const diff = buildExistingPostDiff({
      before: articleFromPost(post),
      after,
      reasons: fields.changeReasons
    });
    const scope = validateTargetedOptimizationScope({
      before: articleFromPost(post),
      after
    });
    await updateStage(
      'targeted_scope_validation',
      scope,
      `targeted_scope_validation${suffix}`
    );

    let validation;
    if (post.content_format === 'legacy_ejs') {
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
    const normalizedValidation = {
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
    await updateStage(
      'article_validation',
      { passed: normalizedValidation.passed, issues: normalizedValidation.issues },
      `article_validation${suffix}`
    );
    return {
      after,
      diff,
      scope,
      validation: normalizedValidation,
      passed: scope.passed === true && normalizedValidation.passed === true
    };
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

  let fields = optimization.value;
  let assessment = await assess(fields);
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
      execute: () => openaiService.optimizeExistingPost(optimizationInput(findings))
    });
    if (repair.terminal) return repair.terminal;
    fields = repair.value;
    assessment = await assess(fields, ':repair');
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

  const report = {
    baseLiveHash,
    beforeScore: audit.score,
    afterScore: review.score,
    freshness,
    sources,
    targetedScope: assessment.scope,
    validation: {
      passed: assessment.validation.passed,
      issues: assessment.validation.issues
    },
    review,
    changeReasons: fields.changeReasons
  };

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
    if (['CONTENT_REVISION_VALIDATION_FAILED', 'CONTENT_ACTION_VALIDATION_FAILED'].includes(error?.code)) {
      await finish('failed', error.code, error.message);
      return { status: 'failed', revisionId: null, postId, code: error.code };
    }
    throw error;
  }
  const revisionId = positiveInteger(revision?.id);
  if (!revisionId || revision.status !== 'draft') {
    throw pipelineError(
      'CONTENT_REVISION_PERSISTENCE_FAILED',
      'Die geprüfte Optimierung konnte nicht sicher als Draft-Revision gespeichert werden.',
      { retryable: true }
    );
  }
  await updateStage('revision_creation', { revisionId, postId });
  await finish('completed');
  return { status: 'completed', revisionId, postId };
}
