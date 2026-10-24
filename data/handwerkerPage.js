// Inhalte der Seite /handwerker („Website für Handwerker in Berlin“).
// Grundlage: Recherche echter Suchanfragen (Google-Autovervollständigung) und der Top-Ergebnisse
// vom 24.10.2026, siehe komplettwebdesign.de-audit/handwerker-content-brief.md.
// Preise kommen als Platzhalter ({{price.start}} usw.) und werden beim Rendern ersetzt.

export const HANDWERKER_CONTENT_UPDATED_ISO = '2026-10-24';

export const HANDWERKER_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für Handwerker?',
    a: 'Bei Komplett Webdesign startet eine kompakte Handwerker-Website {{price.start}}. Mit eigenen Leistungsseiten und Referenzen liegt das Business-Paket bei {{price.business}}, umfangreichere Websites oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Hosting, Domain und Wartung kommen bei Bedarf separat dazu.'
  },
  {
    q: 'Brauche ich eine Website, wenn meine Aufträge über Empfehlungen kommen?',
    a: 'Ja, denn Empfehlungen werden fast immer online geprüft. Wer deinen Namen von Nachbarn oder Kollegen hört, sucht dich bei Google und schaut sich Leistungen, Bilder und Bewertungen an. Überzeugt die Website nicht, ruft er eher beim nächsten Betrieb an.'
  },
  {
    q: 'Reicht ein Google-Unternehmensprofil nicht aus?',
    a: 'Das Profil ist wichtig für die Kartensuche, ersetzt die Website aber nicht. Dort fehlt Platz für Leistungsseiten, Projektberichte, Stellenangebote und ein Anfrageformular. Am besten arbeiten beide zusammen und verweisen aufeinander.'
  },
  {
    q: 'Was muss auf eine Handwerker-Website?',
    a: 'Leistungen mit eigenen Seiten, dein Einsatzgebiet, echte Projektbilder, Kontakt per Telefon, WhatsApp und Formular, Vertrauenssignale wie Meisterbrief und Bewertungen sowie Impressum und Datenschutzerklärung. Eine Karriereseite lohnt sich, wenn du Personal oder Azubis suchst.'
  },
  {
    q: 'Muss ich Texte und Fotos selbst liefern?',
    a: 'Du lieferst das Fachwissen in Stichpunkten oder im Gespräch, ich forme daraus verständliche Texte im Rahmen des Pakets. Umfangreiche Texterstellung ist eine Zusatzleistung. Für Fotos reichen oft gute Handyaufnahmen deiner Arbeiten. Ich wähle sie aus und binde sie optimiert ein.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Den Ausschlag geben die Inhalte: Liegen Fotos und Informationen früh vor, geht es schneller.'
  },
  {
    q: 'Wie werde ich in meinem Bezirk bei Google gefunden?',
    a: 'Mit Leistungsseiten, die Gewerk und Einsatzgebiet klar nennen, einem gepflegten Google-Unternehmensprofil, einheitlichen Kontaktdaten und echten Bewertungen. Feste Platzierungen kann niemand seriös garantieren, aber eine saubere Grundlage verbessert deine Chancen.'
  },
  {
    q: 'Kann ich später selbst neue Projekte und Bilder einstellen?',
    a: 'In den Standardpaketen ist kein Bearbeitungssystem enthalten. Wenn du regelmäßig selbst Referenzen oder Stellen einstellen willst, plane ich ein einfaches CMS als Zusatzleistung. Alternativ übernehme ich Änderungen im Rahmen einer Wartung.'
  },
  {
    q: 'Kann meine bestehende Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  },
  {
    q: 'Für welche Gewerke erstellst du Websites?',
    a: 'Für Handwerksbetriebe aller Gewerke, zum Beispiel Elektriker, Sanitär- und Heizungsbauer, Maler, Dachdecker, Tischler, Fliesenleger, Garten- und Landschaftsbauer, Bau- und Sanierungsbetriebe sowie Metallbauer. Die Seitenstruktur richtet sich nach deinen Leistungen.'
  },
  {
    q: 'Gibt es eine Förderung für die Website?',
    a: 'Förderprogramme ändern sich häufig. Ob es aktuell eine passende Förderung für deinen Betrieb gibt, erfährst du bei der Investitionsbank Berlin oder der Handwerkskammer Berlin. Für einen Antrag stelle ich dir gern ein nachvollziehbares Angebot aus.'
  }
]);

export const HANDWERKER_PAGE = Object.freeze({
  metaTitle: 'Website für Handwerker in Berlin erstellen lassen | {{price.start}}',
  metaDescription: 'Webdesign für Handwerksbetriebe in Berlin: Leistungen, Einsatzgebiet, Projektbilder und Anfragewege klar zeigen. Pakete {{price.start}}. Jetzt anfragen.',
  hero: {
    chip: 'Webdesign für Handwerksbetriebe',
    h1: 'Website für Handwerker in Berlin erstellen lassen',
    lead: 'Deine Website für den Handwerksbetrieb zeigt in wenigen Sekunden, welche Arbeiten du übernimmst, in welchen Berliner Bezirken du unterwegs bist und wie Kunden dich erreichen. Ich plane und baue sie persönlich: mit Leistungsseiten, echten Projektbildern und einem Anfrageweg, der brauchbare Anfragen statt Rückfragen bringt.',
    highlights: [
      'Leistungen und Einsatzgebiet auf einen Blick',
      'Anruf, WhatsApp oder Anfrage mit einem Tipp',
      'Projektfotos vom Handy reichen für den Start'
    ],
    image: '/images/handwerker-min.webp',
    imageAlt: 'Handwerker mit Werkzeuggürtel und Arbeitshandschuhen beim Innenausbau',
    imageSize: [653, 436]
  },
  why: {
    title: 'Warum eine gute Website im Handwerk mehr Aufträge bringt',
    paragraphs: [
      'Fast jeder Betrieb ist online: Laut der Bitkom-Studie 2025 nutzen 94 Prozent der Handwerksbetriebe eine eigene Website und 88 Prozent Online-Verzeichnisse. Eine Homepage allein hebt dich also nicht mehr ab. Entscheidend ist, ob Interessenten schnell verstehen, dass du der richtige Betrieb für ihren Auftrag bist.',
      'Auch Empfehlungen landen auf deiner Website. Wer deinen Namen hört, prüft dich meist kurz online: Leistungen, Bilder, Bewertungen, Erreichbarkeit. 87 Prozent der befragten Betriebe sagen, dass Kunden individuelle Angebote und schnelle Erreichbarkeit erwarten. Deine Website muss deshalb auf dem Handy funktionieren und den Kontakt leicht machen.'
    ],
    stats: [
      { value: '94 %', label: 'der Handwerksbetriebe nutzen eine eigene Website', source: 'Bitkom 2025' },
      { value: '87 %', label: 'sehen, dass Kunden schnelle Erreichbarkeit erwarten', source: 'Bitkom 2025' },
      { value: '17.264', label: 'Handwerksunternehmen gibt es in Berlin', source: 'Statistik Berlin-Brandenburg, 2024' }
    ]
  },
  essentials: {
    title: 'Was auf eine Handwerker-Website gehört',
    intro: 'Diese Inhalte erwarten Kunden auf einer Homepage für Handwerker. Sie sind zugleich die Grundlage dafür, dass Google deine Leistungen versteht.',
    items: [
      { icon: 'fa-screwdriver-wrench', title: 'Leistungen mit eigenen Seiten', text: 'Jede wichtige Leistung bekommt eine eigene Seite: was du machst, für wen und wie es abläuft. So findet man dich für „Badsanierung“ genauso wie für „Heizungswartung“.' },
      { icon: 'fa-map-location-dot', title: 'Einsatzgebiet', text: 'Nenne die Bezirke und Orte, in denen du arbeitest, zum Beispiel Pankow, Reinickendorf und das nördliche Umland. Das spart Anfragen, die nicht passen.' },
      { icon: 'fa-images', title: 'Projektbilder und Referenzen', text: 'Echte Fotos von Baustellen und fertigen Arbeiten, gern mit Vorher-Nachher, Ortsteil und zwei Sätzen zur Aufgabe. Stockfotos wirken im Handwerk schnell austauschbar.' },
      { icon: 'fa-phone', title: 'Kontakt mit einem Tipp', text: 'Telefon zum Antippen, WhatsApp, E-Mail und ein kurzes Anfrageformular. Auf dem Handy bleibt der Kontakt sichtbar, ohne dass jemand suchen muss.' },
      { icon: 'fa-award', title: 'Belege statt Floskeln', text: 'Meisterbrief, Innungsmitgliedschaft, Zertifizierungen, Garantien und Bewertungen. Das überzeugt mehr als „zuverlässig und kompetent“.' },
      { icon: 'fa-people-group', title: 'Team und Ansprechpartner', text: 'Gesichter und Namen. Wer dich in die Wohnung oder auf die Baustelle lässt, möchte wissen, wer kommt.' },
      { icon: 'fa-user-plus', title: 'Karriere und Ausbildung', text: 'Offene Stellen, Ausbildungsplätze und ein einfacher Bewerbungsweg per Telefon, WhatsApp oder Formular.' },
      { icon: 'fa-scale-balanced', title: 'Impressum und Datenschutz', text: 'Beides ist Pflicht. Für Handwerksbetriebe gibt es beim Impressum ein paar Besonderheiten, die du weiter unten findest.' }
    ]
  },
  trades: {
    title: 'Website nach Gewerk: welche Seiten und Suchbegriffe zählen',
    intro: 'Kunden suchen selten nach „Handwerker“, sondern nach ihrer Aufgabe und ihrem Ort. Die Übersicht zeigt, welche Seiten sich je Gewerk lohnen und wie typische Suchen in Berlin aussehen. Die genaue Struktur planen wir passend zu deinem Betrieb.',
    items: [
      { name: 'Elektriker', pages: ['Elektroinstallation und Altbausanierung', 'E-Check und Prüfungen', 'Wallbox und PV-Anschluss', 'Smart Home'], searches: ['Elektriker Pankow', 'Wallbox installieren Berlin'] },
      { name: 'Sanitär, Heizung, Klima', pages: ['Badsanierung', 'Heizungstausch und Wärmepumpe', 'Wartung', 'Notdienst'], searches: ['Badsanierung Berlin', 'Heizung Notdienst Neukölln'] },
      { name: 'Maler und Lackierer', pages: ['Innenanstrich und Tapezieren', 'Fassade', 'Lackierarbeiten', 'Bodenbeschichtung'], searches: ['Maler Charlottenburg', 'Wohnung streichen lassen Berlin'] },
      { name: 'Dachdecker und Zimmerei', pages: ['Dachsanierung', 'Reparatur nach Sturm', 'Dachfenster', 'Dachstuhl und Holzbau'], searches: ['Dachdecker Spandau', 'Dach undicht Berlin'] },
      { name: 'Tischler und Schreiner', pages: ['Einbaumöbel nach Maß', 'Küchen', 'Türen und Fenster', 'Innenausbau'], searches: ['Einbauschrank nach Maß Berlin', 'Tischler Friedrichshain'] },
      { name: 'Fliesen-, Boden- und Parkettleger', pages: ['Bad fliesen', 'Parkett schleifen und versiegeln', 'Vinyl und Designboden'], searches: ['Parkett schleifen Berlin', 'Fliesenleger Steglitz'] },
      { name: 'Garten- und Landschaftsbau', pages: ['Gartenpflege', 'Pflaster und Wege', 'Terrassen und Zäune', 'Gehölzschnitt'], searches: ['Gartenpflege Zehlendorf', 'Terrasse bauen lassen Berlin'] },
      { name: 'Bau, Ausbau und Sanierung', pages: ['Umbau und Kernsanierung', 'Altbausanierung', 'Trockenbau', 'Maurer- und Putzarbeiten'], searches: ['Altbausanierung Berlin', 'Trockenbau Lichtenberg'] },
      { name: 'Metallbau und Schlosserei', pages: ['Treppen und Geländer', 'Tore und Zäune', 'Balkone', 'Reparaturen'], searches: ['Geländer Metallbau Berlin', 'Schlosserei Reinickendorf'] },
      { name: 'Fenster, Türen und Rollläden', pages: ['Fenstertausch', 'Haustüren', 'Rollläden und Insektenschutz', 'Reparatur und Wartung'], searches: ['Fenster austauschen Berlin', 'Rollladen Reparatur Tempelhof'] },
      { name: 'Glaser', pages: ['Glasreparatur', 'Duschabtrennungen', 'Ganzglastüren', 'Spiegel nach Maß'], searches: ['Glaser Berlin', 'Duschwand nach Maß Berlin'] }
    ],
    related: {
      title: 'Weitere Handwerksberufe',
      text: 'Friseure, Kfz-Werkstätten und Gebäudereinigung gehören ebenfalls zum Handwerk. Dafür gibt es eigene Seiten:',
      links: [
        { label: 'Website für Friseure', href: '/branchen/webdesign-friseur' },
        { label: 'Website für Kfz-Werkstätten', href: '/branchen/webdesign-autowerkstatt' },
        { label: 'Website für Gebäudereinigung', href: '/branchen/webdesign-reinigung' }
      ]
    }
  },
  inquiry: {
    title: 'Das Anfrageformular: weniger Rückfragen, passendere Aufträge',
    text: 'Ein gutes Formular fragt nicht viel, aber das Richtige. So kannst du schon beim ersten Rückruf einschätzen, ob der Auftrag passt und was du mitbringen musst.',
    fields: [
      { label: 'Was soll gemacht werden?', hint: 'Auswahl deiner Leistungen' },
      { label: 'Wo ist der Einsatzort?', hint: 'Bezirk oder Postleitzahl' },
      { label: 'Wann soll es losgehen?', hint: 'Zeitraum statt Wunschtermin' },
      { label: 'Fotos vom Ist-Zustand', hint: 'optional, Umsetzung nach Absprache' },
      { label: 'Rückrufwunsch', hint: 'mit passender Uhrzeit' },
      { label: 'Kurze Beschreibung', hint: 'in eigenen Worten' }
    ],
    notes: [
      'Wenn du einen Notdienst anbietest, steht die Notdienst-Nummer getrennt und gut sichtbar, nicht im Formular.',
      'Ein Foto-Upload ist technisch aufwendiger und wird vorab mit dir abgestimmt.'
    ]
  },
  local: {
    title: 'In deinem Bezirk bei Google gefunden werden',
    text: 'In Berlin gibt es rund 17.300 Handwerksunternehmen. Wer „Maler Pankow“ oder „Badsanierung Steglitz“ sucht, sieht oft zuerst die Karte mit Google-Unternehmensprofilen und darunter die Websites. Beides muss zusammenpassen.',
    checklist: [
      'Eine Seite pro wichtiger Leistung, mit deinem Einsatzgebiet im Text',
      'Gleiche Angaben zu Name, Adresse und Telefon auf Website, Google-Profil und in Verzeichnissen',
      'Projektberichte mit Ortsteil, zum Beispiel „Dachsanierung in Spandau“',
      'Bewertungen aktiv anfragen und auf der Website verlinken',
      'Schnelle Ladezeit auf dem Handy und saubere technische Grundlagen'
    ],
    note: 'Feste Platzierungen kann niemand seriös versprechen. Eine klare Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.'
  },
  careers: {
    title: 'Mitarbeiter und Azubis über die Website finden',
    text: 'Laut Bitkom-Studie 2025 fehlen 83 Prozent der Handwerksbetriebe Auszubildende, 75 Prozent kämpfen mit Fachkräftemangel. 80 Prozent der ausbildenden Betriebe sprechen Nachwuchs bereits über digitale Kanäle an. Eine Karriereseite ist der Ort, auf den deine Anzeigen und Social-Media-Beiträge verlinken.',
    items: [
      'Offene Stellen und Ausbildungsplätze mit Aufgaben, Arbeitszeiten und Einsatzorten',
      'Einblicke in Team, Werkstatt und Baustellen',
      'Kurzer Bewerbungsweg per Telefon, WhatsApp oder Formular',
      'Ein Ansprechpartner mit Foto statt anonymer Sammeladresse'
    ]
  },
  legal: {
    title: 'Impressum und Pflichtangaben für Handwerksbetriebe',
    intro: 'Eine geschäftliche Website braucht ein Impressum, das mit höchstens zwei Klicks erreichbar ist. Der Zentralverband des Deutschen Handwerks nennt dafür unter anderem:',
    items: [
      'Name und Anschrift des Betriebs, bei Gesellschaften auch Rechtsform und Vertretungsberechtigte',
      'E-Mail-Adresse und Telefonnummer',
      'Registergericht und Registernummer, falls eingetragen',
      'Umsatzsteuer-Identifikationsnummer oder, falls keine vorhanden, die Wirtschafts-Identifikationsnummer',
      'Bei Gesundheitshandwerken wie Augenoptiker oder Hörakustiker zusätzlich Handwerkskammer, Berufsbezeichnung, Staat der Verleihung und die Handwerksordnung',
      'Eine Aufsichtsbehörde nur bei erlaubnispflichtigen Tätigkeiten, im Handwerk etwa bei bevollmächtigten Bezirksschornsteinfegern',
      'Hinweise zur Verbraucherstreitbeilegung, insbesondere ob du an Schlichtungsverfahren teilnimmst'
    ],
    note: 'Ich binde Impressum und Datenschutzerklärung technisch sauber ein. Das ist keine Rechtsberatung: Im Zweifel helfen Handwerkskammer, Innung oder eine Anwaltskanzlei.'
  },
  pricing: {
    title: 'Was kostet eine Website für Handwerker?',
    lead: 'Der Preis hängt vor allem davon ab, wie viele Leistungen und Seiten du brauchst. Für Handwerksbetriebe passen meist diese Pakete:',
    fits: {
      start: 'Für Ein-Personen-Betriebe und klare Spezialisierung: Onepager oder bis zu drei Seiten mit Leistungen, Einsatzgebiet und Kontakt.',
      business: 'Für die meisten Betriebe: eigene Leistungsseiten, Referenzen und Kontakt nach Anliegen, rund vier bis sieben Seiten.',
      wachstum: 'Für mehrere Gewerke, einen Karrierebereich oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
    },
    note: 'Hosting, Domain, E-Mail und Wartung sind optional und werden separat vereinbart. Ein Bearbeitungssystem (CMS), Online-Buchung oder Mehrsprachigkeit plane ich als Zusatzleistung.'
  },
  process: {
    title: 'So läuft dein Projekt ab',
    steps: [
      { title: 'Erstgespräch', text: 'Wir klären Leistungen, Einsatzgebiet, Ziele und welches Paket passt.' },
      { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte und Fotos, gern direkt vom Handy.' },
      { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
      { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
      { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung, Änderungen und neue Projektbilder.' }
    ],
    duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
  },
  proof: {
    title: 'Referenz und Bewertungen',
    reference: {
      name: 'TM Sauber & Mehr',
      href: '/referenzen/tm-sauber-mehr',
      text: 'Für den Reinigungsbetrieb TM Sauber & Mehr habe ich die Website neu strukturiert: Leistungen sind besser vergleichbar, eine neue Team-Seite stärkt das Vertrauen.'
    },
    ratingText: 'Die Bewertungen zur Zusammenarbeit sind öffentlich im Google-Unternehmensprofil nachlesbar.'
  },
  cta: {
    title: 'Lass uns über deinen Betrieb sprechen',
    text: 'Erzähl mir kurz, welche Arbeiten du anbietest und wo du unterwegs bist. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'Bitkom: Digitalisierung des Handwerks, Studie 2025 (504 Betriebe)', href: 'https://www.bitkom.org/sites/main/files/2026-01/bitkom-studienbericht-handwerk.pdf' },
    { label: 'ZDH: Praxis Recht – Impressumspflicht, Stand Juli 2025', href: 'https://www.zdh.de/ueber-uns/fachbereich-organisation-und-recht/praxis-recht/praxis-recht-impressumspflicht/' },
    { label: 'Amt für Statistik Berlin-Brandenburg: Handwerk in Berlin 2024', href: 'https://www.statistik-berlin-brandenburg.de/e-v-1-j' }
  ]
});
