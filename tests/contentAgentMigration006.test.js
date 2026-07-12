import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../scripts/migrations/006_add_schedule_revisions_and_admin_review_lookup.sql', import.meta.url);

test('Migration 006 ist additiv, idempotent und versioniert Zeitpläne mit eigenem Wirksamkeitszeitpunkt', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS schedule_revision\s+BIGINT/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_agent_schedule_revisions/i);
  assert.match(sql, /effective_at\s+TIMESTAMPTZ\s+NOT NULL/i);
  assert.match(sql, /schedule_weekdays[\s\S]*schedule_time[\s\S]*timezone[\s\S]*generation_lead_hours/i);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test('Migration 006 ergänzt exakt den LATERAL-kompatiblen neuesten Admin-Review-Index', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_content_notification_deliveries_post_type_latest/i);
  assert.match(sql, /\(\s*post_id\s*,\s*notification_type\s*,\s*created_at DESC\s*,\s*id DESC\s*\)/i);
  assert.doesNotMatch(sql, /DROP INDEX/i);
});

test('Migrationsrunner führt 006 nach 005 aus und meldet sie im Abschluss', async () => {
  const source = await readFile(new URL('../scripts/runContentAgentMigration.js', import.meta.url), 'utf8');
  assert.match(source, /005_upgrade_admin_notification_retry_index\.sql'[\s\S]*006_add_schedule_revisions_and_admin_review_lookup\.sql'/i);
  assert.match(source, /002 \+ 003 \+ 004 \+ 005 \+ 006 erfolgreich/i);
});
