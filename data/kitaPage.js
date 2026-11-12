// Inhalte der Seite /branchen/webdesign-kita („Website für Kitas, Kinderläden und Tagesmütter“).
// Grundlage: Branchenanalyse vom 10.11.2026 (docs/seo/content-briefs/2026-11-10-kita/kita.md):
// Google-Suchvorschläge von Trägern, Tagesmüttern und Eltern, Suchergebnisse, die Zahlen von Destatis und dem
// Amt für Statistik Berlin-Brandenburg zum Stichtag 1. März 2026 sowie die Berliner Regeln zu Kita-Gutschein,
// Kita-Navigator und Kindertagespflege.
//
// Bildplätze: Die Bilder unter public/images/branchen/kita/ sind gezeichnete Platzhalter. Ein echtes Foto
// ersetzt die Datei unter demselben Namen und im selben Seitenverhältnis (WebP), danach hier nur den alt-Text
// anpassen. Keine erkennbaren Kinder ohne Einwilligung der Sorgeberechtigten.
//   kita-hero.webp         960 × 640  Hero: Außenansicht, Eingang oder heller Gruppenraum
//   kita-tagespflege.webp  720 × 540  Abschnitt Kindertagespflege: Spielecke oder Tagesmutter in ihren Räumen
//   kita-raeume.webp       720 × 540  Einblicke 1: Gruppenraum, Bewegungsraum oder Schlafraum
//   kita-garten.webp       720 × 540  Einblicke 2: Außengelände oder Spielplatz in der Nähe
//   kita-team.webp         720 × 540  Einblicke 3: Team oder Detail aus dem Alltag (Garderobe, Basteltisch)
//   kita-hero-720.webp     720 × 540  Karte auf /branchen: 4:3-Ausschnitt des Hero-Bildes, bei neuem Hero neu erzeugen

export const KITA_CONTENT_UPDATED_ISO = '2026-11-10';

const IMAGE_BASE = '/images/branchen/kita';
const DESTATIS_SOURCE = 'Destatis, 2026';
const AFS_SOURCE = 'Amt für Statistik Berlin-Brandenburg, 2026';

export const KITA_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Kita-Website?',
    a: 'Eine kompakte Website für eine Tagesmutter, einen Tagesvater oder einen kleinen Kinderladen startet bei Komplett Webdesign {{price.start}}. Für Kitas und Elterninitiativen mit eigenen Seiten für Konzept, Tagesablauf, Team und Platzanfrage liegt das Business-Paket bei {{price.business}}, für größere Einrichtungen und Träger das Wachstum-Paket bei {{price.wachstum}}. Hosting, Domain und Wartung sind optional.'
  },
  {
    q: 'Welche Seiten braucht eine Kita-Homepage?',
    a: 'Mindestens Konzept, Tagesablauf, Öffnungs- und Schließzeiten, Team, Räume, freie Plätze mit Platzanfrage sowie Kontakt und Anfahrt. Das gilt für Krippe, Kindergarten und Hort gleichermaßen. Sinnvoll sind außerdem Eingewöhnung, Essen und eine Karriereseite. Für eine Kindertagespflege genügt oft ein gut gegliederter Onepager.'
  },
  {
    q: 'Website, Homepage oder Internetseite: Gibt es einen Unterschied?',
    a: 'Im Alltag meinen alle drei Wörter dasselbe, nämlich den gesamten Auftritt deiner Einrichtung im Netz. Streng genommen ist die Homepage nur die Startseite. Ob Kita-Website, Kindergarten-Homepage oder Internetseite einer Kindertagesstätte: Geplant und gebaut wird sie gleich.'
  },
  {
    q: 'Lohnt sich eine eigene Homepage für eine Tagesmutter oder einen Tagesvater?',
    a: 'Ja, sobald Plätze nicht mehr von allein vergeben sind. Bundesweit gab es 2026 rund 8,6 % weniger Tagesmütter und Tagesväter als im Vorjahr, in Berlin sank die Zahl der Kinder in Kindertagespflege um 14,6 %. Eltern suchen nach „Tagesmutter Berlin“ mit ihrem Bezirk und entscheiden sich für die Person, von der sie sich ein Bild machen können. Eine kleine Homepage mit Über mich, Räumen, Zeiten und freien Plätzen reicht dafür aus.'
  },
  {
    q: 'Können Eltern über die Website einen Kitaplatz anfragen?',
    a: 'Ja. Ein Formular fragt Geburtsmonat, gewünschten Beginn, Betreuungsumfang und Kontakt ab, und die Anfrage kommt sortiert in deinem Postfach an. In Berlin läuft daneben der Kita-Navigator weiter. Die Website erklärt, wie beide Wege zusammenhängen und wie es nach der Anfrage weitergeht.'
  },
  {
    q: 'Reicht der Eintrag im Kita-Navigator nicht aus?',
    a: 'Für die Eckdaten ja: Der Eintrag nennt Adresse, Träger, Öffnungszeiten und Plätze. Tagesablauf, Eingewöhnung, Team und Räume lassen sich dort kaum zeigen, und Fachkräfte suchen dort keine Stellen. Am besten verlinkt der Eintrag auf deine Website, und beide nennen dieselben Angaben.'
  },
  {
    q: 'Dürfen Fotos von Kindern auf die Kita-Website?',
    a: 'Nur mit Einwilligung der Sorgeberechtigten, und die kann jederzeit widerrufen werden. Viele Einrichtungen zeigen deshalb Räume, Außengelände, Hände und Details statt Gesichter. Das wirkt lebendig und erspart das Nachhalten von Einwilligungen.'
  },
  {
    q: 'Kann ich freie Plätze, Schließzeiten und Speiseplan selbst ändern?',
    a: 'Ja. Diese Angaben ändern sich oft, deshalb richte ich sie so ein, dass du sie in wenigen Klicks pflegst. Wer dafür keine Zeit hat, schickt mir eine kurze Nachricht, und ich erledige es im Rahmen der Wartung.'
  },
  {
    q: 'Wie wird meine Kita bei Google gefunden?',
    a: 'Mit Bezirk, Kiez und Adresse als Text auf der Website, einem gepflegten Google-Unternehmensprofil und Seiten, die echte Fragen beantworten, etwa zu Eingewöhnung oder Schließzeiten. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Hilft die Website auch bei der Suche nach Erzieherinnen und Erziehern?',
    a: 'Ja. Eine Karriereseite mit offenen Stellen, Stundenumfang, Team und Arbeitsbedingungen ist oft der zweite Klick nach der Stellenanzeige. Bewerbungen kommen über ein kurzes Formular, auch vom Handy.'
  },
  {
    q: 'Wer pflegt die Website einer Elterninitiative, wenn der Vorstand wechselt?',
    a: 'Das ist bei Kinderläden die häufigste Sorge. Ich übergebe Zugänge und eine kurze Anleitung so, dass sie nicht an einer Person hängen. Mit einer Wartung bleibt die Technik aktuell, auch wenn das Ehrenamt wechselt.'
  },
  {
    q: 'Kann der Förderverein der Kita auf der Website vorkommen?',
    a: 'Ja. Meist genügt eine eigene Unterseite mit Vorstand, Projekten, Beitrittserklärung und Spendenkonto. So bleibt alles unter einer Adresse, und Eltern finden den Förderverein dort, wo sie ohnehin nachsehen.'
  },
  {
    q: 'Baust du auch Websites für Träger mit mehreren Kitas?',
    a: 'Ja. Jeder Standort bekommt eine eigene Seite mit Adresse, Zeiten, Team und freien Plätzen, dazu kommen eine gemeinsame Übersicht und eine Karriereseite. So wird jede Kita in ihrem Bezirk gefunden. Größere Vorhaben mit Standortsuche oder Elternbereich setze ich im Individuell-Paket {{price.individuell}} um.'
  },
  {
    q: 'Muss eine Kita-Website barrierefrei sein?',
    a: 'Das hängt vom Träger ab und sollte im Einzelfall geprüft werden. Für öffentliche Stellen gelten eigene Vorgaben, das Barrierefreiheitsstärkungsgesetz nimmt Kleinstunternehmen aus, die Dienstleistungen erbringen. Unabhängig davon baue ich mit gut lesbaren Kontrasten, klarer Struktur und Tastaturbedienung, weil das allen Eltern hilft.'
  },
  {
    q: 'Kann eine bestehende Kita-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch übernehme ich brauchbare Texte und Bilder, ordne die Seiten neu und leite alte Adressen um, damit vorhandene Google-Treffer nicht ins Leere führen.'
  },
  {
    q: 'Wie lange dauert es, bis die Kita-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Konzept, Zeiten und Fotos früh vor, geht es schneller.'
  }
]);

export const KITA_PAGE = Object.freeze({
  slug: 'kita',
  path: '/branchen/webdesign-kita',
  breadcrumb: 'Kitas und Tagesmütter',
  trackPrefix: 'kita',
  // Dezente Einblend-Animationen und Farbton aus public/branchen-page.css (siehe views/niche-page.ejs).
  motion: true,
  tone: 'pastell',
  metaTitle: 'Kita-Website erstellen lassen | Tagesmutter-Homepage Berlin',
  metaDescription: 'Website für Kita, Kindertagesstätte, Kinderladen oder Tagesmutter: Konzept, freie Plätze und Platzanfrage klar zeigen, in Berlin sichtbar. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Kitas und Kindertagespflege',
    serviceType: [
      'Website für Kitas, Kindertagesstätten und Kindergärten',
      'Homepage für Tagesmütter und Tagesväter',
      'Website für Elterninitiativen und Kinderläden',
      'Karriereseite für Erzieherinnen und Erzieher',
      'Local SEO für Kitas'
    ],
    audienceType: 'Kitas, Elterninitiativen, Träger und Kindertagespflegepersonen'
  },
  hero: {
    chip: 'Webdesign für Kitas und Tagespflege',
    h1: 'Website für Kitas, Kinderläden und Tagesmütter in Berlin',
    lead: 'Eltern vergleichen Kindertagesstätten und Kindertagespflege online, bevor sie anrufen. Eine gute Kita-Website beantwortet ihre ersten Fragen sofort: Konzept, Öffnungszeiten, freie Plätze. Ich plane und baue sie persönlich, für Kitas, Kindergärten, Elterninitiativen, Tagesmütter und Tagesväter. So kommen Platzanfragen sortiert bei dir an, und Erzieherinnen und Erzieher sehen, wie dein Team arbeitet.',
    highlights: [
      'Konzept, Tagesablauf und Eingewöhnung verständlich erklärt',
      'Platzanfrage mit allen Angaben statt Zettelwirtschaft',
      'Für Kitas, Kinderläden und Kindertagespflege'
    ],
    image: `${IMAGE_BASE}/kita-hero.webp`,
    imageAlt: 'Illustration einer Kita-Website im Browserfenster mit Haus, Sonne und Bauklötzen',
    imageSize: [960, 640]
  },
  // Kleinere 4:3-Variante des Hero-Bildes für die Karte auf /branchen.
  cardImage: `${IMAGE_BASE}/kita-hero-720.webp`,
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Kitas und Tagesmütter jetzt eine gute Website brauchen',
      paragraphs: [
        'Lange reichte ein Schild an der Tür, die Wartelisten waren ohnehin voll. Das ändert sich: Am 1. März 2026 zählte das Statistische Bundesamt rund 61.000 Kindertageseinrichtungen, zum ersten Mal seit Beginn der Zeitreihe 2006 weniger als im Vorjahr. Die Zahl der betreuten Kinder unter drei Jahren sank zum dritten Mal in Folge, auf 756.700. In Berlin waren 165.850 Kinder in öffentlich geförderter Betreuung, 3,0 % weniger als ein Jahr zuvor.',
        'Besonders deutlich trifft es die Kindertagespflege: Bundesweit arbeiteten noch 34.200 Tagesmütter und Tagesväter, 8,6 % weniger als 2025. In Berlin ging die Zahl der Kinder in Kindertagespflege um 14,6 % zurück. Wo Plätze frei bleiben, vergleichen Eltern genauer, und zwar zuerst im Netz.',
        'Der Eintrag im Kita-Navigator nennt die Eckdaten wie Adresse, Träger, Öffnungszeiten und Platzzahl. Wie der Tag bei dir aussieht, wie die Eingewöhnung abläuft und wer die Kinder begleitet, lässt sich dort kaum zeigen. Diese Lücke füllt deine Website. Dieselben Seiten lesen auch Erzieherinnen und Erzieher, bevor sie sich bewerben.'
      ],
      stats: [
        { value: '61.000', label: 'Kindertageseinrichtungen (gerundet) am 1. März 2026, erster Rückgang seit 2006', source: DESTATIS_SOURCE },
        { value: '34.200', label: 'Tagesmütter und Tagesväter bundesweit, 8,6 % weniger als 2025', source: DESTATIS_SOURCE },
        { value: '37,2 %', label: 'Betreuungsquote der unter Dreijährigen (2025: 37,8 %)', source: DESTATIS_SOURCE },
        { value: '165.850', label: 'Kinder in geförderter Betreuung in Berlin, 3,0 % weniger als 2025', source: AFS_SOURCE }
      ]
    },
    {
      type: 'catalog',
      id: 'einrichtungen',
      chip: 'Einrichtungen',
      title: 'Webdesign für Kita, Kinderladen und Kindertagespflege',
      intro: 'Eine Tagesmutter mit fünf Plätzen braucht eine andere Internetseite als eine Kindertagesstätte mit Krippe und Kindergarten oder ein Träger mit acht Häusern. Die Übersicht zeigt, welche Inhalte sich für wen lohnen und wie Eltern tatsächlich suchen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Kita, Kindergarten, Krippe und Hort', pages: ['Konzept, Gruppen und Tagesablauf', 'Öffnungs- und Schließzeiten', 'Platzanfrage und Besichtigung'], searches: ['Kita Berlin Lichtenberg', 'Kita in der Nähe', 'Krippe Berlin freie Plätze'] },
        { name: 'Tagesmutter und Tagesvater', pages: ['Über mich mit Qualifikation', 'Räume, Garten und Tagesablauf', 'Freie Plätze mit Monat und Alter'], searches: ['Tagesmutter Berlin Spandau', 'Tagesmutter in der Nähe', 'Kindertagespflege Berlin'] },
        { name: 'Elterninitiative und Kinderladen', pages: ['Selbstverständnis und Elternmitarbeit', 'Aufnahme und Kennenlernen', 'Vorstand, Team und Kontakt'], searches: ['Kinderladen Berlin Neukölln', 'Elterninitiative Kita Berlin'] },
        { name: 'Träger mit mehreren Standorten', pages: ['Eigene Seite je Standort', 'Standortübersicht nach Bezirken', 'Karriereseite mit offenen Stellen'], searches: ['Kita Berlin Mitte', 'Erzieher Jobs Berlin', 'Kita Stellenangebote Berlin'] },
        { name: 'Bilingual, Wald und Montessori', pages: ['Schwerpunkt verständlich erklärt', 'Ein Tag im Wald oder in zwei Sprachen', 'Fragen und Antworten für Eltern'], searches: ['bilinguale Kita Berlin', 'Waldkita Berlin', 'Montessori Kita Berlin'] }
      ],
      related: {
        title: 'Hebamme, Praxis oder Therapie?',
        text: 'Für weitere Berufe rund um Familie und Gesundheit gibt es eigene Seiten:',
        links: [
          { label: 'Website für Hebammen', href: '/branchen/webdesign-hebamme' },
          { label: 'Website für Arztpraxen', href: '/branchen/webdesign-arzt' },
          { label: 'Website für Physiotherapie-Praxen', href: '/branchen/webdesign-physiotherapie' }
        ]
      }
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Homepage einer Kindertagesstätte gehört',
      intro: 'Diese Inhalte suchen Eltern, bevor sie eine Besichtigung anfragen. Zugleich helfen sie Google, deine Einrichtung dem richtigen Bezirk und den passenden Suchanfragen zuzuordnen.',
      items: [
        { icon: 'fa-book-open', title: 'Pädagogisches Konzept', text: 'Dein Ansatz in wenigen klaren Absätzen statt als 40-seitiges PDF: Situationsansatz, Montessori, offene Arbeit oder Waldpädagogik, und was das im Alltag der Kinder bedeutet.' },
        { icon: 'fa-clock', title: 'Tagesablauf', text: 'Vom Ankommen über Morgenkreis und Mittagessen bis zum Abholen. Gesucht wird wörtlich „Kita Tagesablauf“, denn Eltern wollen wissen, wie ein normaler Tag aussieht.' },
        { icon: 'fa-handshake', title: 'Eingewöhnung', text: 'Wie die ersten Wochen ablaufen, etwa nach dem Berliner Modell, wie lange ein Elternteil dabei ist und worauf sich Familien einstellen sollten.' },
        { icon: 'fa-calendar-days', title: 'Öffnungs- und Schließzeiten', text: 'Betreuungszeiten, Früh- und Spätdienst, Schließtage und Sommerschließzeit für das laufende und das kommende Jahr, an einer Stelle und mit Datum.' },
        { icon: 'fa-clipboard-list', title: 'Freie Plätze und Platzanfrage', text: 'Ab wann und für welches Alter Plätze frei werden, dazu ein Formular, das gleich die Angaben abfragt, die du für die Warteliste brauchst.' },
        { icon: 'fa-users', title: 'Team', text: 'Leitung und pädagogische Fachkräfte mit Foto, Qualifikation und Schwerpunkt. Vertrauen entsteht, wenn Eltern sehen, wer ihr Kind begleitet.' },
        { icon: 'fa-images', title: 'Räume und Außengelände', text: 'Gruppenräume, Bewegungsraum, Garten und Umgebung in Bildern. Fotos ohne erkennbare Kinder zeigen viel und brauchen keine Einwilligungen.' },
        { icon: 'fa-utensils', title: 'Essen und Speiseplan', text: 'Wer kocht, was auf den Tisch kommt und wie du mit Allergien und Unverträglichkeiten umgehst. Den Speiseplan tauschst du selbst aus.' }
      ]
    },
    {
      type: 'timeline',
      id: 'tagesablauf',
      chip: 'Beispiel',
      title: 'So liest sich ein Tagesablauf, den Eltern verstehen',
      intro: 'Statt einer Tabelle im PDF zeigt die Website den Tag als kurze Zeitleiste. Eltern erfassen ihn in Sekunden, auch auf dem Handy. Die Zeiten sind ein Beispiel und richten sich nach deinem Alltag.',
      listLabel: 'Beispiel für einen Tagesablauf in der Kita',
      items: [
        { time: '07:30', title: 'Ankommen und Frühstück', text: 'Die Kinder kommen in Ruhe an. Wer mag, frühstückt in der Gruppe.' },
        { time: '09:00', title: 'Morgenkreis', text: 'Begrüßung, Lieder und der Blick auf den Tag.' },
        { time: '09:30', title: 'Spielen, Projekte, Garten', text: 'Freispiel, Angebote in kleinen Gruppen und Zeit draußen.' },
        { time: '11:30', title: 'Mittagessen', text: 'Frisch gekocht und gemeinsam am Tisch.' },
        { time: '12:15', title: 'Mittagsruhe', text: 'Schlafen für die Jüngeren, ruhige Beschäftigung für die Älteren.' },
        { time: '14:30', title: 'Vesper und Freispiel', text: 'Eine kleine Mahlzeit, danach Spielen bis zum Abholen.' }
      ],
      note: 'Genauso lässt sich die Eingewöhnung zeigen, etwa nach dem Berliner Modell mit Grundphase, erstem Trennungsversuch, Stabilisierungsphase und Schlussphase.'
    },
    {
      type: 'feature',
      id: 'tagespflege',
      soft: true,
      chip: 'Kindertagespflege',
      title: 'Homepage für Tagesmütter und Tagesväter',
      paragraphs: [
        'In Berlin betreut eine Kindertagespflegeperson bis zu fünf Kinder, im Verbund zu zweit bis zu zehn, vorrangig Kinder unter drei Jahren. Anderswo heißt dieser Verbund meist Großtagespflege. Eltern brauchen wie für die Kita einen Kita-Gutschein und zahlen dieselbe Kostenbeteiligung. Das wissen viele nicht. Wer es auf der eigenen Homepage kurz erklärt, beantwortet zwei häufige Suchanfragen gleich mit: „Tagesmutter oder Kita“ und „Tagesmutter Kosten“.',
        'Bei so kleinen Gruppen zählt für die Entscheidung vor allem die Person. Deine Homepage zeigt deshalb dich, deine Räume und deinen Tag, und sie sagt ehrlich, ab wann wieder ein Platz frei wird.',
        'Offen gesagt: Für eine einzelne Tagespflegestelle gibt es Baukästen und spezialisierte Anbieter für wenige hundert Euro. Die reichen, wenn du Texte und Pflege selbst übernimmst. Ich bin die richtige Wahl, wenn deine Tagesmutter-Website eigenständig aussehen, in deinem Kiez bei Google gefunden und ohne dein Zutun gepflegt werden soll.'
      ],
      pointsTitle: 'Das gehört auf die Homepage einer Tagesmutter',
      points: [
        'Über mich mit Qualifikation und Pflegeerlaubnis nach § 43 SGB VIII',
        'Räume, Garten und Spielplätze in der Nähe in Bildern',
        'Betreuungszeiten, Urlaub und Vertretung',
        'Freie Plätze mit Monat und Alter des Kindes',
        'Kontakt per Formular oder Telefon mit festen Sprechzeiten'
      ],
      image: {
        src: `${IMAGE_BASE}/kita-tagespflege.webp`,
        alt: 'Illustration einer Spielecke mit Regal, Teppich und Bauklötzen',
        width: 720,
        height: 540
      }
    },
    {
      type: 'form',
      id: 'platzanfrage',
      chip: 'Platzanfrage',
      title: 'Platzanfrage und Warteliste über die Website',
      text: 'Platzanfragen kommen per Mail, am Telefon, als Zettel im Briefkasten und zwischen Tür und Angel. Ein Formular auf der Website fragt von Anfang an ab, was du für Warteliste und Platzvergabe brauchst. Alle Anfragen landen in derselben Form im Postfach.',
      notes: [
        'In Berlin stellen viele Eltern ihre Betreuungsanfrage über den Kita-Navigator. Eine Anfrage dort reserviert aber keinen Platz. Die Website erklärt, wie es danach weitergeht: Kennenlernen, Besichtigung, Zusage und Vertrag.',
        'Ein Hinweis zum Kita-Gutschein spart Rückfragen: Eltern beantragen ihn beim Jugendamt des Wohnbezirks, frühestens neun und spätestens zwei Monate vor dem gewünschten Betreuungsbeginn.',
        'Abgefragt wird nur, was für die Platzvergabe nötig ist. Gesundheitsdaten oder der vollständige Geburtstag gehören nicht in ein Erstformular.'
      ],
      formLabel: 'Beispiel: Platzanfrage in sechs Feldern',
      fields: [
        { label: 'Geburtsmonat des Kindes', hint: 'Monat und Jahr genügen für die Altersgruppe' },
        { label: 'Gewünschter Betreuungsbeginn', hint: 'Monat, ab dem der Platz gebraucht wird' },
        { label: 'Betreuungsumfang', hint: 'Halbtags, Teilzeit, Ganztags oder erweitert' },
        { label: 'Kita-Gutschein', hint: 'Liegt vor, ist beantragt oder noch offen' },
        { label: 'Geschwisterkind', hint: 'Wird schon ein Geschwisterkind betreut?' },
        { label: 'Kontakt', hint: 'Name, E-Mail oder Telefon für die Rückmeldung' }
      ]
    },
    {
      type: 'gallery',
      id: 'einblicke',
      soft: true,
      chip: 'Einblicke',
      title: 'Räume, Garten und Alltag zeigen, ohne Kinder zu zeigen',
      intro: 'Bilder entscheiden mit, ob Eltern eine Besichtigung anfragen. Gute Kita-Fotos kommen ohne erkennbare Kinder aus: helle Räume, das Außengelände, Hände beim Basteln, die Garderobe mit den kleinen Gummistiefeln.',
      items: [
        { src: `${IMAGE_BASE}/kita-raeume.webp`, alt: 'Illustration eines Gruppenraums mit Tisch, Regal und Fenster', width: 720, height: 540, title: 'Räume', caption: 'Gruppenraum, Bewegungsraum und Schlafraum bei Tageslicht.' },
        { src: `${IMAGE_BASE}/kita-garten.webp`, alt: 'Illustration eines Kita-Gartens mit Baum, Sandkasten und Rutsche', width: 720, height: 540, title: 'Garten und Umgebung', caption: 'Außengelände, der Spielplatz um die Ecke, der Weg zum Park.' },
        { src: `${IMAGE_BASE}/kita-team.webp`, alt: 'Illustration einer Kita-Garderobe mit Jacken, Rucksäcken und Gummistiefeln', width: 720, height: 540, title: 'Team und Alltag', caption: 'Porträts des Teams und Details, die vom Alltag erzählen.' }
      ],
      note: 'Fotos, auf denen Kinder erkennbar sind, brauchen die Einwilligung der Sorgeberechtigten, und die lässt sich jederzeit widerrufen. Maßgeblich sind die DSGVO und § 22 KUG. Die Berliner Datenschutzbeauftragte hat dazu eine eigene Broschüre für Kitas veröffentlicht.'
    },
    {
      type: 'checklist',
      id: 'karriere',
      chip: 'Fachkräfte',
      title: 'Karriereseite: Erzieherinnen und Erzieher gewinnen',
      paragraphs: [
        'Fachkräfte suchen nach „Erzieher Jobs Berlin“ oder „Kita Stellenangebote Berlin“ und landen auf Jobportalen. Bevor sie sich bewerben, sehen sie sich die Website der Einrichtung an. Steht dort nichts zu offenen Stellen, Team und Arbeitsalltag, bleibt die Anzeige im Portal das Einzige, was sie von dir sehen.',
        'Eine eigene Karriereseite kostet keine Anzeigengebühr und bleibt online, solange du suchst. Auf Wunsch zeichne ich Stellen so aus, dass sie auch in der Jobsuche von Google erscheinen können.'
      ],
      cardTitle: 'Das gehört auf die Karriereseite',
      items: [
        'Offene Stellen mit Stundenumfang, Gruppe und Eintrittstermin',
        'Was du bietest: Vergütung, Fortbildung und Vorbereitungszeit',
        'Team, Räume und pädagogische Haltung in Bildern und kurzen Texten',
        'Kurze Bewerbung per Formular, auch ohne Anschreiben',
        'Quereinstieg, berufsbegleitende Ausbildung und Praktikum'
      ],
      note: 'Stellen ändern sich häufig. In der Wartung tausche ich Anzeigen für dich aus, oder du pflegst sie selbst.',
      noteLink: { href: '/leistungen/website-wartung', label: 'Website-Wartung' }
    },
    {
      type: 'checklist',
      id: 'local-seo',
      soft: true,
      chip: 'Sichtbarkeit',
      title: 'Bei „Kita in der Nähe“ und „Tagesmutter Berlin“ gefunden werden',
      paragraphs: [
        'Eltern suchen fast immer mit Ortsbezug: „Kita Berlin Mitte“, „Kita Neukölln freie Plätze“, „Tagesmutter Spandau“ oder schlicht „Kita in der Nähe“. Google zeigt dann eine Karte und Einträge aus der Umgebung. Damit deine Einrichtung dort auftaucht, sollten Website und Google-Unternehmensprofil denselben Ort, dieselben Zeiten und dasselbe Angebot nennen.',
        'Dazu kommen Suchen nach dem Schwerpunkt, zum Beispiel „bilinguale Kita Berlin“, „Waldkita Berlin“ oder „Montessori Kita Berlin“. Wer einen solchen Schwerpunkt hat, erklärt ihn auf einer eigenen Seite statt in einem Nebensatz.'
      ],
      cardTitle: 'Grundlagen für lokale Sichtbarkeit',
      items: [
        'Bezirk, Kiez und nächste Haltestelle als Text auf der Seite',
        'Google-Unternehmensprofil mit Öffnungszeiten, Fotos und Link zur Website',
        'Eigene Seite je Standort bei Trägern mit mehreren Häusern',
        'Einheitliche Angaben im Kita-Navigator, beim Träger und auf der Website',
        'Eigene Seiten für Schwerpunkte wie bilingual, Wald oder Montessori'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Datenschutz',
      title: 'Datenschutz, Kinderfotos und Pflichtangaben',
      paragraphs: [
        'Auf einer Kita-Website geht es um Daten von Kindern, und Eltern achten zu Recht darauf. Deshalb plane ich sie datensparsam: keine Schriften, Karten oder Videos, die beim Laden ungefragt Daten an Dritte senden, und Formulare, die nur das Nötige abfragen.',
        'Ins Impressum gehören nach § 5 DDG der Träger mit seinen Vertretungsberechtigten und, weil Kitas und Kindertagespflege eine Erlaubnis brauchen, die zuständige Aufsichtsbehörde.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Impressum nach § 5 DDG mit Träger, Vertretungsberechtigten und Aufsichtsbehörde',
        'Fotos erkennbarer Kinder nur mit Einwilligung der Sorgeberechtigten',
        'Platzanfrage mit wenigen Feldern und verschlüsselter Übertragung',
        'Schriften, Karten und Videos ohne unnötige Datenübertragung an Dritte',
        'Gut lesbare Kontraste und Bedienung per Tastatur'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Träger stimmen Datenschutztexte am besten mit ihrem Datenschutzbeauftragten ab.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Kita-Website?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst, nicht davon, wie viele Kinder du betreust. Für Kitas und Kindertagespflege passen meist diese Pakete:',
      fits: {
        start: 'Für Tagesmütter, Tagesväter und kleine Kinderläden: Onepager oder bis zu drei Seiten mit Angebot, Räumen, freien Plätzen und Kontakt.',
        business: 'Für Kitas, Kindergärten und Elterninitiativen: Seiten für Konzept, Tagesablauf, Team, Platzanfrage und Stellen, rund vier bis sieben Seiten.',
        wachstum: 'Für größere Kitas, Träger mit mehreren Standorten oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Geschützter Elternbereich, Mehrsprachigkeit oder eine Standortsuche sind Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'In fünf Schritten zur Kita-Website',
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen. Bei Trägern und Elterninitiativen plane ich die Abstimmung mit Vorstand oder Geschäftsführung von Anfang an ein.',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären, wen die Website erreichen soll, Eltern, Fachkräfte oder beide, und was dir heute am meisten Arbeit macht.' },
        { title: 'Struktur und Inhalte', text: 'Ich schlage Seiten und Formularfelder vor. Konzept, Zeiten und Fotos kommen von dir, bei den Texten helfe ich.' },
        { title: 'Design', text: 'Du siehst einen Entwurf für Handy und Desktop: freundlich, ruhig und passend zu deinem Haus.' },
        { title: 'Umsetzung und Test', text: 'Ich baue die Seiten, prüfe Formular, Ladezeit und Darstellung und richte die Grundlagen für Suchmaschinen ein.' },
        { title: 'Start und Pflege', text: 'Nach deiner Freigabe geht die Website online. Freie Plätze, Schließzeiten und Speiseplan pflegst du selbst oder ich in der Wartung.' }
      ]
    },
    {
      type: 'faq',
      id: 'faq',
      soft: true,
      chip: 'FAQ',
      title: 'Häufige Fragen zur Website für Kitas und Tagesmütter'
    }
  ],
  cta: {
    title: 'Kita-Website oder Tagesmutter-Homepage geplant?',
    text: 'Im kostenlosen Erstgespräch klären wir, welche Seiten deine Einrichtung braucht, was Eltern und Fachkräfte dort finden sollen und welches Paket dazu passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' },
    { label: 'Website für Hebammen', href: '/branchen/webdesign-hebamme' }
  ],
  sources: [
    { label: 'Destatis: Kindertagesbetreuung am 1. März 2026 (Pressemitteilung Nr. 342)', href: 'https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/09/PD26_342_225.html' },
    { label: 'Amt für Statistik Berlin-Brandenburg: Kindertagesbetreuung 2026', href: 'https://www.statistik-berlin-brandenburg.de/presse/2026/113-kindertagesbetreuung-2026' },
    { label: 'Berlin.de: Kindertagespflege', href: 'https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kindertagespflege/' },
    { label: 'Service-Portal Berlin: Kita-Gutschein', href: 'https://service.berlin.de/dienstleistung/324873/' },
    { label: 'Berlin.de: Kita-Navigator', href: 'https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kita-navigator/' },
    { label: '§ 43 SGB VIII: Erlaubnis zur Kindertagespflege', href: 'https://www.gesetze-im-internet.de/sgb_8/__43.html' },
    { label: '§ 22 Kunsturhebergesetz: Recht am eigenen Bild', href: 'https://www.gesetze-im-internet.de/kunsturhg/__22.html' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' },
    { label: '§ 3 Barrierefreiheitsstärkungsgesetz: Barrierefreiheit', href: 'https://www.gesetze-im-internet.de/bfsg/__3.html' },
    { label: 'Berliner Datenschutzbeauftragte: Bild-, Ton- und Videoaufnahmen in der Kita', href: 'https://www.datenschutz-berlin.de/fileadmin/user_upload/pdf/broschueren/2020-BlnBDI-Datenschutz_Bild_Ton_Video.pdf' }
  ]
});
