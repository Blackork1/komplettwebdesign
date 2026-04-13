import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../models/websiteTesterAdminModel.js';

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
