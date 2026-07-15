import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canDiscardDeterministicExistingPostOptimization
} from '../services/contentAgent/existingPostOptimizationDiscardPolicy.js';

function candidate(overrides = {}) {
  return {
    jobType: 'optimize_existing_post',
    jobStatus: 'needs_manual_attention',
    runStatus: 'needs_manual_attention',
    errorCode: 'existing_post_optimization_repair_failed',
    openProviderReservationCount: 0,
    hasDraftRevision: false,
    ...overrides
  };
}

test('nur ausdrücklich erlaubte deterministische Bestandsfehler dürfen geschlossen werden', () => {
  for (const errorCode of [
    'existing_post_optimization_repair_failed',
    'CONTENT_REVISION_CONFLICT',
    'CONTENT_REVISION_STALE',
    'live_post_hash_mismatch'
  ]) {
    assert.equal(canDiscardDeterministicExistingPostOptimization(candidate({ errorCode })), true);
  }
});

test('unklare Providerzustände, offene Reservierungen und Draft-Revisionen bleiben gesperrt', () => {
  for (const blocked of [
    { errorCode: 'provider_execution_uncertain' },
    { errorCode: 'provider_stage_persistence_uncertain' },
    { errorCode: 'unbekannter_fehler' },
    { openProviderReservationCount: 1 },
    { hasDraftRevision: true },
    { jobStatus: 'running' },
    { runStatus: 'running' },
    { jobType: 'generate_weekly_draft' }
  ]) {
    assert.equal(canDiscardDeterministicExistingPostOptimization(candidate(blocked)), false);
  }
});
