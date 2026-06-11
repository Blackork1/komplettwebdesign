import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const header = read('views/partials/header.ejs');
const navToggle = read('public/js/navToggle.js');
const mainCss = read('public/css/main.css');
const extraCss = read('public/extra.css');

const requiredIcons = [
  'start',
  'webdesign',
  'packages',
  'services',
  'relaunch',
  'local-seo',
  'landingpage',
  'audit',
  'maintenance',
  'addons',
  'running-costs',
  'references',
  'contact',
  'request'
];

test('mobile offcanvas navigation markup exposes backdrop, close button and icon slots', () => {
  assert.match(header, /id="mobile-nav-backdrop"/);
  assert.match(header, /id="mobile-nav-close"/);
  assert.match(header, /class="mobile-nav-panel__header"/);
  assert.match(header, /class="mobile-nav-icon"/);
  assert.match(header, /navIconMap/);
});

test('each mobile navigation item has a local SVG icon asset', () => {
  for (const icon of requiredIcons) {
    const iconPath = new URL(`../public/images/nav-icons/${icon}.svg`, import.meta.url);
    assert.ok(existsSync(iconPath), `missing ${icon}.svg`);
  }
});

test('mobile offcanvas opens from left on phones and from right on tablets', () => {
  assert.match(mainCss, /\.links\.heroLinks[\s\S]*width:\s*min\(85vw,\s*420px\)/);
  assert.match(mainCss, /\.links\.heroLinks[\s\S]*transform:\s*translateX\(-105%\)/);
  assert.match(mainCss, /@media \(min-width:\s*768px\) and \(max-width:\s*1180px\)[\s\S]*max-width:\s*500px/);
  assert.match(mainCss, /@media \(min-width:\s*768px\) and \(max-width:\s*1180px\)[\s\S]*transform:\s*translateX\(105%\)/);
});

test('mobile navigation script closes via backdrop, close button and escape key', () => {
  assert.match(navToggle, /mobile-nav-backdrop/);
  assert.match(navToggle, /mobile-nav-close/);
  assert.match(navToggle, /backdrop\.addEventListener\("click"/);
  assert.match(navToggle, /closeButton\.addEventListener\("click"/);
  assert.match(navToggle, /event\.key === "Escape"/);
  assert.match(navToggle, /mobile-nav-open/);
  assert.match(navToggle, /applyMobilePanelPosition/);
  assert.match(navToggle, /is-closing/);
  assert.doesNotMatch(navToggle, /setProperty\("transform"/);
  assert.match(mainCss, /\.links\.heroLinks\.active[\s\S]*transform:\s*translateX\(0\)/);
  assert.match(mainCss, /\.links\.heroLinks\.is-closing[\s\S]*visibility:\s*visible/);
  assert.doesNotMatch(navToggle, /openDefaultDropdown/);
  assert.doesNotMatch(navToggle, /requestAnimationFrame\(openDefaultDropdown\)/);
});

test('mobile offcanvas keeps services closed by default and aligns tablet header controls', () => {
  assert.match(extraCss, /#nav-links\.mobile-nav-panel \.main-nav \.dropdown-toggle[\s\S]*margin:\s*0/);
  assert.match(extraCss, /#nav-links\.mobile-nav-panel \.main-nav \.dropdown-toggle > a\.nav-link-item[\s\S]*padding:\s*0\.95rem 0 0\.95rem 1\.2rem/);
  assert.match(extraCss, /#nav-links\.mobile-nav-panel \.main-nav \.dropdown-menu[\s\S]*margin:\s*0 5px 0\.8rem 3\.55rem/);
  assert.match(extraCss, /#nav-links\.mobile-nav-panel \.main-nav \.dropdown-menu[\s\S]*width:\s*calc\(100% - 3\.55rem - 5px\)/);
  assert.match(extraCss, /#nav-links\.mobile-nav-panel \.mobile-nav-panel__header[\s\S]*flex-direction:\s*row-reverse/);
});

test('mobile active states color top-level links and service sublinks consistently', () => {
  assert.match(header, /isSameOrChildPath/);
  assert.match(extraCss, /#nav-links\.mobile-nav-panel > a\.nav-link-item\.is-active[\s\S]*color:\s*var\(--color-accent\)\s*!important/);
  assert.match(extraCss, /#nav-links\.mobile-nav-panel \.main-nav \.dropdown\.is-active > \.dropdown-toggle > a\.nav-link-item[\s\S]*color:\s*var\(--color-accent\)\s*!important/);
  assert.match(extraCss, /#nav-links\.mobile-nav-panel \.main-nav \.dropdown-menu li a\.nav-sub-link\.is-active[\s\S]*color:\s*var\(--color-accent\)\s*!important/);
});
