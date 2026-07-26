import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

const partialUrl = new URL('../views/partials/related-links.ejs', import.meta.url);
const partial = readFileSync(partialUrl, 'utf8');
const partialPath = fileURLToPath(partialUrl);
const seoLandingTemplate = readFileSync(new URL('../views/seo_landing/show.ejs', import.meta.url), 'utf8');

test('Kontextlinkblock rendert nur gültige interne Links mit Beschreibung', async () => {
  const html = await ejs.renderFile(partialPath, {
    title: 'Passende nächste Schritte',
    links: [
      { href: '/pakete', label: 'Website-Pakete vergleichen', description: 'Umfang und Preise einordnen.' },
      { href: 'javascript:alert(1)', label: 'Unsicherer Link', description: 'Darf nicht erscheinen.' },
      { href: '/kontakt', label: '', description: 'Ohne Bezeichnung nicht hilfreich.' }
    ]
  });

  assert.match(html, /Passende nächste Schritte/);
  assert.match(html, /href="\/pakete"/);
  assert.match(html, /Umfang und Preise einordnen\./);
  assert.doesNotMatch(html, /javascript:|Unsicherer Link/);
});

test('Kontextlinkblock bleibt ohne gültige Links vollständig leer', async () => {
  const html = await ejs.renderFile(partialPath, {
    title: 'Passende nächste Schritte',
    links: []
  });
  assert.equal(html.trim(), '');
});

test('Kommerzielle Bestandsseiten verwenden den gemeinsamen Kontextlinkblock', () => {
  assert.match(seoLandingTemplate, /partials\/related-links/);
  assert.match(partial, /related-links__grid/);
});
