import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  normalizeLegacyStaticHtml
} from '../services/contentAgent/legacyStaticHtmlNormalizer.js';

test('Legacy-Normalisierung erhält sichere Bilder, Code und sichtbare Struktur', async () => {
  const html = await readFile(
    new URL('./fixtures/legacyContent/static-compatibility.html', import.meta.url),
    'utf8'
  );

  const result = normalizeLegacyStaticHtml({
    html,
    faqJson: [],
    allowedInternalLinks: ['/kontakt']
  });

  assert.deepEqual(result.report.blockers, []);
  assert.match(result.html, /<section class="legacy-article">/);
  assert.match(result.html, /<h2>Legacy-Titel<\/h2>/);
  assert.match(result.html, /<img[^>]+alt="Legacy-Bild"/);
  assert.match(result.html, /<pre><code class="language-css">/);
  assert.match(result.html, /<caption>Vergleich<\/caption>/);
  assert.doesNotMatch(result.html, /<h1|<article|<header/i);
});

test('unbekanntes JSON-LD blockiert die Migration', async () => {
  const html = await readFile(
    new URL('./fixtures/legacyContent/unknown-jsonld.html', import.meta.url),
    'utf8'
  );

  const result = normalizeLegacyStaticHtml({
    html,
    faqJson: [],
    allowedInternalLinks: []
  });

  assert.ok(result.report.blockers.some(({ code }) => code === 'legacy_jsonld_unknown'));
});

test('eingebettete Styles werden nicht stillschweigend entfernt', async () => {
  const html = await readFile(
    new URL('./fixtures/legacyContent/unsafe-style.html', import.meta.url),
    'utf8'
  );

  const result = normalizeLegacyStaticHtml({
    html,
    faqJson: [],
    allowedInternalLinks: []
  });

  assert.ok(result.report.blockers.some(({ code }) => code === 'legacy_style_block'));
});
