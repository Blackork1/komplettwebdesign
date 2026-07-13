CREATE TABLE IF NOT EXISTS content_search_metrics (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  page_url TEXT NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  device VARCHAR(24) NOT NULL DEFAULT 'ALL',
  clicks NUMERIC(14,4) NOT NULL DEFAULT 0,
  impressions NUMERIC(14,4) NOT NULL DEFAULT 0,
  ctr NUMERIC(12,8) NOT NULL DEFAULT 0,
  average_position NUMERIC(12,4) NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metric_date, page_url, query, device)
);
CREATE INDEX IF NOT EXISTS idx_content_search_metrics_page_date
  ON content_search_metrics (page_url, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_search_metrics_query_date
  ON content_search_metrics (query, metric_date DESC);

CREATE TABLE IF NOT EXISTS content_opportunities (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  analysis_key VARCHAR(180) NOT NULL UNIQUE,
  opportunity_type VARCHAR(64) NOT NULL
    CHECK (opportunity_type IN ('meta_refresh', 'content_refresh')),
  primary_query TEXT,
  score NUMERIC(5,2) NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'dismissed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_status_score
  ON content_opportunities (status, score DESC, created_at DESC);
