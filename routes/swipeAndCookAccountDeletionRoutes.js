import express from 'express';

import { verifyCsrfToken } from '../middleware/csrf.js';

function jsonRoute(handler, invalidCode) {
  return async (req, res) => {
    try {
      const result = await handler(req.body);
      res.status(result.status).json(result.body);
    } catch (error) {
      const status = Number.isInteger(error?.status)
        ? error.status
        : 503;
      if (status === 400) {
        res.status(400).json({ error: invalidCode });
        return;
      }
      if (status === 429) {
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

export function createSwipeAndCookAccountDeletionRouter({
  gateway,
  csrfMiddleware = verifyCsrfToken
}) {
  if (
    typeof gateway?.start !== 'function'
    || typeof gateway?.verify !== 'function'
    || typeof csrfMiddleware !== 'function'
  ) {
    throw new TypeError(
      'swipeandcook_deletion_router_dependencies_required'
    );
  }

  const router = express.Router();
  router.post(
    '/api/swipeandcook/account-deletion-requests',
    csrfMiddleware,
    jsonRoute(
      (body) => gateway.start(body),
      'invalid_external_deletion_request'
    )
  );
  router.post(
    '/api/swipeandcook/account-deletion-verifications',
    csrfMiddleware,
    jsonRoute(
      (body) => gateway.verify(body),
      'invalid_or_expired_deletion_verification'
    )
  );
  return router;
}
