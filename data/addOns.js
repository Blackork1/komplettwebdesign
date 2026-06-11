function addOn({
  id,
  name,
  category,
  priceLabel,
  shortDescription,
  whenUseful,
  thirdPartyCostNote = 'Drittanbieter-Kosten sind nicht automatisch enthalten und werden separat eingeordnet.',
  ctaLabel = 'Zusatzleistung anfragen',
  ctaUrl = '/kontakt?projektart=zusatzleistung',
  relatedPackages = ['business', 'wachstum', 'individuell']
}) {
  return {
    id,
    name,
    category,
    priceLabel,
    shortDescription,
    whenUseful,
    notIncludedInPackages: true,
    thirdPartyCostNote,
    ctaLabel,
    ctaUrl,
    relatedPackages
  };
}

export const addOns = Object.freeze([
  addOn({
    id: 'zusatzseite-standard',
    name: 'Zusätzliche Standard-Unterseite',
    category: 'Seitenumfang',
    priceLabel: 'ab 120–250 €',
    shortDescription: 'Eine weitere klar abgegrenzte Inhaltsseite im bestehenden Designrahmen.',
    whenUseful: 'Sinnvoll, wenn nach Projektstart eine zusätzliche einfache Seite benötigt wird.',
    relatedPackages: ['start', 'business', 'wachstum']
  }),
  addOn({
    id: 'seo-leistungsseite',
    name: 'Zusätzliche SEO-/Leistungsseite',
    category: 'SEO',
    priceLabel: 'ab 250–450 €',
    shortDescription: 'Eine stärker strukturierte Seite für ein konkretes Angebot oder Suchthema.',
    whenUseful: 'Sinnvoll für einzelne Leistungen, Bezirke oder erklärungsbedürftige Angebote.'
  }),
  addOn({
    id: 'texterstellung-erweitert',
    name: 'Umfangreichere Texterstellung',
    category: 'Content',
    priceLabel: 'ab 250–900 €',
    shortDescription: 'Ausarbeitung zusätzlicher Inhalte auf Basis von Briefing, Material und Zielgruppe.',
    whenUseful: 'Sinnvoll, wenn kaum verwertbare Texte vorhanden sind.'
  }),
  addOn({
    id: 'animationen-einfach',
    name: 'Einfache Animationen',
    category: 'Design',
    priceLabel: 'ab 150–500 €',
    shortDescription: 'Dezente Bewegungen für ausgewählte UI-Elemente im vereinbarten Umfang.',
    whenUseful: 'Sinnvoll, wenn Interaktionen hochwertiger wirken sollen, ohne die Seite zu überladen.'
  }),
  addOn({
    id: 'animationen-umfangreich',
    name: 'Umfangreiche Animationen',
    category: 'Design',
    priceLabel: 'nach Aufwand',
    shortDescription: 'Aufwendigere Bewegungs- oder Interaktionskonzepte nach Prüfung.',
    whenUseful: 'Sinnvoll bei markenprägenden Landingpages oder erklärungsintensiven Angeboten.'
  }),
  addOn({
    id: 'buchungssystem-integration',
    name: 'Buchungssystem-Integration',
    category: 'Funktionen',
    priceLabel: 'ab 300–900 €',
    shortDescription: 'Einbindung oder Anbindung eines passenden Buchungswegs nach Machbarkeitsprüfung.',
    whenUseful: 'Sinnvoll für Termine, Reservierungen, Beratungen oder wiederkehrende Buchungen.'
  }),
  addOn({
    id: 'cms-einfach',
    name: 'Einfache CMS- oder Content-Verwaltung',
    category: 'Funktionen',
    priceLabel: 'ab 600 €',
    shortDescription: 'Bearbeitbare Inhalte für ausgewählte Bereiche nach vorheriger Definition.',
    whenUseful: 'Sinnvoll, wenn Inhalte regelmäßig selbst gepflegt werden sollen.'
  }),
  addOn({
    id: 'tracking-einrichtung',
    name: 'Tracking-Einrichtung',
    category: 'Messung',
    priceLabel: 'ab 150–400 €',
    shortDescription: 'Technische Einrichtung von Ereignissen und Consent-abhängiger Messung im vereinbarten Umfang.',
    whenUseful: 'Sinnvoll, wenn Anfragen, Klicks oder Testergebnisse nachvollzogen werden sollen.'
  }),
  addOn({
    id: 'local-seo-basis',
    name: 'Local-SEO-Basis',
    category: 'SEO',
    priceLabel: 'ab 300–700 €',
    shortDescription: 'Grundstruktur für lokale Suchsignale, Inhalte und interne Verlinkung.',
    whenUseful: 'Sinnvoll für lokale Anbieter mit Fokus auf Berlin oder Brandenburg.'
  }),
  addOn({
    id: 'google-business-profil',
    name: 'Google-Business-Profil-Optimierung',
    category: 'Local SEO',
    priceLabel: 'ab 150–350 €',
    shortDescription: 'Strukturierte Optimierung vorhandener Unternehmensprofil-Daten.',
    whenUseful: 'Sinnvoll, wenn Öffnungszeiten, Kategorien, Leistungen oder Fotos ungepflegt sind.'
  }),
  addOn({
    id: 'mehrsprachigkeit',
    name: 'Mehrsprachigkeit',
    category: 'Content',
    priceLabel: 'ab 60–150 € pro Seite zzgl. Übersetzung',
    shortDescription: 'Technische Vorbereitung und Einbindung zusätzlicher Sprachversionen.',
    whenUseful: 'Sinnvoll, wenn mehrere Zielgruppen in unterschiedlichen Sprachen angesprochen werden.'
  }),
  addOn({
    id: 'bildrecherche-bildbearbeitung',
    name: 'Bildrecherche/Bildbearbeitung',
    category: 'Content',
    priceLabel: 'ab 80–250 €',
    shortDescription: 'Auswahl, Zuschnitt und einfache Aufbereitung passender Bildwelten.',
    whenUseful: 'Sinnvoll, wenn eigene Bilder fehlen oder nicht webtauglich vorbereitet sind.'
  }),
  addOn({
    id: 'inhaltsmigration',
    name: 'Inhaltsmigration',
    category: 'Relaunch',
    priceLabel: 'ab 250–900 €',
    shortDescription: 'Übertragung und Strukturierung vorhandener Inhalte im vereinbarten Umfang.',
    whenUseful: 'Sinnvoll bei Relaunches mit verwertbaren bestehenden Seiteninhalten.'
  }),
  addOn({
    id: 'landingpage',
    name: 'Landingpage',
    category: 'Kampagnen',
    priceLabel: 'ab 699–1.499 €',
    shortDescription: 'Eigene Zielseite für ein Angebot, eine Kampagne oder eine lokale Suchintention.',
    whenUseful: 'Sinnvoll für klare Angebote, Aktionen oder bezahlte Kampagnen.'
  }),
  addOn({
    id: 'relaunch-konzept',
    name: 'Relaunch-Konzept',
    category: 'Relaunch',
    priceLabel: 'ab 399–900 €',
    shortDescription: 'Planung von Struktur, Prioritäten und Risiken vor der Umsetzung.',
    whenUseful: 'Sinnvoll, wenn eine bestehende Website geordnet erneuert werden soll.'
  }),
  addOn({
    id: 'website-audit',
    name: 'Website-Audit',
    category: 'Analyse',
    priceLabel: 'ab 199–699 €',
    shortDescription: 'Strukturierte Prüfung von Technik, SEO, Inhalten und Anfragewegen.',
    whenUseful: 'Sinnvoll vor Relaunch, Optimierung oder Priorisierung größerer Maßnahmen.'
  }),
  addOn({
    id: 'fehlerbehebung',
    name: 'Fehlerbehebungen',
    category: 'Support',
    priceLabel: 'nach Aufwand',
    shortDescription: 'Analyse und Behebung klar abgrenzbarer technischer Probleme.',
    whenUseful: 'Sinnvoll bei konkreten Bugs, Darstellungsproblemen oder Formularfehlern.'
  }),
  addOn({
    id: 'stundenweise-weiterentwicklung',
    name: 'Stundenweise Weiterentwicklung',
    category: 'Support',
    priceLabel: 'ab 60–85 €/Stunde',
    shortDescription: 'Technische oder inhaltliche Weiterentwicklung nach priorisiertem Aufgabenpaket.',
    whenUseful: 'Sinnvoll für kleinere Erweiterungen nach dem Livegang.'
  })
]);

export function getAddOnById(id) {
  return addOns.find((item) => item.id === id) || null;
}

export default addOns;
