// Ehrliche Änderungsdaten für Sitemap und strukturierte Daten.
// Wenn viele Artikel exakt denselben updated_at-Zeitstempel tragen, stammt er von einer
// Sammel-Migration und nicht von einer inhaltlichen Änderung. Dann zählt das Veröffentlichungsdatum.

function timestampKey(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function createModifiedDateResolver(items = [], { bulkThreshold = 3 } = {}) {
  const counts = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = timestampKey(item?.updated_at);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }

  return function resolveModifiedDate(item) {
    const key = timestampKey(item?.updated_at);
    if (key && counts.get(key) >= bulkThreshold) {
      return item.published_at || item.created_at || null;
    }
    return item?.updated_at ?? null;
  };
}
