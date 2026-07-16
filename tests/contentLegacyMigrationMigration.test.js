import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationUrl = new URL(
  '../scripts/migrations/015_create_legacy_content_migrations.sql',
  import.meta.url
);
const runner = readFileSync(
  new URL('../scripts/runContentAgentMigration.js', import.meta.url),
  'utf8'
);

test('Migration 015 legt den vollständigen Legacy-Migrationsaudit additiv an', () => {
  const migration = readFileSync(migrationUrl, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS content_legacy_migrations/i);
  for (const column of [
    'post_id',
    'status',
    'migration_class',
    'base_live_hash',
    'migrated_live_hash',
    'source_content_format',
    'source_content',
    'rendered_static_html',
    'render_context_json',
    'analysis_json',
    'blocking_issues_json',
    'sanitizer_report_json',
    'created_by',
    'approved_by',
    'rolled_back_by',
    'created_at',
    'updated_at',
    'migrated_at',
    'rolled_back_at'
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, 'i'));
  }
  assert.match(migration, /WHERE status IN \('scanned', 'ready', 'blocked'\)/i);
  assert.doesNotMatch(migration, /DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);
});

test('Migrationsrunner führt 015 direkt nach 014 aus', () => {
  assert.ok(
    runner.indexOf('015_create_legacy_content_migrations.sql')
      > runner.indexOf('014_create_existing_content_admin_preferences.sql')
  );
  assert.match(runner, /Migration 002 bis 015 erfolgreich/);
  assert.match(runner, /Migration 002 bis 015 fehlgeschlagen/);
});
