import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url));

test('die Icon-Schrift trägt ihren Inhalts-Hash, damit Browser nach Updates neu laden', async () => {
  const font = await read('public/assets/css/fa-solid-900.woff2');
  const hash = createHash('sha256').update(font).digest('hex').slice(0, 12);
  const solid = (await read('public/assets/css/solid.min.css')).toString();
  assert.match(solid, new RegExp(`src:url\\(fa-solid-900\\.woff2\\?v=${hash}\\)`));
  const head = (await read('views/partials/head.ejs')).toString();
  assert.match(head, /<link rel="preload" href="<%= versionedAsset\('assets\/css\/fa-solid-900\.woff2'\) %>" as="font"/);
});

test('auf dem Handy haben Abschnitte denselben Seitenabstand wie der Hero', async () => {
  const css = (await read('public/webdesign-berlin.css')).toString();
  const hero = (await read('public/unified-hero.css')).toString();
  assert.match(hero, /padding-left: max\(16px,/);
  const mobile = css.slice(css.lastIndexOf('@media (max-width: 860px)'));
  assert.match(mobile, /\.webdesign-berlin-page \.wd-section > \.wd-container \{[^}]*margin-left: 16px;[^}]*margin-right: 16px;[^}]*padding: 0;/);
});
