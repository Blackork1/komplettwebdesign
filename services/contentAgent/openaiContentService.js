import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  ArticleOutputSchema,
  ExistingPostSourceResearchSchema,
  ReviewOutputSchema,
  SeoBriefSchema,
  TopicCandidatesSchema,
  WeeklyTopicResearchSchema
} from './articleSchemas.js';
import { LearningClassificationBatchSchema } from './contentLearningSchemas.js';
import {
  ExistingPostOptimizationOutputSchema,
  LegacyExistingPostOptimizationOutputSchema
} from './existingPostOptimizationSchemas.js';
import { ArticlePerformanceExplanationSchema } from './articlePerformanceExplanationService.js';
import {
  buildTopicResearchPrompt,
  promptVersion as topicResearchPromptVersion
} from './prompts/topicResearchPrompt.js';
import {
  buildWeeklyTopicResearchPrompt,
  promptVersion as weeklyTopicResearchPromptVersion
} from './prompts/weeklyTopicResearchPrompt.js';
import {
  buildWebResearchPrompt,
  promptVersion as webResearchPromptVersion
} from './prompts/webResearchPrompt.js';
import {
  buildExistingPostSourceResearchPrompt,
  promptVersion as existingPostSourceResearchPromptVersion
} from './prompts/existingPostSourceResearchPrompt.js';
import {
  buildExistingPostOptimizationPrompt,
  promptVersion as existingPostOptimizationPromptVersion
} from './prompts/existingPostOptimizationPrompt.js';
import {
  buildSeoBriefPrompt,
  promptVersion as seoBriefPromptVersion
} from './prompts/seoBriefPrompt.js';
import {
  buildArticleWriterPrompt,
  promptVersion as articleWriterPromptVersion
} from './prompts/articleWriterPrompt.js';
import {
  buildArticleReviewerPrompt,
  promptVersion as articleReviewerPromptVersion
} from './prompts/articleReviewerPrompt.js';
import {
  buildArticleRepairPrompt,
  promptVersion as articleRepairPromptVersion
} from './prompts/articleRepairPrompt.js';
import { normalizeEditorialReview } from './editorialReviewPolicy.js';
import {
  buildContentLearningClassifierPrompt,
  promptVersion as contentLearningClassifierPromptVersion
} from './prompts/contentLearningClassifierPrompt.js';
import { calculateGscTopicRelevance } from './searchConsoleCategoryService.js';
import { normalizeSafeHttpsUrl } from './httpsUrlSafety.js';
import {
  isLegacyStaticHtml,
  requiresLegacyBytePreservation
} from './legacyContentPolicy.js';

const ANSI_ESCAPE = /\u001B(?:\[[0-?]*[ -/]*[@-~]|[@-Z\\-_])/g;

function incompatibleSchemaError() {
  return Object.assign(
    new Error('Das strukturierte OpenAI-Schema enthält eine nicht unterstützte Konstruktion.'),
    {
      code: 'CONTENT_OPENAI_SCHEMA_INCOMPATIBLE',
      providerRequestStarted: false
    }
  );
}

export function assertOpenAISchemaCompatibility(schema) {
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.items) || Object.hasOwn(value, 'format')) {
      throw incompatibleSchemaError();
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(schema);
  return true;
}

function normalizeResponseId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(ANSI_ESCAPE, '')
    .replace(/[^A-Za-z0-9._:-]/g, '')
    .slice(0, 128);
  return normalized || null;
}

export class OpenAIContentResponseError extends Error {
  constructor({
    code,
    responseId,
    message,
    usage,
    promptVersion,
    providerResponseCompleted = false
  }) {
    const safeResponseId = normalizeResponseId(responseId);
    super(safeResponseId ? `${message} Response-ID: ${safeResponseId}.` : message);
    this.name = 'OpenAIContentResponseError';
    this.code = code;
    this.responseId = safeResponseId;
    if (providerResponseCompleted === true) {
      this.usage = usage && typeof usage === 'object' && !Array.isArray(usage) ? usage : {};
      this.promptVersion = typeof promptVersion === 'string' ? promptVersion : 'unknown';
      this.providerResponseCompleted = true;
    }
  }
}

function normalizeText(value, maximum) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, maximum)
    : '';
}

function copyAnnotationField(target, annotation, camelName, snakeName, maximum) {
  if (target[camelName]) return;
  const value = normalizeText(annotation[camelName] ?? annotation[snakeName], maximum);
  if (value) target[camelName] = value;
}

function containsRefusal(response) {
  return (Array.isArray(response?.output) ? response.output : []).some((item) => (
    item?.type === 'message' &&
    Array.isArray(item.content) &&
    item.content.some((block) => block?.type === 'refusal')
  ));
}

function assertCompletedResponse(response) {
  if (containsRefusal(response)) {
    throw new OpenAIContentResponseError({
      code: 'OPENAI_RESPONSE_REFUSED',
      responseId: response?.id,
      message: 'OpenAI hat die angeforderte Ausgabe abgelehnt.'
    });
  }

  const errorByStatus = {
    failed: ['OPENAI_RESPONSE_FAILED', 'OpenAI konnte die Antwort nicht erzeugen.'],
    incomplete: ['OPENAI_RESPONSE_INCOMPLETE', 'OpenAI lieferte nur eine unvollständige Antwort.']
  };
  const statusError = errorByStatus[response?.status];
  if (statusError) {
    throw new OpenAIContentResponseError({
      code: statusError[0],
      responseId: response?.id,
      message: statusError[1]
    });
  }
  if (response?.status !== 'completed') {
    throw new OpenAIContentResponseError({
      code: 'OPENAI_RESPONSE_NOT_COMPLETED',
      responseId: response?.id,
      message: 'OpenAI lieferte keine abgeschlossene Antwort.'
    });
  }
}

function structuredOutputText(response) {
  const blocks = (Array.isArray(response?.output) ? response.output : [])
    .filter((item) => item?.type === 'message' && Array.isArray(item.content))
    .flatMap((item) => item.content)
    .filter((block) => block?.type === 'output_text' && typeof block.text === 'string');
  return blocks.length === 1 && blocks[0].text.length > 0 ? blocks[0].text : null;
}

export function extractWebSources(response) {
  const sourcesByUrl = new Map();

  function addSource(rawSource) {
    const annotation = rawSource?.url_citation && typeof rawSource.url_citation === 'object'
      ? { ...rawSource, ...rawSource.url_citation }
      : rawSource;
    const url = normalizeSafeHttpsUrl(annotation?.url, {
      allowSurroundingWhitespace: true,
      stripHash: true
    });
    if (!url) return;

    let source = sourcesByUrl.get(url);
    if (!source) {
      source = { url };
      sourcesByUrl.set(url, source);
    }
    const title = normalizeText(annotation.title, 500);
    if (title && !source.title) source.title = title;
    copyAnnotationField(source, annotation, 'publisher', 'publisher', 200);
    copyAnnotationField(source, annotation, 'publishedAt', 'published_at', 64);
    copyAnnotationField(source, annotation, 'retrievedAt', 'retrieved_at', 64);
  }

  const output = Array.isArray(response?.output) ? response.output : [];

  // Betitelte Zitationsannotationen sind die verlässliche Grundlage für das
  // eigene Quellenschema. Action-Quellen enthalten laut API nicht zwingend
  // einen Titel und dürfen daher die begrenzte Ergebnisliste nicht verdrängen.
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;

    for (const block of item.content) {
      for (const rawAnnotation of Array.isArray(block?.annotations) ? block.annotations : []) {
        if (rawAnnotation?.type !== 'url_citation') continue;
        addSource(rawAnnotation);
      }
    }
  }

  for (const item of output) {
    if (item?.type !== 'web_search_call') continue;
    for (const rawSource of Array.isArray(item.action?.sources) ? item.action.sources : []) {
      addSource(rawSource);
    }
  }

  const sources = [...sourcesByUrl.values()];
  const citedSources = sources.filter((source) => (
    typeof source.title === 'string' && source.title.length > 0
  ));
  if (citedSources.length >= 2) return citedSources.slice(0, 6);

  for (const source of sources) {
    if (source.title) continue;
    const hostname = new URL(source.url).hostname.replace(/^www\./iu, '');
    source.title = `Webquelle von ${hostname}`;
  }

  return sources
    .filter((source) => typeof source.title === 'string' && source.title.length > 0)
    .slice(0, 6);
}

function groundedStructuredSources(sources, response) {
  const searchedUrls = new Set();
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type !== 'web_search_call') continue;
    for (const source of Array.isArray(item.action?.sources) ? item.action.sources : []) {
      const url = normalizeSafeHttpsUrl(source?.url, {
        allowSurroundingWhitespace: true,
        stripHash: true
      });
      if (url) searchedUrls.add(url);
    }
  }

  return sources.flatMap((source) => {
    const url = normalizeSafeHttpsUrl(source?.url, {
      allowSurroundingWhitespace: true,
      stripHash: true
    });
    return url && searchedUrls.has(url) ? [{ ...source, url }] : [];
  });
}

const TESTER_TOPIC_PATTERN = /\b(?:website|seo|geo|meta|broken[-\s]?links?)[-\s]?tester\b|\bwebsite[-\s]?test\b/i;

function classifyWeeklyTesterTopic(candidate) {
  const searchableText = [
    candidate.topic,
    candidate.suggestedTitle,
    candidate.slug,
    candidate.primaryKeyword,
    candidate.contentCluster
  ].filter((value) => typeof value === 'string').join(' ');
  return {
    ...candidate,
    isTesterTopic: candidate.isTesterTopic || TESTER_TOPIC_PATTERN.test(searchableText)
  };
}

function curateWeeklyCandidates(candidates, maxCandidates) {
  const normalizedMaximum = Number.isSafeInteger(maxCandidates)
    ? Math.min(20, Math.max(1, maxCandidates))
    : 9;
  const seenSlugs = new Set();
  const uniqueCandidates = candidates.map(classifyWeeklyTesterTopic).filter((candidate) => {
    if (seenSlugs.has(candidate.slug)) return false;
    seenSlugs.add(candidate.slug);
    return true;
  });
  const regularCandidates = uniqueCandidates
    .filter(({ isTesterTopic }) => !isTesterTopic)
    .slice(0, normalizedMaximum);
  const testerLimit = Math.min(
    Math.floor(regularCandidates.length / 2),
    normalizedMaximum - regularCandidates.length
  );
  const testerCandidates = uniqueCandidates
    .filter(({ isTesterTopic }) => isTesterTopic)
    .slice(0, Math.max(0, testerLimit));
  const selected = new Set([...regularCandidates, ...testerCandidates]);
  return uniqueCandidates.filter((candidate) => selected.has(candidate));
}

export function createOpenAIContentService({
  apiKey,
  config,
  client = null,
  schemaCompatibilityValidator = assertOpenAISchemaCompatibility
}) {
  const openai = client || new OpenAI({ apiKey });

  async function parse({
    model,
    schema,
    schemaName,
    system,
    user,
    promptVersion,
    tools,
    transformValue,
    include
  }) {
    const format = zodTextFormat(schema, schemaName);
    schemaCompatibilityValidator(format.schema);
    const request = {
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      text: { format }
    };
    if (tools) request.tools = tools;
    if (include) request.include = include;
    const response = await openai.responses.parse(request);
    assertCompletedResponse(response);
    if (response.output_parsed == null) {
      throw new OpenAIContentResponseError({
        code: 'OPENAI_STRUCTURED_OUTPUT_MISSING',
        responseId: response.id,
        message: 'OpenAI lieferte kein strukturiertes Ergebnis.'
      });
    }
    let value;
    try {
      value = schema.parse(response.output_parsed);
    } catch {
      throw new OpenAIContentResponseError({
        code: 'OPENAI_STRUCTURED_OUTPUT_INVALID',
        responseId: response.id,
        message: 'OpenAI lieferte ein schemawidriges strukturiertes Ergebnis.'
      });
    }
    return {
      value: transformValue ? transformValue(value, response) : value,
      responseId: response.id,
      usage: response.usage || {},
      promptVersion
    };
  }

  async function createStructuredResponse({
    model,
    schema,
    schemaName,
    system,
    user,
    promptVersion,
    validateValue
  }) {
    const format = zodTextFormat(schema, schemaName);
    schemaCompatibilityValidator(format.schema);
    const response = await openai.responses.create({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      text: { format }
    });
    assertCompletedResponse(response);
    const outputText = structuredOutputText(response);
    if (outputText === null) {
      throw new OpenAIContentResponseError({
        code: 'OPENAI_STRUCTURED_OUTPUT_MISSING',
        responseId: response.id,
        message: 'OpenAI lieferte kein strukturiertes Ergebnis.'
      });
    }
    let parsedJson;
    try {
      parsedJson = JSON.parse(outputText);
    } catch {
      throw new OpenAIContentResponseError({
        code: 'OPENAI_STRUCTURED_OUTPUT_INVALID',
        responseId: response.id,
        message: 'OpenAI lieferte ein schemawidriges strukturiertes Ergebnis.'
      });
    }
    let value;
    try {
      value = schema.parse(parsedJson);
    } catch {
      throw new OpenAIContentResponseError({
        code: 'OPENAI_STRUCTURED_OUTPUT_INVALID',
        responseId: response.id,
        message: 'OpenAI lieferte ein schemawidriges strukturiertes Ergebnis.'
      });
    }
    if (validateValue) validateValue(value, response);
    return {
      value,
      responseId: response.id,
      usage: response.usage || {},
      promptVersion
    };
  }

  async function createTopicCandidates(input) {
    const prompt = buildTopicResearchPrompt(input);
    return parse({
      model: config.contentModel,
      schema: TopicCandidatesSchema,
      schemaName: 'topic_candidates',
      ...prompt,
      promptVersion: topicResearchPromptVersion
    });
  }

  async function createWeeklyTopicPool(input) {
    const prompt = buildWeeklyTopicResearchPrompt(input);
    return parse({
      model: config.contentModel,
      schema: WeeklyTopicResearchSchema,
      schemaName: 'weekly_topic_candidates',
      ...prompt,
      tools: [{ type: 'web_search' }],
      include: ['web_search_call.action.sources'],
      transformValue(value, response) {
        return {
          candidates: curateWeeklyCandidates(value.candidates, input?.maxCandidates).map((candidate) => ({
            ...candidate,
            source: 'openai_weekly_web_research',
            requiresCurrentSources: true,
            gscRelevance: calculateGscTopicRelevance(candidate, input?.searchConsoleSignals)
          })),
          sourceReferences: extractWebSources(response)
        };
      },
      promptVersion: weeklyTopicResearchPromptVersion
    });
  }

  async function retrieveWeeklyTopicPoolSources(responseId) {
    const normalizedResponseId = normalizeResponseId(responseId);
    if (!normalizedResponseId || normalizedResponseId !== responseId) {
      throw new TypeError('Die OpenAI-Response-ID für die Wochenrecherche ist ungültig.');
    }
    const response = await openai.responses.retrieve(normalizedResponseId, {
      include: ['web_search_call.action.sources']
    });
    assertCompletedResponse(response);
    return extractWebSources(response);
  }

  async function researchCurrentSources(input) {
    const prompt = buildWebResearchPrompt(input);
    const response = await openai.responses.create({
      model: config.contentModel,
      input: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      tools: [{ type: 'web_search' }]
    });
    assertCompletedResponse(response);
    const sources = extractWebSources(response);
    if (sources.length < 2) {
      throw new Error('Aktuelle Quellen reichen für einen Artikel nicht aus.');
    }
    return {
      value: sources,
      responseId: response.id,
      usage: response.usage || {},
      promptVersion: webResearchPromptVersion
    };
  }

  async function researchExistingPostSources(input) {
    const prompt = buildExistingPostSourceResearchPrompt(input);
    const format = zodTextFormat(
      ExistingPostSourceResearchSchema,
      'existing_post_source_research'
    );
    schemaCompatibilityValidator(format.schema);
    const response = await openai.responses.parse({
      model: config.contentModel,
      input: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      tools: [{ type: 'web_search' }],
      tool_choice: 'required',
      include: ['web_search_call.action.sources'],
      text: { format }
    });
    assertCompletedResponse(response);
    const parsed = ExistingPostSourceResearchSchema.safeParse(response.output_parsed);
    if (!parsed.success) {
      throw new OpenAIContentResponseError({
        code: 'OPENAI_STRUCTURED_OUTPUT_INVALID',
        responseId: response.id,
        message: 'OpenAI lieferte für die Bestandsquellen kein schemakonformes strukturiertes Ergebnis.'
      });
    }
    return {
      value: groundedStructuredSources(parsed.data.sources, response),
      responseId: response.id,
      usage: response.usage || {},
      promptVersion: existingPostSourceResearchPromptVersion,
      webSearchCallCount: (Array.isArray(response.output) ? response.output : [])
        .filter((item) => item?.type === 'web_search_call')
        .length
    };
  }

  async function optimizeExistingPost(input) {
    const prompt = buildExistingPostOptimizationPrompt(input);
    const originalPost = input?.post && typeof input.post === 'object' ? input.post : {};
    const originalFormat = originalPost.contentFormat ?? originalPost.content_format;
    const originalHtml = originalPost.contentHtml ?? originalPost.content;
    const legacyInput = { contentFormat: originalFormat, contentHtml: originalHtml };
    const preserveLegacyBytes = requiresLegacyBytePreservation(legacyInput);
    const legacyStaticHtml = isLegacyStaticHtml(legacyInput);
    const result = await createStructuredResponse({
      model: config.contentModel,
      schema: preserveLegacyBytes
        ? LegacyExistingPostOptimizationOutputSchema
        : ExistingPostOptimizationOutputSchema,
      schemaName: preserveLegacyBytes
        ? 'existing_post_legacy_targeted_optimization'
        : legacyStaticHtml
          ? 'existing_post_legacy_static_targeted_optimization'
        : 'existing_post_targeted_optimization',
      system: prompt.system,
      user: prompt.user,
      promptVersion: existingPostOptimizationPromptVersion
    });

    if (!preserveLegacyBytes) return result;
    return {
      ...result,
      value: {
        ...result.value,
        contentHtml: originalHtml
      }
    };
  }

  async function createSeoBrief(input) {
    const prompt = buildSeoBriefPrompt(input);
    return parse({
      model: config.contentModel,
      schema: SeoBriefSchema,
      schemaName: 'seo_brief',
      ...prompt,
      promptVersion: seoBriefPromptVersion
    });
  }

  async function generateArticle(input) {
    const prompt = buildArticleWriterPrompt(input);
    return parse({
      model: config.contentModel,
      schema: ArticleOutputSchema,
      schemaName: 'article',
      ...prompt,
      promptVersion: articleWriterPromptVersion
    });
  }

  async function reviewArticle(input) {
    const prompt = buildArticleReviewerPrompt(input);
    const result = await parse({
      model: config.reviewModel,
      schema: ReviewOutputSchema,
      schemaName: 'article_review',
      ...prompt,
      promptVersion: articleReviewerPromptVersion
    });
    return { ...result, value: normalizeEditorialReview(result.value, input) };
  }

  async function repairArticle(input) {
    const prompt = buildArticleRepairPrompt(input);
    return parse({
      model: config.contentModel,
      schema: ArticleOutputSchema,
      schemaName: 'repaired_article',
      ...prompt,
      promptVersion: articleRepairPromptVersion
    });
  }

  async function classifyLearningIssues(input) {
    const prompt = buildContentLearningClassifierPrompt(input);
    return parse({
      model: config.reviewModel,
      schema: LearningClassificationBatchSchema,
      schemaName: 'content_learning_classification',
      ...prompt,
      promptVersion: contentLearningClassifierPromptVersion
    });
  }

  async function explainArticlePerformance({ system, user }) {
    return parse({
      model: config.reviewModel,
      schema: ArticlePerformanceExplanationSchema,
      schemaName: 'article_performance_explanation',
      system,
      user,
      promptVersion: 'article-performance-explanation-v1'
    });
  }

  return {
    createTopicCandidates,
    createWeeklyTopicPool,
    retrieveWeeklyTopicPoolSources,
    researchCurrentSources,
    researchExistingPostSources,
    optimizeExistingPost,
    createSeoBrief,
    generateArticle,
    reviewArticle,
    repairArticle,
    classifyLearningIssues,
    explainArticlePerformance
  };
}
