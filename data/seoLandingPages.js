import { PACKAGE_GLOBAL_NOTES, packages } from './packages.js';
import { getAddOnById } from './addOns.js';

const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]));

function relaunchPackagePoint(id, text) {
  const pkg = packageById.get(id);
  if (!pkg) return text;
  return `${pkg.name} {{price.${id}}}: ${text}`;
}

function addOnPricePoint(id, fallbackName, fallbackPriceLabel, text) {
  const addOn = getAddOnById(id);
  const label = addOn ? `${addOn.name} ${addOn.priceLabel}` : `${fallbackName} ${fallbackPriceLabel}`;
  return text ? `${label}: ${text}` : label;
}

export const SEO_LANDING_PAGES = Object.freeze([
  {
    slug: 'website-erstellen-lassen-berlin',
    path: '/website-erstellen-lassen-berlin',
    primaryKeyword: 'website erstellen lassen berlin',
    parentBreadcrumb: { label: 'Leistungen', href: '/leistungen' },
    title: 'Website erstellen lassen Berlin | Komplett Webdesign',
    description: 'Website erstellen lassen in Berlin: klare Struktur, Texte, Technik und SEO-Grundlage für kleine Unternehmen, die professionell online sichtbar werden wollen.',
    h1: 'Website erstellen lassen in Berlin',
    intro: 'Du willst eine Website erstellen lassen, die nicht nur gut aussieht, sondern dein Angebot verständlich macht und Anfragen erleichtert. Komplett Webdesign plant, textet und baut Websites für Berliner Unternehmen mit klarer Struktur, mobilem Design und sauberer SEO-Grundlage.',
    sections: [
      {
        eyebrow: 'Positionierung',
        heading: 'Erst klären, was die Website leisten soll',
        body: 'Vor dem Design geht es um Zielgruppe, Leistungen, lokale Suchbegriffe und Kontaktwege. So entsteht eine Seitenstruktur, die Besucher schnell führt und später sinnvoll erweitert werden kann.',
        points: [
          'Ziele, Leistungen und wichtigste Suchintentionen klären',
          'Seitenstruktur für lokale Sichtbarkeit vorbereiten',
          'Anfragewege vor der Umsetzung festlegen'
        ]
      },
      {
        eyebrow: 'Umsetzung',
        heading: 'Design, Texte und Technik aus einer Hand',
        body: 'Texte, Layout und technische Grundlage werden gemeinsam gedacht. Dadurch passen Headline, Leistungsabschnitte, Formular, mobile Darstellung und Ladezeit zusammen, statt nachträglich zusammengesetzt zu wirken.',
        points: [
          'Mobilfreundliches Layout für Smartphone und Desktop',
          'Verständliche Website-Texte ohne unnötige Fachsprache',
          'SEO-Grundlage mit Title, Description, H1 und interner Verlinkung'
        ]
      },
      {
        eyebrow: 'Launch',
        heading: 'Sauber online gehen statt nur veröffentlichen',
        body: 'Vor dem Livegang werden gelieferte Pflichtseiten technisch eingebunden, Formulare, technische Signale, Sitemap und grundlegende Tracking-Punkte geprüft. Das reduziert Reibung direkt nach dem Start und schafft eine belastbare Grundlage für weitere Optimierung.',
        points: [
          'Kontaktformular und wichtige Links prüfen',
          'Canonical, Sitemap und Indexierung vorbereiten',
          'Weiterentwicklung nach Launch nachvollziehbar planen'
        ]
      }
    ],
    cta: {
      label: 'Website-Projekt anfragen',
      href: '/kontakt',
      text: 'Beschreibe kurz, welche Website du brauchst. Danach klären wir Umfang, Inhalte und sinnvolle nächste Schritte.'
    },
    secondaryCta: {
      label: 'Pakete ansehen',
      href: '/pakete'
    },
    faq: [
      {
        question: 'Was kostet es, eine Website in Berlin erstellen zu lassen?',
        answer: 'Bei Komplett Webdesign starten Websites bei {{lowestPackagePriceLabel}}. Der genaue Preis hängt von Seitenanzahl, Textumfang, Funktionen und SEO-Struktur ab.'
      },
      {
        question: 'Wie lange dauert ein Website-Projekt?',
        answer: 'Kleine Websites dauern meist 2 bis 4 Wochen. Mehrseitige Firmenwebsites liegen häufig bei 4 bis 6 Wochen, umfangreichere Projekte bei 6 bis 8 Wochen.'
      },
      {
        question: 'Sind Texte und SEO enthalten?',
        answer: 'Ja. Die Website wird mit passenden Texten, sinnvoller Seitenstruktur und einer SEO-Grundlage aus Title, Description, H1, internen Links und sauberer Technik aufgebaut.'
      },
      {
        question: 'Kann eine bestehende Website überarbeitet werden?',
        answer: 'Ja. Wenn Struktur oder Technik noch tragfähig sind, kann eine Optimierung reichen. Wenn Design, Inhalte und Technik gleichzeitig bremsen, ist ein Relaunch meist sauberer.'
      }
    ],
    internalLinks: [
      { label: 'Webdesign Berlin', href: '/webdesign-berlin', text: 'Lokale Webdesign-Leistung für Berliner Unternehmen' },
      { label: 'Website-Relaunch Berlin', href: '/leistungen/website-relaunch', text: 'Bestehende Website neu ausrichten' },
      { label: 'Website-Kosten Berlin', href: '/ratgeber/website-kosten-berlin', text: 'Preise und laufende Kosten einordnen' },
      { label: 'Projektablauf', href: '/ablauf', text: 'So läuft ein Website-Projekt Schritt für Schritt' },
      { label: 'Referenzen', href: '/referenzen', text: 'Ausgewählte Projekte ansehen' }
    ]
  },
  {
    slug: 'website-relaunch-berlin',
    path: '/leistungen/website-relaunch',
    primaryKeyword: 'website relaunch berlin',
    parentBreadcrumb: { label: 'Leistungen', href: '/leistungen' },
    title: 'Website Relaunch Berlin | Website modernisieren',
    description: 'Website-Relaunch in Berlin: veraltete Website modernisieren, Struktur verbessern, Weiterleitungen beachten und technisch sauber mit Node.js/EJS umsetzen.',
    h1: 'Website Relaunch Berlin für moderne Unternehmenswebsites',
    intro: 'Deine bestehende Website wirkt veraltet, ist mobil schwach, bringt zu wenig Anfragen oder passt nicht mehr zu deinem Angebot. Ich plane Website-Relaunches für kleine Unternehmen in Berlin und Brandenburg mit neuer Struktur, sauberer Technik, bewusster SEO-Risiko-Prüfung und klaren Anfragewegen.',
    service: {
      name: 'Website Relaunch Berlin',
      serviceType: 'Website-Relaunch und technische Neuaufsetzung',
      areaServed: ['Berlin', 'Brandenburg']
    },
    sections: [
      {
        id: 'intro',
        eyebrow: 'Einordnung',
        heading: 'Wann ein Relaunch sinnvoll ist',
        body: 'Ein Relaunch ist sinnvoll, wenn nicht nur das Design, sondern auch Struktur, Inhalte und technische Grundlage verbessert werden sollen. Das betrifft vor allem Websites, die mobil schlecht funktionieren, langsam laden, Angebote unklar erklären oder technisch nur noch schwer sauber weiterentwickelt werden können.',
        points: [
          'veraltetes Design, schwache mobile Darstellung oder lange Ladezeiten als Ausgangspunkt prüfen',
          'neue Leistungen, Zielgruppen und Kontaktwege in eine klare Seitenstruktur übersetzen',
          'alte Baukasten- oder Theme-Strukturen nur ablösen, wenn der Neustart fachlich sinnvoll ist'
        ]
      },
      {
        id: 'relaunchReasons',
        eyebrow: 'Gründe',
        heading: 'Typische Gründe für einen Website-Relaunch',
        body: 'Oft kommen mehrere Gründe zusammen: Die Website wirkt nicht mehr professionell, Inhalte sind gewachsen, Leistungen haben sich verändert oder Besucher finden den nächsten Schritt nicht schnell genug. Der Relaunch ordnet diese Themen gemeinsam, statt nur die Oberfläche auszutauschen.',
        points: [
          'neues Design, bessere mobile Darstellung und klarere Positionierung',
          'bessere Seitenstruktur, Anfrageführung und interne Verlinkung',
          'technische Modernisierung, lokale SEO-Struktur und weniger Altlasten als Ziel'
        ]
      },
      {
        id: 'risks',
        eyebrow: 'Risiken',
        heading: 'Ein Relaunch braucht Planung, weil er nicht risikofrei ist',
        body: 'Ein Relaunch sollte nicht nur optisch gedacht werden. Wenn bestehende Inhalte oder Sichtbarkeit wichtig sind, müssen Struktur, URLs, Weiterleitungen und Inhalte sorgfältig geprüft werden. Rankings können nach einer Umstellung schwanken, besonders wenn alte URLs, Inhalte oder interne Links ohne Plan verändert werden.',
        points: [
          'fehlende Weiterleitungen können 404-Fehler und Sichtbarkeitsprobleme auslösen',
          'Inhalte, Meta-Daten, interne Links oder Tracking können beim Neustart verloren gehen',
          'technische Fehler nach dem Livegang lassen sich reduzieren, aber nicht pauschal ausschließen'
        ]
      },
      {
        id: 'seoSafeMigration',
        eyebrow: 'SEO',
        heading: 'SEO-schonende Umstellung statt Ranking-Versprechen',
        body: 'Ziel ist eine möglichst SEO-schonende Umstellung. Dafür werden bestehende Seiten, relevante Inhalte, neue Seitenstruktur, Meta-Daten, Canonicals, interne Links, Sitemap, robots/noindex-Signale und strukturierte Daten im vereinbarten Umfang geprüft. Bestimmte Rankings oder ein vollständiger Ranking-Erhalt können aber nicht garantiert werden.',
        points: [
          'wichtige bestehende Seiten und Suchintentionen vor dem Relaunch einordnen',
          'Meta-Daten, Überschriften und interne Links neu setzen oder übernehmen',
          '404-Risiken reduzieren und nach dem Livegang wichtige Signale prüfen'
        ]
      },
      {
        id: 'redirects',
        eyebrow: 'Weiterleitungen',
        heading: 'Alte URLs und Weiterleitungen bewusst behandeln',
        body: 'Bei bestehenden Websites sollten alte URLs gesammelt und wichtigen neuen Zielen zugeordnet werden. 301-Weiterleitungen können sinnvoll sein, um 404-Fehler zu reduzieren. Der genaue Umfang hängt aber von Website-Größe, alter Struktur und relevanten Seiten ab.',
        points: [
          'wichtige alte URLs erfassen und passende neue Ziele planen',
          'Weiterleitungen im vereinbarten Umfang vorbereiten oder dokumentieren',
          'nicht jede alte URL muss unverändert weiterbestehen, wenn Inhalt und Ziel nicht mehr passen'
        ]
      },
      {
        id: 'contentMigration',
        eyebrow: 'Inhalte',
        heading: 'Inhaltsübernahme und Migration sauber abgrenzen',
        body: 'Bestehende Texte, Bilder, PDFs und Seiten können übernommen werden, wenn sie fachlich noch sinnvoll sind. Veraltete oder doppelte Inhalte sollten nicht ungeprüft in die neue Website wandern. Größere Migrationen, Bildrechte und redaktionelle Überarbeitung werden separat eingeordnet.',
        points: [
          'bestehende Inhalte prüfen, kürzen, strukturieren oder gezielt übernehmen',
          'umfangreiche Inhaltsmigration und neue Texte vorab kalkulieren',
          'Bildlizenzen, Rechte und rechtliche Prüfung alter Inhalte nicht als Standardleistung behandeln'
        ]
      },
      {
        id: 'newStructure',
        eyebrow: 'Angebotslogik',
        heading: 'Neue Seitenstruktur für klarere Angebote',
        body: 'Ein Relaunch ist eine gute Gelegenheit, Angebote verständlicher zu ordnen. Startseite, Leistungsseiten, Kontakt, FAQ, Referenzen und lokale Inhalte sollten so zusammenspielen, dass Besucher schneller erkennen, ob dein Unternehmen passt und wie sie anfragen können.',
        points: [
          'Leistungsseiten nach Angebot, Zielgruppe und Suchintention planen',
          'Startseite, Kontaktwege und Vertrauenselemente klarer verbinden',
          'Business eignet sich für kleinere Relaunches, Wachstum für umfangreichere Strukturen und Individuell für Sonderfunktionen'
        ]
      },
      {
        id: 'techImplementation',
        eyebrow: 'Technik',
        heading: 'Technische Neuaufsetzung mit Node.js und EJS',
        body: 'Die neue Website wird individuell mit Node.js, EJS, CSS und JavaScript umgesetzt. Hauptinhalte werden serverseitig als HTML gerendert. Das schafft eine saubere Grundlage für Struktur, Performance, Suchmaschinenlesbarkeit und spätere Erweiterungen, ohne Baukasten- oder Standard-Theme-Zwang.',
        points: [
          'serverseitig gerendertes HTML mit sauberen EJS-Templates',
          'wiederverwendbare Strukturen, individuelles CSS und sparsames JavaScript',
          'keine pauschale Abwertung anderer Systeme, aber bewusster Neustart ohne alte Theme-Altlasten'
        ]
      },
      {
        id: 'performance',
        eyebrow: 'Performance',
        heading: 'Mobile Darstellung, Ladezeit und Bilder verbessern',
        body: 'Ein Relaunch kann mobile Nutzung, Bildaufbereitung und Ladezeitgrundlage verbessern. Dafür werden Bildgrößen, responsive Darstellung, Lazy Loading, CSS/JavaScript-Umfang und sinnvolle Animationen geprüft. Konkrete Scores werden nicht zugesagt, weil Inhalt, Hosting, Tools und Drittanbieter eine Rolle spielen.',
        points: [
          'responsive Layouts für Smartphone und Desktop sauber testen',
          'Cloudinary-Bildoptimierung nutzen, soweit im Projekt vorgesehen',
          'Core Web Vitals als Orientierung betrachten, nicht als feste Zusage'
        ]
      },
      {
        id: 'pricing',
        eyebrow: 'Pakete',
        heading: 'Relaunch-Pakete und Preislogik',
        body: `Ein Relaunch fällt je nach Umfang häufig in Business, Wachstum oder Individuell. Start ist eher für kompakte neue Websites geeignet und nicht als pauschaler Relaunch-Einstieg gedacht. ${PACKAGE_GLOBAL_NOTES.vatNote}`,
        points: [
          relaunchPackagePoint('business', 'für kleinere Relaunches mit mehreren Inhaltsseiten und klarer Angebotsstruktur.'),
          relaunchPackagePoint('wachstum', 'für umfangreichere Relaunches, mehrere Leistungsseiten und stärkere Struktur.'),
          relaunchPackagePoint('individuell', 'für Sonderfunktionen, größere Migrationen, CMS, Buchungssysteme oder Mehrsprachigkeit.')
        ]
      },
      {
        id: 'audit',
        eyebrow: 'Audit',
        heading: 'Website-Audit vor dem Relaunch',
        body: 'Bei einer bestehenden Website ist eine Prüfung vor dem Relaunch sinnvoll. Der Website-Tester liefert einen ersten Überblick zu Technik, SEO, Metadaten und Fehlern. Das Website-Audit als vertiefte Relaunch-Analyse hilft, Inhalte, URLs, Risiken und nächste Schritte genauer zu bewerten.',
        points: [
          'Technik, Ladezeit, SEO-Grundlagen, UX, Trust und Anfragewege vorab prüfen',
          'Handlungsempfehlungen priorisieren, bevor Design und Umsetzung starten',
          'Website-Audit separat anfragen, wenn die bestehende Website vor dem Relaunch genauer bewertet werden soll'
        ]
      },
      {
        id: 'localSeo',
        eyebrow: 'Local SEO',
        heading: 'Local SEO beim Relaunch mitdenken',
        body: 'Ein Relaunch kann die lokale Seitenstruktur verbessern: lokale Begriffe, Leistungsseiten, Standort- oder Einzugsgebietsbezug, Google Business Profile und strukturierte Daten können zusammen geplant werden. Auch hier gilt: Local SEO schafft Grundlagen, aber keine festen Google-Positionen.',
        points: [
          'lokale Leistungsseiten und interne Links sinnvoll einplanen',
          'Google Business Profile und Website-Inhalte konsistent halten',
          'zur Local-SEO-Seite wechseln, wenn lokale Sichtbarkeit ein Hauptziel ist'
        ]
      },
      {
        id: 'process',
        eyebrow: 'Ablauf',
        heading: 'Ablauf eines Relaunch-Projekts',
        body: 'Der Relaunch läuft strukturiert von Anfrage, Prüfung und Seitenplanung über Inhalte, Design, technische Umsetzung, Weiterleitungsprüfung, Feedback und Freigabe bis zum Livegang. Nach dem Livegang ist eine Nachkontrolle sinnvoll, besonders bei bestehenden Inhalten und wichtigen URLs.',
        points: [
          'Anfrage, bestehende Website prüfen, Ziel, Umfang und Risiken klären',
          'Seitenstruktur, Inhalte, Migration, Angebot und Umsetzung abstimmen',
          'Feedbackrunden, technische Prüfung, Freigabe, Livegang und optionale Wartung sauber trennen'
        ]
      },
      {
        id: 'notIncluded',
        eyebrow: 'Abgrenzung',
        heading: 'Was nicht automatisch enthalten ist',
        body: 'Ein Relaunch kann viele Zusatzthemen berühren. Damit Angebot und Verantwortung klar bleiben, werden umfangreiche Migrationen, Spezialfunktionen, externe Tools und laufende Betreuung nicht automatisch als Standardumfang verstanden.',
        points: [
          'vollständige Inhaltsmigration, umfangreiche SEO-Migration oder alle alten URLs als Redirects',
          'laufende SEO-Betreuung, Google Ads, Social Media, Tracking-Neukonzept oder neue Texte in großem Umfang',
          'CMS, Buchungssystem, Shop-Funktionen, Mehrsprachigkeit, komplexe Schnittstellen, Hosting oder Wartung ohne Vereinbarung'
        ]
      }
    ],
    cta: {
      label: 'Relaunch besprechen',
      href: '/kontakt?projektart=relaunch',
      text: 'Beschreibe kurz deine aktuelle Website, was nicht mehr passt und welche Ziele du mit dem Relaunch erreichen möchtest. Danach klären wir Umfang, Risiken und sinnvolle Paketlogik.'
    },
    secondaryCta: {
      label: 'Website prüfen lassen',
      href: '/website-tester'
    },
    finalCta: {
      label: 'Website-Relaunch anfragen',
      href: '/kontakt?projektart=relaunch',
      text: 'Wenn deine Website nicht mehr zu deinem Unternehmen passt, planen wir den Neustart mit Struktur, Technik, Inhalten und realistischen Grenzen.',
      secondaryLabel: 'Pakete ansehen',
      secondaryHref: '/pakete'
    },
    faq: [
      {
        question: 'Was ist ein Website Relaunch?',
        answer: 'Ein Website Relaunch ist die strukturierte Erneuerung einer bestehenden Website. Dabei werden Design, Inhalte, Seitenstruktur, Technik, mobile Darstellung und wichtige SEO-Grundlagen neu eingeordnet.'
      },
      {
        question: 'Wann ist ein Website-Relaunch sinnvoll?',
        answer: 'Ein Relaunch ist sinnvoll, wenn Design, mobile Nutzung, Inhalte, Technik und Anfragewege gleichzeitig bremsen. Wenn nur einzelne Punkte schwach sind, kann eine gezielte Optimierung reichen.'
      },
      {
        question: 'Was kostet ein Website Relaunch in Berlin?',
        answer: 'Kleinere Relaunches können im Business-Paket {{price.business}} starten. Umfangreichere Relaunches liegen häufig im Wachstum-Paket {{price.wachstum}} oder bei individuellen Projekten {{price.individuell}}. Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.'
      },
      {
        question: 'Ist ein Relaunch im Business-Paket möglich?',
        answer: 'Ja, wenn die bestehende Website überschaubar ist und die neue Struktur ungefähr 4 bis 7 Inhaltsseiten umfasst. Größere Migrationen, Sonderfunktionen oder viele alte URLs werden separat geprüft.'
      },
      {
        question: 'Wann brauche ich das Wachstum-Paket?',
        answer: 'Wachstum passt, wenn mehrere Leistungsseiten, mehr Inhaltsstruktur, ein größerer Relaunch oder eine stärkere SEO- und Local-SEO-Grundlage benötigt werden.'
      },
      {
        question: 'Kann ich meine alten Inhalte übernehmen?',
        answer: 'Ja, wenn die Inhalte fachlich noch passen. Texte, Bilder und PDFs sollten aber geprüft werden, damit veraltete, doppelte oder rechtlich ungeklärte Inhalte nicht ungeprüft übernommen werden.'
      },
      {
        question: 'Was passiert mit alten URLs?',
        answer: 'Wichtige alte URLs sollten gesammelt und passenden neuen Zielen zugeordnet werden. Das reduziert 404-Fehler, ersetzt aber keine Garantie für bestimmte Suchpositionen.'
      },
      {
        question: 'Sind Weiterleitungen enthalten?',
        answer: 'Weiterleitungen können im vereinbarten Umfang vorbereitet werden. Bei vielen alten URLs oder komplexen Strukturen kann die Redirect-Arbeit eine eigene Zusatzleistung sein.'
      },
      {
        question: 'Kann ein Relaunch SEO-Rankings beeinflussen?',
        answer: 'Ja. URL-Änderungen, fehlende Inhalte, Metadaten, interne Links oder technische Fehler können Sichtbarkeit beeinflussen. Deshalb wird die Umstellung möglichst SEO-schonend geplant.'
      },
      {
        question: 'Gibt es eine Garantie für Ranking-Erhalt?',
        answer: 'Nein. Ich kann Risiken reduzieren und technische SEO-Grundlagen sauber vorbereiten. Bestimmte Positionen oder ein vollständiger Erhalt bestehender Sichtbarkeit können nicht zugesagt werden.'
      },
      {
        question: 'Wird die neue Website schneller?',
        answer: 'Die neue Website wird auf schlanke Technik, optimierte Bilder und mobile Nutzbarkeit ausgerichtet. Ein bestimmter PageSpeed-Score wird aber nicht zugesagt.'
      },
      {
        question: 'Wird die Website mit Node.js/EJS neu aufgebaut?',
        answer: 'Ja, die Umsetzung erfolgt individuell mit Node.js, EJS, CSS und JavaScript. Hauptinhalte werden serverseitig als HTML gerendert.'
      },
      {
        question: 'Ist ein Relaunch von WordPress/Baukasten möglich?',
        answer: 'Ja, wenn Inhalte und Ziele klar sind. Das bisherige System wird nicht pauschal schlechtgeredet, aber die neue Umsetzung wird ohne Standard-Theme-Zwang geplant.'
      },
      {
        question: 'Sind Texte enthalten?',
        answer: 'Gelieferte Inhalte können eingebunden und strukturiert werden. Umfangreiche Texterstellung oder komplette redaktionelle Überarbeitung wird separat kalkuliert.'
      },
      {
        question: 'Sind Rechtstexte enthalten?',
        answer: 'Impressum, Datenschutzerklärung und Cookie-Hinweise können technisch eingebunden werden. Die Erstellung oder rechtliche Prüfung dieser Texte ist keine Rechtsberatung.'
      },
      {
        question: 'Ist Local SEO beim Relaunch sinnvoll?',
        answer: 'Oft ja, besonders bei lokalen Dienstleistern in Berlin und Brandenburg. Lokale Seitenstruktur, Google Business Profile und interne Links können beim Relaunch sinnvoll mitgeplant werden.'
      },
      {
        question: 'Sollte ich vorher ein Website-Audit machen?',
        answer: 'Bei bestehenden Websites ist eine Vorprüfung sinnvoll. Der Website-Tester gibt einen ersten Überblick; eine vertiefte Relaunch-Analyse kann separat angefragt werden.'
      },
      {
        question: 'Wie lange dauert ein Relaunch?',
        answer: 'Kleinere Relaunches dauern oft einige Wochen. Der genaue Zeitraum hängt von Seitenumfang, Inhaltsstatus, Feedback, Migration und technischer Komplexität ab.'
      },
      {
        question: 'Was passiert nach dem Livegang?',
        answer: 'Nach dem Livegang sollten wichtige Seiten, Formulare, Weiterleitungen, Sitemap und technische Signale kontrolliert werden. Weitere Optimierungen können danach priorisiert werden.'
      },
      {
        question: 'Kann ich Wartung dazubuchen?',
        answer: 'Ja, Wartung und Support können separat vereinbart werden. Hosting, Wartung, Backups, Monitoring und Inhaltsänderungen sind nicht automatisch Teil jedes Relaunch-Projekts.'
      }
    ],
    internalLinks: [
      { label: 'Webdesign Berlin', href: '/webdesign-berlin', text: 'Die Hauptseite für Webdesign in Berlin' },
      { label: 'Website erstellen lassen', href: '/website-erstellen-lassen-berlin', text: 'Neue Website statt Relaunch planen' },
      { label: 'Pakete vergleichen', href: '/pakete', text: 'Business, Wachstum und Individuell einordnen' },
      { label: 'Business-Paket', href: '/pakete/business', text: 'Kleinerer Relaunch mit klarer Struktur' },
      { label: 'Wachstum-Paket', href: '/pakete/wachstum', text: 'Umfangreicherer Relaunch mit mehreren Leistungsseiten' },
      { label: 'Individuell', href: '/pakete/individuell', text: 'Sonderfunktionen, Migration oder größere Anforderungen' },
      { label: 'Website-Audit', href: '/leistungen/website-audit', text: 'Bestehende Website vor dem Relaunch vertieft prüfen' },
      { label: 'Website-Tester', href: '/website-tester', text: 'Aktuelle Website vor dem Relaunch prüfen' },
      { label: 'Audit anfragen', href: '/kontakt?projektart=audit', text: 'Vertiefte Relaunch-Analyse separat besprechen' },
      { label: 'Local SEO Berlin', href: '/leistungen/local-seo', text: 'Lokale Sichtbarkeit beim Relaunch mitplanen' },
      { label: 'Laufende Kosten', href: '/leistungen/laufende-kosten-website', text: 'Hosting, Domain, E-Mail und externe Tools einordnen' },
      { label: 'Website-Wartung', href: '/leistungen/website-wartung', text: 'Support nach dem Livegang separat planen' },
      { label: 'Kontakt', href: '/kontakt?projektart=relaunch', text: 'Relaunch-Aufwand einschätzen lassen' }
    ],
    todos: [
      'Nach Livegang prüfen, ob mehr interne Links von Paketdetailseiten auf /leistungen/website-relaunch sinnvoll sind.'
    ]
  },
  {
    slug: 'website-audit',
    path: '/leistungen/website-audit',
    primaryKeyword: 'website audit',
    parentBreadcrumb: { label: 'Leistungen', href: '/leistungen' },
    title: 'Website Audit | SEO, Technik & Conversion prüfen',
    description: 'Website-Audit für SEO, Technik, Ladezeit, UX, Trust, Conversion und Local SEO. Mit konkreten Empfehlungen für Optimierung oder Relaunch.',
    h1: 'Website Audit: Website prüfen und gezielt verbessern',
    intro: 'Du hast eine bestehende Website und weißt nicht, ob kleine Optimierungen reichen oder ein Relaunch sinnvoller ist. Im Website-Audit prüfe ich SEO, Technik, Ladezeit, mobile Nutzung, Trust, Conversion, Inhalte und Local SEO als vertiefte Analyse mit priorisierten Empfehlungen statt pauschaler Versprechen.',
    service: {
      name: 'Website Audit',
      serviceType: 'Website-Audit und Website-Analyse',
      areaServed: ['Berlin', 'Brandenburg']
    },
    sections: [
      {
        id: 'intro',
        eyebrow: 'Einordnung',
        heading: 'Warum ein Website-Audit sinnvoll ist',
        body: 'Viele Websites bremsen Anfragen, ohne dass ein einzelner Grund sofort sichtbar ist. Ein Audit macht technische, inhaltliche und nutzerbezogene Schwachstellen greifbar und hilft, Budget gezielter einzusetzen. Nicht immer muss direkt neu gebaut werden; manchmal reichen klare Verbesserungen in Struktur, Technik oder Kontaktführung.',
        points: [
          'unklare Schwachstellen sichtbar machen, bevor Geld in Relaunch oder Optimierung fließt',
          'Prioritäten für SEO, Technik, Inhalte, UX und Anfragewege sortieren',
          'Entscheidung zwischen gezielter Optimierung und größerem Relaunch besser vorbereiten'
        ]
      },
      {
        id: 'freeVsPaid',
        eyebrow: 'Abgrenzung',
        heading: 'Kostenloser Schnellcheck oder bezahltes Audit?',
        body: 'Der kostenlose Schnellcheck ist eine erste Orientierung und kann automatisiert wichtige Signale prüfen. Das bezahlte Audit geht tiefer: Ich bewerte mehrere Bereiche im Zusammenhang, ordne Auffälligkeiten ein und formuliere konkrete Prioritäten für Optimierung, Relaunch oder Local SEO.',
        points: [
          'Schnellcheck: erste Orientierung, begrenzte Tiefe und guter Einstieg über den Website-Tester',
          'Audit: manuelle Einordnung, priorisierte Handlungsempfehlungen und klarere nächste Schritte',
          'beide Ansätze ersetzen keine Rechtsberatung und keine langfristige SEO-Strategie'
        ]
      },
      {
        id: 'targetGroups',
        eyebrow: 'Zielgruppen',
        heading: 'Für wen ein Website-Audit passt',
        body: 'Das Audit passt zu kleinen Unternehmen, Selbstständigen und lokalen Anbietern mit bestehender Website. Besonders sinnvoll ist es, wenn die Website veraltet wirkt, wenig Anfragen bringt, langsam lädt, mobil schwach ist oder unklar bleibt, ob Optimierung oder Relaunch der bessere nächste Schritt ist.',
        points: [
          'bestehende Websites mit schwacher Anfrageleistung, unklarer Struktur oder veralteter Technik',
          'Unternehmen vor Relaunch, Local-SEO-Ausbau oder Website-Optimierung',
          'nicht ausgelegt als Enterprise-Gutachten, Shop-Tiefenanalyse oder technischer Sicherheitstest'
        ]
      },
      {
        id: 'auditAreas',
        eyebrow: 'Überblick',
        heading: 'Analysebereiche im Audit',
        body: 'Je nach Umfang werden SEO, Technik, Ladezeit, mobile Darstellung, UX, Trust, Conversion, Local SEO, Inhalte, Struktur und Kontaktführung geprüft. Wichtig ist nicht nur, ob einzelne Punkte auffallen, sondern welche Maßnahmen für dein Projekt wirklich Priorität haben.',
        points: [
          'SEO, Indexierbarkeit, Struktur, Inhalte, interne Links und strukturierte Daten einordnen',
          'Technik, Ladezeit, mobile Nutzbarkeit, Formularwege und externe Skripte prüfen',
          'Trust, Angebot, Kontaktführung und lokale Sichtbarkeit aus Kundensicht bewerten'
        ]
      },
      {
        id: 'seo',
        eyebrow: 'SEO',
        heading: 'SEO-Analyse ohne Ranking-Versprechen',
        body: 'Die SEO-Analyse betrachtet Title, Meta Description, H1/H2-Struktur, Indexierbarkeit, Canonicals, interne Verlinkung, URL-Struktur, Inhalte, Keyword-Ausrichtung, Duplicate-Content-Risiken, strukturierte Daten sowie Sitemap- und robots-Signale im passenden Umfang. Bestimmte Positionen bei Google werden nicht zugesagt.',
        points: [
          'Onpage-Signale und Seitenstruktur mit der Suchintention abgleichen',
          'fehlende oder widersprüchliche Meta-Daten, Überschriften und interne Links markieren',
          'keine Zusage für bestimmte Rankings, sondern nachvollziehbare SEO-Prioritäten'
        ]
      },
      {
        id: 'technology',
        eyebrow: 'Technik',
        heading: 'Technische Grundlage und Fehlerquellen prüfen',
        body: 'Technisch geht es um HTML-Struktur, Serverausgabe, mobile Grundlage, JavaScript-Abhängigkeiten, Formularfunktion, Fehlerseiten, kaputte Links, HTTPS-Grundlage, externe Skripte und mögliche CMS- oder Plugin-Altlasten. Das ist eine technische Sichtprüfung, kein Penetration-Test.',
        points: [
          'HTML-Struktur, Formularwege, 404-Seiten und Linkfehler einordnen',
          'externe Skripte, unnötige Abhängigkeiten und technische Bremsen sichtbar machen',
          'Sicherheit nur als sichtbare technische Grundlage betrachten, nicht als tiefgreifenden Sicherheitstest'
        ]
      },
      {
        id: 'performance',
        eyebrow: 'Performance',
        heading: 'Ladezeit und Performance realistisch einordnen',
        body: 'Bei der Performance-Prüfung geht es um große Bilder, Bildformate, Optimierungsmöglichkeiten, Lazy Loading, JavaScript- und CSS-Ballast, mobile Ladezeit, Layout Shift und Core Web Vitals als Orientierung. Ein bestimmter PageSpeed-Wert wird nicht versprochen.',
        points: [
          'Bildgrößen, Formate und Cloudinary-Optionen prüfen, soweit sichtbar oder relevant',
          'JavaScript, CSS, Third-Party-Skripte und mobile Ladezeit priorisieren',
          'Core Web Vitals als Hinweis nutzen, nicht als feste Ergebniszusage'
        ]
      },
      {
        id: 'ux',
        eyebrow: 'UX',
        heading: 'UX und mobile Nutzung aus Kundensicht prüfen',
        body: 'Eine Website muss schnell verständlich und mobil gut bedienbar sein. Deshalb prüfe ich Navigation, Lesbarkeit, Kontaktwege, CTA-Sichtbarkeit, Formularlänge, Abschnittsstruktur, Verständlichkeit und Nutzerführung besonders mit Blick auf kleine Bildschirme.',
        points: [
          'mobile Lesbarkeit, Tap-Ziele, Abschnittslängen und visuelle Reihenfolge bewerten',
          'Kontaktwege, Formulare und zentrale Entscheidungen auf Reibung prüfen',
          'unklare Seitenführung und zu viele konkurrierende Wege sichtbar machen'
        ]
      },
      {
        id: 'trust',
        eyebrow: 'Trust',
        heading: 'Trust und Angebotskommunikation prüfen',
        body: 'Besucher müssen schnell verstehen, was angeboten wird, für wen es passt und warum sie anfragen sollten. Im Audit werden Angebot, Referenzen, echte Bewertungen, Preisrahmen, Ansprechpartner, lokale Ausrichtung, FAQ und rechtlich sensible Aussagen auf Verständlichkeit und Glaubwürdigkeit geprüft.',
        points: [
          'Angebot, Zielgruppe und nächster Schritt müssen ohne langes Suchen erkennbar sein',
          'Referenzen und Bewertungen nur als echte, vorhandene Vertrauenselemente einordnen',
          'überzogene oder rechtlich sensible Aussagen als Risiko markieren'
        ]
      },
      {
        id: 'conversion',
        eyebrow: 'Conversion',
        heading: 'CTA-Führung und Anfragewege bewerten',
        body: 'Conversion bedeutet hier nicht Garantien, sondern eine bessere Entscheidungsführung. Ich prüfe, ob es eine klare Haupt-CTA gibt, ob zu viele CTA-Wege konkurrieren, ob Kontaktformular und Paketführung sichtbar sind und ob Vertrauen aufgebaut wird, bevor Besucher anfragen sollen.',
        points: [
          'Haupt-CTA, sekundäre CTAs, Formulare und Kontaktwege auf Klarheit prüfen',
          'Nutzerpfad, Danke-Seite und spätere Messbarkeit als optionale Themen einordnen',
          'keine Zusage für mehr Anfragen, Leads oder Umsatz'
        ]
      },
      {
        id: 'localSeo',
        eyebrow: 'Local SEO',
        heading: 'Lokale Sichtbarkeit als eigener Prüfbereich',
        body: 'Für lokale Unternehmen kann das Audit prüfen, ob lokale Keywords, Standort- und Kontaktinformationen, Google Business Profile, lokale Seitenstruktur, interne Links, strukturierte Daten und lokale Trust-Signale zusammenpassen. Auch hier geht es um Grundlagen, nicht um feste Google-Positionen.',
        points: [
          'lokale Suchintention, Leistungsseiten und Einzugsgebiet einordnen',
          'Google Business Profile und Website-Inhalte auf Konsistenz prüfen',
          'bei Bedarf auf eine separate Local-SEO-Optimierung verweisen'
        ]
      },
      {
        id: 'legalBoundary',
        eyebrow: 'Rechtliches',
        heading: 'Rechtstexte nur technisch und sichtbar einordnen',
        body: 'Rechtliche Inhalte werden nicht verbindlich geprüft. Ich kann technische oder sichtbare Auffälligkeiten benennen, zum Beispiel fehlende Rechtstext-Seiten, externe Dienste oder Cookie-Hinweise. Das ersetzt keine Rechtsberatung; bei Bedarf sollte eine spezialisierte Prüfung erfolgen.',
        points: [
          'Impressum, Datenschutzerklärung und Cookie-Hinweise nur als sichtbare/technische Punkte einordnen',
          'externe Dienste und Consent-Themen vorsichtig dokumentieren',
          'ersetzt keine Rechtsberatung und kein Datenschutzgutachten'
        ]
      },
      {
        id: 'deliverables',
        eyebrow: 'Ergebnis',
        heading: 'Was du nach dem Audit bekommst',
        body: 'Das Ergebnis ist keine lose Liste von Einzelproblemen. Du bekommst priorisierte Schwachstellen, konkrete Empfehlungen, schnelle Verbesserungsmöglichkeiten und eine Einschätzung, ob Optimierung, Relaunch, Local SEO oder Wartung als nächster Schritt sinnvoll ist.',
        points: [
          'priorisierte Handlungsempfehlungen statt ungewichteter Fehlerliste',
          'SEO-, Technik-, UX-, Conversion- und Local-SEO-Hinweise im vereinbarten Umfang',
          'je nach Paket schriftliche Zusammenfassung, Checkliste, Maßnahmenplan oder Gespräch'
        ]
      },
      {
        id: 'relaunchConnection',
        eyebrow: 'Einordnung',
        heading: 'Audit als Vorbereitung für Relaunch oder Optimierung',
        body: 'Ein Audit hilft besonders dann, wenn du unsicher bist, ob deine Website repariert, optimiert oder neu aufgebaut werden sollte. Es kann Relaunch-Risiken sichtbar machen, Paketwahl erleichtern und zeigen, ob Local SEO oder laufende Wartung eine Rolle spielen.',
        points: [
          'Optimierung reicht, wenn Struktur und Technik grundsätzlich tragfähig sind',
          'Relaunch wird plausibler, wenn Design, Inhalte, Technik und Anfrageführung gleichzeitig bremsen',
          'Audit-Ergebnis kann als Grundlage für Angebot, Paketwahl oder Maßnahmenliste dienen'
        ]
      },
      {
        id: 'pricing',
        eyebrow: 'Preisrahmen',
        heading: 'Was ein Website-Audit kosten kann',
        body: `Der Umfang hängt von Website-Größe, Analysebereichen, gewünschter Auswertung und Besprechung ab. ${PACKAGE_GLOBAL_NOTES.vatNote}`,
        points: [
          addOnPricePoint('website-audit', 'Website-Audit', 'ab 199–699 €', 'als Orientierung für eine strukturierte Prüfung mit Empfehlungen.'),
          'Kurz-Audit ab 199 €: kompakte Auswertung mit wichtigsten Problemen und Empfehlungen.',
          'Standard-Audit ab 399 €: SEO, Technik, UX, Conversion, Local SEO und priorisierte Handlungsempfehlungen.',
          'Relaunch-Audit ab 699 €: umfangreichere Prüfung als Relaunch-Vorbereitung mit Struktur, Risiken und Prioritäten.'
        ]
      },
      {
        id: 'process',
        eyebrow: 'Ablauf',
        heading: 'So läuft ein Website-Audit ab',
        body: 'Der Ablauf startet mit deiner Anfrage und der Website-URL. Danach klären wir Ziel, Umfang und Analysebereiche. Anschließend folgt die Auswertung mit Empfehlungen und optionalem Gespräch. Bitte sende keine Passwörter oder vertraulichen Zugangsdaten über das Formular.',
        points: [
          'Anfrage stellen, Website-URL senden und Ziel des Audits klären',
          'Umfang festlegen, Website analysieren und Empfehlungen priorisieren',
          'nächsten Schritt als Optimierung, Relaunch, Local SEO oder Wartung einordnen'
        ]
      },
      {
        id: 'notIncluded',
        eyebrow: 'Grenzen',
        heading: 'Was nicht Teil des Audits ist',
        body: 'Das Audit ist eine Analyse- und Entscheidungsgrundlage. Umsetzung, laufende Betreuung und externe Kampagnen werden getrennt betrachtet, damit Aufwand und Verantwortung klar bleiben.',
        points: [
          'Rechtsberatung, Datenschutzgutachten, Penetration-Test, Backlinkaufbau, Google Ads oder Social Media',
          'Umsetzung aller Empfehlungen, Relaunch, Wartung, Tracking-Einrichtung, neue Texte oder Migration',
          'keine Zusage für Rankings, Anfragen, Leads, Umsatz oder bestimmte Performance-Werte'
        ]
      }
    ],
    cta: {
      label: 'Website-Audit anfragen',
      href: '/kontakt?projektart=audit',
      text: 'Schick mir die Website-URL und beschreibe kurz, was dich aktuell unsicher macht. Danach klären wir, ob ein Kurz-Audit, Standard-Audit oder Relaunch-Audit sinnvoll ist.'
    },
    secondaryCta: {
      label: 'Kostenlosen Schnellcheck starten',
      href: '/website-tester'
    },
    finalCta: {
      label: 'Website prüfen lassen',
      href: '/kontakt?projektart=audit',
      text: 'Wenn du wissen möchtest, ob Optimierung, Relaunch oder Local SEO der richtige nächste Schritt ist, liefert ein Audit eine klare Entscheidungsgrundlage.',
      secondaryLabel: 'Relaunch besprechen',
      secondaryHref: '/leistungen/website-relaunch'
    },
    faq: [
      {
        question: 'Was ist ein Website-Audit?',
        answer: 'Ein Website-Audit ist eine strukturierte Analyse einer bestehenden Website. Es bewertet SEO, Technik, Ladezeit, UX, Trust, Conversion, Local SEO und Anfragewege im vereinbarten Umfang.'
      },
      {
        question: 'Was ist der Unterschied zum kostenlosen Website-Check?',
        answer: 'Der kostenlose Website-Check liefert eine erste Orientierung. Das bezahlte Audit ist eine vertiefte manuelle Einordnung mit priorisierten Empfehlungen und klareren nächsten Schritten.'
      },
      {
        question: 'Für wen ist ein Website-Audit sinnvoll?',
        answer: 'Sinnvoll ist es für Unternehmen mit bestehender Website, wenig Anfragen, schwacher mobiler Nutzung, unklarer Struktur, langsamer Ladezeit oder bevor ein Relaunch entschieden wird.'
      },
      {
        question: 'Was wird geprüft?',
        answer: 'Je nach Umfang werden SEO, Technik, Ladezeit, mobile Darstellung, UX, Trust, Conversion, Local SEO, Inhalte, Struktur und Kontaktführung geprüft.'
      },
      {
        question: 'Wird SEO geprüft?',
        answer: 'Ja. Title, Meta Description, Überschriften, Indexierbarkeit, Canonicals, interne Links, URL-Struktur, Inhalte und strukturierte Daten können geprüft werden. Suchpositionen werden nicht zugesagt.'
      },
      {
        question: 'Wird die Technik geprüft?',
        answer: 'Ja. HTML-Struktur, Serverausgabe, JavaScript-Abhängigkeiten, Formularfunktion, Fehlerseiten, kaputte Links, HTTPS-Grundlage und externe Skripte können eingeordnet werden.'
      },
      {
        question: 'Wird die Ladezeit geprüft?',
        answer: 'Ja. Bilder, Formate, JavaScript, CSS, mobile Ladezeit, Layout Shift und Core-Web-Vitals-Signale können als Orientierung betrachtet werden. Ein bestimmter Score wird nicht versprochen.'
      },
      {
        question: 'Wird UX und Conversion geprüft?',
        answer: 'Ja. Navigation, Lesbarkeit, CTA-Führung, Kontaktwege, Formularlänge, Abschnittsstruktur, Trust und mobile Nutzung werden auf Klarheit und Reibung geprüft.'
      },
      {
        question: 'Wird Local SEO geprüft?',
        answer: 'Ja, wenn lokale Sichtbarkeit relevant ist. Dann werden lokale Begriffe, Seitenstruktur, Standortinfos, Google Business Profile und lokale Trust-Signale betrachtet.'
      },
      {
        question: 'Ist das Audit eine Rechtsberatung?',
        answer: 'Nein. Ich kann technische oder sichtbare Auffälligkeiten zu Rechtstext-Seiten, externen Diensten und Cookie-Hinweisen benennen. Das ersetzt keine Rechtsberatung.'
      },
      {
        question: 'Gibt es eine Garantie für bessere Rankings?',
        answer: 'Nein. Das Audit zeigt Schwachstellen und Prioritäten. Bestimmte Google-Positionen oder Sichtbarkeitsentwicklungen können nicht zugesagt werden.'
      },
      {
        question: 'Was kostet ein Website-Audit?',
        answer: 'Als Orientierung liegt ein Website-Audit bei 199–699 €. Kurz-Audits starten ab 199 €, Standard-Audits ab 399 € und umfangreichere Relaunch-Audits ab 699 €. Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.'
      },
      {
        question: 'Wie lange dauert ein Audit?',
        answer: 'Das hängt vom Umfang und von der Website-Größe ab. Kleine Kurz-Audits sind schneller einzuordnen, vertiefte Relaunch-Audits brauchen mehr Analyse- und Auswertungszeit.'
      },
      {
        question: 'Bekomme ich konkrete Empfehlungen?',
        answer: 'Ja. Ziel sind priorisierte Handlungsempfehlungen, damit klarer wird, welche Punkte zuerst verbessert werden sollten.'
      },
      {
        question: 'Kann das Audit vor einem Relaunch helfen?',
        answer: 'Ja. Es kann zeigen, welche Inhalte, URLs, Technikthemen und Nutzerführungsprobleme vor einem Relaunch beachtet werden sollten.'
      },
      {
        question: 'Kannst du die Empfehlungen auch umsetzen?',
        answer: 'Ja, viele Empfehlungen können später als Optimierung, Relaunch, Local SEO oder Wartung separat angeboten werden. Die Umsetzung ist nicht automatisch Teil des Audits.'
      },
      {
        question: 'Muss ich Zugangsdaten schicken?',
        answer: 'Nein. Für die erste Anfrage solltest du keine Passwörter oder vertraulichen Zugangsdaten senden. Falls später Zugriff nötig wird, wird das separat und bewusst geklärt.'
      },
      {
        question: 'Ist ein Audit besser als direkt ein Relaunch?',
        answer: 'Wenn unklar ist, ob ein Relaunch nötig ist, kann ein Audit helfen. Es zeigt, ob gezielte Optimierung reicht oder ob mehrere Grundprobleme für einen Relaunch sprechen.'
      },
      {
        question: 'Kann ich nur einen bestimmten Bereich prüfen lassen?',
        answer: 'Ja. Ein Audit kann auf SEO, Technik, Ladezeit, UX, Local SEO oder Relaunch-Vorbereitung fokussiert werden, wenn nur ein bestimmter Bereich relevant ist.'
      },
      {
        question: 'Wie frage ich ein Audit an?',
        answer: 'Nutze die Kontaktseite, sende die Website-URL und beschreibe kurz dein Ziel. Danach klären wir Umfang, Analysebereiche und passenden Preisrahmen.'
      }
    ],
    internalLinks: [
      { label: 'Kontakt', href: '/kontakt?projektart=audit', text: 'Website-Audit mit URL und Ziel anfragen' },
      { label: 'Kostenloser Website-Tester', href: '/website-tester', text: 'Erste Orientierung vor dem bezahlten Audit starten' },
      { label: 'Website-Relaunch Berlin', href: '/leistungen/website-relaunch', text: 'Audit-Ergebnisse für Relaunch-Entscheidungen nutzen' },
      { label: 'Local SEO Berlin', href: '/leistungen/local-seo', text: 'Lokale Sichtbarkeit als Folgethema einordnen' },
      { label: 'Webdesign Berlin', href: '/webdesign-berlin', text: 'Komplette Website-Umsetzung nach der Analyse prüfen' },
      { label: 'Pakete', href: '/pakete', text: 'Start, Business, Wachstum und Individuell vergleichen' },
      { label: 'Zusatzleistungen', href: '/leistungen/zusatzleistungen-webdesign', text: 'Audit, Tracking, Local SEO und weitere Add-ons einordnen' },
      { label: 'Laufende Kosten', href: '/leistungen/laufende-kosten-website', text: 'Betriebskosten und externe Tools nach dem Audit einplanen' }
    ],
    todos: [
      'Nach Phase-Finish prüfen, ob Startseite, Website-Tester, Footer und Zusatzleistungen prominent auf /leistungen/website-audit verlinken sollen.',
      'Falls ein eigenständiges Audit-Angebotsformat entsteht, Preisstaffeln in data/addOns.js weiter zentralisieren.'
    ]
  },
  {
    slug: 'landingpage-erstellen-lassen',
    path: '/leistungen/landingpage-erstellen-lassen',
    primaryKeyword: 'landingpage erstellen lassen',
    parentBreadcrumb: { label: 'Leistungen', href: '/leistungen' },
    title: 'Landingpage erstellen lassen | Individuell & klar',
    description: 'Individuelle Landingpage erstellen lassen: klare Struktur, überzeugende Inhalte, CTA-Führung und technische Umsetzung mit Node.js/EJS.',
    h1: 'Landingpage erstellen lassen',
    intro: 'Du möchtest eine Landingpage erstellen lassen, die ein konkretes Angebot verständlich erklärt und Besucher zu einer klaren Handlung führt. Ich entwickle individuelle Zielseiten für kleine Unternehmen, Dienstleister und Kampagnen in Berlin und Brandenburg mit sauberer Struktur, serverseitig gerendertem HTML und realistischen Grenzen statt Erfolgsversprechen.',
    service: {
      name: 'Landingpage erstellen lassen',
      serviceType: 'Individuelle Landingpage-Entwicklung',
      areaServed: ['Berlin', 'Brandenburg']
    },
    sections: [
      {
        id: 'intro',
        eyebrow: 'Einordnung',
        heading: 'Was eine Landingpage leisten soll',
        body: 'Eine Landingpage ist eine fokussierte Seite für ein bestimmtes Ziel: Anfrage, Buchung, Download, Beratungsgespräch oder die Erklärung eines einzelnen Angebots. Sie reduziert Ablenkung, bündelt die wichtigsten Argumente und führt Besucher über klare Abschnitte zur nächsten sinnvollen Handlung.',
        points: [
          'ein Angebot, eine Hauptbotschaft und eine klar erkennbare Zielhandlung',
          'weniger Ablenkung als eine normale Website-Seite mit breiter Navigation',
          'eigenständig nutzbar oder als gezielte Ergänzung zu einer bestehenden Website'
        ]
      },
      {
        id: 'useCases',
        eyebrow: 'Einsatzfälle',
        heading: 'Wann eine Landingpage sinnvoll ist',
        body: 'Eine Landingpage passt, wenn ein Angebot, eine Aktion oder eine einzelne Dienstleistung deutlich im Vordergrund stehen soll. Sie kann Kampagnen unterstützen, lokale Anfragen bündeln oder eine bestehende Website um eine stärkere Angebotsseite ergänzen.',
        points: [
          'neues Angebot, lokale Aktion, Beratung, Event, Anfragekampagne oder einzelne Dienstleistung erklären',
          'Traffic aus Anzeigen, Newsletter, Social Media oder bestehenden Seiten gezielter führen',
          'nicht ideal, wenn viele gleichwertige Leistungen oder eine komplette Unternehmenswebsite fehlen'
        ]
      },
      {
        id: 'landingpageVsWebsite',
        eyebrow: 'Abgrenzung',
        heading: 'Landingpage oder vollständige Website?',
        body: 'Eine Landingpage ersetzt nicht immer eine vollständige Website, kann sie aber gezielt ergänzen. Eine Website erklärt Unternehmen, Leistungen, Referenzen, Kontakt und langfristige SEO-Struktur. Eine Landingpage konzentriert sich auf ein Angebot, eine Zielgruppe und einen nächsten Schritt.',
        points: [
          'Landingpage: ein Fokus, ein Angebot, reduzierte Navigation und klare Anfrageführung',
          'Website: mehrere Leistungen, Unternehmensinformationen, Referenzen und langfristige Präsenz',
          'bei fehlendem Gesamtauftritt kann ein Website-Paket sinnvoller sein als eine einzelne Zielseite'
        ]
      },
      {
        id: 'targetGroups',
        eyebrow: 'Zielgruppen',
        heading: 'Für wen Landingpages besonders passen',
        body: 'Landingpages sind sinnvoll für Dienstleister, Coaches, Beratungen, Praxen, Handwerker, lokale Unternehmen und Selbstständige mit einem klaren Angebot. Auch kleine Unternehmen können damit neue Leistungen testen oder eine bestehende Website gezielt ausbauen.',
        points: [
          'Beratungsgespräche, Angebotsanfragen, lokale Leistungen oder konkrete Aktionen sichtbar machen',
          'neue Zielgruppe, neues Produkt oder neue Dienstleistung mit schlankem Umfang testen',
          'nicht gedacht für große Shops, komplexe Funnel-Systeme oder Marketing-Automation als Standard'
        ]
      },
      {
        id: 'structure',
        eyebrow: 'Aufbau',
        heading: 'Typische Bestandteile einer guten Landingpage',
        body: 'Die Struktur hängt vom Angebot ab. Häufig braucht eine Landingpage aber eine klare Headline, kurze Nutzenkommunikation, Zielgruppenbezug, Angebotsbeschreibung, Vorteile, Ablauf, Vertrauenselemente, FAQ und wiederkehrende Anfragepunkte.',
        points: [
          'Headline, Nutzen, Angebot, Einwände, Ablauf, FAQ und Kontaktmöglichkeit sinnvoll ordnen',
          'visuelle Hierarchie, mobile Lesbarkeit und schnelle Orientierung priorisieren',
          'nicht jede Landingpage braucht dieselben Abschnitte oder denselben Umfang'
        ]
      },
      {
        id: 'copyStructure',
        eyebrow: 'Texte',
        heading: 'Textstruktur ohne Keyword-Überladung',
        body: 'Landingpage-Texte müssen schnell verständlich machen, für wen das Angebot passt, was enthalten ist und welcher nächste Schritt sinnvoll ist. Gelieferte Texte können strukturiert werden; umfangreiches Copywriting wird je nach Bedarf separat kalkuliert.',
        points: [
          'klare Botschaft, kurze Abschnitte und konkrete Vorteile statt austauschbarer Werbesprache',
          'Einwände, Voraussetzungen und Abgrenzungen sichtbar erklären',
          'Fachinput vom Kunden bleibt wichtig; Rechtstexte oder Rechtsprüfung sind keine Textleistung'
        ]
      },
      {
        id: 'conversionElements',
        eyebrow: 'Anfrageführung',
        heading: 'Elemente, die Entscheidungen erleichtern',
        body: 'Die Landingpage wird auf eine klare Zielhandlung ausgerichtet. Dazu gehören Anfragebuttons, ein passendes Formular, echte Vertrauenselemente, verständliche Vorteile, FAQ und eine reduzierte Ablenkung. Ob und wie gut sie konvertiert, hängt von Angebot, Zielgruppe, Traffic und weiteren Faktoren ab.',
        points: [
          'Kontaktformular, Anfragebutton oder Terminlink passend zum Ziel einsetzen',
          'echte Referenzen, echte Bewertungen oder reale Projektbeispiele nur verwenden, wenn sie vorhanden sind',
          'keine Garantie für Leads, Verkäufe oder Umsatz, sondern eine sauberere Entscheidungsgrundlage'
        ]
      },
      {
        id: 'formsAndCtas',
        eyebrow: 'Formulare',
        heading: 'Formulare und Kontaktwege bewusst kurz halten',
        body: 'Ein Formular kann direkt auf der Landingpage sitzen oder über einen klaren Kontaktweg angebunden werden. Die Felder sollten zum Ziel passen, nicht unnötig viele Daten abfragen und keine Passwörter oder vertraulichen Zugangsdaten verlangen.',
        points: [
          'Anfrageformular, E-Mail-Link, Telefonklick oder Terminlink passend zum Projektziel auswählen',
          'Datenschutz-Hinweis und Verlinkung zur Datenschutzerklärung sauber einbinden',
          'Buchungssystem, Zahlungsfunktion oder externe Tools sind nicht automatisch enthalten'
        ]
      },
      {
        id: 'techImplementation',
        eyebrow: 'Technik',
        heading: 'Individuell umgesetzt mit Node.js und EJS',
        body: 'Die Landingpage wird individuell mit Node.js, EJS, CSS und JavaScript umgesetzt. Hauptinhalte werden serverseitig als HTML gerendert. Das schafft eine saubere Grundlage für Struktur, Ladezeit, mobile Darstellung und Suchmaschinenlesbarkeit, ohne Baukasten-Template oder Standard-Theme-Zwang.',
        points: [
          'serverseitig gerendertes HTML mit klarer H1/H2-Struktur',
          'individuelles CSS, sparsames JavaScript und responsive Umsetzung',
          'Cloudinary-Bildoptimierung nutzen, soweit Bildmaterial und Projektumfang dazu passen'
        ]
      },
      {
        id: 'tracking',
        eyebrow: 'Messung',
        heading: 'Tracking und Auswertung nur optional',
        body: 'Tracking kann optional und datenschutzbewusst vorbereitet werden, wenn du Klicks, Formularstarts, Formularabsendungen, Scrolltiefe oder Kampagnenparameter auswerten möchtest. Toolauswahl, Consent und Umfang müssen vorher abgestimmt werden.',
        points: [
          'keine personenbezogenen Freitexte als Trackingdaten verwenden',
          'Google Analytics oder andere Dienste nicht pauschal einbauen',
          'Tracking zeigt Signale, ersetzt aber keine Garantie für Kampagnen- oder Anfrageergebnisse'
        ]
      },
      {
        id: 'seo',
        eyebrow: 'SEO',
        heading: 'SEO-orientiert oder kampagnenorientiert planen',
        body: 'Vor der Umsetzung sollte klar sein, ob die Landingpage für Suchmaschinen, Kampagnen oder beides gedacht ist. Eine SEO-orientierte Landingpage braucht relevante Inhalte, Meta-Daten, Überschriften, interne Verlinkung und eine klare Suchintention. Eine reine Kampagnenseite muss nicht zwingend indexiert werden.',
        points: [
          'Meta Title, Meta Description, Canonical, H-Struktur und interne Links im vereinbarten Umfang setzen',
          'keine Keyword-Stuffing-Seite und keine Garantie für bestimmte Suchpositionen',
          'bei lokalen Suchzielen kann Local SEO separat mitgedacht werden'
        ]
      },
      {
        id: 'pricing',
        eyebrow: 'Preisrahmen',
        heading: 'Was eine Landingpage kosten kann',
        body: `Der Preis hängt von Designanspruch, Textumfang, Formular, Animationen, Tracking, SEO-Ausrichtung, Bildmaterial, Integrationen, Mehrsprachigkeit und Sonderfunktionen ab. ${PACKAGE_GLOBAL_NOTES.vatNote}`,
        points: [
          addOnPricePoint('landingpage', 'Landingpage', 'ab 699–1.499 €', 'als Orientierung für eine eigenständige Zielseite mit klar abgegrenztem Umfang.'),
          addOnPricePoint('texterstellung-erweitert', 'Umfangreichere Texterstellung', 'ab 250–900 €', 'wenn Inhalte nicht nur strukturiert, sondern neu ausgearbeitet werden müssen.'),
          addOnPricePoint('tracking-einrichtung', 'Tracking-Einrichtung', 'ab 150–400 €', 'wenn Ereignisse und Consent-abhängige Messung vereinbart werden.'),
          'Drittanbieter-, Tool-, Bildlizenz-, Übersetzungs- oder Consent-Kosten werden separat eingeordnet.'
        ]
      },
      {
        id: 'packageConnection',
        eyebrow: 'Einordnung',
        heading: 'Zusatzleistung oder eigenes Projekt',
        body: 'Eine Landingpage kann eine Zusatzseite zu einer bestehenden Website sein, ein eigenständiges Mini-Projekt oder Teil eines Relaunches beziehungsweise Wachstum-Projekts. Mehrere Landingpages oder komplexere Kampagnenstrukturen werden als individueller Umfang geplant.',
        points: [
          'als Zusatzleistung, wenn eine bestehende Website sinnvoll erweitert wird',
          'als eigenes Projekt, wenn die Zielseite unabhängig funktionieren soll',
          'Ads, laufende Kampagnenbetreuung und Marketing-Automation sind nicht automatisch Teil der Umsetzung'
        ]
      },
      {
        id: 'notIncluded',
        eyebrow: 'Grenzen',
        heading: 'Was nicht automatisch enthalten ist',
        body: 'Damit Aufwand, Verantwortung und laufende Kosten klar bleiben, werden Zusatzthemen vorab getrennt. Das verhindert Missverständnisse bei Tools, Texten, Tracking, Rechtstexten und Kampagnenbetrieb.',
        points: [
          'Ads-Kampagnen, laufende Kampagnenbetreuung, A/B-Tests, Marketing-Automation, Newsletter-Systeme oder CRM-Anbindung',
          'professionelle Fotografie, Bildlizenzen, umfangreiche Texterstellung, Übersetzungen oder Content-Migration',
          'Buchungssysteme, Zahlungsanbieter, Rechtsberatung, Rechtstexte, Hosting, Wartung oder externe Toolkosten ohne Vereinbarung'
        ]
      },
      {
        id: 'process',
        eyebrow: 'Ablauf',
        heading: 'So läuft ein Landingpage-Projekt ab',
        body: 'Der Ablauf beginnt mit Anfrage, Zielklärung, Zielgruppe und Angebot. Danach werden Struktur, Anfrageführung, Inhalte, Bildmaterial und Preisrahmen abgestimmt. Anschließend folgen Design, Umsetzung, Feedback, technische Prüfung, Freigabe, Livegang und optional die datenschutzbewusste Messung.',
        points: [
          'Ziel, Zielgruppe, Angebot und gewünschte Handlung klären',
          'Struktur, Texte, Bilder, Formular, Trackingwunsch und Zusatzleistungen abgrenzen',
          'Umsetzung prüfen, Feedback einarbeiten, Freigabe einholen und danach live stellen'
        ]
      }
    ],
    cta: {
      label: 'Landingpage anfragen',
      href: '/kontakt?projektart=landingpage',
      text: 'Beschreibe kurz Angebot, Zielgruppe, gewünschte Zielhandlung und ob bereits Texte oder Bilder vorhanden sind. Danach klären wir Umfang, Preisrahmen und sinnvolle technische Umsetzung.'
    },
    secondaryCta: {
      label: 'Zusatzleistungen ansehen',
      href: '/leistungen/zusatzleistungen-webdesign'
    },
    finalCta: {
      label: 'Landingpage-Projekt besprechen',
      href: '/kontakt?projektart=landingpage',
      text: 'Wenn du ein einzelnes Angebot gezielter erklären möchtest, planen wir eine Landingpage mit klarer Struktur, realistischer Abgrenzung und optionaler Messung.',
      secondaryLabel: 'Pakete ansehen',
      secondaryHref: '/pakete'
    },
    faq: [
      {
        question: 'Was ist eine Landingpage?',
        answer: 'Eine Landingpage ist eine fokussierte Zielseite für ein bestimmtes Angebot, eine Kampagne oder eine konkrete Suchintention. Sie führt Besucher mit weniger Ablenkung zu einer klaren nächsten Handlung.'
      },
      {
        question: 'Wann lohnt sich eine Landingpage?',
        answer: 'Sie lohnt sich, wenn ein einzelnes Angebot, eine lokale Aktion, ein Beratungsgespräch oder eine Anfragekampagne gezielt erklärt werden soll. Wenn ein vollständiger Unternehmensauftritt fehlt, ist oft eine Website sinnvoller.'
      },
      {
        question: 'Was kostet eine Landingpage?',
        answer: 'Eine Landingpage liegt als Orientierung häufig bei 699–1.499 €. Der genaue Preis hängt von Design, Textumfang, Formularen, Bildern, Tracking, SEO-Ausrichtung und Sonderfunktionen ab. Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.'
      },
      {
        question: 'Ist eine Landingpage eine vollständige Website?',
        answer: 'Nein. Eine Landingpage konzentriert sich auf ein Ziel. Eine vollständige Website bildet mehrere Leistungen, Unternehmen, Referenzen, Kontakt, FAQ und langfristige Struktur umfassender ab.'
      },
      {
        question: 'Kann eine Landingpage SEO bringen?',
        answer: 'Eine Landingpage kann SEO-orientiert geplant werden, wenn Suchintention, Inhalte und interne Verlinkung passen. Bestimmte Suchpositionen werden nicht zugesagt.'
      },
      {
        question: 'Gibt es eine Garantie für Anfragen oder Verkäufe?',
        answer: 'Nein. Ich kann Struktur, Technik, Texte und Anfrageführung verbessern. Ergebnisse hängen aber von Angebot, Zielgruppe, Traffic, Wettbewerb und weiteren Faktoren ab.'
      },
      {
        question: 'Sind Texte enthalten?',
        answer: 'Gelieferte Texte können eingebunden, gekürzt und strukturiert werden. Umfangreiche Texterstellung oder verkaufsorientierte Ausarbeitung wird separat kalkuliert.'
      },
      {
        question: 'Kann Tracking eingebaut werden?',
        answer: 'Ja, wenn es gewünscht ist und Toolauswahl, Consent und Datenschutz-Hinweis geklärt sind. Freitexte oder personenbezogene Inhalte werden nicht als Trackingdaten verwendet.'
      },
      {
        question: 'Ist ein Kontaktformular enthalten?',
        answer: 'Ein einfaches Anfrageformular kann je nach Umfang eingeplant werden. Komplexe Formularlogik, Buchungssysteme, Zahlungen oder CRM-Anbindungen werden separat geprüft.'
      },
      {
        question: 'Kann eine Landingpage für Google Ads genutzt werden?',
        answer: 'Ja, sie kann für Ads-Traffic vorbereitet werden. Die Ads-Kampagne selbst, Anzeigensteuerung, Budgetverwaltung und Kampagnenerfolg sind nicht automatisch Teil der Leistung.'
      },
      {
        question: 'Sind Ads-Kampagnen enthalten?',
        answer: 'Nein. Die Landingpage kann eine Kampagne unterstützen, aber Google Ads, Social Ads oder laufende Kampagnenbetreuung werden nicht pauschal angeboten.'
      },
      {
        question: 'Kann ich mehrere Landingpages erstellen lassen?',
        answer: 'Ja. Mehrere Landingpages sollten aber strategisch geplant werden, damit Inhalte nicht doppelt wirken und jede Seite eine klare Suchintention oder Kampagnenrolle hat.'
      },
      {
        question: 'Wird die Landingpage mit Node.js/EJS umgesetzt?',
        answer: 'Ja. Die Umsetzung erfolgt individuell mit Node.js, EJS, CSS und JavaScript. Hauptinhalte werden serverseitig als HTML gerendert.'
      },
      {
        question: 'Kann die Landingpage später erweitert werden?',
        answer: 'Ja. Sie kann später um weitere Abschnitte, lokale Leistungsseiten, Tracking, Formulare oder eine vollständige Website-Struktur erweitert werden, wenn der Umfang passt.'
      },
      {
        question: 'Sind Rechtstexte enthalten?',
        answer: 'Impressum, Datenschutzerklärung und Cookie-Hinweise können technisch eingebunden werden, wenn sie geliefert werden. Die Erstellung oder rechtliche Prüfung dieser Texte ist keine Rechtsberatung.'
      },
      {
        question: 'Wie frage ich eine Landingpage an?',
        answer: 'Am besten beschreibst du kurz Angebot, Zielgruppe, gewünschte Handlung, vorhandene Inhalte und ob Tracking oder ein Formular benötigt wird. Danach lässt sich der Aufwand besser einschätzen.'
      }
    ],
    internalLinks: [
      { label: 'Kontakt', href: '/kontakt?projektart=landingpage', text: 'Landingpage-Aufwand einschätzen lassen' },
      { label: 'Zusatzleistungen', href: '/leistungen/zusatzleistungen-webdesign', text: 'Landingpages, Tracking, Texte und weitere Add-ons einordnen' },
      { label: 'Pakete', href: '/pakete', text: 'Website-Pakete mit Landingpage-Zusatzleistung vergleichen' },
      { label: 'Webdesign Berlin', href: '/webdesign-berlin', text: 'Komplette Website statt einzelner Zielseite prüfen' },
      { label: 'Website-Audit', href: '/leistungen/website-audit', text: 'Bestehende Website vor einer Landingpage prüfen' },
      { label: 'Website-Tester', href: '/website-tester', text: 'Bestehende Website vor einer Zielseite prüfen' },
      { label: 'Local SEO Berlin', href: '/leistungen/local-seo', text: 'Lokale Landingpages und Suchintentionen besser einordnen' },
      { label: 'Website-Relaunch Berlin', href: '/leistungen/website-relaunch', text: 'Landingpage mit einem größeren Relaunch verbinden' }
    ],
    todos: [
      'Nach Phase-Finish prüfen, ob Startseite, Zusatzleistungen und Paketdetailseiten prominent auf /leistungen/landingpage-erstellen-lassen verlinken sollen.'
    ]
  },
  {
    slug: 'webdesign-kleine-unternehmen-berlin',
    path: '/webdesign-kleine-unternehmen-berlin',
    primaryKeyword: 'webdesign kleine unternehmen berlin',
    parentBreadcrumb: { label: 'Leistungen', href: '/leistungen' },
    title: 'Webdesign für kleine Unternehmen in Berlin',
    description: 'Webdesign für kleine Unternehmen in Berlin: professionelle Websites mit klaren Leistungen, Kontaktwegen, lokaler SEO-Grundlage und fairem Projektumfang.',
    h1: 'Webdesign für kleine Unternehmen in Berlin',
    intro: 'Kleine Unternehmen brauchen keine überladene Agentur-Website, sondern einen klaren Auftritt, der Vertrauen schafft und Anfragen leichter macht. Komplett Webdesign entwickelt Websites für lokale Dienstleister, Gastronomie, Handwerk und inhabergeführte Betriebe in Berlin.',
    sections: [
      {
        eyebrow: 'Fokus',
        heading: 'Klar zeigen, warum Kunden dich wählen sollten',
        body: 'Viele kleine Unternehmen haben gute Leistungen, aber eine Website, die sie nicht deutlich genug erklärt. Die Seite wird deshalb um Angebot, Einwände, lokale Relevanz und einfache Kontaktaufnahme herum aufgebaut.',
        points: [
          'Leistungen und Nutzen schnell erfassbar machen',
          'Vertrauen durch echte Informationen und Referenzen stärken',
          'Kontaktwege sichtbar und wiederholbar platzieren'
        ]
      },
      {
        eyebrow: 'Struktur',
        heading: 'Kompakt starten und sinnvoll wachsen',
        body: 'Nicht jedes Unternehmen braucht sofort zwanzig Unterseiten. Sinnvoll ist eine Struktur, die zum aktuellen Angebot passt und später um Leistungen, Ratgeber oder lokale Seiten erweitert werden kann.',
        points: [
          'Onepager oder mehrseitige Firmenwebsite passend zum Umfang',
          'Interne Links für Besucher und Suchmaschinen planen',
          'Ausbaufähige Struktur statt kurzfristiger Insellösung'
        ]
      },
      {
        eyebrow: 'Betrieb',
        heading: 'Alltagstauglich für kleine Teams',
        body: 'Die Website soll im Tagesgeschäft helfen, nicht neue Arbeit erzeugen. Deshalb werden Inhalte, Formulare, Ladezeit und mobile Nutzung so geplant, dass Interessenten schnell finden, was sie brauchen.',
        points: [
          'Mobile Nutzung für lokale Suche priorisieren',
          'Kontaktformular und Telefonklicks sauber einsetzen',
          'Laufende Kosten transparent von Projektkosten trennen'
        ]
      }
    ],
    cta: {
      label: 'Webdesign anfragen',
      href: '/kontakt',
      text: 'Schick kurz Branche, Ziel und gewünschten Umfang. Danach klären wir, welche Website-Struktur für dein Unternehmen passt.'
    },
    secondaryCta: {
      label: 'Pakete vergleichen',
      href: '/pakete'
    },
    faq: [
      {
        question: 'Welche Website passt zu einem kleinen Unternehmen?',
        answer: 'Wenn du wenige Leistungen hast, reicht oft ein klarer Onepager. Bei mehreren Leistungen, Team, Referenzen oder SEO-Zielen ist eine mehrseitige Firmenwebsite meist sinnvoller.'
      },
      {
        question: 'Ist lokales SEO für kleine Unternehmen enthalten?',
        answer: 'Die SEO-Grundlage wird direkt mitgedacht: Seitenstruktur, lokale Begriffe, Metadaten, H1, interne Links und mobilfreundliche Darstellung.'
      },
      {
        question: 'Kann ich klein starten und später erweitern?',
        answer: 'Ja. Die Website kann bewusst so aufgebaut werden, dass später Leistungsseiten, Ratgeber, Referenzen oder weitere lokale Landingpages dazukommen.'
      },
      {
        question: 'Brauche ich eigene Texte und Bilder?',
        answer: 'Vorhandenes Material hilft, ist aber keine Voraussetzung. Texte können erstellt und vorhandene Bilder können sinnvoll ausgewählt oder durch passende Alternativen ersetzt werden.'
      }
    ],
    internalLinks: [
      { label: 'Website erstellen lassen', href: '/website-erstellen-lassen-berlin', text: 'Komplette Website-Erstellung in Berlin' },
      { label: 'Pakete', href: '/pakete', text: 'Start, Business, Wachstum und Individuell vergleichen' },
      { label: 'Website-Tester', href: '/website-tester', text: 'Bestehende Website kostenlos prüfen' },
      { label: 'Kontakt', href: '/kontakt', text: 'Projektumfang einschätzen lassen' }
    ]
  },
  {
    slug: 'ablauf',
    path: '/ablauf',
    primaryKeyword: 'website projekt ablauf berlin',
    parentBreadcrumb: { label: 'Leistungen', href: '/leistungen' },
    title: 'Website Projekt Ablauf Berlin | Komplett Webdesign',
    description: 'Website Projekt Ablauf in Berlin: vom Erstgespräch über Struktur, Texte, Design und Technik bis zum sauberen Launch für kleine Unternehmen.',
    h1: 'Website Projekt Ablauf in Berlin',
    intro: 'Ein gutes Website-Projekt in Berlin braucht eine klare Reihenfolge. Erst werden Zielgruppe, Angebot, lokaler Wettbewerb und sinnvolle Seitenstruktur geklärt. Danach entstehen Texte, Design, technische Umsetzung und Launch-Checks, damit die Website nicht nur online geht, sondern verständlich, schnell und anfragefreundlich startet.',
    visual: {
      eyebrow: 'Ablauf im Überblick',
      heading: 'Von der Anfrage bis zum sauberen Livegang',
      text: 'Das Ablauf-Visual ordnet die wichtigsten Projektstationen: Anfrage, Struktur und Angebot, Design und Umsetzung, Feedback und Freigabe sowie Launch-Vorbereitung. Die einzelnen Schritte darunter erklären, was in jeder Phase konkret geklärt wird.',
      image: {
        src: '/images/webdesign-ablauf.webp',
        alt: 'Ablauf einer Website-Erstellung mit Anfrage, Struktur, Design, Feedback und Launch-Vorbereitung'
      }
    },
    sections: [
      {
        eyebrow: 'Start',
        heading: '1. Erstgespräch und lokale Zielklärung',
        body: 'Am Anfang stehen Angebot, Zielgruppe, Berliner Wettbewerb, Budget, vorhandene Inhalte und gewünschte Funktionen. Daraus entsteht ein realistischer Umfang statt einer losen Wunschliste.',
        points: [
          'Ziel der Website und wichtigste Zielgruppen in Berlin klären',
          'Bestehende Website, lokale Wettbewerber und Inhalte einordnen',
          'Paket, Seitenumfang und nächste Schritte abstimmen'
        ]
      },
      {
        eyebrow: 'Konzept',
        heading: '2. Struktur, Inhalte und lokale Nutzerführung',
        body: 'Die Seitenstruktur legt fest, welche Inhalte Besucher brauchen und welche Berliner Suchintentionen abgedeckt werden. Erst danach werden Texte und Anfragebereiche so geschrieben, dass sie zur Entscheidungssituation passen.',
        points: [
          'Sitemap und Navigationslogik festlegen',
          'Leistungstexte, Einwände und lokale Kontaktpunkte planen',
          'Interne Links für wichtige Seiten vorbereiten'
        ]
      },
      {
        eyebrow: 'Produktion',
        heading: '3. Design, Umsetzung und Feedback',
        body: 'Design und technische Umsetzung werden auf mobile Nutzung, Lesbarkeit, Performance und Anfrageziele ausgerichtet. Das ist besonders wichtig, weil viele lokale Suchanfragen direkt vom Smartphone kommen.',
        points: [
          'Layout und visuelle Richtung ausarbeiten',
          'Responsive Umsetzung und technische SEO-Grundlage bauen',
          'Feedbackrunden strukturiert einarbeiten'
        ]
      },
      {
        eyebrow: 'Livegang',
        heading: '4. Prüfung, Launch und Berliner Sichtbarkeit',
        body: 'Vor dem Launch werden Formulare, gelieferte Pflichtseiten, Metadaten, Indexierung, Weiterleitungen und zentrale Kontaktwege technisch geprüft. Danach können Inhalte, lokale Sichtbarkeit und Anfragewege gezielt weiterentwickelt werden.',
        points: [
          'Formulare, Links, gelieferte Pflichtseiten und mobile Darstellung testen',
          'Sitemap, Canonical und technische Signale prüfen',
          'Optimierungen nach dem Launch priorisieren'
        ]
      }
    ],
    cta: {
      label: 'Ablauf besprechen',
      href: '/kontakt',
      text: 'Wenn du ein Website-Projekt in Berlin planst, klären wir zuerst Ziele, Umfang und sinnvolle Reihenfolge.'
    },
    secondaryCta: {
      label: 'Website-Kosten lesen',
      href: '/ratgeber/website-kosten-berlin'
    },
    faq: [
      {
        question: 'Wie startet ein Website-Projekt in Berlin?',
        answer: 'Das Projekt startet mit einem Erstgespräch zu Ziel, Zielgruppe, lokalen Wettbewerbern, Leistungen, vorhandenen Inhalten, Budget und gewünschten Funktionen.'
      },
      {
        question: 'Wann entstehen die Website-Texte?',
        answer: 'Texte entstehen nach der Strukturplanung. So passen Inhalte, Reihenfolge, interne Links und Anfragebereiche zur geplanten Nutzerführung.'
      },
      {
        question: 'Wie viele Feedbackrunden sind sinnvoll?',
        answer: 'Sinnvoll sind gebündelte Feedbackrunden nach Struktur, Design und Umsetzung. Das hält Entscheidungen klar und vermeidet widersprüchliche Einzelkorrekturen.'
      },
      {
        question: 'Was wird vor dem Launch geprüft?',
        answer: 'Geprüft werden unter anderem mobile Darstellung, Formulare, Links, gelieferte Pflichtseiten, Metadaten, Canonicals, Sitemap, Ladezeit und wichtige Kontaktwege für Berliner Besucher.'
      }
    ],
    internalLinks: [
      { label: 'Website erstellen lassen Berlin', href: '/website-erstellen-lassen-berlin', text: 'Vom Ablauf direkt zur Projektanfrage' },
      { label: 'Website Relaunch Berlin', href: '/leistungen/website-relaunch', text: 'Bestehende Website neu strukturieren' },
      { label: 'Webdesign kleine Unternehmen', href: '/webdesign-kleine-unternehmen-berlin', text: 'Webdesign-Prozess für kleine Betriebe' },
      { label: 'Website-Kosten', href: '/ratgeber/website-kosten-berlin', text: 'Budget und laufende Kosten einordnen' },
      { label: 'Kontakt', href: '/kontakt', text: 'Projektstart vorbereiten' }
    ]
  }
]);

export function getSeoLandingPage(slug) {
  if (!slug) return null;
  return SEO_LANDING_PAGES.find((page) => page.slug === slug) || null;
}
