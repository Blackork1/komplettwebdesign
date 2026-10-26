import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url));

test('die Icon-Schrift trägt ihren Inhalts-Hash, damit Browser nach Updates neu laden', async () => {
  const font = await read('public/assets/css/fa-solid-900-subset.woff2');
  const hash = createHash('sha256').update(font).digest('hex').slice(0, 12);
  const icons = (await read('public/assets/css/icons.min.css')).toString();
  assert.match(icons, new RegExp(`src:url\\(fa-solid-900-subset\\.woff2\\?v=${hash}\\)`));
  const head = (await read('views/partials/head.ejs')).toString();
  assert.match(head, /<link rel="preload" href="<%= versionedAsset\('assets\/css\/fa-solid-900-subset\.woff2'\) %>" as="font"/);
});

test('auf dem Handy haben Abschnitte denselben Seitenabstand wie der Hero', async () => {
  const css = (await read('public/webdesign-berlin.css')).toString();
  const hero = (await read('public/unified-hero.css')).toString();
  assert.match(hero, /padding-left: max\(16px,/);
  const mobile = css.slice(css.lastIndexOf('@media (max-width: 860px)'));
  assert.match(mobile, /\.webdesign-berlin-page \.wd-section > \.wd-container \{[^}]*margin-left: 16px;[^}]*margin-right: 16px;[^}]*padding: 0;/);
});

test('alle öffentlichen Seiten laden die 16-px-Regel für Smartphones als letztes Stylesheet', async () => {
  const head = (await read('views/partials/head.ejs')).toString();
  const pageCss = head.indexOf("pageCssAssets.forEach");
  const gutter = head.indexOf("cssAsset('mobile-gutter.css')");
  assert.ok(pageCss > 0 && gutter > pageCss, 'mobile-gutter.css muss nach den Seiten-Stylesheets kommen');
  const css = (await read('public/mobile-gutter.css')).toString();
  assert.match(css, /@media \(max-width: 767\.98px\)/);
  assert.match(css, /--kwd-mobile-gutter: 16px;/);
  for (const wrapper of ['main .container', '.about-shell', '.wt-shell', '.service-shell', '.seo-landing__container', '.references-container', '.unified-hero__container', '.legal > .container', '.privacy > .container', '#ContainerMarginSetup', '.site-footer']) {
    assert.ok(css.includes(wrapper), wrapper);
  }
});

test('Button-Reihen der Kosten-Seiten brechen auf dem Handy um', async () => {
  for (const file of ['webdesign-cafe', 'webdesign-blumenladen', 'kosten-einfache-websites', 'website-kosten-zeitplans']) {
    const view = (await read(`views/static/kosten/${file}.ejs`)).toString();
    assert.doesNotMatch(view, /class="mt-3(?: mt-lg-0)? d-flex gap-2"/, file);
  }
});
