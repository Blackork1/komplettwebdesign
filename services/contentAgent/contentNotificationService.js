import { randomUUID } from 'node:crypto';
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

function terminalSmtpError(error) {
  const wrapped = new Error('Die Admin-Prüfmail ist nach sechs Zustellversuchen fehlgeschlagen.', { cause: error });
  wrapped.code = 'CONTENT_ADMIN_NOTIFICATION_SMTP_EXHAUSTED';
  wrapped.retryable = false;
  return wrapped;
}

function notDueError(retryAt) {
  const error = new Error('Die Admin-Prüfmail ist noch nicht zur erneuten Zustellung fällig.');
  error.code = 'CONTENT_ADMIN_NOTIFICATION_NOT_DUE';
  error.retryable = true;
  error.doesNotConsumeAttempt = true;
  error.retryAt = retryAt;
  return error;
}

function outcomeUncertainError(cause = null) {
  const error = new Error(
    'Der Ausgang des Mailversands ist unklar und benötigt eine manuelle Prüfung.',
    cause ? { cause } : undefined
  );
  error.code = 'CONTENT_ADMIN_NOTIFICATION_OUTCOME_UNCERTAIN';
  error.retryable = false;
  return error;
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
  if (Number(delivery.id) !== deliveryId) {
    throw permanentDeliveryError('Die Zustellungs-ID ist inkonsistent.', 'CONTENT_ADMIN_NOTIFICATION_ID_INVALID');
  }
  if (delivery.status === 'sent' || delivery.status === 'sending') return;
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
        SELECT *, NOW() AS database_now
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
    if (delivery.status === 'sending') {
      const uncertain = await client.query(
        `
          UPDATE content_notification_deliveries
          SET status = 'failed',
              locked_at = NULL,
              locked_by = NULL,
              last_error_code = $2,
              updated_at = NOW()
          WHERE id = $1
            AND status = 'sending'
          RETURNING *
        `,
        [normalizedDeliveryId, 'outcome_uncertain']
      );
      if (!uncertain.rows[0]) {
        throw permanentDeliveryError(
          'Der unklare Mailausgang konnte nicht gespeichert werden.',
          'CONTENT_ADMIN_NOTIFICATION_OUTCOME_UNCERTAIN_WRITE_LOST'
        );
      }
      await client.query('COMMIT');
      transactionOpen = false;
      throw outcomeUncertainError();
    }

    const databaseNow = new Date(delivery.database_now || now());
    const nextAttemptAt = new Date(delivery.next_attempt_at);
    if (!Number.isNaN(nextAttemptAt.getTime()) && nextAttemptAt.getTime() > databaseNow.getTime()) {
      await client.query('COMMIT');
      transactionOpen = false;
      throw notDueError(nextAttemptAt);
    }

    await assertActiveLease(leaseGuard);
    const deliveryLockId = randomUUID();
    const claimed = await client.query(
      `
        UPDATE content_notification_deliveries
        SET status = 'sending',
            attempts = attempts + 1,
            locked_at = NOW(),
            locked_by = $3,
            last_error_code = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'queued'
          AND attempts = $2
          AND next_attempt_at <= NOW()
        RETURNING *
      `,
      [normalizedDeliveryId, delivery.attempts, deliveryLockId]
    );
    const sending = claimed.rows[0] || null;
    if (!sending) {
      throw permanentDeliveryError(
        'Die Admin-Mailzustellung wurde gleichzeitig verändert.',
        'CONTENT_ADMIN_NOTIFICATION_CLAIM_LOST'
      );
    }

    await client.query('COMMIT');
    transactionOpen = false;

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
      const canRetry = Number(sending.attempts) < 6;
      const attemptIndex = Math.max(0, Number(sending.attempts) - 1);
      const retryAt = canRetry
        ? new Date(now().getTime() + ADMIN_NOTIFICATION_RETRY_DELAYS_MS[attemptIndex])
        : null;
      await client.query('BEGIN');
      transactionOpen = true;
      const retried = await client.query(
        `
          UPDATE content_notification_deliveries
          SET status = CASE WHEN attempts < 6 THEN 'queued' ELSE 'failed' END,
              next_attempt_at = CASE WHEN attempts < 6 THEN $2 ELSE next_attempt_at END,
              locked_at = NULL,
              locked_by = NULL,
              last_error_code = $3,
              updated_at = NOW()
          WHERE id = $1
            AND status = 'sending'
            AND attempts = $4
            AND locked_by = $5
          RETURNING *
        `,
        [normalizedDeliveryId, retryAt, smtpErrorCode(error), sending.attempts, deliveryLockId]
      );
      if (!retried.rows[0]) {
        throw permanentDeliveryError(
          'Der SMTP-Fehler konnte nicht lease-sicher gespeichert werden.',
          'CONTENT_ADMIN_NOTIFICATION_RETRY_LOST'
        );
      }
      await client.query('COMMIT');
      transactionOpen = false;
      throw canRetry ? retryableSmtpError(error, retryAt) : terminalSmtpError(error);
    }

    let sentPersistenceError = null;
    try {
      const sentAt = now();
      await client.query('BEGIN');
      transactionOpen = true;
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
            AND locked_by = $4
          RETURNING *
        `,
        [normalizedDeliveryId, sentAt, sending.attempts, deliveryLockId]
      );
      if (!completed.rows[0]) {
        throw new Error('Der bestätigte Mailversand konnte nicht gespeichert werden.');
      }
      await client.query('COMMIT');
      transactionOpen = false;
    } catch (error) {
      sentPersistenceError = error;
      if (transactionOpen) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Die anschließende Statusabfrage entscheidet den sicheren Ausgang.
        }
        transactionOpen = false;
      }
    }

    if (sentPersistenceError) {
      let reconciledStatus = null;
      try {
        await client.query('BEGIN');
        transactionOpen = true;
        const currentResult = await client.query(
          `
            SELECT status, attempts, locked_by, last_error_code
            FROM content_notification_deliveries
            WHERE id = $1
              AND notification_type = 'admin_review'
            FOR UPDATE
          `,
          [normalizedDeliveryId]
        );
        const current = currentResult.rows[0] || null;
        if (current?.status === 'sent') {
          reconciledStatus = 'sent';
        } else if (current?.status === 'sending') {
          const uncertain = await client.query(
            `
              UPDATE content_notification_deliveries
              SET status = 'failed',
                  locked_at = NULL,
                  locked_by = NULL,
                  last_error_code = $2,
                  updated_at = NOW()
              WHERE id = $1
                AND status = 'sending'
                AND attempts = $3
                AND locked_by = $4
              RETURNING *
            `,
            [normalizedDeliveryId, 'outcome_uncertain', sending.attempts, deliveryLockId]
          );
          if (!uncertain.rows[0]) throw new Error('Der unklare Mailausgang konnte nicht gespeichert werden.');
          reconciledStatus = 'outcome_uncertain';
        } else if (current?.status === 'failed' && current.last_error_code === 'outcome_uncertain') {
          reconciledStatus = 'outcome_uncertain';
        } else {
          throw new Error('Der Mailausgang konnte nicht eindeutig abgeglichen werden.');
        }
        await client.query('COMMIT');
        transactionOpen = false;
      } catch (error) {
        if (transactionOpen) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Der permanente Fehler verhindert jeden automatischen SMTP-Retry.
          }
          transactionOpen = false;
        }
        throw outcomeUncertainError(error);
      }
      if (reconciledStatus === 'sent') {
        return { status: 'completed', deliveryId: normalizedDeliveryId };
      }
      throw outcomeUncertainError(sentPersistenceError);
    }

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
