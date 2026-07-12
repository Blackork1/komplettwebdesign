import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

import * as authMiddleware from '../middleware/auth.js';
import { login } from '../controllers/authController.js';
import pool from '../util/db.js';

function safeContentAgentReturnTo(value) {
  assert.equal(
    typeof authMiddleware.safeContentAgentReturnTo,
    'function',
    'safeContentAgentReturnTo muss exportiert sein'
  );
  return authMiddleware.safeContentAgentReturnTo(value);
}

function redirectResponse() {
  return {
    redirects: [],
    redirect(path) {
      this.redirects.push(path);
      return this;
    },
    render() {
      assert.fail('Bei gültigen Zugangsdaten darf das Loginformular nicht erneut gerendert werden');
    }
  };
}

async function withAdminCredentials(run) {
  const originalQuery = pool.query;
  const passwordHash = await bcrypt.hash('richtiges-passwort', 4);
  pool.query = async () => ({
    rows: [{ id: 7, username: 'redaktion', password_hash: passwordHash }]
  });

  try {
    await run();
  } finally {
    pool.query = originalQuery;
  }
}

test('akzeptiert nur relative Content-Agent-Pfade mit eng begrenzter Query', () => {
  for (const safe of [
    '/admin/content-agent',
    '/admin/content-agent/drafts/42/edit',
    '/admin/content-agent/drafts?status=review',
    '/admin/content-agent/drafts/42/edit?queued=1&notification_retried=1'
  ]) {
    assert.equal(safeContentAgentReturnTo(safe), safe);
  }
});

test('verwirft absolute, protokollrelative, fremde und syntaktisch mehrdeutige Ziele', () => {
  for (const unsafe of [
    'https://evil.example/admin/content-agent/drafts/42/edit',
    '//evil.example/admin/content-agent/drafts/42/edit',
    '/admin/users',
    '/admin/content-agent-evil/drafts/42/edit',
    '/admin/content-agent\\drafts\\42\\edit',
    '/admin/content-agent/drafts//42/edit',
    '/admin/content-agent/drafts/42/edit#logout',
    '/admin/content-agent/drafts?return_to=https://evil.example',
    '/admin/content-agent/drafts?status=review%26return_to=evil',
    '/admin/content-agent/drafts?status=',
    '/admin/content-agent/drafts?=review',
    '/admin/content-agent/drafts?status=review&&queued=1',
    '',
    null,
    { path: '/admin/content-agent' }
  ]) {
    assert.equal(safeContentAgentReturnTo(unsafe), null, String(unsafe));
  }
});

test('verwirft Controls, Dot-Segmente, codierte Traversals und Unicode-Tricks', () => {
  for (const unsafe of [
    '/admin/content-agent/../logout',
    '/admin/content-agent/./drafts',
    '/admin/content-agent/%2e%2e/logout',
    '/admin/content-agent/%252e%252e/logout',
    '/admin/content-agent/%2f%2e%2e%2flogout',
    '/admin/content-agent/%c0%ae%c0%ae/logout',
    '/admin/content-agent/drafts/42/edit\n/evil',
    '/admin/content-agent/drafts/42/edit\u0000',
    '/admin/content-agent\u2215..\u2215logout',
    '/admin/content-agent\uff0f..\uff0flogout',
    '/admin/content-agent/dra\u0430fts/42/edit'
  ]) {
    assert.equal(safeContentAgentReturnTo(unsafe), null, unsafe);
  }
});

test('isAdmin merkt bei anonymen GET- und HEAD-Anfragen nur sichere Ziele vor', () => {
  for (const method of ['GET', 'HEAD']) {
    const req = {
      method,
      originalUrl: '/admin/content-agent/drafts/42/edit?queued=1',
      session: {}
    };
    const res = redirectResponse();

    authMiddleware.isAdmin(req, res, assert.fail);

    assert.deepEqual(res.redirects, ['/login']);
    assert.equal(req.session.contentAgentReturnTo, req.originalUrl);
  }

  const unsafeRequest = {
    method: 'GET',
    originalUrl: '//evil.example/admin/content-agent/drafts/42/edit',
    session: {}
  };
  authMiddleware.isAdmin(unsafeRequest, redirectResponse(), assert.fail);
  assert.equal(unsafeRequest.session.contentAgentReturnTo, undefined);
});

test('isAdmin merkt weder Schreibaktionen noch Anfragen angemeldeter Nicht-Admins vor', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const req = {
      method,
      originalUrl: '/admin/content-agent/drafts/42/publish',
      session: {}
    };
    authMiddleware.isAdmin(req, redirectResponse(), assert.fail);
    assert.equal(req.session.contentAgentReturnTo, undefined, method);
  }

  const nonAdminRequest = {
    method: 'GET',
    originalUrl: '/admin/content-agent/drafts/42/edit',
    session: { user: { isAdmin: false } }
  };
  authMiddleware.isAdmin(nonAdminRequest, redirectResponse(), assert.fail);
  assert.equal(nonAdminRequest.session.contentAgentReturnTo, undefined);
});

test('erfolgreiches Login validiert erneut, löscht den Wert und verwendet ihn nur einmal', async () => {
  await withAdminCredentials(async () => {
    const req = {
      body: { username: 'redaktion', password: 'richtiges-passwort' },
      session: { contentAgentReturnTo: '/admin/content-agent/drafts/42/edit?queued=1' }
    };

    const firstResponse = redirectResponse();
    await login(req, firstResponse);
    assert.deepEqual(firstResponse.redirects, ['/admin/content-agent/drafts/42/edit?queued=1']);
    assert.equal(Object.hasOwn(req.session, 'contentAgentReturnTo'), false);

    const secondResponse = redirectResponse();
    await login(req, secondResponse);
    assert.deepEqual(secondResponse.redirects, ['/admin']);
  });
});

test('erfolgreiches Login verwirft und löscht ein manipuliertes Sessionziel', async () => {
  await withAdminCredentials(async () => {
    const req = {
      body: { username: 'redaktion', password: 'richtiges-passwort' },
      session: { contentAgentReturnTo: '/admin/content-agent/%252e%252e/logout' }
    };
    const res = redirectResponse();

    await login(req, res);

    assert.deepEqual(res.redirects, ['/admin']);
    assert.equal(Object.hasOwn(req.session, 'contentAgentReturnTo'), false);
  });
});
