import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homepageTemplate = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
const homeCss = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');
const homepage = `${homepageTemplate}\n${homeCss}`;
const slideOnScroll = readFileSync(new URL('../public/js/slideOnScroll.js', import.meta.url), 'utf8');
const heroStart = homepage.indexOf('<section class="hero hero-main" id="hero">');
const heroEnd = homepage.indexOf("    <%- include('partials/hero-highlight-marquee'");
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
  assert.match(
    hero,
    /<p class="home-hero-claim home-hero-reveal home-hero-reveal--support animate-on-scroll">/
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
    /class="home-hero-trust-note home-hero-reveal home-hero-reveal--trust animate-on-scroll"/
  );
  assert.match(
    hero,
    /class="home-hero-showcase home-hero-reveal home-hero-reveal--visual animate-on-scroll"/
  );
  assert.match(hero, /\/images\/home-hero-klarblick-desktop\.webp/);
  assert.match(hero, /\/images\/home-hero-klarblick-termin-crop\.webp/);
  assert.match(hero, /\/images\/home-hero-klarblick-mobile-screen\.webp/);
  assert.doesNotMatch(hero, /heroBadgePackages/);
  assert.doesNotMatch(hero, /heroPriceInfo/);

  const h1Index = indexOf(/home-hero-reveal--h1/, 'H1 reveal');
  indexOf(/<span class="hero-badge mb-3 home-hero-reveal home-hero-reveal--support animate-on-scroll">/, 'badge reveal');
  const h2Index = indexOf(/<h2 class="home-hero-reveal home-hero-reveal--support animate-on-scroll">/, 'H2 reveal');
  const bulletsIndex = indexOf(/home-hero-bullets/, 'bullet reveal list');
  const actionsIndex = indexOf(/home-hero-reveal--actions/, 'CTA reveal');
  const trustIndex = indexOf(/home-hero-reveal--trust/, 'trust note reveal');
  const visualIndex = indexOf(/home-hero-reveal--visual/, 'visual reveal');

  assert.ok(h1Index < h2Index);
  assert.ok(h2Index < bulletsIndex);
  assert.ok(bulletsIndex < actionsIndex);
  assert.ok(actionsIndex < trustIndex);
  assert.ok(trustIndex < visualIndex);
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
  assert.match(homepage, /\.home-hero-reveal--trust \{[\s\S]*?--home-hero-reveal-delay: 720ms/);
  assert.match(homepage, /\.home-hero-reveal--visual \{[\s\S]*?--home-hero-reveal-delay: 260ms/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*var\(--home-hero-card-transform\);[\s\S]*?will-change:\s*opacity,\s*transform;/);
  assert.match(homepage, /\.home-page \.home-hero-showcase\.home-hero-reveal\.animate-on-scroll:not\(\.visible\) figure\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*var\(--home-hero-card-start-transform\);/);
  assert.match(homepage, /\.home-page \.home-hero-showcase\.home-hero-reveal\.animate-on-scroll\.visible figure\s*\{[\s\S]*?animation:\s*home-hero-card-fly-in 0\.72s cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) var\(--home-hero-card-delay\) both;/);
  assert.match(homepage, /@keyframes home-hero-card-fly-in\s*\{[\s\S]*?from\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*var\(--home-hero-card-start-transform\);[\s\S]*?to\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*var\(--home-hero-card-transform\);/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\.home-hero-showcase__main\s*\{[\s\S]*?--home-hero-card-delay:\s*360ms;[\s\S]*?--home-hero-card-transform:\s*rotate\(-1\.4deg\);/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\.home-hero-showcase__detail\s*\{[\s\S]*?--home-hero-card-delay:\s*540ms;[\s\S]*?--home-hero-card-transform:\s*rotate\(4deg\);/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\.home-hero-showcase__phone\s*\{[\s\S]*?--home-hero-card-delay:\s*700ms;[\s\S]*?--home-hero-card-transform:\s*rotate\(-4deg\);/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\.home-hero-showcase__detail\s*\{/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\.home-hero-showcase__detail::after\s*\{[\s\S]*?right:\s*-4px/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\.home-hero-showcase__phone\s*\{/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\.home-hero-showcase__phone::after\s*\{[\s\S]*?right:\s*-4px/);
  assert.match(homepage, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(homepage, /\.home-page \.home-hero-showcase figure\s*\{[\s\S]*?opacity:\s*1 !important;[\s\S]*?transform:\s*var\(--home-hero-card-transform\) !important;[\s\S]*?transition:\s*none !important;/);
  assert.match(slideOnScroll, /window\.addEventListener\('load', callback, \{ once: true \}\)/);
});

test('homepage hero bridge spans the hero width and accelerates on smaller viewports', () => {
  assert.match(homeCss, /\.home-page \.hero-bridge\s*\{[\s\S]*?--highlight-marquee-duration:\s*30s;/);
  assert.match(homeCss, /\.home-page \.hero-bridge\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*none;[\s\S]*?overflow:\s*visible;/);
  assert.match(homeCss, /\.home-page \.highlight-marquee__track\s*\{[\s\S]*?min-width:\s*max-content;[\s\S]*?max-width:\s*none;[\s\S]*?animation:\s*highlight-marquee-scroll var\(--highlight-marquee-duration\) linear infinite;/);
  assert.match(homeCss, /\.home-page \.highlight-marquee__group\s*\{[\s\S]*?min-width:\s*max-content;[\s\S]*?max-width:\s*none;[\s\S]*?overflow:\s*visible;/);
  assert.match(homeCss, /\.home-page \.highlight-chip\s*\{[\s\S]*?flex:\s*0 0 auto;/);
  assert.match(homeCss, /@media\s*\(max-width:\s*1020px\)\s*\{[\s\S]*?\.home-page \.hero-bridge\s*\{[\s\S]*?--highlight-marquee-duration:\s*22s;/);
  assert.match(homeCss, /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.home-page \.hero-bridge\s*\{[\s\S]*?--highlight-marquee-duration:\s*14s;/);
  assert.match(homeCss, /@media\s*\(max-width:\s*540px\)\s*\{[\s\S]*?\.home-page \.hero-bridge\s*\{[\s\S]*?--highlight-marquee-duration:\s*10s;/);
});
