import { buildBrandPolicy } from './brandPolicy.js';
import { buildArticleHtmlContract } from '../articleHtmlContract.js';

export const promptVersion = '2026-07-13.2';

export function buildArticleRepairPrompt(input = {}) {
  const repairInput = {
    briefing: input.briefing,
    article: input.article,
    issues: input.issues
  };

  return {
    system: [
      buildBrandPolicy(),
      'Repariere ausschließlich die konkret gemeldeten Issues und bewahre alle bereits korrekten Inhalte sowie die Vorgaben des Briefings.',
      'Der Reparaturkontext besteht ausschließlich aus Briefing, Artikel und konkreten Issues; erfinde keine Fakten, Links, Leistungen, Preise oder Quellen.',
      buildArticleHtmlContract()
    ].join('\n'),
    user: JSON.stringify(repairInput)
  };
}
