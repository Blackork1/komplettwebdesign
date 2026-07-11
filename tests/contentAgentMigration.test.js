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
