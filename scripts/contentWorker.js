import { hostname } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';
import cron from 'node-cron';

import BlogPostModel from '../models/BlogPostModel.js';
import * as jobRepository from '../repositories/contentJobRepository.js';
import * as runRepository from '../repositories/contentRunRepository.js';
import * as topicRepository from '../repositories/contentTopicRepository.js';
import * as costService from '../services/contentAgent/contentCostService.js';
import { validateArticle } from '../services/contentAgent/articleValidator.js';
import { getContentAgentConfig } from '../services/contentAgent/config.js';
import { createContentImageService } from '../services/contentAgent/contentImageService.js';
import { runDraftPipeline } from '../services/contentAgent/draftPipeline.js';
import { createOpenAIContentService } from '../services/contentAgent/openaiContentService.js';
import { buildSiteInventory } from '../services/contentAgent/siteInventoryService.js';
import { selectBestTopic } from '../services/contentAgent/topicScoringService.js';
import { createContentWorker } from '../services/contentAgent/workerService.js';
import pricingService from '../services/pricingService.js';
import pool from '../util/db.js';

const SUPPORTED_JOB_TYPES = new Set(['generate_weekly_draft', 'generate_manual_draft']);

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
  cronClient = cron,
  enqueueJob = jobRepository.enqueueJob,
  logger = console
} = {}) {
  if (enabled !== true) return null;

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
  createRun = runRepository.createRun,
  finishRun = runRepository.finishRun,
  runPipeline = runDraftPipeline,
  pipelineDependencies
}) {
  return async function handleJob(claim) {
    if (!SUPPORTED_JOB_TYPES.has(claim?.job_type)) {
      throw new Error('Nicht unterstützter Content-Jobtyp.');
    }

    const run = await createRun({ jobId: claim.id });
    if (!run?.id) throw new Error('Content-Agent-Lauf konnte nicht angelegt werden.');

    try {
      const result = await runPipeline({
        ...(claim.payload_json || {}),
        runId: run.id,
        currentDate: berlinDateKey(now(), timezone)
      }, pipelineDependencies);
      if (!['completed', 'needs_manual_attention'].includes(result?.status)) {
        throw new Error('Content-Agent-Pipeline lieferte keinen terminalen Status.');
      }
      return result;
    } catch (error) {
      try {
        await finishRun(run.id, {
          status: 'failed',
          errorReport: { code: 'pipeline_failed', message: error.message }
        });
      } catch {
        // Der Pipelinefehler bleibt maßgeblich; Repository und Worker bereinigen ihn separat.
      }
      throw error;
    }
  };
}

export function createProductionRuntime({
  config,
  env = process.env,
  database = pool,
  logger = console
}) {
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });

  const pipelineDependencies = {
    config,
    inventoryService: {
      buildSiteInventory: () => buildSiteInventory({ pricingService })
    },
    openaiService: createOpenAIContentService({
      apiKey: env.OPENAI_API_KEY,
      config
    }),
    topicScoringService: { selectBestTopic },
    topicRepository,
    runRepository,
    costService,
    validateArticle,
    imageService: createContentImageService({ config, openai, cloudinary }),
    draftRepository: {
      createAIDraft: (input) => BlogPostModel.createAIDraft(input)
    }
  };
  const workerId = `${hostname()}:${process.pid}`;
  const handleJob = createProductionJobHandler({
    timezone: config.timezone,
    pipelineDependencies
  });
  const worker = createContentWorker({
    enabled: config.enabled,
    workerName: 'content-worker',
    workerId,
    version: env.CONTENT_AGENT_WORKER_VERSION || '1.0.0',
    pollMs: config.workerPollMs,
    leaseMinutes: config.jobLeaseMinutes,
    logger,
    upsertHeartbeat: (input) => jobRepository.upsertWorkerHeartbeat(input, database),
    recoverExpiredJobs: (minutes) => jobRepository.recoverExpiredJobs(minutes, database),
    claimNextJob: (id) => jobRepository.claimNextJob(id, database),
    handleJob,
    completeJob: (claim) => jobRepository.completeJob(claim, database),
    failJob: (claim, error) => jobRepository.failJob(claim, error, database)
  });

  return { worker, pipelineDependencies };
}

export function createShutdownController({ scheduler, worker, pool: database, logger = console }) {
  let shutdownPromise = null;
  return function shutdown() {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      scheduler?.stop();
      await worker?.stop();
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

export async function startContentWorker({
  env = process.env,
  database = pool,
  logger = console,
  cronClient = cron,
  processTarget = process
} = {}) {
  const config = getContentAgentConfig(env);
  if (!config.enabled) {
    logger.log?.('Content-Worker ist deaktiviert.');
    return { enabled: false, config };
  }

  const { worker } = createProductionRuntime({ config, env, database, logger });
  const scheduler = createWeeklyScheduler({
    enabled: config.enabled,
    schedule: config.schedule,
    timezone: config.timezone,
    maxAttempts: config.maxAttempts,
    cronClient,
    enqueueJob: (input) => jobRepository.enqueueJob(input, database),
    logger
  });
  const shutdown = createShutdownController({ scheduler, worker, pool: database, logger });
  installShutdownHandlers(shutdown, processTarget);
  await worker.start();
  return { enabled: true, config, worker, scheduler, shutdown };
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : null;

if (currentFile === entryFile) {
  startContentWorker()
    .then(async ({ enabled }) => {
      if (!enabled) await pool.end();
    })
    .catch(async () => {
      console.error('Content-Worker konnte nicht gestartet werden.');
      await pool.end().catch(() => {});
      process.exitCode = 1;
    });
}
