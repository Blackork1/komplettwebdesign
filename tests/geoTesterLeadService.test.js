import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/geoTesterLeadService.js';

test('hashConfirmToken is deterministic sha256', () => {
  const first = __testables.hashConfirmToken('abc');
  const second = __testables.hashConfirmToken('abc');
  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test('cleanEmail normalizes casing and whitespace', () => {
  assert.equal(__testables.cleanEmail('  MAX@Example.DE  '), 'max@example.de');
});

test('buildConfirmUrl uses GEO localized path', () => {
  const de = __testables.buildConfirmUrl('abc', 'de');
  const en = __testables.buildConfirmUrl('abc', 'en');
  assert.match(de, /\/website-tester\/geo\/report-confirm\?token=abc/);
  assert.match(en, /\/en\/website-tester\/geo\/report-confirm\?token=abc/);
});

test('topIssuesFromGeoResult extracts top labels', () => {
  const list = __testables.topIssuesFromGeoResult({
    sourceResult: {
      topActions: [
        { label: 'Intent mismatch' },
        { text: 'Improve FAQ structure' },
        { label: 'Strengthen entity signals' },
        { label: 'Extra' }
      ]
    }
  });

  assert.deepEqual(list, ['Intent mismatch', 'Improve FAQ structure', 'Strengthen entity signals']);
});
