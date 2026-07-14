import assert from 'node:assert/strict';
import test from 'node:test';

import {
  providerFailureIsSafeToRetry,
  providerRequestWasRejectedBeforeExecution
} from '../services/contentAgent/providerRetryPolicy.js';

test('Provider-Retry ist nur bei expliziter Freigabe oder eindeutiger Schemaablehnung sicher', () => {
  const internalSchemaRejection = Object.assign(new Error('Lokaler Schema-Preflight'), {
    code: 'CONTENT_OPENAI_SCHEMA_INCOMPATIBLE',
    providerRequestStarted: false
  });
  const providerSchemaRejection = Object.assign(new Error('Provider lehnt Schema ab'), {
    code: 'invalid_json_schema',
    status: 400,
    providerRequestStarted: true
  });

  assert.equal(providerFailureIsSafeToRetry({ safeToRetry: true }), true);
  assert.equal(providerFailureIsSafeToRetry(internalSchemaRejection), true);
  assert.equal(providerFailureIsSafeToRetry(providerSchemaRejection), true);
  assert.equal(providerRequestWasRejectedBeforeExecution(internalSchemaRejection), true);
  assert.equal(providerRequestWasRejectedBeforeExecution(providerSchemaRejection), true);
});

test('nackte 429- und andere Preflight- oder Statusfehler bleiben fail-closed', () => {
  for (const error of [
    { status: 429 },
    { statusCode: 429, providerRequestStarted: false },
    { code: 'AUTH_CONFIGURATION_INVALID', providerRequestStarted: false },
    { code: 'invalid_json_schema', status: 422 },
    { code: 'invalid_json_schema', status: 500 },
    { status: 400 },
    { status: 503 }
  ]) {
    assert.equal(providerFailureIsSafeToRetry(error), false);
    assert.equal(providerRequestWasRejectedBeforeExecution(error), false);
  }
});
