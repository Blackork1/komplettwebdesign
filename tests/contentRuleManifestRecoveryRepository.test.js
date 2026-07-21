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
    attempts: 8,
    max_attempts: 8,
    last_error: 'CONTENT_RULE_MANIFEST_MISMATCH',
    run_id: 11,
    run_status: 'needs_manual_attention',
    current_stage: 'validation',
    post_id: null,
    cost_estimate: '0.483309',
    error_report_json: { code: 'CONTENT_RULE_MANIFEST_MISMATCH' },
    runtime_snapshot_json: {
      timezone: 'Europe/Berlin',
      allowedInternalLinks: ['/kontakt'],
      allowedInternalLinksHash: canonicalSha256(['/kontakt']),
      ruleManifest: previousManifest,
      ruleManifestHash: canonicalSha256(previousManifest)
    },
    stage_results_json: {
      article_generation: { value: { title: 'Bezahlter Artikel' } },
      'budget:2026-07:article_generation': { status: 'settled' },
      'repair:2': { value: { title: 'Zweite Reparatur' } },
      'budget:2026-07:repair:2': { status: 'settled' },
      'validation:2': {
        passed: false,
        issues: [{ code: 'cta_count_invalid' }]
      },
      'quality_gate_recovery:structure_contract:attempt-7': {
        status: 'authorized_after_quality_gate',
        stageId: 'repair:3',
        baseMaxRevisions: 2,
        additionalRevisionCount: 1,
        adminId: 7
      }
    }
  };
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
        if (failRunUpdate) throw new Error('Snapshot-Update fehlgeschlagen');
        return { rows: [{ id: row.run_id }] };
      }
      if (/UPDATE content_jobs/i.test(normalized)) {
        jobUpdates += 1;
        return { rows: [{
          id: row.job_id,
          status: 'queued',
          attempts: row.attempts,
          max_attempts: Math.max(row.max_attempts, row.attempts + 1)
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

test('früher Manifestfehler übernimmt den aktuellen Regelstand ohne künstliche Versuch-8-Voraussetzung', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  const row = fixture();
  row.attempts = 3;
  row.max_attempts = 3;
  delete row.stage_results_json['quality_gate_recovery:structure_contract:attempt-7'];
  const previousHash = row.runtime_snapshot_json.ruleManifestHash;
  const expectedAuditKey = `rule_manifest_recovery:${previousHash.slice(0, 12)}:${CONTENT_AGENT_RULE_MANIFEST_HASH.slice(0, 12)}`;
  const db = createDb(row);

  const result = await module.recoverQualityGateRuleManifestForAdmin({ jobId: 15940, adminId: 9 }, db);

  assert.equal(result.job.max_attempts, 4);
  assert.equal(result.recoveredStage, 'validation');
  assert.equal(result.auditKey, expectedAuditKey);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.equal(runUpdate.params[1], expectedAuditKey);
  assert.deepEqual(runUpdate.params.slice(2), [
    CONTENT_AGENT_RULE_MANIFEST,
    CONTENT_AGENT_RULE_MANIFEST_HASH,
    previousHash,
    9,
    'validation'
  ]);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [15940, 3]);
});

test('Manifestfehler nach redaktioneller Prüfung übernimmt den aktuellen Regelstand', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  const row = fixture();
  row.attempts = 5;
  row.max_attempts = 5;
  row.current_stage = 'review';
  const db = createDb(row);

  const result = await module.recoverQualityGateRuleManifestForAdmin({ jobId: 15940, adminId: 9 }, db);

  assert.equal(result.recoveredStage, 'review');
  assert.equal(result.job.max_attempts, 6);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.equal(runUpdate.params[6], 'review');
});

test('Manifestfehler übernimmt genau einmal den aktuellen Regelstand ohne Kosten- oder Inhaltsmutation', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverQualityGateRuleManifestForAdmin, 'function');
  const row = fixture();
  const previousHash = row.runtime_snapshot_json.ruleManifestHash;
  const db = createDb(row);

  const result = await module.recoverQualityGateRuleManifestForAdmin({ jobId: 1, adminId: 9 }, db);
  const expectedAuditKey = `rule_manifest_recovery:${previousHash.slice(0, 12)}:${CONTENT_AGENT_RULE_MANIFEST_HASH.slice(0, 12)}`;

  assert.equal(result.job.max_attempts, 9);
  assert.equal(result.recoveredStage, 'validation');
  assert.equal(result.auditKey, expectedAuditKey);
  assert.equal(db.runUpdates, 1);
  assert.equal(db.jobUpdates, 1);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.match(runUpdate.sql, /status\s*=\s*'running'/i);
  assert.match(runUpdate.sql, /runtime_snapshot_json\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /cost_estimate\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /stage_results_json\s*-/i);
  assert.deepEqual(runUpdate.params, [
    11,
    expectedAuditKey,
    CONTENT_AGENT_RULE_MANIFEST,
    CONTENT_AGENT_RULE_MANIFEST_HASH,
    previousHash,
    9,
    'validation'
  ]);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 8]);
});

for (const [label, mutate] of [
  ['manipuliertem alten Manifesthash', (row) => {
    row.runtime_snapshot_json.ruleManifestHash = '0'.repeat(64);
  }],
  ['fehlender bezahlter Artikelerstellung', (row) => {
    delete row.stage_results_json['budget:2026-07:article_generation'];
  }],
  ['offener Providerreservierung', (row) => {
    row.stage_results_json['budget:2026-07:review'] = { status: 'reserved' };
  }],
  ['bereits protokollierter gleicher Manifestübernahme', (row) => {
    const previousHash = row.runtime_snapshot_json.ruleManifestHash;
    row.stage_results_json[
      `rule_manifest_recovery:${previousHash.slice(0, 12)}:${CONTENT_AGENT_RULE_MANIFEST_HASH.slice(0, 12)}`
    ] = { status: 'authorized_after_manifest_mismatch' };
  }],
  ['ausgeschöpftem PostgreSQL-Versuchsbereich', (row) => {
    row.attempts = 2147483647;
    row.max_attempts = 2147483647;
  }]
]) {
  test(`Manifestwiederaufnahme bleibt bei ${label} gesperrt`, async () => {
    const module = await import('../repositories/contentJobRepository.js');
    const row = fixture();
    mutate(row);
    const db = createDb(row);
    const result = typeof module.recoverQualityGateRuleManifestForAdmin === 'function'
      ? await module.recoverQualityGateRuleManifestForAdmin({ jobId: 1, adminId: 9 }, db)
      : null;
    assert.equal(result, null);
    assert.equal(db.runUpdates, 0);
    assert.equal(db.jobUpdates, 0);
  });
}

test('Manifestwiederaufnahme rollt den gesamten Schreibvorgang bei Fehlern zurück', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverQualityGateRuleManifestForAdmin, 'function');
  const db = createDb(fixture(), { failRunUpdate: true });
  await assert.rejects(
    module.recoverQualityGateRuleManifestForAdmin({ jobId: 1, adminId: 9 }, db),
    /Snapshot-Update fehlgeschlagen/
  );
  assert.equal(db.jobUpdates, 0);
  assert.equal(db.events.filter(({ sql }) => sql === 'ROLLBACK').length, 1);
});
