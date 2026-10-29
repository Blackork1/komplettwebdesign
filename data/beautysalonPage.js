// Inhalte der Seite /branchen/webdesign-beautysalon („Website für Kosmetik-, Nagel- und Wimpernstudios“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/beautysalon.md):
// Google-Suchvorschläge von Studios und Kundschaft, Suchergebnisse und das Heilmittelwerbegesetz.
// Gesucht wird vor allem „Kosmetikstudio“, deshalb steht der Begriff vor „Beautysalon“.

export const BEAUTYSALON_CONTENT_UPDATED_ISO = '2026-10-29';

export const BEAUTYSALON_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für ein Kosmetikstudio?',
    a: 'Eine kompakte Studio-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten je Behandlungsgruppe, Preisen, Team und Galerie liegt das Business-Paket bei {{price.business}}, größere Studios oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Dein Buchungssystem binde ich in jedem Paket ein.'
  },
  {
    q: 'Reicht Instagram nicht aus?',
    a: 'Instagram zeigt schöne Ergebnisse, beantwortet aber selten Ablauf, Dauer, Haltbarkeit und Preis. Bei Google wird nach genau diesen Dingen gesucht, etwa „Wimpernverlängerung Berlin Kosten“. Die Website beantwortet das und verlinkt auf dein Instagram-Profil, beides ergänzt sich.'
  },
  {
    q: 'Sollte jede Behandlung eine eigene Seite bekommen?',
    a: 'Für deine wichtigsten Behandlungen ja. Gesucht wird nach der Behandlung plus Ort, zum Beispiel „Microneedling“ oder „Lash Lifting“ mit Bezirk. Eine eigene Seite mit Ablauf, Dauer, Preis und Pflegehinweisen hat dafür deutlich bessere Chancen als eine lange Liste.'
  },
  {
    q: 'Darf ich Vorher-Nachher-Bilder zeigen?',
    a: 'Für operative Schönheitseingriffe verbietet das Heilmittelwerbegesetz Vorher-Nachher-Bilder. Für klassische Kosmetik, Nägel oder Wimpern sind Ergebnisfotos üblich, wenn sie echt, unbearbeitet und mit Einwilligung der Kundin entstanden sind und keine Heilwirkung versprechen.'
  },
  {
    q: 'Sollte ich Preise auf der Website nennen?',
    a: 'Ja. „Kosmetikstudio in der Nähe Preise“ und „Wimpernverlängerung Berlin Kosten“ werden ständig gesucht. Nenne Preise je Behandlung und fürs Auffüllen als Endpreise und achte darauf, dass sie zu deinem Preisverzeichnis im Studio passen.'
  },
  {
    q: 'Welche Online-Terminbuchung passt zu meinem Studio?',
    a: 'Meist die, die du schon nutzt. Wichtig ist, dass Behandlungen mit realistischer Dauer hinterlegt sind und Neukundinnen erkennen, ob sie zuerst eine Beratung buchen sollten. Den Termin-Button platziere ich auf jeder Behandlungsseite.'
  },
  {
    q: 'Kann ich Gutscheine über die Website verkaufen?',
    a: 'Ja. Viele Buchungssysteme bieten einen Gutschein-Verkauf, den ich einbinde. Einen eigenen Gutschein-Shop setze ich im Individuell-Paket um. Nenne eine klare Einlösefrist; die gesetzliche Verjährungsfrist beträgt drei Jahre, kürzere Fristen solltest du rechtlich prüfen lassen.'
  },
  {
    q: 'Wie werde ich bei „Kosmetikstudio in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Behandlungen, Buchungslink, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Behandlungsseiten, Preise, Bezirk und Anfahrt. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Preise und Behandlungen selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Preise, Behandlungen und Aktionen selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich Änderungen für dich.'
  },
  {
    q: 'Wie lange dauert es, bis meine Studio-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Behandlungsliste, Preise und Fotos deiner Arbeiten früh vor, geht es schneller.'
  }
]);

export const BEAUTYSALON_PAGE = Object.freeze({
  slug: 'beautysalon',
  path: '/branchen/webdesign-beautysalon',
  breadcrumb: 'Kosmetikstudios',
  trackPrefix: 'beautysalon',
  metaTitle: 'Kosmetikstudio-Website erstellen lassen | Beautysalon Berlin',
  metaDescription: 'Website für Kosmetik-, Nagel- und Wimpernstudios in Berlin: Behandlungen mit Preisen, Online-Termin, Gutscheine und echte Ergebnisse. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Kosmetikstudios',
    serviceType: ['Website für Kosmetikstudios', 'Website für Nagelstudios', 'Website für Beautysalons', 'Local SEO für Kosmetikstudios'],
    audienceType: 'Kosmetikstudios, Nagelstudios, Wimpern- und Beautysalons'
  },
  hero: {
    chip: 'Webdesign für Beauty',
    h1: 'Website für Kosmetikstudios, Nagelstudios und Beautysalons in Berlin',
    lead: 'Bevor jemand eine Behandlung bucht, will sie wissen: Was genau passiert, wie lange dauert es, was kostet es und wie sieht das Ergebnis aus? Deine Website beantwortet das mit klaren Behandlungsseiten, echten Fotos und einem Termin-Button, der auf dem Handy immer erreichbar ist. Ich plane und baue sie persönlich, passend zum Stil deines Studios.',
    highlights: [
      'Behandlungen mit Dauer und Preis',
      'Online-Termin und Gutscheine',
      'Echte Ergebnisse, rechtlich sauber gezeigt'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1761067915/admin_gallery/deshwseha1vxkgvdalpg.webp',
    imageAlt: 'Hand mit rosa lackierten, mandelförmigen Nägeln auf hellem Stoff',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Beauty-Studios mit Behandlungsseiten überzeugen',
      paragraphs: [
        'Kosmetik ist Vertrauenssache. Wer zum ersten Mal ein Studio bucht, will vorher sehen, wie gearbeitet wird, wie sauber es ist und was das Ergebnis kostet. Gesucht wird entsprechend konkret: „Kosmetikstudio in der Nähe Preise“, „Wimpernverlängerung Berlin Kosten“, „Nagelstudio Berlin ohne Termin“ oder „Kosmetikstudio in der Nähe Microneedling“.',
        'Instagram zeigt schöne Ergebnisse, beantwortet aber selten diese Fragen. Eine Website mit einer Seite pro Behandlung tut genau das: Ablauf, Dauer, Haltbarkeit, Preis und Pflegehinweise. Sie wird bei Google gefunden, wenn jemand nach genau dieser Behandlung im eigenen Bezirk sucht, und sie führt direkt zum Termin.',
        'Dazu kommt die Stammkundschaft: Wer alle paar Wochen zum Auffüllen kommt, will schnell den nächsten Termin buchen. Ein direkter Buchungslink spart dir das Hin und Her im Chat.'
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Kosmetikstudios gehört',
      intro: 'Diese Inhalte suchen Kundinnen und Kunden, bevor sie eine Behandlung buchen. Zugleich helfen sie Google, dein Studio den richtigen Behandlungen und dem Bezirk zuzuordnen.',
      items: [
        { icon: 'fa-list-check', title: 'Behandlungen einzeln erklärt', text: 'Gesichtsbehandlung, Microneedling, Maniküre, Gel- oder Acrylnägel, Wimpern und Brauen: jeweils Ablauf, Dauer und Haltbarkeit.' },
        { icon: 'fa-tags', title: 'Preisliste', text: 'Preise je Behandlung und fürs Auffüllen, als Text, damit sie auf dem Handy lesbar und für Google auffindbar sind.' },
        { icon: 'fa-calendar-check', title: 'Online-Termin', text: 'Der Button zu deinem Buchungssystem, mit passender Behandlung vorausgewählt und auf dem Handy immer sichtbar.' },
        { icon: 'fa-images', title: 'Ergebnisse', text: 'Eigene Fotos von Nägeln, Wimpern und Brauen, realistisch und mit Einwilligung der Kundinnen.' },
        { icon: 'fa-shield-heart', title: 'Hygiene und Produkte', text: 'Wie du arbeitest, welche Produkte du verwendest und wie Werkzeuge gereinigt werden. Das schafft Vertrauen vor dem ersten Termin.' },
        { icon: 'fa-circle-info', title: 'Vorbereitung und Pflege', text: 'Was vor und nach der Behandlung zu beachten ist. Das spart Rückfragen und verbessert das Ergebnis.' },
        { icon: 'fa-receipt', title: 'Gutscheine', text: 'Gutscheine für Behandlungen oder Beträge, beliebt zu Geburtstagen und Feiertagen.' },
        { icon: 'fa-certificate', title: 'Qualifikation', text: 'Ausbildung, Fortbildungen und Zertifikate des Teams, sachlich dargestellt und ohne übertriebene Versprechen.' }
      ]
    },
    {
      type: 'catalog',
      id: 'studioarten',
      chip: 'Studioarten',
      title: 'Websites für Kosmetik-, Nagel- und Wimpernstudios',
      intro: 'Ein Nagelstudio braucht andere Seiten als ein Kosmetikinstitut oder ein Lash-Studio. Die Übersicht zeigt, welche Inhalte sich lohnen und wie in Berlin tatsächlich gesucht wird.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Kosmetikstudio', pages: ['Gesichtsbehandlungen mit Ablauf', 'Hauttypen und Beratung', 'Preisliste und Pakete'], searches: ['Kosmetikstudio Berlin Mitte', 'Kosmetikstudio in der Nähe Preise'] },
        { name: 'Nagelstudio', pages: ['Maniküre, Gel und Acryl', 'Preise fürs Auffüllen', 'Termine und Walk-in'], searches: ['Nagelstudio Berlin ohne Termin', 'Nagelstudio Berlin Sonntag geöffnet'] },
        { name: 'Wimpern und Brauen', pages: ['Techniken und Haltbarkeit', 'Auffüll-Intervalle und Preise', 'Pflegehinweise'], searches: ['Wimpernverlängerung Berlin Kosten', 'Kosmetikstudio in der Nähe Augenbrauen'] },
        { name: 'Apparative Kosmetik', pages: ['Behandlungen wie Microneedling erklärt', 'Ablauf und Pflege danach', 'Beratung vor der ersten Behandlung'], searches: ['Kosmetikstudio in der Nähe Microneedling', 'Kosmetikstudio Berlin Charlottenburg'] },
        { name: 'Haarentfernung', pages: ['Methoden wie Waxing oder Sugaring', 'Preise nach Zone', 'Vorbereitung und Nachsorge'], searches: ['Kosmetikstudio in der Nähe online Termin', 'Kosmetikstudio Berlin Friedrichshain'] }
      ],
      related: {
        title: 'Friseur oder Massage?',
        text: 'Für verwandte Branchen gibt es eigene Seiten:',
        links: [
          { label: 'Website für Friseure', href: '/branchen/webdesign-friseur' },
          { label: 'Website für Massage und Wellness', href: '/branchen/webdesign-wellness' }
        ]
      }
    },
    {
      type: 'form',
      id: 'termin',
      soft: true,
      chip: 'Anfragen',
      title: 'Erster Termin: Anfrage mit allen wichtigen Angaben',
      text: 'Bei neuen Kundinnen und Kunden lohnt eine kurze Abfrage vorab, gerade bei Wimpern, Brauen oder apparativen Behandlungen. So planst du die richtige Zeit ein und weißt, ob vorher eine Beratung nötig ist.',
      formLabel: 'Beispiel: Felder der Erstanfrage',
      fields: [
        { label: 'Behandlung', hint: 'zum Beispiel Neumodellage, Lash Lifting oder Gesichtsbehandlung' },
        { label: 'Erstbehandlung oder Auffüllen', hint: 'damit die Dauer stimmt' },
        { label: 'Wunschtermin', hint: 'Tag und Uhrzeit' },
        { label: 'Hinweise', hint: 'etwa empfindliche Haut, freiwillig' },
        { label: 'Kontakt', hint: 'Telefon, E-Mail oder WhatsApp' }
      ],
      notes: [
        'Angaben zu Allergien oder Hautproblemen sind Gesundheitsdaten. Das Feld ist deshalb freiwillig, die Übertragung verschlüsselt, und Details klärst du besser im Gespräch.',
        'Nutzt du ein Buchungssystem, führt der Termin-Button direkt dorthin. Das Formular bleibt dann für Beratungsanfragen.'
      ]
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Werbung, Fotos und Preise rechtssicher zeigen',
      paragraphs: [
        'Für Kosmetikstudios gelten die Regeln für jeden Dienstleister, dazu kommen Besonderheiten: Preise gehören nach § 12 PAngV als Verzeichnis ins Studio, Fotos von Kundinnen brauchen deren Einwilligung, und sobald Werbung gesundheitliche Wirkungen behauptet, greift das Heilmittelwerbegesetz. Für operative Schönheitseingriffe verbietet es Vorher-Nachher-Bilder ganz.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Behandlungen ohne Heilversprechen wie „heilt Akne“ oder „entfernt Narben dauerhaft“ beschreiben',
        'Ergebnisfotos nur von kosmetischen Behandlungen, unbearbeitet und mit Einwilligung',
        'Keine Behandlungen bewerben, die Ärztinnen, Ärzten oder Heilpraktikern vorbehalten sind',
        'Preise als Endpreise inklusive Umsatzsteuer, passend zum Aushang im Studio',
        'Impressum nach § 5 DDG und eine Datenschutzerklärung, die zu Buchungssystem und Instagram passt'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das dein Berufsverband oder eine Anwältin bzw. ein Anwalt.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Kosmetikstudio in der Nähe“ gefunden werden',
      paragraphs: [
        'Gesucht wird mit Behandlung und Ort: „Wimpernverlängerung Berlin Steglitz“, „Nagelstudio Berlin Lichtenberg“ oder „Kosmetikstudio in der Nähe online Termin“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit dein Studio dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich',
        'Eigene Seite oder eigener Abschnitt pro Behandlung, mit Bezirk im Text',
        'Buchungslink und aktuelle Fotos im Google-Profil',
        'Bewertungen aktiv anfragen und freundlich beantworten',
        'Bilder so optimiert, dass Galerien auf dem Handy schnell laden'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für ein Kosmetikstudio?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Behandlungsseiten du brauchst und welche Funktionen eingebunden werden. Für Studios passen meist diese Pakete:',
      fits: {
        start: 'Für kleine Studios und Einzelunternehmerinnen: Onepager oder bis zu drei Seiten mit Behandlungen, Preisen, Galerie und Buchungslink.',
        business: 'Für die meisten Studios: eigene Seiten je Behandlungsgruppe, Preise, Team, Galerie und Gutscheine, rund vier bis sieben Seiten.',
        wachstum: 'Für Studios mit vielen Behandlungen, mehreren Standorten oder Schulungen oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Buchungssysteme binde ich in jedem Paket ein. Ein eigener Gutschein-Verkauf oder Produktshop ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Behandlungen, Terminweg, Stil des Studios und welches Paket passt.' },
        { title: 'Seitenplan und Fotos', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Behandlungsliste, Preise und Fotos deiner Arbeiten, gern aus Instagram.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen, oder du pflegst Preise und Aktionen selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Kosmetikstudios' }
  ],
  cta: {
    title: 'Lass uns über dein Studio sprechen',
    text: 'Erzähl mir kurz, welche Behandlungen du anbietest, wie Kundinnen heute buchen und was dich am meisten Zeit kostet. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website für Friseure', href: '/branchen/webdesign-friseur' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: '§ 11 Heilmittelwerbegesetz: Vorher-Nachher-Verbot bei operativen Schönheitseingriffen', href: 'https://www.gesetze-im-internet.de/heilmwerbg/__11.html' },
    { label: '§ 3 Heilmittelwerbegesetz: Irreführende Werbung', href: 'https://www.gesetze-im-internet.de/heilmwerbg/__3.html' },
    { label: '§ 12 Preisangabenverordnung: Preisangaben bei Leistungen', href: 'https://www.gesetze-im-internet.de/pangv_2022/__12.html' },
    { label: '§ 22 Kunsturhebergesetz: Recht am eigenen Bild', href: 'https://www.gesetze-im-internet.de/kunsturhg/__22.html' },
    { label: '§ 195 BGB: Regelmäßige Verjährungsfrist', href: 'https://www.gesetze-im-internet.de/bgb/__195.html' }
  ]
});
