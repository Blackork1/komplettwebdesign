import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/seoAuditService.js';

test('clampSeoScanMode accepts known values and falls back to maximal', () => {
  assert.equal(__testables.clampSeoScanMode('schnell'), 'schnell');
  assert.equal(__testables.clampSeoScanMode('balanced'), 'balanced');
  assert.equal(__testables.clampSeoScanMode('maximal'), 'maximal');
  assert.equal(__testables.clampSeoScanMode('unknown'), 'maximal');
});

test('modeProfile limits max subpages per mode', () => {
  assert.equal(__testables.modeProfile('schnell').profile.maxSubpagesCap, 4);
  assert.equal(__testables.modeProfile('balanced').profile.maxSubpagesCap, 9);
  assert.equal(__testables.modeProfile('maximal').profile.maxSubpagesCap, 20);
});

test('buildCategoryScores maps source checks to seo categories', () => {
  const categoryScores = __testables.buildCategoryScores({
    overallScore: 70,
    relevance: { seoGeoScore: 63 },
    crawlStats: { visitedPages: 4, plannedPages: 8 },
    categories: [
      {
        id: 'seo',
        score: 72,
        details: [
          { label: 'Title quality', qualityScore: 0.8 },
          { label: 'Meta description quality', qualityScore: 0.7 },
          { label: 'robots.txt reachable', qualityScore: 1 },
          { label: 'sitemap.xml reachable', qualityScore: 0.5 },
          { label: 'Schema quality', qualityScore: 0.6 }
        ]
      },
      {
        id: 'technical',
        score: 66,
        details: [{ label: 'Crawl depth / internal linking', qualityScore: 0.75 }]
      },
      {
        id: 'value',
        score: 69,
        details: [{ label: 'Content depth and substance', qualityScore: 0.55 }]
      }
    ]
  });

  assert.equal(categoryScores.length, 6);
  assert.equal(categoryScores[0].id, 'onpage');
  assert.equal(categoryScores[0].score, 75);
  assert.equal(categoryScores[2].id, 'technical');
  assert.equal(categoryScores[2].score, 66);
  assert.equal(categoryScores[5].id, 'structured_data');
  assert.equal(categoryScores[5].score, 60);
});

test('buildPotentialSummary stays high-level and language-aware', () => {
  const summary = __testables.buildPotentialSummary({
    overallScore: 42
  }, [
    { id: 'structured_data', score: 30 },
    { id: 'onpage', score: 40 },
    { id: 'technical', score: 50 }
  ], 'en');

  assert.match(summary.headline, /potential/i);
  assert.equal(summary.topPotentialAreas.length, 3);
  assert.match(summary.topPotentialAreas[0], /structured data/i);
});

