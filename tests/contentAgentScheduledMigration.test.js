import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../scripts/migrations/004_create_scheduled_content_review.sql',
  import.meta.url
);

test('migration 004 defines scheduled review and notification contracts', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /generation_lead_hours\s+SMALLINT[^;]*DEFAULT 4/i);
  assert.match(sql, /admin_notification_email\s+VARCHAR\(320\)[^;]*NOT NULL[^;]*kontakt@komplettwebdesign\.de/i);
  assert.match(sql, /newsletter_blog_notifications_enabled\s+BOOLEAN[^;]*DEFAULT FALSE/i);
  assert.match(sql, /review_version\s+INTEGER[^;]*DEFAULT 1/i);
  assert.match(sql, /approved_review_version\s+INTEGER/i);
  assert.match(sql, /approved_at\s+TIMESTAMPTZ/i);
  assert.match(sql, /approved_by_admin_id\s+INTEGER[^;]*REFERENCES admins\(id\)[^;]*ON DELETE SET NULL/i);
  assert.match(sql, /publication_version\s+INTEGER[^;]*DEFAULT 1/i);
  assert.match(sql, /approved_scheduled/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_notification_deliveries/i);
  assert.match(sql, /UNIQUE\s*\(idempotency_key\)/i);
});

test('migration 004 is repeatable and replaces named schema checks', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /ALTER TABLE content_agent_settings[\s\S]*ADD COLUMN IF NOT EXISTS generation_lead_hours/i);
  assert.match(sql, /ALTER TABLE posts[\s\S]*ADD COLUMN IF NOT EXISTS review_version/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS content_agent_settings_generation_lead_hours_valid/i);
  assert.match(sql, /ADD CONSTRAINT content_agent_settings_generation_lead_hours_valid[\s\S]*BETWEEN 1 AND 48/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS content_agent_settings_newsletter_gate_valid/i);
  assert.match(sql, /ADD CONSTRAINT content_agent_settings_newsletter_gate_valid/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS posts_review_versions_valid/i);
  assert.match(sql, /ADD CONSTRAINT posts_review_versions_valid/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS posts_publication_workflow_consistent/i);
  assert.match(sql, /ADD CONSTRAINT posts_publication_workflow_consistent[\s\S]*approved_scheduled/i);
});

test('migration 004 constrains and deduplicates notification deliveries', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /notification_type\s+IN\s*\(\s*'admin_review'\s*,\s*'newsletter_article'\s*\)/i);
  assert.match(sql, /status\s+IN\s*\(\s*'queued'\s*,\s*'sending'\s*,\s*'sent'\s*,\s*'failed'\s*,\s*'cancelled'\s*\)/i);
  assert.match(sql, /attempts\s+BETWEEN 0 AND 6/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS content_notification_admin_payload_valid/i);
  assert.match(sql, /ADD CONSTRAINT content_notification_admin_payload_valid[\s\S]*reviewVersion/i);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS content_notification_newsletter_payload_valid/i);
  assert.match(sql, /ADD CONSTRAINT content_notification_newsletter_payload_valid[\s\S]*publicationVersion/i);
  assert.match(sql, /migration_invalid_admin_review_payload/i);
  assert.match(sql, /migration_invalid_newsletter_article_payload/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_notification_deliveries_admin_review[\s\S]*WHERE notification_type = 'admin_review'/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_notification_deliveries_newsletter_article[\s\S]*WHERE notification_type = 'newsletter_article'/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_publish_events_scheduled_publication[\s\S]*ON content_publish_events[\s\S]*publicationVersion[\s\S]*WHERE decision = 'manual'/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_content_notification_deliveries_claim[\s\S]*WHERE status IN \('queued', 'failed'\)/i);
});
