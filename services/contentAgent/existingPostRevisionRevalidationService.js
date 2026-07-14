import { ReviewOutputSchema, SourceReferenceSchema } from './articleSchemas.js';
import {
  canonicalJson,
  readExistingPostTrustedContextSnapshot
} from './contentRuleManifest.js';
import { learningRulesForStage } from './contentLearningSnapshotService.js';
import { assertOptimizationSnapshotRevalidated } from './contentRevisionService.js';
import { auditExistingPost } from './legacyAuditService.js';
import { normalizeSafeHttpsUrl } from './httpsUrlSafety.js';
import { executePaidStructuredTextStage } from './providerTextStageService.js';

const REAUDITABLE_CODES = new Set([
  'unsupported_content_format',
  'missing_meta_title',
  'missing_meta_description',
  'missing_image_alt',
  'missing_structured_faq',
  'stale_year',
  'static_price',
  'missing_contact_cta',
  'missing_internal_links',
  'broken_internal_link',
  'unknown_internal_link'
]);
const ALLOWED_FAILURE_CODES = new Set([
  'CONTENT_BUDGET_LIMIT_REACHED',
  'provider_execution_uncertain',
  'provider_stage_cost_invalid',
  'provider_stage_persistence_uncertain',
  'provider_stage_result_invalid',
  'provider_stage_schema_invalid'
]);

function requiredFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Die Revalidierung benötigt ${name}.`);
  }
  return value;
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

function safeSources(report) {
  const parsed = SourceReferenceSchema.array().max(6).safeParse(report?.sources ?? []);
  if (!parsed.success) return null;
  const normalized = parsed.data.map((source) => {
    const url = normalizeSafeHttpsUrl(source.url);
    return url ? { ...source, url } : null;
  });
  return normalized.every(Boolean) ? normalized : null;
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
    const persisted = await finishRun(runId, {
      status,
      postId: null,
      errorReport: code ? { code, message: 'Die aktuelle KI-Revision benötigt eine manuelle Prüfung.' } : {}
    });
    if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) {
      throw Object.assign(new Error('Der Revalidierungslauf konnte nicht sicher abgeschlossen werden.'), {
        code: 'CONTENT_RUN_FINISH_FAILED', retryable: true
      });
    }
  }

  async function failClosed(code) {
    await leaseGuard();
    await fail({ ...fence, failureCode: code });
    await finish('needs_manual_attention', code);
    return { status: 'needs_manual_attention', revisionId: fence.revisionId, code };
  }

  await leaseGuard();
  let context;
  try {
    context = await loadContext(fence);
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    if (error?.code === 'CONTENT_REVISION_REVALIDATION_FENCE_LOST') {
      await finish('needs_manual_attention', error.code);
      return { status: 'needs_manual_attention', revisionId: fence.revisionId, code: error.code };
    }
    throw error;
  }
  if (!runtimeSnapshot
      || canonicalJson(runtimeSnapshot) !== canonicalJson(context.runtimeSnapshot)) {
    return failClosed('CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID');
  }
  const trustedContext = readExistingPostTrustedContextSnapshot(runtimeSnapshot);
  const sources = safeSources(context.revision.optimization_report_json);
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
  const currentAuditCodes = new Set(currentAudit.findings.map(({ code }) => code));
  const unresolvedAuditCodes = originalAuditCodes.filter((code) => (
    !REAUDITABLE_CODES.has(code) || currentAuditCodes.has(code)
  ));
  if (unresolvedAuditCodes.length > 0) {
    return failClosed('CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  }

  const minimumScore = Math.max(
    80,
    Number.isFinite(Number(
      context.revision.optimization_report_json?.afterScore
        ?? context.revision.optimization_report_json?.beforeScore
    ))
      ? Number(
        context.revision.optimization_report_json?.afterScore
          ?? context.revision.optimization_report_json?.beforeScore
      )
      : 80
  );
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
    const code = ALLOWED_FAILURE_CODES.has(paid.manual.code)
      ? paid.manual.code
      : 'provider_execution_uncertain';
    return failClosed(code);
  }
  if (paid.failed || !reviewPasses(paid.value, minimumScore, unresolvedAuditCodes)) {
    return failClosed('CONTENT_REVISION_REVALIDATION_QUALITY_FAILED');
  }

  await leaseGuard();
  await complete({
    ...fence,
    review: paid.value,
    score: paid.value.score,
    minimumScore,
    auditCodes: originalAuditCodes,
    unresolvedAuditCodes
  });
  await finish('completed');
  return { status: 'completed', revisionId: fence.revisionId };
}
