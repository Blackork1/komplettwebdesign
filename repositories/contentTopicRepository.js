import pool from '../util/db.js';

export async function createTopic({
  topic,
  suggestedTitle = null,
  primaryKeyword,
  secondaryKeywords = [],
  contentCluster,
  searchIntent,
  targetAudience,
  source,
  businessValue = 0,
  searchOpportunity = 0,
  problemPurchaseProximity = 0,
  internalLinkPotential = 0,
  localRelevance = 0,
  clusterFit = 0,
  cannibalizationRisk = 0,
  finalScore = 0,
  status = 'candidate'
}, db = pool) {
  const { rows } = await db.query(
    `
      INSERT INTO content_topics (
        topic,
        suggested_title,
        primary_keyword,
        secondary_keywords,
        content_cluster,
        search_intent,
        target_audience,
        source,
        business_value,
        search_opportunity,
        problem_purchase_proximity,
        internal_link_potential,
        local_relevance,
        cluster_fit,
        cannibalization_risk,
        final_score,
        status
      )
      VALUES (
        $1, $2, $3, to_jsonb($4::text[]), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17
      )
      RETURNING *
    `,
    [
      topic,
      suggestedTitle,
      primaryKeyword,
      secondaryKeywords,
      contentCluster,
      searchIntent,
      targetAudience,
      source,
      businessValue,
      searchOpportunity,
      problemPurchaseProximity,
      internalLinkPotential,
      localRelevance,
      clusterFit,
      cannibalizationRisk,
      finalScore,
      status
    ]
  );

  return rows[0] || null;
}

export async function markTopicUsed(topicId, db = pool) {
  const { rows } = await db.query(
    `
      UPDATE content_topics
      SET status = 'used',
          used_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [topicId]
  );

  return rows[0] || null;
}
