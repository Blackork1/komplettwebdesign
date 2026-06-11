import { packageSeoMeta } from './seoMeta.js';

export { packageSeoMeta };

export const PACKAGE_GLOBAL_NOTES = Object.freeze({
  vatNote: 'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
  projectCostNote: 'Die Paketpreise beziehen sich auf die einmalige Erstellung der Website im vereinbarten Umfang.',
  runningCostsNote: 'Laufende Kosten für Domain, E-Mail, Hosting, Wartung, Backups, Monitoring oder externe Dienste können separat entstehen.',
  thirdPartyNote: 'Kosten für Drittanbieter-Tools, Cookie-/Consent-Dienste, Buchungssysteme, Newsletter-Tools, Zahlungsanbieter oder ähnliche externe Leistungen sind nicht automatisch enthalten.',
  legalNote: 'Impressum, Datenschutzerklärung und Cookie-Hinweise können technisch eingebunden werden. Die Erstellung oder rechtliche Prüfung dieser Texte ist keine Rechtsberatung und sollte bei Bedarf über spezialisierte Anbieter oder eine Rechtsberatung erfolgen.',
  seoNote: 'Ich setze technische SEO-Grundlagen um. Bestimmte Platzierungen bei Google können nicht garantiert werden.',
  feedbackNote: 'Die Anzahl der Feedbackrunden richtet sich nach dem gewählten Paket. Weitere Änderungswünsche können separat kalkuliert werden.',
  launchNote: 'Der Livegang erfolgt nach finaler Freigabe und gemäß vereinbartem Zahlungsmodell.'
});

const SHARED_TECH_SCOPE = [
  'individuelle Umsetzung mit Node.js, EJS, CSS und JavaScript',
  'serverseitig gerendertes HTML',
  'responsive Umsetzung',
  'saubere HTML-Struktur',
  'grundlegende Ladezeitoptimierung',
  'Cloudinary-Bildoptimierung, soweit im Projekt vorgesehen'
];

const SHARED_NOT_INCLUDED = [
  'Hosting und Wartung, sofern nicht separat vereinbart',
  'Drittanbieter-Kosten',
  'Rechtsberatung',
  'laufende SEO-Betreuung',
  'Garantien für bestimmte Rankings, Conversion oder Umsatz'
];

function priceToCents(priceFrom) {
  return Number(priceFrom) * 100;
}

function toSchemaPrice(priceFrom) {
  return Number(priceFrom).toFixed(2);
}

function makePackage(data) {
  const meta = packageSeoMeta[data.canonicalPath] || {};
  return Object.freeze({
    display: true,
    vatNote: PACKAGE_GLOBAL_NOTES.vatNote,
    runningCostsNote: PACKAGE_GLOBAL_NOTES.runningCostsNote,
    legalNote: PACKAGE_GLOBAL_NOTES.legalNote,
    seoNote: PACKAGE_GLOBAL_NOTES.seoNote,
    thirdPartyNote: PACKAGE_GLOBAL_NOTES.thirdPartyNote,
    schemaType: 'Service',
    metaTitle: meta.title || data.metaTitle,
    metaDescription: meta.description || data.metaDescription,
    price_amount_cents: priceToCents(data.priceFrom),
    schemaPrice: toSchemaPrice(data.priceFrom),
    price: data.priceLabel,
    description: data.shortDescription,
    features: data.included.slice(0, 4),
    ...data
  });
}

export const packages = Object.freeze([
  makePackage({
    id: 'start',
    name: 'Start',
    displayName: 'Start',
    shortName: 'Start',
    longName: 'Start-Paket',
    slug: 'start',
    canonicalPath: '/pakete/start',
    redirectFrom: ['/pakete/basis'],
    priceFrom: 799,
    priceLabel: 'ab 799 €',
    priceNote: 'Einstiegspreis bei klar definiertem, schlankem Umfang',
    isRecommended: false,
    recommendationLabel: null,
    targetGroup: [
      'Gründer',
      'Selbstständige',
      'kleine lokale Anbieter',
      'Einzelunternehmer',
      'Dienstleister mit überschaubarem Angebot',
      'Unternehmen ohne Website'
    ],
    notFor: [
      'Unternehmen mit vielen Leistungsseiten',
      'Relaunches mit umfangreicher Inhaltsmigration',
      'Projekte mit Sonderfunktionen',
      'Shops',
      'Buchungssysteme',
      'CMS',
      'Mehrsprachigkeit',
      'umfangreiche SEO-Strategie'
    ],
    shortDescription: 'Kompakte individuelle Website oder Onepager für den professionellen Einstieg.',
    longDescription: 'Das Start-Paket eignet sich für eine kleine, klar abgegrenzte Website, die dein Angebot seriös darstellt und Kontaktanfragen ermöglicht.',
    positioning: [
      'kompaktes Einstiegspaket',
      'professionelle Grundlage',
      'fair kalkuliert',
      'kein Billigpaket',
      'klar begrenzter Umfang'
    ],
    useCases: ['neue kleine Website', 'professioneller Erstauftritt', 'kompakter Onepager'],
    pageScope: '1 bis 3 Inhaltsseiten oder ein klar strukturierter Onepager',
    pageScopeShort: '1 bis 3 Seiten oder Onepager',
    textScope: [
      'Einbindung gelieferter Texte',
      'leichte redaktionelle Strukturierung',
      'kurze Optimierung von Überschriften und CTA-Texten',
      'keine umfangreiche Texterstellung'
    ],
    seoScope: [
      'technische SEO-Grundlagen',
      'sprechende URL',
      'sinnvolle H1/H2-Struktur',
      'Meta Title und Meta Description für Hauptseiten',
      'grundlegende interne Verlinkung',
      'Bild-Alt-Texte im vereinbarten Umfang',
      'keine Ranking-Garantie'
    ],
    techScope: [
      ...SHARED_TECH_SCOPE,
      'einfache Kontaktmöglichkeit'
    ],
    included: [
      'persönliche Abstimmung',
      'kompakte Seitenstruktur',
      'individuelles Layout im schlanken Umfang',
      'responsive Umsetzung',
      'technische SEO-Grundlagen',
      'Einbindung gelieferter Inhalte',
      'einfache Kontaktmöglichkeit',
      '1 Feedbackrunde',
      'grundlegende Launch-Vorbereitung'
    ],
    notIncluded: [
      'mehr als 3 Inhaltsseiten',
      'umfangreiche Texterstellung',
      'SEO-Landingpages',
      'komplexe Animationen',
      'Buchungssystem',
      'CMS',
      'Shop-Funktionen',
      'Mehrsprachigkeit',
      'Tracking-Setup',
      'umfangreiche Bildrecherche',
      'Inhaltsmigration',
      ...SHARED_NOT_INCLUDED
    ],
    optionalAddOns: [
      'zusatzseite-standard',
      'texterstellung-erweitert',
      'animationen-einfach',
      'tracking-einrichtung',
      'local-seo-basis'
    ],
    feedbackRounds: '1',
    timeline: 'abhängig von Inhalt, Feedback und Auslastung; keine verbindliche Express-Garantie',
    process: ['Abstimmung', 'Struktur', 'Design/Umsetzung', 'Feedbackrunde', 'Launch-Vorbereitung'],
    ctaLabel: 'Start-Paket anfragen',
    secondaryCtaLabel: 'Pakete vergleichen',
    ctaUrl: '/kontakt?paket=start',
    compareUrl: '/pakete',
    h1: 'Start-Paket für kompakte Websites ab 799 €',
    faqIds: [
      'start-reicht-das-paket',
      'start-spaeter-erweitern',
      'start-texte-enthalten',
      'start-seo-enthalten',
      'start-hosting-enthalten',
      'start-rechtstexte',
      'start-aenderungswuensche'
    ],
    image: 'paket-start.webp',
    order: 1
  }),
  makePackage({
    id: 'business',
    name: 'Business',
    displayName: 'Business',
    shortName: 'Business',
    longName: 'Business-Paket',
    slug: 'business',
    canonicalPath: '/pakete/business',
    redirectFrom: [],
    priceFrom: 1499,
    priceLabel: 'ab 1.499 €',
    priceNote: 'empfohlene Standardlösung für kleine Unternehmen mit mehreren Leistungen',
    isRecommended: true,
    recommendationLabel: 'Empfohlen für kleine Unternehmen',
    targetGroup: [
      'kleine Unternehmen',
      'lokale Dienstleister',
      'Handwerksbetriebe',
      'Praxen',
      'Beratungen',
      'Dienstleistungsunternehmen',
      'Unternehmen mit mehreren Leistungen',
      'Unternehmen mit veralteter kleiner Website'
    ],
    notFor: [
      'sehr umfangreiche Relaunches',
      'Websites mit vielen SEO-Landingpages',
      'komplexe Sonderfunktionen',
      'große Shops',
      'Plattformen',
      'mehrsprachige Websites ohne Zusatzvereinbarung'
    ],
    shortDescription: 'Unternehmenswebsite mit mehreren Seiten, klarer Angebotsstruktur und technischer SEO-Grundlage.',
    longDescription: 'Das Business-Paket ist die häufig passende Lösung für kleine Unternehmen, die mehr als einen Onepager benötigen und ihre Leistungen verständlich, professionell und anfrageorientiert darstellen möchten.',
    positioning: [
      'empfohlene Standardlösung',
      'mehr Struktur als das Start-Paket',
      'für kleine Unternehmen mit mehreren Leistungen',
      'professionelle Angebotskommunikation'
    ],
    useCases: ['Unternehmenswebsite', 'mehrere Leistungen', 'kleiner Relaunch'],
    pageScope: 'ca. 4 bis 7 Inhaltsseiten',
    pageScopeShort: 'ca. 4 bis 7 Seiten',
    textScope: [
      'Einbindung gelieferter Texte',
      'redaktionelle Strukturierung',
      'Optimierung von Überschriften, Einstiegen und CTA-Texten',
      'Unterstützung bei klarer Angebotskommunikation',
      'keine vollständige umfangreiche Texterstellung ohne Zusatzvereinbarung'
    ],
    seoScope: [
      'technische SEO-Grundlagen',
      'Meta Title und Meta Description für vereinbarte Hauptseiten',
      'saubere Überschriftenstruktur',
      'interne Verlinkung zwischen wichtigsten Seiten',
      'Local-SEO-Grundlage, soweit passend',
      'strukturierte Seitenarchitektur',
      'keine Ranking-Garantie'
    ],
    techScope: [
      ...SHARED_TECH_SCOPE,
      'saubere Template-Struktur',
      'wiederverwendbare EJS-Partials, soweit sinnvoll',
      'Kontaktformular oder klare Kontaktmöglichkeit'
    ],
    included: [
      'persönliche Abstimmung',
      'Seitenstruktur für mehrere Inhalte',
      'individuelles Design',
      'responsive Umsetzung',
      'technische SEO-Grundlagen',
      'Meta-Daten für Hauptseiten',
      'Kontaktmöglichkeit',
      'Einbindung gelieferter Inhalte',
      'redaktionelle Strukturierung',
      '2 Feedbackrunden',
      'Launch-Vorbereitung'
    ],
    notIncluded: [
      'mehr als ca. 7 Inhaltsseiten',
      'umfangreiche Texterstellung',
      'mehrere SEO-Landingpages',
      'komplexe Animationen',
      'Buchungssystem',
      'CMS',
      'Shop-Funktionen',
      'Mehrsprachigkeit',
      'umfangreiche Inhaltsmigration',
      'Tracking-Konzept',
      ...SHARED_NOT_INCLUDED
    ],
    optionalAddOns: [
      'zusatzseite-standard',
      'seo-leistungsseite',
      'local-seo-basis',
      'google-business-profil',
      'tracking-einrichtung',
      'bildrecherche-bildbearbeitung',
      'inhaltsmigration',
      'animationen-einfach'
    ],
    feedbackRounds: '2',
    timeline: 'abhängig von Seitenumfang, Inhalten, Feedback und Auslastung',
    process: ['Briefing', 'Seitenstruktur', 'Design/Umsetzung', '2 Feedbackrunden', 'Launch-Vorbereitung'],
    ctaLabel: 'Business-Paket anfragen',
    secondaryCtaLabel: 'Kosten einschätzen lassen',
    ctaUrl: '/kontakt?paket=business',
    compareUrl: '/pakete',
    h1: 'Business-Paket für kleine Unternehmen',
    faqIds: [
      'business-fuer-wen',
      'business-seitenumfang',
      'business-zusatzseiten',
      'business-texte',
      'business-local-seo',
      'business-ranking',
      'business-rechtstexte',
      'business-buchungssystem'
    ],
    image: 'paket-business.webp',
    order: 2
  }),
  makePackage({
    id: 'wachstum',
    name: 'Wachstum',
    displayName: 'Wachstum',
    shortName: 'Wachstum',
    longName: 'Wachstum-Paket',
    slug: 'wachstum',
    canonicalPath: '/pakete/wachstum',
    redirectFrom: ['/pakete/premium'],
    priceFrom: 2499,
    priceLabel: 'ab 2.499 €',
    priceNote: 'für umfangreichere Websites, Relaunches und stärkere Seitenstruktur',
    isRecommended: false,
    recommendationLabel: 'Für Relaunch & Ausbau',
    targetGroup: [
      'kleine bis mittlere Unternehmen',
      'etablierte lokale Anbieter',
      'Unternehmen mit veralteter Website',
      'Unternehmen mit mehreren Leistungen',
      'Unternehmen mit mehreren Zielgruppen',
      'Unternehmen mit stärkerem SEO-Fokus'
    ],
    notFor: [
      'große Plattformen',
      'große Shops',
      'Enterprise-Websites',
      'Projekte mit umfangreicher Sonderentwicklung',
      'komplexe SaaS-Produkte',
      'Websites mit deutlich größerem Seitenumfang zum Pauschalpreis'
    ],
    shortDescription: 'Umfangreichere Website oder Relaunch mit mehreren Leistungsseiten, klarer Struktur und stärkerer SEO-Grundlage.',
    longDescription: 'Das Wachstum-Paket eignet sich für Unternehmen, die mehr Inhalte, mehrere Leistungsbereiche oder einen strukturierten Relaunch benötigen und ihre Website gezielter auf Sichtbarkeit und Anfragen ausrichten möchten.',
    positioning: [
      'für umfangreichere Websites',
      'für Relaunches',
      'für mehrere Leistungsseiten',
      'für stärkeren SEO- und Struktur-Fokus',
      'nicht als Enterprise- oder Shop-Paket'
    ],
    useCases: ['Relaunch', 'mehrere Leistungsseiten', 'SEO-Struktur ausbauen'],
    pageScope: 'ca. 8 bis 12 Inhaltsseiten',
    pageScopeShort: 'ca. 8 bis 12 Seiten',
    textScope: [
      'Strukturierung gelieferter Inhalte',
      'Unterstützung bei Angebotslogik und Seitenaufbau',
      'Optimierung von Überschriften, CTA-Bereichen und Abschnittslogik',
      'keine unbegrenzte Texterstellung',
      'längere SEO-Texte separat'
    ],
    seoScope: [
      'erweiterte technische SEO-Grundlage',
      'Meta Title und Meta Description für vereinbarte Seiten',
      'SEO-freundliche URL-Struktur',
      'strukturierte Überschriften',
      'interne Verlinkung',
      'Local-SEO-Grundlage',
      'grundlegende strukturierte Daten, wenn sinnvoll',
      'Redirect-Hinweise bei Relaunch im vereinbarten Umfang',
      'keine Ranking-Garantie'
    ],
    techScope: [
      ...SHARED_TECH_SCOPE,
      'strukturierte EJS-Templates und Partials',
      'saubere Navigation',
      'bessere Seitenarchitektur'
    ],
    included: [
      'persönliche Abstimmung',
      'strukturierte Seitenarchitektur',
      'ca. 8 bis 12 Inhaltsseiten',
      'individuelles Design',
      'responsive Umsetzung',
      'technische SEO-Grundlagen erweitert',
      'Meta-Daten für vereinbarte Seiten',
      'interne Verlinkung',
      'Local-SEO-Grundlage',
      'Kontakt-/Anfrageführung',
      '2 bis 3 Feedbackrunden',
      'Launch- oder Relaunch-Vorbereitung'
    ],
    notIncluded: [
      'mehr als ca. 12 Inhaltsseiten ohne Zusatzvereinbarung',
      'deutlich mehr Inhaltsseiten pauschal',
      'umfangreiche Inhaltsmigration',
      'komplexe SEO-Migration',
      'Google Ads',
      'Social Media Betreuung',
      'umfangreiche Animationen',
      'Buchungssysteme',
      'CMS-Funktionen',
      'Shop-Funktionen',
      'Mehrsprachigkeit',
      'Schnittstellen',
      'individuelle Web-App-Funktionen',
      ...SHARED_NOT_INCLUDED
    ],
    optionalAddOns: [
      'seo-leistungsseite',
      'zusatzseite-standard',
      'local-seo-basis',
      'google-business-profil',
      'tracking-einrichtung',
      'inhaltsmigration',
      'website-audit',
      'animationen-einfach',
      'cms-einfach',
      'buchungssystem-integration'
    ],
    feedbackRounds: '2 bis 3',
    timeline: 'abhängig von Umfang, Inhalten, Abstimmung und Auslastung; Relaunches können länger dauern',
    process: ['Analyse', 'Seitenarchitektur', 'Design/Umsetzung', '2 bis 3 Feedbackrunden', 'Launch- oder Relaunch-Vorbereitung'],
    ctaLabel: 'Wachstum-Paket anfragen',
    secondaryCtaLabel: 'Relaunch besprechen',
    ctaUrl: '/kontakt?paket=wachstum',
    compareUrl: '/pakete',
    h1: 'Wachstum-Paket für umfangreichere Websites und Relaunches',
    faqIds: [
      'wachstum-fuer-wen',
      'wachstum-relaunch',
      'wachstum-seitenumfang',
      'wachstum-keine-20-seiten',
      'wachstum-buchungssystem',
      'wachstum-shop',
      'wachstum-seo',
      'wachstum-ranking',
      'wachstum-alte-urls',
      'wachstum-zusatzkosten'
    ],
    image: 'paket-wachstum.webp',
    order: 3
  }),
  makePackage({
    id: 'individuell',
    name: 'Individuell',
    displayName: 'Individuell',
    shortName: 'Individuell',
    longName: 'Individuelles Projekt',
    slug: 'individuell',
    canonicalPath: '/pakete/individuell',
    redirectFrom: [],
    priceFrom: 3500,
    priceLabel: 'ab 3.500 € oder nach Aufwand',
    priceNote: 'für Sonderfunktionen und Projekte außerhalb der Standardpakete',
    isRecommended: false,
    recommendationLabel: 'Für Sonderfunktionen',
    targetGroup: [
      'Unternehmen mit Sonderanforderungen',
      'Websites mit speziellen Funktionen',
      'Anbieter mit Buchungssystemen',
      'Unternehmen mit CMS-Wunsch',
      'mehrsprachige Websites',
      'kleine Shop-Funktionen',
      'umfangreiche Animationen',
      'individuelle Schnittstellen',
      'komplexere Relaunches'
    ],
    notFor: [
      'große Marktplätze',
      'Amazon-/Zalando-ähnliche Shops',
      'große Plattformen',
      'Enterprise-Systeme',
      'komplexe SaaS-Produkte',
      'Projekte mit unbegrenzter Sonderentwicklung',
      'durchgehender Support ohne separate Vereinbarung'
    ],
    shortDescription: 'Individuelles Webdesign-Projekt für Sonderfunktionen, CMS, Buchungssysteme, Mehrsprachigkeit oder größere Anforderungen.',
    longDescription: 'Das individuelle Projektangebot ist für Anforderungen gedacht, die nicht sauber in ein Standardpaket passen. Umfang, technische Machbarkeit und Kosten werden vorab geklärt.',
    positioning: [
      'für Anforderungen außerhalb der Standardpakete',
      'nach Vorgespräch und Aufwandsschätzung',
      'Sonderfunktionen',
      'individuelle technische Anforderungen',
      'klare Machbarkeitsprüfung'
    ],
    useCases: ['Sonderfunktion', 'CMS', 'Buchungssystem', 'Mehrsprachigkeit', 'individuelle Integration'],
    pageScope: 'nach Aufwand, abhängig von Funktionsumfang, Seitenstruktur und Inhalten',
    pageScopeShort: 'nach Aufwand',
    textScope: [
      'abhängig vom Projekt',
      'Texterstellung separat kalkulierbar',
      'Übersetzungen nicht automatisch enthalten'
    ],
    seoScope: [
      'abhängig vom Projekt',
      'technische SEO-Grundlagen möglich',
      'strukturierte Daten möglich',
      'Weiterleitungs- oder Relaunch-Konzept möglich',
      'keine Ranking-Garantie',
      'laufende SEO-Betreuung separat'
    ],
    techScope: [
      'individuelle Umsetzung mit Node.js, EJS, CSS und JavaScript',
      'serverseitig gerendertes HTML, soweit sinnvoll für die Website-Inhalte',
      'spezifische Funktionen nach Machbarkeitsprüfung',
      'Schnittstellen oder Drittanbieter-Integration nach Aufwand',
      'keine Plattform- oder Enterprise-Zusage ohne gesondertes Projekt'
    ],
    included: [
      'Erstklärung des Umfangs',
      'Machbarkeitsprüfung im angemessenen Rahmen',
      'individuelle Aufwandsschätzung',
      'technische Umsetzung nach Angebot',
      'Test und Freigabe im vereinbarten Umfang',
      'Launch-Vorbereitung nach Vereinbarung'
    ],
    notIncluded: [
      'unbegrenzte Entwicklung',
      'dauerhafte Betreuung ohne Wartungsvertrag',
      'externe Toolgebühren',
      'Rechtsberatung',
      'Garantien für Conversion, Umsatz oder Ranking',
      'komplexe Plattformarchitektur ohne gesondertes Projekt',
      'große Shops oder Marktplätze',
      'Enterprise-Support',
      'durchgehende Verfügbarkeit'
    ],
    optionalAddOns: [
      'buchungssystem-integration',
      'cms-einfach',
      'mehrsprachigkeit',
      'tracking-einrichtung',
      'local-seo-basis',
      'website-audit',
      'stundenweise-weiterentwicklung'
    ],
    feedbackRounds: 'nach Angebot',
    timeline: 'abhängig von Umfang, Funktionalität, externen Tools und Abstimmung',
    process: ['Erstklärung', 'Machbarkeitsprüfung', 'Aufwandsschätzung', 'Umsetzung nach Angebot', 'Test und Freigabe'],
    ctaLabel: 'Individuelles Projekt anfragen',
    secondaryCtaLabel: 'Machbarkeit einschätzen lassen',
    ctaUrl: '/kontakt?paket=individuell',
    compareUrl: '/pakete',
    h1: 'Individuelles Webdesign-Projekt für Sonderfunktionen',
    faqIds: [
      'individuell-wann-sinnvoll',
      'individuell-buchungssystem',
      'individuell-cms',
      'individuell-mehrsprachig',
      'individuell-shop',
      'individuell-kein-fester-preis',
      'individuell-aufwand',
      'individuell-drittanbieter',
      'individuell-wartung',
      'individuell-scope-aenderung'
    ],
    image: 'paket-individuell.webp',
    order: 4
  })
]);

export const packageRedirects = Object.freeze(
  packages.flatMap((pkg) => (pkg.redirectFrom || []).map((from) => ({ from, to: pkg.canonicalPath })))
);

export const packageComparisonRows = Object.freeze([
  {
    id: 'price',
    label: 'Preis',
    values: {
      start: 'ab 799 €',
      business: 'ab 1.499 €',
      wachstum: 'ab 2.499 €',
      individuell: 'ab 3.500 € oder nach Aufwand'
    }
  },
  {
    id: 'targetGroup',
    label: 'Zielgruppe',
    values: {
      start: 'kompakte Erstwebsite',
      business: 'kleine Unternehmen mit mehreren Leistungen',
      wachstum: 'Relaunch, Ausbau, mehrere Leistungsseiten',
      individuell: 'Sonderfunktionen und größere Anforderungen'
    }
  },
  {
    id: 'pageScope',
    label: 'Seitenumfang',
    values: {
      start: '1 bis 3 Seiten oder Onepager',
      business: 'ca. 4 bis 7 Seiten',
      wachstum: 'ca. 8 bis 12 Seiten',
      individuell: 'nach Aufwand'
    }
  },
  {
    id: 'textSupport',
    label: 'Textunterstützung',
    values: {
      start: 'Einbindung und leichte Strukturierung',
      business: 'redaktionelle Strukturierung',
      wachstum: 'Seiten- und Angebotsstrukturierung',
      individuell: 'nach Projektumfang'
    }
  },
  {
    id: 'seoScope',
    label: 'SEO-Umfang',
    values: {
      start: 'technische Grundlagen',
      business: 'technische Grundlagen + Struktur',
      wachstum: 'erweiterte Struktur + Local-SEO-Grundlage',
      individuell: 'nach Projektumfang'
    }
  },
  {
    id: 'technicalImplementation',
    label: 'Technische Umsetzung',
    values: {
      start: 'Node.js/EJS/CSS/JavaScript, serverseitig gerendert',
      business: 'Node.js/EJS/CSS/JavaScript, modulare Seitenstruktur',
      wachstum: 'Node.js/EJS/CSS/JavaScript, erweiterte Seitenarchitektur',
      individuell: 'nach Machbarkeitsprüfung und Angebot'
    }
  },
  {
    id: 'feedbackRounds',
    label: 'Feedbackrunden',
    values: {
      start: '1',
      business: '2',
      wachstum: '2 bis 3',
      individuell: 'nach Angebot'
    }
  },
  {
    id: 'contactOption',
    label: 'Kontaktmöglichkeit',
    values: {
      start: 'einfacher Kontaktweg',
      business: 'Kontaktweg oder Formular im vereinbarten Umfang',
      wachstum: 'Kontakt-/Anfrageführung',
      individuell: 'nach Projektanforderung'
    }
  },
  {
    id: 'localSeoFoundation',
    label: 'Local-SEO-Grundlage',
    values: {
      start: 'optional erweiterbar',
      business: 'soweit passend enthalten',
      wachstum: 'im vereinbarten Umfang enthalten',
      individuell: 'nach Projektumfang'
    }
  },
  {
    id: 'relaunchSuitable',
    label: 'Relaunch geeignet',
    values: {
      start: 'nur sehr klein',
      business: 'kleiner Relaunch',
      wachstum: 'ja, im vereinbarten Umfang',
      individuell: 'ja, nach Aufwandsschätzung'
    }
  },
  {
    id: 'specialFeatures',
    label: 'Sonderfunktionen',
    values: {
      start: 'nicht enthalten',
      business: 'Zusatzleistung',
      wachstum: 'Zusatzleistung oder individuell',
      individuell: 'möglich nach Prüfung'
    }
  },
  {
    id: 'runningCosts',
    label: 'Laufende Kosten',
    values: {
      start: 'Domain, E-Mail, Hosting und Wartung separat',
      business: 'Domain, E-Mail, Hosting und Wartung separat',
      wachstum: 'Domain, E-Mail, Hosting, Wartung und externe Tools separat',
      individuell: 'abhängig von Betrieb, Tools und Vereinbarung'
    }
  },
  {
    id: 'bestFor',
    label: 'Beste Wahl für',
    values: {
      start: 'kompakter Einstieg',
      business: 'häufig passende Unternehmenswebsite',
      wachstum: 'Ausbau/Relaunch',
      individuell: 'Sonderanforderungen'
    }
  }
]);

export const packageOptionsForForm = Object.freeze([
  {
    value: 'start',
    label: 'Start ab 799 €',
    labelEn: 'Start from EUR 799',
    hint: 'Kompakte Website, Onepager oder 1 bis 3 Inhaltsseiten',
    hintEn: 'Compact website, one-pager or 1 to 3 content pages'
  },
  {
    value: 'business',
    label: 'Business ab 1.499 €',
    labelEn: 'Business from EUR 1,499',
    hint: 'Kleine Unternehmenswebsite mit ca. 4 bis 7 Inhaltsseiten',
    hintEn: 'Small business website with about 4 to 7 content pages'
  },
  {
    value: 'wachstum',
    label: 'Wachstum ab 2.499 €',
    labelEn: 'Growth from EUR 2,499',
    hint: 'Umfangreichere Website, Relaunch oder mehrere Leistungsseiten',
    hintEn: 'Larger website, relaunch or several service pages'
  },
  {
    value: 'individuell',
    label: 'Individuell ab 3.500 € oder nach Aufwand',
    labelEn: 'Individual from EUR 3,500 or by effort',
    hint: 'Sonderfunktionen, CMS, Buchungssysteme, Mehrsprachigkeit oder Shop-Funktionen nach Prüfung',
    hintEn: 'Custom functionality, CMS, booking systems, multilingual setup or shop features after review'
  },
  {
    value: 'unsure',
    label: 'Noch unsicher',
    labelEn: 'Not sure yet',
    hint: 'Ich ordne dein Projekt nach der Anfrage grob ein',
    hintEn: 'I classify the rough scope after your request'
  }
]);

export const budgetOptions = Object.freeze([
  { value: '799-1499', label: '799–1.499 €', labelEn: 'EUR 799-1,499' },
  { value: '1500-2499', label: '1.500–2.499 €', labelEn: 'EUR 1,500-2,499' },
  { value: '2500-4000', label: '2.500–4.000 €', labelEn: 'EUR 2,500-4,000' },
  { value: '4000-plus', label: 'Über 4.000 €', labelEn: 'More than EUR 4,000' },
  { value: 'open', label: 'Noch offen', labelEn: 'Still open' }
]);

export const projectTypeOptions = Object.freeze([
  { value: 'new-website', label: 'Neue Website', labelEn: 'New website' },
  { value: 'relaunch', label: 'Website-Relaunch', labelEn: 'Website relaunch' },
  { value: 'landingpage', label: 'Landingpage', labelEn: 'Landing page' },
  { value: 'local-seo', label: 'Local SEO', labelEn: 'Local SEO' },
  { value: 'maintenance', label: 'Website-Wartung', labelEn: 'Website maintenance' },
  { value: 'audit', label: 'Website-Audit / Website-Check', labelEn: 'Website audit / website check' },
  { value: 'custom-feature', label: 'Zusatzfunktion oder Erweiterung', labelEn: 'Custom feature or extension' },
  { value: 'bugfix', label: 'Fehlerbehebung an bestehender Website', labelEn: 'Bug fix on an existing website' },
  { value: 'unsure', label: 'Noch unsicher', labelEn: 'Not sure yet' }
]);

export const optionalFeatureOptions = Object.freeze([
  { value: 'extra-pages', label: 'Zusätzliche Unterseiten', labelEn: 'Additional subpages' },
  { value: 'seo-pages', label: 'SEO-/Leistungsseiten', labelEn: 'SEO / service pages' },
  { value: 'local-seo', label: 'Local SEO', labelEn: 'Local SEO' },
  { value: 'google-business-profile', label: 'Google-Business-Profil-Optimierung', labelEn: 'Google Business Profile optimization' },
  { value: 'tracking', label: 'Tracking / Analytics', labelEn: 'Tracking / analytics' },
  { value: 'booking-system', label: 'Buchungssystem', labelEn: 'Booking system' },
  { value: 'cms', label: 'CMS oder einfache Content-Verwaltung', labelEn: 'CMS or simple content management' },
  { value: 'multilingual', label: 'Mehrsprachigkeit', labelEn: 'Multilingual setup' },
  { value: 'animations', label: 'Animationen', labelEn: 'Animations' },
  { value: 'images', label: 'Bildrecherche/Bildbearbeitung', labelEn: 'Image research / editing' },
  { value: 'migration', label: 'Inhaltsmigration', labelEn: 'Content migration' },
  { value: 'landingpage', label: 'Landingpage', labelEn: 'Landing page' },
  { value: 'audit', label: 'Website-Audit', labelEn: 'Website audit' },
  { value: 'shop-feature', label: 'Shop- oder Produktfunktion', labelEn: 'Shop or product feature' },
  { value: 'unsure', label: 'Noch unsicher', labelEn: 'Not sure yet' },
  { value: 'none', label: 'Keine Zusatzfunktionen geplant', labelEn: 'No additional features planned' }
]);

export const timelineOptions = Object.freeze([
  { value: 'asap', label: 'So bald wie möglich', labelEn: 'As soon as possible' },
  { value: '1-2-months', label: 'In 1–2 Monaten', labelEn: 'In 1-2 months' },
  { value: '3-plus-months', label: 'In 3+ Monaten', labelEn: 'In 3+ months' },
  { value: 'open', label: 'Es gibt noch keinen festen Zeitplan', labelEn: 'There is no fixed timeline yet' }
]);

export const existingWebsiteStatusOptions = Object.freeze([
  { value: 'no-website', label: 'Nein, es gibt noch keine Website', labelEn: 'No, there is no website yet' },
  { value: 'outdated', label: 'Ja, aber sie ist veraltet', labelEn: 'Yes, but it is outdated' },
  { value: 'needs-rework', label: 'Ja, sie soll überarbeitet werden', labelEn: 'Yes, it should be revised' },
  { value: 'technical-rebuild', label: 'Ja, sie soll technisch neu aufgebaut werden', labelEn: 'Yes, it should be rebuilt technically' },
  { value: 'unsure', label: 'Noch unsicher', labelEn: 'Not sure yet' }
]);

export const pageScopeOptions = Object.freeze([
  { value: 'onepager', label: 'Onepager oder sehr kompakt', labelEn: 'One-pager or very compact' },
  { value: '1-3', label: '1–3 Inhaltsseiten', labelEn: '1-3 content pages' },
  { value: '4-7', label: '4–7 Inhaltsseiten', labelEn: '4-7 content pages' },
  { value: '8-12', label: '8–12 Inhaltsseiten', labelEn: '8-12 content pages' },
  { value: '12-plus', label: 'Mehr als 12 Inhaltsseiten', labelEn: 'More than 12 content pages' },
  { value: 'unsure', label: 'Noch unsicher', labelEn: 'Not sure yet' }
]);

export const contentStatusOptions = Object.freeze([
  { value: 'content-ready', label: 'Ja, die wichtigsten Texte sind vorhanden', labelEn: 'Yes, the most important texts are ready' },
  { value: 'partial-support', label: 'Teilweise, ich brauche Unterstützung bei Struktur/Formulierungen', labelEn: 'Partly, I need support with structure or wording' },
  { value: 'copywriting-needed', label: 'Nein, Texte müssen größtenteils erstellt werden', labelEn: 'No, most texts need to be created' },
  { value: 'unsure', label: 'Noch unsicher', labelEn: 'Not sure yet' }
]);

export const hostingMaintenanceOptions = Object.freeze([
  { value: 'hosting', label: 'Ja, Hosting ist interessant', labelEn: 'Yes, hosting is interesting' },
  { value: 'maintenance', label: 'Ja, Wartung und Support sind interessant', labelEn: 'Yes, maintenance and support are interesting' },
  { value: 'both', label: 'Beides könnte interessant sein', labelEn: 'Both could be interesting' },
  { value: 'no', label: 'Nein, aktuell nicht', labelEn: 'No, not at the moment' },
  { value: 'unsure', label: 'Noch unsicher', labelEn: 'Not sure yet' }
]);

export const preferredContactOptions = Object.freeze([
  { value: 'email', label: 'E-Mail', labelEn: 'Email' },
  { value: 'phone', label: 'Telefon', labelEn: 'Phone' },
  { value: 'either', label: 'Egal', labelEn: 'Either' }
]);

export function getPackageBySlug(slug, options = {}) {
  const value = String(slug || '').trim().toLowerCase();
  if (!value) return null;

  const normalizedPath = value.startsWith('/') ? value : `/pakete/${value}`;
  const direct = packages.find((pkg) => pkg.slug === value || pkg.id === value || pkg.canonicalPath === normalizedPath);
  if (direct) return direct;

  if (options.includeRedirects) {
    return packages.find((pkg) => (pkg.redirectFrom || []).includes(normalizedPath)) || null;
  }

  return null;
}

export function getPackageByCanonicalPath(path) {
  const normalized = String(path || '').trim().replace(/\/$/, '') || '/';
  return packages.find((pkg) => pkg.canonicalPath === normalized) || null;
}

export function getPackageRedirectTarget(path) {
  const normalized = String(path || '').trim().replace(/\/$/, '');
  return packageRedirects.find((entry) => entry.from === normalized)?.to || null;
}

export default packages;
