import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRevisionSnapshot,
  createContentRevisionService,
  liveHashForPost
} from '../services/contentAgent/contentRevisionService.js';
import * as adminPresentation from '../services/contentAgent/adminPresentationService.js';
import { buildExistingPostDiff } from '../services/contentAgent/existingPostDiffService.js';
import { snapshotFingerprint } from '../services/contentAgent/revisionSnapshotFingerprint.js';

const validFaq = Array.from({ length: 5 }, (_, index) => ({ question: `Frage ${index + 1}?`, answer: 'Eine vollständige Antwort.' }));
const post = {
  id: 7,
  title: 'Titel',
  slug: 'unveraendert',
  excerpt: 'Kurzbeschreibung',
  content: '<p>Inhalt</p>',
  content_format: 'legacy_ejs',
  meta_title: 'Meta Titel',
  meta_description: 'Meta Beschreibung',
  og_title: 'OG Titel',
  og_description: 'OG Beschreibung',
  faq_json: validFaq,
  image_url: 'https://example.test/bild.webp',
  image_alt: 'Alt-Text',
  published: true,
  updated_at: '2026-07-12T10:00:00.000Z'
};

test('Revisionssnapshot hat eine explizite Feldfreigabe und unveränderliche Basisdaten', () => {
  const snapshot = createRevisionSnapshot(post);
  assert.deepEqual(Object.keys(snapshot.fields).sort(), [
    'content', 'excerpt', 'faq_json', 'image_alt', 'image_url', 'meta_description',
    'meta_title', 'og_description', 'og_title', 'title'
  ]);
  assert.equal(snapshot.base.slug, post.slug);
  assert.equal(snapshot.base.content_format, post.content_format);
  assert.equal(snapshot.base.updated_at, post.updated_at);
  assert.match(snapshot.base.live_hash, /^[a-f0-9]{64}$/);
  assert.equal(snapshot.fields.slug, undefined);
  assert.equal(snapshot.fields.published, undefined);
});

test('Legacy-Inhalt bleibt bei der Bearbeitung konservativ unveränderlich', async () => {
  const saved = [];
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 3, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(post) }),
      updateDraftRevision: async (input) => { saved.push(input); return input; }
    }
  });

  await assert.rejects(
    service.updateRevision({ revisionId: 3, input: { revision_version: '1', content: '<p>Neu</p>' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
  );
  assert.equal(saved.length, 0);
});

test('Slug und Veröffentlichungsfelder sind auch im Revisionspayload gesperrt', async () => {
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 3, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(post) }),
      updateDraftRevision: async () => assert.fail('gesperrtes Feld darf nicht gespeichert werden')
    }
  });
  await assert.rejects(
    service.updateRevision({ revisionId: 3, input: { revision_version: '1', slug: 'neu', published: 'true' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
  );
});

test('statisches Revisions-HTML wird vor Speicherung fail-closed bereinigt', async () => {
  const staticPost = { ...post, content_format: 'static_html', content: '<p>Sicher</p>' };
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 4, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(staticPost) }),
      updateDraftRevision: async () => assert.fail('aktive Inhalte dürfen nicht gespeichert werden')
    },
    validateArticle: async () => ({ passed: true, sanitizedHtml: '<p>Sicher</p>', issues: [] })
  });
  await assert.rejects(
    service.updateRevision({ revisionId: 4, input: { revision_version: '1', content: '<script>alert(1)</script><p>Sicher</p>' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
  );
});

test('Revisionen validieren FAQ und Bild-URL auch für unverändertes Legacy-EJS streng', async () => {
  for (const invalid of [
    { faq_json: validFaq.slice(0, 4) },
    { image_url: 'javascript:alert(1)' },
    { image_url: '//evil.example/bild.webp' },
    { image_url: 'http://example.test/bild.webp' }
  ]) {
    const invalidPost = { ...post, ...invalid };
    const service = createContentRevisionService({
      repository: {
        getRevisionForEdit: async () => ({ id: 6, status: 'draft', revision_version: 1, snapshot_json: createRevisionSnapshot(invalidPost) }),
        updateDraftRevision: async () => assert.fail('ungültige Revision darf nicht gespeichert werden')
      }
    });
    await assert.rejects(
      service.updateRevision({ revisionId: 6, input: { revision_version: '1', meta_title: 'Neu' }, admin: { id: 1, username: 'admin' } }),
      (error) => error.code === 'CONTENT_REVISION_VALIDATION_FAILED'
    );
  }
});

test('statisches HTML erhält ausschließlich das vertrauenswürdige Linkinventar des Repositorys', async () => {
  const contexts = [];
  const staticPost = { ...post, content_format: 'static_html', content: '<p><a href="/unbekannt">Link</a></p>' };
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({
        id: 7, status: 'draft', revision_version: 2,
        snapshot_json: createRevisionSnapshot(staticPost),
        validation_context: { existingSlugs: [], allowedInternalLinks: ['/kontakt'] }
      }),
      updateDraftRevision: async (input) => input
    },
    validateArticle: async (article, context) => {
      contexts.push(context);
      return { passed: true, sanitizedHtml: article.contentHtml, issues: [] };
    }
  });
  await service.updateRevision({ revisionId: 7, input: { revision_version: '2', meta_title: 'Neu' }, admin: { id: 1, username: 'admin' } });
  assert.deepEqual(contexts[0].allowedInternalLinks, ['/kontakt']);
  assert.equal(contexts[0].allowedInternalLinks.includes('/unbekannt'), false);
});

test('optimistische Versionsprüfung verhindert verlorene Änderungen aus parallelen Tabs', async () => {
  const service = createContentRevisionService({
    repository: {
      getRevisionForEdit: async () => ({ id: 8, status: 'draft', revision_version: 3, snapshot_json: createRevisionSnapshot(post) }),
      updateDraftRevision: async () => assert.fail('stale Version darf nicht schreiben')
    }
  });
  await assert.rejects(
    service.updateRevision({ revisionId: 8, input: { revision_version: '2', meta_title: 'Parallel' }, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_REVISION_CONFLICT'
  );
});

test('Freigabe benötigt Bestätigung und delegiert die atomare Sperrtransaktion', async () => {
  const approvals = [];
  const service = createContentRevisionService({
    repository: {
      approveRevisionTransaction: async (input) => { approvals.push(input); return { id: 3, status: 'approved' }; }
    }
  });

  await assert.rejects(
    service.approveRevision({ revisionId: 3, expectedVersion: 1, confirmed: false, admin: { id: 1, username: 'admin' } }),
    (error) => error.code === 'CONTENT_CONFIRMATION_REQUIRED'
  );
  assert.equal(approvals.length, 0);
  await service.approveRevision({ revisionId: 3, expectedVersion: 1, confirmed: true, admin: { id: 1, username: 'admin' } });
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].expectedVersion, 1);
});

test('Vorbereitung einer KI-Optimierung liefert ausschließlich den serverseitigen Livehash', async () => {
  const service = createContentRevisionService({
    optimizationRepository: {
      async getPublishedPostSnapshot(postId) {
        assert.equal(postId, 7);
        return post;
      }
    }
  });

  assert.deepEqual(await service.prepareExistingPostOptimization(7), {
    baseLiveHash: liveHashForPost(post)
  });
});

test('Vorbereitung lehnt fehlende oder unveröffentlichte Artikel ab', async () => {
  for (const repositoryPost of [null, { ...post, published: false }]) {
    const service = createContentRevisionService({
      optimizationRepository: {
        async getPublishedPostSnapshot() { return repositoryPost; }
      }
    });

    await assert.rejects(
      service.prepareExistingPostOptimization(7),
      { code: 'CONTENT_POST_NOT_FOUND' }
    );
  }
});

test('KI-Optimierung baut denselben Snapshotvertrag und delegiert nur eine Draft-Revision', async () => {
  const staticPost = { ...post, content_format: 'static_html', content: '<p>Inhalt</p>' };
  const baseLiveHash = liveHashForPost(staticPost);
  const persisted = [];
  const validationContexts = [];
  const fields = {
    title: 'Gezielt optimierter Titel',
    shortDescription: 'Gezielt optimierte Kurzbeschreibung',
    metaTitle: 'Gezielt optimierter Meta-Titel',
    metaDescription: 'Eine gezielt optimierte und ausreichend konkrete Meta-Beschreibung für den bestehenden Beitrag.',
    ogTitle: 'Gezielt optimierter OG-Titel',
    ogDescription: 'Gezielt optimierte OG-Beschreibung',
    contentHtml: '<p>Gezielt optimierter Inhalt</p>',
    faqJson: validFaq,
    imageAlt: 'Gezielt optimierter Alt-Text',
    changeReasons: [{
      field: 'contentHtml', auditCodes: ['missing_internal_links'],
      reason: 'Konkreter formuliert.', sourceUrls: []
    }]
  };
  const diff = { changes: [{ id: 'change-1', field: 'contentHtml' }] };
  const service = createContentRevisionService({
    optimizationRepository: {
      async createOptimizedRevision(input) {
        persisted.push(input);
        return { id: 71, status: 'draft' };
      }
    },
    validateArticle: async (article, context) => {
      validationContexts.push(context);
      return { passed: true, sanitizedHtml: article.contentHtml, issues: [] };
    }
  });

  const result = await service.createOptimizedRevision({
    post: staticPost,
    fields,
    auditId: 31,
    jobId: 44,
    baseLiveHash,
    diff,
    report: {
      baseLiveHash,
      beforeScore: 72,
      afterScore: 92,
      review: {
        passed: true,
        score: 92,
        summary: 'Die gezielte Optimierung ist vollständig geprüft.',
        strengths: ['Präzise Aktualisierung'],
        issues: [],
        recommendedActions: [],
        requiresManualReview: false,
        risks: {
          currentClaims: false,
          legalClaims: false,
          privacyClaims: false,
          softwareVersionClaims: false,
          staticPrices: false
        }
      }
    },
    validationContext: { existingSlugs: [], allowedInternalLinks: ['/kontakt'] },
    admin: { id: 7, username: 'Content-Agent' }
  });

  assert.deepEqual(result, { id: 71, status: 'draft' });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].snapshot.base.live_hash, baseLiveHash);
  assert.equal(persisted[0].snapshot.base.slug, staticPost.slug);
  assert.equal(persisted[0].snapshot.base.content_format, 'static_html');
  assert.equal(persisted[0].snapshot.fields.content, fields.contentHtml);
  assert.equal(persisted[0].snapshot.fields.image_url, staticPost.image_url);
  assert.deepEqual(persisted[0].report.changes, diff.changes);
  assert.equal(persisted[0].report.revalidation.status, 'passed');
  assert.equal(persisted[0].report.revalidation.revisionVersion, 1);
  assert.equal(persisted[0].report.revalidation.score, 92);
  assert.equal(persisted[0].report.revalidation.minimumScore, 80);
  assert.match(persisted[0].report.revalidation.snapshotFingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(validationContexts[0].allowedInternalLinks, ['/kontakt']);
});

test('KI-Revisionsservice verwirft ungültige Providerfelder und einen veralteten Basishash vor dem Repository', async () => {
  const writes = [];
  const service = createContentRevisionService({
    optimizationRepository: {
      async createOptimizedRevision(input) { writes.push(input); }
    }
  });
  const validFields = {
    title: 'Titel', shortDescription: 'Kurzbeschreibung', metaTitle: 'Meta-Titel',
    metaDescription: 'Meta-Beschreibung', ogTitle: 'OG-Titel', ogDescription: 'OG-Beschreibung',
    contentHtml: post.content, faqJson: validFaq, imageAlt: 'Alt-Text',
    changeReasons: [{ field: 'metaTitle', auditCodes: [], reason: 'Präzisiert.', sourceUrls: [] }]
  };
  const base = {
    post,
    fields: validFields,
    auditId: 31,
    jobId: 44,
    diff: { changes: [] },
    report: { baseLiveHash: liveHashForPost(post) },
    admin: { id: 7, username: 'Content-Agent' }
  };

  await assert.rejects(service.createOptimizedRevision({
    ...base,
    fields: { ...validFields, slug: 'unerlaubt' },
    baseLiveHash: liveHashForPost(post)
  }), { code: 'CONTENT_REVISION_VALIDATION_FAILED' });
  await assert.rejects(service.createOptimizedRevision({
    ...base,
    baseLiveHash: 'b'.repeat(64)
  }), { code: 'CONTENT_REVISION_STALE' });
  assert.equal(writes.length, 0);
});

test('Revisionsvergleich wird ausschließlich über das begrenzte Vergleichs-Repository geladen', async () => {
  const calls = [];
  const revision = { id: 71, optimization_job_id: 44, snapshot_json: { fields: {} } };
  const service = createContentRevisionService({
    optimizationRepository: {
      async getRevisionComparison(revisionId) {
        calls.push(revisionId);
        return revision;
      }
    }
  });

  assert.deepEqual(await service.getRevisionComparison(71), revision);
  assert.deepEqual(calls, [71]);

  const missing = createContentRevisionService({
    optimizationRepository: { async getRevisionComparison() { return null; } }
  });
  await assert.rejects(
    missing.getRevisionComparison(71),
    { code: 'CONTENT_REVISION_NOT_FOUND' }
  );
});

test('Vergleichspräsentation bereinigt Vorschau-HTML und begrenzt ausschließlich sichere Diffdaten', () => {
  assert.equal(typeof adminPresentation.buildRevisionComparisonPresentation, 'function');
  const validId = 'a'.repeat(64);
  const invalidChanges = Array.from({ length: 55 }, (_, index) => ({
    id: index === 0 ? validId : `${index}`.repeat(64).slice(0, 64),
    kind: index % 2 ? 'html' : 'field',
    field: index % 2 ? 'contentHtml' : 'metaTitle',
    changeType: index % 3 === 0 ? 'added' : index % 3 === 1 ? 'removed' : 'modified',
    before: `<script>alt-${index}</script>${'A'.repeat(900)}`,
    after: `<img src=x onerror=alert(${index})>${'N'.repeat(900)}`,
    reasons: [{
      reason: `<script>grund-${index}</script>${'R'.repeat(900)}`,
      auditCodes: ['meta_title_missing', '<script>'],
      sourceUrls: ['https://example.com/sicher', 'https://user:pass@example.com/geheim']
    }],
    status: 'active',
    revertible: true
  }));
  invalidChanges.push({
    id: 'nicht-sicher', field: 'metaTitle', kind: 'field', changeType: 'modified',
    before: 'Alt', after: 'Neu', status: 'active', revertible: true
  });

  const comparison = adminPresentation.buildRevisionComparisonPresentation({
    id: 71,
    revision_version: 3,
    live_title: '<script>Live</script>',
    live_content: '<h2>Live</h2><script>window.live=true</script><p>Alt.</p>',
    live_excerpt: 'Bestehende Kurzbeschreibung',
    live_meta_title: 'Bestehender Meta Title',
    live_meta_description: 'Bestehende Meta Description',
    live_og_title: 'Bestehender OG-Titel',
    live_og_description: 'Bestehende OG-Beschreibung',
    live_faq_json: validFaq,
    live_image_alt: 'Bestehender Alt-Text',
    snapshot_json: {
      fields: {
        title: '<img src=x onerror=alert(1)>Optimiert',
        content: '<h2>Optimiert</h2><script>window.optimiert=true</script><p>Neu.</p>',
        excerpt: 'Optimierte Kurzbeschreibung',
        meta_title: 'Optimierter Meta Title',
        meta_description: 'Optimierte Meta Description',
        og_title: 'Optimierter OG-Titel',
        og_description: 'Optimierte OG-Beschreibung',
        faq_json: validFaq,
        image_alt: 'Optimierter Alt-Text'
      }
    },
    optimization_report_json: {
      afterScore: 92,
      changes: invalidChanges,
      sources: [
        { title: 'Aktuelle Fachquelle', url: 'https://example.com/fachquelle' },
        { title: 'Mit Zugangsdaten', url: 'https://user:pass@example.com/geheim' },
        { title: 'Unsicher', url: 'http://example.com/unsicher' }
      ],
      gscSignals: Array.from({ length: 18 }, (_, index) => ({
        query: `${index}: ${'Suchanfrage '.repeat(40)}`,
        clicks: index,
        impressions: index * 10,
        ctr: 0.1,
        average_position: 7.5
      })),
      providerResponse: { secret: 'sk-darf-nicht-in-das-Modell' },
      stage_results_json: [{ secret: true }]
    }
  });

  assert.equal(comparison.revisionId, 71);
  assert.equal(comparison.qualityScore, 92);
  assert.doesNotMatch(comparison.live.contentHtml, /script|window\.live/i);
  assert.doesNotMatch(comparison.optimized.contentHtml, /script|window\.optimiert|onerror/i);
  assert.equal(comparison.changes.length, 40);
  assert.equal(comparison.changes.every(({ id }) => /^[0-9a-f]{64}$/.test(id)), true);
  assert.equal(comparison.changes[0].id, validId);
  assert.equal(comparison.changes[0].beforeExcerpt.length <= 600, true);
  assert.equal(comparison.changes[0].afterExcerpt.length <= 600, true);
  assert.equal(comparison.changes[0].reason.length <= 500, true);
  assert.deepEqual(comparison.changeGroups.map(({ key }) => [
    'metadata', 'content', 'faq', 'images', 'links'
  ].includes(key)), [true, true, true, true, true]);
  assert.equal(comparison.sources.length, 1);
  assert.equal(comparison.sources[0].url, 'https://example.com/fachquelle');
  assert.equal(comparison.gscSignals.length, 10);
  assert.equal(comparison.gscSignals.every(({ query }) => query.length <= 180), true);
  assert.equal(comparison.providerResponse, undefined);
  assert.equal(comparison.stage_results_json, undefined);

  const withoutScore = adminPresentation.buildRevisionComparisonPresentation({
    id: 72,
    revision_version: 1,
    snapshot_json: { fields: {} },
    optimization_report_json: { afterScore: null, beforeScore: null, changes: [] }
  });
  assert.equal(withoutScore.qualityScore, null);
  assert.equal(withoutScore.beforeQualityScore, null);
});

test('Vergleichspräsentation überspringt ungültige Änderungen vor dem separaten Ausgabelimit', () => {
  const validChanges = Array.from({ length: 41 }, (_, index) => ({
    id: index.toString(16).padStart(64, '0'),
    field: 'metaTitle',
    changeType: 'modified',
    before: `Alt ${index}`,
    after: `Neu ${index}`,
    status: 'active',
    revertible: true
  }));

  const comparison = adminPresentation.buildRevisionComparisonPresentation({
    id: 73,
    revision_version: 1,
    snapshot_json: { fields: {} },
    optimization_report_json: {
      changes: [null, 'kein Objekt', { id: 'ungültig' }, ...validChanges]
    }
  });

  assert.equal(comparison.changes.length, 40);
  assert.equal(comparison.changes[0].id, validChanges[0].id);
  assert.equal(comparison.changes.at(-1).id, validChanges[39].id);
});

test('Vergleichspräsentation gibt die Übernahme nur ohne Risiken und blockierende Prüfbefunde frei', () => {
  const currentSnapshot = { fields: {} };
  const currentReview = {
    passed: true,
    score: 92,
    requiresManualReview: false,
    risks: { legal: false, privacy: false },
    issues: []
  };
  const baseRevision = {
    id: 74,
    status: 'draft',
    revision_version: 2,
    snapshot_json: currentSnapshot,
    optimization_report_json: {
      beforeScore: 80,
      targetedScope: { passed: true },
      validation: { passed: true },
      review: {
        passed: true,
        score: 92,
        requiresManualReview: false,
        risks: { legal: false, privacy: false },
        issues: []
      },
      revalidation: {
        status: 'passed',
        revisionVersion: 2,
        snapshotFingerprint: snapshotFingerprint(currentSnapshot),
        review: currentReview,
        score: 92,
        minimumScore: 80,
        unresolvedAuditCodes: []
      },
      changes: []
    }
  };
  const safe = adminPresentation.buildRevisionComparisonPresentation(baseRevision);
  assert.equal(safe.approvalEnabled, true);

  const risky = structuredClone(baseRevision);
  risky.optimization_report_json.revalidation.review.risks.legal = true;
  assert.equal(
    adminPresentation.buildRevisionComparisonPresentation(risky).approvalEnabled,
    false
  );
  const blocked = structuredClone(baseRevision);
  blocked.optimization_report_json.revalidation.review.issues.push({ blocking: true });
  assert.equal(
    adminPresentation.buildRevisionComparisonPresentation(blocked).approvalEnabled,
    false
  );
});

test('einzelne Rücknahme prüft Revisionsversion, Change-ID und den vollständigen Snapshot', async () => {
  const staticPost = {
    ...post,
    content_format: 'static_html',
    content: '<p>Bestehender Inhalt.</p>',
    image_url: '/uploads/bild.webp'
  };
  const snapshot = createRevisionSnapshot(staticPost);
  snapshot.fields.meta_title = 'Optimierter Meta-Titel';
  const report = {
    ...buildExistingPostDiff({
      before: { metaTitle: staticPost.meta_title },
      after: { metaTitle: snapshot.fields.meta_title }
    }),
    baseLiveHash: snapshot.base.live_hash,
    beforeScore: 72,
    afterScore: 91,
    targetedScope: { passed: true },
    validation: { passed: true },
    review: { approved: true, score: 91 }
  };
  const changeId = report.changes[0].id;
  let received;
  let validationCalls = 0;
  const service = createContentRevisionService({
    optimizationRepository: {
      async updateRevisionAfterRevert(input) {
        received = input;
        const reverted = structuredClone(snapshot);
        reverted.fields.meta_title = staticPost.meta_title;
        await input.validateSnapshot(reverted, { post: staticPost, report });
        const nextReport = structuredClone(report);
        nextReport.changes[0].status = 'reverted';
        return {
          id: 71,
          status: 'draft',
          revision_version: 4,
          snapshot_json: reverted,
          optimization_report_json: nextReport
        };
      }
    },
    validateArticle: async (article) => {
      validationCalls += 1;
      return { passed: true, sanitizedHtml: article.contentHtml, issues: [] };
    }
  });

  const result = await service.revertOptimizationChange({
    revisionId: 71,
    changeId,
    expectedVersion: 3,
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(result.revision_version, 4);
  assert.equal(result.optimization_report_json.changes[0].status, 'reverted');
  assert.equal(received.revisionId, 71);
  assert.equal(received.expectedVersion, 3);
  assert.equal(received.changeId, changeId);
  assert.equal(typeof received.validateSnapshot, 'function');
  assert.equal(validationCalls, 1);
});

test('Rücknahme verwirft nicht kanonische PostgreSQL-IDs, Versionen und Change-IDs vor dem Repository', async () => {
  let writes = 0;
  const service = createContentRevisionService({
    optimizationRepository: {
      async updateRevisionAfterRevert() { writes += 1; }
    }
  });
  const validChangeId = 'b'.repeat(64);
  for (const input of [
    { revisionId: 2_147_483_648, changeId: validChangeId, expectedVersion: 3 },
    { revisionId: 71, changeId: validChangeId, expectedVersion: 2_147_483_648 },
    { revisionId: 71, changeId: ` ${validChangeId}`, expectedVersion: 3 },
    { revisionId: 71, changeId: 'B'.repeat(64), expectedVersion: 3 },
    { revisionId: 71, changeId: 'b'.repeat(63), expectedVersion: 3 }
  ]) {
    await assert.rejects(service.revertOptimizationChange({
      ...input,
      admin: { id: 7, username: 'Admin' }
    }), { code: 'CONTENT_ACTION_VALIDATION_FAILED' });
  }
  assert.equal(writes, 0);
});

test('fehlgeschlagene Revalidierung wird vor einer Rücknahmespeicherung weitergereicht', async () => {
  const staticPost = {
    ...post,
    content_format: 'static_html',
    image_url: '/uploads/bild.webp'
  };
  const snapshot = createRevisionSnapshot(staticPost);
  let persisted = false;
  const service = createContentRevisionService({
    optimizationRepository: {
      async updateRevisionAfterRevert(input) {
        await input.validateSnapshot(snapshot, {
          post: staticPost,
          report: {
            beforeScore: 80,
            afterScore: 90,
            targetedScope: { passed: true },
            validation: { passed: true },
            review: { approved: true, score: 90 }
          }
        });
        persisted = true;
      }
    },
    validateArticle: async () => ({
      passed: false,
      sanitizedHtml: staticPost.content,
      issues: [{ code: 'invalid_snapshot' }]
    })
  });

  await assert.rejects(service.revertOptimizationChange({
    revisionId: 71,
    changeId: 'c'.repeat(64),
    expectedVersion: 2,
    admin: { id: 7, username: 'Admin' }
  }), { code: 'CONTENT_REVISION_VALIDATION_FAILED' });
  assert.equal(persisted, false);
});

test('Ablehnung benötigt Bestätigung und delegiert ausschließlich die aktuelle Draftversion', async () => {
  const calls = [];
  const service = createContentRevisionService({
    optimizationRepository: {
      async rejectRevision(input) {
        calls.push(input);
        return { id: 71, status: 'rejected', revision_version: 4 };
      }
    }
  });

  await assert.rejects(service.rejectOptimizationRevision({
    revisionId: 71,
    expectedVersion: 3,
    confirmed: false,
    admin: { id: 7, username: 'Admin' }
  }), { code: 'CONTENT_CONFIRMATION_REQUIRED' });
  assert.equal(calls.length, 0);

  const result = await service.rejectOptimizationRevision({
    revisionId: 71,
    expectedVersion: 3,
    confirmed: true,
    admin: { id: 7, username: 'Admin' }
  });
  assert.equal(result.status, 'rejected');
  assert.deepEqual(calls[0], {
    revisionId: 71,
    expectedVersion: 3,
    admin: { id: 7, username: 'Admin' }
  });
});

test('manuelle Bearbeitung einer KI-Revision verwendet den atomaren Feedbackpfad statt des allgemeinen Updates', async () => {
  const snapshot = createRevisionSnapshot(post);
  const revision = {
    id: 71,
    post_id: 7,
    status: 'draft',
    revision_version: 3,
    optimization_job_id: 44,
    snapshot_json: snapshot,
    optimization_report_json: { baseLiveHash: snapshot.base.live_hash, changes: [] },
    validation_context: {}
  };
  let genericWrites = 0;
  let optimizationInput;
  const service = createContentRevisionService({
    repository: {
      async getRevisionForEdit() { return revision; },
      async updateDraftRevision() { genericWrites += 1; }
    },
    optimizationRepository: {
      async updateRevisionAfterManualEdit(input) {
        optimizationInput = input;
        const next = await input.buildValidatedUpdate(structuredClone(snapshot), {
          post,
          report: structuredClone(revision.optimization_report_json),
          validationContext: {}
        });
        return { ...revision, revision_version: 4, snapshot_json: next };
      }
    }
  });

  const result = await service.updateRevision({
    revisionId: 71,
    input: { revision_version: '3', meta_title: 'Manuell abgestimmter Meta-Titel' },
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(result.revision_version, 4);
  assert.equal(result.snapshot_json.fields.meta_title, 'Manuell abgestimmter Meta-Titel');
  assert.equal(optimizationInput.revisionId, 71);
  assert.equal(optimizationInput.expectedVersion, 3);
  assert.equal(typeof optimizationInput.buildValidatedUpdate, 'function');
  assert.equal(genericWrites, 0);
});

test('Übernahme einer KI-Revision speichert akzeptiertes Feedback innerhalb der Freigabetransaktion', async () => {
  const transaction = { query: async () => ({ rows: [] }) };
  const revisionSnapshot = createRevisionSnapshot(post);
  const currentReview = {
    passed: true,
    score: 92,
    requiresManualReview: false,
    risks: { legal: false },
    issues: []
  };
  let acceptedInput;
  const service = createContentRevisionService({
    repository: {
      async approveRevisionTransaction(input) {
        await input.afterApproval({
          revision: {
            id: 71, post_id: 7, optimization_job_id: 44,
            status: 'draft',
            snapshot_json: revisionSnapshot,
            optimization_report_json: {
              beforeScore: 80,
              targetedScope: { passed: true },
              validation: { passed: true },
              review: {
                passed: true,
                score: 92,
                requiresManualReview: false,
                risks: { legal: false },
                issues: []
              },
              revalidation: {
                status: 'passed',
                revisionVersion: 3,
                snapshotFingerprint: snapshotFingerprint(revisionSnapshot),
                review: currentReview,
                score: 92,
                minimumScore: 80,
                unresolvedAuditCodes: []
              },
              changes: []
            },
            revision_version: 3
          },
          post
        }, transaction);
        return { post, revisionId: 71 };
      }
    },
    optimizationRepository: {
      async recordAcceptedRevisionFeedback(input, client) {
        acceptedInput = { input, client };
      }
    }
  });

  await service.approveRevision({
    revisionId: 71,
    expectedVersion: 3,
    confirmed: true,
    admin: { id: 7, username: 'Admin' }
  });

  assert.equal(acceptedInput.client, transaction);
  assert.equal(acceptedInput.input.revisionId, 71);
  assert.equal(acceptedInput.input.expectedVersion, 3);
  assert.deepEqual(acceptedInput.input.admin, { id: 7, username: 'Admin' });
});

test('Übernahme einer KI-Revision scheitert serverseitig bei Risiken oder fehlgeschlagener Revalidierung', async () => {
  let feedbackWrites = 0;
  const service = createContentRevisionService({
    repository: {
      async approveRevisionTransaction(input) {
        await input.afterApproval({
          revision: {
            id: 71,
            post_id: 7,
            optimization_job_id: 44,
            optimization_report_json: {
              targetedScope: { passed: true },
              validation: { passed: true },
              review: {
                passed: true,
                score: 92,
                requiresManualReview: false,
                risks: { legal: true },
                issues: []
              },
              revalidation: { status: 'failed' },
              changes: []
            }
          }
        }, { query: async () => ({ rows: [] }) });
      }
    },
    optimizationRepository: {
      async recordAcceptedRevisionFeedback() { feedbackWrites += 1; }
    }
  });

  await assert.rejects(service.approveRevision({
    revisionId: 71,
    expectedVersion: 3,
    confirmed: true,
    admin: { id: 7, username: 'Admin' }
  }), { code: 'CONTENT_REVISION_VALIDATION_FAILED' });
  assert.equal(feedbackWrites, 0);
});
