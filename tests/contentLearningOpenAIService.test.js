import assert from 'node:assert/strict';
import test from 'node:test';

import { createOpenAIContentService } from '../services/contentAgent/openaiContentService.js';
import { LearningClassificationBatchSchema } from '../services/contentAgent/contentLearningSchemas.js';
import { buildContentLearningClassifierPrompt } from '../services/contentAgent/prompts/contentLearningClassifierPrompt.js';

const fingerprint = 'a'.repeat(64);
const issues = [{
  fingerprint,
  reason: 'Die Zuordnung alter URLs bleibt zu allgemein.',
  instruction: 'Ergänze eine konkrete Erklärung zum URL-Mapping.'
}];

function parseClient(value) {
  const requests = [];
  return {
    requests,
    responses: {
      async parse(request) {
        requests.push(request);
        return {
          id: 'learning-response-1',
          status: 'completed',
          output_parsed: value,
          usage: { input_tokens: 30, output_tokens: 12 }
        };
      }
    }
  };
}

test('Klassifizierungsschema akzeptiert ausschließlich bekannte Kategorien und exakte Fingerabdrücke', () => {
  const valid = {
    classifications: [{
      fingerprint,
      categoryKey: 'technical_precision',
      confidence: 0.91,
      reason: 'Der Hinweis verlangt fachliche Präzisierung.'
    }]
  };
  assert.deepEqual(LearningClassificationBatchSchema.parse(valid), valid);
  assert.equal(LearningClassificationBatchSchema.safeParse({
    classifications: [{ ...valid.classifications[0], categoryKey: 'freie_neue_kategorie' }]
  }).success, false);
  assert.equal(LearningClassificationBatchSchema.safeParse({
    classifications: [{ ...valid.classifications[0], fingerprint: 'kurz' }]
  }).success, false);
  assert.equal(LearningClassificationBatchSchema.safeParse({
    classifications: [{ ...valid.classifications[0], confidence: 1.1 }]
  }).success, false);
  assert.equal(LearningClassificationBatchSchema.safeParse({
    classifications: [{ ...valid.classifications[0], extra: true }]
  }).success, false);
});

test('Lernklassifizierer verwendet nur sichere Felder und die feste Taxonomie', () => {
  const prompt = buildContentLearningClassifierPrompt({
    issues,
    secret: 'darf nicht übertragen werden'
  });
  assert.deepEqual(JSON.parse(prompt.user), { issues });
  assert.match(prompt.system, /ausschließlich eine vorhandene Kategorie/i);
  assert.match(prompt.system, /niemals eine Lernregel aktivieren/i);
  assert.doesNotMatch(prompt.user, /secret|darf nicht übertragen/);
});

test('OpenAI-Service klassifiziert unbekannte Hinweise mit Reviewmodell und Structured Output', async () => {
  const value = {
    classifications: [{
      fingerprint,
      categoryKey: 'technical_precision',
      confidence: 0.91,
      reason: 'Der Hinweis verlangt fachliche Präzisierung.'
    }]
  };
  const client = parseClient(value);
  const service = createOpenAIContentService({
    config: { contentModel: 'gpt-content', reviewModel: 'gpt-review' },
    client
  });
  const result = await service.classifyLearningIssues({ issues });
  assert.deepEqual(result.value, value);
  assert.equal(result.responseId, 'learning-response-1');
  assert.equal(client.requests[0].model, 'gpt-review');
  assert.equal(client.requests[0].text.format.name, 'content_learning_classification');
  assert.match(result.promptVersion, /^2026-07-14\./);
});

test('Provider darf unklare Hinweise ausdrücklich unklassifiziert lassen', () => {
  const parsed = LearningClassificationBatchSchema.parse({
    classifications: [{
      fingerprint,
      categoryKey: 'unclassified',
      confidence: 0.2,
      reason: 'Keine vorhandene Kategorie passt sicher.'
    }]
  });
  assert.equal(parsed.classifications[0].categoryKey, 'unclassified');
});
