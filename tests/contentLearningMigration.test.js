import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../scripts/migrations/009_create_content_learning_rules.sql',
  import.meta.url
);

test('Migration 009 legt die vollständige, revisionssichere Lernstruktur an', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  for (const table of [
    'content_learning_observations',
    'content_learning_classifications',
    'content_learning_rule_proposals',
    'content_learning_rules',
    'content_learning_rule_versions',
    'content_learning_events'
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
  }
  assert.match(sql, /REFERENCES posts\s*\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /REFERENCES admins\s*\(id\) ON DELETE SET NULL/i);
  assert.match(sql, /CHECK \(status IN \('pending', 'approved', 'rejected', 'superseded'\)\)/i);
  assert.match(sql, /CHECK \(status IN \('active', 'paused', 'disabled'\)\)/i);
  assert.match(sql, /rule_revision INTEGER NOT NULL DEFAULT 1/i);
});

test('Migration 009 zählt bekannte Kategorien und unbekannte Fingerabdrücke je Artikel nur einmal', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_learning_observation_category[\s\S]*?\(post_id, category_key\)[\s\S]*?WHERE category_key <> 'unclassified'/i
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_learning_observation_unclassified[\s\S]*?\(post_id, fingerprint\)[\s\S]*?WHERE category_key = 'unclassified'/i
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS ux_content_learning_pending_category[\s\S]*?\(category_key\)[\s\S]*?WHERE status = 'pending'/i
  );
});

test('der Migrationsrunner führt Migration 009 nach Migration 008 aus', async () => {
  const source = await readFile(
    new URL('../scripts/runContentAgentMigration.js', import.meta.url),
    'utf8'
  );
  const migration008 = source.indexOf('008_expand_generated_content_metadata.sql');
  const migration009 = source.indexOf('009_create_content_learning_rules.sql');
  assert.ok(migration008 >= 0);
  assert.ok(migration009 > migration008);
  assert.match(source, /Migration 002 bis 014 erfolgreich/);
});
