import { buildBrandPolicy } from './brandPolicy.js';

export const promptVersion = '2026-07-10.1';

export function buildWebResearchPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Recherchiere für das aktuelle Thema zwei bis sechs belastbare Primärquellen, bevorzugt offizielle Dokumentationen, Behörden oder Originalveröffentlichungen.',
      'Berücksichtige pro Quelle nach Möglichkeit Titel, HTTPS-URL, Herausgeber, Veröffentlichungsdatum und Abrufdatum, ohne fehlende Angaben zu erfinden.',
      'Wenn keine mindestens zwei belastbaren Quellen auffindbar sind, darf kein aktueller Artikel empfohlen oder geschrieben werden.'
    ].join('\n'),
    user: JSON.stringify(input)
  };
}
