// Inhalte der Seite /branchen/webdesign-cafe („Café-Website erstellen lassen“).
// Grundlage: Search-Console-Daten Juni bis Oktober 2026 („cafe website erstellen lassen“, „cafe website“,
// „seo cafes“), das Referenzprojekt Zur alten Backstube und die frühere Seite /webdesign-cafe/kosten
// (4-Wochen-Ablauf), die seit 26.10.2026 hierher weiterleitet.

export const CAFE_CONTENT_UPDATED_ISO = '2026-10-26';

export const CAFE_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für ein Café?',
    a: 'Eine kompakte Café-Website mit Karte, Öffnungszeiten, Bildern und Kontakt startet bei Komplett Webdesign {{price.start}}. Mit Reservierung, Events und Galerie liegt das Business-Paket bei {{price.business}}. Ein eigenes Bestell- oder Reservierungssystem ist Teil des Individuell-Pakets {{price.individuell}}.'
  },
  {
    q: 'Reicht Instagram nicht statt einer Website?',
    a: 'Instagram zeigt Stimmung, ist aber schlecht für feste Informationen: Öffnungszeiten, Karte, Anfahrt und Reservierung sind dort schwer zu finden, und bei Google erscheinst du mit Instagram kaum. Am besten verlinken Website, Google-Profil und Instagram aufeinander.'
  },
  {
    q: 'Brauche ich eine Reservierungs-App?',
    a: 'Nicht zwingend. Für den Start reicht oft ein Anfrageformular mit Datum, Uhrzeit und Personenzahl oder ein sichtbarer Anruf-Button. Nutzt du schon ein Reservierungssystem, binde ich es ein.'
  },
  {
    q: 'Kann ich die Karte selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Karte, Wochenangebote und Öffnungszeiten selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich Änderungen für dich.'
  },
  {
    q: 'Müssen wir neue Fotos machen?',
    a: 'Nicht unbedingt. Gute Handyfotos bei Tageslicht reichen oft für den Start: Gastraum, Kuchenvitrine, Frühstücksteller und Team. Wichtig ist, dass es deine eigenen Bilder sind. Stockfotos sehen auf jeder Café-Website gleich aus.'
  },
  {
    q: 'Kann ich über die Website Torten oder Gutscheine verkaufen?',
    a: 'Eine Vorbestellung für Torten oder Kuchen per Anfrage ist in jedem Paket möglich. Gutscheine oder Bestellungen mit Online-Bezahlung setze ich als kleine Shop-Funktion im Individuell-Paket um.'
  },
  {
    q: 'Wie werde ich bei „Café in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Öffnungszeiten, Fotos, Attributen wie Terrasse oder WLAN und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Muss ich Allergene auf der Website angeben?',
    a: 'Für Gäste ist es hilfreich, Allergene und Zusatzstoffe bei Speisen zu kennzeichnen. Verkaufst du Speisen online zur Abholung oder Lieferung, müssen Pflichtangaben vor dem Kauf verfügbar sein. Die genauen Vorgaben klärst du am besten mit der Lebensmittelaufsicht oder deinem Verband.'
  },
  {
    q: 'Wie lange dauert es, bis die Website online ist?',
    a: 'Eine Café-Website ist meist in rund vier Wochen online: Inhalte und Bilder sammeln, Design, Umsetzung und Tests. Liegen Karte und Fotos früh vor, geht es schneller.'
  }
]);

export const CAFE_PAGE = Object.freeze({
  slug: 'cafe',
  path: '/branchen/webdesign-cafe',
  breadcrumb: 'Cafés',
  trackPrefix: 'cafe',
  metaTitle: 'Café-Website erstellen lassen | Webdesign für Cafés Berlin',
  metaDescription: 'Webdesign für Cafés in Berlin: Karte, Öffnungszeiten, Reservierung und Atmosphäre zeigen und lokal gefunden werden. Mit Praxisbeispiel, {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Cafés',
    serviceType: ['Website für Cafés', 'Webdesign für Cafés', 'Café-Homepage', 'Local SEO für Cafés'],
    audienceType: 'Cafés, Bäckereien und Konditoreien'
  },
  hero: {
    chip: 'Webdesign für Cafés',
    h1: 'Café-Website erstellen lassen: Webdesign für Cafés in Berlin',
    lead: 'Deine Website zeigt, wie es sich bei dir anfühlt, bevor jemand die Tür öffnet: mit Bildern aus deinem Café, einer Karte, die auf dem Handy lesbar ist, und aktuellen Öffnungszeiten. Ich plane und baue sie persönlich, mit einem einfachen Weg zur Reservierung oder Tortenbestellung.',
    highlights: [
      'Atmosphäre mit echten Bildern',
      'Karte und Öffnungszeiten immer aktuell',
      'Reservierung oder Tortenbestellung mit einem Tipp'
    ],
    image: '/images/cafe-min.webp',
    imageAlt: 'Café mit einladender Atmosphäre und sichtbarem gastronomischem Angebot',
    imageSize: [2218, 1478]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum ein Café eine eigene Website braucht',
      paragraphs: [
        'In ein Café geht man oft spontan: Jemand sucht auf dem Handy nach Frühstück in der Nähe, schaut auf Öffnungszeiten, Bilder und Bewertungen und entscheidet in Sekunden. Fehlen diese Angaben oder sind sie veraltet, geht der Gast ins nächste Café.',
        'Instagram zeigt Stimmung, aber Karte, Öffnungszeiten, Anfahrt und Reservierung sind dort schwer zu finden, und bei Google erscheinst du damit kaum. Eine eigene Website bündelt alles an einer Stelle und macht dein Café bei der lokalen Suche sichtbar.'
      ],
      stats: []
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Cafés gehört',
      intro: 'Diese Inhalte suchen Gäste, bevor sie vorbeikommen. Zugleich helfen sie Google zu verstehen, was dein Café besonders macht und wo es liegt.',
      items: [
        { icon: 'fa-camera', title: 'Atmosphäre in Bildern', text: 'Gastraum, Terrasse, Kuchenvitrine und Team. Eigene Fotos verkaufen das Gefühl, das dein Café ausmacht.' },
        { icon: 'fa-utensils', title: 'Karte als Text', text: 'Frühstück, Kuchen und Getränke direkt auf der Seite, schnell auf dem Handy und für Google lesbar. Ein PDF höchstens zusätzlich.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten und Anfahrt', text: 'Aktuelle Zeiten inklusive Feiertagen, Adresse mit Karte, ÖPNV und Hinweise wie Kinderwagen oder Hunde willkommen.' },
        { icon: 'fa-calendar-days', title: 'Reservierung', text: 'Für das Wochenendfrühstück oder Gruppen: Formular, Reservierungssystem oder Anruf-Button, immer sichtbar.' },
        { icon: 'fa-cake-candles', title: 'Torten und Bestellungen', text: 'Torten, Kuchen oder Frühstückskörbe vorbestellen, mit Anlass, Datum und Abholung.' },
        { icon: 'fa-champagne-glasses', title: 'Events und Raum mieten', text: 'Lesungen, Kurse oder Feiern: eine eigene Seite mit Terminen und Anfrage.' },
        { icon: 'fa-star', title: 'Bewertungen', text: 'Ausgewählte Google-Bewertungen und ein gepflegtes Unternehmensprofil, verknüpft mit deiner Website.' },
        { icon: 'fa-user-plus', title: 'Jobs', text: 'Offene Stellen für Service und Küche mit einem kurzen Bewerbungsweg.' }
      ]
    },
    {
      type: 'catalog',
      id: 'cafearten',
      chip: 'Café-Arten',
      title: 'Websites für Frühstückscafés, Konditoreien und Röstereien',
      intro: 'Ein Frühstückscafé braucht andere Schwerpunkte als eine Konditorei oder eine Rösterei. Die Übersicht zeigt, welche Inhalte sich lohnen und wie typische Suchen in Berlin aussehen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Frühstückscafé', pages: ['Frühstückskarte mit Preisen', 'Reservierung fürs Wochenende', 'Terrasse und Plätze'], searches: ['Frühstück Prenzlauer Berg', 'Brunch Friedrichshain'] },
        { name: 'Konditorei und Bäckerei-Café', pages: ['Kuchen und Torten der Woche', 'Tortenbestellung mit Anlass', 'Öffnungszeiten und Abholung'], searches: ['Torte bestellen Berlin', 'Konditorei Pankow'] },
        { name: 'Rösterei und Specialty Coffee', pages: ['Kaffeesorten und Herkunft', 'Bohnen kaufen oder bestellen', 'Kurse und Verkostungen'], searches: ['Specialty Coffee Kreuzberg', 'Kaffeerösterei Berlin'] },
        { name: 'Kiez- und Familiencafé', pages: ['Spielecke und Kinderwagen', 'Mittagstisch', 'Veranstaltungen im Kiez'], searches: ['Café mit Spielecke Lichtenberg', 'Familiencafé Berlin'] },
        { name: 'Café mit Events', pages: ['Veranstaltungskalender', 'Raum mieten', 'Anfrage mit Datum und Personenzahl'], searches: ['Café Raum mieten Berlin', 'Lesung Café Berlin'] }
      ],
      related: {
        title: 'Restaurant oder Bar?',
        text: 'Für Restaurants, Bars und Catering gibt es eine eigene Seite:',
        links: [{ label: 'Website für Restaurants', href: '/branchen/webdesign-restaurant' }]
      }
    },
    {
      type: 'case',
      id: 'praxisbeispiel',
      soft: true,
      chip: 'Praxisbeispiel',
      title: 'Praxisbeispiel: Zur alten Backstube in Berlin-Rosenthal',
      text: 'Zur alten Backstube ist ein Café in Berlin-Rosenthal. Angebot, Atmosphäre und Infos zum Besuch waren online nicht gut gebündelt, und Tische ließen sich nur per Telefon reservieren.',
      doneTitle: 'Was ich umgesetzt habe',
      done: [
        'Eine ruhige Seitenstruktur für Angebot, Atmosphäre und Kontakt',
        'Bildsprache und Texte passend zur warmen, lokalen Ausrichtung',
        'Besuchsinfos und Tischreservierung sichtbar in den wichtigsten Bereichen',
        'Eine technische Grundlage für schnelle Ladezeiten und einfache Pflege'
      ],
      resultTitle: 'Ergebnis',
      result: [
        'Gäste finden Angebot, Atmosphäre und Reservierung schneller',
        'Reservieren geht jetzt online statt nur per Telefon'
      ],
      quote: 'Das Ergebnis sieht einfach super aus. Es ist jetzt viel einfacher Tische zu reservieren.',
      quoteAuthor: 'Google-Bewertung des Cafés',
      image: {
        src: '/images/home-referenz-backstube.webp',
        alt: 'Startseite der Website Zur alten Backstube mit historischem Foto der Bäckerei',
        width: 1840,
        height: 805
      },
      link: { href: '/referenzen/zur-alten-backstube', label: 'Projekt Zur alten Backstube ansehen' }
    },
    {
      type: 'form',
      id: 'reservierung',
      chip: 'Anfragen',
      title: 'Reservierung und Bestellung: einfach statt kompliziert',
      text: 'Die meisten Gäste wollen nur wissen, ob am Samstag ein Tisch frei ist oder ob die Torte bis Freitag fertig wird. Ein kurzes Formular reicht dafür oft aus.',
      formLabel: 'Beispiel: Felder der Reservierungsanfrage',
      fields: [
        { label: 'Datum und Uhrzeit', hint: 'mit Wunschzeit' },
        { label: 'Personenzahl', hint: 'inklusive Kindern' },
        { label: 'Anlass', hint: 'Frühstück, Geburtstag, Treffen' },
        { label: 'Besondere Wünsche', hint: 'Kinderstuhl, Hund, Terrasse' },
        { label: 'Kontakt', hint: 'Telefon oder E-Mail für die Bestätigung' }
      ],
      notes: [
        'Nutzt du bereits ein Reservierungssystem, verlinke oder binde ich es ein. Dann pflegst du alles an einer Stelle.',
        'Für Tortenbestellungen fragt das Formular Anlass, Größe, Wunschdatum und Abholung ab.'
      ]
    },
    {
      type: 'checklist',
      id: 'google',
      soft: true,
      chip: 'Local SEO',
      title: 'Bei „Café in der Nähe“ gefunden werden',
      paragraphs: [
        'Wer ein Café sucht, sucht fast immer in der Nähe und oft auf dem Handy. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit dein Café dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich, auch an Feiertagen aktuell',
        'Attribute im Google-Profil pflegen, etwa Terrasse, WLAN, Frühstück oder vegane Angebote',
        'Regelmäßig neue Fotos von Gerichten, Kuchen und Gastraum',
        'Karte als Text auf der Website und im Profil verlinkt',
        'Bewertungen beantworten, freundlich und sachlich'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für ein Café?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob online reserviert oder bestellt wird. Für Cafés passen meist diese Pakete:',
      fits: {
        start: 'Für die meisten kleinen Cafés: Onepager oder bis zu drei Seiten mit Karte, Öffnungszeiten, Bildern und Kontakt.',
        business: 'Für Cafés mit Reservierung, Events oder Tortenbestellung: rund vier bis sieben Seiten mit Galerie.',
        wachstum: 'Für mehrere Standorte, Café mit Rösterei oder Catering oder den Relaunch einer bestehenden Website.'
      },
      note: 'Ein eigenes Reservierungs-, Bestell- oder Gutscheinsystem ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional und werden separat vereinbart.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'In vier Wochen zur Café-Website',
      steps: [
        { title: 'Woche 1: Kickoff und Inhalte', text: 'Wir klären Angebot und Ziele. Du lieferst Karte, Öffnungszeiten und Fotos, gern vom Handy.' },
        { title: 'Woche 2: Design und Struktur', text: 'Ich gestalte die Seiten passend zu deinem Café. Du bekommst eine erste Vorschau.' },
        { title: 'Woche 3: Umsetzung', text: 'Ich programmiere die Website, optimiere sie für das Handy und binde Reservierung oder Bestellung ein.' },
        { title: 'Woche 4: Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, Livegang und Abgleich mit dem Google-Profil.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen oder du pflegst Karte und Angebote selbst.' }
      ],
      duration: 'Eine Café-Website ist meist in rund vier Wochen online, je nachdem wie schnell Inhalte, Bilder und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Cafés' }
  ],
  cta: {
    title: 'Lass uns über dein Café sprechen',
    text: 'Erzähl mir kurz, was dein Café besonders macht und wie Gäste heute zu dir finden. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website für Restaurants', href: '/branchen/webdesign-restaurant' }
  ],
  sources: []
});
