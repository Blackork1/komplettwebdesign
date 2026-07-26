import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
const head = readFileSync(new URL('../views/partials/head.ejs', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');

const tagContaining = (source, tagName, needle) => {
  const tags = source.match(new RegExp(`<${tagName}\\b[^\\n]*`, 'g')) || [];
  const tag = tags.find((candidate) => candidate.includes(needle));
  assert.ok(tag, `${tagName}-Element für ${needle} fehlt`);
  return tag;
};

const ruleBlock = (source, selector) => {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector}-Regel fehlt`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return source.slice(open + 1, close);
};

test('nur das wahrscheinliche LCP-Bild lädt eager und high priority', () => {
  const mainImage = tagContaining(view, 'img', 'home-hero-klarblick-desktop.webp');
  const detailImage = tagContaining(view, 'img', 'home-hero-klarblick-termin-crop.webp');
  const phoneImage = tagContaining(view, 'img', 'home-hero-klarblick-mobile-screen.webp');

  assert.match(mainImage, /fetchpriority="high"/);
  assert.match(mainImage, /loading="eager"/);
  assert.match(detailImage, /fetchpriority="low"/);
  assert.match(detailImage, /loading="lazy"/);
  assert.match(phoneImage, /fetchpriority="low"/);
  assert.match(phoneImage, /loading="lazy"/);
});

test('LCP-Inhalt ist vor Animations-JavaScript sichtbar', () => {
  const mainRule = ruleBlock(
    css,
    '.home-page .home-hero-showcase figure.home-hero-showcase__main'
  );

  assert.match(mainRule, /opacity:\s*1/);
  assert.doesNotMatch(
    css,
    /\.home-hero-showcase\.home-hero-reveal\.animate-on-scroll:not\(\.visible\)\s+figure\s*\{/
  );
});

test('Head lädt genau die drei vorgesehenen projektspezifischen Fonts vor', () => {
  const preloads = (head.match(/<link rel="preload"[^\n]+as="font"[^\n]*/g) || []);
  const fontPaths = preloads.map((link) => {
    const match = link.match(/(?:assets\/css|fonts)\/[^')]+\.woff2/);
    assert.ok(match, `Font-Pfad fehlt in: ${link}`);
    return match[0];
  });

  assert.deepEqual(fontPaths, [
    'assets/css/fa-solid-900.woff2',
    'fonts/inter-v19-latin-regular.woff2',
    'fonts/poppins-v23-latin-700.woff2'
  ]);
});
