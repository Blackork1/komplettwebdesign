// Inhalte der Seite /branchen/webdesign-reinigung („Website für Reinigungsfirmen und Gebäudeservice“).
// Grundlage: Search-Console-Daten Juni bis Oktober 2026 (u. a. „webdesign gebäudeservice“,
// „website reinigungsunternehmen“), das Referenzprojekt TM Sauber & Mehr und die
// BIV-Konjunkturumfrage vom April 2026. Preise kommen als Platzhalter und werden beim Rendern ersetzt.

export const REINIGUNG_CONTENT_UPDATED_ISO = '2026-10-25';

const BIV_SOURCE = 'BIV-Konjunkturumfrage, Frühjahr 2026';

export const REINIGUNG_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für eine Reinigungsfirma?',
    a: 'Eine kompakte Website für einen Reinigungsbetrieb startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten je Reinigungsart, Team und Referenzen liegt das Business-Paket bei {{price.business}}, größere Websites oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Hosting, Domain und Wartung kommen bei Bedarf separat dazu.'
  },
  {
    q: 'Wie gewinne ich über die Website Gewerbekunden?',
    a: 'Gewerbekunden und Hausverwaltungen vergleichen mehrere Anbieter, bevor sie anfragen. Überzeugend sind eigene Seiten je Leistung und Objektart, Nachweise wie Versicherung und Zertifikate, feste Ansprechpartner mit Foto und eine Angebotsanfrage, die Fläche, Turnus und Ort abfragt. Dazu kommen Referenzen, auf Wunsch anonymisiert.'
  },
  {
    q: 'Brauche ich einen Preisrechner auf der Website?',
    a: 'Meist nicht. Ein Rechner liefert nur Richtwerte, weil Aufwand und Anforderungen je Objekt stark schwanken. Ehrlicher ist ein kurzer Ablauf: Anfrage per Formular oder Telefon, Besichtigung, individuelles Angebot. Für Privatkunden können Preisrahmen sinnvoll sein. Ein echter Rechner ist als Zusatzleistung möglich.'
  },
  {
    q: 'Was muss auf die Website einer Reinigungsfirma?',
    a: 'Leistungen nach Reinigungsart, die Objekte, die du betreust, dein Einsatzgebiet, Nachweise wie Haftpflichtversicherung, Meisterbrief oder Innungsmitgliedschaft, Ansprechpartner mit Foto, Referenzen, eine Angebotsanfrage sowie Impressum und Datenschutzerklärung. Eine Karriereseite lohnt sich, wenn du Personal suchst.'
  },
  {
    q: 'Reicht ein Google-Unternehmensprofil nicht aus?',
    a: 'Das Profil ist wichtig für die Kartensuche, ersetzt die Website aber nicht. Dort fehlt Platz für Leistungsseiten, Nachweise, Stellenangebote und eine Angebotsanfrage mit den richtigen Feldern. Am besten arbeiten beide zusammen und verweisen aufeinander.'
  },
  {
    q: 'Erstellst du auch Websites für Gebäudeservice und Hausmeisterdienste?',
    a: 'Ja. Gebäudeservice-Firmen bieten oft mehrere Leistungen aus einer Hand: Reinigung, Hausmeisterdienst, Grünpflege und Winterdienst. Die Website zeigt jede Leistung auf einer eigenen Seite und macht klar, dass Auftraggeber alles bei einem festen Ansprechpartner bekommen.'
  },
  {
    q: 'Darf ich Fotos aus Kundenobjekten zeigen?',
    a: 'Nur wenn der Auftraggeber zustimmt. Personen, die auf Fotos erkennbar sind, brauchen ebenfalls ihr Einverständnis. Gut funktionieren Bilder deiner Teams bei der Arbeit, Vorher-Nachher-Aufnahmen ohne erkennbare Details und Fotos von Ausstattung und Fahrzeugen.'
  },
  {
    q: 'Kann die Website mehrsprachig sein?',
    a: 'Ja, als Zusatzleistung. Das lohnt sich vor allem für die Karriereseite, wenn du Mitarbeitende mit anderen Muttersprachen ansprechen willst, oder wenn du internationale Firmenkunden betreust.'
  },
  {
    q: 'Wie werde ich als Reinigungsfirma bei Google gefunden?',
    a: 'Mit einer eigenen Seite je Leistung, die Reinigungsart und Einsatzgebiet klar nennt, einem gepflegten Google-Unternehmensprofil, einheitlichen Kontaktdaten und echten Bewertungen. Feste Platzierungen kann niemand seriös garantieren, aber eine saubere Grundlage verbessert deine Chancen.'
  },
  {
    q: 'Muss ich Texte und Fotos selbst liefern?',
    a: 'Du lieferst das Fachwissen in Stichpunkten oder im Gespräch, ich forme daraus verständliche Texte im Rahmen des Pakets. Umfangreiche Texterstellung ist eine Zusatzleistung. Für Fotos reichen oft gute Handyaufnahmen deiner Teams und Arbeiten.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Den Ausschlag geben die Inhalte: Liegen Fotos und Informationen früh vor, geht es schneller.'
  },
  {
    q: 'Kann meine bestehende Website überarbeitet werden?',
    a: 'Ja. So war es auch bei TM Sauber & Mehr. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  }
]);

export const REINIGUNG_PAGE = Object.freeze({
  slug: 'reinigung',
  path: '/branchen/webdesign-reinigung',
  breadcrumb: 'Reinigungsfirmen',
  trackPrefix: 'reinigung',
  metaTitle: 'Webdesign für Reinigungsfirmen & Gebäudeservice in Berlin',
  metaDescription: 'Website für Gebäudereinigung und Gebäudeservice in Berlin: Leistungen, Einsatzgebiet und Angebotsanfrage klar zeigen. Mit Praxisbeispiel, {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Reinigungsfirmen',
    serviceType: ['Website für Reinigungsfirmen', 'Webdesign für Gebäudereinigung', 'Webdesign für Gebäudeservice', 'Local SEO für Reinigungsunternehmen'],
    audienceType: 'Reinigungsunternehmen und Gebäudedienstleister'
  },
  hero: {
    chip: 'Webdesign für Gebäudereinigung',
    h1: 'Website für Reinigungsfirmen und Gebäudeservice in Berlin',
    lead: 'Deine Website zeigt Hausverwaltungen, Büros und Privatkunden in wenigen Sekunden, welche Reinigung du übernimmst, für welche Objekte und in welchen Bezirken. Ich plane und baue sie persönlich: mit klaren Leistungsseiten, Nachweisen, die Vertrauen schaffen, und einer Angebotsanfrage, die gleich die wichtigsten Angaben abfragt.',
    highlights: [
      'Leistungen nach Reinigungsart und Objekt',
      'Angebotsanfrage mit Fläche, Turnus und Bezirk',
      'Nachweise, Team und Bewertungen, die Vertrauen schaffen'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1769938589/admin_gallery/dtaagkdge9twn0pdgrhk.webp',
    imageAlt: 'Gebäudereiniger reinigen an Seilen die Glasfassade eines Bürogebäudes',
    imageSize: [1080, 608]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Reinigungsfirmen jetzt online überzeugen müssen',
      paragraphs: [
        'Die Branche spürt die schwache Wirtschaft: In der Frühjahrsumfrage 2026 des Bundesinnungsverbands des Gebäudereiniger-Handwerks meldeten 49 Prozent der Betriebe weniger Kunden oder Aufträge, 65 Prozent berichten, dass Kunden ihre Leistungen reduzieren. Neue Auftraggeber gewinnt, wer schon vor der ersten Anfrage überzeugt.',
        'Gewerbekunden vergleichen mehrere Anbieter, Hausverwaltungen prüfen Leistungsumfang und Zuverlässigkeit, Privatkunden achten auf Vertrauen. Eine Website, die Leistungen, Einsatzgebiet und Nachweise klar zeigt, nimmt diese Prüfung vorweg und bringt Anfragen, die zu deinem Betrieb passen.'
      ],
      stats: [
        { value: '49 %', label: 'der Reinigungsbetriebe verzeichnen weniger Kunden oder Aufträge', source: BIV_SOURCE },
        { value: '65 %', label: 'berichten, dass Kunden Leistungen reduzieren', source: BIV_SOURCE },
        { value: '74 %', label: 'der Betriebe suchen Mitarbeitende', source: BIV_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website einer Reinigungsfirma gehört',
      intro: 'Diese Inhalte erwarten Auftraggeber von einem Reinigungsunternehmen, bevor sie ein Angebot anfragen. Zugleich helfen sie Google zu verstehen, welche Reinigung du wo anbietest.',
      items: [
        { icon: 'fa-broom', title: 'Leistungen nach Reinigungsart', text: 'Unterhaltsreinigung, Glasreinigung, Grundreinigung oder Hausmeisterservice: Jede wichtige Leistung bekommt eine eigene Seite mit Ablauf, Intervallen und passenden Objekten.' },
        { icon: 'fa-building', title: 'Objekte, die du betreust', text: 'Büros, Praxen, Treppenhäuser, Gewerbeflächen oder Privathaushalte. Wer sein Objekt wiederfindet, fühlt sich angesprochen.' },
        { icon: 'fa-map-location-dot', title: 'Einsatzgebiet', text: 'Nenne die Bezirke und Orte, in denen deine Teams arbeiten, zum Beispiel Mitte, Charlottenburg und das Umland. Das spart Anfragen, die nicht passen.' },
        { icon: 'fa-file-signature', title: 'Angebotsanfrage', text: 'Ein Formular, das Objektart, Fläche, Turnus und Ort abfragt, und ein klarer Ablauf: Anfrage, Besichtigung, Angebot.' },
        { icon: 'fa-shield-halved', title: 'Nachweise statt Floskeln', text: 'Haftpflichtversicherung, Meisterbrief oder Innungsmitgliedschaft, Zertifikate und geschultes Personal. Das überzeugt mehr als „gründlich und zuverlässig“.' },
        { icon: 'fa-people-group', title: 'Feste Ansprechpartner', text: 'Objektleitung und Team mit Foto und Namen. Wer dir Schlüssel und Räume anvertraut, möchte wissen, wer kommt.' },
        { icon: 'fa-star', title: 'Referenzen und Bewertungen', text: 'Kundenstimmen, Google-Bewertungen und Beispiele betreuter Objekte, auf Wunsch anonymisiert.' },
        { icon: 'fa-user-plus', title: 'Karriere', text: 'Offene Stellen mit Einsatzort und Arbeitszeiten und ein kurzer Bewerbungsweg per Telefon, WhatsApp oder Formular.' }
      ]
    },
    {
      type: 'catalog',
      id: 'leistungen',
      chip: 'Leistungen',
      title: 'Leistungsseiten nach Reinigungsart und wie danach gesucht wird',
      intro: 'Auftraggeber suchen nach ihrer Aufgabe und ihrem Ort, selten nach „Reinigungsfirma“. Die Übersicht zeigt, welche Inhalte je Leistung wichtig sind und wie typische Suchen in Berlin aussehen. Welche Seiten du brauchst, planen wir passend zu deinem Angebot.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Unterhalts- und Büroreinigung', pages: ['Leistungsverzeichnis und Intervalle', 'Reinigung außerhalb der Bürozeiten', 'Feste Teams und Schlüsselübergabe'], searches: ['Büroreinigung Berlin', 'Unterhaltsreinigung Mitte'] },
        { name: 'Glas- und Fensterreinigung', pages: ['Fenster, Rahmen und Wintergärten', 'Glasfassaden und Schaufenster', 'Arbeiten in der Höhe'], searches: ['Fensterreinigung Berlin', 'Glasreinigung Firma Pankow'] },
        { name: 'Treppenhaus- und Hausreinigung', pages: ['Leistungen für Hausverwaltungen', 'Reinigungsplan und Dokumentation', 'Mülltonnen- und Kellerservice'], searches: ['Treppenhausreinigung Berlin', 'Hausreinigung für Hausverwaltung'] },
        { name: 'Praxisreinigung', pages: ['Reinigung nach Hygieneplan', 'Desinfektion von Kontaktflächen', 'Feste Zeitfenster außerhalb der Sprechzeiten'], searches: ['Praxisreinigung Berlin', 'Reinigung Arztpraxis Charlottenburg'] },
        { name: 'Bauendreinigung', pages: ['Baugrob- und Bauendreinigung', 'Übergabe an Bauherren und Mieter', 'Kurzfristige Termine'], searches: ['Bauendreinigung Berlin', 'Baureinigung Firma'] },
        { name: 'Grund- und Sonderreinigung', pages: ['Teppich- und Polsterreinigung', 'Bodenpflege und Beschichtung', 'Reinigung nach Wasserschaden'], searches: ['Grundreinigung Büro Berlin', 'Teppichreinigung Firma Berlin'] },
        { name: 'Gebäudeservice und Hausmeisterdienst', pages: ['Hausmeisterservice', 'Grünpflege und Außenanlagen', 'Winterdienst'], searches: ['Gebäudeservice Berlin', 'Hausmeisterservice Lichtenberg'] },
        { name: 'Reinigung für Privathaushalte', pages: ['Wohnungs- und Haushaltsreinigung', 'Umzugs- und Endreinigung', 'Hinweis zur Steuerermäßigung'], searches: ['Haushaltsreinigung Berlin', 'Endreinigung Wohnung Berlin'] }
      ],
      related: {
        title: 'Andere Gewerke',
        text: 'Gebäudereinigung gehört zum Handwerk. Für Betriebe aus anderen Gewerken gibt es eine eigene Seite:',
        links: [{ label: 'Website für Handwerker', href: '/handwerker' }]
      }
    },
    {
      type: 'columns',
      id: 'zielgruppen',
      soft: true,
      chip: 'Zielgruppen',
      title: 'Gewerbekunden, Hausverwaltungen und Privatkunden richtig ansprechen',
      intro: 'Wer eine Reinigungsfirma sucht, hat je nach Objekt ganz andere Fragen. Eine gute Website beantwortet sie getrennt, statt alle mit demselben Text anzusprechen.',
      items: [
        { title: 'Büros und Gewerbe', points: ['Reinigung außerhalb der Arbeitszeiten', 'Feste Teams und ein Ansprechpartner', 'Leistungsverzeichnis und Qualitätskontrolle', 'Angebot nach Besichtigung'] },
        { title: 'Hausverwaltungen', points: ['Mehrere Objekte aus einer Hand', 'Reinigungspläne und Nachweise', 'Schnelle Reaktion bei Schäden oder Beschwerden', 'Abrechnung nach Objekt'] },
        { title: 'Privathaushalte', points: ['Gesichter, Versicherung und Bewertungen', 'Feste Reinigungskraft und feste Termine', 'Nachvollziehbare Preise oder Preisrahmen', 'Hinweis zur Steuerermäßigung'] }
      ],
      note: 'Privatkunden können 20 Prozent der Arbeitskosten für haushaltsnahe Dienstleistungen von der Steuer abziehen, höchstens 4.000 Euro im Jahr (§ 35a EStG). Ein kurzer Hinweis darauf hilft bei der Entscheidung.'
    },
    {
      type: 'form',
      id: 'anfrage',
      chip: 'Anfragen',
      title: 'Die Angebotsanfrage: alle Angaben für ein passendes Angebot',
      text: 'Ein Reinigungsangebot hängt von Objekt, Fläche und Turnus ab. Fragt das Formular genau das ab, kannst du schon beim ersten Rückruf einschätzen, ob der Auftrag passt, und die Besichtigung gezielt vorbereiten.',
      formLabel: 'Beispiel: Felder der Angebotsanfrage',
      fields: [
        { label: 'Um welches Objekt geht es?', hint: 'Büro, Praxis, Treppenhaus, Haushalt' },
        { label: 'Welche Leistung wird gebraucht?', hint: 'Auswahl deiner Leistungen' },
        { label: 'Wie groß ist die Fläche?', hint: 'ungefähre Quadratmeter oder Anzahl Räume' },
        { label: 'Wie oft?', hint: 'täglich, wöchentlich oder einmalig' },
        { label: 'Wo liegt das Objekt?', hint: 'Bezirk oder Postleitzahl' },
        { label: 'Besichtigung oder Rückruf', hint: 'mit Wunschzeitraum' }
      ],
      notes: [
        'Ein Online-Preisrechner liefert nur Richtwerte. Für Gewerbeobjekte ist eine Anfrage mit anschließender Besichtigung meist ehrlicher und bringt passendere Aufträge.',
        'Telefon und WhatsApp bleiben auf dem Handy sichtbar, für alle, die lieber kurz anrufen.'
      ]
    },
    {
      type: 'case',
      id: 'praxisbeispiel',
      soft: true,
      chip: 'Praxisbeispiel',
      title: 'Praxisbeispiel: Relaunch für TM Sauber & Mehr',
      text: 'TM Sauber & Mehr ist ein Reinigungsbetrieb aus Berlin. Die alte Website zeigte das Angebot, aber Struktur, Leistungen und Vertrauen kamen nicht klar genug rüber, um neue Anfragen zu gewinnen.',
      doneTitle: 'Was ich umgesetzt habe',
      done: [
        'Startseite und Leistungsseite neu aufgebaut, damit Besucher schneller sehen, welche Reinigung angeboten wird',
        'Den Weg zum Angebot in drei Schritten erklärt: Anruf oder Formular, kostenlose Besichtigung, individuelles Angebot',
        'Anruf und WhatsApp direkt im ersten Bildschirm erreichbar gemacht',
        'Eine neue Team-Seite ergänzt, damit persönliche Ansprechpartner sichtbar werden'
      ],
      resultTitle: 'Ergebnis',
      result: [
        'Interessenten können Leistungen und Kontaktwege schneller einordnen',
        'Der Betrieb wirkt online persönlicher und professioneller'
      ],
      quote: 'Super Service und top Preis-Leistung. Alle unsere Wünsche wurden schnell, professionell und unkompliziert umgesetzt.',
      quoteAuthor: 'TM Sauber & Mehr',
      image: {
        src: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179327/admin_gallery/kdzgzbanbnaz0zqu6fqv.webp',
        alt: 'Neue Leistungsseite von TM Sauber & Mehr mit Reinigungsleistungen und dem Weg zum Angebot in drei Schritten',
        width: 1080,
        height: 921
      },
      link: { href: '/referenzen/tm-sauber-mehr', label: 'Ganzes Projekt mit Vorher-Nachher ansehen' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'In deinem Bezirk bei Google gefunden werden',
      paragraphs: [
        'Wer „Büroreinigung Mitte“ oder „Fensterreinigung Pankow“ sucht, sieht oft zuerst die Karte mit Google-Unternehmensprofilen und darunter die Websites. Beides muss zusammenpassen, damit Google deinen Betrieb dem richtigen Ort und der richtigen Leistung zuordnet.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Eine Seite pro wichtiger Leistung, mit deinem Einsatzgebiet im Text',
        'Gleiche Angaben zu Name, Adresse und Telefon auf Website, Google-Profil und in Verzeichnissen',
        'Passende Kategorien im Google-Profil für deine Hauptleistungen',
        'Bewertungen nach abgeschlossenen Aufträgen aktiv anfragen',
        'Keine kopierten Seiten für jeden Bezirk: Google wertet fast gleiche Seiten als dünnen Inhalt'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine klare Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'checklist',
      id: 'karriere',
      soft: true,
      chip: 'Personal',
      title: 'Mitarbeitende über die Website finden',
      paragraphs: [
        'Laut BIV-Umfrage 2026 suchen 74 Prozent der Reinigungsbetriebe Mitarbeitende. Als Gründe nennt der Verband die hohe Fluktuation und die wachsende demografische Lücke. Eine Karriereseite ist der Ort, auf den Stellenanzeigen, Aushänge und Social-Media-Beiträge verlinken.'
      ],
      cardTitle: 'Das gehört auf die Karriereseite',
      items: [
        'Offene Stellen mit Einsatzort, Arbeitszeiten und Stundenumfang',
        'Was du bietest, zum Beispiel feste Touren, Arbeitskleidung und Einarbeitung',
        'Bewerbung ohne Lebenslauf: kurzer Anruf, WhatsApp oder ein Formular mit wenigen Feldern',
        'Bei Bedarf Texte in weiteren Sprachen'
      ]
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für Reinigungsfirmen?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Leistungen und Seiten du brauchst. Für Reinigungsbetriebe passen meist diese Pakete:',
      fits: {
        start: 'Für kleine Betriebe mit wenigen Leistungen: Onepager oder bis zu drei Seiten mit Leistungen, Einsatzgebiet und Angebotsanfrage.',
        business: 'Für die meisten Reinigungsfirmen: eigene Seiten je Reinigungsart, Referenzen, Team und Angebotsanfrage, rund vier bis sieben Seiten.',
        wachstum: 'Für mehrere Zielgruppen, einen Karrierebereich oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Hosting, Domain, E-Mail und Wartung sind optional und werden separat vereinbart. Ein Bearbeitungssystem (CMS), einen Preisrechner oder Mehrsprachigkeit plane ich als Zusatzleistung.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Leistungen, Objekte, Einsatzgebiet und welches Paket passt.' },
        { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte und Fotos, gern direkt vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung, Änderungen und neue Stellenanzeigen.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Reinigungsfirmen' }
  ],
  cta: {
    title: 'Lass uns über deinen Reinigungsbetrieb sprechen',
    text: 'Erzähl mir kurz, welche Reinigung du anbietest, für welche Objekte und wo deine Teams unterwegs sind. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'Bundesinnungsverband des Gebäudereiniger-Handwerks: Frühjahrs-Konjunkturumfrage, 14.04.2026 (250 Betriebe)', href: 'https://www.die-gebaeudedienstleister.de/wp-content/uploads/2026/04/260414_Deutschlands-personalintensivstes-Handwerk-im-Stimmungstief-1.pdf' },
    { label: '§ 35a EStG: Steuerermäßigung für haushaltsnahe Dienstleistungen', href: 'https://www.gesetze-im-internet.de/estg/__35a.html' }
  ]
});
