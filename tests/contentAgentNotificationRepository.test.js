import test from 'node:test';
import assert from 'node:assert/strict';

test('createAdminReviewDelivery legt eine idempotente Admin-Outboxzeile mit positiver Reviewversion an', async () => {
  const { createAdminReviewDelivery } = await import('../repositories/contentNotificationRepository.js');
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [{ id: 91, post_id: 51, payload_json: params[3] }] };
    }
  };
  const payload = {
    postId: 51,
    title: 'Atomarer Entwurf',
    shortDescription: 'Kurzbeschreibung',
    imageUrl: 'https://cdn.example.test/article.webp',
    qualityScore: 92,
    riskSummary: { blocked: false, items: [] },
    scheduledAt: '2026-07-13T16:00:00.000Z',
    editorPath: '/admin/content-agent/drafts/51/edit',
    reviewVersion: 1
  };

  const row = await createAdminReviewDelivery({
    postId: 51,
    recipientEmail: 'redaktion@example.de',
    generationRunId: 17,
    payload,
    client
  });

  assert.equal(row.id, 91);
  assert.match(calls[0].sql, /INSERT INTO content_notification_deliveries/i);
  assert.match(calls[0].sql, /notification_type/i);
  assert.match(calls[0].sql, /ON CONFLICT \(idempotency_key\)/i);
  assert.deepEqual(calls[0].params, [
    51,
    'redaktion@example.de',
    'admin-review:17:1',
    payload
  ]);
});

test('createAdminReviewDelivery lehnt fehlende Clients und nicht positive Reviewversionen vor dem Schreiben ab', async () => {
  const { createAdminReviewDelivery } = await import('../repositories/contentNotificationRepository.js');
  const valid = {
    postId: 51,
    recipientEmail: 'redaktion@example.de',
    generationRunId: 17,
    payload: { reviewVersion: 1 }
  };

  await assert.rejects(createAdminReviewDelivery(valid), /client/i);
  await assert.rejects(createAdminReviewDelivery({
    ...valid,
    payload: { reviewVersion: 0 },
    client: { async query() { assert.fail('Darf nicht schreiben.'); } }
  }), /reviewVersion/i);
});
