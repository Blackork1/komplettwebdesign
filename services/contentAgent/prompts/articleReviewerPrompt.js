import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';

export const promptVersion = '2026-07-11.1';
const ARTICLE_REVIEWER_INPUT_KEYS = ['briefing', 'article', 'sourceReferences'];

export function buildArticleReviewerPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Prüfe den Artikel unabhängig gegen Briefing, Suchintention, fachlichen Mehrwert, Markenregeln, Quellenlage und die vorgegebenen HTML-Regeln.',
      'Melde konkrete, reproduzierbare Issues mit Schweregrad, klarer Reparaturanweisung und Blockierungsstatus.',
      'Nenne für jede Tatsachen- oder Risikoaussage als sectionHeading den exakten vorhandenen H2- oder H3-Titel und als evidenceExcerpt einen höchstens 280 Zeichen langen, wörtlich vorhandenen Ausschnitt.',
      'Gib für jedes Issue die Prüfart verificationType, den Quellenbedarf sourceRequired und den Auto-Publish-Blocker autoPublishBlocking an.',
      'Erzeuge keine HTML-IDs, Anker oder Sprungmarken; diese werden ausschließlich serverseitig aus vorhandenen Überschriften gebildet.',
      'Ergänze weder neue Fakten noch neue Links und markiere rechtliche, datenschutzbezogene, zeitkritische oder unbelegte Aussagen für eine manuelle Prüfung.'
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, ARTICLE_REVIEWER_INPUT_KEYS))
  };
}
