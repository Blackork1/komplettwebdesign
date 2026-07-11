import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminContentAgentController } from '../controllers/adminContentAgentController.js';
import { retryContentJobForAdmin } from '../repositories/contentJobRepository.js';

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
    runtimeConfig: { maxAttempts: 3, autoPublishEnabled: false },
    presentation: {},
    ...overrides
  };
}

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
    body: { settings_version: '4', operating_mode: 'auto_publish', auto_publish_min_score: '92' },
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
  assert.equal(res.redirectedTo, '/admin/content-agent/schedule?saved=1');
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
  assert.match(calls[0].sql, /WHERE id = \$1 AND status IN \('failed', 'needs_manual_attention'\) AND attempts < \$2/i);
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

test('spätere Aktionsplatzhalter führen ohne injizierten Service keine Aktion aus', async () => {
  const controller = createAdminContentAgentController(baseDependencies());
  const res = response();

  await controller.publishDraftAction({ params: { id: '3' }, body: {} }, res, assert.fail);

  assert.equal(res.statusCode, 501);
  assert.match(res.body, /noch nicht verfügbar/i);
});

test('ungültige Aktions-IDs verwenden ebenfalls die gemeinsame Fehlerabbildung', async () => {
  const controller = createAdminContentAgentController(baseDependencies({
    publicationService: { async publishDraftManually() { assert.fail('Service darf nicht laufen'); } }
  }));
  const res = response();

  await controller.publishDraftAction({ params: { id: '../3' }, body: {} }, res, assert.fail);

  assert.equal(res.statusCode, 400);
});
