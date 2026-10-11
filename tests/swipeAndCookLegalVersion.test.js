import assert from 'node:assert/strict';
import test from 'node:test';
import * as legal from '../services/swipeAndCookLegalContentService.js';

test('öffentliche Seiten wählen die aktuelle Fassung statt der historischen S2-Fassung', () => {
  const page = legal.loadSwipeAndCookLegalPage('privacy');
  assert.equal(page.stand, '11. Oktober 2026');
  assert.equal(page.source, 's4-datenschutzerklaerung.md');
  assert.ok(page.html.startsWith('<section'));
});

test('historische Fassungen sind explizit lesbar, unbekannte Versionen und Pfade nicht', () => {
  assert.equal(typeof legal.loadSwipeAndCookLegalPageVersion, 'function');
  const historical = legal.loadSwipeAndCookLegalPageVersion('privacy', 's2');
  assert.equal(historical.stand, '4. September 2026');
  assert.equal(historical.path, '/swipeandcook-datenschutz');
  const current = legal.loadSwipeAndCookLegalPageVersion('privacy', 's3');
  assert.equal(current.stand, '8. Oktober 2026');
  assert.equal(legal.loadSwipeAndCookLegalPageVersion('privacy', 's4').stand, '11. Oktober 2026');
  assert.equal(legal.loadSwipeAndCookLegalPage('accountDeletion').source, 's4-kontoloeschung.md');
  assert.equal(legal.loadSwipeAndCookLegalPageVersion('accountDeletion', 's4').stand, '11. Oktober 2026');
  for (const key of ['terms', 'support']) {
    assert.ok(legal.loadSwipeAndCookLegalPage(key).source.startsWith('s3-'));
    assert.throws(() => legal.loadSwipeAndCookLegalPageVersion(key, 's4'));
  }
  for (const version of ['s1', '../s2', 's3/../../', '', undefined]) {
    assert.throws(() => legal.loadSwipeAndCookLegalPageVersion('privacy', version));
  }
  assert.throws(() => legal.loadSwipeAndCookLegalPageVersion('../privacy', 's3'));
});
