const ALLOWED_HOSTNAMES = new Set([
  'komplettwebdesign.de',
  'www.komplettwebdesign.de'
]);

export const SEARCH_CONSOLE_CATEGORY_DEFINITIONS = Object.freeze([
  {
    key: 'website_testers',
    label: 'Website-Tester',
    description: 'SEO-, GEO-, Broken-Link-, Meta- und allgemeine Website-Tests',
    primary: true
  },
  {
    key: 'blog_guides',
    label: 'Blog & Ratgeber',
    description: 'Redaktionelle Inhalte, Hilfestellungen und Entscheidungshilfen'
  },
  {
    key: 'services',
    label: 'Leistungen',
    description: 'Webdesign-, Relaunch-, SEO- und Angebotsseiten'
  },
  {
    key: 'local_industries',
    label: 'Lokale Seiten & Branchen',
    description: 'Berliner Bezirke, lokale Einstiegsseiten und Branchenlösungen'
  },
  {
    key: 'other',
    label: 'Sonstige Inhalte',
    description: 'Weitere öffentliche Seiten außerhalb der redaktionellen Hauptblöcke'
  }
]);

export const SEARCH_CONSOLE_TESTER_DEFINITIONS = Object.freeze([
  { key: 'seo', label: 'SEO-Tester' },
  { key: 'geo', label: 'GEO-Tester' },
  { key: 'broken_links', label: 'Broken-Link-Tester' },
  { key: 'meta', label: 'Meta-Tester' },
  { key: 'general', label: 'Allgemeine Website-Tester' }
]);

const SERVICE_PATH_PATTERNS = [
  /^\/leistungen(?:\/|$)/,
  /^\/pakete(?:\/|$)/,
  /^\/webdesign(?:\/|$)/,
  /^\/website-(?:erstellen-lassen|relaunch|optimieren|wartung|audit)(?:\/|$)/,
  /^\/(?:lokale-seo|local-seo|seo-agentur|seo-optimierung)(?:\/|$)/,
  /^\/(?:barrierefreiheit|conversion-optimierung|ki-webdesign)(?:\/|$)/
];

function cleanText(value, maxLength = 160) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

const GSC_TOKEN_STOPWORDS = new Set([
  'aber', 'als', 'auch', 'bei', 'das', 'der', 'die', 'ein', 'eine', 'einer',
  'für', 'fur', 'ist', 'mit', 'oder', 'und', 'von', 'was', 'wie', 'zu', 'zur'
]);
const GSC_TESTER_TOPIC_PATTERN = /\b(?:website|seo|geo|meta|broken)[-\s]?(?:link[-\s]?)?tester\b|\bwebsite[-\s]?test\b/i;

function relevanceTokens(value) {
  return cleanText(value, 500)
    .toLocaleLowerCase('de-DE')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !GSC_TOKEN_STOPWORDS.has(token));
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeSearchConsolePath(value) {
  try {
    const raw = String(value || '').trim();
    if (!raw || (!raw.startsWith('/') && !/^https?:\/\//i.test(raw))) return null;
    const url = new URL(raw, 'https://www.komplettwebdesign.de');
    if (!['http:', 'https:'].includes(url.protocol) || !ALLOWED_HOSTNAMES.has(url.hostname.toLowerCase())) {
      return null;
    }
    const pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  } catch {
    return null;
  }
}

function testerKeyForPath(contentPath) {
  if (/^\/website-tester\/seo(?:\/|$)/.test(contentPath)) return 'seo';
  if (/^\/website-tester\/geo(?:\/|$)/.test(contentPath)) return 'geo';
  if (/^\/website-tester\/broken-links(?:\/|$)/.test(contentPath)) return 'broken_links';
  if (/^\/website-tester\/meta(?:\/|$)/.test(contentPath)) return 'meta';
  return 'general';
}

export function classifySearchConsolePage(value) {
  const normalizedPath = normalizeSearchConsolePath(value);
  if (!normalizedPath) {
    return { path: '/', categoryKey: 'other', testerKey: null, language: 'de' };
  }

  const language = /^\/en(?:\/|$)/.test(normalizedPath) ? 'en' : 'de';
  const contentPath = language === 'en'
    ? normalizedPath.replace(/^\/en(?=\/|$)/, '') || '/'
    : normalizedPath;

  if (/^\/website-tester(?:\/|$)/.test(contentPath)) {
    return {
      path: normalizedPath,
      categoryKey: 'website_testers',
      testerKey: testerKeyForPath(contentPath),
      language
    };
  }
  if (/^\/(?:blog|ratgeber|guides)(?:\/|$)/.test(contentPath)) {
    return { path: normalizedPath, categoryKey: 'blog_guides', testerKey: null, language };
  }
  if (/^\/(?:branchen|webdesign-berlin)(?:\/|$)/.test(contentPath)) {
    return { path: normalizedPath, categoryKey: 'local_industries', testerKey: null, language };
  }
  if (SERVICE_PATH_PATTERNS.some((pattern) => pattern.test(contentPath))) {
    return { path: normalizedPath, categoryKey: 'services', testerKey: null, language };
  }
  return { path: normalizedPath, categoryKey: 'other', testerKey: null, language };
}

function createBucket(definition) {
  return {
    ...definition,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    share: 0,
    languages: [
      { key: 'de', label: 'Deutsch', clicks: 0, impressions: 0, ctr: 0 },
      { key: 'en', label: 'Englisch', clicks: 0, impressions: 0, ctr: 0 }
    ],
    subcategories: definition.key === 'website_testers'
      ? SEARCH_CONSOLE_TESTER_DEFINITIONS.map((item) => ({ ...item, clicks: 0, impressions: 0, ctr: 0 }))
      : [],
    pages: [],
    queries: []
  };
}

function finalizeRate(bucket) {
  bucket.ctr = bucket.impressions > 0 ? bucket.clicks / bucket.impressions : 0;
  for (const language of bucket.languages || []) {
    language.ctr = language.impressions > 0 ? language.clicks / language.impressions : 0;
  }
  for (const subcategory of bucket.subcategories || []) {
    subcategory.ctr = subcategory.impressions > 0
      ? subcategory.clicks / subcategory.impressions
      : 0;
  }
}

function normalizedMetric(row) {
  const classification = classifySearchConsolePage(row?.page_url);
  const impressions = safeNumber(row?.impressions);
  const clicks = safeNumber(row?.clicks);
  return {
    ...classification,
    query: cleanText(row?.query),
    clicks,
    impressions,
    ctr: Number.isFinite(Number(row?.ctr))
      ? Math.max(0, Number(row.ctr))
      : (impressions > 0 ? clicks / impressions : 0),
    averagePosition: safeNumber(row?.average_position)
  };
}

export function aggregateSearchConsoleCategories({ pages = [], metrics = [] } = {}, {
  maxPagesPerCategory = 8,
  maxQueriesPerCategory = 8,
  maxContentOpportunities = 10
} = {}) {
  const categories = SEARCH_CONSOLE_CATEGORY_DEFINITIONS.map(createBucket);
  const byKey = new Map(categories.map((category) => [category.key, category]));

  for (const row of Array.isArray(pages) ? pages : []) {
    const classification = classifySearchConsolePage(row?.page_url);
    const category = byKey.get(classification.categoryKey) || byKey.get('other');
    const clicks = safeNumber(row?.clicks);
    const impressions = safeNumber(row?.impressions);
    category.clicks += clicks;
    category.impressions += impressions;
    const language = category.languages.find((item) => item.key === classification.language);
    language.clicks += clicks;
    language.impressions += impressions;
    if (classification.testerKey) {
      const subcategory = category.subcategories.find((item) => item.key === classification.testerKey);
      if (subcategory) {
        subcategory.clicks += clicks;
        subcategory.impressions += impressions;
      }
    }
    category.pages.push({
      path: classification.path,
      language: classification.language,
      testerKey: classification.testerKey,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      averagePosition: safeNumber(row?.average_position)
    });
  }

  const normalizedMetrics = (Array.isArray(metrics) ? metrics : [])
    .map(normalizedMetric)
    .filter((row) => row.query && row.impressions > 0);
  for (const metric of normalizedMetrics) {
    const category = byKey.get(metric.categoryKey) || byKey.get('other');
    category.queries.push(metric);
  }

  const totalClicks = categories.reduce((sum, category) => sum + category.clicks, 0);
  const totalImpressions = categories.reduce((sum, category) => sum + category.impressions, 0);
  for (const category of categories) {
    category.share = totalImpressions > 0 ? category.impressions / totalImpressions : 0;
    category.pages = category.pages
      .sort((a, b) => b.impressions - a.impressions || a.path.localeCompare(b.path, 'de'))
      .slice(0, Math.max(1, maxPagesPerCategory));
    category.queries = category.queries
      .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query, 'de'))
      .slice(0, Math.max(1, maxQueriesPerCategory));
    finalizeRate(category);
  }

  const seenQueries = new Set();
  const contentOpportunities = normalizedMetrics
    .filter((row) => row.categoryKey !== 'website_testers')
    .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query, 'de'))
    .filter((row) => {
      const key = row.query.toLocaleLowerCase('de-DE');
      if (seenQueries.has(key)) return false;
      seenQueries.add(key);
      return true;
    })
    .slice(0, Math.max(1, maxContentOpportunities));

  return {
    summary: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0
    },
    categories,
    contentOpportunities
  };
}

export function buildSearchConsoleTopicSignals(data = {}, options = {}) {
  const aggregate = aggregateSearchConsoleCategories(data, {
    maxPagesPerCategory: 3,
    maxQueriesPerCategory: 3,
    maxContentOpportunities: options.maxQueries || 12
  });
  const testerBlock = aggregate.categories.find((category) => category.key === 'website_testers');

  return {
    range: {
      startDate: cleanText(data?.range?.start_date || data?.range?.startDate, 10) || null,
      endDate: cleanText(data?.range?.end_date || data?.range?.endDate, 10) || null
    },
    categories: aggregate.categories
      .filter((category) => category.impressions > 0)
      .map((category) => ({
        key: category.key,
        impressions: Math.round(category.impressions),
        clicks: Math.round(category.clicks),
        share: Number(category.share.toFixed(4))
      })),
    testerBlock: {
      impressions: Math.round(testerBlock?.impressions || 0),
      clicks: Math.round(testerBlock?.clicks || 0),
      subcategories: (testerBlock?.subcategories || [])
        .filter((subcategory) => subcategory.impressions > 0)
        .map((subcategory) => ({
          key: subcategory.key,
          impressions: Math.round(subcategory.impressions),
          clicks: Math.round(subcategory.clicks)
        }))
    },
    topNonTesterQueries: aggregate.contentOpportunities.map((row) => ({
      query: cleanText(row.query, 120),
      category: row.categoryKey,
      impressions: Math.round(row.impressions),
      clicks: Math.round(row.clicks),
      averagePosition: Number(row.averagePosition.toFixed(1))
    }))
  };
}

export function calculateGscTopicRelevance(candidate = {}, signals = {}) {
  const candidateTokens = new Set(relevanceTokens([
    candidate?.topic,
    candidate?.suggestedTitle,
    candidate?.primaryKeyword,
    candidate?.contentCluster
  ].filter(Boolean).join(' ')));
  if (candidateTokens.size === 0) return 0;

  let bestQueryScore = 0;
  for (const item of Array.isArray(signals?.topNonTesterQueries)
    ? signals.topNonTesterQueries.slice(0, 20)
    : []) {
    const queryTokens = [...new Set(relevanceTokens(item?.query))];
    if (queryTokens.length === 0) continue;
    const matches = queryTokens.filter((token) => candidateTokens.has(token)).length;
    const coverage = matches / queryTokens.length;
    const score = queryTokens.length === 1 ? Math.min(4, coverage * 10) : coverage * 10;
    bestQueryScore = Math.max(bestQueryScore, score);
  }

  const candidateText = [...candidateTokens].join(' ');
  const testerRelevant = candidate?.isTesterTopic === true
    || GSC_TESTER_TOPIC_PATTERN.test(candidateText);
  const testerBonus = testerRelevant && Number(signals?.testerBlock?.impressions) > 0 ? 2 : 0;
  return Math.round(Math.min(10, Math.max(bestQueryScore, testerBonus)) * 10) / 10;
}
