import { randomUUID } from 'node:crypto';
import pool from '../util/db.js';
import { lockContentPostRevisionInvariant } from './contentPostRevisionInvariant.js';

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

export async function trustedValidationContext(postId, client) {
  const [slugs, links] = await Promise.all([
    client.query(`SELECT slug FROM posts WHERE id <> $1 ORDER BY id LIMIT 5000`, [postId]),
    client.query(`
      SELECT url FROM (
        SELECT '/kontakt' AS url
        UNION SELECT '/pakete'
        UNION SELECT '/webdesign-berlin'
        UNION SELECT '/blog/' || slug FROM posts WHERE published = TRUE
        UNION SELECT '/ratgeber/' || slug FROM ratgeber WHERE published = TRUE
        UNION SELECT '/leistungen/' || slug FROM leistungen_pages WHERE is_published = TRUE
        UNION SELECT '/branchen/' || slug FROM industries
      ) trusted_urls
      ORDER BY url LIMIT 5000
    `)
  ]);
  return {
    existingSlugs: slugs.rows.map(({ slug }) => slug),
    allowedInternalLinks: links.rows.map(({ url }) => url)
  };
}

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
        const lockedPost = await lockContentPostRevisionInvariant(client, postId);
        if (!lockedPost || lockedPost.published !== true) {
          throw conflict('CONTENT_POST_NOT_FOUND', 'Veröffentlichter Beitrag nicht gefunden.');
        }
        const { rows: posts } = await client.query(`
          SELECT ${POST_COLUMNS}
          FROM posts
          WHERE id = $1::integer AND published = TRUE
        `, [postId]);
        if (!posts[0]) throw conflict('CONTENT_POST_NOT_FOUND', 'Veröffentlichter Beitrag nicht gefunden.');
        const { rows: activeOptimizations } = await client.query(`
          SELECT id
          FROM content_jobs
          WHERE job_type = 'optimize_existing_post'
            AND payload_json ->> 'post_id' = $1::text
            AND status IN ('queued', 'running', 'needs_manual_attention')
          ORDER BY id
          FOR UPDATE
        `, [postId]);
        if (activeOptimizations.length > 0) {
          throw conflict(
            'CONTENT_REVISION_CONFLICT',
            'Für diesen Artikel läuft bereits eine KI-Optimierung.'
          );
        }
        const { rows: existing } = await client.query(`
          SELECT * FROM content_post_revisions
          WHERE post_id = $1 AND status = 'draft'
          ORDER BY id
          FOR UPDATE
        `, [postId]);
        const { rows: audits } = await client.query(`
          SELECT * FROM content_post_audits
          WHERE id = $1 AND post_id = $2 AND status IN ('open', 'revision_created')
          FOR UPDATE
        `, [auditId, postId]);
        if (!audits[0]) throw conflict('CONTENT_AUDIT_NOT_FOUND', 'Passender offener Auditbefund nicht gefunden.');
        if (existing.length > 1
            || (existing[0] && Number(existing[0].audit_id) !== Number(auditId))) {
          throw conflict(
            'CONTENT_REVISION_CONFLICT',
            'Für diesen Artikel besteht bereits eine aktive Draft-Revision.'
          );
        }
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
        if (error?.code === '23505') {
          throw conflict(
            'CONTENT_REVISION_CONFLICT',
            'Für diesen Artikel besteht bereits eine aktive Draft-Revision.'
          );
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async getRevisionForEdit(revisionId, client = db) {
      const { rows } = await client.query(`
        SELECT r.*, p.title AS live_title, p.slug AS live_slug
        FROM content_post_revisions r
        JOIN posts p ON p.id = r.post_id
        WHERE r.id = $1
      `, [revisionId]);
      if (!rows[0]) return null;
      return { ...rows[0], validation_context: await trustedValidationContext(rows[0].post_id, client) };
    },

    async updateDraftRevision({ revisionId, snapshot, expectedVersion }) {
      const { rows } = await db.query(`
        UPDATE content_post_revisions
        SET snapshot_json = $2::jsonb,
            revision_version = revision_version + 1,
            updated_at = NOW()
        WHERE id = $1 AND status = 'draft' AND revision_version = $3
        RETURNING *
      `, [revisionId, JSON.stringify(snapshot), expectedVersion]);
      return rows[0] || null;
    },

    async approveRevisionTransaction({
      revisionId,
      expectedVersion,
      admin,
      currentHash,
      validateSnapshot,
      validateApproval,
      afterApproval
    }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const { rows: identity } = await client.query(`SELECT post_id FROM content_post_revisions WHERE id = $1`, [revisionId]);
        if (!identity[0]) throw conflict('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
        const { rows: posts } = await client.query(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1 FOR UPDATE`, [identity[0].post_id]);
        const post = posts[0];
        if (!post || post.published !== true) throw conflict('CONTENT_REVISION_CONFLICT', 'Der Livebeitrag ist nicht mehr veröffentlicht.');
        const { rows: revisions } = await client.query(`
          SELECT * FROM content_post_revisions WHERE id = $1 FOR UPDATE
        `, [revisionId]);
        const revision = revisions[0];
        if (!revision || revision.status !== 'draft') throw conflict('CONTENT_REVISION_CONFLICT', 'Die Revision wurde bereits bearbeitet.');
        if (Number(revision.revision_version) !== Number(expectedVersion)) {
          throw conflict('CONTENT_REVISION_CONFLICT', 'Die angezeigte Revision wurde zwischenzeitlich verändert.');
        }
        const { rows: audits } = await client.query(`
          SELECT * FROM content_post_audits
          WHERE id = $1::bigint
            AND post_id = $2::integer
            AND ($3::bigint IS NULL OR job_id = $3::bigint)
            AND status = 'revision_created'
          FOR UPDATE
        `, [revision.audit_id, post.id, revision.optimization_job_id]);
        if (!audits[0]) throw conflict('CONTENT_REVISION_CONFLICT', 'Der zugehörige Auditbefund ist nicht mehr freigabefähig.');
        const base = revision.snapshot_json?.base || {};
        if (base.slug !== post.slug
            || base.content_format !== post.content_format
            || base.updated_at !== new Date(post.updated_at).toISOString()
            || base.live_hash !== currentHash(post)) {
          throw conflict('CONTENT_REVISION_STALE', 'Der Livebeitrag wurde seit Erstellung der Revision verändert.');
        }
        await validateSnapshot(revision.snapshot_json, {
          ...(await trustedValidationContext(post.id, client)),
          post
        });
        if (typeof validateApproval === 'function') {
          await validateApproval({ revision, post }, client);
        }
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
        const { rows: approvedRevisions } = await client.query(`
          UPDATE content_post_revisions
          SET status = 'approved', admin_id = $2, admin_username = $3,
              approved_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND status = 'draft' AND revision_version = $4
          RETURNING id
        `, [revisionId, admin.id, admin.username, expectedVersion]);
        if (!approvedRevisions[0]) throw conflict('CONTENT_REVISION_CONFLICT', 'Die Revision wurde zwischenzeitlich verändert.');
        const { rows: resolvedAudits } = await client.query(`
          UPDATE content_post_audits
          SET status = 'resolved'
          WHERE id = $1::bigint
            AND post_id = $2::integer
            AND ($3::bigint IS NULL OR job_id = $3::bigint)
            AND status = 'revision_created'
          RETURNING id
        `, [revision.audit_id, post.id, revision.optimization_job_id]);
        if (resolvedAudits.length !== 1) {
          throw conflict('CONTENT_REVISION_CONFLICT', 'Der Auditbefund konnte nicht eindeutig aufgelöst werden.');
        }
        if (typeof afterApproval === 'function') {
          await afterApproval({ revision, post: updatedPosts[0] }, client);
        }
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
