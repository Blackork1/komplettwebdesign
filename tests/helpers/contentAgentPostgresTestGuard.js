import { randomUUID } from 'node:crypto';

export const CONTENT_AGENT_PG_TEST_DATABASE_NAME = 'kwd_content_agent_integration_test';
export const CONTENT_AGENT_PG_TEST_RESET_TOKEN = 'KWDCONTENTAGENT_TEST_RESET_V1';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const TEMPORARY_CONTAINER_PATTERN = /^kwd-content-agent-pg-test-[a-z0-9-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(databaseName, reason) {
  return { allowed: false, databaseName, reason };
}

export function createContentAgentPgTestSchemaName(uuid = randomUUID()) {
  if (typeof uuid !== 'string' || !UUID_PATTERN.test(uuid)) {
    throw new TypeError('Der Schemaname muss aus einer gültigen UUID erzeugt werden.');
  }
  return `kwd_ca_it_${uuid.replaceAll('-', '').toLowerCase()}`;
}

export function evaluateContentAgentPgResetGuard({
  connectionString,
  allowReset = false,
  resetToken = ''
} = {}) {
  if (typeof connectionString !== 'string' || !connectionString.trim()) {
    return invalid('', 'Keine gültige PostgreSQL-Testdatenbank konfiguriert.');
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    return invalid('', 'Keine gültige PostgreSQL-Verbindungsadresse konfiguriert.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    return invalid('', 'Die Verbindungsadresse muss PostgreSQL verwenden.');
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, '')).trim();
  if (allowReset !== true) {
    return invalid(databaseName, 'Die PostgreSQL-Testfreigabe wurde nicht ausdrücklich erteilt.');
  }
  if (resetToken !== CONTENT_AGENT_PG_TEST_RESET_TOKEN) {
    return invalid(databaseName, 'Das PostgreSQL-Test-Token ist ungültig.');
  }
  if (databaseName !== CONTENT_AGENT_PG_TEST_DATABASE_NAME) {
    return invalid(databaseName, 'Der exakte Name der PostgreSQL-Testdatenbank fehlt.');
  }
  if (url.search) {
    return invalid(databaseName, 'Verbindungsoptionen sind für den PostgreSQL-Test nicht erlaubt.');
  }

  const host = url.hostname;
  if (!LOOPBACK_HOSTS.has(host) && !TEMPORARY_CONTAINER_PATTERN.test(host)) {
    return invalid(databaseName, 'Der PostgreSQL-Testhost ist nicht freigegeben.');
  }

  return { allowed: true, databaseName, reason: '' };
}
