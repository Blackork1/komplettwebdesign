// Kürzere Title-Tags und Meta-Descriptions für Seiten, deren Texte aus der Datenbank kommen
// (Blog, Branchen, Ratgeber). Die sichtbaren Inhalte bleiben unverändert. Die Kurzfassung greift nur,
// solange der gespeicherte Text zu lang ist. So behält eine spätere Änderung im Adminbereich Vorrang.

export const SEO_TITLE_MAX_LENGTH = 65;

// Feste Titel und Überschriften: gelten immer, auch wenn der gespeicherte Text kurz genug ist.
// Einsatz nur, wo ein Beitrag sonst mit einer Hauptseite um denselben Suchbegriff konkurriert.
export const FORCED_SEO_TITLES = Object.freeze({
  // „Webdesign Berlin“ gehört zur Startseite, der Beitrag beantwortet die Frage nach dem Warum.
  '/blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist': 'Warum Berliner Unternehmen eine eigene Website brauchen'
});

export const FORCED_HEADLINES = Object.freeze({
  '/blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist': 'Warum Berliner Unternehmen eine professionelle Website brauchen',
  // „Webdesign Lichtenberg“ gehört zur Bezirksseite /webdesign-berlin/lichtenberg.
  '/blog/webdesign-lichtenberg-berlin': 'Warum Betriebe in Lichtenberg eine eigene Website brauchen'
});

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
  // Die kommerzielle Suche „Webdesign Lichtenberg“ gehört zur Bezirksseite, nicht zum Blogbeitrag.
  '/blog/webdesign-lichtenberg-berlin': 'Lokale Unternehmen in Lichtenberg: Warum eine Website zählt',
  '/blog/woche-1-was-ist-webdesign': 'Was ist Webdesign? Definition, Geschichte und Grundlagen',
  '/blog/woche-3-wichtigste-design-elemente': 'Design-Elemente im Webdesign: Layout, Farbe, Typografie',
  '/blog/wordpress-68': 'WordPress 6.8: Neue Features, Performance und Sicherheit',
  '/branchen/webdesign-reinigung': 'Website für Reinigungsfirmen in Berlin erstellen lassen',
  '/branchen/webdesign-restaurant': 'Restaurant-Website Berlin: Speisekarte & Reservierung',
  // Checkliste zum Selbstprüfen; das Tool-Ranking für „Webseite testen“ gehört zu /website-tester.
  '/ratgeber/homepage-checker-website-check': 'Homepage-Check 2026: Checkliste für eine moderne Website',
  '/ratgeber/was-ist-seo': 'Was ist SEO? Einfach erklärt für kleine Unternehmen'
});

export function resolveSeoTitle(pathname, storedTitle) {
  const key = String(pathname || '').toLowerCase();
  if (FORCED_SEO_TITLES[key]) return FORCED_SEO_TITLES[key];
  if (String(storedTitle ?? '').trim().length <= SEO_TITLE_MAX_LENGTH) return storedTitle;
  return SHORT_SEO_TITLES[key] || storedTitle;
}

export function resolveHeadline(pathname, storedHeadline) {
  return FORCED_HEADLINES[String(pathname || '').toLowerCase()] || storedHeadline;
}

export const SEO_DESCRIPTION_MAX_LENGTH = 160;

export const SHORT_SEO_DESCRIPTIONS = Object.freeze({
  '/blog/chatgpt-agentenmodus': 'Was der ChatGPT-Agentenmodus ist, wie der Assistent selbstständig klickt, scrollt und tippt und wie du den Modus Schritt für Schritt aktivierst.',
  '/blog/eigener-website-chatbot': 'Ein eigener Website-Chatbot beantwortet Fragen zu deinen Inhalten, qualifiziert Anfragen und bucht Termine. Datenschutzbewusst geplant für KMU in Berlin.',
  '/blog/immobilienmakler-homepage-check': 'Prüfe deine Makler-Website mit dieser Checkliste: Ist sie modern, mobil gut bedienbar, vertrauenswürdig und aktuell? Mit Ablaufplan und Maßnahmen.',
  '/blog/immobilienmakler-website-erstelle': 'Warum Immobilienmakler eine eigene Website brauchen, welche Funktionen sinnvoll sind, welche Kosten entstehen und wie die Homepage schnell online geht.',
  '/blog/ki-suche-webdesign-2026': 'KI verändert, wie Kunden nach Firmen suchen. Was gutes Webdesign 2026 leisten muss, damit deine Website bei Google und in KI-Antworten sichtbar bleibt.',
  '/blog/landingpages-webshop-webdesign-berlin': 'Zwei Praxisfälle aus Berlin: wie Landingpages und Webshops geplant, umgesetzt und gemessen werden, von der Recherche bis zum Go-live.',
  '/blog/rising-ai-native-internet-semantic-retrieval': 'AI-Native Internet und Semantic Retrieval: Wie semantische Content-Abschnitte und JSON-LD deine Website für KI-Suchsysteme auffindbar machen.',
  '/blog/scroll-snap-galerie-zoom-on-view': 'Bilder beim Sichtbarwerden dezent zoomen: eine Scroll-Snap-Galerie mit CSS und Intersection Observer, inklusive Fallback für ältere Browser.',
  '/blog/von-traffic-zu-terminen': 'Praxisleitfaden für KMU in Berlin und Brandenburg: Wie aus Website-Besuchern Termine werden, mit Funnel, Local Marketing, Anzeigen, SEO und Tracking.',
  '/blog/was-ist-webdesign-11-woechiger-guide': 'Was ist Webdesign und wie lernst du es Schritt für Schritt? Die 11-wöchige Masterclass zeigt, wie du professionelle Websites planst und gestaltest.',
  '/blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist': 'Warum Berliner Unternehmen eine eigene Website brauchen, was gutes Webdesign ausmacht, welche Kosten entstehen und welche Vorteile sie bringt.',
  '/blog/website-checkliste-fuer-selbststaendige': 'Website-Checkliste für Selbstständige und Freelancer in Berlin: Praxisbeispiel Café, Datenschutz-Tipps, SEO-Grundlagen und Kontrolle vor dem Launch.',
  '/blog/woche-1-was-ist-webdesign': 'Teil 1 der Webdesign-Masterclass: was Webdesign ausmacht, seine drei Säulen und die Geschichte des Webs. Mit Übungen und Checkliste.',
  '/blog/woche-3-wichtigste-design-elemente': 'Teil 3 der Webdesign-Masterclass: Layout, Raster, Farbpsychologie, Typografie, Bilder, Navigation und CTAs. Mit Übungen und Checklisten.',
  '/blog/woche-4-responsive-webdesign': 'Teil 4 der Webdesign-Masterclass: Responsive Webdesign mit Mobile-First, Breakpoints, Media Queries, Flexbox und CSS Grid. Mit Übungen.',
  '/blog/woche-5-ux-ui-design-der-unterschied-der-millionen-wert-ist': 'Teil 5 der Webdesign-Masterclass: der Unterschied zwischen UX und UI, User Research, Wireframes und Usability-Tests. Mit praktischen Übungen.',
  '/ratgeber/homepage-checker-website-check': 'Prüfe Schritt für Schritt, ob deine Website noch modern, mobil gut bedienbar, vertrauenswürdig und aktuell ist. Mit Ablaufplan und konkreten Maßnahmen.'
});

export function resolveSeoDescription(pathname, storedDescription) {
  if (String(storedDescription ?? '').trim().length <= SEO_DESCRIPTION_MAX_LENGTH) return storedDescription;
  return SHORT_SEO_DESCRIPTIONS[String(pathname || '').toLowerCase()] || storedDescription;
}
