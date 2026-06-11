import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { webdesignBerlinPage } from '../data/webdesignBerlinPage.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const leistungenCss = read('public/leistungen.css');
const packageListCss = read('public/package-list.css');
const webdesignBerlinCss = read('public/webdesign-berlin.css');
const homeCss = read('public/home.css');
const interactionPolish = read('public/js/interaction-polish.js');
const localSeoTemplate = read('views/static/local-seo-berlin.ejs');
const footerPartial = read('views/partials/footer.ejs');

const ruleBlock = (source, selector) => {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} rule missing`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return source.slice(open + 1, close);
};

test('mobile related-link and intro-card grids keep visible vertical spacing', () => {
  const seoLandingCss = read('public/seo-landing.css');

  assert.match(
    leistungenCss,
    /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.seo-landing__link-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?gap:\s*16px;/
  );
  assert.match(
    seoLandingCss,
    /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.seo-landing__link-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?gap:\s*16px;/
  );
  assert.match(
    leistungenCss,
    /\.seo-landing__link-card\s*\{[\s\S]*?margin-block:\s*0;[\s\S]*?padding:\s*18px;/
  );
  assert.match(
    seoLandingCss,
    /\.seo-landing__link-card\s*\{[\s\S]*?margin-block:\s*0;[\s\S]*?padding:\s*18px;/
  );
  assert.match(
    packageListCss,
    /@media\s*\(max-width:\s*576px\)\s*\{[\s\S]*?\.packages-page\s+\.intro-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?gap:\s*1rem;/
  );
  assert.match(
    interactionPolish,
    /window\.innerWidth\s*<=\s*700[\s\S]*?\.seo-landing__link-card,\s*\.packages-page \.intro-card/
  );
});

test('package sliders preserve native touch scroll and expose thin active scrollbars', () => {
  assert.match(interactionPolish, /event\.pointerType\s*!==\s*'mouse'/);
  assert.match(interactionPolish, /is-scrolling/);
  assert.match(interactionPolish, /slider\.addEventListener\('scroll'/);
  assert.doesNotMatch(
    interactionPolish,
    /pointerdown[\s\S]*?event\.preventDefault\(\);[\s\S]*?pointerType\s*!==\s*'mouse'/
  );

  assert.match(
    leistungenCss,
    /\.package-slider-scroll\s*\{[\s\S]*?touch-action:\s*pan-x pan-y;[\s\S]*?scrollbar-width:\s*thin;/
  );
  assert.match(
    webdesignBerlinCss,
    /\.webdesign-berlin\s+:is\(\s*\.wd-packages,[\s\S]*?\.wd-tech-grid\s*\)\.is-scrolling::-webkit-scrollbar\s*\{[\s\S]*?height:\s*8px;/
  );
});

test('webdesign berlin process titles and FAQ indicators avoid duplicate affordances', () => {
  assert.ok(
    webdesignBerlinPage.process.steps.every((step) => !/^\d+\.\s/.test(step.title)),
    'Step-Titel dürfen keine führende Textnummer enthalten'
  );
  assert.match(
    webdesignBerlinCss,
    /\.webdesign-berlin\s+\.wd-faq\s+summary::after\s*\{[\s\S]*?content:\s*"\+";/
  );
  assert.match(
    webdesignBerlinCss,
    /\.webdesign-berlin\s+\.wd-faq\s+details\[open\]\s+summary::after\s*\{[\s\S]*?content:\s*"–";/
  );
});

test('local SEO comparison lists use check and x markers with horizontal icon cards', () => {
  assert.match(
    localSeoTemplate,
    /id="localSeoMeaning"[\s\S]*?<ul class="local-seo-list local-seo-list--checks">[\s\S]*?page\.meaning\.included/
  );
  assert.match(
    localSeoTemplate,
    /id="localSeoMeaning"[\s\S]*?<ul class="local-seo-list local-seo-list--crosses">[\s\S]*?page\.meaning\.notAutomatic/
  );
  assert.match(
    localSeoTemplate,
    /id="technicalFoundation"[\s\S]*?class="local-seo-card local-seo-icon-card animate-on-scroll"/
  );
  assert.match(
    localSeoTemplate,
    /id="trustSignals"[\s\S]*?class="local-seo-card local-seo-icon-card animate-on-scroll"/
  );
  assert.match(
    leistungenCss,
    /\.local-seo-list--checks\s+li::before\s*\{[\s\S]*?content:\s*"✓";/
  );
  assert.match(
    leistungenCss,
    /\.local-seo-list--crosses\s+li::before\s*\{[\s\S]*?content:\s*"×";/
  );
  assert.match(
    leistungenCss,
    /\.local-seo-icon-card\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*auto minmax\(0,\s*1fr\);/
  );
});

test('homepage website-check cards align icons beside headings', () => {
  assert.match(
    homeCss,
    /\.home-page\s+\.home-check-grid\s+\.home-card\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*auto minmax\(0,\s*1fr\);/
  );
  assert.match(
    homeCss,
    /\.home-page\s+\.home-check-grid\s+\.home-card\s+p\s*\{[\s\S]*?grid-column:\s*1 \/ -1;/
  );
});

test('homepage USP and technical boundary cards align icons beside headings', () => {
  const uspCard = ruleBlock(homeCss, '.home-page .home-usp-item');
  const uspText = ruleBlock(homeCss, '.home-page .home-usp-item span');
  const boundaryCard = ruleBlock(homeCss, '.home-page .home-tech-grid > .home-card');
  const boundaryText = ruleBlock(homeCss, '.home-page .home-tech-grid > .home-card p');

  assert.match(uspCard, /display:\s*grid;/);
  assert.match(uspCard, /grid-template-columns:\s*auto minmax\(0,\s*1fr\);/);
  assert.match(uspText, /grid-column:\s*1 \/ -1;/);
  assert.match(boundaryCard, /display:\s*grid;/);
  assert.match(boundaryCard, /grid-template-columns:\s*auto minmax\(0,\s*1fr\);/);
  assert.match(boundaryText, /grid-column:\s*1 \/ -1;/);
});

test('FAQ accordion setup includes every FAQ root and supports container clicks', () => {
  [
    '.wd-faq',
    '.district-faq',
    '.seo-landing__faq-list',
    '.service-faq',
    '.local-seo-faq',
    '.faq-list',
    '.wt-faq'
  ].forEach((selector) => {
    assert.match(footerPartial, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  assert.match(footerPartial, /function isQuestionAreaClick\(event,\s*item\)/);
  assert.match(footerPartial, /event\.target\.closest\(interactiveSelector\)/);
  assert.match(footerPartial, /item\.open\s*=\s*!item\.open;/);
});
