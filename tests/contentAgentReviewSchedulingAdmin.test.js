import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderFile } from 'ejs';

import * as controllerModule from '../controllers/adminContentAgentController.js';
import { createAdminContentAgentController } from '../controllers/adminContentAgentController.js';
import { createScheduledPublicationService } from '../services/contentAgent/scheduledPublicationService.js';

const now = new Date('2026-07-12T10:00:00.000Z');
const localFuture = '2026-07-13T18:00';

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
    redirect(url) { this.redirectedTo = url; return this; },
    render(view, locals) { this.rendered = { view, locals }; return this; }
  };
}

function dependencies(overrides = {}) {
  return {
    adminRepository: {},
    settingsRepository: {
      async getSettings() { return { timezone: 'Europe/Berlin' }; }
    },
    jobRepository: {},
    runtimeConfig: { enabled: true, maxAttempts: 3 },
    presentation: {},
    now: () => now,
    ...overrides
  };
}

test('lokale Datum-Uhrzeit wird strikt in der konfigurierten IANA-Zeitzone geparst', () => {
  assert.equal(typeof controllerModule.parseFutureLocalDateTime, 'function');
  const parsed = controllerModule.parseFutureLocalDateTime(localFuture, 'Europe/Berlin', now);
  assert.equal(parsed.toISOString(), '2026-07-13T16:00:00.000Z');

  for (const [value, timezone] of [
    ['2026-07-12T12:00', 'Europe/Berlin'],
    ['2026-07-12T11:59', 'Europe/Berlin'],
    ['2026-03-29T02:30', 'Europe/Berlin'],
    ['2026-07-13 18:00', 'Europe/Berlin'],
    [localFuture, 'Europe/Ungueltig']
  ]) {
    assert.throws(
      () => controllerModule.parseFutureLocalDateTime(value, timezone, now),
      (error) => ['CONTENT_SCHEDULE_INVALID', 'CONTENT_SCHEDULE_MUST_BE_FUTURE'].includes(error.code)
    );
  }
});

test('Freigeben und Verschieben übergeben den UTC-Termin samt literaler Bestätigung an Task 6', async () => {
  const calls = [];
  const controller = createAdminContentAgentController(dependencies({
    scheduledPublicationService: {
      async approveForSchedule(input) {
        calls.push(input);
        if (input.confirmed !== true) {
          throw Object.assign(new Error('Bestätigung fehlt.'), { code: 'CONTENT_CONFIRMATION_REQUIRED' });
        }
      }
    }
  }));

  for (const action of ['approveScheduledAction', 'rescheduleDraftAction']) {
    for (const confirmed of [undefined, 'on', '1', 'false']) {
      const res = response();
      await controller[action]({
        params: { id: '19' },
        body: { scheduled_at_local: localFuture, confirmed },
        session: { user: { id: 7, username: 'redaktion' } }
      }, res, assert.fail);
      assert.equal(res.statusCode, 400);
    }
    const res = response();
    await controller[action]({
      params: { id: '19' },
      body: { scheduled_at_local: localFuture, confirmed: 'true' },
      session: { user: { id: 7, username: 'redaktion' } }
    }, res, assert.fail);
    assert.equal(calls.at(-1).scheduledAt.toISOString(), '2026-07-13T16:00:00.000Z');
    assert.equal(calls.at(-1).confirmed, true);
    assert.deepEqual(calls.at(-1).admin, { id: 7, username: 'redaktion' });
  }
});

test('Sofortveröffentlichung und Mailretry verlangen explizite Bestätigung', async () => {
  const publishInputs = [];
  const retryInputs = [];
  const controller = createAdminContentAgentController(dependencies({
    scheduledPublicationService: {
      async publishNowAfterMissedSlot(input) {
        publishInputs.push(input);
        if (input.confirmed !== true) {
          throw Object.assign(new Error('Bestätigung fehlt.'), { code: 'CONTENT_CONFIRMATION_REQUIRED' });
        }
      }
    },
    draftService: {
      async retryAdminReviewNotification(input) {
        retryInputs.push(input);
        if (input.confirmed !== true) {
          throw Object.assign(new Error('Bestätigung fehlt.'), { code: 'CONTENT_CONFIRMATION_REQUIRED' });
        }
      }
    }
  }));

  for (const action of ['publishNowAction', 'retryDraftNotificationAction']) {
    const missing = response();
    await controller[action]({
      params: { id: '19' }, body: {}, session: { user: { id: 7, username: 'redaktion' } }
    }, missing, assert.fail);
    assert.equal(missing.statusCode, 400);

    const accepted = response();
    await controller[action]({
      params: { id: '19' }, body: { confirmed: 'true' }, session: { user: { id: 7, username: 'redaktion' } }
    }, accepted, assert.fail);
  }

  assert.equal(publishInputs.at(-1).confirmed, true);
  assert.equal(retryInputs.at(-1).confirmed, true);
});

test('alte Job-Snapshots dürfen nach einer Bearbeitung nicht veröffentlichen', async () => {
  const changedPost = {
    id: 19,
    generated_by_ai: true,
    published: false,
    content_format: 'static_html',
    workflow_status: 'needs_review',
    scheduled_at: new Date('2026-07-12T09:00:00.000Z'),
    review_version: 3,
    approved_review_version: null,
    approved_at: null,
    approved_by_admin_id: null,
    publication_version: 1
  };
  let publishCalls = 0;
  const client = { async query() { return { rows: [] }; }, release() {} };
  const service = createScheduledPublicationService({
    db: { async connect() { return client; } },
    repository: {
      async getDraftWithMetadataForUpdate() { return { post: changedPost, metadata: {} }; },
      async publishApprovedDraft() { publishCalls += 1; }
    },
    publicationService: {},
    now: () => now
  });

  await assert.rejects(service.publishApprovedPost({
    postId: 19,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: changedPost.scheduled_at,
    leaseGuard: async () => true
  }), (error) => error.code === 'CONTENT_APPROVAL_STALE');
  assert.equal(publishCalls, 0);
});

test('Editor rendert ausschließlich die durch Serverflags erlaubten Terminaktionen', async () => {
  const viewPath = fileURLToPath(new URL('../views/admin/contentAgent/draftEdit.ejs', import.meta.url));
  const baseDraft = {
    id: 19,
    title: 'Entwurf',
    shortDescription: 'Kurzbeschreibung',
    slug: 'entwurf',
    metaTitle: 'Meta Title mit ausreichend vielen Zeichen für Google',
    metaDescription: 'Meta Description mit ausreichend vielen Zeichen für die sichere Vorschau und die spätere Suchdarstellung.',
    ogTitle: 'OG-Titel',
    ogDescription: 'OG-Beschreibung',
    imageAlt: 'Bildbeschreibung',
    contentHtml: '<section><h2>Artikel</h2></section>',
    faqJsonText: '[]',
    scheduledAtLocal: localFuture,
    scheduledAtLabel: '13.07.2026, 18:00 Uhr (Europe/Berlin)'
  };
  const locals = {
    title: 'Content-Agent',
    currentPathname: '/admin/content-agent',
    csrfToken: 'csrf-test',
    cssAsset: (value) => `/assets/${value}`,
    jsAsset: (value) => `/assets/${value}`,
    saved: false,
    queued: false,
    approved: false,
    rescheduled: false,
    notificationRetried: false
  };
  const approveHtml = await renderFile(viewPath, {
    ...locals,
    draft: { ...baseDraft, actions: {
      canApproveScheduled: true,
      canPublishNow: false,
      canReschedule: false,
      canRetryNotification: false
    } }
  });
  assert.match(approveHtml, /drafts\/19\/approve-scheduled/);
  assert.doesNotMatch(approveHtml, /drafts\/19\/publish-now/);
  assert.doesNotMatch(approveHtml, /drafts\/19\/reschedule/);

  const missedHtml = await renderFile(viewPath, {
    ...locals,
    draft: { ...baseDraft, actions: {
      canApproveScheduled: false,
      canPublishNow: true,
      canReschedule: true,
      canRetryNotification: true
    } }
  });
  assert.match(missedHtml, /drafts\/19\/publish-now/);
  assert.match(missedHtml, /drafts\/19\/reschedule/);
  assert.match(missedHtml, /drafts\/19\/notification\/retry/);
  assert.doesNotMatch(missedHtml, /Date\.now|new Date\s*\(/);
});

test('alle vier neuen Routen sind admin- und CSRF-geschützt', async () => {
  const routeSource = await readFile(new URL('../routes/adminContentAgentRoutes.js', import.meta.url), 'utf8');
  for (const suffix of ['approve-scheduled', 'publish-now', 'reschedule', 'notification/retry']) {
    assert.match(
      routeSource,
      new RegExp(`router\\.post\\('\\/admin\\/content-agent\\/drafts\\/:id\\/${suffix.replace('/', '\\/')}',\\s*isAdmin,\\s*verifyCsrfToken,`)
    );
  }
});
