import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  new URL('../scripts/migrations/007_create_content_search_metrics.sql', import.meta.url),
  'utf8'
);
const runnerSource = readFileSync(
  new URL('../scripts/runContentAgentMigration.js', import.meta.url),
  'utf8'
);

test('Migration 007 erstellt Suchmetriken und Content-Chancen', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_search_metrics/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_opportunities/i);
  assert.match(sql, /UNIQUE \(metric_date, page_url, query, device\)/i);
});

test('Content-Chancen sind je Analyse eindeutig und auf bekannte Zustände begrenzt', () => {
  assert.match(sql, /analysis_key VARCHAR\(180\) NOT NULL UNIQUE/i);
  assert.match(
    sql,
    /opportunity_type[^;]*CHECK\s*\(opportunity_type IN \('meta_refresh', 'content_refresh'\)\)/i
  );
  assert.match(
    sql,
    /status[^;]*CHECK\s*\(status IN \('open', 'dismissed', 'resolved'\)\)/i
  );
});

test('Migrationsrunner führt 007 nach 006 und vor 008, 009 sowie 010 aus und nennt alle im Abschluss', () => {
  assert.match(
    runnerSource,
    /006_add_schedule_revisions_and_admin_review_lookup\.sql'[,\s\S]*007_create_content_search_metrics\.sql'[,\s\S]*008_expand_generated_content_metadata\.sql'[,\s\S]*009_create_content_learning_rules\.sql'[,\s\S]*010_create_weekly_topic_pools\.sql'/i
  );
  assert.match(runnerSource, /002 \+ 003 \+ 004 \+ 005 \+ 006 \+ 007 \+ 008 \+ 009 \+ 010 erfolgreich/i);
  assert.match(runnerSource, /002 \+ 003 \+ 004 \+ 005 \+ 006 \+ 007 \+ 008 \+ 009 \+ 010 fehlgeschlagen/i);
});
