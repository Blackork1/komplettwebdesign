import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateContentAgentPgResetGuard } from './helpers/contentAgentPostgresTestGuard.js';

test('destruktiver PostgreSQL-Test verlangt Freigabe und eindeutigen Testmarker im Datenbanknamen', () => {
  for (const input of [
    {},
    { connectionString: 'postgresql://localhost/app_test', allowReset: false },
    { connectionString: 'postgresql://localhost/production', allowReset: true },
    { connectionString: 'postgresql://localhost/contest', allowReset: true },
    { connectionString: 'postgresql://localhost/app_test/production', allowReset: true },
    { connectionString: 'keine-url', allowReset: true }
  ]) {
    const guard = evaluateContentAgentPgResetGuard(input);
    assert.equal(guard.allowed, false, JSON.stringify(input));
    assert.match(guard.reason, /PostgreSQL|Reset|Testmarker|Datenbank/i);
  }
});

test('Standardmarker erlaubt nur test oder testing als abgegrenzten Namensteil', () => {
  for (const databaseName of ['app_test', 'testing-app', 'app-testing-ci', 'test']) {
    const guard = evaluateContentAgentPgResetGuard({
      connectionString: `postgresql://localhost/${databaseName}`,
      allowReset: true
    });
    assert.equal(guard.allowed, true, databaseName);
    assert.equal(guard.databaseName, databaseName);
  }
});

test('expliziter Marker muss im tatsächlichen Datenbanknamen vorkommen', () => {
  const allowed = evaluateContentAgentPgResetGuard({
    connectionString: 'postgresql://localhost/content_ci42',
    allowReset: true,
    explicitMarker: 'ci42'
  });
  const blocked = evaluateContentAgentPgResetGuard({
    connectionString: 'postgresql://localhost/production',
    allowReset: true,
    explicitMarker: 'ci42'
  });

  assert.equal(allowed.allowed, true);
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /ci42|Testmarker/i);
});
