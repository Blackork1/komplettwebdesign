DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_agent_settings' AND column_name = 'schedule_enabled'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_agent_settings' AND column_name = 'agent_enabled'
  ) THEN
    ALTER TABLE content_agent_settings RENAME COLUMN schedule_enabled TO agent_enabled;
    UPDATE content_agent_settings SET agent_enabled = FALSE;
  END IF;
END $$;

ALTER TABLE content_agent_settings
  ADD COLUMN IF NOT EXISTS operating_mode VARCHAR(24) NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS schedule_weekdays SMALLINT[] NOT NULL DEFAULT ARRAY[1,4]::SMALLINT[],
  ADD COLUMN IF NOT EXISTS schedule_time TIME NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) NOT NULL DEFAULT 'Europe/Berlin',
  ADD COLUMN IF NOT EXISTS monthly_budget_cents INTEGER NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS maximum_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS settings_version INTEGER NOT NULL DEFAULT 1;

UPDATE content_agent_settings
SET operating_mode = 'review',
    auto_publish_enabled = FALSE
WHERE operating_mode NOT IN ('review', 'auto_publish');

ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_mode_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_mode_valid
  CHECK (operating_mode IN ('review', 'auto_publish'));
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_score_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_score_valid
  CHECK (auto_publish_min_score BETWEEN 90 AND 100);
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_budget_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_budget_valid
  CHECK (monthly_budget_cents >= 0);
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_attempts_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_attempts_valid
  CHECK (maximum_attempts BETWEEN 1 AND 5);
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_weekdays_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_weekdays_valid
  CHECK (cardinality(schedule_weekdays) BETWEEN 1 AND 7 AND schedule_weekdays <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]);

ALTER TABLE content_runs
  ADD COLUMN IF NOT EXISTS runtime_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE content_worker_state
  ADD COLUMN IF NOT EXISTS last_scheduler_tick_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_scheduler_error TEXT,
  ADD COLUMN IF NOT EXISTS last_scheduled_slot TEXT;

CREATE TABLE IF NOT EXISTS content_agent_setting_revisions (
  id BIGSERIAL PRIMARY KEY,
  settings_version INTEGER NOT NULL,
  changed_keys TEXT[] NOT NULL,
  previous_values_json JSONB NOT NULL,
  new_values_json JSONB NOT NULL,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_username VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_publish_events (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL,
  decision VARCHAR(24) NOT NULL,
  policy_version VARCHAR(40) NOT NULL,
  quality_score INTEGER NOT NULL,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_username VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (decision IN ('allowed', 'blocked', 'manual'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_content_publish_events_manual_post
  ON content_publish_events (post_id) WHERE decision = 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS ux_content_publish_events_auto_run_policy
  ON content_publish_events (run_id, policy_version)
  WHERE run_id IS NOT NULL AND decision IN ('allowed', 'blocked');

ALTER TABLE content_publish_events
  DROP CONSTRAINT IF EXISTS content_publish_events_post_id_fkey;
ALTER TABLE content_publish_events
  ADD CONSTRAINT content_publish_events_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION prevent_content_publish_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Content-Publish-Ereignisse sind unveränderlich.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_publish_events_immutable ON content_publish_events;
CREATE TRIGGER content_publish_events_immutable
  BEFORE UPDATE OR DELETE ON content_publish_events
  FOR EACH ROW EXECUTE FUNCTION prevent_content_publish_event_mutation();

CREATE TABLE IF NOT EXISTS content_post_audits (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  job_id BIGINT REFERENCES content_jobs(id) ON DELETE SET NULL,
  run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL,
  audit_type VARCHAR(64) NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  findings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('open', 'revision_created', 'resolved'))
);
UPDATE content_post_audits
SET findings_json = jsonb_build_array(findings_json)
WHERE jsonb_typeof(findings_json) <> 'array';
UPDATE content_post_audits
SET recommended_actions_json = jsonb_build_array(recommended_actions_json)
WHERE jsonb_typeof(recommended_actions_json) <> 'array';
ALTER TABLE content_post_audits DROP CONSTRAINT IF EXISTS content_post_audits_findings_array;
ALTER TABLE content_post_audits ADD CONSTRAINT content_post_audits_findings_array CHECK (jsonb_typeof(findings_json) = 'array');
ALTER TABLE content_post_audits DROP CONSTRAINT IF EXISTS content_post_audits_actions_array;
ALTER TABLE content_post_audits ADD CONSTRAINT content_post_audits_actions_array CHECK (jsonb_typeof(recommended_actions_json) = 'array');

CREATE TABLE IF NOT EXISTS content_post_revisions (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  audit_id BIGINT REFERENCES content_post_audits(id) ON DELETE SET NULL,
  snapshot_json JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_username VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CHECK (status IN ('draft', 'approved', 'rejected'))
);
ALTER TABLE content_post_revisions
  ADD COLUMN IF NOT EXISTS revision_version INTEGER NOT NULL DEFAULT 1;
UPDATE content_post_revisions
SET snapshot_json = jsonb_build_object(
      'base', '{}'::jsonb,
      'fields', '{}'::jsonb,
      'invalid_legacy_snapshot', snapshot_json
    ),
    status = 'rejected'
WHERE jsonb_typeof(snapshot_json) IS DISTINCT FROM 'object'
   OR jsonb_typeof(snapshot_json -> 'base') IS DISTINCT FROM 'object'
   OR jsonb_typeof(snapshot_json -> 'fields') IS DISTINCT FROM 'object';
ALTER TABLE content_post_revisions DROP CONSTRAINT IF EXISTS content_post_revisions_version_valid;
ALTER TABLE content_post_revisions ADD CONSTRAINT content_post_revisions_version_valid CHECK (revision_version >= 1);
ALTER TABLE content_post_revisions DROP CONSTRAINT IF EXISTS content_post_revisions_snapshot_object;
ALTER TABLE content_post_revisions ADD CONSTRAINT content_post_revisions_snapshot_object CHECK (jsonb_typeof(snapshot_json) = 'object');
ALTER TABLE content_post_revisions DROP CONSTRAINT IF EXISTS content_post_revisions_snapshot_shape;
ALTER TABLE content_post_revisions ADD CONSTRAINT content_post_revisions_snapshot_shape CHECK (
  jsonb_typeof(snapshot_json -> 'base') = 'object'
  AND jsonb_typeof(snapshot_json -> 'fields') = 'object'
);
DROP INDEX IF EXISTS ux_content_post_audits_job_post_type;
DROP INDEX IF EXISTS ux_content_post_revisions_draft_audit;

WITH ranked_group_drafts AS (
  SELECT revision.id,
         ROW_NUMBER() OVER (
           PARTITION BY audit.job_id, audit.post_id, audit.audit_type
           ORDER BY revision.created_at DESC, revision.id DESC,
                    audit.created_at DESC, audit.id DESC
         ) AS position
  FROM content_post_revisions revision
  JOIN content_post_audits audit ON audit.id = revision.audit_id
  WHERE revision.status = 'draft' AND audit.job_id IS NOT NULL
)
UPDATE content_post_revisions revision
SET status = 'rejected'
WHERE revision.id IN (
  SELECT id FROM ranked_group_drafts WHERE position > 1
);

CREATE TEMP TABLE content_audit_dedupe_survivors (
  job_id BIGINT NOT NULL,
  post_id INTEGER NOT NULL,
  audit_type VARCHAR(64) NOT NULL,
  survivor_id BIGINT NOT NULL,
  PRIMARY KEY (job_id, post_id, audit_type)
) ON COMMIT DROP;

INSERT INTO content_audit_dedupe_survivors (job_id, post_id, audit_type, survivor_id)
SELECT grouped.job_id, grouped.post_id, grouped.audit_type,
       (
         SELECT candidate.id
         FROM content_post_audits candidate
         WHERE candidate.job_id = grouped.job_id
           AND candidate.post_id = grouped.post_id
           AND candidate.audit_type = grouped.audit_type
         ORDER BY
           EXISTS (
             SELECT 1 FROM content_post_revisions draft
             WHERE draft.audit_id = candidate.id AND draft.status = 'draft'
           ) DESC,
           (
             SELECT MAX(draft.created_at) FROM content_post_revisions draft
             WHERE draft.audit_id = candidate.id AND draft.status = 'draft'
           ) DESC NULLS LAST,
           candidate.created_at DESC,
           candidate.id DESC
         LIMIT 1
       ) AS survivor_id
FROM (
  SELECT job_id, post_id, audit_type
  FROM content_post_audits
  WHERE job_id IS NOT NULL
  GROUP BY job_id, post_id, audit_type
  HAVING COUNT(*) > 1
) grouped;

UPDATE content_post_revisions revision
SET audit_id = survivor.survivor_id
FROM content_post_audits current_audit
JOIN content_audit_dedupe_survivors survivor
  ON survivor.job_id = current_audit.job_id
 AND survivor.post_id = current_audit.post_id
 AND survivor.audit_type = current_audit.audit_type
WHERE revision.audit_id = current_audit.id
  AND current_audit.id <> survivor.survivor_id;

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
  ELSE audit.status
END
WHERE audit.id IN (SELECT survivor_id FROM content_audit_dedupe_survivors);

DELETE FROM content_post_audits losing
USING content_audit_dedupe_survivors survivor
WHERE losing.job_id = survivor.job_id
  AND losing.post_id = survivor.post_id
  AND losing.audit_type = survivor.audit_type
  AND losing.id <> survivor.survivor_id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_post_audits_job_post_type
  ON content_post_audits (job_id, post_id, audit_type)
  WHERE job_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_content_post_revisions_draft_audit
  ON content_post_revisions (audit_id) WHERE audit_id IS NOT NULL AND status = 'draft';

CREATE TABLE IF NOT EXISTS content_provider_state (
  provider_name VARCHAR(80) PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error_code VARCHAR(120),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
