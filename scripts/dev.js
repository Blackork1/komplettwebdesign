import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const restartExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.ejs']);
const ignoredPathParts = new Set(['node_modules', '.git', 'public/css', 'public/uploads']);
const serverWatchTargets = [
  'index.js',
  'app.js',
  'config',
  'controllers',
  'data',
  'db',
  'middleware',
  'models',
  'repositories',
  'routes',
  'services',
  'util',
  'views',
];

const cssProcess = spawn(process.execPath, ['scripts/buildCssAssets.js', '--watch'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

let serverProcess = null;
let shuttingDown = false;
let restartingServer = false;
let restartTimer = null;
const watchers = [];

function startServer() {
  serverProcess = spawn(process.execPath, ['index.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    stdio: 'inherit',
  });

  serverProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (restartingServer) {
      restartingServer = false;
      startServer();
      return;
    }

    if (code === 0 || signal === 'SIGTERM') return;
    shutdown(code || 1);
  });
}

function isIgnoredPath(relativePath) {
  return [...ignoredPathParts].some((part) => relativePath === part || relativePath.startsWith(`${part}/`));
}

function shouldRestartForChange(watchTarget, filename) {
  const changedPath = filename ? path.join(watchTarget, filename.toString()) : watchTarget;
  const normalizedPath = changedPath.split(path.sep).join('/');
  if (isIgnoredPath(normalizedPath)) return false;

  const extension = path.extname(normalizedPath);
  return restartExtensions.has(extension);
}

function scheduleServerRestart(reason) {
  if (shuttingDown || !serverProcess) return;

  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (shuttingDown || !serverProcess) return;
    restartingServer = true;
    console.log(`\nServer-Neustart wegen Änderung an ${reason}`);
    serverProcess.kill('SIGTERM');
  }, 120);
}

function watchServerFiles() {
  for (const target of serverWatchTargets) {
    const absoluteTarget = path.join(projectRoot, target);
    if (!existsSync(absoluteTarget)) continue;

    try {
      const watcher = watch(absoluteTarget, { recursive: true }, (_eventType, filename) => {
        if (!shouldRestartForChange(target, filename)) return;
        scheduleServerRestart(filename ? path.join(target, filename.toString()) : target);
      });
      watcher.on('error', (error) => {
        console.warn(`Watcher für ${target} wurde beendet: ${error.message}`);
      });
      watchers.push(watcher);
    } catch (error) {
      console.warn(`${target} konnte nicht beobachtet werden: ${error.message}`);
    }
  }
}

startServer();
watchServerFiles();

const processes = [cssProcess];

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  clearTimeout(restartTimer);
  for (const watcher of watchers) watcher.close();

  for (const child of processes) {
    if (!child.killed) child.kill('SIGTERM');
  }

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }

  setTimeout(() => process.exit(code), 250);
}

cssProcess.on('exit', (code, signal) => {
  if (shuttingDown) return;
  if (code === 0 || signal === 'SIGTERM') return;
  shutdown(code || 1);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
