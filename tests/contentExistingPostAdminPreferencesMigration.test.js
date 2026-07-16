import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationUrl = new URL(
  '../scripts/migrations/014_create_existing_content_admin_preferences.sql',
  import.meta.url
);
const runner = readFileSync(
  new URL('../scripts/runContentAgentMigration.js', import.meta.url),
  'utf8'
);

test('Migration 014 erstellt nur additive Adminpräferenzen', () => {
  const sql = readFileSync(migrationUrl, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_existing_post_admin_preferences/i);
  assert.match(sql, /post_id INTEGER PRIMARY KEY REFERENCES posts\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /hidden_from_zero_impression_list BOOLEAN NOT NULL DEFAULT FALSE/i);
  assert.match(sql, /created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i);
  assert.match(sql, /updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i);
  assert.doesNotMatch(sql, /DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);
});

test('Runner führt 014 direkt nach 013 aus und meldet 002 bis 015', () => {
  assert.ok(runner.indexOf('014_create_existing_content_admin_preferences.sql')
    > runner.indexOf('013_create_article_performance_learning.sql'));
  assert.match(runner, /Migration 002 bis 015 erfolgreich/);
  assert.match(runner, /Migration 002 bis 015 fehlgeschlagen/);
});
