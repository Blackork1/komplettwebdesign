import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import ejs from 'ejs';

import { createAdminContentAgentController } from '../controllers/adminContentAgentController.js';
import { buildBlogPostPageModel } from '../services/blogPostPresentationService.js';
import { escapeJsonForHtml } from '../util/security.js';

const blogViewPath = fileURLToPath(new URL('../views/blog/show.ejs', import.meta.url));

function post(overrides = {}) {
  return {
    id: 12,
    title: 'Unveröffentlichter Entwurf',
    slug: 'geheimer-entwurf',
    excerpt: 'Frontendnahe Vorschau',
    description: 'Frontendnahe Vorschau',
    content: [
      '<h2>Datenschutz &amp; Cookies</h2><p>Erste Aussage.</p>',
      '<h2>Datenschutz &amp; Cookies</h2><p>Zweite Aussage.</p>'
    ].join(''),
    content_format: 'static_html',
    generated_by_ai: true,
    published: false,
    workflow_status: 'needs_review',
    image_url: '/images/default-blog.webp',
    image_alt: 'Vorschaubild',
    faq_json: [],
    meta_title: 'Vorschau: Entwurf',
    meta_description: 'Sichere Beschreibung der geschützten Entwurfsvorschau.',
    og_title: 'Nicht öffentlich',
    og_description: 'Nicht öffentlich',
    created_at: new Date('2026-07-11T08:00:00.000Z'),
    updated_at: new Date('2026-07-11T09:00:00.000Z'),
    ...overrides
  };
}

const riskReview = {
  blocked: true,
  sourceCount: 1,
  items: [
    {
      code: 'privacy_claim', section: 'Datenschutz & Cookies',
      anchor: 'pruefung-datenschutz-und-cookies', excerpt: 'Erste Aussage.',
      reason: 'Aussage prüfen.', instruction: 'Quelle prüfen.', verificationType: 'privacy',
      sourceRequired: true, blocking: true
    },
    {
      code: 'privacy_claim_2', section: 'Datenschutz & Cookies',
      anchor: 'pruefung-datenschutz-und-cookies-2', excerpt: 'Zweite Aussage.',
      reason: 'Zweite Aussage prüfen.', instruction: 'Zweite Quelle prüfen.', verificationType: 'privacy',
      sourceRequired: true, blocking: true
    },
    {
      code: '<img src=x onerror=alert(1)>', section: '<script>falsch</script>',
      anchor: '" onmouseover="alert(1)', reason: '<script>alert(1)</script>',
      instruction: '<img src=x onerror=alert(2)>', verificationType: 'none', blocking: true
    }
  ]
};

function response() {
  return {
    locals: { packagePricing: {}, canonicalBaseUrl: 'https://example.test' },
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
    render(view, locals) { this.view = view; this.renderLocals = locals; return this; }
  };
}

test('Adminvorschau verwendet öffentliches Bloglayout ohne Kommentare und setzt noindex', async () => {
  const draft = { post: post(), metadata: { quality_report_json: { focusedReview: riskReview } } };
  const controller = createAdminContentAgentController({
    adminRepository: {}, settingsRepository: {}, jobRepository: {}, runtimeConfig: {}, presentation: {},
    draftService: { async getDraftForReview() { return draft; } },
    blogPostPresentation: { buildBlogPostPageModel }
  });
  const res = response();

  await controller.draftPreviewPage({ params: { id: '12' } }, res, assert.fail);

  assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(res.view, 'blog/show');
  assert.equal(res.renderLocals.previewMode, true);
  assert.equal(res.renderLocals.showComments, false);
  assert.equal(res.renderLocals.disableTracking, true);
  assert.match(res.renderLocals.seoExtra, /noindex,nofollow/);
});

test('Vorschau behauptet keine geschützte Draft-URL in Canonical, OG oder strukturierten Daten', () => {
  const model = buildBlogPostPageModel({
    post: post(), metadata: { quality_report_json: { focusedReview: riskReview } },
    previewMode: true, canonicalBaseUrl: 'https://example.test', pricing: {}
  });

  assert.equal(model.canonicalUrl, 'https://example.test/blog');
  assert.doesNotMatch(model.seoExtra, /geheimer-entwurf/);
  assert.doesNotMatch(JSON.stringify(model.structuredDataBlocks), /geheimer-entwurf|Unveröffentlichter Entwurf/);
  assert.equal(model.robots, 'noindex,nofollow');
});

test('Vorschau rendert Banner und Risikoziele, aber keine Formulare, Kommentare oder Trackinglogik', async () => {
  const model = buildBlogPostPageModel({
    post: post(), metadata: { quality_report_json: { focusedReview: riskReview } },
    previewMode: true, canonicalBaseUrl: 'https://example.test', pricing: {}
  });
  const assetUrl = (file) => `/${file}?v=test`;
  const html = await ejs.renderFile(blogViewPath, {
    ...model,
    asset: assetUrl,
    assetVersion: 'test',
    canonicalBaseUrl: 'https://example.test',
    csrfToken: 'csrf',
    cssAsset: assetUrl,
    currentPathname: '/admin/content-agent/drafts/12/preview',
    currentSearch: '',
    disableInteractionPolish: true,
    escapeJsonForHtml,
    footerNavigation: [],
    headerCta: null,
    headerNavigation: [],
    jsAsset: assetUrl,
    lng: 'de',
    trackingContext: {}
  });
  const $ = cheerio.load(html);

  assert.equal($('.content-agent-preview-banner').length, 1);
  assert.equal($('a[href="/admin/content-agent/drafts/12/edit"]').length, 1);
  assert.equal($('#blog-comments').length, 0);
  assert.equal($('form').length, 0);
  assert.equal($('script[src*="blog-comments"], script[src*="tracking"], script[src*="cookie-consent"]').length, 0);
  assert.equal($('[id="pruefung-datenschutz-und-cookies"]').length, 1);
  assert.equal($('[id="pruefung-datenschutz-und-cookies-2"]').length, 1);
  assert.equal($('[id]').toArray().length, new Set($('[id]').toArray().map((el) => $(el).attr('id'))).size);
  assert.equal($('script').filter((_, el) => $(el).text().includes('alert(1)')).length, 0);
});

test('öffentliche Seite zeigt weder Review-Banner noch Risikochecklist und behält Kommentare', async () => {
  const model = buildBlogPostPageModel({
    post: post({ published: true, workflow_status: 'published', slug: 'oeffentlich' }),
    metadata: { quality_report_json: { focusedReview: riskReview } },
    previewMode: false, canonicalBaseUrl: 'https://example.test', pricing: {}
  });

  assert.equal(model.previewMode, false);
  assert.equal(model.riskReview, null);
  assert.equal(model.showComments, true);
  assert.doesNotMatch(model.renderedContent, /pruefung-datenschutz/);
});

test('Legacy-EJS wird ausschließlich im öffentlichen legacy_ejs-Pfad ausgeführt', () => {
  const legacy = post({
    published: true,
    workflow_status: 'published',
    content_format: 'legacy_ejs',
    content: '<p><%= post.title %></p>'
  });
  const publicModel = buildBlogPostPageModel({ post: legacy, previewMode: false, canonicalBaseUrl: 'https://example.test' });
  assert.match(publicModel.renderedContent, /Unveröffentlichter Entwurf/);

  assert.throws(
    () => buildBlogPostPageModel({ post: legacy, previewMode: true, canonicalBaseUrl: 'https://example.test' }),
    (error) => error.code === 'CONTENT_DRAFT_NOT_FOUND'
  );
  assert.throws(() => buildBlogPostPageModel({
    post: { ...legacy, content_format: 'zukünftig', content: '<%= globalThis.__unknownFormatPayload = true %>' },
    previewMode: false, canonicalBaseUrl: 'https://example.test'
  }), (error) => error.code === 'CONTENT_POST_NOT_FOUND');
  assert.equal(globalThis.__unknownFormatPayload, undefined);
});

test('reservierter Gesamtartikel-Wrapper kollidiert nicht mit echten gleichnamigen Überschriften', async () => {
  const collisionPost = post({
    content: [
      '<h2>Gesamter Artikel</h2><p>Erste konkrete Fundstelle.</p>',
      '<h2>Gesamter Artikel</h2><p>Zweite konkrete Fundstelle.</p>'
    ].join('')
  });
  const collisionReview = {
    blocked: true,
    items: [
      {
        code: 'first', section: 'Gesamter Artikel', anchor: 'pruefung-gesamter-artikel',
        excerpt: 'Erste konkrete Fundstelle.', reason: 'Erste prüfen.', instruction: 'Erste prüfen.', blocking: true
      },
      {
        code: 'second', section: 'Gesamter Artikel', anchor: 'pruefung-gesamter-artikel-2',
        excerpt: 'Zweite konkrete Fundstelle.', reason: 'Zweite prüfen.', instruction: 'Zweite prüfen.', blocking: true
      }
    ]
  };
  const model = buildBlogPostPageModel({
    post: collisionPost,
    metadata: { quality_report_json: { focusedReview: collisionReview } },
    previewMode: true,
    canonicalBaseUrl: 'https://example.test',
    pricing: {}
  });
  const assetUrl = (file) => `/${file}?v=test`;
  const html = await ejs.renderFile(blogViewPath, {
    ...model,
    asset: assetUrl,
    assetVersion: 'test',
    canonicalBaseUrl: 'https://example.test',
    csrfToken: 'csrf',
    cssAsset: assetUrl,
    currentPathname: '/admin/content-agent/drafts/12/preview',
    currentSearch: '',
    escapeJsonForHtml,
    footerNavigation: [],
    headerCta: null,
    headerNavigation: [],
    jsAsset: assetUrl,
    lng: 'de',
    trackingContext: {}
  });
  const $ = cheerio.load(html);
  const ids = $('[id]').toArray().map((element) => $(element).attr('id'));
  const links = $('.content-agent-risk-checklist a').toArray();

  assert.equal(ids.length, new Set(ids).size);
  assert.equal($('#pruefung-gesamter-artikel').prop('tagName'), 'DIV');
  assert.equal($('#pruefung-gesamter-artikel-2').next('p').text(), 'Erste konkrete Fundstelle.');
  assert.equal($('#pruefung-gesamter-artikel-3').next('p').text(), 'Zweite konkrete Fundstelle.');
  assert.deepEqual(links.map((element) => $(element).attr('href')), [
    '#pruefung-gesamter-artikel-2',
    '#pruefung-gesamter-artikel-3'
  ]);
  assert.deepEqual(links.map((element) => $($(element).attr('href')).next('p').text()), [
    'Erste konkrete Fundstelle.',
    'Zweite konkrete Fundstelle.'
  ]);
});
