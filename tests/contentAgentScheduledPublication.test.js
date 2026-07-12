import assert from 'node:assert/strict';
import test from 'node:test';

import { createScheduledPublicationService } from '../services/contentAgent/scheduledPublicationService.js';

const admin = { id: 7, username: 'redaktion' };
const now = new Date('2026-07-12T10:00:00.000Z');
const futureSlot = new Date('2026-07-12T11:00:00.000Z');
const missedSlot = new Date('2026-07-12T09:00:00.000Z');
const autoSnapshot = {
  operatingMode: 'auto_publish',
  forcedMode: null,
  autoPublishEffective: true,
  manualApprovalsCount: 8,
  autoPublishMinScore: 90,
  publicationAt: futureSlot.toISOString(),
  startedAt: now.toISOString(),
  settingsVersion: 3,
  source: 'weekly-schedule'
};
const autoRisks = {
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
};
const autoFocusedReview = { blocked: false, items: [], riskFlags: [], sourceCount: 0 };
const autoQualityReport = {
  passed: true,
  score: 94,
  summary: 'Alle Prüfungen bestanden.',
  strengths: ['Sicherer Inhalt'],
  issues: [],
  recommendedActions: [],
  requiresManualReview: false,
  risks: autoRisks,
  focusedReview: autoFocusedReview
};

function publicationError(code, message = code) {
  return Object.assign(new Error(message), { code });
}

function harness({
  workflowStatus = 'needs_review',
  scheduledAt = futureSlot,
  reviewVersion = 2,
  approvedReviewVersion = null,
  publicationVersion = 1,
  approvalSource = 'manual',
  revalidationError = null,
  expireDuringValidation = false,
  expireOnValidationCall = null,
  newsletterEnabled = false,
  manualApprovals = null
} = {}) {
  const calls = [];
  const jobs = new Map();
  const clock = { value: now };
  const expirationValidationCall = expireOnValidationCall
    ?? (expireDuringValidation ? 1 : null);
  let validationCalls = 0;
  const state = {
    post: {
      id: 3,
      title: 'Sicherer Artikel',
      excerpt: 'Eine konkrete Kurzbeschreibung für kleine Unternehmen.',
      slug: 'sicherer-artikel',
      meta_title: 'Sicherer Webdesign-Artikel für kleine Unternehmen',
      meta_description: 'Der Artikel erklärt kleinen Unternehmen konkret, wie sie ihr Webdesign sicher und strukturiert planen.',
      og_title: 'Sicherer Webdesign-Artikel',
      og_description: 'Konkrete Webdesign-Hinweise für kleine Unternehmen.',
      faq_json: Array.from({ length: 5 }, (_, index) => ({
        question: `Wie funktioniert Schritt ${index + 1}?`,
        answer: `Schritt ${index + 1} wird nachvollziehbar erklärt.`
      })),
      image_url: 'https://example.test/image.webp',
      image_alt: 'Unternehmerin plant ihre Website',
      content: '<section><h2>Sicher</h2></section>',
      generated_by_ai: true,
      published: workflowStatus === 'published',
      workflow_status: workflowStatus,
      scheduled_at: scheduledAt,
      review_version: reviewVersion,
      approved_review_version: approvedReviewVersion,
      approved_at: approvedReviewVersion === null ? null : new Date('2026-07-12T08:00:00.000Z'),
      approved_by_admin_id: approvedReviewVersion === null || approvalSource === 'auto'
        ? null
        : admin.id,
      publication_version: publicationVersion,
      generation_run_id: 21,
      content_format: 'static_html'
    },
    event: null,
    autoEvent: approvedReviewVersion !== null && approvalSource === 'auto'
      ? {
        id: 41,
        post_id: 3,
        run_id: 21,
        decision: 'allowed',
        policy_version: 'auto-v1',
        quality_score: 94,
        reasons_json: [],
        context_json: {
          action: 'auto_schedule_policy',
          settingsVersion: 3,
          source: 'weekly-schedule',
          forcedMode: null,
          approvalVersion: reviewVersion,
          publicationVersion,
          scheduledAt: scheduledAt.toISOString()
        }
      }
      : null,
    approvals: manualApprovals ?? (workflowStatus === 'published' && approvalSource === 'manual' ? 1 : 0),
    newsletterEnabled
  };
  const client = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    },
    release() { calls.push('RELEASE'); }
  };
  const db = {
    async connect() {
      calls.push('CONNECT');
      return client;
    }
  };
  const publicationService = {
    async revalidateDraftForPublication({ postId, client: transaction, workflowStatuses }) {
      calls.push(['validate', postId, transaction, workflowStatuses]);
      validationCalls += 1;
      if (validationCalls === expirationValidationCall) {
        clock.value = new Date('2026-07-12T12:00:00.001Z');
      }
      if (!workflowStatuses.includes(state.post.workflow_status)) {
        throw publicationError('CONTENT_DRAFT_NOT_PUBLISHABLE');
      }
      if (revalidationError) throw revalidationError;
      return {
        draft: {
          post: { ...state.post },
          metadata: {
            quality_score: 94,
            internal_links_json: [
              { url: '/kontakt', label: 'Kontakt', purpose: 'Beratung' },
              { url: '/pakete', label: 'Pakete', purpose: 'Angebot' }
            ],
            source_references_json: [],
            quality_report_json: autoQualityReport
          }
        },
        qualityScore: 94,
        validation: {
          passed: true,
          issues: [],
          sanitizedHtml: state.post.content
        },
        riskReport: autoFocusedReview
      };
    }
  };
  const repository = {
    async getDraftWithMetadataForUpdate(postId, transaction) {
      calls.push(['lock', postId, transaction]);
      return {
        post: { ...state.post },
        metadata: { quality_score: 92 }
      };
    },
    async approveDraftForSchedule(input, transaction) {
      calls.push(['approve', input, transaction]);
      if (input.allowMissedSlot !== true
          && input.scheduledAt.getTime() <= clock.value.getTime()) {
        return { post: null, scheduleExpired: true };
      }
      if (state.post.workflow_status !== 'needs_review'
          || state.post.review_version !== input.reviewVersion
          || state.post.publication_version !== input.publicationVersion) return null;
      state.post = {
        ...state.post,
        published: false,
        workflow_status: 'approved_scheduled',
        scheduled_at: input.scheduledAt,
        approved_review_version: input.reviewVersion,
        approved_at: now,
        approved_by_admin_id: input.adminId
      };
      return { ...state.post };
    },
    async rescheduleApprovedDraft(input, transaction) {
      calls.push(['reschedule', input, transaction]);
      if (input.scheduledAt.getTime() <= clock.value.getTime()) {
        return { post: null, scheduleExpired: true };
      }
      if (state.post.workflow_status !== 'approved_scheduled'
          || state.post.approved_review_version !== input.approvalVersion
          || state.post.review_version !== input.approvalVersion
          || state.post.publication_version !== input.publicationVersion
          || state.post.approved_by_admin_id !== input.adminId) return null;
      state.post = { ...state.post, scheduled_at: input.scheduledAt };
      return { ...state.post };
    },
    async publishApprovedDraft(input, transaction) {
      calls.push(['publish', input, transaction]);
      if (state.post.workflow_status !== 'approved_scheduled'
          || state.post.approved_review_version !== input.approvalVersion
          || state.post.review_version !== input.approvalVersion
          || state.post.publication_version !== input.publicationVersion
          || state.post.scheduled_at.getTime() !== input.scheduledAt.getTime()) return null;
      state.post = {
        ...state.post,
        published: true,
        workflow_status: 'published',
        publication_version: state.post.publication_version + 1
      };
      return { ...state.post };
    },
    async insertScheduledManualEvent(input, transaction) {
      calls.push(['event', input, transaction]);
      if (state.event) return null;
      state.event = {
        id: 31,
        post_id: input.postId,
        decision: 'manual',
        policy_version: 'manual-scheduled-v1',
        quality_score: input.qualityScore,
        context_json: {
          action: 'scheduled_manual_publish',
          approvalVersion: input.approvalVersion,
          publicationVersion: input.publicationVersion,
          scheduledAt: input.scheduledAt?.toISOString() || null
        },
        admin_id: input.admin.id,
        admin_username: input.admin.username
      };
      return state.event;
    },
    async getScheduledManualEvent(input, transaction) {
      calls.push(['event-read', input, transaction]);
      return state.event;
    },
    async getApprovingAdmin(adminId, transaction) {
      calls.push(['admin', adminId, transaction]);
      return adminId === admin.id ? admin : null;
    },
    async insertAutoEvent(input, transaction) {
      calls.push(['auto-event', input, transaction]);
      if (state.autoEvent) return null;
      state.autoEvent = {
        id: 41,
        post_id: input.postId,
        run_id: input.runId,
        decision: input.decision,
        policy_version: input.policyVersion,
        quality_score: input.qualityScore,
        reasons_json: input.reasons,
        context_json: input.context
      };
      return state.autoEvent;
    },
    async getAutoEvent(input, transaction) {
      calls.push(['auto-event-read', input, transaction]);
      return state.autoEvent;
    },
    async incrementManualApprovals(transaction) {
      calls.push(['increment', transaction]);
      state.approvals += 1;
      return {
        id: 1,
        manual_approvals_count: state.approvals,
        newsletter_blog_notifications_enabled: state.newsletterEnabled
      };
    },
    async getSettings(transaction) {
      calls.push(['settings', transaction]);
      return {
        id: 1,
        manual_approvals_count: state.approvals,
        newsletter_blog_notifications_enabled: state.newsletterEnabled
      };
    }
  };
  async function enqueuePublicationJob(input, transaction) {
    calls.push(['job', input, transaction]);
    const key = `${input.postId}:${input.approvalVersion}:${input.publicationVersion}:${input.runAfter.toISOString()}`;
    if (!jobs.has(key)) {
      jobs.set(key, {
        id: jobs.size + 1,
        job_type: 'publish_approved_post',
        run_after: input.runAfter,
        payload_json: {
          postId: input.postId,
          approvalVersion: input.approvalVersion,
          publicationVersion: input.publicationVersion,
          scheduledAt: input.runAfter.toISOString()
        }
      });
    }
    return jobs.get(key);
  }
  async function queuePublishedArticleNewsletter(input, transaction) {
    calls.push(['newsletter', input, transaction]);
    return { status: 'queued' };
  }
  return {
    service: createScheduledPublicationService({
      db,
      repository,
      publicationService,
      enqueuePublicationJob,
      queuePublishedArticleNewsletter,
      now: () => clock.value
    }),
    calls,
    clock,
    jobs,
    state
  };
}

test('Freigabe vor dem Termin plant atomar, veröffentlicht aber nicht', async () => {
  const { service, calls, state } = harness();

  const result = await service.approveForSchedule({
    postId: 3,
    scheduledAt: futureSlot,
    admin,
    confirmed: true
  });

  assert.equal(result.post.workflow_status, 'approved_scheduled');
  assert.equal(result.post.published, false);
  assert.equal(result.job.job_type, 'publish_approved_post');
  assert.equal(result.job.run_after.toISOString(), futureSlot.toISOString());
  assert.equal(state.approvals, 0);
  assert.equal(state.event, null);
  const operations = calls.filter(Array.isArray).map(([name]) => name);
  assert.ok(operations.indexOf('validate') < operations.indexOf('approve'));
  assert.ok(operations.indexOf('approve') < operations.indexOf('job'));
  assert.equal(calls.includes('COMMIT'), true);
});

test('Auto-Systemfreigabe plant nach bestandenen Gates ohne Admin und ohne frühe Veröffentlichung', async () => {
  const { service, calls, state } = harness();
  let leaseChecks = 0;

  const result = await service.approveAutomaticallyForSchedule({
    postId: 3,
    runId: 21,
    scheduledAt: futureSlot,
    snapshot: autoSnapshot,
    leaseGuard: async () => { leaseChecks += 1; return true; }
  });

  assert.equal(result.decision.allowed, true);
  assert.equal(result.post.workflow_status, 'approved_scheduled');
  assert.equal(result.post.published, false);
  assert.equal(result.post.approved_by_admin_id, null);
  assert.equal(result.job.run_after.toISOString(), futureSlot.toISOString());
  assert.equal(state.autoEvent.context_json.action, 'auto_schedule_policy');
  assert.equal(state.approvals, 0);
  assert.equal(state.event, null);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
  assert.equal(leaseChecks, 5);
});

test('blockierte Auto-Systemfreigabe bleibt needs_review und legt keinen Publish-Job an', async () => {
  const { service, jobs, state } = harness();
  let leaseChecks = 0;

  const result = await service.approveAutomaticallyForSchedule({
    postId: 3,
    runId: 21,
    scheduledAt: futureSlot,
    snapshot: { ...autoSnapshot, manualApprovalsCount: 7 },
    leaseGuard: async () => { leaseChecks += 1; return true; }
  });

  assert.equal(result.decision.allowed, false);
  assert.ok(result.decision.reasons.includes('manual_approvals_too_low'));
  assert.equal(result.post.workflow_status, 'needs_review');
  assert.equal(result.reviewRequired, true);
  assert.equal(result.job, null);
  assert.equal(jobs.size, 0);
  assert.equal(state.approvals, 0);
  assert.equal(leaseChecks, 3);
});

test('Leaseverlust direkt nach dem blockierten Auto-Event erzwingt Rollback vor Commit', async () => {
  const { service, calls } = harness();
  const leaseError = Object.assign(publicationError('CONTENT_JOB_LEASE_LOST'), {
    retryable: false
  });
  let leaseChecks = 0;

  await assert.rejects(
    service.approveAutomaticallyForSchedule({
      postId: 3,
      runId: 21,
      scheduledAt: futureSlot,
      snapshot: { ...autoSnapshot, manualApprovalsCount: 7 },
      leaseGuard: async () => {
        leaseChecks += 1;
        if (leaseChecks === 3) throw leaseError;
        return true;
      }
    }),
    leaseError
  );

  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'auto-event'), true);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'approve'), false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'job'), false);
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(calls.includes('COMMIT'), false);
});

test('Leaseverlust direkt nach Auto-Approval und Job-Enqueue rollt alle Writes vor Commit zurück', async () => {
  const { service, calls } = harness();
  const leaseError = Object.assign(publicationError('CONTENT_JOB_LEASE_LOST'), {
    retryable: false
  });
  let leaseChecks = 0;

  await assert.rejects(
    service.approveAutomaticallyForSchedule({
      postId: 3,
      runId: 21,
      scheduledAt: futureSlot,
      snapshot: autoSnapshot,
      leaseGuard: async () => {
        leaseChecks += 1;
        if (leaseChecks === 5) throw leaseError;
        return true;
      }
    }),
    leaseError
  );

  for (const operation of ['auto-event', 'approve', 'job']) {
    assert.equal(
      calls.some((entry) => Array.isArray(entry) && entry[0] === operation),
      true,
      operation
    );
  }
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(calls.includes('COMMIT'), false);
});

test('Auto-Systemfreigabe bindet den Serviceparameter exakt an publicationAt aus dem Snapshot', async () => {
  const shiftedSlot = new Date('2026-07-12T12:00:00.000Z');
  const { service, jobs, state } = harness();

  await assert.rejects(
    service.approveAutomaticallyForSchedule({
      postId: 3,
      runId: 21,
      scheduledAt: shiftedSlot,
      snapshot: autoSnapshot,
      leaseGuard: async () => true
    }),
    (error) => error.code === 'CONTENT_APPROVAL_STALE'
  );

  assert.equal(state.post.workflow_status, 'needs_review');
  assert.equal(state.autoEvent, null);
  assert.equal(jobs.size, 0);
});

test('fehlender publicationAt bleibt ein begründeter Review-Fallback statt eines technischen Fehlers', async () => {
  const { service, jobs, state } = harness({ scheduledAt: null });

  const result = await service.approveAutomaticallyForSchedule({
    postId: 3,
    runId: 21,
    scheduledAt: null,
    snapshot: { ...autoSnapshot, publicationAt: null },
    leaseGuard: async () => true
  });

  assert.equal(result.decision.allowed, false);
  assert.ok(result.decision.reasons.includes('publication_schedule_invalid'));
  assert.equal(result.post.workflow_status, 'needs_review');
  assert.equal(jobs.size, 0);
  assert.equal(state.autoEvent.context_json.scheduledAt, null);
});

test('fachlich fehlgeschlagene Revalidierung bleibt im Auto-Modus needs_review mit Grund', async () => {
  const { service, jobs, state } = harness({
    revalidationError: publicationError('CONTENT_DRAFT_VALIDATION_FAILED')
  });

  const result = await service.approveAutomaticallyForSchedule({
    postId: 3,
    runId: 21,
    scheduledAt: futureSlot,
    snapshot: autoSnapshot,
    leaseGuard: async () => true
  });

  assert.equal(result.decision.allowed, false);
  assert.ok(result.decision.reasons.includes('draft_revalidation_failed'));
  assert.equal(result.post.workflow_status, 'needs_review');
  assert.equal(jobs.size, 0);
  assert.equal(state.approvals, 0);
});

test('Freigabe verlangt Bestätigung und einen strikt zukünftigen Termin', async () => {
  for (const input of [
    { postId: 3, scheduledAt: futureSlot, admin, confirmed: false },
    { postId: 3, scheduledAt: missedSlot, admin, confirmed: true },
    { postId: 3, scheduledAt: now, admin, confirmed: true }
  ]) {
    const { service, calls } = harness();
    await assert.rejects(
      service.approveForSchedule(input),
      (error) => ['CONTENT_CONFIRMATION_REQUIRED', 'CONTENT_SCHEDULE_MUST_BE_FUTURE'].includes(error.code)
    );
    assert.equal(calls.includes('CONNECT'), false);
  }
});

test('initiale Freigabe mappt einen während Lock und Validierung abgelaufenen Termin eindeutig', async () => {
  const { service, calls, jobs, state } = harness({ expireDuringValidation: true });

  await assert.rejects(
    service.approveForSchedule({
      postId: 3,
      scheduledAt: futureSlot,
      admin,
      confirmed: true
    }),
    (error) => error.code === 'CONTENT_SCHEDULE_MUST_BE_FUTURE'
  );

  assert.equal(calls.includes('CONNECT'), true);
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(jobs.size, 0);
  assert.equal(state.post.workflow_status, 'needs_review');
});

test('Sofortveröffentlichung ist ausschließlich nach einem verpassten Slot möglich', async () => {
  const future = harness({ scheduledAt: futureSlot });
  await assert.rejects(
    future.service.publishNowAfterMissedSlot({ postId: 3, admin, confirmed: true }),
    (error) => error.code === 'CONTENT_PUBLICATION_SLOT_NOT_MISSED'
  );
  assert.equal(future.calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);

  const missed = harness({ scheduledAt: missedSlot });
  const result = await missed.service.publishNowAfterMissedSlot({
    postId: 3,
    admin,
    confirmed: true
  });
  assert.equal(result.post.workflow_status, 'published');
  assert.equal(result.post.published, true);
  assert.equal(missed.state.approvals, 1);
  assert.equal(missed.state.event.decision, 'manual');
});

test('wiederholte Freigabe erzeugt keinen zweiten Veröffentlichungsjob', async () => {
  const { service, jobs } = harness();
  const input = { postId: 3, scheduledAt: futureSlot, admin, confirmed: true };

  const first = await service.approveForSchedule(input);
  const second = await service.approveForSchedule(input);

  assert.equal(first.job.id, second.job.id);
  assert.equal(jobs.size, 1);
});

test('reine Terminverschiebung erzeugt einen neuen Job und macht den alten Termin-Snapshot stale', async () => {
  const shiftedSlot = new Date('2026-07-12T12:00:00.000Z');
  const { service, jobs, clock, calls, state } = harness();

  const oldApproval = await service.approveForSchedule({
    postId: 3,
    scheduledAt: futureSlot,
    admin,
    confirmed: true
  });
  const shiftedApproval = await service.approveForSchedule({
    postId: 3,
    scheduledAt: shiftedSlot,
    admin,
    confirmed: true
  });

  assert.notEqual(oldApproval.job.id, shiftedApproval.job.id);
  assert.equal(jobs.size, 2);
  assert.equal(shiftedApproval.post.scheduled_at.toISOString(), shiftedSlot.toISOString());
  assert.equal(shiftedApproval.job.payload_json.scheduledAt, shiftedSlot.toISOString());

  clock.value = new Date('2026-07-12T11:30:00.000Z');
  await assert.rejects(
    service.publishApprovedPost({
      postId: 3,
      approvalVersion: 2,
      publicationVersion: 1,
      scheduledAt: futureSlot,
      leaseGuard: async () => true
    }),
    (error) => error.code === 'CONTENT_APPROVAL_STALE'
  );
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  assert.equal(state.post.published, false);
});

test('Terminverschiebung mappt einen während Lock und Revalidierung abgelaufenen Slot eindeutig', async () => {
  const shiftedSlot = new Date('2026-07-12T12:00:00.000Z');
  const { service, jobs, calls, state } = harness({ expireOnValidationCall: 2 });

  await service.approveForSchedule({
    postId: 3,
    scheduledAt: futureSlot,
    admin,
    confirmed: true
  });
  await assert.rejects(
    service.approveForSchedule({
      postId: 3,
      scheduledAt: shiftedSlot,
      admin,
      confirmed: true
    }),
    (error) => error.code === 'CONTENT_SCHEDULE_MUST_BE_FUTURE'
  );

  assert.equal(jobs.size, 1);
  assert.equal(state.post.scheduled_at.toISOString(), futureSlot.toISOString());
  assert.equal(calls.includes('ROLLBACK'), true);
});

test('fällige Veröffentlichung lehnt veraltete Freigabe- und Publikationsversionen ab', async () => {
  for (const versions of [
    { approvalVersion: 1, publicationVersion: 1 },
    { approvalVersion: 2, publicationVersion: 2 }
  ]) {
    const { service, calls } = harness({
      workflowStatus: 'approved_scheduled',
      scheduledAt: missedSlot,
      approvedReviewVersion: 2
    });
    await assert.rejects(
      service.publishApprovedPost({
        postId: 3,
        ...versions,
        scheduledAt: missedSlot,
        leaseGuard: async () => true
      }),
      (error) => error.code === 'CONTENT_APPROVAL_STALE'
    );
    assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  }
});

test('Leaseverlust vor der Mutation verhindert Veröffentlichung, Event und Zählung', async () => {
  const { service, calls, state } = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2
  });
  let leaseChecks = 0;
  const leaseError = publicationError('CONTENT_JOB_LEASE_LOST');

  await assert.rejects(
    service.publishApprovedPost({
      postId: 3,
      approvalVersion: 2,
      publicationVersion: 1,
      scheduledAt: missedSlot,
      leaseGuard: async () => {
        leaseChecks += 1;
        if (leaseChecks === 2) throw leaseError;
        return true;
      }
    }),
    leaseError
  );

  assert.equal(calls.some((entry) => Array.isArray(entry) && ['publish', 'event', 'increment'].includes(entry[0])), false);
  assert.equal(calls.includes('ROLLBACK'), true);
  assert.equal(state.post.published, false);
});

test('Worker-Veröffentlichung verlangt einen funktionsfähigen Lease-Guard fail-closed', async () => {
  for (const leaseGuard of [undefined, null, true, {}, async () => undefined, async () => false]) {
    const { service, calls } = harness({
      workflowStatus: 'approved_scheduled',
      scheduledAt: missedSlot,
      approvedReviewVersion: 2
    });
    await assert.rejects(
      service.publishApprovedPost({
        postId: 3,
        approvalVersion: 2,
        publicationVersion: 1,
        scheduledAt: missedSlot,
        leaseGuard
      }),
      (error) => ['CONTENT_JOB_LEASE_REQUIRED', 'CONTENT_JOB_LEASE_LOST'].includes(error.code)
        && error.retryable === false
    );
    assert.equal(calls.includes('CONNECT'), false);
  }
});

test('Worker-Veröffentlichung prüft die Lease erneut unmittelbar vor Event und Zähler', async () => {
  for (const { loseAt, forbiddenOperation } of [
    { loseAt: 4, forbiddenOperation: 'event' },
    { loseAt: 5, forbiddenOperation: 'increment' }
  ]) {
    const { service, calls } = harness({
      workflowStatus: 'approved_scheduled',
      scheduledAt: missedSlot,
      approvedReviewVersion: 2
    });
    let leaseChecks = 0;
    const leaseError = Object.assign(publicationError('CONTENT_JOB_LEASE_LOST'), {
      retryable: false
    });

    await assert.rejects(
      service.publishApprovedPost({
        postId: 3,
        approvalVersion: 2,
        publicationVersion: 1,
        scheduledAt: missedSlot,
        leaseGuard: async () => {
          leaseChecks += 1;
          if (leaseChecks === loseAt) throw leaseError;
          return true;
        }
      }),
      leaseError
    );

    assert.equal(
      calls.some((entry) => Array.isArray(entry) && entry[0] === forbiddenOperation),
      false
    );
    assert.equal(calls.includes('ROLLBACK'), true);
  }
});

test('Wiederholung nach erfolgreichem Commit zählt dieselbe Freigabe exakt einmal', async () => {
  const { service, state } = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2
  });
  const input = {
    postId: 3,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: missedSlot,
    leaseGuard: async () => true
  };

  const first = await service.publishApprovedPost(input);
  const retry = await service.publishApprovedPost(input);

  assert.equal(first.post.publication_version, 2);
  assert.equal(retry.post.publication_version, 2);
  assert.equal(retry.alreadyPublished, true);
  assert.equal(state.approvals, 1);
  assert.equal(state.event.context_json.publicationVersion, 1);
});

test('erfolgreiche Publikation enqueued den Newsletter erst nach persistierter Aktivierung und der achten Veröffentlichung', async () => {
  const locked = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2,
    newsletterEnabled: true,
    manualApprovals: 6
  });
  await locked.service.publishApprovedPost({
    postId: 3,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: missedSlot,
    leaseGuard: async () => true
  });
  assert.equal(locked.calls.some((entry) => Array.isArray(entry) && entry[0] === 'newsletter'), false);

  const ready = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2,
    newsletterEnabled: true,
    manualApprovals: 7
  });
  await ready.service.publishApprovedPost({
    postId: 3,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: missedSlot,
    leaseGuard: async () => true
  });
  const newsletterCall = ready.calls.find((entry) => Array.isArray(entry) && entry[0] === 'newsletter');
  assert.equal(newsletterCall[1].postId, 3);
  assert.equal(newsletterCall[1].publicationVersion, 1);
  assert.equal(newsletterCall[1].settings.manual_approvals_count, 8);
  assert.equal(newsletterCall[2] !== undefined, true);
});

test('alreadyPublished-Retry erzeugt keinen zuvor gesperrten Newsletter-Rootjob nach', async () => {
  const { service, state, calls } = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2,
    newsletterEnabled: false,
    manualApprovals: 7
  });
  const input = {
    postId: 3,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: missedSlot,
    leaseGuard: async () => true
  };

  const published = await service.publishApprovedPost(input);
  assert.equal(published.post.published, true);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'newsletter'), false);

  state.newsletterEnabled = true;
  state.approvals = 12;
  const retry = await service.publishApprovedPost(input);

  assert.equal(retry.alreadyPublished, true);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'newsletter'), false);
});

test('alreadyPublished-Retry lässt den ursprünglich angelegten Newsletter-Rootjob unverändert', async () => {
  const { service, calls } = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2,
    newsletterEnabled: true,
    manualApprovals: 7
  });
  const input = {
    postId: 3,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: missedSlot,
    leaseGuard: async () => true
  };

  await service.publishApprovedPost(input);
  const retry = await service.publishApprovedPost(input);
  const newsletterCalls = calls.filter((entry) => Array.isArray(entry) && entry[0] === 'newsletter');

  assert.equal(retry.alreadyPublished, true);
  assert.equal(newsletterCalls.length, 1);
});

test('fällige Auto-Veröffentlichung nutzt das Auto-Event und erhöht den manuellen Zähler nie', async () => {
  const { service, state, calls } = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2,
    approvalSource: 'auto'
  });
  const input = {
    postId: 3,
    approvalVersion: 2,
    publicationVersion: 1,
    scheduledAt: missedSlot,
    leaseGuard: async () => true
  };

  const first = await service.publishApprovedPost(input);
  const retry = await service.publishApprovedPost(input);

  assert.equal(first.post.published, true);
  assert.equal(first.publicationSource, 'auto');
  assert.equal(retry.alreadyPublished, true);
  assert.equal(state.approvals, 0);
  assert.equal(state.event, null);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
});

test('Auto-Veröffentlichung ohne passendes unveränderliches Auto-Event bleibt fail-closed', async () => {
  const { service, state, calls } = harness({
    workflowStatus: 'approved_scheduled',
    scheduledAt: missedSlot,
    approvedReviewVersion: 2,
    approvalSource: 'auto'
  });
  state.autoEvent.context_json.scheduledAt = futureSlot.toISOString();

  await assert.rejects(
    service.publishApprovedPost({
      postId: 3,
      approvalVersion: 2,
      publicationVersion: 1,
      scheduledAt: missedSlot,
      leaseGuard: async () => true
    }),
    (error) => error.code === 'CONTENT_APPROVAL_STALE'
  );

  assert.equal(state.post.published, false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'publish'), false);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'increment'), false);
});
