import { DateTime } from 'luxon';
import { ReviewOutputSchema } from './articleSchemas.js';
import {
  canonicalJson,
  readExistingPostTrustedContextSnapshot
} from './contentRuleManifest.js';
import { learningRulesForStage } from './contentLearningSnapshotService.js';
import { assertOptimizationSnapshotRevalidated } from './contentRevisionService.js';
import {
  auditExistingPost,
  evaluateExistingContentReaudit
} from './legacyAuditService.js';
import { executePaidStructuredTextStage } from './providerTextStageService.js';
import {
  evaluateExistingPostRevisionApproval,
  minimumExistingPostRevisionScore
} from './existingPostRevisionApprovalPolicy.js';
import { normalizeExistingPostRevisionSources } from './existingPostRevisionSourcePolicy.js';
import {
  classifyExistingPostRevisionError,
  existingPostRevisionCleanupRetryError,
  existingPostRevisionTransientError,
  isExistingPostRevisionFailureCode,
  parseExistingPostRevisionCleanupIntent
} from './existingPostRevisionFailurePolicy.js';

function requiredFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Die Revalidierung benötigt ${name}.`);
  }
  return value;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasValidLoadedContextEnvelope(context) {
  const revision = context?.revision;
  const report = revision?.optimization_report_json;
  const revalidation = report?.revalidation;
  const audit = context?.audit;
  return isRecord(context)
    && isRecord(context.post)
    && isRecord(revision)
    && isRecord(revision.snapshot_json)
    && isRecord(report)
    && isRecord(revalidation)
    && isRecord(audit)
    && Number.isInteger(audit.score)
    && audit.score >= 0
    && audit.score <= 100
    && Array.isArray(audit.findings_json)
    && Array.isArray(audit.recommended_actions_json)
    && isRecord(context.runtimeSnapshot);
}

function articleFromContext(post, snapshot) {
  const fields = snapshot.fields;
  return {
    id: Number(post.id),
    title: fields.title,
    slug: snapshot.base.slug,
    shortDescription: fields.excerpt,
    contentHtml: fields.content,
    contentFormat: snapshot.base.content_format,
    metaTitle: fields.meta_title,
    metaDescription: fields.meta_description,
    ogTitle: fields.og_title,
    ogDescription: fields.og_description,
    faqJson: Array.isArray(fields.faq_json) ? fields.faq_json : [],
    imageUrl: fields.image_url,
    imageAlt: fields.image_alt,
    published: post.published,
    status: post.workflow_status,
    publishedAt: post.published_at ?? null,
    scheduledPublishAt: post.scheduled_at ?? null,
    updatedAt: post.updated_at
  };
}

function postFromSnapshot(post, snapshot) {
  return {
    ...post,
    title: snapshot.fields.title,
    excerpt: snapshot.fields.excerpt,
    content: snapshot.fields.content,
    content_format: snapshot.base.content_format,
    meta_title: snapshot.fields.meta_title,
    meta_description: snapshot.fields.meta_description,
    og_title: snapshot.fields.og_title,
    og_description: snapshot.fields.og_description,
    faq_json: snapshot.fields.faq_json,
    image_url: snapshot.fields.image_url,
    image_alt: snapshot.fields.image_alt
  };
}

function auditCodes(audit) {
  if (!Array.isArray(audit?.findings_json)) return [];
  return [...new Set(audit.findings_json.map((finding) => (
    typeof finding?.code === 'string' ? finding.code : ''
  )).filter(Boolean))].slice(0, 100);
}

function reviewPasses(review, minimumScore, unresolvedAuditCodes) {
  const risks = review?.risks;
  return review?.passed === true
    && Number.isInteger(review.score)
    && review.score >= minimumScore
    && review.requiresManualReview === false
    && risks
    && typeof risks === 'object'
    && !Array.isArray(risks)
    && Object.keys(risks).length > 0
    && Object.values(risks).every((value) => value === false)
    && Array.isArray(review.issues)
    && !review.issues.some((issue) => issue?.blocking === true || issue?.autoPublishBlocking === true)
    && unresolvedAuditCodes.length === 0;
}

function berlinCalendarYear(startedAt) {
  const instant = DateTime.fromISO(String(startedAt || ''), { setZone: true });
  if (!instant.isValid) return null;
  return instant.setZone('Europe/Berlin').year;
}

function persistedCleanupReview(run, fence) {
  const envelope = run?.stage_results_json?.revision_editorial_review;
  const expectedFence = `${fence.revisionId}:${fence.revisionVersion}:${fence.snapshotFingerprint}`;
  if (!isRecord(envelope)
      || envelope.revisionFence !== expectedFence
      || typeof envelope.reservationMonth !== 'string'
      || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(envelope.reservationMonth)
      || !Number.isFinite(envelope.actualCost)
      || envelope.actualCost < 0) return null;
  const budget = run?.stage_results_json?.[
    `budget:${envelope.reservationMonth}:revision_editorial_review`
  ];
  if (!isRecord(budget)
      || budget.status !== 'settled'
      || budget.reservationMonth !== envelope.reservationMonth
      || !Number.isFinite(budget.actualCost)
      || budget.actualCost !== envelope.actualCost) return null;
  const parsed = ReviewOutputSchema.safeParse(envelope.value);
  return parsed.success ? parsed.data : null;
}

function terminalPersistenceIsTransient(error) {
  return classifyExistingPostRevisionError(error, {
    attempts: 1,
    max_attempts: 2
  }).disposition === 'transient';
}

export async function runExistingPostRevisionRevalidationJob(input = {}, dependencies = {}) {
  const payload = input.claim?.payload_json || {};
  const run = input.run;
  const runId = Number(run?.id);
  const runtimeSnapshot = input.runtimeSnapshot;
  const leaseGuard = requiredFunction(input.leaseGuard, 'leaseGuard');
  const repository = dependencies.optimizationRepository;
  const loadContext = requiredFunction(
    repository?.loadRevisionRevalidationContext,
    'optimizationRepository.loadRevisionRevalidationContext'
  );
  const finishRun = requiredFunction(dependencies.runRepository?.finishRun, 'runRepository.finishRun');
  const findRunByJobId = typeof dependencies.runRepository?.findRunByJobId === 'function'
    ? dependencies.runRepository.findRunByJobId
    : null;
  const fence = {
    revisionId: payload.revision_id,
    revisionVersion: payload.revision_version,
    snapshotFingerprint: payload.snapshot_fingerprint
  };
  const cleanupIntent = parseExistingPostRevisionCleanupIntent(input.cleanupIntent?.cleanupToken)
    ?? parseExistingPostRevisionCleanupIntent(input.claim?.last_error);

  async function retryTerminalOperation(operation, {
    shouldRetry = terminalPersistenceIsTransient,
    cleanup = {}
  } = {}) {
    let cause = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await leaseGuard();
      try {
        return await operation();
      } catch (error) {
        if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
        if (!shouldRetry(error)) {
          throw existingPostRevisionCleanupRetryError(error, cleanup);
        }
        cause = error;
      }
    }
    throw existingPostRevisionCleanupRetryError(cause, cleanup);
  }

  function resultFromTerminalRun(persisted, fallbackCode = null) {
    if (persisted?.status === 'completed') {
      return { status: 'completed', revisionId: fence.revisionId };
    }
    const code = typeof persisted?.error_report_json?.code === 'string'
      ? persisted.error_report_json.code
      : fallbackCode;
    if (persisted?.status === 'needs_manual_attention') {
      return {
        status: 'needs_manual_attention',
        revisionId: fence.revisionId,
        code: code || 'CONTENT_RUN_NEEDS_MANUAL_ATTENTION'
      };
    }
    if (persisted?.status === 'failed') {
      throw Object.assign(
        new Error('Der bereits terminale Revalidierungslauf ist dauerhaft fehlgeschlagen.'),
        { code: code || 'CONTENT_RUN_FAILED', retryable: false, terminalRunAdopted: true }
      );
    }
    return null;
  }

  async function finish(status, code = null) {
    let persisted;
    try {
      persisted = await retryTerminalOperation(async () => {
        let terminalRun;
        try {
          terminalRun = await finishRun(runId, {
            status,
            postId: null,
            errorReport: code ? { code, message: 'Die aktuelle KI-Revision benötigt eine manuelle Prüfung.' } : {}
          });
        } catch (cause) {
          if (typeof cause?.code === 'string') throw cause;
          throw Object.assign(
            new Error('Der Revalidierungslauf konnte nicht sicher abgeschlossen werden.', { cause }),
            { code: 'CONTENT_RUN_FINISH_FAILED', retryable: true }
          );
        }
        if (!terminalRun || typeof terminalRun !== 'object' || Array.isArray(terminalRun)) {
          throw Object.assign(
            new Error('Der Revalidierungslauf wurde nicht aktualisiert.'),
            { code: 'CONTENT_RUN_FINISH_FAILED', retryable: true }
          );
        }
        return terminalRun;
      }, { cleanup: { action: 'finish' } });
    } catch (error) {
      if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
      if (error?.code !== 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY') throw error;
      if (findRunByJobId) {
        await leaseGuard();
        try {
          const adopted = resultFromTerminalRun(await findRunByJobId(input.claim?.id));
          if (adopted) return adopted;
        } catch (readError) {
          if (readError?.code === 'CONTENT_JOB_LEASE_LOST'
              || readError?.terminalRunAdopted === true) throw readError;
        }
      }
      throw existingPostRevisionCleanupRetryError(error, { action: 'finish' });
    }
    const result = resultFromTerminalRun(persisted, code);
    if (result) return result;
    throw existingPostRevisionCleanupRetryError(null, { action: 'finish' });
  }

  function persistedRevisionOutcome(context) {
    if (!hasValidLoadedContextEnvelope(context)) {
      return { status: 'unresolved', code: null };
    }
    const revalidation = context.revision?.optimization_report_json?.revalidation;
    const exactFence = revalidation?.revisionVersion === fence.revisionVersion
      && revalidation?.snapshotFingerprint === fence.snapshotFingerprint;
    if (!exactFence) {
      return { status: 'foreign', code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST' };
    }
    if (revalidation.status === 'passed') {
      const approval = evaluateExistingPostRevisionApproval({ revision: context.revision });
      return approval.allowed
        ? { status: 'passed', code: null }
        : { status: 'foreign', code: 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID' };
    }
    if (revalidation.status === 'failed') {
      return {
        status: 'failed',
        code: isExistingPostRevisionFailureCode(revalidation.failureCode)
          ? revalidation.failureCode
          : 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'
      };
    }
    if (revalidation.status === 'pending') return { status: 'pending', code: null };
    return { status: 'unresolved', code: null };
  }

  async function reconcileRevisionAfterTerminalError(cause, intent) {
    let reconciledContext;
    await leaseGuard();
    try {
      reconciledContext = await loadContext(fence);
    } catch (error) {
      if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
      if (error?.code === 'CONTENT_REVISION_REVALIDATION_FENCE_LOST') {
        return finish('needs_manual_attention', error.code);
      }
      throw existingPostRevisionCleanupRetryError(cause ?? error, intent);
    }
    const outcome = persistedRevisionOutcome(reconciledContext);
    if (outcome.status === 'passed') return finish('completed');
    if (outcome.status === 'failed' || outcome.status === 'foreign') {
      return finish('needs_manual_attention', outcome.code);
    }
    throw existingPostRevisionCleanupRetryError(cause, intent);
  }

  async function failClosed(code) {
    const intent = { action: 'fail', failureCode: code };
    try {
      await retryTerminalOperation(async () => {
        const fail = requiredFunction(
          repository?.failRevisionRevalidation,
          'optimizationRepository.failRevisionRevalidation'
        );
        let persisted;
        try {
          persisted = await fail({ ...fence, failureCode: code });
        } catch (cause) {
          if (typeof cause?.code === 'string') throw cause;
          throw Object.assign(
            new Error('Der Revalidierungsfehler wurde nicht sicher gespeichert.', { cause }),
            { code: 'CONTENT_REVISION_REVALIDATION_FAILURE_PERSIST_FAILED', retryable: true }
          );
        }
        if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) {
          throw Object.assign(
            new Error('Der Revalidierungsfehler wurde nicht gespeichert.'),
            { code: 'CONTENT_REVISION_REVALIDATION_FAILURE_PERSIST_FAILED', retryable: true }
          );
        }
        return persisted;
      }, { cleanup: intent });
    } catch (error) {
      if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
      if (error?.code === 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY') {
        return reconcileRevisionAfterTerminalError(error.cause ?? error, intent);
      }
      throw error;
    }
    return finish('needs_manual_attention', code);
  }

  function failClosedOrPreserveCompleteCleanup(code) {
    if (cleanupIntent?.action === 'complete') {
      throw existingPostRevisionCleanupRetryError(
        Object.assign(
          new Error('Der Complete-Cleanup ist lokal noch nicht widerspruchsfrei bestätigt.'),
          { code }
        ),
        cleanupIntent
      );
    }
    return failClosed(code);
  }

  async function handleExecutionError(error) {
    if (error?.code === 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY') throw error;
    const classification = classifyExistingPostRevisionError(error, input.claim);
    if (classification.disposition === 'lease_lost') throw error;
    if (classification.disposition === 'fence_lost') {
      return finish('needs_manual_attention', 'CONTENT_REVISION_REVALIDATION_FENCE_LOST');
    }
    if (cleanupIntent) {
      throw existingPostRevisionCleanupRetryError(error, cleanupIntent);
    }
    if (classification.disposition === 'transient') {
      throw existingPostRevisionTransientError(error);
    }
    return failClosed(classification.failureCode);
  }

  await leaseGuard();
  let context;
  try {
    context = await loadContext(fence);
  } catch (error) {
    return handleExecutionError(error);
  }
  if (!hasValidLoadedContextEnvelope(context)) {
    if (cleanupIntent) {
      throw existingPostRevisionCleanupRetryError(
        new Error('Der gespeicherte Cleanup-Kontext ist noch nicht sicher lesbar.'),
        cleanupIntent
      );
    }
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  const persistedRevalidation = context.revision?.optimization_report_json?.revalidation;
  const exactPersistedFence = persistedRevalidation?.revisionVersion === fence.revisionVersion
    && persistedRevalidation?.snapshotFingerprint === fence.snapshotFingerprint;
  if (!exactPersistedFence) {
    return finish('needs_manual_attention', 'CONTENT_REVISION_REVALIDATION_FENCE_LOST');
  }
  if (persistedRevalidation.status === 'passed') {
    const approval = evaluateExistingPostRevisionApproval({ revision: context.revision });
    if (!approval.allowed) {
      return finish('needs_manual_attention', 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
    }
    return finish('completed');
  }
  if (persistedRevalidation.status === 'failed') {
    const code = isExistingPostRevisionFailureCode(persistedRevalidation.failureCode)
      ? persistedRevalidation.failureCode
      : 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID';
    return finish('needs_manual_attention', code);
  }
  if (persistedRevalidation.status !== 'pending') {
    if (cleanupIntent) {
      throw existingPostRevisionCleanupRetryError(
        new Error('Der Cleanup-Fence hat einen fremden nichtterminalen Status.'),
        cleanupIntent
      );
    }
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  if (cleanupIntent?.action === 'fail') {
    return failClosed(cleanupIntent.failureCode);
  }
  if (cleanupIntent && cleanupIntent.action !== 'complete') {
    throw existingPostRevisionCleanupRetryError(
      new Error('Der Cleanup wartet weiterhin auf einen terminalen Revisionsstand.'),
      cleanupIntent
    );
  }
  const cleanupReview = cleanupIntent?.action === 'complete'
    ? persistedCleanupReview(run, fence)
    : null;
  if (cleanupIntent?.action === 'complete' && !cleanupReview) {
    throw existingPostRevisionCleanupRetryError(
      new Error('Das gefencte Reviewergebnis ist noch nicht sicher gespeichert.'),
      cleanupIntent
    );
  }
  if (!runtimeSnapshot
      || canonicalJson(runtimeSnapshot) !== canonicalJson(context.runtimeSnapshot)) {
    return failClosedOrPreserveCompleteCleanup('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  const trustedContext = readExistingPostTrustedContextSnapshot(runtimeSnapshot);
  const sources = normalizeExistingPostRevisionSources(
    context.revision.optimization_report_json
  );
  if (!trustedContext || !sources) {
    return failClosedOrPreserveCompleteCleanup('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }

  let scope;
  try {
    const validateArticle = requiredFunction(dependencies.validateArticle, 'validateArticle');
    scope = await assertOptimizationSnapshotRevalidated(
      context.revision.snapshot_json,
      validateArticle,
      {
        post: context.post,
        report: context.revision.optimization_report_json,
        validationContext: {
          existingSlugs: trustedContext.existingSlugs,
          allowedInternalLinks: trustedContext.allowedInternalLinks,
          sourceReferences: sources
        }
      }
    );
  } catch (error) {
    const scopeFailed = Array.isArray(error?.issues)
      && error.issues.some((issue) => /scope|umfang/i.test(String(issue?.code || '')));
    return failClosedOrPreserveCompleteCleanup(scopeFailed
      ? 'CONTENT_REVISION_REVALIDATION_SCOPE_FAILED'
      : 'CONTENT_REVISION_REVALIDATION_TECHNICAL_FAILED');
  }
  if (scope?.passed !== true) {
    return failClosedOrPreserveCompleteCleanup('CONTENT_REVISION_REVALIDATION_SCOPE_FAILED');
  }

  const originalAuditCodes = auditCodes(context.audit);
  const currentYear = berlinCalendarYear(runtimeSnapshot.startedAt);
  if (currentYear === null) {
    return failClosedOrPreserveCompleteCleanup('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  const currentAudit = auditExistingPost({
    post: postFromSnapshot(context.post, context.revision.snapshot_json),
    inventory: runtimeSnapshot.allowedInternalLinks.map((url) => ({ url })),
    currentYear
  });
  const reaudit = evaluateExistingContentReaudit({
    originalFindings: context.audit.findings_json,
    currentFindings: currentAudit.findings
  });
  const unresolvedAuditCodes = [
    ...reaudit.unresolvedOriginalCodes,
    ...reaudit.newBlockingCodes
  ];
  if (!reaudit.passed) {
    return failClosedOrPreserveCompleteCleanup('CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  }

  const minimumScore = minimumExistingPostRevisionScore(
    context.revision.optimization_report_json
  );
  if (minimumScore == null
      || context.revision.optimization_report_json?.revalidation?.minimumScore
        !== minimumScore) {
    return failClosedOrPreserveCompleteCleanup('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  let paid = cleanupReview ? { value: cleanupReview } : null;
  if (!paid) {
    try {
      const reviewArticle = requiredFunction(
        dependencies.openaiService?.reviewArticle,
        'openaiService.reviewArticle'
      );
      const reviewerLearningRules = learningRulesForStage(
        runtimeSnapshot.learningRuleSnapshot,
        'reviewer'
      );
      paid = await executePaidStructuredTextStage({
      run,
      stageId: 'revision_editorial_review',
      versionFence: {
        key: 'revisionFence',
        value: `${fence.revisionId}:${fence.revisionVersion}:${fence.snapshotFingerprint}`
      },
      runtimeSnapshot,
      reservationCost: Number(
        runtimeSnapshot.reviewStageReservationEur
          ?? runtimeSnapshot.contentStageReservationEur
      ),
      inputRate: Number(
        runtimeSnapshot.reviewInputCostPerMtok
          ?? runtimeSnapshot.contentInputCostPerMtok
      ),
      outputRate: Number(
        runtimeSnapshot.reviewOutputCostPerMtok
          ?? runtimeSnapshot.contentOutputCostPerMtok
      ),
      schema: ReviewOutputSchema,
      execute: () => reviewArticle({
        briefing: {
          type: 'existing_post_revision_revalidation',
          audit: {
            score: Number(context.audit.score),
            findings: context.audit.findings_json,
            recommendedActions: context.audit.recommended_actions_json
          },
          targetedScope: scope,
          minimumScore
        },
        article: articleFromContext(context.post, context.revision.snapshot_json),
        sourceReferences: sources,
        learningRules: reviewerLearningRules
      })
      }, { ...dependencies, assertLease: leaseGuard });
    } catch (error) {
      return handleExecutionError(error);
    }
  }
  if (paid.manual) {
    const code = isExistingPostRevisionFailureCode(paid.manual.code)
      ? paid.manual.code
      : 'provider_execution_uncertain';
    return failClosedOrPreserveCompleteCleanup(code);
  }
  if (paid.failed || !reviewPasses(paid.value, minimumScore, unresolvedAuditCodes)) {
    return failClosedOrPreserveCompleteCleanup('CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  }

  await leaseGuard();
  try {
    await retryTerminalOperation(async () => {
      const complete = requiredFunction(
        repository?.completeRevisionRevalidation,
        'optimizationRepository.completeRevisionRevalidation'
      );
      const persisted = await complete({
        ...fence,
        review: paid.value,
        score: paid.value.score,
        minimumScore,
        auditCodes: originalAuditCodes,
        unresolvedAuditCodes
      });
      if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) {
        throw Object.assign(
          new Error('Das Revalidierungsergebnis wurde nicht gespeichert.'),
          { code: 'CONTENT_REVISION_REVALIDATION_TRANSIENT', retryable: true }
        );
      }
      return persisted;
    }, {
      shouldRetry: terminalPersistenceIsTransient,
      cleanup: { action: 'complete' }
    });
  } catch (error) {
    if (error?.code === 'CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY') {
      return reconcileRevisionAfterTerminalError(error.cause ?? error, { action: 'complete' });
    }
    return handleExecutionError(error);
  }
  return finish('completed');
}
