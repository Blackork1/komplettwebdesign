import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyExistingPostFreshness } from '../services/contentAgent/existingPostFreshnessService.js';

test('Jahreszahlen und Preise lösen Recherche aus', () => {
  const result = classifyExistingPostFreshness({
    post: { content: '<p>Die Regel gilt 2025 und kostet 99 Euro.</p>' },
    audit: { findings: [{ code: 'stale_year' }] }
  });
  assert.equal(result.requiresResearch, true);
  assert.deepEqual(result.reasons, ['stale_year', 'static_price']);
});

test('zeitloser Ratgeber benötigt keine Webrecherche', () => {
  const result = classifyExistingPostFreshness({
    post: { content: '<p>Eine klare Navigation und gutes SEO helfen Besuchern bei der Orientierung.</p>' },
    audit: { findings: [] }
  });
  assert.deepEqual(result, { requiresResearch: false, reasons: [] });
});

test('Classifier wertet ausschließlich sichtbaren Artikeltext aus', () => {
  const result = classifyExistingPostFreshness({
    post: {
      title: 'Zeitloser Ratgeber',
      content: '<script>Google änderte 2025 sein System; es kostet 99 Euro.</script><style>.preis-2024 { color: red; }</style><p>Eine klare Navigation hilft bei der Orientierung.</p>'
    },
    audit: { findings: [] }
  });
  assert.deepEqual(result, { requiresResearch: false, reasons: [] });
});

test('bekannte Auditcodes werden auf eindeutige sortierte Recherchegründe begrenzt', () => {
  const result = classifyExistingPostFreshness({
    post: { content: '<p>Zeitloser Text.</p>' },
    audit: {
      findings: [
        { code: 'technical_standard' },
        { code: 'privacy_claim' },
        { code: 'google_update' },
        { code: 'software_version_claim' },
        { code: 'google_update' },
        { code: 'beliebiger_befund' }
      ]
    }
  });
  assert.deepEqual(result, {
    requiresResearch: true,
    reasons: [
      'ai_or_tool_version',
      'google_or_seo_change',
      'legal_or_privacy',
      'technical_standard'
    ]
  });
});

test('belegpflichtige Aussagen im sichtbaren Text aktivieren die passenden Gründe', () => {
  const result = classifyExistingPostFreshness({
    post: {
      content: [
        '<p>Google hat seinen Suchalgorithmus geändert.</p>',
        '<p>ChatGPT 5 bietet neue Funktionen.</p>',
        '<p>Nach der DSGVO ist eine Einwilligung erforderlich.</p>',
        '<p>Webangebote müssen den Standard WCAG 2.2 berücksichtigen.</p>'
      ].join('')
    },
    audit: { findings: [] }
  });
  assert.deepEqual(result.reasons, [
    'ai_or_tool_version',
    'google_or_seo_change',
    'legal_or_privacy',
    'technical_standard'
  ]);
});

test('Google-Änderung wird auch ohne weitere Aktualitätssignale erkannt', () => {
  const result = classifyExistingPostFreshness({
    post: { content: '<p>Google hat seinen Suchalgorithmus geändert.</p>' },
    audit: { findings: [] }
  });
  assert.deepEqual(result, {
    requiresResearch: true,
    reasons: ['google_or_seo_change']
  });
});

test('GEO-Kürzel wird nicht innerhalb zeitloser Wörter erkannt', () => {
  const result = classifyExistingPostFreshness({
    post: { content: '<p>Geometrie ermöglicht eine neue, klare Navigation.</p>' },
    audit: { findings: [] }
  });
  assert.deepEqual(result, { requiresResearch: false, reasons: [] });
});
