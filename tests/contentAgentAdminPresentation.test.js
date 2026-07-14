import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardPresentation,
  buildDraftListPresentation,
  buildExistingContentListPresentation,
  buildJobListPresentation,
  buildSchedulePresentation,
  buildTechnologyPresentation,
  deriveReviewState,
  presentContentLearningDashboard
} from '../services/contentAgent/adminPresentationService.js';

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
      article_html: '<article>vollständig</article>'
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
  assert.equal(dashboard.events[0].eventLabel, 'Neue Regelversion aktiviert');
  assert.doesNotMatch(JSON.stringify(dashboard), /runtime_snapshot_json|raw_provider_response|providerResponse|article_html|vollständig|geheim/i);
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
  assert.deepEqual(buildExistingContentListPresentation([{
    id: 4,
    title: 'Artikel',
    slug: 'artikel',
    updated_at: '2026-07-11T12:00:00.000Z',
    content: '<p>Rohinhalt</p>',
    payload_json: { geheim: true }
  }]), [{
    id: 4,
    title: 'Artikel',
    slug: 'artikel',
    updatedAt: '2026-07-11T12:00:00.000Z'
  }]);
});
