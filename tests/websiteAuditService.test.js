import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/websiteAuditService.js';

test('ensureUrl normalizes protocol and keeps hostname', () => {
  const normalized = __testables.ensureUrl('example.com', 'de');
  assert.equal(normalized, 'https://example.com/');
});

test('ensureUrl rejects unsupported protocols', () => {
  assert.throws(
    () => __testables.ensureUrl('ftp://example.com', 'de'),
    /ungültig|invalid/i
  );
});

test('normalizeScoreBand returns expected bucket', () => {
  assert.equal(__testables.normalizeScoreBand(86), 'gut');
  assert.equal(__testables.normalizeScoreBand(60), 'mittel');
  assert.equal(__testables.normalizeScoreBand(59), 'kritisch');
});

test('aggregateOverallScore respects weighted categories', () => {
  const categories = [
    { score: 100, weight: 0.25 },
    { score: 50, weight: 0.25 },
    { score: 50, weight: 0.20 },
    { score: 80, weight: 0.15 },
    { score: 40, weight: 0.15 }
  ];
  assert.equal(__testables.aggregateOverallScore(categories), 66);
});

test('localeFrom falls back to de', () => {
  assert.equal(__testables.localeFrom('en'), 'en');
  assert.equal(__testables.localeFrom('de'), 'de');
  assert.equal(__testables.localeFrom('fr'), 'de');
});

test('tokenCoverage recognizes close SEO intent variants', () => {
  const coverage = __testables.tokenCoverage('Webdesign in Berlin mit SEO und Hosting', ['webseite', 'berlin']);
  assert.ok(coverage >= 0.5);
});

test('validateAuditContext requires business context', () => {
  assert.throws(
    () => __testables.validateAuditContext({ businessType: 'Arzt' }, 'de'),
    /Branche|Hauptleistung|Zielregion|realistisch/i
  );

  const context = __testables.validateAuditContext({
    businessType: 'Arztpraxis',
    primaryService: 'Zahnimplantate',
    targetRegion: 'Berlin'
  }, 'de');
  assert.equal(context.businessType, 'Arztpraxis');
  assert.equal(context.primaryService, 'Zahnimplantate');
  assert.equal(context.targetRegion, 'Berlin');
});

test('applyScoreCaps limits score to strictest cap', () => {
  const capped = __testables.applyScoreCaps(78, [
    { key: 'weak_seo_geo_intent', maxScore: 69 },
    { key: 'tracking_without_consent', maxScore: 49 }
  ]);
  assert.equal(capped.finalScore, 49);
  assert.equal(capped.penalty, 29);
  assert.equal(capped.appliedCaps.length, 2);
});

test('normalizeScoreBandWithBlockers handles blocker escalation', () => {
  assert.equal(__testables.normalizeScoreBandWithBlockers(88, []), 'gut');
  assert.equal(__testables.normalizeScoreBandWithBlockers(70, ['a', 'b']), 'kritisch');
  assert.equal(__testables.normalizeScoreBandWithBlockers(72, ['a']), 'mittel');
});
