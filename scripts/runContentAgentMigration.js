import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pool from '../util/db.js';

const MIGRATIONS = [
  './migrations/002_create_content_agent_core.sql',
  './migrations/003_create_content_agent_admin_dashboard.sql',
  './migrations/004_create_scheduled_content_review.sql',
  './migrations/005_upgrade_admin_notification_retry_index.sql',
  './migrations/006_add_schedule_revisions_and_admin_review_lookup.sql',
  './migrations/007_create_content_search_metrics.sql',
  './migrations/008_expand_generated_content_metadata.sql',
  './migrations/009_create_content_learning_rules.sql',
  './migrations/010_create_weekly_topic_pools.sql',
  './migrations/011_create_existing_post_optimization.sql',
  './migrations/012_upgrade_revision_outcome_claims.sql',
  './migrations/013_create_article_performance_learning.sql',
  './migrations/014_create_existing_content_admin_preferences.sql'
];

export async function runContentAgentMigration(db = pool) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('kwd_content_agent_migrations'))");
    for (const migration of MIGRATIONS) {
      const sql = await readFile(new URL(migration, import.meta.url), 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1]
  ? fileURLToPath(pathToFileURL(process.argv[1]))
  : null;

if (currentFile === entryFile) {
  runContentAgentMigration()
    .then(async () => {
      console.log('Content-Agent-Migration 002 bis 014 erfolgreich.');
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Content-Agent-Migration 002 bis 014 fehlgeschlagen:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}
