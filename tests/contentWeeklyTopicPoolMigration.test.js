import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../scripts/migrations/010_create_weekly_topic_pools.sql',
  import.meta.url
);

test('Migration 010 legt eindeutige Wochenpools und idempotente Themenbeanspruchungen an', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_weekly_topic_pools/i);
  assert.match(sql, /UNIQUE \(week_start, timezone\)/i);
  assert.match(sql, /candidates_json JSONB NOT NULL/i);
  assert.match(sql, /source_references_json JSONB NOT NULL/i);
  assert.match(sql, /jsonb_array_length\(source_references_json\) BETWEEN 2 AND 6/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_weekly_topic_research_attempts/i);
  assert.match(sql, /PRIMARY KEY \(week_start, timezone\)/i);
  assert.match(sql, /owner_generation_run_id BIGINT NOT NULL REFERENCES content_runs\(id\)/i);
  assert.match(sql, /status IN \('reserved', 'completed', 'needs_manual_attention'\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_weekly_topic_pool_selections/i);
  assert.match(sql, /PRIMARY KEY \(pool_id, candidate_slug\)/i);
  assert.match(sql, /generation_run_id BIGINT NOT NULL UNIQUE REFERENCES content_runs\(id\)/i);
  assert.doesNotMatch(sql, /DROP\s+(?:TABLE|COLUMN)/i);
});

test('Migrationsrunner führt Migration 010 direkt nach Migration 009 aus', async () => {
  const source = await readFile(
    new URL('../scripts/runContentAgentMigration.js', import.meta.url),
    'utf8'
  );
  const migration009 = source.indexOf('009_create_content_learning_rules.sql');
  const migration010 = source.indexOf('010_create_weekly_topic_pools.sql');

  assert.ok(migration009 >= 0);
  assert.ok(migration010 > migration009);
  assert.match(source, /Migration 002 bis 015 erfolgreich/);
});
