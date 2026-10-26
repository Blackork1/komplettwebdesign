// Ergänzt in Schrift-Angaben hinter "Inter" bzw. "Poppins" die abgestimmten Ersatzschriften
// ("Inter Fallback", "Poppins Fallback", definiert in public/css/main.css). So springt beim
// Wechsel von der Systemschrift zur Webschrift kein Text (kein Layout-Shift).
const FONT_DECLARATION = /((?:^|[;{\s])(?:font-family|font|--font-[\w-]+|--ff)\s*:\s*)([^;{}]+)/g;
const FAMILY_TOKEN = /(^|[,(\s])(["']?)(Inter|Poppins)\2(?=\s*(?:,|\)|!|$))(?!\s*,\s*["']?(?:Inter|Poppins) Fallback)/g;

// @font-face-Regeln definieren eine Schrift (genau ein Name) und bleiben unverändert.
const FONT_FACE_BLOCK = /@font-face\s*\{[^}]*\}/g;

export function addFontFallbacks(css) {
  const faces = [];
  const protectedCss = css.replace(FONT_FACE_BLOCK, (block) => `\u0000${faces.push(block) - 1}\u0000`);
  return protectedCss
    .replace(FONT_DECLARATION, (_match, prefix, value) => (
      prefix + value.replace(FAMILY_TOKEN, (_m, before, quote, family) => `${before}${quote}${family}${quote}, "${family} Fallback"`)
    ))
    .replace(/\u0000(\d+)\u0000/g, (_m, index) => faces[Number(index)]);
}

// Liefert alle Schrift-Angaben, in denen Inter/Poppins ohne Ersatzschrift stehen.
export function findMissingFontFallbacks(css) {
  const missing = [];
  for (const [, prefix, value] of css.replace(FONT_FACE_BLOCK, '').matchAll(FONT_DECLARATION)) {
    FAMILY_TOKEN.lastIndex = 0;
    if (FAMILY_TOKEN.test(value)) missing.push(`${prefix.trim()} ${value.trim()}`);
  }
  return missing;
}
