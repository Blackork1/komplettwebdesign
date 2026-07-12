import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentPublishEventRepository } from '../repositories/contentPublishEventRepository.js';
import { enqueueApprovedPublicationJob } from '../repositories/contentJobRepository.js';
import { createContentPublicationService } from '../services/contentAgent/contentPublicationService.js';

const admin = { id: 7, username: 'redaktion' };

function sqlClient(results = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return results.shift() || { rows: [] };
    }
  };
}

function publicationReadClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (/^LOCK TABLE posts/i.test(normalized)) return { rows: [] };
      if (/^SELECT p\.\*/i.test(normalized)) {
        return { rows: [{ id: 9, metadata: { quality_score: 92 } }] };
      }
      if (/^SELECT slug FROM posts/i.test(normalized)) {
        return { rows: [{ slug: 'anderer-entwurf' }] };
      }
      return { rows: [] };
    }
  };
}

test('Repository sperrt den persistierten Post und bindet Metadata und Slugkontext an dieselbe Transaktion', async () => {
  const client = publicationReadClient();
  const repository = createContentPublishEventRepository();

  const draft = await repository.getDraftWithMetadataForUpdate(9, client);
  const context = await repository.getValidationContext(9, draft, client);

  assert.equal(draft.post.id, 9);
  assert.equal(client.calls[0].sql, 'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
  assert.match(client.calls[1].sql, /FROM posts p JOIN content_post_metadata m ON m\.post_id = p\.id/i);
  assert.match(client.calls[1].sql, /WHERE p\.id = \$1/i);
  assert.match(client.calls[1].sql, /FOR UPDATE OF p/i);
  assert.deepEqual(client.calls[1].params, [9]);
  assert.match(client.calls[2].sql, /WHERE id <> \$1/i);
  assert.deepEqual(context.existingSlugs, ['anderer-entwurf']);
  assert.deepEqual(context.allowedInternalLinks, undefined);
});

test('Publikation verwendet dieselbe globale Lock-Reihenfolge wie der Drafteditor', async () => {
  const client = publicationReadClient();
  const repository = createContentPublishEventRepository();

  const draft = await repository.getDraftWithMetadataForUpdate(9, client);
  await repository.getValidationContext(9, draft, client);

  assert.deepEqual(client.calls.slice(0, 3).map(({ sql }) => sql), [
    'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE',
    client.calls[1].sql,
    'SELECT slug FROM posts WHERE id <> $1 ORDER BY id'
  ]);
  assert.match(client.calls[1].sql, /FOR UPDATE OF p$/i);
});

test('manuelles Event ist per Partial-Unique-Insert genau einmal anlegbar und enthält keine Rohinhalte', async () => {
  const client = sqlClient([{ rows: [{ id: 31, decision: 'manual' }] }]);
  const repository = createContentPublishEventRepository();

  await repository.insertManualEvent({
    postId: 9,
    runId: 21,
    qualityScore: 92,
    admin
  }, client);

  const call = client.calls[0];
  assert.match(call.sql, /INSERT INTO content_publish_events/i);
  assert.match(call.sql, /'manual', 'manual-v1'/i);
  assert.match(call.sql, /ON CONFLICT \(post_id\) WHERE decision = 'manual' DO NOTHING/i);
  assert.deepEqual(call.params, [9, 21, 92, 7, 'redaktion']);
  assert.doesNotMatch(JSON.stringify(call.params), /contentHtml|api[_-]?key|<section/i);
});

test('Auto-Event ist pro Run und Policy idempotent und enthält nur begrenzten Entscheidungskontext', async () => {
  const client = sqlClient([{ rows: [{ id: 41, decision: 'blocked' }] }]);
  const repository = createContentPublishEventRepository();

  await repository.insertAutoEvent({
    postId: 9,
    runId: 21,
    decision: 'blocked',
    policyVersion: 'auto-v1',
    qualityScore: 94,
    reasons: ['forced_review'],
    context: { action: 'auto_publish_policy', settingsVersion: 3 }
  }, client);

  const call = client.calls[0];
  assert.match(call.sql, /INSERT INTO content_publish_events/i);
  assert.match(call.sql, /ON CONFLICT \(run_id, policy_version\)[\s\S]*decision IN \('allowed', 'blocked'\)/i);
  assert.deepEqual(call.params, [
    9, 21, 'blocked', 'auto-v1', 94,
    JSON.stringify(['forced_review']),
    JSON.stringify({ action: 'auto_publish_policy', settingsVersion: 3 })
  ]);
});

test('Auto-Event-Recovery liest exakt dieselbe Run- und Policyidentität', async () => {
  const client = sqlClient([{ rows: [{ id: 41, decision: 'allowed' }] }]);
  const repository = createContentPublishEventRepository();

  const event = await repository.getAutoEvent({ runId: 21, policyVersion: 'auto-v1' }, client);

  assert.equal(event.id, 41);
  assert.match(client.calls[0].sql, /WHERE run_id = \$1 AND policy_version = \$2/i);
  assert.deepEqual(client.calls[0].params, [21, 'auto-v1']);
});

test('Freigabezähler wird ausschließlich durch den atomaren Incrementpfad erhöht', async () => {
  const client = sqlClient([{ rows: [{ id: 1, manual_approvals_count: 8 }] }]);
  const repository = createContentPublishEventRepository();

  const settings = await repository.incrementManualApprovals(client);

  assert.equal(settings.manual_approvals_count, 8);
  assert.match(client.calls[0].sql, /UPDATE content_agent_settings/i);
  assert.match(client.calls[0].sql, /manual_approvals_count = manual_approvals_count \+ 1/i);
  assert.match(client.calls[0].sql, /WHERE id = 1/i);
  assert.doesNotMatch(client.calls[0].sql, /auto_publish/i);
});

test('geplante Freigabe und Veröffentlichung verwenden enge Versions-Compare-and-Set-Updates', async () => {
  const client = sqlClient([
    { rows: [{ id: 9, workflow_status: 'approved_scheduled' }] },
    { rows: [{ id: 9, workflow_status: 'published', publication_version: 2 }] }
  ]);
  const repository = createContentPublishEventRepository();
  const scheduledAt = new Date('2026-07-13T16:00:00.000Z');

  await repository.approveDraftForSchedule({
    postId: 9,
    scheduledAt,
    reviewVersion: 2,
    publicationVersion: 1,
    adminId: 7
  }, client);
  await repository.publishApprovedDraft({
    postId: 9,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt
  }, client);

  assert.match(client.calls[0].sql, /workflow_status = 'approved_scheduled'/i);
  assert.match(client.calls[0].sql, /approved_review_version = review_version/i);
  assert.match(client.calls[0].sql, /workflow_status = 'needs_review'/i);
  assert.match(client.calls[0].sql, /review_version = \$3/i);
  assert.match(client.calls[0].sql, /publication_version = \$4/i);
  assert.match(client.calls[0].sql, /\$2 > NOW\(\)/i);
  assert.match(client.calls[0].sql, /\$2 > clock_timestamp\(\)/i);
  assert.deepEqual(client.calls[0].params, [9, scheduledAt, 2, 1, 7, false]);

  assert.match(client.calls[1].sql, /workflow_status = 'published'/i);
  assert.match(client.calls[1].sql, /publication_version = publication_version \+ 1/i);
  assert.match(client.calls[1].sql, /approved_review_version = \$2/i);
  assert.match(client.calls[1].sql, /review_version = \$2/i);
  assert.match(client.calls[1].sql, /publication_version = \$3/i);
  assert.match(client.calls[1].sql, /scheduled_at = \$4/i);
  assert.match(client.calls[1].sql, /scheduled_at <= NOW\(\)/i);
});

test('initialer Approval-CAS meldet einen nach der Vorprüfung abgelaufenen Termin eindeutig', async () => {
  const databaseNow = new Date('2026-07-13T16:00:00.001Z');
  const client = sqlClient([{ rows: [{ approval_database_now: databaseNow }] }]);
  const repository = createContentPublishEventRepository();

  const result = await repository.approveDraftForSchedule({
    postId: 9,
    scheduledAt: new Date('2026-07-13T16:00:00.000Z'),
    reviewVersion: 2,
    publicationVersion: 1,
    adminId: 7
  }, client);

  assert.deepEqual(result, { post: null, scheduleExpired: true });
  assert.match(client.calls[0].sql, /\$2 > NOW\(\)/i);
  assert.match(client.calls[0].sql, /clock_timestamp\(\)/i);
});

test('geplantes manuelles Publish-Event bindet Freigabe- und Publikationsversion unveränderlich', async () => {
  const client = sqlClient([{ rows: [{ id: 33, decision: 'manual' }] }]);
  const repository = createContentPublishEventRepository();

  await repository.insertScheduledManualEvent({
    postId: 9,
    runId: 21,
    qualityScore: 92,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: new Date('2026-07-13T16:00:00.000Z'),
    admin
  }, client);

  const call = client.calls[0];
  assert.match(call.sql, /'manual', 'manual-scheduled-v1'/i);
  assert.match(call.sql, /ON CONFLICT \(post_id\) WHERE decision = 'manual' DO NOTHING/i);
  assert.deepEqual(JSON.parse(call.params[3]), {
    action: 'scheduled_manual_publish',
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: '2026-07-13T16:00:00.000Z'
  });
  assert.doesNotMatch(JSON.stringify(call.params), /contentHtml|api[_-]?key|<section/i);
});

test('Publish-Job ist über Post und Versionen dedupliziert und exakt zum Slot fällig', async () => {
  const scheduledAt = new Date('2026-07-13T16:00:00.000Z');
  const row = { id: 71, job_type: 'publish_approved_post', run_after: scheduledAt };
  const db = sqlClient([{ rows: [row] }, { rows: [row] }]);
  const input = {
    postId: 9,
    approvalVersion: 2,
    publicationVersion: 1,
    runAfter: scheduledAt
  };

  assert.equal(await enqueueApprovedPublicationJob(input, db), row);
  assert.equal(await enqueueApprovedPublicationJob(input, db), row);

  assert.equal(db.calls[0].params[0], 'publish_approved_post');
  assert.equal(db.calls[0].params[1], 'publish-approved:9:2:1:1783958400000');
  assert.deepEqual(db.calls[0].params[2], {
    postId: 9,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: '2026-07-13T16:00:00.000Z'
  });
  assert.equal(db.calls[0].params[3], scheduledAt);
  assert.equal(db.calls[1].params[1], db.calls[0].params[1]);
  assert.match(db.calls[0].sql, /ON CONFLICT \(idempotency_key\)/i);
});

test('Statusupdates sind enge Compare-and-Set-Operationen und verwenden nie reviewed_by', async () => {
  const client = sqlClient([
    { rows: [{ id: 9, published: true, workflow_status: 'published' }] },
    { rows: [{ id: 10, published: false, workflow_status: 'rejected' }] }
  ]);
  const repository = createContentPublishEventRepository();

  await repository.publishDraft(9, client);
  await repository.rejectDraft(10, client);

  for (const call of client.calls) {
    assert.match(call.sql, /generated_by_ai = TRUE/i);
    assert.match(call.sql, /published = FALSE/i);
    assert.match(call.sql, /workflow_status = 'needs_review'/i);
    assert.match(call.sql, /content_format = 'static_html'/i);
    assert.doesNotMatch(call.sql, /reviewed_by/i);
  }
  assert.match(client.calls[0].sql, /published_at = NOW\(\)/i);
  assert.match(client.calls[1].sql, /workflow_status = 'rejected'/i);
  assert.match(client.calls[1].sql, /published_at = NULL/i);
});

test('Ablehnung verwendet ein nichtzählendes blocked-Event mit gebundenem sicherem Kontext', async () => {
  const client = sqlClient([{ rows: [{ id: 32, decision: 'blocked' }] }]);
  const repository = createContentPublishEventRepository();

  await repository.insertRejectionEvent({
    postId: 9,
    runId: 21,
    qualityScore: 72,
    admin,
    reason: 'Fachlich nicht passend'
  }, client);

  const call = client.calls[0];
  assert.match(call.sql, /'blocked', 'manual-reject-v1'/i);
  assert.doesNotMatch(call.sql, /'manual', 'manual-v1'/i);
  assert.deepEqual(JSON.parse(call.params[3]), {
    action: 'manual_rejection',
    reason: 'Fachlich nicht passend'
  });
  assert.doesNotMatch(JSON.stringify(call.params), /contentHtml|api[_-]?key|<section/i);
});

test('zwei parallele Doppel-Clicks erzeugen nur eine Veröffentlichung, ein Event und eine Zählung', async () => {
  const state = {
    post: {
      id: 9,
      title: 'Sicherer Entwurf',
      excerpt: 'Beschreibung',
      slug: 'sicherer-entwurf',
      content: '<section><h2>Inhalt</h2></section>',
      faq_json: Array.from({ length: 5 }, (_, index) => ({ question: `Frage ${index}`, answer: `Antwort ${index}` })),
      meta_title: 'Sicherer Meta Title mit passender Länge für Berlin',
      meta_description: 'Diese Meta Description erklärt kleinen Unternehmen verständlich und konkret den sicheren Inhalt dieses Blogartikels.',
      og_title: 'OG-Titel',
      og_description: 'OG-Beschreibung',
      image_url: 'https://example.test/bild.webp',
      image_alt: 'Beitragsbild',
      content_format: 'static_html',
      generated_by_ai: true,
      published: false,
      workflow_status: 'needs_review',
      generation_run_id: 21
    },
    metadata: {
      quality_score: 92,
      internal_links_json: [
        { url: '/kontakt', label: 'Kontakt', purpose: 'Beratung' },
        { url: '/pakete', label: 'Pakete', purpose: 'Angebot' }
      ],
      quality_report_json: {
        passed: true,
        score: 92,
        summary: 'Bestanden.',
        strengths: [],
        issues: [],
        recommendedActions: [],
        requiresManualReview: false,
        risks: {
          currentClaims: false,
          legalClaims: false,
          privacyClaims: false,
          softwareVersionClaims: false,
          staticPrices: false
        },
        focusedReview: { blocked: false, items: [], riskFlags: [], sourceCount: 0 }
      }
    },
    events: 0,
    approvals: 0
  };
  let tail = Promise.resolve();
  const releases = new Map();
  const db = {
    async connect() {
      const client = {
        async query(sql) {
          if (sql === 'BEGIN') return { rows: [] };
          if (sql === 'COMMIT' || sql === 'ROLLBACK') {
            releases.get(client)?.();
            return { rows: [] };
          }
          return { rows: [] };
        },
        release() {}
      };
      return client;
    }
  };
  const repository = {
    async getDraftWithMetadataForUpdate(_postId, client) {
      let unlock;
      const previous = tail;
      tail = new Promise((resolve) => { unlock = resolve; });
      await previous;
      releases.set(client, unlock);
      return { post: { ...state.post }, metadata: state.metadata };
    },
    async getValidationContext() { return { existingSlugs: [], allowedInternalLinks: state.metadata.internal_links_json, sourceReferences: [] }; },
    async publishDraft() {
      if (state.post.published || state.post.workflow_status !== 'needs_review') return null;
      state.post = { ...state.post, published: true, workflow_status: 'published' };
      return state.post;
    },
    async insertManualEvent() { state.events += 1; return { id: state.events }; },
    async incrementManualApprovals() { state.approvals += 1; return { manual_approvals_count: state.approvals }; },
    async getSettings() { return { manual_approvals_count: state.approvals }; }
  };
  const service = createContentPublicationService({
    db,
    repository,
    validateArticle: (article) => ({ passed: true, sanitizedHtml: article.contentHtml, issues: [] })
  });

  const outcomes = await Promise.allSettled([
    service.publishDraftManually({ postId: 9, admin, confirmed: true }),
    service.publishDraftManually({ postId: 9, admin, confirmed: true })
  ]);

  assert.deepEqual(outcomes.map(({ status }) => status).sort(), ['fulfilled', 'rejected']);
  assert.equal(outcomes.find(({ status }) => status === 'rejected').reason.code, 'CONTENT_DRAFT_NOT_PUBLISHABLE');
  assert.equal(state.events, 1);
  assert.equal(state.approvals, 1);
});
