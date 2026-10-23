import { packages } from '../data/packages.js';
import { buildPricingViewModel, interpolatePricingTokens } from './pricingViewModel.js';
import { SITE_FACTS } from '../helpers/siteFacts.js';

const fallbackPricing = buildPricingViewModel({
  visiblePackages: packages,
  lowestPackagePriceLabel: packages[0].priceLabel
});
const CURRENT_START = '{{price.start}}';
const CURRENT_BUSINESS = '{{price.business}}';
const CURRENT_GROWTH = '{{price.wachstum}}';
const CURRENT_CUSTOM = '{{price.individuell}}';
const CURRENT_PACKAGES = `Start ${CURRENT_START}, Business ${CURRENT_BUSINESS} und Wachstum ${CURRENT_GROWTH}`;

const LEGACY_COPY_REPLACEMENTS = [
  [/&amp;nbsp;|&nbsp;|&#160;/gi, ' '],
  [/&uuml;/g, 'ü'],
  [/&Uuml;/g, 'Ü'],
  [/&auml;/g, 'ä'],
  [/&Auml;/g, 'Ä'],
  [/&ouml;/g, 'ö'],
  [/&Ouml;/g, 'Ö'],
  [/&szlig;/g, 'ß'],
  [/&amp;gt;\s*(\d+)\s*%|&gt;\s*(\d+)\s*%/gi, (_match, a, b) => `Mehr als ${a || b} %`],
  [/&amp;quot;([^&]+?)&amp;quot;|&quot;([^&]+?)&quot;|&#34;([^&]+?)&#34;/g, (_match, a, b, c) => `„${a || b || c}“`],
  [/&amp;amp;/gi, '&'],
  [/&amp;/gi, '&'],
  [/&ndash;/gi, '–'],
  [/&mdash;/gi, '—'],
  [/&#39;/g, "'"],
  [/AI-Native Internet und Semantic Retrieval fuer Deutschland/g, 'AI-Native Internet und Semantic Retrieval für Deutschland'],
  [/Inhalte praezise verstehen, verknuepfen und korrekt wiedergeben koennen\./g, 'Inhalte präzise verstehen, verknüpfen und korrekt wiedergeben können.'],
  [/Fuer Blog- und Wissensseiten/g, 'Für Blog- und Wissensseiten'],
  [/Wie schreibe ich Content, der fuer Semantic Retrieval taugt\?/g, 'Wie schreibe ich Content, der für Semantic Retrieval taugt?'],
  [/Welche KPI sind fuer AI-SEO zusaetzlich relevant\?/g, 'Welche KPI sind für AI-SEO zusätzlich relevant?'],
  [/UX sorgt fuer Nutzbarkeit/g, 'UX sorgt für Nutzbarkeit'],
  [/sichtbar, verstaendlich und attraktiv/g, 'sichtbar, verständlich und attraktiv'],
  [/solides Verstaendnis fuer/g, 'solides Verständnis für'],
  [/Fuer qualitative Tests/g, 'Für qualitative Tests'],
  [/etwa fuenf Personen/g, 'etwa fünf Personen'],
  [/Fuer A\/B-Tests/g, 'Für A/B-Tests'],
  [/deutlich groessere Stichproben/g, 'deutlich größere Stichproben'],
  [/Psychologie-Hintergrund fuer UX Design/g, 'Psychologie-Hintergrund für UX Design'],
  [/sollte ich fuer Usability-Tests/g, 'sollte ich für Usability-Tests'],
  [/coden koennen fuer UX\/UI Design/g, 'coden können für UX/UI Design'],
  [/Tests moeglich/g, 'Tests möglich'],
  [/Café Website erstellen lassen Berlin - günstig ab 499€ ☕/g, `Café-Website erstellen lassen Berlin | ${CURRENT_START}`],
  [/Blumenladen Website erstellen - Webdesign für Floristen Berlin ab 499€/g, `Blumenladen-Website erstellen lassen Berlin | ${CURRENT_START}`],
  [/Basis ab 499\s*€?, mit Reservierung &\s*SEO ab 899\s*€?, individuell ab 1\.499\s*€\.?/gi, `${CURRENT_PACKAGES}; individuelle Funktionen ${CURRENT_CUSTOM}. Reservierung und zusätzliche SEO-Leistungen werden separat kalkuliert.`],
  [/Zwischen\s+499\s*€(?:\s*\(Basis\))?\s+und\s+1\.499\s*€(?:\s*\(Premium\))?\s*(?:–|-|,)?\s*(?:je nach|abhängig vom) [^.]+\.?/gi, `${CURRENT_PACKAGES}. Zusatzleistungen werden separat kalkuliert.`],
  [/499\s*\/\s*899\s*\/\s*1\.499\s*(?:€|EUR)/gi, CURRENT_PACKAGES],
  [/799\s*€\s*(?:,|\/)\s*1\.499\s*€\s*(?:,|und|\/)\s*1\.499\s*€/gi, CURRENT_PACKAGES],
  // Altbestand nach dem Einsetzen der Preise: „ab 1.499 € und 1.499 €“ (zweimal Business statt Wachstum)
  [/(?:\bab\s+)?1\.499\s*€\s+und\s+1\.499\s*€/gi, `${CURRENT_BUSINESS} und ${CURRENT_GROWTH}`],
  [/(<strong>)799\s*€(<\/strong>,\s*<strong>)1\.499\s*€(<\/strong>,\s*<strong>)1\.499\s*€(<\/strong>)/gi, `$1Start ${CURRENT_START}$2Business ${CURRENT_BUSINESS}$3Wachstum ${CURRENT_GROWTH}$4`],
  [/(<td>)Komplett Webdesign Basis(<\/td>\s*<td>)(?:499|799)\s*€(<\/td>)/gi, `$1Komplett Webdesign Start$2${CURRENT_START}$3`],
  [/(<td>)Komplett Webdesign Premium(<\/td>\s*<td>)1\.499\s*€(<\/td>)/gi, `$1Komplett Webdesign Wachstum$2${CURRENT_GROWTH}$3`],
  [/\bBasis\s*(?:ab\s*)?(?:499|799)\s*(?:€|EUR)/gi, `Start ${CURRENT_START}`],
  [/\bBusiness\s*(?:ab\s*|[:\-–]\s*)?899\s*(?:€|EUR)/gi, `Business ${CURRENT_BUSINESS}`],
  [/\bPremium\s*(?:ab\s*|[:\-–]\s*)?1\.499\s*(?:€|EUR)/gi, `Wachstum ${CURRENT_GROWTH}`],
  [/Basis\s*\(\s*799\s*€\s*\)/gi, `Start (${CURRENT_START})`],
  [/Premium\s*\(\s*1\.499\s*€\s*\)/gi, `Wachstum (${CURRENT_GROWTH})`],
  [/ab\s*499\s*(?:,-\s*)?(?:€|EUR)/gi, CURRENT_START],
  [/(?<![\d.])499\s*(?:€|EUR)/gi, CURRENT_START],
  [/(?<![\d.])899\s*(?:€|EUR)/gi, CURRENT_BUSINESS],
  [/(<h3 class="h5">)Basis(<\/h3>)/gi, '$1Start$2'],
  [/(<h3 class="h5">)Premium(<\/h3>)/gi, '$1Wachstum$2'],
  [/(<td>)Basis(<\/td>)/gi, '$1Start$2'],
  [/(<td>)Premium(<\/td>)/gi, '$1Wachstum$2'],
  [/Basis-Paket/g, 'Start-Paket'],
  [/Premium-Paket/g, 'Wachstum-Paket'],
  [/Zum Basis-Paket/g, 'Zum Start-Paket'],
  [/Zum Premium-Paket/g, 'Zum Wachstum-Paket'],
  [/Basis\/Business\/Premium/g, 'Start/Business/Wachstum'],
  [/Laufende Kosten bleiben schlank und transparent\./gi, 'Laufende Kosten werden separat vereinbart.'],
  [/(?:nach aktueller Paketlogik|aktueller Paketpreis|nach aktuellem Paketumfang)/gi, CURRENT_START],
  [/aktueller Business-Paketrahmen/gi, CURRENT_BUSINESS],
  [/aktuelle Paketlogik/gi, CURRENT_START],
  [/tel:\+49\s*1525\s*4350378|tel:\+49\s*1551\s*245048/g, () => `tel:${SITE_FACTS.phone}`],
  [/\+49[\s.-]*1525[\s.-]*4350378/g, () => SITE_FACTS.phoneDisplay],
  [/\+49[\s.-]*1551[\s.-]*245048/g, () => SITE_FACTS.phoneDisplay],
  [/href="\/downloads\/vorteile-professionelle-website\.pdf"/g, 'href="/webdesign-berlin/kosten-preise-pakete"'],
  [/PDF: Vor- (?:&amp;|&)\s*Nachteile im Überblick \(bald verfügbar\)/g, 'Kosten- und Paketlogik ansehen'],
  [/\/pakete\/basis/g, '/pakete/start'],
  [/\/pakete\/premium/g, '/pakete/wachstum'],
  [/href="\/pricing"/g, 'href="/webdesign-berlin/kosten-preise-pakete"'],
  [/href='\/pricing'/g, "href='/webdesign-berlin/kosten-preise-pakete'"],
  [/href="blog\/was-ist-webdesign-11-woechiger-guide"/g, 'href="/blog/was-ist-webdesign-11-woechiger-guide"'],
  [/href='blog\/was-ist-webdesign-11-woechiger-guide'/g, "href='/blog/was-ist-webdesign-11-woechiger-guide'"],
  [/href="\/webdesign-cafe/g, 'href="/branchen/webdesign-cafe'],
  [/href='\/webdesign-cafe/g, "href='/branchen/webdesign-cafe"],
  [/href="\/branchen\/webdesign-cafe\/kosten"/g, 'href="/webdesign-cafe/kosten"'],
  [/href='\/branchen\/webdesign-cafe\/kosten'/g, "href='/webdesign-cafe/kosten'"],
  [/href="\/branchen\/webdesign-blumenladen><strong>/g, 'href="/branchen/webdesign-blumenladen"><strong>'],
  [/href='\/branchen\/webdesign-blumenladen><strong>/g, "href='/branchen/webdesign-blumenladen'><strong>"],
  [/Bietet ihr auch Online-Reservierungen an\?/g, 'Kann ein Online-Reservierungssystem eingeplant werden?'],
  [/Ja\. Gäste können direkt über die Website Tische buchen – inkl\. Bestätigungs-E-Mail und optionaler Terminverwaltung\./g, 'Ja. Ein Reservierungssystem kann als Zusatzleistung geprüft und separat kalkuliert werden.'],
  [/Reservierungen 24\/7/g, 'Reservierungsanfragen klar ermöglichen'],
  [/Reservierungen 24\/7, direkte Kommunikation/g, 'Reservierungsanfragen, direkte Kommunikation'],
  [/Online-Termin(?:buchung)?\s*24\/7/gi, 'Online-Terminbuchung'],
  [/Online-Buchung\s*24\/7/gi, 'Online-Buchung'],
  [/24\/7\s*Buchung\s*[–-]\s*optional mit Tools wie Doctolib, samedi oder jameda\./gi, 'Terminbuchung kann optional mit passenden Tools wie Doctolib, samedi oder jameda geprüft werden.'],
  [/Inspektion, TÜV, Reifenwechsel\s*[–-]\s*24\/7 Termin anfragen oder buchen\./gi, 'Inspektion, TÜV, Reifenwechsel: Termine können klar angefragt oder optional gebucht werden.'],
  [/24\/7 Termine vereinbaren\s*[–-]\s*auch außerhalb der Öffnungszeiten\./gi, 'Termine online anfragen oder vereinbaren, auch außerhalb direkter Telefonzeiten.'],
  [/Beratung\s*24\/7 anfragbar\s*[–-]\s*weniger Telefonaufwand, höhere Conversion\./gi, 'Beratungen online anfragbar: weniger Telefonaufwand und klarere Anfragewege.'],
  [/Mehr Buchungen dank 24\/7-Buchungssystem/gi, 'Buchungsanfragen über ein optionales Buchungssystem'],
  [/24\/7 Buchungen\s*(?:&amp;|&)\s*klare Prozesse/gi, 'Buchungsanfragen und klare Prozesse'],
  [/Online-Buchung 24\/7\s*[–-]\s*weniger Telefonaufwand/gi, 'Online-Buchung als Zusatzfunktion: weniger Telefonaufwand'],
  [/arbeitet\s*24\/7\s*auf deiner Seite/gi, 'kann auch außerhalb deiner Öffnungszeiten auf deiner Seite verfügbar sein'],
  [/<strong>24\/7<\/strong>\s*[–-]/gi, '<strong>Erreichbarkeit</strong> -'],
  [/Zudem können Sie rund um die Uhr neue Kunden gewinnen, da Ihre Website 24\/7 erreichbar ist\./g, 'Deine Website ist dauerhaft abrufbar; ob daraus Anfragen entstehen, hängt von Angebot, Sichtbarkeit und klaren Kontaktwegen ab.'],
  [/da Ihre Website 24\/7 erreichbar ist/gi, 'weil deine Website dauerhaft abrufbar ist'],
  [/SEO sorgt dauerhaft für Sichtbarkeit in Google (?:&amp;|&)\s*Maps\./g, 'SEO kann eine bessere technische und inhaltliche Grundlage für lokale Sichtbarkeit in Google und Maps schaffen.'],
  [/Top Rankings/g, 'SEO-Grundlagen'],
  [/garantierte Top-Rankings/gi, 'bestimmte Top-Rankings'],
  [/Platz\s*1\s+bei\s+Google/gi, 'bestimmte Platzierungen bei Google'],
  [/Top-Ranking/gi, 'Sichtbarkeit'],
  [/Gute Rankings brauchen Zeit, Geduld und kontinuierliche Arbeit\./g, 'Gute lokale Sichtbarkeit braucht Zeit, passende Inhalte und kontinuierliche Pflege.'],
  [/Webdesign Berlin – Moderne Websites ab 499€ \| Sprachenatelier/g, 'Webdesign Berlin – Moderne Websites nach aktueller Paketlogik | Beispiel'],
  [/rechtlich einwandfrei und technisch sicher/gi, 'technisch sauber vorbereitet und nachvollziehbar betreibbar'],
  [/rechtlich abgesichert und technisch geschützt/gi, 'technisch sauber vorbereitet und geschützt'],
  [/rechtlich abgesichert/gi, 'technisch sauber vorbereitet'],
  [/rechtssicher/gi, 'technisch sauber eingebunden'],
  [/rechtskonform/gi, 'datenschutzbewusst vorbereitet'],
  [/DSGVO-konform/gi, 'datenschutzbewusst vorbereitet'],
  [/Wir erstellen für dich ein vollständiges Impressum mit allen notwendigen Angaben\./g, 'Ich binde ein von dir geliefertes oder extern geprüftes Impressum technisch ein.'],
  [/Wir achten darauf, dass dein Impressum alle Anforderungen erfüllt und technisch sauber eingebunden ist\./g, 'Die rechtliche Prüfung sollte über dich, einen spezialisierten Anbieter oder eine Rechtsberatung erfolgen.'],
  [/Wir erstellen eine vollständige Datenschutzerklärung, die alle Mindestangaben enthält\./g, 'Ich binde eine von dir gelieferte oder extern geprüfte Datenschutzerklärung technisch ein.'],
  [/Wir passen die Datenschutzerklärung an deine konkret genutzten Tools und Dienste an – nur so ist sie technisch sauber eingebunden\./g, 'Die Datenschutzerklärung sollte an die tatsächlich genutzten Tools und Dienste angepasst und bei Bedarf extern geprüft werden.'],
  [/Wir implementieren Cookie-Banner, die alle Anforderungen erfüllen\./g, 'Ich binde Cookie-\/Consent-Tools nach dem vereinbarten Setup technisch ein.'],
  [/Bereit für eine technisch sauber eingebundene Website\?/g, 'Bereit für ein technisch sauberes Website-Setup?'],
  [/Conversion-Rate steigern/gi, 'Anfragewege unterstützen'],
  [/keine versteckten Kosten/gi, 'Kosten werden vor der Umsetzung getrennt besprochen'],
  [/alles inklusive/gi, 'klar abgegrenzter Umfang']
];

export function normalizeLegacyPublicCopy(value, pricing = fallbackPricing) {
  if (typeof value === 'string') {
    const normalized = LEGACY_COPY_REPLACEMENTS.reduce(
      (current, [pattern, replacement]) => current.replace(pattern, replacement),
      value
    );
    return interpolatePricingTokens(normalized, pricing);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeLegacyPublicCopy(item, pricing));
  }

  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeLegacyPublicCopy(item, pricing)])
    );
  }

  return value;
}

export function stripEmbeddedStructuredData(html) {
  return String(html || '').replace(/<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script\s*>/gi, '');
}
