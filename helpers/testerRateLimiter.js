// helpers/testerRateLimiter.js
//
// Zentrale Rate-Limiter-Factory für alle Website-Tester-Endpoints.
// Ersetzt 9+ nahezu identische Limiter im testRouter.js.
//
// Nutzung:
//   import { createTesterRateLimiter } from '../helpers/testerRateLimiter.js';
//   const limit = createTesterRateLimiter({
//     max: 5,
//     windowMs: 15 * 60 * 1000,
//     messageDe: 'Zu viele SEO-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
//     messageEn: 'Too many SEO scans in a short period. Please try again in a few minutes.'
//   });
//   router.post('/api/seo-audit', limit, runSeoAudit);

function getClientIp(req) {
  // req.ip wertet trust-proxy aus – das ist die richtige Quelle hinter Proxy.
  // Als Fallback wird x-forwarded-for / connection-remoteAddress berücksichtigt.
  if (req.ip && req.ip !== '::ffff:127.0.0.1') {
    return String(req.ip);
  }
  const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return forwarded || req.connection?.remoteAddress || 'unknown';
}

function pickLocaleFromRequest(req) {
  const queryLng = String(req.query?.lng || '').toLowerCase();
  const bodyLocale = String(req.body?.locale || '').toLowerCase();
  const paramLng = String(req.params?.lng || '').toLowerCase();
  const picked = queryLng || bodyLocale || paramLng;
  return picked === 'en' ? 'en' : 'de';
}

/**
 * Erzeugt einen Express-Middleware-Rate-Limiter pro Client-IP.
 * Nutzt einen prozessweiten In-Memory-Store. Jeder Aufruf von
 * createTesterRateLimiter legt einen eigenen Store an (Endpoints
 * teilen sich ihre Kontingente also nicht).
 *
 * @param {Object} opts
 * @param {number} opts.max              Max. Requests im Zeitfenster
 * @param {number} opts.windowMs         Fenstergröße in ms
 * @param {string} [opts.messageDe]      Fehlermeldung (deutsch)
 * @param {string} [opts.messageEn]      Fehlermeldung (englisch)
 * @returns {import('express').RequestHandler}
 */
export function createTesterRateLimiter({
  max = 5,
  windowMs = 15 * 60 * 1000,
  messageDe = 'Zu viele Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  messageEn = 'Too many requests in a short period. Please try again in a few minutes.'
} = {}) {
  const store = new Map();
  let lastPrune = Date.now();

  function prune(now) {
    // Nur alle 60 s aufräumen, damit es nicht zum Hotpath wird.
    if (now - lastPrune < 60 * 1000) return;
    lastPrune = now;
    for (const [key, entry] of store.entries()) {
      if (!entry || entry.expiresAt <= now) store.delete(key);
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    prune(now);

    const key = getClientIp(req);
    const record = store.get(key) || { count: 0, expiresAt: now + windowMs };

    if (record.expiresAt <= now) {
      record.count = 0;
      record.expiresAt = now + windowMs;
    }

    if (record.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
      const locale = pickLocaleFromRequest(req);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message: locale === 'en' ? messageEn : messageDe
      });
    }

    record.count += 1;
    store.set(key, record);
    return next();
  };
}

export default createTesterRateLimiter;
