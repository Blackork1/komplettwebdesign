// models/RatgeberModel.js
/* eslint-disable camelcase */
import pool from '../util/db.js';
import slugify from 'slugify';

export default class RatgeberModel {
  /* ---------- CREATE ---------- */
  static async create({
    title,
    excerpt = '',
    slug = '',               // optional, wird automatisch generiert
    content,
    hero_image,              // entspricht image_url
    hero_public_id = null,
    category = '',
    featured = false,
    published = true,
    description = '',
    faq_json = []
  }) {
    // Slug korrekt erzeugen (Bugfix ggü. Blog-Beispiel)
    if (!slug) {
      slug = slugify(title, { lower: true, strict: true });
    }

    const { rows } = await pool.query(
      `INSERT INTO ratgeber
         (title, slug, excerpt, content,
          image_url, hero_public_id,
          category, featured, published, description, faq_json,
          created_at, updated_at)
       VALUES
         ($1, $2, $3, $4,
          $5, $6,
          $7, $8, $9, $10, $11,
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

  /* ---------- READ ---------- */
  static async findAll() {
    const { rows } = await pool.query(
      `SELECT *
       FROM ratgeber
       WHERE published = true
       ORDER BY created_at DESC`
    );
    return rows;
  }

  static async findFeatured(limit = 5) {
    const { rows } = await pool.query(
      `SELECT *
       FROM ratgeber
       WHERE featured = true AND published = true
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  static async findBySlug(slug) {
    const { rows } = await pool.query(
      `SELECT *
       FROM ratgeber
       WHERE slug = $1 AND published = true
       LIMIT 1`,
      [slug]
    );
    return rows[0] ?? null;
  }

  static async findTitle(title) {
    const { rows } = await pool.query(
      `SELECT *
       FROM ratgeber
       WHERE title = $1 AND published = true
       LIMIT 1`,
      [title]
    );
    return rows[0] ?? null;
  }

  static async findExcerpt(excerpt) {
    const { rows } = await pool.query(
      `SELECT *
       FROM ratgeber
       WHERE excerpt ILIKE $1 AND published = true
       LIMIT 1`,
      [`%${excerpt}%`]
    );
    return rows[0] ?? null;
  }

  static async findDescription(description) {
    const { rows } = await pool.query(
      `SELECT *
       FROM ratgeber
       WHERE description ILIKE $1 AND published = true
       LIMIT 1`,
      [`%${description}%`]
    );
    return rows[0] ?? null;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM ratgeber WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  /* ---------- UPDATE ---------- */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let i = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
    if (!fields.length) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE ratgeber SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i}
       RETURNING *`,
      values
    );
    return rows[0];
  }

  /* ---------- DELETE ---------- */
  static async delete(id) {
    const { rows } = await pool.query(
      `DELETE FROM ratgeber WHERE id = $1
       RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

/* ------ Sitemap Helper (optional, ggf. Schema anpassen) ------ */
export async function getPublishedGuides() {
  const { rows } = await pool.query(`
    SELECT slug, COALESCE(updated_at, created_at) AS updated_at
    FROM ratgeber
    WHERE published = true
    ORDER BY updated_at DESC
    LIMIT 5000
  `);
  console.log('Sitemap: Gefundene Ratgeber:', rows.length);
  return rows.map(r => ({
    slug: r.slug,
    lastmod: new Date(r.updated_at).toISOString()
  }));
}
