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
  const normalizedRecipientEmail = typeof recipientEmail === 'string' ? recipientEmail.trim() : '';
  if (!normalizedRecipientEmail) {
    throw new TypeError('recipientEmail wird für die Admin-Benachrichtigung benötigt.');
  }
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
