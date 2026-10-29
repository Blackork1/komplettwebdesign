// Inhalte der Seite /branchen/webdesign-steuerberater („Website für Steuerberater und Kanzleien“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/steuerberater.md):
// Google-Suchvorschläge von Kanzleien und Mandanten, Konkurrenzseiten und die Berufsstatistik 2025
// der Bundessteuerberaterkammer.

export const STEUERBERATER_CONTENT_UPDATED_ISO = '2026-10-29';

const BSTBK_SOURCE = 'BStBK-Berufsstatistik 2025';

export const STEUERBERATER_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für eine Steuerkanzlei?',
    a: 'Eine kompakte Kanzlei-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten je Mandantengruppe, Team und Karriere liegt das Business-Paket bei {{price.business}}, größere Kanzleien oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Es gibt keine Pflicht-Abos für Steuer-News oder Vorlagen.'
  },
  {
    q: 'Dürfen Steuerberater überhaupt Werbung machen?',
    a: 'Ja. Nach § 57a Steuerberatungsgesetz ist Werbung erlaubt, soweit sie sachlich über die berufliche Tätigkeit informiert und nicht auf einen Auftrag im Einzelfall gerichtet ist. Eine Website mit Leistungen, Mandantengruppen, Team und Kontaktweg ist genau das. Superlative und Erfolgsversprechen lasse ich weg.'
  },
  {
    q: 'Was gehört ins Impressum einer Kanzlei-Website?',
    a: 'Nach § 5 DDG neben Name, Anschrift und Kontakt die zuständige Steuerberaterkammer, die gesetzliche Berufsbezeichnung mit dem Staat der Verleihung und die berufsrechtlichen Regelungen mit dem Hinweis, wo sie zu finden sind. Nach § 2 der Dienstleistungs-Informationspflichten-Verordnung kommen Angaben zur Berufshaftpflichtversicherung dazu, die viele Kanzleien ebenfalls im Impressum machen.'
  },
  {
    q: 'Sollte ich die Kosten auf der Website erklären?',
    a: 'Ja, zumindest wie sie entstehen. Die Vergütung richtet sich nach der Vergütungsverordnung für Steuerberater (StBVV) oder nach einer Vereinbarung in Textform, etwa als monatliche Pauschale. Ein kurzer, sachlicher Abschnitt dazu beantwortet die häufige Suche „Steuerberater Kosten“ und spart Rückfragen im Erstgespräch.'
  },
  {
    q: 'Wie binde ich DATEV Unternehmen online oder ein Mandantenportal ein?',
    a: 'Als gut sichtbare Zugänge im Kopfbereich der Website, die direkt zum Portal führen. Die Belege laufen damit weiter über das System, das du schon nutzt, und nicht über die Website. Das ist sicherer und für Mandanten gewohnt.'
  },
  {
    q: 'Hilft die Website bei der Suche nach Steuerfachangestellten?',
    a: 'Ja, wenn sie zeigt, wie bei dir gearbeitet wird: digitale Abläufe, Arbeitszeiten, Fortbildung, Team und ein kurzer Bewerbungsweg. Stellenanzeigen kann ich so auszeichnen, dass Google sie in der Jobsuche anzeigen kann. Bei sinkenden Ausbildungszahlen ist die Karriereseite oft genauso wichtig wie die Leistungsseite.'
  },
  {
    q: 'Soll ich zeigen, ob ich neue Mandate annehme?',
    a: 'Ja. „Steuerberater Berlin freie Kapazitäten“ ist ein eigener Suchbegriff. Ein klarer, freundlicher Hinweis, für welche Mandantengruppen du gerade Kapazität hast, spart beiden Seiten Zeit. Bist du ausgelastet, nennt die Seite, ab wann du wieder Anfragen annimmst.'
  },
  {
    q: 'Wie werde ich bei „Steuerberater in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil, das zu deiner Website passt, und über eigene Abschnitte für Mandantengruppen, Leistungen und Beratungssprachen mit Bezirk im Text. Einträge in Steuerberater-Suchdiensten mit Link zur Website helfen zusätzlich. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Wie lange dauert es, bis meine Kanzlei-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Leistungsbeschreibungen, Teamfotos und die Pflichtangaben früh vor, geht es schneller.'
  },
  {
    q: 'Kann meine bestehende Kanzlei-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  }
]);

export const STEUERBERATER_PAGE = Object.freeze({
  slug: 'steuerberater',
  path: '/branchen/webdesign-steuerberater',
  breadcrumb: 'Steuerberater',
  trackPrefix: 'steuerberater',
  metaTitle: 'Steuerberater-Website erstellen lassen | Kanzlei Berlin',
  metaDescription: 'Website für Steuerkanzleien in Berlin: Mandantengruppen, freie Kapazitäten, Belegaustausch und Karriereseite, berufsrechtlich sauber. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Steuerberater',
    serviceType: ['Website für Steuerberater', 'Kanzlei-Website', 'Karriereseite für Steuerkanzleien', 'Local SEO für Steuerberater'],
    audienceType: 'Steuerberaterinnen, Steuerberater und Steuerkanzleien'
  },
  hero: {
    chip: 'Webdesign für Steuerberater',
    h1: 'Website für Steuerberater und Kanzleien in Berlin',
    lead: 'Mandanten suchen eine Kanzlei, die zu ihnen passt und überhaupt noch Kapazität hat. Steuerfachangestellte suchen einen Arbeitgeber, bei dem digital gearbeitet wird. Deine Website zeigt beides, sachlich, wie es das Berufsrecht verlangt. Ich plane und baue sie persönlich, mit klaren Mandantengruppen, einer Anfrage, die vorsortiert, und einer Karriereseite.',
    highlights: [
      'Mandantengruppen und freie Kapazitäten klar benannt',
      'Belegaustausch und DATEV-Zugänge an einer Stelle',
      'Impressum und Werbung nach Berufsrecht'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1761231725/admin_gallery/nqsrzdspwv4mnlmvmiej.webp',
    imageAlt: 'Entwurf einer Website für eine Steuerkanzlei auf Laptop und Smartphone',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Kanzleien ihre Website für Mandanten und Bewerber brauchen',
      paragraphs: [
        'Laut Berufsstatistik der Bundessteuerberaterkammer gab es Anfang 2026 bundesweit 89.549 Steuerberaterinnen und Steuerberater, im Durchschnitt 53,7 Jahre alt. Die Zahl der Ausbildungsverhältnisse zur oder zum Steuerfachangestellten sank um 1,3 Prozent auf 17.081. In Berlin zählte die Steuerberaterkammer 4.527 Mitglieder.',
        'Viele Kanzleien sind ausgelastet, und Mandanten wissen das: „Steuerberater Berlin freie Kapazitäten“ ist ein eigener Suchbegriff. Eine Website, die klar sagt, für wen die Kanzlei arbeitet und ob sie neue Mandate annimmt, spart beiden Seiten Zeit. Und sie ist das wichtigste Werkzeug, um Fachkräfte zu gewinnen.'
      ],
      stats: [
        { value: '89.549', label: 'Steuerberaterinnen und Steuerberater in Deutschland am 1. Januar 2026', source: BSTBK_SOURCE },
        { value: '53,7 Jahre', label: 'Durchschnittsalter im Berufsstand', source: BSTBK_SOURCE },
        { value: '17.081', label: 'Ausbildungsverhältnisse zur oder zum Steuerfachangestellten, 1,3 % weniger als im Vorjahr', source: BSTBK_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website einer Steuerkanzlei gehört',
      intro: 'Diese Inhalte suchen Mandanten und Bewerber, bevor sie Kontakt aufnehmen. Zugleich helfen sie Google, deine Kanzlei den richtigen Leistungen und dem Bezirk zuzuordnen.',
      items: [
        { icon: 'fa-users', title: 'Mandantengruppen', text: 'Privatpersonen, Selbstständige, Freiberufler, GmbH oder bestimmte Branchen. Wer sich wiederfindet, fragt eher an.' },
        { icon: 'fa-calendar-check', title: 'Kapazität und Erstgespräch', text: 'Ob du neue Mandate annimmst, für welche Gruppen und wie das Erstgespräch abläuft, vor Ort, per Telefon oder Video.' },
        { icon: 'fa-list-check', title: 'Leistungen', text: 'Steuererklärung, Finanz- und Lohnbuchhaltung, Jahresabschluss, Gründungsberatung und Nachfolge. Sachlich beschrieben, ohne Versprechen.' },
        { icon: 'fa-cloud-upload-alt', title: 'Digitaler Belegaustausch', text: 'Wie Belege zu dir kommen: DATEV Unternehmen online, Mandantenportal oder App. Die Zugänge liegen gut sichtbar im Kopfbereich.' },
        { icon: 'fa-calculator', title: 'Kosten verständlich erklärt', text: 'Wie sich die Vergütung zusammensetzt und wann eine Pauschale vereinbart werden kann. „Steuerberater Kosten“ gehört zu den häufigsten Suchen.' },
        { icon: 'fa-language', title: 'Sprachen', text: 'In welchen Sprachen beraten wird. In Berlin suchen viele gezielt nach einer Kanzlei, in der ihre Sprache gesprochen wird.' },
        { icon: 'fa-people-group', title: 'Team', text: 'Berufsträgerinnen und Berufsträger mit Foto, Qualifikationen wie Fachberater-Titeln und festen Ansprechpartnern je Mandantengruppe.' },
        { icon: 'fa-briefcase', title: 'Karriere', text: 'Stellen für Steuerfachangestellte, Bilanzbuchhalter und Auszubildende, mit echten Einblicken in die Arbeitsweise der Kanzlei.' }
      ]
    },
    {
      type: 'catalog',
      id: 'kanzleiarten',
      chip: 'Kanzleiarten',
      title: 'Websites für Einzelkanzleien, Spezialisten und größere Kanzleien',
      intro: 'Eine Kanzlei für Privatpersonen braucht andere Seiten als eine Kanzlei für Gründer oder Unternehmen. Die Übersicht zeigt, welche Inhalte sich lohnen und wie Mandanten tatsächlich suchen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Kanzlei für Privatpersonen', pages: ['Einkommensteuererklärung und Ablauf', 'Welche Unterlagen gebraucht werden', 'Kosten verständlich erklärt'], searches: ['Steuerberater Berlin Privatpersonen', 'Steuerberater Kosten Steuererklärung'] },
        { name: 'Selbstständige und Gründer', pages: ['Buchhaltung und Umsatzsteuer', 'Gründungsberatung', 'Digitaler Belegaustausch'], searches: ['Steuerberater für Selbstständige Berlin', 'Steuerberater für Selbstständige Kosten'] },
        { name: 'Unternehmen und GmbH', pages: ['Lohnbuchhaltung und Jahresabschluss', 'Feste Ansprechpartner je Mandat', 'Erfahrung in bestimmten Branchen'], searches: ['Steuerberater Berlin Mitte', 'Steuerberater Berlin Charlottenburg'] },
        { name: 'Kanzlei mit Kapazität', pages: ['Für wen gerade Plätze frei sind', 'Ablauf beim Kanzleiwechsel', 'Erstgespräch buchen'], searches: ['Steuerberater Berlin freie Kapazitäten', 'Steuerberater finden Berlin'] },
        { name: 'Mehrsprachige Kanzlei', pages: ['Beratungssprachen auf jeder Seite', 'Mehrsprachige Kontaktseite', 'Hinweise für Zugezogene'], searches: ['Steuerberater in der Nähe türkisch', 'Steuerberater Berlin Wedding'] }
      ]
    },
    {
      type: 'form',
      id: 'mandatsanfrage',
      soft: true,
      chip: 'Anfragen',
      title: 'Mandatsanfrage: vorsortiert statt Rückruf-Pingpong',
      text: 'Viele Anfragen passen nicht zum Profil der Kanzlei oder kommen ohne die Angaben, die für eine Einschätzung nötig sind. Ein kurzes Formular sortiert vor, damit du nur bei passenden Anfragen zurückrufst.',
      formLabel: 'Beispiel: Felder der Mandatsanfrage',
      fields: [
        { label: 'Wer fragt an?', hint: 'Privatperson, selbstständig, Freiberuf oder GmbH' },
        { label: 'Worum geht es?', hint: 'Steuererklärung, Buchhaltung, Lohn, Jahresabschluss oder Gründung' },
        { label: 'Umfang', hint: 'etwa Belege pro Monat oder Zahl der Mitarbeitenden' },
        { label: 'Bisherige Lösung', hint: 'selbst gemacht, andere Kanzlei, DATEV vorhanden' },
        { label: 'Rückruf oder E-Mail', hint: 'wie sich die Kanzlei melden soll' }
      ],
      notes: [
        'Steuerunterlagen gehören nicht in ein Kontaktformular. Für Dokumente verweist die Seite auf das Mandantenportal, das du schon nutzt.',
        'Nimmst du gerade keine neuen Mandate an, sagt die Seite das freundlich und nennt, ab wann wieder Kapazität frei wird.'
      ]
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Werbung und Impressum nach Berufsrecht',
      paragraphs: [
        'Steuerberaterinnen und Steuerberater dürfen werben, nach § 57a Steuerberatungsgesetz aber nur sachlich über die berufliche Tätigkeit und nicht gezielt auf einen Auftrag im Einzelfall. Dazu kommen besondere Pflichtangaben im Impressum und Informationspflichten nach der Dienstleistungs-Informationspflichten-Verordnung.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Impressum nach § 5 DDG mit Steuerberaterkammer Berlin, Berufsbezeichnung, Staat der Verleihung und berufsrechtlichen Regelungen',
        'Angaben zur Berufshaftpflichtversicherung nach § 2 DL-InfoV, mit Versicherer und räumlichem Geltungsbereich',
        'Sachliche Texte ohne Superlative, Erfolgsversprechen oder Vergleiche mit anderen Kanzleien',
        'Fachberater- und andere Titel nur, wenn sie verliehen wurden',
        'Formulare ohne Steuerunterlagen, verschlüsselte Übertragung und passende Datenschutzerklärung'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das die Steuerberaterkammer oder eine Anwältin bzw. ein Anwalt.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Steuerberater Berlin“ gefunden werden',
      paragraphs: [
        'Mandanten suchen mit Bezirk, Zielgruppe oder Sprache: „Steuerberater Berlin Charlottenburg“, „Steuerberater für Selbstständige Berlin“ oder „Steuerberater in der Nähe türkisch“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit deine Kanzlei dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich',
        'Eigene Seiten oder Abschnitte je Mandantengruppe, mit Bezirk im Text',
        'Beratungssprachen im Text und im Google-Profil',
        'Bewertungen beantworten, ohne Mandatsdetails zu nennen',
        'Einträge in Steuerberater-Suchdiensten mit Link zur Website'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für eine Steuerkanzlei?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und wie viele Mandantengruppen und Stellen dargestellt werden. Für Kanzleien passen meist diese Pakete:',
      fits: {
        start: 'Für Einzelkanzleien mit klarem Profil: Onepager oder bis zu drei Seiten mit Leistungen, Mandantengruppen, Team und Kontakt.',
        business: 'Für die meisten Kanzleien: Seiten je Mandantengruppe, Leistungen, Team, Belegaustausch und Karriere, rund vier bis sieben Seiten.',
        wachstum: 'Für größere Kanzleien mit Branchenseiten oder mehreren Standorten oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'DATEV-Zugänge, Mandantenportale und Terminbuchungen binde ich in jedem Paket als Link oder Einbettung ein. Eigene Sonderfunktionen sind Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Mandantengruppen, Leistungen, Personalsuche und welches Paket passt.' },
        { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte zu Leistungen und Team sowie die Pflichtangaben.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, seriös im Auftritt, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht inklusive Impressum und Datenschutz, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen, etwa neue Stellen oder Kapazitätshinweise, oder du pflegst sie selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Steuerberater' }
  ],
  cta: {
    title: 'Lass uns über deine Kanzlei sprechen',
    text: 'Erzähl mir kurz, für welche Mandanten du arbeitest, ob du gerade Kapazität hast und ob du Personal suchst. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'Bundessteuerberaterkammer: Berufsstatistik 2025, Stichtag 1. Januar 2026', href: 'https://www.bstbk.de/downloads/bstbk/ebooks/Berufsstatistik-2025.pdf' },
    { label: '§ 57a Steuerberatungsgesetz: Werbung', href: 'https://www.gesetze-im-internet.de/stberg/__57a.html' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' },
    { label: '§ 2 Dienstleistungs-Informationspflichten-Verordnung', href: 'https://www.gesetze-im-internet.de/dlinfov/__2.html' },
    { label: '§ 4 StBVV (Vergütungsverordnung für Steuerberater): Vereinbarung der Vergütung', href: 'https://www.gesetze-im-internet.de/stbgebv/__4.html' }
  ]
});
