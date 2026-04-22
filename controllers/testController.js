import { auditWebsite, getCachedAuditResult, toPublicAuditResult } from '../services/websiteAuditService.js';
import { auditBrokenLinks, toPublicBrokenLinkResult } from '../services/brokenLinkAuditService.js';
import { auditGeoWebsite } from '../services/geoAuditService.js';
import { auditSeoWebsite } from '../services/seoAuditService.js';
import { auditMetaWebsite } from '../services/metaAuditService.js';
import {
  archiveGeoAuditRequest,
  archiveSeoAuditRequest,
  archiveBrokenLinkAuditRequest,
  archiveWebsiteTesterRequest,
  getWebsiteTesterConfig
} from '../models/websiteTesterAdminModel.js';
import {
  confirmWebsiteTesterLeadToken,
  requestWebsiteTesterLead
} from '../services/websiteTesterLeadService.js';
import {
  confirmGeoTesterLeadToken,
  requestGeoTesterLead
} from '../services/geoTesterLeadService.js';
import {
  confirmSeoTesterLeadToken,
  requestSeoTesterLead
} from '../services/seoTesterLeadService.js';
import {
  confirmMetaTesterLeadToken,
  requestMetaTesterLead
} from '../services/metaTesterLeadService.js';
import {
  confirmBrokenLinkTesterLeadToken,
  requestBrokenLinkTesterLead
} from '../services/brokenLinkTesterLeadService.js';
import { t as tError } from '../util/testerI18n.js';

const PAGE_I18N = {
  de: {
    title: 'Website testen kostenlos: Ist meine Website noch aktuell? | Website-Tester',
    description: 'Kostenloser Website-Tester für SEO, GEO, Technik & Vertrauen. Prüfe sofort: Ist meine Website noch aktuell, sichtbar und update-reif?',
    keywords: 'website testen, website tester kostenlos, website kostenlos testen, ist meine website noch aktuell, muss ich meine website updaten, seo check website, geo check website',
    ogTitle: 'Website testen kostenlos | Ist meine Website noch aktuell?',
    ogDescription: 'Starte den kostenlosen Website-Check für SEO, GEO, Technik, Vertrauen und Conversion in wenigen Sekunden.',
    schemaDescription: 'Kostenloser Website-Check für SEO, GEO, Technik, Barrierefreiheit, Vertrauen und Conversion-Signale.',
    pagePath: '/website-tester',
    altPath: '/en/website-tester',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'Website testen kostenlos – Website-Tester',
    breadcrumb: ['Startseite', 'Website-Tester'],
    faq: [
      {
        q: 'Wie kann ich meine Website kostenlos testen?',
        a: 'Mit dem Website-Tester gibst du deine URL ein und bekommst direkt einen Score für SEO, GEO, Technik, Barrierefreiheit und Vertrauen.'
      },
      {
        q: 'Ist meine Website noch aktuell?',
        a: 'Der Tester prüft Modernität, Ladezeit, Struktur, Meta-Daten, technische Signale und zeigt konkrete Hinweise, ob ein Update sinnvoll ist.'
      },
      {
        q: 'Muss ich meine Website updaten?',
        a: 'Wenn wichtige Signale wie Title, Description, Performance, mobile Nutzbarkeit oder Vertrauensfaktoren fehlen, solltest du priorisiert updaten.'
      },
      {
        q: 'Was bedeutet der Gesamt-Score?',
        a: 'Der Gesamt-Score (0–100) gewichtet SEO, GEO, Technik, UX, Vertrauen und Conversion. Werte ab 75 sind gut, 45–74 sind ausbaufähig, unter 45 sind kritisch.'
      },
      {
        q: 'Wie lange dauert der Test?',
        a: 'In der Regel zwischen 15 und 45 Sekunden. Bei großen Websites mit vielen Unterseiten kann der Scan bis zu einer Minute dauern.'
      },
      {
        q: 'Werden meine Daten gespeichert?',
        a: 'Wir speichern nur anonyme Audit-Daten für bis zu 14 Tage zur Qualitätssicherung. Persönliche Daten erfassen wir nur, wenn du aktiv den Report anforderst.'
      },
      {
        q: 'Kann ich den Report weiterverwenden?',
        a: 'Ja. Nach der Double-Opt-in-Bestätigung erhältst du den PDF-Report per E-Mail – inklusive klarer Prioritäten und Umsetzungsempfehlungen.'
      },
      {
        q: 'Funktioniert der Tester auch für Landingpages?',
        a: 'Ja. Der Tester analysiert jede öffentlich erreichbare URL inklusive Einzelseiten, Landingpages und Shop-Produktseiten.'
      },
      {
        q: 'Was kostet das Erstgespräch?',
        a: 'Das 30-Minuten-Erstgespräch ist kostenlos und unverbindlich. Ziel ist, gemeinsam zu klären, ob und wie wir dir am besten helfen können.'
      }
    ]
  },
  en: {
    title: 'Free Website Tester: Is my website outdated? | SEO & GEO Website Check',
    description: 'Run a free website test for SEO, GEO, technical quality, and trust signals. Find out if your website is outdated and needs an update.',
    keywords: 'free website tester, website test free, is my website outdated, does my website need an update, website seo check, geo website check, free website audit',
    ogTitle: 'Free Website Tester | Is my website outdated?',
    ogDescription: 'Run a free website check for SEO, GEO, technical quality, trust, and conversion readiness in seconds.',
    schemaDescription: 'Free website check for SEO, GEO, technical quality, accessibility, trust, and conversion signals.',
    pagePath: '/en/website-tester',
    altPath: '/website-tester',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'Free Website Tester – SEO & GEO Website Check',
    breadcrumb: ['Home', 'Website Tester'],
    faq: [
      {
        q: 'How can I test my website for free?',
        a: 'Enter your URL in the Website Tester and get an instant score for SEO, GEO, technical quality, accessibility, and trust signals.'
      },
      {
        q: 'Is my website outdated?',
        a: 'The tester checks structure, metadata, speed, modernity, and quality signals to show whether your website is still up to date.'
      },
      {
        q: 'Does my website need an update?',
        a: 'If key factors like titles, descriptions, performance, mobile UX, or trust elements are weak, an update should be prioritized.'
      },
      {
        q: 'What does the overall score mean?',
        a: 'The 0–100 score aggregates SEO, GEO, technical quality, UX, trust, and conversion signals. 75+ is strong, 45–74 has room to grow, below 45 is critical.'
      },
      {
        q: 'How long does the test take?',
        a: 'Usually between 15 and 45 seconds. Large sites with many subpages may take up to a minute for the full scan.'
      },
      {
        q: 'Is my data stored?',
        a: 'Anonymous audit data is kept for up to 14 days for quality assurance. Personal data is only stored if you actively request the report.'
      },
      {
        q: 'Can I reuse the report?',
        a: 'Yes. After double opt-in, you will receive the PDF report by email including clear priorities and implementation recommendations.'
      },
      {
        q: 'Does the tester work for landing pages?',
        a: 'Yes. The tester works on any publicly reachable URL including individual landing pages and product pages.'
      },
      {
        q: 'What does the first consultation cost?',
        a: 'The 30-minute introductory consultation is free and non-binding. Its goal is to clarify together how we can help best.'
      }
    ]
  }
};

const BROKEN_LINK_PAGE_I18N = {
  de: {
    title: 'Broken Links Tester kostenlos: Defekte Links finden & SEO verbessern',
    description: 'Kostenloser Broken-Links-Tester für interne und externe Links. Finde 404-Fehler, behebe Link-Probleme und verbessere Sichtbarkeit in Google.',
    keywords: 'broken links tester, defekte links finden, website link checker, tote links website, 404 links prüfen, seo links check, website tester links',
    ogTitle: 'Broken Links Tester kostenlos',
    ogDescription: 'Scanne deine Website auf defekte interne und externe Links und verbessere dein SEO-Potenzial.',
    schemaDescription: 'Kostenloser Website-Broken-Link-Scan für interne und externe Links mit Fokus auf SEO und Nutzerführung.',
    pagePath: '/website-tester/broken-links',
    altPath: '/en/website-tester/broken-links',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'Broken Links Tester – Website Link-Scan',
    breadcrumb: ['Startseite', 'Broken Links Tester'],
    faq: [
      {
        q: 'Wie finde ich defekte Links auf meiner Website?',
        a: 'Mit dem Broken-Links-Tester gibst du deine URL ein und erhältst sofort eine Liste fehlerhafter interner und externer Links.'
      },
      {
        q: 'Warum sind fehlerhafte Links schlecht für SEO?',
        a: 'Defekte Links verschlechtern Nutzererfahrung und Crawl-Signale. Das kann Rankings und Conversion beeinträchtigen.'
      },
      {
        q: 'Was sollte ich zuerst nach dem Scan tun?',
        a: 'Priorisiere Seiten mit vielen Broken Links, ersetze tote Ziele, entferne irrelevante Verweise und setze saubere Weiterleitungen.'
      },
      {
        q: 'Wie tief crawlt der Broken-Links-Tester?',
        a: 'Der Scanner folgt internen Links innerhalb der Domain bis zu einer definierten Tiefe und prüft jede externe Referenz einmal auf HTTP-Status.'
      },
      {
        q: 'Welche HTTP-Statuscodes werden als Fehler gewertet?',
        a: '4xx-Codes (z. B. 404, 410) gelten als defekt, 5xx-Codes als Serverfehler. 3xx-Weiterleitungen werden als Warnung markiert, wenn sie Ketten bilden.'
      },
      {
        q: 'Wie oft sollte ich defekte Links prüfen?',
        a: 'Für aktive Websites empfiehlt sich eine monatliche Prüfung. Nach größeren Content-Änderungen oder Migrationen zusätzlich ad-hoc.'
      },
      {
        q: 'Schadet jeder Broken Link meinem SEO?',
        a: 'Vor allem interne Broken Links und Links auf wichtigen Seiten wirken negativ. Einzelne tote externe Links auf Nischenseiten sind weniger kritisch.'
      },
      {
        q: 'Werden 301-Weiterleitungen erkannt?',
        a: 'Ja. Kurze 301-Weiterleitungen werden als OK gewertet. Lange Weiterleitungsketten werden als Warnung markiert und sollten verkürzt werden.'
      },
      {
        q: 'Bekomme ich den Report als Datei?',
        a: 'Ja. Nach Newsletter-Bestätigung erhältst du einen PDF-Report mit priorisierter Link-Liste, Quellseiten und Empfehlungen zur Behebung.'
      }
    ]
  },
  en: {
    title: 'Free Broken Links Tester: Find broken links and improve SEO',
    description: 'Run a free broken-links scan for your website, detect 404 issues, and improve search visibility and user experience.',
    keywords: 'broken links tester, website link checker, find broken links, dead links scan, free link audit, seo link check',
    ogTitle: 'Free Broken Links Tester',
    ogDescription: 'Scan your website for broken internal and external links and improve SEO signals.',
    schemaDescription: 'Free website broken-link scan for internal and external links with SEO-focused insights.',
    pagePath: '/en/website-tester/broken-links',
    altPath: '/website-tester/broken-links',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'Broken Links Tester – Website Link Scan',
    breadcrumb: ['Home', 'Broken Links Tester'],
    faq: [
      {
        q: 'How can I find broken links on my website?',
        a: 'Enter your domain in the Broken Links Tester and get an instant list of broken internal and external links.'
      },
      {
        q: 'Do broken links affect SEO?',
        a: 'Yes. Broken links hurt crawl quality and user experience, which can reduce rankings and conversion performance.'
      },
      {
        q: 'What should I fix first after the scan?',
        a: 'Start with high-traffic pages, remove dead targets, replace broken references, and add clean redirects where needed.'
      },
      {
        q: 'How deep does the Broken Links Tester crawl?',
        a: 'It follows internal links within the domain up to a defined depth and checks every external reference once via HTTP status.'
      },
      {
        q: 'Which HTTP status codes are treated as errors?',
        a: '4xx codes (e.g. 404, 410) are treated as broken, 5xx as server errors. 3xx redirects are flagged as warnings when they form chains.'
      },
      {
        q: 'How often should I check for broken links?',
        a: 'Monthly is a good cadence for active sites. After major content changes or migrations, also run an ad-hoc check.'
      },
      {
        q: 'Does every broken link hurt my SEO?',
        a: 'Internal broken links and links on important pages matter most. Isolated dead external links on niche pages are less critical.'
      },
      {
        q: 'Are 301 redirects detected?',
        a: 'Yes. Short 301 redirects pass as OK, while long redirect chains are flagged as warnings and should be shortened.'
      },
      {
        q: 'Do I get the report as a file?',
        a: 'Yes. After newsletter confirmation you receive a PDF report with a prioritized link list, source pages, and fix recommendations.'
      }
    ]
  }
};

const GEO_PAGE_I18N = {
  de: {
    title: 'GEO Tester kostenlos: Generative Suchsichtbarkeit prüfen & verbessern',
    description: 'Kostenloser GEO-Tester für deine Website. Prüfe Unterseiten auf GEO-Signale, erkenne Potenzial und erhalte den detaillierten Umsetzungsreport per Newsletter-Double-Opt-in.',
    keywords: 'geo tester, generative engine optimization, geo analyse website, ai suchmaschinen optimierung, llm sichtbarkeit website, geo check',
    ogTitle: 'GEO Tester kostenlos',
    ogDescription: 'Teste deine Website auf GEO-Readiness, erkenne Optimierungspotenziale und erhalte einen detaillierten GEO-Report per E-Mail.',
    schemaDescription: 'Kostenloser GEO-Check für Websites mit Fokus auf AI-/LLM-Sichtbarkeit, semantische Signale und Optimierungspotenziale.',
    pagePath: '/website-tester/geo',
    altPath: '/en/website-tester/geo',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'GEO Tester – Generative Suchsichtbarkeit prüfen',
    breadcrumb: ['Startseite', 'GEO Tester'],
    faq: [
      {
        q: 'Was prüft der GEO-Tester?',
        a: 'Der GEO-Tester analysiert unter anderem Entity-/Schema-Signale, Intent-Kohärenz, FAQ-/Snippet-Readiness und GEO-Relevanz über Unterseiten.'
      },
      {
        q: 'Warum sehe ich nicht sofort alle Detailmaßnahmen?',
        a: 'Die konkrete Schritt-für-Schritt-Anleitung wird nach Newsletter-Double-Opt-in per E-Mail versendet.'
      },
      {
        q: 'Ist das Ergebnis nur für Google sinnvoll?',
        a: 'Nein, die Signale helfen sowohl klassischer Suche als auch generativen Suchoberflächen und KI-Antwortsystemen.'
      },
      {
        q: 'Was ist GEO (Generative Engine Optimization)?',
        a: 'GEO ist die Optimierung für generative Suche und KI-Antworten (ChatGPT, Gemini, Perplexity, Google AI Overviews). Ziel ist, als Quelle zitiert und in AI-Antworten eingebunden zu werden.'
      },
      {
        q: 'Unterscheidet sich GEO grundsätzlich von klassischem SEO?',
        a: 'GEO baut auf klassischem SEO auf, legt aber zusätzlich Gewicht auf semantische Klarheit, Entity-Konsistenz, Fakten-Belegbarkeit und strukturierte Kontextsignale.'
      },
      {
        q: 'Welche Rolle spielen llms.txt und ai.txt?',
        a: 'Diese Dateien steuern, wie KI-Crawler deine Inhalte verarbeiten dürfen. Der GEO-Tester prüft, ob passende Direktiven vorhanden und konsistent sind.'
      },
      {
        q: 'Brauche ich JSON-LD auf jeder Seite?',
        a: 'Nicht auf jeder, aber auf Seiten mit klarer Intent-Zuordnung: Home (Organization), Services (Service), Artikel (Article), FAQ-Bereiche (FAQPage). Mehr hilft bei Disambiguierung.'
      },
      {
        q: 'Wie messe ich, ob GEO wirkt?',
        a: 'Typische Signale: Zitations-Erwähnungen in AI-Antworten, Referral-Traffic aus AI-Oberflächen, Impressionen in SGE/AI-Overviews, Brand-Suchvolumen nach Sichtbarkeits-Kampagnen.'
      },
      {
        q: 'Wie lange dauert ein GEO-Effekt?',
        a: 'Technische Fixes (Schema, Meta) wirken innerhalb weniger Tage bis Wochen. Inhaltliche/autoritäre Signale brauchen meist 6-12 Wochen, um in AI-Antworten durchzuschlagen.'
      }
    ]
  },
  en: {
    title: 'Free GEO Tester: Check and improve generative search visibility',
    description: 'Run a free GEO website audit across subpages, discover optimization potential, and receive the detailed implementation report via newsletter double opt-in.',
    keywords: 'geo tester, generative engine optimization, geo website audit, llm visibility checker, ai search optimization',
    ogTitle: 'Free GEO Tester',
    ogDescription: 'Scan your website for GEO readiness, identify optimization potential, and get a detailed GEO report by email.',
    schemaDescription: 'Free GEO website audit focused on AI/LLM visibility signals, semantic structure, and optimization potential.',
    pagePath: '/en/website-tester/geo',
    altPath: '/website-tester/geo',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'GEO Tester – Generative Search Visibility Audit',
    breadcrumb: ['Home', 'GEO Tester'],
    faq: [
      {
        q: 'What does the GEO tester analyze?',
        a: 'The GEO tester checks entity/schema signals, intent coherence, FAQ/snippet readiness, and GEO relevance across subpages.'
      },
      {
        q: 'Why are detailed implementation steps locked?',
        a: 'Detailed step-by-step instructions are delivered by email after newsletter double opt-in confirmation.'
      },
      {
        q: 'Is GEO relevant only for Google?',
        a: 'No. These signals support both classic search and generative search/AI answer interfaces.'
      },
      {
        q: 'What is GEO (Generative Engine Optimization)?',
        a: 'GEO is optimization for generative search and AI answers (ChatGPT, Gemini, Perplexity, Google AI Overviews). The goal is to be cited as a source in AI responses.'
      },
      {
        q: 'Is GEO fundamentally different from classic SEO?',
        a: 'GEO builds on classic SEO but adds emphasis on semantic clarity, entity consistency, factual verifiability, and structured context signals.'
      },
      {
        q: 'What role do llms.txt and ai.txt play?',
        a: 'These files control how AI crawlers may process your content. The GEO tester checks whether suitable directives are present and consistent.'
      },
      {
        q: 'Do I need JSON-LD on every page?',
        a: 'Not on every page, but on intent-clear pages: Home (Organization), Services (Service), Articles (Article), FAQ sections (FAQPage). More helps with disambiguation.'
      },
      {
        q: 'How do I measure GEO impact?',
        a: 'Typical signals: citation mentions in AI answers, referral traffic from AI interfaces, impressions in SGE/AI Overviews, and brand search volume after visibility campaigns.'
      },
      {
        q: 'How long does GEO take to show results?',
        a: 'Technical fixes (schema, metadata) show results within days to weeks. Content and authority signals typically take 6–12 weeks to propagate through AI answers.'
      }
    ]
  }
};

const SEO_PAGE_I18N = {
  de: {
    title: 'SEO Tester kostenlos: Website auf SEO-Kriterien prüfen',
    description: 'Kostenloser SEO-Tester für deine Website mit Unterseiten-Scan. Erhalte SEO-Score, Potenzial und den detaillierten Maßnahmenreport per Newsletter-Double-Opt-in.',
    keywords: 'seo tester, website seo testen, seo check website, suchmaschinenoptimierung website prüfen, seo analyse kostenlos',
    ogTitle: 'SEO Tester kostenlos',
    ogDescription: 'Prüfe deine Website auf wichtige SEO- und Technik-Kriterien und erhalte einen detaillierten SEO-Report per E-Mail.',
    schemaDescription: 'Kostenloser SEO-Website-Check für OnPage-, Indexierungs-, Technik-, Content- und Struktur-Signale.',
    pagePath: '/website-tester/seo',
    altPath: '/en/website-tester/seo',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'SEO Tester – Website auf SEO-Kriterien prüfen',
    breadcrumb: ['Startseite', 'SEO Tester'],
    faq: [
      {
        q: 'Was prüft der SEO-Tester?',
        a: 'Der SEO-Tester analysiert OnPage-Signale, Indexierung, Technik, Content-Qualität, interne Verlinkung und strukturierte Daten.'
      },
      {
        q: 'Warum sehe ich Detailmaßnahmen erst nach E-Mail-Bestätigung?',
        a: 'Der öffentliche Bereich zeigt bewusst nur Summary und Potenzial. Der vollständige Umsetzungsreport wird nach Newsletter-Double-Opt-in per E-Mail versendet.'
      },
      {
        q: 'Ist der SEO-Check auch für KI-Suche relevant?',
        a: 'Ja. Die geprüften Signale verbessern sowohl klassische Suchergebnisse als auch AI-retrieval-getriebene Auffindbarkeit.'
      },
      {
        q: 'Welche OnPage-Signale sind am wichtigsten?',
        a: 'Title, Meta-Description, saubere H1-Hierarchie, interne Verlinkung, Canonical-URL, Bild-Alt-Texte und thematisch klare URLs. Diese Basis wirkt überdurchschnittlich stark auf Rankings.'
      },
      {
        q: 'Wie viele Unterseiten werden analysiert?',
        a: 'Der öffentliche Scan analysiert die Startseite plus bis zu 25 Unterseiten. Der Voll-Report nach Bestätigung kann auf Wunsch bis zu 250 Seiten tief gehen.'
      },
      {
        q: 'Was ist Core Web Vitals und warum prüft ihr es?',
        a: 'Core Web Vitals (LCP, INP, CLS) sind Performance- und UX-Metriken von Google. Schwache Werte schaden Rankings insbesondere auf Mobile und werden im Report priorisiert.'
      },
      {
        q: 'Wie wichtig sind strukturierte Daten (Schema.org)?',
        a: 'Strukturierte Daten helfen Google und KI-Systemen, Inhalte korrekt einzuordnen. Für Unternehmensseiten sind Organization, LocalBusiness, Service und FAQPage besonders wirksam.'
      },
      {
        q: 'Lohnt sich SEO noch in 2026?',
        a: 'Ja. Auch mit KI-Antworten bleibt organische Suche ein zentraler Traffic-Kanal. Zusätzlich werden SEO-starke Seiten überdurchschnittlich häufig als Quelle in AI-Overviews zitiert.'
      },
      {
        q: 'Wie lange dauert es, bis SEO-Maßnahmen wirken?',
        a: 'Technische Fixes wirken oft innerhalb 2-4 Wochen. Content- und Autoritätsmaßnahmen typischerweise 3-6 Monate, bis sie stabil in Rankings und Traffic sichtbar sind.'
      }
    ]
  },
  en: {
    title: 'Free SEO Tester: Audit your website SEO criteria',
    description: 'Run a free SEO audit across your website and subpages. Get SEO score, optimization potential, and a detailed action report via newsletter double opt-in.',
    keywords: 'seo tester, seo website audit, free seo check website, technical seo checker, onpage seo analysis',
    ogTitle: 'Free SEO Tester',
    ogDescription: 'Audit your website for key SEO and technical signals and receive a detailed SEO report by email.',
    schemaDescription: 'Free SEO website audit for on-page, indexing, technical, content, and structured data signals.',
    pagePath: '/en/website-tester/seo',
    altPath: '/website-tester/seo',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'SEO Tester – Website SEO Criteria Audit',
    breadcrumb: ['Home', 'SEO Tester'],
    faq: [
      {
        q: 'What does the SEO tester analyze?',
        a: 'The SEO tester checks on-page signals, indexing, technical quality, content quality, internal linking, and structured data.'
      },
      {
        q: 'Why are detailed actions locked before email confirmation?',
        a: 'Public results intentionally show summary and potential only. The full implementation report is sent after newsletter double opt-in confirmation.'
      },
      {
        q: 'Is this useful for AI-driven search discovery too?',
        a: 'Yes. The audited signals support both classic search rankings and AI-retrieval-driven discoverability.'
      },
      {
        q: 'Which on-page signals matter most?',
        a: 'Title, meta description, clean H1 hierarchy, internal linking, canonical URL, image alt text, and topic-clear URLs. These fundamentals have outsized ranking impact.'
      },
      {
        q: 'How many subpages are analyzed?',
        a: 'The public scan covers the homepage plus up to 25 subpages. The full post-confirmation report can go up to 250 pages deep on request.'
      },
      {
        q: 'What are Core Web Vitals and why do you test them?',
        a: 'Core Web Vitals (LCP, INP, CLS) are Google performance/UX metrics. Weak values hurt rankings especially on mobile and are prioritized in the report.'
      },
      {
        q: 'How important is structured data (Schema.org)?',
        a: 'Structured data helps Google and AI systems classify content correctly. For business sites, Organization, LocalBusiness, Service, and FAQPage are especially effective.'
      },
      {
        q: 'Is SEO still worth it in 2026?',
        a: 'Yes. Even with AI answers, organic search remains a core traffic channel. SEO-strong pages are also cited more often as sources in AI Overviews.'
      },
      {
        q: 'How long until SEO efforts show results?',
        a: 'Technical fixes often pay off within 2–4 weeks. Content and authority work typically takes 3–6 months to appear stably in rankings and traffic.'
      }
    ]
  }
};

const META_PAGE_I18N = {
  de: {
    title: 'Meta Tester kostenlos: Header, Title, Description, OG & Icons prüfen',
    description: 'Header-Meta-Tester für Website-Probleme: Prüfe Title, Description, H1, Open Graph, Twitter Cards, Canonical, Icons & weitere Head-Tags.',
    keywords: 'meta tester, header meta test, website meta checker, meta tags prüfen, title description prüfen, finde probleme auf meiner website, website tester, website head prüfen, og tags testen, twitter cards testen, favicon prüfen',
    ogTitle: 'Meta Tester kostenlos: Header und Meta-Tags prüfen',
    ogDescription: 'Teste alle wichtigen Head-Signale deiner Website: Title, Description, H1, Canonical, Social Tags, Icons und Strukturdaten.',
    schemaDescription: 'Kostenloser Header-Meta-Tester mit Branchen- und Regions-Fit-Check für Title, Description, H1, Canonical, Open Graph, Twitter Cards, Icons und Head-Assets.',
    pagePath: '/website-tester/meta',
    altPath: '/en/website-tester/meta',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'Meta Tester – Header Meta Daten prüfen',
    breadcrumb: ['Startseite', 'Meta Tester'],
    faq: [
      {
        q: 'Was prüft der Meta-Tester genau?',
        a: 'Der Meta-Tester analysiert alle zentralen Head-Signale: Title, Meta-Description, H1, Canonical, Robots, OG-Tags, Twitter Cards, Icons, Manifest, Viewport und strukturierte Daten.'
      },
      {
        q: 'Welche Längen gelten für Title, Description und H1?',
        a: 'Für starke SERP-Snippets sollten Title-Tags ideal bei 55-60 Zeichen (max. ca. 600px), Descriptions bei 120-155 Zeichen und H1-Überschriften prägnant unter 80 Zeichen liegen.'
      },
      {
        q: 'Warum sehe ich öffentlich nur die Startseite im Detail?',
        a: 'Die Oberfläche zeigt bewusst die vollständige Startseitenanalyse. Erweiterte Unterseiten-Optimierung wird nach Opt-in als Kurzreport und anschließend als Vollanleitung separat bereitgestellt.'
      },
      {
        q: 'Was ist der Unterschied zwischen OG-Tags und Twitter Cards?',
        a: 'Open-Graph-Tags (og:title, og:image etc.) steuern Link-Vorschauen auf Facebook, LinkedIn und WhatsApp. Twitter-Cards steuern die Darstellung auf X/Twitter. Beide sollten vorhanden und konsistent sein.'
      },
      {
        q: 'Welche Favicon- und Icon-Formate sind 2026 Pflicht?',
        a: 'Empfohlen: favicon.ico (32x32), apple-touch-icon.png (180x180), SVG-Favicon für scharfe Darstellung, manifest.json mit PWA-Icons und Theme-Color-Meta für mobile Browser-UI.'
      },
      {
        q: 'Warum ist der Canonical-Tag so wichtig?',
        a: 'Der Canonical-Tag signalisiert Google die Haupt-URL einer Seite und verhindert Duplicate-Content-Probleme bei Query-Parametern, Tracking-IDs oder URL-Varianten.'
      },
      {
        q: 'Was passiert, wenn mein Robots-Meta "noindex" ist?',
        a: 'Die Seite wird nicht in den Google-Index aufgenommen. Das kann für interne Bereiche gewollt sein, auf Marketing-Seiten ist es jedoch ein kritischer Fehler, der oft zu Traffic-Totalausfall führt.'
      },
      {
        q: 'Brauche ich ein Web-App-Manifest, wenn ich keine PWA bin?',
        a: 'Das Manifest ist nicht verpflichtend, aber ein minimaler manifest.json mit Name, Icons und Theme-Color verbessert die mobile UX beim "Zum Startbildschirm hinzufügen".'
      },
      {
        q: 'Wie häufig sollten Meta-Daten überprüft werden?',
        a: 'Bei jedem größeren Release und vor SEO-Relaunches. Ein monatlicher Kurz-Check deckt typische Regressionen wie fehlende Canonicals oder geändertes Robots-Meta auf.'
      }
    ]
  },
  en: {
    title: 'Free Meta Tester: Check Header Tags, Title, Description, OG & Icons',
    description: 'Website header meta checker to find problems on your website: title, meta description, H1, canonical, Open Graph, Twitter cards, icons, and head tags.',
    keywords: 'free meta tester, website header checker, meta tag checker, title description checker, find problems on my website, website tester, open graph checker, twitter card checker, favicon checker',
    ogTitle: 'Free Meta Tester: Website Header Metadata Audit',
    ogDescription: 'Check complete website head metadata including title, description, H1, social tags, icons, and technical head signals.',
    schemaDescription: 'Free header metadata tester with industry/region relevance checks for title, description, H1, canonical, Open Graph, Twitter cards, icons, and technical head assets.',
    pagePath: '/en/website-tester/meta',
    altPath: '/website-tester/meta',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'Meta Tester – Header Metadata Audit',
    breadcrumb: ['Home', 'Meta Tester'],
    faq: [
      {
        q: 'What does the Meta Tester audit?',
        a: 'It audits all key head signals: title, meta description, H1, canonical, robots, Open Graph, Twitter cards, icons, manifest, viewport, and structured data.'
      },
      {
        q: 'What lengths should I target for title, description, and H1?',
        a: 'For better SERP visibility, keep titles around 55-60 chars (max around 600px), descriptions around 120-155 chars, and H1 headings concise below 80 chars.'
      },
      {
        q: 'Why do I only see full homepage details in the on-page result?',
        a: 'Public output focuses on a full homepage audit. Extended subpage optimization is delivered after opt-in as a short report and can be expanded with a separate full guide.'
      },
      {
        q: 'What is the difference between OG tags and Twitter Cards?',
        a: 'Open Graph tags (og:title, og:image, etc.) drive link previews on Facebook, LinkedIn, and WhatsApp. Twitter Cards drive rendering on X/Twitter. Both should be present and consistent.'
      },
      {
        q: 'Which favicon and icon formats are required in 2026?',
        a: 'Recommended: favicon.ico (32x32), apple-touch-icon.png (180x180), an SVG favicon for crisp rendering, manifest.json with PWA icons, and a theme-color meta for mobile browser UI.'
      },
      {
        q: 'Why is the canonical tag so important?',
        a: 'The canonical tag tells Google which URL is the primary version of a page and prevents duplicate content issues from query params, tracking IDs, or URL variants.'
      },
      {
        q: 'What happens if my robots meta is set to "noindex"?',
        a: 'The page is removed from the Google index. That can be intentional for internal areas, but on marketing pages it is a critical mistake that often causes total traffic loss.'
      },
      {
        q: 'Do I need a web app manifest if I am not a PWA?',
        a: 'A manifest is not required, but a minimal manifest.json with name, icons, and theme-color improves mobile UX when users add the site to their home screen.'
      },
      {
        q: 'How often should I verify my meta data?',
        a: 'After every major release and before SEO relaunches. A monthly quick check catches regressions such as missing canonicals or altered robots meta.'
      }
    ]
  }
};

function localeFromRequest(req) {
  return req.params?.lng === 'en' ? 'en' : 'de';
}

function jsonLd(scriptObject) {
  return `<script type="application/ld+json">${JSON.stringify(scriptObject)}</script>`;
}

/**
 * Builds the full SEO/OG/Twitter/JSON-LD head extra block for any tester page.
 *
 * Consolidates what used to be five near-identical helpers (website / broken-links
 * / geo / seo / meta). Per-tester differences are encoded via the `options` arg:
 *
 * @param {string} base       - canonical origin, e.g. "https://komplettwebdesign.de"
 * @param {string} canonical  - full canonical URL for this page
 * @param {object} copy       - i18n copy bundle (must include breadcrumb[], faq[],
 *                              altPath, localeCode, inLanguage, pageName,
 *                              schemaDescription, ogTitle, ogDescription)
 * @param {'de'|'en'} locale
 * @param {object} options
 * @param {string} options.appName        - WebApplication schema name
 * @param {string} options.xDefaultPath   - path used for hreflang="x-default"
 * @param {boolean} [options.includeSearchAction]   - attach SearchAction to WebSite
 * @param {boolean} [options.includePrimaryImage]   - attach primaryImageOfPage +
 *                                                     embed breadcrumb in WebPage
 */
function buildTesterSeoExtra(base, canonical, copy, locale, options) {
  const {
    appName,
    xDefaultPath,
    includeSearchAction = false,
    includePrimaryImage = false
  } = options || {};

  const alternateUrl = `${base}${copy.altPath}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: copy.breadcrumb[0],
        item: base
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.breadcrumb[1],
        item: canonical
      }
    ]
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Komplett Webdesign',
    url: base,
    inLanguage: copy.inLanguage
  };
  if (includeSearchAction) {
    websiteSchema.potentialAction = {
      '@type': 'SearchAction',
      target: `${base}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    };
  }

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.pageName,
    description: copy.schemaDescription,
    url: canonical,
    inLanguage: copy.inLanguage,
    isPartOf: {
      '@type': 'WebSite',
      url: base,
      name: 'Komplett Webdesign'
    }
  };
  if (includePrimaryImage) {
    webPageSchema.breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbSchema.itemListElement
    };
    webPageSchema.primaryImageOfPage = `${base}/images/heroBg.webp`;
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: appName,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: copy.inLanguage,
    url: canonical,
    description: copy.schemaDescription,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR'
    }
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (copy.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  return `
    <link rel="alternate" hreflang="${copy.localeCode}" href="${canonical}">
    <link rel="alternate" hreflang="${locale === 'en' ? 'de-DE' : 'en-US'}" href="${alternateUrl}">
    <link rel="alternate" hreflang="x-default" href="${base}${xDefaultPath}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="${copy.localeCode}">
    <meta property="og:title" content="${copy.ogTitle}">
    <meta property="og:description" content="${copy.ogDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${base}/images/heroBg.webp">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${copy.ogTitle}">
    <meta name="twitter:description" content="${copy.ogDescription}">
    ${jsonLd(websiteSchema)}
    ${jsonLd(webPageSchema)}
    ${jsonLd(appSchema)}
    ${jsonLd(breadcrumbSchema)}
    ${jsonLd(faqSchema)}
  `;
}

// Per-tester config consumed by the render handlers below. Kept adjacent to the
// factory so the relationship between tester type and schema output is obvious.
const TESTER_SEO_CONFIG = {
  website: {
    appName: 'Komplett Webdesign Website Tester',
    xDefaultPath: '/website-tester',
    includeSearchAction: true,
    includePrimaryImage: true
  },
  brokenLinks: {
    appName: 'Komplett Webdesign Broken Links Tester',
    xDefaultPath: '/website-tester/broken-links'
  },
  geo: {
    appName: 'Komplett Webdesign GEO Tester',
    xDefaultPath: '/website-tester/geo'
  },
  seo: {
    appName: 'Komplett Webdesign SEO Tester',
    xDefaultPath: '/website-tester/seo'
  },
  meta: {
    appName: 'Komplett Webdesign Meta Tester',
    xDefaultPath: '/website-tester/meta'
  }
};

function extractClientIp(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return (forwarded || req.ip || req.connection?.remoteAddress || '').slice(0, 120);
}

function combinedTesterConsentText(locale = 'de') {
  const lng = locale === 'en' ? 'en' : 'de';
  return lng === 'en'
    ? 'I agree to receive the requested report by email, subscribe to the newsletter, and I have read the privacy policy.'
    : 'Ich stimme zu, den angeforderten Report per E-Mail zu erhalten, den Newsletter zu abonnieren und habe die Datenschutzerklärung zur Kenntnis genommen.';
}

function compactResultForArchive(result) {
  return {
    auditId: result.auditId,
    locale: result.locale,
    mode: result.mode,
    context: result.context,
    finalUrl: result.finalUrl,
    overallScore: result.overallScore,
    scoreBand: result.scoreBand,
    scoring: result.scoring,
    relevance: result.relevance,
    legalRisk: result.legalRisk,
    crawlStats: result.crawlStats,
    scannedPages: (result.scannedPages || []).slice(0, 12),
    failedScanTargets: (result.failedScanTargets || []).slice(0, 12),
    topActions: (result.topActions || []).slice(0, 6),
    categories: (result.categories || []).map((item) => ({
      id: item.id,
      score: item.score,
      tone: item.tone,
      badge: item.badge
    })),
    fetchedAt: result.fetchedAt
  };
}

export async function testPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('test', {
    lng: locale,
    testerLocale: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    faq: copy.faq || [],
    seoExtra: buildTesterSeoExtra(base, canonical, copy, locale, TESTER_SEO_CONFIG.website)
  });
}

export async function brokenLinksTestPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = BROKEN_LINK_PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('broken_links_tester', {
    lng: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    faq: copy.faq || [],
    seoExtra: buildTesterSeoExtra(base, canonical, copy, locale, TESTER_SEO_CONFIG.brokenLinks)
  });
}

export async function geoTestPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = GEO_PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('geo_tester', {
    lng: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    faq: copy.faq || [],
    seoExtra: buildTesterSeoExtra(base, canonical, copy, locale, TESTER_SEO_CONFIG.geo)
  });
}

export async function seoTestPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = SEO_PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('seo_tester', {
    lng: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    faq: copy.faq || [],
    seoExtra: buildTesterSeoExtra(base, canonical, copy, locale, TESTER_SEO_CONFIG.seo)
  });
}

export async function metaTestPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = META_PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('meta_tester', {
    lng: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    faq: copy.faq || [],
    seoExtra: buildTesterSeoExtra(base, canonical, copy, locale, TESTER_SEO_CONFIG.meta)
  });
}

export async function runWebsiteAudit(req, res) {
  const { url, locale, mode, context } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeMode = mode === 'deep' ? 'deep' : 'deep';
  const safeContext = {
    businessType: String(context?.businessType || '').trim(),
    primaryService: String(context?.primaryService || '').trim(),
    targetRegion: String(context?.targetRegion || '').trim()
  };
  const sourceIp = extractClientIp(req);

  let config = { maxSubpages: 5 };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('Website-Tester-Config konnte nicht geladen werden:', error);
  }

  try {
    const result = await auditWebsite({
      url: requestedUrl,
      locale: safeLocale,
      mode: safeMode,
      maxSubpages: config.maxSubpages,
      context: safeContext
    });

    try {
      await archiveWebsiteTesterRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        mode: safeMode,
        status: 'success',
        overallScore: result.overallScore,
        scoreBand: result.scoreBand,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        httpStatus: result.httpStatus,
        loadTimeMs: result.loadTimeMs,
        sourceIp,
        topIssues: (result.topActions || []).slice(0, 3).map((item) => item.label || item.text),
        resultJson: compactResultForArchive(result)
      });
    } catch (archiveError) {
      console.error('Website-Tester-Archiv (success) fehlgeschlagen:', archiveError);
    }

    res.json({ success: true, result });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveWebsiteTesterRequest({
        requestedUrl,
        locale: safeLocale,
        mode: safeMode,
        status: 'error',
        errorMessage: error.message || 'Audit fehlgeschlagen',
        sourceIp
      });
    } catch (archiveError) {
      console.error('Website-Tester-Archiv (error) fehlgeschlagen:', archiveError);
    }

    res.status(status).json({
      success: false,
      message: error.message || tError('audit.website.failed', safeLocale)
    });
  }
}

export async function runBrokenLinkAudit(req, res) {
  const { url, locale } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const sourceIp = extractClientIp(req);

  let config = {
    brokenLinksMaxSubpages: 5,
    brokenLinksScanMode: 'maximal'
  };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('Broken-Links-Tester-Config konnte nicht geladen werden:', error);
  }

  const effectiveMaxSubpages = Number.isFinite(config?.brokenLinksMaxSubpages)
    ? config.brokenLinksMaxSubpages
    : 5;
  const effectiveScanMode = ['schnell', 'balanced', 'maximal'].includes(config?.brokenLinksScanMode)
    ? config.brokenLinksScanMode
    : 'maximal';

  try {
    const result = await auditBrokenLinks({
      url: requestedUrl,
      locale: safeLocale,
      maxSubpages: effectiveMaxSubpages,
      scanMode: effectiveScanMode
    });

    try {
      await archiveBrokenLinkAuditRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        status: 'success',
        scanMode: result.scanMode,
        maxSubpages: effectiveMaxSubpages,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        timeoutReached: !!result.crawlStats?.timeoutReached,
        partialResult: !!result.crawlStats?.partial,
        linkTotalChecked: result.linkStats?.totalChecked,
        linkBrokenCount: result.linkStats?.brokenCount,
        linkWarningCount: result.linkStats?.warningCount,
        linkOkCount: result.linkStats?.okCount,
        sourceIp,
        resultJson: result
      });
    } catch (archiveError) {
      console.error('Broken-Links-Archiv (success) fehlgeschlagen:', archiveError);
    }

    return res.json({ success: true, result: toPublicBrokenLinkResult(result) });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveBrokenLinkAuditRequest({
        requestedUrl,
        locale: safeLocale,
        status: 'error',
        errorMessage: error.message || 'Broken-Link-Audit fehlgeschlagen',
        scanMode: effectiveScanMode,
        maxSubpages: effectiveMaxSubpages,
        sourceIp
      });
    } catch (archiveError) {
      console.error('Broken-Links-Archiv (error) fehlgeschlagen:', archiveError);
    }

    return res.status(status).json({
      success: false,
      message: error.message || tError('audit.brokenLinks.failed', safeLocale)
    });
  }
}

export async function runGeoAudit(req, res) {
  const { url, locale, context } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeContext = {
    businessType: String(context?.businessType || '').trim(),
    primaryService: String(context?.primaryService || '').trim(),
    targetRegion: String(context?.targetRegion || '').trim()
  };
  const sourceIp = extractClientIp(req);

  let config = {
    geoMaxSubpages: 5,
    geoScanMode: 'maximal'
  };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('GEO-Tester-Config konnte nicht geladen werden:', error);
  }

  const effectiveMaxSubpages = Number.isFinite(config?.geoMaxSubpages)
    ? config.geoMaxSubpages
    : 5;
  const effectiveScanMode = ['schnell', 'balanced', 'maximal'].includes(config?.geoScanMode)
    ? config.geoScanMode
    : 'maximal';

  try {
    const result = await auditGeoWebsite({
      url: requestedUrl,
      locale: safeLocale,
      maxSubpages: effectiveMaxSubpages,
      scanMode: effectiveScanMode,
      context: safeContext
    });

    try {
      await archiveGeoAuditRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        status: 'success',
        scanMode: result.scanMode,
        maxSubpages: result.config?.effectiveMaxSubpages || effectiveMaxSubpages,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        timeoutReached: !!result.crawlStats?.timeoutReached,
        partialResult: !!result.crawlStats?.partial,
        geoScore: result.geoScore?.overall,
        geoBand: result.geoScore?.band,
        sourceIp,
        resultJson: result
      });
    } catch (archiveError) {
      console.error('GEO-Archiv (success) fehlgeschlagen:', archiveError);
    }

    return res.json({ success: true, result });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveGeoAuditRequest({
        requestedUrl,
        locale: safeLocale,
        status: 'error',
        errorMessage: error.message || 'GEO-Audit fehlgeschlagen',
        scanMode: effectiveScanMode,
        maxSubpages: effectiveMaxSubpages,
        sourceIp
      });
    } catch (archiveError) {
      console.error('GEO-Archiv (error) fehlgeschlagen:', archiveError);
    }

    return res.status(status).json({
      success: false,
      message: error.message || tError('audit.geo.failed', safeLocale)
    });
  }
}

export async function runSeoAudit(req, res) {
  const { url, locale, context } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeContext = {
    businessType: String(context?.businessType || '').trim(),
    primaryService: String(context?.primaryService || '').trim(),
    targetRegion: String(context?.targetRegion || '').trim()
  };
  const sourceIp = extractClientIp(req);

  let config = {
    seoMaxSubpages: 5,
    seoScanMode: 'maximal'
  };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('SEO-Tester-Config konnte nicht geladen werden:', error);
  }

  const effectiveMaxSubpages = Number.isFinite(config?.seoMaxSubpages)
    ? config.seoMaxSubpages
    : 5;
  const effectiveScanMode = ['schnell', 'balanced', 'maximal'].includes(config?.seoScanMode)
    ? config.seoScanMode
    : 'maximal';

  try {
    const result = await auditSeoWebsite({
      url: requestedUrl,
      locale: safeLocale,
      maxSubpages: effectiveMaxSubpages,
      scanMode: effectiveScanMode,
      context: safeContext
    });

    try {
      await archiveSeoAuditRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        status: 'success',
        scanMode: result.scanMode,
        maxSubpages: result.config?.effectiveMaxSubpages || effectiveMaxSubpages,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        timeoutReached: !!result.crawlStats?.timeoutReached,
        partialResult: !!result.crawlStats?.partial,
        seoScore: result.seoScore?.overall,
        seoBand: result.seoScore?.band,
        sourceIp,
        resultJson: result
      });
    } catch (archiveError) {
      console.error('SEO-Archiv (success) fehlgeschlagen:', archiveError);
    }

    return res.json({ success: true, result });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveSeoAuditRequest({
        requestedUrl,
        locale: safeLocale,
        status: 'error',
        errorMessage: error.message || 'SEO-Audit fehlgeschlagen',
        scanMode: effectiveScanMode,
        maxSubpages: effectiveMaxSubpages,
        sourceIp
      });
    } catch (archiveError) {
      console.error('SEO-Archiv (error) fehlgeschlagen:', archiveError);
    }

    return res.status(status).json({
      success: false,
      message: error.message || tError('audit.seo.failed', safeLocale)
    });
  }
}

export async function runMetaAudit(req, res) {
  const { url, locale, context } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeContext = {
    businessType: String(context?.businessType || '').trim(),
    primaryService: String(context?.primaryService || '').trim(),
    targetRegion: String(context?.targetRegion || '').trim()
  };

  try {
    const result = await auditMetaWebsite({
      url: requestedUrl,
      locale: safeLocale,
      maxSubpages: 5,
      context: safeContext
    });
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || tError('audit.meta.failed', safeLocale)
    });
  }
}

export async function getCachedWebsiteAudit(req, res) {
  const { auditId } = req.params || {};
  const result = getCachedAuditResult(auditId);
  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Audit wurde nicht gefunden oder ist abgelaufen.'
    });
  }
  return res.json({ success: true, result: toPublicAuditResult(result) });
}

export async function runWebsiteAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = combinedTesterConsentText(safeLocale);

  try {
    const response = await requestWebsiteTesterLead({
      auditId: String(auditId || '').trim(),
      email,
      name,
      locale: safeLocale,
      consent: safeConsent,
      sourceIp: extractClientIp(req),
      consentText
    });

    return res.json({
      success: true,
      verificationRequired: true,
      message: response.message
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || tError('report.request.failed', safeLocale)
    });
  }
}

export async function runGeoAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = combinedTesterConsentText(safeLocale);

  try {
    const response = await requestGeoTesterLead({
      auditId: String(auditId || '').trim(),
      email,
      name,
      locale: safeLocale,
      consent: safeConsent,
      sourceIp: extractClientIp(req),
      consentText
    });

    return res.json({
      success: true,
      verificationRequired: true,
      message: response.message
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || tError('report.geo.request.failed', safeLocale)
    });
  }
}

export async function runSeoAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = combinedTesterConsentText(safeLocale);

  try {
    const response = await requestSeoTesterLead({
      auditId: String(auditId || '').trim(),
      email,
      name,
      locale: safeLocale,
      consent: safeConsent,
      sourceIp: extractClientIp(req),
      consentText
    });

    return res.json({
      success: true,
      verificationRequired: true,
      message: response.message
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || tError('report.seo.request.failed', safeLocale)
    });
  }
}

export async function runMetaAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = combinedTesterConsentText(safeLocale);

  try {
    const response = await requestMetaTesterLead({
      auditId: String(auditId || '').trim(),
      email,
      name,
      locale: safeLocale,
      consent: safeConsent,
      sourceIp: extractClientIp(req),
      consentText
    });

    return res.json({
      success: true,
      verificationRequired: true,
      message: response.message
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || tError('report.meta.request.failed', safeLocale)
    });
  }
}

export async function runBrokenLinkAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = combinedTesterConsentText(safeLocale);

  try {
    const response = await requestBrokenLinkTesterLead({
      auditId: String(auditId || '').trim(),
      email,
      name,
      locale: safeLocale,
      consent: safeConsent,
      sourceIp: extractClientIp(req),
      consentText
    });

    return res.json({
      success: true,
      verificationRequired: true,
      message: response.message
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || tError('report.brokenLinks.request.failed', safeLocale)
    });
  }
}

export async function confirmWebsiteAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();

  const viewModel = await confirmWebsiteTesterLeadToken({
    token,
    locale: requestedLocale
  });

  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn ? '/en/website-tester/report-confirm' : '/website-tester/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('website_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'Website Tester report confirmation' : 'Website-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed website optimization report.'
      : 'Bestätige deine E-Mail und erhalte deinen ausführlichen Website-Optimierungsreport.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'Website Tester report confirmation' : 'Website-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your optimization PDF.' : 'E-Mail-Bestätigung für deinen Optimierungsreport.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}

export async function confirmGeoAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();

  const viewModel = await confirmGeoTesterLeadToken({
    token,
    locale: requestedLocale
  });

  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn ? '/en/website-tester/geo/report-confirm' : '/website-tester/geo/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('geo_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'GEO Tester report confirmation' : 'GEO-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed GEO optimization report.'
      : 'Bestätige deine E-Mail und erhalte deinen detaillierten GEO-Optimierungsreport.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'GEO Tester report confirmation' : 'GEO-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your detailed GEO PDF report.' : 'E-Mail-Bestätigung für deinen detaillierten GEO-Report.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}

export async function confirmSeoAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();

  const viewModel = await confirmSeoTesterLeadToken({
    token,
    locale: requestedLocale
  });

  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn ? '/en/website-tester/seo/report-confirm' : '/website-tester/seo/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('seo_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'SEO Tester report confirmation' : 'SEO-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed SEO report.'
      : 'Bestätige deine E-Mail und erhalte deinen detaillierten SEO-Report.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'SEO Tester report confirmation' : 'SEO-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your detailed SEO PDF report.' : 'E-Mail-Bestätigung für deinen detaillierten SEO-Report.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}

export async function confirmMetaAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();
  const viewModel = await confirmMetaTesterLeadToken({ token, locale: requestedLocale });
  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn ? '/en/website-tester/meta/report-confirm' : '/website-tester/meta/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('meta_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'Meta Tester report confirmation' : 'Meta-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed header meta report.'
      : 'Bestätige deine E-Mail und erhalte deinen detaillierten Header-Meta-Report.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'Meta Tester report confirmation' : 'Meta-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your detailed header/meta PDF report.' : 'E-Mail-Bestätigung für deinen detaillierten Header-/Meta-Report.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}

export async function confirmBrokenLinkAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();
  const viewModel = await confirmBrokenLinkTesterLeadToken({ token, locale: requestedLocale });
  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn
    ? '/en/website-tester/broken-links/report-confirm'
    : '/website-tester/broken-links/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('broken_links_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'Broken-Links Tester report confirmation' : 'Broken-Links-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed broken-links report.'
      : 'Bestätige deine E-Mail und erhalte deinen detaillierten Broken-Links-Report.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'Broken-Links Tester report confirmation' : 'Broken-Links-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your detailed broken-links PDF report.' : 'E-Mail-Bestätigung für deinen detaillierten Broken-Links-Report.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}
