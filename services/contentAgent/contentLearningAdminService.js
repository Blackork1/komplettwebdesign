import {
  sanitizeLearningText,
  validateLearningRuleText
} from './contentLearningTaxonomy.js';
import { evaluateLearningRuleEffectiveness } from './contentLearningEffectivenessService.js';

const TARGET_STAGE_ORDER = Object.freeze(['seo_brief', 'writer', 'reviewer']);
const TARGET_STAGES = new Set(TARGET_STAGE_ORDER);
const STATUS_TRANSITIONS = Object.freeze({
  active: new Set(['paused', 'disabled']),
  paused: new Set(['active', 'disabled']),
  disabled: new Set()
});

function validationError(message, code = 'CONTENT_LEARNING_VALIDATION_FAILED') {
  return Object.assign(new TypeError(message), { code });
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw validationError(`${label} muss eine positive ganze Zahl sein.`);
  }
  return normalized;
}

function normalizeAdmin(value) {
  const id = positiveInteger(value?.id, 'Die Admin-ID');
  const username = sanitizeLearningText(value?.username, 180);
  if (!username) throw validationError('Der Adminname fehlt.');
  return { id, username };
}

function requireConfirmation(value) {
  if (value !== true) {
    throw validationError('Die ausdrückliche Bestätigung fehlt.', 'CONTENT_CONFIRMATION_REQUIRED');
  }
}

function normalizeTargetStages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > TARGET_STAGE_ORDER.length) {
    throw validationError('Mindestens eine gültige Zielstufe ist erforderlich.');
  }
  const unique = new Set(value.map((stage) => sanitizeLearningText(stage, 30)));
  if (unique.size !== value.length || [...unique].some((stage) => !TARGET_STAGES.has(stage))) {
    throw validationError('Die Lernregel enthält ungültige oder doppelte Zielstufen.');
  }
  return TARGET_STAGE_ORDER.filter((stage) => unique.has(stage));
}

function baseAction(input, idField) {
  requireConfirmation(input?.confirmed);
  return {
    [idField]: positiveInteger(input?.[idField], idField === 'ruleId' ? 'Die Regel-ID' : 'Die Vorschlags-ID'),
    expectedVersion: positiveInteger(input?.expectedVersion, 'Die erwartete Version'),
    admin: normalizeAdmin(input?.admin)
  };
}

function effectivenessFor(row = {}) {
  const articleCount = Math.max(0, Number(row.article_count) || 0);
  const recurrenceCount = Math.max(0, Number(row.recurrence_count) || 0);
  const baselineArticleCount = Math.max(0, Number(row.baseline_article_count) || 0);
  const baselineRecurrenceCount = Math.max(0, Number(row.baseline_recurrence_count) || 0);
  const currentRate = articleCount > 0 ? recurrenceCount / articleCount : 0;
  const baselineRate = baselineArticleCount > 0
    ? baselineRecurrenceCount / baselineArticleCount
    : null;
  return {
    status: evaluateLearningRuleEffectiveness({
      articleCount,
      recurrenceCount,
      baselineRate,
      currentRate
    }),
    articleCount,
    recurrenceCount,
    baselineArticleCount,
    baselineRecurrenceCount,
    baselineRate,
    currentRate,
    averageQualityScore: row.average_quality_score == null
      ? null
      : Number(row.average_quality_score),
    gsc: {
      clicks: row.clicks == null ? null : Number(row.clicks),
      impressions: row.impressions == null ? null : Number(row.impressions),
      ctr: row.ctr == null ? null : Number(row.ctr),
      averagePosition: row.average_position == null ? null : Number(row.average_position)
    }
  };
}

export function createContentLearningAdminService({ repository } = {}) {
  if (!repository || typeof repository !== 'object') {
    throw validationError('Das Lernregel-Repository fehlt.');
  }
  return Object.freeze({
    async getDashboard() {
      if (typeof repository.getAdminDashboard !== 'function') {
        throw validationError('Das Lernregel-Dashboard ist nicht verfügbar.');
      }
      const dashboard = await repository.getAdminDashboard();
      const effectiveness = new Map((Array.isArray(dashboard?.effectiveness)
        ? dashboard.effectiveness
        : []).map((row) => [`${Number(row.rule_id)}:${Number(row.rule_version)}`, row]));
      return {
        ...dashboard,
        rules: (Array.isArray(dashboard?.rules) ? dashboard.rules : []).map((rule) => ({
          ...rule,
          effectiveness: effectivenessFor(
            effectiveness.get(`${Number(rule.id)}:${Number(rule.current_version)}`)
          )
        }))
      };
    },

    async activateProposal(input) {
      const normalized = {
        ...baseAction(input, 'proposalId'),
        ruleText: validateLearningRuleText(input?.ruleText),
        targetStages: normalizeTargetStages(input?.targetStages)
      };
      return repository.activateProposal(normalized);
    },

    async rejectProposal(input) {
      return repository.rejectProposal(baseAction(input, 'proposalId'));
    },

    async reviseRule(input) {
      const normalized = {
        ...baseAction(input, 'ruleId'),
        ruleText: validateLearningRuleText(input?.ruleText),
        targetStages: normalizeTargetStages(input?.targetStages)
      };
      return repository.reviseRule(normalized);
    },

    async changeRuleStatus(input) {
      const normalized = baseAction(input, 'ruleId');
      const currentStatus = sanitizeLearningText(input?.currentStatus, 20);
      const nextStatus = sanitizeLearningText(input?.nextStatus, 20);
      if (!STATUS_TRANSITIONS[currentStatus]?.has(nextStatus)) {
        throw validationError('Dieser Statusübergang ist für die Lernregel nicht erlaubt.');
      }
      return repository.changeRuleStatus({
        ...normalized,
        currentStatus,
        nextStatus
      });
    }
  });
}
