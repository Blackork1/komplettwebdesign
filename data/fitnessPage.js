// Inhalte der Seite /branchen/webdesign-fitnesscoach („Website für Fitnessstudios und Personal Trainer“).
// Grundlage: Search-Console-Daten Juni bis Oktober 2026 („fitnessstudio website erstellen lassen“,
// „fitnessstudio website agentur“, „webdesign fitnessstudio“, „webdesign für personal trainer“) und die
// DSSV-Eckdaten der deutschen Fitnesswirtschaft 2026. Die Adresse bleibt aus der alten Branchenseite bestehen.

export const FITNESS_CONTENT_UPDATED_ISO = '2026-10-25';

const DSSV_SOURCE = 'DSSV-Eckdaten 2026';

export const FITNESS_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für ein Fitnessstudio?',
    a: 'Eine kompakte Website für ein Studio oder einen Personal Trainer startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Kurse, Trainingsbereiche, Team und Preise liegt das Business-Paket bei {{price.business}}, größere Websites oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Eine eigene Online-Buchung ist eine Zusatzleistung.'
  },
  {
    q: 'Brauche ich eine Online-Buchung auf der Website?',
    a: 'Nicht unbedingt. Viele Studios nutzen bereits eine Studio-Software oder App für Mitglieder und Kurse. Dann verlinkt die Website darauf oder bindet den Kursplan ein. Für das Probetraining reicht oft ein kurzes Formular mit Rückruf. Eine eigene Buchungslösung plane ich nur, wenn sie wirklich gebraucht wird.'
  },
  {
    q: 'Sollte ich Preise und Mitgliedschaften auf der Website zeigen?',
    a: 'Ja, zumindest ab-Preise oder die Tarifmodelle. Wer Studios vergleicht, schaut auf Preis, Laufzeit und Öffnungszeiten. Fehlen diese Angaben, ruft er eher beim nächsten Studio an, das sie zeigt.'
  },
  {
    q: 'Wie hebe ich mich von Ketten und Aggregatoren ab?',
    a: 'Mit allem, was eine Kette nicht bietet: persönliche Betreuung, Trainerinnen und Trainer mit Namen und Qualifikation, Kurse mit festem Team, besondere Trainingsbereiche und echte Ergebnisse von Mitgliedern, sofern sie einverstanden sind. Die Website macht das sichtbar, bevor jemand zum Probetraining kommt.'
  },
  {
    q: 'Was braucht eine Website für Personal Trainer?',
    a: 'Ein klares Angebot mit Paketen und Preisrahmen, deine Qualifikation, Trainingsorte im Studio, draußen oder zu Hause, echte Stimmen von Kundinnen und Kunden und einen einfachen Weg zum Kennenlerngespräch. Für Online-Coaching kommt eine Seite zum Ablauf dazu.'
  },
  {
    q: 'Darf ich Vorher-Nachher-Fotos von Mitgliedern zeigen?',
    a: 'Nur mit schriftlicher Einwilligung der abgebildeten Person. Gesundheitsversprechen wie garantierte Kilos in einer bestimmten Zeit solltest du vermeiden. Glaubwürdiger sind ehrliche Erfahrungsberichte mit Namen oder Vornamen und Foto.'
  },
  {
    q: 'Wie werde ich bei „Fitnessstudio in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Öffnungszeiten, Fotos und Bewertungen, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Trainingsbereiche, Kurse, Bezirk und Anfahrt. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Kursplan und Angebote selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir dann eine einfache Verwaltung ein, mit der du Texte, Bilder und Angebote selbst änderst. Ein Kursplan aus deiner Studio-Software lässt sich oft direkt einbinden, dann pflegst du ihn nur an einer Stelle.'
  },
  {
    q: 'Wie lange dauert es, bis meine Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Fotos aus dem Studio und die Tarife früh vor, geht es schneller.'
  },
  {
    q: 'Kann meine bestehende Studio-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  }
]);

export const FITNESS_PAGE = Object.freeze({
  slug: 'fitnesscoach',
  path: '/branchen/webdesign-fitnesscoach',
  breadcrumb: 'Fitnessstudios',
  trackPrefix: 'fitness',
  metaTitle: 'Fitnessstudio-Website erstellen lassen | Personal Trainer',
  metaDescription: 'Webdesign für Fitnessstudios, Gyms und Personal Trainer in Berlin: Kurse, Preise, Probetraining und Team klar zeigen. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Fitnessstudios',
    serviceType: ['Website für Fitnessstudios', 'Webdesign für Gyms', 'Website für Personal Trainer', 'Local SEO für Fitnessstudios'],
    audienceType: 'Fitnessstudios, Gyms und Personal Trainer'
  },
  hero: {
    chip: 'Webdesign für Fitness',
    h1: 'Website für Fitnessstudios und Personal Trainer in Berlin',
    lead: 'Deine Website zeigt in wenigen Sekunden, wie bei dir trainiert wird, was es kostet und wie man zum Probetraining kommt. Ich plane und baue sie persönlich: mit echten Bildern aus deinem Studio, klaren Tarifen und einem Weg zur Anfrage, der zu deiner Studio-Software passt.',
    highlights: [
      'Kurse, Trainingsbereiche und Team auf einen Blick',
      'Probetraining mit einem Tipp anfragen',
      'Gefunden werden bei „Fitnessstudio in der Nähe“'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1761069298/admin_gallery/aqro92igklmkmydyfz1p.webp',
    imageAlt: 'Frau trainiert im Fitnessstudio an der Langhantel',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum ein Fitnessstudio online überzeugen muss',
      paragraphs: [
        'Die Branche wächst: Laut DSSV-Eckdaten 2026 trainierten 2025 rund 12,36 Millionen Mitglieder in 9.647 Fitness- und Gesundheitsanlagen. Mehr Anlagen bedeuten aber auch mehr Auswahl. Wer ein Studio sucht, vergleicht online Lage, Preise, Öffnungszeiten und Atmosphäre, bevor er zum Probetraining kommt.',
        'Dazu kommen Ketten mit niedrigen Beiträgen und Aggregatoren: 76,1 Prozent der Anlagen sind an mindestens ein Netzwerk wie Urban Sports Club oder Wellpass angebunden. Einzelstudios und Personal Trainer gewinnen deshalb über Betreuung, Atmosphäre und Spezialisierung. Genau das muss die Website zeigen.'
      ],
      stats: [
        { value: '12,36 Mio.', label: 'Mitglieder in deutschen Fitness- und Gesundheitsanlagen (2025)', source: DSSV_SOURCE },
        { value: '9.647', label: 'Fitness- und Gesundheitsanlagen in Deutschland', source: DSSV_SOURCE },
        { value: '76,1 %', label: 'der Anlagen sind an mindestens ein Aggregatoren-Netzwerk angebunden', source: DSSV_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website eines Fitnessstudios gehört',
      intro: 'Diese Inhalte erwarten Interessenten, bevor sie zum Probetraining kommen. Zugleich helfen sie Google zu verstehen, was dein Studio bietet und wo es liegt.',
      items: [
        { icon: 'fa-dumbbell', title: 'Trainingsbereiche', text: 'Gerätezone, freie Gewichte, Functional, Cardio, Kursräume oder Sauna: Mit echten Fotos sieht jeder sofort, ob das Studio zu ihm passt.' },
        { icon: 'fa-calendar-days', title: 'Kursplan', text: 'Aktuelle Kurse mit Zeiten und Trainerin oder Trainer, direkt aus deiner Studio-Software eingebunden oder einfach gepflegt.' },
        { icon: 'fa-tags', title: 'Tarife und Preise', text: 'Mitgliedschaften, Laufzeiten und ab-Preise. Wer vergleicht, entscheidet sich eher für das Studio, das offen zeigt, was es kostet.' },
        { icon: 'fa-hand-pointer', title: 'Probetraining', text: 'Ein kurzer Anfrageweg mit Wunschtermin oder Rückruf. Auf dem Handy bleibt der Button immer erreichbar.' },
        { icon: 'fa-people-group', title: 'Team und Qualifikation', text: 'Trainerinnen und Trainer mit Foto, Schwerpunkt und Ausbildung. Persönliche Betreuung ist das stärkste Argument gegen die Kette.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten und Anfahrt', text: 'Öffnungs- und Betreuungszeiten, Parkplätze, ÖPNV und Bezirk. Für viele ist die Lage das wichtigste Kriterium.' },
        { icon: 'fa-star', title: 'Stimmen von Mitgliedern', text: 'Google-Bewertungen und echte Erfahrungsberichte, mit Einwilligung der Mitglieder. Das wirkt glaubwürdiger als Versprechen.' },
        { icon: 'fa-user-plus', title: 'Jobs', text: 'Offene Stellen für Trainerinnen, Trainer und Theke mit einem kurzen Bewerbungsweg.' }
      ]
    },
    {
      type: 'catalog',
      id: 'studioarten',
      chip: 'Studioarten',
      title: 'Websites für Fitnessstudios, Gyms und Personal Trainer',
      intro: 'Ein Boutique-Studio braucht andere Seiten als ein großes Gym oder ein Personal Trainer. Die Übersicht zeigt, welche Inhalte sich lohnen und wie typische Suchen in Berlin aussehen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Fitnessstudio und Gym', pages: ['Trainingsbereiche mit Fotos', 'Tarife und Probetraining', 'Öffnungs- und Betreuungszeiten'], searches: ['Fitnessstudio Friedrichshain', 'Gym Berlin Mitte'] },
        { name: 'Kurs- und Boutique-Studio', pages: ['Kursplan und Kursbeschreibungen', 'Einsteigerangebote und Zehnerkarten', 'Team und Atmosphäre'], searches: ['Yoga Studio Prenzlauer Berg', 'Functional Training Kreuzberg'] },
        { name: 'Personal Trainer', pages: ['Pakete und Preisrahmen', 'Qualifikation und Schwerpunkte', 'Kennenlerngespräch buchen'], searches: ['Personal Trainer Berlin', 'Personal Training Charlottenburg'] },
        { name: 'Online-Coaching', pages: ['Ablauf und Betreuung', 'Programme und Laufzeiten', 'Stimmen von Kundinnen und Kunden'], searches: ['Online Coaching Fitness', 'Trainingsplan Online Coach'] },
        { name: 'Gesundheits- und Rehasport', pages: ['Kurse und Voraussetzungen', 'Zusammenarbeit mit Ärzten und Kassen', 'Barrierearme Anfahrt'], searches: ['Rehasport Berlin', 'Rückentraining Spandau'] }
      ]
    },
    {
      type: 'form',
      id: 'probetraining',
      soft: true,
      chip: 'Anfragen',
      title: 'Probetraining: der wichtigste Klick auf deiner Website',
      text: 'Die meisten Mitgliedschaften beginnen mit einem Probetraining. Je einfacher der Weg dorthin, desto mehr Interessenten kommen tatsächlich vorbei. Das Formular fragt nur, was du für die Vorbereitung brauchst.',
      formLabel: 'Beispiel: Felder der Probetraining-Anfrage',
      fields: [
        { label: 'Was interessiert dich?', hint: 'Gerätetraining, Kurse, Personal Training' },
        { label: 'Wunschtermin', hint: 'Tag und Tageszeit' },
        { label: 'Ziel', hint: 'zum Beispiel Rücken, Kraft, Abnehmen' },
        { label: 'Erfahrung', hint: 'Einsteiger oder schon aktiv' },
        { label: 'Rückruf oder E-Mail', hint: 'wie du dich melden sollst' }
      ],
      notes: [
        'Nutzt dein Studio schon eine Software für Mitglieder und Termine, verlinkt die Website darauf. So pflegst du alles an einer Stelle.',
        'Ein sichtbarer Anruf- oder WhatsApp-Button hilft allen, die lieber kurz nachfragen.'
      ]
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Fitnessstudio in der Nähe“ gefunden werden',
      paragraphs: [
        'Wer ein Studio sucht, sucht fast immer in der Nähe von Wohnung oder Arbeit. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit dein Studio dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich',
        'Fotos aus dem Studio im Google-Profil und auf der Website, regelmäßig aktualisiert',
        'Eigene Seiten für Schwerpunkte wie Kurse oder Personal Training, mit Bezirk im Text',
        'Bewertungen von Mitgliedern aktiv anfragen und beantworten',
        'Schnelle Ladezeit auf dem Handy, denn dort wird gesucht'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für ein Fitnessstudio?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob Kursplan oder Buchung eingebunden werden. Für Studios und Trainer passen meist diese Pakete:',
      fits: {
        start: 'Für Personal Trainer und kleine Studios: Onepager oder bis zu drei Seiten mit Angebot, Preisen und Probetraining.',
        business: 'Für die meisten Studios: Seiten für Trainingsbereiche, Kurse, Team und Tarife, rund vier bis sieben Seiten.',
        wachstum: 'Für größere Studios mit mehreren Bereichen oder Standorten oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Eine eigene Online-Buchung ist Teil des Individuell-Pakets {{price.individuell}}; vorhandene Studio-Software verlinke ich in jedem Paket. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Angebot, Zielgruppe, Tarife und welches Paket passt.' },
        { title: 'Seitenplan und Fotos', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Stichpunkte und Fotos aus dem Studio, gern vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen oder du pflegst Angebote selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Fitnessstudios' }
  ],
  cta: {
    title: 'Lass uns über dein Studio sprechen',
    text: 'Erzähl mir kurz, was dein Studio oder dein Training besonders macht und wie Interessenten heute zu dir finden. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'DSSV: Eckdaten der deutschen Fitnesswirtschaft 2026, Pressemitteilung vom 18.03.2026', href: 'https://www.dssv.de/wp-content/uploads/2026/03/03_18_pm_eckdaten.pdf' }
  ]
});
