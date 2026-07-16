import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_AGENT_RULE_MANIFEST,
  CONTENT_AGENT_RULE_MANIFEST_HASH,
  canonicalSha256
} from '../services/contentAgent/contentRuleManifest.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function fixture() {
  const previousManifest = {
    ...CONTENT_AGENT_RULE_MANIFEST,
    articleRepairPrompt: '2026-07-10.1',
    articleWriterPrompt: '2026-07-10.1'
  };
  return {
    job_id: 1,
    job_type: 'generate_weekly_draft',
    job_status: 'needs_manual_attention',
    attempts: 7,
    max_attempts: 7,
    last_error: 'quality_gate_failed',
    run_id: 11,
    run_status: 'needs_manual_attention',
    current_stage: 'validation',
    post_id: null,
    error_report_json: {
      code: 'quality_gate_failed',
      message: 'Der Artikel hat die Qualitätsprüfung nicht bestanden.'
    },
    runtime_snapshot_json: {
      timezone: 'Europe/Berlin',
      allowedInternalLinks: ['/kontakt'],
      allowedInternalLinksHash: canonicalSha256(['/kontakt']),
      ruleManifest: previousManifest,
      ruleManifestHash: canonicalSha256(previousManifest)
    },
    stage_results_json: {
      'budget:2026-07:article_generation': { status: 'settled' },
      article_generation: { value: { title: 'Bezahlter Artikel' } },
      'budget:2026-07:repair:1': { status: 'settled' },
      'repair:1': { value: { title: 'Reparatur eins' } },
      'budget:2026-07:repair:2': { status: 'settled' },
      'repair:2': { value: { title: 'Reparatur zwei' } },
      'validation:2': {
        passed: false,
        issues: [{ code: 'cta_count_invalid' }, { code: 'faq_count_invalid' }]
      }
    }
  };
}

function editorialFixture() {
  const row = fixture();
  row.attempts = 5;
  row.max_attempts = 5;
  row.current_stage = 'review';
  row.stage_results_json['validation:2'] = { passed: true, issues: [] };
  row.stage_results_json['budget:2026-07:review:2'] = { status: 'settled' };
  row.stage_results_json['review:2'] = {
    value: {
      passed: false,
      score: 74,
      requiresManualReview: true,
      risks: {
        currentClaims: true,
        legalClaims: false,
        privacyClaims: false,
        softwareVersionClaims: false,
        staticPrices: false
      },
      issues: [{
        code: 'UNBELEGTE_2026_ENTWICKLUNG',
        severity: 'error',
        message: 'Die aktuelle Entwicklung ist nicht eindeutig belegt.',
        repairInstruction: 'Binde eine freigegebene Quelle ein oder formuliere neutral.',
        blocking: true,
        sectionHeading: 'Local SEO 2026',
        evidenceExcerpt: 'Local SEO lässt sich 2026 nicht auf ein Profil reduzieren.',
        verificationType: 'date',
        sourceRequired: true,
        autoPublishBlocking: true
      }]
    }
  };
  return row;
}

function createDb(row, { failRunUpdate = false } = {}) {
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
        if (failRunUpdate) throw new Error('Run-Update fehlgeschlagen');
        return { rows: [{ id: row.run_id }] };
      }
      if (/UPDATE content_jobs/i.test(normalized)) {
        jobUpdates += 1;
        return { rows: [{
          id: row.job_id,
          status: 'queued',
          attempts: row.attempts,
          max_attempts: Math.min(params[1], Math.max(row.max_attempts, row.attempts + 1))
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

test('Qualitätsfehler übernimmt protokolliert den aktuellen Regelstand und erhält genau eine dritte Strukturreparatur', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverQualityGateJobForAdmin, 'function');
  const db = createDb(fixture());

  const result = await module.recoverQualityGateJobForAdmin({
    jobId: 1,
    adminId: 7,
    baseMaxRevisions: 2
  }, db);

  assert.equal(result.job.max_attempts, 8);
  assert.equal(result.recoveredStage, 'repair:3');
  assert.equal(result.auditKey, 'quality_gate_recovery:structure_contract:attempt-7');
  assert.equal(db.runUpdates, 1);
  assert.equal(db.jobUpdates, 1);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.match(runUpdate.sql, /status\s*=\s*'running'/i);
  assert.doesNotMatch(runUpdate.sql, /cost_estimate\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /stage_results_json\s*-/i);
  assert.match(runUpdate.sql, /runtime_snapshot_json\s*=/i);
  const previousHash = fixture().runtime_snapshot_json.ruleManifestHash;
  assert.deepEqual(runUpdate.params, [
    11,
    'quality_gate_recovery:structure_contract:attempt-7',
    'repair:3',
    2,
    7,
    CONTENT_AGENT_RULE_MANIFEST,
    CONTENT_AGENT_RULE_MANIFEST_HASH,
    previousHash,
    'structure_contract'
  ]);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 8, 7]);
});

test('quellenbezogene redaktionelle Blocker erhalten nach Versuch fünf genau eine zusätzliche Reparatur', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  const db = createDb(editorialFixture());

  const result = await module.recoverQualityGateJobForAdmin({
    jobId: 1,
    adminId: 7,
    baseMaxRevisions: 2
  }, db);

  assert.equal(result.job.max_attempts, 6);
  assert.equal(result.recoveredStage, 'repair:3');
  assert.equal(result.auditKey, 'quality_gate_recovery:structure_contract:attempt-7');
  assert.equal(db.runUpdates, 1);
  assert.equal(db.jobUpdates, 1);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 8, 5]);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.equal(runUpdate.params.at(-1), 'editorial_sources');
});

for (const [label, mutate] of [
  ['rechtlichem Risiko', (row) => {
    row.stage_results_json['review:2'].value.risks.legalClaims = true;
  }],
  ['Datenschutzrisiko', (row) => {
    row.stage_results_json['review:2'].value.risks.privacyClaims = true;
  }],
  ['Preisrisiko', (row) => {
    row.stage_results_json['review:2'].value.risks.staticPrices = true;
  }],
  ['fehlender Fundstelle', (row) => {
    row.stage_results_json['review:2'].value.issues[0].evidenceExcerpt = null;
  }],
  ['nicht quellenbezogenem Blocker', (row) => {
    row.stage_results_json['review:2'].value.issues[0].verificationType = 'legal';
  }]
]) {
  test(`redaktionelle Qualitätswiederaufnahme bleibt bei ${label} gesperrt`, async () => {
    const module = await import('../repositories/contentJobRepository.js');
    const row = editorialFixture();
    mutate(row);
    const result = await module.recoverQualityGateJobForAdmin({
      jobId: 1,
      adminId: 7,
      baseMaxRevisions: 2
    }, createDb(row));
    assert.equal(result, null);
  });
}

for (const [label, mutate] of [
  ['offener Reservierung', (row) => {
    row.stage_results_json['budget:2026-07:review:3'] = { status: 'reserved' };
  }],
  ['bereits bestandener Validierung', (row) => {
    row.stage_results_json['validation:2'].passed = true;
  }],
  ['fehlender zweiter Reparatur', (row) => {
    delete row.stage_results_json['repair:2'];
  }],
  ['fehlender Abrechnung der zweiten Reparatur', (row) => {
    delete row.stage_results_json['budget:2026-07:repair:2'];
  }],
  ['ausgeschöpftem Sonderversuch', (row) => {
    row.attempts = 8;
    row.max_attempts = 8;
  }]
]) {
  test(`Qualitätswiederaufnahme bleibt bei ${label} gesperrt`, async () => {
    const module = await import('../repositories/contentJobRepository.js');
    const row = fixture();
    mutate(row);
    const db = createDb(row);

    const result = typeof module.recoverQualityGateJobForAdmin === 'function'
      ? await module.recoverQualityGateJobForAdmin({
        jobId: 1,
        adminId: 7,
        baseMaxRevisions: 2
      }, db)
      : null;

    assert.equal(result, null);
    assert.equal(db.runUpdates, 0);
    assert.equal(db.jobUpdates, 0);
  });
}

test('Qualitätswiederaufnahme rollt Schreibfehler vollständig zurück', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverQualityGateJobForAdmin, 'function');
  const db = createDb(fixture(), { failRunUpdate: true });

  await assert.rejects(
    module.recoverQualityGateJobForAdmin({
      jobId: 1,
      adminId: 7,
      baseMaxRevisions: 2
    }, db),
    /Run-Update fehlgeschlagen/
  );

  assert.equal(db.jobUpdates, 0);
  assert.equal(db.events.filter(({ sql }) => sql === 'ROLLBACK').length, 1);
});

test('Qualitätswiederaufnahme lehnt ungültige IDs und Revisionswerte vor Transaktionsbeginn ab', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverQualityGateJobForAdmin, 'function');
  const db = createDb(fixture());

  await assert.rejects(
    module.recoverQualityGateJobForAdmin({ jobId: '1', adminId: 7, baseMaxRevisions: 2 }, db),
    /positive sichere Ganzzahlen/
  );
  await assert.rejects(
    module.recoverQualityGateJobForAdmin({ jobId: 1, adminId: 7, baseMaxRevisions: 0 }, db),
    /positive sichere Ganzzahlen/
  );
  assert.equal(db.events.length, 0);
});
