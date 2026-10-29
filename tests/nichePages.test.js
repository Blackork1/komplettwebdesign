import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ejs from 'ejs';

import { NICHE_PAGES, buildNichePageViewModel, getNichePage } from '../services/nichePageViewModel.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';
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
  assert.equal(getNichePage('kita'), null);
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
      for (const stat of section.stats || []) assert.ok(stat.source?.trim(), `${page.slug}: ${stat.value}`);
    }
    const hasNumbers = page.sections.some((item) => item.type === 'why' && item.stats?.length);
    if (hasNumbers) assert.ok(page.sources.length >= 1, `${page.slug}: Zahlen ohne Quellenangabe`);
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

test('Café-Seite hat eigenen Inhalt mit dem echten Projekt Zur alten Backstube', async () => {
  assert.ok(getNichePage('cafe'));
  const cafe = await render('cafe');
  assert.match(cafe.model.title, /^Café-Website erstellen lassen/);
  for (const term of ['Zur alten Backstube', 'Karte als Text', 'Reservierung', 'Torte']) assert.ok(cafe.text.includes(term), term);
  assert.doesNotMatch(read('views/industries/show.ejs'), /industryReference/, 'Vorlage braucht keinen Referenz-Block mehr');
});

// Die zehn Branchen, die bis 29.10.2026 noch die Datenbank-Vorlage nutzten, mit Hauptbegriff aus der Analyse
// (docs/seo/content-briefs/2026-10-29-branchen) und Begriffen, nach denen ihre Kundschaft sucht.
const REWORKED_INDUSTRIES = {
  arzt: { title: /^Arztpraxis-Website erstellen lassen/, terms: ['Sprechzeiten', 'neue Patienten', 'Rezept', '§ 5 DDG', 'GOÄ', 'Bitkom'] },
  physiotherapie: { title: /^Physiotherapie-Website erstellen lassen/, terms: ['Hausbesuche', 'Verordnung', 'Krankengymnastik', 'Heilpraktikererlaubnis', '280 Tage'] },
  hebamme: { title: /^Hebammen-Website erstellen lassen/, terms: ['Geburtstermin', 'Wochenbett', 'Geburtsvorbereitungskurs', '§ 24d SGB V', 'ammely'] },
  steuerberater: { title: /^Steuerberater-Website erstellen lassen/, terms: ['freie Kapazitäten', '§ 57a', 'DATEV', 'Berufshaftpflicht', '89.549'] },
  autowerkstatt: { title: /^Kfz-Werkstatt-Website erstellen lassen/, terms: ['Inspektion', 'HU', 'Samstag', 'Preisangabenverordnung', '10,9 Jahre'] },
  friseur: { title: /^Friseur-Website erstellen lassen/, terms: ['ohne Termin', 'Barber', 'Preisliste', '§ 12 PAngV', '80.118'] },
  beautysalon: { title: /^Kosmetikstudio-Website erstellen lassen/, terms: ['Nagelstudio', 'Wimpernverlängerung', 'Vorher-Nachher', 'Gutscheine'] },
  fotograf: { title: /^Fotografen-Website erstellen lassen/, terms: ['Hochzeitsfotograf', 'Bewerbungsfotos', 'Portfolio', 'Einwilligung', 'Nutzungsrechte'] },
  tattoo: { title: /^Tattoo-Studio-Website erstellen lassen/, terms: ['Walk-in', 'Anzahlung', 'Fineline', 'Mindestalter', 'REACH'] },
  wellness: { title: /^Massage-Website erstellen lassen/, terms: ['Massage Gutschein', 'Day Spa', 'Heilmittelwerbegesetz', 'Masseur', 'drei Jahre'] }
};

test('Die zehn überarbeiteten Branchen haben eigene Seiten, stehen im Index und treffen die Suchbegriffe', async () => {
  for (const [slug, expected] of Object.entries(REWORKED_INDUSTRIES)) {
    assert.ok(getNichePage(slug), `${slug}: eigene Seite`);
    assert.equal(getNichePage(slug).page.path, `/branchen/webdesign-${slug}`);
    assert.ok(PRIORITY_INDUSTRY_SLUGS.includes(slug), `${slug} im Index`);
    assert.equal(shouldIncludeIndustryInSitemap({ slug, name: slug }), true, slug);

    const { model, text } = await render(slug);
    assert.match(model.title, expected.title, slug);
    assert.ok(model.title.length <= 60, `${slug}: Title zu lang (${model.title.length})`);
    assert.ok(model.description.length >= 120 && model.description.length <= 160, `${slug}: Description ${model.description.length}`);
    assert.match(model.description, /ab 799 €\.$/, slug);
    assert.ok(model.nicheFaq.length >= 10, `${slug}: zu wenige Fragen`);
    for (const term of expected.terms) assert.ok(text.includes(term), `${slug}: „${term}“ fehlt`);
    assert.ok(model.nichePage.sources.length >= 3, `${slug}: zu wenige Quellen`);
    assert.doesNotMatch(text, /\b(?:Ihnen|Ihrer|Ihrem|Ihren)\b|\b(?:können|möchten|haben|kontaktieren|erhalten) Sie\b/, `${slug}: Seite duzt durchgehend`);
  }
});

test('Branchenübersicht zeigt Titel, Text und Foto der eigenen Seiten statt der alten Vorlage', async () => {
  const { buildIndustryGroups } = await import('../controllers/industriesController.js');
  const groups = buildIndustryGroups(Object.keys(REWORKED_INDUSTRIES).map((slug) => ({ slug, name: slug, title: 'Alter Titel', description: 'Alter Text' })));
  const items = groups.flatMap((group) => group.items).filter((item) => item.href !== '/handwerker');
  assert.equal(items.length, 10);
  for (const item of items) {
    assert.match(item.title, /^Website für /);
    assert.doesNotMatch(item.description, /Alter Text|\{\{/);
    assert.match(item.image.src, /c_fill,w_720,h_540/);
  }
  const groupOf = (href) => groups.find((group) => group.items.some((item) => item.href === href))?.key;
  assert.equal(groupOf('/branchen/webdesign-hebamme'), 'appointments');
  assert.equal(groupOf('/branchen/webdesign-autowerkstatt'), 'local-services');
  assert.equal(groupOf('/branchen/webdesign-steuerberater'), 'consulting-real-estate');
});

test('Sitemap nimmt für die eigenen Seiten das Datum der Inhalte', () => {
  const sitemap = read('controllers/sitemapController.js');
  assert.match(sitemap, /lastmod: toIso\(industryModified\(r\)\)/);
  assert.match(sitemap, /getNichePage\(r\.slug\)/);
});
