import { spawn } from 'node:child_process';

const processes = [
  spawn(process.execPath, ['scripts/buildCssAssets.js', '--watch'], {
    stdio: 'inherit',
  }),
  spawn(process.execPath, ['index.js'], {
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    stdio: 'inherit',
  }),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(code), 250);
}

for (const child of processes) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (code === 0 || signal === 'SIGTERM') return;
    shutdown(code || 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
