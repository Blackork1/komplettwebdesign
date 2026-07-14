const ROW_LIMIT = 25_000;
const SUPPORTED_HOSTS = new Set([
  'komplettwebdesign.de',
  'www.komplettwebdesign.de'
]);
const CANONICAL_BLOG_PATH = /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const METRIC_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_CLICKS_OR_IMPRESSIONS = 9_999_999_999.9999;
const MAX_CTR = 9_999.99999999;
const MAX_AVERAGE_POSITION = 99_999_999.9999;
const MAX_DEVICE_LENGTH = 24;

function normalizeAllowedHosts(allowedHosts) {
  return new Set(
    (Array.isArray(allowedHosts) ? allowedHosts : [])
      .filter((host) => SUPPORTED_HOSTS.has(host))
  );
}

function normalizeMetricDate(value) {
  if (typeof value !== 'string') return null;

  const match = METRIC_DATE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}

function normalizeNumber(value, maximum) {
  if (
    typeof value !== 'number'
    && (typeof value !== 'string' || value.trim() === '')
  ) {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized)
    && normalized >= 0
    && normalized <= maximum
    ? normalized
    : null;
}

function normalizePage(value, allowedHosts) {
  if (typeof value !== 'string') return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    !['http:', 'https:'].includes(url.protocol)
    || !allowedHosts.has(url.host)
    || url.username
    || url.password
  ) {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, '');
  const rawPathMatch = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(?<path>[^?#]*)/i.exec(value);
  const rawPath = rawPathMatch?.groups?.path?.replace(/\/+$/, '') ?? null;
  return {
    pageUrl: `${url.protocol}//${url.host}${path}`,
    blogPath: rawPath === path && CANONICAL_BLOG_PATH.test(path) ? path : null
  };
}

function normalizeRow(row, allowedHosts) {
  if (!row || !Array.isArray(row.keys) || row.keys.length !== 4) return null;

  const [date, page, query, device] = row.keys;
  const metricDate = normalizeMetricDate(date);
  const normalizedPage = normalizePage(page, allowedHosts);
  const clicks = normalizeNumber(row.clicks, MAX_CLICKS_OR_IMPRESSIONS);
  const impressions = normalizeNumber(row.impressions, MAX_CLICKS_OR_IMPRESSIONS);
  const ctr = normalizeNumber(row.ctr, MAX_CTR);
  const averagePosition = normalizeNumber(row.position, MAX_AVERAGE_POSITION);

  if (
    !metricDate
    || !normalizedPage
    || typeof query !== 'string'
    || typeof device !== 'string'
    || [...device].length > MAX_DEVICE_LENGTH
    || clicks === null
    || impressions === null
    || ctr === null
    || averagePosition === null
  ) {
    return null;
  }

  return {
    blogPath: normalizedPage.blogPath,
    metric: {
      postId: null,
      metricDate,
      pageUrl: normalizedPage.pageUrl,
      query,
      device,
      clicks,
      impressions,
      ctr,
      averagePosition
    }
  };
}

function aggregateMetrics(metrics) {
  const aggregates = new Map();

  for (const metric of metrics) {
    const key = JSON.stringify([
      metric.metricDate,
      metric.pageUrl,
      metric.query,
      metric.device
    ]);
    const existing = aggregates.get(key);

    if (!existing) {
      aggregates.set(key, {
        ...metric,
        weightedPositionTotal: metric.averagePosition * metric.impressions
      });
      continue;
    }

    existing.postId ??= metric.postId;
    existing.clicks += metric.clicks;
    existing.impressions += metric.impressions;
    existing.weightedPositionTotal += metric.averagePosition * metric.impressions;
  }

  return [...aggregates.values()].map(({ weightedPositionTotal, ...metric }) => ({
    ...metric,
    ctr: metric.impressions === 0 ? 0 : metric.clicks / metric.impressions,
    averagePosition: metric.impressions === 0
      ? 0
      : weightedPositionTotal / metric.impressions
  }));
}

export function createSearchConsoleSyncService({
  client,
  repository,
  allowedHosts
}) {
  if (!client || typeof client.querySearchAnalytics !== 'function') {
    throw new TypeError('Ein Search-Console-Client wird benötigt.');
  }
  if (
    !repository
    || typeof repository.findPostIdsByCanonicalPaths !== 'function'
    || typeof repository.upsertSearchMetrics !== 'function'
    || typeof repository.recordSyncCoverage !== 'function'
  ) {
    throw new TypeError('Ein Repository für Suchmetriken wird benötigt.');
  }

  const normalizedAllowedHosts = normalizeAllowedHosts(allowedHosts);

  return {
    async syncSearchConsoleRange({ startDate, endDate, leaseGuard } = {}) {
      if (typeof leaseGuard !== 'function') {
        throw new TypeError('Ein Lease-Guard wird benötigt.');
      }

      let startRow = 0;
      const normalizedRows = [];

      while (true) {
        await leaseGuard();
        const response = await client.querySearchAnalytics({
          startDate,
          endDate,
          dimensions: ['date', 'page', 'query', 'device'],
          type: 'web',
          dataState: 'final',
          rowLimit: ROW_LIMIT,
          startRow
        });
        const rows = Array.isArray(response?.rows) ? response.rows : [];

        if (rows.length === 0) break;

        startRow += rows.length;
        normalizedRows.push(...rows.flatMap((row) => {
          const normalized = normalizeRow(row, normalizedAllowedHosts);
          return normalized ? [normalized] : [];
        }));
      }

      if (normalizedRows.length > 0) {
        const blogPaths = [...new Set(
          normalizedRows.flatMap((row) => row.blogPath ? [row.blogPath] : [])
        )];
        const postIdsByPath = await repository.findPostIdsByCanonicalPaths(blogPaths);
        const metrics = aggregateMetrics(
          normalizedRows.map(({ blogPath, metric }) => ({
            ...metric,
            postId: blogPath ? (postIdsByPath.get(blogPath) ?? null) : null
          }))
        );

        await leaseGuard();
        await repository.upsertSearchMetrics(metrics);
      }
      await leaseGuard();
      await repository.recordSyncCoverage({ startDate, endDate });
    }
  };
}
