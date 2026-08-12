import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { load } from 'cheerio';
import ejs from 'ejs';
import express from 'express';

import {
  createSwipeAndCookInviteRouter,
  loadSwipeAndCookInvitePageConfig
} from '../routes/swipeAndCookInviteRoutes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const associationConfig = {
  appleTeamId: 'A1B2C3D4E5',
  appleBundleIds: [
    'de.komplettwebdesign.swipeandcook',
    'de.komplettwebdesign.swipeandcook.internal'
  ],
  androidPackageNames: [
    'de.komplettwebdesign.swipeandcook',
    'de.komplettwebdesign.swipeandcook.internal'
  ],
  androidSha256Fingerprints: [
    Array.from({ length: 32 }, () => 'AA').join(':')
  ]
};

const invitePageEnv = {
  SWIPEANDCOOK_PUBLIC_INVITE_URL: 'https://www.komplettwebdesign.de/swipeandcook/einladung',
  SWIPEANDCOOK_TESTFLIGHT_URL: 'https://testflight.apple.com/',
  SWIPEANDCOOK_GOOGLE_PLAY_INTERNAL_TEST_URL: 'https://play.google.com/apps/internaltest/example'
};

async function renderPage(env = invitePageEnv) {
  const app = express();
  app.engine('ejs', ejs.__express);
  app.set('view engine', 'ejs');
  app.set('views', path.join(root, 'views'));
  app.locals.cssAsset = (assetPath) => `/${assetPath}`;
  app.locals.jsAsset = (assetPath) => `/${assetPath}`;
  app.use(createSwipeAndCookInviteRouter({
    associationConfig,
    invitePageConfig: loadSwipeAndCookInvitePageConfig(env)
  }));

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    return await fetch(`http://127.0.0.1:${port}/swipeandcook/einladung`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
}

test('validiert kanonische Einladung und ausschließlich private Testerziele', () => {
  assert.deepEqual(loadSwipeAndCookInvitePageConfig(invitePageEnv), {
    canonicalInviteUrl: invitePageEnv.SWIPEANDCOOK_PUBLIC_INVITE_URL,
    testFlightUrl: invitePageEnv.SWIPEANDCOOK_TESTFLIGHT_URL,
    googlePlayInternalTestUrl: invitePageEnv.SWIPEANDCOOK_GOOGLE_PLAY_INTERNAL_TEST_URL
  });

  for (const invalidEnv of [
    {},
    { ...invitePageEnv, SWIPEANDCOOK_PUBLIC_INVITE_URL: 'http://www.komplettwebdesign.de/swipeandcook/einladung' },
    { ...invitePageEnv, SWIPEANDCOOK_PUBLIC_INVITE_URL: 'https://www.komplettwebdesign.de/swipeandcook/einladung?token=rohwert' },
    { ...invitePageEnv, SWIPEANDCOOK_TESTFLIGHT_URL: 'https://apps.apple.com/de/app/example' },
    { ...invitePageEnv, SWIPEANDCOOK_GOOGLE_PLAY_INTERNAL_TEST_URL: 'https://example.test/install' }
  ]) {
    assert.throws(
      () => loadSwipeAndCookInvitePageConfig(invalidEnv),
      /swipeandcook_invite_page_config_invalid/
    );
  }
});

test('blendet Google Play aus, solange kein echter privater Testlink konfiguriert ist', async () => {
  const env = { ...invitePageEnv };
  delete env.SWIPEANDCOOK_GOOGLE_PLAY_INTERNAL_TEST_URL;

  assert.deepEqual(loadSwipeAndCookInvitePageConfig(env), {
    canonicalInviteUrl: invitePageEnv.SWIPEANDCOOK_PUBLIC_INVITE_URL,
    testFlightUrl: invitePageEnv.SWIPEANDCOOK_TESTFLIGHT_URL,
    googlePlayInternalTestUrl: null
  });

  const response = await renderPage(env);
  const $ = load(await response.text());
  assert.equal($('[data-google-play-link]').length, 0);
  assert.equal($('[data-testflight-link]').length, 1);
});

test('rendert eine datensparsame, nicht indexierbare Einladungsseite', async () => {
  const response = await renderPage();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'no-store');

  const csp = response.headers.get('content-security-policy') || '';
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /https?:|\*/);

  const html = await response.text();
  const $ = load(html);
  assert.equal($('h1').length, 1);
  assert.equal($('html').attr('lang'), 'de');
  assert.equal($('meta[name="robots"]').attr('content'), 'noindex,nofollow');
  assert.equal($('a.swipe-invite-skip').attr('href'), '#main-content');
  assert.equal($('main').attr('id'), 'main-content');
  assert.equal($('[data-app-link]').text().trim(), 'Swipe & Cook öffnen');
  assert.equal($('[data-testflight-link]').text().trim(), 'Über TestFlight installieren');
  assert.equal($('[data-google-play-link]').text().trim(), 'Über Google Play Internal Testing installieren');

  const text = $('body').text().replace(/\s+/g, ' ');
  assert.match(text, /Einladung ist noch kein Beitritt/);
  assert.match(text, /eigenes Swipe-&-Cook-Konto/);
  assert.match(text, /empfohlene Konto beziehungsweise die empfohlene E-Mail-Adresse/);
  assert.match(text, /falschen Konto/);
  assert.match(text, /Allergien und Unverträglichkeiten/);
  assert.match(text, /ausdrücklich zustimmst/);
  assert.match(text, /ablaufen oder widerrufen/);
  assert.match(text, /Testerberechtigung/);

  for (const href of [
    '/swipeandcook-support',
    '/swipeandcook-datenschutz',
    '/swipeandcook-nutzungsbedingungen',
    '/swipeandcook-konto-loeschen'
  ]) {
    assert.equal($(`a[href="${href}"]`).length, 1);
  }
});

test('hält den Einladungstoken ausschließlich im Fragment und sendet ihn nirgends hin', () => {
  const script = read('public/js/swipeandcook-invite.js');
  const view = read('views/static/swipeandcook-einladung.ejs');

  assert.match(script, /window\.location\.hash/);
  assert.match(script, /#token=/);
  assert.match(script, /addEventListener\(['"]click['"]/);
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|sendBeacon|location\.search|searchParams|localStorage|sessionStorage/);
  assert.doesNotMatch(script, /window\.location\.(?:assign|replace)|setTimeout|setInterval/);
  assert.doesNotMatch(view, /Google Tag|tracking\.js|chat\.js|recaptcha|cloudinary|stripe/i);
  assert.doesNotMatch(view, /[?&]token=/);
});

test('verwendet im Browser einen echten, eng begrenzten App-Öffnen-Link', () => {
  const token = 'A'.repeat(43);
  const appScheme = 'de.komplettwebdesign.swipeandcook';
  const expected = `${appScheme}://shared-invite#token=${token}`;
  const script = read('public/js/swipeandcook-invite.js');

  const attributes = new Map([
    ['href', 'https://www.komplettwebdesign.de/swipeandcook/einladung']
  ]);
  const appLink = {
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    addEventListener: () => {}
  };
  const status = { textContent: '' };
  const document = {
    querySelector: (selector) => selector === '[data-app-link]' ? appLink : status
  };
  const window = { location: { hash: `#token=${token}` } };

  Function('window', 'document', script)(window, document);

  assert.equal(attributes.get('href'), expected);
  assert.equal(
    status.textContent,
    'Die Einladung ist bereit. Öffne sie jetzt in der App.'
  );
  assert.doesNotMatch(attributes.get('href'), /^https:/);
});

test('bietet sichtbare Tastaturfoki und lädt nur lokale Seitendateien', () => {
  const css = read('public/swipeandcook-invite.css');
  const view = read('views/static/swipeandcook-einladung.ejs');

  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:/);
  assert.doesNotMatch(css, /https?:\/\//);
  assert.doesNotMatch(view, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
});

test('mountet die Einladung vor Session, Accesslog und allgemeinem 404-Handler', () => {
  const indexSource = read('index.js');
  const inviteMount = indexSource.indexOf('app.use(createSwipeAndCookInviteRouter');

  assert.ok(inviteMount > -1);
  assert.ok(inviteMount < indexSource.indexOf('app.use(session('));
  assert.ok(inviteMount < indexSource.indexOf('app.use(accessLog('));
  assert.ok(inviteMount < indexSource.indexOf('app.use(errorController.get404)'));
  assert.match(indexSource, /'swipeandcook-invite\.css'/);
});
