import { bindContentRulesToSnapshot } from './contentRuleManifest.js';
import { buildLearningRuleSnapshot } from './contentLearningSnapshotService.js';

export function resolveContentAgentRuntimeConfig({ technicalConfig, settings }) {
  const budget = Math.min(
    Number(technicalConfig.monthlyCostLimitEur),
    Number(settings.monthly_budget_cents) / 100
  );
  const attempts = Math.min(
    Number(technicalConfig.maxAttempts),
    Number(settings.maximum_attempts)
  );
  const score = Math.max(90, Number(settings.auto_publish_min_score));

  return Object.freeze({
    ...technicalConfig,
    enabled: technicalConfig.enabled === true && settings.agent_enabled === true,
    operatingMode: settings.operating_mode,
    scheduleWeekdays: [...settings.schedule_weekdays],
    scheduleTime: String(settings.schedule_time).slice(0, 5),
    timezone: settings.timezone,
    monthlyCostLimitEur: budget,
    maxAttempts: attempts,
    autoPublishMinScore: score,
    generationLeadHours: Number(settings.generation_lead_hours),
    adminNotificationEmail: String(settings.admin_notification_email),
    newsletterBlogNotificationsEnabled:
      settings.newsletter_blog_notifications_enabled === true,
    manualApprovalsCount: Number(settings.manual_approvals_count),
    settingsVersion: Number(settings.settings_version),
    autoPublishEffective: technicalConfig.autoPublishEnabled === true
      && settings.operating_mode === 'auto_publish'
      && Number(settings.manual_approvals_count) >= 8
  });
}

export function createContentAgentJobSnapshot({
  runtimeConfig,
  claim,
  now = new Date(),
  allowedInternalLinks,
  requireAllowedInternalLinks = false,
  activeLearningRules = []
}) {
  const existingPostOptimization = claim?.job_type === 'optimize_existing_post'
    || claim?.payload_json?.source === 'admin_existing_content';
  if (existingPostOptimization
      && (typeof runtimeConfig?.webSearchCostPerCallEur !== 'number'
        || !Number.isFinite(runtimeConfig.webSearchCostPerCallEur)
        || runtimeConfig.webSearchCostPerCallEur < 0)) {
    throw Object.assign(
      new TypeError('Für die Bestandsoptimierung fehlt ein gültiger technischer Websuchepreis.'),
      { code: 'CONTENT_EXISTING_OPTIMIZATION_RUNTIME_SNAPSHOT_INVALID' }
    );
  }
  return bindContentRulesToSnapshot({
    baseSnapshot: {
      version: 3,
      operatingMode: claim?.payload_json?.forced_mode || runtimeConfig.operatingMode,
      forcedMode: claim?.payload_json?.forced_mode || null,
      source: claim?.payload_json?.source || 'unknown',
      scheduleSlot: claim?.payload_json?.schedule_slot || null,
      publicationAt: typeof claim?.payload_json?.publication_at === 'string'
        ? claim.payload_json.publication_at
        : null,
      monthlyCostLimitEur: runtimeConfig.monthlyCostLimitEur,
      autoPublishMinScore: runtimeConfig.autoPublishMinScore,
      maxAttempts: runtimeConfig.maxAttempts,
      generationLeadHours: runtimeConfig.generationLeadHours,
      adminNotificationEmail: runtimeConfig.adminNotificationEmail,
      newsletterBlogNotificationsEnabled: runtimeConfig.newsletterBlogNotificationsEnabled,
      manualApprovalsCount: runtimeConfig.manualApprovalsCount,
      autoPublishEffective: runtimeConfig.autoPublishEffective,
      timezone: runtimeConfig.timezone,
      maxTopicCandidates: runtimeConfig.maxTopicCandidates,
      maxRevisions: runtimeConfig.maxRevisions,
      contentStageReservationEur: runtimeConfig.contentStageReservationEur,
      reviewStageReservationEur: runtimeConfig.reviewStageReservationEur,
      contentInputCostPerMtok: runtimeConfig.contentInputCostPerMtok,
      contentOutputCostPerMtok: runtimeConfig.contentOutputCostPerMtok,
      reviewInputCostPerMtok: runtimeConfig.reviewInputCostPerMtok,
      reviewOutputCostPerMtok: runtimeConfig.reviewOutputCostPerMtok,
      webSearchCostPerCallEur: runtimeConfig.webSearchCostPerCallEur,
      imageCostEur: runtimeConfig.imageCostEur,
      contentModel: runtimeConfig.contentModel,
      reviewModel: runtimeConfig.reviewModel,
      imageModel: runtimeConfig.imageModel,
      settingsVersion: runtimeConfig.settingsVersion,
      startedAt: now.toISOString(),
      learningRuleSnapshot: buildLearningRuleSnapshot(activeLearningRules)
    },
    allowedInternalLinks,
    requireAllowedInternalLinks
  });
}

export function validateContentAgentSettingsTransition({ current, next, technicalConfig }) {
  if (Array.isArray(next.schedule_weekdays) && next.schedule_weekdays.length === 0) {
    throw Object.assign(
      new Error('Mindestens ein Wochentag ist erforderlich.'),
      { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' }
    );
  }

  if (current.agent_enabled !== true && next.agent_enabled === true && technicalConfig.enabled !== true) {
    throw Object.assign(
      new Error('Der Content-Agent kann bei technischem Not-Aus nicht aktiviert werden.'),
      { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' }
    );
  }

  const budgetCents = Number(next.monthly_budget_cents);
  const hardBudgetCents = Math.floor(Number(technicalConfig.monthlyCostLimitEur) * 100);
  if (Object.hasOwn(next, 'monthly_budget_cents')
      && (!Number.isSafeInteger(budgetCents) || budgetCents < 0
        || !Number.isSafeInteger(hardBudgetCents) || budgetCents > hardBudgetCents)) {
    throw Object.assign(
      new Error('Das Monatsbudget überschreitet die technische Obergrenze.'),
      { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' }
    );
  }

  const maximumAttempts = Number(next.maximum_attempts);
  const hardMaximumAttempts = Number(technicalConfig.maxAttempts);
  if (Object.hasOwn(next, 'maximum_attempts')
      && (!Number.isInteger(maximumAttempts) || maximumAttempts < 1
        || !Number.isInteger(hardMaximumAttempts) || maximumAttempts > hardMaximumAttempts)) {
    throw Object.assign(
      new Error('Die Anzahl der Versuche überschreitet die technische Obergrenze.'),
      { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' }
    );
  }

  if (next.operating_mode !== 'auto_publish') return next;

  if (
    technicalConfig.autoPublishEnabled !== true
    || Number(current.manual_approvals_count) < 8
  ) {
    throw Object.assign(
      new Error('Direktveröffentlichung ist technisch oder durch fehlende Freigaben gesperrt.'),
      { code: 'CONTENT_AUTOPUBLISH_NOT_READY' }
    );
  }

  if (Number(next.auto_publish_min_score) < 90) {
    throw Object.assign(
      new Error('Mindestscore muss mindestens 90 sein.'),
      { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' }
    );
  }

  return next;
}
