import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Impressum nennt die geltenden Gesetze (DDG, MStV) statt TMG und RStV', () => {
  const impressum = read('views/static/impressum.ejs');
  assert.match(impressum, /Angaben gemäß § 5 DDG/);
  assert.match(impressum, /Verantwortlich für den Inhalt nach § 18 Abs\. 2 MStV/);
  assert.doesNotMatch(impressum, /\bTMG\b|\bRStV\b/);
});

test('Datenschutzerklärung zeigt ein festes Stand-Datum statt des heutigen Tages', () => {
  const datenschutz = read('views/static/datenschutz.ejs');
  assert.doesNotMatch(datenschutz, /Stand:\s*<%=\s*new Date\(\)/);
  assert.match(datenschutz, /Stand: <time datetime="\d{4}-\d{2}-\d{2}">\d{2}\.\d{2}\.\d{4}<\/time>/);
});
