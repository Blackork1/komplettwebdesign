// Zusätzliche Inhalte für die Paketseiten, ausgerichtet auf die Suchanfragen, für die Google sie zeigt
// (Search Console Juni bis Oktober 2026, Analyse in docs/seo/content-briefs/2026-10-30-pakete.md):
// /pakete/business erscheint für „business website“ und „business webdesign“, /pakete/start für
// „webseite starter-paket“, /pakete/wachstum für „premium webdesign“ und „website erweitern“.
// Preise, Seitenumfang und die übrigen Pakettexte bleiben in der Datenbank (Preisverwaltung im Admin).
// {{price}} wird durch das Preis-Label des Pakets ersetzt, etwa „ab 1.499 €“.

const PACKAGE_SEARCH_INTENT = Object.freeze({
  business: {
    id: 'business-website',
    title: 'Was eine Business-Website für kleine Unternehmen braucht',
    paragraphs: [
      'Eine Business-Website, oft auch Unternehmens- oder Firmenwebsite genannt, ist mehr als eine digitale Visitenkarte. Sie zeigt auf eigenen Seiten, was du anbietest, für wen und warum man dir vertrauen kann, und führt Besucher zur Anfrage. Für die meisten kleinen Unternehmen reichen dafür vier bis sieben Seiten, genau der Umfang des Business-Pakets ({{price}}).',
      'Ich plane und baue deine Business-Website persönlich und ohne Baukasten-Vorlage: individuell gestaltet, schnell auf dem Handy und mit einer technischen Grundlage, die Google versteht.'
    ],
    items: [
      { title: 'Startseite', text: 'In wenigen Sekunden klar: was du anbietest, wo du arbeitest und wie man dich erreicht.' },
      { title: 'Eine Seite je Leistung', text: 'Kunden finden direkt, was sie suchen, und Google kann jede Leistung einzeln zuordnen.' },
      { title: 'Über uns und Team', text: 'Gesichter, Erfahrung und Arbeitsweise. Gerade bei kleinen Unternehmen entscheidet das Vertrauen.' },
      { title: 'Referenzen und Bewertungen', text: 'Projektbeispiele und echte Stimmen zeigen, dass du hältst, was du versprichst.' },
      { title: 'Kontakt und Anfrage', text: 'Formular, Telefon oder WhatsApp, von jeder Seite aus schnell erreichbar.' },
      { title: 'Impressum und Datenschutz', text: 'Die Pflichtseiten baue ich sauber ein. Die Rechtstexte lieferst du oder ein Generator, eine Rechtsberatung ist nicht enthalten.' }
    ],
    compare: {
      title: 'Business-Website: Baukasten, Business-Paket oder Agentur?',
      intro: 'Alle drei Wege führen zu einer Unternehmenswebsite. Sie unterscheiden sich darin, wer die Arbeit macht, wie individuell das Ergebnis wird und was es kostet.',
      columns: [
        { title: 'Baukasten', points: ['Monatliche Gebühr, dafür baust du selbst', 'Aufbau, Texte und Gestaltung liegen bei dir', 'Vorlagen ähneln vielen anderen Websites'] },
        { title: 'Business-Paket', highlight: true, points: ['Rund vier bis sieben Seiten, {{price}}', 'Individuell geplant und persönlich umgesetzt', 'Eine feste Ansprechperson von der Planung bis zum Livegang'] },
        { title: 'Agentur', points: ['Sinnvoll für große Projekte mit vielen Beteiligten', 'Mehr Abstimmung und Projektmanagement', 'Budgets meist deutlich höher'] }
      ]
    },
    links: [
      { label: 'Website-Pakete vergleichen', href: '/pakete' },
      { label: 'Mehr Seiten? Das Wachstum-Paket', href: '/pakete/wachstum' }
    ],
    faqs: [
      {
        question: 'Was ist eine Business-Website?',
        answer: 'Eine Business-Website ist die Website eines Unternehmens, die über mehrere Seiten Leistungen, Team, Referenzen und Kontaktwege zeigt. Im Unterschied zu einem Onepager bekommt jede wichtige Leistung eine eigene Seite. Das hilft Kunden bei der Entscheidung und Google bei der Zuordnung.'
      },
      {
        question: 'Was kostet eine Business-Website?',
        answer: 'Im Business-Paket kostet eine Business-Website mit rund vier bis sieben Seiten {{price}}. Der genaue Preis hängt von Seitenzahl, Inhalten und Funktionen ab und wird vor dem Start schriftlich festgehalten. Hosting, Domain und Wartung kommen nur dazu, wenn du sie brauchst.'
      },
      {
        question: 'Business-Website selbst bauen oder erstellen lassen?',
        answer: 'Mit einem Baukasten sparst du Geld, steckst aber eigene Zeit in Aufbau, Texte und Technik. Erstellen lassen lohnt sich, wenn die Website Anfragen bringen soll und du dich lieber um dein Geschäft kümmerst. Im Business-Paket übernehme ich Planung, Gestaltung und Umsetzung.'
      },
      {
        question: 'Gibt es die kostenlose Website aus dem Google-Unternehmensprofil noch?',
        answer: 'Nein. Google hat die Websites, die direkt im Unternehmensprofil erstellt wurden (Adressen auf business.site), 2024 abgeschaltet. Das Unternehmensprofil selbst gibt es weiter, es braucht aber eine eigene Website, auf die es verlinkt.'
      }
    ]
  },
  start: {
    id: 'starter-paket',
    title: 'Das Starter-Paket für deinen ersten Webauftritt',
    paragraphs: [
      'Das Start-Paket ist das Starter-Paket für alle, die zum ersten Mal eine eigene Website brauchen oder ihre alte Visitenkarte im Netz ersetzen wollen: Selbstständige, Gründer, Einzelunternehmer und kleine lokale Anbieter. Du bekommst einen Onepager oder eine kleine Website mit bis zu drei Seiten, individuell gestaltet, {{price}}.',
      'Wie bei allen Paketen plane und baue ich die Seite persönlich. Sie ist schnell, auf dem Handy gut bedienbar und so aufgebaut, dass sie später mit deinem Angebot wachsen kann.'
    ],
    items: [
      { title: 'Onepager', text: 'Alle Inhalte auf einer Seite mit Sprungmarken: Angebot, Über mich, Leistungen, Stimmen und Kontakt. Ideal, wenn dein Angebot schnell erklärt ist.' },
      { title: 'Kleine Website mit bis zu drei Seiten', text: 'Zum Beispiel Startseite, Leistungen und Kontakt. Sinnvoll, wenn du zwei oder drei Themen getrennt zeigen willst.' },
      { title: 'Klarer Weg zur Anfrage', text: 'Kontaktformular, Telefon oder WhatsApp, auf dem Handy immer erreichbar.' },
      { title: 'Technische Grundlage für Google', text: 'Saubere Überschriften, Seitentitel und Beschreibungen sowie eine schnelle Ladezeit. Feste Platzierungen kann niemand seriös versprechen.' }
    ],
    compare: {
      title: 'Starter-Paket, Landingpage oder Business-Paket?',
      intro: 'Drei Einstiege, die ähnlich klingen, aber unterschiedliche Aufgaben haben.',
      columns: [
        { title: 'Starter-Paket', highlight: true, points: ['Dein Auftritt im Netz: wer du bist und was du anbietest', 'Onepager oder bis zu drei Seiten', 'Paketpreis {{price}}'] },
        { title: 'Landingpage', points: ['Eine Seite für ein Angebot oder eine Kampagne', 'Ein klares Ziel, zum Beispiel Anfragen für eine Leistung', 'Oft zusätzlich zur eigentlichen Website'] },
        { title: 'Business-Paket', points: ['Mehrseitige Unternehmenswebsite', 'Eine Seite je Leistung, rund vier bis sieben Seiten', 'Wenn du mehrere Leistungen zeigen willst'] }
      ]
    },
    links: [
      { label: 'Landingpage erstellen lassen', href: '/leistungen/landingpage-erstellen-lassen' },
      { label: 'Mehr Seiten? Das Business-Paket', href: '/pakete/business' }
    ],
    faqs: [
      {
        question: 'Was ist ein Onepager?',
        answer: 'Ein Onepager ist eine Website, deren Inhalte auf einer einzigen, langen Seite stehen. Das Menü springt zu den einzelnen Abschnitten. Er eignet sich für überschaubare Angebote und ist schnell online.'
      },
      {
        question: 'Onepager oder mehrere Seiten?',
        answer: 'Ein Onepager reicht, wenn dein Angebot in wenigen Abschnitten erklärt ist. Willst du bei Google für mehrere Leistungen gefunden werden, sind eigene Seiten je Leistung besser. Im Start-Paket sind bis zu drei Seiten möglich, mehr bietet das Business-Paket.'
      },
      {
        question: 'Was ist der Unterschied zwischen Starter-Paket und Landingpage?',
        answer: 'Das Starter-Paket ist deine Website: Es stellt dich und dein Angebot vor. Eine Landingpage verfolgt ein einziges Ziel, etwa Anfragen für eine bestimmte Leistung oder eine Kampagne, und wird oft zusätzlich zur Website eingesetzt.'
      }
    ]
  },
  wachstum: {
    id: 'premium-website',
    title: 'Premium-Website, Relaunch oder Ausbau: wann das Wachstum-Paket passt',
    paragraphs: [
      'Premium-Webdesign heißt bei mir nicht mehr Effekte, sondern mehr Substanz: acht bis zwölf Seiten mit klarer Struktur, eigenen Seiten für Leistungen und Zielgruppen und einer SEO-Grundlage, die auf Wachstum ausgelegt ist. Das Wachstum-Paket ist für Unternehmen gedacht, deren Website mehr leisten soll als eine Visitenkarte, {{price}}.',
      'Oft geht es um einen Relaunch: Die bestehende Website ist veraltet, langsam oder unübersichtlich, hat aber schon Besucher und Rankings. Dann plane ich die neue Struktur so, dass wichtige Inhalte erhalten bleiben und alte Adressen sauber weitergeleitet werden.'
    ],
    items: [
      { title: 'Mehrere Leistungsbereiche', text: 'Jede Leistung bekommt eine eigene, ausführliche Seite, statt alles auf einer Seite zu sammeln.' },
      { title: 'Mehrere Zielgruppen', text: 'Privat- und Geschäftskunden, verschiedene Branchen oder Bezirke werden gezielt angesprochen.' },
      { title: 'Relaunch mit Weiterleitungen', text: 'Bestehende Inhalte und Adressen werden geprüft, damit Besucher und Google-Rankings nicht verloren gehen.' },
      { title: 'Website erweitern', text: 'Ist deine bisherige Website zu klein geworden, plane ich sie größer neu, mit Platz für neue Leistungsseiten, Referenzen oder einen Ratgeber.' },
      { title: 'Stärkere SEO-Struktur', text: 'Seitentitel, interne Verlinkung, strukturierte Daten und eine Local-SEO-Grundlage für alle wichtigen Seiten. Feste Platzierungen kann niemand seriös versprechen.' },
      { title: 'Design mit System', text: 'Einheitliche Bausteine für alle Seiten, damit die Website auch nach dem Ausbau wie aus einem Guss wirkt.' }
    ],
    compare: {
      title: 'Business, Wachstum oder Individuell?',
      intro: 'Die drei größeren Pakete unterscheiden sich vor allem im Umfang und in den Funktionen.',
      columns: [
        { title: 'Business-Paket', points: ['Rund vier bis sieben Seiten', 'Eine Seite je Hauptleistung', 'Für die meisten kleinen Unternehmen'] },
        { title: 'Wachstum-Paket', highlight: true, points: ['Rund acht bis zwölf Seiten, {{price}}', 'Mehrere Leistungsbereiche und Zielgruppen', 'Relaunch mit Weiterleitungen'] },
        { title: 'Individuelles Projekt', points: ['Sonderfunktionen wie Buchung, Shop, CMS oder Mehrsprachigkeit', 'Umfang und Preis nach einem Vorgespräch', 'Für Anforderungen außerhalb der Pakete'] }
      ]
    },
    links: [
      { label: 'Website-Relaunch planen', href: '/leistungen/website-relaunch' },
      { label: 'Website-Pakete vergleichen', href: '/pakete' }
    ],
    faqs: [
      {
        question: 'Was macht eine Premium-Website aus?',
        answer: 'Weniger die Optik als die Struktur dahinter: eigene Seiten für jede Leistung und Zielgruppe, schnelle Ladezeit, saubere technische SEO, klare Wege zur Anfrage und ein Design, das auch mit zwölf Seiten einheitlich bleibt. Genau darauf ist das Wachstum-Paket ausgelegt.'
      },
      {
        question: 'Kann ich meine bestehende Website erweitern lassen?',
        answer: 'Ist deine Website bei mir entstanden, lässt sie sich direkt um neue Seiten erweitern. Bei Websites aus anderen Systemen prüfe ich zuerst, ob ein Ausbau sinnvoll ist oder ob ein Relaunch günstiger und sauberer wird.'
      },
      {
        question: 'Was kostet ein Website-Relaunch?',
        answer: 'Ein Relaunch mit acht bis zwölf Seiten liegt im Wachstum-Paket {{price}}. Wie viel Aufwand die Übernahme alter Inhalte und die Weiterleitungen machen, kläre ich vorab und halte es im Angebot fest.'
      }
    ]
  }
});

function fillPrice(value, priceLabel) {
  const label = String(priceLabel || '').trim();
  return String(value)
    .replace(/\s*\(\{\{price\}\}\)/g, label ? ` (${label})` : '')
    .replace(/,\s*\{\{price\}\}/g, label ? `, ${label}` : '')
    .replace(/\s*\{\{price\}\}/g, label ? ` ${label}` : '')
    .replace(/\s+([.,])/g, '$1')
    .trim();
}

function fillDeep(value, priceLabel) {
  if (typeof value === 'string') return fillPrice(value, priceLabel);
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, priceLabel));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillDeep(item, priceLabel)]));
  }
  return value;
}

// Liefert die Zusatzinhalte für ein Paket mit eingesetztem Preis oder null (englische Seiten bleiben ohne).
export function getPackageSearchIntent(slug, { priceLabel = '', isEn = false } = {}) {
  if (isEn) return null;
  const key = String(slug || '').trim().toLowerCase();
  if (!Object.hasOwn(PACKAGE_SEARCH_INTENT, key)) return null;
  return fillDeep(PACKAGE_SEARCH_INTENT[key], priceLabel);
}

// Häufige Fragen aus der Datenbank um die Suchfragen ergänzen, ohne doppelte Fragen.
export function mergePackageFaqs(intentFaqs = [], storedFaqs = []) {
  const normalize = (value) => String(value || '').trim().toLowerCase();
  const stored = Array.isArray(storedFaqs) ? storedFaqs : [];
  const known = new Set(stored.map((faq) => normalize(faq?.question || faq?.q)));
  const additions = (Array.isArray(intentFaqs) ? intentFaqs : []).filter((faq) => !known.has(normalize(faq.question)));
  return [...additions, ...stored];
}

export const PACKAGE_SEARCH_INTENT_SLUGS = Object.freeze(Object.keys(PACKAGE_SEARCH_INTENT));
