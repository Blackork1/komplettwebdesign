// Inhalte der Seite /branchen/webdesign-immobilienmakler („Website für Immobilienmakler in Berlin“).
// Grundlage: Search-Console-Daten Juni bis Oktober 2026 („seo für immobilienmakler berlin“,
// „professionelle immobilienmakler website mit seo“, „makler webdesign“, „homepage makler“,
// „website relaunch immobilienmakler“). Rechtliche Hinweise ohne Rechtsberatung.

import { MARKETING_IMAGES } from './marketingImages.js';

const HERO_IMAGE = MARKETING_IMAGES.industryRealEstateHero;

export const IMMOBILIENMAKLER_CONTENT_UPDATED_ISO = '2026-10-25';

export const IMMOBILIENMAKLER_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für Immobilienmakler?',
    a: 'Eine kompakte Makler-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Verkauf, Vermietung, Bewertung und Team liegt das Business-Paket bei {{price.business}}, größere Websites oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Eine Anbindung an deine Maklersoftware plane ich als individuelle Erweiterung.'
  },
  {
    q: 'Brauche ich als Makler eine eigene Website, wenn meine Objekte auf Portalen stehen?',
    a: 'Ja. Auf Portalen konkurrierst du neben vielen anderen Anbietern um Suchende. Eigentümer, die verkaufen oder vermieten wollen, prüfen dagegen den Makler selbst: Erfahrung in der Region, Vorgehen, Referenzen und Bewertungen. Diese Fragen beantwortet nur deine eigene Website.'
  },
  {
    q: 'Können meine Objekte automatisch auf der Website erscheinen?',
    a: 'Oft ja. Viele Maklerprogramme bieten eine Schnittstelle oder einen Export, über den Objekte auf der eigenen Website angezeigt werden. Was mit deiner Software geht, prüfe ich vorab und plane die Anbindung als individuelle Erweiterung.'
  },
  {
    q: 'Was muss ins Impressum einer Makler-Website?',
    a: 'Neben den üblichen Angaben wie Name, Anschrift und Kontakt gehören bei erlaubnispflichtigen Tätigkeiten wie der Maklertätigkeit nach § 34c Gewerbeordnung auch Angaben zur zuständigen Aufsichtsbehörde dazu. Ich binde Impressum und Datenschutzerklärung technisch ein; die inhaltliche Prüfung ist keine Rechtsberatung.'
  },
  {
    q: 'Welche Angaben gehören in eine Immobilienanzeige auf der Website?',
    a: 'Neben Lage, Größe, Preis und Bildern sind die Pflichtangaben aus dem Energieausweis wichtig, sobald ein Energieausweis vorliegt. Das gilt auch für Anzeigen auf der eigenen Website. Im Zweifel klärst du die aktuellen Vorgaben mit deinem Verband oder einer Rechtsberatung.'
  },
  {
    q: 'Wie gewinne ich über die Website Eigentümer als Kunden?',
    a: 'Mit Inhalten, die Eigentümern bei ihrer Entscheidung helfen: wie du vorgehst, was eine Bewertung beinhaltet, welche Kosten anfallen, Referenzen aus der Region und echte Bewertungen. Eine einfache Anfrage zur Immobilienbewertung ist dabei der wichtigste Einstieg.'
  },
  {
    q: 'Wie werde ich als Makler in Berlin bei Google gefunden?',
    a: 'Mit Seiten zu deinen Leistungen und Lagen, einem gepflegten Google-Unternehmensprofil, einheitlichen Kontaktdaten und Bewertungen. Inhalte zu den Bezirken, in denen du dich auskennst, zeigen Google deine Expertise. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Objekte und Texte selbst pflegen?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Texte und ausgewählte Inhalte selbst änderst. Objekte kommen am besten direkt aus deiner Maklersoftware, dann pflegst du sie nur an einer Stelle.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Eine kompakte Website ist meist in 2 bis 4 Wochen online, eine mehrseitige in 4 bis 6 Wochen. Eine Anbindung an die Maklersoftware hängt vom Anbieter ab und wird vorab abgestimmt.'
  },
  {
    q: 'Kann meine bestehende Makler-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  }
]);

export const IMMOBILIENMAKLER_PAGE = Object.freeze({
  slug: 'immobilienmakler',
  path: '/branchen/webdesign-immobilienmakler',
  breadcrumb: 'Immobilienmakler',
  trackPrefix: 'makler',
  metaTitle: 'Website für Immobilienmakler in Berlin | Webdesign & SEO',
  metaDescription: 'Webdesign für Immobilienmakler in Berlin: Eigentümer gewinnen, Objekte zeigen, Bewertungsanfragen erhalten und lokal gefunden werden. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Immobilienmakler',
    serviceType: ['Website für Immobilienmakler', 'Webdesign für Makler', 'Homepage für Immobilienmakler', 'SEO für Immobilienmakler'],
    audienceType: 'Immobilienmakler und Hausverwaltungen'
  },
  hero: {
    chip: 'Webdesign für Makler',
    h1: 'Website für Immobilienmakler in Berlin erstellen lassen',
    lead: 'Deine Website überzeugt Eigentümer, bevor sie dich anrufen: mit deiner Erfahrung in der Region, einem klaren Vorgehen und echten Referenzen. Ich plane und baue sie persönlich, mit Objektseiten, einer einfachen Anfrage zur Immobilienbewertung und den Angaben, die Google für die lokale Suche braucht.',
    highlights: [
      'Eigentümer gewinnen statt nur Objekte zeigen',
      'Anfrage zur Immobilienbewertung mit wenigen Angaben',
      'Objekte aus der Maklersoftware einbinden'
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
      title: 'Warum Makler eine eigene Website brauchen, obwohl es Portale gibt',
      paragraphs: [
        'Auf Immobilienportalen finden Suchende Objekte. Eigentümer, die verkaufen oder vermieten wollen, suchen dagegen einen Makler, dem sie vertrauen. Sie prüfen online, wer sich in ihrer Lage auskennt, wie du vorgehst und was andere über dich sagen. Diese Fragen beantwortet kein Portal, sondern nur deine eigene Website.',
        'Seit Ende 2020 gilt beim Verkauf von Wohnungen und Einfamilienhäusern an Verbraucher: Lässt sich der Makler von beiden Seiten bezahlen, dann in gleicher Höhe. Bei der Vermietung von Wohnungen zahlt nach dem Bestellerprinzip in der Regel der Vermieter, der den Makler beauftragt. Für Eigentümer zählt deshalb mehr denn je, welchen Mehrwert du bringst. Die Website ist der Ort, an dem du das zeigst.'
      ],
      stats: []
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Immobilienmaklers gehört',
      intro: 'Diese Inhalte erwarten Eigentümer und Suchende, bevor sie dich kontaktieren. Zugleich helfen sie Google zu verstehen, wofür du in welcher Region stehst.',
      items: [
        { icon: 'fa-house', title: 'Leistungen für Eigentümer', text: 'Verkauf, Vermietung und Bewertung mit eigenen Seiten: wie du vorgehst, was enthalten ist und wie lange es dauert.' },
        { icon: 'fa-calculator', title: 'Bewertungsanfrage', text: 'Eine einfache Anfrage mit Objektart, Lage und Größe. Für viele Eigentümer ist sie der erste Kontakt.' },
        { icon: 'fa-images', title: 'Objekte', text: 'Aktuelle Angebote mit guten Bildern, Grundriss und Pflichtangaben, idealerweise direkt aus deiner Maklersoftware.' },
        { icon: 'fa-map-location-dot', title: 'Lagen und Bezirke', text: 'Die Bezirke und Orte, in denen du dich auskennst, mit kurzen Einblicken in Markt und Nachfrage.' },
        { icon: 'fa-people-group', title: 'Team und Erfahrung', text: 'Ansprechpartner mit Foto, Ausbildung und Erfahrung. Wer eine Immobilie verkauft, möchte wissen, wem er sie anvertraut.' },
        { icon: 'fa-star', title: 'Referenzen und Bewertungen', text: 'Verkaufte und vermietete Objekte, sofern Eigentümer zustimmen, und echte Bewertungen aus Google.' },
        { icon: 'fa-file-signature', title: 'Ablauf und Kosten', text: 'Wie ein Auftrag abläuft und wie die Provision geregelt ist. Klare Angaben nehmen Eigentümern die Unsicherheit.' },
        { icon: 'fa-scale-balanced', title: 'Impressum und Pflichtangaben', text: 'Ein vollständiges Impressum mit den Angaben zu deiner Erlaubnis und eine Datenschutzerklärung.' }
      ]
    },
    {
      type: 'catalog',
      id: 'schwerpunkte',
      chip: 'Schwerpunkte',
      title: 'Seiten für Verkauf, Vermietung und Bewertung',
      intro: 'Eigentümer suchen nach ihrer Aufgabe und ihrer Lage, selten nach „Immobilienmakler“. Die Übersicht zeigt, welche Inhalte sich je Schwerpunkt lohnen und wie typische Suchen in Berlin aussehen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Immobilie verkaufen', pages: ['Ablauf vom Erstgespräch bis zum Notartermin', 'Vermarktung und Besichtigungen', 'Provision und Kosten'], searches: ['Wohnung verkaufen Pankow', 'Haus verkaufen Makler Berlin'] },
        { name: 'Immobilienbewertung', pages: ['Was die Bewertung beinhaltet', 'Anfrage mit wenigen Angaben', 'Unterschied zu Online-Rechnern'], searches: ['Immobilienbewertung Berlin', 'Wohnung bewerten lassen Charlottenburg'] },
        { name: 'Vermietung', pages: ['Mietersuche und Auswahl', 'Besichtigungen und Unterlagen', 'Bestellerprinzip erklärt'], searches: ['Wohnung vermieten Makler Berlin', 'Mieter finden lassen'] },
        { name: 'Kapitalanlage und Gewerbe', pages: ['Angebote für Anleger', 'Gewerbeflächen', 'Diskrete Vermarktung'], searches: ['Mehrfamilienhaus verkaufen Berlin', 'Gewerbeimmobilie Makler Berlin'] },
        { name: 'Lagen und Bezirke', pages: ['Marktberichte je Bezirk', 'Verkaufte Objekte in der Lage', 'Ansprechpartner vor Ort'], searches: ['Immobilienmakler Steglitz', 'Makler Prenzlauer Berg'] }
      ],
      related: {
        title: 'Website schon vorhanden?',
        text: 'Prüfe deine bestehende Makler-Website mit der Checkliste im Blog:',
        links: [{ label: 'Homepage-Check für Immobilienmakler', href: '/blog/immobilienmakler-homepage-check' }]
      }
    },
    {
      type: 'form',
      id: 'bewertung',
      soft: true,
      chip: 'Anfragen',
      title: 'Die Bewertungsanfrage: der Einstieg für Eigentümer',
      text: 'Viele Eigentümer wollen zuerst wissen, was ihre Immobilie wert ist. Eine kurze Anfrage zur Bewertung senkt die Hürde und liefert dir alle Angaben für das erste Gespräch.',
      formLabel: 'Beispiel: Felder der Bewertungsanfrage',
      fields: [
        { label: 'Objektart', hint: 'Wohnung, Haus, Mehrfamilienhaus, Grundstück' },
        { label: 'Lage', hint: 'Bezirk oder Postleitzahl' },
        { label: 'Wohnfläche und Zimmer', hint: 'ungefähre Angaben reichen' },
        { label: 'Baujahr und Zustand', hint: 'kurze Einschätzung' },
        { label: 'Anliegen', hint: 'verkaufen, vermieten oder nur informieren' },
        { label: 'Rückruf', hint: 'mit passender Uhrzeit' }
      ],
      notes: [
        'Ein Online-Rechner liefert nur grobe Spannen. Eine persönliche Einschätzung nach Besichtigung ist ehrlicher und der bessere Einstieg ins Gespräch.',
        'Die Daten der Eigentümer sind sensibel: Formular, Speicherung und Weitergabe plane ich datenschutzbewusst.'
      ]
    },
    {
      type: 'checklist',
      id: 'pflichtangaben',
      chip: 'Pflichtangaben',
      title: 'Rechtliches auf der Makler-Website',
      paragraphs: [
        'Für Makler gelten ein paar zusätzliche Regeln, die auf der Website sichtbar werden. Die wichtigsten Punkte im Überblick, ohne Anspruch auf Vollständigkeit.'
      ],
      cardTitle: 'Darauf achten',
      items: [
        'Impressum mit den Angaben zur Erlaubnis nach § 34c Gewerbeordnung und zur zuständigen Aufsichtsbehörde',
        'Pflichtangaben aus dem Energieausweis in Immobilienanzeigen, sobald ein Ausweis vorliegt',
        'Klare Angaben zur Provision, passend zu Halbteilung beim Verkauf und Bestellerprinzip bei Vermietung',
        'Widerrufsbelehrung, wenn Maklerverträge mit Verbrauchern online oder per E-Mail zustande kommen',
        'Datenschutzerklärung, die Formulare und eingebundene Dienste abdeckt'
      ],
      note: 'Ich binde Impressum, Datenschutzerklärung und Rechtstexte technisch sauber ein. Das ist keine Rechtsberatung: Im Zweifel helfen dein Berufsverband oder eine Kanzlei.'
    },
    {
      type: 'checklist',
      id: 'google',
      soft: true,
      chip: 'Local SEO',
      title: 'SEO für Immobilienmakler in Berlin',
      paragraphs: [
        'Wer „Immobilienmakler Steglitz“ oder „Wohnung verkaufen Pankow“ sucht, sieht oft zuerst die Karte mit Google-Unternehmensprofilen und darunter die Websites. Für Makler zählt vor allem, dass Google die Lagen kennt, in denen du aktiv bist.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Eigene Seiten für Verkauf, Vermietung und Bewertung, mit deinen Lagen im Text',
        'Gleiche Angaben zu Name, Adresse und Telefon auf Website, Google-Profil und Portalen',
        'Inhalte zu Bezirken, in denen du dich wirklich auskennst, statt kopierter Ortsseiten',
        'Bewertungen nach abgeschlossenen Aufträgen aktiv anfragen',
        'Schnelle Ladezeit, auch mit vielen Objektbildern'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für Immobilienmakler?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob Objekte automatisch aus deiner Software kommen. Für Makler passen meist diese Pakete:',
      fits: {
        start: 'Für Einzelmakler: Onepager oder bis zu drei Seiten mit Leistungen, Bewertungsanfrage und Kontakt.',
        business: 'Für die meisten Maklerbüros: Seiten für Verkauf, Vermietung, Bewertung, Team und Referenzen, rund vier bis sieben Seiten.',
        wachstum: 'Für Büros mit mehreren Schwerpunkten oder Standorten oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Eine Anbindung an deine Maklersoftware ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional und werden separat vereinbart.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Schwerpunkte, Lagen, Maklersoftware und welches Paket passt.' },
        { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte, Referenzen und Fotos.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen oder du pflegst Inhalte selbst.' }
      ],
      duration: 'Eine kompakte Website ist meist in 2 bis 4 Wochen online, eine mehrseitige in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Immobilienmakler' }
  ],
  cta: {
    title: 'Lass uns über dein Maklerbüro sprechen',
    text: 'Erzähl mir kurz, in welchen Lagen du aktiv bist und wie Eigentümer heute zu dir finden. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Homepage-Check für Makler', href: '/blog/immobilienmakler-homepage-check' }
  ],
  sources: [
    { label: '§ 34c Gewerbeordnung: Erlaubnis für Immobilienmakler', href: 'https://www.gesetze-im-internet.de/gewo/__34c.html' },
    { label: '§ 656c BGB: Provision bei Wohnungen und Einfamilienhäusern', href: 'https://www.gesetze-im-internet.de/bgb/__656c.html' },
    { label: '§ 2 Wohnungsvermittlungsgesetz: Bestellerprinzip', href: 'https://www.gesetze-im-internet.de/wovermrg/__2.html' }
  ]
});
