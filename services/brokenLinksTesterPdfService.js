import { buildTesterFullGuidePdf } from './testerFullGuidePdfService.js';

// The broken-links report is a flat, list-heavy document — headlines + long
// URL tables rather than the scored "category cards" the main website PDF
// renders. Instead of building a second low-level PDF engine, we normalize the
// audit result into the markdown-ish format that testerFullGuidePdfService
// already knows how to paginate and render.
//
// Classification in testerFullGuidePdfService.classifyLine:
//   "# "  -> title
//   "## " -> section
//   "### "-> subsection
//   bullet "- "
//   anything else -> body paragraph

const LOCALE_COPY = {
  de: {
    title: 'Broken-Links-Report',
    subtitle: 'Detaillierter Befund je betroffener Quellseite, Zielseite und HTTP-Status',
    summaryHeading: 'Zusammenfassung',
    domainLabel: 'Domain',
    scanModeLabel: 'Scan-Modus',
    generatedLabel: 'Erstellt am',
    visitedPagesLabel: 'Geprüfte Seiten',
    checkedLabel: 'Geprüfte Links',
    brokenLabel: 'Defekte Links',
    warningsLabel: 'Warnungen',
    okLabel: 'OK-Links',
    partialHint: 'Der Scan wurde als Teil-Ergebnis abgeschlossen. Ein erneuter Scan kann weitere Fundstellen liefern.',
    brokenHeading: 'Defekte Links (Broken)',
    warningsHeading: 'Warnungen',
    topPagesHeading: 'Top betroffene Quellseiten',
    recommendationsHeading: 'Empfohlene Schritte',
    nextStepsHeading: 'Nächste Schritte',
    fieldSource: 'Quellseite',
    fieldTarget: 'Ziel-URL',
    fieldType: 'Typ',
    fieldStatus: 'HTTP-Status',
    fieldError: 'Fehler',
    noBroken: 'Keine defekten Links im aktuellen Scan-Umfang gefunden. Sehr gut!',
    noWarnings: 'Keine Warnungen im aktuellen Scan-Umfang gefunden.',
    unknown: '—',
    recDefault: [
      'Defekte interne Links korrigieren oder durch gültige Ziele ersetzen.',
      'Defekte externe Links prüfen: aktualisieren, ersetzen oder entfernen.',
      '301-Weiterleitungen für umgezogene Seiten einrichten, um Link-Equity zu erhalten.',
      'Top-Quellseiten priorisieren: hier wirken Korrekturen am stärksten auf UX + Crawlbudget.',
      'Broken-Links-Monitoring quartalsweise wiederholen, um Regressionen früh zu erkennen.'
    ],
    next: [
      'Priorisiere Links auf Seiten mit Google-Traffic zuerst (siehe Search Console).',
      'Baue einen einfachen Fix-Workflow: Finden → 301 / Fix → Re-Check.',
      'Richte ein Monitoring ein (z.B. monatlicher automatischer Broken-Links-Scan).',
      'Bei Unklarheit: melde dich — wir priorisieren den Report gemeinsam.'
    ]
  },
  en: {
    title: 'Broken Links Report',
    subtitle: 'Detailed findings by source page, target URL, and HTTP status',
    summaryHeading: 'Summary',
    domainLabel: 'Domain',
    scanModeLabel: 'Scan mode',
    generatedLabel: 'Generated on',
    visitedPagesLabel: 'Pages scanned',
    checkedLabel: 'Checked links',
    brokenLabel: 'Broken links',
    warningsLabel: 'Warnings',
    okLabel: 'OK links',
    partialHint: 'The scan completed as a partial result. Running it again may surface additional issues.',
    brokenHeading: 'Broken links',
    warningsHeading: 'Warnings',
    topPagesHeading: 'Top affected source pages',
    recommendationsHeading: 'Recommended steps',
    nextStepsHeading: 'Next steps',
    fieldSource: 'Source page',
    fieldTarget: 'Target URL',
    fieldType: 'Type',
    fieldStatus: 'HTTP status',
    fieldError: 'Error',
    noBroken: 'No broken links found in the current scan scope. Nice!',
    noWarnings: 'No warnings found in the current scan scope.',
    unknown: '—',
    recDefault: [
      'Fix broken internal links or replace them with valid targets.',
      'Review broken external links: update, replace, or remove them.',
      'Set up 301 redirects for moved pages to preserve link equity.',
      'Prioritize top source pages — fixes here have the biggest UX + crawl-budget impact.',
      'Schedule broken-links monitoring quarterly to catch regressions early.'
    ],
    next: [
      'Prioritize links on pages with Google traffic first (see Search Console).',
      'Build a simple fix workflow: Find → 301 / Fix → Re-check.',
      'Set up monitoring (e.g. monthly automated broken-links scan).',
      'When unsure — reach out, we prioritize the report with you.'
    ]
  }
};

function localeFrom(raw) {
  return raw === 'en' ? 'en' : 'de';
}

function formatGenerated(date, lng) {
  try {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(lng === 'en' ? 'en-US' : 'de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function extractDomain(lead = {}, result = {}) {
  if (lead?.domain) return lead.domain;
  const candidate = result?.finalUrl || result?.normalizedUrl || result?.inputUrl || '';
  try {
    return new URL(candidate).hostname || candidate;
  } catch {
    return String(candidate || '').slice(0, 180);
  }
}

function slugifyDomain(rawValue = '') {
  return String(rawValue || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'website';
}

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function statusText(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value);
}

function renderEntry(entry, copy) {
  const source = clean(entry?.sourceUrl) || copy.unknown;
  const target = clean(entry?.targetUrl) || copy.unknown;
  const type = clean(entry?.targetType) || copy.unknown;
  const status = statusText(entry?.status);
  const error = clean(entry?.error) || '';

  const lines = [];
  lines.push(`- ${copy.fieldTarget}: ${target}`);
  lines.push(`  ${copy.fieldSource}: ${source}`);
  lines.push(`  ${copy.fieldType}: ${type}  |  ${copy.fieldStatus}: ${status}`);
  if (error) lines.push(`  ${copy.fieldError}: ${error}`);
  return lines.join('\n');
}

function renderTopPages(topPages = [], copy) {
  if (!Array.isArray(topPages) || !topPages.length) return '';
  const parts = [];
  parts.push(`## ${copy.topPagesHeading}`);
  for (const entry of topPages) {
    const src = clean(entry?.sourceUrl) || copy.unknown;
    const broken = Number(entry?.brokenCount || 0);
    const warn = Number(entry?.warningCount || 0);
    parts.push(`- ${src}  (${copy.brokenLabel}: ${broken}, ${copy.warningsLabel}: ${warn})`);
  }
  return parts.join('\n');
}

function renderList(title, items, emptyText, copy) {
  const parts = [];
  parts.push(`## ${title}`);
  if (!items.length) {
    parts.push(emptyText);
    return parts.join('\n');
  }
  for (let i = 0; i < items.length; i += 1) {
    const entry = items[i];
    parts.push(`### #${i + 1}`);
    parts.push(renderEntry(entry, copy));
  }
  return parts.join('\n');
}

/**
 * Builds the plaintext representation of the broken-links report, then feeds
 * it through buildTesterFullGuidePdf. Using the existing renderer keeps page
 * breaks, headers, and footers visually consistent with the rest of the PDFs.
 */
export function buildBrokenLinksTesterReport({ lead = {}, result = {}, locale = 'de' } = {}) {
  const lng = localeFrom(locale || lead.locale);
  const copy = LOCALE_COPY[lng];
  const domain = extractDomain(lead, result);
  const stats = result?.linkStats || {};
  const crawl = result?.crawlStats || {};

  const brokenLinks = Array.isArray(result?.brokenLinks) ? result.brokenLinks : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  const generatedAt = result?.fetchedAt || new Date().toISOString();

  const topPages = (() => {
    const counts = new Map();
    for (const entry of brokenLinks) {
      const key = entry?.sourceUrl || '';
      if (!key) continue;
      const bucket = counts.get(key) || { sourceUrl: key, brokenCount: 0, warningCount: 0 };
      bucket.brokenCount += 1;
      counts.set(key, bucket);
    }
    for (const entry of warnings) {
      const key = entry?.sourceUrl || '';
      if (!key) continue;
      const bucket = counts.get(key) || { sourceUrl: key, brokenCount: 0, warningCount: 0 };
      bucket.warningCount += 1;
      counts.set(key, bucket);
    }
    return Array.from(counts.values())
      .sort((a, b) => {
        const byBroken = b.brokenCount - a.brokenCount;
        if (byBroken !== 0) return byBroken;
        return b.warningCount - a.warningCount;
      })
      .slice(0, 10);
  })();

  const summaryLines = [
    `- ${copy.domainLabel}: ${domain || copy.unknown}`,
    `- ${copy.scanModeLabel}: ${result?.scanMode || copy.unknown}`,
    `- ${copy.generatedLabel}: ${formatGenerated(generatedAt, lng) || copy.unknown}`,
    `- ${copy.visitedPagesLabel}: ${crawl?.visitedPages ?? 0} / ${crawl?.plannedPages ?? 0}`,
    `- ${copy.checkedLabel}: ${stats?.totalChecked ?? 0}`,
    `- ${copy.brokenLabel}: ${stats?.brokenCount ?? 0}`,
    `- ${copy.warningsLabel}: ${stats?.warningCount ?? 0}`,
    `- ${copy.okLabel}: ${stats?.okCount ?? 0}`
  ];
  if (crawl?.partial) summaryLines.push(`- ${copy.partialHint}`);

  const parts = [];
  parts.push(`# ${copy.title}`);
  parts.push(copy.subtitle);
  parts.push('');
  parts.push(`## ${copy.summaryHeading}`);
  parts.push(summaryLines.join('\n'));

  const topPagesBlock = renderTopPages(topPages, copy);
  if (topPagesBlock) {
    parts.push('');
    parts.push(topPagesBlock);
  }

  parts.push('');
  parts.push(renderList(copy.brokenHeading, brokenLinks, copy.noBroken, copy));

  parts.push('');
  parts.push(renderList(copy.warningsHeading, warnings, copy.noWarnings, copy));

  parts.push('');
  parts.push(`## ${copy.recommendationsHeading}`);
  for (const line of copy.recDefault) parts.push(`- ${line}`);

  parts.push('');
  parts.push(`## ${copy.nextStepsHeading}`);
  for (const line of copy.next) parts.push(`- ${line}`);

  const guideText = parts.join('\n');

  const pdf = buildTesterFullGuidePdf({
    guideText,
    sourceLabel: 'broken-links',
    domain,
    locale: lng,
    generatedAt
  });

  const domainSlug = slugifyDomain(domain);
  return {
    ...pdf,
    filename: `${domainSlug}-broken-links-report.pdf`
  };
}

export const __testables = {
  localeFrom,
  extractDomain,
  slugifyDomain,
  renderEntry,
  renderList
};
