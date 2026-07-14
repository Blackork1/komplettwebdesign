import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createContentExistingPostOptimizationRepository,
  matchingActiveOptimizationChange,
  revalidationAuditFindingCodes
} from '../repositories/contentExistingPostOptimizationRepository.js';
import { createRevisionSnapshot, liveHashForPost } from '../services/contentAgent/contentRevisionService.js';
import { buildExistingPostDiff } from '../services/contentAgent/existingPostDiffService.js';
import { normalizeExistingPostRevisionSources } from '../services/contentAgent/existingPostRevisionSourcePolicy.js';
import { createContentAgentJobSnapshot } from '../services/contentAgent/runtimeConfigService.js';
import { snapshotFingerprint } from '../services/contentAgent/revisionSnapshotFingerprint.js';

function normalizedSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function publishedPost(overrides = {}) {
  return {
    id: 19,
    title: 'Website-Relaunch planen',
    slug: 'website-relaunch',
    excerpt: 'Ein sicherer Relaunch.',
    content: '<section><h2>Planung</h2><p>Bestehender Inhalt.</p></section>',
    content_format: 'static_html',
    meta_title: 'Website-Relaunch planen',
    meta_description: 'Relaunch ohne SEO-Verluste planen.',
    og_title: 'Website-Relaunch planen',
    og_description: 'Planung für einen sicheren Relaunch.',
    faq_json: Array.from({ length: 5 }, (_, index) => ({
      question: `Frage ${index + 1}?`,
      answer: `Antwort ${index + 1}.`
    })),
    image_url: '/uploads/relaunch.webp',
    image_alt: 'Plan für einen Website-Relaunch',
    published: true,
    workflow_status: 'published',
    scheduled_at: null,
    published_at: new Date('2025-01-10T09:00:00.000Z'),
    created_at: new Date('2025-01-02T09:00:00.000Z'),
    updated_at: new Date('2026-07-14T10:00:00.000Z'),
    ...overrides
  };
}

function optimizedRevisionInput(post = publishedPost(), overrides = {}) {
  const baseLiveHash = liveHashForPost(post);
  const snapshot = createRevisionSnapshot(post);
  snapshot.fields.title = 'Website-Relaunch sicher planen';
  return {
    postId: post.id,
    auditId: 31,
    jobId: 44,
    baseLiveHash,
    snapshot,
    report: {
      baseLiveHash,
      beforeScore: 72,
      afterScore: 88,
      changes: []
    },
    admin: { id: 7, username: 'Admin' },
    ...overrides
  };
}

function transactionClient(handler) {
  const calls = [];
  return {
    calls,
    released: false,
    async query(sql, params = []) {
      const call = { sql: normalizedSql(sql), params };
      calls.push(call);
      return handler(call, calls);
    },
    release() {
      this.released = true;
    }
  };
}

function revalidationJobRow(params) {
  return {
    id: 81,
    job_type: params[0],
    status: 'queued',
    idempotency_key: params[1],
    payload_json: JSON.parse(params[2])
  };
}

function originRuntimeSnapshot() {
  return createContentAgentJobSnapshot({
    runtimeConfig: {
      operatingMode: 'review',
      timezone: 'Europe/Berlin',
      monthlyCostLimitEur: 25,
      maxAttempts: 3,
      contentStageReservationEur: 0.5,
      reviewStageReservationEur: 0.25,
      contentInputCostPerMtok: 2.5,
      contentOutputCostPerMtok: 15,
      reviewInputCostPerMtok: 0.75,
      reviewOutputCostPerMtok: 4.5,
      webSearchCostPerCallEur: 0.01,
      settingsVersion: 4
    },
    claim: {
      job_type: 'optimize_existing_post',
      payload_json: { source: 'admin_existing_content' }
    },
    now: new Date('2026-07-14T10:30:00.000Z'),
    allowedInternalLinks: ['/kontakt'],
    existingPostTrustedContext: { existingSlugs: [], metadata: null },
    activeLearningRules: []
  });
}

test('Revalidierungsbindung behält auch unbekannte gesperrte Auditcodes bei', () => {
  assert.deepEqual(revalidationAuditFindingCodes([
    { code: 'missing_meta_title' },
    { code: 'zukünftiger_sicherheitsbefund' },
    { code: 'zukünftiger_sicherheitsbefund' },
    { code: 42 },
    null
  ]), ['missing_meta_title', 'zukünftiger_sicherheitsbefund']);
});

test('Revisionsquellen werden begrenzt, HTTPS-normalisiert und ohne Browserwerte gebunden', () => {
  assert.deepEqual(normalizeExistingPostRevisionSources({
    sources: [{ title: ' Fachquelle ', url: 'https://example.com/fachquelle' }]
  }), [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }]);
  assert.equal(normalizeExistingPostRevisionSources({
    sources: [{ title: 'Unsicher', url: 'https://nutzer:passwort@example.com/geheim' }]
  }), null);
  assert.equal(normalizeExistingPostRevisionSources({
    sources: Array.from({ length: 7 }, (_, index) => ({
      title: `Quelle ${index}`,
      url: `https://example.com/${index}`
    }))
  }), null);
});

test('fenced Fehlerpersistenz benötigt keinen bereits defekten Audit- oder Ursprungskontext', async () => {
  const post = publishedPost();
  const snapshot = createRevisionSnapshot(post);
  const fingerprint = snapshotFingerprint(snapshot);
  const revision = {
    id: 71,
    post_id: 19,
    audit_id: 31,
    optimization_job_id: 44,
    status: 'draft',
    revision_version: 4,
    snapshot_json: snapshot,
    optimization_report_json: {
      beforeScore: 72,
      revalidation: {
        status: 'pending',
        revisionVersion: 4,
        snapshotFingerprint: fingerprint,
        minimumScore: 80
      }
    }
  };
  const client = transactionClient(({ sql, params }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) {
      return { rows: [{ post_id: 19 }] };
    }
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql) && /FOR UPDATE/i.test(sql)) {
      return { rows: [revision] };
    }
    if (/UPDATE content_post_revisions/i.test(sql)) {
      return { rows: [{
        ...revision,
        optimization_report_json: JSON.parse(params[1])
      }] };
    }
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  const failed = await repository.failRevisionRevalidation({
    revisionId: 71,
    revisionVersion: 4,
    snapshotFingerprint: fingerprint,
    failureCode: 'CONTENT_REVISION_REVALIDATION_CONTEXT_INVALID'
  });

  assert.equal(failed.optimization_report_json.revalidation.status, 'failed');
  assert.equal(
    client.calls.some(({ sql }) => /content_post_audits|FROM content_runs/i.test(sql)),
    false
  );
});

test('Live-Snapshot lädt ausschließlich veröffentlichte Artikel und alle gesperrten Identitätsfelder', async () => {
  const row = publishedPost();
  const db = {
    async query(sql, params) {
      const query = normalizedSql(sql);
      assert.match(query, /WHERE p\.id = \$1::integer AND p\.published = TRUE/i);
      assert.match(query, /p\.slug/i);
      assert.match(query, /p\.content_format/i);
      assert.match(query, /p\.workflow_status/i);
      assert.match(query, /p\.published_at/i);
      assert.match(query, /p\.updated_at/i);
      assert.deepEqual(params, [19]);
      return { rows: [row] };
    }
  };

  const repository = createContentExistingPostOptimizationRepository(db);
  const post = await repository.getPublishedPostSnapshot(19);

  assert.equal(post.published, true);
  assert.equal(post.slug, 'website-relaunch');
  assert.equal(post.content_format, 'static_html');
  assert.equal(post.updated_at, '2026-07-14T10:00:00.000Z');
  assert.equal(post.published_at, '2025-01-10T09:00:00.000Z');
  assert.equal(post.scheduled_at, null);
});

test('Live-Snapshot liefert für unveröffentlichte oder fehlende Artikel null', async () => {
  const repository = createContentExistingPostOptimizationRepository({
    async query() { return { rows: [] }; }
  });

  assert.equal(await repository.getPublishedPostSnapshot(19), null);
});

test('Vertrauenskontext lädt Slugs, Links, Metadaten und aktive Lernregeln mit festen Grenzen', async () => {
  const calls = [];
  const db = {
    async query(sql, params = []) {
      const query = normalizedSql(sql);
      calls.push({ sql: query, params });
      if (/SELECT p\.slug FROM posts p/i.test(query)) {
        return { rows: [{ slug: 'anderer-artikel' }, { slug: null }] };
      }
      if (/trusted_urls/i.test(query)) {
        return { rows: [{ url: '/kontakt' }, { url: '/blog/anderer-artikel' }, { url: null }] };
      }
      if (/FROM content_post_metadata/i.test(query)) {
        return { rows: [{ post_id: 19, primary_keyword: 'Website-Relaunch', internal_links_json: ['/kontakt'] }] };
      }
      if (/FROM content_learning_rules/i.test(query)) {
        return { rows: [{ id: 5, category_key: 'internal_links', version: 2, rule_text: 'Nutze passende interne Links.', target_stages: ['writer'], rule_hash: 'a'.repeat(64) }] };
      }
      throw new Error(`Unerwartete Abfrage: ${query}`);
    }
  };

  const repository = createContentExistingPostOptimizationRepository(db);
  const context = await repository.getTrustedContext(19);

  assert.deepEqual(context.existingSlugs, ['anderer-artikel']);
  assert.deepEqual(context.allowedInternalLinks, ['/kontakt', '/blog/anderer-artikel']);
  assert.equal(context.metadata.primary_keyword, 'Website-Relaunch');
  assert.equal(context.activeLearningRules[0].version, 2);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(({ sql }) => /\bLIMIT\s+(?:1|100|5000)\b/i.test(sql)));
  assert.deepEqual(calls.find(({ sql }) => /SELECT p\.slug FROM posts p/i.test(sql)).params, [19]);
});

test('Audit wird idempotent und mit expliziten PostgreSQL-Typen gespeichert', async () => {
  const audit = { id: 31, post_id: 19, job_id: 44, run_id: 55, status: 'open' };
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return { rows: [audit] };
    }
  };
  const repository = createContentExistingPostOptimizationRepository(db);

  const result = await repository.createAuditIdempotent({
    postId: 19,
    jobId: 44,
    runId: 55,
    auditType: 'existing_post_optimization',
    score: 72,
    findings: [{ code: 'missing_links' }],
    recommendedActions: [{ code: 'add_links' }]
  });

  assert.deepEqual(result, audit);
  assert.match(calls[0].sql, /\$1::integer/);
  assert.match(calls[0].sql, /\$2::bigint/);
  assert.match(calls[0].sql, /ON CONFLICT \(job_id, post_id, audit_type\)/i);
  assert.deepEqual(calls[0].params.slice(0, 5), [19, 44, 55, 'existing_post_optimization', 72]);
});

test('Audit-Payloads werden vor der Datenbankabfrage begrenzt', async () => {
  let queryCalls = 0;
  const repository = createContentExistingPostOptimizationRepository({
    async query() { queryCalls += 1; return { rows: [] }; }
  });

  await assert.rejects(repository.createAuditIdempotent({
    postId: 19,
    jobId: 44,
    runId: null,
    auditType: 'existing_post_optimization',
    score: 72,
    findings: [{ detail: 'x'.repeat(300_000) }],
    recommendedActions: []
  }), { code: 'CONTENT_AUDIT_VALIDATION_FAILED' });
  assert.equal(queryCalls, 0);
});

test('Verlierender Audit-Insert liest den konkurrierenden Gewinner in einem neuen Statement-Snapshot', async () => {
  const winner = {
    id: 31,
    post_id: 19,
    job_id: 44,
    run_id: 55,
    audit_type: 'existing_post_optimization',
    status: 'open'
  };
  const calls = [];
  const repository = createContentExistingPostOptimizationRepository({
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return calls.length === 1 ? { rows: [] } : { rows: [winner] };
    }
  });

  const result = await repository.createAuditIdempotent({
    postId: 19,
    jobId: 44,
    runId: 55,
    auditType: 'existing_post_optimization',
    score: 72,
    findings: [],
    recommendedActions: []
  });

  assert.deepEqual(result, winner);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /^INSERT INTO content_post_audits/i);
  assert.match(calls[0].sql, /ON CONFLICT[\s\S]*DO NOTHING[\s\S]*RETURNING \*/i);
  assert.doesNotMatch(calls[0].sql, /\bWITH\b|UNION ALL/i);
  assert.match(calls[1].sql, /^SELECT \* FROM content_post_audits/i);
  assert.deepEqual(calls[1].params, [44, 19, 'existing_post_optimization']);
});

test('Verschwindender Audit-Konflikt wird höchstens einmal erneut eingefügt und danach fail-closed beendet', async () => {
  const calls = [];
  const repository = createContentExistingPostOptimizationRepository({
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return { rows: [] };
    }
  });

  await assert.rejects(repository.createAuditIdempotent({
    postId: 19,
    jobId: 44,
    runId: 55,
    auditType: 'existing_post_optimization',
    score: 72,
    findings: [],
    recommendedActions: []
  }), { code: 'CONTENT_AUDIT_PERSISTENCE_CONFLICT' });

  assert.equal(calls.length, 4);
  assert.equal(calls.filter(({ sql }) => /^INSERT INTO/i.test(sql)).length, 2);
  assert.equal(calls.filter(({ sql }) => /^SELECT \*/i.test(sql)).length, 2);
});

test('Revisionsanlage bindet Job, Audit, Livehash und Optimierungsbericht atomar', async () => {
  const post = publishedPost();
  const input = optimizedRevisionInput(post);
  const persisted = {
    id: 71,
    post_id: 19,
    audit_id: 31,
    optimization_job_id: 44,
    status: 'draft',
    revision_version: 1,
    snapshot_json: input.snapshot,
    optimization_report_json: input.report
  };
  const client = transactionClient(({ sql }) => {
    if (/^SELECT p\./i.test(sql) && /FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r[\s\S]*status = 'draft'/i.test(sql)) return { rows: [] };
    if (/FROM content_post_audits a/i.test(sql)) return { rows: [{ id: 31, post_id: 19, job_id: 44, status: 'open' }] };
    if (/INSERT INTO content_post_revisions/i.test(sql)) return { rows: [persisted] };
    if (/UPDATE content_post_audits/i.test(sql)) return { rows: [{ id: 31, status: 'revision_created' }] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  const revision = await repository.createOptimizedRevision(input);

  assert.equal(revision.optimization_job_id, 44);
  assert.equal(revision.status, 'draft');
  assert.equal(revision.optimization_report_json.baseLiveHash, input.baseLiveHash);
  const sql = client.calls.map((call) => call.sql);
  const postLock = sql.findIndex((query) => /FROM posts p/i.test(query) && /FOR UPDATE/i.test(query));
  const draftLock = sql.findIndex((query) => /FROM content_post_revisions r/i.test(query) && /FOR UPDATE/i.test(query));
  const auditLock = sql.findIndex((query) => /FROM content_post_audits a/i.test(query) && /FOR UPDATE/i.test(query));
  assert.ok(postLock >= 0 && postLock < draftLock && draftLock < auditLock);
  assert.match(sql.find((query) => /INSERT INTO content_post_revisions/i.test(query)), /optimization_job_id/i);
  assert.match(sql.find((query) => /INSERT INTO content_post_revisions/i.test(query)), /optimization_report_json/i);
  assert.doesNotMatch(sql.join('\n'), /UPDATE posts/i);
  assert.equal(sql.at(-1), 'COMMIT');
  assert.equal(client.released, true);
});

test('Revisionsanlage rollt bei verändertem Livehash vollständig zurück', async () => {
  const post = publishedPost();
  const staleHash = 'b'.repeat(64);
  const input = optimizedRevisionInput(post);
  input.baseLiveHash = staleHash;
  input.snapshot.base.live_hash = staleHash;
  input.report.baseLiveHash = staleHash;
  const client = transactionClient(({ sql }) => {
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  await assert.rejects(repository.createOptimizedRevision(input), {
    code: 'CONTENT_REVISION_STALE'
  });

  assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(client.calls.some(({ sql }) => /INSERT INTO content_post_revisions/i.test(sql)), false);
  assert.equal(client.released, true);
});

test('Parallele Draft-Revision eines anderen Auftrags wird fail-closed abgewiesen', async () => {
  const post = publishedPost();
  const input = optimizedRevisionInput(post);
  const client = transactionClient(({ sql }) => {
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql)) {
      return { rows: [{ id: 70, post_id: 19, audit_id: 30, optimization_job_id: 43, status: 'draft' }] };
    }
    if (/FROM content_post_audits a/i.test(sql)) {
      return { rows: [{ id: 31, post_id: 19, job_id: 44, status: 'open' }] };
    }
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  await assert.rejects(repository.createOptimizedRevision(input), {
    code: 'CONTENT_REVISION_CONFLICT'
  });
  assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(client.calls.some(({ sql }) => /INSERT INTO content_post_revisions/i.test(sql)), false);
});

test('Zu großer Optimierungsbericht wird vor Transaktionsbeginn abgewiesen', async () => {
  let connectCalls = 0;
  const input = optimizedRevisionInput();
  input.report.details = 'x'.repeat(600_000);
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { connectCalls += 1; throw new Error('nicht erwartet'); }
  });

  await assert.rejects(repository.createOptimizedRevision(input), {
    code: 'CONTENT_ACTION_VALIDATION_FAILED'
  });
  assert.equal(connectCalls, 0);
});

test('Neuester Optimierungsstatus lädt keine großen Laufzeit- oder Provider-JSON-Werte', async () => {
  const row = { job_id: 44, job_status: 'completed', revision_id: 71, revision_status: 'draft' };
  const calls = [];
  const repository = createContentExistingPostOptimizationRepository({
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return { rows: [row] };
    }
  });

  assert.deepEqual(await repository.getLatestOptimizationState(19), row);
  assert.deepEqual(calls[0].params, [19]);
  assert.match(calls[0].sql, /j\.job_type = 'optimize_existing_post'/i);
  assert.match(calls[0].sql, /ORDER BY j\.created_at DESC, j\.id DESC LIMIT 1/i);
  assert.doesNotMatch(calls[0].sql, /runtime_snapshot_json|stage_results_json|payload_json\s+AS|openai_response_ids_json/i);
});

test('Revisionsvergleich lädt Livefassung, Audit, Bericht und Outcome begrenzt', async () => {
  const row = { id: 71, live_title: 'Website-Relaunch planen', audit_score: 72 };
  const calls = [];
  const repository = createContentExistingPostOptimizationRepository({
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return { rows: [row] };
    }
  });

  assert.deepEqual(await repository.getRevisionComparison(71), row);
  assert.deepEqual(calls[0].params, [71]);
  assert.match(calls[0].sql, /r\.optimization_report_json/i);
  assert.match(calls[0].sql, /p\.title AS live_title/i);
  assert.match(calls[0].sql, /a\.score AS audit_score/i);
  assert.match(calls[0].sql, /content_revision_optimization_outcomes/i);
  assert.match(calls[0].sql, /LIMIT 1/i);
});

test('Rücknahme-Update prüft Livehash und Revisionsversion atomar und speichert Feedback', async () => {
  const post = publishedPost({
    content: '<section><h2>Planung</h2><p><a href="https://example.com/fachquelle">Fachquelle</a></p></section>'
  });
  const storedSnapshot = createRevisionSnapshot(post);
  storedSnapshot.fields.meta_title = 'Optimierter Meta Title';
  const nextSnapshot = structuredClone(storedSnapshot);
  nextSnapshot.fields.meta_title = post.meta_title;
  const storedReport = {
    ...buildExistingPostDiff({
      before: { metaTitle: post.meta_title },
      after: { metaTitle: storedSnapshot.fields.meta_title },
      reasons: []
    }),
    baseLiveHash: storedSnapshot.base.live_hash,
    beforeScore: 72,
    afterScore: 92,
    sources: [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }]
  };
  const changeId = storedReport.changes[0].id;
  const report = structuredClone(storedReport);
  report.changes[0].status = 'reverted';
  const revision = {
    id: 71,
    post_id: 19,
    audit_id: 31,
    optimization_job_id: 44,
    status: 'draft',
    revision_version: 3,
    snapshot_json: storedSnapshot,
    optimization_report_json: storedReport
  };
  const client = transactionClient(({ sql, params }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) return { rows: [{ post_id: 19 }] };
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql) && /FOR UPDATE/i.test(sql)) return { rows: [revision] };
    if (/FROM content_runs run/i.test(sql)) {
      return { rows: [{ runtime_snapshot_json: originRuntimeSnapshot() }] };
    }
    if (/FROM content_post_audits a/i.test(sql)) {
      return { rows: [{ id: 31, post_id: 19, job_id: 44, status: 'revision_created', findings_json: [] }] };
    }
    if (/UPDATE content_post_revisions/i.test(sql)) return { rows: [{
      ...revision,
      revision_version: 4,
      snapshot_json: JSON.parse(params[1]),
      optimization_report_json: JSON.parse(params[2])
    }] };
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [revalidationJobRow(params)] };
    if (/INSERT INTO content_revision_optimization_feedback/i.test(sql)) return { rows: [{ id: 9 }] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  let lockedValidationContext;
  const result = await repository.updateRevisionAfterRevert({
    revisionId: 71,
    expectedVersion: 3,
    snapshot: nextSnapshot,
    report,
    changeId,
    categoryKey: 'metadata_quality',
    details: { reason: 'Admin-Rücknahme' },
    sourceReferences: [{ title: 'Browserquelle', url: 'https://evil.example/browser' }],
    validateSnapshot: async (lockedSnapshot, context) => {
      lockedValidationContext = context.validationContext;
      assert.match(lockedSnapshot.fields.content, /https:\/\/example\.com\/fachquelle/);
      assert.equal(
        context.validationContext.sourceReferences.some(({ url }) => (
          url === 'https://example.com/fachquelle'
        )),
        true
      );
    },
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(result.revision_version, 4);
  assert.equal(result.optimization_report_json.revalidation.status, 'pending');
  assert.equal(result.optimization_report_json.revalidation.revisionVersion, 4);
  assert.equal(result.optimization_report_json.revalidation.minimumScore, 80);
  assert.deepEqual(lockedValidationContext.sourceReferences, [
    { title: 'Fachquelle', url: 'https://example.com/fachquelle' }
  ]);
  assert.match(result.optimization_report_json.revalidation.snapshotFingerprint, /^[0-9a-f]{64}$/);
  const update = client.calls.find(({ sql }) => /UPDATE content_post_revisions/i.test(sql));
  assert.match(update.sql, /revision_version = revision_version \+ 1/i);
  assert.match(update.sql, /status = 'draft'/i);
  assert.match(update.sql, /revision_version = \$4::integer/i);
  const auditLock = client.calls.find(({ sql }) => /FROM content_post_audits/i.test(sql));
  assert.ok(auditLock);
  assert.match(auditLock.sql, /a\.id = \$1::bigint/i);
  assert.match(auditLock.sql, /a\.post_id = \$2::integer/i);
  assert.match(auditLock.sql, /a\.job_id = \$3::bigint/i);
  assert.match(auditLock.sql, /a\.status = 'revision_created'/i);
  assert.match(auditLock.sql, /FOR UPDATE OF a/i);
  assert.ok(client.calls.some(({ sql }) => /INSERT INTO content_revision_optimization_feedback/i.test(sql)));
  const revalidationJob = client.calls.find(({ sql }) => /INSERT INTO content_jobs/i.test(sql));
  assert.ok(revalidationJob);
  assert.match(revalidationJob.sql, /ON CONFLICT \(idempotency_key\)/i);
  assert.deepEqual(JSON.parse(revalidationJob.params[2]), {
    source: 'revision_revalidation',
    revision_id: 71,
    revision_version: 4,
    snapshot_fingerprint: result.optimization_report_json.revalidation.snapshotFingerprint
  });
  assert.equal(client.calls.at(-1).sql, 'COMMIT');
});

test('unbekannte externe Rücknahmequelle blockiert und rollt ohne Schreibzugriff zurück', async () => {
  const post = publishedPost({
    content: '<section><h2>Planung</h2><p><a href="https://unknown.example/fremd">Fremdquelle</a></p></section>'
  });
  const snapshot = createRevisionSnapshot(post);
  snapshot.fields.meta_title = 'Optimierter Meta-Titel';
  const report = {
    ...buildExistingPostDiff({
      before: { metaTitle: post.meta_title },
      after: { metaTitle: snapshot.fields.meta_title }
    }),
    baseLiveHash: snapshot.base.live_hash,
    sources: [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }]
  };
  const revision = {
    id: 71,
    post_id: 19,
    audit_id: 31,
    optimization_job_id: 44,
    status: 'draft',
    revision_version: 3,
    snapshot_json: snapshot,
    optimization_report_json: report
  };
  const client = transactionClient(({ sql }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) return { rows: [{ post_id: 19 }] };
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql) && /FOR UPDATE/i.test(sql)) return { rows: [revision] };
    if (/FROM content_runs run/i.test(sql)) {
      return { rows: [{ runtime_snapshot_json: originRuntimeSnapshot() }] };
    }
    if (/FROM content_post_audits a/i.test(sql)) return { rows: [{ id: 31 }] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  await assert.rejects(repository.updateRevisionAfterRevert({
    revisionId: 71,
    expectedVersion: 3,
    changeId: report.changes[0].id,
    sourceReferences: [{ title: 'Browserquelle', url: 'https://unknown.example/fremd' }],
    validateSnapshot: async (lockedSnapshot, context) => {
      assert.match(lockedSnapshot.fields.content, /https:\/\/unknown\.example\/fremd/);
      assert.equal(
        context.validationContext.sourceReferences.some(({ url }) => (
          url === 'https://unknown.example/fremd'
        )),
        false
      );
      throw Object.assign(new Error('erneute Prüfung fehlgeschlagen'), {
        code: 'CONTENT_REVISION_VALIDATION_FAILED'
      });
    },
    admin: { id: 7, username: 'Admin' }
  }), { code: 'CONTENT_REVISION_VALIDATION_FAILED' });

  assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(client.calls.some(({ sql }) => /UPDATE content_post_revisions/i.test(sql)), false);
  assert.equal(client.calls.some(({ sql }) => /INSERT INTO content_revision_optimization_feedback/i.test(sql)), false);
});

test('Repository lehnt nicht kanonische PG-INT32-Werte und Change-IDs vor Transaktionsbeginn ab', async () => {
  let connects = 0;
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { connects += 1; throw new Error('nicht erwartet'); }
  });
  for (const input of [
    { revisionId: 2_147_483_648, expectedVersion: 1, changeId: 'a'.repeat(64) },
    { revisionId: 1, expectedVersion: 2_147_483_648, changeId: 'a'.repeat(64) },
    { revisionId: 1, expectedVersion: 1, changeId: ` ${'a'.repeat(64)}` },
    { revisionId: 1, expectedVersion: 1, changeId: 'A'.repeat(64) }
  ]) {
    await assert.rejects(repository.updateRevisionAfterRevert({
      ...input,
      validateSnapshot: async () => {},
      admin: { id: 7, username: 'Admin' }
    }), { code: 'CONTENT_ACTION_VALIDATION_FAILED' });
  }
  assert.equal(connects, 0);
});

test('Rücknahme ignoriert vorbereitete Fremdwerte und wendet den gesperrten Diff per Fingerprint an', async () => {
  const post = publishedPost({ meta_title: 'Website-Relaunch planen' });
  const snapshot = createRevisionSnapshot(post);
  snapshot.fields.meta_title = 'Website-Relaunch sicher planen';
  const diff = buildExistingPostDiff({
    before: { metaTitle: post.meta_title },
    after: { metaTitle: snapshot.fields.meta_title },
    reasons: []
  });
  const report = {
    ...diff,
    baseLiveHash: snapshot.base.live_hash,
    beforeScore: 72,
    afterScore: 92,
    sources: [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }]
  };
  const changeId = report.changes[0].id;
  const revision = {
    id: 71,
    post_id: 19,
    audit_id: 31,
    optimization_job_id: 44,
    status: 'draft',
    revision_version: 3,
    snapshot_json: snapshot,
    optimization_report_json: report
  };
  let validatedSnapshot;
  const client = transactionClient(({ sql, params }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) return { rows: [{ post_id: 19 }] };
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql) && /FOR UPDATE/i.test(sql)) return { rows: [revision] };
    if (/FROM content_runs run/i.test(sql)) {
      return { rows: [{ runtime_snapshot_json: originRuntimeSnapshot() }] };
    }
    if (/FROM content_post_audits a/i.test(sql)) {
      return { rows: [{ id: 31, post_id: 19, job_id: 44, status: 'revision_created' }] };
    }
    if (/UPDATE content_post_revisions/i.test(sql)) {
      return { rows: [{
        ...revision,
        revision_version: 4,
        snapshot_json: JSON.parse(params[1]),
        optimization_report_json: JSON.parse(params[2])
      }] };
    }
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [revalidationJobRow(params)] };
    if (/INSERT INTO content_revision_optimization_feedback/i.test(sql)) return { rows: [{ id: 9 }] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });
  const maliciousSnapshot = structuredClone(snapshot);
  maliciousSnapshot.fields.meta_title = 'Manipulierter Fremdwert';
  const maliciousReport = structuredClone(report);
  maliciousReport.changes[0].status = 'reverted';

  const result = await repository.updateRevisionAfterRevert({
    revisionId: 71,
    expectedVersion: 3,
    changeId,
    snapshot: maliciousSnapshot,
    report: maliciousReport,
    validateSnapshot: async (value) => { validatedSnapshot = structuredClone(value); },
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(validatedSnapshot.fields.meta_title, 'Website-Relaunch planen');
  assert.equal(result.snapshot_json.fields.meta_title, 'Website-Relaunch planen');
  assert.equal(result.optimization_report_json.changes[0].status, 'reverted');
});

test('Rücknahme schreibt nur serverseitig abgeleitetes Feedback und die Lernbeobachtung in dieselbe Transaktion', async () => {
  const post = publishedPost();
  const snapshot = createRevisionSnapshot(post);
  snapshot.fields.meta_title = 'Optimierter Meta-Titel';
  const report = {
    ...buildExistingPostDiff({
      before: { metaTitle: post.meta_title },
      after: { metaTitle: snapshot.fields.meta_title },
      reasons: [{
        field: 'metaTitle',
        auditCodes: ['technical_precision'],
        reason: 'Der Titel wurde fachlich präzisiert.',
        sourceUrls: []
      }]
    }),
    baseLiveHash: snapshot.base.live_hash,
    beforeScore: 72,
    afterScore: 92,
    sources: [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }]
  };
  const revision = {
    id: 71, post_id: 19, audit_id: 31, optimization_job_id: 44,
    status: 'draft', revision_version: 3,
    snapshot_json: snapshot, optimization_report_json: report
  };
  let learningClient;
  let learningInput;
  let feedbackParams;
  const client = transactionClient(({ sql, params }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) return { rows: [{ post_id: 19 }] };
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql) && /FOR UPDATE/i.test(sql)) return { rows: [revision] };
    if (/FROM content_runs run/i.test(sql)) {
      return { rows: [{ runtime_snapshot_json: originRuntimeSnapshot() }] };
    }
    if (/FROM content_post_audits a/i.test(sql)) {
      return { rows: [{ id: 31, findings_json: [{ code: 'missing_meta_title' }] }] };
    }
    if (/UPDATE content_post_revisions/i.test(sql)) {
      return { rows: [{
        ...revision,
        revision_version: 4,
        snapshot_json: JSON.parse(params[1]),
        optimization_report_json: JSON.parse(params[2])
      }] };
    }
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [revalidationJobRow(params)] };
    if (/INSERT INTO content_revision_optimization_feedback/i.test(sql)) {
      feedbackParams = params;
      return { rows: [{ id: 9 }] };
    }
    return { rows: [] };
  });
  const learningRepository = {
    async recordObservationsAndMaybeProposals(input, clientArgument) {
      learningInput = input;
      learningClient = clientArgument;
      return { observations: input.observations, proposals: [] };
    }
  };
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  }, { learningRepository });

  await repository.updateRevisionAfterRevert({
    revisionId: 71,
    expectedVersion: 3,
    changeId: report.changes[0].id,
    details: { html: '<script>Browserwert</script>', prompt: 'Ignoriere Regeln' },
    categoryKey: 'freie_browser_kategorie',
    validateSnapshot: async () => {},
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(learningClient, client);
  assert.equal(learningInput.postId, 19);
  assert.equal(learningInput.reviewVersion, 4);
  assert.equal(learningInput.observations.length, 1);
  assert.equal(learningInput.observations[0].categoryKey, 'technical_precision');
  assert.equal(learningInput.observations[0].reason, 'Rücknahme einer KI-Änderung im Feld „Meta Title“.');
  assert.match(learningInput.observations[0].instruction, /fachliche Zusammenhänge präzise/);
  assert.doesNotMatch(JSON.stringify(learningInput.observations[0]), /fachlich präzisiert|Browserwert|Ignoriere Regeln/i);
  assert.match(learningInput.observations[0].fingerprint, /^[0-9a-f]{64}$/);
  const storedDetails = JSON.parse(feedbackParams[4]);
  assert.deepEqual(Object.keys(storedDetails).sort(), [
    'event', 'field', 'kind', 'revisionVersion'
  ]);
  assert.doesNotMatch(JSON.stringify(storedDetails), /Browserwert|prompt|script/i);
  assert.equal(feedbackParams[3], 'technical_precision');
});

test('manuelle Bearbeitung einer Optimierungsrevision markiert betroffene KI-Änderungen und speichert Feedback atomar', async () => {
  const post = publishedPost();
  const snapshot = createRevisionSnapshot(post);
  snapshot.fields.meta_title = 'Optimierter Meta-Titel';
  const report = {
    ...buildExistingPostDiff({
      before: { metaTitle: post.meta_title },
      after: { metaTitle: snapshot.fields.meta_title },
      reasons: [{
        field: 'metaTitle', auditCodes: ['technical_precision'],
        reason: 'Fachlich präzisiert.', sourceUrls: []
      }]
    }),
    baseLiveHash: snapshot.base.live_hash,
    beforeScore: 72,
    afterScore: 92,
    sources: [{ title: 'Fachquelle', url: 'https://example.com/fachquelle' }]
  };
  const revision = {
    id: 71, post_id: 19, audit_id: 31, optimization_job_id: 44,
    status: 'draft', revision_version: 3,
    snapshot_json: snapshot, optimization_report_json: report
  };
  const feedback = [];
  const observations = [];
  const client = transactionClient(({ sql, params }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) return { rows: [{ post_id: 19 }] };
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql) && /FOR UPDATE/i.test(sql)) return { rows: [revision] };
    if (/FROM content_runs run/i.test(sql)) {
      return { rows: [{ runtime_snapshot_json: originRuntimeSnapshot() }] };
    }
    if (/FROM content_post_audits a/i.test(sql)) {
      return { rows: [{ id: 31, findings_json: [{ code: 'missing_meta_title' }] }] };
    }
    if (/UPDATE content_post_revisions/i.test(sql)) {
      return { rows: [{
        ...revision,
        revision_version: 4,
        snapshot_json: JSON.parse(params[1]),
        optimization_report_json: JSON.parse(params[2])
      }] };
    }
    if (/INSERT INTO content_jobs/i.test(sql)) return { rows: [revalidationJobRow(params)] };
    if (/INSERT INTO content_revision_optimization_feedback/i.test(sql)) {
      feedback.push(params);
      return { rows: [{ id: feedback.length }] };
    }
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  }, {
    learningRepository: {
      async recordObservationsAndMaybeProposals(input, transaction) {
        assert.equal(transaction, client);
        observations.push(...input.observations);
        return { observations: input.observations, proposals: [] };
      }
    }
  });

  let lockedValidationContext;
  const result = await repository.updateRevisionAfterManualEdit({
    revisionId: 71,
    expectedVersion: 3,
    admin: { id: 7, username: 'Admin' },
    sourceReferences: [{ title: 'Browserquelle', url: 'https://evil.example/browser' }],
    buildValidatedUpdate: async (current, context) => {
      assert.equal(current.fields.meta_title, 'Optimierter Meta-Titel');
      assert.equal(context.report.changes[0].status, 'active');
      lockedValidationContext = context.validationContext;
      const next = structuredClone(current);
      next.fields.meta_title = 'Manuell abgestimmter Meta-Titel';
      return next;
    }
  });

  assert.equal(result.revision_version, 4);
  assert.equal(result.optimization_report_json.changes[0].status, 'manual_edit');
  assert.deepEqual(lockedValidationContext.sourceReferences, [
    { title: 'Fachquelle', url: 'https://example.com/fachquelle' }
  ]);
  assert.equal(feedback.length, 1);
  assert.equal(feedback[0][2], report.changes[0].id);
  assert.equal(feedback[0][3], 'technical_precision');
  assert.equal(observations.length, 1);
  assert.equal(client.calls.at(-1).sql, 'COMMIT');
});

test('mehrdeutige HTML-Blöcke und FAQ-Fragen werden nicht als ursprüngliche KI-Änderung klassifiziert', () => {
  const htmlManual = {
    kind: 'html', field: 'contentHtml', path: 'section:1/p:2', beforePath: 'section:1/p:2',
    blockType: 'p', beforeFingerprint: 'a'.repeat(64)
  };
  const htmlChanges = [
    { id: '1'.repeat(64), status: 'active', kind: 'html', field: 'contentHtml', afterPath: 'section:1/p:2', blockType: 'p', afterFingerprint: 'a'.repeat(64) },
    { id: '2'.repeat(64), status: 'active', kind: 'html', field: 'contentHtml', afterPath: 'section:1/p:2', blockType: 'p', afterFingerprint: 'a'.repeat(64) }
  ];
  assert.equal(matchingActiveOptimizationChange(htmlChanges, htmlManual), null);

  const faqManual = {
    kind: 'faq', field: 'faqJson', path: 'faq:neu', beforeFingerprint: 'b'.repeat(64),
    before: { question: 'Wie läuft der Relaunch ab?', answer: 'Optimierte Antwort.' }
  };
  const faqChanges = [
    { id: '3'.repeat(64), status: 'active', kind: 'faq', field: 'faqJson', afterFingerprint: 'b'.repeat(64), after: faqManual.before },
    { id: '4'.repeat(64), status: 'active', kind: 'faq', field: 'faqJson', afterFingerprint: 'b'.repeat(64), after: { ...faqManual.before, question: '  WIE LÄUFT DER RELAUNCH AB? ' } }
  ];
  assert.equal(matchingActiveOptimizationChange(faqChanges, faqManual), null);
});

test('Ablehnung aktualisiert nur eine aktuelle Draft-Optimierungsrevision und löst den Audit nicht auf', async () => {
  const revision = {
    id: 71,
    post_id: 19,
    audit_id: 31,
    optimization_job_id: 44,
    status: 'draft',
    revision_version: 3
  };
  const client = transactionClient(({ sql }) => {
    if (/FROM posts p/i.test(sql)) return { rows: [{ id: 19 }] };
    if (/FROM content_post_revisions r/i.test(sql)) return { rows: [revision] };
    if (/FROM content_post_audits a/i.test(sql)) {
      return { rows: [{ id: 31, findings_json: [] }] };
    }
    if (/UPDATE content_post_revisions/i.test(sql)) return { rows: [{ ...revision, status: 'rejected', revision_version: 4 }] };
    if (/INSERT INTO content_revision_optimization_feedback/i.test(sql)) return { rows: [{ id: 10 }] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  const result = await repository.rejectRevision({
    revisionId: 71,
    expectedVersion: 3,
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(result.status, 'rejected');
  assert.equal(result.revision_version, 4);
  const allSql = client.calls.map(({ sql }) => sql).join('\n');
  assert.match(allSql, /optimization_job_id IS NOT NULL/i);
  assert.doesNotMatch(allSql, /UPDATE content_post_audits/i);
  const auditLock = client.calls.find(({ sql }) => /FROM content_post_audits a/i.test(sql));
  assert.match(auditLock.sql, /a\.id = \$1::bigint/i);
  assert.match(auditLock.sql, /a\.post_id = \$2::integer/i);
  assert.match(auditLock.sql, /a\.job_id = \$3::bigint/i);
  assert.match(auditLock.sql, /a\.status = 'revision_created'/i);
  assert.equal(client.calls.at(-1).sql, 'COMMIT');
});

test('Ablehnung sperrt Post-Tabelle, Postzeile und Revision in kanonischer Reihenfolge vor dem Feedback', async () => {
  const revision = {
    id: 71,
    post_id: 19,
    audit_id: 31,
    optimization_job_id: 44,
    status: 'draft',
    revision_version: 3
  };
  const client = transactionClient(({ sql }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) {
      return { rows: [{ post_id: 19 }] };
    }
    if (/SELECT p\.id FROM posts p/i.test(sql)) return { rows: [{ id: 19 }] };
    if (/SELECT r\.\* FROM content_post_revisions r/i.test(sql)) return { rows: [revision] };
    if (/FROM content_post_audits a/i.test(sql)) {
      return { rows: [{ id: 31, findings_json: [] }] };
    }
    if (/UPDATE content_post_revisions/i.test(sql)) {
      return { rows: [{ ...revision, status: 'rejected', revision_version: 4 }] };
    }
    if (/INSERT INTO content_revision_optimization_feedback/i.test(sql)) return { rows: [{ id: 10 }] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  await repository.rejectRevision({
    revisionId: 71,
    expectedVersion: 3,
    admin: { id: 7, username: 'Admin' }
  });

  const sql = client.calls.map((call) => call.sql);
  const locks = [
    sql.findIndex((query) => /^LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE$/i.test(query)),
    sql.findIndex((query) => /SELECT p\.id FROM posts p[\s\S]*FOR UPDATE OF p/i.test(query)),
    sql.findIndex((query) => /SELECT r\.\* FROM content_post_revisions r[\s\S]*FOR UPDATE OF r/i.test(query)),
    sql.findIndex((query) => /UPDATE content_post_revisions/i.test(query)),
    sql.findIndex((query) => /INSERT INTO content_revision_optimization_feedback/i.test(query))
  ];
  assert.ok(locks.every((position) => position >= 0));
  assert.deepEqual(locks, [...locks].sort((left, right) => left - right));
});

test('Übernahmefeedback bindet eine begrenzte Zusammenfassung an die freigegebene Revision und das Outcome', async () => {
  const calls = [];
  const transaction = {
    async query(sql, params) {
      const call = { sql: normalizedSql(sql), params };
      calls.push(call);
      if (/INSERT INTO content_revision_optimization_feedback/i.test(call.sql)) {
        return { rows: [{ id: 15 }] };
      }
      return { rows: [] };
    }
  };
  const repository = createContentExistingPostOptimizationRepository({
    async query() { throw new Error('Übernahmefeedback muss die Freigabetransaktion verwenden.'); }
  });

  const summary = await repository.recordAcceptedRevisionFeedback({
    revisionId: 71,
    postId: 19,
    expectedVersion: 4,
    report: {
      changes: [
        { status: 'active', reason: '<script>nicht speichern</script>' },
        { status: 'reverted' },
        { status: 'manual_edit' }
      ]
    },
    admin: { id: 7, username: 'Admin' }
  }, transaction);

  assert.deepEqual(summary, {
    event: 'accepted',
    revisionVersion: 4,
    activeChanges: 1,
    revertedChanges: 1,
    manualChanges: 1
  });
  assert.match(calls[0].sql, /r\.status = 'approved'/i);
  assert.match(calls[0].sql, /r\.optimization_job_id IS NOT NULL/i);
  assert.doesNotMatch(calls[0].params[3], /script|reason/i);
  assert.match(calls[1].sql, /jsonb_array_length\(outcome\.feedback_json\) < 100/i);
  assert.match(calls[1].sql, /octet_length/i);
  assert.deepEqual(calls[1].params.slice(0, 3), [71, 19, 4]);
});

test('Outcome-Basis wird in der übergebenen Freigabetransaktion mit lokalem 28-Tage-Fenster angelegt', async () => {
  const calls = [];
  const transaction = {
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return { rows: [{ revision_id: 71, followup_start_date: '2026-07-15', followup_end_date: '2026-08-11' }] };
    }
  };
  const repository = createContentExistingPostOptimizationRepository({
    async query() { throw new Error('Outcome muss die Freigabetransaktion verwenden.'); }
  });

  const outcome = await repository.createOutcomeBaseline({
    revisionId: 71,
    postId: 19,
    expectedVersion: 3,
    appliedAt: '2026-07-14T16:00:00.000Z',
    baselineStartDate: null,
    baselineEndDate: null,
    baselineMetrics: {
      hasData: false,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      averagePosition: null,
      queries: []
    },
    timezone: 'Europe/Berlin'
  }, transaction);

  assert.equal(outcome.followup_end_date, '2026-08-11');
  assert.match(calls[0].sql, /AT TIME ZONE \$8::text/i);
  assert.match(calls[0].sql, /::date \+ 1\)/i);
  assert.match(calls[0].sql, /::date \+ 28\)/i);
  assert.match(calls[0].sql, /r\.revision_version = \$4::integer/i);
  assert.match(calls[0].sql, /r\.status = 'approved'/i);
  assert.match(calls[0].sql, /feedback\.event_type = 'accepted'/i);
  assert.match(calls[0].sql, /jsonb_agg\(feedback\.details_json/i);
  assert.deepEqual(calls[0].params.slice(0, 4), [71, 19, '2026-07-14T16:00:00.000Z', 3]);
});

test('Fällige Outcomes werden atomar, parallelitätssicher und auf 50 Datensätze begrenzt geclaimt', async () => {
  const client = transactionClient((call) => {
    if (/UPDATE content_revision_optimization_outcomes AS outcome/i.test(call.sql)) {
      return { rows: [{ revision_id: 71, evaluation_status: 'ready' }] };
    }
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async query() { throw new Error('Der Outcome-Claim muss eine Transaktion verwenden.'); },
    async connect() { return client; }
  });

  assert.deepEqual(await repository.listDueOutcomes({
    throughDate: '2026-08-11',
    limit: 500,
    claimToken: '11111111-1111-4111-8111-111111111111'
  }), [{ revision_id: 71, evaluation_status: 'ready' }]);
  const claim = client.calls.find((call) => /UPDATE content_revision_optimization_outcomes AS outcome/i.test(call.sql));
  assert.deepEqual(claim.params, [
    '2026-08-11',
    50,
    '11111111-1111-4111-8111-111111111111'
  ]);
  assert.match(claim.sql, /FOR UPDATE OF outcome SKIP LOCKED/i);
  assert.match(claim.sql, /LIMIT \$2::integer/i);
  assert.match(claim.sql, /evaluation_status IN \('waiting', 'failed'\)/i);
  assert.match(claim.sql, /evaluation_status = 'ready'[\s\S]*evaluation_claimed_at < NOW\(\) - INTERVAL '30 minutes'/i);
  assert.match(claim.sql, /SET evaluation_status = 'ready'/i);
  assert.match(claim.sql, /evaluation_claim_token = \$3::uuid/i);
  assert.deepEqual(client.calls.at(0).sql, 'BEGIN');
  assert.deepEqual(client.calls.at(-1).sql, 'COMMIT');
  assert.equal(client.released, true);
});

test('Outcome-Abschluss verwendet Revisionsversion und Claim-Token als CAS und lässt Feedback unverändert', async () => {
  const row = { revision_id: 71, evaluation_status: 'evaluated' };
  const calls = [];
  const repository = createContentExistingPostOptimizationRepository({
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return { rows: [row] };
    }
  });

  const result = await repository.completeOutcome({
    revisionId: 71,
    expectedRevisionVersion: 3,
    claimToken: '11111111-1111-4111-8111-111111111111',
    evaluationStatus: 'evaluated',
    followupMetrics: {
      hasData: true,
      clicks: 4,
      impressions: 120,
      ctr: 0.03333333,
      averagePosition: 8,
      queries: [],
      changes: { clicks: 1, impressions: 20, ctr: 0.01, averagePosition: -2 },
      newImportantQueries: [],
      lostImportantQueries: [],
      label: 'Neutrale Beobachtung',
      note: 'Die Werte sind eine neutrale Beobachtung. Saison, Nachfrage und Google-Änderungen können sie beeinflussen.'
    }
  });

  assert.deepEqual(result, row);
  assert.match(calls[0].sql, /FROM content_post_revisions r/i);
  assert.match(calls[0].sql, /r\.revision_version = \$2::integer/i);
  assert.match(calls[0].sql, /outcome\.evaluation_status = 'ready'/i);
  assert.match(calls[0].sql, /outcome\.evaluation_claim_token = \$3::uuid/i);
  assert.match(calls[0].sql, /evaluation_claim_token = NULL/i);
  assert.doesNotMatch(calls[0].sql, /feedback_json\s*=/i);
  assert.deepEqual(calls[0].params.slice(0, 4), [
    71,
    3,
    '11111111-1111-4111-8111-111111111111',
    'evaluated'
  ]);
});

test('unvollständige Nachmessung gibt ausschließlich den eigenen Claim atomar frei', async () => {
  const row = { revision_id: 71, evaluation_status: 'waiting' };
  const calls = [];
  const repository = createContentExistingPostOptimizationRepository({
    async query(sql, params) { calls.push({ sql: normalizedSql(sql), params }); return { rows: [row] }; }
  });

  assert.deepEqual(await repository.releaseOutcomeClaim({
    revisionId: 71,
    expectedRevisionVersion: 3,
    claimToken: '11111111-1111-4111-8111-111111111111'
  }), row);
  assert.match(calls[0].sql, /SET evaluation_status = 'waiting'/i);
  assert.match(calls[0].sql, /evaluation_claim_token = NULL/i);
  assert.match(calls[0].sql, /outcome\.evaluation_claim_token = \$3::uuid/i);
  assert.match(calls[0].sql, /r\.revision_version = \$2::integer/i);
});

test('Baseline- und Outcome-JSON lehnen zusätzliche Roh- oder Providerfelder vor dem Schreiben ab', async () => {
  let queries = 0;
  const transaction = { async query() { queries += 1; return { rows: [] }; } };
  const repository = createContentExistingPostOptimizationRepository({
    async query() { queries += 1; return { rows: [] }; }
  });
  const baseline = {
    hasData: true,
    clicks: 1,
    impressions: 60,
    ctr: 1 / 60,
    averagePosition: 8,
    queries: []
  };

  await assert.rejects(repository.createOutcomeBaseline({
    revisionId: 71,
    postId: 19,
    expectedVersion: 3,
    appliedAt: '2026-07-14T16:00:00.000Z',
    baselineStartDate: '2026-06-17',
    baselineEndDate: '2026-07-14',
    baselineMetrics: { ...baseline, providerResponse: { id: 'geheim' } },
    timezone: 'Europe/Berlin'
  }, transaction), /Basismetriken|ungültig/i);

  await assert.rejects(repository.completeOutcome({
    revisionId: 71,
    expectedRevisionVersion: 3,
    claimToken: '11111111-1111-4111-8111-111111111111',
    evaluationStatus: 'evaluated',
    followupMetrics: { ...baseline, raw: 'nicht erlaubt' }
  }), /Folgemetriken|ungültig/i);
  assert.equal(queries, 0);
});
