import pool from '../util/db.js';

const OVERVIEW_DRAFT_LIMIT = 10;
const OVERVIEW_JOB_LIMIT = 10;

function normalizeLimit(value) {
  return Math.min(200, Math.max(1, Number(value) || 100));
}

export function createContentAgentAdminRepository(db = pool) {
  return {
    async getOverview() {
      const [settings, worker, budget, drafts, jobs] = await Promise.all([
        db.query(`
          SELECT id, agent_enabled, operating_mode, schedule_weekdays, schedule_time,
                 timezone, monthly_budget_cents, maximum_attempts,
                 auto_publish_enabled, auto_publish_min_score,
                 manual_approvals_count, settings_version, updated_at
          FROM content_agent_settings
          WHERE id = 1
        `),
        db.query(`
          SELECT worker_name, heartbeat_at, started_at, last_job_at, version,
                 last_scheduler_tick_at, last_scheduler_error, last_scheduled_slot
          FROM content_worker_state
          WHERE worker_name = $1
        `, ['content-worker']),
        db.query(`
          SELECT COALESCE(SUM(cost_estimate), 0) AS used
          FROM content_runs
          WHERE started_at >= date_trunc('month', NOW())
        `),
        db.query(`
          SELECT id, title, slug, excerpt, image_url, workflow_status, created_at
          FROM posts
          WHERE generated_by_ai = TRUE AND published = FALSE
          ORDER BY created_at DESC
          LIMIT $1
        `, [OVERVIEW_DRAFT_LIMIT]),
        db.query(`
          SELECT j.id, j.job_type, j.status, j.attempts, j.max_attempts,
                 j.last_error, j.created_at, j.updated_at, j.finished_at,
                 r.current_stage, r.post_id, r.cost_estimate, r.status AS run_status
          FROM content_jobs j
          LEFT JOIN content_runs r ON r.job_id = j.id
          ORDER BY j.created_at DESC
          LIMIT $1
        `, [OVERVIEW_JOB_LIMIT])
      ]);
      const currentSettings = settings.rows[0] || null;

      return {
        settings: currentSettings,
        worker: worker.rows[0] || null,
        budgetUsed: Number(budget.rows[0]?.used || 0),
        drafts: drafts.rows,
        jobs: jobs.rows,
        approvals: Number(currentSettings?.manual_approvals_count || 0)
      };
    },

    async listDrafts() {
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.image_url, p.workflow_status,
               p.created_at, m.primary_keyword, m.content_cluster,
               m.quality_score,
               COALESCE((m.quality_report_json #>> '{focusedReview,blocked}')::boolean, FALSE)
                 AS risk_blocked,
               CASE
                 WHEN jsonb_typeof(m.quality_report_json #> '{focusedReview,items}') = 'array'
                   THEN jsonb_array_length(m.quality_report_json #> '{focusedReview,items}')
                 ELSE 0
               END AS risk_count,
               r.cost_estimate
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        LEFT JOIN content_runs r ON r.post_id = p.id
        WHERE p.generated_by_ai = TRUE AND p.published = FALSE
        ORDER BY p.created_at DESC
      `);
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
          WHERE r.post_id = p.id AND r.status = 'draft'
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
               r.current_stage, r.post_id, r.cost_estimate, r.status AS run_status
        FROM content_jobs j
        LEFT JOIN content_runs r ON r.job_id = j.id
        ORDER BY j.created_at DESC
        LIMIT $1
      `, [normalizeLimit(limit)]);
      return rows;
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
