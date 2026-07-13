function integer(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function boolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

function decimal(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function configured(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getContentAgentTechnicalConfig(env = process.env) {
  return Object.freeze({
    enabled: boolean(env.CONTENT_AGENT_ENABLED, false),
    publishMode: env.CONTENT_AGENT_PUBLISH_MODE === 'auto' ? 'auto' : 'draft',
    schedule: env.CONTENT_AGENT_SCHEDULE || '0 9 * * 1',
    timezone: env.CONTENT_AGENT_TIMEZONE || 'Europe/Berlin',
    maxTopicCandidates: integer(env.CONTENT_AGENT_MAX_TOPIC_CANDIDATES, 8, 1, 20),
    maxRevisions: integer(env.CONTENT_AGENT_MAX_REVISIONS, 2, 0, 4),
    maxAttempts: integer(env.CONTENT_AGENT_MAX_ATTEMPTS, 3, 1, 5),
    autoPublishEnabled: boolean(env.CONTENT_AGENT_AUTOPUBLISH_ENABLED, false),
    contentModel: env.OPENAI_CONTENT_MODEL || 'gpt-5.4',
    reviewModel: env.OPENAI_REVIEW_MODEL || 'gpt-5.4-mini',
    imageModel: env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
    monthlyCostLimitEur: decimal(env.CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR, 25),
    contentStageReservationEur: decimal(env.CONTENT_AGENT_CONTENT_STAGE_RESERVATION_EUR, 0.50),
    reviewStageReservationEur: decimal(env.CONTENT_AGENT_REVIEW_STAGE_RESERVATION_EUR, 0.25),
    contentInputCostPerMtok: decimal(env.OPENAI_CONTENT_INPUT_COST_PER_MTOK, 2.50),
    contentOutputCostPerMtok: decimal(env.OPENAI_CONTENT_OUTPUT_COST_PER_MTOK, 15),
    reviewInputCostPerMtok: decimal(env.OPENAI_REVIEW_INPUT_COST_PER_MTOK, 0.75),
    reviewOutputCostPerMtok: decimal(env.OPENAI_REVIEW_OUTPUT_COST_PER_MTOK, 4.50),
    imageCostEur: decimal(env.OPENAI_IMAGE_COST_EUR, 0.041),
    workerPollMs: integer(env.CONTENT_AGENT_WORKER_POLL_MS, 5000, 1000, 60000),
    jobLeaseMinutes: integer(env.CONTENT_AGENT_JOB_LEASE_MINUTES, 30, 5, 180),
    searchConsoleSiteUrl: env.SEARCH_CONSOLE_SITE_URL || '',
    googleCredentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS || '',
    searchConsoleSchedule: env.CONTENT_AGENT_GSC_SCHEDULE || '0 6 * * 0',
    searchConsoleConfigured: configured(env.SEARCH_CONSOLE_SITE_URL)
      && configured(env.GOOGLE_APPLICATION_CREDENTIALS),
    openaiConfigured: configured(env.OPENAI_API_KEY),
    cloudinaryConfigured: configured(env.CLOUDINARY_CLOUD_NAME)
      && configured(env.CLOUDINARY_API_KEY)
      && configured(env.CLOUDINARY_API_SECRET)
  });
}

export function getContentAgentConfig(env = process.env) {
  return getContentAgentTechnicalConfig(env);
}

const PRESENTED_TECHNICAL_KEYS = Object.freeze([
  'enabled',
  'autoPublishEnabled',
  'maxTopicCandidates',
  'maxRevisions',
  'maxAttempts',
  'contentModel',
  'reviewModel',
  'imageModel',
  'monthlyCostLimitEur',
  'contentStageReservationEur',
  'reviewStageReservationEur',
  'contentInputCostPerMtok',
  'contentOutputCostPerMtok',
  'reviewInputCostPerMtok',
  'reviewOutputCostPerMtok',
  'imageCostEur',
  'workerPollMs',
  'jobLeaseMinutes',
  'searchConsoleConfigured',
  'openaiConfigured',
  'cloudinaryConfigured'
]);

export function buildTechnicalConfigPresentation(input = {}) {
  const technicalConfig = input.technicalConfig || input;
  const presentation = Object.fromEntries(PRESENTED_TECHNICAL_KEYS.map((key) => [
    key,
    Object.freeze({
      value: technicalConfig[key],
      editable: false,
      source: '.env',
      restartRequired: true
    })
  ]));

  return Object.freeze(presentation);
}
