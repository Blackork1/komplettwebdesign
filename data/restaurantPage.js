// Inhalte der Seite /branchen/webdesign-restaurant („Restaurant-Website erstellen lassen“).
// Grundlage: Search-Console-Daten Juni bis Oktober 2026 („restaurant website erstellen lassen“,
// „restaurant homepage erstellen“, „gastronomie website erstellen lassen“), der DEHOGA-Zahlenspiegel I/2026
// und das Referenzprojekt Zur alten Backstube.

export const RESTAURANT_CONTENT_UPDATED_ISO = '2026-10-25';

const DEHOGA_SOURCE = 'DEHOGA-Zahlenspiegel I/2026';

export const RESTAURANT_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für ein Restaurant?',
    a: 'Eine kompakte Restaurant-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Speisekarte, Events, Catering und Galerie liegt das Business-Paket bei {{price.business}}, größere Websites oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Ein eigenes Reservierungs- oder Bestellsystem ist eine Zusatzleistung.'
  },
  {
    q: 'Wie binde ich Tischreservierungen ein?',
    a: 'Am einfachsten über das Reservierungssystem, das du schon nutzt: Die Website verlinkt darauf oder bindet es ein. Für kleinere Betriebe reicht oft ein Reservierungsformular oder ein sichtbarer Anruf-Button. So war es auch bei Zur alten Backstube: Vorher ging es nur per Telefon, jetzt online.'
  },
  {
    q: 'Sollte die Speisekarte als PDF oder auf der Website stehen?',
    a: 'Am besten direkt als Text auf der Website. Sie lädt auf dem Handy schneller, ist für Google lesbar und lässt sich leicht ändern. Ein PDF kann zusätzlich zum Herunterladen bereitstehen.'
  },
  {
    q: 'Muss ich Allergene auf der Website angeben?',
    a: 'Für Gäste ist es hilfreich, Allergene und Zusatzstoffe bei den Gerichten zu kennzeichnen. Verkaufst du Speisen online, etwa zur Abholung oder Lieferung, müssen die Pflichtangaben vor dem Kauf verfügbar sein. Die genauen Vorgaben klärst du am besten mit deinem Verband oder der Lebensmittelaufsicht.'
  },
  {
    q: 'Brauche ich einen eigenen Lieferdienst oder Onlineshop?',
    a: 'Nicht unbedingt. Viele Restaurants verlinken auf ihre Lieferplattform. Eine eigene Bestellfunktion spart Provisionen, kostet aber Aufwand für Technik und Ablauf. Ob sie sich lohnt, hängt von deinem Bestellvolumen ab. Kleine Bestellfunktionen setze ich im Individuell-Paket um.'
  },
  {
    q: 'Wie werde ich bei „Restaurant in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Öffnungszeiten, Speisekarte, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Küche, Speisen, Bezirk und Anfahrt. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Speisekarte und Angebote selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Speisekarte, Mittagstisch und Aktionen selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich Änderungen für dich.'
  },
  {
    q: 'Welche Fotos brauche ich?',
    a: 'Eigene Bilder deiner Gerichte, deines Gastraums und deines Teams. Gute Handyfotos bei Tageslicht reichen oft für den Start. Stockfotos von fremden Gerichten wecken Erwartungen, die dein Restaurant nicht erfüllen kann.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Speisekarte und Fotos früh vor, geht es schneller.'
  },
  {
    q: 'Kann meine bestehende Restaurant-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  }
]);

export const RESTAURANT_PAGE = Object.freeze({
  slug: 'restaurant',
  path: '/branchen/webdesign-restaurant',
  breadcrumb: 'Restaurants',
  trackPrefix: 'restaurant',
  metaTitle: 'Restaurant-Website erstellen lassen in Berlin | Gastronomie',
  metaDescription: 'Webdesign für Restaurants und Gastronomie in Berlin: Speisekarte, Reservierung und Öffnungszeiten klar zeigen und lokal gefunden werden. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Restaurants',
    serviceType: ['Website für Restaurants', 'Webdesign für Gastronomie', 'Restaurant-Homepage', 'Local SEO für Restaurants'],
    audienceType: 'Restaurants, Cafés und Gastronomiebetriebe'
  },
  hero: {
    chip: 'Webdesign für Gastronomie',
    h1: 'Restaurant-Website erstellen lassen: für Gastronomie in Berlin',
    lead: 'Deine Website macht Appetit, bevor jemand einen Tisch reserviert: mit Bildern deiner Gerichte, einer Speisekarte, die auf dem Handy lesbar ist, und einem einfachen Weg zur Reservierung. Ich plane und baue sie persönlich, passend zu deiner Küche und deinem Alltag.',
    highlights: [
      'Speisekarte als Text statt PDF',
      'Reservierung mit einem Tipp',
      'Gefunden werden bei „Restaurant in der Nähe“'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_720,q_auto/v1754413302/admin_gallery/mdikghhav7yyygsahmkh.webp',
    imageAlt: 'Freunde teilen am Restauranttisch Burger, Pommes und Salat, von oben fotografiert',
    imageSize: [960, 720]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Restaurants jetzt online überzeugen müssen',
      paragraphs: [
        'Die Gastronomie steht unter Druck: Laut DEHOGA-Zahlenspiegel lag der reale Umsatz im Gastgewerbe im ersten Quartal 2026 um 5,1 Prozent unter dem Vorjahr und auf dem niedrigsten Stand seit 2022. Gäste sind preisbewusster und wählen genauer aus, wo sie essen gehen.',
        'Diese Entscheidung fällt oft auf dem Handy: Speisekarte, Preise, Öffnungszeiten, Fotos und Bewertungen. Ein Restaurant, das hier überzeugt und die Reservierung leicht macht, bekommt den Tisch. Plattformen helfen beim Gefundenwerden, deine eigene Website zeigt, was dein Haus besonders macht.'
      ],
      stats: [
        { value: '−5,1 %', label: 'realer Umsatz im Gastgewerbe im 1. Quartal 2026 gegenüber dem Vorjahr', source: DEHOGA_SOURCE },
        { value: '−19,7 %', label: 'realer Umsatz gegenüber dem 1. Quartal 2019', source: DEHOGA_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Restaurants gehört',
      intro: 'Diese Inhalte suchen Gäste, bevor sie reservieren oder vorbeikommen. Zugleich helfen sie Google zu verstehen, was du anbietest und wo du bist.',
      items: [
        { icon: 'fa-utensils', title: 'Speisekarte als Text', text: 'Gerichte mit Preisen direkt auf der Seite, schnell auf dem Handy und für Google lesbar. Ein PDF höchstens zusätzlich.' },
        { icon: 'fa-calendar-days', title: 'Reservierung', text: 'Ein klarer Weg zum Tisch: Reservierungssystem, Formular oder Anruf-Button, auf dem Handy immer sichtbar.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten und Anfahrt', text: 'Aktuelle Zeiten inklusive Feiertagen und Ruhetagen, Adresse mit Karte, ÖPNV und Parken.' },
        { icon: 'fa-camera', title: 'Echte Fotos', text: 'Deine Gerichte, dein Gastraum, dein Team. Eigene Bilder wecken Appetit und Vertrauen.' },
        { icon: 'fa-champagne-glasses', title: 'Events und Feiern', text: 'Geburtstage, Firmenfeiern, Weihnachtsessen: eine eigene Seite mit Räumen, Menüs und Anfrageformular.' },
        { icon: 'fa-truck', title: 'Abholung und Lieferung', text: 'Wie und wo Gäste bestellen können, ob über deine Website oder eine Plattform.' },
        { icon: 'fa-star', title: 'Bewertungen', text: 'Ausgewählte Google-Bewertungen und ein gepflegtes Unternehmensprofil, verknüpft mit deiner Website.' },
        { icon: 'fa-user-plus', title: 'Jobs', text: 'Offene Stellen für Küche und Service mit einem kurzen Bewerbungsweg per Telefon oder WhatsApp.' }
      ]
    },
    {
      type: 'catalog',
      id: 'gastronomie',
      chip: 'Gastronomie',
      title: 'Websites für Restaurants, Cafés, Bars und Catering',
      intro: 'Ein Mittagstisch braucht andere Seiten als ein Abendrestaurant oder ein Caterer. Die Übersicht zeigt, welche Inhalte sich lohnen und wie typische Suchen in Berlin aussehen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Restaurant', pages: ['Speisekarte und Getränke', 'Reservierung', 'Gastraum und Terrasse'], searches: ['Restaurant Prenzlauer Berg', 'italienisches Restaurant Mitte'] },
        { name: 'Mittagstisch und Imbiss', pages: ['Wochenkarte', 'Abholung und Lieferung', 'Öffnungszeiten'], searches: ['Mittagstisch Kreuzberg', 'Mittagessen in der Nähe'] },
        { name: 'Café und Bäckerei', pages: ['Frühstück und Kuchen', 'Atmosphäre und Bilder', 'Reservierung für Gruppen'], searches: ['Café Pankow', 'Frühstück Friedrichshain'] },
        { name: 'Bar und Weinbar', pages: ['Getränkekarte', 'Events und Live-Musik', 'Gruppenreservierung'], searches: ['Cocktailbar Neukölln', 'Weinbar Charlottenburg'] },
        { name: 'Catering und Events', pages: ['Pakete und Menüs', 'Ablauf und Liefergebiet', 'Anfrage mit Datum und Personenzahl'], searches: ['Catering Berlin Firmenfeier', 'Fingerfood Catering Berlin'] }
      ],
      related: {
        title: 'Café oder Backstube?',
        text: 'Für Cafés gibt es eine eigene Seite mit Praxisbeispiel:',
        links: [{ label: 'Website für Cafés', href: '/branchen/webdesign-cafe' }]
      }
    },
    {
      type: 'case',
      id: 'praxisbeispiel',
      soft: true,
      chip: 'Praxisbeispiel',
      title: 'Praxisbeispiel aus der Gastronomie: Zur alten Backstube',
      text: 'Zur alten Backstube ist ein Café in Berlin-Rosenthal. Angebot, Atmosphäre und Infos zum Besuch waren online nicht gut gebündelt, und Tische ließen sich nur per Telefon reservieren.',
      doneTitle: 'Was ich umgesetzt habe',
      done: [
        'Eine ruhige Seitenstruktur für Angebot, Atmosphäre und Kontakt',
        'Bildsprache und Texte passend zur warmen, lokalen Ausrichtung',
        'Besuchsinfos und Tischreservierung sichtbar in den wichtigsten Bereichen'
      ],
      resultTitle: 'Ergebnis',
      result: [
        'Gäste finden Angebot, Atmosphäre und Reservierung schneller',
        'Reservieren geht jetzt online statt nur per Telefon'
      ],
      quote: 'Es ist jetzt viel einfacher Tische zu reservieren.',
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
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Restaurant in der Nähe“ gefunden werden',
      paragraphs: [
        'Wer essen gehen will, sucht meist auf dem Handy nach „Restaurant in der Nähe“ oder nach Küche und Bezirk. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit dein Restaurant dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich, auch an Feiertagen aktuell',
        'Speisekarte als Text auf der Website und im Google-Profil verlinkt',
        'Regelmäßig neue Fotos von Gerichten und Gastraum im Profil',
        'Bewertungen beantworten, freundlich und sachlich',
        'Schnelle Ladezeit auf dem Handy, denn dort wird entschieden'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für ein Restaurant?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob online reserviert oder bestellt wird. Für die Gastronomie passen meist diese Pakete:',
      fits: {
        start: 'Für Imbiss, Café oder kleines Restaurant: Onepager oder bis zu drei Seiten mit Speisekarte, Öffnungszeiten und Reservierung.',
        business: 'Für die meisten Restaurants: Seiten für Speisekarte, Events, Galerie und Team, rund vier bis sieben Seiten.',
        wachstum: 'Für Restaurants mit Catering, mehreren Standorten oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Ein eigenes Reservierungs- oder Bestellsystem ist Teil des Individuell-Pakets {{price.individuell}}; vorhandene Systeme binde ich in jedem Paket ein. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Küche, Gäste, Reservierung und welches Paket passt.' },
        { title: 'Seitenplan und Fotos', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Speisekarte und Fotos, gern vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen oder du pflegst Speisekarte und Aktionen selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Restaurants' }
  ],
  cta: {
    title: 'Lass uns über dein Restaurant sprechen',
    text: 'Erzähl mir kurz, was deine Küche besonders macht und wie Gäste heute reservieren. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website für Cafés', href: '/branchen/webdesign-cafe' }
  ],
  sources: [
    { label: 'DEHOGA Bundesverband: Zahlenspiegel I/2026, Stand 26.05.2026', href: 'https://www.dehoga-sachsen.de/fileadmin/user_upload/dehoga/Mitgliederbereich/DEHOGA-Zahlenspiegel_1._Quartal_2026.pdf' }
  ]
});
