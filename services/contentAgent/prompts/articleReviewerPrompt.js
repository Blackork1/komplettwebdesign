import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';

export const promptVersion = '2026-07-10.1';
const ARTICLE_REVIEWER_INPUT_KEYS = ['briefing', 'article', 'sourceReferences'];

export function buildArticleReviewerPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Prüfe den Artikel unabhängig gegen Briefing, Suchintention, fachlichen Mehrwert, Markenregeln, Quellenlage und die vorgegebenen HTML-Regeln.',
      'Melde konkrete, reproduzierbare Issues mit Schweregrad, klarer Reparaturanweisung und Blockierungsstatus.',
      'Ergänze weder neue Fakten noch neue Links und markiere rechtliche, datenschutzbezogene, zeitkritische oder unbelegte Aussagen für eine manuelle Prüfung.'
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, ARTICLE_REVIEWER_INPUT_KEYS))
  };
}
