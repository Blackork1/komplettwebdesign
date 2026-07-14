import assert from 'node:assert/strict';
import test from 'node:test';

import { createProductionJobHandler, jobConfigFromSnapshot } from '../scripts/contentWorker.js';
import {
  CONTENT_AGENT_RULE_MANIFEST_HASH,
  bindContentRulesToSnapshot
} from '../services/contentAgent/contentRuleManifest.js';
import { createContentAgentJobSnapshot } from '../services/contentAgent/runtimeConfigService.js';

const claim = {
  id: 701,
  job_type: 'generate_weekly_draft',
  attempts: 1,
  payload_json: { source: 'weekly-schedule' }
};

const inventory = {
  blogPosts: [{ slug: 'bestehender-artikel' }],
  guides: [{ slug: 'website-planen' }],
  servicePages: [{ slug: 'seo' }],
  industries: [{ slug: 'handwerker' }],
  packages: [],
  approvedLinks: [{ url: '/kontakt' }, { url: '/leistungen/seo' }]
};

function runtimeConfig() {
  return {
    operatingMode: 'review', timezone: 'Europe/Berlin', monthlyCostLimitEur: 25,
    autoPublishMinScore: 90, maxAttempts: 3, manualApprovalsCount: 0,
    autoPublishEffective: false, maxTopicCandidates: 8, maxRevisions: 2,
    contentStageReservationEur: 0.5, reviewStageReservationEur: 0.25,
    contentInputCostPerMtok: 2.5, contentOutputCostPerMtok: 15,
    reviewInputCostPerMtok: 0.75, reviewOutputCostPerMtok: 4.5,
    imageCostEur: 0.041, contentModel: 'content', reviewModel: 'review', imageModel: 'image',
    settingsVersion: 4
  };
}

const activeLearningRules = [{
  id: 4,
  version: 2,
  category_key: 'technical_precision',
  rule_text: 'Erkläre technische Zusammenhänge so konkret, dass Unternehmer die nächste Entscheidung nachvollziehbar treffen können.',
  target_stages: ['writer', 'reviewer']
}];

test('erster Generierungsrun lädt Linkinventar vor createRun und Retry verwendet unverändert denselben Snapshot', async () => {
  let storedRun = null;
  let inventoryLoads = 0;
  let createRuns = 0;
  let settingsLoads = 0;
  let learningRuleLoads = 0;
  const pipelineCalls = [];
  const events = [];
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    enforceRuleSnapshot: true,
    async findRunByJobId() { return storedRun && structuredClone(storedRun); },
    async getSettings() { settingsLoads += 1; return { settings_version: 4 }; },
    resolveRuntimeConfig: () => runtimeConfig(),
    async loadActiveLearningRules() {
      learningRuleLoads += 1;
      return structuredClone(activeLearningRules);
    },
    createJobSnapshot: createContentAgentJobSnapshot,
    async loadInitialInventory() {
      inventoryLoads += 1;
      events.push('inventory');
      return structuredClone(inventory);
    },
    async createRun(input) {
      createRuns += 1;
      events.push('run');
      storedRun = {
        id: 81,
        status: 'running',
        runtime_snapshot_json: structuredClone(input.runtimeSnapshot),
        stage_results_json: {}
      };
      return structuredClone(storedRun);
    },
    createPipelineDependencies(snapshot, initialInventory) {
      return { config: snapshot, initialInventory };
    },
    async runPipeline(input, dependencies) {
      pipelineCalls.push({ input, dependencies: structuredClone(dependencies) });
      return { status: 'completed' };
    }
  });

  await handler(claim);
  await handler({ ...claim, attempts: 2 });

  assert.deepEqual(events, ['inventory', 'run']);
  assert.equal(inventoryLoads, 1);
  assert.equal(settingsLoads, 1);
  assert.equal(learningRuleLoads, 1);
  assert.equal(createRuns, 1);
  assert.equal(storedRun.runtime_snapshot_json.ruleManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);
  assert.deepEqual(storedRun.runtime_snapshot_json.allowedInternalLinks, [
    '/blog',
    '/blog/bestehender-artikel',
    '/branchen',
    '/branchen/handwerker',
    '/kontakt',
    '/leistungen',
    '/leistungen/seo',
    '/pakete',
    '/ratgeber',
    '/ratgeber/website-planen',
    '/webdesign-berlin'
  ]);
  assert.match(storedRun.runtime_snapshot_json.allowedInternalLinksHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    storedRun.runtime_snapshot_json.learningRuleSnapshot.rules.map(({ id, version }) => [id, version]),
    [[4, 2]]
  );
  assert.deepEqual(pipelineCalls.map(({ dependencies }) => dependencies.config), [
    storedRun.runtime_snapshot_json,
    storedRun.runtime_snapshot_json
  ]);
  assert.deepEqual(pipelineCalls.map(({ dependencies }) => Boolean(dependencies.initialInventory)), [true, false]);
});

test('Manifest-Mismatch eines nichtterminalen Runs endet vor Dependencies und Provider kontrolliert manuell', async () => {
  const current = bindContentRulesToSnapshot({
    baseSnapshot: runtimeConfig(),
    allowedInternalLinks: ['/kontakt'],
    requireAllowedInternalLinks: true
  });
  const stale = {
    ...current,
    ruleManifest: { ...current.ruleManifest, articleWriterPrompt: 'alte-regel' }
  };
  const finishes = [];
  let providerCalls = 0;
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    enforceRuleSnapshot: true,
    async findRunByJobId() {
      return { id: 91, status: 'running', runtime_snapshot_json: stale, stage_results_json: {} };
    },
    async getSettings() { assert.fail('Retry darf keine Live-Einstellungen laden.'); },
    resolveRuntimeConfig() { assert.fail('Retry darf keine Live-Konfiguration auflösen.'); },
    createJobSnapshot() { assert.fail('Retry darf den Snapshot nicht ersetzen.'); },
    async loadInitialInventory() { assert.fail('Retry darf kein Live-Inventar laden.'); },
    createPipelineDependencies() { providerCalls += 1; return {}; },
    async runPipeline() { providerCalls += 1; return { status: 'completed' }; },
    async createRun() { assert.fail('Vorhandener Run darf nicht neu angelegt werden.'); },
    async finishRun(runId, payload) { finishes.push({ runId, payload }); return { id: runId, ...payload }; }
  });

  const result = await handler({ ...claim, attempts: 2 });
  assert.deepEqual(result, {
    status: 'needs_manual_attention',
    post: null,
    code: 'CONTENT_RULE_MANIFEST_MISMATCH'
  });
  assert.equal(providerCalls, 0);
  assert.deepEqual(finishes, [{
    runId: 91,
    payload: {
      status: 'needs_manual_attention',
      postId: null,
      errorReport: {
        code: 'CONTENT_RULE_MANIFEST_MISMATCH',
        message: 'Der gespeicherte Regelsnapshot passt nicht zur aktuellen Content-Agent-Version.'
      }
    }
  }]);
});

test('Manifest-Mismatch terminalisiert nach Leaseverlust niemals durch einen veralteten Worker', async () => {
  const current = bindContentRulesToSnapshot({
    baseSnapshot: runtimeConfig(),
    allowedInternalLinks: ['/kontakt'],
    requireAllowedInternalLinks: true
  });
  const stale = {
    ...current,
    ruleManifest: { ...current.ruleManifest, articleWriterPrompt: 'alte-regel' }
  };

  for (const leaseGuard of [
    async () => false,
    async () => {
      throw Object.assign(new Error('Lease verloren'), {
        code: 'CONTENT_JOB_LEASE_LOST',
        retryable: false
      });
    }
  ]) {
    let finishCalls = 0;
    const handler = createProductionJobHandler({
      technicalConfig: { enabled: true },
      enforceRuleSnapshot: true,
      async findRunByJobId() {
        return { id: 91, status: 'running', runtime_snapshot_json: stale, stage_results_json: {} };
      },
      async getSettings() { assert.fail('Retry darf keine Live-Einstellungen laden.'); },
      resolveRuntimeConfig() { assert.fail('Retry darf keine Live-Konfiguration auflösen.'); },
      createJobSnapshot() { assert.fail('Retry darf den Snapshot nicht ersetzen.'); },
      async createRun() { assert.fail('Vorhandener Run darf nicht neu angelegt werden.'); },
      async finishRun() { finishCalls += 1; return { id: 91 }; },
      async runPipeline() { assert.fail('Provider darf nicht aufgerufen werden.'); }
    });

    await assert.rejects(
      handler({ ...claim, attempts: 2 }, { leaseGuard }),
      (error) => error?.code === 'CONTENT_JOB_LEASE_LOST' && error?.retryable === false
    );
    assert.equal(finishCalls, 0);
  }
});

test('Jobconfig übernimmt Link- und Regelbasis niemals aus der technischen Live-Konfiguration', () => {
  const stored = bindContentRulesToSnapshot({
    baseSnapshot: { enabled: true, autoPublishEffective: false },
    allowedInternalLinks: ['/kontakt'],
    requireAllowedInternalLinks: true
  });
  const config = jobConfigFromSnapshot({
    enabled: true,
    autoPublishEnabled: true,
    allowedInternalLinks: ['/live-geändert'],
    ruleManifest: { articleWriterPrompt: 'live-geändert' },
    ruleManifestHash: 'live-geändert'
  }, stored);

  assert.deepEqual(config.allowedInternalLinks, ['/kontakt']);
  assert.deepEqual(config.ruleManifest, stored.ruleManifest);
  assert.equal(config.ruleManifestHash, stored.ruleManifestHash);
});

test('Fehler beim ersten Inventarladen legt weder Run an noch ruft Provider auf', async () => {
  let runCalls = 0;
  let providerCalls = 0;
  const handler = createProductionJobHandler({
    technicalConfig: { enabled: true },
    enforceRuleSnapshot: true,
    async findRunByJobId() { return null; },
    async getSettings() { return {}; },
    resolveRuntimeConfig: () => runtimeConfig(),
    createJobSnapshot: createContentAgentJobSnapshot,
    async loadInitialInventory() { throw new Error('Inventar nicht verfügbar'); },
    async createRun() { runCalls += 1; return null; },
    createPipelineDependencies() { providerCalls += 1; return {}; },
    async runPipeline() { providerCalls += 1; return { status: 'completed' }; }
  });

  await assert.rejects(handler(claim), /Inventar nicht verfügbar/);
  assert.equal(runCalls, 0);
  assert.equal(providerCalls, 0);
});
