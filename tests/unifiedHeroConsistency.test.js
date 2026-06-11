import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = {
  head: readFileSync(new URL('../views/partials/head.ejs', import.meta.url), 'utf8'),
  referencesIndex: readFileSync(new URL('../views/references/index.ejs', import.meta.url), 'utf8'),
  referencesShow: readFileSync(new URL('../views/references/show.ejs', import.meta.url), 'utf8'),
  blogIndex: readFileSync(new URL('../views/blog/index.ejs', import.meta.url), 'utf8'),
  blogShow: readFileSync(new URL('../views/blog/show.ejs', import.meta.url), 'utf8'),
  ratgeberIndex: readFileSync(new URL('../views/ratgeber/index.ejs', import.meta.url), 'utf8'),
  ratgeberShow: readFileSync(new URL('../views/ratgeber/show.ejs', import.meta.url), 'utf8'),
  industriesIndex: readFileSync(new URL('../views/industries/index.ejs', import.meta.url), 'utf8'),
  industriesShow: readFileSync(new URL('../views/industries/show.ejs', import.meta.url), 'utf8'),
  webdesignBerlin: readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8'),
  packagesList: readFileSync(new URL('../views/packages_list.ejs', import.meta.url), 'utf8'),
  packageDetail: readFileSync(new URL('../views/package_detail.ejs', import.meta.url), 'utf8'),
  websiteTester: readFileSync(new URL('../views/test.ejs', import.meta.url), 'utf8'),
  about: readFileSync(new URL('../views/about.ejs', import.meta.url), 'utf8'),
  leistungenOverview: readFileSync(new URL('../views/static/leistungen.ejs', import.meta.url), 'utf8'),
  leistungenShow: readFileSync(new URL('../views/leistungen/show.ejs', import.meta.url), 'utf8'),
  seoLanding: readFileSync(new URL('../views/seo_landing/show.ejs', import.meta.url), 'utf8'),
  localSeo: readFileSync(new URL('../views/static/local-seo-berlin.ejs', import.meta.url), 'utf8'),
  maintenance: readFileSync(new URL('../views/static/website-wartung-berlin.ejs', import.meta.url), 'utf8'),
  addOns: readFileSync(new URL('../views/static/zusatzleistungen-webdesign.ejs', import.meta.url), 'utf8'),
  runningCosts: readFileSync(new URL('../views/static/laufende-kosten-website.ejs', import.meta.url), 'utf8')
};

test('shared hero stylesheet is loaded globally for marketing pages', () => {
  assert.match(files.head, /cssAsset\('unified-hero\.css'\)/);
});

test('core marketing templates opt into the shared hero surface', () => {
  [
    files.referencesIndex,
    files.referencesShow,
    files.blogIndex,
    files.blogShow,
    files.ratgeberIndex,
    files.ratgeberShow,
    files.industriesIndex,
    files.webdesignBerlin,
    files.packagesList,
    files.packageDetail,
    files.websiteTester,
    files.about,
    files.leistungenOverview,
    files.leistungenShow,
    files.seoLanding
  ].forEach((source) => {
    assert.match(source, /unified-hero/);
  });
});

test('industry detail template stays on the legacy branchen design', () => {
  assert.doesNotMatch(files.industriesShow, /unified-hero/);
  assert.match(files.industriesShow, /heroContainer/);
  assert.match(files.industriesShow, /wd-breadcrumbs/);
});

test('shared hero css uses the brand palette and protects long h1 text from clipping', () => {
  const css = readFileSync(new URL('../public/unified-hero.css', import.meta.url), 'utf8');

  assert.match(css, /#0b2a46/i);
  assert.match(css, /#e94a1b/i);
  assert.match(css, /overflow-wrap:\s*anywhere/i);
  assert.match(css, /hyphens:\s*auto/i);
  assert.match(css, /overflow:\s*visible/i);
  assert.match(css, /line-height:\s*1\.08/i);
});

test('shared unified heroes can use the homepage reveal sequence', () => {
  const css = readFileSync(new URL('../public/unified-hero.css', import.meta.url), 'utf8');

  assert.match(files.leistungenOverview, /class="[^"]*home-hero-reveal home-hero-reveal--h1 animate-on-scroll[^"]*"/);
  assert.match(files.leistungenOverview, /class="btn btn-primary home-hero-reveal home-hero-reveal--actions animate-on-scroll"/);
  assert.match(files.leistungenOverview, /class="leistungen-hero-panel__reveal home-hero-reveal home-hero-reveal--visual animate-on-scroll"/);

  assert.match(files.leistungenShow, /class="[^"]*home-hero-reveal home-hero-reveal--h1 animate-on-scroll[^"]*"/);
  assert.match(files.leistungenShow, /class="btn <%= index === 0 \? 'btn-primary' : 'btn-secondary' %> home-hero-reveal home-hero-reveal--actions animate-on-scroll"/);
  assert.match(files.leistungenShow, /class="leistungen-hero-panel__reveal home-hero-reveal home-hero-reveal--visual animate-on-scroll"/);

  assert.match(files.referencesIndex, /id="references-title" class="home-hero-reveal home-hero-reveal--h1 animate-on-scroll"/);
  assert.match(files.referencesIndex, /class="references-actions unified-hero__actions home-hero-reveal home-hero-reveal--actions animate-on-scroll"/);
  assert.match(files.referencesIndex, /class="references-hero__panel unified-hero__panel home-hero-reveal home-hero-reveal--visual animate-on-scroll"/);

  assert.match(files.industriesIndex, /id="industries-hero-title" class="display-5 fw-bold mb-3 home-hero-reveal home-hero-reveal--h1 animate-on-scroll"/);
  assert.match(files.industriesIndex, /class="industries-hero__actions unified-hero__actions home-hero-reveal home-hero-reveal--actions animate-on-scroll"/);
  assert.match(files.industriesIndex, /class="btn btn-primary" href="\/kontakt">Projekt anfragen<\/a>/);
  assert.match(files.industriesIndex, /class="btn btn-secondary" href="\/pakete">Pakete ansehen<\/a>/);
  assert.match(files.industriesIndex, /class="industries-hero__panel unified-hero__panel home-hero-reveal home-hero-reveal--visual animate-on-scroll"/);

  assert.match(files.seoLanding, /class="[^"]*seo-landing__hero-kicker[^"]*home-hero-reveal home-hero-reveal--support animate-on-scroll[^"]*"/);
  assert.match(files.seoLanding, /<h1 class="home-hero-reveal home-hero-reveal--h1 animate-on-scroll">/);
  assert.match(files.seoLanding, /class="seo-landing__hero-panel-reveal home-hero-reveal home-hero-reveal--visual animate-on-scroll"/);

  [files.localSeo, files.maintenance, files.addOns, files.runningCosts].forEach((source) => {
    assert.match(source, /<h1 class="home-hero-reveal home-hero-reveal--h1 animate-on-scroll">/);
    assert.match(source, /class="btn btn-primary home-hero-reveal home-hero-reveal--actions animate-on-scroll"/);
    assert.match(source, /home-hero-reveal home-hero-reveal--visual animate-on-scroll/);
  });

  assert.match(css, /:is\(\.unified-hero,\s*\.service-hero\)\s+\.home-hero-reveal\.animate-on-scroll\s*\{[\s\S]*?transition-delay:\s*var\(--home-hero-reveal-delay,\s*0ms\);/);
  assert.match(css, /:is\(\.unified-hero,\s*\.service-hero\)\s+\.home-hero-reveal--support\s*\{[\s\S]*?--home-hero-reveal-delay:\s*180ms;/);
  assert.match(css, /:is\(\.unified-hero,\s*\.service-hero\)\s+\.home-hero-reveal--visual\s*\{[\s\S]*?--home-hero-reveal-delay:\s*260ms;/);
  assert.match(css, /:is\(\.unified-hero,\s*\.service-hero\)\s+\.home-hero-reveal--actions\s*\{[\s\S]*?--home-hero-reveal-delay:\s*620ms;/);
  assert.match(css, /:is\(\.unified-hero,\s*\.service-hero\)\s+\.btn\.home-hero-reveal\.animate-on-scroll\s*\{[\s\S]*?translate:\s*0\s+0;[\s\S]*?translate\s+0\.18s\s+ease,/);
  assert.match(css, /:is\(\.unified-hero,\s*\.service-hero\)\s+\.btn\.home-hero-reveal\.animate-on-scroll\.visible:is\(:hover,\s*:focus-visible\)\s*\{[\s\S]*?transform:\s*translate3d\(0,\s*0,\s*0\);[\s\S]*?translate:\s*0\s+-3px;/);
  assert.match(css, /@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*?:is\(\.unified-hero,\s*\.service-hero\)\s+\.home-hero-reveal--visual\.animate-on-scroll\s*\{[\s\S]*?transform:\s*translate3d\(0,\s*18px,\s*0\);/);
});
