import pool from '../util/db.js';

function validationError(message) {
  return Object.assign(new Error(message), {
    code: 'CONTENT_SETTINGS_VALIDATION_FAILED'
  });
}

function normalizeNotificationEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
    throw validationError('Ungültige Admin-Benachrichtigungsadresse.');
  }
  return email;
}

function normalizeSettingsPatch(current, patch = {}) {
  const weekdaysInput = patch.scheduleWeekdays ?? current.schedule_weekdays;
  if (!Array.isArray(weekdaysInput)) {
    throw validationError('Ungültige Wochentage.');
  }
  const weekdays = [...new Set(weekdaysInput.map(Number))].sort((left, right) => left - right);
  if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw validationError('Ungültige Wochentage.');
  }

  const scheduleTime = String(patch.scheduleTime ?? current.schedule_time).slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) {
    throw validationError('Ungültige Uhrzeit.');
  }

  const timezone = String(patch.timezone ?? current.timezone);
  if (!Intl.supportedValuesOf('timeZone').includes(timezone)) {
    throw validationError('Ungültige Zeitzone.');
  }

  const operatingMode = patch.operatingMode ?? current.operating_mode;
  if (!['review', 'auto_publish'].includes(operatingMode)) {
    throw validationError('Ungültiger Betriebsmodus.');
  }

  const monthlyBudgetCents = Number(patch.monthlyBudgetCents ?? current.monthly_budget_cents);
  if (!Number.isSafeInteger(monthlyBudgetCents) || monthlyBudgetCents < 0) {
    throw validationError('Ungültiges Monatsbudget.');
  }

  const autoPublishMinScore = Math.max(
    90,
    Number(patch.autoPublishMinScore ?? current.auto_publish_min_score)
  );
  if (!Number.isInteger(autoPublishMinScore) || autoPublishMinScore > 100) {
    throw validationError('Ungültiger Mindestscore.');
  }

  const maximumAttempts = Number(patch.maximumAttempts ?? current.maximum_attempts);
  if (!Number.isInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 5) {
    throw validationError('Ungültige Anzahl maximaler Versuche.');
  }

  const generationLeadHours = Number(
    patch.generationLeadHours ?? current.generation_lead_hours
  );
  if (!Number.isInteger(generationLeadHours)
      || generationLeadHours < 1
      || generationLeadHours > 48) {
    throw validationError('Der Erstellungsvorlauf muss zwischen 1 und 48 Stunden liegen.');
  }

  const adminNotificationEmail = normalizeNotificationEmail(
    patch.adminNotificationEmail ?? current.admin_notification_email
  );
  const newsletterBlogNotificationsEnabled = patch.newsletterBlogNotificationsEnabled
    ?? current.newsletter_blog_notifications_enabled;
  if (typeof newsletterBlogNotificationsEnabled !== 'boolean') {
    throw validationError('Ungültiger Newsletter-Schalter.');
  }
  if (patch.newsletterBlogNotificationsEnabled === true
      && Number(current.manual_approvals_count) < 8) {
    throw Object.assign(new Error('Newsletter-Freigabe noch nicht erreicht.'), {
      code: 'CONTENT_NEWSLETTER_NOT_READY'
    });
  }

  return {
    agentEnabled: patch.agentEnabled ?? current.agent_enabled,
    operatingMode,
    scheduleWeekdays: weekdays,
    scheduleTime,
    timezone,
    monthlyBudgetCents,
    autoPublishMinScore,
    maximumAttempts,
    generationLeadHours,
    adminNotificationEmail,
    newsletterBlogNotificationsEnabled
  };
}

function changedKeys(current, next) {
  const values = {
    agent_enabled: next.agent_enabled,
    operating_mode: next.operating_mode,
    schedule_weekdays: next.schedule_weekdays,
    schedule_time: String(next.schedule_time).slice(0, 5),
    timezone: next.timezone,
    monthly_budget_cents: next.monthly_budget_cents,
    auto_publish_min_score: next.auto_publish_min_score,
    maximum_attempts: next.maximum_attempts,
    generation_lead_hours: next.generation_lead_hours,
    admin_notification_email: next.admin_notification_email,
    newsletter_blog_notifications_enabled: next.newsletter_blog_notifications_enabled
  };
  const previous = {
    ...current,
    schedule_time: String(current.schedule_time).slice(0, 5)
  };

  return Object.entries(values)
    .filter(([key, value]) => JSON.stringify(previous[key]) !== JSON.stringify(value))
    .map(([key]) => key);
}

export async function getContentAgentSettings(db = pool) {
  const { rows } = await db.query('SELECT * FROM content_agent_settings WHERE id = 1');
  if (!rows[0]) throw new Error('Content-Agent-Einstellungen fehlen.');
  return rows[0];
}

export async function updateContentAgentSettings({ expectedVersion, patch, admin }, db = pool) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      'SELECT * FROM content_agent_settings WHERE id = 1 FOR UPDATE'
    );
    const current = currentResult.rows[0];
    if (!current || current.settings_version !== Number(expectedVersion)) {
      const error = new Error('Die Einstellungen wurden zwischenzeitlich geändert.');
      error.code = 'CONTENT_SETTINGS_VERSION_CONFLICT';
      throw error;
    }

    const next = normalizeSettingsPatch(current, patch);
    const { rows } = await client.query(`
      UPDATE content_agent_settings
      SET agent_enabled = $1, operating_mode = $2, schedule_weekdays = $3,
          schedule_time = $4, timezone = $5, monthly_budget_cents = $6,
          auto_publish_min_score = $7, maximum_attempts = $8,
          generation_lead_hours = $9, admin_notification_email = $10,
          newsletter_blog_notifications_enabled = $11,
          settings_version = settings_version + 1, updated_at = NOW()
      WHERE id = 1 AND settings_version = $12
      RETURNING *
    `, [
      next.agentEnabled,
      next.operatingMode,
      next.scheduleWeekdays,
      next.scheduleTime,
      next.timezone,
      next.monthlyBudgetCents,
      next.autoPublishMinScore,
      next.maximumAttempts,
      next.generationLeadHours,
      next.adminNotificationEmail,
      next.newsletterBlogNotificationsEnabled,
      Number(expectedVersion)
    ]);

    if (!rows[0]) {
      throw Object.assign(new Error('Versionskonflikt.'), {
        code: 'CONTENT_SETTINGS_VERSION_CONFLICT'
      });
    }

    await client.query(`
      INSERT INTO content_agent_setting_revisions
        (settings_version, changed_keys, previous_values_json, new_values_json, admin_id, admin_username)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      rows[0].settings_version,
      changedKeys(current, rows[0]),
      current,
      rows[0],
      admin.id,
      admin.username
    ]);
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
