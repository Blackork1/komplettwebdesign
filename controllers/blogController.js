import BlogPostModel from '../models/BlogPostModel.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';
import { buildBlogPostPageModel } from '../services/blogPostPresentationService.js';

const BLOG_PAGE_SIZE = 10;


function parseNonNegativeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function parseBlogPage(value) {
  const page = Number.parseInt(String(value || '1'), 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
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
  const page = parseBlogPage(req.query.page);
  const offset = (page - 1) * BLOG_PAGE_SIZE;
  const [rawPosts, totalPosts, rawFeaturedPosts] = await Promise.all([
    BlogPostModel.findPage({ limit: BLOG_PAGE_SIZE, offset }),
    BlogPostModel.countPublished(),
    BlogPostModel.findFeatured(5)
  ]);
  const totalPages = Math.max(1, Math.ceil(totalPosts / BLOG_PAGE_SIZE));
  if (page > totalPages) {
    return res.status(404).render('404', {
      title: 'Blogseite nicht gefunden',
      description: 'Die angeforderte Blogseite existiert nicht.'
    });
  }

  const pricing = res.locals.packagePricing || {};
  const posts = normalizeLegacyPublicCopy(renderPricingTokens(rawPosts, pricing));
  const featuredPosts = normalizeLegacyPublicCopy(renderPricingTokens(rawFeaturedPosts, pricing));
  const base = (res.locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = page === 1 ? '/blog' : `/blog?page=${page}`;
  const pageUrl = (value) => value === 1 ? '/blog' : `/blog?page=${value}`;

  return res.render('blog/index', {
    title: page === 1
      ? 'Aktuelle Einschätzungen zu Webdesign, SEO und Sichtbarkeit'
      : `Webdesign- und SEO-Blog – Seite ${page}`,
    description: page === 1
      ? 'Aktuelle Einschätzungen zu Webdesign, KI, Performance und SEO. Dauerhafte Grundlagen zu Kosten, Ablauf und Local SEO findest du im Ratgeber.'
      : `Weitere Artikel zu Webdesign, SEO, Performance und digitalen Angeboten auf Seite ${page} des Komplett-Webdesign-Blogs.`,
    canonicalUrl: `${base}${pagePath}`,
    posts,
    featuredPosts,
    totalPosts,
    pageSize: BLOG_PAGE_SIZE,
    initialOffset: offset + posts.length,
    currentPage: page,
    totalPages,
    previousPageUrl: page > 1 ? pageUrl(page - 1) : null,
    nextPageUrl: page < totalPages ? pageUrl(page + 1) : null
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
  try {
    req.app.get('contentAttributionService')?.rememberArticle(req, rawPost);
  } catch {
    // Die öffentliche Artikelseite bleibt auch bei einem Trackingfehler erreichbar.
  }
  return res.render('blog/show', buildBlogPostPageModel({
    post: rawPost,
    pricing: res.locals.packagePricing || {},
    canonicalBaseUrl: res.locals.canonicalBaseUrl,
    previewMode: false
  }));
}
