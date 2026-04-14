import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_LEFT = 50;
const PAGE_MARGIN_RIGHT = 50;
const BODY_START_Y = 766;
const BODY_END_Y = 58;
const HEADER_DIVIDER_Y = 785;
const FOOTER_DIVIDER_Y = 42;
const MAX_CHARS_PER_LINE = 92;
const DEFAULT_LOGO_PATH = path.resolve(process.cwd(), 'public/images/icon32.png');

const TEXT = {
  de: {
    title: 'Website-Optimierungsreport',
    subtitle: 'Ausführlicher Maßnahmenreport auf Basis deines Website-Tester-Audits',
    generated: 'Erstellt am',
    domain: 'Domain',
    score: 'Gesamtscore',
    band: 'Bewertung',
    intro: 'Dieser Report geht deutlich tiefer als die Ergebnisansicht und enthält konkrete Ist-Soll-Empfehlungen, Umsetzungswege sowie Prioritäten für die nächsten 90 Tage.',
    sectionExecutive: 'Executive Summary',
    sectionWhyScore: 'Warum dieser Score?',
    sectionStrengths: 'Starke Signale',
    sectionFindings: 'Kritische Befunde',
    sectionActions: 'Priorisierte Maßnahmen',
    sectionCategories: 'Kategorien im Detail',
    sectionImplementation: 'Umsetzungsleitfaden je Top-Maßnahme',
    sectionQuickWins: 'Quick Wins (0-7 Tage)',
    sectionSeoBlueprint: 'SEO/GEO Blueprint (mit Vorlagen)',
    sectionLegalChecklist: 'Legal- und Consent-Checkliste (DE)',
    sectionRoadmap: '30/60/90-Tage-Plan',
    sectionNextSteps: 'Nächste Schritte',
    noData: 'Keine Daten verfügbar.',
    stateOk: 'OK',
    stateReview: 'Review',
    contact: 'Beratung buchen',
    legalNotice: 'Hinweis: Dieser Report ist ein automatisierter Hinweis- und Risiko-Check. Er ersetzt keine Rechtsberatung.',
    rawScore: 'Rohscore',
    finalScore: 'Finaler Score',
    penalty: 'Abzug durch Caps/Penalties',
    caps: 'Aktive Score-Caps',
    penalties: 'Aktive Penalties',
    noCaps: 'Keine aktiven Caps erkannt.',
    noPenalties: 'Keine aktiven Penalties erkannt.',
    legalRisk: 'Abmahn-Risiko',
    legalBlockers: 'Kritische Blocker',
    footerWebsiteLabel: 'Website:',
    pageLabel: 'Seite',
    quickImplementation: 'Ist -> Soll',
    successMetric: 'Erfolgsmessung',
    impact: 'Erwarteter Hebel',
    mediumImpact: 'Mittel bis hoch (Sichtbarkeit + Conversion)',
    highImpact: 'Hoch (Sichtbarkeit, Vertrauen, Leads)',
    legalImpact: 'Hoch (Risikominimierung + Vertrauen)'
  },
  en: {
    title: 'Website Optimization Report',
    subtitle: 'Detailed action report based on your Website Tester audit',
    generated: 'Generated on',
    domain: 'Domain',
    score: 'Overall score',
    band: 'Assessment',
    intro: 'This report is significantly deeper than the on-screen result and includes concrete current-vs-target actions, implementation guidance, and a 90-day roadmap.',
    sectionExecutive: 'Executive Summary',
    sectionWhyScore: 'Why this score?',
    sectionStrengths: 'Strong signals',
    sectionFindings: 'Critical findings',
    sectionActions: 'Prioritized actions',
    sectionCategories: 'Category details',
    sectionImplementation: 'Implementation guide per top action',
    sectionQuickWins: 'Quick wins (0-7 days)',
    sectionSeoBlueprint: 'SEO/GEO blueprint (with templates)',
    sectionLegalChecklist: 'Legal and consent checklist (DE focus)',
    sectionRoadmap: '30/60/90 day plan',
    sectionNextSteps: 'Next steps',
    noData: 'No data available.',
    stateOk: 'OK',
    stateReview: 'Review',
    contact: 'Book consultation',
    legalNotice: 'Notice: This is an automated guidance and risk report. It does not replace legal advice.',
    rawScore: 'Raw score',
    finalScore: 'Final score',
    penalty: 'Reduction by caps/penalties',
    caps: 'Active score caps',
    penalties: 'Active penalties',
    noCaps: 'No active caps detected.',
    noPenalties: 'No active penalties detected.',
    legalRisk: 'Legal risk',
    legalBlockers: 'Critical blockers',
    footerWebsiteLabel: 'Website:',
    pageLabel: 'Page',
    quickImplementation: 'Current -> Target',
    successMetric: 'Success metric',
    impact: 'Expected impact',
    mediumImpact: 'Medium to high (visibility + conversion)',
    highImpact: 'High (visibility, trust, leads)',
    legalImpact: 'High (risk reduction + trust)'
  }
};

const SCORE_BAND_LABELS = {
  de: {
    gut: 'Modern',
    mittel: 'Ausbaufähig',
    kritisch: 'Kritisch'
  },
  en: {
    gut: 'Modern',
    mittel: 'Needs work',
    kritisch: 'Critical'
  }
};

const WIN_ANSI_MAP = new Map([
  [0x20AC, 0x80],
  [0x201A, 0x82],
  [0x0192, 0x83],
  [0x201E, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02C6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8A],
  [0x2039, 0x8B],
  [0x0152, 0x8C],
  [0x017D, 0x8E],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201C, 0x93],
  [0x201D, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02DC, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9A],
  [0x203A, 0x9B],
  [0x0153, 0x9C],
  [0x017E, 0x9E],
  [0x0178, 0x9F]
]);

function localeFrom(raw) {
  return raw === 'en' ? 'en' : 'de';
}

function resolveReportProfile(raw = '') {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'seo') return 'seo';
  if (value === 'geo') return 'geo';
  return 'website';
}

function normalizeTypography(value = '') {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function encodeWinAnsi(text = '') {
  const bytes = [];
  for (const char of String(text || '')) {
    const code = char.codePointAt(0);
    if (code >= 0x20 && code <= 0xFF) {
      bytes.push(code);
      continue;
    }
    if (WIN_ANSI_MAP.has(code)) {
      bytes.push(WIN_ANSI_MAP.get(code));
      continue;
    }
    if (code === 0x09) {
      bytes.push(0x20);
      continue;
    }
    bytes.push(0x3F);
  }
  return Buffer.from(bytes);
}

function textToPdfHex(value = '') {
  return encodeWinAnsi(normalizeTypography(value)).toString('hex').toUpperCase();
}

function wrapText(rawText = '', maxChars = MAX_CHARS_PER_LINE) {
  const text = normalizeTypography(rawText);
  if (!text) return [''];

  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);

    if (word.length > maxChars) {
      const chunks = word.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [word];
      lines.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1] || '';
    } else {
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function listToLines(items = [], fallbackText, mapItem) {
  if (!Array.isArray(items) || items.length === 0) {
    return [`- ${normalizeTypography(fallbackText)}`];
  }

  return items.slice(0, 10).map((item, index) => {
    if (typeof mapItem === 'function') {
      return mapItem(item, index);
    }
    const category = normalizeTypography(item.category || '');
    const label = normalizeTypography(item.label || '');
    const text = normalizeTypography(item.text || '');
    const head = [category, label].filter(Boolean).join(' / ');
    return `- ${[head, text].filter(Boolean).join(': ')}`;
  });
}

function getScoreBandLabel(scoreBand, locale) {
  const lng = localeFrom(locale);
  return SCORE_BAND_LABELS[lng][scoreBand] || SCORE_BAND_LABELS[lng].mittel;
}

function formatDateIso(value = new Date(), locale = 'de') {
  const lng = localeFrom(locale);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(lng === 'en' ? 'en-GB' : 'de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function line(text, kind = 'body') {
  return {
    kind,
    text: normalizeTypography(text || '')
  };
}

function section(lines, title) {
  lines.push(line('', 'spacer'));
  lines.push(line(title, 'section'));
}

function buildQuickWins({ locale, result, profile = 'website' }) {
  const lng = localeFrom(locale);
  const mode = resolveReportProfile(profile);
  const facts = result.siteFacts || {};
  const wins = [];

  if (mode === 'seo') {
    wins.push(lng === 'en'
      ? 'Align title, meta description, and H1 to one primary intent on each core page.'
      : 'Title, Meta-Description und H1 auf jeder Kernseite auf einen primären Intent ausrichten.');
    wins.push(lng === 'en'
      ? 'Add 2-3 internal links per core page with exact intent anchor text.'
      : 'Pro Kernseite 2-3 interne Links mit intent-genauen Anchor-Texten ergänzen.');
  } else if (mode === 'geo') {
    wins.push(lng === 'en'
      ? 'Add answer-first summary blocks at the top of homepage and key service pages.'
      : 'Auf Startseite und Kernleistungsseiten answer-first Kurzantwortblöcke oberhalb des Folds ergänzen.');
    wins.push(lng === 'en'
      ? 'Publish at least 6 concise FAQs with direct, snippet-ready answers on top pages.'
      : 'Auf Top-Seiten mindestens 6 prägnante FAQs mit direkten, snippet-tauglichen Antworten veröffentlichen.');
  }

  if (!facts.usesHttps) {
    wins.push(lng === 'en'
      ? 'Enable HTTPS end-to-end and redirect all HTTP URLs to HTTPS.'
      : 'HTTPS durchgängig aktivieren und alle HTTP-URLs auf HTTPS umleiten.');
  }
  if (!facts.hasSchema) {
    wins.push(lng === 'en'
      ? 'Add Organization + LocalBusiness schema with address and contact fields.'
      : 'Organization + LocalBusiness Schema mit Adress- und Kontaktfeldern ergänzen.');
  }
  if ((facts.imagesWithoutAlt || 0) > 0) {
    wins.push(lng === 'en'
      ? `Add meaningful ALT text to ${facts.imagesWithoutAlt} informative image(s).`
      : `Aussagekräftige ALT-Texte für ${facts.imagesWithoutAlt} informative(s) Bild(er) ergänzen.`);
  }
  if (!facts.hasRobots || !facts.hasSitemap) {
    wins.push(lng === 'en'
      ? 'Provide robots.txt and sitemap.xml with clean indexation rules.'
      : 'Robots.txt und Sitemap.xml mit klaren Indexierungsregeln bereitstellen.');
  }
  if (!wins.length) {
    wins.push(lng === 'en'
      ? 'Implement the top 3 actions from this report this week and re-test afterwards.'
      : 'Diese Woche die Top-3-Maßnahmen aus dem Report umsetzen und anschließend neu testen.');
  }

  return wins.slice(0, 6);
}

function buildRoadmap({ locale, profile = 'website' }) {
  const lng = localeFrom(locale);
  const mode = resolveReportProfile(profile);
  if (mode === 'seo') {
    if (lng === 'en') {
      return [
        'Day 1-30: Fix on-page baselines (title/meta/H1), indexation hygiene, and internal link structure.',
        'Day 31-60: Expand service-page depth, trust signals, and conversion-focused copy blocks.',
        'Day 61-90: Scale topic clusters, schema refinement, and CTR-focused snippet testing.'
      ];
    }
    return [
      'Tag 1-30: OnPage-Basis (Title/Meta/H1), Indexierungs-Hygiene und interne Linkstruktur korrigieren.',
      'Tag 31-60: Leistungstexte, Trust-Signale und conversion-orientierte Copy-Blöcke ausbauen.',
      'Tag 61-90: Themencluster, Schema-Verfeinerung und CTR-orientierte Snippet-Tests skalieren.'
    ];
  }

  if (mode === 'geo') {
    if (lng === 'en') {
      return [
        'Day 1-30: Add answer-first blocks, entity clarity, and consistent contact/entity data.',
        'Day 31-60: Build FAQ/snippet modules and strengthen citation-ready trust sections.',
        'Day 61-90: Scale GEO content clusters and test retrieval visibility in AI answer flows.'
      ];
    }
    return [
      'Tag 1-30: Answer-first Blöcke, Entity-Klarheit und konsistente Kontakt-/Entity-Daten ergänzen.',
      'Tag 31-60: FAQ-/Snippet-Module ausbauen und zitierfähige Trust-Bereiche stärken.',
      'Tag 61-90: GEO-Content-Cluster skalieren und Retrieval-Sichtbarkeit in AI-Antwortflüssen testen.'
    ];
  }

  if (lng === 'en') {
    return [
      'Day 1-30: Remove blockers (indexing basics, metadata quality, legal visibility, consent setup).',
      'Day 31-60: Improve key service pages, trust content, internal linking, and conversion pathways.',
      'Day 61-90: Scale SEO/GEO content clusters, schema depth, and conversion experiments by priority.'
    ];
  }

  return [
    'Tag 1-30: Blocker entfernen (Indexierungsbasis, Metadaten-Qualität, Rechtstext-Sichtbarkeit, Consent-Setup).',
    'Tag 31-60: Kernleistungsseiten, Trust-Inhalte, interne Verlinkung und Conversion-Pfade ausbauen.',
    'Tag 61-90: SEO/GEO-Content-Cluster, Schema-Tiefe und Conversion-Experimente priorisiert skalieren.'
  ];
}

function templateTitleAndMeta({ locale, context, domain, profile = 'website' }) {
  const lng = localeFrom(locale);
  const mode = resolveReportProfile(profile);
  const service = normalizeTypography(context?.primaryService || '') || (lng === 'en' ? 'Primary service' : 'Hauptleistung');
  const region = normalizeTypography(context?.targetRegion || '') || (lng === 'en' ? 'Target region' : 'Zielregion');
  const host = normalizeTypography(domain || 'example.com');

  if (mode === 'geo') {
    if (lng === 'en') {
      return {
        title: `${service} in ${region} | Clear answers for AI search`,
        meta: `${service} in ${region}: answer-first content, clear entities, FAQ snippets, and strong trust signals for higher LLM retrieval relevance.`
      };
    }
    return {
      title: `${service} in ${region} | Präzise Antworten für AI-Suche`,
      meta: `${service} in ${region}: answer-first Inhalte, klare Entity-Signale, FAQ-Snippets und starke Trust-Faktoren für bessere LLM-Auffindbarkeit.`
    };
  }

  if (lng === 'en') {
    return {
      title: `${service} in ${region} | Web Design, SEO & Hosting`,
      meta: `${service} in ${region}: professional website setup with SEO, mobile-first UX, hosting and support. Request your free website check now at ${host}.`
    };
  }

  return {
    title: mode === 'seo'
      ? `${service} in ${region} | Webdesign, SEO & Hosting`
      : `${service} in ${region} | Webdesign, SEO & Hosting`,
    meta: mode === 'seo'
      ? `${service} in ${region}: Website professionell erstellen lassen inkl. SEO, mobiloptimiertem Design, Hosting und Support. Jetzt kostenlosen Website-Check anfragen.`
      : `${service} in ${region}: Website professionell erstellen lassen inkl. SEO, mobiloptimiertem Design, Hosting und Support. Jetzt kostenlosen Website-Check anfragen.`
  };
}

function profileSectionTitle(profile, locale = 'de') {
  const lng = localeFrom(locale);
  const mode = resolveReportProfile(profile);
  if (mode === 'seo') return lng === 'en' ? 'SEO profile details' : 'SEO-Profil im Detail';
  if (mode === 'geo') return lng === 'en' ? 'GEO profile details' : 'GEO-Profil im Detail';
  return lng === 'en' ? 'Website profile details' : 'Website-Profil im Detail';
}

function blueprintSectionTitle(profile, locale = 'de') {
  const lng = localeFrom(locale);
  const mode = resolveReportProfile(profile);
  if (mode === 'seo') return lng === 'en' ? 'SEO Blueprint (with templates)' : 'SEO Blueprint (mit Vorlagen)';
  if (mode === 'geo') return lng === 'en' ? 'GEO Blueprint (with templates)' : 'GEO Blueprint (mit Vorlagen)';
  return lng === 'en' ? 'Website blueprint (with templates)' : 'Website-Blueprint (mit Vorlagen)';
}

function buildProfileLines({ profile, locale, result }) {
  const lng = localeFrom(locale);
  const mode = resolveReportProfile(profile);
  const lines = [];

  if (mode === 'seo') {
    const categoryScores = Array.isArray(result.seoCategoryScores) ? result.seoCategoryScores : [];
    const potentials = result.seoPotentialSummary || {};
    if (potentials.headline) lines.push(`- ${lng === 'en' ? 'Potential headline' : 'Potenzial-Headline'}: ${normalizeTypography(potentials.headline)}`);
    if (potentials.text) lines.push(`- ${lng === 'en' ? 'Potential summary' : 'Potenzial-Text'}: ${normalizeTypography(potentials.text)}`);
    if (categoryScores.length) {
      lines.push(`- ${lng === 'en' ? 'SEO category priorities' : 'SEO-Kategorie-Prioritäten'}:`);
      categoryScores
        .slice()
        .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
        .slice(0, 6)
        .forEach((entry) => {
          lines.push(`- ${normalizeTypography(entry.id || 'seo')}: ${Number.isFinite(entry.score) ? entry.score : '-'}/100`);
        });
    }
    const topAreas = Array.isArray(potentials.topPotentialAreas) ? potentials.topPotentialAreas : [];
    if (topAreas.length) {
      lines.push(`- ${lng === 'en' ? 'Top SEO potential areas' : 'Top-SEO-Potenzialbereiche'}:`);
      topAreas.slice(0, 6).forEach((item) => lines.push(`- ${normalizeTypography(item)}`));
    }
    return lines;
  }

  if (mode === 'geo') {
    const signals = result.geoSignals || {};
    const potentials = result.geoPotentialSummary || {};
    if (potentials.headline) lines.push(`- ${lng === 'en' ? 'Potential headline' : 'Potenzial-Headline'}: ${normalizeTypography(potentials.headline)}`);
    if (potentials.text) lines.push(`- ${lng === 'en' ? 'Potential summary' : 'Potenzial-Text'}: ${normalizeTypography(potentials.text)}`);

    const signalRows = [
      ['Entity/Schema', signals.entitySchema],
      [lng === 'en' ? 'Intent coherence' : 'Intent-Kohärenz', signals.intentCoherence],
      [lng === 'en' ? 'FAQ/snippet readiness' : 'FAQ/Snippet-Readiness', signals.faqSnippetReadiness],
      ['Trust/Citations', signals.trustCitations],
      [lng === 'en' ? 'Internal linking' : 'Interne Verlinkung', signals.internalLinking]
    ].filter(([, value]) => value && typeof value === 'object');

    if (signalRows.length) {
      lines.push(`- ${lng === 'en' ? 'GEO signal profile' : 'GEO-Signalprofil'}:`);
      signalRows.forEach(([label, value]) => {
        lines.push(`- ${label}: ${Number.isFinite(value.score) ? value.score : '-'}/100 (${normalizeTypography(value.quality || '-')})`);
      });
    }

    const topPotentials = Array.isArray(potentials.topPotentials) ? potentials.topPotentials : [];
    if (topPotentials.length) {
      lines.push(`- ${lng === 'en' ? 'Top GEO potential areas' : 'Top-GEO-Potenzialbereiche'}:`);
      topPotentials.slice(0, 6).forEach((item) => {
        lines.push(`- ${normalizeTypography(item.category || '')}: ${normalizeTypography(item.label || '')}`);
      });
    }
  }

  return lines;
}

function buildImplementationSteps({ locale, actionText, categoryText }) {
  const lng = localeFrom(locale);
  const text = `${normalizeTypography(actionText)} ${normalizeTypography(categoryText)}`.toLowerCase();

  if (/title|meta|h1|seo|intent|schema|geo/.test(text)) {
    return lng === 'en'
      ? [
        'Define one primary search intent and map it to one landing page.',
        'Rewrite title/meta/H1 with service + region + concrete value proposition.',
        'Validate snippet quality in Search Console and improve low-CTR pages weekly.'
      ]
      : [
        'Einen primären Such-Intent definieren und einer klaren Landingpage zuordnen.',
        'Title/Meta/H1 mit Leistung + Region + konkretem Nutzen neu formulieren.',
        'Snippet-Qualität in der Search Console prüfen und Seiten mit niedriger CTR wöchentlich nachschärfen.'
      ];
  }

  if (/datenschutz|impressum|consent|cookie|tracking|legal|recht/.test(text)) {
    return lng === 'en'
      ? [
        'Make imprint and privacy pages accessible from every page footer.',
        'Ensure consent allows accept + reject/settings and stores proof of choice.',
        'Load analytics/marketing scripts only after explicit opt-in and document setup.'
      ]
      : [
        'Impressum und Datenschutzerklärung von jeder Seite im Footer erreichbar machen.',
        'Consent so aufsetzen, dass Akzeptieren + Ablehnen/Einstellungen sauber möglich sind.',
        'Analytics-/Marketing-Skripte erst nach aktivem Opt-in laden und Setup dokumentieren.'
      ];
  }

  if (/barriere|accessibility|alt|label|semantik|ux/.test(text)) {
    return lng === 'en'
      ? [
        'Fix missing ALT texts and form labels on high-traffic pages first.',
        'Enforce semantic regions (header/nav/main/footer) and heading hierarchy.',
        'Run monthly accessibility spot checks with a checklist and browser tools.'
      ]
      : [
        'Fehlende ALT-Texte und Form-Labels zuerst auf reichweitenstarken Seiten beheben.',
        'Semantische Bereiche (header/nav/main/footer) und Überschriften-Hierarchie vereinheitlichen.',
        'Monatliche Accessibility-Spotchecks mit Checkliste und Browser-Tools durchführen.'
      ];
  }

  return lng === 'en'
    ? [
      'Prioritize this issue on pages with highest traffic and lead potential.',
      'Implement, test on mobile + desktop, and document the before/after state.',
      'Track impact in analytics and continue with the next prioritized action.'
    ]
    : [
      'Dieses Thema auf Seiten mit höchstem Traffic- und Lead-Potenzial priorisieren.',
      'Umsetzung auf Mobile + Desktop testen und Vorher/Nachher dokumentieren.',
      'Auswirkung in Analytics messen und danach die nächste Priorität umsetzen.'
    ];
}

function buildImpactText({ locale, categoryText }) {
  const copy = TEXT[localeFrom(locale)];
  const normalized = normalizeTypography(categoryText).toLowerCase();
  if (/legal|recht|consent/.test(normalized)) return copy.legalImpact;
  if (/seo|geo|mehrwert|value|conversion/.test(normalized)) return copy.highImpact;
  return copy.mediumImpact;
}

function buildDetailedLines({ locale, lead, result }) {
  const lng = localeFrom(locale);
  const profile = resolveReportProfile(result?.reportProfile || result?.source || lead?.source);
  const copy = TEXT[lng];
  const domain = lead.domain || (() => {
    try {
      return new URL(result.finalUrl).hostname;
    } catch {
      return result.finalUrl || '';
    }
  })();

  const context = result.context || {};
  const scoreBandLabel = getScoreBandLabel(result.scoreBand || lead.score_band || 'mittel', lng);
  const overallScore = Number.isFinite(result.overallScore) ? result.overallScore : (lead.overall_score || '-');
  const facts = result.siteFacts || {};
  const scoring = result.scoring || {};
  const legalRisk = result.legalRisk || {};
  const relevance = result.relevance || {};

  const base = (process.env.BASE_URL || process.env.CANONICAL_BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const contactUrl = (() => {
    if (result.cta?.primaryHref) {
      if (/^https?:\/\//i.test(result.cta.primaryHref)) return result.cta.primaryHref;
      return `${base}${result.cta.primaryHref.startsWith('/') ? '' : '/'}${result.cta.primaryHref}`;
    }
    return `${base}${lng === 'en' ? '/en/kontakt' : '/kontakt'}`;
  })();
  const bookingUrl = `${base}/booking`;

  const lines = [];
  lines.push(line(copy.title, 'title'));
  lines.push(line(copy.subtitle, 'subtitle'));
  lines.push(line('', 'spacer'));
  lines.push(line(`${copy.generated}: ${formatDateIso(new Date(), lng)}`, 'meta'));
  lines.push(line(`${copy.domain}: ${normalizeTypography(domain || '-')}`, 'meta'));
  lines.push(line(`${copy.score}: ${overallScore}/100`, 'meta'));
  lines.push(line(`${copy.band}: ${scoreBandLabel}`, 'meta'));
  lines.push(line('', 'spacer'));
  lines.push(line(copy.intro, 'body'));

  section(lines, copy.sectionExecutive);
  lines.push(line(`- ${lng === 'en' ? 'Overall assessment' : 'Gesamteinordnung'}: ${normalizeTypography(result.summary || copy.noData)}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'SEO/GEO relevance' : 'SEO/GEO-Relevanz'}: ${Number.isFinite(relevance.seoGeoScore) ? relevance.seoGeoScore : '-'} / 100`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Value/modernity' : 'Mehrwert/Modernität'}: ${Number.isFinite(relevance.valueScore) ? relevance.valueScore : '-'} / 100`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Intent match' : 'Intent-Match'}: ${Number.isFinite(relevance.intentMatchScore) ? relevance.intentMatchScore : '-'} / 100`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Report profile' : 'Report-Profil'}: ${profile.toUpperCase()}`, 'bullet'));
  lines.push(line(`- ${copy.legalRisk}: ${normalizeTypography(legalRisk.label || legalRisk.level || '-')}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Crawl scope' : 'Crawl-Umfang'}: ${facts.pagesCrawled || 0}/${facts.crawlTarget || 0}`, 'bullet'));

  section(lines, copy.sectionWhyScore);
  lines.push(line(`- ${copy.rawScore}: ${Number.isFinite(scoring.rawScore) ? scoring.rawScore : '-'}`, 'bullet'));
  lines.push(line(`- ${copy.finalScore}: ${Number.isFinite(scoring.finalScore) ? scoring.finalScore : overallScore}`, 'bullet'));
  lines.push(line(`- ${copy.penalty}: ${Number.isFinite(scoring.penalty) ? scoring.penalty : 0}`, 'bullet'));

  lines.push(line(`- ${copy.caps}:`, 'bullet'));
  const caps = Array.isArray(scoring.caps) ? scoring.caps : [];
  const capLines = caps.length
    ? caps.map((cap) => `- ${normalizeTypography(cap.key || 'cap')}: ${normalizeTypography(cap.reason || '')} (${cap.applied ? 'aktiv' : 'inaktiv'}, max ${cap.maxScore})`)
    : [`- ${copy.noCaps}`];
  capLines.forEach((entry) => lines.push(line(entry, 'bullet')));

  lines.push(line(`- ${copy.penalties}:`, 'bullet'));
  const penalties = Array.isArray(scoring.penalties) ? scoring.penalties : [];
  const penaltyLines = penalties.length
    ? penalties.map((penalty) => `- ${normalizeTypography(penalty.key || 'penalty')}: ${normalizeTypography(penalty.reason || '')}`)
    : [`- ${copy.noPenalties}`];
  penaltyLines.forEach((entry) => lines.push(line(entry, 'bullet')));

  if (Array.isArray(legalRisk.reasons) && legalRisk.reasons.length) {
    lines.push(line(`- ${lng === 'en' ? 'Legal risk reasons' : 'Begründungen zum Abmahn-Risiko'}:`, 'bullet'));
    legalRisk.reasons.slice(0, 8).forEach((reason) => lines.push(line(`- ${normalizeTypography(reason)}`, 'bullet')));
  }

  if (Array.isArray(legalRisk.blockers) && legalRisk.blockers.length) {
    lines.push(line(`- ${copy.legalBlockers}:`, 'bullet'));
    legalRisk.blockers.slice(0, 8).forEach((blocker) => lines.push(line(`- ${normalizeTypography(blocker)}`, 'bullet')));
  }

  section(lines, copy.sectionStrengths);
  listToLines(result.strengths, copy.noData, (item) => {
    const label = [normalizeTypography(item.category || ''), normalizeTypography(item.label || '')].filter(Boolean).join(' / ');
    return `- ${[label, normalizeTypography(item.text || '')].filter(Boolean).join(': ')}`;
  }).forEach((entry) => lines.push(line(entry, 'bullet')));

  section(lines, copy.sectionFindings);
  listToLines(result.topFindings, copy.noData, (item) => {
    const head = [normalizeTypography(item.category || ''), normalizeTypography(item.label || '')].filter(Boolean).join(' / ');
    return `- ${[head, normalizeTypography(item.text || '')].filter(Boolean).join(': ')}`;
  }).forEach((entry) => lines.push(line(entry, 'bullet')));

  section(lines, copy.sectionActions);
  listToLines(result.topActions, copy.noData, (item) => {
    const head = [normalizeTypography(item.category || ''), normalizeTypography(item.label || '')].filter(Boolean).join(' / ');
    return `- ${[head, normalizeTypography(item.text || '')].filter(Boolean).join(': ')}`;
  }).forEach((entry) => lines.push(line(entry, 'bullet')));

  section(lines, copy.sectionCategories);
  const categories = Array.isArray(result.categories) ? result.categories : [];
  if (!categories.length) {
    lines.push(line(`- ${copy.noData}`, 'bullet'));
  } else {
    categories.forEach((category) => {
      lines.push(line(`${normalizeTypography(category.title || category.id || 'Kategorie')} (${category.score}/100)`, 'subsection'));
      const details = Array.isArray(category.details) ? category.details.slice(0, 6) : [];
      if (!details.length) {
        lines.push(line(`- ${copy.noData}`, 'bullet'));
        return;
      }

      details.forEach((detail) => {
        const state = detail.status === 'ok' ? copy.stateOk : copy.stateReview;
        lines.push(line(`- [${state}] ${normalizeTypography(detail.label || '')}`, 'bullet'));
        if (detail.explanation) lines.push(line(`  ${normalizeTypography(detail.explanation)}`, 'body'));
        if (detail.action) lines.push(line(`  ${lng === 'en' ? 'Recommendation' : 'Empfehlung'}: ${normalizeTypography(detail.action)}`, 'body'));
        if (detail.value) lines.push(line(`  ${lng === 'en' ? 'Detected value' : 'Erkannter Wert'}: ${normalizeTypography(detail.value)}`, 'small'));
      });
    });
  }

  const profileLines = buildProfileLines({ profile, locale: lng, result });
  if (profileLines.length) {
    section(lines, profileSectionTitle(profile, lng));
    profileLines.forEach((entry) => lines.push(line(entry, 'bullet')));
  }

  section(lines, copy.sectionImplementation);
  const topActions = Array.isArray(result.topActions) ? result.topActions.slice(0, 6) : [];
  if (!topActions.length) {
    lines.push(line(`- ${copy.noData}`, 'bullet'));
  } else {
    topActions.forEach((item, index) => {
      const category = normalizeTypography(item.category || '');
      const label = normalizeTypography(item.label || item.text || `Maßnahme ${index + 1}`);
      const action = normalizeTypography(item.text || item.label || '');
      const steps = buildImplementationSteps({ locale: lng, actionText: action, categoryText: category });

      lines.push(line(`${index + 1}. ${label}${category ? ` (${category})` : ''}`, 'subsection'));
      lines.push(line(`- ${copy.quickImplementation}: ${action}`, 'bullet'));
      lines.push(line(`- ${copy.impact}: ${buildImpactText({ locale: lng, categoryText: category })}`, 'bullet'));
      steps.forEach((step, stepIndex) => {
        lines.push(line(`- ${stepIndex + 1}) ${normalizeTypography(step)}`, 'bullet'));
      });
      lines.push(line(`- ${copy.successMetric}: ${lng === 'en' ? 'Track ranking/CTR, qualified inquiries, and conversion rate for affected pages.' : 'Ranking/CTR, qualifizierte Anfragen und Conversion-Rate der betroffenen Seiten messen.'}`, 'bullet'));
    });
  }

  section(lines, copy.sectionQuickWins);
  buildQuickWins({ locale: lng, result, profile }).forEach((entry) => lines.push(line(`- ${normalizeTypography(entry)}`, 'bullet')));

  section(lines, blueprintSectionTitle(profile, lng));
  const templates = templateTitleAndMeta({ locale: lng, context, domain, profile });
  lines.push(line(`- ${lng === 'en' ? 'Title template' : 'Title-Vorlage'}: ${templates.title}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Meta template' : 'Meta-Vorlage'}: ${templates.meta}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Checklist' : 'Checkliste'}: ${(() => {
    if (profile === 'geo') {
      return lng === 'en'
        ? 'One answer-first block per page, one clear H1, service + region in snippet, entity clarity, and clear CTA.'
        : 'Pro Seite ein answer-first Block, eine klare H1, Leistung + Region im Snippet, klare Entity-Signale und ein klarer CTA.';
    }
    if (profile === 'seo') {
      return lng === 'en'
        ? 'One primary intent per page, one clear H1, service + region in snippet, concrete benefit, and clear CTA.'
        : 'Pro Seite ein primärer Intent, eine klare H1, Leistung + Region im Snippet, konkreter Nutzen und klarer CTA.';
    }
    return lng === 'en'
      ? 'One main intent per page, one clear H1, service + region in snippet, concrete benefit, clear CTA.'
      : 'Pro Seite ein Haupt-Intent, eine klare H1, Leistung + Region im Snippet, konkreter Nutzen, klarer CTA.';
  })()}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Entity signals' : 'Entity-Signale'}: ${lng === 'en' ? 'Use Organization/LocalBusiness schema with address, contact, opening hours, sameAs links.' : 'Organization/LocalBusiness-Schema mit Adresse, Kontakt, Öffnungszeiten und sameAs-Links nutzen.'}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'GEO readiness' : 'GEO-Readiness'}: ${lng === 'en' ? 'Integrate FAQ blocks and concise answer snippets for LLM-friendly retrieval.' : 'FAQ-Blöcke und prägnante Antwort-Snippets für LLM-freundliche Auffindbarkeit integrieren.'}`, 'bullet'));

  section(lines, copy.sectionLegalChecklist);
  lines.push(line(`- ${lng === 'en' ? 'Imprint + privacy must be reachable in footer on every page.' : 'Impressum + Datenschutz müssen im Footer jeder Seite erreichbar sein.'}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Consent banner should provide accept + reject/settings + withdrawal option.' : 'Consent-Banner sollte Akzeptieren + Ablehnen/Einstellungen + Widerruf ermöglichen.'}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Analytics/marketing scripts should load only after opt-in.' : 'Analytics-/Marketing-Skripte sollten erst nach Opt-in laden.'}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Third-party embeds (YouTube/Maps/reCAPTCHA) should be consent-gated (2-click).' : 'Drittanbieter-Einbettungen (YouTube/Maps/reCAPTCHA) sollten per Consent-Gate (2-Klick) geschützt sein.'}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Privacy policy should include legal basis, rights, recipients, storage period, and transfer safeguards.' : 'Datenschutzerklärung sollte Rechtsgrundlagen, Rechte, Empfänger, Speicherdauer und Drittland-Absicherung enthalten.'}`, 'bullet'));

  section(lines, copy.sectionRoadmap);
  buildRoadmap({ locale: lng, profile }).forEach((entry) => lines.push(line(`- ${normalizeTypography(entry)}`, 'bullet')));

  section(lines, copy.sectionNextSteps);
  lines.push(line(`- ${copy.contact}: ${normalizeTypography(contactUrl)}`, 'bullet'));
  lines.push(line(`- ${lng === 'en' ? 'Book a call' : 'Beratungstermin buchen'}: ${normalizeTypography(bookingUrl)}`, 'bullet'));
  lines.push(line(`- ${copy.legalNotice}`, 'small'));

  return {
    lines,
    domain,
    generatedAt: formatDateIso(new Date(), lng),
    reportWebsite: base,
    locale: lng
  };
}

function styleForKind(kind = 'body') {
  switch (kind) {
    case 'title':
      return { font: 'F2', size: 15, leading: 18, maxChars: 78, x: PAGE_MARGIN_LEFT };
    case 'subtitle':
      return { font: 'F1', size: 10.5, leading: 14, maxChars: 88, x: PAGE_MARGIN_LEFT };
    case 'section':
      return { font: 'F2', size: 12, leading: 15, maxChars: 86, x: PAGE_MARGIN_LEFT };
    case 'subsection':
      return { font: 'F2', size: 10.5, leading: 14, maxChars: 86, x: PAGE_MARGIN_LEFT };
    case 'meta':
      return { font: 'F1', size: 10, leading: 13, maxChars: 92, x: PAGE_MARGIN_LEFT };
    case 'small':
      return { font: 'F1', size: 9, leading: 12, maxChars: 96, x: PAGE_MARGIN_LEFT };
    case 'bullet':
      return { font: 'F1', size: 10, leading: 13, maxChars: 86, x: PAGE_MARGIN_LEFT + 8 };
    case 'spacer':
      return { font: 'F1', size: 10, leading: 8, maxChars: 0, x: PAGE_MARGIN_LEFT };
    default:
      return { font: 'F1', size: 10, leading: 13, maxChars: 92, x: PAGE_MARGIN_LEFT };
  }
}

function wrapLineItems(items = []) {
  const wrapped = [];
  for (const item of items) {
    const style = styleForKind(item.kind);
    if (item.kind === 'spacer') {
      wrapped.push({ ...item, wrappedText: '' });
      continue;
    }

    const parts = wrapText(item.text || '', style.maxChars || MAX_CHARS_PER_LINE);
    parts.forEach((part) => wrapped.push({ ...item, wrappedText: part }));
  }
  return wrapped;
}

function paginateItems(items = []) {
  const pages = [];
  let page = [];
  let currentY = BODY_START_Y;

  for (const item of items) {
    const style = styleForKind(item.kind);
    const nextY = currentY - style.leading;

    if (nextY < BODY_END_Y && page.length) {
      pages.push(page);
      page = [];
      currentY = BODY_START_Y;
    }

    page.push(item);
    currentY -= style.leading;
  }

  if (!pages.length && !page.length) pages.push([]);
  if (page.length) pages.push(page);
  return pages;
}

function buildPdfPageStream(lines = [], options = {}) {
  const commands = [];
  const {
    generatedAt = '',
    reportWebsite = '',
    pageNumber = 1,
    pageCount = 1,
    locale = 'de',
    includeLogo = false
  } = options;

  if (includeLogo) {
    commands.push('q');
    commands.push(`24 0 0 24 ${PAGE_MARGIN_LEFT} 790 cm`);
    commands.push('/Im1 Do');
    commands.push('Q');
  }

  commands.push('BT');
  commands.push('/F2 11 Tf');
  commands.push(`${includeLogo ? PAGE_MARGIN_LEFT + 32 : PAGE_MARGIN_LEFT} 807 Td`);
  commands.push(`<${textToPdfHex('Komplett Webdesign')}> Tj`);
  commands.push('ET');

  if (generatedAt) {
    commands.push('BT');
    commands.push('/F1 9 Tf');
    commands.push(`${PAGE_WIDTH - PAGE_MARGIN_RIGHT - 140} 807 Td`);
    commands.push(`<${textToPdfHex(generatedAt)}> Tj`);
    commands.push('ET');
  }

  commands.push('0.82 G');
  commands.push(`${PAGE_MARGIN_LEFT} ${HEADER_DIVIDER_Y} m ${PAGE_WIDTH - PAGE_MARGIN_RIGHT} ${HEADER_DIVIDER_Y} l S`);
  commands.push('0 G');

  let currentY = BODY_START_Y;
  for (const item of lines) {
    const style = styleForKind(item.kind);
    if (item.kind !== 'spacer') {
      commands.push('BT');
      commands.push(`/${style.font} ${style.size} Tf`);
      commands.push(`${style.x} ${currentY} Td`);
      commands.push(`<${textToPdfHex(item.wrappedText || '')}> Tj`);
      commands.push('ET');
    }
    currentY -= style.leading;
  }

  commands.push('0.82 G');
  commands.push(`${PAGE_MARGIN_LEFT} ${FOOTER_DIVIDER_Y} m ${PAGE_WIDTH - PAGE_MARGIN_RIGHT} ${FOOTER_DIVIDER_Y} l S`);
  commands.push('0 G');

  const copy = TEXT[localeFrom(locale)];
  const footerLeft = `${copy.footerWebsiteLabel} ${reportWebsite || 'https://komplettwebdesign.de'}`;
  const footerRight = `${copy.pageLabel} ${pageNumber}/${pageCount}`;

  commands.push('BT');
  commands.push('/F1 9 Tf');
  commands.push(`${PAGE_MARGIN_LEFT} 28 Td`);
  commands.push(`<${textToPdfHex(footerLeft)}> Tj`);
  commands.push('ET');

  commands.push('BT');
  commands.push('/F1 9 Tf');
  commands.push(`${PAGE_WIDTH - PAGE_MARGIN_RIGHT - 70} 28 Td`);
  commands.push(`<${textToPdfHex(footerRight)}> Tj`);
  commands.push('ET');

  return commands.join('\n');
}

function parsePngRgba(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('Unsupported PNG image.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.toString('ascii', offset, offset + 4);
    offset += 4;

    if (offset + length + 4 > buffer.length) break;
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    offset += 4; // crc

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!width || !height || !idatChunks.length) {
    throw new Error('PNG data is incomplete.');
  }

  if (bitDepth !== 8 || ![6, 2].includes(colorType) || interlace !== 0) {
    throw new Error('PNG format is not supported for PDF logo embedding.');
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = zlib.inflateSync(compressed);
  const channels = colorType === 6 ? 4 : 3;
  const bytesPerPixel = channels;
  const rowLength = width * channels;
  const expectedLength = (rowLength + 1) * height;
  if (inflated.length < expectedLength) {
    throw new Error('PNG data length mismatch.');
  }

  const rgbaOrRgb = Buffer.alloc(width * height * channels);
  const prevRow = Buffer.alloc(rowLength);
  let inOffset = 0;
  let outOffset = 0;

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[inOffset];
    inOffset += 1;

    for (let col = 0; col < rowLength; col += 1) {
      const raw = inflated[inOffset];
      inOffset += 1;

      const left = col >= bytesPerPixel ? rgbaOrRgb[outOffset + col - bytesPerPixel] : 0;
      const up = prevRow[col];
      const upLeft = col >= bytesPerPixel ? prevRow[col - bytesPerPixel] : 0;

      let value;
      switch (filterType) {
        case 0:
          value = raw;
          break;
        case 1:
          value = (raw + left) & 0xFF;
          break;
        case 2:
          value = (raw + up) & 0xFF;
          break;
        case 3:
          value = (raw + Math.floor((left + up) / 2)) & 0xFF;
          break;
        case 4:
          value = (raw + paeth(left, up, upLeft)) & 0xFF;
          break;
        default:
          throw new Error('Unsupported PNG filter type.');
      }

      rgbaOrRgb[outOffset + col] = value;
    }

    rgbaOrRgb.copy(prevRow, 0, outOffset, outOffset + rowLength);
    outOffset += rowLength;
  }

  if (colorType === 2) {
    const alpha = Buffer.alloc(width * height, 255);
    return { width, height, rgb: rgbaOrRgb, alpha };
  }

  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);
  for (let i = 0, rgbOffset = 0, aOffset = 0; i < rgbaOrRgb.length; i += 4) {
    rgb[rgbOffset++] = rgbaOrRgb[i];
    rgb[rgbOffset++] = rgbaOrRgb[i + 1];
    rgb[rgbOffset++] = rgbaOrRgb[i + 2];
    alpha[aOffset++] = rgbaOrRgb[i + 3];
  }

  return { width, height, rgb, alpha };
}

function resolveLogoPath() {
  const configured = String(process.env.WEBSITE_TESTER_PDF_LOGO || '').trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return DEFAULT_LOGO_PATH;
}

function loadLogoImage() {
  const logoPath = resolveLogoPath();
  if (!logoPath || !fs.existsSync(logoPath)) return null;

  try {
    const buffer = fs.readFileSync(logoPath);
    const parsed = parsePngRgba(buffer);
    return {
      ...parsed,
      path: logoPath
    };
  } catch {
    return null;
  }
}

function buildAsciiHexStreamObject(dictContent, dataBuffer) {
  const hexData = `${Buffer.from(dataBuffer).toString('hex').toUpperCase()}>`;
  const streamBody = `${hexData}\n`;
  const length = Buffer.byteLength(streamBody, 'utf8');
  return `<< ${dictContent} /Filter /ASCIIHexDecode /Length ${length} >>\nstream\n${streamBody}endstream`;
}

function createPdfFromPages(pages = [[]], options = {}) {
  const objects = [];

  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('<< /Type /Pages /Kids [] /Count 0 >>');
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let logoImageId = null;
  if (options.logo && options.logo.rgb && options.logo.alpha) {
    const alphaImageId = addObject(buildAsciiHexStreamObject(
      `/Type /XObject /Subtype /Image /Width ${options.logo.width} /Height ${options.logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8`,
      options.logo.alpha
    ));

    logoImageId = addObject(buildAsciiHexStreamObject(
      `/Type /XObject /Subtype /Image /Width ${options.logo.width} /Height ${options.logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${alphaImageId} 0 R`,
      options.logo.rgb
    ));
  }

  const pageIds = [];
  const pageCount = pages.length;
  pages.forEach((pageLines, index) => {
    const stream = buildPdfPageStream(pageLines, {
      generatedAt: options.generatedAt,
      reportWebsite: options.reportWebsite,
      pageNumber: index + 1,
      pageCount,
      locale: options.locale,
      includeLogo: !!logoImageId
    });

    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const resources = logoImageId
      ? `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Im1 ${logoImageId} 0 R >> >>`
      : `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`;

    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((obj, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function buildPdfFilename(domain = '', locale = 'de') {
  const safeDomain = normalizeTypography(domain || 'website')
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'website';
  const suffix = localeFrom(locale) === 'en' ? 'optimization-report' : 'optimierungsreport';
  return `${safeDomain}-${suffix}.pdf`;
}

export function buildWebsiteTesterReport({ lead = {}, result = {}, locale = 'de' } = {}) {
  const lng = localeFrom(locale || lead.locale);
  const detailed = buildDetailedLines({ locale: lng, lead, result });
  const wrapped = wrapLineItems(detailed.lines);
  const pages = paginateItems(wrapped);
  const logo = loadLogoImage();

  const buffer = createPdfFromPages(pages, {
    generatedAt: detailed.generatedAt,
    reportWebsite: detailed.reportWebsite,
    locale: lng,
    logo
  });

  const filename = buildPdfFilename(lead.domain || result.finalUrl || 'website', lng);

  return {
    buffer,
    filename,
    pageCount: pages.length,
    lineCount: wrapped.length,
    locale: lng
  };
}

export const __testables = {
  localeFrom,
  normalizeTypography,
  wrapText,
  buildPdfFilename,
  createPdfFromPages,
  encodeWinAnsi,
  textToPdfHex,
  parsePngRgba,
  wrapLineItems,
  paginateItems
};
