import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COOKAVOLI_API_BASE_URL,
  createCookavoliAccountDeletionGateway
} from '../services/cookavoliAccountDeletionGateway.js';

test('verwendet ausschließlich den neuen Cookavoli-API-Origin', async () => {
  const calls = [];
  const gateway = createCookavoliAccountDeletionGateway({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ accepted: true }), {
        status: 202,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  const result = await gateway.start({
    email: ' person@example.com ',
    website: ''
  });

  assert.equal(COOKAVOLI_API_BASE_URL, 'https://api.cookavoli.com');
  assert.deepEqual(result, { status: 202, body: { accepted: true } });
  assert.equal(
    calls[0].url,
    'https://api.cookavoli.com/v1/public/account-deletion-requests'
  );
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    email: 'person@example.com',
    website: ''
  });
  assert.equal(calls[0].options.redirect, 'error');
});

test('weist unsichere oder abweichende API-Basis-URLs fail-closed zurück', () => {
  for (const apiBaseUrl of [
    'http://api.cookavoli.com',
    'https://example.com',
    'https://api.cookavoli.com/path',
    'https://user:secret@api.cookavoli.com'
  ]) {
    assert.throws(
      () => createCookavoliAccountDeletionGateway({ apiBaseUrl }),
      /invalid_cookavoli_api_base_url/,
      apiBaseUrl
    );
  }
});

test('gibt ausschließlich freigegebene Upstream-Antworten weiter', async () => {
  const gateway = createCookavoliAccountDeletionGateway({
    fetchImpl: async () => new Response(JSON.stringify({
      error: 'internal_database_details'
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    })
  });

  await assert.rejects(
    () => gateway.start({ email: 'test@example.com', website: '' }),
    (error) => error?.code === 'swipeandcook_deletion_service_unavailable'
      && error?.status === 503
  );
});
