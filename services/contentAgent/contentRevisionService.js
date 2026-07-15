import { createHash } from 'node:crypto';
import { sanitizeArticleHtml } from './articleSanitizer.js';
import { validateArticle as defaultValidateArticle } from './articleValidator.js';
import { createContentRevisionRepository } from '../../repositories/contentRevisionRepository.js';
import { createContentExistingPostOptimizationRepository } from '../../repositories/contentExistingPostOptimizationRepository.js';
import { createContentSearchMetricsRepository } from '../../repositories/contentSearchMetricsRepository.js';
import { FaqItemSchema, ReviewOutputSchema } from './articleSchemas.js';
import { ExistingPostOptimizationOutputSchema } from './existingPostOptimizationSchemas.js';
import { validateTargetedOptimizationScope } from './existingPostDiffService.js';
import { normalizeInternalHref } from './trustedInternalLinkService.js';
import { snapshotFingerprint } from './revisionSnapshotFingerprint.js';
import {
  evaluateExistingPostRevisionApproval,
  minimumExistingPostRevisionScore
} from './existingPostRevisionApprovalPolicy.js';
import { captureRevisionBaseline } from './contentRevisionOutcomeService.js';
import {
  isLegacyStaticHtml,
  requiresLegacyBytePreservation
} from './legacyContentPolicy.js';
import { validateLegacyStaticOptimization } from './legacyStaticValidationService.js';

const EDITABLE_FIELDS = Object.freeze([
  'title', 'excerpt', 'content', 'meta_title', 'meta_description',
  'og_title', 'og_description', 'faq_json', 'image_url', 'image_alt'
]);
const MAX_FIELD_LENGTHS = Object.freeze({
  title: 255,
  excerpt: 500,
  content: 250_000,
  meta_title: 255,
  meta_description: 500,
  og_title: 255,
  og_description: 500,
  image_url: 2_048,
  image_alt: 500
});
const MAX_PG_INT32 = 2_147_483_647;
const SHA256 = /^[0-9a-f]{64}$/;

function revisionError(code, message, issues = []) {
  return Object.assign(new Error(message), { code, issues });
}

function normalizedTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toISOString();
}

function canonicalLiveState(post) {
  const fields = Object.fromEntries(EDITABLE_FIELDS.map((key) => [key, post?.[key] ?? (key === 'faq_json' ? [] : '')]));
  return {
    slug: String(post?.slug || ''),
    content_format: String(post?.content_format || 'legacy_ejs'),
    updated_at: normalizedTimestamp(post?.updated_at),
    fields
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function liveHashForPost(post) {
  return createHash('sha256').update(stableJson(canonicalLiveState(post))).digest('hex');
}

export function createRevisionSnapshot(post) {
  const live = canonicalLiveState(post);
  return {
    version: 1,
    base: {
      slug: live.slug,
      content_format: live.content_format,
      updated_at: live.updated_at,
      live_hash: liveHashForPost(post)
    },
    fields: live.fields
  };
}

function normalizeAdmin(admin) {
  const id = Number(admin?.id);
  const username = String(admin?.username || '').trim().slice(0, 255);
  if (!Number.isSafeInteger(id) || id < 1 || !username) {
    throw revisionError('CONTENT_ACTION_VALIDATION_FAILED', 'Die Administrator-Zuordnung ist ungültig.');
  }
  return { id, username };
}

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw revisionError('CONTENT_ACTION_VALIDATION_FAILED', `${field} ist ungültig.`);
  }
  return id;
}

function postgresInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > MAX_PG_INT32) {
    throw revisionError('CONTENT_ACTION_VALIDATION_FAILED', `${field} ist ungültig.`);
  }
  return number;
}

function changeHash(value) {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    throw revisionError('CONTENT_ACTION_VALIDATION_FAILED', 'changeId ist ungültig.');
  }
  return value;
}

function parseFaq(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '[]'));
    if (Array.isArray(parsed)) return parsed;
  } catch { /* einheitlicher Fehler unten */ }
  throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die FAQ-Daten sind ungültig.');
}

function normalizePatch(input = {}) {
  for (const forbidden of ['slug', 'published', 'published_at', 'workflow_status', 'content_format']) {
    if (Object.hasOwn(input, forbidden)) {
      throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', `${forbidden} darf in einer Bestandsrevision nicht geändert werden.`);
    }
  }
  const patch = {};
  for (const key of EDITABLE_FIELDS) {
    if (!Object.hasOwn(input, key)) continue;
    if (key === 'faq_json') patch[key] = parseFaq(input[key]);
    else {
      const value = String(input[key] ?? '').replace(/\r\n?/g, '\n');
      if (value.length > MAX_FIELD_LENGTHS[key]) {
        throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', `${key} ist zu lang.`);
      }
      patch[key] = value;
    }
  }
  return patch;
}

function assertRequiredFields(fields) {
  for (const key of ['title', 'excerpt', 'content', 'meta_title', 'meta_description', 'og_title', 'og_description', 'image_alt']) {
    const value = fields?.[key];
    if (typeof value !== 'string' || !value.trim() || value.length > MAX_FIELD_LENGTHS[key]) {
      throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', `${key} fehlt oder ist ungültig.`);
    }
  }
  const faq = FaqItemSchema.array().min(5).max(7).safeParse(fields?.faq_json);
  if (!faq.success || faq.data.some((item) => item.question.length > 300 || item.answer.length > 5_000)) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die FAQ müssen fünf bis sieben gültige, begrenzte Frage-Antwort-Objekte enthalten.');
  }
  const imageUrl = String(fields?.image_url || '').trim();
  if (!imageUrl || imageUrl.length > MAX_FIELD_LENGTHS.image_url) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die Bild-URL ist nicht sicher freigegeben.');
  }
  let safeImage = false;
  if (imageUrl.startsWith('/')) {
    const normalized = normalizeInternalHref(imageUrl);
    safeImage = normalized.kind === 'internal'
      && normalized.path.startsWith('/uploads/')
      && !/[\s%\\]/.test(imageUrl);
  } else {
    try {
      const url = new URL(imageUrl);
      safeImage = url.protocol === 'https:' && !url.username && !url.password;
    } catch { safeImage = false; }
  }
  if (!safeImage) throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die Bild-URL ist nicht sicher freigegeben.');
}

function validationArticle(snapshot) {
  return {
    title: snapshot.fields.title,
    shortDescription: snapshot.fields.excerpt,
    slug: snapshot.base.slug,
    metaTitle: snapshot.fields.meta_title,
    metaDescription: snapshot.fields.meta_description,
    ogTitle: snapshot.fields.og_title,
    ogDescription: snapshot.fields.og_description,
    imageAlt: snapshot.fields.image_alt,
    faqJson: snapshot.fields.faq_json,
    contentHtml: snapshot.fields.content,
    contentFormat: snapshot.base.content_format
  };
}

function splitValidationContext(context = {}) {
  const source = context && typeof context === 'object' ? context : {};
  const { post, baselinePost, ...validationContext } = source;
  return {
    validationContext,
    baselinePost: baselinePost || post || null
  };
}

async function assertSnapshotValid(snapshot, validateArticle, context = {}, baselineSnapshot = null) {
  assertRequiredFields(snapshot?.fields);
  const contentFormat = snapshot?.base?.content_format;
  const content = String(snapshot.fields?.content || '');
  if (requiresLegacyBytePreservation({ contentFormat, contentHtml: content })) return;
  if (!['static_html', 'legacy_ejs'].includes(contentFormat)) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Das Inhaltsformat ist nicht freigegeben.');
  }
  const splitContext = splitValidationContext(context);
  const normalizedContext = {
    ...splitContext.validationContext,
    existingSlugs: (splitContext.validationContext.existingSlugs || [])
      .filter((slug) => slug !== snapshot.base.slug),
    allowedInternalLinks: Array.isArray(splitContext.validationContext.allowedInternalLinks)
      ? splitContext.validationContext.allowedInternalLinks
      : []
  };
  if (isLegacyStaticHtml({ contentFormat, contentHtml: content })) {
    const baseline = baselineSnapshot || (
      splitContext.baselinePost ? createRevisionSnapshot(splitContext.baselinePost) : null
    );
    if (!baseline) {
      throw revisionError(
        'CONTENT_REVISION_VALIDATION_FAILED',
        'Für statischen Legacy-Inhalt fehlt die unveränderliche Vergleichsbasis.'
      );
    }
    const validation = await validateLegacyStaticOptimization({
      before: validationArticle(baseline),
      after: validationArticle(snapshot),
      validateArticle,
      context: normalizedContext
    });
    if (validation.passed !== true) {
      throw revisionError(
        'CONTENT_REVISION_VALIDATION_FAILED',
        'Die differenzielle Altartikelprüfung ist fehlgeschlagen.',
        validation.issues
      );
    }
    return;
  }

  const sanitized = sanitizeArticleHtml(content);
  if (sanitized !== content || /<%|%>/.test(content)) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Das Artikel-HTML enthält nicht erlaubte Inhalte.');
  }
  const validation = await validateArticle(validationArticle(snapshot), normalizedContext);
  if (validation?.passed !== true || validation.sanitizedHtml !== content) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      'Die erneute Inhaltsprüfung ist fehlgeschlagen.',
      Array.isArray(validation?.issues) ? validation.issues : []
    );
  }
}

export async function assertOptimizationSnapshotRevalidated(
  snapshot,
  validateArticle,
  { post, report, validationContext = {} } = {}
) {
  await assertSnapshotValid(
    snapshot,
    validateArticle,
    validationContext,
    createRevisionSnapshot(post)
  );
  const before = validationArticle(createRevisionSnapshot(post));
  const after = validationArticle(snapshot);
  const scope = validateTargetedOptimizationScope({ before, after });
  if (scope.passed !== true) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      'Die erneute Umfangsprüfung ist fehlgeschlagen.',
      [{ code: scope.code || 'TARGETED_SCOPE_EXCEEDED' }]
    );
  }
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      'Der gespeicherte Optimierungsbericht ist ungültig.'
    );
  }
  return scope;
}

function assertOptimizationReportApproved(revision) {
  const decision = evaluateExistingPostRevisionApproval({ revision });
  if (!decision.allowed) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      `Die Optimierungsrevision erfüllt die Freigabekriterien nicht: ${decision.reasonLabel}.`
    );
  }
}

function optimizedRevisionInput(input = {}) {
  const post = input.post;
  const postId = positiveId(post?.id, 'post.id');
  if (post?.published !== true) {
    throw revisionError('CONTENT_POST_NOT_FOUND', 'Veröffentlichter Beitrag nicht gefunden.');
  }
  const parsedFields = ExistingPostOptimizationOutputSchema.safeParse(input.fields);
  if (!parsedFields.success) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      'Die optimierten Revisionsfelder sind ungültig.',
      parsedFields.error.issues
    );
  }
  const baseLiveHash = String(input.baseLiveHash || '');
  if (!/^[0-9a-f]{64}$/.test(baseLiveHash) || liveHashForPost(post) !== baseLiveHash) {
    throw revisionError('CONTENT_REVISION_STALE', 'Der Liveartikel wurde seit Beginn der Optimierung verändert.');
  }
  if (!input.diff || typeof input.diff !== 'object' || !Array.isArray(input.diff.changes)) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Der serverseitige Optimierungsdiff ist ungültig.');
  }
  if (!input.report || typeof input.report !== 'object' || Array.isArray(input.report)
      || input.report.baseLiveHash !== baseLiveHash) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Der Optimierungsbericht ist ungültig.');
  }

  const fields = parsedFields.data;
  const snapshot = createRevisionSnapshot(post);
  Object.assign(snapshot.fields, {
    title: fields.title,
    excerpt: fields.shortDescription,
    content: fields.contentHtml,
    meta_title: fields.metaTitle,
    meta_description: fields.metaDescription,
    og_title: fields.ogTitle,
    og_description: fields.ogDescription,
    faq_json: fields.faqJson,
    image_alt: fields.imageAlt
  });
  if (requiresLegacyBytePreservation({
    contentFormat: snapshot.base.content_format,
    contentHtml: post.content
  }) && snapshot.fields.content !== post.content) {
    throw revisionError('LEGACY_EJS_CONTENT_CHANGE_FORBIDDEN', 'Legacy-EJS-Inhalt bleibt bytegenau unveränderlich.');
  }

  const report = {
    ...structuredClone(input.report),
    baseLiveHash,
    changes: structuredClone(input.diff.changes)
  };
  const parsedReview = ReviewOutputSchema.safeParse(report.review);
  if (!parsedReview.success || Number(report.afterScore) !== parsedReview.data.score) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      'Der gebundene redaktionelle Prüfbericht ist ungültig.',
      parsedReview.success ? [] : parsedReview.error.issues
    );
  }
  report.review = parsedReview.data;
  const minimumScore = minimumExistingPostRevisionScore(report);
  if (minimumScore == null) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      'Der gebundene Ausgangsscore ist ungültig.'
    );
  }
  report.revalidation = {
    status: 'passed',
    revisionVersion: 1,
    snapshotFingerprint: snapshotFingerprint(snapshot),
    review: structuredClone(parsedReview.data),
    score: parsedReview.data.score,
    minimumScore,
    auditCodes: [],
    unresolvedAuditCodes: []
  };

  return {
    postId,
    auditId: positiveId(input.auditId, 'auditId'),
    jobId: positiveId(input.jobId, 'jobId'),
    baseLiveHash,
    baselineSnapshot: createRevisionSnapshot(post),
    snapshot,
    report,
    admin: normalizeAdmin(input.admin),
    validationContext: input.validationContext && typeof input.validationContext === 'object'
      ? input.validationContext
      : {}
  };
}

export function createContentRevisionService({
  repository = createContentRevisionRepository(),
  optimizationRepository = createContentExistingPostOptimizationRepository(),
  searchMetricsRepository = createContentSearchMetricsRepository(),
  validateArticle = defaultValidateArticle,
  timezone = 'Europe/Berlin'
} = {}) {
  return {
    async prepareExistingPostOptimization(postId) {
      const post = await optimizationRepository.getPublishedPostSnapshot(
        positiveId(postId, 'postId')
      );
      if (!post || post.published !== true) {
        throw revisionError('CONTENT_POST_NOT_FOUND', 'Veröffentlichter Beitrag nicht gefunden.');
      }
      return { baseLiveHash: liveHashForPost(post) };
    },

    async createOptimizedRevision(input = {}) {
      const normalized = optimizedRevisionInput(input);
      await assertSnapshotValid(
        normalized.snapshot,
        validateArticle,
        normalized.validationContext,
        normalized.baselineSnapshot
      );
      return optimizationRepository.createOptimizedRevision({
        postId: normalized.postId,
        auditId: normalized.auditId,
        jobId: normalized.jobId,
        baseLiveHash: normalized.baseLiveHash,
        snapshot: normalized.snapshot,
        report: normalized.report,
        admin: normalized.admin
      });
    },

    async enqueueAudit({ admin } = {}) {
      const normalizedAdmin = normalizeAdmin(admin);
      return repository.enqueueAuditJob({ admin: normalizedAdmin });
    },

    async createRevisionFromAudit({ postId, auditId, admin } = {}) {
      const normalizedAdmin = normalizeAdmin(admin);
      return repository.createRevisionFromAudit({
        postId: positiveId(postId, 'postId'),
        auditId: positiveId(auditId, 'auditId'),
        admin: normalizedAdmin,
        createSnapshot: createRevisionSnapshot
      });
    },

    async getRevisionForEdit(revisionId) {
      const revision = await repository.getRevisionForEdit(positiveId(revisionId, 'revisionId'));
      if (!revision) throw revisionError('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
      return revision;
    },

    async getRevisionComparison(revisionId) {
      const revision = await optimizationRepository.getRevisionComparison(
        positiveId(revisionId, 'revisionId')
      );
      if (!revision) throw revisionError('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
      return revision;
    },

    async revertOptimizationChange(input = {}) {
      const revisionId = postgresInteger(input.revisionId, 'revisionId');
      const expectedVersion = postgresInteger(input.expectedVersion, 'expectedVersion');
      const normalizedAdmin = normalizeAdmin(input.admin);
      return optimizationRepository.updateRevisionAfterRevert({
        revisionId,
        changeId: changeHash(input.changeId),
        expectedVersion,
        admin: normalizedAdmin,
        validateSnapshot: (snapshot, context) => assertOptimizationSnapshotRevalidated(
          snapshot,
          validateArticle,
          context
        )
      });
    },

    async rejectOptimizationRevision(input = {}) {
      if (input.confirmed !== true) {
        throw revisionError('CONTENT_CONFIRMATION_REQUIRED', 'Die erforderliche Bestätigung fehlt.');
      }
      return optimizationRepository.rejectRevision({
        revisionId: postgresInteger(input.revisionId, 'revisionId'),
        expectedVersion: postgresInteger(input.expectedVersion, 'expectedVersion'),
        admin: normalizeAdmin(input.admin)
      });
    },

    async renderRevisionEdit(revisionId, req, res) {
      const revision = await this.getRevisionForEdit(revisionId);
      return res.render('admin/contentAgent/revisionEdit', {
        revision,
        saved: req.query?.saved === '1'
      });
    },

    async updateRevision({ revisionId, input, admin } = {}) {
      const id = postgresInteger(revisionId, 'revisionId');
      const normalizedAdmin = normalizeAdmin(admin);
      const revision = await repository.getRevisionForEdit(id);
      if (!revision) throw revisionError('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
      if (revision.status !== 'draft') throw revisionError('CONTENT_REVISION_CONFLICT', 'Nur Entwurfsrevisionen sind bearbeitbar.');
      const expectedVersion = Number(input?.revision_version);
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || expectedVersion !== Number(revision.revision_version)) {
        throw revisionError('CONTENT_REVISION_CONFLICT', 'Die Revision wurde in einem anderen Browserfenster verändert.');
      }
      const patch = normalizePatch(input);
      if (revision.optimization_job_id != null) {
        return optimizationRepository.updateRevisionAfterManualEdit({
          revisionId: postgresInteger(id, 'revisionId'),
          expectedVersion: postgresInteger(expectedVersion, 'expectedVersion'),
          admin: normalizedAdmin,
          buildValidatedUpdate: async (lockedSnapshot, context) => {
            const snapshot = structuredClone(lockedSnapshot);
            if (requiresLegacyBytePreservation({
              contentFormat: snapshot.base.content_format,
              contentHtml: snapshot.fields.content
            })
                && Object.hasOwn(patch, 'content')
                && patch.content !== snapshot.fields.content) {
              throw revisionError(
                'CONTENT_REVISION_VALIDATION_FAILED',
                'Legacy-EJS-Inhalt bleibt unveränderlich.'
              );
            }
            Object.assign(snapshot.fields, patch);
            await assertOptimizationSnapshotRevalidated(snapshot, validateArticle, context);
            return snapshot;
          }
        });
      }
      const snapshot = structuredClone(revision.snapshot_json);
      const baselineSnapshot = structuredClone(revision.snapshot_json);
      if (requiresLegacyBytePreservation({
        contentFormat: snapshot.base.content_format,
        contentHtml: snapshot.fields.content
      })
          && Object.hasOwn(patch, 'content')
          && patch.content !== snapshot.fields.content) {
        throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Legacy-EJS-Inhalt bleibt unveränderlich.');
      }
      Object.assign(snapshot.fields, patch);
      await assertSnapshotValid(
        snapshot,
        validateArticle,
        revision.validation_context || {},
        baselineSnapshot
      );
      const updated = await repository.updateDraftRevision({ revisionId: id, snapshot, expectedVersion });
      if (!updated) throw revisionError('CONTENT_REVISION_CONFLICT', 'Die Revision wurde zwischenzeitlich verändert.');
      return updated;
    },

    async approveRevision({ revisionId, expectedVersion, confirmed, admin } = {}) {
      if (confirmed !== true) throw revisionError('CONTENT_CONFIRMATION_REQUIRED', 'Die erforderliche Bestätigung fehlt.');
      const id = postgresInteger(revisionId, 'revisionId');
      const version = postgresInteger(expectedVersion, 'expectedVersion');
      const normalizedAdmin = normalizeAdmin(admin);
      return repository.approveRevisionTransaction({
        revisionId: id,
        expectedVersion: version,
        admin: normalizedAdmin,
        currentHash: liveHashForPost,
        validateSnapshot: (snapshot, context) => assertSnapshotValid(snapshot, validateArticle, context),
        validateApproval: ({ revision }) => {
          if (revision?.optimization_job_id != null) assertOptimizationReportApproved(revision);
        },
        afterApproval: async ({ revision, post }, client) => {
          if (revision?.optimization_job_id == null) return;
          assertOptimizationReportApproved(revision);
          await optimizationRepository.recordAcceptedRevisionFeedback({
            revisionId: id,
            postId: revision.post_id,
            expectedVersion: version,
            admin: normalizedAdmin,
            report: revision.optimization_report_json
          }, client);
          await captureRevisionBaseline({
            revisionId: id,
            postId: revision.post_id,
            expectedVersion: version,
            appliedAt: post.updated_at,
            timezone,
            transactionClient: client
          }, {
            searchMetricsRepository,
            outcomeRepository: optimizationRepository
          });
        }
      });
    }
  };
}
