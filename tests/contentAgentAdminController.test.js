import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
    set(name, value) { this.headers = { ...(this.headers || {}), [name]: value }; return this; },
    send(body) { this.body = body; return this; },
    json(body) { this.jsonBody = body; return this; },
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

test('Lernregelseite und bestätigte Adminaktionen sind sicher verdrahtet', async () => {
  const calls = [];
  const learningAdminService = {
    async getDashboard() { return { proposals: [{ id: 1 }] }; },
    async activateProposal(input) { calls.push(['activate', input]); },
    async rejectProposal(input) { calls.push(['reject', input]); },
    async reviseRule(input) { calls.push(['revise', input]); },
    async changeRuleStatus(input) { calls.push(['status', input]); }
  };
  const controller = createAdminContentAgentController(baseDependencies({
    learningAdminService,
    presentation: {
      presentContentLearningDashboard(value) { return { safe: value.proposals.length }; }
    }
  }));
  const pageResponse = response();
  await controller.learningRulesPage({ query: { result: 'activated' } }, pageResponse, assert.fail);
  assert.deepEqual(pageResponse.rendered, {
    view: 'admin/contentAgent/learningRules',
    locals: { learningDashboard: { safe: 1 }, result: 'activated' }
  });

  const requests = [
    ['activateLearningProposalAction', '4', {
      confirmed: 'true', expected_version: '2', rule_text: 'Formuliere jeden CTA passend zum jeweiligen Entscheidungsschritt und vermeide inhaltlich gleiche Kontaktaufforderungen.', target_stages: ['writer', 'reviewer']
    }],
    ['rejectLearningProposalAction', '5', { confirmed: 'true', expected_version: '3' }],
    ['reviseLearningRuleAction', '6', {
      confirmed: 'true', expected_version: '4', rule_text: 'Nutze konkrete Unternehmensszenarien und setze lokale Bezüge nur ein, wenn sie die Erklärung tatsächlich verbessern.', target_stages: 'writer'
    }],
    ['changeLearningRuleStatusAction', '7', {
      confirmed: 'true', expected_version: '5', current_status: 'active', next_status: 'paused'
    }]
  ];
  for (const [action, id, body] of requests) {
    const res = response();
    await controller[action]({
      params: { id }, body, session: { user: { id: 9, username: 'Admin Ä' } }
    }, res, assert.fail);
    assert.match(res.redirectedTo, /^\/admin\/content-agent\/learning-rules\?result=/);
  }
  assert.deepEqual(calls[0][1].targetStages, ['writer', 'reviewer']);
  assert.deepEqual(calls[2][1].targetStages, ['writer']);
  assert.equal(calls[3][1].nextStatus, 'paused');
});

test('Lernregelaktionen lehnen fehlende Bestätigung und ungültige Versionen vor dem Service ab', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    learningAdminService: {
      async rejectProposal() { calls += 1; }
    }
  }));
  for (const body of [
    { confirmed: 'false', expected_version: '1' },
    { confirmed: 'true', expected_version: '1.5' }
  ]) {
    const res = response();
    await controller.rejectLearningProposalAction({
      params: { id: '3' }, body, session: { user: { id: 9, username: 'Admin' } }
    }, res, assert.fail);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(calls, 0);
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

test('gezielte Prüfhinweis-Optimierung reiht Einzel- und Sammelmodus mit Versionsfence ein', async () => {
  const jobs = [];
  const review = {
    blocked: false,
    items: [
      { code: 'review_issue_1', instruction: 'CTA präzisieren.' },
      { code: 'review_issue_2', instruction: 'Beispiel konkretisieren.' }
    ]
  };
  const controller = createAdminContentAgentController(baseDependencies({
    runtimeConfig: { enabled: true, maxAttempts: 3, autoPublishEnabled: false },
    settingsRepository: {
      async getSettings() { return { agent_enabled: true, maximum_attempts: 5 }; }
    },
    draftService: {
      async getDraftForReview(postId) {
        return { id: postId, reviewVersion: 3, riskReview: review };
      }
    },
    jobRepository: {
      async enqueueReviewOptimizationJob(input) {
        jobs.push(input);
        return { id: 41, status: 'queued' };
      }
    }
  }));

  for (const body of [
    {
      confirmed: 'true', expected_review_version: '3',
      issue_mode: 'single', issue_index: '1'
    },
    {
      confirmed: 'true', expected_review_version: '3', issue_mode: 'all'
    }
  ]) {
    const res = response();
    await controller.optimizeReviewIssuesAction({
      params: { id: '19' },
      body,
      session: { user: { id: 7, username: 'admin' } }
    }, res, assert.fail);
    assert.equal(res.redirectedTo, '/admin/content-agent/drafts/19/edit?review_optimization=queued');
  }

  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs[0], {
    postId: 19,
    expectedReviewVersion: 3,
    issueMode: 'single',
    issueIndex: 1,
    maxAttempts: 3
  });
  assert.deepEqual(jobs[1], {
    postId: 19,
    expectedReviewVersion: 3,
    issueMode: 'all',
    issueIndex: null,
    maxAttempts: 3
  });
});

test('Prüfhinweis-Optimierung lehnt veraltete, blockierte und ungültige Auswahl ohne Job ab', async () => {
  for (const { body, riskReview } of [
    {
      body: { confirmed: 'true', expected_review_version: '2', issue_mode: 'all' },
      riskReview: { blocked: false, items: [{ code: 'review_issue_1' }] }
    },
    {
      body: { confirmed: 'true', expected_review_version: '3', issue_mode: 'all' },
      riskReview: { blocked: true, items: [{ code: 'review_issue_1' }] }
    },
    {
      body: {
        confirmed: 'true', expected_review_version: '3',
        issue_mode: 'single', issue_index: '4'
      },
      riskReview: { blocked: false, items: [{ code: 'review_issue_1' }] }
    }
  ]) {
    let enqueueCalls = 0;
    const controller = createAdminContentAgentController(baseDependencies({
      settingsRepository: {
        async getSettings() { return { agent_enabled: true, maximum_attempts: 3 }; }
      },
      draftService: {
        async getDraftForReview() {
          return { reviewVersion: 3, riskReview };
        }
      },
      jobRepository: {
        async enqueueReviewOptimizationJob() { enqueueCalls += 1; return { id: 1 }; }
      }
    }));
    const res = response();
    await controller.optimizeReviewIssuesAction({
      params: { id: '19' }, body, session: { user: { id: 7, username: 'admin' } }
    }, res, assert.fail);
    assert.equal(enqueueCalls, 0);
    assert.equal(res.statusCode, 409);
  }
});

test('terminaler bestehender Optimierungsjob wird nicht als neu eingeplant gemeldet', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() { return { agent_enabled: true, maximum_attempts: 3 }; }
    },
    draftService: {
      async getDraftForReview() {
        return {
          reviewVersion: 3,
          riskReview: { blocked: false, items: [{ code: 'review_issue_1' }] }
        };
      }
    },
    jobRepository: {
      async enqueueReviewOptimizationJob() {
        return { id: 41, status: 'needs_manual_attention' };
      }
    }
  }));
  const res = response();

  await controller.optimizeReviewIssuesAction({
    params: { id: '19' },
    body: { confirmed: 'true', expected_review_version: '3', issue_mode: 'all' }
  }, res, assert.fail);

  assert.equal(res.statusCode, 409);
  assert.equal(res.redirectedTo, undefined);
});

test('Entwurfseditor erhält den bereinigten Livezustand der letzten Fehlerbehebung', async () => {
  const job = {
    id: 41, status: 'running', attempts: 1, max_attempts: 3,
    expected_review_version: 3,
    updated_at: '2026-07-14T10:01:00.000Z'
  };
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() { return { timezone: 'Europe/Berlin' }; }
    },
    draftService: {
      async getDraftForReview(postId) {
        return { id: postId, reviewVersion: 3, riskReview: { blocked: false, items: [] } };
      }
    },
    jobRepository: {
      async getLatestReviewOptimizationJob(input) {
        assert.deepEqual(input, { postId: 19 });
        return job;
      }
    }
  }));
  const res = response();

  await controller.draftEditPage({ params: { id: '19' }, query: {} }, res, assert.fail);

  assert.equal(res.rendered.view, 'admin/contentAgent/draftEdit');
  assert.deepEqual(res.rendered.locals.draft.reviewOptimizationStatus, {
    state: 'running', active: true, blocksActions: true, jobId: 41,
    attempts: 1, maxAttempts: 3,
    message: 'Die Fehlerbehebung wird gerade ausgeführt.',
    updatedAt: '2026-07-14T10:01:00.000Z', reloadRecommended: false
  });
});

test('geschützter Statusendpunkt liefert ausschließlich die bereinigte Optimierungsdarstellung', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    draftService: {
      async getDraftForReview(postId) {
        assert.equal(postId, 19);
        return { id: postId, reviewVersion: 4 };
      }
    },
    jobRepository: {
      async getLatestReviewOptimizationJob() {
        return {
          id: 41, status: 'completed', attempts: 1, max_attempts: 3,
          expected_review_version: 3,
          updated_at: '2026-07-14T10:03:00.000Z',
          provider_payload: { apiKey: 'darf-nicht-ausgegeben-werden' }
        };
      }
    }
  }));
  const res = response();

  await controller.reviewOptimizationStatusAction({ params: { id: '19' } }, res, assert.fail);

  assert.deepEqual(res.jsonBody, {
    state: 'completed', active: false, blocksActions: false, jobId: 41,
    attempts: 1, maxAttempts: 3,
    message: 'Die Fehlerbehebung wurde erfolgreich abgeschlossen.',
    updatedAt: '2026-07-14T10:03:00.000Z', reloadRecommended: true
  });
  assert.equal(JSON.stringify(res.jsonBody).includes('apiKey'), false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
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
  assert.match(calls[0].sql, /^WITH locked_job AS MATERIALIZED/i);
  assert.match(calls[0].sql, /WHERE job\.job_type <> 'send_admin_review_notification' AND job\.status IN \('failed', 'needs_manual_attention'\)/i);
  assert.match(calls[0].sql, /COALESCE\(job\.last_error, ''\) <> 'provider_execution_uncertain'/i);
  assert.match(calls[0].sql, /attempts < \$2/i);
  assert.doesNotMatch(calls[0].sql, /INSERT INTO|;\s*SELECT/i);
  assert.match(calls[0].sql, /locked_run AS MATERIALIZED[\s\S]*jsonb_each/i);
  assert.match(calls[0].sql, /reopened_run AS \([\s\S]*UPDATE content_runs AS run/i);
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

test('Providerwiederherstellung verlangt eine literale kritische Bestätigung', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverUncertainProviderJobForAdmin() {
        calls += 1;
        return { job: { id: 19 } };
      }
    }
  }));

  for (const confirmed of [undefined, 'on', '1', 'false', false]) {
    const res = response();
    await controller.recoverProviderJobAction({
      params: { id: '19' },
      body: { confirmed },
      session: { user: { id: 7, username: 'redaktion' } }
    }, res, assert.fail);
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /Bestätigung fehlt/);
  }
  assert.equal(calls, 0);
});

test('bestätigte Providerwiederherstellung verwendet kanonische Job- und Admin-ID', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverUncertainProviderJobForAdmin(input) {
        received = input;
        return { job: { id: 19, status: 'queued' } };
      }
    }
  }));
  const res = response();

  await controller.recoverProviderJobAction({
    params: { id: '19' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);

  assert.deepEqual(received, { jobId: 19, adminId: 7 });
  assert.equal(res.redirectedTo, '/admin/content-agent/jobs?provider-recovery=queued');
});

test('veraltete Providerwiederherstellung wird ohne interne Details als Konflikt ausgegeben', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverUncertainProviderJobForAdmin() { return null; }
    }
  }));
  const res = response();

  await controller.recoverProviderJobAction({
    params: { id: '19' },
    body: { confirmed: 'true' },
    session: { user: { id: 7 } }
  }, res, assert.fail);

  assert.equal(res.statusCode, 409);
  assert.match(res.body, /nicht mehr verfügbar/i);
  assert.doesNotMatch(res.body, /Providerreservierung|SQL|JSON/i);
});

test('bestätigte Schemawiederaufnahme verwendet kanonische Job- und Admin-ID', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverRejectedProviderJobForAdmin(input) {
        received = input;
        return { job: { id: 19, status: 'queued' } };
      }
    }
  }));
  assert.equal(typeof controller.recoverRejectedProviderJobAction, 'function');
  const res = response();

  await controller.recoverRejectedProviderJobAction({
    params: { id: '19' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);

  assert.deepEqual(received, { jobId: 19, adminId: 7 });
  assert.equal(res.redirectedTo, '/admin/content-agent/jobs?provider-recovery=queued');
});

test('Schemawiederaufnahme verlangt eine literale kritische Bestätigung', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverRejectedProviderJobForAdmin() {
        calls += 1;
        return { job: { id: 19 } };
      }
    }
  }));
  assert.equal(typeof controller.recoverRejectedProviderJobAction, 'function');
  const res = response();

  await controller.recoverRejectedProviderJobAction({
    params: { id: '19' },
    body: { confirmed: 'on' },
    session: { user: { id: 7 } }
  }, res, assert.fail);

  assert.equal(calls, 0);
  assert.equal(res.statusCode, 400);
});

test('bestätigte Qualitätswiederaufnahme verwendet IDs und technische Revisionsgrenze', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    runtimeConfig: {
      enabled: true,
      maxAttempts: 3,
      maxRevisions: 2,
      monthlyCostLimitEur: 25,
      autoPublishEnabled: false
    },
    jobRepository: {
      async recoverQualityGateJobForAdmin(input) {
        received = input;
        return { job: { id: 19, status: 'queued' } };
      }
    }
  }));
  assert.equal(typeof controller.recoverQualityGateJobAction, 'function');
  const res = response();

  await controller.recoverQualityGateJobAction({
    params: { id: '19' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);

  assert.deepEqual(received, { jobId: 19, adminId: 7, baseMaxRevisions: 2 });
  assert.equal(res.redirectedTo, '/admin/content-agent/jobs?quality-recovery=queued');
});

test('Qualitätswiederaufnahme verlangt eine literale kritische Bestätigung', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    runtimeConfig: { enabled: true, maxAttempts: 3, maxRevisions: 2 },
    jobRepository: {
      async recoverQualityGateJobForAdmin() {
        calls += 1;
        return { job: { id: 19 } };
      }
    }
  }));
  const res = response();

  await controller.recoverQualityGateJobAction({
    params: { id: '19' },
    body: { confirmed: 'on' },
    session: { user: { id: 7 } }
  }, res, assert.fail);

  assert.equal(calls, 0);
  assert.equal(res.statusCode, 400);
});

test('bestätigte Manifestwiederaufnahme verwendet ausschließlich kanonische Job- und Admin-ID', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverQualityGateRuleManifestForAdmin(input) {
        received = input;
        return { job: { id: 19, status: 'queued' } };
      }
    }
  }));
  assert.equal(typeof controller.recoverQualityGateRuleManifestAction, 'function');
  const res = response();

  await controller.recoverQualityGateRuleManifestAction({
    params: { id: '19' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);

  assert.deepEqual(received, { jobId: 19, adminId: 7 });
  assert.equal(res.redirectedTo, '/admin/content-agent/jobs?rule-manifest-recovery=queued');
});

test('Manifestwiederaufnahme verlangt eine literale kritische Bestätigung', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverQualityGateRuleManifestForAdmin() {
        calls += 1;
        return { job: { id: 19 } };
      }
    }
  }));
  const res = response();

  await controller.recoverQualityGateRuleManifestAction({
    params: { id: '19' },
    body: { confirmed: 'on' },
    session: { user: { id: 7 } }
  }, res, assert.fail);

  assert.equal(calls, 0);
  assert.equal(res.statusCode, 400);
});

test('bestätigte redaktionelle Neuprüfung verwendet ausschließlich die kanonischen IDs', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverEditorialReviewForAdmin(input) {
        received = input;
        return { job: { id: 19, status: 'queued' } };
      }
    }
  }));
  assert.equal(typeof controller.recoverEditorialReviewAction, 'function');
  const res = response();

  await controller.recoverEditorialReviewAction({
    params: { id: '19' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);

  assert.deepEqual(received, { jobId: 19, adminId: 7 });
  assert.equal(res.redirectedTo, '/admin/content-agent/jobs?editorial-review-recovery=queued');
});

test('redaktionelle Neuprüfung verlangt eine literale kritische Bestätigung', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverEditorialReviewForAdmin() {
        calls += 1;
        return { job: { id: 19 } };
      }
    }
  }));
  const res = response();

  await controller.recoverEditorialReviewAction({
    params: { id: '19' },
    body: { confirmed: 'on' },
    session: { user: { id: 7 } }
  }, res, assert.fail);

  assert.equal(calls, 0);
  assert.equal(res.statusCode, 400);
});

test('bestätigte Entwurfsfertigstellung verwendet ausschließlich die kanonischen IDs', async () => {
  let received;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverDraftPersistenceForAdmin(input) {
        received = input;
        return { job: { id: 19, status: 'queued' } };
      }
    }
  }));
  assert.equal(typeof controller.recoverDraftPersistenceAction, 'function');
  const res = response();

  await controller.recoverDraftPersistenceAction({
    params: { id: '19' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'redaktion' } }
  }, res, assert.fail);

  assert.deepEqual(received, { jobId: 19, adminId: 7 });
  assert.equal(res.redirectedTo, '/admin/content-agent/jobs?draft-persistence-recovery=queued');
});

test('Entwurfsfertigstellung verlangt eine literale kritische Bestätigung', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async recoverDraftPersistenceForAdmin() {
        calls += 1;
        return { job: { id: 19 } };
      }
    }
  }));
  const res = response();

  await controller.recoverDraftPersistenceAction({
    params: { id: '19' },
    body: { confirmed: 'on' },
    session: { user: { id: 7 } }
  }, res, assert.fail);

  assert.equal(calls, 0);
  assert.equal(res.statusCode, 400);
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

test('Bestehende Inhalte rendert gruppierte Inhalte und nur allowlistete Sichtbarkeitsmeldungen', async () => {
  const rows = [{ id: 5, title: 'Artikel', content: '<p>Rohinhalt</p>' }];
  const safeGroups = {
    totalCount: 1,
    visibleArticles: [{ id: 5, title: 'Artikel' }],
    collectingArticles: [],
    zeroImpressionArticles: [],
    hiddenZeroImpressionArticles: []
  };
  const rawLegacyDashboard = {
    totalCount: 0,
    readyStatic: [],
    reviewRequired: [],
    blocked: [],
    migrated: []
  };
  const safeLegacyDashboard = {
    totalCount: 0,
    readyStaticCount: 0,
    reviewRequiredCount: 0,
    blockedCount: 0,
    migratedCount: 0
  };
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: { async listExistingContent() { return rows; } },
    legacyMigrationService: {
      async getDashboard() { return rawLegacyDashboard; }
    },
    presentation: {
      buildExistingContentGroupsPresentation(input) {
        assert.equal(input, rows);
        return safeGroups;
      },
      presentLegacyMigrationDashboard(input) {
        assert.equal(input, rawLegacyDashboard);
        return safeLegacyDashboard;
      }
    }
  }));
  const res = response();

  await controller.existingContentPage({ query: { visibility: 'hidden' } }, res, assert.fail);

  assert.deepEqual(res.rendered, {
    view: 'admin/contentAgent/existingContent',
    locals: {
      existingContentGroups: safeGroups,
      visibilityMessage: 'Der Artikel wurde aus der Null-Impressions-Arbeitsansicht ausgeblendet.',
      legacyMigrationDashboard: safeLegacyDashboard,
      legacyMigrationMessage: null
    }
  });

  const invalid = response();
  await controller.existingContentPage({ query: { visibility: '<script>' } }, invalid, assert.fail);
  assert.equal(invalid.rendered.locals.visibilityMessage, null);
});

test('Legacy-Migration bietet geschützte Vorschau und ausschließlich bestätigte Schreibaktionen', async () => {
  const calls = [];
  const legacyMigrationService = {
    async getPreview(input) {
      calls.push(['preview', input]);
      return { id: 8, canMigrate: true };
    },
    async scan(input) {
      calls.push(['scan', input]);
      return { scanned: 2, ready: 1, blocked: 1 };
    },
    async migrateSafeBatch(input) {
      calls.push(['batch', input]);
      return { migrated: 1, skipped: 1, blocked: 0, failed: 0 };
    },
    async migrateOne(input) {
      calls.push(['migrate', input]);
      return { status: 'migrated' };
    },
    async rollback(input) {
      calls.push(['rollback', input]);
      return { status: 'rolled_back' };
    }
  };
  const controller = createAdminContentAgentController(baseDependencies({
    legacyMigrationService,
    revisionService: {
      async getTrustedInternalLinks() {
        return ['/kontakt', '/pakete'];
      }
    }
  }));
  const session = { user: { id: 7, username: 'admin' } };

  const previewResponse = response();
  previewResponse.locals = { packagePricing: { packages: [] } };
  await controller.legacyMigrationPreviewPage({
    params: { migrationId: '8' },
    session
  }, previewResponse, assert.fail);
  assert.equal(previewResponse.rendered.view, 'admin/contentAgent/legacyMigrationPreview');
  assert.equal(previewResponse.rendered.locals.migration.id, 8);
  assert.equal(previewResponse.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(previewResponse.headers['Cache-Control'], 'no-store');

  for (const action of [
    'legacyMigrationScanAction',
    'legacyMigrationBatchAction',
    'legacyMigrationMigrateAction',
    'legacyMigrationRollbackAction'
  ]) {
    const denied = response();
    await controller[action]({
      params: { migrationId: '8' },
      body: {},
      session
    }, denied, assert.fail);
    assert.equal(denied.statusCode, 400);
    assert.equal(denied.body, 'Die erforderliche Bestätigung fehlt.');
  }

  const scanResponse = response();
  scanResponse.locals = { packagePricing: { packages: [] } };
  await controller.legacyMigrationScanAction({
    body: { confirmed: 'true' },
    session
  }, scanResponse, assert.fail);
  assert.equal(
    scanResponse.redirectedTo,
    '/admin/content-agent/existing-content?legacy=scan-complete&scanned=2&ready=1&blocked=1'
  );

  const batchResponse = response();
  await controller.legacyMigrationBatchAction({
    body: { confirmed: 'true' },
    session
  }, batchResponse, assert.fail);
  assert.equal(
    batchResponse.redirectedTo,
    '/admin/content-agent/existing-content?legacy=batch-complete&migrated=1&skipped=1&blocked=0&failed=0'
  );

  const migrateResponse = response();
  await controller.legacyMigrationMigrateAction({
    params: { migrationId: '8' },
    body: { confirmed: 'true' },
    session
  }, migrateResponse, assert.fail);
  assert.equal(
    migrateResponse.redirectedTo,
    '/admin/content-agent/existing-content?legacy=migrated'
  );

  const rollbackResponse = response();
  await controller.legacyMigrationRollbackAction({
    params: { migrationId: '8' },
    body: { confirmed: 'true' },
    session
  }, rollbackResponse, assert.fail);
  assert.equal(
    rollbackResponse.redirectedTo,
    '/admin/content-agent/existing-content?legacy=rolled-back'
  );

  assert.equal(calls.filter(([type]) => type === 'scan').length, 1);
  assert.deepEqual(calls.find(([type]) => type === 'scan')[1].allowedInternalLinks, [
    '/kontakt',
    '/pakete'
  ]);
});

test('Einzelaktionen blenden ausschließlich serverseitig geprüfte Artikel ein und aus', async () => {
  const calls = [];
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async setExistingContentZeroImpressionHidden(input) {
        calls.push(input);
        return { status: 'updated' };
      }
    }
  }));

  const hidden = response();
  await controller.hideZeroImpressionAction({ params: { id: '19' } }, hidden, assert.fail);
  const shown = response();
  await controller.showZeroImpressionAction({ params: { id: '20' } }, shown, assert.fail);

  assert.deepEqual(calls, [
    { postId: 19, hidden: true },
    { postId: 20, hidden: false }
  ]);
  assert.equal(
    hidden.redirectedTo,
    '/admin/content-agent/existing-content?visibility=hidden'
  );
  assert.equal(
    shown.redirectedTo,
    '/admin/content-agent/existing-content?visibility=shown'
  );
});

test('Sammelaktionen ändern keine vom Browser übermittelte Artikelauswahl', async () => {
  const calls = [];
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async setAllExistingContentZeroImpressionHidden(hidden) {
        calls.push(hidden);
        return { changedCount: 3 };
      }
    }
  }));

  const hidden = response();
  await controller.hideAllZeroImpressionsAction({
    body: { post_ids: [1, 2], impressions: 0 }
  }, hidden, assert.fail);
  const shown = response();
  await controller.showAllZeroImpressionsAction({
    body: { post_ids: [9], hidden: true }
  }, shown, assert.fail);

  assert.deepEqual(calls, [true, false]);
  assert.equal(
    hidden.redirectedTo,
    '/admin/content-agent/existing-content?visibility=all-hidden'
  );
  assert.equal(
    shown.redirectedTo,
    '/admin/content-agent/existing-content?visibility=all-shown'
  );
});

test('Sichtbarkeitsaktionen liefern sichere 404-, 409- und Validierungsantworten', async () => {
  for (const scenario of [
    { status: 'not_found', expectedStatus: 404, forbidden: 'interne Datenbank-ID' },
    { status: 'not_eligible', expectedStatus: 409, forbidden: 'interner Snapshotfehler' }
  ]) {
    const controller = createAdminContentAgentController(baseDependencies({
      adminRepository: {
        async setExistingContentZeroImpressionHidden() {
          return scenario.status === 'not_found'
            ? { status: scenario.status, internal: 'interne Datenbank-ID' }
            : { status: scenario.status, internal: 'interner Snapshotfehler' };
        }
      }
    }));
    const res = response();
    await controller.hideZeroImpressionAction({ params: { id: '19' } }, res, assert.fail);
    assert.equal(res.statusCode, scenario.expectedStatus);
    assert.doesNotMatch(res.body, new RegExp(scenario.forbidden, 'i'));
  }

  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async setExistingContentZeroImpressionHidden() {
        assert.fail('Ungültige IDs dürfen das Repository nicht erreichen.');
      }
    }
  }));
  const invalid = response();
  await controller.hideZeroImpressionAction({ params: { id: '2147483648' } }, invalid, assert.fail);
  assert.equal(invalid.statusCode, 400);
});

test('Artikel-Performance rendert ausschließlich das sichere Detailmodell', async () => {
  const raw = { post: { id: 5, title: 'Artikel' }, snapshot: { id: 9 } };
  const safe = { post: { id: 5, title: 'Artikel' }, hasSnapshot: true };
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: { async getArticlePerformanceDetail(postId) { assert.equal(postId, 5); return raw; } },
    presentation: {
      presentArticlePerformanceDetail(value) { assert.equal(value, raw); return safe; }
    }
  }));
  const res = response();
  await controller.articlePerformancePage({ params: { id: '5' } }, res, assert.fail);
  assert.deepEqual(res.rendered, {
    view: 'admin/contentAgent/articlePerformance',
    locals: { performance: safe }
  });
});

test('Artikel-Performance liefert für unbekannte veröffentlichte Artikel 404', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: { async getArticlePerformanceDetail() { return null; } },
    presentation: { presentArticlePerformanceDetail() { assert.fail('Präsentation darf nicht laufen'); } }
  }));
  const res = response();
  await controller.articlePerformancePage({ params: { id: '5' } }, res, assert.fail);
  assert.equal(res.statusCode, 404);
});

test('Performance-Revision verlangt Bestätigung und reicht nur gebundene Evidenz weiter', async () => {
  const calls = [];
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: { async getSettings() { return { agent_enabled: true, maximum_attempts: 3 }; } },
    revisionService: {
      async prepareExistingPostOptimization(postId) {
        assert.equal(postId, 5);
        return { baseLiveHash: 'b'.repeat(64) };
      }
    },
    jobRepository: {
      async enqueuePerformanceRevisionJob(input) {
        calls.push(input);
        return { id: 81, status: 'queued' };
      }
    }
  }));
  const rejected = response();
  await controller.createPerformanceRevisionAction({
    params: { id: '5' }, body: {}, session: { user: { id: 7, username: 'Admin' } }
  }, rejected, assert.fail);
  assert.equal(rejected.statusCode, 400);

  const accepted = response();
  await controller.createPerformanceRevisionAction({
    params: { id: '5' },
    body: { confirmation: 'performance_revision', snapshot_id: '9', evidence_hash: 'a'.repeat(64) },
    session: { user: { id: 7, username: 'Admin' } }
  }, accepted, assert.fail);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    postId: 5,
    adminId: 7,
    baseLiveHash: 'b'.repeat(64),
    snapshotId: 9,
    evidenceHash: 'a'.repeat(64),
    maxAttempts: 3
  });
  assert.equal(accepted.redirectedTo, '/admin/content-agent/existing-content/5/performance?revision=queued');
});

test('Startaktion erzwingt Agent-Aktivierung und ausschließlich serverseitigen Minimalpayload', async () => {
  let enqueued = null;
  let prepared = null;
  const liveHash = 'a'.repeat(64);
  const controller = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() {
        return { agent_enabled: true, maximum_attempts: 5 };
      }
    },
    revisionService: {
      async prepareExistingPostOptimization(postId) {
        prepared = postId;
        return { baseLiveHash: liveHash };
      }
    },
    jobRepository: {
      async enqueueExistingPostOptimizationJob(input) {
        enqueued = input;
        return { id: 44, status: 'queued' };
      }
    }
  }));
  const res = response();

  await controller.optimizeExistingContentAction({
    params: { id: '19' },
    body: {
      post_id: 999,
      admin_id: 999,
      base_live_hash: 'b'.repeat(64),
      max_attempts: 999,
      payload: { provider: 'nicht erlaubt' }
    },
    session: { user: { id: 7, username: 'Admin' } }
  }, res, assert.fail);

  assert.equal(prepared, 19);
  assert.equal(enqueued.jobType, 'optimize_existing_post');
  assert.match(enqueued.idempotencyKey, /^existing-post-optimization:19:[0-9a-f-]+$/i);
  assert.deepEqual(enqueued.payload, {
    source: 'admin_existing_content',
    post_id: 19,
    admin_id: 7,
    base_live_hash: liveHash
  });
  assert.equal(enqueued.maxAttempts, 3);
  assert.equal(res.redirectedTo, '/admin/content-agent/existing-content?optimization=queued');
});

test('Startaktion öffnet eine bereits vorhandene Draft-Revision statt einen zweiten KI-Job abzulehnen', async () => {
  let prepared = 0;
  let enqueued = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async getExistingContentOptimizationState(postId) {
        assert.equal(postId, 19);
        return {
          id: 19,
          open_draft_revision_id: 71,
          has_draft_revision: true
        };
      }
    },
    settingsRepository: {
      async getSettings() {
        return { agent_enabled: true, maximum_attempts: 3 };
      }
    },
    revisionService: {
      async prepareExistingPostOptimization() {
        prepared += 1;
        return { baseLiveHash: 'a'.repeat(64) };
      }
    },
    jobRepository: {
      async enqueueExistingPostOptimizationJob() {
        enqueued += 1;
        return { id: 44, status: 'queued' };
      }
    }
  }));
  const res = response();

  await controller.optimizeExistingContentAction({
    params: { id: '19' },
    session: { user: { id: 7, username: 'Admin' } }
  }, res, assert.fail);

  assert.equal(prepared, 0);
  assert.equal(enqueued, 0);
  assert.equal(
    res.redirectedTo,
    '/admin/content-agent/revisions/71/edit?optimization=revision-open'
  );
});

test('deaktivierter Agent und ungültige PostgreSQL-INT32-IDs verhindern die Bestandsoptimierung', async () => {
  let prepares = 0;
  let enqueues = 0;
  const disabled = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() { return { agent_enabled: false, maximum_attempts: 3 }; }
    },
    revisionService: {
      async prepareExistingPostOptimization() { prepares += 1; }
    },
    jobRepository: {
      async enqueueExistingPostOptimizationJob() { enqueues += 1; }
    }
  }));
  const disabledResponse = response();
  await disabled.optimizeExistingContentAction({
    params: { id: '19' }, session: { user: { id: 7, username: 'Admin' } }
  }, disabledResponse, assert.fail);
  assert.equal(disabledResponse.statusCode, 409);
  assert.equal(prepares, 0);
  assert.equal(enqueues, 0);

  const enabled = createAdminContentAgentController(baseDependencies({
    settingsRepository: {
      async getSettings() { return { agent_enabled: true, maximum_attempts: 3 }; }
    },
    revisionService: {
      async prepareExistingPostOptimization() { prepares += 1; return { baseLiveHash: 'a'.repeat(64) }; }
    },
    jobRepository: {
      async enqueueExistingPostOptimizationJob() { enqueues += 1; return { id: 44, status: 'queued' }; }
    }
  }));
  for (const [id, adminId] of [
    ['0', 7], ['01', 7], ['2147483648', 7], ['19', 0], ['19', 2147483648]
  ]) {
    const invalidResponse = response();
    await enabled.optimizeExistingContentAction({
      params: { id }, session: { user: { id: adminId, username: 'Admin' } }
    }, invalidResponse, assert.fail);
    assert.equal(invalidResponse.statusCode, 400);
  }
  assert.equal(enqueues, 0);
});

test('Statusroute sendet no-store und ausschließlich das allowlistete Präsentationsmodell', async () => {
  const raw = {
    id: 19,
    optimization_job_id: 44,
    optimization_job_status: 'running',
    provider_secret: 'sk-darf-nicht-raus'
  };
  const safe = {
    state: 'running',
    active: true,
    statusLabel: 'In Bearbeitung',
    stageLabel: 'Gezielte Optimierung'
  };
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async getExistingContentOptimizationState(postId) {
        assert.equal(postId, 19);
        return raw;
      }
    },
    presentation: {
      presentExistingContentOptimizationState(input) {
        assert.equal(input, raw);
        return safe;
      }
    }
  }));
  const res = response();

  await controller.existingContentOptimizationStatusAction({ params: { id: '19' } }, res, assert.fail);

  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(res.jsonBody, safe);
  assert.doesNotMatch(JSON.stringify(res.jsonBody), /provider|secret|stage_results_json/i);
});

test('Statusroute gibt für unveröffentlichte oder fehlende Artikel sicher 404 aus', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async getExistingContentOptimizationState() { return null; }
    },
    presentation: {
      presentExistingContentOptimizationState() { assert.fail('Präsentation darf nicht laufen'); }
    }
  }));
  const res = response();

  await controller.existingContentOptimizationStatusAction({ params: { id: '19' } }, res, assert.fail);

  assert.equal(res.statusCode, 404);
  assert.doesNotMatch(res.body, /Datenbank|SQL|Provider/i);
});

test('Statusroute setzt no-store auch bei einer ungültigen Pfad-ID', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    adminRepository: {
      async getExistingContentOptimizationState() { assert.fail('Repository darf nicht laufen'); }
    },
    presentation: {
      presentExistingContentOptimizationState() { assert.fail('Präsentation darf nicht laufen'); }
    }
  }));
  const res = response();

  await controller.existingContentOptimizationStatusAction({ params: { id: '01' } }, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.headers['Cache-Control'], 'no-store');
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

test('authentifizierte Vergleichsroute ist ausschließlich als geschützter GET-Endpunkt verdrahtet', async () => {
  const routes = await readFile(new URL('../routes/adminContentAgentRoutes.js', import.meta.url), 'utf8');

  assert.match(
    routes,
    /router\.get\('\/admin\/content-agent\/revisions\/:id\/compare',\s*isAdmin,\s*controller\.revisionComparePage\)/
  );
  assert.doesNotMatch(
    routes,
    /router\.(?:post|put|patch|delete)\('\/admin\/content-agent\/revisions\/:id\/compare'/
  );
});

test('Vergleichsseite setzt noindex und rendert ausschließlich das sichere Präsentationsmodell', async () => {
  const rawRevision = {
    id: 71,
    snapshot_json: { fields: { content: '<script>roh</script>' } },
    optimization_report_json: { providerResponse: 'darf nicht in die View' }
  };
  const safeComparison = {
    revisionId: 71,
    live: { title: 'Live', contentHtml: '<p>Alt.</p>' },
    optimized: { title: 'Optimiert', contentHtml: '<p>Neu.</p>' },
    changes: [], changeGroups: [], sources: [], gscSignals: []
  };
  let receivedRevision;
  const controller = createAdminContentAgentController(baseDependencies({
    revisionService: {
      async getRevisionComparison(revisionId) {
        assert.equal(revisionId, 71);
        return rawRevision;
      }
    },
    presentation: {
      buildRevisionComparisonPresentation(revision) {
        receivedRevision = revision;
        return safeComparison;
      }
    }
  }));
  const res = response();

  await controller.revisionComparePage({ params: { id: '71' } }, res, assert.fail);

  assert.equal(receivedRevision, rawRevision);
  assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(res.rendered, {
    view: 'admin/contentAgent/revisionCompare',
    locals: { comparison: safeComparison }
  });
});

test('Vergleichsseite verwirft ungültige IDs vor Repository und Präsentation', async () => {
  let reads = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    revisionService: {
      async getRevisionComparison() { reads += 1; }
    },
    presentation: {
      buildRevisionComparisonPresentation() { assert.fail('ungültige Revision darf nicht präsentiert werden'); }
    }
  }));

  for (const id of ['0', '-1', '<script>', '1.5']) {
    const res = response();
    await controller.revisionComparePage({ params: { id } }, res, assert.fail);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(reads, 0);
});

test('Rücknahmecontroller akzeptiert nur kanonische PG-INT32-Werte und eine exakte SHA-256-ID', async () => {
  const inputs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    revisionService: {
      async revertOptimizationChange(input) { inputs.push(input); }
    }
  }));
  const changeId = 'a'.repeat(64);
  const res = response();
  await controller.revertOptimizationChangeAction({
    params: { id: '71', changeId },
    body: { expected_revision_version: '3' },
    session: { user: { id: 7, username: 'Redaktion' } }
  }, res, assert.fail);
  assert.equal(res.redirectedTo, '/admin/content-agent/revisions/71/compare?change_reverted=1');
  assert.deepEqual(inputs[0], {
    revisionId: 71,
    changeId,
    expectedVersion: 3,
    admin: { id: 7, username: 'Redaktion' }
  });

  for (const invalid of [
    { id: '2147483648', changeId, version: '3' },
    { id: '71', changeId: 'A'.repeat(64), version: '3' },
    { id: '71', changeId: `${changeId}%20`, version: '3' },
    { id: '71', changeId, version: '2147483648' },
    { id: '71', changeId, version: '03' }
  ]) {
    const invalidRes = response();
    await controller.revertOptimizationChangeAction({
      params: { id: invalid.id, changeId: invalid.changeId },
      body: { expected_revision_version: invalid.version },
      session: { user: { id: 7, username: 'Redaktion' } }
    }, invalidRes, assert.fail);
    assert.equal(invalidRes.statusCode, 400);
  }
  assert.equal(inputs.length, 1);
});

test('Ablehnungscontroller verlangt die literale Bestätigung und leitet Konflikte sicher weiter', async () => {
  const inputs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    revisionService: {
      async rejectOptimizationRevision(input) {
        inputs.push(input);
        if (input.expectedVersion === 4) {
          throw Object.assign(new Error('interner Revisionszustand'), {
            code: 'CONTENT_REVISION_CONFLICT'
          });
        }
      }
    }
  }));
  const res = response();
  await controller.rejectOptimizationRevisionAction({
    params: { id: '71' },
    body: { expected_revision_version: '3', confirmed: 'true' },
    session: { user: { id: 7, username: 'Redaktion' } }
  }, res, assert.fail);
  assert.equal(res.redirectedTo, '/admin/content-agent/existing-content?revision_rejected=1');
  assert.deepEqual(inputs[0], {
    revisionId: 71,
    expectedVersion: 3,
    confirmed: true,
    admin: { id: 7, username: 'Redaktion' }
  });

  for (const confirmed of [undefined, 'on', '1', 'false']) {
    const invalidRes = response();
    await controller.rejectOptimizationRevisionAction({
      params: { id: '71' },
      body: { expected_revision_version: '3', confirmed },
      session: { user: { id: 7, username: 'Redaktion' } }
    }, invalidRes, assert.fail);
    assert.equal(invalidRes.statusCode, 400);
  }

  const conflictRes = response();
  await controller.rejectOptimizationRevisionAction({
    params: { id: '71' },
    body: { expected_revision_version: '4', confirmed: 'true' },
    session: { user: { id: 7, username: 'Redaktion' } }
  }, conflictRes, assert.fail);
  assert.equal(conflictRes.statusCode, 409);
  assert.doesNotMatch(conflictRes.body, /interner Revisionszustand/);
});

test('Controller verwirft manuelle Revisionen nur bestätigt und mit exakter Version', async () => {
  const inputs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    revisionService: {
      async discardManualRevision(input) {
        inputs.push(input);
        return { id: 9, status: 'rejected' };
      }
    }
  }));

  const res = response();
  await controller.discardManualRevisionAction({
    params: { id: '9' },
    body: { expected_revision_version: '2', confirmed: 'true' },
    session: { user: { id: 7, username: 'Redaktion' } }
  }, res, assert.fail);
  assert.equal(res.redirectedTo, '/admin/content-agent/existing-content?revision_discarded=1');
  assert.deepEqual(inputs[0], {
    revisionId: 9,
    expectedVersion: 2,
    confirmed: true,
    admin: { id: 7, username: 'Redaktion' }
  });

  for (const body of [
    { expected_revision_version: '2', confirmed: 'on' },
    { expected_revision_version: '02', confirmed: 'true' },
    { expected_revision_version: '0', confirmed: 'true' }
  ]) {
    const invalidRes = response();
    await controller.discardManualRevisionAction({
      params: { id: '9' },
      body,
      session: { user: { id: 7, username: 'Redaktion' } }
    }, invalidRes, assert.fail);
    assert.equal(invalidRes.statusCode, 400);
  }
  assert.equal(inputs.length, 1);
});

test('Revisionsvalidierungsfehler zeigt einen sicheren konkreten Hinweis', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    revisionService: {
      async updateRevision() {
        throw Object.assign(new Error('interne Validierungsdetails'), {
          code: 'CONTENT_REVISION_VALIDATION_FAILED'
        });
      }
    }
  }));
  const res = response();

  await controller.updateRevisionAction({
    params: { id: '9' },
    body: { revision_version: '1' },
    session: { user: { id: 7, username: 'Redaktion' } }
  }, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.match(res.body, /aktuellen Inhaltsanforderungen/i);
  assert.doesNotMatch(res.body, /interne Validierungsdetails/);
});

test('Schließcontroller verlangt Bestätigung und bindet Admin, Artikel und Job exakt', async () => {
  const inputs = [];
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async discardDeterministicExistingOptimizationJobForAdmin(input) {
        inputs.push(input);
        return { id: 44, status: 'cancelled' };
      }
    }
  }));

  for (const confirmed of [undefined, 'on', '1', 'false', false]) {
    const invalidRes = response();
    await controller.discardExistingOptimizationJobAction({
      params: { id: '19', jobId: '44' },
      body: { confirmed },
      session: { user: { id: 7, username: 'Redaktion' } }
    }, invalidRes, assert.fail);
    assert.equal(invalidRes.statusCode, 400);
  }
  assert.equal(inputs.length, 0);

  const res = response();
  await controller.discardExistingOptimizationJobAction({
    params: { id: '19', jobId: '44' },
    body: { confirmed: 'true', post_id: '999', admin_id: '999' },
    session: { user: { id: 7, username: 'Redaktion' } }
  }, res, assert.fail);

  assert.deepEqual(inputs, [{ jobId: 44, postId: 19, adminId: 7 }]);
  assert.equal(res.redirectedTo, '/admin/content-agent/existing-content?optimization=discarded');
});

test('Schließcontroller meldet verlorenen CAS ohne interne Fehlerdetails', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: {
      async discardDeterministicExistingOptimizationJobForAdmin() { return null; }
    }
  }));
  const res = response();

  await controller.discardExistingOptimizationJobAction({
    params: { id: '19', jobId: '44' },
    body: { confirmed: 'true' },
    session: { user: { id: 7, username: 'Redaktion' } }
  }, res, assert.fail);

  assert.equal(res.statusCode, 409);
  assert.doesNotMatch(res.body, /SQL|provider|Reservierung/i);
});
