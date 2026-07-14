import { buildBrandPolicy } from './brandPolicy.js';
import { buildArticleHtmlContract } from '../articleHtmlContract.js';

export const promptVersion = '2026-07-14.3';

export function buildArticleRepairPrompt(input = {}) {
  const repairInput = {
    briefing: input.briefing,
    article: input.article,
    issues: input.issues,
    learningRules: input.learningRules
  };

  return {
    system: [
      buildBrandPolicy(),
      'Repariere ausschließlich die konkret gemeldeten Issues und bewahre alle bereits korrekten Inhalte sowie die Vorgaben des Briefings.',
      'Der Reparaturkontext besteht ausschließlich aus Briefing, Artikel, konkreten Issues und passenden freigegebenen Lernregeln; erfinde keine Fakten, Links, Leistungen, Preise oder Quellen.',
      'Berücksichtige ausschließlich die zu den ausgewählten Issues passenden freigegebenen Lernregeln im Feld learningRules.',
      buildArticleHtmlContract()
    ].join('\n'),
    user: JSON.stringify(repairInput)
  };
}
