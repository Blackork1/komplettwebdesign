import * as cheerio from 'cheerio';
import { normalizeInternalHref } from './trustedInternalLinkService.js';

const MIN_META_TITLE_LENGTH = 50;
const MAX_META_TITLE_LENGTH = 60;
export const GENERATED_ARTICLE_TECHNICAL_NORMALIZER_VERSION = '2026-07-21.1';

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncateMetaTitle(value) {
  if (value.length <= MAX_META_TITLE_LENGTH) return value;
  const bounded = value.slice(0, MAX_META_TITLE_LENGTH + 1);
  const wordBoundary = bounded.lastIndexOf(' ');
  const candidate = wordBoundary >= MIN_META_TITLE_LENGTH
    ? bounded.slice(0, wordBoundary)
    : value.slice(0, MAX_META_TITLE_LENGTH);
  return candidate.replace(/[\s|,:;\-–—]+$/gu, '').trim();
}

function normalizeMetaTitle(metaTitle, articleTitle) {
  const current = normalizeText(metaTitle);
  if (current.length >= MIN_META_TITLE_LENGTH && current.length <= MAX_META_TITLE_LENGTH) {
    return current;
  }
  if (current.length > MAX_META_TITLE_LENGTH) return truncateMetaTitle(current);

  const baseCandidates = [
    current,
    normalizeText(articleTitle)
  ].filter(Boolean);
  const suffixes = [
    ' – Ratgeber',
    ' für Berlin',
    ' | Berlin',
    ' – Komplett Webdesign'
  ];
  for (const base of baseCandidates) {
    if (base.length >= MIN_META_TITLE_LENGTH) return truncateMetaTitle(base);
    for (const suffix of suffixes) {
      const candidate = `${base}${suffix}`;
      if (candidate.length >= MIN_META_TITLE_LENGTH && candidate.length <= MAX_META_TITLE_LENGTH) {
        return candidate;
      }
    }
  }

  const fallback = `${baseCandidates[0] || 'Webdesign'} – Praxis-Ratgeber für Unternehmen | Komplett Webdesign`;
  return truncateMetaTitle(fallback);
}

function normalizeCtaLinks(contentHtml) {
  const html = typeof contentHtml === 'string' ? contentHtml : '';
  const $ = cheerio.load(html, null, false);
  let changed = false;

  $('[data-track="cta"]').each((_, element) => {
    const anchors = $(element).find('a[href]').toArray();
    const hasContactAnchor = anchors.some((anchor) => {
      const normalized = normalizeInternalHref($(anchor).attr('href'));
      return normalized.kind === 'internal' && normalized.path === '/kontakt';
    });
    if (!hasContactAnchor) return;

    for (const anchor of anchors) {
      const normalized = normalizeInternalHref($(anchor).attr('href'));
      if (normalized.kind === 'internal' && normalized.path === '/kontakt') continue;
      $(anchor).replaceWith($(anchor).contents());
      changed = true;
    }
  });

  return changed ? $.root().html() : html;
}

export function normalizeGeneratedArticleTechnicalFields(article = {}) {
  if (!article || typeof article !== 'object' || Array.isArray(article)) return article;
  const metaTitle = normalizeMetaTitle(article.metaTitle, article.title);
  const contentHtml = normalizeCtaLinks(article.contentHtml);
  if (metaTitle === article.metaTitle && contentHtml === article.contentHtml) return article;
  return { ...article, metaTitle, contentHtml };
}
