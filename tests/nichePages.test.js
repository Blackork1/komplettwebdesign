import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ejs from 'ejs';

import { NICHE_PAGES, buildNichePageViewModel, getNichePage } from '../services/nichePageViewModel.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';
import { getIndustryReference } from '../controllers/industriesController.js';
import { PRIORITY_INDUSTRY_SLUGS, shouldIncludeIndustryInSitemap } from '../helpers/seoPagePolicy.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const visiblePackages = [['start', 'Start', 'ab 799 €'], ['business', 'Business', 'ab 1.499 €'], ['wachstum', 'Wachstum', 'ab 2.499 €'], ['individuell', 'Individuell', 'ab 3.500 € oder nach Aufwand']]
  .map(([slug, name, priceLabel]) => ({ slug, name, priceLabel, canonicalPath: `/pakete/${slug}` }));
const pricing = buildPricingViewModel({ visiblePackages, lowestPackagePriceLabel: '799 €' });

function locals(slug) {
  return {
    canonicalBaseUrl: 'https://www.komplettwebdesign.de',
    canonicalUrl: `https://www.komplettwebdesign.de/branchen/webdesign-${slug}`,
    cssAsset: (file) => `/${file}`,
    jsAsset: (file) => `/${file}`,
    asset: (file) => `/${file}`,
    assetVersion: '1',
    robots: 'index,follow',
    packagePricing: pricing,
    packagePriceLabel: pricing.priceLabel,
    visiblePackages
  };
}

async function render(slug) {
  const pageLocals = locals(slug);
  const model = buildNichePageViewModel(getNichePage(slug), pageLocals);
  const html = await ejs.renderFile(new URL('../views/niche-page.ejs', import.meta.url).pathname, { ...pageLocals, ...model }, {
    includer(name, filename) {
      return /partials\/(header|footer)/.test(name) ? { template: ' ' } : { filename };
    }
  });
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const text = main.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  return { model, html, main, text };
}

test('Reinigung und Blumenladen haben eigene Seiten unter der bisherigen Adresse', () => {
  assert.equal(getNichePage('reinigung')?.page.path, '/branchen/webdesign-reinigung');
  assert.equal(getNichePage('webdesign-blumenladen')?.page.path, '/branchen/webdesign-blumenladen');
  assert.equal(getNichePage('cafe'), null);
  assert.equal(getNichePage('constructor'), null);
  const controller = read('controllers/industriesController.js');
  assert.ok(controller.indexOf('getNichePage(slug)') < controller.indexOf('await getIndustryBySlug(slug)'), 'eigene Seite vor der Datenbank-Vorlage');
});

test('Title, Description und Überschrift treffen die gesuchten Begriffe', async () => {
  const reinigung = await render('reinigung');
  assert.equal(reinigung.model.title, 'Webdesign für Reinigungsfirmen & Gebäudeservice in Berlin');
  assert.match(reinigung.main, /<h1[^>]*>Website für Reinigungsfirmen und Gebäudeservice in Berlin<\/h1>/);
  for (const term of ['Gebäudeservice', 'Gebäudereinigung', 'Reinigungsunternehmen', 'TM Sauber & Mehr']) assert.ok(reinigung.text.includes(term), term);

  const blumen = await render('blumenladen');
  assert.match(blumen.model.title, /^Blumenladen-Website erstellen lassen/);
  assert.match(blumen.main, /<h1[^>]*>Blumenladen-Website erstellen lassen: für Floristen in Berlin<\/h1>/);
  for (const term of ['Onlineshop', 'Florist', 'Gärtnerei', 'Blumenläden']) assert.ok(blumen.text.includes(term), term);

  for (const { model } of [reinigung, blumen]) {
    assert.ok(model.title.length <= 60, model.title);
    assert.ok(model.description.length >= 120 && model.description.length <= 160, model.description);
    assert.match(model.description, /ab 799 €\.$/);
  }
});

test('Seiten rendern ohne offene Platzhalter, mit Preisen und vollständigen strukturierten Daten', async () => {
  for (const slug of Object.keys(NICHE_PAGES)) {
    const { model, html, main, text } = await render(slug);
    assert.doesNotMatch(main, /\{\{|undefined|NaN|\[object/, slug);
    assert.ok(text.split(' ').length > 1300, `${slug}: zu wenig Inhalt`);
    assert.deepEqual(model.packageCards.map((card) => card.price), ['ab 799 €', 'ab 1.499 €', 'ab 2.499 €']);
    assert.match(model.ogImage, /^https:\/\/(www\.komplettwebdesign\.de\/images|res\.cloudinary\.com)\//);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const faqPage = graph.find((node) => node['@type'] === 'FAQPage');
    assert.equal(faqPage.mainEntity.length, model.nicheFaq.length);
    assert.equal(graph.find((node) => node['@type'] === 'BreadcrumbList').itemListElement[2].name, model.nichePage.breadcrumb);
    assert.equal(graph.find((node) => node['@type'] === 'Service').name, model.nichePage.schema.serviceName);
    assert.equal((main.match(/<h1\b/g) || []).length, 1);
  }
});

test('Zahlen auf den Seiten nennen immer ihre Quelle', () => {
  for (const { page } of Object.values(NICHE_PAGES)) {
    for (const section of page.sections.filter((item) => item.type === 'why')) {
      for (const stat of section.stats) assert.ok(stat.source?.trim(), `${page.slug}: ${stat.value}`);
    }
    assert.ok(page.sources.length >= 1);
    for (const source of page.sources) assert.match(source.href, /^https:\/\//);
  }
});

test('Blumenladen: Shop-Angebot passt zu den Paketen, große Shops werden nicht versprochen', async () => {
  const { text } = await render('blumenladen');
  assert.match(text, /Individuell-Paket ab 3\.500 € oder nach Aufwand/);
  assert.match(text, /große Sortimente mit eigenem Shopsystem/);
});

test('Fitness, Makler und Restaurant haben eigene Seiten und stehen bei Google', async () => {
  for (const slug of ['fitnesscoach', 'immobilienmakler', 'restaurant']) {
    assert.ok(getNichePage(slug), slug);
    assert.ok(PRIORITY_INDUSTRY_SLUGS.includes(slug), `${slug} im Index`);
    assert.equal(shouldIncludeIndustryInSitemap({ slug, name: slug }), true, slug);
  }
  const fitness = await render('fitnesscoach');
  assert.match(fitness.model.title, /^Fitnessstudio-Website erstellen lassen/);
  for (const term of ['Fitnessstudio', 'Personal Trainer', 'Probetraining']) assert.ok(fitness.text.includes(term), term);
  const makler = await render('immobilienmakler');
  for (const term of ['Immobilienmakler', 'Bewertung', '§ 34c']) assert.ok(makler.text.includes(term), term);
  const restaurant = await render('restaurant');
  for (const term of ['Speisekarte', 'Reservierung', 'Zur alten Backstube']) assert.ok(restaurant.text.includes(term), term);
});

test('Café-Seite zeigt das echte Projekt', () => {
  const reference = getIndustryReference('cafe');
  assert.equal(reference.name, 'Zur alten Backstube');
  assert.equal(reference.href, '/referenzen/zur-alten-backstube');
  assert.equal(getIndustryReference('reinigung'), null);
  assert.match(read('views/industries/show.ejs'), /industryReference\.quote/);
});

test('Sitemap nimmt für die eigenen Seiten das Datum der Inhalte', () => {
  const sitemap = read('controllers/sitemapController.js');
  assert.match(sitemap, /lastmod: toIso\(industryModified\(r\)\)/);
  assert.match(sitemap, /getNichePage\(r\.slug\)/);
});
