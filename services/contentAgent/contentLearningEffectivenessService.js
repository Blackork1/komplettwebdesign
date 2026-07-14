const MINIMUM_ARTICLES = 5;
const SIGNIFICANT_IMPROVEMENT_FACTOR = 0.5;
const NO_IMPROVEMENT_FACTOR = 0.8;

function finiteRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

export function evaluateLearningRuleEffectiveness({
  articleCount,
  recurrenceCount,
  baselineRate = null,
  currentRate
} = {}) {
  const articles = Number(articleCount);
  const recurrences = Number(recurrenceCount);
  const current = finiteRate(currentRate);
  const baseline = baselineRate === null || baselineRate === undefined
    ? null
    : finiteRate(baselineRate);
  if (!Number.isSafeInteger(articles) || articles < MINIMUM_ARTICLES
      || !Number.isSafeInteger(recurrences) || recurrences < 0 || recurrences > articles
      || current === null) {
    return 'observing';
  }
  if (recurrences === 0) return 'effective';
  if (baseline !== null && baseline > 0 && current <= baseline * SIGNIFICANT_IMPROVEMENT_FACTOR) {
    return 'effective';
  }
  if (recurrences >= 2 && (baseline === null || baseline === 0 || current >= baseline * NO_IMPROVEMENT_FACTOR)) {
    return 'revision_recommended';
  }
  return 'observing';
}
