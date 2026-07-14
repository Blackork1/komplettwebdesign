import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Migration 011 schützt aktive Bestandsoptimierungen und speichert GSC-Outcomes', async () => {
  const sql = await readFile(new URL('../scripts/migrations/011_create_existing_post_optimization.sql', import.meta.url), 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS optimization_job_id BIGINT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS optimization_report_json JSONB/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_jobs_active_existing_optimization/i);
  assert.match(sql, /payload_json\s*->>\s*'post_id'/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_revision_optimization_outcomes/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_revision_optimization_feedback/i);
  assert.match(sql, /baseline_metrics_json JSONB NOT NULL/i);
  assert.match(sql, /followup_metrics_json JSONB/i);
  assert.match(sql, /feedback_json JSONB NOT NULL/i);
});
