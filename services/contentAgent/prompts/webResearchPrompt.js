import { buildBrandPolicy, pickPromptInput } from './brandPolicy.js';

export const promptVersion = '2026-07-10.1';
const WEB_RESEARCH_INPUT_KEYS = ['topic', 'primaryKeyword', 'currentDate', 'regionFocus'];

export function buildWebResearchPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Recherchiere für das aktuelle Thema zwei bis sechs belastbare Primärquellen, bevorzugt offizielle Dokumentationen, Behörden oder Originalveröffentlichungen.',
      'Übernimm pro Quelle nur tatsächlich vorhandene Metadaten: Titel und HTTPS-URL sowie, falls belegt, Herausgeber, Veröffentlichungsdatum und Abrufdatum. Erfinde keine fehlenden Angaben.',
      'Wenn keine mindestens zwei belastbaren Quellen auffindbar sind, darf kein aktueller Artikel empfohlen oder geschrieben werden.'
    ].join('\n'),
    user: JSON.stringify(pickPromptInput(input, WEB_RESEARCH_INPUT_KEYS))
  };
}
