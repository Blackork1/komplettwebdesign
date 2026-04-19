import { createHash, randomBytes, randomUUID } from 'crypto';
import NewsletterSignupModel from '../models/NewsletterSignupModel.js';
import {
  consumeWebsiteTesterLeadConfirmToken,
  createWebsiteTesterLead,
  getWebsiteTesterLeadByConfirmHash,
  getWebsiteTesterLeadById,
  markWebsiteTesterLeadReportFailed,
  markWebsiteTesterLeadReportSent,
  refreshWebsiteTesterLeadConfirmToken
} from '../models/websiteTesterAdminModel.js';
import { getCachedBrokenLinkAuditResult } from './brokenLinkAuditService.js';
import {
  sendBrokenLinksTesterDoiMail,
  sendBrokenLinksTesterReportMail,
  sendAdminTesterLeadNotification
} from './mailService.js';
import { buildBrokenLinksTesterReport } from './brokenLinksTesterPdfService.js';

// Broken-Links-Tester lead-gate. Mirrors the structure of seoTesterLeadService
// but intentionally omits the "full guide" PDF flow: a broken-links report is
// already a concrete list of fixes, not a narrative guide. We keep three
// exported lifecycle functions:
//
//   - requestBrokenLinkTesterLead: create pending lead + send DOI mail
//   - confirmBrokenLinkTesterLeadToken: atomic consume + send PDF
//   - resendBrokenLinkTesterLeadDoi / ...LeadReport: operational re-sends

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_HOURS = 24;
const LEAD_SOURCE = 'broken-links';

const I18N = {
  de: {
    errors: {
      emailRequired: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consentRequired: 'Bitte bestätige die Newsletter-Einwilligung für den Broken-Links-Report.',
      auditMissing: 'Das Broken-Link-Audit wurde nicht gefunden oder ist abgelaufen. Bitte starte den Scan erneut.',
      tokenMissing: 'Der Bestätigungslink ist ungültig.',
      tokenInvalid: 'Der Bestätigungslink ist ungültig oder wurde bereits verwendet.',
      tokenExpired: 'Der Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
      reportFailed: 'Der Broken-Links-Report konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      leadState: 'Diese Aktion ist für den aktuellen Lead-Status nicht möglich.'
    },
    messages: {
      verifyMail: 'Bitte bestätige deine E-Mail-Adresse (Double-Opt-in). Danach senden wir den detaillierten Broken-Links-Report und aktivieren die Newsletter-Anmeldung.',
      verifiedAndSent: 'Deine E-Mail wurde bestätigt. Der detaillierte Broken-Links-Report wurde versendet.',
      alreadyUsed: 'Die E-Mail-Bestätigung wurde bereits abgeschlossen.',
      doiResent: 'Bestätigungslink wurde erneut versendet.',
      reportResent: 'Der Broken-Links-Report wurde erneut versendet.'
    }
  },
  en: {
    errors: {
      emailRequired: 'Please enter a valid email address.',
      consentRequired: 'Please confirm newsletter consent for the broken-links report.',
      auditMissing: 'The broken-links audit was not found or has expired. Please run the scan again.',
      tokenMissing: 'The confirmation link is invalid.',
      tokenInvalid: 'The confirmation link is invalid or already used.',
      tokenExpired: 'The confirmation link has expired. Please request a new link.',
      reportFailed: 'The broken-links report could not be sent. Please contact us directly.',
      leadState: 'This action is not possible for the current lead status.'
    },
    messages: {
      verifyMail: 'Please confirm your email address (double opt-in). We will then send the detailed broken-links report and activate your newsletter subscription.',
      verifiedAndSent: 'Your email is confirmed. The detailed broken-links report has been sent.',
      alreadyUsed: 'Email confirmation was already completed.',
      doiResent: 'Confirmation link has been sent again.',
      reportResent: 'The broken-links report has been sent again.'
    }
  }
};

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function copyFor(locale) {
  return I18N[localeFrom(locale)];
}

function cleanEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cleanName(name) {
  return String(name || '').trim().slice(0, 180);
}

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function generateRawToken() {
  return `${randomUUID()}-${randomBytes(16).toString('hex')}`;
}

export function hashConfirmToken(rawToken = '') {
  return createHash('sha256').update(String(rawToken || '')).digest('hex');
}

function getTokenExpiryDate() {
  return new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

function baseUrl() {
  const base = process.env.BASE_URL || process.env.CANONICAL_BASE_URL || 'https://komplettwebdesign.de';
  return String(base).replace(/\/$/, '');
}

function buildConfirmUrl(rawToken, locale) {
  const lng = localeFrom(locale);
  const path = lng === 'en'
    ? '/en/website-tester/broken-links/report-confirm'
    : '/website-tester/broken-links/report-confirm';
  return `${baseUrl()}${path}?token=${encodeURIComponent(rawToken)}`;
}

function extractDomain(result = {}) {
  const candidate = result?.finalUrl || result?.normalizedUrl || result?.inputUrl || '';
  try {
    return new URL(candidate).hostname;
  } catch {
    return String(candidate || '').slice(0, 300);
  }
}

function validateLeadInput({ email, consent, locale }) {
  const copy = copyFor(locale);
  const normalizedEmail = cleanEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw createError(copy.errors.emailRequired, 400);
  }
  if (!consent) {
    throw createError(copy.errors.consentRequired, 400);
  }
  return { normalizedEmail };
}

/**
 * Shrinks the audit result before we persist it in audit_snapshot_json. The
 * raw result can contain hundreds of broken-link entries (~1 KB each); we want
 * to keep the full dataset for the PDF re-send path, but we cap to a
 * reasonable size to avoid blowing up the DB column.
 */
function compactBrokenLinkAuditForLead(result = {}) {
  const brokenLinks = Array.isArray(result?.brokenLinks) ? result.brokenLinks.slice(0, 500) : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings.slice(0, 500) : [];
  return {
    source: LEAD_SOURCE,
    auditId: result.auditId,
    locale: result.locale,
    inputUrl: result.inputUrl,
    normalizedUrl: result.normalizedUrl,
    finalUrl: result.finalUrl,
    fetchedAt: result.fetchedAt,
    scanMode: result.scanMode,
    crawlStats: result.crawlStats,
    linkStats: result.linkStats,
    scannedPages: Array.isArray(result.scannedPages) ? result.scannedPages.slice(0, 50) : [],
    failedScanTargets: Array.isArray(result.failedScanTargets) ? result.failedScanTargets.slice(0, 50) : [],
    brokenLinks,
    warnings,
    limitations: result.limitations,
    config: result.config
  };
}

function topIssuesFromBrokenLinks(result = {}) {
  const items = Array.isArray(result?.brokenLinks) ? result.brokenLinks : [];
  return items.slice(0, 3).map((entry) => {
    const source = entry?.sourceUrl || '';
    const target = entry?.targetUrl || '';
    const status = entry?.status ?? '';
    return [source, target, status].filter(Boolean).join(' → ').slice(0, 300);
  }).filter(Boolean);
}

async function ensureNewsletterUnsubscribeToken(email) {
  const created = await NewsletterSignupModel.create(email);
  if (created?.unsubscribe_token) return created.unsubscribe_token;
  const fallback = await NewsletterSignupModel.findByEmail(email);
  return fallback?.unsubscribe_token || '';
}

function buildConfirmViewModel({ locale, status, lead, message }) {
  const lng = localeFrom(locale || lead?.locale);
  return {
    locale: lng,
    status,
    success: status === 'success',
    message,
    lead,
    links: {
      tester: lng === 'en' ? '/en/website-tester/broken-links' : '/website-tester/broken-links',
      contact: lng === 'en' ? '/en/kontakt' : '/kontakt',
      booking: lng === 'en' ? '/en/booking' : '/booking'
    }
  };
}

export async function requestBrokenLinkTesterLead({
  auditId,
  email,
  name,
  locale,
  consent,
  sourceIp,
  consentText
}) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);

  const { normalizedEmail } = validateLeadInput({ email, consent, locale: lng });
  const auditResult = getCachedBrokenLinkAuditResult(auditId);
  if (!auditResult) {
    throw createError(copy.errors.auditMissing, 400);
  }

  const rawToken = generateRawToken();
  const tokenHash = hashConfirmToken(rawToken);
  const expiresAt = getTokenExpiryDate();
  const domain = extractDomain(auditResult);
  const brokenCount = auditResult?.linkStats?.brokenCount ?? 0;
  // Broken-links audits don't produce a 0..100 score, so we leave overall/band
  // empty on the lead row — the admin dashboard uses them for display only.
  const lead = await createWebsiteTesterLead({
    source: LEAD_SOURCE,
    auditId: auditResult.auditId || String(auditId || '').trim(),
    domain,
    email: normalizedEmail,
    name: cleanName(name),
    locale: lng,
    overallScore: null,
    scoreBand: null,
    topIssues: topIssuesFromBrokenLinks(auditResult),
    auditSnapshotJson: compactBrokenLinkAuditForLead(auditResult),
    sourceIp,
    consentText,
    confirmTokenHash: tokenHash,
    confirmExpiresAt: expiresAt
  });

  const confirmUrl = buildConfirmUrl(rawToken, lng);
  await sendBrokenLinksTesterDoiMail({
    to: lead.email,
    name: lead.name,
    locale: lng,
    domain,
    brokenCount,
    confirmUrl,
    expiresAt
  });

  try {
    await sendAdminTesterLeadNotification({
      source: 'broken-links',
      email: lead.email,
      name: lead.name,
      domain,
      scoreBand: lead.score_band || '',
      overallScore: brokenCount,
      locale: lng
    });
  } catch (e) {
    console.warn('Admin notification (broken-links tester) failed:', e?.message || e);
  }

  return {
    lead,
    verificationRequired: true,
    message: copy.messages.verifyMail
  };
}

export async function confirmBrokenLinkTesterLeadToken({ token, locale }) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);

  const rawToken = String(token || '').trim();
  if (!rawToken) {
    return buildConfirmViewModel({
      locale: lng,
      status: 'invalid',
      message: copy.errors.tokenMissing
    });
  }

  const tokenHash = hashConfirmToken(rawToken);
  const existing = await getWebsiteTesterLeadByConfirmHash(tokenHash);
  if (!existing || (existing.source || 'website') !== LEAD_SOURCE) {
    return buildConfirmViewModel({
      locale: lng,
      status: 'invalid',
      message: copy.errors.tokenInvalid
    });
  }

  const effectiveLocale = localeFrom(existing.locale || lng);
  const effectiveCopy = copyFor(effectiveLocale);

  if (existing.status !== 'pending') {
    return buildConfirmViewModel({
      locale: effectiveLocale,
      status: 'already_used',
      lead: existing,
      message: effectiveCopy.messages.alreadyUsed
    });
  }

  if (!existing.confirm_expires_at || new Date(existing.confirm_expires_at).getTime() <= Date.now()) {
    return buildConfirmViewModel({
      locale: effectiveLocale,
      status: 'expired',
      lead: existing,
      message: effectiveCopy.errors.tokenExpired
    });
  }

  // Atomic consume to prevent race on duplicate clicks.
  const consumed = await consumeWebsiteTesterLeadConfirmToken(tokenHash);
  if (!consumed) {
    return buildConfirmViewModel({
      locale: effectiveLocale,
      status: 'already_used',
      lead: existing,
      message: effectiveCopy.messages.alreadyUsed
    });
  }

  const result = consumed.audit_snapshot_json || getCachedBrokenLinkAuditResult(consumed.audit_id);
  if (!result) {
    await markWebsiteTesterLeadReportFailed(consumed.id, effectiveCopy.errors.auditMissing);
    return buildConfirmViewModel({
      locale: effectiveLocale,
      status: 'report_failed',
      lead: consumed,
      message: effectiveCopy.errors.auditMissing
    });
  }

  try {
    const unsubscribeToken = await ensureNewsletterUnsubscribeToken(consumed.email);
    const report = buildBrokenLinksTesterReport({
      lead: consumed,
      result,
      locale: effectiveLocale
    });

    await sendBrokenLinksTesterReportMail({
      to: consumed.email,
      name: consumed.name,
      locale: effectiveLocale,
      domain: consumed.domain,
      brokenCount: result?.linkStats?.brokenCount ?? 0,
      warningCount: result?.linkStats?.warningCount ?? 0,
      report,
      unsubscribeToken
    });

    const updated = await markWebsiteTesterLeadReportSent(consumed.id);
    return buildConfirmViewModel({
      locale: effectiveLocale,
      status: 'success',
      lead: updated || consumed,
      message: effectiveCopy.messages.verifiedAndSent
    });
  } catch (error) {
    await markWebsiteTesterLeadReportFailed(consumed.id, error.message || effectiveCopy.errors.reportFailed);
    return buildConfirmViewModel({
      locale: effectiveLocale,
      status: 'report_failed',
      lead: consumed,
      message: effectiveCopy.errors.reportFailed
    });
  }
}

export async function resendBrokenLinkTesterLeadDoi({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead || (lead.source || 'website') !== LEAD_SOURCE) {
    throw createError('Lead wurde nicht gefunden.', 404);
  }

  const lng = localeFrom(lead.locale);
  const copy = copyFor(lng);
  if (lead.status !== 'pending') {
    throw createError(copy.errors.leadState, 400);
  }

  const rawToken = generateRawToken();
  const tokenHash = hashConfirmToken(rawToken);
  const expiresAt = getTokenExpiryDate();
  const updated = await refreshWebsiteTesterLeadConfirmToken({
    id: lead.id,
    confirmTokenHash: tokenHash,
    confirmExpiresAt: expiresAt
  });
  if (!updated) {
    throw createError(copy.errors.leadState, 400);
  }

  const brokenCount = updated.audit_snapshot_json?.linkStats?.brokenCount ?? 0;
  const confirmUrl = buildConfirmUrl(rawToken, lng);
  await sendBrokenLinksTesterDoiMail({
    to: updated.email,
    name: updated.name,
    locale: lng,
    domain: updated.domain,
    brokenCount,
    confirmUrl,
    expiresAt
  });

  return {
    lead: updated,
    message: copy.messages.doiResent
  };
}

export async function resendBrokenLinkTesterLeadReport({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead || (lead.source || 'website') !== LEAD_SOURCE) {
    throw createError('Lead wurde nicht gefunden.', 404);
  }

  const lng = localeFrom(lead.locale);
  const copy = copyFor(lng);
  if (!['confirmed', 'report_failed', 'report_sent'].includes(lead.status)) {
    throw createError(copy.errors.leadState, 400);
  }

  const result = lead.audit_snapshot_json || getCachedBrokenLinkAuditResult(lead.audit_id);
  if (!result) {
    throw createError(copy.errors.auditMissing, 400);
  }

  try {
    const unsubscribeToken = await ensureNewsletterUnsubscribeToken(lead.email);
    const report = buildBrokenLinksTesterReport({
      lead,
      result,
      locale: lng
    });

    await sendBrokenLinksTesterReportMail({
      to: lead.email,
      name: lead.name,
      locale: lng,
      domain: lead.domain,
      brokenCount: result?.linkStats?.brokenCount ?? 0,
      warningCount: result?.linkStats?.warningCount ?? 0,
      report,
      unsubscribeToken
    });

    const updated = await markWebsiteTesterLeadReportSent(lead.id);
    return {
      lead: updated || lead,
      message: copy.messages.reportResent
    };
  } catch (error) {
    await markWebsiteTesterLeadReportFailed(lead.id, error.message || copy.errors.reportFailed);
    throw createError(copy.errors.reportFailed, 500);
  }
}

export const __testables = {
  localeFrom,
  cleanEmail,
  hashConfirmToken,
  buildConfirmUrl,
  compactBrokenLinkAuditForLead,
  topIssuesFromBrokenLinks
};
