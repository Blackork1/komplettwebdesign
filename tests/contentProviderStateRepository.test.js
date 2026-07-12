import test from 'node:test';
import assert from 'node:assert/strict';

import { recordProviderResult } from '../repositories/contentProviderStateRepository.js';
import { runDraftPipeline } from '../services/contentAgent/draftPipeline.js';

function createQueryRecorder(rows = [{ provider_name: 'openai' }]) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows };
    }
  };
}

test('Providerstatus bewahrt bei Fehlern den letzten echten Erfolg', async () => {
  const db = createQueryRecorder();

  const result = await recordProviderResult({
    providerName: 'openai',
    success: false,
    errorCode: 'RATE_LIMIT'
  }, db);

  assert.equal(result.provider_name, 'openai');
  assert.deepEqual(db.calls[0].params, ['openai', false, 'RATE_LIMIT']);
  assert.match(
    db.calls[0].sql,
    /last_success_at = CASE WHEN \$2 THEN NOW\(\) ELSE content_provider_state\.last_success_at END/i
  );
  assert.match(db.calls[0].sql, /last_error_code = CASE WHEN \$2 THEN NULL ELSE \$3 END/i);
});

test('Providererfolg löscht nur den vorherigen Fehlercode', async () => {
  const db = createQueryRecorder([{ provider_name: 'cloudinary', last_error_code: null }]);

  await recordProviderResult({ providerName: 'cloudinary', success: true }, db);

  assert.deepEqual(db.calls[0].params, ['cloudinary', true, null]);
  assert.match(
    db.calls[0].sql,
    /last_failure_at = CASE WHEN \$2 THEN content_provider_state\.last_failure_at ELSE NOW\(\) END/i
  );
});

function providerPipelineDependencies(openaiOperation, providerResults) {
  return {
    config: {
      maxTopicCandidates: 8,
      monthlyCostLimitEur: 25,
      contentStageReservationEur: 0.5,
      contentInputCostPerMtok: 2.5,
      contentOutputCostPerMtok: 15
    },
    inventoryService: { async buildSiteInventory() { return { packages: [], approvedLinks: [] }; } },
    openaiService: {
      createTopicCandidates: openaiOperation,
      researchCurrentSources() {},
      createSeoBrief() {},
      generateArticle() {},
      reviewArticle() {},
      repairArticle() {}
    },
    topicScoringService: { selectBestTopic() { return null; } },
    topicRepository: { async createTopic() {}, async markTopicUsed() {} },
    runRepository: { async updateRunStage() { return {}; }, async finishRun() { return {}; } },
    costService: {
      async reserveMonthlyBudget() {
        return { created: true, status: 'reserved', reservationMonth: '2026-07' };
      },
      async settleMonthlyBudget() {},
      async releaseMonthlyBudgetReservation() {},
      async getPersistedStageResult() { return null; },
      estimateTextCost() { return 0.01; }
    },
    validateArticle() {},
    imageService: { async generateAndUploadImage() {}, async deleteImage() {} },
    draftRepository: { async createAIDraft() {} },
    async recordProviderResult(input) { providerResults.push(input); }
  };
}

test('Pipeline protokolliert nur einen sicher erkannten OpenAI-Fehler', async () => {
  const providerResults = [];
  const safeFailure = Object.assign(new Error('Rate-Limit'), {
    code: 'RATE_LIMIT',
    safeToRetry: true
  });

  await assert.rejects(
    runDraftPipeline(
      { runId: 81 },
      providerPipelineDependencies(async () => { throw safeFailure; }, providerResults)
    ),
    (error) => error.code === 'CONTENT_PROVIDER_SAFE_RETRY'
  );

  assert.deepEqual(providerResults, [{
    providerName: 'openai',
    success: false,
    errorCode: 'RATE_LIMIT'
  }]);
});

test('Pipeline wertet einen unklaren Providerfehler nicht als Ausfallstatus', async () => {
  const providerResults = [];

  const result = await runDraftPipeline(
    { runId: 82 },
    providerPipelineDependencies(async () => { throw new Error('Verbindung abgebrochen'); }, providerResults)
  );

  assert.equal(result.code, 'provider_execution_uncertain');
  assert.deepEqual(providerResults, []);
});
