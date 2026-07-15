import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSearchConsoleClient,
  SEARCH_CONSOLE_REQUEST_TIMEOUT_MS
} from '../services/contentAgent/searchConsoleClient.js';
import {
  buildTechnicalConfigPresentation,
  getContentAgentTechnicalConfig
} from '../services/contentAgent/config.js';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

test('Search-Console-Abfragen verwenden ausschließlich den Readonly-Scope und kodieren die Property', async () => {
  const body = {
    startDate: '2026-07-01',
    endDate: '2026-07-07',
    dimensions: ['query'],
    rowLimit: 25
  };
  const expectedResponse = { rows: [{ keys: ['webdesign berlin'], clicks: 4 }] };
  const calls = [];

  const client = createSearchConsoleClient({
    siteUrl: 'sc-domain:komplettwebdesign.de',
    credentialsPath: '/run/secrets/google-search-console.json',
    authFactory(options) {
      calls.push({ type: 'authFactory', options });
      return {
        async getClient() {
          calls.push({ type: 'getClient' });
          return {
            async request(options) {
              calls.push({ type: 'request', options });
              return { data: expectedResponse };
            }
          };
        }
      };
    }
  });

  assert.equal(client.isConfigured(), true);
  assert.deepEqual(await client.querySearchAnalytics(body), expectedResponse);
  assert.deepEqual(calls.slice(0, 2), [
    {
      type: 'authFactory',
      options: {
        keyFile: '/run/secrets/google-search-console.json',
        scopes: [READONLY_SCOPE]
      }
    },
    { type: 'getClient' }
  ]);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].type, 'request');
  assert.deepEqual(
    { ...calls[2].options, signal: undefined },
    {
      url: 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Akomplettwebdesign.de/searchAnalytics/query',
      method: 'POST',
      data: body,
      timeout: SEARCH_CONSOLE_REQUEST_TIMEOUT_MS,
      signal: undefined
    }
  );
  assert.equal(calls[2].options.signal instanceof AbortSignal, true);
  assert.equal(Number.isFinite(SEARCH_CONSOLE_REQUEST_TIMEOUT_MS), true);
  assert.equal(SEARCH_CONSOLE_REQUEST_TIMEOUT_MS > 0, true);
});

test('unvollständige Konfiguration verhindert Authentifizierung, Dateizugriff und Netzwerkaufrufe', async () => {
  for (const incompleteOptions of [
    { siteUrl: '', credentialsPath: '/nicht/lesen/credentials.json' },
    { siteUrl: 'sc-domain:komplettwebdesign.de', credentialsPath: '' }
  ]) {
    let authFactoryCalls = 0;
    let getClientCalls = 0;
    let requestCalls = 0;
    const client = createSearchConsoleClient({
      ...incompleteOptions,
      authFactory() {
        authFactoryCalls += 1;
        return {
          async getClient() {
            getClientCalls += 1;
            return {
              async request() {
                requestCalls += 1;
                return { data: {} };
              }
            };
          }
        };
      }
    });

    assert.equal(client.isConfigured(), false);
    await assert.rejects(
      () => client.querySearchAnalytics({}),
      /Search Console ist nicht konfiguriert\./
    );
    assert.equal(authFactoryCalls, 0);
    assert.equal(getClientCalls, 0);
    assert.equal(requestCalls, 0);
  }
});

test('Search-Console-Konfiguration bleibt in der Technikpräsentation auf den Status begrenzt', () => {
  const credentialsPath = '/run/secrets/google-search-console.json';
  const config = getContentAgentTechnicalConfig({
    SEARCH_CONSOLE_SITE_URL: 'sc-domain:komplettwebdesign.de',
    GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
    CONTENT_AGENT_GSC_SCHEDULE: '30 5 * * 1'
  });

  assert.equal(config.searchConsoleSiteUrl, 'sc-domain:komplettwebdesign.de');
  assert.equal(config.googleCredentialsPath, credentialsPath);
  assert.equal(config.searchConsoleSchedule, '30 5 * * 1');
  assert.equal(config.searchConsoleConfigured, true);
  assert.equal(getContentAgentTechnicalConfig({
    SEARCH_CONSOLE_SITE_URL: 'sc-domain:komplettwebdesign.de'
  }).searchConsoleConfigured, false);
  assert.equal(getContentAgentTechnicalConfig({
    GOOGLE_APPLICATION_CREDENTIALS: credentialsPath
  }).searchConsoleConfigured, false);

  const presentation = buildTechnicalConfigPresentation({ technicalConfig: config });
  assert.deepEqual(Object.keys(presentation).filter((key) => /searchConsole|googleCredentials/i.test(key)), [
    'searchConsoleConfigured'
  ]);
  assert.equal(presentation.searchConsoleConfigured.value, true);
  const serialized = JSON.stringify(presentation);
  assert.doesNotMatch(serialized, /google-search-console\.json|googleCredentialsPath|searchConsoleSiteUrl|searchConsoleSchedule/i);
});

test('technische Standardkonfiguration synchronisiert GSC täglich um 05:30 Uhr', () => {
  const config = getContentAgentTechnicalConfig({});

  assert.equal(config.searchConsoleSchedule, '30 5 * * *');
  assert.equal(config.timezone, 'Europe/Berlin');
});
