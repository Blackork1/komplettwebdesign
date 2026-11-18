import { SITE_FACTS } from './siteFacts.js';
import { packages as fallbackPackages } from '../data/packages.js';
import { INDUSTRY_DIRECTORY } from '../data/industryDirectory.js';
import { DISTRICT_PAGES } from '../data/districtPages.js';
import { headerNavigation } from '../data/siteNavigation.js';
import { HANDWERKER_PAGE, HANDWERKER_FAQ } from '../data/handwerkerPage.js';
import { NICHE_PAGES } from '../services/nichePageViewModel.js';
import { interpolatePricingTokens } from '../util/pricingViewModel.js';

// /llms.txt (Übersicht mit Links) und /llms-full.txt (zusätzlich Pakete, Branchenseiten mit FAQ und Bezirke).
// Branchen, Bezirke und Leistungen kommen aus denselben Daten wie die Seiten selbst, Blog und Ratgeber
// liefert der Aufrufer aus der Datenbank (services/llmsListingsService.js). So bleibt die Liste aktuell.

// Kurzbeschreibungen der Leistungsseiten. Die Links selbst kommen aus der Navigation.
const SERVICE_NOTES = Object.freeze({
  '/leistungen/landingpage-erstellen-lassen': 'eine Seite für ein Angebot, eine Aktion oder eine Kampagne.',
  '/leistungen/website-relaunch': 'bestehende Website neu aufstellen, ohne Inhalte und Sichtbarkeit zu verlieren.',
  '/leistungen/website-audit': 'bestehende Website auf Technik, Inhalte und Anfragewege prüfen.',
  '/leistungen/responsives-design-mobile': 'Darstellung und Bedienung auf Smartphone, Tablet und Desktop.',
  '/leistungen/inhalte-texte-content': 'Texte und Seitenstruktur, die Leistungen verständlich erklären.',
  '/leistungen/local-seo': 'technische und inhaltliche Grundlagen lokaler Sichtbarkeit in Berlin.',
  '/leistungen/rechtliches-sicherheit': 'Impressum, Datenschutz, Cookie-Hinweise und technische Sicherheit, ohne Rechtsberatung.',
  '/leistungen/website-wartung': 'Updates, Backups und Betreuung nach dem Start.',
  '/leistungen/zusatzleistungen-webdesign': 'Zusatzleistungen wie Buchungssystem, Mehrsprachigkeit oder Texte.',
  '/leistungen/laufende-kosten-website': 'Hosting, Domain, E-Mail und Wartung im Überblick.'
});

const oneLine = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const entry = (label, url, note) => `- [${oneLine(label)}](${url})${note ? `: ${oneLine(note)}` : ''}`;

// „Webdesign Kreuzberg“ aus dem Seitentitel; das Feld label ist ein Untertitel („Kiez, Gastro, Kreativszene“).
const districtName = (page) => oneLine(String(page.metaTitle || page.h1 || page.label).split('|')[0]);

function serviceLinks() {
  const services = headerNavigation.find((item) => item.href === '/leistungen');
  return (services?.children || []).filter((child) => child.href !== '/leistungen');
}

function pricingFor(packages) {
  const start = packages.find((pkg) => String(pkg.slug || pkg.packageKey).toLowerCase() === 'start') || packages[0];
  const lowest = String(start?.priceLabel || '').replace(/^ab\s+/i, '');
  return { visiblePackages: packages, lowestPackagePriceLabel: lowest || null };
}

function listingSection(title, items, base, prefix) {
  if (!items.length) return '';
  return `\n## ${title}\n\n${items.map((item) => entry(item.title, `${base}/${prefix}/${item.slug}`, item.description)).join('\n')}\n`;
}

export function buildLlmsText(packages = fallbackPackages, { posts = [], guides = [] } = {}) {
  const base = SITE_FACTS.baseUrlFallback;
  return `# ${SITE_FACTS.brandName}

> Persönliches Webdesign und Webentwicklung für kleine Unternehmen, Selbstständige und lokale Dienstleister in Berlin und Brandenburg.

Inhaber und Ansprechpartner: ${SITE_FACTS.founderName}.
Komplett Webdesign plant und entwickelt individuelle Websites mit klaren Inhalten, responsiver Darstellung und technischer SEO-Grundlage.

## Pakete und Preise

${packages.map(pkg => `- ${pkg.name}: ${pkg.priceLabel}. ${base}${pkg.canonicalPath || `/pakete/${pkg.slug}`}`).join('\n')}

Einmalige Projektpreise richten sich nach dem vereinbarten Umfang. ${SITE_FACTS.runningCostNote}
Buchungssysteme, CMS, Shops, Mehrsprachigkeit und besondere Schnittstellen werden nach Bedarf separat geprüft und kalkuliert.
Verbindliche aktuelle Preise und Leistungsgrenzen stehen auf den verlinkten Paketseiten.

## Wichtigste Seiten

${[
    entry('Webdesign Berlin', `${base}/`, 'Hauptseite für Webdesign und Website-Erstellung in Berlin.'),
    entry('Pakete vergleichen', `${base}/pakete`, 'Umfang, Preise und Zusatzleistungen.'),
    entry('Website-Kosten in Berlin', `${base}/webdesign-berlin/kosten-preise-pakete`, 'Beispielrechnungen mit den aktuellen Paketpreisen.'),
    entry('Ablauf', `${base}/ablauf`, 'So läuft ein Website-Projekt ab, vom Erstgespräch bis zum Start.'),
    entry('Referenzen', `${base}/referenzen`, 'öffentlich dokumentierte Kundenprojekte.'),
    entry(`Über ${SITE_FACTS.founderName}`, `${base}/about`, 'Person und Zusammenarbeit.'),
    entry('Häufige Fragen', `${base}/faq`, 'Antworten zu Kosten, Ablauf, Technik und Zusammenarbeit.'),
    entry('Kontakt', `${base}/kontakt`, 'Projektanfrage und Erstgespräch.')
  ].join('\n')}

## Leistungen

${[entry('Leistungen im Überblick', `${base}/leistungen`), ...serviceLinks().map((link) => entry(link.label, `${base}${link.href}`, SERVICE_NOTES[link.href]))].join('\n')}

## Webdesign in Berliner Bezirken

${Object.entries(DISTRICT_PAGES).map(([slug, page]) => entry(districtName(page), `${base}/webdesign-berlin/${slug}`, page.metaDescription)).join('\n')}

## Websites nach Branche

${[entry('Alle Branchen', `${base}/branchen`), ...Object.values(INDUSTRY_DIRECTORY).map((industry) => entry(industry.label, `${base}${industry.href}`, industry.teaser))].join('\n')}
${listingSection('Blog', posts, base, 'blog')}${listingSection('Ratgeber', guides, base, 'ratgeber')}
## Kostenlose Werkzeuge

${entry('Website-Tester', `${base}/website-tester`, 'prüft eine Website kostenlos auf SEO, Meta-Angaben, defekte Links und KI-Sichtbarkeit.')}

## Kontakt

${SITE_FACTS.founderName} · ${SITE_FACTS.brandName}
${SITE_FACTS.address.streetAddress}, ${SITE_FACTS.address.postalCode} ${SITE_FACTS.address.addressLocality}
Telefon: ${SITE_FACTS.phoneDisplay}
E-Mail: ${SITE_FACTS.email}
Google-Unternehmensprofil: ${SITE_FACTS.googleProfileUrl}

## Weitere Dateien

- Ausführliche Fassung mit Paketdetails, Branchenseiten und häufigen Fragen: ${base}/llms-full.txt
- Paketübersicht als Markdown: ${base}/pricing.md
`;
}

function faqBlock(faq) {
  return faq.map((item) => `**${oneLine(item.q)}**\n${oneLine(item.a)}`).join('\n\n');
}

export function buildLlmsFullText(packages = fallbackPackages, listings = {}) {
  const base = SITE_FACTS.baseUrlFallback;
  const pricing = pricingFor(packages);
  const fill = (value) => interpolatePricingTokens(value, pricing, { lng: 'de' });
  const pricingDetails = buildPricingMarkdown(packages).replace(/^# .*\n+/, '').replace(/^## /gm, '### ');

  const industries = [
    ...Object.values(NICHE_PAGES).map(({ page, faq }) => ({ h1: page.hero.h1, path: page.path, description: page.metaDescription, faq })),
    { h1: HANDWERKER_PAGE.hero.h1, path: '/handwerker', description: HANDWERKER_PAGE.metaDescription, faq: HANDWERKER_FAQ }
  ].map((page) => fill(page));

  return `${buildLlmsText(packages, listings).replace(/\n## Weitere Dateien[\s\S]*$/, '\n')}
# Ausführliche Fassung

## Pakete im Detail

${pricingDetails.trim()}

## Branchenseiten im Detail

${industries.map((page) => `### ${oneLine(page.h1)}

${base}${page.path}

${oneLine(page.description)}

${faqBlock(page.faq)}`).join('\n\n')}

## Bezirksseiten im Detail

${Object.entries(DISTRICT_PAGES).map(([slug, page]) => `### ${oneLine(page.h1)}

${base}/webdesign-berlin/${slug}

${oneLine(fill(page.lead))}`).join('\n\n')}
`;
}

export function buildPricingMarkdown(packages = fallbackPackages) {
  return `# Website-Pakete von ${SITE_FACTS.brandName}

Aktuelle Paketübersicht: ${SITE_FACTS.baseUrlFallback}/pakete

${packages.map(pkg => `## ${pkg.displayName || pkg.name}

- Preis: ${pkg.priceLabel}
- Umfang: ${pkg.pageScopeShort || pkg.scope || pkg.shortDescription || 'nach Vereinbarung'}
- Details: ${SITE_FACTS.baseUrlFallback}${pkg.canonicalPath || `/pakete/${pkg.slug}`}
`).join('\n')}
${SITE_FACTS.runningCostNote}
Alle Preise gemäß § 19 UStG ohne Ausweis der Umsatzsteuer. Drittanbieter-Kosten und Zusatzleistungen werden separat vereinbart.

Kontakt: ${SITE_FACTS.founderName}, ${SITE_FACTS.email}, ${SITE_FACTS.phoneDisplay}
`;
}
