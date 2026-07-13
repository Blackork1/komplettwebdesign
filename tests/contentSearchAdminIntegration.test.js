import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { renderFile } from 'ejs';

import { createAdminContentAgentController } from '../controllers/adminContentAgentController.js';
import { createContentAgentAdminRepository } from '../repositories/contentAgentAdminRepository.js';
import * as presentation from '../services/contentAgent/adminPresentationService.js';

const routesUrl = new URL('../routes/adminContentAgentRoutes.js', import.meta.url);
const viewUrl = new URL('../views/admin/contentAgent/searchConsole.ejs', import.meta.url);

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
    redirect(url) { this.redirectedTo = url; return this; },
    render(view, locals) { this.rendered = { view, locals }; return this; }
  };
}

function controllerDependencies(overrides = {}) {
  return {
    adminRepository: {},
    settingsRepository: {},
    jobRepository: {},
    runtimeConfig: {
      enabled: true,
      maxAttempts: 3,
      monthlyCostLimitEur: 25,
      searchConsoleConfigured: true,
      searchConsoleSiteUrl: 'sc-domain:komplettwebdesign.de',
      googleCredentialsPath: '/run/secrets/google-search-console.json'
    },
    presentation: {},
    ...overrides
  };
}

test('Search-Console-Routen verlangen Admin und der Schreibweg zusätzlich CSRF', async () => {
  const routes = await readFile(routesUrl, 'utf8');

  assert.match(
    routes,
    /router\.get\('\/admin\/content-agent\/search-console',\s*isAdmin,\s*controller\.searchConsolePage\)/
  );
  assert.match(
    routes,
    /router\.post\('\/admin\/content-agent\/search-console\/sync',\s*isAdmin,\s*verifyCsrfToken,\s*controller\.syncSearchConsoleAction\)/
  );
});

test('Adminrepository lädt höchstens 100 aggregierte Queryzeilen, 100 Chancen und den GSC-Status parametrisiert', async () => {
  const calls = [];
  const db = {
    async query(sql, params = []) {
      const normalized = normalizeSql(sql);
      calls.push({ sql: normalized, params });
      if (/FROM content_search_metrics/i.test(normalized)) {
        return { rows: [{ query: 'webdesign berlin', page_url: '/blog/webdesign', clicks: '12', impressions: '800', ctr: '0.015', average_position: '8.4' }] };
      }
      if (/FROM content_opportunities/i.test(normalized)) {
        return { rows: [{ id: 4, opportunity_type: 'meta_refresh', primary_query: 'webdesign berlin', score: '8.75' }] };
      }
      if (/FROM content_provider_state/i.test(normalized)) {
        return { rows: [{ provider_name: 'google_search_console', last_success_at: '2026-07-13T06:00:00.000Z' }] };
      }
      return { rows: [] };
    }
  };
  const repository = createContentAgentAdminRepository(db);

  const result = await repository.getSearchConsoleInsights();

  assert.equal(result.metrics.length, 1);
  assert.equal(result.opportunities.length, 1);
  assert.equal(result.provider.provider_name, 'google_search_console');
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(({ params }) => params), [
    [100],
    [100],
    ['google_search_console']
  ]);
  assert.match(calls[0].sql, /GROUP BY page_url, query[\s\S]*LIMIT \$1/i);
  assert.match(calls[1].sql, /WHERE status = 'open'[\s\S]*LIMIT \$1/i);
  assert.match(calls[2].sql, /WHERE provider_name = \$1[\s\S]*LIMIT 1/i);
  const sql = calls.map(({ sql: statement }) => statement).join(' ');
  assert.doesNotMatch(sql, /\bSELECT\s+\*|evidence_json|recommendation_json|payload_json|credentials/i);
});

test('Präsentation formatiert Kennzahlen deutsch und verwirft Rohfelder sowie JSON-Inhalte', () => {
  assert.equal(typeof presentation.buildSearchConsolePresentation, 'function');

  const result = presentation.buildSearchConsolePresentation({
    metrics: [{
      query: '<script>query</script>',
      page_url: 'https://komplettwebdesign.de/blog/webdesign-berlin?intern=1',
      clicks: '1234',
      impressions: '98765',
      ctr: '0.01234',
      average_position: '8.45',
      payload_json: { token: 'geheim' }
    }],
    opportunities: [{
      id: 17,
      opportunity_type: 'meta_refresh',
      primary_query: '<img src=x onerror=alert(1)>',
      score: '8.75',
      evidence_json: { intern: 'nicht ausgeben' },
      recommendation_json: { action: '<script>roh</script>' },
      analysis_key: 'geheimer-schlüssel'
    }],
    provider: {
      provider_name: 'google_search_console',
      last_success_at: '2026-07-13T06:00:00.000Z',
      last_failure_at: null,
      last_error_code: null,
      internal_secret: 'provider-geheim'
    }
  });

  assert.deepEqual(result.metrics[0], {
    query: '<script>query</script>',
    page: '/blog/webdesign-berlin',
    clicks: '1.234',
    impressions: '98.765',
    ctr: '1,23 %',
    position: '8,5'
  });
  assert.deepEqual(result.opportunities[0], {
    id: 17,
    query: '<img src=x onerror=alert(1)>',
    type: 'Meta-Daten prüfen',
    recommendation: 'Seitentitel und Meta-Beschreibung redaktionell prüfen.',
    score: '8,75'
  });
  assert.deepEqual(result.summary, {
    queryCount: 1,
    clicks: '1.234',
    impressions: '98.765',
    ctr: '1,25 %',
    opportunityCount: 1
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /payload_json|evidence_json|recommendation_json|analysis_key|geheimer-schlüssel|provider-geheim|nicht ausgeben|<script>roh<\/script>/i);
});

test('Controller gibt der View nur sichere Konfiguration, Property, Präsentation und Statusflags', async () => {
  const raw = { metrics: [{ payload_json: { secret: true } }], opportunities: [], provider: null };
  const presented = { summary: { queryCount: 0 }, metrics: [], opportunities: [], provider: null };
  const controller = createAdminContentAgentController(controllerDependencies({
    adminRepository: {
      async getSearchConsoleInsights() { return raw; }
    },
    settingsRepository: {
      async getSettings() { return { agent_enabled: true, timezone: 'Europe/Berlin', internal: 'geheim' }; }
    },
    presentation: {
      buildSearchConsolePresentation(input) {
        assert.equal(input, raw);
        return presented;
      }
    }
  }));
  const res = response();

  await controller.searchConsolePage({ query: { sync: 'queued' } }, res, assert.fail);

  assert.equal(res.rendered.view, 'admin/contentAgent/searchConsole');
  assert.deepEqual(res.rendered.locals, {
    searchConsoleConfigured: true,
    searchConsoleProperty: 'komplettwebdesign.de',
    searchConsole: presented,
    agentEnabled: true,
    syncQueued: true
  });
  assert.doesNotMatch(
    JSON.stringify(res.rendered.locals),
    /google-search-console\.json|googleCredentialsPath|searchConsoleSiteUrl|payload_json|internal/i
  );
});

test('manueller Sync verwendet lokales 28-Tage-Fenster, Tages-Deduplizierung und das Versuchshardcap', async () => {
  const jobs = [];
  const controller = createAdminContentAgentController(controllerDependencies({
    now: () => new Date('2026-07-13T22:30:00.000Z'),
    settingsRepository: {
      async getSettings() {
        return { agent_enabled: true, maximum_attempts: 5, timezone: 'Europe/Berlin' };
      }
    },
    jobRepository: {
      async enqueueJob(input) { jobs.push(input); return { id: 41 }; }
    }
  }));
  const res = response();

  await controller.syncSearchConsoleAction({}, res, assert.fail);

  assert.deepEqual(jobs, [{
    jobType: 'sync_search_console',
    idempotencyKey: 'gsc-manual-sync:2026-07-14',
    payload: {
      startDate: '2026-06-16',
      endDate: '2026-07-13'
    },
    maxAttempts: 3
  }]);
  assert.equal(res.redirectedTo, '/admin/content-agent/search-console?sync=queued');
});

test('fehlende GSC-Konfiguration und ein pausierter Agent verhindern den manuellen Sync', async () => {
  for (const scenario of [
    { searchConsoleConfigured: false, enabled: true, agentEnabled: true },
    { searchConsoleConfigured: true, enabled: false, agentEnabled: true },
    { searchConsoleConfigured: true, enabled: true, agentEnabled: false }
  ]) {
    let enqueueCalls = 0;
    const controller = createAdminContentAgentController(controllerDependencies({
      runtimeConfig: {
        enabled: scenario.enabled,
        maxAttempts: 3,
        searchConsoleConfigured: scenario.searchConsoleConfigured
      },
      settingsRepository: {
        async getSettings() {
          return { agent_enabled: scenario.agentEnabled, maximum_attempts: 3, timezone: 'Europe/Berlin' };
        }
      },
      jobRepository: {
        async enqueueJob() { enqueueCalls += 1; return { id: 41 }; }
      }
    }));
    const res = response();

    await controller.syncSearchConsoleAction({}, res, assert.fail);

    assert.equal(enqueueCalls, 0);
    assert.equal(res.statusCode, 409);
  }
});

test('Null-Enqueue ist ein fachlicher Konflikt und erzeugt keine Erfolgsmeldung', async () => {
  const controller = createAdminContentAgentController(controllerDependencies({
    settingsRepository: {
      async getSettings() {
        return { agent_enabled: true, maximum_attempts: 3, timezone: 'Europe/Berlin' };
      }
    },
    jobRepository: {
      async enqueueJob() { return null; }
    }
  }));
  const res = response();

  await controller.syncSearchConsoleAction({}, res, assert.fail);

  assert.equal(res.statusCode, 409);
  assert.match(res.body, /nicht eingeplant/i);
  assert.equal(res.redirectedTo, undefined);
});

test('Search-Console-View zeigt zwei responsive Tabellen, escaped dynamische Texte und bietet keine Inhaltsaktion', async () => {
  const source = await readFile(viewUrl, 'utf8');
  const html = await renderFile(fileURLToPath(viewUrl), {
    title: 'Search Console',
    currentPathname: '/admin/content-agent/search-console',
    csrfToken: '<csrf-token>',
    cssAsset: (value) => `/assets/${value}`,
    jsAsset: (value) => `/assets/${value}`,
    searchConsoleConfigured: true,
    searchConsoleProperty: 'komplettwebdesign.de<script>property</script>',
    agentEnabled: true,
    syncQueued: true,
    searchConsole: {
      summary: {
        queryCount: 1,
        clicks: '1.234',
        impressions: '98.765',
        ctr: '1,25 %',
        opportunityCount: 1
      },
      metrics: [{
        query: '<script>query</script>',
        page: '/blog/<img src=x onerror=alert(1)>',
        clicks: '1.234',
        impressions: '98.765',
        ctr: '1,23 %',
        position: '8,5'
      }],
      opportunities: [{
        id: 17,
        query: '<script>chance</script>',
        type: 'Meta-Daten prüfen',
        recommendation: '<img src=x onerror=alert(1)>',
        score: '8,75'
      }],
      provider: {
        healthy: true,
        statusLabel: '<script>provider</script>',
        lastSuccessAtLabel: '13.07.2026, 08:00 Uhr (MESZ)',
        lastErrorCode: null
      }
    }
  });

  assert.equal((html.match(/class="table-responsive"/g) || []).length, 2);
  for (const label of ['Query', 'Klicks', 'Impressionen', 'CTR', 'Position', 'Empfehlung']) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.match(html, /method="post" action="\/admin\/content-agent\/search-console\/sync"/);
  assert.match(html, /name="_csrf" value="&lt;csrf-token&gt;"/);
  assert.match(html, /Search Console jetzt synchronisieren/);
  assert.match(html, /Nur Auswertung|keine Inhaltsänderung/i);
  assert.match(html, /&lt;script&gt;query&lt;\/script&gt;/);
  assert.match(html, /&lt;script&gt;chance&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /komplettwebdesign\.de&lt;script&gt;property&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>(?:query|chance|provider|property)<\/script>|<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(source, /escapeHtml|recommendation_json|evidence_json|analysis_key|credentials|googleCredentialsPath|searchConsoleSiteUrl/i);
  assert.doesNotMatch(source, /action="[^"]*(?:apply|publish|draft|revision)[^"]*"/i);
  const unescapedOutput = source.split('\n').filter((line) => /<%-/.test(line));
  assert.equal(unescapedOutput.every((line) => /<%-\s*include\(/.test(line)), true);
  assert.doesNotMatch(source, /<script(?!\s+src=)[^>]*>/i);
});
