import { INDUSTRY_DIRECTORY } from './industryDirectory.js';

const CORE_CONTENT_AGENT_LINKS = [
  { url: '/kontakt', type: 'contact', label: 'Beratung anfragen' },
  { url: '/pakete', type: 'pricing', label: 'Website-Pakete und Preise' },
  { url: '/', type: 'service', label: 'Website erstellen lassen in Berlin' },
  { url: '/leistungen/website-relaunch', type: 'service', label: 'Website-Relaunch' },
  { url: '/leistungen/local-seo', type: 'service', label: 'Local SEO Berlin' },
  { url: '/leistungen/website-audit', type: 'service', label: 'Website-Audit' },
  { url: '/leistungen/landingpage-erstellen-lassen', type: 'service', label: 'Landingpage erstellen lassen' },
  { url: '/branchen/webdesign-blumenladen', type: 'industry', label: 'Webdesign für Blumenläden' },
  { url: '/webdesign-berlin/kosten-preise-pakete', type: 'pricing', label: 'Website-Kosten und Budgetplanung' },
  { url: '/pakete/start', type: 'pricing', label: 'Start-Paket für kompakte Websites' },
  { url: '/pakete/business', type: 'pricing', label: 'Business-Paket für kleine Unternehmen' },
  { url: '/pakete/wachstum', type: 'pricing', label: 'Wachstum-Paket für größere Websites' },
  { url: '/leistungen/laufende-kosten-website', type: 'service', label: 'Laufende Website-Kosten' },
  { url: '/leistungen/website-wartung', type: 'service', label: 'Website-Wartung und Support' },
  { url: '/blog/website-kosten-2025-einfach-erklaert', type: 'guide', label: 'Was kostet eine Website? Ratgeber' },
  { url: '/blog/website-relaunch-berlin-checkliste', type: 'guide', label: 'Website-Relaunch planen: Checkliste' },
  { url: '/ratgeber/baukasten-vs-professionelle-website', type: 'guide', label: 'Baukasten und professionelle Website vergleichen' },
  { url: '/ablauf', type: 'guide', label: 'Ablauf eines Website-Projekts' },
  { url: '/handwerker', type: 'industry', label: 'Website für Handwerker in Berlin' },
  { url: '/webdesign-berlin/lichtenberg', type: 'service', label: 'Webdesign für Betriebe in Lichtenberg' },
  { url: '/referenzen', type: 'reference', label: 'Umgesetzte Website-Projekte' },
  { url: '/website-tester', type: 'tool', label: 'Website kostenlos prüfen' }
];

// Alle Branchenseiten als empfohlene Linkziele, damit Artikel mit Branchenbezug sie verlinken.
const INDUSTRY_CONTENT_AGENT_LINKS = Object.values(INDUSTRY_DIRECTORY)
  .filter(({ href }) => !CORE_CONTENT_AGENT_LINKS.some((link) => link.url === href))
  .map(({ href, label }) => ({ url: href, type: 'industry', label }));

export const CONTENT_AGENT_LINKS = Object.freeze(
  [...CORE_CONTENT_AGENT_LINKS, ...INDUSTRY_CONTENT_AGENT_LINKS].map((link) => Object.freeze(link))
);
