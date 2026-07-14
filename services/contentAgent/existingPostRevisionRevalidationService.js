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
  existingPostRevisionTransientError,
  isExistingPostRevisionFailureCode
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
  const complete = requiredFunction(
    repository?.completeRevisionRevalidation,
    'optimizationRepository.completeRevisionRevalidation'
  );
  const fail = requiredFunction(
    repository?.failRevisionRevalidation,
    'optimizationRepository.failRevisionRevalidation'
  );
  const finishRun = requiredFunction(dependencies.runRepository?.finishRun, 'runRepository.finishRun');
  const validateArticle = requiredFunction(dependencies.validateArticle, 'validateArticle');
  const reviewArticle = requiredFunction(dependencies.openaiService?.reviewArticle, 'openaiService.reviewArticle');
  const fence = {
    revisionId: payload.revision_id,
    revisionVersion: payload.revision_version,
    snapshotFingerprint: payload.snapshot_fingerprint
  };

  async function finish(status, code = null) {
    await leaseGuard();
    try {
      const persisted = await finishRun(runId, {
        status,
        postId: null,
        errorReport: code ? { code, message: 'Die aktuelle KI-Revision benötigt eine manuelle Prüfung.' } : {}
      });
      if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) {
        throw new Error('Der Revalidierungslauf wurde nicht aktualisiert.');
      }
    } catch (cause) {
      throw Object.assign(
        new Error('Der Revalidierungslauf konnte nicht sicher abgeschlossen werden.', { cause }),
        { code: 'CONTENT_RUN_FINISH_FAILED', retryable: true }
      );
    }
  }

  async function failClosed(code) {
    await leaseGuard();
    try {
      await fail({ ...fence, failureCode: code });
    } catch (error) {
      if (error?.code !== 'CONTENT_REVISION_REVALIDATION_FENCE_LOST') throw error;
      await finish('needs_manual_attention', error.code);
      return {
        status: 'needs_manual_attention',
        revisionId: fence.revisionId,
        code: error.code
      };
    }
    await finish('needs_manual_attention', code);
    return { status: 'needs_manual_attention', revisionId: fence.revisionId, code };
  }

  async function handleExecutionError(error) {
    const classification = classifyExistingPostRevisionError(error, input.claim);
    if (classification.disposition === 'lease_lost') throw error;
    if (classification.disposition === 'fence_lost') {
      await finish('needs_manual_attention', 'CONTENT_REVISION_REVALIDATION_FENCE_LOST');
      return {
        status: 'needs_manual_attention',
        revisionId: fence.revisionId,
        code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST'
      };
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
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  const persistedRevalidation = context.revision?.optimization_report_json?.revalidation;
  const exactPersistedFence = persistedRevalidation?.revisionVersion === fence.revisionVersion
    && persistedRevalidation?.snapshotFingerprint === fence.snapshotFingerprint;
  if (!exactPersistedFence) {
    await finish('needs_manual_attention', 'CONTENT_REVISION_REVALIDATION_FENCE_LOST');
    return {
      status: 'needs_manual_attention',
      revisionId: fence.revisionId,
      code: 'CONTENT_REVISION_REVALIDATION_FENCE_LOST'
    };
  }
  if (persistedRevalidation.status === 'passed') {
    const approval = evaluateExistingPostRevisionApproval({ revision: context.revision });
    if (!approval.allowed) {
      await finish('needs_manual_attention', 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
      return {
        status: 'needs_manual_attention',
        revisionId: fence.revisionId,
        code: 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'
      };
    }
    await finish('completed');
    return { status: 'completed', revisionId: fence.revisionId };
  }
  if (persistedRevalidation.status === 'failed') {
    const code = isExistingPostRevisionFailureCode(persistedRevalidation.failureCode)
      ? persistedRevalidation.failureCode
      : 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID';
    await finish('needs_manual_attention', code);
    return { status: 'needs_manual_attention', revisionId: fence.revisionId, code };
  }
  if (persistedRevalidation.status !== 'pending') {
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  if (!runtimeSnapshot
      || canonicalJson(runtimeSnapshot) !== canonicalJson(context.runtimeSnapshot)) {
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  const trustedContext = readExistingPostTrustedContextSnapshot(runtimeSnapshot);
  const sources = normalizeExistingPostRevisionSources(
    context.revision.optimization_report_json
  );
  if (!trustedContext || !sources) {
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }

  let scope;
  try {
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
    return failClosed(scopeFailed
      ? 'CONTENT_REVISION_REVALIDATION_SCOPE_FAILED'
      : 'CONTENT_REVISION_REVALIDATION_TECHNICAL_FAILED');
  }
  if (scope?.passed !== true) {
    return failClosed('CONTENT_REVISION_REVALIDATION_SCOPE_FAILED');
  }

  const originalAuditCodes = auditCodes(context.audit);
  const currentAudit = auditExistingPost({
    post: postFromSnapshot(context.post, context.revision.snapshot_json),
    inventory: runtimeSnapshot.allowedInternalLinks.map((url) => ({ url })),
    currentYear: new Date(runtimeSnapshot.startedAt).getUTCFullYear()
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
    return failClosed('CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  }

  const minimumScore = minimumExistingPostRevisionScore(
    context.revision.optimization_report_json
  );
  if (minimumScore == null
      || context.revision.optimization_report_json?.revalidation?.minimumScore
        !== minimumScore) {
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  const reviewerLearningRules = learningRulesForStage(
    runtimeSnapshot.learningRuleSnapshot,
    'reviewer'
  );
  let paid;
  try {
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
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    return failClosed('provider_execution_uncertain');
  }
  if (paid.manual) {
    const code = isExistingPostRevisionFailureCode(paid.manual.code)
      ? paid.manual.code
      : 'provider_execution_uncertain';
    return failClosed(code);
  }
  if (paid.failed || !reviewPasses(paid.value, minimumScore, unresolvedAuditCodes)) {
    return failClosed('CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  }

  await leaseGuard();
  try {
    await complete({
      ...fence,
      review: paid.value,
      score: paid.value.score,
      minimumScore,
      auditCodes: originalAuditCodes,
      unresolvedAuditCodes
    });
  } catch (error) {
    return handleExecutionError(error);
  }
  await finish('completed');
  return { status: 'completed', revisionId: fence.revisionId };
}
