import pool from '../util/db.js';
import {
  CONTENT_LEARNING_TAXONOMY_VERSION,
  getLearningCategory,
  sanitizeLearningText
} from '../services/contentAgent/contentLearningTaxonomy.js';

const FINGERPRINT = /^[0-9a-f]{64}$/;
const CLASSIFICATION_SOURCES = new Set(['local', 'provider', 'unclassified']);

function inputError(message) {
  return Object.assign(new TypeError(message), { code: 'CONTENT_LEARNING_INPUT_INVALID' });
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) throw inputError(`${label} muss positiv sein.`);
  return normalized;
}

function normalizeObservation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw inputError('Eine Lernbeobachtung muss ein Objekt sein.');
  }
  const categoryKey = sanitizeLearningText(value.categoryKey, 80);
  if (categoryKey !== 'unclassified' && !getLearningCategory(categoryKey)) {
    throw inputError('Die Lernbeobachtung verwendet keine bekannte Kategorie.');
  }
  const fingerprint = sanitizeLearningText(value.fingerprint, 64);
  if (!FINGERPRINT.test(fingerprint)) throw inputError('Der Lernfingerabdruck ist ungültig.');
  const classificationSource = sanitizeLearningText(value.classificationSource, 20);
  if (!CLASSIFICATION_SOURCES.has(classificationSource)) {
    throw inputError('Die Klassifizierungsquelle ist ungültig.');
  }
  const confidence = value.confidence == null ? null : Number(value.confidence);
  if (confidence != null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
    throw inputError('Die Klassifizierungskonfidenz ist ungültig.');
  }
  const reason = sanitizeLearningText(value.reason, 500);
  const instruction = sanitizeLearningText(value.instruction, 500);
  if (!reason || !instruction) throw inputError('Begründung und Prüfanweisung sind erforderlich.');
  return {
    categoryKey,
    fingerprint,
    reason,
    instruction,
    section: sanitizeLearningText(value.section, 180) || null,
    anchor: sanitizeLearningText(value.anchor, 220) || null,
    classificationSource,
    confidence,
    taxonomyVersion: sanitizeLearningText(value.taxonomyVersion, 80)
      || CONTENT_LEARNING_TAXONOMY_VERSION
  };
}

function normalizeClassification(value) {
  const observation = normalizeObservation({
    ...value,
    reason: value?.reason,
    instruction: value?.reason,
    section: null,
    anchor: null
  });
  return {
    fingerprint: observation.fingerprint,
    categoryKey: observation.categoryKey,
    classificationSource: observation.classificationSource,
    confidence: observation.confidence,
    reason: observation.reason,
    taxonomyVersion: observation.taxonomyVersion
  };
}

export function createContentLearningRepository(db = pool) {
  return {
    async loadReview({ postId, reviewVersion }) {
      const normalizedPostId = positiveInteger(postId, 'Die Artikel-ID');
      const normalizedReviewVersion = positiveInteger(reviewVersion, 'Die Review-Version');
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.review_version, p.generation_run_id,
               m.quality_score, m.quality_report_json
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.id = $1
          AND p.review_version = $2
          AND p.generated_by_ai = TRUE
          AND p.published = FALSE
          AND p.content_format = 'static_html'
        LIMIT 1
      `, [normalizedPostId, normalizedReviewVersion]);
      return rows[0] || null;
    },

    async loadCachedClassifications(fingerprints) {
      if (!Array.isArray(fingerprints) || fingerprints.length > 12
          || fingerprints.some((value) => !FINGERPRINT.test(value))) {
        throw inputError('Die Liste der Lernfingerabdrücke ist ungültig.');
      }
      if (fingerprints.length === 0) return [];
      const { rows } = await db.query(`
        SELECT fingerprint, category_key, classification_source, confidence,
               reason, taxonomy_version, provider_run_id
        FROM content_learning_classifications
        WHERE fingerprint = ANY($1::char(64)[])
      `, [fingerprints]);
      return rows;
    },

    async storeClassifications({ classifications, providerRunId = null }) {
      if (!Array.isArray(classifications) || classifications.length < 1 || classifications.length > 12) {
        throw inputError('Mindestens eine und höchstens zwölf Klassifizierungen sind erforderlich.');
      }
      const normalized = classifications.map(normalizeClassification);
      const runId = providerRunId == null ? null : positiveInteger(providerRunId, 'Die Provider-Run-ID');
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const rows = [];
        for (const item of normalized) {
          const result = await client.query(`
            INSERT INTO content_learning_classifications (
              fingerprint, category_key, classification_source, confidence,
              reason, taxonomy_version, provider_run_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (fingerprint) DO UPDATE
            SET category_key = EXCLUDED.category_key,
                classification_source = EXCLUDED.classification_source,
                confidence = EXCLUDED.confidence,
                reason = EXCLUDED.reason,
                taxonomy_version = EXCLUDED.taxonomy_version,
                provider_run_id = COALESCE(EXCLUDED.provider_run_id, content_learning_classifications.provider_run_id),
                updated_at = NOW()
            RETURNING *
          `, [
            item.fingerprint,
            item.categoryKey,
            item.classificationSource,
            item.confidence,
            item.reason,
            item.taxonomyVersion,
            runId
          ]);
          rows.push(result.rows[0]);
        }
        await client.query('COMMIT');
        return rows;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async recordObservationsAndMaybeProposals({ postId, reviewVersion, observations }) {
      const normalizedPostId = positiveInteger(postId, 'Die Artikel-ID');
      const normalizedReviewVersion = positiveInteger(reviewVersion, 'Die Review-Version');
      if (!Array.isArray(observations) || observations.length < 1 || observations.length > 24) {
        throw inputError('Mindestens eine und höchstens 24 Lernbeobachtungen sind erforderlich.');
      }
      const normalized = observations.map(normalizeObservation);
      const classifiedCategories = [...new Set(normalized
        .map(({ categoryKey }) => categoryKey)
        .filter((categoryKey) => categoryKey !== 'unclassified'))].sort();
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        for (const categoryKey of classifiedCategories) {
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtext('content-learning:' || $1::text))",
            [categoryKey]
          );
        }
        const persistedObservations = [];
        for (const item of normalized) {
          const conflict = item.categoryKey === 'unclassified'
            ? `(post_id, fingerprint) WHERE category_key = 'unclassified'`
            : `(post_id, category_key) WHERE category_key <> 'unclassified'`;
          const result = await client.query(`
            INSERT INTO content_learning_observations (
              post_id, review_version, category_key, fingerprint, reason,
              instruction, section_name, anchor, classification_source,
              confidence, taxonomy_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT ${conflict} DO UPDATE
            SET review_version = GREATEST(
                  content_learning_observations.review_version,
                  EXCLUDED.review_version
                ),
                fingerprint = EXCLUDED.fingerprint,
                reason = EXCLUDED.reason,
                instruction = EXCLUDED.instruction,
                section_name = EXCLUDED.section_name,
                anchor = EXCLUDED.anchor,
                classification_source = EXCLUDED.classification_source,
                confidence = EXCLUDED.confidence,
                taxonomy_version = EXCLUDED.taxonomy_version,
                last_seen_at = NOW()
            RETURNING *
          `, [
            normalizedPostId,
            normalizedReviewVersion,
            item.categoryKey,
            item.fingerprint,
            item.reason,
            item.instruction,
            item.section,
            item.anchor,
            item.classificationSource,
            item.confidence,
            item.taxonomyVersion
          ]);
          persistedObservations.push(result.rows[0]);
        }

        const proposals = [];
        for (const categoryKey of classifiedCategories) {
          const countResult = await client.query(`
            SELECT COUNT(DISTINCT post_id)::text AS article_count
            FROM content_learning_observations
            WHERE category_key = $1
          `, [categoryKey]);
          const articleCount = Number(countResult.rows[0]?.article_count || 0);
          if (articleCount < 3) continue;
          const evidenceResult = await client.query(`
            SELECT post_id, review_version, reason, instruction, section_name, anchor
            FROM content_learning_observations
            WHERE category_key = $1
            ORDER BY last_seen_at DESC, id DESC
            LIMIT 5
          `, [categoryKey]);
          const definition = getLearningCategory(categoryKey);
          const proposalResult = await client.query(`
            INSERT INTO content_learning_rule_proposals (
              category_key, suggested_rule_text, target_stages, evidence_count,
              evidence_json, expected_effect, overfit_warning
            )
            SELECT $1::varchar(80), $2::varchar(800), $3::text[], $4::integer,
                   $5::jsonb, $6::varchar(500), $7::varchar(500)
            WHERE NOT EXISTS (
              SELECT 1
              FROM content_learning_rules
              WHERE category_key = $1::varchar(80)
            )
            ON CONFLICT (category_key) WHERE status = 'pending' DO NOTHING
            RETURNING *
          `, [
            categoryKey,
            definition.defaultRule,
            definition.targetStages,
            articleCount,
            JSON.stringify(evidenceResult.rows),
            definition.expectedEffect,
            definition.overfitWarning
          ]);
          const proposal = proposalResult.rows[0];
          if (!proposal) continue;
          proposals.push(proposal);
          await client.query(`
            INSERT INTO content_learning_events (
              category_key, proposal_id, event_type, details_json
            ) VALUES ($1, $2, 'proposal_created', $3::jsonb)
          `, [categoryKey, proposal.id, JSON.stringify({ evidenceCount: articleCount })]);
        }
        await client.query('COMMIT');
        return { observations: persistedObservations, proposals };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async listActiveRuleVersions() {
      const { rows } = await db.query(`
        SELECT r.id, r.category_key, r.current_version AS version,
               v.rule_text, v.target_stages, v.rule_hash
        FROM content_learning_rules r
        JOIN content_learning_rule_versions v
          ON v.rule_id = r.id AND v.version = r.current_version
        WHERE r.status = 'active'
        ORDER BY r.id, r.current_version
      `);
      return rows;
    }
  };
}
