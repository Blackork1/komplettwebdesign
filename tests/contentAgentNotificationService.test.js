import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function createDeliveryDatabase(delivery) {
  const state = structuredClone(delivery);
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      queries.push({ sql: normalized, params });
      if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(normalized)) return { rows: [], rowCount: 0 };
      if (/SELECT[\s\S]*FROM content_notification_deliveries/i.test(normalized)) {
        return { rows: [structuredClone(state)], rowCount: 1 };
      }
      if (/SET status = 'sending'/i.test(normalized)) {
        state.status = 'sending';
        state.attempts += 1;
        return { rows: [structuredClone(state)], rowCount: 1 };
      }
      if (/SET status = 'sent'/i.test(normalized)) {
        state.status = 'sent';
        state.sent_at = params.find((value) => value instanceof Date) || new Date();
        state.last_error_code = null;
        return { rows: [structuredClone(state)], rowCount: 1 };
      }
      if (/SET status = CASE/i.test(normalized)) {
        state.status = state.attempts < 5 ? 'queued' : 'failed';
        state.last_error_code = params.find((value) => typeof value === 'string' && value.startsWith('smtp_')) || null;
        state.next_attempt_at = params.find((value) => value instanceof Date) || null;
        return { rows: [structuredClone(state)], rowCount: 1 };
      }
      throw new Error(`Unerwartetes SQL im Test: ${normalized}`);
    },
    release() {}
  };
  return {
    state,
    queries,
    async connect() { return client; }
  };
}

function queuedDelivery(attempts = 0) {
  return {
    id: 7,
    notification_type: 'admin_review',
    post_id: 51,
    recipient_email: 'redaktion@example.de',
    status: 'queued',
    attempts,
    payload_json: {
      postId: 51,
      title: 'Sicherer Entwurf',
      shortDescription: 'Die Kurzbeschreibung',
      imageUrl: 'https://cdn.example.test/article.webp',
      qualityScore: 92,
      riskSummary: { blocked: false, items: [] },
      scheduledAt: '2026-07-13T16:00:00.000Z',
      editorPath: '/admin/content-agent/drafts/51/edit?session=geheim&token=geheim',
      reviewVersion: 1
    }
  };
}

test('sendContentAgentReviewMail rendert maskierte Entwurfsdaten im Brandtemplate', async () => {
  const { sendContentAgentReviewMail } = await import('../services/mailService.js');
  const smtp = { sendMail: mock.fn(async (mail) => ({ messageId: 'mail-1', mail })) };

  await sendContentAgentReviewMail({
    to: 'redaktion@example.de',
    article: {
      id: 51,
      title: '<img src=x onerror=alert(1)>',
      shortDescription: '<script>alert("x")</script>',
      imageUrl: 'https://cdn.example.test/vorschau.webp?format=auto&width=900',
      qualityScore: 91,
      riskSummary: '<b>Prüfen</b>'
    },
    scheduledAt: '2026-07-13T16:00:00.000Z',
    editorUrl: 'https://cms.example.de/admin/content-agent/drafts/51/edit?session=geheim&token=geheim#intern'
  }, smtp);

  const mail = smtp.sendMail.mock.calls[0].arguments[0];
  assert.equal(mail.to, 'redaktion@example.de');
  assert.match(mail.html, /Komplett Webdesign/);
  assert.match(mail.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(mail.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(mail.html, /<script>|<img src=x onerror/i);
  assert.match(mail.html, /src="https:\/\/cdn\.example\.test\/vorschau\.webp\?format=auto&amp;width=900"/);
  assert.match(mail.html, /href="https:\/\/cms\.example\.de\/admin\/content-agent\/drafts\/51\/edit"/);
  assert.doesNotMatch(mail.html, /session=|token=|#intern/);
});

test('sendContentAgentReviewMail verwirft unsichere Bild- und Editor-URLs', async () => {
  const { sendContentAgentReviewMail } = await import('../services/mailService.js');
  const smtp = { sendMail: mock.fn(async (mail) => ({ messageId: 'mail-2', mail })) };

  await sendContentAgentReviewMail({
    to: 'redaktion@example.de',
    article: {
      id: 51,
      title: 'Entwurf',
      shortDescription: 'Beschreibung',
      imageUrl: 'http://cdn.example.test/unsicher.webp'
    },
    scheduledAt: null,
    editorUrl: 'javascript:alert(1)'
  }, smtp);

  const mail = smtp.sendMail.mock.calls[0].arguments[0];
  assert.doesNotMatch(mail.html, /unsicher\.webp|javascript:/i);
  assert.doesNotMatch(mail.html, /<img/i);
  assert.doesNotMatch(mail.html, /href="[^"]*admin\/content-agent/i);
});

test('SMTP failure keeps delivery retryable without changing the post', async () => {
  const { sendAdminReviewNotification } = await import('../services/contentAgent/contentNotificationService.js');
  const database = createDeliveryDatabase(queuedDelivery());
  const smtpError = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
  const sendReviewMail = mock.fn(async () => { throw smtpError; });

  await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail,
    now: () => new Date('2026-07-12T10:00:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de/?session=geheim&token=geheim'
  }), (error) => {
    assert.equal(error.retryable, true);
    assert.equal(error.retryAt.toISOString(), '2026-07-12T10:05:00.000Z');
    return true;
  });

  assert.equal(database.state.status, 'queued');
  assert.equal(database.state.attempts, 1);
  assert.equal(database.queries.some(({ sql }) => /UPDATE posts/i.test(sql)), false);
});

test('already sent delivery does not send twice', async () => {
  const { sendAdminReviewNotification } = await import('../services/contentAgent/contentNotificationService.js');
  const database = createDeliveryDatabase({ ...queuedDelivery(), status: 'sent', attempts: 1 });
  const sendReviewMail = mock.fn(async () => ({ messageId: 'darf-nicht-senden' }));

  const result = await sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail,
    now: () => new Date('2026-07-12T10:00:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de'
  });

  assert.deepEqual(result, { status: 'completed', deliveryId: 7 });
  assert.equal(sendReviewMail.mock.callCount(), 0);
  assert.equal(database.queries.some(({ sql }) => /SET status = 'sending'/i.test(sql)), false);
});

test('alle fünf SMTP-Fehler verwenden exakt 5m, 15m, 1h, 4h und 12h', async () => {
  const {
    ADMIN_NOTIFICATION_RETRY_DELAYS_MS,
    sendAdminReviewNotification
  } = await import('../services/contentAgent/contentNotificationService.js');
  const expected = [300_000, 900_000, 3_600_000, 14_400_000, 43_200_000];
  assert.deepEqual(ADMIN_NOTIFICATION_RETRY_DELAYS_MS, expected);

  for (let attempts = 0; attempts < expected.length; attempts += 1) {
    const database = createDeliveryDatabase(queuedDelivery(attempts));
    const now = new Date('2026-07-12T10:00:00.000Z');
    await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
      database,
      sendReviewMail: async () => { throw Object.assign(new Error('SMTP nicht erreichbar'), { code: 'ECONNECTION' }); },
      now: () => now,
      canonicalBaseUrl: 'https://cms.example.de'
    }), (error) => {
      assert.equal(error.retryable, true);
      assert.equal(error.retryAt.getTime(), now.getTime() + expected[attempts]);
      return true;
    });
    assert.equal(database.state.attempts, attempts + 1);
    assert.equal(database.state.status, attempts < 4 ? 'queued' : 'failed');
  }
});

test('erfolgreicher Versand verwendet die kanonische Admin-URL und setzt erst danach sent', async () => {
  const { sendAdminReviewNotification } = await import('../services/contentAgent/contentNotificationService.js');
  const database = createDeliveryDatabase(queuedDelivery());
  const sendReviewMail = mock.fn(async () => ({ messageId: 'mail-3' }));
  let leaseChecks = 0;

  const result = await sendAdminReviewNotification({
    deliveryId: 7,
    async leaseGuard() { leaseChecks += 1; return true; }
  }, {
    database,
    sendReviewMail,
    now: () => new Date('2026-07-12T10:00:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de/beliebig?session=geheim&token=geheim'
  });

  assert.deepEqual(result, { status: 'completed', deliveryId: 7 });
  assert.equal(database.state.status, 'sent');
  assert.equal(sendReviewMail.mock.callCount(), 1);
  assert.equal(leaseChecks, 2);
  const input = sendReviewMail.mock.calls[0].arguments[0];
  assert.equal(input.editorUrl, 'https://cms.example.de/admin/content-agent/drafts/51/edit');
  assert.equal(input.article.reviewVersion, 1);
  assert.doesNotMatch(JSON.stringify(input), /session|token|geheim/i);
  const sendingIndex = database.queries.findIndex(({ sql }) => /SET status = 'sending'/i.test(sql));
  const sentIndex = database.queries.findIndex(({ sql }) => /SET status = 'sent'/i.test(sql));
  assert.ok(sendingIndex >= 0 && sentIndex > sendingIndex);
});
