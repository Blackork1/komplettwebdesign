import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function createDeliveryDatabase(delivery, {
  failCommitNumber = null,
  loseSentUpdate = false
} = {}) {
  let state = structuredClone(delivery);
  let transactionState = null;
  let transactionNumber = 0;
  let pendingCommitFailure = failCommitNumber;
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      queries.push({ sql: normalized, params });
      if (/^BEGIN$/i.test(normalized)) {
        transactionNumber += 1;
        transactionState = structuredClone(state);
        return { rows: [], rowCount: 0 };
      }
      if (/^COMMIT$/i.test(normalized)) {
        if (transactionNumber === pendingCommitFailure) {
          pendingCommitFailure = null;
          throw new Error('COMMIT-Ergebnis unbekannt');
        }
        state = transactionState;
        transactionState = null;
        return { rows: [], rowCount: 0 };
      }
      if (/^ROLLBACK$/i.test(normalized)) {
        transactionState = null;
        return { rows: [], rowCount: 0 };
      }
      const mutableState = transactionState || state;
      if (/SELECT[\s\S]*FROM content_notification_deliveries/i.test(normalized)) {
        return { rows: [structuredClone(mutableState)], rowCount: 1 };
      }
      if (/SET status = 'sending'/i.test(normalized)) {
        mutableState.status = 'sending';
        mutableState.attempts += 1;
        mutableState.locked_by = params.find((value) => typeof value === 'string') || 'delivery-lock';
        return { rows: [structuredClone(mutableState)], rowCount: 1 };
      }
      if (/SET status = 'sent'/i.test(normalized)) {
        if (loseSentUpdate) return { rows: [], rowCount: 0 };
        mutableState.status = 'sent';
        mutableState.sent_at = params.find((value) => value instanceof Date) || new Date();
        mutableState.last_error_code = null;
        mutableState.locked_by = null;
        return { rows: [structuredClone(mutableState)], rowCount: 1 };
      }
      if (/SET status = 'failed'/i.test(normalized)) {
        mutableState.status = 'failed';
        mutableState.last_error_code = params.find((value) => value === 'outcome_uncertain') || null;
        mutableState.locked_by = null;
        return { rows: [structuredClone(mutableState)], rowCount: 1 };
      }
      if (/SET status = CASE/i.test(normalized)) {
        mutableState.status = mutableState.attempts < 6 ? 'queued' : 'failed';
        mutableState.last_error_code = params.find((value) => typeof value === 'string' && value.startsWith('smtp_')) || null;
        if (mutableState.attempts < 6) {
          mutableState.next_attempt_at = params.find((value) => value instanceof Date) || null;
        }
        mutableState.locked_by = null;
        return { rows: [structuredClone(mutableState)], rowCount: 1 };
      }
      throw new Error(`Unerwartetes SQL im Test: ${normalized}`);
    },
    release() {}
  };
  return {
    get state() { return state; },
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
    next_attempt_at: new Date('2026-07-12T09:00:00.000Z'),
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
      title: 'Artikel & <Sicherheit>',
      shortDescription: '<script>alert("x")</script>',
      imageUrl: 'https://cdn.example.test/vorschau.webp?token=geheim#intern',
      qualityScore: 91,
      riskSummary: '<b>Prüfen</b>'
    },
    scheduledAt: '2026-07-13T16:00:00.000Z',
    editorUrl: 'https://cms.example.de/admin/content-agent/drafts/51/edit?session=geheim&token=geheim#intern'
  }, smtp);

  const mail = smtp.sendMail.mock.calls[0].arguments[0];
  assert.equal(mail.to, 'redaktion@example.de');
  assert.equal(mail.subject, 'Neuer Blogartikel zur Prüfung: Artikel & <Sicherheit>');
  assert.match(mail.html, /Komplett Webdesign/);
  assert.match(mail.html, /Artikel &amp; &lt;Sicherheit&gt;/);
  assert.match(mail.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(mail.html, /<script>|<img src=x onerror/i);
  assert.match(mail.html, /src="https:\/\/cdn\.example\.test\/vorschau\.webp"/);
  assert.match(mail.html, /href="https:\/\/cms\.example\.de\/admin\/content-agent\/drafts\/51\/edit"/);
  assert.match(mail.html, /noch nicht öffentlich/i);
  assert.doesNotMatch(mail.html, /session=|token=|geheim|#intern/);
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

test('fünf Wiederholungen warten exakt 5m, 15m, 1h, 4h und 12h; erst Versuch sechs terminiert', async () => {
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
    assert.equal(database.state.status, 'queued');
    assert.equal(database.state.next_attempt_at.getTime(), now.getTime() + expected[attempts]);
  }

  const database = createDeliveryDatabase(queuedDelivery(5));
  await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail: async () => { throw Object.assign(new Error('SMTP weiterhin nicht erreichbar'), { code: 'ECONNECTION' }); },
    now: () => new Date('2026-07-13T10:00:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de'
  }), (error) => error.retryable === false);
  assert.equal(database.state.attempts, 6);
  assert.equal(database.state.status, 'failed');
});

test('eine zu frühe Zustellung sendet nicht und behält next_attempt_at als retryAt bei', async () => {
  const { sendAdminReviewNotification } = await import('../services/contentAgent/contentNotificationService.js');
  const retryAt = new Date('2026-07-12T10:05:00.000Z');
  const database = createDeliveryDatabase({ ...queuedDelivery(), next_attempt_at: retryAt });
  const sendReviewMail = mock.fn(async () => ({ messageId: 'darf-nicht-senden' }));

  await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail,
    now: () => new Date('2026-07-12T10:00:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de'
  }), (error) => {
    assert.equal(error.retryable, true);
    assert.equal(error.doesNotConsumeAttempt, true);
    assert.equal(error.retryAt.getTime(), retryAt.getTime());
    return true;
  });

  assert.equal(sendReviewMail.mock.callCount(), 0);
  assert.equal(database.state.status, 'queued');
  assert.equal(database.state.attempts, 0);
  assert.equal(database.state.next_attempt_at.getTime(), retryAt.getTime());
});

test('unklares sent-COMMIT wird sofort outcome_uncertain und niemals automatisch erneut gesendet', async () => {
  const { sendAdminReviewNotification } = await import('../services/contentAgent/contentNotificationService.js');
  const database = createDeliveryDatabase(queuedDelivery(), { failCommitNumber: 2 });
  const firstSend = mock.fn(async () => {
    assert.equal(database.state.status, 'sending');
    assert.equal(database.queries.at(-1).sql, 'COMMIT');
    return { messageId: 'mail-wurde-an-smtp-übergeben' };
  });

  await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail: firstSend,
    now: () => new Date('2026-07-12T10:00:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de'
  }), (error) => error.retryable === false && error.code === 'CONTENT_ADMIN_NOTIFICATION_OUTCOME_UNCERTAIN');
  assert.equal(firstSend.mock.callCount(), 1);
  assert.equal(database.state.status, 'failed');
  assert.equal(database.state.last_error_code, 'outcome_uncertain');

  const automaticRetry = mock.fn(async () => ({ messageId: 'doppelte-mail' }));
  await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail: automaticRetry,
    now: () => new Date('2026-07-12T10:30:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de'
  }), (error) => error.retryable === false);

  assert.equal(automaticRetry.mock.callCount(), 0);
  assert.equal(database.state.status, 'failed');
  assert.equal(database.state.last_error_code, 'outcome_uncertain');
});

test('nach einem Prozesscrash verbliebenes sending wird ohne SMTP outcome_uncertain', async () => {
  const { sendAdminReviewNotification } = await import('../services/contentAgent/contentNotificationService.js');
  const database = createDeliveryDatabase({
    ...queuedDelivery(1),
    status: 'sending',
    locked_by: 'abgestürzter-worker'
  });
  const sendReviewMail = mock.fn(async () => ({ messageId: 'doppelte-mail' }));

  await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail,
    now: () => new Date('2026-07-12T10:30:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de'
  }), (error) => error.retryable === false && error.code === 'CONTENT_ADMIN_NOTIFICATION_OUTCOME_UNCERTAIN');

  assert.equal(sendReviewMail.mock.callCount(), 0);
  assert.equal(database.state.status, 'failed');
  assert.equal(database.state.last_error_code, 'outcome_uncertain');
});

test('verlorenes markSent wird sofort outcome_uncertain und niemals retrybar', async () => {
  const { sendAdminReviewNotification } = await import('../services/contentAgent/contentNotificationService.js');
  const database = createDeliveryDatabase(queuedDelivery(), { loseSentUpdate: true });
  const sendReviewMail = mock.fn(async () => ({ messageId: 'mail-ist-versendet' }));

  await assert.rejects(() => sendAdminReviewNotification({ deliveryId: 7 }, {
    database,
    sendReviewMail,
    now: () => new Date('2026-07-12T10:00:00.000Z'),
    canonicalBaseUrl: 'https://cms.example.de'
  }), (error) => (
    error.retryable === false
    && error.code === 'CONTENT_ADMIN_NOTIFICATION_OUTCOME_UNCERTAIN'
  ));

  assert.equal(sendReviewMail.mock.callCount(), 1);
  assert.equal(database.state.status, 'failed');
  assert.equal(database.state.last_error_code, 'outcome_uncertain');
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
  assert.equal(leaseChecks, 1);
  const input = sendReviewMail.mock.calls[0].arguments[0];
  assert.equal(input.editorUrl, 'https://cms.example.de/admin/content-agent/drafts/51/edit');
  assert.equal(input.article.reviewVersion, 1);
  assert.doesNotMatch(JSON.stringify(input), /session|token|geheim/i);
  const sendingIndex = database.queries.findIndex(({ sql }) => /SET status = 'sending'/i.test(sql));
  const sentIndex = database.queries.findIndex(({ sql }) => /SET status = 'sent'/i.test(sql));
  assert.ok(sendingIndex >= 0 && sentIndex > sendingIndex);
  assert.equal(database.queries[sendingIndex + 1].sql, 'COMMIT');
  assert.equal(database.queries[sentIndex - 1].sql, 'BEGIN');
});
