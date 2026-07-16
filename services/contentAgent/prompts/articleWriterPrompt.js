import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';
import { buildArticleHtmlContract } from '../articleHtmlContract.js';

export const promptVersion = '2026-07-16.1';
const ARTICLE_WRITER_INPUT_KEYS = ['briefing', 'pricingContext', 'learningRules'];

export function buildArticleWriterPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Schreibe den Artikel strikt nach dem Briefing und erfülle die dort festgelegte Suchintention sowie den konkreten Lesernutzen.',
      'Nutze nur interne Links, externe Quellen, Leistungen und Fakten aus dem Briefing.',
      'Setze die freigegebenen Lernregeln im Feld learningRules zusätzlich zum Briefing konkret um.',
      'Binde zeitkritische Tatsachenbehauptungen mit einem sichtbaren Link auf die in briefing.sourceReferences freigegebene passende Quelle ein oder formuliere sie neutral und ohne unbelegte Entwicklung, Kausalität oder Rankingwirkung.',
      'Ein aktuelles Jahr im Titel ist nur ein Aktualitätsrahmen. Behaupte daraus im Fließtext keine neue Entwicklung, sofern die freigegebenen Quellen diese nicht ausdrücklich tragen.',
      'Die drei CTA stehen an den Positionen blog_early, blog_mid und blog_final; die sichtbaren FAQ müssen mit dem FAQ-JSON übereinstimmen.',
      buildArticleHtmlContract()
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, ARTICLE_WRITER_INPUT_KEYS))
  };
}
