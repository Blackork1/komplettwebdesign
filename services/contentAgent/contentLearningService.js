import { LearningClassificationBatchSchema } from './contentLearningSchemas.js';
import {
  CONTENT_LEARNING_TAXONOMY_VERSION,
  classifyLearningIssueLocally,
  createLearningIssueFingerprint,
  getLearningCategory,
  sanitizeLearningText
} from './contentLearningTaxonomy.js';

export const CONTENT_LEARNING_JOB_TYPE = 'process_learning_observations';
const PROVIDER_CONFIDENCE_THRESHOLD = 0.75;
const MAX_PROVIDER_CLASSIFICATIONS = 12;

function learningError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function positiveInteger(value) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Die Lernjob-Abhängigkeit ${name} wird benötigt.`);
  }
  return value;
}

function normalizePayload(claim) {
  const payload = claim?.payload_json;
  const postId = positiveInteger(payload?.postId);
  const reviewVersion = positiveInteger(payload?.reviewVersion);
  if (!postId || !reviewVersion) {
    throw learningError(
      'CONTENT_LEARNING_JOB_PAYLOAD_INVALID',
      'Der Lernjob enthält keine gültige Artikel-ID und Reviewversion.'
    );
  }
  if (payload.source !== undefined && payload.source !== 'internal_learning') {
    throw learningError(
      'CONTENT_LEARNING_JOB_PAYLOAD_INVALID',
      'Der Lernjob besitzt keine zulässige interne Quelle.'
    );
  }
  if (claim?.job_type && claim.job_type !== CONTENT_LEARNING_JOB_TYPE) {
    throw learningError('CONTENT_LEARNING_JOB_TYPE_UNSUPPORTED', 'Der Lernjobtyp wird nicht unterstützt.');
  }
  return { postId, reviewVersion };
}

function providerRetryIsSafe(error) {
  return error?.safeToRetry === true
    || Number(error?.status ?? error?.statusCode ?? error?.response?.status) === 429;
}

function cachedClassification(row) {
  const categoryKey = sanitizeLearningText(row?.category_key ?? row?.categoryKey, 80);
  const confidence = Number(row?.confidence);
  const categoryExists = categoryKey === 'unclassified' || Boolean(getLearningCategory(categoryKey));
  if (!categoryExists || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  return {
    fingerprint: sanitizeLearningText(row?.fingerprint, 64),
    categoryKey: confidence >= PROVIDER_CONFIDENCE_THRESHOLD ? categoryKey : 'unclassified',
    classificationSource: sanitizeLearningText(
      row?.classification_source ?? row?.classificationSource,
      20
    ) || 'provider',
    confidence,
    reason: sanitizeLearningText(row?.reason, 500),
    taxonomyVersion: sanitizeLearningText(
      row?.taxonomy_version ?? row?.taxonomyVersion,
      80
    ) || CONTENT_LEARNING_TAXONOMY_VERSION
  };
}

function unclassified(fingerprint, reason = 'Keine Kategorie konnte sicher zugeordnet werden.') {
  return {
    fingerprint,
    categoryKey: 'unclassified',
    classificationSource: 'unclassified',
    confidence: 0,
    reason,
    taxonomyVersion: CONTENT_LEARNING_TAXONOMY_VERSION
  };
}

function classificationEnvelope(value, reviewVersion) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (positiveInteger(value.reviewVersion) !== reviewVersion) return null;
  const parsed = LearningClassificationBatchSchema.safeParse(value.value);
  return parsed.success ? { ...value, value: parsed.data } : null;
}

async function finishRun(run, postId, status, errorReport, dependencies) {
  await dependencies.assertLease();
  const finished = await dependencies.runRepository.finishRun(run.id, {
    status,
    postId,
    errorReport
  });
  if (!finished) {
    throw learningError(
      'CONTENT_LEARNING_RUN_FINISH_FAILED',
      'Der Lernjob-Lauf konnte nicht sicher abgeschlossen werden.',
      { retryable: true }
    );
  }
}

async function finishManual(run, postId, code, message, dependencies) {
  await finishRun(run, postId, 'needs_manual_attention', { code, message }, dependencies);
  return { status: 'needs_manual_attention', code, post: null };
}

async function classifyWithProvider({
  issues,
  reviewVersion,
  run,
  runtimeSnapshot
}, dependencies) {
  const stageId = `learning_classification:${reviewVersion}`;
  const persisted = await dependencies.costService.getPersistedStageResult({ runId: run.id, stageId });
  if (persisted !== null && persisted !== undefined) {
    const envelope = classificationEnvelope(persisted, reviewVersion);
    if (!envelope) {
      return { manual: {
        code: 'provider_stage_result_invalid',
        message: 'Die gespeicherte Lernklassifizierung ist ungültig oder gehört zu einer anderen Reviewversion.'
      } };
    }
    await dependencies.assertLease();
    await dependencies.costService.reserveMonthlyBudget({
      runId: run.id,
      stageId,
      estimatedCost: Number(runtimeSnapshot.reviewStageReservationEur || 0),
      limit: Number(runtimeSnapshot.monthlyCostLimitEur || 0),
      timezone: runtimeSnapshot.timezone
    });
    await dependencies.costService.settleMonthlyBudget({
      runId: run.id,
      stageId,
      reservationMonth: envelope.reservationMonth,
      actualCost: Number(envelope.actualCost || 0)
    });
    return { value: envelope.value, responseId: envelope.responseId || null };
  }

  await dependencies.assertLease();
  const reservation = await dependencies.costService.reserveMonthlyBudget({
    runId: run.id,
    stageId,
    estimatedCost: Number(runtimeSnapshot.reviewStageReservationEur || 0),
    limit: Number(runtimeSnapshot.monthlyCostLimitEur || 0),
    timezone: runtimeSnapshot.timezone
  });
  if (reservation?.created !== true) {
    return { manual: {
      code: 'provider_execution_uncertain',
      message: 'Für die Lernklassifizierung besteht bereits eine ungeklärte Providerreservierung.'
    } };
  }

  let result;
  try {
    await dependencies.assertLease();
    result = await dependencies.openaiService.classifyLearningIssues({ issues });
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
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
      message: 'Der Providerzustand der Lernklassifizierung ist nicht eindeutig.'
    } };
  }

  const parsed = LearningClassificationBatchSchema.safeParse(result?.value);
  const expectedFingerprints = new Set(issues.map(({ fingerprint }) => fingerprint));
  if (!parsed.success
      || parsed.data.classifications.length !== expectedFingerprints.size
      || parsed.data.classifications.some(({ fingerprint }) => !expectedFingerprints.has(fingerprint))) {
    return { manual: {
      code: 'provider_stage_schema_invalid',
      message: 'Der Provider hat keine vollständige gültige Lernklassifizierung geliefert.'
    } };
  }

  const actualCost = dependencies.costService.estimateTextCost({
    usage: result.usage || {},
    inputRate: runtimeSnapshot.reviewInputCostPerMtok,
    outputRate: runtimeSnapshot.reviewOutputCostPerMtok
  });
  const envelope = {
    value: parsed.data,
    responseId: result.responseId || null,
    usage: result.usage || {},
    promptVersion: result.promptVersion || 'unknown',
    reviewVersion,
    reservationMonth: reservation.reservationMonth,
    actualCost
  };
  try {
    await dependencies.runRepository.updateRunStage(run.id, {
      currentStage: 'learning_classification',
      stageId,
      stageResult: envelope,
      tokenUsage: envelope.usage,
      responseIds: envelope.responseId ? [envelope.responseId] : []
    });
  } catch {
    return { manual: {
      code: 'provider_stage_persistence_uncertain',
      message: 'Die Lernklassifizierung konnte nicht eindeutig gespeichert werden.'
    } };
  }
  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: run.id,
    stageId,
    reservationMonth: reservation.reservationMonth,
    actualCost
  });
  return { value: parsed.data, responseId: envelope.responseId };
}

function normalizeReviewItems(review) {
  const focusedReview = review?.quality_report_json?.focusedReview;
  if (!focusedReview || typeof focusedReview !== 'object' || focusedReview.blocked === true) return [];
  return Array.isArray(focusedReview.items) ? focusedReview.items.slice(0, 24) : [];
}

export async function runContentLearningJob(
  { claim, run, runtimeSnapshot, leaseGuard },
  dependencies = {}
) {
  const { postId, reviewVersion } = normalizePayload(claim);
  if (!positiveInteger(run?.id) || !runtimeSnapshot || typeof runtimeSnapshot !== 'object') {
    throw learningError('CONTENT_LEARNING_JOB_VALIDATION_FAILED', 'Lauf oder Runtime-Snapshot fehlt.');
  }
  requiredFunction(dependencies.learningRepository?.loadReview, 'learningRepository.loadReview');
  requiredFunction(
    dependencies.learningRepository?.loadCachedClassifications,
    'learningRepository.loadCachedClassifications'
  );
  requiredFunction(
    dependencies.learningRepository?.storeClassifications,
    'learningRepository.storeClassifications'
  );
  requiredFunction(
    dependencies.learningRepository?.recordObservationsAndMaybeProposals,
    'learningRepository.recordObservationsAndMaybeProposals'
  );
  requiredFunction(dependencies.openaiService?.classifyLearningIssues, 'openaiService.classifyLearningIssues');
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

  const assertLease = typeof leaseGuard === 'function' ? leaseGuard : async () => true;
  const guarded = { ...dependencies, assertLease };
  await assertLease();
  const review = await dependencies.learningRepository.loadReview({ postId, reviewVersion });
  const items = normalizeReviewItems(review);
  if (!review || items.length === 0) {
    await finishRun(run, postId, 'completed', {}, guarded);
    return { status: 'completed', skipped: true, observations: 0 };
  }

  const classifiedByFingerprint = new Map();
  const issueEntries = items.map((item) => {
    const fingerprint = createLearningIssueFingerprint(item);
    const local = classifyLearningIssueLocally(item);
    if (local) {
      classifiedByFingerprint.set(fingerprint, {
        fingerprint,
        categoryKey: local.categoryKey,
        classificationSource: 'local',
        confidence: local.confidence,
        reason: 'Der Prüfhinweis wurde anhand der festen lokalen Taxonomie zugeordnet.',
        taxonomyVersion: CONTENT_LEARNING_TAXONOMY_VERSION
      });
    }
    return { item, fingerprint };
  });

  const providerFingerprints = new Set();
  const providerCandidates = issueEntries
    .filter(({ fingerprint }) => {
      if (classifiedByFingerprint.has(fingerprint) || providerFingerprints.has(fingerprint)) return false;
      providerFingerprints.add(fingerprint);
      return true;
    })
    .slice(0, MAX_PROVIDER_CLASSIFICATIONS);
  if (providerCandidates.length > 0) {
    const fingerprints = providerCandidates.map(({ fingerprint }) => fingerprint);
    const cachedRows = await dependencies.learningRepository.loadCachedClassifications(fingerprints);
    for (const row of cachedRows) {
      const cached = cachedClassification(row);
      if (cached && fingerprints.includes(cached.fingerprint)) {
        classifiedByFingerprint.set(cached.fingerprint, cached);
      }
    }
    const uncached = providerCandidates.filter(({ fingerprint }) => !classifiedByFingerprint.has(fingerprint));
    if (uncached.length > 0) {
      const providerResult = await classifyWithProvider({
        issues: uncached.map(({ item, fingerprint }) => ({
          fingerprint,
          reason: sanitizeLearningText(item?.reason ?? item?.message, 500),
          instruction: sanitizeLearningText(item?.instruction ?? item?.repairInstruction, 500)
        })),
        reviewVersion,
        run,
        runtimeSnapshot
      }, guarded);
      if (providerResult.manual) {
        return finishManual(
          run,
          postId,
          providerResult.manual.code,
          providerResult.manual.message,
          guarded
        );
      }
      const persistedClassifications = providerResult.value.classifications.map((item) => ({
        fingerprint: item.fingerprint,
        categoryKey: item.confidence >= PROVIDER_CONFIDENCE_THRESHOLD
          ? item.categoryKey
          : 'unclassified',
        classificationSource: item.confidence >= PROVIDER_CONFIDENCE_THRESHOLD
          ? 'provider'
          : 'unclassified',
        confidence: item.confidence,
        reason: item.reason,
        taxonomyVersion: CONTENT_LEARNING_TAXONOMY_VERSION
      }));
      await dependencies.learningRepository.storeClassifications({
        classifications: persistedClassifications,
        providerRunId: run.id
      });
      persistedClassifications.forEach((item) => classifiedByFingerprint.set(item.fingerprint, item));
    }
  }

  const observations = issueEntries.map(({ item, fingerprint }) => {
    const classification = classifiedByFingerprint.get(fingerprint) || unclassified(fingerprint);
    return {
      categoryKey: classification.categoryKey,
      fingerprint,
      reason: sanitizeLearningText(item?.reason ?? item?.message, 500)
        || 'Redaktioneller Prüfhinweis ohne Begründung.',
      instruction: sanitizeLearningText(item?.instruction ?? item?.repairInstruction, 500)
        || 'Redaktionellen Prüfhinweis berücksichtigen.',
      section: sanitizeLearningText(item?.section ?? item?.sectionHeading, 180) || null,
      anchor: sanitizeLearningText(item?.anchor, 220) || null,
      classificationSource: classification.classificationSource,
      confidence: classification.confidence,
      taxonomyVersion: classification.taxonomyVersion
    };
  });

  await assertLease();
  const recorded = await dependencies.learningRepository.recordObservationsAndMaybeProposals({
    postId,
    reviewVersion,
    observations
  });
  await finishRun(run, postId, 'completed', {}, guarded);
  return {
    status: 'completed',
    observations: recorded.observations?.length ?? observations.length,
    proposals: recorded.proposals?.length ?? 0
  };
}
