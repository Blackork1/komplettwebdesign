import {
  sanitizeLearningText,
  validateLearningRuleText
} from './contentLearningTaxonomy.js';

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

export function createContentLearningAdminService({ repository } = {}) {
  if (!repository || typeof repository !== 'object') {
    throw validationError('Das Lernregel-Repository fehlt.');
  }
  return Object.freeze({
    async getDashboard() {
      if (typeof repository.getAdminDashboard !== 'function') {
        throw validationError('Das Lernregel-Dashboard ist nicht verfügbar.');
      }
      return repository.getAdminDashboard();
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
