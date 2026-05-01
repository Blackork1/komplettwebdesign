import assert from 'node:assert/strict';
import test from 'node:test';
import { HANDWERKER_PAGE_UPDATE } from '../scripts/update_handwerker_page.js';

test('handwerker content update replaces risky claims with specific SEO and lead copy', () => {
  assert.match(HANDWERKER_PAGE_UPDATE.page.title, /Handwerker Website Berlin/);
  assert.match(HANDWERKER_PAGE_UPDATE.page.description, /Local SEO/);

  const content = Object.values(HANDWERKER_PAGE_UPDATE.components)
    .map((item) => `${item.content || ''} ${item.href || ''} ${item.alt || ''}`)
    .join('\n');

  assert.match(content, /Handwerker-Website anfragen/);
  assert.match(content, /SEO-Potenzial prüfen/);
  assert.match(content, /Häufige Fragen zu Handwerker-Websites/);
  assert.match(content, /GEO-Struktur/);
  assert.match(content, /Sören Blocksdorf von Komplett Webdesign/);
  assert.doesNotMatch(content, /128|Standart|Durchschnit|In 30 Tage|ein passende|De-Hosting|unter 2s|<\/li>\s*$/);
});
