import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLearningRuleSnapshot,
  learningRulesForStage,
  validateLearningRuleSnapshot
} from '../services/contentAgent/contentLearningSnapshotService.js';

const rules = [
  {
    id: 7,
    version: 3,
    category_key: 'technical_precision',
    rule_text: 'Erkläre technische Zusammenhänge so konkret, dass Unternehmer die nächste Entscheidung nachvollziehbar treffen können.',
    target_stages: ['reviewer', 'writer']
  },
  {
    id: 2,
    version: 1,
    category_key: 'cta_repetition_or_fit',
    rule_text: 'Formuliere jeden CTA passend zum konkreten Entscheidungsschritt und vermeide inhaltlich gleiche Kontaktaufforderungen.',
    target_stages: ['seo_brief', 'writer', 'reviewer']
  }
];

test('Lernregelsnapshot ist kanonisch sortiert, einzeln gehasht und unveränderlich', () => {
  const snapshot = buildLearningRuleSnapshot(rules);
  assert.deepEqual(snapshot.rules.map(({ id, version }) => [id, version]), [[2, 1], [7, 3]]);
  assert.match(snapshot.hash, /^[0-9a-f]{64}$/);
  assert.equal(snapshot.rules.every(({ hash }) => /^[0-9a-f]{64}$/.test(hash)), true);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.rules), true);
  assert.equal(validateLearningRuleSnapshot(structuredClone(snapshot)).valid, true);
});

test('Stufenfilter gibt nur freigegebene Promptfelder und optionale Kategorien zurück', () => {
  const snapshot = buildLearningRuleSnapshot(rules);
  assert.deepEqual(
    learningRulesForStage(snapshot, 'writer').map(({ id, version }) => [id, version]),
    [[2, 1], [7, 3]]
  );
  assert.deepEqual(learningRulesForStage(snapshot, 'seo_brief'), [{
    id: 2,
    version: 1,
    categoryKey: 'cta_repetition_or_fit',
    instruction: rules[1].rule_text
  }]);
  assert.deepEqual(
    learningRulesForStage(snapshot, 'reviewer', ['technical_precision']).map(({ id }) => id),
    [7]
  );
});

test('Manipulationen an Text, Reihenfolge, Regelhash oder Listenhash werden erkannt', () => {
  const snapshot = buildLearningRuleSnapshot(rules);
  const mutations = [
    (value) => { value.rules[0].instruction += ' Manipuliert.'; },
    (value) => { value.rules.reverse(); },
    (value) => { value.rules[0].hash = '0'.repeat(64); },
    (value) => { value.hash = 'f'.repeat(64); },
    (value) => { value.rules[0].targetStages.push('unbekannt'); }
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(snapshot);
    mutate(changed);
    assert.equal(validateLearningRuleSnapshot(changed).valid, false);
  }
});

test('Snapshotgrenzen blockieren zu viele, doppelte und unsichere Regeln', () => {
  assert.throws(
    () => buildLearningRuleSnapshot(Array.from({ length: 51 }, (_, index) => ({
      ...rules[0], id: index + 1
    }))),
    /höchstens 50/i
  );
  assert.throws(() => buildLearningRuleSnapshot([rules[0], rules[0]]), /doppelt/i);
  assert.throws(
    () => buildLearningRuleSnapshot([{ ...rules[0], rule_text: '<script>alert(1)</script>' }]),
    { code: 'CONTENT_LEARNING_RULE_TEXT_INVALID' }
  );
});
