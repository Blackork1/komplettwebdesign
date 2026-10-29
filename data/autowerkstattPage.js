// Inhalte der Seite /branchen/webdesign-autowerkstatt („Website für Kfz-Werkstätten“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/autowerkstatt.md):
// Google-Suchvorschläge von Werkstätten und Autofahrern, Suchergebnisse und der Fahrzeugbestand
// am 1. Januar 2026 laut Kraftfahrt-Bundesamt.

export const AUTOWERKSTATT_CONTENT_UPDATED_ISO = '2026-10-29';

const KBA_SOURCE = 'Kraftfahrt-Bundesamt, März 2026';

export const AUTOWERKSTATT_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für eine Autowerkstatt?',
    a: 'Eine kompakte Werkstatt-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Leistungen, Marken, HU/AU und Reifenservice liegt das Business-Paket bei {{price.business}}, größere Betriebe oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Ein vorhandenes Buchungssystem binde ich in jedem Paket ein.'
  },
  {
    q: 'Sollte ich Preise für Inspektion und Reifenwechsel nennen?',
    a: 'Ja, zumindest ab-Preise. „Inspektion Kosten“ gehört zu den häufigsten Suchen rund um die Werkstatt. Gib Endpreise inklusive Umsatzsteuer an, schreib dazu, was enthalten ist, und achte darauf, dass sie zu deinem Preisaushang in der Werkstatt passen.'
  },
  {
    q: 'Brauche ich eine Online-Terminbuchung?',
    a: 'Nicht unbedingt. Viele Werkstätten planen lieber selbst, weil Teile und Arbeitszeit vom Fahrzeug abhängen. Dann reicht eine Terminanfrage mit Fahrzeugdaten und Rückruf. Nutzt du schon ein Buchungssystem, führt der Termin-Button direkt dorthin.'
  },
  {
    q: 'Wie zeige ich HU- und AU-Termine auf der Website?',
    a: 'Mit einem eigenen Abschnitt: an welchen Tagen die Prüforganisation im Haus ist, ob es ohne Termin geht, was die HU ungefähr kostet und was Kunden mitbringen müssen. „TÜV Berlin ohne Termin“ und „TÜV Berlin Kosten“ werden oft gesucht.'
  },
  {
    q: 'Darf eine freie Werkstatt Automarken auf der Website nennen?',
    a: 'Marken zu nennen, um zu beschreiben, welche Fahrzeuge du betreust, ist üblich. Herstellerlogos und Formulierungen, die nach Vertragswerkstatt klingen, lasse ich weg, wenn du keine bist. Im Zweifel klärst du Einzelfälle mit einer Anwältin oder einem Anwalt.'
  },
  {
    q: 'Kann ich Bewertungen von Google oder Werkstattportalen einbinden?',
    a: 'Ja. Ausgewählte Bewertungen mit Link zur Quelle schaffen Vertrauen. Am wichtigsten ist ein gepflegtes Google-Unternehmensprofil, weil dort die meisten Kunden zuerst lesen. Bewertungen müssen echt sein und dürfen nicht gegen eine Gegenleistung entstanden sein.'
  },
  {
    q: 'Wie werde ich bei „Autowerkstatt in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Öffnungszeiten, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Leistungen, Marken, Bezirk und Anfahrt. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Preise und Öffnungszeiten selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Preise, Zeiten und Aktionen wie den saisonalen Reifenwechsel selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich das.'
  },
  {
    q: 'Wie lange dauert es, bis meine Werkstatt-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Leistungsliste, Preise und Fotos aus der Werkstatt früh vor, geht es schneller.'
  },
  {
    q: 'Kann meine bestehende Werkstatt-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  }
]);

export const AUTOWERKSTATT_PAGE = Object.freeze({
  slug: 'autowerkstatt',
  path: '/branchen/webdesign-autowerkstatt',
  breadcrumb: 'Kfz-Werkstätten',
  trackPrefix: 'autowerkstatt',
  metaTitle: 'Kfz-Werkstatt-Website erstellen lassen | Werkstatt Berlin',
  metaDescription: 'Website für Kfz-Werkstätten in Berlin: Leistungen, Terminanfrage mit Fahrzeugdaten, Richtpreise und Öffnungszeiten klar zeigen. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Kfz-Werkstätten',
    serviceType: ['Website für Autowerkstätten', 'Website für Kfz-Werkstätten', 'Werkstatt-Homepage', 'Local SEO für Werkstätten'],
    audienceType: 'Kfz-Werkstätten, Autowerkstätten und Reifenservices'
  },
  hero: {
    chip: 'Webdesign für Kfz-Werkstätten',
    h1: 'Website für Kfz-Werkstätten und Autowerkstätten in Berlin',
    lead: 'Wer eine Werkstatt sucht, will schnell wissen: Macht ihr das an meinem Auto, was kostet es ungefähr und wann habt ihr einen Termin? Deine Website beantwortet das auf dem Handy in Sekunden, mit Leistungen, Richtpreisen und einer Terminanfrage, die gleich Fahrzeug und Kilometerstand abfragt. Ich plane und baue sie persönlich, passend zu deiner Werkstatt.',
    highlights: [
      'Leistungen und Marken auf einen Blick',
      'Terminanfrage mit Fahrzeugdaten',
      'Richtpreise für Inspektion, HU und Reifen'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1760635023/admin_gallery/c5ebphemzzddcffca4aa.webp',
    imageAlt: 'Weißes Coupé in der Seitenansicht vor hellem Hintergrund',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Werkstätten online Termine gewinnen',
      paragraphs: [
        'Autos werden älter und brauchen öfter die Werkstatt: Laut Kraftfahrt-Bundesamt waren die rund 49,5 Millionen zugelassenen Pkw in Deutschland Anfang 2026 im Schnitt 10,9 Jahre alt. In Berlin sind rund 1,22 Millionen Pkw zugelassen. Wartung, Verschleiß und HU fallen regelmäßig an, und die Suche nach einer Werkstatt beginnt fast immer am Handy.',
        'Gesucht wird konkret: „Autowerkstatt in der Nähe Samstag geöffnet“, „Werkstatt Termin online buchen Berlin“, „Inspektion Kosten“ oder „TÜV Berlin ohne Termin“. Wer diese Fragen auf der eigenen Website beantwortet, bekommt den Termin. Dort zeigst du auch, was dich von Ketten und Portalen unterscheidet: Meisterbetrieb, feste Ansprechpartner, ehrliche Preise.'
      ],
      stats: [
        { value: '10,9 Jahre', label: 'Durchschnittsalter der Pkw in Deutschland am 1. Januar 2026', source: KBA_SOURCE },
        { value: '49,5 Mio.', label: 'zugelassene Pkw in Deutschland', source: KBA_SOURCE },
        { value: '1,22 Mio.', label: 'zugelassene Pkw in Berlin', source: KBA_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website einer Kfz-Werkstatt gehört',
      intro: 'Diese Inhalte suchen Autofahrerinnen und Autofahrer, bevor sie anrufen. Zugleich helfen sie Google, deine Werkstatt den richtigen Leistungen und dem Bezirk zuzuordnen.',
      items: [
        { icon: 'fa-wrench', title: 'Leistungen', text: 'Inspektion, Ölwechsel, Bremsen, Klimaservice, Diagnose und Unfallinstandsetzung, jeweils mit kurzer Erklärung statt nur einer Liste.' },
        { icon: 'fa-gauge-high', title: 'Marken und Antriebe', text: 'Welche Marken du betreust und ob du Hybrid- und Elektroautos wartest. „Autowerkstatt in der Nähe VW“ ist eine typische Suche.' },
        { icon: 'fa-calendar-check', title: 'Terminanfrage', text: 'Wunschtermin mit Fahrzeugdaten und Anliegen, auf dem Handy mit wenigen Tipps. Oder der Link zu deinem Buchungssystem.' },
        { icon: 'fa-euro-sign', title: 'Richtpreise', text: 'Ab-Preise für Inspektion, HU/AU, Reifenwechsel oder Klimaservice. „Inspektion Kosten“ wird ständig gesucht.' },
        { icon: 'fa-clipboard-check', title: 'HU und AU', text: 'An welchen Tagen die Prüforganisation im Haus ist und ob es ohne Termin geht. Danach wird in Berlin oft gesucht.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten', text: 'Werkstattzeiten, Samstagstermine und Annahmezeiten. Viele suchen „jetzt geöffnet“, die Angaben müssen also stimmen.' },
        { icon: 'fa-truck', title: 'Hol- und Bringservice', text: 'Ob du Autos abholst, einen Ersatzwagen anbietest und wie die Schlüsselübergabe außerhalb der Öffnungszeiten funktioniert.' },
        { icon: 'fa-star', title: 'Bewertungen', text: 'Ausgewählte Google-Bewertungen und ein gepflegtes Unternehmensprofil. Bei Werkstätten entscheidet Vertrauen.' }
      ]
    },
    {
      type: 'catalog',
      id: 'betriebsarten',
      chip: 'Betriebsarten',
      title: 'Websites für freie Werkstätten, Spezialisten und Servicebetriebe',
      intro: 'Eine freie Werkstatt braucht andere Seiten als ein Reifenservice oder ein Karosseriebetrieb. Die Übersicht zeigt, welche Inhalte sich lohnen und wie in Berlin tatsächlich gesucht wird.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Freie Kfz-Werkstatt', pages: ['Leistungen mit Richtpreisen', 'Marken und Fahrzeugtypen', 'Terminanfrage mit Fahrzeugdaten'], searches: ['Kfz Werkstatt Berlin Neukölln', 'Autowerkstatt in der Nähe top-Bewertung'] },
        { name: 'Markenspezialist', pages: ['Wartung nach Herstellervorgaben', 'Diagnose und Software-Updates', 'Ersatzteile und Garantiefragen'], searches: ['Autowerkstatt in der Nähe VW', 'VW Werkstatt Termin online'] },
        { name: 'Reifen und Schnellservice', pages: ['Reifenwechsel und Einlagerung', 'Saisonale Termine', 'Preise je Felgengröße'], searches: ['Werkstatt Termin online buchen', 'Autowerkstatt in der Nähe ohne Termin'] },
        { name: 'Karosserie, Lack und Unfall', pages: ['Ablauf nach einem Unfall', 'Abwicklung mit der Versicherung', 'Fotos von reparierten Schäden'], searches: ['Kfz Werkstatt Berlin Spandau', 'Autowerkstatt in der Nähe Samstag geöffnet'] },
        { name: 'Hybrid und Elektro', pages: ['Hochvolt-Qualifikation des Teams', 'Inspektion für E-Autos', 'Batterie- und Klimacheck'], searches: ['Inspektion Kosten E-Auto', 'Kfz Werkstatt Berlin Pankow'] }
      ],
      related: {
        title: 'Handwerksbetrieb?',
        text: 'Für Handwerksbetriebe gibt es eine eigene Seite:',
        links: [{ label: 'Website für Handwerker', href: '/handwerker' }]
      }
    },
    {
      type: 'form',
      id: 'termin',
      soft: true,
      chip: 'Anfragen',
      title: 'Terminanfrage mit Fahrzeugdaten statt Rückfragen',
      text: 'Am Telefon fehlt oft die Hälfte: Modell, Baujahr, Kilometerstand. Ein kurzes Formular fragt genau das ab, damit du Teile vorab prüfen und den Termin realistisch planen kannst.',
      formLabel: 'Beispiel: Felder der Werkstatt-Anfrage',
      fields: [
        { label: 'Fahrzeug', hint: 'Marke, Modell und Baujahr' },
        { label: 'Kilometerstand', hint: 'ungefähr genügt' },
        { label: 'Anliegen', hint: 'Inspektion, HU/AU, Reifen, Reparatur oder Diagnose' },
        { label: 'Wunschtermin', hint: 'Tag, dazu Bring- oder Holservice' },
        { label: 'Fotos', hint: 'bei Schäden oder Warnleuchten, freiwillig' }
      ],
      notes: [
        'Für eine erste Einschätzung bei Unfallschäden helfen Fotos. Die Website nimmt sie direkt mit der Anfrage an, Kunden müssen sie nicht per Messenger schicken.',
        'Nutzt du schon ein Werkstatt-Buchungssystem, führt der Termin-Button direkt dorthin.'
      ]
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Preise und Recht',
      title: 'Preise und Pflichtangaben richtig darstellen',
      paragraphs: [
        'Wer Verbrauchern Leistungen anbietet, braucht nach § 12 Preisangabenverordnung ein Preisverzeichnis für die wesentlichen Leistungen, gut sichtbar in der Werkstatt. Richtpreise auf der Website sind freiwillig, sollten aber zum Aushang passen und die Umsatzsteuer enthalten. Dazu kommen die Pflichtangaben im Impressum.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Richtpreise als Endpreise inklusive Umsatzsteuer, mit Hinweis, was enthalten ist',
        'Stundenverrechnungssätze, wenn du sie nennst, genau wie im Aushang',
        'Impressum nach § 5 DDG, bei Handwerksbetrieben mit Handwerkskammer und Berufsbezeichnung',
        'Bewertungen nur echt und ohne Gegenleistung',
        'Datenschutzerklärung, die zu Formular und Terminsystem passt'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das deine Handwerkskammer oder eine Anwältin bzw. ein Anwalt.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Autowerkstatt in der Nähe“ gefunden werden',
      paragraphs: [
        'Gesucht wird fast immer mit Ort, Zeit oder Marke: „Kfz Werkstatt Berlin Lichtenberg“, „Autowerkstatt in der Nähe jetzt geöffnet“ oder „Autowerkstatt in der Nähe VW“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit deine Werkstatt dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich, auch an Feiertagen',
        'Eigene Abschnitte für Leistungen und Marken, mit Bezirk im Text',
        'Fotos von Werkstatt, Team und Annahme im Google-Profil',
        'Bewertungen aktiv anfragen und sachlich beantworten',
        'Schnelle Ladezeit auf dem Handy, denn gesucht wird unterwegs'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für eine Autowerkstatt?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob Termine online gebucht werden. Für Werkstätten passen meist diese Pakete:',
      fits: {
        start: 'Für kleine Werkstätten: Onepager oder bis zu drei Seiten mit Leistungen, Öffnungszeiten, Richtpreisen und Terminanfrage.',
        business: 'Für die meisten Werkstätten: Seiten für Leistungen, Marken, HU/AU, Reifenservice und Team, rund vier bis sieben Seiten.',
        wachstum: 'Für Betriebe mit Karosserie, Lack oder mehreren Standorten oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Vorhandene Werkstatt-Buchungssysteme binde ich in jedem Paket ein. Eine eigene Online-Buchung mit Terminverwaltung ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Leistungen, Marken, Terminweg und welches Paket passt.' },
        { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Leistungsliste, Richtpreise und Fotos aus der Werkstatt, gern vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen, etwa Saisonpreise für Reifen, oder du pflegst sie selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Kfz-Werkstätten' }
  ],
  cta: {
    title: 'Lass uns über deine Werkstatt sprechen',
    text: 'Erzähl mir kurz, welche Leistungen und Marken du anbietest und wie Kunden heute Termine machen. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website für Handwerker', href: '/handwerker' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' }
  ],
  sources: [
    { label: 'Kraftfahrt-Bundesamt: Der Fahrzeugbestand am 1. Januar 2026, Pressemitteilung 09/2026', href: 'https://www.kba.de/DE/Presse/Pressemitteilungen/Fahrzeugbestand/2026/pm09_fz_bestand_pm_komplett.html' },
    { label: '§ 12 Preisangabenverordnung: Preisangaben bei Leistungen', href: 'https://www.gesetze-im-internet.de/pangv_2022/__12.html' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' }
  ]
});
