import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTesterFullGuidePdf } from '../services/testerFullGuidePdfService.js';

test('buildTesterFullGuidePdf returns a multi-page capable PDF buffer', () => {
  const longText = ['# GEO Vollanleitung', '', ...Array.from({ length: 260 }, (_, index) => `- Abschnitt ${index + 1}: Beispieltext für die Vollanleitung mit ausreichend Inhalt zur PDF-Paginierung.`)].join('\n');

  const pdf = buildTesterFullGuidePdf({
    guideText: longText,
    sourceLabel: 'geo',
    domain: 'example.com',
    locale: 'de'
  });

  assert.ok(Buffer.isBuffer(pdf.buffer));
  assert.match(pdf.buffer.toString('utf8', 0, 8), /%PDF-1\.4/);
  assert.ok(pdf.pageCount >= 1);
  assert.match(pdf.filename, /example\.com-geo-vollanleitung\.pdf$/);
});
