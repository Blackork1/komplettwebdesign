import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { renderApprovedLegalMarkdown, loadSwipeAndCookLegalPage } from '../services/swipeAndCookLegalContentService.js';

const source = () => readFileSync(new URL('../content/swipeandcook/s4-datenschutzerklaerung.md',import.meta.url),'utf8');

test('aktive Kontolöschseite erklärt individuelle Fristen und bewahrt historische S3-Fassung',() => {
  const page=loadSwipeAndCookLegalPage('accountDeletion');
  assert.equal(page.source,'s4-kontoloeschung.md');
  assert.equal(page.stand,'11. Oktober 2026');
  assert.match(page.html,/720 Stunden/u);
  assert.match(page.html,/serverseitig bestätigten Bewertung/u);
  assert.match(page.html,/Bewertung der anderen Person bleibt unverändert/u);
  const old=readFileSync(new URL('../content/swipeandcook/s3-kontoloeschung.md',import.meta.url));
  assert.equal(createHash('sha256').update(old).digest('hex'),'ba45da186721c1f010b8cd0797250f08badcc064c41b2d8c30bd201392e9bfb3');
});

test('individuelle Swipefrist ist von gemeinsamen Inhalten und Partnerbewertungen getrennt',() => {
  const text=source().replace(/\s+/gu,' ');
  assert.match(text,/Stand: 11\. Oktober 2026/u);
  assert.match(text,/30 Tage \(720 Stunden\)/u);
  assert.match(text,/jeweiligen serverseitig bestätigten Bewertung/u);
  assert.match(text,/noch gültige Bewertung der anderen Person bleibt unverändert/u);
  assert.match(text,/keine feste Altersfrist/u);
  assert.doesNotMatch(text,/30 Tage nach der\s+letzten bestätigten Aktivität eines geschlossenen/u);
  const html=renderApprovedLegalMarkdown(source());
  assert.match(html,/720 Stunden/u);
  assert.match(html,/beide dasselbe Rezept innerhalb ihrer jeweils gültigen Bewertungsfrist/u);
});

test('bestehende Lösch-, Sicherheits- und lokale Grenzen bleiben erhalten; S3 bleibt historisch unverändert',() => {
  const text=source();
  assert.match(text,/Bei einer Kontolöschung werden eigene private Swipes/u);
  assert.match(text,/Outbox höchstens sieben Tage/u);
  assert.match(text,/Cache bleibt\s+höchstens 30 Tage/u);
  assert.match(text,/Allergien, Unverträglichkeiten und ausdrücklich ausgeschlossene Lebensmittel/u);
  const old=readFileSync(new URL('../content/swipeandcook/s3-datenschutzerklaerung.md',import.meta.url));
  assert.equal(createHash('sha256').update(old).digest('hex'),'609f48c6d0dd3424d29b548f9db6153e83c2f9b92e8ce8a318efa57cf2d701ef');
});
