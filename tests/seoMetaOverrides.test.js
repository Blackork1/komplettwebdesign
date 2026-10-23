import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SHORT_SEO_DESCRIPTIONS,
  SHORT_SEO_TITLES,
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  resolveSeoDescription,
  resolveSeoTitle
} from '../data/seoMetaOverrides.js';
import { referenceProjects } from '../data/referenceProjects.js';

test('short replacement titles stay within the snippet budget', () => {
  for (const [path, title] of Object.entries(SHORT_SEO_TITLES)) {
    assert.ok(title.length <= 60, `${path}: ${title.length}`);
    assert.equal(title, title.trim());
    assert.match(path, /^\/(blog|branchen|ratgeber)\/[a-z0-9-]+$/);
  }
});

test('stored titles win while they are short enough', () => {
  assert.equal(resolveSeoTitle('/blog/wordpress-68', 'WordPress 6.8 kurz erklärt'), 'WordPress 6.8 kurz erklärt');
  const longTitle = 'WordPress 6.8 Update 2025: Neue Features, Performance & Sicherheit';
  assert.ok(longTitle.length > SEO_TITLE_MAX_LENGTH);
  assert.equal(resolveSeoTitle('/blog/wordpress-68', longTitle), SHORT_SEO_TITLES['/blog/wordpress-68']);
  assert.equal(resolveSeoTitle('/blog/unbekannt', longTitle), longTitle);
});

test('fixed page titles in code stay within 65 characters', async () => {
  const checks = [
    ['controllers/testController.js', /^\s*title:\s*'([^']+)'/gm],
    ['controllers/leistungenController.js', /^\s*metaTitle:\s*'([^']+)'/gm]
  ];
  for (const [file, pattern] of checks) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const [, rawTitle] of source.matchAll(pattern)) {
      // Preis-Platzhalter werden beim Rendern zu einem Betrag wie „2.499 €“.
      const title = rawTitle.replace(/\{\{[^}]+\}\}/g, '2.499 €');
      assert.ok(title.length <= 65, `${file}: ${title} (${title.length})`);
    }
  }
  for (const project of referenceProjects) {
    assert.ok((project.metaTitle || project.title).length <= 65, project.slug);
  }
});

test('short replacement descriptions are complete sentences within the snippet budget', () => {
  for (const [path, description] of Object.entries(SHORT_SEO_DESCRIPTIONS)) {
    assert.ok(description.length >= 110 && description.length <= 155, `${path}: ${description.length}`);
    assert.match(description, /[.!?]$/, path);
    assert.doesNotMatch(description, /\bSie\b|\{\{|€/, path);
  }
});

test('stored descriptions win while they fit, long ones fall back to the short version', () => {
  const longText = 'x'.repeat(SEO_DESCRIPTION_MAX_LENGTH + 1);
  assert.equal(resolveSeoDescription('/blog/wordpress-68', 'Kurz und vollständig.'), 'Kurz und vollständig.');
  assert.equal(resolveSeoDescription('/blog/woche-1-was-ist-webdesign', longText), SHORT_SEO_DESCRIPTIONS['/blog/woche-1-was-ist-webdesign']);
  assert.equal(resolveSeoDescription('/blog/unbekannt', longText), longText);
});
