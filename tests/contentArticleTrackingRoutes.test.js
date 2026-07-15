import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

import express from 'express';

import { createContentTrackingRouter } from '../routes/contentTrackingRoutes.js';

async function withServer({ service, session }, callback) {
  const app = express();
  const sharedSession = {
    csrfToken: 'sicheres-csrf-token',
    cookieConsent: { analytics: true },
    contentArticleLastTouch: {
      postId: 42,
      touchedAt: new Date().toISOString()
    },
    ...session
  };
  app.use(express.json());
  app.use((req, _res, next) => {
    req.sessionID = 'route-test-session';
    req.session = sharedSession;
    next();
  });
  app.use(createContentTrackingRouter({ attributionService: service }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await callback(origin);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function request(origin, overrides = {}) {
  return fetch(`${origin}/analytics/content-article-cta`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': 'sicheres-csrf-token',
      origin,
      ...overrides.headers
    },
    body: JSON.stringify({
      postId: 42,
      nonce: '550e8400-e29b-41d4-a716-446655440000',
      ctaLocation: 'blog_early',
      ctaTarget: '/kontakt',
      ...overrides.body
    })
  });
}

test('CTA-Route bestätigt gültige Ereignisse ohne Antwortdaten', async () => {
  const calls = [];
  await withServer({
    service: { async recordCtaClick(req, body) { calls.push({ req, body }); return true; } }
  }, async (origin) => {
    const response = await request(origin);
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.postId, 42);
});

test('CTA-Route lehnt fremde Origins und ungültige CSRF-Tokens ab', async () => {
  const service = { async recordCtaClick() { throw new Error('darf nicht laufen'); } };
  await withServer({ service }, async (origin) => {
    const foreign = await request(origin, { headers: { origin: 'https://fremd.example' } });
    assert.equal(foreign.status, 403);
    const invalidCsrf = await request(origin, { headers: { 'x-csrf-token': 'falsch' } });
    assert.equal(invalidCsrf.status, 403);
  });
});

test('CTA-Route antwortet auch bei internem Speicherfehler datensparsam mit 204', async () => {
  await withServer({
    service: { async recordCtaClick() { throw new Error('Datenbank vorübergehend nicht erreichbar'); } }
  }, async (origin) => {
    const response = await request(origin);
    assert.equal(response.status, 204);
  });
});

test('CTA-Route begrenzt eine Sitzung auf 20 Ereignisse pro Minute', async () => {
  await withServer({
    service: { async recordCtaClick() { return true; } }
  }, async (origin) => {
    for (let index = 0; index < 20; index += 1) {
      const response = await request(origin, {
        body: { nonce: `550e8400-e29b-41d4-a716-${String(index).padStart(12, '0')}` }
      });
      assert.equal(response.status, 204);
    }
    const limited = await request(origin);
    assert.equal(limited.status, 429);
  });
});
