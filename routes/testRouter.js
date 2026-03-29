import express from 'express';
import {
  confirmWebsiteAuditLead,
  getCachedWebsiteAudit,
  runWebsiteAudit,
  runWebsiteAuditLead,
  testPage
} from '../controllers/testController.js';

const router = express.Router();
const RATE_LIMIT_MAX = 5;
const LEAD_RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const auditRateLimitMap = new Map();
const leadRateLimitMap = new Map();

function getClientIp(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return forwarded || req.ip || req.connection?.remoteAddress || 'unknown';
}

function pruneRateLimit(now = Date.now()) {
  for (const [key, entry] of auditRateLimitMap.entries()) {
    if (!entry || entry.expiresAt <= now) {
      auditRateLimitMap.delete(key);
    }
  }
  for (const [key, entry] of leadRateLimitMap.entries()) {
    if (!entry || entry.expiresAt <= now) {
      leadRateLimitMap.delete(key);
    }
  }
}

function websiteAuditRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateLimit(now);

  const key = getClientIp(req);
  const record = auditRateLimitMap.get(key) || { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.expiresAt <= now) {
    record.count = 0;
    record.expiresAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Zu viele Analysen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.'
    });
  }

  record.count += 1;
  auditRateLimitMap.set(key, record);
  return next();
}

function websiteAuditLeadRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateLimit(now);

  const key = getClientIp(req);
  const record = leadRateLimitMap.get(key) || { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.expiresAt <= now) {
    record.count = 0;
    record.expiresAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (record.count >= LEAD_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Zu viele Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.'
    });
  }

  record.count += 1;
  leadRateLimitMap.set(key, record);
  return next();
}

router.get('/test', (_req, res) => res.redirect(302, '/website-tester'));
router.get('/en/test', (_req, res) => res.redirect(302, '/en/website-tester'));
router.get('/website-tester', (req, res) => {
  req.params.lng = 'de';
  return testPage(req, res);
});
router.get('/en/website-tester', (req, res) => {
  req.params.lng = 'en';
  return testPage(req, res);
});
router.post('/api/website-audit', websiteAuditRateLimit, runWebsiteAudit);
router.post('/api/website-audit/lead', websiteAuditLeadRateLimit, runWebsiteAuditLead);
router.get('/api/website-audit/:auditId', getCachedWebsiteAudit);
router.get('/website-tester/report-confirm', (req, res) => {
  req.params.lng = 'de';
  return confirmWebsiteAuditLead(req, res);
});
router.get('/en/website-tester/report-confirm', (req, res) => {
  req.params.lng = 'en';
  return confirmWebsiteAuditLead(req, res);
});

export default router;
