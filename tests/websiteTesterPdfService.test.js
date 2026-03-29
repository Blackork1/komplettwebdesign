import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWebsiteTesterReport, __testables } from '../services/websiteTesterPdfService.js';

test('encodeWinAnsi keeps umlauts and replaces unsupported chars', () => {
  const encoded = __testables.encodeWinAnsi('Für Größe äußert 😀').toString('hex');
  assert.match(encoded, /fc72/);
  assert.match(encoded, /f6df65/);
  assert.match(encoded, /e4/);
  assert.ok(encoded.endsWith('3f'));
});

test('wrapText wraps long lines', () => {
  const lines = __testables.wrapText('a '.repeat(200), 40);
  assert.ok(lines.length > 2);
  assert.ok(lines.every((line) => line.length <= 40));
});

test('createPdfFromPages returns PDF buffer', () => {
  const buffer = __testables.createPdfFromPages([['Test line']]);
  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString('utf8', 0, 8), /%PDF-1\.4/);
});

test('buildWebsiteTesterReport returns filename and content', () => {
  const report = buildWebsiteTesterReport({
    lead: { domain: 'example.com', locale: 'de', score_band: 'mittel', overall_score: 62 },
    result: {
      finalUrl: 'https://example.com/',
      overallScore: 62,
      scoreBand: 'mittel',
      categories: [],
      topFindings: [],
      topActions: [],
      strengths: [],
      siteFacts: { imagesWithoutAlt: 0, usesHttps: true, hasSchema: true, hasRobots: true, hasSitemap: true },
      cta: { primaryHref: '/kontakt' }
    },
    locale: 'de'
  });

  assert.ok(Buffer.isBuffer(report.buffer));
  assert.ok(report.buffer.length > 20);
  assert.match(report.filename, /optimierungsreport\.pdf$/);
});
