import pool from '../util/db.js';

export default class Post {
  static async fetchLatest() {
    const { rows } = await pool.query(
      `SELECT id,title,slug,excerpt,image_url,created_at
       FROM posts WHERE published=true
       ORDER BY created_at DESC LIMIT 1`
    );
    return rows[0] || null;
  }
}
