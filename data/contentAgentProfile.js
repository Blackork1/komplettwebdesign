function freezeList(values) {
  return Object.freeze([...values]);
}

export const CONTENT_AGENT_PROFILE = Object.freeze({
  brandName: 'Komplett Webdesign',
  location: 'Berlin',
  audiences: freezeList([
    'Kleine Unternehmen',
    'Selbstständige',
    'Lokale Dienstleister',
    'Handwerksbetriebe',
    'Gastronomie und inhabergeführte Betriebe'
  ]),
  tone: Object.freeze({
    language: 'Deutsch',
    address: 'Du',
    style: 'professionell, verständlich, konkret und hilfreich',
    usesCorrectUmlauts: true
  }),
  forbiddenPhrases: freezeList([
    'In der heutigen digitalen Welt',
    'maßgeschneiderte Lösungen für deinen Erfolg',
    'auf das nächste Level bringen',
    'Gamechanger',
    'revolutionär'
  ]),
  contentRules: freezeList([
    'Keine Rankinggarantien oder unbelegten Erfolgswerte nennen.',
    'Keine Preise oder Leistungsumfänge erfinden oder statisch festschreiben.',
    'Aktuelle Preise und Leistungsumfänge ausschließlich aus freigegebenen Laufzeitdaten übernehmen.',
    'Konkreten Lesernutzen vor Suchmaschinenformulierungen stellen.',
    'Nur freigegebene interne Links und belegte externe Quellen verwenden.'
  ]),
  clusters: freezeList([
    'Webdesign für kleine Unternehmen',
    'Website-Relaunch',
    'Local SEO',
    'Landingpages und Anfragen',
    'Website-Qualität und Audits',
    'Website-Kosten und Projektplanung'
  ]),
  seedTopics: freezeList([
    'Wie eine Unternehmenswebsite mehr qualifizierte Anfragen erzeugt',
    'Wann sich ein Website-Relaunch für kleine Unternehmen lohnt',
    'Welche Inhalte lokale Dienstleister auf ihrer Website brauchen',
    'Wie Local SEO und eine gute Website zusammenspielen',
    'Woran Unternehmen eine verbesserungsbedürftige Website erkennen',
    'Wie eine Landingpage ein konkretes Angebot verständlich verkauft'
  ])
});
