import test from 'node:test';
import assert from 'node:assert/strict';

import { presentReviewOptimizationStatus } from '../services/contentAgent/reviewOptimizationStatusService.js';

const baseJob = {
  id: 41,
  attempts: 1,
  max_attempts: 3,
  expected_review_version: 3,
  created_at: '2026-07-14T10:00:00.000Z',
  updated_at: '2026-07-14T10:01:00.000Z',
  finished_at: null,
  last_error: null
};

test('laufende Optimierung sperrt weitere Aktionen mit sicherer Statusmeldung', () => {
  const status = presentReviewOptimizationStatus({
    job: { ...baseJob, status: 'running' },
    currentReviewVersion: 3
  });

  assert.deepEqual(status, {
    state: 'running',
    active: true,
    blocksActions: true,
    jobId: 41,
    attempts: 1,
    maxAttempts: 3,
    message: 'Die Fehlerbehebung wird gerade ausgeführt.',
    updatedAt: '2026-07-14T10:01:00.000Z',
    reloadRecommended: false
  });
});

test('abgeschlossene Optimierung empfiehlt erst nach neuer Reviewversion das bewusste Neuladen', () => {
  const completed = { ...baseJob, status: 'completed', finished_at: '2026-07-14T10:03:00.000Z' };

  assert.deepEqual(
    presentReviewOptimizationStatus({ job: completed, currentReviewVersion: 4 }),
    {
      state: 'completed', active: false, blocksActions: false, jobId: 41,
      attempts: 1, maxAttempts: 3,
      message: 'Die Fehlerbehebung wurde erfolgreich abgeschlossen.',
      updatedAt: '2026-07-14T10:01:00.000Z', reloadRecommended: true
    }
  );
  assert.equal(
    presentReviewOptimizationStatus({ job: completed, currentReviewVersion: 3 }).blocksActions,
    true
  );
});

test('fehlgeschlagener aktueller Job bleibt gesperrt und gibt keine Rohfehlermeldung aus', () => {
  const status = presentReviewOptimizationStatus({
    job: {
      ...baseJob,
      status: 'needs_manual_attention',
      last_error: 'authorization: Bearer sk-secret-value'
    },
    currentReviewVersion: 3
  });

  assert.equal(status.state, 'manual_attention');
  assert.equal(status.active, false);
  assert.equal(status.blocksActions, true);
  assert.equal(status.message, 'Die Fehlerbehebung benötigt eine manuelle Prüfung.');
  assert.equal(JSON.stringify(status).includes('sk-secret-value'), false);
});

test('fehlender Job ergibt einen inaktiven fail-closed Grundzustand', () => {
  assert.deepEqual(presentReviewOptimizationStatus({ job: null, currentReviewVersion: 3 }), {
    state: 'idle', active: false, blocksActions: false, jobId: null,
    attempts: 0, maxAttempts: 0, message: '', updatedAt: null,
    reloadRecommended: false
  });
});
