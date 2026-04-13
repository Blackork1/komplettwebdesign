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
  resendWebsiteTesterLeadDoi,
  resendWebsiteTesterLeadReport
} from '../services/websiteTesterLeadService.js';
import {
  resendGeoTesterLeadDoi,
  resendGeoTesterLeadReport
} from '../services/geoTesterLeadService.js';
import {
  resendSeoTesterLeadDoi,
  resendSeoTesterLeadReport
} from '../services/seoTesterLeadService.js';

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

export async function websiteTesterPage(req, res) {
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
  res.redirect('/admin/website-tester?saved=1');
}

export async function saveBrokenLinksTesterConfig(req, res) {
  const brokenLinksMaxSubpages = parsePositiveInt(req.body.broken_links_max_subpages, 5);
  const brokenLinksScanMode = String(req.body.broken_links_scan_mode || '').trim().toLowerCase();

  await updateBrokenLinksTesterConfig({
    brokenLinksMaxSubpages,
    brokenLinksScanMode
  });

  res.redirect('/admin/website-tester?saved_broken=1');
}

export async function saveGeoTesterConfig(req, res) {
  const geoMaxSubpages = parsePositiveInt(req.body.geo_max_subpages, 5);
  const geoScanMode = String(req.body.geo_scan_mode || '').trim().toLowerCase();

  await updateGeoTesterConfig({
    geoMaxSubpages,
    geoScanMode
  });

  res.redirect('/admin/website-tester?saved_geo=1');
}

export async function saveSeoTesterConfig(req, res) {
  const seoMaxSubpages = parsePositiveInt(req.body.seo_max_subpages, 5);
  const seoScanMode = String(req.body.seo_scan_mode || '').trim().toLowerCase();

  await updateSeoTesterConfig({
    seoMaxSubpages,
    seoScanMode
  });

  res.redirect('/admin/website-tester?saved_seo=1');
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
