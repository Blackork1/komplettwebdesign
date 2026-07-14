import { hostname } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getContentAgentConfig } from '../services/contentAgent/config.js';
import {
  buildAllowedInternalLinksFromInventory,
  validateContentRuleSnapshot
} from '../services/contentAgent/contentRuleManifest.js';
import { createContentWorker, LeaseLostError } from '../services/contentAgent/workerService.js';

export const GENERATION_JOB_TYPES = new Set(['generate_weekly_draft', 'generate_manual_draft']);
export const REGENERATION_JOB_TYPES = new Set([
  'regenerate_article',
  'regenerate_metadata',
  'regenerate_faq',
  'regenerate_image',
  'optimize_review_issues'
]);
export const AUDIT_JOB_TYPES = new Set(['audit_existing_posts']);
export const NOTIFICATION_JOB_TYPES = new Set(['send_admin_review_notification']);
export const PUBLICATION_JOB_TYPES = new Set(['publish_approved_post']);
export const NEWSLETTER_JOB_TYPES = new Set([
  'send_blog_newsletter',
  'send_blog_newsletter_delivery'
]);
export const SEARCH_CONSOLE_JOB_TYPES = new Set([
  'sync_search_console',
  'analyze_search_opportunities'
]);
export const SUPPORTED_JOB_TYPES = new Set([
  ...GENERATION_JOB_TYPES,
  ...REGENERATION_JOB_TYPES,
  ...AUDIT_JOB_TYPES,
  ...NOTIFICATION_JOB_TYPES,
  ...PUBLICATION_JOB_TYPES,
  ...NEWSLETTER_JOB_TYPES,
  ...SEARCH_CONSOLE_JOB_TYPES
]);

const MAX_DATABASE_ID = 2_147_483_647;

function required(value, name) {
  if (!value) throw new TypeError(`Die Produktionsabhängigkeit ${name} wird benötigt.`);
  return value;
}

function permanentJobError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.retryable = false;
  return error;
}

function retryableJobError(message, code, cause = null) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  error.retryable = true;
  return error;
}

function positiveDatabasePayloadInteger(value) {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0
    && value <= MAX_DATABASE_ID;
}

function positiveSafePayloadInteger(value) {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0;
}

function canonicalIsoTimestamp(value) {
  if (typeof value !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.toISOString() !== value ? null : value;
}

function canonicalIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function searchConsoleJobPayload(claim) {
  const payload = claim?.payload_json;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const keys = Object.keys(payload);
  if (
    keys.length !== 2
    || !Object.hasOwn(payload, 'startDate')
    || !Object.hasOwn(payload, 'endDate')
  ) return null;
  const startDate = canonicalIsoDate(payload.startDate);
  const endDate = canonicalIsoDate(payload.endDate);
  if (!startDate || !endDate || startDate > endDate) return null;
  return { startDate, endDate };
}

function reviewIssueOptimizationPayload(claim) {
  const payload = claim?.payload_json;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const allowedKeys = new Set([
    'source',
    'post_id',
    'forced_mode',
    'expected_review_version',
    'issue_mode',
    'issue_index'
  ]);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))
      || payload.source !== 'admin_regeneration'
      || payload.forced_mode !== 'review'
      || !positiveDatabasePayloadInteger(payload.post_id)
      || !positiveSafePayloadInteger(payload.expected_review_version)
      || !['single', 'all'].includes(payload.issue_mode)) return null;
  if (payload.issue_mode === 'single') {
    if (!Object.hasOwn(payload, 'issue_index')
        || typeof payload.issue_index !== 'number'
        || !Number.isSafeInteger(payload.issue_index)
        || payload.issue_index < 0) return null;
  } else if (Object.hasOwn(payload, 'issue_index')) {
    return null;
  }
  return payload;
}

function publicationJobPayload(claim) {
  const payload = claim?.payload_json;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const allowedKeys = new Set([
    'postId',
    'approvalVersion',
    'publicationVersion',
    'scheduledAt'
  ]);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) return null;
  if (!positiveDatabasePayloadInteger(payload.postId)
      || !positiveDatabasePayloadInteger(payload.approvalVersion)
      || !positiveDatabasePayloadInteger(payload.publicationVersion)) return null;
  const scheduledAt = canonicalIsoTimestamp(payload.scheduledAt);
  if (!scheduledAt) return null;
  return {
    postId: payload.postId,
    approvalVersion: payload.approvalVersion,
    publicationVersion: payload.publicationVersion,
    scheduledAt
  };
}

function newsletterJobPayload(claim) {
  const payload = claim?.payload_json;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  if (claim.job_type === 'send_blog_newsletter_delivery') {
    if (Object.keys(payload).length !== 1
        || !Object.hasOwn(payload, 'deliveryId')
        || !positiveSafePayloadInteger(payload.deliveryId)) return null;
    return { deliveryId: payload.deliveryId };
  }
  const allowedKeys = new Set(['postId', 'publicationVersion', 'cursor']);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))
      || Object.keys(payload).length !== 3
      || !positiveDatabasePayloadInteger(payload.postId)
      || !positiveDatabasePayloadInteger(payload.publicationVersion)
      || typeof payload.cursor !== 'number'
      || !Number.isSafeInteger(payload.cursor)
      || payload.cursor < 0) return null;
  return {
    postId: payload.postId,
    publicationVersion: payload.publicationVersion,
    cursor: payload.cursor
  };
}

function assertFinishedRun(value) {
  if (!value || typeof value !== 'object') {
    const error = new Error('Der Content-Agent-Lauf konnte nicht sicher abgeschlossen werden.');
    error.code = 'CONTENT_RUN_FINISH_FAILED';
    error.retryable = true;
    throw error;
  }
  return value;
}

async function assertActiveLease(leaseGuard) {
  if (typeof leaseGuard !== 'function') return;
  const active = await leaseGuard();
  if (active === false) throw new LeaseLostError();
}

function runFinishFailed(cause) {
  if (cause?.code === 'CONTENT_RUN_FINISH_FAILED' && cause?.retryable === true) return cause;
  const error = new Error(
    'Der Content-Agent-Lauf konnte nicht sicher abgeschlossen werden.',
    cause ? { cause } : undefined
  );
  error.code = 'CONTENT_RUN_FINISH_FAILED';
  error.retryable = true;
  return error;
}

async function finishRunOrRetry(finishRun, runId, payload) {
  try {
    return assertFinishedRun(await finishRun(runId, payload));
  } catch (error) {
    throw runFinishFailed(error);
  }
}

export function berlinDateKey(date = new Date(), timezone = 'Europe/Berlin') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function createProductionJobHandler({
  timezone = 'Europe/Berlin',
  now = () => new Date(),
  technicalConfig,
  getSettings,
  resolveRuntimeConfig,
  createJobSnapshot,
  findRunByJobId,
  enforceRuleSnapshot = false,
  loadInitialInventory,
  createRun,
  finishRun,
  runPipeline,
  pipelineDependencies,
  createPipelineDependencies,
  runRegenerationJob,
  createRegenerationDependencies,
  runReviewIssueOptimizationJob,
  createOptimizationDependencies,
  runAuditJob,
  createAuditDependencies,
  sendAdminReviewNotification,
  publishApprovedPost,
  sendBlogNewsletter,
  sendBlogNewsletterDelivery,
  syncSearchConsoleRange,
  listAggregatedSearchMetrics,
  buildSearchOpportunities,
  upsertSearchOpportunities,
  recordProviderResult,
  enqueueJob
}) {
  required(createRun, 'createRun');
  required(runPipeline, 'runPipeline');
  return async function handleJob(claim, { leaseGuard } = {}) {
    if (!SUPPORTED_JOB_TYPES.has(claim?.job_type)) {
      throw permanentJobError('Nicht unterstützter Content-Jobtyp.', 'CONTENT_JOB_TYPE_UNSUPPORTED');
    }
    if (claim.job_type === 'optimize_review_issues' && !reviewIssueOptimizationPayload(claim)) {
      throw permanentJobError(
        'Der Prüfhinweis-Optimierungsjob enthält keinen gültigen Review- und Versionssnapshot.',
        'CONTENT_REVIEW_OPTIMIZATION_JOB_PAYLOAD_INVALID'
      );
    }
    if (SEARCH_CONSOLE_JOB_TYPES.has(claim.job_type)) {
      if (typeof leaseGuard !== 'function') {
        throw permanentJobError(
          'Für Search-Console-Jobs wird eine aktive Job-Lease benötigt.',
          'CONTENT_JOB_LEASE_REQUIRED'
        );
      }
      const payload = searchConsoleJobPayload(claim);
      if (!payload) {
        throw permanentJobError(
          'Der Search-Console-Job enthält keinen gültigen Zeitraum.',
          'CONTENT_SEARCH_CONSOLE_JOB_PAYLOAD_INVALID'
        );
      }
      await assertActiveLease(leaseGuard);
      if (claim.job_type === 'sync_search_console') {
        required(syncSearchConsoleRange, 'syncSearchConsoleRange');
        required(recordProviderResult, 'recordProviderResult');
        required(enqueueJob, 'enqueueJob');
        try {
          await syncSearchConsoleRange({ ...payload, leaseGuard });
        } catch (error) {
          await assertActiveLease(leaseGuard);
          await recordProviderResult({
            providerName: 'google_search_console',
            success: false,
            errorCode: 'SEARCH_CONSOLE_SYNC_FAILED'
          });
          throw retryableJobError(
            'Die Search-Console-Synchronisierung ist vorübergehend fehlgeschlagen.',
            'CONTENT_SEARCH_CONSOLE_SYNC_FAILED',
            error
          );
        }
        await assertActiveLease(leaseGuard);
        await recordProviderResult({
          providerName: 'google_search_console',
          success: true
        });
        await assertActiveLease(leaseGuard);
        const analysisJob = await enqueueJob({
          jobType: 'analyze_search_opportunities',
          idempotencyKey: `gsc-analysis:${payload.startDate}:${payload.endDate}`,
          payload
        });
        if (!analysisJob) {
          throw retryableJobError(
            'Der Search-Console-Analysejob konnte noch nicht eingeplant werden.',
            'CONTENT_GSC_ANALYSIS_ENQUEUE_DEFERRED'
          );
        }
        return { status: 'completed' };
      }

      required(listAggregatedSearchMetrics, 'listAggregatedSearchMetrics');
      required(buildSearchOpportunities, 'buildSearchOpportunities');
      required(upsertSearchOpportunities, 'upsertSearchOpportunities');
      const metrics = await listAggregatedSearchMetrics(payload);
      const opportunities = buildSearchOpportunities(metrics, payload);
      await assertActiveLease(leaseGuard);
      await upsertSearchOpportunities(opportunities);
      return { status: 'completed' };
    }
    if (NOTIFICATION_JOB_TYPES.has(claim.job_type)) {
      required(sendAdminReviewNotification, 'sendAdminReviewNotification');
      const deliveryId = Number(claim.payload_json?.deliveryId);
      if (!Number.isSafeInteger(deliveryId) || deliveryId <= 0) {
        throw permanentJobError(
          'Der Admin-Mailjob enthält keine gültige Zustellungs-ID.',
          'CONTENT_ADMIN_NOTIFICATION_DELIVERY_ID_INVALID'
        );
      }
      return sendAdminReviewNotification({
        deliveryId,
        ...(typeof leaseGuard === 'function' ? { leaseGuard } : {})
      });
    }
    if (PUBLICATION_JOB_TYPES.has(claim.job_type)) {
      required(publishApprovedPost, 'publishApprovedPost');
      if (typeof leaseGuard !== 'function') {
        throw permanentJobError(
          'Für die Worker-Veröffentlichung wird eine aktive Job-Lease benötigt.',
          'CONTENT_JOB_LEASE_REQUIRED'
        );
      }
      const payload = publicationJobPayload(claim);
      if (!payload) {
        throw permanentJobError(
          'Der Veröffentlichungsjob enthält keinen gültigen Termin- und Versionssnapshot.',
          'CONTENT_PUBLICATION_JOB_PAYLOAD_INVALID'
        );
      }
      const publication = await publishApprovedPost({ ...payload, leaseGuard });
      return { ...publication, status: 'completed' };
    }
    if (NEWSLETTER_JOB_TYPES.has(claim.job_type)) {
      if (typeof leaseGuard !== 'function') {
        throw permanentJobError(
          'Für den Newsletter-Job wird eine aktive Job-Lease benötigt.',
          'CONTENT_JOB_LEASE_REQUIRED'
        );
      }
      const handler = claim.job_type === 'send_blog_newsletter'
        ? sendBlogNewsletter
        : sendBlogNewsletterDelivery;
      if (typeof handler !== 'function') {
        throw permanentJobError(
          'Für diesen Newsletter-Job ist noch kein Versandhandler konfiguriert.',
          'CONTENT_NEWSLETTER_HANDLER_UNAVAILABLE'
        );
      }
      const payload = newsletterJobPayload(claim);
      if (!payload) {
        throw permanentJobError(
          'Der Newsletter-Job enthält keinen gültigen Payload.',
          'CONTENT_NEWSLETTER_JOB_PAYLOAD_INVALID'
        );
      }
      const result = await handler({
        ...payload,
        leaseGuard
      });
      return { ...result, status: 'completed' };
    }

    const snapshotEnabled = typeof getSettings === 'function'
      && typeof resolveRuntimeConfig === 'function'
      && typeof createJobSnapshot === 'function';
    const generationJob = GENERATION_JOB_TYPES.has(claim.job_type);
    let initialInventory = null;
    let runtimeSnapshot;
    let run = snapshotEnabled && typeof findRunByJobId === 'function'
      ? await findRunByJobId(claim.id)
      : null;
    if (!run) {
      if (snapshotEnabled) {
        const settings = await getSettings();
        const runtimeConfig = resolveRuntimeConfig({ technicalConfig, settings });
        let allowedInternalLinks;
        if (generationJob && enforceRuleSnapshot) {
          required(loadInitialInventory, 'loadInitialInventory');
          initialInventory = await loadInitialInventory();
          allowedInternalLinks = buildAllowedInternalLinksFromInventory(initialInventory);
        }
        runtimeSnapshot = createJobSnapshot({
          runtimeConfig,
          claim,
          now: now(),
          ...(generationJob && enforceRuleSnapshot ? {
            allowedInternalLinks,
            requireAllowedInternalLinks: true
          } : {})
        });
      }
      run = await createRun({
        jobId: claim.id,
        ...(snapshotEnabled ? { runtimeSnapshot } : {})
      });
    }
    if (!run?.id) throw new Error('Content-Agent-Lauf konnte nicht angelegt werden.');
    const persistedSnapshot = snapshotEnabled ? run.runtime_snapshot_json : null;
    if (snapshotEnabled && enforceRuleSnapshot && run.status !== 'completed') {
      const validation = validateContentRuleSnapshot(persistedSnapshot, {
        requireAllowedInternalLinks: generationJob
      });
      if (!validation.valid) {
        required(finishRun, 'finishRun');
        const code = validation.code || 'CONTENT_RUNTIME_SNAPSHOT_INVALID';
        await assertActiveLease(leaseGuard);
        assertFinishedRun(await finishRun(run.id, {
          status: 'needs_manual_attention',
          postId: null,
          errorReport: {
            code,
            message: code === 'CONTENT_RULE_MANIFEST_MISMATCH'
              ? 'Der gespeicherte Regelsnapshot passt nicht zur aktuellen Content-Agent-Version.'
              : 'Der gespeicherte Runtime-Snapshot ist unvollständig oder ungültig.'
          }
        }));
        return { status: 'needs_manual_attention', post: null, code };
      }
    }
    const jobTimezone = persistedSnapshot?.timezone || timezone;
    let result;
    if (AUDIT_JOB_TYPES.has(claim.job_type)) {
      required(runAuditJob, 'runAuditJob');
      required(createAuditDependencies, 'createAuditDependencies');
      try {
        result = await runAuditJob({
          claim,
          run,
          runtimeSnapshot: persistedSnapshot,
          currentYear: Number(berlinDateKey(now(), jobTimezone).slice(0, 4)),
          ...(typeof leaseGuard === 'function' ? { leaseGuard } : {})
        }, await createAuditDependencies(persistedSnapshot));
        if (result?.status !== 'completed') {
          throw permanentJobError('Bestandsprüfung lieferte keinen terminalen Status.', 'CONTENT_AUDIT_RESULT_INVALID');
        }
        required(finishRun, 'finishRun');
        if (typeof leaseGuard === 'function') await leaseGuard();
        assertFinishedRun(await finishRun(run.id, { status: 'completed', postId: null }));
      } catch (error) {
        const permanent = error?.retryable === false && error?.code !== 'CONTENT_JOB_LEASE_LOST';
        if (permanent) {
          required(finishRun, 'finishRun');
          if (typeof leaseGuard === 'function') await leaseGuard();
          assertFinishedRun(await finishRun(run.id, {
            status: 'failed', postId: null,
            errorReport: { code: error.code || 'CONTENT_AUDIT_FAILED', message: error.message || 'Bestandsprüfung fehlgeschlagen.' }
          }));
        }
        throw error;
      }
    } else if (REGENERATION_JOB_TYPES.has(claim.job_type)) {
      const reviewIssueOptimization = claim.job_type === 'optimize_review_issues';
      const jobRunner = reviewIssueOptimization
        ? required(runReviewIssueOptimizationJob, 'runReviewIssueOptimizationJob')
        : required(runRegenerationJob, 'runRegenerationJob');
      const dependencyFactory = reviewIssueOptimization
        ? required(createOptimizationDependencies, 'createOptimizationDependencies')
        : required(createRegenerationDependencies, 'createRegenerationDependencies');
      const regenerationDependencies = await dependencyFactory(persistedSnapshot);
      try {
        result = await jobRunner({
          claim,
          run,
          runtimeSnapshot: persistedSnapshot,
          ...(typeof leaseGuard === 'function' ? { leaseGuard } : {})
        }, regenerationDependencies);
      } catch (error) {
        const isLeaseLoss = error?.code === 'CONTENT_JOB_LEASE_LOST';
        if (error?.retryable === false && !isLeaseLoss) {
          required(finishRun, 'finishRun');
          if (typeof leaseGuard === 'function') await leaseGuard();
          await finishRunOrRetry(finishRun, run.id, {
            status: 'failed',
            postId: null,
            errorReport: {
              code: error?.code || 'CONTENT_REGENERATION_FAILED',
              message: error?.message || 'Die Entwurfsregeneration ist dauerhaft fehlgeschlagen.'
            }
          });
        }
        throw error;
      }
    } else {
      const jobDependencies = typeof createPipelineDependencies === 'function'
        ? await createPipelineDependencies(persistedSnapshot, initialInventory)
        : pipelineDependencies;
      result = await runPipeline({
        ...(claim.payload_json || {}),
        runId: run.id,
        ...(typeof leaseGuard === 'function' ? { leaseGuard } : {}),
        currentDate: berlinDateKey(now(), jobTimezone)
      }, jobDependencies);
    }
    if (!['completed', 'needs_manual_attention'].includes(result?.status)) {
      throw new Error('Content-Agent-Pipeline lieferte keinen terminalen Status.');
    }
    return result;
  };
}

function inventoryLoaders(database, pricingService) {
  return {
    async loadBlogPosts() {
      const { rows } = await database.query(`
        SELECT p.title, p.slug, p.excerpt, p.content, p.category, p.description,
               m.primary_keyword, m.content_cluster
        FROM posts p
        LEFT JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.published = TRUE
        ORDER BY p.created_at DESC
      `);
      return rows;
    },
    async loadGuides() {
      const { rows } = await database.query(`
        SELECT title, slug, excerpt, content, category, description
        FROM ratgeber
        WHERE published = TRUE
        ORDER BY created_at DESC
      `);
      return rows;
    },
    async loadServicePages() {
      const { rows } = await database.query(`
        SELECT slug, title, subtitle, meta_description, hero_title, hero_subtitle,
               intro_problem_title, intro_solution_title, risks_title,
               cta_title, cta_button_link
        FROM leistungen_pages
        WHERE is_published = TRUE
        ORDER BY created_at DESC
      `);
      return rows;
    },
    async loadIndustries() {
      const { rows } = await database.query(`
        SELECT id, slug, name, title, description, hero_image_url, og_image_url,
               COALESCE(featured, FALSE) AS featured
        FROM industries
        ORDER BY featured DESC, name ASC
      `);
      return rows;
    },
    getVisiblePackages: () => pricingService.getVisiblePackages()
  };
}

function bindRepositories(database, modules) {
  const jobRepository = {
    enqueueJob: (input) => modules.jobRepository.enqueueJob(input, database),
    claimNextJob: (workerId) => modules.jobRepository.claimNextJob(workerId, database),
    renewJobLease: (claim) => modules.jobRepository.renewJobLease(claim, database),
    completeJob: (claim) => modules.jobRepository.completeJob(claim, database),
    failJob: (claim, error) => modules.jobRepository.failJob(claim, error, database),
    rescheduleJobWithoutAttemptConsumption: (claim, error, options) => (
      modules.jobRepository.rescheduleJobWithoutAttemptConsumption(claim, error, options, database)
    ),
    retryOrFailJob: (claim, error, options) => modules.jobRepository.retryOrFailJob(claim, error, options, database),
    markJobNeedsManualAttention: (claim, reason) => modules.jobRepository.markJobNeedsManualAttention(claim, reason, database),
    recoverExpiredJobs: (minutes) => modules.jobRepository.recoverExpiredJobs(minutes, database),
    upsertWorkerHeartbeat: (input) => modules.jobRepository.upsertWorkerHeartbeat(input, database),
    updateContentSchedulerState: (input) => modules.jobRepository.updateContentSchedulerState(input, database)
  };
  const runRepository = {
    findRunByJobId: typeof modules.runRepository.findRunByJobId === 'function'
      ? (jobId) => modules.runRepository.findRunByJobId(jobId, database)
      : async () => null,
    createRun: (input) => modules.runRepository.createRun(input, database),
    updateRunStage: (runId, input) => modules.runRepository.updateRunStage(runId, input, database),
    finishRun: (runId, input) => modules.runRepository.finishRun(runId, input, database)
  };
  const topicRepository = {
    createTopic: (input) => modules.topicRepository.createTopic(input, database),
    markTopicUsed: (topicId) => modules.topicRepository.markTopicUsed(topicId, database)
  };
  const costService = {
    estimateTextCost: modules.costService.estimateTextCost,
    assertMonthlyBudget: modules.costService.assertMonthlyBudget,
    getMonthlyContentCost: (input = {}) => modules.costService.getMonthlyContentCost({ ...input, db: database }),
    reserveMonthlyBudget: (input) => modules.costService.reserveMonthlyBudget({ ...input, db: database }),
    settleMonthlyBudget: (input) => modules.costService.settleMonthlyBudget({ ...input, db: database }),
    releaseMonthlyBudgetReservation: (input) => modules.costService.releaseMonthlyBudgetReservation({ ...input, db: database }),
    getPersistedStageResult: (input) => modules.costService.getPersistedStageResult({ ...input, db: database })
  };
  return { jobRepository, runRepository, topicRepository, costService };
}

export function jobConfigFromSnapshot(technicalConfig, snapshot) {
  if (!snapshot) return technicalConfig;
  return Object.freeze({
    ...snapshot,
    enabled: technicalConfig.enabled === true,
    autoPublishEnabled: technicalConfig.autoPublishEnabled === true,
    autoPublishEffective: technicalConfig.autoPublishEnabled === true
      && snapshot.autoPublishEffective === true
  });
}

export function createProductionRuntime({
  config,
  env = process.env,
  database,
  modules,
  logger = console
}) {
  required(config, 'config');
  required(database, 'database');
  required(modules, 'modules');
  const repositories = bindRepositories(database, modules);
  const pricingRepository = modules.createPricingRepository(database);
  const pricingService = modules.createPricingService(pricingRepository, { cache: false });
  modules.cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });
  const contentPublicationService = typeof modules.createContentPublicationService === 'function'
    ? modules.createContentPublicationService({
      db: database,
      validateArticle: modules.validateArticle
    })
    : null;
  const blogNewsletterService = typeof modules.createBlogNewsletterService === 'function'
    ? modules.createBlogNewsletterService({ database })
    : null;
  const scheduledPublicationService = typeof modules.createScheduledPublicationService === 'function'
    ? modules.createScheduledPublicationService({
      db: database,
      ...(contentPublicationService ? { publicationService: contentPublicationService } : {}),
      ...(blogNewsletterService ? {
        queuePublishedArticleNewsletter: (input, client) => (
          blogNewsletterService.queuePublishedArticleNewsletter(input, client)
        )
      } : {})
    })
    : null;
  const searchConsoleModulesAvailable = [
    modules.createSearchConsoleClient,
    modules.createContentSearchMetricsRepository,
    modules.createContentSearchOpportunityRepository,
    modules.createSearchConsoleSyncService,
    modules.buildContentOpportunities
  ].every((dependency) => typeof dependency === 'function');
  const searchConsoleClient = searchConsoleModulesAvailable
    ? modules.createSearchConsoleClient({
      siteUrl: config.searchConsoleSiteUrl,
      credentialsPath: config.googleCredentialsPath
    })
    : null;
  const searchMetricsRepository = searchConsoleModulesAvailable
    ? modules.createContentSearchMetricsRepository(database)
    : null;
  const searchOpportunityRepository = searchConsoleModulesAvailable
    ? modules.createContentSearchOpportunityRepository(database)
    : null;
  const searchConsoleSyncService = searchConsoleModulesAvailable
    ? modules.createSearchConsoleSyncService({
      client: searchConsoleClient,
      repository: searchMetricsRepository,
      allowedHosts: ['komplettwebdesign.de', 'www.komplettwebdesign.de']
    })
    : null;

  function createPipelineDependencies(snapshot = null, initialInventory = null) {
    const jobConfig = jobConfigFromSnapshot(config, snapshot);
    const openai = new modules.OpenAI({ apiKey: env.OPENAI_API_KEY });
    const jobCostService = {
      ...repositories.costService,
      getMonthlyContentCost: (input = {}) => repositories.costService.getMonthlyContentCost({
        ...input,
        timezone: jobConfig.timezone
      }),
      reserveMonthlyBudget: (input) => repositories.costService.reserveMonthlyBudget({
        ...input,
        timezone: jobConfig.timezone
      })
    };
    return {
      config: jobConfig,
      inventoryService: {
        buildSiteInventory: () => initialInventory
          || modules.buildSiteInventory(inventoryLoaders(database, pricingService))
      },
      openaiService: modules.createOpenAIContentService({ apiKey: env.OPENAI_API_KEY, config: jobConfig }),
      topicScoringService: { selectBestTopic: modules.selectBestTopic },
      topicRepository: repositories.topicRepository,
      runRepository: repositories.runRepository,
      costService: jobCostService,
      validateArticle: modules.validateArticle,
      ...(scheduledPublicationService ? { publicationService: scheduledPublicationService } : {}),
      imageService: modules.createContentImageService({
        config: jobConfig,
        openai,
        cloudinary: modules.cloudinary
      }),
      draftRepository: {
        createAIDraft: (input) => modules.BlogPostModel.createAIDraft(input, database),
        findAIDraftByGenerationRunId: (runId) => modules.BlogPostModel.findAIDraftByGenerationRunId(runId, database)
      },
      recordProviderResult: (input) => modules.providerStateRepository.recordProviderResult(input, database)
    };
  }
  function createRegenerationDependencies(snapshot = null) {
    const dependencies = createPipelineDependencies(snapshot);
    return {
      ...dependencies,
      draftRepository: modules.createDraftRegenerationRepository(database)
    };
  }
  function createOptimizationDependencies(snapshot = null) {
    const dependencies = createPipelineDependencies(snapshot);
    return {
      ...dependencies,
      optimizationRepository: modules.createContentReviewIssueOptimizationRepository(database)
    };
  }
  function createAuditDependencies() {
    return {
      auditRepository: modules.createContentAuditRepository(database)
    };
  }
  const snapshotRuntimeAvailable = typeof modules.settingsRepository?.getContentAgentSettings === 'function'
    && typeof modules.runtimeConfigService?.resolveContentAgentRuntimeConfig === 'function'
    && typeof modules.runtimeConfigService?.createContentAgentJobSnapshot === 'function';
  const pipelineDependencies = snapshotRuntimeAvailable ? null : createPipelineDependencies();
  const handleJob = createProductionJobHandler({
    timezone: config.timezone,
    technicalConfig: config,
    ...(snapshotRuntimeAvailable ? {
      getSettings: () => modules.settingsRepository.getContentAgentSettings(database),
      resolveRuntimeConfig: modules.runtimeConfigService.resolveContentAgentRuntimeConfig,
      createJobSnapshot: modules.runtimeConfigService.createContentAgentJobSnapshot,
      findRunByJobId: repositories.runRepository.findRunByJobId,
      enforceRuleSnapshot: true,
      loadInitialInventory: () => modules.buildSiteInventory(inventoryLoaders(database, pricingService)),
      createPipelineDependencies,
      createRegenerationDependencies,
      createOptimizationDependencies
    } : {}),
    createRun: repositories.runRepository.createRun,
    finishRun: repositories.runRepository.finishRun,
    runPipeline: modules.runDraftPipeline,
    runRegenerationJob: modules.runDraftRegenerationJob,
    runReviewIssueOptimizationJob: modules.runReviewIssueOptimizationJob,
    runAuditJob: modules.runExistingContentAuditJob,
    createAuditDependencies,
    sendAdminReviewNotification: (input) => modules.sendAdminReviewNotification(input, {
      database,
      sendReviewMail: modules.sendContentAgentReviewMail,
      canonicalBaseUrl: env.CANONICAL_BASE_URL || env.BASE_URL || null
    }),
    publishApprovedPost: scheduledPublicationService
      ? (input) => scheduledPublicationService.publishApprovedPost(input)
      : null,
    sendBlogNewsletter: blogNewsletterService
      ? (input) => blogNewsletterService.preparePublishedArticleNewsletter(input)
      : null,
    sendBlogNewsletterDelivery: blogNewsletterService
      ? (input) => blogNewsletterService.sendNewsletterDelivery(input)
      : null,
    syncSearchConsoleRange: searchConsoleSyncService
      ? (input) => searchConsoleSyncService.syncSearchConsoleRange(input)
      : null,
    listAggregatedSearchMetrics: searchMetricsRepository
      ? (input) => searchMetricsRepository.listAggregatedMetrics(input)
      : null,
    buildSearchOpportunities: searchConsoleModulesAvailable
      ? modules.buildContentOpportunities
      : null,
    upsertSearchOpportunities: searchOpportunityRepository
      ? (input) => searchOpportunityRepository.upsertOpenOpportunities(input)
      : null,
    recordProviderResult: (input) => modules.providerStateRepository.recordProviderResult(input, database),
    enqueueJob: repositories.jobRepository.enqueueJob,
    pipelineDependencies
  });
  const worker = createContentWorker({
    enabled: config.enabled,
    workerName: 'content-worker',
    workerId: `${hostname()}:${process.pid}`,
    version: env.CONTENT_AGENT_WORKER_VERSION || '1.0.0',
    pollMs: config.workerPollMs,
    heartbeatMs: 30_000,
    leaseMinutes: config.jobLeaseMinutes,
    logger,
    upsertHeartbeat: repositories.jobRepository.upsertWorkerHeartbeat,
    recoverExpiredJobs: repositories.jobRepository.recoverExpiredJobs,
    claimNextJob: repositories.jobRepository.claimNextJob,
    renewJobLease: repositories.jobRepository.renewJobLease,
    handleJob,
    completeJob: repositories.jobRepository.completeJob,
    failJob: repositories.jobRepository.failJob,
    rescheduleJobWithoutAttemptConsumption: repositories.jobRepository.rescheduleJobWithoutAttemptConsumption,
    retryOrFailJob: repositories.jobRepository.retryOrFailJob,
    markJobNeedsManualAttention: repositories.jobRepository.markJobNeedsManualAttention
  });

  return {
    worker,
    pipelineDependencies,
    jobRepository: repositories.jobRepository,
    getSettings: snapshotRuntimeAvailable
      ? () => modules.settingsRepository.getContentAgentSettings(database)
      : null,
    getScheduleRevisions: snapshotRuntimeAvailable
      && typeof modules.settingsRepository.getContentAgentScheduleRevisions === 'function'
      ? () => modules.settingsRepository.getContentAgentScheduleRevisions(database)
      : null
  };
}

export function createShutdownController({
  scheduler,
  searchConsoleScheduler,
  worker,
  pool: database,
  logger = console,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  keepaliveMs = 1_000,
  onFailure = () => { process.exitCode = 1; }
}) {
  let shutdownPromise = null;
  return function shutdown() {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      let keepalive = null;
      scheduler?.stop();
      searchConsoleScheduler?.stop();
      try {
        const result = await worker?.stop();
        if (result?.drained === false) {
          keepalive = setIntervalFn(() => {}, keepaliveMs);
          await worker.whenIdle();
        }
        await database.end();
      } finally {
        if (keepalive !== null) clearIntervalFn(keepalive);
      }
    })().catch(() => {
      logger.error?.('Content-Worker konnte nicht sauber beendet werden.');
      onFailure();
    });
    return shutdownPromise;
  };
}

export function installShutdownHandlers(shutdown, processTarget = process) {
  const onSigterm = () => { void shutdown('SIGTERM'); };
  const onSigint = () => { void shutdown('SIGINT'); };
  processTarget.on('SIGTERM', onSigterm);
  processTarget.on('SIGINT', onSigint);
  return () => {
    processTarget.off('SIGTERM', onSigterm);
    processTarget.off('SIGINT', onSigint);
  };
}

export async function loadProductionModules() {
  const [
    openaiModule,
    cloudinaryModule,
    blogPostModule,
    jobRepository,
    runRepository,
    settingsRepository,
    topicRepository,
    providerStateRepository,
    costService,
    validatorModule,
    imageModule,
    pipelineModule,
    openaiContentModule,
    inventoryModule,
    topicScoringModule,
    pricingRepositoryModule,
    pricingServiceModule,
    databaseModule,
    runtimeConfigService,
    schedulerService,
    regenerationService,
    reviewIssueOptimizationService,
    reviewIssueOptimizationRepositoryModule,
    publicationService,
    auditService,
    auditRepositoryModule,
    notificationServiceModule,
    mailServiceModule,
    scheduledPublicationModule,
    blogNewsletterModule,
    searchConsoleClientModule,
    searchConsoleSyncModule,
    searchMetricsRepositoryModule,
    searchOpportunityRepositoryModule,
    searchOpportunityModule,
    searchConsoleSchedulerModule
  ] = await Promise.all([
    import('openai'),
    import('cloudinary'),
    import('../models/BlogPostModel.js'),
    import('../repositories/contentJobRepository.js'),
    import('../repositories/contentRunRepository.js'),
    import('../repositories/contentAgentSettingsRepository.js'),
    import('../repositories/contentTopicRepository.js'),
    import('../repositories/contentProviderStateRepository.js'),
    import('../services/contentAgent/contentCostService.js'),
    import('../services/contentAgent/articleValidator.js'),
    import('../services/contentAgent/contentImageService.js'),
    import('../services/contentAgent/draftPipeline.js'),
    import('../services/contentAgent/openaiContentService.js'),
    import('../services/contentAgent/siteInventoryService.js'),
    import('../services/contentAgent/topicScoringService.js'),
    import('../repositories/pricingRepository.js'),
    import('../services/pricingService.js'),
    import('../util/db.js'),
    import('../services/contentAgent/runtimeConfigService.js'),
    import('../services/contentAgent/contentSchedulerService.js'),
    import('../services/contentAgent/draftRegenerationService.js'),
    import('../services/contentAgent/reviewIssueOptimizationService.js'),
    import('../repositories/contentReviewIssueOptimizationRepository.js'),
    import('../services/contentAgent/contentPublicationService.js'),
    import('../services/contentAgent/legacyAuditService.js'),
    import('../repositories/contentAuditRepository.js'),
    import('../services/contentAgent/contentNotificationService.js'),
    import('../services/mailService.js'),
    import('../services/contentAgent/scheduledPublicationService.js'),
    import('../services/contentAgent/blogNewsletterService.js'),
    import('../services/contentAgent/searchConsoleClient.js'),
    import('../services/contentAgent/searchConsoleSyncService.js'),
    import('../repositories/contentSearchMetricsRepository.js'),
    import('../repositories/contentSearchOpportunityRepository.js'),
    import('../services/contentAgent/searchOpportunityService.js'),
    import('../services/contentAgent/searchConsoleSchedulerService.js')
  ]);
  return {
    OpenAI: openaiModule.default,
    cloudinary: cloudinaryModule.v2,
    BlogPostModel: blogPostModule.default,
    jobRepository,
    runRepository,
    settingsRepository,
    topicRepository,
    providerStateRepository,
    costService,
    validateArticle: validatorModule.validateArticle,
    createContentImageService: imageModule.createContentImageService,
    runDraftPipeline: pipelineModule.runDraftPipeline,
    createOpenAIContentService: openaiContentModule.createOpenAIContentService,
    buildSiteInventory: inventoryModule.buildSiteInventory,
    selectBestTopic: topicScoringModule.selectBestTopic,
    createPricingRepository: pricingRepositoryModule.createPricingRepository,
    createPricingService: pricingServiceModule.createPricingService,
    database: databaseModule.default,
    runtimeConfigService,
    schedulerService,
    runDraftRegenerationJob: regenerationService.runDraftRegenerationJob,
    createDraftRegenerationRepository: regenerationService.createDraftRegenerationRepository,
    runReviewIssueOptimizationJob: reviewIssueOptimizationService.runReviewIssueOptimizationJob,
    createContentReviewIssueOptimizationRepository:
      reviewIssueOptimizationRepositoryModule.createContentReviewIssueOptimizationRepository,
    createContentPublicationService: publicationService.createContentPublicationService,
    createScheduledPublicationService: scheduledPublicationModule.createScheduledPublicationService,
    createBlogNewsletterService: blogNewsletterModule.createBlogNewsletterService,
    runExistingContentAuditJob: auditService.runExistingContentAuditJob,
    createContentAuditRepository: auditRepositoryModule.createContentAuditRepository,
    sendAdminReviewNotification: notificationServiceModule.sendAdminReviewNotification,
    sendContentAgentReviewMail: mailServiceModule.sendContentAgentReviewMail,
    createSearchConsoleClient: searchConsoleClientModule.createSearchConsoleClient,
    createSearchConsoleSyncService: searchConsoleSyncModule.createSearchConsoleSyncService,
    createContentSearchMetricsRepository: searchMetricsRepositoryModule.createContentSearchMetricsRepository,
    createContentSearchOpportunityRepository:
      searchOpportunityRepositoryModule.createContentSearchOpportunityRepository,
    buildContentOpportunities: searchOpportunityModule.buildContentOpportunities,
    searchConsoleSchedulerService: searchConsoleSchedulerModule
  };
}

export async function startContentWorker({
  env = process.env,
  database,
  logger = console,
  processTarget = process,
  modules
} = {}) {
  const config = getContentAgentConfig(env);
  if (!config.enabled) {
    logger.log?.('Content-Worker ist deaktiviert.');
    return { enabled: false, config };
  }

  const loaded = modules || await loadProductionModules();
  const activeDatabase = database || loaded.database;
  try {
    const { worker, jobRepository, getSettings, getScheduleRevisions } = createProductionRuntime({
      config,
      env,
      database: activeDatabase,
      modules: loaded,
      logger
    });
    required(loaded.schedulerService?.createDynamicContentScheduler, 'schedulerService.createDynamicContentScheduler');
    required(loaded.schedulerService?.runContentSchedulerTick, 'schedulerService.runContentSchedulerTick');
    required(
      loaded.searchConsoleSchedulerService?.createSearchConsoleScheduler,
      'searchConsoleSchedulerService.createSearchConsoleScheduler'
    );
    required(
      loaded.searchConsoleSchedulerService?.runSearchConsoleSchedulerTick,
      'searchConsoleSchedulerService.runSearchConsoleSchedulerTick'
    );
    required(getSettings, 'getContentAgentSettings');
    const scheduler = loaded.schedulerService.createDynamicContentScheduler({
      tick: () => loaded.schedulerService.runContentSchedulerTick({
        getSettings,
        getScheduleRevisions,
        enqueueJob: jobRepository.enqueueJob,
        updateSchedulerState: jobRepository.updateContentSchedulerState
      })
    });
    const searchConsoleScheduler = loaded.searchConsoleSchedulerService.createSearchConsoleScheduler({
      tick: () => loaded.searchConsoleSchedulerService.runSearchConsoleSchedulerTick({
        configured: config.searchConsoleConfigured,
        schedule: config.searchConsoleSchedule,
        timezone: config.timezone,
        getSettings,
        enqueueJob: jobRepository.enqueueJob
      })
    });
    const shutdown = createShutdownController({
      scheduler,
      searchConsoleScheduler,
      worker,
      pool: activeDatabase,
      logger
    });
    installShutdownHandlers(shutdown, processTarget);
    await worker.start();
    scheduler.start();
    searchConsoleScheduler.start();
    return {
      enabled: true,
      config,
      worker,
      scheduler,
      searchConsoleScheduler,
      shutdown
    };
  } catch (error) {
    await activeDatabase.end().catch(() => {});
    throw error;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : null;

if (currentFile === entryFile) {
  startContentWorker().catch(() => {
    console.error('Content-Worker konnte nicht gestartet werden.');
    process.exitCode = 1;
  });
}
