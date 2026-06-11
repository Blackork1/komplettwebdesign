// controllers/leistungenController.js
import pool from '../util/db.js';
import { PACKAGE_GLOBAL_NOTES } from '../data/packages.js';
import { addOns } from '../data/addOns.js';
import { maintenancePlans } from '../data/maintenancePlans.js';
import { withServiceHeroImage } from '../data/serviceHeroImages.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { interpolatePricingTokens } from '../util/pricingViewModel.js';
import pricingService from '../services/pricingService.js';
import { canonicalLeistungPath } from '../helpers/leistungPageRouting.js';

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

const COST_PAGE_ADD_ON_IDS = [
  'zusatzseite-standard',
  'seo-leistungsseite',
  'texterstellung-erweitert',
  'buchungssystem-integration',
  'cms-einfach',
  'tracking-einrichtung',
  'mehrsprachigkeit',
  'inhaltsmigration',
  'website-audit',
  'stundenweise-weiterentwicklung'
];

function findById(collection, id) {
  return collection.find((item) => item.id === id) || null;
}

const COST_PAGE_ADD_ONS = Object.freeze(
  COST_PAGE_ADD_ON_IDS
    .map((id) => findById(addOns, id))
    .filter(Boolean)
    .map((item) => Object.freeze({
      id: item.id,
      name: item.name,
      category: item.category,
      priceLabel: item.priceLabel,
      shortDescription: item.shortDescription,
      whenUseful: item.whenUseful
    }))
);

const COST_PAGE_MAINTENANCE = Object.freeze(
  maintenancePlans.map((plan) => Object.freeze({
    id: plan.id,
    name: plan.name,
    priceLabel: plan.priceLabel,
    shortDescription: plan.shortDescription,
    responseTime: plan.responseTime,
    contentChangeAllowance: plan.contentChangeAllowance
  }))
);

const COST_PAGE_CONTENT = Object.freeze({
  pricePrinciples: Object.freeze([
    {
      title: 'Ab-Preise sind Einstiegspunkte',
      text: 'Der genannte Paketpreis beschreibt den Einstieg bei klar abgegrenztem Umfang. Seitenanzahl, Inhalte, Zusatzfunktionen und Relaunch-Aufwand können den Preis verändern.'
    },
    {
      title: 'Projektkosten und Betrieb getrennt betrachten',
      text: 'Die Paketpreise beziehen sich auf die einmalige Erstellung der Website. Domain, E-Mail, Hosting, Wartung, externe Tools und spätere Erweiterungen werden separat eingeordnet.'
    },
    {
      title: 'Business ist die häufig passende Mitte',
      text: 'Für viele kleine Unternehmen ist Business der realistische Standard, weil mehrere Leistungen, eine klare Seitenstruktur und technische SEO-Grundlagen abgedeckt werden.'
    }
  ]),
  packages: Object.freeze([]),
  priceFactors: Object.freeze([
    'Seitenumfang und Seitenstruktur',
    'Status der Texte, Bilder und vorhandenen Inhalte',
    'Relaunch-Aufwand, Inhaltsmigration und Weiterleitungen',
    'Tiefe der technischen SEO-Grundlagen und lokalen Struktur',
    'Zusatzfunktionen wie Buchungssystem, CMS, Shop-Funktion oder Mehrsprachigkeit',
    'Tracking, Cookie-/Consent-Setup und eingesetzte Drittanbieter-Tools',
    'Bildrecherche, Bildbearbeitung und individuelle Animationen',
    'gewünschter Wartungs-, Hosting- und Support-Rahmen nach dem Livegang'
  ]),
  included: Object.freeze([
    'persönliche Abstimmung und Einordnung des Projektumfangs',
    'individuelle Umsetzung mit Node.js, EJS, CSS und JavaScript',
    'serverseitig gerendertes HTML und responsive Darstellung',
    'technische SEO-Grundlagen im vereinbarten Umfang',
    'Einbindung gelieferter Inhalte und klare Anfragewege',
    'Feedbackrunden gemäß Paket',
    'Launch-Vorbereitung nach Freigabe'
  ]),
  notIncluded: Object.freeze([
    'Buchungssysteme, CMS, Shop-Funktionen und Mehrsprachigkeit in Standardpaketen',
    'umfangreiche Texterstellung oder größere Inhaltsmigration ohne Zusatzvereinbarung',
    'laufende SEO-Betreuung, Anzeigenbetreuung oder Ranking-Versprechen',
    'Hosting, Domain, E-Mail und Wartung, sofern nicht separat vereinbart',
    'Drittanbieter-Kosten für Tools, Lizenzen, Consent-Dienste oder Zahlungsanbieter',
    'Rechtsberatung oder rechtliche Prüfung von Impressum, Datenschutz und Cookie-Hinweisen'
  ]),
  costSplit: Object.freeze([
    {
      title: 'Einmalige Projektkosten',
      text: PACKAGE_GLOBAL_NOTES.projectCostNote,
      items: Object.freeze([
        'Konzeption, Struktur und Design',
        'technische Umsetzung und responsive Anpassung',
        'Einbindung gelieferter Inhalte',
        'SEO-Grundlagen, Meta-Daten und interne Verlinkung im vereinbarten Umfang',
        'Feedbackrunden und Launch-Vorbereitung gemäß Paket'
      ])
    },
    {
      title: 'Laufende Kosten',
      text: PACKAGE_GLOBAL_NOTES.runningCostsNote,
      items: Object.freeze([
        'Domain und E-Mail-Postfächer',
        'Hosting, Backups und Monitoring',
        'Wartung und kleinere Inhaltsänderungen nach Vereinbarung',
        'Cookie-/Consent-Dienste oder externe Tools',
        'Drittanbieter-Lizenzen, falls eingesetzt'
      ])
    }
  ]),
  maintenancePlans: COST_PAGE_MAINTENANCE,
  thirdPartyCosts: Object.freeze([
    'Domain, E-Mail und Hosting können über externe Anbieter oder ein separat vereinbartes Setup laufen.',
    'Buchungs-, Newsletter-, Zahlungs- oder Consent-Tools können eigene Gebühren haben.',
    'Stockfotos, Schriften, Karten- oder Analyse-Tools können zusätzliche Lizenz- oder Nutzungskosten verursachen.',
    'Diese Kosten werden vor der Umsetzung eingeordnet, soweit sie für den geplanten Umfang relevant sind.'
  ]),
  addOns: COST_PAGE_ADD_ONS,
  paymentAndLaunch: Object.freeze([
    'Der konkrete Zahlungsplan wird im Angebot festgelegt.',
    'Der Livegang erfolgt nach finaler Freigabe und gemäß vereinbartem Zahlungsmodell.',
    'Zusatzwünsche nach Freigabe oder außerhalb des vereinbarten Umfangs werden separat kalkuliert.',
    PACKAGE_GLOBAL_NOTES.vatNote
  ]),
  legalNotes: Object.freeze([
    PACKAGE_GLOBAL_NOTES.legalNote,
    PACKAGE_GLOBAL_NOTES.seoNote,
    PACKAGE_GLOBAL_NOTES.thirdPartyNote
  ])
});

const SERVICE_PAGE_OVERRIDES = {
  'design-ux-ui': {
    keywordPrimary: 'website relaunch berlin',
    keywordSecondary: ['webdesign ux berlin', 'website benutzerführung berlin'],
    metaTitle: 'Website Relaunch Berlin | UX/UI Webdesign mit klaren Anfragewegen',
    metaDescription: 'Website Relaunch in Berlin mit klarer UX/UI-Strategie: bessere Nutzerführung, schnellere Entscheidungen und nachvollziehbare Anfragewege statt Absprüngen.',
    h1: 'Website Relaunch in Berlin: UX/UI Webdesign mit klaren Anfragewegen',
    answerBlock:
      'Ein Website Relaunch in Berlin lohnt sich, wenn Nutzer trotz Traffic selten anfragen. Mit klarer UX-Struktur, mobilen Conversion-Wegen und einem eindeutigen Seitenaufbau machst du Kontaktmöglichkeiten besser auffindbar. Wir verbinden Design, Nutzerführung und SEO-Grundlage, damit deine Website verständlicher wird und bessere Voraussetzungen für Anfragen schafft.',
    ctaVariants: [
      { label: 'Relaunch besprechen', href: '/kontakt' },
      { label: 'UX mit Website-Tester prüfen', href: '/website-tester' },
      { label: 'Business-Paket ansehen', href: '/pakete/business' }
    ],
    proofBlock: {
      title: 'Proof: Relaunch mit klaren Kennzahlen',
      text: 'Wir planen Relaunches mit verbindlichen Leitplanken statt Bauchgefühl: Pakete ab {{lowestPackagePriceLabel.en}}, Antwortziel innerhalb von 24 Stunden und ein realistischer Projektkorridor je Umfang.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Als Webdesigner aus Berlin kennen wir den lokalen Wettbewerb und bauen Relaunches so auf, dass Leistungen, Referenzen und Kontaktwege in Bezirken wie Mitte, Friedrichshain und Charlottenburg schnell verstanden werden.'
    },
    faqItems: [
      {
        q: 'Wann ist ein Website Relaunch in Berlin sinnvoll?',
        a: 'Wenn deine Website zwar besucht wird, aber Kontaktwege schwach sichtbar sind, mobil nicht überzeugt oder Leistungen unklar kommuniziert werden.'
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
        a: 'Eine Website, die schneller verstanden wird, besser auf Mobilgeräten funktioniert und Anfragewege nachvollziehbar verbessert.'
      }
    ],
    internalLinks: [
      { label: 'Responsives Design & Mobile', href: '/leistungen/responsives-design-mobile' },
      { label: 'Inhalte & Texte (Content)', href: '/leistungen/inhalte-texte-content' },
      { label: 'Business-Paket', href: '/pakete/business' },
      { label: 'Ratgeber: Website erstellen Berlin – Ablauf', href: '/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten' },
      { label: 'Webdesign Berlin Mitte', href: '/webdesign-berlin/mitte' }
    ]
  },
  'seo-sichtbarkeit-einsteiger': {
    keywordPrimary: 'local seo berlin unternehmen',
    keywordSecondary: ['seo sichtbarkeit berlin', 'webseite gefunden werden berlin'],
    metaTitle: 'Local SEO Berlin für Unternehmen | Sichtbarkeit sauber aufbauen',
    metaDescription: 'Local SEO in Berlin für kleine Unternehmen: klare Seitenstruktur, Suchintent-Mapping und Inhalte, die lokale Auffindbarkeit und Kontaktwege unterstützen.',
    h1: 'Local SEO Berlin für Unternehmen: Sichtbarkeit sauber aufbauen',
    answerBlock:
      'Local SEO in Berlin bedeutet, dass deine Website für passende lokale Suchsituationen verständlich vorbereitet wird. Mit sauberer Seitenstruktur, relevanten Keywords, lokaler Verlinkung und klaren Kontaktwegen stärkst du die technische und inhaltliche Grundlage für qualifizierte Anfragen.',
    ctaVariants: [
      { label: 'SEO-Beratung anfragen', href: '/kontakt' },
      { label: 'SEO-Tester starten', href: '/website-tester/seo' },
      { label: 'Business-Paket ansehen', href: '/pakete/business' }
    ],
    proofBlock: {
      title: 'Proof: SEO mit realistischen Grundlagen',
      text: 'Wir arbeiten ohne Ranking-Versprechen und setzen stattdessen auf belastbare Grundlagen: saubere OnPage-Struktur, lokale Keyword-Zuordnung, klare Conversion-Wege und transparente Pakete ab {{lowestPackagePriceLabel.en}} als Einstieg.'
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
        a: 'Ja. Mit einer sauberen Grundlage aus Struktur, Meta-Daten, internen Links und klaren CTAs lassen sich sinnvolle Fortschritte erzielen.'
      }
    ],
    internalLinks: [
      { label: 'Inhalte & Texte (Content)', href: '/leistungen/inhalte-texte-content' },
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
    metaDescription: 'Responsives Webdesign in Berlin: mobile Nutzerführung, schnelle Ladezeiten und klare CTAs als Grundlage für bessere Nutzung auf Smartphone und Desktop.',
    h1: 'Responsives Webdesign in Berlin: Mobile Websites mit klarer Conversion-Führung',
    answerBlock:
      'Responsives Webdesign in Berlin sorgt dafür, dass deine Website auf Smartphone, Tablet und Desktop sofort verständlich bleibt. Gerade mobil entscheiden Nutzer in Sekunden. Mit schnellen Ladezeiten, gut lesbaren Inhalten und eindeutigen CTAs reduzierst du Absprünge und machst direkte Anfragewege besser nutzbar.',
    ctaVariants: [
      { label: 'Mobile-Check im Erstgespräch', href: '/kontakt' },
      { label: 'Website-Tester starten', href: '/website-tester' },
      { label: 'Start-Paket ansehen', href: '/pakete/start' }
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
      { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
      { label: 'Laufende Website-Kosten', href: '/leistungen/laufende-kosten-website' },
      { label: 'Start-Paket', href: '/pakete/start' },
      { label: 'Ratgeber: Website erstellen Berlin – Ablauf', href: '/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten' },
      { label: 'Webdesign Berlin Kreuzberg', href: '/webdesign-berlin/kreuzberg' }
    ]
  },
  'domain-hosting-technik': {
    keywordPrimary: 'webhosting für website berlin',
    keywordSecondary: ['website hosting berlin', 'domain und technik website'],
    metaTitle: 'Webhosting für Website Berlin | Domain, Technik und Stabilität',
    metaDescription: 'Webhosting für Websites in Berlin: passende Domain, stabile Infrastruktur, Sicherheit und Wartung für zuverlässige Erreichbarkeit und saubere technische Basis.',
    h1: 'Webhosting für Websites in Berlin: Domain, Technik und Performance aus einer Hand',
    answerBlock:
      'Webhosting für Websites in Berlin ist mehr als nur Serverplatz. Entscheidend sind Domain-Setup, Ladezeit, Sicherheit und laufende Wartung. Wir richten die Technik so ein, dass deine Website stabil erreichbar bleibt, schnell lädt und du dich auf dein Tagesgeschäft statt auf technische Ausfälle konzentrieren kannst.',
    ctaVariants: [
      { label: 'Hosting-Beratung anfragen', href: '/kontakt' },
      { label: 'Website-Check starten', href: '/website-tester' },
      { label: 'Wachstum-Paket ansehen', href: '/pakete/wachstum' }
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
      { label: 'Rechtliches, Sicherheit & Vertrauen', href: '/leistungen/rechtliches-sicherheit' },
      { label: 'Responsives Design & Mobile', href: '/leistungen/responsives-design-mobile' },
      { label: 'Wachstum-Paket', href: '/pakete/wachstum' },
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
      { label: 'Local SEO', href: '/leistungen/local-seo' },
      { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
      { label: 'Business-Paket', href: '/pakete/business' },
      { label: 'Ratgeber: Baukasten vs. professionelle Website', href: '/ratgeber/baukasten-vs-professionelle-website' },
      { label: 'Webdesign Berlin Prenzlauer Berg', href: '/webdesign-berlin/prenzlauer-berg' }
    ]
  },
  'rechtliches-sicherheit': {
    keywordPrimary: 'website sicherheit berlin',
    keywordSecondary: ['datenschutz technische website', 'website sicherheit berlin'],
    metaTitle: 'Technische Website-Sicherheit Berlin | Vertrauen sauber vorbereiten',
    metaDescription: 'Technische Website-Sicherheit in Berlin: Rechtstexte einbinden, Consent-Setup vorbereiten, SSL, Backups und Sicherheitsgrundlagen sauber planen. Keine Rechtsberatung.',
    h1: 'Technische Website-Sicherheit in Berlin: Vertrauen sauber vorbereiten',
    answerBlock:
      'Diese Seite ordnet technische Grundlagen für Vertrauen und Betrieb ein: vorhandene Rechtstexte einbinden, Consent-Setup passend zu eingesetzten Tools vorbereiten, SSL, Backups und einfache Schutzmaßnahmen sauber planen. Das ist technische Unterstützung und keine Rechtsberatung; die rechtliche Prüfung sollte bei Bedarf separat erfolgen.',
    ctaVariants: [
      { label: 'Technischen Setup-Check anfragen', href: '/kontakt' },
      { label: 'Meta- & Website-Tester starten', href: '/website-tester/meta' },
      { label: 'Wachstum-Paket ansehen', href: '/pakete/wachstum' }
    ],
    proofBlock: {
      title: 'Technische Grundlagen statt Rechtsversprechen',
      text: 'Ich prüfe, welche technischen Bausteine für dein Setup nötig sind: TLS, Backups, Spam-Schutz, Consent-Einbindung und saubere Plätze für bereitgestellte Rechtstexte.'
    },
    trustBlock: {
      title: 'Lokaler Vertrauensfaktor Berlin',
      text: 'Du bekommst eine nachvollziehbare technische Umsetzung. Rechtliche Inhalte kommen von dir oder einer passenden Rechtsquelle und werden nicht als Beratung ersetzt.'
    },
    faqItems: [
      {
        q: 'Was wird auf dieser Seite technisch eingeordnet?',
        a: 'Es geht um technische Einbindung und Betrieb: bereitgestellte Rechtstexte, Consent-Setup, SSL, Backups, Spam-Schutz und grundlegende Sicherheit. Die rechtliche Prüfung sollte bei Bedarf separat erfolgen.'
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
        q: 'Kann ich bestehende Rechtstexte einbinden lassen?',
        a: 'Ja, vorhandene Texte können technisch eingebunden werden. Ob sie rechtlich passen, muss separat geprüft werden.'
      },
      {
        q: 'Ist Recht & Sicherheit auch für kleine Websites relevant?',
        a: 'Ja. Gerade kleine Unternehmen profitieren von klaren Standards, um Risiken und Unsicherheit zu reduzieren.'
      }
    ],
    internalLinks: [
      { label: 'Laufende Website-Kosten', href: '/leistungen/laufende-kosten-website' },
      { label: 'Local SEO', href: '/leistungen/local-seo' },
      { label: 'Wachstum-Paket', href: '/pakete/wachstum' },
      { label: 'Ratgeber: Website-Kosten Berlin', href: '/ratgeber/website-kosten-berlin' },
      { label: 'Webdesign Berlin Charlottenburg', href: '/webdesign-berlin/charlottenburg' }
    ]
  },
  'kosten-preise-pakete': {
    keywordPrimary: 'website kosten berlin',
    keywordSecondary: ['website erstellen lassen berlin kosten', 'webdesign preise berlin'],
    metaTitle: 'Webdesign Preise Berlin | Website-Pakete ab {{lowestPackagePriceLabel}}',
    metaDescription: 'Webdesign Preise in Berlin transparent erklärt: Start {{price.start}}, Business {{price.business}}, Wachstum {{price.wachstum}} und individuelle Projekte {{price.individuell}}.',
    h1: 'Webdesign Preise in Berlin: Was kostet eine Website?',
    heroSubtitle: 'Klare Website-Pakete für kleine Unternehmen, Selbstständige und lokale Dienstleister in Berlin.',
    answerBlock:
      'Website-Kosten hängen vor allem von Seitenumfang, Inhalten, Funktionen und laufendem Betrieb ab. Die Paketpreise starten bei {{lowestPackagePriceLabel}} und zeigen dir früh, welcher Rahmen realistisch ist. Zusatzleistungen, Drittanbieter-Kosten und laufende Kosten werden separat eingeordnet, damit du Projektbudget und Betrieb sauber unterscheiden kannst.',
    ctaVariants: [
      { label: 'Kosten einschätzen lassen', href: '/kontakt' },
      { label: 'Pakete vergleichen', href: '/pakete' },
      { label: 'Website-Tester starten', href: '/website-tester' }
    ],
    proofBlock: {
      title: 'Preislogik auf einen Blick',
      text: 'Start beginnt bei {{price.start}}, Business bei {{price.business}}, Wachstum bei {{price.wachstum}} und individuelle Projekte bei {{price.individuell}}. Alle Preise verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.'
    },
    trustBlock: {
      title: 'Was separat geplant wird',
      text: 'Hosting, Domain, E-Mail, Wartung, Drittanbieter-Tools, Rechtstexte, umfangreiche Texte und Sonderfunktionen gehören nicht automatisch in jedes Paket. Diese Punkte werden vorab abgegrenzt.'
    },
    intro: {
      problem: {},
      solution: {}
    },
    description: [],
    services: [],
    risks: {
      items: [],
      conclusion: []
    },
    costPageContent: COST_PAGE_CONTENT,
    exampleCalculations: [
      {
        title: 'Beispiel 1: Kompakter Onepager',
        setup: 'Start-Paket',
        oneTime: '{{price.start}} einmalig',
        recurring: 'Domain, E-Mail, Hosting, Wartung und externe Dienste separat nach Setup',
        note: 'Geeignet, wenn du einen klaren Erstauftritt mit Kontaktweg und schlankem Umfang brauchst.'
      },
      {
        title: 'Beispiel 2: Unternehmenswebsite',
        setup: 'Business-Paket',
        oneTime: '{{price.business}} einmalig',
        recurring: 'Domain, E-Mail, Hosting, Wartung und externe Dienste separat nach Setup',
        note: 'Geeignet, wenn mehrere Leistungen, Referenzen und Anfragewege professionell strukturiert werden sollen.'
      },
      {
        title: 'Beispiel 3: Relaunch mit mehr Struktur',
        setup: 'Wachstum-Paket',
        oneTime: '{{price.wachstum}} einmalig',
        recurring: 'Domain, E-Mail, Hosting, Wartung und externe Dienste separat nach Setup',
        note: 'Geeignet für mehrere Leistungsseiten, Relaunch-Struktur und stärkere technische SEO-Grundlagen.'
      },
      {
        title: 'Beispiel 4: Sonderfunktionen',
        setup: 'Individuelles Projekt',
        oneTime: '{{price.individuell}}',
        recurring: 'abhängig von Betrieb, Tools, Wartung und Drittanbieter-Leistungen',
        note: 'Geeignet für Buchungssysteme, CMS, Mehrsprachigkeit, Shop-Funktionen oder andere Anforderungen außerhalb der Standardpakete.'
      }
    ],
    faqItems: [
      {
        q: 'Was kostet eine professionelle Website in Berlin?',
        a: 'Der Einstieg liegt bei kompakten Projekten {{price.start}}. Business beginnt {{price.business}}, Wachstum {{price.wachstum}} und individuelle Projekte {{price.individuell}}.'
      },
      {
        q: 'Warum unterscheiden sich Website-Preise so stark?',
        a: 'Preise variieren je nach Seitenanzahl, Content-Aufwand, Relaunch-Komplexität, Zusatzfunktionen und gewünschter SEO-Tiefe.'
      },
      {
        q: 'Welche laufenden Kosten kommen dazu?',
        a: 'Typisch sind Domain, E-Mail, Hosting, Wartung, Backups, Monitoring oder externe Tools. Diese Kosten sind nicht automatisch Bestandteil der einmaligen Erstellung.'
      },
      {
        q: 'Sind Buchungssystem, CMS oder Shop-Funktionen enthalten?',
        a: 'Nein, diese Funktionen sind nicht automatisch Bestandteil der Standardpakete. Sie werden als Zusatzleistung oder individuelles Projekt geprüft und kalkuliert.'
      },
      {
        q: 'Ist SEO bei den Preisen berücksichtigt?',
        a: 'Technische SEO-Grundlagen sind im vereinbarten Umfang berücksichtigt. Bestimmte Platzierungen bei Google werden nicht versprochen.'
      },
      {
        q: 'Wie plane ich mein Budget realistisch?',
        a: 'Starte mit dem passenden Paket, priorisiere die wichtigsten Seiten und kläre Zusatzfunktionen, laufende Kosten und Drittanbieter-Tools vor der Umsetzung.'
      }
    ],
    internalLinks: [
      { label: 'Website-Relaunch', href: '/leistungen/website-relaunch' },
      { label: 'Local SEO', href: '/leistungen/local-seo' },
      { label: 'Pakete im Überblick', href: '/pakete' },
      { label: 'Business-Paket', href: '/pakete/business' },
      { label: 'Laufende Website-Kosten', href: '/leistungen/laufende-kosten-website' },
      { label: 'Zusatzleistungen Webdesign', href: '/leistungen/zusatzleistungen-webdesign' },
      { label: 'Ratgeber: Website-Kosten Berlin', href: '/ratgeber/website-kosten-berlin' },
      { label: 'Projekt anfragen', href: '/kontakt' }
    ],
    cta: {
      title: 'Kosten für dein Website-Projekt einordnen',
      text: 'Schick mir den geplanten Umfang. Ich ordne ein, welches Paket passt und welche Zusatz- oder laufenden Kosten du separat berücksichtigen solltest.',
      buttonText: 'Kosten einschätzen lassen',
      buttonLink: '/kontakt'
    }
  }
};

function buildDynamicCostPagePackages(visiblePackages = []) {
  const wantedOrder = ['start', 'business', 'wachstum', 'individuell'];
  const byKey = new Map(
    visiblePackages
      .filter(Boolean)
      .map((pkg) => [pkg.packageKey || pkg.slug, pkg])
  );

  return wantedOrder
    .map((key) => byKey.get(key))
    .filter(Boolean)
    .map((pkg) => ({
      id: pkg.packageKey || pkg.slug,
      name: pkg.displayName || pkg.name,
      priceLabel: pkg.priceLabel,
      priceNote: pkg.priceType === 'custom' ? 'nach Aufwand und vereinbartem Umfang' : 'einmalig im vereinbarten Umfang',
      href: pkg.canonicalPath,
      description: pkg.shortDescription || pkg.positioning,
      scope: pkg.pageScope,
      feedbackRounds: pkg.feedbackRounds,
      recommended: Boolean(pkg.isRecommended),
      recommendationLabel: pkg.recommendationLabel || 'Häufig passende Lösung',
      included: [
        pkg.pageScope,
        pkg.textScope,
        pkg.seoScope,
        pkg.techScope,
        pkg.feedbackRounds ? `${pkg.feedbackRounds} Feedbackrunden` : ''
      ].filter(Boolean),
      notIncluded: []
    }));
}

function buildDynamicCostPageAddOns(visibleAddOns = [], fallbackAddOns = COST_PAGE_ADD_ONS) {
  const byId = new Map(visibleAddOns.filter(Boolean).map((item) => [item.id || item.addonKey, item]));
  const fromDb = COST_PAGE_ADD_ON_IDS
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      priceLabel: item.priceLabel,
      shortDescription: item.shortDescription,
      whenUseful: item.whenUseful
    }));

  return fromDb.length ? fromDb : fallbackAddOns;
}

function buildDynamicCostPageMaintenance(visiblePlans = [], fallbackPlans = COST_PAGE_MAINTENANCE) {
  if (!visiblePlans.length) return fallbackPlans;
  return visiblePlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    priceLabel: plan.priceLabel,
    shortDescription: plan.shortDescription,
    responseTime: plan.responseTime,
    contentChangeAllowance: plan.contentChangeAllowance
  }));
}

function noteBodies(notes = []) {
  return notes.map((note) => note?.body).filter(Boolean);
}

async function safeCostPageDbData() {
  try {
    const [addOns, maintenancePlans, globalNotes] = await Promise.all([
      pricingService.getVisibleAddOns(),
      pricingService.getVisibleMaintenancePlans(),
      pricingService.getGlobalPricingNotes()
    ]);
    return { addOns, maintenancePlans, globalNotes };
  } catch (err) {
    console.error('Fehler beim Laden der Kosten-DB-Daten:', err.message);
    return { addOns: [], maintenancePlans: [], globalNotes: [] };
  }
}

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

    const row = normalizeLegacyPublicCopy(rows[0]);
    const override = SERVICE_PAGE_OVERRIDES[slug] || {};
    const dbMetaDescription = trimOrEmpty(row.meta_description);
    const fallbackMetaDescription = trimOrEmpty(
      row.subtitle ||
      row.hero_subtitle ||
      `Leistungen – ${row.title}`
    );
    const [visiblePackages, costDbData] = await Promise.all([
      res.locals.visiblePackages || pricingService.getVisiblePackages(),
      override.costPageContent ? safeCostPageDbData() : Promise.resolve({ addOns: [], maintenancePlans: [], globalNotes: [] })
    ]);
    const globalNoteBodies = noteBodies(costDbData.globalNotes);
    const costPageContent = override.costPageContent
      ? {
        ...override.costPageContent,
        packages: buildDynamicCostPagePackages(visiblePackages),
        maintenancePlans: buildDynamicCostPageMaintenance(costDbData.maintenancePlans, override.costPageContent.maintenancePlans),
        addOns: buildDynamicCostPageAddOns(costDbData.addOns, override.costPageContent.addOns),
        legalNotes: globalNoteBodies.length ? globalNoteBodies : override.costPageContent.legalNotes
      }
      : null;

    const page = withServiceHeroImage(interpolatePricingTokens({
      slug: row.slug,
      title: row.title,
      metaTitle: override.metaTitle || row.title,
      metaDescription: override.metaDescription || dbMetaDescription || fallbackMetaDescription,
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
      costPageContent,
      exampleCalculations: override.exampleCalculations || [],
      faqItems: override.faqItems || [],
      internalLinks: override.internalLinks || [],
      canonicalPath: canonicalLeistungPath(row.slug),

      hero: {
        title: override.h1 || row.hero_title || row.title,
        subtitle: override.heroSubtitle || row.hero_subtitle,
        icons: safeJson(row.hero_icons, [])
      },

      intro: override.intro || {
        problem: {
          title: row.intro_problem_title,
          text: row.intro_problem_text
        },
        solution: {
          title: row.intro_solution_title,
          text: row.intro_solution_text
        }
      },

      description: override.description || safeJson(row.description, []),

      services: override.services || safeJson(row.services, []),

      risks: override.risks || {
        title: row.risks_title,
        intro: row.risks_intro,
        items: safeJson(row.risks_items, []),
        conclusion: safeJson(row.risks_conclusion, [])
      },

      cta: override.cta || {
        title: row.cta_title,
        text: row.cta_text,
        buttonText: row.cta_button_text,
        buttonLink: row.cta_button_link
      }
    }, res.locals.packagePricing || {}, { lng: 'de' }));

    res.render('leistungen/show', {
      page,
      title: page.metaTitle,
      description: page.metaDescription,
      ogImage: page.heroImage?.src || null
    });
  } catch (err) {
    console.error('❌ Fehler beim Laden der Leistungsseite:', err);
    next(err);
  }
}
