import { addOns } from './addOns.js';
import { ctas } from './ctas.js';
import { PACKAGE_GLOBAL_NOTES, packages } from './packages.js';

const addOnById = new Map(addOns.map((item) => [item.id, item]));

function pickAddOns(ids) {
  return ids.map((id) => addOnById.get(id)).filter(Boolean);
}

function section({
  id,
  kicker,
  title,
  lead,
  addOnIds = [],
  points = [],
  usefulFor = [],
  boundaries = [],
  links = []
}) {
  return {
    id,
    kicker,
    title,
    lead,
    addOns: pickAddOns(addOnIds),
    points,
    usefulFor,
    boundaries,
    links
  };
}

const packageBoundary = packages.map((pkg) => {
  const summaries = {
    start: {
      title: 'Start bleibt ein klar begrenzter Einstieg ohne Sonderfunktionen.',
      text: 'Geeignet für Onepager oder 1 bis 3 Inhaltsseiten. Zusätzliche Seiten, Texte, CMS, Buchung oder Tracking werden getrennt geprüft.'
    },
    business: {
      title: 'Business ist die häufig passende Unternehmenswebsite.',
      text: 'Geeignet für ca. 4 bis 7 Inhaltsseiten. Weitere Leistungsseiten oder Funktionen können als Zusatzleistung dazukommen.'
    },
    wachstum: {
      title: 'Wachstum eignet sich für größere Strukturen, Relaunches und mehrere Leistungsseiten.',
      text: 'Geeignet für ca. 8 bis 12 Inhaltsseiten. Migration, Local SEO, Landingpages oder komplexere Erweiterungen werden separat eingeordnet.'
    },
    individuell: {
      title: 'Individuell ist sinnvoll, wenn mehrere Sonderfunktionen oder größere technische Anforderungen zusammenkommen.',
      text: 'Geeignet für Sonderfunktionen, CMS, Buchungssysteme, Mehrsprachigkeit, Shop-Funktionen oder größere technische Erweiterungen nach Aufwandsschätzung.'
    }
  };

  return {
    id: pkg.id,
    name: pkg.name,
    priceLabel: `{{price.${pkg.id}}}`,
    path: pkg.canonicalPath,
    ...summaries[pkg.id]
  };
});

const detailSections = [
  section({
    id: 'zusatzseite-standard',
    kicker: 'Seitenumfang',
    title: 'Zusätzliche Standard-Unterseiten',
    lead:
      'Eine zusätzliche Standardseite ist sinnvoll, wenn dein bestehender Website-Umfang erweitert werden soll, ohne direkt eine neue Seitenstrategie aufzubauen.',
    addOnIds: ['zusatzseite-standard'],
    points: [
      'für klare Themen wie Über uns, Referenzen, Ablauf, Team oder einfache Leistungen',
      'im bestehenden Designrahmen und mit überschaubarem Inhaltsumfang',
      'Navigation, interne Verlinkung und mobile Darstellung werden mitgedacht'
    ],
    usefulFor: ['Start-Erweiterung', 'Business-Ausbau', 'kleine Ergänzung nach dem Launch'],
    boundaries: [
      'keine umfangreiche Texterstellung',
      'keine eigene SEO-Strategie für neue Suchthemen',
      'kein unbegrenzter Seitenumfang'
    ]
  }),
  section({
    id: 'seo-leistungsseite',
    kicker: 'SEO-Seiten',
    title: 'SEO- und Leistungsseiten',
    lead:
      'SEO- oder Leistungsseiten sind stärker strukturiert als einfache Unterseiten, weil Suchintention, Überschriften, interne Links und Angebotslogik genauer geplant werden.',
    addOnIds: ['seo-leistungsseite'],
    points: [
      'für einzelne Leistungen, Bezirke, Branchen oder erklärungsbedürftige Angebote',
      'mit Title, Description, H1/H2-Struktur und interner Verlinkung im vereinbarten Umfang',
      'als Grundlage für bessere Auffindbarkeit, ohne bestimmte Rankings zu versprechen'
    ],
    usefulFor: ['lokale Dienstleister', 'mehrere Angebote', 'Relaunch mit neuer Seitenstruktur'],
    boundaries: ['keine Zusage für bestimmte Google-Positionen', 'keine laufende SEO-Betreuung', 'keine pauschale Keyword-Masse']
  }),
  section({
    id: 'texterstellung-erweitert',
    kicker: 'Texte',
    title: 'Website-Texte und Strukturhilfe',
    lead:
      'Wenn Inhalte fehlen oder nur grob vorliegen, kann ich aus Briefing, Stichpunkten und vorhandenen Materialien eine verständliche Seitenstruktur und Website-Texte ausarbeiten.',
    addOnIds: ['texterstellung-erweitert'],
    points: [
      'Angebot, Zielgruppe und wichtigste Einwände verständlich formulieren',
      'Startseiten-, Leistungsseiten- oder FAQ-Texte vorbereiten',
      'gelieferte Inhalte redaktionell ordnen und lesbarer machen'
    ],
    usefulFor: ['neue Websites ohne Textmaterial', 'Relaunches mit veralteten Inhalten', 'klarere Angebotskommunikation'],
    boundaries: ['keine unbegrenzte Texterstellung', 'keine Rechtsberatung', 'keine automatische Übersetzung']
  }),
  section({
    id: 'animationen-einfach',
    kicker: 'Bewegung',
    title: 'Einfache Animationen',
    lead:
      'Einfache Animationen sind kleine, gezielte Bewegungen, die vorhandene Inhalte hochwertiger wirken lassen, ohne eine eigene Interaktionslogik oder ein neues Gestaltungskonzept zu brauchen.',
    addOnIds: ['animationen-einfach'],
    points: [
      'dezente Hover-, Scroll- oder Statusanimationen für einzelne Buttons, Karten oder Abschnitte',
      'Bewegungen werden im bestehenden Designrahmen umgesetzt und bewusst begrenzt',
      'Ziel ist mehr Wertigkeit und Orientierung, nicht ein animiertes Gesamterlebnis'
    ],
    usefulFor: ['Buttons und Karten', 'kleine Landingpage-Akzente', 'mehr Wertigkeit ohne neue Interaktionslogik'],
    boundaries: [
      'keine komplexen Szenen oder animierten Storyboards',
      'keine durchgehenden Effekte über ganze Seiten hinweg',
      'keine Sonderlogik, die Layout oder Ladezeit stark verändert'
    ]
  }),
  section({
    id: 'animationen-umfangreich',
    kicker: 'Bewegung',
    title: 'Umfangreiche Animationen',
    lead:
      'Umfangreiche Animationen sind ein eigenes Interaktionskonzept. Sie werden separat geprüft, weil Timing, Zustände, Geräteverhalten, Performance und Bedienbarkeit deutlich mehr Abstimmung brauchen.',
    addOnIds: ['animationen-umfangreich'],
    points: [
      'mehrstufige Scroll-, Übergangs- oder Interaktionsabläufe mit mehreren Zuständen',
      'Bewegung wird konzeptionell geplant und technisch auf Machbarkeit geprüft',
      'Performance, mobile Darstellung und reduzierte Bewegung werden von Anfang an mitgedacht'
    ],
    usefulFor: ['markenprägende Landingpages', 'erklärungsintensive Angebote', 'individuelle Kampagnenbereiche'],
    boundaries: [
      'nicht als kleines Pauschal-Effektpaket kalkulierbar',
      'keine Animation ohne klares Ziel, Konzept und Performanceprüfung',
      'zusätzliche Tests für Geräte, Browser und reduzierte Bewegung einplanen'
    ]
  }),
  section({
    id: 'buchungssystem-integration',
    kicker: 'Buchung',
    title: 'Buchungssysteme',
    lead:
      'Buchungssysteme sind keine Standardpaket-Leistung. Sie werden geprüft, weil Terminlogik, Bestätigungen, Kalender, Zahlungen und Anbietergebühren den Aufwand stark verändern können.',
    addOnIds: ['buchungssystem-integration'],
    points: [
      'Einbindung vorhandener Buchungstools oder Planung eines passenden Buchungswegs',
      'Abstimmung von Terminarten, Verfügbarkeiten, Bestätigung und Anfrageprozess',
      'Drittanbieter-Kosten und Datenschutzanforderungen separat einordnen'
    ],
    usefulFor: ['Beratungstermine', 'Reservierungen', 'Dienstleistungen mit festen Slots'],
    boundaries: ['nicht automatisch im Paket enthalten', 'keine Zahlungslogik ohne separate Prüfung', 'kein 24/7-Notfallbetrieb']
  }),
  section({
    id: 'cms-einfach',
    kicker: 'Pflege',
    title: 'CMS oder einfache Content-Verwaltung',
    lead:
      'Ein CMS ist sinnvoll, wenn du bestimmte Inhalte regelmäßig selbst ändern willst. Es erhöht aber Struktur-, Sicherheits- und Wartungsaufwand und wird deshalb separat geplant.',
    addOnIds: ['cms-einfach'],
    points: [
      'bearbeitbare Bereiche wie News, Angebote, einfache Referenzen oder einzelne Inhalte',
      'klare Rollen, Inhaltsarten und Pflegegrenzen vor der Umsetzung definieren',
      'Wartung und technische Verantwortung getrennt betrachten'
    ],
    usefulFor: ['regelmäßige Inhaltsänderungen', 'Newsbereiche', 'wiederkehrende Angebote'],
    boundaries: ['kein CMS in Standardpaketen', 'keine Enterprise-Redaktion', 'keine unbegrenzte Inhaltslogik']
  }),
  section({
    id: 'tracking-einrichtung',
    kicker: 'Messung',
    title: 'Tracking und Analytics',
    lead:
      'Tracking wird nur eingeplant, wenn klar ist, welche Ereignisse gemessen werden sollen und welche Consent- oder Tool-Anforderungen daraus entstehen.',
    addOnIds: ['tracking-einrichtung'],
    points: [
      'Kontaktklicks, Formularstatus, Button-Klicks oder Tester-Nutzung technisch vorbereiten',
      'keine personenbezogenen Freitextdaten als Trackingdaten verwenden',
      'externe Tools und Consent-Anforderungen vor der Einrichtung klären'
    ],
    usefulFor: ['Anfrageauswertung', 'Kampagnen', 'Website-Optimierung nach dem Launch'],
    boundaries: ['kein Google Analytics automatisch', 'kein Tracking ohne Datenschutzkonzept', 'keine Zusage für bestimmte Anfrage- oder Abschlussquoten']
  }),
  section({
    id: 'local-seo',
    kicker: 'Lokale Sichtbarkeit',
    title: 'Local SEO als Zusatzleistung',
    lead:
      'Local SEO kann die Website-Struktur für lokale Suchanfragen verbessern. Dazu gehören lokale Begriffe, interne Verlinkung, strukturierte Daten und passende Seitenideen.',
    addOnIds: ['local-seo-basis'],
    points: [
      'lokale Suchbegriffe und Leistungsbezüge sinnvoll einordnen',
      'interne Links, lokale Inhalte und strukturierte Daten vorbereiten',
      'lokale Landingpages nur anlegen, wenn Suchintention und Umfang passen'
    ],
    usefulFor: ['Berliner Dienstleister', 'lokale Anbieter', 'Unternehmen mit Einzugsgebiet'],
    boundaries: ['keine Zusage für bestimmte Google-Positionen', 'keine Bewertungen oder Profilpflege ohne separate Vereinbarung']
  }),
  section({
    id: 'google-business-profil',
    kicker: 'Google-Profil',
    title: 'Google-Business-Profil-Optimierung',
    lead:
      'Ein gepflegtes Google Business Profile kann lokale Orientierung verbessern. Die Optimierung bleibt eine Zusatzleistung, weil Kategorien, Leistungen, Fotos und Zuständigkeiten einzeln geprüft werden.',
    addOnIds: ['google-business-profil'],
    points: [
      'Kategorien, Leistungen, Beschreibung und Basisdaten strukturieren',
      'Fotos und Website-Verlinkung prüfen',
      'Abstimmung mit Website-Inhalten und lokalen Leistungsseiten'
    ],
    usefulFor: ['lokale Unternehmen', 'Dienstleister mit Standort', 'Unternehmen mit vielen telefonischen Anfragen'],
    boundaries: ['keine Bewertungszusage', 'keine Platzierungszusage', 'keine laufende Profilpflege ohne Vereinbarung']
  }),
  section({
    id: 'mehrsprachigkeit',
    kicker: 'Sprachen',
    title: 'Mehrsprachigkeit',
    lead:
      'Mehrsprachigkeit erhöht Seitenumfang, Pflegeaufwand und technische Anforderungen. Deshalb wird sie nicht als Standardumfang behandelt.',
    addOnIds: ['mehrsprachigkeit'],
    points: [
      'zusätzliche Sprachversionen technisch vorbereiten und einbinden',
      'Übersetzungen, hreflang-Prüfung und Inhalte pro Sprache separat klären',
      'rechtliche Texte in anderen Sprachen nur mit externer Prüfung verwenden'
    ],
    usefulFor: ['internationale Zielgruppen', 'mehrsprachige Dienstleistungen', 'Tourismus und Gastronomie'],
    boundaries: ['keine automatische perfekte Übersetzung', 'keine Mehrsprachigkeit im Standardpaket']
  }),
  section({
    id: 'bildrecherche-bildbearbeitung',
    kicker: 'Bilder',
    title: 'Bildrecherche und Bildbearbeitung',
    lead:
      'Wenn keine eigenen Bilder vorhanden sind, kann ich passende Bildwelten recherchieren, zuschneiden und technisch für die Website vorbereiten.',
    addOnIds: ['bildrecherche-bildbearbeitung'],
    points: [
      'Bildauswahl passend zu Branche, Angebot und Seitenstruktur',
      'Zuschnitt, einfache Bearbeitung und Web-Optimierung',
      'Cloudinary-Optimierung, soweit technisch im Projekt vorgesehen'
    ],
    usefulFor: ['fehlendes Bildmaterial', 'Relaunches', 'Landingpages'],
    boundaries: ['Bildlizenzen nicht automatisch enthalten', 'keine professionelle Fotografie', 'keine unbegrenzte Bildbearbeitung']
  }),
  section({
    id: 'inhaltsmigration',
    kicker: 'Relaunch',
    title: 'Inhaltsmigration',
    lead:
      'Bei einem Relaunch können bestehende Inhalte übernommen und neu strukturiert werden. Der Aufwand hängt von Menge, Qualität und alter URL-Struktur ab.',
    addOnIds: ['inhaltsmigration'],
    points: [
      'Texte, Bilder, PDFs und alte Seitenstruktur prüfen',
      'wichtige Inhalte priorisieren und in neue Seitenlogik übertragen',
      'Weiterleitungen und SEO-Risiken separat einordnen'
    ],
    usefulFor: ['bestehende Websites', 'Relaunches', 'größere Inhaltsbestände'],
    boundaries: ['keine automatische Übernahme aller Altinhalte', 'kein zugesagter Erhalt bestehender Suchpositionen', 'keine große Archivmigration im Kleinauftrag'],
    links: [{ label: 'Relaunch-Seite ansehen', href: '/leistungen/website-relaunch' }]
  }),
  section({
    id: 'landingpage',
    kicker: 'Kampagnen',
    title: 'Landingpages',
    lead:
      'Landingpages sind eigenständige Zielseiten für Kampagnen, Angebote, lokale Themen oder einzelne Leistungen. Sie brauchen klare CTA-Struktur und ein enges Ziel.',
    addOnIds: ['landingpage'],
    points: [
      'Aufbau nach Zielgruppe, Angebot, Einwand und nächstem Schritt',
      'Design und Inhalt fokussiert auf eine konkrete Anfrage oder Aktion',
      'Tracking optional, wenn Tools und Datenschutzanforderungen geklärt sind'
    ],
    usefulFor: ['Kampagnen', 'neue Angebote', 'lokale Leistungsseiten'],
    boundaries: ['keine Zusage für bestimmte Anfrage- oder Abschlussquoten', 'keine Zusage für bestimmte Ads-Ergebnisse', 'kein pauschales Kampagnenmanagement']
  }),
  section({
    id: 'relaunch-konzept',
    kicker: 'Planung',
    title: 'Relaunch-Konzept',
    lead:
      'Vor einem größeren Relaunch kann ein Konzept helfen, Struktur, Inhalte, Weiterleitungen, Risiken und Prioritäten sauber zu klären.',
    addOnIds: ['relaunch-konzept'],
    points: [
      'bestehende Website analysieren und sinnvolle Struktur ableiten',
      'wichtige Inhalte, URLs und Anfragewege priorisieren',
      'technische und inhaltliche Risiken vor der Umsetzung sichtbar machen'
    ],
    usefulFor: ['Relaunches', 'größere Inhaltsbestände', 'unklare Prioritäten'],
    boundaries: ['keine vollständige SEO-Migration im Kleinauftrag', 'kein zugesagter Erhalt bestehender Suchpositionen'],
    links: [{ label: 'Website-Relaunch', href: '/leistungen/website-relaunch' }]
  }),
  section({
    id: 'website-audit',
    kicker: 'Analyse',
    title: 'Website-Audit',
    lead:
      'Ein Website-Audit ist eine bezahlte Analyse einer bestehenden Website. Es geht tiefer als ein schneller Website-Check und liefert konkrete Handlungsempfehlungen.',
    addOnIds: ['website-audit'],
    points: [
      'SEO, Technik, Ladezeit, UX, Trust, Conversion und Local SEO prüfen',
      'Probleme priorisieren und nächste Schritte ableiten',
      'Unterschied zwischen Schnellcheck und vertiefter Projektprüfung klar halten'
    ],
    usefulFor: ['bestehende Websites', 'Relaunch-Entscheidungen', 'Priorisierung vor größeren Maßnahmen'],
    boundaries: ['keine vollständige rechtliche Prüfung', 'keine Zusage für bestimmte Suchpositionen oder Umsatzentwicklung'],
    links: [{ label: 'Website-Tester starten', href: '/website-tester' }]
  }),
  section({
    id: 'fehlerbehebung',
    kicker: 'Support',
    title: 'Fehlerbehebungen',
    lead:
      'Konkrete Fehler an bestehenden Websites können geprüft werden. Ob eine Behebung sinnvoll ist, hängt von Technik, Zugriffen und Zustand des Systems ab.',
    addOnIds: ['fehlerbehebung'],
    points: [
      'Formular-, Darstellungs-, Link- oder technische Fehler untersuchen',
      'Node.js/EJS-Projekte meist besser einschätzbar als unbekannte Fremdsysteme',
      'WordPress, Webflow oder Baukasten-Systeme nur nach Prüfung'
    ],
    usefulFor: ['konkrete Bugs', 'Darstellungsprobleme', 'Formularfehler'],
    boundaries: ['keine Sofortgarantie', 'kein 24/7-Notfallservice', 'fremde Systeme nicht pauschal reparierbar']
  }),
  section({
    id: 'stundenweise-weiterentwicklung',
    kicker: 'Weiterentwicklung',
    title: 'Stundenweise Weiterentwicklung',
    lead:
      'Für kleinere Anpassungen nach dem Launch kann eine stundenweise Weiterentwicklung sinnvoll sein, wenn Aufgaben klar priorisiert und abgrenzbar sind.',
    addOnIds: ['stundenweise-weiterentwicklung'],
    points: [
      'neue Abschnitte, kleine technische Verbesserungen oder Bugfixes',
      'Erweiterungen und Optimierungen nach priorisiertem Aufgabenpaket',
      'Abrechnungseinheit und Verfügbarkeit vor Beginn klären'
    ],
    usefulFor: ['kleine Anpassungen', 'laufende Verbesserung', 'technische Ergänzungen'],
    boundaries: ['keine unbegrenzte Verfügbarkeit', 'keine Rechtsberatung und keine Zusage für bestimmte SEO-Ergebnisse', 'größere Aufgaben als separates Angebot']
  })
];

export const addOnsPage = Object.freeze({
  slug: 'zusatzleistungen-webdesign',
  canonicalPath: '/leistungen/zusatzleistungen-webdesign',
  title: 'Zusatzleistungen Webdesign | Erweiterungen & Preise',
  description:
    'Zusatzleistungen für deine Website: zusätzliche Seiten, SEO-Seiten, Texte, Animationen, Buchung, CMS, Tracking, Local SEO und mehr.',
  h1: 'Zusatzleistungen für deine Website',
  primaryKeyword: 'Zusatzleistungen Webdesign',
  secondaryKeywords: [
    'Website erweitern lassen',
    'Webdesign Zusatzleistungen',
    'zusätzliche Website-Seiten',
    'Website Erweiterung Berlin',
    'Website Funktionen ergänzen',
    'Website Texte erstellen lassen',
    'Local SEO Zusatzleistung',
    'Website Wartung Erweiterungen'
  ],
  hero: {
    eyebrow: 'Webdesign Zusatzleistungen',
    lead:
      'Zusatzleistungen werden separat kalkuliert, damit die Website-Pakete fair und klar bleiben. So zahlst du nicht pauschal für Funktionen, die dein Projekt nicht braucht, und wir klären Erweiterungen vor der Umsetzung sauber ab.',
    highlights: [
      'klare Abgrenzung zu Start, Business, Wachstum und Individuell',
      'Preisrahmen als Orientierung vor der Umsetzung',
      'Drittanbieter-Kosten, Tools und laufende Kosten getrennt betrachten'
    ],
    primaryCta: {
      label: 'Zusatzleistung anfragen',
      url: '/kontakt?projektart=zusatzleistung'
    },
    secondaryCta: {
      label: 'Pakete ansehen',
      url: ctas.comparePackages.url
    }
  },
  intro: {
    title: 'Erweiterungen ohne unklare Paketversprechen',
    text:
      'Nicht jedes Website-Projekt braucht Buchung, CMS, Tracking, Mehrsprachigkeit oder zusätzliche SEO-Seiten. Auf dieser Seite findest du typische Erweiterungen mit Preisrahmen, Nutzen und klarer Abgrenzung zum Standardumfang.'
  },
  whySeparate: {
    title: 'Warum Zusatzleistungen separat berechnet werden',
    text:
      'Zusatzleistungen hängen stark von Inhalt, Technik, Anbieter, Datenschutzanforderungen und gewünschter Tiefe ab. Eine separate Kalkulation schützt kleine Projekte vor unnötigen Kosten und verhindert, dass Sonderwünsche den Paketumfang unklar machen.',
    points: [
      'kleine Projekte bezahlen nicht für ungenutzte Funktionen',
      'Sonderfunktionen werden vor der Umsetzung geprüft',
      'Drittanbieter-Kosten und laufende Kosten bleiben sichtbar',
      'Pakete behalten klare Leistungsgrenzen'
    ]
  },
  packageBoundary,
  addOns: addOns.map((item, index) => ({
    ...item,
    order: item.order || index + 1,
    priceNote: item.priceNote || 'Orientierungswert, abhängig von Umfang und technischer Prüfung.',
    details: item.details || [],
    notIncluded: item.notIncluded || []
  })),
  detailSections,
  whenIndividual: {
    title: 'Wann daraus ein individuelles Projekt wird',
    text:
      'Wenn mehrere Zusatzleistungen zusammenkommen, ist ein individuelles Projekt oft sinnvoller als viele Einzelpositionen.',
    points: [
      'mehrere Sonderfunktionen oder Schnittstellen',
      'Buchungslogik mit Zahlung oder komplexen Verfügbarkeiten',
      'CMS mit mehreren Inhaltsarten',
      'Mehrsprachigkeit mit vielen Seiten',
      'Shop-Funktionen oder Produktlogik',
      'umfangreiche Animationen oder technische Weiterentwicklung',
      'komplexe Migration und URL-Planung'
    ],
    cta: {
      label: 'Individuelles Projekt ansehen',
      url: '/pakete/individuell'
    }
  },
  notOffered: {
    title: 'Was nicht zum Standardangebot gehört',
    text:
      'Für sehr große Plattformen oder komplexe Shop-Systeme ist eine spezialisierte Agentur oder ein größeres Entwicklerteam oft sinnvoller.',
    items: [
      'große Marktplätze',
      'Amazon- oder Zalando-ähnliche Shops',
      'komplexe SaaS-Plattformen',
      'Enterprise-Systeme',
      'große Mitgliederplattformen',
      'hochkomplexe Schnittstellenlandschaften',
      '24/7-Support ohne separate Vereinbarung',
      'Rechtsberatung',
      'bestimmte SEO-Rankings als Zusage',
      'Umsatzziele als Zusage'
    ]
  },
  legalNotes: [
    'Alle Preisangaben sind Orientierungswerte und verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    'Drittanbieter-Kosten, Lizenzen und externe Tools sind nicht automatisch enthalten.',
    PACKAGE_GLOBAL_NOTES.legalNote,
    PACKAGE_GLOBAL_NOTES.seoNote,
    'Tools können eigene Kosten und Datenschutzanforderungen haben.'
  ],
  faq: [
    {
      question: 'Was sind Zusatzleistungen im Webdesign?',
      answer: 'Zusatzleistungen sind Erweiterungen außerhalb des vereinbarten Website-Pakets, zum Beispiel zusätzliche Seiten, Texte, Tracking, Buchung, CMS, Local SEO oder Migration.'
    },
    {
      question: 'Warum sind Zusatzleistungen nicht automatisch enthalten?',
      answer: 'Weil Aufwand, Tools und laufende Kosten je nach Projekt stark variieren. Eine separate Kalkulation hält die Pakete klar und fair.'
    },
    {
      question: 'Kann ich später weitere Seiten ergänzen?',
      answer: 'Ja. Zusätzliche Standard- oder SEO-Seiten können nach dem Launch geplant und separat kalkuliert werden.'
    },
    {
      question: 'Was kostet eine zusätzliche Unterseite?',
      answer: 'Eine einfache zusätzliche Unterseite liegt häufig bei ab 120–250 €, abhängig von Inhalt, Struktur und Designumfang.'
    },
    {
      question: 'Was ist der Unterschied zwischen Standardseite und SEO-Seite?',
      answer: 'Eine Standardseite ergänzt ein klares Thema. Eine SEO-Seite wird stärker auf Suchintention, Überschriften, interne Links und Angebotsstruktur ausgerichtet.'
    },
    {
      question: 'Sind Texte in den Paketen enthalten?',
      answer: 'Gelieferte Inhalte können im vereinbarten Umfang eingebunden und strukturiert werden. Umfangreiche Texterstellung wird separat eingeordnet.'
    },
    {
      question: 'Was kostet umfangreiche Texterstellung?',
      answer: 'Für umfangreichere Website-Texte liegt der typische Rahmen bei ab 250–900 €, je nach Seitenanzahl, Briefing und Rechercheaufwand.'
    },
    {
      question: 'Sind Animationen sinnvoll?',
      answer: 'Ja, wenn sie Orientierung, Wertigkeit oder Interaktion unterstützen. Sie sollten die Seite nicht verlangsamen oder vom Inhalt ablenken.'
    },
    {
      question: 'Sind Buchungssysteme möglich?',
      answer: 'Ja, nach Prüfung. Buchungssysteme sind Zusatzleistungen oder individuelle Projekte, weil Anbieter, Terminlogik und mögliche Zahlungen den Aufwand verändern.'
    },
    {
      question: 'Ist ein CMS möglich?',
      answer: 'Ja, wenn regelmäßige Inhaltsänderungen geplant sind. Umfang, Inhaltsarten und Wartung werden vorher definiert.'
    },
    {
      question: 'Sind mehrsprachige Websites möglich?',
      answer: 'Ja. Mehrsprachigkeit erhöht Seitenumfang und Pflegeaufwand. Übersetzungen und rechtliche Prüfung fremdsprachiger Texte werden separat geklärt.'
    },
    {
      question: 'Sind Shops möglich?',
      answer: 'Kleine Shop- oder Produktfunktionen können individuell geprüft werden. Größere Shops sind kein Standardpaket.'
    },
    {
      question: 'Was kostet Tracking?',
      answer: 'Die technische Einrichtung liegt häufig bei ab 150–400 €, abhängig von Ereignissen, Tools und Consent-Anforderungen.'
    },
    {
      question: 'Was ist Local SEO als Zusatzleistung?',
      answer: 'Local SEO ordnet lokale Suchbegriffe, interne Links, lokale Inhalte und strukturierte Daten für dein Einzugsgebiet ein.'
    },
    {
      question: 'Kann mein Google Business Profile optimiert werden?',
      answer: 'Ja. Kategorien, Leistungen, Beschreibung, Fotos und Website-Verlinkung können geprüft und strukturiert verbessert werden.'
    },
    {
      question: 'Was kostet Inhaltsmigration?',
      answer: 'Inhaltsmigration liegt häufig bei ab 250–900 €, je nach Menge, Qualität, alter Struktur und Weiterleitungsbedarf.'
    },
    {
      question: 'Wann wird aus Zusatzleistungen ein individuelles Projekt?',
      answer: 'Wenn mehrere Sonderfunktionen, komplexe Migration, CMS, Mehrsprachigkeit, Shop-Funktionen oder Schnittstellen zusammenkommen.'
    },
    {
      question: 'Kannst du bestimmte SEO-Ergebnisse zusagen?',
      answer: 'Nein. Ich setze technische und inhaltliche Grundlagen um. Bestimmte Platzierungen bei Google können nicht zugesagt werden.'
    },
    {
      question: 'Sind Drittanbieter-Kosten enthalten?',
      answer: 'Nein, externe Tools, Lizenzen, Anbietergebühren und laufende Dienste werden separat betrachtet.'
    },
    {
      question: 'Wie frage ich eine Zusatzleistung an?',
      answer: 'Du kannst über die Kontaktseite kurz beschreiben, welche Erweiterung du brauchst. Danach ordne ich Umfang, Aufwand und sinnvolle nächste Schritte ein.'
    }
  ],
  internalLinks: [
    { label: 'Pakete ansehen', href: '/pakete', text: 'Start, Business, Wachstum und Individuell vergleichen' },
    { label: 'Individuelles Projekt', href: '/pakete/individuell', text: 'Sonderfunktionen und größere Anforderungen einordnen' },
    { label: 'Projekt anfragen', href: '/kontakt', text: 'Zusatzleistung oder Erweiterung beschreiben' },
    { label: 'Laufende Website-Kosten', href: '/leistungen/laufende-kosten-website', text: 'Domain, E-Mail, Hosting, Wartung und Tools getrennt betrachten' },
    { label: 'Kosten- und Preisseite', href: '/webdesign-berlin/kosten-preise-pakete', text: 'Einmalige Projektkosten und Beispiele ansehen' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch', text: 'Bestehende Website geordnet erneuern' },
    { label: 'Website-Tester', href: '/website-tester', text: 'Schnellen technischen Check starten' },
    { label: 'Webdesign Berlin', href: '/webdesign-berlin', text: 'Hauptleistung und lokale Ausrichtung ansehen' }
  ],
  finalCta: {
    title: 'Welche Erweiterung brauchst du wirklich?',
    text:
      'Beschreibe kurz dein Ziel, deine bestehende Website und die gewünschte Zusatzleistung. Ich ordne ein, ob ein Add-on reicht oder ob ein individuelles Projekt sinnvoller ist.',
    primary: {
      label: 'Erweiterung besprechen',
      url: '/kontakt?projektart=zusatzleistung'
    },
    secondary: {
      label: 'Pakete vergleichen',
      url: '/pakete'
    }
  },
  sections: [
    { id: 'intro' },
    { id: 'why-separate' },
    { id: 'package-boundary' },
    { id: 'add-on-overview' },
    ...detailSections.map((item) => ({ id: item.id })),
    { id: 'when-individual' },
    { id: 'not-offered' },
    { id: 'legal-notes' },
    { id: 'faq' },
    { id: 'final-cta' }
  ]
});

export default addOnsPage;
