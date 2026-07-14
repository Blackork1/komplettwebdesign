ALTER TABLE content_post_revisions
  ADD COLUMN IF NOT EXISTS optimization_job_id BIGINT REFERENCES content_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS optimization_report_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE content_post_revisions
  DROP CONSTRAINT IF EXISTS content_post_revisions_optimization_report_object;
ALTER TABLE content_post_revisions
  ADD CONSTRAINT content_post_revisions_optimization_report_object
  CHECK (jsonb_typeof(optimization_report_json) = 'object');

WITH ranked_post_drafts AS (
  SELECT revision.id,
         ROW_NUMBER() OVER (
           PARTITION BY revision.post_id
           ORDER BY revision.updated_at DESC,
                    revision.created_at DESC,
                    revision.id DESC
         ) AS position
  FROM content_post_revisions revision
  WHERE revision.status = 'draft'
)
UPDATE content_post_revisions revision
SET status = 'rejected',
    revision_version = revision.revision_version + 1,
    updated_at = NOW()
WHERE revision.id IN (
  SELECT id FROM ranked_post_drafts WHERE position > 1
);

UPDATE content_post_audits audit
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM content_post_revisions revision
    WHERE revision.audit_id = audit.id AND revision.status = 'draft'
  ) THEN 'revision_created'
  WHEN EXISTS (
    SELECT 1 FROM content_post_revisions revision
    WHERE revision.audit_id = audit.id AND revision.status = 'approved'
  ) THEN 'resolved'
  ELSE 'open'
END
WHERE EXISTS (
  SELECT 1 FROM content_post_revisions revision
  WHERE revision.audit_id = audit.id
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_post_revisions_draft_post
  ON content_post_revisions (post_id) WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_jobs_active_existing_optimization
  ON content_jobs ((payload_json ->> 'post_id'))
  WHERE job_type = 'optimize_existing_post'
    AND status IN ('queued', 'running', 'needs_manual_attention');

CREATE TABLE IF NOT EXISTS content_search_metric_sync_days (
  metric_date DATE PRIMARY KEY,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  evaluation_claim_token UUID,
  evaluation_claimed_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(baseline_metrics_json) = 'object'),
  CHECK (followup_metrics_json IS NULL OR jsonb_typeof(followup_metrics_json) = 'object'),
  CHECK (jsonb_typeof(feedback_json) = 'array'),
  CHECK (evaluation_status IN ('waiting', 'ready', 'evaluated', 'insufficient_data', 'failed')),
  CHECK (
    (evaluation_status = 'ready' AND evaluation_claim_token IS NOT NULL AND evaluation_claimed_at IS NOT NULL)
    OR (evaluation_status <> 'ready' AND evaluation_claim_token IS NULL AND evaluation_claimed_at IS NULL)
  ),
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
