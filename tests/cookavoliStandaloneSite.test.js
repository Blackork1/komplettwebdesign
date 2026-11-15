import assert from 'node:assert/strict';
import test from 'node:test';

import { load } from 'cheerio';

import { createCookavoliApp } from '../cookavoli/app.js';

const csrfSecret = 'cookavoli-test-secret-with-at-least-32-characters';

function createGateway() {
  const calls = [];
  return {
    calls,
    async start(body) {
      calls.push({ method: 'start', body });
      return { status: 202, body: { accepted: true } };
    },
    async verify(body) {
      calls.push({ method: 'verify', body });
      return { status: 202, body: { accepted: true } };
    }
  };
}

async function withServer(run, { accountDeletionEnabled = false } = {}) {
  const gateway = createGateway();
  const app = createCookavoliApp({
    csrfSecret,
    deletionGateway: gateway,
    accountDeletionEnabled,
    nodeEnv: 'test'
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address();
    await run({
      gateway,
      origin: `http://127.0.0.1:${port}`
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
}

function request(origin, path, options = {}) {
  return fetch(`${origin}${path}`, {
    redirect: 'manual',
    ...options,
    headers: {
      host: 'cookavoli.com',
      'x-forwarded-host': 'cookavoli.com',
      'x-forwarded-proto': 'https',
      ...options.headers
    }
  });
}

test('liefert ausschließlich die eigenständige Cookavoli-Website aus', async () => {
  await withServer(async ({ origin }) => {
    const response = await request(origin, '/');
    const html = await response.text();
    const $ = load(html);

    assert.equal(response.status, 200);
    assert.equal($('h1').length, 1);
    assert.equal($('h1').attr('aria-label'), 'Cookavoli');
    assert.equal($('link[rel="canonical"]').attr('href'), 'https://cookavoli.com/');
    assert.equal($('meta[property="og:url"]').attr('content'), 'https://cookavoli.com/');
    assert.equal($('html').attr('lang'), 'de');
    assert.match(html, /Cookavoli/);
    assert.doesNotMatch(html, /Swipe\s*(?:&amp;|&|and)\s*Cook/i);
    assert.doesNotMatch(html, /Newsletter|Chatbot|Projekt anfragen/i);
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/);
  });
});

test('liefert kurze Cookavoli-Routen mit korrekten Canonicals und ohne Altmarke', async () => {
  await withServer(async ({ origin }) => {
    for (const path of [
      '/support',
      '/datenschutz',
      '/nutzungsbedingungen',
      '/konto-loeschen',
      '/impressum'
    ]) {
      const response = await request(origin, path);
      const html = await response.text();
      const $ = load(html);
      assert.equal(response.status, 200, path);
      assert.equal($('h1').length, 1, path);
      assert.equal(
        $('link[rel="canonical"]').attr('href'),
        `https://cookavoli.com${path}`,
        path
      );
      assert.doesNotMatch(html, /Swipe\s*(?:&amp;|&|and)\s*Cook/i, path);
      assert.doesNotMatch(html, /www\.komplettwebdesign\.de\/swipeandcook/i, path);
    }
  });
});

test('isoliert Hosts und leitet Schutz- sowie www-Domains dauerhaft um', async () => {
  await withServer(async ({ origin }) => {
    for (const host of ['www.cookavoli.com', 'cookavoli.de', 'www.cookavoli.de']) {
      const response = await request(origin, '/support?from=test', {
        headers: { host, 'x-forwarded-host': host }
      });
      assert.equal(response.status, 308, host);
      assert.equal(
        response.headers.get('location'),
        'https://cookavoli.com/support?from=test',
        host
      );
    }

    const foreign = await request(origin, '/', {
      headers: {
        host: 'www.komplettwebdesign.de',
        'x-forwarded-host': 'www.komplettwebdesign.de'
      }
    });
    assert.equal(foreign.status, 421);
  });
});

test('liefert Healthcheck, Robots, Sitemap, Manifest, Assets und eigene 404', async () => {
  await withServer(async ({ origin }) => {
    const health = await fetch(`${origin}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', service: 'cookavoli-web' });

    const robots = await request(origin, '/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Sitemap: https:\/\/cookavoli\.com\/sitemap\.xml/);

    const sitemap = await request(origin, '/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(await sitemap.text(), /https:\/\/cookavoli\.com\/datenschutz/);

    const manifest = await request(origin, '/manifest.webmanifest');
    assert.equal(manifest.status, 200);
    assert.equal((await manifest.json()).name, 'Cookavoli');

    const css = await request(origin, '/assets/site.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type') || '', /text\/css/);

    const missing = await request(origin, '/nicht-vorhanden');
    const missingHtml = await missing.text();
    assert.equal(missing.status, 404);
    assert.equal(load(missingHtml)('meta[name="robots"]').attr('content'), 'noindex, nofollow');
    assert.match(missingHtml, /Seite nicht gefunden/);
  });
});

test('hält Icon-Proportionen und Navigation auf schmalen Viewports stabil', async () => {
  await withServer(async ({ origin }) => {
    const response = await request(origin, '/assets/site.css');
    const css = await response.text();

    assert.equal(response.status, 200);
    assert.match(css, /\.orbit-icon\s+img\s*\{[^}]*height:\s*auto\s*;/s);
    assert.match(
      css,
      /@media\s*\(max-width:\s*860px\)[\s\S]*?\.site-nav\s*\{[^}]*flex-wrap:\s*wrap\s*;[^}]*overflow-x:\s*visible\s*;/s
    );
  });
});

test('hält den externen Kontolöschweg bis zur Infrastrukturfreigabe deaktiviert', async () => {
  await withServer(async ({ origin, gateway }) => {
    const page = await request(origin, '/konto-loeschen');
    const html = await page.text();

    assert.equal(page.status, 200);
    assert.doesNotMatch(html, /data-deletion-root|account-deletion\.js/);
    assert.match(html, /Online-Anforderung ist noch nicht freigeschaltet/);
    assert.equal(page.headers.get('set-cookie'), null);

    const post = await request(origin, '/api/account-deletion-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', website: '' })
    });
    assert.equal(post.status, 404);
    assert.deepEqual(gateway.calls, []);
  });
});

test('schützt das Kontolöschgateway mit signiertem Same-Site-CSRF-Cookie', async () => {
  await withServer(async ({ origin, gateway }) => {
    const page = await request(origin, '/konto-loeschen');
    const html = await page.text();
    const csrfToken = load(html)('input[name="_csrf"]').first().attr('value');
    const cookie = page.headers.get('set-cookie');
    assert.ok(csrfToken);
    assert.match(cookie || '', /cookavoli_csrf=/);
    assert.match(cookie || '', /HttpOnly/i);
    assert.match(cookie || '', /SameSite=Lax/i);
    assert.match(cookie || '', /Secure/i);

    const rejected = await request(origin, '/api/account-deletion-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', website: '' })
    });
    assert.equal(rejected.status, 403);

    const accepted = await request(origin, '/api/account-deletion-requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ email: 'test@example.com', website: '' })
    });
    assert.equal(accepted.status, 202);
    assert.deepEqual(await accepted.json(), { accepted: true });
    assert.deepEqual(gateway.calls, [{
      method: 'start',
      body: { email: 'test@example.com', website: '' }
    }]);
  }, { accountDeletionEnabled: true });
});
