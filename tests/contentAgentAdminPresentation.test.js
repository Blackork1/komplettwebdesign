import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardPresentation,
  buildDraftListPresentation,
  buildJobListPresentation,
  buildTechnologyPresentation
} from '../services/contentAgent/adminPresentationService.js';

test('Jobpräsentation zeigt bereinigte Fehler und letzte sichere Stufe', () => {
  const [job] = buildJobListPresentation([{
    id: 7,
    status: 'failed',
    current_stage: 'image_generation',
    last_error: 'Upload fehlgeschlagen token=sk-abcdefgh12345678\nInterner Stack',
    attempts: 3,
    max_attempts: 3
  }]);

  assert.equal(job.statusLabel, 'Endgültig fehlgeschlagen');
  assert.equal(job.lastSafeStageLabel, 'Bildgenerierung');
  assert.doesNotMatch(job.lastError, /sk-abcdefgh12345678|Interner Stack/);
});

test('Draftpräsentation reduziert Qualitätsdaten auf sichere Kennzahlen', () => {
  const [draft] = buildDraftListPresentation([{
    id: 11,
    title: 'Sicherer Entwurf',
    content: '<article>vollständiger Artikel</article>',
    quality_report_json: {
      focusedReview: { blocked: true, items: [{ code: 'RISK' }] },
      prompt: 'Geheimer Prompt'
    },
    quality_score: '91',
    cost_estimate: '1.234'
  }]);

  assert.equal(draft.riskBlocked, true);
  assert.equal(draft.riskCount, 1);
  assert.equal(draft.qualityScore, 91);
  assert.equal(draft.costEur, 1.234);
  assert.doesNotMatch(JSON.stringify(draft), /vollständiger Artikel|Geheimer Prompt|quality_report_json/);
});

test('Dashboardstatus basiert ausschließlich auf dem persistierten Worker-Heartbeat', () => {
  const now = new Date('2026-07-11T10:01:00.000Z');
  const active = buildDashboardPresentation({
    settings: { agent_enabled: true, operating_mode: 'review', monthly_budget_cents: 2500 },
    worker: { heartbeat_at: '2026-07-11T10:00:00.000Z' },
    approvals: 8
  }, now);
  const stale = buildDashboardPresentation({
    settings: { agent_enabled: true, operating_mode: 'review' },
    worker: { heartbeat_at: '2026-07-11T09:58:00.000Z' }
  }, now);

  assert.deepEqual(active.worker, { healthy: true, label: 'Worker aktiv' });
  assert.deepEqual(stale.worker, { healthy: false, label: 'Worker nicht erreichbar' });
  assert.equal(active.approvals.ready, true);
});

test('Technikpräsentation übernimmt nur redigierte Werte und bleibt schreibgeschützt', () => {
  const presentation = buildTechnologyPresentation({
    contentModel: { value: 'gpt-content', source: '.env', editable: false, restartRequired: true },
    workerPollMs: { value: 5000, source: '.env', editable: false, restartRequired: true },
    openaiApiKey: { value: 'sk-geheim', source: '.env' }
  }, {
    appVersion: '1.2.3',
    workerVersion: 'worker-9',
    now: new Date('2026-07-11T10:01:00.000Z'),
    worker: { heartbeat_at: '2026-07-11T10:00:00.000Z', worker_id: 'intern' },
    providers: [{
      provider_name: 'openai',
      last_success_at: '2026-07-11T09:59:00.000Z',
      last_failure_at: null,
      last_error_code: null,
      internal_secret: 'nicht ausgeben'
    }]
  });

  assert.equal(presentation.technical.contentModel.editable, false);
  assert.equal(presentation.versions.app.value, '1.2.3');
  assert.equal(presentation.versions.worker.value, 'worker-9');
  assert.deepEqual(presentation.worker, {
    healthy: true,
    label: 'Worker aktiv',
    heartbeatAt: '2026-07-11T10:00:00.000Z'
  });
  const serialized = JSON.stringify(presentation);
  assert.doesNotMatch(serialized, /sk-geheim|openaiApiKey|worker_id|internal_secret|nicht ausgeben/);
});

test('Providerfehler bleibt bei identischen Erfolgs- und Fehlerzeitstempeln sichtbar', () => {
  const instant = '2026-07-11T10:00:00.000Z';
  const presentation = buildTechnologyPresentation({}, {
    providers: [{
      provider_name: 'openai',
      last_success_at: instant,
      last_failure_at: instant,
      last_error_code: 'RATE_LIMIT'
    }]
  });

  assert.equal(presentation.providers[0].healthy, false);
  assert.equal(presentation.providers[0].statusLabel, 'Fehler gemeldet');
  assert.equal(presentation.providers[0].lastErrorCode, 'RATE_LIMIT');
});
