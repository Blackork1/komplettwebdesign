// Kürzere Title-Tags für Seiten, deren Titel aus der Datenbank kommt (Blog, Branchen, Ratgeber).
// Die Überschrift (H1) bleibt unverändert. Der kurze Title greift nur, solange der gespeicherte
// Titel länger als SEO_TITLE_MAX_LENGTH ist. So behält eine spätere Änderung im Adminbereich Vorrang.

export const SEO_TITLE_MAX_LENGTH = 65;

export const SHORT_SEO_TITLES = Object.freeze({
  '/blog/barrierefreiheit-2020-websites-leitfaden': 'BFSG 2025: Anforderungen an barrierefreie Websites',
  '/blog/eigener-website-chatbot': 'Website-Chatbot einrichten: Mehr Anfragen generieren',
  '/blog/full-service-webdesign-in-berlin': 'Full-Service-Webdesign Berlin: Design, SEO und Wartung',
  '/blog/google-ads-vs-meta-ads': 'Google Ads vs. Meta Ads: Was bringt Berliner KMU Leads?',
  '/blog/google-ai-mode-und-ai-overviews': 'Google AI Mode und AI Overviews: Was sich für SEO ändert',
  '/blog/google-ai-overviews': 'Google AI Overviews in Deutschland: Folgen für SEO',
  '/blog/immobilienmakler-homepage-check': 'Immobilienmakler-Homepage-Check: Ist deine Website modern?',
  '/blog/immobilienmakler-website-erstelle': 'Immobilienmakler-Website erstellen: moderne Homepage',
  '/blog/landingpages-webshop-webdesign-berlin': 'Landingpages & Webshop-Webdesign Berlin: Zwei Praxisfälle',
  '/blog/local-seo-berlin-fuer-freelancer': 'Local SEO Berlin für Freelancer und kleine Unternehmen',
  '/blog/lokale-seo-hacks-fuer-berlin': 'Lokale SEO Berlin: 10 Tipps fürs Google-Unternehmensprofil',
  '/blog/scroll-snap-galerie-zoom-on-view': 'Micro-Motion-Design: Scroll-Snap-Galerie mit Zoom-on-View',
  '/blog/von-traffic-zu-terminen': 'Marketing-Funnel für KMU: Von Website-Traffic zu Terminen',
  '/blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist': 'Webdesign Berlin: Warum eine Website für Firmen wichtig ist',
  // Die kommerzielle Suche „Webdesign Lichtenberg“ gehört zur Bezirksseite, nicht zum Blogbeitrag.
  '/blog/webdesign-lichtenberg-berlin': 'Lokale Unternehmen in Lichtenberg: Warum eine Website zählt',
  '/blog/woche-1-was-ist-webdesign': 'Was ist Webdesign? Definition, Geschichte und Grundlagen',
  '/blog/woche-3-wichtigste-design-elemente': 'Design-Elemente im Webdesign: Layout, Farbe, Typografie',
  '/blog/wordpress-68': 'WordPress 6.8: Neue Features, Performance und Sicherheit',
  '/branchen/webdesign-reinigung': 'Website für Reinigungsfirmen in Berlin erstellen lassen',
  '/branchen/webdesign-restaurant': 'Restaurant-Website Berlin: Speisekarte & Reservierung',
  '/ratgeber/homepage-checker-website-check': 'Homepage-Checker 2026: Ist deine Website noch modern?',
  '/ratgeber/was-ist-seo': 'Was ist SEO? Einfach erklärt für kleine Unternehmen'
});

export function resolveSeoTitle(pathname, storedTitle) {
  if (String(storedTitle ?? '').trim().length <= SEO_TITLE_MAX_LENGTH) return storedTitle;
  return SHORT_SEO_TITLES[String(pathname || '').toLowerCase()] || storedTitle;
}
