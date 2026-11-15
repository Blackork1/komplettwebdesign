export const BLOG_REDIRECTS = Object.freeze({
  'website-kosten-2026-berlin-vergleich-2025': 'website-kosten-2025-einfach-erklaert'
});

export const REDIRECTED_BLOG_SLUGS = Object.freeze(Object.keys(BLOG_REDIRECTS));

// Public aliases preserve stored article IDs, editorial history and comment relations.
export const BLOG_SLUG_ALIASES = Object.freeze({
  'GA4-Tracking-Framework': 'ga4-tracking-framework',
  'Google-AI-Mode-und-AI-Overviews': 'google-ai-mode-und-ai-overviews',
  'Landingpages-Webshop-Webdesign-Berlin': 'landingpages-webshop-webdesign-berlin',
  'Lokale-SEO-Hacks-fuer-Berlin': 'lokale-seo-hacks-fuer-berlin',
  'Scoll-Snapp-Galery-&-Zoom‑on‑View': 'scroll-snap-galerie-zoom-on-view',
  'website-checkliste-für-selbstandige': 'website-checkliste-fuer-selbststaendige'
});
const storedSlugs = Object.fromEntries(Object.entries(BLOG_SLUG_ALIASES).map(([stored, canonical]) => [canonical, stored]));
export const canonicalBlogSlug = slug => BLOG_SLUG_ALIASES[slug] || slug;
export const storedBlogSlug = slug => storedSlugs[slug] || slug;
export const withCanonicalBlogSlug = post => post ? { ...post, slug: canonicalBlogSlug(post.slug) } : post;
