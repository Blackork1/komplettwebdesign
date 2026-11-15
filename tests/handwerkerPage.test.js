import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageBySlug } from '../controllers/slugController.js';

test('handwerker renders reviewed copy and shared catalog data instead of stale CMS components', async () => {
  let queries = 0;
  const db = { async query() { queries++; return { rows: [{ id: 2, slug: 'handwerker', title: 'Standart 499 € +128 %', description: '30 Tage oder zwei Wochen' }] }; } };
  let view; let model;
  const visiblePackages = [{ slug: 'start', name: 'Start', priceLabel: 'ab 999 €' }];
  await getPageBySlug({ params: { slug: 'handwerker' }, app: { get: () => db } }, {
    locals: { visiblePackages, canonicalBaseUrl: 'https://www.komplettwebdesign.de', canonicalUrl: 'https://www.komplettwebdesign.de/handwerker' },
    render(name, values) { view = name; model = values; }
  }, e => { if (e) throw e; });
  assert.equal(view, 'handwerker');
  assert.equal(queries, 1);
  assert.deepEqual(model.packages, visiblePackages);
  assert.doesNotMatch(JSON.stringify(model), /Standart|499 €|128 %|zwei Wochen/);
});

test('handwerker FAQ markup describes exactly the questions and answers visible on the page', async () => {
  const { default: ejs } = await import('ejs');
  const { fileURLToPath } = await import('node:url');
  const { HANDWERKER_FAQ, buildHandwerkerPageSchemas } = await import('../helpers/pageSchema.js');
  const html = await ejs.renderFile(fileURLToPath(new URL('../views/handwerker.ejs', import.meta.url)), { packages: [], handwerkerFaq: HANDWERKER_FAQ }, {
    includer(name, filename) { return name === 'partials/package-collection' ? { filename } : { template: ' ' }; }
  });
  const faq = buildHandwerkerPageSchemas({ baseUrl: 'https://www.komplettwebdesign.de' })['@graph'].find(node => node['@type'] === 'FAQPage');
  for (const question of faq.mainEntity) {
    assert.ok(html.includes(ejs.escapeXML(question.name)));
    assert.ok(html.includes(ejs.escapeXML(question.acceptedAnswer.text)));
  }
});
