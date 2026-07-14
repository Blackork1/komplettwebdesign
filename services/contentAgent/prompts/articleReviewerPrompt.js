import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';

export const promptVersion = '2026-07-14.2';
const ARTICLE_REVIEWER_INPUT_KEYS = ['briefing', 'article', 'sourceReferences', 'learningRules'];

export function buildArticleReviewerPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Die technische Validierung von HTML, Bootstrap-Klassen, H1, CTA, Links, FAQ, Metadaten, Slug und Bild-Alt-Text wurde bereits bestanden und serverseitig bestätigt.',
      'Prüfe ausschließlich redaktionelle Qualität, Suchintention, fachlichen Mehrwert, Verständlichkeit, konkrete Zielgruppenpassung, Markenregeln, Tatsachenbehauptungen und Quellenlage.',
      'Prüfe zusätzlich nachvollziehbar die Einhaltung der freigegebenen Lernregeln im Feld learningRules.',
      'Du darfst weder CTA noch Kontaktlinks zählen. Prüfe FAQ nicht strukturell und prüfe Metadaten, HTML oder Tracking nicht technisch. Diese technischen Merkmale dürfen weder den Score noch passed oder requiresManualReview beeinflussen.',
      'Wenn der Score unter 80 liegt oder passed false ist, muss mindestens ein redaktionelles oder faktisches blockierendes Issue mit einer wörtlich belegten Fundstelle vorliegen.',
      'Setze requiresManualReview nur bei einem ungelösten redaktionellen oder faktischen Blocker beziehungsweise bei aktuellen, rechtlichen, datenschutzbezogenen, versionsbezogenen oder statischen Preisrisiken.',
      'Melde konkrete, reproduzierbare Issues mit Schweregrad, klarer Reparaturanweisung und Blockierungsstatus.',
      'Nenne für jede Tatsachen- oder Risikoaussage als sectionHeading den exakten vorhandenen H2- oder H3-Titel und als evidenceExcerpt einen höchstens 280 Zeichen langen, wörtlich vorhandenen Ausschnitt.',
      'Gib für jedes Issue die Prüfart verificationType, den Quellenbedarf sourceRequired und den Auto-Publish-Blocker autoPublishBlocking an.',
      'Erzeuge keine HTML-IDs, Anker oder Sprungmarken; diese werden ausschließlich serverseitig aus vorhandenen Überschriften gebildet.',
      'Ergänze weder neue Fakten noch neue Links und markiere rechtliche, datenschutzbezogene, zeitkritische oder unbelegte Aussagen für eine manuelle Prüfung.'
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, ARTICLE_REVIEWER_INPUT_KEYS))
  };
}
