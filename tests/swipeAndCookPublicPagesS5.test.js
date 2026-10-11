import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import express from 'express';

import staticPagesRouter from '../routes/staticPages.js';
import {
  loadSwipeAndCookLegalPage,
} from '../services/swipeAndCookLegalContentService.js';

const pages = Object.freeze({
  privacy: Object.freeze({
    path: '/swipeandcook-datenschutz',
    source: 'content/swipeandcook/s3-datenschutzerklaerung.md',
  }),
  terms: Object.freeze({
    path: '/swipeandcook-nutzungsbedingungen',
    source: 'content/swipeandcook/s3-nutzungsbedingungen.md',
  }),
  support: Object.freeze({
    path: '/swipeandcook-support',
    source: 'content/swipeandcook/s3-supportseite.md',
  }),
  accountDeletion: Object.freeze({
    path: '/swipeandcook-konto-loeschen',
    source: 'content/swipeandcook/s3-kontoloeschung.md',
  }),
});

function source(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function visiblePage(key) {
  const rendered = loadSwipeAndCookLegalPage(key);
  assert.equal(rendered.path, pages[key].path);
  assert.equal(rendered.stand, ['privacy', 'accountDeletion'].includes(key) ? '11. Oktober 2026' : '8. Oktober 2026');
  return rendered.html.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ');
}

test('der aktive Defaultloader rendert S5 auf allen vier kanonischen Seiten', () => {
  for (const [key, page] of Object.entries(pages)) {
    assert.match(source(page.source), /\bS5\b/u, page.source);
    assert.match(visiblePage(key), /S5/u, page.path);
  }
});

test('die vier echten Express-Routen liefern die aktive S5-Fassung', async () => {
  const app = express();
  app.use((_request, response, next) => {
    response.render = (view, locals = {}) => response.status(200).json({
      view,
      legalPage: locals.legalPage,
    });
    next();
  });
  app.use(staticPagesRouter);

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    for (const page of Object.values(pages)) {
      const response = await fetch(`http://127.0.0.1:${port}${page.path}`);
      assert.equal(response.status, 200, page.path);
      const body = await response.json();
      assert.equal(body.legalPage.path, page.path);
      assert.match(body.legalPage.source, [pages.privacy.path, pages.accountDeletion.path].includes(page.path) ? /^s4-/u : /^s3-/u, page.path);
      assert.match(body.legalPage.html, /\bS5\b/u, page.path);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test('Datenschutzseite erklärt Privatheit, gemeinsamen Status und Aufbewahrung', () => {
  const privacy = visiblePage('privacy');
  for (const required of [
    'private Swipeentscheidungen',
    'gemeinsames Match',
    'Kochstatus',
    'Feedback abgegeben',
    'verschlüsselter lokaler Cache',
    'höchstens sieben Tage',
    'serverseitig bestätigten Bewertung',
    'Kontolöschung',
    '30 Tage (720 Stunden)',
    'noch gültige Bewertung der anderen Person bleibt unverändert',
    'keine feste Altersfrist',
  ]) assert.ok(privacy.toLowerCase().includes(required.toLowerCase()), required);
  assert.match(
    privacy,
    /andere Mitglied[^.]*sieht[^.]*nicht[^.]*Sternwert/iu,
  );
});

test('Nutzungsbedingungen begrenzen S5 auf bewusste und bestätigte Aktionen', () => {
  const terms = visiblePage('terms');
  assert.match(terms, /Swipeentscheidung[^.]*privat/iu);
  assert.match(terms, /zwei[^.]*Zustimmungen[^.]*Match/iu);
  assert.match(terms, /Match[^.]*ausdrücklich[^.]*Plan/iu);
  assert.match(terms, /Kochstart[^.]*Abschluss[^.]*Server/iu);
  assert.match(terms, /Sternefeedback[^.]*kein Freitext/iu);
});

test('Supportseite erklärt sichere S5-Zustände ohne private Diagnoseabfrage', () => {
  const support = visiblePage('support');
  assert.match(support, /Wird synchronisiert/iu);
  assert.match(support, /veraltete[^.]*Aktion[^.]*nicht[^.]*übertragen/iu);
  assert.match(support, /Partner[^.]*Swipeentscheidung[^.]*nicht/iu);
  assert.match(support, /Partner[^.]*Sternwert[^.]*nicht/iu);
  assert.doesNotMatch(
    support,
    /sende (?:uns )?(?:deine |den |die )?(?:Swipeentscheidung|Sternwert|Safety-Angaben)/iu,
  );
});

test('Kontolöschseite trennt private Löschung von erhaltenen gemeinsamen Inhalten', () => {
  const deletion = visiblePage('accountDeletion');
  assert.match(deletion, /private Swipeentscheidungen[^.]*gelöscht/iu);
  assert.match(deletion, /eigenes Sternefeedback[^.]*gelöscht/iu);
  assert.match(deletion, /gemeinsame[^.]*erhalten[^.]*anonymisiert/iu);
  assert.match(deletion, /Cache[^.]*Outbox[^.]*entfernt/iu);
  assert.match(deletion, /Sicherung[^.]*höchstens 30 Tage/iu);
  assert.match(deletion, /alte private Swipes[^.]*nicht wiederhergestellt/iu);
});
