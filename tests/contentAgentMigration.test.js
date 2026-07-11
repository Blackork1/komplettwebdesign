import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../scripts/migrations/002_create_content_agent_core.sql', import.meta.url),
  'utf8'
);

test('content agent migration is additive', () => {
  assert.match(sql, /ALTER TABLE posts ADD COLUMN IF NOT EXISTS workflow_status/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS content_format/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_jobs/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_runs/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_topics/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_post_metadata/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_agent_settings/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_worker_state/i);
  assert.match(sql, /UNIQUE \(idempotency_key\)/i);
});

test('content agent migration ergänzt idempotente generation_run_id-Verknüpfungen nach content_runs', () => {
  const runsPosition = sql.search(/CREATE TABLE IF NOT EXISTS content_runs/i);
  const topicAlterPosition = sql.search(/ALTER TABLE content_topics\s+ADD COLUMN IF NOT EXISTS generation_run_id BIGINT REFERENCES content_runs\(id\) ON DELETE SET NULL/i);
  const postAlterPosition = sql.search(/ALTER TABLE posts\s+ADD COLUMN IF NOT EXISTS generation_run_id BIGINT REFERENCES content_runs\(id\) ON DELETE SET NULL/i);

  assert.equal(runsPosition >= 0, true);
  assert.equal(topicAlterPosition > runsPosition, true);
  assert.equal(postAlterPosition > runsPosition, true);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_topics_generation_run_id\s+ON content_topics \(generation_run_id\)/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_posts_generation_run_id\s+ON posts \(generation_run_id\)/i);
  assert.doesNotMatch(sql, /generation_run_id[^;]*NOT NULL/i);
});
