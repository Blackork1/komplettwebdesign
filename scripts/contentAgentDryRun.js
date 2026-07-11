import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateArticle } from '../services/contentAgent/articleValidator.js';
import { runDraftPipeline } from '../services/contentAgent/draftPipeline.js';
import { selectBestTopic } from '../services/contentAgent/topicScoringService.js';

const qualityScore = 90;
const MONITORED_OPERATION = Symbol('dryRunMonitoredOperation');

export function createDryRunAdapterMonitor() {
  let externalCalls = 0;
  let simulatedAdapterCalls = 0;

  function operation(fn, { external = false, label = 'adapter' } = {}) {
    if (fn?.[MONITORED_OPERATION]) return fn;
    const monitored = function monitoredOperation(...args) {
      if (external) {
        externalCalls += 1;
        const error = new Error('Externe Aufrufe sind im Dry-Run gesperrt.');
        error.code = 'dry_run_external_call';
        error.adapter = label;
        throw error;
      }
      simulatedAdapterCalls += 1;
      return fn.apply(this, args);
    };
    Object.defineProperty(monitored, MONITORED_OPERATION, { value: true });
    return monitored;
  }

  return {
    get externalCalls() { return externalCalls; },
    get simulatedAdapterCalls() { return simulatedAdapterCalls; },
    operation,
    forbidden(label) {
      return operation(() => undefined, { external: true, label });
    },
    adapter(adapter, label) {
      return Object.fromEntries(Object.entries(adapter).map(([name, value]) => [
        name,
        typeof value === 'function'
          ? operation(value, { label: `${label}.${name}` })
          : value
      ]));
    }
  };
}

const faqJson = Array.from({ length: 5 }, (_, index) => ({
  question: `Wie funktioniert Schritt ${index + 1}?`,
  answer: `Schritt ${index + 1} wird verständlich und konkret erklärt.`
}));

function cta(location) {
  return `<div class="alert alert-primary" data-track="cta" data-cta-name="${location}_contact" data-cta-location="${location}">`
    + '<a class="btn btn-primary" href="/kontakt">Beratung anfragen</a></div>';
}

const contentHtml = [
  '<section class="my-4"><h2>Website-Relaunch strukturiert planen</h2>',
  '<p class="lead">Ein klarer Ablauf hilft Unternehmen bei tragfähigen Entscheidungen.</p>',
  cta('blog_early'),
  '<div class="row"><div class="col-lg-12"><h2>Die wichtigsten Schritte</h2>',
  '<p>Analyse, Ziele, Inhalte und technische Umsetzung werden nachvollziehbar priorisiert.</p></div></div>',
  cta('blog_mid'),
  '<section class="my-5"><h2>Häufige Fragen</h2>',
  ...faqJson.map(({ question, answer }) => (
    `<div class="mb-3" data-faq-question="${question}" data-faq-answer="${answer}">`
      + `<h3>${question}</h3><p>${answer}</p></div>`
  )),
  '</section>',
  cta('blog_final'),
  '</section>'
].join('');

const topic = {
  topic: 'Website-Relaunch für Berliner Unternehmen',
  suggestedTitle: 'Website-Relaunch für Berliner Unternehmen planen',
  slug: 'website-relaunch-berliner-unternehmen',
  primaryKeyword: 'Website-Relaunch Berlin',
  secondaryKeywords: ['Website modernisieren'],
  contentCluster: 'Webdesign',
  searchIntent: 'commercial',
  targetAudience: 'Berliner Unternehmen',
  source: 'dry-run',
  readerProblem: 'Der Relaunch ist schwer zu priorisieren.',
  concreteReaderBenefit: 'Ein klarer Ablauf für die Planung.',
  businessGoal: 'Beratungsanfragen',
  ctaType: 'contact',
  requiresCurrentSources: false,
  businessValue: 9,
  searchOpportunity: 8,
  problemPurchaseProximity: 8,
  internalLinkPotential: 8,
  clusterFit: 9,
  localRelevance: 8,
  cannibalizationRisk: 1
};

const briefing = {
  topic: topic.topic,
  workingTitle: topic.suggestedTitle,
  primaryKeyword: topic.primaryKeyword,
  secondaryKeywords: topic.secondaryKeywords,
  searchIntent: topic.searchIntent,
  targetAudience: topic.targetAudience,
  readerProblem: topic.readerProblem,
  contentCluster: topic.contentCluster,
  businessGoal: topic.businessGoal,
  ctaType: topic.ctaType,
  sourceRequirements: { requiresCurrentSources: false, requiredTopics: [] },
  internalLinks: [{ url: '/kontakt', label: 'Kontakt', purpose: 'CTA' }],
  imageIdea: {
    prompt: 'Authentische Planungsszene in einem Berliner Unternehmen',
    altText: 'Team plant einen Website-Relaunch',
    filename: 'website-relaunch-berlin.webp'
  }
};

const article = {
  title: topic.suggestedTitle,
  shortDescription: 'Praxisnaher Leitfaden für einen strukturierten Website-Relaunch.',
  metaTitle: 'Website-Relaunch für Berliner Unternehmen richtig planen',
  metaDescription: 'Dieser Leitfaden erklärt Berliner Unternehmen verständlich und konkret, wie sie einen Website-Relaunch strukturiert planen und sicher umsetzen.',
  ogTitle: topic.suggestedTitle,
  ogDescription: 'Konkrete Schritte für einen gut geplanten Website-Relaunch.',
  slug: topic.slug,
  contentHtml,
  faqJson,
  category: 'Webdesign',
  imagePrompt: briefing.imageIdea.prompt,
  imageAlt: briefing.imageIdea.altText,
  imageFilename: briefing.imageIdea.filename,
  seo: {
    primaryKeyword: topic.primaryKeyword,
    secondaryKeywords: topic.secondaryKeywords,
    searchIntent: topic.searchIntent,
    targetAudience: topic.targetAudience,
    contentCluster: topic.contentCluster
  },
  lead: { businessGoal: topic.businessGoal, ctaType: topic.ctaType },
  sourceReferences: [],
  risk: {
    currentClaims: false,
    legalClaims: false,
    privacyClaims: false,
    softwareVersionClaims: false,
    staticPrices: false
  }
};

const review = {
  passed: true,
  score: qualityScore,
  summary: 'Freigabefähiger Entwurf.',
  strengths: ['Klare Struktur'],
  issues: [],
  recommendedActions: [],
  requiresManualReview: false,
  risks: { ...article.risk }
};

function localOperation(value, responseId) {
  return async () => ({
    value,
    responseId,
    usage: { input_tokens: 0, output_tokens: 0 },
    promptVersion: 'dry-run.1'
  });
}

function createDryRunDependencies(adapterMonitor, configureAdapters) {
  const stageResults = new Map();
  const dependencies = {
    config: {
      publishMode: 'draft',
      maxTopicCandidates: 1,
      maxRevisions: 0,
      monthlyCostLimitEur: 0,
      contentStageReservationEur: 0,
      reviewStageReservationEur: 0,
      contentInputCostPerMtok: 0,
      contentOutputCostPerMtok: 0,
      reviewInputCostPerMtok: 0,
      reviewOutputCostPerMtok: 0,
      imageCostEur: 0
    },
    inventoryService: {
      async buildSiteInventory() {
        return {
          blogPosts: [],
          guides: [],
          servicePages: [],
          industries: [],
          packages: [],
          approvedLinks: [{ url: '/kontakt' }]
        };
      }
    },
    openaiService: {
      createTopicCandidates: localOperation({ candidates: [topic] }, 'dry-topic'),
      researchCurrentSources: localOperation([], 'dry-sources'),
      createSeoBrief: localOperation(briefing, 'dry-brief'),
      generateArticle: localOperation(article, 'dry-article'),
      reviewArticle: localOperation(review, 'dry-review'),
      repairArticle: localOperation(article, 'dry-repair')
    },
    topicScoringService: { selectBestTopic },
    topicRepository: {
      async createTopic(value) { return { ...value, id: 17 }; },
      async markTopicUsed() {}
    },
    runRepository: {
      async updateRunStage(_runId, update) {
        stageResults.set(update.stageId, update.stageResult);
        return update;
      },
      async finishRun(_runId, update) { return update; }
    },
    costService: {
      async reserveMonthlyBudget({ stageId }) {
        return {
          created: true,
          status: 'reserved',
          reservationMonth: '2026-07',
          reservationKey: `dry-run:${stageId}`
        };
      },
      async settleMonthlyBudget() { return { status: 'settled' }; },
      async getPersistedStageResult({ stageId }) { return stageResults.get(stageId) || null; },
      estimateTextCost() { return 0; }
    },
    validateArticle,
    imageService: {
      async generateAndUploadImage() {
        return {
          imageUrl: 'https://dry-run.invalid/article.webp',
          publicId: 'blog_images/dry-run',
          bytes: 1,
          audit: {
            imageGeneration: { status: 'completed', costIncurred: false },
            upload: { status: 'completed' },
            cleanup: { status: 'not_required' }
          }
        };
      },
      async deleteImage({ publicId }) { return { status: 'completed', publicId }; }
    },
    draftRepository: {
      async createAIDraft(input) {
        return {
          post: {
            id: 41,
            ...input.post,
            published: false,
            workflow_status: 'needs_review',
            content_format: 'static_html',
            generated_by_ai: true
          },
          metadata: { post_id: 41, ...input.metadata }
        };
      }
    }
  };
  configureAdapters?.(dependencies, adapterMonitor);
  for (const name of [
    'inventoryService',
    'openaiService',
    'topicScoringService',
    'topicRepository',
    'runRepository',
    'costService',
    'imageService',
    'draftRepository'
  ]) {
    dependencies[name] = adapterMonitor.adapter(dependencies[name], name);
  }
  dependencies.validateArticle = adapterMonitor.operation(
    dependencies.validateArticle,
    { label: 'validateArticle' }
  );
  return dependencies;
}

export async function runContentAgentDryRun({
  adapterMonitor = createDryRunAdapterMonitor(),
  configureAdapters
} = {}) {
  const dependencies = createDryRunDependencies(adapterMonitor, configureAdapters);
  const validation = validateArticle(article, {
    existingSlugs: [],
    allowedInternalLinks: [{ url: '/kontakt' }],
    sourceReferences: []
  });
  let result;
  try {
    result = await runDraftPipeline({
      runId: 1,
      currentDate: '2026-07-11',
      regionFocus: 'Berlin'
    }, dependencies);
  } catch (error) {
    error.dryRunMetrics = {
      externalCalls: adapterMonitor.externalCalls,
      simulatedAdapterCalls: adapterMonitor.simulatedAdapterCalls
    };
    throw error;
  }

  return {
    mode: 'dry-run',
    externalCalls: adapterMonitor.externalCalls,
    simulatedAdapterCalls: adapterMonitor.simulatedAdapterCalls,
    articleValid: validation.passed,
    qualityScore: result.metadata?.quality_score ?? 0,
    publishMode: dependencies.config.publishMode
  };
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : null;

if (currentFile === entryFile) {
  runContentAgentDryRun()
    .then((result) => console.log(JSON.stringify(result)))
    .catch(() => {
      console.error('Content-Agent-Dry-Run fehlgeschlagen.');
      process.exitCode = 1;
    });
}
