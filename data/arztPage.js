// Inhalte der Seite /branchen/webdesign-arzt („Website für Arztpraxen“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/arzt.md):
// Google-Suchvorschläge von Praxen und Patienten, Konkurrenzseiten, Bitkom-Umfrage vom Dezember 2025
// und das Merkblatt der Ärztekammer Berlin zu Ankündigungsmöglichkeiten einer Arztpraxis.

export const ARZT_CONTENT_UPDATED_ISO = '2026-10-29';

const BITKOM_SOURCE = 'Bitkom, Dezember 2025';

export const ARZT_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für eine Arztpraxis?',
    a: 'Eine kompakte Praxis-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Leistungen, Team, Patienteninfos und Rezeptanfrage liegt das Business-Paket bei {{price.business}}, Gemeinschaftspraxen und größere Websites im Wachstum-Paket bei {{price.wachstum}}. Terminportale wie Doctolib binde ich in jedem Paket ein, deren Lizenz zahlst du beim Anbieter.'
  },
  {
    q: 'Welche Angaben gehören ins Impressum einer Praxis-Website?',
    a: 'Neben Name, Anschrift und Kontakt verlangt § 5 DDG bei Ärztinnen und Ärzten die zuständige Kammer, die gesetzliche Berufsbezeichnung mit dem Staat, in dem sie verliehen wurde, und die berufsrechtlichen Regelungen mit dem Hinweis, wo sie zu finden sind. In Berlin ist das die Berufsordnung der Ärztekammer Berlin. Ich baue das Impressum so ein, dass es von jeder Seite mit einem Klick erreichbar ist.'
  },
  {
    q: 'Brauche ich eine Datenschutzerklärung, und reicht ein Muster?',
    a: 'Ja, eine Datenschutzerklärung brauchst du. Ein Muster oder Generator ist ein guter Start, sie muss aber zu den Diensten passen, die deine Website wirklich nutzt, etwa Terminportal, Karte oder Kontaktformular. Ich baue die Seite mit möglichst wenigen externen Diensten, dann bleibt die Erklärung kurz und überschaubar.'
  },
  {
    q: 'Muss die Website meiner Praxis barrierefrei sein?',
    a: 'Das Gesetz zur Barrierefreiheit (BFSG) gilt seit dem 28. Juni 2025 für bestimmte digitale Angebote an Verbraucher, etwa wenn online ein Vertrag geschlossen wird. Kleinstunternehmen mit weniger als zehn Beschäftigten und höchstens 2 Millionen Euro Jahresumsatz sind bei Dienstleistungen ausgenommen. Unabhängig davon lohnt eine barrierearme Seite: Viele Patientinnen und Patienten sind älter oder sehen schlecht. Ich setze große Schrift, starke Kontraste, Tastaturbedienung und Alternativtexte standardmäßig um.'
  },
  {
    q: 'Wie binde ich Doctolib, Jameda oder ein anderes Terminportal ein?',
    a: 'Meist reicht ein gut sichtbarer Button, der direkt auf deine Terminseite im Portal führt. Manche Portale bieten ein Widget, das ich in die Seite einbaue. Wichtig ist, dass der Terminweg auf dem Handy immer erreichbar ist und in der Datenschutzerklärung beschrieben wird.'
  },
  {
    q: 'Darf ich Patientenbewertungen auf der Website zeigen?',
    a: 'Echte Bewertungen, etwa aus deinem Google-Profil, kannst du zeigen oder verlinken. Das Heilmittelwerbegesetz verbietet Äußerungen Dritter, wenn sie missbräuchlich oder irreführend eingesetzt werden. Erfundene Stimmen, Krankengeschichten und Heilversprechen gehören deshalb nicht auf die Seite. Beim Antworten auf Bewertungen gilt die Schweigepflicht: keine Details zur Behandlung.'
  },
  {
    q: 'Darf ich IGeL und Privatleistungen mit Preisen nennen?',
    a: 'Leistungen darfst du sachlich beschreiben. Feste Preise für privatärztliche Leistungen sieht die Ärztekammer Berlin kritisch, weil die Abrechnung nach der GOÄ vom Einzelfall abhängt. Besser ist ein kurzer Hinweis zur Abrechnung und das Angebot, Kosten im Gespräch zu klären.'
  },
  {
    q: 'Wie werde ich bei „Arzt in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Sprechzeiten, Terminlink und Fotos, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Fachrichtung, Schwerpunkte, Bezirk, Anfahrt und Barrierefreiheit. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Wie lange dauert es, bis meine Praxis-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Texte zu Leistungen, Teamfotos und die Pflichtangaben früh vor, geht es schneller.'
  },
  {
    q: 'Kann meine bestehende Praxis-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet, damit Patienten über alte Links weiter zu dir finden.'
  }
]);

export const ARZT_PAGE = Object.freeze({
  slug: 'arzt',
  path: '/branchen/webdesign-arzt',
  breadcrumb: 'Arztpraxen',
  trackPrefix: 'arzt',
  metaTitle: 'Arztpraxis-Website erstellen lassen | Praxis-Homepage Berlin',
  metaDescription: 'Website für Arztpraxen in Berlin: Sprechzeiten, Online-Termin, Rezeptanfrage und Pflichtangaben klar umgesetzt, barrierearm und schnell. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Arztpraxen',
    serviceType: ['Website für Arztpraxen', 'Praxis-Homepage', 'Webdesign für Ärztinnen und Ärzte', 'Local SEO für Arztpraxen'],
    audienceType: 'Arztpraxen, Gemeinschaftspraxen und MVZ'
  },
  hero: {
    chip: 'Webdesign für Arztpraxen',
    h1: 'Website für Arztpraxen: Praxis-Homepage erstellen lassen in Berlin',
    lead: 'Patientinnen und Patienten wollen vor allem wissen: Nimmt die Praxis neue Patienten an, wann ist geöffnet und wie bekomme ich einen Termin, ohne in der Warteschleife zu hängen? Ich plane und baue deine Praxis-Website persönlich, sachlich im Ton, wie es die Berufsordnung verlangt, und so, dass dein Team weniger Anrufe beantworten muss.',
    highlights: [
      'Sprechzeiten und neue Patienten auf einen Blick',
      'Termin, Rezept und Überweisung ohne Telefonschleife',
      'Pflichtangaben nach DDG und Berufsordnung eingeplant'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1760634393/admin_gallery/lebrvglrim057xkwhnjl.webp',
    imageAlt: 'Schwarz-Weiß-Foto eines Praxisteams in Arbeitskleidung, eine Ärztin trägt ein Stethoskop',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum die Praxis-Website heute Telefonate ersetzt',
      paragraphs: [
        'Online-Termine sind Alltag: Laut Bitkom haben 64 Prozent der Menschen in Deutschland schon einmal einen Arzttermin online vereinbart, 2023 waren es noch 36 Prozent. Als wichtigsten Vorteil nennen 84 Prozent, dass sie nicht mehr von der telefonischen Erreichbarkeit der Praxis abhängen.',
        'Ein Viertel hat dafür schon die Website einer Praxis genutzt, die meisten buchen über Portale wie Doctolib oder Jameda. Die eigene Website bleibt trotzdem die erste Anlaufstelle: Dort prüfen Patienten Fachrichtung, Sprechzeiten, Anfahrt und ob du neue Patienten aufnimmst. Und dort landen sie, wenn sie nach „Hausarzt Lichtenberg“ oder „Arzt in der Nähe Samstag geöffnet“ suchen.'
      ],
      stats: [
        { value: '64 %', label: 'haben schon einmal einen Arzttermin online vereinbart', source: BITKOM_SOURCE },
        { value: '25 %', label: 'haben dafür die Website einer Praxis genutzt, etwa per Formular', source: BITKOM_SOURCE },
        { value: '84 %', label: 'schätzen vor allem, nicht mehr von der Telefonzeit abzuhängen', source: BITKOM_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website einer Arztpraxis gehört',
      intro: 'Diese Inhalte suchen Patientinnen und Patienten vor dem ersten Besuch. Zugleich helfen sie Google, deine Praxis der richtigen Fachrichtung und dem richtigen Bezirk zuzuordnen.',
      items: [
        { icon: 'fa-clock', title: 'Sprechzeiten und Akutsprechstunde', text: 'Reguläre Zeiten, offene Sprechstunde, Abend- oder Samstagstermine und Urlaubsvertretung. Gesucht wird oft „jetzt geöffnet“, die Angaben müssen also stimmen.' },
        { icon: 'fa-user-plus', title: 'Neue Patienten', text: 'Ein klarer Satz, ob du neue Patientinnen und Patienten aufnimmst, wie der erste Termin abläuft und was mitzubringen ist.' },
        { icon: 'fa-calendar-check', title: 'Online-Termin', text: 'Der Button zu deinem Terminportal oder ein schlankes Anfrageformular, auf dem Handy immer sichtbar.' },
        { icon: 'fa-file-lines', title: 'Rezept und Überweisung', text: 'Folgerezepte und Überweisungen online anfragen, mit dem Hinweis, ab wann das E-Rezept auf der Karte ist oder wann etwas abholbereit liegt.' },
        { icon: 'fa-list-check', title: 'Leistungen und Schwerpunkte', text: 'Kassenleistungen, Vorsorge, Impfungen und Selbstzahlerleistungen getrennt und sachlich beschrieben, ohne Heilversprechen.' },
        { icon: 'fa-language', title: 'Team und Sprachen', text: 'Ärztinnen, Ärzte und Praxisteam mit Foto und Fachgebiet. In Berlin suchen viele gezielt eine Praxis, in der ihre Sprache gesprochen wird.' },
        { icon: 'fa-universal-access', title: 'Anfahrt und Barrierefreiheit', text: 'Etage, Aufzug, stufenloser Zugang, Parkplätze und ÖPNV. Für ältere und mobilitätseingeschränkte Menschen entscheiden diese Angaben.' },
        { icon: 'fa-briefcase', title: 'Stellenangebote', text: 'Medizinische Fachangestellte und Ärztinnen oder Ärzte in Weiterbildung finden dich über eine eigene Karriereseite mit kurzem Bewerbungsweg.' }
      ]
    },
    {
      type: 'catalog',
      id: 'praxisarten',
      chip: 'Praxisarten',
      title: 'Websites für Hausarzt-, Facharzt- und Gemeinschaftspraxen',
      intro: 'Eine Hausarztpraxis braucht andere Schwerpunkte als eine Privatpraxis oder ein MVZ. Die Übersicht zeigt, welche Inhalte sich lohnen und wie Patienten tatsächlich suchen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Hausarztpraxis', pages: ['Sprechzeiten und offene Sprechstunde', 'Neue Patienten und Hausbesuche', 'Rezept- und Überweisungsanfrage'], searches: ['Hausarzt Berlin Lichtenberg', 'Hausarzt online Termin Berlin'] },
        { name: 'Facharztpraxis', pages: ['Schwerpunkte und Untersuchungen', 'Was zum ersten Termin gehört', 'Online-Termin je Leistung'], searches: ['HNO Praxis Berlin ohne Termin', 'Arzt in der Nähe Samstag geöffnet'] },
        { name: 'Kinderarztpraxis', pages: ['Vorsorge-Untersuchungen und Impfungen', 'Infektsprechstunde und Akutzeiten', 'Hinweise für neue Familien'], searches: ['Arzt in der Nähe Kinderarzt', 'Arzt in der Nähe jetzt geöffnet'] },
        { name: 'Gemeinschaftspraxis und MVZ', pages: ['Ärztinnen und Ärzte mit Fachgebiet', 'Standorte und Zuständigkeiten', 'Karriereseite für MFA'], searches: ['Hausarzt Berlin Mitte', 'Hausarzt Berlin Charlottenburg'] },
        { name: 'Privatpraxis und Selbstzahler', pages: ['Leistungen mit Ablauf', 'Hinweis zur Abrechnung nach GOÄ', 'Terminanfrage mit Rückruf'], searches: ['Arzt in der Nähe ohne Termin', 'Arzt in der Nähe Öffnungszeiten'] }
      ],
      related: {
        title: 'Physiotherapie oder Hebamme?',
        text: 'Für weitere Gesundheitsberufe gibt es eigene Seiten:',
        links: [
          { label: 'Website für Physiotherapie-Praxen', href: '/branchen/webdesign-physiotherapie' },
          { label: 'Website für Hebammen', href: '/branchen/webdesign-hebamme' }
        ]
      }
    },
    {
      type: 'form',
      id: 'anfrage',
      soft: true,
      chip: 'Anfragen',
      title: 'Termin, Rezept, Rückruf: Anfragen ohne Telefonschleife',
      text: 'Nicht jede Praxis will ein Terminportal. Ein schlankes Formular entlastet das Telefon trotzdem. Es fragt nur, was dein Team zur Bearbeitung braucht, und keine Diagnosen.',
      formLabel: 'Beispiel: Felder einer Praxis-Anfrage',
      fields: [
        { label: 'Anliegen', hint: 'Termin, Folgerezept, Überweisung oder Rückruf' },
        { label: 'Schon bei uns in Behandlung?', hint: 'ja oder neu in der Praxis' },
        { label: 'Versicherung', hint: 'gesetzlich, privat oder Selbstzahler' },
        { label: 'Wunschzeit', hint: 'Tag und Tageszeit' },
        { label: 'Rückruf oder E-Mail', hint: 'wie sich die Praxis melden soll' }
      ],
      notes: [
        'Gesundheitsdaten sind besonders geschützt. Das Formular bleibt deshalb sparsam, die Übertragung verschlüsselt, und Befunde gehören nicht hinein.',
        'Nutzt du Doctolib, Jameda oder ein anderes Portal, führt der Termin-Button direkt dorthin. So pflegst du Termine nur an einer Stelle.'
      ]
    },
    {
      type: 'checklist',
      id: 'pflichtangaben',
      chip: 'Recht',
      title: 'Pflichtangaben und Berufsrecht auf der Praxis-Website',
      paragraphs: [
        'Ärztinnen und Ärzte dürfen sachlich über ihre Praxis informieren, auch werbend. Die Berufsordnung der Ärztekammer Berlin untersagt aber anpreisende, irreführende und vergleichende Werbung. Dazu kommen das Heilmittelwerbegesetz, die Impressumspflicht und der Datenschutz. Ich setze Inhalte und Ton so um, dass sie dazu passen.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Impressum nach § 5 DDG mit Ärztekammer, Berufsbezeichnung, Staat der Verleihung und Link zur Berufsordnung',
        'Sachliche Texte ohne Superlative; „Zentrum“ oder „Klinik“ nur, wenn es tatsächlich zutrifft',
        'Keine Festpreise für privatärztliche Leistungen, denn abgerechnet wird nach der GOÄ',
        'Keine Heilversprechen und keine Werbung für bestimmte Arzneimittel oder Produkte',
        'Sparsame Formulare, verschlüsselte Übertragung und eine Datenschutzerklärung, die zu den eingebundenen Diensten passt'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das die Ärztekammer oder eine Anwältin bzw. ein Anwalt.',
      noteLinks: [
        { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' },
        { href: '/blog/barrierefreie-website-bfsg', label: 'Barrierefreie Website und BFSG' }
      ]
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Hausarzt in der Nähe“ gefunden werden',
      paragraphs: [
        'Patienten suchen fast immer mit Ort oder Zeit: „Hausarzt Berlin Lichtenberg“, „Arzt in der Nähe jetzt geöffnet“ oder „HNO Praxis Berlin ohne Termin“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit deine Praxis dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Sprechzeiten überall gleich, auch im Urlaub aktuell',
        'Fachrichtung und Schwerpunkte als eigene Abschnitte, mit Bezirk im Text',
        'Google-Unternehmensprofil mit Terminlink, Praxisfotos und Angaben zur Barrierefreiheit',
        'Bewertungen sachlich beantworten, ohne Details zur Behandlung',
        'Schnelle Ladezeit und gut lesbare Schrift auf dem Handy'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für eine Arztpraxis?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und welche Online-Funktionen eingebunden werden. Für Praxen passen meist diese Pakete:',
      fits: {
        start: 'Für Einzelpraxen mit klarem Angebot: Onepager oder bis zu drei Seiten mit Sprechzeiten, Leistungen, Team und Terminlink.',
        business: 'Für die meisten Praxen: eigene Seiten für Leistungen, Team, Patienteninfos, Rezeptanfrage und Karriere, rund vier bis sieben Seiten.',
        wachstum: 'Für Gemeinschaftspraxen und MVZ mit mehreren Fachgebieten oder den Relaunch einer bestehenden Praxis-Website mit acht bis zwölf Seiten.'
      },
      note: 'Terminportale wie Doctolib oder Jameda binde ich in jedem Paket ein; deren Lizenz zahlst du direkt beim Anbieter. Eigene Sonderfunktionen sind Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Fachrichtung, Patientengruppen, Terminweg und welches Paket passt.' },
        { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte zu Leistungen und Team, gern auch Fotos vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, barrierearm, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht inklusive Pflichtangaben, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen, etwa bei Urlaubszeiten, oder dein Team pflegt sie selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Arztpraxen' }
  ],
  cta: {
    title: 'Lass uns über deine Praxis sprechen',
    text: 'Erzähl mir kurz, welche Fachrichtung du hast, wie Patienten heute an Termine kommen und was dein Team am meisten Zeit am Telefon kostet. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'Bitkom: Zwei Drittel vereinbaren Arzttermine online, Presseinformation vom 22.12.2025', href: 'https://www.bitkom.org/Presse/Presseinformation/Zwei-Drittel-vereinbaren-Arzttermine-online' },
    { label: 'Ärztekammer Berlin: Ankündigungsmöglichkeiten einer Arztpraxis', href: 'https://www.aekb.de/fileadmin/migration/pdf/55_Ankuendigungsmoeglichkeiten_Arztpraxis.pdf' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' },
    { label: '§ 3 Heilmittelwerbegesetz: Irreführende Werbung', href: 'https://www.gesetze-im-internet.de/heilmwerbg/__3.html' },
    { label: '§ 3 BFSG (Gesetz zur Barrierefreiheit): Ausnahme für Kleinstunternehmen', href: 'https://www.gesetze-im-internet.de/bfsg/__3.html' }
  ]
});
