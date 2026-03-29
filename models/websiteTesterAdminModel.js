import pool from '../util/db.js';

const DEFAULT_MAX_SUBPAGES = 5;
const MIN_MAX_SUBPAGES = 1;
const MAX_MAX_SUBPAGES = 20;
const DEFAULT_PAGE_SIZE = 30;
const LEAD_STATUSES = new Set(['pending', 'confirmed', 'report_sent', 'report_failed']);

let ensurePromise = null;

function clampMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function clampPage(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function clampPageSize(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, 100);
}

function normalizeLocale(rawValue) {
  return rawValue === 'en' ? 'en' : 'de';
}

function normalizeLeadStatus(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  return LEAD_STATUSES.has(value) ? value : '';
}

function normalizeDate(rawValue) {
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function topIssuesToText(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.filter(Boolean).join(' | ').slice(0, 1200);
  }
  return String(rawValue || '').slice(0, 1200);
}

async function ensureTables() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_tester_config (
        id INT PRIMARY KEY CHECK (id = 1),
        max_subpages INT NOT NULL DEFAULT ${DEFAULT_MAX_SUBPAGES},
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      INSERT INTO website_tester_config (id, max_subpages)
      VALUES (1, ${DEFAULT_MAX_SUBPAGES})
      ON CONFLICT (id) DO NOTHING
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_tester_requests (
        id BIGSERIAL PRIMARY KEY,
        audit_id TEXT,
        requested_url TEXT NOT NULL,
        normalized_url TEXT,
        final_url TEXT,
        locale VARCHAR(8) NOT NULL DEFAULT 'de',
        mode VARCHAR(16) NOT NULL DEFAULT 'deep',
        status VARCHAR(16) NOT NULL DEFAULT 'success',
        error_message TEXT,
        overall_score INT,
        score_band VARCHAR(16),
        crawl_planned_pages INT,
        crawl_visited_pages INT,
        crawl_failed_pages INT,
        http_status INT,
        load_time_ms INT,
        source_ip TEXT,
        top_issues TEXT,
        result_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_requests_created
      ON website_tester_requests (created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_requests_status
      ON website_tester_requests (status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_requests_score_band
      ON website_tester_requests (score_band)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_tester_leads (
        id BIGSERIAL PRIMARY KEY,
        audit_id TEXT,
        domain TEXT,
        email TEXT NOT NULL,
        name TEXT,
        locale VARCHAR(8) NOT NULL DEFAULT 'de',
        status VARCHAR(24) NOT NULL DEFAULT 'pending',
        overall_score INT,
        score_band VARCHAR(16),
        top_issues TEXT,
        audit_snapshot_json JSONB,
        source_ip TEXT,
        consent_text TEXT,
        consent_at TIMESTAMPTZ,
        confirm_token_hash TEXT,
        confirm_expires_at TIMESTAMPTZ,
        confirmed_at TIMESTAMPTZ,
        report_sent_at TIMESTAMPTZ,
        report_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_leads_created
      ON website_tester_leads (created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_leads_status
      ON website_tester_leads (status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_leads_locale
      ON website_tester_leads (locale)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_leads_email
      ON website_tester_leads (email)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_leads_audit
      ON website_tester_leads (audit_id)
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wt_leads_confirm_hash_unique
      ON website_tester_leads (confirm_token_hash)
      WHERE confirm_token_hash IS NOT NULL
    `);
  })();

  try {
    await ensurePromise;
  } catch (error) {
    ensurePromise = null;
    throw error;
  }
}

export async function getWebsiteTesterConfig() {
  await ensureTables();
  const { rows } = await pool.query(`
    SELECT max_subpages, updated_at
    FROM website_tester_config
    WHERE id = 1
    LIMIT 1
  `);
  const row = rows[0] || {};
  return {
    maxSubpages: clampMaxSubpages(row.max_subpages),
    updatedAt: row.updated_at || null
  };
}

export async function updateWebsiteTesterConfig({ maxSubpages }) {
  await ensureTables();
  const clamped = clampMaxSubpages(maxSubpages);
  const { rows } = await pool.query(`
    INSERT INTO website_tester_config (id, max_subpages, updated_at)
    VALUES (1, $1, NOW())
    ON CONFLICT (id) DO UPDATE
    SET max_subpages = EXCLUDED.max_subpages,
        updated_at = NOW()
    RETURNING max_subpages, updated_at
  `, [clamped]);
  return {
    maxSubpages: clampMaxSubpages(rows[0]?.max_subpages),
    updatedAt: rows[0]?.updated_at || null
  };
}

export async function archiveWebsiteTesterRequest(payload = {}) {
  await ensureTables();

  const topIssues = topIssuesToText(payload.topIssues);

  await pool.query(`
    INSERT INTO website_tester_requests (
      audit_id,
      requested_url,
      normalized_url,
      final_url,
      locale,
      mode,
      status,
      error_message,
      overall_score,
      score_band,
      crawl_planned_pages,
      crawl_visited_pages,
      crawl_failed_pages,
      http_status,
      load_time_ms,
      source_ip,
      top_issues,
      result_json
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
    )
  `, [
    payload.auditId || null,
    String(payload.requestedUrl || '').slice(0, 2000),
    payload.normalizedUrl || null,
    payload.finalUrl || null,
    payload.locale === 'en' ? 'en' : 'de',
    payload.mode || 'deep',
    payload.status === 'error' ? 'error' : 'success',
    payload.errorMessage || null,
    Number.isFinite(payload.overallScore) ? payload.overallScore : null,
    payload.scoreBand || null,
    Number.isFinite(payload.crawlPlannedPages) ? payload.crawlPlannedPages : null,
    Number.isFinite(payload.crawlVisitedPages) ? payload.crawlVisitedPages : null,
    Number.isFinite(payload.crawlFailedPages) ? payload.crawlFailedPages : null,
    Number.isFinite(payload.httpStatus) ? payload.httpStatus : null,
    Number.isFinite(payload.loadTimeMs) ? payload.loadTimeMs : null,
    payload.sourceIp || null,
    topIssues || null,
    payload.resultJson || null
  ]);
}

export async function createWebsiteTesterLead(payload = {}) {
  await ensureTables();

  const { rows } = await pool.query(`
    INSERT INTO website_tester_leads (
      audit_id,
      domain,
      email,
      name,
      locale,
      status,
      overall_score,
      score_band,
      top_issues,
      audit_snapshot_json,
      source_ip,
      consent_text,
      consent_at,
      confirm_token_hash,
      confirm_expires_at,
      created_at,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,NOW(),$12,$13,NOW(),NOW()
    )
    RETURNING *
  `, [
    payload.auditId || null,
    payload.domain || null,
    String(payload.email || '').trim().toLowerCase().slice(0, 320),
    String(payload.name || '').trim().slice(0, 180) || null,
    normalizeLocale(payload.locale),
    Number.isFinite(payload.overallScore) ? payload.overallScore : null,
    String(payload.scoreBand || '').trim().slice(0, 16) || null,
    topIssuesToText(payload.topIssues) || null,
    payload.auditSnapshotJson || null,
    payload.sourceIp || null,
    String(payload.consentText || '').trim().slice(0, 1000) || null,
    payload.confirmTokenHash || null,
    payload.confirmExpiresAt ? new Date(payload.confirmExpiresAt) : null
  ]);

  return rows[0] || null;
}

export async function getWebsiteTesterLeadById(id) {
  await ensureTables();
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  const { rows } = await pool.query(`
    SELECT *
    FROM website_tester_leads
    WHERE id = $1
    LIMIT 1
  `, [parsed]);
  return rows[0] || null;
}

export async function getWebsiteTesterLeadByConfirmHash(confirmTokenHash) {
  await ensureTables();
  if (!confirmTokenHash) return null;
  const { rows } = await pool.query(`
    SELECT *
    FROM website_tester_leads
    WHERE confirm_token_hash = $1
    LIMIT 1
  `, [confirmTokenHash]);
  return rows[0] || null;
}

export async function consumeWebsiteTesterLeadConfirmToken(confirmTokenHash) {
  await ensureTables();
  if (!confirmTokenHash) return null;

  const { rows } = await pool.query(`
    UPDATE website_tester_leads
    SET status = 'confirmed',
        confirmed_at = NOW(),
        updated_at = NOW(),
        confirm_token_hash = NULL,
        confirm_expires_at = NULL
    WHERE confirm_token_hash = $1
      AND status = 'pending'
      AND confirm_expires_at IS NOT NULL
      AND confirm_expires_at > NOW()
    RETURNING *
  `, [confirmTokenHash]);

  return rows[0] || null;
}

export async function refreshWebsiteTesterLeadConfirmToken({ id, confirmTokenHash, confirmExpiresAt }) {
  await ensureTables();
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  if (!confirmTokenHash) return null;

  const { rows } = await pool.query(`
    UPDATE website_tester_leads
    SET confirm_token_hash = $2,
        confirm_expires_at = $3,
        updated_at = NOW()
    WHERE id = $1
      AND status = 'pending'
    RETURNING *
  `, [parsed, confirmTokenHash, confirmExpiresAt ? new Date(confirmExpiresAt) : null]);

  return rows[0] || null;
}

export async function markWebsiteTesterLeadReportSent(id) {
  await ensureTables();
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  const { rows } = await pool.query(`
    UPDATE website_tester_leads
    SET status = 'report_sent',
        report_sent_at = NOW(),
        report_error = NULL,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [parsed]);
  return rows[0] || null;
}

export async function markWebsiteTesterLeadReportFailed(id, errorMessage = '') {
  await ensureTables();
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  const { rows } = await pool.query(`
    UPDATE website_tester_leads
    SET status = 'report_failed',
        report_error = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [parsed, String(errorMessage || '').slice(0, 3000) || null]);
  return rows[0] || null;
}

export async function listWebsiteTesterRequests(options = {}) {
  await ensureTables();

  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const offset = (page - 1) * pageSize;

  const status = String(options.status || '').trim();
  const q = String(options.q || '').trim();

  const where = [];
  const values = [];
  const bind = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (status === 'success' || status === 'error') {
    where.push(`status = ${bind(status)}`);
  }

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
    const ref = bind(pattern);
    where.push(`(requested_url ILIKE ${ref} ESCAPE '\\' OR COALESCE(final_url, '') ILIKE ${ref} ESCAPE '\\')`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countValues = [...values];
  const listValues = [...values];
  listValues.push(pageSize, offset);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM website_tester_requests
    ${whereSql}
  `;
  const listSql = `
    SELECT *
    FROM website_tester_requests
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT $${listValues.length - 1}
    OFFSET $${listValues.length}
  `;

  const [countRes, listRes] = await Promise.all([
    pool.query(countSql, countValues),
    pool.query(listSql, listValues)
  ]);

  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows: listRes.rows,
    total,
    page,
    pageSize,
    totalPages
  };
}

export async function listWebsiteTesterLeads(options = {}) {
  await ensureTables();

  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const offset = (page - 1) * pageSize;

  const status = normalizeLeadStatus(options.status);
  const locale = String(options.locale || '').trim() === 'en' ? 'en' : (String(options.locale || '').trim() === 'de' ? 'de' : '');
  const q = String(options.q || '').trim();
  const dateFrom = normalizeDate(options.dateFrom);
  const dateTo = normalizeDate(options.dateTo);

  const where = [];
  const values = [];
  const bind = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (status) where.push(`status = ${bind(status)}`);
  if (locale) where.push(`locale = ${bind(locale)}`);

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
    const ref = bind(pattern);
    where.push(`(
      COALESCE(domain, '') ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(email, '') ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(audit_id, '') ILIKE ${ref} ESCAPE '\\'
    )`);
  }

  if (dateFrom) where.push(`created_at >= ${bind(dateFrom)}`);
  if (dateTo) where.push(`created_at <= ${bind(dateTo)}`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countValues = [...values];
  const listValues = [...values];
  listValues.push(pageSize, offset);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM website_tester_leads
    ${whereSql}
  `;
  const listSql = `
    SELECT *
    FROM website_tester_leads
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT $${listValues.length - 1}
    OFFSET $${listValues.length}
  `;

  const [countRes, listRes] = await Promise.all([
    pool.query(countSql, countValues),
    pool.query(listSql, listValues)
  ]);

  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows: listRes.rows,
    total,
    page,
    pageSize,
    totalPages
  };
}

export async function deleteExpiredPendingWebsiteTesterLeads(days = 14) {
  await ensureTables();
  const parsedDays = Math.max(1, Math.min(180, parseInt(days, 10) || 14));
  const { rowCount } = await pool.query(`
    DELETE FROM website_tester_leads
    WHERE status = 'pending'
      AND created_at < NOW() - make_interval(days => $1)
  `, [parsedDays]);
  return rowCount || 0;
}

export const __testables = {
  clampMaxSubpages,
  clampPage,
  clampPageSize,
  normalizeLeadStatus,
  normalizeDate,
  topIssuesToText
};
