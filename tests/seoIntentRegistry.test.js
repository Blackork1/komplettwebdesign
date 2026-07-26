import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEO_RECOVERY_REDIRECTS,
  SEO_RECOVERY_TARGETS,
  findActiveIntentCollisions,
  getSeoRecoveryTarget
} from '../data/seoIntentRegistry.js';

test('jede aktive SEO-Suchabsicht besitzt genau eine Zielseite', () => {
  assert.deepEqual(findActiveIntentCollisions(), []);
});

test('die doppelten Haupt- und Kostenseiten besitzen ein eindeutiges Ziel', () => {
  assert.equal(SEO_RECOVERY_REDIRECTS['/website-erstellen-lassen-berlin'], '/webdesign-berlin');
  assert.equal(
    SEO_RECOVERY_REDIRECTS['/blog/website-kosten-2026-berlin-vergleich-2025'],
    '/blog/website-kosten-2025-einfach-erklaert'
  );
});

test('priorisierte aktive Seiten verlangen mindestens zwei kontextuelle Links', () => {
  const active = SEO_RECOVERY_TARGETS.filter((entry) => entry.state === 'active');
  assert.ok(active.length >= 9);
  for (const entry of active) {
    assert.ok(entry.requiredLinks.length >= 2, `${entry.path} hat zu wenige Pflichtlinks`);
  }
});

test('die zentrale Berliner Seite ist Eigentümerin der kommerziellen Hauptabsicht', () => {
  assert.equal(
    getSeoRecoveryTarget('/webdesign-berlin')?.intentId,
    'website-erstellen-lassen-berlin'
  );
  assert.equal(getSeoRecoveryTarget('/webdesign-berlin')?.state, 'active');
});
