import axios from 'axios';

export const TESTER_RECAPTCHA_ACTIONS = Object.freeze({
  websiteAudit: 'website_audit_scan',
  websiteAuditLead: 'website_audit_lead',
  brokenLinkAudit: 'broken_link_audit_scan',
  brokenLinkAuditLead: 'broken_link_audit_lead',
  geoAudit: 'geo_audit_scan',
  geoAuditLead: 'geo_audit_lead',
  seoAudit: 'seo_audit_scan',
  seoAuditLead: 'seo_audit_lead',
  metaAudit: 'meta_audit_scan',
  metaAuditLead: 'meta_audit_lead'
});

const DEFAULT_MIN_ELAPSED_MS = 1500;
const DEFAULT_MAX_ELAPSED_MS = 24 * 60 * 60 * 1000;

function toCleanString(value) {
  return String(value ?? '').trim();
}

function pickMinElapsedMs(value) {
  const parsed = Number(value ?? process.env.TESTER_MIN_FORM_MS ?? DEFAULT_MIN_ELAPSED_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_ELAPSED_MS;
}

function pickMaxElapsedMs(value) {
  const parsed = Number(value ?? process.env.TESTER_MAX_FORM_MS ?? DEFAULT_MAX_ELAPSED_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ELAPSED_MS;
}

export function validateTesterSpamBody(body = {}, {
  now = Date.now(),
  minElapsedMs,
  maxElapsedMs
} = {}) {
  const honeypot = toCleanString(body.company_website);
  if (honeypot) {
    throw new Error('Spam erkannt.');
  }

  const startedAt = Number(body.tester_started_at);
  const minMs = pickMinElapsedMs(minElapsedMs);
  const maxMs = pickMaxElapsedMs(maxElapsedMs);
  const elapsedMs = now - startedAt;

  if (!Number.isFinite(startedAt) || startedAt <= 0 || elapsedMs < minMs) {
    throw new Error('Das Formular wurde zu schnell abgesendet. Bitte versuche es erneut.');
  }

  if (elapsedMs > maxMs) {
    throw new Error('Das Formular ist abgelaufen. Bitte lade die Seite neu und versuche es erneut.');
  }

  return { testerStartedAt: startedAt };
}

async function defaultPostVerify({ secret, token }) {
  const { data } = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    { params: { secret, response: token } }
  );
  return data;
}

export async function verifyTesterRecaptchaToken(token, {
  secret = process.env.RECAPTCHA_SECRET,
  minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5),
  expectedAction,
  postVerify = defaultPostVerify
} = {}) {
  const cleanToken = toCleanString(token);

  // Lokale Entwicklungsumgebungen ohne Secret bleiben testbar. Auf dem Server
  // greift reCAPTCHA, sobald RECAPTCHA_SECRET gesetzt ist.
  if (!secret) return true;
  if (!cleanToken) throw new Error('reCAPTCHA-Token fehlt.');

  let data;
  try {
    data = await postVerify({ secret, token: cleanToken });
  } catch {
    throw new Error('reCAPTCHA-Validierung fehlgeschlagen.');
  }

  const score = typeof data?.score === 'number' ? data.score : 1;
  if (!data?.success || score < minScore || (expectedAction && data.action && data.action !== expectedAction)) {
    throw new Error('reCAPTCHA-Validierung fehlgeschlagen.');
  }

  return true;
}

export function createTesterSpamGuard({
  expectedAction,
  validateBody = validateTesterSpamBody,
  verifyRecaptcha = verifyTesterRecaptchaToken
} = {}) {
  return async function testerSpamGuard(req, res, next) {
    try {
      const normalized = validateBody(req.body || {});
      await verifyRecaptcha(req.body?.token || req.body?.recaptchaToken || req.body?.['g-recaptcha-response'], {
        expectedAction
      });
      req.testerSpam = normalized;
      return next();
    } catch (error) {
      const message = error?.message || 'Die Anfrage wurde blockiert.';
      return res.status(400).json({ success: false, message });
    }
  };
}
