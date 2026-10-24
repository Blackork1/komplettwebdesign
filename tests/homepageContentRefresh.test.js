import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { load } from 'cheerio';
import { render } from 'ejs';

import { HOME_PROJECTS, localizedHomeProjects } from '../data/homeProjects.js';
import { referenceProjects } from '../data/referenceProjects.js';
import { MARKETING_IMAGES } from '../data/marketingImages.js';
import { buildHomeHeroBridgeHighlights } from '../data/homeHighlights.js';

const template = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
const publicFile = (path) => new URL(`../public${path}`, import.meta.url);

function section(id) {
  const match = template.match(new RegExp(`<section class="section" id="${id}"[\\s\\S]*?<\\/section>`));
  assert.ok(match, `Abschnitt ${id} fehlt`);
  return match[0];
}

function renderProjects(lng = 'de') {
  const projectBlock = template.match(/<% const homeProjectList[\s\S]*?<\/section>\n    <% } %>/)?.[0];
  assert.ok(projectBlock, 'Projektblock fehlt');
  const source = projectBlock;
  return load(render(source, { isEn: lng === 'en', homeProjects: localizedHomeProjects(lng) }));
}

test('der Hero zeigt echte Kundenprojekte statt eines Beispiel-Entwurfs', () => {
  assert.doesNotMatch(template, /klarblick/i);
  assert.doesNotMatch(controller, /klarblick/i);
  assert.equal(MARKETING_IMAGES.homeHero.src, '/images/home-hero-sauber-desktop.webp');
  for (const image of ['home-hero-sauber-desktop.webp', 'home-hero-sauber-kontakt.webp', 'home-hero-backstube-mobile.webp']) {
    const file = publicFile(`/images/${image}`);
    assert.equal(existsSync(file), true, `${image} fehlt`);
    assert.ok(statSync(file).size < 120_000, `${image} ist zu groß`);
  }
  assert.match(template, /Echte Kundenprojekte: TM Sauber & Mehr und Zur alten Backstube/);
});

test('die Projekte stammen aus den echten Referenzen und verlinken dorthin', () => {
  const referenceSlugs = referenceProjects.map((project) => project.slug);
  assert.equal(HOME_PROJECTS.length, 3);
  for (const project of HOME_PROJECTS) {
    assert.ok(referenceSlugs.includes(project.slug), `${project.slug} ist keine Referenz`);
    assert.equal(project.href, `/referenzen/${project.slug}`);
    assert.equal(existsSync(publicFile(project.image)), true, `${project.image} fehlt`);
    assert.ok(project.de.before && project.de.after && project.en.before && project.en.after);
  }

  const $ = renderProjects('de');
  assert.equal($('.home-project-card').length, 3);
  assert.deepEqual(
    $('.home-project-card h3 a').map((_i, el) => $(el).attr('href')).get(),
    ['/referenzen/zur-alten-backstube', '/referenzen/tm-sauber-mehr', '/referenzen/kurdisches-filmfestival']
  );
  assert.match($('#projekte').text(), /Es ist jetzt viel einfacher Tische zu reservieren/);
  assert.equal($('#projekte a[href="/referenzen"]').length, 1);

  const $en = renderProjects('en');
  assert.match($en('#home-projects-title').text(), /Real projects/);
  assert.doesNotMatch($en('#projekte').text(), /Vorher|Nachher|Projekt ansehen/);
});

test('es wird mit Erfahrung geworben, nicht mit einer Projektanzahl', () => {
  const about = section('ueber-mich');
  assert.match(about, /Seit 5 Jahren baue ich Websites für kleine Unternehmen/);
  assert.match(about, /\/images\/meinAvatar\.webp/);
  assert.match(about, /Berlin-Lichtenberg/);
  assert.doesNotMatch(about, /24 Stunden/);
  assert.doesNotMatch(`${template}\n${controller}`, /\d+\+?\s+(abgeschlossene\s+)?Projekte/);
  assert.match(controller, /Seit 5 Jahren plane, gestalte und betreue ich Websites/);
  assert.ok(template.indexOf('id="ueber-mich"') < template.indexOf('id="trust"'));
});

test('weniger Einschränkungen, mehr Nutzen: Grenzen stehen gebündelt in der FAQ', () => {
  assert.doesNotMatch(template, /Nicht ideal, wenn|Kein Ersatz für ein Audit|'Keine Garantie'|kein Ranking-Versprechen|keine Billigangebote/);
  assert.doesNotMatch(section('technik'), /keine Ranking-, Anfrage- oder Umsatzgarantien/);
  assert.doesNotMatch(section('usp-strip'), /Node\.js/);
  assert.match(section('technik'), /Schnell, sicher und ohne Plugin-Stress/);
  assert.match(section('passt'), /Das hast du davon/);
  assert.ok((template.match(/separat/g) || []).length <= 2, 'zu viele „separat“ im Template');

  assert.match(controller, /Gibt es eine Ranking-Garantie\?/);
  assert.match(controller, /keine Rechtsberatung/);
});

test('die FAQ beantwortet Selbstpflege, laufende Kosten und Feedbackrunden konkret', () => {
  assert.match(controller, /q: 'Kann ich Texte später selbst ändern\?'/);
  assert.match(controller, /Ja, auf Wunsch\. Ich richte dir dann eine einfache Verwaltung ein/);
  assert.match(controller, /Hosting gibt es ab 5 € im Monat, Domain und E-Mail ab 6 € im Monat/);
  assert.match(controller, /Start enthält 1 Feedbackrunde, Business 2 und Wachstum 2 bis 3/);
  assert.match(controller, /Hosting starts at 5 EUR per month, domain and email at 6 EUR per month/);

  const scope = section('enthalten-optional');
  assert.match(scope, /Hosting ab 5 € im Monat, Domain und E-Mail ab 6 € im Monat/);
  assert.match(scope, /href="\/leistungen\/website-wartung"/);
  assert.match(scope, /href="\/leistungen\/laufende-kosten-website"/);
  assert.doesNotMatch(scope, /home-list--caution/);
});

test('das Laufband nennt Vorteile statt Fachbegriffe', () => {
  const labels = buildHomeHeroBridgeHighlights({ lng: 'de', lowestPackagePriceLabel: '799 €' }).map((item) => item.label);
  assert.ok(labels.includes('Seit 5 Jahren Webdesign'));
  assert.ok(labels.includes('Hosting ab 5 € im Monat'));
  assert.ok(labels.includes('Texte auf Wunsch selbst ändern'));
  assert.ok(!labels.some((label) => /Node\.js|EJS|HTML|CSS|JavaScript/.test(label)));
});

test('der erste Abschnitt verlinkt die Berliner Hauptseite in einem vollständigen Satz', () => {
  assert.match(section('usp-strip'), /Du möchtest deine <a href="\/webdesign-berlin">Website erstellen lassen in Berlin<\/a>\?/);
  assert.doesNotMatch(template, /Wenn du <a href="\/webdesign-berlin">Website erstellen lassen in Berlin<\/a> möchtest/);
});

test('auf dem Handy steht das Über-mich-Foto klein neben der Überschrift', () => {
  const css = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');
  const about = section('ueber-mich');
  // Foto, Kopf (Kicker + H2) und Text sind getrennte Rasterbereiche.
  assert.match(about, /class="home-about__photo"[\s\S]*?class="home-about__head"[\s\S]*?<h2 id="home-about-title">[\s\S]*?class="home-about__body"/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.home-about\s*\{[\s\S]*?"photo head"\s*"body body";[\s\S]*?grid-template-columns:\s*88px minmax\(0, 1fr\);/);
  // .home-page img setzt max-width: 100 %; die Foto-Regel braucht mindestens dieselbe Spezifität.
  assert.match(css, /\.home-page \.home-about__photo\s*\{[^}]*max-width:\s*88px;/);
  assert.doesNotMatch(css, /^\.home-about__photo\s*\{/m);
});
