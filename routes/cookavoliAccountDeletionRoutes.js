import express from 'express';

function jsonRoute(handler, invalidCode) {
  return async (req, res) => {
    try {
      const result = await handler(req.body);
      res.status(result.status).json(result.body);
    } catch (error) {
      if (error?.status === 400) {
        res.status(400).json({ error: invalidCode });
        return;
      }
      if (error?.status === 429) {
        res.status(429).json({
          error: 'swipeandcook_deletion_temporarily_unavailable'
        });
        return;
      }
      res.status(503).json({
        error: 'swipeandcook_deletion_service_unavailable'
      });
    }
  };
}

function createRateLimiter({ limit = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const existing = clients.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;
    entry.count += 1;
    clients.set(key, entry);
    if (entry.count > limit) {
      res.status(429).json({
        error: 'swipeandcook_deletion_temporarily_unavailable'
      });
      return;
    }
    next();
  };
}

export function createCookavoliAccountDeletionRouter({
  gateway,
  csrfMiddleware,
  rateLimitMiddleware = createRateLimiter()
}) {
  if (
    typeof gateway?.start !== 'function'
    || typeof gateway?.verify !== 'function'
    || typeof csrfMiddleware !== 'function'
    || typeof rateLimitMiddleware !== 'function'
  ) {
    throw new TypeError('cookavoli_deletion_router_dependencies_required');
  }

  const router = express.Router();
  router.post(
    '/api/account-deletion-requests',
    rateLimitMiddleware,
    csrfMiddleware,
    jsonRoute(
      (body) => gateway.start(body),
      'invalid_external_deletion_request'
    )
  );
  router.post(
    '/api/account-deletion-verifications',
    rateLimitMiddleware,
    csrfMiddleware,
    jsonRoute(
      (body) => gateway.verify(body),
      'invalid_or_expired_deletion_verification'
    )
  );
  return router;
}
