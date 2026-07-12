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

WITH schedule_change_history AS (
  SELECT id,
         created_at,
         previous_values_json,
         new_values_json,
         ROW_NUMBER() OVER (ORDER BY created_at, id) + 1 AS revision
  FROM content_agent_setting_revisions
  WHERE changed_keys && ARRAY[
    'agent_enabled',
    'schedule_weekdays',
    'schedule_time',
    'timezone',
    'generation_lead_hours'
  ]::TEXT[]
),
first_schedule_change AS (
  SELECT id, created_at, previous_values_json
  FROM schedule_change_history
  ORDER BY created_at, id
  LIMIT 1
),
revision_snapshots AS (
  SELECT 1::BIGINT AS revision,
         LEAST(
           NOW() - INTERVAL '8 days',
           COALESCE(first_change.created_at - INTERVAL '1 microsecond', NOW() - INTERVAL '8 days')
         ) AS effective_at,
         COALESCE(first_change.previous_values_json, to_jsonb(settings)) AS snapshot_json
  FROM content_agent_settings settings
  LEFT JOIN first_schedule_change first_change ON TRUE
  WHERE settings.id = 1

  UNION ALL

  SELECT history.revision::BIGINT,
         history.created_at,
         history.new_values_json
  FROM schedule_change_history history
),
normalized_snapshots AS (
  SELECT snapshot.revision,
         snapshot.effective_at,
         COALESCE((snapshot.snapshot_json ->> 'agent_enabled')::BOOLEAN, settings.agent_enabled) AS agent_enabled,
         CASE
           WHEN jsonb_typeof(snapshot.snapshot_json -> 'schedule_weekdays') = 'array'
             THEN ARRAY(
               SELECT weekday.value::SMALLINT
               FROM jsonb_array_elements_text(
                 snapshot.snapshot_json -> 'schedule_weekdays'
               ) AS weekday(value)
             )
           ELSE settings.schedule_weekdays
         END AS schedule_weekdays,
         COALESCE((snapshot.snapshot_json ->> 'schedule_time')::TIME, settings.schedule_time) AS schedule_time,
         COALESCE(NULLIF(snapshot.snapshot_json ->> 'timezone', ''), settings.timezone) AS timezone,
         COALESCE(
           (snapshot.snapshot_json ->> 'generation_lead_hours')::SMALLINT,
           settings.generation_lead_hours
         ) AS generation_lead_hours
  FROM revision_snapshots snapshot
  CROSS JOIN content_agent_settings settings
  WHERE settings.id = 1
)
INSERT INTO content_agent_schedule_revisions (
  revision,
  effective_at,
  agent_enabled,
  schedule_weekdays,
  schedule_time,
  timezone,
  generation_lead_hours
)
SELECT normalized.revision,
       normalized.effective_at,
       normalized.agent_enabled,
       normalized.schedule_weekdays,
       normalized.schedule_time,
       normalized.timezone,
       normalized.generation_lead_hours
FROM normalized_snapshots normalized
WHERE NOT EXISTS (SELECT 1 FROM content_agent_schedule_revisions)
ON CONFLICT (revision) DO NOTHING;

UPDATE content_agent_settings
SET schedule_revision = COALESCE(
      (SELECT MAX(revision) FROM content_agent_schedule_revisions),
      schedule_revision
    )
WHERE id = 1;

CREATE INDEX IF NOT EXISTS idx_content_agent_schedule_revisions_effective
  ON content_agent_schedule_revisions (effective_at, revision);

CREATE INDEX IF NOT EXISTS idx_content_notification_deliveries_post_type_latest
  ON content_notification_deliveries (
    post_id,
    notification_type,
    created_at DESC,
    id DESC
  );
