import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
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
      async getSettings() { return { timezone: 'Europe/Berlin', schedule_revision: 7 }; }
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

test('Editor erzeugt kanonische Termin- und Freigabe-Snapshots direkt aus dem geladenen Post', async () => {
  const states = [
    {
      post: { scheduled_at: new Date('2026-07-13T16:00:00.000Z'), approved_review_version: null },
      expectedScheduledAt: '2026-07-13T16:00:00.000Z',
      expectedApprovedReviewVersion: 'null'
    },
    {
      post: { scheduled_at: null, approved_review_version: null },
      expectedScheduledAt: 'null',
      expectedApprovedReviewVersion: 'null'
    },
    {
      post: { scheduled_at: new Date('2026-07-13T16:00:00.000Z'), approved_review_version: 2 },
      expectedScheduledAt: '2026-07-13T16:00:00.000Z',
      expectedApprovedReviewVersion: '2'
    }
  ];

  for (const state of states) {
    const controller = createAdminContentAgentController(dependencies({
      draftService: {
        async getDraftForReview() {
          return {
            ...state,
            id: 19,
            reviewVersion: 2,
            actions: {},
            riskReview: null
          };
        }
      }
    }));
    const res = response();
    await controller.draftEditPage({ params: { id: '19' }, query: {} }, res, assert.fail);
    assert.equal(res.rendered.locals.draft.expectedScheduledAt, state.expectedScheduledAt);
    assert.equal(
      res.rendered.locals.draft.expectedApprovedReviewVersion,
      state.expectedApprovedReviewVersion
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
      },
      async reschedule(input) {
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
        body: {
          scheduled_at_local: localFuture,
          schedule_timezone: 'Europe/Berlin',
          schedule_revision: '7',
          expected_review_version: '2',
          expected_scheduled_at: '2026-07-13T16:00:00.000Z',
          expected_approved_review_version: 'null',
          confirmed
        },
        session: { user: { id: 7, username: 'redaktion' } }
      }, res, assert.fail);
      assert.equal(res.statusCode, 400);
    }
    const res = response();
    await controller[action]({
      params: { id: '19' },
      body: {
        scheduled_at_local: localFuture,
        schedule_timezone: 'Europe/Berlin',
        schedule_revision: '7',
        expected_review_version: '2',
        expected_scheduled_at: '2026-07-13T16:00:00.000Z',
        expected_approved_review_version: 'null',
        confirmed: 'true'
      },
      session: { user: { id: 7, username: 'redaktion' } }
    }, res, assert.fail);
    assert.equal(calls.at(-1).scheduledAt.toISOString(), '2026-07-13T16:00:00.000Z');
    assert.equal(calls.at(-1).expectedScheduleRevision, 7);
    assert.equal(calls.at(-1).expectedTimezone, 'Europe/Berlin');
    assert.equal(calls.at(-1).expectedReviewVersion, 2);
    if (action === 'rescheduleDraftAction') {
      assert.equal(calls.at(-1).expectedScheduledAt.toISOString(), '2026-07-13T16:00:00.000Z');
      assert.equal(calls.at(-1).expectedApprovedReviewVersion, null);
    }
    assert.equal(calls.at(-1).confirmed, true);
    assert.deepEqual(calls.at(-1).admin, { id: 7, username: 'redaktion' });
  }
});

test('Termin-POST lehnt einen seit dem Rendern geänderten Zeitplan fail-closed mit 409 ab', async () => {
  let approvals = 0;
  const controller = createAdminContentAgentController(dependencies({
    settingsRepository: {
      async getSettings() { return { timezone: 'UTC', schedule_revision: 8 }; }
    },
    scheduledPublicationService: {
      async approveForSchedule() { approvals += 1; }
    }
  }));
  const res = response();
  await controller.approveScheduledAction({
    params: { id: '19' },
    body: {
      scheduled_at_local: localFuture,
      schedule_timezone: 'Europe/Berlin',
      schedule_revision: '7',
      expected_review_version: '2',
      confirmed: 'true'
    },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);
  assert.equal(res.statusCode, 409);
  assert.equal(approvals, 0);
});

test('veraltetes Editorformular liefert im Controller 409 und überschreibt nichts', async () => {
  let received;
  const controller = createAdminContentAgentController(dependencies({
    draftService: {
      async updateDraft(input) {
        received = input;
        throw Object.assign(new Error('stale'), { code: 'CONTENT_DRAFT_EDIT_CONFLICT' });
      }
    }
  }));
  const res = response();
  await controller.updateDraftAction({
    params: { id: '19' },
    body: { reviewVersion: '2', title: 'Veralteter Tab' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);
  assert.equal(res.statusCode, 409);
  assert.equal(received.input.reviewVersion, '2');
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
    const actionBody = action === 'publishNowAction'
      ? {
          expected_review_version: '2',
          expected_scheduled_at: '2026-07-12T09:00:00.000Z',
          expected_approved_review_version: 'null'
        }
      : {};
    const missing = response();
    await controller[action]({
      params: { id: '19' }, body: actionBody, session: { user: { id: 7, username: 'redaktion' } }
    }, missing, assert.fail);
    assert.equal(missing.statusCode, 400);

    const accepted = response();
    await controller[action]({
      params: { id: '19' },
      body: { ...actionBody, confirmed: 'true' },
      session: { user: { id: 7, username: 'redaktion' } }
    }, accepted, assert.fail);
  }

  assert.equal(publishInputs.at(-1).confirmed, true);
  assert.equal(publishInputs.at(-1).expectedReviewVersion, 2);
  assert.equal(publishInputs.at(-1).expectedScheduledAt.toISOString(), '2026-07-12T09:00:00.000Z');
  assert.equal(publishInputs.at(-1).expectedApprovedReviewVersion, null);
  assert.equal(retryInputs.at(-1).confirmed, true);
});

test('manuelle Freigabecontroller lehnen fehlende oder manipulierte Reviewversionen vor dem Serviceaufruf ab', async () => {
  let scheduledCalls = 0;
  let publishCalls = 0;
  const controller = createAdminContentAgentController(dependencies({
    scheduledPublicationService: {
      async approveForSchedule() { scheduledCalls += 1; },
      async reschedule() { scheduledCalls += 1; },
      async publishNowAfterMissedSlot() { publishCalls += 1; }
    }
  }));

  for (const expectedReviewVersion of [undefined, '', '0', '-1', '2x', '1.5']) {
    for (const action of ['approveScheduledAction', 'rescheduleDraftAction']) {
      const res = response();
      await controller[action]({
        params: { id: '19' },
        body: {
          scheduled_at_local: localFuture,
          schedule_timezone: 'Europe/Berlin',
          schedule_revision: '7',
          expected_review_version: expectedReviewVersion,
          expected_scheduled_at: '2026-07-13T16:00:00.000Z',
          expected_approved_review_version: 'null',
          confirmed: 'true'
        },
        session: { user: { id: 7, username: 'redaktion' } }
      }, res, assert.fail);
      assert.equal(res.statusCode, 400);
    }

    const res = response();
    await controller.publishNowAction({
      params: { id: '19' },
      body: {
        expected_review_version: expectedReviewVersion,
        expected_scheduled_at: '2026-07-13T16:00:00.000Z',
        expected_approved_review_version: 'null',
        confirmed: 'true'
      },
      session: { user: { id: 7, username: 'redaktion' } }
    }, res, assert.fail);
    assert.equal(res.statusCode, 400);
  }

  assert.equal(scheduledCalls, 0);
  assert.equal(publishCalls, 0);
});

test('Verschieben und Sofortveröffentlichen validieren den kanonischen Approval-Snapshot vor dem Serviceaufruf', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(dependencies({
    scheduledPublicationService: {
      async reschedule() { calls += 1; },
      async publishNowAfterMissedSlot() { calls += 1; }
    }
  }));
  const invalidSnapshots = [
    { expected_scheduled_at: undefined, expected_approved_review_version: 'null' },
    { expected_scheduled_at: '', expected_approved_review_version: 'null' },
    { expected_scheduled_at: '2026-07-13T16:00:00Z', expected_approved_review_version: 'null' },
    { expected_scheduled_at: 'null', expected_approved_review_version: undefined },
    { expected_scheduled_at: 'null', expected_approved_review_version: '' },
    { expected_scheduled_at: 'null', expected_approved_review_version: '0' }
  ];

  for (const snapshot of invalidSnapshots) {
    const rescheduleRes = response();
    await controller.rescheduleDraftAction({
      params: { id: '19' },
      body: {
        scheduled_at_local: localFuture,
        schedule_timezone: 'Europe/Berlin',
        schedule_revision: '7',
        expected_review_version: '2',
        ...snapshot,
        confirmed: 'true'
      },
      session: { user: { id: 7, username: 'redaktion' } }
    }, rescheduleRes, assert.fail);
    assert.equal(rescheduleRes.statusCode, 400);

    const publishRes = response();
    await controller.publishNowAction({
      params: { id: '19' },
      body: { expected_review_version: '2', ...snapshot, confirmed: 'true' },
      session: { user: { id: 7, username: 'redaktion' } }
    }, publishRes, assert.fail);
    assert.equal(publishRes.statusCode, 400);
  }
  assert.equal(calls, 0);
});

test('veraltete Reviewversion wird für alle manuellen Freigabeaktionen als 409 ausgegeben', async () => {
  const stale = Object.assign(new Error('stale'), { code: 'CONTENT_REVIEW_VERSION_STALE' });
  const controller = createAdminContentAgentController(dependencies({
    scheduledPublicationService: {
      async approveForSchedule() { throw stale; },
      async reschedule() { throw stale; },
      async publishNowAfterMissedSlot() { throw stale; }
    }
  }));

  for (const action of ['approveScheduledAction', 'rescheduleDraftAction']) {
    const res = response();
    await controller[action]({
      params: { id: '19' },
      body: {
        scheduled_at_local: localFuture,
        schedule_timezone: 'Europe/Berlin',
        schedule_revision: '7',
        expected_review_version: '2',
        expected_scheduled_at: '2026-07-13T16:00:00.000Z',
        expected_approved_review_version: 'null',
        confirmed: 'true'
      },
      session: { user: { id: 7, username: 'redaktion' } }
    }, res, assert.fail);
    assert.equal(res.statusCode, 409);
  }

  const publishRes = response();
  await controller.publishNowAction({
    params: { id: '19' },
    body: {
      expected_review_version: '2',
      expected_scheduled_at: '2026-07-13T16:00:00.000Z',
      expected_approved_review_version: 'null',
      confirmed: 'true'
    },
    session: { user: { id: 7, username: 'redaktion' } }
  }, publishRes, assert.fail);
  assert.equal(publishRes.statusCode, 409);
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
    scheduledAtLabel: '13.07.2026, 18:00 Uhr (Europe/Berlin)',
    scheduleTimezone: 'Europe/Berlin',
    scheduleRevision: 7,
    reviewVersion: 2,
    expectedScheduledAt: '2026-07-13T16:00:00.000Z',
    expectedApprovedReviewVersion: 'null'
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
  assert.match(approveHtml, /data-confirm-scheduled-at/);
  assert.match(approveHtml, /name="schedule_timezone" value="Europe\/Berlin"/);
  assert.match(approveHtml, /name="schedule_revision" value="7"/);
  assert.match(approveHtml, /name="reviewVersion" value="2"/);
  assert.equal((approveHtml.match(/name="expected_review_version" value="2"/g) || []).length, 1);
  assert.doesNotMatch(approveHtml, /drafts\/19\/publish-now/);
  assert.doesNotMatch(approveHtml, /drafts\/19\/reschedule/);

  const chooseOtherSlotHtml = await renderFile(viewPath, {
    ...locals,
    draft: { ...baseDraft, actions: {
      canApproveScheduled: true,
      canPublishNow: false,
      canReschedule: true,
      rescheduleRequiresApproval: true,
      canRetryNotification: false
    } }
  });
  assert.match(chooseOtherSlotHtml, /drafts\/19\/reschedule/);
  assert.match(chooseOtherSlotHtml, /Freigeben und anderen Termin wählen/);
  assert.match(chooseOtherSlotHtml, /name="expected_scheduled_at" value="2026-07-13T16:00:00\.000Z"/);
  assert.match(chooseOtherSlotHtml, /name="expected_approved_review_version" value="null"/);

  const setInitialSlotHtml = await renderFile(viewPath, {
    ...locals,
    draft: { ...baseDraft, scheduledAtLocal: '', scheduledAtLabel: 'Noch nicht terminiert', actions: {
      canApproveScheduled: false,
      canPublishNow: false,
      canReschedule: true,
      rescheduleRequiresApproval: true,
      canRetryNotification: false
    } }
  });
  assert.match(setInitialSlotHtml, /drafts\/19\/reschedule/);
  assert.match(setInitialSlotHtml, /data-confirm-scheduled-at/);
  assert.match(setInitialSlotHtml, /Freigeben und Termin festlegen/);
  assert.doesNotMatch(setInitialSlotHtml, /Freigeben und jetzt veröffentlichen/);

  const missedHtml = await renderFile(viewPath, {
    ...locals,
    draft: { ...baseDraft, actions: {
      canApproveScheduled: false,
      canPublishNow: true,
      canReschedule: true,
      rescheduleRequiresApproval: true,
      canRetryNotification: true
    } }
  });
  assert.match(missedHtml, /drafts\/19\/publish-now/);
  assert.match(missedHtml, /drafts\/19\/reschedule/);
  assert.match(missedHtml, /drafts\/19\/notification\/retry/);
  assert.equal((missedHtml.match(/name="expected_review_version" value="2"/g) || []).length, 2);
  assert.equal((missedHtml.match(/name="expected_scheduled_at" value="2026-07-13T16:00:00\.000Z"/g) || []).length, 2);
  assert.equal((missedHtml.match(/name="expected_approved_review_version" value="null"/g) || []).length, 2);
  assert.doesNotMatch(missedHtml, /Date\.now|new Date\s*\(/);

  const approvedRescheduleHtml = await renderFile(viewPath, {
    ...locals,
    draft: {
      ...baseDraft,
      expectedApprovedReviewVersion: '2',
      actions: {
        canApproveScheduled: false,
        canPublishNow: false,
        canReschedule: true,
        rescheduleRequiresApproval: false,
        canRetryNotification: false
      }
    }
  });
  assert.match(approvedRescheduleHtml, /name="expected_review_version" value="2"/);
  assert.match(approvedRescheduleHtml, /name="expected_scheduled_at" value="2026-07-13T16:00:00\.000Z"/);
  assert.match(approvedRescheduleHtml, /name="expected_approved_review_version" value="2"/);

  const escapedHtml = await renderFile(viewPath, {
    ...locals,
    draft: {
      ...baseDraft,
      scheduleTimezone: '"><script>alert(1)</script>',
      actions: {
        canApproveScheduled: true,
        canPublishNow: false,
        canReschedule: false,
        canRetryNotification: false
      }
    }
  });
  assert.doesNotMatch(escapedHtml, /value=""><script>/);
  assert.match(escapedHtml, /value="&amp;#34;&amp;gt;&amp;lt;script&amp;gt;|value="&#34;&gt;&lt;script&gt;/);
});

function runConfirmScript({ forms, confirmResult = true }) {
  const questions = [];
  const script = forms.script;
  const formList = forms.items;
  vm.runInNewContext(script, {
    Date,
    document: {
      querySelectorAll(selector) {
        return selector === '[data-confirm]' ? formList : [];
      },
      getElementById() { return null; }
    },
    window: {
      confirm(question) {
        questions.push(question);
        return confirmResult;
      }
    }
  });
  return questions;
}

function confirmForm({ question, scheduledValue, scheduleAware = true }) {
  let submitHandler;
  let validityChecks = 0;
  const field = {
    value: scheduledValue,
    reportValidity() { validityChecks += 1; return false; }
  };
  return {
    form: {
      getAttribute(name) {
        if (name === 'data-confirm') return question;
        if (name === 'data-confirm-scheduled-at') return scheduleAware ? 'true' : null;
        return null;
      },
      querySelector(selector) {
        return selector === 'input[name="scheduled_at_local"]' ? field : null;
      },
      addEventListener(name, handler) {
        if (name === 'submit') submitHandler = handler;
      }
    },
    submit() {
      let prevented = false;
      submitHandler({ preventDefault() { prevented = true; } });
      return { prevented, validityChecks };
    }
  };
}

test('Terminbestätigung zeigt den im selben Formular gewählten lokalen Termin deutsch an', async () => {
  const script = await readFile(new URL('../public/js/admin-content-agent.js', import.meta.url), 'utf8');
  const scheduled = confirmForm({
    question: 'Diesen Entwurf freigeben und terminieren?',
    scheduledValue: '2026-07-13T18:00'
  });
  const unrelated = confirmForm({
    question: 'Diesen Job fortsetzen?',
    scheduledValue: '',
    scheduleAware: false
  });
  const questions = runConfirmScript({ forms: { script, items: [scheduled.form, unrelated.form] } });

  assert.equal(scheduled.submit().prevented, false);
  assert.match(questions[0], /Montag, 13\. Juli 2026 um 18:00 Uhr/);
  assert.equal(unrelated.submit().prevented, false);
  assert.equal(questions[1], 'Diesen Job fortsetzen?');
});

test('Terminbestätigung verhindert fehlende oder unmögliche lokale Eingaben ohne irreführenden Dialog', async () => {
  const script = await readFile(new URL('../public/js/admin-content-agent.js', import.meta.url), 'utf8');
  for (const scheduledValue of ['', '2026-02-30T18:00', 'nicht-lesbar']) {
    const scheduled = confirmForm({
      question: 'Diesen Entwurf freigeben und terminieren?',
      scheduledValue
    });
    const questions = runConfirmScript({ forms: { script, items: [scheduled.form] } });
    const result = scheduled.submit();
    assert.equal(result.prevented, true, scheduledValue);
    assert.equal(result.validityChecks, 1, scheduledValue);
    assert.deepEqual(questions, [], scheduledValue);
  }
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
