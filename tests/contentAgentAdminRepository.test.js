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
        return { rows: [{ agent_enabled: true, timezone: 'Europe/Berlin', monthly_budget_cents: 2500, manual_approvals_count: 4 }] };
      }
      if (/FROM content_worker_state/i.test(normalized)) {
        return { rows: [{ worker_name: 'content-worker', heartbeat_at: '2026-07-11T10:00:00.000Z' }] };
      }
      if (/jsonb_each\(stage_results_json\)/i.test(normalized)) return { rows: [{ spent: '1.25' }] };
      if (/FROM posts p/i.test(normalized) || /FROM posts WHERE/i.test(normalized)) {
        return { rows: [{ id: 11, title: 'Entwurf' }] };
      }
      if (/^SELECT job_type FROM content_jobs/i.test(normalized)) {
        return { rows: [{ job_type: 'send_admin_review_notification' }] };
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

  const overview = await repository.getOverview({
    technicalMonthlyCostLimitEur: 20,
    now: new Date('2026-07-31T22:30:00.000Z')
  });
  await repository.listDrafts();
  await repository.listJobs();
  await repository.getTechnologyState();

  const sql = db.calls
    .filter(({ sql: statement }) => !/jsonb_each\(stage_results_json\)/i.test(statement))
    .map((call) => call.sql).join(' ');
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
  assert.equal(overview.budgetLimitEur, 20);
  assert.equal(overview.approvals, 4);
  const budgetCall = db.calls.find(({ sql }) => /jsonb_each\(stage_results_json\)/i.test(sql));
  assert.deepEqual(budgetCall.params, ['budget:2026-08:%', '2026-08']);
  assert.match(budgetCall.sql, /status' = 'settled'[\s\S]*actualCost[\s\S]*reservedCost/i);
  assert.match(budgetCall.sql, /status' IN \('reserved', 'settled'\)/i);
  assert.doesNotMatch(budgetCall.sql, /payload_json|openai_response_ids_json|runtime_snapshot_json/i);
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
  assert.match(sql, /r\.audit_id = audit\.id/i);
  assert.doesNotMatch(sql, /\bcontent\b|stage_results_json|payload_json|openai_response_ids_json/i);
});

test('Draftliste lädt pro Post ausschließlich die neueste Admin-Review-Zustellung', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  await repository.listDrafts({
    status: 'missed',
    now: new Date('2026-07-12T09:00:00.000Z')
  });

  const call = db.calls.find(({ sql }) => /FROM posts p/i.test(sql));
  assert.match(call.sql, /LEFT JOIN LATERAL \( SELECT delivery\.status AS notification_status/i);
  assert.match(call.sql, /delivery\.notification_type = 'admin_review'/i);
  assert.match(call.sql, /ORDER BY delivery\.created_at DESC, delivery\.id DESC LIMIT 1/i);
  assert.match(call.sql, /notification_last_error_code/i);
  assert.match(call.sql, /p\.review_version/i);
  assert.match(call.sql, /p\.approved_review_version/i);
  assert.deepEqual(call.params, [new Date('2026-07-12T09:00:00.000Z'), 'missed']);
});

test('Statusfilter wird streng gewhitelistet und verwendet nur feste SQL-Prädikate', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);
  const injection = "published' OR TRUE --";

  for (const status of ['review', 'approved', 'missed', 'published', injection]) {
    await repository.listDrafts({
      status,
      now: new Date('2026-07-12T09:00:00.000Z')
    });
  }

  const calls = db.calls.filter(({ sql }) => /FROM posts p/i.test(sql));
  assert.deepEqual(calls.map(({ params }) => params[1]), [
    'review', 'approved', 'missed', 'published', 'review'
  ]);
  for (const call of calls) {
    assert.doesNotMatch(call.sql, /OR TRUE|--/i);
    assert.match(call.sql, /\$2 = 'review'/i);
    assert.match(call.sql, /\$2 = 'approved'/i);
    assert.match(call.sql, /\$2 = 'missed'/i);
    assert.match(call.sql, /\$2 = 'published'/i);
  }
});

test('Jobtypprüfung lädt ausschließlich die unveränderliche Typkennung', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  const jobType = await repository.getJobType(7);

  const call = db.calls[0];
  assert.equal(jobType, 'send_admin_review_notification');
  assert.match(call.sql, /^SELECT job_type FROM content_jobs WHERE id = \$1$/i);
  assert.deepEqual(call.params, [7]);
  assert.doesNotMatch(call.sql, /payload_json|last_error|runtime_snapshot/i);
});
