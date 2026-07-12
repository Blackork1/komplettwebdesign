import pool from '../util/db.js';

export function createContentAuditRepository(db = pool) {
  return {
    async listPublishedPosts({ limit = 500 } = {}) {
      const boundedLimit = Math.min(500, Math.max(1, Number(limit) || 500));
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.content, p.content_format,
               p.meta_title, p.meta_description, p.og_title, p.og_description,
               p.faq_json, p.image_url, p.image_alt, p.updated_at,
               m.primary_keyword, m.content_cluster
        FROM posts p
        LEFT JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.published = TRUE
        ORDER BY p.id
        LIMIT $1
      `, [boundedLimit]);
      return rows;
    },

    async createAuditIdempotent(input) {
      const { rows } = await db.query(`
        WITH inserted AS (
          INSERT INTO content_post_audits (
            post_id, job_id, run_id, audit_type, score,
            findings_json, recommended_actions_json, status
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'open')
          ON CONFLICT (job_id, post_id, audit_type) WHERE job_id IS NOT NULL DO NOTHING
          RETURNING *
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT * FROM content_post_audits
        WHERE job_id = $2 AND post_id = $1 AND audit_type = $4
        LIMIT 1
      `, [
        input.postId,
        input.jobId,
        input.runId,
        input.auditType,
        input.score,
        JSON.stringify(input.findings || []),
        JSON.stringify(input.recommendedActions || [])
      ]);
      return rows[0] || null;
    }
  };
}
