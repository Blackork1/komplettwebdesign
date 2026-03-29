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
import { getCachedAuditResult } from './websiteAuditService.js';
import {
  sendWebsiteTesterDoiMail,
  sendWebsiteTesterReportMail
} from './mailService.js';
import { buildWebsiteTesterReport } from './websiteTesterPdfService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_HOURS = 24;

const I18N = {
  de: {
    errors: {
      emailRequired: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consentRequired: 'Bitte bestätige den Hinweis zum PDF-Versand.',
      auditMissing: 'Das Audit wurde nicht gefunden oder ist abgelaufen. Bitte starte die Analyse erneut.',
      tokenMissing: 'Der Bestätigungslink ist ungültig.',
      tokenInvalid: 'Der Bestätigungslink ist ungültig oder wurde bereits verwendet.',
      tokenExpired: 'Der Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
      reportFailed: 'Der Report konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      leadState: 'Diese Aktion ist für den aktuellen Lead-Status nicht möglich.'
    },
    messages: {
      verifyMail: 'Bitte bestätige deine E-Mail-Adresse. Danach senden wir den PDF-Report.',
      verifiedAndSent: 'Deine E-Mail wurde bestätigt. Der Optimierungsreport wurde soeben versendet.',
      alreadyUsed: 'Die E-Mail-Bestätigung wurde bereits abgeschlossen.',
      doiResent: 'Bestätigungslink wurde erneut versendet.',
      reportResent: 'Der PDF-Report wurde erneut versendet.'
    }
  },
  en: {
    errors: {
      emailRequired: 'Please enter a valid email address.',
      consentRequired: 'Please confirm the consent for PDF delivery.',
      auditMissing: 'The audit was not found or has expired. Please run the analysis again.',
      tokenMissing: 'The confirmation link is invalid.',
      tokenInvalid: 'The confirmation link is invalid or already used.',
      tokenExpired: 'The confirmation link has expired. Please request a new link.',
      reportFailed: 'The report could not be sent. Please contact us directly.',
      leadState: 'This action is not possible for the current lead status.'
    },
    messages: {
      verifyMail: 'Please confirm your email address. We will send the PDF report immediately after confirmation.',
      verifiedAndSent: 'Your email is confirmed. The optimization report has been sent.',
      alreadyUsed: 'Email confirmation was already completed.',
      doiResent: 'Confirmation link has been sent again.',
      reportResent: 'The PDF report has been sent again.'
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
  const path = lng === 'en' ? '/en/website-tester/report-confirm' : '/website-tester/report-confirm';
  return `${baseUrl()}${path}?token=${encodeURIComponent(rawToken)}`;
}

function extractDomain(result) {
  try {
    return new URL(result.finalUrl).hostname;
  } catch {
    return String(result.finalUrl || result.normalizedUrl || '').slice(0, 300);
  }
}

function compactAuditForLead(result = {}) {
  return {
    auditId: result.auditId,
    locale: result.locale,
    mode: result.mode,
    context: result.context,
    finalUrl: result.finalUrl,
    overallScore: result.overallScore,
    scoreBand: result.scoreBand,
    overallTone: result.overallTone,
    overallBadge: result.overallBadge,
    summary: result.summary,
    scoring: result.scoring,
    relevance: result.relevance,
    legalRisk: result.legalRisk,
    scannedPages: result.scannedPages,
    failedScanTargets: result.failedScanTargets,
    categories: result.categories,
    topFindings: result.topFindings,
    topActions: result.topActions,
    strengths: result.strengths,
    limitations: result.limitations,
    siteFacts: result.siteFacts,
    cta: result.cta,
    fetchedAt: result.fetchedAt
  };
}

function topIssuesFromResult(result = {}) {
  return (result.topActions || [])
    .slice(0, 3)
    .map((item) => item?.label || item?.text)
    .filter(Boolean);
}

export async function requestWebsiteTesterLead({
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

  const auditResult = getCachedAuditResult(auditId);
  if (!auditResult) {
    throw createError(copy.errors.auditMissing, 400);
  }

  const rawToken = generateRawToken();
  const tokenHash = hashConfirmToken(rawToken);
  const expiresAt = getTokenExpiryDate();
  const topIssues = topIssuesFromResult(auditResult);
  const domain = extractDomain(auditResult);

  const lead = await createWebsiteTesterLead({
    auditId: auditResult.auditId,
    domain,
    email: normalizedEmail,
    name: cleanName(name),
    locale: lng,
    overallScore: auditResult.overallScore,
    scoreBand: auditResult.scoreBand,
    topIssues,
    auditSnapshotJson: compactAuditForLead(auditResult),
    sourceIp,
    consentText,
    confirmTokenHash: tokenHash,
    confirmExpiresAt: expiresAt
  });

  const confirmUrl = buildConfirmUrl(rawToken, lng);
  await sendWebsiteTesterDoiMail({
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

function buildConfirmViewModel({ locale, status, lead, message }) {
  const lng = localeFrom(locale || lead?.locale);
  const success = status === 'success';
  return {
    locale: lng,
    status,
    success,
    message,
    lead,
    links: {
      tester: lng === 'en' ? '/en/website-tester' : '/website-tester',
      contact: lng === 'en' ? '/en/kontakt' : '/kontakt'
    }
  };
}

export async function confirmWebsiteTesterLeadToken({ token, locale }) {
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

  if (!existing) {
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

  const result = consumed.audit_snapshot_json || getCachedAuditResult(consumed.audit_id);
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
    const report = buildWebsiteTesterReport({
      lead: consumed,
      result,
      locale: effectiveLocale
    });

    await sendWebsiteTesterReportMail({
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

export async function resendWebsiteTesterLeadDoi({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead) {
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
  await sendWebsiteTesterDoiMail({
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

export async function resendWebsiteTesterLeadReport({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead) {
    throw createError('Lead wurde nicht gefunden.', 404);
  }

  const lng = localeFrom(lead.locale);
  const copy = copyFor(lng);

  if (!['confirmed', 'report_failed', 'report_sent'].includes(lead.status)) {
    throw createError(copy.errors.leadState, 400);
  }

  const result = lead.audit_snapshot_json || getCachedAuditResult(lead.audit_id);
  if (!result) {
    throw createError(copy.errors.auditMissing, 400);
  }

  try {
    const report = buildWebsiteTesterReport({
      lead,
      result,
      locale: lng
    });

    await sendWebsiteTesterReportMail({
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
  topIssuesFromResult,
  compactAuditForLead,
  buildConfirmUrl
};
