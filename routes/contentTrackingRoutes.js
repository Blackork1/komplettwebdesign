import { Router } from 'express';

import { verifyCsrfToken } from '../middleware/csrf.js';

const WINDOW_MS = 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 20;

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  const host = req.get('host');
  if (!origin || !host) return res.status(403).send('Origin nicht zulässig');
  try {
    const received = new URL(origin).origin;
    const expected = `${req.protocol}://${host}`;
    if (received !== expected) return res.status(403).send('Origin nicht zulässig');
  } catch {
    return res.status(403).send('Origin nicht zulässig');
  }
  return next();
}

function sessionRateLimit(req, res, next) {
  if (!req.session) return res.status(429).send('Zu viele Anfragen');
  const currentTime = Date.now();
  const previous = req.session.contentArticleCtaRate;
  const windowStart = Number(previous?.windowStart);
  const count = Number(previous?.count);
  const activeWindow = Number.isFinite(windowStart) && currentTime - windowStart >= 0
    && currentTime - windowStart < WINDOW_MS;
  const nextRate = activeWindow
    ? { windowStart, count: Number.isFinite(count) ? count + 1 : 1 }
    : { windowStart: currentTime, count: 1 };
  req.session.contentArticleCtaRate = nextRate;
  if (nextRate.count > MAX_EVENTS_PER_WINDOW) return res.status(429).send('Zu viele Anfragen');
  return next();
}

export function createContentTrackingRouter({ attributionService } = {}) {
  if (!attributionService || typeof attributionService.recordCtaClick !== 'function') {
    throw new TypeError('Ein Dienst für die Artikelzuordnung wird benötigt.');
  }
  const router = Router();
  router.post(
    '/analytics/content-article-cta',
    requireSameOrigin,
    verifyCsrfToken,
    sessionRateLimit,
    async (req, res) => {
      try {
        await attributionService.recordCtaClick(req, req.body || {});
      } catch {
        // Trackingfehler dürfen weder Navigation noch Kontaktaufnahme beeinträchtigen.
      }
      return res.status(204).end();
    }
  );
  return router;
}

