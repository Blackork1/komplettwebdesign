import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const websiteView = readFileSync(new URL('../views/test.ejs', import.meta.url), 'utf8');
const seoView = readFileSync(new URL('../views/seo_tester.ejs', import.meta.url), 'utf8');
const journeyPartial = readFileSync(new URL('../views/partials/tester-journey.ejs', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../controllers/testController.js', import.meta.url), 'utf8');

test('Website-Tester und SEO-Tester verwenden dieselbe sichtbare Entscheidungshilfe', () => {
  assert.match(websiteView, /partials\/tester-journey/);
  assert.match(seoView, /partials\/tester-journey/);

  for (const question of [
    'Was wird kostenlos geprüft?',
    'Was wird nicht geprüft?',
    'Wie sieht ein Ergebnis aus?',
    'Was kann ich selbst tun?',
    'Wann ist ein individuelles Audit sinnvoll?'
  ]) {
    assert.match(journeyPartial, new RegExp(question.replace('?', '\\?')));
  }
});

test('Beispielbefund zeigt Status, Problem, Relevanz, erste Handlung und Prüfgrenze', () => {
  for (const label of [
    'Status',
    'Gefundenes Problem',
    'Warum relevant',
    'Erste Handlung',
    'Grenze der automatischen Prüfung'
  ]) {
    assert.match(journeyPartial, new RegExp(label));
  }
  assert.match(journeyPartial, /testerImage\.src/);
  assert.match(journeyPartial, /alt="<%= testerImage\.alt %>"/);
  assert.match(controller, /MARKETING_IMAGES\.testerOverview/);
});

test('Nach dem Ergebnis stehen vier getrennte Wege bereit', () => {
  const expectedLinks = [
    '/ratgeber',
    '/leistungen/website-audit',
    '/webdesign-berlin',
    '/kontakt?projektart=website-audit'
  ];
  for (const href of expectedLinks) {
    assert.match(journeyPartial, new RegExp(`href="${href.replace('?', '\\?')}"`));
  }
  assert.match(journeyPartial, /Selbst umsetzen/);
  assert.match(journeyPartial, /Website umfassend prüfen/);
  assert.match(journeyPartial, /Website neu aufbauen/);
  assert.match(journeyPartial, /Projekt besprechen/);
});

test('SEO-Tester verlinkt die Übersicht zusätzlich außerhalb der Breadcrumb-Navigation', () => {
  assert.match(seoView, /class="btn btn-secondary" href="<%= isEn \? '\/en\/website-tester' : '\/website-tester' %>"/);
  assert.match(seoView, /Alle Website-Tests/);
});
