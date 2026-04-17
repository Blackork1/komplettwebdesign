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

test('full guide helpers respect configured page limits', () => {
  const result = {
    sourceResult: {
      internalGuideInput: {
        pageAnalyses: [{ url: 'https://example.com' }, { url: 'https://example.com/a' }, { url: 'https://example.com/b' }]
      }
    }
  };

  assert.equal(__testables.normalizeFullGuideMaxPages('0'), 1);
  assert.equal(__testables.normalizeFullGuideMaxPages('999'), 50);
  assert.equal(__testables.expectedGuidePageLimit(result, 10), 3);
  assert.equal(__testables.shouldRegenerateFullGuide({ pageLimitUsed: 3 }, result, 10), false);
  assert.equal(__testables.shouldRegenerateFullGuide({ pageLimitUsed: 2 }, result, 10), true);
});
