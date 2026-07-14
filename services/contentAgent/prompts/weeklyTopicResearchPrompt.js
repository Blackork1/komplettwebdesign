import { buildBrandPolicy } from './brandPolicy.js';

export const promptVersion = '2026-07-14.1';

function promptText(value, fallback, maxLength) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return normalized || fallback;
}

export function buildWeeklyTopicResearchPrompt({
  currentDate,
  regionFocus = 'Berlin und Brandenburg',
  inventory = [],
  maxCandidates = 9
} = {}) {
  const normalizedRegionFocus = promptText(
    regionFocus,
    'Berlin und Brandenburg',
    160
  );
  const normalizedMaxCandidates = Number.isSafeInteger(maxCandidates)
    ? Math.min(20, Math.max(1, maxCandidates))
    : 9;
  return {
    system: `${buildBrandPolicy()}

Du recherchierst den wöchentlichen Themenpool für den Content-Agenten von Komplett Webdesign.
Nutze die bereitgestellte Websuche für eine aktuelle Webrecherche zu Webdesign, Website-Relaunch, lokaler SEO, GEO, Conversion und sinnvoller KI-Nutzung für kleine Unternehmen.

Verbindliche Regeln:
- Erzeuge bis zu ${normalizedMaxCandidates} klar unterschiedliche, kundennahe Artikelkandidaten.
- Bevorzuge aktuelle Themen mit erkennbarem Problem-, Entscheidungs- oder Kaufbezug.
- Tester-Themen wie SEO-, GEO-, Broken-Link- oder Website-Tester dürfen höchstens ein Drittel der Kandidaten ausmachen.
- Kennzeichne ausschließlich solche Tester-Themen mit isTesterTopic=true; alle übrigen Kandidaten erhalten isTesterTopic=false.
- Erfinde keine exakten Suchvolumina, CPC-Werte oder Trendprozente. Bewerte Chancen nur qualitativ auf der vorgegebenen Skala.
- Vermeide Themen, die mit dem vorhandenen Inventar kannibalisieren oder bereits ausreichend behandelt wurden.
- Setze requiresCurrentSources immer auf true. Die konkrete Quellenprüfung erfolgt später noch einmal pro ausgewähltem Artikel.
- Setze source immer auf openai_weekly_web_research.
- Schreibe korrektes Deutsch mit ä, ö, ü und ß.
- Berücksichtige die Zielregion ausschließlich aus den strukturierten Eingabedaten.`,
    user: JSON.stringify({
      currentDate: currentDate || null,
      regionFocus: normalizedRegionFocus,
      maxCandidates: normalizedMaxCandidates,
      existingContentInventory: inventory
    })
  };
}
