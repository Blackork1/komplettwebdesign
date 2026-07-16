import pool from '../util/db.js';
import { getMonthlyContentCost } from '../services/contentAgent/contentCostService.js';
import {
  hasDraftContentRevision,
  lockContentPostRevisionInvariant
} from './contentPostRevisionInvariant.js';

const OVERVIEW_DRAFT_LIMIT = 10;
const OVERVIEW_JOB_LIMIT = 10;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const REVIEW_STATUS_FILTERS = new Set(['review', 'approved', 'missed', 'published']);
const DRAFT_PERSISTENCE_RECOVERABLE_SQL = `(
  r.error_report_json ->> 'code' = 'pipeline_failed'
  AND r.error_report_json ->> 'message' = 'value too long for type character varying(80)'
  AND r.stage_results_json -> 'validation:3' ->> 'passed' = 'true'
  AND r.stage_results_json -> 'review:4' -> 'value' ->> 'passed' = 'true'
  AND COALESCE((r.stage_results_json -> 'review:4' -> 'value' ->> 'score')::int, 0) >= 80
  AND r.stage_results_json -> 'review:4' -> 'value' ->> 'requiresManualReview' = 'false'
  AND r.stage_results_json -> 'image_generation' ->> 'status' = 'completed'
  AND r.stage_results_json -> 'cloudinary_upload' ->> 'status' = 'completed'
  AND r.stage_results_json -> 'image_cleanup' ->> 'status' = 'completed'
  AND r.stage_results_json -> 'image_cleanup' ->> 'publicId'
    = r.stage_results_json -> 'cloudinary_upload' ->> 'publicId'
  AND NOT (r.stage_results_json ? 'draft_creation')
  AND NOT (r.stage_results_json ? 'draft_persistence_recovery:metadata_contract:attempt-10')
  AND NOT (r.stage_results_json ? 'image_generation:2')
  AND NOT (r.stage_results_json ? 'cloudinary_upload:2')
  AND NOT (
    CASE
      WHEN jsonb_typeof(r.stage_results_json -> 'review:4' -> 'value' -> 'risks') = 'object'
        THEN r.stage_results_json -> 'review:4' -> 'value' -> 'risks'
      ELSE '{}'::jsonb
    END
    @? '$.* ? (@ == true)'
  )
  AND NOT (
    r.stage_results_json
    @? '$.keyvalue() ? (@.key like_regex "^budget:[0-9]{4}-[0-9]{2}:image_generation:2$")'
  )
)`;

function normalizeLimit(value) {
  return Math.min(200, Math.max(1, Number(value) || 100));
}

export function normalizeReviewStatusFilter(value) {
  return REVIEW_STATUS_FILTERS.has(value) ? value : 'review';
}

function positivePostgresInteger(value, field) {
  if (typeof value !== 'number'
      || !Number.isSafeInteger(value)
      || value < 1
      || value > POSTGRES_INTEGER_MAX) {
    throw new TypeError(`${field} muss eine positive PostgreSQL-Ganzzahl sein.`);
  }
  return value;
}

function existingOptimizationEnqueueInput(input = {}) {
  const payload = input?.payload;
  const payloadKeys = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).sort()
    : [];
  const allowedPayloadKeys = ['admin_id', 'base_live_hash', 'post_id', 'source'];
  if (input.jobType !== 'optimize_existing_post'
      || typeof input.idempotencyKey !== 'string'
      || input.idempotencyKey.length < 1
      || input.idempotencyKey.length > 180
      || payloadKeys.join('|') !== allowedPayloadKeys.join('|')
      || payload.source !== 'admin_existing_content'
      || typeof payload.base_live_hash !== 'string'
      || !/^[0-9a-f]{64}$/.test(payload.base_live_hash)) {
    throw new TypeError('Der Bestandsoptimierungsauftrag ist ungültig.');
  }
  const postId = positivePostgresInteger(payload.post_id, 'post_id');
  positivePostgresInteger(payload.admin_id, 'admin_id');
  const maxAttempts = positivePostgresInteger(input.maxAttempts, 'maxAttempts');
  return { ...input, payload: { ...payload }, postId, maxAttempts };
}

export function createContentAgentAdminRepository(db = pool) {
  return {
    async getOverview({ technicalMonthlyCostLimitEur = Infinity, now = new Date() } = {}) {
      const settings = await db.query(`
          SELECT id, agent_enabled, operating_mode, schedule_weekdays, schedule_time,
                 timezone, monthly_budget_cents, maximum_attempts,
                 generation_lead_hours,
                 auto_publish_enabled, auto_publish_min_score,
                 manual_approvals_count, settings_version, updated_at
          FROM content_agent_settings
          WHERE id = 1
        `);
      const currentSettings = settings.rows[0] || null;
      const timezone = currentSettings?.timezone || 'UTC';
      const [worker, budgetUsed, drafts, jobs] = await Promise.all([
        db.query(`
          SELECT worker_name, heartbeat_at, started_at, last_job_at, version,
                 last_scheduler_tick_at, last_scheduler_error, last_scheduled_slot
          FROM content_worker_state
          WHERE worker_name = $1
        `, ['content-worker']),
        getMonthlyContentCost({ now, timezone, db }),
        db.query(`
          SELECT p.id, p.title, p.slug, p.excerpt, p.image_url,
                 p.workflow_status, p.published, p.generated_by_ai, p.content_format,
                 p.generation_run_id, p.scheduled_at, p.published_at,
                 p.review_version, p.approved_review_version, p.publication_version,
                 p.created_at,
                 notification.notification_status,
                 notification.notification_attempts,
                 notification.notification_last_error_code,
                 notification.notification_updated_at,
                 notification.notification_sent_at
          FROM posts p
          LEFT JOIN LATERAL (
            SELECT delivery.status AS notification_status,
                   delivery.attempts AS notification_attempts,
                   delivery.last_error_code AS notification_last_error_code,
                   delivery.updated_at AS notification_updated_at,
                   delivery.sent_at AS notification_sent_at
            FROM content_notification_deliveries delivery
            WHERE delivery.post_id = p.id
              AND delivery.notification_type = 'admin_review'
            ORDER BY delivery.created_at DESC, delivery.id DESC
            LIMIT 1
          ) notification ON TRUE
          WHERE p.generated_by_ai = TRUE AND p.published = FALSE
          ORDER BY p.created_at DESC
          LIMIT $1
        `, [OVERVIEW_DRAFT_LIMIT]),
        db.query(`
          SELECT j.id, j.job_type, j.status, j.attempts, j.max_attempts,
                 j.last_error, j.created_at, j.updated_at, j.finished_at,
                 r.current_stage, r.post_id, r.cost_estimate, r.status AS run_status,
                 r.error_report_json,
                 r.stage_results_json #> '{review:3,value,issues}' AS latest_review_issues,
                 provider_recovery.open_provider_reservation_count,
                 provider_recovery.open_provider_stage,
                 (
                   r.error_report_json ->> 'code' = 'provider_execution_uncertain'
                   AND
                   r.error_report_json #>> '{providerDiagnostic,provider}' = 'openai'
                   AND r.error_report_json #>> '{providerDiagnostic,code}' = 'invalid_json_schema'
                   AND r.error_report_json #>> '{providerDiagnostic,httpStatus}' = '400'
                 ) AS provider_pre_execution_schema_rejection,
                 (
                   r.error_report_json ->> 'code' = 'provider_request_rejected'
                   AND r.error_report_json #>> '{providerDiagnostic,provider}' = 'openai'
                   AND r.error_report_json #>> '{providerDiagnostic,code}' = 'invalid_json_schema'
                   AND r.error_report_json #>> '{providerDiagnostic,httpStatus}' = '400'
                 ) AS provider_rejected_schema_repairable,
                 r.error_report_json #>> '{providerDiagnostic,stage}' AS provider_rejected_stage,
                 quality_recovery.quality_gate_structure_repairable,
                 quality_recovery.quality_gate_editorial_repairable,
                 quality_recovery.quality_gate_manifest_repairable,
                 quality_recovery.editorial_review_recoverable,
                 ${DRAFT_PERSISTENCE_RECOVERABLE_SQL} AS draft_persistence_recoverable
          FROM content_jobs j
          LEFT JOIN content_runs r ON r.job_id = j.id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS open_provider_reservation_count,
                   MIN(substring(entry.key FROM '^budget:[0-9]{4}-[0-9]{2}:(.+)$'))
                     AS open_provider_stage
            FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS entry(key, value)
            WHERE entry.key ~ '^budget:[0-9]{4}-[0-9]{2}:.+$'
              AND entry.value ->> 'status' = 'reserved'
          ) provider_recovery ON TRUE
          LEFT JOIN LATERAL (
            SELECT (
              r.error_report_json ->> 'code' = 'quality_gate_failed'
              AND r.stage_results_json ? 'repair:2'
              AND r.stage_results_json -> 'validation:2' ->> 'passed' = 'false'
              AND EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
                WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:2$'
                  AND settled.value ->> 'status' = 'settled'
              )
              AND jsonb_array_length(
                CASE
                  WHEN jsonb_typeof(r.stage_results_json -> 'validation:2' -> 'issues') = 'array'
                    THEN r.stage_results_json -> 'validation:2' -> 'issues'
                  ELSE '[]'::jsonb
                END
              ) > 0
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  CASE
                    WHEN jsonb_typeof(r.stage_results_json -> 'validation:2' -> 'issues') = 'array'
                      THEN r.stage_results_json -> 'validation:2' -> 'issues'
                    ELSE '[]'::jsonb
                  END
                ) AS issue
                WHERE issue ->> 'code' NOT IN (
                  'cta_count_invalid', 'cta_locations_invalid', 'cta_tracking_invalid',
                  'cta_contact_target_invalid', 'faq_count_invalid', 'faq_mismatch',
                  'bootstrap_class_unknown', 'class_forbidden'
                )
              )
            ) AS quality_gate_structure_repairable,
            (
              r.error_report_json ->> 'code' = 'quality_gate_failed'
              AND r.stage_results_json -> 'validation:2' ->> 'passed' = 'true'
              AND jsonb_array_length(
                CASE
                  WHEN jsonb_typeof(r.stage_results_json -> 'validation:2' -> 'issues') = 'array'
                    THEN r.stage_results_json -> 'validation:2' -> 'issues'
                  ELSE '[]'::jsonb
                END
              ) = 0
              AND r.stage_results_json -> 'review:2' -> 'value' ->> 'passed' = 'false'
              AND r.stage_results_json -> 'review:2' -> 'value' ->> 'requiresManualReview' = 'true'
              AND EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
                WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:2$'
                  AND settled.value ->> 'status' = 'settled'
              )
              AND EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
                WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:review:2$'
                  AND settled.value ->> 'status' = 'settled'
              )
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  CASE
                    WHEN jsonb_typeof(r.stage_results_json -> 'review:2' -> 'value' -> 'issues') = 'array'
                      THEN r.stage_results_json -> 'review:2' -> 'value' -> 'issues'
                    ELSE '[]'::jsonb
                  END
                ) AS issue
                WHERE COALESCE((issue ->> 'blocking')::boolean, FALSE)
                   OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
              )
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  CASE
                    WHEN jsonb_typeof(r.stage_results_json -> 'review:2' -> 'value' -> 'issues') = 'array'
                      THEN r.stage_results_json -> 'review:2' -> 'value' -> 'issues'
                    ELSE '[]'::jsonb
                  END
                ) AS issue
                WHERE (
                  COALESCE((issue ->> 'blocking')::boolean, FALSE)
                  OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
                )
                  AND (
                    COALESCE(issue ->> 'verificationType', '') NOT IN ('source', 'date')
                    OR COALESCE((issue ->> 'sourceRequired')::boolean, FALSE) IS NOT TRUE
                    OR btrim(COALESCE(issue ->> 'evidenceExcerpt', '')) = ''
                    OR btrim(COALESCE(issue ->> 'repairInstruction', '')) = ''
                  )
              )
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_each(
                  CASE
                    WHEN jsonb_typeof(r.stage_results_json -> 'review:2' -> 'value' -> 'risks') = 'object'
                      THEN r.stage_results_json -> 'review:2' -> 'value' -> 'risks'
                    ELSE '{}'::jsonb
                  END
                ) AS risk(key, value)
                WHERE risk.key IN (
                  'legalClaims', 'privacyClaims', 'softwareVersionClaims', 'staticPrices'
                )
                  AND risk.value = 'true'::jsonb
              )
              AND NOT (r.stage_results_json ? 'quality_gate_recovery:structure_contract:attempt-7')
              AND NOT (r.stage_results_json ? 'repair:3')
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS repair_budget(key, value)
                WHERE repair_budget.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:3$'
              )
            ) AS quality_gate_editorial_repairable,
            (
              r.error_report_json ->> 'code' = 'CONTENT_RULE_MANIFEST_MISMATCH'
              AND r.stage_results_json
                -> 'quality_gate_recovery:structure_contract:attempt-7'
                ->> 'status' = 'authorized_after_quality_gate'
              AND r.stage_results_json
                -> 'quality_gate_recovery:structure_contract:attempt-7'
                ->> 'stageId' = 'repair:3'
              AND NOT (r.stage_results_json ? 'repair:3')
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS repair_budget(key, value)
                WHERE repair_budget.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:3$'
              )
            ) AS quality_gate_manifest_repairable,
            (
              r.error_report_json ->> 'code' = 'quality_gate_failed'
              AND r.stage_results_json -> 'validation:3' ->> 'passed' = 'true'
              AND jsonb_array_length(COALESCE(r.stage_results_json -> 'validation:3' -> 'issues', '[]'::jsonb)) = 0
              AND EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
                WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:3$'
                  AND settled.value ->> 'status' = 'settled'
              )
              AND EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
                WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:review:3$'
                  AND settled.value ->> 'status' = 'settled'
              )
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(r.stage_results_json -> 'review:3' -> 'value' -> 'issues', '[]'::jsonb)) AS issue
                WHERE COALESCE((issue ->> 'blocking')::boolean, FALSE)
                   OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
              )
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(r.stage_results_json -> 'review:3' -> 'value' -> 'issues', '[]'::jsonb)) AS issue
                WHERE (
                  COALESCE((issue ->> 'blocking')::boolean, FALSE)
                  OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
                )
                  AND COALESCE(issue ->> 'code', '') !~* '^(cta_(count|locations?|tracking|contact_target|structure)|faq_(count|structure|structural|visibility|visible|markup|json|mismatch)|html_|bootstrap_|class_|h1_|meta_(title|description)|slug_|image_alt|internal_link_(count|target|href|validity))'
              )
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json -> 'review:3' -> 'value' -> 'risks', '{}'::jsonb)) AS risk(key, value)
                WHERE risk.value = 'true'::jsonb
              )
              AND NOT (r.stage_results_json ? 'editorial_review_recovery:review_scope:attempt-9')
              AND NOT (r.stage_results_json ? 'review:4')
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS review_budget(key, value)
                WHERE review_budget.key ~ '^budget:[0-9]{4}-[0-9]{2}:review:4$'
              )
            ) AS editorial_review_recoverable
          ) quality_recovery ON TRUE
          ORDER BY j.created_at DESC
          LIMIT $1
        `, [OVERVIEW_JOB_LIMIT])
      ]);
      const databaseLimitEur = Number(currentSettings?.monthly_budget_cents || 0) / 100;
      const technicalLimit = Number(technicalMonthlyCostLimitEur);
      const budgetLimitEur = Number.isFinite(technicalLimit)
        ? Math.min(databaseLimitEur, Math.max(0, technicalLimit))
        : databaseLimitEur;

      return {
        settings: currentSettings,
        worker: worker.rows[0] || null,
        budgetUsed: Number(budgetUsed || 0),
        budgetLimitEur,
        drafts: drafts.rows,
        jobs: jobs.rows,
        approvals: Number(currentSettings?.manual_approvals_count || 0)
      };
    },

    async listDrafts({ status = 'review', now = new Date() } = {}) {
      const normalizedStatus = normalizeReviewStatusFilter(status);
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.image_url, p.workflow_status,
               p.published, p.generated_by_ai, p.content_format,
               p.generation_run_id, p.scheduled_at, p.published_at,
               p.review_version, p.approved_review_version, p.publication_version,
               p.created_at, m.primary_keyword, m.content_cluster,
               m.quality_score,
               COALESCE((m.quality_report_json #>> '{focusedReview,blocked}')::boolean, FALSE)
                 AS risk_blocked,
               CASE
                 WHEN jsonb_typeof(m.quality_report_json #> '{focusedReview,items}') = 'array'
                   THEN jsonb_array_length(m.quality_report_json #> '{focusedReview,items}')
                 ELSE 0
               END AS risk_count,
               r.cost_estimate,
               notification.notification_status,
               notification.notification_attempts,
               notification.notification_last_error_code,
               notification.notification_updated_at,
               notification.notification_sent_at
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        LEFT JOIN content_runs r ON r.id = p.generation_run_id
        LEFT JOIN LATERAL (
          SELECT delivery.status AS notification_status,
                 delivery.attempts AS notification_attempts,
                 delivery.last_error_code AS notification_last_error_code,
                 delivery.updated_at AS notification_updated_at,
                 delivery.sent_at AS notification_sent_at
          FROM content_notification_deliveries delivery
          WHERE delivery.post_id = p.id
            AND delivery.notification_type = 'admin_review'
          ORDER BY delivery.created_at DESC, delivery.id DESC
          LIMIT 1
        ) notification ON TRUE
        WHERE p.generated_by_ai = TRUE
          AND (
            ($2 = 'review'
              AND p.published = FALSE
              AND p.workflow_status = 'needs_review'
              AND (p.scheduled_at IS NULL OR p.scheduled_at >= $1))
            OR ($2 = 'approved'
              AND p.published = FALSE
              AND p.workflow_status = 'approved_scheduled')
            OR ($2 = 'missed'
              AND p.published = FALSE
              AND p.workflow_status = 'needs_review'
              AND p.scheduled_at < $1)
            OR ($2 = 'published'
              AND p.published = TRUE
              AND p.workflow_status = 'published')
          )
        ORDER BY p.created_at DESC
      `, [now, normalizedStatus]);
      return rows;
    },

    async listExistingContent() {
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.updated_at,
               legacy_guard.has_active_legacy_ejs,
               COALESCE(admin_preference.hidden_from_zero_impression_list, FALSE)
                 AS zero_impression_hidden,
               audit.id AS audit_id, audit.score AS audit_score,
               audit.status AS audit_status, audit.findings_json,
               revision.id AS revision_id, revision.status AS revision_status,
               optimization_job.optimization_job_id,
               optimization_job.optimization_job_status,
               optimization_job.optimization_attempts,
               optimization_job.optimization_max_attempts,
               optimization_job.optimization_job_updated_at,
               optimization_run.optimization_run_id,
               optimization_run.optimization_run_status,
               optimization_run.open_provider_reservation_count,
               optimization_run.current_stage AS optimization_current_stage,
               CASE
                 WHEN COALESCE(
                   optimization_run.run_error_code,
                   optimization_job.optimization_last_error
                 ) ~ '^[A-Za-z][A-Za-z0-9_:-]{0,79}$'
                   THEN COALESCE(
                     optimization_run.run_error_code,
                     optimization_job.optimization_last_error
                   )
                 ELSE NULL
               END AS optimization_error_code,
               optimization_revision.optimization_revision_id,
               optimization_revision.optimization_revision_status,
               draft_revision.open_draft_revision_id,
               draft_revision.has_draft_revision,
               outcome.outcome_evaluation_status,
               outcome.outcome_baseline_clicks,
               outcome.outcome_baseline_impressions,
               outcome.outcome_baseline_ctr,
               outcome.outcome_baseline_average_position,
               outcome.outcome_followup_clicks,
               outcome.outcome_followup_impressions,
               outcome.outcome_followup_ctr,
               outcome.outcome_followup_average_position,
               outcome.outcome_changes_json,
               outcome.outcome_new_queries_json,
               outcome.outcome_lost_queries_json,
               performance.id AS performance_snapshot_id,
               performance.evaluated_through_date AS performance_evaluated_through_date,
               performance.article_age_days AS performance_article_age_days,
               performance.windows_json AS performance_windows_json,
               performance.previous_windows_json AS performance_previous_windows_json,
               performance.cohort_json AS performance_cohort_json,
               performance.status AS performance_status,
               performance.diagnoses_json AS performance_diagnoses_json,
               performance.positive_signals_json AS performance_positive_signals_json,
               performance.data_eligible AS performance_data_eligible,
               performance.learning_eligible AS performance_learning_eligible,
               performance.explanation_status AS performance_explanation_status,
               performance.explanation_json AS performance_explanation_json
        FROM posts p
        LEFT JOIN LATERAL (
          SELECT (
            p.content_format = 'legacy_ejs'
            AND (
              POSITION('<%' IN p.content) > 0
              OR POSITION('%>' IN p.content) > 0
            )
          ) AS has_active_legacy_ejs
        ) legacy_guard ON TRUE
        LEFT JOIN content_existing_post_admin_preferences admin_preference
          ON admin_preference.post_id = p.id
        LEFT JOIN LATERAL (
          SELECT a.id, a.score, a.status, a.findings_json
          FROM content_post_audits a
          WHERE a.post_id = p.id
          ORDER BY a.created_at DESC, a.id DESC
          LIMIT 1
        ) audit ON TRUE
        LEFT JOIN LATERAL (
          SELECT r.id, r.status
          FROM content_post_revisions r
          WHERE r.post_id = p.id AND r.audit_id = audit.id AND r.status = 'draft'
          ORDER BY r.created_at DESC, r.id DESC
          LIMIT 1
        ) revision ON TRUE
        LEFT JOIN LATERAL (
          SELECT j.id AS optimization_job_id,
                 j.status AS optimization_job_status,
                 j.attempts AS optimization_attempts,
                 j.max_attempts AS optimization_max_attempts,
                 j.last_error AS optimization_last_error,
                 j.updated_at AS optimization_job_updated_at
          FROM content_jobs j
          WHERE j.job_type = 'optimize_existing_post'
            AND j.payload_json ->> 'post_id' = p.id::text
          ORDER BY j.created_at DESC, j.id DESC
          LIMIT 1
        ) optimization_job ON TRUE
        LEFT JOIN LATERAL (
          SELECT run.id AS optimization_run_id,
                 run.status AS optimization_run_status,
                 run.current_stage,
                 run.error_report_json ->> 'code' AS run_error_code,
                 (
                   SELECT COUNT(*)::integer
                   FROM jsonb_each(COALESCE(run.stage_results_json, '{}'::jsonb)) AS stage(key, value)
                   WHERE stage.key LIKE 'budget:%'
                     AND stage.value ->> 'status' = 'reserved'
                 ) AS open_provider_reservation_count
          FROM content_runs run
          WHERE run.job_id = optimization_job.optimization_job_id
          ORDER BY run.started_at DESC, run.id DESC
          LIMIT 1
        ) optimization_run ON TRUE
        LEFT JOIN LATERAL (
          SELECT optimized_revision.id AS optimization_revision_id,
                 optimized_revision.status AS optimization_revision_status
          FROM content_post_revisions optimized_revision
          WHERE optimized_revision.optimization_job_id = optimization_job.optimization_job_id
            AND optimized_revision.post_id = p.id
          ORDER BY optimized_revision.created_at DESC, optimized_revision.id DESC
          LIMIT 1
        ) optimization_revision ON TRUE
        LEFT JOIN LATERAL (
          SELECT pending_revision.id AS open_draft_revision_id,
                 TRUE AS has_draft_revision
          FROM content_post_revisions pending_revision
          WHERE pending_revision.post_id = p.id
            AND pending_revision.status = 'draft'
          ORDER BY pending_revision.created_at DESC, pending_revision.id DESC
          LIMIT 1
        ) draft_revision ON TRUE
        LEFT JOIN LATERAL (
          SELECT outcome.evaluation_status AS outcome_evaluation_status,
                 outcome.baseline_metrics_json ->> 'clicks' AS outcome_baseline_clicks,
                 outcome.baseline_metrics_json ->> 'impressions' AS outcome_baseline_impressions,
                 outcome.baseline_metrics_json ->> 'ctr' AS outcome_baseline_ctr,
                 outcome.baseline_metrics_json ->> 'averagePosition' AS outcome_baseline_average_position,
                 outcome.followup_metrics_json ->> 'clicks' AS outcome_followup_clicks,
                 outcome.followup_metrics_json ->> 'impressions' AS outcome_followup_impressions,
                 outcome.followup_metrics_json ->> 'ctr' AS outcome_followup_ctr,
                 outcome.followup_metrics_json ->> 'averagePosition' AS outcome_followup_average_position,
                 outcome.followup_metrics_json -> 'changes' AS outcome_changes_json,
                 outcome.followup_metrics_json -> 'newImportantQueries' AS outcome_new_queries_json,
                 outcome.followup_metrics_json -> 'lostImportantQueries' AS outcome_lost_queries_json
          FROM content_revision_optimization_outcomes outcome
          JOIN content_post_revisions outcome_revision
            ON outcome_revision.id = outcome.revision_id
          WHERE outcome.post_id = p.id
            AND outcome_revision.status = 'approved'
            AND outcome_revision.optimization_job_id IS NOT NULL
          ORDER BY outcome.applied_at DESC, outcome.revision_id DESC
          LIMIT 1
        ) outcome ON TRUE
        LEFT JOIN LATERAL (
          SELECT snapshot.id, snapshot.evaluated_through_date,
                 snapshot.article_age_days, snapshot.windows_json,
                 snapshot.previous_windows_json, snapshot.cohort_json,
                 snapshot.status, snapshot.diagnoses_json,
                 snapshot.positive_signals_json, snapshot.data_eligible,
                 snapshot.learning_eligible, snapshot.explanation_status,
                 snapshot.explanation_json
          FROM content_article_performance_snapshots snapshot
          WHERE snapshot.post_id = p.id
          ORDER BY snapshot.evaluated_through_date DESC, snapshot.id DESC
          LIMIT 1
        ) performance ON TRUE
        WHERE p.published = TRUE
        ORDER BY p.updated_at DESC
        LIMIT 100
      `);
      return rows;
    },

    async setExistingContentZeroImpressionHidden({ postId, hidden } = {}) {
      const normalizedPostId = positivePostgresInteger(postId, 'postId');
      if (typeof hidden !== 'boolean') {
        throw new TypeError('hidden muss ein boolescher Wert sein.');
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const post = await client.query(`
          SELECT p.id
          FROM posts p
          WHERE p.id = $1::integer
            AND p.published = TRUE
          FOR UPDATE
        `, [normalizedPostId]);
        if (!post.rows[0]) {
          await client.query('COMMIT');
          return { status: 'not_found' };
        }

        if (hidden) {
          const eligibility = await client.query(`
            SELECT latest.id
            FROM (
              SELECT snapshot.id, snapshot.article_age_days,
                     snapshot.evaluated_through_date, snapshot.windows_json
              FROM content_article_performance_snapshots snapshot
              WHERE snapshot.post_id = $1::integer
              ORDER BY snapshot.evaluated_through_date DESC, snapshot.id DESC
              LIMIT 1
            ) latest
            WHERE latest.article_age_days >= 28
              AND latest.evaluated_through_date IS NOT NULL
              AND COALESCE(
                (latest.windows_json -> '28' ->> 'complete')::boolean,
                FALSE
              ) = TRUE
              AND COALESCE(
                (latest.windows_json -> '28' ->> 'coverageDayCount')::integer,
                0
              ) >= 28
              AND COALESCE(
                (latest.windows_json -> '28' ->> 'impressions')::numeric,
                0
              ) = 0
          `, [normalizedPostId]);
          if (!eligibility.rows[0]) {
            await client.query('COMMIT');
            return { status: 'not_eligible' };
          }
        }

        await client.query(`
          INSERT INTO content_existing_post_admin_preferences (
            post_id, hidden_from_zero_impression_list, created_at, updated_at
          ) VALUES ($1::integer, $2::boolean, NOW(), NOW())
          ON CONFLICT (post_id) DO UPDATE SET
            hidden_from_zero_impression_list = EXCLUDED.hidden_from_zero_impression_list,
            updated_at = NOW()
        `, [normalizedPostId, hidden]);
        await client.query('COMMIT');
        return { status: 'updated' };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async setAllExistingContentZeroImpressionHidden(hidden) {
      if (typeof hidden !== 'boolean') {
        throw new TypeError('hidden muss ein boolescher Wert sein.');
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const result = hidden
          ? await client.query(`
              INSERT INTO content_existing_post_admin_preferences AS admin_preference (
                post_id, hidden_from_zero_impression_list, created_at, updated_at
              )
              SELECT p.id, TRUE, NOW(), NOW()
              FROM posts p
              JOIN LATERAL (
                SELECT snapshot.article_age_days, snapshot.evaluated_through_date,
                       snapshot.windows_json
                FROM content_article_performance_snapshots snapshot
                WHERE snapshot.post_id = p.id
                ORDER BY snapshot.evaluated_through_date DESC, snapshot.id DESC
                LIMIT 1
              ) performance ON TRUE
              WHERE p.published = TRUE
                AND performance.article_age_days >= 28
                AND performance.evaluated_through_date IS NOT NULL
                AND COALESCE(
                  (performance.windows_json -> '28' ->> 'complete')::boolean,
                  FALSE
                ) = TRUE
                AND COALESCE(
                  (performance.windows_json -> '28' ->> 'coverageDayCount')::integer,
                  0
                ) >= 28
                AND COALESCE(
                  (performance.windows_json -> '28' ->> 'impressions')::numeric,
                  0
                ) = 0
              ON CONFLICT (post_id) DO UPDATE SET
                hidden_from_zero_impression_list = TRUE,
                updated_at = NOW()
              WHERE admin_preference.hidden_from_zero_impression_list IS DISTINCT FROM TRUE
              RETURNING post_id
            `)
          : await client.query(`
              UPDATE content_existing_post_admin_preferences
              SET hidden_from_zero_impression_list = FALSE,
                  updated_at = NOW()
              WHERE hidden_from_zero_impression_list = TRUE
              RETURNING post_id
            `);
        await client.query('COMMIT');
        return { changedCount: result.rows.length };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async getArticlePerformanceDetail(postId) {
      const normalizedPostId = positivePostgresInteger(postId, 'postId');
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.published_at, p.updated_at,
               metadata.content_cluster, metadata.primary_keyword,
               metadata.search_intent,
               snapshot.id AS snapshot_id,
               snapshot.evaluated_through_date,
               snapshot.article_age_days,
               snapshot.windows_json,
               snapshot.previous_windows_json,
               snapshot.cohort_json,
               snapshot.status AS performance_status,
               snapshot.diagnoses_json,
               snapshot.positive_signals_json,
               snapshot.data_eligible,
               snapshot.learning_eligible,
               snapshot.evidence_hash,
               snapshot.explanation_status,
               snapshot.explanation_json,
               opportunity.id AS opportunity_id,
               opportunity.opportunity_type,
               opportunity.score AS opportunity_score,
               opportunity.status AS opportunity_status,
               learning.pending_count,
               learning.active_count,
               workflow.has_draft_revision,
               workflow.has_active_optimization
        FROM posts p
        LEFT JOIN content_post_metadata metadata ON metadata.post_id = p.id
        LEFT JOIN LATERAL (
          SELECT performance.*
          FROM content_article_performance_snapshots performance
          WHERE performance.post_id = p.id
          ORDER BY performance.evaluated_through_date DESC, performance.id DESC
          LIMIT 1
        ) snapshot ON TRUE
        LEFT JOIN LATERAL (
          SELECT candidate.id, candidate.opportunity_type,
                 candidate.score, candidate.status
          FROM content_opportunities candidate
          WHERE candidate.post_id = p.id
            AND candidate.analysis_key LIKE 'article-performance:' || p.id::text || ':%'
          ORDER BY candidate.created_at DESC, candidate.id DESC
          LIMIT 1
        ) opportunity ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT COUNT(*)::integer
              FROM content_learning_rule_proposals proposal
              WHERE proposal.status = 'pending'
                AND proposal.evidence_json @> jsonb_build_array(
                  jsonb_build_object('post_id', p.id)
                )
            ) AS pending_count,
            (
              SELECT COUNT(DISTINCT rule.id)::integer
              FROM content_learning_rules rule
              WHERE rule.status = 'active'
                AND EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(
                    COALESCE(snapshot.diagnoses_json, '[]'::jsonb)
                    || COALESCE(snapshot.positive_signals_json, '[]'::jsonb)
                  ) signal
                  WHERE signal ->> 'categoryKey' = rule.category_key
                )
            ) AS active_count
        ) learning ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            EXISTS (
              SELECT 1 FROM content_post_revisions revision
              WHERE revision.post_id = p.id AND revision.status = 'draft'
            ) AS has_draft_revision,
            EXISTS (
              SELECT 1 FROM content_jobs job
              WHERE job.job_type = 'optimize_existing_post'
                AND job.payload_json ->> 'post_id' = p.id::text
                AND job.status IN ('queued', 'running', 'needs_manual_attention')
            ) AS has_active_optimization
        ) workflow ON TRUE
        WHERE p.id = $1
          AND p.published = TRUE
        LIMIT 1
      `, [normalizedPostId]);
      const row = rows[0];
      if (!row) return null;
      return {
        post: {
          id: row.id,
          title: row.title,
          slug: row.slug,
          publishedAt: row.published_at,
          updatedAt: row.updated_at,
          contentCluster: row.content_cluster,
          primaryKeyword: row.primary_keyword,
          searchIntent: row.search_intent
        },
        snapshot: row.snapshot_id ? {
          id: row.snapshot_id,
          post_id: row.id,
          evaluated_through_date: row.evaluated_through_date,
          article_age_days: row.article_age_days,
          windows_json: row.windows_json,
          previous_windows_json: row.previous_windows_json,
          cohort_json: row.cohort_json,
          status: row.performance_status,
          diagnoses_json: row.diagnoses_json,
          positive_signals_json: row.positive_signals_json,
          data_eligible: row.data_eligible,
          learning_eligible: row.learning_eligible,
          evidence_hash: row.evidence_hash,
          explanation_status: row.explanation_status,
          explanation_json: row.explanation_json
        } : null,
        opportunity: row.opportunity_id ? {
          id: row.opportunity_id,
          opportunityType: row.opportunity_type,
          score: row.opportunity_score,
          status: row.opportunity_status
        } : null,
        learning: {
          pendingCount: Number(row.pending_count) || 0,
          activeCount: Number(row.active_count) || 0
        },
        workflow: {
          hasDraftRevision: row.has_draft_revision === true,
          hasActiveOptimization: row.has_active_optimization === true
        }
      };
    },

    async getExistingContentOptimizationState(postId) {
      const normalizedPostId = positivePostgresInteger(postId, 'postId');
      const { rows } = await db.query(`
        SELECT p.id,
               optimization_job.optimization_job_id,
               optimization_job.optimization_job_status,
               optimization_job.optimization_attempts,
               optimization_job.optimization_max_attempts,
               optimization_job.optimization_job_updated_at,
               optimization_run.optimization_run_id,
               optimization_run.optimization_run_status,
               optimization_run.open_provider_reservation_count,
               optimization_run.current_stage AS optimization_current_stage,
               CASE
                 WHEN COALESCE(
                   optimization_run.run_error_code,
                   optimization_job.optimization_last_error
                 ) ~ '^[A-Za-z][A-Za-z0-9_:-]{0,79}$'
                   THEN COALESCE(
                     optimization_run.run_error_code,
                     optimization_job.optimization_last_error
                   )
                 ELSE NULL
               END AS optimization_error_code,
               optimization_revision.optimization_revision_id,
               optimization_revision.optimization_revision_status,
               draft_revision.open_draft_revision_id,
               draft_revision.has_draft_revision
        FROM posts p
        LEFT JOIN LATERAL (
          SELECT j.id AS optimization_job_id,
                 j.status AS optimization_job_status,
                 j.attempts AS optimization_attempts,
                 j.max_attempts AS optimization_max_attempts,
                 j.last_error AS optimization_last_error,
                 j.updated_at AS optimization_job_updated_at
          FROM content_jobs j
          WHERE j.job_type = 'optimize_existing_post'
            AND j.payload_json ->> 'post_id' = p.id::text
          ORDER BY j.created_at DESC, j.id DESC
          LIMIT 1
        ) optimization_job ON TRUE
        LEFT JOIN LATERAL (
          SELECT run.id AS optimization_run_id,
                 run.status AS optimization_run_status,
                 run.current_stage,
                 run.error_report_json ->> 'code' AS run_error_code,
                 (
                   SELECT COUNT(*)::integer
                   FROM jsonb_each(COALESCE(run.stage_results_json, '{}'::jsonb)) AS stage(key, value)
                   WHERE stage.key LIKE 'budget:%'
                     AND stage.value ->> 'status' = 'reserved'
                 ) AS open_provider_reservation_count
          FROM content_runs run
          WHERE run.job_id = optimization_job.optimization_job_id
          ORDER BY run.started_at DESC, run.id DESC
          LIMIT 1
        ) optimization_run ON TRUE
        LEFT JOIN LATERAL (
          SELECT optimized_revision.id AS optimization_revision_id,
                 optimized_revision.status AS optimization_revision_status
          FROM content_post_revisions optimized_revision
          WHERE optimized_revision.optimization_job_id = optimization_job.optimization_job_id
            AND optimized_revision.post_id = p.id
          ORDER BY optimized_revision.created_at DESC, optimized_revision.id DESC
          LIMIT 1
        ) optimization_revision ON TRUE
        LEFT JOIN LATERAL (
          SELECT pending_revision.id AS open_draft_revision_id,
                 TRUE AS has_draft_revision
          FROM content_post_revisions pending_revision
          WHERE pending_revision.post_id = p.id
            AND pending_revision.status = 'draft'
          ORDER BY pending_revision.created_at DESC, pending_revision.id DESC
          LIMIT 1
        ) draft_revision ON TRUE
        WHERE p.id = $1::integer AND p.published = TRUE
        LIMIT 1
      `, [normalizedPostId]);
      return rows[0] || null;
    },

    async enqueueExistingPostOptimizationJob(input = {}) {
      const normalized = existingOptimizationEnqueueInput(input);
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const lockedPost = await lockContentPostRevisionInvariant(client, normalized.postId);
        if (!lockedPost || lockedPost.published !== true) {
          await client.query('COMMIT');
          return null;
        }
        if (await hasDraftContentRevision(client, normalized.postId)) {
          await client.query('COMMIT');
          return null;
        }
        const inserted = await client.query(`
          INSERT INTO content_jobs (
            job_type, idempotency_key, payload_json, max_attempts
          )
          SELECT $1, $2, $3::jsonb, $4
          FROM content_agent_settings settings
          WHERE settings.id = 1 AND settings.agent_enabled = TRUE
          ON CONFLICT DO NOTHING
          RETURNING id, status, attempts, max_attempts, created_at, updated_at
        `, [
          normalized.jobType,
          normalized.idempotencyKey,
          normalized.payload,
          normalized.maxAttempts
        ]);
        let job = inserted.rows[0] || null;
        if (!job) {
          const idempotent = await client.query(`
            SELECT idempotent_job.id, idempotent_job.status, idempotent_job.attempts,
                   idempotent_job.max_attempts, idempotent_job.created_at,
                   idempotent_job.updated_at,
                   (
                     idempotent_job.job_type = $2
                     AND idempotent_job.payload_json = $3::jsonb
                     AND idempotent_job.payload_json ->> 'post_id' = $4::text
                   ) AS request_matches,
                   COALESCE(post_guard.published, FALSE) AS post_published,
                   COALESCE(agent_guard.agent_enabled, FALSE) AS agent_enabled
            FROM content_jobs idempotent_job
            LEFT JOIN LATERAL (
              SELECT p.published
              FROM posts p
              WHERE p.id = $4::integer
              FOR SHARE
            ) post_guard ON TRUE
            LEFT JOIN LATERAL (
              SELECT settings.agent_enabled
              FROM content_agent_settings settings
              WHERE settings.id = 1
              FOR SHARE
            ) agent_guard ON TRUE
            WHERE idempotent_job.idempotency_key = $1
            LIMIT 1
            FOR SHARE OF idempotent_job
          `, [
            normalized.idempotencyKey,
            normalized.jobType,
            normalized.payload,
            normalized.postId
          ]);
          const idempotentJob = idempotent.rows[0] || null;
          if (idempotentJob) {
            const {
              request_matches: requestMatches,
              post_published: postPublished,
              agent_enabled: agentEnabled,
              ...safeJob
            } = idempotentJob;
            job = requestMatches === true && postPublished === true && agentEnabled === true
              ? safeJob
              : null;
            await client.query('COMMIT');
            return job;
          }

          const active = await client.query(`
            SELECT active_job.id, active_job.status, active_job.attempts,
                   active_job.max_attempts, active_job.created_at, active_job.updated_at
            FROM content_jobs active_job
            JOIN posts p
              ON p.id = $1::integer AND p.published = TRUE
            JOIN content_agent_settings settings
              ON settings.id = 1 AND settings.agent_enabled = TRUE
            WHERE active_job.job_type = 'optimize_existing_post'
              AND jsonb_typeof(active_job.payload_json) = 'object'
              AND active_job.payload_json ?& ARRAY[
                'source', 'post_id', 'admin_id', 'base_live_hash'
              ]
              AND active_job.payload_json - ARRAY[
                'source', 'post_id', 'admin_id', 'base_live_hash'
              ] = '{}'::jsonb
              AND jsonb_typeof(active_job.payload_json -> 'source') = 'string'
              AND jsonb_typeof(active_job.payload_json -> 'post_id') = 'number'
              AND jsonb_typeof(active_job.payload_json -> 'admin_id') = 'number'
              AND jsonb_typeof(active_job.payload_json -> 'base_live_hash') = 'string'
              AND active_job.payload_json ->> 'source' = 'admin_existing_content'
              AND active_job.payload_json ->> 'post_id' = $1::text
              AND active_job.payload_json ->> 'admin_id' ~ '^[1-9][0-9]{0,9}$'
              AND (
                length(active_job.payload_json ->> 'admin_id') < 10
                OR active_job.payload_json ->> 'admin_id' <= '2147483647'
              )
              AND active_job.payload_json ->> 'base_live_hash' ~ '^[0-9a-f]{64}$'
              AND active_job.status IN ('queued', 'running', 'needs_manual_attention')
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            FOR SHARE OF active_job, p, settings
          `, [normalized.postId]);
          job = active.rows[0] || null;
        }
        await client.query('COMMIT');
        return job;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Der ursprüngliche Datenbankfehler bleibt maßgeblich.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async listJobs(limit = 100) {
      const { rows } = await db.query(`
        SELECT j.id, j.job_type, j.status, j.attempts, j.max_attempts,
               j.last_error, j.created_at, j.updated_at, j.finished_at,
               r.current_stage, r.post_id, r.cost_estimate, r.status AS run_status,
               (draft_post.id IS NOT NULL) AS post_is_ai_draft,
               optimization_revision.id AS optimization_revision_id,
               optimization_revision.status AS optimization_revision_status,
               r.error_report_json,
               r.stage_results_json #> '{review:3,value,issues}' AS latest_review_issues,
               provider_recovery.open_provider_reservation_count,
               provider_recovery.open_provider_stage,
               (
                 r.error_report_json ->> 'code' = 'provider_execution_uncertain'
                 AND
                 r.error_report_json #>> '{providerDiagnostic,provider}' = 'openai'
                 AND r.error_report_json #>> '{providerDiagnostic,code}' = 'invalid_json_schema'
                 AND r.error_report_json #>> '{providerDiagnostic,httpStatus}' = '400'
               ) AS provider_pre_execution_schema_rejection,
               (
                 r.error_report_json ->> 'code' = 'provider_request_rejected'
                 AND r.error_report_json #>> '{providerDiagnostic,provider}' = 'openai'
                 AND r.error_report_json #>> '{providerDiagnostic,code}' = 'invalid_json_schema'
                 AND r.error_report_json #>> '{providerDiagnostic,httpStatus}' = '400'
               ) AS provider_rejected_schema_repairable,
               r.error_report_json #>> '{providerDiagnostic,stage}' AS provider_rejected_stage,
               quality_recovery.quality_gate_structure_repairable,
               quality_recovery.quality_gate_editorial_repairable,
               quality_recovery.quality_gate_manifest_repairable,
               quality_recovery.editorial_review_recoverable,
               ${DRAFT_PERSISTENCE_RECOVERABLE_SQL} AS draft_persistence_recoverable
        FROM content_jobs j
        LEFT JOIN content_runs r ON r.job_id = j.id
        LEFT JOIN posts draft_post
          ON draft_post.id = r.post_id
         AND draft_post.generated_by_ai = TRUE
         AND draft_post.published = FALSE
         AND draft_post.content_format = 'static_html'
        LEFT JOIN LATERAL (
          SELECT revision.id, revision.status
          FROM content_post_revisions revision
          WHERE revision.optimization_job_id = j.id
          ORDER BY revision.created_at DESC, revision.id DESC
          LIMIT 1
        ) optimization_revision ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS open_provider_reservation_count,
                 MIN(substring(entry.key FROM '^budget:[0-9]{4}-[0-9]{2}:(.+)$'))
                   AS open_provider_stage
          FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS entry(key, value)
          WHERE entry.key ~ '^budget:[0-9]{4}-[0-9]{2}:.+$'
            AND entry.value ->> 'status' = 'reserved'
        ) provider_recovery ON TRUE
        LEFT JOIN LATERAL (
          SELECT (
            r.error_report_json ->> 'code' = 'quality_gate_failed'
            AND r.stage_results_json ? 'repair:2'
            AND r.stage_results_json -> 'validation:2' ->> 'passed' = 'false'
            AND EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
              WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:2$'
                AND settled.value ->> 'status' = 'settled'
            )
            AND jsonb_array_length(
              CASE
                WHEN jsonb_typeof(r.stage_results_json -> 'validation:2' -> 'issues') = 'array'
                  THEN r.stage_results_json -> 'validation:2' -> 'issues'
                ELSE '[]'::jsonb
              END
            ) > 0
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                CASE
                  WHEN jsonb_typeof(r.stage_results_json -> 'validation:2' -> 'issues') = 'array'
                    THEN r.stage_results_json -> 'validation:2' -> 'issues'
                  ELSE '[]'::jsonb
                END
              ) AS issue
              WHERE issue ->> 'code' NOT IN (
                'cta_count_invalid', 'cta_locations_invalid', 'cta_tracking_invalid',
                'cta_contact_target_invalid', 'faq_count_invalid', 'faq_mismatch',
                'bootstrap_class_unknown', 'class_forbidden'
              )
            )
          ) AS quality_gate_structure_repairable,
          (
            r.error_report_json ->> 'code' = 'quality_gate_failed'
            AND r.stage_results_json -> 'validation:2' ->> 'passed' = 'true'
            AND jsonb_array_length(
              CASE
                WHEN jsonb_typeof(r.stage_results_json -> 'validation:2' -> 'issues') = 'array'
                  THEN r.stage_results_json -> 'validation:2' -> 'issues'
                ELSE '[]'::jsonb
              END
            ) = 0
            AND r.stage_results_json -> 'review:2' -> 'value' ->> 'passed' = 'false'
            AND r.stage_results_json -> 'review:2' -> 'value' ->> 'requiresManualReview' = 'true'
            AND EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
              WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:2$'
                AND settled.value ->> 'status' = 'settled'
            )
            AND EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
              WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:review:2$'
                AND settled.value ->> 'status' = 'settled'
            )
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                CASE
                  WHEN jsonb_typeof(r.stage_results_json -> 'review:2' -> 'value' -> 'issues') = 'array'
                    THEN r.stage_results_json -> 'review:2' -> 'value' -> 'issues'
                  ELSE '[]'::jsonb
                END
              ) AS issue
              WHERE COALESCE((issue ->> 'blocking')::boolean, FALSE)
                 OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
            )
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                CASE
                  WHEN jsonb_typeof(r.stage_results_json -> 'review:2' -> 'value' -> 'issues') = 'array'
                    THEN r.stage_results_json -> 'review:2' -> 'value' -> 'issues'
                  ELSE '[]'::jsonb
                END
              ) AS issue
              WHERE (
                COALESCE((issue ->> 'blocking')::boolean, FALSE)
                OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
              )
                AND (
                  COALESCE(issue ->> 'verificationType', '') NOT IN ('source', 'date')
                  OR COALESCE((issue ->> 'sourceRequired')::boolean, FALSE) IS NOT TRUE
                  OR btrim(COALESCE(issue ->> 'evidenceExcerpt', '')) = ''
                  OR btrim(COALESCE(issue ->> 'repairInstruction', '')) = ''
                )
            )
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_each(
                CASE
                  WHEN jsonb_typeof(r.stage_results_json -> 'review:2' -> 'value' -> 'risks') = 'object'
                    THEN r.stage_results_json -> 'review:2' -> 'value' -> 'risks'
                  ELSE '{}'::jsonb
                END
              ) AS risk(key, value)
              WHERE risk.key IN (
                'legalClaims', 'privacyClaims', 'softwareVersionClaims', 'staticPrices'
              )
                AND risk.value = 'true'::jsonb
            )
            AND NOT (r.stage_results_json ? 'quality_gate_recovery:structure_contract:attempt-7')
            AND NOT (r.stage_results_json ? 'repair:3')
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS repair_budget(key, value)
              WHERE repair_budget.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:3$'
            )
          ) AS quality_gate_editorial_repairable,
          (
            r.error_report_json ->> 'code' = 'CONTENT_RULE_MANIFEST_MISMATCH'
            AND r.stage_results_json
              -> 'quality_gate_recovery:structure_contract:attempt-7'
              ->> 'status' = 'authorized_after_quality_gate'
            AND r.stage_results_json
              -> 'quality_gate_recovery:structure_contract:attempt-7'
              ->> 'stageId' = 'repair:3'
            AND NOT (r.stage_results_json ? 'repair:3')
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS repair_budget(key, value)
              WHERE repair_budget.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:3$'
            )
          ) AS quality_gate_manifest_repairable,
          (
            r.error_report_json ->> 'code' = 'quality_gate_failed'
            AND r.stage_results_json -> 'validation:3' ->> 'passed' = 'true'
            AND jsonb_array_length(COALESCE(r.stage_results_json -> 'validation:3' -> 'issues', '[]'::jsonb)) = 0
            AND EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
              WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:repair:3$'
                AND settled.value ->> 'status' = 'settled'
            )
            AND EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS settled(key, value)
              WHERE settled.key ~ '^budget:[0-9]{4}-[0-9]{2}:review:3$'
                AND settled.value ->> 'status' = 'settled'
            )
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(r.stage_results_json -> 'review:3' -> 'value' -> 'issues', '[]'::jsonb)) AS issue
              WHERE COALESCE((issue ->> 'blocking')::boolean, FALSE)
                 OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
            )
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(r.stage_results_json -> 'review:3' -> 'value' -> 'issues', '[]'::jsonb)) AS issue
              WHERE (
                COALESCE((issue ->> 'blocking')::boolean, FALSE)
                OR COALESCE((issue ->> 'autoPublishBlocking')::boolean, FALSE)
              )
                AND COALESCE(issue ->> 'code', '') !~* '^(cta_(count|locations?|tracking|contact_target|structure)|faq_(count|structure|structural|visibility|visible|markup|json|mismatch)|html_|bootstrap_|class_|h1_|meta_(title|description)|slug_|image_alt|internal_link_(count|target|href|validity))'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json -> 'review:3' -> 'value' -> 'risks', '{}'::jsonb)) AS risk(key, value)
              WHERE risk.value = 'true'::jsonb
            )
            AND NOT (r.stage_results_json ? 'editorial_review_recovery:review_scope:attempt-9')
            AND NOT (r.stage_results_json ? 'review:4')
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS review_budget(key, value)
              WHERE review_budget.key ~ '^budget:[0-9]{4}-[0-9]{2}:review:4$'
            )
          ) AS editorial_review_recoverable
        ) quality_recovery ON TRUE
        ORDER BY j.created_at DESC
        LIMIT $1
      `, [normalizeLimit(limit)]);
      return rows;
    },

    async getSearchConsoleInsights() {
      const [range, pages, metrics, opportunities, provider] = await Promise.all([
        db.query(`
          SELECT
            (MAX(metric_date) - INTERVAL '27 days')::date AS start_date,
            MAX(metric_date)::date AS end_date
          FROM content_search_metrics
        `),
        db.query(`
          WITH available_range AS (
            SELECT
              (MAX(metric_date) - INTERVAL '27 days')::date AS start_date,
              MAX(metric_date)::date AS end_date
            FROM content_search_metrics
          )
          SELECT page_url,
                 SUM(clicks)::double precision AS clicks,
                 SUM(impressions)::double precision AS impressions,
                 (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
                 (
                   SUM(average_position * impressions)
                   / NULLIF(SUM(impressions), 0)
                 )::double precision AS average_position
          FROM content_search_metrics, available_range
          WHERE metric_date BETWEEN available_range.start_date AND available_range.end_date
          GROUP BY page_url
          ORDER BY SUM(impressions) DESC, page_url ASC
        `),
        db.query(`
          WITH available_range AS (
            SELECT
              (MAX(metric_date) - INTERVAL '27 days')::date AS start_date,
              MAX(metric_date)::date AS end_date
            FROM content_search_metrics
          )
          SELECT page_url, query,
                 SUM(clicks)::double precision AS clicks,
                 SUM(impressions)::double precision AS impressions,
                 (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
                 (
                   SUM(average_position * impressions)
                   / NULLIF(SUM(impressions), 0)
                 )::double precision AS average_position
          FROM content_search_metrics, available_range
          WHERE metric_date BETWEEN available_range.start_date AND available_range.end_date
          GROUP BY page_url, query
          ORDER BY SUM(impressions) DESC, page_url ASC, query ASC
          LIMIT $1
        `, [300]),
        db.query(`
          SELECT id, post_id, opportunity_type, primary_query, score, created_at
          FROM content_opportunities
          WHERE status = 'open'
          ORDER BY score DESC, created_at DESC, id DESC
          LIMIT $1
        `, [100]),
        db.query(`
          SELECT provider_name, last_success_at, last_failure_at,
                 last_error_code, updated_at
          FROM content_provider_state
          WHERE provider_name = $1
          ORDER BY updated_at DESC
          LIMIT 1
        `, ['google_search_console'])
      ]);

      const storedRange = range.rows[0];

      return {
        range: storedRange?.start_date && storedRange?.end_date ? storedRange : null,
        pages: pages.rows,
        metrics: metrics.rows,
        opportunities: opportunities.rows,
        provider: provider.rows[0] || null
      };
    },

    async getTechnologyState() {
      const [worker, providers] = await Promise.all([
        db.query(`
          SELECT worker_name, heartbeat_at, started_at, last_job_at, version,
                 last_scheduler_tick_at, last_scheduler_error, last_scheduled_slot
          FROM content_worker_state
          WHERE worker_name = $1
        `, ['content-worker']),
        db.query(`
          SELECT provider_name, last_success_at, last_failure_at,
                 last_error_code, updated_at
          FROM content_provider_state
          ORDER BY provider_name
        `)
      ]);
      return { worker: worker.rows[0] || null, providers: providers.rows };
    }
  };
}
