import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const blogIndex = read('views/blog/index.ejs');
const blogShow = read('views/blog/show.ejs');
const blogPostCard = read('views/blog/partials/post-card.ejs');
const blogCss = read('public/blog.css');
const ratgeberCss = read('public/ratgeber.css');
const blogRoutes = read('routes/blogRoutes.js');
const blogController = read('controllers/blogController.js');
const blogModel = read('models/BlogPostModel.js');
const blogLoadMoreJs = read('public/js/blog-load-more.js');
const appIndex = read('index.js');

test('blog index uses the ratgeber visual system', () => {
  assert.match(blogIndex, /cssAsset\('ratgeber\.css'\)/);
  assert.doesNotMatch(blogIndex, /disableInteractionPolish:\s*true/);
  assert.match(blogIndex, /<main class="rg-page blog-page blog-index-page"/);
  assert.match(blogIndex, /class="rg-hero blog-hero unified-hero"/);
  assert.match(blogIndex, /rg-hero-noise/);
  assert.match(blogIndex, /rg-hero-grid/);
  assert.match(blogIndex, /rg-hero-panel/);
  assert.match(blogIndex, /rg-card-grid/);
  assert.match(blogPostCard, /rg-guide-card/);
  assert.match(blogIndex, /rg-featured-box/);
  assert.doesNotMatch(blogIndex, /post-card-bg/);
  assert.doesNotMatch(blogIndex, /col-md-8/);
});

test('blog detail uses the ratgeber detail layout', () => {
  assert.match(blogShow, /cssAsset\('ratgeber\.css'\)/);
  assert.doesNotMatch(blogShow, /disableInteractionPolish:\s*true/);
  assert.match(blogShow, /<main class="rg-page blog-page blog-detail-page"/);
  assert.match(blogShow, /class="rg-detail-hero blog-detail-hero unified-hero"/);
  assert.match(blogShow, /rg-detail-hero-inner/);
  assert.match(blogShow, /rg-detail-layout/);
  assert.match(blogShow, /rg-article-body/);
  assert.match(blogShow, /rg-newsletter-card/);
  assert.doesNotMatch(blogShow, /class="col-md-8"/);
});

test('blog and ratgeber detail pages keep article text before sidebar on smaller viewports', () => {
  assert.doesNotMatch(ratgeberCss, /\.rg-detail-side\s*\{[\s\S]*?order:\s*-1/);
});

test('ratgeber sidebars use the same non-sticky right-column behavior as blog', () => {
  assert.match(ratgeberCss, /\.rg-sticky-wrap\s*\{[\s\S]*?position:\s*static/);
  assert.doesNotMatch(ratgeberCss, /\.rg-sticky-wrap\s*\{[\s\S]*?position:\s*sticky/);
});

test('blog css only keeps blog-specific refinements on top of ratgeber styles', () => {
  assert.doesNotMatch(blogCss, /\.heroB\s*\{[\s\S]*?background:\s*url/);
  assert.doesNotMatch(blogCss, /\.post-card-bg/);
  assert.match(blogCss, /\.blog-page\s+\.comment-section/);
  assert.match(blogCss, /\.blog-page\s+\.rg-guide-card\s*\{[\s\S]*?animation:\s*none/);
  assert.match(blogCss, /\.blog-page\s+\.rg-sticky-wrap\s*\{[\s\S]*?position:\s*static/);
  assert.match(blogCss, /\.blog-page\s+\.rg-kpi-card\s*\{[\s\S]*?backdrop-filter:\s*none/);
});

test('blog index paginates articles and loads more through axios without a full page reload', () => {
  assert.match(blogController, /const BLOG_PAGE_SIZE = 10/);
  assert.match(blogController, /findPage\(\{ limit: BLOG_PAGE_SIZE, offset: 0 \}\)/);
  assert.match(blogController, /export async function listPostsPage/);
  assert.match(blogModel, /static async findPage/);
  assert.match(blogModel, /LIMIT \$1\s+OFFSET \$2/);
  assert.match(blogModel, /static async countPublished/);
  assert.match(blogRoutes, /router\.get\('\/blog\/posts',\s*listPostsPage\)/);
  assert.ok(
    blogRoutes.indexOf("router.get('/blog/posts'") < blogRoutes.indexOf("router.get('/blog/:slug'"),
    'load-more API must be registered before the dynamic blog slug route'
  );

  assert.match(blogIndex, /<%- include\('\.\/partials\/post-card'/);
  assert.match(blogIndex, /data-blog-grid/);
  assert.match(blogIndex, /data-blog-load-more/);
  assert.match(blogIndex, /\/assets\/js\/axios\.min\.js/);
  assert.match(blogIndex, /\/js\/blog-load-more\.js/);
  assert.match(appIndex, /\/assets\/js\/axios\.min\.js/);
  assert.match(appIndex, /node_modules\/axios\/dist\/axios\.min\.js/);
  assert.match(blogLoadMoreJs, /window\.axios/);
  assert.match(blogLoadMoreJs, /axios\.get/);
  assert.match(blogLoadMoreJs, /insertAdjacentHTML\('beforeend'/);
});
