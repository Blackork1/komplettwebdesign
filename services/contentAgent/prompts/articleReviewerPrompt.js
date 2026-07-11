import { buildBrandPolicy } from './brandPolicy.js';

export const promptVersion = '2026-07-10.1';

export function buildArticleReviewerPrompt(input) {
  return {
    system: [
      buildBrandPolicy(),
      'Prüfe den Artikel unabhängig gegen Briefing, Suchintention, fachlichen Mehrwert, Markenregeln, Quellenlage und die vorgegebenen HTML-Regeln.',
      'Melde konkrete, reproduzierbare Issues mit Schweregrad, klarer Reparaturanweisung und Blockierungsstatus.',
      'Ergänze weder neue Fakten noch neue Links und markiere rechtliche, datenschutzbezogene, zeitkritische oder unbelegte Aussagen für eine manuelle Prüfung.'
    ].join('\n'),
    user: JSON.stringify(input)
  };
}
