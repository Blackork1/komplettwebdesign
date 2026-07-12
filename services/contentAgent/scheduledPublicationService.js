import pool from '../../util/db.js';
import { createContentPublishEventRepository } from '../../repositories/contentPublishEventRepository.js';
import { enqueueApprovedPublicationJob } from '../../repositories/contentJobRepository.js';
import { createContentPublicationService } from './contentPublicationService.js';

const MAX_DATABASE_ID = 2_147_483_647;

function scheduledPublicationError(code, message) {
  return Object.assign(new Error(message), { code });
}

function positiveDatabaseInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > MAX_DATABASE_ID) {
    throw scheduledPublicationError(
      'CONTENT_ACTION_VALIDATION_FAILED',
      `${field} ist ungültig.`
    );
  }
  return normalized;
}

function normalizeAdmin(admin) {
  const username = String(admin?.username ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!username || username.length > 255) {
    throw scheduledPublicationError(
      'CONTENT_ACTION_VALIDATION_FAILED',
      'Die Adminidentität ist ungültig.'
    );
  }
  return {
    id: positiveDatabaseInteger(admin?.id, 'admin'),
    username
  };
}

function normalizeDate(value, code, message) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw scheduledPublicationError(code, message);
  return date;
}

function requireConfirmation(confirmed) {
  if (confirmed !== true) {
    throw scheduledPublicationError(
      'CONTENT_CONFIRMATION_REQUIRED',
      'Die erforderliche Bestätigung fehlt.'
    );
  }
}

function assertApprovalVersions(post, approvalVersion, publicationVersion) {
  if (post?.generated_by_ai !== true
      || post.published !== false
      || post.workflow_status !== 'approved_scheduled'
      || post.content_format !== 'static_html'
      || Number(post.review_version) !== approvalVersion
      || Number(post.approved_review_version) !== approvalVersion
      || Number(post.publication_version) !== publicationVersion
      || !post.approved_at
      || !post.approved_by_admin_id) {
    throw scheduledPublicationError(
      'CONTENT_APPROVAL_STALE',
      'Die Freigabe- oder Publikationsversion ist veraltet.'
    );
  }
}

function assertCommittedEvent(event, {
  postId,
  approvalVersion,
  publicationVersion,
  scheduledAt
}) {
  const context = event?.context_json;
  if (!event
      || Number(event.post_id) !== postId
      || event.decision !== 'manual'
      || event.policy_version !== 'manual-scheduled-v1'
      || context?.action !== 'scheduled_manual_publish'
      || Number(context?.approvalVersion) !== approvalVersion
      || Number(context?.publicationVersion) !== publicationVersion
      || context?.scheduledAt !== scheduledAt.toISOString()) {
    throw scheduledPublicationError(
      'CONTENT_APPROVAL_STALE',
      'Die gespeicherte Veröffentlichungsentscheidung passt nicht zu den Jobversionen.'
    );
  }
  return event;
}

async function assertActiveLease(leaseGuard) {
  if (typeof leaseGuard !== 'function') return true;
  const active = await leaseGuard();
  if (active !== true) {
    const error = scheduledPublicationError(
      'CONTENT_JOB_LEASE_LOST',
      'Die Content-Job-Lease wurde verloren.'
    );
    error.retryable = false;
    throw error;
  }
  return true;
}

function requireLeaseGuard(leaseGuard) {
  if (typeof leaseGuard === 'function') return;
  const error = scheduledPublicationError(
    'CONTENT_JOB_LEASE_REQUIRED',
    'Für die Worker-Veröffentlichung wird eine aktive Job-Lease benötigt.'
  );
  error.retryable = false;
  throw error;
}

async function rollbackQuietly(client) {
  try { await client.query('ROLLBACK'); } catch { /* Der ursprüngliche Fehler bleibt maßgeblich. */ }
}

export function createScheduledPublicationService({
  db = pool,
  repository = createContentPublishEventRepository(db),
  publicationService = createContentPublicationService({ db, repository }),
  enqueuePublicationJob = enqueueApprovedPublicationJob,
  now = () => new Date()
} = {}) {
  async function withTransaction(operation) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async function createScheduledEventAndPublish({
    postId,
    approvalVersion,
    publicationVersion,
    scheduledAt,
    approvedPost,
    qualityScore,
    admin,
    client,
    leaseGuard
  }) {
    await assertActiveLease(leaseGuard);
    const post = await repository.publishApprovedDraft({
      postId,
      approvalVersion,
      publicationVersion,
      scheduledAt
    }, client);
    if (!post) {
      throw scheduledPublicationError(
        'CONTENT_APPROVAL_STALE',
        'Der freigegebene Entwurf wurde unmittelbar vor der Veröffentlichung verändert.'
      );
    }
    await assertActiveLease(leaseGuard);
    const event = await repository.insertScheduledManualEvent({
      postId,
      runId: approvedPost.generation_run_id || null,
      qualityScore,
      approvalVersion,
      publicationVersion,
      scheduledAt,
      admin
    }, client);
    if (!event) {
      throw scheduledPublicationError(
        'CONTENT_APPROVAL_STALE',
        'Für diese Veröffentlichung besteht bereits eine manuelle Entscheidung.'
      );
    }
    await assertActiveLease(leaseGuard);
    const settings = await repository.incrementManualApprovals(client);
    if (!settings) throw new Error('Content-Agent-Einstellungen fehlen.');
    await assertActiveLease(leaseGuard);
    return { post, event, settings };
  }

  async function approveForSchedule({ postId, scheduledAt, admin, confirmed } = {}) {
    requireConfirmation(confirmed);
    const normalizedPostId = positiveDatabaseInteger(postId, 'postId');
    const normalizedAdmin = normalizeAdmin(admin);
    const normalizedScheduledAt = normalizeDate(
      scheduledAt,
      'CONTENT_SCHEDULE_INVALID',
      'Der Veröffentlichungstermin ist ungültig.'
    );
    if (normalizedScheduledAt.getTime() <= now().getTime()) {
      throw scheduledPublicationError(
        'CONTENT_SCHEDULE_MUST_BE_FUTURE',
        'Der Veröffentlichungstermin muss in der Zukunft liegen.'
      );
    }

    return withTransaction(async (client) => {
      const validated = await publicationService.revalidateDraftForPublication({
        postId: normalizedPostId,
        client,
        workflowStatuses: ['needs_review', 'approved_scheduled']
      });
      const current = validated.draft.post;
      const reviewVersion = positiveDatabaseInteger(current.review_version, 'reviewVersion');
      const publicationVersion = positiveDatabaseInteger(
        current.publication_version,
        'publicationVersion'
      );
      let post;
      if (current.workflow_status === 'approved_scheduled') {
        const currentSchedule = normalizeDate(
          current.scheduled_at,
          'CONTENT_APPROVAL_STALE',
          'Der gespeicherte Veröffentlichungstermin ist ungültig.'
        );
        if (Number(current.approved_review_version) !== reviewVersion
            || Number(current.approved_by_admin_id) !== normalizedAdmin.id) {
          throw scheduledPublicationError(
            'CONTENT_APPROVAL_STALE',
            'Der Entwurf besitzt bereits eine abweichende Freigabe.'
          );
        }
        if (currentSchedule.getTime() === normalizedScheduledAt.getTime()) {
          post = current;
        } else {
          post = await repository.rescheduleApprovedDraft({
            postId: normalizedPostId,
            scheduledAt: normalizedScheduledAt,
            approvalVersion: reviewVersion,
            publicationVersion,
            adminId: normalizedAdmin.id
          }, client);
          if (!post) {
            throw scheduledPublicationError(
              'CONTENT_APPROVAL_STALE',
              'Der freigegebene Entwurf wurde während der Terminverschiebung verändert.'
            );
          }
        }
      } else {
        const approval = await repository.approveDraftForSchedule({
          postId: normalizedPostId,
          scheduledAt: normalizedScheduledAt,
          reviewVersion,
          publicationVersion,
          adminId: normalizedAdmin.id
        }, client);
        if (approval?.scheduleExpired === true) {
          throw scheduledPublicationError(
            'CONTENT_SCHEDULE_MUST_BE_FUTURE',
            'Der Veröffentlichungstermin ist während der Freigabe abgelaufen.'
          );
        }
        post = approval?.post || approval;
        if (!post) {
          throw scheduledPublicationError(
            'CONTENT_APPROVAL_STALE',
            'Der Entwurf wurde während der Freigabe verändert.'
          );
        }
      }
      const job = await enqueuePublicationJob({
        postId: normalizedPostId,
        approvalVersion: reviewVersion,
        publicationVersion,
        runAfter: normalizedScheduledAt
      }, client);
      if (!job) throw new Error('Der Veröffentlichungsjob konnte nicht angelegt werden.');
      return { post, job };
    });
  }

  async function publishNowAfterMissedSlot({ postId, admin, confirmed } = {}) {
    requireConfirmation(confirmed);
    const normalizedPostId = positiveDatabaseInteger(postId, 'postId');
    const normalizedAdmin = normalizeAdmin(admin);

    return withTransaction(async (client) => {
      const initial = await publicationService.revalidateDraftForPublication({
        postId: normalizedPostId,
        client,
        workflowStatuses: ['needs_review']
      });
      const missedAt = normalizeDate(
        initial.draft.post.scheduled_at,
        'CONTENT_PUBLICATION_SLOT_NOT_MISSED',
        'Der Entwurf besitzt keinen verpassten Veröffentlichungstermin.'
      );
      if (missedAt.getTime() >= now().getTime()) {
        throw scheduledPublicationError(
          'CONTENT_PUBLICATION_SLOT_NOT_MISSED',
          'Die Sofortveröffentlichung ist erst nach einem verpassten Termin möglich.'
        );
      }
      const approvalVersion = positiveDatabaseInteger(
        initial.draft.post.review_version,
        'approvalVersion'
      );
      const publicationVersion = positiveDatabaseInteger(
        initial.draft.post.publication_version,
        'publicationVersion'
      );
      const approvedPost = await repository.approveDraftForSchedule({
        postId: normalizedPostId,
        scheduledAt: missedAt,
        reviewVersion: approvalVersion,
        publicationVersion,
        adminId: normalizedAdmin.id,
        allowMissedSlot: true
      }, client);
      if (!approvedPost) {
        throw scheduledPublicationError(
          'CONTENT_APPROVAL_STALE',
          'Der Entwurf wurde während der Sofortfreigabe verändert.'
        );
      }
      const validated = await publicationService.revalidateDraftForPublication({
        postId: normalizedPostId,
        client,
        lockedDraft: { ...initial.draft, post: approvedPost },
        workflowStatuses: ['approved_scheduled']
      });
      return createScheduledEventAndPublish({
        postId: normalizedPostId,
        approvalVersion,
        publicationVersion,
        scheduledAt: missedAt,
        approvedPost,
        qualityScore: validated.qualityScore,
        admin: normalizedAdmin,
        client,
        leaseGuard: null
      });
    });
  }

  async function publishApprovedPost({
    postId,
    approvalVersion,
    publicationVersion,
    scheduledAt,
    leaseGuard
  } = {}) {
    const normalizedPostId = positiveDatabaseInteger(postId, 'postId');
    const normalizedApprovalVersion = positiveDatabaseInteger(
      approvalVersion,
      'approvalVersion'
    );
    const normalizedPublicationVersion = positiveDatabaseInteger(
      publicationVersion,
      'publicationVersion'
    );
    const normalizedScheduledAt = normalizeDate(
      scheduledAt,
      'CONTENT_ACTION_VALIDATION_FAILED',
      'Der Termin-Snapshot des Veröffentlichungsjobs ist ungültig.'
    );
    requireLeaseGuard(leaseGuard);
    await assertActiveLease(leaseGuard);

    return withTransaction(async (client) => {
      const lockedDraft = await repository.getDraftWithMetadataForUpdate(
        normalizedPostId,
        client
      );
      const lockedPost = lockedDraft?.post;
      if (!lockedPost) {
        throw scheduledPublicationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
      }
      if (lockedPost.published === true && lockedPost.workflow_status === 'published') {
        const committedScheduledAt = normalizeDate(
          lockedPost.scheduled_at,
          'CONTENT_APPROVAL_STALE',
          'Der gespeicherte Veröffentlichungstermin ist ungültig.'
        );
        if (Number(lockedPost.publication_version) !== normalizedPublicationVersion + 1
            || committedScheduledAt.getTime() !== normalizedScheduledAt.getTime()) {
          throw scheduledPublicationError(
            'CONTENT_APPROVAL_STALE',
            'Die Publikationsversion ist veraltet.'
          );
        }
        const event = assertCommittedEvent(
          await repository.getScheduledManualEvent({
            postId: normalizedPostId,
            publicationVersion: normalizedPublicationVersion
          }, client),
          {
            postId: normalizedPostId,
            approvalVersion: normalizedApprovalVersion,
            publicationVersion: normalizedPublicationVersion,
            scheduledAt: normalizedScheduledAt
          }
        );
        const settings = await repository.getSettings(client);
        if (!settings) throw new Error('Content-Agent-Einstellungen fehlen.');
        await assertActiveLease(leaseGuard);
        return { post: lockedPost, event, settings, alreadyPublished: true };
      }

      assertApprovalVersions(
        lockedPost,
        normalizedApprovalVersion,
        normalizedPublicationVersion
      );
      const scheduledAt = normalizeDate(
        lockedPost.scheduled_at,
        'CONTENT_APPROVAL_STALE',
        'Der gespeicherte Veröffentlichungstermin ist ungültig.'
      );
      if (scheduledAt.getTime() !== normalizedScheduledAt.getTime()) {
        throw scheduledPublicationError(
          'CONTENT_APPROVAL_STALE',
          'Der Termin-Snapshot des Veröffentlichungsjobs ist veraltet.'
        );
      }
      if (scheduledAt.getTime() > now().getTime()) {
        const error = scheduledPublicationError(
          'CONTENT_PUBLICATION_NOT_DUE',
          'Der freigegebene Entwurf ist noch nicht zur Veröffentlichung fällig.'
        );
        error.retryable = true;
        error.retryAt = scheduledAt;
        throw error;
      }
      const validated = await publicationService.revalidateDraftForPublication({
        postId: normalizedPostId,
        client,
        lockedDraft,
        workflowStatuses: ['approved_scheduled']
      });
      await assertActiveLease(leaseGuard);
      const approvingAdmin = await repository.getApprovingAdmin(
        lockedPost.approved_by_admin_id,
        client
      );
      if (!approvingAdmin) {
        throw scheduledPublicationError(
          'CONTENT_APPROVAL_STALE',
          'Die freigebende Adminidentität ist nicht mehr verfügbar.'
        );
      }
      return createScheduledEventAndPublish({
        postId: normalizedPostId,
        approvalVersion: normalizedApprovalVersion,
        publicationVersion: normalizedPublicationVersion,
        scheduledAt: normalizedScheduledAt,
        approvedPost: lockedPost,
        qualityScore: validated.qualityScore,
        admin: normalizeAdmin(approvingAdmin),
        client,
        leaseGuard
      });
    });
  }

  return { approveForSchedule, publishNowAfterMissedSlot, publishApprovedPost };
}

const defaultService = createScheduledPublicationService();

export function approveForSchedule(input, dependencies) {
  return dependencies
    ? createScheduledPublicationService(dependencies).approveForSchedule(input)
    : defaultService.approveForSchedule(input);
}

export function publishNowAfterMissedSlot(input, dependencies) {
  return dependencies
    ? createScheduledPublicationService(dependencies).publishNowAfterMissedSlot(input)
    : defaultService.publishNowAfterMissedSlot(input);
}

export function publishApprovedPost(input, dependencies) {
  return dependencies
    ? createScheduledPublicationService(dependencies).publishApprovedPost(input)
    : defaultService.publishApprovedPost(input);
}
