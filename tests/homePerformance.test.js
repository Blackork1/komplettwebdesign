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

test('Hero-Hauptbild lädt sofort, hohe Priorität nur auf dem Desktop per Preload', () => {
  const mainImage = tagContaining(view, 'img', 'home-hero-sauber-desktop.webp');
  const detailImage = tagContaining(view, 'img', 'home-hero-filmfestival-mediathek-880.webp');
  const phoneImage = tagContaining(view, 'img', 'home-hero-backstube-mobile.webp');

  // Auf dem Handy liegt das Bild unter dem ersten Bildschirm; hohe Priorität würde dort
  // nur Bandbreite vom sichtbaren Text abziehen (PageSpeed: LCP).
  assert.match(mainImage, /fetchpriority="low"/);
  assert.match(mainImage, /loading="eager"/);
  const controller = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
  assert.match(controller, /<link rel="preload" as="image" href="\/images\/home-hero-sauber-desktop\.webp" imagesrcset="\$\{srcsetFor\('\/images\/home-hero-sauber-desktop\.webp'\)\}" imagesizes="\(max-width: 1020px\) 620px, 570px" media="\(min-width: 769px\)" fetchpriority="high">/);
  assert.match(detailImage, /fetchpriority="low"/);
  assert.match(detailImage, /loading="lazy"/);
  assert.match(phoneImage, /fetchpriority="low"/);
  assert.match(phoneImage, /loading="lazy"/);
});

test('komplette Hero-Copy ist ohne Animations-JavaScript sichtbar', () => {
  const heroStart = view.indexOf('<section class="hero hero-main" id="hero">');
  const heroEnd = view.indexOf("    <%- include('partials/hero-highlight-marquee'");
  const hero = view.slice(heroStart, heroEnd);
  const revealRule = ruleBlock(css, '.hero-main .home-hero-reveal.animate-on-scroll');

  [
    /class="hero-badge[^"]*home-hero-reveal[^"]*animate-on-scroll"/,
    /<h1 class="[^"]*home-hero-reveal[^"]*animate-on-scroll"/,
    /class="home-hero-claim[^"]*home-hero-reveal[^"]*animate-on-scroll"/,
    /<p class="home-hero-lead[^"]*home-hero-reveal[^"]*animate-on-scroll"/,
    /<li class="[^"]*home-hero-reveal[^"]*animate-on-scroll"/,
    /class="hero-ctas[^"]*home-hero-reveal[^"]*animate-on-scroll"/,
    /class="home-hero-trust-note[^"]*home-hero-reveal[^"]*animate-on-scroll"/
  ].forEach((pattern) => assert.match(hero, pattern));

  assert.match(revealRule, /opacity:\s*1/);
  assert.doesNotMatch(revealRule, /opacity:\s*0/);
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

test('Head lädt nur die Icon-Schrift vor (Inter/Poppins nutzen die meisten Seiten gar nicht)', () => {
  const preloads = (head.match(/<link rel="preload"[^\n]+as="font"[^\n]*/g) || []);
  const fontPaths = preloads.map((link) => {
    const match = link.match(/(?:assets\/css|fonts)\/[^')]+\.woff2/);
    assert.ok(match, `Font-Pfad fehlt in: ${link}`);
    return match[0];
  });

  assert.deepEqual(fontPaths, ['assets/css/fa-solid-900-subset.woff2']);
});
