import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const backupModuleUrl = new URL('../scripts/backupPostgres.js', import.meta.url);

async function loadBackupModule() {
  return import(`${backupModuleUrl.href}?test=${Date.now()}`);
}

test('package.json exposes the PostgreSQL backup command', () => {
  const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts['backup:postgres'], 'node scripts/backupPostgres.js');
});

test('createBackup creates the backup directory and runs pg_dump with DB_* variables', async () => {
  const { createBackup } = await loadBackupModule();
  const tempDir = mkdtempSync(path.join(tmpdir(), 'kwd-postgres-backup-'));
  const backupDir = path.join(tempDir, 'backups', 'komplettwebdesign');
  const calls = [];

  try {
    const result = await createBackup({
      env: {
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USER: 'komplett',
        DB_PASSWORD: 'geheim',
        DB_NAME: 'komplettwebdesign',
        POSTGRES_BACKUP_DIR: backupDir
      },
      now: new Date('2026-06-19T10:20:30.000Z'),
      runCommand: async (command, args, options) => {
        calls.push({ command, args, env: options.env });
      }
    });

    assert.equal(
      result.outputFile,
      path.join(backupDir, 'komplettwebdesign-postgresql-2026-06-19T10-20-30-000Z.dump')
    );
    assert.equal(result.backupDir, backupDir);
    assert.equal(existsSync(backupDir), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, 'pg_dump');
    assert.deepEqual(calls[0].args, ['--format=custom', '--file', result.outputFile]);
    assert.equal(calls[0].env.PGHOST, 'localhost');
    assert.equal(calls[0].env.PGPORT, '5432');
    assert.equal(calls[0].env.PGUSER, 'komplett');
    assert.equal(calls[0].env.PGPASSWORD, 'geheim');
    assert.equal(calls[0].env.PGDATABASE, 'komplettwebdesign');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('createBackup uses the mounted CrucialX10 drive when the lowercase default path is absent', async () => {
  const { createBackup } = await loadBackupModule();
  const calls = [];
  const createdDirs = [];

  const fsImpl = {
    access: async (target) => {
      if (target === '/Volumes/CrucialX10') return;
      throw new Error(`missing ${target}`);
    },
    mkdir: async (target) => {
      createdDirs.push(target);
    }
  };

  const result = await createBackup({
    env: {
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'komplett',
      DB_PASSWORD: 'geheim',
      DB_NAME: 'komplettwebdesign'
    },
    fsImpl,
    now: new Date('2026-06-19T10:20:30.000Z'),
    runCommand: async (command, args, options) => {
      calls.push({ command, args, env: options.env });
    }
  });

  assert.equal(result.backupDir, '/Volumes/CrucialX10/backups/komplettwebdesign');
  assert.equal(createdDirs[0], result.backupDir);
  assert.equal(calls[0].args[2], '/Volumes/CrucialX10/backups/komplettwebdesign/komplettwebdesign-postgresql-2026-06-19T10-20-30-000Z.dump');
});

test('createBackup adds common PostgreSQL client directories to PATH for pg_dump', async () => {
  const { createBackup } = await loadBackupModule();
  const tempDir = mkdtempSync(path.join(tmpdir(), 'kwd-postgres-path-backup-'));
  const backupDir = path.join(tempDir, 'backups', 'komplettwebdesign');
  const originalPath = process.env.PATH;
  let childEnv;

  try {
    process.env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin';

    await createBackup({
      env: {
        PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USER: 'komplett',
        DB_PASSWORD: 'geheim',
        DB_NAME: 'komplettwebdesign',
        POSTGRES_BACKUP_DIR: backupDir
      },
      now: new Date('2026-06-19T10:20:30.000Z'),
      runCommand: async (command, args, options) => {
        childEnv = options.env;
      }
    });

    const pathParts = childEnv.PATH.split(path.delimiter);
    assert.equal(pathParts.includes('/opt/homebrew/bin'), true);
    assert.equal(pathParts.includes('/usr/local/bin'), true);
    assert.equal(pathParts.includes('/usr/bin'), true);
  } finally {
    process.env.PATH = originalPath;
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('createBackup parses DATABASE_URL without putting credentials into pg_dump args', async () => {
  const { createBackup } = await loadBackupModule();
  const tempDir = mkdtempSync(path.join(tmpdir(), 'kwd-postgres-url-backup-'));
  const backupDir = path.join(tempDir, 'backups', 'komplettwebdesign');
  const calls = [];

  try {
    await createBackup({
      env: {
        DATABASE_URL: 'postgresql://db_user:p%C3%A4ss@db.example.com:6543/kwd_db?sslmode=require',
        POSTGRES_BACKUP_DIR: backupDir
      },
      now: new Date('2026-06-19T10:20:30.000Z'),
      runCommand: async (command, args, options) => {
        calls.push({ command, args, env: options.env });
      }
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].args.join(' ').includes('p%C3%A4ss'), false);
    assert.equal(calls[0].args.join(' ').includes('päss'), false);
    assert.equal(calls[0].env.PGHOST, 'db.example.com');
    assert.equal(calls[0].env.PGPORT, '6543');
    assert.equal(calls[0].env.PGUSER, 'db_user');
    assert.equal(calls[0].env.PGPASSWORD, 'päss');
    assert.equal(calls[0].env.PGDATABASE, 'kwd_db');
    assert.equal(calls[0].env.PGSSLMODE, 'require');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
