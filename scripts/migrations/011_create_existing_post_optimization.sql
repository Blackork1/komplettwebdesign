ALTER TABLE content_post_revisions
  ADD COLUMN IF NOT EXISTS optimization_job_id BIGINT REFERENCES content_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS optimization_report_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE content_post_revisions
  DROP CONSTRAINT IF EXISTS content_post_revisions_optimization_report_object;
ALTER TABLE content_post_revisions
  ADD CONSTRAINT content_post_revisions_optimization_report_object
  CHECK (jsonb_typeof(optimization_report_json) = 'object');

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_jobs_active_existing_optimization
  ON content_jobs ((payload_json ->> 'post_id'))
  WHERE job_type = 'optimize_existing_post'
    AND status IN ('queued', 'running', 'needs_manual_attention');

CREATE TABLE IF NOT EXISTS content_revision_optimization_outcomes (
  revision_id BIGINT PRIMARY KEY REFERENCES content_post_revisions(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL,
  baseline_start_date DATE,
  baseline_end_date DATE,
  baseline_metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  followup_start_date DATE NOT NULL,
  followup_end_date DATE NOT NULL,
  followup_metrics_json JSONB,
  feedback_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation_status VARCHAR(24) NOT NULL DEFAULT 'waiting',
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(baseline_metrics_json) = 'object'),
  CHECK (followup_metrics_json IS NULL OR jsonb_typeof(followup_metrics_json) = 'object'),
  CHECK (jsonb_typeof(feedback_json) = 'array'),
  CHECK (evaluation_status IN ('waiting', 'ready', 'evaluated', 'insufficient_data', 'failed')),
  CHECK (followup_end_date = followup_start_date + 27)
);

CREATE INDEX IF NOT EXISTS idx_content_revision_outcomes_pending
  ON content_revision_optimization_outcomes (evaluation_status, followup_end_date)
  WHERE evaluation_status IN ('waiting', 'ready', 'failed');

CREATE TABLE IF NOT EXISTS content_revision_optimization_feedback (
  id BIGSERIAL PRIMARY KEY,
  revision_id BIGINT NOT NULL REFERENCES content_post_revisions(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  change_id CHAR(64),
  event_type VARCHAR(24) NOT NULL,
  category_key VARCHAR(80),
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_name VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (change_id IS NULL OR change_id ~ '^[0-9a-f]{64}$'),
  CHECK (event_type IN ('accepted', 'reverted', 'manual_edit', 'rejected')),
  CHECK (jsonb_typeof(details_json) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_content_revision_optimization_feedback
  ON content_revision_optimization_feedback (revision_id, created_at DESC);
