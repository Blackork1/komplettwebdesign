import { readFileSync } from 'node:fs';

import {
  renderApprovedLegalMarkdown
} from './swipeAndCookLegalContentService.js';

const LEGACY_CONTENT_ROOT = new URL('../content/swipeandcook/', import.meta.url);

const PAGE_DEFINITIONS = Object.freeze({
  privacy: Object.freeze({
    key: 'privacy',
    source: 's2-datenschutzerklaerung.md',
    path: '/datenschutz',
    title: 'Datenschutzerklärung für Cookavoli',
    lead: 'Wie Cookavoli Konto-, Safety-, Premium- und optionale Analysedaten verarbeitet.'
  }),
  terms: Object.freeze({
    key: 'terms',
    source: 's2-nutzungsbedingungen.md',
    path: '/nutzungsbedingungen',
    title: 'Nutzungsbedingungen für Cookavoli',
    lead: 'Die Regeln für Konto, Free-Version, Premiumabo, Trial, Kündigung und Kontolöschung.'
  }),
  support: Object.freeze({
    key: 'support',
    source: 's2-supportseite.md',
    path: '/support',
    title: 'Support für Cookavoli',
    lead: 'Hilfe bei Konto, Premium, Storestatus, Plattformwechsel und Kontolöschung.'
  }),
  accountDeletion: Object.freeze({
    key: 'accountDeletion',
    source: 's2-kontoloeschung.md',
    path: '/konto-loeschen',
    title: 'Cookavoli-Konto löschen',
    lead: 'Löschung direkt in der App oder sicher über die verifizierte E-Mail-Adresse anfordern.'
  })
});

const publicReplacements = Object.freeze([
  ['https://www.komplettwebdesign.de/swipeandcook-datenschutz', 'https://cookavoli.com/datenschutz'],
  ['https://www.komplettwebdesign.de/swipeandcook-nutzungsbedingungen', 'https://cookavoli.com/nutzungsbedingungen'],
  ['https://www.komplettwebdesign.de/swipeandcook-konto-loeschen', 'https://cookavoli.com/konto-loeschen'],
  ['https://www.komplettwebdesign.de/swipeandcook-support', 'https://cookavoli.com/support'],
  ['swipeandcook@komplettwebdesign.de', 'support@cookavoli.com'],
  ['kontakt@komplettwebdesign.de', 'privacy@cookavoli.com'],
  ['Swipe-&-Cook-Kontos', 'Cookavoli-Kontos'],
  ['Swipe-&-Cook-Konto', 'Cookavoli-Konto'],
  ['Swipe-&-Cook', 'Cookavoli'],
  ['Swipe & Cook', 'Cookavoli']
]);

export function rebrandApprovedCookavoliMarkdown(markdown) {
  let result = String(markdown ?? '');
  for (const [legacyValue, cookavoliValue] of publicReplacements) {
    result = result.replaceAll(legacyValue, cookavoliValue);
  }
  return result;
}

export function loadCookavoliLegalPage(key) {
  const definition = PAGE_DEFINITIONS[key];
  if (!definition) throw new Error('cookavoli_legal_page_unknown');

  const source = readFileSync(
    new URL(definition.source, LEGACY_CONTENT_ROOT),
    'utf8'
  );
  const brandedSource = rebrandApprovedCookavoliMarkdown(source);
  const stand = brandedSource.match(/^Stand:\s*(.+)$/m)?.[1]?.trim();
  if (!stand) throw new Error(`cookavoli_legal_date_missing:${key}`);

  return Object.freeze({
    ...definition,
    stand,
    html: renderApprovedLegalMarkdown(brandedSource)
  });
}
