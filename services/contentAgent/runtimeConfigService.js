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
    manualApprovalsCount: Number(settings.manual_approvals_count),
    settingsVersion: Number(settings.settings_version),
    autoPublishEffective: technicalConfig.autoPublishEnabled === true
      && settings.operating_mode === 'auto_publish'
      && Number(settings.manual_approvals_count) >= 8
  });
}

export function createContentAgentJobSnapshot({ runtimeConfig, claim, now = new Date() }) {
  return Object.freeze({
    version: 1,
    operatingMode: claim?.payload_json?.forced_mode || runtimeConfig.operatingMode,
    source: claim?.payload_json?.source || 'unknown',
    scheduleSlot: claim?.payload_json?.schedule_slot || null,
    monthlyCostLimitEur: runtimeConfig.monthlyCostLimitEur,
    autoPublishMinScore: runtimeConfig.autoPublishMinScore,
    maxAttempts: runtimeConfig.maxAttempts,
    manualApprovalsCount: runtimeConfig.manualApprovalsCount,
    autoPublishEffective: runtimeConfig.autoPublishEffective,
    timezone: runtimeConfig.timezone,
    contentModel: runtimeConfig.contentModel,
    reviewModel: runtimeConfig.reviewModel,
    imageModel: runtimeConfig.imageModel,
    settingsVersion: runtimeConfig.settingsVersion,
    startedAt: now.toISOString()
  });
}

export function validateContentAgentSettingsTransition({ current, next, technicalConfig }) {
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
