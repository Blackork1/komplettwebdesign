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
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_search_metric_sync_days/i);
  assert.match(sql, /metric_date DATE PRIMARY KEY/i);
  assert.match(sql, /evaluation_claim_token UUID/i);
  assert.match(sql, /evaluation_claimed_at TIMESTAMPTZ/i);
});

test('Migration 011 bereinigt Mehrfach-Drafts postweit vor dem eindeutigen Index und erhält Audits', async () => {
  const sql = await readFile(
    new URL('../scripts/migrations/011_create_existing_post_optimization.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /ROW_NUMBER\(\) OVER\s*\(\s*PARTITION BY revision\.post_id/i);
  assert.match(
    sql,
    /ORDER BY revision\.updated_at DESC,\s*revision\.created_at DESC,\s*revision\.id DESC/i
  );
  assert.match(sql, /SET status = 'rejected',\s*revision_version = revision\.revision_version \+ 1/i);
  assert.match(sql, /UPDATE content_post_audits audit[\s\S]*SET status = CASE/i);
  assert.match(sql, /WHEN EXISTS \([\s\S]*status = 'draft'[\s\S]*\) THEN 'revision_created'/i);
  assert.match(sql, /ELSE 'open'/i);
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_post_revisions_draft_post\s+ON content_post_revisions \(post_id\)\s+WHERE status = 'draft'/i
  );
  const dedupe = sql.indexOf('WITH ranked_post_drafts');
  const auditRepair = sql.indexOf('UPDATE content_post_audits audit');
  const uniqueIndex = sql.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS ux_content_post_revisions_draft_post');
  assert.ok(dedupe >= 0 && dedupe < auditRepair && auditRepair < uniqueIndex);
});
