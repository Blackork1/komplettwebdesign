import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../models/websiteTesterAdminModel.js';

test('clampMaxSubpages clamps into allowed range', () => {
  assert.equal(__testables.clampMaxSubpages('5'), 5);
  assert.equal(__testables.clampMaxSubpages('0'), 1);
  assert.equal(__testables.clampMaxSubpages('999'), 20);
  assert.equal(__testables.clampMaxSubpages('abc'), 5);
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

test('topIssuesToText merges list safely', () => {
  assert.equal(__testables.topIssuesToText(['A', 'B', '']), 'A | B');
  assert.equal(__testables.topIssuesToText('Single'), 'Single');
});
