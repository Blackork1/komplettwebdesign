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
import { aggregateSearchConsoleCategories } from './searchConsoleCategoryService.js';
import { sanitizeArticleHtml } from './articleSanitizer.js';
import { normalizeSafeHttpsUrl } from './httpsUrlSafety.js';
import { evaluateExistingPostRevisionApproval } from './existingPostRevisionApprovalPolicy.js';
import {
  canDiscardDeterministicExistingPostOptimization
} from './existingPostOptimizationDiscardPolicy.js';

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

const EXISTING_OPTIMIZATION_STAGE_LABELS = Object.freeze({
  inventory: 'Bestandsaufnahme',
  live_snapshot: 'Livefassung prüfen',
  existing_content_audit: 'Bestandsanalyse',
  gsc_page_signals: 'Search-Console-Signale',
  freshness_classification: 'Aktualität prüfen',
  source_research: 'Quellenrecherche',
  targeted_optimization: 'Gezielte Optimierung',
  existing_post_diff: 'Änderungsvergleich',
  targeted_scope_validation: 'Änderungsumfang prüfen',
  article_validation: 'Artikel validieren',
  editorial_review: 'Redaktionelle Prüfung',
  repair: 'Gezielte Reparatur',
  revision_creation: 'Revision erstellt',
  completed: 'Abgeschlossen'
});

const SAFE_EXISTING_OPTIMIZATION_ERROR_CODES = new Set([
  'CONTENT_BUDGET_LIMIT_REACHED',
  'CONTENT_EXISTING_OPTIMIZATION_FAILED',
  'CONTENT_EXISTING_OPTIMIZATION_INPUT_INVALID',
  'CONTENT_EXISTING_OPTIMIZATION_PAYLOAD_INVALID',
  'CONTENT_EXISTING_OPTIMIZATION_RUNTIME_SNAPSHOT_INVALID',
  'CONTENT_JOB_LEASE_LOST',
  'CONTENT_POST_NOT_FOUND',
  'CONTENT_PERFORMANCE_EVIDENCE_STALE',
  'CONTENT_PROVIDER_SAFE_RETRY',
  'CONTENT_REVISION_CONFLICT',
  'CONTENT_REVISION_STALE',
  'CONTENT_RULE_MANIFEST_MISMATCH',
  'CONTENT_RUN_FINISH_FAILED',
  'CONTENT_RUNTIME_SNAPSHOT_INVALID',
  'CONTENT_STAGE_PERSISTENCE_FAILED',
  'article_validation_failed',
  'editorial_review_failed',
  'existing_post_editorial_review_failed',
  'existing_post_optimization_repair_failed',
  'existing_post_optimization_report_too_large',
  'insufficient_existing_post_sources',
  'live_post_hash_mismatch',
  'persisted_stage_result_invalid',
  'provider_execution_uncertain',
  'provider_request_rejected',
  'provider_stage_cost_invalid',
  'provider_stage_persistence_uncertain',
  'provider_stage_result_invalid',
  'provider_stage_schema_invalid',
  'sanitized_html_changed',
  'targeted_scope_exceeded'
]);

const UNSAFE_EXISTING_PROVIDER_CODES = new Set([
  'provider_execution_uncertain',
  'provider_stage_persistence_uncertain'
]);

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

function berlinDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const instant = value instanceof Date
    ? DateTime.fromJSDate(value)
    : DateTime.fromISO(String(value), { zone: 'Europe/Berlin' });
  return instant.isValid
    ? instant.setZone('Europe/Berlin').setLocale('de').toFormat('dd.LL.yyyy')
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
    evidence: (Array.isArray(row.evidence_json) ? row.evidence_json : []).slice(0, 5).map((item) => {
      const postId = safePositiveInteger(item.post_id);
      const performance = safePositiveInteger(item.snapshot_id) != null;
      const metrics = item?.windows?.[28] ?? item?.windows?.['28'] ?? {};
      return {
        postId,
        sourceType: performance ? 'performance' : 'editorial',
        sourceLabel: performance ? 'Performance' : 'Redaktionell',
        articleUrl: performance && postId
          ? `/admin/content-agent/existing-content/${postId}/performance`
          : postId ? `/admin/content-agent/drafts/${postId}/edit` : null,
        reviewVersion: safePositiveInteger(item.review_version),
        snapshotId: safePositiveInteger(item.snapshot_id),
        measurementDateLabel: performance ? berlinDate(item.evaluated_through_date) : null,
        impressions: performance ? Math.max(0, Number(metrics.impressions) || 0) : null,
        clicks: performance ? Math.max(0, Number(metrics.clicks) || 0) : null,
        reason: sanitizeLearningText(item.reason, 500),
        instruction: sanitizeLearningText(item.instruction, 500),
        section: sanitizeLearningText(item.section_name, 180) || null,
        anchor: sanitizeLearningText(item.anchor, 220) || null,
        evidenceCode: performance ? sanitizeLearningText(item.evidence_code, 80) : null
      };
    }).filter((item) => item.postId && item.articleUrl),
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

function searchConsoleRangePresentation(range = {}) {
  const start = DateTime.fromISO(String(range.start_date || range.startDate || ''), {
    zone: 'Europe/Berlin'
  });
  const end = DateTime.fromISO(String(range.end_date || range.endDate || ''), {
    zone: 'Europe/Berlin'
  });
  if (!start.isValid || !end.isValid || end < start) {
    return { periodLabel: 'Noch kein Zeitraum', periodDetail: 'Keine gespeicherten Tage' };
  }
  const days = Math.floor(end.startOf('day').diff(start.startOf('day'), 'days').days) + 1;
  return {
    periodLabel: start.year === end.year
      ? `${start.toFormat('dd.LL.')}–${end.toFormat('dd.LL.yyyy')}`
      : `${start.toFormat('dd.LL.yyyy')}–${end.toFormat('dd.LL.yyyy')}`,
    periodDetail: `${days} gespeicherte${days === 1 ? 'r Tag' : ' Tage'}`
  };
}

function pageRowsFromMetrics(metrics = []) {
  const pages = new Map();
  for (const row of metrics) {
    const pageUrl = String(row?.page_url || '');
    const current = pages.get(pageUrl) || { page_url: pageUrl, clicks: 0, impressions: 0 };
    current.clicks += Number(row?.clicks) || 0;
    current.impressions += Number(row?.impressions) || 0;
    pages.set(pageUrl, current);
  }
  return [...pages.values()];
}

export function buildSearchConsolePresentation(data = {}) {
  const sourceMetrics = Array.isArray(data.metrics) ? data.metrics : [];
  const sourcePages = Array.isArray(data.pages) && data.pages.length > 0
    ? data.pages
    : pageRowsFromMetrics(sourceMetrics);
  const sourceOpportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
  const countFormat = { maximumFractionDigits: 0 };
  const percentFormat = { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const aggregate = aggregateSearchConsoleCategories({
    pages: sourcePages,
    metrics: sourceMetrics
  });
  const range = searchConsoleRangePresentation(data.range);

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
  const presentRate = (value) => germanNumber(value, percentFormat);
  const presentCount = (value) => germanNumber(value, countFormat);
  const presentPosition = (value) => germanNumber(value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  const categories = aggregate.categories.map((category) => ({
    key: category.key,
    label: category.label,
    description: category.description,
    primary: category.primary === true,
    clicks: presentCount(category.clicks),
    impressions: presentCount(category.impressions),
    ctr: presentRate(category.ctr),
    share: presentRate(category.share),
    hasData: category.impressions > 0,
    languages: category.languages.map((language) => ({
      key: language.key,
      label: language.label,
      clicks: presentCount(language.clicks),
      impressions: presentCount(language.impressions),
      ctr: presentRate(language.ctr),
      hasData: language.impressions > 0
    })),
    subcategories: category.subcategories.map((subcategory) => ({
      key: subcategory.key,
      label: subcategory.label,
      clicks: presentCount(subcategory.clicks),
      impressions: presentCount(subcategory.impressions),
      ctr: presentRate(subcategory.ctr),
      hasData: subcategory.impressions > 0
    })),
    pages: category.pages.map((page) => ({
      path: page.path,
      language: page.language === 'en' ? 'Englisch' : 'Deutsch',
      clicks: presentCount(page.clicks),
      impressions: presentCount(page.impressions),
      ctr: presentRate(page.ctr)
    })),
    queries: category.queries.map((query) => ({
      query: query.query,
      page: query.path,
      language: query.language === 'en' ? 'Englisch' : 'Deutsch',
      clicks: presentCount(query.clicks),
      impressions: presentCount(query.impressions),
      ctr: presentRate(query.ctr),
      position: presentPosition(query.averagePosition)
    }))
  }));
  const categoryLabelByKey = new Map(categories.map((category) => [category.key, category.label]));
  const contentOpportunities = aggregate.contentOpportunities.map((item) => ({
    query: item.query,
    page: item.path,
    categoryKey: item.categoryKey,
    categoryLabel: categoryLabelByKey.get(item.categoryKey) || 'Sonstige Inhalte',
    language: item.language === 'en' ? 'Englisch' : 'Deutsch',
    clicks: presentCount(item.clicks),
    impressions: presentCount(item.impressions),
    ctr: presentRate(item.ctr),
    position: presentPosition(item.averagePosition)
  }));

  return {
    summary: {
      queryCount: metrics.length,
      clicks: presentCount(aggregate.summary.clicks),
      impressions: presentCount(aggregate.summary.impressions),
      ctr: presentRate(aggregate.summary.ctr),
      opportunityCount: opportunities.length,
      ...range
    },
    categories,
    contentOpportunities,
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

function outcomeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function outcomeMetricLabels(row, prefix) {
  const clicks = outcomeNumber(row[`${prefix}_clicks`]);
  const impressions = outcomeNumber(row[`${prefix}_impressions`]);
  const ctr = outcomeNumber(row[`${prefix}_ctr`]);
  const averagePosition = outcomeNumber(row[`${prefix}_average_position`]);
  return {
    clicksLabel: clicks === null ? '–' : germanNumber(clicks, { maximumFractionDigits: 0 }),
    impressionsLabel: impressions === null
      ? '–'
      : germanNumber(impressions, { maximumFractionDigits: 0 }),
    ctrLabel: ctr === null
      ? '–'
      : germanNumber(ctr, { style: 'percent', maximumFractionDigits: 1 }),
    averagePositionLabel: averagePosition === null
      ? '–'
      : germanNumber(averagePosition, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  };
}

function outcomeChangeLabels(value) {
  const changes = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const label = (raw, options = {}) => {
    const number = outcomeNumber(raw);
    return number === null ? '–' : germanNumber(number, { signDisplay: 'exceptZero', ...options });
  };
  return {
    clicksLabel: label(changes.clicks, { maximumFractionDigits: 0 }),
    impressionsLabel: label(changes.impressions, { maximumFractionDigits: 0 }),
    ctrLabel: label(changes.ctr, { style: 'percent', maximumFractionDigits: 1 }),
    averagePositionLabel: label(changes.averagePosition, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
  };
}

function outcomeQueryPresentation(value) {
  const seen = new Set();
  const result = [];
  for (const raw of Array.isArray(value) ? value : []) {
    const query = [...String(raw?.query || '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()]
      .slice(0, 160)
      .join('');
    if (!query || seen.has(query)) continue;
    seen.add(query);
    const clicks = outcomeNumber(raw?.clicks);
    const impressions = outcomeNumber(raw?.impressions);
    result.push({
      query,
      clicksLabel: clicks === null ? '–' : germanNumber(clicks, { maximumFractionDigits: 0 }),
      impressionsLabel: impressions === null
        ? '–'
        : germanNumber(impressions, { maximumFractionDigits: 0 })
    });
    if (result.length === 5) break;
  }
  return result;
}

function presentRevisionOutcome(row) {
  const status = typeof row.outcome_evaluation_status === 'string'
    ? row.outcome_evaluation_status
    : '';
  if (!status) return null;
  const state = status === 'evaluated'
    ? 'observed'
    : status === 'insufficient_data'
      ? 'insufficient_data'
      : 'waiting';
  const label = state === 'observed'
    ? 'Neutrale Beobachtung'
    : state === 'insufficient_data'
      ? 'Noch nicht belastbar'
      : 'Warte auf 28 Tage';
  return {
    state,
    label,
    note: state === 'waiting'
      ? null
      : 'Die Werte sind eine neutrale Beobachtung. Saison, Nachfrage und Google-Änderungen können sie beeinflussen.',
    baseline: outcomeMetricLabels(row, 'outcome_baseline'),
    followup: outcomeMetricLabels(row, 'outcome_followup'),
    changes: outcomeChangeLabels(row.outcome_changes_json),
    newImportantQueries: outcomeQueryPresentation(row.outcome_new_queries_json),
    lostImportantQueries: outcomeQueryPresentation(row.outcome_lost_queries_json)
  };
}

const ARTICLE_PERFORMANCE_HEADLINES = Object.freeze({
  visibility_opportunity: 'Organische Sichtbarkeit aufbauen',
  snippet_or_intent_opportunity: 'Suchergebnis oder Suchintention prüfen',
  ranking_opportunity: 'Rankingchance gezielt nutzen',
  content_or_cta_opportunity: 'Artikelwirkung und CTA prüfen',
  contact_path_opportunity: 'Anfrageweg prüfen'
});

const ARTICLE_PERFORMANCE_STATUS = Object.freeze({
  collecting_data: 'Daten werden noch gesammelt',
  insufficient_impressions: 'Noch nicht genügend Impressionen',
  positive: 'Positives Muster erkannt',
  stable: 'Unauffällige Entwicklung',
  opportunity: 'Optimierungspotenzial erkannt'
});

function performanceNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function performanceWindow(raw, days, hasSnapshot) {
  const metrics = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const coverageDayCount = Math.min(days, Math.max(0, Math.trunc(performanceNumber(metrics.coverageDayCount))));
  const impressions = performanceNumber(metrics.impressions);
  const clicks = performanceNumber(metrics.clicks);
  const ctr = performanceNumber(metrics.ctr);
  const averagePosition = performanceNumber(metrics.averagePosition);
  const ctaClicks = performanceNumber(metrics.ctaClicks);
  const contactSubmits = performanceNumber(metrics.contactSubmits);
  const complete = metrics.complete === true && coverageDayCount >= days;
  return {
    days,
    label: `${days} Tage`,
    hasData: hasSnapshot && coverageDayCount > 0,
    complete,
    coverageDayCount,
    emptyLabel: !hasSnapshot
      ? 'Noch keine GSC-Daten'
      : complete ? null : `${coverageDayCount} von ${days} Tagen`,
    impressions,
    impressionsLabel: germanNumber(impressions, { maximumFractionDigits: 0 }),
    clicks,
    clicksLabel: germanNumber(clicks, { maximumFractionDigits: 0 }),
    ctr,
    ctrLabel: germanNumber(ctr, { style: 'percent', maximumFractionDigits: 1 }),
    averagePosition,
    averagePositionLabel: averagePosition > 0
      ? germanNumber(averagePosition, { maximumFractionDigits: 1 })
      : '–',
    ctaClicks,
    ctaClicksLabel: germanNumber(ctaClicks, { maximumFractionDigits: 0 }),
    contactSubmits,
    contactSubmitsLabel: germanNumber(contactSubmits, { maximumFractionDigits: 0 })
  };
}

function performanceHeadline(snapshot) {
  if (!snapshot) return 'Noch keine GSC-Daten';
  const diagnoses = Array.isArray(snapshot.diagnoses_json) ? snapshot.diagnoses_json : [];
  const diagnosis = diagnoses.find((item) => ARTICLE_PERFORMANCE_HEADLINES[item?.code]);
  if (diagnosis) return ARTICLE_PERFORMANCE_HEADLINES[diagnosis.code];
  return ARTICLE_PERFORMANCE_STATUS[snapshot.status] || 'Performance wird ausgewertet';
}

export function presentArticlePerformanceSummary(snapshot) {
  const hasSnapshot = Boolean(snapshot && typeof snapshot === 'object');
  const windows = hasSnapshot && snapshot.windows_json && typeof snapshot.windows_json === 'object'
    ? snapshot.windows_json
    : {};
  return {
    hasSnapshot,
    headline: performanceHeadline(hasSnapshot ? snapshot : null),
    status: hasSnapshot ? sanitizeLearningText(snapshot.status, 32) || 'unknown' : 'missing',
    isEligible: hasSnapshot && snapshot.data_eligible === true,
    learningEligible: hasSnapshot && snapshot.learning_eligible === true,
    evaluatedThroughDateLabel: hasSnapshot ? berlinDate(snapshot.evaluated_through_date) : null,
    articleAgeDays: hasSnapshot ? Math.max(0, Number(snapshot.article_age_days) || 0) : null,
    windows: [7, 14, 28].map((days) => performanceWindow(windows[days] ?? windows[String(days)], days, hasSnapshot))
  };
}

function prefixedPerformanceSnapshot(row = {}) {
  if (!row.performance_snapshot_id) return null;
  return {
    id: row.performance_snapshot_id,
    post_id: row.id,
    evaluated_through_date: row.performance_evaluated_through_date,
    article_age_days: row.performance_article_age_days,
    windows_json: row.performance_windows_json,
    previous_windows_json: row.performance_previous_windows_json,
    cohort_json: row.performance_cohort_json,
    status: row.performance_status,
    diagnoses_json: row.performance_diagnoses_json,
    positive_signals_json: row.performance_positive_signals_json,
    data_eligible: row.performance_data_eligible,
    learning_eligible: row.performance_learning_eligible,
    explanation_status: row.performance_explanation_status,
    explanation_json: row.performance_explanation_json
  };
}

function performanceDelta(current, previous, key, options = {}) {
  const currentValue = performanceNumber(current?.[key]);
  const previousValue = performanceNumber(previous?.[key]);
  const difference = currentValue - previousValue;
  return {
    currentLabel: germanNumber(currentValue, options),
    previousLabel: germanNumber(previousValue, options),
    differenceLabel: germanNumber(difference, { ...options, signDisplay: 'exceptZero' }),
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'same'
  };
}

function performanceQueries(snapshot) {
  const current28 = snapshot?.windows_json?.[28] ?? snapshot?.windows_json?.['28'] ?? {};
  return (Array.isArray(current28.queries) ? current28.queries : []).slice(0, 10).map((row) => {
    const impressions = performanceNumber(row?.impressions);
    const clicks = performanceNumber(row?.clicks);
    const ctr = performanceNumber(row?.ctr);
    const averagePosition = performanceNumber(row?.averagePosition);
    return {
      query: sanitizeLearningText(row?.query, 180) || 'Unbekannte Suchanfrage',
      impressionsLabel: germanNumber(impressions, { maximumFractionDigits: 0 }),
      clicksLabel: germanNumber(clicks, { maximumFractionDigits: 0 }),
      ctrLabel: germanNumber(ctr, { style: 'percent', maximumFractionDigits: 1 }),
      averagePositionLabel: averagePosition > 0
        ? germanNumber(averagePosition, { maximumFractionDigits: 1 })
        : '–'
    };
  });
}

export function presentArticlePerformanceDetail(raw = {}) {
  const post = raw.post && typeof raw.post === 'object' ? raw.post : {};
  const snapshot = raw.snapshot && typeof raw.snapshot === 'object' ? raw.snapshot : null;
  const summary = presentArticlePerformanceSummary(snapshot);
  const current28 = snapshot?.windows_json?.[28] ?? snapshot?.windows_json?.['28'] ?? {};
  const previous28 = snapshot?.previous_windows_json?.[28] ?? snapshot?.previous_windows_json?.['28'] ?? {};
  const cohort = snapshot?.cohort_json && typeof snapshot.cohort_json === 'object'
    ? snapshot.cohort_json
    : {};
  const explanation = snapshot?.explanation_status === 'ready'
    && snapshot.explanation_json && typeof snapshot.explanation_json === 'object'
    ? snapshot.explanation_json
    : {};
  const strengths = (Array.isArray(explanation.strengths) ? explanation.strengths : [])
    .slice(0, 4).map((item) => sanitizeLearningText(item, 500)).filter(Boolean);
  const improvements = (Array.isArray(explanation.improvements) ? explanation.improvements : [])
    .slice(0, 4).map((item) => sanitizeLearningText(item, 500)).filter(Boolean);
  const learning = raw.learning && typeof raw.learning === 'object' ? raw.learning : {};
  const pendingCount = Math.max(0, Number(learning.pendingCount) || 0);
  const activeCount = Math.max(0, Number(learning.activeCount) || 0);
  const evidenceHash = String(snapshot?.evidence_hash || '');
  const workflow = raw.workflow && typeof raw.workflow === 'object' ? raw.workflow : {};
  const canCreateRevision = summary.isEligible
    && snapshot?.status === 'opportunity'
    && Array.isArray(snapshot?.diagnoses_json)
    && snapshot.diagnoses_json.length > 0
    && safePositiveInteger(snapshot?.id) !== null
    && /^[0-9a-f]{64}$/.test(evidenceHash)
    && safePositiveInteger(post.id) !== null
    && workflow.hasDraftRevision !== true
    && workflow.hasActiveOptimization !== true;
  return {
    post: {
      id: safePositiveInteger(post.id),
      title: sanitizeLearningText(post.title, 240) || 'Unbenannter Artikel',
      slug: sanitizeLearningText(post.slug, 240) || '',
      liveUrl: post.slug ? `/blog/${encodeURIComponent(String(post.slug))}` : null,
      contentCluster: sanitizeLearningText(post.contentCluster, 120) || 'Nicht zugeordnet',
      primaryKeyword: sanitizeLearningText(post.primaryKeyword, 180) || null,
      searchIntent: sanitizeLearningText(post.searchIntent, 80) || null,
      publishedAtLabel: berlinDate(post.publishedAt),
      updatedAtLabel: berlinDate(post.updatedAt)
    },
    ...summary,
    summaryText: sanitizeLearningText(explanation.summary, 700)
      || (summary.hasSnapshot ? 'Die Kennzahlen werden regelbasiert und ohne vorschnelle Kausalannahmen eingeordnet.' : 'Für diesen Artikel liegt noch kein täglicher Performance-Snapshot vor.'),
    windows: summary.windows,
    comparison: {
      available: previous28?.complete === true,
      impressions: performanceDelta(current28, previous28, 'impressions', { maximumFractionDigits: 0 }),
      clicks: performanceDelta(current28, previous28, 'clicks', { maximumFractionDigits: 0 }),
      ctr: performanceDelta(current28, previous28, 'ctr', { style: 'percent', maximumFractionDigits: 1 }),
      averagePosition: performanceDelta(current28, previous28, 'averagePosition', { maximumFractionDigits: 1 })
    },
    cohort: {
      available: cohort.available === true,
      sourceLabel: cohort.source === 'cluster' ? 'Ähnliche Artikel im Themencluster' : 'Artikel ähnlichen Alters',
      size: Math.max(0, Number(cohort.size) || 0),
      medianImpressionsLabel: germanNumber(performanceNumber(cohort.medianImpressions), { maximumFractionDigits: 0 })
    },
    funnel: [
      { label: 'Impressionen', valueLabel: germanNumber(performanceNumber(current28.impressions), { maximumFractionDigits: 0 }) },
      { label: 'Organische Klicks', valueLabel: germanNumber(performanceNumber(current28.clicks), { maximumFractionDigits: 0 }) },
      { label: 'CTA-Klicks', valueLabel: germanNumber(performanceNumber(current28.ctaClicks), { maximumFractionDigits: 0 }) },
      { label: 'Kontaktanfragen', valueLabel: germanNumber(performanceNumber(current28.contactSubmits), { maximumFractionDigits: 0 }) }
    ],
    queries: performanceQueries(snapshot),
    strengths,
    improvements,
    nextCheck: sanitizeLearningText(explanation.nextCheck, 500)
      || (summary.isEligible ? 'Nach der nächsten vollständigen Messperiode erneut prüfen.' : 'Zunächst weitere belastbare Daten sammeln.'),
    explanationReady: snapshot?.explanation_status === 'ready',
    opportunity: raw.opportunity ? {
      typeLabel: raw.opportunity.opportunityType === 'meta_refresh' ? 'Meta-Daten prüfen' : 'Inhalt prüfen',
      scoreLabel: germanNumber(performanceNumber(raw.opportunity.score), { maximumFractionDigits: 0 }),
      statusLabel: raw.opportunity.status === 'open' ? 'Offen' : 'Bereits bearbeitet'
    } : null,
    learning: {
      pendingCount,
      activeCount,
      statusLabel: activeCount > 0
        ? `${activeCount} aktive Lernregel${activeCount === 1 ? '' : 'n'}`
        : pendingCount > 0
          ? `${pendingCount} Lernvorschlag${pendingCount === 1 ? '' : 'e'} wartet auf Freigabe`
          : summary.learningEligible ? 'Als Lernsignal freigegeben' : 'Noch kein belastbares Lernsignal',
      dashboardUrl: '/admin/content-agent/learning-rules'
    },
    revisionAction: canCreateRevision ? {
      available: true,
      url: `/admin/content-agent/existing-content/${post.id}/performance/revision`,
      snapshotId: safePositiveInteger(snapshot.id),
      evidenceHash
    } : { available: false }
  };
}

export function buildExistingContentListPresentation(rows = []) {
  return rows.map((row) => {
    const outcome = presentRevisionOutcome(row);
    const performance = presentArticlePerformanceSummary(prefixedPerformanceSnapshot(row));
    return ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      updatedAt: row.updated_at,
      performance: {
        ...performance,
        detailUrl: `/admin/content-agent/existing-content/${row.id}/performance`
      },
      optimization: presentExistingContentOptimizationState(row),
      ...(outcome ? { outcome } : {}),
      ...(Object.hasOwn(row, 'audit_id') ? {
        auditId: row.audit_id || null,
        auditScore: row.audit_score === null || row.audit_score === undefined
          ? null
          : Number(row.audit_score),
        auditStatus: row.audit_status || null,
        findings: Array.isArray(row.findings_json) ? row.findings_json : [],
        revisionId: row.revision_id || null,
        revisionStatus: row.revision_status || null
      } : {})
    });
  });
}

const REVISION_COMPARISON_GROUPS = Object.freeze([
  Object.freeze({ key: 'metadata', label: 'Meta-Daten', icon: 'fa-tags' }),
  Object.freeze({ key: 'content', label: 'Inhalt', icon: 'fa-align-left' }),
  Object.freeze({ key: 'faq', label: 'FAQ', icon: 'fa-circle-question' }),
  Object.freeze({ key: 'images', label: 'Bilddaten', icon: 'fa-image' }),
  Object.freeze({ key: 'links', label: 'Links', icon: 'fa-link' })
]);

const REVISION_FIELD_LABELS = Object.freeze({
  title: 'Titel',
  shortDescription: 'Kurzbeschreibung',
  excerpt: 'Kurzbeschreibung',
  metaTitle: 'Meta Title',
  meta_title: 'Meta Title',
  metaDescription: 'Meta Description',
  meta_description: 'Meta Description',
  ogTitle: 'OG-Titel',
  og_title: 'OG-Titel',
  ogDescription: 'OG-Beschreibung',
  og_description: 'OG-Beschreibung',
  contentHtml: 'Artikelinhalt',
  content: 'Artikelinhalt',
  faqJson: 'FAQ',
  faq_json: 'FAQ',
  imageAlt: 'Bild-Alt-Text',
  image_alt: 'Bild-Alt-Text',
  imageUrl: 'Bild-URL',
  image_url: 'Bild-URL',
  links: 'Link'
});

const REVISION_CHANGE_TYPES = Object.freeze({
  added: Object.freeze({ kind: 'added', label: 'Hinzugefügt', icon: 'fa-plus' }),
  removed: Object.freeze({ kind: 'removed', label: 'Entfernt', icon: 'fa-minus' }),
  moved: Object.freeze({ kind: 'modified', label: 'Geändert', icon: 'fa-pen' }),
  moved_modified: Object.freeze({ kind: 'modified', label: 'Geändert', icon: 'fa-pen' }),
  modified: Object.freeze({ kind: 'modified', label: 'Geändert', icon: 'fa-pen' })
});

const REVISION_COMPARISON_LIMITS = Object.freeze({
  changes: 40,
  sources: 6,
  gscSignals: 10,
  excerpt: 600,
  reason: 500,
  query: 180
});

function comparisonExcerpt(value) {
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return sanitizeLearningText(String(value), REVISION_COMPARISON_LIMITS.excerpt) || '–';
  }
  if (Array.isArray(value)) {
    const items = value.slice(0, 3).map(comparisonExcerpt).filter((item) => item !== '–');
    return sanitizeLearningText(items.join(' · '), REVISION_COMPARISON_LIMITS.excerpt) || '–';
  }
  if (value && typeof value === 'object') {
    const question = sanitizeLearningText(value.question, 260);
    const answer = sanitizeLearningText(value.answer, 320);
    return sanitizeLearningText(
      [question && `Frage: ${question}`, answer && `Antwort: ${answer}`].filter(Boolean).join(' · '),
      REVISION_COMPARISON_LIMITS.excerpt
    ) || '–';
  }
  return '–';
}

function comparisonGroupKey(change = {}) {
  const field = String(change.field || '');
  const marker = `${field} ${change.path || ''} ${change.blockType || ''} ${change.before || ''} ${change.after || ''}`;
  if (change.kind === 'faq' || ['faqJson', 'faq_json'].includes(field)) return 'faq';
  if (['imageAlt', 'image_alt', 'imageUrl', 'image_url'].includes(field)) return 'images';
  if (/\blink(?:s)?\b|<a\b|href=/iu.test(marker)) return 'links';
  if (['contentHtml', 'content'].includes(field) || change.kind === 'html') return 'content';
  return 'metadata';
}

function comparisonReason(change = {}, report = {}) {
  const direct = Array.isArray(change.reasons)
    ? change.reasons.find((reason) => typeof reason?.reason === 'string')
    : null;
  const fallback = Array.isArray(report.changeReasons)
    ? report.changeReasons.find((reason) => reason?.field === change.field)
    : null;
  return sanitizeLearningText(direct?.reason || fallback?.reason || '', REVISION_COMPARISON_LIMITS.reason)
    || 'Serverseitig ermittelte Abweichung zwischen Livefassung und Revision.';
}

function comparisonAuditCodes(change = {}, report = {}) {
  const direct = Array.isArray(change.reasons)
    ? change.reasons.flatMap((reason) => Array.isArray(reason?.auditCodes) ? reason.auditCodes : [])
    : [];
  const fallback = Array.isArray(report.changeReasons)
    ? report.changeReasons
      .filter((reason) => reason?.field === change.field)
      .flatMap((reason) => Array.isArray(reason.auditCodes) ? reason.auditCodes : [])
    : [];
  return [...new Set([...direct, ...fallback]
    .map((code) => sanitizeLearningText(code, 80))
    .filter((code) => /^[a-z0-9_:-]{1,80}$/i.test(code)))]
    .slice(0, 6);
}

function comparisonChanges(report = {}) {
  const source = Array.isArray(report.changes) ? report.changes : [];
  const ids = new Set();
  const changes = [];
  for (const change of source) {
    if (changes.length >= REVISION_COMPARISON_LIMITS.changes) break;
    if (!change || typeof change !== 'object' || Array.isArray(change)) continue;
    const id = typeof change.id === 'string' && /^[0-9a-f]{64}$/.test(change.id) ? change.id : null;
    if (!id || ids.has(id)) continue;
    ids.add(id);
    const type = REVISION_CHANGE_TYPES[change.changeType] || REVISION_CHANGE_TYPES.modified;
    const status = ['reverted', 'manual_edit'].includes(change.status)
      ? change.status
      : 'active';
    const statusPresentation = {
      active: { label: 'Aktiv', icon: 'fa-circle-check' },
      reverted: { label: 'Zurückgenommen', icon: 'fa-rotate-left' },
      manual_edit: { label: 'Manuell nachbearbeitet', icon: 'fa-pen-to-square' }
    }[status];
    const revertible = status === 'active' && change.revertible === true;
    changes.push({
      id,
      label: REVISION_FIELD_LABELS[change.field] || 'Inhaltliche Änderung',
      groupKey: comparisonGroupKey(change),
      kind: type.kind,
      kindLabel: type.label,
      kindIcon: type.icon,
      status,
      statusLabel: statusPresentation.label,
      statusIcon: statusPresentation.icon,
      beforeExcerpt: comparisonExcerpt(change.before),
      afterExcerpt: comparisonExcerpt(change.after),
      reason: comparisonReason(change, report),
      auditCodes: comparisonAuditCodes(change, report),
      revertible,
      revertBlockedReason: revertible
        ? null
        : status === 'reverted'
          ? 'Diese Änderung wurde bereits zurückgenommen.'
          : status === 'manual_edit'
            ? 'Diese KI-Änderung wurde manuell nachbearbeitet und ist nicht mehr einzeln rücknehmbar.'
            : change.kind === 'html'
              ? 'Dieser HTML-Block ist nicht eindeutig und sicher zuordenbar.'
              : 'Diese Änderung ist nicht sicher einzeln rücknehmbar.'
    });
  }
  return changes;
}

function comparisonSources(report = {}) {
  const sources = [];
  const seen = new Set();
  for (const source of Array.isArray(report.sources) ? report.sources : []) {
    if (sources.length >= REVISION_COMPARISON_LIMITS.sources) break;
    const url = normalizeSafeHttpsUrl(source?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: sanitizeLearningText(source?.title, 240) || 'Aktuelle Fachquelle',
      publisher: sanitizeLearningText(source?.publisher, 180) || null,
      publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(source?.publishedAt || ''))
        ? String(source.publishedAt)
        : null,
      url
    });
  }
  return sources;
}

function comparisonNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function comparisonGscSignals(report = {}) {
  const raw = Array.isArray(report.gscSignals)
    ? report.gscSignals
    : Array.isArray(report.searchConsoleSignals) ? report.searchConsoleSignals : [];
  return raw.slice(0, REVISION_COMPARISON_LIMITS.gscSignals).map((signal) => {
    const clicks = comparisonNumber(signal?.clicks);
    const impressions = comparisonNumber(signal?.impressions);
    const ctr = comparisonNumber(signal?.ctr);
    const averagePosition = comparisonNumber(signal?.average_position ?? signal?.averagePosition);
    return {
      query: sanitizeLearningText(signal?.query, REVISION_COMPARISON_LIMITS.query) || 'Suchanfrage nicht benannt',
      clicksLabel: germanNumber(clicks, { maximumFractionDigits: 0 }),
      impressionsLabel: germanNumber(impressions, { maximumFractionDigits: 0 }),
      ctrLabel: germanNumber(ctr, { style: 'percent', maximumFractionDigits: 1 }),
      averagePositionLabel: averagePosition > 0
        ? germanNumber(averagePosition, { maximumFractionDigits: 1 })
        : '–'
    };
  });
}

function comparisonScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
}

function comparisonPreview(fields = {}, prefix = '') {
  const read = (snake, camel = snake) => prefix
    ? fields[`${prefix}_${snake}`]
    : fields[snake] ?? fields[camel];
  const content = read('content', 'contentHtml');
  return {
    title: sanitizeLearningText(read('title'), 255) || 'Ohne Titel',
    excerpt: sanitizeLearningText(read('excerpt', 'shortDescription'), 500) || '–',
    contentHtml: sanitizeArticleHtml(String(content || '').slice(0, 250_000)),
    metaTitle: sanitizeLearningText(read('meta_title', 'metaTitle'), 255) || '–',
    metaDescription: sanitizeLearningText(read('meta_description', 'metaDescription'), 500) || '–',
    ogTitle: sanitizeLearningText(read('og_title', 'ogTitle'), 255) || '–',
    ogDescription: sanitizeLearningText(read('og_description', 'ogDescription'), 500) || '–',
    imageAlt: sanitizeLearningText(read('image_alt', 'imageAlt'), 500) || '–'
  };
}

export function buildRevisionComparisonPresentation(revision = {}) {
  const report = revision.optimization_report_json && typeof revision.optimization_report_json === 'object'
    && !Array.isArray(revision.optimization_report_json)
    ? revision.optimization_report_json
    : {};
  const snapshotFields = revision.snapshot_json?.fields && typeof revision.snapshot_json.fields === 'object'
    && !Array.isArray(revision.snapshot_json.fields)
    ? revision.snapshot_json.fields
    : {};
  const changes = comparisonChanges(report);
  const score = comparisonScore(report.afterScore);
  const beforeScore = comparisonScore(report.beforeScore ?? revision.audit_score);
  const revisionStatus = ['draft', 'approved', 'rejected'].includes(revision.status)
    ? revision.status
    : 'rejected';
  const approval = evaluateExistingPostRevisionApproval({ revision });
  const reportedRevalidationStatus = ['passed', 'failed', 'pending'].includes(
    report.revalidation?.status
  ) ? report.revalidation.status : null;
  const revalidationStatus = reportedRevalidationStatus
    || 'failed';
  const revalidationPresentation = {
    passed: { label: 'Aktuellen Stand geprüft' },
    pending: { label: 'Erneute Prüfung läuft' },
    failed: { label: 'Erneute Prüfung fehlgeschlagen' }
  }[revalidationStatus];
  return {
    revisionId: presentedPositiveInteger(revision.id),
    revisionVersion: presentedPositiveInteger(revision.revision_version) || 1,
    revisionStatus,
    revalidationStatus,
    revalidationStatusLabel: revalidationPresentation.label,
    approvalEnabled: approval.allowed,
    approvalBlockedReason: approval.allowed ? null : approval.reasonLabel,
    qualityScore: score,
    beforeQualityScore: beforeScore,
    changeCount: changes.length,
    live: comparisonPreview(revision, 'live'),
    optimized: comparisonPreview(snapshotFields),
    changes,
    changeGroups: REVISION_COMPARISON_GROUPS.map((group) => ({
      ...group,
      changes: changes.filter((change) => change.groupKey === group.key)
    })),
    sources: comparisonSources(report),
    gscSignals: comparisonGscSignals(report)
  };
}

function presentedPositiveInteger(value) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function presentedTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function presentExistingContentOptimizationState(row = {}) {
  const jobId = presentedPositiveInteger(row.optimization_job_id);
  if (jobId === null) {
    return {
      state: 'idle',
      active: false,
      terminal: false,
      canStart: true,
      canDiscard: false,
      discardActionUrl: null,
      statusLabel: 'Noch nicht gestartet',
      stageLabel: 'Noch keine Stufe',
      message: 'Noch keine KI-Optimierung gestartet.',
      jobId: null,
      revisionId: null,
      revisionUrl: null,
      errorCode: null,
      unsafeProviderState: false,
      updatedAt: null
    };
  }

  const rawStatus = typeof row.optimization_job_status === 'string'
    ? row.optimization_job_status
    : '';
  const state = rawStatus === 'needs_manual_attention'
    ? 'manual_attention'
    : ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(rawStatus)
      ? rawStatus
      : 'manual_attention';
  const active = state === 'queued' || state === 'running';
  const terminal = !active;
  const rawStage = typeof row.optimization_current_stage === 'string'
    ? row.optimization_current_stage.split(':')[0]
    : '';
  const stageLabel = EXISTING_OPTIMIZATION_STAGE_LABELS[rawStage]
    || (rawStage ? 'Unbekannte Stufe' : 'Noch keine Stufe');
  const rawErrorCode = typeof row.optimization_error_code === 'string'
    ? row.optimization_error_code
    : '';
  const errorCode = SAFE_EXISTING_OPTIMIZATION_ERROR_CODES.has(rawErrorCode)
    ? rawErrorCode
    : null;
  const unsafeProviderState = UNSAFE_EXISTING_PROVIDER_CODES.has(errorCode);
  const revisionId = presentedPositiveInteger(row.optimization_revision_id);
  const hasDraftRevision = revisionId !== null
    && row.optimization_revision_status === 'draft';
  const hasAnyDraftRevision = hasDraftRevision || row.has_draft_revision === true;
  const postId = presentedPositiveInteger(row.id);
  const canDiscard = postId !== null && canDiscardDeterministicExistingPostOptimization({
    jobType: 'optimize_existing_post',
    jobStatus: rawStatus,
    runStatus: row.optimization_run_status,
    errorCode,
    openProviderReservationCount: row.open_provider_reservation_count,
    hasDraftRevision: hasAnyDraftRevision
  });
  const messages = {
    queued: 'Die KI-Optimierung wurde eingeplant und wartet auf den Worker.',
    running: `Die KI-Optimierung läuft: ${stageLabel}.`,
    completed: 'Die Optimierung ist abgeschlossen. Die Livefassung blieb unverändert.',
    failed: 'Die KI-Optimierung ist fehlgeschlagen. Ein neuer, sicherer Start ist möglich.',
    cancelled: 'Der deterministische Auftrag wurde sicher geschlossen. Ein neuer Start ist möglich.',
    manual_attention: unsafeProviderState
      ? 'Der Providerzustand ist nicht eindeutig und benötigt eine manuelle Prüfung.'
      : canDiscard
        ? 'Der deterministische Lauf kann sicher geschlossen werden.'
        : 'Der Lauf benötigt eine manuelle Prüfung.'
  };
  const labels = {
    queued: 'Eingeplant',
    running: 'In Bearbeitung',
    completed: hasDraftRevision ? 'Revision bereit' : 'Abgeschlossen',
    failed: 'Fehlgeschlagen',
    cancelled: 'Sicher geschlossen',
    manual_attention: 'Manuelle Prüfung nötig'
  };

  return {
    state,
    active,
    terminal,
    canStart: ['completed', 'failed', 'cancelled'].includes(state)
      && !unsafeProviderState
      && !hasAnyDraftRevision,
    canDiscard,
    discardActionUrl: canDiscard
      ? `/admin/content-agent/existing-content/${postId}/optimization-jobs/${jobId}/discard`
      : null,
    statusLabel: labels[state],
    stageLabel,
    message: messages[state],
    jobId,
    revisionId: hasDraftRevision ? revisionId : null,
    revisionUrl: hasDraftRevision
      ? `/admin/content-agent/revisions/${revisionId}/edit`
      : null,
    errorCode,
    unsafeProviderState,
    updatedAt: presentedTimestamp(row.optimization_job_updated_at)
  };
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
