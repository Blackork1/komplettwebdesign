function normalizeWords(value) {
  return String(value || '')
    .normalize('NFC')
    .toLocaleLowerCase('de-DE')
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function requireCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('Der Kandidat muss als Objekt übergeben werden.');
  }
  return candidate;
}

function normalizePhrase(value) {
  return normalizeWords(value).join(' ');
}

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/^\/+|\/+$/g, '');
}

function titleOf(item) {
  return item?.title ?? item?.proposedTitle ?? item?.proposed_title ?? item?.topic ?? '';
}

function primaryKeywordOf(item) {
  return item?.primaryKeyword ?? item?.primary_keyword ?? item?.mainKeyword ?? item?.main_keyword ?? '';
}

function clusterOf(item) {
  return item?.contentCluster ?? item?.content_cluster ?? item?.cluster ?? '';
}

function inventoryEntries(inventory) {
  if (Array.isArray(inventory)) return inventory;
  if (!inventory || typeof inventory !== 'object') return [];
  return Object.values(inventory).flatMap((value) => Array.isArray(value) ? value : []);
}

function calculateTitleOverlap(candidateTitle, existingTitle) {
  const candidateWords = new Set(normalizeWords(candidateTitle));
  const existingWords = new Set(normalizeWords(existingTitle));
  if (!candidateWords.size) return 0;

  let matches = 0;
  for (const word of candidateWords) {
    if (existingWords.has(word)) matches += 1;
  }
  return matches / candidateWords.size;
}

export function calculateCannibalizationRisk(candidate, inventory = []) {
  requireCandidate(candidate);
  const entries = inventoryEntries(inventory);
  const candidateSlug = normalizeSlug(candidate.slug);
  const candidateKeyword = normalizePhrase(primaryKeywordOf(candidate));

  for (const entry of entries) {
    const existingSlug = normalizeSlug(entry?.slug);
    const existingKeyword = normalizePhrase(primaryKeywordOf(entry));
    if ((candidateSlug && candidateSlug === existingSlug) ||
        (candidateKeyword && candidateKeyword === existingKeyword)) {
      return 10;
    }
  }

  const candidateCluster = normalizePhrase(clusterOf(candidate));
  if (!candidateCluster) return 0;

  for (const entry of entries) {
    if (candidateCluster !== normalizePhrase(clusterOf(entry))) continue;
    if (calculateTitleOverlap(titleOf(candidate), titleOf(entry)) >= 0.70) return 6;
  }

  return 0;
}
