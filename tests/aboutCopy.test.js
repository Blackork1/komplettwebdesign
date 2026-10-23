import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { load } from 'cheerio';
import { referenceProjects } from '../data/referenceProjects.js';

async function renderAbout(baseUrl = 'https://www.komplettwebdesign.de') {
  const { getAbout } = await import('../controllers/mainController.js');
  let model;
  await getAbout({}, {
    locals: { canonicalBaseUrl: baseUrl },
    render(view, values) { assert.equal(view, 'about'); model = values; }
  });
  const html = await ejs.renderFile(fileURLToPath(new URL('../views/about.ejs', import.meta.url)), model, {
    includer(name, filename) { return name.startsWith('partials/') ? { template: ' ' } : { filename }; }
  });
  return { model, $: load(html) };
}

test('about page introduces the person and offers a direct next step before the project proof', async () => {
  const { $ } = await renderAbout();
  assert.equal($('main').length, 1);
  assert.equal($('h1').length, 1);
  assert.match($('h1').text().replace(/\s+/g, ' '), /Ich bin Sören\. Dein Webdesigner in Berlin\./);
  const hero = $('#about-hero');
  assert.equal(hero.find('a[href="/booking"]').text().trim(), 'Kennenlerngespräch vereinbaren');
  assert.ok(hero.find('a[href="#meine-arbeit"]').length);
  for (const link of $('main a[href^="#"]').toArray()) {
    assert.equal($(`[id="${$(link).attr('href').slice(1)}"]`).length, 1, 'every in-page action has an unambiguous target');
  }
});

test('about page shows documented projects and an attributed customer quote', async () => {
  const { $ } = await renderAbout();
  const project = referenceProjects.find(item => item.slug === 'zur-alten-backstube');
  const proof = $('#meine-arbeit');
  assert.ok(proof.find('a[href="/referenzen/zur-alten-backstube"]').length);
  assert.ok(proof.find('a[href="/referenzen/tm-sauber-mehr"]').length);
  assert.equal(proof.find('blockquote p').text().trim(), project.quote);
  assert.ok(proof.find('figcaption').text().includes(project.quoteAuthor));
  assert.ok(proof.find(`img[src="${project.image}"]`).length);
  for (const image of $('main img').toArray()) {
    assert.ok(Number($(image).attr('width')) > 0);
    assert.ok(Number($(image).attr('height')) > 0);
    assert.ok($(image).attr('alt'));
  }
});

test('about page explains scope and answers practical questions without stale biography or result claims', async () => {
  const { $ } = await renderAbout();
  const text = $('main').text().replace(/\s+/g, ' ');
  assert.equal($('main details').length, 3);
  assert.equal($('main details summary').length, 3);
  assert.match(text, /Hosting, Domain, E-Mail und Wartung/);
  assert.match(text, /separat vereinbart/);
  assert.ok($('main a[href="/pakete"]').length);
  assert.ok($('main a[href="/kontakt"]').length);
  assert.ok($('main a[href="tel:+4915511245048"]').length);
  assert.doesNotMatch(text, /29 Jahre|über 10 Jahre|Halbmarathon|Nachteule|Dutzenden realisierten Projekten|garantierte Google-Rankings/);
});

test('about metadata and graph identify the canonical person and organization consistently', async () => {
  const { model } = await renderAbout('https://www.komplettwebdesign.de/');
  assert.match(model.title, /Sören.*Webdesigner.*Berlin/);
  assert.ok(model.description.length >= 120 && model.description.length <= 165);
  const about = model.structuredDataBlocks.find(node => node['@type'] === 'AboutPage');
  assert.equal(about.url, 'https://www.komplettwebdesign.de/about');
  assert.equal(about.mainEntity['@id'], 'https://www.komplettwebdesign.de/#person');
  assert.equal(about.about['@id'], 'https://www.komplettwebdesign.de/#organization');
  assert.equal(about.dateModified, '2026-10-23');
  const breadcrumbs = model.structuredDataBlocks.find(node => node['@type'] === 'BreadcrumbList');
  assert.deepEqual(breadcrumbs.itemListElement.map(item => item.item), [
    'https://www.komplettwebdesign.de/', 'https://www.komplettwebdesign.de/about'
  ]);
});

test('about examples show the requested 2026 festival edition, video pages and the Sauber contact flow', async () => {
  const { $ } = await renderAbout();
  const festival = $('#projekt-kurdisches-filmfestival');
  assert.equal(festival.length, 1);
  assert.match(festival.find('h3').text(), /Kurdisches Filmfestival/);
  assert.ok(festival.find('img[src$="startseite-2026.webp"]').length);
  assert.ok(festival.find('img[src$="video-2026.webp"]').length);
  assert.ok(festival.find('img[src$="mediathek-2026.webp"]').length);
  assert.ok(festival.find('a[href="https://www.kurdisches-filmfestival.de/archiv2026/de"]').length);
  assert.ok(festival.find('a[href="https://www.kurdisches-filmfestival.de/archiv2026/video-de"]').length);
  const sauber = $('#projekt-tm-sauber-mehr');
  assert.equal(sauber.length, 1);
  assert.ok(sauber.find('img[src$="kontakt.webp"]').length);
  assert.ok(sauber.find('a[href="https://www.sauber-mehr.de/kontakt"]').length);
  assert.match(sauber.text(), /Schritt für Schritt/);
});
