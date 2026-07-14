import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function finiteNonNegative(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : 0;
}

function finitePosition(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null;
}

function rounded(value, digits = 8) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function normalizeQueryText(value) {
  return [...String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()]
    .slice(0, 160)
    .join('');
}

function normalizeQueries(value) {
  const aggregates = new Map();
  for (const row of (Array.isArray(value) ? value : []).slice(0, 100)) {
    const query = normalizeQueryText(row?.query);
    if (!query) continue;
    const clicks = finiteNonNegative(row?.clicks);
    const impressions = finiteNonNegative(row?.impressions);
    const position = finitePosition(row?.averagePosition ?? row?.average_position);
    const current = aggregates.get(query) || {
      query,
      clicks: 0,
      impressions: 0,
      weightedPosition: 0,
      positionedImpressions: 0
    };
    current.clicks += clicks;
    current.impressions += impressions;
    if (position !== null && impressions > 0) {
      current.weightedPosition += position * impressions;
      current.positionedImpressions += impressions;
    }
    aggregates.set(query, current);
  }
  return [...aggregates.values()]
    .sort((left, right) => (
      right.impressions - left.impressions
      || right.clicks - left.clicks
      || left.query.localeCompare(right.query, 'de')
    ))
    .slice(0, 10)
    .map((row) => ({
      query: row.query,
      clicks: rounded(row.clicks, 4),
      impressions: rounded(row.impressions, 4),
      ctr: row.impressions === 0 ? 0 : rounded(row.clicks / row.impressions),
      averagePosition: row.positionedImpressions === 0
        ? null
        : rounded(row.weightedPosition / row.positionedImpressions, 4)
    }));
}

function normalizeMetrics(value = {}) {
  const clicks = finiteNonNegative(value.clicks);
  const impressions = finiteNonNegative(value.impressions);
  return {
    hasData: value.hasData === true,
    clicks: rounded(clicks, 4),
    impressions: rounded(impressions, 4),
    ctr: impressions === 0 ? 0 : rounded(clicks / impressions),
    averagePosition: finitePosition(value.averagePosition ?? value.average_position),
    queries: normalizeQueries(value.queries)
  };
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${label} ist ungültig.`);
  }
  return normalized;
}

function calendarDate(value, label) {
  const text = value instanceof Date
    ? [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0')
    ].join('-')
    : String(value || '');
  if (!ISO_DATE.test(text)) throw new TypeError(`${label} ist ungültig.`);
  const parsed = DateTime.fromISO(text, { zone: 'UTC' });
  if (!parsed.isValid || parsed.toISODate() !== text) throw new TypeError(`${label} ist ungültig.`);
  return text;
}

function timestamp(value, label) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new TypeError(`${label} ist ungültig.`);
  return parsed;
}

function requireMethod(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} wird benötigt.`);
  return value;
}

function queryDifference(left, right) {
  const otherQueries = new Set(right.map(({ query }) => query));
  return left
    .filter(({ query }) => !otherQueries.has(query))
    .slice(0, 5)
    .map(({ query, clicks, impressions }) => ({ query, clicks, impressions }));
}

export function buildOutcomeWindows(appliedAt, timezone) {
  const localAppliedAt = DateTime.fromJSDate(
    appliedAt instanceof Date ? appliedAt : new Date(appliedAt),
    { zone: timezone }
  );
  if (!localAppliedAt.isValid) {
    throw new TypeError('Übernahmezeitpunkt oder Zeitzone ist ungültig.');
  }
  const followupStart = localAppliedAt.startOf('day').plus({ days: 1 });
  return {
    followupStartDate: followupStart.toISODate(),
    followupEndDate: followupStart.plus({ days: 27 }).toISODate()
  };
}

export function compareOutcomeMetrics(baseline = {}, followup = {}) {
  const normalizedBaseline = normalizeMetrics(baseline);
  const normalizedFollowup = normalizeMetrics(followup);
  const insufficient = !normalizedBaseline.hasData
    || !normalizedFollowup.hasData
    || normalizedBaseline.impressions + normalizedFollowup.impressions < 50;
  return {
    status: insufficient ? 'insufficient_data' : 'observed',
    label: insufficient ? 'Noch nicht belastbar' : 'Neutrale Beobachtung',
    baseline: normalizedBaseline,
    followup: normalizedFollowup,
    changes: {
      clicks: rounded(normalizedFollowup.clicks - normalizedBaseline.clicks, 4),
      impressions: rounded(normalizedFollowup.impressions - normalizedBaseline.impressions, 4),
      ctr: rounded(normalizedFollowup.ctr - normalizedBaseline.ctr),
      averagePosition: normalizedBaseline.averagePosition === null
        || normalizedFollowup.averagePosition === null
        ? null
        : rounded(
          normalizedFollowup.averagePosition - normalizedBaseline.averagePosition,
          4
        )
    },
    newImportantQueries: queryDifference(
      normalizedFollowup.queries,
      normalizedBaseline.queries
    ),
    lostImportantQueries: queryDifference(
      normalizedBaseline.queries,
      normalizedFollowup.queries
    ),
    note: 'Die Werte sind eine neutrale Beobachtung. Saison, Nachfrage und Google-Änderungen können sie beeinflussen.'
  };
}

export async function captureRevisionBaseline(input = {}, dependencies = {}) {
  const revisionId = positiveInteger(input.revisionId, 'revisionId');
  const postId = positiveInteger(input.postId, 'postId');
  const expectedVersion = positiveInteger(input.expectedVersion, 'expectedVersion');
  const appliedAt = timestamp(input.appliedAt, 'appliedAt');
  const timezone = String(input.timezone || '');
  const localAppliedAt = DateTime.fromJSDate(appliedAt, { zone: timezone });
  if (!localAppliedAt.isValid) throw new TypeError('timezone ist ungültig.');
  if (!input.transactionClient || typeof input.transactionClient.query !== 'function') {
    throw new TypeError('Die Freigabetransaktion wird benötigt.');
  }
  const loadMetrics = requireMethod(
    dependencies.searchMetricsRepository?.getLatestCompletePageMetrics,
    'searchMetricsRepository.getLatestCompletePageMetrics'
  );
  const createBaseline = requireMethod(
    dependencies.outcomeRepository?.createOutcomeBaseline,
    'outcomeRepository.createOutcomeBaseline'
  );
  const rawMetrics = await loadMetrics({
    postId,
    throughDate: localAppliedAt.toISODate(),
    days: 28,
    queryLimit: 10
  }, input.transactionClient);
  const completeCoverage = Number(rawMetrics?.coverageDayCount ?? rawMetrics?.coverage_day_count) === 28;
  const baselineStartDate = completeCoverage
    ? calendarDate(rawMetrics.startDate ?? rawMetrics.start_date, 'baselineStartDate')
    : null;
  const baselineEndDate = completeCoverage
    ? calendarDate(rawMetrics.endDate ?? rawMetrics.end_date, 'baselineEndDate')
    : null;
  const baselineMetrics = normalizeMetrics(completeCoverage ? rawMetrics : {});

  return createBaseline({
    revisionId,
    postId,
    expectedVersion,
    appliedAt: appliedAt.toISOString(),
    baselineStartDate,
    baselineEndDate,
    baselineMetrics,
    timezone
  }, input.transactionClient);
}

function followupStorage(comparison) {
  return {
    ...comparison.followup,
    changes: comparison.changes,
    newImportantQueries: comparison.newImportantQueries,
    lostImportantQueries: comparison.lostImportantQueries,
    label: comparison.label,
    note: comparison.note
  };
}

function exactOutcomePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'endDate')) {
    throw new TypeError('Der Outcome-Job benötigt ausschließlich endDate.');
  }
  return { endDate: calendarDate(input.endDate, 'endDate') };
}

export async function evaluateDueRevisionOutcomes(input = {}, dependencies = {}) {
  const { endDate } = exactOutcomePayload(input);
  const outcomeRepository = dependencies.outcomeRepository;
  const searchMetricsRepository = dependencies.searchMetricsRepository;
  const listDue = requireMethod(outcomeRepository?.listDueOutcomes, 'outcomeRepository.listDueOutcomes');
  const complete = requireMethod(outcomeRepository?.completeOutcome, 'outcomeRepository.completeOutcome');
  const release = requireMethod(outcomeRepository?.releaseOutcomeClaim, 'outcomeRepository.releaseOutcomeClaim');
  const loadMetrics = requireMethod(
    searchMetricsRepository?.getPageOutcomeMetrics,
    'searchMetricsRepository.getPageOutcomeMetrics'
  );
  const claimToken = (dependencies.createClaimToken || randomUUID)();
  if (typeof claimToken !== 'string' || !UUID.test(claimToken)) {
    throw new TypeError('Der Outcome-Claim-Token ist ungültig.');
  }
  const outcomes = (await listDue({ throughDate: endDate, limit: 50, claimToken })).slice(0, 50);
  const summary = {
    claimed: outcomes.length,
    evaluated: 0,
    insufficientData: 0,
    waiting: 0,
    failed: 0
  };

  for (const outcome of outcomes) {
    const revisionId = positiveInteger(outcome.revision_id ?? outcome.revisionId, 'revisionId');
    const postId = positiveInteger(outcome.post_id ?? outcome.postId, 'postId');
    const expectedRevisionVersion = positiveInteger(
      outcome.revision_version ?? outcome.revisionVersion,
      'revisionVersion'
    );
    const followupStartDate = calendarDate(
      outcome.followup_start_date ?? outcome.followupStartDate,
      'followupStartDate'
    );
    const followupEndDate = calendarDate(
      outcome.followup_end_date ?? outcome.followupEndDate,
      'followupEndDate'
    );
    const claim = { revisionId, expectedRevisionVersion, claimToken };
    try {
      const rawFollowup = await loadMetrics({
        postId,
        startDate: followupStartDate,
        endDate: followupEndDate,
        days: 28,
        queryLimit: 10
      });
      const coverageDayCount = Number(
        rawFollowup?.coverageDayCount ?? rawFollowup?.coverage_day_count
      );
      const coveredStart = rawFollowup?.startDate ?? rawFollowup?.start_date;
      const coveredEnd = rawFollowup?.endDate ?? rawFollowup?.end_date;
      if (coverageDayCount !== 28
          || coveredStart !== followupStartDate
          || coveredEnd !== followupEndDate) {
        await release(claim);
        summary.waiting += 1;
        continue;
      }
      const comparison = compareOutcomeMetrics(
        outcome.baseline_metrics_json ?? outcome.baselineMetrics ?? {},
        rawFollowup
      );
      const evaluationStatus = comparison.status === 'insufficient_data'
        ? 'insufficient_data'
        : 'evaluated';
      const stored = await complete({
        ...claim,
        evaluationStatus,
        followupMetrics: followupStorage(comparison)
      });
      if (stored) {
        if (evaluationStatus === 'insufficient_data') summary.insufficientData += 1;
        else summary.evaluated += 1;
      }
    } catch (error) {
      await complete({
        ...claim,
        evaluationStatus: 'failed',
        followupMetrics: null
      });
      summary.failed += 1;
    }
  }
  return summary;
}
