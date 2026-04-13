import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/geoAuditService.js';

test('clampGeoScanMode accepts known values and falls back to maximal', () => {
  assert.equal(__testables.clampGeoScanMode('schnell'), 'schnell');
  assert.equal(__testables.clampGeoScanMode('balanced'), 'balanced');
  assert.equal(__testables.clampGeoScanMode('maximal'), 'maximal');
  assert.equal(__testables.clampGeoScanMode('unknown'), 'maximal');
});

test('modeProfile limits max subpages per mode', () => {
  assert.equal(__testables.modeProfile('schnell').profile.maxSubpagesCap, 4);
  assert.equal(__testables.modeProfile('balanced').profile.maxSubpagesCap, 9);
  assert.equal(__testables.modeProfile('maximal').profile.maxSubpagesCap, 20);
});

test('buildGeoSignals derives normalized scores', () => {
  const signals = __testables.buildGeoSignals({
    relevance: { intentMatchScore: 61, seoGeoScore: 58 },
    siteFacts: { hasSchema: true, hasRobots: true, hasSitemap: false, usesHttps: true },
    crawlStats: { visitedPages: 4, plannedPages: 8 },
    categories: [{ id: 'trust', score: 73 }]
  }, 'de');

  assert.equal(signals.entitySchema.score, 80);
  assert.equal(signals.intentCoherence.score, 61);
  assert.equal(signals.faqSnippetReadiness.score, 58);
  assert.equal(signals.trustCitations.score, 73);
  assert.equal(signals.internalLinking.score, 50);
});

test('buildPotentialSummary stays high-level and language-aware', () => {
  const summary = __testables.buildPotentialSummary({
    overallScore: 40,
    categories: [{ id: 'seo', score: 20 }],
    topActions: [{ category: 'SEO', label: 'Intent fit' }]
  }, 'en');

  assert.match(summary.headline, /potential/i);
  assert.equal(summary.topPotentials.length, 1);
  assert.equal(summary.topPotentials[0].category, 'Semantic discoverability and entity signals');
  assert.equal(summary.topPotentials[0].label, 'This area shows clear optimization potential.');
});

test('normalizeAreaKey normalizes mixed area names', () => {
  assert.equal(__testables.normalizeAreaKey(' SEO / GEO '), 'seo_geo');
});
