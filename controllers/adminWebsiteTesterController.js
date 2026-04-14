import { randomUUID } from 'crypto';
import {
  getWebsiteTesterLeadById,
  listBrokenLinkAuditRequests,
  listGeoAuditRequests,
  listSeoAuditRequests,
  getWebsiteTesterConfig,
  listWebsiteTesterLeads,
  listWebsiteTesterRequests,
  updateBrokenLinksTesterConfig,
  updateGeoTesterConfig,
  updateSeoTesterConfig,
  updateWebsiteTesterConfig
} from '../models/websiteTesterAdminModel.js';
import {
  sendWebsiteTesterLeadFullGuide,
  resendWebsiteTesterLeadDoi,
  resendWebsiteTesterLeadReport
} from '../services/websiteTesterLeadService.js';
import {
  sendGeoTesterLeadFullGuide,
  resendGeoTesterLeadDoi,
  resendGeoTesterLeadReport
} from '../services/geoTesterLeadService.js';
import {
  sendSeoTesterLeadFullGuide,
  resendSeoTesterLeadDoi,
  resendSeoTesterLeadReport
} from '../services/seoTesterLeadService.js';
import { auditWebsite } from '../services/websiteAuditService.js';
import { auditGeoWebsite, getCachedGeoAuditResult } from '../services/geoAuditService.js';
import { auditSeoWebsite, getCachedSeoAuditResult } from '../services/seoAuditService.js';
import { buildWebsiteTesterReport } from '../services/websiteTesterPdfService.js';
import { buildGeoTesterReport } from '../services/geoTesterPdfService.js';
import { buildSeoTesterReport } from '../services/seoTesterPdfService.js';
import { formatTesterFullGuideAsText, generateTesterFullGuide } from '../services/testerFullGuideService.js';
import { buildTesterFullGuidePdf } from '../services/testerFullGuidePdfService.js';

function parsePositiveInt(value, fallback = 1) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function safeReturnTo(rawValue) {
  const candidate = String(rawValue || '').trim();
  if (!candidate.startsWith('/admin/website-tester')) return '/admin/website-tester';
  return candidate;
}

function withQueryParam(path, key, value) {
  const base = new URL(path, 'https://local.komplettwebdesign.internal');
  base.searchParams.set(key, String(value));
  const query = base.searchParams.toString();
  return `${base.pathname}${query ? `?${query}` : ''}`;
}

function maskEmail(value = '') {
  const email = String(value || '').trim();
  const at = email.indexOf('@');
  if (at <= 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

const PREVIEW_TTL_MS = 60 * 60 * 1000;
const previewStore = new Map();

function normalizeLocale(raw = 'de') {
  return raw === 'en' ? 'en' : 'de';
}

function normalizePreviewSource(raw = 'website') {
  const source = String(raw || '').trim().toLowerCase();
  if (source === 'geo') return 'geo';
  if (source === 'seo') return 'seo';
  return 'website';
}

function extractHostname(value = '') {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.hostname;
  } catch {
    return String(value || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').slice(0, 180);
  }
}

function cleanupPreviewStore(now = Date.now()) {
  for (const [key, value] of previewStore.entries()) {
    if (!value || value.expiresAt <= now) previewStore.delete(key);
  }
}

function savePreview(payload = {}) {
  cleanupPreviewStore();
  const id = randomUUID();
  const record = {
    ...payload,
    id,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + PREVIEW_TTL_MS
  };
  previewStore.set(id, record);
  return record;
}

function getPreview(id = '') {
  cleanupPreviewStore();
  const key = String(id || '').trim();
  if (!key) return null;
  return previewStore.get(key) || null;
}

async function runPreviewAudit({ source, url, locale, context, config }) {
  if (source === 'geo') {
    const publicResult = await auditGeoWebsite({
      url,
      locale,
      maxSubpages: config?.geoMaxSubpages ?? 5,
      scanMode: config?.geoScanMode || 'maximal',
      context
    });
    const detailedResult = getCachedGeoAuditResult(publicResult.auditId) || publicResult;
    return {
      publicResult,
      detailedResult
    };
  }

  if (source === 'seo') {
    const publicResult = await auditSeoWebsite({
      url,
      locale,
      maxSubpages: config?.seoMaxSubpages ?? 5,
      scanMode: config?.seoScanMode || 'maximal',
      context
    });
    const detailedResult = getCachedSeoAuditResult(publicResult.auditId) || publicResult;
    return {
      publicResult,
      detailedResult
    };
  }

  const detailedResult = await auditWebsite({
    url,
    locale,
    mode: 'deep',
    maxSubpages: config?.maxSubpages ?? 5,
    context
  });
  return {
    publicResult: detailedResult,
    detailedResult
  };
}

function buildPreviewShortReport({ source, lead, detailedResult, locale }) {
  if (source === 'geo') {
    return buildGeoTesterReport({
      lead,
      result: detailedResult,
      locale
    });
  }
  if (source === 'seo') {
    return buildSeoTesterReport({
      lead,
      result: detailedResult,
      locale
    });
  }
  return buildWebsiteTesterReport({
    lead,
    result: detailedResult,
    locale
  });
}

export async function websiteTesterPage(req, res) {
  const previewId = String(req.query.preview_id || '').trim();
  const previewRecord = previewId ? getPreview(previewId) : null;
  const requestPage = parsePositiveInt(req.query.req_page, 1);
  const brokenPage = parsePositiveInt(req.query.bl_page, 1);
  const geoPage = parsePositiveInt(req.query.geo_page, 1);
  const seoPage = parsePositiveInt(req.query.seo_page, 1);
  const leadPage = parsePositiveInt(req.query.lead_page, 1);
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '').trim();
  const brokenQ = String(req.query.bl_q || '').trim();
  const brokenStatus = String(req.query.bl_status || '').trim();
  const brokenMode = String(req.query.bl_mode || '').trim();
  const geoQ = String(req.query.geo_q || '').trim();
  const geoStatus = String(req.query.geo_status || '').trim();
  const geoMode = String(req.query.geo_mode || '').trim();
  const seoQ = String(req.query.seo_q || '').trim();
  const seoStatus = String(req.query.seo_status || '').trim();
  const seoMode = String(req.query.seo_mode || '').trim();
  const leadQ = String(req.query.lead_q || '').trim();
  const leadStatus = String(req.query.lead_status || '').trim();
  const leadSource = String(req.query.lead_source || '').trim();
  const leadLocale = String(req.query.lead_locale || '').trim();
  const leadFrom = String(req.query.lead_from || '').trim();
  const leadTo = String(req.query.lead_to || '').trim();
  const leadToEndOfDay = /^\d{4}-\d{2}-\d{2}$/.test(leadTo) ? `${leadTo}T23:59:59.999Z` : leadTo;

  const [config, archive, brokenArchive, geoArchive, seoArchive, leadArchive] = await Promise.all([
    getWebsiteTesterConfig(),
    listWebsiteTesterRequests({
      page: requestPage,
      pageSize: 30,
      q,
      status
    }),
    listBrokenLinkAuditRequests({
      page: brokenPage,
      pageSize: 30,
      q: brokenQ,
      status: brokenStatus,
      mode: brokenMode
    }),
    listGeoAuditRequests({
      page: geoPage,
      pageSize: 30,
      q: geoQ,
      status: geoStatus,
      mode: geoMode
    }),
    listSeoAuditRequests({
      page: seoPage,
      pageSize: 30,
      q: seoQ,
      status: seoStatus,
      mode: seoMode
    }),
    listWebsiteTesterLeads({
      page: leadPage,
      pageSize: 30,
      q: leadQ,
      status: leadStatus,
      source: leadSource,
      locale: leadLocale,
      dateFrom: leadFrom,
      dateTo: leadToEndOfDay
    })
  ]);

  const leadRows = (leadArchive.rows || []).map((row) => ({
    ...row,
    maskedEmail: maskEmail(row.email)
  }));

  res.render('admin/website_tester', {
    title: 'Website-Tester Admin',
    config,
    preview: previewRecord
      ? {
        id: previewRecord.id,
        createdAt: previewRecord.createdAt,
        source: previewRecord.source,
        locale: previewRecord.locale,
        requestedUrl: previewRecord.requestedUrl,
        context: previewRecord.context,
        domain: previewRecord.domain,
        shortReport: {
          filename: previewRecord.shortReport?.filename || '',
          pageCount: previewRecord.shortReport?.pageCount || 0
        },
        fullGuide: {
          filename: previewRecord.fullGuide?.pdf?.filename || '',
          pageCount: previewRecord.fullGuide?.pdf?.pageCount || 0,
          summary: previewRecord.fullGuide?.summary || '',
          topPages: Array.isArray(previewRecord.fullGuide?.topPages) ? previewRecord.fullGuide.topPages : []
        }
      }
      : null,
    archive,
    brokenArchive,
    geoArchive,
    seoArchive,
    leadArchive: {
      ...leadArchive,
      rows: leadRows
    },
    filters: {
      q,
      status,
      brokenQ,
      brokenStatus,
      brokenMode,
      geoQ,
      geoStatus,
      geoMode,
      seoQ,
      seoStatus,
      seoMode,
      leadQ,
      leadStatus,
      leadSource,
      leadLocale,
      leadFrom,
      leadTo
    },
    query: req.query || {}
  });
}

export async function saveWebsiteTesterConfig(req, res) {
  const maxSubpages = parsePositiveInt(req.body.max_subpages, 5);
  await updateWebsiteTesterConfig({ maxSubpages });
  res.redirect('/admin/website-tester?saved=1&settings_tester=website');
}

export async function saveBrokenLinksTesterConfig(req, res) {
  const brokenLinksMaxSubpages = parsePositiveInt(req.body.broken_links_max_subpages, 5);
  const brokenLinksScanMode = String(req.body.broken_links_scan_mode || '').trim().toLowerCase();

  await updateBrokenLinksTesterConfig({
    brokenLinksMaxSubpages,
    brokenLinksScanMode
  });

  res.redirect('/admin/website-tester?saved_broken=1&settings_tester=broken');
}

export async function saveGeoTesterConfig(req, res) {
  const geoMaxSubpages = parsePositiveInt(req.body.geo_max_subpages, 5);
  const geoScanMode = String(req.body.geo_scan_mode || '').trim().toLowerCase();

  await updateGeoTesterConfig({
    geoMaxSubpages,
    geoScanMode
  });

  res.redirect('/admin/website-tester?saved_geo=1&settings_tester=geo');
}

export async function saveSeoTesterConfig(req, res) {
  const seoMaxSubpages = parsePositiveInt(req.body.seo_max_subpages, 5);
  const seoScanMode = String(req.body.seo_scan_mode || '').trim().toLowerCase();

  await updateSeoTesterConfig({
    seoMaxSubpages,
    seoScanMode
  });

  res.redirect('/admin/website-tester?saved_seo=1&settings_tester=seo');
}

async function detectLeadSource(leadId) {
  const lead = await getWebsiteTesterLeadById(leadId);
  return (lead?.source || 'website').toLowerCase();
}

export async function resendWebsiteTesterLeadDoiAction(req, res) {
  const returnTo = safeReturnTo(req.body.return_to || req.get('referer'));
  try {
    const source = await detectLeadSource(req.params.id);
    if (source === 'geo') {
      await resendGeoTesterLeadDoi({ leadId: req.params.id });
    } else if (source === 'seo') {
      await resendSeoTesterLeadDoi({ leadId: req.params.id });
    } else {
      await resendWebsiteTesterLeadDoi({ leadId: req.params.id });
    }
    return res.redirect(withQueryParam(returnTo, 'lead_action', 'doi_resent'));
  } catch (error) {
    return res.redirect(withQueryParam(returnTo, 'lead_error', error.message || 'DOI resend failed'));
  }
}

export async function resendWebsiteTesterLeadReportAction(req, res) {
  const returnTo = safeReturnTo(req.body.return_to || req.get('referer'));
  try {
    const source = await detectLeadSource(req.params.id);
    if (source === 'geo') {
      await resendGeoTesterLeadReport({ leadId: req.params.id });
    } else if (source === 'seo') {
      await resendSeoTesterLeadReport({ leadId: req.params.id });
    } else {
      await resendWebsiteTesterLeadReport({ leadId: req.params.id });
    }
    return res.redirect(withQueryParam(returnTo, 'lead_action', 'report_resent'));
  } catch (error) {
    return res.redirect(withQueryParam(returnTo, 'lead_error', error.message || 'Report resend failed'));
  }
}

export async function sendWebsiteTesterLeadFullGuideAction(req, res) {
  const returnTo = safeReturnTo(req.body.return_to || req.get('referer'));
  try {
    const source = await detectLeadSource(req.params.id);
    if (source === 'geo') {
      await sendGeoTesterLeadFullGuide({ leadId: req.params.id });
    } else if (source === 'seo') {
      await sendSeoTesterLeadFullGuide({ leadId: req.params.id });
    } else {
      await sendWebsiteTesterLeadFullGuide({ leadId: req.params.id });
    }
    return res.redirect(withQueryParam(returnTo, 'lead_action', 'full_guide_sent'));
  } catch (error) {
    return res.redirect(withQueryParam(returnTo, 'lead_error', error.message || 'Full guide send failed'));
  }
}

export async function runWebsiteTesterPreviewAction(req, res) {
  const returnTo = safeReturnTo(req.body.return_to || req.get('referer'));
  const source = normalizePreviewSource(req.body.preview_source);
  const locale = normalizeLocale(req.body.preview_locale);
  const requestedUrl = String(req.body.preview_url || '').trim();
  const context = {
    businessType: String(req.body.preview_business_type || '').trim(),
    primaryService: String(req.body.preview_primary_service || '').trim(),
    targetRegion: String(req.body.preview_target_region || '').trim()
  };

  if (!requestedUrl) {
    return res.redirect(withQueryParam(returnTo, 'preview_error', 'Bitte eine URL für die Vorschau angeben.'));
  }

  if (!context.businessType || !context.primaryService || !context.targetRegion) {
    return res.redirect(withQueryParam(returnTo, 'preview_error', 'Bitte Branche, Hauptleistung und Zielregion für die Vorschau ergänzen.'));
  }

  try {
    const config = await getWebsiteTesterConfig();
    const { publicResult, detailedResult } = await runPreviewAudit({
      source,
      url: requestedUrl,
      locale,
      context,
      config
    });

    const finalUrl = detailedResult?.sourceResult?.finalUrl
      || detailedResult?.finalUrl
      || publicResult?.finalUrl
      || requestedUrl;
    const domain = extractHostname(finalUrl);

    const leadStub = {
      source,
      locale,
      domain,
      overall_score: detailedResult?.overallScore
        || detailedResult?.seoScore?.overall
        || detailedResult?.geoScore?.overall
        || publicResult?.overallScore
        || publicResult?.seoScore?.overall
        || publicResult?.geoScore?.overall
        || null,
      score_band: detailedResult?.scoreBand
        || detailedResult?.seoScore?.band
        || detailedResult?.geoScore?.band
        || publicResult?.scoreBand
        || publicResult?.seoScore?.band
        || publicResult?.geoScore?.band
        || 'mittel'
    };

    const shortReport = buildPreviewShortReport({
      source,
      lead: leadStub,
      detailedResult,
      locale
    });

    const fullGuide = generateTesterFullGuide({
      result: detailedResult,
      source,
      locale
    });
    const guideText = formatTesterFullGuideAsText(fullGuide);
    const guidePdf = buildTesterFullGuidePdf({
      guideText,
      sourceLabel: source,
      domain,
      locale,
      generatedAt: fullGuide.createdAt || new Date().toISOString()
    });

    const record = savePreview({
      source,
      locale,
      requestedUrl,
      context,
      domain,
      shortReport,
      fullGuide: {
        ...fullGuide,
        guideText,
        pdf: guidePdf
      }
    });

    let redirectTo = withQueryParam(returnTo, 'preview_action', 'generated');
    redirectTo = withQueryParam(redirectTo, 'preview_id', record.id);
    return res.redirect(redirectTo);
  } catch (error) {
    const message = error?.message || 'Vorschau konnte nicht erstellt werden.';
    return res.redirect(withQueryParam(returnTo, 'preview_error', message));
  }
}

export async function downloadWebsiteTesterPreviewShortPdf(req, res) {
  const preview = getPreview(req.params.id);
  if (!preview || !preview.shortReport?.buffer) {
    return res.status(404).send('Preview nicht gefunden oder abgelaufen.');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=\"${preview.shortReport.filename || 'kurzanleitung.pdf'}\"`);
  return res.send(preview.shortReport.buffer);
}

export async function downloadWebsiteTesterPreviewFullPdf(req, res) {
  const preview = getPreview(req.params.id);
  if (!preview || !preview.fullGuide?.pdf?.buffer) {
    return res.status(404).send('Preview nicht gefunden oder abgelaufen.');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=\"${preview.fullGuide.pdf.filename || 'vollanleitung.pdf'}\"`);
  return res.send(preview.fullGuide.pdf.buffer);
}

export async function downloadWebsiteTesterPreviewFullText(req, res) {
  const preview = getPreview(req.params.id);
  if (!preview || !preview.fullGuide?.guideText) {
    return res.status(404).send('Preview nicht gefunden oder abgelaufen.');
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=\"vollanleitung.txt\"');
  return res.send(preview.fullGuide.guideText);
}
