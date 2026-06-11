import { addOns, getAddOnById } from './addOns.js';
import { ctas } from './ctas.js';
import { maintenancePlans } from './maintenancePlans.js';
import { PACKAGE_GLOBAL_NOTES } from './packages.js';

const detailSectionIds = [
  'hosting',
  'domain',
  'email',
  'maintenance',
  'backups-monitoring',
  'third-party-tools',
  'consent-tools',
  'booking-tools',
  'newsletter-tools',
  'payment-providers',
  'tracking'
];

const selectedAddOns = [
  'buchungssystem-integration',
  'tracking-einrichtung',
  'cms-einfach',
  'mehrsprachigkeit',
  'local-seo-basis',
  'stundenweise-weiterentwicklung'
]
  .map((id) => getAddOnById(id))
  .filter(Boolean)
  .map((item) => ({
    name: item.name,
    category: item.category,
    priceLabel: item.priceLabel,
    text: item.shortDescription,
    note: item.thirdPartyCostNote
  }));

const maintenanceSummary = maintenancePlans.map((plan) => ({
  name: plan.name,
  priceLabel: plan.priceLabel,
  text: plan.shortDescription,
  included: plan.included.slice(0, 4),
  responseTime: plan.responseTime.replace(/,\s*ohne\s*24\/7-Zusage/i, '')
}));

export const runningCostsPage = Object.freeze({
  slug: 'laufende-kosten-website',
  canonicalPath: '/leistungen/laufende-kosten-website',
  title: 'Laufende Website-Kosten | Hosting, Wartung & Tools',
  description:
    'Erfahre, welche laufenden Kosten nach dem Website-Launch entstehen können: Hosting, Domain, E-Mail, Wartung, Tools und Drittanbieter.',
  ogTitle: 'Laufende Website-Kosten einfach erklärt',
  ogDescription:
    'Projektpreis und Betriebskosten sauber trennen: Domain, E-Mail, Hosting, Wartung und externe Tools verständlich erklärt.',
  h1: 'Laufende Website-Kosten nach dem Launch',
  hero: {
    eyebrow: 'Kosten nach dem Launch',
    lead:
      'Der einmalige Website-Preis deckt die Erstellung im vereinbarten Umfang ab. Für den laufenden Betrieb können Domain, E-Mail, Hosting, Wartung und externe Tools separat anfallen.',
    highlights: [
      'Projektkosten und Betriebskosten klar getrennt',
      'Hosting, Domain und E-Mail verständlich abgegrenzt',
      'Drittanbieter-Kosten vor der Umsetzung einordnen'
    ],
    primaryCta: {
      label: 'Laufende Kosten einschätzen lassen',
      url: ctas.estimateCosts.url
    },
    secondaryCta: {
      label: 'Pakete ansehen',
      url: ctas.comparePackages.url
    }
  },
  intro: {
    title: 'Warum laufende Kosten getrennt betrachtet werden sollten',
    text:
      'Eine Website besteht nicht nur aus Design und Umsetzung. Nach dem Launch muss sie technisch ausgeliefert, erreichbar gehalten und je nach Setup gepflegt werden. Diese Betriebskosten hängen stark davon ab, welche Dienste, Konten und Zusatzfunktionen genutzt werden.',
    cards: [
      {
        title: 'Einmalig planen',
        text: 'Konzeption, Design, technische Umsetzung und Inhalte werden im Website-Angebot definiert.'
      },
      {
        title: 'Laufend betreiben',
        text: 'Domain, E-Mail, Hosting, Wartung, Backups und Tools können monatlich oder jährlich anfallen.'
      },
      {
        title: 'Zuständigkeiten klären',
        text: 'Manche Dienste laufen sinnvoll über Komplett Webdesign, andere besser direkt über dein Kundenkonto.'
      }
    ]
  },
  oneTimeVsRunning: {
    note:
      'Der Website-Paketpreis deckt die Erstellung im vereinbarten Umfang ab. Der laufende Betrieb kann separate monatliche oder jährliche Kosten verursachen.',
    columns: [
      {
        title: 'Einmalige Projektkosten',
        items: [
          'Konzeption und Seitenstruktur',
          'individuelles Design',
          'technische Umsetzung mit Node.js/EJS/CSS/JavaScript',
          'Inhalte im vereinbarten Umfang',
          'technische SEO-Grundlagen',
          'Launch-Vorbereitung'
        ]
      },
      {
        title: 'Laufende Betriebskosten',
        items: [
          'Domain und E-Mail',
          'Website-Hosting',
          'Wartung und Support',
          'Backups, Monitoring und Sicherheitschecks',
          'Cookie-/Consent-Tools',
          'externe Tools, Lizenzen oder Anbietergebühren'
        ]
      }
    ]
  },
  costOverview: [
    {
      type: 'Domain',
      rhythm: 'meist jährlich',
      responsibility: 'häufig direkt über dein Kundenkonto',
      note: 'Adresse der Website, getrennt vom eigentlichen Website-Hosting.'
    },
    {
      type: 'E-Mail',
      rhythm: 'monatlich oder jährlich',
      responsibility: 'häufig direkt über deinen Anbieter',
      note: 'Postfächer sind ein eigener Dienst und müssen nicht auf dem Website-Server liegen.'
    },
    {
      type: 'Hosting',
      rhythm: 'meist monatlich',
      responsibility: 'optional über Komplett Webdesign möglich',
      note: 'Technischer Serverbetrieb der Website, aber keine automatische Wartung.'
    },
    {
      type: 'Wartung',
      rhythm: 'optional monatlich',
      responsibility: 'je nach Wartungspaket',
      note: 'Technische Betreuung, Backups, Monitoring oder kleine Änderungen im definierten Umfang.'
    },
    {
      type: 'Drittanbieter-Tools',
      rhythm: 'abhängig vom Tool',
      responsibility: 'oft auf Kundenrechnung',
      note: 'Zum Beispiel Buchung, Newsletter, Zahlung, Karten, Videos, Chat oder externe APIs.'
    },
    {
      type: 'Cookie-/Consent-Tool',
      rhythm: 'abhängig von eingesetzten Diensten',
      responsibility: 'nach Setup zu klären',
      note: 'Kann nötig werden, wenn Analytics, Marketingdienste oder externe Medien eingebunden werden.'
    },
    {
      type: 'Zahlungsanbieter',
      rhythm: 'häufig Transaktionsgebühren',
      responsibility: 'direkt beim Anbieter',
      note: 'Relevant bei Shops, Buchungen, digitalen Produkten oder Anzahlungen.'
    },
    {
      type: 'Tracking/Analytics',
      rhythm: 'abhängig vom Tool',
      responsibility: 'optional und zustimmungsbewusst',
      note: 'Hilft bei Auswertung, ist aber kein Standardbestandteil jedes Website-Projekts.'
    }
  ],
  details: [
    {
      id: 'hosting',
      icon: 'fa-server',
      title: 'Hosting',
      lead:
        'Hosting ist der technische Speicher- und Serverbetrieb der Website. Es ist nicht automatisch in jedem Website-Paket enthalten und wird getrennt von Wartung betrachtet.',
      items: [
        'optional über den eigenen VPS bei IONOS möglich, wenn es im Projekt vorgesehen ist',
        'technische Auslieferung der Website, DNS-Anbindung und Serverkonfiguration im vereinbarten Umfang',
        'keine automatische Inhaltsänderung, SEO-Betreuung oder unbegrenzte Unterstützung'
      ]
    },
    {
      id: 'domain',
      icon: 'fa-globe',
      title: 'Domain',
      lead:
        'Die Domain ist die Adresse deiner Website. Domainkosten hängen vom Anbieter und der Domainendung ab.',
      items: [
        'bestehende Domains können oft weiter genutzt werden',
        'häufig ist es sinnvoll, dass die Domain direkt über dich läuft',
        'DNS-Einträge können auf den Website-Server abgestimmt werden'
      ]
    },
    {
      id: 'email',
      icon: 'fa-envelope',
      title: 'E-Mail',
      lead:
        'E-Mail-Postfächer sind ein eigener Dienst. Sie müssen nicht zwingend auf demselben Server laufen wie die Website.',
      items: [
        'bestehende E-Mail-Anbieter können oft bestehen bleiben',
        'Kosten hängen von Anbieter, Postfächern und Speicherumfang ab',
        'E-Mail-Migration ist ein separates Thema und wird nicht ungefragt zugesagt'
      ]
    },
    {
      id: 'maintenance',
      icon: 'fa-screwdriver-wrench',
      title: 'Wartung und Support',
      lead:
        'Wartung ist optional und wird separat vereinbart. Sie ist nicht automatisch Hosting, SEO oder unbegrenzte Inhaltsänderung.',
      items: [
        'technische Sichtprüfung, Backups, Monitoring oder Sicherheitschecks je nach Paket',
        'kleine Inhaltsänderungen nur im definierten Rahmen',
        'neue Funktionen, größere Designänderungen und laufende SEO-Betreuung werden separat kalkuliert'
      ]
    },
    {
      id: 'backups-monitoring',
      icon: 'fa-shield-halved',
      title: 'Backups, Monitoring und Sicherheitschecks',
      lead:
        'Backups und Monitoring helfen, Probleme schneller zu erkennen und Inhalte im Problemfall wiederherzustellen. Umfang und Takt hängen von Hosting und Wartung ab.',
      items: [
        'Backups sind abhängig vom konkreten Hosting-Setup',
        'Monitoring prüft Erreichbarkeit oder technische Auffälligkeiten im vereinbarten Umfang',
        'Sicherheitschecks sind technische Sichtprüfungen, keine absolute Sicherheitszusage'
      ]
    },
    {
      id: 'third-party-tools',
      icon: 'fa-plug',
      title: 'Drittanbieter-Tools',
      lead:
        'Externe Tools können eigene Preise, Bedingungen und Datenschutzanforderungen haben. Drittanbieter-Kosten sind nicht automatisch im Website-Paket enthalten.',
      items: [
        'Cookie-/Consent-Tools, Buchungssysteme, Newsletter, Zahlungsanbieter oder Karten-Dienste',
        'Konten laufen häufig direkt über dich, damit Rechnung und Kontrolle bei dir bleiben',
        'Preise und Bedingungen externer Anbieter können sich ändern'
      ]
    },
    {
      id: 'consent-tools',
      icon: 'fa-sliders',
      title: 'Cookie-/Consent-Tools',
      lead:
        'Ob ein Cookie- oder Consent-Tool erforderlich ist, hängt von den eingebundenen Diensten ab.',
      items: [
        'bei Analytics, Marketingdiensten oder externen Medien kann Consent relevant werden',
        'die technische Einbindung kann vorbereitet werden',
        'die rechtliche Bewertung sollte bei Bedarf extern geprüft werden'
      ]
    },
    {
      id: 'booking-tools',
      icon: 'fa-calendar-check',
      title: 'Buchungssysteme',
      lead:
        'Buchungssysteme sind nicht Bestandteil der Standardpakete. Die Integration ist eine Zusatzleistung oder ein individuelles Projekt.',
      items: [
        'viele Anbieter berechnen monatliche Kosten',
        'Funktionsumfang, Anbieter und Datenschutzanforderungen werden vorab abgestimmt',
        'komplexe Buchungslogik kann zusätzlichen Aufwand erzeugen'
      ]
    },
    {
      id: 'newsletter-tools',
      icon: 'fa-paper-plane',
      title: 'Newsletter-Tools',
      lead:
        'Newsletter-Tools sind externe Dienste. Kosten können nach Empfängeranzahl, Funktionen oder Versandumfang entstehen.',
      items: [
        'Integration ist eine Zusatzleistung',
        'Einwilligung und Datenschutzanforderungen sollten sauber geprüft werden',
        'das Newsletter-Konto läuft häufig direkt über dich'
      ]
    },
    {
      id: 'payment-providers',
      icon: 'fa-credit-card',
      title: 'Zahlungsanbieter',
      lead:
        'Zahlungsanbieter können Transaktionsgebühren oder eigene Anbieterentgelte berechnen.',
      items: [
        'relevant bei Shops, Buchungen, digitalen Produkten oder Anzahlungen',
        'Zahlungsfunktionen sind nicht in Standardpaketen enthalten',
        'Integration und Anbieterbedingungen werden separat betrachtet'
      ]
    },
    {
      id: 'tracking',
      icon: 'fa-chart-line',
      title: 'Tracking und Analytics',
      lead:
        'Tracking kann helfen, Anfragen und CTA-Klicks besser zu verstehen. Die Einrichtung ist optional und muss datenschutzbewusst geplant werden.',
      items: [
        'Toolauswahl und Consent-Logik werden vorab abgestimmt',
        'personenbezogene Formulardaten werden nicht als Trackingdaten vorgesehen',
        'Tracking verbessert Messbarkeit, ersetzt aber keine Ergebniszusage'
      ]
    }
  ],
  maintenanceSummary,
  selectedAddOns,
  responsibilities: {
    kompletWebdesign: {
      title: 'Was über Komplett Webdesign laufen kann',
      items: [
        'technische Website-Erstellung',
        'optionales Hosting über VPS, wenn vereinbart',
        'technische DNS-Abstimmung',
        'Wartungspakete im definierten Umfang',
        'Backups und Monitoring im Wartungsumfang',
        'technische Einbindung externer Tools',
        'technische Einbindung gelieferter Rechtstexte',
        'technische Einbindung einer Cookie-/Consent-Lösung',
        'kleinere Inhaltsänderungen im Wartungsvertrag'
      ]
    },
    client: {
      title: 'Was direkt über dich laufen sollte',
      items: [
        'Domain',
        'E-Mail-Postfächer',
        'externe Tool-Abos',
        'Buchungssystemkonto',
        'Newsletterkonto',
        'Zahlungsanbieter',
        'Google Business Profile',
        'Bild- und Schriftlizenzen',
        'rechtliche Textgeneratoren oder Rechtsberatung',
        'Analytics-/Tracking-Konto, falls genutzt'
      ]
    }
  },
  examples: [
    {
      title: 'Sehr schlanke Website',
      setup: 'Kompakter Auftritt ohne externe Sonderfunktionen',
      costs: ['Domain extern/jährlich', 'E-Mail extern/monatlich oder jährlich', 'Hosting optional', 'Wartung optional', 'Drittanbieter: keine oder minimal'],
      costRange: 'ca. 5 bis 40 € monatlich plus ca. 10 bis 40 € jährlich',
      note: 'Sinnvoll, wenn eine kleine Website mit wenigen Inhalten und klarer Kontaktmöglichkeit reicht.'
    },
    {
      title: 'Kleine Unternehmenswebsite mit Wartung',
      setup: 'Business-Website mit technischer Betreuung',
      costs: ['Domain und E-Mail auf Kundenrechnung', 'Hosting optional über Komplett Webdesign', 'Wartung Basis oder Standard', 'Consent-Tool, wenn externe Dienste eingesetzt werden'],
      costRange: 'ca. 49 bis 180 € monatlich plus ca. 10 bis 80 € jährlich',
      note: 'Sinnvoll, wenn die Website regelmäßig geprüft und im kleinen Rahmen gepflegt werden soll.'
    },
    {
      title: 'Website mit Buchungssystem oder Newsletter',
      setup: 'Zusatzfunktion mit externem Anbieter',
      costs: ['Domain und E-Mail', 'Hosting', 'Wartung', 'Buchungssystem-Abo', 'Newsletter-Tool', 'Consent-Tool', 'optional Tracking'],
      costRange: 'ca. 80 bis 300 € monatlich plus mögliche Transaktions- oder Toolgebühren',
      note: 'Sinnvoll, wenn Termine, Reservierungen oder E-Mail-Marketing in den Website-Prozess eingebunden werden.'
    },
    {
      title: 'Umfangreichere Website mit laufender Betreuung',
      setup: 'Mehr Struktur, mehr Prüfung, mehr Weiterentwicklung',
      costs: ['Hosting', 'Wartung Plus', 'Monitoring im vereinbarten Umfang', 'zusätzliche Pflege', 'externe Tools', 'optionale Local-SEO-Betreuung'],
      costRange: 'ca. 180 bis 600 € monatlich plus externe Tools nach Umfang',
      note: 'Sinnvoll für Websites, die nach dem Launch aktiv weiterentwickelt werden.'
    }
  ],
  notIncluded: [
    'Domain',
    'E-Mail',
    'Hosting',
    'Wartung',
    'Backups',
    'Monitoring',
    'externe Tools',
    'Cookie-/Consent-Tools',
    'Buchungssysteme',
    'Newsletter-Tools',
    'Zahlungsanbieter',
    'Trackingtools',
    'Bildlizenzen',
    'Schriftlizenzen',
    'Rechtsberatung',
    'Rechtstexterstellung',
    'laufende SEO-Betreuung',
    'unbegrenzte Inhaltsänderungen',
    'Notfallhilfe ohne Vereinbarung'
  ],
  legalNotes: [
    'Die Angaben dienen zur Orientierung. Externe Anbieter können eigene Preise, Bedingungen und Datenschutzanforderungen haben.',
    PACKAGE_GLOBAL_NOTES.legalNote,
    'Ich kann technische Einbindungen vorbereiten, leiste aber keine Rechtsberatung.',
    'Wartung, Hosting und Support gelten nur im vereinbarten Umfang.',
    'Die Auswahl von Tracking-, Consent- oder Marketing-Tools sollte vor dem Einsatz fachlich und rechtlich geprüft werden.'
  ],
  faq: [
    {
      question: 'Welche laufenden Kosten entstehen bei einer Website?',
      answer: 'Typisch sind Domain, E-Mail, Hosting, Wartung, Backups, Monitoring und externe Tools. Welche Punkte relevant sind, hängt vom konkreten Setup ab.'
    },
    {
      question: 'Ist Hosting im Website-Paket enthalten?',
      answer: 'Nein, Hosting ist nicht automatisch in jedem Website-Paket enthalten. Es kann optional über Komplett Webdesign angeboten oder separat über deinen Anbieter gelöst werden.'
    },
    {
      question: 'Was kostet eine Domain?',
      answer: 'Domainkosten hängen vom Anbieter und der Domainendung ab. Meist fallen sie jährlich an und laufen sinnvoll direkt über dein Kundenkonto.'
    },
    {
      question: 'Was kostet E-Mail?',
      answer: 'E-Mail-Kosten hängen vom Anbieter, der Anzahl der Postfächer und dem Speicherumfang ab. Häufig bleiben E-Mails beim bestehenden Anbieter.'
    },
    {
      question: 'Kann ich meine bestehende Domain weiter nutzen?',
      answer: 'In vielen Fällen ja. Die Domain kann bestehen bleiben, während DNS-Einträge auf den neuen Website-Server abgestimmt werden.'
    },
    {
      question: 'Muss E-Mail über denselben Server laufen wie die Website?',
      answer: 'Nein. E-Mail und Website-Hosting sind getrennte Dienste und können über unterschiedliche Anbieter laufen.'
    },
    {
      question: 'Was ist der Unterschied zwischen Hosting und Wartung?',
      answer: 'Hosting stellt die Website technisch bereit. Wartung beschreibt optionale Betreuung wie Prüfungen, Backups, Monitoring, Support oder kleine Änderungen im vereinbarten Umfang.'
    },
    {
      question: 'Ist Wartung Pflicht?',
      answer: 'Nein, Wartung ist optional. Sie kann aber sinnvoll sein, wenn du regelmäßige technische Prüfung und klaren Support nach dem Launch möchtest.'
    },
    {
      question: 'Was ist in einem Wartungspaket enthalten?',
      answer: 'Das hängt vom Paket ab. Möglich sind technische Sichtprüfungen, Backups, Monitoring, Sicherheitschecks, kleiner Änderungsrahmen und Support im vereinbarten Umfang.'
    },
    {
      question: 'Sind Backups enthalten?',
      answer: 'Backups hängen vom Hosting- und Wartungsumfang ab. Sie werden nicht pauschal für jedes Projekt gleich zugesagt.'
    },
    {
      question: 'Was ist Monitoring?',
      answer: 'Monitoring prüft Erreichbarkeit oder technische Auffälligkeiten. Umfang und Reaktionsweg werden im Wartungs- oder Hosting-Setup festgelegt.'
    },
    {
      question: 'Sind Drittanbieter-Kosten enthalten?',
      answer: 'Nein, Drittanbieter-Kosten sind nicht automatisch enthalten. Beispiele sind Buchungssysteme, Newsletter-Tools, Zahlungsanbieter, Consent-Tools oder externe Medien.'
    },
    {
      question: 'Wann brauche ich ein Cookie- oder Consent-Tool?',
      answer: 'Das hängt von den eingebundenen Diensten ab. Bei Analytics, Marketingdiensten oder externen Medien kann ein Consent-Setup relevant werden.'
    },
    {
      question: 'Was kosten Buchungssysteme?',
      answer: 'Viele Buchungssysteme haben eigene Anbieterpreise. Die Integration wird separat geprüft und als Zusatzleistung oder individuelles Projekt eingeordnet.'
    },
    {
      question: 'Sind Newsletter-Tools enthalten?',
      answer: 'Nein. Newsletter-Tools sind externe Dienste und werden bei Bedarf separat ausgewählt, eingerichtet und technisch eingebunden.'
    },
    {
      question: 'Fallen bei Zahlungsanbietern Gebühren an?',
      answer: 'Häufig ja. Zahlungsanbieter können Transaktionsgebühren oder eigene Anbieterbedingungen haben, die direkt beim Anbieter geprüft werden sollten.'
    },
    {
      question: 'Kann alles über Komplett Webdesign laufen?',
      answer: 'Technische Website-Erstellung, optionales Hosting, Wartung und Tool-Einbindungen können über Komplett Webdesign laufen. Domain, E-Mail und externe Tool-Konten bleiben häufig besser direkt bei dir.'
    },
    {
      question: 'Was sollte besser auf Kundenrechnung laufen?',
      answer: 'Domain, E-Mail, Tool-Abos, Buchungs-, Newsletter-, Zahlungs- und Tracking-Konten laufen oft sinnvoll direkt über dich, damit Kontrolle und Rechnungen klar bleiben.'
    },
    {
      question: 'Kann ich später Wartung dazubuchen?',
      answer: 'Ja, Wartung kann nach dem Launch besprochen werden. Der konkrete Umfang hängt von Website, Hosting und gewünschter Betreuung ab.'
    },
    {
      question: 'Gibt es laufende SEO-Kosten?',
      answer: 'Technische SEO-Grundlagen gehören zum vereinbarten Website-Umfang. Laufende SEO-Betreuung, neue SEO-Seiten oder Local-SEO-Maßnahmen werden separat geplant.'
    }
  ],
  internalLinks: [
    { label: 'Website-Pakete ansehen', href: '/pakete' },
    { label: 'Projekt anfragen', href: '/kontakt' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' },
    { label: 'Webdesign Berlin', href: '/webdesign-berlin' },
    { label: 'Kosten- und Preisseite', href: '/webdesign-berlin/kosten-preise-pakete' },
    { label: 'Website-Tester starten', href: '/website-tester' }
  ],
  finalCta: {
    title: 'Laufende Kosten vor dem Angebot sauber klären',
    text:
      'Wenn du ein Website-Projekt planst, ordne ich mit dir ein, welche Betriebskosten realistisch sind und welche externen Dienste sinnvoll direkt über dich laufen.',
    primary: {
      label: 'Website-Projekt anfragen',
      url: '/kontakt'
    },
    secondary: {
      label: 'Pakete vergleichen',
      url: '/pakete'
    }
  },
  sections: [
    { id: 'intro', title: 'Warum laufende Kosten getrennt betrachtet werden sollten' },
    { id: 'one-time-vs-running', title: 'Einmalige Projektkosten vs. laufende Kosten' },
    { id: 'cost-overview', title: 'Typische laufende Kosten im Überblick' },
    ...detailSectionIds.map((id) => ({ id })),
    { id: 'handled-by-komplettwebdesign', title: 'Was über Komplett Webdesign laufen kann' },
    { id: 'handled-by-client', title: 'Was direkt über den Kunden laufen sollte' },
    { id: 'examples', title: 'Beispielrechnungen für laufende Kosten' },
    { id: 'not-included', title: 'Was nicht automatisch enthalten ist' },
    { id: 'legal-notes', title: 'Rechtlich vorsichtige Hinweise' },
    { id: 'faq', title: 'FAQ zu laufenden Website-Kosten' }
  ],
  sourceNotes: {
    maintenancePlans: maintenancePlans.map((plan) => plan.id),
    addOns: addOns.map((item) => item.id)
  }
});

export default runningCostsPage;
