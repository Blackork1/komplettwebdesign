import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';

import BlogPostModel from '../models/BlogPostModel.js';
import { deletePost, previewPost, updatePost } from '../controllers/adminBlogController.js';
import { isAdmin } from '../middleware/auth.js';
import { readFileSync } from 'node:fs';

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

function sequenceDb(results = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      const next = results.shift();
      if (next instanceof Error) throw next;
      return next || { rows: [] };
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
  assert.match(publishDb.calls[0].sql, /generated_by_ai = FALSE OR published = TRUE/i);
  assert.doesNotMatch(publishDb.calls[0].sql, /reviewed_by/i);
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

test('der alte Blogeditor verweigert das Veröffentlichen eines KI-Entwurfs', async () => {
  const originalFind = BlogPostModel.findById;
  const originalUpdate = BlogPostModel.update;
  let updateCalls = 0;
  BlogPostModel.findById = async () => ({
    id: 8,
    generated_by_ai: true,
    published: false
  });
  BlogPostModel.update = async () => { updateCalls += 1; };
  const res = {
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; }
  };
  try {
    await updatePost({
      params: { id: '8' },
      body: { publication_control: '1', published: 'on' }
    }, res);
  } finally {
    BlogPostModel.findById = originalFind;
    BlogPostModel.update = originalUpdate;
  }

  assert.equal(updateCalls, 0);
  assert.equal(res.statusCode, 409);
  assert.match(res.body, /\/admin\/content-agent\/drafts\/8\/edit/);
});

test('der alte Blogeditor zeigt für KI-Entwürfe keinen Veröffentlichungsschalter', () => {
  const editView = readFileSync(new URL('../views/admin/editPost.ejs', import.meta.url), 'utf8');
  assert.match(editView, /if \(!\(post\.generated_by_ai && !post\.published\)\)/);
  assert.match(editView, /Content-Agent-Review/);
});

test('BlogPostModel verweigert das Löschen eines Posts mit Publish-Events fachlich', async () => {
  const db = sequenceDb([
    { rows: [] },
    { rows: [{ post_exists: true, publish_event_exists: true }] }
  ]);

  await assert.rejects(
    BlogPostModel.delete(9, db),
    (error) => error.code === 'BLOG_POST_DELETE_RESTRICTED'
  );

  assert.match(db.calls[0].sql, /DELETE FROM posts/i);
  assert.match(db.calls[0].sql, /NOT EXISTS[\s\S]*content_publish_events/i);
  assert.match(db.calls[1].sql, /EXISTS[\s\S]*content_publish_events/i);
});

test('BlogPostModel mappt auch ein FK-Race beim Löschen auf den fachlichen Konflikt', async () => {
  const foreignKeyError = Object.assign(new Error('interner FK-Name'), {
    code: '23503',
    constraint: 'content_publish_events_post_id_fkey'
  });
  const db = sequenceDb([foreignKeyError]);

  await assert.rejects(
    BlogPostModel.delete(9, db),
    (error) => error.code === 'BLOG_POST_DELETE_RESTRICTED'
      && !error.message.includes('content_publish_events_post_id_fkey')
  );
});

test('Legacy-Delete antwortet bei Publish-Events mit sicherem 409 statt Datenbank-500', async () => {
  const originalDelete = BlogPostModel.delete;
  BlogPostModel.delete = async () => {
    throw Object.assign(new Error('interner Datenbankkontext'), {
      code: 'BLOG_POST_DELETE_RESTRICTED'
    });
  };
  const res = {
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; }
  };
  try {
    await deletePost({ params: { id: '9' } }, res);
  } finally {
    BlogPostModel.delete = originalDelete;
  }

  assert.equal(res.statusCode, 409);
  assert.match(res.body, /Veröffentlichungsprotokoll/i);
  assert.doesNotMatch(res.body, /interner Datenbankkontext/i);
});

test('alle Legacy-Blogformulare senden das CSRF-Token', () => {
  for (const relativePath of [
    '../views/admin/newPost.ejs',
    '../views/admin/editPost.ejs',
    '../views/admin/blogList.ejs'
  ]) {
    const view = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    const formCount = (view.match(/<form\b/gi) || []).length;
    const tokenCount = (view.match(/name=["']_csrf["']/gi) || []).length;
    assert.equal(tokenCount, formCount, `CSRF-Feld fehlt in ${relativePath}`);
  }
});
