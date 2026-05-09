import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function cssBlock(source, selectorPattern) {
  const match = source.match(new RegExp(`${selectorPattern.source}\\s*\\{[^}]*\\}`));
  assert.ok(match, `missing CSS block for ${selectorPattern}`);
  return match[0];
}

const heroTemplates = [
  'views/references/index.ejs',
  'views/references/show.ejs',
  'views/blog/index.ejs',
  'views/blog/show.ejs',
  'views/ratgeber/index.ejs',
  'views/ratgeber/show.ejs',
  'views/industries/index.ejs',
  'views/bereiche/webdesign-berlin.ejs',
  'views/packages_list.ejs',
  'views/package_detail.ejs',
  'views/test.ejs',
  'views/about.ejs',
  'views/leistungen/show.ejs',
  'views/seo_landing/show.ejs'
];

const districtController = read('controllers/districtController.js');
const districtDe = read('views/bereiche/webdesign-berlin-district.ejs');
const districtEn = read('views/bereiche/webdesign-berlin-district-en.ejs');
const referencesIndex = read('views/references/index.ejs');
const referencesShow = read('views/references/show.ejs');
const seoLandingShow = read('views/seo_landing/show.ejs');

test('all unified hero templates expose breadcrumbs directly in the hero copy', () => {
  for (const template of heroTemplates) {
    const source = read(template);
    assert.match(source, /unified-hero__breadcrumbs/, `${template} needs shared hero breadcrumbs`);
    assert.match(source, /aria-label="Breadcrumb"/, `${template} needs accessible breadcrumb label`);
  }
});

test('old hero labels and detached breadcrumbs are removed from unified hero areas', () => {
  const checks = new Map([
    ['views/references/show.ejs', [/references-back-link/, /references-eyebrow unified-hero__kicker/]],
    ['views/references/index.ejs', [/references-eyebrow unified-hero__kicker/]],
    ['views/blog/index.ejs', [/<p class="unified-hero__kicker">Komplett Webdesign Blog<\/p>/]],
    ['views/blog/show.ejs', [/rg-breadcrumb-wrap/, /<p class="unified-hero__kicker"><%= post\.category %><\/p>/]],
    ['views/ratgeber/index.ejs', [/rg-eyebrow unified-hero__kicker/]],
    ['views/ratgeber/show.ejs', [/rg-breadcrumb-wrap/, /rg-detail-category unified-hero__kicker/]],
    ['views/industries/index.ejs', [/<nav class="wd-breadcrumbs"/, /<p class="unified-hero__kicker">Branchen-Websites<\/p>/]],
    ['views/bereiche/webdesign-berlin.ejs', [/<nav class="wd-breadcrumbs"/, /wd-eyebrow unified-hero__kicker/]],
    ['views/packages_list.ejs', [/hero-badge unified-hero__kicker/]],
    ['views/package_detail.ejs', [/hero-badge unified-hero__kicker/]],
    ['views/test.ejs', [/<section class="wt-section wt-section-compact">/, /wt-eyebrow unified-hero__kicker/]],
    ['views/seo_landing/show.ejs', [/seo-landing__eyebrow unified-hero__kicker/]]
  ]);

  for (const [template, patterns] of checks) {
    const source = read(template);
    for (const pattern of patterns) {
      assert.doesNotMatch(source, pattern, `${template} still contains ${pattern}`);
    }
  }
});

test('industry detail pages keep the legacy branchen hero instead of the unified hero redesign', () => {
  const source = read('views/industries/show.ejs');

  assert.match(source, /<nav class="wd-breadcrumbs"/);
  assert.match(source, /<section id="Hero">/);
  assert.match(source, /class="heroContainer"/);
  assert.match(source, /class="heroH1"/);
  assert.doesNotMatch(source, /industry-unified-hero/);
  assert.doesNotMatch(source, /unified-hero__breadcrumbs/);
  assert.doesNotMatch(source, /unified-hero__button/);
  assert.doesNotMatch(source, /industry-detail-page/);
});

test('homepage is excluded from new scroll reveal animations', () => {
  const js = read('public/js/interaction-polish.js');

  assert.match(js, /path === '\/'/);
  assert.match(js, /home-page/);
});

test('unified hero css contains readability and page-specific hero guards', () => {
  const css = read('public/unified-hero.css');

  assert.match(css, /\.unified-hero__breadcrumbs/);
  assert.match(css, /\.website-tester-page\s+\.wt-hero\.unified-hero\s+h1/);
  assert.match(css, /font-size:\s*clamp\(2rem,\s*3\.2vw,\s*3\.1rem\)/);
  assert.match(css, /\.website-tester-page\s+\.wt-hero\.unified-hero\s+\.wt-hero-copy/);
  assert.match(css, /\.rg-page\s+\.rg-hero\.unified-hero/);
  assert.match(css, /\.rg-page\s+\.unified-hero\s+\.rg-hero-panel/);
  assert.match(css, /\.about-portrait-card/);
});

test('about hero uses a dedicated portrait treatment instead of the generic media frame', () => {
  const about = read('views/about.ejs');

  assert.match(about, /about-portrait-card/);
  assert.doesNotMatch(about, /hero-image unified-hero__media-frame/);
});

test('webdesign berlin hero starts flush and keeps breadcrumb links on the shared breadcrumb orange after district css loads', () => {
  const heroCss = read('public/unified-hero.css');
  const css = read('public/district-berlin.css');
  const extraCss = read('public/extra.css');
  const sharedHeroRule = cssBlock(heroCss, /\.webdesign-berlin-page\s+\.wd-container\.wd-hero\.unified-hero/);
  const pageHeroRule = cssBlock(css, /\.webdesign-berlin-page\s+\.wd-container\.wd-hero\.unified-hero/);

  assert.match(css, /\.webdesign-berlin-page\s*\{[\s\S]*?padding:\s*0\b/);
  assert.doesNotMatch(extraCss, /\.webdesign-berlin-page\s*\{[\s\S]*?padding-top:\s*60px\b/);
  assert.match(css, /\.webdesign-berlin-page\s+\.wd-hero\.unified-hero\s*\{[\s\S]*?margin-top:\s*0\b/);
  assert.match(sharedHeroRule, /width:\s*100%\s*!important/);
  assert.match(sharedHeroRule, /max-width:\s*none\s*!important/);
  assert.doesNotMatch(sharedHeroRule, /height:\s*100vh\b/);
  assert.match(sharedHeroRule, /border:\s*0\s*!important/);
  assert.match(sharedHeroRule, /border-radius:\s*0\s*!important/);
  assert.match(pageHeroRule, /width:\s*100%\s*!important/);
  assert.match(pageHeroRule, /max-width:\s*none\s*!important/);
  assert.match(pageHeroRule, /padding:\s*clamp\(30px,\s*5vw,\s*60px\)\s+max\(16px,\s*calc\(\(100vw\s*-\s*1180px\)\s*\/\s*2\)\)/);
  assert.match(css, /\.webdesign-berlin-page\s+\.unified-hero__breadcrumbs\s+a\s*\{[\s\S]*?color:\s*var\(--kwd-hero-accent-dark/);
});

test('webdesign berlin district pages use the shared breadcrumb markup and visual language', () => {
  const css = read('public/district-berlin.css');

  for (const source of [districtDe, districtEn]) {
    assert.match(source, /class="district-breadcrumb unified-hero__breadcrumbs"/);
    assert.match(source, /aria-label="Breadcrumb"/);
    assert.match(source, /<ol>/);
    assert.match(source, /aria-current="page"/);
    assert.doesNotMatch(source, /<span>\/<\/span>/);
    assert.doesNotMatch(source, />[^<]*\/<\/a>/);
  }

  assert.match(css, /\.district-breadcrumb\.unified-hero__breadcrumbs\s*\{[\s\S]*?color:\s*var\(--kwd-hero-muted/);
  assert.match(css, /\.district-breadcrumb\.unified-hero__breadcrumbs\s+li\s*\+\s+li::before\s*\{[\s\S]*?content:\s*"\/"/);
  assert.doesNotMatch(css, /\.district-breadcrumb\s*\{[\s\S]*?display:\s*flex/);
});

test('webdesign berlin mobile hero keeps a usable single-column layout after extra css loads', () => {
  const extraCss = read('public/extra.css');
  const districtCss = read('public/district-berlin.css');
  const heroCss = read('public/unified-hero.css');

  assert.match(extraCss, /Webdesign Berlin mobile hero containment/);
  assert.match(heroCss, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero\.unified-hero\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(extraCss, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero,[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero\.unified-hero\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(extraCss, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero\.unified-hero\s+>\s+\.wd-hero__content,[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero\.unified-hero\s+>\s+\.wd-hero__visual\s*\{[\s\S]*?width:\s*100%/);
  assert.match(extraCss, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero\s+h1\s*\{[\s\S]*?max-width:\s*none/);
  assert.match(districtCss, /Webdesign Berlin mobile hero containment/);
  assert.match(districtCss, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero,[\s\S]*?\.webdesign-berlin-page\s+\.wd-hero\.unified-hero\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
});

test('ratgeber index hero keeps normal document flow and breadcrumb links on the shared breadcrumb orange after page css loads', () => {
  const css = read('public/ratgeber.css');

  assert.doesNotMatch(css, /\.rg-index-page\s+\.rg-hero\.unified-hero\s*\{[\s\S]*?min-height:\s*100vh\b/);
  assert.doesNotMatch(css, /\.rg-index-page\s+\.rg-hero\.unified-hero\s*\{[\s\S]*?min-height:\s*100svh\b/);
  assert.match(css, /\.rg-page\s+\.unified-hero__breadcrumbs\s+a\s*\{[\s\S]*?color:\s*var\(--kwd-hero-accent-dark/);
  assert.doesNotMatch(css, /\.rg-hero-copy\s+h1\s*\{[\s\S]*?text-shadow\s*:/);
  assert.doesNotMatch(css, /\.rg-detail-hero\s+h1\s*\{[\s\S]*?text-shadow\s*:/);
});

test('page-specific CSS for new marketing pages uses hashed cssAsset URLs instead of stale fixed query strings', () => {
  assert.match(referencesIndex, /cssAsset\('references\.css'\)/);
  assert.match(referencesShow, /cssAsset\('references\.css'\)/);
  assert.match(seoLandingShow, /cssAsset\('seo-landing\.css'\)/);
  assert.match(districtController, /cssAsset\(['"]district-berlin\.css['"]\)/);
  assert.doesNotMatch(referencesIndex, /\/references\.css\?v=/);
  assert.doesNotMatch(referencesShow, /\/references\.css\?v=/);
  assert.doesNotMatch(seoLandingShow, /\/seo-landing\.css\?v=/);
  assert.doesNotMatch(districtController, /\/district-berlin\.css\?v=/);
});

test('ratgeber and blog detail heroes use full-bleed backgrounds with constrained inner content', () => {
  const css = read('public/ratgeber.css');

  assert.match(css, /\.rg-detail-page\s+\.rg-detail-hero\.unified-hero,[\s\S]*?\.blog-detail-page\s+\.rg-detail-hero\.unified-hero\s*\{[\s\S]*?width:\s*100%\s*!important/);
  assert.match(css, /\.rg-detail-page\s+\.rg-detail-hero\.unified-hero,[\s\S]*?\.blog-detail-page\s+\.rg-detail-hero\.unified-hero\s*\{[\s\S]*?max-width:\s*none\s*!important/);
  assert.match(css, /\.rg-detail-page\s+\.rg-detail-hero\.unified-hero,[\s\S]*?\.blog-detail-page\s+\.rg-detail-hero\.unified-hero\s*\{[\s\S]*?border:\s*0\s*!important/);
  assert.match(css, /\.rg-detail-page\s+\.rg-detail-hero\.unified-hero\s+\.rg-detail-hero-inner,[\s\S]*?\.blog-detail-page\s+\.rg-detail-hero\.unified-hero\s+\.rg-detail-hero-inner\s*\{[\s\S]*?width:\s*min\(1120px,\s*calc\(100%\s*-\s*32px\)\)/);
  assert.match(css, /@media\s*\(max-width:\s*767\.98px\)[\s\S]*?\.rg-detail-page\s+\.rg-detail-hero\.unified-hero\s+\.rg-detail-hero-inner,[\s\S]*?\.blog-detail-page\s+\.rg-detail-hero\.unified-hero\s+\.rg-detail-hero-inner\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
});

test('requested index and landing heroes use full-bleed backgrounds with constrained content after the hero', () => {
  const heroCss = read('public/unified-hero.css');
  const referencesCss = read('public/references.css');
  const branchenCss = read('public/branchen.css');
  const testerCss = read('public/website-tester.css');
  const seoLandingCss = read('public/seo-landing.css');
  const ratgeberCss = read('public/ratgeber.css');

  assert.match(heroCss, /\.references-page--index\s+\.references-hero\.unified-hero,[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s*\{[\s\S]*?width:\s*100%\s*!important/);
  assert.match(heroCss, /\.references-page--index\s+\.references-hero\.unified-hero,[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s*\{[\s\S]*?border:\s*0\s*!important/);
  assert.match(heroCss, /\.references-page--index\s+\.references-hero\.unified-hero,[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s*\{[\s\S]*?border-radius:\s*0\s*!important/);
  assert.match(heroCss, /\.website-tester-page\s+\.wt-hero\.unified-hero,[\s\S]*?\.seo-landing\s+\.seo-landing__hero\.unified-hero,[\s\S]*?\.rg-index-page\s+\.rg-hero\.unified-hero,[\s\S]*?\.blog-index-page\s+\.blog-hero\.unified-hero/);
  assert.match(heroCss, /\.references-page\s+\.reference-detail-hero\.unified-hero/);
  assert.match(heroCss, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.reference-detail-hero__grid,[\s\S]*?\.rg-detail-hero-inner,[\s\S]*?\.wt-hero-grid,[\s\S]*?\.unified-hero\s+:is\(/);
  assert.match(heroCss, /\.blog-index-page\s+\.blog-hero\.unified-hero\s+\.rg-hero-grid[\s\S]*?width:\s*min\(1120px,\s*calc\(100%\s*-\s*32px\)\)/);
  assert.match(heroCss, /\.rg-index-page\s+\.rg-hero\.unified-hero\s+\.rg-hero-grid[\s\S]*?width:\s*min\(1120px,\s*calc\(100%\s*-\s*32px\)\)/);
  assert.match(heroCss, /\.website-tester-page\s+\.wt-hero\.unified-hero\s+\.wt-shell[\s\S]*?width:\s*min\(1160px,\s*calc\(100%\s*-\s*32px\)\)/);
  assert.match(seoLandingCss, /\.seo-landing__container\s*\{[^}]*margin-left:\s*auto;[^}]*margin-right:\s*auto/);
  assert.doesNotMatch(heroCss, /\.blog-index-page\s+\.blog-hero\.unified-hero\s*\{[^}]*min-height:\s*100vh\b/);
  assert.doesNotMatch(heroCss, /\.rg-index-page\s+\.rg-hero\.unified-hero\s*\{[^}]*min-height:\s*100vh\b/);
  assert.doesNotMatch(heroCss, /\.website-tester-page\s+\.wt-hero\.unified-hero\s*\{[^}]*min-height:\s*100vh\b/);
  assert.match(referencesCss, /\.references-page\s*\{[\s\S]*?background:\s*var\(--references-soft\);/);
  assert.match(branchenCss, /\.industries-index-page\s*\{[\s\S]*?background:\s*#f4f7fb;/);
  assert.match(testerCss, /body\.website-tester-page\s*\{[\s\S]*?--wt-bg:\s*#f4f7fb;[\s\S]*?background:\s*var\(--wt-bg\);/);
  assert.match(seoLandingCss, /\.seo-landing\s*\{[\s\S]*?background:\s*#f4f7fb;/);
  assert.match(ratgeberCss, /\.rg-page\s*\{[\s\S]*?--rg-bg:\s*#f4f7fb;[\s\S]*?background:\s*var\(--rg-bg\);/);
});

test('branchen index hero copy does not render as a framed glass card', () => {
  const heroCss = read('public/unified-hero.css');
  assert.match(heroCss, /\.industries-index-page\s+\.industries-hero\.unified-hero\s+\.hero-content\s*\{[\s\S]*?background:\s*transparent\s*!important;[\s\S]*?border:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;[\s\S]*?backdrop-filter:\s*none\s*!important;/);
});

test('shared index and landing heroes use smaller top padding than bottom padding', () => {
  const heroCss = read('public/unified-hero.css');
  const referencesCss = read('public/references.css');
  const seoLandingCss = read('public/seo-landing.css');
  const ratgeberCss = read('public/ratgeber.css');
  const testerCss = read('public/website-tester.css');

  const raisedHeroPadding = /padding:\s*clamp\(30px,\s*5vw,\s*60px\)\s+0\s+clamp\(72px,\s*10vw,\s*132px\);/;
  assert.match(heroCss, raisedHeroPadding);
  assert.match(heroCss, /\.references-page--index\s+\.references-hero\.unified-hero,[\s\S]*?\.blog-index-page\s+\.blog-hero\.unified-hero\s*\{[\s\S]*?padding:\s*clamp\(30px,\s*5vw,\s*60px\)\s+0\s+clamp\(72px,\s*10vw,\s*132px\);/);
  assert.match(referencesCss, /\.references-page\s+\.references-hero,[\s\S]*?\.references-page\s+\.reference-detail-hero\s*\{[\s\S]*?padding:\s*clamp\(30px,\s*5vw,\s*60px\)\s+0\s+clamp\(72px,\s*10vw,\s*132px\);/);
  assert.match(seoLandingCss, /\.seo-landing__hero\s*\{[\s\S]*?padding:\s*clamp\(30px,\s*5vw,\s*60px\)\s+0\s+clamp\(72px,\s*10vw,\s*132px\);/);
  assert.match(ratgeberCss, /\.rg-hero\s*\{[\s\S]*?padding:\s*clamp\(30px,\s*5vw,\s*60px\)\s+0\s+clamp\(72px,\s*10vw,\s*132px\);/);
  assert.match(testerCss, /\.wt-hero\s*\{[\s\S]*?padding:\s*clamp\(30px,\s*5vw,\s*60px\)\s+0\s+clamp\(72px,\s*10vw,\s*132px\);/);
  assert.doesNotMatch(testerCss, /\.website-tester-page\s+\.wt-hero\s*\{[\s\S]*?padding-top:/);
});
