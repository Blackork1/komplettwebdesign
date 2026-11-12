// Inhalte der Seite /branchen/webdesign-blumenladen („Blumenladen-Website erstellen lassen“).
// Grundlage: Search-Console-Daten Juni bis Oktober 2026. Die Seite steht auf Seite 1 für
// „website erstellen lassen blumenladen“ und „professionelle website erstellung für blumenläden“;
// Lücken waren Onlineshop, Florist und Gärtnerei. Shop-Funktionen laufen über das Individuell-Paket
// (data/packages.js), große Shops gehören nicht zum Angebot.

import { MARKETING_IMAGES } from './marketingImages.js';

const HERO_IMAGE = MARKETING_IMAGES.industryFloristHero;

export const BLUMENLADEN_CONTENT_UPDATED_ISO = '2026-11-11';

const DPA_SOURCE = 'Fachverband Deutscher Floristen, 2026';

export const BLUMENLADEN_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für einen Blumenladen?',
    a: 'Eine kompakte Website für einen Blumenladen startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Anlässe, Hochzeit und Trauer liegt das Business-Paket bei {{price.business}}, umfangreiche Websites oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Vorbestellung oder ein kleiner Onlineshop sind Teil des Individuell-Pakets {{price.individuell}}.'
  },
  {
    q: 'Kann ich über die Website Blumen verkaufen?',
    a: 'Ja, in drei Stufen: Eine Bestellanfrage ist in jedem Paket möglich. Vorbestellungen fester Sträuße zur Abholung und kleine Onlineshops mit Bezahlung und Lieferung setze ich im Individuell-Paket um. Für sehr große Sortimente ist ein eigenes Shopsystem meist sinnvoller, die Website kann dann darauf verlinken.'
  },
  {
    q: 'Brauche ich als Florist einen eigenen Onlineshop?',
    a: 'Nicht unbedingt. Viele Bestellungen sind individuell und brauchen eine kurze Rückfrage zu Farbe, Budget oder Termin. Dafür reicht eine gute Bestellanfrage. Ein Shop lohnt sich, wenn du feste Sträuße regelmäßig verkaufst, liefern willst und die Bestellungen ohne Telefonat abwickeln möchtest.'
  },
  {
    q: 'Wie werde ich bei „Blumenladen in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit der Kategorie Florist, aktuellen Öffnungszeiten, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Anlässe, Lieferung und dein Einzugsgebiet. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Sträuße, Preise und Angebote selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir dann eine einfache Verwaltung ein, mit der du Texte, Bilder und ausgewählte Angebote selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich Änderungen für dich, zum Beispiel über die Wartung.'
  },
  {
    q: 'Welche Fotos brauche ich für die Website?',
    a: 'Am besten eigene Bilder deiner Sträuße, Gestecke und deines Ladens. Gute Handyfotos bei Tageslicht reichen oft für den Start. Stockfotos sehen auf jeder Floristen-Website gleich aus und zeigen nicht deine Handschrift.'
  },
  {
    q: 'Eignet sich die Website auch für eine Gärtnerei?',
    a: 'Ja. Für Gärtnereien stehen meist das Pflanzensortiment nach Saison, Öffnungszeiten, Abholung oder Lieferung und Beratung im Vordergrund. Die Seitenstruktur richtet sich nach deinem Angebot, vom Hofverkauf bis zum Pflanzenshop.'
  },
  {
    q: 'Was muss ich bei einem Onlineshop rechtlich beachten?',
    a: 'Unter anderem Impressum, Datenschutzerklärung, AGB, vollständige Preisangaben mit Lieferkosten und Informationen zum Widerrufsrecht, für das bei schnell verderblicher Ware Ausnahmen gelten können. Ich binde die Rechtstexte technisch ein. Die inhaltliche Prüfung ist keine Rechtsberatung und gehört zu einem spezialisierten Anbieter oder einer Kanzlei.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Mit Shop-Funktion hängt es vom Umfang ab. Plane den Start am besten mit Abstand zu Valentinstag oder Muttertag.'
  },
  {
    q: 'Ist SEO für Floristen wichtig?',
    a: 'Ja, besonders die lokale Suche. Wer spontan Blumen braucht, sucht auf dem Handy und ruft den ersten passenden Laden an. Wie du dafür sorgst, dass das deiner ist, erkläre ich ausführlich im Blogartikel „SEO für Blumenläden“.'
  },
  {
    q: 'Was kostet es, einen Blumen-Onlineshop erstellen zu lassen?',
    a: 'Ein kleiner Blumen-Onlineshop mit festen Sträußen, Wunschtermin, Abholung oder Lieferung und Bezahlung im Netz gehört zum Individuell-Paket ({{price.individuell}}). Der genaue Preis hängt von der Zahl der Produkte, den Liefergebieten und der Bezahlart ab. Dazu kommen laufende Gebühren des Zahlungsanbieters. Deutlich günstiger ist eine Bestellanfrage per Formular, die in jedem Paket möglich ist.'
  },
  {
    q: 'Wie viele Produkte braucht ein Onlineshop für einen Blumenladen?',
    a: 'Weniger, als die meisten denken. Sechs bis zwölf feste Angebote reichen für den Anfang: der Strauß der Woche, zwei oder drei Klassiker in mehreren Größen, ein Gutschein und Sträuße zur Saison. Ein kleines Sortiment lässt sich jeden Tag frisch binden, und du musst nicht jede Blume einzeln als Artikel pflegen.'
  },
  {
    q: 'Lohnt sich eine eigene Website, wenn ich schon über Blumendienste und Portale verkaufe?',
    a: 'Ja. Vermittlungsdienste behalten eine Provision und geben oft Sortiment und Preise vor. Die Kundin sieht dort die Marke des Portals und nicht deinen Laden. Über die eigene Website bestellt sie direkt bei dir, du behältst den Kontakt und zeigst deine eigenen Sträuße. Beides lässt sich nebeneinander nutzen.'
  },
  {
    q: 'Worin unterscheidet sich eine professionelle Website für Blumenläden von einem Baukasten?',
    a: 'Mit einem Baukasten baust du die Seite selbst und kümmerst dich um Texte, Bilder, Technik und Auffindbarkeit. Das kann für den Anfang reichen. Bei mir bekommst du Seitenplan, Texte, Gestaltung und Umsetzung aus einer Hand, dazu eine kurze Ladezeit auf dem Handy und saubere Angaben für die lokale Suche. Sträuße, Preise und Öffnungszeiten kannst du danach auf Wunsch selbst ändern.'
  },
  {
    q: 'Wie zeige ich Hochzeitsfloristik und Trauerfloristik auf der Website?',
    a: 'Am besten mit je einer eigenen Seite. Hochzeitsfloristik lebt von Bildern echter Arbeiten und einer Anfrage mit Datum, Farbwelt und Budget. Bei Trauerfloristik zählen Ruhe und Klarheit: Kränze und Gestecke mit Preisspanne, Lieferung zum Friedhof oder zur Trauerhalle und eine Telefonnummer, unter der schnell jemand erreichbar ist.'
  },
  {
    q: 'Brauche ich eine eigene Seite für die Blumenlieferung?',
    a: 'Wenn du lieferst, ja. Eine Lieferseite nennt die Bezirke oder Postleitzahlen, die Lieferkosten, den Bestellschluss für denselben Tag und die Zeitfenster. Das beantwortet die häufigste Frage vor einer Bestellung und passt zu Suchen wie „Blumen liefern lassen“ zusammen mit deinem Bezirk. Feste Platzierungen kann dabei niemand seriös garantieren.'
  }
]);

export const BLUMENLADEN_PAGE = Object.freeze({
  slug: 'blumenladen',
  path: '/branchen/webdesign-blumenladen',
  breadcrumb: 'Blumenläden',
  trackPrefix: 'blumenladen',
  motion: true,
  tone: 'floral',
  metaTitle: 'Blumenladen-Website erstellen lassen | Florist & Onlineshop',
  metaDescription: 'Website und Onlineshop für Blumenläden, Floristen und Gärtnereien: Sträuße zeigen, Bestellungen annehmen und lokal gefunden werden. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Blumenläden',
    serviceType: ['Website für Blumenläden', 'Webdesign für Floristen', 'Onlineshop für Blumenläden', 'Website für Gärtnereien'],
    audienceType: 'Blumenläden, Floristen und Gärtnereien'
  },
  hero: {
    chip: 'Webdesign für Floristik',
    h1: 'Blumenladen-Website erstellen lassen: für Floristen in Berlin',
    lead: 'Deine Website zeigt Sträuße, Anlässe und Öffnungszeiten so, dass Kunden Lust auf einen Besuch oder eine Bestellung bekommen. Ich plane und baue sie persönlich: mit Bildern aus deinem Laden, einem Bestellweg, der zu deinem Alltag passt, und den Angaben, die Google für die lokale Suche braucht.',
    highlights: [
      'Sträuße und Anlässe mit echten Fotos',
      'Bestellanfrage, Vorbestellung oder Onlineshop',
      'Gefunden werden bei „Blumenladen in der Nähe“'
    ],
    image: HERO_IMAGE.src,
    imageAlt: HERO_IMAGE.alt,
    imageSize: [HERO_IMAGE.width, HERO_IMAGE.height]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum ein Blumenladen eine eigene Website braucht',
      paragraphs: [
        'Der Wettbewerb ist härter geworden: Laut Fachverband Deutscher Floristen gibt es in Deutschland noch etwa 8.000 Blumenläden, vor zehn Jahren waren es rund 12.000. Rund zwei Drittel der Schnittblumen werden nach YouGov-Daten in Supermärkten und Discountern gekauft.',
        'Ein Fachgeschäft gewinnt deshalb nicht über den Preis, sondern über das, was der Supermarkt nicht kann: Beratung, Sträuße mit eigener Handschrift, Hochzeits- und Trauerfloristik, Lieferung und Blumen für Firmen. Genau das muss deine Website zeigen, mit Bildern deiner eigenen Arbeiten.'
      ],
      stats: [
        { value: 'ca. 8.000', label: 'Blumenläden gibt es in Deutschland, vor zehn Jahren rund 12.000', source: DPA_SOURCE },
        { value: '2/3', label: 'der Schnittblumen werden in Supermärkten und Discountern gekauft', source: 'YouGov, 2026' }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Blumenladens gehört',
      intro: 'Diese Inhalte erwarten Kunden, bevor sie vorbeikommen oder bestellen. Zugleich helfen sie Google zu verstehen, was dein Laden bietet und wo er liegt.',
      items: [
        { icon: 'fa-camera', title: 'Echte Bilder deiner Arbeiten', text: 'Sträuße, Gestecke und Schaufenster aus deinem Laden. Deine eigene Handschrift verkauft, Stockfotos sehen überall gleich aus.' },
        { icon: 'fa-calendar-days', title: 'Anlässe und Saison', text: 'Valentinstag, Muttertag, Hochzeit, Trauer, Geburtstag: eine feste Struktur für Anlässe, die du saisonal füllst, statt ständig neue Einzelseiten.' },
        { icon: 'fa-cart-shopping', title: 'Bestellweg', text: 'Ob Bestellanfrage, Vorbestellung zur Abholung oder Onlineshop: Kunden sehen sofort, was online geht und bis wann bestellt werden muss.' },
        { icon: 'fa-truck', title: 'Lieferung und Liefergebiet', text: 'Welche Bezirke du belieferst, was die Lieferung kostet und bis wann eine Bestellung für denselben Tag eingehen muss.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten und Anfahrt', text: 'Aktuelle Öffnungszeiten, auch an Feiertagen, Adresse mit Karte und Telefon zum Antippen.' },
        { icon: 'fa-ring', title: 'Hochzeit und Events', text: 'Eine eigene Seite mit Beispielen, Ablauf und Anfrageformular für Brautstrauß, Tischdeko und Raumschmuck.' },
        { icon: 'fa-building', title: 'Firmenkunden', text: 'Blumen-Abos für Büros, Praxen, Hotels und Restaurants: wiederkehrende Aufträge, die sich gut planen lassen.' },
        { icon: 'fa-star', title: 'Bewertungen und Google-Profil', text: 'Google-Bewertungen und ein gepflegtes Unternehmensprofil, das mit deiner Website verknüpft ist.' }
      ]
    },
    {
      type: 'columns',
      id: 'onlineshop',
      chip: 'Onlineshop',
      title: 'Onlineshop für den Blumenladen: drei Wege zur Bestellung',
      intro: 'Nicht jeder Blumenladen braucht einen kompletten Onlineshop. Oft reicht ein einfacher Bestellweg, der zu deinem Alltag passt. Diese drei Stufen kommen infrage:',
      items: [
        {
          title: 'Bestellanfrage',
          text: 'Kunden wählen Anlass, Budget, Farbwunsch und Abhol- oder Liefertermin, du bestätigst per Telefon oder E-Mail. Ideal für Sträuße nach Wunsch.',
          points: ['Kein Zahlungssystem nötig', 'Du behältst jede Bestellung im Blick', 'Rückfragen zu Farbe und Budget sind eingeplant'],
          label: 'In jedem Paket möglich'
        },
        {
          title: 'Vorbestellung zur Abholung',
          text: 'Eine kleine Auswahl fester Sträuße mit Foto und Preis, die Kunden online reservieren und im Laden bezahlen. Praktisch vor Valentinstag und Muttertag, wenn das Telefon nicht stillsteht.',
          points: ['Feste Sträuße mit Fotos und Preisen', 'Abholzeitfenster zur Auswahl', 'Bezahlung im Laden'],
          label: 'Individuell-Paket {{price.individuell}}'
        },
        {
          title: 'Onlineshop mit Lieferung',
          text: 'Sträuße und Pflanzen online kaufen und bezahlen, mit Liefergebiet nach Postleitzahl, Wunschtermin und Grußkarte.',
          points: ['Online bezahlen', 'Liefergebiet und Lieferkosten nach Postleitzahl', 'Grußkarte und Wunschtermin'],
          label: 'Kleine Shops im Individuell-Paket, große Sortimente mit eigenem Shopsystem'
        }
      ],
      note: 'Für einen Onlineshop brauchst du zusätzlich Rechtstexte wie AGB und Widerrufsinformationen. Ich binde sie technisch ein, die inhaltliche Prüfung übernimmt ein spezialisierter Anbieter oder eine Kanzlei.'
    },
    {
      type: 'feature',
      id: 'blumen-onlineshop',
      soft: true,
      chip: 'Blumen-Onlineshop',
      title: 'Blumen-Onlineshop erstellen lassen: was ein kleiner Shop können muss',
      paragraphs: [
        'Ein Onlineshop für Blumen funktioniert anders als ein Shop für Bücher oder Kleidung. Die Ware ist verderblich, fast jede Bestellung hat einen Anlass und einen festen Termin, und geliefert wird meist nur im eigenen Bezirk. Deshalb entscheidet nicht die Zahl der Produkte, sondern der Ablauf: Wer bestellt, will in einer Minute wissen, was der Strauß kostet, wann er fertig ist und wie er ankommt.',
        'Für die meisten Blumenläden reichen sechs bis zwölf feste Angebote: der Strauß der Woche, zwei oder drei Klassiker in mehreren Größen, ein Gutschein und Sträuße zur Saison. Dazu kommen Wunschtermin, Abholung oder Lieferung, ein Feld für die Grußkarte und die Bezahlung im Netz. Ein Bestellschluss verhindert, dass um 17 Uhr noch ein Auftrag für denselben Tag eingeht.',
        'Offen gesagt: Kleine Shops dieser Art gehören zum Individuell-Paket ({{price.individuell}}). Wenn du hunderte Artikel, eine Warenwirtschaft und Versand in ganz Deutschland planst, bist du mit einem eigenen Shopsystem und einem darauf spezialisierten Dienstleister besser beraten. Das sage ich dir im Erstgespräch, bevor Kosten entstehen.'
      ],
      pointsTitle: 'Das braucht ein Blumen-Onlineshop',
      points: [
        'Feste Sträuße mit Foto, Größen und Preis',
        'Wunschtermin mit Bestellschluss für denselben Tag',
        'Abholung im Laden oder Lieferung nach Postleitzahl',
        'Grußkarte und Hinweis für die Zustellung',
        'Bezahlung im Netz und Bestätigung per E-Mail',
        'Saisonhinweise vor Valentinstag, Muttertag und Advent'
      ],
      image: {
        src: '/images/branchen/blumenladen/blumenladen-angebot.webp',
        alt: 'Beispielaufbau einer Shopseite für einen Blumenladen mit sechs Angeboten vom Strauß der Woche bis zum Gutschein',
        width: 720,
        height: 540
      }
    },
    {
      type: 'timeline',
      id: 'alltag',
      chip: 'Beispiel',
      title: 'Ein Tag mit deiner Blumenladen-Website',
      intro: 'Eine gute Website arbeitet mit, während du bindest, berätst und auslieferst. So kann ein gewöhnlicher Tag aussehen. Die Zeiten sind ein Beispiel.',
      listLabel: 'Beispiel für einen Tag mit der Website eines Blumenladens',
      items: [
        { time: '07:30', title: 'Vorbestellungen auf einen Blick', text: 'Vor dem Großmarkt siehst du im Postfach, welche Sträuße heute abgeholt werden.' },
        { time: '09:00', title: 'Strauß der Woche einstellen', text: 'Foto hochladen, Preis eintragen, speichern. Das dauert zwei Minuten.' },
        { time: '11:30', title: 'Gefunden in der Mittagspause', text: 'Jemand sucht „Blumenladen in der Nähe“ und sieht Öffnungszeiten, Route und deine Sträuße.' },
        { time: '14:00', title: 'Anfrage für eine Hochzeit', text: 'Das Formular fragt Datum, Farbwelt und Budget ab. Du rufst zurück, wenn es im Laden ruhig ist.' },
        { time: '16:30', title: 'Lieferung am selben Tag', text: 'Die Seite zeigt den Bestellschluss und die Postleitzahlen, in die du lieferst.' },
        { time: '20:00', title: 'Bestellen nach Ladenschluss', text: 'Der Strauß für Samstag wird abends auf dem Sofa bestellt. Die Bestätigung geht von allein raus.' }
      ],
      note: 'Du musst nicht mit allem auf einmal starten. Viele Floristen beginnen mit der Bestellanfrage und ergänzen die Vorbestellung zur Abholung vor Valentinstag oder Muttertag.'
    },
    {
      type: 'catalog',
      id: 'schwerpunkte',
      soft: true,
      chip: 'Schwerpunkte',
      title: 'Websites für Floristen, Blumenläden und Gärtnereien',
      intro: 'Ob Laden im Kiez, Floristik-Atelier oder Gärtnerei mit Verkauf: Die Grundlagen sind gleich, die Schwerpunkte unterscheiden sich. Die Übersicht zeigt, welche Inhalte sich lohnen und wie typische Suchen in Berlin aussehen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Blumenladen im Kiez', pages: ['Sortiment und Sträuße der Woche', 'Öffnungszeiten, Anfahrt und Lieferung', 'Anlässe vom Geburtstag bis zur Trauer'], searches: ['Blumenladen Prenzlauer Berg', 'Blumen liefern Berlin'] },
        { name: 'Floristik-Atelier und Hochzeitsfloristik', pages: ['Portfolio mit Hochzeiten und Events', 'Ablauf von der Beratung bis zum Aufbau', 'Anfrage mit Datum, Ort und Budget'], searches: ['Hochzeitsfloristik Berlin', 'Florist Hochzeit Brandenburg'] },
        { name: 'Trauerfloristik', pages: ['Kränze, Gestecke und Sargschmuck', 'Bestellung mit Lieferung zur Trauerfeier', 'Zusammenarbeit mit Bestattern'], searches: ['Trauerkranz bestellen Berlin', 'Trauerfloristik Spandau'] },
        { name: 'Gärtnerei mit Verkauf', pages: ['Pflanzensortiment nach Saison', 'Beet-, Balkon- und Gemüsepflanzen', 'Abholung, Lieferung oder Pflanzenshop'], searches: ['Gärtnerei Berlin', 'Balkonpflanzen kaufen Berlin'] },
        { name: 'Firmenkunden und Abos', pages: ['Blumen-Abo für Büro, Praxis und Hotel', 'Dekoration für Empfang und Events', 'Rechnung und feste Liefertermine'], searches: ['Blumen Abo Büro Berlin', 'Firmenblumen Berlin'] }
      ],
      related: {
        title: 'Vertiefung im Blog',
        text: 'Wie du als Blumenladen bei Google sichtbarer wirst, erkläre ich ausführlich in einem eigenen Artikel:',
        links: [{ label: 'SEO für Blumenläden', href: '/blog/seo-fuer-blumenladen' }]
      }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Blumenladen in der Nähe“ gefunden werden',
      paragraphs: [
        'Wer spontan Blumen braucht, sucht meist auf dem Handy nach „Blumenladen in der Nähe“ oder nach Blumen in seinem Bezirk. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit dein Laden dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich, auch an Feiertagen aktuell',
        'Die Kategorie Florist im Google-Profil und passende Zusatzkategorien',
        'Regelmäßig neue Fotos von Sträußen und Schaufenster im Profil',
        'Eigene Seiten für Anlässe wie Hochzeit und Trauer, mit Ort im Text',
        'Bewertungen nach Hochzeiten und Events aktiv anfragen'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLinks: [
        { href: '/blog/seo-fuer-blumenladen', label: 'SEO für Blumenläden' },
        { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
      ]
    },
    {
      type: 'case',
      id: 'praxisbeispiel',
      soft: true,
      chip: 'Praxisbeispiel',
      title: 'Praxisbeispiel aus dem lokalen Handel: Zur alten Backstube',
      text: 'Ein Café in Berlin-Rosenthal hat dieselbe Aufgabe wie ein Blumenladen: Atmosphäre zeigen, Infos für den Besuch bündeln und einen einfachen Weg zur Bestellung oder Reservierung bieten. Vorher ließen sich Tische nur per Telefon reservieren.',
      doneTitle: 'Was ich umgesetzt habe',
      done: [
        'Eine ruhige Seitenstruktur für Angebot, Atmosphäre und Kontakt',
        'Bildsprache und Texte passend zur warmen, lokalen Ausrichtung',
        'Besuchsinfos und Reservierung sichtbar in den wichtigsten Bereichen'
      ],
      resultTitle: 'Ergebnis',
      result: [
        'Gäste finden Angebot, Atmosphäre und Reservierung schneller',
        'Der Betrieb hat eine klare Adresse für Empfehlungen, Social Media und die lokale Suche'
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
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für einen Blumenladen?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob online bestellt und bezahlt werden soll. Für Blumenläden passen meist diese Pakete:',
      fits: {
        start: 'Für kleine Läden: Onepager oder bis zu drei Seiten mit Sortiment, Öffnungszeiten, Lieferung und Bestellanfrage.',
        business: 'Für die meisten Blumenläden: eigene Seiten für Anlässe, Hochzeit und Trauer, Galerie und Bestellanfrage, rund vier bis sieben Seiten.',
        wachstum: 'Für Gärtnereien mit großem Sortiment, mehrere Standorte oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Vorbestellung oder ein kleiner Onlineshop sind Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional und werden separat vereinbart.'
    },
    {
      type: 'gallery',
      id: 'beispielaufbau',
      soft: true,
      chip: 'Beispielaufbau',
      title: 'So kann die Website für Floristen aufgebaut sein',
      intro: 'Drei Ansichten zeigen, wie Startseite, Bestellung und lokale Suche zusammenspielen. Es sind Skizzen, kein fertiges Design. Deine Website bekommt eigene Farben, eigene Texte und Fotos von deinen Sträußen.',
      items: [
        { src: '/images/branchen/blumenladen/blumenladen-startseite.webp', alt: 'Beispielaufbau der Startseite eines Blumenladens mit Überschrift, Bestellknopf und drei Themenkacheln', width: 720, height: 540, title: 'Startseite', caption: 'Beispielaufbau: Oben stehen Angebot, Kiez und der Knopf zum Bestellen, darunter Lieferung, Hochzeit und Öffnungszeiten.' },
        { src: '/images/branchen/blumenladen/blumenladen-anfrage.webp', alt: 'Beispielaufbau eines Bestellformulars auf dem Handy mit Anlass, Budget und Wunschtermin für einen Strauß', width: 720, height: 540, title: 'Bestellung auf dem Handy', caption: 'Beispielaufbau: Anlass, Budget und Wunschtermin in drei Feldern, danach Abholung oder Lieferung.' },
        { src: '/images/branchen/blumenladen/blumenladen-suche.webp', alt: 'Beispielaufbau eines lokalen Suchergebnisses für einen Blumenladen mit Öffnungszeiten, Route und Karte', width: 720, height: 540, title: 'Lokale Suche', caption: 'Beispielaufbau: So kann dein Laden bei „Blumenladen in der Nähe“ erscheinen, mit Öffnungszeiten, Route und Anruf.' }
      ],
      note: 'Farben, Schriften und Bilder richte ich nach deinem Laden aus. Wie fertige Websites aussehen, zeigen die Referenzen.',
      noteLink: { href: '/referenzen', label: 'Referenzen ansehen' }
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Sortiment, Anlässe, Lieferung, Bestellweg und welches Paket passt.' },
        { title: 'Seitenplan und Bilder', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte und Fotos deiner Arbeiten, gern direkt vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online, am besten vor der nächsten Saison.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und saisonale Änderungen oder du pflegst Angebote selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Mit Shop-Funktion hängt es vom Umfang ab.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Blumenläden' }
  ],
  cta: {
    title: 'Lass uns über deinen Blumenladen sprechen',
    text: 'Erzähl mir kurz, was dein Laden besonders macht und wie Kunden heute bestellen. Ich sage dir ehrlich, welche Seiten und welcher Bestellweg zu dir passen.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Individuelle Funktionen', href: '/pakete/individuell' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'dpa/Nordkurier: Zahl der Blumenläden laut Fachverband Deutscher Floristen und YouGov-Daten zum Blumenkauf, 30.04.2026', href: 'https://www.nordkurier.de/wirtschaft/in-deutschland-werden-deutlich-weniger-schnittblumen-gekauft-4542208' }
  ]
});
