// controllers/leistungenController.js
import pool from '../util/db.js';

function safeJson(val, fallback) {
  if (val == null) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn('⚠ Konnte JSON nicht parsen:', e.message);
      return fallback;
    }
  }
  return fallback;
}

function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const DEFAULT_CTA_VARIANTS = [
  { label: 'Kostenloses Erstgespräch', href: '/kontakt' },
  { label: 'Website-Tester starten', href: '/website-tester' },
  { label: 'Business-Paket ansehen', href: '/pakete/business' }
];

const SERVICE_PAGE_OVERRIDES = {
  'design-ux-ui': {
    keywordPrimary: 'website relaunch berlin',
    keywordSecondary: ['webdesign ux berlin', 'website benutzerführung berlin'],
    metaTitle: 'Website Relaunch Berlin | UX/UI Webdesign für mehr Anfragen',
    metaDescription: 'Website Relaunch in Berlin mit klarer UX/UI-Strategie: bessere Nutzerführung, schnellere Entscheidungen und mehr qualifizierte Anfragen statt Absprüngen.',
    h1: 'Website Relaunch in Berlin: UX/UI Webdesign für mehr qualifizierte Anfragen',
    answerBlock:
      'Ein Website Relaunch in Berlin lohnt sich, wenn Nutzer trotz Traffic nicht anfragen. Mit klarer UX-Struktur, mobilen Conversion-Wegen und einem eindeutigen Seitenaufbau machst du aus Besuchen konkrete Kontakte. Wir verbinden Design, Nutzerführung und SEO-Basis, damit deine Website sichtbar bleibt und besser abschließt.',
    ctaVariants: [
      { label: 'Relaunch besprechen', href: '/kontakt' },
      { label: 'UX mit Website-Tester prüfen', href: '/website-tester' },
      { label: 'Business-Paket ansehen', href: '/pakete/business' }
    ],
    proofBlock: {
      title: 'Proof: Relaunch mit klaren Kennzahlen',
      text: 'Wir planen Relaunches mit verbindlichen Leitplanken statt Bauchgefühl: Festpreis-Pakete ab 499 EUR, Antwortziel innerhalb von 24 Stunden und ein realistischer Projektkorridor von 2 bis 8 Wochen je Umfang.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Als Webdesigner aus Berlin kennen wir den lokalen Wettbewerb und bauen Relaunches so auf, dass Leistungen, Referenzen und Kontaktwege in Bezirken wie Mitte, Friedrichshain und Charlottenburg schnell verstanden werden.'
    },
    faqItems: [
      {
        q: 'Wann ist ein Website Relaunch in Berlin sinnvoll?',
        a: 'Wenn deine Website zwar besucht wird, aber kaum Anfragen erzeugt, mobil schwach wirkt oder Leistungen unklar kommuniziert.'
      },
      {
        q: 'Wie lange dauert ein UX/UI-Relaunch?',
        a: 'Typisch sind 4 bis 6 Wochen. Kleinere Relaunches gehen schneller, größere Projekte mit mehr Inhalten dauern entsprechend länger.'
      },
      {
        q: 'Ist SEO beim Relaunch direkt berücksichtigt?',
        a: 'Ja. Struktur, interne Links, Titles, Meta Descriptions und lokale Suchintention werden von Beginn an mitgeplant.'
      },
      {
        q: 'Bleiben bestehende Inhalte erhalten?',
        a: 'Relevante Inhalte können übernommen, überarbeitet und in eine klarere Seitenlogik integriert werden.'
      },
      {
        q: 'Was ist das Ergebnis eines UX/UI-Relaunches?',
        a: 'Eine Website, die schneller verstanden wird, besser auf Mobilgeräten funktioniert und messbar mehr qualifizierte Anfragen bringt.'
      }
    ],
    internalLinks: [
      { label: 'Responsives Design & Mobile', href: '/webdesign-berlin/responsives-design-mobile' },
      { label: 'Inhalte & Texte (Content)', href: '/webdesign-berlin/inhalte-texte-content' },
      { label: 'Business-Paket', href: '/pakete/business' },
      { label: 'Ratgeber: Website erstellen Berlin – Ablauf', href: '/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten' },
      { label: 'Webdesign Berlin Mitte', href: '/webdesign-berlin/mitte' }
    ]
  },
  'seo-sichtbarkeit-einsteiger': {
    keywordPrimary: 'local seo berlin unternehmen',
    keywordSecondary: ['seo sichtbarkeit berlin', 'webseite gefunden werden berlin'],
    metaTitle: 'Local SEO Berlin für Unternehmen | Sichtbarkeit & Anfragen steigern',
    metaDescription: 'Local SEO in Berlin für kleine Unternehmen: klare Seitenstruktur, Suchintent-Mapping und Inhalte, die bei Google besser gefunden werden und Anfragen erzeugen.',
    h1: 'Local SEO Berlin für Unternehmen: Sichtbarkeit aufbauen und Anfragen steigern',
    answerBlock:
      'Local SEO in Berlin bedeutet, dass deine Website genau dort sichtbar wird, wo potenzielle Kunden nach deinen Leistungen suchen. Mit sauberer Seitenstruktur, relevanten Keywords, lokaler Verlinkung und klaren Kontaktwegen erhöhst du nicht nur Reichweite, sondern vor allem die Chance auf qualifizierte Anfragen.',
    ctaVariants: [
      { label: 'SEO-Beratung anfragen', href: '/kontakt' },
      { label: 'SEO-Tester starten', href: '/website-tester/seo' },
      { label: 'Business-Paket ansehen', href: '/pakete/business' }
    ],
    proofBlock: {
      title: 'Proof: SEO mit realistischen Grundlagen',
      text: 'Wir arbeiten ohne Ranking-Versprechen und setzen stattdessen auf belastbare Basics: saubere OnPage-Struktur, lokale Keyword-Zuordnung, klare Conversion-Wege und transparente Pakete ab 499 EUR als Einstieg.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Unsere SEO-Umsetzung orientiert sich an echter Berliner Suchintention und wird mit deinen Bezirksseiten, dem Google-Unternehmensprofil und deinen Kernleistungen verknüpft.'
    },
    faqItems: [
      {
        q: 'Was bringt Local SEO für kleine Unternehmen in Berlin?',
        a: 'Du wirst für relevante Suchanfragen sichtbarer und bekommst häufiger passende Anfragen statt nur mehr allgemeine Klicks.'
      },
      {
        q: 'Wie schnell sind Ergebnisse bei Local SEO sichtbar?',
        a: 'Erste Verbesserungen siehst du oft nach wenigen Wochen, stabile Entwicklungen entstehen über mehrere Monate.'
      },
      {
        q: 'Brauche ich dafür neue Inhalte?',
        a: 'In vielen Fällen ja. Klar strukturierte Leistungsseiten und lokale Kontextsignale sind zentrale Hebel.'
      },
      {
        q: 'Ist ein Google-Unternehmensprofil notwendig?',
        a: 'Für lokale Sichtbarkeit ist es sehr wichtig, weil Website und Profil gemeinsam bewertet werden.'
      },
      {
        q: 'Kann ich SEO mit einem kleinen Budget starten?',
        a: 'Ja. Mit einer sauberen Basis aus Struktur, Meta-Daten, internen Links und klaren CTAs lassen sich sinnvolle Fortschritte erzielen.'
      }
    ],
    internalLinks: [
      { label: 'Inhalte & Texte (Content)', href: '/webdesign-berlin/inhalte-texte-content' },
      { label: 'Kosten, Preise & Pakete', href: '/webdesign-berlin/kosten-preise-pakete' },
      { label: 'Business-Paket', href: '/pakete/business' },
      { label: 'Ratgeber: Website-Kosten Berlin', href: '/ratgeber/website-kosten-berlin' },
      { label: 'Webdesign Berlin Friedrichshain', href: '/webdesign-berlin/friedrichshain' }
    ]
  },
  'responsives-design-mobile': {
    keywordPrimary: 'responsives webdesign berlin',
    keywordSecondary: ['mobile website berlin', 'mobile optimierung webdesign'],
    metaTitle: 'Responsives Webdesign Berlin | Mobile Websites, die konvertieren',
    metaDescription: 'Responsives Webdesign in Berlin: mobile Nutzerführung, schnelle Ladezeiten und klare CTAs für bessere Rankings und mehr Anfragen auf Smartphone und Desktop.',
    h1: 'Responsives Webdesign in Berlin: Mobile Websites mit klarer Conversion-Führung',
    answerBlock:
      'Responsives Webdesign in Berlin sorgt dafür, dass deine Website auf Smartphone, Tablet und Desktop sofort verständlich bleibt. Gerade mobil entscheiden Nutzer in Sekunden. Mit schnellen Ladezeiten, gut lesbaren Inhalten und eindeutigen CTAs reduzierst du Absprünge und steigerst die Chance auf direkte Anfragen deutlich.',
    ctaVariants: [
      { label: 'Mobile-Check im Erstgespräch', href: '/kontakt' },
      { label: 'Website-Tester starten', href: '/website-tester' },
      { label: 'Basis-Paket ansehen', href: '/pakete/basis' }
    ],
    proofBlock: {
      title: 'Proof: Mobile Fokus mit messbaren Leitplanken',
      text: 'Wir optimieren mobile Seitenführung mit klarer Struktur, kurzen Kontaktwegen und sauberer Technik. Das zahlt direkt auf Core Web Vitals, Usability und Conversion ein.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'In Berliner Suchsituationen wird meist mobil verglichen. Deshalb priorisieren wir Mobile-UX so, dass Leistungen, Preise und Kontaktoptionen in jedem Bezirk direkt erfassbar sind.'
    },
    faqItems: [
      {
        q: 'Warum ist responsives Webdesign in Berlin so wichtig?',
        a: 'Weil ein großer Teil lokaler Suchanfragen mobil stattfindet und Nutzer schnell entscheiden, ob sie Kontakt aufnehmen.'
      },
      {
        q: 'Reicht ein Desktop-Design mit kleiner Darstellung fürs Handy?',
        a: 'Nein. Mobile Nutzer brauchen angepasste Struktur, Lesbarkeit und Interaktion statt nur verkleinerter Inhalte.'
      },
      {
        q: 'Verbessert responsive Umsetzung auch SEO?',
        a: 'Ja. Mobile Usability und technische Qualität wirken sich auf Sichtbarkeit und Nutzerverhalten aus.'
      },
      {
        q: 'Welche Elemente sind mobil entscheidend?',
        a: 'Klare Überschriften, kurze Abschnitte, sofort sichtbare CTAs und schnell erreichbare Kontaktwege.'
      },
      {
        q: 'Kann meine bestehende Seite mobil nachgerüstet werden?',
        a: 'Je nach Zustand ja. Oft ist ein strukturierter Relaunch jedoch langfristig effizienter.'
      }
    ],
    internalLinks: [
      { label: 'Design & Benutzerführung (UX/UI)', href: '/webdesign-berlin/design-ux-ui' },
      { label: 'Domain, Hosting & Technik', href: '/webdesign-berlin/domain-hosting-technik' },
      { label: 'Basis-Paket', href: '/pakete/basis' },
      { label: 'Ratgeber: Website erstellen Berlin – Ablauf', href: '/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten' },
      { label: 'Webdesign Berlin Kreuzberg', href: '/webdesign-berlin/kreuzberg' }
    ]
  },
  'domain-hosting-technik': {
    keywordPrimary: 'webhosting fuer website berlin',
    keywordSecondary: ['website hosting berlin', 'domain und technik website'],
    metaTitle: 'Webhosting für Website Berlin | Domain, Technik und Stabilität',
    metaDescription: 'Webhosting für Websites in Berlin: passende Domain, stabile Infrastruktur, Sicherheit und Wartung für zuverlässige Erreichbarkeit und saubere technische Basis.',
    h1: 'Webhosting für Websites in Berlin: Domain, Technik und Performance aus einer Hand',
    answerBlock:
      'Webhosting für Websites in Berlin ist mehr als nur Serverplatz. Entscheidend sind Domain-Setup, Ladezeit, Sicherheit und laufende Wartung. Wir richten die Technik so ein, dass deine Website stabil erreichbar bleibt, schnell lädt und du dich auf dein Tagesgeschäft statt auf technische Ausfälle konzentrieren kannst.',
    ctaVariants: [
      { label: 'Hosting-Beratung anfragen', href: '/kontakt' },
      { label: 'Website-Check starten', href: '/website-tester' },
      { label: 'Premium-Paket ansehen', href: '/pakete/premium' }
    ],
    proofBlock: {
      title: 'Proof: Technische Basis mit klaren Standards',
      text: 'Unsere Hosting-Setups verbinden tägliche Backups, Monitoring und TLS-Verschlüsselung. So bleibt deine Website nicht nur sichtbar, sondern auch zuverlässig erreichbar.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Wir betreuen Websites für Berliner Unternehmen mit persönlichem Support und einem Antwortziel von maximal 24 Stunden bei Rückfragen oder Störungen.'
    },
    faqItems: [
      {
        q: 'Was gehört bei Webhosting für Unternehmen in Berlin dazu?',
        a: 'Domain, SSL, Serverbetrieb, Backups, Monitoring und eine stabile Performance für alle Endgeräte.'
      },
      {
        q: 'Warum ist Hosting für SEO relevant?',
        a: 'Langsame oder instabile Seiten verschlechtern Nutzerverhalten und können sich negativ auf Sichtbarkeit auswirken.'
      },
      {
        q: 'Kann ich meine bestehende Domain behalten?',
        a: 'Ja, in den meisten Fällen kann die bestehende Domain übernommen und sauber umgestellt werden.'
      },
      {
        q: 'Wie sicher ist meine Website bei euch aufgesetzt?',
        a: 'Wir setzen auf TLS, regelmäßige Backups und technische Schutzmaßnahmen gegen typische Ausfall- und Spam-Risiken.'
      },
      {
        q: 'Bekomme ich auch nach dem Launch Support?',
        a: 'Ja. Hosting und Wartung können als laufende Leistung weiter betreut werden.'
      }
    ],
    internalLinks: [
      { label: 'Rechtliches, Sicherheit & Vertrauen', href: '/webdesign-berlin/rechtliches-sicherheit' },
      { label: 'Responsives Design & Mobile', href: '/webdesign-berlin/responsives-design-mobile' },
      { label: 'Premium-Paket', href: '/pakete/premium' },
      { label: 'Ratgeber: Baukasten vs. professionelle Website', href: '/ratgeber/baukasten-vs-professionelle-website' },
      { label: 'Webdesign Berlin Charlottenburg', href: '/webdesign-berlin/charlottenburg' }
    ]
  },
  'inhalte-texte-content': {
    keywordPrimary: 'website texte erstellen lassen berlin',
    keywordSecondary: ['webseitentexte berlin', 'content webdesign berlin'],
    metaTitle: 'Website Texte erstellen lassen Berlin | Content, der Anfragen auslöst',
    metaDescription: 'Website Texte in Berlin erstellen lassen: klare Botschaften, lokale Relevanz und conversion-orientierte Inhalte für mehr Vertrauen und mehr qualifizierte Leads.',
    h1: 'Website Texte erstellen lassen in Berlin: Inhalte mit klarem Conversion-Fokus',
    answerBlock:
      'Website Texte in Berlin müssen schnell zeigen, was du anbietest und warum Kunden dir vertrauen können. Wir entwickeln klare Inhalte für Startseite, Leistungen und Kontaktstrecken, die Suchintention, lokale Relevanz und Conversion verbinden. So wird aus Lesern häufiger eine konkrete Anfrage statt nur ein kurzer Besuch.',
    ctaVariants: [
      { label: 'Content-Beratung anfragen', href: '/kontakt' },
      { label: 'Website-Tester starten', href: '/website-tester' },
      { label: 'Business-Paket ansehen', href: '/pakete/business' }
    ],
    proofBlock: {
      title: 'Proof: Content mit klarer Wirkung',
      text: 'Wir schreiben nicht für Klicks allein, sondern für Kontaktanfragen: klare Leistungsargumente, präzise CTAs und eine Struktur, die in jedem Schritt auf die nächste Handlung einzahlt.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Unsere Texte sind auf Berliner Zielgruppen und Suchverhalten abgestimmt, damit deine Leistungen in Bezirken wie Mitte, Kreuzberg oder Prenzlauer Berg verständlich und glaubwürdig wirken.'
    },
    faqItems: [
      {
        q: 'Warum sollte ich Website Texte professionell erstellen lassen?',
        a: 'Weil gute Inhalte dein Angebot schneller verständlich machen, Vertrauen aufbauen und Besucher gezielt zur Anfrage führen.'
      },
      {
        q: 'Welche Seiten brauchen die stärksten Texte?',
        a: 'Startseite, Leistungsseiten, Über-uns-Bereich und Kontaktseite haben den größten Einfluss auf Conversion.'
      },
      {
        q: 'Sind die Texte gleichzeitig SEO-optimiert?',
        a: 'Ja. Wir verbinden Suchintention, klare Lesbarkeit und sinnvolle Keyword-Platzierung ohne Überoptimierung.'
      },
      {
        q: 'Kann bestehender Content überarbeitet werden?',
        a: 'Ja. Bestehende Texte können strukturell und sprachlich optimiert werden, statt alles neu zu schreiben.'
      },
      {
        q: 'Wie schnell sind neue Texte einsatzbereit?',
        a: 'Je nach Umfang oft innerhalb weniger Tage bis Wochen, abgestimmt auf dein Website-Projekt.'
      }
    ],
    internalLinks: [
      { label: 'SEO & Sichtbarkeit (Einsteiger)', href: '/webdesign-berlin/seo-sichtbarkeit-einsteiger' },
      { label: 'Design & Benutzerführung (UX/UI)', href: '/webdesign-berlin/design-ux-ui' },
      { label: 'Business-Paket', href: '/pakete/business' },
      { label: 'Ratgeber: Baukasten vs. professionelle Website', href: '/ratgeber/baukasten-vs-professionelle-website' },
      { label: 'Webdesign Berlin Prenzlauer Berg', href: '/webdesign-berlin/prenzlauer-berg' }
    ]
  },
  'rechtliches-sicherheit': {
    keywordPrimary: 'dsgvo website berlin',
    keywordSecondary: ['rechtssichere website berlin', 'website sicherheit berlin'],
    metaTitle: 'DSGVO Website Berlin | Rechtliches, Sicherheit und Vertrauen',
    metaDescription: 'DSGVO-konforme Website in Berlin: rechtliche Grundlagen, technische Sicherheit und Vertrauenselemente für einen professionellen Auftritt ohne unnötiges Risiko.',
    h1: 'DSGVO Website in Berlin: Rechtssicher auftreten und Vertrauen stärken',
    answerBlock:
      'Eine DSGVO-konforme Website in Berlin schützt nicht nur vor unnötigen Risiken, sondern stärkt auch das Vertrauen deiner Besucher. Wir setzen Impressum, Datenschutz, Cookie-Logik und technische Sicherheitsgrundlagen so um, dass deine Website professionell wirkt und gleichzeitig sauber betreibbar bleibt.',
    ctaVariants: [
      { label: 'Rechtssicheren Setup-Check anfragen', href: '/kontakt' },
      { label: 'Meta- & Website-Tester starten', href: '/website-tester/meta' },
      { label: 'Premium-Paket ansehen', href: '/pakete/premium' }
    ],
    proofBlock: {
      title: 'Proof: Sicherheit ist planbarer als viele denken',
      text: 'Mit klaren Checklisten für Rechtstexte, Cookie-Einbindung, TLS und Backups entsteht ein stabiler Standard, der rechtliche Grundanforderungen und technische Zuverlässigkeit zusammenführt.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Wir betreuen Berliner Unternehmen mit persönlicher Begleitung statt Standard-Templates und sorgen dafür, dass Rechtliches und Technik im Alltag verständlich bleiben.'
    },
    faqItems: [
      {
        q: 'Was ist für eine DSGVO-konforme Website in Berlin Pflicht?',
        a: 'Impressum, Datenschutzerklärung, saubere Cookie-Logik und ein technisch sicherer Betrieb gehören zu den wichtigsten Grundlagen.'
      },
      {
        q: 'Reicht ein Cookie-Banner allein aus?',
        a: 'Nein. Ein Banner ist nur ein Teil. Ebenso wichtig sind korrekte Einbindung, Texte und technisches Verhalten der Seite.'
      },
      {
        q: 'Wie wichtig ist TLS-Verschlüsselung?',
        a: 'Sehr wichtig. TLS schützt Datenübertragung und ist ein zentraler Vertrauens- und Sicherheitsstandard.'
      },
      {
        q: 'Kann ich bestehende Rechtstexte weiterverwenden?',
        a: 'Teilweise. Inhalte sollten aber auf dein tatsächliches Setup und deine eingesetzten Tools abgestimmt werden.'
      },
      {
        q: 'Ist Recht & Sicherheit auch für kleine Websites relevant?',
        a: 'Ja. Gerade kleine Unternehmen profitieren von klaren Standards, um Risiken und Unsicherheit zu reduzieren.'
      }
    ],
    internalLinks: [
      { label: 'Domain, Hosting & Technik', href: '/webdesign-berlin/domain-hosting-technik' },
      { label: 'SEO & Sichtbarkeit (Einsteiger)', href: '/webdesign-berlin/seo-sichtbarkeit-einsteiger' },
      { label: 'Premium-Paket', href: '/pakete/premium' },
      { label: 'Ratgeber: Website-Kosten Berlin', href: '/ratgeber/website-kosten-berlin' },
      { label: 'Webdesign Berlin Charlottenburg', href: '/webdesign-berlin/charlottenburg' }
    ]
  },
  'kosten-preise-pakete': {
    keywordPrimary: 'website kosten berlin',
    keywordSecondary: ['website erstellen lassen berlin kosten', 'webdesign preise berlin'],
    metaTitle: 'Website Kosten Berlin 2026 | Preise und Pakete im Überblick',
    metaDescription: 'Website Kosten in Berlin transparent erklärt: Pakete ab 499 EUR, Leistungsumfang, Zeitrahmen und sinnvolle Optionen für kleine Unternehmen und Selbstständige.',
    h1: 'Website Kosten in Berlin 2026: Preise, Pakete und realistische Budgetplanung',
    answerBlock:
      'Website Kosten in Berlin hängen vor allem von Umfang, Inhalten und Funktionen ab. Wir arbeiten mit transparenten Paketen ab 499 EUR statt unklarer Stundenlogik. So weißt du früh, was enthalten ist, welche Optionen sinnvoll sind und wie dein Projektbudget planbar in messbare Ergebnisse übergeht.',
    ctaVariants: [
      { label: 'Kostenloses Budget-Gespräch', href: '/kontakt' },
      { label: 'Pakete vergleichen', href: '/pakete' },
      { label: 'Website-Tester starten', href: '/website-tester' }
    ],
    proofBlock: {
      title: 'Proof: Transparente Zahlen statt Preis-Nebel',
      text: 'Mit Einstieg bei 499 EUR, klaren Paketgrenzen und definierten Lieferzeiten von 2 bis 8 Wochen hast du eine belastbare Entscheidungsgrundlage statt offener Kostenschleifen.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Wir kalkulieren Website-Projekte für Berliner Unternehmen transparent und verständlich, damit du Aufwand, Nutzen und nächste Schritte sofort einordnen kannst.'
    },
    faqItems: [
      {
        q: 'Was kostet eine professionelle Website in Berlin?',
        a: 'Der Einstieg liegt häufig bei kompakten Projekten ab 499 EUR, größere Websites liegen je nach Umfang entsprechend höher.'
      },
      {
        q: 'Warum unterscheiden sich Website-Preise so stark?',
        a: 'Preise variieren je nach Seitenanzahl, Content-Aufwand, Funktionen wie Buchungssystemen und gewünschter SEO-Tiefe.'
      },
      {
        q: 'Welche laufenden Kosten kommen dazu?',
        a: 'Typisch sind Hosting, Domain, E-Mail und optionale Wartung, die monatlich eingeplant werden.'
      },
      {
        q: 'Ist SEO im Paket enthalten?',
        a: 'Ja, die SEO-Basis ist in den Paketen berücksichtigt und kann je nach Ziel weiter ausgebaut werden.'
      },
      {
        q: 'Wie plane ich mein Budget ohne Risiko?',
        a: 'Mit klarer Priorisierung der wichtigsten Seiten und Funktionen sowie transparenten Paketgrenzen von Anfang an.'
      }
    ],
    internalLinks: [
      { label: 'Design & Benutzerführung (UX/UI)', href: '/webdesign-berlin/design-ux-ui' },
      { label: 'SEO & Sichtbarkeit (Einsteiger)', href: '/webdesign-berlin/seo-sichtbarkeit-einsteiger' },
      { label: 'Pakete im Überblick', href: '/pakete' },
      { label: 'Ratgeber: Website-Kosten Berlin', href: '/ratgeber/website-kosten-berlin' },
      { label: 'Webdesign Berlin Mitte', href: '/webdesign-berlin/mitte' }
    ]
  }
};

export async function showLeistungPage(req, res, next) {
  const { slug } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM leistungen_pages
      WHERE slug = $1
        AND is_published = TRUE
      LIMIT 1
      `,
      [slug]
    );

    if (!rows.length) {
      // keine Seite gefunden -> 404 über globales Handling
      return next();
    }

    const row = rows[0];
    const override = SERVICE_PAGE_OVERRIDES[slug] || {};
    const dbMetaDescription = trimOrEmpty(row.meta_description);
    const fallbackMetaDescription = trimOrEmpty(
      row.subtitle ||
      row.hero_subtitle ||
      `Leistungen – ${row.title}`
    );

    const page = {
      slug: row.slug,
      title: row.title,
      metaTitle: override.metaTitle || row.title,
      subtitle: row.subtitle,
      keywordMap: {
        primary: override.keywordPrimary || '',
        secondary: override.keywordSecondary || []
      },
      answerBlock: override.answerBlock || '',
      updatedAt: row.updated_at || row.created_at || null,
      ctaVariants: override.ctaVariants || DEFAULT_CTA_VARIANTS,
      proofBlock: override.proofBlock || null,
      trustBlock: override.trustBlock || null,
      faqItems: override.faqItems || [],
      internalLinks: override.internalLinks || [],

      hero: {
        title: override.h1 || row.hero_title || row.title,
        subtitle: row.hero_subtitle,
        icons: safeJson(row.hero_icons, [])
      },

      intro: {
        problem: {
          title: row.intro_problem_title,
          text: row.intro_problem_text
        },
        solution: {
          title: row.intro_solution_title,
          text: row.intro_solution_text
        }
      },

      description: safeJson(row.description, []),

      services: safeJson(row.services, []),

      risks: {
        title: row.risks_title,
        intro: row.risks_intro,
        items: safeJson(row.risks_items, []),
        conclusion: safeJson(row.risks_conclusion, [])
      },

      cta: {
        title: row.cta_title,
        text: row.cta_text,
        buttonText: row.cta_button_text,
        buttonLink: row.cta_button_link
      }
    };

    res.render('leistungen/show', {
      page,
      title: page.metaTitle,
      description: dbMetaDescription || override.metaDescription || fallbackMetaDescription,
      ogImage: null // bei Bedarf dynamisch ergänzen
    });
  } catch (err) {
    console.error('❌ Fehler beim Laden der Leistungsseite:', err);
    next(err);
  }
}
