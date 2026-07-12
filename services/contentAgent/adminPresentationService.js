import { DateTime } from 'luxon';
import { sanitizeErrorMessage } from '../../repositories/contentErrorSanitizer.js';
import { isAdminNotificationManuallyRetryable } from './adminDraftService.js';
import { buildPublicationSlot } from './contentSchedulerService.js';
import { isHeartbeatFresh } from './workerService.js';

const STAGE_LABELS = Object.freeze({
  inventory: 'Bestandsaufnahme',
  topic_research: 'Themenrecherche',
  source_research: 'Quellenrecherche',
  seo_brief: 'SEO-Briefing',
  article_generation: 'Artikelerstellung',
  validation: 'Qualitätsprüfung',
  review: 'Redaktionelle Prüfung',
  repair: 'Überarbeitung',
  image_generation: 'Bildgenerierung',
  cloudinary_upload: 'Bild-Upload',
  draft_creation: 'Entwurfsspeicherung',
  completed: 'Abgeschlossen'
});

const STATUS_LABELS = Object.freeze({
  queued: 'Eingeplant',
  running: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  failed: 'Endgültig fehlgeschlagen',
  needs_manual_attention: 'Manuelle Prüfung nötig',
  cancelled: 'Abgebrochen'
});

const REVIEW_STATE_LABELS = Object.freeze({
  needs_review: 'Prüfung offen',
  approved_scheduled: 'Freigegeben und terminiert',
  missed: 'Termin verpasst',
  published: 'Veröffentlicht'
});

const NOTIFICATION_STATUS_LABELS = Object.freeze({
  queued: 'Versand eingeplant',
  sending: 'Versand läuft',
  sent: 'Versendet',
  failed: 'Versand fehlgeschlagen',
  cancelled: 'Versand abgebrochen'
});

const TECHNICAL_KEYS = Object.freeze([
  'enabled',
  'autoPublishEnabled',
  'maxTopicCandidates',
  'maxRevisions',
  'maxAttempts',
  'contentModel',
  'reviewModel',
  'imageModel',
  'monthlyCostLimitEur',
  'contentStageReservationEur',
  'reviewStageReservationEur',
  'contentInputCostPerMtok',
  'contentOutputCostPerMtok',
  'reviewInputCostPerMtok',
  'reviewOutputCostPerMtok',
  'imageCostEur',
  'workerPollMs',
  'jobLeaseMinutes',
  'openaiConfigured',
  'cloudinaryConfigured'
]);

function safeError(value) {
  return value == null || value === '' ? null : sanitizeErrorMessage(value);
}

function safeErrorCode(value) {
  const code = String(value || '').trim();
  return /^[a-z0-9_:-]{1,120}$/i.test(code) ? code : null;
}

function berlinDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const instant = value instanceof Date
    ? DateTime.fromJSDate(value)
    : DateTime.fromISO(String(value), { setZone: true });
  return instant.isValid
    ? instant.setZone('Europe/Berlin').setLocale('de').toFormat('dd.LL.yyyy, HH:mm \'Uhr\' (ZZZZ)')
    : null;
}

const WEEKDAY_LABELS = Object.freeze({
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
  7: 'Sonntag'
});

function configuredScheduleSlots(settings = {}, now = new Date()) {
  const timezone = String(settings.timezone || 'Europe/Berlin');
  const current = DateTime.fromJSDate(now instanceof Date ? now : new Date(now), { zone: timezone });
  if (!current.isValid || !Array.isArray(settings.schedule_weekdays)) return [];
  const configuredDays = [...new Set(settings.schedule_weekdays.map(Number))]
    .filter((weekday) => WEEKDAY_LABELS[weekday])
    .sort((left, right) => left - right);
  const slots = [];
  for (const weekday of configuredDays) {
    for (let offset = 0; offset <= 13; offset += 1) {
      const localDate = current.startOf('day').plus({ days: offset });
      if (localDate.weekday !== weekday) continue;
      try {
        slots.push(buildPublicationSlot({ settings, localDate: localDate.toISODate() }));
      } catch {
        // Ungültige, noch nicht gespeicherte Eingaben erzeugen keine irreführende Vorschau.
      }
    }
  }
  return slots;
}

function localScheduleLabel(value, timezone) {
  const instant = value instanceof Date
    ? DateTime.fromJSDate(value)
    : DateTime.fromISO(String(value || ''), { setZone: true });
  return instant.isValid
    ? instant.setZone(timezone).setLocale('de').toFormat('dd.LL.yyyy, HH:mm \'Uhr\' (ZZZZ)')
    : null;
}

export function deriveReviewState(post = {}, now) {
  const current = now instanceof Date ? now : new Date(now);
  const scheduledAt = new Date(post.scheduled_at);
  const hasSchedule = post.scheduled_at !== null
    && post.scheduled_at !== undefined
    && post.scheduled_at !== '';
  const hasValidTimes = hasSchedule
    && !Number.isNaN(current.getTime())
    && !Number.isNaN(scheduledAt.getTime());
  if (post.published === true || post.workflow_status === 'published') return 'published';
  if (post.workflow_status === 'approved_scheduled') return 'approved_scheduled';
  if (post.workflow_status === 'needs_review'
      && hasValidTimes
      && scheduledAt.getTime() < current.getTime()) return 'missed';
  return 'needs_review';
}

function notificationPresentation(row = {}, editable = false) {
  const status = row.notification_status || null;
  const attempts = Number(row.notification_attempts || 0);
  const lastErrorCode = safeErrorCode(row.notification_last_error_code);
  const notification = {
    status,
    attempts,
    last_error_code: lastErrorCode
  };
  return {
    status,
    statusLabel: status ? NOTIFICATION_STATUS_LABELS[status] || 'Status unbekannt' : 'Noch nicht versendet',
    attempts,
    lastAttemptAt: row.notification_updated_at || null,
    lastAttemptAtLabel: berlinDateTime(row.notification_updated_at),
    lastErrorCode,
    canRetry: editable && isAdminNotificationManuallyRetryable(notification)
  };
}

function providerHealthy(provider) {
  const success = new Date(provider?.last_success_at || 0).getTime();
  const failure = new Date(provider?.last_failure_at || 0).getTime();
  if (String(provider?.last_error_code || '').trim() !== '') return false;
  return success > 0 && success >= failure;
}

function presentProvider(provider = {}) {
  const hasResult = provider.last_success_at != null || provider.last_failure_at != null;
  const healthy = providerHealthy(provider);
  return {
    name: String(provider.provider_name || ''),
    healthy,
    statusLabel: !hasResult ? 'Noch kein Ergebnis' : healthy ? 'Letzter Aufruf erfolgreich' : 'Fehler gemeldet',
    lastSuccessAt: provider.last_success_at || null,
    lastFailureAt: provider.last_failure_at || null,
    lastErrorCode: safeError(provider.last_error_code),
    updatedAt: provider.updated_at || null
  };
}

export function buildDraftListPresentation(rows = [], now = new Date(), schedule = {}) {
  const generationLeadHours = Number(schedule.generationLeadHours);
  const timezone = String(schedule.timezone || 'Europe/Berlin');
  return rows.map((row) => {
    const reviewState = deriveReviewState(row, now);
    const editable = row.generated_by_ai === true
      && row.published === false
      && row.content_format === 'static_html';
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      imageUrl: row.image_url,
      workflowStatus: row.workflow_status,
      published: row.published === true,
      reviewState,
      reviewStateLabel: REVIEW_STATE_LABELS[reviewState],
      scheduledAt: row.scheduled_at || null,
      scheduledAtLabel: berlinDateTime(row.scheduled_at),
      generationAtLabel: Number.isInteger(generationLeadHours)
        && generationLeadHours >= 1
        && generationLeadHours <= 48
        && row.scheduled_at
        ? localScheduleLabel(
            (row.scheduled_at instanceof Date
              ? DateTime.fromJSDate(row.scheduled_at)
              : DateTime.fromISO(String(row.scheduled_at), { setZone: true }))
              .minus({ hours: generationLeadHours })
              .toUTC()
              .toISO(),
            timezone
          )
        : null,
      publishedAt: row.published_at || null,
      publishedAtLabel: berlinDateTime(row.published_at),
      reviewVersion: Number(row.review_version || 0),
      approvalVersion: row.approved_review_version === null
        || row.approved_review_version === undefined
        ? null
        : Number(row.approved_review_version),
      publicationVersion: Number(row.publication_version || 0),
      notification: notificationPresentation(row, editable),
      primaryKeyword: row.primary_keyword || '-',
      contentCluster: row.content_cluster || '-',
      qualityScore: Number(row.quality_score || 0),
      costEur: Number(row.cost_estimate || 0),
      riskBlocked: row.risk_blocked === true
        || row.quality_report_json?.focusedReview?.blocked === true,
      riskCount: Number.isFinite(Number(row.risk_count))
        ? Number(row.risk_count)
        : Array.isArray(row.quality_report_json?.focusedReview?.items)
          ? row.quality_report_json.focusedReview.items.length
          : 0,
      createdAt: row.created_at
    };
  });
}

export function buildExistingContentListPresentation(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    updatedAt: row.updated_at,
    ...(Object.hasOwn(row, 'audit_id') ? {
      auditId: row.audit_id || null,
      auditScore: row.audit_score === null || row.audit_score === undefined ? null : Number(row.audit_score),
      auditStatus: row.audit_status || null,
      findings: Array.isArray(row.findings_json) ? row.findings_json : [],
      revisionId: row.revision_id || null,
      revisionStatus: row.revision_status || null
    } : {})
  }));
}

export function buildJobListPresentation(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || 'Unbekannter Status',
    canRetry: row.job_type !== 'send_admin_review_notification'
      && ['failed', 'needs_manual_attention'].includes(row.status),
    isAdminReviewNotification: row.job_type === 'send_admin_review_notification',
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 0),
    lastError: safeError(row.last_error),
    postId: row.post_id || null,
    costEur: Number(row.cost_estimate || 0),
    lastSafeStageLabel: STAGE_LABELS[String(row.current_stage || '').split(':')[0]] || 'Noch keine Stufe',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at
  }));
}

export function buildDashboardPresentation(data = {}, now = new Date()) {
  const heartbeatFresh = isHeartbeatFresh(data.worker?.heartbeat_at, now);
  const approvals = Number(data.approvals || 0);
  return {
    modeLabel: data.settings?.agent_enabled === false
      ? 'Deaktiviert'
      : data.settings?.operating_mode === 'auto_publish' ? 'Direkt veröffentlichen' : 'Review',
    worker: {
      healthy: heartbeatFresh,
      label: heartbeatFresh ? 'Worker aktiv' : 'Worker nicht erreichbar'
    },
    budget: {
      usedEur: Number(data.budgetUsed || 0),
      limitEur: Number(data.budgetLimitEur ?? Number(data.settings?.monthly_budget_cents || 0) / 100)
    },
    approvals: { current: approvals, required: 8, ready: approvals >= 8 },
    schedule: buildSchedulePresentation(data.settings || {}, now),
    drafts: buildDraftListPresentation(data.drafts || [], now, {
      timezone: data.settings?.timezone || 'Europe/Berlin',
      generationLeadHours: Number(data.settings?.generation_lead_hours)
    }),
    jobs: buildJobListPresentation(data.jobs || [])
  };
}

export function buildSchedulePresentation(settings = {}, now = new Date()) {
  const approvals = Math.max(0, Number(settings.manual_approvals_count) || 0);
  const requiredApprovals = 8;
  const timezone = String(settings.timezone || 'Europe/Berlin');
  const current = now instanceof Date ? now : new Date(now);
  const slots = configuredScheduleSlots(settings, current);
  const nextSlot = slots
    .filter((slot) => Date.parse(slot.generationAt) > current.getTime())
    .sort((left, right) => Date.parse(left.generationAt) - Date.parse(right.generationAt))[0] || null;
  const previewSlots = [...new Map(slots.map((slot) => [
    DateTime.fromISO(slot.localDate, { zone: timezone }).weekday,
    slot
  ])).values()].sort((left, right) => (
    DateTime.fromISO(left.localDate, { zone: timezone }).weekday
    - DateTime.fromISO(right.localDate, { zone: timezone }).weekday
  ));
  return {
    generationLeadHours: Number(settings.generation_lead_hours) || 4,
    nextGenerationLabel: nextSlot ? localScheduleLabel(nextSlot.generationAt, timezone) : null,
    nextPublicationLabel: nextSlot ? localScheduleLabel(nextSlot.publicationAt, timezone) : null,
    weeklyPreview: previewSlots.map((slot) => {
      const generation = DateTime.fromISO(slot.generationAt, { setZone: true }).setZone(timezone);
      const publication = DateTime.fromISO(slot.publicationAt, { setZone: true }).setZone(timezone);
      return {
        weekday: Number(DateTime.fromISO(slot.localDate, { zone: timezone }).weekday),
        label: `${WEEKDAY_LABELS[DateTime.fromISO(slot.localDate, { zone: timezone }).weekday]}: Erstellung ${generation.toFormat('HH:mm')} Uhr · Veröffentlichung ${publication.toFormat('HH:mm')} Uhr`
      };
    }),
    newsletterApprovals: {
      current: Math.min(approvals, requiredApprovals),
      required: requiredApprovals,
      ready: approvals >= requiredApprovals
    }
  };
}

export function buildTechnologyPresentation(config = {}, state = {}) {
  const technical = Object.fromEntries(TECHNICAL_KEYS
    .filter((key) => config[key] && typeof config[key] === 'object')
    .map((key) => [key, {
      value: config[key].value,
      editable: false,
      source: config[key].source || '.env',
      restartRequired: config[key].restartRequired !== false
    }]));
  const workerHealthy = isHeartbeatFresh(state.worker?.heartbeat_at, state.now || new Date());

  return {
    technical,
    versions: {
      app: {
        value: String(state.appVersion || 'unbekannt'),
        editable: false,
        source: 'package.json',
        restartRequired: false
      },
      worker: {
        value: String(state.workerVersion || state.worker?.version || 'unbekannt'),
        editable: false,
        source: 'CONTENT_AGENT_WORKER_VERSION',
        restartRequired: true
      }
    },
    worker: {
      healthy: workerHealthy,
      label: workerHealthy ? 'Worker aktiv' : 'Worker nicht erreichbar',
      heartbeatAt: state.worker?.heartbeat_at || null
    },
    providers: (state.providers || []).map(presentProvider)
  };
}
