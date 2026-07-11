import { hostname } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getContentAgentConfig } from '../services/contentAgent/config.js';
import { createContentWorker } from '../services/contentAgent/workerService.js';

const GENERATION_JOB_TYPES = new Set(['generate_weekly_draft', 'generate_manual_draft']);
const REGENERATION_JOB_TYPES = new Set([
  'regenerate_article',
  'regenerate_metadata',
  'regenerate_faq',
  'regenerate_image'
]);
const SUPPORTED_JOB_TYPES = new Set([...GENERATION_JOB_TYPES, ...REGENERATION_JOB_TYPES]);

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

export function createWeeklyScheduler({
  enabled,
  schedule = '0 9 * * 1',
  timezone = 'Europe/Berlin',
  maxAttempts = 3,
  now = () => new Date(),
  cronClient,
  enqueueJob,
  logger = console
} = {}) {
  if (enabled !== true) return null;
  required(cronClient?.schedule, 'cronClient.schedule');
  required(enqueueJob, 'enqueueJob');

  return cronClient.schedule(schedule, async () => {
    try {
      const date = berlinDateKey(now(), timezone);
      await enqueueJob({
        jobType: 'generate_weekly_draft',
        idempotencyKey: `weekly-draft:${date}`,
        payload: { source: 'weekly-schedule' },
        maxAttempts
      });
    } catch {
      logger.error?.('Content-Worker konnte den Wochen-Draft nicht einplanen.');
    }
  }, { timezone });
}

export function createProductionJobHandler({
  timezone = 'Europe/Berlin',
  now = () => new Date(),
  technicalConfig,
  getSettings,
  resolveRuntimeConfig,
  createJobSnapshot,
  createRun,
  finishRun,
  runPipeline,
  pipelineDependencies,
  createPipelineDependencies,
  runRegenerationJob,
  createRegenerationDependencies
}) {
  required(createRun, 'createRun');
  required(runPipeline, 'runPipeline');
  return async function handleJob(claim, { leaseGuard } = {}) {
    if (!SUPPORTED_JOB_TYPES.has(claim?.job_type)) {
      throw permanentJobError('Nicht unterstützter Content-Jobtyp.', 'CONTENT_JOB_TYPE_UNSUPPORTED');
    }

    const snapshotEnabled = typeof getSettings === 'function'
      && typeof resolveRuntimeConfig === 'function'
      && typeof createJobSnapshot === 'function';
    let runtimeSnapshot;
    if (snapshotEnabled) {
      const settings = await getSettings();
      const runtimeConfig = resolveRuntimeConfig({ technicalConfig, settings });
      runtimeSnapshot = createJobSnapshot({ runtimeConfig, claim, now: now() });
    }
    const run = await createRun({
      jobId: claim.id,
      ...(snapshotEnabled ? { runtimeSnapshot } : {})
    });
    if (!run?.id) throw new Error('Content-Agent-Lauf konnte nicht angelegt werden.');
    const persistedSnapshot = snapshotEnabled ? run.runtime_snapshot_json : null;
    const jobTimezone = persistedSnapshot?.timezone || timezone;
    let result;
    if (REGENERATION_JOB_TYPES.has(claim.job_type)) {
      required(runRegenerationJob, 'runRegenerationJob');
      required(createRegenerationDependencies, 'createRegenerationDependencies');
      const regenerationDependencies = await createRegenerationDependencies(persistedSnapshot);
      try {
        result = await runRegenerationJob({
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
          await finishRun(run.id, {
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
        ? await createPipelineDependencies(persistedSnapshot)
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
    retryOrFailJob: (claim, error, options) => modules.jobRepository.retryOrFailJob(claim, error, options, database),
    markJobNeedsManualAttention: (claim, reason) => modules.jobRepository.markJobNeedsManualAttention(claim, reason, database),
    recoverExpiredJobs: (minutes) => modules.jobRepository.recoverExpiredJobs(minutes, database),
    upsertWorkerHeartbeat: (input) => modules.jobRepository.upsertWorkerHeartbeat(input, database),
    updateContentSchedulerState: (input) => modules.jobRepository.updateContentSchedulerState(input, database)
  };
  const runRepository = {
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

function jobConfigFromSnapshot(technicalConfig, snapshot) {
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

  function createPipelineDependencies(snapshot = null) {
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
    const publicationService = typeof modules.createContentPublicationService === 'function'
      ? modules.createContentPublicationService({
        db: database,
        validateArticle: modules.validateArticle
      })
      : null;
    return {
      config: jobConfig,
      inventoryService: {
        buildSiteInventory: () => modules.buildSiteInventory(inventoryLoaders(database, pricingService))
      },
      openaiService: modules.createOpenAIContentService({ apiKey: env.OPENAI_API_KEY, config: jobConfig }),
      topicScoringService: { selectBestTopic: modules.selectBestTopic },
      topicRepository: repositories.topicRepository,
      runRepository: repositories.runRepository,
      costService: jobCostService,
      validateArticle: modules.validateArticle,
      ...(publicationService ? { publicationService } : {}),
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
      createPipelineDependencies,
      createRegenerationDependencies
    } : {}),
    createRun: repositories.runRepository.createRun,
    finishRun: repositories.runRepository.finishRun,
    runPipeline: modules.runDraftPipeline,
    runRegenerationJob: modules.runDraftRegenerationJob,
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
    retryOrFailJob: repositories.jobRepository.retryOrFailJob,
    markJobNeedsManualAttention: repositories.jobRepository.markJobNeedsManualAttention
  });

  return {
    worker,
    pipelineDependencies,
    jobRepository: repositories.jobRepository,
    getSettings: snapshotRuntimeAvailable
      ? () => modules.settingsRepository.getContentAgentSettings(database)
      : null
  };
}

export function createShutdownController({
  scheduler,
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
    publicationService
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
    import('../services/contentAgent/contentPublicationService.js')
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
    createContentPublicationService: publicationService.createContentPublicationService
  };
}

export async function startContentWorker({
  env = process.env,
  database,
  logger = console,
  cronClient,
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
    const { worker, jobRepository, getSettings } = createProductionRuntime({
      config,
      env,
      database: activeDatabase,
      modules: loaded,
      logger
    });
    required(loaded.schedulerService?.createDynamicContentScheduler, 'schedulerService.createDynamicContentScheduler');
    required(loaded.schedulerService?.runContentSchedulerTick, 'schedulerService.runContentSchedulerTick');
    required(getSettings, 'getContentAgentSettings');
    const scheduler = loaded.schedulerService.createDynamicContentScheduler({
      tick: () => loaded.schedulerService.runContentSchedulerTick({
        getSettings,
        enqueueJob: jobRepository.enqueueJob,
        updateSchedulerState: jobRepository.updateContentSchedulerState
      })
    });
    const shutdown = createShutdownController({ scheduler, worker, pool: activeDatabase, logger });
    installShutdownHandlers(shutdown, processTarget);
    await worker.start();
    scheduler.start();
    return { enabled: true, config, worker, scheduler, shutdown };
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
