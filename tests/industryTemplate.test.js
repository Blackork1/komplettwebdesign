import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../views/industries/show.ejs', import.meta.url), 'utf8');

test('industry template uses dynamic, page-specific CTA and current-year pricing copy', () => {
  assert.match(template, /industry\.cta_headline/);
  assert.match(template, /new Date\(\)\.getFullYear\(\)/);
  assert.doesNotMatch(template, /professionelle <%= industry\.name %> Website 2025/);
  assert.doesNotMatch(template, /individual1|bereate|erh[aä]lst du/);
});

test('industry template keeps stat card labels below the section heading level', () => {
  assert.match(template, /<h3 class="itemLabel"><%- c\.label %><\/h3>/);
  assert.doesNotMatch(template, /<h2 class="itemLabel"><%- c\.label %><\/h2>/);
});

test('industry template avoids wrapping trusted HTML fields in nested paragraphs', () => {
  assert.match(template, /renderHtmlBlock/);
  assert.doesNotMatch(template, /<p><%- industry\.warum_upper %><\/p>/);
  assert.doesNotMatch(template, /<p><%- industry\.warum_lower %><\/p>/);
  assert.doesNotMatch(template, /<p><%- c\.body %><\/p>/);
  assert.doesNotMatch(template, /<p><%- f\.a %><\/p>/);
});
