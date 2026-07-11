import ejs from 'ejs';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { isoOffset } from '../util/date.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';
import { sanitizeArticleHtml } from './contentAgent/articleSanitizer.js';

const GENERAL_ANCHOR = 'pruefung-gesamter-artikel';
const RESERVED_PREVIEW_IDS = Object.freeze([
  'hero',
  'blog-detail-title',
  'focused-risk-heading',
  'blog-next-title',
  GENERAL_ANCHOR
]);

function presentationError(code, message) {
  return Object.assign(new Error(message), { code });
}

function renderDbEjs(template, locals = {}) {
  try {
    return ejs.render(template || '', locals, {
      rmWhitespace: true,
      filename: 'db://post-content'
    });
  } catch (error) {
    console.error('EJS-Renderfehler im DB-Content:', error);
    return '';
  }
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function demoteContentH1(html) {
  return String(html || '')
    .replace(/<h1(\b[^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>');
}

function normalizeFaq(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim().startsWith('[')) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderStaticContent(content, pricing) {
  return sanitizeArticleHtml(renderPricingTokens(content, pricing));
}

function renderLegacyContent(post, { modifiedISO, pricing, publishedISO }) {
  const legacyLocals = {
    post: { ...post, description: post.description },
    modifiedISO,
    publishedISO,
    og_image: post.image_url,
    locale: 'de_DE',
    helpers: { date: (value) => new Date(value).toLocaleDateString('de-DE') }
  };
  return demoteContentH1(normalizeLegacyPublicCopy(
    renderPricingTokens(renderDbEjs(post.content, legacyLocals), pricing)
  ));
}

function riskAnchorsForHtml(html) {
  const $ = cheerio.load(html, null, false);
  const usedIds = new Set(RESERVED_PREVIEW_IDS);
  const entries = [];

  $('[id]').not('h2, h3').each((_, element) => {
    const id = String($(element).attr('id') || '');
    if (/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(id)) usedIds.add(id);
  });

  $('h2, h3').each((index, element) => {
    const section = $(element).text().replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!section) return;
    const base = slugify(section.replace(/[<>]/g, ' '), { lower: true, strict: true, locale: 'de' })
      || `abschnitt-${index + 1}`;
    const baseAnchor = `pruefung-${base}`;
    let anchor = baseAnchor;
    let suffix = 2;
    while (usedIds.has(anchor)) {
      anchor = `${baseAnchor}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(anchor);
    entries.push({
      element,
      section,
      body: `${section} ${$(element).nextUntil('h2, h3').text()}`.replace(/\s+/g, ' ').trim(),
      anchor
    });
  });
  return { $, entries };
}

function prepareRiskReview(html, rawRiskReview) {
  const rawItems = Array.isArray(rawRiskReview?.items) ? rawRiskReview.items : [];
  const { $, entries } = riskAnchorsForHtml(html);
  const entryByAnchor = new Map(entries.map((entry) => [entry.anchor, entry]));
  const usedAnchors = new Set();
  const items = rawItems.map((rawItem) => {
    const item = rawItem && typeof rawItem === 'object' ? rawItem : {};
    const requestedAnchor = String(item.anchor || '');
    const requestedSection = String(item.section || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const excerpt = typeof item.excerpt === 'string'
      ? item.excerpt.replace(/\s+/g, ' ').trim().slice(0, 280)
      : '';
    const exactTarget = entryByAnchor.get(requestedAnchor);
    const exactTargetMatches = exactTarget
      && exactTarget.section === requestedSection
      && (!excerpt || exactTarget.body.includes(excerpt));
    const evidenceTargets = excerpt
      ? entries.filter(({ section, body }) => section === requestedSection && body.includes(excerpt))
      : [];
    const target = exactTargetMatches
      ? exactTarget
      : evidenceTargets.length === 1 ? evidenceTargets[0] : null;
    const anchor = target ? target.anchor : GENERAL_ANCHOR;
    if (target && !usedAnchors.has(anchor)) {
      $(target.element).attr('id', anchor);
      usedAnchors.add(anchor);
    }
    return {
      code: String(item.code || 'review_issue').slice(0, 120),
      severity: ['info', 'warning', 'error'].includes(item.severity) ? item.severity : 'warning',
      section: target && target.section === requestedSection ? target.section : 'Gesamter Artikel',
      excerpt: excerpt || null,
      reason: String(item.reason || item.message || 'Prüfstelle redaktionell bewerten.').slice(0, 500),
      instruction: String(item.instruction || 'Prüfstelle fachlich prüfen.').slice(0, 500),
      verificationType: ['none', 'source', 'date', 'price', 'version', 'legal', 'privacy'].includes(item.verificationType)
        ? item.verificationType
        : 'none',
      sourceRequired: item.sourceRequired === true,
      blocking: item.blocking === true,
      anchor
    };
  });
  return {
    renderedContent: $.html(),
    riskReview: {
      blocked: rawRiskReview?.blocked === true || items.some(({ blocking }) => blocking),
      items,
      sourceCount: Math.max(0, Number(rawRiskReview?.sourceCount) || 0)
    }
  };
}

function normalizeBaseUrl(value) {
  return String(value || process.env.BASE_URL || 'https://komplettwebdesign.de').replace(/\/+$/, '');
}

export function buildBlogPostPageModel({
  post: rawPost,
  metadata = {},
  pricing = {},
  canonicalBaseUrl,
  previewMode = false,
  riskReview
} = {}) {
  if (!rawPost) throw presentationError('CONTENT_POST_NOT_FOUND', 'Blogartikel nicht gefunden.');
  if (previewMode && (
    rawPost.content_format !== 'static_html'
    || rawPost.generated_by_ai !== true
    || rawPost.published !== false
  )) {
    throw presentationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
  }

  const postWithPricing = renderPricingTokens(rawPost, pricing);
  const post = rawPost.content_format === 'legacy_ejs' && !previewMode
    ? normalizeLegacyPublicCopy(postWithPricing)
    : postWithPricing;
  const publishedISO = isoOffset(post.published_at || post.created_at);
  const modifiedISO = isoOffset(post.updated_at || post.created_at);
  let renderedContent;
  if (post.content_format === 'static_html') {
    renderedContent = renderStaticContent(post.content, pricing);
  } else if (!previewMode && post.content_format === 'legacy_ejs') {
    renderedContent = renderLegacyContent(post, { modifiedISO, pricing, publishedISO });
  } else {
    throw presentationError('CONTENT_POST_NOT_FOUND', 'Blogartikel mit unbekanntem Inhaltsformat wird nicht gerendert.');
  }

  const rawFocusedReview = riskReview || metadata?.quality_report_json?.focusedReview || null;
  let focusedRiskReview = null;
  if (previewMode) {
    const prepared = prepareRiskReview(renderedContent, rawFocusedReview || {});
    renderedContent = prepared.renderedContent;
    focusedRiskReview = prepared.riskReview;
  }

  const faqArray = normalizeFaq(post.faq_json);
  const textOnly = stripHtml(renderedContent);
  const excerpt = String(post.excerpt || '').trim()
    || `${textOnly.slice(0, 160)}${textOnly.length > 160 ? '…' : ''}`;
  const pageTitle = post.meta_title || post.title;
  const metaDescription = post.meta_description || post.description || excerpt;
  const ogTitle = post.og_title || post.title;
  const ogDescription = post.og_description || metaDescription;
  const base = normalizeBaseUrl(canonicalBaseUrl);
  const publicBlogUrl = `${base}/blog`;
  const canonicalUrl = previewMode ? publicBlogUrl : `${publicBlogUrl}/${post.slug}`;
  const organizationId = `${base}/#organization`;
  const structuredDataBlocks = previewMode ? [] : [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: 'Komplett Webdesign',
      url: `${base}/`,
      logo: { '@type': 'ImageObject', url: `${base}/images/LogoTransparent.webp` }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: publicBlogUrl },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: pageTitle,
      description: metaDescription,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      image: { '@type': 'ImageObject', url: post.image_url || '', width: 1200, height: 675 },
      author: { '@id': organizationId },
      publisher: { '@id': organizationId },
      datePublished: publishedISO,
      dateModified: modifiedISO
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqArray }
  ];
  const robotsMeta = previewMode ? '  <meta name="robots" content="noindex,nofollow">\n' : '';
  const ogType = previewMode ? 'website' : 'article';
  const safeOgTitle = previewMode ? 'Geschützte Blogvorschau' : ogTitle;
  const safeOgDescription = previewMode ? 'Nicht öffentliche redaktionelle Vorschau.' : ogDescription;
  const seoExtra = `${robotsMeta}  <link rel="canonical" href="${ejs.escapeXML(canonicalUrl)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${ejs.escapeXML(safeOgTitle)}">
  <meta property="og:description" content="${ejs.escapeXML(safeOgDescription)}">
  <meta property="og:url" content="${ejs.escapeXML(canonicalUrl)}">
  <meta property="og:site_name" content="Komplett Webdesign">
  <meta property="og:locale" content="de_DE">
  <meta property="og:image" content="${ejs.escapeXML(post.image_url || '')}">
  <meta property="og:image:alt" content="${ejs.escapeXML(post.image_alt || post.title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="675">
  ${previewMode ? '' : `<meta property="article:published_time" content="${ejs.escapeXML(publishedISO)}">\n  <meta property="article:modified_time" content="${ejs.escapeXML(modifiedISO)}">`}`;

  return {
    title: pageTitle,
    description: metaDescription,
    excerpt,
    ogTitle: safeOgTitle,
    ogDescription: safeOgDescription,
    ogImage: post.image_url,
    canonicalUrl,
    slug: post.slug,
    post: { ...post, description: excerpt, faq_json: faqArray },
    publishedISO,
    modifiedISO,
    renderedContent,
    structuredDataBlocks,
    seoExtra,
    robots: previewMode ? 'noindex,nofollow' : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1',
    previewMode: previewMode === true,
    showComments: previewMode !== true,
    disableTracking: previewMode === true,
    disableInteractionPolish: previewMode === true,
    riskReview: previewMode ? focusedRiskReview : null,
    previewEditUrl: previewMode ? `/admin/content-agent/drafts/${post.id}/edit` : null,
    previewReturnUrl: previewMode ? '/admin/content-agent/drafts' : null
  };
}
