import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { leistungenOverviewPage } from '../data/leistungenOverviewPage.js';

const template = readFileSync(new URL('../views/static/leistungen.ejs', import.meta.url), 'utf8');

test('die Leistungsübersicht gruppiert vorhandene Angebote nach vier Nutzerzielen', () => {
  assert.deepEqual(
    leistungenOverviewPage.serviceGroups.map((group) => group.title),
    [
      'Neue Website',
      'Bestehende Website verbessern',
      'Sichtbarkeit erhöhen',
      'Website betreiben'
    ]
  );

  const linksByGroup = Object.fromEntries(
    leistungenOverviewPage.serviceGroups.map((group) => [
      group.title,
      group.items.map((item) => item.href)
    ])
  );

  assert.deepEqual(linksByGroup['Neue Website'], [
    '/webdesign-berlin',
    '/pakete',
    '/leistungen/landingpage-erstellen-lassen'
  ]);
  assert.ok(linksByGroup['Bestehende Website verbessern'].includes('/leistungen/website-audit'));
  assert.ok(linksByGroup['Bestehende Website verbessern'].includes('/leistungen/website-relaunch'));
  assert.ok(linksByGroup['Sichtbarkeit erhöhen'].includes('/leistungen/local-seo'));
  assert.ok(linksByGroup['Sichtbarkeit erhöhen'].includes('/website-tester'));
  assert.ok(linksByGroup['Website betreiben'].includes('/leistungen/website-wartung'));
  assert.ok(linksByGroup['Website betreiben'].includes('/leistungen/laufende-kosten-website'));
});

test('jede Leistungsgruppe besitzt ein eigenständiges Bild mit Alt-Text', () => {
  const groups = leistungenOverviewPage.serviceGroups;
  assert.equal(new Set(groups.map((group) => group.image.src)).size, groups.length);
  assert.ok(groups.every((group) => group.image.alt.length >= 20));
  assert.match(template, /page\.serviceGroups\.forEach/);
  assert.match(template, /group\.image\.alt/);
});

test('unsichere Besucher können kostenlos testen oder ihre Ausgangslage beschreiben', () => {
  assert.equal(leistungenOverviewPage.guidance.title, 'Du weißt noch nicht, was du brauchst?');
  assert.equal(leistungenOverviewPage.guidance.primary.href, '/website-tester');
  assert.equal(leistungenOverviewPage.guidance.secondary.href, '/kontakt?projektart=website-audit');
});
