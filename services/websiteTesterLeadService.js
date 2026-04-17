import { createHash, randomBytes, randomUUID } from 'crypto';
import {
  consumeWebsiteTesterLeadConfirmToken,
  createWebsiteTesterLead,
  getWebsiteTesterConfig,
  getWebsiteTesterLeadByConfirmHash,
  getWebsiteTesterLeadById,
  markWebsiteTesterLeadFullGuideFailed,
  markWebsiteTesterLeadFullGuideGenerated,
  markWebsiteTesterLeadFullGuideSent,
  markWebsiteTesterLeadReportFailed,
  markWebsiteTesterLeadReportSent,
  refreshWebsiteTesterLeadConfirmToken
} from '../models/websiteTesterAdminModel.js';
import NewsletterSignupModel from '../models/NewsletterSignupModel.js';
import { getCachedAuditResult } from './websiteAuditService.js';
import {
  sendWebsiteTesterDoiMail,
  sendTesterFullGuideMail,
  sendWebsiteTesterReportMail
} from './mailService.js';
import { buildWebsiteTesterReport } from './websiteTesterPdfService.js';
import { formatTesterFullGuideAsText, generateTesterFullGuide } from './testerFullGuideService.js';
import { buildTesterFullGuidePdf } from './testerFullGuidePdfService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_HOURS = 24;
const DEFAULT_FULL_GUIDE_MAX_PAGES = 10;

const I18N = {
  de: {
    errors: {
      emailRequired: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consentRequired: 'Bitte bestätige die kombinierte Einwilligung für Report + Newsletter.',
      auditMissing: 'Das Audit wurde nicht gefunden oder ist abgelaufen. Bitte starte die Analyse erneut.',
      tokenMissing: 'Der Bestätigungslink ist ungültig.',
      tokenInvalid: 'Der Bestätigungslink ist ungültig oder wurde bereits verwendet.',
      tokenExpired: 'Der Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
      reportFailed: 'Der Report konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      newsletterFailed: 'Die Newsletter-Aktivierung ist fehlgeschlagen. Bitte versuche es erneut.',
      fullGuideFailed: 'Die Vollanleitung konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      leadState: 'Diese Aktion ist für den aktuellen Lead-Status nicht möglich.'
    },
    messages: {
      verifyMail: 'Bitte bestätige deine E-Mail-Adresse (Double-Opt-in). Danach senden wir den PDF-Report und aktivieren die Newsletter-Anmeldung.',
      verifiedAndSent: 'Deine E-Mail wurde bestätigt. Der Optimierungsreport wurde soeben versendet.',
      alreadyUsed: 'Die E-Mail-Bestätigung wurde bereits abgeschlossen.',
      doiResent: 'Bestätigungslink wurde erneut versendet.',
      reportResent: 'Der PDF-Report wurde erneut versendet.',
      fullGuideSent: 'Die vollständige Optimierungsanleitung wurde versendet.'
    }
  },
  en: {
    errors: {
      emailRequired: 'Please enter a valid email address.',
      consentRequired: 'Please confirm the combined consent for report + newsletter.',
      auditMissing: 'The audit was not found or has expired. Please run the analysis again.',
      tokenMissing: 'The confirmation link is invalid.',
      tokenInvalid: 'The confirmation link is invalid or already used.',
      tokenExpired: 'The confirmation link has expired. Please request a new link.',
      reportFailed: 'The report could not be sent. Please contact us directly.',
      newsletterFailed: 'Newsletter activation failed. Please try again.',
      fullGuideFailed: 'The full guide could not be sent. Please contact us directly.',
      leadState: 'This action is not possible for the current lead status.'
    },
    messages: {
      verifyMail: 'Please confirm your email address (double opt-in). We will then send the PDF report and activate your newsletter subscription.',
      verifiedAndSent: 'Your email is confirmed. The optimization report has been sent.',
      alreadyUsed: 'Email confirmation was already completed.',
      doiResent: 'Confirmation link has been sent again.',
      reportResent: 'The PDF report has been sent again.',
      fullGuideSent: 'The complete optimization guide has been sent.'
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

async function ensureNewsletterUnsubscribeToken(email) {
  const created = await NewsletterSignupModel.create(email);
  if (created?.unsubscribe_token) return created.unsubscribe_token;
  const fallback = await NewsletterSignupModel.findByEmail(email);
  return fallback?.unsubscribe_token || '';
}

function normalizeFullGuideMaxPages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_FULL_GUIDE_MAX_PAGES;
  return Math.max(1, Math.min(50, parsed));
}

function extractGuidePageAnalysisCount(result = {}) {
  const sourceResult = (result?.sourceResult && typeof result.sourceResult === 'object')
    ? result.sourceResult
    : result;
  const pages = sourceResult?.internalGuideInput?.pageAnalyses;
  return Array.isArray(pages) ? pages.length : 0;
}

function expectedGuidePageLimit(result = {}, configuredMaxPages = DEFAULT_FULL_GUIDE_MAX_PAGES) {
  const available = extractGuidePageAnalysisCount(result);
  if (!Number.isFinite(available) || available < 1) return null;
  return Math.min(available, normalizeFullGuideMaxPages(configuredMaxPages));
}

function shouldRegenerateFullGuide(fullGuide = null, result = {}, configuredMaxPages = DEFAULT_FULL_GUIDE_MAX_PAGES) {
  if (!fullGuide || typeof fullGuide !== 'object') return true;
  const storedLimit = parseInt(fullGuide.pageLimitUsed, 10);
  if (!Number.isFinite(storedLimit)) return true;
  const expectedLimit = expectedGuidePageLimit(result, configuredMaxPages);
  if (!Number.isFinite(expectedLimit)) return false;
  return storedLimit !== expectedLimit;
}

async function generateAndStoreFullGuide({
  lead,
  result,
  profile = 'website',
  locale = 'de',
  maxPages = DEFAULT_FULL_GUIDE_MAX_PAGES
}) {
  try {
    const fullGuide = generateTesterFullGuide({
      result,
      source: profile,
      locale,
      maxPages: normalizeFullGuideMaxPages(maxPages)
    });
    const guideText = formatTesterFullGuideAsText(fullGuide);
    const payload = {
      ...fullGuide,
      guideText
    };
    const updated = await markWebsiteTesterLeadFullGuideGenerated({
      id: lead.id,
      profile,
      fullGuideJson: payload
    });
    return updated?.full_guide_json || payload;
  } catch (error) {
    await markWebsiteTesterLeadFullGuideFailed(lead.id, error.message || 'full_guide_generation_failed');
    return null;
  }
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
    let unsubscribeToken = '';
    try {
      unsubscribeToken = await ensureNewsletterUnsubscribeToken(consumed.email);
    } catch (newsletterError) {
      throw createError(effectiveCopy.errors.newsletterFailed, 500);
    }

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
      report,
      unsubscribeToken
    });

    const config = await getWebsiteTesterConfig();
    await generateAndStoreFullGuide({
      lead: consumed,
      result,
      profile: 'website',
      locale: effectiveLocale,
      maxPages: config?.fullGuideMaxPages
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
    let unsubscribeToken = '';
    try {
      unsubscribeToken = await ensureNewsletterUnsubscribeToken(lead.email);
    } catch {
      throw createError(copy.errors.newsletterFailed, 500);
    }

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
      report,
      unsubscribeToken
    });

    const config = await getWebsiteTesterConfig();
    const configuredMaxPages = normalizeFullGuideMaxPages(config?.fullGuideMaxPages);
    if (shouldRegenerateFullGuide(lead.full_guide_json, result, configuredMaxPages)) {
      await generateAndStoreFullGuide({
        lead,
        result,
        profile: 'website',
        locale: lng,
        maxPages: configuredMaxPages
      });
    }

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

export async function sendWebsiteTesterLeadFullGuide({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead) {
    throw createError('Lead wurde nicht gefunden.', 404);
  }

  const lng = localeFrom(lead.locale);
  const copy = copyFor(lng);
  if (!['confirmed', 'report_failed', 'report_sent'].includes(lead.status)) {
    throw createError(copy.errors.leadState, 400);
  }

  const config = await getWebsiteTesterConfig();
  const configuredMaxPages = normalizeFullGuideMaxPages(config?.fullGuideMaxPages);
  const result = lead.audit_snapshot_json || getCachedAuditResult(lead.audit_id);
  let fullGuide = lead.full_guide_json || null;
  if (shouldRegenerateFullGuide(fullGuide, result, configuredMaxPages)) {
    if (!result) {
      throw createError(copy.errors.auditMissing, 400);
    }
    fullGuide = await generateAndStoreFullGuide({
      lead,
      result,
      profile: 'website',
      locale: lng,
      maxPages: configuredMaxPages
    });
  }

  if (!fullGuide) {
    throw createError(copy.errors.fullGuideFailed, 500);
  }

  try {
    const unsubscribeToken = await ensureNewsletterUnsubscribeToken(lead.email);
    const guideText = fullGuide.guideText || formatTesterFullGuideAsText(fullGuide);
    const guidePdf = buildTesterFullGuidePdf({
      guideText,
      sourceLabel: 'website',
      domain: lead.domain || '',
      locale: lng,
      generatedAt: fullGuide.createdAt || new Date().toISOString()
    });
    await sendTesterFullGuideMail({
      to: lead.email,
      name: lead.name,
      locale: lng,
      domain: lead.domain,
      sourceLabel: lng === 'en' ? 'Website' : 'Website',
      guideText,
      unsubscribeToken,
      guidePdf
    });
    const updated = await markWebsiteTesterLeadFullGuideSent(lead.id);
    return {
      lead: updated || lead,
      message: copy.messages.fullGuideSent
    };
  } catch (error) {
    await markWebsiteTesterLeadFullGuideFailed(lead.id, error.message || copy.errors.fullGuideFailed);
    throw createError(copy.errors.fullGuideFailed, 500);
  }
}

export const __testables = {
  localeFrom,
  cleanEmail,
  hashConfirmToken,
  topIssuesFromResult,
  compactAuditForLead,
  buildConfirmUrl,
  normalizeFullGuideMaxPages,
  expectedGuidePageLimit,
  shouldRegenerateFullGuide
};
