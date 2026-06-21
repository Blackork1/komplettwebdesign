import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

export const DEFAULT_BACKUP_DRIVE = '/Volumes/CrucialX10';
export const DEFAULT_BACKUP_DRIVE_CANDIDATES = [
  DEFAULT_BACKUP_DRIVE,
  '/Volumes/Crucial X10',
  '/Volumes/crucialx10',
  '/Volumes/CruxialX10',
  '/Volumes/cruxialx10'
];
export const DEFAULT_BACKUP_SUBDIR = path.join('backups', 'komplettwebdesign');
export const POSTGRES_CLIENT_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/opt/homebrew/opt/postgresql@17/bin',
  '/opt/homebrew/opt/postgresql@16/bin',
  '/opt/homebrew/opt/libpq/bin',
  '/usr/local/opt/postgresql@17/bin',
  '/usr/local/opt/postgresql@16/bin',
  '/usr/local/opt/libpq/bin',
  '/Applications/Postgres.app/Contents/Versions/latest/bin'
];

function hasExplicitBackupDir(env) {
  return Boolean(env.POSTGRES_BACKUP_DIR || env.BACKUP_DIR);
}

function resolveExplicitBackupDrive(env) {
  return env.POSTGRES_BACKUP_DRIVE || env.BACKUP_DRIVE_PATH || null;
}

export function resolveBackupDrive(env = process.env) {
  return resolveExplicitBackupDrive(env) || DEFAULT_BACKUP_DRIVE;
}

export function resolveBackupDirectory(env = process.env) {
  if (env.POSTGRES_BACKUP_DIR || env.BACKUP_DIR) {
    return path.resolve(env.POSTGRES_BACKUP_DIR || env.BACKUP_DIR);
  }

  return path.join(resolveBackupDrive(env), DEFAULT_BACKUP_SUBDIR);
}

function normalizeVolumeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function pathExists(targetPath, fsImpl) {
  try {
    await fsImpl.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function discoverBackupDriveCandidates(fsImpl) {
  if (typeof fsImpl.readdir !== 'function') {
    return [];
  }

  try {
    const entries = await fsImpl.readdir('/Volumes');
    return entries
      .filter((entry) => ['crucialx10', 'cruxialx10'].includes(normalizeVolumeName(entry)))
      .map((entry) => path.join('/Volumes', entry));
  } catch {
    return [];
  }
}

async function resolveAvailableBackupDrive(env, fsImpl) {
  const explicitDrive = resolveExplicitBackupDrive(env);

  if (explicitDrive) {
    return explicitDrive;
  }

  const discoveredCandidates = await discoverBackupDriveCandidates(fsImpl);
  const candidates = [...new Set([...DEFAULT_BACKUP_DRIVE_CANDIDATES, ...discoveredCandidates])];

  for (const candidate of candidates) {
    if (await pathExists(candidate, fsImpl)) {
      return candidate;
    }
  }

  return DEFAULT_BACKUP_DRIVE;
}

async function resolveBackupDirectoryForRun(env, fsImpl) {
  if (env.POSTGRES_BACKUP_DIR || env.BACKUP_DIR) {
    return path.resolve(env.POSTGRES_BACKUP_DIR || env.BACKUP_DIR);
  }

  return path.join(await resolveAvailableBackupDrive(env, fsImpl), DEFAULT_BACKUP_SUBDIR);
}

export function formatBackupTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function createBackupFilename(date = new Date()) {
  return `komplettwebdesign-postgresql-${formatBackupTimestamp(date)}.dump`;
}

function decodeUrlPart(value) {
  return decodeURIComponent(value || '');
}

export function parseDatabaseUrl(databaseUrl) {
  let url;

  try {
    url = new URL(databaseUrl);
  } catch (error) {
    throw new Error(`DATABASE_URL ist ungültig: ${error.message}`);
  }

  const pgEnv = {};
  const databaseName = decodeUrlPart(url.pathname.replace(/^\//, ''));

  if (url.hostname) pgEnv.PGHOST = url.hostname;
  if (url.port) pgEnv.PGPORT = url.port;
  if (url.username) pgEnv.PGUSER = decodeUrlPart(url.username);
  if (url.password) pgEnv.PGPASSWORD = decodeUrlPart(url.password);
  if (databaseName) pgEnv.PGDATABASE = databaseName;

  const sslMode = url.searchParams.get('sslmode');
  if (sslMode) pgEnv.PGSSLMODE = sslMode;

  return pgEnv;
}

export function buildPgDumpEnvironment(env = process.env) {
  const pgEnv = {};
  const passthroughKeys = [
    'PGHOST',
    'PGPORT',
    'PGUSER',
    'PGPASSWORD',
    'PGDATABASE',
    'PGSSLMODE',
    'PGAPPNAME',
    'PGSERVICE',
    'PGPASSFILE'
  ];

  for (const key of passthroughKeys) {
    if (env[key]) pgEnv[key] = env[key];
  }

  if (env.DATABASE_URL) {
    Object.assign(pgEnv, parseDatabaseUrl(env.DATABASE_URL));
  }

  const dbVariableMap = {
    DB_HOST: 'PGHOST',
    DB_PORT: 'PGPORT',
    DB_USER: 'PGUSER',
    DB_PASSWORD: 'PGPASSWORD',
    DB_NAME: 'PGDATABASE'
  };

  for (const [source, target] of Object.entries(dbVariableMap)) {
    if (env[source]) pgEnv[target] = env[source];
  }

  if (!pgEnv.PGDATABASE) {
    throw new Error('DB_NAME, PGDATABASE oder DATABASE_URL fehlt. Ohne Datenbanknamen kann kein Backup erstellt werden.');
  }

  return pgEnv;
}

export function buildPgDumpArgs(outputFile) {
  return ['--format=custom', '--file', outputFile];
}

function uniquePathParts(parts) {
  return [...new Set(parts.filter(Boolean))];
}

export function buildPgDumpPath(env = process.env) {
  const currentPath = env.PATH || process.env.PATH || '';
  return uniquePathParts([
    ...POSTGRES_CLIENT_PATHS,
    ...currentPath.split(path.delimiter)
  ]).join(path.delimiter);
}

export function buildPgDumpProcessEnvironment(env = process.env, pgEnv = {}) {
  const baseEnv = {
    ...process.env,
    ...env
  };

  return {
    ...baseEnv,
    ...pgEnv,
    PATH: buildPgDumpPath(baseEnv)
  };
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.on('error', (error) => {
      if (error.code === 'ENOENT' && command === 'pg_dump') {
        reject(new Error('pg_dump wurde nicht gefunden. Installiere die PostgreSQL-Client-Tools und versuche es erneut.'));
        return;
      }

      reject(error);
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const suffix = signal ? ` (Signal: ${signal})` : '';
      reject(new Error(`${command} wurde mit Exit-Code ${code} beendet${suffix}.`));
    });
  });
}

async function ensureBackupDirectory(backupDir, env, fsImpl) {
  if (!hasExplicitBackupDir(env)) {
    const drive = path.resolve(backupDir, '..', '..');

    try {
      await fsImpl.access(drive);
    } catch {
      throw new Error(`Die Backup-Festplatte wurde nicht gefunden: ${drive}. Bitte mounte CrucialX10 oder setze POSTGRES_BACKUP_DIR.`);
    }
  }

  await fsImpl.mkdir(backupDir, { recursive: true });
}

export async function createBackup({
  env = process.env,
  now = new Date(),
  fsImpl = fs,
  runCommand: runBackupCommand = runCommand,
  onBeforeDump = () => {}
} = {}) {
  const backupDir = await resolveBackupDirectoryForRun(env, fsImpl);
  const outputFile = path.join(backupDir, createBackupFilename(now));
  const pgEnv = buildPgDumpEnvironment(env);

  await ensureBackupDirectory(backupDir, env, fsImpl);
  await onBeforeDump({ backupDir, outputFile });
  await runBackupCommand('pg_dump', buildPgDumpArgs(outputFile), {
    env: buildPgDumpProcessEnvironment(env, pgEnv),
    stdio: 'inherit'
  });

  return { backupDir, outputFile };
}

export async function main() {
  dotenv.config();

  try {
    const result = await createBackup({
      onBeforeDump: ({ outputFile }) => {
        console.log(`Starte PostgreSQL-Backup nach: ${outputFile}`);
      }
    });

    console.log(`Backup erstellt: ${result.outputFile}`);
  } catch (error) {
    console.error(`Backup fehlgeschlagen: ${error.message}`);
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : null;

if (entryFile === currentFile) {
  main();
}
