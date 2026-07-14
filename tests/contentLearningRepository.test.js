import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentLearningRepository } from '../repositories/contentLearningRepository.js';

const fingerprint = (digit) => String(digit).repeat(64);

function observation(categoryKey = 'cta_repetition_or_fit', digit = 1) {
  return {
    categoryKey,
    fingerprint: fingerprint(digit),
    reason: 'Mehrere Kontaktaufforderungen wiederholen denselben Impuls.',
    instruction: 'Formuliere einen CTA passend zum konkreten Entscheidungsschritt.',
    section: 'Gesamter Artikel',
    anchor: 'pruefung-gesamter-artikel',
    classificationSource: 'local',
    confidence: 0.9,
    taxonomyVersion: 'content-learning-taxonomy-v1'
  };
}

function createStatefulDb() {
  const state = {
    observations: new Map(),
    proposals: [],
    events: [],
    transactions: []
  };
  const client = {
    async query(sql, params = []) {
      const compact = sql.replace(/\s+/g, ' ').trim();
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(compact)) {
        state.transactions.push(compact);
        return { rows: [] };
      }
      if (/pg_advisory_xact_lock/i.test(compact)) return { rows: [] };
      if (/INSERT INTO content_learning_observations/i.test(compact)) {
        const [postId, reviewVersion, categoryKey, issueFingerprint, reason, instruction,
          section, anchor, source, confidence, taxonomyVersion] = params;
        const key = categoryKey === 'unclassified'
          ? `${postId}:fingerprint:${issueFingerprint}`
          : `${postId}:category:${categoryKey}`;
        const row = {
          id: state.observations.get(key)?.id || state.observations.size + 1,
          post_id: postId,
          review_version: reviewVersion,
          category_key: categoryKey,
          fingerprint: issueFingerprint,
          reason,
          instruction,
          section_name: section,
          anchor,
          classification_source: source,
          confidence,
          taxonomy_version: taxonomyVersion
        };
        state.observations.set(key, row);
        return { rows: [row] };
      }
      if (/COUNT\(DISTINCT post_id\)/i.test(compact)) {
        const categoryKey = params[0];
        const posts = new Set([...state.observations.values()]
          .filter((row) => row.category_key === categoryKey)
          .map((row) => row.post_id));
        return { rows: [{ article_count: String(posts.size) }] };
      }
      if (/FROM content_learning_observations[\s\S]*ORDER BY last_seen_at/i.test(compact)) {
        return { rows: [...state.observations.values()].filter((row) => row.category_key === params[0]).slice(0, 5) };
      }
      if (/INSERT INTO content_learning_rule_proposals/i.test(compact)) {
        const categoryKey = params[0];
        if (state.proposals.some((proposal) => proposal.category_key === categoryKey)) return { rows: [] };
        const row = { id: state.proposals.length + 1, category_key: categoryKey, status: 'pending' };
        state.proposals.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO content_learning_events/i.test(compact)) {
        state.events.push({ categoryKey: params[0], proposalId: params[1] });
        return { rows: [] };
      }
      throw new Error(`Unerwartetes SQL im Test: ${compact}`);
    },
    release() {}
  };
  return {
    state,
    db: { async connect() { return client; } }
  };
}

test('drei unterschiedliche Artikel erzeugen genau einen Vorschlag', async () => {
  const harness = createStatefulDb();
  const repository = createContentLearningRepository(harness.db);
  const first = await repository.recordObservationsAndMaybeProposals({
    postId: 1, reviewVersion: 1, observations: [observation()]
  });
  const second = await repository.recordObservationsAndMaybeProposals({
    postId: 2, reviewVersion: 1, observations: [observation()]
  });
  const third = await repository.recordObservationsAndMaybeProposals({
    postId: 3, reviewVersion: 1, observations: [observation()]
  });
  assert.equal(first.proposals.length, 0);
  assert.equal(second.proposals.length, 0);
  assert.equal(third.proposals.length, 1);
  assert.equal(harness.state.proposals.length, 1);
  assert.equal(harness.state.events.length, 1);
});

test('mehrere Reviews desselben Artikels erhöhen die Vorschlagsschwelle nicht', async () => {
  const harness = createStatefulDb();
  const repository = createContentLearningRepository(harness.db);
  await repository.recordObservationsAndMaybeProposals({
    postId: 1, reviewVersion: 1, observations: [observation('generic_content', 2)]
  });
  await repository.recordObservationsAndMaybeProposals({
    postId: 1, reviewVersion: 4, observations: [observation('generic_content', 3)]
  });
  await repository.recordObservationsAndMaybeProposals({
    postId: 2, reviewVersion: 1, observations: [observation('generic_content', 4)]
  });
  assert.equal(harness.state.proposals.length, 0);
  assert.equal([...harness.state.observations.values()].filter((row) => row.category_key === 'generic_content').length, 2);
});

test('unbekannte Fingerabdrücke desselben Artikels bleiben getrennt und erzeugen keinen Vorschlag', async () => {
  const harness = createStatefulDb();
  const repository = createContentLearningRepository(harness.db);
  const result = await repository.recordObservationsAndMaybeProposals({
    postId: 9,
    reviewVersion: 2,
    observations: [
      observation('unclassified', 5),
      observation('unclassified', 6)
    ]
  });
  assert.equal(result.observations.length, 2);
  assert.equal(result.proposals.length, 0);
  assert.equal(harness.state.observations.size, 2);
});

test('Repository lehnt ungültige IDs, Kategorien und Fingerabdrücke vor der Transaktion ab', async () => {
  const harness = createStatefulDb();
  const repository = createContentLearningRepository(harness.db);
  await assert.rejects(
    repository.recordObservationsAndMaybeProposals({ postId: 0, reviewVersion: 1, observations: [observation()] }),
    { code: 'CONTENT_LEARNING_INPUT_INVALID' }
  );
  await assert.rejects(
    repository.recordObservationsAndMaybeProposals({
      postId: 1,
      reviewVersion: 1,
      observations: [{ ...observation(), categoryKey: 'freie_kategorie' }]
    }),
    { code: 'CONTENT_LEARNING_INPUT_INVALID' }
  );
  await assert.rejects(
    repository.recordObservationsAndMaybeProposals({
      postId: 1,
      reviewVersion: 1,
      observations: [{ ...observation(), fingerprint: 'kurz' }]
    }),
    { code: 'CONTENT_LEARNING_INPUT_INVALID' }
  );
  assert.deepEqual(harness.state.transactions, []);
});

test('Transaktionsfehler führen zu Rollback und Freigabe des Clients', async () => {
  const calls = [];
  let released = false;
  const repository = createContentLearningRepository({
    async connect() {
      return {
        async query(sql) {
          calls.push(sql.trim());
          if (/INSERT INTO content_learning_observations/i.test(sql)) throw new Error('Datenbankfehler');
          return { rows: [] };
        },
        release() { released = true; }
      };
    }
  });
  await assert.rejects(repository.recordObservationsAndMaybeProposals({
    postId: 1, reviewVersion: 1, observations: [observation()]
  }), /Datenbankfehler/);
  assert.equal(calls[0], 'BEGIN');
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(released, true);
});
