import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentAgentAdminRepository } from '../repositories/contentAgentAdminRepository.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function createQueryRecorder() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      calls.push({ sql: normalized, params });
      if (/FROM content_agent_settings/i.test(normalized)) {
        return { rows: [{ agent_enabled: true, monthly_budget_cents: 2500, manual_approvals_count: 4 }] };
      }
      if (/FROM content_worker_state/i.test(normalized)) {
        return { rows: [{ worker_name: 'content-worker', heartbeat_at: '2026-07-11T10:00:00.000Z' }] };
      }
      if (/SUM\(cost_estimate\)/i.test(normalized)) return { rows: [{ used: '1.25' }] };
      if (/FROM posts p/i.test(normalized) || /FROM posts WHERE/i.test(normalized)) {
        return { rows: [{ id: 11, title: 'Entwurf' }] };
      }
      if (/FROM content_jobs/i.test(normalized)) return { rows: [{ id: 7, status: 'failed' }] };
      if (/FROM content_provider_state/i.test(normalized)) return { rows: [{ provider_name: 'openai' }] };
      return { rows: [] };
    }
  };
}

test('Dashboardabfragen laden keine Rohpayloads, Artikel oder Modellantworten', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  const overview = await repository.getOverview();
  await repository.listDrafts();
  await repository.listJobs();
  await repository.getTechnologyState();

  const sql = db.calls.map((call) => call.sql).join(' ');
  assert.doesNotMatch(
    sql,
    /stage_results_json|openai_response_ids_json|payload_json|runtime_snapshot_json|seo_brief_json|generation_metadata_json/i
  );
  assert.doesNotMatch(sql, /\bSELECT\s+\*/i);
  assert.doesNotMatch(sql, /\bp\.content\b|\bcontent_html\b|\bprompt\b/i);
  assert.doesNotMatch(sql, /m\.quality_report_json\s*(?:,|FROM)/i);
  assert.match(sql, /AS risk_blocked/i);
  assert.match(sql, /AS risk_count/i);
  assert.match(sql, /content_worker_state/i);
  assert.match(sql, /content_agent_settings/i);
  assert.equal(overview.budgetUsed, 1.25);
  assert.equal(overview.approvals, 4);
});

test('Jobliste begrenzt die Ergebniszahl serverseitig auf 1 bis 200', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  await repository.listJobs(9999);
  await repository.listJobs(-4);

  const jobCalls = db.calls.filter(({ sql }) => /FROM content_jobs/i.test(sql));
  assert.deepEqual(jobCalls.map(({ params }) => params), [[200], [1]]);
});

test('Technikstatus liest nur persistierte Zustände und führt keine Provider-Probes aus', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  const state = await repository.getTechnologyState();

  assert.equal(state.worker.worker_name, 'content-worker');
  assert.deepEqual(state.providers, [{ provider_name: 'openai' }]);
  assert.equal(db.calls.length, 2);
  assert.match(db.calls[0].sql, /content_worker_state/i);
  assert.match(db.calls[1].sql, /content_provider_state/i);
});

test('Bestandsliste lädt nur kompakte veröffentlichte Artikeldaten', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  const rows = await repository.listExistingContent();

  assert.equal(rows[0].id, 11);
  const sql = db.calls[0].sql;
  assert.match(sql, /FROM posts/i);
  assert.match(sql, /published = TRUE/i);
  assert.doesNotMatch(sql, /\bcontent\b|stage_results_json|payload_json|openai_response_ids_json/i);
});
