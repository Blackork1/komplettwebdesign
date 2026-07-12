import { isDeepStrictEqual } from 'node:util';

import pool from '../../util/db.js';
import { createContentPublishEventRepository } from '../../repositories/contentPublishEventRepository.js';
import { enqueueApprovedPublicationJob } from '../../repositories/contentJobRepository.js';
import { createContentPublicationService } from './contentPublicationService.js';
import { queuePublishedArticleNewsletter as queuePublishedArticleNewsletterJob } from './blogNewsletterService.js';
import {
  AUTO_PUBLISH_POLICY_VERSION,
  evaluateAutoPublish
} from './autoPublishPolicy.js';

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

function normalizeCanonicalAutoDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  if (typeof value !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.toISOString() !== value ? null : date;
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
      || (post.approved_by_admin_id !== null
        && post.approved_by_admin_id !== undefined
        && (!Number.isSafeInteger(Number(post.approved_by_admin_id))
          || Number(post.approved_by_admin_id) <= 0))) {
    throw scheduledPublicationError(
      'CONTENT_APPROVAL_STALE',
      'Die Freigabe- oder Publikationsversion ist veraltet.'
    );
  }
}

function autoScheduleContext({ snapshot, approvalVersion, publicationVersion, scheduledAt }) {
  return {
    action: 'auto_schedule_policy',
    settingsVersion: Number.isSafeInteger(Number(snapshot?.settingsVersion))
      ? Number(snapshot.settingsVersion)
      : null,
    source: typeof snapshot?.source === 'string' ? snapshot.source : 'unknown',
    forcedMode: snapshot?.forcedMode === 'review' ? 'review' : null,
    approvalVersion,
    publicationVersion,
    scheduledAt: scheduledAt?.toISOString() ?? null
  };
}

function assertAutoEvent(event, expected) {
  const reasons = event?.reasons_json;
  if (!event
      || Number(event.post_id) !== expected.postId
      || Number(event.run_id) !== expected.runId
      || event.policy_version !== AUTO_PUBLISH_POLICY_VERSION
      || event.decision !== expected.decision
      || Number(event.quality_score) !== Number(expected.qualityScore)
      || !Array.isArray(reasons)
      || !isDeepStrictEqual(reasons, expected.reasons)
      || !isDeepStrictEqual(event.context_json, expected.context)) {
    throw scheduledPublicationError(
      'CONTENT_APPROVAL_STALE',
      'Die automatische Freigabequelle passt nicht zum unveränderlichen Publikationssnapshot.'
    );
  }
  return event;
}

function assertCommittedAutoEvent(event, {
  postId,
  runId,
  approvalVersion,
  publicationVersion,
  scheduledAt
}) {
  const context = event?.context_json;
  if (!event
      || Number(event.post_id) !== postId
      || Number(event.run_id) !== runId
      || event.decision !== 'allowed'
      || event.policy_version !== AUTO_PUBLISH_POLICY_VERSION
      || !Array.isArray(event.reasons_json)
      || event.reasons_json.length !== 0
      || context?.action !== 'auto_schedule_policy'
      || Number(context?.approvalVersion) !== approvalVersion
      || Number(context?.publicationVersion) !== publicationVersion
      || context?.scheduledAt !== scheduledAt.toISOString()) {
    throw scheduledPublicationError(
      'CONTENT_APPROVAL_STALE',
      'Die automatische Freigabequelle passt nicht zu den Jobversionen.'
    );
  }
  return event;
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
  queuePublishedArticleNewsletter = queuePublishedArticleNewsletterJob,
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
    autoEvent = null,
    publicationSource = 'manual',
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
    let event = autoEvent;
    let settings;
    if (publicationSource === 'manual') {
      event = await repository.insertScheduledManualEvent({
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
      settings = await repository.incrementManualApprovals(client);
    } else {
      await assertActiveLease(leaseGuard);
      settings = await repository.getSettings(client);
    }
    if (!settings) throw new Error('Content-Agent-Einstellungen fehlen.');
    await assertActiveLease(leaseGuard);
    let newsletter = null;
    if (settings.newsletter_blog_notifications_enabled === true
        && Number(settings.manual_approvals_count) >= 8) {
      newsletter = await queuePublishedArticleNewsletter({
        postId,
        publicationVersion,
        settings,
        post,
        leaseGuard
      }, client);
      await assertActiveLease(leaseGuard);
    }
    return { post, event, settings, publicationSource, newsletter };
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
          const reschedule = await repository.rescheduleApprovedDraft({
            postId: normalizedPostId,
            scheduledAt: normalizedScheduledAt,
            approvalVersion: reviewVersion,
            publicationVersion,
            adminId: normalizedAdmin.id
          }, client);
          if (reschedule?.scheduleExpired === true) {
            throw scheduledPublicationError(
              'CONTENT_SCHEDULE_MUST_BE_FUTURE',
              'Der Veröffentlichungstermin ist während der Verschiebung abgelaufen.'
            );
          }
          post = reschedule?.post || reschedule;
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

  async function approveAutomaticallyForSchedule({
    postId,
    runId,
    scheduledAt,
    snapshot,
    leaseGuard
  } = {}) {
    const normalizedPostId = positiveDatabaseInteger(postId, 'postId');
    const normalizedRunId = positiveDatabaseInteger(runId, 'runId');
    const normalizedScheduledAt = normalizeCanonicalAutoDate(scheduledAt);
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw scheduledPublicationError(
        'CONTENT_ACTION_VALIDATION_FAILED',
        'Der unveränderliche Auto-Publish-Snapshot fehlt.'
      );
    }
    if (normalizedScheduledAt && snapshot.publicationAt !== normalizedScheduledAt.toISOString()) {
      throw scheduledPublicationError(
        'CONTENT_APPROVAL_STALE',
        'Der automatische Veröffentlichungstermin widerspricht dem unveränderlichen Snapshot.'
      );
    }
    requireLeaseGuard(leaseGuard);
    await assertActiveLease(leaseGuard);

    return withTransaction(async (client) => {
      const lockedDraft = await repository.getDraftWithMetadataForUpdate(
        normalizedPostId,
        client
      );
      if (!lockedDraft?.post) {
        throw scheduledPublicationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
      }
      let revalidationFailed = false;
      let validated;
      try {
        validated = await publicationService.revalidateDraftForPublication({
          postId: normalizedPostId,
          client,
          lockedDraft,
          workflowStatuses: ['needs_review', 'approved_scheduled']
        });
      } catch (error) {
        if (lockedDraft.post.workflow_status !== 'needs_review'
            || !String(error?.code || '').startsWith('CONTENT_DRAFT_')) throw error;
        revalidationFailed = true;
        const qualityScore = Number(lockedDraft.metadata?.quality_score);
        validated = {
          draft: lockedDraft,
          qualityScore: Number.isInteger(qualityScore) && qualityScore >= 0 && qualityScore <= 100
            ? qualityScore
            : 0,
          validation: { passed: false, issues: [], sanitizedHtml: '' },
          riskReport: lockedDraft.metadata?.quality_report_json?.focusedReview || null
        };
      }
      const current = validated.draft.post;
      if (Number(current.generation_run_id) !== normalizedRunId) {
        throw scheduledPublicationError(
          'CONTENT_APPROVAL_STALE',
          'Der Entwurf gehört nicht zum unveränderlichen Generierungslauf.'
        );
      }
      const approvalVersion = positiveDatabaseInteger(current.review_version, 'approvalVersion');
      const publicationVersion = positiveDatabaseInteger(
        current.publication_version,
        'publicationVersion'
      );
      let event = await repository.getAutoEvent({
        runId: normalizedRunId,
        policyVersion: AUTO_PUBLISH_POLICY_VERSION
      }, client);
      if (current.workflow_status === 'approved_scheduled') {
        if (!normalizedScheduledAt) {
          throw scheduledPublicationError(
            'CONTENT_APPROVAL_STALE',
            'Der persistierte automatische Veröffentlichungstermin besitzt keinen gültigen Snapshot.'
          );
        }
        const persistedSchedule = normalizeDate(
          current.scheduled_at,
          'CONTENT_APPROVAL_STALE',
          'Der gespeicherte automatische Veröffentlichungstermin ist ungültig.'
        );
        if (current.approved_by_admin_id != null
            || Number(current.approved_review_version) !== approvalVersion
            || persistedSchedule.getTime() !== normalizedScheduledAt.getTime()) {
          throw scheduledPublicationError(
            'CONTENT_APPROVAL_STALE',
            'Die persistierte automatische Freigabe widerspricht dem Snapshot.'
          );
        }
        assertAutoEvent(event, {
          postId: normalizedPostId,
          runId: normalizedRunId,
          decision: 'allowed',
          qualityScore: validated.qualityScore,
          reasons: [],
          context: autoScheduleContext({
            snapshot,
            approvalVersion,
            publicationVersion,
            scheduledAt: normalizedScheduledAt
          })
        });
        await assertActiveLease(leaseGuard);
        const job = await enqueuePublicationJob({
          postId: normalizedPostId,
          approvalVersion,
          publicationVersion,
          runAfter: normalizedScheduledAt
        }, client);
        if (!job) throw new Error('Der automatische Veröffentlichungsjob konnte nicht angelegt werden.');
        await assertActiveLease(leaseGuard);
        return {
          post: current,
          event,
          decision: { allowed: true, policyVersion: AUTO_PUBLISH_POLICY_VERSION, reasons: [] },
          reviewRequired: false,
          job
        };
      }
      const evaluatedDecision = evaluateAutoPublish({
        snapshot,
        post: current,
        metadata: validated.draft.metadata,
        validation: validated.validation,
        riskReport: validated.riskReport
      });
      const decision = revalidationFailed
        ? {
          ...evaluatedDecision,
          allowed: false,
          reasons: evaluatedDecision.reasons.includes('draft_revalidation_failed')
            ? evaluatedDecision.reasons
            : [...evaluatedDecision.reasons, 'draft_revalidation_failed']
        }
        : evaluatedDecision;
      const expectedEvent = {
        postId: normalizedPostId,
        runId: normalizedRunId,
        decision: decision.allowed ? 'allowed' : 'blocked',
        qualityScore: validated.qualityScore,
        reasons: decision.reasons,
        context: autoScheduleContext({
          snapshot,
          approvalVersion,
          publicationVersion,
          scheduledAt: normalizedScheduledAt
        })
      };
      if (event) {
        assertAutoEvent(event, expectedEvent);
      } else {
        await assertActiveLease(leaseGuard);
        event = await repository.insertAutoEvent({
          ...expectedEvent,
          policyVersion: AUTO_PUBLISH_POLICY_VERSION
        }, client);
        if (!event) {
          event = await repository.getAutoEvent({
            runId: normalizedRunId,
            policyVersion: AUTO_PUBLISH_POLICY_VERSION
          }, client);
        }
        assertAutoEvent(event, expectedEvent);
      }
      if (!decision.allowed) {
        await assertActiveLease(leaseGuard);
        return {
          post: current,
          event,
          decision,
          reviewRequired: true,
          job: null
        };
      }
      if (!normalizedScheduledAt || normalizedScheduledAt.getTime() <= now().getTime()) {
        throw scheduledPublicationError(
          'CONTENT_SCHEDULE_MUST_BE_FUTURE',
          'Der automatische Veröffentlichungstermin muss in der Zukunft liegen.'
        );
      }

      let post = current;
      if (current.workflow_status === 'needs_review') {
        await assertActiveLease(leaseGuard);
        const approval = await repository.approveDraftForSchedule({
          postId: normalizedPostId,
          scheduledAt: normalizedScheduledAt,
          reviewVersion: approvalVersion,
          publicationVersion,
          adminId: null
        }, client);
        if (approval?.scheduleExpired === true) {
          throw scheduledPublicationError(
            'CONTENT_SCHEDULE_MUST_BE_FUTURE',
            'Der automatische Veröffentlichungstermin ist während der Freigabe abgelaufen.'
          );
        }
        post = approval?.post || approval;
        if (!post) {
          throw scheduledPublicationError(
            'CONTENT_APPROVAL_STALE',
            'Der Entwurf wurde während der automatischen Freigabe verändert.'
          );
        }
      }
      await assertActiveLease(leaseGuard);
      const job = await enqueuePublicationJob({
        postId: normalizedPostId,
        approvalVersion,
        publicationVersion,
        runAfter: normalizedScheduledAt
      }, client);
      if (!job) throw new Error('Der automatische Veröffentlichungsjob konnte nicht angelegt werden.');
      await assertActiveLease(leaseGuard);
      return {
        post,
        event,
        decision,
        reviewRequired: false,
        job
      };
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
      async function loadCommittedApprovalEvent(post) {
        if (post.approved_by_admin_id != null) {
          return {
            publicationSource: 'manual',
            event: assertCommittedEvent(
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
            )
          };
        }
        const runId = positiveDatabaseInteger(post.generation_run_id, 'runId');
        return {
          publicationSource: 'auto',
          event: assertCommittedAutoEvent(
            await repository.getAutoEvent({
              runId,
              policyVersion: AUTO_PUBLISH_POLICY_VERSION
            }, client),
            {
              postId: normalizedPostId,
              runId,
              approvalVersion: normalizedApprovalVersion,
              publicationVersion: normalizedPublicationVersion,
              scheduledAt: normalizedScheduledAt
            }
          )
        };
      }

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
        const approval = await loadCommittedApprovalEvent(lockedPost);
        const settings = await repository.getSettings(client);
        if (!settings) throw new Error('Content-Agent-Einstellungen fehlen.');
        await assertActiveLease(leaseGuard);
        return {
          post: lockedPost,
          event: approval.event,
          settings,
          publicationSource: approval.publicationSource,
          newsletter: null,
          alreadyPublished: true
        };
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
      let approvingAdmin = null;
      let autoEvent = null;
      let publicationSource = 'manual';
      if (lockedPost.approved_by_admin_id != null) {
        approvingAdmin = await repository.getApprovingAdmin(
          lockedPost.approved_by_admin_id,
          client
        );
        if (!approvingAdmin) {
          throw scheduledPublicationError(
            'CONTENT_APPROVAL_STALE',
            'Die freigebende Adminidentität ist nicht mehr verfügbar.'
          );
        }
      } else {
        const approval = await loadCommittedApprovalEvent(lockedPost);
        publicationSource = approval.publicationSource;
        autoEvent = approval.event;
      }
      return createScheduledEventAndPublish({
        postId: normalizedPostId,
        approvalVersion: normalizedApprovalVersion,
        publicationVersion: normalizedPublicationVersion,
        scheduledAt: normalizedScheduledAt,
        approvedPost: lockedPost,
        qualityScore: validated.qualityScore,
        admin: approvingAdmin ? normalizeAdmin(approvingAdmin) : null,
        autoEvent,
        publicationSource,
        client,
        leaseGuard
      });
    });
  }

  return {
    approveForSchedule,
    approveAutomaticallyForSchedule,
    publishNowAfterMissedSlot,
    publishApprovedPost
  };
}

const defaultService = createScheduledPublicationService();

export function approveForSchedule(input, dependencies) {
  return dependencies
    ? createScheduledPublicationService(dependencies).approveForSchedule(input)
    : defaultService.approveForSchedule(input);
}

export function approveAutomaticallyForSchedule(input, dependencies) {
  return dependencies
    ? createScheduledPublicationService(dependencies).approveAutomaticallyForSchedule(input)
    : defaultService.approveAutomaticallyForSchedule(input);
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
