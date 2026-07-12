import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTechnicalConfigPresentation,
  getContentAgentConfig,
  getContentAgentTechnicalConfig
} from '../services/contentAgent/config.js';
import {
  ArticleOutputSchema,
  ReviewOutputSchema,
  RiskSchema,
  SeoBriefSchema,
  SourceReferenceSchema,
  TopicCandidatesSchema
} from '../services/contentAgent/articleSchemas.js';
import { CONTENT_AGENT_LINKS } from '../data/contentAgentLinks.js';
import { CONTENT_AGENT_PROFILE } from '../data/contentAgentProfile.js';

const validRisk = {
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
};

const validTopicCandidate = {
  topic: 'Mehr Anfragen über eine lokale Unternehmenswebsite',
  suggestedTitle: 'Wie eine lokale Unternehmenswebsite mehr Anfragen gewinnt',
  slug: 'lokale-unternehmenswebsite-mehr-anfragen',
  primaryKeyword: 'lokale Unternehmenswebsite',
  secondaryKeywords: ['Webdesign für kleine Unternehmen'],
  contentCluster: 'Webdesign für kleine Unternehmen',
  searchIntent: 'informational-commercial',
  targetAudience: 'Inhabergeführte lokale Unternehmen in Berlin',
  source: 'seed',
  readerProblem: 'Die Website erzeugt zu wenige qualifizierte Anfragen.',
  concreteReaderBenefit: 'Leser erkennen konkrete Hebel für bessere Kontaktwege.',
  businessGoal: 'Qualifizierte Beratungsanfragen',
  ctaType: 'contact',
  requiresCurrentSources: false,
  businessValue: 9,
  searchOpportunity: 8,
  problemPurchaseProximity: 9,
  internalLinkPotential: 8,
  clusterFit: 8,
  localRelevance: 7,
  cannibalizationRisk: 2
};

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
    purpose: `Konkreter Zweck des Abschnitts ${index + 1}`
  })),
  localExamples: ['Ein lokaler Dienstleister aus Berlin'],
  internalLinks: [
    { url: '/kontakt', label: 'Beratung anfragen', purpose: 'Abschluss-CTA' },
    { url: '/website-tester', label: 'Website kostenlos prüfen', purpose: 'Direkter Selbsttest' }
  ],
  faqQuestions: Array.from({ length: 5 }, (_, index) => `Konkrete FAQ-Frage ${index + 1}?`),
  sourceRequirements: {
    requiresCurrentSources: false,
    requiredTopics: []
  },
  imageIdea: {
    prompt: 'Professionelle Arbeitsszene mit einer lokalen Unternehmerin und einer Website-Analyse',
    altText: 'Unternehmerin prüft die Anfragewege ihrer Website',
    filename: 'lokale-unternehmenswebsite-anfragen.webp'
  }
};

const validArticle = {
  title: validSeoBrief.workingTitle,
  shortDescription: 'Ein praxisnaher Leitfaden für bessere Anfragewege auf lokalen Unternehmenswebsites.',
  metaTitle: 'Lokale Unternehmenswebsite: mehr Anfragen gewinnen',
  metaDescription: 'Erfahre, wie klare Inhalte, Kontaktwege und lokale Relevanz deine Unternehmenswebsite zu mehr qualifizierten Anfragen führen.',
  ogTitle: 'Mehr Anfragen über deine lokale Unternehmenswebsite',
  ogDescription: 'Konkrete Schritte für verständliche Inhalte, klare Kontaktwege und eine überzeugende lokale Website.',
  slug: validTopicCandidate.slug,
  contentHtml: `<section><h2>Einleitung</h2><p>${'Konkreter hilfreicher Inhalt. '.repeat(190)}</p></section>`,
  faqJson: Array.from({ length: 5 }, (_, index) => ({
    question: `Konkrete FAQ-Frage ${index + 1}?`,
    answer: `Konkrete und verständliche Antwort ${index + 1}.`
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
  sourceReferences: [],
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
  summary: 'Der Artikel beantwortet die Suchintention konkret und nachvollziehbar.',
  strengths: ['Klare Handlungsschritte', 'Passender Zielgruppenbezug'],
  issues: [],
  recommendedActions: [],
  requiresManualReview: false,
  risks: validRisk
};

const validReviewIssue = {
  code: 'generic_language',
  severity: 'warning',
  message: 'Ein Abschnitt bleibt zu allgemein.',
  repairInstruction: 'Ergänze ein konkretes Beispiel für einen lokalen Betrieb.',
  blocking: false
};

test('config defaults to drafts in Europe Berlin', () => {
  const config = getContentAgentConfig({});
  assert.equal(config.publishMode, 'draft');
  assert.equal(config.timezone, 'Europe/Berlin');
  assert.equal(config.maxTopicCandidates, 8);
  assert.equal(config.autoPublishEnabled, false);
  assert.equal(config.monthlyCostLimitEur, 25);
  assert.equal(config.contentStageReservationEur, 0.5);
  assert.equal(config.reviewStageReservationEur, 0.25);
  assert.equal(Object.isFrozen(config), true);
});

test('config parses overrides and clamps bounded integers', () => {
  const config = getContentAgentConfig({
    CONTENT_AGENT_ENABLED: 'TRUE',
    CONTENT_AGENT_PUBLISH_MODE: 'auto',
    CONTENT_AGENT_MAX_TOPIC_CANDIDATES: '99',
    CONTENT_AGENT_MAX_REVISIONS: '-2',
    CONTENT_AGENT_WORKER_POLL_MS: '250',
    CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR: '-1',
    CONTENT_AGENT_CONTENT_STAGE_RESERVATION_EUR: '0.75',
    CONTENT_AGENT_REVIEW_STAGE_RESERVATION_EUR: '0.30'
  });

  assert.equal(config.enabled, true);
  assert.equal(config.publishMode, 'auto');
  assert.equal(config.maxTopicCandidates, 20);
  assert.equal(config.maxRevisions, 0);
  assert.equal(config.workerPollMs, 1000);
  assert.equal(config.monthlyCostLimitEur, 25);
  assert.equal(config.contentStageReservationEur, 0.75);
  assert.equal(config.reviewStageReservationEur, 0.30);
});

test('technische Konfiguration bleibt über den bisherigen Dry-Run-Alias kompatibel', () => {
  const env = {
    CONTENT_AGENT_ENABLED: 'true',
    CONTENT_AGENT_AUTOPUBLISH_ENABLED: 'true',
    CONTENT_AGENT_MAX_ATTEMPTS: '4',
    CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR: '80'
  };

  assert.deepEqual(getContentAgentConfig(env), getContentAgentTechnicalConfig(env));
});

test('technische Präsentation ist schreibgeschützt und enthält niemals Secrets', () => {
  const presentation = buildTechnicalConfigPresentation({
    technicalConfig: {
      ...getContentAgentTechnicalConfig({
        OPENAI_CONTENT_MODEL: 'content-model',
        OPENAI_REVIEW_MODEL: 'review-model',
        OPENAI_IMAGE_MODEL: 'image-model',
        OPENAI_CONTENT_INPUT_COST_PER_MTOK: '2.50',
        CONTENT_AGENT_WORKER_POLL_MS: '7000',
        CONTENT_AGENT_JOB_LEASE_MINUTES: '45'
      }),
      openaiApiKey: 'sk-geheim',
      databaseUrl: 'postgres://geheim'
    }
  });

  assert.equal(presentation.contentModel.value, 'content-model');
  assert.equal(presentation.contentInputCostPerMtok.value, 2.5);
  assert.equal(presentation.workerPollMs.value, 7000);
  assert.equal(presentation.jobLeaseMinutes.value, 45);
  assert.equal(presentation.monthlyCostLimitEur.editable, false);
  assert.equal(presentation.maxAttempts.source, '.env');
  assert.equal(presentation.autoPublishEnabled.restartRequired, true);
  const serialized = JSON.stringify(presentation);
  assert.doesNotMatch(serialized, /sk-geheim|postgres:\/\/geheim|openaiApiKey|databaseUrl/i);
});

test('Providerkonfiguration wird ausschließlich als Boolescher Zustand dargestellt', () => {
  const config = getContentAgentTechnicalConfig({
    OPENAI_API_KEY: 'sk-geheim',
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret'
  });
  assert.equal(config.openaiConfigured, true);
  assert.equal(config.cloudinaryConfigured, true);
  const presentation = buildTechnicalConfigPresentation({ technicalConfig: config });
  assert.equal(presentation.openaiConfigured.value, true);
  assert.equal(presentation.cloudinaryConfigured.value, true);
  assert.doesNotMatch(JSON.stringify(presentation), /sk-geheim|"cloud"|"secret"/);
  assert.equal(getContentAgentTechnicalConfig({ CLOUDINARY_CLOUD_NAME: 'cloud' }).cloudinaryConfigured, false);
});

test('mark profile and links expose stable approved context', () => {
  assert.equal(CONTENT_AGENT_PROFILE.brandName, 'Komplett Webdesign');
  assert.equal(CONTENT_AGENT_PROFILE.tone.address, 'Du');
  assert.ok(CONTENT_AGENT_PROFILE.forbiddenPhrases.includes('In der heutigen digitalen Welt'));
  assert.deepEqual(CONTENT_AGENT_LINKS.map(({ url }) => url), [
    '/kontakt',
    '/pakete',
    '/webdesign-berlin',
    '/leistungen/website-relaunch',
    '/leistungen/local-seo',
    '/leistungen/website-audit',
    '/leistungen/landingpage-erstellen-lassen',
    '/website-tester'
  ]);
});

test('topic candidates require strict candidate objects and ASCII slugs', () => {
  assert.equal(TopicCandidatesSchema.safeParse({ candidates: [validTopicCandidate] }).success, true);
  assert.equal(TopicCandidatesSchema.safeParse({ candidates: [{ ...validTopicCandidate, slug: 'für-berlin' }] }).success, false);
  assert.equal(TopicCandidatesSchema.safeParse({ candidates: [{ ...validTopicCandidate, extra: true }] }).success, false);
  assert.equal(TopicCandidatesSchema.safeParse({ candidates: [validTopicCandidate], extra: true }).success, false);
});

test('SEO brief enforces word, outline, internal-link and FAQ boundaries', () => {
  assert.equal(SeoBriefSchema.safeParse(validSeoBrief).success, true);

  for (const invalid of [
    { ...validSeoBrief, targetWordCount: 1199 },
    { ...validSeoBrief, targetWordCount: 3201 },
    { ...validSeoBrief, outline: validSeoBrief.outline.slice(0, 4) },
    { ...validSeoBrief, outline: Array.from({ length: 17 }, () => validSeoBrief.outline[0]) },
    { ...validSeoBrief, internalLinks: validSeoBrief.internalLinks.slice(0, 1) },
    { ...validSeoBrief, internalLinks: Array.from({ length: 9 }, () => validSeoBrief.internalLinks[0]) },
    { ...validSeoBrief, faqQuestions: validSeoBrief.faqQuestions.slice(0, 4) },
    { ...validSeoBrief, faqQuestions: [...validSeoBrief.faqQuestions, 'Frage 6?', 'Frage 7?', 'Frage 8?'] }
  ]) {
    assert.equal(SeoBriefSchema.safeParse(invalid).success, false);
  }
});

test('SEO brief accepts only approved links and rejects unknown nested fields', () => {
  for (const url of ['/nicht-freigegeben', '//kontakt']) {
    const invalid = {
      ...validSeoBrief,
      internalLinks: [
        { ...validSeoBrief.internalLinks[0], url },
        validSeoBrief.internalLinks[1]
      ]
    };
    assert.equal(SeoBriefSchema.safeParse(invalid).success, false);
  }

  assert.equal(SeoBriefSchema.safeParse({
    ...validSeoBrief,
    outline: [{ ...validSeoBrief.outline[0], extra: true }, ...validSeoBrief.outline.slice(1)]
  }).success, false);
});

test('source references akzeptieren echte Minimal-Citations ohne erfundene Metadaten', () => {
  const minimalSource = {
    title: 'Offizielle Dokumentation',
    url: 'https://example.com/dokumentation'
  };

  assert.equal(SourceReferenceSchema.safeParse(minimalSource).success, true);
  assert.deepEqual(SourceReferenceSchema.parse(minimalSource), minimalSource);
});

test('SEO brief führt zwei bis sechs Quellen für aktuelle Themen bis zum Writer mit', () => {
  const currentBrief = {
    ...validSeoBrief,
    sourceRequirements: {
      requiresCurrentSources: true,
      requiredTopics: ['Aktueller Standard']
    }
  };
  const sourceReferences = [
    { title: 'Primärquelle A', url: 'https://example.com/quelle-a' },
    { title: 'Primärquelle B', url: 'https://example.org/quelle-b' }
  ];

  assert.equal(SeoBriefSchema.safeParse(currentBrief).success, false);
  assert.equal(SeoBriefSchema.safeParse({ ...currentBrief, sourceReferences }).success, true);
  assert.equal(SeoBriefSchema.safeParse({ ...currentBrief, sourceReferences: sourceReferences.slice(0, 1) }).success, false);
  assert.equal(SeoBriefSchema.safeParse({
    ...currentBrief,
    sourceReferences: Array.from({ length: 7 }, (_, index) => ({
      title: `Primärquelle ${index + 1}`,
      url: `https://example.com/quelle-${index + 1}`
    }))
  }).success, false);
  assert.equal(SeoBriefSchema.safeParse(validSeoBrief).success, true);
});

test('article output enforces strict objects, ASCII slug, HTML length and FAQ count', () => {
  assert.equal(ArticleOutputSchema.safeParse(validArticle).success, true);
  assert.equal(ArticleOutputSchema.safeParse({ ...validArticle, slug: 'website-für-berlin' }).success, false);
  assert.equal(ArticleOutputSchema.safeParse({ ...validArticle, contentHtml: 'x'.repeat(4999) }).success, false);
  assert.equal(ArticleOutputSchema.safeParse({ ...validArticle, faqJson: validArticle.faqJson.slice(0, 4) }).success, false);
  assert.equal(ArticleOutputSchema.safeParse({ ...validArticle, faqJson: [...validArticle.faqJson, validArticle.faqJson[0], validArticle.faqJson[0], validArticle.faqJson[0]] }).success, false);
  assert.equal(ArticleOutputSchema.safeParse({ ...validArticle, qualitySelfCheck: { ...validArticle.qualitySelfCheck, extra: true } }).success, false);
});

test('article output rejects obvious H1 and outer Bootstrap containers', () => {
  assert.equal(ArticleOutputSchema.safeParse({
    ...validArticle,
    contentHtml: `<h1>Unzulässige Hauptüberschrift</h1>${'x'.repeat(5000)}`
  }).success, false);

  for (const containerClass of ['container', 'container-fluid', 'container-lg']) {
    assert.equal(ArticleOutputSchema.safeParse({
      ...validArticle,
      contentHtml: `<div class="${containerClass}">${'x'.repeat(5000)}</div>`
    }).success, false);
  }
});

test('article output rejects a self-closing H1 element', () => {
  assert.equal(ArticleOutputSchema.safeParse({
    ...validArticle,
    contentHtml: `<h1/>${'x'.repeat(5000)}`
  }).success, false);
});

test('article output ignores comments before an outer Bootstrap container', () => {
  assert.equal(ArticleOutputSchema.safeParse({
    ...validArticle,
    contentHtml: `<!--Kommentar--><div class="container">${'x'.repeat(5000)}</div>`
  }).success, false);
});

test('article output does not mistake data-class for a class attribute', () => {
  assert.equal(ArticleOutputSchema.safeParse({
    ...validArticle,
    contentHtml: `<section data-class="container">${'x'.repeat(5000)}</section>`
  }).success, true);
});

test('article output requires truthful structural self-check flags', () => {
  for (const flag of ['noH1', 'noOuterBootstrapContainer']) {
    assert.equal(ArticleOutputSchema.safeParse({
      ...validArticle,
      qualitySelfCheck: { ...validArticle.qualitySelfCheck, [flag]: false }
    }).success, false);
  }
});

test('risk and review outputs reject missing, mistyped and unknown risk flags', () => {
  assert.equal(RiskSchema.safeParse(validRisk).success, true);
  assert.equal(RiskSchema.safeParse({ ...validRisk, legalClaims: 'false' }).success, false);
  assert.equal(RiskSchema.safeParse({ ...validRisk, staticPrices: undefined }).success, false);
  assert.equal(RiskSchema.safeParse({ ...validRisk, unknownRisk: false }).success, false);
  assert.equal(ReviewOutputSchema.safeParse(validReview).success, true);
  assert.equal(ReviewOutputSchema.safeParse({ ...validReview, score: 101 }).success, false);
  assert.equal(ReviewOutputSchema.safeParse({ ...validReview, extra: true }).success, false);
  assert.equal(ReviewOutputSchema.safeParse({
    ...validReview,
    issues: [{ ...validReviewIssue, extra: true }]
  }).success, false);
});
