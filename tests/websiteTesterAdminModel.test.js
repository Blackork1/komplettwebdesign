import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __testables } from '../models/websiteTesterAdminModel.js';

const modelSource = fs.readFileSync(new URL('../models/websiteTesterAdminModel.js', import.meta.url), 'utf8');

test('clampMaxSubpages clamps into allowed range', () => {
  assert.equal(__testables.clampMaxSubpages('5'), 5);
  assert.equal(__testables.clampMaxSubpages('0'), 1);
  assert.equal(__testables.clampMaxSubpages('999'), 20);
  assert.equal(__testables.clampMaxSubpages('abc'), 5);

  assert.equal(__testables.clampBrokenLinksMaxSubpages('5'), 5);
  assert.equal(__testables.clampBrokenLinksMaxSubpages('0'), 1);
  assert.equal(__testables.clampBrokenLinksMaxSubpages('999'), 20);
  assert.equal(__testables.clampBrokenLinksMaxSubpages('abc'), 5);

  assert.equal(__testables.clampGeoMaxSubpages('5'), 5);
  assert.equal(__testables.clampGeoMaxSubpages('0'), 1);
  assert.equal(__testables.clampGeoMaxSubpages('999'), 20);
  assert.equal(__testables.clampGeoMaxSubpages('abc'), 5);

  assert.equal(__testables.clampSeoMaxSubpages('5'), 5);
  assert.equal(__testables.clampSeoMaxSubpages('0'), 1);
  assert.equal(__testables.clampSeoMaxSubpages('999'), 20);
  assert.equal(__testables.clampSeoMaxSubpages('abc'), 5);

  assert.equal(__testables.clampFullGuideMaxPages('10'), 10);
  assert.equal(__testables.clampFullGuideMaxPages('0'), 1);
  assert.equal(__testables.clampFullGuideMaxPages('999'), 50);
  assert.equal(__testables.clampFullGuideMaxPages('abc'), 10);
});

test('clampPage and clampPageSize use safe defaults', () => {
  assert.equal(__testables.clampPage('0'), 1);
  assert.equal(__testables.clampPage('4'), 4);

  assert.equal(__testables.clampPageSize('0'), 30);
  assert.equal(__testables.clampPageSize('10'), 10);
  assert.equal(__testables.clampPageSize('999'), 100);
});

test('normalizeLeadStatus only accepts known values', () => {
  assert.equal(__testables.normalizeLeadStatus('pending'), 'pending');
  assert.equal(__testables.normalizeLeadStatus('report_sent'), 'report_sent');
  assert.equal(__testables.normalizeLeadStatus('foo'), '');
});

test('normalizeBrokenLinksScanMode accepts known modes', () => {
  assert.equal(__testables.normalizeBrokenLinksScanMode('schnell'), 'schnell');
  assert.equal(__testables.normalizeBrokenLinksScanMode('balanced'), 'balanced');
  assert.equal(__testables.normalizeBrokenLinksScanMode('maximal'), 'maximal');
  assert.equal(__testables.normalizeBrokenLinksScanMode('unknown'), 'maximal');

  assert.equal(__testables.normalizeGeoScanMode('schnell'), 'schnell');
  assert.equal(__testables.normalizeGeoScanMode('balanced'), 'balanced');
  assert.equal(__testables.normalizeGeoScanMode('maximal'), 'maximal');
  assert.equal(__testables.normalizeGeoScanMode('unknown'), 'maximal');

  assert.equal(__testables.normalizeSeoScanMode('schnell'), 'schnell');
  assert.equal(__testables.normalizeSeoScanMode('balanced'), 'balanced');
  assert.equal(__testables.normalizeSeoScanMode('maximal'), 'maximal');
  assert.equal(__testables.normalizeSeoScanMode('unknown'), 'maximal');
});

test('normalizeLeadSource only accepts supported sources', () => {
  assert.equal(__testables.normalizeLeadSource('website'), 'website');
  assert.equal(__testables.normalizeLeadSource('geo'), 'geo');
  assert.equal(__testables.normalizeLeadSource('seo'), 'seo');
  assert.equal(__testables.normalizeLeadSource('other'), '');
});

test('topIssuesToText merges list safely', () => {
  assert.equal(__testables.topIssuesToText(['A', 'B', '']), 'A | B');
  assert.equal(__testables.topIssuesToText('Single'), 'Single');
});

test('admin archive list queries avoid heavy JSON payload columns', () => {
  const listFunctions = [
    'listWebsiteTesterRequests',
    'listBrokenLinkAuditRequests',
    'listGeoAuditRequests',
    'listSeoAuditRequests',
    'listWebsiteTesterLeads'
  ];

  for (const fnName of listFunctions) {
    const start = modelSource.indexOf(`export async function ${fnName}`);
    assert.notEqual(start, -1, `${fnName} should be present`);
    const listStart = modelSource.indexOf('const listSql = `', start);
    const listEnd = modelSource.indexOf('`;', listStart + 17);
    assert.notEqual(listStart, -1, `${fnName} list SQL should be present`);
    assert.notEqual(listEnd, -1, `${fnName} list SQL should be terminated`);
    const sql = modelSource.slice(listStart, listEnd);
    assert.doesNotMatch(sql, /SELECT\s+\*/i, `${fnName} should not select every column`);
    assert.doesNotMatch(sql, /result_json/i, `${fnName} should not load result_json`);
    assert.doesNotMatch(sql, /audit_snapshot_json/i, `${fnName} should not load audit_snapshot_json`);
    assert.doesNotMatch(sql, /full_guide_json/i, `${fnName} should not load full_guide_json`);
  }
});
