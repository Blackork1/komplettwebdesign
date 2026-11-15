import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';

import { createCookavoliAccountDeletionRouter } from '../routes/cookavoliAccountDeletionRoutes.js';
import { createCookavoliStaticPagesRouter } from '../routes/cookavoliStaticPages.js';
import { createCookavoliAccountDeletionGateway } from '../services/cookavoliAccountDeletionGateway.js';
import { loadCookavoliLegalPage } from '../services/cookavoliLegalContentService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const canonicalOrigin = 'https://cookavoli.com';
const redirectHosts = new Set([
  'www.cookavoli.com',
  'cookavoli.de',
  'www.cookavoli.de'
]);

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function requestHost(req) {
  return firstHeaderValue(req.get('x-forwarded-host') || req.get('host'))
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function isHttps(req) {
  return firstHeaderValue(req.get('x-forwarded-proto') || req.protocol)
    .toLowerCase() === 'https';
}

function safeOriginalUrl(req) {
  const value = String(req.originalUrl || '/');
  return value.startsWith('/') && !/[\r\n]/.test(value) ? value : '/';
}

function secureHeaders(req, res, next) {
  const nonce = randomBytes(18).toString('base64');
  res.locals.cspNonce = nonce;
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self'",
    'upgrade-insecure-requests'
  ].join('; '));
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (isHttps(req)) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  next();
}

function createHostGuard(nodeEnv) {
  return (req, res, next) => {
    const host = requestHost(req);
    if (host === 'cookavoli.com') return next();
    if (redirectHosts.has(host)) {
      res.redirect(308, `${canonicalOrigin}${safeOriginalUrl(req)}`);
      return;
    }
    if (
      nodeEnv !== 'production'
      && (host === '127.0.0.1' || host === 'localhost')
    ) {
      return next();
    }
    res.status(421).type('text/plain').send('Misdirected Request');
  };
}

function createCsrfProtection(secret) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new TypeError('cookavoli_cookie_secret_required');
  }
  const cookieName = 'cookavoli_csrf';

  function attach(req, res, next) {
    let token = req.signedCookies?.[cookieName];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      token = randomBytes(32).toString('hex');
      res.cookie(cookieName, token, {
        signed: true,
        httpOnly: true,
        secure: isHttps(req),
        sameSite: 'lax',
        path: '/',
        maxAge: 2 * 60 * 60 * 1000
      });
    }
    res.locals.csrfToken = token;
    next();
  }

  function verify(req, res, next) {
    const expected = req.signedCookies?.[cookieName];
    const received = String(req.get('x-csrf-token') || req.body?._csrf || '');
    if (typeof expected !== 'string' || !received) {
      res.status(403).json({ error: 'csrf_token_invalid' });
      return;
    }
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (
      expectedBuffer.length !== receivedBuffer.length
      || !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      res.status(403).json({ error: 'csrf_token_invalid' });
      return;
    }
    next();
  }

  return { attach, verify };
}

export function createCookavoliApp({
  csrfSecret = process.env.COOKAVOLI_COOKIE_SECRET,
  deletionGateway,
  accountDeletionEnabled = process.env.COOKAVOLI_ACCOUNT_DELETION_ENABLED === 'true',
  nodeEnv = process.env.NODE_ENV || 'development'
} = {}) {
  if (typeof accountDeletionEnabled !== 'boolean') {
    throw new TypeError('invalid_cookavoli_account_deletion_flag');
  }
  const app = express();
  const csrf = accountDeletionEnabled
    ? createCsrfProtection(csrfSecret)
    : null;
  const gateway = accountDeletionEnabled
    ? deletionGateway || createCookavoliAccountDeletionGateway({
      apiBaseUrl: process.env.COOKAVOLI_API_BASE_URL
    })
    : null;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(projectRoot, 'views'));

  app.use(compression());
  app.use(secureHeaders);
  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok', service: 'cookavoli-web' });
  });
  app.use(createHostGuard(nodeEnv));

  app.use('/assets', express.static(
    path.join(projectRoot, 'public', 'cookavoli'),
    nodeEnv === 'production'
      ? { immutable: true, maxAge: '7d', index: false }
      : { maxAge: 0, index: false }
  ));
  app.get('/manifest.webmanifest', (_req, res) => {
    res.type('application/manifest+json').sendFile(
      path.join(projectRoot, 'public', 'cookavoli', 'manifest.webmanifest')
    );
  });

  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use(express.json({ limit: '16kb' }));
  if (accountDeletionEnabled) {
    app.use(cookieParser(csrfSecret));
    app.use(csrf.attach);
  }
  app.use((req, res, next) => {
    res.locals.siteUrl = canonicalOrigin;
    res.locals.currentPathname = req.path;
    res.locals.robots = 'index, follow';
    res.locals.currentYear = new Date().getFullYear();
    res.locals.accountDeletionEnabled = accountDeletionEnabled;
    next();
  });

  if (accountDeletionEnabled) {
    app.use(createCookavoliAccountDeletionRouter({
      gateway,
      csrfMiddleware: csrf.verify
    }));
  }
  app.use(createCookavoliStaticPagesRouter({
    loadLegalPage: loadCookavoliLegalPage
  }));

  app.use((_req, res) => {
    const description = 'Die angeforderte Cookavoli-Seite wurde nicht gefunden.';
    res.status(404).render('cookavoli/not-found', {
      title: 'Seite nicht gefunden | Cookavoli',
      description,
      canonicalPath: null,
      robots: 'noindex, nofollow',
      schema: null
    });
  });

  app.use((error, _req, res, _next) => {
    console.error('[cookavoli-web] request_failed', error?.message || error);
    if (res.headersSent) return;
    const description = 'Cookavoli konnte diese Anfrage gerade nicht verarbeiten.';
    res.status(500).render('cookavoli/not-found', {
      title: 'Technischer Fehler | Cookavoli',
      heading: 'Das hat nicht funktioniert.',
      description,
      canonicalPath: null,
      robots: 'noindex, nofollow',
      schema: null
    });
  });

  return app;
}
