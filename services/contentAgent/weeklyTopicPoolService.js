import { DateTime } from 'luxon';

function assertRunId(generationRunId) {
  if (!Number.isSafeInteger(generationRunId) || generationRunId <= 0) {
    throw new TypeError('generationRunId muss eine positive sichere Ganzzahl sein.');
  }
}

function normalizePool(pool) {
  return {
    candidates: Array.isArray(pool?.candidates) ? pool.candidates : [],
    selections: Array.isArray(pool?.selections) ? pool.selections : []
  };
}

export function getWeeklyTopicPoolIdentity({ currentDate, timezone }) {
  const localDate = DateTime.fromISO(currentDate, { zone: timezone });
  if (!localDate.isValid) {
    const field = DateTime.local().setZone(timezone).isValid ? 'currentDate' : 'Zeitzone';
    throw new TypeError(`${field} ist ungültig.`);
  }

  return {
    weekStart: localDate.startOf('week').toISODate(),
    timezone
  };
}

export function listAvailableWeeklyCandidates(pool) {
  const normalized = normalizePool(pool);
  const claimedSlugs = new Set(
    normalized.selections.map(({ candidateSlug }) => candidateSlug)
  );
  return normalized.candidates.filter(({ slug }) => !claimedSlugs.has(slug));
}

export function findWeeklyCandidateForRun(pool, generationRunId) {
  assertRunId(generationRunId);
  const normalized = normalizePool(pool);
  const selection = normalized.selections.find((entry) => (
    entry.generationRunId === generationRunId
  ));
  if (!selection) return null;
  return normalized.candidates.find(({ slug }) => slug === selection.candidateSlug) || null;
}
