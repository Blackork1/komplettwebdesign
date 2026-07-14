import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateLearningRuleEffectiveness } from '../services/contentAgent/contentLearningEffectivenessService.js';

test('unter fünf Artikeln bleibt eine Lernregel immer in Beobachtung', () => {
  assert.equal(evaluateLearningRuleEffectiveness({
    articleCount: 4, recurrenceCount: 0, baselineRate: 0.8, currentRate: 0
  }), 'observing');
});

test('keine oder deutlich geringere Wiederholung gilt als wirksam', () => {
  assert.equal(evaluateLearningRuleEffectiveness({
    articleCount: 5, recurrenceCount: 0, baselineRate: 0.7, currentRate: 0
  }), 'effective');
  assert.equal(evaluateLearningRuleEffectiveness({
    articleCount: 10, recurrenceCount: 2, baselineRate: 0.6, currentRate: 0.2
  }), 'effective');
});

test('wiederholtes Auftreten ohne Verbesserung empfiehlt eine Revision', () => {
  assert.equal(evaluateLearningRuleEffectiveness({
    articleCount: 8, recurrenceCount: 5, baselineRate: 0.6, currentRate: 0.625
  }), 'revision_recommended');
  assert.equal(evaluateLearningRuleEffectiveness({
    articleCount: 6, recurrenceCount: 2, baselineRate: null, currentRate: 1 / 3
  }), 'revision_recommended');
});

test('fehlende GSC-Daten verändern den qualitativen Status nicht', () => {
  const base = {
    articleCount: 6, recurrenceCount: 0, baselineRate: 0.5, currentRate: 0
  };
  assert.equal(evaluateLearningRuleEffectiveness(base), 'effective');
  assert.equal(evaluateLearningRuleEffectiveness({
    ...base,
    gsc: { clicks: null, impressions: null, ctr: null, averagePosition: null }
  }), 'effective');
});

test('ungültige oder widersprüchliche Zähler bleiben sicher in Beobachtung', () => {
  for (const input of [
    { articleCount: -1, recurrenceCount: 0, currentRate: 0 },
    { articleCount: 5, recurrenceCount: 6, currentRate: 1.2 },
    { articleCount: 5, recurrenceCount: 1, currentRate: Number.NaN }
  ]) {
    assert.equal(evaluateLearningRuleEffectiveness(input), 'observing');
  }
});
