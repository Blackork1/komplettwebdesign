// Blog- und Ratgebertexte liegen in der Datenbank und enthalten teils Links auf Seiten, die inzwischen
// weiterleiten. Beim Ausliefern zeigen sie direkt aufs Ziel, ohne Umweg über die Weiterleitung.
import { SEO_RECOVERY_REDIRECTS } from '../data/seoIntentRegistry.js';
import { BLOG_REDIRECTS, BLOG_SLUG_ALIASES } from '../data/blogRedirects.js';

// Zusammengeführte Blogartikel, auch unter ihrem alten Datenbank-Slug, und alte Slugs mit neuer Adresse.
const BLOG_LINK_TARGETS = Object.fromEntries([
  ...Object.entries(BLOG_SLUG_ALIASES)
    .filter(([stored, canonical]) => stored.toLowerCase() !== canonical && !BLOG_REDIRECTS[canonical])
    .map(([stored, canonical]) => [`/blog/${stored}`, `/blog/${canonical}`]),
  ...Object.entries(BLOG_REDIRECTS).map(([slug, target]) => [`/blog/${slug}`, target]),
  ...Object.entries(BLOG_SLUG_ALIASES)
    .filter(([, canonical]) => BLOG_REDIRECTS[canonical])
    .map(([stored, canonical]) => [`/blog/${stored}`, BLOG_REDIRECTS[canonical]])
]);

const EXTRA_LINK_TARGETS = Object.freeze({
  '/en/webdesign-berlin': '/en',
  '/demo/cq-compare': '/demo/cq-compare'
});

function buildTargets() {
  const targets = new Map();
  for (const [from, to] of Object.entries({ ...BLOG_LINK_TARGETS, ...SEO_RECOVERY_REDIRECTS, ...EXTRA_LINK_TARGETS })) {
    targets.set(from.replace(/\/+$/, '').toLowerCase() || '/', to);
  }
  return targets;
}

const LINK_TARGETS = buildTargets();
const HREF_PATTERN = /(\bhref\s*=\s*)(["'])(?:https?:\/\/(?:www\.)?komplettwebdesign\.de)?(\/[^"'?#\s]*)(\?[^"'#\s]*)?(#[^"'\s]*)?\2/gi;

export function resolveLegacyInternalLink(path) {
  const key = String(path || '').replace(/\/+$/, '').toLowerCase() || '/';
  return LINK_TARGETS.get(key) || null;
}

export function rewriteLegacyInternalLinks(html) {
  const source = String(html ?? '');
  if (!source) return source;
  return source.replace(HREF_PATTERN, (match, prefix, quote, path, query = '', hash = '') => {
    const target = resolveLegacyInternalLink(path);
    if (!target) return match;
    // Anker der alten Seite passen nicht zur neuen; Abfrageparameter bleiben erhalten.
    return `${prefix}${quote}${target}${query}${quote}`;
  });
}
