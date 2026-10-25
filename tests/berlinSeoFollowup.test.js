import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rewriteLegacyInternalLinks, resolveLegacyInternalLink } from '../util/legacyInternalLinks.js';
import { FORCED_HEADLINES, FORCED_SEO_TITLES, resolveHeadline, resolveSeoTitle, SHORT_SEO_TITLES } from '../data/seoMetaOverrides.js';
import { ensureContentImageAlt } from '../services/blogPostPresentationService.js';
import { resolveBlogRedirect } from '../data/blogRedirects.js';
import { buildOrganizationSchema } from '../helpers/entitySchema.js';
import { getSeoRecoveryTarget } from '../data/seoIntentRegistry.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const BERLIN_POST = '/blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist';

test('alte Links in Datenbank-Inhalten zeigen direkt aufs Ziel', () => {
  const html = [
    '<a href="/webdesign-berlin">A</a>',
    '<a href="https://www.komplettwebdesign.de/webdesign-berlin/">B</a>',
    "<a href='/webdesign-berlin#Ablauf'>C</a>",
    '<a href="/webdesign-berlin/kreuzberg">D</a>',
    '<a href="/demo/cq-compare/">E</a>',
    '<a href="/website-erstellen-lassen-berlin?x=1">F</a>',
    '<a href="/en/webdesign-berlin">G</a>',
    '<a href="https://example.com/webdesign-berlin">H</a>'
  ].join(' ');
  const out = rewriteLegacyInternalLinks(html);
  assert.match(out, /<a href="\/">A<\/a>/);
  assert.match(out, /<a href="\/">B<\/a>/);
  assert.match(out, /<a href='\/'>C<\/a>/);
  assert.match(out, /href="\/webdesign-berlin\/kreuzberg"/, 'Bezirksseiten bleiben');
  assert.match(out, /href="\/demo\/cq-compare">E/);
  assert.match(out, /href="\/\?x=1">F/);
  assert.match(out, /href="\/en">G/);
  assert.match(out, /href="https:\/\/example\.com\/webdesign-berlin"/, 'fremde Domains bleiben unverändert');
  assert.equal(resolveLegacyInternalLink('/pakete'), null);
  assert.equal(rewriteLegacyInternalLinks(''), '');
});

test('Blog und Ratgeber schreiben alte Links beim Ausliefern um', () => {
  assert.match(read('services/blogPostPresentationService.js'), /rewriteLegacyInternalLinks\(sanitizeArticleHtml/);
  assert.match(read('services/blogPostPresentationService.js'), /return rewriteLegacyInternalLinks\(stripEmbeddedStructuredData/);
  assert.match(read('controllers/ratgeberController.js'), /const renderedContent = rewriteLegacyInternalLinks\(demoteContentH1/);
});

test('die Beiträge zu Webdesign Berlin und Lichtenberg leiten auf die Hauptseiten weiter', () => {
  assert.equal(resolveBlogRedirect(BERLIN_POST.replace('/blog/', '')), '/');
  assert.equal(resolveBlogRedirect('webdesign-lichtenberg-berlin'), '/webdesign-berlin/lichtenberg');
  assert.equal(getSeoRecoveryTarget(BERLIN_POST)?.state, 'redirect');
  assert.equal(getSeoRecoveryTarget('/blog/webdesign-lichtenberg-berlin')?.redirectTo, '/webdesign-berlin/lichtenberg');
  assert.match(rewriteLegacyInternalLinks(`<a href="${BERLIN_POST}">x</a>`), /<a href="\/">x<\/a>/);
  // Feste Titel waren nur eine Zwischenlösung für diese beiden Beiträge.
  assert.deepEqual(FORCED_SEO_TITLES, {});
  assert.deepEqual(FORCED_HEADLINES, {});
  assert.equal(resolveHeadline('/blog/anderer-beitrag', 'Originaltitel'), 'Originaltitel');
});

test('Kurztitel gelten nur bei zu langen gespeicherten Titeln', () => {
  assert.equal(resolveSeoTitle('/blog/beliebig', 'Kurz'), 'Kurz');
  const long = 'Reinigungsfirma Website erstellen Berlin - Webdesign ab 799 € günstig';
  assert.equal(resolveSeoTitle('/branchen/webdesign-reinigung', long), SHORT_SEO_TITLES['/branchen/webdesign-reinigung']);
  assert.match(read('controllers/industriesController.js'), /resolveSeoTitle\(`\/branchen\/webdesign-\$\{industry\.slug \|\| slug\}`/);
});

test('Bilder ohne alt bekommen eine Beschreibung, dekorative Bilder bleiben leer', () => {
  const out = ensureContentImageAlt('<h3>Formular ausfüllen</h3><img src="a.webp"><img src="b.webp" alt=""><img src="c.webp" alt="Da">', 'Titel');
  assert.match(out, /src="a\.webp" alt="Abbildung: Formular ausfüllen"/);
  assert.match(out, /src="b\.webp" alt=""/);
  assert.match(out, /src="c\.webp" alt="Da"/);
  assert.equal(ensureContentImageAlt('<p>ohne Bild</p>'), '<p>ohne Bild</p>');
});

test('das lokale Schema enthält Koordinaten, Öffnungszeiten wie im Google-Profil, Preise und Bezirke', () => {
  const schema = buildOrganizationSchema('https://www.komplettwebdesign.de');
  assert.equal(schema.geo['@type'], 'GeoCoordinates');
  assert.ok(Math.abs(schema.geo.latitude - 52.52) < 0.01 && Math.abs(schema.geo.longitude - 13.48) < 0.01);
  assert.equal(schema.priceRange, 'ab 799 €');
  assert.match(schema.hasMap, /maps\.app\.goo\.gl/);
  const hours = schema.openingHoursSpecification.map((slot) => `${slot.dayOfWeek.map((d) => d.replace('https://schema.org/', '')).join('+')} ${slot.opens}-${slot.closes}`);
  assert.deepEqual(hours, ['Tuesday+Thursday 16:00-21:00', 'Saturday+Sunday 10:00-18:00']);
  const areas = schema.areaServed.map((area) => area.name);
  for (const district of ['Berlin-Friedrichshain', 'Berlin-Kreuzberg', 'Berlin-Prenzlauer-Berg', 'Berlin-Charlottenburg', 'Berlin-Lichtenberg', 'Berlin-Mitte']) {
    assert.ok(areas.includes(district), district);
  }
  assert.equal(areas[0], 'Berlin');
});

test('Startseite und Navigation: Brotkrumen „Webdesign Berlin“, Bilder mit festen Maßen', () => {
  assert.match(read('views/index.ejs'), /name: isEn \? 'Web design Berlin' : 'Webdesign Berlin',\s*item: schemaHomeUrl/);
  const header = read('views/partials/header.ejs');
  assert.doesNotMatch(header, /<img src="<%= navIcon\([^)]*\) %>" alt="" aria-hidden="true" loading="lazy" \/>/);
  assert.match(header, /alt="" aria-hidden="true" width="24" height="24" loading="lazy"/);
  assert.match(header, /LogoTransparent\.webp" alt="Komplett Webdesign" width="480" height="480"/);
  assert.match(read('public/css/main.css'), /\.logo img \{\s*height: 70px;\s*width: auto;/);
  assert.match(read('data/leistungenOverviewPage.js'), /title: 'Webdesign-Leistungen im Überblick \| Komplett Webdesign'/);
});
