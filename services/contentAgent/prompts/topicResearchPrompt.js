import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';

export const promptVersion = '2026-07-10.1';
const TOPIC_RESEARCH_INPUT_KEYS = ['inventory', 'seedTopics', 'maxCandidates'];

export function buildTopicResearchPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Ermittle konkrete Themenkandidaten ausschließlich aus den übergebenen Seeds, Zielgruppenproblemen, Content-Clustern, Angeboten und dem Seiteninventar.',
      'Jeder Kandidat braucht eine klare Suchintention, einen konkreten Lesernutzen, ein passendes Geschäftsziel und realistische Bewertungen von null bis zehn.',
      'Kennzeichne Themen mit zeitkritischen Aussagen als quellenpflichtig und vermeide Kannibalisierung mit vorhandenen Inhalten.'
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, TOPIC_RESEARCH_INPUT_KEYS))
  };
}
