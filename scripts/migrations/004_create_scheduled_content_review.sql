ALTER TABLE content_agent_settings
  ADD COLUMN IF NOT EXISTS generation_lead_hours SMALLINT NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS admin_notification_email VARCHAR(320) NOT NULL DEFAULT 'kontakt@komplettwebdesign.de',
  ADD COLUMN IF NOT EXISTS newsletter_blog_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE content_agent_settings
SET generation_lead_hours = 4
WHERE generation_lead_hours NOT BETWEEN 1 AND 48;

UPDATE content_agent_settings
SET admin_notification_email = 'kontakt@komplettwebdesign.de'
WHERE BTRIM(admin_notification_email) = ''
   OR admin_notification_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

UPDATE content_agent_settings
SET newsletter_blog_notifications_enabled = FALSE
WHERE newsletter_blog_notifications_enabled = TRUE
  AND manual_approvals_count < 8;

ALTER TABLE content_agent_settings
  DROP CONSTRAINT IF EXISTS content_agent_settings_generation_lead_hours_valid;
ALTER TABLE content_agent_settings
  ADD CONSTRAINT content_agent_settings_generation_lead_hours_valid
  CHECK (generation_lead_hours BETWEEN 1 AND 48);

ALTER TABLE content_agent_settings
  DROP CONSTRAINT IF EXISTS content_agent_settings_admin_notification_email_valid;
ALTER TABLE content_agent_settings
  ADD CONSTRAINT content_agent_settings_admin_notification_email_valid
  CHECK (
    admin_notification_email = BTRIM(admin_notification_email)
    AND admin_notification_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

ALTER TABLE content_agent_settings
  DROP CONSTRAINT IF EXISTS content_agent_settings_newsletter_gate_valid;
ALTER TABLE content_agent_settings
  ADD CONSTRAINT content_agent_settings_newsletter_gate_valid
  CHECK (
    newsletter_blog_notifications_enabled = FALSE
    OR manual_approvals_count >= 8
  );

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS review_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_review_version INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS publication_version INTEGER NOT NULL DEFAULT 1;

UPDATE posts
SET review_version = 1
WHERE review_version < 1;

UPDATE posts
SET publication_version = 1
WHERE publication_version < 1;

UPDATE posts
SET workflow_status = CASE
      WHEN workflow_status = 'approved_scheduled' AND generated_by_ai = TRUE THEN 'needs_review'
      WHEN workflow_status = 'approved_scheduled' THEN 'draft'
      ELSE workflow_status
    END,
    approved_review_version = NULL,
    approved_at = NULL,
    approved_by_admin_id = NULL
WHERE (approved_review_version IS NOT NULL AND (
        approved_review_version < 1
        OR approved_review_version > review_version
      ))
   OR (approved_review_version IS NULL AND approved_at IS NOT NULL)
   OR (approved_review_version IS NOT NULL AND approved_at IS NULL)
   OR (workflow_status = 'approved_scheduled' AND (
        scheduled_at IS NULL
        OR approved_review_version IS DISTINCT FROM review_version
        OR approved_at IS NULL
      ));

ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_review_versions_valid;
ALTER TABLE posts
  ADD CONSTRAINT posts_review_versions_valid
  CHECK (
    review_version >= 1
    AND publication_version >= 1
    AND (
      approved_review_version IS NULL
      OR approved_review_version BETWEEN 1 AND review_version
    )
  );

ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_approval_consistent;
ALTER TABLE posts
  ADD CONSTRAINT posts_approval_consistent
  CHECK (
    (approved_review_version IS NULL AND approved_at IS NULL)
    OR
    (approved_review_version IS NOT NULL AND approved_at IS NOT NULL)
  );

ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_publication_workflow_consistent;
ALTER TABLE posts
  ADD CONSTRAINT posts_publication_workflow_consistent CHECK (
    (
      published = TRUE
      AND workflow_status = 'published'
      AND published_at IS NOT NULL
    )
    OR
    (
      published = FALSE
      AND workflow_status = 'approved_scheduled'
      AND published_at IS NULL
      AND scheduled_at IS NOT NULL
      AND approved_review_version = review_version
      AND approved_at IS NOT NULL
    )
    OR
    (
      published = FALSE
      AND workflow_status NOT IN ('published', 'approved_scheduled')
      AND published_at IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS content_notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_type VARCHAR(40) NOT NULL,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  recipient_id BIGINT,
  recipient_email VARCHAR(320) NOT NULL,
  idempotency_key VARCHAR(220) NOT NULL,
  payload_json JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(180),
  last_error_code VARCHAR(120),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

UPDATE content_notification_deliveries
SET notification_type = 'admin_review',
    status = 'cancelled',
    last_error_code = COALESCE(last_error_code, 'migration_invalid_notification_type')
WHERE notification_type NOT IN ('admin_review', 'newsletter_article');

UPDATE content_notification_deliveries
SET status = 'failed',
    last_error_code = COALESCE(last_error_code, 'migration_invalid_delivery_status')
WHERE status NOT IN ('queued', 'sending', 'sent', 'failed', 'cancelled');

UPDATE content_notification_deliveries
SET attempts = LEAST(GREATEST(attempts, 0), 5),
    status = CASE WHEN attempts > 5 THEN 'failed' ELSE status END,
    last_error_code = CASE
      WHEN attempts > 5 THEN COALESCE(last_error_code, 'migration_attempt_limit_exceeded')
      ELSE last_error_code
    END
WHERE attempts NOT BETWEEN 0 AND 5;

ALTER TABLE content_notification_deliveries
  DROP CONSTRAINT IF EXISTS content_notification_deliveries_type_valid;
ALTER TABLE content_notification_deliveries
  ADD CONSTRAINT content_notification_deliveries_type_valid
  CHECK (notification_type IN ('admin_review', 'newsletter_article'));

ALTER TABLE content_notification_deliveries
  DROP CONSTRAINT IF EXISTS content_notification_deliveries_recipient_valid;
ALTER TABLE content_notification_deliveries
  ADD CONSTRAINT content_notification_deliveries_recipient_valid
  CHECK (notification_type <> 'newsletter_article' OR recipient_id IS NOT NULL);

ALTER TABLE content_notification_deliveries
  DROP CONSTRAINT IF EXISTS content_notification_deliveries_status_valid;
ALTER TABLE content_notification_deliveries
  ADD CONSTRAINT content_notification_deliveries_status_valid
  CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled'));

ALTER TABLE content_notification_deliveries
  DROP CONSTRAINT IF EXISTS content_notification_deliveries_attempts_valid;
ALTER TABLE content_notification_deliveries
  ADD CONSTRAINT content_notification_deliveries_attempts_valid
  CHECK (attempts BETWEEN 0 AND 5);

WITH ranked_admin_deliveries AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY post_id, payload_json ->> 'reviewVersion'
           ORDER BY created_at, id
         ) AS delivery_rank
  FROM content_notification_deliveries
  WHERE notification_type = 'admin_review'
    AND status <> 'cancelled'
    AND payload_json ? 'reviewVersion'
)
UPDATE content_notification_deliveries delivery
SET status = 'cancelled',
    last_error_code = COALESCE(delivery.last_error_code, 'migration_duplicate_delivery'),
    updated_at = NOW()
FROM ranked_admin_deliveries ranked
WHERE delivery.id = ranked.id
  AND ranked.delivery_rank > 1;

WITH ranked_newsletter_deliveries AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY post_id, recipient_id, payload_json ->> 'publicationVersion'
           ORDER BY created_at, id
         ) AS delivery_rank
  FROM content_notification_deliveries
  WHERE notification_type = 'newsletter_article'
    AND status <> 'cancelled'
    AND payload_json ? 'publicationVersion'
)
UPDATE content_notification_deliveries delivery
SET status = 'cancelled',
    last_error_code = COALESCE(delivery.last_error_code, 'migration_duplicate_delivery'),
    updated_at = NOW()
FROM ranked_newsletter_deliveries ranked
WHERE delivery.id = ranked.id
  AND ranked.delivery_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_notification_deliveries_admin_review
  ON content_notification_deliveries (post_id, (payload_json ->> 'reviewVersion'))
  WHERE notification_type = 'admin_review'
    AND status <> 'cancelled'
    AND payload_json ? 'reviewVersion';

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_notification_deliveries_newsletter_article
  ON content_notification_deliveries (
    post_id,
    recipient_id,
    (payload_json ->> 'publicationVersion')
  )
  WHERE notification_type = 'newsletter_article'
    AND status <> 'cancelled'
    AND payload_json ? 'publicationVersion';

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_publish_events_scheduled_publication
  ON content_publish_events (post_id, (context_json ->> 'publicationVersion'))
  WHERE decision = 'manual'
    AND context_json ? 'publicationVersion';

CREATE INDEX IF NOT EXISTS idx_content_notification_deliveries_claim
  ON content_notification_deliveries (next_attempt_at, created_at)
  WHERE status IN ('queued', 'failed');
