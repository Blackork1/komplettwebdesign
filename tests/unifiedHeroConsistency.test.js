import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = {
  head: readFileSync(new URL('../views/partials/head.ejs', import.meta.url), 'utf8'),
  referencesIndex: readFileSync(new URL('../views/references/index.ejs', import.meta.url), 'utf8'),
  referencesShow: readFileSync(new URL('../views/references/show.ejs', import.meta.url), 'utf8'),
  blogIndex: readFileSync(new URL('../views/blog/index.ejs', import.meta.url), 'utf8'),
  blogShow: readFileSync(new URL('../views/blog/show.ejs', import.meta.url), 'utf8'),
  ratgeberIndex: readFileSync(new URL('../views/ratgeber/index.ejs', import.meta.url), 'utf8'),
  ratgeberShow: readFileSync(new URL('../views/ratgeber/show.ejs', import.meta.url), 'utf8'),
  industriesIndex: readFileSync(new URL('../views/industries/index.ejs', import.meta.url), 'utf8'),
  industriesShow: readFileSync(new URL('../views/industries/show.ejs', import.meta.url), 'utf8'),
  webdesignBerlin: readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8'),
  packagesList: readFileSync(new URL('../views/packages_list.ejs', import.meta.url), 'utf8'),
  packageDetail: readFileSync(new URL('../views/package_detail.ejs', import.meta.url), 'utf8'),
  websiteTester: readFileSync(new URL('../views/test.ejs', import.meta.url), 'utf8'),
  about: readFileSync(new URL('../views/about.ejs', import.meta.url), 'utf8'),
  leistungenShow: readFileSync(new URL('../views/leistungen/show.ejs', import.meta.url), 'utf8'),
  seoLanding: readFileSync(new URL('../views/seo_landing/show.ejs', import.meta.url), 'utf8')
};

test('shared hero stylesheet is loaded globally for marketing pages', () => {
  assert.match(files.head, /cssAsset\('unified-hero\.css'\)/);
});

test('core marketing templates opt into the shared hero surface', () => {
  [
    files.referencesIndex,
    files.referencesShow,
    files.blogIndex,
    files.blogShow,
    files.ratgeberIndex,
    files.ratgeberShow,
    files.industriesIndex,
    files.webdesignBerlin,
    files.packagesList,
    files.packageDetail,
    files.websiteTester,
    files.about,
    files.leistungenShow,
    files.seoLanding
  ].forEach((source) => {
    assert.match(source, /unified-hero/);
  });
});

test('industry detail template stays on the legacy branchen design', () => {
  assert.doesNotMatch(files.industriesShow, /unified-hero/);
  assert.match(files.industriesShow, /heroContainer/);
  assert.match(files.industriesShow, /wd-breadcrumbs/);
});

test('shared hero css uses the brand palette and protects long h1 text from clipping', () => {
  const css = readFileSync(new URL('../public/unified-hero.css', import.meta.url), 'utf8');

  assert.match(css, /#0b2a46/i);
  assert.match(css, /#e94a1b/i);
  assert.match(css, /overflow-wrap:\s*anywhere/i);
  assert.match(css, /hyphens:\s*auto/i);
  assert.match(css, /overflow:\s*visible/i);
  assert.match(css, /line-height:\s*1\.08/i);
});
