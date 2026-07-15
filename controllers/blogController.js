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
