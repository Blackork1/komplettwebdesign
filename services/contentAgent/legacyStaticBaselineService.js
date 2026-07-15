import { isLegacyStaticHtml } from './legacyContentPolicy.js';

const KNOWN_LEGACY_HREF_REPAIRS = Object.freeze([
  [
    /href="\/branchen\/webdesign-blumenladen><strong>/gu,
    'href="/branchen/webdesign-blumenladen"><strong>'
  ],
  [
    /href='\/branchen\/webdesign-blumenladen><strong>/gu,
    "href='/branchen/webdesign-blumenladen'><strong>"
  ]
]);

export function normalizeLegacyStaticOptimizationBaselineHtml(value) {
  return KNOWN_LEGACY_HREF_REPAIRS.reduce(
    (html, [pattern, replacement]) => html.replace(pattern, replacement),
    typeof value === 'string' ? value : ''
  );
}

export function normalizeLegacyStaticOptimizationBaseline(article = {}) {
  const contentHtml = typeof article?.contentHtml === 'string' ? article.contentHtml : '';
  if (!isLegacyStaticHtml({
    contentFormat: article?.contentFormat ?? article?.content_format,
    contentHtml
  })) return article;

  const normalizedHtml = normalizeLegacyStaticOptimizationBaselineHtml(contentHtml);
  return normalizedHtml === contentHtml
    ? article
    : { ...article, contentHtml: normalizedHtml };
}
