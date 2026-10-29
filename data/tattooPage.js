// Inhalte der Seite /branchen/webdesign-tattoo („Website für Tattoo-Studios“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/tattoo.md):
// Google-Suchvorschläge von Studios und Kundschaft, Suchergebnisse und die Bundestagsdrucksache 20/841,
// die eine YouGov-Umfrage von 2021 zitiert.

export const TATTOO_CONTENT_UPDATED_ISO = '2026-10-29';

const YOUGOV_SOURCE = 'YouGov 2021, zitiert in BT-Drucksache 20/841';

export const TATTOO_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für ein Tattoo-Studio?',
    a: 'Eine kompakte Website für ein Privatstudio oder einen Artist startet bei Komplett Webdesign {{price.start}}. Mit Artist-Seiten, Portfolio nach Stil, Walk-in und Regeln liegt das Business-Paket bei {{price.business}}, große Studios oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}.'
  },
  {
    q: 'Reicht Instagram nicht aus?',
    a: 'Instagram ist dein Portfolio und bleibt wichtig. Es beantwortet aber nicht, was ein Tattoo kostet, wie die Anzahlung läuft oder wann Walk-in ist, und bei Google wird nach genau diesen Dingen gesucht. Die Website erledigt das und verlinkt auf die Profile deiner Artists.'
  },
  {
    q: 'Sollte ich Preise auf der Website nennen?',
    a: 'Ja, als Rahmen: Mindestpreis, Stundensatz oder Preis je Sitzung und was den Preis beeinflusst, also Größe, Körperstelle, Stil und Detailgrad. „Tattoo Kosten Unterarm“ oder „Tattoo Kosten 10 cm“ werden ständig gesucht. Den genauen Preis nennst du nach der Anfrage.'
  },
  {
    q: 'Wie regle ich Anzahlung und Absage auf der Website?',
    a: 'Schreib klar auf, wie hoch die Anzahlung ist, ob sie verrechnet wird, bis wann ein Termin verschoben werden kann und wann sie verfällt. Lass die Regeln vor der Buchung bestätigen. „Tattoo Termin absagen Anzahlung zurück“ wird oft gesucht, klare Regeln vermeiden Streit. Den genauen Wortlaut lässt du am besten rechtlich prüfen.'
  },
  {
    q: 'Wie zeige ich Walk-in-Tage?',
    a: 'Mit einem eigenen Abschnitt und im Google-Profil: an welchen Tagen und zu welchen Zeiten, welche Motive dann möglich sind, etwa Flash-Designs mit festen Preisen, und wie lange man ungefähr wartet. „Tattoo Walk-in Berlin heute“ ist eine häufige Suche.'
  },
  {
    q: 'Darf ich Fotos von Tattoos meiner Kundschaft zeigen?',
    a: 'Nur mit Einwilligung, besonders wenn Gesicht oder andere Merkmale erkennbar sind. Viele Studios lassen sich die Nutzung direkt bei der Einverständniserklärung zum Tattoo bestätigen. Das gilt auch für Bilder, die du aus Instagram einbindest.'
  },
  {
    q: 'Kann man bei mir online einen Termin buchen?',
    a: 'Für Beratungstermine und Walk-in-Flashs funktioniert eine Online-Buchung gut. Für größere Motive ist eine Anfrage mit Motiv, Größe und Referenzbildern meist sinnvoller, weil Zeitbedarf und Preis vorher geklärt werden müssen. Vorhandene Buchungssysteme binde ich ein.'
  },
  {
    q: 'Sollte jeder Artist eine eigene Seite haben?',
    a: 'Ja, wenn mehrere Artists bei dir arbeiten. Viele Kundinnen und Kunden suchen nach einem Stil und wählen dann die Person. Eine Seite je Artist mit Stil, Portfolio, Instagram-Link und Anfrage-Button macht diese Wahl leicht und wird bei Google für Stilsuchen gefunden.'
  },
  {
    q: 'Wie werde ich bei „Tattoo Studio Berlin“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Öffnungszeiten, Walk-in-Hinweis, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Stile, Artists, Kiez und Preisrahmen. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Wie lange dauert es, bis meine Studio-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Portfolio-Auswahl, Regeln und Texte zu den Artists früh vor, geht es schneller.'
  }
]);

export const TATTOO_PAGE = Object.freeze({
  slug: 'tattoo',
  path: '/branchen/webdesign-tattoo',
  breadcrumb: 'Tattoo-Studios',
  trackPrefix: 'tattoo',
  metaTitle: 'Tattoo-Studio-Website erstellen lassen | Tattoo Berlin',
  metaDescription: 'Website für Tattoo-Studios und Tätowierer in Berlin: Artists mit Portfolio, Anfrage mit Motiv und Größe, Walk-in-Tage und klare Regeln. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Tattoo-Studios',
    serviceType: ['Website für Tattoo-Studios', 'Website für Tätowierer', 'Portfolio-Website für Tattoo-Artists', 'Local SEO für Tattoo-Studios'],
    audienceType: 'Tattoo-Studios und Tattoo-Artists'
  },
  hero: {
    chip: 'Webdesign für Tattoo-Studios',
    h1: 'Website für Tattoo-Studios und Tätowierer in Berlin',
    lead: 'Instagram zeigt deine Arbeiten. Aber wer ein Tattoo plant, hat Fragen, die ein Feed nicht beantwortet: Welcher Artist passt zu meinem Stil, was kostet es ungefähr, wie läuft die Anzahlung und gibt es Walk-in-Tage? Deine Website beantwortet das und sammelt Anfragen mit Motiv, Größe und Körperstelle. Ich plane und baue sie persönlich, im Stil deines Studios.',
    highlights: [
      'Artists mit Stil und Portfolio',
      'Anfrage mit Motiv, Größe und Referenzbildern',
      'Anzahlung, Absage und Walk-in klar geregelt'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1761232178/admin_gallery/zpajf67i0zah0c3r4eti.webp',
    imageAlt: 'Tattoo-Galerie mit acht Arbeiten, sortiert nach Stilen wie Blackwork, Realism, Japanese und Geometric',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Tattoo-Studios mehr als Instagram brauchen',
      paragraphs: [
        'Tattoos sind längst Alltag: Nach einer YouGov-Umfrage, auf die sich eine Anfrage im Bundestag stützt, hat fast jede vierte Person in Deutschland ein Tattoo, bei den 25- bis 34-Jährigen sind es rund 26 Prozent. In Berlin gibt es entsprechend viele Studios, und gesucht wird gezielt: „Tattoo Studio Berlin Fineline“, „Tattoo Berlin Walk-in“, „Tattoo Kosten Unterarm“ oder „Tattoo Termin online buchen“.',
        'Instagram bleibt dein Portfolio. Die Website erledigt den Rest: Sie zeigt, welcher Artist welchen Stil macht, erklärt, wie Preise entstehen, regelt Anzahlung und Absage und sammelt Anfragen so, dass du sofort weißt, ob das Projekt zu euch passt. Das spart viele Direktnachrichten mit der Frage, was ein kleines Tattoo kostet.'
      ],
      stats: [
        { value: 'Fast 1 von 4', label: 'Menschen in Deutschland hat ein Tattoo', source: YOUGOV_SOURCE },
        { value: 'rund 26 %', label: 'der 25- bis 34-Jährigen haben ein oder mehrere Tattoos', source: YOUGOV_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Tattoo-Studios gehört',
      intro: 'Diese Inhalte suchen Interessierte, bevor sie eine Anfrage schicken. Zugleich helfen sie Google, dein Studio den richtigen Stilen und dem Kiez zuzuordnen.',
      items: [
        { icon: 'fa-users', title: 'Artists und Stile', text: 'Jeder Artist mit eigener Seite, Stilschwerpunkt, Portfolio und Link zu Instagram. Viele suchen nach Stil, etwa „Fineline Tattoo Berlin“.' },
        { icon: 'fa-images', title: 'Portfolio nach Stil', text: 'Blackwork, Realism, Fineline, Traditional oder Lettering getrennt, damit jeder schnell findet, was passt.' },
        { icon: 'fa-envelope-open-text', title: 'Anfrageformular', text: 'Motiv, Größe, Körperstelle, Referenzbilder und Wunsch-Artist in einem Formular statt verstreut in Direktnachrichten.' },
        { icon: 'fa-euro-sign', title: 'Preise verständlich', text: 'Mindestpreis, Stundensatz und was den Preis beeinflusst. „Tattoo Kosten“ gehört zu den häufigsten Suchen.' },
        { icon: 'fa-door-open', title: 'Walk-in-Tage', text: 'Wann ohne Termin tätowiert wird und welche Motive dann möglich sind. „Tattoo Walk-in Berlin“ wird oft gesucht.' },
        { icon: 'fa-file-contract', title: 'Anzahlung und Absage', text: 'Wie hoch die Anzahlung ist, wann sie verfällt und wie Termine verschoben werden. Klare Regeln vermeiden Streit.' },
        { icon: 'fa-shield-halved', title: 'Hygiene und Farben', text: 'Wie du arbeitest, welche Farben du nutzt und warum. Das gibt gerade beim ersten Tattoo Sicherheit.' },
        { icon: 'fa-circle-info', title: 'Vorbereitung und Pflege', text: 'Was vor dem Termin zu beachten ist und wie das Tattoo danach heilt. Das spart Rückfragen.' }
      ]
    },
    {
      type: 'catalog',
      id: 'studioarten',
      chip: 'Studioarten',
      title: 'Websites für Studios, Artists und Spezialisten',
      intro: 'Ein großes Studio mit mehreren Artists braucht andere Seiten als ein Privatstudio für Fineline. Die Übersicht zeigt, welche Inhalte sich lohnen und wie in Berlin tatsächlich gesucht wird.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Studio mit mehreren Artists', pages: ['Artist-Seiten mit Portfolio', 'Gemeinsame Anfrage mit Artist-Auswahl', 'Gast-Artists und Termine'], searches: ['Tattoo Studio Berlin Kreuzberg', 'Tattoo Studio Berlin in der Nähe'] },
        { name: 'Fineline und Minimal', pages: ['Kleine Motive und Schriftzüge', 'Mindestpreis und Ablauf', 'Walk-in-Tage'], searches: ['Tattoo Studio Berlin Fineline', 'Fineline Tattoo Walk-in Berlin'] },
        { name: 'Realism, Blackwork und große Projekte', pages: ['Sleeves und Rückenstücke', 'Sitzungen und Stundensatz', 'Beratungstermin'], searches: ['Tattoo Kosten ganzer Arm', 'Tattoo Kosten Oberarm'] },
        { name: 'Walk-in-Studio', pages: ['Walk-in-Zeiten und Ablauf', 'Flash-Motive mit Preisen', 'Wartezeit und Regeln'], searches: ['Tattoo Walk-in Berlin heute', 'Walk-in Tattoo Berlin Friedrichshain'] },
        { name: 'Cover-up und Piercing', pages: ['Cover-ups mit Beispielen', 'Piercing-Angebot und Schmuck', 'Altersgrenzen und Ausweis'], searches: ['Tattoo Studio Berlin Charlottenburg', 'Tattoo Berlin Preise'] }
      ]
    },
    {
      type: 'form',
      id: 'anfrage',
      soft: true,
      chip: 'Anfragen',
      title: 'Tattoo-Anfrage: alle Angaben für einen Preisrahmen',
      text: 'Die meisten Anfragen kommen als kurze Nachricht: „Was kostet ein kleines Tattoo?“ Ohne Motiv, Größe und Körperstelle kannst du darauf nicht antworten. Ein Formular fragt genau das ab und nimmt Referenzbilder direkt mit an.',
      formLabel: 'Beispiel: Felder der Tattoo-Anfrage',
      fields: [
        { label: 'Motiv und Stil', hint: 'kurze Beschreibung und gewünschter Stil' },
        { label: 'Größe', hint: 'ungefähr in Zentimetern' },
        { label: 'Körperstelle', hint: 'zum Beispiel Unterarm innen' },
        { label: 'Referenzbilder', hint: 'bis zu drei Bilder, freiwillig' },
        { label: 'Wunsch-Artist und Zeitraum', hint: 'falls schon bekannt' }
      ],
      notes: [
        'Mit Größe und Körperstelle kannst du sofort einen Preisrahmen nennen. Das beantwortet auch Suchen wie „Tattoo Kosten 10 cm“.',
        'Eine Bestätigung des Mindestalters gehört mit ins Formular. Viele Studios tätowieren nur ab 18 Jahren, das sollte vorher klar sein.'
      ]
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Anzahlung, Alter, Fotos und Pflichtangaben',
      paragraphs: [
        'Tattoo-Studios arbeiten am Körper und oft mit Vorkasse. Klare Regeln auf der Website schützen dich und deine Kundschaft: zu Anzahlung und Absage, zum Mindestalter, zu Fotos von Tattoos und zu den Farben. Seit 2022 beschränkt die EU-Chemikalienverordnung REACH bestimmte Stoffe in Tätowiermitteln, Kundinnen und Kunden fragen deshalb öfter nach.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Anzahlung, Verfall und Terminverschiebung klar formuliert und vor der Buchung bestätigt',
        'Mindestalter und Ausweispflicht deutlich sichtbar',
        'Fotos von Tattoos nur mit Einwilligung, besonders wenn Gesicht oder Merkmale erkennbar sind',
        'Keine Gesundheitsversprechen, etwa zur Laserentfernung oder Narbenabdeckung',
        'Impressum nach § 5 DDG und Datenschutzerklärung für Formular, Bild-Upload und Instagram'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Anzahlungs- und Absageregeln lässt du am besten von einer Anwältin oder einem Anwalt prüfen.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Tattoo Studio Berlin“ gefunden werden',
      paragraphs: [
        'Gesucht wird nach Stil, Kiez und Zeit: „Tattoo Studio Berlin Fineline“, „Tattoo Studio Berlin Neukölln“ oder „Tattoo Walk-in Berlin heute“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit dein Studio dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich',
        'Eine Seite je Stil oder Artist, mit Text statt nur Bildern',
        'Walk-in-Tage im Google-Profil und auf der Website aktuell halten',
        'Bewertungen aktiv anfragen und beantworten',
        'Portfolio-Bilder mit beschreibenden Alternativtexten, damit Google sie versteht'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für ein Tattoo-Studio?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Artists und Seiten du brauchst und welche Funktionen eingebunden werden. Für Studios passen meist diese Pakete:',
      fits: {
        start: 'Für Privatstudios und einzelne Artists: Onepager oder bis zu drei Seiten mit Portfolio, Preisinfos und Anfrageformular.',
        business: 'Für die meisten Studios: Artist-Seiten, Portfolio nach Stil, Walk-in, Regeln und Anfrage, rund vier bis sieben Seiten.',
        wachstum: 'Für große Studios mit vielen Artists, Gast-Artists und Piercing oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Vorhandene Buchungssysteme binde ich in jedem Paket ein. Eine eigene Online-Buchung mit Anzahlung ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Artists, Stile, Regeln zu Anzahlung und Walk-in und welches Paket passt.' },
        { title: 'Seitenplan und Portfolio', text: 'Ich schlage die Seitenstruktur vor. Du lieferst die Portfolio-Auswahl je Artist und deine Studioregeln.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell im Stil deines Studios, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Walk-in-Tage, Gast-Artists und neue Arbeiten pflegst du selbst, oder ich übernehme das für dich.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Tattoo-Studios' }
  ],
  cta: {
    title: 'Lass uns über dein Studio sprechen',
    text: 'Erzähl mir kurz, welche Stile ihr macht, wie Anfragen heute reinkommen und was dich am meisten Zeit kostet. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'Deutscher Bundestag: Drucksache 20/841, Zukunft der Tattoo-Branche und ihrer Farben', href: 'https://dserver.bundestag.de/btd/20/008/2000841.pdf' },
    { label: 'Verordnung (EU) 2020/2081: Beschränkung von Stoffen in Tätowierfarben', href: 'https://eur-lex.europa.eu/eli/reg/2020/2081/oj' },
    { label: '§ 22 Kunsturhebergesetz: Recht am eigenen Bild', href: 'https://www.gesetze-im-internet.de/kunsturhg/__22.html' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' }
  ]
});
