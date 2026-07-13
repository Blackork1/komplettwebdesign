import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFile } from 'ejs';
import { fileURLToPath } from 'node:url';

const viewCases = [
  {
    name: 'Übersicht',
    file: '../views/admin/contentAgent/overview.ejs',
    locals: {
      dashboard: {
        modeLabel: 'Review',
        worker: { label: 'Worker aktiv', healthy: true },
        budget: { usedEur: 1.25, limitEur: 25 },
        approvals: { current: 2, required: 8, ready: false },
        drafts: [],
        jobs: []
      }
    }
  },
  {
    name: 'Entwürfe',
    file: '../views/admin/contentAgent/drafts.ejs',
    locals: { drafts: [{ id: 4, title: 'Sicherer Entwurf', workflowStatus: 'needs_review' }] }
  },
  {
    name: 'Bestehende Inhalte',
    file: '../views/admin/contentAgent/existingContent.ejs',
    locals: { existingContent: [{ id: 5, title: 'Bestehender Artikel', slug: 'bestehend' }] }
  },
  {
    name: 'Zeitplan',
    file: '../views/admin/contentAgent/schedule.ejs',
    locals: {
      settings: {
        agent_enabled: true,
        operating_mode: 'review',
        schedule_weekdays: [1, 4],
        schedule_time: '18:00:00',
        timezone: 'Europe/Berlin',
        monthly_budget_cents: 2500,
        auto_publish_min_score: 90,
        maximum_attempts: 3
      }
    }
  },
  {
    name: 'Jobs',
    file: '../views/admin/contentAgent/jobs.ejs',
    locals: { jobs: [{ id: 6, jobType: 'generate_manual_draft', statusLabel: 'Eingeplant' }] }
  },
  {
    name: 'Search Console',
    file: '../views/admin/contentAgent/searchConsole.ejs',
    locals: {
      searchConsoleConfigured: true,
      searchConsoleProperty: 'komplettwebdesign.de',
      agentEnabled: true,
      technicalAgentEnabled: true,
      syncQueued: false,
      searchConsole: {
        summary: {},
        metrics: [],
        opportunities: [],
        provider: { healthy: true, statusLabel: 'Letzter Aufruf erfolgreich' }
      }
    }
  },
  {
    name: 'Technik',
    file: '../views/admin/contentAgent/technology.ejs',
    locals: {
      technology: {
        technical: {
          contentModel: { value: 'test-model', source: '.env', editable: false, restartRequired: true }
        },
        versions: {},
        worker: { label: 'Worker aktiv', healthy: true },
        providers: []
      }
    }
  }
];

test('alle sieben Content-Agent-Navigationsseiten rendern im vorhandenen Adminlayout', async () => {
  for (const viewCase of viewCases) {
    const html = await renderFile(fileURLToPath(new URL(viewCase.file, import.meta.url)), {
      title: `Content-Agent – ${viewCase.name}`,
      currentPathname: '/admin/content-agent',
      cssAsset: (value) => `/assets/${value}`,
      ...viewCase.locals
    });

    assert.match(html, /Admin Backend/);
    assert.match(html, /Content-Agent/);
    assert.match(html, new RegExp(viewCase.name));
    assert.doesNotMatch(html, /stage_results_json|payload_json|openai_response_ids_json/i);
  }
});

test('jede Zwischenansicht verlinkt alle sieben sicheren Navigationsseiten', async () => {
  const html = await renderFile(fileURLToPath(new URL(viewCases[0].file, import.meta.url)), {
    title: 'Content-Agent',
    currentPathname: '/admin/content-agent',
    cssAsset: (value) => `/assets/${value}`,
    ...viewCases[0].locals
  });

  for (const path of [
    '/admin/content-agent',
    '/admin/content-agent/drafts',
    '/admin/content-agent/existing-content',
    '/admin/content-agent/schedule',
    '/admin/content-agent/jobs',
    '/admin/content-agent/search-console',
    '/admin/content-agent/technology'
  ]) {
    assert.match(html, new RegExp(`href=["']${path.replaceAll('/', '\\/')}["']`));
  }
});
