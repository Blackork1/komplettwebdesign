import test from 'node:test';
import assert from 'node:assert/strict';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function fixture() {
  return {
    job_id: 1,
    job_type: 'generate_weekly_draft',
    job_status: 'needs_manual_attention',
    attempts: 6,
    max_attempts: 6,
    last_error: 'provider_request_rejected',
    run_id: 11,
    run_status: 'needs_manual_attention',
    current_stage: 'seo_brief',
    post_id: null,
    error_report_json: {
      code: 'provider_request_rejected',
      providerDiagnostic: {
        provider: 'openai',
        stage: 'article_generation',
        code: 'invalid_json_schema',
        httpStatus: 400
      }
    },
    stage_results_json: {
      'budget:2026-07:topic_research': { status: 'settled' },
      topic_research: { value: { candidates: [] } },
      'budget:2026-07:seo_brief': { status: 'settled' },
      seo_brief: { value: { topic: 'Gespeichertes Briefing' } }
    }
  };
}

function createDb(row) {
  const events = [];
  let runUpdates = 0;
  let jobUpdates = 0;
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      events.push({ sql: normalized, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
      if (/FROM content_jobs AS j JOIN content_runs AS r/i.test(normalized)) {
        return { rows: row ? [structuredClone(row)] : [] };
      }
      if (/UPDATE content_runs/i.test(normalized)) {
        runUpdates += 1;
        return { rows: [{ id: row.run_id }] };
      }
      if (/UPDATE content_jobs/i.test(normalized)) {
        jobUpdates += 1;
        return { rows: [{
          id: row.job_id,
          status: 'queued',
          attempts: row.attempts,
          max_attempts: params[1]
        }] };
      }
      throw new Error(`Unerwartete SQL-Abfrage: ${normalized}`);
    },
    release() {}
  };
  return {
    events,
    get runUpdates() { return runUpdates; },
    get jobUpdates() { return jobUpdates; },
    async connect() { return client; }
  };
}

test('vorab abgelehnte Artikelerstellung wird ohne Kostenmutation erneut eingereiht', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverRejectedProviderJobForAdmin, 'function');
  const row = fixture();
  const db = createDb(row);

  const result = await module.recoverRejectedProviderJobForAdmin({ jobId: 1, adminId: 7 }, db);

  assert.equal(result.job.max_attempts, 7);
  assert.equal(result.recoveredStage, 'article_generation');
  assert.equal(result.auditKey, 'provider_schema_recovery:article_generation:attempt-6');
  assert.equal(db.runUpdates, 1);
  assert.equal(db.jobUpdates, 1);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.doesNotMatch(runUpdate.sql, /cost_estimate\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /stage_results_json\s*-/i);
  assert.deepEqual(runUpdate.params, [
    11,
    'provider_schema_recovery:article_generation:attempt-6',
    'article_generation',
    7
  ]);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 7, 6]);
});

for (const [label, mutate] of [
  ['offene Reservierung', (row) => {
    row.stage_results_json['budget:2026-07:article_generation'] = { status: 'reserved' };
  }],
  ['falsche Providerstufe', (row) => {
    row.error_report_json.providerDiagnostic.stage = 'review';
  }],
  ['fehlendes SEO-Briefing', (row) => {
    delete row.stage_results_json.seo_brief;
  }],
  ['ausgeschöpftes Reparaturlimit', (row) => {
    row.attempts = 7;
    row.max_attempts = 7;
  }]
]) {
  test(`Schemawiederaufnahme bleibt bei ${label} gesperrt`, async () => {
    const module = await import('../repositories/contentJobRepository.js');
    const row = fixture();
    mutate(row);
    const db = createDb(row);

    const result = typeof module.recoverRejectedProviderJobForAdmin === 'function'
      ? await module.recoverRejectedProviderJobForAdmin({ jobId: 1, adminId: 7 }, db)
      : null;

    assert.equal(result, null);
    assert.equal(db.runUpdates, 0);
    assert.equal(db.jobUpdates, 0);
  });
}
