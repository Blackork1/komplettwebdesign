import { randomUUID } from 'node:crypto';
import { DateTime, IANAZone } from 'luxon';
import { presentReviewOptimizationStatus } from '../services/contentAgent/reviewOptimizationStatusService.js';

const CONFLICT_CODES = new Set([
  'CONTENT_AGENT_DISABLED',
  'CONTENT_SETTINGS_VERSION_CONFLICT',
  'CONTENT_AUTOPUBLISH_NOT_READY',
  'CONTENT_NEWSLETTER_NOT_READY',
  'CONTENT_DRAFT_NOT_PUBLISHABLE',
  'CONTENT_DRAFT_NOT_REJECTABLE',
  'CONTENT_JOB_NOT_RETRYABLE',
  'CONTENT_PROVIDER_RECOVERY_NOT_AVAILABLE',
  'CONTENT_QUALITY_RECOVERY_NOT_AVAILABLE',
  'CONTENT_RULE_MANIFEST_RECOVERY_NOT_AVAILABLE',
  'CONTENT_EDITORIAL_REVIEW_RECOVERY_NOT_AVAILABLE',
  'CONTENT_DRAFT_PERSISTENCE_RECOVERY_NOT_AVAILABLE',
  'CONTENT_APPROVAL_STALE',
  'CONTENT_PUBLICATION_SLOT_NOT_MISSED',
  'CONTENT_DRAFT_NOTIFICATION_NOT_RETRYABLE',
  'CONTENT_REVISION_CONFLICT',
  'CONTENT_REVISION_CHANGE_CONFLICT',
  'CONTENT_REVISION_STALE',
  'CONTENT_SCHEDULE_SETTINGS_STALE',
  'CONTENT_DRAFT_EDIT_CONFLICT',
  'CONTENT_REVIEW_VERSION_STALE',
  'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE',
  'CONTENT_EXISTING_OPTIMIZATION_NOT_AVAILABLE',
  'CONTENT_EXISTING_REVISION_ALREADY_OPEN',
  'CONTENT_EXISTING_OPTIMIZATION_DISCARD_NOT_AVAILABLE',
  'CONTENT_ZERO_IMPRESSION_NOT_ELIGIBLE',
  'CONTENT_PERFORMANCE_EVIDENCE_STALE',
  'CONTENT_SEARCH_CONSOLE_NOT_CONFIGURED',
  'CONTENT_SEARCH_CONSOLE_SYNC_NOT_QUEUED',
  'CONTENT_LEARNING_VERSION_CONFLICT',
  'CONTENT_LEARNING_STATE_CONFLICT'
]);

const SAFE_ERROR_MESSAGES = Object.freeze({
  CONTENT_AGENT_DISABLED: 'Der Content-Agent ist deaktiviert.',
  CONTENT_SETTINGS_VERSION_CONFLICT: 'Die Einstellungen wurden zwischenzeitlich geändert.',
  CONTENT_AUTOPUBLISH_NOT_READY: 'Direktveröffentlichung ist noch nicht freigegeben.',
  CONTENT_NEWSLETTER_NOT_READY: 'Newsletter-Benachrichtigungen sind noch nicht freigegeben.',
  CONTENT_DRAFT_NOT_PUBLISHABLE: 'Der Entwurf kann in diesem Zustand nicht veröffentlicht werden.',
  CONTENT_DRAFT_NOT_REJECTABLE: 'Der Entwurf kann in diesem Zustand nicht abgelehnt werden.',
  CONTENT_JOB_NOT_RETRYABLE: 'Der Job kann in diesem Zustand nicht fortgesetzt werden.',
  CONTENT_PROVIDER_RECOVERY_NOT_AVAILABLE: 'Die Providerwiederherstellung ist in diesem Zustand nicht mehr verfügbar.',
  CONTENT_QUALITY_RECOVERY_NOT_AVAILABLE: 'Die Qualitätswiederaufnahme ist in diesem Zustand nicht mehr verfügbar.',
  CONTENT_RULE_MANIFEST_RECOVERY_NOT_AVAILABLE: 'Die Regelstand-Wiederaufnahme ist in diesem Zustand nicht mehr verfügbar.',
  CONTENT_EDITORIAL_REVIEW_RECOVERY_NOT_AVAILABLE: 'Die redaktionelle Neuprüfung ist in diesem Zustand nicht mehr verfügbar.',
  CONTENT_DRAFT_PERSISTENCE_RECOVERY_NOT_AVAILABLE: 'Die sichere Entwurfsfertigstellung ist in diesem Zustand nicht mehr verfügbar.',
  CONTENT_CONFIRMATION_REQUIRED: 'Die erforderliche Bestätigung fehlt.',
  CONTENT_SCHEDULE_INVALID: 'Der Veröffentlichungstermin oder die konfigurierte Zeitzone ist ungültig.',
  CONTENT_SCHEDULE_MUST_BE_FUTURE: 'Der Veröffentlichungstermin muss strikt in der Zukunft liegen.',
  CONTENT_APPROVAL_STALE: 'Die Freigabe ist durch eine zwischenzeitliche Änderung veraltet.',
  CONTENT_PUBLICATION_SLOT_NOT_MISSED: 'Die Sofortveröffentlichung ist nur nach einem verpassten Termin möglich.',
  CONTENT_DRAFT_NOTIFICATION_NOT_RETRYABLE: 'Für diesen Entwurf gibt es keine fehlgeschlagene Admin-Benachrichtigung.',
  CONTENT_REVISION_CONFLICT: 'Die Revision kann in ihrem aktuellen Zustand nicht übernommen werden.',
  CONTENT_REVISION_CHANGE_CONFLICT: 'Die Änderung kann wegen eines Revisionskonflikts nicht sicher zurückgenommen werden.',
  CONTENT_REVISION_STALE: 'Der Liveartikel wurde zwischenzeitlich geändert. Bitte erstelle eine neue Revision.',
  CONTENT_SCHEDULE_SETTINGS_STALE: 'Der Zeitplan wurde zwischenzeitlich geändert. Bitte lade den Entwurf neu.',
  CONTENT_DRAFT_EDIT_CONFLICT: 'Der Entwurf wurde zwischenzeitlich geändert. Bitte lade ihn neu.',
  CONTENT_REVIEW_VERSION_STALE: 'Der Entwurf wurde seit dem Öffnen verändert. Bitte lade ihn neu.',
  CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE: 'Die automatische Prüfhinweis-Optimierung ist für diesen Entwurf nicht verfügbar.',
  CONTENT_EXISTING_OPTIMIZATION_NOT_AVAILABLE: 'Die KI-Optimierung ist für diesen Artikel derzeit nicht verfügbar.',
  CONTENT_EXISTING_REVISION_ALREADY_OPEN: 'Für diesen Artikel besteht bereits eine offene Revision. Bearbeite, übernimm oder lehne sie zuerst ab.',
  CONTENT_EXISTING_OPTIMIZATION_DISCARD_NOT_AVAILABLE: 'Der Optimierungsauftrag kann in diesem Zustand nicht sicher geschlossen werden.',
  CONTENT_ZERO_IMPRESSION_NOT_ELIGIBLE: 'Der Artikel gehört nicht mehr zu den Artikeln ohne Impressionen. Bitte lade die Übersicht neu.',
  CONTENT_PERFORMANCE_EVIDENCE_STALE: 'Die Performance-Auswertung wurde zwischenzeitlich aktualisiert oder ist nicht mehr belastbar. Bitte lade die Seite neu.',
  CONTENT_SEARCH_CONSOLE_NOT_CONFIGURED: 'Die Search Console ist technisch nicht konfiguriert.',
  CONTENT_SEARCH_CONSOLE_SYNC_NOT_QUEUED: 'Die Search-Console-Synchronisierung wurde nicht eingeplant.',
  CONTENT_LEARNING_VERSION_CONFLICT: 'Der Vorschlag oder die Regel wurde zwischenzeitlich geändert. Bitte lade die Seite neu.',
  CONTENT_LEARNING_STATE_CONFLICT: 'Die Lernregel befindet sich nicht mehr im erwarteten Zustand.'
});

const REVIEW_STATUS_FILTERS = new Set(['review', 'approved', 'missed', 'published']);
const LEARNING_RESULT_MESSAGES = new Set(['activated', 'rejected', 'revised', 'status-changed']);
const SEARCH_CONSOLE_PROPERTY = 'komplettwebdesign.de';
const ZERO_IMPRESSION_RESULT_MESSAGES = Object.freeze({
  hidden: 'Der Artikel wurde aus der Null-Impressions-Arbeitsansicht ausgeblendet.',
  shown: 'Der Artikel wird wieder in der Null-Impressions-Arbeitsansicht angezeigt.',
  'all-hidden': 'Alle aktuell qualifizierten Null-Impressions-Artikel wurden ausgeblendet.',
  'all-shown': 'Alle ausgeblendeten Artikel wurden wieder eingeblendet.'
});

function reviewStatusFilter(value) {
  return REVIEW_STATUS_FILTERS.has(value) ? value : 'review';
}

export function contentAgentStatus(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code.endsWith('_NOT_FOUND')) return 404;
  if (CONFLICT_CODES.has(code)) return 409;
  if (code.includes('VALIDATION')
      || code === 'CONTENT_CONFIRMATION_REQUIRED'
      || code === 'CONTENT_SCHEDULE_INVALID'
      || code === 'CONTENT_SCHEDULE_MUST_BE_FUTURE') {
    return 400;
  }
  return 500;
}

function scheduleError(code, message) {
  return Object.assign(new Error(message), { code });
}

export function parseFutureLocalDateTime(value, timezone, now = new Date()) {
  const localValue = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)
      || !IANAZone.isValidZone(timezone)) {
    throw scheduleError(
      'CONTENT_SCHEDULE_INVALID',
      'Der lokale Veröffentlichungstermin oder die Zeitzone ist ungültig.'
    );
  }
  const parsed = DateTime.fromFormat(localValue, "yyyy-LL-dd'T'HH:mm", {
    zone: timezone,
    setZone: true,
    locale: 'de'
  });
  if (!parsed.isValid || parsed.toFormat("yyyy-LL-dd'T'HH:mm") !== localValue) {
    throw scheduleError(
      'CONTENT_SCHEDULE_INVALID',
      'Der lokale Veröffentlichungstermin existiert in der konfigurierten Zeitzone nicht.'
    );
  }
  const scheduledAt = parsed.toUTC().toJSDate();
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime()) || scheduledAt.getTime() <= current.getTime()) {
    throw scheduleError(
      'CONTENT_SCHEDULE_MUST_BE_FUTURE',
      'Der Veröffentlichungstermin muss strikt in der Zukunft liegen.'
    );
  }
  return scheduledAt;
}

function scheduledDraftPresentation(draft, settings = {}) {
  const timezone = settings?.timezone;
  const rawScheduledAt = draft?.post?.scheduled_at;
  const scheduledAt = new Date(rawScheduledAt);
  if (rawScheduledAt === null
      || rawScheduledAt === undefined
      || rawScheduledAt === ''
      || Number.isNaN(scheduledAt.getTime())
      || !IANAZone.isValidZone(timezone)) {
    return {
      ...draft,
      scheduledAtLocal: '',
      scheduledAtLabel: 'Noch nicht terminiert',
      scheduleTimezone: timezone || '',
      scheduleRevision: Number(settings?.schedule_revision) || 0,
      expectedScheduledAt: rawScheduledAt === null
        || rawScheduledAt === undefined
        || rawScheduledAt === ''
        ? 'null'
        : '',
      expectedApprovedReviewVersion: canonicalNullablePositiveInteger(
        draft?.post?.approved_review_version
      )
    };
  }
  const local = DateTime.fromJSDate(scheduledAt, { zone: timezone });
  return {
    ...draft,
    scheduledAtLocal: local.toFormat("yyyy-LL-dd'T'HH:mm"),
    scheduledAtLabel: `${local.toFormat('dd.LL.yyyy, HH:mm')} Uhr (${timezone})`,
    scheduleTimezone: timezone,
    scheduleRevision: Number(settings?.schedule_revision) || 0,
    expectedScheduledAt: scheduledAt.toISOString(),
    expectedApprovedReviewVersion: canonicalNullablePositiveInteger(
      draft?.post?.approved_review_version
    )
  };
}

function assertScheduleSnapshot(body, settings) {
  const submittedTimezone = typeof body?.schedule_timezone === 'string'
    ? body.schedule_timezone.trim()
    : '';
  const submittedRevision = Number(body?.schedule_revision);
  if (!submittedTimezone
      || submittedTimezone !== settings?.timezone
      || !Number.isSafeInteger(submittedRevision)
      || submittedRevision < 1
      || submittedRevision !== Number(settings?.schedule_revision)) {
    throw scheduleError(
      'CONTENT_SCHEDULE_SETTINGS_STALE',
      'Der Zeitplan wurde zwischenzeitlich geändert.'
    );
  }
  return submittedTimezone;
}

function sendKnownError(error, res, next) {
  const status = contentAgentStatus(error);
  if (status === 500) return next(error);
  const message = SAFE_ERROR_MESSAGES[error.code]
    || (status === 404 ? 'Der angeforderte Inhalt wurde nicht gefunden.' : 'Die Aktion konnte nicht ausgeführt werden.');
  return res.status(status).send(message);
}

function unavailable(res) {
  return res.status(501).send('Diese Content-Agent-Funktion ist noch nicht verfügbar.');
}

function adminFromRequest(req) {
  return {
    id: req.session?.user?.id ?? req.session?.user?.is ?? null,
    username: String(req.session?.user?.username || '')
  };
}

function optionalBoolean(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true' || value === 'on' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw Object.assign(new Error(`Ungültiger Wert für ${fieldName}.`), {
    code: 'CONTENT_SETTINGS_VALIDATION_FAILED'
  });
}

function criticalConfirmation(value) {
  return value === true || value === 'true';
}

function requiredConfirmation(value) {
  if (!criticalConfirmation(value)) {
    throw Object.assign(new Error('Bestätigung fehlt.'), {
      code: 'CONTENT_CONFIRMATION_REQUIRED'
    });
  }
  return true;
}

function targetStages(value) {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function settingsPatch(body = {}) {
  const patch = {};
  if (Object.hasOwn(body, 'agent_enabled')) {
    patch.agentEnabled = optionalBoolean(body.agent_enabled, 'agent_enabled');
  }
  if (Object.hasOwn(body, 'operating_mode')) patch.operatingMode = body.operating_mode;
  if (Object.hasOwn(body, 'schedule_weekdays')) {
    patch.scheduleWeekdays = Array.isArray(body.schedule_weekdays)
      ? body.schedule_weekdays
      : [body.schedule_weekdays];
  } else if (body.settings_form_scope === 'schedule') {
    patch.scheduleWeekdays = [];
  }
  if (Object.hasOwn(body, 'schedule_time')) patch.scheduleTime = body.schedule_time;
  if (Object.hasOwn(body, 'timezone')) patch.timezone = body.timezone;
  if (Object.hasOwn(body, 'monthly_budget_cents')) {
    patch.monthlyBudgetCents = Number(body.monthly_budget_cents);
  }
  if (Object.hasOwn(body, 'auto_publish_min_score')) {
    patch.autoPublishMinScore = Number(body.auto_publish_min_score);
  }
  if (Object.hasOwn(body, 'maximum_attempts')) {
    patch.maximumAttempts = Number(body.maximum_attempts);
  }
  if (Object.hasOwn(body, 'generation_lead_hours')) {
    patch.generationLeadHours = Number(body.generation_lead_hours);
  }
  if (Object.hasOwn(body, 'admin_notification_email')) {
    patch.adminNotificationEmail = body.admin_notification_email;
  }
  if (Object.hasOwn(body, 'newsletter_blog_notifications_enabled')) {
    patch.newsletterBlogNotificationsEnabled = optionalBoolean(
      body.newsletter_blog_notifications_enabled,
      'newsletter_blog_notifications_enabled'
    );
  } else if (body.settings_form_scope === 'schedule') {
    patch.newsletterBlogNotificationsEnabled = false;
  }
  return patch;
}

function transitionTarget(current, patch) {
  return {
    ...current,
    agent_enabled: patch.agentEnabled ?? current.agent_enabled,
    operating_mode: patch.operatingMode ?? current.operating_mode,
    schedule_weekdays: patch.scheduleWeekdays ?? current.schedule_weekdays,
    schedule_time: patch.scheduleTime ?? current.schedule_time,
    timezone: patch.timezone ?? current.timezone,
    monthly_budget_cents: patch.monthlyBudgetCents ?? current.monthly_budget_cents,
    auto_publish_min_score: patch.autoPublishMinScore ?? current.auto_publish_min_score,
    maximum_attempts: patch.maximumAttempts ?? current.maximum_attempts,
    generation_lead_hours: patch.generationLeadHours ?? current.generation_lead_hours,
    admin_notification_email: patch.adminNotificationEmail ?? current.admin_notification_email,
    newsletter_blog_notifications_enabled: patch.newsletterBlogNotificationsEnabled
      ?? current.newsletter_blog_notifications_enabled
  };
}

function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw Object.assign(new Error('Ungültige ID.'), { code: 'CONTENT_ACTION_VALIDATION_FAILED' });
  }
  return id;
}

function postgresIntegerId(value) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) {
    throw Object.assign(new Error('Ungültige ID.'), { code: 'CONTENT_ACTION_VALIDATION_FAILED' });
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) {
    throw Object.assign(new Error('Ungültige ID.'), { code: 'CONTENT_ACTION_VALIDATION_FAILED' });
  }
  return id;
}

function postgresIntegerIdOrNull(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id >= 1 && id <= 2_147_483_647
    ? id
    : null;
}

function strictPositiveInteger(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw Object.assign(new Error('Ungültige Versionsnummer.'), { code: 'CONTENT_ACTION_VALIDATION_FAILED' });
  }
  return postgresIntegerId(value);
}

function strictSha256(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    throw Object.assign(new Error('Ungültige Änderungs-ID.'), {
      code: 'CONTENT_ACTION_VALIDATION_FAILED'
    });
  }
  return value;
}

function strictNonNegativeInteger(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw Object.assign(new Error('Ungültiger Hinweisindex.'), {
      code: 'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE'
    });
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw Object.assign(new Error('Ungültiger Hinweisindex.'), {
      code: 'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE'
    });
  }
  return number;
}

function canonicalNullablePositiveInteger(value) {
  if (value === null || value === undefined) return 'null';
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? String(normalized) : '';
}

function strictNullablePositiveInteger(value) {
  if (value === 'null') return null;
  return strictPositiveInteger(value);
}

function strictNullableCanonicalUtcDate(value) {
  if (value === 'null') return null;
  if (typeof value !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw Object.assign(new Error('Ungültiger Termin-Snapshot.'), {
      code: 'CONTENT_ACTION_VALIDATION_FAILED'
    });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw Object.assign(new Error('Ungültiger Termin-Snapshot.'), {
      code: 'CONTENT_ACTION_VALIDATION_FAILED'
    });
  }
  return date;
}

async function renderCapability({ capability, method, args, res, next }) {
  if (typeof capability?.[method] !== 'function') return unavailable(res);
  try {
    const resolvedArgs = typeof args === 'function' ? args() : args;
    return await capability[method](...resolvedArgs);
  } catch (error) {
    return sendKnownError(error, res, next);
  }
}

async function actionCapability({ capability, method, args, redirect, res, next }) {
  if (typeof capability?.[method] !== 'function') return unavailable(res);
  try {
    const resolvedArgs = typeof args === 'function' ? args() : args;
    await capability[method](...resolvedArgs);
    return res.redirect(redirect);
  } catch (error) {
    return sendKnownError(error, res, next);
  }
}

export function createAdminContentAgentController(dependencies) {
  const {
    adminRepository,
    settingsRepository,
    jobRepository,
    runtimeConfig,
    technicalPresentation = {},
    presentation,
    validateSettingsTransition,
    draftService,
    publicationService,
    revisionService,
    blogPostPresentation,
    scheduledPublicationService,
    learningAdminService,
    now = () => new Date()
  } = dependencies;

  async function requireAdminEnqueueEnabled() {
    const settings = await settingsRepository.getSettings();
    if (runtimeConfig.enabled !== true || settings.agent_enabled !== true) {
      throw Object.assign(new Error('Content-Agent deaktiviert.'), {
        code: 'CONTENT_AGENT_DISABLED'
      });
    }
    return settings;
  }

  async function enqueueRegeneration(jobType, req) {
    const postId = positiveId(req.params.id);
    const settings = await requireAdminEnqueueEnabled();
    if (typeof draftService?.getDraftForReview !== 'function') {
      throw Object.assign(new Error('Entwurfsprüfung nicht verfügbar.'), {
        code: 'CONTENT_DRAFT_NOT_FOUND'
      });
    }
    await draftService.getDraftForReview(postId);
    const job = await jobRepository.enqueueJob({
      jobType,
      idempotencyKey: `${jobType}:${postId}:${randomUUID()}`,
      payload: {
        source: 'admin_regeneration',
        post_id: postId,
        forced_mode: 'review'
      },
      maxAttempts: Math.min(
        Number(settings.maximum_attempts),
        Number(runtimeConfig.maxAttempts)
      )
    });
    if (!job) {
      throw Object.assign(new Error('Content-Agent deaktiviert.'), {
        code: 'CONTENT_AGENT_DISABLED'
      });
    }
    return job;
  }

  function regenerationAction(jobType, req, res, next) {
    return actionCapability({
      capability: { enqueue: () => enqueueRegeneration(jobType, req) },
      method: 'enqueue',
      args: [],
      redirect: `/admin/content-agent/drafts/${req.params.id}/edit?queued=1`,
      res,
      next
    });
  }

  async function enqueueReviewIssueOptimization(req) {
    if (!criticalConfirmation(req.body?.confirmed)) {
      throw Object.assign(new Error('Bestätigung fehlt.'), {
        code: 'CONTENT_CONFIRMATION_REQUIRED'
      });
    }
    const postId = positiveId(req.params.id);
    const expectedReviewVersion = strictPositiveInteger(req.body?.expected_review_version);
    const issueMode = req.body?.issue_mode;
    if (!['single', 'all'].includes(issueMode)) {
      throw Object.assign(new Error('Ungültiger Optimierungsmodus.'), {
        code: 'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE'
      });
    }
    const settings = await requireAdminEnqueueEnabled();
    if (typeof draftService?.getDraftForReview !== 'function') {
      throw Object.assign(new Error('Entwurfsprüfung nicht verfügbar.'), {
        code: 'CONTENT_DRAFT_NOT_FOUND'
      });
    }
    const draft = await draftService.getDraftForReview(postId);
    const riskReview = draft?.riskReview;
    const items = Array.isArray(riskReview?.items) ? riskReview.items : [];
    if (Number(draft?.reviewVersion) !== expectedReviewVersion) {
      throw Object.assign(new Error('Veraltete Reviewversion.'), {
        code: 'CONTENT_REVIEW_VERSION_STALE'
      });
    }
    if (riskReview?.blocked === true || items.length === 0) {
      throw Object.assign(new Error('Prüfhinweis-Optimierung nicht verfügbar.'), {
        code: 'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE'
      });
    }
    const issueIndex = issueMode === 'single'
      ? strictNonNegativeInteger(req.body?.issue_index)
      : null;
    if (issueMode === 'single' && !items[issueIndex]) {
      throw Object.assign(new Error('Prüfhinweis nicht gefunden.'), {
        code: 'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE'
      });
    }
    if (typeof jobRepository?.enqueueReviewOptimizationJob !== 'function') {
      throw Object.assign(new Error('Prüfhinweis-Optimierung nicht verfügbar.'), {
        code: 'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE'
      });
    }
    const job = await jobRepository.enqueueReviewOptimizationJob({
      postId,
      expectedReviewVersion,
      issueMode,
      issueIndex,
      maxAttempts: Math.min(
        Number(settings.maximum_attempts),
        Number(runtimeConfig.maxAttempts)
      )
    });
    if (!job) {
      throw Object.assign(new Error('Content-Agent deaktiviert.'), {
        code: 'CONTENT_AGENT_DISABLED'
      });
    }
    if (!['queued', 'running'].includes(job.status)) {
      throw Object.assign(new Error('Prüfhinweis-Optimierung nicht verfügbar.'), {
        code: 'CONTENT_REVIEW_OPTIMIZATION_NOT_AVAILABLE'
      });
    }
    return job;
  }

  return {
    async overviewPage(req, res, next) {
      try {
        const currentTime = now();
        const data = await adminRepository.getOverview({
          technicalMonthlyCostLimitEur: runtimeConfig.monthlyCostLimitEur,
          now: currentTime
        });
        return res.render('admin/contentAgent/overview', {
          dashboard: presentation.buildDashboardPresentation(data, currentTime),
          settings: data.settings,
          created: req.query?.created === '1'
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async draftsPage(req, res, next) {
      try {
        const currentTime = now();
        const status = reviewStatusFilter(req.query?.status);
        const [rows, settings] = await Promise.all([
          adminRepository.listDrafts({ status, now: currentTime }),
          settingsRepository.getSettings()
        ]);
        return res.render('admin/contentAgent/drafts', {
          drafts: presentation.buildDraftListPresentation(rows, currentTime, {
            timezone: settings?.timezone || 'Europe/Berlin',
            generationLeadHours: Number(settings?.generation_lead_hours)
          }),
          status
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async existingContentPage(req, res, next) {
      try {
        const rows = await adminRepository.listExistingContent();
        const existingContentGroups = presentation.buildExistingContentGroupsPresentation(rows);
        return res.render('admin/contentAgent/existingContent', {
          existingContentGroups,
          visibilityMessage: ZERO_IMPRESSION_RESULT_MESSAGES[req.query?.visibility] || null
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async hideZeroImpressionAction(req, res, next) {
      try {
        const result = await adminRepository.setExistingContentZeroImpressionHidden({
          postId: postgresIntegerId(req.params.id),
          hidden: true
        });
        if (result?.status === 'not_found') {
          throw Object.assign(new Error('Veröffentlichter Beitrag nicht gefunden.'), {
            code: 'CONTENT_POST_NOT_FOUND'
          });
        }
        if (result?.status === 'not_eligible') {
          throw Object.assign(new Error('Artikel ist nicht mehr qualifiziert.'), {
            code: 'CONTENT_ZERO_IMPRESSION_NOT_ELIGIBLE'
          });
        }
        if (result?.status !== 'updated') throw new Error('Unerwarteter Präferenzstatus.');
        return res.redirect('/admin/content-agent/existing-content?visibility=hidden');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async showZeroImpressionAction(req, res, next) {
      try {
        const result = await adminRepository.setExistingContentZeroImpressionHidden({
          postId: postgresIntegerId(req.params.id),
          hidden: false
        });
        if (result?.status === 'not_found') {
          throw Object.assign(new Error('Veröffentlichter Beitrag nicht gefunden.'), {
            code: 'CONTENT_POST_NOT_FOUND'
          });
        }
        if (result?.status !== 'updated') throw new Error('Unerwarteter Präferenzstatus.');
        return res.redirect('/admin/content-agent/existing-content?visibility=shown');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async hideAllZeroImpressionsAction(req, res, next) {
      try {
        await adminRepository.setAllExistingContentZeroImpressionHidden(true);
        return res.redirect('/admin/content-agent/existing-content?visibility=all-hidden');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async showAllZeroImpressionsAction(req, res, next) {
      try {
        await adminRepository.setAllExistingContentZeroImpressionHidden(false);
        return res.redirect('/admin/content-agent/existing-content?visibility=all-shown');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async articlePerformancePage(req, res, next) {
      res.set('Cache-Control', 'no-store');
      if (typeof adminRepository?.getArticlePerformanceDetail !== 'function'
          || typeof presentation?.presentArticlePerformanceDetail !== 'function') {
        return unavailable(res);
      }
      try {
        const postId = postgresIntegerId(req.params.id);
        const rawPerformance = await adminRepository.getArticlePerformanceDetail(postId);
        if (!rawPerformance) {
          return res.status(404).send('Veröffentlichter Artikel nicht gefunden.');
        }
        return res.render('admin/contentAgent/articlePerformance', {
          performance: presentation.presentArticlePerformanceDetail(rawPerformance),
          ...(req.query?.revision === 'queued' ? { revision: 'queued' } : {})
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async existingContentOptimizationStatusAction(req, res, next) {
      res.set('Cache-Control', 'no-store');
      if (typeof adminRepository?.getExistingContentOptimizationState !== 'function'
          || typeof presentation?.presentExistingContentOptimizationState !== 'function') {
        return unavailable(res);
      }
      try {
        const postId = postgresIntegerId(req.params.id);
        const row = await adminRepository.getExistingContentOptimizationState(postId);
        if (!row) {
          throw Object.assign(new Error('Veröffentlichter Beitrag nicht gefunden.'), {
            code: 'CONTENT_POST_NOT_FOUND'
          });
        }
        return res.json(presentation.presentExistingContentOptimizationState(row));
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async schedulePage(req, res, next) {
      try {
        const settings = await settingsRepository.getSettings();
        return res.render('admin/contentAgent/schedule', {
          settings,
          schedule: presentation.buildSchedulePresentation(settings, now()),
          technical: technicalPresentation
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async jobsPage(req, res, next) {
      try {
        const rows = await adminRepository.listJobs();
        return res.render('admin/contentAgent/jobs', {
          jobs: presentation.buildJobListPresentation(rows),
          providerRecoveryQueued: req.query?.['provider-recovery'] === 'queued',
          editorialReviewRecoveryQueued: req.query?.['editorial-review-recovery'] === 'queued',
          draftPersistenceRecoveryQueued: req.query?.['draft-persistence-recovery'] === 'queued'
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async technologyPage(req, res, next) {
      try {
        const state = await adminRepository.getTechnologyState();
        return res.render('admin/contentAgent/technology', {
          technology: presentation.buildTechnologyPresentation(technicalPresentation, state)
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async searchConsolePage(req, res, next) {
      try {
        const [data, settings] = await Promise.all([
          adminRepository.getSearchConsoleInsights(),
          settingsRepository.getSettings()
        ]);
        return res.render('admin/contentAgent/searchConsole', {
          searchConsoleConfigured: runtimeConfig.searchConsoleConfigured === true,
          searchConsoleProperty: SEARCH_CONSOLE_PROPERTY,
          searchConsole: presentation.buildSearchConsolePresentation(data),
          agentEnabled: settings?.agent_enabled === true,
          technicalAgentEnabled: runtimeConfig.enabled === true,
          syncQueued: req.query?.sync === 'queued'
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async learningRulesPage(req, res, next) {
      if (typeof learningAdminService?.getDashboard !== 'function') return unavailable(res);
      try {
        const rawDashboard = await learningAdminService.getDashboard();
        const present = typeof presentation?.presentContentLearningDashboard === 'function'
          ? presentation.presentContentLearningDashboard(rawDashboard)
          : rawDashboard;
        const result = LEARNING_RESULT_MESSAGES.has(req.query?.result) ? req.query.result : '';
        return res.render('admin/contentAgent/learningRules', {
          learningDashboard: present,
          result
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async draftPreviewPage(req, res, next) {
      if (typeof draftService?.getDraftForReview !== 'function'
          || typeof blogPostPresentation?.buildBlogPostPageModel !== 'function') {
        return unavailable(res);
      }
      try {
        const draft = await draftService.getDraftForReview(positiveId(req.params.id));
        const model = blogPostPresentation.buildBlogPostPageModel({
          post: draft.post,
          metadata: draft.metadata,
          pricing: res.locals?.packagePricing || {},
          canonicalBaseUrl: res.locals?.canonicalBaseUrl,
          previewMode: true,
          riskReview: draft.riskReview
        });
        res.set('X-Robots-Tag', 'noindex, nofollow');
        return res.render('blog/show', model);
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async draftEditPage(req, res, next) {
      if (typeof draftService?.getDraftForReview !== 'function'
          || typeof jobRepository?.getLatestReviewOptimizationJob !== 'function') {
        return unavailable(res);
      }
      try {
        const postId = positiveId(req.params.id);
        const [draft, settings, optimizationJob] = await Promise.all([
          draftService.getDraftForReview(postId),
          settingsRepository.getSettings(),
          jobRepository.getLatestReviewOptimizationJob({ postId })
        ]);
        const editorRiskReview = draft.riskReview && typeof draft.riskReview === 'object'
          ? {
              ...draft.riskReview,
              items: Array.isArray(draft.riskReview.items)
                ? draft.riskReview.items.map((item) => ({ ...item, anchor: 'draft-content-html' }))
                : []
            }
          : null;
        return res.render('admin/contentAgent/draftEdit', {
          draft: scheduledDraftPresentation(
            {
              ...draft,
              editorRiskReview,
              reviewOptimizationStatus: presentReviewOptimizationStatus({
                job: optimizationJob,
                currentReviewVersion: draft.reviewVersion
              })
            },
            {
              ...settings,
              timezone: settings?.timezone || runtimeConfig.timezone || 'UTC'
            }
          ),
          saved: req.query?.saved === '1',
          queued: req.query?.queued === '1',
          reviewOptimizationQueued: req.query?.review_optimization === 'queued',
          approved: req.query?.approved === '1',
          rescheduled: req.query?.rescheduled === '1',
          notificationRetried: req.query?.notification_retried === '1'
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async reviewOptimizationStatusAction(req, res, next) {
      if (typeof draftService?.getDraftForReview !== 'function'
          || typeof jobRepository?.getLatestReviewOptimizationJob !== 'function') {
        return unavailable(res);
      }
      try {
        const postId = positiveId(req.params.id);
        const [draft, optimizationJob] = await Promise.all([
          draftService.getDraftForReview(postId),
          jobRepository.getLatestReviewOptimizationJob({ postId })
        ]);
        res.set('Cache-Control', 'no-store');
        return res.json(presentReviewOptimizationStatus({
          job: optimizationJob,
          currentReviewVersion: draft.reviewVersion
        }));
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    revisionEditPage(req, res, next) {
      return renderCapability({
        capability: revisionService,
        method: 'renderRevisionEdit',
        args: () => [positiveId(req.params.id), req, res],
        res,
        next
      });
    },

    async revisionComparePage(req, res, next) {
      res.set('X-Robots-Tag', 'noindex, nofollow');
      res.set('Cache-Control', 'no-store');
      try {
        const revisionId = positiveId(req.params.id);
        if (typeof revisionService?.getRevisionComparison !== 'function'
            || typeof presentation?.buildRevisionComparisonPresentation !== 'function') {
          return unavailable(res);
        }
        const revision = await revisionService.getRevisionComparison(revisionId);
        const comparison = presentation.buildRevisionComparisonPresentation(revision);
        return res.render('admin/contentAgent/revisionCompare', { comparison });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async updateSettingsAction(req, res, next) {
      try {
        const current = await settingsRepository.getSettings();
        const patch = settingsPatch(req.body);
        const nextSettings = transitionTarget(current, patch);
        validateSettingsTransition({
          current,
          next: nextSettings,
          technicalConfig: runtimeConfig
        });
        await settingsRepository.updateSettings({
          expectedVersion: Number(req.body?.settings_version),
          patch,
          admin: adminFromRequest(req)
        });
        return res.redirect('/admin/content-agent/schedule?saved=1');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async enqueueManualDraftAction(req, res, next) {
      try {
        const settings = await requireAdminEnqueueEnabled();
        const job = await jobRepository.enqueueJob({
          jobType: 'generate_manual_draft',
          idempotencyKey: `manual:${randomUUID()}`,
          payload: { source: 'admin_manual', forced_mode: 'review' },
          maxAttempts: Math.min(
            Number(settings.maximum_attempts),
            Number(runtimeConfig.maxAttempts)
          )
        });
        if (!job) {
          throw Object.assign(new Error('Content-Agent deaktiviert.'), {
            code: 'CONTENT_AGENT_DISABLED'
          });
        }
        return res.redirect('/admin/content-agent?created=1');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async syncSearchConsoleAction(req, res, next) {
      try {
        if (runtimeConfig.searchConsoleConfigured !== true) {
          throw Object.assign(new Error('Search Console nicht konfiguriert.'), {
            code: 'CONTENT_SEARCH_CONSOLE_NOT_CONFIGURED'
          });
        }
        const settings = await requireAdminEnqueueEnabled();
        const local = DateTime.fromJSDate(now(), {
          zone: settings.timezone || runtimeConfig.timezone || 'Europe/Berlin'
        });
        if (!local.isValid) {
          throw scheduleError('CONTENT_SCHEDULE_INVALID', 'Die konfigurierte Zeitzone ist ungültig.');
        }
        const job = await jobRepository.enqueueManualSearchConsoleSyncJob({
          localDate: local.toISODate(),
          payload: {
            startDate: local.minus({ days: 28 }).toISODate(),
            endDate: local.minus({ days: 1 }).toISODate()
          },
          maxAttempts: Math.min(
            Number(settings.maximum_attempts),
            Number(runtimeConfig.maxAttempts)
          )
        });
        if (!job || !['queued', 'running'].includes(job.status)) {
          throw Object.assign(new Error('Search-Console-Synchronisierung nicht eingeplant.'), {
            code: 'CONTENT_SEARCH_CONSOLE_SYNC_NOT_QUEUED'
          });
        }
        return res.redirect('/admin/content-agent/search-console?sync=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    activateLearningProposalAction(req, res, next) {
      return actionCapability({
        capability: learningAdminService,
        method: 'activateProposal',
        args: () => [{
          proposalId: positiveId(req.params.id),
          expectedVersion: strictPositiveInteger(req.body?.expected_version),
          ruleText: req.body?.rule_text,
          targetStages: targetStages(req.body?.target_stages),
          admin: adminFromRequest(req),
          confirmed: requiredConfirmation(req.body?.confirmed)
        }],
        redirect: '/admin/content-agent/learning-rules?result=activated',
        res,
        next
      });
    },

    rejectLearningProposalAction(req, res, next) {
      return actionCapability({
        capability: learningAdminService,
        method: 'rejectProposal',
        args: () => [{
          proposalId: positiveId(req.params.id),
          expectedVersion: strictPositiveInteger(req.body?.expected_version),
          admin: adminFromRequest(req),
          confirmed: requiredConfirmation(req.body?.confirmed)
        }],
        redirect: '/admin/content-agent/learning-rules?result=rejected',
        res,
        next
      });
    },

    reviseLearningRuleAction(req, res, next) {
      return actionCapability({
        capability: learningAdminService,
        method: 'reviseRule',
        args: () => [{
          ruleId: positiveId(req.params.id),
          expectedVersion: strictPositiveInteger(req.body?.expected_version),
          ruleText: req.body?.rule_text,
          targetStages: targetStages(req.body?.target_stages),
          admin: adminFromRequest(req),
          confirmed: requiredConfirmation(req.body?.confirmed)
        }],
        redirect: '/admin/content-agent/learning-rules?result=revised',
        res,
        next
      });
    },

    changeLearningRuleStatusAction(req, res, next) {
      return actionCapability({
        capability: learningAdminService,
        method: 'changeRuleStatus',
        args: () => [{
          ruleId: positiveId(req.params.id),
          expectedVersion: strictPositiveInteger(req.body?.expected_version),
          currentStatus: req.body?.current_status,
          nextStatus: req.body?.next_status,
          admin: adminFromRequest(req),
          confirmed: requiredConfirmation(req.body?.confirmed)
        }],
        redirect: '/admin/content-agent/learning-rules?result=status-changed',
        res,
        next
      });
    },

    async retryJobAction(req, res, next) {
      try {
        const jobId = positiveId(req.params.id);
        const job = await jobRepository.retryContentJobForAdmin({
          jobId
        });
        if (!job) {
          throw Object.assign(new Error('Job kann nicht fortgesetzt werden.'), {
            code: 'CONTENT_JOB_NOT_RETRYABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?retried=1');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async recoverProviderJobAction(req, res, next) {
      try {
        if (!criticalConfirmation(req.body?.confirmed)) {
          throw Object.assign(new Error('Bestätigung fehlt.'), {
            code: 'CONTENT_CONFIRMATION_REQUIRED'
          });
        }
        const admin = adminFromRequest(req);
        const recovered = await jobRepository.recoverUncertainProviderJobForAdmin({
          jobId: positiveId(req.params.id),
          adminId: positiveId(admin.id)
        });
        if (!recovered) {
          throw Object.assign(new Error('Providerwiederherstellung nicht verfügbar.'), {
            code: 'CONTENT_PROVIDER_RECOVERY_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?provider-recovery=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async recoverRejectedProviderJobAction(req, res, next) {
      try {
        if (!criticalConfirmation(req.body?.confirmed)) {
          throw Object.assign(new Error('Bestätigung fehlt.'), {
            code: 'CONTENT_CONFIRMATION_REQUIRED'
          });
        }
        const admin = adminFromRequest(req);
        const recovered = await jobRepository.recoverRejectedProviderJobForAdmin({
          jobId: positiveId(req.params.id),
          adminId: positiveId(admin.id)
        });
        if (!recovered) {
          throw Object.assign(new Error('Schemawiederaufnahme nicht verfügbar.'), {
            code: 'CONTENT_PROVIDER_RECOVERY_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?provider-recovery=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async recoverQualityGateJobAction(req, res, next) {
      try {
        if (!criticalConfirmation(req.body?.confirmed)) {
          throw Object.assign(new Error('Bestätigung fehlt.'), {
            code: 'CONTENT_CONFIRMATION_REQUIRED'
          });
        }
        const admin = adminFromRequest(req);
        const recovered = await jobRepository.recoverQualityGateJobForAdmin({
          jobId: positiveId(req.params.id),
          adminId: positiveId(admin.id),
          baseMaxRevisions: positiveId(runtimeConfig.maxRevisions)
        });
        if (!recovered) {
          throw Object.assign(new Error('Qualitätswiederaufnahme nicht verfügbar.'), {
            code: 'CONTENT_QUALITY_RECOVERY_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?quality-recovery=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async recoverQualityGateRuleManifestAction(req, res, next) {
      try {
        if (!criticalConfirmation(req.body?.confirmed)) {
          throw Object.assign(new Error('Bestätigung fehlt.'), {
            code: 'CONTENT_CONFIRMATION_REQUIRED'
          });
        }
        const admin = adminFromRequest(req);
        const recovered = await jobRepository.recoverQualityGateRuleManifestForAdmin({
          jobId: positiveId(req.params.id),
          adminId: positiveId(admin.id)
        });
        if (!recovered) {
          throw Object.assign(new Error('Regelstand-Wiederaufnahme nicht verfügbar.'), {
            code: 'CONTENT_RULE_MANIFEST_RECOVERY_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?rule-manifest-recovery=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async recoverEditorialReviewAction(req, res, next) {
      try {
        if (!criticalConfirmation(req.body?.confirmed)) {
          throw Object.assign(new Error('Bestätigung fehlt.'), {
            code: 'CONTENT_CONFIRMATION_REQUIRED'
          });
        }
        const admin = adminFromRequest(req);
        const recovered = await jobRepository.recoverEditorialReviewForAdmin({
          jobId: positiveId(req.params.id),
          adminId: positiveId(admin.id)
        });
        if (!recovered) {
          throw Object.assign(new Error('Redaktionelle Neuprüfung nicht verfügbar.'), {
            code: 'CONTENT_EDITORIAL_REVIEW_RECOVERY_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?editorial-review-recovery=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async recoverDraftPersistenceAction(req, res, next) {
      try {
        if (!criticalConfirmation(req.body?.confirmed)) {
          throw Object.assign(new Error('Bestätigung fehlt.'), {
            code: 'CONTENT_CONFIRMATION_REQUIRED'
          });
        }
        const admin = adminFromRequest(req);
        const recovered = await jobRepository.recoverDraftPersistenceForAdmin({
          jobId: positiveId(req.params.id),
          adminId: positiveId(admin.id)
        });
        if (!recovered) {
          throw Object.assign(new Error('Entwurfsfertigstellung nicht verfügbar.'), {
            code: 'CONTENT_DRAFT_PERSISTENCE_RECOVERY_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?draft-persistence-recovery=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    updateDraftAction(req, res, next) {
      return actionCapability({
        capability: draftService,
        method: 'updateDraft',
        args: () => [{ postId: positiveId(req.params.id), input: req.body, admin: adminFromRequest(req) }],
        redirect: `/admin/content-agent/drafts/${req.params.id}/edit?saved=1`,
        res,
        next
      });
    },

    rejectDraftAction(req, res, next) {
      return actionCapability({
        capability: publicationService,
        method: 'rejectDraft',
        args: () => [{
          postId: positiveId(req.params.id),
          expectedReviewVersion: strictPositiveInteger(req.body?.expected_review_version),
          admin: adminFromRequest(req),
          confirmed: criticalConfirmation(req.body?.confirmed),
          reason: req.body?.reason
        }],
        redirect: '/admin/content-agent/drafts?rejected=1',
        res,
        next
      });
    },

    async approveScheduledAction(req, res, next) {
      if (typeof scheduledPublicationService?.approveForSchedule !== 'function') return unavailable(res);
      try {
        const settings = await settingsRepository.getSettings();
        const timezone = assertScheduleSnapshot(req.body, settings);
        await scheduledPublicationService.approveForSchedule({
          postId: positiveId(req.params.id),
          scheduledAt: parseFutureLocalDateTime(
            req.body?.scheduled_at_local,
            timezone,
            now()
          ),
          expectedScheduleRevision: Number(req.body?.schedule_revision),
          expectedTimezone: timezone,
          expectedReviewVersion: strictPositiveInteger(req.body?.expected_review_version),
          admin: adminFromRequest(req),
          confirmed: criticalConfirmation(req.body?.confirmed)
        });
        return res.redirect(`/admin/content-agent/drafts/${req.params.id}/edit?approved=1`);
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    publishNowAction(req, res, next) {
      return actionCapability({
        capability: scheduledPublicationService,
        method: 'publishNowAfterMissedSlot',
        args: () => [{
          postId: positiveId(req.params.id),
          expectedReviewVersion: strictPositiveInteger(req.body?.expected_review_version),
          expectedScheduledAt: strictNullableCanonicalUtcDate(req.body?.expected_scheduled_at),
          expectedApprovedReviewVersion: strictNullablePositiveInteger(
            req.body?.expected_approved_review_version
          ),
          admin: adminFromRequest(req),
          confirmed: criticalConfirmation(req.body?.confirmed)
        }],
        redirect: '/admin/content-agent/drafts?published=1',
        res,
        next
      });
    },

    async rescheduleDraftAction(req, res, next) {
      if (typeof scheduledPublicationService?.reschedule !== 'function') return unavailable(res);
      try {
        const settings = await settingsRepository.getSettings();
        const timezone = assertScheduleSnapshot(req.body, settings);
        await scheduledPublicationService.reschedule({
          postId: positiveId(req.params.id),
          scheduledAt: parseFutureLocalDateTime(
            req.body?.scheduled_at_local,
            timezone,
            now()
          ),
          expectedScheduleRevision: Number(req.body?.schedule_revision),
          expectedTimezone: timezone,
          expectedReviewVersion: strictPositiveInteger(req.body?.expected_review_version),
          expectedScheduledAt: strictNullableCanonicalUtcDate(req.body?.expected_scheduled_at),
          expectedApprovedReviewVersion: strictNullablePositiveInteger(
            req.body?.expected_approved_review_version
          ),
          admin: adminFromRequest(req),
          confirmed: criticalConfirmation(req.body?.confirmed)
        });
        return res.redirect(`/admin/content-agent/drafts/${req.params.id}/edit?rescheduled=1`);
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    retryDraftNotificationAction(req, res, next) {
      return actionCapability({
        capability: draftService,
        method: 'retryAdminReviewNotification',
        args: () => [{
          postId: positiveId(req.params.id),
          confirmed: criticalConfirmation(req.body?.confirmed),
          admin: adminFromRequest(req)
        }],
        redirect: `/admin/content-agent/drafts/${req.params.id}/edit?notification_retried=1`,
        res,
        next
      });
    },

    regenerateImageAction(req, res, next) {
      return regenerationAction('regenerate_image', req, res, next);
    },

    regenerateFaqAction(req, res, next) {
      return regenerationAction('regenerate_faq', req, res, next);
    },

    regenerateMetadataAction(req, res, next) {
      return regenerationAction('regenerate_metadata', req, res, next);
    },

    regenerateDraftAction(req, res, next) {
      return regenerationAction('regenerate_article', req, res, next);
    },

    optimizeReviewIssuesAction(req, res, next) {
      return actionCapability({
        capability: { enqueue: () => enqueueReviewIssueOptimization(req) },
        method: 'enqueue',
        args: [],
        redirect: `/admin/content-agent/drafts/${req.params.id}/edit?review_optimization=queued`,
        res,
        next
      });
    },

    async enqueueAuditAction(req, res, next) {
      try {
        await requireAdminEnqueueEnabled();
      } catch (error) {
        return sendKnownError(error, res, next);
      }
      return actionCapability({
        capability: revisionService,
        method: 'enqueueAudit',
        args: [{ admin: adminFromRequest(req) }],
        redirect: '/admin/content-agent/existing-content?queued=1',
        res,
        next
      });
    },

    async optimizeExistingContentAction(req, res, next) {
      try {
        const postId = postgresIntegerId(req.params.id);
        const admin = adminFromRequest(req);
        const adminId = postgresIntegerId(admin.id);
        const settings = await requireAdminEnqueueEnabled();
        if (typeof revisionService?.prepareExistingPostOptimization !== 'function'
            || typeof jobRepository?.enqueueExistingPostOptimizationJob !== 'function') {
          return unavailable(res);
        }
        if (typeof adminRepository?.getExistingContentOptimizationState === 'function') {
          const currentState = await adminRepository.getExistingContentOptimizationState(postId);
          const openDraftRevisionId = postgresIntegerIdOrNull(
            currentState?.open_draft_revision_id
          );
          if (currentState?.has_draft_revision === true) {
            if (openDraftRevisionId !== null) {
              return res.redirect(
                `/admin/content-agent/revisions/${openDraftRevisionId}/edit?optimization=revision-open`
              );
            }
            throw Object.assign(new Error('Für diesen Artikel besteht bereits eine offene Revision.'), {
              code: 'CONTENT_EXISTING_REVISION_ALREADY_OPEN'
            });
          }
        }
        const prepared = await revisionService.prepareExistingPostOptimization(postId);
        const liveHash = typeof prepared?.baseLiveHash === 'string'
          ? prepared.baseLiveHash
          : '';
        if (!/^[0-9a-f]{64}$/.test(liveHash)) {
          throw Object.assign(new Error('Ungültiger Livehash.'), {
            code: 'CONTENT_ACTION_VALIDATION_FAILED'
          });
        }
        const job = await jobRepository.enqueueExistingPostOptimizationJob({
          jobType: 'optimize_existing_post',
          idempotencyKey: `existing-post-optimization:${postId}:${randomUUID()}`,
          payload: {
            source: 'admin_existing_content',
            post_id: postId,
            admin_id: adminId,
            base_live_hash: liveHash
          },
          maxAttempts: Math.min(
            Number(settings.maximum_attempts),
            Number(runtimeConfig.maxAttempts)
          )
        });
        if (!job || !['queued', 'running', 'needs_manual_attention'].includes(job.status)) {
          throw Object.assign(new Error('Bestandsoptimierung nicht verfügbar.'), {
            code: 'CONTENT_EXISTING_OPTIMIZATION_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/existing-content?optimization=queued');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async createPerformanceRevisionAction(req, res, next) {
      try {
        if (req.body?.confirmation !== 'performance_revision') {
          throw Object.assign(new Error('Die Performance-Revision muss ausdrücklich bestätigt werden.'), {
            code: 'CONTENT_CONFIRMATION_REQUIRED'
          });
        }
        const postId = postgresIntegerId(req.params.id);
        const snapshotId = postgresIntegerId(req.body?.snapshot_id);
        const evidenceHash = String(req.body?.evidence_hash || '');
        if (!/^[0-9a-f]{64}$/.test(evidenceHash)) {
          throw Object.assign(new Error('Der Evidenz-Hash ist ungültig.'), {
            code: 'CONTENT_ACTION_VALIDATION_FAILED'
          });
        }
        const admin = adminFromRequest(req);
        const adminId = postgresIntegerId(admin.id);
        const settings = await requireAdminEnqueueEnabled();
        if (typeof revisionService?.prepareExistingPostOptimization !== 'function'
            || typeof jobRepository?.enqueuePerformanceRevisionJob !== 'function') {
          return unavailable(res);
        }
        const prepared = await revisionService.prepareExistingPostOptimization(postId);
        const baseLiveHash = String(prepared?.baseLiveHash || '');
        if (!/^[0-9a-f]{64}$/.test(baseLiveHash)) {
          throw Object.assign(new Error('Der Livehash ist ungültig.'), {
            code: 'CONTENT_ACTION_VALIDATION_FAILED'
          });
        }
        const job = await jobRepository.enqueuePerformanceRevisionJob({
          postId,
          adminId,
          baseLiveHash,
          snapshotId,
          evidenceHash,
          maxAttempts: Math.min(
            Number(settings.maximum_attempts),
            Number(runtimeConfig.maxAttempts)
          )
        });
        if (!job || !['queued', 'running', 'needs_manual_attention'].includes(job.status)) {
          throw Object.assign(new Error('Performance-Revision nicht verfügbar.'), {
            code: 'CONTENT_EXISTING_OPTIMIZATION_NOT_AVAILABLE'
          });
        }
        return res.redirect(`/admin/content-agent/existing-content/${postId}/performance?revision=queued`);
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async discardExistingOptimizationJobAction(req, res, next) {
      try {
        requiredConfirmation(req.body?.confirmed);
        if (typeof jobRepository?.discardDeterministicExistingOptimizationJobForAdmin !== 'function') {
          return unavailable(res);
        }
        const admin = adminFromRequest(req);
        const discarded = await jobRepository.discardDeterministicExistingOptimizationJobForAdmin({
          jobId: postgresIntegerId(req.params.jobId),
          postId: postgresIntegerId(req.params.id),
          adminId: postgresIntegerId(admin.id)
        });
        if (!discarded) {
          throw Object.assign(new Error('Sicheres Schließen nicht verfügbar.'), {
            code: 'CONTENT_EXISTING_OPTIMIZATION_DISCARD_NOT_AVAILABLE'
          });
        }
        return res.redirect('/admin/content-agent/existing-content?optimization=discarded');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    createRevisionAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'createRevisionFromAudit',
        args: () => [{
          postId: positiveId(req.params.id),
          auditId: positiveId(req.body?.audit_id),
          admin: adminFromRequest(req)
        }],
        redirect: '/admin/content-agent/existing-content?revision=1',
        res,
        next
      });
    },

    updateRevisionAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'updateRevision',
        args: () => [{ revisionId: positiveId(req.params.id), input: req.body, admin: adminFromRequest(req) }],
        redirect: `/admin/content-agent/revisions/${req.params.id}/edit?saved=1`,
        res,
        next
      });
    },

    revertOptimizationChangeAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'revertOptimizationChange',
        args: () => [{
          revisionId: postgresIntegerId(req.params.id),
          changeId: strictSha256(req.params.changeId),
          expectedVersion: strictPositiveInteger(req.body?.expected_revision_version),
          admin: adminFromRequest(req)
        }],
        redirect: `/admin/content-agent/revisions/${req.params.id}/compare?change_reverted=1`,
        res,
        next
      });
    },

    rejectOptimizationRevisionAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'rejectOptimizationRevision',
        args: () => [{
          revisionId: postgresIntegerId(req.params.id),
          expectedVersion: strictPositiveInteger(req.body?.expected_revision_version),
          confirmed: requiredConfirmation(req.body?.confirmed),
          admin: adminFromRequest(req)
        }],
        redirect: '/admin/content-agent/existing-content?revision_rejected=1',
        res,
        next
      });
    },

    publishRevisionAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'approveRevision',
        args: () => [{
          revisionId: positiveId(req.params.id),
          expectedVersion: strictPositiveInteger(req.body?.expected_revision_version),
          admin: adminFromRequest(req),
          confirmed: criticalConfirmation(req.body?.confirmed)
        }],
        redirect: '/admin/content-agent/existing-content?published=1',
        res,
        next
      });
    }
  };
}
