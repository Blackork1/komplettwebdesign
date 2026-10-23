import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLlmsText, buildPricingMarkdown } from '../helpers/llmsText.js';

test('machine-readable price documents use supplied catalog values and central contact facts', () => {
  for (const build of [buildLlmsText, buildPricingMarkdown]) {
    const text = build([{ name: 'Start', priceLabel: 'ab 1.234 €', canonicalPath: '/pakete/start' }]);
    assert.match(text, /ab 1\.234 €/);
    assert.match(text, /\+49 155 11245048/);
    assert.match(text, /https:\/\/www\.komplettwebdesign\.de\/pakete\/start/);
    assert.doesNotMatch(text, /https:\/\/komplettwebdesign\.de|799|aktuelle Paketlogik/);
  }
});
