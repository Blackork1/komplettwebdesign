import { hostname } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getContentAgentConfig } from '../services/contentAgent/config.js';
import { createContentWorker } from '../services/contentAgent/workerService.js';

const SUPPORTED_JOB_TYPES = new Set(['generate_weekly_draft', 'generate_manual_draft']);

function required(value, name) {
  if (!value) throw new TypeError(`Die Produktionsabhängigkeit ${name} wird benötigt.`);
  return value;
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
  createRun,
  runPipeline,
  pipelineDependencies
}) {
  required(createRun, 'createRun');
  required(runPipeline, 'runPipeline');
  return async function handleJob(claim) {
    if (!SUPPORTED_JOB_TYPES.has(claim?.job_type)) {
      throw new Error('Nicht unterstützter Content-Jobtyp.');
    }

    const run = await createRun({ jobId: claim.id });
    if (!run?.id) throw new Error('Content-Agent-Lauf konnte nicht angelegt werden.');
    const result = await runPipeline({
      ...(claim.payload_json || {}),
      runId: run.id,
      currentDate: berlinDateKey(now(), timezone)
    }, pipelineDependencies);
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
    completeJob: (claim) => modules.jobRepository.completeJob(claim, database),
    failJob: (claim, error) => modules.jobRepository.failJob(claim, error, database),
    recoverExpiredJobs: (minutes) => modules.jobRepository.recoverExpiredJobs(minutes, database),
    upsertWorkerHeartbeat: (input) => modules.jobRepository.upsertWorkerHeartbeat(input, database)
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
    getPersistedStageResult: (input) => modules.costService.getPersistedStageResult({ ...input, db: database })
  };
  return { jobRepository, runRepository, topicRepository, costService };
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
  const openai = new modules.OpenAI({ apiKey: env.OPENAI_API_KEY });
  modules.cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });

  const pipelineDependencies = {
    config,
    inventoryService: {
      buildSiteInventory: () => modules.buildSiteInventory(inventoryLoaders(database, pricingService))
    },
    openaiService: modules.createOpenAIContentService({ apiKey: env.OPENAI_API_KEY, config }),
    topicScoringService: { selectBestTopic: modules.selectBestTopic },
    topicRepository: repositories.topicRepository,
    runRepository: repositories.runRepository,
    costService: repositories.costService,
    validateArticle: modules.validateArticle,
    imageService: modules.createContentImageService({ config, openai, cloudinary: modules.cloudinary }),
    draftRepository: {
      createAIDraft: (input) => modules.BlogPostModel.createAIDraft(input, database)
    }
  };
  const handleJob = createProductionJobHandler({
    timezone: config.timezone,
    createRun: repositories.runRepository.createRun,
    runPipeline: modules.runDraftPipeline,
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
    handleJob,
    completeJob: repositories.jobRepository.completeJob,
    failJob: repositories.jobRepository.failJob
  });

  return { worker, pipelineDependencies, jobRepository: repositories.jobRepository };
}

export function createShutdownController({ scheduler, worker, pool: database, logger = console }) {
  let shutdownPromise = null;
  return function shutdown() {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      scheduler?.stop();
      const result = await worker?.stop();
      if (result?.drained === false) {
        void worker.whenIdle()
          .then(() => database.end())
          .catch(() => logger.error?.('Content-Worker konnte den Pool nicht sauber schließen.'));
        return;
      }
      await database.end();
    })().catch(() => {
      logger.error?.('Content-Worker konnte nicht sauber beendet werden.');
      process.exitCode = 1;
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
    cronModule,
    blogPostModule,
    jobRepository,
    runRepository,
    topicRepository,
    costService,
    validatorModule,
    imageModule,
    pipelineModule,
    openaiContentModule,
    inventoryModule,
    topicScoringModule,
    pricingRepositoryModule,
    pricingServiceModule,
    databaseModule
  ] = await Promise.all([
    import('openai'),
    import('cloudinary'),
    import('node-cron'),
    import('../models/BlogPostModel.js'),
    import('../repositories/contentJobRepository.js'),
    import('../repositories/contentRunRepository.js'),
    import('../repositories/contentTopicRepository.js'),
    import('../services/contentAgent/contentCostService.js'),
    import('../services/contentAgent/articleValidator.js'),
    import('../services/contentAgent/contentImageService.js'),
    import('../services/contentAgent/draftPipeline.js'),
    import('../services/contentAgent/openaiContentService.js'),
    import('../services/contentAgent/siteInventoryService.js'),
    import('../services/contentAgent/topicScoringService.js'),
    import('../repositories/pricingRepository.js'),
    import('../services/pricingService.js'),
    import('../util/db.js')
  ]);
  return {
    OpenAI: openaiModule.default,
    cloudinary: cloudinaryModule.v2,
    cronClient: cronModule.default,
    BlogPostModel: blogPostModule.default,
    jobRepository,
    runRepository,
    topicRepository,
    costService,
    validateArticle: validatorModule.validateArticle,
    createContentImageService: imageModule.createContentImageService,
    runDraftPipeline: pipelineModule.runDraftPipeline,
    createOpenAIContentService: openaiContentModule.createOpenAIContentService,
    buildSiteInventory: inventoryModule.buildSiteInventory,
    selectBestTopic: topicScoringModule.selectBestTopic,
    createPricingRepository: pricingRepositoryModule.createPricingRepository,
    createPricingService: pricingServiceModule.createPricingService,
    database: databaseModule.default
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
  const activeCron = cronClient || loaded.cronClient;
  try {
    const { worker, jobRepository } = createProductionRuntime({
      config,
      env,
      database: activeDatabase,
      modules: loaded,
      logger
    });
    const scheduler = createWeeklyScheduler({
      enabled: config.enabled,
      schedule: config.schedule,
      timezone: config.timezone,
      maxAttempts: config.maxAttempts,
      cronClient: activeCron,
      enqueueJob: jobRepository.enqueueJob,
      logger
    });
    const shutdown = createShutdownController({ scheduler, worker, pool: activeDatabase, logger });
    installShutdownHandlers(shutdown, processTarget);
    await worker.start();
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
