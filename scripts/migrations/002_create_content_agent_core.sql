ALTER TABLE posts ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS og_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS og_description TEXT,
  ADD COLUMN IF NOT EXISTS image_alt TEXT,
  ADD COLUMN IF NOT EXISTS content_format VARCHAR(32),
  ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

UPDATE posts
SET workflow_status = CASE WHEN published THEN 'published' ELSE 'draft' END,
    content_format = COALESCE(content_format, 'legacy_ejs'),
    meta_description = COALESCE(meta_description, description),
    published_at = CASE WHEN published AND published_at IS NULL THEN created_at ELSE published_at END
WHERE workflow_status IS NULL
   OR content_format IS NULL
   OR meta_description IS NULL
   OR (published AND published_at IS NULL);

ALTER TABLE posts
  ALTER COLUMN workflow_status SET DEFAULT 'draft',
  ALTER COLUMN workflow_status SET NOT NULL,
  ALTER COLUMN content_format SET DEFAULT 'legacy_ejs',
  ALTER COLUMN content_format SET NOT NULL;

UPDATE posts
SET workflow_status = CASE
      WHEN published = TRUE THEN 'published'
      WHEN generated_by_ai = TRUE THEN 'needs_review'
      ELSE 'draft'
    END,
    published_at = CASE
      WHEN published = TRUE THEN COALESCE(published_at, created_at, NOW())
      ELSE NULL
    END
WHERE (published = TRUE AND (workflow_status <> 'published' OR published_at IS NULL))
   OR (published = FALSE AND (workflow_status = 'published' OR published_at IS NOT NULL));

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_publication_workflow_consistent;
ALTER TABLE posts ADD CONSTRAINT posts_publication_workflow_consistent CHECK (
  (published = TRUE AND workflow_status = 'published' AND published_at IS NOT NULL)
  OR
  (published = FALSE AND workflow_status <> 'published' AND published_at IS NULL)
);

CREATE TABLE IF NOT EXISTS content_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  idempotency_key VARCHAR(180) NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(180),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_content_jobs_claim ON content_jobs (status, run_after, created_at);
ALTER TABLE content_jobs DROP CONSTRAINT IF EXISTS content_jobs_status_valid;
ALTER TABLE content_jobs ADD CONSTRAINT content_jobs_status_valid CHECK (
  status IN ('queued', 'running', 'completed', 'failed', 'needs_manual_attention')
);

CREATE TABLE IF NOT EXISTS content_topics (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  suggested_title TEXT,
  primary_keyword TEXT NOT NULL,
  secondary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_cluster VARCHAR(120) NOT NULL,
  search_intent VARCHAR(80) NOT NULL,
  target_audience TEXT NOT NULL,
  source VARCHAR(64) NOT NULL,
  business_value NUMERIC(4,2) NOT NULL DEFAULT 0,
  search_opportunity NUMERIC(4,2) NOT NULL DEFAULT 0,
  problem_purchase_proximity NUMERIC(4,2) NOT NULL DEFAULT 0,
  internal_link_potential NUMERIC(4,2) NOT NULL DEFAULT 0,
  local_relevance NUMERIC(4,2) NOT NULL DEFAULT 0,
  cluster_fit NUMERIC(4,2) NOT NULL DEFAULT 0,
  cannibalization_risk NUMERIC(4,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS content_runs (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES content_jobs(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  current_stage VARCHAR(64) NOT NULL DEFAULT 'inventory',
  selected_topic_id BIGINT REFERENCES content_topics(id) ON DELETE SET NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  token_usage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
  openai_response_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

WITH ranked_runs AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY job_id
           ORDER BY (post_id IS NOT NULL) DESC,
                    (SELECT COUNT(*) FROM jsonb_object_keys(stage_results_json)) DESC,
                    id ASC
         ) AS run_rank
  FROM content_runs
  WHERE job_id IS NOT NULL
)
UPDATE content_runs
SET job_id = NULL
FROM ranked_runs
WHERE run_rank > 1
  AND content_runs.id = ranked_runs.id;
CREATE UNIQUE INDEX IF NOT EXISTS ux_content_runs_job_id
  ON content_runs (job_id);

ALTER TABLE content_topics
  ADD COLUMN IF NOT EXISTS generation_run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL;
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS generation_run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_content_topics_generation_run_id
  ON content_topics (generation_run_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_posts_generation_run_id
  ON posts (generation_run_id);

CREATE TABLE IF NOT EXISTS content_post_metadata (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  primary_keyword TEXT NOT NULL,
  secondary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_intent VARCHAR(80) NOT NULL,
  target_audience TEXT NOT NULL,
  region_focus TEXT,
  content_cluster VARCHAR(120) NOT NULL,
  business_goal TEXT NOT NULL,
  cta_type VARCHAR(80) NOT NULL,
  internal_links_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_references_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_brief_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score INTEGER NOT NULL DEFAULT 0,
  quality_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_agent_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  schedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_publish_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auto_publish_min_score INTEGER NOT NULL DEFAULT 90,
  manual_approvals_count INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO content_agent_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS content_worker_state (
  worker_name VARCHAR(80) PRIMARY KEY,
  worker_id VARCHAR(180) NOT NULL,
  heartbeat_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  last_job_at TIMESTAMPTZ,
  version VARCHAR(80) NOT NULL
);
