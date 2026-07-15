import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARTICLE_PERFORMANCE_POLICY_VERSION,
  ageBucketForDays,
  evaluateArticlePerformance
} from '../services/contentAgent/articlePerformancePolicy.js';

const window28 = (overrides = {}) => ({
  coverageDayCount: 28,
  complete: true,
  impressions: 80,
  clicks: 0,
  ctr: 0,
  averagePosition: 12,
  ctaClicks: 0,
  contactSubmits: 0,
  ...overrides
});

function evaluate(overrides = {}) {
  return evaluateArticlePerformance({
    articleAgeDays: 40,
    current: { 28: window28() },
    previous: {},
    cohort: { available: false },
    ...overrides
  });
}

test('Policy ist explizit versioniert', () => {
  assert.equal(ARTICLE_PERFORMANCE_POLICY_VERSION, 'article-performance-v1');
});

test('50 Impressionen und null Klicks erzeugen eine Snippet-/Intent-Chance', () => {
  const result = evaluate();

  assert.equal(result.status, 'opportunity');
  assert.ok(result.diagnoses.some((item) => item.code === 'snippet_or_intent_opportunity'));
});

test('49 Impressionen bleiben neutral', () => {
  const result = evaluate({ current: { 28: window28({ impressions: 49 }) } });

  assert.equal(result.status, 'insufficient_impressions');
  assert.equal(result.dataEligible, false);
  assert.deepEqual(result.diagnoses, []);
});

test('Unvollständige 28-Tage-Abdeckung wird noch nicht bewertet', () => {
  const result = evaluate({
    current: { 28: window28({ coverageDayCount: 27, complete: false }) }
  });

  assert.equal(result.status, 'collecting_data');
  assert.equal(result.learningEligible, false);
});

test('CTA und Anfrageweg werden erst an ihren Mindestschwellen bewertet', () => {
  const below = evaluate({
    current: { 28: window28({ clicks: 9, impressions: 100, ctr: 0.09 }) }
  });
  assert.equal(below.diagnoses.some((item) => item.code === 'content_or_cta_opportunity'), false);

  const eligible = evaluate({
    current: { 28: window28({ clicks: 10, impressions: 100, ctr: 0.1 }) }
  });
  assert.equal(eligible.diagnoses.some((item) => item.code === 'content_or_cta_opportunity'), true);

  const contactBelow = evaluate({
    current: { 28: window28({ clicks: 10, ctaClicks: 4, contactSubmits: 0 }) }
  });
  assert.equal(contactBelow.diagnoses.some((item) => item.code === 'contact_path_opportunity'), false);

  const contactEligible = evaluate({
    current: { 28: window28({ clicks: 10, ctaClicks: 5, contactSubmits: 0 }) }
  });
  assert.equal(contactEligible.diagnoses.some((item) => item.code === 'contact_path_opportunity'), true);
});

test('Realistische Rankingpositionen werden als Rankingchance erkannt', () => {
  const result = evaluate({
    current: { 28: window28({ clicks: 4, ctr: 0.05, averagePosition: 8 }) }
  });

  assert.ok(result.diagnoses.some((item) => item.code === 'ranking_opportunity'));
  assert.equal(result.dimensions.visibility, 'opportunity');
});

test('Schwache Sichtbarkeit wird nur gegen eine ausreichend große Kohorte bewertet', () => {
  const unavailable = evaluate({
    current: { 28: window28({ clicks: 2, averagePosition: 25 }) },
    cohort: { available: true, size: 2, medianImpressions: 200 }
  });
  assert.equal(unavailable.diagnoses.some((item) => item.code === 'visibility_opportunity'), false);

  const available = evaluate({
    current: { 28: window28({ clicks: 2, averagePosition: 25 }) },
    cohort: { available: true, size: 3, medianImpressions: 200 }
  });
  assert.ok(available.diagnoses.some((item) => item.code === 'visibility_opportunity'));
});

test('Verbesserte CTR und Sichtbarkeit oberhalb der Kohorte werden positiv gelernt', () => {
  const result = evaluate({
    current: { 28: window28({ clicks: 8, ctr: 0.1, averagePosition: 6 }) },
    previous: { 28: window28({ clicks: 4, ctr: 0.05, complete: true }) },
    cohort: { available: true, size: 4, medianImpressions: 60 }
  });

  assert.equal(result.status, 'positive');
  assert.deepEqual(result.positiveSignals.map((item) => item.code), [
    'ctr_improved',
    'visibility_above_cohort'
  ]);
});

test('Nullwerte erzeugen weder Divisionen noch fälschliche Conversion-Bewertungen', () => {
  const result = evaluate({ current: { 28: window28({ impressions: 50, averagePosition: null }) } });

  assert.equal(result.dimensions.articleEffect, 'not_applicable');
  assert.equal(result.dimensions.contactPath, 'not_applicable');
});

test('Altersgruppen haben feste Grenzen', () => {
  assert.equal(ageBucketForDays(0), 'collecting');
  assert.equal(ageBucketForDays(27), 'collecting');
  assert.equal(ageBucketForDays(28), '28-59');
  assert.equal(ageBucketForDays(59), '28-59');
  assert.equal(ageBucketForDays(60), '60-119');
  assert.equal(ageBucketForDays(120), '120-239');
  assert.equal(ageBucketForDays(240), '240-plus');
});
