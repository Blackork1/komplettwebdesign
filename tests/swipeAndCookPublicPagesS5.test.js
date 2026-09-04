import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  loadSwipeAndCookLegalPageVersion,
} from '../services/swipeAndCookLegalContentService.js';

const pages = Object.freeze({
  privacy: Object.freeze({
    path: '/swipeandcook-datenschutz',
    source: 'content/swipeandcook/s2-datenschutzerklaerung.md',
  }),
  terms: Object.freeze({
    path: '/swipeandcook-nutzungsbedingungen',
    source: 'content/swipeandcook/s2-nutzungsbedingungen.md',
  }),
  support: Object.freeze({
    path: '/swipeandcook-support',
    source: 'content/swipeandcook/s2-supportseite.md',
  }),
  accountDeletion: Object.freeze({
    path: '/swipeandcook-konto-loeschen',
    source: 'content/swipeandcook/s2-kontoloeschung.md',
  }),
});

function source(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function visiblePage(key) {
  const rendered = loadSwipeAndCookLegalPageVersion(key, 's2');
  assert.equal(rendered.path, pages[key].path);
  return rendered.html.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ');
}

test('alle vier kanonischen Seiten enthalten einen gerenderten S5-Hinweis', () => {
  for (const [key, page] of Object.entries(pages)) {
    assert.match(source(page.source), /\bS5\b/u, page.source);
    assert.match(visiblePage(key), /S5/u, page.path);
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
    'spätestens 30 Tage',
    'Kontolöschung',
  ]) assert.match(privacy, new RegExp(required, 'iu'));
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
