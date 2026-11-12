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
  assert.equal(getNichePage('schule'), null);
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

test('Kita-Seite: eigene Inhalte für Kitas und Kindertagespflege, im Index, mit Bildplätzen und dezenter Bewegung', async () => {
  const kita = getNichePage('kita');
  assert.equal(kita?.page.path, '/branchen/webdesign-kita');
  assert.equal(getNichePage('webdesign-kita'), kita);
  assert.ok(PRIORITY_INDUSTRY_SLUGS.includes('kita'));
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'kita', name: 'Kita', title: 'Kita Website erstellen Berlin - Webdesign für Kindergärten' }), true);

  const { model, html, main, text } = await render('kita');
  assert.match(model.title, /^Kita-Website erstellen lassen/);
  assert.ok(model.title.length <= 60, model.title);
  assert.ok(model.description.length >= 120 && model.description.length <= 160, `Description ${model.description.length}`);
  assert.match(model.description, /ab 799 €\.$/);
  assert.match(main, /<h1[^>]*>Website für Kitas, Kinderläden und Tagesmütter in Berlin<\/h1>/);
  assert.ok(model.nicheFaq.length >= 10);
  assert.ok(model.nichePage.sources.length >= 3);
  for (const term of ['Kita-Website', 'Kita-Homepage', 'Internetseite', 'Kindertagesstätte', 'Kindergarten', 'Kinderladen', 'Krippe', 'Hort', 'Tagesmutter', 'Tagesvater', 'Kindertagespflege', 'Großtagespflege', 'Elterninitiative', 'Förderverein', 'Kita-Gutschein', 'Kita-Navigator', 'Eingewöhnung', 'Tagesablauf', 'Platzanfrage', 'Erzieher']) {
    assert.ok(text.includes(term), `„${term}“ fehlt`);
  }
  assert.doesNotMatch(text, /\b(?:Ihnen|Ihrer|Ihrem|Ihren)\b|\b(?:können|möchten|haben|kontaktieren|erhalten) Sie\b/);
  assert.doesNotMatch(text, /[–—]/, 'keine Gedankenstriche im Text');

  // Bildplätze: feste Dateien mit Maßen, damit später Fotos an dieselbe Stelle können.
  const allImages = [...main.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  const images = allImages.filter((image) => image.includes('/images/branchen/kita/'));
  const expected = { 'kita-hero.webp': [960, 640], 'kita-tagespflege.webp': [720, 540], 'kita-raeume.webp': [720, 540], 'kita-garten.webp': [720, 540], 'kita-team.webp': [720, 540] };
  assert.equal(images.length, Object.keys(expected).length);
  for (const [file, [width, height]] of Object.entries(expected)) {
    const tag = images.find((image) => image.includes(`/images/branchen/kita/${file}`));
    assert.ok(tag, file);
    assert.ok(tag.includes(`width="${width}"`) && tag.includes(`height="${height}"`), `${file}: Maße`);
    assert.match(tag, /alt="[^"]{20,}"/, `${file}: Alt-Text`);
    assert.ok(readFileSync(new URL(`../public/images/branchen/kita/${file}`, import.meta.url)).length > 1000, `${file} liegt im Repo`);
  }
  assert.equal(allImages.filter((image) => image.includes('fetchpriority="high"')).length, 1, 'nur das Hero-Bild lädt bevorzugt');
  assert.match(images.find((image) => image.includes('kita-hero.webp')), /fetchpriority="high"/);
  assert.equal(images.filter((image) => image.includes('loading="lazy"')).length, 4);

  // Bewegung: gemeinsames Stylesheet, Einblenden über slideOnScroll, Hero ohne Animation.
  assert.match(html, /<link[^>]+branchen-page\.css/);
  assert.match(main, /<main class="[^"]*niche-page--motion niche-page--tone-pastell"/);
  assert.match(main, /class="wd-section-head animate-on-scroll"/);
  assert.match(main, /<ol class="niche-page__timeline"/);
  assert.equal((main.match(/class="niche-page__timeline-item animate-on-scroll"/g) || []).length, 6);
  assert.doesNotMatch(main.slice(0, main.indexOf('</section>')), /animate-on-scroll/, 'Hero bleibt sofort sichtbar');
  const css = read('public/branchen-page.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /html:not\(\.kwd-interaction-polish\) \.webdesign-berlin\.niche-page--motion \.animate-on-scroll/);
  assert.doesNotMatch(css, /font-family|@font-face/);

  const hebamme = await render('hebamme');
  assert.ok(hebamme.main.includes('href="/branchen/webdesign-kita"'), 'Hebammen-Seite verlinkt die Kita-Seite');
});

// Seit November 2026 teilen sich alle Branchenseiten das Design der Kita-Seite: Farbton je Branche,
// Zeitleiste, Bildkarten und dezente Bewegung (public/branchen-page.css).
test('Alle Branchenseiten: Farbton, Zeitleiste, Beispielbilder und dezente Bewegung', async () => {
  const css = read('public/branchen-page.css');
  for (const [key, { page }] of Object.entries(NICHE_PAGES)) {
    const { html, main, text } = await render(page.slug);
    assert.equal(page.motion, true, `${key}: Bewegung aktiv`);
    assert.ok(css.includes(`.niche-page--tone-${page.tone}`) || page.tone === 'pastell', `${key}: Farbton ${page.tone} ist im Stylesheet definiert`);
    assert.match(main, new RegExp(`<main class="[^"]*niche-page--motion niche-page--tone-${page.tone}"`), `${key}: Klassen am Hauptbereich`);
    assert.match(html, /<link[^>]+branchen-page\.css/, `${key}: gemeinsames Stylesheet`);
    assert.doesNotMatch(main.slice(0, main.indexOf('</section>')), /animate-on-scroll/, `${key}: Hero bleibt sofort sichtbar`);

    const types = page.sections.map((section) => section.type);
    for (const type of ['timeline', 'feature', 'gallery']) assert.ok(types.includes(type), `${key}: Abschnitt ${type}`);
    assert.equal(page.sections.find((section) => section.type === 'timeline').items.length, 6, `${key}: sechs Stationen`);
    assert.equal(page.sections.find((section) => section.type === 'gallery').items.length, 3, `${key}: drei Bildkarten`);
    assert.equal(new Set(page.sections.map((section) => section.id)).size, page.sections.length, `${key}: Abschnitts-IDs sind eindeutig`);

    // Bildplätze: lokale Dateien mit festen Maßen, damit später echte Fotos an dieselbe Stelle können.
    const allImages = [...main.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
    const local = allImages.filter((image) => image.includes(`/images/branchen/${page.slug}/`) && !image.includes('-hero'));
    assert.equal(local.length, 4, `${key}: vier Bildplätze`);
    for (const tag of local) {
      const file = tag.match(/src="\/(images\/branchen\/[^"]+\.webp)"/)?.[1];
      assert.ok(file, `${key}: lokales WebP`);
      assert.ok(tag.includes('width="720"') && tag.includes('height="540"'), `${file}: Maße`);
      assert.match(tag, /alt="[^"]{20,}"/, `${file}: Alt-Text`);
      assert.match(tag, /loading="lazy"/, `${file}: lädt verzögert`);
      assert.ok(readFileSync(new URL(`../public/${file}`, import.meta.url)).length > 1000, `${file} liegt im Repo`);
    }
    assert.equal(allImages.filter((image) => image.includes('fetchpriority="high"')).length, 1, `${key}: nur das Hero-Bild lädt bevorzugt`);
    assert.doesNotMatch(text, /\{\{|undefined|NaN|\[object/, `${key}: keine Platzhalter im Text`);
  }
});

test('Branchenübersicht zeigt die Kita-Seite mit eigener Karte', async () => {
  const { buildIndustryGroups } = await import('../controllers/industriesController.js');
  const groups = buildIndustryGroups([{ slug: 'kita', name: 'Kita', title: 'Kita Website erstellen Berlin - Webdesign für Kindergärten ab 499€', description: 'Alter Text' }]);
  const group = groups.find((entry) => entry.items.some((item) => item.href === '/branchen/webdesign-kita'));
  assert.equal(group.key, 'appointments');
  const card = group.items.find((item) => item.href === '/branchen/webdesign-kita');
  assert.equal(card.title, 'Website für Kitas und Tagesmütter');
  assert.doesNotMatch(card.description, /Alter Text|\{\{|499/);
  assert.equal(card.image.src, '/images/branchen/kita/kita-hero-720.webp');
  assert.ok(readFileSync(new URL('../public/images/branchen/kita/kita-hero-720.webp', import.meta.url)).length > 1000);
  assert.match(read('controllers/industriesController.js'), /return \['schule', 'schulen', 'school', 'schools'\]/);
});

test('Sitemap nimmt für die eigenen Seiten das Datum der Inhalte', () => {
  const sitemap = read('controllers/sitemapController.js');
  assert.match(sitemap, /lastmod: toIso\(industryModified\(r\)\)/);
  assert.match(sitemap, /getNichePage\(r\.slug\)/);
});

test('Jede Branchenseite verlinkt drei verwandte Branchen und wird selbst von einer anderen verlinkt', async () => {
  const { INDUSTRY_DIRECTORY, RELATED_INDUSTRIES } = await import('../data/industryDirectory.js');
  const nicheKeys = Object.keys(NICHE_PAGES);
  assert.deepEqual(Object.keys(RELATED_INDUSTRIES).sort(), [...nicheKeys].sort(), 'jede eigene Branchenseite hat Nachbarn');
  for (const key of [...nicheKeys, 'handwerker']) {
    assert.ok(INDUSTRY_DIRECTORY[key], `${key} steht im Verzeichnis`);
    assert.ok(PRIORITY_INDUSTRY_SLUGS.includes(key), `${key} ist indexierbar`);
  }
  for (const [key, related] of Object.entries(RELATED_INDUSTRIES)) {
    assert.equal(related.length, 3, key);
    assert.equal(new Set(related).size, 3, `${key}: keine doppelten Nachbarn`);
    assert.ok(!related.includes(key), `${key}: verlinkt sich nicht selbst`);
    for (const target of related) assert.ok(INDUSTRY_DIRECTORY[target], `${key} → ${target}`);
  }
  for (const key of nicheKeys) {
    const inbound = Object.entries(RELATED_INDUSTRIES).filter(([, related]) => related.includes(key)).length;
    assert.ok(inbound >= 1, `${key}: mindestens eine andere Branchenseite verlinkt`);
  }
  const { main } = await render('steuerberater');
  assert.match(main, /<section id="verwandte-branchen"/);
  for (const href of ['/branchen/webdesign-immobilienmakler', '/branchen/webdesign-arzt', '/branchen/webdesign-physiotherapie']) {
    assert.ok(main.includes(`href="${href}"`), href);
  }
});

test('Startseite und Local-SEO-Seite verlinken jede Branchenseite', async () => {
  const { INDUSTRY_DIRECTORY, HOME_FEATURED_INDUSTRIES, homeMoreIndustries } = await import('../data/industryDirectory.js');
  const home = read('views/index.ejs');
  const featured = HOME_FEATURED_INDUSTRIES.map((key) => INDUSTRY_DIRECTORY[key].href);
  for (const href of featured) assert.ok(home.includes(`href: '${href}'`), `Karte für ${href}`);
  const more = homeMoreIndustries().map((item) => item.href);
  assert.deepEqual([...featured, ...more].sort(), Object.values(INDUSTRY_DIRECTORY).map((item) => item.href).sort());
  assert.match(home, /homeMoreIndustryLinks\.forEach/);
  assert.match(read('controllers/mainController.js'), /homeMoreIndustries: homeMoreIndustries\(\)/);

  const { localSeoPage } = await import('../data/localSeoPage.js');
  assert.deepEqual(localSeoPage.targetGroups.industries.map((item) => item.href), Object.values(INDUSTRY_DIRECTORY).map((item) => item.href));

  const { CONTENT_AGENT_LINKS } = await import('../data/contentAgentLinks.js');
  for (const { href } of Object.values(INDUSTRY_DIRECTORY)) {
    assert.ok(CONTENT_AGENT_LINKS.some((link) => link.url === href), `Content-Agent kennt ${href}`);
  }
});
