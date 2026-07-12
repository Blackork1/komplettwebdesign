import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getContentAgentSettings,
  updateContentAgentSettings
} from '../repositories/contentAgentSettingsRepository.js';

const currentSettings = Object.freeze({
  id: 1,
  agent_enabled: false,
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
  manual_approvals_count: 4,
  settings_version: 3
});

function settingsClient(current = currentSettings) {
  return {
    async query(sql, values = []) {
      if (/FOR UPDATE/i.test(sql)) return { rows: [current] };
      if (/UPDATE content_agent_settings/i.test(sql)) {
        return {
          rows: [{
            ...current,
            agent_enabled: values[0],
            operating_mode: values[1],
            schedule_weekdays: values[2],
            schedule_time: values[3],
            timezone: values[4],
            monthly_budget_cents: values[5],
            auto_publish_min_score: values[6],
            maximum_attempts: values[7],
            generation_lead_hours: values[8],
            admin_notification_email: values[9],
            newsletter_blog_notifications_enabled: values[10],
            settings_version: Number(current.settings_version) + 1
          }]
        };
      }
      return { rows: [] };
    },
    release() {}
  };
}

function updateWith(current, patch) {
  return updateContentAgentSettings({
    expectedVersion: current.settings_version,
    patch,
    admin: { id: 1, username: 'admin' }
  }, { async connect() { return settingsClient(current); } });
}

test('Settings werden aus der kanonischen Einzelzeile gelesen', async () => {
  const calls = [];
  const db = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rows: [currentSettings] };
    }
  };

  assert.equal(await getContentAgentSettings(db), currentSettings);
  assert.match(calls[0].sql, /content_agent_settings\s+WHERE id = 1/i);
});

test('Settings-Update verlangt die erwartete Version', async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql) {
      calls.push(sql);
      if (/FOR UPDATE/i.test(sql)) return { rows: [currentSettings] };
      return { rows: [] };
    },
    release() {
      released = true;
    }
  };
  const db = { async connect() { return client; } };

  await assert.rejects(
    updateContentAgentSettings({
      expectedVersion: 2,
      patch: {},
      admin: { id: 7, username: 'admin' }
    }, db),
    (error) => error.code === 'CONTENT_SETTINGS_VERSION_CONFLICT'
  );
  assert.deepEqual(calls.map((sql) => sql.trim().split(/\s+/).slice(0, 2).join(' ')), [
    'BEGIN',
    'SELECT *',
    'ROLLBACK'
  ]);
  assert.equal(released, true);
});

test('Settings-Update normalisiert Werte und schreibt eine Adminrevision', async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/FOR UPDATE/i.test(sql)) return { rows: [currentSettings] };
      if (/UPDATE content_agent_settings/i.test(sql)) {
        return {
          rows: [{
            ...currentSettings,
            agent_enabled: values[0],
            operating_mode: values[1],
            schedule_weekdays: values[2],
            schedule_time: values[3],
            timezone: values[4],
            monthly_budget_cents: values[5],
            auto_publish_min_score: values[6],
            maximum_attempts: values[7],
            settings_version: 4
          }]
        };
      }
      return { rows: [] };
    },
    release() {
      released = true;
    }
  };
  const db = { async connect() { return client; } };

  const updated = await updateContentAgentSettings({
    expectedVersion: 3,
    patch: {
      agentEnabled: true,
      scheduleWeekdays: [4, 1, 4],
      scheduleTime: '09:15:59',
      monthlyBudgetCents: 5000,
      autoPublishMinScore: 75,
      maximumAttempts: 4,
      openaiApiKey: 'darf-nicht-geschrieben-werden'
    },
    admin: { id: 7, username: 'admin' }
  }, db);

  assert.equal(updated.settings_version, 4);
  const update = calls.find(({ sql }) => /UPDATE content_agent_settings/i.test(sql));
  assert.deepEqual(update.values, [
    true, 'review', [1, 4], '09:15', 'Europe/Berlin', 5000, 90, 4,
    4, 'kontakt@komplettwebdesign.de', false, 3
  ]);
  assert.doesNotMatch(update.sql, /api[_ ]?key|secret|model/i);
  const revision = calls.find(({ sql }) => /INSERT INTO content_agent_setting_revisions/i.test(sql));
  assert.deepEqual(revision.values.slice(0, 2), [
    4,
    ['agent_enabled', 'schedule_time', 'monthly_budget_cents', 'maximum_attempts']
  ]);
  assert.deepEqual(revision.values.slice(4), [7, 'admin']);
  assert.match(calls.at(-1).sql, /COMMIT/);
  assert.equal(released, true);
});

test('Ungültige Kalenderwerte brechen die Transaktion ab', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (/FOR UPDATE/i.test(sql)) return { rows: [currentSettings] };
      return { rows: [] };
    },
    release() {}
  };

  await assert.rejects(
    updateContentAgentSettings({
      expectedVersion: 3,
      patch: { scheduleWeekdays: [0, 8] },
      admin: { id: 7, username: 'admin' }
    }, { async connect() { return client; } }),
    (error) => error.code === 'CONTENT_SETTINGS_VALIDATION_FAILED'
  );
  assert.match(calls.at(-1), /ROLLBACK/);
});

test('Settings akzeptieren vier Stunden Vorlauf und eine normalisierte Adminadresse', async () => {
  const updated = await updateWith(currentSettings, {
    generationLeadHours: 4,
    adminNotificationEmail: ' Redaktion@Example.de ',
    newsletterBlogNotificationsEnabled: false
  });

  assert.equal(updated.generation_lead_hours, 4);
  assert.equal(updated.admin_notification_email, 'redaktion@example.de');
  assert.equal(updated.newsletter_blog_notifications_enabled, false);
});

test('Newsletter-Aktivierung bleibt vor acht Veröffentlichungen gesperrt', async () => {
  await assert.rejects(
    () => updateWith(
      { ...currentSettings, manual_approvals_count: 7 },
      { newsletterBlogNotificationsEnabled: true }
    ),
    { code: 'CONTENT_NEWSLETTER_NOT_READY' }
  );
});

test('Erstellungsvorlauf und Adminadresse werden serverseitig validiert', async () => {
  for (const patch of [
    { generationLeadHours: 0 },
    { generationLeadHours: 49 },
    { adminNotificationEmail: 'keine-e-mail' },
    { adminNotificationEmail: 'a'.repeat(310) + '@example.de' }
  ]) {
    await assert.rejects(
      () => updateWith(currentSettings, patch),
      { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' }
    );
  }
});
