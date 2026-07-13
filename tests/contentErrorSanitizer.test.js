import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeErrorReport } from '../repositories/contentErrorSanitizer.js';

test('Fehlerbericht übernimmt nur bereinigte Providerdiagnosefelder', () => {
  const report = sanitizeErrorReport({
    code: 'provider_execution_uncertain',
    message: 'Manuelle Prüfung erforderlich.',
    providerDiagnostic: {
      provider: 'openai',
      stage: 'seo_brief',
      errorName: 'BadRequestError',
      code: 'invalid_json_schema',
      httpStatus: 400,
      requestId: 'req_123',
      responseId: 'resp_123',
      prompt: 'vertraulich',
      authorization: 'Bearer sk-vertraulich'
    }
  });

  assert.deepEqual(report.providerDiagnostic, {
    provider: 'openai',
    stage: 'seo_brief',
    errorName: 'BadRequestError',
    code: 'invalid_json_schema',
    requestId: 'req_123',
    responseId: 'resp_123',
    httpStatus: 400
  });
  assert.doesNotMatch(JSON.stringify(report), /vertraulich|authorization|prompt/i);
});

test('Fehlerbericht verwirft ungültige Providerdiagnosen vollständig', () => {
  for (const providerDiagnostic of [null, [], 'openai']) {
    const report = sanitizeErrorReport({
      code: 'provider_execution_uncertain',
      providerDiagnostic
    });
    assert.equal(Object.hasOwn(report, 'providerDiagnostic'), false);
  }
});
