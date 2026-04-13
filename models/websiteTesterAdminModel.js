import pool from '../util/db.js';

const DEFAULT_MAX_SUBPAGES = 5;
const MIN_MAX_SUBPAGES = 1;
const MAX_MAX_SUBPAGES = 20;
const DEFAULT_BROKEN_LINKS_MAX_SUBPAGES = 5;
const DEFAULT_BROKEN_LINKS_SCAN_MODE = 'maximal';
const DEFAULT_GEO_MAX_SUBPAGES = 5;
const DEFAULT_GEO_SCAN_MODE = 'maximal';
const DEFAULT_SEO_MAX_SUBPAGES = 5;
const DEFAULT_SEO_SCAN_MODE = 'maximal';
const BROKEN_LINK_SCAN_MODES = new Set(['schnell', 'balanced', 'maximal']);
const GEO_SCAN_MODES = new Set(['schnell', 'balanced', 'maximal']);
const SEO_SCAN_MODES = new Set(['schnell', 'balanced', 'maximal']);
const DEFAULT_PAGE_SIZE = 30;
const LEAD_STATUSES = new Set(['pending', 'confirmed', 'report_sent', 'report_failed']);
const LEAD_SOURCES = new Set(['website', 'geo', 'seo']);

let ensurePromise = null;

function clampMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function clampBrokenLinksMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_BROKEN_LINKS_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function normalizeBrokenLinksScanMode(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  return BROKEN_LINK_SCAN_MODES.has(value) ? value : DEFAULT_BROKEN_LINKS_SCAN_MODE;
}

function clampGeoMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GEO_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function normalizeGeoScanMode(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  return GEO_SCAN_MODES.has(value) ? value : DEFAULT_GEO_SCAN_MODE;
}

function clampSeoMaxSubpages(rawValue) {
  const parsed = parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SEO_MAX_SUBPAGES;
  return Math.max(MIN_MAX_SUBPAGES, Math.min(MAX_MAX_SUBPAGES, parsed));
}

function normalizeSeoScanMode(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  return SEO_SCAN_MODES.has(value) ? value : DEFAULT_SEO_SCAN_MODE;
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

function normalizeLeadSource(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  return LEAD_SOURCES.has(value) ? value : '';
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
        broken_links_max_subpages INT NOT NULL DEFAULT ${DEFAULT_BROKEN_LINKS_MAX_SUBPAGES},
        broken_links_scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_BROKEN_LINKS_SCAN_MODE}',
        geo_max_subpages INT NOT NULL DEFAULT ${DEFAULT_GEO_MAX_SUBPAGES},
        geo_scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_GEO_SCAN_MODE}',
        seo_max_subpages INT NOT NULL DEFAULT ${DEFAULT_SEO_MAX_SUBPAGES},
        seo_scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_SEO_SCAN_MODE}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE website_tester_config
      ADD COLUMN IF NOT EXISTS broken_links_max_subpages INT NOT NULL DEFAULT ${DEFAULT_BROKEN_LINKS_MAX_SUBPAGES}
    `);
    await pool.query(`
      ALTER TABLE website_tester_config
      ADD COLUMN IF NOT EXISTS broken_links_scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_BROKEN_LINKS_SCAN_MODE}'
    `);
    await pool.query(`
      ALTER TABLE website_tester_config
      ADD COLUMN IF NOT EXISTS geo_max_subpages INT NOT NULL DEFAULT ${DEFAULT_GEO_MAX_SUBPAGES}
    `);
    await pool.query(`
      ALTER TABLE website_tester_config
      ADD COLUMN IF NOT EXISTS geo_scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_GEO_SCAN_MODE}'
    `);
    await pool.query(`
      ALTER TABLE website_tester_config
      ADD COLUMN IF NOT EXISTS seo_max_subpages INT NOT NULL DEFAULT ${DEFAULT_SEO_MAX_SUBPAGES}
    `);
    await pool.query(`
      ALTER TABLE website_tester_config
      ADD COLUMN IF NOT EXISTS seo_scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_SEO_SCAN_MODE}'
    `);

    await pool.query(`
      INSERT INTO website_tester_config (
        id,
        max_subpages,
        broken_links_max_subpages,
        broken_links_scan_mode,
        geo_max_subpages,
        geo_scan_mode,
        seo_max_subpages,
        seo_scan_mode
      )
      VALUES (
        1,
        ${DEFAULT_MAX_SUBPAGES},
        ${DEFAULT_BROKEN_LINKS_MAX_SUBPAGES},
        '${DEFAULT_BROKEN_LINKS_SCAN_MODE}',
        ${DEFAULT_GEO_MAX_SUBPAGES},
        '${DEFAULT_GEO_SCAN_MODE}',
        ${DEFAULT_SEO_MAX_SUBPAGES},
        '${DEFAULT_SEO_SCAN_MODE}'
      )
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
        source VARCHAR(16) NOT NULL DEFAULT 'website',
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
      ALTER TABLE website_tester_leads
      ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'website'
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
      CREATE INDEX IF NOT EXISTS idx_wt_leads_source
      ON website_tester_leads (source)
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_tester_broken_link_requests (
        id BIGSERIAL PRIMARY KEY,
        audit_id TEXT,
        requested_url TEXT NOT NULL,
        normalized_url TEXT,
        final_url TEXT,
        locale VARCHAR(8) NOT NULL DEFAULT 'de',
        status VARCHAR(16) NOT NULL DEFAULT 'success',
        error_message TEXT,
        scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_BROKEN_LINKS_SCAN_MODE}',
        max_subpages INT,
        crawl_planned_pages INT,
        crawl_visited_pages INT,
        crawl_failed_pages INT,
        timeout_reached BOOLEAN NOT NULL DEFAULT FALSE,
        partial_result BOOLEAN NOT NULL DEFAULT FALSE,
        link_total_checked INT,
        link_broken_count INT,
        link_warning_count INT,
        link_ok_count INT,
        source_ip TEXT,
        result_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_broken_requests_created
      ON website_tester_broken_link_requests (created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_broken_requests_status
      ON website_tester_broken_link_requests (status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_broken_requests_mode
      ON website_tester_broken_link_requests (scan_mode)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_tester_geo_requests (
        id BIGSERIAL PRIMARY KEY,
        audit_id TEXT,
        requested_url TEXT NOT NULL,
        normalized_url TEXT,
        final_url TEXT,
        locale VARCHAR(8) NOT NULL DEFAULT 'de',
        status VARCHAR(16) NOT NULL DEFAULT 'success',
        error_message TEXT,
        scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_GEO_SCAN_MODE}',
        max_subpages INT,
        crawl_planned_pages INT,
        crawl_visited_pages INT,
        crawl_failed_pages INT,
        timeout_reached BOOLEAN NOT NULL DEFAULT FALSE,
        partial_result BOOLEAN NOT NULL DEFAULT FALSE,
        geo_score INT,
        geo_band VARCHAR(16),
        source_ip TEXT,
        result_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_geo_requests_created
      ON website_tester_geo_requests (created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_geo_requests_status
      ON website_tester_geo_requests (status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_geo_requests_mode
      ON website_tester_geo_requests (scan_mode)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_tester_seo_requests (
        id BIGSERIAL PRIMARY KEY,
        audit_id TEXT,
        requested_url TEXT NOT NULL,
        normalized_url TEXT,
        final_url TEXT,
        locale VARCHAR(8) NOT NULL DEFAULT 'de',
        status VARCHAR(16) NOT NULL DEFAULT 'success',
        error_message TEXT,
        scan_mode VARCHAR(16) NOT NULL DEFAULT '${DEFAULT_SEO_SCAN_MODE}',
        max_subpages INT,
        crawl_planned_pages INT,
        crawl_visited_pages INT,
        crawl_failed_pages INT,
        timeout_reached BOOLEAN NOT NULL DEFAULT FALSE,
        partial_result BOOLEAN NOT NULL DEFAULT FALSE,
        seo_score INT,
        seo_band VARCHAR(16),
        source_ip TEXT,
        result_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_seo_requests_created
      ON website_tester_seo_requests (created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_seo_requests_status
      ON website_tester_seo_requests (status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wt_seo_requests_mode
      ON website_tester_seo_requests (scan_mode)
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
    SELECT
      max_subpages,
      broken_links_max_subpages,
      broken_links_scan_mode,
      geo_max_subpages,
      geo_scan_mode,
      seo_max_subpages,
      seo_scan_mode,
      updated_at
    FROM website_tester_config
    WHERE id = 1
    LIMIT 1
  `);
  const row = rows[0] || {};
  return {
    maxSubpages: clampMaxSubpages(row.max_subpages),
    brokenLinksMaxSubpages: clampBrokenLinksMaxSubpages(row.broken_links_max_subpages),
    brokenLinksScanMode: normalizeBrokenLinksScanMode(row.broken_links_scan_mode),
    geoMaxSubpages: clampGeoMaxSubpages(row.geo_max_subpages),
    geoScanMode: normalizeGeoScanMode(row.geo_scan_mode),
    seoMaxSubpages: clampSeoMaxSubpages(row.seo_max_subpages),
    seoScanMode: normalizeSeoScanMode(row.seo_scan_mode),
    updatedAt: row.updated_at || null
  };
}

export async function updateWebsiteTesterConfig({ maxSubpages }) {
  await ensureTables();
  const clamped = clampMaxSubpages(maxSubpages);
  const { rows } = await pool.query(`
    INSERT INTO website_tester_config (
      id,
      max_subpages,
      broken_links_max_subpages,
      broken_links_scan_mode,
      geo_max_subpages,
      geo_scan_mode,
      seo_max_subpages,
      seo_scan_mode,
      updated_at
    ) VALUES (
      1,
      $1,
      ${DEFAULT_BROKEN_LINKS_MAX_SUBPAGES},
      '${DEFAULT_BROKEN_LINKS_SCAN_MODE}',
      ${DEFAULT_GEO_MAX_SUBPAGES},
      '${DEFAULT_GEO_SCAN_MODE}',
      ${DEFAULT_SEO_MAX_SUBPAGES},
      '${DEFAULT_SEO_SCAN_MODE}',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET max_subpages = EXCLUDED.max_subpages,
        updated_at = NOW()
    RETURNING max_subpages, broken_links_max_subpages, broken_links_scan_mode, geo_max_subpages, geo_scan_mode, seo_max_subpages, seo_scan_mode, updated_at
  `, [clamped]);
  return {
    maxSubpages: clampMaxSubpages(rows[0]?.max_subpages),
    brokenLinksMaxSubpages: clampBrokenLinksMaxSubpages(rows[0]?.broken_links_max_subpages),
    brokenLinksScanMode: normalizeBrokenLinksScanMode(rows[0]?.broken_links_scan_mode),
    geoMaxSubpages: clampGeoMaxSubpages(rows[0]?.geo_max_subpages),
    geoScanMode: normalizeGeoScanMode(rows[0]?.geo_scan_mode),
    seoMaxSubpages: clampSeoMaxSubpages(rows[0]?.seo_max_subpages),
    seoScanMode: normalizeSeoScanMode(rows[0]?.seo_scan_mode),
    updatedAt: rows[0]?.updated_at || null
  };
}

export async function updateBrokenLinksTesterConfig({ brokenLinksMaxSubpages, brokenLinksScanMode }) {
  await ensureTables();
  const clampedSubpages = clampBrokenLinksMaxSubpages(brokenLinksMaxSubpages);
  const normalizedMode = normalizeBrokenLinksScanMode(brokenLinksScanMode);

  const { rows } = await pool.query(`
    INSERT INTO website_tester_config (
      id,
      max_subpages,
      broken_links_max_subpages,
      broken_links_scan_mode,
      geo_max_subpages,
      geo_scan_mode,
      seo_max_subpages,
      seo_scan_mode,
      updated_at
    ) VALUES (
      1,
      ${DEFAULT_MAX_SUBPAGES},
      $1,
      $2,
      ${DEFAULT_GEO_MAX_SUBPAGES},
      '${DEFAULT_GEO_SCAN_MODE}',
      ${DEFAULT_SEO_MAX_SUBPAGES},
      '${DEFAULT_SEO_SCAN_MODE}',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET broken_links_max_subpages = EXCLUDED.broken_links_max_subpages,
        broken_links_scan_mode = EXCLUDED.broken_links_scan_mode,
        updated_at = NOW()
    RETURNING max_subpages, broken_links_max_subpages, broken_links_scan_mode, geo_max_subpages, geo_scan_mode, seo_max_subpages, seo_scan_mode, updated_at
  `, [clampedSubpages, normalizedMode]);

  return {
    maxSubpages: clampMaxSubpages(rows[0]?.max_subpages),
    brokenLinksMaxSubpages: clampBrokenLinksMaxSubpages(rows[0]?.broken_links_max_subpages),
    brokenLinksScanMode: normalizeBrokenLinksScanMode(rows[0]?.broken_links_scan_mode),
    geoMaxSubpages: clampGeoMaxSubpages(rows[0]?.geo_max_subpages),
    geoScanMode: normalizeGeoScanMode(rows[0]?.geo_scan_mode),
    seoMaxSubpages: clampSeoMaxSubpages(rows[0]?.seo_max_subpages),
    seoScanMode: normalizeSeoScanMode(rows[0]?.seo_scan_mode),
    updatedAt: rows[0]?.updated_at || null
  };
}

export async function updateGeoTesterConfig({ geoMaxSubpages, geoScanMode }) {
  await ensureTables();
  const clampedSubpages = clampGeoMaxSubpages(geoMaxSubpages);
  const normalizedMode = normalizeGeoScanMode(geoScanMode);

  const { rows } = await pool.query(`
    INSERT INTO website_tester_config (
      id,
      max_subpages,
      broken_links_max_subpages,
      broken_links_scan_mode,
      geo_max_subpages,
      geo_scan_mode,
      seo_max_subpages,
      seo_scan_mode,
      updated_at
    ) VALUES (
      1,
      ${DEFAULT_MAX_SUBPAGES},
      ${DEFAULT_BROKEN_LINKS_MAX_SUBPAGES},
      '${DEFAULT_BROKEN_LINKS_SCAN_MODE}',
      $1,
      $2,
      ${DEFAULT_SEO_MAX_SUBPAGES},
      '${DEFAULT_SEO_SCAN_MODE}',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET geo_max_subpages = EXCLUDED.geo_max_subpages,
        geo_scan_mode = EXCLUDED.geo_scan_mode,
        updated_at = NOW()
    RETURNING max_subpages, broken_links_max_subpages, broken_links_scan_mode, geo_max_subpages, geo_scan_mode, seo_max_subpages, seo_scan_mode, updated_at
  `, [clampedSubpages, normalizedMode]);

  return {
    maxSubpages: clampMaxSubpages(rows[0]?.max_subpages),
    brokenLinksMaxSubpages: clampBrokenLinksMaxSubpages(rows[0]?.broken_links_max_subpages),
    brokenLinksScanMode: normalizeBrokenLinksScanMode(rows[0]?.broken_links_scan_mode),
    geoMaxSubpages: clampGeoMaxSubpages(rows[0]?.geo_max_subpages),
    geoScanMode: normalizeGeoScanMode(rows[0]?.geo_scan_mode),
    seoMaxSubpages: clampSeoMaxSubpages(rows[0]?.seo_max_subpages),
    seoScanMode: normalizeSeoScanMode(rows[0]?.seo_scan_mode),
    updatedAt: rows[0]?.updated_at || null
  };
}

export async function updateSeoTesterConfig({ seoMaxSubpages, seoScanMode }) {
  await ensureTables();
  const clampedSubpages = clampSeoMaxSubpages(seoMaxSubpages);
  const normalizedMode = normalizeSeoScanMode(seoScanMode);

  const { rows } = await pool.query(`
    INSERT INTO website_tester_config (
      id,
      max_subpages,
      broken_links_max_subpages,
      broken_links_scan_mode,
      geo_max_subpages,
      geo_scan_mode,
      seo_max_subpages,
      seo_scan_mode,
      updated_at
    ) VALUES (
      1,
      ${DEFAULT_MAX_SUBPAGES},
      ${DEFAULT_BROKEN_LINKS_MAX_SUBPAGES},
      '${DEFAULT_BROKEN_LINKS_SCAN_MODE}',
      ${DEFAULT_GEO_MAX_SUBPAGES},
      '${DEFAULT_GEO_SCAN_MODE}',
      $1,
      $2,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET seo_max_subpages = EXCLUDED.seo_max_subpages,
        seo_scan_mode = EXCLUDED.seo_scan_mode,
        updated_at = NOW()
    RETURNING max_subpages, broken_links_max_subpages, broken_links_scan_mode, geo_max_subpages, geo_scan_mode, seo_max_subpages, seo_scan_mode, updated_at
  `, [clampedSubpages, normalizedMode]);

  return {
    maxSubpages: clampMaxSubpages(rows[0]?.max_subpages),
    brokenLinksMaxSubpages: clampBrokenLinksMaxSubpages(rows[0]?.broken_links_max_subpages),
    brokenLinksScanMode: normalizeBrokenLinksScanMode(rows[0]?.broken_links_scan_mode),
    geoMaxSubpages: clampGeoMaxSubpages(rows[0]?.geo_max_subpages),
    geoScanMode: normalizeGeoScanMode(rows[0]?.geo_scan_mode),
    seoMaxSubpages: clampSeoMaxSubpages(rows[0]?.seo_max_subpages),
    seoScanMode: normalizeSeoScanMode(rows[0]?.seo_scan_mode),
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

export async function archiveBrokenLinkAuditRequest(payload = {}) {
  await ensureTables();

  await pool.query(`
    INSERT INTO website_tester_broken_link_requests (
      audit_id,
      requested_url,
      normalized_url,
      final_url,
      locale,
      status,
      error_message,
      scan_mode,
      max_subpages,
      crawl_planned_pages,
      crawl_visited_pages,
      crawl_failed_pages,
      timeout_reached,
      partial_result,
      link_total_checked,
      link_broken_count,
      link_warning_count,
      link_ok_count,
      source_ip,
      result_json
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
    )
  `, [
    payload.auditId || null,
    String(payload.requestedUrl || '').slice(0, 2000),
    payload.normalizedUrl || null,
    payload.finalUrl || null,
    payload.locale === 'en' ? 'en' : 'de',
    payload.status === 'error' ? 'error' : 'success',
    payload.errorMessage || null,
    normalizeBrokenLinksScanMode(payload.scanMode),
    Number.isFinite(payload.maxSubpages) ? payload.maxSubpages : null,
    Number.isFinite(payload.crawlPlannedPages) ? payload.crawlPlannedPages : null,
    Number.isFinite(payload.crawlVisitedPages) ? payload.crawlVisitedPages : null,
    Number.isFinite(payload.crawlFailedPages) ? payload.crawlFailedPages : null,
    payload.timeoutReached === true,
    payload.partialResult === true,
    Number.isFinite(payload.linkTotalChecked) ? payload.linkTotalChecked : null,
    Number.isFinite(payload.linkBrokenCount) ? payload.linkBrokenCount : null,
    Number.isFinite(payload.linkWarningCount) ? payload.linkWarningCount : null,
    Number.isFinite(payload.linkOkCount) ? payload.linkOkCount : null,
    payload.sourceIp || null,
    payload.resultJson || null
  ]);
}

export async function archiveGeoAuditRequest(payload = {}) {
  await ensureTables();

  await pool.query(`
    INSERT INTO website_tester_geo_requests (
      audit_id,
      requested_url,
      normalized_url,
      final_url,
      locale,
      status,
      error_message,
      scan_mode,
      max_subpages,
      crawl_planned_pages,
      crawl_visited_pages,
      crawl_failed_pages,
      timeout_reached,
      partial_result,
      geo_score,
      geo_band,
      source_ip,
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
    payload.status === 'error' ? 'error' : 'success',
    payload.errorMessage || null,
    normalizeGeoScanMode(payload.scanMode),
    Number.isFinite(payload.maxSubpages) ? payload.maxSubpages : null,
    Number.isFinite(payload.crawlPlannedPages) ? payload.crawlPlannedPages : null,
    Number.isFinite(payload.crawlVisitedPages) ? payload.crawlVisitedPages : null,
    Number.isFinite(payload.crawlFailedPages) ? payload.crawlFailedPages : null,
    payload.timeoutReached === true,
    payload.partialResult === true,
    Number.isFinite(payload.geoScore) ? payload.geoScore : null,
    String(payload.geoBand || '').slice(0, 16) || null,
    payload.sourceIp || null,
    payload.resultJson || null
  ]);
}

export async function archiveSeoAuditRequest(payload = {}) {
  await ensureTables();

  await pool.query(`
    INSERT INTO website_tester_seo_requests (
      audit_id,
      requested_url,
      normalized_url,
      final_url,
      locale,
      status,
      error_message,
      scan_mode,
      max_subpages,
      crawl_planned_pages,
      crawl_visited_pages,
      crawl_failed_pages,
      timeout_reached,
      partial_result,
      seo_score,
      seo_band,
      source_ip,
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
    payload.status === 'error' ? 'error' : 'success',
    payload.errorMessage || null,
    normalizeSeoScanMode(payload.scanMode),
    Number.isFinite(payload.maxSubpages) ? payload.maxSubpages : null,
    Number.isFinite(payload.crawlPlannedPages) ? payload.crawlPlannedPages : null,
    Number.isFinite(payload.crawlVisitedPages) ? payload.crawlVisitedPages : null,
    Number.isFinite(payload.crawlFailedPages) ? payload.crawlFailedPages : null,
    payload.timeoutReached === true,
    payload.partialResult === true,
    Number.isFinite(payload.seoScore) ? payload.seoScore : null,
    String(payload.seoBand || '').slice(0, 16) || null,
    payload.sourceIp || null,
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
      source,
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
      $1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12,NOW(),$13,$14,NOW(),NOW()
    )
    RETURNING *
  `, [
    payload.auditId || null,
    payload.domain || null,
    String(payload.email || '').trim().toLowerCase().slice(0, 320),
    String(payload.name || '').trim().slice(0, 180) || null,
    normalizeLocale(payload.locale),
    normalizeLeadSource(payload.source) || 'website',
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

export async function listBrokenLinkAuditRequests(options = {}) {
  await ensureTables();

  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const offset = (page - 1) * pageSize;

  const status = String(options.status || '').trim();
  const modeRaw = String(options.mode || '').trim().toLowerCase();
  const hasModeFilter = BROKEN_LINK_SCAN_MODES.has(modeRaw);
  const mode = normalizeBrokenLinksScanMode(modeRaw);
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

  if (hasModeFilter) {
    where.push(`scan_mode = ${bind(mode)}`);
  }

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
    const ref = bind(pattern);
    where.push(`(
      requested_url ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(final_url, '') ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(audit_id, '') ILIKE ${ref} ESCAPE '\\'
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countValues = [...values];
  const listValues = [...values];
  listValues.push(pageSize, offset);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM website_tester_broken_link_requests
    ${whereSql}
  `;
  const listSql = `
    SELECT *
    FROM website_tester_broken_link_requests
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

export async function listGeoAuditRequests(options = {}) {
  await ensureTables();

  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const offset = (page - 1) * pageSize;

  const status = String(options.status || '').trim();
  const modeRaw = String(options.mode || '').trim().toLowerCase();
  const hasModeFilter = GEO_SCAN_MODES.has(modeRaw);
  const mode = normalizeGeoScanMode(modeRaw);
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

  if (hasModeFilter) {
    where.push(`scan_mode = ${bind(mode)}`);
  }

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
    const ref = bind(pattern);
    where.push(`(
      requested_url ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(final_url, '') ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(audit_id, '') ILIKE ${ref} ESCAPE '\\'
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countValues = [...values];
  const listValues = [...values];
  listValues.push(pageSize, offset);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM website_tester_geo_requests
    ${whereSql}
  `;
  const listSql = `
    SELECT *
    FROM website_tester_geo_requests
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

export async function listSeoAuditRequests(options = {}) {
  await ensureTables();

  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const offset = (page - 1) * pageSize;

  const status = String(options.status || '').trim();
  const modeRaw = String(options.mode || '').trim().toLowerCase();
  const hasModeFilter = SEO_SCAN_MODES.has(modeRaw);
  const mode = normalizeSeoScanMode(modeRaw);
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

  if (hasModeFilter) {
    where.push(`scan_mode = ${bind(mode)}`);
  }

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;
    const ref = bind(pattern);
    where.push(`(
      requested_url ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(final_url, '') ILIKE ${ref} ESCAPE '\\'
      OR COALESCE(audit_id, '') ILIKE ${ref} ESCAPE '\\'
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countValues = [...values];
  const listValues = [...values];
  listValues.push(pageSize, offset);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM website_tester_seo_requests
    ${whereSql}
  `;
  const listSql = `
    SELECT *
    FROM website_tester_seo_requests
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
  const source = normalizeLeadSource(options.source);
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
  if (source) where.push(`source = ${bind(source)}`);

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
  clampBrokenLinksMaxSubpages,
  normalizeBrokenLinksScanMode,
  clampGeoMaxSubpages,
  normalizeGeoScanMode,
  clampSeoMaxSubpages,
  normalizeSeoScanMode,
  clampPage,
  clampPageSize,
  normalizeLeadStatus,
  normalizeLeadSource,
  normalizeDate,
  topIssuesToText
};
