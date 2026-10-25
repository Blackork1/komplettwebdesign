import { SITE_FACTS } from './siteFacts.js';
import { packages as fallbackPackages } from '../data/packages.js';

export function buildLlmsText(packages = fallbackPackages) {
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

## Leistungen und Wissen

- [Webdesign Berlin](${base}/): Hauptseite für Webdesign und Website-Erstellung in Berlin, mit Bezirksseiten für Kreuzberg, Friedrichshain, Prenzlauer Berg, Charlottenburg, Lichtenberg und Mitte.
- [Pakete vergleichen](${base}/pakete): Umfang, Preise und Zusatzleistungen.
- [Website-Relaunch](${base}/leistungen/website-relaunch): bestehende Websites erneuern.
- [Local SEO](${base}/leistungen/local-seo): technische und inhaltliche Grundlagen lokaler Sichtbarkeit.
- [Website-Audit](${base}/leistungen/website-audit): bestehende Websites prüfen.
- [Ratgeber](${base}/ratgeber): Kosten, Ablauf, Relaunch und Branchen.
- [Referenzen](${base}/referenzen): öffentlich dokumentierte Kundenprojekte.
- [Über Sören Blocksdorf](${base}/about): Person und Zusammenarbeit.
- [Kontakt](${base}/kontakt): Projektanfrage und Erstgespräch.

## Kontakt

${SITE_FACTS.founderName} · ${SITE_FACTS.brandName}
${SITE_FACTS.address.streetAddress}, ${SITE_FACTS.address.postalCode} ${SITE_FACTS.address.addressLocality}
Telefon: ${SITE_FACTS.phoneDisplay}
E-Mail: ${SITE_FACTS.email}
Google-Unternehmensprofil: ${SITE_FACTS.googleProfileUrl}
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
