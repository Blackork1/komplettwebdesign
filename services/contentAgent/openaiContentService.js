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
    if (!response.output_parsed) {
      throw new Error('OpenAI lieferte kein strukturiertes Ergebnis.');
    }
    return {
      value: response.output_parsed,
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
