import express from 'express';
import {
  brokenLinksTestPage,
  confirmBrokenLinkAuditLead,
  confirmGeoAuditLead,
  confirmMetaAuditLead,
  confirmSeoAuditLead,
  confirmWebsiteAuditLead,
  geoTestPage,
  metaTestPage,
  seoTestPage,
  getCachedWebsiteAudit,
  runBrokenLinkAudit,
  runBrokenLinkAuditLead,
  runGeoAudit,
  runGeoAuditLead,
  runMetaAudit,
  runMetaAuditLead,
  runSeoAudit,
  runSeoAuditLead,
  runWebsiteAudit,
  runWebsiteAuditLead,
  testPage
} from '../controllers/testController.js';

const router = express.Router();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 5;

/**
 * Pulls the client IP. Prefers Express `req.ip` (which honors `trust proxy`),
 * and only falls back to the raw x-forwarded-for header when req.ip is empty.
 * Strips port from IPv6-mapped IPv4 addresses ("::ffff:1.2.3.4").
 */
function getClientIp(req) {
  let ip = req.ip || '';
  if (!ip) {
    const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
    ip = forwarded || req.connection?.remoteAddress || 'unknown';
  }
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }
  return ip || 'unknown';
}

/**
 * Creates a rate-limit middleware backed by its own in-memory Map.
 * Prunes expired entries lazily on each request.
 *
 * @param {object} opts
 * @param {number} opts.max - maximum requests per window per IP
 * @param {number} opts.windowMs - sliding window duration
 * @param {string} opts.message - 429 JSON body message (user facing)
 * @param {string} [opts.label] - optional label for diagnostics
 */
function createTesterRateLimiter({ max = DEFAULT_RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS, message, label }) {
  const store = new Map();

  function prune(now) {
    for (const [key, entry] of store.entries()) {
      if (!entry || entry.expiresAt <= now) {
        store.delete(key);
      }
    }
  }

  function middleware(req, res, next) {
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
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ success: false, message });
    }

    record.count += 1;
    store.set(key, record);
    return next();
  }

  middleware.store = store;
  middleware.label = label;
  return middleware;
}

const websiteAuditRateLimit = createTesterRateLimiter({
  message: 'Zu viele Analysen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'website-audit'
});
const websiteAuditLeadRateLimit = createTesterRateLimiter({
  message: 'Zu viele Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'website-audit-lead'
});
const brokenLinkAuditRateLimit = createTesterRateLimiter({
  message: 'Zu viele Broken-Link-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'broken-link'
});
const brokenLinkAuditLeadRateLimit = createTesterRateLimiter({
  message: 'Zu viele Broken-Links-Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'broken-link-lead'
});
const geoAuditRateLimit = createTesterRateLimiter({
  message: 'Zu viele GEO-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'geo-audit'
});
const geoAuditLeadRateLimit = createTesterRateLimiter({
  message: 'Zu viele GEO-Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'geo-audit-lead'
});
const seoAuditRateLimit = createTesterRateLimiter({
  message: 'Zu viele SEO-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'seo-audit'
});
const seoAuditLeadRateLimit = createTesterRateLimiter({
  message: 'Zu viele SEO-Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'seo-audit-lead'
});
const metaAuditRateLimit = createTesterRateLimiter({
  message: 'Zu viele Meta-Scans in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'meta-audit'
});
const metaAuditLeadRateLimit = createTesterRateLimiter({
  message: 'Zu viele Meta-Report-Anfragen in kurzer Zeit. Bitte versuche es in einigen Minuten erneut.',
  label: 'meta-audit-lead'
});

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
router.get('/website-tester/meta', (req, res) => {
  req.params.lng = 'de';
  return metaTestPage(req, res);
});
router.get('/en/website-tester/meta', (req, res) => {
  req.params.lng = 'en';
  return metaTestPage(req, res);
});
router.get('/en/website-tester/seo', (req, res) => {
  req.params.lng = 'en';
  return seoTestPage(req, res);
});
router.post('/api/website-audit', websiteAuditRateLimit, runWebsiteAudit);
router.post('/api/website-audit/lead', websiteAuditLeadRateLimit, runWebsiteAuditLead);
router.post('/api/broken-link-audit', brokenLinkAuditRateLimit, runBrokenLinkAudit);
router.post('/api/broken-link-audit/lead', brokenLinkAuditLeadRateLimit, runBrokenLinkAuditLead);
router.post('/api/geo-audit', geoAuditRateLimit, runGeoAudit);
router.post('/api/geo-audit/lead', geoAuditLeadRateLimit, runGeoAuditLead);
router.post('/api/seo-audit', seoAuditRateLimit, runSeoAudit);
router.post('/api/seo-audit/lead', seoAuditLeadRateLimit, runSeoAuditLead);
router.post('/api/meta-audit', metaAuditRateLimit, runMetaAudit);
router.post('/api/meta-audit/lead', metaAuditLeadRateLimit, runMetaAuditLead);
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
router.get('/website-tester/meta/report-confirm', (req, res) => {
  req.params.lng = 'de';
  return confirmMetaAuditLead(req, res);
});
router.get('/en/website-tester/meta/report-confirm', (req, res) => {
  req.params.lng = 'en';
  return confirmMetaAuditLead(req, res);
});
router.get('/website-tester/broken-links/report-confirm', (req, res) => {
  req.params.lng = 'de';
  return confirmBrokenLinkAuditLead(req, res);
});
router.get('/en/website-tester/broken-links/report-confirm', (req, res) => {
  req.params.lng = 'en';
  return confirmBrokenLinkAuditLead(req, res);
});

export { createTesterRateLimiter };
export default router;
