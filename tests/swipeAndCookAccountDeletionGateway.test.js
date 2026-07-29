import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

import {
  createSwipeAndCookAccountDeletionGateway
} from '../services/swipeAndCookAccountDeletionGateway.js';
import {
  createSwipeAndCookAccountDeletionRouter
} from '../routes/swipeAndCookAccountDeletionRoutes.js';

const apiBaseUrl = 'https://api.swipeandcook.komplettwebdesign.de';

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      return body;
    }
  };
}

test('leitet eine Löschanforderung nur mit E-Mail und Botfalle an den festen S2-Endpunkt weiter', async () => {
  const calls = [];
  const gateway = createSwipeAndCookAccountDeletionGateway({
    apiBaseUrl,
    fetchImpl: async (...args) => {
      calls.push(args);
      return response(202, { accepted: true });
    }
  });

  assert.deepEqual(await gateway.start({
    email: ' konto@example.com ',
    website: ''
  }), {
    status: 202,
    body: { accepted: true }
  });
  assert.equal(
    calls[0][0],
    `${apiBaseUrl}/v1/public/account-deletion-requests`
  );
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    email: 'konto@example.com',
    website: ''
  });
  assert.doesNotMatch(
    calls[0][1].body,
    /password|token|store|supportId/i
  );
});

test('leitet die Verifizierung exakt nach dem Patch-111-Vertrag weiter', async () => {
  const calls = [];
  const gateway = createSwipeAndCookAccountDeletionGateway({
    apiBaseUrl,
    fetchImpl: async (...args) => {
      calls.push(args);
      return response(202, { accepted: true });
    }
  });
  const payload = {
    externalRequestId: '10000000-0000-4000-8000-000000000001',
    email: 'konto@example.com',
    token: 'a'.repeat(43),
    mode: 'immediate',
    confirmPaidAccessLoss: true
  };

  assert.deepEqual(await gateway.verify(payload), {
    status: 202,
    body: { accepted: true }
  });
  assert.equal(
    calls[0][0],
    `${apiBaseUrl}/v1/public/account-deletion-verifications`
  );
  assert.deepEqual(JSON.parse(calls[0][1].body), payload);
});

test('blockiert ungültige oder zusätzliche Browserfelder vor dem Backendaufruf', async () => {
  let calls = 0;
  const gateway = createSwipeAndCookAccountDeletionGateway({
    apiBaseUrl,
    fetchImpl: async () => {
      calls += 1;
      return response(202, { accepted: true });
    }
  });

  await assert.rejects(
    gateway.start({
      email: 'konto@example.com',
      website: '',
      password: 'niemals'
    }),
    (error) => error.status === 400
  );
  await assert.rejects(
    gateway.verify({
      externalRequestId: 'ungültig',
      email: 'konto@example.com',
      token: 'zu-kurz',
      mode: 'immediate',
      confirmPaidAccessLoss: false
    }),
    (error) => error.status === 400
  );
  assert.equal(calls, 0);
});

test('gibt nur erlaubte neutrale Upstreamantworten weiter und kapselt technische Fehler', async () => {
  const invalid = createSwipeAndCookAccountDeletionGateway({
    apiBaseUrl,
    fetchImpl: async () => response(400, {
      error: 'invalid_or_expired_deletion_verification',
      internal: 'darf-nicht-weiter'
    })
  });
  assert.deepEqual(await invalid.verify({
    externalRequestId: '10000000-0000-4000-8000-000000000001',
    email: 'konto@example.com',
    token: 'a'.repeat(43),
    mode: 'immediate',
    confirmPaidAccessLoss: true
  }), {
    status: 400,
    body: { error: 'invalid_or_expired_deletion_verification' }
  });

  const unavailable = createSwipeAndCookAccountDeletionGateway({
    apiBaseUrl,
    fetchImpl: async () => {
      throw new Error('interne Netzwerkadresse darf nicht erscheinen');
    }
  });
  await assert.rejects(
    unavailable.start({ email: 'konto@example.com', website: '' }),
    (error) => (
      error.status === 503
      && error.code === 'swipeandcook_deletion_service_unavailable'
      && !String(error.message).includes('Netzwerkadresse')
    )
  );
});

test('Express-Router schützt beide POSTs mit CSRF und antwortet ausschließlich als JSON', async () => {
  const calls = [];
  const router = createSwipeAndCookAccountDeletionRouter({
    gateway: {
      async start(body) {
        calls.push(['start', body]);
        return { status: 202, body: { accepted: true } };
      },
      async verify(body) {
        calls.push(['verify', body]);
        return {
          status: 400,
          body: { error: 'invalid_or_expired_deletion_verification' }
        };
      }
    },
    csrfMiddleware(req, res, next) {
      if (req.get('x-csrf-token') !== 'csrf-test') {
        res.status(403).json({ error: 'request_not_allowed' });
        return;
      }
      next();
    }
  });
  const app = express();
  app.use(express.json());
  app.use(router);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const origin = `http://127.0.0.1:${port}`;

    const blocked = await fetch(
      `${origin}/api/swipeandcook/account-deletion-requests`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'konto@example.com', website: '' })
      }
    );
    assert.equal(blocked.status, 403);

    const accepted = await fetch(
      `${origin}/api/swipeandcook/account-deletion-requests`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-test'
        },
        body: JSON.stringify({ email: 'konto@example.com', website: '' })
      }
    );
    assert.equal(accepted.status, 202);
    assert.match(accepted.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await accepted.json(), { accepted: true });
    assert.deepEqual(calls, [[
      'start',
      { email: 'konto@example.com', website: '' }
    ]]);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});
