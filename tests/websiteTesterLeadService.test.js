import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/websiteTesterLeadService.js';

test('hashConfirmToken is deterministic sha256', () => {
  const a = __testables.hashConfirmToken('abc');
  const b = __testables.hashConfirmToken('abc');
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test('cleanEmail normalizes casing and whitespace', () => {
  assert.equal(__testables.cleanEmail('  MAX@Example.DE  '), 'max@example.de');
});

test('topIssuesFromResult extracts labels and text', () => {
  const items = __testables.topIssuesFromResult({
    topActions: [
      { label: 'Meta Description' },
      { text: 'Improve H1 structure' },
      { label: 'Add schema markup' },
      { label: 'Extra item' }
    ]
  });

  assert.deepEqual(items, ['Meta Description', 'Improve H1 structure', 'Add schema markup']);
});

test('buildConfirmUrl uses localized path', () => {
  const de = __testables.buildConfirmUrl('abc', 'de');
  const en = __testables.buildConfirmUrl('abc', 'en');
  assert.match(de, /\/website-tester\/report-confirm\?token=abc/);
  assert.match(en, /\/en\/website-tester\/report-confirm\?token=abc/);
});
