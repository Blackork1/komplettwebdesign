import { ctas } from './ctas.js';
import { maintenancePlans } from './maintenancePlans.js';
import { PACKAGE_GLOBAL_NOTES } from './packages.js';

const planComparisonRows = Object.freeze([
  {
    id: 'price',
    label: 'Preis',
    values: {
      'wartung-basis': 'ab 39 €/Monat',
      'wartung-standard': 'ab 79 €/Monat',
      'wartung-plus': 'ab 129 €/Monat'
    }
  },
  {
    id: 'bestFor',
    label: 'Geeignet für',
    values: {
      'wartung-basis': 'kleine Websites mit wenig Änderungen',
      'wartung-standard': 'kleine Unternehmenswebsites mit regelmäßiger Betreuung',
      'wartung-plus': 'umfangreichere Websites mit höherem Änderungsbedarf'
    }
  },
  {
    id: 'technicalReview',
    label: 'Technische Sichtprüfung',
    values: {
      'wartung-basis': 'grundlegend',
      'wartung-standard': 'regelmäßig im vereinbarten Umfang',
      'wartung-plus': 'erweitert im vereinbarten Umfang'
    }
  },
  {
    id: 'backups',
    label: 'Backups',
    values: {
      'wartung-basis': 'abhängig vom Hosting-Setup',
      'wartung-standard': 'regelmäßig, abhängig vom Hosting-Setup',
      'wartung-plus': 'erweiterte Kontrolle, abhängig vom Hosting-Setup'
    }
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    values: {
      'wartung-basis': 'einfache Erreichbarkeitsprüfung',
      'wartung-standard': 'Erreichbarkeit und Auffälligkeiten',
      'wartung-plus': 'regelmäßige technische Prüfung und Erreichbarkeitskontrolle'
    }
  },
  {
    id: 'security',
    label: 'Sicherheitschecks',
    values: {
      'wartung-basis': 'grundlegende Checks',
      'wartung-standard': 'regelmäßig im vereinbarten Umfang',
      'wartung-plus': 'erweitert im vereinbarten Umfang'
    }
  },
  {
    id: 'contentChanges',
    label: 'Kleine Inhaltsänderungen',
    values: {
      'wartung-basis': 'keine oder sehr begrenzt nach Absprache',
      'wartung-standard': 'im monatlich vereinbarten Rahmen',
      'wartung-plus': 'mehr Zeit nach vereinbartem Kontingent'
    }
  },
  {
    id: 'technicalSupport',
    label: 'Technischer Support',
    values: {
      'wartung-basis': 'kurze Rückfragen im vereinbarten Umfang',
      'wartung-standard': 'im vereinbarten Umfang',
      'wartung-plus': 'bevorzugt im vereinbarten Umfang'
    }
  },
  {
    id: 'responseTime',
    label: 'Reaktionszeit',
    values: {
      'wartung-basis': 'nach Verfügbarkeit',
      'wartung-standard': 'priorisiert gegenüber Einzelanfragen im Rahmen der Möglichkeiten',
      'wartung-plus': 'bevorzugte Bearbeitung im Rahmen der vereinbarten Kapazität'
    }
  },
  {
    id: 'emergency',
    label: 'Notfallhilfe',
    values: {
      'wartung-basis': 'nach Verfügbarkeit',
      'wartung-standard': 'besser einordenbar, ohne feste Bearbeitungszusage',
      'wartung-plus': 'bevorzugte Einordnung im vereinbarten Rahmen'
    }
  },
  {
    id: 'thirdParty',
    label: 'Drittanbieter-Support',
    values: {
      'wartung-basis': 'nicht automatisch enthalten',
      'wartung-standard': 'Prüfung im Rahmen möglich',
      'wartung-plus': 'Prüfung im Rahmen möglich, Zusatzaufwand separat'
    }
  },
  {
    id: 'seo',
    label: 'SEO-Betreuung',
    values: {
      'wartung-basis': 'nicht enthalten',
      'wartung-standard': 'nicht enthalten',
      'wartung-plus': 'nicht enthalten, separat planbar'
    }
  },
  {
    id: 'cancellation',
    label: 'Laufzeit/Kündigung',
    values: {
      'wartung-basis': 'wird im Angebot festgelegt',
      'wartung-standard': 'wird im Angebot festgelegt',
      'wartung-plus': 'wird im Angebot festgelegt'
    }
  }
]);

const detailBlocks = Object.freeze([
  {
    id: 'backups',
    icon: 'fa-box-archive',
    title: 'Backups',
    lead:
      'Backups helfen, Inhalte und technische Stände im Problemfall wiederherzustellen. Umfang und Rhythmus hängen vom Hosting- und Wartungssetup ab.',
    points: [
      'Backups sind vor allem sinnvoll, wenn Hosting und Website technisch zusammen betreut werden.',
      'Wiederherstellung kann zusätzlichen Aufwand verursachen, wenn Daten, Tools oder externe Dienste betroffen sind.',
      'Daten aus Drittanbieter-Systemen sind nicht automatisch Teil des Website-Backups.'
    ]
  },
  {
    id: 'monitoring',
    icon: 'fa-signal',
    title: 'Monitoring',
    lead:
      'Monitoring prüft technische Erreichbarkeit oder auffällige Zustände. Es hilft, Probleme schneller sichtbar zu machen, ersetzt aber keine ständige manuelle Kontrolle.',
    points: [
      'Der Umfang richtet sich nach Wartungspaket und technischer Vereinbarung.',
      'Nicht jedes Problem kann automatisch erkannt werden.',
      'Reaktionswege werden passend zum Wartungspaket abgestimmt.'
    ]
  },
  {
    id: 'securityChecks',
    icon: 'fa-shield-halved',
    title: 'Sicherheitschecks',
    lead:
      'Sicherheitschecks reduzieren Risiken, können aber keine vollständige Sicherheit zusagen.',
    points: [
      'technische Sichtprüfung auf auffällige Probleme',
      'Prüfung sicherer Einbindungen im vereinbarten Umfang',
      'keine Penetration-Tests und keine Rechtsberatung'
    ]
  },
  {
    id: 'contentChanges',
    icon: 'fa-pen-to-square',
    title: 'Kleine Inhaltsänderungen',
    lead:
      'Kleine Inhaltsänderungen sind Änderungen wie Öffnungszeiten, Hinweise, Telefonnummern, einzelne Bilder oder kurze Abschnittsanpassungen.',
    points: [
      'nur im definierten Zeitrahmen des Wartungspakets',
      'keine neuen Seiten, neuen Layouts oder neuen Funktionen',
      'umfangreiche Textarbeiten oder SEO-Texte werden separat kalkuliert'
    ]
  },
  {
    id: 'technicalSupport',
    icon: 'fa-screwdriver-wrench',
    title: 'Technischer Support',
    lead:
      'Technischer Support erfolgt im vereinbarten Umfang und nach Verfügbarkeit beziehungsweise Priorität des Wartungspakets.',
    points: [
      'Rückfragen zur Website und kleinere technische Prüfungen',
      'Unterstützung bei kleinen Problemen',
      'keine umfassende Schulung oder vollständige Betreuung externer Systeme ohne Zusatzvereinbarung'
    ]
  },
  {
    id: 'emergencyHelp',
    icon: 'fa-triangle-exclamation',
    title: 'Notfallhilfe',
    lead:
      'Akute Probleme können Ausfälle oder schwerwiegende technische Fehler sein. Wartungskunden lassen sich besser einordnen, eine Bearbeitung innerhalb einer festen Frist wird aber nicht pauschal zugesagt.',
    points: [
      'Hilfe nach Verfügbarkeit und Wartungspaket',
      'komplexe Probleme können separat berechnet werden',
      'Drittanbieter-Ausfälle liegen nicht immer im Einflussbereich von Komplett Webdesign'
    ]
  },
  {
    id: 'responseTimes',
    icon: 'fa-clock',
    title: 'Reaktionszeiten',
    lead:
      'Die genaue Reaktionszeit wird je nach Wartungspaket und Vereinbarung festgelegt.',
    points: [
      'Wartungskunden sind planbarer betreut als reine Einzelanfragen.',
      'Art der Anfrage, technische Ursache und Verfügbarkeit beeinflussen die Bearbeitung.',
      'Verbindliche Zeiten werden nur genannt, wenn sie im Angebot ausdrücklich vereinbart sind.'
    ]
  },
  {
    id: 'thirdPartyTools',
    icon: 'fa-plug',
    title: 'Drittanbieter und externe Tools',
    lead:
      'Probleme mit externen Tools oder Anbietern können zusätzlichen Aufwand verursachen und sind nicht automatisch vollständig im Wartungspaket enthalten.',
    points: [
      'Buchungssysteme, Newsletter, Zahlungsanbieter oder Consent-Tools haben eigene Bedingungen.',
      'Konten und Kosten laufen oft sinnvoll direkt über dich.',
      'Prüfung und technische Einordnung sind möglich, größerer Aufwand bleibt separat.'
    ]
  }
]);

export const maintenancePage = Object.freeze({
  slug: 'website-wartung',
  canonicalPath: '/leistungen/website-wartung',
  title: 'Website Wartung Berlin | Support, Backups & Pflege',
  description:
    'Website-Wartung für kleine Unternehmen: Backups, Monitoring, Sicherheitschecks, kleine Inhaltsänderungen und Support im vereinbarten Umfang.',
  h1: 'Website-Wartung und Support in Berlin',
  primaryKeyword: 'Website Wartung Berlin',
  secondaryKeywords: [
    'Website Wartung',
    'Website Support Berlin',
    'Website Pflege Berlin',
    'Website Betreuung Berlin',
    'Website Wartung Kosten',
    'Website Backups Monitoring',
    'Website technischer Support'
  ],
  hero: {
    eyebrow: 'Website-Wartung Berlin',
    lead:
      'Nach dem Launch kann ich deine Website im vereinbarten Umfang technisch betreuen: mit Sichtprüfungen, Backups, Monitoring, Sicherheitschecks, kleinen Änderungen und persönlichem Support je nach Wartungspaket.',
    highlights: [
      'Wartung optional und klar vom Hosting getrennt',
      'realistische Pakete ab 39 €/Monat',
      'Backups, Monitoring und Support im definierten Umfang'
    ],
    primaryCta: {
      label: 'Wartung anfragen',
      url: ctas.maintenanceRequest.url
    },
    secondaryCta: {
      label: 'Laufende Kosten ansehen',
      url: ctas.runningCosts.url
    }
  },
  intro: {
    title: 'Betreuung nach dem Website-Launch',
    text:
      'Eine Website ist nach dem Livegang nicht automatisch dauerhaft erledigt. Technik, Inhalte, externe Dienste und Kontaktwege können sich verändern. Wartung ist die planbare Betreuung, damit kleine Probleme früher auffallen und Änderungen geordnet umgesetzt werden.'
  },
  whyMaintenance: {
    title: 'Warum Website-Wartung sinnvoll ist',
    points: [
      'technische Fehler können auch nach dem Launch entstehen',
      'externe Dienste, Browser oder Schnittstellen können sich ändern',
      'Backups helfen bei Wiederherstellung im Problemfall',
      'Monitoring kann Ausfälle schneller sichtbar machen',
      'kleine Anpassungen halten Inhalte aktuell',
      'Sicherheitschecks reduzieren technische Risiken'
    ],
    note:
      'Wartung reduziert technische Risiken, kann aber keine vollständige Sicherheit, ständige Verfügbarkeit oder schnelle Hilfe in jedem Fall zusagen.'
  },
  hostingVsMaintenance: {
    title: 'Wartung ist nicht dasselbe wie Hosting',
    core:
      'Hosting sorgt dafür, dass die Website technisch erreichbar ist. Wartung sorgt dafür, dass sie betreut, geprüft und bei Bedarf angepasst wird.',
    columns: [
      {
        title: 'Hosting',
        points: [
          'Serverbetrieb und technische Infrastruktur',
          'Auslieferung der Website',
          'DNS und SSL je nach Setup',
          'Domain und E-Mail bleiben eigene Themen'
        ]
      },
      {
        title: 'Wartung',
        points: [
          'regelmäßige technische Prüfung',
          'Backups und Monitoring je nach Paket',
          'kleine Inhaltsänderungen',
          'Support, Fehlerprüfung und kleinere Weiterentwicklung im vereinbarten Rahmen'
        ]
      }
    ],
    link: {
      label: 'Laufende Website-Kosten ansehen',
      href: '/leistungen/laufende-kosten-website'
    }
  },
  plans: maintenancePlans,
  planComparisonRows,
  included: [
    'technische Sichtprüfung je nach Wartungspaket',
    'Erreichbarkeitsprüfung oder Monitoring im vereinbarten Umfang',
    'Backups, sofern Hosting und Setup das sinnvoll ermöglichen',
    'Sicherheitschecks und Prüfung auffälliger Probleme',
    'kleine Inhaltsänderungen im definierten Rahmen',
    'technische Rückfragen und kleinere Fehlerprüfung',
    'Prüfung externer Einbindungen im vereinbarten Umfang'
  ],
  notIncluded: [
    'Inhaltsänderungen ohne vereinbarten Rahmen',
    'neue Unterseiten in größerem Umfang',
    'neue Funktionen oder größerer Relaunch',
    'umfangreiche Texterstellung',
    'laufende SEO-Betreuung oder Google Ads',
    'Social Media',
    'Rechtsberatung oder Rechtstexterstellung',
    'durchgehender Bereitschaftsdienst ohne separate Vereinbarung',
    'externe Toolkosten',
    'Drittanbieter-Support ohne Vereinbarung',
    'komplexe Schnittstellenprobleme',
    'Shop- oder Zahlungsanbieter-Probleme ohne Prüfung',
    'Hosting, falls nicht separat vereinbart',
    'Domain- und E-Mail-Kosten'
  ],
  detailBlocks,
  cancellation: {
    title: 'Laufzeit und Kündigung',
    text:
      'Laufzeit und Kündigung werden im jeweiligen Angebot festgelegt. Ziel ist eine klare, faire und planbare Betreuung. Diese Information ersetzt keine juristische Vertrags- oder AGB-Prüfung.'
  },
  targetGroups: {
    title: 'Für wen Wartung sinnvoll ist',
    goodFit: [
      'Unternehmen ohne eigene technische Betreuung',
      'kleine Unternehmen mit aktueller Website',
      'Kunden, die Änderungen nicht selbst machen wollen',
      'Websites mit Kontaktformularen oder externen Einbindungen',
      'Unternehmen, die planbare technische Betreuung möchten'
    ],
    notAlwaysNeeded: [
      'sehr kleine statische Websites ohne Änderungen',
      'Kunden, die alles selbst pflegen möchten',
      'reine Testprojekte',
      'fremde Systeme, die technisch nicht sinnvoll betreut werden können'
    ]
  },
  hourlySupport: {
    title: 'Wann stundenweise Unterstützung besser passt',
    text:
      'Ein Wartungspaket lohnt sich bei regelmäßiger Betreuung. Wenn du nur selten etwas brauchst, kann stundenweise Unterstützung sinnvoller sein.',
    maintenanceUsefulFor: [
      'regelmäßige Betreuung',
      'planbare kleine Änderungen',
      'Monitoring, Backups und Sicherheitschecks',
      'technischer Support im laufenden Betrieb'
    ],
    hourlyUsefulFor: [
      'einmalige Änderungen',
      'seltene Anpassungen',
      'Fehlerbehebungen',
      'einzelne Erweiterungen',
      'Website-Audit oder Relaunch-Vorbereitung'
    ]
  },
  legalNotes: [
    'Wartung erfolgt im vereinbarten Umfang.',
    'Drittanbieter-Kosten, Lizenzen und externe Toolgebühren sind separat zu betrachten.',
    'Externe Dienste liegen nicht vollständig im Einflussbereich von Komplett Webdesign.',
    'Notfallhilfe erfolgt nach Vereinbarung und Verfügbarkeit.',
    'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    'Rechtliche Prüfungen und Rechtstexterstellung sind nicht Bestandteil der technischen Wartung.'
  ],
  faq: [
    {
      question: 'Was ist Website-Wartung?',
      answer: 'Website-Wartung ist die laufende technische Betreuung einer Website, zum Beispiel Sichtprüfung, Backups, Monitoring, Sicherheitschecks, kleine Änderungen und Support im vereinbarten Umfang.'
    },
    {
      question: 'Ist Wartung Pflicht?',
      answer: 'Nein. Wartung ist optional, aber sinnvoll, wenn du nach dem Launch technische Betreuung und planbare Unterstützung möchtest.'
    },
    {
      question: 'Was ist der Unterschied zwischen Hosting und Wartung?',
      answer: 'Hosting stellt die Website technisch bereit. Wartung beschreibt die laufende Prüfung, Betreuung, kleinere Anpassungen und Unterstützung im vereinbarten Rahmen.'
    },
    {
      question: 'Was kostet Website-Wartung?',
      answer: 'Die Wartungspakete starten bei ab 39 €/Monat. Standard beginnt bei ab 79 €/Monat, Plus bei ab 129 €/Monat.'
    },
    {
      question: 'Was ist im Wartungspaket enthalten?',
      answer: 'Das hängt vom Paket ab. Möglich sind technische Sichtprüfung, Backups, Monitoring, Sicherheitschecks, kleine Änderungen und Support im vereinbarten Umfang.'
    },
    {
      question: 'Sind Backups enthalten?',
      answer: 'Backups hängen vom Hosting- und Wartungssetup ab. Umfang und Wiederherstellungsweg werden passend zum Projekt eingeordnet.'
    },
    {
      question: 'Was bedeutet Monitoring?',
      answer: 'Monitoring prüft Erreichbarkeit oder technische Auffälligkeiten. Es hilft bei früherer Erkennung, ersetzt aber keine ständige manuelle Kontrolle.'
    },
    {
      question: 'Sind Sicherheitschecks enthalten?',
      answer: 'Je nach Paket ja. Sicherheitschecks sind technische Sichtprüfungen und reduzieren Risiken, ersetzen aber keine vollständige Sicherheitsprüfung.'
    },
    {
      question: 'Sind Inhaltsänderungen enthalten?',
      answer: 'Je nach Paket können kleine Inhaltsänderungen im definierten Rahmen enthalten sein. Größere Texte, neue Seiten oder neue Layouts werden separat kalkuliert.'
    },
    {
      question: 'Sind Änderungen ohne Grenze enthalten?',
      answer: 'Nein. Änderungen werden nach Wartungspaket und vereinbartem Zeitrahmen eingeordnet.'
    },
    {
      question: 'Gibt es durchgehenden Support?',
      answer: 'Nein, eine durchgehende Bereitschaft wird nicht pauschal zugesagt. Support erfolgt nach Wartungspaket, Vereinbarung und Verfügbarkeit.'
    },
    {
      question: 'Wie schnell reagierst du auf Anfragen?',
      answer: 'Die genaue Reaktionszeit wird je nach Wartungspaket und Vereinbarung festgelegt.'
    },
    {
      question: 'Was passiert bei einem Notfall?',
      answer: 'Akute technische Probleme werden nach Verfügbarkeit und Wartungspaket eingeordnet. Komplexe Fälle können separaten Aufwand verursachen.'
    },
    {
      question: 'Sind externe Tools enthalten?',
      answer: 'Nein. Externe Tools, Anbietergebühren und fremde Systeme sind nicht automatisch vollständig Teil des Wartungspakets.'
    },
    {
      question: 'Ist SEO-Betreuung enthalten?',
      answer: 'Nein. Technische Wartung ist keine laufende SEO-Betreuung. SEO-Seiten, Local SEO oder laufende Optimierung werden separat geplant.'
    },
    {
      question: 'Ist Rechtstextpflege enthalten?',
      answer: 'Nein. Rechtstexte und rechtliche Prüfung sind keine technische Wartungsleistung und sollten bei Bedarf extern geprüft werden.'
    },
    {
      question: 'Kann ich Wartung später dazubuchen?',
      answer: 'Ja. Nach dem Launch kann Wartung eingeordnet werden, wenn Website, Hosting und gewünschte Betreuung dazu passen.'
    },
    {
      question: 'Kann ich monatlich kündigen?',
      answer: 'Laufzeit und Kündigung werden im jeweiligen Angebot festgelegt. Ziel ist eine faire und planbare Betreuung.'
    },
    {
      question: 'Betreust du auch fremde Websites?',
      answer: 'Das hängt vom System, Zustand und Zugriff ab. Individuelle Node.js/EJS-Projekte sind meist besser einschätzbar als unbekannte Fremdsysteme.'
    },
    {
      question: 'Was passiert, wenn ich keine Wartung buche?',
      answer: 'Die Website kann trotzdem online sein. Änderungen, technische Prüfungen, Support und spätere Fehlerbehebungen werden dann einzeln besprochen.'
    }
  ],
  internalLinks: [
    { label: 'Laufende Website-Kosten', href: '/leistungen/laufende-kosten-website', text: 'Domain, E-Mail, Hosting, Wartung und Tools getrennt betrachten' },
    { label: 'Zusatzleistungen Webdesign', href: '/leistungen/zusatzleistungen-webdesign', text: 'Einmalige Erweiterungen und stundenweise Unterstützung ansehen' },
    { label: 'Website-Pakete', href: '/pakete', text: 'Start, Business, Wachstum und Individuell vergleichen' },
    { label: 'Webdesign Berlin', href: '/webdesign-berlin', text: 'Hauptleistung und lokale Umsetzung ansehen' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch', text: 'Größere technische und inhaltliche Erneuerung planen' },
    { label: 'Kontakt aufnehmen', href: '/kontakt', text: 'Wartung oder Website-Betreuung besprechen' }
  ],
  cta: {
    title: 'Welche Betreuung passt zu deiner Website?',
    text:
      'Beschreibe kurz deine Website, dein Hosting-Setup und welche Unterstützung du nach dem Launch brauchst. Ich ordne ein, ob Wartung Basis, Standard, Plus oder stundenweise Unterstützung sinnvoller ist.',
    primary: {
      label: 'Wartungspaket einschätzen lassen',
      url: ctas.maintenanceRequest.url
    },
    secondary: {
      label: 'Zusatzleistungen ansehen',
      url: ctas.addOns.url
    }
  },
  finalCta: {
    title: 'Website-Betreuung nach dem Launch klären',
    text:
      'Wenn deine Website technisch betreut werden soll, klären wir Umfang, Hosting, Backups, Monitoring, Änderungen und Reaktionswege vorab.',
    primary: {
      label: 'Website-Betreuung besprechen',
      url: ctas.maintenanceRequest.url
    },
    secondary: {
      label: 'Laufende Kosten ansehen',
      url: ctas.runningCosts.url
    }
  },
  sections: [
    { id: 'hero' },
    { id: 'intro' },
    { id: 'whyMaintenance' },
    { id: 'hostingVsMaintenance' },
    { id: 'plans' },
    { id: 'planComparison' },
    { id: 'included' },
    { id: 'notIncluded' },
    { id: 'backups' },
    { id: 'monitoring' },
    { id: 'securityChecks' },
    { id: 'contentChanges' },
    { id: 'technicalSupport' },
    { id: 'emergencyHelp' },
    { id: 'responseTimes' },
    { id: 'thirdPartyTools' },
    { id: 'cancellation' },
    { id: 'targetGroups' },
    { id: 'hourlySupport' },
    { id: 'faq' },
    { id: 'cta' },
    { id: 'finalCta' }
  ]
});

export default maintenancePage;
