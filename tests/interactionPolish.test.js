import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const head = readFileSync(new URL('../views/partials/head.ejs', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../views/partials/footer.ejs', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const industryShow = readFileSync(new URL('../views/industries/show.ejs', import.meta.url), 'utf8');
const legacyIndustryTemplate = readFileSync(new URL('../views/branchen-tempaltes.ejs', import.meta.url), 'utf8');
const blogIndex = readFileSync(new URL('../views/blog/index.ejs', import.meta.url), 'utf8');
const blogShow = readFileSync(new URL('../views/blog/show.ejs', import.meta.url), 'utf8');
const ratgeberIndex = readFileSync(new URL('../views/ratgeber/index.ejs', import.meta.url), 'utf8');
const ratgeberShow = readFileSync(new URL('../views/ratgeber/show.ejs', import.meta.url), 'utf8');
const webdesignBerlin = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
const cssUrl = new URL('../public/interaction-polish.css', import.meta.url);
const jsUrl = new URL('../public/js/interaction-polish.js', import.meta.url);
const slideJsUrl = new URL('../public/js/slideOnScroll.js', import.meta.url);
const unifiedHeroCssUrl = new URL('../public/unified-hero.css', import.meta.url);

test('interaction polish assets are loaded through shared layout and manifest validation', () => {
  assert.match(head, /cssAsset\('interaction-polish\.css'\)/);
  assert.match(index, /'interaction-polish\.css'/);
  assert.match(footer, /scriptAsset\('js\/interaction-polish\.js'\)/);
});

test('interaction polish css defines scroll reveal and hover states for clickable elements', () => {
  assert.equal(existsSync(cssUrl), true);
  const css = readFileSync(cssUrl, 'utf8');

  assert.match(head, /document\.documentElement\.classList\.add\('kwd-interaction-polish'\)/);
  assert.ok(
    head.indexOf("document.documentElement.classList.add('kwd-interaction-polish')") <
      head.indexOf("cssAsset('interaction-polish.css')"),
    'interaction polish marker must be added before loading interaction polish css'
  );
  const criticalPrehideCss = css.slice(0, css.indexOf('.kwd-scroll-reveal {'));
  assert.doesNotMatch(criticalPrehideCss, /:is\(/);
  assert.doesNotMatch(criticalPrehideCss, /html\.kwd-interaction-polish/);
  assert.match(css, /\.kwd-scroll-reveal\b/);
  assert.match(css, /\.kwd-scroll-reveal--preparing\b/);
  assert.match(css, /\.kwd-scroll-reveal--visible\b/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.kwd-scroll-reveal--from-left,[\s\S]*?\.kwd-scroll-reveal--from-right\s*\{[\s\S]*?translate3d\(0,\s*24px,\s*0\)/);
  assert.match(css, /:where\(a\[href\]/);
  assert.match(css, /:hover/);
  assert.match(css, /:active/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /cubic-bezier\(0\.23,\s*1,\s*0\.32,\s*1\)/);
  assert.doesNotMatch(css, /clip-path/);
  assert.doesNotMatch(css, /will-change:[^;]*clip-path/);
  assert.doesNotMatch(css, /html\.kwd-interaction-polish[\s\S]*?unified-hero[\s\S]*?:not\(\.kwd-scroll-reveal--visible\)\s*\{/);
  assert.doesNotMatch(css, /html\.kwd-interaction-polish\s+\.blog-page/);
  assert.doesNotMatch(css, /html\.kwd-interaction-polish\s+\.rg-page/);
});

test('interaction polish script auto-applies scroll reveal while excluding homepage and branchen detail pages', () => {
  assert.equal(existsSync(jsUrl), true);
  const js = readFileSync(jsUrl, 'utf8');

  assert.match(js, /IntersectionObserver/);
  assert.match(js, /kwd-scroll-reveal/);
  assert.match(js, /kwd-scroll-reveal--preparing/);
  assert.match(js, /kwd-scroll-reveal--visible/);
  assert.match(js, /element\.closest\('\.blog-page, \.rg-page'\)\s*&&\s*!element\.closest\('\.unified-hero'\)/);
  assert.doesNotMatch(js, /startsWith\('\/blog'\)/);
  assert.doesNotMatch(js, /startsWith\('\/ratgeber'\)/);
  assert.doesNotMatch(js, /document\.querySelector\('\.home-page, \.blog-page, \.rg-page'\)/);
  assert.doesNotMatch(js, /closest\('\.home-page, \.blog-page, \.rg-page'\)/);
  assert.match(js, /startsWith\('\/branchen\/'\)/);
  assert.match(js, /#OverflowHidden #Hero, #Hero \.heroH1/);
  assert.doesNotMatch(js, /industry-detail-page/);
});

test('interaction polish script is cache-busted when loaded through the shared footer', () => {
  assert.match(footer, /scriptAsset\('js\/interaction-polish\.js'\)/);
  assert.doesNotMatch(footer, /<script src="\/js\/interaction-polish\.js" defer><\/script>/);
});

test('interaction polish prepares hero reveal targets before full page load but waits before showing them', () => {
  const js = readFileSync(jsUrl, 'utf8');
  const listeners = new Map();
  const target = createRevealTarget();
  const sandbox = createInteractionPolishSandbox({ listeners, target });

  vm.runInNewContext(js, sandbox);

  assert.equal(target.classList.contains('kwd-scroll-reveal'), true);
  assert.equal(target.classList.contains('kwd-scroll-reveal--preparing'), true);
  assert.equal(target.classList.contains('kwd-scroll-reveal--visible'), false);

  listeners.get('load')();

  assert.equal(target.classList.contains('kwd-scroll-reveal'), true);
  assert.equal(target.classList.contains('kwd-scroll-reveal--preparing'), true);
  assert.equal(target.classList.contains('kwd-scroll-reveal--visible'), false);
});

test('interaction polish treats semantic page hero headers as revealable content', () => {
  const js = readFileSync(jsUrl, 'utf8');
  const listeners = new Map();
  const target = createRevealTarget();
  target.closest = (selector) => {
    if (selector.includes('header')) {
      return {
        closest(innerSelector) {
          return innerSelector === 'main' ? {} : null;
        },
      };
    }
    if (selector.includes('.unified-hero')) return {};
    return null;
  };
  const sandbox = createInteractionPolishSandbox({ listeners, target });

  vm.runInNewContext(js, sandbox);

  assert.equal(target.classList.contains('kwd-scroll-reveal'), true);
});

test('interaction polish paints the reveal start state before showing an intersecting hero', () => {
  const js = readFileSync(jsUrl, 'utf8');
  const listeners = new Map();
  const animationFrames = [];
  const target = createRevealTarget();
  const sandbox = createInteractionPolishSandbox({
    listeners,
    target,
    animationFrames,
    intersectOnObserve: true,
  });

  vm.runInNewContext(js, sandbox);
  listeners.get('load')();

  assert.equal(target.classList.contains('kwd-scroll-reveal'), true);
  assert.equal(target.classList.contains('kwd-scroll-reveal--visible'), false);

  animationFrames.shift()();
  assert.equal(target.classList.contains('kwd-scroll-reveal--visible'), false);
  assert.equal(target.classList.contains('kwd-scroll-reveal--preparing'), false);

  animationFrames.shift()();
  assert.equal(target.classList.contains('kwd-scroll-reveal--visible'), true);
});

test('interaction polish explicitly reveals visible hero targets after page load without waiting for a flaky observer callback', () => {
  const js = readFileSync(jsUrl, 'utf8');

  assert.match(js, /function isInitiallyVisible/);
  assert.match(js, /element\.closest\('\.unified-hero'\)/);
  assert.match(js, /isInitiallyVisible\(element\)/);
  assert.match(js, /scheduleReveal\(element,\s*function\(\)\s*\{\s*observer\.unobserve\(element\);/);
});

test('interaction polish leaves blog and ratgeber article text outside reveal targets', () => {
  const js = readFileSync(jsUrl, 'utf8');

  assert.match(js, /element\.closest\('\.blog-page, \.rg-page'\)\s*&&\s*!element\.closest\('\.unified-hero'\)/);
  assert.doesNotMatch(js, /'\.rg-detail-layout'/);
  assert.doesNotMatch(js, /'\.rg-article'/);
  assert.doesNotMatch(js, /'\.rg-article-body'/);
  assert.doesNotMatch(js, /'\.rg-content-card'/);
});

test('webdesign berlin hero avoids mixing legacy child scroll classes with shared hero reveal', () => {
  const heroStart = webdesignBerlin.search(/<section id="hero" class="wd-container wd-hero unified-hero"/);
  assert.notEqual(heroStart, -1, 'missing webdesign berlin hero');
  const heroEnd = webdesignBerlin.indexOf('</section>', heroStart);
  assert.notEqual(heroEnd, -1, 'missing webdesign berlin hero end');
  const heroBlock = webdesignBerlin.slice(heroStart, heroEnd);

  assert.match(heroBlock, /home-hero-reveal home-hero-reveal--h1 animate-on-scroll/);
  assert.match(heroBlock, /home-hero-reveal home-hero-reveal--actions animate-on-scroll/);
  assert.doesNotMatch(heroBlock, /kwd-scroll-reveal/);
});

test('legacy scroll reveal waits for full page load before observing animated elements', () => {
  const js = readFileSync(slideJsUrl, 'utf8');

  assert.match(js, /window\.addEventListener\('load'/);
  assert.doesNotMatch(js, /DOMContentLoaded/);
});

test('unified hero css does not override reveal opacity or transform states', () => {
  const css = readFileSync(unifiedHeroCssUrl, 'utf8');
  const animateRule = css.match(/\.unified-hero\s+\.animate-on-scroll\s*\{[^}]*\}/)?.[0] || '';
  const leadRule = css.match(/\.unified-hero\s+:is\([^}]*?\.unified-hero__lead[^}]*?\)\s*\{[^}]*\}/)?.[0] || '';

  assert.match(css, /\.unified-hero__lead/);
  assert.doesNotMatch(animateRule, /opacity:\s*1\s*!important/);
  assert.doesNotMatch(animateRule, /transform:\s*none\s*!important/);
  assert.doesNotMatch(leadRule, /opacity:\s*1\s*!important/);
  assert.doesNotMatch(leadRule, /transform:\s*none\s*!important/);
});

test('branchen detail pages disable only the new interaction polish layer and keep their existing scroll animations', () => {
  assert.match(industryShow, /partials\/head'[\s\S]*disableInteractionPolish:\s*true/);
  assert.match(industryShow, /partials\/footer'[\s\S]*disableInteractionPolish:\s*true/);
  assert.match(legacyIndustryTemplate, /partials\/head'[\s\S]*disableInteractionPolish:\s*true/);
  assert.match(legacyIndustryTemplate, /partials\/footer'[\s\S]*disableInteractionPolish:\s*true/);
  assert.match(industryShow, /animate-on-scroll/);
  assert.match(legacyIndustryTemplate, /animate-on-scroll/);
  assert.doesNotMatch(industryShow, /kwd-scroll-reveal/);
  assert.doesNotMatch(legacyIndustryTemplate, /kwd-scroll-reveal/);
});

test('blog and ratgeber pages load the shared interaction polish layer', () => {
  [blogIndex, blogShow, ratgeberIndex, ratgeberShow].forEach((source) => {
    assert.doesNotMatch(source, /disableInteractionPolish:\s*true/);
  });
});

function createRevealTarget() {
  const classes = new Set();

  return {
    textContent: 'Hero-Inhalt mit ausreichend Text, damit er als Reveal-Ziel erkannt wird.',
    style: {
      setProperty() {},
    },
    classList: {
      add(...names) {
        names.forEach((name) => classes.add(name));
      },
      remove(...names) {
        names.forEach((name) => classes.delete(name));
      },
      contains(name) {
        return classes.has(name);
      },
    },
    closest() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 320, height: 120 };
    },
    matches() {
      return false;
    },
    querySelector(selector) {
      return selector === 'h1, h2, h3' ? {} : null;
    },
  };
}

function createInteractionPolishSandbox({
  listeners,
  target,
  animationFrames = [],
  intersectOnObserve = false,
}) {
  const TestIntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }

    observe(element) {
      if (intersectOnObserve) {
        this.callback([{ isIntersecting: true, target: element }]);
      }
    }

    unobserve() {}
  };

  return {
    window: {
      location: { pathname: '/referenzen' },
      addEventListener(eventName, callback) {
        listeners.set(eventName, callback);
      },
      matchMedia() {
        return { matches: false };
      },
      requestAnimationFrame(callback) {
        animationFrames.push(callback);
        return animationFrames.length;
      },
      setTimeout(callback) {
        animationFrames.push(callback);
        return animationFrames.length;
      },
      IntersectionObserver: TestIntersectionObserver,
    },
    document: {
      readyState: 'interactive',
      body: {
        classList: {
          contains() {
            return false;
          },
        },
      },
      addEventListener() {},
      querySelector() {
        return null;
      },
      querySelectorAll(selector) {
        return selector === '.unified-hero__copy' ? [target] : [];
      },
    },
    IntersectionObserver: TestIntersectionObserver,
  };
}
