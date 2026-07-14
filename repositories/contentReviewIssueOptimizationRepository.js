import pool from '../util/db.js';

function repositoryError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw repositoryError('CONTENT_REVIEW_OPTIMIZATION_VALIDATION_FAILED', `${label} ist ungültig.`);
  }
  return number;
}

function normalizeCommitKey(value, postId) {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!new RegExp(`^[1-9]\\d*:optimize_review_issues:${postId}$`).test(key) || key.length > 180) {
    throw repositoryError(
      'CONTENT_REVIEW_OPTIMIZATION_VALIDATION_FAILED',
      'Der dauerhafte Optimierungs-Commit-Fence ist ungültig.'
    );
  }
  return key;
}

function splitDraftRow(row) {
  if (!row) return null;
  const { metadata, ...post } = row;
  return { post, metadata: metadata || null };
}

function eligibleFence(fence, { commitKey, postId, expectedReviewVersion, currentReviewVersion }) {
  return fence?.kind === 'review_issue_optimization_commit'
    && fence.commitKey === commitKey
    && Number(fence.postId) === postId
    && Number(fence.reviewVersionBefore) === expectedReviewVersion
    && Number(fence.reviewVersionAfter) === currentReviewVersion;
}

export function createContentReviewIssueOptimizationRepository(db = pool) {
  const repository = {
    async getDraftWithMetadata(postId) {
      const normalizedPostId = positiveInteger(postId, 'Die Entwurfs-ID');
      const { rows } = await db.query(`
        SELECT p.*, to_jsonb(m) AS metadata
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.id = $1
          AND p.generated_by_ai = TRUE
          AND p.published = FALSE
          AND p.content_format = 'static_html'
        LIMIT 1
      `, [normalizedPostId]);
      return splitDraftRow(rows[0]);
    },

    async getValidationContext(postId, current) {
      const normalizedPostId = positiveInteger(postId, 'Die Entwurfs-ID');
      const { rows } = await db.query('SELECT slug FROM posts WHERE id <> $1 ORDER BY id', [normalizedPostId]);
      const metadata = current?.metadata || {};
      return {
        existingSlugs: rows.map(({ slug }) => slug).filter(Boolean),
        allowedInternalLinks: Array.isArray(metadata.internal_links_json)
          ? metadata.internal_links_json
          : [],
        sourceReferences: Array.isArray(metadata.source_references_json)
          ? metadata.source_references_json
          : []
      };
    },

    async commitOptimization({
      postId,
      contentHtml,
      qualityScore,
      qualityReport,
      expectedReviewVersion,
      commitKey
    }) {
      const normalizedPostId = positiveInteger(postId, 'Die Entwurfs-ID');
      const normalizedExpectedVersion = positiveInteger(expectedReviewVersion, 'Die erwartete Reviewversion');
      const normalizedCommitKey = normalizeCommitKey(commitKey, normalizedPostId);
      const score = Number(qualityScore);
      if (typeof contentHtml !== 'string' || !contentHtml.trim()
          || !Number.isInteger(score) || score < 0 || score > 100
          || !qualityReport || typeof qualityReport !== 'object' || Array.isArray(qualityReport)) {
        throw repositoryError(
          'CONTENT_REVIEW_OPTIMIZATION_VALIDATION_FAILED',
          'HTML oder Qualitätsbericht der Optimierung ist ungültig.'
        );
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const locked = await client.query(`
          SELECT p.*,
                 m.generation_metadata_json -> 'lastReviewIssueOptimization'
                   AS review_optimization_commit
          FROM posts p
          JOIN content_post_metadata m ON m.post_id = p.id
          WHERE p.id = $1
            AND p.generated_by_ai = TRUE
            AND p.published = FALSE
            AND p.content_format = 'static_html'
          FOR UPDATE OF p, m
        `, [normalizedPostId]);
        if (!locked.rows[0]) {
          throw repositoryError('CONTENT_DRAFT_NOT_FOUND', 'Unveröffentlichter KI-Entwurf nicht gefunden.');
        }
        const { review_optimization_commit: fence, ...lockedPost } = locked.rows[0];
        if (fence?.commitKey === normalizedCommitKey) {
          if (!eligibleFence(fence, {
            commitKey: normalizedCommitKey,
            postId: normalizedPostId,
            expectedReviewVersion: normalizedExpectedVersion,
            currentReviewVersion: Number(lockedPost.review_version)
          })) {
            throw repositoryError(
              'CONTENT_REVIEW_OPTIMIZATION_COMMIT_FENCE_INVALID',
              'Der dauerhafte Optimierungs-Commit-Fence ist widersprüchlich.'
            );
          }
          const metadataResult = await client.query(
            'SELECT * FROM content_post_metadata WHERE post_id = $1',
            [normalizedPostId]
          );
          await client.query('COMMIT');
          return { post: lockedPost, metadata: metadataResult.rows[0] || null, idempotent: true };
        }
        if (Number(lockedPost.review_version) !== normalizedExpectedVersion) {
          throw repositoryError(
            'CONTENT_REGENERATION_STALE',
            'Der Entwurf wurde seit Beginn der Optimierung verändert.'
          );
        }

        const postResult = await client.query(`
          UPDATE posts
          SET content = $2,
              review_version = review_version + 1,
              workflow_status = 'needs_review',
              approved_review_version = NULL,
              approved_at = NULL,
              approved_by_admin_id = NULL,
              updated_at = NOW()
          WHERE id = $1
            AND review_version = $3
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
          RETURNING *
        `, [normalizedPostId, contentHtml, normalizedExpectedVersion]);
        if (!postResult.rows[0]) {
          throw repositoryError('CONTENT_REGENERATION_STALE', 'Der Entwurf wurde gleichzeitig verändert.');
        }

        const marker = {
          kind: 'review_issue_optimization_commit',
          commitKey: normalizedCommitKey,
          postId: normalizedPostId,
          reviewVersionBefore: normalizedExpectedVersion,
          reviewVersionAfter: Number(postResult.rows[0].review_version)
        };
        const metadataResult = await client.query(`
          UPDATE content_post_metadata
          SET quality_score = $2,
              quality_report_json = $3::jsonb,
              generation_metadata_json = jsonb_set(
                CASE
                  WHEN jsonb_typeof(generation_metadata_json) = 'object'
                    THEN generation_metadata_json
                  ELSE '{}'::jsonb
                END,
                '{lastReviewIssueOptimization}',
                $5::jsonb,
                TRUE
              ),
              updated_at = NOW()
          WHERE post_id = $1
            AND COALESCE(
              generation_metadata_json #>> '{lastReviewIssueOptimization,commitKey}',
              ''
            ) <> $4::text
          RETURNING *
        `, [
          normalizedPostId,
          score,
          JSON.stringify(qualityReport),
          normalizedCommitKey,
          JSON.stringify(marker)
        ]);
        if (!metadataResult.rows[0]) {
          throw repositoryError(
            'CONTENT_REVIEW_OPTIMIZATION_COMMIT_FENCE_INVALID',
            'Der Optimierungs-Commit-Fence konnte nicht atomar gespeichert werden.'
          );
        }
        await client.query('COMMIT');
        return { post: postResult.rows[0], metadata: metadataResult.rows[0] };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async reconcileOptimizationCommit({ postId, expectedReviewVersion, commitKey }) {
      const normalizedPostId = positiveInteger(postId, 'Die Entwurfs-ID');
      const normalizedExpectedVersion = positiveInteger(expectedReviewVersion, 'Die erwartete Reviewversion');
      const normalizedCommitKey = normalizeCommitKey(commitKey, normalizedPostId);
      const { rows } = await db.query(`
        SELECT p.*,
               to_jsonb(m) AS metadata,
               m.generation_metadata_json -> 'lastReviewIssueOptimization'
                 AS review_optimization_commit
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.id = $1
          AND p.generated_by_ai = TRUE
          AND p.published = FALSE
          AND p.content_format = 'static_html'
        LIMIT 1
      `, [normalizedPostId]);
      if (!rows[0]) return { state: 'not_found' };
      const { metadata, review_optimization_commit: fence, ...post } = rows[0];
      if (eligibleFence(fence, {
        commitKey: normalizedCommitKey,
        postId: normalizedPostId,
        expectedReviewVersion: normalizedExpectedVersion,
        currentReviewVersion: Number(post.review_version)
      })) {
        return { state: 'committed', post, metadata };
      }
      if (Number(post.review_version) === normalizedExpectedVersion) {
        return { state: 'not_committed', post, metadata };
      }
      return { state: 'concurrent', post, metadata };
    }
  };
  return repository;
}
