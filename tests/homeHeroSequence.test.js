import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homepage = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
const slideOnScroll = readFileSync(new URL('../public/js/slideOnScroll.js', import.meta.url), 'utf8');
const heroStart = homepage.indexOf('<section class="hero hero-main" id="hero">');
const heroEnd = homepage.indexOf('    <!-- 2) Agentur-Einleitung -->');
const hero = homepage.slice(heroStart, heroEnd);

function indexOf(pattern, label) {
  const index = hero.search(pattern);
  assert.notEqual(index, -1, `${label} should exist`);
  return index;
}

test('homepage hero has sequenced after-load reveal targets', () => {
  assert.notEqual(heroStart, -1);
  assert.notEqual(heroEnd, -1);

  assert.match(hero, /class="hero-content home-hero-sequence"/);
  assert.match(
    hero,
    /<h1 class="display-5 fw-bold mt-2 home-hero-reveal home-hero-reveal--h1 animate-on-scroll">/
  );
  assert.match(
    hero,
    /<span class="hero-badge mb-3 home-hero-reveal home-hero-reveal--support animate-on-scroll">/
  );
  assert.match(
    hero,
    /<h2 class="home-hero-reveal home-hero-reveal--support animate-on-scroll">/
  );

  assert.match(hero, /<ul class="home-hero-bullets" role="list">/);
  const bulletItems = hero.match(
    /<li class="home-hero-reveal home-hero-reveal--bullet animate-on-scroll">/g
  ) || [];
  assert.equal(bulletItems.length, 3);

  assert.match(
    hero,
    /class="hero-ctas home-hero-reveal home-hero-reveal--actions animate-on-scroll"/
  );
  assert.match(
    hero,
    /class="mt-2 mb-0 heroPriceInfo home-hero-reveal home-hero-reveal--prices animate-on-scroll"/
  );

  const h1Index = indexOf(/home-hero-reveal--h1/, 'H1 reveal');
  indexOf(/<span class="hero-badge mb-3 home-hero-reveal home-hero-reveal--support animate-on-scroll">/, 'badge reveal');
  const h2Index = indexOf(/<h2 class="home-hero-reveal home-hero-reveal--support animate-on-scroll">/, 'H2 reveal');
  const bulletsIndex = indexOf(/home-hero-bullets/, 'bullet reveal list');
  const actionsIndex = indexOf(/home-hero-reveal--actions/, 'CTA reveal');
  const pricesIndex = indexOf(/home-hero-reveal--prices/, 'price reveal');

  assert.ok(h1Index < h2Index);
  assert.ok(h2Index < bulletsIndex);
  assert.ok(bulletsIndex < actionsIndex);
  assert.ok(actionsIndex < pricesIndex);
});

test('homepage hero sequence uses branch-style load timing with staggered delays', () => {
  assert.match(
    homepage,
    /\.hero-main \.home-hero-reveal\.animate-on-scroll \{[\s\S]*?transition-delay: var\(--home-hero-reveal-delay, 0ms\)/
  );
  assert.match(homepage, /\.home-hero-reveal--h1 \{[\s\S]*?--home-hero-reveal-delay: 0ms/);
  assert.match(homepage, /\.home-hero-reveal--support \{[\s\S]*?--home-hero-reveal-delay: 180ms/);
  assert.match(homepage, /\.home-hero-bullets li:nth-child\(1\) \{[\s\S]*?300ms/);
  assert.match(homepage, /\.home-hero-bullets li:nth-child\(2\) \{[\s\S]*?390ms/);
  assert.match(homepage, /\.home-hero-bullets li:nth-child\(3\) \{[\s\S]*?480ms/);
  assert.match(homepage, /\.home-hero-reveal--actions \{[\s\S]*?--home-hero-reveal-delay: 620ms/);
  assert.match(homepage, /\.home-hero-reveal--prices \{[\s\S]*?--home-hero-reveal-delay: 720ms/);
  assert.match(homepage, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(slideOnScroll, /window\.addEventListener\('load', callback, \{ once: true \}\)/);
});
