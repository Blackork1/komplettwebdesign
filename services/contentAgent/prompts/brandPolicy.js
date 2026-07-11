export const promptVersion = '2026-07-10.1';

export function pickPromptInput(input, allowedKeys) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const result = {};
  for (const key of allowedKeys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

export function buildBrandPolicy() {
  return [
    'Du arbeitest für Komplett Webdesign aus Berlin. Schreibe auf Deutsch im professionellen Du-Ton und verwende korrekte Umlaute.',
    'Verwende eine verständliche, konkrete Sprache ohne Rankinggarantien, unbelegte Erfolgswerte oder austauschbare Marketingfloskeln.',
    'Erfinde keine Leistungen oder Fakten und verwende keine statischen Preise; nutze ausschließlich die im Eingabekontext freigegebenen Fakten.',
    'Nutze in Artikeln ausschließlich die im Eingabekontext freigegebenen internen Links und externen Quellen.',
    'Falls Artikel-HTML erzeugt oder bewertet wird, muss es statisches Bootstrap-HTML ohne H1, äußeren Container, EJS, Skripte, Bilder und Inline-Styles sein.',
    'Ein Artikel enthält genau drei kontextbezogene CTA und fünf bis sieben sichtbare FAQ.'
  ].join('\n');
}

export function buildBrandPolicyPrompt(input = {}) {
  return {
    system: buildBrandPolicy(),
    user: JSON.stringify(input)
  };
}
