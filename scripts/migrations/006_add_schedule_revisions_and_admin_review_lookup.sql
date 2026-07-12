ALTER TABLE content_agent_settings
  ADD COLUMN IF NOT EXISTS schedule_revision BIGINT NOT NULL DEFAULT 1;

UPDATE content_agent_settings
SET schedule_revision = 1
WHERE schedule_revision < 1;

ALTER TABLE content_agent_settings
  DROP CONSTRAINT IF EXISTS content_agent_settings_schedule_revision_valid;
ALTER TABLE content_agent_settings
  ADD CONSTRAINT content_agent_settings_schedule_revision_valid
  CHECK (schedule_revision >= 1);

CREATE TABLE IF NOT EXISTS content_agent_schedule_revisions (
  revision BIGINT PRIMARY KEY,
  effective_at TIMESTAMPTZ NOT NULL,
  agent_enabled BOOLEAN NOT NULL,
  schedule_weekdays SMALLINT[] NOT NULL,
  schedule_time TIME NOT NULL,
  timezone VARCHAR(120) NOT NULL,
  generation_lead_hours SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_agent_schedule_revision_weekdays_valid CHECK (
    cardinality(schedule_weekdays) BETWEEN 1 AND 7
    AND schedule_weekdays <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::SMALLINT[]
  ),
  CONSTRAINT content_agent_schedule_revision_lead_valid CHECK (
    generation_lead_hours BETWEEN 1 AND 48
  )
);

INSERT INTO content_agent_schedule_revisions (
  revision,
  effective_at,
  agent_enabled,
  schedule_weekdays,
  schedule_time,
  timezone,
  generation_lead_hours
)
SELECT
  settings.schedule_revision,
  NOW(),
  settings.agent_enabled,
  settings.schedule_weekdays,
  settings.schedule_time,
  settings.timezone,
  settings.generation_lead_hours
FROM content_agent_settings settings
WHERE settings.id = 1
ON CONFLICT (revision) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_content_agent_schedule_revisions_effective
  ON content_agent_schedule_revisions (effective_at, revision);

CREATE INDEX IF NOT EXISTS idx_content_notification_deliveries_post_type_latest
  ON content_notification_deliveries (
    post_id,
    notification_type,
    created_at DESC,
    id DESC
  );
