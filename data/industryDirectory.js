// Alle Branchenseiten mit eigenem Inhalt an einer Stelle: Name, Link, kurzer Text und
// verwandte Branchen. Genutzt von den Branchenseiten („Websites für verwandte Branchen“),
// der Startseite („Weitere Branchen“), der Local-SEO-Seite und den Linkzielen des Content-Agents.
// Neue Branchenseite: hier eintragen und in RELATED_INDUSTRIES mit drei Nachbarn verknüpfen.

export const INDUSTRY_DIRECTORY = Object.freeze({
  handwerker: Object.freeze({ name: 'Handwerk', nameEn: 'Trades & crafts', label: 'Website für Handwerker', href: '/handwerker', teaser: 'Leistungen, Einsatzgebiet und eine schnelle Anfrage für Handwerksbetriebe.' }),
  reinigung: Object.freeze({ name: 'Reinigung', nameEn: 'Cleaning', label: 'Website für Reinigungsfirmen', href: '/branchen/webdesign-reinigung', teaser: 'Leistungen, Objekte und Angebotsanfrage für Gebäudereinigung und Gebäudeservice.' }),
  blumenladen: Object.freeze({ name: 'Blumenladen', nameEn: 'Florists', label: 'Website für Blumenläden', href: '/branchen/webdesign-blumenladen', teaser: 'Sträuße, Anlässe, Onlineshop und Bestellung für Floristen.' }),
  fitnesscoach: Object.freeze({ name: 'Fitnessstudio', nameEn: 'Gyms', label: 'Website für Fitnessstudios', href: '/branchen/webdesign-fitnesscoach', teaser: 'Kurse, Preise und Probetraining für Studios und Personal Trainer.' }),
  immobilienmakler: Object.freeze({ name: 'Immobilienmakler', nameEn: 'Real estate agents', label: 'Website für Immobilienmakler', href: '/branchen/webdesign-immobilienmakler', teaser: 'Eigentümer gewinnen, Objekte zeigen und Bewertungsanfragen erhalten.' }),
  restaurant: Object.freeze({ name: 'Restaurant', nameEn: 'Restaurants', label: 'Website für Restaurants', href: '/branchen/webdesign-restaurant', teaser: 'Speisekarte, Öffnungszeiten und Reservierung für die Gastronomie.' }),
  cafe: Object.freeze({ name: 'Café', nameEn: 'Cafés', label: 'Website für Cafés', href: '/branchen/webdesign-cafe', teaser: 'Karte, Öffnungszeiten, Reservierung und Atmosphäre.' }),
  arzt: Object.freeze({ name: 'Arztpraxis', nameEn: 'Medical practices', label: 'Website für Arztpraxen', href: '/branchen/webdesign-arzt', teaser: 'Sprechzeiten, Online-Termin, Rezeptanfrage und Pflichtangaben.' }),
  physiotherapie: Object.freeze({ name: 'Physiotherapie', nameEn: 'Physiotherapy', label: 'Website für Physiotherapie-Praxen', href: '/branchen/webdesign-physiotherapie', teaser: 'Leistungen, Hausbesuche, Terminanfrage mit Verordnung und Karriereseite.' }),
  hebamme: Object.freeze({ name: 'Hebamme', nameEn: 'Midwives', label: 'Website für Hebammen', href: '/branchen/webdesign-hebamme', teaser: 'Freie Plätze nach Geburtstermin, Einzugsgebiet, Kurse und Anfrageformular.' }),
  steuerberater: Object.freeze({ name: 'Steuerberatung', nameEn: 'Tax advisors', label: 'Website für Steuerberater', href: '/branchen/webdesign-steuerberater', teaser: 'Mandantengruppen, freie Kapazitäten und Karriereseite, berufsrechtlich sauber.' }),
  autowerkstatt: Object.freeze({ name: 'Kfz-Werkstatt', nameEn: 'Car repair shops', label: 'Website für Kfz-Werkstätten', href: '/branchen/webdesign-autowerkstatt', teaser: 'Leistungen, Terminanfrage mit Fahrzeugdaten, Richtpreise und Öffnungszeiten.' }),
  friseur: Object.freeze({ name: 'Friseur', nameEn: 'Hairdressers', label: 'Website für Friseure', href: '/branchen/webdesign-friseur', teaser: 'Online-Termin, Preisliste, Walk-in-Zeiten und Team für Salons und Barbershops.' }),
  beautysalon: Object.freeze({ name: 'Kosmetikstudio', nameEn: 'Beauty salons', label: 'Website für Kosmetikstudios', href: '/branchen/webdesign-beautysalon', teaser: 'Behandlungen mit Preisen, Online-Termin und Gutscheine für Kosmetik-, Nagel- und Wimpernstudios.' }),
  fotograf: Object.freeze({ name: 'Fotografie', nameEn: 'Photographers', label: 'Website für Fotografen', href: '/branchen/webdesign-fotograf', teaser: 'Portfolio nach Genre, Pakete und schnell ladende Galerien.' }),
  tattoo: Object.freeze({ name: 'Tattoo-Studio', nameEn: 'Tattoo studios', label: 'Website für Tattoo-Studios', href: '/branchen/webdesign-tattoo', teaser: 'Artists mit Portfolio, Anfrage mit Motiv und Größe, Walk-in-Tage.' }),
  wellness: Object.freeze({ name: 'Massage & Wellness', nameEn: 'Massage & wellness', label: 'Website für Massage und Wellness', href: '/branchen/webdesign-wellness', teaser: 'Massagen mit Preisen, Online-Buchung und Gutscheinverkauf.' })
});

// Drei Nachbarn je Branche: ähnliche Kundschaft, ähnlicher Anfrageweg oder gemeinsame Rechtsthemen.
// So hat jede Seite mehrere Links von anderen Branchenseiten, nicht nur von /branchen.
export const RELATED_INDUSTRIES = Object.freeze({
  arzt: Object.freeze(['physiotherapie', 'hebamme', 'steuerberater']),
  physiotherapie: Object.freeze(['arzt', 'hebamme', 'wellness']),
  hebamme: Object.freeze(['arzt', 'physiotherapie', 'fotograf']),
  steuerberater: Object.freeze(['immobilienmakler', 'arzt', 'physiotherapie']),
  autowerkstatt: Object.freeze(['handwerker', 'reinigung', 'friseur']),
  friseur: Object.freeze(['beautysalon', 'tattoo', 'wellness']),
  beautysalon: Object.freeze(['friseur', 'wellness', 'tattoo']),
  fotograf: Object.freeze(['tattoo', 'hebamme', 'blumenladen']),
  tattoo: Object.freeze(['fotograf', 'friseur', 'beautysalon']),
  wellness: Object.freeze(['physiotherapie', 'beautysalon', 'fitnesscoach']),
  fitnesscoach: Object.freeze(['physiotherapie', 'wellness', 'beautysalon']),
  immobilienmakler: Object.freeze(['steuerberater', 'reinigung', 'handwerker']),
  reinigung: Object.freeze(['handwerker', 'immobilienmakler', 'autowerkstatt']),
  restaurant: Object.freeze(['cafe', 'blumenladen', 'fotograf']),
  cafe: Object.freeze(['restaurant', 'blumenladen', 'friseur']),
  blumenladen: Object.freeze(['cafe', 'restaurant', 'fotograf'])
});

// Branchen mit eigener Karte auf der Startseite; alle übrigen stehen dort als „Weitere Branchen“.
export const HOME_FEATURED_INDUSTRIES = Object.freeze(['handwerker', 'reinigung', 'blumenladen', 'fitnesscoach', 'immobilienmakler', 'restaurant']);

export function relatedIndustriesFor(slug) {
  return (RELATED_INDUSTRIES[slug] || []).map((key) => ({ key, ...INDUSTRY_DIRECTORY[key] }));
}

export function homeMoreIndustries() {
  return Object.entries(INDUSTRY_DIRECTORY)
    .filter(([key]) => !HOME_FEATURED_INDUSTRIES.includes(key))
    .map(([key, entry]) => ({ key, ...entry }));
}
