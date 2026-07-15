export const ARTICLE_PERFORMANCE_POLICY_VERSION = 'article-performance-v1';

export const ARTICLE_PERFORMANCE_THRESHOLDS = Object.freeze({
  evaluationDays: 28,
  minimumImpressions: 50,
  minimumOrganicClicksForCta: 10,
  minimumCtaClicksForContact: 5,
  rankingOpportunityMin: 8,
  rankingOpportunityMax: 20,
  minimumCohortSize: 3
});

function numberOrZero(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function ageBucketForDays(days) {
  const normalized = numberOrZero(days);
  if (normalized < 28) return 'collecting';
  if (normalized < 60) return '28-59';
  if (normalized < 120) return '60-119';
  if (normalized < 240) return '120-239';
  return '240-plus';
}

function neutral(status) {
  return {
    status,
    dataEligible: false,
    learningEligible: false,
    dimensions: {
      visibility: status,
      searchResult: 'not_applicable',
      articleEffect: 'not_applicable',
      contactPath: 'not_applicable'
    },
    diagnoses: [],
    positiveSignals: []
  };
}

function buildDimensionStatuses(metrics, diagnoses) {
  const codes = new Set(diagnoses.map((item) => item.code));
  return {
    visibility: codes.has('visibility_opportunity') || codes.has('ranking_opportunity')
      ? 'opportunity'
      : 'stable',
    searchResult: codes.has('snippet_or_intent_opportunity') ? 'opportunity' : 'stable',
    articleEffect: numberOrZero(metrics.clicks) < ARTICLE_PERFORMANCE_THRESHOLDS.minimumOrganicClicksForCta
      ? 'not_applicable'
      : (codes.has('content_or_cta_opportunity') ? 'opportunity' : 'positive'),
    contactPath: numberOrZero(metrics.ctaClicks) < ARTICLE_PERFORMANCE_THRESHOLDS.minimumCtaClicksForContact
      ? 'not_applicable'
      : (codes.has('contact_path_opportunity') ? 'opportunity' : 'positive')
  };
}

export function evaluateArticlePerformance({
  articleAgeDays,
  current,
  previous = {},
  cohort = {}
} = {}) {
  const metrics = current?.[28] || current?.['28'] || {};
  const coverageDays = numberOrZero(metrics.coverageDayCount);
  const articleDays = numberOrZero(articleAgeDays);

  if (articleDays < ARTICLE_PERFORMANCE_THRESHOLDS.evaluationDays ||
      coverageDays < ARTICLE_PERFORMANCE_THRESHOLDS.evaluationDays ||
      metrics.complete === false) {
    return neutral('collecting_data');
  }

  const impressions = numberOrZero(metrics.impressions);
  if (impressions < ARTICLE_PERFORMANCE_THRESHOLDS.minimumImpressions) {
    return neutral('insufficient_impressions');
  }

  const clicks = numberOrZero(metrics.clicks);
  const ctaClicks = numberOrZero(metrics.ctaClicks);
  const contactSubmits = numberOrZero(metrics.contactSubmits);
  const averagePosition = numberOrZero(metrics.averagePosition);
  const cohortEligible = cohort.available === true &&
    numberOrZero(cohort.size) >= ARTICLE_PERFORMANCE_THRESHOLDS.minimumCohortSize;
  const diagnoses = [];
  const positiveSignals = [];

  if (cohortEligible &&
      impressions < numberOrZero(cohort.medianImpressions) * 0.6 &&
      averagePosition > ARTICLE_PERFORMANCE_THRESHOLDS.rankingOpportunityMax) {
    diagnoses.push({
      code: 'visibility_opportunity',
      categoryKey: 'performance_visibility'
    });
  }

  if (clicks === 0) {
    diagnoses.push({
      code: 'snippet_or_intent_opportunity',
      categoryKey: 'performance_snippet_intent'
    });
  }

  if (averagePosition >= ARTICLE_PERFORMANCE_THRESHOLDS.rankingOpportunityMin &&
      averagePosition <= ARTICLE_PERFORMANCE_THRESHOLDS.rankingOpportunityMax) {
    diagnoses.push({
      code: 'ranking_opportunity',
      categoryKey: 'performance_ranking'
    });
  }

  if (clicks >= ARTICLE_PERFORMANCE_THRESHOLDS.minimumOrganicClicksForCta && ctaClicks === 0) {
    diagnoses.push({
      code: 'content_or_cta_opportunity',
      categoryKey: 'performance_content_engagement'
    });
  }

  if (ctaClicks >= ARTICLE_PERFORMANCE_THRESHOLDS.minimumCtaClicksForContact && contactSubmits === 0) {
    diagnoses.push({
      code: 'contact_path_opportunity',
      categoryKey: 'performance_conversion_path'
    });
  }

  const previous28 = previous?.[28] || previous?.['28'];
  if (previous28?.complete && numberOrZero(metrics.ctr) > numberOrZero(previous28.ctr)) {
    positiveSignals.push({
      code: 'ctr_improved',
      categoryKey: 'performance_positive_pattern'
    });
  }

  if (cohortEligible && impressions >= numberOrZero(cohort.medianImpressions)) {
    positiveSignals.push({
      code: 'visibility_above_cohort',
      categoryKey: 'performance_positive_pattern'
    });
  }

  return {
    status: diagnoses.length ? 'opportunity' : (positiveSignals.length ? 'positive' : 'stable'),
    dataEligible: true,
    learningEligible: true,
    dimensions: buildDimensionStatuses(metrics, diagnoses),
    diagnoses,
    positiveSignals
  };
}
