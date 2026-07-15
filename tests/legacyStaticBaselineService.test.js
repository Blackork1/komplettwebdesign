import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLegacyStaticOptimizationBaselineHtml } from '../services/contentAgent/legacyStaticBaselineService.js';

test('Legacy-Baseline korrigiert ausschließlich bekannte fehlende href-Anführungszeichen', () => {
  const input = [
    '<p><a href="/branchen/webdesign-blumenladen><strong>Webdesign für Blumenläden</strong></a>.</p>',
    '<p><a href="/kontakt">Kontakt</a></p>'
  ].join('');

  assert.equal(
    normalizeLegacyStaticOptimizationBaselineHtml(input),
    input.replace(
      'href="/branchen/webdesign-blumenladen><strong>',
      'href="/branchen/webdesign-blumenladen"><strong>'
    )
  );
});

test('Legacy-Baseline verändert weder beliebige Links noch normalen Artikeltext', () => {
  const input = '<p><a href="/branchen/webdesign-cafe">Café</a> und unveränderter Text.</p>';
  assert.equal(normalizeLegacyStaticOptimizationBaselineHtml(input), input);
});
