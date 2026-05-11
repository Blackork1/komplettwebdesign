import axios from 'axios';

export const NEWSLETTER_RECAPTCHA_ACTION = 'newsletter_signup';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_MIN_ELAPSED_MS = 2500;
const DEFAULT_MAX_ELAPSED_MS = 24 * 60 * 60 * 1000;

function toCleanString(value) {
  return String(value ?? '').trim();
}

function getClientIp(req) {
  if (req.ip && req.ip !== '::ffff:127.0.0.1') return String(req.ip);
  const forwarded = toCleanString(req.headers?.['x-forwarded-for']).split(',')[0]?.trim();
  return forwarded || req.connection?.remoteAddress || 'unknown';
}

function pickMinElapsedMs(value) {
  const parsed = Number(value ?? process.env.NEWSLETTER_MIN_FORM_MS ?? DEFAULT_MIN_ELAPSED_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_ELAPSED_MS;
}

function pickMaxElapsedMs(value) {
  const parsed = Number(value ?? process.env.NEWSLETTER_MAX_FORM_MS ?? DEFAULT_MAX_ELAPSED_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ELAPSED_MS;
}

export function validateNewsletterSignupBody(body = {}, {
  now = Date.now(),
  minElapsedMs,
  maxElapsedMs
} = {}) {
  const email = toCleanString(body.email).toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new Error('Bitte gib eine gültige E-Mail-Adresse ein.');
  }

  const honeypot = toCleanString(body.company_website);
  if (honeypot) {
    throw new Error('Spam erkannt.');
  }

  const startedAt = Number(body.newsletter_started_at);
  const minMs = pickMinElapsedMs(minElapsedMs);
  const maxMs = pickMaxElapsedMs(maxElapsedMs);
  const elapsedMs = now - startedAt;

  if (!Number.isFinite(startedAt) || startedAt <= 0 || elapsedMs < minMs) {
    throw new Error('Das Formular wurde zu schnell abgesendet. Bitte versuche es erneut.');
  }

  if (elapsedMs > maxMs) {
    throw new Error('Das Formular ist abgelaufen. Bitte lade die Seite neu und versuche es erneut.');
  }

  return { email };
}

async function defaultPostVerify({ secret, token }) {
  const { data } = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    { params: { secret, response: token } }
  );
  return data;
}

export async function verifyNewsletterRecaptchaToken(token, {
  secret = process.env.RECAPTCHA_SECRET,
  minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5),
  expectedAction = NEWSLETTER_RECAPTCHA_ACTION,
  postVerify = defaultPostVerify
} = {}) {
  const cleanToken = toCleanString(token);

  // Lokale Setups ohne reCAPTCHA-Secret sollen weiter funktionieren. In
  // Produktion blockiert die vorhandene Secret-Konfiguration direkte Bot-Posts.
  if (!secret) return true;
  if (!cleanToken) throw new Error('reCAPTCHA-Token fehlt.');

  let data;
  try {
    data = await postVerify({ secret, token: cleanToken });
  } catch {
    throw new Error('reCAPTCHA-Validierung fehlgeschlagen.');
  }

  const score = typeof data?.score === 'number' ? data.score : 1;
  if (!data?.success || score < minScore || (data.action && data.action !== expectedAction)) {
    throw new Error('reCAPTCHA-Validierung fehlgeschlagen.');
  }

  return true;
}

export function createNewsletterRateLimiter({
  max = 3,
  windowMs = 60 * 60 * 1000,
  now = Date.now
} = {}) {
  const store = new Map();
  let lastPrune = now();

  function prune(currentTime) {
    if (currentTime - lastPrune < 60 * 1000) return;
    lastPrune = currentTime;
    for (const [key, entry] of store.entries()) {
      if (!entry || entry.expiresAt <= currentTime) store.delete(key);
    }
  }

  return function newsletterRateLimitMiddleware(req, res, next) {
    const currentTime = now();
    prune(currentTime);

    const key = getClientIp(req);
    const record = store.get(key) || { count: 0, expiresAt: currentTime + windowMs };

    if (record.expiresAt <= currentTime) {
      record.count = 0;
      record.expiresAt = currentTime + windowMs;
    }

    if (record.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - currentTime) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).send('Zu viele Newsletter-Anmeldungen in kurzer Zeit. Bitte versuche es später erneut.');
    }

    record.count += 1;
    store.set(key, record);
    return next();
  };
}

export function createNewsletterSignupGuard({
  validateBody = validateNewsletterSignupBody,
  verifyRecaptcha = verifyNewsletterRecaptchaToken
} = {}) {
  return async function newsletterSignupGuard(req, res, next) {
    try {
      const normalized = validateBody(req.body || {});
      await verifyRecaptcha(req.body?.token);
      req.newsletterSignup = normalized;
      return next();
    } catch (err) {
      const message = err?.message || 'Newsletter-Anmeldung wurde blockiert.';
      return res.status(400).send(message);
    }
  };
}
