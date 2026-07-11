import { sanitizeErrorMessage } from '../../repositories/contentErrorSanitizer.js';
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
  'jobLeaseMinutes'
]);

function safeError(value) {
  return value == null || value === '' ? null : sanitizeErrorMessage(value);
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

export function buildDraftListPresentation(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    imageUrl: row.image_url,
    workflowStatus: row.workflow_status,
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
  }));
}

export function buildJobListPresentation(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || 'Unbekannter Status',
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
      limitEur: Number(data.settings?.monthly_budget_cents || 0) / 100
    },
    approvals: { current: approvals, required: 8, ready: approvals >= 8 },
    drafts: buildDraftListPresentation(data.drafts || []),
    jobs: buildJobListPresentation(data.jobs || [])
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
