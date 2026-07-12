import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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

test('Cockpit enthält bestätigte fünf Reiter und sichere Aktionsformulare', async () => {
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
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|localStorage/);
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
      faqJsonText: '[]'
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
  assert.equal((html.match(/name="confirmed" value="true"/g) || []).length, 1);
  assert.match(html, /name="reason"[^>]*maxlength="500"[^>]*required/);
  assert.match(html, /data-confirm="[^"]*(?:veröffentlichen|ablehnen)/i);
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
