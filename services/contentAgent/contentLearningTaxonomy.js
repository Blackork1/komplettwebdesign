import { createHash } from 'node:crypto';

export const CONTENT_LEARNING_TAXONOMY_VERSION = 'content-learning-taxonomy-v1';

const TARGET_STAGES = Object.freeze(['seo_brief', 'writer', 'reviewer']);
const VERIFICATION_TYPES_WITH_SOURCES = new Set([
  'source', 'date', 'price', 'version', 'legal', 'privacy'
]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
const UNSAFE_RULE_TEXT = /<|>|<%|%>|```|\b(?:system|assistant|developer|user)\s*:/iu;

function category({ label, description, defaultRule, expectedEffect, overfitWarning, signals }) {
  return Object.freeze({
    label,
    description,
    defaultRule,
    expectedEffect,
    overfitWarning,
    targetStages: TARGET_STAGES,
    signals: Object.freeze(signals)
  });
}

export const CONTENT_LEARNING_CATEGORIES = Object.freeze({
  generic_content: category({
    label: 'Zu generische Inhalte',
    description: 'Aussagen bleiben allgemein, oberflächlich oder austauschbar.',
    defaultRule: 'Formuliere jeden zentralen Abschnitt konkret für Thema und Zielgruppe und ersetze austauschbare Aussagen durch nachvollziehbare Handlungsempfehlungen.',
    expectedEffect: 'Zukünftige Artikel enthalten weniger allgemeine Standardabschnitte und mehr konkrete Substanz.',
    overfitWarning: 'Nicht jeder einführende Überblick benötigt dieselbe Detailtiefe.',
    signals: [/\bgenerisch\b/iu, /\baustauschbar\b/iu, /\bzu allgemein\b/iu, /\boberflächlich\b/iu]
  }),
  cta_repetition_or_fit: category({
    label: 'CTA-Wiederholung oder fehlende Passung',
    description: 'Kontaktaufforderungen wiederholen sich oder passen nicht zum Entscheidungsschritt.',
    defaultRule: 'Formuliere jeden CTA passend zum konkreten Entscheidungsschritt und vermeide inhaltlich gleiche Kontaktaufforderungen innerhalb eines Artikels.',
    expectedEffect: 'Die drei CTAs übernehmen unterschiedliche, zum Artikelverlauf passende Aufgaben.',
    overfitWarning: 'Die bestehenden Kontaktpfade und CTA-Positionen dürfen nicht verändert werden.',
    signals: [/\bcta(?:s)?\b/iu, /kontaktaufforderung/iu, /handlungsaufforderung/iu]
  }),
  examples_or_local_relevance: category({
    label: 'Fehlende Beispiele oder lokale Relevanz',
    description: 'Konkrete Szenarien, Branchenbeispiele oder sinnvoller lokaler Bezug fehlen.',
    defaultRule: 'Nutze mindestens zwei konkrete, thematisch passende Unternehmensszenarien und baue Berlin oder Brandenburg nur ein, wenn der lokale Bezug die Erklärung verbessert.',
    expectedEffect: 'Leser erkennen ihre eigene Situation schneller in konkreten Beispielen wieder.',
    overfitWarning: 'Lokale Bezüge dürfen nicht künstlich oder als Bezirks-Keywordliste erscheinen.',
    signals: [/\bbeispiel(?:e|en)?\b/iu, /\bszenari(?:o|en)\b/iu, /lokale[rmn]? bezug/iu, /berlin(?:er)? bezug/iu]
  }),
  decision_support: category({
    label: 'Schwache Entscheidungsunterstützung',
    description: 'Der Artikel erleichtert die beabsichtigte Entscheidung nicht ausreichend.',
    defaultRule: 'Führe den Leser zu einer nachvollziehbaren Entscheidung, indem du Kriterien, sinnvolle Alternativen und einen klaren nächsten Schritt konkret gegenüberstellst.',
    expectedEffect: 'Artikel beantworten nicht nur Fragen, sondern unterstützen die passende nächste Entscheidung.',
    overfitWarning: 'Die Entscheidungshilfe darf nicht in eine aggressive Verkaufsempfehlung kippen.',
    signals: [/entscheidungshilfe/iu, /entscheidung(?:en)? erleichter/iu, /nächste[rmn]? schritt/iu, /abwägung/iu]
  }),
  technical_precision: category({
    label: 'Unpräzise fachliche Erklärung',
    description: 'Fachliche Erklärungen bleiben ungenau oder lassen wichtige Zusammenhänge offen.',
    defaultRule: 'Erkläre fachliche Zusammenhänge präzise, praxisnah und vollständig genug für eine belastbare Entscheidung, ohne unnötige technische Details anzuhäufen.',
    expectedEffect: 'Fachliche Abschnitte werden genauer und zugleich für Unternehmer verständlich.',
    overfitWarning: 'Mehr Präzision bedeutet nicht automatisch mehr Fachbegriffe oder längere Abschnitte.',
    signals: [/fachlich(?:e|er|en)? präzi/iu, /unpräzis/iu, /ungenau/iu, /fachlich(?:e|er|en)? erklärung/iu, /wichtige[rmn]? zusammenhang/iu]
  }),
  structure_or_readability: category({
    label: 'Struktur oder Lesbarkeit',
    description: 'Aufbau, Wiederholungen oder Leserführung erschweren das Verständnis.',
    defaultRule: 'Ordne Abschnitte in einer nachvollziehbaren Leserlogik, vermeide inhaltliche Wiederholungen und formuliere Überschriften sowie Übergänge eindeutig.',
    expectedEffect: 'Artikel lassen sich schneller erfassen und ohne gedankliche Sprünge lesen.',
    overfitWarning: 'Die feste technische HTML- und Bootstrap-Struktur bleibt unverändert.',
    signals: [/lesbarkeit/iu, /leserführung/iu, /inhaltlich(?:e|er|en)? wiederholung/iu, /struktur(?:iert|ierung)?/iu, /übergang/iu]
  }),
  search_intent_coverage: category({
    label: 'Suchintention oder Themenabdeckung',
    description: 'Suchintention oder notwendige Teilfragen werden nicht ausreichend erfüllt.',
    defaultRule: 'Beantworte die primäre Suchintention vollständig und decke die entscheidenden Teilfragen ab, ohne das Thema durch irrelevante Zusatzabschnitte künstlich zu verlängern.',
    expectedEffect: 'Neue Artikel beantworten die erwartete Nutzerfrage vollständiger und fokussierter.',
    overfitWarning: 'Zusätzliche Themen dürfen die primäre Suchintention nicht verwässern.',
    signals: [/suchintention/iu, /themenabdeckung/iu, /teilfrage/iu, /nutzerfrage/iu]
  }),
  internal_linking: category({
    label: 'Interne Verlinkung',
    description: 'Interne Links sind unpassend, unnatürlich oder unterstützen den Leserweg nicht.',
    defaultRule: 'Setze ausschließlich freigegebene interne Links an Stellen, an denen sie eine konkrete Vertiefung oder den logisch nächsten Schritt für den Leser anbieten.',
    expectedEffect: 'Interne Links wirken natürlicher und führen gezielter zu passenden Leistungs- oder Ratgeberseiten.',
    overfitWarning: 'Die Zahl und erlaubten Ziele interner Links werden weiterhin vom Briefing begrenzt.',
    signals: [/interne[rmn]? link/iu, /interne[rmn]? verlinkung/iu, /linkziel/iu, /ankertext/iu]
  }),
  claims_and_sources: category({
    label: 'Aussagen und Quellen',
    description: 'Belegpflichtige Aussagen sind nicht ausreichend abgesichert.',
    defaultRule: 'Kennzeichne aktuelle, rechtliche, technische, versionsbezogene und preisbezogene Aussagen frühzeitig als quellenpflichtig und verwende nur die im Briefing freigegebenen Quellen.',
    expectedEffect: 'Risikobehaftete Tatsachenbehauptungen werden früher erkannt und nachvollziehbar belegt.',
    overfitWarning: 'Zeitloses Grundlagenwissen benötigt nicht automatisch externe Quellen.',
    signals: [/\bquelle(?:n)?\b/iu, /unbelegt/iu, /tatsachenbehauptung/iu, /aktuelle[rmn]? aussage/iu]
  }),
  tone_or_brand_fit: category({
    label: 'Tonalität oder Markenpassung',
    description: 'Du-Ansprache, Vertrauenswirkung oder Markenstil passen nicht.',
    defaultRule: 'Schreibe professionell, verständlich und vertrauenswürdig im deutschen Du-Ton und ersetze übertriebene Werbeversprechen durch konkrete, nachvollziehbare Erklärungen.',
    expectedEffect: 'Neue Artikel klingen konsistenter nach Komplett Webdesign und weniger nach austauschbarem Werbetext.',
    overfitWarning: 'Der Stil soll natürlich bleiben und nicht aus starren wiederkehrenden Formulierungen bestehen.',
    signals: [/tonalität/iu, /marken(?:stil|wirkung|passung)/iu, /du-ansprache/iu, /werbeversprechen/iu]
  }),
  performance_visibility: category({
    label: 'Organische Sichtbarkeit',
    description: 'Der Artikel baut trotz belastbarer Messdauer weniger organische Sichtbarkeit als die Vergleichsgruppe auf.',
    defaultRule: 'Plane eine vollständige Suchintentionsabdeckung und passende interne Links, damit der Artikel realistische Sichtbarkeit aufbauen kann.',
    expectedEffect: 'Zukünftige Artikel erhalten eine klarere Themenabdeckung und einen sinnvolleren internen Einstiegspfad.',
    overfitWarning: 'Einzelne Suchanfragen, Titel oder vorübergehende Messwerte dürfen nicht als allgemeine Regel kopiert werden.',
    signals: []
  }),
  performance_snippet_intent: category({
    label: 'Suchergebnis und Suchintention',
    description: 'Der Artikel erhält Impressionen, aber das Suchergebnis oder die Suchintention führen noch nicht zu Klicks.',
    defaultRule: 'Plane Titel, Meta-Description und Einstieg so, dass Nutzen und Suchintention präzise übereinstimmen.',
    expectedEffect: 'Suchergebnis und Artikelanfang vermitteln denselben konkreten Nutzen für die Zielgruppe.',
    overfitWarning: 'Die Regel darf nicht zu clickbaitigen Titeln oder künstlicher Keyword-Wiederholung führen.',
    signals: []
  }),
  performance_ranking: category({
    label: 'Rankingchance',
    description: 'Der Artikel besitzt Sichtbarkeit in realistischer Nähe zur ersten Ergebnisseite.',
    defaultRule: 'Vertiefe entscheidungsrelevante Teilfragen und plane interne Links, wenn ein Thema bereits nahe an der ersten Ergebnisseite sichtbar ist.',
    expectedEffect: 'Artikel nutzen vorhandene Rankingchancen mit relevanter Vertiefung und interner Verknüpfung besser.',
    overfitWarning: 'Einzelne Positionswerte sind keine dauerhafte Garantie und dürfen nicht ungeprüft verallgemeinert werden.',
    signals: []
  }),
  performance_content_engagement: category({
    label: 'Artikelwirkung und CTA',
    description: 'Organische Besucher erreichen den Artikel, nutzen den vorgesehenen nächsten Schritt aber noch nicht.',
    defaultRule: 'Ordne den CTA dem konkreten Entscheidungsschritt des Artikels zu und begründe den nächsten Schritt sichtbar.',
    expectedEffect: 'CTA und Artikelinhalt bilden einen verständlichen, thematisch passenden nächsten Schritt.',
    overfitWarning: 'CTA-Anzahl, Kontaktziel und technische Struktur bleiben durch den Artikelvertrag begrenzt.',
    signals: []
  }),
  performance_conversion_path: category({
    label: 'Anfrageweg',
    description: 'CTA-Klicks führen noch nicht zu einer abgeschickten Kontaktanfrage.',
    defaultRule: 'Stimme Artikelversprechen, CTA-Ziel und Kontaktweg so aufeinander ab, dass der erwartete nächste Schritt konsistent bleibt.',
    expectedEffect: 'Leser finden nach dem CTA einen konsistenten und verständlichen Anfrageweg vor.',
    overfitWarning: 'Geringe Fallzahlen und externe Einflüsse dürfen nicht als eindeutige Ursache dargestellt werden.',
    signals: []
  }),
  performance_positive_pattern: category({
    label: 'Bewährtes Leistungsmuster',
    description: 'Mehrere Artikel zeigen ein belastbares positives Muster gegenüber Vorperiode oder Vergleichsgruppe.',
    defaultRule: 'Erhalte nachweislich wirksame Strukturprinzipien, ohne einzelne Titel, Suchanfragen oder temporäre Messwerte zu kopieren.',
    expectedEffect: 'Nachweislich hilfreiche Strukturprinzipien bleiben in neuen Artikeln erhalten.',
    overfitWarning: 'Positive Einzelwerte dürfen nicht als allgemeine Erfolgsformel oder Rankinggarantie behandelt werden.',
    signals: []
  })
});

export const PERFORMANCE_LEARNING_CATEGORY_KEYS = Object.freeze([
  'performance_visibility',
  'performance_snippet_intent',
  'performance_ranking',
  'performance_content_engagement',
  'performance_conversion_path',
  'performance_positive_pattern'
]);

export function sanitizeLearningText(value, maxLength = 500) {
  if (typeof value !== 'string' || !Number.isInteger(maxLength) || maxLength < 1) return '';
  return value
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

export function getLearningCategory(categoryKey) {
  return Object.hasOwn(CONTENT_LEARNING_CATEGORIES, categoryKey)
    ? CONTENT_LEARNING_CATEGORIES[categoryKey]
    : null;
}

function issueText(issue) {
  return sanitizeLearningText(
    `${issue?.code || ''} ${issue?.reason || issue?.message || ''} ${issue?.instruction || issue?.repairInstruction || ''}`,
    1_200
  );
}

export function classifyLearningIssueLocally(issue) {
  const verificationType = sanitizeLearningText(issue?.verificationType, 30);
  if (issue?.sourceRequired === true || VERIFICATION_TYPES_WITH_SOURCES.has(verificationType)) {
    return { categoryKey: 'claims_and_sources', confidence: 0.98, source: 'local' };
  }
  const text = issueText(issue);
  if (!text) return null;
  for (const [categoryKey, definition] of Object.entries(CONTENT_LEARNING_CATEGORIES)) {
    if (definition.signals.some((signal) => signal.test(text))) {
      return { categoryKey, confidence: 0.9, source: 'local' };
    }
  }
  return null;
}

export function createLearningIssueFingerprint(issue) {
  const canonical = [
    sanitizeLearningText(issue?.reason || issue?.message || '', 500),
    sanitizeLearningText(issue?.instruction || issue?.repairInstruction || '', 500),
    sanitizeLearningText(issue?.verificationType || 'none', 30)
  ].map((value) => value.toLocaleLowerCase('de-DE')).join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

export function validateLearningRuleText(value) {
  const normalized = sanitizeLearningText(value, 801);
  if (normalized.length < 40 || normalized.length > 800 || UNSAFE_RULE_TEXT.test(normalized)) {
    throw Object.assign(
      new TypeError('Die Lernregel muss aus sicherem Klartext mit 40 bis 800 Zeichen bestehen.'),
      { code: 'CONTENT_LEARNING_RULE_TEXT_INVALID' }
    );
  }
  return normalized;
}
