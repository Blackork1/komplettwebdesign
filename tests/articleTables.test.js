import assert from 'node:assert/strict';
import test from 'node:test';
import * as cheerio from 'cheerio';
import { prepareArticleTables } from '../helpers/articleTables.js';
import { buildBlogPostPageModel } from '../services/blogPostPresentationService.js';

const table = `<div class="table-responsive"><table><caption>Laufende Kosten</caption>
<thead><tr><th>Kostenart</th><th>Orientierung</th><th>Worauf du achten solltest</th></tr></thead>
<tbody><tr><th scope="row">Domain</th><td><strong>10–30 €</strong> pro Jahr</td><td>Im Tarif enthalten?</td></tr>
<tr><th scope="row">Hosting</th><td>5–25 € pro Monat</td><td><a href="/leistungen/website-wartung">Wartung klären</a></td></tr></tbody></table></div>`;

test('Tabellenwerte erhalten auf dem Handy die richtigen Spaltenbezeichnungen', () => {
  const $ = cheerio.load(prepareArticleTables(table), null, false);
  assert.equal($('table.rg-responsive-table').length, 1);
  assert.equal($('.rg-table-scroll').length, 1);
  assert.deepEqual($('.rg-table-label').toArray().map(el => $(el).text()), [
    'Orientierung', 'Worauf du achten solltest', 'Orientierung', 'Worauf du achten solltest'
  ]);
  assert.equal($('.rg-table-value strong').text(), '10–30 €');
  assert.equal($('.rg-table-value a').attr('href'), '/leistungen/website-wartung');
  assert.equal($('caption').text(), 'Laufende Kosten');
  assert.equal($('tbody > tr').length, 2);
  assert.equal($('table[role="table"]').length, 1);
  assert.equal($('thead th[scope="col"][role="columnheader"]').length, 3);
  assert.equal($('tbody th[scope="row"][role="rowheader"]').length, 2);
  assert.equal($('.rg-table-label[aria-hidden="true"]').length, 4);
});

test('mehrere Tabellen werden ohne verdoppelte Inhalte vorbereitet', () => {
  const html = prepareArticleTables(table + table);
  const $ = cheerio.load(html, null, false);
  assert.equal($('table').length, 2);
  assert.equal($('.rg-table-value').length, 8);
  assert.equal(prepareArticleTables(html), html);
});

test('komplexe oder unvollständige Tabellen behalten ihr ursprüngliches Raster', () => {
  for (const original of [
    table.replace('<th>Kostenart</th>', '<th colspan="2">Kostenart</th>'),
    table.replace('<th scope="row">Domain</th>', '<th rowspan="2">Domain</th>'),
    table.replace('<td>Im Tarif enthalten?</td>', ''),
    '<table><tbody><tr><td>Ohne Spaltenüberschriften</td></tr></tbody></table>',
    '<p>Artikel ohne Tabelle</p>'
  ]) assert.equal(prepareArticleTables(original), original);
});

test('Labels werden aus Text gebildet und führen kein HTML aus', () => {
  const original = table.replace('Orientierung</th>', '&lt;img src=x onerror=alert(1)&gt;</th>');
  const $ = cheerio.load(prepareArticleTables(original), null, false);
  assert.equal($('.rg-table-label img').length, 0);
  assert.equal($('.rg-table-label').first().text(), '<img src=x onerror=alert(1)>');
});

test('statische und ältere Blogbeiträge nutzen dieselbe responsive Tabellendarstellung', () => {
  for (const content_format of ['static_html', 'legacy_ejs']) {
    const model = buildBlogPostPageModel({post: {
      id: 58, title: 'Kosten', slug: 'test-kosten', content: table,
      content_format, published: true, created_at: new Date('2026-11-15T10:00:00Z'),
      updated_at: new Date('2026-11-15T10:00:00Z'), faq_json: []
    }});
    const $ = cheerio.load(model.renderedContent, null, false);
    assert.equal($('table.rg-responsive-table').length, 1, content_format);
    assert.equal($('.rg-table-label').length, 4, content_format);
  }
});
