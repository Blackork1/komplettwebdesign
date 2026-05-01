import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const template = fs.readFileSync(new URL('../views/page_view.ejs', import.meta.url), 'utf8');
const componentTemplate = fs.readFileSync(new URL('../views/components/component.ejs', import.meta.url), 'utf8');

test('page_view exposes canonical, robots, social, and JSON-LD metadata', () => {
  assert.match(template, /<link rel="canonical" href="<%= canonicalUrl %>"/);
  assert.match(template, /<meta name="robots" content="<%= robots %>"/);
  assert.match(template, /property="og:title"/);
  assert.match(template, /name="twitter:card"/);
  assert.match(template, /structuredDataBlocks/);
  assert.match(template, /application\/ld\+json/);
});

test('component template renders trusted block HTML without wrapping it in a paragraph', () => {
  assert.match(componentTemplate, /isTrustedBlockHtml/);
  assert.match(componentTemplate, /<%- component\.content %>/);
  assert.doesNotMatch(
    componentTemplate,
    /<p class="<%- component\.classes %>"><%- component\.content %><\/p>/
  );
});
