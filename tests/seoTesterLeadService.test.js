import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/seoTesterLeadService.js';

test('hashConfirmToken is deterministic sha256', () => {
  const first = __testables.hashConfirmToken('abc');
  const second = __testables.hashConfirmToken('abc');
  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test('cleanEmail normalizes casing and whitespace', () => {
  assert.equal(__testables.cleanEmail('  MAX@Example.DE  '), 'max@example.de');
});

test('buildConfirmUrl uses SEO localized path', () => {
  const de = __testables.buildConfirmUrl('abc', 'de');
  const en = __testables.buildConfirmUrl('abc', 'en');
  assert.match(de, /\/website-tester\/seo\/report-confirm\?token=abc/);
  assert.match(en, /\/en\/website-tester\/seo\/report-confirm\?token=abc/);
});

test('topIssuesFromSeoResult extracts top labels', () => {
  const list = __testables.topIssuesFromSeoResult({
    sourceResult: {
      topActions: [
        { label: 'Fix title quality' },
        { text: 'Improve internal links' },
        { label: 'Improve schema coverage' },
        { label: 'Extra' }
      ]
    }
  });

  assert.deepEqual(list, ['Fix title quality', 'Improve internal links', 'Improve schema coverage']);
});

