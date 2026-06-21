import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const packageDetailTemplate = readFileSync(new URL('../views/package_detail.ejs', import.meta.url), 'utf8');
const packageDetailCss = readFileSync(new URL('../public/package-detail.css', import.meta.url), 'utf8');
const controllerSource = readFileSync(new URL('../controllers/packagesController.js', import.meta.url), 'utf8');
const packageDetailJsUrl = new URL('../public/js/package-detail.js', import.meta.url);
const packageDetailJs = existsSync(packageDetailJsUrl)
  ? readFileSync(packageDetailJsUrl, 'utf8')
  : '';

test('package detail appointment select keeps appointment optional and exposes custom calendar option', () => {
  assert.match(packageDetailTemplate, /<select id="slot" name="slot" data-package-slot-select[^>]*>/);
  assert.match(packageDetailTemplate, /<option value="" selected>/);
  assert.match(packageDetailTemplate, /Termin später abstimmen/);
  assert.match(packageDetailTemplate, /<option value="__custom" data-package-custom-slot>/);
  assert.match(packageDetailTemplate, /Anderen Termin/);
  assert.match(packageDetailTemplate, /Other appointment/);
});

test('package detail page renders an accessible appointment calendar overlay', () => {
  assert.match(packageDetailTemplate, /class="package-slot-overlay"[\s\S]*?data-package-slot-overlay[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(packageDetailTemplate, /data-package-calendar-days/);
  assert.match(packageDetailTemplate, /data-package-time-list/);
  assert.match(packageDetailTemplate, /data-package-selected-summary/);
  assert.match(packageDetailTemplate, /js\/package-detail\.js/);
});

test('package detail calendar loads available backend slots and writes the selected slot into the package form', () => {
  assert.match(packageDetailJs, /\/api\/calendar\?month=/);
  assert.match(packageDetailJs, /\/api\/day-slots\?date=/);
  assert.match(packageDetailJs, /CUSTOM_SLOT_VALUE\s*=\s*['"]__custom['"]/);
  assert.match(packageDetailJs, /select\.value\s*=\s*String\(slot\.id\)/);
  assert.match(packageDetailJs, /option\.dataset\.calendarSlot\s*=\s*['"]true['"]/);
  assert.match(packageDetailJs, /state\.selectedFromOverlay\s*=\s*true/);
  assert.match(packageDetailJs, /if\s*\(state\.selectedFromOverlay\)\s*\{/);
});

test('package detail calendar overlay has page-specific styling without inline styles', () => {
  assert.match(packageDetailCss, /\.package-slot-overlay\s*\{/);
  assert.match(packageDetailCss, /\.package-slot-dialog\s*\{/);
  assert.match(packageDetailCss, /\.package-slot-calendar-grid\s*\{/);
  assert.match(packageDetailCss, /\.package-slot-time-button\s*\{/);
});

test('package contact treats the custom calendar sentinel as no selected slot until JS writes a real id', () => {
  assert.match(controllerSource, /PACKAGE_CUSTOM_SLOT_VALUE\s*=\s*['"]__custom['"]/);
  assert.match(controllerSource, /Number\.isInteger\(slotId\)\s*&&\s*slotId\s*>\s*0/);
  assert.match(controllerSource, /if\s*\(hasSelectedSlot\)\s*\{/);
  assert.doesNotMatch(controllerSource, /lockSlot\(Number\(slot\)\)/);
});
