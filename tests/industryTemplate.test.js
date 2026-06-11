import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../views/industries/show.ejs', import.meta.url), 'utf8');
const branchenCss = readFileSync(new URL('../public/branchen.css', import.meta.url), 'utf8');

test('industry template uses dynamic, page-specific CTA and current-year pricing copy', () => {
  assert.match(template, /industry\.cta_headline/);
  assert.match(template, /new Date\(\)\.getFullYear\(\)/);
  assert.doesNotMatch(template, /professionelle <%= industry\.name %> Website 2025/);
  assert.doesNotMatch(template, /individual1|bereate|erh[aä]lst du/);
});

test('industry template keeps stat card labels below the section heading level', () => {
  assert.match(template, /<h3 class="itemLabel"><%- safeHtml\(c\.label\) %><\/h3>/);
  assert.doesNotMatch(template, /<h2 class="itemLabel"><%- c\.label %><\/h2>/);
});

test('industry template avoids wrapping trusted HTML fields in nested paragraphs', () => {
  assert.match(template, /renderHtmlBlock/);
  assert.doesNotMatch(template, /<p><%- industry\.warum_upper %><\/p>/);
  assert.doesNotMatch(template, /<p><%- industry\.warum_lower %><\/p>/);
  assert.doesNotMatch(template, /<p><%- c\.body %><\/p>/);
  assert.doesNotMatch(template, /<p><%- f\.a %><\/p>/);
});

test('industry CTA uses current package images with readable package titles', () => {
  assert.match(template, /href="\/pakete\/start"[\s\S]+packageCtaImageTitle">Start-Paket/);
  assert.match(template, /src="\/images\/paket-start\.webp"/);
  assert.match(template, /href="\/pakete\/business"[\s\S]+packageCtaImageTitle">Business-Paket/);
  assert.match(template, /src="\/images\/paket-business\.webp"/);
  assert.doesNotMatch(template, /v17588135|BasisPaket|basis\.webp/);
});

test('industry CTA package images rotate toward the opposite side', () => {
  assert.match(template, /class="imageCTALeft animate-on-scroll-right"/);
  assert.match(template, /class="imageCTARight animate-on-scroll-left"/);
  assert.match(branchenCss, /\.animate-on-scroll-right\.visible\s*\{[\s\S]*?transform:\s*translateX\(50%\)\s+translateY\(-50%\)\s+rotateZ\(15deg\)\s*!important;/);
  assert.match(branchenCss, /\.animate-on-scroll-left\.visible\s*\{[\s\S]*?transform:\s*translateX\(-50%\)\s+translateY\(-50%\)\s+rotateZ\(-15deg\)\s*!important;/);
  assert.match(branchenCss, /\.imageCTALeft,\s*\.imageCTARight\s*\{[\s\S]*?transform-origin:\s*bottom right;/);
  assert.match(branchenCss, /\.imageCTALeft:hover\s*\{[\s\S]*?transform:\s*translateX\(50%\)\s+translateY\(-40%\)\s+rotateZ\(0deg\)\s*!important;/);
  assert.match(branchenCss, /\.imageCTARight:hover\s*\{[\s\S]*?transform:\s*translateX\(-50%\)\s+translateY\(-40%\)\s+rotateZ\(0deg\)\s*!important;/);
  assert.match(branchenCss, /@media\s*\(max-width:\s*470px\)[\s\S]*?\.animate-on-scroll-left\.visible\s*\{[\s\S]*?rotateZ\(-15deg\)\s*!important/);
  assert.match(branchenCss, /@media\s*\(max-width:\s*470px\)[\s\S]*?\.animate-on-scroll-right\.visible\s*\{[\s\S]*?rotateZ\(15deg\)\s*!important/);
});
