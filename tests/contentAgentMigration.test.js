import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { runContentAgentMigration } from '../scripts/runContentAgentMigration.js';
const runnerSource = readFileSync(new URL('../scripts/runContentAgentMigration.js', import.meta.url), 'utf8');

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

test('Migration erzwingt genau einen wiederaufnehmbaren Run pro Queuejob und repariert Bestandsduplikate', () => {
  assert.match(sql, /ROW_NUMBER\(\) OVER \(PARTITION BY job_id/i);
  assert.match(sql, /UPDATE content_runs[\s\S]*SET job_id = NULL[\s\S]*WHERE run_rank > 1/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_runs_job_id\s+ON content_runs \(job_id\)/i);
});

test('Migration synchronisiert Publikationszustände und kennt manuelle Queuezustände', () => {
  assert.match(sql, /published = TRUE[\s\S]*workflow_status = 'published'/i);
  assert.match(sql, /published = FALSE[\s\S]*workflow_status = 'published'/i);
  assert.match(sql, /posts_publication_workflow_consistent/i);
  assert.match(sql, /needs_manual_attention/i);
  assert.match(sql, /cancelled/i);
});

test('Migrationsrunner führt 002, 003 und 004 sequenziell unter einer Transaktionssperre aus', async () => {
  const queries = [];
  let released = false;
  const client = {
    async query(statement) {
      queries.push(statement);
    },
    release() {
      released = true;
    }
  };
  const db = {
    async connect() {
      return client;
    }
  };

  await runContentAgentMigration(db);

  assert.equal(queries[0], 'BEGIN');
  assert.equal(queries[1], "SELECT pg_advisory_xact_lock(hashtext('kwd_content_agent_migrations'))");
  assert.match(queries[2], /CREATE TABLE IF NOT EXISTS content_jobs/i);
  assert.match(queries[3], /CREATE TABLE IF NOT EXISTS content_publish_events/i);
  assert.match(queries[4], /CREATE TABLE IF NOT EXISTS content_notification_deliveries/i);
  assert.equal(queries[5], 'COMMIT');
  assert.equal(released, true);
});

test('Migrationsrunner benennt alle drei ausgeführten Migrationen in Statusmeldungen', () => {
  assert.match(runnerSource, /Migration 002 \+ 003 \+ 004 erfolgreich/);
  assert.match(runnerSource, /Migration 002 \+ 003 \+ 004 fehlgeschlagen/);
});
