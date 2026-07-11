import ejs from 'ejs';
import BlogPostModel from '../models/BlogPostModel.js';
import { isoOffset } from '../util/date.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';
import { sanitizeArticleHtml } from '../services/contentAgent/articleSanitizer.js';

const BLOG_PAGE_SIZE = 10;


function renderDbEjs(template, locals = {}) {
  try {
    return ejs.render(template || '', locals, {
      rmWhitespace: true,
      filename: 'db://post-content' // nur für bessere Fehlermeldungen
    });
  } catch (err) {
    console.error('EJS-Renderfehler im DB-Content:', err);
    return template || '';
  }
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function demoteContentH1(html) {
  return String(html || '')
    .replace(/<h1(\b[^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>');
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
    helpers: {
      date: d => new Date(d).toLocaleDateString('de-DE')
    }
  };

  return demoteContentH1(normalizeLegacyPublicCopy(
    renderPricingTokens(renderDbEjs(post.content, legacyLocals), pricing)
  ));
}

function renderPostContent(post, context) {
  return post.content_format === 'static_html'
    ? renderStaticContent(post.content, context.pricing)
    : renderLegacyContent(post, context);
}

function parseNonNegativeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function renderPostCard(res, post, idx) {
  return new Promise((resolve, reject) => {
    res.render('blog/partials/post-card', { post, idx }, (err, html) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(html);
    });
  });
}

export async function listPosts(req, res) {
  const [rawPosts, totalPosts, rawFeaturedPosts] = await Promise.all([
    BlogPostModel.findPage({ limit: BLOG_PAGE_SIZE, offset: 0 }),
    BlogPostModel.countPublished(),
    BlogPostModel.findFeatured(5)
  ]);
  const pricing = res.locals.packagePricing || {};
  const posts = normalizeLegacyPublicCopy(renderPricingTokens(rawPosts, pricing));
  const featuredPosts = normalizeLegacyPublicCopy(renderPricingTokens(rawFeaturedPosts, pricing));
  res.render('blog/index', {
    title: "Aktuelle Einschätzungen zu Webdesign, SEO und Sichtbarkeit",
    description: "Aktuelle Einschätzungen zu Webdesign, KI, Performance und SEO. Dauerhafte Grundlagen zu Kosten, Ablauf und Local SEO findest du im Ratgeber.",
    posts,
    featuredPosts,
    totalPosts,
    pageSize: BLOG_PAGE_SIZE
  });
}

export async function listPostsPage(req, res) {
  try {
    const offset = parseNonNegativeInteger(req.query.offset, 0);
    const requestedLimit = parseNonNegativeInteger(req.query.limit, BLOG_PAGE_SIZE);
    const limit = Math.min(Math.max(requestedLimit, 1), BLOG_PAGE_SIZE);
    const [rawPosts, totalPosts] = await Promise.all([
      BlogPostModel.findPage({ limit, offset }),
      BlogPostModel.countPublished()
    ]);
    const posts = normalizeLegacyPublicCopy(renderPricingTokens(rawPosts, res.locals.packagePricing || {}));
    const html = (await Promise.all(
      posts.map((post, idx) => renderPostCard(res, post, offset + idx))
    )).join('');
    const nextOffset = offset + posts.length;

    res.json({
      html,
      count: posts.length,
      nextOffset,
      hasMore: nextOffset < totalPosts,
      totalPosts
    });
  } catch (err) {
    console.error('Blog-Artikel konnten nicht nachgeladen werden:', err);
    res.status(500).json({ error: 'Artikel konnten nicht geladen werden.' });
  }
}

export async function showPost(req, res) {
  const rawPost = await BlogPostModel.findBySlug(req.params.slug);
  if (!rawPost) return res.status(404).send('Artikel nicht gefunden');

  const pricing = res.locals.packagePricing || {};
  const postWithPricing = renderPricingTokens(rawPost, pricing);
  const post = rawPost.content_format === 'static_html'
    ? postWithPricing
    : normalizeLegacyPublicCopy(postWithPricing);

  const publishedISO = isoOffset(post.created_at);      // ergibt z.B. 2025-08-19T12:00:00+02:00
  const modifiedISO = isoOffset(post.updated_at);      // echte Zeit mit Offset

  // FAQ robust: JSONB (Array) ODER Text, der JSON enthält
  let faqArray = [];
  if (Array.isArray(post.faq_json)) {
    faqArray = post.faq_json;
  } else if (typeof post.faq_json === 'string' && post.faq_json.trim().startsWith('[')) {
    try { faqArray = JSON.parse(post.faq_json); } catch { faqArray = []; }
  }

  const renderedContent = renderPostContent(post, {
    modifiedISO,
    pricing,
    publishedISO
  });

  // Beschreibung/Excerpt bestimmen (DB-Excerpt bevorzugt)
  let desc = (post.excerpt && post.excerpt.trim()) || (post.excerpt && post.excerpt.trim()) || '';
  if (!desc) {
    const textOnly = stripHtml(renderedContent);
    desc = textOnly.slice(0, 160) + (textOnly.length > 160 ? '…' : '');
  }

  const pageTitle = post.meta_title || post.title;
  const metaDescription = post.meta_description || post.description || desc;
  const ogTitle = post.og_title || post.title;
  const ogDescription = post.og_description || metaDescription;

  const base = (res.locals.canonicalBaseUrl || process.env.BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonicalUrl = base ? `${base}/blog/${post.slug}` : `/blog/${post.slug}`;

  // --- SEO Head-Block zusammenbauen (als String) ---
  const seoExtra = `
  <link rel="canonical" href="${ejs.escapeXML(canonicalUrl)}">
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${ejs.escapeXML(ogTitle)}">
  <meta property="og:description" content="${ejs.escapeXML(ogDescription)}">
  <meta property="og:url" content="${ejs.escapeXML(canonicalUrl)}">
  <meta property="og:site_name" content="Komplett Webdesign">
  <meta property="og:locale" content="de_DE">
  <meta property="og:image" content="${ejs.escapeXML(post.image_url || '')}">
  <meta property="og:image:alt" content="${ejs.escapeXML(post.image_alt || post.title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="675">
  <meta property="article:published_time" content="${publishedISO}">
  <meta property="article:modified_time" content="${modifiedISO}">

  <!-- JSON-LD: BreadcrumbList -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Startseite", "item": `${base}/` },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${base}/blog` },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": canonicalUrl }
    ]
  }, null, 2)}
  </script>

  <!-- JSON-LD: BlogPosting -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": pageTitle,
    "description": metaDescription,
    "url": canonicalUrl,
    "mainEntityOfPage": canonicalUrl,
    "image": {
      "@type": "ImageObject",
      "url": post.image_url || '',
      "width": 1200,
      "height": 675
    },
    "author": { "@type": "Organization", "name": "Komplett Webdesign" },
    "publisher": {
      "@type": "Organization",
      "name": "Komplett Webdesign",
      "logo": { "@type": "ImageObject", "url": `${base}/images/LogoTransparent.webp` }
    },
    "datePublished": publishedISO,
    "dateModified": modifiedISO
  }, null, 2)}
  </script>

  <!-- JSON-LD: FAQPage -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqArray
  }, null, 2)}
  </script>
  `;

  res.render('blog/show', {
    title: pageTitle,
    description: metaDescription,
    excerpt: desc,
    ogTitle,
    ogDescription,
    ogImage: post.image_url,
    canonicalUrl,
    slug: post.slug,

    // Daten für die View
    post: { ...post, description: desc, faq_json: faqArray },
    publishedISO,
    modifiedISO,
    renderedContent,

    // Head-Injektion
    seoExtra
  });
}
