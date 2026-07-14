import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

const SIMPLE_FIELDS = Object.freeze([
  'title',
  'shortDescription',
  'metaTitle',
  'metaDescription',
  'ogTitle',
  'ogDescription',
  'imageAlt'
]);

const FIELD_ALIASES = Object.freeze({
  title: ['title'],
  shortDescription: ['shortDescription', 'excerpt'],
  metaTitle: ['metaTitle', 'meta_title'],
  metaDescription: ['metaDescription', 'meta_description'],
  ogTitle: ['ogTitle', 'og_title'],
  ogDescription: ['ogDescription', 'og_description'],
  contentHtml: ['contentHtml', 'content'],
  faqJson: ['faqJson', 'faq_json'],
  imageAlt: ['imageAlt', 'image_alt'],
  slug: ['slug'],
  imageUrl: ['imageUrl', 'image_url'],
  contentFormat: ['contentFormat', 'content_format'],
  published: ['published'],
  status: ['status'],
  workflowStatus: ['workflowStatus', 'workflow_status'],
  publishedAt: ['publishedAt', 'published_at'],
  scheduledPublishAt: ['scheduledPublishAt', 'scheduled_publish_at']
});

const IMMUTABLE_FIELDS = Object.freeze([
  'slug',
  'imageUrl',
  'contentFormat',
  'published',
  'status',
  'workflowStatus',
  'publishedAt',
  'scheduledPublishAt'
]);

const HTML_BLOCK_SELECTOR = [
  '[data-track="cta"]',
  '.alert',
  'p',
  'li',
  'h2',
  'h3',
  'blockquote',
  'table'
].join(',');
const MAX_HTML_BLOCKS = 2_000;

function serviceError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

function stableJson(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `string:${JSON.stringify(value)}`;
  if (typeof value === 'number') return `number:${String(value)}`;
  if (typeof value === 'boolean') return `boolean:${value ? 'true' : 'false'}`;
  if (Array.isArray(value)) return `array:[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `object:{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function readField(value, field) {
  const source = value && typeof value === 'object' ? value : {};
  for (const key of FIELD_ALIASES[field] || [field]) {
    if (Object.hasOwn(source, key)) return { present: true, key, value: source[key] };
  }
  return { present: false, key: FIELD_ALIASES[field]?.[0] || field, value: undefined };
}

function setField(target, field, value) {
  const existing = readField(target, field);
  target[existing.key] = value;
}

function normalizeQuestion(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('de-DE');
}

function normalizeFaq(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw serviceError('EXISTING_POST_DIFF_INPUT_INVALID', 'Die FAQ-Daten müssen als Liste vorliegen.');
  }
  return value;
}

function faqComparable(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw serviceError('EXISTING_POST_DIFF_INPUT_INVALID', 'Ein FAQ-Eintrag ist ungültig.');
  }
  return item;
}

function elementPath($, element) {
  const parts = [];
  let current = element;
  while (current && current.type === 'tag') {
    const siblings = (current.parent?.children || []).filter(({ type }) => type === 'tag');
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${String(current.tagName || current.name).toLowerCase()}:nth-child(${index})`);
    current = current.parent;
  }
  return parts.join('>');
}

function blockType($, element) {
  const selected = $(element);
  if (selected.attr('data-track') === 'cta') return 'cta';
  if (selected.hasClass('alert')) return 'alert';
  return String(element.tagName || element.name).toLowerCase();
}

function hasSelectedAncestor($, element) {
  let current = element.parent;
  while (current && current.type === 'tag') {
    if ($(current).is(HTML_BLOCK_SELECTOR)) return true;
    current = current.parent;
  }
  return false;
}

function parseHtmlBlocks(html) {
  const $ = cheerio.load(String(html ?? ''), null, false);
  const blocks = $(HTML_BLOCK_SELECTOR).toArray()
    .filter((element) => !hasSelectedAncestor($, element))
    .map((element) => {
      const outerHtml = $.html(element);
      return {
        type: blockType($, element),
        path: elementPath($, element),
        html: outerHtml,
        fingerprint: fingerprint(outerHtml),
        element
      };
    });
  if (blocks.length > MAX_HTML_BLOCKS) {
    throw serviceError(
      'EXISTING_POST_DIFF_INPUT_INVALID',
      `Artikel dürfen höchstens ${MAX_HTML_BLOCKS} vergleichbare HTML-Blöcke enthalten.`
    );
  }
  return { $, blocks };
}

function substitutionCost(before, after) {
  if (before.fingerprint === after.fingerprint && before.type === after.type) return 0;
  if (before.type === after.type) return 1;
  return 3;
}

function alignHtmlBlocks(beforeBlocks, afterBlocks) {
  const rows = beforeBlocks.length + 1;
  const columns = afterBlocks.length + 1;
  const costs = Array.from({ length: rows }, () => Array(columns).fill(0));
  for (let beforeIndex = 0; beforeIndex < rows; beforeIndex += 1) costs[beforeIndex][0] = beforeIndex;
  for (let afterIndex = 0; afterIndex < columns; afterIndex += 1) costs[0][afterIndex] = afterIndex;

  for (let beforeIndex = 1; beforeIndex < rows; beforeIndex += 1) {
    for (let afterIndex = 1; afterIndex < columns; afterIndex += 1) {
      costs[beforeIndex][afterIndex] = Math.min(
        costs[beforeIndex - 1][afterIndex] + 1,
        costs[beforeIndex][afterIndex - 1] + 1,
        costs[beforeIndex - 1][afterIndex - 1]
          + substitutionCost(beforeBlocks[beforeIndex - 1], afterBlocks[afterIndex - 1])
      );
    }
  }

  const operations = [];
  let beforeIndex = beforeBlocks.length;
  let afterIndex = afterBlocks.length;
  while (beforeIndex > 0 || afterIndex > 0) {
    if (beforeIndex > 0 && afterIndex > 0) {
      const beforeBlock = beforeBlocks[beforeIndex - 1];
      const afterBlock = afterBlocks[afterIndex - 1];
      const cost = substitutionCost(beforeBlock, afterBlock);
      if (cost <= 1 && costs[beforeIndex][afterIndex] === costs[beforeIndex - 1][afterIndex - 1] + cost) {
        operations.push({ type: cost === 0 ? 'unchanged' : 'modified', before: beforeBlock, after: afterBlock });
        beforeIndex -= 1;
        afterIndex -= 1;
        continue;
      }
    }
    if (beforeIndex > 0 && costs[beforeIndex][afterIndex] === costs[beforeIndex - 1][afterIndex] + 1) {
      operations.push({ type: 'removed', before: beforeBlocks[beforeIndex - 1], after: null });
      beforeIndex -= 1;
      continue;
    }
    if (afterIndex > 0 && costs[beforeIndex][afterIndex] === costs[beforeIndex][afterIndex - 1] + 1) {
      operations.push({ type: 'added', before: null, after: afterBlocks[afterIndex - 1] });
      afterIndex -= 1;
      continue;
    }
    throw serviceError('EXISTING_POST_DIFF_FAILED', 'Die HTML-Blöcke konnten nicht sicher zugeordnet werden.');
  }
  return operations.reverse();
}

function normalizeReasons(reasons, field) {
  if (!Array.isArray(reasons)) return [];
  return reasons
    .filter((reason) => reason && reason.field === field)
    .map((reason) => ({
      field,
      auditCodes: Array.isArray(reason.auditCodes) ? reason.auditCodes.map(String) : [],
      reason: String(reason.reason ?? ''),
      sourceUrls: Array.isArray(reason.sourceUrls) ? reason.sourceUrls.map(String) : []
    }));
}

function finalizeChange(change, reasons) {
  const beforeFingerprint = fingerprint(change.before);
  const afterFingerprint = fingerprint(change.after);
  const id = createHash('sha256').update(stableJson({
    kind: change.kind,
    field: change.field,
    path: change.path,
    beforeFingerprint,
    afterFingerprint
  })).digest('hex');
  return {
    ...change,
    id,
    beforeFingerprint,
    afterFingerprint,
    status: 'active',
    reasons: normalizeReasons(reasons, change.field)
  };
}

function assertImmutableFields(before, after) {
  for (const field of IMMUTABLE_FIELDS) {
    const current = readField(before, field);
    const proposed = readField(after, field);
    if (!proposed.present) continue;
    if (!current.present || !Object.is(current.value, proposed.value)) {
      throw serviceError(
        'EXISTING_POST_IMMUTABLE_FIELD_CHANGE_FORBIDDEN',
        `${field} darf bei einer gezielten Bestandsoptimierung nicht geändert werden.`,
        { field }
      );
    }
  }
}

function faqChanges(beforeValue, afterValue, reasons) {
  const beforeFaq = normalizeFaq(beforeValue);
  const afterFaq = normalizeFaq(afterValue);
  const afterByQuestion = new Map();
  const beforeCounts = new Map();
  const afterCounts = new Map();

  for (const item of beforeFaq) {
    const key = normalizeQuestion(item?.question);
    beforeCounts.set(key, (beforeCounts.get(key) || 0) + 1);
  }
  for (const [index, item] of afterFaq.entries()) {
    const key = normalizeQuestion(item?.question);
    const entries = afterByQuestion.get(key) || [];
    entries.push({ item, index });
    afterByQuestion.set(key, entries);
    afterCounts.set(key, (afterCounts.get(key) || 0) + 1);
  }

  const consumed = new Set();
  const changes = [];
  const occurrences = new Map();
  for (const [beforeIndex, item] of beforeFaq.entries()) {
    const key = normalizeQuestion(item?.question);
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    const match = afterByQuestion.get(key)?.[occurrence];
    const path = `faq:${fingerprint(key)}:${occurrence}`;
    if (!match) {
      changes.push(finalizeChange({
        kind: 'faq', field: 'faqJson', path, changeType: 'removed',
        before: item, after: null, beforeIndex, afterIndex: null,
        revertible: false
      }, reasons));
      continue;
    }
    consumed.add(match.index);
    if (stableJson(faqComparable(item)) !== stableJson(faqComparable(match.item))) {
      const unique = beforeCounts.get(key) === 1 && afterCounts.get(key) === 1;
      changes.push(finalizeChange({
        kind: 'faq', field: 'faqJson', path, changeType: 'modified',
        before: item, after: match.item, beforeIndex, afterIndex: match.index,
        revertible: unique
      }, reasons));
    }
  }

  for (const [afterIndex, item] of afterFaq.entries()) {
    if (consumed.has(afterIndex)) continue;
    const key = normalizeQuestion(item?.question);
    const sameQuestionBefore = beforeCounts.get(key) || 0;
    const occurrence = sameQuestionBefore + afterFaq.slice(0, afterIndex)
      .filter((candidate, index) => !consumed.has(index) && normalizeQuestion(candidate?.question) === key)
      .length;
    changes.push(finalizeChange({
      kind: 'faq', field: 'faqJson', path: `faq:${fingerprint(key)}:${occurrence}`,
      changeType: 'added', before: null, after: item,
      beforeIndex: null, afterIndex,
      revertible: (afterCounts.get(key) || 0) === 1
    }, reasons));
  }
  return changes;
}

function htmlChanges(beforeHtml, afterHtml, reasons) {
  const beforeBlocks = parseHtmlBlocks(beforeHtml).blocks;
  const afterBlocks = parseHtmlBlocks(afterHtml).blocks;
  const afterFingerprintCounts = new Map();
  for (const block of afterBlocks) {
    const key = `${block.type}:${block.fingerprint}`;
    afterFingerprintCounts.set(key, (afterFingerprintCounts.get(key) || 0) + 1);
  }

  return alignHtmlBlocks(beforeBlocks, afterBlocks)
    .filter(({ type }) => type !== 'unchanged')
    .map((operation) => {
      const beforeBlock = operation.before;
      const afterBlock = operation.after;
      const uniqueAfter = afterBlock
        ? afterFingerprintCounts.get(`${afterBlock.type}:${afterBlock.fingerprint}`) === 1
        : false;
      return finalizeChange({
        kind: 'html',
        field: 'contentHtml',
        path: afterBlock?.path || beforeBlock?.path || '',
        beforePath: beforeBlock?.path || null,
        afterPath: afterBlock?.path || null,
        blockType: afterBlock?.type || beforeBlock?.type || '',
        changeType: operation.type,
        before: beforeBlock?.html ?? null,
        after: afterBlock?.html ?? null,
        revertible: operation.type !== 'removed' && uniqueAfter
      }, reasons);
    });
}

export function buildExistingPostDiff({ before = {}, after = {}, reasons = [] } = {}) {
  assertImmutableFields(before, after);
  const beforeFormat = readField(before, 'contentFormat').value;
  const afterFormat = readField(after, 'contentFormat');
  const effectiveFormat = afterFormat.present ? afterFormat.value : beforeFormat;
  const beforeContent = readField(before, 'contentHtml');
  const afterContent = readField(after, 'contentHtml');

  if (beforeFormat === 'legacy_ejs' && afterContent.present
      && !Object.is(beforeContent.value, afterContent.value)) {
    throw serviceError(
      'LEGACY_EJS_CONTENT_CHANGE_FORBIDDEN',
      'Legacy-EJS-Artikeltext muss bytegenau unverändert bleiben.'
    );
  }

  const changes = [];
  for (const field of SIMPLE_FIELDS) {
    const current = readField(before, field);
    const proposed = readField(after, field);
    if (!proposed.present || Object.is(current.value, proposed.value)) continue;
    changes.push(finalizeChange({
      kind: 'field', field, path: field, changeType: 'modified',
      before: current.value, after: proposed.value, revertible: true
    }, reasons));
  }

  const beforeFaq = readField(before, 'faqJson');
  const afterFaq = readField(after, 'faqJson');
  if (afterFaq.present) changes.push(...faqChanges(beforeFaq.value, afterFaq.value, reasons));

  if (effectiveFormat !== 'legacy_ejs' && afterContent.present) {
    changes.push(...htmlChanges(beforeContent.value, afterContent.value, reasons));
  }

  return { changes };
}

function countWords(html) {
  const $ = cheerio.load(String(html ?? ''), null, false);
  const textParts = [];
  function collectText(nodes) {
    for (const node of nodes || []) {
      if (node.type === 'text') textParts.push(node.data || '');
      else collectText(node.children);
    }
  }
  collectText($.root()[0]?.children);
  const text = textParts.join(' ').normalize('NFKC');
  return text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length || 0;
}

function ratio(value) {
  return Number(value.toFixed(6));
}

export function validateTargetedOptimizationScope({ before = {}, after = {} } = {}) {
  const beforeHtml = readField(before, 'contentHtml').value;
  const afterContent = readField(after, 'contentHtml');
  const afterHtml = afterContent.present ? afterContent.value : beforeHtml;
  const beforeBlocks = parseHtmlBlocks(beforeHtml).blocks;
  const afterBlocks = parseHtmlBlocks(afterHtml).blocks;
  const operations = alignHtmlBlocks(beforeBlocks, afterBlocks);
  const changedExistingBlocks = operations.filter(({ type }) => type === 'modified' || type === 'removed').length;
  const rawChangedBlockRatio = beforeBlocks.length === 0
    ? 0
    : changedExistingBlocks / beforeBlocks.length;
  const beforeWords = countWords(beforeHtml);
  const afterWords = countWords(afterHtml);
  const rawWordCountDeltaRatio = beforeWords === 0
    ? (afterWords === 0 ? 0 : 1)
    : Math.abs(afterWords - beforeWords) / beforeWords;
  const passed = rawChangedBlockRatio <= 0.35 && rawWordCountDeltaRatio <= 0.25;

  return {
    passed,
    code: passed ? null : 'TARGETED_SCOPE_EXCEEDED',
    changedBlockRatio: ratio(rawChangedBlockRatio),
    wordCountDeltaRatio: ratio(rawWordCountDeltaRatio)
  };
}

function conflict() {
  throw serviceError(
    'CONTENT_REVISION_CHANGE_CONFLICT',
    'Die Änderung kann wegen eines Revisionskonflikts nicht sicher zurückgenommen werden.'
  );
}

function versionAccessor(snapshot) {
  if (Number.isSafeInteger(snapshot?.revisionVersion)) return { key: 'revisionVersion', value: snapshot.revisionVersion };
  if (Number.isSafeInteger(snapshot?.revision_version)) return { key: 'revision_version', value: snapshot.revision_version };
  return null;
}

function reportFromSnapshot(snapshot) {
  for (const key of ['diff', 'optimizationReport', 'optimization_report_json', 'report']) {
    if (snapshot?.[key] && Array.isArray(snapshot[key].changes)) return snapshot[key];
  }
  if (Array.isArray(snapshot?.changes)) return snapshot;
  return null;
}

function currentArticleFromSnapshot(snapshot) {
  for (const key of ['current', 'article', 'after']) {
    if (snapshot?.[key] && typeof snapshot[key] === 'object') return snapshot[key];
  }
  if (snapshot?.snapshot_json?.fields && typeof snapshot.snapshot_json.fields === 'object') {
    return snapshot.snapshot_json.fields;
  }
  if (snapshot?.fields && typeof snapshot.fields === 'object') return snapshot.fields;
  return null;
}

function revertField(article, change) {
  const current = readField(article, change.field);
  if (!current.present || fingerprint(current.value) !== change.afterFingerprint) conflict();
  setField(article, change.field, change.before);
}

function revertFaq(article, change) {
  const current = readField(article, 'faqJson');
  const faq = normalizeFaq(current.value);
  const targetKey = normalizeQuestion(change.after?.question);
  const candidates = faq
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => normalizeQuestion(item?.question) === targetKey
      && fingerprint(item) === change.afterFingerprint);
  if (candidates.length !== 1) conflict();
  const [{ index }] = candidates;
  if (change.changeType === 'added') faq.splice(index, 1);
  else if (change.changeType === 'modified') faq.splice(index, 1, change.before);
  else conflict();
  setField(article, 'faqJson', faq);
}

function revertHtml(article, change) {
  const current = readField(article, 'contentHtml');
  if (!current.present) conflict();
  const parsed = parseHtmlBlocks(current.value);
  let candidates = parsed.blocks.filter((block) => (
    block.path === change.afterPath
      && block.type === change.blockType
      && block.fingerprint === change.afterFingerprint
  ));
  if (candidates.length !== 1) {
    candidates = parsed.blocks.filter((block) => (
      block.type === change.blockType && block.fingerprint === change.afterFingerprint
    ));
  }
  if (candidates.length !== 1) conflict();
  const [target] = candidates;
  if (change.changeType === 'added') parsed.$(target.element).remove();
  else if (change.changeType === 'modified') parsed.$(target.element).replaceWith(change.before);
  else conflict();
  setField(article, 'contentHtml', parsed.$.root().html() || '');
}

export function revertExistingPostChange({ snapshot, changeId, expectedVersion } = {}) {
  if (!snapshot || typeof snapshot !== 'object' || !Number.isSafeInteger(expectedVersion)) conflict();
  const cloned = structuredClone(snapshot);
  const version = versionAccessor(cloned);
  if (!version || version.value !== expectedVersion) conflict();
  const report = reportFromSnapshot(cloned);
  const article = currentArticleFromSnapshot(cloned);
  const change = report?.changes.find(({ id }) => id === changeId);
  if (!article || !change || change.status !== 'active' || change.revertible !== true) conflict();

  if (change.kind === 'field') revertField(article, change);
  else if (change.kind === 'faq') revertFaq(article, change);
  else if (change.kind === 'html') revertHtml(article, change);
  else conflict();

  change.status = 'reverted';
  cloned[version.key] = version.value + 1;
  return cloned;
}
