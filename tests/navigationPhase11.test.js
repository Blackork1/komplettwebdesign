import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { footerNavigation, headerCta, headerNavigation } from '../data/siteNavigation.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function flattenNavigation(items = []) {
  return items.flatMap((item) => [
    item,
    ...flattenNavigation(Array.isArray(item.children) ? item.children : []),
    ...flattenNavigation(Array.isArray(item.links) ? item.links : [])
  ]);
}

const header = read('views/partials/header.ejs');
const footer = read('views/partials/footer.ejs');
const extraCss = read('public/extra.css');
const packagesList = read('views/packages_list.ejs');
const packageDetail = read('views/package_detail.ejs');
const allNavigationItems = [
  ...flattenNavigation(headerNavigation),
  ...flattenNavigation(footerNavigation),
  headerCta
];
const allNavigationHrefs = allNavigationItems
  .flatMap((item) => [item.href, item.hrefEn])
  .filter(Boolean);

test('phase 11 header uses the new lean primary navigation and project CTA', () => {
  assert.deepEqual(
    headerNavigation.map((item) => item.label),
    ['Start', 'Webdesign Berlin', 'Pakete & Preise', 'Leistungen', 'Referenzen', 'Branchen']
  );

  assert.equal(headerCta.label, 'Kontakt');
  assert.equal(headerCta.href, '/kontakt');
  assert.ok(headerNavigation.some((item) => item.href === '/branchen'));
  assert.doesNotMatch(header, /Termin buchen|Book a call|\/booking/);
  assert.doesNotMatch(header, /Branchen Untermenü|Website-Tester Untermenü|Website Tester<\/a>/);
});

test('phase 11 mobile navigation exposes accessible controls', () => {
  const navToggle = read('public/js/navToggle.js');

  assert.match(header, /<button[\s\S]*id="menu-icon"[\s\S]*aria-controls="nav-links"[\s\S]*aria-expanded="false"/);
  assert.match(header, /class="dropdown-toggle-btn"[\s\S]*aria-expanded="false"/);
  assert.match(navToggle, /menuIcon\.setAttribute\("aria-expanded", String\(isOpen\)\)/);
  assert.match(navToggle, /button\.setAttribute\("aria-expanded", "true"\)/);
  assert.match(navToggle, /button\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(header, /\/images\/nav-icons\/industries\.svg/);
  assert.match(extraCss, /dropdown\.is-active > \.dropdown-toggle > a\.nav-link-item \.mobile-nav-label/);
});

test('phase 11 services dropdown links to canonical service pages only', () => {
  const services = headerNavigation.find((item) => item.label === 'Leistungen');
  const serviceHrefs = services.children.map((item) => item.href);

  assert.deepEqual(serviceHrefs, [
    '/leistungen/',
    '/leistungen/website-relaunch',
    '/leistungen/local-seo',
    '/leistungen/landingpage-erstellen-lassen',
    '/leistungen/website-audit',
    '/leistungen/responsives-design-mobile',
    '/leistungen/inhalte-texte-content',
    '/leistungen/rechtliches-sicherheit',
    '/leistungen/website-wartung',
    '/leistungen/zusatzleistungen-webdesign',
    '/leistungen/laufende-kosten-website'
  ]);
});

test('phase 11 footer groups offer, cost, visibility, trust and legal links', () => {
  assert.deepEqual(
    footerNavigation.map((column) => column.label),
    ['Angebot', 'Kosten & Betrieb', 'Sichtbarkeit & Tools', 'Kontakt & Vertrauen', 'Rechtliches']
  );

  for (const href of [
    '/webdesign-berlin/kosten-preise-pakete',
    '/leistungen/laufende-kosten-website',
    '/leistungen/zusatzleistungen-webdesign',
    '/leistungen/website-wartung',
    '/leistungen/local-seo',
    '/leistungen/website-audit',
    '/kontakt',
    '/impressum',
    '/datenschutz',
    '/hinweise-rechtstexte-seo-datenschutz'
  ]) {
    assert.ok(allNavigationHrefs.includes(href), `missing footer/header href ${href}`);
  }

  assert.match(footer, /footerNavigation/);
});

test('phase 11 global navigation avoids legacy package URLs, old price anchors and risky claims', () => {
  const navigationText = JSON.stringify({ headerNavigation, footerNavigation, headerCta });

  assert.doesNotMatch(navigationText, /\/pakete\/basis|\/pakete\/premium|Basis-Paket|Premium-Paket/i);
  assert.doesNotMatch(navigationText, /ab 499|Business 899|Premium 1\.499|Wartung ab 5/i);
  assert.doesNotMatch(navigationText, /rechtssicher|DSGVO-konform|keine versteckten Kosten|alles inklusive/i);
});

test('phase 11 recurring package CTAs no longer point users to the booking flow', () => {
  const packageCtas = [packagesList, packageDetail].join('\n');

  assert.doesNotMatch(packageCtas, /Projektgespräch buchen|Book a project call/i);
  assert.doesNotMatch(packageCtas, /href="<%= is(?:En|English) \? '\/en\/booking' : '\/booking' %>"/);
  assert.match(packagesList, /\/kontakt\?projektart=unsure/);
  assert.match(packageDetail, /Pakete vergleichen/);
});
