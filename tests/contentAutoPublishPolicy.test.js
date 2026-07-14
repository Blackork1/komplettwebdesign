import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTO_PUBLISH_POLICY_VERSION,
  evaluateAutoPublish
} from '../services/contentAgent/autoPublishPolicy.js';

const faq = Array.from({ length: 5 }, (_, index) => ({
  question: `Wie funktioniert Schritt ${index + 1}?`,
  answer: `Schritt ${index + 1} wird nachvollziehbar erklärt.`
}));

const risks = {
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
};

const links = [
  { url: '/kontakt', label: 'Kontakt', purpose: 'Beratung' },
  { url: '/pakete', label: 'Pakete', purpose: 'Angebot' }
];

function safeInput(overrides = {}) {
  const report = {
    passed: true,
    score: 94,
    summary: 'Der Artikel erfüllt alle Prüfungen.',
    strengths: ['Konkreter Kundennutzen'],
    issues: [],
    recommendedActions: [],
    requiresManualReview: false,
    risks,
    focusedReview: {
      blocked: false,
      items: [],
      riskFlags: [],
      sourceCount: 0
    }
  };
  const base = {
    snapshot: {
      operatingMode: 'auto_publish',
      forcedMode: null,
      autoPublishEffective: true,
      manualApprovalsCount: 8,
      autoPublishMinScore: 90,
      publicationAt: '2026-07-13T16:00:00.000Z',
      startedAt: '2026-07-12T10:00:00.000Z'
    },
    post: {
      id: 19,
      title: 'Sicherer Webdesign-Artikel',
      excerpt: 'Eine konkrete Kurzbeschreibung für kleine Unternehmen.',
      slug: 'sicherer-webdesign-artikel',
      meta_title: 'Sicherer Webdesign-Artikel für kleine Unternehmen',
      meta_description: 'Der Artikel erklärt kleinen Unternehmen konkret, wie sie ihr Webdesign sicher und strukturiert planen.',
      og_title: 'Sicherer Webdesign-Artikel',
      og_description: 'Konkrete Webdesign-Hinweise für kleine Unternehmen.',
      faq_json: faq,
      image_url: 'https://example.test/image.webp',
      image_alt: 'Unternehmerin plant ihre Website',
      content: '<section><h2>Sicher</h2></section>',
      content_format: 'static_html',
      generated_by_ai: true,
      published: false,
      workflow_status: 'needs_review',
      scheduled_at: '2026-07-13T16:00:00.000Z'
    },
    metadata: {
      quality_score: 94,
      internal_links_json: links,
      source_references_json: [],
      quality_report_json: report
    },
    validation: { passed: true, issues: [], sanitizedHtml: '<section><h2>Sicher</h2></section>' },
    riskReport: report.focusedReview
  };
  return {
    ...base,
    ...overrides,
    snapshot: { ...base.snapshot, ...(overrides.snapshot || {}) },
    post: { ...base.post, ...(overrides.post || {}) },
    metadata: { ...base.metadata, ...(overrides.metadata || {}) },
    validation: { ...base.validation, ...(overrides.validation || {}) },
    riskReport: { ...base.riskReport, ...(overrides.riskReport || {}) }
  };
}

test('Policy erlaubt ausschließlich den vollständig sicheren unveröffentlichten KI-Entwurf', () => {
  assert.deepEqual(evaluateAutoPublish(safeInput()), {
    allowed: true,
    policyVersion: AUTO_PUBLISH_POLICY_VERSION,
    reasons: []
  });
});

test('Reviewmodus, forced review, technischer Gate und Snapshot-Freigaben blockieren mit stabilen Codes', () => {
  const cases = [
    [{ operatingMode: 'review' }, 'mode_review'],
    [{ forcedMode: 'review' }, 'forced_review'],
    [{ autoPublishEffective: false }, 'technical_gate_disabled'],
    [{ manualApprovalsCount: 7 }, 'manual_approvals_too_low']
  ];
  for (const [snapshot, reason] of cases) {
    assert.ok(evaluateAutoPublish(safeInput({ snapshot })).reasons.includes(reason));
  }
});

test('aktive Lernregeln können den Reviewmodus niemals in automatische Veröffentlichung umwandeln', () => {
  const decision = evaluateAutoPublish(safeInput({
    snapshot: {
      operatingMode: 'review',
      forcedMode: 'review',
      learningRuleSnapshot: {
        version: 'content-learning-rules-v1',
        rules: [{ id: 8, version: 1, categoryKey: 'generic_content' }],
        hash: 'a'.repeat(64)
      }
    }
  }));
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes('mode_review'));
  assert.ok(decision.reasons.includes('forced_review'));
});

test('Policy erzwingt den höheren Snapshot-Mindestscore und mindestens 90', () => {
  assert.ok(evaluateAutoPublish(safeInput({
    snapshot: { autoPublishMinScore: 96 }
  })).reasons.includes('quality_score_too_low'));
  assert.ok(evaluateAutoPublish(safeInput({
    metadata: { quality_score: 89, quality_report_json: { ...safeInput().metadata.quality_report_json, score: 89 } }
  })).reasons.includes('quality_score_too_low'));
});

test('Policy verlangt einen kanonischen zukünftigen und unveränderten Publikationssnapshot', () => {
  for (const input of [
    { snapshot: { publicationAt: null } },
    { snapshot: { publicationAt: '2026-07-13T18:00:00+02:00' } },
    { snapshot: { publicationAt: '2026-07-12T09:59:59.999Z' } },
    { post: { scheduled_at: '2026-07-14T16:00:00.000Z' } }
  ]) {
    const decision = evaluateAutoPublish(safeInput(input));
    assert.equal(decision.allowed, false);
    assert.ok(decision.reasons.includes('publication_schedule_invalid'));
  }
});

test('jeder deterministische Risikoflag blockiert einzeln', () => {
  for (const flag of Object.keys(risks)) {
    const report = safeInput().metadata.quality_report_json;
    const decision = evaluateAutoPublish(safeInput({
      metadata: {
        quality_report_json: { ...report, risks: { ...risks, [flag]: true } }
      }
    }));
    assert.ok(decision.reasons.includes(`risk_${flag}`), flag);
  }
});

test('unvollständige, unbekannte oder blockierende Review- und Focus-Felder sperren fail-closed', () => {
  const base = safeInput();
  const variants = [
    { metadata: { quality_report_json: { ...base.metadata.quality_report_json, risks: { currentClaims: false } } } },
    { metadata: { quality_report_json: { ...base.metadata.quality_report_json, unknown: true } } },
    { metadata: { quality_report_json: { ...base.metadata.quality_report_json, issues: [{ code: 'unbekannt' }] } } },
    { riskReport: { blocked: true } },
    { riskReport: { riskFlags: ['unbekannt'] } },
    { riskReport: { unknown: true } }
  ];
  for (const variant of variants) {
    assert.equal(evaluateAutoPublish(safeInput(variant)).allowed, false);
  }
  assert.ok(evaluateAutoPublish(safeInput({
    riskReport: { blocked: true }
  })).reasons.includes('risk_review_required'));
  assert.ok(evaluateAutoPublish(safeInput({
    riskReport: { riskFlags: ['unbekannt'] }
  })).reasons.includes('risk_review_required'));
});

test('aktuelle Validierung muss vollständig, ohne Issues und unverändert sanitisiert sein', () => {
  for (const validation of [
    { passed: false },
    { issues: [{ code: 'unknown_issue' }] },
    { issues: 'ungültig' },
    { sanitizedHtml: '' },
    { unknown: true }
  ]) {
    assert.ok(evaluateAutoPublish(safeInput({ validation })).reasons.includes('validation_failed'));
  }
  for (const post of [
    { content: '' },
    { content: undefined },
    { content: '<section><h2>Persistiert</h2></section>' }
  ]) {
    assert.ok(evaluateAutoPublish(safeInput({ post })).reasons.includes('validation_failed'));
  }
});

test('Policy verlangt exakte Inhaltsgleichheit zwischen persistiertem Post und Sanitizer-Ergebnis', () => {
  const decision = evaluateAutoPublish(safeInput({
    post: { content: '<section><h2>Persistiert</h2></section>' },
    validation: { sanitizedHtml: '<section><h2>Verändert</h2></section>' }
  }));

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes('validation_failed'));
});

test('exakter Draftzustand, HTTPS-Bild und Alt-Text sind zwingend', () => {
  const cases = [
    { published: true },
    { workflow_status: 'draft' },
    { generated_by_ai: false },
    { content_format: 'legacy_ejs' },
    { image_url: 'http://example.test/image.webp' },
    { image_url: 'https://user:pass@example.test/image.webp' },
    { image_alt: '' }
  ];
  for (const post of cases) {
    const decision = evaluateAutoPublish(safeInput({ post }));
    assert.equal(decision.allowed, false);
    if ('image_url' in post || 'image_alt' in post) {
      assert.ok(decision.reasons.includes('image_incomplete'));
    }
  }
});

test('Slug, Meta-Daten, FAQ und interne Linkallowlist blockieren bei jeder Abweichung', () => {
  const variants = [
    { post: { slug: 'Ungültiger Slug' } },
    { post: { meta_title: '' } },
    { post: { meta_description: 'x'.repeat(161) } },
    { post: { og_title: '' } },
    { post: { og_description: '' } },
    { post: { faq_json: faq.slice(0, 4) } },
    { post: { faq_json: [{ question: 'Frage?', answer: 'Antwort', extra: true }, ...faq.slice(1)] } },
    { metadata: { internal_links_json: [] } },
    { metadata: { internal_links_json: [{ url: '/nicht-erlaubt', label: 'X', purpose: 'X' }, links[1]] } }
  ];
  for (const variant of variants) {
    assert.equal(evaluateAutoPublish(safeInput(variant)).allowed, false);
  }
});

test('quellenpflichtige Aussagen verlangen zwei bis sechs eindeutige erlaubte HTTPS-Quellen', () => {
  const report = safeInput().metadata.quality_report_json;
  const sourceIssue = {
    code: 'source_check', severity: 'info', message: 'Quelle geprüft.',
    repairInstruction: 'Quelle prüfen.', blocking: false,
    sectionHeading: null, evidenceExcerpt: null, verificationType: 'source',
    sourceRequired: true, autoPublishBlocking: false
  };
  const focusedItem = {
    code: 'source_check', severity: 'info', section: 'Gesamter Artikel', excerpt: null,
    reason: 'Quelle erforderlich.', instruction: 'Quelle prüfen.', verificationType: 'source',
    sourceRequired: true, blocking: false, anchor: 'pruefung-gesamter-artikel'
  };
  const withRequirement = {
    metadata: {
      quality_report_json: {
        ...report,
        issues: [sourceIssue],
        focusedReview: { ...report.focusedReview, items: [focusedItem] }
      }
    },
    riskReport: { items: [focusedItem] }
  };
  assert.ok(evaluateAutoPublish(safeInput(withRequirement)).reasons.includes('sources_required'));

  const sources = [1, 2].map((index) => ({
    title: `Quelle ${index}`,
    url: `https://example${index}.test/source`,
    publisher: 'Primärquelle',
    publishedAt: '2026-07-01',
    retrievedAt: '2026-07-12'
  }));
  assert.equal(evaluateAutoPublish(safeInput({
    ...withRequirement,
    metadata: {
      ...withRequirement.metadata,
      source_references_json: sources,
      quality_report_json: {
        ...withRequirement.metadata.quality_report_json,
        focusedReview: { ...withRequirement.metadata.quality_report_json.focusedReview, sourceCount: 2 }
      }
    },
    riskReport: { ...withRequirement.riskReport, sourceCount: 2 }
  })).allowed, true);

  for (const invalidSources of [
    [sources[0]],
    [...sources, ...sources, ...sources, ...sources],
    [sources[0], { ...sources[1], url: 'http://example.test/source' }],
    [sources[0], { ...sources[1], extra: true }]
  ]) {
    assert.equal(evaluateAutoPublish(safeInput({
      ...withRequirement,
      metadata: {
        ...withRequirement.metadata,
        source_references_json: invalidSources,
        quality_report_json: {
          ...withRequirement.metadata.quality_report_json,
          focusedReview: {
            ...withRequirement.metadata.quality_report_json.focusedReview,
            sourceCount: invalidSources.length
          }
        }
      },
      riskReport: { ...withRequirement.riskReport, sourceCount: invalidSources.length }
    })).allowed, false);
  }
});

test('SourceCount stimmt auch ohne Quellen exakt mit der validierten Quellenanzahl überein', () => {
  assert.equal(evaluateAutoPublish(safeInput({
    riskReport: { sourceCount: 1 },
    metadata: {
      quality_report_json: {
        ...safeInput().metadata.quality_report_json,
        focusedReview: {
          ...safeInput().metadata.quality_report_json.focusedReview,
          sourceCount: 1
        }
      }
    }
  })).allowed, false);
});
