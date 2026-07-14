import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { executePaidStructuredTextStage } from '../services/contentAgent/providerTextStageService.js';

const LIVE_HASH = 'a'.repeat(64);

function stageInput(overrides = {}) {
  return {
    run: { id: 7 },
    stageId: 'targeted_optimization',
    versionFence: { key: 'liveHash', value: LIVE_HASH },
    runtimeSnapshot: { monthlyCostLimitEur: 25, timezone: 'Europe/Berlin' },
    reservationCost: 0.5,
    inputRate: 1,
    outputRate: 2,
    schema: z.object({ title: z.string() }),
    async execute() {
      return {
        value: { title: 'Neu' },
        responseId: 'resp-neu',
        usage: { input_tokens: 10, output_tokens: 5 },
        promptVersion: 'test-v1'
      };
    },
    ...overrides
  };
}

function stageDependencies() {
  const state = {
    events: [],
    persistedStages: [],
    reservations: [],
    settlements: [],
    releases: [],
    providerResults: []
  };
  const dependencies = {
    async assertLease() { state.events.push('lease'); },
    costService: {
      async getPersistedStageResult() {
        state.events.push('load');
        return null;
      },
      async reserveMonthlyBudget(payload) {
        state.events.push('reserve');
        state.reservations.push(payload);
        return { created: true, status: 'reserved', reservationMonth: '2026-07' };
      },
      estimateTextCost(payload) {
        state.events.push('estimate');
        assert.deepEqual(payload, {
          usage: { input_tokens: 10, output_tokens: 5 },
          inputRate: 1,
          outputRate: 2
        });
        return 0.015;
      },
      async settleMonthlyBudget(payload) {
        state.events.push('settle');
        state.settlements.push(payload);
      },
      async releaseMonthlyBudgetReservation(payload) {
        state.events.push('release');
        state.releases.push(payload);
      }
    },
    runRepository: {
      async updateRunStage(runId, payload) {
        state.events.push('persist');
        state.persistedStages.push({ runId, ...payload });
        return {
          id: runId,
          stage_results_json: { [payload.stageId]: structuredClone(payload.stageResult) }
        };
      }
    },
    async recordProviderResult(payload) {
      state.events.push(`record:${payload.success}`);
      state.providerResults.push(payload);
    }
  };
  return { dependencies, state };
}

test('bezahlte Textstufe verwendet persistiertes Ergebnis ohne zweiten Provideraufruf', async () => {
  let calls = 0;
  const settlements = [];
  const persisted = {
    value: { title: 'Gespeichert' },
    liveHash: LIVE_HASH,
    reservationMonth: '2026-07',
    actualCost: 0.01
  };
  const dependencies = {
    assertLease: async () => true,
    costService: {
      async getPersistedStageResult() { return persisted; },
      async settleMonthlyBudget(payload) { settlements.push(payload); }
    }
  };

  const result = await executePaidStructuredTextStage(stageInput({
    async execute() {
      calls += 1;
      return { value: { title: 'Neu' } };
    }
  }), dependencies);

  assert.equal(calls, 0);
  assert.deepEqual(settlements, [{
    runId: 7,
    stageId: 'targeted_optimization',
    reservationMonth: '2026-07',
    actualCost: 0.01
  }]);
  assert.deepEqual(result, { value: { title: 'Gespeichert' }, envelope: persisted, reused: true });
});

test('Retry rechnet ein vor dem Settlement persistiertes Ergebnis ohne neue Reservierung oder Providerausführung ab', async () => {
  const { dependencies, state } = stageDependencies();
  let persisted = null;
  let leaseCalls = 0;
  let providerCalls = 0;
  const persistStage = dependencies.runRepository.updateRunStage;
  dependencies.costService.getPersistedStageResult = async () => {
    state.events.push('load');
    return persisted;
  };
  dependencies.runRepository.updateRunStage = async (runId, payload) => {
    const storedRun = await persistStage(runId, payload);
    persisted = structuredClone(payload.stageResult);
    return storedRun;
  };
  dependencies.assertLease = async () => {
    state.events.push('lease');
    leaseCalls += 1;
    if (leaseCalls === 4) {
      throw Object.assign(new Error('Lease nach Persistenz verloren'), {
        code: 'CONTENT_JOB_LEASE_LOST'
      });
    }
  };
  const input = stageInput({
    async execute() {
      state.events.push('execute');
      providerCalls += 1;
      return {
        value: { title: 'Einmal erzeugt' },
        responseId: 'resp-einmalig',
        usage: { input_tokens: 10, output_tokens: 5 },
        promptVersion: 'test-v1'
      };
    }
  });

  await assert.rejects(
    executePaidStructuredTextStage(input, dependencies),
    { code: 'CONTENT_JOB_LEASE_LOST' }
  );
  assert.ok(persisted);
  assert.equal(state.settlements.length, 0);

  dependencies.assertLease = async () => { state.events.push('lease'); };
  state.events.length = 0;
  const retried = await executePaidStructuredTextStage(input, dependencies);

  assert.equal(providerCalls, 1);
  assert.equal(state.reservations.length, 1);
  assert.deepEqual(state.events, ['load', 'lease', 'settle', 'record:true']);
  assert.deepEqual(state.settlements, [{
    runId: 7,
    stageId: 'targeted_optimization',
    reservationMonth: '2026-07',
    actualCost: 0.015
  }]);
  assert.deepEqual(retried, {
    value: { title: 'Einmal erzeugt' },
    envelope: persisted,
    reused: true
  });
});

test('offene Reservierung stoppt ohne zweiten Provideraufruf', async () => {
  let calls = 0;
  const result = await executePaidStructuredTextStage(stageInput({
    async execute() { calls += 1; }
  }), {
    assertLease: async () => true,
    costService: {
      async getPersistedStageResult() { return null; },
      async reserveMonthlyBudget() {
        return { created: false, status: 'reserved', reservationMonth: '2026-07' };
      }
    }
  });

  assert.equal(calls, 0);
  assert.equal(result.manual.code, 'provider_execution_uncertain');
});

test('Budgetgrenze wird zentral als manueller Abschluss statt als Ausnahme zurückgegeben', async () => {
  let calls = 0;
  const result = await executePaidStructuredTextStage(stageInput({
    async execute() { calls += 1; }
  }), {
    assertLease: async () => true,
    costService: {
      async getPersistedStageResult() { return null; },
      async reserveMonthlyBudget() {
        throw Object.assign(new Error('Monatsbudget ausgeschöpft'), {
          code: 'CONTENT_BUDGET_LIMIT_REACHED'
        });
      }
    }
  });

  assert.equal(calls, 0);
  assert.deepEqual(result, {
    manual: {
      code: 'CONTENT_BUDGET_LIMIT_REACHED',
      message: 'Das konfigurierte Monatsbudget für KI-Inhalte ist ausgeschöpft.'
    }
  });
});

test('persistiertes Ergebnis mit falschem Versionszaun wird nicht verwendet oder erneut ausgeführt', async () => {
  let calls = 0;
  let reservations = 0;
  const result = await executePaidStructuredTextStage(stageInput({
    async execute() { calls += 1; }
  }), {
    assertLease: async () => true,
    costService: {
      async getPersistedStageResult() {
        return { value: { title: 'Veraltet' }, liveHash: 'b'.repeat(64) };
      },
      async reserveMonthlyBudget() { reservations += 1; }
    }
  });

  assert.equal(result.manual.code, 'provider_stage_result_invalid');
  assert.equal(calls, 0);
  assert.equal(reservations, 0);
});

test('neue Textstufe persistiert validiertes Envelope samt Response-ID vor dem Settlement', async () => {
  const { dependencies, state } = stageDependencies();
  const result = await executePaidStructuredTextStage(stageInput({
    async execute() {
      state.events.push('execute');
      return {
        value: { title: 'Neu' },
        responseId: 'resp-neu',
        usage: { input_tokens: 10, output_tokens: 5 },
        promptVersion: 'test-v1'
      };
    }
  }), dependencies);

  assert.deepEqual(state.events, [
    'load',
    'lease',
    'reserve',
    'lease',
    'execute',
    'estimate',
    'lease',
    'persist',
    'lease',
    'settle',
    'record:true'
  ]);
  assert.deepEqual(state.reservations, [{
    runId: 7,
    stageId: 'targeted_optimization',
    estimatedCost: 0.5,
    limit: 25,
    timezone: 'Europe/Berlin'
  }]);
  assert.deepEqual(state.persistedStages, [{
    runId: 7,
    currentStage: 'targeted_optimization',
    stageId: 'targeted_optimization',
    stageResult: {
      value: { title: 'Neu' },
      responseId: 'resp-neu',
      usage: { input_tokens: 10, output_tokens: 5 },
      promptVersion: 'test-v1',
      liveHash: LIVE_HASH,
      reservationMonth: '2026-07',
      actualCost: 0.015
    },
    tokenUsage: { input_tokens: 10, output_tokens: 5 },
    responseIds: ['resp-neu']
  }]);
  assert.deepEqual(state.settlements, [{
    runId: 7,
    stageId: 'targeted_optimization',
    reservationMonth: '2026-07',
    actualCost: 0.015
  }]);
  assert.deepEqual(result, {
    value: { title: 'Neu' },
    envelope: state.persistedStages[0].stageResult,
    reused: false
  });
});

test('Leaseverlust nach Providerantwort und vor Persistenz bleibt ohne Wiederholung manuell', async () => {
  const { dependencies, state } = stageDependencies();
  let leaseCalls = 0;
  let providerCalls = 0;
  dependencies.assertLease = async () => {
    state.events.push('lease');
    leaseCalls += 1;
    if (leaseCalls === 3) {
      throw Object.assign(new Error('Lease nach Providerantwort verloren'), {
        code: 'CONTENT_JOB_LEASE_LOST'
      });
    }
  };

  const result = await executePaidStructuredTextStage(stageInput({
    async execute() {
      state.events.push('execute');
      providerCalls += 1;
      return {
        value: { title: 'Nicht erneut erzeugen' },
        responseId: 'resp-ungeklaert',
        usage: { input_tokens: 10, output_tokens: 5 },
        promptVersion: 'test-v1'
      };
    }
  }), dependencies);

  assert.equal(providerCalls, 1);
  assert.equal(result.manual.code, 'provider_execution_uncertain');
  assert.deepEqual(state.events, [
    'load',
    'lease',
    'reserve',
    'lease',
    'execute',
    'estimate',
    'lease'
  ]);
  assert.equal(state.persistedStages.length, 0);
  assert.equal(state.settlements.length, 0);
  assert.equal(state.releases.length, 0);
});

test('zusätzliche Web-Suchkosten werden im Envelope und Settlement berücksichtigt', async () => {
  const { dependencies, state } = stageDependencies();
  const result = await executePaidStructuredTextStage(stageInput({
    calculateAdditionalCost(providerResult) {
      return providerResult.webSearchCallCount * 0.01;
    },
    async execute() {
      state.events.push('execute');
      return {
        value: { title: 'Mit Recherche' },
        responseId: 'resp-recherche',
        usage: { input_tokens: 10, output_tokens: 5 },
        promptVersion: 'test-v1',
        webSearchCallCount: 3
      };
    }
  }), dependencies);

  assert.equal(result.envelope.textCost, 0.015);
  assert.equal(result.envelope.additionalCost, 0.03);
  assert.equal(result.envelope.webSearchCallCount, 3);
  assert.equal(result.envelope.actualCost, 0.045);
  assert.deepEqual(state.settlements, [{
    runId: 7,
    stageId: 'targeted_optimization',
    reservationMonth: '2026-07',
    actualCost: 0.045
  }]);
});

test('ungültiges Structured Output bleibt mit offener Reservierung zur manuellen Prüfung', async () => {
  const { dependencies, state } = stageDependencies();
  const result = await executePaidStructuredTextStage(stageInput({
    async execute() {
      return {
        value: { title: 17 },
        responseId: 'resp-ungueltig',
        usage: { input_tokens: 10, output_tokens: 5 },
        promptVersion: 'test-v1'
      };
    }
  }), dependencies);

  assert.equal(result.manual.code, 'provider_stage_schema_invalid');
  assert.ok(result.manual.issues.length > 0);
  assert.equal(state.persistedStages.length, 0);
  assert.equal(state.settlements.length, 0);
  assert.equal(state.releases.length, 0);
});

test('unklare Providerfehler bleiben ohne Freigabe und Wiederholung manuell', async () => {
  const { dependencies, state } = stageDependencies();
  const result = await executePaidStructuredTextStage(stageInput({
    async execute() {
      throw Object.assign(new Error('Verbindung nach Versand abgebrochen'), {
        code: 'OPENAI_CONNECTION_UNCERTAIN'
      });
    }
  }), dependencies);

  assert.equal(result.manual.code, 'provider_execution_uncertain');
  assert.equal(state.releases.length, 0);
  assert.deepEqual(state.providerResults, [{
    providerName: 'openai',
    success: false,
    errorCode: 'OPENAI_CONNECTION_UNCERTAIN'
  }]);
});

test('429- und safeToRetry-Fehler werden erst nach atomarer Reservierungsfreigabe wiederholbar', async () => {
  for (const providerError of [
    Object.assign(new Error('Rate-Limit'), { status: 429 }),
    Object.assign(new Error('Sicher vor Versand fehlgeschlagen'), { safeToRetry: true })
  ]) {
    const { dependencies, state } = stageDependencies();
    await assert.rejects(
      executePaidStructuredTextStage(stageInput({
        async execute() { throw providerError; }
      }), dependencies),
      (error) => error === providerError
        && error.code === 'CONTENT_PROVIDER_SAFE_RETRY'
        && error.retryable === true
    );
    assert.deepEqual(state.releases, [{
      runId: 7,
      stageId: 'targeted_optimization',
      reservationMonth: '2026-07'
    }]);
    assert.ok(state.events.indexOf('release') > state.events.indexOf('record:false'));
  }
});

test('fehlgeschlagene Reservierungsfreigabe macht einen sicheren Providerfehler manuell', async () => {
  const { dependencies, state } = stageDependencies();
  dependencies.costService.releaseMonthlyBudgetReservation = async () => {
    state.events.push('release');
    throw new Error('Freigabe unklar');
  };
  const result = await executePaidStructuredTextStage(stageInput({
    async execute() { throw Object.assign(new Error('Rate-Limit'), { status: 429 }); }
  }), dependencies);

  assert.equal(result.manual.code, 'provider_execution_uncertain');
  assert.equal(state.events.filter((event) => event === 'release').length, 1);
});

test('unklare Ergebnispersistenz verhindert Settlement und Wiederholung', async () => {
  const { dependencies, state } = stageDependencies();
  dependencies.runRepository.updateRunStage = async () => {
    state.events.push('persist');
    throw new Error('Persistenz unklar');
  };
  const result = await executePaidStructuredTextStage(stageInput(), dependencies);

  assert.equal(result.manual.code, 'provider_stage_persistence_uncertain');
  assert.equal(state.settlements.length, 0);
  assert.equal(state.releases.length, 0);
});

test('fehlende Persistenzbestätigung verhindert Settlement und Erfolgsstatus', async () => {
  const { dependencies, state } = stageDependencies();
  dependencies.runRepository.updateRunStage = async () => {
    state.events.push('persist');
    return null;
  };

  const result = await executePaidStructuredTextStage(stageInput(), dependencies);

  assert.equal(result.manual.code, 'provider_stage_persistence_uncertain');
  assert.equal(state.settlements.length, 0);
  assert.equal(state.providerResults.length, 0);
});

test('konkurrierend vorhandenes anderes Stage-Ergebnis verhindert Settlement', async () => {
  const { dependencies, state } = stageDependencies();
  dependencies.runRepository.updateRunStage = async (runId, payload) => {
    state.events.push('persist');
    return {
      id: runId,
      stage_results_json: {
        [payload.stageId]: {
          ...structuredClone(payload.stageResult),
          responseId: 'resp-konkurrenz'
        }
      }
    };
  };

  const result = await executePaidStructuredTextStage(stageInput(), dependencies);

  assert.equal(result.manual.code, 'provider_stage_persistence_uncertain');
  assert.equal(state.settlements.length, 0);
  assert.equal(state.providerResults.length, 0);
});
