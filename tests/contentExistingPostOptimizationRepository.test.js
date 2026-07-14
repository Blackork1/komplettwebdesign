import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentExistingPostOptimizationRepository } from '../repositories/contentExistingPostOptimizationRepository.js';
import { createRevisionSnapshot, liveHashForPost } from '../services/contentAgent/contentRevisionService.js';
import { buildExistingPostDiff } from '../services/contentAgent/existingPostDiffService.js';

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
  const post = publishedPost();
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
    baseLiveHash: storedSnapshot.base.live_hash
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
  const updated = { ...revision, revision_version: 4, snapshot_json: nextSnapshot, optimization_report_json: report };
  const client = transactionClient(({ sql }) => {
    if (/SELECT r\.post_id FROM content_post_revisions r/i.test(sql)) return { rows: [{ post_id: 19 }] };
    if (/FROM posts p/i.test(sql)) return { rows: [post] };
    if (/FROM content_post_revisions r/i.test(sql) && /FOR UPDATE/i.test(sql)) return { rows: [revision] };
    if (/UPDATE content_post_revisions/i.test(sql)) return { rows: [updated] };
    if (/INSERT INTO content_revision_optimization_feedback/i.test(sql)) return { rows: [{ id: 9 }] };
    return { rows: [] };
  });
  const repository = createContentExistingPostOptimizationRepository({
    async connect() { return client; }
  });

  const result = await repository.updateRevisionAfterRevert({
    revisionId: 71,
    expectedVersion: 3,
    snapshot: nextSnapshot,
    report,
    changeId,
    categoryKey: 'metadata_quality',
    details: { reason: 'Admin-Rücknahme' },
    validateSnapshot: async () => {},
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(result.revision_version, 4);
  const update = client.calls.find(({ sql }) => /UPDATE content_post_revisions/i.test(sql));
  assert.match(update.sql, /revision_version = revision_version \+ 1/i);
  assert.match(update.sql, /status = 'draft'/i);
  assert.match(update.sql, /revision_version = \$4::integer/i);
  assert.ok(client.calls.some(({ sql }) => /INSERT INTO content_revision_optimization_feedback/i.test(sql)));
  assert.equal(client.calls.at(-1).sql, 'COMMIT');
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
  const report = { ...diff, baseLiveHash: snapshot.base.live_hash };
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
    if (/UPDATE content_post_revisions/i.test(sql)) {
      return { rows: [{
        ...revision,
        revision_version: 4,
        snapshot_json: JSON.parse(params[1]),
        optimization_report_json: JSON.parse(params[2])
      }] };
    }
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
    baselineMetrics: { hasData: false },
    timezone: 'Europe/Berlin'
  }, transaction);

  assert.equal(outcome.followup_end_date, '2026-08-11');
  assert.match(calls[0].sql, /AT TIME ZONE \$8::text/i);
  assert.match(calls[0].sql, /::date \+ 1\)/i);
  assert.match(calls[0].sql, /::date \+ 28\)/i);
  assert.match(calls[0].sql, /r\.revision_version = \$4::integer/i);
  assert.match(calls[0].sql, /r\.status = 'approved'/i);
  assert.deepEqual(calls[0].params.slice(0, 4), [71, 19, '2026-07-14T16:00:00.000Z', 3]);
});

test('Fällige Outcomes sind auf 50 Datensätze begrenzt und nullsicher parametrisiert', async () => {
  const calls = [];
  const repository = createContentExistingPostOptimizationRepository({
    async query(sql, params) {
      calls.push({ sql: normalizedSql(sql), params });
      return { rows: [] };
    }
  });

  assert.deepEqual(await repository.listDueOutcomes({ throughDate: null, limit: 500 }), []);
  assert.deepEqual(calls[0].params, [null, 50]);
  assert.match(calls[0].sql, /COALESCE\(\$1::date, CURRENT_DATE\)/i);
  assert.match(calls[0].sql, /LIMIT \$2::integer/i);
  assert.match(calls[0].sql, /evaluation_status IN \('waiting', 'ready', 'failed'\)/i);
});

test('Outcome-Abschluss verwendet Revisionsversion und bisherigen Status als optimistischen Lock', async () => {
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
    expectedStatuses: ['waiting', 'ready'],
    evaluationStatus: 'evaluated',
    followupMetrics: { impressions: 120, clicks: 4 },
    feedback: [{ label: 'Beobachtung' }]
  });

  assert.deepEqual(result, row);
  assert.match(calls[0].sql, /FROM content_post_revisions r/i);
  assert.match(calls[0].sql, /r\.revision_version = \$2::integer/i);
  assert.match(calls[0].sql, /outcome\.evaluation_status = ANY\(\$3::varchar\[\]\)/i);
  assert.deepEqual(calls[0].params.slice(0, 4), [71, 3, ['waiting', 'ready'], 'evaluated']);
});
