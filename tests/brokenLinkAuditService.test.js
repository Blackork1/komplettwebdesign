import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/brokenLinkAuditService.js';

test('ensureUrl normalizes and validates protocol', () => {
  assert.equal(__testables.ensureUrl('example.com', 'de'), 'https://example.com/');
  assert.throws(() => __testables.ensureUrl('ftp://example.com', 'de'), /ungültig|invalid/i);
});

test('clampScanMode accepts known values and falls back to maximal', () => {
  assert.equal(__testables.clampScanMode('schnell'), 'schnell');
  assert.equal(__testables.clampScanMode('balanced'), 'balanced');
  assert.equal(__testables.clampScanMode('maximal'), 'maximal');
  assert.equal(__testables.clampScanMode('unknown'), 'maximal');
});

test('classifyLinkResult maps status codes to broken, warning, ok', () => {
  assert.equal(__testables.classifyLinkResult({ status: 404 }), 'broken');
  assert.equal(__testables.classifyLinkResult({ status: 500 }), 'broken');
  assert.equal(__testables.classifyLinkResult({ status: 403 }), 'warning');
  assert.equal(__testables.classifyLinkResult({ status: 429 }), 'warning');
  assert.equal(__testables.classifyLinkResult({ status: 200 }), 'ok');
  assert.equal(__testables.classifyLinkResult({ error: 'timeout' }), 'broken');
});

test('extractLinksFromHtml returns normalized unique links and skips invalid schemes', () => {
  const html = `
    <a href="/kontakt">Kontakt</a>
    <a href="https://example.com/kontakt#top">Kontakt2</a>
    <a href="mailto:info@example.com">Mail</a>
    <a href="javascript:void(0)">JS</a>
    <a href="/kontakt">Dupe</a>
  `;

  const links = __testables.extractLinksFromHtml(html, 'https://example.com/');
  assert.deepEqual(links, ['https://example.com/kontakt']);
});

test('isLikelyHtmlTarget skips binary asset extensions', () => {
  assert.equal(__testables.isLikelyHtmlTarget('https://example.com/path'), true);
  assert.equal(__testables.isLikelyHtmlTarget('https://example.com/file.pdf'), false);
  assert.equal(__testables.isLikelyHtmlTarget('https://example.com/image.png?x=1'), false);
});
