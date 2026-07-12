function positiveInteger(value, name) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${name} muss eine positive Ganzzahl sein.`);
  }
  return normalized;
}

function requiredClient(client) {
  if (!client || typeof client.query !== 'function') {
    throw new TypeError('Für die Outbox-Anlage wird ein transaktionaler client benötigt.');
  }
  return client;
}

const DOT_ATOM_LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function normalizeRecipientEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const mailboxParts = email.split('@');
  if (mailboxParts.length !== 2) {
    throw new TypeError('Eine gültige Adminadresse wird für die Benachrichtigung benötigt.');
  }

  const [localPart, domain] = mailboxParts;
  const domainLabels = domain.split('.');
  if (
    localPart.length > 64
    || domain.length > 253
    || !DOT_ATOM_LOCAL_PART.test(localPart)
    || domainLabels.length < 2
    || domainLabels.some((label) => !DOMAIN_LABEL.test(label))
  ) {
    throw new TypeError('Eine gültige Adminadresse wird für die Benachrichtigung benötigt.');
  }
  return email;
}

function boundedAdminReviewPayload(payload, { postId, reviewVersion }) {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  return {
    postId,
    title: source.title ?? '',
    shortDescription: source.shortDescription ?? '',
    imageUrl: source.imageUrl ?? null,
    qualityScore: Number(source.qualityScore) || 0,
    riskSummary: source.riskSummary ?? null,
    scheduledAt: source.scheduledAt ?? null,
    editorPath: source.editorPath ?? `/admin/content-agent/drafts/${postId}/edit`,
    reviewVersion
  };
}

function boundedNewsletterPayload(payload, { postId, publicationVersion }) {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  return {
    postId,
    publicationVersion,
    title: String(source.title ?? '').slice(0, 500),
    shortDescription: String(source.shortDescription ?? '').slice(0, 1_000),
    imageUrl: source.imageUrl ? String(source.imageUrl).slice(0, 2_000) : null,
    slug: String(source.slug ?? '').slice(0, 500)
  };
}

export async function createAdminReviewDelivery({
  postId,
  recipientEmail,
  generationRunId,
  payload,
  client
}) {
  const transactionClient = requiredClient(client);
  const normalizedPostId = positiveInteger(postId, 'postId');
  const normalizedGenerationRunId = positiveInteger(generationRunId, 'generationRunId');
  const reviewVersion = positiveInteger(payload?.reviewVersion, 'payload.reviewVersion');
  const normalizedRecipientEmail = normalizeRecipientEmail(recipientEmail);
  const idempotencyKey = `admin-review:${normalizedGenerationRunId}:${reviewVersion}`;
  const payloadSnapshot = boundedAdminReviewPayload(payload, {
    postId: normalizedPostId,
    reviewVersion
  });

  const { rows } = await transactionClient.query(
    `
      INSERT INTO content_notification_deliveries (
        notification_type,
        post_id,
        recipient_email,
        idempotency_key,
        payload_json
      )
      VALUES ('admin_review', $1, $2, $3, $4)
      ON CONFLICT (idempotency_key) DO UPDATE
      SET idempotency_key = content_notification_deliveries.idempotency_key
      RETURNING *
    `,
    [normalizedPostId, normalizedRecipientEmail, idempotencyKey, payloadSnapshot]
  );

  return rows[0] || null;
}

export async function createNewsletterArticleDelivery({
  postId,
  subscriberId,
  recipientEmail,
  publicationVersion,
  payload,
  client
}) {
  const transactionClient = requiredClient(client);
  const normalizedPostId = positiveInteger(postId, 'postId');
  const normalizedSubscriberId = positiveInteger(subscriberId, 'subscriberId');
  const normalizedPublicationVersion = positiveInteger(publicationVersion, 'publicationVersion');
  const normalizedRecipientEmail = normalizeRecipientEmail(recipientEmail);
  const idempotencyKey = `newsletter-delivery:${normalizedPostId}:${normalizedPublicationVersion}:${normalizedSubscriberId}`;
  const payloadSnapshot = boundedNewsletterPayload(payload, {
    postId: normalizedPostId,
    publicationVersion: normalizedPublicationVersion
  });

  const { rows } = await transactionClient.query(
    `
      INSERT INTO content_notification_deliveries (
        notification_type,
        post_id,
        recipient_id,
        recipient_email,
        idempotency_key,
        payload_json
      )
      VALUES ('newsletter_article', $1, $2, $3, $4, $5)
      ON CONFLICT (idempotency_key) DO UPDATE
      SET idempotency_key = content_notification_deliveries.idempotency_key
      RETURNING *
    `,
    [
      normalizedPostId,
      normalizedSubscriberId,
      normalizedRecipientEmail,
      idempotencyKey,
      payloadSnapshot
    ]
  );

  return rows[0] || null;
}
