import { packages, PACKAGE_GLOBAL_NOTES } from './packages.js';
import ctas from './ctas.js';

const packageTeaserItems = packages.map((pkg) => Object.freeze({
  id: pkg.id,
  name: pkg.name,
  priceLabel: `{{price.${pkg.id}}}`,
  path: pkg.canonicalPath,
  scope: pkg.pageScopeShort,
  description: pkg.shortDescription,
  highlights: [
    pkg.pageScopeShort,
    `Feedbackrunden: ${pkg.feedbackRounds}`,
    'technische SEO-Grundlagen'
  ],
  recommended: pkg.isRecommended,
  recommendationLabel: pkg.recommendationLabel,
  ctaLabel: pkg.ctaLabel
}));

export const webdesignBerlinPage = Object.freeze({
  title: 'Webdesign Berlin | Individuelle Websites ab {{lowestPackagePriceLabel}}',
  description: 'Webdesign Berlin für kleine Unternehmen, Selbstständige und lokale Anbieter: individuelle Websites mit Node.js, EJS, CSS und JavaScript ab {{lowestPackagePriceLabel}}.',
  h1: 'Webdesign Berlin für kleine Unternehmen',
  canonicalPath: '/webdesign-berlin',
  priceNote: PACKAGE_GLOBAL_NOTES.vatNote,
  hero: {
    eyebrow: 'Webdesign Berlin',
    lead: 'Ich entwickle individuelle Websites für kleine Unternehmen, Selbstständige und lokale Dienstleister in Berlin und Brandenburg. Der Fokus liegt auf klarer Angebotsstruktur, serverseitig gerendertem HTML und Anfragewegen, die Besucher ohne Umwege verstehen.',
    highlights: [
      'Start {{price.start}} mit klar begrenztem Umfang',
      'Business {{price.business}} als häufig passende Unternehmenswebsite',
      'Wachstum {{price.wachstum}} für Relaunch, mehr Seiten und stärkere Struktur',
      'Individuell {{price.individuell}} für Sonderfunktionen'
    ],
    primaryCta: { label: 'Website-Projekt anfragen', href: ctas.packageRequest.url },
    secondaryCta: { label: 'Pakete ansehen', href: ctas.comparePackages.url },
    testerLink: { label: 'Website-Tester starten', href: '/website-tester' },
    image: {
      src: '/images/webdesign-berlin-hero.webp',
      alt: 'Webdesign Berlin mit Berliner Stadtmotiv und Website-Entwurf',
      width: 820,
      height: 1458
    }
  },
  intro: {
    title: 'Eine Website, die dein Angebot schnell verständlich macht',
    text: [
      'Viele kleine Unternehmen verlieren Anfragen, weil Website-Besucher erst suchen müssen, was angeboten wird, für wen die Leistung passt und welcher nächste Schritt sinnvoll ist.',
      'Diese Seite erklärt den Webdesign-Ansatz für Berlin: individuell umgesetzt, technisch schlank, mit klarer Preislogik und ohne pauschale Erfolgsversprechen.'
    ],
    image: {
      src: '/images/webdesign-berlin-begruessung.jpg',
      alt: 'Persönliche Begrüßung zum Webdesign-Erstgespräch in Berlin'
    }
  },
  targetGroups: {
    title: 'Für wen Webdesign Berlin passt',
    goodFit: [
      'kleine Unternehmen mit einem klaren lokalen Angebot',
      'Selbstständige, Berater, Praxen, Handwerk und Dienstleistung',
      'Anbieter in Berlin und Brandenburg, die ihre Leistungen verständlicher darstellen möchten',
      'bestehende Websites, die technisch oder inhaltlich geordnet neu aufgebaut werden sollen'
    ],
    notFit: [
      'große Plattformen, Marktplätze oder Enterprise-Projekte',
      'Projekte ohne klare Inhalte, Zielgruppe oder Ansprechpartner',
      'Vorhaben, bei denen Ranking, Umsatz oder rechtliche Prüfung zugesagt werden sollen'
    ]
  },
  individualWebdesign: {
    title: 'Individuelles Webdesign statt Standard-Schablone',
    text: 'Ich plane Seitenstruktur, Design und Umsetzung passend zu deinem Angebot. Die Website entsteht nicht aus einem generischen Theme, sondern aus wiederverwendbaren EJS-Templates, sauberem CSS und gezieltem JavaScript im vereinbarten Umfang.',
    points: [
      'klare Startseite mit verständlicher Positionierung',
      'Leistungsseiten nach Suchintention und Angebotslogik',
      'Kontaktwege, die zu deinem Projektumfang passen',
      'Erweiterungen nach vorheriger Abstimmung statt pauschaler Zusatzversprechen'
    ]
  },
  techUsp: {
    title: 'Technische Grundlage mit Node.js, EJS, CSS und JavaScript',
    lead: 'Die Hauptinhalte werden serverseitig als HTML gerendert. Das schafft eine nachvollziehbare Grundlage für Ladezeit, Barrierearmut im vereinbarten Rahmen und Suchmaschinenlesbarkeit.',
    cards: [
      {
        title: 'Serverseitig gerendertes HTML',
        text: 'Inhalte stehen direkt im HTML und werden nicht erst als Hauptinhalt im Browser nachgeladen.'
      },
      {
        title: 'Node.js und EJS',
        text: 'Templates, Komponenten und Daten bleiben strukturiert, ohne die Seite unnötig schwer zu machen.'
      },
      {
        title: 'CSS und JavaScript gezielt eingesetzt',
        text: 'Interaktionen und Animationen werden dosiert genutzt, damit Gestaltung und Bedienbarkeit zusammenpassen.'
      },
      {
        title: 'Sprechende URLs und interne Links',
        text: 'Leistungen, Pakete und Zusatzseiten können logisch verknüpft werden, damit Nutzer und Suchmaschinen die Struktur besser verstehen.'
      },
      {
        title: 'Strukturierte Daten im passenden Umfang',
        text: 'Schema-Daten können dort ergänzt werden, wo sie zu sichtbaren Inhalten und geprüften Angaben passen.'
      },
      {
        title: 'Keine pauschale Baukasten-Abwertung',
        text: 'WordPress, Webflow oder Baukästen können je nach Projekt sinnvoll sein. Diese Seite erklärt nur, warum hier eine individuelle Umsetzung gewählt wird.'
      }
    ]
  },
  localBenefits: {
    title: 'Lokaler Berlin-Bezug für mehr Sichtbarkeit',
    text: 'Für lokale Anfragen zählen verständliche Leistungen, lokale Signale, kurze Kontaktwege und eine technisch saubere Struktur. Ich kann diese Grundlage vorbereiten; konkrete Platzierungen hängen von Markt, Wettbewerb, Inhalten und laufenden Signalen ab.',
    points: [
      'Berlin- und Brandenburg-Bezug in Texten und Seitenstruktur',
      'sinnvolle interne Links zu Leistungen, Paketen und Referenzen',
      'technische Meta-Daten und Überschriften im vereinbarten Umfang',
      'Google-Business-Profil und Local SEO als mögliche Zusatzleistung'
    ]
  },
  servicesOverview: {
    title: 'Leistungen im Überblick',
    items: [
      {
        title: 'Website-Konzept und Struktur',
        text: 'Positionierung, Seitenaufbau, Navigationslogik und klare Anfragewege.',
        href: '/leistungen/website-audit'
      },
      {
        title: 'Design und responsive Umsetzung',
        text: 'Individuelle Gestaltung für Desktop, Tablet und Smartphone im gewählten Paketumfang.',
        href: '/pakete'
      },
      {
        title: 'Technische SEO-Grundlagen',
        text: 'Sprechende URLs, Meta-Daten, Überschriften, interne Verlinkung und strukturierte Inhalte.',
        href: '/leistungen/local-seo'
      },
      {
        title: 'Texte und Inhalte',
        text: 'Gelieferte Inhalte werden strukturiert. Umfangreiche Texterstellung wird separat abgegrenzt.',
        href: '/leistungen/zusatzleistungen-webdesign'
      },
      {
        title: 'Relaunch-Unterstützung',
        text: 'Bestehende Websites können technisch und inhaltlich neu geordnet werden.',
        href: '/leistungen/website-relaunch'
      },
      {
        title: 'Zusatzleistungen',
        text: 'CMS, Buchungssysteme, Shops, Tracking, Mehrsprachigkeit und Animationen werden separat geprüft.',
        href: '/leistungen/zusatzleistungen-webdesign'
      }
    ]
  },
  comparison: {
    title: 'Wann individuelle Umsetzung sinnvoll ist',
    rows: [
      {
        label: 'Standard-Theme',
        text: 'Schneller Start möglich, aber häufig enger in Gestaltung, Struktur und Performance-Feinheiten.'
      },
      {
        label: 'Individuelle Umsetzung',
        text: 'Mehr Planung und Abstimmung, dafür bessere Kontrolle über Struktur, Code, Inhalte und Erweiterbarkeit.'
      },
      {
        label: 'Entscheidung',
        text: 'Sinnvoll, wenn dein Angebot erklärt werden muss und die Website langfristig als Anfragegrundlage dienen soll.'
      }
    ]
  },
  packageTeaser: {
    title: 'Pakete für Webdesign in Berlin',
    lead: 'Die Pakete sind Orientierung für typische Website-Projekte. Sonderfunktionen, laufende Kosten und Drittanbieter-Dienste werden separat besprochen.',
    packages: packageTeaserItems,
    links: [
      { label: 'Paketübersicht öffnen', href: '/pakete' },
      { label: 'Kosten- und Preisseite öffnen', href: '/webdesign-berlin/kosten-preise-pakete' }
    ]
  },
  included: {
    title: 'Was je nach Paket Teil des Projektumfangs sein kann',
    points: [
      'persönliche Abstimmung und klare Seitenstruktur',
      'individuelles Layout im vereinbarten Umfang',
      'responsive Umsetzung für gängige Bildschirmgrößen',
      'technische SEO-Grundlagen für vereinbarte Seiten',
      'Einbindung gelieferter Inhalte',
      'Feedbackrunden gemäß Paket'
    ]
  },
  notIncluded: {
    title: 'Was separat abgegrenzt wird',
    points: [
      'Hosting, Domain, E-Mail, Wartung und laufende Betriebskosten',
      'Drittanbieter-Tools, Cookie-/Consent-Dienste, Newsletter-Tools und Zahlungsanbieter',
      'Buchungssysteme, CMS-Funktionen, Shop-Funktionen und Mehrsprachigkeit',
      'umfangreiche Texterstellung, Übersetzungen, Bildproduktion und Inhaltsmigration',
      'rechtliche Erstellung oder Prüfung von Impressum, Datenschutzerklärung und Cookie-Hinweisen',
      'laufende SEO-Betreuung, Anzeigen, Social Media und garantierte Platzierungen'
    ]
  },
  process: {
    title: 'Ablauf eines Webdesign-Projekts',
    image: {
      src: '/images/webdesign-ablauf.webp',
      alt: 'Visualisierung des Ablaufs von Anfrage, Struktur, Design, Feedback und Launch-Vorbereitung'
    },
    steps: [
      {
        title: '1. Anfrage und Einordnung',
        text: 'Du beschreibst kurz Projektart, Umfang, Budgetrahmen und vorhandene Website.',
        href: '/kontakt'
      },
      {
        title: '2. Struktur und Angebot',
        text: 'Ich ordne den passenden Paketrahmen ein und grenze Zusatzleistungen sichtbar ab.',
        href: '/pakete'
      },
      {
        title: '3. Design und Umsetzung',
        text: 'Die Website wird mit Node.js, EJS, CSS und JavaScript im vereinbarten Umfang umgesetzt.',
        href: '/webdesign-berlin'
      },
      {
        title: '4. Feedback und Freigabe',
        text: 'Feedbackrunden laufen gemäß Paket. Weitere Wünsche können separat kalkuliert werden.',
        href: '/leistungen/zusatzleistungen-webdesign'
      },
      {
        title: '5. Launch-Vorbereitung',
        text: 'Der Livegang erfolgt nach Freigabe und gemäß vereinbartem Zahlungsmodell.',
        href: '/leistungen/website-wartung'
      }
    ]
  },
  localSeo: {
    title: 'Local SEO als technische und inhaltliche Grundlage',
    text: 'Local SEO bedeutet hier: Seitenstruktur, lokale Sprache, Meta-Daten, interne Links und passende Signale vorbereiten. Eine bestimmte Position bei Google wird nicht zugesagt.',
    links: [
      { label: 'Website-Tester nutzen', href: '/website-tester' },
      { label: 'Zusatzleistungen ansehen', href: '/leistungen/zusatzleistungen-webdesign' }
    ]
  },
  relaunch: {
    title: 'Relaunch bestehender Websites',
    text: 'Wenn bereits eine Website existiert, können Inhalte, Seitenstruktur, Technik und Weiterleitungen geordnet betrachtet werden. Umfang und Risiken hängen vom Bestand ab.',
    links: [
      { label: 'Website-Relaunch ansehen', href: '/leistungen/website-relaunch' },
      { label: 'Website vorab testen', href: '/website-tester' }
    ]
  },
  runningCosts: {
    title: 'Einmalige Projektkosten und laufende Kosten getrennt betrachten',
    text: 'Der Projektpreis beschreibt die Erstellung im vereinbarten Umfang. Domain, E-Mail, Hosting, Wartung, externe Tools und Lizenzen können zusätzlich oder direkt über dich laufen.',
    links: [
      { label: 'Laufende Website-Kosten ansehen', href: '/leistungen/laufende-kosten-website' },
      { label: 'Website-Wartung ansehen', href: '/leistungen/website-wartung' }
    ]
  },
  trust: {
    title: 'Klare Grenzen statt riskanter Versprechen',
    points: [
      'Ich verspreche keine Rankings, Umsätze oder bestimmte Anfragezahlen.',
      'Rechtstexte können technisch eingebunden werden; die rechtliche Prüfung erfolgt extern.',
      'Zusatzwünsche und spätere Erweiterungen werden vorab abgegrenzt.',
      'Nutzungsrechte, Livegang und Zahlung richten sich nach dem vereinbarten Angebot.'
    ],
    links: [
      { label: 'Referenzen ansehen', href: '/referenzen' }
    ]
  },
  faq: [
    {
      question: 'Was kostet Webdesign in Berlin bei Komplettwebdesign?',
      answer: 'Start beginnt bei {{price.start}}, Business bei {{price.business}}, Wachstum bei {{price.wachstum}} und individuelle Projekte bei {{price.individuell}}. Die Preise beziehen sich auf die einmalige Erstellung im vereinbarten Umfang und gelten gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.'
    },
    {
      question: 'Für wen ist Komplettwebdesign geeignet?',
      answer: 'Geeignet ist das Angebot für kleine Unternehmen, Selbstständige, lokale Dienstleister, Praxen, Handwerk und Beratungen in Berlin und Brandenburg, die eine klare Website für Anfragen benötigen.'
    },
    {
      question: 'Was ist der Unterschied zu einer Agentur?',
      answer: 'Du arbeitest direkt mit einem Ansprechpartner. Dadurch bleiben Abstimmung, Umsetzung und Entscheidungen schlanker. Große Kampagnen-Teams oder umfassende Markenprozesse sind nicht der Kern dieses Angebots.'
    },
    {
      question: 'Was ist der Unterschied zu Baukasten oder WordPress-Theme?',
      answer: 'Baukästen und Themes können passend sein, wenn Tempo oder einfache Eigenpflege wichtiger sind. Hier geht es um individuell geplante Seitenstruktur, serverseitig gerendertes HTML und weniger Abhängigkeit von einem Standard-Template.'
    },
    {
      question: 'Warum setzt du auf Node.js und EJS?',
      answer: 'Node.js und EJS ermöglichen strukturierte Templates, serverseitig gerenderte Inhalte und schlanke Komponenten. Das passt gut zu Websites, bei denen klare Inhalte und technische Kontrolle wichtig sind.'
    },
    {
      question: 'Ist eine individuell entwickelte Website SEO-freundlich?',
      answer: 'Eine individuell entwickelte Website kann eine gute technische Grundlage schaffen: saubere HTML-Struktur, Meta-Daten, Überschriften, interne Links und schnelle Auslieferung. Sichtbarkeit hängt trotzdem von Wettbewerb, Inhalten und laufenden Signalen ab.'
    },
    {
      question: 'Gibt es eine Ranking-Garantie?',
      answer: 'Nein. Ich setze technische SEO-Grundlagen und eine nachvollziehbare Seitenstruktur um. Bestimmte Platzierungen bei Google werden nicht zugesagt.'
    },
    {
      question: 'Sind Texte enthalten?',
      answer: 'Gelieferte Texte können eingebunden und strukturiert werden. Umfangreiche Texterstellung, Übersetzungen oder lange SEO-Texte werden separat besprochen.'
    },
    {
      question: 'Sind Impressum und Datenschutzerklärung enthalten?',
      answer: 'Vorhandene Rechtstexte können technisch eingebunden werden. Die Erstellung oder rechtliche Prüfung dieser Texte ist keine Rechtsberatung und sollte bei Bedarf extern erfolgen.'
    },
    {
      question: 'Ist Hosting enthalten?',
      answer: 'Hosting ist nicht automatisch Teil des Projektpreises. Je nach Setup kann es separat über Komplettwebdesign betreut werden oder direkt über dich laufen.'
    },
    {
      question: 'Gibt es laufende Kosten?',
      answer: 'Ja, je nach Setup können Domain, E-Mail, Hosting, Wartung, externe Tools, Lizenzen oder Cookie-/Consent-Dienste laufende Kosten verursachen.'
    },
    {
      question: 'Kann ich meine bestehende Website relaunchen lassen?',
      answer: 'Ja. Ein Relaunch ist besonders sinnvoll, wenn Struktur, Technik, Inhalte oder mobile Darstellung nicht mehr passen. Umfang, Weiterleitungen und Risiken werden vorab eingeordnet.'
    },
    {
      question: 'Sind Buchungssysteme oder CMS möglich?',
      answer: 'Ja, solche Funktionen sind möglich. Die Prüfung läuft als Zusatzleistung oder individuelles Projekt, weil Aufwand und Drittanbieter-Kosten stark variieren können.'
    },
    {
      question: 'Sind Shops möglich?',
      answer: 'Kleine Produkt- oder Zahlungsfunktionen können geprüft werden. Größere Shops, Marktplätze oder komplexe Plattformen brauchen eine gesonderte Projektklärung.'
    },
    {
      question: 'Wie lange dauert ein Webdesign-Projekt?',
      answer: 'Das hängt von Paket, Inhalten, Feedback und Auslastung ab. Kompakte Start-Projekte sind meist schneller als Relaunches oder individuelle Projekte mit Zusatzfunktionen.'
    },
    {
      question: 'Wie läuft die Zusammenarbeit ab?',
      answer: 'Nach der Anfrage werden Ziel, Umfang und Paketlogik eingeordnet. Danach folgen Struktur, Umsetzung, Feedback, Freigabe und Launch-Vorbereitung.'
    },
    {
      question: 'Kann ich später weitere Seiten ergänzen?',
      answer: 'Ja. Zusätzliche Seiten, Leistungsseiten oder lokale Inhalte können später separat geplant und kalkuliert werden.'
    },
    {
      question: 'Bietest du Wartung nach dem Launch an?',
      answer: 'Ja, Wartung und Support können separat vereinbart werden. Umfang, Reaktionszeiten, kleine Inhaltsänderungen und Drittanbieter-Grenzen werden vorher festgelegt.'
    },
    {
      question: 'Was bedeutet Kleinunternehmer nach § 19 UStG?',
      answer: 'Die Preise werden gemäß § 19 UStG ohne Ausweis der Umsatzsteuer angegeben. Für dein Projektangebot wird dieser Hinweis entsprechend ausgewiesen.'
    },
    {
      question: 'Wie frage ich ein Projekt an?',
      answer: 'Nutze die Kontaktseite und wähle das passende Paket oder „Noch unsicher“. Danach kann ich den Umfang grob einordnen und den nächsten Schritt vorschlagen.'
    }
  ],
  cta: {
    title: 'Projektumfang einschätzen lassen',
    text: 'Wenn du noch nicht sicher bist, welches Paket passt, kannst du die Anfrage offen starten. Ich ordne den Umfang anhand deiner Angaben ein.',
    primary: { label: 'Anfrage starten', href: '/kontakt' },
    secondary: { label: 'Pakete vergleichen', href: '/pakete' }
  },
  finalCta: {
    title: 'Webdesign Berlin mit klarer Paketlogik',
    text: 'Die nächste sinnvolle Aktion ist eine unverbindliche Projektanfrage oder der Website-Tester, wenn bereits eine alte Website vorhanden ist.',
    primary: { label: 'Website-Projekt anfragen', href: '/kontakt' },
    secondary: { label: 'Website-Tester starten', href: '/website-tester' }
  },
  internalLinks: [
    { label: 'Pakete', href: '/pakete' },
    { label: 'Start-Paket', href: '/pakete/start' },
    { label: 'Business-Paket', href: '/pakete/business' },
    { label: 'Wachstum-Paket', href: '/pakete/wachstum' },
    { label: 'Individuelles Projekt', href: '/pakete/individuell' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Kosten und Preise', href: '/webdesign-berlin/kosten-preise-pakete' },
    { label: 'Laufende Website-Kosten', href: '/leistungen/laufende-kosten-website' },
    { label: 'Zusatzleistungen Webdesign', href: '/leistungen/zusatzleistungen-webdesign' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Local SEO', href: '/leistungen/local-seo' },
    { label: 'Website-Audit', href: '/leistungen/website-audit' },
    { label: 'Referenzen', href: '/referenzen' },
    { label: 'Website-Tester', href: '/website-tester' }
  ],
  todos: [],
  sections: requiredSections()
});

function requiredSections() {
  return Object.freeze([
    { id: 'hero', label: 'Hero' },
    { id: 'intro', label: 'Einordnung' },
    { id: 'targetGroups', label: 'Zielgruppen' },
    { id: 'individualWebdesign', label: 'Individuelles Webdesign' },
    { id: 'techUsp', label: 'Technik-USP' },
    { id: 'localBenefits', label: 'Lokaler Nutzen' },
    { id: 'servicesOverview', label: 'Leistungen' },
    { id: 'districtPages', label: 'Berliner Bezirke' },
    { id: 'comparison', label: 'Vergleich' },
    { id: 'packageTeaser', label: 'Pakete' },
    { id: 'included', label: 'Enthalten' },
    { id: 'notIncluded', label: 'Nicht enthalten' },
    { id: 'process', label: 'Ablauf' },
    { id: 'localSeo', label: 'Local SEO' },
    { id: 'relaunch', label: 'Relaunch' },
    { id: 'runningCosts', label: 'Laufende Kosten' },
    { id: 'trust', label: 'Grenzen' },
    { id: 'faq', label: 'FAQ' },
    { id: 'cta', label: 'CTA' },
    { id: 'finalCta', label: 'Finale CTA' }
  ]);
}

export default webdesignBerlinPage;
