import pool from '../util/db.js';
import { getMonthlyContentCost } from '../services/contentAgent/contentCostService.js';

const OVERVIEW_DRAFT_LIMIT = 10;
const OVERVIEW_JOB_LIMIT = 10;
const REVIEW_STATUS_FILTERS = new Set(['review', 'approved', 'missed', 'published']);

function normalizeLimit(value) {
  return Math.min(200, Math.max(1, Number(value) || 100));
}

export function normalizeReviewStatusFilter(value) {
  return REVIEW_STATUS_FILTERS.has(value) ? value : 'review';
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
                 provider_recovery.open_provider_reservation_count,
                 provider_recovery.open_provider_stage
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
               audit.id AS audit_id, audit.score AS audit_score,
               audit.status AS audit_status, audit.findings_json,
               revision.id AS revision_id, revision.status AS revision_status
        FROM posts p
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
        WHERE p.published = TRUE
        ORDER BY p.updated_at DESC
        LIMIT 100
      `);
      return rows;
    },

    async listJobs(limit = 100) {
      const { rows } = await db.query(`
        SELECT j.id, j.job_type, j.status, j.attempts, j.max_attempts,
               j.last_error, j.created_at, j.updated_at, j.finished_at,
               r.current_stage, r.post_id, r.cost_estimate, r.status AS run_status,
               provider_recovery.open_provider_reservation_count,
               provider_recovery.open_provider_stage
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
        ORDER BY j.created_at DESC
        LIMIT $1
      `, [normalizeLimit(limit)]);
      return rows;
    },

    async getSearchConsoleInsights() {
      const [metrics, opportunities, provider] = await Promise.all([
        db.query(`
          SELECT page_url, query,
                 SUM(clicks)::double precision AS clicks,
                 SUM(impressions)::double precision AS impressions,
                 (SUM(clicks) / NULLIF(SUM(impressions), 0))::double precision AS ctr,
                 (
                   SUM(average_position * impressions)
                   / NULLIF(SUM(impressions), 0)
                 )::double precision AS average_position
          FROM content_search_metrics
          GROUP BY page_url, query
          ORDER BY SUM(impressions) DESC, page_url ASC, query ASC
          LIMIT $1
        `, [100]),
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

      return {
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
