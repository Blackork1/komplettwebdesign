// Inhalte der Seite /branchen/webdesign-friseur („Website für Friseure und Barbershops“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/friseur.md):
// Google-Suchvorschläge von Salons und Kundschaft, Konkurrenzseiten und die Pressemitteilung
// des Zentralverbands des Deutschen Friseurhandwerks vom 29.06.2026.

export const FRISEUR_CONTENT_UPDATED_ISO = '2026-10-29';

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
  }
]);

export const FRISEUR_PAGE = Object.freeze({
  slug: 'friseur',
  path: '/branchen/webdesign-friseur',
  breadcrumb: 'Friseure',
  trackPrefix: 'friseur',
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
