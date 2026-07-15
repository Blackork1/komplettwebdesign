import assert from 'node:assert/strict';
import test from 'node:test';

import { createArticlePerformanceService } from '../services/contentAgent/articlePerformanceService.js';

function completeWindow(overrides = {}) {
  return {
    startDate: '2026-06-15',
    endDate: '2026-07-12',
    coverageDayCount: 28,
    complete: true,
    impressions: 80,
    clicks: 0,
    ctr: 0,
    averagePosition: 12,
    ctaClicks: 0,
    contactSubmits: 0,
    queries: [{ query: 'website verbessern', impressions: 50 }],
    ...overrides
  };
}

function completeInputFor(postId, overrides = {}) {
  return {
    postId,
    articleAgeDays: 42,
    current: { 7: completeWindow(), 14: completeWindow(), 28: completeWindow() },
    previous: { 28: completeWindow({ ctr: 0, complete: true }) },
    cohort: { available: false, size: 0 },
    ...overrides
  };
}

test('Auswertung isoliert Artikelfehler und speichert die übrigen Snapshots', async () => {
  const stored = [];
  const queued = [];
  const opportunities = [];
  const service = createArticlePerformanceService({
    repository: {
      async listPublishedArticles() { return [{ id: 1 }, { id: 2 }]; },
      async getPerformanceInputs({ postId }) {
        if (postId === 1) throw new Error('defekter Artikel');
        return completeInputFor(postId);
      },
      async upsertPerformanceSnapshot(input) {
        stored.push(input);
        return { id: 99, explanation_status: input.explanationStatus };
      }
    },
    async enqueueExplanationJob(input) { queued.push(input); },
    opportunityRepository: {
      async upsertOpenOpportunities(input) { opportunities.push(...input); }
    },
    now: () => new Date('2026-07-15T03:30:00.000Z')
  });

  const result = await service.evaluateAllPublishedArticles({
    evaluatedThroughDate: '2026-07-12'
  });

  assert.deepEqual(result, { evaluated: 1, failed: 1, explanationJobs: 1 });
  assert.equal(stored[0].postId, 2);
  assert.equal(stored[0].evaluatedThroughDate, '2026-07-12');
  assert.match(stored[0].evidenceHash, /^[0-9a-f]{64}$/);
  assert.equal(queued[0].snapshotId, 99);
  assert.match(queued[0].evidenceHash, /^[0-9a-f]{64}$/);
  assert.equal(opportunities[0].opportunityType, 'meta_refresh');
});

test('Unveränderte neutrale Daten erzeugen keinen Erklärungsjob und keine Chance', async () => {
  const queued = [];
  const opportunities = [];
  const service = createArticlePerformanceService({
    repository: {
      async listPublishedArticles() { return [{ id: 3 }]; },
      async getPerformanceInputs() {
        return completeInputFor(3, {
          current: {
            7: completeWindow(),
            14: completeWindow(),
            28: completeWindow({ impressions: 49, clicks: 0 })
          }
        });
      },
      async upsertPerformanceSnapshot(input) {
        return { id: 100, explanation_status: input.explanationStatus };
      }
    },
    async enqueueExplanationJob(input) { queued.push(input); },
    opportunityRepository: {
      async upsertOpenOpportunities(input) { opportunities.push(...input); }
    }
  });

  const result = await service.evaluateAllPublishedArticles({
    evaluatedThroughDate: '2026-07-12'
  });

  assert.deepEqual(result, { evaluated: 1, failed: 0, explanationJobs: 0 });
  assert.deepEqual(queued, []);
  assert.deepEqual(opportunities, []);
});

test('Lease wird vor jedem Artikel geprüft', async () => {
  let activeChecks = 0;
  const service = createArticlePerformanceService({
    repository: {
      async listPublishedArticles() { return [{ id: 4 }, { id: 5 }]; },
      async getPerformanceInputs({ postId }) { return completeInputFor(postId); },
      async upsertPerformanceSnapshot(input) {
        return { id: input.postId, explanation_status: 'not_needed' };
      }
    },
    async enqueueExplanationJob() {},
    opportunityRepository: { async upsertOpenOpportunities() {} }
  });

  await service.evaluateAllPublishedArticles({
    evaluatedThroughDate: '2026-07-12',
    leaseGuard: { async assertActive() { activeChecks += 1; } }
  });

  assert.equal(activeChecks, 2);
});

test('Lernvorschläge werden nach der Auswertung getrennt verarbeitet und Fehler bleiben isoliert', async () => {
  let learningCalls = 0;
  const service = createArticlePerformanceService({
    repository: {
      async listPublishedArticles() { return []; },
      async getPerformanceInputs() { throw new Error('nicht erwartet'); },
      async upsertPerformanceSnapshot() { throw new Error('nicht erwartet'); }
    },
    async enqueueExplanationJob() {},
    opportunityRepository: { async upsertOpenOpportunities() {} },
    async processPerformanceLearningEvidence() {
      learningCalls += 1;
      throw new Error('Lernablage vorübergehend nicht verfügbar');
    }
  });
  const result = await service.evaluateAllPublishedArticles({ evaluatedThroughDate: '2026-07-12' });
  assert.equal(learningCalls, 1);
  assert.equal(result.learningFailed, true);
  assert.equal(result.evaluated, 0);
});

test('anonyme Artikelereignisse werden nach 180 Tagen gelöscht', async () => {
  let prunedBefore = null;
  const service = createArticlePerformanceService({
    repository: {
      async listPublishedArticles() { return []; },
      async getPerformanceInputs() { throw new Error('nicht erwartet'); },
      async upsertPerformanceSnapshot() { throw new Error('nicht erwartet'); },
      async pruneArticleEvents({ beforeDate }) { prunedBefore = beforeDate; return 3; }
    },
    async enqueueExplanationJob() {},
    opportunityRepository: { async upsertOpenOpportunities() {} },
    now: () => new Date('2026-07-15T03:30:00.000Z')
  });

  const result = await service.evaluateAllPublishedArticles({ evaluatedThroughDate: '2026-07-12' });

  assert.equal(prunedBefore.toISOString(), '2026-01-16T03:30:00.000Z');
  assert.equal(result.retentionPruned, 3);
});

test('fehlgeschlagene Aufbewahrungsbereinigung verwirft keine gespeicherte Auswertung', async () => {
  const stored = [];
  const service = createArticlePerformanceService({
    repository: {
      async listPublishedArticles() { return [{ id: 8 }]; },
      async getPerformanceInputs() { return completeInputFor(8); },
      async upsertPerformanceSnapshot(input) {
        stored.push(input);
        return { id: 108, explanation_status: 'not_needed' };
      },
      async pruneArticleEvents() { throw new Error('Bereinigung vorübergehend nicht verfügbar'); }
    },
    async enqueueExplanationJob() {},
    opportunityRepository: { async upsertOpenOpportunities() {} },
    now: () => new Date('2026-07-15T03:30:00.000Z')
  });

  const result = await service.evaluateAllPublishedArticles({ evaluatedThroughDate: '2026-07-12' });

  assert.equal(stored.length, 1);
  assert.equal(result.evaluated, 1);
  assert.equal(result.retentionFailed, true);
});
