import { getAddOnById } from './addOns.js';
import { PACKAGE_GLOBAL_NOTES, packages } from './packages.js';

const addOnIds = ['local-seo-basis', 'google-business-profil', 'seo-leistungsseite'];
const localSeoAddOns = addOnIds.map((id) => getAddOnById(id)).filter(Boolean);
const packageSummaries = packages.map((pkg) => ({
  id: pkg.id,
  name: pkg.name,
  priceLabel: `{{price.${pkg.id}}}`,
  path: pkg.canonicalPath,
  scope: pkg.pageScopeShort,
  text: {
    start:
      'Start enthält technische SEO-Grundlagen im schlanken Umfang. Eine umfangreiche lokale Strategie gehört nicht automatisch dazu.',
    business:
      'Business ist für viele lokale Unternehmen passend, wenn mehrere Leistungen klar erklärt und lokal eingeordnet werden sollen.',
    wachstum:
      'Wachstum eignet sich für mehrere Leistungsseiten, Relaunches und eine stärkere lokale Seitenstruktur.',
    individuell:
      'Individuell passt, wenn mehrere Standorte, komplexere Inhaltsstrukturen oder Sonderfunktionen zusammenkommen.'
  }[pkg.id]
}));

export const localSeoPage = Object.freeze({
  slug: 'local-seo',
  canonicalPath: '/leistungen/local-seo',
  title: 'Local SEO Berlin | Lokale Sichtbarkeit verbessern',
  description:
    'Local SEO für kleine Unternehmen in Berlin: technische SEO-Grundlagen, Google Business Profile, lokale Seitenstruktur und klare Optimierung ohne Ranking-Garantie.',
  h1: 'Local SEO Berlin für kleine Unternehmen',
  primaryKeyword: 'Local SEO Berlin',
  secondaryKeywords: [
    'lokale Suchmaschinenoptimierung Berlin',
    'Google Business Profile optimieren',
    'lokale SEO Berlin',
    'lokale Landingpages Berlin',
    'Website lokal auffindbar machen',
    'Local SEO für kleine Unternehmen',
    'Google Maps Sichtbarkeit Berlin',
    'Webdesign und Local SEO Berlin'
  ],
  sections: [
    'hero',
    'intro',
    'targetGroups',
    'localSeoMeaning',
    'technicalFoundation',
    'googleBusinessProfile',
    'localLandingPages',
    'structuredData',
    'trustSignals',
    'limitations',
    'packageConnection',
    'pricing',
    'process',
    'seoBoundary',
    'faq',
    'cta',
    'finalCta'
  ],
  hero: {
    eyebrow: 'Lokale Sichtbarkeit',
    lead:
      'Ich helfe kleinen Unternehmen in Berlin und Brandenburg dabei, Website-Struktur, Google Business Profile und lokale Inhalte sauberer auf lokale Suchanfragen auszurichten.',
    primaryCta: {
      label: 'Local-SEO-Check anfragen',
      url: '/kontakt?projektart=local-seo'
    },
    secondaryCta: {
      label: 'Website prüfen lassen',
      url: '/website-tester'
    },
    highlights: [
      'technische SEO-Grundlagen mit serverseitig gerendertem HTML',
      'Google Business Profile und lokale Seitenstruktur als Bausteine',
      'keine Garantie für bestimmte Rankings, Anfragen oder Umsätze'
    ]
  },
  heroPanel: {
    title: 'Was du realistisch bekommst',
    text:
      'Local SEO wird als Grundlage und Zusatzleistung geplant. Ich prüfe, welche lokalen Seiten, Profilangaben und technischen Signale für deinen Umfang sinnvoll sind.',
    items: [
      'lokale Suchintention und Einzugsgebiet klären',
      'Website, Profil und Kontaktwege zusammen denken',
      'Preisrahmen vor der Umsetzung sauber abgrenzen'
    ]
  },
  intro: {
    title: 'Warum Local SEO für lokale Anbieter wichtig ist',
    text:
      'Viele Kunden suchen Anbieter direkt über Google, Google Maps oder lokale Suchbegriffe. Für kleine Unternehmen ist deshalb wichtig, dass Website, Unternehmensprofil, Bewertungen und lokale Inhalte zusammenpassen. Local SEO ist kein schneller Trick, sondern eine saubere Grundlage, die von Wettbewerb, Standort, Inhalten, Bewertungen und Pflege beeinflusst wird.',
    points: [
      {
        title: 'Website und Profil wirken zusammen',
        text:
          'Eine klare Website-Struktur hilft Nutzern und Suchmaschinen. Das Google Business Profile ergänzt diese Grundlage mit Standort-, Leistungs- und Kontaktdaten.'
      },
      {
        title: 'Lokale Relevanz braucht echte Inhalte',
        text:
          'Lokale Seiten sollten konkrete Leistungen, Einzugsgebiet, Kontaktwege und hilfreiche Informationen zeigen, nicht austauschbare Keyword-Texte.'
      },
      {
        title: 'Ergebnisse hängen von mehreren Faktoren ab',
        text:
          'Technik, Wettbewerb, Entfernung, Bewertungen, Inhalte, Nutzerverhalten und laufende Pflege beeinflussen die Entwicklung.'
      }
    ]
  },
  targetGroups: {
    title: 'Für wen Local SEO sinnvoll ist',
    lead:
      'Local SEO passt, wenn dein Unternehmen in einem konkreten Einzugsgebiet gefunden und angefragt werden soll.',
    usefulFor: [
      'lokale Dienstleister, Handwerker und Beratungen',
      'Praxen, Cafés, Restaurants und kleine Händler',
      'Selbstständige und kleine Unternehmen in Berlin und Brandenburg',
      'Unternehmen mit mehreren Standorten oder klaren Einzugsgebieten',
      'bestehende Websites mit schwacher lokaler Struktur'
    ],
    notPrimary: [
      'deutschlandweite Online-Shops ohne lokalen Bezug',
      'große Plattformen mit eigener SEO-Abteilung',
      'reine Online-Produkte ohne Standortbezug',
      'Projekte, die feste Google-Positionen erwarten',
      'stark umkämpfte Märkte ohne Bereitschaft zu laufender Weiterentwicklung'
    ]
  },
  meaning: {
    title: 'Was Local SEO bei Komplettwebdesign bedeutet',
    lead:
      'Ich ordne Local SEO als klar abgegrenzte Website- und Profiloptimierung ein. Der Umfang wird vorab festgelegt, damit daraus kein offenes Dauerprojekt wird.',
    included: [
      'Analyse der vorhandenen lokalen Website-Struktur',
      'lokale Keyword-Grundlage und Suchintention',
      'Meta-Daten, Überschriften und interne Verlinkung',
      'lokale Leistungsseiten oder Standortseiten, wenn sie fachlich sinnvoll sind',
      'Google-Business-Profil-Prüfung oder Optimierung nach Vereinbarung',
      'strukturierte Daten und Trust-Elemente im passenden Umfang',
      'mobile Nutzbarkeit, Ladezeitgrundlage und klare Kontaktwege'
    ],
    notAutomatic: [
      'laufende SEO-Betreuung',
      'Backlinkaufbau',
      'Bewertungskampagnen oder Bewertungssteuerung',
      'Google Ads oder Social Media',
      'vollständige Content-Strategie für alle Bezirke',
      'Zusage für bestimmte Positionen oder Anfragezahlen'
    ]
  },
  technicalFoundation: {
    title: 'Technische Grundlage mit Node.js, EJS und serverseitigem HTML',
    lead:
      'Die Websites werden individuell mit Node.js, EJS, CSS und JavaScript umgesetzt. Hauptinhalte werden serverseitig als HTML gerendert und können direkt erfasst werden.',
    points: [
      'saubere HTML-Struktur, klare Überschriften und sprechende URLs',
      'individuelle Meta-Daten und interne Verlinkung pro Seite',
      'wenig unnötiges JavaScript für zentrale Inhalte',
      'Bildoptimierung über Cloudinary, soweit im Projekt vorgesehen',
      'strukturierte Daten können passend ergänzt werden',
      'die technische Grundlage ersetzt keine SEO-Strategie, schafft aber eine saubere Basis'
    ]
  },
  googleBusinessProfile: {
    title: 'Google Business Profile als lokaler Baustein',
    lead:
      'Für lokale Anbieter ist das Google Business Profile häufig ein wichtiger Orientierungspunkt. Profil und Website sollten konsistente Angaben zeigen.',
    checks: [
      'Kategorie, Leistungen, Beschreibung und Kontaktdaten prüfen',
      'Öffnungszeiten nur verwenden, wenn sie korrekt und aktuell sind',
      'Website-Link, Bilder und Standortinformationen sinnvoll einordnen',
      'lokale Begriffe natürlich in Beschreibung und Leistungen berücksichtigen',
      'Bewertungen als echte Vertrauenssignale verstehen, nicht künstlich erzeugen'
    ],
    boundaries: [
      'keine Zusage für Google-Maps-Positionen',
      'keine erfundenen Bewertungen oder manipulierte Bewertungsprozesse',
      'keine falschen Öffnungszeiten oder Standortangaben',
      'laufende Profilpflege nur nach separater Vereinbarung'
    ]
  },
  localLandingPages: {
    title: 'Lokale Leistungs- und Standortseiten',
    lead:
      'Lokale Seiten sind dann sinnvoll, wenn echte Relevanz besteht. Eine gute Leistungsseite erklärt ein konkretes Angebot besser als viele dünne Bezirksseiten.',
    good: [
      'Leistung plus Stadt oder Bezirk mit echtem lokalen Bezug',
      'spezielle Zielgruppen oder konkrete Einzugsgebiete',
      'hilfreiche Inhalte, klare Kontaktwege und interne Verlinkung',
      'einzigartige Texte statt austauschbarer Keyword-Abschnitte'
    ],
    avoid: [
      'massenhaft dünne Standortseiten',
      'Keyword-Stuffing',
      'duplizierte Inhalte mit ausgetauschtem Ortsnamen',
      'leere Bezirksseiten ohne fachlichen Mehrwert'
    ]
  },
  structuredData: {
    title: 'Strukturierte Daten vorsichtig einsetzen',
    lead:
      'Strukturierte Daten können Suchmaschinen helfen, Inhalte besser einzuordnen. Sie ersetzen aber keine relevanten Inhalte und führen nicht automatisch zu besonderen Suchergebnissen.',
    types: ['WebPage', 'Service', 'BreadcrumbList', 'FAQPage', 'Organization oder ProfessionalService, wenn die Angaben korrekt sind'],
    boundaries: [
      'keine erfundenen Bewertungen',
      'keine falschen oder erfundenen Bewertungsdaten',
      'keine erfundenen Öffnungszeiten',
      'keine falschen Standorte',
      'keine Zusage für Rich Results'
    ]
  },
  trustSignals: {
    title: 'Inhalte, Bewertungen und Vertrauenssignale',
    lead:
      'Lokale Sichtbarkeit funktioniert besser, wenn Nutzer schnell verstehen, wer hinter dem Angebot steht, welche Leistung angefragt werden kann und warum der Anbieter vertrauenswürdig ist.',
    items: [
      'klare Leistungsbeschreibungen und verständliche Angebote',
      'echte Referenzen und echte Kundenbewertungen, wenn vorhanden',
      'lokale Kontaktinformationen und klare Ansprechpartner',
      'Bilder, FAQ, Öffnungszeiten und Standortangaben nur mit korrekter Grundlage',
      'keine nicht belegten Zertifikate oder falschen Kundenzahlen'
    ]
  },
  limitations: {
    title: 'Was Local SEO nicht zusagen kann',
    text:
      'Ich kann technische und inhaltliche Grundlagen verbessern. Bestimmte Platzierungen, Anfragen oder Umsätze können nicht zugesagt werden, weil Google-Rankings von vielen externen Faktoren abhängen.',
    reasons: [
      'Wettbewerb und Standort verändern die Ausgangslage',
      'Bewertungen, Inhalte und Pflege entwickeln sich über Zeit',
      'Google-Algorithmen ändern sich',
      'schnelle Ergebnisse sind nicht planbar',
      'laufende Weiterentwicklung kann zusätzlich sinnvoll sein'
    ]
  },
  packageConnection: {
    title: 'Local SEO als Zusatzleistung zu Website-Paketen',
    lead:
      'Die Website-Pakete enthalten technische SEO-Grundlagen im vereinbarten Umfang. Local SEO wird ergänzt, wenn lokale Seiten, Profiloptimierung oder eine stärkere lokale Struktur gebraucht werden.',
    packages: packageSummaries
  },
  pricing: {
    title: 'Preisrahmen und Angebotslogik',
    lead:
      'Die genaue Kalkulation hängt davon ab, ob bereits eine Website besteht, wie viele Leistungen oder Standorte abgedeckt werden sollen und ob Inhalte neu erstellt werden müssen.',
    addOns: localSeoAddOns,
    customItems: [
      {
        name: 'Umfangreichere lokale SEO-Struktur',
        priceLabel: 'nach Aufwand',
        shortDescription: 'Für mehrere Standorte, viele Leistungsseiten oder Relaunches mit größerer Inhaltsstruktur.'
      }
    ],
    notes: [
      PACKAGE_GLOBAL_NOTES.vatNote,
      PACKAGE_GLOBAL_NOTES.thirdPartyNote,
      'Die genannten Preisrahmen sind Orientierungswerte und werden vor der Umsetzung konkret eingeordnet.',
      'Local SEO ist nicht automatisch kostenloser Bestandteil jedes Website-Pakets.'
    ]
  },
  process: {
    title: 'Ablauf einer Local-SEO-Optimierung',
    steps: [
      'Anfrage und kurzer Blick auf Website und lokale Ausgangslage',
      'Ziel, Angebot und Einzugsgebiet klären',
      'Google Business Profile prüfen, falls vorhanden',
      'lokale Keyword- und Seitenstruktur grob planen',
      'Angebot oder Zusatzleistung definieren',
      'technische und inhaltliche Umsetzung',
      'Prüfung, Freigabe und optional spätere Weiterentwicklung'
    ]
  },
  seoBoundary: {
    title: 'Technische SEO-Grundlage oder laufende SEO-Betreuung?',
    lead:
      'Diese Seite beschreibt eine abgegrenzte Local-SEO-Leistung. Laufende SEO-Betreuung ist etwas anderes und wird nicht automatisch mitverkauft.',
    foundation: [
      'HTML-Struktur, Meta-Daten und Überschriften',
      'interne Links und sprechende URLs',
      'Ladezeitgrundlage und mobile Darstellung',
      'strukturierte Daten im passenden Umfang'
    ],
    ongoing: [
      'regelmäßig neue Inhalte',
      'kontinuierliche Analyse und Optimierung',
      'Wettbewerbsbeobachtung',
      'Bewertungs- und Profilpflege nach klarer Vereinbarung',
      'Monitoring und Content-Ausbau'
    ]
  },
  faq: [
    {
      question: 'Was ist Local SEO?',
      answer:
        'Local SEO beschreibt Maßnahmen, mit denen Website, Unternehmensprofil und lokale Inhalte besser auf lokale Suchanfragen ausgerichtet werden. Es geht um eine saubere Grundlage, nicht um eine feste Platzierungszusage.'
    },
    {
      question: 'Für wen ist Local SEO in Berlin sinnvoll?',
      answer:
        'Sinnvoll ist es für lokale Dienstleister, Handwerker, Praxen, Beratungen, Gastronomie, kleine Händler und Selbstständige mit klarem Einzugsgebiet in Berlin oder Brandenburg.'
    },
    {
      question: 'Was kostet Local SEO bei Komplettwebdesign?',
      answer:
        'Die Local-SEO-Basis liegt je nach Umfang typischerweise bei 300 bis 700 €. Einzelne Profil- oder Leistungsseiten-Erweiterungen werden separat eingeordnet.'
    },
    {
      question: 'Ist Local SEO in den Website-Paketen enthalten?',
      answer:
        'Technische SEO-Grundlagen sind im vereinbarten Paketumfang enthalten. Eine umfangreichere Local-SEO-Struktur, zusätzliche lokale Seiten oder Profiloptimierung sind Zusatzleistungen.'
    },
    {
      question: 'Gibt es eine Garantie für bessere Rankings?',
      answer:
        'Nein. Ich verbessere technische und inhaltliche Grundlagen. Bestimmte Positionen, Anfragen oder Umsätze hängen von vielen Faktoren ab und können nicht zugesagt werden.'
    },
    {
      question: 'Was ist ein Google Business Profile?',
      answer:
        'Das Google Business Profile ist der öffentliche Unternehmenseintrag bei Google. Dort können unter anderem Kontaktinformationen, Leistungen, Öffnungszeiten, Bilder und Bewertungen erscheinen.'
    },
    {
      question: 'Kannst du mein Google Business Profile optimieren?',
      answer:
        'Ja, sofern ein Profil vorhanden ist und die nötigen Angaben korrekt vorliegen. Ich kann Kategorien, Beschreibung, Leistungen, Bilder-Hinweise und Website-Verlinkung prüfen.'
    },
    {
      question: 'Sind Bewertungen wichtig?',
      answer:
        'Ja, echte Bewertungen können Vertrauen schaffen. Sie dürfen aber nicht erfunden, gekauft oder manipuliert werden. Ich kann nur einen sauberen Umgang damit einordnen.'
    },
    {
      question: 'Erstellst du lokale Landingpages?',
      answer:
        'Ja, wenn Suchintention, Angebot und lokaler Bezug passen. Eine zusätzliche lokale Leistungsseite wird als Zusatzleistung kalkuliert.'
    },
    {
      question: 'Sind Bezirksseiten sinnvoll?',
      answer:
        'Manchmal. Bezirksseiten sollten nur entstehen, wenn es echten lokalen Bezug und hilfreiche Inhalte gibt. Dünne Seiten mit ausgetauschtem Ortsnamen sind nicht sinnvoll.'
    },
    {
      question: 'Was sind strukturierte Daten?',
      answer:
        'Strukturierte Daten sind maschinenlesbare Informationen im Code. Sie können Suchmaschinen helfen, Inhalte einzuordnen, führen aber nicht automatisch zu besonderen Suchergebnissen.'
    },
    {
      question: 'Hilft Node.js/EJS bei Local SEO?',
      answer:
        'Die serverseitige Ausgabe mit Node.js und EJS sorgt dafür, dass Hauptinhalte als HTML vorliegen. Das ist eine gute technische Grundlage, ersetzt aber keine SEO-Strategie.'
    },
    {
      question: 'Wie lange dauert Local SEO?',
      answer:
        'Eine abgegrenzte Optimierung kann je nach Umfang wenige Tage bis einige Wochen dauern. Die Entwicklung in der Suche braucht meist mehr Zeit und lässt sich nicht fest zusagen.'
    },
    {
      question: 'Kann meine bestehende Website lokal optimiert werden?',
      answer:
        'Ja, wenn Technik, Struktur und Inhalte eine sinnvolle Grundlage bieten. Bei größeren Problemen kann ein Relaunch wirtschaftlicher sein.'
    },
    {
      question: 'Was ist der Unterschied zwischen Local SEO und normalem SEO?',
      answer:
        'Local SEO konzentriert sich stärker auf Stadt, Bezirk, Standort, Einzugsgebiet, lokale Suchintention und das Google Business Profile. Allgemeines SEO kann deutlich breiter sein.'
    },
    {
      question: 'Bietest du laufende SEO-Betreuung an?',
      answer:
        'Ich übernehme technische Grundlagen und definierte Local-SEO-Leistungen. Laufende Betreuung wird nur separat besprochen und gehört nicht automatisch zum Standardumfang.'
    },
    {
      question: 'Kann Local SEO mit einem Relaunch kombiniert werden?',
      answer:
        'Ja. Gerade bei einem Relaunch lassen sich Seitenstruktur, interne Links, lokale Inhalte und Profilbezug sauber von Anfang an mitplanen.'
    },
    {
      question: 'Wie frage ich Local SEO an?',
      answer:
        'Am besten beschreibst du kurz dein Angebot, dein Einzugsgebiet, deine aktuelle Website und ob ein Google Business Profile vorhanden ist.'
    }
  ],
  cta: {
    title: 'Lokale Sichtbarkeit zuerst sauber einordnen',
    text:
      'Wenn du wissen möchtest, ob Local SEO für deine Website sinnvoll ist, prüfe ich Ausgangslage, Einzugsgebiet und mögliche Zusatzleistungen vor der Umsetzung.',
    primary: {
      label: 'Lokale Sichtbarkeit besprechen',
      url: '/kontakt?projektart=local-seo'
    },
    secondary: {
      label: 'Pakete ansehen',
      url: '/pakete'
    }
  },
  finalCta: {
    title: 'Local SEO als klar abgegrenzte Zusatzleistung anfragen',
    text:
      'Ich ordne gemeinsam mit dir ein, ob eine Profiloptimierung, lokale Leistungsseite, technische Grundlage oder ein Relaunch der sinnvollste nächste Schritt ist.',
    primary: {
      label: 'Local SEO anfragen',
      url: '/kontakt?projektart=local-seo'
    },
    secondary: {
      label: 'Website-Tester starten',
      url: '/website-tester'
    }
  },
  internalLinks: [
    {
      label: 'Webdesign Berlin',
      href: '/webdesign-berlin',
      text: 'Individuelle Websites mit technischer SEO-Grundlage.'
    },
    {
      label: 'Website-Pakete',
      href: '/pakete',
      text: 'Start, Business, Wachstum und Individuell vergleichen.'
    },
    {
      label: 'Zusatzleistungen',
      href: '/leistungen/zusatzleistungen-webdesign',
      text: 'Local SEO, Profiloptimierung und SEO-Seiten als Zusatzleistung einordnen.'
    },
    {
      label: 'Website-Tester',
      href: '/website-tester',
      text: 'Bestehende Website technisch und inhaltlich vorab prüfen.'
    },
    {
      label: 'Website-Relaunch Berlin',
      href: '/leistungen/website-relaunch',
      text: 'Local SEO direkt mit einer neuen Seitenstruktur kombinieren.'
    },
    {
      label: 'Laufende Website-Kosten',
      href: '/leistungen/laufende-kosten-website',
      text: 'Hosting, Wartung, Domain, E-Mail und externe Tools getrennt betrachten.'
    }
  ],
  preChangeAudit: {
    existingUrl: 'Alte Route /local-seo-berlin leitet auf die Leistungs-URL weiter.',
    overlappingUrl: '/webdesign-berlin/seo-sichtbarkeit-einsteiger',
    canonicalPlan: '/leistungen/local-seo',
    redirectNote:
      'Ähnliche Short-URLs wie /local-seo oder /seo-berlin existierten lokal nicht. Deshalb wurde kein Redirect eingerichtet.',
    seoRisk:
      'Die alte Einsteiger-Seite bleibt thematisch enger im Webdesign-Berlin-Bereich. Die neue Seite bündelt die eigenständige Zusatzleistung Local SEO Berlin.'
  }
});

export default localSeoPage;
