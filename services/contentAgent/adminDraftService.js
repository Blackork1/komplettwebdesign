import pool from '../../util/db.js';
import { CONTENT_AGENT_LINKS } from '../../data/contentAgentLinks.js';
import { FaqItemSchema } from './articleSchemas.js';
import { validateArticle as validateArticleDefault } from './articleValidator.js';

const MAX_CONTENT_LENGTH = 250_000;
export const ADMIN_EDIT_HISTORY_LIMIT = 50;
const EDITABLE_FIELDS = Object.freeze([
  'title',
  'shortDescription',
  'slug',
  'metaTitle',
  'metaDescription',
  'ogTitle',
  'ogDescription',
  'imageAlt',
  'faqJson',
  'contentHtml'
]);

function draftError(code, message, issues = []) {
  return Object.assign(new Error(message), { code, issues });
}

function positivePostId(value) {
  const postId = Number(value);
  if (!Number.isSafeInteger(postId) || postId < 1) {
    throw draftError('CONTENT_ACTION_VALIDATION_FAILED', 'Die Entwurfs-ID ist ungültig.');
  }
  return postId;
}

function requireConfirmation(confirmed) {
  if (confirmed !== true) {
    throw draftError('CONTENT_CONFIRMATION_REQUIRED', 'Die erforderliche Bestätigung fehlt.');
  }
}

function isEditableDraft(record) {
  const post = record?.post;
  return Boolean(
    post
    && post.generated_by_ai === true
    && post.published === false
    && post.content_format === 'static_html'
  );
}

function requiredText(value, field, maxLength) {
  const normalized = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  if (!normalized || normalized.length > maxLength) {
    throw draftError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der Entwurf enthält ungültige Felder.',
      [{ code: `${field}_invalid`, field, message: `${field} ist erforderlich und darf höchstens ${maxLength} Zeichen lang sein.` }]
    );
  }
  return normalized;
}

function normalizeAdmin(admin) {
  const id = Number(admin?.id);
  const normalizedUsername = String(admin?.username || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const username = [...normalizedUsername].slice(0, 255).join('');
  if (!Number.isSafeInteger(id) || id < 1 || !username) {
    throw draftError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Die Admin-Auditdaten sind unvollständig.',
      [{ code: 'admin_invalid', field: 'admin' }]
    );
  }
  return { id, username };
}

export function capAdminEditHistory(existingHistory, currentEntry) {
  const existing = Array.isArray(existingHistory) ? existingHistory : [];
  return [...existing.slice(-(ADMIN_EDIT_HISTORY_LIMIT - 1)), currentEntry];
}

function parseFaqJson(value) {
  try {
    const parsed = Array.isArray(value) ? value : JSON.parse(String(value ?? '[]'));
    return FaqItemSchema.array().min(5).max(7).parse(parsed);
  } catch {
    throw draftError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Die FAQ-Daten sind kein gültiges JSON mit fünf bis sieben Fragen.',
      [{ code: 'faq_json_invalid', field: 'faqJson' }]
    );
  }
}

function normalizeDraftInput(input = {}) {
  const contentHtml = String(input.contentHtml ?? '').replace(/\r\n?/g, '\n');
  if (!contentHtml.trim() || contentHtml.length > MAX_CONTENT_LENGTH) {
    throw draftError(
      'CONTENT_DRAFT_VALIDATION_FAILED',
      'Der Artikelinhalt ist leer oder zu lang.',
      [{ code: 'content_html_invalid', field: 'contentHtml' }]
    );
  }
  return {
    title: requiredText(input.title, 'title', 255),
    shortDescription: requiredText(input.shortDescription, 'shortDescription', 500),
    slug: requiredText(input.slug, 'slug', 255),
    metaTitle: requiredText(input.metaTitle, 'metaTitle', 255),
    metaDescription: requiredText(input.metaDescription, 'metaDescription', 500),
    ogTitle: requiredText(input.ogTitle, 'ogTitle', 255),
    ogDescription: requiredText(input.ogDescription, 'ogDescription', 500),
    imageAlt: requiredText(input.imageAlt, 'imageAlt', 500),
    faqJson: parseFaqJson(input.faqJson),
    contentHtml
  };
}

function splitDraftRow(row) {
  if (!row) return null;
  const { metadata, notification, ...post } = row;
  return { post, metadata: metadata || null, notification: notification || null };
}

export function deriveDraftReviewActions(post = {}, notification = null, now = new Date()) {
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const scheduledTime = new Date(post.scheduled_at).getTime();
  const hasSchedule = post.scheduled_at !== null
    && post.scheduled_at !== undefined
    && post.scheduled_at !== ''
    && !Number.isNaN(scheduledTime);
  const isFuture = hasSchedule && scheduledTime > currentTime;
  const isMissed = hasSchedule && scheduledTime < currentTime;
  const needsReview = post.workflow_status === 'needs_review' && post.published === false;
  const approved = post.workflow_status === 'approved_scheduled' && post.published === false;
  return {
    canApproveScheduled: needsReview && isFuture,
    canPublishNow: needsReview && isMissed,
    canReschedule: (needsReview && (isFuture || isMissed)) || approved,
    canRetryNotification: isAdminNotificationManuallyRetryable(notification)
  };
}

export function isAdminNotificationManuallyRetryable(notification) {
  const errorCode = String(notification?.last_error_code || '');
  return notification?.status === 'failed'
    && Number(notification?.attempts) === 6
    && /^smtp_[a-z0-9_]+$/.test(errorCode)
    && errorCode !== 'smtp_rejected'
    && !errorCode.includes('uncertain');
}

export function createAdminDraftRepository(db = pool) {
  return {
    async getDraftWithMetadata(postId) {
      const { rows } = await db.query(`
        SELECT p.*, to_jsonb(m) AS metadata, to_jsonb(notification) AS notification
        FROM posts p
        LEFT JOIN content_post_metadata m ON m.post_id = p.id
        LEFT JOIN LATERAL (
          SELECT delivery.id, delivery.status, delivery.attempts,
                 delivery.last_error_code, delivery.updated_at
          FROM content_notification_deliveries delivery
          WHERE delivery.post_id = p.id
            AND delivery.notification_type = 'admin_review'
          ORDER BY delivery.created_at DESC, delivery.id DESC
          LIMIT 1
        ) notification ON TRUE
        WHERE p.id = $1
          AND p.generated_by_ai = TRUE
          AND p.published = FALSE
          AND p.content_format = 'static_html'
        LIMIT 1
      `, [postId]);
      return splitDraftRow(rows[0]);
    },

    async getValidationContext(postId, current) {
      const { rows } = await db.query(
        'SELECT slug FROM posts WHERE id <> $1 ORDER BY id',
        [postId]
      );
      const metadata = current?.metadata || {};
      return {
        existingSlugs: rows.map(({ slug }) => slug).filter(Boolean),
        allowedInternalLinks: metadata.internal_links_json?.length
          ? metadata.internal_links_json
          : CONTENT_AGENT_LINKS,
        sourceReferences: Array.isArray(metadata.source_references_json)
          ? metadata.source_references_json
          : []
      };
    },

    async updateDraftTransaction({ postId, article, admin }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const locked = await client.query(`
          SELECT id
          FROM posts
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
          FOR UPDATE
        `, [postId]);
        if (!locked.rows[0]) {
          throw draftError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        const duplicate = await client.query(
          'SELECT id FROM posts WHERE slug = $1 AND id <> $2 LIMIT 1',
          [article.slug, postId]
        );
        if (duplicate.rows[0]) {
          throw draftError(
            'CONTENT_DRAFT_VALIDATION_FAILED',
            'Der Slug ist bereits vorhanden.',
            [{ code: 'slug_duplicate', field: 'slug' }]
          );
        }

        const postResult = await client.query(`
          UPDATE posts
          SET title = $2,
              excerpt = $3,
              slug = $4,
              meta_title = $5,
              meta_description = $6,
              og_title = $7,
              og_description = $8,
              image_alt = $9,
              faq_json = $10::jsonb,
              content = $11,
              review_version = review_version + 1,
              workflow_status = 'needs_review',
              approved_review_version = NULL,
              approved_at = NULL,
              approved_by_admin_id = NULL,
              updated_at = NOW()
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
          RETURNING *
        `, [
          postId,
          article.title,
          article.shortDescription,
          article.slug,
          article.metaTitle,
          article.metaDescription,
          article.ogTitle,
          article.ogDescription,
          article.imageAlt,
          JSON.stringify(article.faqJson),
          article.contentHtml
        ]);
        if (!postResult.rows[0]) {
          throw draftError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }

        const audit = JSON.stringify({
          adminId: admin.id,
          adminUsername: admin.username,
          changedFields: EDITABLE_FIELDS,
          editedAt: new Date().toISOString()
        });
        const metadataResult = await client.query(`
          UPDATE content_post_metadata
          SET generation_metadata_json = jsonb_set(
                COALESCE(generation_metadata_json, '{}'::jsonb)
                  || jsonb_build_object('lastAdminEdit', $2::jsonb),
                '{adminEditHistory}',
                COALESCE((
                  SELECT jsonb_agg(history.entries -> positions.position ORDER BY positions.position)
                  FROM LATERAL (
                    SELECT CASE
                      WHEN jsonb_typeof(COALESCE(
                        generation_metadata_json -> 'adminEditHistory',
                        '[]'::jsonb
                      )) = 'array'
                        THEN COALESCE(
                          generation_metadata_json -> 'adminEditHistory',
                          '[]'::jsonb
                        )
                      ELSE '[]'::jsonb
                    END AS entries
                  ) AS history
                  CROSS JOIN LATERAL generate_series(
                    GREATEST(jsonb_array_length(history.entries) - ($3::integer - 1), 0),
                    jsonb_array_length(history.entries) - 1
                  ) AS positions(position)
                ), '[]'::jsonb) || jsonb_build_array($2::jsonb),
                true
              ),
              updated_at = NOW()
          WHERE post_id = $1
          RETURNING *
        `, [postId, audit, ADMIN_EDIT_HISTORY_LIMIT]);
        if (!metadataResult.rows[0]) {
          throw draftError('CONTENT_DRAFT_NOT_FOUND', 'Metadaten des KI-Entwurfs fehlen.');
        }
        await client.query('COMMIT');
        return { post: postResult.rows[0], metadata: metadataResult.rows[0] };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async retryAdminReviewNotificationTransaction({ postId }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(`
          WITH candidate_delivery AS (
            SELECT delivery.id
            FROM content_notification_deliveries delivery
            WHERE delivery.post_id = $1
              AND delivery.notification_type = 'admin_review'
            ORDER BY delivery.created_at DESC, delivery.id DESC
            FOR UPDATE
            LIMIT 1
          ), reset_delivery AS (
            UPDATE content_notification_deliveries delivery
            SET status = 'queued',
                attempts = 0,
                next_attempt_at = NOW(),
                locked_at = NULL,
                locked_by = NULL,
                last_error_code = NULL,
                sent_at = NULL,
                updated_at = NOW()
            FROM candidate_delivery candidate
            WHERE delivery.id = candidate.id
              AND delivery.status = 'failed'
              AND delivery.attempts = 6
              AND delivery.last_error_code ~ '^smtp_[a-z0-9_]+$'
              AND delivery.last_error_code <> 'smtp_rejected'
              AND delivery.last_error_code NOT LIKE '%uncertain%'
            RETURNING delivery.id
          ), reset_job AS (
            UPDATE content_jobs job
            SET status = 'queued',
                attempts = 0,
                max_attempts = GREATEST(max_attempts, 6),
                run_after = NOW(),
                locked_at = NULL,
                locked_by = NULL,
                last_error = NULL,
                finished_at = NULL,
                updated_at = NOW()
            FROM reset_delivery delivery
            WHERE job.job_type = 'send_admin_review_notification'
              AND job.payload_json ->> 'deliveryId' = delivery.id::text
              AND job.payload_json ->> 'postId' = $1::text
              AND job.status IN ('failed', 'needs_manual_attention')
            RETURNING job.*, delivery.id AS delivery_id
          )
          SELECT * FROM reset_job
        `, [postId]);
        if (!rows[0]) {
          throw draftError(
            'CONTENT_DRAFT_NOTIFICATION_NOT_RETRYABLE',
            'Für diesen Entwurf gibt es keine fehlgeschlagene Admin-Benachrichtigung.'
          );
        }
        await client.query('COMMIT');
        return rows[0];
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

export function createAdminDraftService({
  repository = createAdminDraftRepository(),
  validateArticle = validateArticleDefault,
  now = () => new Date()
} = {}) {
  return {
    async getDraftForReview(postId) {
      const current = await repository.getDraftWithMetadata(postId);
      if (!isEditableDraft(current)) {
        throw draftError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
      }
      const { post, metadata = {}, notification = null } = current;
      return {
        post,
        metadata,
        notification,
        id: post.id,
        title: post.title || '',
        shortDescription: post.excerpt || '',
        slug: post.slug || '',
        metaTitle: post.meta_title || '',
        metaDescription: post.meta_description || '',
        ogTitle: post.og_title || '',
        ogDescription: post.og_description || '',
        imageAlt: post.image_alt || '',
        faqJsonText: JSON.stringify(Array.isArray(post.faq_json) ? post.faq_json : [], null, 2),
        contentHtml: post.content || '',
        riskReview: metadata.quality_report_json?.focusedReview || null,
        actions: deriveDraftReviewActions(post, notification, now())
      };
    },

    async updateDraft({ postId, input, admin }) {
      const current = await repository.getDraftWithMetadata(postId);
      if (!isEditableDraft(current)) {
        throw draftError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
      }
      const normalizedAdmin = normalizeAdmin(admin);
      const article = normalizeDraftInput(input);
      const context = await repository.getValidationContext(postId, current);
      const validation = validateArticle(article, context);
      if (validation?.passed !== true || typeof validation?.sanitizedHtml !== 'string') {
        throw draftError(
          'CONTENT_DRAFT_VALIDATION_FAILED',
          'Der Entwurf enthält ungültige Felder.',
          Array.isArray(validation?.issues) ? validation.issues : []
        );
      }
      return repository.updateDraftTransaction({
        postId,
        article: { ...article, contentHtml: validation.sanitizedHtml },
        admin: normalizedAdmin
      });
    },

    async retryAdminReviewNotification({ postId, confirmed }) {
      requireConfirmation(confirmed);
      const normalizedPostId = positivePostId(postId);
      const current = await repository.getDraftWithMetadata(normalizedPostId);
      if (!isEditableDraft(current)
          || !isAdminNotificationManuallyRetryable(current.notification)) {
        throw draftError(
          'CONTENT_DRAFT_NOTIFICATION_NOT_RETRYABLE',
          'Für diesen Entwurf gibt es keine eindeutig wiederholbare Admin-Benachrichtigung.'
        );
      }
      return repository.retryAdminReviewNotificationTransaction({
        postId: normalizedPostId
      });
    }
  };
}

const defaultService = createAdminDraftService();
export const getDraftForReview = defaultService.getDraftForReview;
export const updateDraft = defaultService.updateDraft;
export const retryAdminReviewNotification = defaultService.retryAdminReviewNotification;
