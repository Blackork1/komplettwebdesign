import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { addFontFallbacks, findMissingFontFallbacks } from '../helpers/fontFallbacks.js';

// Inter/Poppins überall, ohne PageSpeed-Verlust (Oktober 2026).
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(path.join(root, file), 'utf8');

function cssSources(dir = path.join(root, 'public'), files = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full);
    if (statSync(full).isDirectory()) {
      if (!/^public\/(assets|uploads|images)$/.test(rel)) cssSources(full, files);
    } else if (name.endsWith('.css') && !name.endsWith('.min.css') && !/bootstrap/.test(name)) {
      files.push(rel);
    }
  }
  return files;
}

test('jede Schriftangabe mit Inter/Poppins hat die abgestimmte Ersatzschrift', () => {
  const missing = cssSources().flatMap((file) => findMissingFontFallbacks(read(file)).map((m) => `${file}: ${m}`));
  assert.deepEqual(missing, [], 'In neuen Regeln nach "Inter" bzw. "Poppins" die Ersatzschrift ergänzen (helpers/fontFallbacks.js)');
});

test('Ersatzschriften-Helfer ergänzt korrekt und lässt @font-face unverändert', () => {
  assert.equal(addFontFallbacks('a{font-family:"Poppins", "Inter", sans-serif}'), 'a{font-family:"Poppins", "Poppins Fallback", "Inter", "Inter Fallback", sans-serif}');
  assert.equal(addFontFallbacks('a{font: 600 1rem/1.5 var(--font-body, \'Inter\', sans-serif)}'), 'a{font: 600 1rem/1.5 var(--font-body, \'Inter\', "Inter Fallback", sans-serif)}');
  const face = '@font-face{font-family:"Inter";src:url(x.woff2)}';
  assert.equal(addFontFallbacks(face), face);
});

test('main.css definiert die vier abgestimmten Ersatzschriften', () => {
  const css = read('public/css/main.css');
  for (const family of ['Inter Fallback', 'Poppins Fallback']) {
    const faces = css.match(new RegExp(`@font-face \\{\\s*font-family: "${family}";[^}]*\\}`, 'g')) || [];
    assert.equal(faces.length, 2, family);
    faces.forEach((face) => {
      assert.match(face, /local\("Arial/);
      assert.match(face, /size-adjust: \d+\.\d+%/);
      assert.match(face, /ascent-override/);
    });
  }
});

test('Webschriften sind nur zentral im Head definiert, nicht mehr in einzelnen Seiten-CSS', () => {
  for (const file of cssSources()) {
    const faces = read(file).match(/@font-face\s*\{[^}]*\}/g) || [];
    for (const face of faces) {
      assert.doesNotMatch(face, /font-family:\s*["']?(Inter|Poppins)["']?\s*;/, `${file} definiert Inter/Poppins selbst`);
    }
  }
  for (const font of ['inter-400', 'inter-600', 'poppins-400', 'poppins-700']) {
    const file = path.join(root, `public/fonts/${font}.woff2`);
    assert.ok(existsSync(file), `${font} fehlt`);
    assert.ok(statSync(file).size < 20_000, `${font} ist zu groß`);
  }
});

test('Head wechselt die Schrift nie auf einer sichtbaren Seite und bremst den ersten Besuch nicht', () => {
  const head = read('views/partials/head.ejs');
  assert.match(head, /<style id="kwd-webfonts" media="print"><%- webfontFaces\('optional'\) %><\/style>/);
  assert.match(head, /<noscript><style><%- webfontFaces\('swap'\) %><\/style><\/noscript>/);
  assert.match(head, /localStorage\.getItem\(key\) === '1'/);
  assert.match(head, /if \(!loaded \|\| !painted \|\| started\) return;/);
  assert.match(head, /largest-contentful-paint/);
  assert.match(head, /new FontFace\(font\[0\]/);
  assert.doesNotMatch(head, /<link rel="preload"[^>]*(inter|poppins)/i);
});

test('Paket-Überschrift passt auf schmale Handys', () => {
  const css = read('public/package-detail.css');
  assert.match(css, /@media \(max-width: 560px\) \{\s*\.packages-page\.package-detail-page \.package-detail-hero\.unified-hero \.hero-title \{\s*font-size: clamp\(1\.9rem, 9vw, 2\.75rem\) !important;/);
});

test('Blog- und Ratgeberinhalte verbreitern die Seite auf dem Handy nicht', () => {
  const css = read('public/ratgeber.css');
  assert.match(css, /\.rg-article-body \{\s*overflow-wrap: break-word;\s*\}/);
  assert.match(css, /\.rg-article-body table \{\s*display: block;\s*max-width: 100%;\s*overflow-x: auto;/);
});
