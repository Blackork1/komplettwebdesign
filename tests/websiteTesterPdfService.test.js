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

test('buildWebsiteTesterReport differs for SEO and GEO profiles', () => {
  const baseResult = {
    finalUrl: 'https://example.com/',
    overallScore: 78,
    scoreBand: 'gut',
    categories: [],
    topFindings: [],
    topActions: [],
    strengths: [],
    context: {
      businessType: 'Webdesign Agentur',
      primaryService: 'Website erstellen',
      targetRegion: 'Berlin'
    },
    siteFacts: {
      imagesWithoutAlt: 0,
      usesHttps: true,
      hasSchema: true,
      hasRobots: true,
      hasSitemap: true,
      pagesCrawled: 4,
      crawlTarget: 6
    },
    cta: { primaryHref: '/kontakt' }
  };

  const seoReport = buildWebsiteTesterReport({
    lead: { domain: 'example.com', locale: 'de', source: 'seo', score_band: 'gut', overall_score: 78 },
    result: {
      ...baseResult,
      reportProfile: 'seo',
      seoCategoryScores: [
        { id: 'onpage', score: 70 },
        { id: 'technical', score: 62 }
      ],
      seoPotentialSummary: {
        headline: 'SEO Potenzial',
        text: 'Mehr Struktur',
        topPotentialAreas: ['OnPage', 'Technik']
      }
    },
    locale: 'de'
  });

  const geoReport = buildWebsiteTesterReport({
    lead: { domain: 'example.com', locale: 'de', source: 'geo', score_band: 'gut', overall_score: 78 },
    result: {
      ...baseResult,
      reportProfile: 'geo',
      geoSignals: {
        entitySchema: { score: 71, quality: 'mittel' },
        intentCoherence: { score: 68, quality: 'mittel' },
        faqSnippetReadiness: { score: 64, quality: 'mittel' },
        trustCitations: { score: 72, quality: 'mittel' },
        internalLinking: { score: 66, quality: 'mittel' }
      },
      geoPotentialSummary: {
        headline: 'GEO Potenzial',
        text: 'Mehr answer-first',
        topPotentials: [{ category: 'FAQ', label: 'Kurzantworten' }]
      }
    },
    locale: 'de'
  });

  assert.ok(Buffer.isBuffer(seoReport.buffer));
  assert.ok(Buffer.isBuffer(geoReport.buffer));
  assert.notDeepEqual(seoReport.buffer, geoReport.buffer);
});
