CREATE TABLE IF NOT EXISTS content_learning_classifications (
  fingerprint CHAR(64) PRIMARY KEY,
  category_key VARCHAR(80) NOT NULL,
  classification_source VARCHAR(20) NOT NULL,
  confidence NUMERIC(4, 3),
  reason VARCHAR(500) NOT NULL,
  taxonomy_version VARCHAR(80) NOT NULL,
  provider_run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (classification_source IN ('local', 'provider', 'unclassified')),
  CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS content_learning_observations (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  review_version INTEGER NOT NULL,
  category_key VARCHAR(80) NOT NULL,
  fingerprint CHAR(64) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  instruction VARCHAR(500) NOT NULL,
  section_name VARCHAR(180),
  anchor VARCHAR(220),
  classification_source VARCHAR(20) NOT NULL,
  confidence NUMERIC(4, 3),
  taxonomy_version VARCHAR(80) NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (review_version >= 1),
  CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (classification_source IN ('local', 'provider', 'unclassified')),
  CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_learning_observation_category
  ON content_learning_observations (post_id, category_key)
  WHERE category_key <> 'unclassified';

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_learning_observation_unclassified
  ON content_learning_observations (post_id, fingerprint)
  WHERE category_key = 'unclassified';

CREATE INDEX IF NOT EXISTS idx_content_learning_observations_category
  ON content_learning_observations (category_key, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS content_learning_rule_proposals (
  id BIGSERIAL PRIMARY KEY,
  category_key VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  proposal_version INTEGER NOT NULL DEFAULT 1,
  suggested_rule_text VARCHAR(800) NOT NULL,
  target_stages TEXT[] NOT NULL,
  evidence_count INTEGER NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_effect VARCHAR(500) NOT NULL,
  overfit_warning VARCHAR(500) NOT NULL,
  decided_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  decided_by_admin_name VARCHAR(180),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  CHECK (proposal_version >= 1),
  CHECK (evidence_count >= 3),
  CHECK (cardinality(target_stages) BETWEEN 1 AND 3),
  CHECK (jsonb_typeof(evidence_json) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_learning_pending_category
  ON content_learning_rule_proposals (category_key)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS content_learning_rules (
  id BIGSERIAL PRIMARY KEY,
  category_key VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  current_version INTEGER NOT NULL,
  rule_revision INTEGER NOT NULL DEFAULT 1,
  created_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_by_admin_name VARCHAR(180),
  updated_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  updated_by_admin_name VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('active', 'paused', 'disabled')),
  CHECK (current_version >= 1),
  CHECK (rule_revision >= 1)
);

ALTER TABLE content_learning_rules
  ADD COLUMN IF NOT EXISTS rule_revision INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS content_learning_rule_versions (
  rule_id BIGINT NOT NULL REFERENCES content_learning_rules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  rule_text VARCHAR(800) NOT NULL,
  target_stages TEXT[] NOT NULL,
  rule_hash CHAR(64) NOT NULL,
  source_proposal_id BIGINT REFERENCES content_learning_rule_proposals(id) ON DELETE SET NULL,
  created_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_by_admin_name VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rule_id, version),
  CHECK (version >= 1),
  CHECK (rule_hash ~ '^[0-9a-f]{64}$'),
  CHECK (cardinality(target_stages) BETWEEN 1 AND 3)
);

CREATE TABLE IF NOT EXISTS content_learning_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(40) NOT NULL,
  proposal_id BIGINT REFERENCES content_learning_rule_proposals(id) ON DELETE SET NULL,
  rule_id BIGINT REFERENCES content_learning_rules(id) ON DELETE SET NULL,
  rule_version INTEGER,
  category_key VARCHAR(80) NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_name VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(details_json) = 'object'),
  CHECK (rule_version IS NULL OR rule_version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_content_learning_events_created
  ON content_learning_events (created_at DESC);
