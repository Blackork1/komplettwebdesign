CREATE TABLE IF NOT EXISTS content_legacy_migrations (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL CHECK (
    status IN ('scanned', 'ready', 'blocked', 'migrated', 'rolled_back', 'stale', 'failed')
  ),
  migration_class VARCHAR(24) NOT NULL CHECK (
    migration_class IN ('static_legacy', 'active_ejs')
  ),
  base_live_hash CHAR(64) NOT NULL CHECK (base_live_hash ~ '^[0-9a-f]{64}$'),
  migrated_live_hash CHAR(64) CHECK (
    migrated_live_hash IS NULL OR migrated_live_hash ~ '^[0-9a-f]{64}$'
  ),
  source_content_format VARCHAR(24) NOT NULL DEFAULT 'legacy_ejs'
    CHECK (source_content_format = 'legacy_ejs'),
  source_content TEXT NOT NULL,
  rendered_static_html TEXT,
  render_context_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(render_context_json) = 'object'),
  analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(analysis_json) = 'object'),
  blocking_issues_json JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(blocking_issues_json) = 'array'),
  sanitizer_report_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(sanitizer_report_json) = 'object'),
  created_by BIGINT NOT NULL,
  approved_by BIGINT,
  rolled_back_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migrated_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  CHECK (
    (
      status = 'migrated'
      AND migrated_at IS NOT NULL
      AND approved_by IS NOT NULL
      AND migrated_live_hash IS NOT NULL
    )
    OR status <> 'migrated'
  ),
  CHECK (
    (
      status = 'rolled_back'
      AND rolled_back_at IS NOT NULL
      AND rolled_back_by IS NOT NULL
    )
    OR status <> 'rolled_back'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_legacy_migrations_open_post
  ON content_legacy_migrations (post_id)
  WHERE status IN ('scanned', 'ready', 'blocked');

CREATE INDEX IF NOT EXISTS idx_content_legacy_migrations_post_history
  ON content_legacy_migrations (post_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_content_legacy_migrations_dashboard
  ON content_legacy_migrations (status, migration_class, updated_at DESC);
