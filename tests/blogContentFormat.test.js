import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import BlogPostModel from '../models/BlogPostModel.js';
import pool from '../util/db.js';
import { showPost } from '../controllers/blogController.js';

const controllerSource = readFileSync(new URL('../controllers/blogController.js', import.meta.url), 'utf8');
const viewSource = readFileSync(new URL('../views/blog/show.ejs', import.meta.url), 'utf8');

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

test('Controller trennt statisches HTML ausdrücklich vom Legacy-EJS-Pfad', () => {
  assert.match(controllerSource, /post\.content_format === 'static_html'/);
  assert.match(controllerSource, /sanitizeArticleHtml/);
  assert.match(controllerSource, /renderDbEjs/);
  assert.match(controllerSource, /post\.meta_title \|\| post\.title/);
  assert.match(controllerSource, /post\.meta_description \|\| post\.description/);
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
});

test('unbekanntes und null content_format bleiben rückwärtskompatibel im Legacy-EJS-Pfad', async () => {
  for (const contentFormat of [null, 'zukünftiges_format']) {
    const locals = await renderControllerPost(postFixture({
      content_format: contentFormat,
      content: '<section><p><%= post.title %></p></section>'
    }));
    assert.match(locals.renderedContent, /Sicherer Blogbeitrag/);
    assert.doesNotMatch(locals.renderedContent, /<%=/);
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

test('öffentliche View nutzt Bild-Alt-Fallback und enthält nur die Titel-H1', () => {
  assert.match(viewSource, /alt="<%= post\.image_alt \|\| post\.title %>"/);
  assert.equal((viewSource.match(/<h1\b/gi) || []).length, 1);
  assert.match(viewSource, /<%- renderedContent %>/);
});

test('öffentliche und Admin-Queries reichen neue Postfelder unverändert durch', async () => {
  const originalQuery = pool.query;
  const row = postFixture({
    meta_title: 'SEO-Titel',
    meta_description: 'SEO-Beschreibung',
    og_title: 'OG-Titel',
    og_description: 'OG-Beschreibung',
    content_format: 'static_html'
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
    }
  } finally {
    pool.query = originalQuery;
  }
});
