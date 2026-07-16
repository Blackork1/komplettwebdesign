import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardPresentation,
  buildDraftListPresentation,
  buildExistingContentGroupsPresentation,
  buildExistingContentListPresentation,
  buildJobListPresentation,
  buildSchedulePresentation,
  buildSearchConsolePresentation,
  buildTechnologyPresentation,
  deriveReviewState,
  presentContentLearningDashboard,
  presentExistingContentOptimizationState,
  presentLegacyMigrationDashboard
} from '../services/contentAgent/adminPresentationService.js';

function existingContentPerformanceRow({
  id,
  impressions = 0,
  complete = true,
  coverageDayCount = 28,
  articleAgeDays = 30,
  hidden = false,
  hasSnapshot = true
} = {}) {
  return {
    id,
    title: `Artikel ${id}`,
    slug: `artikel-${id}`,
    updated_at: '2026-07-15T08:00:00.000Z',
    zero_impression_hidden: hidden,
    ...(hasSnapshot ? {
      performance_snapshot_id: 100 + id,
      performance_evaluated_through_date: '2026-07-14',
      performance_article_age_days: articleAgeDays,
      performance_windows_json: {
        7: { complete: true, coverageDayCount: 7, impressions },
        14: { complete: true, coverageDayCount: 14, impressions },
        28: { complete, coverageDayCount, impressions }
      },
      performance_status: 'stable',
      performance_data_eligible: true,
      performance_learning_eligible: false
    } : {})
  };
}

test('Search-Console-Präsentation bildet Variante A mit Zeitraum, Themenblöcken und Nicht-Tester-Chancen ab', () => {
  const result = buildSearchConsolePresentation({
    range: { start_date: '2026-06-16', end_date: '2026-07-13' },
    pages: [
      { page_url: '/website-tester/seo', clicks: 20, impressions: 1_000 },
      { page_url: '/en/website-tester/geo', clicks: 4, impressions: 250 },
      { page_url: '/blog/ki-suche', clicks: 8, impressions: 500 },
      { page_url: '/website-relaunch', clicks: 3, impressions: 150 }
    ],
    metrics: [
      { page_url: '/website-tester/seo', query: 'seo tester', clicks: 20, impressions: 1_000, ctr: 0.02, average_position: 7.2 },
      { page_url: '/blog/ki-suche', query: 'seo für ki suche', clicks: 8, impressions: 500, ctr: 0.016, average_position: 11.4 }
    ],
    opportunities: [],
    provider: null
  });

  assert.deepEqual(result.summary, {
    queryCount: 2,
    clicks: '35',
    impressions: '1.900',
    ctr: '1,84 %',
    opportunityCount: 0,
    periodLabel: '16.06.–13.07.2026',
    periodDetail: '28 gespeicherte Tage'
  });
  assert.deepEqual(result.categories.map((category) => category.key), [
    'website_testers', 'blog_guides', 'services', 'local_industries', 'other'
  ]);
  assert.equal(result.categories[0].impressions, '1.250');
  assert.equal(result.categories[0].languages.find((item) => item.key === 'en').impressions, '250');
  assert.equal(result.categories[0].subcategories.find((item) => item.key === 'seo').impressions, '1.000');
  assert.equal(result.contentOpportunities[0].query, 'seo für ki suche');
  assert.equal(result.contentOpportunities[0].categoryLabel, 'Blog & Ratgeber');
});

test('Legacy-Migrationsdashboard gibt ausschließlich normalisierte Darstellungswerte aus', () => {
  const result = presentLegacyMigrationDashboard({
    totalCount: 4,
    lastScanAt: '2026-07-16T10:00:00.000Z',
    readyStatic: [{
      id: 10,
      post_id: 1,
      title: 'Statischer Artikel',
      slug: 'statischer-artikel',
      status: 'ready',
      migration_class: 'static_legacy',
      analysis_json: { ejsCount: 0 },
      blocking_issues_json: [],
      updated_at: '2026-07-16T10:00:00.000Z'
    }],
    reviewRequired: [{
      id: 11,
      post_id: 2,
      title: 'Aktives EJS',
      slug: 'aktives-ejs',
      status: 'ready',
      migration_class: 'active_ejs',
      analysis_json: { ejsCount: 2 },
      blocking_issues_json: [],
      updated_at: '2026-07-16T09:00:00.000Z'
    }],
    blocked: [{
      id: 12,
      post_id: 3,
      title: 'Blockiert',
      slug: 'blockiert',
      status: 'blocked',
      migration_class: 'static_legacy',
      analysis_json: { ejsCount: 0 },
      blocking_issues_json: [{ message: 'Eingebettete Styles benötigen eine Einzelprüfung.' }],
      updated_at: '2026-07-16T08:00:00.000Z'
    }],
    migrated: [{
      id: 13,
      post_id: 4,
      title: 'Migriert',
      slug: 'migriert',
      status: 'migrated',
      migration_class: 'static_legacy',
      analysis_json: { ejsCount: 0 },
      blocking_issues_json: [],
      updated_at: '2026-07-16T07:00:00.000Z'
    }]
  });

  assert.equal(result.totalCount, 4);
  assert.equal(result.readyStaticCount, 1);
  assert.equal(result.reviewRequiredCount, 1);
  assert.equal(result.blockedCount, 1);
  assert.equal(result.migratedCount, 1);
  assert.match(result.lastScanLabel, /16\.07\.2026/);
  assert.deepEqual(result.readyStatic[0], {
    id: 10,
    postId: 1,
    title: 'Statischer Artikel',
    slug: 'statischer-artikel',
    previewUrl: '/admin/content-agent/existing-content/legacy-migrations/10/preview',
    migrateUrl: '/admin/content-agent/existing-content/legacy-migrations/10/migrate',
    rollbackUrl: '/admin/content-agent/existing-content/legacy-migrations/10/rollback',
    statusLabel: 'Freigabefähig',
    statusTone: 'success',
    ejsCount: 0,
    updatedLabel: '16.07.2026, 12:00 Uhr (MESZ)',
    primaryIssue: null,
    canMigrate: true,
    canRollback: false
  });
  assert.equal(result.blocked[0].primaryIssue, 'Eingebettete Styles benötigen eine Einzelprüfung.');
  assert.equal(result.migrated[0].canRollback, true);
});

test('Lernregel-Dashboard gibt nur begrenzte, sichere Präsentationsfelder aus', () => {
  const dashboard = presentContentLearningDashboard({
    proposals: [{
      id: 3,
      category_key: 'cta_repetition_or_fit',
      status: 'pending',
      proposal_version: 2,
      suggested_rule_text: '<script>nicht ausführen</script> Formuliere CTAs eindeutig und passend zum Entscheidungsschritt, ohne gleiche Impulse zu wiederholen.',
      target_stages: ['writer', 'reviewer'],
      evidence_count: 3,
      evidence_json: [{
        post_id: 11,
        review_version: 4,
        reason: 'Mehrere CTAs ähneln sich.',
        instruction: 'Unterscheide die Handlungsimpulse.',
        raw_provider_response: 'geheim'
      }],
      expected_effect: 'Weniger wiederholte CTAs.',
      overfit_warning: 'CTA-Positionen nicht verändern.',
      runtime_snapshot_json: { secret: true }
    }],
    rules: [{
      id: 8,
      category_key: 'generic_content',
      status: 'active',
      current_version: 1,
      rule_revision: 3,
      rule_text: 'Formuliere zentrale Abschnitte konkret für die Zielgruppe und ersetze austauschbare Aussagen durch nachvollziehbare Empfehlungen.',
      target_stages: ['seo_brief', 'writer', 'reviewer'],
      updated_by_admin_name: 'Admin Ä',
      updated_at: '2026-07-14T08:00:00.000Z',
      article_html: '<article>vollständig</article>',
      effectiveness: {
        status: 'effective', articleCount: 6, recurrenceCount: 1,
        baselineRate: 0.6, currentRate: 1 / 6, averageQualityScore: 91,
        gsc: { clicks: 12, impressions: 400, ctr: 0.03, averagePosition: 8.4 }
      }
    }],
    observations: [{
      category_key: 'generic_content', article_count: 4, observation_count: 6,
      post_ids: [11, 12], last_seen_at: '2026-07-14T07:00:00.000Z'
    }],
    unclassified: { article_count: 2, observation_count: 3, last_seen_at: '2026-07-13T07:00:00.000Z' },
    events: [{
      id: 19, event_type: 'rule_revised', category_key: 'generic_content',
      rule_version: 2, admin_name: 'Admin Ä', created_at: '2026-07-14T08:00:00.000Z',
      details_json: { providerResponse: 'geheim' }
    }]
  });

  assert.equal(dashboard.proposals[0].categoryLabel, 'CTA-Wiederholung oder fehlende Passung');
  assert.equal(dashboard.proposals[0].evidence[0].postId, 11);
  assert.deepEqual(dashboard.rules[0].targetStageLabels, ['SEO-Briefing', 'Artikelerstellung', 'Redaktionelle Prüfung']);
  assert.equal(dashboard.rules[0].effectiveness.statusLabel, 'Wirksam');
  assert.equal(dashboard.rules[0].effectiveness.gsc.impressionsLabel, '400');
  assert.equal(dashboard.events[0].eventLabel, 'Neue Regelversion aktiviert');
  assert.doesNotMatch(JSON.stringify(dashboard), /runtime_snapshot_json|raw_provider_response|providerResponse|article_html|vollständig|geheim/i);
});

test('Performance-Lernbelege werden mit Messstand und sicherem Artikellink präsentiert', () => {
  const dashboard = presentContentLearningDashboard({
    proposals: [{
      id: 21,
      category_key: 'performance_snippet_intent',
      status: 'pending',
      proposal_version: 1,
      suggested_rule_text: 'Plane Titel, Meta-Description und Einstieg so, dass Nutzen und Suchintention präzise übereinstimmen.',
      target_stages: ['seo_brief', 'writer', 'reviewer'],
      evidence_count: 3,
      evidence_json: [{
        post_id: 12,
        snapshot_id: 44,
        evaluated_through_date: '2026-07-15',
        evidence_code: 'snippet_or_intent_opportunity',
        evidence_kind: 'diagnosis',
        windows: { 28: { impressions: 80, clicks: 0 } },
        query: '<script>niemals ausgeben</script>'
      }],
      expected_effect: 'Suchergebnis und Einstieg vermitteln denselben Nutzen.',
      overfit_warning: 'Kein Clickbait und keine Überanpassung.'
    }]
  });
  const evidence = dashboard.proposals[0].evidence[0];
  assert.equal(evidence.sourceLabel, 'Performance');
  assert.equal(evidence.measurementDateLabel, '15.07.2026');
  assert.equal(evidence.impressions, 80);
  assert.equal(evidence.clicks, 0);
  assert.equal(evidence.articleUrl, '/admin/content-agent/existing-content/12/performance');
  assert.equal(JSON.stringify(evidence).includes('script'), false);
});
import {
  canRetryContentJobManually
} from '../services/contentAgent/contentJobRetryPolicy.js';

test('Zeitplanvorschau zeigt nächste Erstellung und Veröffentlichung eindeutig in Berlinzeit', () => {
  const result = buildSchedulePresentation({
    agent_enabled: true,
    schedule_weekdays: [1, 4],
    schedule_time: '18:00:00',
    timezone: 'Europe/Berlin',
    generation_lead_hours: 4,
    manual_approvals_count: 0
  }, new Date('2026-07-12T10:00:00.000Z'));

  assert.match(result.nextGenerationLabel, /13\.07\.2026, 14:00 Uhr/);
  assert.match(result.nextPublicationLabel, /13\.07\.2026, 18:00 Uhr/);
  assert.deepEqual(result.weeklyPreview.map((item) => item.label), [
    'Montag: Erstellung 14:00 Uhr · Veröffentlichung 18:00 Uhr',
    'Donnerstag: Erstellung 14:00 Uhr · Veröffentlichung 18:00 Uhr'
  ]);
});

test('Zeitplanvorschau springt nach verpasster Erstellung auf den nächsten Wochen-Slot', () => {
  const result = buildSchedulePresentation({
    agent_enabled: true,
    schedule_weekdays: [1],
    schedule_time: '18:00:00',
    timezone: 'Europe/Berlin',
    generation_lead_hours: 4
  }, new Date('2026-07-13T13:00:00.000Z'));

  assert.match(result.nextGenerationLabel, /20\.07\.2026, 14:00 Uhr/);
  assert.match(result.nextPublicationLabel, /20\.07\.2026, 18:00 Uhr/);
});

test('Entwurfsliste berechnet den Erstellungszeitpunkt serverseitig', () => {
  const [draft] = buildDraftListPresentation([{
    id: 7,
    scheduled_at: '2026-07-13T16:00:00.000Z'
  }], new Date('2026-07-12T10:00:00.000Z'), {
    timezone: 'Europe/Berlin',
    generationLeadHours: 4
  });
  assert.match(draft.generationAtLabel, /13\.07\.2026, 14:00 Uhr/);
});

test('Reviewstatus wird ausschließlich aus Post und serverseitigem now abgeleitet', () => {
  const now = new Date('2026-07-12T09:00:00.000Z');
  assert.equal(deriveReviewState({
    workflow_status: 'needs_review',
    published: false,
    scheduled_at: '2026-07-12T08:00:00.000Z'
  }, now), 'missed');
  assert.equal(deriveReviewState({
    workflow_status: 'needs_review',
    published: false,
    scheduled_at: '2026-07-12T09:00:00.000Z'
  }, now), 'needs_review');
  assert.equal(deriveReviewState({
    workflow_status: 'needs_review',
    published: false,
    scheduled_at: null
  }, now), 'needs_review');
  assert.equal(deriveReviewState({
    workflow_status: 'approved_scheduled',
    published: false,
    scheduled_at: '2026-07-12T10:00:00.000Z'
  }, now), 'approved_scheduled');
  assert.equal(deriveReviewState({
    workflow_status: 'published',
    published: true,
    scheduled_at: '2026-07-12T08:00:00.000Z'
  }, now), 'published');
});

test('Draftpräsentation zeigt Berlin-Zeit, Versionen und nur einen sicheren Mailfehlercode', () => {
  const [draft] = buildDraftListPresentation([{
    id: 11,
    title: 'Terminierter Entwurf',
    generated_by_ai: true,
    content_format: 'static_html',
    workflow_status: 'needs_review',
    published: false,
    scheduled_at: '2026-07-12T09:15:00.000Z',
    review_version: 4,
    approved_review_version: 3,
    publication_version: 2,
    notification_status: 'failed',
    notification_attempts: 6,
    notification_last_error_code: 'smtp_etimedout',
    notification_updated_at: '2026-07-12T08:30:00.000Z',
    notification_last_error: 'smtp://intern:passwort@example.test'
  }], new Date('2026-07-12T08:00:00.000Z'));

  assert.equal(draft.reviewState, 'needs_review');
  assert.equal(draft.scheduledAtLabel, '12.07.2026, 11:15 Uhr (MESZ)');
  assert.equal(draft.reviewVersion, 4);
  assert.equal(draft.approvalVersion, 3);
  assert.equal(draft.publicationVersion, 2);
  assert.deepEqual(draft.notification, {
    status: 'failed',
    statusLabel: 'Versand fehlgeschlagen',
    attempts: 6,
    lastAttemptAt: '2026-07-12T08:30:00.000Z',
    lastAttemptAtLabel: '12.07.2026, 10:30 Uhr (MESZ)',
    lastErrorCode: 'smtp_etimedout',
    canRetry: true
  });
  assert.doesNotMatch(JSON.stringify(draft), /passwort|notification_last_error/);
});

test('Berliner Rückstellungsstunde zeigt beide 02:30-Instants eindeutig an', () => {
  const drafts = buildDraftListPresentation([
    {
      generated_by_ai: true,
      content_format: 'static_html',
      workflow_status: 'needs_review',
      published: false,
      scheduled_at: '2026-10-25T00:30:00.000Z'
    },
    {
      generated_by_ai: true,
      content_format: 'static_html',
      workflow_status: 'needs_review',
      published: false,
      scheduled_at: '2026-10-25T01:30:00.000Z'
    }
  ], new Date('2026-10-24T12:00:00.000Z'));

  assert.equal(drafts[0].scheduledAtLabel, '25.10.2026, 02:30 Uhr (MESZ)');
  assert.equal(drafts[1].scheduledAtLabel, '25.10.2026, 02:30 Uhr (MEZ)');
  assert.notEqual(drafts[0].scheduledAtLabel, drafts[1].scheduledAtLabel);
});

test('veröffentlichte Posts geben selbst bei temporärem Deliveryfehler keinen Mailretry frei', () => {
  const [draft] = buildDraftListPresentation([{
    generated_by_ai: true,
    content_format: 'static_html',
    workflow_status: 'published',
    published: true,
    published_at: '2026-07-12T09:00:00.000Z',
    notification_status: 'failed',
    notification_attempts: 6,
    notification_last_error_code: 'smtp_etimedout'
  }], new Date('2026-07-12T10:00:00.000Z'));

  assert.equal(draft.reviewState, 'published');
  assert.equal(draft.notification.canRetry, false);
});

test('Mailretry bleibt für unklare, abgelehnte und nicht ausgeschöpfte Zustellungen gesperrt', () => {
  const deliveries = [
    ['outcome_uncertain', 'failed', 6],
    ['smtp_outcome_uncertain', 'failed', 6],
    ['smtp_etimedout', 'failed', 5],
    [null, 'sent', 1],
    [null, 'sending', 1]
  ];
  for (const [code, status, attempts] of deliveries) {
    const [draft] = buildDraftListPresentation([{
      generated_by_ai: true,
      content_format: 'static_html',
      workflow_status: 'needs_review',
      published: false,
      notification_status: status,
      notification_attempts: attempts,
      notification_last_error_code: code
    }], new Date('2026-07-12T08:00:00.000Z'));
    assert.equal(draft.notification.canRetry, false, `${status}/${attempts}/${code}`);
  }
});

test('Jobpräsentation zeigt bereinigte Fehler und letzte sichere Stufe', () => {
  const [job] = buildJobListPresentation([{
    id: 7,
    job_type: 'generate_weekly_draft',
    status: 'failed',
    current_stage: 'image_generation',
    last_error: 'Upload fehlgeschlagen token=sk-abcdefgh12345678\nInterner Stack',
    attempts: 3,
    max_attempts: 3
  }]);

  assert.equal(job.statusLabel, 'Endgültig fehlgeschlagen');
  assert.equal(job.lastSafeStageLabel, 'Bildgenerierung');
  assert.equal(job.canRetry, true);
  assert.doesNotMatch(job.lastError, /sk-abcdefgh12345678|Interner Stack/);
});

test('Jobpräsentation öffnet Bestandsrevisionen statt veröffentlichte Artikel als KI-Entwurf', () => {
  const [job] = buildJobListPresentation([{
    id: 3085,
    job_type: 'optimize_existing_post',
    status: 'completed',
    post_id: 40,
    post_is_ai_draft: false,
    optimization_revision_id: 3,
    optimization_revision_status: 'draft',
    attempts: 1,
    max_attempts: 3
  }]);

  assert.equal(job.contentActionLabel, 'Revision öffnen');
  assert.equal(job.contentUrl, '/admin/content-agent/revisions/3/edit');
  assert.doesNotMatch(job.contentUrl, /\/drafts\/40/);
});

test('Jobpräsentation behält die Vorschau für echte unveröffentlichte KI-Entwürfe bei', () => {
  const [job] = buildJobListPresentation([{
    id: 51,
    job_type: 'generate_weekly_draft',
    status: 'completed',
    post_id: 19,
    post_is_ai_draft: true,
    attempts: 1,
    max_attempts: 3
  }]);

  assert.equal(job.contentActionLabel, 'Entwurf öffnen');
  assert.equal(job.contentUrl, '/admin/content-agent/drafts/19/preview');
});

test('Jobpräsentation blendet den Retry am manuellen Sicherheitslimit aus', () => {
  const [job] = buildJobListPresentation([{
    id: 8,
    job_type: 'generate_weekly_draft',
    status: 'failed',
    attempts: 5,
    max_attempts: 5
  }]);

  assert.equal(job.canRetry, false);
});

test('unklarer Providerausgang ist kein normaler Adminretry', () => {
  assert.equal(canRetryContentJobManually({
    jobType: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 4,
    lastError: 'provider_execution_uncertain'
  }), false);
});

test('Jobpräsentation bietet nur die bestätigte Providerwiederherstellung an', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 4,
    max_attempts: 4,
    last_error: 'provider_execution_uncertain',
    post_id: null,
    open_provider_reservation_count: 1,
    open_provider_stage: 'seo_brief'
  }]);

  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverProvider, true);
  assert.equal(job.providerRecoveryStageLabel, 'SEO-Briefing');
  assert.equal(
    job.providerRecoveryActionLabel,
    'Reservierung verwerfen und SEO-Briefing erneut erstellen'
  );
});

test('Providerwiederherstellung bleibt ohne eindeutige offene Reservierung gesperrt', () => {
  for (const openProviderReservationCount of [0, 2]) {
    const [job] = buildJobListPresentation([{
      id: 1,
      job_type: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      attempts: 4,
      last_error: 'provider_execution_uncertain',
      post_id: null,
      open_provider_reservation_count: openProviderReservationCount,
      open_provider_stage: 'seo_brief'
    }]);
    assert.equal(job.canRetry, false);
    assert.equal(job.canRecoverProvider, false);
  }
});

test('bekannter OpenAI-Schemafehler bleibt für genau einen Reparaturversuch sichtbar', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 5,
    max_attempts: 5,
    last_error: 'provider_execution_uncertain',
    post_id: null,
    open_provider_reservation_count: 1,
    open_provider_stage: 'seo_brief',
    provider_pre_execution_schema_rejection: true
  }]);

  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverProvider, true);
  assert.equal(job.providerRecoveryStageLabel, 'SEO-Briefing');
});

test('vor Ausführung abgelehnte Artikelerstellung bietet genau eine bestätigte Fortsetzung an', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 6,
    max_attempts: 6,
    last_error: 'provider_request_rejected',
    current_stage: 'seo_brief',
    post_id: null,
    open_provider_reservation_count: 0,
    provider_rejected_schema_repairable: true,
    provider_rejected_stage: 'article_generation'
  }]);

  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverProvider, false);
  assert.equal(job.canRecoverRejectedProvider, true);
  assert.equal(job.rejectedProviderRecoveryStageLabel, 'Artikelerstellung');
  assert.equal(
    job.rejectedProviderRecoveryActionLabel,
    'Artikelerstellung nach Schema-Korrektur fortsetzen'
  );
});

test('abgelehnte Artikelerstellung bleibt nach dem Reparaturversuch gesperrt', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 7,
    max_attempts: 7,
    last_error: 'provider_request_rejected',
    current_stage: 'seo_brief',
    post_id: null,
    open_provider_reservation_count: 0,
    provider_rejected_schema_repairable: true,
    provider_rejected_stage: 'article_generation'
  }]);

  assert.equal(job.canRecoverRejectedProvider, false);
});

test('HTML-Vertragsfehler bietet genau eine bestätigte gezielte Qualitätswiederaufnahme an', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 7,
    max_attempts: 7,
    last_error: 'quality_gate_failed',
    current_stage: 'validation',
    post_id: null,
    open_provider_reservation_count: 0,
    quality_gate_structure_repairable: true
  }]);

  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverProvider, false);
  assert.equal(job.canRecoverRejectedProvider, false);
  assert.equal(job.canRecoverQualityGate, true);
  assert.equal(job.qualityGateRecoveryActionLabel, 'HTML-Struktur gezielt reparieren und erneut prüfen');
});

test('Qualitätswiederaufnahme bleibt mit offener Reservierung oder nach dem Sonderversuch gesperrt', () => {
  for (const input of [
    { attempts: 7, openReservationCount: 1 },
    { attempts: 8, openReservationCount: 0 }
  ]) {
    const [job] = buildJobListPresentation([{
      id: 1,
      job_type: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      attempts: input.attempts,
      max_attempts: input.attempts,
      last_error: 'quality_gate_failed',
      current_stage: 'validation',
      post_id: null,
      open_provider_reservation_count: input.openReservationCount,
      quality_gate_structure_repairable: true
    }]);

    assert.equal(job.canRecoverQualityGate, false);
  }
});

test('Manifestfehler nach Qualitätsfreigabe bietet nur die kontrollierte Regelstand-Übernahme an', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 8,
    max_attempts: 8,
    last_error: 'CONTENT_RULE_MANIFEST_MISMATCH',
    current_stage: 'validation',
    post_id: null,
    open_provider_reservation_count: 0,
    quality_gate_manifest_repairable: true
  }]);

  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverQualityGate, false);
  assert.equal(job.canRecoverQualityGateManifest, true);
  assert.equal(
    job.qualityGateManifestRecoveryActionLabel,
    'Aktuellen Regelstand übernehmen und Strukturreparatur fortsetzen'
  );
});

test('Manifestwiederaufnahme bleibt mit Providerreservierung oder nach Versuch neun gesperrt', () => {
  for (const input of [
    { attempts: 8, openReservationCount: 1 },
    { attempts: 9, openReservationCount: 0 }
  ]) {
    const [job] = buildJobListPresentation([{
      id: 1,
      job_type: 'generate_weekly_draft',
      status: 'needs_manual_attention',
      attempts: input.attempts,
      max_attempts: input.attempts,
      last_error: 'CONTENT_RULE_MANIFEST_MISMATCH',
      current_stage: 'validation',
      post_id: null,
      open_provider_reservation_count: input.openReservationCount,
      quality_gate_manifest_repairable: true
    }]);
    assert.equal(job.canRecoverQualityGateManifest, false);
  }
});

test('technisch bestandener Artikel bietet nach falschem KI-Strukturblocker nur die redaktionelle Neuprüfung an', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 9,
    max_attempts: 9,
    last_error: 'quality_gate_failed',
    current_stage: 'review',
    post_id: null,
    open_provider_reservation_count: 0,
    editorial_review_recoverable: true,
    error_report_json: {
      code: 'quality_gate_failed'
    },
    latest_review_issues: [
      { code: 'cta_count_exceeds_briefing', message: 'Vier CTA statt drei.' },
      { code: 'faq_structural_check', message: 'FAQ-Struktur prüfen.' }
    ]
  }]);

  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverQualityGate, false);
  assert.equal(job.canRecoverQualityGateManifest, false);
  assert.equal(job.canRecoverEditorialReview, true);
  assert.equal(job.editorialReviewRecoveryActionLabel, 'Nur redaktionelle Prüfung erneut ausführen');
  assert.deepEqual(job.qualityIssues, [
    'Vier CTA statt drei.',
    'FAQ-Struktur prüfen.'
  ]);
});

test('fehlgeschlagene Metadatenspeicherung bietet nur die sichere Entwurfsfertigstellung an', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'failed',
    attempts: 10,
    max_attempts: 10,
    last_error: 'value too long for type character varying(80)',
    current_stage: 'image_cleanup',
    post_id: null,
    open_provider_reservation_count: 0,
    draft_persistence_recoverable: true,
    error_report_json: {
      code: 'pipeline_failed',
      message: 'value too long for type character varying(80)'
    }
  }]);

  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverEditorialReview, false);
  assert.equal(job.canRecoverDraftPersistence, true);
  assert.equal(job.draftPersistenceRecoveryActionLabel, 'Entwurf mit neuem Bild fertigstellen');
});

test('Draftpräsentation reduziert Qualitätsdaten auf sichere Kennzahlen', () => {
  const [draft] = buildDraftListPresentation([{
    id: 11,
    title: 'Sicherer Entwurf',
    content: '<article>vollständiger Artikel</article>',
    quality_report_json: {
      focusedReview: { blocked: true, items: [{ code: 'RISK' }] },
      prompt: 'Geheimer Prompt'
    },
    quality_score: '91',
    cost_estimate: '1.234'
  }]);

  assert.equal(draft.riskBlocked, true);
  assert.equal(draft.riskCount, 1);
  assert.equal(draft.qualityScore, 91);
  assert.equal(draft.costEur, 1.234);
  assert.doesNotMatch(JSON.stringify(draft), /vollständiger Artikel|Geheimer Prompt|quality_report_json/);
});

test('Dashboardstatus basiert ausschließlich auf dem persistierten Worker-Heartbeat', () => {
  const now = new Date('2026-07-11T10:01:00.000Z');
  const active = buildDashboardPresentation({
    settings: { agent_enabled: true, operating_mode: 'review', monthly_budget_cents: 2500 },
    worker: { heartbeat_at: '2026-07-11T10:00:00.000Z' },
    approvals: 8
  }, now);
  const stale = buildDashboardPresentation({
    settings: { agent_enabled: true, operating_mode: 'review' },
    worker: { heartbeat_at: '2026-07-11T09:58:00.000Z' }
  }, now);

  assert.deepEqual(active.worker, { healthy: true, label: 'Worker aktiv' });
  assert.deepEqual(stale.worker, { healthy: false, label: 'Worker nicht erreichbar' });
  assert.equal(active.approvals.ready, true);
});

test('Dashboard zeigt die bereits technisch gekappte Budgetgrenze', () => {
  const result = buildDashboardPresentation({
    settings: { agent_enabled: true, monthly_budget_cents: 5000 },
    budgetUsed: 4.5,
    budgetLimitEur: 25
  });
  assert.deepEqual(result.budget, { usedEur: 4.5, limitEur: 25 });
});

test('Technikpräsentation übernimmt nur redigierte Werte und bleibt schreibgeschützt', () => {
  const presentation = buildTechnologyPresentation({
    contentModel: { value: 'gpt-content', source: '.env', editable: false, restartRequired: true },
    workerPollMs: { value: 5000, source: '.env', editable: false, restartRequired: true },
    openaiApiKey: { value: 'sk-geheim', source: '.env' }
  }, {
    appVersion: '1.2.3',
    workerVersion: 'worker-9',
    now: new Date('2026-07-11T10:01:00.000Z'),
    worker: { heartbeat_at: '2026-07-11T10:00:00.000Z', worker_id: 'intern' },
    providers: [{
      provider_name: 'openai',
      last_success_at: '2026-07-11T09:59:00.000Z',
      last_failure_at: null,
      last_error_code: null,
      internal_secret: 'nicht ausgeben'
    }]
  });

  assert.equal(presentation.technical.contentModel.editable, false);
  assert.equal(presentation.versions.app.value, '1.2.3');
  assert.equal(presentation.versions.worker.value, 'worker-9');
  assert.deepEqual(presentation.worker, {
    healthy: true,
    label: 'Worker aktiv',
    heartbeatAt: '2026-07-11T10:00:00.000Z'
  });
  const serialized = JSON.stringify(presentation);
  assert.doesNotMatch(serialized, /sk-geheim|openaiApiKey|worker_id|internal_secret|nicht ausgeben/);
});

test('Providerfehler bleibt bei identischen Erfolgs- und Fehlerzeitstempeln sichtbar', () => {
  const instant = '2026-07-11T10:00:00.000Z';
  const presentation = buildTechnologyPresentation({}, {
    providers: [{
      provider_name: 'openai',
      last_success_at: instant,
      last_failure_at: instant,
      last_error_code: 'RATE_LIMIT'
    }]
  });

  assert.equal(presentation.providers[0].healthy, false);
  assert.equal(presentation.providers[0].statusLabel, 'Fehler gemeldet');
  assert.equal(presentation.providers[0].lastErrorCode, 'RATE_LIMIT');
});

test('Bestandspräsentation verwirft unbekannte Rohfelder', () => {
  const [presented] = buildExistingContentListPresentation([{
    id: 4,
    title: 'Artikel',
    slug: 'artikel',
    updated_at: '2026-07-11T12:00:00.000Z',
    content: '<p>Rohinhalt</p>',
    payload_json: { geheim: true }
  }]);
  const { performance, ...rest } = presented;
  assert.deepEqual(rest, {
    id: 4,
    title: 'Artikel',
    slug: 'artikel',
    updatedAt: '2026-07-11T12:00:00.000Z',
    zeroImpressionHidden: false,
    optimization: {
      state: 'idle', active: false, terminal: false, canStart: true,
      canDiscard: false, discardActionUrl: null,
      statusLabel: 'Noch nicht gestartet', stageLabel: 'Noch keine Stufe',
      message: 'Noch keine KI-Optimierung gestartet.', jobId: null,
      revisionId: null, revisionUrl: null, errorCode: null,
      unsafeProviderState: false, updatedAt: null
    }
  });
  assert.deepEqual(Object.keys(performance).sort(), [
    'articleAgeDays',
    'detailUrl',
    'evaluatedThroughDateLabel',
    'hasSnapshot',
    'headline',
    'isEligible',
    'learningEligible',
    'status',
    'windows'
  ]);
  assert.equal(performance.detailUrl, '/admin/content-agent/existing-content/4/performance');
  assert.doesNotMatch(JSON.stringify(presented), /Rohinhalt|payload_json|geheim/);
});

test('Bestandsgruppen trennen Sichtbarkeit, Datensammlung, null und ausgeblendet', () => {
  const groups = buildExistingContentGroupsPresentation([
    existingContentPerformanceRow({ id: 1, impressions: 4 }),
    existingContentPerformanceRow({
      id: 2, impressions: 0, complete: false, coverageDayCount: 12
    }),
    existingContentPerformanceRow({ id: 3, impressions: 0 }),
    existingContentPerformanceRow({ id: 4, impressions: 0, hidden: true }),
    existingContentPerformanceRow({ id: 5, hasSnapshot: false })
  ]);

  assert.equal(groups.totalCount, 5);
  assert.deepEqual(groups.visibleArticles.map(({ id }) => id), [1]);
  assert.deepEqual(groups.collectingArticles.map(({ id }) => id), [2, 5]);
  assert.deepEqual(groups.zeroImpressionArticles.map(({ id }) => id), [3]);
  assert.deepEqual(groups.hiddenZeroImpressionArticles.map(({ id }) => id), [4]);
  assert.equal(groups.zeroImpressionArticles[0].zeroImpressionHidden, false);
  assert.equal(groups.hiddenZeroImpressionArticles[0].zeroImpressionHidden, true);
});

test('gespeicherte Ausblendung wird bei neuen Impressionen ignoriert', () => {
  const groups = buildExistingContentGroupsPresentation([
    existingContentPerformanceRow({ id: 6, impressions: 1, hidden: true })
  ]);

  assert.deepEqual(groups.visibleArticles.map(({ id }) => id), [6]);
  assert.equal(groups.hiddenZeroImpressionArticles.length, 0);
});

test('junge, unvollständige und fehlerhafte Messwerte bleiben in der Datensammlung', () => {
  const malformed = existingContentPerformanceRow({ id: 10 });
  malformed.performance_windows_json[28].impressions = 'keine Kennzahl';
  const groups = buildExistingContentGroupsPresentation([
    existingContentPerformanceRow({ id: 7, articleAgeDays: 27 }),
    existingContentPerformanceRow({ id: 8, coverageDayCount: 27 }),
    existingContentPerformanceRow({ id: 9, complete: false }),
    malformed
  ]);

  assert.deepEqual(groups.collectingArticles.map(({ id }) => id), [7, 8, 9, 10]);
  assert.equal(groups.zeroImpressionArticles.length, 0);
  assert.equal(groups.hiddenZeroImpressionArticles.length, 0);
});

test('Bestandsgruppen reichen weder Snapshotrohfelder noch unbekannte Präferenzen durch', () => {
  const row = existingContentPerformanceRow({ id: 11, impressions: 0 });
  row.unbekannte_praeferenz = 'geheim';
  const groups = buildExistingContentGroupsPresentation([row]);
  const serialized = JSON.stringify(groups);

  assert.doesNotMatch(serialized, /performance_windows_json|unbekannte_praeferenz|geheim/);
  assert.match(serialized, /zeroImpressionHidden/);
});

test('Bestandspräsentation zeigt Outcomes ausschließlich neutral, endlich und mit begrenzten Queries', () => {
  const [item] = buildExistingContentListPresentation([{
    id: 4,
    title: 'Artikel',
    slug: 'artikel',
    updated_at: '2026-07-11T12:00:00.000Z',
    outcome_evaluation_status: 'evaluated',
    outcome_baseline_clicks: '4',
    outcome_baseline_impressions: '80',
    outcome_baseline_ctr: '0.05',
    outcome_baseline_average_position: '12.5',
    outcome_followup_clicks: '8',
    outcome_followup_impressions: '100',
    outcome_followup_ctr: '0.08',
    outcome_followup_average_position: '9.5',
    outcome_changes_json: {
      clicks: 4, impressions: 20, ctr: 0.03, averagePosition: -3,
      raw: 'nicht übernehmen'
    },
    outcome_new_queries_json: Array.from({ length: 8 }, (_, index) => ({
      query: index === 0 ? ' <script>alert(1)</script>\n ' : `Neue   Suche ${index}`,
      clicks: 2,
      impressions: 20,
      provider: 'nicht übernehmen'
    })),
    outcome_lost_queries_json: [{ query: 'Alte Suche', clicks: 1, impressions: 15 }],
    provider_response: { geheim: true }
  }]);

  assert.deepEqual(item.outcome, {
    state: 'observed',
    label: 'Neutrale Beobachtung',
    note: 'Die Werte sind eine neutrale Beobachtung. Saison, Nachfrage und Google-Änderungen können sie beeinflussen.',
    baseline: {
      clicksLabel: '4', impressionsLabel: '80', ctrLabel: '5 %', averagePositionLabel: '12,5'
    },
    followup: {
      clicksLabel: '8', impressionsLabel: '100', ctrLabel: '8 %', averagePositionLabel: '9,5'
    },
    changes: {
      clicksLabel: '+4', impressionsLabel: '+20', ctrLabel: '+3 %', averagePositionLabel: '-3,0'
    },
    newImportantQueries: [
      { query: '<script>alert(1)</script>', clicksLabel: '2', impressionsLabel: '20' },
      { query: 'Neue Suche 1', clicksLabel: '2', impressionsLabel: '20' },
      { query: 'Neue Suche 2', clicksLabel: '2', impressionsLabel: '20' },
      { query: 'Neue Suche 3', clicksLabel: '2', impressionsLabel: '20' },
      { query: 'Neue Suche 4', clicksLabel: '2', impressionsLabel: '20' }
    ],
    lostImportantQueries: [
      { query: 'Alte Suche', clicksLabel: '1', impressionsLabel: '15' }
    ]
  });
  assert.doesNotMatch(JSON.stringify(item), /provider_response|geheim|\braw\b/i);
});

test('wartende und wenig belastbare Outcomes erhalten ausschließlich die vereinbarten Zustände', () => {
  const rows = buildExistingContentListPresentation([
    { id: 1, title: 'Warten', slug: 'warten', outcome_evaluation_status: 'ready' },
    { id: 2, title: 'Wenig Daten', slug: 'wenig', outcome_evaluation_status: 'insufficient_data' }
  ]);
  assert.equal(rows[0].outcome.label, 'Warte auf 28 Tage');
  assert.equal(rows[1].outcome.label, 'Noch nicht belastbar');
  assert.doesNotMatch(JSON.stringify(rows), /verbesser|verschlechter|kausal/i);
});

test('Bestandsoptimierungsstatus präsentiert laufende Stufe ausschließlich über allowlistete Felder', () => {
  const result = presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: 'running',
    optimization_attempts: 1,
    optimization_max_attempts: 3,
    optimization_job_updated_at: '2026-07-14T10:03:00.000Z',
    optimization_run_status: 'running',
    optimization_current_stage: 'targeted_optimization',
    optimization_error_code: null,
    stage_results_json: { provider: { secret: 'sk-geheim' } },
    provider_response: '<script>nicht ausgeben</script>'
  });

  assert.deepEqual(result, {
    state: 'running', active: true, terminal: false, canStart: false,
    canDiscard: false, discardActionUrl: null,
    statusLabel: 'In Bearbeitung', stageLabel: 'Gezielte Optimierung',
    message: 'Die KI-Optimierung läuft: Gezielte Optimierung.', jobId: 44,
    revisionId: null, revisionUrl: null, errorCode: null,
    unsafeProviderState: false, updatedAt: '2026-07-14T10:03:00.000Z'
  });
  assert.doesNotMatch(JSON.stringify(result), /secret|provider_response|stage_results_json|script/i);
});

test('fertige Bestandsoptimierung verweist nur auf die deterministisch gewählte Adminrevision', () => {
  assert.deepEqual(presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: 'completed',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'completed',
    optimization_current_stage: 'revision_creation',
    optimization_revision_id: 71,
    optimization_revision_status: 'draft'
  }), {
    state: 'completed', active: false, terminal: true, canStart: false,
    canDiscard: false, discardActionUrl: null,
    statusLabel: 'Revision bereit', stageLabel: 'Revision erstellt',
    message: 'Die Optimierung ist abgeschlossen. Die Revision wartet auf deine Freigabe; die Livefassung ist noch unverändert.',
    jobId: 44, revisionId: 71,
    revisionUrl: '/admin/content-agent/revisions/71/edit', errorCode: null,
    unsafeProviderState: false, updatedAt: '2026-07-14T10:05:00.000Z'
  });
});

test('abgeschlossene Bestandsoptimierung zeigt die übernommene Livefassung und laufende Nachmessung korrekt an', () => {
  const result = presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: 'completed',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'completed',
    optimization_current_stage: 'revision_creation',
    optimization_revision_id: 71,
    optimization_revision_status: 'approved',
    outcome_evaluation_status: 'ready'
  });

  assert.equal(result.statusLabel, 'Übernommen');
  assert.equal(
    result.message,
    'Die Optimierung wurde auf die Livefassung übernommen. Die 28-Tage-Auswertung läuft.'
  );
});

test('übernommene Bestandsoptimierung meldet eine abgeschlossene Nachmessung nicht mehr als laufend', () => {
  const result = presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: 'completed',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'completed',
    optimization_current_stage: 'revision_creation',
    optimization_revision_id: 71,
    optimization_revision_status: 'approved',
    outcome_evaluation_status: 'evaluated'
  });

  assert.equal(result.statusLabel, 'Übernommen');
  assert.equal(
    result.message,
    'Die Optimierung wurde auf die Livefassung übernommen. Die 28-Tage-Auswertung ist abgeschlossen.'
  );
});

test('abgeschlossene Bestandsoptimierung zeigt eine abgelehnte Revision ohne Liveänderung korrekt an', () => {
  const result = presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: 'completed',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'completed',
    optimization_current_stage: 'revision_creation',
    optimization_revision_id: 71,
    optimization_revision_status: 'rejected'
  });

  assert.equal(result.statusLabel, 'Abgelehnt');
  assert.equal(
    result.message,
    'Die Optimierungsrevision wurde abgelehnt. Die Livefassung blieb unverändert.'
  );
});

test('abgeschlossene Bestandsoptimierung gibt nach übernommener oder verworfener Revision einen neuen Start frei', () => {
  for (const revisionStatus of ['approved', 'rejected']) {
    const result = presentExistingContentOptimizationState({
      optimization_job_id: 44,
      optimization_job_status: 'completed',
      optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
      optimization_run_status: 'completed',
      optimization_current_stage: 'revision_creation',
      optimization_revision_id: 71,
      optimization_revision_status: revisionStatus,
      has_draft_revision: false
    });

    assert.equal(result.canStart, true, revisionStatus);
    assert.equal(result.revisionId, null, revisionStatus);
    assert.equal(result.revisionUrl, null, revisionStatus);
  }
});

test('eine verbleibende Draft-Revision sperrt einen neuen Optimierungsauftrag trotz abgeschlossenem Job', () => {
  const result = presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: 'completed',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'completed',
    optimization_current_stage: 'revision_creation',
    optimization_revision_id: 71,
    optimization_revision_status: 'approved',
    has_draft_revision: true
  });

  assert.equal(result.canStart, false);
});

test('offene Bestandsrevision wird ohne früheren KI-Job sichtbar und ersetzt den irreführenden Neustart', () => {
  const result = presentExistingContentOptimizationState({
    id: 19,
    optimization_job_id: null,
    open_draft_revision_id: 71,
    has_draft_revision: true
  });

  assert.deepEqual(result, {
    state: 'idle',
    active: false,
    terminal: false,
    canStart: false,
    canDiscard: false,
    discardActionUrl: null,
    statusLabel: 'Revision offen',
    stageLabel: 'Freigabe ausstehend',
    message: 'Für diesen Artikel besteht bereits eine offene Revision. Bearbeite, übernimm oder lehne sie ab, bevor du eine neue KI-Optimierung startest.',
    jobId: null,
    revisionId: 71,
    revisionUrl: '/admin/content-agent/revisions/71/edit',
    errorCode: null,
    unsafeProviderState: false,
    updatedAt: null
  });
});

test('aktiver Legacy-EJS-Inhalt wird als nur manuell optimierbar dargestellt', () => {
  const result = presentExistingContentOptimizationState({
    id: 19,
    optimization_job_id: null,
    has_active_legacy_ejs: true,
    has_draft_revision: false
  });

  assert.equal(result.canStart, false);
  assert.equal(result.legacyEjsBlocked, true);
  assert.equal(result.manualEditUrl, '/admin/blog/19/edit');
  assert.equal(result.statusLabel, 'Nur manuell optimierbar');
  assert.equal(result.stageLabel, 'Aktiver EJS-Inhalt');
  assert.match(result.message, /Blogeditor/i);
});

test('geschlossener Auftrag gibt aktiven Legacy-EJS-Inhalt nicht erneut für die KI frei', () => {
  const result = presentExistingContentOptimizationState({
    id: 19,
    has_active_legacy_ejs: true,
    optimization_job_id: 44,
    optimization_job_status: 'cancelled',
    optimization_run_status: 'failed',
    optimization_job_updated_at: '2026-07-16T10:00:00.000Z',
    has_draft_revision: false
  });

  assert.equal(result.canStart, false);
  assert.equal(result.legacyEjsBlocked, true);
  assert.equal(result.manualEditUrl, '/admin/blog/19/edit');
  assert.equal(result.statusLabel, 'Nur manuell optimierbar');
});

test('migrierter statischer Artikel ist wieder für die KI-Bestandsoptimierung freigegeben', () => {
  const [migrated] = buildExistingContentListPresentation([{
    id: 44,
    title: 'Migrierter Artikel',
    slug: 'migrierter-artikel',
    content_format: 'static_html',
    has_active_legacy_ejs: false,
    optimization_job_status: null,
    open_draft_revision_id: null,
    has_draft_revision: false
  }]);

  assert.equal(migrated.optimization.canStart, true);
  assert.equal(migrated.optimization.legacyEjsBlocked, undefined);
});

test('unsicherer Providerzustand bleibt gesperrt und bietet keinen normalen Neustart', () => {
  const result = presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: 'needs_manual_attention',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'needs_manual_attention',
    optimization_current_stage: 'targeted_optimization',
    optimization_error_code: 'provider_execution_uncertain',
    raw_provider_error: 'Authorization: Bearer geheim'
  });

  assert.equal(result.state, 'manual_attention');
  assert.equal(result.canStart, false);
  assert.equal(result.unsafeProviderState, true);
  assert.equal(result.errorCode, 'provider_execution_uncertain');
  assert.match(result.message, /manuelle Prüfung/i);
  assert.doesNotMatch(JSON.stringify(result), /Bearer|Authorization|raw_provider_error/);
});

test('deterministischer manueller Bestandsfehler bietet nur die bestätigte Schließaktion an', () => {
  const result = presentExistingContentOptimizationState({
    id: 19,
    optimization_job_id: 44,
    optimization_job_status: 'needs_manual_attention',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'needs_manual_attention',
    optimization_current_stage: 'repair',
    optimization_error_code: 'existing_post_optimization_repair_failed',
    open_provider_reservation_count: 0,
    has_draft_revision: false
  });

  assert.equal(result.canStart, false);
  assert.equal(result.canDiscard, true);
  assert.equal(result.discardActionUrl, '/admin/content-agent/existing-content/19/optimization-jobs/44/discard');
});

test('Revisionskonflikt wird erst ohne Draft und Providerreservierung sicher schließbar', () => {
  const base = {
    id: 19,
    optimization_job_id: 44,
    optimization_job_status: 'needs_manual_attention',
    optimization_job_updated_at: '2026-07-14T10:05:00.000Z',
    optimization_run_status: 'needs_manual_attention',
    optimization_current_stage: 'revision_creation',
    optimization_error_code: 'CONTENT_REVISION_CONFLICT',
    open_provider_reservation_count: 0,
    has_draft_revision: false
  };

  assert.equal(presentExistingContentOptimizationState(base).canDiscard, true);
  assert.equal(presentExistingContentOptimizationState({
    ...base,
    has_draft_revision: true
  }).canDiscard, false);
  assert.equal(presentExistingContentOptimizationState({
    ...base,
    open_provider_reservation_count: 1
  }).canDiscard, false);
});

test('Jobpräsentation bietet für Bestandsoptimierungen keinen generischen Retry an', () => {
  const [job] = buildJobListPresentation([{
    id: 44,
    job_type: 'optimize_existing_post',
    status: 'needs_manual_attention',
    attempts: 1,
    max_attempts: 3,
    last_error: 'existing_post_optimization_repair_failed',
    run_status: 'needs_manual_attention',
    post_id: 19,
    open_provider_reservation_count: 0
  }]);

  assert.equal(job.canRetry, false);
});

test('unbekannte Status-, Stufen- und Fehlerwerte werden fail-closed präsentiert', () => {
  const result = presentExistingContentOptimizationState({
    optimization_job_id: 44,
    optimization_job_status: '<script>queued</script>',
    optimization_current_stage: '<img src=x>',
    optimization_error_code: 'sk-abcdefgh12345678'
  });

  assert.equal(result.state, 'manual_attention');
  assert.equal(result.active, false);
  assert.equal(result.canStart, false);
  assert.equal(result.stageLabel, 'Unbekannte Stufe');
  assert.equal(result.errorCode, null);
  assert.doesNotMatch(JSON.stringify(result), /script|img|sk-/i);
});
