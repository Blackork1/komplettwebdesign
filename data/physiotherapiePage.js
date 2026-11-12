// Inhalte der Seite /branchen/webdesign-physiotherapie („Website für Physiotherapie-Praxen“).
// Grundlage: Branchenanalyse vom 29.10.2026 (docs/seo/content-briefs/2026-10-29-branchen/physiotherapie.md):
// Google-Suchvorschläge von Praxen und Patienten, Konkurrenzseiten, IFK zur Fachkräfteengpassanalyse
// der Bundesagentur für Arbeit und das BVerwG-Urteil zur sektoralen Heilpraktikererlaubnis.

export const PHYSIOTHERAPIE_CONTENT_UPDATED_ISO = '2026-11-11';

const IFK_SOURCE = 'IFK zur BA-Engpassanalyse, August 2025';

export const PHYSIOTHERAPIE_FAQ = Object.freeze([
  {
    q: 'Was kostet eine Website für eine Physiotherapie-Praxis?',
    a: 'Eine kompakte Praxis-Website startet bei Komplett Webdesign {{price.start}}. Mit eigenen Seiten für Leistungen, Hausbesuche, Team und Karriere liegt das Business-Paket bei {{price.business}}, größere Websites oder ein Relaunch im Wachstum-Paket bei {{price.wachstum}}. Vorhandene Terminsoftware binde ich in jedem Paket ein.'
  },
  {
    q: 'Brauche ich eine Online-Terminbuchung?',
    a: 'Nicht unbedingt. Viele Praxen planen Termine lieber selbst, weil Serien mit der Verordnung abgestimmt werden müssen. Dann reicht eine kurze Terminanfrage mit Rückruf. Hat deine Praxissoftware eine Online-Buchung, verlinkt die Website direkt darauf.'
  },
  {
    q: 'Hilft die Website bei der Suche nach Physiotherapeutinnen und Physiotherapeuten?',
    a: 'Ja, wenn sie zeigt, wie bei dir gearbeitet wird: Team, Arbeitszeiten, Fortbildungen, Ausstattung und ein Bewerbungsweg ohne Anschreiben-Pflicht. Stellenanzeigen kann ich so auszeichnen, dass Google sie in der Jobsuche anzeigen kann. Bei Vakanzzeiten von im Schnitt 280 Tagen ist die Karriereseite oft genauso wichtig wie die Leistungsseite.'
  },
  {
    q: 'Darf ich Behandlungen ohne Rezept anbieten und bewerben?',
    a: 'Ohne ärztliche Verordnung dürfen Physiotherapeutinnen und Physiotherapeuten nach einem Urteil des obersten deutschen Verwaltungsgerichts nur mit einer auf Physiotherapie beschränkten Heilpraktikererlaubnis behandeln. Hast du sie, kann die Website Selbstzahler-Angebote zeigen. Ohne Erlaubnis bleiben zum Beispiel Kurse oder Training ohne Heilanspruch. Die Texte formuliere ich passend zu dem, was du darfst.'
  },
  {
    q: 'Wie stelle ich meine Absageregel auf der Website dar?',
    a: 'Schreib die Regel klar und freundlich auf die Seite, etwa dass Termine bis 24 Stunden vorher abgesagt werden müssen, und lass sie dir beim ersten Termin bestätigen. Ob und in welcher Höhe eine Ausfallgebühr verlangt werden darf, klärst du am besten mit deinem Berufsverband.'
  },
  {
    q: 'Wie zeige ich Hausbesuche richtig?',
    a: 'Mit einer eigenen Seite oder einem eigenen Abschnitt: für wen Hausbesuche möglich sind, in welchen Bezirken und dass die Verordnung den Hausbesuch enthalten muss. Angehörige und Pflegedienste fragen oft für andere an, das Formular sollte das berücksichtigen.'
  },
  {
    q: 'Wie werde ich bei „Physiotherapie in der Nähe“ gefunden?',
    a: 'Vor allem über ein gepflegtes Google-Unternehmensprofil mit Leistungen, Öffnungszeiten und Fotos, das zu deiner Website passt. Die Website liefert die Inhalte dazu: Behandlungen, Hausbesuche, Bezirk und Anfahrt. Nutze dabei beide Begriffe, Physiotherapie und Krankengymnastik. Feste Platzierungen kann niemand seriös garantieren.'
  },
  {
    q: 'Kann ich Öffnungszeiten und Stellenanzeigen selbst ändern?',
    a: 'Ja, auf Wunsch. Ich richte dir eine einfache Verwaltung ein, mit der du Texte, Zeiten und Stellen selbst änderst. Wenn du dich darum nicht kümmern möchtest, übernehme ich Änderungen für dich.'
  },
  {
    q: 'Wie lange dauert es, bis meine Praxis-Website online ist?',
    a: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Liegen Leistungsliste, Teamfotos und Stellenbeschreibungen früh vor, geht es schneller.'
  },
  {
    q: 'Kann meine bestehende Praxis-Website überarbeitet werden?',
    a: 'Ja. Bei einem Relaunch prüfe ich zuerst, welche Inhalte und Seitenadressen bei Google bereits funktionieren. Wichtige Inhalte bleiben erhalten, alte Adressen werden sauber auf die neuen Seiten weitergeleitet.'
  },
  {
    q: 'Wie viele Seiten braucht die Website einer Physiotherapie-Praxis?',
    a: 'Für den Start reichen drei: eine Startseite, eine Übersicht der Therapien und eine Kontaktseite mit Terminanfrage und Anfahrt. Das deckt das Start-Paket ({{price.start}}) ab. Wer Therapien einzeln erklären und Hausbesuche, Team und Karriere zeigen will, plant etwa vier bis sieben Seiten. Dafür passt das Business-Paket.'
  },
  {
    q: 'Sollte jede Therapie eine eigene Seite bekommen?',
    a: 'Die wichtigsten ja. Wer „Manuelle Therapie“ oder „Lymphdrainage“ mit seinem Bezirk sucht, landet lieber auf einer Seite, die genau das erklärt, als in einer langen Liste. Was du selten anbietest, bleibt ein Absatz in der Übersicht. Seiten mit nur drei Sätzen helfen weder Patienten noch bei Google.'
  },
  {
    q: 'Physiotherapie-Website selbst bauen oder erstellen lassen?',
    a: 'Ein Baukasten kann reichen, wenn du Zeit hast und Texte, Bilder und Technik selbst übernimmst. Lässt du die Website erstellen, bekommst du Seitenplan, Texte, Gestaltung und Umsetzung aus einer Hand, dazu kurze Ladezeiten auf dem Handy und saubere Angaben für die lokale Suche. Du sprichst dabei direkt mit mir und nicht mit wechselnden Ansprechpartnern.'
  },
  {
    q: 'Wie zeige ich mehrere Standorte einer Praxis?',
    a: 'Jeder Standort bekommt eine eigene Seite mit Adresse, Öffnungszeiten, Team, Therapien und Anfahrt. Das hilft bei der Orientierung und in der lokalen Suche, weil jede Seite zu einem eigenen Google-Unternehmensprofil passt. Bei mehreren Standorten ist meist das Wachstum-Paket ({{price.wachstum}}) die richtige Größe.'
  },
  {
    q: 'Kann ich Kurse und Gerätetraining auf der Website zeigen?',
    a: 'Ja, am besten in einem eigenen Abschnitt mit Zeiten, Kosten und einer Anmeldung per Formular. Die Texte beschreiben Ablauf und Inhalte und versprechen keine Wirkung. Ob eine Krankenkasse einen Kurs bezuschusst, hängt von dessen Zulassung ab. Das steht nur dann auf der Seite, wenn es für den Kurs zutrifft.'
  },
  {
    q: 'Welche Fotos braucht eine Physio-Website?',
    a: 'Echte Fotos aus deiner Praxis: Empfang, Behandlungsräume, Trainingsfläche und das Team. Sie zeigen, was Patienten erwartet, und wirken glaubwürdiger als gekaufte Bilder. Personen sind nur mit Einwilligung zu sehen. Ein Termin mit einer Fotografin oder einem Fotografen lohnt sich meist, für den Anfang reichen gute Handyfotos bei Tageslicht.'
  }
]);

export const PHYSIOTHERAPIE_PAGE = Object.freeze({
  slug: 'physiotherapie',
  path: '/branchen/webdesign-physiotherapie',
  breadcrumb: 'Physiotherapie',
  trackPrefix: 'physiotherapie',
  motion: true,
  tone: 'frisch',
  metaTitle: 'Physiotherapie-Website erstellen lassen | Praxis Berlin',
  metaDescription: 'Website für Physiotherapie-Praxen in Berlin: Leistungen, Hausbesuche, Terminanfrage mit Verordnung und eine Karriereseite für Therapeuten. Pakete {{price.start}}.',
  schema: {
    serviceName: 'Webdesign für Physiotherapie-Praxen',
    serviceType: ['Website für Physiotherapie', 'Praxis-Homepage Physiotherapie', 'Karriereseite für Therapeuten', 'Local SEO für Physiotherapie'],
    audienceType: 'Physiotherapie-Praxen und Krankengymnastik-Praxen'
  },
  hero: {
    chip: 'Webdesign für Physiotherapie',
    h1: 'Website für Physiotherapie-Praxen in Berlin erstellen lassen',
    lead: 'Wer eine Verordnung in der Hand hat, sucht eine Praxis in der Nähe mit freien Terminen, oft mit Hausbesuch oder Kassenzulassung. Wer Physiotherapeutin oder Physiotherapeut ist, sucht einen guten Arbeitsplatz. Deine Website muss beide überzeugen. Ich plane und baue sie persönlich, mit klarer Terminanfrage und einer Karriereseite, die Bewerbungen bringt.',
    highlights: [
      'Kasse, Privat und Selbstzahler sauber getrennt',
      'Terminanfrage mit Verordnung in einer Minute',
      'Karriereseite gegen den Fachkräftemangel'
    ],
    image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/c_fill,w_960,h_640,q_auto/v1769938570/admin_gallery/wugub7wexao2u0jdijtt.webp',
    imageAlt: 'Heller Empfangstresen eines Therapiezentrums mit Wegweiser zu den Behandlungsbereichen',
    imageSize: [960, 640]
  },
  sections: [
    {
      type: 'why',
      id: 'warum',
      chip: 'Ausgangslage',
      title: 'Warum Physio-Praxen online um Patienten und Personal werben',
      paragraphs: [
        'Kaum ein Beruf ist so gefragt: In der Fachkräfteengpassanalyse der Bundesagentur für Arbeit erreicht die Physiotherapie den höchsten Engpasswert unter den Spezialistenberufen, gemeinsam mit der Ergotherapie. Eine freie Stelle blieb im Schnitt 280 Tage unbesetzt, ein Jahr zuvor waren es 253 Tage.',
        'Deine Website arbeitet deshalb in zwei Richtungen. Patientinnen und Patienten suchen „Physiotherapie in der Nähe“, oft mit Zusätzen wie „Hausbesuche“, „mit Kassenvertrag“ oder „online Termin“. Bewerberinnen und Bewerber wollen sehen, wie bei dir gearbeitet wird, bevor sie sich melden. Beides gehört auf eine gute Praxis-Website.'
      ],
      stats: [
        { value: '2,7 von 3', label: 'Engpasswert der Physiotherapie, höchster Wert bei den Spezialistenberufen', source: IFK_SOURCE },
        { value: '280 Tage', label: 'dauerte es im Schnitt, eine Physiotherapie-Stelle neu zu besetzen (Vorjahr: 253 Tage)', source: IFK_SOURCE }
      ]
    },
    {
      type: 'cards',
      id: 'inhalte',
      soft: true,
      chip: 'Inhalte',
      title: 'Was auf die Website einer Physiotherapie-Praxis gehört',
      intro: 'Diese Inhalte suchen Patientinnen und Patienten, bevor sie anrufen. Zugleich helfen sie Google, deine Praxis den richtigen Behandlungen und dem Bezirk zuzuordnen.',
      items: [
        { icon: 'fa-list-check', title: 'Leistungen nach Heilmittel', text: 'Krankengymnastik, Manuelle Therapie, Lymphdrainage, KG-ZNS oder Gerätetraining, jeweils kurz erklärt, mit dem Hinweis, was auf der Verordnung stehen muss.' },
        { icon: 'fa-house', title: 'Hausbesuche', text: 'Ob du Hausbesuche machst, in welchen Bezirken und für wen. „Physiotherapie Hausbesuche“ gehört zu den häufigsten Zusatzsuchen.' },
        { icon: 'fa-file-lines', title: 'Kasse, Privat, Selbstzahler', text: 'Gesetzlich und privat Versicherte sowie Selbstzahler getrennt erklärt, damit niemand am Telefon nachfragen muss.' },
        { icon: 'fa-calendar-check', title: 'Terminanfrage', text: 'Ein kurzer Weg zum ersten Termin, mit Feldern für Verordnung, Hausbesuch und Wunschzeiten. Auf dem Handy immer erreichbar.' },
        { icon: 'fa-clock', title: 'Öffnungszeiten und Absageregel', text: 'Behandlungszeiten und wie früh ein Termin abgesagt werden muss. Die Frage „Termin verpasst, was kostet das?“ ist damit vorab beantwortet.' },
        { icon: 'fa-people-group', title: 'Team und Fortbildungen', text: 'Therapeutinnen und Therapeuten mit Foto und Zusatzqualifikationen wie Manuelle Therapie, Bobath oder Lymphdrainage.' },
        { icon: 'fa-universal-access', title: 'Anfahrt und Zugang', text: 'Etage, Aufzug, stufenloser Eingang, Parkplätze und ÖPNV. Für Menschen nach einer OP oder mit Gehhilfe entscheidend.' },
        { icon: 'fa-user-plus', title: 'Karriere', text: 'Offene Stellen, Arbeitszeiten, Fortbildungsbudget, Team und ein Bewerbungsweg, der auf dem Handy in zwei Minuten erledigt ist.' }
      ]
    },
    {
      type: 'timeline',
      id: 'alltag',
      chip: 'Beispiel',
      title: 'Ein Tag mit deiner Physio-Website',
      intro: 'Während alle Therapeutinnen und Therapeuten in der Behandlung sind, beantwortet die Website die Fragen, die sonst auf dem Anrufbeantworter landen. Die Zeiten sind ein Beispiel.',
      listLabel: 'Beispiel für einen Tag mit der Website einer Physiotherapie-Praxis',
      items: [
        { time: '07:00', title: 'Termin vor der Arbeit', text: 'Eine Patientin fragt per Formular nach Terminen ab 16 Uhr, bevor die Praxis öffnet.' },
        { time: '09:30', title: 'Mit Rezept in der Hand', text: 'Jemand kommt vom Orthopäden, sucht „Krankengymnastik in der Nähe“ und findet deine Leistungsseite.' },
        { time: '11:00', title: 'Hausbesuch für die Mutter', text: 'Ein Angehöriger liest, in welche Bezirke du fährst, und schickt die Anfrage für den Hausbesuch.' },
        { time: '14:00', title: 'Absage mit Ansage', text: 'Die Absageregel steht auf der Seite. Wer verhindert ist, weiß, bis wann und wie er absagt.' },
        { time: '17:30', title: 'Bewerbung vom Handy', text: 'Eine Therapeutin liest die Karriereseite und meldet sich in zwei Minuten, ohne Anschreiben.' },
        { time: '20:30', title: 'Fragen am Abend', text: 'Parkplatz, Aufzug, was zum ersten Termin mitzubringen ist: Die Antworten stehen auf der Seite.' }
      ],
      note: 'Du musst nicht mit allem starten. Viele Praxen beginnen mit Therapien, Terminanfrage und Anfahrt und ergänzen die Karriereseite, sobald eine Stelle frei wird.'
    },
    {
      type: 'feature',
      id: 'therapieseiten',
      soft: true,
      chip: 'Therapien',
      title: 'Website für Physiotherapie: jede Therapie verständlich erklärt',
      paragraphs: [
        'Auf der Verordnung steht „KG“, „MT“ oder „MLD“. Viele Patientinnen und Patienten wissen nicht, was sich dahinter verbirgt, und suchen genau danach: „Manuelle Therapie Berlin“ oder „Lymphdrainage in der Nähe“. Eine Liste mit zwölf Fachbegriffen beantwortet diese Suche nicht. Eine kurze Seite je Therapie schon.',
        'Jede Therapieseite erklärt in einfachen Worten, was bei der Behandlung passiert, wie lange ein Termin dauert und was auf der Verordnung stehen muss. Dazu kommt, was mitzubringen ist und ob die Therapie auch als Hausbesuch möglich ist. Am Ende steht der Weg zur Terminanfrage. Die Texte bleiben sachlich und beschreiben den Ablauf, nicht den Erfolg.',
        'Offen gesagt: Nicht jede Leistung braucht eine eigene Seite. Was du selten anbietest, steht besser als Absatz in der Übersicht. Die fachlichen Angaben kommen von dir, ich bringe sie in eine verständliche Form, und du gibst jeden Text frei. Aussagen zur Wirkung formuliere ich bewusst zurückhaltend, weil dafür das Heilmittelwerbegesetz gilt.'
      ],
      pointsTitle: 'Das gehört auf eine Therapieseite',
      points: [
        'Die Therapie in zwei Sätzen, ohne Fachsprache',
        'Was auf der Verordnung stehen muss',
        'Dauer eines Termins und Ablauf der ersten Behandlung',
        'Was Patienten zum Termin mitbringen',
        'Hinweis, ob ein Hausbesuch möglich ist',
        'Knopf zur Terminanfrage direkt auf der Seite'
      ],
      image: {
        src: '/images/branchen/physiotherapie/physiotherapie-angebot.webp',
        alt: 'Beispielaufbau einer Therapieübersicht mit sechs Kacheln von Krankengymnastik über Lymphdrainage bis Gerätetraining',
        width: 720,
        height: 540
      }
    },
    {
      type: 'catalog',
      id: 'praxisarten',
      chip: 'Praxisarten',
      title: 'Websites für Kassenpraxen, Privatpraxen und Spezialisierungen',
      intro: 'Eine Kassenpraxis mit Hausbesuchen braucht andere Seiten als eine Privatpraxis für Sportlerinnen und Sportler. Die Übersicht zeigt, welche Inhalte sich lohnen und wie Patienten tatsächlich suchen.',
      pagesLabel: 'Wichtige Inhalte',
      searchesLabel: 'So wird gesucht',
      items: [
        { name: 'Kassenpraxis', pages: ['Leistungen laut Heilmittelkatalog', 'Was auf die Verordnung gehört', 'Freie Termine und Wartezeit'], searches: ['Physiotherapie in der Nähe mit Kassenvertrag', 'Physiotherapie in der Nähe gesetzlich versichert'] },
        { name: 'Praxis mit Hausbesuchen', pages: ['Einsatzgebiet nach Bezirken', 'Ablauf beim Hausbesuch', 'Anfrage durch Angehörige oder Pflegedienst'], searches: ['Physiotherapie in der Nähe Hausbesuche', 'Krankengymnastik Berlin Reinickendorf'] },
        { name: 'Privatpraxis und Selbstzahler', pages: ['Behandlungen mit Dauer und Ablauf', 'Abrechnung für Privatversicherte', 'Angebote ohne Verordnung, soweit erlaubt'], searches: ['Physiotherapie ohne Rezept Berlin', 'Physiotherapie ohne Rezept Kosten'] },
        { name: 'Sport und Orthopädie', pages: ['Behandlung nach Verletzung oder OP', 'Gerätegestütztes Training', 'Zusammenarbeit mit Ärzten und Vereinen'], searches: ['Physiotherapie Berlin Mitte', 'Krankengymnastik Berlin Kreuzberg'] },
        { name: 'Kinder-Physiotherapie', pages: ['Behandlung nach Bobath oder Vojta', 'Ablauf mit Eltern', 'Kinderfreundliche Räume'], searches: ['Physiotherapie in der Nähe für Kinder', 'Physiotherapie Berlin Lichtenberg'] }
      ],
      related: {
        title: 'Arztpraxis oder Massage?',
        text: 'Für verwandte Berufe gibt es eigene Seiten:',
        links: [
          { label: 'Website für Arztpraxen', href: '/branchen/webdesign-arzt' },
          { label: 'Website für Massage und Wellness', href: '/branchen/webdesign-wellness' }
        ]
      }
    },
    {
      type: 'form',
      id: 'termin',
      soft: true,
      chip: 'Anfragen',
      title: 'Terminanfrage mit Verordnung: in einer Minute erledigt',
      text: 'Viele Patienten rufen an, wenn gerade alle in der Behandlung sind. Ein kurzes Formular fängt diese Anfragen auf und liefert deinem Empfang alles, was für die Terminplanung nötig ist.',
      formLabel: 'Beispiel: Felder der Terminanfrage',
      fields: [
        { label: 'Verordnung vorhanden?', hint: 'Kasse, privat oder keine' },
        { label: 'Heilmittel', hint: 'zum Beispiel KG, MT oder Lymphdrainage, wie auf der Verordnung' },
        { label: 'Hausbesuch nötig?', hint: 'ja, mit Bezirk' },
        { label: 'Wunschzeiten', hint: 'Tage und Uhrzeiten' },
        { label: 'Rückruf oder E-Mail', hint: 'wie sich die Praxis melden soll' }
      ],
      notes: [
        'Diagnosen und Befunde gehören nicht ins Formular. Die Verordnung bringen Patienten zum ersten Termin mit, das ist sicherer als ein Upload über die Website.',
        'Hat deine Praxissoftware eine Online-Buchung, führt der Termin-Button direkt dorthin.'
      ]
    },
    {
      type: 'checklist',
      id: 'recht',
      chip: 'Recht',
      title: 'Werbung, Heilmittel und Pflichtangaben',
      paragraphs: [
        'Für Physiotherapie-Praxen gilt das Heilmittelwerbegesetz: Behandlungen dürfen keine Wirkung versprechen, die sie nicht haben, und kein sicherer Erfolg darf suggeriert werden. Wer ohne ärztliche Verordnung behandeln will, braucht nach einem Urteil des obersten deutschen Verwaltungsgerichts eine auf Physiotherapie beschränkte Heilpraktikererlaubnis. Die Website muss zu dem passen, was deine Praxis tatsächlich darf.'
      ],
      cardTitle: 'Darauf achte ich bei der Umsetzung',
      items: [
        'Sachliche Beschreibungen der Behandlungen ohne Heilversprechen oder garantierte Erfolge',
        'Angebote ohne Verordnung nur, wenn eine sektorale Heilpraktikererlaubnis vorliegt',
        'Impressum nach § 5 DDG mit Berufsbezeichnung, Staat der Erlaubnis und Hinweis auf das Masseur- und Physiotherapeutengesetz',
        'Patientenstimmen nur echt und mit Einwilligung, ohne Krankengeschichten',
        'Sparsame Formulare ohne Gesundheitsdaten und eine passende Datenschutzerklärung'
      ],
      note: 'Ich setze um und weise auf heikle Stellen hin, ersetze aber keine Rechtsberatung. Verbindlich klären das dein Berufsverband oder eine Anwältin bzw. ein Anwalt.',
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
      title: 'So kann die Website für deine Physiopraxis aufgebaut sein',
      intro: 'Drei Ansichten zeigen, wie Startseite, Terminanfrage und lokale Suche zusammenspielen. Es sind Skizzen, kein fertiges Design. Deine Website bekommt eigene Farben und echte Fotos von Praxisräumen und Team.',
      items: [
        { src: '/images/branchen/physiotherapie/physiotherapie-startseite.webp', alt: 'Beispielaufbau der Startseite einer Physiotherapie-Praxis mit Überschrift, Knopf zur Terminanfrage und drei Themenkacheln', width: 720, height: 540, title: 'Startseite', caption: 'Beispielaufbau: Oben stehen Leistung, Kiez und der Knopf zum Termin, darunter Therapien, Termine und Rezept.' },
        { src: '/images/branchen/physiotherapie/physiotherapie-anfrage.webp', alt: 'Beispielaufbau einer Terminanfrage auf dem Handy mit Verordnung, Versicherung und Wunschzeit', width: 720, height: 540, title: 'Terminanfrage', caption: 'Beispielaufbau: Verordnung, Versicherung und Wunschzeit in drei Feldern, dazu die Wahl zwischen Rezept und Selbstzahler.' },
        { src: '/images/branchen/physiotherapie/physiotherapie-suche.webp', alt: 'Beispielaufbau eines lokalen Suchergebnisses für eine Physiotherapie-Praxis mit Öffnungszeiten, Route und Karte', width: 720, height: 540, title: 'Lokale Suche', caption: 'Beispielaufbau: So kann deine Praxis bei „Physiotherapie in der Nähe“ erscheinen, mit Öffnungszeiten, Route und Anruf.' }
      ],
      note: 'Farben, Schriften und Bilder richte ich nach deiner Praxis aus. Wie fertige Websites aussehen, zeigen die Referenzen.',
      noteLink: { href: '/referenzen', label: 'Referenzen ansehen' }
    },
    {
      type: 'checklist',
      id: 'google',
      chip: 'Local SEO',
      title: 'Bei „Physiotherapie in der Nähe“ gefunden werden',
      paragraphs: [
        'Gesucht wird mit Ort und Bedarf: „Physiotherapie Berlin Lichtenberg“, „Krankengymnastik Berlin Steglitz“ oder „Physiotherapie in der Nähe Hausbesuche“. Google zeigt dann zuerst die Karte mit Unternehmensprofilen. Website und Profil müssen zusammenpassen, damit deine Praxis dort auftaucht.'
      ],
      cardTitle: 'Darauf kommt es an',
      items: [
        'Name, Adresse, Telefon und Öffnungszeiten überall gleich',
        'Eigene Abschnitte für Hausbesuche und Schwerpunkte, mit Bezirken im Text',
        'Google-Profil mit Leistungen, Praxisfotos und Angaben zur Barrierefreiheit',
        'Bewertungen beantworten, ohne Details zur Behandlung',
        'Beide Begriffe verwenden: Physiotherapie und Krankengymnastik'
      ],
      note: 'Feste Platzierungen kann niemand seriös versprechen. Eine Website mit echten Inhalten ist aber die Grundlage, auf der Local SEO aufbaut.',
      noteLink: { href: '/leistungen/local-seo', label: 'Local SEO in Berlin' }
    },
    {
      type: 'pricing',
      id: 'preise',
      chip: 'Preise',
      title: 'Was kostet eine Website für eine Physiotherapie-Praxis?',
      lead: 'Der Preis hängt vor allem davon ab, wie viele Seiten du brauchst und ob Terminbuchung oder Stellenanzeigen eingebunden werden. Für Praxen passen meist diese Pakete:',
      fits: {
        start: 'Für kleine Praxen und Einzeltherapeuten: Onepager oder bis zu drei Seiten mit Leistungen, Öffnungszeiten, Team und Terminanfrage.',
        business: 'Für die meisten Praxen: Seiten für Leistungen, Hausbesuche, Team, Selbstzahler und Karriere, rund vier bis sieben Seiten.',
        wachstum: 'Für Praxen mit mehreren Standorten oder Schwerpunkten oder den Relaunch einer bestehenden Website mit acht bis zwölf Seiten.'
      },
      note: 'Vorhandene Terminsoftware mit Online-Buchung binde ich in jedem Paket ein. Eigene Sonderfunktionen sind Teil des Individuell-Pakets {{price.individuell}}. Hosting, Domain, E-Mail und Wartung sind optional.'
    },
    {
      type: 'process',
      id: 'ablauf',
      chip: 'Ablauf',
      title: 'So läuft dein Projekt ab',
      steps: [
        { title: 'Erstgespräch', text: 'Wir klären Leistungen, Patientengruppen, Hausbesuche, Personalsuche und welches Paket passt.' },
        { title: 'Seitenplan und Inhalte', text: 'Ich schlage die Seitenstruktur vor. Du lieferst Leistungsliste, Stichpunkte zum Team und Fotos aus der Praxis, gern vom Handy.' },
        { title: 'Design und Umsetzung', text: 'Ich gestalte und programmiere die Website individuell, barrierearm, schnell und für das Smartphone optimiert.' },
        { title: 'Prüfen und Livegang', text: 'Gemeinsame Durchsicht inklusive Pflichtangaben, Korrekturrunden je nach Paket, dann geht die Seite online.' },
        { title: 'Nach dem Start', text: 'Auf Wunsch übernehme ich Wartung und Änderungen, etwa neue Stellenanzeigen, oder du pflegst sie selbst.' }
      ],
      duration: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen, je nachdem wie schnell Inhalte und Rückmeldungen kommen.'
    },
    { type: 'faq', id: 'faq', chip: 'FAQ', title: 'Häufige Fragen zur Website für Physiotherapie-Praxen' }
  ],
  cta: {
    title: 'Lass uns über deine Praxis sprechen',
    text: 'Erzähl mir kurz, welche Behandlungen du anbietest, ob du Hausbesuche machst und ob du gerade Personal suchst. Ich sage dir ehrlich, welche Seiten du brauchst und welches Paket passt.'
  },
  serviceLinks: [
    { label: 'Pakete und Preise vergleichen', href: '/pakete' },
    { label: 'Local SEO in Berlin', href: '/leistungen/local-seo' },
    { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
    { label: 'Website-Wartung', href: '/leistungen/website-wartung' }
  ],
  sources: [
    { label: 'IFK: Fachkräftemangel in der Physiotherapie spitzt sich weiter zu, 27.08.2025', href: 'https://www.ifk.de/artikel/fachkraeftemangel-der-physiotherapie-spitzt-sich-weiter-zu-politik-muss-endlich-handeln' },
    { label: 'Bundesverwaltungsgericht, Urteil vom 26.08.2009, 3 C 19.08', href: 'https://www.bverwg.de/260809U3C19.08.0' },
    { label: '§ 3 Heilmittelwerbegesetz: Irreführende Werbung', href: 'https://www.gesetze-im-internet.de/heilmwerbg/__3.html' },
    { label: 'Masseur- und Physiotherapeutengesetz', href: 'https://www.gesetze-im-internet.de/mphg/' },
    { label: '§ 5 Digitale-Dienste-Gesetz: Allgemeine Informationspflichten', href: 'https://www.gesetze-im-internet.de/ddg/__5.html' }
  ]
});
