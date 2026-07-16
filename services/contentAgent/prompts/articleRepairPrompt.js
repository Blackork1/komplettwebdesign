import { buildBrandPolicy } from './brandPolicy.js';
import { buildArticleHtmlContract } from '../articleHtmlContract.js';

export const promptVersion = '2026-07-16.1';

export function buildArticleRepairPrompt(input = {}) {
  const repairInput = {
    briefing: input.briefing,
    article: input.article,
    issues: input.issues,
    sourceReferences: input.sourceReferences,
    learningRules: input.learningRules
  };

  return {
    system: [
      buildBrandPolicy(),
      'Repariere ausschließlich die konkret gemeldeten Issues und bewahre alle bereits korrekten Inhalte sowie die Vorgaben des Briefings.',
      'Der Reparaturkontext besteht ausschließlich aus Briefing, Artikel, konkreten Issues und passenden freigegebenen Lernregeln; erfinde keine Fakten, Links, Leistungen, Preise oder Quellen.',
      'Berücksichtige ausschließlich die zu den ausgewählten Issues passenden freigegebenen Lernregeln im Feld learningRules.',
      'Repariere jede zeitkritische oder quellenpflichtige Aussage entweder mit einem inhaltlich passenden, sichtbaren Link auf eine freigegebene externe Quelle aus sourceReferences oder formuliere sie neutral ohne unbelegte Entwicklung, Kausalität oder Wirkungsaussage.',
      'Ein aktuelles Jahr im Titel dient nur der redaktionellen Einordnung. Stelle daraus im Fließtext keine angeblich neu eingetretene Entwicklung oder Rankingwirkung her.',
      'Verwende Quellen nur für Aussagen, die von ihrem Titel und Kontext tatsächlich getragen werden. Wenn keine Quelle die konkrete Aussage stützt, muss die Formulierung vorsichtiger und nicht kausal werden.',
      buildArticleHtmlContract()
    ].join('\n'),
    user: JSON.stringify(repairInput)
  };
}
