import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const leistungenShow = read('views/leistungen/show.ejs');
const webdesignBerlin = read('views/bereiche/webdesign-berlin.ejs');
const webdesignBerlinEn = read('views/bereiche/webdesign-berlin-en.ejs');
const localSeoBerlin = read('views/static/local-seo-berlin.ejs');
const maintenanceBerlin = read('views/static/website-wartung-berlin.ejs');
const addOnsWebdesign = read('views/static/zusatzleistungen-webdesign.ejs');
const leistungenCss = read('public/leistungen.css');
const districtCss = read('public/district-berlin.css');
const extraCss = read('public/extra.css');
const interactionPolish = read('public/js/interaction-polish.js');

test('current package prices render as a wide horizontal slider with aligned headings and primary CTAs', () => {
  assert.match(leistungenShow, /class="[^"]*\bcost-package-slider\b[^"]*"/);
  assert.match(leistungenShow, /data-package-slider/);
  assert.match(leistungenShow, /cost-package-card__head/);
  assert.match(leistungenShow, /cost-card__badge--placeholder/);
  assert.match(leistungenShow, /<a class="btn btn-primary" href="<%= pkg\.href %>"/);
  assert.match(leistungenShow, /Individuelles Projekt-Paket ansehen/);
  assert.match(leistungenCss, /\.cost-package-slider\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;[\s\S]*?scroll-snap-type:\s*none;/);
  assert.match(leistungenCss, /\.cost-package-card\s*\{[\s\S]*?flex:\s*0 0 clamp\(/);
  assert.match(leistungenCss, /\.cost-package-card__head\s*\{[\s\S]*?grid-template-rows:\s*32px auto;/);
});

test('package offer sections across service pages use the shared slider contract', () => {
  for (const [label, source, pattern] of [
    ['webdesign berlin canonical hub', webdesignBerlin, /wd-packages[\s\S]*data-wd-pricing-slider[\s\S]*data-package-slider/],
    ['webdesign berlin english hub', webdesignBerlinEn, /wd-packages-grid[\s\S]*data-package-slider/],
    ['local seo package connection', localSeoBerlin, /local-seo-card-grid--packages[\s\S]*data-package-slider/],
    ['maintenance plans', maintenanceBerlin, /maintenance-plan-grid[\s\S]*data-package-slider/],
    ['add-ons package boundary', addOnsWebdesign, /add-ons-card-grid--packages[\s\S]*data-package-slider/]
  ]) {
    assert.match(source, pattern, `${label} should expose a draggable package slider`);
  }

  assert.match(webdesignBerlinEn, /wd-package-card__label--placeholder/);
  assert.match(webdesignBerlin, /wd-package__label--placeholder/);
  assert.match(webdesignBerlin, /Individuelles Projekt-Paket ansehen/);
  assert.doesNotMatch(webdesignBerlin, /slider\.addEventListener\('pointerdown'/);
  assert.match(maintenanceBerlin, /maintenance-plan-badge--placeholder/);
});

test('shared CSS and JavaScript support mouse and touch package scrolling', () => {
  assert.match(extraCss, /\.package-slider-scroll\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;[\s\S]*?scroll-snap-type:\s*none;/);
  assert.match(extraCss, /\.package-slider-scroll\s*>\s*\*\s*\{[\s\S]*?scroll-snap-align:\s*none;/);
  assert.match(districtCss, /\.webdesign-berlin-page\s+\.wd-packages-grid\[data-package-slider\]\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;/);
  assert.match(interactionPolish, /data-package-slider/);
  assert.match(interactionPolish, /pointerdown/);
  assert.match(interactionPolish, /setPointerCapture/);
  assert.match(interactionPolish, /scrollLeft/);
});

test('shared package slider drag mirrors the homepage anti-selection behavior', () => {
  assert.match(extraCss, /\.package-slider-scroll\.is-dragging\s*\{[\s\S]*?scroll-snap-type:\s*none;/);
  assert.match(extraCss, /\.package-slider-scroll\.is-dragging[\s\S]*?user-select:\s*none;/);
  assert.match(extraCss, /\.package-slider-scroll\s+img\s*\{[\s\S]*?-webkit-user-drag:\s*none;/);
  assert.match(interactionPolish, /event\.preventDefault\(\);[\s\S]*?slider\.setPointerCapture/);
  assert.match(interactionPolish, /dragDistance\s*>\s*8/);
  assert.match(interactionPolish, /event\.stopPropagation\(\)/);
  assert.match(interactionPolish, /pointerleave/);
});
