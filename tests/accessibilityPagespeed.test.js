import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Befunde aus PageSpeed Insights (Barrierefreiheit), Oktober 2026.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function contrast(hexA, hexB = 'ffffff') {
  const lum = (hex) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(hexA), lum(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

test('Links im Fließtext haben genug Kontrast und sind unterstrichen', () => {
  const rule = read('public/home.css').match(/\.linkColor \{([^}]*)\}/)[1];
  const color = rule.match(/color: #([0-9a-f]{6})/i)[1];
  assert.ok(contrast(color) >= 4.5, `Kontrast ${contrast(color).toFixed(2)}`);
  assert.match(rule, /text-decoration: underline/);
});

test('aktiver Menüpunkt hat genug Kontrast', () => {
  const rule = read('public/footer.css').match(/\.main-nav \.dropdown-menu a\.is-active \{([^}]*)\}/)[1];
  const color = rule.match(/color: #([0-9a-f]{6})/i)[1];
  assert.ok(contrast(color) >= 4.5, `Kontrast ${contrast(color).toFixed(2)}`);
});

test('Tippflächen sind mindestens 24 × 24 px und überlappen nicht', () => {
  const extra = read('public/extra.css').match(/\n\.main-nav \.dropdown-toggle-btn \{([^}]*)\}/)[1];
  assert.match(extra, /min-height: 24px/);
  assert.match(extra, /min-width: 24px/);
  const main = read('public/css/main.css');
  assert.match(main, /\.icon-link \{[^}]*min-height: 24px;[^}]*min-width: 24px;/);
  assert.match(main, /\.icon-link\.is-crowded \{\s*display: none !important;/);
  const slider = read('public/js/progressSlider.js');
  assert.match(slider, /const MIN_ICON_GAP = (\d+);/);
  assert.ok(Number(slider.match(/const MIN_ICON_GAP = (\d+);/)[1]) >= 24);
  assert.match(slider, /link\.classList\.toggle\('is-crowded', crowded\)/);
});

test('Footer-Überschrift überspringt keine Ebene', () => {
  const footer = read('views/partials/footer.ejs');
  assert.doesNotMatch(footer, /<h4\b/);
  assert.match(footer, /<h2 class="newsletter-title">/);
  assert.doesNotMatch(read('public/footer.css'), /\.newsletter h4/);
});
