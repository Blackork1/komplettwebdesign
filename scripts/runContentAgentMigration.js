import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pool from '../util/db.js';

const MIGRATIONS = [
  './migrations/002_create_content_agent_core.sql',
  './migrations/003_create_content_agent_admin_dashboard.sql'
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
      console.log('Content-Agent-Migration 002 + 003 erfolgreich.');
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Content-Agent-Migration 002 + 003 fehlgeschlagen:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}
