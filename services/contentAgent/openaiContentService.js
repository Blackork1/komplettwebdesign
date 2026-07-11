import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  ArticleOutputSchema,
  ReviewOutputSchema,
  SeoBriefSchema,
  TopicCandidatesSchema
} from './articleSchemas.js';
import {
  buildTopicResearchPrompt,
  promptVersion as topicResearchPromptVersion
} from './prompts/topicResearchPrompt.js';
import {
  buildWebResearchPrompt,
  promptVersion as webResearchPromptVersion
} from './prompts/webResearchPrompt.js';
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

export class OpenAIContentResponseError extends Error {
  constructor({ code, responseId, message }) {
    const safeResponseId = typeof responseId === 'string'
      ? responseId.replace(/[\r\n]/g, '').slice(0, 128)
      : null;
    super(`${message} Response-ID: ${safeResponseId || 'unbekannt'}.`);
    this.name = 'OpenAIContentResponseError';
    this.code = code;
    this.responseId = safeResponseId;
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeHttpsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function copyAnnotationField(target, annotation, camelName, snakeName) {
  if (target[camelName]) return;
  const value = normalizeText(annotation[camelName] ?? annotation[snakeName]);
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

export function extractWebSources(response) {
  const sources = [];
  const sourcesByUrl = new Map();

  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;

    for (const block of item.content) {
      for (const rawAnnotation of Array.isArray(block?.annotations) ? block.annotations : []) {
        if (rawAnnotation?.type !== 'url_citation') continue;
        const annotation = rawAnnotation.url_citation && typeof rawAnnotation.url_citation === 'object'
          ? { ...rawAnnotation, ...rawAnnotation.url_citation }
          : rawAnnotation;
        const url = normalizeHttpsUrl(annotation.url);
        if (!url) continue;

        let source = sourcesByUrl.get(url);
        if (!source) {
          if (sources.length === 6) continue;
          source = { url };
          sourcesByUrl.set(url, source);
          sources.push(source);
        }
        const title = normalizeText(annotation.title);
        if (title && !source.title) source.title = title;
        copyAnnotationField(source, annotation, 'publisher', 'publisher');
        copyAnnotationField(source, annotation, 'publishedAt', 'published_at');
        copyAnnotationField(source, annotation, 'retrievedAt', 'retrieved_at');
      }
    }
  }

  return sources;
}

export function createOpenAIContentService({ apiKey, config, client = null }) {
  const openai = client || new OpenAI({ apiKey });

  async function parse({ model, schema, schemaName, system, user, promptVersion }) {
    const response = await openai.responses.parse({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      text: { format: zodTextFormat(schema, schemaName) }
    });
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
    return parse({
      model: config.reviewModel,
      schema: ReviewOutputSchema,
      schemaName: 'article_review',
      ...prompt,
      promptVersion: articleReviewerPromptVersion
    });
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

  return {
    createTopicCandidates,
    researchCurrentSources,
    createSeoBrief,
    generateArticle,
    reviewArticle,
    repairArticle
  };
}
