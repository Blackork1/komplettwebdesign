import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import ejs from 'ejs';
import BlogPostModel from '../models/BlogPostModel.js';
import pool from '../util/db.js';
import { showPost } from '../controllers/blogController.js';
import { escapeJsonForHtml } from '../util/security.js';

const controllerSource = readFileSync(new URL('../controllers/blogController.js', import.meta.url), 'utf8');
const presentationSource = readFileSync(new URL('../services/blogPostPresentationService.js', import.meta.url), 'utf8');
const viewSource = readFileSync(new URL('../views/blog/show.ejs', import.meta.url), 'utf8');
const blogViewPath = fileURLToPath(new URL('../views/blog/show.ejs', import.meta.url));

const pricing = {
  packageByKey: {
    start: { name: 'Start' }
  },
  priceLabel(packageKey) {
    return packageKey === 'start' ? 'ab 1.234 €' : '';
  }
};

function postFixture(overrides = {}) {
  return {
    id: 91,
    title: 'Sicherer Blogbeitrag',
    slug: 'sicherer-blogbeitrag',
    excerpt: 'Kurzer Auszug',
    description: 'Öffentliche Beschreibung',
    content: '<section><h2>Inhalt</h2><p>Text</p></section>',
    content_format: 'legacy_ejs',
    image_url: '/images/blog.webp',
    image_alt: 'Passender Alternativtext',
    faq_json: [],
    created_at: new Date('2026-07-10T08:00:00.000Z'),
    updated_at: new Date('2026-07-10T09:00:00.000Z'),
    ...overrides
  };
}

async function renderControllerPost(post, packagePricing = pricing) {
  const originalFindBySlug = BlogPostModel.findBySlug;
  let rendered;
  BlogPostModel.findBySlug = async () => post;

  const res = {
    locals: {
      packagePricing,
      canonicalBaseUrl: 'https://example.test'
    },
    render(view, locals) {
      rendered = { view, locals };
    },
    status() {
      return this;
    },
    send() {}
  };

  try {
    await showPost({ params: { slug: post.slug } }, res);
  } finally {
    BlogPostModel.findBySlug = originalFindBySlug;
  }

  assert.equal(rendered?.view, 'blog/show');
  return rendered.locals;
}

async function renderCompleteBlogPage(controllerLocals) {
  const assetUrl = (file) => `/${String(file || '').replace(/^\/+/, '')}?v=test`;
  return ejs.renderFile(blogViewPath, {
    ...controllerLocals,
    asset: assetUrl,
    assetVersion: 'test',
    canonicalBaseUrl: 'https://example.test',
    csrfToken: 'test-csrf',
    cssAsset: assetUrl,
    currentPathname: `/blog/${controllerLocals.post.slug}`,
    currentSearch: '',
    disableInteractionPolish: true,
    escapeJsonForHtml,
    footerNavigation: [],
    headerCta: null,
    headerNavigation: [],
    jsAsset: assetUrl,
    lng: 'de',
    robots: 'index,follow',
    trackingContext: {}
  });
}

test('gemeinsames Viewmodel trennt statisches HTML ausdrücklich vom Legacy-EJS-Pfad', () => {
  assert.match(controllerSource, /buildBlogPostPageModel/);
  assert.match(presentationSource, /post\.content_format === 'static_html'/);
  assert.match(presentationSource, /post\.content_format === 'legacy_ejs'/);
  assert.match(presentationSource, /sanitizeArticleHtml/);
  assert.match(presentationSource, /renderDbEjs/);
  assert.match(presentationSource, /post\.meta_title \|\| post\.title/);
  assert.match(presentationSource, /post\.meta_description \|\| post\.description/);
  assert.match(presentationSource, /structuredDataBlocks/);
  assert.doesNotMatch(controllerSource, /const seoExtra = `[\s\S]*?<script type="application\/ld\+json">/);
});

test('static_html wertet selbst fehlerhafte EJS-Payloads niemals aus und wird nach Preistokens sanitisiert', async () => {
  delete globalThis.__blogStaticEjsPayload;
  const locals = await renderControllerPost(postFixture({
    content_format: 'static_html',
    content: [
      '<section><h2>Statischer Inhalt</h2>',
      '<p onclick="alert(1)"><%= globalThis.__blogStaticEjsPayload = "ausgeführt" %></p>',
      '<p>{{package:start.priceLabel}}</p>',
      '<script>globalThis.__blogStaticEjsPayload = "Skript"</script>'
    ].join('')
  }));

  assert.equal(globalThis.__blogStaticEjsPayload, undefined);
  assert.match(locals.renderedContent, /Statischer Inhalt/);
  assert.match(locals.renderedContent, /ab 1\.234 €/);
  assert.doesNotMatch(locals.renderedContent, /<script|onclick=/i);
  assert.doesNotMatch(locals.renderedContent, /<h1\b/i);
});

test('Legacybeiträge rendern EJS, zentrale Preistokens und stufen eine Inhalts-H1 zurück', async () => {
  const locals = await renderControllerPost(postFixture({
    content: [
      '<section><h1>Interne Überschrift</h1>',
      '<p><%= post.title %></p>',
      '<p>{{package:start.priceLabel}}</p></section>'
    ].join('')
  }));

  assert.match(locals.renderedContent, /<h2>Interne Überschrift<\/h2>/);
  assert.match(locals.renderedContent, /Sicherer Blogbeitrag/);
  assert.match(locals.renderedContent, /ab 1\.234 €/);
  assert.doesNotMatch(locals.renderedContent, /<h1\b/i);

  const html = await renderCompleteBlogPage(locals);
  const $ = cheerio.load(html);
  assert.equal($('h1').length, 1);
  assert.match($('.rg-article-body').text(), /Interne Überschrift/);
  assert.match($('.rg-article-body').text(), /Sicherer Blogbeitrag/);
  assert.match($('.rg-article-body').text(), /ab 1\.234 €/);
});

test('unbekanntes und null content_format bleiben fail-closed und führen kein Legacy-EJS aus', async () => {
  for (const contentFormat of [null, 'zukünftiges_format']) {
    await assert.rejects(
      renderControllerPost(postFixture({
        content_format: contentFormat,
        content: '<section><p><%= post.title %></p></section>'
      })),
      (error) => error.code === 'CONTENT_POST_NOT_FOUND'
    );
  }
});

test('SEO- und OG-Felder verwenden ihre Fallbacks und werden für den Head passend übergeben', async () => {
  const locals = await renderControllerPost(postFixture({
    title: 'Titel <öffentlich> & "klar"',
    description: 'Beschreibung <öffentlich> & "klar"',
    meta_title: 'SEO <Titel> & "klar"',
    meta_description: 'Meta <Beschreibung> & "klar"',
    og_title: 'OG <Titel> & "klar"',
    og_description: 'OG <Beschreibung> & "klar"'
  }));

  assert.equal(locals.title, 'SEO <Titel> & "klar"');
  assert.equal(locals.description, 'Meta <Beschreibung> & "klar"');
  assert.equal(locals.ogTitle, 'OG <Titel> & "klar"');
  assert.equal(locals.ogDescription, 'OG <Beschreibung> & "klar"');
  assert.equal(locals.ogImage, '/images/blog.webp');
  assert.equal(locals.canonicalUrl, 'https://example.test/blog/sicherer-blogbeitrag');
  assert.match(locals.seoExtra, /content="OG &lt;Titel&gt; &amp; &#34;klar&#34;"/);
  assert.match(locals.seoExtra, /content="OG &lt;Beschreibung&gt; &amp; &#34;klar&#34;"/);

  const fallbackLocals = await renderControllerPost(postFixture({
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null
  }));
  assert.equal(fallbackLocals.title, 'Sicherer Blogbeitrag');
  assert.equal(fallbackLocals.description, 'Öffentliche Beschreibung');
  assert.equal(fallbackLocals.ogTitle, 'Sicherer Blogbeitrag');
  assert.equal(fallbackLocals.ogDescription, 'Öffentliche Beschreibung');
});

test('Blogseiten geben kein leeres FAQPage-Schema aus', async () => {
  const locals = await renderControllerPost(postFixture({ faq_json: [] }));
  const faqSchemas = locals.structuredDataBlocks.filter((block) => block['@type'] === 'FAQPage');

  assert.deepEqual(faqSchemas, []);
});

test('echter EJS-Gesamtrender schützt Metaattribute und JSON-LD vor gespeicherter Script-Injektion', async () => {
  const scriptBreakout = '</script><script id="xss-probe">';
  const specialCharacters = '< > & \u2028\u2029';
  const metaTitle = `SEO ${scriptBreakout} ${specialCharacters}`;
  const metaDescription = `Meta ${scriptBreakout} ${specialCharacters}`;
  const ogTitle = `OG-Titel ${scriptBreakout} ${specialCharacters}`;
  const ogDescription = `OG-Beschreibung ${scriptBreakout} ${specialCharacters}`;
  const imageAlt = `Alt "onerror=probe" ${scriptBreakout} ${specialCharacters}`;
  const faqQuestion = `Frage ${scriptBreakout} ${specialCharacters}`;
  const faqAnswer = `Antwort ${scriptBreakout} ${specialCharacters}`;

  delete globalThis.__blogFullRenderPayload;
  const locals = await renderControllerPost(postFixture({
    content_format: 'static_html',
    content: '<section><h2>Statischer Inhalt</h2><p><%= globalThis.__blogFullRenderPayload = "ausgeführt" %></p></section>',
    meta_title: metaTitle,
    meta_description: metaDescription,
    og_title: ogTitle,
    og_description: ogDescription,
    image_alt: imageAlt,
    faq_json: [{ question: faqQuestion, answer: faqAnswer }]
  }));
  const html = await renderCompleteBlogPage(locals);
  const $ = cheerio.load(html);

  assert.equal(globalThis.__blogFullRenderPayload, undefined);
  assert.equal($('h1').length, 1);
  assert.equal($('title').text(), metaTitle);
  assert.equal($('meta[name="description"]').attr('content'), metaDescription);
  assert.equal($('meta[property="og:title"]').attr('content'), ogTitle);
  assert.equal($('meta[property="og:description"]').attr('content'), ogDescription);
  assert.equal($('img[src="/images/blog.webp"]').attr('alt'), imageAlt);
  assert.equal($('script#xss-probe').length, 0);
  assert.doesNotMatch(html, /<script id=/i);
  assert.doesNotMatch(html, /<\/script><script id=/i);

  const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
  const rawJsonLd = jsonLdScripts.map((element) => $(element).text()).join('\n');
  assert.doesNotMatch(rawJsonLd, /[\u2028\u2029]/);
  assert.match(rawJsonLd, /\\u003C/);
  assert.match(rawJsonLd, /\\u003E/);
  assert.match(rawJsonLd, /\\u0026/);

  const structuredData = jsonLdScripts.map((element) => JSON.parse($(element).text()));
  const article = structuredData.find((block) => block['@type'] === 'BlogPosting');
  const faq = structuredData.find((block) => block['@type'] === 'FAQPage');
  const organization = structuredData.find((block) => block['@type'] === 'Organization');
  assert.equal(article.headline, metaTitle);
  assert.equal(article.description, metaDescription);
  assert.deepEqual(faq.mainEntity, [{ question: faqQuestion, answer: faqAnswer }]);
  assert.equal(organization.name, 'Komplett Webdesign');
});

test('öffentliche View nutzt Bild-Alt-Fallback und enthält nur die Titel-H1', () => {
  assert.match(viewSource, /alt="<%= post\.image_alt \|\| post\.title %>"/);
  assert.equal((viewSource.match(/<h1\b/gi) || []).length, 1);
  assert.match(viewSource, /<%- renderedContent %>/);
  assert.match(viewSource, /structuredDataBlocks/);
});

test('öffentliche und Admin-Queries reichen neue Postfelder unverändert durch', async () => {
  const originalQuery = pool.query;
  const row = postFixture({
    meta_title: 'SEO-Titel',
    meta_description: 'SEO-Beschreibung',
    og_title: 'OG-Titel',
    og_description: 'OG-Beschreibung',
    content_format: 'static_html',
    scheduled_at: new Date('2026-07-13T16:00:00.000Z'),
    review_version: 1
  });
  pool.query = async () => ({ rows: [row] });

  try {
    const [detail, listEntry, adminEntry] = await Promise.all([
      BlogPostModel.findBySlug(row.slug),
      BlogPostModel.findPage({ limit: 10, offset: 0 }).then(([first]) => first),
      BlogPostModel.findById(row.id)
    ]);
    for (const result of [detail, listEntry, adminEntry]) {
      assert.equal(result.content_format, 'static_html');
      assert.equal(result.meta_title, 'SEO-Titel');
      assert.equal(result.og_description, 'OG-Beschreibung');
      assert.equal(result.image_alt, 'Passender Alternativtext');
      assert.equal(result.scheduled_at.toISOString(), '2026-07-13T16:00:00.000Z');
      assert.equal(result.review_version, 1);
    }
  } finally {
    pool.query = originalQuery;
  }
});
