import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import { ALLOWED_ARTICLE_CLASSES } from './articleHtmlContract.js';
import { requiresLegacyBytePreservation } from './legacyContentPolicy.js';

export const EXISTING_POST_DIFF_POLICY_VERSION = 'existing-post-diff-policy-v3';

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
const STRUCTURAL_WRAPPER_TAGS = new Set([
  'article', 'aside', 'div', 'footer', 'form', 'header', 'main', 'nav', 'ol',
  'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);
const STRUCTURAL_ALLOWED_CLASSES = new Set(ALLOWED_ARTICLE_CLASSES);

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

function structuralClasses($, element) {
  return [...new Set(String($(element).attr('class') || '')
    .split(/\s+/u)
    .filter(Boolean)
    .filter((className) => STRUCTURAL_ALLOWED_CLASSES.has(className)))]
    .sort();
}

function isStructuralPresentationNode($, element) {
  const tagName = String(element.tagName || element.name || '').toLowerCase();
  return STRUCTURAL_WRAPPER_TAGS.has(tagName) || structuralClasses($, element).length > 0;
}

function structuralWrapperToken($, element) {
  const tagName = String(element.tagName || element.name || '').toLowerCase();
  const classes = structuralClasses($, element);
  return classes.length === 0 ? tagName : `${tagName}.${classes.join('.')}`;
}

function structuralWrapperOrdinal(element) {
  const siblings = (element.parent?.children || []).filter((candidate) => (
    candidate.type === 'tag'
      && STRUCTURAL_WRAPPER_TAGS.has(
        String(candidate.tagName || candidate.name || '').toLowerCase()
      )
  ));
  return siblings.indexOf(element) + 1;
}

function structuralParentPath($, element) {
  const parts = [];
  let current = element.parent;
  while (current && current.type === 'tag') {
    const tagName = String(current.tagName || current.name || '').toLowerCase();
    if (STRUCTURAL_WRAPPER_TAGS.has(tagName)) {
      parts.unshift(`${structuralWrapperToken($, current)}:${structuralWrapperOrdinal(current)}`);
    }
    current = current.parent;
  }
  return parts.join('>');
}

function structuralWrapperSkeleton($) {
  let wrapperCount = 0;
  function walk(nodes) {
    const result = [];
    for (const node of nodes || []) {
      if (node.type !== 'tag') continue;
      const children = walk(node.children);
      if (isStructuralPresentationNode($, node)) {
        wrapperCount += 1;
        if (wrapperCount > MAX_HTML_BLOCKS) {
          throw serviceError(
            'EXISTING_POST_DIFF_INPUT_INVALID',
            `Artikel dürfen höchstens ${MAX_HTML_BLOCKS} strukturelle HTML-Wrapper enthalten.`
          );
        }
        result.push({ token: structuralWrapperToken($, node), children });
      } else {
        result.push(...children);
      }
    }
    return result;
  }
  return walk($.root()[0]?.children);
}

function parseHtmlBlocks(html) {
  const $ = cheerio.load(String(html ?? ''), null, false);
  const blocks = $(HTML_BLOCK_SELECTOR).toArray()
    .filter((element) => !hasSelectedAncestor($, element))
    .map((element, index) => {
      const outerHtml = $.html(element);
      return {
        index,
        type: blockType($, element),
        path: elementPath($, element),
        html: outerHtml,
        text: $(element).text().normalize('NFKC').trim().replace(/\s+/gu, ' '),
        fingerprint: fingerprint(outerHtml),
        structuralParentPath: structuralParentPath($, element),
        element
      };
    });
  if (blocks.length > MAX_HTML_BLOCKS) {
    throw serviceError(
      'EXISTING_POST_DIFF_INPUT_INVALID',
      `Artikel dürfen höchstens ${MAX_HTML_BLOCKS} vergleichbare HTML-Blöcke enthalten.`
    );
  }
  for (const [index, block] of blocks.entries()) {
    block.previousFingerprint = blocks[index - 1]?.fingerprint || null;
    block.nextFingerprint = blocks[index + 1]?.fingerprint || null;
  }
  return { $, blocks, structureFingerprint: fingerprint(structuralWrapperSkeleton($)) };
}

function blockKey(block) {
  return `${block.type}:${block.fingerprint}`;
}

function tokenSimilarity(before, after) {
  const tokens = (value) => new Set(
    String(value || '').toLocaleLowerCase('de-DE').match(/[\p{L}\p{N}]+/gu) || []
  );
  const beforeTokens = tokens(before.text);
  const afterTokens = tokens(after.text);
  const union = new Set([...beforeTokens, ...afterTokens]);
  if (union.size === 0) return 0;
  let intersectionSize = 0;
  for (const token of beforeTokens) {
    if (afterTokens.has(token)) intersectionSize += 1;
  }
  return intersectionSize / union.size;
}

function hasCrossedNeighbor(before, after) {
  return Boolean(
    (before.previousFingerprint && before.previousFingerprint === after.nextFingerprint)
    || (before.nextFingerprint && before.nextFingerprint === after.previousFingerprint)
  );
}

function substitutionCost(before, after) {
  if (before.fingerprint === after.fingerprint && before.type === after.type) return 0;
  if (before.type !== after.type) return 3;
  let score = 0;
  if (before.path === after.path) score += 4;
  if (before.index === after.index) score += 1;
  if (before.previousFingerprint && before.previousFingerprint === after.previousFingerprint) score += 2;
  if (before.nextFingerprint && before.nextFingerprint === after.nextFingerprint) score += 2;
  if (hasCrossedNeighbor(before, after)) score += 1;
  const similarity = tokenSimilarity(before, after);
  if (similarity >= 0.6) score += 3;
  else if (similarity >= 0.25) score += 1;
  return score >= 4 ? 1 : 2;
}

function exactFingerprintPairs(beforeBlocks, afterBlocks) {
  const beforeGroups = new Map();
  const afterGroups = new Map();
  for (const block of beforeBlocks) {
    const key = blockKey(block);
    beforeGroups.set(key, [...(beforeGroups.get(key) || []), block]);
  }
  for (const block of afterBlocks) {
    const key = blockKey(block);
    afterGroups.set(key, [...(afterGroups.get(key) || []), block]);
  }

  const pairs = [];
  const pairedBefore = new Set();
  const pairedAfter = new Set();
  for (const [key, beforeGroup] of beforeGroups) {
    const afterGroup = afterGroups.get(key) || [];
    const duplicate = beforeGroup.length > 1 || afterGroup.length > 1;
    const pairCount = Math.min(beforeGroup.length, afterGroup.length);
    for (let index = 0; index < pairCount; index += 1) {
      const before = beforeGroup[index];
      const after = afterGroup[index];
      pairs.push({ before, after, duplicate });
      pairedBefore.add(before.index);
      pairedAfter.add(after.index);
    }
  }

  return {
    pairs,
    remainingBefore: beforeBlocks.filter(({ index }) => !pairedBefore.has(index)),
    remainingAfter: afterBlocks.filter(({ index }) => !pairedAfter.has(index))
  };
}

function longestStablePairs(pairs) {
  const ordered = [...pairs].sort((left, right) => left.before.index - right.before.index);
  const states = ordered.map((pair) => ({
    length: 1,
    samePath: pair.before.path === pair.after.path ? 1 : 0,
    unique: pair.duplicate ? 0 : 1,
    previous: -1
  }));
  const isBetter = (candidate, current) => (
    candidate.length > current.length
    || (candidate.length === current.length && candidate.samePath > current.samePath)
    || (candidate.length === current.length && candidate.samePath === current.samePath
      && candidate.unique > current.unique)
  );

  for (let index = 0; index < ordered.length; index += 1) {
    for (let previous = 0; previous < index; previous += 1) {
      if (ordered[previous].after.index >= ordered[index].after.index) continue;
      const candidate = {
        length: states[previous].length + 1,
        samePath: states[previous].samePath
          + (ordered[index].before.path === ordered[index].after.path ? 1 : 0),
        unique: states[previous].unique + (ordered[index].duplicate ? 0 : 1),
        previous
      };
      if (isBetter(candidate, states[index])) states[index] = candidate;
    }
  }

  let bestIndex = -1;
  for (let index = 0; index < states.length; index += 1) {
    if (bestIndex < 0 || isBetter(states[index], states[bestIndex])) bestIndex = index;
  }
  const stable = new Set();
  while (bestIndex >= 0) {
    stable.add(ordered[bestIndex]);
    bestIndex = states[bestIndex].previous;
  }
  return stable;
}

function alignResidualBlocks(beforeBlocks, afterBlocks) {
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

function crossesExactPair(operation, exactPairs) {
  if (!operation.before || !operation.after) return false;
  return exactPairs.some(({ before, after }) => (
    (operation.before.index - before.index) * (operation.after.index - after.index) < 0
  ));
}

function modificationIsAmbiguous(operation, beforeBlocks, afterBlocks) {
  const sameTypeBefore = beforeBlocks.filter(({ type }) => type === operation.before.type);
  const sameTypeAfter = afterBlocks.filter(({ type }) => type === operation.after.type);
  return sameTypeBefore.length !== 1 || sameTypeAfter.length !== 1;
}

function alignHtmlBlocks(beforeBlocks, afterBlocks) {
  const exact = exactFingerprintPairs(beforeBlocks, afterBlocks);
  const stablePairs = longestStablePairs(exact.pairs);
  const exactOperations = exact.pairs.map((pair) => ({
    type: stablePairs.has(pair) ? 'unchanged' : 'moved',
    before: pair.before,
    after: pair.after,
    mappingAmbiguous: pair.duplicate
  }));
  const residualOperations = alignResidualBlocks(exact.remainingBefore, exact.remainingAfter)
    .map((operation) => {
      if (operation.type !== 'modified') return operation;
      const moved = crossesExactPair(operation, exact.pairs);
      return {
        ...operation,
        type: moved ? 'moved_modified' : 'modified',
        mappingAmbiguous: moved || modificationIsAmbiguous(
          operation,
          exact.remainingBefore,
          exact.remainingAfter
        )
      };
    });
  const priority = { added: 0, removed: 1, modified: 2, moved_modified: 2, moved: 3, unchanged: 4 };
  return [...exactOperations, ...residualOperations].sort((left, right) => {
    const leftPosition = Math.min(left.before?.index ?? Infinity, left.after?.index ?? Infinity);
    const rightPosition = Math.min(right.before?.index ?? Infinity, right.after?.index ?? Infinity);
    return leftPosition - rightPosition || priority[left.type] - priority[right.type];
  });
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
  const beforeEntries = beforeFaq.map((item, index) => ({
    item, index, key: normalizeQuestion(item?.question), fingerprint: fingerprint(item)
  }));
  const afterEntries = afterFaq.map((item, index) => ({
    item, index, key: normalizeQuestion(item?.question), fingerprint: fingerprint(item)
  }));
  const consumedBefore = new Set();
  const consumedAfter = new Set();

  for (const beforeEntry of beforeEntries) {
    const exact = afterEntries.find((afterEntry) => (
      !consumedAfter.has(afterEntry.index)
      && afterEntry.key === beforeEntry.key
      && afterEntry.fingerprint === beforeEntry.fingerprint
    ));
    if (!exact) continue;
    consumedBefore.add(beforeEntry.index);
    consumedAfter.add(exact.index);
  }

  const groupKeys = [];
  for (const entry of [...beforeEntries, ...afterEntries]) {
    if (!groupKeys.includes(entry.key)) groupKeys.push(entry.key);
  }
  const changes = [];
  for (const key of groupKeys) {
    const remainingBefore = beforeEntries.filter((entry) => (
      entry.key === key && !consumedBefore.has(entry.index)
    ));
    const remainingAfter = afterEntries.filter((entry) => (
      entry.key === key && !consumedAfter.has(entry.index)
    ));
    if (remainingBefore.length === 1 && remainingAfter.length === 1) {
      const [current] = remainingBefore;
      const [proposed] = remainingAfter;
      const proposedFingerprintCount = afterEntries.filter((entry) => (
        entry.key === key && entry.fingerprint === proposed.fingerprint
      )).length;
      changes.push(finalizeChange({
        kind: 'faq', field: 'faqJson',
        path: `faq:${fingerprint(key)}:${current.index}`,
        changeType: 'modified', before: current.item, after: proposed.item,
        beforeIndex: current.index, afterIndex: proposed.index,
        revertible: proposedFingerprintCount === 1
      }, reasons));
      continue;
    }

    const ambiguous = remainingBefore.length > 1 || remainingAfter.length > 1;
    for (const current of remainingBefore) {
      changes.push(finalizeChange({
        kind: 'faq', field: 'faqJson',
        path: `faq:${fingerprint(key)}:${current.index}`,
        changeType: 'removed', before: current.item, after: null,
        beforeIndex: current.index, afterIndex: null,
        revertible: false
      }, reasons));
    }
    for (const proposed of remainingAfter) {
      changes.push(finalizeChange({
        kind: 'faq', field: 'faqJson',
        path: `faq:${fingerprint(key)}:${proposed.index}`,
        changeType: 'added', before: null, after: proposed.item,
        beforeIndex: null, afterIndex: proposed.index,
        revertible: !ambiguous
      }, reasons));
    }
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
        mappingAmbiguous: operation.mappingAmbiguous === true,
        revertible: uniqueAfter
          && operation.mappingAmbiguous !== true
          && (operation.type === 'modified' || operation.type === 'added')
      }, reasons);
    });
}

export function buildExistingPostDiff({ before = {}, after = {}, reasons = [] } = {}) {
  assertImmutableFields(before, after);
  const beforeFormat = readField(before, 'contentFormat').value;
  const beforeContent = readField(before, 'contentHtml');
  const afterContent = readField(after, 'contentHtml');

  const preserveLegacyBytes = requiresLegacyBytePreservation({
    contentFormat: beforeFormat,
    contentHtml: beforeContent.value
  });

  if (preserveLegacyBytes && afterContent.present
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

  if (!preserveLegacyBytes && afterContent.present) {
    changes.push(...htmlChanges(beforeContent.value, afterContent.value, reasons));
  }

  return { changes };
}

function countWords(html) {
  const $ = cheerio.load(String(html ?? ''), null, false);
  const blockElements = new Set([
    'address', 'article', 'aside', 'blockquote', 'br', 'div', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav',
    'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
    'tr', 'ul'
  ]);
  function visibleText(nodes) {
    let result = '';
    for (const node of nodes || []) {
      if (node.type === 'text') {
        result += node.data || '';
        continue;
      }
      const children = visibleText(node.children);
      const tagName = String(node.tagName || node.name || '').toLowerCase();
      result += blockElements.has(tagName) ? ` ${children} ` : children;
    }
    return result;
  }
  const text = visibleText($.root()[0]?.children).normalize('NFKC');
  return text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length || 0;
}

function ratio(value) {
  return Number(value.toFixed(6));
}

export function validateTargetedOptimizationScope({ before = {}, after = {} } = {}) {
  const beforeHtml = readField(before, 'contentHtml').value;
  const afterContent = readField(after, 'contentHtml');
  const afterHtml = afterContent.present ? afterContent.value : beforeHtml;
  const beforeDocument = parseHtmlBlocks(beforeHtml);
  const afterDocument = parseHtmlBlocks(afterHtml);
  const beforeBlocks = beforeDocument.blocks;
  const afterBlocks = afterDocument.blocks;
  const operations = alignHtmlBlocks(beforeBlocks, afterBlocks);
  const pairedBlockChangedParent = operations.some(({ before: beforeBlock, after: afterBlock }) => (
    beforeBlock
      && afterBlock
      && beforeBlock.structuralParentPath !== afterBlock.structuralParentPath
  ));
  const structureChanged = beforeDocument.structureFingerprint !== afterDocument.structureFingerprint
    || pairedBlockChangedParent;
  const changedExistingBlocks = operations.filter(({ type }) => (
    type === 'modified'
    || type === 'removed'
    || type === 'moved'
    || type === 'moved_modified'
  )).length;
  const rawChangedBlockRatio = beforeBlocks.length === 0
    ? 0
    : changedExistingBlocks / beforeBlocks.length;
  const beforeWords = countWords(beforeHtml);
  const afterWords = countWords(afterHtml);
  const rawWordCountDeltaRatio = beforeWords === 0
    ? (afterWords === 0 ? 0 : 1)
    : Math.abs(afterWords - beforeWords) / beforeWords;
  const ratioPassed = rawChangedBlockRatio <= 0.35 && rawWordCountDeltaRatio <= 0.25;
  const passed = ratioPassed && !structureChanged;

  return {
    passed,
    code: passed ? null : structureChanged ? 'HTML_STRUCTURE_CHANGED' : 'TARGETED_SCOPE_EXCEEDED',
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
