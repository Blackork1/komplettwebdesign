import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { createContentAttributionService } from '../services/contentAgent/contentAttributionService.js';

const NOW = new Date('2026-07-15T12:00:00.000Z');

function createRepository() {
  const calls = [];
  return {
    calls,
    async recordArticleEvent(input) {
      calls.push(input);
      return { id: calls.length };
    }
  };
}

function request(overrides = {}) {
  return {
    sessionID: 'anonyme-sitzung-123',
    session: {
      cookieConsent: { analytics: true },
      ...overrides.session
    },
    ...overrides
  };
}

test('merkt einen veröffentlichten Artikel nur mit Analytics-Einwilligung vor', () => {
  const service = createContentAttributionService({
    repository: createRepository(),
    secret: 'ein-ausreichend-langes-testgeheimnis',
    now: () => NOW
  });
  const req = request();

  assert.equal(service.rememberArticle(req, { id: 42, published: true }), true);
  assert.deepEqual(req.session.contentArticleLastTouch, {
    postId: 42,
    touchedAt: NOW.toISOString()
  });

  const denied = request({ session: { cookieConsent: { analytics: false } } });
  assert.equal(service.rememberArticle(denied, { id: 42, published: true }), false);
  assert.equal(denied.session.contentArticleLastTouch, undefined);
  assert.equal(service.rememberArticle(request(), { id: 42, published: false }), false);
});

test('speichert einen gültigen CTA-Klick als anonymen, deduplizierbaren Hash', async () => {
  const repository = createRepository();
  const secret = 'ein-ausreichend-langes-testgeheimnis';
  const service = createContentAttributionService({ repository, secret, now: () => NOW });
  const req = request({
    session: {
      cookieConsent: { analytics: true },
      contentArticleLastTouch: { postId: 42, touchedAt: NOW.toISOString() }
    }
  });

  const result = await service.recordCtaClick(req, {
    postId: 42,
    nonce: '550e8400-e29b-41d4-a716-446655440000',
    ctaLocation: 'blog_early',
    ctaTarget: '/kontakt?projektart=audit'
  });

  assert.equal(result, true);
  assert.equal(repository.calls.length, 1);
  assert.deepEqual(repository.calls[0], {
    postId: 42,
    eventType: 'cta_click',
    occurredAt: NOW,
    ctaLocation: 'blog_early',
    ctaTarget: '/kontakt?projektart=audit',
    eventKeyHash: createHmac('sha256', secret)
      .update('anonyme-sitzung-123|550e8400-e29b-41d4-a716-446655440000|cta_click')
      .digest('hex')
  });
  assert.equal(JSON.stringify(repository.calls).includes('anonyme-sitzung-123'), false);
});

test('verwirft abgelaufene, zukünftige oder manipulierte CTA-Zuordnungen', async () => {
  const repository = createRepository();
  const service = createContentAttributionService({
    repository,
    secret: 'ein-ausreichend-langes-testgeheimnis',
    now: () => NOW
  });
  const cases = [
    {
      touch: { postId: 42, touchedAt: '2026-07-08T11:59:59.000Z' },
      input: { postId: 42, nonce: '550e8400-e29b-41d4-a716-446655440000', ctaTarget: '/kontakt' }
    },
    {
      touch: { postId: 42, touchedAt: '2026-07-15T12:00:01.000Z' },
      input: { postId: 42, nonce: '550e8400-e29b-41d4-a716-446655440000', ctaTarget: '/kontakt' }
    },
    {
      touch: { postId: 42, touchedAt: NOW.toISOString() },
      input: { postId: 99, nonce: '550e8400-e29b-41d4-a716-446655440000', ctaTarget: '/kontakt' }
    },
    {
      touch: { postId: 42, touchedAt: NOW.toISOString() },
      input: { postId: 42, nonce: 'kein-uuid', ctaTarget: '/kontakt' }
    },
    {
      touch: { postId: 42, touchedAt: NOW.toISOString() },
      input: { postId: 42, nonce: '550e8400-e29b-41d4-a716-446655440000', ctaTarget: 'https://fremd.example/kontakt' }
    },
    {
      touch: { postId: 42, touchedAt: NOW.toISOString() },
      input: { postId: 42, nonce: '550e8400-e29b-41d4-a716-446655440000', ctaTarget: '//fremd.example/kontakt' }
    }
  ];

  for (const entry of cases) {
    const req = request({
      session: {
        cookieConsent: { analytics: true },
        contentArticleLastTouch: entry.touch
      }
    });
    assert.equal(await service.recordCtaClick(req, entry.input), false);
  }
  assert.equal(repository.calls.length, 0);
});

test('ordnet eine Kontaktanfrage höchstens sieben Tage anonym dem letzten Artikel zu', async () => {
  const repository = createRepository();
  const service = createContentAttributionService({
    repository,
    secret: 'ein-ausreichend-langes-testgeheimnis',
    now: () => NOW
  });
  const req = request({
    session: {
      cookieConsent: { analytics: true },
      contentArticleLastTouch: { postId: 42, touchedAt: '2026-07-10T08:00:00.000Z' }
    }
  });

  assert.equal(await service.recordContactSubmit(req), true);
  assert.equal(repository.calls[0].eventType, 'contact_submit');
  assert.equal(repository.calls[0].postId, 42);
  assert.equal(repository.calls[0].ctaLocation, null);
  assert.equal(repository.calls[0].ctaTarget, '/kontakt');
  assert.match(repository.calls[0].eventKeyHash, /^[0-9a-f]{64}$/);
});

