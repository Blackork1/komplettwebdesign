// Neufassung des Blogartikels /blog/immobilienmakler-homepage-check (GEO-Audit 05.11.2026).
// Der alte Text stimmte zu 63 % mit /ratgeber/homepage-checker-website-check überein. Die Neufassung
// prüft nur, was Makler-Websites ausmacht, und verweist für allgemeine Kriterien auf den Ratgeber.
// Fakten wie auf /branchen/webdesign-immobilienmakler; Gesetzeslinks geprüft am 05.11.2026.

const faq = [
  {
    question: 'Was prüft ein Homepage Check für Immobilienmakler?',
    answer: 'Ein Homepage Check für Immobilienmakler prüft, ob die Website Eigentümer überzeugt und Anfragen bringt: Ansprache auf der Startseite, Bewertungsanfrage, aktuelle Objekte mit Pflichtangaben, Impressum nach § 34c GewO, Ablauf und Provision, Referenzen, Sichtbarkeit in deinen Lagen und Ladezeit. Mit den acht Prüfpunkten in diesem Artikel dauert das rund 10 Minuten.'
  },
  {
    question: 'Reicht ein Profil auf Immobilienportalen ohne eigene Website?',
    answer: 'Für die Suche nach Käufern und Mietern helfen Portale. Eigentümer, die einen Makler beauftragen wollen, prüfen aber deine eigene Website: Erfahrung in ihrer Lage, Vorgehen, Referenzen und Bewertungen. Diese Fragen beantwortet kein Portal. Eine eigene Website ist deshalb vor allem wichtig, um neue Aufträge zu gewinnen.'
  },
  {
    question: 'Welche Pflichtangaben braucht eine Makler-Website?',
    answer: 'Ins Impressum gehören neben Name, Anschrift und Kontakt die Angaben zur Erlaubnis nach § 34c GewO und zur zuständigen Aufsichtsbehörde. Immobilienanzeigen auf der Website brauchen die Pflichtangaben aus dem Energieausweis, sobald einer vorliegt. Kommen Maklerverträge mit Verbrauchern online zustande, ist eine Widerrufsbelehrung nötig. Im Zweifel prüft das dein Verband oder eine Kanzlei.'
  },
  {
    question: 'Wie oft sollte ich meine Makler-Website prüfen?',
    answer: 'Objekte, Referenzen und Bewertungen pflegst du am besten laufend, Objekte idealerweise automatisch über deine Maklersoftware. Den ganzen Check mit allen acht Prüfpunkten lohnt es sich einmal im Jahr zu wiederholen und zusätzlich nach größeren Änderungen, etwa einem neuen Standort oder neuen Leistungen.'
  },
  {
    question: 'Was kostet es, eine Makler-Website zu verbessern?',
    answer: 'Kleine Korrekturen wie ein ergänztes Impressum oder eine Bewertungsanfrage sind oft schnell erledigt. Eine neue Makler-Website mit Seiten für Verkauf, Vermietung, Bewertung, Team und Referenzen liegt bei mir im Business-Paket {{price.business}}. Was für deine Website sinnvoll ist, klären wir in einem kostenlosen Kennenlerngespräch.'
  }
];

const checks = [
  {
    title: 'Prüfpunkt 1: Spricht deine Startseite Eigentümer an?',
    intro: 'Eigentümer suchen einen Makler, dem sie ihre Immobilie anvertrauen. Auf der Startseite muss deshalb sofort klar sein, was du für sie tust und in welcher Region.',
    questions: [
      'Steht in den ersten Zeilen, ob du verkaufst, vermietest oder bewertest, und in welchen Bezirken oder Orten?',
      'Gibt es einen eigenen Einstieg für Eigentümer, getrennt von den Angeboten für Suchende?',
      'Zeigt die Seite ein echtes Foto von dir oder deinem Team statt eines Stockbilds?'
    ]
  },
  {
    title: 'Prüfpunkt 2: Gibt es eine einfache Bewertungsanfrage?',
    intro: 'Viele Eigentümer wollen zuerst wissen, was ihre Immobilie wert ist. Eine kurze Anfrage zur Bewertung ist deshalb oft der erste Kontakt und für dich die wertvollste Anfrage.',
    questions: [
      'Ist die Bewertungsanfrage von jeder Seite aus mit einem Klick erreichbar?',
      'Reichen wenige Angaben: Objektart, Lage, Größe, Anliegen und Rückrufwunsch?',
      'Erklärst du, was nach der Anfrage passiert, zum Beispiel eine persönliche Einschätzung nach Besichtigung?'
    ],
    after: 'Ein Online-Rechner liefert nur grobe Spannen. Wenn du einen einsetzt, mach klar, dass die persönliche Bewertung genauer ist. Das ist ehrlicher und ein guter Anlass für das erste Gespräch.'
  },
  {
    title: 'Prüfpunkt 3: Sind deine Objekte aktuell und vollständig?',
    intro: 'Veraltete Angebote wirken nachlässig. Wer ein längst verkauftes Haus noch als verfügbar sieht, zweifelt auch an deiner übrigen Arbeit.',
    questions: [
      'Stimmen die Objekte auf der Website mit deinem aktuellen Bestand überein, idealerweise automatisch aus deiner Maklersoftware?',
      'Haben Objektseiten gute Bilder, Grundriss, Lage und einen klaren Kontaktweg?',
      'Enthalten deine Anzeigen die Pflichtangaben aus dem Energieausweis, sobald einer vorliegt?'
    ],
    after: 'Die Pflichtangaben regelt <a href="https://www.gesetze-im-internet.de/geg/__87.html">§ 87 Gebäudemodernisierungsgesetz</a> (vormals Gebäudeenergiegesetz): Art des Energieausweises, Endenergiebedarf oder -verbrauch, wesentlicher Energieträger der Heizung und bei Wohngebäuden Baujahr und Energieeffizienzklasse. Das gilt für Immobilienanzeigen in kommerziellen Medien, also auch auf deiner Website.'
  },
  {
    title: 'Prüfpunkt 4: Stimmen Impressum und Pflichtangaben?',
    intro: 'Für Makler reicht das übliche Impressum nicht. Weil die Maklertätigkeit eine Erlaubnis nach <a href="https://www.gesetze-im-internet.de/gewo/__34c.html">§ 34c Gewerbeordnung</a> braucht, gehören nach <a href="https://www.gesetze-im-internet.de/ddg/__5.html">§ 5 DDG</a> auch Angaben zur zuständigen Aufsichtsbehörde ins Impressum.',
    questions: [
      'Nennt dein Impressum die Erlaubnis nach § 34c GewO und die zuständige Aufsichtsbehörde?',
      'Deckt die Datenschutzerklärung deine Formulare, die Einbindung der Objekte und externe Dienste wie Karten ab?',
      'Gibt es eine Widerrufsbelehrung, wenn Maklerverträge mit Verbrauchern online oder per E-Mail zustande kommen (<a href="https://www.gesetze-im-internet.de/bgb/__312g.html">§ 312g BGB</a>)?'
    ],
    after: 'Das ist keine Rechtsberatung. Prüfe die Angaben im Zweifel mit deinem Berufsverband oder einer Kanzlei.'
  },
  {
    title: 'Prüfpunkt 5: Erklärst du Ablauf und Provision?',
    intro: 'Eigentümer fragen sich, was du konkret tust und was es kostet. Seit Ende 2020 gilt beim Verkauf von Wohnungen und Einfamilienhäusern an Verbraucher: Lässt sich der Makler von beiden Seiten bezahlen, dann in gleicher Höhe (<a href="https://www.gesetze-im-internet.de/bgb/__656c.html">§ 656c BGB</a>). Bei der Vermietung von Wohnungen zahlt nach dem Bestellerprinzip, wer den Makler beauftragt, in der Regel also der Vermieter (<a href="https://www.gesetze-im-internet.de/wovermrg/__2.html">§ 2 WoVermRG</a>).',
    questions: [
      'Beschreibst du den Ablauf vom Erstgespräch bis zum Notartermin oder zur Vertragsunterzeichnung?',
      'Steht auf der Website, wie die Provision geregelt ist, passend zu Halbteilung und Bestellerprinzip?',
      'Zeigst du, was zu deiner Vermarktung gehört, etwa Fotos, Exposé, Besichtigungen und Unterlagen?'
    ]
  },
  {
    title: 'Prüfpunkt 6: Zeigst du Referenzen und echte Bewertungen?',
    intro: 'Wer eine Immobilie verkauft, möchte wissen, ob du in seiner Lage schon erfolgreich warst.',
    questions: [
      'Zeigst du verkaufte oder vermietete Objekte aus deiner Region, mit Zustimmung der Eigentümer?',
      'Sind echte Bewertungen sichtbar oder verlinkt, zum Beispiel aus deinem Google-Unternehmensprofil?',
      'Stellen sich die Ansprechpartner mit Foto, Erfahrung und Schwerpunkt vor?'
    ]
  },
  {
    title: 'Prüfpunkt 7: Wirst du in deinen Lagen gefunden?',
    intro: 'Eigentümer suchen selten nach „Immobilienmakler“, sondern nach ihrer Aufgabe und ihrer Lage, etwa „Wohnung verkaufen Pankow“ oder „Immobilienbewertung Charlottenburg“. Google zeigt dazu oft zuerst die Karte mit Unternehmensprofilen und darunter die Websites.',
    questions: [
      'Gibt es eigene Seiten für Verkauf, Vermietung und Bewertung, mit den Lagen im Text, in denen du aktiv bist?',
      'Sind Name, Adresse und Telefon auf Website, Google-Profil und Portalen identisch?',
      'Hast du Inhalte zu den Bezirken, die du wirklich kennst, statt kopierter Ortsseiten?'
    ],
    after: 'Wie das in Berlin konkret aussieht, beschreibe ich auf der Seite <a href="/leistungen/local-seo">Local SEO in Berlin</a>.'
  },
  {
    title: 'Prüfpunkt 8: Lädt die Website schnell, auch mit vielen Bildern?',
    intro: 'Objektbilder sind das Herz einer Makler-Website und zugleich ein häufiger Grund für langsame Seiten.',
    questions: [
      'Lädt deine Startseite auf dem Smartphone in wenigen Sekunden?',
      'Werden Objektbilder verkleinert und in modernen Formaten wie WebP ausgeliefert?',
      'Funktionieren Bildergalerie, Grundriss und Kontaktformular auf dem Smartphone ohne Zoomen?'
    ],
    after: 'Die Ladezeit misst du kostenlos mit <a href="https://pagespeed.web.dev/">PageSpeed Insights</a> von Google oder mit meinem <a href="/website-tester/seo">SEO-Tester</a>.'
  }
];

const html = [
  '<p><strong>Kurz gesagt:</strong> Eine gute Makler-Website überzeugt vor allem Eigentümer, nicht nur Suchende. Mit den acht Prüfpunkten unten testest du in rund 10 Minuten, ob deine Website das schafft: von der Bewertungsanfrage über Objektseiten und Pflichtangaben bis zur Sichtbarkeit in deinen Lagen. Zu jedem Punkt gibt es drei Fragen, die du mit Ja oder Nein beantwortest.</p>',
  '<h2>Das Wichtigste in Kürze</h2>',
  '<ul>',
  '<li>Portale bringen dir Suchende. Eigentümer, die einen Makler beauftragen wollen, prüfen dagegen deine eigene Website.</li>',
  '<li>Der wichtigste Einstieg für Eigentümer ist eine kurze Anfrage zur Immobilienbewertung.</li>',
  '<li>Für Makler gelten zusätzliche Pflichtangaben: die Erlaubnis nach § 34c GewO im Impressum und die Angaben aus dem Energieausweis in Immobilienanzeigen.</li>',
  '<li>Lokale Sichtbarkeit entsteht durch Inhalte zu den Lagen, in denen du dich wirklich auskennst.</li>',
  '<li>Fehlen dir in einem Prüfpunkt zwei oder mehr Ja, fang dort an.</li>',
  '</ul>',
  '<h2>So funktioniert der Check</h2>',
  '<p>Öffne deine Website am besten auf dem Smartphone, so wie viele Eigentümer sie zuerst sehen. Beantworte zu jedem Prüfpunkt die drei Fragen. Jedes Ja ist ein Punkt, maximal sind es 24. Die Technik prüfst du zusätzlich automatisch mit meinem kostenlosen <a href="/website-tester">Website-Tester</a>. Kriterien, die für Websites jeder Branche gelten, findest du im <a href="/ratgeber/homepage-checker-website-check">Homepage-Checker im Ratgeber</a>. Hier geht es um das, was speziell eine Makler-Website ausmacht.</p>',
  ...checks.flatMap((check) => [
    `<h2>${check.title}</h2>`,
    `<p>${check.intro}</p>`,
    '<ul>',
    ...check.questions.map((question) => `<li>${question}</li>`),
    '</ul>',
    ...(check.after ? [`<p>${check.after}</p>`] : [])
  ]),
  '<h2>Auswertung: Was dein Ergebnis bedeutet</h2>',
  '<ul>',
  '<li><strong>20 bis 24 Punkte:</strong> Deine Website ist gut aufgestellt. Pflege Objekte, Referenzen und Bewertungen regelmäßig.</li>',
  '<li><strong>13 bis 19 Punkte:</strong> Die Grundlage stimmt, aber Eigentümer finden nicht alles, was sie suchen. Fang mit den Prüfpunkten an, in denen dir zwei oder mehr Ja fehlen.</li>',
  '<li><strong>12 Punkte oder weniger:</strong> Einzelne Korrekturen reichen meist nicht mehr. Dann lohnt sich ein <a href="/leistungen/website-relaunch">Website-Relaunch</a> mit einer klaren Struktur für Eigentümer, Objekte und Bewertung.</li>',
  '</ul>',
  '<h2>Womit du anfangen solltest</h2>',
  '<p>Meine Empfehlung: Beginne mit drei Punkten, die wenig Aufwand kosten und direkt auf Vertrauen und Anfragen wirken. Eine Bewertungsanfrage, die von jeder Seite erreichbar ist. Eine eigene Seite für Eigentümer mit Ablauf und Provision. Und ein vollständiges Impressum mit den Angaben zu deiner Erlaubnis. Danach folgen Seiten zu deinen Lagen und die automatische Einbindung der Objekte aus deiner Maklersoftware.</p>',
  '<p>Wie eine Makler-Website von Grund auf aufgebaut sein sollte, zeige ich auf der Seite <a href="/branchen/webdesign-immobilienmakler">Website für Immobilienmakler</a>. Wenn du eine zweite Meinung zu deinem Ergebnis möchtest, schreib mir über das <a href="/kontakt">Kontaktformular</a>.</p>',
  '<h2>Häufige Fragen zum Homepage Check für Immobilienmakler</h2>',
  ...faq.flatMap((item) => [`<h3>${item.question}</h3>`, `<p>${item.answer}</p>`])
].join('\n');

const metaDescription = 'Teste deine Makler-Website in 10 Minuten: 8 Prüfpunkte von Bewertungsanfrage über Objektseiten bis Impressum nach § 34c GewO, mit Punkteskala.';

export const IMMOBILIENMAKLER_HOMEPAGE_CHECK = Object.freeze({
  slug: 'immobilienmakler-homepage-check',
  fields: Object.freeze({
    title: 'Immobilienmakler Homepage Check: So testest du deine Makler-Website',
    meta_title: 'Immobilienmakler Homepage Check: Makler-Website testen',
    meta_description: metaDescription,
    description: metaDescription,
    og_title: 'Immobilienmakler Homepage Check: So testest du deine Makler-Website',
    og_description: metaDescription,
    excerpt: 'Mit diesem Homepage Check prüfst du in rund 10 Minuten, ob deine Makler-Website Eigentümer überzeugt: von der Bewertungsanfrage über Objekte und Pflichtangaben bis zur Sichtbarkeit in deinen Lagen.',
    content: html,
    faq_json: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  })
});
