import { fileURLToPath, pathToFileURL } from 'node:url';
import pool from '../util/db.js';

export async function checkWorkerHeartbeat(database = pool) {
  const { rows } = await database.query(
    `
      SELECT heartbeat_at >= NOW() - INTERVAL '90 seconds' AS fresh
      FROM content_worker_state
      WHERE worker_name = $1
    `,
    ['content-worker']
  );
  return rows[0]?.fresh === true;
}

export async function runWorkerHealthcheck({
  database = pool,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  try {
    const fresh = await checkWorkerHeartbeat(database);
    stdout.write(fresh
      ? 'Content-Worker ist gesund.\n'
      : 'Content-Worker-Heartbeat ist nicht aktuell.\n');
    return fresh ? 0 : 1;
  } catch {
    stderr.write('Content-Worker-Healthcheck fehlgeschlagen.\n');
    return 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : null;

if (currentFile === entryFile) {
  runWorkerHealthcheck()
    .then((code) => {
      process.exitCode = code;
    })
    .finally(() => pool.end().catch(() => {}));
}
