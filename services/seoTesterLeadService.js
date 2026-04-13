import { createHash, randomBytes, randomUUID } from 'crypto';
import {
  consumeWebsiteTesterLeadConfirmToken,
  createWebsiteTesterLead,
  getWebsiteTesterLeadByConfirmHash,
  getWebsiteTesterLeadById,
  markWebsiteTesterLeadReportFailed,
  markWebsiteTesterLeadReportSent,
  refreshWebsiteTesterLeadConfirmToken
} from '../models/websiteTesterAdminModel.js';
import { getCachedSeoAuditResult } from './seoAuditService.js';
import {
  sendSeoTesterDoiMail,
  sendSeoTesterReportMail
} from './mailService.js';
import { buildSeoTesterReport } from './seoTesterPdfService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_HOURS = 24;

const I18N = {
  de: {
    errors: {
      emailRequired: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consentRequired: 'Bitte bestätige den Hinweis zum PDF-Versand.',
      auditMissing: 'Das SEO-Audit wurde nicht gefunden oder ist abgelaufen. Bitte starte den Scan erneut.',
      tokenMissing: 'Der Bestätigungslink ist ungültig.',
      tokenInvalid: 'Der Bestätigungslink ist ungültig oder wurde bereits verwendet.',
      tokenExpired: 'Der Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
      reportFailed: 'Der SEO-Report konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      leadState: 'Diese Aktion ist für den aktuellen Lead-Status nicht möglich.'
    },
    messages: {
      verifyMail: 'Bitte bestätige deine E-Mail-Adresse. Danach senden wir den detaillierten SEO-Report.',
      verifiedAndSent: 'Deine E-Mail wurde bestätigt. Der detaillierte SEO-Report wurde versendet.',
      alreadyUsed: 'Die E-Mail-Bestätigung wurde bereits abgeschlossen.',
      doiResent: 'Bestätigungslink wurde erneut versendet.',
      reportResent: 'Der SEO-Report wurde erneut versendet.'
    }
  },
  en: {
    errors: {
      emailRequired: 'Please enter a valid email address.',
      consentRequired: 'Please confirm consent for PDF delivery.',
      auditMissing: 'The SEO audit was not found or has expired. Please run the scan again.',
      tokenMissing: 'The confirmation link is invalid.',
      tokenInvalid: 'The confirmation link is invalid or already used.',
      tokenExpired: 'The confirmation link has expired. Please request a new link.',
      reportFailed: 'The SEO report could not be sent. Please contact us directly.',
      leadState: 'This action is not possible for the current lead status.'
    },
    messages: {
      verifyMail: 'Please confirm your email address. We will then send the detailed SEO report.',
      verifiedAndSent: 'Your email is confirmed. The detailed SEO report has been sent.',
      alreadyUsed: 'Email confirmation was already completed.',
      doiResent: 'Confirmation link has been sent again.',
      reportResent: 'The SEO report has been sent again.'
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
  const path = lng === 'en' ? '/en/website-tester/seo/report-confirm' : '/website-tester/seo/report-confirm';
  return `${baseUrl()}${path}?token=${encodeURIComponent(rawToken)}`;
}

function extractDomain(result = {}) {
  const source = result?.sourceResult || {};
  const candidate = source.finalUrl || source.normalizedUrl || result?.finalUrl || '';
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

function compactSeoAuditForLead(result = {}) {
  return {
    source: 'seo',
    scanMode: result.scanMode,
    requestedMaxSubpages: result.requestedMaxSubpages,
    effectiveMaxSubpages: result.effectiveMaxSubpages,
    categoryScores: result.categoryScores || [],
    seoScore: result.seoScore || {},
    potentialSummary: result.potentialSummary || {},
    sourceResult: result.sourceResult || null
  };
}

function topIssuesFromSeoResult(result = {}) {
  const source = result?.sourceResult || {};
  return (source.topActions || [])
    .slice(0, 3)
    .map((item) => item?.label || item?.text)
    .filter(Boolean);
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
      tester: lng === 'en' ? '/en/website-tester/seo' : '/website-tester/seo',
      contact: lng === 'en' ? '/en/kontakt' : '/kontakt'
    }
  };
}

export async function requestSeoTesterLead({
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
  const seoResult = getCachedSeoAuditResult(auditId);
  if (!seoResult) {
    throw createError(copy.errors.auditMissing, 400);
  }

  const rawToken = generateRawToken();
  const tokenHash = hashConfirmToken(rawToken);
  const expiresAt = getTokenExpiryDate();
  const domain = extractDomain(seoResult);

  const lead = await createWebsiteTesterLead({
    source: 'seo',
    auditId: seoResult.sourceResult?.auditId || String(auditId || '').trim(),
    domain,
    email: normalizedEmail,
    name: cleanName(name),
    locale: lng,
    overallScore: seoResult.seoScore?.overall,
    scoreBand: seoResult.seoScore?.band,
    topIssues: topIssuesFromSeoResult(seoResult),
    auditSnapshotJson: compactSeoAuditForLead(seoResult),
    sourceIp,
    consentText,
    confirmTokenHash: tokenHash,
    confirmExpiresAt: expiresAt
  });

  const confirmUrl = buildConfirmUrl(rawToken, lng);
  await sendSeoTesterDoiMail({
    to: lead.email,
    name: lead.name,
    locale: lng,
    domain,
    scoreBand: lead.score_band,
    confirmUrl,
    expiresAt
  });

  return {
    lead,
    verificationRequired: true,
    message: copy.messages.verifyMail
  };
}

export async function confirmSeoTesterLeadToken({ token, locale }) {
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
  if (!existing || (existing.source || 'website') !== 'seo') {
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

  const consumed = await consumeWebsiteTesterLeadConfirmToken(tokenHash);
  if (!consumed) {
    return buildConfirmViewModel({
      locale: effectiveLocale,
      status: 'invalid',
      lead: existing,
      message: effectiveCopy.errors.tokenInvalid
    });
  }

  const result = consumed.audit_snapshot_json || getCachedSeoAuditResult(consumed.audit_id);
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
    const report = buildSeoTesterReport({
      lead: consumed,
      result,
      locale: effectiveLocale
    });

    await sendSeoTesterReportMail({
      to: consumed.email,
      name: consumed.name,
      locale: effectiveLocale,
      domain: consumed.domain,
      scoreBand: consumed.score_band,
      report
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

export async function resendSeoTesterLeadDoi({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead || (lead.source || 'website') !== 'seo') {
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

  const confirmUrl = buildConfirmUrl(rawToken, lng);
  await sendSeoTesterDoiMail({
    to: updated.email,
    name: updated.name,
    locale: lng,
    domain: updated.domain,
    scoreBand: updated.score_band,
    confirmUrl,
    expiresAt
  });

  return {
    lead: updated,
    message: copy.messages.doiResent
  };
}

export async function resendSeoTesterLeadReport({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead || (lead.source || 'website') !== 'seo') {
    throw createError('Lead wurde nicht gefunden.', 404);
  }

  const lng = localeFrom(lead.locale);
  const copy = copyFor(lng);

  if (!['confirmed', 'report_failed', 'report_sent'].includes(lead.status)) {
    throw createError(copy.errors.leadState, 400);
  }

  const result = lead.audit_snapshot_json || getCachedSeoAuditResult(lead.audit_id);
  if (!result) {
    throw createError(copy.errors.auditMissing, 400);
  }

  try {
    const report = buildSeoTesterReport({
      lead,
      result,
      locale: lng
    });

    await sendSeoTesterReportMail({
      to: lead.email,
      name: lead.name,
      locale: lng,
      domain: lead.domain,
      scoreBand: lead.score_band,
      report
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
  compactSeoAuditForLead,
  topIssuesFromSeoResult
};

