import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';
import { buildArticleHtmlContract } from '../articleHtmlContract.js';

export const promptVersion = '2026-07-13.2';
const ARTICLE_WRITER_INPUT_KEYS = ['briefing', 'pricingContext'];

export function buildArticleWriterPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Schreibe den Artikel strikt nach dem Briefing und erfülle die dort festgelegte Suchintention sowie den konkreten Lesernutzen.',
      'Nutze nur interne Links, externe Quellen, Leistungen und Fakten aus dem Briefing.',
      'Die drei CTA stehen an den Positionen blog_early, blog_mid und blog_final; die sichtbaren FAQ müssen mit dem FAQ-JSON übereinstimmen.',
      buildArticleHtmlContract()
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, ARTICLE_WRITER_INPUT_KEYS))
  };
}
