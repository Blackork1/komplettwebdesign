// Kurzanfrage aus dem Kontakt-Pop-up unten rechts: Nachricht + E-Mail, landet per Mail bei Sören
// und wie andere Anfragen in contact_requests. Spamschutz ohne Cookies: verstecktes Feld,
// Mindestzeit zwischen Öffnen und Absenden, Herkunftsprüfung und Begrenzung pro IP.
import nodemailer from 'nodemailer';
import { renderBrandEmail } from '../services/emailTemplateService.js';
import * as ContactRequests from '../models/contactRequestModel.js';
import { logNewRequest, ownerNotificationExtras } from '../services/mailInbox/requestLog.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNER_ADDRESS = 'kontakt@komplettwebdesign.de';

export const CONTACT_BUBBLE_LIMITS = Object.freeze({
  messageMin: 10,
  messageMax: 2000,
  emailMax: 254,
  minFillMs: 3000,
  rateLimitMax: 3,
  rateLimitWindowMs: 15 * 60 * 1000
});

function oneLine(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

function cleanPage(value) {
  const page = String(value ?? '').trim();
  return /^\/[\w\-/äöüß]*$/i.test(page) ? page.slice(0, 200) : '';
}

export function validateContactBubble(body = {}, now = Date.now()) {
  const message = String(body.message ?? '').replace(/\r\n/g, '\n').trim().slice(0, CONTACT_BUBBLE_LIMITS.messageMax);
  const email = oneLine(body.email, CONTACT_BUBBLE_LIMITS.emailMax).toLowerCase();
  const startedAt = Number(body.startedAt);

  if (oneLine(body.website, 200)) return { ok: false, spam: true };
  if (!Number.isFinite(startedAt) || now - startedAt < CONTACT_BUBBLE_LIMITS.minFillMs) return { ok: false, spam: true };
  if (message.length < CONTACT_BUBBLE_LIMITS.messageMin) {
    return { ok: false, field: 'message', message: 'Bitte schreib kurz, worum es geht (mindestens 10 Zeichen).' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, field: 'email', message: 'Bitte gib eine gültige E-Mail-Adresse an.' };
  }
  return { ok: true, data: { message, email, page: cleanPage(body.page) } };
}

function clientIp(req) {
  const ip = req.ip || String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function createContactBubbleRateLimiter({
  max = CONTACT_BUBBLE_LIMITS.rateLimitMax,
  windowMs = CONTACT_BUBBLE_LIMITS.rateLimitWindowMs,
  now = () => Date.now()
} = {}) {
  const store = new Map();
  return function contactBubbleRateLimit(req, res, next) {
    const time = now();
    for (const [key, entry] of store) if (entry.expiresAt <= time) store.delete(key);
    const key = clientIp(req);
    const entry = store.get(key) || { count: 0, expiresAt: time + windowMs };
    if (entry.count >= max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.expiresAt - time) / 1000))));
      return res.status(429).json({ success: false, message: 'Du hast gerade schon mehrere Nachrichten gesendet. Bitte versuch es später noch einmal.' });
    }
    entry.count += 1;
    store.set(key, entry);
    return next();
  };
}

function isSameOrigin(req) {
  const origin = req.get?.('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
}

export function buildOwnerMail({ message, email, page }, conversationId = null) {
  const subject = 'Neue Kurzanfrage über das Kontakt-Pop-up';
  const extras = ownerNotificationExtras(conversationId);
  const bodyHtml = `
    <p><strong>E-Mail:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
    ${page ? `<p><strong>Gesendet von:</strong> https://www.komplettwebdesign.de${escapeHtml(page)}</p>` : ''}
    <p><strong>Nachricht:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;
  return {
    from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
    to: OWNER_ADDRESS,
    replyTo: email,
    ...extras.mail,
    subject,
    html: renderBrandEmail({
      locale: 'de',
      subject,
      headline: 'Neue Kurzanfrage',
      preheader: 'Jemand hat dir über das Kontakt-Pop-up geschrieben.',
      bodyHtml,
      ...extras.cta
    })
  };
}

function defaultLogRequest({ message, email, page }, contactRequest) {
  return logNewRequest({
    source: 'kurzanfrage',
    subject: `Kurzanfrage: ${oneLine(message, 70)}`,
    contactEmail: email,
    contactRequestId: contactRequest?.id ?? null,
    pagePath: page,
    bodyText: message
  });
}

function defaultSendMail(mail) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter.sendMail(mail);
}

function defaultSaveRequest({ message, email, page }) {
  return ContactRequests.create({
    paket: 'kurzanfrage',
    umfang: 'Kontakt-Pop-up',
    texterstellung: 'n/a',
    bilderstellung: 'n/a',
    features: '',
    featuresOther: page ? `Seite: ${page}` : 'Kontakt-Pop-up',
    bookingId: null,
    name: '',
    email,
    phone: '',
    company: '',
    additionalInfo: message,
    images: ''
  });
}

export function createContactBubbleHandler({
  sendMail = defaultSendMail,
  saveRequest = defaultSaveRequest,
  logRequest = defaultLogRequest,
  logger = console,
  now = () => Date.now()
} = {}) {
  return async function handleContactBubble(req, res) {
    if (!isSameOrigin(req)) {
      return res.status(403).json({ success: false, message: 'Anfrage nicht erlaubt.' });
    }
    const result = validateContactBubble(req.body || {}, now());
    // Bots bekommen keine Fehlermeldung, damit sie nichts nachjustieren können.
    if (result.spam) return res.status(200).json({ success: true });
    if (!result.ok) return res.status(422).json({ success: false, field: result.field, message: result.message });

    let contactRequest = null;
    try {
      contactRequest = await saveRequest(result.data);
    } catch (error) {
      logger.error?.('Kurzanfrage konnte nicht gespeichert werden:', error?.message || error);
    }

    // Mailverlauf: die Anfrage wird ein Gespräch, die Mail an Sören verlinkt darauf.
    let conversationId = null;
    try {
      conversationId = await logRequest(result.data, contactRequest);
    } catch (error) {
      logger.error?.('Kurzanfrage nicht im Mailverlauf gespeichert:', error?.message || error);
    }

    try {
      await sendMail(buildOwnerMail(result.data, conversationId));
    } catch (error) {
      logger.error?.('Kurzanfrage konnte nicht gesendet werden:', error?.message || error);
      return res.status(502).json({
        success: false,
        message: 'Das Senden hat gerade nicht geklappt. Schreib mir gern an kontakt@komplettwebdesign.de.'
      });
    }

    return res.status(200).json({ success: true });
  };
}

export const contactBubbleRateLimit = createContactBubbleRateLimiter();
export const handleContactBubble = createContactBubbleHandler();
