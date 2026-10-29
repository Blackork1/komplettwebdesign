// Inhalte der Seite /branchen/webdesign-wellness („Website für Massage, Wellness und Day Spa“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/wellness.md):
// Google-Suchvorschläge von Praxen und Kundschaft, Suchergebnisse, Masseur- und Physiotherapeutengesetz,
// Heilmittelwerbegesetz und die Verjährungsregeln für Gutscheine.

export const WELLNESS_CONTENT_UPDATED_ISO = '2026-10-29';

export const WELLNESS_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für eine Massagepraxis?',
    a: 'Eine kompakte Website für eine Einzelpraxis oder mobile Massage startet bei Komplett Webdesign {{price.start}}. Mit Seiten für Massagearten, Preise, Gutscheine, Team und Räume liegt das Business-Paket bei {{price.business}}, Day Spas und größere Studios im Wachstum-Paket bei {{price.wachstum}}.'
  },
  {
    q: 'Wie verkaufe ich Gutscheine über die Website?',
    a: 'Am einfachsten über dein Buchungssystem, falls es einen Gutschein-Verkauf hat: Kundinnen und Kunden zahlen online und bekommen den Gutschein per E-Mail. Einen eigenen Gutschein-Shop mit Motiven nach Anlass setze ich im Individuell-Paket um. „Massage Gutschein Berlin“ gehört zu den häufigsten Suchen, ein sichtbarer Gutschein-Bereich lohnt sich fast immer.'
  },
  {
    q: 'Wie lange müssen Gutscheine gültig sein?',
    a: 'Die regelmäßige Verjährungsfrist beträgt drei Jahre und beginnt am Ende des Jahres, in dem der Gutschein gekauft wurde. Kürzere Fristen sind nicht automatisch wirksam und sollten rechtlich geprüft werden. Auf der Website und dem Gutschein selbst steht die Gültigkeit klar lesbar.'
  },
  {
    q: 'Brauche ich eine Online-Buchung?',
    a: 'Für Massagen fast immer. Gesucht wird „Massage Berlin heute“ oder „Massage in der Nähe online buchen“, oft abends. Wer dann freie Termine sieht und direkt buchen kann, kommt. Und du musst während einer Behandlung nicht ans Telefon. Vorhandene Buchungssysteme binde ich in jedem Paket ein.'
  },
  {
    q: 'Darf ich schreiben, dass eine Massage gegen Rückenschmerzen hilft?',
    a: 'Bei Wellness-Massagen solltest du keine Heilwirkung versprechen, sonst greift das Heilmittelwerbegesetz. Beschreibe stattdessen Ablauf, Dauer und das Gefühl danach. Medizinische Massagen auf Verordnung beschreibst du sachlich, wenn die Behandlung von entsprechend ausgebildeten Fachkräften durchgeführt wird.'
  },
  {
    q: 'Wie zeige ich Preise richtig?',
    a: 'Als Endpreise je Dauer, etwa für 30, 60 und 90 Minuten, inklusive Umsatzsteuer und passend zum Preisverzeichnis in deinen Räumen. Pakete für Paare oder Kombinationen mit Sauna zeigst du mit allen Bestandteilen.'
  },
  {
    q: 'Wie grenze ich mich von unseriösen Angeboten ab?',
    a: 'Mit klaren Angaben: wer behandelt und mit welcher Ausbildung, echte Fotos der Räume, vollständige Preise, Hausregeln und ein ordentliches Impressum. Ein ruhiger, sachlicher Auftritt ohne zweideutige Bilder und Formulierungen sorgt dafür, dass genau die Kundschaft kommt, die du willst.'
  },
  {
    q: 'Wie werde ich bei „Massage in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Öffnungszeiten, Buchungslink, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Massagearten, Preise, Gutscheine, Bezirk und Anfahrt. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Angebote und Preise selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Massagen, Preise und Saisonangebote selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich Änderungen für dich.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Angebote, Preise und Fotos der Räume früh vor, geht es schneller.'
  }
]);

export const WELLNESS_PAGE = Object.freeze({
  slug: 'wellness',
  path: '/branchen/webdesign-wellness',
  breadcrumb: 'Massage und Wellness',
  trackPrefix: 'wellness',
  metaTitle: 'Massage-Website erstellen lassen | Wellness & Spa Berlin',
  metaDescription: 'Website für Massagepraxen, Wellness-Studios und Day Spas in Berlin: Massagen mit Preisen, Online-Buchung und Gutscheinverkauf. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Massage und Wellness',
    serviceType: ['Website für Massagepraxen', 'Website für Wellness-Studios', 'Website für Day Spas', 'Local SEO für Massage und Wellness'],
    audienceType: 'Massagepraxen, Wellness-Studios und Day Spas'
  },
  hero: {
    chip: 'Webdesign für Massage und Wellness',
    h1: 'Website für Massagepraxen, Wellness-Studios und Day Spas in Berlin',
    lead: 'Wer eine Massage sucht, will wissen: Welche Massage passt zu mir, was kostet sie und wann ist ein Termin frei? Und wer ein Geschenk sucht, will einen Gutschein, am besten sofort. Deine Website erledigt beides, ruhig im Auftritt und schnell auf dem Handy. Ich plane und baue sie persönlich, passend zur Atmosphäre deiner Räume.',
    highlights: [
      'Massagen mit Dauer und Preis',
      'Online-Buchung und Gutscheine',
      'Wellness und Heilmittel sauber getrennt'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1761160614/admin_gallery/yntdqtbiojdgroau1twy.webp',
    imageAlt: 'Dunkler Spa-Bereich mit Whirlpool, Sauna und brennenden Kerzen',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Massagen online gebucht und verschenkt werden',
      paragraphs: [
        'Massagen werden spontan gesucht und oft verschenkt. Das zeigt sich in den Suchanfragen: „Massage Berlin heute“, „Massage in der Nähe online buchen“, „Thai Massage Berlin Mitte“ und vor allem „Massage Gutschein Berlin“, kombiniert mit fast jedem Bezirk. Dazu kommen Suchen nach „Day Spa Berlin zu zweit“ oder „Day Spa Berlin privat“.',
        'Wer hier mit klaren Angeboten, Preisen und einem Gutschein zum Sofort-Ausdrucken auftaucht, gewinnt Kundschaft, die sonst bei Portalen oder großen Hotels landet. Deine Website verkauft auch dann, wenn du gerade behandelst und nicht ans Telefon gehen kannst.',
        'Wichtig ist eine saubere Trennung: Wellness-Massagen dienen dem Wohlbefinden, medizinische Massagen sind Heilmittel. Was du wie bewerben darfst, hängt davon ab, wer die Behandlung durchführt und mit welcher Ausbildung.'
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website einer Massagepraxis gehört',
      intro: 'Diese Inhalte suchen Kundinnen und Kunden, bevor sie buchen oder einen Gutschein kaufen. Zugleich helfen sie Google, dein Angebot den richtigen Massagen und dem Bezirk zuzuordnen.',
      items: [
        { icon: 'fa-list-check', title: 'Massagen und Anwendungen', text: 'Thai-Massage, Hot Stone, Aromaöl, Sportmassage oder Paarmassage, jeweils mit Ablauf, Dauer und für wen sie passt.' },
        { icon: 'fa-tags', title: 'Preise', text: 'Preise je Dauer, etwa 30, 60 oder 90 Minuten, als Text auf der Website. „Massage in der Nähe Preise“ wird oft gesucht.' },
        { icon: 'fa-calendar-check', title: 'Online-Buchung', text: 'Freie Termine auch abends und am Wochenende buchbar, ohne dass du während einer Behandlung ans Telefon musst.' },
        { icon: 'fa-receipt', title: 'Gutscheine', text: 'Gutscheine für Massagen oder Beträge, am besten online zum Ausdrucken. „Massage Gutschein Berlin“ ist eine der häufigsten Suchen.' },
        { icon: 'fa-images', title: 'Räume und Atmosphäre', text: 'Eigene Fotos der Behandlungsräume, damit man vorher spürt, wie es bei dir ist.' },
        { icon: 'fa-people-group', title: 'Team und Qualifikation', text: 'Wer behandelt, mit welcher Ausbildung. Bei medizinischen Massagen ist die geschützte Berufsbezeichnung entscheidend.' },
        { icon: 'fa-circle-info', title: 'Vor dem ersten Termin', text: 'Was man mitbringen sollte, wann man besser absagt und wie früh man da sein sollte.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten und Anfahrt', text: 'Zeiten inklusive Abende und Wochenenden, Adresse, ÖPNV und Parkmöglichkeiten.' }
      ]
    },
    {
      type: 'catalog',
      id: 'angebote',
      chip: 'Angebote',
      title: 'Websites für Massagepraxen, Wellness-Studios und Day Spas',
      intro: 'Eine Praxis für medizinische Massage braucht andere Seiten als ein Thai-Massage-Studio oder ein Day Spa. Die Übersicht zeigt, welche Inhalte sich lohnen und wie in Berlin tatsächlich gesucht wird.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Massagepraxis mit Heilmitteln', pages: ['Massagen auf Verordnung', 'Kasse, privat und Selbstzahler', 'Berufsbezeichnung und Qualifikation'], searches: ['Massagepraxis Berlin', 'Massage Berlin Steglitz'] },
        { name: 'Thai- und Wellness-Massage', pages: ['Massagearten mit Ablauf', 'Preise nach Dauer', 'Online-Buchung'], searches: ['Thai Massage Berlin Mitte', 'Massage in der Nähe online buchen'] },
        { name: 'Day Spa', pages: ['Spa-Pakete und Tagesangebote', 'Private Spa für zwei', 'Gutscheine'], searches: ['Day Spa Berlin zu zweit', 'Day Spa Berlin privat'] },
        { name: 'Mobile Massage und Firmen', pages: ['Einsatzgebiet und Anfahrt', 'Angebote für Firmen', 'Anfrage mit Datum und Personenzahl'], searches: ['Massage Berlin heute', 'Massage Berlin Mitte'] },
        { name: 'Gutschein-Geschäft', pages: ['Gutscheine nach Anlass', 'Sofort-Download zum Ausdrucken', 'Einlösung und Gültigkeit'], searches: ['Massage Gutschein Berlin', 'Massage Gutschein Berlin Prenzlauer Berg'] }
      ],
      related: {
        title: 'Physiotherapie oder Kosmetik?',
        text: 'Für verwandte Branchen gibt es eigene Seiten:',
        links: [
          { label: 'Website für Physiotherapie-Praxen', href: '/branchen/webdesign-physiotherapie' },
          { label: 'Website für Kosmetikstudios', href: '/branchen/webdesign-beautysalon' }
        ]
      }
    },
    {
      type: 'columns',
      id: 'gutscheine',
      soft: true,
      chip: 'Gutscheine',
      title: 'Gutscheine verkaufen: drei Wege',
      intro: 'Gutscheine bringen Umsatz vor dem ersten Termin und neue Kundschaft, die sonst nicht gekommen wäre. Welcher Weg passt, hängt davon ab, wie viele du verkaufst.',
      items: [
        { title: 'Im Studio', text: 'Kundschaft kauft vor Ort oder nach einem Anruf.', points: ['Kein Technikaufwand', 'Hinweis auf der Website genügt', 'Bezahlung vor Ort'], label: 'Für den Einstieg' },
        { title: 'Über dein Buchungssystem', text: 'Viele Buchungssysteme verkaufen auch Gutscheine.', points: ['Online bezahlen', 'Gutschein per E-Mail', 'Einlösung im selben System'], label: 'Häufig passend' },
        { title: 'Eigener Gutschein-Shop', text: 'Gutscheine mit eigenem Design direkt auf deiner Website.', points: ['Motive nach Anlass', 'PDF zum Ausdrucken', 'Keine Portal-Provision'], label: 'Im Individuell-Paket' }
      ],
      note: 'Auf jedem Gutschein steht eine klare Gültigkeit. Die regelmäßige Verjährungsfrist beträgt drei Jahre; kürzere Fristen solltest du rechtlich prüfen lassen.'
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Wellness oder Heilmittel: was du wie bewerben darfst',
      paragraphs: [
        'Die Berufsbezeichnung „Masseurin und medizinische Bademeisterin“ bzw. „Masseur und medizinischer Bademeister“ ist gesetzlich geschützt, Massagen auf Verordnung sind Heilmittel. Wellness-Massagen dürfen dagegen keine Heilwirkung versprechen, sonst greift das Heilmittelwerbegesetz. Die Website muss zeigen, was du anbietest und wer es durchführt.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Wellness-Angebote ohne Heilversprechen wie „löst Bandscheibenprobleme“ beschreiben',
        'Medizinische Massagen nur mit passender Qualifikation und korrekter Berufsbezeichnung',
        'Preise als Endpreise inklusive Umsatzsteuer, passend zum Preisverzeichnis vor Ort',
        'Gutscheine mit klarer Gültigkeit und Einlösebedingungen',
        'Impressum nach § 5 DDG und Datenschutzerklärung für Buchung und Gutscheinverkauf'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das dein Berufsverband oder eine Anwältin bzw. ein Anwalt.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Massage in der Nähe“ gefunden werden',
      paragraphs: [
        'Gesucht wird mit Ort, Zeit und Anlass: „Massage Berlin Prenzlauer Berg“, „Massage in der Nähe jetzt geöffnet“ oder „Massage Gutschein Berlin Friedrichshain“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit deine Praxis dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich',
        'Eigene Abschnitte für Massagearten und Gutscheine, mit Bezirk im Text',
        'Buchungslink und Fotos der Räume im Google-Profil',
        'Bewertungen aktiv anfragen und freundlich beantworten',
        'Seriöser Auftritt mit klaren Angaben zu Team und Qualifikation'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für eine Massagepraxis?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Angebote und Seiten du brauchst und ob Gutscheine online verkauft werden. Für Praxen und Studios passen meist diese Pakete:',
      fits: {
        start: 'Für Einzelpraxen und mobile Massage: Onepager oder bis zu drei Seiten mit Massagen, Preisen, Buchungslink und Gutschein-Hinweis.',
        business: 'Für die meisten Praxen und Studios: Seiten für Massagearten, Preise, Gutscheine, Team und Räume, rund vier bis sieben Seiten.',
        wachstum: 'Für Day Spas und größere Studios mit vielen Angeboten und Firmenkunden oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Buchungssysteme mit Gutscheinverkauf binde ich in jedem Paket ein. Ein eigener Gutschein-Shop ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Angebote, Buchungsweg, Gutscheine und welches Paket passt.' },
        { title: 'Seitenplan und Fotos', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Angebotsliste, Preise und Fotos deiner Räume, gern vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, ruhig im Auftritt, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Saisonangebote und Preise pflegst du selbst, oder ich übernehme Wartung und Änderungen für dich.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Massage und Wellness' }
  ],
  cta: {
    title: 'Lass uns über deine Praxis sprechen',
    text: 'Erzähl mir kurz, welche Massagen du anbietest, wie heute gebucht wird und ob du Gutscheine verkaufst. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website für Physiotherapie-Praxen', href: '/branchen/webdesign-physiotherapie' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: '§ 1 Masseur- und Physiotherapeutengesetz: Geschützte Berufsbezeichnungen', href: 'https://www.gesetze-im-internet.de/mphg/__1.html' },
    { label: '§ 3 Heilmittelwerbegesetz: Irreführende Werbung', href: 'https://www.gesetze-im-internet.de/heilmwerbg/__3.html' },
    { label: '§ 12 Preisangabenverordnung: Preisangaben bei Leistungen', href: 'https://www.gesetze-im-internet.de/pangv_2022/__12.html' },
    { label: '§ 195 BGB: Regelmäßige Verjährungsfrist', href: 'https://www.gesetze-im-internet.de/bgb/__195.html' },
    { label: '§ 199 BGB: Beginn der regelmäßigen Verjährungsfrist', href: 'https://www.gesetze-im-internet.de/bgb/__199.html' }
  ]
});
