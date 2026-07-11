import { FaqItemSchema } from './articleSchemas.js';
import { validateArticle as validateArticleDefault } from './articleValidator.js';
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

function assertDraftState(draft, conflictCode = 'CONTENT_DRAFT_NOT_PUBLISHABLE') {
  if (!draft?.post) {
    throw publicationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
  }
  const { post } = draft;
  if (post.generated_by_ai !== true
      || post.published !== false
      || post.workflow_status !== 'needs_review'
      || post.content_format !== 'static_html') {
    throw publicationError(
      conflictCode,
      conflictCode === 'CONTENT_DRAFT_NOT_REJECTABLE'
        ? 'Der Entwurf kann in diesem Zustand nicht abgelehnt werden.'
        : 'Der Entwurf kann in diesem Zustand nicht veröffentlicht werden.'
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

function hasBlockingRisk(metadata) {
  const report = metadata?.quality_report_json;
  if (!report || typeof report !== 'object' || Array.isArray(report)) return true;
  const focused = report.focusedReview;
  if (!focused || typeof focused !== 'object' || Array.isArray(focused)) return true;
  if (focused.blocked !== false
      || !Array.isArray(focused.items)
      || !Array.isArray(focused.riskFlags)) return true;
  if (focused.items.some((item) => (
    !item || typeof item !== 'object' || item.blocking === true
  ))) return true;
  if (focused.riskFlags.length > 0) return true;
  const risks = report.risks;
  if (!risks || typeof risks !== 'object' || Array.isArray(risks)) return true;
  return Object.values(risks).some((active) => active !== false);
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
  if (hasBlockingRisk(metadata)) {
    throw publicationError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der Entwurf enthält noch blockierende Prüfstellen.',
      [{ code: 'risk_review_blocking', field: 'riskReview' }]
    );
  }
  assertSafeImageUrl(post.image_url);
  const contentHtml = requiredPersistedText(post.content, 'contentHtml', MAX_CONTENT_LENGTH);
  return {
    qualityScore: score,
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

  async function loadValidatedDraft(postId, client) {
    const draft = await repository.getDraftWithMetadataForUpdate(postId, client);
    assertDraftState(draft);
    const { article, qualityScore } = persistedArticle(draft);
    const context = await repository.getValidationContext(postId, draft, client);
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
    return { draft, qualityScore };
  }

  return {
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
        const settings = event
          ? await repository.incrementManualApprovals(client)
          : await repository.getSettings(client);
        if (!settings) throw new Error('Content-Agent-Einstellungen fehlen.');
        return { post, event, settings };
      });
    },

    async rejectDraft({ postId, admin, reason, confirmed } = {}) {
      if (confirmed !== true) {
        throw publicationError('CONTENT_CONFIRMATION_REQUIRED', 'Die erforderliche Bestätigung fehlt.');
      }
      const normalizedPostId = positiveDatabaseId(postId, 'postId');
      const normalizedAdmin = normalizeAdmin(admin);
      const normalizedReason = normalizeBoundedText(
        reason,
        'reason',
        MAX_REJECTION_REASON_LENGTH
      );

      return withTransaction(async (client) => {
        const draft = await repository.getDraftWithMetadataForUpdate(normalizedPostId, client);
        assertDraftState(draft, 'CONTENT_DRAFT_NOT_REJECTABLE');
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

    async publishDraftAutomatically() {
      throw publicationError(
        'CONTENT_AUTOPUBLISH_NOT_READY',
        'Die automatische Veröffentlichung wird erst durch die konservative Policy freigeschaltet.'
      );
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
