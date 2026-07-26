import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTrustedInternalPaths,
  normalizeInternalHref
} from '../services/contentAgent/trustedInternalLinkService.js';
import { CONTENT_AGENT_LINKS } from '../data/contentAgentLinks.js';
import { leistungenOverviewPage } from '../data/leistungenOverviewPage.js';
import pool from '../util/db.js';
import { listIndustries } from '../controllers/industriesController.js';
import * as industriesController from '../controllers/industriesController.js';

test('interne Linknormalisierung erkennt sichere Seitensprünge getrennt von URLs', () => {
  assert.deepEqual(normalizeInternalHref('#abschnitt-1'), {
    kind: 'fragment',
    href: '#abschnitt-1',
    fragment: 'abschnitt-1'
  });
  assert.equal(normalizeInternalHref('#').kind, 'unsafe');
  assert.equal(normalizeInternalHref('#abschnitt 1').kind, 'unsafe');
});

test('Brancheninventar verwendet denselben webdesign-Präfix wie die öffentliche Route', () => {
  const paths = buildTrustedInternalPaths([
    { type: 'industry', slug: 'blumenladen' },
    { type: 'industry', slug: 'webdesign-cafe' }
  ]);

  assert.equal(paths.includes('/branchen/webdesign-blumenladen'), true);
  assert.equal(paths.includes('/branchen/webdesign-cafe'), true);
  assert.equal(paths.includes('/branchen/blumenladen'), false);
});

test('vertrauenswürdige Inhaltslinks zeigen auf die aktiven kanonischen Kernseiten', () => {
  const expectedLinks = [
    { url: '/webdesign-berlin', type: 'service', label: 'Website erstellen lassen in Berlin' },
    { url: '/pakete', type: 'pricing', label: 'Website-Pakete und Preise' },
    { url: '/leistungen/website-audit', type: 'service', label: 'Website-Audit' },
    { url: '/leistungen/local-seo', type: 'service', label: 'Local SEO Berlin' },
    { url: '/branchen/webdesign-blumenladen', type: 'industry', label: 'Webdesign für Blumenläden' }
  ];

  for (const expectedLink of expectedLinks) {
    assert.deepEqual(
      CONTENT_AGENT_LINKS.find((link) => link.url === expectedLink.url),
      expectedLink
    );
  }
  assert.equal(
    CONTENT_AGENT_LINKS.some((link) => link.url === '/website-erstellen-lassen-berlin'),
    false
  );
});

test('Leistungsübersicht führt kontextuell zur vorhandenen Handwerkerseite', () => {
  assert.deepEqual(
    leistungenOverviewPage.services.find((service) => service.href === '/handwerker'),
    {
      title: 'Website für Handwerker',
      href: '/handwerker',
      text: 'Leistungen und Anfragewege für Handwerksbetriebe in Berlin passend einordnen.',
      icon: 'fa-hammer'
    }
  );
});

test('Branchenübersicht erhält die vorhandene Handwerkerseite als separate Karte', async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [] });
  let rendered;

  try {
    await listIndustries(
      {
        headers: {},
        secure: true,
        get(name) {
          return name === 'host' ? 'example.test' : undefined;
        }
      },
      {
        render(view, values) {
          rendered = { view, values };
          return rendered;
        },
        status() {
          throw new Error('Die Branchenübersicht darf keinen Fehlerstatus liefern.');
        }
      }
    );
  } finally {
    pool.query = originalQuery;
  }

  assert.equal(rendered.view, 'industries/index');
  assert.deepEqual(rendered.values.existingIndustryPages, [{
    title: 'Website für Handwerker',
    description: 'Webdesign, Leistungen und Anfragewege für Handwerksbetriebe in Berlin.',
    href: '/handwerker'
  }]);
});

test('Blumenladen-Seite erhält den passenden vorhandenen Blogartikel als Kontextlink', () => {
  assert.equal(typeof industriesController.getIndustryContextLinks, 'function');
  assert.deepEqual(
    industriesController.getIndustryContextLinks('webdesign-blumenladen'),
    [{
      label: 'SEO für Blumenläden im Blog',
      href: '/blog/seo-fuer-blumenladen'
    }]
  );
  assert.deepEqual(industriesController.getIndustryContextLinks('webdesign-cafe'), []);
});
