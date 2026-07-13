import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildContentOpportunities,
  calculateSearchOpportunity
} from '../services/contentAgent/searchOpportunityService.js';

const range = {
  startDate: '2026-06-01',
  endDate: '2026-06-30'
};

test('Suchchancen-Score folgt exakt der gewichteten Formel', () => {
  assert.equal(calculateSearchOpportunity({
    impressions: 500,
    averagePosition: 12,
    ctr: 0.01
  }), 8.74);
  assert.equal(calculateSearchOpportunity({
    impressions: 2_000,
    averagePosition: 4,
    ctr: 0.005
  }), 8.56);
  assert.equal(calculateSearchOpportunity({
    impressions: 20,
    averagePosition: 1,
    ctr: 0.6
  }), 2.88);
});

test('Position 12 mit niedriger CTR ergibt ausschließlich content_refresh', () => {
  const opportunities = buildContentOpportunities([{
    postId: 41,
    pageUrl: 'https://komplettwebdesign.de/blog/technisches-seo',
    query: 'technisches seo',
    impressions: 500,
    averagePosition: 12,
    ctr: 0.01
  }], range);

  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].opportunityType, 'content_refresh');
  assert.equal(opportunities[0].score, 8.74);
});

test('Position 4 mit niedriger CTR ergibt ausschließlich meta_refresh', () => {
  const opportunities = buildContentOpportunities([{
    postId: 42,
    pageUrl: 'https://komplettwebdesign.de/blog/webdesign-kosten',
    query: 'webdesign kosten',
    impressions: 2_000,
    averagePosition: 4,
    ctr: 0.005
  }], range);

  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].opportunityType, 'meta_refresh');
  assert.equal(opportunities[0].score, 8.56);
});

test('Metrik ohne erfüllte Schwelle ergibt keine Chance', () => {
  const opportunities = buildContentOpportunities([{
    postId: 43,
    pageUrl: 'https://komplettwebdesign.de/blog/starke-rankings',
    query: 'starke rankings',
    impressions: 20,
    averagePosition: 1,
    ctr: 0.6
  }], range);

  assert.deepEqual(opportunities, []);
});

test('Nur positive sichere Post-IDs dürfen Chancen erzeugen', () => {
  const unsafePostIds = [null, undefined, 0, -1, 1.5, '41', Number.MAX_SAFE_INTEGER + 1];
  const metrics = unsafePostIds.map((postId, index) => ({
    postId,
    pageUrl: `https://komplettwebdesign.de/blog/unsicher-${index}`,
    query: `unsicher ${index}`,
    impressions: 500,
    averagePosition: 12,
    ctr: 0.01
  }));

  assert.deepEqual(buildContentOpportunities(metrics, range), []);
});

test('Grenzwerte der Empfehlungstypen werden exakt eingehalten', () => {
  const metrics = [
    { postId: 1, averagePosition: 10, ctr: 0.029999 },
    { postId: 2, averagePosition: 10, ctr: 0.03 },
    { postId: 3, averagePosition: 8, ctr: 0.019999 },
    { postId: 4, averagePosition: 20, ctr: 0.019999 },
    { postId: 5, averagePosition: 20.0001, ctr: 0.01 }
  ].map((metric) => ({
    ...metric,
    pageUrl: `https://komplettwebdesign.de/blog/post-${metric.postId}`,
    query: `query ${metric.postId}`,
    impressions: 500
  }));

  const opportunities = buildContentOpportunities(metrics, range);
  const typesByPost = new Map();
  for (const opportunity of opportunities) {
    const types = typesByPost.get(opportunity.postId) || [];
    types.push(opportunity.opportunityType);
    typesByPost.set(opportunity.postId, types);
  }

  assert.deepEqual(typesByPost.get(1), ['meta_refresh']);
  assert.equal(typesByPost.has(2), false);
  assert.deepEqual(typesByPost.get(3), ['meta_refresh', 'content_refresh']);
  assert.deepEqual(typesByPost.get(4), ['content_refresh']);
  assert.equal(typesByPost.has(5), false);
  assert.equal(opportunities.every(({ opportunityType }) => (
    ['meta_refresh', 'content_refresh'].includes(opportunityType)
  )), true);
});

test('Identische Analysen erzeugen stabile SHA-256-Schlüssel mit strukturierten JSON-Werten', () => {
  const metric = {
    postId: 41,
    pageUrl: 'https://komplettwebdesign.de/blog/technisches-seo',
    query: 'technisches seo',
    impressions: 500,
    averagePosition: 12,
    ctr: 0.01
  };

  const [first] = buildContentOpportunities([metric], range);
  const [second] = buildContentOpportunities([{ ...metric }], { ...range });
  const [otherRange] = buildContentOpportunities([metric], {
    ...range,
    endDate: '2026-07-01'
  });

  assert.equal(first.analysisKey, second.analysisKey);
  assert.notEqual(first.analysisKey, otherRange.analysisKey);
  assert.match(first.analysisKey, /^[a-f0-9]{64}$/);
  assert.ok(first.analysisKey.length <= 180);
  assert.equal(first.primaryQuery, metric.query);
  assert.deepEqual(first.evidenceJson, {
    range,
    pageUrl: metric.pageUrl,
    query: metric.query,
    impressions: 500,
    ctr: 0.01,
    averagePosition: 12
  });
  assert.deepEqual(first.recommendationJson, {
    action: 'content_refresh',
    automaticChanges: false
  });
  assert.doesNotThrow(() => JSON.stringify({
    evidence: first.evidenceJson,
    recommendation: first.recommendationJson
  }));
});
