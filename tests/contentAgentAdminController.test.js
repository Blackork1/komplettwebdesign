import test from 'node:test';
import assert from 'node:assert/strict';

import {
  contentAgentStatus,
  createAdminContentAgentController
} from '../controllers/adminContentAgentController.js';
import { retryContentJobForAdmin } from '../repositories/contentJobRepository.js';
import { validateContentAgentSettingsTransition } from '../services/contentAgent/runtimeConfigService.js';
import * as adminPresentation from '../services/contentAgent/adminPresentationService.js';

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
    redirect(url) { this.redirectedTo = url; return this; },
    render(view, locals) { this.rendered = { view, locals }; return this; }
  };
}

function baseDependencies(overrides = {}) {
  return {
    adminRepository: {},
    settingsRepository: {},
    jobRepository: {},
    runtimeConfig: { enabled: true, maxAttempts: 3, monthlyCostLimitEur: 25, autoPublishEnabled: false },
    presentation: {},
    ...overrides
  };
}

test('technischer Not-Aus sperrt manuelle Entwürfe und Bestandsaudits zentral', async () => {
  for (const action of ['enqueueManualDraftAction', 'enqueueAuditAction']) {
    let queueCalls = 0;
    const controller = createAdminContentAgentController(baseDependencies({
      runtimeConfig: { enabled: false, maxAttempts: 3, monthlyCostLimitEur: 25 },
      settingsRepository: { async getSettings() { return { agent_enabled: true }; } },
      jobRepository: { async enqueueJob() { queueCalls += 1; } },
      revisionService: { async enqueueAudit() { queueCalls += 1; } }
    }));
    const res = response();
    await controller[action]({ session: { user: { id: 7, username: 'admin' } } }, res, assert.fail);
    assert.equal(queueCalls, 0, `${action} darf keinen Job anlegen`);
    assert.equal(res.statusCode, 409);
  }
});

test('Dashboard-Aktivierung und Werte oberhalb technischer Hardcaps werden vor DB-Schreibzugriff abgelehnt', async () => {
  const current = {
    agent_enabled: false, operating_mode: 'review', schedule_weekdays: [1, 4],
    schedule_time: '18:00:00', timezone: 'Europe/Berlin', monthly_budget_cents: 2500,
    auto_publish_min_score: 90, maximum_attempts: 3, manual_approvals_count: 0, settings_version: 4
  };
  for (const { runtimeConfig, body } of [
    { runtimeConfig: { enabled: false, monthlyCostLimitEur: 25, maxAttempts: 3 }, body: { agent_enabled: 'true' } },
    { runtimeConfig: { enabled: true, monthlyCostLimitEur: 25, maxAttempts: 3 }, body: { monthly_budget_cents: '2501' } },
    { runtimeConfig: { enabled: true, monthlyCostLimitEur: 25, maxAttempts: 3 }, body: { maximum_attempts: '4' } }
  ]) {
    let writes = 0;
    const controller = createAdminContentAgentController(baseDependencies({
      runtimeConfig,
      settingsRepository: {
        async getSettings() { return current; },
        async updateSettings() { writes += 1; }
      },
      validateSettingsTransition: (input) => validateContentAgentSettingsTransition(input)
    }));
    const res = response();
    await controller.updateSettingsAction({ body: { settings_version: '4', ...body }, session: { user: {} } }, res, assert.fail);
    assert.equal(res.statusCode, 400);
    assert.equal(writes, 0);
  }
});

test('manuelle Erstellung erzwingt admin_manual und review', async () => {
  const jobs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() {
        return { agent_enabled: true, maximum_attempts: 5 };
      }
    },
    jobRepository: {
      async enqueueJob(input) { jobs.push(input); return { id: 17 }; }
    }
  }));
  const res = response();

  await controller.enqueueManualDraftAction({ session: { user: { is: 7, username: 'admin' } } }, res, assert.fail);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].jobType, 'generate_manual_draft');
  assert.match(jobs[0].idempotencyKey, /^manual:[0-9a-f-]+$/i);
  assert.deepEqual(jobs[0].payload, { source: 'admin_manual', forced_mode: 'review' });
  assert.equal(jobs[0].maxAttempts, 3);
  assert.equal(res.redirectedTo, '/admin/content-agent?created=1');
});

test('vier getrennte Regenerationsaktionen enqueuen minimale Reviewjobs mit Hardcap', async () => {
  const jobs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    runtimeConfig: { enabled: true, maxAttempts: 3, autoPublishEnabled: false },
    settingsRepository: {
      async getSettings() { return { agent_enabled: true, maximum_attempts: 5 }; }
    },
    draftService: {
      async getDraftForReview(postId) { return { post: { id: postId, published: false } }; }
    },
    jobRepository: {
      async enqueueJob(input) { jobs.push(input); return { id: jobs.length }; }
    }
  }));
  const actions = [
    ['regenerateDraftAction', 'regenerate_article'],
    ['regenerateMetadataAction', 'regenerate_metadata'],
    ['regenerateFaqAction', 'regenerate_faq'],
    ['regenerateImageAction', 'regenerate_image']
  ];

  for (const [action, jobType] of actions) {
    const res = response();
    await controller[action]({
      params: { id: '19' },
      session: { user: { id: 7, username: 'admin' } }
    }, res, assert.fail);
    const job = jobs.at(-1);
    assert.equal(job.jobType, jobType);
    assert.match(job.idempotencyKey, new RegExp(`^${jobType}:19:[0-9a-f-]+$`, 'i'));
    assert.deepEqual(job.payload, {
      source: 'admin_regeneration',
      post_id: 19,
      forced_mode: 'review'
    });
    assert.equal(job.maxAttempts, 3);
    assert.equal(res.redirectedTo, '/admin/content-agent/drafts/19/edit?queued=1');
  }
  assert.equal(new Set(jobs.map(({ idempotencyKey }) => idempotencyKey)).size, 4);
});

test('Regeneration ist bei operativer Pause oder technischem Not-Aus gesperrt', async () => {
  for (const { runtimeConfig, settings } of [
    { runtimeConfig: { enabled: true, maxAttempts: 3 }, settings: { agent_enabled: false } },
    { runtimeConfig: { enabled: false, maxAttempts: 3 }, settings: { agent_enabled: true } }
  ]) {
    let enqueueCalls = 0;
    const controller = createAdminContentAgentController(baseDependencies({
      runtimeConfig,
      settingsRepository: { async getSettings() { return settings; } },
      draftService: { async getDraftForReview() { return {}; } },
      jobRepository: { async enqueueJob() { enqueueCalls += 1; } }
    }));
    const res = response();

    await controller.regenerateMetadataAction({ params: { id: '19' } }, res, assert.fail);

    assert.equal(enqueueCalls, 0);
    assert.equal(res.statusCode, 409);
  }
});

test('ein deaktivierter Agent legt keinen manuellen Job an', async () => {
  let enqueueCalls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: { async getSettings() { return { agent_enabled: false }; } },
    jobRepository: { async enqueueJob() { enqueueCalls += 1; } }
  }));
  const res = response();

  await controller.enqueueManualDraftAction({ session: { user: { isAdmin: true } } }, res, assert.fail);

  assert.equal(enqueueCalls, 0);
  assert.equal(res.statusCode, 409);
  assert.match(res.body, /deaktiviert/i);
});

test('Einstellungsupdate prüft Transition und technische Hardgates vor dem Speichern', async () => {
  const calls = [];
  const current = {
    agent_enabled: true,
    operating_mode: 'review',
    schedule_weekdays: [1, 4],
    schedule_time: '18:00:00',
    timezone: 'Europe/Berlin',
    monthly_budget_cents: 2500,
    auto_publish_min_score: 90,
    maximum_attempts: 3,
    generation_lead_hours: 4,
    admin_notification_email: 'kontakt@komplettwebdesign.de',
    newsletter_blog_notifications_enabled: false,
    manual_approvals_count: 8,
    settings_version: 4
  };
  const controller = createAdminContentAgentController(baseDependencies({
    runtimeConfig: { maxAttempts: 5, autoPublishEnabled: true },
    settingsRepository: {
      async getSettings() { calls.push('get'); return current; },
      async updateSettings(input) { calls.push(['update', input]); return { ...current, settings_version: 5 }; }
    },
    validateSettingsTransition(input) { calls.push(['validate', input]); return input.next; }
  }));
  const req = {
    body: {
      settings_version: '4',
      operating_mode: 'auto_publish',
      auto_publish_min_score: '92',
      generation_lead_hours: '6',
      admin_notification_email: ' Redaktion@Example.de ',
      newsletter_blog_notifications_enabled: 'true'
    },
    session: { user: { is: 7, username: 'admin' } }
  };
  const res = response();

  await controller.updateSettingsAction(req, res, assert.fail);

  assert.equal(calls[0], 'get');
  assert.equal(calls[1][0], 'validate');
  assert.equal(calls[1][1].technicalConfig.autoPublishEnabled, true);
  assert.equal(calls[1][1].next.operating_mode, 'auto_publish');
  assert.equal(calls[2][0], 'update');
  assert.equal(calls[2][1].expectedVersion, 4);
  assert.deepEqual(calls[2][1].admin, { id: 7, username: 'admin' });
  assert.equal(calls[2][1].patch.generationLeadHours, 6);
  assert.equal(calls[2][1].patch.adminNotificationEmail, ' Redaktion@Example.de ');
  assert.equal(calls[2][1].patch.newsletterBlogNotificationsEnabled, true);
  assert.equal(res.redirectedTo, '/admin/content-agent/schedule?saved=1');
});

test('Newsletter-Sperre wird als sicherer Konflikt ausgegeben', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() { return { settings_version: 4 }; },
      async updateSettings() {
        throw Object.assign(new Error('interne Freigabedetails'), {
          code: 'CONTENT_NEWSLETTER_NOT_READY'
        });
      }
    },
    validateSettingsTransition({ next }) { return next; }
  }));
  const res = response();

  await controller.updateSettingsAction({
    body: { settings_version: '4', newsletter_blog_notifications_enabled: 'true' },
    session: { user: { id: 7, username: 'admin' } }
  }, res, assert.fail);

  assert.equal(res.statusCode, 409);
  assert.match(res.body, /Newsletter/);
  assert.doesNotMatch(res.body, /interne Freigabedetails/);
});

test('Zeitplanpräsentation begrenzt den Newsletter-Fortschritt sicher auf acht', () => {
  assert.equal(typeof adminPresentation.buildSchedulePresentation, 'function');
  const schedule = adminPresentation.buildSchedulePresentation({
    manual_approvals_count: 12,
    generation_lead_hours: 4
  });
  assert.equal(schedule.generationLeadHours, 4);
  assert.deepEqual(schedule.newsletterApprovals, { current: 8, required: 8, ready: true });
});

test('Zeitplanseite erhält die vorbereitete Newsletter-Gate-Präsentation', async () => {
  const settings = { manual_approvals_count: 3, generation_lead_hours: 4 };
  const schedule = {
    generationLeadHours: 4,
    newsletterApprovals: { current: 3, required: 8, ready: false }
  };
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: { async getSettings() { return settings; } },
    presentation: {
      buildSchedulePresentation(input) {
        assert.equal(input, settings);
        return schedule;
      }
    }
  }));
  const res = response();

  await controller.schedulePage({}, res, assert.fail);

  assert.equal(res.rendered.locals.schedule, schedule);
});

test('vollständiges Zeitplanformular behandelt fehlende Wochentage als leere Auswahl', async () => {
  const current = {
    agent_enabled: true,
    operating_mode: 'review',
    schedule_weekdays: [1, 4],
    schedule_time: '18:00:00',
    timezone: 'Europe/Berlin',
    monthly_budget_cents: 1250,
    auto_publish_min_score: 90,
    maximum_attempts: 3,
    settings_version: 4
  };
  let updateCalls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() { return current; },
      async updateSettings() { updateCalls += 1; }
    },
    validateSettingsTransition({ next }) {
      assert.deepEqual(next.schedule_weekdays, []);
      throw Object.assign(new Error('Mindestens ein Wochentag ist erforderlich.'), {
        code: 'CONTENT_SETTINGS_VALIDATION_FAILED'
      });
    }
  }));
  const res = response();

  await controller.updateSettingsAction({
    body: {
      settings_form_scope: 'schedule',
      settings_version: '4',
      agent_enabled: 'true',
      operating_mode: 'review',
      schedule_time: '18:00',
      timezone: 'Europe/Berlin',
      monthly_budget_cents: '1250',
      auto_publish_min_score: '90',
      maximum_attempts: '3'
    },
    session: { user: { id: 7, username: 'admin' } }
  }, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCalls, 0);
});

test('Agent-Schnellschalter bleibt ein Teilupdate und bewahrt den Zeitplan', async () => {
  const current = {
    agent_enabled: true,
    operating_mode: 'review',
    schedule_weekdays: [1, 4],
    schedule_time: '18:00:00',
    timezone: 'Europe/Berlin',
    monthly_budget_cents: 1250,
    auto_publish_min_score: 90,
    maximum_attempts: 3,
    settings_version: 4
  };
  let updateInput;
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() { return current; },
      async updateSettings(input) { updateInput = input; return current; }
    },
    validateSettingsTransition({ next }) {
      assert.deepEqual(next.schedule_weekdays, [1, 4]);
      return next;
    }
  }));

  await controller.updateSettingsAction({
    body: { settings_version: '4', agent_enabled: 'false' },
    session: { user: { id: 7, username: 'admin' } }
  }, response(), assert.fail);

  assert.equal(Object.hasOwn(updateInput.patch, 'scheduleWeekdays'), false);
  assert.equal(updateInput.patch.agentEnabled, false);
});

test('Übersicht erhält nur für created=1 eine sichere Erfolgsmeldung', async () => {
  const data = { settings: { agent_enabled: true }, drafts: [], jobs: [] };
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: { async getOverview() { return data; } },
    presentation: { buildDashboardPresentation() { return { modeLabel: 'Review' }; } }
  }));
  const successRes = response();
  const ignoredRes = response();

  await controller.overviewPage({ query: { created: '1' } }, successRes, assert.fail);
  await controller.overviewPage({ query: { created: '<script>1</script>' } }, ignoredRes, assert.fail);

  assert.equal(successRes.rendered.locals.created, true);
  assert.equal(ignoredRes.rendered.locals.created, false);
});

test('Draftfilter und Statusableitung erhalten dasselbe serverseitige now', async () => {
  const instant = new Date('2026-07-12T09:00:00.000Z');
  const calls = [];
  const rows = [{ id: 7 }];
  const drafts = [{ id: 7, reviewState: 'missed' }];
  const controller = createAdminContentAgentController(baseDependencies({
    now: () => instant,
    adminRepository: {
      async listDrafts(input) { calls.push(['repository', input]); return rows; }
    },
    settingsRepository: {
      async getSettings() {
        return { timezone: 'Europe/Berlin', generation_lead_hours: 4 };
      }
    },
    presentation: {
      buildDraftListPresentation(input, current, schedule) {
        calls.push(['presentation', input, current, schedule]);
        return drafts;
      }
    }
  }));
  const res = response();

  await controller.draftsPage({ query: { status: 'missed' } }, res, assert.fail);

  assert.deepEqual(calls, [
    ['repository', { status: 'missed', now: instant }],
    ['presentation', rows, instant, { timezone: 'Europe/Berlin', generationLeadHours: 4 }]
  ]);
  assert.equal(res.rendered.locals.status, 'missed');
  assert.equal(res.rendered.locals.drafts, drafts);
});

test('ungültiger Draftfilter wird vor Repositoryzugriff auf review normalisiert', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async listDrafts(input) { received = input; return []; }
    },
    settingsRepository: {
      async getSettings() { return { timezone: 'Europe/Berlin', generation_lead_hours: 4 }; }
    },
    presentation: { buildDraftListPresentation() { return []; } }
  }));

  await controller.draftsPage({ query: { status: "published' OR TRUE --" } }, response(), assert.fail);

  assert.equal(received.status, 'review');
});

test('bekannte Controllerfehler werden explizit abgebildet, unbekannte gehen an next', async () => {
  const conflict = Object.assign(new Error('interner Kontext'), { code: 'CONTENT_SETTINGS_VERSION_CONFLICT' });
  const conflictController = createAdminContentAgentController(baseDependencies({
    settingsRepository: { async getSettings() { throw conflict; } }
  }));
  const conflictRes = response();
  let conflictNext = 0;
  await conflictController.updateSettingsAction(
    { body: {}, session: { user: {} } },
    conflictRes,
    () => { conflictNext += 1; }
  );
  assert.equal(conflictRes.statusCode, 409);
  assert.equal(conflictNext, 0);
  assert.doesNotMatch(conflictRes.body, /interner Kontext/);

  const unknown = new Error('Datenbank nicht erreichbar');
  const unknownController = createAdminContentAgentController(baseDependencies({
    settingsRepository: { async getSettings() { throw unknown; } }
  }));
  let forwarded;
  await unknownController.updateSettingsAction(
    { body: {}, session: { user: {} } },
    response(),
    (error) => { forwarded = error; }
  );
  assert.equal(forwarded, unknown);
});

test('Admin-Retry setzt denselben Job per Compare-and-Set fort', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [{ id: 23, status: 'queued' }] };
    }
  };

  const job = await retryContentJobForAdmin({ jobId: 23, hardMaxAttempts: 9 }, db);

  assert.equal(job.id, 23);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [23, 5]);
  assert.match(calls[0].sql, /^UPDATE content_jobs/i);
  assert.match(calls[0].sql, /WHERE id = \$1 AND job_type <> 'send_admin_review_notification' AND status IN \('failed', 'needs_manual_attention'\) AND attempts < \$2/i);
  assert.doesNotMatch(calls[0].sql, /INSERT INTO|content_runs/i);
});

test('Retry-Aktion meldet einen verlorenen Zustandsvergleich als Konflikt', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: { async retryContentJobForAdmin() { return null; } }
  }));
  const res = response();

  await controller.retryJobAction({ params: { id: '19' } }, res, assert.fail);

  assert.equal(res.statusCode, 409);
});

test('Jobretry verlässt sich ohne optionalen Jobtyphelfer ausschließlich auf den atomaren CAS', async () => {
  let retryCalls = 0;
  const adminRepository = new Proxy({}, {
    get(_target, property) {
      if (property === 'getJobType') throw new Error('optionaler Jobtyphelfer darf nicht gelesen werden');
      return undefined;
    }
  });
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository,
    jobRepository: {
      async retryContentJobForAdmin() { retryCalls += 1; return null; }
    }
  }));
  const res = response();

  await controller.retryJobAction({ params: { id: '19' } }, res, assert.fail);

  assert.equal(retryCalls, 1);
  assert.equal(res.statusCode, 409);
});

test('Reject-Controller akzeptiert nur die literale kritische Bestätigung', async () => {
  const rejectInputs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    publicationService: {
      async rejectDraft(input) {
        rejectInputs.push(input);
        if (input.confirmed !== true) {
          throw Object.assign(new Error('Bestätigung fehlt.'), { code: 'CONTENT_CONFIRMATION_REQUIRED' });
        }
      }
    }
  }));

  const rejectRes = response();
  await controller.rejectDraftAction({
    params: { id: '9' },
    body: { confirmed: 'true', expected_review_version: '2', reason: 'Fachlich nicht passend' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, rejectRes, assert.fail);
  assert.equal(rejectRes.redirectedTo, '/admin/content-agent/drafts?rejected=1');
  assert.deepEqual(rejectInputs.at(-1), {
    postId: 9,
    expectedReviewVersion: 2,
    admin: { id: 7, username: 'redaktion' },
    confirmed: true,
    reason: 'Fachlich nicht passend'
  });
});

test('Reject-Controller lehnt fehlende oder manipulierte Reviewversionen vor dem Serviceaufruf ab', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    publicationService: {
      async rejectDraft() { calls += 1; }
    }
  }));

  for (const expectedReviewVersion of [undefined, '', '0', '-1', '01', '1.0', '2x']) {
    const res = response();
    await controller.rejectDraftAction({
      params: { id: '9' },
      body: {
        confirmed: 'true',
        expected_review_version: expectedReviewVersion,
        reason: 'Fachlich nicht passend'
      },
      session: { user: { id: 7, username: 'redaktion' } }
    }, res, assert.fail);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(calls, 0);
});

test('manueller Mailretry übergibt die authentifizierte Adminidentität an den Auditpfad', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    draftService: {
      async retryAdminReviewNotification(input) { received = input; }
    }
  }));
  const res = response();
  await controller.retryDraftNotificationAction({
    params: { id: '9' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);
  assert.deepEqual(received, {
    postId: 9,
    confirmed: true,
    admin: { id: 7, username: 'redaktion' }
  });
});

test('Revisionsfreigabe akzeptiert ausschließlich die literale Bestätigung true', async () => {
  const inputs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    revisionService: {
      async approveRevision(input) {
        inputs.push(input);
        if (input.confirmed !== true) throw Object.assign(new Error('Bestätigung fehlt.'), { code: 'CONTENT_CONFIRMATION_REQUIRED' });
      }
    }
  }));
  for (const confirmed of ['on', '1', 'false', undefined]) {
    const res = response();
    await controller.publishRevisionAction({
      params: { id: '3' }, body: { confirmed, expected_revision_version: '4' }, session: { user: { id: 7, username: 'admin' } }
    }, res, assert.fail);
    assert.equal(res.statusCode, 400);
  }
  const res = response();
  await controller.publishRevisionAction({
    params: { id: '3' }, body: { confirmed: 'true', expected_revision_version: '4' }, session: { user: { id: 7, username: 'admin' } }
  }, res, assert.fail);
  assert.equal(res.redirectedTo, '/admin/content-agent/existing-content?published=1');
  assert.equal(inputs.at(-1).confirmed, true);
  assert.equal(inputs.at(-1).expectedVersion, 4);
  for (const invalidVersion of ['0', '01', '1.0', '1e2', 'on', undefined]) {
    const invalidRes = response();
    await controller.publishRevisionAction({
      params: { id: '3' }, body: { confirmed: 'true', expected_revision_version: invalidVersion }, session: { user: { id: 7, username: 'admin' } }
    }, invalidRes, assert.fail);
    assert.equal(invalidRes.statusCode, 400);
  }
});

test('Ablehnungskonflikt wird als 409 ohne interne Details ausgegeben', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    publicationService: {
      async rejectDraft() {
        throw Object.assign(new Error('interner Status'), { code: 'CONTENT_DRAFT_NOT_REJECTABLE' });
      }
    }
  }));
  const res = response();

  await controller.rejectDraftAction({
    params: { id: '9' },
    body: { confirmed: 'true', expected_review_version: '2', reason: 'Grund' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);

  assert.equal(res.statusCode, 409);
  assert.doesNotMatch(res.body, /interner Status/);
});

test('Bestehende Inhalte rendert ein sicheres Präsentationsmodell statt 501', async () => {
  const rows = [{ id: 5, title: 'Artikel', content: '<p>Rohinhalt</p>' }];
  const safeItems = [{ id: 5, title: 'Artikel' }];
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: { async listExistingContent() { return rows; } },
    presentation: {
      buildExistingContentListPresentation(input) {
        assert.equal(input, rows);
        return safeItems;
      }
    }
  }));
  const res = response();

  await controller.existingContentPage({}, res, assert.fail);

  assert.deepEqual(res.rendered, {
    view: 'admin/contentAgent/existingContent',
    locals: { existingContent: safeItems }
  });
});

test('nicht-string Fehlercodes werfen nicht in der Statusabbildung', async () => {
  assert.equal(contentAgentStatus({ code: 42 }), 500);

  const unknown = Object.assign(new Error('Unbekannt'), { code: { value: 'kaputt' } });
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: { async getSettings() { throw unknown; } }
  }));
  let forwarded;

  await controller.updateSettingsAction(
    { body: {}, session: { user: {} } },
    response(),
    (error) => { forwarded = error; }
  );

  assert.equal(forwarded, unknown);
});

test('malformed FAQ-JSON aus dem Draftservice wird als sicherer 400-Fehler ausgegeben', async () => {
  const internal = Object.assign(new SyntaxError('Unexpected token < in JSON at position 0'), {
    code: 'CONTENT_DRAFT_VALIDATION_FAILED',
    issues: [{ code: 'faq_json_invalid' }]
  });
  const controller = createAdminContentAgentController(baseDependencies({
    draftService: { async updateDraft() { throw internal; } }
  }));
  const res = response();
  let forwarded;

  await controller.updateDraftAction({
    params: { id: '3' },
    body: { faqJson: '<nicht-json>' },
    session: { user: { id: 7, username: 'admin' } }
  }, res, (error) => { forwarded = error; });

  assert.equal(res.statusCode, 400);
  assert.equal(forwarded, undefined);
  assert.doesNotMatch(res.body, /Unexpected token|position 0|nicht-json/i);
});
