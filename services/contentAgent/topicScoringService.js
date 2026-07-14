export const TOPIC_SCORING_VERSION = 'topic-scoring-v2';

function clamp(value) {
  return Math.min(10, Math.max(0, Number(value) || 0));
}

function requireCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('Der Kandidat muss als Objekt übergeben werden.');
  }
  return candidate;
}

export function scoreTopic(candidate) {
  requireCandidate(candidate);
  const weeklyWebResearch = candidate.source === 'openai_weekly_web_research';
  const base = weeklyWebResearch
    ? clamp(candidate.businessValue) * 0.27 +
      clamp(candidate.searchOpportunity) * 0.23 +
      clamp(candidate.problemPurchaseProximity) * 0.14 +
      clamp(candidate.internalLinkPotential) * 0.09 +
      clamp(candidate.clusterFit) * 0.09 +
      clamp(candidate.localRelevance) * 0.08 +
      clamp(candidate.gscRelevance) * 0.10
    : clamp(candidate.businessValue) * 0.30 +
      clamp(candidate.searchOpportunity) * 0.25 +
      clamp(candidate.problemPurchaseProximity) * 0.15 +
      clamp(candidate.internalLinkPotential) * 0.10 +
      clamp(candidate.clusterFit) * 0.10 +
      clamp(candidate.localRelevance) * 0.10;
  const finalScore = Math.round((base - clamp(candidate.cannibalizationRisk) * 0.20) * 100) / 100;

  return {
    ...candidate,
    finalScore,
    eligible: candidate.businessValue >= 7 && finalScore >= 7 && candidate.cannibalizationRisk <= 4
  };
}

export function selectBestTopic(candidates = []) {
  const normalizedCandidates = candidates ?? [];
  if (!Array.isArray(normalizedCandidates)) {
    throw new TypeError('Die Themenkandidaten müssen als Array übergeben werden.');
  }
  return normalizedCandidates
    .map(scoreTopic)
    .filter((candidate) => candidate.eligible)
    .reduce((best, candidate) => (
      !best || candidate.finalScore > best.finalScore ? candidate : best
    ), null);
}
