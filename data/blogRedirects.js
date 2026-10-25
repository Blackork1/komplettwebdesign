// Öffentliche Blog-Adressen. Die Artikel selbst bleiben in der Datenbank; hier steht nur,
// welche Adresse weiterleitet und welche Google nicht mehr zeigen soll. Rückgängig machen:
// Eintrag löschen.

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
export const canonicalBlogSlug = slug => (Object.hasOwn(BLOG_SLUG_ALIASES, slug) ? BLOG_SLUG_ALIASES[slug] : slug);
export const storedBlogSlug = slug => (Object.hasOwn(storedSlugs, slug) ? storedSlugs[slug] : slug);
export const withCanonicalBlogSlug = post => post ? { ...post, slug: canonicalBlogSlug(post.slug) } : post;

// Zusammengeführte Artikel (Blog-Bereinigung 25.10.2026): alte Adresse → neues Ziel, dauerhaft (301).
export const BLOG_REDIRECTS = Object.freeze({
  'website-kosten-2026-berlin-vergleich-2025': '/blog/website-kosten-2025-einfach-erklaert',
  // Gleiches Thema wie eine Haupt- oder Leistungsseite
  'webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist': '/',
  'full-service-webdesign-in-berlin': '/',
  'webdesign-lichtenberg-berlin': '/webdesign-berlin/lichtenberg',
  'festpreis-website-pakete-berlin-und-brandenburg': '/pakete',
  'landingpages-webshop-webdesign-berlin': '/leistungen/landingpage-erstellen-lassen',
  'immobilienmakler-website-erstelle': '/branchen/webdesign-immobilienmakler',
  'website-audit-relaunch-kmu-berlin-brandenburg': '/leistungen/website-audit',
  'wordpress-2025-deutschland-staerken-grenzen-empfehlungen': '/ratgeber/professionellen-website-vs-baukasten',
  // Sammelartikel Relaunch
  'website-relaunch-inhalte-nicht-loeschen-2026': '/blog/website-relaunch-berlin-checkliste',
  'website-relaunch-seo-ohne-sichtbarkeitsverlust-planen': '/blog/website-relaunch-berlin-checkliste',
  'relaunch-wegen-ki-suche': '/blog/website-relaunch-berlin-checkliste',
  // Sammelartikel Local SEO und Google-Profil
  'local-seo-berlin-fuer-freelancer': '/blog/lokale-seo-hacks-fuer-berlin',
  'local-seo-berlin-2026-website-profilsignale': '/blog/lokale-seo-hacks-fuer-berlin',
  'google-unternehmensprofil-website-lokale-signale-berlin-2026': '/blog/lokale-seo-hacks-fuer-berlin',
  'google-unternehmensprofil-website-widerspruch-berlin-brandenburg': '/blog/lokale-seo-hacks-fuer-berlin',
  // Sammelartikel KI-Suche
  'google-ai-overviews': '/blog/ki-suche-webdesign-2026',
  'google-ai-mode-und-ai-overviews': '/blog/ki-suche-webdesign-2026',
  'ki-sichtbarkeit-website-berlin-2026': '/blog/ki-suche-webdesign-2026',
  // Mehr Anfragen
  'von-traffic-zu-terminen': '/blog/mehr-anfragen-website-kontaktfehler-kmu-2026'
});

// Bleiben für Leser erreichbar, erscheinen aber nicht mehr bei Google, in der Sitemap oder in der Blogübersicht.
export const NOINDEX_BLOG_SLUGS = Object.freeze([
  'wordpress-68',
  'media-queries-vs-container-queries',
  'scroll-snap-galerie-zoom-on-view',
  '3d-interaktives-ux-design',
  'rising-ai-native-internet-semantic-retrieval',
  'ga4-tracking-framework',
  'google-ads-vs-meta-ads',
  'eigener-website-chatbot',
  'was-ist-webdesign-11-woechiger-guide',
  'woche-1-was-ist-webdesign',
  'woche-2-webdesign-arten-im-vergleich-statisch-dynamisch-cms-onepager',
  'woche-3-wichtigste-design-elemente',
  'woche-4-responsive-webdesign',
  'woche-5-ux-ui-design-der-unterschied-der-millionen-wert-ist'
]);

const redirectTargets = new Map(Object.entries(BLOG_REDIRECTS).map(([slug, target]) => [slug.toLowerCase(), target]));
const noindexSlugs = new Set(NOINDEX_BLOG_SLUGS.map((slug) => slug.toLowerCase()));
const publicKey = (slug) => String(canonicalBlogSlug(String(slug ?? ''))).toLowerCase();

// Ziel einer zusammengeführten Adresse, auch bei abweichender Groß-/Kleinschreibung oder altem Datenbank-Slug.
export function resolveBlogRedirect(slug) {
  return redirectTargets.get(publicKey(slug)) || null;
}

export function isNoindexBlogSlug(slug) {
  return noindexSlugs.has(publicKey(slug));
}

// Datenbank-Slugs für SQL-Filter: weitergeleitete Artikel werden nirgends mehr ausgeliefert,
// noindex-Artikel nur noch unter ihrer eigenen Adresse.
export const REDIRECTED_BLOG_SLUGS = Object.freeze(Object.keys(BLOG_REDIRECTS).map(storedBlogSlug));
export const UNLISTED_BLOG_SLUGS = Object.freeze([...REDIRECTED_BLOG_SLUGS, ...NOINDEX_BLOG_SLUGS.map(storedBlogSlug)]);
