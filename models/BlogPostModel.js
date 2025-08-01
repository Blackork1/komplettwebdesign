// models/BlogPostModel.js
/* eslint-disable camelcase */
import pool from '../util/db.js';              // dein pg-Pool (ES-Export)
import slugify from 'slugify';

export default class BlogPostModel {
  /* ---------- CREATE ---------- */
  static async create({
    title,
    excerpt = '',
    content,
    hero_image,
    hero_public_id = null,
    category = '',
    featured = false,
    published = true
  }) {
    const slug = slugify(title, { lower: true, strict: true });

    const { rows } = await pool.query(
      `INSERT INTO posts
         (title, slug, excerpt, content,
          image_url, hero_public_id,
          category, featured, published,
          created_at, updated_at)
       VALUES
         ($1, $2, $3, $4,
          $5, $6,
          $7, $8, $9,
          NOW(), NOW())
       RETURNING *`,
      [
        title, slug, excerpt, content,
        hero_image, hero_public_id,
        category, featured, published
      ]
    );
    return rows[0];
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

  static async findExcerpt(excerpt) {
    const { rows } = await pool.query(
      `SELECT * FROM posts
       WHERE excerpt ILIKE $1 AND published = true
       LIMIT 1`,
      [`%${excerpt}%`]
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
      `UPDATE posts SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i}
       RETURNING *`,
      values
    );
    return rows[0];
  }

  /* ---------- DELETE ---------- */
  static async delete(id) {
    const { rows } = await pool.query(
      `DELETE FROM posts WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}
