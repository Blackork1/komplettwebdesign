import { CONTENT_AGENT_LINKS } from '../data/contentAgentLinks.js';
import pool from '../util/db.js';

function splitDraftRow(row) {
  if (!row) return null;
  const { metadata, ...post } = row;
  return { post, metadata: metadata || null };
}

function queryTarget(client, fallback) {
  return client && typeof client.query === 'function' ? client : fallback;
}

export function createContentPublishEventRepository(db = pool) {
  return {
    async getDraftWithMetadataForUpdate(postId, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        SELECT p.*, to_jsonb(m) AS metadata
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.id = $1
        FOR UPDATE OF p
      `, [postId]);
      return splitDraftRow(rows[0]);
    },

    async getValidationContext(postId, current, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(
        'SELECT slug FROM posts WHERE id <> $1 ORDER BY id',
        [postId]
      );
      const metadata = current?.metadata || {};
      return {
        existingSlugs: rows.map(({ slug }) => slug).filter(Boolean),
        allowedInternalLinks: Array.isArray(metadata.internal_links_json)
          && metadata.internal_links_json.length > 0
          ? metadata.internal_links_json
          : CONTENT_AGENT_LINKS,
        sourceReferences: Array.isArray(metadata.source_references_json)
          ? metadata.source_references_json
          : []
      };
    },

    async publishDraft(postId, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE posts
        SET published = TRUE,
            workflow_status = 'published',
            published_at = NOW(),
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND generated_by_ai = TRUE
          AND published = FALSE
          AND workflow_status = 'needs_review'
          AND content_format = 'static_html'
        RETURNING *
      `, [postId]);
      return rows[0] || null;
    },

    async rejectDraft(postId, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE posts
        SET published = FALSE,
            workflow_status = 'rejected',
            published_at = NULL,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND generated_by_ai = TRUE
          AND published = FALSE
          AND workflow_status = 'needs_review'
          AND content_format = 'static_html'
        RETURNING *
      `, [postId]);
      return rows[0] || null;
    },

    async insertManualEvent({ postId, runId, qualityScore, admin }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        INSERT INTO content_publish_events (
          post_id, run_id, decision, policy_version, quality_score,
          reasons_json, context_json, admin_id, admin_username
        )
        VALUES (
          $1, $2, 'manual', 'manual-v1', $3,
          '[]'::jsonb, '{"action":"manual_publish"}'::jsonb, $4, $5
        )
        ON CONFLICT (post_id) WHERE decision = 'manual' DO NOTHING
        RETURNING *
      `, [postId, runId, qualityScore, admin.id, admin.username]);
      return rows[0] || null;
    },

    async insertRejectionEvent({ postId, runId, qualityScore, admin, reason }, client) {
      const target = queryTarget(client, db);
      const context = JSON.stringify({ action: 'manual_rejection', reason });
      const { rows } = await target.query(`
        INSERT INTO content_publish_events (
          post_id, run_id, decision, policy_version, quality_score,
          reasons_json, context_json, admin_id, admin_username
        )
        VALUES (
          $1, $2, 'blocked', 'manual-reject-v1', $3,
          '[{"code":"manual_rejection"}]'::jsonb, $4::jsonb, $5, $6
        )
        RETURNING *
      `, [postId, runId, qualityScore, context, admin.id, admin.username]);
      return rows[0] || null;
    },

    async incrementManualApprovals(client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE content_agent_settings
        SET manual_approvals_count = manual_approvals_count + 1,
            updated_at = NOW()
        WHERE id = 1
        RETURNING *
      `);
      return rows[0] || null;
    },

    async getSettings(client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(
        'SELECT * FROM content_agent_settings WHERE id = 1'
      );
      return rows[0] || null;
    }
  };
}

const defaultRepository = createContentPublishEventRepository();
export const getDraftWithMetadataForUpdate = defaultRepository.getDraftWithMetadataForUpdate;
export const getValidationContext = defaultRepository.getValidationContext;
export const publishDraft = defaultRepository.publishDraft;
export const rejectDraft = defaultRepository.rejectDraft;
export const insertManualEvent = defaultRepository.insertManualEvent;
export const insertRejectionEvent = defaultRepository.insertRejectionEvent;
export const incrementManualApprovals = defaultRepository.incrementManualApprovals;
export const getSettings = defaultRepository.getSettings;
