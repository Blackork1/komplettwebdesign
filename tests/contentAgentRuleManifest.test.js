import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTENT_AGENT_RULE_MANIFEST,
  CONTENT_AGENT_RULE_MANIFEST_HASH,
  MAX_RUNTIME_SNAPSHOT_BYTES,
  MAX_SNAPSHOT_INTERNAL_LINKS,
  bindContentRulesToSnapshot,
  canonicalJson,
  validateContentRuleSnapshot
} from '../services/contentAgent/contentRuleManifest.js';

test('Regelmanifest enthält alle prompt- und entscheidungsrelevanten Versionen mit stabilem Hash', () => {
  assert.deepEqual(Object.keys(CONTENT_AGENT_RULE_MANIFEST), [
    'articleRepairPrompt',
    'articleReviewerPrompt',
    'articleSchema',
    'articleValidator',
    'articleWriterPrompt',
    'autoPublishPolicy',
    'brandPolicyPrompt',
    'internalLinkNormalization',
    'riskReport',
    'seoBriefPrompt',
    'topicResearchPrompt',
    'topicScoring',
    'webResearchPrompt'
  ]);
  assert.match(CONTENT_AGENT_RULE_MANIFEST_HASH, /^[0-9a-f]{64}$/);
  assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}');
  assert.ok(Object.values(CONTENT_AGENT_RULE_MANIFEST).every((version) => typeof version === 'string' && version));
});

test('Regelgebundener Generierungssnapshot normalisiert, sortiert, begrenzt und hasht interne Links', () => {
  const snapshot = bindContentRulesToSnapshot({
    baseSnapshot: { version: 2, timezone: 'Europe/Berlin' },
    allowedInternalLinks: [
      'https://www.komplettwebdesign.de/kontakt/',
      '/leistungen/seo?utm_source=test',
      '/kontakt',
      '/leistungen/seo',
      'https://extern.example/path'
    ],
    requireAllowedInternalLinks: true
  });

  assert.deepEqual(snapshot.allowedInternalLinks, ['/kontakt', '/leistungen/seo']);
  assert.match(snapshot.allowedInternalLinksHash, /^[0-9a-f]{64}$/);
  assert.equal(snapshot.ruleManifestHash, CONTENT_AGENT_RULE_MANIFEST_HASH);
  assert.deepEqual(snapshot.ruleManifest, CONTENT_AGENT_RULE_MANIFEST);
  assert.equal(Object.isFrozen(snapshot.ruleManifest), true);
  assert.equal(Object.isFrozen(snapshot.allowedInternalLinks), true);
  assert.throws(() => snapshot.allowedInternalLinks.push('/nachtraeglich'), TypeError);
  assert.equal(validateContentRuleSnapshot(snapshot, { requireAllowedInternalLinks: true }).valid, true);
  assert.equal(MAX_SNAPSHOT_INTERNAL_LINKS, 5000);
  assert.throws(() => bindContentRulesToSnapshot({
    baseSnapshot: {},
    allowedInternalLinks: Array.from({ length: MAX_SNAPSHOT_INTERNAL_LINKS + 1 }, (_, index) => `/blog/${index}`),
    requireAllowedInternalLinks: true
  }), /zu viele/i);
});

test('Snapshotgrenzen blockieren übergroße Gesamtwerte und Pfade vor der Persistenz', () => {
  const valid = bindContentRulesToSnapshot({
    baseSnapshot: {},
    allowedInternalLinks: ['/kontakt'],
    requireAllowedInternalLinks: true
  });
  assert.equal(MAX_RUNTIME_SNAPSHOT_BYTES, 250_000);
  assert.deepEqual(validateContentRuleSnapshot({
    ...valid,
    oversized: 'x'.repeat(MAX_RUNTIME_SNAPSHOT_BYTES)
  }, { requireAllowedInternalLinks: true }), {
    valid: false,
    code: 'CONTENT_RUNTIME_SNAPSHOT_TOO_LARGE'
  });
  assert.throws(() => bindContentRulesToSnapshot({
    baseSnapshot: {},
    allowedInternalLinks: [`/blog/${'x'.repeat(2_100)}`],
    requireAllowedInternalLinks: true
  }), /zu lang/i);
});

test('Snapshotvalidierung lehnt Legacy, manipulierte Links und eine alte Regelbasis kontrolliert ab', () => {
  const valid = bindContentRulesToSnapshot({
    baseSnapshot: { version: 2 },
    allowedInternalLinks: ['/kontakt'],
    requireAllowedInternalLinks: true
  });
  assert.deepEqual(validateContentRuleSnapshot({}, { requireAllowedInternalLinks: true }), {
    valid: false,
    code: 'CONTENT_RUNTIME_SNAPSHOT_RULES_MISSING'
  });
  assert.equal(validateContentRuleSnapshot({
    ...valid,
    allowedInternalLinks: ['/kontakt', '/unerlaubt']
  }, { requireAllowedInternalLinks: true }).valid, false);
  assert.deepEqual(validateContentRuleSnapshot({
    ...valid,
    ruleManifest: { ...valid.ruleManifest, articleValidator: 'next' }
  }, { requireAllowedInternalLinks: true }), {
    valid: false,
    code: 'CONTENT_RULE_MANIFEST_MISMATCH'
  });
});
