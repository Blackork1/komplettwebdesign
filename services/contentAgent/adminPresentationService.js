import { DateTime } from 'luxon';
import {
  canRecoverDraftPersistence,
  canRecoverEditorialReview,
  canRecoverQualityGateJob,
  canRecoverQualityGateRuleManifest,
  canRecoverRejectedProviderJob,
  canRecoverUncertainProviderJob,
  canRetryContentJobManually
} from './contentJobRetryPolicy.js';
import { sanitizeErrorMessage } from '../../repositories/contentErrorSanitizer.js';
import { isAdminNotificationManuallyRetryable } from './adminDraftService.js';
import { buildPublicationSlot } from './contentSchedulerService.js';
import { isHeartbeatFresh } from './workerService.js';
import {
  getLearningCategory,
  sanitizeLearningText
} from './contentLearningTaxonomy.js';

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

const SEARCH_OPPORTUNITY_PRESENTATION = Object.freeze({
  meta_refresh: Object.freeze({
    type: 'Meta-Daten prüfen',
    recommendation: 'Seitentitel und Meta-Beschreibung redaktionell prüfen.'
  }),
  content_refresh: Object.freeze({
    type: 'Inhalt prüfen',
    recommendation: 'Inhalt für diese Suchanfrage redaktionell vertiefen.'
  })
});

const LEARNING_STAGE_LABELS = Object.freeze({
  seo_brief: 'SEO-Briefing',
  writer: 'Artikelerstellung',
  reviewer: 'Redaktionelle Prüfung'
});

const LEARNING_PROPOSAL_STATUS_LABELS = Object.freeze({
  pending: 'Freigabe offen',
  approved: 'Aktiviert',
  rejected: 'Abgelehnt',
  superseded: 'Ersetzt'
});

const LEARNING_RULE_STATUS_LABELS = Object.freeze({
  active: 'Aktiv',
  paused: 'Pausiert',
  disabled: 'Dauerhaft deaktiviert'
});

const LEARNING_EVENT_LABELS = Object.freeze({
  proposal_created: 'Vorschlag automatisch erstellt',
  proposal_approved: 'Vorschlag als Lernregel aktiviert',
  proposal_rejected: 'Vorschlag abgelehnt',
  rule_revised: 'Neue Regelversion aktiviert',
  rule_paused: 'Lernregel pausiert',
  rule_reactivated: 'Lernregel reaktiviert',
  rule_disabled: 'Lernregel dauerhaft deaktiviert'
});

const LEARNING_EFFECTIVENESS = Object.freeze({
  effective: Object.freeze({
    label: 'Wirksam',
    hint: 'Die Fehlerkategorie tritt in den ausgewerteten neuen Artikeln nicht oder deutlich seltener auf.'
  }),
  observing: Object.freeze({
    label: 'Weiter beobachten',
    hint: 'Für eine belastbare Bewertung sind mindestens fünf neue Artikel mit exakt dieser Regelversion erforderlich.'
  }),
  revision_recommended: Object.freeze({
    label: 'Revision empfohlen',
    hint: 'Die Fehlerkategorie tritt weiterhin wiederholt auf. Prüfe eine neue Regelversion redaktionell.'
  })
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

function germanNumber(value, options = {}) {
  const number = Number(value);
  return new Intl.NumberFormat('de-DE', options).format(Number.isFinite(number) ? number : 0);
}

function learningCategoryPresentation(categoryKey) {
  const key = sanitizeLearningText(categoryKey, 80) || 'unclassified';
  const definition = getLearningCategory(key);
  return {
    categoryKey: definition ? key : 'unclassified',
    categoryLabel: definition?.label || 'Noch nicht klassifiziert'
  };
}

function learningTargetStages(value) {
  const stages = Array.isArray(value)
    ? [...new Set(value.map((stage) => sanitizeLearningText(stage, 30)))]
      .filter((stage) => LEARNING_STAGE_LABELS[stage])
    : [];
  return {
    targetStages: stages,
    targetStageLabels: stages.map((stage) => LEARNING_STAGE_LABELS[stage])
  };
}

function safePositiveInteger(value) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function presentLearningEffectiveness(raw = {}) {
  const status = LEARNING_EFFECTIVENESS[raw.status] ? raw.status : 'observing';
  const numberOrNull = (value) => {
    const number = Number(value);
    return value === null || value === undefined || !Number.isFinite(number) ? null : number;
  };
  const currentRate = numberOrNull(raw.currentRate);
  const baselineRate = numberOrNull(raw.baselineRate);
  const averageQualityScore = numberOrNull(raw.averageQualityScore);
  const gsc = raw.gsc && typeof raw.gsc === 'object' ? raw.gsc : {};
  const clicks = numberOrNull(gsc.clicks);
  const impressions = numberOrNull(gsc.impressions);
  const ctr = numberOrNull(gsc.ctr);
  const averagePosition = numberOrNull(gsc.averagePosition);
  return {
    status,
    statusLabel: LEARNING_EFFECTIVENESS[status].label,
    statusHint: LEARNING_EFFECTIVENESS[status].hint,
    articleCount: Math.max(0, Number(raw.articleCount) || 0),
    recurrenceCount: Math.max(0, Number(raw.recurrenceCount) || 0),
    currentRateLabel: currentRate === null ? 'Noch nicht verfügbar' : germanNumber(currentRate, { style: 'percent', maximumFractionDigits: 1 }),
    baselineRateLabel: baselineRate === null ? 'Keine Vergleichsgruppe' : germanNumber(baselineRate, { style: 'percent', maximumFractionDigits: 1 }),
    averageQualityScoreLabel: averageQualityScore === null ? 'Noch nicht verfügbar' : germanNumber(averageQualityScore, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    gsc: {
      hasData: clicks !== null || impressions !== null || ctr !== null || averagePosition !== null,
      clicksLabel: clicks === null ? '–' : germanNumber(clicks, { maximumFractionDigits: 0 }),
      impressionsLabel: impressions === null ? '–' : germanNumber(impressions, { maximumFractionDigits: 0 }),
      ctrLabel: ctr === null ? '–' : germanNumber(ctr, { style: 'percent', maximumFractionDigits: 1 }),
      averagePositionLabel: averagePosition === null ? '–' : germanNumber(averagePosition, { maximumFractionDigits: 1 })
    }
  };
}

export function presentContentLearningDashboard(raw = {}) {
  const proposals = (Array.isArray(raw.proposals) ? raw.proposals : []).slice(0, 100).map((row) => ({
    id: safePositiveInteger(row.id),
    ...learningCategoryPresentation(row.category_key),
    status: LEARNING_PROPOSAL_STATUS_LABELS[row.status] ? row.status : 'pending',
    statusLabel: LEARNING_PROPOSAL_STATUS_LABELS[row.status] || 'Status unbekannt',
    expectedVersion: safePositiveInteger(row.proposal_version),
    ruleText: sanitizeLearningText(row.suggested_rule_text, 800),
    ...learningTargetStages(row.target_stages),
    evidenceCount: Math.max(0, Number(row.evidence_count) || 0),
    evidence: (Array.isArray(row.evidence_json) ? row.evidence_json : []).slice(0, 5).map((item) => ({
      postId: safePositiveInteger(item.post_id),
      reviewVersion: safePositiveInteger(item.review_version),
      reason: sanitizeLearningText(item.reason, 500),
      instruction: sanitizeLearningText(item.instruction, 500),
      section: sanitizeLearningText(item.section_name, 180) || null,
      anchor: sanitizeLearningText(item.anchor, 220) || null
    })).filter((item) => item.postId),
    expectedEffect: sanitizeLearningText(row.expected_effect, 500),
    overfitWarning: sanitizeLearningText(row.overfit_warning, 500),
    decidedBy: sanitizeLearningText(row.decided_by_admin_name, 180) || null,
    decidedAtLabel: berlinDateTime(row.decided_at),
    createdAtLabel: berlinDateTime(row.created_at)
  })).filter((item) => item.id && item.expectedVersion);

  const rules = (Array.isArray(raw.rules) ? raw.rules : []).slice(0, 100).map((row) => ({
    id: safePositiveInteger(row.id),
    ...learningCategoryPresentation(row.category_key),
    status: LEARNING_RULE_STATUS_LABELS[row.status] ? row.status : 'disabled',
    statusLabel: LEARNING_RULE_STATUS_LABELS[row.status] || 'Status unbekannt',
    contentVersion: safePositiveInteger(row.current_version),
    expectedVersion: safePositiveInteger(row.rule_revision),
    ruleText: sanitizeLearningText(row.rule_text, 800),
    ...learningTargetStages(row.target_stages),
    updatedBy: sanitizeLearningText(row.updated_by_admin_name || row.created_by_admin_name, 180) || null,
    createdAtLabel: berlinDateTime(row.created_at),
    updatedAtLabel: berlinDateTime(row.updated_at),
    effectiveness: presentLearningEffectiveness(row.effectiveness)
  })).filter((item) => item.id && item.contentVersion && item.expectedVersion);

  const observations = (Array.isArray(raw.observations) ? raw.observations : []).slice(0, 100).map((row) => ({
    ...learningCategoryPresentation(row.category_key),
    articleCount: Math.max(0, Number(row.article_count) || 0),
    observationCount: Math.max(0, Number(row.observation_count) || 0),
    postIds: (Array.isArray(row.post_ids) ? row.post_ids : [])
      .map(safePositiveInteger).filter(Boolean).slice(0, 20),
    lastSeenAtLabel: berlinDateTime(row.last_seen_at)
  }));

  const events = (Array.isArray(raw.events) ? raw.events : []).slice(0, 100).map((row) => ({
    id: safePositiveInteger(row.id),
    eventType: LEARNING_EVENT_LABELS[row.event_type] ? row.event_type : 'unknown',
    eventLabel: LEARNING_EVENT_LABELS[row.event_type] || 'Lernregelereignis',
    ...learningCategoryPresentation(row.category_key),
    ruleVersion: safePositiveInteger(row.rule_version),
    adminName: sanitizeLearningText(row.admin_name, 180) || 'System',
    createdAtLabel: berlinDateTime(row.created_at)
  })).filter((item) => item.id);

  return {
    proposals,
    rules,
    observations,
    unclassified: {
      articleCount: Math.max(0, Number(raw.unclassified?.article_count) || 0),
      observationCount: Math.max(0, Number(raw.unclassified?.observation_count) || 0),
      lastSeenAtLabel: berlinDateTime(raw.unclassified?.last_seen_at)
    },
    events
  };
}

function searchPageLabel(value) {
  try {
    const url = new URL(String(value || ''), 'https://komplettwebdesign.de');
    if (!['http:', 'https:'].includes(url.protocol)) return 'Unbekannte Seite';
    if (!['komplettwebdesign.de', 'www.komplettwebdesign.de'].includes(url.hostname)) {
      return 'Unbekannte Seite';
    }
    return url.pathname || '/';
  } catch {
    return 'Unbekannte Seite';
  }
}

export function buildSearchConsolePresentation(data = {}) {
  const sourceMetrics = Array.isArray(data.metrics) ? data.metrics : [];
  const sourceOpportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
  const totalClicks = sourceMetrics.reduce((sum, row) => sum + (Number(row.clicks) || 0), 0);
  const totalImpressions = sourceMetrics.reduce((sum, row) => sum + (Number(row.impressions) || 0), 0);
  const countFormat = { maximumFractionDigits: 0 };
  const percentFormat = { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 };

  const metrics = sourceMetrics.map((row) => ({
    query: String(row.query || '–'),
    page: searchPageLabel(row.page_url),
    clicks: germanNumber(row.clicks, countFormat),
    impressions: germanNumber(row.impressions, countFormat),
    ctr: germanNumber(row.ctr, percentFormat),
    position: germanNumber(row.average_position, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
  }));
  const opportunities = sourceOpportunities
    .filter((row) => SEARCH_OPPORTUNITY_PRESENTATION[row.opportunity_type])
    .map((row) => {
      const recommendation = SEARCH_OPPORTUNITY_PRESENTATION[row.opportunity_type];
      return {
        id: row.id,
        query: String(row.primary_query || '–'),
        type: recommendation.type,
        recommendation: recommendation.recommendation,
        score: germanNumber(row.score, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      };
    });
  const provider = data.provider ? presentProvider(data.provider) : presentProvider();

  return {
    summary: {
      queryCount: metrics.length,
      clicks: germanNumber(totalClicks, countFormat),
      impressions: germanNumber(totalImpressions, countFormat),
      ctr: germanNumber(totalImpressions > 0 ? totalClicks / totalImpressions : 0, percentFormat),
      opportunityCount: opportunities.length
    },
    metrics,
    opportunities,
    provider: {
      healthy: provider.healthy,
      statusLabel: provider.statusLabel,
      lastSuccessAtLabel: berlinDateTime(provider.lastSuccessAt),
      lastFailureAtLabel: berlinDateTime(provider.lastFailureAt),
      lastErrorCode: provider.lastErrorCode
    }
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
  return rows.map((row) => {
    const canRecoverProvider = canRecoverUncertainProviderJob({
      jobType: row.job_type,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      postId: row.post_id,
      openReservationCount: row.open_provider_reservation_count,
      preExecutionSchemaRejection: row.provider_pre_execution_schema_rejection === true
    });
    const providerStage = String(row.open_provider_stage || '').trim();
    const providerStageLabel = STAGE_LABELS[providerStage.split(':')[0]] || 'Providerstufe';
    const rejectedProviderStage = String(row.provider_rejected_stage || '').trim();
    const rejectedProviderStageLabel = STAGE_LABELS[rejectedProviderStage] || 'Providerstufe';
    const canRecoverRejectedProvider = canRecoverRejectedProviderJob({
      jobType: row.job_type,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      currentStage: row.current_stage,
      providerStage: rejectedProviderStage,
      postId: row.post_id,
      openReservationCount: row.open_provider_reservation_count,
      schemaRepairable: row.provider_rejected_schema_repairable === true
    });
    const canRecoverQualityGate = canRecoverQualityGateJob({
      jobType: row.job_type,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      currentStage: row.current_stage,
      postId: row.post_id,
      openReservationCount: row.open_provider_reservation_count,
      structureRepairable: row.quality_gate_structure_repairable === true
    });
    const canRecoverQualityGateManifest = canRecoverQualityGateRuleManifest({
      jobType: row.job_type,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      currentStage: row.current_stage,
      postId: row.post_id,
      openReservationCount: row.open_provider_reservation_count,
      manifestRepairable: row.quality_gate_manifest_repairable === true
    });
    const canRecoverEditorial = canRecoverEditorialReview({
      jobType: row.job_type,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      currentStage: row.current_stage,
      postId: row.post_id,
      openReservationCount: row.open_provider_reservation_count,
      editorialReviewRecoverable: row.editorial_review_recoverable === true
    });
    const canRecoverDraft = canRecoverDraftPersistence({
      jobType: row.job_type,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      currentStage: row.current_stage,
      postId: row.post_id,
      openReservationCount: row.open_provider_reservation_count,
      draftPersistenceRecoverable: row.draft_persistence_recoverable === true
    });
    const qualityIssues = (Array.isArray(row.error_report_json?.qualityIssues)
      ? row.error_report_json.qualityIssues
      : Array.isArray(row.latest_review_issues) ? row.latest_review_issues : [])
      .slice(0, 8)
      .map((issue) => safeError(issue?.message))
      .filter(Boolean);
    return {
      id: row.id,
      jobType: row.job_type,
      status: row.status,
      statusLabel: STATUS_LABELS[row.status] || 'Unbekannter Status',
      canRetry: canRetryContentJobManually({
        jobType: row.job_type,
        status: row.status,
        attempts: row.attempts,
        lastError: row.last_error
      }),
      canRecoverProvider,
      providerRecoveryStageLabel: canRecoverProvider ? providerStageLabel : null,
      providerRecoveryActionLabel: canRecoverProvider
        ? `Reservierung verwerfen und ${providerStageLabel} erneut erstellen`
        : null,
      canRecoverRejectedProvider,
      rejectedProviderRecoveryStageLabel: canRecoverRejectedProvider
        ? rejectedProviderStageLabel
        : null,
      rejectedProviderRecoveryActionLabel: canRecoverRejectedProvider
        ? `${rejectedProviderStageLabel} nach Schema-Korrektur fortsetzen`
        : null,
      canRecoverQualityGate,
      qualityGateRecoveryActionLabel: canRecoverQualityGate
        ? 'HTML-Struktur gezielt reparieren und erneut prüfen'
        : null,
      canRecoverQualityGateManifest,
      qualityGateManifestRecoveryActionLabel: canRecoverQualityGateManifest
        ? 'Aktuellen Regelstand übernehmen und Strukturreparatur fortsetzen'
        : null,
      canRecoverEditorialReview: canRecoverEditorial,
      editorialReviewRecoveryActionLabel: canRecoverEditorial
        ? 'Nur redaktionelle Prüfung erneut ausführen'
        : null,
      canRecoverDraftPersistence: canRecoverDraft,
      draftPersistenceRecoveryActionLabel: canRecoverDraft
        ? 'Entwurf mit neuem Bild fertigstellen'
        : null,
      qualityIssues,
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
    };
  });
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
