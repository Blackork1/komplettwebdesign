function faq({
  id,
  question,
  answer,
  category,
  pages = ['/pakete'],
  schemaEligible = true,
  relatedPackage = null,
  priority = 'mittel'
}) {
  return {
    id,
    question,
    answer,
    category,
    pages,
    schemaEligible,
    relatedPackage,
    priority
  };
}

export const packageFaqs = Object.freeze([
  faq({
    id: 'preise-warum-ab-preise',
    question: 'Warum sind die Paketpreise als Ab-Preise formuliert?',
    answer: 'Die Preise gelten für klar definierte Umfänge. Zusätzliche Seiten, Funktionen, Inhalte oder externe Tools werden separat eingeordnet.',
    category: 'Preise',
    priority: 'hoch'
  }),
  faq({
    id: 'preise-kleinunternehmerstatus',
    question: 'Wird Umsatzsteuer ausgewiesen?',
    answer: 'Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    category: 'Kleinunternehmerstatus',
    priority: 'hoch'
  }),
  faq({
    id: 'hosting-separat',
    question: 'Sind Hosting, Domain und E-Mail im Paket enthalten?',
    answer: 'Hosting, Domain und E-Mail sind laufende Leistungen und werden separat vereinbart, wenn du sie über Komplett Webdesign betreuen lassen möchtest.',
    category: 'Hosting',
    priority: 'hoch'
  }),
  faq({
    id: 'wartung-separat',
    question: 'Ist Wartung automatisch enthalten?',
    answer: 'Wartung ist kein automatischer Paketbestandteil. Sie kann als laufende Betreuung mit klar definiertem Umfang ergänzt werden.',
    category: 'Wartung',
    priority: 'hoch'
  }),
  faq({
    id: 'drittanbieter-kosten',
    question: 'Sind externe Tools im Preis enthalten?',
    answer: 'Kosten für Buchungssysteme, Consent-Tools, Newsletter, Zahlungsanbieter oder andere Drittanbieter sind nicht automatisch enthalten.',
    category: 'Drittanbieter-Kosten',
    priority: 'hoch'
  }),
  faq({
    id: 'rechtstexte-keine-rechtsberatung',
    question: 'Sind Impressum und Datenschutzerklärung enthalten?',
    answer: 'Rechtlich relevante Seiten können technisch eingebunden werden. Die Erstellung oder Prüfung der Texte ist keine Rechtsberatung.',
    category: 'Rechtstexte',
    priority: 'kritisch'
  }),
  faq({
    id: 'seo-keine-ranking-garantie',
    question: 'Gibt es feste Google-Platzierungen?',
    answer: 'Nein. Technische SEO-Grundlagen können umgesetzt werden, bestimmte Platzierungen bei Google lassen sich aber nicht garantieren.',
    category: 'SEO',
    priority: 'kritisch'
  }),
  faq({
    id: 'texte-umfang',
    question: 'Sind Website-Texte vollständig enthalten?',
    answer: 'Die Pakete enthalten je nach Umfang Einbindung, Strukturierung oder Optimierung vorhandener Inhalte. Umfangreiche Texterstellung wird separat kalkuliert.',
    category: 'Texte',
    priority: 'hoch'
  }),
  faq({
    id: 'feedbackrunden',
    question: 'Wie viele Feedbackrunden sind enthalten?',
    answer: 'Die Feedbackrunden richten sich nach dem Paket. Weitere Änderungswünsche können separat abgestimmt und kalkuliert werden.',
    category: 'Feedbackrunden'
  }),
  faq({
    id: 'livegang-freigabe',
    question: 'Wann geht die Website live?',
    answer: 'Der Livegang erfolgt nach finaler Freigabe und gemäß vereinbartem Zahlungsmodell.',
    category: 'Livegang'
  }),
  faq({
    id: 'nutzungsrechte',
    question: 'Welche Nutzungsrechte bekomme ich?',
    answer: 'Nutzungsrechte, Bildlizenzen und externe Assets werden projektbezogen geklärt und im Angebot transparent eingeordnet.',
    category: 'Nutzungsrechte'
  }),
  faq({
    id: 'node-ejs-vorteil',
    question: 'Warum Node.js und EJS?',
    answer: 'Node.js und EJS ermöglichen schnelle, serverseitig gerenderte Websites mit vollständigem HTML für Nutzer und Suchmaschinen.',
    category: 'Node.js/EJS'
  }),
  faq({
    id: 'start-reicht-das-paket',
    question: 'Reicht das Start-Paket für meine erste Website?',
    answer: 'Das Start-Paket passt, wenn du eine kompakte Website mit klar begrenztem Umfang und ohne Sonderfunktionen brauchst.',
    category: 'Start-Paket',
    relatedPackage: 'start'
  }),
  faq({
    id: 'start-spaeter-erweitern',
    question: 'Kann ich das Start-Paket später erweitern?',
    answer: 'Ja. Zusätzliche Seiten oder Funktionen können später als Erweiterung geplant werden.',
    category: 'Start-Paket',
    relatedPackage: 'start'
  }),
  faq({
    id: 'start-texte-enthalten',
    question: 'Sind im Start-Paket Texte enthalten?',
    answer: 'Gelieferte Texte werden eingebunden und leicht strukturiert. Umfangreiche Texterstellung ist nicht automatisch enthalten.',
    category: 'Start-Paket',
    relatedPackage: 'start'
  }),
  faq({
    id: 'start-seo-enthalten',
    question: 'Was ist beim Start-Paket im SEO-Umfang enthalten?',
    answer: 'Enthalten sind technische Grundlagen wie sinnvolle Überschriften, Meta-Daten und eine saubere HTML-Struktur im vereinbarten Umfang.',
    category: 'Start-Paket',
    relatedPackage: 'start'
  }),
  faq({
    id: 'start-hosting-enthalten',
    question: 'Ist Hosting im Start-Paket enthalten?',
    answer: 'Hosting ist separat buchbar und wird nicht automatisch in den einmaligen Projektpreis eingerechnet.',
    category: 'Start-Paket',
    relatedPackage: 'start'
  }),
  faq({
    id: 'start-rechtstexte',
    question: 'Sind Rechtstexte im Start-Paket enthalten?',
    answer: 'Rechtlich relevante Seiten können technisch eingebunden werden. Die Erstellung oder Prüfung dieser Texte ist keine Rechtsberatung.',
    category: 'Start-Paket',
    relatedPackage: 'start',
    priority: 'kritisch'
  }),
  faq({
    id: 'start-aenderungswuensche',
    question: 'Was passiert bei zusätzlichen Änderungswünschen?',
    answer: 'Im Start-Paket ist eine Feedbackrunde vorgesehen. Weitere Wünsche können separat abgestimmt werden.',
    category: 'Start-Paket',
    relatedPackage: 'start'
  }),
  faq({
    id: 'business-fuer-wen',
    question: 'Für wen ist das Business-Paket gedacht?',
    answer: 'Es passt häufig für kleine Unternehmen mit mehreren Leistungen, die mehr Struktur als einen Onepager brauchen.',
    category: 'Business-Paket',
    relatedPackage: 'business'
  }),
  faq({
    id: 'business-seitenumfang',
    question: 'Wie viele Seiten umfasst das Business-Paket?',
    answer: 'Der Richtwert liegt bei ca. 4 bis 7 Inhaltsseiten im vereinbarten Umfang.',
    category: 'Business-Paket',
    relatedPackage: 'business'
  }),
  faq({
    id: 'business-zusatzseiten',
    question: 'Kann ich weitere Seiten ergänzen?',
    answer: 'Ja. Zusätzliche Standard- oder SEO-Seiten können als Zusatzleistung eingeplant werden.',
    category: 'Business-Paket',
    relatedPackage: 'business'
  }),
  faq({
    id: 'business-texte',
    question: 'Wie wird mit Texten im Business-Paket gearbeitet?',
    answer: 'Vorhandene Inhalte werden eingebunden und redaktionell strukturiert. Vollständige umfangreiche Texterstellung ist separat zu klären.',
    category: 'Business-Paket',
    relatedPackage: 'business'
  }),
  faq({
    id: 'business-local-seo',
    question: 'Ist Local SEO enthalten?',
    answer: 'Eine Local-SEO-Grundlage kann im passenden Umfang berücksichtigt werden. Weiterer Ausbau ist eine Zusatzleistung.',
    category: 'Business-Paket',
    relatedPackage: 'business'
  }),
  faq({
    id: 'business-ranking',
    question: 'Erreicht das Business-Paket feste Rankings?',
    answer: 'Nein. Die Website wird technisch und strukturell vorbereitet, aber bestimmte Rankings können nicht zugesagt werden.',
    category: 'Business-Paket',
    relatedPackage: 'business',
    priority: 'kritisch'
  }),
  faq({
    id: 'business-rechtstexte',
    question: 'Wie werden rechtlich relevante Seiten behandelt?',
    answer: 'Impressum, Datenschutz und Cookie-Hinweise können technisch eingebunden werden. Rechtliche Prüfung erfolgt nicht durch Komplett Webdesign.',
    category: 'Business-Paket',
    relatedPackage: 'business',
    priority: 'kritisch'
  }),
  faq({
    id: 'business-buchungssystem',
    question: 'Ist ein Buchungssystem im Business-Paket enthalten?',
    answer: 'Nein. Ein Buchungssystem kann als Zusatzleistung oder individuelles Projekt geprüft werden.',
    category: 'Business-Paket',
    relatedPackage: 'business'
  }),
  faq({
    id: 'wachstum-fuer-wen',
    question: 'Für wen ist das Wachstum-Paket sinnvoll?',
    answer: 'Es passt für Unternehmen mit mehr Inhalten, mehreren Leistungsseiten oder einem strukturierten Relaunch.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-relaunch',
    question: 'Eignet sich das Wachstum-Paket für Relaunches?',
    answer: 'Ja, wenn Struktur, Inhalte und alte URLs im vereinbarten Umfang geordnet vorbereitet werden können.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-seitenumfang',
    question: 'Wie groß ist der Seitenumfang?',
    answer: 'Der Richtwert liegt bei ca. 8 bis 12 Inhaltsseiten. Mehr Seiten werden separat eingeordnet.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-keine-20-seiten',
    question: 'Sind deutlich mehr Seiten pauschal enthalten?',
    answer: 'Nein. Das Wachstum-Paket ist bewusst auf einen realistischen Umfang begrenzt. Mehr Seiten werden vorab separat eingeordnet.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-buchungssystem',
    question: 'Wie werden Buchungssysteme behandelt?',
    answer: 'Nein. Buchungssysteme werden als Zusatzleistung oder individuelles Projekt geprüft.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-shop',
    question: 'Sind Shop-Funktionen enthalten?',
    answer: 'Nein. Shop-Funktionen sind nicht Teil des Standardpakets und müssen individuell geprüft werden.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-seo',
    question: 'Was umfasst SEO im Wachstum-Paket?',
    answer: 'Der Fokus liegt auf erweiterter technischer Struktur, Meta-Daten, interner Verlinkung und Local-SEO-Grundlagen im vereinbarten Umfang.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-ranking',
    question: 'Gibt es eine Ranking-Zusage?',
    answer: 'Nein. Auch bei stärkerer SEO-Struktur können konkrete Google-Platzierungen nicht garantiert werden.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum',
    priority: 'kritisch'
  }),
  faq({
    id: 'wachstum-alte-urls',
    question: 'Werden alte URLs bei einem Relaunch berücksichtigt?',
    answer: 'Redirect-Hinweise können im vereinbarten Umfang vorbereitet werden. Die finale Umsetzung hängt von der URL-Strategie ab.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'wachstum-zusatzkosten',
    question: 'Welche Zusatzkosten können entstehen?',
    answer: 'Zusatzkosten können durch weitere Seiten, Migration, externe Tools, Wartung, Hosting oder Sonderfunktionen entstehen.',
    category: 'Wachstum-Paket',
    relatedPackage: 'wachstum'
  }),
  faq({
    id: 'individuell-wann-sinnvoll',
    question: 'Wann ist ein individuelles Projekt sinnvoll?',
    answer: 'Wenn Anforderungen nicht sauber in ein Standardpaket passen, etwa bei Sonderfunktionen, CMS, Buchung oder Mehrsprachigkeit.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-buchungssystem',
    question: 'Kann ein Buchungssystem umgesetzt werden?',
    answer: 'Ja, nach Machbarkeitsprüfung und abhängig vom gewünschten Tool, Umfang und Datenfluss.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-cms',
    question: 'Ist ein CMS möglich?',
    answer: 'Eine einfache Content-Verwaltung kann individuell geplant werden, wenn Pflegebedarf und technische Grenzen klar sind.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-mehrsprachig',
    question: 'Sind mehrsprachige Websites möglich?',
    answer: 'Mehrsprachigkeit ist möglich, wird aber mit Struktur, Übersetzungen und Pflegeaufwand separat kalkuliert.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-shop',
    question: 'Sind Shop-Funktionen möglich?',
    answer: 'Kleine Produkt- oder Shop-Funktionen können geprüft werden. Große Shops oder Marktplätze sind eigene Projekte.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-kein-fester-preis',
    question: 'Warum gibt es keinen festen Endpreis?',
    answer: 'Sonderfunktionen hängen stark von Umfang, Tools und Schnittstellen ab. Deshalb erfolgt die Kalkulation nach Prüfung.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-aufwand',
    question: 'Wie wird der Aufwand eingeschätzt?',
    answer: 'Nach Erstklärung werden Anforderungen, Risiken und Abhängigkeiten eingeordnet und als Angebot oder nächste Projektphase geplant.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-drittanbieter',
    question: 'Wie werden Drittanbieter-Kosten behandelt?',
    answer: 'Externe Tool-, Lizenz- oder Zahlungsanbieter-Kosten sind separat und werden vorab transparent eingeordnet.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-wartung',
    question: 'Gibt es laufende Betreuung?',
    answer: 'Laufende Betreuung kann über einen Wartungsplan oder eine separate Vereinbarung geregelt werden.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  }),
  faq({
    id: 'individuell-scope-aenderung',
    question: 'Was passiert, wenn sich der Umfang ändert?',
    answer: 'Scope-Änderungen werden separat bewertet und erst nach Abstimmung umgesetzt.',
    category: 'Individuell',
    relatedPackage: 'individuell'
  })
]);

export function getFaqById(id) {
  return packageFaqs.find((item) => item.id === id) || null;
}

export function getFaqsByPackage(packageId) {
  return packageFaqs.filter((item) => item.relatedPackage === packageId);
}

export default packageFaqs;
