import { createHash, randomBytes, randomUUID } from 'crypto';
import NewsletterSignupModel from '../models/NewsletterSignupModel.js';
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
import { getCachedSeoAuditResult } from './seoAuditService.js';
import {
  sendSeoTesterDoiMail,
  sendSeoTesterReportMail,
  sendTesterFullGuideMail
} from './mailService.js';
import { buildSeoTesterReport } from './seoTesterPdfService.js';
import { formatTesterFullGuideAsText, generateTesterFullGuide } from './testerFullGuideService.js';
import { buildTesterFullGuidePdf } from './testerFullGuidePdfService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_HOURS = 24;
const DEFAULT_FULL_GUIDE_MAX_PAGES = 10;

const I18N = {
  de: {
    errors: {
      emailRequired: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consentRequired: 'Bitte bestätige die Newsletter-Einwilligung für den SEO-Report.',
      auditMissing: 'Das SEO-Audit wurde nicht gefunden oder ist abgelaufen. Bitte starte den Scan erneut.',
      tokenMissing: 'Der Bestätigungslink ist ungültig.',
      tokenInvalid: 'Der Bestätigungslink ist ungültig oder wurde bereits verwendet.',
      tokenExpired: 'Der Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
      reportFailed: 'Der SEO-Report konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      fullGuideFailed: 'Die vollständige SEO-Anleitung konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      leadState: 'Diese Aktion ist für den aktuellen Lead-Status nicht möglich.'
    },
    messages: {
      verifyMail: 'Bitte bestätige deine E-Mail-Adresse (Double-Opt-in). Danach senden wir den detaillierten SEO-Report und aktivieren die Newsletter-Anmeldung.',
      verifiedAndSent: 'Deine E-Mail wurde bestätigt. Der detaillierte SEO-Report wurde versendet.',
      alreadyUsed: 'Die E-Mail-Bestätigung wurde bereits abgeschlossen.',
      doiResent: 'Bestätigungslink wurde erneut versendet.',
      reportResent: 'Der SEO-Report wurde erneut versendet.',
      fullGuideSent: 'Die vollständige SEO-Anleitung wurde versendet.'
    }
  },
  en: {
    errors: {
      emailRequired: 'Please enter a valid email address.',
      consentRequired: 'Please confirm newsletter consent for the SEO report.',
      auditMissing: 'The SEO audit was not found or has expired. Please run the scan again.',
      tokenMissing: 'The confirmation link is invalid.',
      tokenInvalid: 'The confirmation link is invalid or already used.',
      tokenExpired: 'The confirmation link has expired. Please request a new link.',
      reportFailed: 'The SEO report could not be sent. Please contact us directly.',
      fullGuideFailed: 'The complete SEO guide could not be sent. Please contact us directly.',
      leadState: 'This action is not possible for the current lead status.'
    },
    messages: {
      verifyMail: 'Please confirm your email address (double opt-in). We will then send the detailed SEO report and activate your newsletter subscription.',
      verifiedAndSent: 'Your email is confirmed. The detailed SEO report has been sent.',
      alreadyUsed: 'Email confirmation was already completed.',
      doiResent: 'Confirmation link has been sent again.',
      reportResent: 'The SEO report has been sent again.',
      fullGuideSent: 'The complete SEO guide has been sent.'
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
  profile = 'seo',
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
    const unsubscribeToken = await ensureNewsletterUnsubscribeToken(consumed.email);
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
      report,
      unsubscribeToken
    });

    const config = await getWebsiteTesterConfig();
    await generateAndStoreFullGuide({
      lead: consumed,
      result,
      profile: 'seo',
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
    const unsubscribeToken = await ensureNewsletterUnsubscribeToken(lead.email);
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
      report,
      unsubscribeToken
    });

    const config = await getWebsiteTesterConfig();
    const configuredMaxPages = normalizeFullGuideMaxPages(config?.fullGuideMaxPages);
    if (shouldRegenerateFullGuide(lead.full_guide_json, result, configuredMaxPages)) {
      await generateAndStoreFullGuide({
        lead,
        result,
        profile: 'seo',
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

export async function sendSeoTesterLeadFullGuide({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  if (!lead || (lead.source || 'website') !== 'seo') {
    throw createError('Lead wurde nicht gefunden.', 404);
  }

  const lng = localeFrom(lead.locale);
  const copy = copyFor(lng);
  if (!['confirmed', 'report_failed', 'report_sent'].includes(lead.status)) {
    throw createError(copy.errors.leadState, 400);
  }

  const config = await getWebsiteTesterConfig();
  const configuredMaxPages = normalizeFullGuideMaxPages(config?.fullGuideMaxPages);
  const result = lead.audit_snapshot_json || getCachedSeoAuditResult(lead.audit_id);
  let fullGuide = lead.full_guide_json || null;
  if (shouldRegenerateFullGuide(fullGuide, result, configuredMaxPages)) {
    if (!result) {
      throw createError(copy.errors.auditMissing, 400);
    }
    fullGuide = await generateAndStoreFullGuide({
      lead,
      result,
      profile: 'seo',
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
      sourceLabel: 'seo',
      domain: lead.domain || '',
      locale: lng,
      generatedAt: fullGuide.createdAt || new Date().toISOString()
    });
    await sendTesterFullGuideMail({
      to: lead.email,
      name: lead.name,
      locale: lng,
      domain: lead.domain,
      sourceLabel: 'SEO',
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
  buildConfirmUrl,
  compactSeoAuditForLead,
  topIssuesFromSeoResult,
  normalizeFullGuideMaxPages,
  expectedGuidePageLimit,
  shouldRegenerateFullGuide
};
