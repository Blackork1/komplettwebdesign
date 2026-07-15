import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { renderFile } from 'ejs';

import {
  presentArticlePerformanceDetail,
  presentArticlePerformanceSummary
} from '../services/contentAgent/adminPresentationService.js';

function window(days, overrides = {}) {
  return {
    coverageDayCount: days,
    complete: true,
    impressions: 50,
    clicks: 0,
    ctr: 0,
    averagePosition: 14.2,
    ctaClicks: 0,
    contactSubmits: 0,
    queries: [],
    ...overrides
  };
}

function snapshot(overrides = {}) {
  return {
    id: 9,
    post_id: 7,
    evaluated_through_date: '2026-07-15',
    article_age_days: 45,
    windows_json: { 7: window(7), 14: window(14), 28: window(28) },
    previous_windows_json: { 28: window(28, { impressions: 30 }) },
    cohort_json: { available: true, source: 'cluster', size: 4, medianImpressions: 70 },
    status: 'opportunity',
    diagnoses_json: [{ code: 'snippet_or_intent_opportunity', categoryKey: 'performance_snippet_intent' }],
    positive_signals_json: [],
    data_eligible: true,
    learning_eligible: true,
    evidence_hash: 'a'.repeat(64),
    explanation_status: 'ready',
    explanation_json: {
      summary: 'Der Artikel wird angezeigt, erhält aber noch keine Klicks.',
      strengths: ['Erste organische Sichtbarkeit ist vorhanden.'],
      improvements: ['Titel und Suchintention gemeinsam prüfen.'],
      nextCheck: 'Nach der nächsten vollständigen Messperiode erneut prüfen.',
      learningSuggestion: 'Suchergebnis und Einstieg präzise abstimmen.'
    },
    ...overrides
  };
}

test('50 Impressionen ohne Klick werden verständlich dargestellt', () => {
  const result = presentArticlePerformanceSummary(snapshot());
  assert.equal(result.headline, 'Suchergebnis oder Suchintention prüfen');
  assert.equal(result.isEligible, true);
  assert.deepEqual(result.windows.map((entry) => [entry.label, entry.impressions, entry.clicks]), [
    ['7 Tage', 50, 0], ['14 Tage', 50, 0], ['28 Tage', 50, 0]
  ]);
});

test('Teilabdeckung und fehlende Daten bleiben neutral und eindeutig', () => {
  const partial = presentArticlePerformanceSummary(snapshot({
    windows_json: {
      7: window(4, { complete: false, impressions: 12 }),
      14: window(4, { complete: false, impressions: 12 }),
      28: window(4, { complete: false, impressions: 12 })
    },
    status: 'collecting_data',
    data_eligible: false,
    diagnoses_json: []
  }));
  assert.equal(partial.windows[0].emptyLabel, '4 von 7 Tagen');
  assert.equal(partial.headline, 'Daten werden noch gesammelt');

  const empty = presentArticlePerformanceSummary(null);
  assert.equal(empty.windows[0].emptyLabel, 'Noch keine GSC-Daten');
  assert.equal(empty.hasSnapshot, false);
});

test('Detailmodell begrenzt Suchanfragen und gibt keine Rohdaten weiter', () => {
  const queries = Array.from({ length: 14 }, (_, index) => ({
    query: index === 0 ? '<script>nicht ausführen</script>' : `suchanfrage ${index}`,
    impressions: 20 - index,
    clicks: index,
    ctr: 0.01,
    averagePosition: 9 + index
  }));
  const detail = presentArticlePerformanceDetail({
    post: { id: 7, title: '<b>Artikel</b>', slug: 'artikel', contentCluster: 'Webdesign' },
    snapshot: snapshot({ windows_json: { 7: window(7), 14: window(14), 28: window(28, { queries }) } }),
    opportunity: { opportunityType: 'meta_refresh', score: 90 },
    learning: { pendingCount: 1, activeCount: 0 }
  });
  assert.equal(detail.queries.length, 10);
  assert.equal(detail.queries[0].query, '<script>nicht ausführen</script>');
  assert.equal(detail.post.title, '<b>Artikel</b>');
  assert.equal(detail.funnel.length, 4);
  assert.equal(Object.hasOwn(detail, 'windows_json'), false);
  assert.equal(JSON.stringify(detail).includes('evidence_hash'), false);
});

test('Performance-Detailview rendert nur präsentierte Werte und mobile Struktur', async () => {
  const performance = presentArticlePerformanceDetail({
    post: { id: 7, title: '<script>Artikel</script>', slug: 'artikel', contentCluster: 'Webdesign' },
    snapshot: snapshot(),
    opportunity: null,
    learning: { pendingCount: 1, activeCount: 0 }
  });
  const html = await renderFile(fileURLToPath(new URL(
    '../views/admin/contentAgent/articlePerformance.ejs', import.meta.url
  )), {
    title: 'Artikel-Performance',
    currentPathname: '/admin/content-agent/existing-content',
    csrfToken: 'csrf-test',
    performance,
    session: { user: { username: 'Admin' } },
    cssAsset: (value) => `/${value}`,
    jsAsset: (value) => `/${value}`,
    assetVersion: 'test'
  });
  assert.match(html, /7 Tage/);
  assert.match(html, /14 Tage/);
  assert.match(html, /28 Tage/);
  assert.match(html, /Artikelwirkung/);
  assert.match(html, /Suchanfragen/);
  assert.match(html, /content-agent-performance-grid/);
  assert.match(html, /&lt;script&gt;Artikel&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>Artikel<\/script>/);
  assert.doesNotMatch(html, /windows_json|explanation_json/);
  assert.match(html, /type="hidden" name="evidence_hash"/);
});

test('Performance-Detailseite ist ausschließlich admin-geschützt', () => {
  const source = readFileSync(new URL('../routes/adminContentAgentRoutes.js', import.meta.url), 'utf8');
  assert.match(source,
    /router\.get\('\/admin\/content-agent\/existing-content\/:id\/performance',\s*isAdmin,\s*controller\.articlePerformancePage\)/
  );
});

test('Performance-Revision ist ausschließlich als bestätigter Admin-POST mit CSRF erreichbar', () => {
  const source = readFileSync(new URL('../routes/adminContentAgentRoutes.js', import.meta.url), 'utf8');
  assert.match(source,
    /router\.post\(\s*'\/admin\/content-agent\/existing-content\/:id\/performance\/revision',\s*isAdmin,\s*verifyCsrfToken,\s*controller\.createPerformanceRevisionAction\s*\)/
  );
});
