import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CONTENT_AGENT_PG_TEST_DATABASE_NAME,
  CONTENT_AGENT_PG_TEST_RESET_TOKEN,
  createContentAgentPgTestSchemaName,
  evaluateContentAgentPgResetGuard
} from './helpers/contentAgentPostgresTestGuard.js';

const integrationSource = readFileSync(
  new URL('./contentAgentPostgresIntegration.test.js', import.meta.url),
  'utf8'
);

function allowedInput(overrides = {}) {
  return {
    connectionString: `postgresql://kwd_test@127.0.0.1:5432/${CONTENT_AGENT_PG_TEST_DATABASE_NAME}`,
    allowReset: true,
    resetToken: CONTENT_AGENT_PG_TEST_RESET_TOKEN,
    ...overrides
  };
}

test('PostgreSQL-Opt-in verlangt exakten Datenbanknamen, lokalen Testhost und exaktes Token', () => {
  for (const input of [
    {},
    allowedInput({ allowReset: false }),
    allowedInput({ resetToken: '' }),
    allowedInput({ resetToken: `${CONTENT_AGENT_PG_TEST_RESET_TOKEN}-falsch` }),
    allowedInput({ connectionString: 'postgresql://kwd_test@127.0.0.1/production' }),
    allowedInput({ connectionString: `postgresql://kwd_test@db.example.com/${CONTENT_AGENT_PG_TEST_DATABASE_NAME}` }),
    allowedInput({ connectionString: `postgresql://kwd_test@127.0.0.1/${CONTENT_AGENT_PG_TEST_DATABASE_NAME}?options=-csearch_path%3Dpublic` }),
    allowedInput({ connectionString: 'keine-url' })
  ]) {
    const guard = evaluateContentAgentPgResetGuard(input);
    assert.equal(guard.allowed, false, JSON.stringify(input));
    assert.match(guard.reason, /PostgreSQL|Freigabe|Token|Datenbank|Host|Option/i);
  }
});

test('nur Loopback oder der streng benannte temporäre Container werden freigegeben', () => {
  for (const host of ['127.0.0.1', 'localhost', '[::1]', 'kwd-content-agent-pg-test-20260712']) {
    const guard = evaluateContentAgentPgResetGuard(allowedInput({
      connectionString: `postgresql://kwd_test@${host}/${CONTENT_AGENT_PG_TEST_DATABASE_NAME}`
    }));
    assert.equal(guard.allowed, true, host);
    assert.equal(guard.databaseName, CONTENT_AGENT_PG_TEST_DATABASE_NAME);
  }
});

test('isolierte Schemanamen werden ausschließlich intern aus UUIDs erzeugt', () => {
  const first = createContentAgentPgTestSchemaName('11111111-2222-4333-8444-555555555555');
  const second = createContentAgentPgTestSchemaName('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  assert.match(first, /^kwd_ca_it_[a-f0-9]{32}$/);
  assert.notEqual(first, second);
  assert.throws(() => createContentAgentPgTestSchemaName('public'));
});

test('PostgreSQL-Harness löscht niemals Tabellen im allgemeinen Schema und räumt sein Zufallsschema auf', () => {
  assert.doesNotMatch(integrationSource, /DROP TABLE/i);
  assert.match(integrationSource, /CREATE SCHEMA/);
  assert.match(integrationSource, /search_path/);
  assert.match(integrationSource, /DROP SCHEMA/);
  assert.match(integrationSource, /to_regnamespace/);
  assert.match(
    integrationSource,
    /try \{\s*if \(pool\) await pool\.end\(\);\s*\} finally \{\s*try \{\s*if \(schemaCreated\)/,
    'Schema-Cleanup muss auch dann laufen, wenn das Schließen des Testpools fehlschlägt'
  );
  assert.match(integrationSource, /CONTENT_AGENT_PG_TEST_TOKEN/);
  assert.doesNotMatch(integrationSource, /CONTENT_AGENT_PG_TEST_DATABASE_MARKER/);
});
