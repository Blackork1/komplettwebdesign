import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';

export const promptVersion = '2026-07-14.2';
const SEO_BRIEF_INPUT_KEYS = [
  'topic', 'inventory', 'internalLinks', 'sourceReferences', 'pricingContext', 'learningRules'
];

export function buildSeoBriefPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Erstelle ein umsetzbares SEO-Briefing ausschließlich aus dem gewählten Thema, dem Seiteninventar, den freigegebenen Links und den bereitgestellten Quellen.',
      'Plane Suchintention, Zielgruppe, Leserproblem, Geschäftsziel, Gliederung, lokale Beispiele und eine sinnvolle Länge ohne künstliche Textverlängerung.',
      'Berücksichtige die freigegebenen Lernregeln im Feld learningRules als zusätzliche überprüfbare Planungsanforderungen.',
      'Wähle genau fünf bis sieben FAQ-Fragen und ausschließlich freigegebene interne Links; markiere zeitkritische Aussagen als quellenpflichtig.'
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, SEO_BRIEF_INPUT_KEYS))
  };
}
