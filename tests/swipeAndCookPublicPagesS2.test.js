import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import ejs from 'ejs';
import express from 'express';

import { footerNavigation } from '../data/siteNavigation.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';
import staticPagesRouter from '../routes/staticPages.js';
import {
  loadSwipeAndCookLegalPage,
  renderApprovedLegalMarkdown
} from '../services/swipeAndCookLegalContentService.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const pageContracts = Object.freeze([
  {
    key: 'privacy',
    path: '/swipeandcook-datenschutz',
    view: 'static/swipeandcook-datenschutz',
    file: 'content/swipeandcook/s2-datenschutzerklaerung.md',
    footerLabel: 'Swipe & Cook Datenschutz',
    required: [
      'Stand: 29. Juli 2026',
      'eigenes Swipe-&-Cook-Konto kann erst ab 16 Jahren erstellt werden',
      'Allergien, Unverträglichkeiten und andere Safety-Angaben',
      'Optionale Produktanalyse',
      'RevenueCat',
      'Kontolöschung und weiterlaufendes Storeabo'
    ]
  },
  {
    key: 'terms',
    path: '/swipeandcook-nutzungsbedingungen',
    view: 'static/swipeandcook-nutzungsbedingungen',
    file: 'content/swipeandcook/s2-nutzungsbedingungen.md',
    footerLabel: 'Swipe & Cook Nutzungsbedingungen',
    required: [
      'Stand: 29. Juli 2026',
      'Ein eigenes Swipe-&-Cook-Konto kann erst ab 16 Jahren erstellt werden',
      'drei erfolgreich ausgewählte Einzelgerichte je Kalendermonat',
      '6,99 € pro Monat',
      '54,99 € pro',
      '7 Tage kostenlos',
      'Konto trotzdem löschen'
    ]
  },
  {
    key: 'support',
    path: '/swipeandcook-support',
    view: 'static/swipeandcook-support',
    file: 'content/swipeandcook/s2-supportseite.md',
    footerLabel: 'Swipe & Cook Support',
    required: [
      'Stand: 29. Juli 2026',
      'Käufe wiederherstellen',
      'Abo verwalten oder kündigen',
      'Plattformwechsel und Doppelabo',
      'Zahlungsproblem, Grace Period und Offlinebetrieb',
      'swipeandcook@komplettwebdesign.de'
    ]
  },
  {
    key: 'accountDeletion',
    path: '/swipeandcook-konto-loeschen',
    view: 'static/swipeandcook-konto-loeschen',
    file: 'content/swipeandcook/s2-kontoloeschung.md',
    footerLabel: 'Swipe & Cook Konto löschen',
    required: [
      'Stand: 29. Juli 2026',
      'Löschung ohne App anfordern',
      'Storeabo separat verwalten oder kündigen',
      'Verifizierungslink',
      'Sende niemals dein Passwort'
    ]
  }
]);

test('registriert alle vier kanonischen Swipe-&-Cook-Seiten als eigene Express-Routen', () => {
  const routes = read('routes/staticPages.js');

  for (const contract of pageContracts) {
    assert.match(routes, new RegExp(`router\\.get\\('${contract.path}'`));
    assert.match(routes, new RegExp(`res\\.render\\('${contract.view}'`));
    assert.match(routes, new RegExp(`currentPathname:\\s*'${contract.path}'`));
  }
});

test('liefert alle vier Seiten über den echten statischen Router aus', async () => {
  const app = express();
  app.use((_req, res, next) => {
    res.render = (view, locals = {}) => res.status(200).json({ view, locals });
    next();
  });
  app.use(staticPagesRouter);

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();

    for (const contract of pageContracts) {
      const response = await fetch(`http://127.0.0.1:${port}${contract.path}`);
      assert.equal(response.status, 200, contract.path);
      assert.equal((await response.json()).view, contract.view);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test('veröffentlicht die freigegebenen S2-Inhalte vollständig und ohne interne Entwurfsvermerke', () => {
  for (const contract of pageContracts) {
    const source = read(contract.file);
    for (const required of contract.required) {
      assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    const rendered = loadSwipeAndCookLegalPage(contract.key);
    assert.doesNotMatch(
      rendered.html,
      /Interner Status|Vorgesehene öffentliche Adresse|Veröffentlichung erst nach|S2-Nachweismatrix/
    );
  }
});

test('rendert jede freigegebene Fassung als zugängliche Seite mit genau einer H1', async () => {
  const template = fileURLToPath(new URL(
    '../views/partials/swipeandcook-legal-body.ejs',
    import.meta.url
  ));

  for (const contract of pageContracts) {
    const html = await ejs.renderFile(template, {
      legalPage: loadSwipeAndCookLegalPage(contract.key),
      csrfToken: 'csrf-test'
    });
    assert.equal((html.match(/<h1\b/g) || []).length, 1, contract.path);
    assert.match(html, /<main\b[^>]*id="main-content"/);
    assert.match(html, /<article class="swipe-privacy-article swipe-legal-article">/);
    assert.doesNotMatch(
      html,
      /Interner Status|Vorgesehene öffentliche Adresse|S2-Nachweismatrix/
    );
  }
});

test('rendert alle vier vollständigen EJS-Seiten mit Kopfzeile und Footer fehlerfrei', async () => {
  for (const contract of pageContracts) {
    const template = fileURLToPath(new URL(
      `../views/${contract.view}.ejs`,
      import.meta.url
    ));
    const html = await ejs.renderFile(template, {
      title: `Swipe & Cook – ${contract.key}`,
      description: 'Öffentliche Swipe-&-Cook-Seite',
      legalPage: loadSwipeAndCookLegalPage(contract.key),
      canonicalBaseUrl: 'https://www.komplettwebdesign.de',
      canonicalUrl: `https://www.komplettwebdesign.de${contract.path}`,
      assetVersion: 'test',
      asset: (assetPath) => `/${assetPath}`,
      cssAsset: (assetPath) => `/${assetPath}`,
      jsAsset: (assetPath) => `/${assetPath}`,
      csrfToken: 'csrf-test',
      currentPathname: contract.path,
      currentSearch: '',
      headerNavigation: [],
      footerNavigation,
      lng: 'de',
      robots: 'noindex',
      disableTracking: true,
      disableInteractionPolish: true,
      trackingContext: {},
      escapeJsonForHtml: (value) => JSON.stringify(value)
    });

    assert.equal((html.match(/<h1\b/g) || []).length, 1, contract.path);
    assert.match(html, /<header(?:\s|>)/);
    assert.match(html, /<footer class="site-footer">/);
    assert.match(html, new RegExp(`href="${contract.path}"`));
  }
});

test('ersetzt die allgemeine Kopfzeile vollständig durch eine eigene Swipe-&-Cook-Navigation', async () => {
  const expectedNavigation = [
    '/swipeandcook-support',
    '/swipeandcook-datenschutz',
    '/swipeandcook-nutzungsbedingungen',
    '/swipeandcook-konto-loeschen'
  ];

  for (const contract of pageContracts) {
    const template = fileURLToPath(new URL(
      `../views/${contract.view}.ejs`,
      import.meta.url
    ));
    const html = await ejs.renderFile(template, {
      title: `Swipe & Cook – ${contract.key}`,
      description: 'Öffentliche Swipe-&-Cook-Seite',
      legalPage: loadSwipeAndCookLegalPage(contract.key),
      canonicalBaseUrl: 'https://www.komplettwebdesign.de',
      canonicalUrl: `https://www.komplettwebdesign.de${contract.path}`,
      assetVersion: 'test',
      asset: (assetPath) => `/${assetPath}`,
      cssAsset: (assetPath) => `/${assetPath}`,
      jsAsset: (assetPath) => `/${assetPath}`,
      csrfToken: 'csrf-test',
      currentPathname: contract.path,
      currentSearch: '',
      headerNavigation: [],
      footerNavigation,
      lng: 'de',
      robots: 'noindex',
      disableTracking: true,
      disableInteractionPolish: true,
      trackingContext: {},
      escapeJsonForHtml: (value) => JSON.stringify(value)
    });
    const $ = load(html);

    assert.equal($('header.swipe-site-header').length, 1, contract.path);
    assert.deepEqual(
      $('header.swipe-site-header nav a').map((_index, link) => (
        $(link).attr('href')
      )).get(),
      expectedNavigation,
      contract.path
    );
    assert.equal(
      $(`header.swipe-site-header a[href="${contract.path}"][aria-current="page"]`).length,
      1,
      contract.path
    );
    assert.equal($('header .hero-nav, header .navigation, header .logo').length, 0);
    assert.equal($('.swipe-legal-nav').length, 0);
    assert.doesNotMatch(
      $('header.swipe-site-header').text(),
      /Projekt anfragen|Website erstellen lassen|Webdesign Berlin/
    );
  }
});

test('verwendet in der Kopfzeile exakt das offizielle dunkle Swipe-&-Cook-App-Icon', () => {
  const header = read('views/partials/swipeandcook-header.ejs');
  const icon = readFileSync(
    new URL('../public/images/swipeandcook-icon-dark.png', import.meta.url)
  );

  assert.match(
    header,
    /<img[^>]+class="swipe-site-brand__icon"[^>]+src="\/images\/swipeandcook-icon-dark\.png"/
  );
  assert.doesNotMatch(header, /swipe-site-brand__mark|S<span>&amp;<\/span>C/);
  assert.equal(
    createHash('sha256').update(icon).digest('hex'),
    '5e845b9fa9b60ed3fb0ccfea114f74a78e46abd69e96b3d39e58d3be8a735154'
  );
});

test('der begrenzte Rechtstext-Renderer escaped aktive Inhalte und erlaubt nur sichere Links', () => {
  const html = renderApprovedLegalMarkdown(`
## Test

<script>alert(1)</script>

[Sicher](https://www.komplettwebdesign.de/swipeandcook-support)

[Unsicher](javascript:alert(1))
`);

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /href="https:\/\/www\.komplettwebdesign\.de\/swipeandcook-support"/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test('verlinkt alle vier Seiten im rechtlichen Footer und in der statischen Sitemap', () => {
  const legal = footerNavigation.find((column) => column.label === 'Rechtliches');
  assert.ok(legal);

  for (const contract of pageContracts) {
    assert.ok(legal.links.some((link) => (
      link.label === contract.footerLabel
      && link.href === contract.path
    )), contract.path);
    assert.ok(INDEXABLE_STATIC_ROUTES.some((route) => (
      route.path === contract.path
      && route.changefreq === 'yearly'
      && route.priority === 0.2
    )), contract.path);
  }
});

test('bindet das Löschformular ausschließlich an gleichursprüngliche Website-Endpunkte', () => {
  const view = read('views/partials/swipeandcook-account-deletion-forms.ejs');
  const page = read('views/static/swipeandcook-konto-loeschen.ejs');
  const script = read('public/js/swipeandcook-account-deletion.js');

  assert.match(view, /id="swipe-deletion-request-form"/);
  assert.match(view, /id="swipe-deletion-verification-form"/);
  assert.match(view, /name="website"/);
  assert.match(view, /name="confirmPaidAccessLoss"/);
  assert.match(view, /Konto trotzdem löschen/);
  assert.match(view, /data-request-endpoint="\/api\/swipeandcook\/account-deletion-requests"/);
  assert.match(view, /data-verification-endpoint="\/api\/swipeandcook\/account-deletion-verifications"/);
  assert.match(view, /name="_csrf"/);
  assert.match(page, /js\/swipeandcook-account-deletion\.js/);
  assert.match(script, /credentials:\s*'same-origin'/);
  assert.match(script, /x-csrf-token/i);
  assert.doesNotMatch(script, /api\.swipeandcook\.komplettwebdesign\.de/);
  assert.doesNotMatch(view, /password|Einmalcode|Kauftoken|Zahlungskartendaten/i);
});
