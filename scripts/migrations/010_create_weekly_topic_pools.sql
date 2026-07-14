CREATE TABLE IF NOT EXISTS content_weekly_topic_pools (
  id BIGSERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  candidates_json JSONB NOT NULL,
  source_references_json JSONB NOT NULL,
  response_id VARCHAR(128),
  prompt_version VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (week_start, timezone),
  CHECK (jsonb_typeof(candidates_json) = 'array'),
  CHECK (jsonb_array_length(candidates_json) BETWEEN 1 AND 20),
  CHECK (jsonb_typeof(source_references_json) = 'array'),
  CHECK (jsonb_array_length(source_references_json) BETWEEN 2 AND 6)
);

CREATE TABLE IF NOT EXISTS content_weekly_topic_pool_selections (
  pool_id BIGINT NOT NULL REFERENCES content_weekly_topic_pools(id) ON DELETE CASCADE,
  candidate_slug VARCHAR(180) NOT NULL,
  generation_run_id BIGINT NOT NULL UNIQUE REFERENCES content_runs(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pool_id, candidate_slug),
  CHECK (candidate_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS content_weekly_topic_research_attempts (
  week_start DATE NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  owner_generation_run_id BIGINT NOT NULL REFERENCES content_runs(id),
  status VARCHAR(32) NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'completed', 'needs_manual_attention')),
  response_id VARCHAR(128),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (week_start, timezone)
);

CREATE INDEX IF NOT EXISTS idx_content_weekly_topic_pool_selections_run
  ON content_weekly_topic_pool_selections (generation_run_id);
