import { createHash } from 'node:crypto';

const META_REFRESH = 'meta_refresh';
const CONTENT_REFRESH = 'content_refresh';

function impressionScore(impressions) {
  return Math.min(10, Math.log10(Math.max(0, impressions) + 1) * 3);
}

function positionScore(position) {
  if (position >= 8 && position <= 20) return 10;
  if (position > 20 && position <= 30) return 8;
  if (position >= 4 && position < 8) return 6;
  if (position > 30) return 4;
  return 2;
}

function ctrGapScore(position, ctr) {
  if (position <= 10 && ctr < 0.01) return 10;
  if (position <= 10 && ctr < 0.03) return 8;
  if (position <= 20 && ctr < 0.02) return 8;
  if (position <= 30 && ctr < 0.015) return 6;
  return 2;
}

export function calculateSearchOpportunity(metrics) {
  const score = impressionScore(metrics.impressions) * 0.45
    + positionScore(metrics.averagePosition) * 0.35
    + ctrGapScore(metrics.averagePosition, metrics.ctr) * 0.20;
  return Math.round(score * 100) / 100;
}

function isSafeMetric(metric) {
  return metric
    && Number.isSafeInteger(metric.postId)
    && metric.postId > 0
    && typeof metric.pageUrl === 'string'
    && typeof metric.query === 'string'
    && Number.isFinite(metric.impressions)
    && metric.impressions >= 0
    && Number.isFinite(metric.averagePosition)
    && metric.averagePosition >= 0
    && Number.isFinite(metric.ctr)
    && metric.ctr >= 0;
}

function normalizeRange(range) {
  if (
    !range
    || typeof range.startDate !== 'string'
    || typeof range.endDate !== 'string'
  ) {
    throw new TypeError('Ein Zeitraum mit startDate und endDate wird benötigt.');
  }

  return {
    startDate: range.startDate,
    endDate: range.endDate
  };
}

function opportunityTypesForMetric(metric) {
  const types = [];

  if (metric.averagePosition <= 10 && metric.ctr < 0.03) {
    types.push(META_REFRESH);
  }
  if (
    metric.averagePosition >= 8
    && metric.averagePosition <= 20
    && metric.ctr < 0.02
  ) {
    types.push(CONTENT_REFRESH);
  }

  return types;
}

function createAnalysisKey({ range, opportunityType, metric }) {
  const identity = JSON.stringify([
    range.startDate,
    range.endDate,
    opportunityType,
    metric.postId,
    metric.pageUrl,
    metric.query
  ]);

  return createHash('sha256').update(identity, 'utf8').digest('hex');
}

function buildOpportunity(metric, range, opportunityType) {
  return {
    postId: metric.postId,
    analysisKey: createAnalysisKey({ range, opportunityType, metric }),
    opportunityType,
    primaryQuery: metric.query,
    score: calculateSearchOpportunity(metric),
    evidenceJson: {
      range: { ...range },
      pageUrl: metric.pageUrl,
      query: metric.query,
      impressions: metric.impressions,
      ctr: metric.ctr,
      averagePosition: metric.averagePosition
    },
    recommendationJson: {
      action: opportunityType,
      automaticChanges: false
    }
  };
}

export function buildContentOpportunities(metrics, range) {
  const normalizedRange = normalizeRange(range);
  const rows = Array.isArray(metrics) ? metrics : [];

  return rows.flatMap((metric) => {
    if (!isSafeMetric(metric)) return [];

    return opportunityTypesForMetric(metric).map((opportunityType) => (
      buildOpportunity(metric, normalizedRange, opportunityType)
    ));
  });
}
