// models/BlogPostModel.js
/* eslint-disable camelcase */
import pool from '../util/db.js';              // dein pg-Pool (ES-Export)
import slugify from 'slugify';

export default class BlogPostModel {
  /* ---------- CREATE ---------- */
  static async create({
    title,
    excerpt = '',
    slug = '', // optional, wird automatisch generiert
    content,
    hero_image,
    hero_public_id = null,
    category = '',
    featured = false,
    published = true,
    description = '',                   // optional, falls im Formular
    faq_json = []                       // optional, falls im Formular
  }, db = pool) {
    if (!slug) {
      slug = slugify(title, { lower: true, strict: true });
    }
    const { rows } = await db.query(
      `INSERT INTO posts
         (title, slug, excerpt, content,
          image_url, hero_public_id,
          category, featured, published, description, faq_json,
          workflow_status, published_at,
          created_at, updated_at)
       VALUES
         ($1, $2, $3, $4,
          $5, $6,
          $7, $8, $9, $10, $11,
          CASE WHEN $9 THEN 'published' ELSE 'draft' END,
          CASE WHEN $9 THEN NOW() ELSE NULL END,
          NOW(), NOW())
       RETURNING *`,
      [
        title, slug, excerpt, content,
        hero_image, hero_public_id,
        category, featured, published, description, JSON.stringify(faq_json) 
      ]
    );
    return rows[0];
  }

  static async createAIDraft({ generationRunId, post = {}, metadata = {} }, db = pool) {
    const normalizedGenerationRunId = Number(generationRunId);
    if (!Number.isInteger(normalizedGenerationRunId) || normalizedGenerationRunId <= 0) {
      throw new TypeError('generationRunId muss eine positive Ganzzahl sein.');
    }
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const slug = post.slug || slugify(post.title || '', { lower: true, strict: true });
      const { rows: postRows } = await client.query(
        `
          INSERT INTO posts (
            title, slug, excerpt, content, image_url, hero_public_id, category,
            featured, published, description, faq_json, workflow_status,
            meta_title, meta_description, og_title, og_description, image_alt,
            content_format, generated_by_ai, generation_run_id, created_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            false, false, $8, $9, 'needs_review',
            $10, $11, $12, $13, $14,
            'static_html', true, $15, NOW(), NOW()
          )
          ON CONFLICT (generation_run_id) DO UPDATE
          SET generation_run_id = EXCLUDED.generation_run_id
          RETURNING *, (xmax = 0) AS _created
        `,
        [
          post.title,
          slug,
          post.excerpt || '',
          post.content,
          post.hero_image || null,
          post.hero_public_id || null,
          post.category || '',
          post.meta_description || '',
          JSON.stringify(post.faq_json || []),
          post.meta_title || null,
          post.meta_description || null,
          post.og_title || null,
          post.og_description || null,
          post.image_alt || null,
          normalizedGenerationRunId
        ]
      );
      const { _created: inserted, ...createdPost } = postRows[0];

      const { rows: metadataRows } = await client.query(
        `
          INSERT INTO content_post_metadata (
            post_id, primary_keyword, secondary_keywords, search_intent,
            target_audience, region_focus, content_cluster, business_goal,
            cta_type, internal_links_json, source_references_json, seo_brief_json,
            quality_score, quality_report_json, generation_metadata_json,
            created_at, updated_at
          )
          VALUES (
            $1, $2, to_jsonb($3::text[]), $4,
            $5, $6, $7, $8,
            $9, $10::jsonb, $11::jsonb, $12::jsonb,
            $13, $14::jsonb, $15::jsonb,
            NOW(), NOW()
          )
          ON CONFLICT (post_id) DO UPDATE
          SET post_id = EXCLUDED.post_id
          RETURNING *
        `,
        [
          createdPost.id,
          metadata.primary_keyword || '',
          metadata.secondary_keywords || [],
          metadata.search_intent || '',
          metadata.target_audience || '',
          metadata.region_focus || null,
          metadata.content_cluster || '',
          metadata.business_goal || '',
          metadata.cta_type || '',
          JSON.stringify(metadata.internal_links_json || []),
          JSON.stringify(metadata.source_references_json || []),
          JSON.stringify(metadata.seo_brief_json || {}),
          Number(metadata.quality_score) || 0,
          JSON.stringify(metadata.quality_report_json || {}),
          JSON.stringify(metadata.generation_metadata_json || {})
        ]
      );

      await client.query('COMMIT');
      return {
        post: createdPost,
        metadata: metadataRows[0],
        created: inserted !== false,
        referencedImagePublicId: createdPost.hero_public_id || null
      };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* COMMIT-Ausgang kann unklar sein. */ }
      throw error;
    } finally {
      client.release();
    }
  }

  /* ---------- READ ---------- */
  static async findAll() {
    const { rows } = await pool.query(
      `SELECT * FROM posts
       WHERE published = true
       ORDER BY created_at DESC`
    );
    return rows;
  }

  static async findAllAdmin(db = pool) {
    const { rows } = await db.query(
      `SELECT * FROM posts ORDER BY created_at DESC`
    );
    return rows;
  }

  static async findPage({ limit = 10, offset = 0 } = {}, db = pool) {
    const { rows } = await db.query(
      `SELECT * FROM posts
       WHERE published = true
       ORDER BY created_at DESC
       LIMIT $1
       OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  static async countPublished() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM posts
       WHERE published = true`
    );
    return Number(rows[0]?.count || 0);
  }

  static async findFeatured(limit = 5) {
    const { rows } = await pool.query(
      `SELECT * FROM posts
       WHERE featured = true AND published = true
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  static async findBySlug(slug) {
    const { rows } = await pool.query(
      `SELECT * FROM posts
       WHERE slug = $1 AND published = true
       LIMIT 1`,
      [slug]
    );
    return rows[0] ?? null;
  }

  static async findTitle(title) {
    const { rows } = await pool.query(
      `SELECT * FROM posts
       WHERE title = $1 AND published = true
       LIMIT 1`,
      [title]
    );
    return rows[0] ?? null;
  }

  static async findExcerpt(excerpt) {
    const { rows } = await pool.query(
      `SELECT * FROM posts
       WHERE excerpt ILIKE $1 AND published = true
       LIMIT 1`,
      [`%${excerpt}%`]
    );
    return rows[0] ?? null;
  }

  static async findDescription(description) {
    const { rows } = await pool.query(
      `SELECT * FROM posts
       WHERE description ILIKE $1 AND published = true
       LIMIT 1`,
      [`%${description}%`]
    );
    return rows[0] ?? null;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM posts WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  static async findAIDraftByGenerationRunId(generationRunId, db = pool) {
    const normalized = Number(generationRunId);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new TypeError('generationRunId muss eine positive Ganzzahl sein.');
    }
    const { rows } = await db.query(
      `
        SELECT p.*, to_jsonb(m) AS metadata
        FROM posts p
        LEFT JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.generation_run_id = $1
          AND p.generated_by_ai = TRUE
          AND p.published = FALSE
        LIMIT 1
      `,
      [normalized]
    );
    const row = rows[0];
    if (!row) return null;
    const { metadata, ...post } = row;
    return { post, metadata: metadata || null };
  }

  /* ---------- UPDATE ---------- */
  static async update(id, data, db = pool) {
    const fields = [];
    const values = [];
    let i = 1;

    const publicationRequested = typeof data.published === 'boolean';
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;
      if (key === 'workflow_status' || key === 'published_at') continue;
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
    if (publicationRequested) {
      if (data.published) {
        fields.push("workflow_status = 'published'");
        fields.push('published_at = COALESCE(published_at, NOW())');
      } else {
        fields.push("workflow_status = CASE WHEN generated_by_ai THEN 'needs_review' ELSE 'draft' END");
        fields.push('published_at = NULL');
      }
    }
    if (!fields.length) return this.findById(id);

    values.push(id);
    const publicationGuard = data.published === true
      ? ' AND (generated_by_ai = FALSE OR published = TRUE)'
      : '';
    const { rows } = await db.query(
      `UPDATE posts SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i}${publicationGuard}
       RETURNING *`,
      values
    );
    return rows[0];
  }

  /* ---------- DELETE ---------- */
  static async delete(id, db = pool) {
    try {
      const { rows } = await db.query(`
        DELETE FROM posts p
        WHERE p.id = $1
          AND NOT EXISTS (
            SELECT 1 FROM content_publish_events e WHERE e.post_id = p.id
          )
        RETURNING p.*
      `, [id]);
      if (rows[0]) return rows[0];

      const state = await db.query(`
        SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1) AS post_exists,
               EXISTS(SELECT 1 FROM content_publish_events WHERE post_id = $1)
                 AS publish_event_exists
      `, [id]);
      if (state.rows[0]?.post_exists && state.rows[0]?.publish_event_exists) {
        throw Object.assign(
          new Error('Artikel mit Veröffentlichungsprotokoll dürfen nicht gelöscht werden.'),
          { code: 'BLOG_POST_DELETE_RESTRICTED' }
        );
      }
      return null;
    } catch (error) {
      if (error?.code === 'BLOG_POST_DELETE_RESTRICTED') throw error;
      if (error?.code === '23503'
          && error?.constraint === 'content_publish_events_post_id_fkey') {
        throw Object.assign(
          new Error('Artikel mit Veröffentlichungsprotokoll dürfen nicht gelöscht werden.'),
          { code: 'BLOG_POST_DELETE_RESTRICTED' }
        );
      }
      throw error;
    }
  }
}

export async function getPublishedPosts(db) {
  // Beispiel-Query – bitte auf dein Schema anpassen
  const { rows } = await pool.query(`
    SELECT slug, COALESCE(updated_at, created_at) AS updated_at
    FROM posts
    WHERE status = 'published'
    ORDER BY updated_at DESC
    LIMIT 5000
  `);
  console.log("Sitemap: Gefundene Blogposts:", rows.length);
  return rows.map(r => ({
    slug: r.slug,
    lastmod: new Date(r.updated_at).toISOString()
  }));
}
