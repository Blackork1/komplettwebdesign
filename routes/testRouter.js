import express from 'express';
import {
  brokenLinksTestPage,
  confirmGeoAuditLead,
  confirmSeoAuditLead,
  confirmWebsiteAuditLead,
  geoTestPage,
  seoTestPage,
  getCachedWebsiteAudit,
  runBrokenLinkAudit,
  runGeoAudit,
  runGeoAuditLead,
  runSeoAudit,
  runSeoAuditLead,
  runWebsiteAudit,
  runWebsiteAuditLead,
  testPage
} from '../controllers/testController.js';

const router = express.Router();
const RATE_LIMIT_MAX = 5;
const LEAD_RATE_LIMIT_MAX = 5;
const BROKEN_RATE_LIMIT_MAX = 5;
const GEO_RATE_LIMIT_MAX = 5;
const GEO_LEAD_RATE_LIMIT_MAX = 5;
const SEO_RATE_LIMIT_MAX = 5;
const SEO_LEAD_RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const auditRateLimitMap = new Map();
const leadRateLimitMap = new Map();
const brokenRateLimitMap = new Map();
const geoRateLimitMap = new Map();
const geoLeadRateLimitMap = new Map();
const seoRateLimitMap = new Map();
const seoLeadRateLimitMap = new Map();

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
  for (const [key, entry] of brokenRateLimitMap.entries()) {
    if (!entry || entry.expiresAt <= now) {
      brokenRateLimitMap.delete(key);
    }
  }
  for (const [key, entry] of geoRateLimitMap.entries()) {
    if (!entry || entry.expiresAt <= now) {
      geoRateLimitMap.delete(key);
    }
  }
  for (const [key, entry] of geoLeadRateLimitMap.entries()) {
    if (!entry || entry.expiresAt <= now) {
      geoLeadRateLimitMap.delete(key);
    }
  }
  for (const [key, entry] of seoRateLimitMap.entries()) {
    if (!entry || entry.expiresAt <= now) {
      seoRateLimitMap.delete(key);
    }
  }
  for (const [key, entry] of seoLeadRateLimitMap.entries()) {
    if (!entry || entry.expiresAt <= now) {
      seoLeadRateLimitMap.delete(key);
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

function brokenLinkAuditRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateLimit(now);

  const key = getClientIp(req);
  const record = brokenRateLimitMap.get(key) || { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.expiresAt <= now) {
    record.count = 0;
    record.expiresAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (record.count >= BROKEN_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Zu viele Broken-Link-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.'
    });
  }

  record.count += 1;
  brokenRateLimitMap.set(key, record);
  return next();
}

function geoAuditRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateLimit(now);

  const key = getClientIp(req);
  const record = geoRateLimitMap.get(key) || { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.expiresAt <= now) {
    record.count = 0;
    record.expiresAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (record.count >= GEO_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Zu viele GEO-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.'
    });
  }

  record.count += 1;
  geoRateLimitMap.set(key, record);
  return next();
}

function geoAuditLeadRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateLimit(now);

  const key = getClientIp(req);
  const record = geoLeadRateLimitMap.get(key) || { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.expiresAt <= now) {
    record.count = 0;
    record.expiresAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (record.count >= GEO_LEAD_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Zu viele GEO-Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.'
    });
  }

  record.count += 1;
  geoLeadRateLimitMap.set(key, record);
  return next();
}

function seoAuditRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateLimit(now);

  const key = getClientIp(req);
  const record = seoRateLimitMap.get(key) || { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.expiresAt <= now) {
    record.count = 0;
    record.expiresAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (record.count >= SEO_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Zu viele SEO-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.'
    });
  }

  record.count += 1;
  seoRateLimitMap.set(key, record);
  return next();
}

function seoAuditLeadRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateLimit(now);

  const key = getClientIp(req);
  const record = seoLeadRateLimitMap.get(key) || { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };

  if (record.expiresAt <= now) {
    record.count = 0;
    record.expiresAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (record.count >= SEO_LEAD_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Zu viele SEO-Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.'
    });
  }

  record.count += 1;
  seoLeadRateLimitMap.set(key, record);
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
router.get('/website-tester/broken-links', (req, res) => {
  req.params.lng = 'de';
  return brokenLinksTestPage(req, res);
});
router.get('/en/website-tester/broken-links', (req, res) => {
  req.params.lng = 'en';
  return brokenLinksTestPage(req, res);
});
router.get('/website-tester/geo', (req, res) => {
  req.params.lng = 'de';
  return geoTestPage(req, res);
});
router.get('/en/website-tester/geo', (req, res) => {
  req.params.lng = 'en';
  return geoTestPage(req, res);
});
router.get('/website-tester/seo', (req, res) => {
  req.params.lng = 'de';
  return seoTestPage(req, res);
});
router.get('/en/website-tester/seo', (req, res) => {
  req.params.lng = 'en';
  return seoTestPage(req, res);
});
router.post('/api/website-audit', websiteAuditRateLimit, runWebsiteAudit);
router.post('/api/website-audit/lead', websiteAuditLeadRateLimit, runWebsiteAuditLead);
router.post('/api/broken-link-audit', brokenLinkAuditRateLimit, runBrokenLinkAudit);
router.post('/api/geo-audit', geoAuditRateLimit, runGeoAudit);
router.post('/api/geo-audit/lead', geoAuditLeadRateLimit, runGeoAuditLead);
router.post('/api/seo-audit', seoAuditRateLimit, runSeoAudit);
router.post('/api/seo-audit/lead', seoAuditLeadRateLimit, runSeoAuditLead);
router.get('/api/website-audit/:auditId', getCachedWebsiteAudit);
router.get('/website-tester/report-confirm', (req, res) => {
  req.params.lng = 'de';
  return confirmWebsiteAuditLead(req, res);
});
router.get('/en/website-tester/report-confirm', (req, res) => {
  req.params.lng = 'en';
  return confirmWebsiteAuditLead(req, res);
});
router.get('/website-tester/geo/report-confirm', (req, res) => {
  req.params.lng = 'de';
  return confirmGeoAuditLead(req, res);
});
router.get('/en/website-tester/geo/report-confirm', (req, res) => {
  req.params.lng = 'en';
  return confirmGeoAuditLead(req, res);
});
router.get('/website-tester/seo/report-confirm', (req, res) => {
  req.params.lng = 'de';
  return confirmSeoAuditLead(req, res);
});
router.get('/en/website-tester/seo/report-confirm', (req, res) => {
  req.params.lng = 'en';
  return confirmSeoAuditLead(req, res);
});

export default router;
