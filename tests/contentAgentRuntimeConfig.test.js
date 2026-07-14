import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createContentAgentJobSnapshot,
  resolveContentAgentRuntimeConfig,
  validateContentAgentSettingsTransition
} from '../services/contentAgent/runtimeConfigService.js';
import { buildLearningRuleSnapshot } from '../services/contentAgent/contentLearningSnapshotService.js';
import {
  CONTENT_AGENT_RULE_MANIFEST,
  CONTENT_AGENT_RULE_MANIFEST_HASH
} from '../services/contentAgent/contentRuleManifest.js';

const technicalConfig = Object.freeze({
  enabled: true,
  autoPublishEnabled: false,
  monthlyCostLimitEur: 100,
  maxAttempts: 5,
  maxTopicCandidates: 8,
  maxRevisions: 2,
  contentStageReservationEur: 0.5,
  reviewStageReservationEur: 0.25,
  contentInputCostPerMtok: 2.5,
  contentOutputCostPerMtok: 15,
  reviewInputCostPerMtok: 0.75,
  reviewOutputCostPerMtok: 4.5,
  imageCostEur: 0.041,
  contentModel: 'content-model',
  reviewModel: 'review-model',
  imageModel: 'image-model'
});

const settings = Object.freeze({
  agent_enabled: true,
  operating_mode: 'auto_publish',
  schedule_weekdays: [1, 4],
  schedule_time: '18:00:00',
  timezone: 'Europe/Berlin',
  monthly_budget_cents: 15000,
  auto_publish_min_score: 80,
  maximum_attempts: 9,
  generation_lead_hours: 4,
  admin_notification_email: 'redaktion@example.de',
  newsletter_blog_notifications_enabled: true,
  manual_approvals_count: 8,
  settings_version: 2
});

test('Runtime begrenzt Dashboardwerte durch .env-Hardcaps', () => {
  const runtime = resolveContentAgentRuntimeConfig({ technicalConfig, settings });

  assert.equal(runtime.enabled, true);
  assert.equal(runtime.monthlyCostLimitEur, 100);
  assert.equal(runtime.maxAttempts, 5);
  assert.equal(runtime.autoPublishMinScore, 90);
  assert.equal(runtime.autoPublishEffective, false);
  assert.equal(runtime.generationLeadHours, 4);
  assert.equal(runtime.adminNotificationEmail, 'redaktion@example.de');
  assert.equal(runtime.newsletterBlogNotificationsEnabled, true);
  assert.equal(Object.isFrozen(runtime), true);
});

test('Dashboardwerte dürfen technische Grenzen weiter verschärfen', () => {
  const runtime = resolveContentAgentRuntimeConfig({
    technicalConfig: { ...technicalConfig, autoPublishEnabled: true },
    settings: {
      ...settings,
      operating_mode: 'review',
      monthly_budget_cents: 2500,
      maximum_attempts: 2
    }
  });

  assert.equal(runtime.monthlyCostLimitEur, 25);
  assert.equal(runtime.maxAttempts, 2);
  assert.equal(runtime.autoPublishEffective, false);
  assert.deepEqual(runtime.scheduleWeekdays, [1, 4]);
  assert.notEqual(runtime.scheduleWeekdays, settings.schedule_weekdays);
});

test('Direktveröffentlichung kann ohne Hardgate und acht Freigaben nicht aktiviert werden', () => {
  for (const input of [
    {
      current: { operating_mode: 'review', manual_approvals_count: 8 },
      next: { operating_mode: 'auto_publish', manual_approvals_count: 8, auto_publish_min_score: 90 },
      technicalConfig: { autoPublishEnabled: false }
    },
    {
      current: { operating_mode: 'review', manual_approvals_count: 7 },
      next: { operating_mode: 'auto_publish', manual_approvals_count: 7, auto_publish_min_score: 90 },
      technicalConfig: { autoPublishEnabled: true }
    }
  ]) {
    assert.throws(
      () => validateContentAgentSettingsTransition(input),
      (error) => error.code === 'CONTENT_AUTOPUBLISH_NOT_READY'
    );
  }
});

test('Direktveröffentlichung verlangt auch bei geöffnetem Hardgate Score 90', () => {
  assert.throws(() => validateContentAgentSettingsTransition({
    current: { operating_mode: 'review', manual_approvals_count: 8 },
    next: { operating_mode: 'auto_publish', manual_approvals_count: 8, auto_publish_min_score: 89 },
    technicalConfig: { autoPublishEnabled: true }
  }), (error) => error.code === 'CONTENT_SETTINGS_VALIDATION_FAILED');
});

test('Transitionvalidierung lehnt einen vollständigen Zeitplan ohne Wochentag ab', () => {
  assert.throws(() => validateContentAgentSettingsTransition({
    current: { operating_mode: 'review', manual_approvals_count: 0 },
    next: {
      operating_mode: 'review',
      manual_approvals_count: 0,
      schedule_weekdays: [],
      auto_publish_min_score: 90
    },
    technicalConfig: { autoPublishEnabled: false }
  }), (error) => error.code === 'CONTENT_SETTINGS_VALIDATION_FAILED');
});

test('Transitionvalidierung erzwingt technischen Hauptschalter, Budget und Versuchsgrenze', () => {
  const current = { agent_enabled: false, operating_mode: 'review', manual_approvals_count: 0 };
  for (const { next, technicalConfig: hardcaps } of [
    { next: { ...current, agent_enabled: true }, technicalConfig: { enabled: false, monthlyCostLimitEur: 25, maxAttempts: 3 } },
    { next: { ...current, monthly_budget_cents: 2501 }, technicalConfig: { enabled: true, monthlyCostLimitEur: 25, maxAttempts: 3 } },
    { next: { ...current, maximum_attempts: 4 }, technicalConfig: { enabled: true, monthlyCostLimitEur: 25, maxAttempts: 3 } }
  ]) {
    assert.throws(
      () => validateContentAgentSettingsTransition({ current, next, technicalConfig: hardcaps }),
      (error) => error.code === 'CONTENT_SETTINGS_VALIDATION_FAILED'
    );
  }
});

test('Job-Snapshot friert die wirksamen Startwerte und die Jobquelle ein', () => {
  const runtimeConfig = resolveContentAgentRuntimeConfig({
    technicalConfig: { ...technicalConfig, autoPublishEnabled: true },
    settings: { ...settings, auto_publish_min_score: 94 }
  });
  const snapshot = createContentAgentJobSnapshot({
    runtimeConfig,
    claim: {
      payload_json: {
        forced_mode: 'review',
        source: 'admin_manual',
        schedule_slot: 'weekly:2026-07-13:18:00:Europe/Berlin',
        publication_at: '2026-07-13T16:00:00.000Z'
      }
    },
    now: new Date('2026-07-11T10:15:30.000Z')
  });

  assert.deepEqual(snapshot, {
    version: 3,
    operatingMode: 'review',
    forcedMode: 'review',
    source: 'admin_manual',
    scheduleSlot: 'weekly:2026-07-13:18:00:Europe/Berlin',
    publicationAt: '2026-07-13T16:00:00.000Z',
    monthlyCostLimitEur: 100,
    autoPublishMinScore: 94,
    maxAttempts: 5,
    generationLeadHours: 4,
    adminNotificationEmail: 'redaktion@example.de',
    newsletterBlogNotificationsEnabled: true,
    manualApprovalsCount: 8,
    autoPublishEffective: true,
    timezone: 'Europe/Berlin',
    maxTopicCandidates: 8,
    maxRevisions: 2,
    contentStageReservationEur: 0.5,
    reviewStageReservationEur: 0.25,
    contentInputCostPerMtok: 2.5,
    contentOutputCostPerMtok: 15,
    reviewInputCostPerMtok: 0.75,
    reviewOutputCostPerMtok: 4.5,
    imageCostEur: 0.041,
    contentModel: 'content-model',
    reviewModel: 'review-model',
    imageModel: 'image-model',
    settingsVersion: 2,
    startedAt: '2026-07-11T10:15:30.000Z',
    learningRuleSnapshot: buildLearningRuleSnapshot([]),
    ruleManifest: CONTENT_AGENT_RULE_MANIFEST,
    ruleManifestHash: CONTENT_AGENT_RULE_MANIFEST_HASH
  });
  assert.equal(Object.isFrozen(snapshot), true);
});
