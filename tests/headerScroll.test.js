import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ejs from 'ejs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const headerPath = new URL('../views/partials/header.ejs', import.meta.url).pathname;
const mainCss = read('public/css/main.css');
const navToggle = read('public/js/navToggle.js');

function renderHeader(currentPathname) {
  return ejs.render(read('views/partials/header.ejs'), { currentPathname }, { filename: headerPath });
}

test('öffentliche Seiten bekommen die mitlaufende Kopfleiste, der Adminbereich nicht', () => {
  assert.match(renderHeader('/'), /<header class="site-header">/);
  assert.match(renderHeader('/kontakt'), /<header class="site-header">/);
  assert.match(renderHeader('/admin/test'), /<header>/);
  assert.doesNotMatch(renderHeader('/admin/test'), /site-header/);
});

test('Kopfleiste klebt oben und gleitet nur per transform weg', () => {
  const block = mainCss.match(/\n\.site-header \{([^}]*)\}/)[1];
  assert.match(block, /position: sticky;/);
  assert.match(block, /top: 0;/);
  assert.match(block, /transition: transform [^;,]*;/);
  assert.doesNotMatch(block, /transition: all/);

  const hidden = mainCss.match(/\.site-header\.site-header--hidden \{([^}]*)\}/)[1];
  assert.match(hidden, /transform: translate3d\(0, calc\(-100% - 24px\), 0\);/);
  assert.match(mainCss, /body\.mobile-nav-open \.site-header\.site-header--hidden \{\s*transform: none;/);
  assert.match(mainCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\.site-header \{\s*transition: none;/);
});

test('Sprungmarken landen unterhalb der eingeblendeten Leiste', () => {
  assert.match(mainCss, /html:has\(\.site-header\) \{\s*scroll-padding-top: 88px;/);
});

test('Scroll-Skript hört passiv zu, rechnet einmal pro Frame und lässt das Handymenü sichtbar', () => {
  assert.match(navToggle, /document\.querySelector\("\.site-header"\)/);
  assert.match(navToggle, /window\.addEventListener\(\s*"scroll",[\s\S]*?\{ passive: true \}\s*\)/);
  assert.match(navToggle, /window\.requestAnimationFrame\(update\)/);
  assert.match(navToggle, /classList\.toggle\("site-header--hidden", hidden\)/);
  assert.match(navToggle, /document\.body\.classList\.contains\("mobile-nav-open"\)/);
  assert.match(navToggle, /header\.addEventListener\("focusin"/);
  assert.doesNotMatch(navToggle, /style\.transform/);
});
