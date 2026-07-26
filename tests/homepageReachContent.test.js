import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from 'cheerio';
import { render } from 'ejs';
import postcss from 'postcss';

import { MARKETING_IMAGES } from '../data/marketingImages.js';

const controller = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
const template = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');

function indexOfRequired(source, marker) {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `${marker} fehlt`);
  return index;
}

function getIndustrySectionTemplate() {
  const section = template.match(
    /<section class="section" id="branchenwege"[\s\S]*?<\/section>/
  )?.[0];
  assert.ok(section, 'Branchenbereich fehlt');
  return section;
}

function renderIndustrySection(lng = 'de') {
  return render(getIndustrySectionTemplate(), {
    isEn: lng === 'en',
    homeMarketingImages: MARKETING_IMAGES
  });
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

test('die Startseite rendert vier vorhandene Branchenpfade ohne Handwerk', () => {
  const $ = load(renderIndustrySection('de'));
  const cards = $('#branchenwege .home-industry-story');

  assert.equal(cards.length, 4);
  assert.deepEqual(
    cards.map((_index, element) => $(element).attr('href')).get(),
    [
      '/branchen/webdesign-fitnesscoach',
      '/branchen/webdesign-immobilienmakler',
      '/branchen/webdesign-blumenladen',
      '/branchen/webdesign-cafe'
    ]
  );
  assert.equal($('#branchenwege a[href="/handwerker"]').length, 0);
  assert.doesNotMatch($('#branchenwege').text(), /\bHandwerk\b/i);
  assert.equal($('#branchenwege img').length, 4);
  assert.ok($('#branchenwege img').toArray().every((image) => $(image).attr('alt')?.trim()));
  assert.equal(
    $('#branchenwege .home-industry-overview-link').attr('href'),
    '/branchen'
  );
});

test('der englische Branchenbereich enthält vollständig englische Beschriftungen', () => {
  const $ = load(renderIndustrySection('en'));
  const text = $('#branchenwege').text().replace(/\s+/g, ' ').trim();

  assert.equal(
    $('#home-industry-title').text().trim(),
    'Four industries. Four different paths to an enquiry.'
  );
  assert.match(text, /Health & Coaching/);
  assert.match(text, /Real Estate/);
  assert.match(text, /Florists/);
  assert.match(text, /Cafés & Hospitality/);
  assert.match(text, /Compare all industry solutions/);
  assert.doesNotMatch(text, /Branchenlösungen|Gesundheit|Immobilien|Blumenladen|Öffnungszeiten/);
});

test('die vier Bildgeschichten wechseln von Desktop-Rhythmus zu mobilem Scroll-Snap', () => {
  const css = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.home-industry-stories\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/
  );
  assert.match(
    css,
    /\.home-industry-story:nth-child\(even\)\s*\{[\s\S]*?margin-top:\s*28px;/
  );
  assert.match(
    css,
    /@media \(max-width:\s*900px\)[\s\S]*?\.home-industry-stories\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/
  );
  assert.match(
    css,
    /@media \(max-width:\s*640px\)[\s\S]*?\.home-industry-stories\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;[\s\S]*?scroll-snap-type:\s*x mandatory;/
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.home-industry-story[\s\S]*?transition:\s*none\s*!important;/
  );
  assert.match(
    css,
    /\.home-industry-story:nth-child\(2\)[\s\S]*?\.home-industry-story__media img\s*\{[\s\S]*?transform:\s*scale\(1\.3\);/
  );
});

test('der grundlegende Branchenstil gilt unabhängig von reduzierter Bewegung', () => {
  const css = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');
  const root = postcss.parse(css);
  const topLevelIndustryRule = root.nodes.find(
    (node) => node.type === 'rule' && node.selector === '.home-page .home-industry-stories'
  );

  assert.ok(
    topLevelIndustryRule,
    'Der grundlegende Branchenstil darf nicht in einer Medienabfrage verschachtelt sein'
  );
});
