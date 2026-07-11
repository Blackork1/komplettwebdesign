import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOpenAIContentService,
  extractWebSources
} from '../services/contentAgent/openaiContentService.js';

const config = {
  contentModel: 'gpt-5.4',
  reviewModel: 'gpt-5.4-mini'
};

function createParseClient(outputParsed = { result: true }) {
  const requests = [];
  return {
    requests,
    responses: {
      async parse(request) {
        requests.push(request);
        return {
          id: `response-${requests.length}`,
          output_parsed: outputParsed,
          usage: { input_tokens: 12, output_tokens: 7 }
        };
      }
    }
  };
}

test('createTopicCandidates nutzt Content-Modell, strukturiertes Schema und versionierten Themenprompt', async () => {
  const value = { candidates: [{ topic: 'Lokales Webdesign' }] };
  const client = createParseClient(value);
  const service = createOpenAIContentService({ config, client });

  const result = await service.createTopicCandidates({ seedTopics: ['Webdesign Berlin'] });

  assert.deepEqual(result, {
    value,
    responseId: 'response-1',
    usage: { input_tokens: 12, output_tokens: 7 },
    promptVersion: '2026-07-10.1'
  });
  assert.equal(client.requests[0].model, config.contentModel);
  assert.equal(client.requests[0].text.format.type, 'json_schema');
  assert.equal(client.requests[0].text.format.name, 'topic_candidates');
  assert.match(client.requests[0].input[0].content, /professionellen Du-Ton/);
  assert.match(client.requests[0].input[0].content, /korrekte Umlaute/);
  assert.match(client.requests[0].input[0].content, /keine statischen Preise/i);
});

test('die strukturierten Operationen wählen jeweils passendes Schema, Prompt und Modell', async () => {
  const client = createParseClient({ ok: true });
  const service = createOpenAIContentService({ config, client });

  await service.createSeoBrief({ topic: 'Barrierefreie Websites' });
  await service.generateArticle({ briefing: { topic: 'Barrierefreie Websites' } });
  await service.reviewArticle({ article: { title: 'Beispiel' } });
  await service.repairArticle({
    briefing: { topic: 'Barrierefreie Websites' },
    article: { title: 'Beispiel' },
    issues: [{ code: 'missing-faq', repairInstruction: 'FAQ ergänzen' }],
    secretContext: 'darf nicht in den Reparaturprompt'
  });

  assert.deepEqual(client.requests.map(({ model }) => model), [
    config.contentModel,
    config.contentModel,
    config.reviewModel,
    config.contentModel
  ]);
  assert.deepEqual(client.requests.map(({ text }) => text.format.name), [
    'seo_brief',
    'article',
    'article_review',
    'repaired_article'
  ]);

  for (const request of client.requests) {
    const system = request.input[0].content;
    assert.match(system, /Deutsch/);
    assert.match(system, /professionellen Du-Ton/);
    assert.match(system, /statischen Preise/i);
    assert.match(system, /freigegebenen internen Links/i);
    assert.match(system, /statisches Bootstrap-HTML/i);
    assert.match(system, /ohne H1/i);
    assert.match(system, /äußeren Container/i);
    assert.match(system, /EJS/i);
    assert.match(system, /Skripte/i);
    assert.match(system, /Bilder/i);
    assert.match(system, /genau drei/i);
    assert.match(system, /fünf bis sieben/i);
  }

  assert.deepEqual(JSON.parse(client.requests[3].input[1].content), {
    briefing: { topic: 'Barrierefreie Websites' },
    article: { title: 'Beispiel' },
    issues: [{ code: 'missing-faq', repairInstruction: 'FAQ ergänzen' }]
  });
});

test('fehlendes output_parsed führt zu einem klaren Fehler', async () => {
  const client = {
    responses: {
      async parse() {
        return { id: 'response-empty', output_parsed: null };
      }
    }
  };
  const service = createOpenAIContentService({ config, client });

  await assert.rejects(
    service.createSeoBrief({ topic: 'Test' }),
    /OpenAI lieferte kein strukturiertes Ergebnis\./
  );
});

test('researchCurrentSources nutzt Websuche und normalisiert belastbare HTTPS-Quellen', async () => {
  const requests = [];
  const client = {
    responses: {
      async create(request) {
        requests.push(request);
        return {
          id: 'web-response-1',
          usage: { input_tokens: 20, output_tokens: 10 },
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  annotations: [
                    {
                      type: 'url_citation',
                      url: ' https://example.com/leitfaden#abschnitt ',
                      title: '  Offizieller   Leitfaden  ',
                      publisher: 'Beispiel Behörde',
                      published_at: '2026-07-01'
                    },
                    {
                      type: 'url_citation',
                      url: 'https://docs.example.org/update',
                      title: 'Produkt-Update',
                      publisher: 'Beispiel Dokumentation',
                      publishedAt: '2026-07-02',
                      retrievedAt: '2026-07-11'
                    }
                  ]
                }
              ]
            }
          ]
        };
      }
    }
  };
  const service = createOpenAIContentService({ config, client });

  const result = await service.researchCurrentSources({ topic: 'Aktuelles Webthema' });

  assert.equal(requests[0].model, config.contentModel);
  assert.deepEqual(requests[0].tools, [{ type: 'web_search' }]);
  assert.match(requests[0].input[0].content, /zwei bis sechs/i);
  assert.deepEqual(result, {
    value: [
      {
        title: 'Offizieller Leitfaden',
        url: 'https://example.com/leitfaden',
        publisher: 'Beispiel Behörde',
        publishedAt: '2026-07-01'
      },
      {
        title: 'Produkt-Update',
        url: 'https://docs.example.org/update',
        publisher: 'Beispiel Dokumentation',
        publishedAt: '2026-07-02',
        retrievedAt: '2026-07-11'
      }
    ],
    responseId: 'web-response-1',
    usage: { input_tokens: 20, output_tokens: 10 },
    promptVersion: '2026-07-10.1'
  });
});

test('extractWebSources liest alle Message-Contentblöcke, dedupliziert und verwirft unsichere URLs', () => {
  const response = {
    output: [
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            annotations: [
              { type: 'url_citation', url: 'https://example.com/a', title: ' Quelle A ' },
              { type: 'url_citation', url: 'http://example.com/b', title: 'Quelle B' }
            ]
          },
          {
            type: 'output_text',
            annotations: [
              { type: 'url_citation', url: 'https://example.com/a#doppelt', title: 'Quelle   A' },
              { type: 'url_citation', url: 'https://example.com/c', title: 'Quelle C' }
            ]
          }
        ]
      },
      {
        type: 'web_search_call',
        annotations: [
          { type: 'url_citation', url: 'https://ignored.example', title: 'Kein Message-Inhalt' }
        ]
      }
    ]
  };

  assert.deepEqual(extractWebSources(response), [
    { title: 'Quelle A', url: 'https://example.com/a' },
    { title: 'Quelle C', url: 'https://example.com/c' }
  ]);
});

test('extractWebSources ergänzt vorhandene Metadaten aus späteren Duplikatannotationen', () => {
  const response = {
    output: [{
      type: 'message',
      content: [{
        type: 'output_text',
        annotations: [
          { type: 'url_citation', url: 'https://example.com/quelle' },
          {
            type: 'url_citation',
            url: 'https://example.com/quelle#details',
            title: 'Offizielle Quelle',
            publisher: 'Beispiel-Institution',
            published_at: '2026-07-03'
          }
        ]
      }]
    }]
  };

  assert.deepEqual(extractWebSources(response), [{
    url: 'https://example.com/quelle',
    title: 'Offizielle Quelle',
    publisher: 'Beispiel-Institution',
    publishedAt: '2026-07-03'
  }]);
});

test('researchCurrentSources lehnt weniger als zwei belastbare Quellen ab', async () => {
  const client = {
    responses: {
      async create() {
        return {
          output: [{
            type: 'message',
            content: [{
              type: 'output_text',
              annotations: [{ type: 'url_citation', url: 'https://example.com/einzeln', title: 'Einzelquelle' }]
            }]
          }]
        };
      }
    }
  };
  const service = createOpenAIContentService({ config, client });

  await assert.rejects(
    service.researchCurrentSources({ topic: 'Nicht ausreichend belegt' }),
    /Aktuelle Quellen reichen für einen Artikel nicht aus\./
  );
});
