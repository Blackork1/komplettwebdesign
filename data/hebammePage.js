// Inhalte der Seite /branchen/webdesign-hebamme („Website für Hebammen“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/hebamme.md):
// Google-Suchvorschläge von Hebammen und Familien, Suchergebnisse, das bifg-Faktenblatt zu Hebammenkapazitäten
// und § 24d SGB V.

export const HEBAMME_CONTENT_UPDATED_ISO = '2026-10-29';

const BIFG_SOURCE = 'bifg-Faktenblatt Hebammen, 2026';

export const HEBAMME_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für eine Hebamme?',
    a: 'Eine kompakte Website für eine freiberufliche Hebamme startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Kurse, häufige Fragen und Über mich liegt das Business-Paket bei {{price.business}}, Hebammenpraxen mit mehreren Hebammen im Wachstum-Paket bei {{price.wachstum}}. Hosting, Domain und Wartung sind optional.'
  },
  {
    q: 'Wie zeige ich freie Plätze, ohne die Seite ständig umzubauen?',
    a: 'Mit einer einfachen Liste nach Entbindungsmonaten, etwa „März: noch frei, April: ausgebucht“. Die pflegst du selbst in wenigen Klicks oder schickst mir eine kurze Nachricht. Wichtig ist, dass der Stand sichtbar datiert ist, damit niemand einer alten Angabe vertraut.'
  },
  {
    q: 'Ab wann suchen Schwangere eine Hebamme, und wie gehe ich damit um?',
    a: 'Viele suchen sehr früh, oft schon im ersten Drittel der Schwangerschaft, weil Plätze in Berlin schnell vergeben sind. Schreib auf deine Website, ab wann du Anfragen annimmst und wie weit im Voraus du planst. Dann wissen Familien, ob sich eine Anfrage jetzt schon lohnt.'
  },
  {
    q: 'Sollte auf meiner Website stehen, was die Krankenkasse zahlt?',
    a: 'Ja, kurz und richtig. Gesetzlich Versicherte haben nach § 24d SGB V Anspruch auf Hebammenhilfe in Schwangerschaft, bei der Geburt und im Wochenbett, die Wochenbettbetreuung bis zwölf Wochen nach der Geburt. Was darüber hinausgeht, braucht eine ärztliche Anordnung. Für Leistungen, die Familien selbst zahlen, etwa Kursgebühren für Partner, nennst du den vollständigen Preis.'
  },
  {
    q: 'Wie oft kommt die Hebamme im Wochenbett, und gehört das auf die Website?',
    a: 'Beschreibe, wie deine Wochenbettbetreuung abläuft: erster Besuch nach der Entlassung, wie oft du in den ersten Tagen kommst und wie Familien dich danach erreichen. Wie viele Besuche abgerechnet werden können, regelt der Hebammenhilfevertrag mit den Krankenkassen.'
  },
  {
    q: 'Brauche ich eine eigene Website, wenn ich schon in Hebammen-Portalen stehe?',
    a: 'Portale wie ammely oder die Hebammenliste der Krankenkassen helfen beim Gefundenwerden. Dort fehlt aber Platz für deine Haltung, deine Kurse und die Antworten auf häufige Fragen. Die eigene Website ergänzt den Eintrag, und der Eintrag verlinkt auf die Website.'
  },
  {
    q: 'Darf ich Fotos von Familien und Babys zeigen?',
    a: 'Nur mit schriftlicher Einwilligung der Eltern. Viele Hebammen zeigen lieber Kursräume, Hände, Details oder sich selbst. Das wirkt persönlich und ist rechtlich unkompliziert.'
  },
  {
    q: 'Können Kurse direkt über die Website gebucht werden?',
    a: 'Ja. Nutzt du schon ein Kursbuchungs-System, binde ich es ein. Für wenige Kurse reicht oft ein Anmeldeformular mit Bestätigung per E-Mail. Eine eigene Kursverwaltung mit Wartelisten setze ich im Individuell-Paket um.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Leistungsbeschreibung, Kurstermine und ein Foto von dir früh vor, geht es schneller.'
  },
  {
    q: 'Wie werde ich bei „Hebamme in der Nähe“ gefunden?',
    a: 'Mit deinem Einzugsgebiet als Text auf der Website, gepflegten Einträgen in Hebammen-Portalen und, wenn du Praxis- oder Kursräume hast, einem Google-Unternehmensprofil. Feste Platzierungen kann niemand seriös garantieren.'
  }
]);

export const HEBAMME_PAGE = Object.freeze({
  slug: 'hebamme',
  path: '/branchen/webdesign-hebamme',
  breadcrumb: 'Hebammen',
  trackPrefix: 'hebamme',
  metaTitle: 'Hebammen-Website erstellen lassen | Hebammenpraxis Berlin',
  metaDescription: 'Website für Hebammen und Hebammenpraxen in Berlin: freie Plätze nach Geburtstermin, Einzugsgebiet, Kurse und Anfrageformular klar zeigen. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Hebammen',
    serviceType: ['Website für Hebammen', 'Website für Hebammenpraxen', 'Kursseiten für Geburtsvorbereitung', 'Local SEO für Hebammen'],
    audienceType: 'Freiberufliche Hebammen und Hebammenpraxen'
  },
  hero: {
    chip: 'Webdesign für Hebammen',
    h1: 'Website für Hebammen und Hebammenpraxen in Berlin',
    lead: 'Schwangere müssen ihre Hebamme selbst finden, und in Berlin suchen viele lange. Deine Website beantwortet die Fragen, die dir sonst täglich per Telefon und Mail gestellt werden: Hast du für meinen Geburtstermin noch Platz, kommst du in meinen Bezirk und welche Kurse gibt es? Ich plane und baue sie persönlich, warm im Ton und so, dass Anfragen gleich alle wichtigen Angaben enthalten.',
    highlights: [
      'Freie Plätze nach Geburtstermin auf einen Blick',
      'Einzugsgebiet nach Bezirk oder Postleitzahl',
      'Kurse mit Terminen und Anmeldung'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1761158158/admin_gallery/te6pvwc3zppf7givl7pl.webp',
    imageAlt: 'Schwarz-Weiß-Aufnahme eines Babybauchs im Profil',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Hebammen mit einer Website Zeit gewinnen',
      paragraphs: [
        'Gesetzlich Versicherte haben nach § 24d SGB V Anspruch auf Hebammenhilfe in Schwangerschaft, Geburt und Wochenbett, die Wochenbettbetreuung bis zwölf Wochen nach der Geburt. Eine Hebamme müssen sie sich aber selbst suchen. Laut einem Faktenblatt des BARMER-Instituts für Gesundheitssystemforschung nahmen 2025 rund 17.800 Hebammen am Hebammenhilfevertrag teil, bei etwa 654.000 Geburten. Die Versorgung unterscheidet sich je nach Region deutlich.',
        'Viele Anfragen erreichen dich deshalb gleichzeitig, oft ohne die Angaben, die du für eine Zusage brauchst. Eine Website, die freie Kapazitäten, Einzugsgebiet und Leistungen klar zeigt, filtert vor: Wer anfragt, passt zu deinem Angebot. Wer nicht passt, weiß es sofort und sucht weiter, ohne tagelang auf eine Antwort zu warten.'
      ],
      stats: [
        { value: '654.000', label: 'Geburten in Deutschland 2025 (2017: rund 785.000)', source: BIFG_SOURCE },
        { value: '17.800', label: 'Hebammen nahmen 2025 am Hebammenhilfevertrag teil', source: BIFG_SOURCE },
        { value: '27,3', label: 'Hebammen mit Wochenbett-Angebot je 1.000 Geburten (2017: 22,0)', source: BIFG_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website einer Hebamme gehört',
      intro: 'Diese Inhalte suchen Schwangere und Familien, bevor sie anfragen. Zugleich helfen sie Google, dich deinem Bezirk und deinen Leistungen zuzuordnen.',
      items: [
        { icon: 'fa-calendar-days', title: 'Freie Plätze nach Geburtstermin', text: 'Für welche Entbindungsmonate du noch Wochenbettbetreuung anbietest und ab wann du ausgebucht bist. Das spart dir die meisten Absagen.' },
        { icon: 'fa-map-location-dot', title: 'Einzugsgebiet', text: 'Bezirke oder Postleitzahlen, in denen du Hausbesuche machst. Gesucht wird oft „Hebamme Berlin Pankow“ oder „Hebamme finden in der Nähe“.' },
        { icon: 'fa-list-check', title: 'Leistungen', text: 'Schwangerenvorsorge, Wochenbettbetreuung, Stillberatung, Geburtsvorbereitung und Rückbildung, jeweils kurz und verständlich erklärt.' },
        { icon: 'fa-people-group', title: 'Kurse', text: 'Geburtsvorbereitung für Frauen oder Paare, Rückbildung und Babykurse mit Terminen, Ort, Kosten für Partner und Anmeldeweg.' },
        { icon: 'fa-envelope-open-text', title: 'Anfrageformular', text: 'Ein Formular, das errechneten Termin, Wohnort und gewünschte Leistungen abfragt. So kannst du in Sekunden zu- oder absagen.' },
        { icon: 'fa-circle-question', title: 'Antworten auf häufige Fragen', text: 'Ab wann suchen? Was zahlt die Krankenkasse? Wie läuft das Wochenbett ab? Was du einmal gut erklärst, musst du nicht hundertmal schreiben.' },
        { icon: 'fa-user', title: 'Über dich', text: 'Foto, Ausbildung, Schwerpunkte und deine Haltung. Bei einer so persönlichen Begleitung zählt der erste Eindruck.' },
        { icon: 'fa-phone', title: 'Erreichbarkeit', text: 'Wann du telefonisch erreichbar bist und wie Familien dich im Wochenbett kontaktieren. So sind die Erwartungen von Anfang an klar.' }
      ]
    },
    {
      type: 'catalog',
      id: 'angebote',
      chip: 'Angebote',
      title: 'Websites für freiberufliche Hebammen, Praxen und Kurse',
      intro: 'Eine einzelne Hebamme mit Wochenbettbetreuung braucht andere Seiten als eine Hebammenpraxis mit Kursraum. Die Übersicht zeigt, welche Inhalte sich lohnen und wie Familien tatsächlich suchen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Freiberufliche Hebamme', pages: ['Freie Plätze nach Geburtstermin', 'Einzugsgebiet für Hausbesuche', 'Anfrage mit errechnetem Termin'], searches: ['Hebamme Berlin Pankow', 'Hebamme finden Berlin'] },
        { name: 'Hebammenpraxis oder Team', pages: ['Hebammen mit Schwerpunkten', 'Eine gemeinsame Anfrage für alle', 'Räume, Anfahrt und Sprechzeiten'], searches: ['Hebamme Berlin Mitte', 'Hebamme suchen Berlin'] },
        { name: 'Kurse', pages: ['Geburtsvorbereitung für Frauen und Paare', 'Rückbildung und Babykurse', 'Termine und Anmeldung'], searches: ['Geburtsvorbereitungskurs Berlin Paare', 'Geburtsvorbereitungskurs Berlin zweites Kind'] },
        { name: 'Wochenbett und Stillberatung', pages: ['Ablauf der Wochenbettbesuche', 'Was die Krankenkasse übernimmt', 'Stillberatung nach der Geburt'], searches: ['Hebamme Wochenbett wie oft', 'Hebamme Wochenbett Krankenkasse'] },
        { name: 'Beleghebamme und Geburtshaus', pages: ['Geburtsorte und Kooperationen', 'Rufbereitschaft und Kosten', 'Informationsabende'], searches: ['Hebamme Berlin Charlottenburg', 'Hebamme suchen ab wann'] }
      ],
      related: {
        title: 'Arztpraxis oder Physiotherapie?',
        text: 'Für weitere Gesundheitsberufe gibt es eigene Seiten:',
        links: [
          { label: 'Website für Arztpraxen', href: '/branchen/webdesign-arzt' },
          { label: 'Website für Physiotherapie-Praxen', href: '/branchen/webdesign-physiotherapie' }
        ]
      }
    },
    {
      type: 'form',
      id: 'anfrage',
      soft: true,
      chip: 'Anfragen',
      title: 'Anfrageformular: alle Angaben für eine schnelle Antwort',
      text: 'Die meisten Anfragen kommen per Mail, oft ohne Geburtstermin oder Wohnort. Ein kurzes Formular fragt genau ab, was du für deine Entscheidung brauchst, und zeigt vorher, für welche Monate du noch Plätze hast.',
      formLabel: 'Beispiel: Felder der Hebammen-Anfrage',
      fields: [
        { label: 'Errechneter Termin', hint: 'Monat und Jahr genügen' },
        { label: 'Wohnort', hint: 'Bezirk oder Postleitzahl' },
        { label: 'Gewünschte Leistungen', hint: 'Vorsorge, Wochenbett, Kurs oder Stillberatung' },
        { label: 'Erstes Kind?', hint: 'ja oder nein' },
        { label: 'Kontakt', hint: 'Telefon oder E-Mail' }
      ],
      notes: [
        'Angaben zur Schwangerschaft sind Gesundheitsdaten. Das Formular fragt deshalb nur das Nötigste ab, überträgt verschlüsselt und bekommt eine passende Datenschutzerklärung.',
        'Bist du ausgebucht, zeigt die Seite das direkt an und verweist auf ammely oder die Hebammenliste der Krankenkassen. Das erspart dir und den Familien Zeit.'
      ]
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Hebamme Berlin“ gefunden werden',
      paragraphs: [
        'Familien suchen mit Bezirk oder Bedarf: „Hebamme Berlin Lichtenberg“, „Hebamme finden in der Nähe“ oder „Geburtsvorbereitungskurs Berlin Paare“. Neben Google nutzen viele Portale wie ammely und die Hebammenliste der Krankenkassen. Deine Einträge dort und deine Website sollten dieselben Angaben enthalten.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Bezirke und Postleitzahlen deines Einzugsgebiets als Text, nicht nur als Karte',
        'Eigene Abschnitte für Kurse mit Ort und Terminen',
        'Einträge in Hebammen-Portalen mit Link zur Website',
        'Google-Unternehmensprofil, wenn du Praxis- oder Kursräume hast',
        'Aktuelle Kapazitäten, damit niemand vergeblich anfragt'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Datenschutz, Werbung und Pflichtangaben',
      paragraphs: [
        'Als Hebamme arbeitest du in einem Gesundheitsberuf und mit besonders geschützten Daten. Für die Website heißt das: sachlich über Leistungen informieren, nichts versprechen, was sich nicht belegen lässt, und nur so viele Angaben abfragen, wie für die Anfrage nötig sind.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Impressum nach § 5 DDG mit Berufsbezeichnung Hebamme, Staat der Erlaubnis und Hinweis auf das Hebammengesetz',
        'Ergänzende Methoden sachlich beschreiben, ohne Wirkversprechen',
        'Fotos von Familien und Babys nur mit schriftlicher Einwilligung',
        'Sparsames Anfrageformular, verschlüsselte Übertragung und passende Datenschutzerklärung',
        'Kursgebühren und Kosten für Partner vollständig angeben'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das dein Berufsverband oder eine Anwältin bzw. ein Anwalt.',
      noteLink: { href: '/leistungen/rechtliches-sicherheit', label: 'Rechtliches und Sicherheit' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für eine Hebamme?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob Kurse mit Anmeldung dazukommen. Für Hebammen passen meist diese Pakete:',
      fits: {
        start: 'Für freiberufliche Hebammen: Onepager oder bis zu drei Seiten mit Leistungen, Einzugsgebiet, freien Plätzen und Anfrageformular.',
        business: 'Für Hebammen mit Kursangebot: Seiten für Leistungen, Kurse, häufige Fragen und Über mich, rund vier bis sieben Seiten.',
        wachstum: 'Für Hebammenpraxen und Teams mit mehreren Hebammen und Kursräumen oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Vorhandene Kursbuchungs- oder Terminsysteme binde ich in jedem Paket ein. Eine eigene Kursverwaltung mit Wartelisten ist Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Leistungen, Einzugsgebiet, Kurse und welches Paket passt.' },
        { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte zu deinen Leistungen und ein Foto von dir.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, ruhig im Auftritt, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht inklusive Pflichtangaben, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Freie Plätze und Kurstermine aktualisierst du selbst in wenigen Klicks, oder ich übernehme das für dich.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Hebammen' }
  ],
  cta: {
    title: 'Lass uns über deine Arbeit sprechen',
    text: 'Erzähl mir kurz, welche Leistungen du anbietest, in welchen Bezirken du unterwegs bist und welche Fragen dir am häufigsten gestellt werden. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' },
    { label: 'Website für Arztpraxen', href: '/branchen/webdesign-arzt' }
  ],
  sources: [
    { label: 'bifg: Faktenblatt „Leistungsangebote von Hebammen“, 2026', href: 'https://www.bifg.de/media/dl/ePaper/factsheets/bifg-Factsheet-Hebammenkapazit%C3%A4ten.pdf' },
    { label: '§ 24d SGB V: Ärztliche Betreuung und Hebammenhilfe', href: 'https://www.gesetze-im-internet.de/sgb_5/__24d.html' },
    { label: 'Hebammengesetz', href: 'https://www.gesetze-im-internet.de/hebg_2020/' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' }
  ]
});
