import {
  getWebsiteTesterConfig,
  listWebsiteTesterLeads,
  listWebsiteTesterRequests,
  updateWebsiteTesterConfig
} from '../models/websiteTesterAdminModel.js';
import {
  resendWebsiteTesterLeadDoi,
  resendWebsiteTesterLeadReport
} from '../services/websiteTesterLeadService.js';

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
  const leadPage = parsePositiveInt(req.query.lead_page, 1);
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '').trim();
  const leadQ = String(req.query.lead_q || '').trim();
  const leadStatus = String(req.query.lead_status || '').trim();
  const leadLocale = String(req.query.lead_locale || '').trim();
  const leadFrom = String(req.query.lead_from || '').trim();
  const leadTo = String(req.query.lead_to || '').trim();
  const leadToEndOfDay = /^\d{4}-\d{2}-\d{2}$/.test(leadTo) ? `${leadTo}T23:59:59.999Z` : leadTo;

  const [config, archive, leadArchive] = await Promise.all([
    getWebsiteTesterConfig(),
    listWebsiteTesterRequests({
      page: requestPage,
      pageSize: 30,
      q,
      status
    }),
    listWebsiteTesterLeads({
      page: leadPage,
      pageSize: 30,
      q: leadQ,
      status: leadStatus,
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
    leadArchive: {
      ...leadArchive,
      rows: leadRows
    },
    filters: {
      q,
      status,
      leadQ,
      leadStatus,
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

export async function resendWebsiteTesterLeadDoiAction(req, res) {
  const returnTo = safeReturnTo(req.body.return_to || req.get('referer'));
  try {
    await resendWebsiteTesterLeadDoi({ leadId: req.params.id });
    return res.redirect(withQueryParam(returnTo, 'lead_action', 'doi_resent'));
  } catch (error) {
    return res.redirect(withQueryParam(returnTo, 'lead_error', error.message || 'DOI resend failed'));
  }
}

export async function resendWebsiteTesterLeadReportAction(req, res) {
  const returnTo = safeReturnTo(req.body.return_to || req.get('referer'));
  try {
    await resendWebsiteTesterLeadReport({ leadId: req.params.id });
    return res.redirect(withQueryParam(returnTo, 'lead_action', 'report_resent'));
  } catch (error) {
    return res.redirect(withQueryParam(returnTo, 'lead_error', error.message || 'Report resend failed'));
  }
}
