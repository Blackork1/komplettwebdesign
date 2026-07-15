import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { renderFile } from 'ejs';

const viewUrl = (name) => new URL(`../views/admin/contentAgent/${name}`, import.meta.url);
const readView = (name) => readFile(viewUrl(name), 'utf8');

const dashboard = {
  modeLabel: '<script>modus</script>',
  worker: { label: '<script>worker</script>', healthy: false },
  budget: { usedEur: 12.4, limitEur: 50 },
  approvals: { current: 3, required: 8, ready: false },
  schedule: {
    nextGenerationLabel: '13.07.2026, 14:00 Uhr (MESZ)',
    nextPublicationLabel: '13.07.2026, 18:00 Uhr (MESZ)'
  },
  drafts: [{
    id: 14,
    title: '<script>entwurf</script>',
    excerpt: 'Kurzbeschreibung',
    workflowStatus: 'needs_review',
    primaryKeyword: 'Webdesign Berlin',
    contentCluster: 'Webdesign',
    qualityScore: 92,
    costEur: 1.24,
    riskBlocked: true,
    riskCount: 3,
    reviewState: 'needs_review',
    reviewStateLabel: 'Prüfung offen',
    scheduledAtLabel: '13.07.2026, 18:00 Uhr',
    generationAtLabel: '13.07.2026, 14:00 Uhr',
    reviewVersion: 4,
    approvalVersion: null,
    publicationVersion: 1,
    notification: {
      status: 'failed',
      statusLabel: 'Versand fehlgeschlagen',
      attempts: 6,
      lastAttemptAtLabel: '12.07.2026, 10:30 Uhr',
      lastErrorCode: '<script>smtp_etimedout</script>',
      canRetry: true
    },
    createdAt: '2026-07-11T12:00:00.000Z'
  }],
  jobs: [{
    id: 41,
    jobType: 'generate_manual_draft',
    status: 'failed',
    statusLabel: 'Endgültig fehlgeschlagen',
    canRetry: true,
    attempts: 3,
    maxAttempts: 5,
    lastError: '<script>fehler</script>',
    lastSafeStageLabel: 'Bildgenerierung',
    costEur: 1.24,
    createdAt: '2026-07-11T12:00:00.000Z'
  }]
};

const settings = {
  agent_enabled: true,
  operating_mode: 'review',
  schedule_weekdays: [1, 4],
  schedule_time: '18:00:00',
  timezone: 'Europe/Berlin',
  monthly_budget_cents: 5000,
  auto_publish_min_score: 90,
  maximum_attempts: 3,
  generation_lead_hours: 4,
  admin_notification_email: 'redaktion@example.de',
  newsletter_blog_notifications_enabled: false,
  manual_approvals_count: 3,
  settings_version: 7
};

const baseLocals = {
  title: 'Content-Agent',
  currentPathname: '/admin/content-agent',
  csrfToken: 'csrf-test',
  cssAsset: (value) => `/assets/${value}`,
  jsAsset: (value) => `/assets/${value}`
};

async function executeExistingContentPolling(statusPayload) {
  const script = await readFile(
    new URL('../public/js/admin-existing-content-optimization.js', import.meta.url),
    'utf8'
  );
  const attributes = new Map([
    ['data-state', 'running'],
    ['data-active', 'true'],
    ['data-status-url', '/admin/content-agent/existing-content/19/optimization-status']
  ]);
  const label = { textContent: 'In Bearbeitung' };
  const stage = { textContent: 'Gezielte Optimierung' };
  const message = { textContent: 'Die KI-Optimierung läuft.' };
  const button = { disabled: false, textContent: 'Optimierung läuft' };
  const primaryAction = {
    child: null,
    querySelector(selector) { return selector === 'button' ? button : null; },
    replaceChildren(child) { this.child = child; }
  };
  const elements = new Map([
    ['[data-existing-content-optimization-label]', label],
    ['[data-existing-content-optimization-stage]', stage],
    ['[data-existing-content-optimization-message]', message],
    ['[data-existing-content-primary-action]', primaryAction]
  ]);
  const row = {
    getAttribute(name) { return attributes.get(name) || null; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    querySelector(selector) { return elements.get(selector) || null; }
  };
  const timers = [];
  const windowTarget = {
    fetch: async () => ({ ok: true, json: async () => statusPayload }),
    clearTimeout() {},
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    }
  };
  const documentTarget = {
    contains(candidate) { return candidate === row; },
    createElement() { return { className: '', href: '', textContent: '' }; },
    querySelectorAll() { return [row]; }
  };

  runInNewContext(script, { window: windowTarget, document: documentTarget, Error });
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 3000);
  timers[0].callback();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  return { attributes, label, stage, message, primaryAction, timers };
}

test('Cockpit enthält bestätigte sieben Reiter und sichere Aktionsformulare', async () => {
  const [overview, tabs, schedule, technology, script] = await Promise.all([
    readView('overview.ejs'),
    renderFile(fileURLToPath(viewUrl('_tabs.ejs')), { activeTab: 'overview' }),
    readView('schedule.ejs'),
    readView('technology.ejs'),
    readFile(new URL('../public/js/admin-content-agent.js', import.meta.url), 'utf8')
  ]);

  assert.match(overview, /Content-Agent/);
  assert.match(tabs, /Übersicht/);
  assert.match(tabs, /Entwürfe/);
  assert.match(tabs, /Zeitplan &amp; Modus/);
  assert.match(tabs, /Jobs &amp; Protokolle/);
  assert.match(tabs, /Search Console/);
  assert.match(tabs, /Lernregeln/);
  assert.match(tabs, /Technik/);
  assert.match(overview, /Jetzt Entwurf erstellen/);
  assert.match(overview, /name="_csrf"/);
  assert.match(overview, /method="post" action="\/admin\/content-agent\/jobs\/manual-draft"/);
  assert.match(schedule, /Montag/);
  assert.match(schedule, /Donnerstag/);
  assert.match(schedule, /name="schedule_weekdays"/);
  assert.match(schedule, /name="settings_form_scope" value="schedule"/);
  assert.match(schedule, /name="settings_version"/);
  assert.match(schedule, /step="1"/);
  assert.match(technology, /schreibgeschützt/i);
  assert.match(script, /window\.confirm/);
  assert.doesNotMatch(script, /XMLHttpRequest|localStorage/);
});

test('Entwurfsoptimierung sperrt Doppelklicks und aktualisiert nur die Statusbox', async () => {
  const script = await readFile(new URL('../public/js/admin-content-agent.js', import.meta.url), 'utf8');

  assert.match(script, /data-review-optimization-form/);
  assert.match(script, /data-review-optimization-submit/);
  assert.match(script, /data-review-optimization-status/);
  assert.match(script, /data-review-optimization-retry/);
  assert.match(script, /window\.fetch/);
  assert.match(script, /credentials:\s*'same-origin'/);
  assert.match(script, /headers:\s*\{\s*Accept:\s*'application\/json'\s*\}/);
  assert.match(script, /setTimeout\([^,]+,\s*5000\)/);
  assert.doesNotMatch(script, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.doesNotMatch(script, /location\.reload|window\.location\s*=/);
});

test('ungerade Haupttabanzahl nutzt im mobilen Zweispaltenraster einen Vollbreiten-Tab', async () => {
  const [tabs, tabsSource, adminCss] = await Promise.all([
    renderFile(fileURLToPath(viewUrl('_tabs.ejs')), { activeTab: 'overview' }),
    readView('_tabs.ejs'),
    readFile(new URL('../public/admin.css', import.meta.url), 'utf8')
  ]);

  assert.match(tabs, /<nav class="content-agent-tabs content-agent-tabs--odd"/);
  assert.match(
    tabsSource,
    /contentAgentTabs\.length\s*%\s*2[\s\S]*content-agent-tabs--even[\s\S]*content-agent-tabs--odd/
  );
  assert.match(
    adminCss,
    /\.content-agent-tabs--odd\s+\.content-agent-tabs__link:last-child\s*\{\s*grid-column:\s*1\s*\/\s*-1;\s*\}/
  );
});

test('Lernregelseite zeigt sichere Vorschläge, Regeln, Beobachtungen und Verlauf mit CSRF', async () => {
  const learningDashboard = {
    proposals: [{
      id: 3, categoryLabel: 'CTA-Wiederholung oder fehlende Passung', status: 'pending',
      statusLabel: 'Freigabe offen', expectedVersion: 2,
      ruleText: '<script>nicht ausführen</script> Sichere Regel mit genügend Inhalt für eine redaktionelle Prüfung.',
      targetStages: ['writer', 'reviewer'], targetStageLabels: ['Artikelerstellung', 'Redaktionelle Prüfung'],
      evidenceCount: 3, evidence: [{ postId: 11, reviewVersion: 4, reason: 'Wiederholung', instruction: 'Unterscheiden' }],
      expectedEffect: 'Weniger Wiederholung', overfitWarning: 'Nicht übertreiben'
    }],
    rules: [{
      id: 8, categoryLabel: 'Zu generische Inhalte', status: 'active', statusLabel: 'Aktiv',
      contentVersion: 1, expectedVersion: 3,
      ruleText: 'Formuliere zentrale Abschnitte konkret für Zielgruppe und Thema.',
      targetStages: ['seo_brief', 'writer'], targetStageLabels: ['SEO-Briefing', 'Artikelerstellung'],
      updatedAtLabel: '14.07.2026, 10:00 Uhr (MESZ)',
      effectiveness: {
        status: 'revision_recommended', statusLabel: 'Revision empfohlen', statusHint: 'Die Fehlerkategorie tritt weiterhin wiederholt auf.',
        articleCount: 6, recurrenceCount: 3, currentRateLabel: '50 %', baselineRateLabel: '60 %', averageQualityScoreLabel: '91,0',
        gsc: { hasData: true, clicksLabel: '12', impressionsLabel: '400', ctrLabel: '3 %', averagePositionLabel: '8,4' }
      }
    }],
    observations: [{ categoryLabel: 'Zu generische Inhalte', articleCount: 4, observationCount: 6, postIds: [11, 12], lastSeenAtLabel: '14.07.2026, 09:00 Uhr (MESZ)' }],
    unclassified: { articleCount: 2, observationCount: 3, lastSeenAtLabel: '13.07.2026, 09:00 Uhr (MESZ)' },
    events: [{ id: 19, eventLabel: 'Neue Regelversion aktiviert', categoryLabel: 'Zu generische Inhalte', adminName: 'Admin Ä', createdAtLabel: '14.07.2026, 10:00 Uhr (MESZ)', ruleVersion: 2 }]
  };
  const html = await renderFile(fileURLToPath(viewUrl('learningRules.ejs')), {
    ...baseLocals,
    currentPathname: '/admin/content-agent/learning-rules',
    learningDashboard,
    result: 'activated'
  });

  assert.match(html, /Lernregeln/);
  assert.match(html, /Neue Vorschläge/);
  assert.match(html, /Aktive und bisherige Regeln/);
  assert.match(html, /Beobachtungen/);
  assert.match(html, /Verlauf/);
  assert.match(html, /Revision empfohlen/);
  assert.match(html, /Search-Console-Kontext/);
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /name="expected_version" value="2"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /data-confirm=/);
  assert.match(html, /&lt;script&gt;nicht ausführen&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>nicht ausführen<\/script>/);
  assert.doesNotMatch(html, /runtime_snapshot_json|providerResponse|article_html|stage_results_json/i);
});

test('Übersicht rendert Layout A zugänglich und escaped dynamische Werte', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('overview.ejs')), {
    ...baseLocals,
    dashboard,
    settings
  });

  assert.match(html, /aria-label="Content-Agent-Bereiche"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /href="\/admin\/content-agent" class="is-active" aria-current="page"/);
  assert.match(html, /Zur Prüfung/);
  assert.match(html, /Systemstatus/);
  assert.match(html, /&lt;script&gt;entwurf&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>entwurf<\/script>/);
  assert.doesNotMatch(html, /stage_results_json|payload_json|openai_response_ids_json/i);
});

test('Search-Console-Tab rendert die bestätigte Variante A mit Themenblöcken zuerst', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('searchConsole.ejs')), {
    ...baseLocals,
    currentPathname: '/admin/content-agent/search-console',
    searchConsoleConfigured: true,
    searchConsoleProperty: 'komplettwebdesign.de',
    agentEnabled: true,
    technicalAgentEnabled: true,
    syncQueued: false,
    searchConsole: {
      summary: {
        impressions: '1.900', clicks: '35', ctr: '1,84 %',
        periodLabel: '16.06.–13.07.2026', periodDetail: '28 gespeicherte Tage',
        opportunityCount: 1
      },
      categories: [{
        key: 'website_testers', label: 'Website-Tester', primary: true,
        description: 'SEO-, GEO-, Broken-Link-, Meta- und allgemeine Website-Tests',
        impressions: '1.250', clicks: '24', ctr: '1,92 %', share: '65,79 %', hasData: true,
        languages: [
          { key: 'de', label: 'Deutsch', impressions: '1.000', clicks: '20', ctr: '2,00 %', hasData: true },
          { key: 'en', label: 'Englisch', impressions: '250', clicks: '4', ctr: '1,60 %', hasData: true }
        ],
        subcategories: [
          { key: 'seo', label: 'SEO-Tester', impressions: '1.000', clicks: '20', ctr: '2,00 %', hasData: true },
          { key: 'geo', label: 'GEO-Tester', impressions: '250', clicks: '4', ctr: '1,60 %', hasData: true },
          { key: 'broken_links', label: 'Broken-Link-Tester', impressions: '0', clicks: '0', ctr: '0,00 %', hasData: false },
          { key: 'meta', label: 'Meta-Tester', impressions: '0', clicks: '0', ctr: '0,00 %', hasData: false }
        ],
        pages: [{ path: '/website-tester/seo', language: 'Deutsch', impressions: '1.000', clicks: '20', ctr: '2,00 %' }],
        queries: [{ query: '<script>seo tester</script>', page: '/website-tester/seo', language: 'Deutsch', impressions: '1.000', clicks: '20', ctr: '2,00 %', position: '7,2' }]
      }],
      contentOpportunities: [{
        query: 'seo für ki suche', page: '/blog/ki-suche', categoryLabel: 'Blog & Ratgeber',
        language: 'Deutsch', impressions: '500', clicks: '8', ctr: '1,60 %', position: '11,4'
      }],
      opportunities: [{ id: 1, query: 'webdesign berlin', type: 'Inhalt prüfen', recommendation: 'Inhalt vertiefen.', score: '8,50' }],
      provider: { healthy: true, statusLabel: 'Verbunden', lastSuccessAtLabel: '14.07.2026, 08:00 Uhr' }
    }
  });

  assert.match(html, /Themenblöcke zuerst/);
  assert.match(html, /Auswertungszeitraum/);
  assert.match(html, /16.06.–13.07.2026/);
  assert.match(html, /Website-Tester/);
  assert.match(html, /SEO-Tester/);
  assert.match(html, /GEO-Tester/);
  assert.match(html, /Broken-Link-Tester/);
  assert.match(html, /Deutsch/);
  assert.match(html, /Englisch/);
  assert.match(html, /Wichtigste Content-Chancen außerhalb der Tester/);
  assert.match(html, /GSC ist ein ergänzendes Signal/i);
  assert.match(html, /<details class="content-gsc-details"/);
  assert.match(html, /&lt;script&gt;seo tester&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>seo tester<\/script>/);
});

test('Zeitplan akzeptiert Centbeträge und Erfolgsmeldung ist über sicheren Viewlocal erreichbar', async () => {
  const scheduleHtml = await renderFile(fileURLToPath(viewUrl('schedule.ejs')), {
    ...baseLocals,
    settings: { ...settings, monthly_budget_cents: 1250 },
    technical: {
      autoPublishEnabled: { value: false },
      monthlyCostLimitEur: { value: 100 },
      maxAttempts: { value: 5 }
    }
  });
  const successHtml = await renderFile(fileURLToPath(viewUrl('overview.ejs')), {
    ...baseLocals,
    dashboard,
    settings,
    created: true
  });
  const neutralHtml = await renderFile(fileURLToPath(viewUrl('overview.ejs')), {
    ...baseLocals,
    dashboard,
    settings,
    created: false
  });

  assert.match(scheduleHtml, /name="monthly_budget_cents"[^>]*step="1"[^>]*value="1250"/);
  assert.match(successHtml, /Der Entwurfsjob wurde sicher eingeplant/);
  assert.doesNotMatch(neutralHtml, /Der Entwurfsjob wurde sicher eingeplant/);
});

test('Zeitplan erklärt Veröffentlichungszeit, Vorlauf, Adminadresse und Newsletter-Sperre', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('schedule.ejs')), {
    ...baseLocals,
    settings: { ...settings, manual_approvals_count: 0 },
    schedule: {
      generationLeadHours: 4,
      nextGenerationLabel: '13.07.2026, 14:00 Uhr (MESZ)',
      nextPublicationLabel: '13.07.2026, 18:00 Uhr (MESZ)',
      weeklyPreview: [
        { label: 'Montag: Erstellung 14:00 Uhr · Veröffentlichung 18:00 Uhr' },
        { label: 'Donnerstag: Erstellung 14:00 Uhr · Veröffentlichung 18:00 Uhr' }
      ],
      newsletterApprovals: { current: 0, required: 8, ready: false }
    },
    technical: {
      autoPublishEnabled: { value: false },
      monthlyCostLimitEur: { value: 100 },
      maxAttempts: { value: 5 }
    }
  });

  assert.match(html, /name="generation_lead_hours"[^>]*min="1"[^>]*max="48"[^>]*value="4"/);
  assert.match(html, /name="admin_notification_email"[^>]*value="redaktion@example\.de"/);
  assert.match(html, /name="newsletter_blog_notifications_enabled"[^>]*disabled/);
  assert.match(html, /0\s*\/\s*8/);
  assert.match(html, /Veröffentlichungszeit/i);
  assert.match(html, /vier Stunden vorher|Erstellungsvorlauf/i);
  assert.match(html, /Montag: Erstellung 14:00 Uhr · Veröffentlichung 18:00 Uhr/);
  assert.match(html, /Nächste Erstellung[\s\S]*13\.07\.2026, 14:00 Uhr/);
});

test('Entwürfe, Bestandsinhalte, Jobs und Technik bleiben über sichere Viewmodels erreichbar', async () => {
  const cases = [
    ['drafts.ejs', { drafts: dashboard.drafts }, /Vorschau/],
    ['existingContent.ejs', {
      existingContent: [{ id: 5, title: '<script>bestand</script>', slug: 'bestand', updatedAt: '2026-07-11T12:00:00.000Z' }]
    }, /Bestehende Inhalte prüfen/],
    ['jobs.ejs', { jobs: dashboard.jobs }, /Job fortsetzen/],
    ['technology.ejs', {
      technology: {
        technical: {
          contentModel: { value: '<script>modell</script>', source: '.env', editable: false, restartRequired: true }
        },
        versions: {},
        worker: { label: 'Worker aktiv', healthy: true },
        providers: []
      }
    }, /Neustart erforderlich/]
  ];

  for (const [file, locals, expected] of cases) {
    const html = await renderFile(fileURLToPath(viewUrl(file)), { ...baseLocals, ...locals });
    assert.match(html, expected);
    assert.doesNotMatch(html, /<script>(?:bestand|modell|fehler)<\/script>/);
    assert.doesNotMatch(html, /stage_results_json|payload_json|openai_response_ids_json/i);
  }
});

test('Bestandszeile sendet beim Start nur CSRF und Pfad-ID und besitzt genau eine primäre Aktion', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('existingContent.ejs')), {
    ...baseLocals,
    existingContent: [{
      id: 19,
      title: 'Website-Relaunch planen',
      slug: 'website-relaunch-planen',
      updatedAt: '2026-07-14T10:00:00.000Z',
      optimization: {
        state: 'idle', active: false, terminal: false, canStart: true,
        statusLabel: 'Noch nicht gestartet', stageLabel: 'Noch keine Stufe',
        message: 'Noch keine KI-Optimierung gestartet.', jobId: null,
        revisionId: null, revisionUrl: null, errorCode: null,
        unsafeProviderState: false, updatedAt: null
      }
    }]
  });

  const form = html.match(/<form[^>]*action="\/admin\/content-agent\/existing-content\/19\/optimize"[\s\S]*?<\/form>/)?.[0] || '';
  assert.match(form, /method="post"/);
  assert.match(form, /name="_csrf" value="csrf-test"/);
  assert.doesNotMatch(form, /name="(?:post_id|admin_id|base_live_hash|max_attempts|payload|slug)"/i);
  assert.equal((html.match(/data-existing-content-primary-action/g) || []).length, 1);
  assert.match(html, /1 veröffentlichter Inhalt/);
  assert.match(html, /KI-Optimierung starten/);
  assert.match(html, /Livefassung bleibt unverändert/i);
});

test('Bestandszeile bietet nach abgeschlossener und übernommener Revision einen neuen sicheren Start an', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('existingContent.ejs')), {
    ...baseLocals,
    existingContent: [{
      id: 19,
      title: 'Website-Relaunch planen',
      slug: 'website-relaunch-planen',
      updatedAt: '2026-07-14T10:00:00.000Z',
      optimization: {
        state: 'completed', active: false, terminal: true, canStart: true,
        statusLabel: 'Abgeschlossen', stageLabel: 'Revision erstellt',
        message: 'Die Optimierung ist abgeschlossen.', jobId: 44,
        revisionId: null, revisionUrl: null, errorCode: null,
        unsafeProviderState: false, updatedAt: '2026-07-14T10:05:00.000Z'
      }
    }]
  });

  assert.match(html, /action="\/admin\/content-agent\/existing-content\/19\/optimize"/);
  assert.match(html, /KI-Optimierung starten/);
  assert.doesNotMatch(html, /Jobs &amp; Protokolle öffnen/);
});

test('Bestandszeile escaped Outcome-Queries und formuliert die Nachmessung ausschließlich neutral', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('existingContent.ejs')), {
    ...baseLocals,
    existingContent: [{
      id: 19,
      title: 'Artikel',
      slug: 'artikel',
      outcome: {
        state: 'observed',
        label: 'Neutrale Beobachtung',
        note: 'Die Werte sind eine neutrale Beobachtung. Saison, Nachfrage und Google-Änderungen können sie beeinflussen.',
        baseline: { clicksLabel: '4', impressionsLabel: '80', ctrLabel: '5 %', averagePositionLabel: '12,5' },
        followup: { clicksLabel: '8', impressionsLabel: '100', ctrLabel: '8 %', averagePositionLabel: '9,5' },
        changes: { clicksLabel: '+4', impressionsLabel: '+20', ctrLabel: '+3 %', averagePositionLabel: '-3,0' },
        newImportantQueries: [{ query: '<script>alert(1)</script>', clicksLabel: '2', impressionsLabel: '20' }],
        lostImportantQueries: [{ query: 'Alte Suche', clicksLabel: '1', impressionsLabel: '15' }]
      },
      optimization: {
        state: 'completed', active: false, terminal: true, canStart: false,
        statusLabel: 'Abgeschlossen', stageLabel: 'Revision erstellt',
        message: 'Die Optimierung ist abgeschlossen.', jobId: 44,
        revisionId: null, revisionUrl: null, errorCode: null,
        unsafeProviderState: false, updatedAt: null
      }
    }]
  });

  assert.match(html, /Neutrale Beobachtung/);
  assert.match(html, /Saison, Nachfrage und Google-Änderungen/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|automatisch.*rück|kausaler Beweis/i);
});

test('Bestandszeile bewahrt die manuelle Audit-Revision als CSRF-geschützte sekundäre Aktion', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('existingContent.ejs')), {
    ...baseLocals,
    existingContent: [{
      id: 19,
      title: 'Website-Relaunch planen',
      slug: 'website-relaunch-planen',
      auditId: 31,
      auditStatus: 'open',
      auditScore: 78,
      revisionId: null,
      optimization: {
        state: 'idle', active: false, terminal: false, canStart: true,
        statusLabel: 'Noch nicht gestartet', stageLabel: 'Noch keine Stufe',
        message: 'Noch keine KI-Optimierung gestartet.', jobId: null,
        revisionId: null, revisionUrl: null, errorCode: null,
        unsafeProviderState: false, updatedAt: null
      }
    }]
  });

  const revisionForm = html.match(/<form[^>]*action="\/admin\/content-agent\/existing-content\/19\/revision"[\s\S]*?<\/form>/)?.[0] || '';
  assert.match(revisionForm, /method="post"/);
  assert.match(revisionForm, /name="_csrf" value="csrf-test"/);
  assert.match(revisionForm, /name="audit_id" value="31"/);
  assert.match(revisionForm, /btn btn-sm btn-outline-secondary/);
  assert.match(revisionForm, /Revision anlegen/);
  assert.match(html, /action="\/admin\/content-agent\/existing-content\/19\/optimize"/);
  assert.equal((html.match(/data-existing-content-primary-action/g) || []).length, 1);
  assert.equal((html.match(/btn btn-sm btn-primary/g) || []).length, 1);
});

test('laufende Bestandsoptimierung zeigt Stufe, deaktiviert die Einzelaktion und aktiviert Statuspolling', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('existingContent.ejs')), {
    ...baseLocals,
    existingContent: [{
      id: 19, title: 'Artikel', slug: 'artikel',
      optimization: {
        state: 'running', active: true, terminal: false, canStart: false,
        statusLabel: 'In Bearbeitung', stageLabel: 'Gezielte Optimierung',
        message: 'Die KI-Optimierung läuft: Gezielte Optimierung.', jobId: 44,
        revisionId: null, revisionUrl: null, errorCode: null,
        unsafeProviderState: false, updatedAt: '2026-07-14T10:03:00.000Z'
      }
    }]
  });

  assert.match(html, /data-existing-content-optimization/);
  assert.match(html, /data-state="running"/);
  assert.match(html, /data-status-url="\/admin\/content-agent\/existing-content\/19\/optimization-status"/);
  assert.match(html, /Gezielte Optimierung/);
  assert.match(html, /<button[^>]*disabled[^>]*>[\s\S]*?Optimierung läuft/);
  assert.doesNotMatch(html, /action="\/admin\/content-agent\/existing-content\/19\/optimize"/);
  assert.equal((html.match(/data-existing-content-primary-action/g) || []).length, 1);
});

test('unsicherer Providerzustand bietet keinen normalen Retry und verweist sicher auf Jobs', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('existingContent.ejs')), {
    ...baseLocals,
    existingContent: [{
      id: 19, title: 'Artikel', slug: 'artikel',
      optimization: {
        state: 'manual_attention', active: false, terminal: true, canStart: false,
        statusLabel: 'Manuelle Prüfung nötig', stageLabel: 'Gezielte Optimierung',
        message: 'Der Lauf benötigt eine manuelle Prüfung.', jobId: 44,
        revisionId: null, revisionUrl: null,
        errorCode: 'provider_execution_uncertain', unsafeProviderState: true,
        updatedAt: '2026-07-14T10:03:00.000Z'
      }
    }]
  });

  assert.match(html, /Manuelle Prüfung nötig/);
  assert.match(html, /href="\/admin\/content-agent\/jobs"/);
  assert.doesNotMatch(html, /action="\/admin\/content-agent\/existing-content\/19\/optimize"/);
  assert.doesNotMatch(html, /Erneut optimieren|normal.*wiederholen/i);
  assert.equal((html.match(/data-existing-content-primary-action/g) || []).length, 1);
});

test('Bestandsoptimierungs-JavaScript pollt nur aktive Zustände alle drei Sekunden und schreibt kein HTML', async () => {
  const script = await readFile(
    new URL('../public/js/admin-existing-content-optimization.js', import.meta.url),
    'utf8'
  );

  assert.match(script, /\['queued', 'running'\]/);
  assert.match(script, /setTimeout\([^,]+,\s*3000\)/);
  assert.match(script, /document\.contains\(/);
  assert.match(script, /credentials:\s*'same-origin'/);
  assert.match(script, /Accept:\s*'application\/json'/);
  assert.match(script, /textContent/);
  assert.match(script, /content-agent\\\/revisions/);
  assert.match(script, /\/admin\/content-agent\/jobs/);
  assert.doesNotMatch(script, /innerHTML|insertAdjacentHTML|outerHTML|eval\(|location\.reload|window\.location\s*=/);
});

test('strukturell ungültige 2xx-Statusantwort beendet Polling sichtbar und sicher', async () => {
  const state = await executeExistingContentPolling({
    state: 'running',
    active: 'true',
    terminal: false,
    canStart: false,
    statusLabel: 'In Bearbeitung',
    stageLabel: 'Gezielte Optimierung',
    message: 'Manipulierte Statusantwort',
    jobId: 44,
    revisionId: null,
    revisionUrl: null,
    errorCode: null,
    unsafeProviderState: false,
    updatedAt: '2026-07-14T10:03:00.000Z'
  });

  assert.equal(state.attributes.get('data-active'), 'false');
  assert.match(state.message.textContent, /Statusantwort/i);
  assert.match(state.message.textContent, /sicher beendet/i);
  assert.equal(state.timers.length, 1);
});

test('gültiger terminaler Status bleibt gezielt stehen und verlinkt die fertige Revision', async () => {
  const state = await executeExistingContentPolling({
    state: 'completed',
    active: false,
    terminal: true,
    canStart: false,
    statusLabel: 'Revision bereit',
    stageLabel: 'Revision erstellt',
    message: 'Die Revision kann jetzt geprüft werden.',
    jobId: 44,
    revisionId: 71,
    revisionUrl: '/admin/content-agent/revisions/71/edit',
    errorCode: null,
    unsafeProviderState: false,
    updatedAt: '2026-07-14T10:04:00.000Z'
  });

  assert.equal(state.attributes.get('data-state'), 'completed');
  assert.equal(state.attributes.get('data-active'), 'false');
  assert.equal(state.message.textContent, 'Die Revision kann jetzt geprüft werden.');
  assert.equal(state.primaryAction.child.href, '/admin/content-agent/revisions/71/edit');
  assert.equal(state.primaryAction.child.textContent, 'Revision bearbeiten');
  assert.equal(state.timers.length, 1);
});

test('Draftübersicht bietet Statusfilter, Termin- und Maildetails sowie sicheren CSRF-Retry', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('drafts.ejs')), {
    ...baseLocals,
    drafts: dashboard.drafts,
    status: 'review'
  });

  for (const [filter, label] of [
    ['review', 'Prüfung'],
    ['approved', 'Freigegeben'],
    ['missed', 'Verpasst'],
    ['published', 'Veröffentlicht']
  ]) {
    assert.match(html, new RegExp(`href="/admin/content-agent/drafts\\?status=${filter}"[^>]*>${label}`));
  }
  assert.match(html, /13\.07\.2026, 18:00 Uhr/);
  assert.match(html, /Erstellungszeitpunkt[\s\S]*13\.07\.2026, 14:00 Uhr/);
  assert.match(html, /Reviewversion[\s\S]*4/);
  assert.match(html, /Freigabeversion[\s\S]*Noch nicht freigegeben/);
  assert.match(html, /Letzter Mailversuch[\s\S]*12\.07\.2026, 10:30 Uhr/);
  assert.match(html, /Fehlercode[\s\S]*&lt;script&gt;smtp_etimedout&lt;\/script&gt;/);
  assert.match(html, /method="post" action="\/admin\/content-agent\/drafts\/14\/notification\/retry"/);
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /aria-label="Admin-Benachrichtigung für &lt;script&gt;entwurf&lt;\/script&gt; erneut senden"/);
  assert.doesNotMatch(html, /<script>smtp_etimedout<\/script>/);
});

test('Mailretry wird ohne serverseitige Retryfreigabe nicht gerendert', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('drafts.ejs')), {
    ...baseLocals,
    drafts: [{
      ...dashboard.drafts[0],
      notification: {
        status: 'failed',
        statusLabel: 'Versand unklar',
        attempts: 6,
        lastErrorCode: 'outcome_uncertain',
        canRetry: false
      }
    }],
    status: 'review'
  });

  assert.doesNotMatch(html, /notification\/retry/);
});

test('Jobliste rendert fehlgeschlagene Jobs ohne explizites canRetry fail-closed', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('jobs.ejs')), {
    ...baseLocals,
    jobs: [{
      id: 77,
      jobType: 'send_admin_review_notification',
      status: 'failed',
      statusLabel: 'Endgültig fehlgeschlagen',
      attempts: 1,
      maxAttempts: 6,
      lastSafeStageLabel: 'Noch keine Stufe'
    }]
  });

  assert.doesNotMatch(html, /jobs\/77\/retry|Job fortsetzen/);
});

test('Jobliste trennt die bestätigte Providerwiederherstellung vom normalen Retry', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('jobs.ejs')), {
    ...baseLocals,
    jobs: [{
      id: 1,
      jobType: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      statusLabel: 'Manuelle Prüfung nötig',
      attempts: 4,
      maxAttempts: 4,
      lastSafeStageLabel: 'Themenrecherche',
      lastError: 'provider_execution_uncertain',
      costEur: 0.59,
      canRetry: false,
      canRecoverProvider: true,
      providerRecoveryStageLabel: 'SEO-Briefing',
      providerRecoveryActionLabel: 'Reservierung verwerfen und SEO-Briefing erneut erstellen'
    }]
  });

  assert.match(html, /method="post" action="\/admin\/content-agent\/jobs\/1\/recover-provider"/);
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /Der frühere OpenAI-Aufruf könnte bereits berechnet worden sein/);
  assert.match(html, /zusätzliche OpenAI-Kosten verursachen/);
  assert.match(html, /Reservierung verwerfen und SEO-Briefing erneut erstellen/);
  assert.match(html, /data-confirm="[^"]*kostenpflichtig erneut ausführen/);
  assert.doesNotMatch(html, /jobs\/1\/retry|Job fortsetzen/);
  assert.doesNotMatch(html, /stage_results_json|payload_json|openai_response_ids_json/i);
});

test('Jobliste erklärt die sichere Fortsetzung nach einer vorab abgelehnten Artikelerstellung', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('jobs.ejs')), {
    ...baseLocals,
    jobs: [{
      id: 1,
      jobType: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      statusLabel: 'Manuelle Prüfung nötig',
      attempts: 6,
      maxAttempts: 6,
      lastSafeStageLabel: 'SEO-Briefing',
      lastError: 'provider_request_rejected',
      costEur: 0.17,
      canRetry: false,
      canRecoverProvider: false,
      canRecoverRejectedProvider: true,
      rejectedProviderRecoveryStageLabel: 'Artikelerstellung',
      rejectedProviderRecoveryActionLabel: 'Artikelerstellung nach Schema-Korrektur fortsetzen'
    }]
  });

  assert.match(html, /action="\/admin\/content-agent\/jobs\/1\/recover-rejected-provider"/);
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /vor der kostenpflichtigen Ausführung abgelehnt/);
  assert.match(html, /keine unklare Doppelberechnung/);
  assert.match(html, /nächste reguläre Artikelerstellung verursacht die üblichen OpenAI-Kosten/);
  assert.match(html, /Artikelerstellung nach Schema-Korrektur fortsetzen/);
  assert.doesNotMatch(html, /jobs\/1\/retry|Mögliche doppelte Providerkosten/);
});

test('Jobliste erklärt die gezielte Qualitätswiederaufnahme ohne erneute Grundlagenerstellung', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('jobs.ejs')), {
    ...baseLocals,
    jobs: [{
      id: 1,
      jobType: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      statusLabel: 'Manuelle Prüfung nötig',
      attempts: 7,
      maxAttempts: 7,
      lastSafeStageLabel: 'Qualitätsprüfung',
      lastError: 'quality_gate_failed',
      costEur: 0.48,
      canRetry: false,
      canRecoverProvider: false,
      canRecoverRejectedProvider: false,
      canRecoverQualityGate: true,
      qualityGateRecoveryActionLabel: 'HTML-Struktur gezielt reparieren und erneut prüfen'
    }]
  });

  assert.match(html, /action="\/admin\/content-agent\/jobs\/1\/recover-quality-gate"/);
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /Themenrecherche, SEO-Briefing und Artikel bleiben erhalten/);
  assert.match(html, /gezielte dritte Strukturreparatur und die anschließende Prüfung verursachen reguläre OpenAI-Kosten/);
  assert.match(html, /HTML-Struktur gezielt reparieren und erneut prüfen/);
  assert.doesNotMatch(html, /jobs\/1\/retry|Mögliche doppelte Providerkosten/);
});

test('Jobliste erklärt die sichere Manifestübernahme nach dem kostenfreien Vorabstopp', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('jobs.ejs')), {
    ...baseLocals,
    jobs: [{
      id: 1,
      jobType: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      statusLabel: 'Manuelle Prüfung nötig',
      attempts: 8,
      maxAttempts: 8,
      lastSafeStageLabel: 'Qualitätsprüfung',
      lastError: 'CONTENT_RULE_MANIFEST_MISMATCH',
      costEur: 0.48,
      canRetry: false,
      canRecoverProvider: false,
      canRecoverRejectedProvider: false,
      canRecoverQualityGate: false,
      canRecoverQualityGateManifest: true,
      qualityGateManifestRecoveryActionLabel:
        'Aktuellen Regelstand übernehmen und Strukturreparatur fortsetzen'
    }]
  });

  assert.match(html, /action="\/admin\/content-agent\/jobs\/1\/recover-rule-manifest"/);
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /Der abgebrochene Versuch hat keinen OpenAI-Aufruf ausgelöst/);
  assert.match(html, /Themenrecherche, SEO-Briefing und Artikel bleiben erhalten/);
  assert.match(html, /nächste Strukturreparatur und Prüfung verursachen reguläre OpenAI-Kosten/);
  assert.doesNotMatch(html, /jobs\/1\/retry|Mögliche doppelte Providerkosten/);
});

test('Jobliste erklärt die einmalige redaktionelle Neuprüfung ohne Artikelreparatur', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('jobs.ejs')), {
    ...baseLocals,
    jobs: [{
      id: 1,
      jobType: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      statusLabel: 'Manuelle Prüfung nötig',
      attempts: 9,
      maxAttempts: 9,
      lastSafeStageLabel: 'Redaktionelle Prüfung',
      lastError: 'quality_gate_failed',
      costEur: 0.61,
      canRetry: false,
      canRecoverProvider: false,
      canRecoverRejectedProvider: false,
      canRecoverQualityGate: false,
      canRecoverQualityGateManifest: false,
      canRecoverEditorialReview: true,
      editorialReviewRecoveryActionLabel: 'Nur redaktionelle Prüfung erneut ausführen',
      qualityIssues: ['Vier CTA statt drei.', 'FAQ-Struktur prüfen.']
    }]
  });

  assert.match(html, /action="\/admin\/content-agent\/jobs\/1\/recover-editorial-review"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /Artikel und bestandene technische Validierung bleiben unverändert/);
  assert.match(html, /nur eine neue redaktionelle OpenAI-Prüfung/i);
  assert.match(html, /Vier CTA statt drei/);
  assert.match(html, /FAQ-Struktur prüfen/);
  assert.doesNotMatch(html, /repair:4|Artikel erneut reparieren/);
});

test('Jobliste erklärt die einmalige Entwurfsfertigstellung und die neuen Bildkosten', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('jobs.ejs')), {
    ...baseLocals,
    jobs: [{
      id: 1,
      jobType: 'generate_weekly_draft',
      status: 'failed',
      statusLabel: 'Endgültig fehlgeschlagen',
      attempts: 10,
      maxAttempts: 10,
      lastSafeStageLabel: 'Bildbereinigung',
      lastError: 'value too long for type character varying(80)',
      costEur: 0.66,
      canRetry: false,
      canRecoverProvider: false,
      canRecoverRejectedProvider: false,
      canRecoverQualityGate: false,
      canRecoverQualityGateManifest: false,
      canRecoverEditorialReview: false,
      canRecoverDraftPersistence: true,
      draftPersistenceRecoveryActionLabel: 'Entwurf mit neuem Bild fertigstellen'
    }]
  });

  assert.match(html, /action="\/admin\/content-agent\/jobs\/1\/recover-draft-persistence"/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /SEO-Briefing, Artikel und Prüfungen bleiben unverändert/);
  assert.match(html, /gelöschte Bild muss neu generiert werden/i);
  assert.match(html, /zusätzliche Bildkosten/i);
  assert.doesNotMatch(html, /Artikel erneut|Review erneut/);
});

test('veröffentlichter Post bietet keinen Mailretry-POST an', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('drafts.ejs')), {
    ...baseLocals,
    status: 'published',
    drafts: [{
      ...dashboard.drafts[0],
      reviewState: 'published',
      reviewStateLabel: 'Veröffentlicht',
      published: true,
      notification: {
        ...dashboard.drafts[0].notification,
        canRetry: false
      }
    }]
  });

  assert.doesNotMatch(html, /notification\/retry|Mail erneut senden/);
});

test('Drafteditor bietet vier Regenerationen ohne alten direkten Publish-Bypass', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('draftEdit.ejs')), {
    ...baseLocals,
    draft: {
      id: 19,
      title: 'Entwurf',
      shortDescription: 'Kurzbeschreibung',
      slug: 'entwurf',
      metaTitle: 'Meta Title mit ausreichend vielen Zeichen für Google',
      metaDescription: 'Meta Description mit ausreichend vielen Zeichen für die sichere Vorschau und die spätere Suchdarstellung des Artikels.',
      ogTitle: 'OG-Titel',
      ogDescription: 'OG-Beschreibung',
      imageAlt: 'Bildbeschreibung',
      contentHtml: '<section><h2>Artikel</h2></section>',
      faqJsonText: '[]',
      reviewVersion: 2
    },
    saved: false,
    queued: false
  });

  for (const action of [
    'regenerate-article',
    'regenerate-metadata',
    'regenerate-faq',
    'regenerate-image'
  ]) {
    assert.match(html, new RegExp(`method="post" action="/admin/content-agent/drafts/19/${action}"`));
  }
  assert.equal((html.match(/name="_csrf"/g) || []).length >= 6, true);
  assert.doesNotMatch(html, /method="post" action="\/admin\/content-agent\/drafts\/19\/publish"/);
  assert.match(html, /method="post" action="\/admin\/content-agent\/drafts\/19\/reject"/);
  assert.match(html, /action="\/admin\/content-agent\/drafts\/19\/reject"[\s\S]*name="expected_review_version" value="2"/);
  assert.equal((html.match(/name="confirmed" value="true"/g) || []).length, 1);
  assert.match(html, /name="reason"[^>]*maxlength="500"[^>]*required/);
  assert.match(html, /data-confirm="[^"]*(?:veröffentlichen|ablehnen)/i);
});

test('Drafteditor bietet einzelne und gemeinsame Optimierung für nicht blockierende Prüfhinweise', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('draftEdit.ejs')), {
    ...baseLocals,
    draft: {
      id: 19,
      title: 'Entwurf',
      shortDescription: 'Kurzbeschreibung',
      slug: 'entwurf',
      metaTitle: 'Meta Title mit ausreichend vielen Zeichen für Google',
      metaDescription: 'Meta Description mit ausreichend vielen Zeichen für die sichere Vorschau und die spätere Suchdarstellung des Artikels.',
      ogTitle: 'OG-Titel',
      ogDescription: 'OG-Beschreibung',
      imageAlt: 'Bildbeschreibung',
      contentHtml: '<section><h2>Artikel</h2></section>',
      faqJsonText: '[]',
      reviewVersion: 3,
      editorRiskReview: {
        blocked: false,
        sourceCount: 0,
        items: [
          {
            code: 'review_issue_1', section: 'Artikel', anchor: 'draft-content-html',
            verificationType: 'none', sourceRequired: false, blocking: false,
            excerpt: 'Bisheriger CTA', reason: 'Zu allgemein.', instruction: 'CTA präzisieren.'
          },
          {
            code: 'review_issue_2', section: 'Artikel', anchor: 'draft-content-html',
            verificationType: 'none', sourceRequired: false, blocking: false,
            excerpt: 'Allgemeines Beispiel', reason: 'Zu abstrakt.', instruction: 'Beispiel konkretisieren.'
          }
        ]
      },
      reviewOptimizationStatus: {
        state: 'idle', active: false, blocksActions: false, jobId: null,
        attempts: 0, maxAttempts: 0, message: '', updatedAt: null,
        reloadRecommended: false
      }
    },
    saved: false,
    queued: false,
    reviewOptimizationQueued: false
  });

  const action = 'action="/admin/content-agent/drafts/19/optimize-review"';
  assert.equal((html.match(new RegExp(action, 'g')) || []).length, 3);
  assert.equal((html.match(/name="issue_mode" value="single"/g) || []).length, 2);
  assert.match(html, /name="issue_index" value="0"/);
  assert.match(html, /name="issue_index" value="1"/);
  assert.match(html, /name="issue_mode" value="all"/);
  assert.equal((html.match(/name="expected_review_version" value="3"/g) || []).length >= 3, true);
  assert.equal((html.match(/name="confirmed" value="true"/g) || []).length >= 4, true);
  assert.match(html, /Diesen Hinweis beheben/);
  assert.match(html, /Alle Hinweise optimieren und neu prüfen/);
  assert.match(html, /eine Textreparatur und eine redaktionelle Prüfung/i);
  assert.match(html, /bleibt unveröffentlicht/i);
  assert.match(html, /data-review-optimization-form/);
});

test('laufende Fehlerbehebung ist im Entwurf sichtbar und blendet weitere Optimierungen aus', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('draftEdit.ejs')), {
    ...baseLocals,
    draft: {
      id: 19,
      title: 'Entwurf', shortDescription: 'Kurzbeschreibung', slug: 'entwurf',
      metaTitle: 'Meta Title mit ausreichend vielen Zeichen für Google',
      metaDescription: 'Meta Description mit ausreichend vielen Zeichen für die sichere Vorschau und die spätere Suchdarstellung des Artikels.',
      ogTitle: 'OG-Titel', ogDescription: 'OG-Beschreibung', imageAlt: 'Bildbeschreibung',
      contentHtml: '<section><h2>Artikel</h2></section>', faqJsonText: '[]', reviewVersion: 3,
      editorRiskReview: {
        blocked: false, sourceCount: 0,
        items: [{
          code: 'review_issue_1', section: 'Artikel', anchor: 'draft-content-html',
          verificationType: 'none', sourceRequired: false, blocking: false,
          excerpt: 'Bisheriger CTA', reason: 'Zu allgemein.', instruction: 'CTA präzisieren.'
        }]
      },
      reviewOptimizationStatus: {
        state: 'running', active: true, blocksActions: true, jobId: 41,
        attempts: 1, maxAttempts: 3,
        message: 'Die Fehlerbehebung wird gerade ausgeführt.',
        updatedAt: '2026-07-14T10:01:00.000Z', reloadRecommended: false
      }
    },
    saved: false,
    queued: false,
    reviewOptimizationQueued: false
  });

  assert.match(html, /data-review-optimization-status/);
  assert.match(html, /data-state="running"/);
  assert.match(html, /Fehlerbehebung läuft/);
  assert.match(html, /Die Fehlerbehebung wird gerade ausgeführt/);
  assert.match(html, /Job #41/);
  assert.doesNotMatch(html, /action="\/admin\/content-agent\/drafts\/19\/optimize-review"/);
});

test('abgeschlossene Fehlerbehebung bietet bewusstes Neuladen ohne automatische Veröffentlichung', async () => {
  const partial = await renderFile(fileURLToPath(viewUrl('_reviewOptimizationStatus.ejs')), {
    postId: 19,
    status: {
      state: 'completed', active: false, blocksActions: false, jobId: 41,
      attempts: 1, maxAttempts: 3,
      message: 'Die Fehlerbehebung wurde erfolgreich abgeschlossen.',
      updatedAt: '2026-07-14T10:03:00.000Z', reloadRecommended: true
    }
  });

  assert.match(partial, /Fehlerbehebung abgeschlossen/);
  assert.match(partial, /href="\/admin\/content-agent\/drafts\/19\/edit"/);
  assert.match(partial, /data-review-optimization-reload/);
  assert.match(partial, /Aktualisierten Entwurf laden/);
  assert.doesNotMatch(partial, /publish|veröffentlichen/i);
});

test('fehlgeschlagene Fehlerbehebung verweist aus dem Entwurf auf Jobs und Protokolle', async () => {
  for (const state of ['failed', 'manual_attention']) {
    const partial = await renderFile(fileURLToPath(viewUrl('_reviewOptimizationStatus.ejs')), {
      postId: 19,
      status: {
        state, active: false, blocksActions: true, jobId: 41,
        attempts: 3, maxAttempts: 3,
        message: state === 'failed'
          ? 'Die Fehlerbehebung ist fehlgeschlagen.'
          : 'Die Fehlerbehebung benötigt eine manuelle Prüfung.',
        updatedAt: '2026-07-14T10:03:00.000Z', reloadRecommended: false
      }
    });

    assert.match(partial, /href="\/admin\/content-agent\/jobs"/);
    assert.match(partial, /Jobs &amp; Protokolle öffnen/);
    assert.match(partial, /data-review-optimization-jobs/);
  }
});

test('blockierte Prüfberichte bieten keine automatische Optimierung an', async () => {
  const partial = await renderFile(fileURLToPath(viewUrl('_riskChecklist.ejs')), {
    riskReview: {
      blocked: true,
      sourceCount: 1,
      items: [{
        code: 'risk_legal_claims', section: 'Artikel', anchor: 'draft-content-html',
        verificationType: 'legal', sourceRequired: true, blocking: true,
        excerpt: 'Rechtliche Aussage', reason: 'Prüfung nötig.', instruction: 'Quelle prüfen.'
      }]
    },
    postId: 19,
    csrf: 'csrf-test',
    reviewVersion: 3,
    actionsEnabled: false
  });

  assert.match(partial, /Veröffentlichung blockiert/);
  assert.doesNotMatch(partial, /optimize-review|Diesen Hinweis beheben|Alle Hinweise optimieren/);
});

test('Adminnavigation und Dashboard führen sichtbar zum Content-Agenten', async () => {
  const [header, adminDashboard] = await Promise.all([
    readFile(new URL('../views/partials/admin_header.ejs', import.meta.url), 'utf8'),
    readFile(new URL('../views/admin/dashboard.ejs', import.meta.url), 'utf8')
  ]);

  assert.match(header, /href="\/admin\/content-agent"/);
  assert.match(header, /Content-Agent/);
  assert.match(adminDashboard, /href="\/admin\/content-agent"/);
  assert.match(adminDashboard, /Content-Agent/);
});

test('Entwurfseditor enthält alle allowlist-Felder, CSRF und escaped HTML/FAQ mit Zählern', async () => {
  const draft = {
    id: 17,
    title: '<script>titel</script>',
    shortDescription: 'Kurzbeschreibung',
    slug: 'sicherer-entwurf',
    metaTitle: 'Sicherer Meta Title mit passender Länge für Berlin',
    metaDescription: 'Diese Meta Description erklärt den Entwurf ausreichend lang, konkret und sicher für kleine Unternehmen in Berlin.',
    ogTitle: 'OG-Titel',
    ogDescription: 'OG-Beschreibung',
    imageAlt: 'Alt-Text',
    contentHtml: '<section><h2>HTML</h2><script>alert(1)</script></section>',
    faqJsonText: '[{"question":"<img src=x>","answer":"Antwort"}]',
    riskReview: null
  };
  const html = await renderFile(fileURLToPath(viewUrl('draftEdit.ejs')), {
    ...baseLocals,
    draft,
    saved: false,
    queued: false
  });

  for (const name of [
    'title', 'shortDescription', 'slug', 'metaTitle', 'metaDescription',
    'ogTitle', 'ogDescription', 'imageAlt', 'contentHtml', 'faqJson'
  ]) {
    assert.match(html, new RegExp(`name="${name}"`));
  }
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /id="meta-title-count">0<\/strong>\/60/);
  assert.match(html, /id="meta-description-count">0<\/strong>\/160/);
  assert.match(html, /&lt;script&gt;titel&lt;\/script&gt;/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /name="published"|name="workflow_status"/);
});

test('Revisionseditor escaped Legacy-Inhalt, sperrt ihn und schützt die Freigabe mit CSRF', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('revisionEdit.ejs')), {
    ...baseLocals,
    revision: {
      id: 8,
      status: 'draft',
      revision_version: 4,
      snapshot_json: {
        base: {
          slug: 'bestand',
          content_format: 'legacy_ejs',
          updated_at: '2026-07-12T10:00:00.000Z'
        },
        fields: {
          title: '<script>Titel</script>',
          content: '<% globalThis.ausgefuehrt = true %><script>alert(1)</script>',
          faq_json: [{ question: '</textarea><script>faq</script>', answer: 'Antwort' }]
        }
      }
    },
    saved: false
  });
  assert.match(html, /name="content"[^>]*readonly/);
  assert.match(html, /name="confirmed" value="true"/);
  assert.match(html, /name="revision_version" value="4"/);
  assert.match(html, /name="expected_revision_version" value="4"/);
  assert.match(html, /name="_csrf" value="csrf-test"/);
  assert.match(html, /&lt;% globalThis\.ausgefuehrt = true %&gt;/);
  assert.doesNotMatch(html, /<script>(?:Titel|alert\(1\)|faq)<\/script>/);
});

test('Vergleich zeigt Livefassung, Revision, Sprungmarken und Quellen', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('revisionCompare.ejs')), {
    ...baseLocals,
    currentPathname: '/admin/content-agent/revisions/71/compare',
    comparison: {
      revisionId: 71,
      revisionVersion: 3,
      revisionStatus: 'draft',
      revalidationStatus: 'passed',
      revalidationStatusLabel: 'Erneut geprüft',
      approvalEnabled: true,
      qualityScore: 92,
      changeCount: 1,
      live: {
        title: '<script>Website-Relaunch planen</script>',
        excerpt: 'Bestehende Kurzbeschreibung',
        contentHtml: '<p>Alte Fassung.</p>'
      },
      optimized: {
        title: 'Website-Relaunch sicher planen',
        excerpt: 'Optimierte Kurzbeschreibung',
        contentHtml: '<p>Neue Fassung.</p>'
      },
      changes: [{
        id: 'a'.repeat(64),
        label: 'Meta Title',
        kind: 'modified',
        kindLabel: 'Geändert',
        kindIcon: 'fa-pen',
        status: 'active',
        statusLabel: 'Aktiv',
        reason: 'Konkreter <script>Nutzen</script>.',
        beforeExcerpt: 'Website-Relaunch planen',
        afterExcerpt: 'Website-Relaunch sicher planen',
        auditCodes: ['meta_title_missing'],
        revertible: true
      }],
      changeGroups: [{
        key: 'metadata',
        label: 'Meta-Daten',
        icon: 'fa-tags',
        changes: [{
          id: 'a'.repeat(64), label: 'Meta Title', kind: 'modified', kindLabel: 'Geändert',
          kindIcon: 'fa-pen', status: 'active', statusLabel: 'Aktiv', reason: 'Konkreter <script>Nutzen</script>.',
          beforeExcerpt: 'Website-Relaunch planen', afterExcerpt: 'Website-Relaunch sicher planen',
          auditCodes: ['meta_title_missing'], revertible: true
        }]
      }],
      sources: [{ title: '<img src=x onerror=alert(1)>Aktuelle Fachquelle', url: 'https://example.com/fachquelle' }],
      gscSignals: []
    }
  });

  assert.match(html, /Aktuelle Livefassung/);
  assert.match(html, /Optimierte Revision/);
  assert.match(html, /href="#change-[0-9a-f]{64}"/);
  assert.match(html, /id="change-[0-9a-f]{64}"/);
  assert.match(html, /Qualität 92\/100/);
  assert.match(html, /Verwendete Quellen/);
  assert.match(html, /Geändert/);
  assert.match(html, /fa-pen/);
  assert.match(html, /href="\/admin\/content-agent\/revisions\/71\/edit"/);
  assert.match(html, /href="\/admin\/content-agent\/existing-content"/);
  assert.match(html, /&lt;script&gt;Website-Relaunch planen&lt;\/script&gt;/);
  assert.match(html, /Konkreter &lt;script&gt;Nutzen&lt;\/script&gt;\./);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;Aktuelle Fachquelle/);
  assert.doesNotMatch(html, /<script>(?:Website-Relaunch planen|Nutzen)<\/script>|<img src=x onerror=/);
  const revertForm = html.match(/<form[^>]*action="\/admin\/content-agent\/revisions\/71\/changes\/[0-9a-f]{64}\/revert"[\s\S]*?<\/form>/)?.[0] || '';
  assert.match(revertForm, /method="post"/);
  assert.match(revertForm, /name="_csrf" value="csrf-test"/);
  assert.match(revertForm, /name="expected_revision_version" value="3"/);
  assert.match(revertForm, />\s*\u00c4nderung zurücknehmen\s*</);
  assert.match(html, /action="\/admin\/content-agent\/revisions\/71\/reject"/);
  assert.match(html, /action="\/admin\/content-agent\/revisions\/71\/publish"/);
  assert.match(html, /name="confirmed" value="true"/);
  const rejectForm = html.match(/<form[^>]*action="\/admin\/content-agent\/revisions\/71\/reject"[\s\S]*?<\/form>/)?.[0] || '';
  assert.match(rejectForm, /type="checkbox"[^>]*name="confirmed"[^>]*required/);
  assert.doesNotMatch(rejectForm, /type="hidden"[^>]*name="confirmed"/);
  assert.match(rejectForm, /vollständige Optimierungsrevision abgelehnt/);
  assert.match(html, /Erneut geprüft/);
  assert.doesNotMatch(html, /onclick=/i);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
});

test('nicht rücknehmbare Änderungen erklären die Sperre und fehlgeschlagene Revalidierung sperrt die Übernahme', async () => {
  const changeId = 'd'.repeat(64);
  const html = await renderFile(fileURLToPath(viewUrl('revisionCompare.ejs')), {
    ...baseLocals,
    comparison: {
      revisionId: 71,
      revisionVersion: 5,
      revisionStatus: 'draft',
      revalidationStatus: 'failed',
      revalidationStatusLabel: 'Erneute Prüfung fehlgeschlagen',
      approvalEnabled: false,
      approvalBlockedReason: 'Erst <script>Prüfung</script> abschließen.',
      live: { title: 'Live', contentHtml: '<p>Alt.</p>' },
      optimized: { title: 'Revision', contentHtml: '<p>Neu.</p>' },
      changes: [{
        id: changeId,
        label: 'Artikelinhalt',
        kind: 'modified',
        kindLabel: 'Geändert',
        kindIcon: 'fa-pen',
        status: 'active',
        statusLabel: 'Aktiv',
        beforeExcerpt: 'Alt',
        afterExcerpt: 'Neu',
        reason: 'Mehrdeutiger Block.',
        auditCodes: [],
        revertible: false,
        revertBlockedReason: 'Dieser HTML-Block ist nicht eindeutig zuordenbar.'
      }],
      changeGroups: [{
        key: 'content', label: 'Artikelinhalt', icon: 'fa-align-left',
        changes: [{
          id: changeId,
          label: 'Artikelinhalt',
          kind: 'modified',
          kindLabel: 'Geändert',
          kindIcon: 'fa-pen',
          status: 'active',
          statusLabel: 'Aktiv',
          beforeExcerpt: 'Alt',
          afterExcerpt: 'Neu',
          reason: 'Mehrdeutiger Block.',
          auditCodes: [],
          revertible: false,
          revertBlockedReason: 'Dieser HTML-Block ist nicht eindeutig zuordenbar.'
        }]
      }],
      sources: [],
      gscSignals: []
    }
  });

  assert.doesNotMatch(html, new RegExp(`/changes/${changeId}/revert`));
  assert.match(html, /Dieser HTML-Block ist nicht eindeutig zuordenbar/);
  assert.match(html, /Erneute Prüfung fehlgeschlagen/);
  assert.match(html, /Freigabe derzeit gesperrt/);
  assert.match(html, /Erst &lt;script&gt;Prüfung&lt;\/script&gt; abschließen\./);
  assert.doesNotMatch(html, /Erst <script>Prüfung<\/script> abschließen\./);
  assert.match(html, /action="\/admin\/content-agent\/revisions\/71\/publish"[\s\S]*?<button[^>]*disabled/);
  assert.match(html, /fa-triangle-exclamation/);
  assert.match(html, /hier nach erfolgreicher Prüfung ausdrücklich freigegeben/);
  assert.doesNotMatch(html, /im Editor ausdrücklich freigegeben/);
});

test('Vergleichsview verwendet nur bereinigtes Vorschau-HTML und keine Rohdatenattribute', async () => {
  const source = await readView('revisionCompare.ejs');

  assert.match(source, /<%-\s*comparison\.live\.contentHtml\s*%>/);
  assert.match(source, /<%-\s*comparison\.optimized\.contentHtml\s*%>/);
  assert.doesNotMatch(source, /stage_results_json|providerResponse|runtime_snapshot|optimization_report_json/i);
  assert.doesNotMatch(
    source,
    /data-(?:change|diff|reason|source)\s*=|\s(?:onclick|onchange|onsubmit|oninput|onerror)\s*=/i
  );
});

test('Revisionseditor verlinkt den geschützten Vergleich und bietet für KI-Revisionen keinen Publish-Bypass', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('revisionEdit.ejs')), {
    ...baseLocals,
    revision: {
      id: 8,
      optimization_job_id: 44,
      revision_version: 4,
      snapshot_json: { base: { content_format: 'static_html' }, fields: {} }
    },
    saved: false
  });

  assert.match(html, /href="\/admin\/content-agent\/revisions\/8\/compare"/);
  assert.match(html, /Vorher-Nachher vergleichen/);
  assert.match(html, /action="\/admin\/content-agent\/revisions\/8"/);
  assert.doesNotMatch(html, /action="\/admin\/content-agent\/revisions\/8\/publish"/);
  assert.match(html, /Freigabe im Vorher-Nachher-Vergleich/);
});

test('manuelle Audit-Revision erhält keinen toten Link zum KI-Vergleich', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('revisionEdit.ejs')), {
    ...baseLocals,
    revision: {
      id: 9,
      optimization_job_id: null,
      revision_version: 1,
      snapshot_json: { base: { content_format: 'static_html' }, fields: {} }
    },
    saved: false
  });

  assert.doesNotMatch(html, /revisions\/9\/compare/);
  assert.match(html, /action="\/admin\/content-agent\/revisions\/9"/);
  assert.match(html, /action="\/admin\/content-agent\/revisions\/9\/publish"/);
});

test('Vergleichs-CSS baut gleichwertige Spalten, feste Sprungnavigation und mobile Live-zuerst-Reihenfolge', async () => {
  const [adminCss, adminMinCss, manifestText] = await Promise.all([
    readFile(new URL('../public/admin.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin.min.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/css-asset-manifest.json', import.meta.url), 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(adminCss, /\.content-agent-compare__columns\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(adminCss, /\.content-agent-compare\s*\{[\s\S]*--content-agent-compare-topbar-height:\s*60px/);
  assert.match(adminCss, /\.content-agent-compare__jumpnav\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*var\(--content-agent-compare-sticky-top\)/);
  assert.match(adminCss, /\.content-agent-compare__change\s*\{[\s\S]*scroll-margin-top:\s*var\(--content-agent-compare-anchor-offset\)/);
  assert.match(adminCss, /@media\s*\(max-width:\s*960px\)[\s\S]*\.content-agent-compare__jumpnav\s*\{[\s\S]*position:\s*static[\s\S]*\.content-agent-compare__change\s*\{[\s\S]*scroll-margin-top:\s*calc\(var\(--content-agent-compare-topbar-height\)\s*\+\s*1rem\)/);
  assert.match(adminCss, /@media\s*\(max-width:\s*767\.98px\)[\s\S]*\.content-agent-compare__columns\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(adminCss, /\.content-agent-compare\s+:where\(a,\s*button,\s*summary\):focus-visible\s*\{[\s\S]*outline:\s*3px solid #fff;[\s\S]*box-shadow:\s*0 0 0 6px #0b2a46,\s*0 0 0 8px #ff7849/);
  assert.match(adminCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(adminMinCss, /content-agent-compare__columns/);
  assert.equal(manifest.assets['admin.css'].output, 'admin.min.css');
  assert.match(manifest.assets['admin.css'].href, /^\/admin\.min\.css\?v=[0-9a-f]{12}$/);
});
