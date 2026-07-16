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
    articleReviewerPrompt: '2026-07-11.1'
  };
  return {
    job_id: 1,
    job_type: 'generate_weekly_draft',
    job_status: 'needs_manual_attention',
    attempts: 9,
    max_attempts: 9,
    last_error: 'quality_gate_failed',
    run_id: 11,
    run_status: 'needs_manual_attention',
    current_stage: 'review',
    post_id: null,
    error_report_json: { code: 'quality_gate_failed', message: 'Der Reviewscore liegt unter 80.' },
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
      'repair:3': { value: { title: 'Validierte dritte Reparatur' } },
      'budget:2026-07:repair:3': { status: 'settled' },
      'validation:3': { passed: true, issues: [] },
      'review:3': {
        value: {
          passed: false,
          score: 68,
          requiresManualReview: true,
          issues: [
            { code: 'cta_count_exceeds_briefing', blocking: true },
            { code: 'faq_structural_check', blocking: true }
          ]
        }
      },
      'budget:2026-07:review:3': { status: 'settled' },
      'quality_gate_recovery:structure_contract:attempt-7': {
        status: 'authorized_after_quality_gate',
        stageId: 'repair:3',
        baseMaxRevisions: 2,
        additionalRevisionCount: 1,
        adminId: 7
      },
      'rule_manifest_recovery:quality_gate:attempt-8': {
        status: 'authorized_after_manifest_mismatch',
        stageId: 'repair:3',
        adminId: 7
      }
    }
  };
}

function policyRecheckFixture() {
  const previousManifest = { ...CONTENT_AGENT_RULE_MANIFEST };
  delete previousManifest.editorialReviewPolicy;
  const sources = [
    { title: 'Google Quelle A', url: 'https://developers.google.com/search/docs/quelle-a' },
    { title: 'Google Quelle B', url: 'https://support.google.com/business/answer/123' }
  ];
  return {
    job_id: 1,
    job_type: 'generate_weekly_draft',
    job_status: 'needs_manual_attention',
    attempts: 6,
    max_attempts: 6,
    last_error: 'quality_gate_failed',
    run_id: 11,
    run_status: 'needs_manual_attention',
    current_stage: 'review',
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
      article_generation: { value: { title: 'Bezahlter Artikel' } },
      'budget:2026-07:article_generation': { status: 'settled' },
      source_research: { value: sources },
      'budget:2026-07:source_research': { status: 'settled' },
      'repair:3': {
        value: {
          title: 'Validierte dritte Reparatur',
          sourceReferences: sources,
          contentHtml: `<p><a href="${sources[0].url}">Offizielle Quelle</a></p>`
        }
      },
      'budget:2026-07:repair:3': { status: 'settled' },
      'validation:3': { passed: true, issues: [] },
      'review:3': {
        value: {
          passed: false,
          score: 89,
          requiresManualReview: true,
          issues: [{
            code: 'current-year-claim_requires_source_context',
            severity: 'info',
            message: 'Der Jahresbezug könnte noch enger an die Quellen angebunden werden.',
            repairInstruction: 'Binde den Jahresbezug enger an die freigegebenen Quellen.',
            blocking: false,
            sectionHeading: 'Aktuelle Einordnung',
            evidenceExcerpt: 'Google beschreibt die relevanten Signale.',
            verificationType: 'source',
            sourceRequired: true,
            autoPublishBlocking: false
          }],
          risks: {
            currentClaims: true,
            legalClaims: false,
            privacyClaims: false,
            softwareVersionClaims: false,
            staticPrices: false
          }
        }
      },
      'budget:2026-07:review:3': { status: 'settled' },
      'quality_gate_recovery:structure_contract:attempt-7': {
        status: 'authorized_after_quality_gate',
        stageId: 'repair:3',
        baseMaxRevisions: 2,
        additionalRevisionCount: 1,
        recoveryKind: 'editorial_sources',
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
        if (failRunUpdate) throw new Error('Review-Snapshot-Update fehlgeschlagen');
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

test('redaktionelle Wiederaufnahme aktualisiert den Regelstand und reiht ausschließlich review:4 ein', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverEditorialReviewForAdmin, 'function');
  const row = fixture();
  const previousHash = row.runtime_snapshot_json.ruleManifestHash;
  const db = createDb(row);

  const result = await module.recoverEditorialReviewForAdmin({ jobId: 1, adminId: 9 }, db);

  assert.equal(result.job.max_attempts, 10);
  assert.equal(result.recoveredStage, 'review:4');
  assert.equal(result.auditKey, 'editorial_review_recovery:review_scope:attempt-9');
  assert.equal(db.runUpdates, 1);
  assert.equal(db.jobUpdates, 1);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.match(runUpdate.sql, /status\s*=\s*'running'/i);
  assert.match(runUpdate.sql, /runtime_snapshot_json\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /cost_estimate\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /stage_results_json\s*-/i);
  assert.deepEqual(runUpdate.params, [
    11,
    'editorial_review_recovery:review_scope:attempt-9',
    CONTENT_AGENT_RULE_MANIFEST,
    CONTENT_AGENT_RULE_MANIFEST_HASH,
    previousHash,
    9
  ]);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 10, 9]);
});

test('redaktionelle Wiederaufnahme bewertet einen widersprüchlichen gespeicherten Review ohne neuen Provideraufruf neu', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  const row = policyRecheckFixture();
  const previousHash = row.runtime_snapshot_json.ruleManifestHash;
  const db = createDb(row);

  const result = await module.recoverEditorialReviewForAdmin({ jobId: 1, adminId: 9 }, db);

  assert.equal(result.job.max_attempts, 7);
  assert.equal(result.recoveredStage, 'review:3');
  assert.equal(result.recoveryKind, 'policy_recheck');
  assert.equal(
    result.auditKey,
    'editorial_review_policy_recovery:nonblocking_current_claims:attempt-7'
  );
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.match(runUpdate.sql, /authorized_after_editorial_policy_change/i);
  assert.match(runUpdate.sql, /kein neuer Provideraufruf/i);
  assert.deepEqual(runUpdate.params, [
    11,
    'editorial_review_policy_recovery:nonblocking_current_claims:attempt-7',
    CONTENT_AGENT_RULE_MANIFEST,
    CONTENT_AGENT_RULE_MANIFEST_HASH,
    previousHash,
    9
  ]);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 7, 6]);
});

for (const [label, mutate] of [
  ['fehlgeschlagener technischer Validierung', (row) => { row.stage_results_json['validation:3'].passed = false; }],
  ['offener Providerreservierung', (row) => { row.stage_results_json['budget:2026-07:review:4'] = { status: 'reserved' }; }],
  ['bereits vorhandenem review:4', (row) => { row.stage_results_json['review:4'] = { value: { score: 90 } }; }],
  ['nichttechnischem Reviewblocker', (row) => {
    row.stage_results_json['review:3'].value.issues = [{ code: 'unsupported_claim', blocking: true }];
  }],
  ['ausgeschöpftem Sonderversuch', (row) => { row.attempts = 10; row.max_attempts = 10; }]
]) {
  test(`redaktionelle Wiederaufnahme bleibt bei ${label} gesperrt`, async () => {
    const module = await import('../repositories/contentJobRepository.js');
    const row = fixture();
    mutate(row);
    const db = createDb(row);
    const result = typeof module.recoverEditorialReviewForAdmin === 'function'
      ? await module.recoverEditorialReviewForAdmin({ jobId: 1, adminId: 9 }, db)
      : null;
    assert.equal(result, null);
    assert.equal(db.runUpdates, 0);
    assert.equal(db.jobUpdates, 0);
  });
}

test('redaktionelle Wiederaufnahme rollt bei einem Schreibfehler vollständig zurück', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverEditorialReviewForAdmin, 'function');
  const db = createDb(fixture(), { failRunUpdate: true });
  await assert.rejects(
    module.recoverEditorialReviewForAdmin({ jobId: 1, adminId: 9 }, db),
    /Review-Snapshot-Update fehlgeschlagen/
  );
  assert.equal(db.jobUpdates, 0);
  assert.equal(db.events.filter(({ sql }) => sql === 'ROLLBACK').length, 1);
});
