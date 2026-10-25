import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import express from 'express';

import blogRoutes from '../routes/blogRoutes.js';
import {
  BLOG_REDIRECTS,
  NOINDEX_BLOG_SLUGS,
  REDIRECTED_BLOG_SLUGS,
  UNLISTED_BLOG_SLUGS,
  isNoindexBlogSlug,
  resolveBlogRedirect
} from '../data/blogRedirects.js';
import { SEO_RECOVERY_REDIRECTS } from '../data/seoIntentRegistry.js';
import { shouldNoindexPublicPath } from '../middleware/publicSeo.js';
import { rewriteLegacyInternalLinks } from '../util/legacyInternalLinks.js';
import { buildBlogPostPageModel } from '../services/blogPostPresentationService.js';

// Blog-Bereinigung vom 25.10.2026 (komplettwebdesign.de-audit-2026-10-25/BLOG-BEREINIGUNG.md)
const KEPT = [
  'website-kosten-2025-einfach-erklaert',
  'seo-fuer-blumenladen',
  'immobilienmakler-homepage-check',
  'chatgpt-agentenmodus',
  'website-relaunch-berlin-checkliste',
  'lokale-seo-hacks-fuer-berlin',
  'ki-suche-webdesign-2026',
  'mehr-anfragen-website-kontaktfehler-kmu-2026',
  'barrierefreiheit-2020-websites-leitfaden',
  'website-checkliste-fuer-selbststaendige'
];

async function request(path) {
  const app = express();
  app.use(blogRoutes);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    return await fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('19 Artikel werden zusammengeführt, 14 aus Google genommen, 10 bleiben', () => {
  const sources = Object.keys(BLOG_REDIRECTS);
  assert.equal(sources.length, 20, 'der Kostenartikel von 2026 leitete schon vorher weiter');
  assert.equal(NOINDEX_BLOG_SLUGS.length, 14);
  const all = [...sources, ...NOINDEX_BLOG_SLUGS, ...KEPT];
  assert.equal(new Set(all).size, all.length, 'jeder Artikel steht in genau einer Gruppe');
  for (const slug of KEPT) {
    assert.equal(resolveBlogRedirect(slug), null, slug);
    assert.equal(isNoindexBlogSlug(slug), false, slug);
  }
});

test('Weiterleitungen führen direkt auf eine Seite, die selbst nicht weiterleitet oder versteckt ist', () => {
  for (const [slug, target] of Object.entries(BLOG_REDIRECTS)) {
    assert.match(target, /^\/[a-z0-9/-]*$/, slug);
    assert.equal(SEO_RECOVERY_REDIRECTS[target], undefined, `${slug} → ${target} wäre eine Kette`);
    if (target.startsWith('/blog/')) {
      const targetSlug = target.slice('/blog/'.length);
      assert.equal(resolveBlogRedirect(targetSlug), null, `${slug} → ${target} wäre eine Kette`);
      assert.equal(isNoindexBlogSlug(targetSlug), false, `${slug} → ${target} ist noindex`);
      assert.ok(KEPT.includes(targetSlug), `${target} ist kein Sammelartikel`);
    }
  }
});

test('Registry und Blogliste sind sich bei jeder Blog-Weiterleitung einig', () => {
  const registryBlogRedirects = Object.entries(SEO_RECOVERY_REDIRECTS).filter(([path]) => path.startsWith('/blog/'));
  assert.ok(registryBlogRedirects.length >= 3);
  for (const [path, target] of registryBlogRedirects) {
    assert.equal(BLOG_REDIRECTS[path.slice('/blog/'.length)], target, path);
  }
  assert.equal(BLOG_REDIRECTS['webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist'], '/');
  assert.equal(BLOG_REDIRECTS['webdesign-lichtenberg-berlin'], '/webdesign-berlin/lichtenberg');
});

test('alte Datenbank-Slugs und Großschreibung leiten ebenfalls direkt aufs Ziel', () => {
  assert.equal(resolveBlogRedirect('Landingpages-Webshop-Webdesign-Berlin'), '/leistungen/landingpage-erstellen-lassen');
  assert.equal(resolveBlogRedirect('Google-AI-Mode-und-AI-Overviews'), '/blog/ki-suche-webdesign-2026');
  assert.equal(resolveBlogRedirect('Full-Service-Webdesign-in-Berlin'), '/');
  assert.equal(resolveBlogRedirect('constructor'), null);
  assert.equal(resolveBlogRedirect(undefined), null);
  assert.ok(REDIRECTED_BLOG_SLUGS.includes('Landingpages-Webshop-Webdesign-Berlin'), 'SQL filtert den gespeicherten Slug');
  assert.ok(REDIRECTED_BLOG_SLUGS.includes('Google-AI-Mode-und-AI-Overviews'));
  assert.ok(UNLISTED_BLOG_SLUGS.includes('GA4-Tracking-Framework'));
  assert.ok(UNLISTED_BLOG_SLUGS.includes('Scoll-Snapp-Galery-&-Zoom‑on‑View'));
  assert.ok(UNLISTED_BLOG_SLUGS.includes('woche-1-was-ist-webdesign'));
});

test('die Blogroute antwortet mit 301 aufs Ziel und behält Abfrageparameter', async () => {
  for (const [path, location] of [
    ['/blog/full-service-webdesign-in-berlin', '/'],
    ['/blog/webdesign-lichtenberg-berlin?utm_source=x', '/webdesign-berlin/lichtenberg?utm_source=x'],
    ['/blog/Landingpages-Webshop-Webdesign-Berlin', '/leistungen/landingpage-erstellen-lassen'],
    ['/blog/google-unternehmensprofil-website-widerspruch-berlin-brandenburg', '/blog/lokale-seo-hacks-fuer-berlin'],
    ['/blog/website-kosten-2026-berlin-vergleich-2025', '/blog/website-kosten-2025-einfach-erklaert'],
    ['/blog/GA4-Tracking-Framework', '/blog/ga4-tracking-framework'],
    ['/blog/Lokale-SEO-Hacks-fuer-Berlin', '/blog/lokale-seo-hacks-fuer-berlin']
  ]) {
    const response = await request(path);
    assert.equal(response.status, 301, path);
    assert.equal(response.headers.get('location'), location, path);
  }
});

test('noindex-Artikel bleiben erreichbar, Google bekommt noindex per Header und Meta-Tag', () => {
  assert.equal(shouldNoindexPublicPath('/blog/woche-1-was-ist-webdesign'), true);
  assert.equal(shouldNoindexPublicPath('/blog/ga4-tracking-framework'), true);
  assert.equal(shouldNoindexPublicPath('/blog/Scoll-Snapp-Galery-%26-Zoom%E2%80%91on%E2%80%91View'), true);
  assert.equal(shouldNoindexPublicPath('/blog/%E0%A4%A'), false, 'kaputte Kodierung wirft keinen Fehler');
  assert.equal(shouldNoindexPublicPath('/blog/website-kosten-2025-einfach-erklaert'), false);
  assert.equal(shouldNoindexPublicPath('/blog'), false);

  const base = {
    id: 1,
    title: 'Titel',
    content: '<h2>Abschnitt</h2><p>Text</p>',
    content_format: 'static_html',
    excerpt: 'Auszug',
    image_url: '/images/blog.webp',
    faq_json: [],
    created_at: new Date('2026-01-10T08:00:00Z'),
    updated_at: new Date('2026-01-10T09:00:00Z')
  };
  const render = (slug) => buildBlogPostPageModel({ post: { ...base, slug }, pricing: {}, canonicalBaseUrl: 'https://www.komplettwebdesign.de' });
  assert.equal(render('woche-4-responsive-webdesign').robots, 'noindex,follow');
  assert.equal(render('ga4-tracking-framework').robots, 'noindex,follow');
  assert.match(render('seo-fuer-blumenladen').robots, /^index,follow/);
});

test('Links in Artikeltexten auf zusammengeführte Artikel zeigen direkt aufs Ziel', () => {
  const out = rewriteLegacyInternalLinks([
    '<a href="/blog/google-ai-overviews">A</a>',
    '<a href="/blog/Landingpages-Webshop-Webdesign-Berlin">B</a>',
    '<a href="https://www.komplettwebdesign.de/blog/relaunch-wegen-ki-suche#teil">C</a>',
    '<a href="/blog/seo-fuer-blumenladen">D</a>',
    '<a href="/blog/woche-2-webdesign-arten-im-vergleich-statisch-dynamisch-cms-onepager">E</a>'
  ].join(' '));
  assert.match(out, /href="\/blog\/ki-suche-webdesign-2026">A/);
  assert.match(out, /href="\/leistungen\/landingpage-erstellen-lassen">B/);
  assert.match(out, /href="\/blog\/website-relaunch-berlin-checkliste">C/);
  assert.match(out, /href="\/blog\/seo-fuer-blumenladen">D/);
  assert.match(out, /href="\/blog\/woche-2-webdesign-arten-im-vergleich-statisch-dynamisch-cms-onepager">E/, 'noindex-Artikel bleiben verlinkbar');
});

test('fest eingebaute Links zeigen nicht mehr auf zusammengeführte Artikel', () => {
  const root = new URL('../', import.meta.url);
  const skip = new Set(['data/blogRedirects.js', 'data/seoIntentRegistry.js', 'data/seoMetaOverrides.js', 'services/seoAuditContentCorrections.js']);
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(new URL(dir, root))) {
      const rel = `${dir}${name}`;
      if (statSync(new URL(rel, root)).isDirectory()) walk(`${rel}/`);
      else if (/\.(js|ejs|txt|md)$/.test(name) && !skip.has(rel)) files.push(rel);
    }
  };
  ['views/', 'data/', 'controllers/', 'helpers/', 'services/'].forEach(walk);
  files.push('public/llms.txt');
  const sources = Object.keys(BLOG_REDIRECTS);
  for (const file of files) {
    const text = readFileSync(new URL(file, root), 'utf8').toLowerCase();
    for (const slug of sources) {
      assert.ok(!text.includes(`/blog/${slug}"`) && !text.includes(`/blog/${slug}'`) && !text.includes(`/blog/${slug})`), `${file} verlinkt /blog/${slug}`);
    }
  }
});
