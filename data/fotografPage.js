// Inhalte der Seite /branchen/webdesign-fotograf („Website für Fotografinnen und Fotografen“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/fotograf.md):
// Google-Suchvorschläge von Fotografen und Kundschaft, Konkurrenzseiten, Kunsturhebergesetz,
// Urheberrechtsgesetz und Preisangabenverordnung.

export const FOTOGRAF_CONTENT_UPDATED_ISO = '2026-10-29';

export const FOTOGRAF_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für Fotografen?',
    a: 'Eine kompakte Portfolio-Website startet bei Komplett Webdesign {{price.start}}. Mit Portfolios je Genre, Paketen, Ablauf und Über mich liegt das Business-Paket bei {{price.business}}, Studios mit mehreren Fotografen oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Vorhandene Kundengalerien binde ich in jedem Paket ein.'
  },
  {
    q: 'Reicht Instagram oder ein Portfolio-Baukasten nicht aus?',
    a: 'Für den Anfang vielleicht. Instagram beantwortet aber selten Preis, Ablauf und Verfügbarkeit, und Baukästen sind oft langsam, sobald viele große Bilder dazukommen. Eine eigene Website ordnet dein Portfolio nach Genre, lädt schnell und wird bei Google für Suchen wie „Hochzeitsfotograf Berlin Preise“ gefunden.'
  },
  {
    q: 'Wie viele Bilder gehören ins Portfolio?',
    a: 'Weniger, als die meisten denken: lieber 15 bis 30 starke Bilder je Genre als hunderte ähnliche. Bei Hochzeiten zeigen ganze Reportagen besser als Einzelbilder, wie du einen Tag begleitest.'
  },
  {
    q: 'Sollte ich Preise auf der Website nennen?',
    a: 'Ja, zumindest ab-Preise oder Pakete. „Fotograf Kosten“, „Hochzeitsfotograf Berlin Preise“ und „Fotograf Kosten pro Stunde“ werden ständig gesucht. Für Privatkunden gibst du Gesamtpreise an, also inklusive Umsatzsteuer, oder den Hinweis auf die Regelung für Kleinunternehmer.'
  },
  {
    q: 'Wie bleibt die Website trotz vieler Fotos schnell?',
    a: 'Indem jedes Bild in der Größe ausgeliefert wird, die das Gerät braucht, in einem modernen Format wie WebP und erst geladen wird, wenn es ins Bild scrollt. Die Originale bleiben bei dir. So steht dein Portfolio auch im Mobilfunknetz in Sekunden.'
  },
  {
    q: 'Darf ich Fotos von Kundinnen und Kunden im Portfolio zeigen?',
    a: 'Nur mit ihrer Einwilligung. Am einfachsten regelst du das im Vertrag, mit der Möglichkeit, einzelne Bilder auszuschließen. Bei Hochzeiten betrifft das auch Gäste, die gut erkennbar im Mittelpunkt stehen.'
  },
  {
    q: 'Wie schütze ich meine Bilder vor Kopien?',
    a: 'Ganz verhindern lässt sich das nicht. Hilfreich sind Bilder in Webgröße statt in voller Auflösung, Urheberangaben in den Bilddaten und auf Wunsch ein dezentes Wasserzeichen. Wer deine Bilder ohne Erlaubnis nutzt, verletzt dein Urheberrecht.'
  },
  {
    q: 'Wie werde ich bei „Hochzeitsfotograf Berlin“ gefunden?',
    a: 'Mit einer eigenen Seite für Hochzeitsfotografie, auf der Text, Pakete, Orte und Reportagen zusammenkommen, mit beschreibenden Bildnamen und Alternativtexten. Bewertungen von Paaren und Verlinkungen von Locations helfen zusätzlich. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Galerien selbst pflegen?',
    a: 'Ja. Ich richte dir eine einfache Verwaltung ein, in der du neue Bilder hochlädst. Sie werden dabei automatisch verkleinert und optimiert, damit die Ladezeit stimmt.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegt deine Bildauswahl je Genre früh vor, geht es schneller.'
  }
]);

export const FOTOGRAF_PAGE = Object.freeze({
  slug: 'fotograf',
  path: '/branchen/webdesign-fotograf',
  breadcrumb: 'Fotografen',
  trackPrefix: 'fotograf',
  metaTitle: 'Fotografen-Website erstellen lassen | Portfolio Berlin',
  metaDescription: 'Website für Fotografinnen und Fotografen in Berlin: Portfolio nach Genre, Pakete und Preise, Verfügbarkeit und schnell ladende Galerien. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Fotografen',
    serviceType: ['Website für Fotografen', 'Portfolio-Website', 'Fotografen-Homepage', 'Local SEO für Fotografen'],
    audienceType: 'Fotografinnen, Fotografen und Fotostudios'
  },
  hero: {
    chip: 'Webdesign für Fotografen',
    h1: 'Website für Fotografen: Portfolio-Website erstellen lassen in Berlin',
    lead: 'Deine Bilder verkaufen, aber nur, wenn sie schnell laden und die richtigen Leute sie finden. Brautpaare suchen „Hochzeitsfotograf Berlin Preise“, Bewerberinnen „Bewerbungsfotos Berlin Mitte“, Firmen „Businessfotos Berlin“. Deine Website zeigt für jede dieser Anfragen das passende Portfolio, Pakete und einen einfachen Weg zum Termin. Ich plane und baue sie persönlich, mit Galerien, die auch auf dem Handy schnell sind.',
    highlights: [
      'Portfolio nach Genre statt Bildersammlung',
      'Pakete und Preise, die Anfragen vorsortieren',
      'Galerien, die auf dem Handy schnell laden'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1761068533/admin_gallery/qhrotd8dqv1ticgbrl2u.webp',
    imageAlt: 'Raster aus acht Fotos mit Landschaften, Porträt, Torte, Katze, Skyline, Sonnenblume und Wasser',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Fotografen eine eigene Website brauchen',
      paragraphs: [
        'Instagram ist für viele Fotografinnen und Fotografen das Schaufenster. Gebucht wird aber nach Antworten, die ein Feed selten gibt: Was kostet ein Hochzeitspaket, wie viele Bilder bekomme ich, bist du an unserem Datum frei? Bei Google wird entsprechend konkret gesucht, zum Beispiel „Hochzeitsfotograf Berlin Preise“, „Fotograf Kosten pro Stunde“ oder „Bewerbungsfotos Berlin günstig“.',
        'Eine eigene Website sortiert das: ein Portfolio je Genre, Pakete mit Preisrahmen, Ablauf und Bildlieferung, dazu eine Anfrage mit Datum. Sie gehört dir, unabhängig vom Algorithmus, und sie ist das, was Google bei „Fotograf in der Nähe“ neben deinem Unternehmensprofil auswertet.',
        'Die größte technische Hürde sind die Bilder selbst: Große Galerien machen viele Fotografen-Websites langsam. Ich liefere jedes Bild in passender Größe und modernem Format aus, damit dein Portfolio auch im Mobilfunknetz in Sekunden steht.'
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Fotografen gehört',
      intro: 'Diese Inhalte suchen Kundinnen und Kunden, bevor sie anfragen. Zugleich helfen sie Google, dich dem richtigen Genre und Ort zuzuordnen.',
      items: [
        { icon: 'fa-images', title: 'Portfolio nach Genre', text: 'Hochzeit, Porträt, Business, Familie oder Produkt getrennt, mit einer kuratierten Auswahl statt aller Bilder.' },
        { icon: 'fa-tags', title: 'Pakete und Preise', text: 'Pakete mit Dauer, Anzahl bearbeiteter Bilder und ab-Preis. „Fotograf Kosten“ gehört zu den häufigsten Suchen.' },
        { icon: 'fa-calendar-days', title: 'Verfügbarkeit', text: 'Ein Anfrageweg mit Wunschdatum, damit Paare und Firmen schnell wissen, ob du frei bist.' },
        { icon: 'fa-route', title: 'Ablauf', text: 'Vom Vorgespräch über das Shooting bis zur Bildauswahl. Wer den Ablauf kennt, bucht entspannter.' },
        { icon: 'fa-download', title: 'Bildlieferung', text: 'Wie und wann die Bilder kommen: Online-Galerie, Download, Abzüge oder Album.' },
        { icon: 'fa-location-dot', title: 'Studio und Locations', text: 'Ob du im eigenen Studio, draußen oder vor Ort fotografierst, gern mit deinen Lieblingsorten in Berlin.' },
        { icon: 'fa-star', title: 'Stimmen von Kundinnen und Kunden', text: 'Echte Bewertungen von Paaren und Firmen, mit Einwilligung und Link zur Quelle.' },
        { icon: 'fa-user', title: 'Über dich', text: 'Wer hinter der Kamera steht. Gerade bei Hochzeiten und Familien bucht man die Person, nicht nur den Stil.' }
      ]
    },
    {
      type: 'catalog',
      id: 'genres',
      chip: 'Genres',
      title: 'Websites für Hochzeits-, Business- und Porträtfotografen',
      intro: 'Ein Hochzeitsfotograf braucht andere Seiten als ein Studio für Bewerbungsfotos. Die Übersicht zeigt, welche Inhalte sich lohnen und wie in Berlin tatsächlich gesucht wird.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Hochzeitsfotografie', pages: ['Pakete vom Standesamt bis zur ganzen Feier', 'Ganze Reportagen statt Einzelbilder', 'Anfrage mit Datum und Location'], searches: ['Hochzeitsfotograf Berlin Preise', 'Hochzeitsfotograf Berlin Standesamt'] },
        { name: 'Bewerbungs- und Passbilder', pages: ['Preise und Bildanzahl', 'Termin oder spontan vorbeikommen', 'Tipps zu Kleidung und Vorbereitung'], searches: ['Bewerbungsfotos Berlin Mitte', 'Fotograf Berlin Passbilder'] },
        { name: 'Business und Unternehmen', pages: ['Team- und Porträtfotos vor Ort', 'Nutzungsrechte für Website und Presse', 'Referenzen von Firmen'], searches: ['Businessfotos Berlin', 'Professionelle Businessfotos Berlin'] },
        { name: 'Familie, Baby und Paar', pages: ['Shooting-Orte drinnen und draußen', 'Ablauf mit Kindern', 'Gutscheine'], searches: ['Fotograf Berlin Friedrichshain', 'Fotograf Kosten Taufe'] },
        { name: 'Event, Produkt und Food', pages: ['Tages- und Stundensätze', 'Bildlieferung und Rechte', 'Beispiele nach Branche'], searches: ['Fotograf Kosten pro Stunde', 'Fotograf für Website Bilder'] }
      ]
    },
    {
      type: 'form',
      id: 'anfrage',
      soft: true,
      chip: 'Anfragen',
      title: 'Anfrage mit Datum: weniger Hin und Her vor der Buchung',
      text: 'Die erste Frage ist fast immer: Bist du an unserem Termin frei? Ein kurzes Formular fragt Datum, Anlass und Umfang ab, damit du sofort ein passendes Angebot schicken kannst.',
      formLabel: 'Beispiel: Felder der Shooting-Anfrage',
      fields: [
        { label: 'Anlass', hint: 'Hochzeit, Porträt, Business, Familie oder Event' },
        { label: 'Datum', hint: 'mit Uhrzeit, falls schon bekannt' },
        { label: 'Ort', hint: 'Studio, Location oder Bezirk' },
        { label: 'Umfang', hint: 'Stunden oder gewünschtes Paket' },
        { label: 'Kontakt', hint: 'Telefon oder E-Mail' }
      ],
      notes: [
        'Bei Hochzeiten fragt das Formular zusätzlich nach Standesamt oder ganzer Feier. So siehst du direkt, welches Paket passt.',
        'Nutzt du ein Buchungs- oder Kundengalerie-System, verlinkt die Website direkt darauf.'
      ]
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Bildrechte, Einwilligungen und Preise',
      paragraphs: [
        'Fotografinnen und Fotografen arbeiten mit Personenbildern und Urheberrechten. Für die Website heißt das: Bilder von Menschen nur mit deren Einwilligung zeigen, Nutzungsrechte für Kunden klar beschreiben und Preise für Privatkunden vollständig angeben.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Portfolio-Bilder von Personen nur mit Einwilligung nach § 22 KUG, am besten im Vertrag geregelt',
        'Nutzungsrechte für Business-Kunden verständlich erklären: wo und wie lange Bilder genutzt werden dürfen',
        'Urhebernennung regeln, etwa wenn Kunden deine Bilder veröffentlichen',
        'Preise für Privatkunden als Gesamtpreise, mit allen Bestandteilen wie Anfahrt',
        'Impressum nach § 5 DDG und Datenschutzerklärung für Formular und Kundengalerie'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das dein Berufsverband oder eine Anwältin bzw. ein Anwalt.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Fotograf Berlin“ gefunden werden',
      paragraphs: [
        'Gesucht wird nach Anlass und Ort: „Hochzeitsfotograf Berlin Köpenick“, „Bewerbungsfotos Berlin Pankow“ oder „Fotograf Berlin in der Nähe“. Bei Studios zeigt Google zuerst die Karte, bei Hochzeiten und Business oft Websites mit guten Portfolios. Beides braucht echte Inhalte.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Eine Seite je Genre mit Text, nicht nur Bildern, damit Google versteht, was du anbietest',
        'Ort, Bezirk und typische Locations im Text',
        'Bilder mit beschreibenden Dateinamen und Alternativtexten',
        'Google-Unternehmensprofil, wenn du ein Studio hast, mit Fotos und Öffnungszeiten',
        'Schnelle Ladezeit trotz großer Galerien'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für Fotografen?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Genres und Seiten du brauchst und welche Funktionen eingebunden werden. Für Fotografen passen meist diese Pakete:',
      fits: {
        start: 'Für den Einstieg: Onepager oder bis zu drei Seiten mit Portfolio, Paketen und Anfrage.',
        business: 'Für die meisten Fotografen: Portfolio je Genre, Pakete, Ablauf, Über mich und Anfrage, rund vier bis sieben Seiten.',
        wachstum: 'Für Studios mit mehreren Fotografen und Genres oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Kundengalerien und Buchungssysteme, die du schon nutzt, binde ich in jedem Paket ein. Eine eigene Kundengalerie oder ein Shop für Abzüge ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Genres, Zielgruppen, Pakete und welches Website-Paket passt.' },
        { title: 'Seitenplan und Bildauswahl', text: 'Ich schlage die Seitenstruktur vor. Du lieferst deine Bildauswahl je Genre und Stichpunkte zu Paketen.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, mit Galerien, die schnell laden, und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Neue Bilder lädst du selbst hoch, oder ich übernehme Wartung und Änderungen für dich.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Fotografen' }
  ],
  cta: {
    title: 'Lass uns über deine Fotografie sprechen',
    text: 'Erzähl mir kurz, welche Genres du fotografierst, wer bei dir bucht und wo du heute gefunden wirst. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: '§ 22 Kunsturhebergesetz: Recht am eigenen Bild', href: 'https://www.gesetze-im-internet.de/kunsturhg/__22.html' },
    { label: '§ 13 Urheberrechtsgesetz: Anerkennung der Urheberschaft', href: 'https://www.gesetze-im-internet.de/urhg/__13.html' },
    { label: '§ 3 Preisangabenverordnung: Pflicht zur Angabe des Gesamtpreises', href: 'https://www.gesetze-im-internet.de/pangv_2022/__3.html' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' }
  ]
});
