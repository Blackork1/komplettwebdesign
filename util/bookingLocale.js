const LOCALE_MARKER_RE = /\[locale:(de|en)\]/i;

export function normalizeLocale(locale) {
  const normalized = String(locale ?? "").trim().toLowerCase();
  return normalized === "en" || normalized.startsWith("en-") ? "en" : "de";
}

export function addLocaleMarker(note, locale) {
  const normalizedLocale = normalizeLocale(locale);
  const raw = typeof note === "string" ? note.trim() : "";

  if (!raw) return `[locale:${normalizedLocale}]`;
  if (LOCALE_MARKER_RE.test(raw)) return raw;

  return `${raw}\n[locale:${normalizedLocale}]`;
}

export function findLocaleMarker(note) {
  if (typeof note !== "string") return null;
  const match = note.match(LOCALE_MARKER_RE);
  if (!match?.[1]) return null;
  return normalizeLocale(match[1].toLowerCase());
}

export function extractLocaleFromNote(note, fallback = "de") {
  return findLocaleMarker(note) || normalizeLocale(fallback);
}
