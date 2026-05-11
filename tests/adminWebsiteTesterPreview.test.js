import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { __testables } from '../controllers/adminWebsiteTesterController.js';

const adminTemplate = fs.readFileSync(new URL('../views/admin/website_tester.ejs', import.meta.url), 'utf8');

test('admin website tester preview offers broken-links as a preview source', () => {
  assert.match(adminTemplate, /<option value="broken-links"/);
  assert.match(adminTemplate, /Broken-Links/);
});

test('admin website tester preview hides full-guide downloads when a preview has no full guide', () => {
  assert.match(adminTemplate, /preview\.fullGuide\?\.filename/);
  assert.match(adminTemplate, /preview\.fullGuide\?\.summary/);
  assert.match(adminTemplate, /preview\.source === 'broken-links'/);
});

test('admin preview source normalization accepts broken-links aliases', () => {
  assert.equal(__testables.normalizePreviewSource('broken-links'), 'broken-links');
  assert.equal(__testables.normalizePreviewSource('broken'), 'broken-links');
  assert.equal(__testables.normalizePreviewSource('seo'), 'seo');
  assert.equal(__testables.normalizePreviewSource('other'), 'website');
});

test('admin preview builds broken-links PDF report for broken-links source', () => {
  const report = __testables.buildPreviewShortReport({
    source: 'broken-links',
    lead: { domain: 'example.de', locale: 'de' },
    locale: 'de',
    detailedResult: {
      finalUrl: 'https://example.de/',
      fetchedAt: '2026-05-11T12:00:00.000Z',
      scanMode: 'schnell',
      crawlStats: { visitedPages: 1, plannedPages: 2, partial: false },
      linkStats: { totalChecked: 2, brokenCount: 1, warningCount: 0, okCount: 1 },
      brokenLinks: [{
        sourceUrl: 'https://example.de/',
        targetUrl: 'https://example.de/404',
        targetType: 'internal',
        status: 404,
        error: null
      }],
      warnings: []
    }
  });

  assert.match(report.filename, /example\.de-broken-links-report\.pdf$/);
  assert.ok(Buffer.isBuffer(report.buffer));
  assert.ok(report.buffer.length > 100);
});
