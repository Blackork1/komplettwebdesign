// Inhalte der Seite /branchen/webdesign-friseur („Website für Friseure und Barbershops“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/friseur.md):
// Google-Suchvorschläge von Salons und Kundschaft, Konkurrenzseiten und die Pressemitteilung
// des Zentralverbands des Deutschen Friseurhandwerks vom 29.06.2026.

export const FRISEUR_CONTENT_UPDATED_ISO = '2026-11-11';

const ZV_SOURCE = 'Zentralverband Friseurhandwerk, Juni 2026';

export const FRISEUR_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für einen Friseursalon?',
    a: 'Eine kompakte Salon-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Leistungen, Preise, Team, Galerie und Jobs liegt das Business-Paket bei {{price.business}}, Salons mit mehreren Standorten oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Dein Buchungssystem binde ich in jedem Paket ein.'
  },
  {
    q: 'Brauche ich eine Website, wenn ich Instagram und ein Buchungsportal habe?',
    a: 'Instagram zeigt deine Arbeiten, das Portal deine freien Termine. Die eigene Website verbindet beides mit Preisen, Öffnungszeiten, Adresse und Team, und sie gehört dir. Sie ist das, was Google bei „Friseur in der Nähe“ neben deinem Unternehmensprofil auswertet, und sie bleibt, auch wenn ein Portal seine Bedingungen ändert.'
  },
  {
    q: 'Welche Online-Terminbuchung passt zu meinem Salon?',
    a: 'Meist die, die du schon nutzt. Ich verlinke oder binde sie so ein, dass der Termin-Button auf dem Handy immer sichtbar ist. Manche Portale mit Marktplatz berechnen für Neukunden Provision; über deine eigene Website gebuchte Termine laufen dann oft günstiger. Das prüfst du am besten in deinem Vertrag.'
  },
  {
    q: 'Sollte ich meine Preise auf der Website zeigen?',
    a: 'Ja. „Friseur Preise Damen Haarschnitt“ oder „Friseur Preise färben und schneiden“ werden ständig gesucht. Zeig ab-Preise nach Leistung, als Text statt als Foto vom Aushang, und achte darauf, dass sie zu deinem Preisverzeichnis im Salon passen.'
  },
  {
    q: 'Wie zeige ich, dass man auch ohne Termin kommen kann?',
    a: 'Mit einem klaren Hinweis direkt neben den Öffnungszeiten: wann Walk-in möglich ist, wie lange man ungefähr wartet und welche Leistungen ohne Termin gehen. „Friseur in der Nähe ohne Termin“ gehört zu den häufigsten Suchen, die Angabe bringt Laufkundschaft.'
  },
  {
    q: 'Darf ich Fotos von Kundinnen und Kunden zeigen?',
    a: 'Nur mit deren Einwilligung, am besten schriftlich, auch wenn die Fotos aus deinem Instagram-Profil kommen. Viele Salons zeigen Frisuren von hinten oder von der Seite. Das wirkt und ist rechtlich einfacher.'
  },
  {
    q: 'Was hilft gegen Terminausfälle?',
    a: 'Erinnerungen per SMS oder E-Mail aus dem Buchungssystem, eine klar formulierte Absageregel auf der Website und bei langen Farbterminen eine Bestätigung vorab. Ob und in welcher Höhe eine Ausfallgebühr verlangt werden darf, klärst du am besten mit deiner Innung oder einer Anwältin bzw. einem Anwalt.'
  },
  {
    q: 'Wie werde ich bei „Friseur in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Öffnungszeiten, Buchungslink, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Leistungen, Preise, Team und Kiez. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Preise und Öffnungszeiten selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Preise, Zeiten und Aktionen selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich Änderungen für dich.'
  },
  {
    q: 'Wie lange dauert es, bis meine Salon-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Preisliste und Fotos deiner Arbeiten früh vor, geht es schneller.'
  },
  {
    q: 'Wie viele Seiten braucht die Website eines Friseursalons?',
    a: 'Für einen kleinen Salon reicht oft ein Onepager mit Leistungen, Preisliste, Öffnungszeiten, Team und Buchung. Das deckt das Start-Paket ({{price.start}}) ab. Eigene Seiten für Preise, Galerie, Team, Gutscheine und Jobs lohnen sich, wenn du für einzelne Leistungen wie Balayage oder Locken gefunden werden willst. Dafür passt das Business-Paket mit etwa vier bis sieben Seiten ({{price.business}}).'
  },
  {
    q: 'Erstellst du auch Websites für Barbershops?',
    a: 'Ja. Bei Barbershops stehen Walk-in-Zeiten, Preise für Schnitt und Bart und Fotos der Arbeiten im Mittelpunkt. Die Gestaltung darf kräftiger sein als bei einem Damensalon, der Aufbau bleibt gleich: Wer die Seite öffnet, soll in wenigen Sekunden sehen, was es kostet, wann geöffnet ist und ob ein Termin nötig ist.'
  },
  {
    q: 'Kann ich Gutscheine über die Salon-Website verkaufen?',
    a: 'Ja. Am einfachsten ist eine Gutscheinanfrage per Formular: Die Kundin nennt Wert und Anlass, du stellst den Gutschein aus, bezahlt wird im Salon oder per Überweisung. Das geht in jedem Paket. Ein Verkauf mit Bezahlung im Netz und automatischem Versand gehört zum Individuell-Paket ({{price.individuell}}) oder läuft über dein Buchungssystem, wenn es Gutscheine anbietet.'
  },
  {
    q: 'Friseur-Website selbst bauen oder erstellen lassen?',
    a: 'Ein Baukasten kann für den Anfang reichen, wenn du Texte, Fotos und Technik selbst übernimmst. Oft bleibt die Seite dann halb fertig, weil der Salon vorgeht. Bei mir bekommst du Seitenplan, Texte, Gestaltung und Umsetzung aus einer Hand, dazu eine kurze Ladezeit auf dem Handy und saubere Angaben für die lokale Suche. Du sprichst dabei direkt mit mir und nicht mit wechselnden Ansprechpartnern.'
  },
  {
    q: 'Wie stelle ich mein Team auf der Website vor?',
    a: 'Mit einem Foto und zwei oder drei Sätzen je Person: Schwerpunkte wie Locken, Balayage oder Fades, Arbeitstage und der direkte Weg zur Buchung bei dieser Person. Viele buchen gezielt bei jemandem, dessen Arbeiten sie gesehen haben. Verlässt jemand den Salon, sollte das Profil zeitnah verschwinden. Auf Wunsch änderst du das selbst.'
  },
  {
    q: 'Soll ich meine Pflegeprodukte auf der Website zeigen?',
    a: 'Zeigen ja, verkaufen nur mit Bedacht. Ein kurzer Abschnitt nennt die Marken, mit denen du arbeitest, und dass es sie im Salon zu kaufen gibt. Das beantwortet eine häufige Frage und macht kaum Arbeit. Ein Produktshop mit Bezahlung und Versand gehört zum Individuell-Paket ({{price.individuell}}) und lohnt sich erst, wenn du Lager und Versand wirklich betreuen willst.'
  }
]);

export const FRISEUR_PAGE = Object.freeze({
  slug: 'friseur',
  path: '/branchen/webdesign-friseur',
  breadcrumb: 'Friseure',
  trackPrefix: 'friseur',
  motion: true,
  tone: 'floral',
  metaTitle: 'Friseur-Website erstellen lassen | Friseursalon Berlin',
  metaDescription: 'Website für Friseure und Barbershops in Berlin: Online-Termin, Preisliste, Walk-in-Zeiten und Team klar zeigen und lokal gefunden werden. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Friseure',
    serviceType: ['Website für Friseursalons', 'Website für Barbershops', 'Friseur-Homepage', 'Local SEO für Friseure'],
    audienceType: 'Friseursalons und Barbershops'
  },
  hero: {
    chip: 'Webdesign für Friseure',
    h1: 'Website für Friseure und Barbershops in Berlin erstellen lassen',
    lead: 'Wer einen neuen Friseur sucht, entscheidet auf dem Handy: Was kostet ein Schnitt, ist heute noch etwas frei, und gefällt mir, was der Salon macht? Deine Website zeigt Preise, Arbeiten und Team und führt mit einem Tipp zur Terminbuchung. Ich plane und baue sie persönlich, passend zum Stil deines Salons.',
    highlights: [
      'Online-Termin oder Walk-in klar geregelt',
      'Preisliste, die auf dem Handy lesbar ist',
      'Gefunden werden bei „Friseur in der Nähe“'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1761070131/admin_gallery/bjj8ucbepxloxywkuwsr.webp',
    imageAlt: 'Aufgeschlagenes Buch mit gezeichneten Herrenfrisuren in verschiedenen Schnitten',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Friseursalons online überzeugen müssen',
      paragraphs: [
        'Das Friseurhandwerk ist groß und hart umkämpft: Ende 2025 waren laut Zentralverband des Deutschen Friseurhandwerks 80.118 Salons in die Handwerksrolle eingetragen. Die Preise für Friseurdienstleistungen stiegen 2025 im Schnitt um 3,6 Prozent. Kundinnen und Kunden vergleichen deshalb genauer, was sie für ihr Geld bekommen.',
        'Verglichen wird online. Gesucht wird „Friseur in der Nähe ohne Termin“, „Friseur Termin online buchen Berlin“, „Friseur Preise Damen Haarschnitt“ oder „Barber Berlin Kreuzberg“. Ein Salon, der Preise, Arbeiten und freie Termine zeigt, wird gewählt. Instagram zeigt deine Arbeiten, deine Website verbindet sie mit Preisen, Terminen und Adresse.'
      ],
      stats: [
        { value: '80.118', label: 'Friseursalons in der Handwerksrolle, Ende 2025', source: ZV_SOURCE },
        { value: '+3,6 %', label: 'Preisanstieg für Friseurdienstleistungen im Jahr 2025', source: ZV_SOURCE },
        { value: '7,7 Mrd. €', label: 'Umsatz der umsatzsteuerpflichtigen Friseurunternehmen 2024', source: ZV_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Friseursalons gehört',
      intro: 'Diese Inhalte suchen Kundinnen und Kunden, bevor sie buchen oder vorbeikommen. Zugleich helfen sie Google, deinen Salon den richtigen Leistungen und dem Kiez zuzuordnen.',
      items: [
        { icon: 'fa-calendar-check', title: 'Online-Termin', text: 'Der Button zu deinem Buchungssystem, auf dem Handy immer sichtbar. „Friseur Termin online buchen“ ist eine der häufigsten Suchen.' },
        { icon: 'fa-door-open', title: 'Ohne Termin', text: 'Ob und wann Walk-in möglich ist. „Friseur in der Nähe ohne Termin“ wird sehr oft gesucht, eine klare Angabe bringt Laufkundschaft.' },
        { icon: 'fa-tags', title: 'Preisliste', text: 'Damen, Herren, Kinder, Farbe und Pflege mit ab-Preisen, als Text statt Foto vom Aushang. So ist sie auf dem Handy lesbar.' },
        { icon: 'fa-images', title: 'Arbeiten und Galerie', text: 'Eigene Fotos von Schnitten, Farben und Stylings, gern direkt mit deinem Instagram-Profil verknüpft.' },
        { icon: 'fa-people-group', title: 'Team und Spezialisierungen', text: 'Wer schneidet, wer färbt, wer ist Spezialist für Locken, Balayage oder Fades. Viele buchen gezielt bei einer Person.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten', text: 'Aktuelle Zeiten inklusive langer Abende und Samstage. Gesucht wird oft „jetzt geöffnet“.' },
        { icon: 'fa-receipt', title: 'Gutscheine', text: 'Gutscheine zum Verschenken, im Salon oder online erhältlich, mit klarem Hinweis, wie sie eingelöst werden.' },
        { icon: 'fa-user-plus', title: 'Jobs und Ausbildung', text: 'Offene Stellen und Ausbildungsplätze mit kurzem Bewerbungsweg. Die Zahl neuer Ausbildungsverträge im Friseurhandwerk steigt wieder.' }
      ]
    },
    {
      type: 'thema',
      variant: 'farbfaecher',
      id: 'spezialisierungen',
      chip: 'SEO für Friseure',
      title: 'SEO für Friseure: mit Spezialisierungen gefunden werden',
      intro: 'Bei „Friseur Berlin“ konkurrierst du mit Hunderten Salons. Gefunden wirst du eher über das, was dich ausmacht: „Friseur ohne Termin Mitte“, „Balayage Berlin“, „Locken schneiden Berlin“, „Barber Neukölln“. Jede Spezialisierung bekommt einen eigenen Abschnitt oder eine eigene Seite mit Fotos, Dauer und Preisrahmen.',
      swatches: [
        { name: 'Ohne Termin', color: 'blond', query: 'Friseur ohne Termin Mitte', text: 'Tage und Zeiten für spontane Besuche, dazu ein Hinweis auf die Wartezeit am Samstag.' },
        { name: 'Balayage und Strähnen', color: 'kupfer', query: 'Balayage Berlin', text: 'Echte Fotos vorher und nachher, Dauer, Preis ab und Beratung vorab.' },
        { name: 'Locken', color: 'braun', query: 'Locken schneiden Berlin', text: 'Deine Methode erklärt, Pflege für zu Hause und ein Termin für den ersten Schnitt.' },
        { name: 'Herren und Barber', color: 'schwarz', query: 'Barber Neukölln', text: 'Haarschnitt, Bart und Rasur mit Preisen, Online-Termin oder spontan vorbeikommen.' },
        { name: 'Braut und Anlass', color: 'rose', query: 'Brautfrisur Berlin', text: 'Probetermin, Ablauf am Hochzeitstag und Styling auch vor Ort.' },
        { name: 'Kinder', color: 'silber', query: 'Kinderfriseur Berlin', text: 'Ab welchem Alter, wie lange es dauert und was ein Kinderhaarschnitt kostet.' }
      ],
      note: 'Biete nur an, was du wirklich gern machst. Eine starke Spezialisierung bringt mehr passende Anfragen als eine lange Liste.'
    },
    {
      type: 'feature',
      id: 'preisliste',
      soft: true,
      chip: 'Preisliste',
      title: 'Friseur-Website erstellen lassen: eine Preisliste, die auf dem Handy lesbar ist',
      paragraphs: [
        'Die Preisliste gehört bei Salons meist zu den Seiten, die am häufigsten geöffnet werden. Trotzdem ist sie oft ein Foto vom Aushang oder ein PDF, das auf dem Handy erst geladen und dann vergrößert werden muss. Google erfasst Text deutlich besser als ein Foto, und wer unterwegs „Friseur Preise“ sucht, gibt nach zwei Versuchen auf. Eine Preisliste als Text löst beides.',
        'Gut lesbar wird die Liste mit klaren Gruppen: Damen, Herren, Kinder, Farbe und Pflege. Jede Zeile nennt Leistung und Ab-Preis, bei Farbe und langen Haaren mit dem Hinweis, wovon der Endpreis abhängt. Pakete wie Waschen, Schneiden, Föhnen stehen als eine Zeile da, so wie Kundinnen und Kunden danach fragen. Direkt unter jeder Gruppe steht der Knopf zur Buchung.',
        'Offen gesagt: Bei Farbe lässt sich nicht jeder Preis vorab festlegen. Dann ist eine ehrliche Spanne besser als ein niedriger Lockpreis, der im Salon nicht hält. Die Preise auf der Website sollten außerdem zum Aushang im Salon passen. Auf Wunsch richte ich die Liste so ein, dass du Preise selbst änderst.'
      ],
      pointsTitle: 'So wird die Preisliste lesbar',
      points: [
        'Als Text statt als Foto oder PDF',
        'Gruppen für Damen, Herren, Kinder, Farbe und Pflege',
        'Ab-Preise mit Hinweis, wovon der Endpreis abhängt',
        'Übliche Dauer bei langen Terminen wie Balayage',
        'Knopf zur Buchung unter jeder Gruppe',
        'Dieselben Preise wie im Aushang und im Buchungssystem'
      ],
      image: {
        src: '/images/branchen/friseur/friseur-angebot.webp',
        alt: 'Beispielaufbau einer Preisliste für einen Friseursalon mit den Gruppen Damen sowie Herren und Kinder',
        width: 720,
        height: 1080
      }
    },
    {
      type: 'catalog',
      id: 'salonarten',
      chip: 'Salonarten',
      title: 'Websites für Salons, Barbershops und Spezialisten',
      intro: 'Ein Barbershop braucht andere Seiten als ein Salon für Coloration oder ein mobiler Friseur. Die Übersicht zeigt, welche Inhalte sich lohnen und wie in Berlin tatsächlich gesucht wird.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Damen- und Herrensalon', pages: ['Preisliste nach Leistung', 'Team mit Spezialisierungen', 'Online-Termin'], searches: ['Friseur Berlin Prenzlauer Berg', 'Friseur Preise Damen Haarschnitt'] },
        { name: 'Barbershop', pages: ['Fades, Bart und Rasur mit Preisen', 'Walk-in-Zeiten', 'Galerie mit Schnitten'], searches: ['Barber Berlin Kreuzberg', 'Barber Berlin ohne Termin'] },
        { name: 'Coloration und Balayage', pages: ['Farbtechniken verständlich erklärt', 'Ablauf und Dauer', 'Preise und Beratungstermin'], searches: ['Friseur Preise färben und schneiden', 'Friseur Berlin Charlottenburg'] },
        { name: 'Salon mit Walk-in', pages: ['Wann es ohne Termin geht', 'Wartezeit und Ablauf', 'Preise auf einen Blick'], searches: ['Friseur in der Nähe ohne Termin', 'Friseur Berlin günstig ohne Termin'] },
        { name: 'Mobiler Friseur und Kinderfriseur', pages: ['Einsatzgebiet und Anfahrt', 'Termine zu Hause oder in Einrichtungen', 'Preise inklusive Anfahrt'], searches: ['Friseur Berlin Schöneberg', 'Friseur in der Nähe online Termin'] }
      ],
      related: {
        title: 'Kosmetik oder Nägel?',
        text: 'Für Kosmetik-, Nagel- und Wimpernstudios gibt es eine eigene Seite:',
        links: [{ label: 'Website für Kosmetikstudios', href: '/branchen/webdesign-beautysalon' }]
      }
    },
    {
      type: 'columns',
      id: 'terminwege',
      soft: true,
      chip: 'Terminwege',
      title: 'Online-Termin, Walk-in oder Anruf: welcher Weg passt?',
      intro: 'Die meisten Salons kombinieren zwei Wege. Wichtig ist, dass die Website klar sagt, welcher gilt, damit niemand umsonst vorbeikommt oder in der Warteschleife hängt.',
      items: [
        { title: 'Online-Buchung', text: 'Kundinnen und Kunden wählen Leistung, Person und Uhrzeit selbst.', points: ['Termine rund um die Uhr', 'Erinnerungen per SMS oder E-Mail', 'Weniger Telefonate im Salon'], label: 'Für Salons mit festem Team' },
        { title: 'Walk-in', text: 'Kundschaft kommt ohne Termin vorbei.', points: ['Feste Walk-in-Zeiten auf der Website', 'Hinweis auf die übliche Wartezeit', 'Preise vorab sichtbar'], label: 'Für Barbershops und schnelle Schnitte' },
        { title: 'Anruf und WhatsApp', text: 'Für Stammkundschaft und persönliche Beratung.', points: ['Anruf-Button immer sichtbar', 'WhatsApp für kurze Fragen', 'Rückruf vor langen Farbterminen'], label: 'Für kleine Salons' }
      ],
      note: 'Buchungssysteme, die du schon nutzt, binde ich in jedem Paket ein. Deren Gebühren zahlst du direkt beim Anbieter.'
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Preisliste, Fotos und Pflichtangaben',
      paragraphs: [
        'Für Friseure gilt die Preisangabenverordnung: Nach § 12 PAngV gehört ein Preisverzeichnis für die wesentlichen Leistungen in den Salon und, wenn vorhanden, ins Schaufenster. Die Preise auf der Website sollten dazu passen. Fotos von Kundinnen und Kunden brauchen deren Einwilligung, und für die Online-Buchung gelten Datenschutzregeln.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Preise als Endpreise inklusive Umsatzsteuer, passend zum Aushang im Salon',
        'Fotos von Kundinnen und Kunden nur mit Einwilligung, auch bei eingebundenen Instagram-Beiträgen',
        'Impressum nach § 5 DDG mit Handwerkskammer und Berufsbezeichnung',
        'Datenschutzerklärung, die zu Buchungssystem und Instagram-Einbindung passt',
        'Barrierearme Gestaltung; das BFSG nimmt Kleinstunternehmen bei Dienstleistungen aus'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das deine Innung, die Handwerkskammer oder eine Anwältin bzw. ein Anwalt.',
      noteLinks: [
        { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' },
        { href: '/blog/barrierefreie-website-bfsg', label: 'Barrierefreie Website und BFSG' }
      ]
    },
    {
      type: 'gallery',
      id: 'beispielaufbau',
      soft: true,
      chip: 'Beispielaufbau',
      title: 'So kann die Website für deinen Salon aufgebaut sein',
      intro: 'Drei Ansichten zeigen, wie Startseite, Terminbuchung und lokale Suche zusammenspielen. Es sind Skizzen, kein fertiges Design. Deine Website bekommt eigene Farben und echte Fotos von Salon, Team und deinen Arbeiten.',
      items: [
        { src: '/images/branchen/friseur/friseur-startseite.webp', alt: 'Beispielaufbau der Startseite eines Friseursalons mit Überschrift, Knopf zur Terminbuchung und drei Themenkacheln', width: 720, height: 480, title: 'Startseite', caption: 'Beispielaufbau: Angebot, Kiez und der Knopf zum Termin stehen oben, darunter Schnitt, Farbe und Preise.' },
        { src: '/images/branchen/friseur/friseur-anfrage.webp', alt: 'Beispielaufbau einer Terminbuchung für den Friseur auf dem Handy mit Leistung, Wunschtermin und Stylistin', width: 720, height: 480, title: 'Terminbuchung', caption: 'Beispielaufbau: Leistung, Wunschtermin und Stylistin in drei Feldern, dazu der Hinweis, ob es der erste Besuch ist.' },
        { src: '/images/branchen/friseur/friseur-suche.webp', alt: 'Beispielaufbau eines lokalen Suchergebnisses für einen Friseursalon mit Öffnungszeiten, Route und Karte', width: 720, height: 480, title: 'Lokale Suche', caption: 'Beispielaufbau: So kann dein Salon bei „Friseur in der Nähe“ erscheinen, mit Öffnungszeiten, Route und Anruf.' }
      ],
      note: 'Farben, Schriften und Bilder richte ich nach deinem Salon aus. Wie fertige Websites aussehen, zeigen die Referenzen.',
      noteLink: { href: '/referenzen', label: 'Referenzen ansehen' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Friseur in der Nähe“ gefunden werden',
      paragraphs: [
        'Gesucht wird mit Kiez, Zeit oder Leistung: „Friseur Berlin Lichtenberg“, „Friseur in der Nähe jetzt geöffnet“ oder „Barber Berlin Mitte“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit dein Salon dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich',
        'Buchungslink im Google-Profil und auf der Website',
        'Regelmäßig neue Fotos von Arbeiten und Salon im Profil',
        'Bewertungen aktiv anfragen und freundlich beantworten',
        'Leistungen wie Balayage, Locken oder Fades als eigene Abschnitte'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für einen Friseursalon?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und welche Funktionen eingebunden werden. Für Salons passen meist diese Pakete:',
      fits: {
        start: 'Für kleine Salons und Barbershops: Onepager oder bis zu drei Seiten mit Preisliste, Öffnungszeiten, Galerie und Buchungslink.',
        business: 'Für die meisten Salons: Seiten für Leistungen, Preise, Team, Galerie und Jobs, rund vier bis sieben Seiten.',
        wachstum: 'Für Salons mit mehreren Standorten oder eigener Academy oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Buchungssysteme binde ich in jedem Paket ein. Ein eigener Gutschein-Verkauf oder Produktshop ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Leistungen, Terminweg, Stil des Salons und welches Paket passt.' },
        { title: 'Seitenplan und Fotos', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Preisliste und Fotos deiner Arbeiten, gern vom Handy oder aus Instagram.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen, oder du pflegst Preise und Aktionen selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Friseure' }
  ],
  cta: {
    title: 'Lass uns über deinen Salon sprechen',
    text: 'Erzähl mir kurz, was deinen Salon ausmacht, wie Kundinnen und Kunden heute Termine machen und was dich am meisten Zeit kostet. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website für Kosmetikstudios', href: '/branchen/webdesign-beautysalon' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'Zentralverband des Deutschen Friseurhandwerks: Die wirtschaftliche Lage des Friseurhandwerks, 29.06.2026', href: 'https://friseurhandwerk.de/wp-content/uploads/2026/07/PM2026_06_Wirtschaftliche-Lage-im-Friseurhandwerk-2.pdf' },
    { label: '§ 12 Preisangabenverordnung: Preisangaben bei Leistungen', href: 'https://www.gesetze-im-internet.de/pangv_2022/__12.html' },
    { label: '§ 22 Kunsturhebergesetz: Recht am eigenen Bild', href: 'https://www.gesetze-im-internet.de/kunsturhg/__22.html' },
    { label: '§ 3 BFSG (Gesetz zur Barrierefreiheit): Ausnahme für Kleinstunternehmen', href: 'https://www.gesetze-im-internet.de/bfsg/__3.html' }
  ]
});
