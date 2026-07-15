import { createHash } from 'node:crypto';

import {
  ARTICLE_PERFORMANCE_POLICY_VERSION,
  evaluateArticlePerformance
} from './articlePerformancePolicy.js';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
  );
}

function evidenceHash(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function buildOpportunities({ article, assessment, input, evaluatedThroughDate }) {
  return assessment.diagnoses.map((diagnosis) => ({
    postId: article.id,
    analysisKey: `article-performance:${article.id}:${diagnosis.code}`,
    opportunityType: diagnosis.code === 'snippet_or_intent_opportunity'
      ? 'meta_refresh'
      : 'content_refresh',
    primaryQuery: input.current?.[28]?.queries?.[0]?.query || null,
    score: diagnosis.code === 'snippet_or_intent_opportunity' ? 90 : 80,
    evidenceJson: {
      policyVersion: ARTICLE_PERFORMANCE_POLICY_VERSION,
      evaluatedThroughDate,
      diagnosisCode: diagnosis.code,
      impressions: Number(input.current?.[28]?.impressions || 0),
      clicks: Number(input.current?.[28]?.clicks || 0)
    },
    recommendationJson: { action: diagnosis.code }
  }));
}

export function createArticlePerformanceService({
  repository,
  enqueueExplanationJob,
  opportunityRepository,
  processPerformanceLearningEvidence,
  now = () => new Date()
} = {}) {
  if (!repository || typeof repository.listPublishedArticles !== 'function' ||
      typeof repository.getPerformanceInputs !== 'function' ||
      typeof repository.upsertPerformanceSnapshot !== 'function') {
    throw new TypeError('Ein vollständiges Artikel-Performance-Repository wird benötigt.');
  }
  if (typeof enqueueExplanationJob !== 'function') {
    throw new TypeError('Eine Funktion zum Einreihen von Jobs wird benötigt.');
  }
  if (!opportunityRepository || typeof opportunityRepository.upsertOpenOpportunities !== 'function') {
    throw new TypeError('Ein Chancen-Repository wird benötigt.');
  }

  return {
    async evaluateAllPublishedArticles({ evaluatedThroughDate, leaseGuard } = {}) {
      const articles = await repository.listPublishedArticles({ evaluatedThroughDate });
      const result = { evaluated: 0, failed: 0, explanationJobs: 0 };

      for (const article of articles) {
        try {
          await leaseGuard?.assertActive?.();
          const input = await repository.getPerformanceInputs({
            postId: article.id,
            evaluatedThroughDate
          });
          if (!input) throw new Error('Für den veröffentlichten Artikel fehlen Performance-Eingaben.');

          const assessment = evaluateArticlePerformance(input);
          const hash = evidenceHash({
            version: ARTICLE_PERFORMANCE_POLICY_VERSION,
            evaluatedThroughDate,
            input,
            assessment
          });
          const needsExplanation = assessment.learningEligible &&
            (assessment.diagnoses.length > 0 || assessment.positiveSignals.length > 0);
          const snapshot = await repository.upsertPerformanceSnapshot({
            postId: article.id,
            evaluatedThroughDate,
            articleAgeDays: input.articleAgeDays,
            windows: input.current,
            previousWindows: input.previous,
            cohort: input.cohort,
            status: assessment.status,
            diagnoses: assessment.diagnoses,
            positiveSignals: assessment.positiveSignals,
            dataEligible: assessment.dataEligible,
            learningEligible: assessment.learningEligible,
            evidenceHash: hash,
            explanationStatus: needsExplanation ? 'pending' : 'not_needed'
          });

          const opportunities = buildOpportunities({
            article,
            assessment,
            input,
            evaluatedThroughDate
          });
          if (opportunities.length > 0) {
            await opportunityRepository.upsertOpenOpportunities(opportunities);
          }

          if (snapshot?.explanation_status === 'pending') {
            await enqueueExplanationJob({
              snapshotId: snapshot.id,
              evidenceHash: hash,
              requestedAt: now().toISOString()
            });
            result.explanationJobs += 1;
          }
          result.evaluated += 1;
        } catch {
          result.failed += 1;
        }
      }

      if (typeof processPerformanceLearningEvidence === 'function') {
        try {
          const proposals = await processPerformanceLearningEvidence();
          if (Array.isArray(proposals) && proposals.length > 0) {
            result.learningProposals = proposals.length;
          }
        } catch {
          result.learningFailed = true;
        }
      }

      return result;
    }
  };
}
