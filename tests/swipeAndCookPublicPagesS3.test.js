import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  loadSwipeAndCookLegalPage,
  loadSwipeAndCookLegalPageVersion,
} from '../services/swipeAndCookLegalContentService.js';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

const files = Object.freeze({
  privacy: 'content/swipeandcook/s3-datenschutzerklaerung.md',
  terms: 'content/swipeandcook/s3-nutzungsbedingungen.md',
  support: 'content/swipeandcook/s3-supportseite.md',
  accountDeletion: 'content/swipeandcook/s3-kontoloeschung.md',
});

test('S3-Fassungen übernehmen den vollständigen S2-Vertrag und sind datiert', () => {
  for (const [key, file] of Object.entries(files)) {
    const s2 = read(file.replace('/s3-', '/s2-'));
    const s3 = read(file);
    const s2Sections = [...s2.matchAll(/^##\s+(.+)$/gmu)]
      .map((match) => match[1]);
    assert.match(s3, /^Stand: 12\. August 2026$/mu, key);
    for (const section of s2Sections) {
      assert.match(
        s3,
        new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'mu'),
        `${key}: ${section}`,
      );
    }
  }
});

test('Datenschutzfassung erklärt gemeinsame Daten, Consent und alle Fristen', () => {
  const source = read(files.privacy).replace(/\s+/gu, ' ');
  for (const required of [
    'privaten gemeinsamen Bereich',
    'genau zwei eigenständige Swipe-&-Cook-Konten',
    'E-Mail, Konto-ID oder persönlich gezeigten QR-Code',
    'Allergien und Unverträglichkeiten',
    'ausdrücklich eingewilligt',
    'persönliche Abneigungen, persönliche Swipes',
    'sichtbare gemeinsame Aktivität: höchstens 90 Tage',
    'terminale Einladungs- und Versanddaten: grundsätzlich 30 Tage',
    'minimierte Securityereignisse: höchstens 365 Tage',
    'lokale gemeinsame Sicherung: höchstens 90 Tage',
    'verschlüsselte rotierende Sicherungen',
  ]) assert.match(source, new RegExp(required, 'u'));
  assert.match(
    source,
    /keine öffentliche Profilsuche, kein öffentlicher Feed und keine Kontaktvermittlungsfunktion/u,
  );
});

test('Nutzungsbedingungen begrenzen Rollen, Premiumabdeckung und Lebenszyklus', () => {
  const source = read(files.terms).replace(/\s+/gu, ' ');
  for (const required of [
    'genau einen privaten gemeinsamen Bereich',
    'höchstens zwei aktive Konten',
    'Owner',
    'Mitglied benötigt für diesen Bereich kein eigenes Premiumabo',
    'Owner-Übergabe',
    'eigenes aktives Premiumrecht',
    'sieben Tage gültig',
    'QR-Code ist höchstens fünf Minuten gültig',
    'Bereich für höchstens 30 Tage schreibgeschützt',
    'Bereich verlassen',
    'Mitglied entfernen',
  ]) assert.match(source, new RegExp(required, 'u'));
});

test('Support und Kontolöschung erklären Self Service ohne Geheimnisse', () => {
  const support = read(files.support).replace(/\s+/gu, ' ');
  const deletion = read(files.accountDeletion).replace(/\s+/gu, ' ');
  for (const required of [
    'E-Mail, Konto-ID oder QR-Code',
    'Profil > Konto',
    'Konto-ID',
    'Support-ID',
    'falschen Konto',
    'Owner-Übergabe',
    'Bereich verlassen',
  ]) assert.match(support, new RegExp(required, 'u'));
  assert.doesNotMatch(
    support,
    /sende (?:uns )?(?:den |die )?(?:Einladungstoken|Allergie|Unverträglichkeit)/iu,
  );
  assert.match(support, /Übermittle nie Einladungstokens/iu);
  for (const required of [
    'Löschung des Mitgliedskontos',
    'Löschung des Ownerkontos',
    'Owner-Übergabe',
    'lokale 90-Tage-Sicherung',
    'widerrufen',
    'technisch unbrauchbar',
  ]) assert.match(deletion, new RegExp(required, 'u'));
});

test('Legalservice veröffentlicht S3 und hält S2 als historische Fassung abrufbar', () => {
  for (const key of Object.keys(files)) {
    const active = loadSwipeAndCookLegalPage(key);
    const historical = loadSwipeAndCookLegalPageVersion(key, 's2');
    assert.match(active.source, /^s3-/u, key);
    assert.match(historical.source, /^s2-/u, key);
    assert.equal(active.stand, '12. August 2026');
    assert.doesNotMatch(
      active.html,
      /Interner Status|Inhaltsabnahme|Vorgesehene öffentliche Adresse/u,
    );
  }
  assert.throws(
    () => loadSwipeAndCookLegalPageVersion('privacy', 's4'),
    /swipeandcook_legal_version_unknown/u,
  );
});
