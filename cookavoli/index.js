import { createCookavoliApp } from './app.js';

const port = Number.parseInt(process.env.PORT || '3000', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new TypeError('invalid_cookavoli_port');
}

const app = createCookavoliApp();
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[cookavoli-web] listening_on=${port}`);
});

function shutdown(signal) {
  console.log(`[cookavoli-web] shutdown_signal=${signal}`);
  server.close((error) => {
    if (error) {
      console.error('[cookavoli-web] shutdown_failed', error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
