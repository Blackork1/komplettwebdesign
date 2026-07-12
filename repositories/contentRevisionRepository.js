import { randomUUID } from 'node:crypto';
import pool from '../util/db.js';

function conflict(code, message) {
  return Object.assign(new Error(message), { code });
}

async function rollback(client) {
  try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
}

const POST_COLUMNS = `
  id, title, slug, excerpt, content, content_format, meta_title, meta_description,
  og_title, og_description, faq_json, image_url, image_alt, published, updated_at
`;

export function createContentRevisionRepository(db = pool) {
  return {
    async enqueueAuditJob({ admin }) {
      const idempotencyKey = `existing-content-audit:${randomUUID()}`;
      const { rows } = await db.query(`
        INSERT INTO content_jobs (job_type, status, idempotency_key, payload_json, max_attempts, run_after, created_at, updated_at)
        SELECT 'audit_existing_posts', 'queued', $1, $2::jsonb, 1, NOW(), NOW(), NOW()
        WHERE EXISTS (SELECT 1 FROM content_agent_settings WHERE id = 1 AND agent_enabled = TRUE)
        RETURNING *
      `, [idempotencyKey, JSON.stringify({ source: 'admin_existing_content', admin_id: admin.id })]);
      if (!rows[0]) throw conflict('CONTENT_AGENT_DISABLED', 'Der Content-Agent ist deaktiviert.');
      return rows[0];
    },

    async createRevisionFromAudit({ postId, auditId, admin, createSnapshot }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const { rows: posts } = await client.query(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1 AND published = TRUE FOR UPDATE`, [postId]);
        if (!posts[0]) throw conflict('CONTENT_POST_NOT_FOUND', 'Veröffentlichter Beitrag nicht gefunden.');
        const { rows: audits } = await client.query(`
          SELECT * FROM content_post_audits
          WHERE id = $1 AND post_id = $2 AND status IN ('open', 'revision_created')
          FOR UPDATE
        `, [auditId, postId]);
        if (!audits[0]) throw conflict('CONTENT_AUDIT_NOT_FOUND', 'Passender offener Auditbefund nicht gefunden.');
        const { rows: existing } = await client.query(`
          SELECT * FROM content_post_revisions WHERE audit_id = $1 AND status = 'draft' LIMIT 1
        `, [auditId]);
        let revision = existing[0];
        if (!revision) {
          const { rows } = await client.query(`
            INSERT INTO content_post_revisions (post_id, audit_id, snapshot_json, status, admin_id, admin_username)
            VALUES ($1, $2, $3::jsonb, 'draft', $4, $5)
            RETURNING *
          `, [postId, auditId, JSON.stringify(createSnapshot(posts[0])), admin.id, admin.username]);
          revision = rows[0];
        }
        await client.query(`UPDATE content_post_audits SET status = 'revision_created' WHERE id = $1`, [auditId]);
        await client.query('COMMIT');
        return revision;
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async getRevisionForEdit(revisionId, client = db) {
      const { rows } = await client.query(`
        SELECT r.*, p.title AS live_title, p.slug AS live_slug,
               jsonb_build_object(
                 'existingSlugs', COALESCE((SELECT jsonb_agg(slug) FROM posts WHERE id <> p.id), '[]'::jsonb)
               ) AS validation_context
        FROM content_post_revisions r
        JOIN posts p ON p.id = r.post_id
        WHERE r.id = $1
      `, [revisionId]);
      return rows[0] || null;
    },

    async updateDraftRevision({ revisionId, snapshot }) {
      const { rows } = await db.query(`
        UPDATE content_post_revisions
        SET snapshot_json = $2::jsonb
        WHERE id = $1 AND status = 'draft'
        RETURNING *
      `, [revisionId, JSON.stringify(snapshot)]);
      return rows[0] || null;
    },

    async approveRevisionTransaction({ revisionId, admin, currentHash, validateSnapshot }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const { rows: identity } = await client.query(`SELECT post_id FROM content_post_revisions WHERE id = $1`, [revisionId]);
        if (!identity[0]) throw conflict('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const { rows: posts } = await client.query(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1 FOR UPDATE`, [identity[0].post_id]);
        const post = posts[0];
        if (!post || post.published !== true) throw conflict('CONTENT_REVISION_CONFLICT', 'Der Livebeitrag ist nicht mehr veröffentlicht.');
        const { rows: revisions } = await client.query(`
          SELECT * FROM content_post_revisions WHERE id = $1 FOR UPDATE
        `, [revisionId]);
        const revision = revisions[0];
        if (!revision || revision.status !== 'draft') throw conflict('CONTENT_REVISION_CONFLICT', 'Die Revision wurde bereits bearbeitet.');
        const { rows: audits } = await client.query(`
          SELECT * FROM content_post_audits
          WHERE id = $1 AND post_id = $2 AND status = 'revision_created'
          FOR UPDATE
        `, [revision.audit_id, post.id]);
        if (!audits[0]) throw conflict('CONTENT_REVISION_CONFLICT', 'Der zugehörige Auditbefund ist nicht mehr freigabefähig.');
        const base = revision.snapshot_json?.base || {};
        if (base.slug !== post.slug
            || base.content_format !== post.content_format
            || base.updated_at !== new Date(post.updated_at).toISOString()
            || base.live_hash !== currentHash(post)) {
          throw conflict('CONTENT_REVISION_STALE', 'Der Livebeitrag wurde seit Erstellung der Revision verändert.');
        }
        const contextResult = await client.query(`SELECT slug FROM posts WHERE id <> $1`, [post.id]);
        await validateSnapshot(revision.snapshot_json, { existingSlugs: contextResult.rows.map(({ slug }) => slug) });
        const fields = revision.snapshot_json.fields;
        const { rows: updatedPosts } = await client.query(`
          UPDATE posts SET
            title = $2, excerpt = $3, content = $4, meta_title = $5,
            meta_description = $6, og_title = $7, og_description = $8,
            faq_json = $9::jsonb, image_url = $10, image_alt = $11, updated_at = NOW()
          WHERE id = $1 AND published = TRUE AND slug = $12 AND content_format = $13
          RETURNING *
        `, [post.id, fields.title, fields.excerpt, fields.content, fields.meta_title,
          fields.meta_description, fields.og_title, fields.og_description,
          JSON.stringify(fields.faq_json || []), fields.image_url, fields.image_alt,
          base.slug, base.content_format]);
        if (!updatedPosts[0] || updatedPosts[0].published !== true || updatedPosts[0].slug !== base.slug) {
          throw conflict('CONTENT_REVISION_CONFLICT', 'Der Livebeitrag konnte nicht sicher aktualisiert werden.');
        }
        await client.query(`
          UPDATE content_post_revisions
          SET status = 'approved', admin_id = $2, admin_username = $3, approved_at = NOW()
          WHERE id = $1 AND status = 'draft'
        `, [revisionId, admin.id, admin.username]);
        await client.query(`UPDATE content_post_audits SET status = 'resolved' WHERE id = $1`, [revision.audit_id]);
        await client.query('COMMIT');
        return { post: updatedPosts[0], revisionId };
      } catch (error) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
