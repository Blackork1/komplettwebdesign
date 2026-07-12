import { randomUUID } from 'node:crypto';

import pool from '../../util/db.js';
import { enqueueJob } from '../../repositories/contentJobRepository.js';
import { createNewsletterArticleDelivery } from '../../repositories/contentNotificationRepository.js';
import { sendPublishedBlogNewsletterMail } from '../mailService.js';
import {
  ADMIN_NOTIFICATION_RETRY_DELAYS_MS,
  classifySmtpFailure
} from './contentNotificationService.js';

const MAX_DATABASE_ID = 2_147_483_647;

function permanentError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.retryable = false;
  return error;
}

function positiveDatabaseInteger(value, name) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > MAX_DATABASE_ID) {
    throw permanentError('CONTENT_NEWSLETTER_JOB_PAYLOAD_INVALID', `${name} ist ungültig.`);
  }
  return normalized;
}

function nonNegativeDatabaseInteger(value, name) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw permanentError('CONTENT_NEWSLETTER_JOB_PAYLOAD_INVALID', `${name} ist ungültig.`);
  }
  return normalized;
}

function positiveSafeInteger(value, name) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw permanentError('CONTENT_NEWSLETTER_JOB_PAYLOAD_INVALID', `${name} ist ungültig.`);
  }
  return normalized;
}

function outcomeUncertainError() {
  return permanentError(
    'CONTENT_NEWSLETTER_OUTCOME_UNCERTAIN',
    'Der Ausgang des Newsletter-Versands ist unklar und benötigt eine manuelle Prüfung.'
  );
}

function retryableSmtpError(retryAt) {
  const error = new Error('Der Newsletter konnte vorübergehend nicht versendet werden.');
  error.code = 'CONTENT_NEWSLETTER_SMTP_FAILED';
  error.retryable = true;
  error.retryAt = retryAt;
  return error;
}

function notDueError(retryAt) {
  const error = new Error('Die Newsletter-Zustellung ist noch nicht fällig.');
  error.code = 'CONTENT_NEWSLETTER_NOT_DUE';
  error.retryable = true;
  error.doesNotConsumeAttempt = true;
  error.retryAt = retryAt;
  return error;
}

function safeSmtpCode(error) {
  const code = String(error?.code || 'error')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .slice(0, 80);
  return `smtp_${code || 'error'}`;
}

function requireLeaseGuard(leaseGuard) {
  if (typeof leaseGuard !== 'function') {
    throw permanentError(
      'CONTENT_JOB_LEASE_REQUIRED',
      'Für den Newsletter-Job wird eine aktive Job-Lease benötigt.'
    );
  }
}

async function assertActiveLease(leaseGuard) {
  if (typeof leaseGuard !== 'function') return true;
  const active = await leaseGuard();
  if (active !== true) {
    throw permanentError('CONTENT_JOB_LEASE_LOST', 'Die Content-Job-Lease wurde verloren.');
  }
  return true;
}

async function rollbackQuietly(client) {
  try { await client.query('ROLLBACK'); } catch { /* Der ursprüngliche Fehler bleibt maßgeblich. */ }
}

export async function assertNewsletterActivationAllowed(settings) {
  const approvals = Number(settings?.manual_approvals_count);
  if (!Number.isSafeInteger(approvals) || approvals < 8) {
    throw permanentError(
      'CONTENT_NEWSLETTER_NOT_READY',
      'Newsletter-Benachrichtigungen sind erst nach acht manuellen Veröffentlichungen aktivierbar.'
    );
  }
  return true;
}

function newsletterEnabled(settings) {
  return settings?.newsletter_blog_notifications_enabled === true
    && Number(settings?.manual_approvals_count) >= 8;
}

function safeSubscriberEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 320
      || /[\u0000-\u0020\u007f]/.test(email)
      || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return '';
  return email;
}

function safeUnsubscribeToken(value) {
  const token = String(value || '').trim();
  if (!token || token.length > 512 || /[\u0000-\u001f\u007f]/.test(token)) return '';
  return token;
}

function validatePublishedPost(post, postId, publicationVersion) {
  if (!post
      || Number(post.id) !== postId
      || post.published !== true
      || post.workflow_status !== 'published'
      || Number(post.publication_version) !== publicationVersion + 1) {
    throw permanentError(
      'CONTENT_NEWSLETTER_POST_NOT_PUBLISHED',
      'Der Newsletter darf ausschließlich für die passende veröffentlichte Artikelversion entstehen.'
    );
  }
  return post;
}

export function createBlogNewsletterService({
  database = pool,
  enqueueContentJob = enqueueJob,
  createNewsletterDelivery = createNewsletterArticleDelivery,
  sendNewsletterMail = sendPublishedBlogNewsletterMail,
  now = () => new Date()
} = {}) {
  async function queuePublishedArticleNewsletter({
    postId,
    publicationVersion,
    leaseGuard,
    settings: suppliedSettings = null,
    post: suppliedPost = null
  } = {}, client = null) {
    const normalizedPostId = positiveDatabaseInteger(postId, 'postId');
    const normalizedPublicationVersion = positiveDatabaseInteger(publicationVersion, 'publicationVersion');
    const target = client && typeof client.query === 'function' ? client : database;
    const settings = suppliedSettings || (await target.query(
      'SELECT * FROM content_agent_settings WHERE id = 1'
    )).rows[0];
    if (!newsletterEnabled(settings)) return { status: 'disabled', job: null };
    const post = suppliedPost || (await target.query(
      'SELECT id, published, workflow_status, publication_version FROM posts WHERE id = $1',
      [normalizedPostId]
    )).rows[0];
    validatePublishedPost(post, normalizedPostId, normalizedPublicationVersion);
    await assertActiveLease(leaseGuard);
    const job = await enqueueContentJob({
      jobType: 'send_blog_newsletter',
      idempotencyKey: `newsletter:${normalizedPostId}:${normalizedPublicationVersion}`,
      payload: {
        postId: normalizedPostId,
        publicationVersion: normalizedPublicationVersion,
        cursor: 0
      },
      maxAttempts: 3
    }, target);
    if (!job) throw new Error('Der Newsletter-Job konnte nicht angelegt werden.');
    await assertActiveLease(leaseGuard);
    return { status: 'queued', job };
  }

  async function preparePublishedArticleNewsletter({
    postId,
    publicationVersion,
    cursor = 0,
    leaseGuard
  } = {}) {
    const normalizedPostId = positiveDatabaseInteger(postId, 'postId');
    const normalizedPublicationVersion = positiveDatabaseInteger(publicationVersion, 'publicationVersion');
    const normalizedCursor = nonNegativeDatabaseInteger(cursor, 'cursor');
    requireLeaseGuard(leaseGuard);
    await assertActiveLease(leaseGuard);
    const client = await database.connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const settings = (await client.query(
        'SELECT * FROM content_agent_settings WHERE id = 1'
      )).rows[0];
      if (!newsletterEnabled(settings)) {
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
        return { status: 'disabled', queued: 0, cursor: normalizedCursor };
      }
      const post = (await client.query(
        `
          SELECT id, title, excerpt, image_url, slug,
                 published, workflow_status, publication_version
          FROM posts
          WHERE id = $1
        `,
        [normalizedPostId]
      )).rows[0];
      validatePublishedPost(post, normalizedPostId, normalizedPublicationVersion);
      const { rows: subscribers } = await client.query(
        `
          SELECT id, email
          FROM newsletter_signups
          WHERE id > $1
            AND active = TRUE
            AND NULLIF(BTRIM(unsubscribe_token), '') IS NOT NULL
          ORDER BY id
          LIMIT 50
        `,
        [normalizedCursor]
      );
      const payload = {
        postId: normalizedPostId,
        publicationVersion: normalizedPublicationVersion,
        title: post.title,
        shortDescription: post.excerpt,
        imageUrl: post.image_url,
        slug: post.slug
      };
      for (const subscriber of subscribers) {
        await assertActiveLease(leaseGuard);
        const delivery = await createNewsletterDelivery({
          postId: normalizedPostId,
          subscriberId: subscriber.id,
          recipientEmail: subscriber.email,
          publicationVersion: normalizedPublicationVersion,
          idempotencyKey: `newsletter-delivery:${normalizedPostId}:${normalizedPublicationVersion}:${subscriber.id}`,
          payload,
          client
        });
        if (!delivery?.id) throw new Error('Newsletter-Outbox konnte nicht angelegt werden.');
        const childJob = await enqueueContentJob({
          jobType: 'send_blog_newsletter_delivery',
          idempotencyKey: `newsletter-delivery:${normalizedPostId}:${normalizedPublicationVersion}:${subscriber.id}`,
          payload: { deliveryId: Number(delivery.id) },
          maxAttempts: 6
        }, client);
        if (!childJob) throw new Error('Newsletter-Zustelljob konnte nicht angelegt werden.');
      }
      let nextCursor = normalizedCursor;
      if (subscribers.length > 0) nextCursor = Number(subscribers.at(-1).id);
      if (subscribers.length === 50) {
        const continuation = await enqueueContentJob({
          jobType: 'send_blog_newsletter',
          idempotencyKey: `newsletter-batch:${normalizedPostId}:${normalizedPublicationVersion}:${nextCursor}`,
          payload: {
            postId: normalizedPostId,
            publicationVersion: normalizedPublicationVersion,
            cursor: nextCursor
          },
          maxAttempts: 3
        }, client);
        if (!continuation) throw new Error('Newsletter-Fortsetzung konnte nicht angelegt werden.');
      }
      await assertActiveLease(leaseGuard);
      await client.query('COMMIT');
      transactionOpen = false;
      return { status: 'prepared', queued: subscribers.length, cursor: nextCursor };
    } catch (error) {
      if (transactionOpen) await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async function sendNewsletterDelivery({ deliveryId, leaseGuard } = {}) {
    const normalizedDeliveryId = positiveSafeInteger(deliveryId, 'deliveryId');
    requireLeaseGuard(leaseGuard);
    await assertActiveLease(leaseGuard);
    const client = await database.connect();
    let transactionOpen = false;
    let sending = null;
    let deliveryLockId = null;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const delivery = (await client.query(
        `
          SELECT *, NOW() AS database_now
          FROM content_notification_deliveries
          WHERE id = $1 AND notification_type = 'newsletter_article'
          FOR UPDATE
        `,
        [normalizedDeliveryId]
      )).rows[0];
      if (!delivery || Number(delivery.id) !== normalizedDeliveryId) {
        throw permanentError('CONTENT_NEWSLETTER_DELIVERY_NOT_FOUND', 'Newsletter-Zustellung nicht gefunden.');
      }
      const deliveryPostId = positiveDatabaseInteger(delivery.post_id, 'delivery.post_id');
      const recipientId = positiveSafeInteger(delivery.recipient_id, 'delivery.recipient_id');
      const deliveryPublicationVersion = positiveDatabaseInteger(
        delivery.payload_json?.publicationVersion,
        'delivery.payload_json.publicationVersion'
      );
      if (Number(delivery.payload_json?.postId) !== deliveryPostId
          || deliveryPublicationVersion < 1) {
        throw permanentError(
          'CONTENT_NEWSLETTER_DELIVERY_PAYLOAD_INVALID',
          'Der Newsletter-Snapshot passt nicht zur Zustellung.'
        );
      }
      if (delivery.status === 'sent') {
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
        return { status: 'completed', deliveryId: normalizedDeliveryId };
      }
      if (delivery.status === 'cancelled') {
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
        return { status: 'cancelled', deliveryId: normalizedDeliveryId };
      }
      if (delivery.status === 'sending') {
        await client.query(
          `
            UPDATE content_notification_deliveries
            SET status = 'failed', locked_at = NULL, locked_by = NULL,
                last_error_code = 'outcome_uncertain', updated_at = NOW()
            WHERE id = $1 AND status = 'sending'
            RETURNING *
          `,
          [normalizedDeliveryId]
        );
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
        throw outcomeUncertainError();
      }
      if (delivery.status !== 'queued') {
        throw permanentError(
          'CONTENT_NEWSLETTER_DELIVERY_NOT_QUEUED',
          'Newsletter-Zustellung ist nicht versandbereit.'
        );
      }
      const databaseNow = new Date(delivery.database_now || now());
      const nextAttemptAt = new Date(delivery.next_attempt_at);
      if (!Number.isNaN(nextAttemptAt.getTime()) && nextAttemptAt > databaseNow) {
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
        throw notDueError(nextAttemptAt);
      }
      const subscriber = (await client.query(
        `
          SELECT id, email, active, unsubscribe_token
          FROM newsletter_signups
          WHERE id = $1
          FOR UPDATE
        `,
        [recipientId]
      )).rows[0];
      const token = safeUnsubscribeToken(subscriber?.unsubscribe_token);
      const subscriberEmail = safeSubscriberEmail(subscriber?.email);
      if (!subscriber
          || subscriber.active !== true
          || !token
          || subscriberEmail !== String(delivery.recipient_email || '').trim().toLowerCase()) {
        await client.query(
          `
            UPDATE content_notification_deliveries
            SET status = 'cancelled', locked_at = NULL, locked_by = NULL,
                last_error_code = 'subscriber_inactive', updated_at = NOW()
            WHERE id = $1 AND status = 'queued'
            RETURNING *
          `,
          [normalizedDeliveryId]
        );
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
        return { status: 'cancelled', deliveryId: normalizedDeliveryId };
      }
      await assertActiveLease(leaseGuard);
      deliveryLockId = randomUUID();
      sending = (await client.query(
        `
          UPDATE content_notification_deliveries
          SET status = 'sending', attempts = attempts + 1, locked_at = NOW(),
              locked_by = $3, last_error_code = NULL, updated_at = NOW()
          WHERE id = $1 AND status = 'queued' AND attempts = $2
          RETURNING *
        `,
        [normalizedDeliveryId, delivery.attempts, deliveryLockId]
      )).rows[0];
      if (!sending) {
        throw permanentError('CONTENT_NEWSLETTER_CLAIM_LOST', 'Newsletter-Zustellung wurde gleichzeitig verändert.');
      }
      await assertActiveLease(leaseGuard);
      await client.query('COMMIT');
      transactionOpen = false;

      try {
        const result = await sendNewsletterMail({
          to: subscriberEmail,
          unsubscribeToken: token,
          post: {
            title: sending.payload_json?.title,
            shortDescription: sending.payload_json?.shortDescription,
            imageUrl: sending.payload_json?.imageUrl,
            slug: sending.payload_json?.slug
          }
        });
        if (!result || typeof result !== 'object') {
          throw Object.assign(new Error('Der SMTP-Transport bestätigte den Versand nicht.'), { code: 'ENORESULT' });
        }
      } catch (error) {
        const classification = classifySmtpFailure(error);
        const canRetry = classification === 'retryable' && Number(sending.attempts) < 6;
        const attemptIndex = Math.max(0, Number(sending.attempts) - 1);
        const retryDelayMs = canRetry ? ADMIN_NOTIFICATION_RETRY_DELAYS_MS[attemptIndex] : null;
        const persistedCode = classification === 'outcome_uncertain'
          ? 'outcome_uncertain'
          : classification === 'smtp_rejected' ? 'smtp_rejected' : safeSmtpCode(error);
        await client.query('BEGIN');
        transactionOpen = true;
        const persisted = (await client.query(
          `
            UPDATE content_notification_deliveries
            SET status = CASE WHEN $3::boolean THEN 'queued' ELSE 'failed' END,
                next_attempt_at = CASE
                  WHEN $3::boolean THEN NOW() + ($2 * INTERVAL '1 millisecond')
                  ELSE next_attempt_at
                END,
                locked_at = NULL, locked_by = NULL, last_error_code = $4, updated_at = NOW()
            WHERE id = $1 AND status = 'sending' AND attempts = $5 AND locked_by = $6
            RETURNING *
          `,
          [normalizedDeliveryId, retryDelayMs, canRetry, persistedCode, sending.attempts, deliveryLockId]
        )).rows[0];
        if (!persisted) throw outcomeUncertainError();
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
        if (classification === 'outcome_uncertain') throw outcomeUncertainError();
        if (!canRetry) {
          throw permanentError(
            classification === 'smtp_rejected'
              ? 'CONTENT_NEWSLETTER_SMTP_REJECTED'
              : 'CONTENT_NEWSLETTER_SMTP_EXHAUSTED',
            'Die Newsletter-Zustellung ist dauerhaft fehlgeschlagen.'
          );
        }
        const retryAt = new Date(persisted.next_attempt_at);
        if (Number.isNaN(retryAt.getTime())) {
          throw permanentError('CONTENT_NEWSLETTER_RETRY_AT_INVALID', 'Newsletter-Retrytermin ist ungültig.');
        }
        throw retryableSmtpError(retryAt);
      }

      let sentPersistenceError = null;
      try {
        await client.query('BEGIN');
        transactionOpen = true;
        const completed = (await client.query(
          `
            UPDATE content_notification_deliveries
            SET status = 'sent', sent_at = $2, locked_at = NULL, locked_by = NULL,
                last_error_code = NULL, updated_at = NOW()
            WHERE id = $1 AND status = 'sending' AND attempts = $3 AND locked_by = $4
            RETURNING *
          `,
          [normalizedDeliveryId, now(), sending.attempts, deliveryLockId]
        )).rows[0];
        if (!completed) throw new Error('Der bestätigte Newsletter-Versand konnte nicht gespeichert werden.');
        await assertActiveLease(leaseGuard);
        await client.query('COMMIT');
        transactionOpen = false;
      } catch (error) {
        sentPersistenceError = error;
        if (transactionOpen) await rollbackQuietly(client);
        transactionOpen = false;
      }
      if (sentPersistenceError) {
        try {
          await client.query('BEGIN');
          transactionOpen = true;
          const current = (await client.query(
            `
              SELECT status, attempts, locked_by, last_error_code
              FROM content_notification_deliveries
              WHERE id = $1 AND notification_type = 'newsletter_article'
              FOR UPDATE
            `,
            [normalizedDeliveryId]
          )).rows[0];
          if (current?.status !== 'sent') {
            const uncertain = (await client.query(
              `
                UPDATE content_notification_deliveries
                SET status = 'failed', locked_at = NULL, locked_by = NULL,
                    last_error_code = 'outcome_uncertain', updated_at = NOW()
                WHERE id = $1 AND status = 'sending' AND attempts = $2 AND locked_by = $3
                RETURNING *
              `,
              [normalizedDeliveryId, sending.attempts, deliveryLockId]
            )).rows[0];
            if (!uncertain && current?.last_error_code !== 'outcome_uncertain') {
              throw new Error('Der Newsletter-Ausgang konnte nicht eindeutig abgeglichen werden.');
            }
          }
          await client.query('COMMIT');
          transactionOpen = false;
          if (current?.status === 'sent') {
            return { status: 'completed', deliveryId: normalizedDeliveryId };
          }
        } catch {
          if (transactionOpen) await rollbackQuietly(client);
          transactionOpen = false;
        }
        throw outcomeUncertainError();
      }
      return { status: 'completed', deliveryId: normalizedDeliveryId };
    } catch (error) {
      if (transactionOpen) await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    queuePublishedArticleNewsletter,
    preparePublishedArticleNewsletter,
    sendNewsletterDelivery
  };
}

const defaultService = createBlogNewsletterService();

export function queuePublishedArticleNewsletter(input, client) {
  return defaultService.queuePublishedArticleNewsletter(input, client);
}

export function preparePublishedArticleNewsletter(input) {
  return defaultService.preparePublishedArticleNewsletter(input);
}

export function sendNewsletterDelivery(input) {
  return defaultService.sendNewsletterDelivery(input);
}
