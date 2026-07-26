import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
const template = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');

function indexOfRequired(source, marker) {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `${marker} fehlt`);
  return index;
}

test('die deutsche Startseite beginnt mit Nutzen, Angebot und zwei eindeutigen Handlungen', () => {
  assert.match(controller, /heroTitle:\s*'Website erstellen lassen in Berlin – persönlich, SEO-freundlich und aus einer Hand'/);
  assert.match(controller, /Komplett Webdesign plant, gestaltet und betreut Websites für kleine Unternehmen in Berlin/);
  assert.match(controller, /heroCtaPrimary:\s*'Beratungsgespräch anfragen'/);
  assert.match(controller, /heroCtaSecondary:\s*'Pakete ansehen'/);
});

test('die sichtbare Startseitenfolge führt von Bedarf über Angebot zu Belegen und Anfrage', () => {
  const orderedMarkers = [
    'id="hero"',
    'id="usp-strip"',
    'id="passt"',
    'id="leistungen"',
    'id="preise"',
    'id="branchenwege"',
    'id="ablauf"',
    'id="trust"',
    'id="website-check"',
    'id="faq"',
    'id="technik"',
    'id="cta"'
  ];

  let previous = -1;
  for (const marker of orderedMarkers) {
    const current = indexOfRequired(template, marker);
    assert.ok(current > previous, `${marker} steht an der falschen Position`);
    previous = current;
  }
});

test('die Startseite bietet vier bebilderte Wege zu vorhandenen Branchenseiten', () => {
  const section = template.match(/<section class="section" id="branchenwege"[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(section);

  for (const href of [
    '/handwerker',
    '/branchen/webdesign-immobilienmakler',
    '/branchen/webdesign-blumenladen',
    '/branchen/webdesign-cafe'
  ]) {
    assert.match(section, new RegExp(`href="${href}"`));
  }

  assert.equal((section.match(/<img\b/g) || []).length, 4);
  assert.doesNotMatch(section, /<img[^>]+alt=""/);
});
