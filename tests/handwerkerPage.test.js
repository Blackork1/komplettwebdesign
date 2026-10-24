import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { load } from 'cheerio';
import { getPageBySlug, buildHandwerkerViewModel } from '../controllers/slugController.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';
import { SEO_RECOVERY_REDIRECTS, getSeoRecoveryTarget } from '../data/seoIntentRegistry.js';
import { SEO_GUIDE_CLUSTER } from '../data/seoGuideCluster.js';

const viewPath = fileURLToPath(new URL('../views/handwerker.ejs', import.meta.url));
const visiblePackages = [
  ['start', 'Start', 'ab 799 €'],
  ['business', 'Business', 'ab 1.499 €'],
  ['wachstum', 'Wachstum', 'ab 2.499 €'],
  ['individuell', 'Individuell', 'ab 3.500 € oder nach Aufwand']
].map(([slug, name, priceLabel]) => ({ slug, name, priceLabel, canonicalPath: `/pakete/${slug}` }));
const packagePricing = buildPricingViewModel({ visiblePackages, lowestPackagePriceLabel: '799 €' });
const locals = {
  visiblePackages,
  packagePricing,
  canonicalBaseUrl: 'https://www.komplettwebdesign.de',
  canonicalUrl: 'https://www.komplettwebdesign.de/handwerker'
};

async function renderPage() {
  const model = buildHandwerkerViewModel({ id: 2, slug: 'handwerker' }, locals);
  const html = await ejs.renderFile(viewPath, { ...locals, ...model }, {
    includer(_name, _filename) { return { template: ' ' }; }
  });
  return { model, $: load(html) };
}

test('handwerker renders reviewed copy and shared catalog data instead of stale CMS components', async () => {
  let queries = 0;
  const db = { async query() { queries++; return { rows: [{ id: 2, slug: 'handwerker', title: 'Standart 499 € +128 %', description: '30 Tage oder zwei Wochen' }] }; } };
  let view; let model;
  await getPageBySlug({ params: { slug: 'handwerker' }, app: { get: () => db } }, {
    locals,
    render(name, values) { view = name; model = values; }
  }, e => { if (e) throw e; });
  assert.equal(view, 'handwerker');
  assert.equal(queries, 1);
  assert.deepEqual(model.packages, visiblePackages);
  assert.doesNotMatch(JSON.stringify(model), /Standart|499 € \+|128 %|zwei Wochen|\{\{/);
});

test('Titel, Beschreibung und H1 besetzen „Website für Handwerker in Berlin“', async () => {
  const { model, $ } = await renderPage();
  assert.equal(model.title, 'Website für Handwerker in Berlin erstellen lassen | ab 799 €');
  assert.ok(model.title.length <= 60);
  assert.ok(model.description.length >= 130 && model.description.length <= 155, String(model.description.length));
  assert.equal($('h1').length, 1);
  assert.match($('h1').text(), /^Website für Handwerker in Berlin/);
  assert.match($('#hero .wd-lead').text(), /Handwerksbetrieb/);
});

test('die Seite deckt die recherchierten Themen ab', async () => {
  const { $ } = await renderPage();
  const headings = $('h2').map((_, el) => $(el).text()).get().join(' | ');
  for (const topic of [/Was auf eine Handwerker-Website gehört/, /Gewerk/, /Anfrageformular/, /Google/, /Azubis/, /Impressum/, /Was kostet eine Website für Handwerker\?/, /Ablauf|abläuft|läuft dein Projekt/, /Häufige Fragen/]) {
    assert.match(headings, topic);
  }
  const trades = $('#gewerke h3').map((_, el) => $(el).text()).get();
  for (const trade of ['Elektriker', 'Sanitär, Heizung, Klima', 'Maler und Lackierer', 'Dachdecker und Zimmerei', 'Tischler und Schreiner']) {
    assert.ok(trades.includes(trade), trade);
  }
  assert.ok($('#gewerke a[href="/branchen/webdesign-friseur"]').length);
  assert.equal($('#preise .wd-package').length, 3);
  assert.match($('#preise').text(), /ab 799 €[\s\S]*ab 1\.499 €[\s\S]*ab 2\.499 €/);
  assert.ok($('main a[href="/leistungen/local-seo"]').length);
  assert.ok($('main a[href="/pakete"]').length);
});

test('Zahlen sind mit Quelle belegt und externe Quellen öffnen sicher', async () => {
  const { $ } = await renderPage();
  const text = $('main').text();
  assert.match(text, /94 Prozent der Handwerksbetriebe eine eigene Website/);
  assert.match(text, /17\.264/);
  const sources = $('.handwerk-page__meta a[target="_blank"]');
  assert.equal(sources.length, 3);
  sources.each((_, el) => assert.equal($(el).attr('rel'), 'noopener'));
  assert.match($('#impressum').text(), /keine Rechtsberatung/);
});

test('FAQ-Markup beschreibt genau die sichtbaren Fragen und Antworten mit echten Preisen', async () => {
  const { model, $ } = await renderPage();
  const faq = model.structuredDataBlocks[0]['@graph'].find((node) => node['@type'] === 'FAQPage');
  const visible = $('#faq details').map((_, el) => ({
    q: $(el).find('summary').text().trim(),
    a: $(el).find('p').text().trim()
  })).get();
  assert.equal(faq.mainEntity.length, visible.length);
  faq.mainEntity.forEach((question, index) => {
    assert.equal(question.name, visible[index].q);
    assert.equal(question.acceptedAnswer.text, visible[index].a);
  });
  assert.match(visible[0].a, /ab 799 €/);
});

test('der frühere Handwerker-Ratgeber ist in /handwerker aufgegangen', async () => {
  assert.equal(SEO_RECOVERY_REDIRECTS['/ratgeber/website-fuer-handwerker-berlin'], '/handwerker');
  assert.equal(getSeoRecoveryTarget('/handwerker')?.state, 'active');
  assert.ok(!SEO_GUIDE_CLUSTER.some((guide) => guide.slug === 'website-fuer-handwerker-berlin'));
  const routes = await readFile(new URL('../routes/seoLandingRoutes.js', import.meta.url), 'utf8');
  assert.match(routes, /router\.get\('\/ratgeber\/website-fuer-handwerker-berlin'/);
});
