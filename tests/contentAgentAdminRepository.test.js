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
      if (/FROM content_jobs/i.test(normalized)) return { rows: [{ id: 7, status: 'failed' }] };
      if (/FROM content_provider_state/i.test(normalized)) return { rows: [{ provider_name: 'openai' }] };
      return { rows: [] };
    }
  };
}

function createTransactionDatabase(handler, { published = true, hasDraft = false } = {}) {
  const calls = [];
  let releases = 0;
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      calls.push({ sql: normalized, params });
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rows: [] };
      }
      if (/SELECT id, published FROM posts/i.test(normalized) && /FOR UPDATE/i.test(normalized)) {
        return { rows: [{ id: params[0], published }] };
      }
      if (/AS has_draft_revision/i.test(normalized)) {
        return { rows: [{ has_draft_revision: hasDraft }] };
      }
      return handler({ sql: normalized, params, calls });
    },
    release() { releases += 1; }
  };
  return {
    calls,
    get releases() { return releases; },
    async connect() { return client; }
  };
}

function createPreferenceTransactionDb({
  published = true,
  eligible = true,
  changedPostIds = [19],
  failOnWrite = false
} = {}) {
  const calls = [];
  let releases = 0;
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      calls.push({ sql: normalized, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
      if (/SELECT p\.id FROM posts p/i.test(normalized) && /FOR UPDATE/i.test(normalized)) {
        return { rows: published ? [{ id: params[0] }] : [] };
      }
      if (/FROM \( SELECT snapshot\.id/i.test(normalized)) {
        return { rows: eligible ? [{ id: 71 }] : [] };
      }
      if (/INSERT INTO content_existing_post_admin_preferences/i.test(normalized)
          || /UPDATE content_existing_post_admin_preferences/i.test(normalized)) {
        if (failOnWrite) throw new Error('Schreibfehler');
        return { rows: changedPostIds.map((postId) => ({ post_id: postId })) };
      }
      return { rows: [] };
    },
    release() { releases += 1; }
  };
  return {
    calls,
    get releases() { return releases; },
    async connect() { return client; }
  };
}

test('Bestandsliste lädt den neuesten Performance-Snapshot ohne N+1-Abfragen', async () => {
  const db = {
    calls: [],
    async query(sql, params = []) {
      this.calls.push({ sql: normalizeSql(sql), params });
      return { rows: [{ id: 7, performance_snapshot_id: 19 }] };
    }
  };
  const repository = createContentAgentAdminRepository(db);
  const rows = await repository.listExistingContent();

  assert.equal(rows[0].performance_snapshot_id, 19);
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /LEFT JOIN LATERAL \( SELECT snapshot\.id/i);
  assert.match(db.calls[0].sql, /ORDER BY snapshot\.evaluated_through_date DESC/i);
});

test('Bestandsliste lädt den Adminstatus ohne N+1-Abfrage', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  await repository.listExistingContent();

  assert.match(
    db.calls[0].sql,
    /LEFT JOIN content_existing_post_admin_preferences admin_preference ON admin_preference\.post_id = p\.id/i
  );
  assert.match(
    db.calls[0].sql,
    /COALESCE\(admin_preference\.hidden_from_zero_impression_list, FALSE\) AS zero_impression_hidden/i
  );
  assert.match(
    db.calls[0].sql,
    /legacy_guard\.has_active_legacy_ejs/i
  );
  assert.match(
    db.calls[0].sql,
    /p\.content_format = 'legacy_ejs'[\s\S]*POSITION\('<%' IN p\.content\)/i
  );
});

test('Ausblenden verlangt den neuesten vollständigen Null-Impressions-Snapshot', async () => {
  const db = createPreferenceTransactionDb({ published: true, eligible: true });
  const repository = createContentAgentAdminRepository(db);

  assert.deepEqual(
    await repository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: true }),
    { status: 'updated' }
  );

  const eligibility = db.calls.find(({ sql }) => /FROM \( SELECT snapshot\.id/i.test(sql));
  assert.match(eligibility.sql, /ORDER BY snapshot\.evaluated_through_date DESC, snapshot\.id DESC LIMIT 1/i);
  assert.match(eligibility.sql, /latest\.article_age_days >= 28/i);
  assert.match(eligibility.sql, /latest\.evaluated_through_date IS NOT NULL/i);
  assert.match(eligibility.sql, /'complete'\)::boolean, FALSE\s*\) = TRUE/i);
  assert.match(eligibility.sql, /'coverageDayCount'\)::integer, 0\s*\) >= 28/i);
  assert.match(eligibility.sql, /'impressions'\)::numeric, 0\s*\) = 0/i);
  const write = db.calls.find(({ sql }) => /INSERT INTO content_existing_post_admin_preferences/i.test(sql));
  assert.deepEqual(write.params, [19, true]);
  assert.match(write.sql, /ON CONFLICT \(post_id\) DO UPDATE SET/i);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
  assert.equal(db.releases, 1);
});

test('neue Impressionen blockieren Ausblenden ohne Präferenzschreibzugriff', async () => {
  const db = createPreferenceTransactionDb({ published: true, eligible: false });
  const repository = createContentAgentAdminRepository(db);

  assert.deepEqual(
    await repository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: true }),
    { status: 'not_eligible' }
  );
  assert.equal(db.calls.some(({ sql }) =>
    /INSERT INTO content_existing_post_admin_preferences/i.test(sql)), false);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
});

test('Einblenden setzt eine gespeicherte Präferenz auch ohne Null-Impressions-Eignung zurück', async () => {
  const db = createPreferenceTransactionDb({ published: true, eligible: false });
  const repository = createContentAgentAdminRepository(db);

  assert.deepEqual(
    await repository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: false }),
    { status: 'updated' }
  );
  assert.equal(db.calls.some(({ sql }) => /FROM \( SELECT snapshot\.id/i.test(sql)), false);
  const write = db.calls.find(({ sql }) => /INSERT INTO content_existing_post_admin_preferences/i.test(sql));
  assert.deepEqual(write.params, [19, false]);
});

test('Einzelpräferenz unterscheidet fehlende Liveartikel und rollt Schreibfehler zurück', async () => {
  const missingDb = createPreferenceTransactionDb({ published: false });
  const missingRepository = createContentAgentAdminRepository(missingDb);
  assert.deepEqual(
    await missingRepository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: true }),
    { status: 'not_found' }
  );
  assert.equal(missingDb.calls.at(-1).sql, 'COMMIT');

  const failingDb = createPreferenceTransactionDb({ failOnWrite: true });
  const failingRepository = createContentAgentAdminRepository(failingDb);
  await assert.rejects(
    failingRepository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: true }),
    /Schreibfehler/
  );
  assert.equal(failingDb.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(failingDb.releases, 1);
});

test('Sammelausblendung berechnet aktuelle vollständige Null-Impressions-Artikel serverseitig', async () => {
  const db = createPreferenceTransactionDb({ changedPostIds: [19, 20] });
  const repository = createContentAgentAdminRepository(db);

  assert.deepEqual(
    await repository.setAllExistingContentZeroImpressionHidden(true),
    { changedCount: 2 }
  );

  const write = db.calls.find(({ sql }) => /INSERT INTO content_existing_post_admin_preferences/i.test(sql));
  assert.deepEqual(write.params, []);
  assert.match(write.sql, /FROM posts p/i);
  assert.match(write.sql, /JOIN LATERAL \( SELECT snapshot\.article_age_days/i);
  assert.match(write.sql, /ORDER BY snapshot\.evaluated_through_date DESC, snapshot\.id DESC LIMIT 1/i);
  assert.match(write.sql, /p\.published = TRUE/i);
  assert.match(write.sql, /performance\.article_age_days >= 28/i);
  assert.match(write.sql, /'complete'\)::boolean, FALSE\s*\) = TRUE/i);
  assert.match(write.sql, /'coverageDayCount'\)::integer, 0\s*\) >= 28/i);
  assert.match(write.sql, /'impressions'\)::numeric, 0\s*\) = 0/i);
  assert.match(write.sql, /ON CONFLICT \(post_id\) DO UPDATE SET/i);
  assert.match(write.sql, /RETURNING post_id/i);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
});

test('Sammel-Einblendung setzt ausschließlich aktive Präferenzen idempotent zurück', async () => {
  const db = createPreferenceTransactionDb({ changedPostIds: [] });
  const repository = createContentAgentAdminRepository(db);

  assert.deepEqual(
    await repository.setAllExistingContentZeroImpressionHidden(false),
    { changedCount: 0 }
  );

  const write = db.calls.find(({ sql }) => /UPDATE content_existing_post_admin_preferences/i.test(sql));
  assert.match(write.sql, /SET hidden_from_zero_impression_list = FALSE/i);
  assert.match(write.sql, /WHERE hidden_from_zero_impression_list = TRUE/i);
  assert.match(write.sql, /RETURNING post_id/i);
});

test('Präferenzmethoden lehnen ungültige Eingaben vor Datenbankzugriff ab', async () => {
  const db = createPreferenceTransactionDb();
  const repository = createContentAgentAdminRepository(db);

  await assert.rejects(
    repository.setExistingContentZeroImpressionHidden({ postId: '19', hidden: true }),
    TypeError
  );
  await assert.rejects(
    repository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: 'true' }),
    TypeError
  );
  await assert.rejects(repository.setAllExistingContentZeroImpressionHidden('true'), TypeError);
  assert.equal(db.calls.length, 0);
});

test('Performance-Detail liefert nur gebundene Artikel-, Snapshot- und Lernfelder', async () => {
  const db = {
    calls: [],
    async query(sql, params = []) {
      this.calls.push({ sql: normalizeSql(sql), params });
      return { rows: [{
        id: 7,
        title: 'Artikel',
        slug: 'artikel',
        content_cluster: 'SEO',
        snapshot_id: 19,
        evaluated_through_date: '2026-07-15',
        article_age_days: 31,
        windows_json: { 28: { impressions: 50 } },
        previous_windows_json: {},
        cohort_json: {},
        performance_status: 'stable',
        diagnoses_json: [],
        positive_signals_json: [],
        data_eligible: true,
        learning_eligible: true,
        explanation_status: 'ready',
        explanation_json: { summary: 'Sicher.' },
        pending_count: 1,
        active_count: 0
      }] };
    }
  };
  const repository = createContentAgentAdminRepository(db);
  const detail = await repository.getArticlePerformanceDetail(7);

  assert.equal(detail.post.id, 7);
  assert.equal(detail.snapshot.id, 19);
  assert.deepEqual(detail.learning, { pendingCount: 1, activeCount: 0 });
  assert.deepEqual(db.calls[0].params, [7]);
  assert.doesNotMatch(db.calls[0].sql, /SELECT\s+\*/i);
  await assert.rejects(repository.getArticlePerformanceDetail('7'), /positive PostgreSQL/);
});

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
    /openai_response_ids_json|payload_json|runtime_snapshot_json|seo_brief_json|generation_metadata_json/i
  );
  assert.doesNotMatch(
    sql,
    /(?:SELECT|,)\s*(?:[a-z]+\.)?stage_results_json\s*(?:,|AS|FROM)/i
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

test('Jobliste projiziert nur die eindeutige offene Providerreservierung', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  await repository.listJobs();

  const call = db.calls.find(({ sql }) => /FROM content_jobs/i.test(sql));
  assert.match(call.sql, /COUNT\(\*\)::int AS open_provider_reservation_count/i);
  assert.match(call.sql, /AS open_provider_stage/i);
  assert.match(call.sql, /AS provider_pre_execution_schema_rejection/i);
  assert.match(call.sql, /AS provider_rejected_schema_repairable/i);
  assert.match(call.sql, /AS provider_rejected_stage/i);
  assert.match(call.sql, /AS quality_gate_structure_repairable/i);
  assert.match(call.sql, /AS quality_gate_editorial_repairable/i);
  assert.match(call.sql, /AS quality_gate_manifest_repairable/i);
  assert.match(
    call.sql,
    /CONTENT_RULE_MANIFEST_MISMATCH[\s\S]*stage_results_json \? 'article_generation'[\s\S]*article_generation\$'[\s\S]*status' = 'settled'/i
  );
  assert.match(call.sql, /AS editorial_policy_recheckable/i);
  assert.match(call.sql, /AS post_is_ai_draft/i);
  assert.match(call.sql, /AS optimization_revision_id/i);
  assert.match(call.sql, /AS optimization_revision_status/i);
  assert.match(
    call.sql,
    /FROM content_post_revisions revision[\s\S]*revision\.optimization_job_id = j\.id/i
  );
  assert.match(call.sql, /entry\.value ->> 'status' = 'reserved'/i);
  const projection = call.sql.match(/^SELECT[\s\S]*?FROM content_jobs/i)?.[0] || '';
  assert.doesNotMatch(projection, /r\.stage_results_json\s*(?:,|AS)/i);
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

test('Search-Console-Dashboard lädt vollständige Seitensummen und Querydetails für die neuesten 28 Datentage', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  const result = await repository.getSearchConsoleInsights();

  const metricCalls = db.calls.filter(({ sql }) => /content_search_metrics/i.test(sql));
  assert.equal(metricCalls.length, 3);
  assert.match(metricCalls[0].sql, /MAX\(metric_date\)/i);
  assert.match(metricCalls[0].sql, /INTERVAL '27 days'/i);
  assert.match(metricCalls[1].sql, /GROUP BY page_url/i);
  assert.doesNotMatch(metricCalls[1].sql, /\bLIMIT\b/i);
  assert.match(metricCalls[2].sql, /GROUP BY page_url, query/i);
  assert.match(metricCalls[2].sql, /LIMIT \$1/i);
  assert.deepEqual(metricCalls[2].params, [300]);
  assert.deepEqual(result, {
    range: null,
    pages: [],
    metrics: [],
    opportunities: [],
    provider: { provider_name: 'openai' }
  });
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
  assert.match(sql, /content_revision_optimization_outcomes/i);
  assert.match(sql, /outcome\.evaluation_status AS outcome_evaluation_status/i);
  assert.match(sql, /baseline_metrics_json ->> 'clicks' AS outcome_baseline_clicks/i);
  assert.match(sql, /followup_metrics_json -> 'newImportantQueries' AS outcome_new_queries_json/i);
  const projection = sql.match(/^SELECT[\s\S]*?FROM posts p/i)?.[0] || '';
  assert.doesNotMatch(
    projection,
    /\bcontent\b|stage_results_json|payload_json\s+AS|openai_response_ids_json|baseline_metrics_json\s*(?:,|AS)|followup_metrics_json\s*(?:,|AS)/i
  );
});

test('Bestandsliste wählt neuesten Job, Run und Optimierungsrevision deterministisch ohne große JSON-Projektion', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);

  await repository.listExistingContent();

  const sql = db.calls[0].sql;
  assert.match(sql, /LEFT JOIN LATERAL \( SELECT j\.id AS optimization_job_id/i);
  assert.match(sql, /j\.job_type = 'optimize_existing_post'/i);
  assert.match(sql, /j\.payload_json ->> 'post_id' = p\.id::text/i);
  assert.match(sql, /ORDER BY j\.created_at DESC, j\.id DESC LIMIT 1/i);
  assert.match(sql, /FROM content_runs run[\s\S]*run\.job_id = optimization_job\.optimization_job_id[\s\S]*ORDER BY run\.started_at DESC, run\.id DESC LIMIT 1/i);
  assert.match(sql, /FROM content_post_revisions optimized_revision[\s\S]*optimized_revision\.optimization_job_id = optimization_job\.optimization_job_id[\s\S]*ORDER BY optimized_revision\.created_at DESC, optimized_revision\.id DESC LIMIT 1/i);
  const projection = sql.match(/^SELECT[\s\S]*?FROM posts p/i)?.[0] || '';
  assert.doesNotMatch(
    projection,
    /stage_results_json\s*(?:,|AS)|runtime_snapshot_json|openai_response_ids_json|payload_json\s+AS|optimization_report_json|snapshot_json|baseline_metrics_json\s*(?:,|AS)|followup_metrics_json\s*(?:,|AS)/i
  );
  assert.match(projection, /optimization_run\.current_stage AS optimization_current_stage/i);
  assert.match(projection, /optimization_revision_id/i);
  assert.match(projection, /draft_revision\.has_draft_revision/i);
  assert.match(projection, /draft_revision\.open_draft_revision_id/i);
  assert.match(sql, /FROM content_post_revisions pending_revision[\s\S]*pending_revision\.post_id = p\.id[\s\S]*pending_revision\.status = 'draft'/i);
  assert.match(
    sql,
    /SELECT pending_revision\.id AS open_draft_revision_id,[\s\S]*TRUE AS has_draft_revision[\s\S]*ORDER BY pending_revision\.created_at DESC, pending_revision\.id DESC[\s\S]*LIMIT 1/i
  );
});

test('kompakter Optimierungsstatus ist auf veröffentlichte INT32-Artikel begrenzt', async () => {
  const row = { id: 19, optimization_job_id: 44, optimization_job_status: 'running' };
  const db = {
    calls: [],
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      this.calls.push({ sql: normalized, params });
      return { rows: [row] };
    }
  };
  const repository = createContentAgentAdminRepository(db);

  assert.equal(await repository.getExistingContentOptimizationState(19), row);
  assert.deepEqual(db.calls[0].params, [19]);
  assert.match(db.calls[0].sql, /p\.id = \$1::integer AND p\.published = TRUE/i);
  assert.match(db.calls[0].sql, /draft_revision\.has_draft_revision/i);
  assert.match(db.calls[0].sql, /draft_revision\.open_draft_revision_id/i);
  const projection = db.calls[0].sql.match(/^SELECT[\s\S]*?FROM posts p/i)?.[0] || '';
  assert.doesNotMatch(
    projection,
    /stage_results_json|runtime_snapshot_json|openai_response_ids_json|optimization_report_json|snapshot_json/i
  );
  assert.match(
    db.calls[0].sql,
    /jsonb_each\(COALESCE\(run\.stage_results_json, '\{\}'::jsonb\)\)[\s\S]*value ->> 'status' = 'reserved'/i
  );
  await assert.rejects(() => repository.getExistingContentOptimizationState(2147483648), TypeError);
  assert.equal(db.calls.length, 1);
});

test('Bestands-Enqueue prüft Agent und Liveartikel atomar und respektiert den aktiven Unique-Index', async () => {
  const inserted = { id: 44, status: 'queued', attempts: 0, max_attempts: 3 };
  const db = createTransactionDatabase(({ sql }) => {
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [inserted] };
    return { rows: [] };
  });
  const repository = createContentAgentAdminRepository(db);

  const result = await repository.enqueueExistingPostOptimizationJob({
    jobType: 'optimize_existing_post',
    idempotencyKey: 'existing-post-optimization:19:uuid',
    payload: {
      source: 'admin_existing_content', post_id: 19, admin_id: 7,
      base_live_hash: 'a'.repeat(64)
    },
    maxAttempts: 3
  });

  assert.equal(result, inserted);
  assert.equal(db.calls[0].sql, 'BEGIN');
  const postLock = db.calls.find(({ sql }) => /SELECT id, published FROM posts/i.test(sql));
  const draftGuard = db.calls.find(({ sql }) => /AS has_draft_revision/i.test(sql));
  assert.match(postLock.sql, /WHERE id = \$1::integer[\s\S]*FOR UPDATE/i);
  assert.deepEqual(postLock.params, [19]);
  assert.ok(db.calls.indexOf(postLock) < db.calls.indexOf(draftGuard));
  const insert = db.calls.find(({ sql }) => /INSERT INTO content_jobs/i.test(sql));
  assert.deepEqual(insert.params, [
    'optimize_existing_post',
    'existing-post-optimization:19:uuid',
    { source: 'admin_existing_content', post_id: 19, admin_id: 7, base_live_hash: 'a'.repeat(64) },
    3
  ]);
  assert.match(insert.sql, /FROM content_agent_settings settings/i);
  assert.match(insert.sql, /settings\.agent_enabled = TRUE/i);
  assert.match(insert.sql, /ON CONFLICT DO NOTHING/i);
  assert.doesNotMatch(insert.sql, /ON CONFLICT \(idempotency_key\)/i);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
  assert.equal(db.releases, 1);
});

test('Bestands-Enqueue erzeugt bei einer offenen Draft-Revision keinen kostenpflichtigen Job', async () => {
  const db = createTransactionDatabase(({ sql }) => {
    if (/INSERT INTO content_jobs/i.test(sql)) {
      assert.fail('Bei offener Draft-Revision darf kein Job erzeugt werden.');
    }
    return { rows: [] };
  }, { hasDraft: true });
  const repository = createContentAgentAdminRepository(db);

  const result = await repository.enqueueExistingPostOptimizationJob({
    jobType: 'optimize_existing_post',
    idempotencyKey: 'existing-post-optimization:19:draft-guard',
    payload: {
      source: 'admin_existing_content', post_id: 19, admin_id: 7,
      base_live_hash: 'a'.repeat(64)
    },
    maxAttempts: 3
  });

  assert.equal(result, null);
  assert.equal(db.calls.some(({ sql }) => /INSERT INTO content_jobs/i.test(sql)), false);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
});

test('paralleler Bestandsstart gibt den bereits aktiven sicheren Zustand statt Duplikat oder 500 zurück', async () => {
  const active = { id: 43, status: 'running', attempts: 1, max_attempts: 3 };
  const db = createTransactionDatabase(({ sql }) => {
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [] };
    if (/FROM content_jobs idempotent_job/i.test(sql)) return { rows: [] };
    if (/FROM content_jobs active_job/i.test(sql)) return { rows: [active] };
    return { rows: [] };
  });
  const repository = createContentAgentAdminRepository(db);

  const result = await repository.enqueueExistingPostOptimizationJob({
    jobType: 'optimize_existing_post',
    idempotencyKey: 'existing-post-optimization:19:parallel',
    payload: {
      source: 'admin_existing_content', post_id: 19, admin_id: 7,
      base_live_hash: 'a'.repeat(64)
    },
    maxAttempts: 3
  });

  assert.equal(result, active);
  const exactLookupIndex = db.calls.findIndex(({ sql }) => /FROM content_jobs idempotent_job/i.test(sql));
  const activeLookupIndex = db.calls.findIndex(({ sql }) => /FROM content_jobs active_job/i.test(sql));
  assert.ok(exactLookupIndex > 0 && exactLookupIndex < activeLookupIndex);
  const exactLookup = db.calls[exactLookupIndex];
  assert.deepEqual(exactLookup.params, [
    'existing-post-optimization:19:parallel',
    'optimize_existing_post',
    { source: 'admin_existing_content', post_id: 19, admin_id: 7, base_live_hash: 'a'.repeat(64) },
    19
  ]);
  assert.match(exactLookup.sql, /idempotent_job\.payload_json = \$3::jsonb/i);
  assert.match(exactLookup.sql, /idempotent_job\.payload_json ->> 'post_id' = \$4::text/i);
  assert.match(exactLookup.sql, /FROM posts p[\s\S]*p\.id = \$4::integer[\s\S]*FOR SHARE/i);
  assert.match(exactLookup.sql, /FROM content_agent_settings settings[\s\S]*settings\.id = 1[\s\S]*FOR SHARE/i);
  assert.match(exactLookup.sql, /FOR SHARE OF idempotent_job/i);
  const lookup = db.calls.find(({ sql }) => /FROM content_jobs active_job/i.test(sql));
  assert.deepEqual(lookup.params, [19]);
  assert.match(lookup.sql, /status IN \('queued', 'running', 'needs_manual_attention'\)/i);
  assert.match(lookup.sql, /p\.published = TRUE/i);
  assert.match(lookup.sql, /settings\.agent_enabled = TRUE/i);
  assert.match(lookup.sql, /active_job\.payload_json - ARRAY\[[\s\S]*\] = '\{\}'::jsonb/i);
  assert.match(lookup.sql, /active_job\.payload_json ->> 'source' = 'admin_existing_content'/i);
  assert.match(lookup.sql, /active_job\.payload_json ->> 'post_id' = \$1::text/i);
  assert.match(lookup.sql, /ORDER BY created_at DESC, id DESC LIMIT 1/i);
  assert.match(lookup.sql, /FOR SHARE OF active_job, p, settings/i);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
});

test('zwei tatsächlich parallele Starts mit verschiedenen Schlüsseln teilen denselben aktiven Job', async () => {
  let persistedJob = null;
  let insertedJobs = 0;
  let releases = 0;
  const db = {
    async connect() {
      return {
        release() { releases += 1; },
        async query(sql, params = []) {
          const normalized = normalizeSql(sql);
          if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
          if (/SELECT id, published FROM posts/i.test(normalized) && /FOR UPDATE/i.test(normalized)) {
            return { rows: [{ id: params[0], published: true }] };
          }
          if (/AS has_draft_revision/i.test(normalized)) {
            return { rows: [{ has_draft_revision: false }] };
          }
          if (/INSERT INTO content_jobs/i.test(normalized)) {
            if (persistedJob) return { rows: [] };
            insertedJobs += 1;
            persistedJob = {
              id: 51,
              status: 'queued',
              attempts: 0,
              max_attempts: params[3],
              idempotencyKey: params[1]
            };
            const { idempotencyKey, ...publicJob } = persistedJob;
            return { rows: [publicJob] };
          }
          if (/FROM content_jobs idempotent_job/i.test(normalized)) {
            if (persistedJob?.idempotencyKey !== params[0]) return { rows: [] };
            const { idempotencyKey, ...publicJob } = persistedJob;
            return {
              rows: [{
                ...publicJob,
                request_matches: true,
                post_published: true,
                agent_enabled: true
              }]
            };
          }
          if (/FROM content_jobs active_job/i.test(normalized)) {
            const { idempotencyKey, ...publicJob } = persistedJob;
            return { rows: [publicJob] };
          }
          return { rows: [] };
        }
      };
    }
  };
  const repository = createContentAgentAdminRepository(db);
  const request = (suffix) => repository.enqueueExistingPostOptimizationJob({
    jobType: 'optimize_existing_post',
    idempotencyKey: `existing-post-optimization:19:${suffix}`,
    payload: {
      source: 'admin_existing_content', post_id: 19, admin_id: 7,
      base_live_hash: 'a'.repeat(64)
    },
    maxAttempts: 3
  });

  const results = await Promise.all([request('parallel-a'), request('parallel-b')]);

  assert.equal(insertedJobs, 1);
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[0].id, 51);
  assert.equal(releases, 2);
});

test('terminaler Job mit identischem Idempotenzschlüssel wird unverändert und vor aktiven Fremdschlüsseln aufgelöst', async () => {
  const terminal = {
    id: 42, status: 'completed', attempts: 1, max_attempts: 3,
    created_at: '2026-07-14T10:00:00.000Z', updated_at: '2026-07-14T10:04:00.000Z'
  };
  const db = createTransactionDatabase(({ sql }) => {
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [] };
    if (/FROM content_jobs idempotent_job/i.test(sql)) {
      return {
        rows: [{
          ...terminal,
          request_matches: true,
          post_published: true,
          agent_enabled: true
        }]
      };
    }
    if (/FROM content_jobs active_job/i.test(sql)) {
      assert.fail('Bei einem passenden Idempotenzschlüssel darf kein fremder aktiver Job gewählt werden.');
    }
    return { rows: [] };
  });
  const repository = createContentAgentAdminRepository(db);

  const result = await repository.enqueueExistingPostOptimizationJob({
    jobType: 'optimize_existing_post',
    idempotencyKey: 'existing-post-optimization:19:terminal',
    payload: {
      source: 'admin_existing_content', post_id: 19, admin_id: 7,
      base_live_hash: 'a'.repeat(64)
    },
    maxAttempts: 3
  });

  assert.deepEqual(result, terminal);
  assert.equal(db.calls.some(({ sql }) => /FROM content_jobs active_job/i.test(sql)), false);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
});

test('identischer Idempotenzschlüssel mit abweichendem Auftrag schlägt geschlossen fehl', async () => {
  const db = createTransactionDatabase(({ sql }) => {
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [] };
    if (/FROM content_jobs idempotent_job/i.test(sql)) {
      return {
        rows: [{
          id: 42, status: 'queued', attempts: 0, max_attempts: 3,
          request_matches: false,
          post_published: true,
          agent_enabled: true
        }]
      };
    }
    if (/FROM content_jobs active_job/i.test(sql)) {
      assert.fail('Ein Same-Key-Mismatch darf nicht auf einen anderen aktiven Job ausweichen.');
    }
    return { rows: [] };
  });
  const repository = createContentAgentAdminRepository(db);

  const result = await repository.enqueueExistingPostOptimizationJob({
    jobType: 'optimize_existing_post',
    idempotencyKey: 'existing-post-optimization:19:kollision',
    payload: {
      source: 'admin_existing_content', post_id: 19, admin_id: 7,
      base_live_hash: 'a'.repeat(64)
    },
    maxAttempts: 3
  });

  assert.equal(result, null);
  assert.equal(db.calls.some(({ sql }) => /FROM content_jobs active_job/i.test(sql)), false);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
});

test('Konfliktauflösung gibt bei zwischenzeitlich unveröffentlichtem Artikel oder deaktiviertem Agenten keinen Job zurück', async (t) => {
  for (const path of ['identischer Schlüssel', 'aktiver Fremdschlüssel']) {
    for (const scenario of [
      { name: 'Artikel unveröffentlicht', post_published: false, agent_enabled: true },
      { name: 'Agent deaktiviert', post_published: true, agent_enabled: false }
    ]) {
      await t.test(`${path}: ${scenario.name}`, async () => {
        const db = createTransactionDatabase(({ sql }) => {
          if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [] };
          if (/FROM content_jobs idempotent_job/i.test(sql)) {
            if (path === 'aktiver Fremdschlüssel') return { rows: [] };
            return {
              rows: [{
                id: 42, status: 'queued', attempts: 0, max_attempts: 3,
                request_matches: true,
                post_published: scenario.post_published,
                agent_enabled: scenario.agent_enabled
              }]
            };
          }
          if (/FROM content_jobs active_job/i.test(sql)) {
            const repeatsGuards = /p\.published = TRUE/i.test(sql)
              && /settings\.agent_enabled = TRUE/i.test(sql);
            return {
              rows: repeatsGuards
                ? []
                : [{ id: 41, status: 'running', attempts: 1, max_attempts: 3 }]
            };
          }
          return { rows: [] };
        });
        const repository = createContentAgentAdminRepository(db);

        const result = await repository.enqueueExistingPostOptimizationJob({
          jobType: 'optimize_existing_post',
          idempotencyKey: `existing-post-optimization:19:${scenario.name}`,
          payload: {
            source: 'admin_existing_content', post_id: 19, admin_id: 7,
            base_live_hash: 'a'.repeat(64)
          },
          maxAttempts: 3
        });

        assert.equal(result, null);
        assert.equal(db.calls.at(-1).sql, 'COMMIT');
      });
    }
  }
});

test('Bestands-Enqueue lehnt zusätzliche Payloadfelder und ungültige IDs vor Transaktionsbeginn ab', async () => {
  const db = createTransactionDatabase(() => ({ rows: [] }));
  const repository = createContentAgentAdminRepository(db);
  const base = {
    jobType: 'optimize_existing_post',
    idempotencyKey: 'existing-post-optimization:19:uuid',
    payload: {
      source: 'admin_existing_content', post_id: 19, admin_id: 7,
      base_live_hash: 'a'.repeat(64)
    },
    maxAttempts: 3
  };

  await assert.rejects(() => repository.enqueueExistingPostOptimizationJob({
    ...base, payload: { ...base.payload, slug: 'unerlaubt' }
  }), TypeError);
  await assert.rejects(() => repository.enqueueExistingPostOptimizationJob({
    ...base, payload: { ...base.payload, post_id: 2147483648 }
  }), TypeError);
  assert.equal(db.calls.length, 0);
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

test('mehrere historische Runs vervielfachen einen Draft nicht', async () => {
  const db = {
    calls: [],
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      this.calls.push({ sql: normalized, params });
      const historicalRuns = [
        { id: 31, post_id: 11, cost_estimate: '8.00' },
        { id: 32, post_id: 11, cost_estimate: '1.25' }
      ];
      const rows = /r\.id = p\.generation_run_id/i.test(normalized)
        ? [{ id: 11, generation_run_id: 32, cost_estimate: historicalRuns[1].cost_estimate }]
        : historicalRuns.map((run) => ({ id: 11, cost_estimate: run.cost_estimate }));
      return { rows };
    }
  };
  const repository = createContentAgentAdminRepository(db);

  const rows = await repository.listDrafts({
    status: 'review',
    now: new Date('2026-07-12T09:00:00.000Z')
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].cost_estimate, '1.25');
  assert.match(db.calls[0].sql, /LEFT JOIN content_runs r ON r\.id = p\.generation_run_id/i);
  assert.doesNotMatch(db.calls[0].sql, /content_runs r ON r\.post_id = p\.id/i);
});
