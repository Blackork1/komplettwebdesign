import { createHash } from 'node:crypto';

import {
  getLearningCategory,
  sanitizeLearningText,
  validateLearningRuleText
} from './contentLearningTaxonomy.js';

export const CONTENT_LEARNING_SNAPSHOT_VERSION = 'content-learning-rules-v1';
export const MAX_LEARNING_SNAPSHOT_RULES = 50;
export const MAX_LEARNING_SNAPSHOT_BYTES = 40 * 1024;

const STAGE_ORDER = Object.freeze(['seo_brief', 'writer', 'reviewer']);
const STAGES = new Set(STAGE_ORDER);

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw Object.assign(new TypeError(`${label} muss positiv sein.`), {
      code: 'CONTENT_LEARNING_SNAPSHOT_INVALID'
    });
  }
  return normalized;
}

function normalizeStages(value) {
  if (!Array.isArray(value) || value.length === 0 || value.some((stage) => !STAGES.has(stage))) {
    throw Object.assign(new TypeError('Die Zielstufen der Lernregel sind ungültig.'), {
      code: 'CONTENT_LEARNING_SNAPSHOT_INVALID'
    });
  }
  return STAGE_ORDER.filter((stage) => value.includes(stage));
}

function normalizeRule(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new TypeError('Eine aktive Lernregel muss ein Objekt sein.'), {
      code: 'CONTENT_LEARNING_SNAPSHOT_INVALID'
    });
  }
  const id = positiveInteger(value.id, 'Die Regel-ID');
  const version = positiveInteger(value.version, 'Die Regelversion');
  const categoryKey = sanitizeLearningText(value.category_key ?? value.categoryKey, 80);
  if (!getLearningCategory(categoryKey)) {
    throw Object.assign(new TypeError('Die Lernregel verwendet keine bekannte Kategorie.'), {
      code: 'CONTENT_LEARNING_SNAPSHOT_INVALID'
    });
  }
  const instruction = validateLearningRuleText(value.rule_text ?? value.instruction);
  const targetStages = Object.freeze(normalizeStages(value.target_stages ?? value.targetStages));
  const base = { id, version, categoryKey, instruction, targetStages };
  return Object.freeze({ ...base, hash: sha256(base) });
}

export function buildLearningRuleSnapshot(rules = []) {
  if (!Array.isArray(rules)) {
    throw Object.assign(new TypeError('Aktive Lernregeln müssen als Liste vorliegen.'), {
      code: 'CONTENT_LEARNING_SNAPSHOT_INVALID'
    });
  }
  if (rules.length > MAX_LEARNING_SNAPSHOT_RULES) {
    throw Object.assign(new RangeError('Ein Job-Snapshot darf höchstens 50 Lernregeln enthalten.'), {
      code: 'CONTENT_LEARNING_SNAPSHOT_TOO_LARGE'
    });
  }
  const normalized = rules.map(normalizeRule)
    .sort((left, right) => left.id - right.id || left.version - right.version);
  const ids = new Set();
  for (const rule of normalized) {
    if (ids.has(rule.id)) {
      throw Object.assign(new TypeError('Eine aktive Lernregel ist im Snapshot doppelt vorhanden.'), {
        code: 'CONTENT_LEARNING_SNAPSHOT_INVALID'
      });
    }
    ids.add(rule.id);
  }
  const frozenRules = Object.freeze(normalized);
  const base = { version: CONTENT_LEARNING_SNAPSHOT_VERSION, rules: frozenRules };
  const snapshot = Object.freeze({ ...base, hash: sha256(base) });
  if (Buffer.byteLength(canonicalJson(snapshot), 'utf8') > MAX_LEARNING_SNAPSHOT_BYTES) {
    throw Object.assign(new RangeError('Der Lernregelsnapshot überschreitet 40 KiB.'), {
      code: 'CONTENT_LEARNING_SNAPSHOT_TOO_LARGE'
    });
  }
  return snapshot;
}

export function validateLearningRuleSnapshot(snapshot) {
  try {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)
        || Object.keys(snapshot).sort().join(',') !== 'hash,rules,version'
        || snapshot.version !== CONTENT_LEARNING_SNAPSHOT_VERSION
        || !Array.isArray(snapshot.rules)) {
      return { valid: false, code: 'CONTENT_LEARNING_SNAPSHOT_INVALID' };
    }
    const rebuilt = buildLearningRuleSnapshot(snapshot.rules);
    if (canonicalJson(rebuilt) !== canonicalJson(snapshot)) {
      return { valid: false, code: 'CONTENT_LEARNING_SNAPSHOT_MISMATCH' };
    }
    return { valid: true, code: null };
  } catch (error) {
    return {
      valid: false,
      code: error?.code || 'CONTENT_LEARNING_SNAPSHOT_INVALID'
    };
  }
}

export function learningRulesForStage(snapshot, stage, categoryKeys = null) {
  if (!STAGES.has(stage)) {
    throw Object.assign(new TypeError('Die Lernregel-Zielstufe ist ungültig.'), {
      code: 'CONTENT_LEARNING_STAGE_INVALID'
    });
  }
  const validation = validateLearningRuleSnapshot(snapshot);
  if (!validation.valid) {
    throw Object.assign(new TypeError('Der Lernregelsnapshot ist ungültig.'), {
      code: validation.code
    });
  }
  const categoryFilter = categoryKeys == null
    ? null
    : new Set(Array.isArray(categoryKeys) ? categoryKeys : [...categoryKeys]);
  return snapshot.rules
    .filter((rule) => rule.targetStages.includes(stage)
      && (!categoryFilter || categoryFilter.has(rule.categoryKey)))
    .map(({ id, version, categoryKey, instruction }) => ({
      id,
      version,
      categoryKey,
      instruction
    }));
}
