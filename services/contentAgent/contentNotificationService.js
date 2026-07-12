import pool from '../../util/db.js';
import { sendContentAgentReviewMail } from '../mailService.js';

export const ADMIN_NOTIFICATION_RETRY_DELAYS_MS = Object.freeze([
  300_000,
  900_000,
  3_600_000,
  14_400_000,
  43_200_000
]);

function positiveInteger(value, name) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${name} muss eine positive Ganzzahl sein.`);
  }
  return normalized;
}

function permanentDeliveryError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.retryable = false;
  return error;
}

function smtpErrorCode(error) {
  const code = String(error?.code || 'error')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .slice(0, 100);
  return `smtp_${code || 'error'}`;
}

function retryableSmtpError(error, retryAt) {
  const wrapped = new Error('Die Admin-Prüfmail konnte vorübergehend nicht versendet werden.', { cause: error });
  wrapped.code = 'CONTENT_ADMIN_NOTIFICATION_SMTP_FAILED';
  wrapped.retryable = true;
  wrapped.retryAt = retryAt;
  return wrapped;
}

function canonicalAdminOrigin(value) {
  const candidates = [
    value,
    process.env.CANONICAL_BASE_URL,
    process.env.BASE_URL,
    'https://komplettwebdesign.de'
  ];
  for (const candidate of candidates) {
    try {
      const url = new URL(String(candidate || ''));
      if (url.protocol === 'https:' && !url.username && !url.password) return url.origin;
    } catch {
      // Die nächste kanonische Quelle wird geprüft.
    }
  }
  return 'https://komplettwebdesign.de';
}

async function assertActiveLease(leaseGuard) {
  if (typeof leaseGuard !== 'function') return;
  const active = await leaseGuard();
  if (active === false) {
    const error = new Error('Die Content-Job-Lease wurde verloren.');
    error.code = 'CONTENT_JOB_LEASE_LOST';
    error.retryable = false;
    throw error;
  }
}

function validateDelivery(delivery, deliveryId) {
  if (!delivery) {
    throw permanentDeliveryError('Die Admin-Mailzustellung wurde nicht gefunden.', 'CONTENT_ADMIN_NOTIFICATION_NOT_FOUND');
  }
  if (delivery.notification_type !== 'admin_review') {
    throw permanentDeliveryError('Die Zustellung ist keine Admin-Prüfmail.', 'CONTENT_ADMIN_NOTIFICATION_TYPE_INVALID');
  }
  if (delivery.status === 'sent') return;
  if (delivery.status !== 'queued') {
    throw permanentDeliveryError(
      'Die Admin-Mailzustellung ist nicht versandbereit.',
      'CONTENT_ADMIN_NOTIFICATION_NOT_QUEUED'
    );
  }
  positiveInteger(delivery.post_id, 'delivery.post_id');
  positiveInteger(delivery.payload_json?.reviewVersion, 'delivery.payload_json.reviewVersion');
  if (Number(delivery.payload_json?.postId) !== Number(delivery.post_id)) {
    throw permanentDeliveryError(
      'Der Zustellungssnapshot passt nicht zum Entwurf.',
      'CONTENT_ADMIN_NOTIFICATION_PAYLOAD_INVALID'
    );
  }
  if (Number(delivery.id) !== deliveryId) {
    throw permanentDeliveryError('Die Zustellungs-ID ist inkonsistent.', 'CONTENT_ADMIN_NOTIFICATION_ID_INVALID');
  }
}

export async function sendAdminReviewNotification({ deliveryId, leaseGuard } = {}, {
  database = pool,
  sendReviewMail = sendContentAgentReviewMail,
  now = () => new Date(),
  canonicalBaseUrl = null
} = {}) {
  const normalizedDeliveryId = positiveInteger(deliveryId, 'deliveryId');
  if (!database || typeof database.connect !== 'function') {
    throw new TypeError('Für die Admin-Prüfmail wird eine Datenbankverbindung benötigt.');
  }
  if (typeof sendReviewMail !== 'function') {
    throw new TypeError('Für die Admin-Prüfmail wird ein Mailversand benötigt.');
  }

  const client = await database.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const { rows } = await client.query(
      `
        SELECT *
        FROM content_notification_deliveries
        WHERE id = $1
          AND notification_type = 'admin_review'
        FOR UPDATE
      `,
      [normalizedDeliveryId]
    );
    const delivery = rows[0] || null;
    validateDelivery(delivery, normalizedDeliveryId);
    if (delivery.status === 'sent') {
      await client.query('COMMIT');
      transactionOpen = false;
      return { status: 'completed', deliveryId: normalizedDeliveryId };
    }

    await assertActiveLease(leaseGuard);
    const claimed = await client.query(
      `
        UPDATE content_notification_deliveries
        SET status = 'sending',
            attempts = attempts + 1,
            locked_at = NOW(),
            last_error_code = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'queued'
          AND attempts = $2
        RETURNING *
      `,
      [normalizedDeliveryId, delivery.attempts]
    );
    const sending = claimed.rows[0] || null;
    if (!sending) {
      throw permanentDeliveryError(
        'Die Admin-Mailzustellung wurde gleichzeitig verändert.',
        'CONTENT_ADMIN_NOTIFICATION_CLAIM_LOST'
      );
    }

    const article = {
      id: sending.post_id,
      postId: sending.post_id,
      title: sending.payload_json?.title ?? '',
      shortDescription: sending.payload_json?.shortDescription ?? '',
      imageUrl: sending.payload_json?.imageUrl ?? null,
      qualityScore: sending.payload_json?.qualityScore ?? 0,
      riskSummary: sending.payload_json?.riskSummary ?? null,
      reviewVersion: sending.payload_json?.reviewVersion
    };
    const editorUrl = `${canonicalAdminOrigin(canonicalBaseUrl)}/admin/content-agent/drafts/${sending.post_id}/edit`;
    let mailResult;
    try {
      mailResult = await sendReviewMail({
        to: sending.recipient_email,
        article,
        scheduledAt: sending.payload_json?.scheduledAt || null,
        editorUrl
      });
      if (!mailResult || typeof mailResult !== 'object') {
        throw Object.assign(new Error('Der SMTP-Transport bestätigte den Versand nicht.'), { code: 'ENORESULT' });
      }
    } catch (error) {
      await assertActiveLease(leaseGuard);
      const attemptIndex = Math.min(
        ADMIN_NOTIFICATION_RETRY_DELAYS_MS.length - 1,
        Math.max(0, Number(sending.attempts) - 1)
      );
      const retryAt = new Date(now().getTime() + ADMIN_NOTIFICATION_RETRY_DELAYS_MS[attemptIndex]);
      const retried = await client.query(
        `
          UPDATE content_notification_deliveries
          SET status = CASE WHEN attempts < 5 THEN 'queued' ELSE 'failed' END,
              next_attempt_at = $2,
              locked_at = NULL,
              locked_by = NULL,
              last_error_code = $3,
              updated_at = NOW()
          WHERE id = $1
            AND status = 'sending'
            AND attempts = $4
          RETURNING *
        `,
        [normalizedDeliveryId, retryAt, smtpErrorCode(error), sending.attempts]
      );
      if (!retried.rows[0]) {
        throw permanentDeliveryError(
          'Der SMTP-Fehler konnte nicht lease-sicher gespeichert werden.',
          'CONTENT_ADMIN_NOTIFICATION_RETRY_LOST'
        );
      }
      await client.query('COMMIT');
      transactionOpen = false;
      throw retryableSmtpError(error, retryAt);
    }

    await assertActiveLease(leaseGuard);
    const sentAt = now();
    const completed = await client.query(
      `
        UPDATE content_notification_deliveries
        SET status = 'sent',
            sent_at = $2,
            locked_at = NULL,
            locked_by = NULL,
            last_error_code = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'sending'
          AND attempts = $3
        RETURNING *
      `,
      [normalizedDeliveryId, sentAt, sending.attempts]
    );
    if (!completed.rows[0]) {
      throw permanentDeliveryError(
        'Der bestätigte Mailversand konnte nicht gespeichert werden.',
        'CONTENT_ADMIN_NOTIFICATION_COMPLETE_LOST'
      );
    }
    await client.query('COMMIT');
    transactionOpen = false;
    return { status: 'completed', deliveryId: normalizedDeliveryId };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Der ursprüngliche Fehler bleibt maßgeblich.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
