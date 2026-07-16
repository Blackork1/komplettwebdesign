import { isDeepStrictEqual } from 'node:util';
import {
  FaqItemSchema,
  InternalLinkSchema,
  ReviewOutputSchema
} from './articleSchemas.js';
import { validateArticle as validateArticleDefault } from './articleValidator.js';
import { buildFocusedRiskReport } from './riskReportService.js';
import {
  AUTO_PUBLISH_POLICY_VERSION,
  evaluateAutoPublish
} from './autoPublishPolicy.js';
import { createContentPublishEventRepository } from '../../repositories/contentPublishEventRepository.js';
import pool from '../../util/db.js';

const MAX_DATABASE_ID = 2_147_483_647;
const MAX_CONTENT_LENGTH = 250_000;
const MAX_IMAGE_URL_LENGTH = 2_048;
const MAX_REJECTION_REASON_LENGTH = 500;

function publicationError(code, message, issues = []) {
  return Object.assign(new Error(message), { code, issues });
}

function positiveDatabaseId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
    throw publicationError(
      'CONTENT_ACTION_VALIDATION_FAILED',
      `${field} ist ungültig.`,
      [{ code: `${field}_invalid`, field }]
    );
  }
  return id;
}

function normalizeBoundedText(value, field, maxLength) {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const bounded = [...text].slice(0, maxLength).join('');
  if (!bounded) {
    throw publicationError(
      'CONTENT_ACTION_VALIDATION_FAILED',
      `${field} ist erforderlich.`,
      [{ code: `${field}_invalid`, field }]
    );
  }
  return bounded;
}

function normalizeAdmin(admin) {
  return {
    id: positiveDatabaseId(admin?.id, 'admin'),
    username: normalizeBoundedText(admin?.username, 'adminUsername', 255)
  };
}

function requiredPersistedText(value, field, maxLength) {
  if (typeof value !== 'string') {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der persistierte Entwurf enthält ungültige Pflichtfelder.',
      [{ code: `${field}_invalid`, field }]
    );
  }
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  if (!normalized || normalized.length > maxLength) {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der persistierte Entwurf enthält ungültige Pflichtfelder.',
      [{ code: `${field}_invalid`, field }]
    );
  }
  return normalized;
}

function parsePersistedFaq(value) {
  try {
    const parsed = Array.isArray(value) ? value : JSON.parse(String(value ?? '[]'));
    return FaqItemSchema.array().min(5).max(7).parse(parsed);
  } catch {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Die persistierten FAQ sind ungültig.',
      [{ code: 'faq_json_invalid', field: 'faqJson' }]
    );
  }
}

function assertDraftState(
  draft,
  conflictCode = 'CONTENT_DRAFT_NOT_PUBLISHABLE',
  workflowStatuses = ['needs_review']
) {
  if (!draft?.post) {
    throw publicationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
  }
  const { post } = draft;
  if (post.generated_by_ai !== true
      || post.published !== false
      || !workflowStatuses.includes(post.workflow_status)
      || post.content_format !== 'static_html') {
    throw publicationError(
      conflictCode,
      conflictCode === 'CONTENT_DRAFT_NOT_REJECTABLE'
        ? 'Der Entwurf kann in diesem Zustand nicht abgelehnt werden.'
        : 'Der Entwurf kann in diesem Zustand nicht veröffentlicht werden.'
    );
  }
}

function assertPublishedAutoState(draft) {
  const { post } = draft || {};
  if (post?.generated_by_ai !== true
      || post.published !== true
      || post.workflow_status !== 'published'
      || post.content_format !== 'static_html') {
    throw publicationError(
      'CONTENT_AUTO_EVENT_CONFLICT',
      'Das automatische Veröffentlichungsereignis widerspricht dem Postzustand.'
    );
  }
}

function assertSafeImageUrl(value) {
  const candidate = requiredPersistedText(value, 'imageUrl', MAX_IMAGE_URL_LENGTH);
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsicher');
  } catch {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Die persistierte Bild-URL ist ungültig.',
      [{ code: 'image_url_invalid', field: 'imageUrl' }]
    );
  }
}

function parsePersistedQualityReport(metadata, qualityScore) {
  const report = metadata?.quality_report_json;
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der persistierte Qualitätsbericht ist unvollständig.',
      [{ code: 'quality_report_invalid', field: 'qualityReport' }]
    );
  }
  const { focusedReview, ...reviewCandidate } = report;
  const parsed = ReviewOutputSchema.safeParse(reviewCandidate);
  if (!parsed.success
      || parsed.data.passed !== true
      || parsed.data.requiresManualReview !== false
      || parsed.data.score !== qualityScore
      || Object.values(parsed.data.risks).some((active) => active !== false)) {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der persistierte Qualitätsbericht ist unvollständig oder widersprüchlich.',
      [{ code: 'quality_report_invalid', field: 'qualityReport' }]
    );
  }
  return { review: parsed.data, focusedReview };
}

function parsePersistedInternalLinks(metadata) {
  const parsed = InternalLinkSchema.array().min(2).max(8).safeParse(
    metadata?.internal_links_json
  );
  if (!parsed.success) {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Die persistierte interne Linkfreigabe ist unvollständig.',
      [{ code: 'internal_links_invalid', field: 'internalLinks' }]
    );
  }
  return parsed.data;
}

function persistedArticle(draft) {
  const { post, metadata } = draft;
  const score = Number(metadata?.quality_score);
  if (!Number.isInteger(score) || score < 80 || score > 100) {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der Qualitätsscore reicht für die Veröffentlichung nicht aus.',
      [{ code: 'quality_score_invalid', field: 'qualityScore' }]
    );
  }
  const qualityReport = parsePersistedQualityReport(metadata, score);
  const allowedInternalLinks = parsePersistedInternalLinks(metadata);
  assertSafeImageUrl(post.image_url);
  const contentHtml = requiredPersistedText(post.content, 'contentHtml', MAX_CONTENT_LENGTH);
  return {
    qualityScore: score,
    allowedInternalLinks,
    ...qualityReport,
    article: {
      title: requiredPersistedText(post.title, 'title', 255),
      shortDescription: requiredPersistedText(post.excerpt, 'shortDescription', 500),
      slug: requiredPersistedText(post.slug, 'slug', 255),
      metaTitle: requiredPersistedText(post.meta_title, 'metaTitle', 255),
      metaDescription: requiredPersistedText(post.meta_description, 'metaDescription', 500),
      ogTitle: requiredPersistedText(post.og_title, 'ogTitle', 255),
      ogDescription: requiredPersistedText(post.og_description, 'ogDescription', 500),
      imageAlt: requiredPersistedText(post.image_alt, 'imageAlt', 500),
      faqJson: parsePersistedFaq(post.faq_json),
      contentHtml
    }
  };
}

async function rollbackQuietly(client) {
  try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
}

export function createContentPublicationService({
  db = pool,
  repository = createContentPublishEventRepository(db),
  validateArticle = validateArticleDefault
} = {}) {
  async function withTransaction(operation) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async function loadValidatedDraft(
    postId,
    client,
    lockedDraft = null,
    { allowPublished = false, workflowStatuses = ['needs_review'] } = {}
  ) {
    const draft = lockedDraft || await repository.getDraftWithMetadataForUpdate(postId, client);
    if (allowPublished) assertPublishedAutoState(draft);
    else assertDraftState(draft, 'CONTENT_DRAFT_NOT_PUBLISHABLE', workflowStatuses);
    const {
      article,
      qualityScore,
      allowedInternalLinks,
      review,
      focusedReview
    } = persistedArticle(draft);
    const persistedContext = await repository.getValidationContext(postId, draft, client);
    const context = { ...persistedContext, allowedInternalLinks };
    const validation = await validateArticle(article, context);
    if (validation?.passed !== true
        || typeof validation?.sanitizedHtml !== 'string'
        || validation.sanitizedHtml !== article.contentHtml) {
      throw publicationError(
        'CONTENT_DRAFT_VALIDATION_FAILED',
        'Die erneute Inhaltsprüfung ist fehlgeschlagen.',
        Array.isArray(validation?.issues) ? validation.issues : []
      );
    }
    const derivedFocusedReview = buildFocusedRiskReport({
      article: { ...article, risk: review.risks },
      review,
      validation,
      sources: context.sourceReferences
    });
    if (!isDeepStrictEqual(derivedFocusedReview, focusedReview)) {
      const updatedMetadata = await repository.updateFocusedReview({
        postId,
        focusedReview: derivedFocusedReview,
        expectedReviewVersion: draft.post.review_version
      }, client);
      if (!updatedMetadata) {
        throw publicationError(
          'CONTENT_REVIEW_VERSION_STALE',
          'Der Entwurf wurde während der erneuten Risikoprüfung verändert.'
        );
      }
      draft.metadata = updatedMetadata;
    }
    if (derivedFocusedReview.blocked === true
        || derivedFocusedReview.riskFlags.length > 0
        || derivedFocusedReview.items.some(({ blocking }) => blocking === true)) {
      throw publicationError(
        'CONTENT_DRAFT_VALIDATION_FAILED',
        'Der aktuelle Risikobericht blockiert die Veröffentlichung.',
        derivedFocusedReview.items
      );
    }
    return {
      draft,
      qualityScore,
      validation,
      riskReport: derivedFocusedReview
    };
  }

  function eventReasons(event) {
    return Array.isArray(event?.reasons_json)
      ? event.reasons_json.filter((reason) => typeof reason === 'string')
      : [];
  }

  function eventDecision(event) {
    return {
      allowed: event?.decision === 'allowed',
      policyVersion: event?.policy_version || AUTO_PUBLISH_POLICY_VERSION,
      reasons: eventReasons(event)
    };
  }

  function safeQualityScore(draft) {
    const score = Number(draft?.metadata?.quality_score);
    return Number.isInteger(score) && score >= 0 && score <= 100 ? score : 0;
  }

  function expectedAutoContext(snapshot) {
    return {
      action: 'auto_publish_policy',
      settingsVersion: Number.isSafeInteger(Number(snapshot?.settingsVersion))
        ? Number(snapshot.settingsVersion)
        : null,
      source: typeof snapshot?.source === 'string' ? snapshot.source : 'unknown',
      forcedMode: snapshot?.forcedMode === 'review' ? 'review' : null
    };
  }

  function autoEventConflict() {
    return publicationError(
      'CONTENT_AUTO_EVENT_CONFLICT',
      'Das vorhandene automatische Veröffentlichungsereignis ist widersprüchlich.'
    );
  }

  function assertAutoEventContract(event, expected) {
    const reasons = eventReasons(event);
    if (!event
        || Number(event.post_id) !== Number(expected.postId)
        || Number(event.run_id) !== Number(expected.runId)
        || event.policy_version !== expected.policyVersion
        || event.decision !== expected.decision
        || Number(event.quality_score) !== Number(expected.qualityScore)
        || !isDeepStrictEqual(reasons, expected.reasons)
        || !isDeepStrictEqual(event.context_json, expected.context)) {
      throw autoEventConflict();
    }
    return event;
  }

  function baseAutoEventInput({ draft, postId, runId, snapshot }) {
    return {
      postId,
      runId,
      policyVersion: AUTO_PUBLISH_POLICY_VERSION,
      qualityScore: safeQualityScore(draft),
      context: expectedAutoContext(snapshot)
    };
  }

  function assertAutoRun(draft, runId) {
    const generationRunId = Number(draft?.post?.generation_run_id);
    if (!Number.isSafeInteger(generationRunId) || generationRunId !== runId) {
      throw publicationError(
        'CONTENT_AUTO_RUN_CONFLICT',
        'Der KI-Entwurf gehört nicht zum angegebenen Content-Agent-Lauf.'
      );
    }
  }

  async function persistAutoEvent({ draft, postId, runId, decision, snapshot }, client) {
    const eventInput = {
      ...baseAutoEventInput({ draft, postId, runId, snapshot }),
      decision: decision.allowed ? 'allowed' : 'blocked',
      policyVersion: decision.policyVersion,
      reasons: decision.reasons,
      context: expectedAutoContext(snapshot)
    };
    const inserted = await repository.insertAutoEvent(eventInput, client);
    if (inserted) return assertAutoEventContract(inserted, eventInput);
    const existing = await repository.getAutoEvent({
      runId,
      policyVersion: decision.policyVersion
    }, client);
    if (!existing) {
      throw publicationError(
        'CONTENT_AUTO_EVENT_UNCERTAIN',
        'Die automatische Veröffentlichungsentscheidung konnte nicht eindeutig gespeichert werden.'
      );
    }
    return assertAutoEventContract(existing, eventInput);
  }

  return {
    async revalidateDraftForPublication({
      postId,
      client,
      lockedDraft = null,
      workflowStatuses = ['needs_review']
    } = {}) {
      const normalizedPostId = positiveDatabaseId(postId, 'postId');
      if (!client || typeof client.query !== 'function') {
        throw new TypeError('Für die Revalidierung wird eine aktive Datenbanktransaktion benötigt.');
      }
      const normalizedStatuses = Array.isArray(workflowStatuses)
        ? [...new Set(workflowStatuses)]
        : [];
      if (normalizedStatuses.length === 0
          || normalizedStatuses.some((status) => !['needs_review', 'approved_scheduled'].includes(status))) {
        throw publicationError(
          'CONTENT_ACTION_VALIDATION_FAILED',
          'Der angeforderte Veröffentlichungszustand ist ungültig.'
        );
      }
      return loadValidatedDraft(normalizedPostId, client, lockedDraft, {
        workflowStatuses: normalizedStatuses
      });
    },

    async publishDraftManually({ postId, admin, confirmed } = {}) {
      if (confirmed !== true) {
        throw publicationError('CONTENT_CONFIRMATION_REQUIRED', 'Die erforderliche Bestätigung fehlt.');
      }
      const normalizedPostId = positiveDatabaseId(postId, 'postId');
      const normalizedAdmin = normalizeAdmin(admin);

      return withTransaction(async (client) => {
        const { draft, qualityScore } = await loadValidatedDraft(normalizedPostId, client);
        const post = await repository.publishDraft(normalizedPostId, client);
        if (!post) {
          throw publicationError(
            'CONTENT_DRAFT_NOT_PUBLISHABLE',
            'Der Entwurf wurde zwischenzeitlich verändert.'
          );
        }
        const event = await repository.insertManualEvent({
          postId: normalizedPostId,
          runId: draft.post.generation_run_id || null,
          qualityScore,
          admin: normalizedAdmin
        }, client);
        if (!event) {
          throw publicationError(
            'CONTENT_DRAFT_NOT_PUBLISHABLE',
            'Für diesen Review-Entwurf besteht bereits eine manuelle Entscheidung.'
          );
        }
        const settings = await repository.incrementManualApprovals(client);
        if (!settings) throw new Error('Content-Agent-Einstellungen fehlen.');
        return { post, event, settings };
      });
    },

    async rejectDraft({ postId, expectedReviewVersion, admin, reason, confirmed } = {}) {
      if (confirmed !== true) {
        throw publicationError('CONTENT_CONFIRMATION_REQUIRED', 'Die erforderliche Bestätigung fehlt.');
      }
      const normalizedPostId = positiveDatabaseId(postId, 'postId');
      const normalizedExpectedReviewVersion = positiveDatabaseId(
        expectedReviewVersion,
        'expectedReviewVersion'
      );
      const normalizedAdmin = normalizeAdmin(admin);
      const normalizedReason = normalizeBoundedText(
        reason,
        'reason',
        MAX_REJECTION_REASON_LENGTH
      );

      return withTransaction(async (client) => {
        const draft = await repository.getDraftWithMetadataForUpdate(normalizedPostId, client);
        assertDraftState(draft, 'CONTENT_DRAFT_NOT_REJECTABLE');
        if (Number(draft.post.review_version) !== normalizedExpectedReviewVersion) {
          throw publicationError(
            'CONTENT_REVIEW_VERSION_STALE',
            'Der Entwurf wurde seit dem Öffnen verändert.'
          );
        }
        const qualityScore = Number(draft.metadata?.quality_score);
        const safeScore = Number.isInteger(qualityScore) && qualityScore >= 0 && qualityScore <= 100
          ? qualityScore
          : 0;
        const post = await repository.rejectDraft(normalizedPostId, client);
        if (!post) {
          throw publicationError(
            'CONTENT_DRAFT_NOT_REJECTABLE',
            'Der Entwurf wurde zwischenzeitlich verändert.'
          );
        }
        const event = await repository.insertRejectionEvent({
          postId: normalizedPostId,
          runId: draft.post.generation_run_id || null,
          qualityScore: safeScore,
          admin: normalizedAdmin,
          reason: normalizedReason
        }, client);
        if (!event) throw new Error('Ablehnungsereignis konnte nicht gespeichert werden.');
        return { post, event };
      });
    },

    async publishDraftAutomatically({ postId, runId, snapshot, leaseGuard } = {}) {
      const normalizedPostId = positiveDatabaseId(postId, 'postId');
      const normalizedRunId = positiveDatabaseId(runId, 'runId');
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        throw publicationError(
          'CONTENT_ACTION_VALIDATION_FAILED',
          'Der unveränderliche Job-Snapshot fehlt.'
        );
      }
      const assertLease = typeof leaseGuard === 'function' ? leaseGuard : async () => true;
      await assertLease();

      return withTransaction(async (client) => {
        const lockedDraft = await repository.getDraftWithMetadataForUpdate(normalizedPostId, client);
        if (!lockedDraft?.post) {
          throw publicationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        assertAutoRun(lockedDraft, normalizedRunId);
        const existingEvent = await repository.getAutoEvent({
          runId: normalizedRunId,
          policyVersion: AUTO_PUBLISH_POLICY_VERSION
        }, client);
        if (existingEvent) {
          if (!['allowed', 'blocked'].includes(existingEvent.decision)
              || !Array.isArray(existingEvent.reasons_json)
              || existingEvent.reasons_json.some((reason) => typeof reason !== 'string' || !reason)) {
            throw autoEventConflict();
          }
          const allowPublished = existingEvent.decision === 'allowed';
          if (allowPublished) {
            assertPublishedAutoState(lockedDraft);
            const committedEvent = {
              ...baseAutoEventInput({
                draft: lockedDraft,
                postId: normalizedPostId,
                runId: normalizedRunId,
                snapshot
              }),
              decision: 'allowed',
              reasons: []
            };
            assertAutoEventContract(existingEvent, committedEvent);
            return {
              post: lockedDraft.post,
              event: existingEvent,
              decision: eventDecision(existingEvent),
              reviewRequired: false
            };
          }
          assertDraftState(lockedDraft, 'CONTENT_AUTO_EVENT_CONFLICT');
          let expectedDecision;
          try {
            const validatedExisting = await loadValidatedDraft(
              normalizedPostId,
              client,
              lockedDraft,
              { allowPublished: false }
            );
            expectedDecision = evaluateAutoPublish({
              snapshot,
              post: validatedExisting.draft.post,
              metadata: validatedExisting.draft.metadata,
              validation: validatedExisting.validation,
              riskReport: validatedExisting.riskReport
            });
          } catch (error) {
            if (!String(error?.code || '').startsWith('CONTENT_DRAFT_')) throw error;
            expectedDecision = {
              allowed: false,
              policyVersion: AUTO_PUBLISH_POLICY_VERSION,
              reasons: ['draft_revalidation_failed']
            };
          }
          const expectedEvent = {
            ...baseAutoEventInput({
              draft: lockedDraft,
              postId: normalizedPostId,
              runId: normalizedRunId,
              snapshot
            }),
            decision: expectedDecision.allowed ? 'allowed' : 'blocked',
            reasons: expectedDecision.reasons
          };
          assertAutoEventContract(existingEvent, expectedEvent);
          if (expectedDecision.allowed) throw autoEventConflict();
          const decision = eventDecision(existingEvent);
          return {
            post: lockedDraft.post,
            event: existingEvent,
            decision,
            reviewRequired: true
          };
        }

        let validated;
        let decision;
        try {
          validated = await loadValidatedDraft(normalizedPostId, client, lockedDraft);
          decision = evaluateAutoPublish({
            snapshot,
            post: validated.draft.post,
            metadata: validated.draft.metadata,
            validation: validated.validation,
            riskReport: validated.riskReport
          });
        } catch (error) {
          if (!String(error?.code || '').startsWith('CONTENT_DRAFT_')) throw error;
          decision = {
            allowed: false,
            policyVersion: AUTO_PUBLISH_POLICY_VERSION,
            reasons: ['draft_revalidation_failed']
          };
        }

        await assertLease();
        const event = await persistAutoEvent({
          draft: lockedDraft,
          postId: normalizedPostId,
          runId: normalizedRunId,
          decision,
          snapshot
        }, client);
        if (!decision.allowed) {
          return {
            post: lockedDraft.post,
            event,
            decision,
            reviewRequired: true
          };
        }

        await assertLease();
        const post = await repository.publishDraft(normalizedPostId, client);
        if (!post) {
          throw publicationError(
            'CONTENT_DRAFT_NOT_PUBLISHABLE',
            'Der Entwurf wurde unmittelbar vor der automatischen Veröffentlichung verändert.'
          );
        }
        return { post, event, decision, reviewRequired: false };
      });
    }
  };
}

const defaultService = createContentPublicationService();
export function publishDraftManually(input, dependencies) {
  return dependencies
    ? createContentPublicationService(dependencies).publishDraftManually(input)
    : defaultService.publishDraftManually(input);
}

export function rejectDraft(input, dependencies) {
  return dependencies
    ? createContentPublicationService(dependencies).rejectDraft(input)
    : defaultService.rejectDraft(input);
}

export function publishDraftAutomatically(input, dependencies) {
  return dependencies
    ? createContentPublicationService(dependencies).publishDraftAutomatically(input)
    : defaultService.publishDraftAutomatically(input);
}
