import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentPublishEventRepository } from '../repositories/contentPublishEventRepository.js';
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

test('Repository sperrt den persistierten Post und bindet Metadata und Slugkontext an dieselbe Transaktion', async () => {
  const client = sqlClient([
    { rows: [{ id: 9, metadata: { quality_score: 92 } }] },
    { rows: [{ slug: 'anderer-entwurf' }] }
  ]);
  const repository = createContentPublishEventRepository();

  const draft = await repository.getDraftWithMetadataForUpdate(9, client);
  const context = await repository.getValidationContext(9, draft, client);

  assert.equal(draft.post.id, 9);
  assert.match(client.calls[0].sql, /FROM posts p JOIN content_post_metadata m ON m\.post_id = p\.id/i);
  assert.match(client.calls[0].sql, /WHERE p\.id = \$1/i);
  assert.match(client.calls[0].sql, /FOR UPDATE OF p/i);
  assert.deepEqual(client.calls[0].params, [9]);
  assert.match(client.calls[1].sql, /WHERE id <> \$1/i);
  assert.deepEqual(context.existingSlugs, ['anderer-entwurf']);
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
    metadata: { quality_score: 92, quality_report_json: { risks: {}, focusedReview: { blocked: false, items: [], riskFlags: [] } } },
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
    async getValidationContext() { return { existingSlugs: [], allowedInternalLinks: [], sourceReferences: [] }; },
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
