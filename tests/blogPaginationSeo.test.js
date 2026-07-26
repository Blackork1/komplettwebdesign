import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import BlogPostModel from '../models/BlogPostModel.js';
import * as blogController from '../controllers/blogController.js';

const controller = readFileSync(new URL('../controllers/blogController.js', import.meta.url), 'utf8');
const template = readFileSync(new URL('../views/blog/index.ejs', import.meta.url), 'utf8');

test('Blogübersicht besitzt serverseitige indexierbare Paginierung', () => {
  assert.match(controller, /req\.query\.page/);
  assert.match(controller, /canonicalUrl/);
  assert.match(controller, /previousPageUrl/);
  assert.match(controller, /nextPageUrl/);
  assert.match(template, /rel="prev"/);
  assert.match(template, /rel="next"/);
  assert.match(template, /href="<%= nextPageUrl %>"/);
});

test('parseBlogPage normalisiert fehlende, ungültige und nicht-positive Werte', () => {
  assert.equal(typeof blogController.parseBlogPage, 'function');
  assert.equal(blogController.parseBlogPage(undefined), 1);
  assert.equal(blogController.parseBlogPage('3'), 3);
  assert.equal(blogController.parseBlogPage('0'), 1);
  assert.equal(blogController.parseBlogPage('-2'), 1);
  assert.equal(blogController.parseBlogPage('nicht-zahl'), 1);
});

test('parseBlogPage akzeptiert nur vollständige sichere positive Ganzzahlen', () => {
  assert.equal(blogController.parseBlogPage('2abc'), 1);
  assert.equal(blogController.parseBlogPage('2.5'), 1);
  assert.equal(blogController.parseBlogPage(' 2 '), 1);
  assert.equal(blogController.parseBlogPage(['2']), 1);
  assert.equal(blogController.parseBlogPage({ page: '2' }), 1);
  assert.equal(blogController.parseBlogPage(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.equal(blogController.parseBlogPage(String(Number.MAX_SAFE_INTEGER + 1)), 1);
  assert.equal(blogController.parseBlogPage('9'.repeat(200)), 1);
});

test('Blogseite zwei nutzt den absoluten Offset und seitenbezogene Metadaten', async () => {
  const originals = {
    findPage: BlogPostModel.findPage,
    countPublished: BlogPostModel.countPublished,
    findFeatured: BlogPostModel.findFeatured
  };
  const calls = [];
  BlogPostModel.findPage = async (options) => {
    calls.push(options);
    return [{ slug: 'artikel-11' }, { slug: 'artikel-12' }];
  };
  BlogPostModel.countPublished = async () => 25;
  BlogPostModel.findFeatured = async () => [];

  let rendered;
  try {
    await blogController.listPosts(
      { query: { page: '2' } },
      {
        locals: {
          packagePricing: {},
          canonicalBaseUrl: 'https://example.test/'
        },
        render(view, values) {
          rendered = { view, values };
          return rendered;
        }
      }
    );
  } finally {
    BlogPostModel.findPage = originals.findPage;
    BlogPostModel.countPublished = originals.countPublished;
    BlogPostModel.findFeatured = originals.findFeatured;
  }

  assert.deepEqual(calls, [{ limit: 10, offset: 10 }]);
  assert.equal(rendered.view, 'blog/index');
  assert.equal(rendered.values.canonicalUrl, 'https://example.test/blog?page=2');
  assert.equal(rendered.values.title, 'Webdesign- und SEO-Blog – Seite 2');
  assert.equal(
    rendered.values.description,
    'Weitere Artikel zu Webdesign, SEO, Performance und digitalen Angeboten auf Seite 2 des Komplett-Webdesign-Blogs.'
  );
  assert.equal(rendered.values.initialOffset, 12);
  assert.equal(rendered.values.previousPageUrl, '/blog');
  assert.equal(rendered.values.nextPageUrl, '/blog?page=3');
});

test('Blogseiten außerhalb des Bereichs liefern die 404-Seite', async () => {
  const originals = {
    findPage: BlogPostModel.findPage,
    countPublished: BlogPostModel.countPublished,
    findFeatured: BlogPostModel.findFeatured
  };
  let findPageCalls = 0;
  BlogPostModel.findPage = async () => {
    findPageCalls += 1;
    throw new Error('Für eine Seite außerhalb des Bereichs darf keine OFFSET-Abfrage laufen.');
  };
  BlogPostModel.countPublished = async () => 11;
  BlogPostModel.findFeatured = async () => [];

  let statusCode;
  let rendered;
  const response = {
    locals: {},
    status(value) {
      statusCode = value;
      return this;
    },
    render(view, values) {
      rendered = { view, values };
      return rendered;
    }
  };

  try {
    await blogController.listPosts({ query: { page: '3' } }, response);
  } finally {
    BlogPostModel.findPage = originals.findPage;
    BlogPostModel.countPublished = originals.countPublished;
    BlogPostModel.findFeatured = originals.findFeatured;
  }

  assert.equal(statusCode, 404);
  assert.equal(findPageCalls, 0);
  assert.deepEqual(rendered, {
    view: '404',
    values: {
      title: 'Blogseite nicht gefunden',
      description: 'Die angeforderte Blogseite existiert nicht.'
    }
  });
});

test('extrem große, aber sichere Seitenzahlen lösen keine OFFSET-Abfrage aus', async () => {
  const originals = {
    findPage: BlogPostModel.findPage,
    countPublished: BlogPostModel.countPublished,
    findFeatured: BlogPostModel.findFeatured
  };
  let findPageCalls = 0;
  BlogPostModel.findPage = async () => {
    findPageCalls += 1;
    throw new Error('Für eine unerreichbare Seite darf keine OFFSET-Abfrage laufen.');
  };
  BlogPostModel.countPublished = async () => 25;
  BlogPostModel.findFeatured = async () => [];

  let statusCode;
  try {
    await blogController.listPosts(
      { query: { page: String(Number.MAX_SAFE_INTEGER) } },
      {
        locals: {},
        status(value) {
          statusCode = value;
          return this;
        },
        render(view, values) {
          return { view, values };
        }
      }
    );
  } finally {
    BlogPostModel.findPage = originals.findPage;
    BlogPostModel.countPublished = originals.countPublished;
    BlogPostModel.findFeatured = originals.findFeatured;
  }

  assert.equal(statusCode, 404);
  assert.equal(findPageCalls, 0);
});
