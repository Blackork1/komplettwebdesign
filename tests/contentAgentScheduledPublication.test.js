import assert from 'node:assert/strict';
import test from 'node:test';

import { createScheduledPublicationService } from '../services/contentAgent/scheduledPublicationService.js';

const admin = { id: 7, username: 'redaktion' };
const now = new Date('2026-07-12T10:00:00.000Z');
const futureSlot = new Date('2026-07-12T11:00:00.000Z');
const missedSlot = new Date('2026-07-12T09:00:00.000Z');

function publicationError(code, message = code) {
  return Object.assign(new Error(message), { code });
}

function harness({
  workflowStatus = 'needs_review',
  scheduledAt = futureSlot,
  reviewVersion = 2,
  approvedReviewVersion = null,
  publicationVersion = 1,
  expireDuringValidation = false
} = {}) {
  const calls = [];
  const jobs = new Map();
  const clock = { value: now };
  const state = {
    post: {
      id: 3,
      generated_by_ai: true,
      published: workflowStatus === 'published',
      workflow_status: workflowStatus,
      scheduled_at: scheduledAt,
      review_version: reviewVersion,
      approved_review_version: approvedReviewVersion,
      approved_at: approvedReviewVersion === null ? null : new Date('2026-07-12T08:00:00.000Z'),
      approved_by_admin_id: approvedReviewVersion === null ? null : admin.id,
      publication_version: publicationVersion,
      generation_run_id: 21,
      content_format: 'static_html'
    },
    event: null,
    approvals: workflowStatus === 'published' ? 1 : 0
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
      if (expireDuringValidation) {
        clock.value = new Date('2026-07-12T11:00:00.001Z');
      }
      if (!workflowStatuses.includes(state.post.workflow_status)) {
        throw publicationError('CONTENT_DRAFT_NOT_PUBLISHABLE');
      }
      return {
        draft: { post: { ...state.post }, metadata: { quality_score: 92 } },
        qualityScore: 92
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
    async incrementManualApprovals(transaction) {
      calls.push(['increment', transaction]);
      state.approvals += 1;
      return { id: 1, manual_approvals_count: state.approvals };
    },
    async getSettings(transaction) {
      calls.push(['settings', transaction]);
      return { id: 1, manual_approvals_count: state.approvals };
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
  return {
    service: createScheduledPublicationService({
      db,
      repository,
      publicationService,
      enqueuePublicationJob,
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
