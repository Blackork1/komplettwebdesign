import { createHash, randomBytes, randomUUID } from 'crypto';
import NewsletterSignupModel from '../models/NewsletterSignupModel.js';
import {
  createWebsiteTesterLead,
  consumeWebsiteTesterLeadConfirmToken,
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
import { auditMetaWebsite, getCachedMetaAuditResult } from './metaAuditService.js';
import {
  sendMetaTesterDoiMail,
  sendMetaTesterReportMail,
  sendTesterFullGuideMail
} from './mailService.js';
import { buildMetaTesterReport } from './metaTesterPdfService.js';
import { formatTesterFullGuideAsText, generateTesterFullGuide } from './testerFullGuideService.js';
import { buildTesterFullGuidePdf } from './testerFullGuidePdfService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_HOURS = 24;
const DEFAULT_FULL_GUIDE_MAX_PAGES = 10;

const I18N = {
  de: {
    errors: {
      emailRequired: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consentRequired: 'Bitte bestätige die Newsletter-Einwilligung für den Meta-Report.',
      auditMissing: 'Der Meta-Audit wurde nicht gefunden oder ist abgelaufen. Bitte starte den Scan erneut.',
      tokenMissing: 'Der Bestätigungslink ist ungültig.',
      tokenInvalid: 'Der Bestätigungslink ist ungültig oder wurde bereits verwendet.',
      tokenExpired: 'Der Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
      reportFailed: 'Der Meta-Report konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      fullGuideFailed: 'Die vollständige Meta-Anleitung konnte nicht versendet werden. Bitte kontaktiere uns direkt.',
      leadState: 'Diese Aktion ist für den aktuellen Lead-Status nicht möglich.'
    },
    messages: {
      verifyMail: 'Bitte bestätige deine E-Mail-Adresse (Double-Opt-in). Danach senden wir den Meta-Report als PDF.',
      verifiedAndSent: 'Deine E-Mail wurde bestätigt. Der detaillierte Meta-Report wurde versendet.',
      alreadyUsed: 'Die E-Mail-Bestätigung wurde bereits abgeschlossen.',
      doiResent: 'Bestätigungslink wurde erneut versendet.',
      reportResent: 'Der Meta-Report wurde erneut versendet.',
      fullGuideSent: 'Die vollständige Meta-Anleitung wurde versendet.'
    }
  },
  en: {
    errors: {
      emailRequired: 'Please enter a valid email address.',
      consentRequired: 'Please confirm newsletter consent for the meta report.',
      auditMissing: 'The meta audit was not found or has expired. Please run the scan again.',
      tokenMissing: 'The confirmation link is invalid.',
      tokenInvalid: 'The confirmation link is invalid or already used.',
      tokenExpired: 'The confirmation link has expired. Please request a new link.',
      reportFailed: 'The meta report could not be sent. Please contact us directly.',
      fullGuideFailed: 'The complete meta guide could not be sent. Please contact us directly.',
      leadState: 'This action is not possible for the current lead status.'
    },
    messages: {
      verifyMail: 'Please confirm your email address (double opt-in). We will then send your meta report PDF.',
      verifiedAndSent: 'Your email is confirmed. The detailed meta report has been sent.',
      alreadyUsed: 'Email confirmation was already completed.',
      doiResent: 'Confirmation link has been sent again.',
      reportResent: 'The meta report has been sent again.',
      fullGuideSent: 'The complete meta guide has been sent.'
    }
  }
};

function localeFrom(rawLocale) { return rawLocale === 'en' ? 'en' : 'de'; }
function copyFor(locale) { return I18N[localeFrom(locale)]; }
function cleanEmail(email) { return String(email || '').trim().toLowerCase(); }
function cleanName(name) { return String(name || '').trim().slice(0, 180); }
function createError(message, status = 400) { const e = new Error(message); e.status = status; return e; }
function generateRawToken() { return `${randomUUID()}-${randomBytes(16).toString('hex')}`; }
function getTokenExpiryDate() { return new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000); }
function normalizeScoreBand(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'gut' || raw === 'good' || raw === 'strong') return 'gut';
  if (raw === 'mittel' || raw === 'medium' || raw.includes('optimization')) return 'mittel';
  return 'kritisch';
}

export function hashConfirmToken(rawToken = '') {
  return createHash('sha256').update(String(rawToken || '')).digest('hex');
}

function baseUrl() {
  const base = process.env.BASE_URL || process.env.CANONICAL_BASE_URL || 'https://komplettwebdesign.de';
  return String(base).replace(/\/$/, '');
}

function buildConfirmUrl(rawToken, locale) {
  const lng = localeFrom(locale);
  const path = lng === 'en' ? '/en/website-tester/meta/report-confirm' : '/website-tester/meta/report-confirm';
  return `${baseUrl()}${path}?token=${encodeURIComponent(rawToken)}`;
}

function extractDomain(result = {}) {
  const candidate = result?.finalUrl || result?.normalizedUrl || '';
  try { return new URL(candidate).hostname; } catch { return String(candidate || '').slice(0, 300); }
}

function compactMetaAuditForLead(result = {}) {
  const scannedPages = Array.isArray(result.scannedPages) ? result.scannedPages : [];
  return {
    source: 'meta',
    reportProfile: 'meta',
    context: result.context || {},
    metaScore: result.metaScore,
    categories: result.categories || [],
    topFindings: result.topFindings || [],
    topActions: result.topActions || [],
    homepage: result.homepage,
    scannedPages: scannedPages.slice(0, 5),
    internalGuideInput: result.internalGuideInput || null,
    crawlStats: result.crawlStats,
    discoveredSubpages: result.discoveredSubpages,
    finalUrl: result.finalUrl,
    normalizedUrl: result.normalizedUrl,
    fetchedAt: result.fetchedAt
  };
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

function buildConfirmViewModel({ locale, status, lead, message }) {
  const lng = localeFrom(locale || lead?.locale);
  return {
    locale: lng,
    status,
    success: status === 'success',
    message,
    lead,
    links: {
      tester: lng === 'en' ? '/en/website-tester/meta' : '/website-tester/meta',
      contact: lng === 'en' ? '/en/kontakt' : '/kontakt'
    }
  };
}

export async function requestMetaTesterLead({ auditId, email, name, locale, consent, sourceIp, consentText }) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);
  const normalizedEmail = cleanEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) throw createError(copy.errors.emailRequired, 400);
  if (!consent) throw createError(copy.errors.consentRequired, 400);

  const result = getCachedMetaAuditResult(auditId);
  if (!result) throw createError(copy.errors.auditMissing, 400);

  const rawToken = generateRawToken();
  const tokenHash = hashConfirmToken(rawToken);
  const expiresAt = getTokenExpiryDate();
  const domain = extractDomain(result);

  const lead = await createWebsiteTesterLead({
    source: 'meta',
    auditId: result.auditId,
    domain,
    email: normalizedEmail,
    name: cleanName(name),
    locale: lng,
    overallScore: result.metaScore?.overall,
    scoreBand: normalizeScoreBand(result.scoreBand || result.metaScore?.tone),
    topIssues: (result.topActions || result.homepage?.recommendations || []).slice(0, 3).map((entry) => entry?.label || entry?.text || entry),
    auditSnapshotJson: compactMetaAuditForLead(result),
    sourceIp,
    consentText,
    confirmTokenHash: tokenHash,
    confirmExpiresAt: expiresAt
  });

  await sendMetaTesterDoiMail({
    to: lead.email,
    name: lead.name,
    locale: lng,
    domain,
    scoreBand: lead.score_band,
    confirmUrl: buildConfirmUrl(rawToken, lng),
    expiresAt
  });

  return { lead, verificationRequired: true, message: copy.messages.verifyMail };
}

export async function confirmMetaTesterLeadToken({ token, locale }) {
  const lng = localeFrom(locale);
  const copy = copyFor(lng);
  const rawToken = String(token || '').trim();

  if (!rawToken) {
    return buildConfirmViewModel({ locale: lng, status: 'invalid', message: copy.errors.tokenMissing });
  }

  const tokenHash = hashConfirmToken(rawToken);
  const existing = await getWebsiteTesterLeadByConfirmHash(tokenHash);

  if (!existing || (existing.source || 'website') !== 'meta') {
    return buildConfirmViewModel({ locale: lng, status: 'invalid', message: copy.errors.tokenInvalid });
  }

  if (existing.status === 'confirmed' || existing.status === 'report_sent') {
    return buildConfirmViewModel({ locale: existing.locale, status: 'already_used', lead: existing, message: copy.messages.alreadyUsed });
  }

  if (!existing.confirm_expires_at || new Date(existing.confirm_expires_at).getTime() < Date.now()) {
    return buildConfirmViewModel({ locale: existing.locale, status: 'expired', lead: existing, message: copy.errors.tokenExpired });
  }

  const consumed = await consumeWebsiteTesterLeadConfirmToken(tokenHash);
  if (!consumed) {
    return buildConfirmViewModel({ locale: existing.locale, status: 'invalid', lead: existing, message: copy.errors.tokenInvalid });
  }

  const result = getCachedMetaAuditResult(consumed.audit_id) || consumed.audit_snapshot_json || null;
  if (!result) {
    return buildConfirmViewModel({ locale: consumed.locale, status: 'invalid', lead: consumed, message: copy.errors.auditMissing });
  }

  const report = buildMetaTesterReport({ lead: consumed, result, locale: consumed.locale });
  const unsubscribeToken = await ensureNewsletterUnsubscribeToken(consumed.email);

  try {
    await sendMetaTesterReportMail({
      to: consumed.email,
      name: consumed.name,
      locale: consumed.locale,
      domain: consumed.domain,
      scoreBand: consumed.score_band,
      report,
      unsubscribeToken
    });
    await markWebsiteTesterLeadReportSent(consumed.id);
  } catch (error) {
    await markWebsiteTesterLeadReportFailed(consumed.id, error.message || 'meta_report_failed');
    return buildConfirmViewModel({ locale: consumed.locale, status: 'report_failed', lead: consumed, message: copy.errors.reportFailed });
  }

  return buildConfirmViewModel({ locale: consumed.locale, status: 'success', lead: consumed, message: copy.messages.verifiedAndSent });
}

export async function resendMetaTesterLeadDoi({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  const lng = localeFrom(lead?.locale);
  const copy = copyFor(lng);
  if (!lead) throw createError(copy.errors.tokenInvalid, 404);
  if (lead.status === 'confirmed' || lead.status === 'report_sent') throw createError(copy.errors.leadState, 400);

  const rawToken = generateRawToken();
  const tokenHash = hashConfirmToken(rawToken);
  const expiresAt = getTokenExpiryDate();
  const updated = await refreshWebsiteTesterLeadConfirmToken({
    id: lead.id,
    confirmTokenHash: tokenHash,
    confirmExpiresAt: expiresAt
  });

  await sendMetaTesterDoiMail({
    to: lead.email,
    name: lead.name,
    locale: updated?.locale || lng,
    domain: lead.domain,
    scoreBand: lead.score_band,
    confirmUrl: buildConfirmUrl(rawToken, updated?.locale || lng),
    expiresAt
  });

  return { success: true, message: copy.messages.doiResent };
}

export async function resendMetaTesterLeadReport({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  const lng = localeFrom(lead?.locale);
  const copy = copyFor(lng);
  if (!lead) throw createError(copy.errors.tokenInvalid, 404);
  if (lead.status !== 'confirmed' && lead.status !== 'report_sent') throw createError(copy.errors.leadState, 400);

  const result = lead.audit_snapshot_json || getCachedMetaAuditResult(lead.audit_id);
  if (!result) throw createError(copy.errors.auditMissing, 400);

  const report = buildMetaTesterReport({ lead, result, locale: lead.locale });
  const unsubscribeToken = await ensureNewsletterUnsubscribeToken(lead.email);

  try {
    await sendMetaTesterReportMail({
      to: lead.email,
      name: lead.name,
      locale: lead.locale,
      domain: lead.domain,
      scoreBand: lead.score_band,
      report,
      unsubscribeToken
    });
    await markWebsiteTesterLeadReportSent(lead.id);
  } catch (error) {
    await markWebsiteTesterLeadReportFailed(lead.id, error.message || 'meta_report_failed');
    throw createError(copy.errors.reportFailed, 500);
  }

  return { success: true, message: copy.messages.reportResent };
}

export async function sendMetaTesterLeadFullGuide({ leadId }) {
  const lead = await getWebsiteTesterLeadById(leadId);
  const lng = localeFrom(lead?.locale);
  const copy = copyFor(lng);
  if (!lead) throw createError(copy.errors.tokenInvalid, 404);

  const config = await getWebsiteTesterConfig();
  const configuredMaxPages = normalizeFullGuideMaxPages(config?.fullGuideMaxPages);
  const baseResult = lead.audit_snapshot_json || getCachedMetaAuditResult(lead.audit_id);
  if (!baseResult) throw createError(copy.errors.auditMissing, 400);

  let guidePayload = lead.full_guide_json || null;
  const storedLimit = parseInt(guidePayload?.pageLimitUsed, 10);
  let needsRegeneration = !guidePayload || !Number.isFinite(storedLimit);
  let deepResult = null;

  if (!needsRegeneration && storedLimit !== configuredMaxPages) {
    try {
      const deepUrl = /^https?:\/\//i.test(lead.domain || '') ? lead.domain : `https://${lead.domain}`;
      const context = {
        businessType: String(baseResult?.context?.businessType || '').trim(),
        primaryService: String(baseResult?.context?.primaryService || '').trim(),
        targetRegion: String(baseResult?.context?.targetRegion || '').trim()
      };
      const deepPublic = await auditMetaWebsite({
        url: deepUrl,
        locale: lead.locale,
        maxSubpages: 50,
        context
      });
      deepResult = getCachedMetaAuditResult(deepPublic.auditId) || baseResult;
    } catch {
      deepResult = baseResult;
    }

    const expectedLimit = expectedGuidePageLimit(deepResult, configuredMaxPages);
    if (!Number.isFinite(expectedLimit) || expectedLimit !== storedLimit) {
      needsRegeneration = true;
    }
  }

  if (needsRegeneration) {
    if (!deepResult) {
      try {
        const deepUrl = /^https?:\/\//i.test(lead.domain || '') ? lead.domain : `https://${lead.domain}`;
        const context = {
          businessType: String(baseResult?.context?.businessType || '').trim(),
          primaryService: String(baseResult?.context?.primaryService || '').trim(),
          targetRegion: String(baseResult?.context?.targetRegion || '').trim()
        };
        const deepPublic = await auditMetaWebsite({
          url: deepUrl,
          locale: lead.locale,
          maxSubpages: 50,
          context
        });
        deepResult = getCachedMetaAuditResult(deepPublic.auditId) || baseResult;
      } catch {
        deepResult = baseResult;
      }
    }

    try {
      const fullGuide = generateTesterFullGuide({
        result: deepResult,
        source: 'meta',
        locale: lead.locale,
        maxPages: configuredMaxPages
      });
      const guideText = formatTesterFullGuideAsText(fullGuide);
      guidePayload = { ...fullGuide, guideText };
      await markWebsiteTesterLeadFullGuideGenerated({
        id: lead.id,
        profile: 'meta',
        fullGuideJson: guidePayload
      });
    } catch (error) {
      await markWebsiteTesterLeadFullGuideFailed(lead.id, error.message || 'meta_full_guide_generation_failed');
      throw createError(copy.errors.fullGuideFailed, 500);
    }
  }

  const unsubscribeToken = await ensureNewsletterUnsubscribeToken(lead.email);
  const guidePdf = buildTesterFullGuidePdf({
    guideText: guidePayload.guideText,
    sourceLabel: 'Meta',
    domain: lead.domain,
    locale: lead.locale,
    generatedAt: guidePayload.createdAt || new Date().toISOString()
  });

  try {
    await sendTesterFullGuideMail({
      to: lead.email,
      name: lead.name,
      locale: lead.locale,
      domain: lead.domain,
      sourceLabel: 'Meta',
      guideText: guidePayload.guideText,
      unsubscribeToken,
      guidePdf
    });
    await markWebsiteTesterLeadFullGuideSent(lead.id);
  } catch (error) {
    await markWebsiteTesterLeadFullGuideFailed(lead.id, error.message || 'meta_full_guide_send_failed');
    throw createError(copy.errors.fullGuideFailed, 500);
  }

  return { success: true, message: copy.messages.fullGuideSent };
}

export const __testables = {
  normalizeFullGuideMaxPages,
  expectedGuidePageLimit
};
