CREATE TABLE IF NOT EXISTS content_article_events (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  event_type VARCHAR(24) NOT NULL CHECK (event_type IN ('cta_click', 'contact_submit')),
  occurred_at TIMESTAMPTZ NOT NULL,
  cta_location VARCHAR(80),
  cta_target VARCHAR(180),
  event_key_hash CHAR(64) NOT NULL UNIQUE CHECK (event_key_hash ~ '^[0-9a-f]{64}$'),
  attribution_type VARCHAR(32) NOT NULL DEFAULT 'session_last_touch_7d'
    CHECK (attribution_type = 'session_last_touch_7d'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_article_events_post_date
  ON content_article_events (post_id, occurred_at DESC, event_type);

CREATE TABLE IF NOT EXISTS content_article_performance_snapshots (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  evaluated_through_date DATE NOT NULL,
  article_age_days INTEGER NOT NULL CHECK (article_age_days >= 0),
  windows_json JSONB NOT NULL CHECK (jsonb_typeof(windows_json) = 'object'),
  previous_windows_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(previous_windows_json) = 'object'),
  cohort_json JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(cohort_json) = 'object'),
  status VARCHAR(32) NOT NULL CHECK (status IN (
    'collecting_data', 'insufficient_impressions', 'positive', 'stable', 'opportunity'
  )),
  diagnoses_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(diagnoses_json) = 'array'),
  positive_signals_json JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(positive_signals_json) = 'array'),
  data_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  learning_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_hash CHAR(64) NOT NULL CHECK (evidence_hash ~ '^[0-9a-f]{64}$'),
  explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(explanation_json) = 'object'),
  explanation_status VARCHAR(20) NOT NULL DEFAULT 'not_needed'
    CHECK (explanation_status IN ('not_needed', 'pending', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, evaluated_through_date)
);

CREATE INDEX IF NOT EXISTS idx_content_article_performance_latest
  ON content_article_performance_snapshots (post_id, evaluated_through_date DESC);

CREATE INDEX IF NOT EXISTS idx_content_article_performance_learning
  ON content_article_performance_snapshots (learning_eligible, evaluated_through_date DESC)
  WHERE learning_eligible = TRUE;
