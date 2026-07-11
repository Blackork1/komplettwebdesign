import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOpenAIContentService,
  extractWebSources
} from '../services/contentAgent/openaiContentService.js';
import { buildTopicResearchPrompt } from '../services/contentAgent/prompts/topicResearchPrompt.js';
import { buildWebResearchPrompt } from '../services/contentAgent/prompts/webResearchPrompt.js';
import { buildSeoBriefPrompt } from '../services/contentAgent/prompts/seoBriefPrompt.js';
import { buildArticleWriterPrompt } from '../services/contentAgent/prompts/articleWriterPrompt.js';
import { buildArticleReviewerPrompt } from '../services/contentAgent/prompts/articleReviewerPrompt.js';

const config = {
  contentModel: 'gpt-5.4',
  reviewModel: 'gpt-5.4-mini'
};

const validRisk = {
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
};

const validTopicCandidate = {
  topic: 'Barrierefreie Websites für lokale Unternehmen',
  suggestedTitle: 'Barrierefreie Websites für lokale Unternehmen planen',
  slug: 'barrierefreie-websites-lokale-unternehmen',
  primaryKeyword: 'barrierefreie Website',
  secondaryKeywords: ['barrierefreies Webdesign'],
  contentCluster: 'Webdesign für kleine Unternehmen',
  searchIntent: 'informational-commercial',
  targetAudience: 'Lokale Unternehmen in Berlin',
  source: 'seed',
  readerProblem: 'Die Anforderungen an eine zugängliche Website sind unklar.',
  concreteReaderBenefit: 'Leser erhalten eine umsetzbare Prioritätenliste.',
  businessGoal: 'Qualifizierte Beratungsanfragen',
  ctaType: 'contact',
  requiresCurrentSources: true,
  businessValue: 8,
  searchOpportunity: 8,
  problemPurchaseProximity: 7,
  internalLinkPotential: 8,
  clusterFit: 9,
  localRelevance: 7,
  cannibalizationRisk: 2
};

const sourceReferences = [
  { title: 'Offizielle Quelle A', url: 'https://example.com/quelle-a' },
  { title: 'Offizielle Quelle B', url: 'https://example.org/quelle-b' }
];

const validSeoBrief = {
  topic: validTopicCandidate.topic,
  workingTitle: validTopicCandidate.suggestedTitle,
  primaryKeyword: validTopicCandidate.primaryKeyword,
  secondaryKeywords: validTopicCandidate.secondaryKeywords,
  searchIntent: validTopicCandidate.searchIntent,
  targetAudience: validTopicCandidate.targetAudience,
  readerProblem: validTopicCandidate.readerProblem,
  contentCluster: validTopicCandidate.contentCluster,
  businessGoal: validTopicCandidate.businessGoal,
  ctaType: validTopicCandidate.ctaType,
  targetWordCount: 1800,
  outline: Array.from({ length: 5 }, (_, index) => ({
    heading: `Abschnitt ${index + 1}`,
    level: index === 0 ? 'h2' : 'h3',
    purpose: `Konkreter Zweck ${index + 1}`
  })),
  localExamples: ['Ein lokaler Betrieb aus Berlin'],
  internalLinks: [
    { url: '/kontakt', label: 'Beratung anfragen', purpose: 'Abschluss-CTA' },
    { url: '/website-tester', label: 'Website prüfen', purpose: 'Selbsttest' }
  ],
  faqQuestions: Array.from({ length: 5 }, (_, index) => `Konkrete Frage ${index + 1}?`),
  sourceRequirements: {
    requiresCurrentSources: true,
    requiredTopics: ['Aktuelle Anforderungen']
  },
  sourceReferences,
  imageIdea: {
    prompt: 'Professionelle Arbeitsszene bei der Prüfung einer zugänglichen Website',
    altText: 'Unternehmerin prüft die Zugänglichkeit ihrer Website',
    filename: 'barrierefreie-website-pruefen.webp'
  }
};

const validArticle = {
  title: validSeoBrief.workingTitle,
  shortDescription: 'Ein praxisnaher Leitfaden für zugängliche Unternehmenswebsites.',
  metaTitle: 'Barrierefreie Website für lokale Unternehmen planen',
  metaDescription: 'Erfahre, wie du eine zugängliche Unternehmenswebsite strukturiert planst und wichtige Anforderungen nachvollziehbar priorisierst.',
  ogTitle: 'Barrierefreie Unternehmenswebsite planen',
  ogDescription: 'Konkrete Schritte für eine zugängliche und verständliche Unternehmenswebsite.',
  slug: validTopicCandidate.slug,
  contentHtml: `<section><h2>Einleitung</h2><p>${'Konkreter hilfreicher Inhalt. '.repeat(190)}</p></section>`,
  faqJson: Array.from({ length: 5 }, (_, index) => ({
    question: `Konkrete Frage ${index + 1}?`,
    answer: `Konkrete Antwort ${index + 1}.`
  })),
  category: 'Webdesign',
  imagePrompt: validSeoBrief.imageIdea.prompt,
  imageAlt: validSeoBrief.imageIdea.altText,
  imageFilename: validSeoBrief.imageIdea.filename,
  seo: {
    primaryKeyword: validSeoBrief.primaryKeyword,
    secondaryKeywords: validSeoBrief.secondaryKeywords,
    searchIntent: validSeoBrief.searchIntent,
    targetAudience: validSeoBrief.targetAudience,
    contentCluster: validSeoBrief.contentCluster
  },
  lead: {
    businessGoal: validSeoBrief.businessGoal,
    ctaType: validSeoBrief.ctaType,
    ctaPositions: ['blog_early', 'blog_mid', 'blog_final']
  },
  sourceReferences,
  risk: validRisk,
  qualitySelfCheck: {
    searchIntentFulfilled: true,
    noH1: true,
    noOuterBootstrapContainer: true,
    noInventedPricesOrServices: true,
    faqMatchesHtml: true,
    approvedLinksOnly: true
  }
};

const validReview = {
  passed: true,
  score: 92,
  summary: 'Der Artikel erfüllt Briefing und Suchintention.',
  strengths: ['Klare Handlungsschritte'],
  issues: [],
  recommendedActions: [],
  requiresManualReview: false,
  risks: validRisk
};

function createParseClient(outputParsed) {
  const requests = [];
  const outputs = Array.isArray(outputParsed) ? outputParsed : [outputParsed];
  return {
    requests,
    responses: {
      async parse(request) {
        requests.push(request);
        return {
          id: `response-${requests.length}`,
          status: 'completed',
          output_parsed: outputs[requests.length - 1] ?? outputs.at(-1),
          usage: { input_tokens: 12, output_tokens: 7 }
        };
      }
    }
  };
}

test('createTopicCandidates nutzt Content-Modell, strukturiertes Schema und versionierten Themenprompt', async () => {
  const value = { candidates: [validTopicCandidate] };
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
  const client = createParseClient([validSeoBrief, validArticle, validReview, validArticle]);
  const service = createOpenAIContentService({ config, client });

  await service.createSeoBrief({ topic: validTopicCandidate, sourceReferences });
  await service.generateArticle({ briefing: validSeoBrief });
  await service.reviewArticle({ briefing: validSeoBrief, article: validArticle, sourceReferences });
  await service.repairArticle({
    briefing: validSeoBrief,
    article: validArticle,
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
    briefing: validSeoBrief,
    article: validArticle,
    issues: [{ code: 'missing-faq', repairInstruction: 'FAQ ergänzen' }]
  });
});

test('fehlendes output_parsed führt zu einem klaren Fehler', async () => {
  const client = {
    responses: {
      async parse() {
        return { id: 'response-empty', status: 'completed', output_parsed: null };
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
          status: 'completed',
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

test('Promptbuilder serialisieren ausschließlich ihre fachlichen Allowlist-Felder', () => {
  const cases = [
    {
      build: buildTopicResearchPrompt,
      input: { inventory: ['Seite'], seedTopics: ['Thema'], maxCandidates: 4, secret: 'intern' },
      expected: { inventory: ['Seite'], seedTopics: ['Thema'], maxCandidates: 4 }
    },
    {
      build: buildWebResearchPrompt,
      input: {
        topic: 'Aktuelles Thema',
        primaryKeyword: 'Keyword',
        currentDate: '2026-07-11',
        regionFocus: 'Berlin',
        adminNotes: 'intern'
      },
      expected: {
        topic: 'Aktuelles Thema',
        primaryKeyword: 'Keyword',
        currentDate: '2026-07-11',
        regionFocus: 'Berlin'
      }
    },
    {
      build: buildSeoBriefPrompt,
      input: {
        topic: validTopicCandidate,
        inventory: ['Seite'],
        internalLinks: ['/kontakt'],
        sourceReferences,
        pricingContext: { token: '{{price}}' },
        secret: 'intern'
      },
      expected: {
        topic: validTopicCandidate,
        inventory: ['Seite'],
        internalLinks: ['/kontakt'],
        sourceReferences,
        pricingContext: { token: '{{price}}' }
      }
    },
    {
      build: buildArticleWriterPrompt,
      input: { briefing: validSeoBrief, pricingContext: { token: '{{price}}' }, sourceReferences, adminNotes: 'intern' },
      expected: { briefing: validSeoBrief, pricingContext: { token: '{{price}}' } }
    },
    {
      build: buildArticleReviewerPrompt,
      input: { briefing: validSeoBrief, article: validArticle, sourceReferences, secret: 'intern' },
      expected: { briefing: validSeoBrief, article: validArticle, sourceReferences }
    }
  ];

  for (const { build, input, expected } of cases) {
    assert.deepEqual(JSON.parse(build(input).user), expected);
  }
});

test('Promptbuilder lassen fehlende optionale Allowlist-Felder weg', () => {
  assert.deepEqual(JSON.parse(buildTopicResearchPrompt({ seedTopics: ['Thema'] }).user), {
    seedTopics: ['Thema']
  });
  assert.deepEqual(JSON.parse(buildArticleWriterPrompt({ briefing: validSeoBrief }).user), {
    briefing: validSeoBrief
  });
});

function completedWebResponse(overrides = {}) {
  return {
    id: 'web-response-status',
    status: 'completed',
    output: [{
      type: 'message',
      content: [{
        type: 'output_text',
        annotations: sourceReferences.map((source) => ({ type: 'url_citation', ...source }))
      }]
    }],
    ...overrides
  };
}

test('researchCurrentSources lehnt fehlgeschlagene und unvollständige Responses trotz Citations sicher ab', async () => {
  for (const response of [
    completedWebResponse({ status: 'failed' }),
    completedWebResponse({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } })
  ]) {
    const service = createOpenAIContentService({
      config,
      client: { responses: { async create() { return response; } } }
    });

    await assert.rejects(
      service.researchCurrentSources({ topic: 'Aktuelles Thema' }),
      (error) => {
        assert.equal(error.responseId, 'web-response-status');
        assert.match(error.code, /^OPENAI_RESPONSE_/);
        assert.doesNotMatch(error.message, /max_output_tokens/);
        return true;
      }
    );
  }
});

test('researchCurrentSources lehnt Refusal-Content trotz Citations ohne Refusal-Leak ab', async () => {
  const sensitiveRefusal = 'Interner Refusal-Text darf nicht in Fehler oder Logs.';
  const response = completedWebResponse({
    output: [{
      type: 'message',
      content: [
        { type: 'refusal', refusal: sensitiveRefusal },
        {
          type: 'output_text',
          annotations: sourceReferences.map((source) => ({ type: 'url_citation', ...source }))
        }
      ]
    }]
  });
  const service = createOpenAIContentService({
    config,
    client: { responses: { async create() { return response; } } }
  });

  await assert.rejects(
    service.researchCurrentSources({ topic: 'Aktuelles Thema' }),
    (error) => {
      assert.equal(error.code, 'OPENAI_RESPONSE_REFUSED');
      assert.equal(error.responseId, 'web-response-status');
      assert.doesNotMatch(error.message, new RegExp(sensitiveRefusal));
      return true;
    }
  );
});

test('strukturierte Doubles werden vor der Rückgabe gegen das zugeordnete Zod-Schema validiert', async () => {
  const service = createOpenAIContentService({
    config,
    client: createParseClient({ candidates: [{ topic: 'Unvollständig' }] })
  });

  await assert.rejects(
    service.createTopicCandidates({ seedTopics: ['Thema'] }),
    (error) => {
      assert.equal(error.code, 'OPENAI_STRUCTURED_OUTPUT_INVALID');
      assert.equal(error.responseId, 'response-1');
      return true;
    }
  );
});

test('researchCurrentSources lehnt weniger als zwei belastbare Quellen ab', async () => {
  const client = {
    responses: {
      async create() {
        return {
          id: 'web-response-insufficient',
          status: 'completed',
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
