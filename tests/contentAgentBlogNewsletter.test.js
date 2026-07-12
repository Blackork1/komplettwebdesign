import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function createBatchDatabase({ settings, post, subscribers }) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      queries.push({ sql: normalized, params });
      if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(normalized)) return { rows: [], rowCount: 0 };
      if (/FROM content_agent_settings/i.test(normalized)) return { rows: [structuredClone(settings)] };
      if (/FROM posts/i.test(normalized)) return { rows: [structuredClone(post)] };
      if (/FROM newsletter_signups/i.test(normalized)) {
        const cursor = Number(params[0] || 0);
        return {
          rows: subscribers
            .filter((subscriber) => subscriber.id > cursor)
            .slice(0, 50)
            .map((subscriber) => structuredClone(subscriber))
        };
      }
      throw new Error(`Unerwartetes SQL im Batchtest: ${normalized}`);
    },
    release() {}
  };
  return {
    queries,
    async connect() { return client; }
  };
}

function createDeliveryDatabase({ delivery, subscriber, failSentCommit = false }) {
  let state = structuredClone(delivery);
  let transaction = null;
  let commits = 0;
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      queries.push({ sql: normalized, params });
      if (/^BEGIN$/i.test(normalized)) {
        transaction = structuredClone(state);
        return { rows: [] };
      }
      if (/^COMMIT$/i.test(normalized)) {
        commits += 1;
        if (failSentCommit && commits === 2) throw new Error('COMMIT-Ergebnis unbekannt');
        state = transaction;
        transaction = null;
        return { rows: [] };
      }
      if (/^ROLLBACK$/i.test(normalized)) {
        transaction = null;
        return { rows: [] };
      }
      const mutable = transaction || state;
      if (/FROM content_notification_deliveries/i.test(normalized)) {
        return { rows: [structuredClone(mutable)] };
      }
      if (/FROM newsletter_signups/i.test(normalized)) {
        return { rows: subscriber ? [structuredClone(subscriber)] : [] };
      }
      if (/SET status = 'cancelled'/i.test(normalized)) {
        mutable.status = 'cancelled';
        mutable.last_error_code = 'subscriber_inactive';
        return { rows: [structuredClone(mutable)] };
      }
      if (/SET status = 'sending'/i.test(normalized)) {
        mutable.status = 'sending';
        mutable.attempts += 1;
        mutable.locked_by = params.find((value) => typeof value === 'string') || 'delivery-lock';
        return { rows: [structuredClone(mutable)] };
      }
      if (/SET status = 'sent'/i.test(normalized)) {
        mutable.status = 'sent';
        mutable.locked_by = null;
        mutable.last_error_code = null;
        return { rows: [structuredClone(mutable)] };
      }
      if (/SET status = 'failed'/i.test(normalized)) {
        mutable.status = 'failed';
        mutable.locked_by = null;
        mutable.last_error_code = 'outcome_uncertain';
        return { rows: [structuredClone(mutable)] };
      }
      if (/SET status = CASE/i.test(normalized)) {
        const retryable = params.find((value) => typeof value === 'boolean') === true;
        mutable.status = retryable ? 'queued' : 'failed';
        mutable.locked_by = null;
        mutable.last_error_code = params.find((value) => value === 'outcome_uncertain') || null;
        return { rows: [structuredClone(mutable)] };
      }
      throw new Error(`Unerwartetes SQL im Zustellungstest: ${normalized}`);
    },
    release() {}
  };
  return {
    get state() { return state; },
    queries,
    async connect() { return client; }
  };
}

function queuedDelivery() {
  return {
    id: 9,
    notification_type: 'newsletter_article',
    post_id: 51,
    recipient_id: 77,
    recipient_email: 'leser@example.de',
    status: 'queued',
    attempts: 0,
    next_attempt_at: new Date('2026-07-12T09:00:00.000Z'),
    payload_json: {
      postId: 51,
      publicationVersion: 1,
      title: 'Sicherer Artikel',
      shortDescription: 'Eine nützliche Kurzbeschreibung.',
      imageUrl: 'https://cdn.example.test/artikel.webp',
      slug: 'sicherer-artikel'
    }
  };
}

test('Newsletter bleibt vor acht persistierten manuellen Veröffentlichungen gesperrt', async () => {
  const { assertNewsletterActivationAllowed } = await import('../services/contentAgent/blogNewsletterService.js');

  await assert.rejects(
    () => assertNewsletterActivationAllowed({ manual_approvals_count: 7 }),
    (error) => error.code === 'CONTENT_NEWSLETTER_NOT_READY'
  );
  await assert.rejects(
    () => assertNewsletterActivationAllowed({ manual_approvals_count: 'nicht-persistiert' }),
    (error) => error.code === 'CONTENT_NEWSLETTER_NOT_READY'
  );
  assert.equal(await assertNewsletterActivationAllowed({ manual_approvals_count: 8 }), true);
});

test('Publikation enqueued das deduplizierte Newsletter-Ereignis nur bei persistierter Aktivierung und acht Freigaben', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const enqueued = [];
  const service = createBlogNewsletterService({
    async enqueueContentJob(input) {
      enqueued.push(input);
      return { id: 1, ...input };
    }
  });
  const post = { id: 51, published: true, workflow_status: 'published', publication_version: 2 };

  for (const settings of [
    { newsletter_blog_notifications_enabled: false, manual_approvals_count: 8 },
    { newsletter_blog_notifications_enabled: true, manual_approvals_count: 7 }
  ]) {
    const result = await service.queuePublishedArticleNewsletter({
      postId: 51,
      publicationVersion: 1,
      settings,
      post
    });
    assert.equal(result.status, 'disabled');
  }

  await service.queuePublishedArticleNewsletter({
    postId: 51,
    publicationVersion: 1,
    settings: { newsletter_blog_notifications_enabled: true, manual_approvals_count: 8 },
    post
  });

  assert.equal(enqueued.length, 1);
  assert.equal(enqueued[0].jobType, 'send_blog_newsletter');
  assert.equal(enqueued[0].idempotencyKey, 'newsletter:51:1');
  assert.deepEqual(enqueued[0].payload, { postId: 51, publicationVersion: 1, cursor: 0 });
});

test('Batch verarbeitet höchstens 50 zulässige Abonnenten und erzeugt deduplizierte Deliveries, Childjobs und Fortsetzung', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const subscribers = Array.from({ length: 52 }, (_, index) => ({
    id: index + 1,
    email: `leser-${index + 1}@example.de`,
    active: true,
    unsubscribe_token: `token-${index + 1}`
  }));
  const database = createBatchDatabase({
    settings: { newsletter_blog_notifications_enabled: true, manual_approvals_count: 8 },
    post: {
      id: 51,
      title: 'Neuer Artikel',
      excerpt: 'Kurz beschrieben.',
      image_url: 'https://cdn.example.test/artikel.webp',
      slug: 'neuer-artikel',
      published: true,
      workflow_status: 'published',
      publication_version: 2
    },
    subscribers
  });
  const deliveries = [];
  const jobs = [];
  const service = createBlogNewsletterService({
    database,
    async createNewsletterDelivery(input) {
      deliveries.push(input);
      return { id: input.subscriberId, ...input };
    },
    async enqueueContentJob(input) {
      jobs.push(input);
      return { id: jobs.length, ...input };
    }
  });

  const first = await service.preparePublishedArticleNewsletter({
    postId: 51,
    publicationVersion: 1,
    cursor: 0,
    leaseGuard: async () => true
  });
  const second = await service.preparePublishedArticleNewsletter({
    postId: 51,
    publicationVersion: 1,
    cursor: 50,
    leaseGuard: async () => true
  });

  assert.equal(first.queued, 50);
  assert.equal(second.queued, 2);
  assert.equal(deliveries.length, 52);
  assert.equal(jobs.filter(({ jobType }) => jobType === 'send_blog_newsletter_delivery').length, 52);
  assert.ok(jobs.some(({ idempotencyKey }) => idempotencyKey === 'newsletter-batch:51:1:50'));
  assert.equal(new Set(deliveries.map(({ idempotencyKey }) => idempotencyKey)).size, 52);
  const subscriberQuery = database.queries.find(({ sql }) => /FROM newsletter_signups/i.test(sql));
  assert.match(subscriberQuery.sql, /active = TRUE/i);
  assert.match(subscriberQuery.sql, /NULLIF\(BTRIM\(unsubscribe_token\), ''\) IS NOT NULL/i);
  assert.match(subscriberQuery.sql, /LIMIT 50/i);
});

test('Zustellung sperrt die Delivery, lädt den Abonnenten unmittelbar neu und storniert nach Abmeldung ohne Mail', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const database = createDeliveryDatabase({
    delivery: queuedDelivery(),
    subscriber: { id: 77, email: 'leser@example.de', active: false, unsubscribe_token: 'noch-vorhanden' }
  });
  const sendNewsletterMail = mock.fn(async () => ({ messageId: 'darf-nicht-senden' }));
  const service = createBlogNewsletterService({ database, sendNewsletterMail });

  const result = await service.sendNewsletterDelivery({
    deliveryId: 9,
    leaseGuard: async () => true
  });

  assert.equal(result.status, 'cancelled');
  assert.equal(sendNewsletterMail.mock.callCount(), 0);
  assert.equal(database.state.status, 'cancelled');
  assert.match(database.queries.find(({ sql }) => /FROM content_notification_deliveries/i.test(sql)).sql, /FOR UPDATE/i);
  assert.match(database.queries.find(({ sql }) => /FROM newsletter_signups/i.test(sql)).sql, /FOR UPDATE/i);
});

test('fehlender Abmeldetoken storniert die Zustellung beim unmittelbaren Recheck', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const database = createDeliveryDatabase({
    delivery: queuedDelivery(),
    subscriber: { id: 77, email: 'leser@example.de', active: true, unsubscribe_token: '   ' }
  });
  const sendNewsletterMail = mock.fn(async () => ({ messageId: 'darf-nicht-senden' }));
  const service = createBlogNewsletterService({ database, sendNewsletterMail });

  const result = await service.sendNewsletterDelivery({ deliveryId: 9, leaseGuard: async () => true });

  assert.equal(result.status, 'cancelled');
  assert.equal(sendNewsletterMail.mock.callCount(), 0);
  assert.equal(database.state.status, 'cancelled');
});

test('Leaseverlust vor dem Claim-Commit rollt die Delivery zurück und verhindert SMTP', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const database = createDeliveryDatabase({
    delivery: queuedDelivery(),
    subscriber: { id: 77, email: 'leser@example.de', active: true, unsubscribe_token: 'sicheres-token' }
  });
  const sendNewsletterMail = mock.fn(async () => ({ messageId: 'darf-nicht-senden' }));
  const service = createBlogNewsletterService({ database, sendNewsletterMail });
  let checks = 0;

  await assert.rejects(
    () => service.sendNewsletterDelivery({
      deliveryId: 9,
      leaseGuard: async () => {
        checks += 1;
        return checks < 3;
      }
    }),
    (error) => error.code === 'CONTENT_JOB_LEASE_LOST' && error.retryable === false
  );

  assert.equal(sendNewsletterMail.mock.callCount(), 0);
  assert.equal(database.state.status, 'queued');
});

test('Mehrdeutiger SMTP-Ausgang wird terminal gespeichert und niemals automatisch doppelt gesendet', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const database = createDeliveryDatabase({
    delivery: queuedDelivery(),
    subscriber: { id: 77, email: 'leser@example.de', active: true, unsubscribe_token: 'geheimes-token' }
  });
  const sendNewsletterMail = mock.fn(async () => {
    throw Object.assign(new Error('Verbindung während DATA verloren'), {
      code: 'ETIMEDOUT',
      command: 'DATA'
    });
  });
  const service = createBlogNewsletterService({ database, sendNewsletterMail });

  await assert.rejects(
    () => service.sendNewsletterDelivery({ deliveryId: 9, leaseGuard: async () => true }),
    (error) => error.code === 'CONTENT_NEWSLETTER_OUTCOME_UNCERTAIN' && error.retryable === false
  );
  assert.equal(sendNewsletterMail.mock.callCount(), 1);
  assert.equal(database.state.status, 'failed');
  assert.equal(database.state.last_error_code, 'outcome_uncertain');

  await assert.rejects(
    () => service.sendNewsletterDelivery({ deliveryId: 9, leaseGuard: async () => true }),
    (error) => error.retryable === false
  );
  assert.equal(sendNewsletterMail.mock.callCount(), 1);
});

test('nach Crash verbliebenes sending wird ohne erneuten SMTP-Versand outcome_uncertain', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const database = createDeliveryDatabase({
    delivery: { ...queuedDelivery(), status: 'sending', attempts: 1, locked_by: 'abgestürzter-worker' },
    subscriber: { id: 77, email: 'leser@example.de', active: true, unsubscribe_token: 'sicheres-token' }
  });
  const sendNewsletterMail = mock.fn(async () => ({ messageId: 'doppelte-mail' }));
  const service = createBlogNewsletterService({ database, sendNewsletterMail });

  await assert.rejects(
    () => service.sendNewsletterDelivery({ deliveryId: 9, leaseGuard: async () => true }),
    (error) => error.code === 'CONTENT_NEWSLETTER_OUTCOME_UNCERTAIN' && error.retryable === false
  );

  assert.equal(sendNewsletterMail.mock.callCount(), 0);
  assert.equal(database.state.status, 'failed');
  assert.equal(database.state.last_error_code, 'outcome_uncertain');
});

test('unklares Commit nach bestätigtem SMTP-Versand wird outcome_uncertain statt Doppelversand', async () => {
  const { createBlogNewsletterService } = await import('../services/contentAgent/blogNewsletterService.js');
  const database = createDeliveryDatabase({
    delivery: queuedDelivery(),
    subscriber: { id: 77, email: 'leser@example.de', active: true, unsubscribe_token: 'sicheres-token' },
    failSentCommit: true
  });
  const sendNewsletterMail = mock.fn(async () => ({ messageId: 'smtp-bestaetigt' }));
  const service = createBlogNewsletterService({ database, sendNewsletterMail });

  await assert.rejects(
    () => service.sendNewsletterDelivery({ deliveryId: 9, leaseGuard: async () => true }),
    (error) => error.code === 'CONTENT_NEWSLETTER_OUTCOME_UNCERTAIN' && error.retryable === false
  );

  assert.equal(sendNewsletterMail.mock.callCount(), 1);
  assert.equal(database.state.status, 'failed');
  assert.equal(database.state.last_error_code, 'outcome_uncertain');
});

test('Blog-Newsletter-Mail enthält escaped HTML und Text sowie nur kanonische Artikel- und Abmeldelinks', async () => {
  const { sendPublishedBlogNewsletterMail } = await import('../services/mailService.js');
  const transport = { sendMail: mock.fn(async (mail) => ({ messageId: 'newsletter-1', mail })) };
  const previousCanonical = process.env.CANONICAL_BASE_URL;
  process.env.CANONICAL_BASE_URL = 'https://komplettwebdesign.de/?intern=1';
  try {
    await sendPublishedBlogNewsletterMail({
      to: 'leser@example.de',
      unsubscribeToken: 'token/mit?zeichen',
      post: {
        title: 'Titel & <script>alert(1)</script>',
        shortDescription: '<img src=x onerror=alert(1)> Kurzbeschreibung',
        imageUrl: 'https://cdn.example.test/artikel.webp?token=geheim#intern',
        slug: 'sicherer-artikel'
      }
    }, transport);
  } finally {
    if (previousCanonical === undefined) delete process.env.CANONICAL_BASE_URL;
    else process.env.CANONICAL_BASE_URL = previousCanonical;
  }

  const mail = transport.sendMail.mock.calls[0].arguments[0];
  assert.equal(mail.to, 'leser@example.de');
  assert.match(mail.html, /Titel &amp; &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(mail.html, /<script>|<img\s+src=x\s+onerror=|token=geheim|#intern/i);
  assert.match(mail.html, /href="https:\/\/komplettwebdesign\.de\/blog\/sicherer-artikel"/);
  assert.match(mail.html, /href="https:\/\/komplettwebdesign\.de\/newsletter\/unsubscribe\/token%2Fmit%3Fzeichen"/);
  assert.match(mail.text, /Titel & <script>alert\(1\)<\/script>/);
  assert.match(mail.text, /https:\/\/komplettwebdesign\.de\/blog\/sicherer-artikel/);
  assert.match(mail.text, /https:\/\/komplettwebdesign\.de\/newsletter\/unsubscribe\/token%2Fmit%3Fzeichen/);
});
