import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../scripts/migrations/003_create_content_agent_admin_dashboard.sql', import.meta.url),
  'utf8'
);

test('Migration 003 ergänzt Dashboard, Revisionen, Audits und Publish-Events', () => {
  assert.match(sql, /RENAME COLUMN schedule_enabled TO agent_enabled/i);
  assert.match(sql, /operating_mode VARCHAR\(24\) NOT NULL DEFAULT 'review'/i);
  assert.match(sql, /schedule_weekdays SMALLINT\[\]/i);
  assert.match(sql, /schedule_time TIME NOT NULL DEFAULT '18:00'/i);
  assert.match(sql, /timezone VARCHAR\(80\) NOT NULL DEFAULT 'Europe\/Berlin'/i);
  assert.match(sql, /runtime_snapshot_json JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_agent_setting_revisions/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_publish_events/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_publish_events_auto_run_policy[\s\S]*run_id, policy_version[\s\S]*decision IN \('allowed', 'blocked'\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_post_audits/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_post_revisions/i);
  assert.match(sql, /revision_version INTEGER NOT NULL DEFAULT 1/i);
  assert.match(sql, /jsonb_typeof\(snapshot_json\) = 'object'/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_post_revisions_draft_audit/i);
  const repoint = sql.indexOf('UPDATE content_post_revisions revision');
  const deleteDuplicate = sql.indexOf('DELETE FROM content_post_audits duplicate');
  const uniqueAudit = sql.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS ux_content_post_audits_job_post_type');
  assert.ok(repoint > 0 && deleteDuplicate > repoint && uniqueAudit > deleteDuplicate);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_provider_state/i);
  assert.match(sql, /REFERENCES admins\(id\)/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION prevent_content_publish_event_mutation/i);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON content_publish_events/i);
  assert.match(sql, /RAISE EXCEPTION[^;]*unveränderlich/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS content_publish_events_post_id_fkey/i);
  assert.match(sql, /FOREIGN KEY \(post_id\) REFERENCES posts\(id\) ON DELETE RESTRICT/i);
});
