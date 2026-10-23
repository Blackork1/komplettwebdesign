import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SHORT_SEO_TITLES, SEO_TITLE_MAX_LENGTH, resolveSeoTitle } from '../data/seoTitleOverrides.js';
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
