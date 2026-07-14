import test from 'node:test';
import assert from 'node:assert/strict';

import { recoverUncertainProviderJobForAdmin } from '../repositories/contentJobRepository.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function fixture() {
  return {
    job_id: 1,
    job_type: 'generate_weekly_draft',
    job_status: 'needs_manual_attention',
    attempts: 4,
    max_attempts: 4,
    last_error: 'provider_execution_uncertain',
    run_id: 11,
    run_status: 'needs_manual_attention',
    post_id: null,
    error_report_json: { code: 'provider_execution_uncertain' },
    stage_results_json: {
      'budget:2026-07:topic_research': {
        status: 'settled',
        reservationMonth: '2026-07',
        reservedCost: 0.5,
        actualCost: 0.086475
      },
      topic_research: { value: { candidates: [] } },
      'budget:2026-07:seo_brief': {
        status: 'reserved',
        reservationMonth: '2026-07',
        reservedCost: 0.5
      }
    },
    cost_estimate: '0.586475'
  };
}

function createRecoveryDb(row, { failRunUpdate = false } = {}) {
  const events = [];
  let runUpdates = 0;
  let jobUpdates = 0;
  const client = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      events.push({ type: 'query', sql: normalized, params });
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rows: [] };
      }
      if (/pg_advisory_xact_lock\(hashtext\(\$1\)\)/i.test(normalized)) {
        return { rows: [] };
      }
      if (/FROM content_jobs AS j JOIN content_runs AS r/i.test(normalized)) {
        return { rows: row ? [structuredClone(row)] : [] };
      }
      if (/UPDATE content_runs/i.test(normalized)) {
        runUpdates += 1;
        if (failRunUpdate) throw new Error('Run-Update fehlgeschlagen');
        return { rows: [{ id: row.run_id }] };
      }
      if (/UPDATE content_jobs/i.test(normalized)) {
        jobUpdates += 1;
        return {
          rows: [{
            id: row.job_id,
            status: 'queued',
            attempts: row.attempts,
            max_attempts: params[1]
          }]
        };
      }
      throw new Error(`Unerwartete SQL-Abfrage: ${normalized}`);
    },
    release() {
      events.push({ type: 'release' });
    }
  };
  return {
    events,
    get runUpdates() { return runUpdates; },
    get jobUpdates() { return jobUpdates; },
    async connect() {
      events.push({ type: 'connect' });
      return client;
    }
  };
}

test('Providerreservierung wird atomar auditiert und derselbe Job erneut eingereiht', async () => {
  const row = fixture();
  const db = createRecoveryDb(row);

  const result = await recoverUncertainProviderJobForAdmin({ jobId: 1, adminId: 7 }, db);

  assert.deepEqual(result, {
    job: { id: 1, status: 'queued', attempts: 4, max_attempts: 5 },
    runId: 11,
    recoveredStage: 'seo_brief',
    reservationMonth: '2026-07',
    reservedCost: 0.5,
    auditKey: 'provider_recovery:2026-07:seo_brief:attempt-4'
  });
  assert.equal(db.runUpdates, 1);
  assert.equal(db.jobUpdates, 1);
  assert.deepEqual(db.events.map(({ type }) => type), [
    'connect', 'query', 'query', 'query', 'query', 'query', 'query', 'release'
  ]);
  assert.equal(db.events[1].sql, 'BEGIN');
  assert.match(db.events[2].sql, /FOR UPDATE OF j, r/i);
  assert.match(db.events[3].sql, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/i);
  assert.deepEqual(db.events[3].params, ['content-agent-budget:2026-07']);
  assert.equal(db.events[6].sql, 'COMMIT');

  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.match(runUpdate.sql, /status\s*=\s*'running'/i);
  assert.match(runUpdate.sql, /stage_results_json - \$2::text/i);
  assert.match(runUpdate.sql, /'abandoned_uncertain'/i);
  assert.match(runUpdate.sql, /cost_estimate = GREATEST\(0, cost_estimate - \$6::numeric\)/i);
  assert.deepEqual(runUpdate.params, [
    11,
    'budget:2026-07:seo_brief',
    'provider_recovery:2026-07:seo_brief:attempt-4',
    'seo_brief',
    '2026-07',
    0.5,
    7
  ]);

  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.match(jobUpdate.sql, /SET status = 'queued'/i);
  assert.match(jobUpdate.sql, /max_attempts = LEAST\(\$2, GREATEST\(max_attempts, attempts \+ 1\)\)/i);
  const setClause = jobUpdate.sql.match(/SET ([\s\S]+?) WHERE/i)?.[1] || '';
  assert.doesNotMatch(setClause, /(?:^|,)\s*attempts\s*=/i);
  assert.deepEqual(jobUpdate.params, [1, 5, 4]);
});

for (const [label, mutate] of [
  ['ohne Reservierung', (state) => {
    delete state.stage_results_json['budget:2026-07:seo_brief'];
  }],
  ['mit zwei Reservierungen', (state) => {
    state.stage_results_json['budget:2026-07:article_generation'] = {
      status: 'reserved', reservationMonth: '2026-07', reservedCost: 0.5
    };
  }],
  ['mit einer zusätzlichen ungültigen Reservierung', (state) => {
    state.stage_results_json['budget:2026-99:article_generation'] = {
      status: 'reserved', reservationMonth: '2026-99', reservedCost: 0.5
    };
  }],
  ['mit vorhandenem Beitrag', (state) => { state.post_id = 99; }],
  ['mit anderem Fehler', (state) => { state.last_error = 'OPENAI_BAD_REQUEST'; }],
  ['mit anderem Laufstatus', (state) => { state.run_status = 'running'; }],
  ['mit abweichendem Laufbericht', (state) => {
    state.error_report_json = { code: 'OPENAI_BAD_REQUEST' };
  }]
]) {
  test(`Providerreservierung bleibt ${label} unverändert`, async () => {
    const row = fixture();
    mutate(row);
    const db = createRecoveryDb(row);

    const result = await recoverUncertainProviderJobForAdmin({ jobId: 1, adminId: 7 }, db);

    assert.equal(result, null);
    assert.equal(db.runUpdates, 0);
    assert.equal(db.jobUpdates, 0);
    assert.equal(db.events.filter(({ sql }) => sql === 'COMMIT').length, 1);
    assert.equal(db.events.at(-1).type, 'release');
  });
}

test('normale unklare Providerreservierung bleibt am Adminlimit gesperrt', async () => {
  const row = fixture();
  row.attempts = 5;
  row.max_attempts = 5;
  const db = createRecoveryDb(row);

  const result = await recoverUncertainProviderJobForAdmin({ jobId: 1, adminId: 7 }, db);

  assert.equal(result, null);
  assert.equal(db.runUpdates, 0);
  assert.equal(db.jobUpdates, 0);
});

test('bekannter OpenAI-Schemafehler erhält am Adminlimit genau einen Reparaturversuch', async () => {
  const row = fixture();
  row.attempts = 5;
  row.max_attempts = 5;
  row.error_report_json = {
    code: 'provider_execution_uncertain',
    providerDiagnostic: {
      provider: 'openai',
      stage: 'seo_brief',
      code: 'invalid_json_schema',
      httpStatus: 400
    }
  };
  const db = createRecoveryDb(row);

  const result = await recoverUncertainProviderJobForAdmin({ jobId: 1, adminId: 7 }, db);

  assert.equal(result.job.max_attempts, 6);
  assert.equal(result.auditKey, 'provider_recovery:2026-07:seo_brief:attempt-5');
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 6, 5]);
});

test('Providerwiederherstellung rollt bei einem Schreibfehler vollständig zurück', async () => {
  const db = createRecoveryDb(fixture(), { failRunUpdate: true });

  await assert.rejects(
    recoverUncertainProviderJobForAdmin({ jobId: 1, adminId: 7 }, db),
    /Run-Update fehlgeschlagen/
  );

  assert.equal(db.jobUpdates, 0);
  assert.equal(db.events.filter(({ sql }) => sql === 'ROLLBACK').length, 1);
  assert.equal(db.events.at(-1).type, 'release');
});

test('Providerwiederherstellung lehnt ungültige IDs vor Transaktionsbeginn ab', async () => {
  const db = createRecoveryDb(fixture());

  await assert.rejects(
    recoverUncertainProviderJobForAdmin({ jobId: '1', adminId: 7 }, db),
    /positive sichere Ganzzahlen/
  );
  assert.equal(db.events.length, 0);
});
