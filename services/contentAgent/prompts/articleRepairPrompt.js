import { buildBrandPolicy } from './brandPolicy.js';

export const promptVersion = '2026-07-10.1';

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
      'Der Reparaturkontext besteht ausschließlich aus Briefing, Artikel und konkreten Issues; erfinde keine Fakten, Links, Leistungen, Preise oder Quellen.'
    ].join('\n'),
    user: JSON.stringify(repairInput)
  };
}
