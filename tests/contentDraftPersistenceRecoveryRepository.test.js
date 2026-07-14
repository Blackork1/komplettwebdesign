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
    articleSchema: 'article-schema-v1'
  };
  return {
    job_id: 1,
    job_type: 'generate_weekly_draft',
    job_status: 'failed',
    attempts: 10,
    max_attempts: 10,
    last_error: 'value too long for type character varying(80)',
    run_id: 11,
    run_status: 'failed',
    current_stage: 'image_cleanup',
    post_id: null,
    cost_estimate: '0.660000',
    error_report_json: {
      code: 'pipeline_failed',
      message: 'value too long for type character varying(80)'
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
      'repair:3': { value: { title: 'Validierte dritte Reparatur' } },
      'budget:2026-07:repair:3': { status: 'settled' },
      'validation:3': { passed: true, issues: [] },
      'review:4': {
        value: {
          passed: true,
          score: 90,
          requiresManualReview: false,
          issues: [{ code: 'wording_repetition', blocking: false }],
          risks: {
            currentClaims: false,
            legalClaims: false,
            privacyClaims: false,
            softwareVersionClaims: false,
            staticPrices: false
          }
        }
      },
      'budget:2026-07:review:4': { status: 'settled' },
      image_generation: { status: 'completed', costIncurred: true },
      'budget:2026-07:image_generation': { status: 'settled' },
      cloudinary_upload: {
        status: 'completed',
        imageUrl: 'https://cdn.example.test/deleted.webp',
        publicId: 'blog_images/deleted-after-rollback',
        bytes: 321
      },
      image_cleanup: {
        status: 'completed',
        publicId: 'blog_images/deleted-after-rollback'
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
        if (failRunUpdate) throw new Error('Metadaten-Wiederaufnahme konnte nicht protokolliert werden');
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

test('Metadaten-Wiederaufnahme bewahrt Kosten und Inhalte und reiht nur das Ersatzbild ein', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverDraftPersistenceForAdmin, 'function');
  const db = createDb(fixture());

  const result = await module.recoverDraftPersistenceForAdmin({ jobId: 1, adminId: 9 }, db);

  assert.equal(result.job.max_attempts, 11);
  assert.equal(result.recoveredStage, 'image_generation:2');
  assert.equal(result.auditKey, 'draft_persistence_recovery:metadata_contract:attempt-10');
  assert.equal(db.runUpdates, 1);
  assert.equal(db.jobUpdates, 1);
  const runUpdate = db.events.find(({ sql }) => /UPDATE content_runs/i.test(sql));
  assert.match(runUpdate.sql, /runtime_snapshot_json\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /cost_estimate\s*=/i);
  assert.doesNotMatch(runUpdate.sql, /stage_results_json\s*-/i);
  const previousManifestHash = fixture().runtime_snapshot_json.ruleManifestHash;
  assert.deepEqual(runUpdate.params, [
    11,
    'draft_persistence_recovery:metadata_contract:attempt-10',
    CONTENT_AGENT_RULE_MANIFEST,
    CONTENT_AGENT_RULE_MANIFEST_HASH,
    previousManifestHash,
    9
  ]);
  const jobUpdate = db.events.find(({ sql }) => /UPDATE content_jobs/i.test(sql));
  assert.deepEqual(jobUpdate.params, [1, 11, 10]);
});

for (const [label, mutate] of [
  ['fehlgeschlagener Validierung', (row) => { row.stage_results_json['validation:3'].passed = false; }],
  ['fehlgeschlagenem Review 4', (row) => { row.stage_results_json['review:4'].value.passed = false; }],
  ['noch erforderlicher manueller Prüfung', (row) => { row.stage_results_json['review:4'].value.requiresManualReview = true; }],
  ['offener Providerreservierung', (row) => { row.stage_results_json['budget:2026-07:image_generation:2'] = { status: 'reserved' }; }],
  ['nicht passender Bildbereinigung', (row) => { row.stage_results_json.image_cleanup.publicId = 'blog_images/anderes-bild'; }],
  ['bereits vorhandenem Ersatzbild', (row) => { row.stage_results_json['image_generation:2'] = { status: 'completed' }; }],
  ['bereits angelegtem Entwurf', (row) => { row.post_id = 41; }],
  ['ausgeschöpftem Sonderversuch', (row) => { row.attempts = 11; row.max_attempts = 11; }]
]) {
  test(`Metadaten-Wiederaufnahme bleibt bei ${label} gesperrt`, async () => {
    const module = await import('../repositories/contentJobRepository.js');
    const row = fixture();
    mutate(row);
    const db = createDb(row);
    const result = typeof module.recoverDraftPersistenceForAdmin === 'function'
      ? await module.recoverDraftPersistenceForAdmin({ jobId: 1, adminId: 9 }, db)
      : null;
    assert.equal(result, null);
    assert.equal(db.runUpdates, 0);
    assert.equal(db.jobUpdates, 0);
  });
}

test('Metadaten-Wiederaufnahme rollt bei einem Schreibfehler vollständig zurück', async () => {
  const module = await import('../repositories/contentJobRepository.js');
  assert.equal(typeof module.recoverDraftPersistenceForAdmin, 'function');
  const db = createDb(fixture(), { failRunUpdate: true });
  await assert.rejects(
    module.recoverDraftPersistenceForAdmin({ jobId: 1, adminId: 9 }, db),
    /Metadaten-Wiederaufnahme konnte nicht protokolliert werden/
  );
  assert.equal(db.jobUpdates, 0);
  assert.equal(db.events.filter(({ sql }) => sql === 'ROLLBACK').length, 1);
});
