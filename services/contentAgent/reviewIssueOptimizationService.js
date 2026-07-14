import { ArticleOutputSchema, ReviewOutputSchema } from './articleSchemas.js';
import { buildFocusedRiskReport as buildFocusedRiskReportDefault } from './riskReportService.js';
import { learningRulesForStage } from './contentLearningSnapshotService.js';
import { classifyLearningIssueLocally, getLearningCategory } from './contentLearningTaxonomy.js';

export const REVIEW_ISSUE_OPTIMIZATION_JOB_TYPE = 'optimize_review_issues';
export const REVIEW_ISSUE_OPTIMIZATION_POLICY_VERSION = 'review-issue-optimization-v1';

const RISK_DEFAULTS = Object.freeze({
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
});

const SELF_CHECK_DEFAULTS = Object.freeze({
  searchIntentFulfilled: true,
  noH1: true,
  noOuterBootstrapContainer: true,
  noInventedPricesOrServices: true,
  faqMatchesHtml: true,
  approvedLinksOnly: true
});

function optimizationError(code, message, { retryable = false, issues = [] } = {}) {
  return Object.assign(new Error(message), { code, retryable, issues });
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Die Optimierungsabhängigkeit ${name} wird benötigt.`);
  }
  return value;
}

function eligibleDraft(draft) {
  return Boolean(
    draft?.post
    && draft.post.generated_by_ai === true
    && draft.post.published === false
    && draft.post.content_format === 'static_html'
  );
}

function currentArticleFromDraft(draft) {
  const { post, metadata = {} } = draft;
  const imageIdea = metadata.seo_brief_json?.imageIdea || {};
  const reportRisks = metadata.quality_report_json?.risks;
  return {
    title: post.title || '',
    shortDescription: post.excerpt || '',
    metaTitle: post.meta_title || '',
    metaDescription: post.meta_description || '',
    ogTitle: post.og_title || '',
    ogDescription: post.og_description || '',
    slug: post.slug || '',
    contentHtml: post.content || '',
    faqJson: Array.isArray(post.faq_json) ? structuredClone(post.faq_json) : [],
    category: post.category || 'Webdesign',
    imagePrompt: imageIdea.prompt || '',
    imageAlt: post.image_alt || imageIdea.altText || '',
    imageFilename: imageIdea.filename || `${post.slug || 'blogartikel'}.webp`,
    seo: {
      primaryKeyword: metadata.primary_keyword || '',
      secondaryKeywords: Array.isArray(metadata.secondary_keywords)
        ? structuredClone(metadata.secondary_keywords)
        : [],
      searchIntent: metadata.search_intent || '',
      targetAudience: metadata.target_audience || '',
      contentCluster: metadata.content_cluster || ''
    },
    lead: {
      businessGoal: metadata.business_goal || '',
      ctaType: metadata.cta_type || '',
      ctaPositions: ['blog_early', 'blog_mid', 'blog_final']
    },
    sourceReferences: Array.isArray(metadata.source_references_json)
      ? structuredClone(metadata.source_references_json)
      : [],
    risk: reportRisks && typeof reportRisks === 'object'
      ? { ...RISK_DEFAULTS, ...reportRisks }
      : { ...RISK_DEFAULTS },
    qualitySelfCheck: { ...SELF_CHECK_DEFAULTS }
  };
}

export function selectOptimizationIssues(draft, payload = {}) {
  const currentVersion = positiveInteger(draft?.post?.review_version);
  const expectedVersion = positiveInteger(payload.expected_review_version);
  if (!currentVersion || !expectedVersion || currentVersion !== expectedVersion) {
    throw optimizationError(
      'CONTENT_REGENERATION_STALE',
      'Der Entwurf wurde seit der angeforderten Prüfung verändert.'
    );
  }
  const focusedReview = draft?.metadata?.quality_report_json?.focusedReview;
  if (!focusedReview || typeof focusedReview !== 'object' || focusedReview.blocked === true) {
    throw optimizationError(
      'CONTENT_REVIEW_OPTIMIZATION_BLOCKED',
      'Der fokussierte Prüfbericht ist blockiert und kann nicht automatisch optimiert werden.'
    );
  }
  const items = Array.isArray(focusedReview.items) ? focusedReview.items : [];
  if (items.length === 0) {
    throw optimizationError(
      'CONTENT_REVIEW_OPTIMIZATION_EMPTY',
      'Es ist kein redaktioneller Hinweis zur Optimierung vorhanden.'
    );
  }
  if (payload.issue_mode === 'all') return structuredClone(items);
  if (payload.issue_mode !== 'single') {
    throw optimizationError('CONTENT_REVIEW_OPTIMIZATION_MODE_INVALID', 'Der Optimierungsmodus ist ungültig.');
  }
  const index = Number(payload.issue_index);
  if (!Number.isSafeInteger(index) || index < 0 || index >= items.length) {
    throw optimizationError('CONTENT_REVIEW_OPTIMIZATION_INDEX_INVALID', 'Der Hinweis-Index ist ungültig.');
  }
  return [structuredClone(items[index])];
}

export function buildOptimizationCandidate(draft, repairedArticle) {
  const candidate = currentArticleFromDraft(draft);
  candidate.contentHtml = repairedArticle?.contentHtml;
  return candidate;
}

function repairIssues(items) {
  return items.map((item, index) => ({
    code: item.code || `review_issue_${index + 1}`,
    severity: ['info', 'warning', 'error'].includes(item.severity) ? item.severity : 'warning',
    message: item.reason || item.instruction || 'Redaktionellen Prüfhinweis beheben.',
    repairInstruction: item.instruction || item.reason || 'Redaktionellen Prüfhinweis beheben.',
    blocking: item.blocking === true,
    sectionHeading: item.section || null,
    evidenceExcerpt: item.excerpt || null,
    verificationType: item.verificationType || 'none',
    sourceRequired: item.sourceRequired === true,
    autoPublishBlocking: item.blocking === true
  }));
}

function selectedLearningCategories(items) {
  const categories = new Set();
  for (const item of items) {
    const explicit = typeof item?.categoryKey === 'string' && getLearningCategory(item.categoryKey)
      ? item.categoryKey
      : null;
    const categoryKey = explicit || classifyLearningIssueLocally(item)?.categoryKey;
    if (categoryKey) categories.add(categoryKey);
  }
  return [...categories];
}

function matchingLearningRules(runtimeSnapshot, stage, categoryKeys) {
  if (!runtimeSnapshot?.learningRuleSnapshot || categoryKeys.length === 0) return [];
  return learningRulesForStage(runtimeSnapshot.learningRuleSnapshot, stage, categoryKeys);
}

function stageEnvelope(value, schema, expectedReviewVersion) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (positiveInteger(value.reviewVersionBefore) !== expectedReviewVersion) return null;
  const parsed = schema.safeParse(value.value);
  return parsed.success ? { ...value, value: parsed.data } : null;
}

function providerRetryIsSafe(error) {
  return error?.safeToRetry === true
    || Number(error?.status ?? error?.statusCode ?? error?.response?.status) === 429;
}

async function recordProvider(dependencies, success, errorCode = null) {
  if (typeof dependencies.recordProviderResult !== 'function') return;
  try {
    await dependencies.recordProviderResult({ providerName: 'openai', success, errorCode });
  } catch {
    // Die technische Statusanzeige darf einen fachlich sicheren Lauf nicht verändern.
  }
}

async function executeTextStage({
  run,
  stageId,
  expectedReviewVersion,
  runtimeSnapshot,
  reservationCost,
  inputRate,
  outputRate,
  schema,
  execute
}, dependencies) {
  const persisted = await dependencies.costService.getPersistedStageResult({ runId: run.id, stageId });
  if (persisted !== null && persisted !== undefined) {
    const envelope = stageEnvelope(persisted, schema, expectedReviewVersion);
    if (!envelope) {
      return { manual: {
        code: 'provider_stage_result_invalid',
        message: 'Das gespeicherte Providerergebnis ist ungültig oder gehört zu einer anderen Reviewversion.'
      } };
    }
    await dependencies.assertLease();
    await dependencies.costService.reserveMonthlyBudget({
      runId: run.id,
      stageId,
      estimatedCost: reservationCost,
      limit: Number(runtimeSnapshot.monthlyCostLimitEur || 0),
      timezone: runtimeSnapshot.timezone
    });
    await dependencies.costService.settleMonthlyBudget({
      runId: run.id,
      stageId,
      reservationMonth: envelope.reservationMonth,
      actualCost: Number(envelope.actualCost || 0)
    });
    await recordProvider(dependencies, true);
    return { value: envelope.value };
  }

  await dependencies.assertLease();
  const reservation = await dependencies.costService.reserveMonthlyBudget({
    runId: run.id,
    stageId,
    estimatedCost: reservationCost,
    limit: Number(runtimeSnapshot.monthlyCostLimitEur || 0),
    timezone: runtimeSnapshot.timezone
  });
  if (reservation?.created !== true) {
    return { manual: {
      code: 'provider_execution_uncertain',
      message: 'Für diese Providerstufe besteht bereits eine ungeklärte Reservierung. Sie wird nicht automatisch erneut ausgeführt.'
    } };
  }

  let result;
  try {
    await dependencies.assertLease();
    result = await execute();
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    await recordProvider(dependencies, false, error?.code || 'OPENAI_REQUEST_FAILED');
    if (providerRetryIsSafe(error)) {
      await dependencies.costService.releaseMonthlyBudgetReservation({
        runId: run.id,
        stageId,
        reservationMonth: reservation.reservationMonth
      });
      error.code = 'CONTENT_PROVIDER_SAFE_RETRY';
      error.retryable = true;
      throw error;
    }
    return { manual: {
      code: 'provider_execution_uncertain',
      message: 'Der Providerzustand ist nicht eindeutig. Die kostenpflichtige Stufe wird nicht automatisch wiederholt.'
    } };
  }

  const parsed = schema.safeParse(result?.value);
  if (!parsed.success) {
    return { manual: {
      code: 'provider_stage_schema_invalid',
      message: 'Der Provider hat kein gültiges strukturiertes Ergebnis geliefert.',
      issues: parsed.error.issues
    } };
  }
  const actualCost = dependencies.costService.estimateTextCost({
    usage: result.usage || {},
    inputRate,
    outputRate
  });
  const envelope = {
    value: parsed.data,
    responseId: result.responseId || null,
    usage: result.usage || {},
    promptVersion: result.promptVersion || 'unknown',
    reviewVersionBefore: expectedReviewVersion,
    reservationMonth: reservation.reservationMonth,
    actualCost
  };
  try {
    await dependencies.runRepository.updateRunStage(run.id, {
      currentStage: stageId,
      stageId,
      stageResult: envelope,
      tokenUsage: envelope.usage,
      responseIds: envelope.responseId ? [envelope.responseId] : []
    });
  } catch {
    return { manual: {
      code: 'provider_stage_persistence_uncertain',
      message: 'Das Providerergebnis konnte nicht eindeutig gespeichert werden. Die Reservierung bleibt zur manuellen Prüfung offen.'
    } };
  }
  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: run.id,
    stageId,
    reservationMonth: reservation.reservationMonth,
    actualCost
  });
  await recordProvider(dependencies, true);
  return { value: envelope.value };
}

async function finishManual(run, postId, manual, dependencies) {
  await dependencies.assertLease();
  const finished = await dependencies.runRepository.finishRun(run.id, {
    status: 'needs_manual_attention',
    postId,
    errorReport: {
      code: manual.code,
      message: manual.message,
      ...(Array.isArray(manual.issues) && manual.issues.length ? { issues: manual.issues } : {})
    }
  });
  if (!finished) throw optimizationError('CONTENT_RUN_FINISH_FAILED', 'Der Optimierungslauf konnte nicht sicher abgeschlossen werden.', { retryable: true });
  return { status: 'needs_manual_attention', code: manual.code, post: null };
}

function qualityGatePassed(review, focusedReview) {
  return review.passed === true
    && review.score >= 80
    && review.requiresManualReview === false
    && Object.values(review.risks || {}).every((value) => value === false)
    && focusedReview.blocked === false;
}

export async function runReviewIssueOptimizationJob(
  { claim, run, runtimeSnapshot, leaseGuard },
  dependencies = {}
) {
  if (claim?.job_type !== REVIEW_ISSUE_OPTIMIZATION_JOB_TYPE) {
    throw optimizationError('CONTENT_REVIEW_OPTIMIZATION_TYPE_UNSUPPORTED', 'Optimierungsjobtyp wird nicht unterstützt.');
  }
  const payload = claim.payload_json || {};
  if (payload.source !== 'admin_regeneration' || payload.forced_mode !== 'review') {
    throw optimizationError('CONTENT_REVIEW_OPTIMIZATION_REVIEW_REQUIRED', 'Die Prüfhinweis-Optimierung darf nur aus dem Admin-Review gestartet werden.');
  }
  const postId = positiveInteger(payload.post_id);
  if (!postId || !run?.id || !runtimeSnapshot) {
    throw optimizationError('CONTENT_REVIEW_OPTIMIZATION_VALIDATION_FAILED', 'Jobdaten oder Runtime-Snapshot fehlen.');
  }

  requiredFunction(dependencies.optimizationRepository?.getDraftWithMetadata, 'optimizationRepository.getDraftWithMetadata');
  requiredFunction(dependencies.optimizationRepository?.getValidationContext, 'optimizationRepository.getValidationContext');
  requiredFunction(dependencies.optimizationRepository?.commitOptimization, 'optimizationRepository.commitOptimization');
  requiredFunction(dependencies.optimizationRepository?.reconcileOptimizationCommit, 'optimizationRepository.reconcileOptimizationCommit');
  requiredFunction(dependencies.openaiService?.repairArticle, 'openaiService.repairArticle');
  requiredFunction(dependencies.openaiService?.reviewArticle, 'openaiService.reviewArticle');
  requiredFunction(dependencies.costService?.getPersistedStageResult, 'costService.getPersistedStageResult');
  requiredFunction(dependencies.costService?.reserveMonthlyBudget, 'costService.reserveMonthlyBudget');
  requiredFunction(dependencies.costService?.settleMonthlyBudget, 'costService.settleMonthlyBudget');
  requiredFunction(
    dependencies.costService?.releaseMonthlyBudgetReservation,
    'costService.releaseMonthlyBudgetReservation'
  );
  requiredFunction(dependencies.costService?.estimateTextCost, 'costService.estimateTextCost');
  requiredFunction(dependencies.runRepository?.updateRunStage, 'runRepository.updateRunStage');
  requiredFunction(dependencies.runRepository?.finishRun, 'runRepository.finishRun');
  requiredFunction(dependencies.validateArticle, 'validateArticle');

  const assertLease = typeof leaseGuard === 'function' ? leaseGuard : async () => true;
  const guarded = { ...dependencies, assertLease };
  await assertLease();
  const draft = await dependencies.optimizationRepository.getDraftWithMetadata(postId);
  if (!eligibleDraft(draft)) {
    throw optimizationError('CONTENT_DRAFT_NOT_FOUND', 'Unveröffentlichter KI-Entwurf nicht gefunden.');
  }

  const expectedReviewVersion = positiveInteger(payload.expected_review_version);
  const commitKey = `${run.id}:${REVIEW_ISSUE_OPTIMIZATION_JOB_TYPE}:${postId}`;
  if (positiveInteger(draft.post.review_version) !== expectedReviewVersion) {
    const reconciliation = await dependencies.optimizationRepository.reconcileOptimizationCommit({
      postId,
      expectedReviewVersion,
      commitKey
    });
    if (reconciliation?.state === 'committed') {
      await assertLease();
      const finished = await dependencies.runRepository.finishRun(run.id, {
        status: 'completed',
        postId,
        errorReport: {}
      });
      if (!finished) throw optimizationError('CONTENT_RUN_FINISH_FAILED', 'Der Optimierungslauf konnte nicht sicher abgeschlossen werden.', { retryable: true });
      return {
        status: 'completed',
        post: reconciliation.post,
        metadata: reconciliation.metadata,
        idempotent: true
      };
    }
  }

  let selectedIssues;
  try {
    selectedIssues = selectOptimizationIssues(draft, payload);
  } catch (error) {
    return finishManual(run, postId, {
      code: error.code || 'CONTENT_REVIEW_OPTIMIZATION_INVALID',
      message: error.message
    }, guarded);
  }
  try {
    const learningCategories = selectedLearningCategories(selectedIssues);
    const repairStageId = `${REVIEW_ISSUE_OPTIMIZATION_JOB_TYPE}:${postId}:repair`;
    const repair = await executeTextStage({
      run,
      stageId: repairStageId,
      expectedReviewVersion,
      runtimeSnapshot,
      reservationCost: Number(runtimeSnapshot.contentStageReservationEur ?? 0.5),
      inputRate: Number(runtimeSnapshot.contentInputCostPerMtok || 0),
      outputRate: Number(runtimeSnapshot.contentOutputCostPerMtok || 0),
      schema: ArticleOutputSchema,
      execute: () => dependencies.openaiService.repairArticle({
        briefing: draft.metadata?.seo_brief_json || {},
        article: currentArticleFromDraft(draft),
        issues: repairIssues(selectedIssues),
        learningRules: matchingLearningRules(runtimeSnapshot, 'writer', learningCategories)
      })
    }, guarded);
    if (repair.manual) return finishManual(run, postId, repair.manual, guarded);

    const candidate = buildOptimizationCandidate(draft, repair.value);
    const validationContext = await dependencies.optimizationRepository.getValidationContext(postId, draft);
    const validation = dependencies.validateArticle(candidate, validationContext);
    if (validation?.passed !== true || typeof validation?.sanitizedHtml !== 'string') {
      return finishManual(run, postId, {
        code: 'optimized_draft_invalid',
        message: 'Das optimierte Artikel-HTML hat die technische Validierung nicht bestanden.',
        issues: Array.isArray(validation?.issues) ? validation.issues : []
      }, guarded);
    }
    candidate.contentHtml = validation.sanitizedHtml;

    const reviewStageId = `${REVIEW_ISSUE_OPTIMIZATION_JOB_TYPE}:${postId}:review`;
    const reviewResult = await executeTextStage({
      run,
      stageId: reviewStageId,
      expectedReviewVersion,
      runtimeSnapshot,
      reservationCost: Number(runtimeSnapshot.reviewStageReservationEur
        ?? runtimeSnapshot.contentStageReservationEur
        ?? 0.5),
      inputRate: Number(runtimeSnapshot.reviewInputCostPerMtok
        ?? runtimeSnapshot.contentInputCostPerMtok
        ?? 0),
      outputRate: Number(runtimeSnapshot.reviewOutputCostPerMtok
        ?? runtimeSnapshot.contentOutputCostPerMtok
        ?? 0),
      schema: ReviewOutputSchema,
      execute: () => dependencies.openaiService.reviewArticle({
        briefing: draft.metadata?.seo_brief_json || {},
        article: candidate,
        sourceReferences: candidate.sourceReferences,
        learningRules: matchingLearningRules(runtimeSnapshot, 'reviewer', learningCategories)
      })
    }, guarded);
    if (reviewResult.manual) return finishManual(run, postId, reviewResult.manual, guarded);

    const reportBuilder = dependencies.buildFocusedRiskReport || buildFocusedRiskReportDefault;
    const focusedReview = reportBuilder({
      article: candidate,
      review: reviewResult.value,
      validation,
      sources: candidate.sourceReferences
    });
    if (!qualityGatePassed(reviewResult.value, focusedReview)) {
      return finishManual(run, postId, {
        code: 'quality_gate_failed',
        message: 'Die optimierte Fassung erfüllt die Qualitätsfreigabe noch nicht.',
        issues: focusedReview.items
      }, guarded);
    }

    const qualityReport = {
      ...reviewResult.value,
      risks: { ...reviewResult.value.risks },
      focusedReview
    };
    await assertLease();
    let committed;
    try {
      committed = await dependencies.optimizationRepository.commitOptimization({
        postId,
        contentHtml: candidate.contentHtml,
        qualityScore: reviewResult.value.score,
        qualityReport,
        expectedReviewVersion,
        commitKey
      });
    } catch (commitError) {
      if (commitError?.code === 'CONTENT_JOB_LEASE_LOST') throw commitError;
      const reconciliation = await dependencies.optimizationRepository.reconcileOptimizationCommit({
        postId,
        expectedReviewVersion,
        commitKey
      });
      if (reconciliation?.state === 'committed') {
        committed = {
          post: reconciliation.post,
          metadata: reconciliation.metadata,
          idempotent: true
        };
      } else if (reconciliation?.state === 'concurrent'
          || commitError?.code === 'CONTENT_REGENERATION_STALE') {
        return finishManual(run, postId, {
          code: 'CONTENT_REGENERATION_STALE',
          message: 'Der Entwurf wurde während der Optimierung verändert und deshalb nicht überschrieben.'
        }, guarded);
      } else {
        throw commitError;
      }
    }
    await assertLease();
    if (typeof dependencies.enqueueLearningObservationJob === 'function') {
      try {
        await dependencies.enqueueLearningObservationJob({
          postId,
          reviewVersion: positiveInteger(committed?.post?.review_version) || expectedReviewVersion + 1
        });
      } catch {
        // Die erfolgreiche Optimierung bleibt unabhängig vom nachgelagerten internen Lernjob gültig.
      }
    }
    const finished = await dependencies.runRepository.finishRun(run.id, {
      status: 'completed',
      postId,
      errorReport: {}
    });
    if (!finished) throw optimizationError('CONTENT_RUN_FINISH_FAILED', 'Der Optimierungslauf konnte nicht sicher abgeschlossen werden.', { retryable: true });
    return { status: 'completed', ...committed };
  } catch (error) {
    if (error?.code !== 'CONTENT_BUDGET_LIMIT_REACHED') throw error;
    return finishManual(run, postId, {
      code: 'CONTENT_BUDGET_LIMIT_REACHED',
      message: 'Das wirksame Monatsbudget reicht für diese Optimierung nicht aus.'
    }, guarded);
  }
}
