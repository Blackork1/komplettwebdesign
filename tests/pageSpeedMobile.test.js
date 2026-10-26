import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { collectUsedIconClasses, splitFontAwesomeCss, iconCodepoint } from '../helpers/iconSubset.js';
import { buildBootstrapSubset, collectSiteWords } from '../helpers/bootstrapSubset.js';
import { RESPONSIVE_IMAGES, srcsetFor } from '../data/responsiveImages.js';

// Befunde aus PageSpeed Insights (Leistung, Handy), Oktober 2026.
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('schlanke Icon-Datei enthält jedes Icon, das die Website verwendet', () => {
  const full = splitFontAwesomeCss(read('public/assets/css/fontawesome.min.css'));
  const subset = splitFontAwesomeCss(read('public/assets/css/icons.min.css').replace(/@font-face\{[^}]*\}/, ''));
  const available = new Map(full.icons.flatMap((icon) => icon.classes.map((name) => [name, icon.value])));
  const shipped = new Map(subset.icons.flatMap((icon) => icon.classes.map((name) => [name, icon.value])));

  const missing = [...collectUsedIconClasses(root)].filter((name) => available.has(name) && shipped.get(name) !== available.get(name));
  assert.deepEqual(missing, [], `Fehlende Icons, bitte \`npm run build:icons\` ausführen: ${missing.join(', ')}`);
  assert.ok(subset.icons.length < full.icons.length / 3, 'die Icon-Datei soll nur genutzte Icons enthalten');
  assert.ok(iconCodepoint('\\f0e7') === 0xf0e7 && iconCodepoint('\\#') === 0x23 && iconCodepoint('X') === 0x58);
});

test('Head lädt die kleine Icon-Datei statt des kompletten Font Awesome', () => {
  const head = read('views/partials/head.ejs');
  assert.match(head, /assets\/css\/icons\.min\.css/);
  assert.doesNotMatch(head, /fontawesome\.min\.css|solid\.min\.css|'assets\/css\/fa-solid-900\.woff2'/);
  assert.ok(readFileSync(new URL('../public/assets/css/fa-solid-900-subset.woff2', import.meta.url)).length < 40_000);
});

test('öffentliche Seiten laden den Bootstrap-Auszug, der Adminbereich das komplette Bootstrap', () => {
  const head = read('views/partials/head.ejs');
  assert.match(head, /\^\\\/admin\(\\\/\|\$\)[\s\S]*?css\/bootstrap\.min\.css[\s\S]*?<% } else { %>[\s\S]*?cssAsset\('css\/bootstrap-site\.css'\)/);
  assert.match(read('package.json'), /"build:css": "node scripts\/buildBootstrapSubset\.mjs && node scripts\/buildCssAssets\.js"/);
});

test('Bootstrap-Auszug ist aktuell und enthält die genutzten Grundbausteine', () => {
  const expected = buildBootstrapSubset(read('public/css/bootstrap.min.css'), collectSiteWords(root));
  const actual = read('public/css/bootstrap-site.css').replace(/^\/\*[^\n]*\*\/\n/, '');
  assert.equal(actual, expected, 'bootstrap-site.css ist veraltet, bitte `npm run build:css` ausführen');
  for (const selector of ['.container', '.row', '.col-md-6', '.btn', '.collapse:not(.show)', '.collapsing', '.d-flex', '.table', '.alert', '.img-fluid', '.accordion-button']) {
    assert.ok(actual.includes(selector), `${selector} fehlt im Auszug`);
  }
  assert.ok(actual.length < read('public/css/bootstrap.min.css').length * 0.4);
});

test('große Startseitenbilder haben kleinere Varianten für Handys', () => {
  for (const [src, variants] of Object.entries(RESPONSIVE_IMAGES)) {
    assert.ok(variants.some(([, file]) => file === src), `${src} fehlt in der eigenen Liste`);
    for (const [, file] of variants) assert.ok(existsSync(new URL(`../public${file}`, import.meta.url)), `${file} fehlt`);
  }
  const view = read('views/index.ejs');
  assert.match(view, /home-hero-filmfestival-video-880\.webp"<%- responsiveAttrs\('\/images\/home-hero-filmfestival-video-880\.webp'/);
  assert.match(view, /<img src="<%= homeMarketingImages\.homeHero\?\.src \|\| '\/images\/home-hero-sauber-desktop\.webp' %>"<%- responsiveAttrs\(homeMarketingImages\.homeHero\?\.src \|\| '\/images\/home-hero-sauber-desktop\.webp', '\(max-width: 768px\) 88vw/);
  assert.equal(srcsetFor('/images/home-hero-sauber-desktop.webp'), '/images/home-hero-sauber-desktop-720.webp 720w, /images/home-hero-sauber-desktop.webp 1152w');
  assert.match(read('views/partials/header.ejs'), /srcset="\/images\/LogoTransparent-140\.webp 140w, \/images\/LogoTransparent-210\.webp 210w, \/images\/LogoTransparent\.webp 480w" sizes="70px"/);
  assert.match(read('public/home.css'), /url\("\/images\/heroBg-cta\.webp"\)/);
});

test('Tablet im Startseiten-Hero zeigt die Videoseite des Kurdischen Filmfestivals', () => {
  const view = read('views/index.ejs');
  assert.doesNotMatch(view, /home-hero-sauber-kontakt\.webp/);
  assert.match(view, /<figure class="home-hero-showcase__detail">\s*<img src="\/images\/home-hero-filmfestival-video-880\.webp"[\s\S]*?alt="[^"]*Kurdischen Filmfestivals Berlin mit Filmplayer/);
});

test('Skripte erzwingen beim Laden keine Layout-Berechnung', () => {
  const footer = read('views/partials/footer.ejs');
  assert.doesNotMatch(footer, /var lastY = window\.scrollY;/);
  assert.doesNotMatch(footer, /window\.addEventListener\('resize', toggleBackToTop\);\s*toggleBackToTop\(\);/);

  const polish = read('public/js/interaction-polish.js');
  assert.match(polish, /var updates = hyphenProtectionNodes\.map/);
  assert.match(polish, /updates\.forEach\(function\(update\) \{\s*if \(update\[0\]\.nodeValue !== update\[1\]\)/);

  const slider = read('public/js/progressSlider.js');
  assert.match(slider, /window\.addEventListener\('scroll',\s*onScroll, \{ passive: true \}\)/);
  assert.match(slider, /requestAnimationFrame/);
});

test('Animationen laufen über transform statt über Layout-Eigenschaften', () => {
  const css = read('public/css/main.css');
  const fill = css.match(/\.progress-fill \{([^}]*)\}/)[1];
  assert.match(fill, /transform: scaleY\(var\(--progress-scale, 0\)\)/);
  assert.doesNotMatch(fill, /transition: height/);
  assert.doesNotMatch(css.match(/\.heroLinks a:not\(\.btn\) \{([^}]*)\}/)[1], /transition: all/);
  assert.doesNotMatch(css.match(/\.main-nav \.dropdown-menu li a \{([^}]*)\}/)[1], /transition: all/);
});

test('Pfeil nach oben reagiert auch, während die Seite noch nachschwingt', () => {
  const footer = read('views/partials/footer.ejs');
  assert.match(footer, /backToTop\.addEventListener\('touchend', function\(event\) \{[\s\S]*?scrollToTop\(event\);[\s\S]*?\}, \{ passive: false \}\);/);
  assert.match(footer, /backToTop\.addEventListener\('click', scrollToTop\);/);
  assert.match(footer, /window\.scrollTo\(\{ top: 0, left: 0, behavior: reduceMotion \? 'auto' : 'smooth' \}\)/);
  assert.match(read('public/extra.css'), /\.back-to-top--fixed \{[^}]*touch-action: manipulation;/);
});
