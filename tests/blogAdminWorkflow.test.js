import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';

import BlogPostModel from '../models/BlogPostModel.js';
import { previewPost } from '../controllers/adminBlogController.js';
import { isAdmin } from '../middleware/auth.js';

function queryDb(rows = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows };
    }
  };
}

test('manuelles Create synchronisiert published, workflow_status und published_at atomar', async () => {
  const db = queryDb([{ id: 1, published: true, workflow_status: 'published' }]);
  await BlogPostModel.create({ title: 'Titel', content: '<p>Text</p>', hero_image: '/bild.webp' }, db);

  assert.match(db.calls[0].sql, /published,[\s\S]*workflow_status, published_at/i);
  assert.match(db.calls[0].sql, /CASE WHEN \$9 THEN 'published' ELSE 'draft' END/i);
  assert.match(db.calls[0].sql, /CASE WHEN \$9 THEN NOW\(\) ELSE NULL END/i);
});

test('manuelles Update leitet den Veröffentlichungszustand konsistent ab', async () => {
  const db = queryDb([{ id: 2, published: false, workflow_status: 'draft', published_at: null }]);
  await BlogPostModel.update(2, { title: 'Entwurf', published: false }, db);

  assert.match(db.calls[0].sql, /workflow_status = CASE WHEN generated_by_ai THEN 'needs_review' ELSE 'draft' END/i);
  assert.match(db.calls[0].sql, /published_at = NULL/i);

  const publishDb = queryDb([{ id: 2, published: true, workflow_status: 'published' }]);
  await BlogPostModel.update(2, { published: true }, publishDb);
  assert.match(publishDb.calls[0].sql, /workflow_status = 'published'/i);
  assert.match(publishDb.calls[0].sql, /published_at = COALESCE\(published_at, NOW\(\)\)/i);
});

test('Adminliste liest alle Beiträge, öffentliche Queries bleiben auf published begrenzt', async () => {
  const db = queryDb([{ id: 3, published: false, workflow_status: 'needs_review' }]);
  assert.equal((await BlogPostModel.findAllAdmin(db))[0].workflow_status, 'needs_review');
  assert.doesNotMatch(db.calls[0].sql, /WHERE published = true/i);

  const publicDb = queryDb([]);
  await BlogPostModel.findPage({ limit: 10, offset: 0 }, publicDb);
  assert.match(publicDb.calls[0].sql, /WHERE published = true/i);
});

test('Adminschutz blockiert die Draftvorschau ohne Adminsession', () => {
  let redirected;
  let nextCalls = 0;
  isAdmin({ session: {} }, { redirect(url) { redirected = url; } }, () => { nextCalls += 1; });
  assert.equal(redirected, '/login');
  assert.equal(nextCalls, 0);
});

test('statische Adminvorschau wertet kein EJS aus, sanitisiert und setzt noindex mit genau einer H1', async () => {
  delete globalThis.__adminDraftPayload;
  const originalFind = BlogPostModel.findById;
  BlogPostModel.findById = async () => ({
    id: 4,
    title: 'KI-Entwurf',
    published: false,
    workflow_status: 'needs_review',
    content_format: 'static_html',
    content: '<section><h1>Zweite H1</h1><p onclick="alert(1)"><%= globalThis.__adminDraftPayload = true %></p><script>alert(1)</script></section>'
  });
  let rendered;
  const res = {
    setHeader(name, value) { this.headers = { ...(this.headers || {}), [name]: value }; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; },
    render(view, locals) { rendered = { view, locals }; }
  };
  try {
    await previewPost({ params: { id: '4' } }, res);
  } finally {
    BlogPostModel.findById = originalFind;
  }

  assert.equal(globalThis.__adminDraftPayload, undefined);
  assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(rendered.view, 'admin/blogPreview');
  const $ = cheerio.load(`<h1>${rendered.locals.post.title}</h1>${rendered.locals.renderedContent}`);
  assert.equal($('h1').length, 1);
  assert.equal($('script').length, 0);
  assert.equal($('[onclick]').length, 0);
  assert.match($.text(), /<%= globalThis/);
});
